#!/bin/bash
# ============================================================
# Virtual Office - 智能优化部署系统 v2.0
# 功能: 优化 -> 应用 -> 重启 -> 失败检测 -> 收集错误 -> 回退 -> 修复 -> 重试
# ============================================================

set -o pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_JS="$REPO_DIR/server.js"
LOG_FILE="$REPO_DIR/deploy.log"
BACKUP_DIR="$REPO_DIR/.deploy_backups"
HEALTH_CHECK_INTERVAL=3
HEALTH_CHECK_TIMEOUT=30

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() {
    local ts=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${ts} $1" | tee -a "$LOG_FILE"
}

log_green()  { log "${GREEN}OK: $1${NC}"; }
log_red()    { log "${RED}FAIL: $1${NC}"; }
log_yellow() { log "${YELLOW}WARN: $1${NC}"; }
log_blue()   { log "${BLUE}INFO: $1${NC}"; }
log_cyan()   { log "${CYAN}DEPLOY: $1${NC}"; }

backup_current_version() {
    mkdir -p "$BACKUP_DIR"
    local backup_name="pre_deploy_$(date +%Y%m%d_%H%M%S)"
    cp "$SERVER_JS" "$BACKUP_DIR/$backup_name.server.js" 2>/dev/null
    cp "$REPO_DIR/index.html" "$BACKUP_DIR/$backup_name.index.html" 2>/dev/null
    if [ -d "$REPO_DIR/assets" ]; then
        cp -r "$REPO_DIR/assets" "$BACKUP_DIR/$backup_name.assets" 2>/dev/null
    fi
    echo "$backup_name"
}

restore_backup() {
    local backup_name="$1"
    if [ -z "$backup_name" ] || [ ! -d "$BACKUP_DIR" ]; then
        log_red "没有可用的备份"
        return 1
    fi
    log_cyan "正在回退到备份: $backup_name"
    cp "$BACKUP_DIR/$backup_name.server.js" "$SERVER_JS" 2>/dev/null
    cp "$BACKUP_DIR/$backup_name.index.html" "$REPO_DIR/index.html" 2>/dev/null
    if [ -d "$BACKUP_DIR/$backup_name.assets" ]; then
        rm -rf "$REPO_DIR/assets"
        cp -r "$BACKUP_DIR/$backup_name.assets" "$REPO_DIR/assets" 2>/dev/null
    fi
    log_green "已回退到备份版本: $backup_name"
}

stop_server() {
    # Stop any server.js instances
    local pids=$(pgrep -f "node.*server\.js" 2>/dev/null)
    if [ -n "$pids" ]; then
        log_cyan "停止现有服务器 (PIDs: $pids)..."
        kill $pids 2>/dev/null
        sleep 2
        pids=$(pgrep -f "node.*server\.js" 2>/dev/null)
        if [ -n "$pids" ]; then
            kill -9 $pids 2>/dev/null
            sleep 1
        fi
        log_green "服务器已停止"
    fi
}

start_server() {
    # Read PORT from .env or default to 9094
    local port=9094
    if [ -f "$REPO_DIR/.env" ]; then
        local env_port=$(grep "^PORT=" "$REPO_DIR/.env" 2>/dev/null | cut -d= -f2)
        if [ -n "$env_port" ]; then
            port=$env_port
        fi
    fi
    # Also check process.env default in server.js
    log_cyan "启动服务器 (端口 $port)..."
    cd "$REPO_DIR"
    PORT=$port node server.js > "$REPO_DIR/server_new.log" 2>&1 &
    local pid=$!
    echo "$pid" > "$REPO_DIR/.server.pid"
    log_blue "服务器 PID: $pid"
    echo "$pid"
    echo "$port"
}

check_health() {
    local port="$1"
    if [ -z "$port" ]; then port=9094; fi
    local retries=0
    local max_retries=$((HEALTH_CHECK_TIMEOUT / HEALTH_CHECK_INTERVAL))
    while [ $retries -lt $max_retries ]; do
        local http_code
        http_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/?endpoint=status" 2>/dev/null)
        if [ "$http_code" = "200" ]; then
            # Verify it's actually our server, not OpenClaw Control
            local body
            body=$(curl -s "http://localhost:$port/?endpoint=status" 2>/dev/null)
            if echo "$body" | grep -q "virtual\|Virtual\|office\|Office\|agents\|agents"; then
                log_green "服务器健康检查通过 (端口 $port, 尝试 $((retries+1))/$max_retries)"
                return 0
            fi
        fi
        sleep $HEALTH_CHECK_INTERVAL
        retries=$((retries + 1))
    done
    log_red "服务器健康检查失败 (端口 $port, 超时 ${HEALTH_CHECK_TIMEOUT}s)"
    return 1
}

collect_failure_reasons() {
    local reasons=""
    # 检查 Node.js 语法错误
    local syntax_error
    syntax_error=$(cd "$REPO_DIR" && node --check server.js 2>&1 || true)
    if [ -n "$syntax_error" ]; then
        reasons="${reasons}语法错误:\n${syntax_error}\n\n"
    fi
    # 检查端口占用
    local port="${1:-9094}"
    if lsof -i :"$port" >/dev/null 2>&1; then
        local owner
        owner=$(lsof -i :"$port" 2>/dev/null | grep LISTEN | head -1)
        reasons="${reasons}端口 $port 被占用: ${owner}\n\n"
    fi
    # 检查服务器日志
    if [ -f "$REPO_DIR/server_new.log" ]; then
        local last_errors
        last_errors=$(tail -30 "$REPO_DIR/server_new.log" 2>/dev/null || true)
        if [ -n "$last_errors" ]; then
            reasons="${reasons}服务器启动日志:\n${last_errors}\n\n"
        fi
    fi
    echo -e "$reasons"
}

auto_fix_duplicate_code() {
    # 清理 server.js 中的重复代码块
    log_yellow "检测到重复代码问题，使用 Node.js 自动去重..."
    local tmp_file="$REPO_DIR/.server_fix_tmp.js"
    cd "$REPO_DIR"
    node -e "
const fs = require('fs');
const code = fs.readFileSync('server.js', 'utf-8');
const lines = code.split('\n');

// Track function/variable declarations to detect duplicates
const seenDecls = {};
const result = [];
let skipUntilNextMain = false;
let braceDepth = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Detect function declarations: function xxx( or const xxx = { or const xxx = function
    const funcMatch = trimmed.match(/^(function\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
    const constObjMatch = trimmed.match(/^(const\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*\{?\s*$/);
    const constFuncMatch = trimmed.match(/^(const\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(async\s+)?function/);
    
    let declName = null;
    if (funcMatch) declName = funcMatch[2];
    else if (constObjMatch) declName = constObjMatch[2];
    else if (constFuncMatch) declName = constFuncMatch[2];
    
    if (declName && seenDecls[declName]) {
        // This is a duplicate declaration - skip it
        // Find the end of this block (matching braces or next main section)
        if (trimmed.includes('{')) {
            braceDepth++;
        }
        let depth = 1;
        skipUntilNextMain = true;
        // Count braces
        for (let j = i + 1; j < lines.length; j++) {
            for (const ch of lines[j]) {
                if (ch === '{') depth++;
                if (ch === '}') depth--;
            }
            if (depth <= 0) {
                i = j;
                skipUntilNextMain = false;
                break;
            }
        }
        continue;
    }
    
    if (declName) {
        seenDecls[declName] = true;
    }
    
    result.push(line);
}

fs.writeFileSync('$tmp_file', result.join('\n'));
console.log('去重完成，原文件行数: ' + lines.length + ', 去重后: ' + result.length);
" 2>&1
    
    if [ $? -eq 0 ] && [ -s "$tmp_file" ]; then
        mv "$tmp_file" "$SERVER_JS"
        log_green "已清理重复代码块"
        return 0
    else
        rm -f "$tmp_file"
        log_red "代码去重失败"
        return 1
    fi
}

deploy_once() {
    log_cyan "=========================================="
    log_cyan "开始优化部署循环"
    log_cyan "=========================================="

    # Step 1: 备份当前版本
    local backup_name
    backup_name=$(backup_current_version)
    log_cyan "已备份当前版本: $backup_name"

    # Step 2: 确保并行优化系统在后台运行
    if [ -f "$REPO_DIR/parallel-implement.js" ]; then
        log_cyan "检查并行优化系统..."
        if ! pgrep -f "parallel-implement" > /dev/null 2>&1; then
            log_yellow "并行优化系统未运行，后台启动..."
            cd "$REPO_DIR"
            nohup node parallel-implement.js >> "$REPO_DIR/optimization.log" 2>&1 &
            log_green "并行优化系统已启动 (PID: $!)"
        else
            log_green "并行优化系统已在运行"
        fi
    fi

    # Step 3: 停止服务器
    stop_server

    # Step 4: 启动服务器
    local start_output
    start_output=$(start_server)
    local pid
    pid=$(echo "$start_output" | head -1)
    local port
    port=$(echo "$start_output" | tail -1)
    
    # Give server time to start
    sleep 3

    # Step 5: 健康检查
    if check_health "$port"; then
        log_green "=========================================="
        log_green "部署成功! 服务器运行在 http://localhost:$port"
        log_green "=========================================="
        return 0
    fi

    # Step 6: 收集错误
    log_red "部署失败! 开始收集错误信息..."
    local failure_reasons
    failure_reasons=$(collect_failure_reasons "$port")
    local failure_log_file="$BACKUP_DIR/failure_$(date +%Y%m%d_%H%M%S).log"
    echo "$failure_reasons" > "$failure_log_file"
    log_yellow "失败日志已保存到: $failure_log_file"

    # Step 7: 回退
    restore_backup "$backup_name"

    # Step 8: 自动修复 - 去重代码
    log_cyan "尝试自动修复..."
    auto_fix_duplicate_code
    
    # Verify syntax after fix
    local syntax_check
    syntax_check=$(cd "$REPO_DIR" && node --check server.js 2>&1 || true)
    if [ -n "$syntax_check" ]; then
        log_red "修复后仍有语法错误，回退..."
        restore_backup "$backup_name"
        log_red "=========================================="
        log_red "修复失败! 已回退到备份版本: $backup_name"
        log_red "=========================================="
        return 1
    fi
    log_green "语法检查通过"

    # Step 9: 重启并验证
    log_cyan "重启修复后的服务器..."
    stop_server
    start_output=$(start_server)
    pid=$(echo "$start_output" | head -1)
    port=$(echo "$start_output" | tail -1)
    sleep 3

    if check_health "$port"; then
        log_green "=========================================="
        log_green "修复后部署成功! 服务器运行在 http://localhost:$port"
        log_green "=========================================="
        return 0
    fi

    # Step 10: 最终回退
    restore_backup "$backup_name"
    log_red "=========================================="
    log_red "部署最终失败! 已回退到备份版本: $backup_name"
    log_red "失败详情:"
    echo "$failure_reasons" | sed 's/^/  /'
    log_red "=========================================="
    cd "$REPO_DIR"
    git add -A 2>/dev/null
    git commit -m "DEPLOY: rollback to $backup_name" --allow-empty 2>/dev/null || true
    return 1
}

main() {
    log_cyan "Virtual Office - 智能优化部署系统 v2.0"
    log_cyan "启动时间: $(date)"
    log_cyan "项目目录: $REPO_DIR"
    log_cyan ""

    local round=0
    while true; do
        round=$((round + 1))
        log_blue "--- 第 $round 轮部署循环 ---"
        deploy_once
        log_cyan "等待下一轮... (180秒)"
        sleep 180
    done
}

if [ "$1" = "--once" ]; then
    deploy_once
    exit $?
fi

main
