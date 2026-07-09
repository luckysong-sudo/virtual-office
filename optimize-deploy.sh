#!/bin/bash
# ============================================================
# Virtual Office - 智能优化部署系统 v2.0
# 功能: 优化 → 应用 → 重启 → 失败检测 → 收集错误 → 回退 → 修复 → 重试
# ============================================================

set -o pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_JS="$REPO_DIR/server.js"
LOG_FILE="$REPO_DIR/deploy.log"
BACKUP_DIR="$REPO_DIR/.deploy_backups"
STATE_FILE="$REPO_DIR/.deploy_state.json"
PORT="${PORT:-9094}"
MAX_RETRIES=3
RETRY_DELAY=5
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

log_green()  { log "${GREEN}✅ $1${NC}"; }
log_red()    { log "${RED}❌ $1${NC}"; }
log_yellow() { log "${YELLOW}⚠️  $1${NC}"; }
log_blue()   { log "${BLUE}ℹ️  $1${NC}"; }
log_cyan()   { log "${CYAN}🔧 $1${NC}"; }

# ============================================================
# 1. 备份当前可工作的版本
# ============================================================
backup_current_version() {
    mkdir -p "$BACKUP_DIR"
    local backup_name="pre_deploy_$(date +%Y%m%d_%H%M%S)"
    cp "$SERVER_JS" "$BACKUP_DIR/$backup_name.server.js" 2>/dev/null
    cp "$REPO_DIR/index.html" "$BACKUP_DIR/$backup_name.index.html" 2>/dev/null
    # Also backup all modified files
    if [ -d "$REPO_DIR/assets" ]; then
        cp -r "$REPO_DIR/assets" "$BACKUP_DIR/$backup_name.assets" 2>/dev/null
    fi
    echo "$backup_name"
}

# ============================================================
# 2. 恢复备份版本
# ============================================================
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

# ============================================================
# 3. 停止现有服务器
# ============================================================
stop_server() {
    local pids=$(pgrep -f "node.*server\.js" 2>/dev/null)
    if [ -n "$pids" ]; then
        log_cyan "停止现有服务器 (PIDs: $pids)..."
        kill $pids 2>/dev/null
        sleep 2
        # Force kill if still running
        pids=$(pgrep -f "node.*server\.js" 2>/dev/null)
        if [ -n "$pids" ]; then
            kill -9 $pids 2>/dev/null
            sleep 1
        fi
        log_green "服务器已停止"
    fi
}

# ============================================================
# 4. 启动服务器
# ============================================================
start_server() {
    log_cyan "启动服务器 (端口 $PORT)..."
    cd "$REPO_DIR"
    PORT=$PORT node server.js > "$REPO_DIR/server_new.log" 2>&1 &
    local pid=$!
    echo "$pid" > "$REPO_DIR/.server.pid"
    log_blue "服务器 PID: $pid"
    echo "$pid"
}

# ============================================================
# 5. 健康检查
# ============================================================
check_health() {
    local retries=0
    local max_retries=$((HEALTH_CHECK_TIMEOUT / HEALTH_CHECK_INTERVAL))
    
    while [ $retries -lt $max_retries ]; do
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/?endpoint=status" 2>/dev/null | grep -q "200"; then
            log_green "服务器健康检查通过 (尝试 $((retries+1))/$max_retries)"
            return 0
        fi
        sleep $HEALTH_CHECK_INTERVAL
        retries=$((retries + 1))
    done
    
    log_red "服务器健康检查失败 (超时 ${HEALTH_CHECK_TIMEOUT}s)"
    return 1
}

# ============================================================
# 6. 收集重启失败原因
# ============================================================
collect_failure_reasons() {
    local reasons=""
    
    # 检查 Node.js 语法错误
    local syntax_error=$(cd "$REPO_DIR" && node --check server.js 2>&1 || true)
    if [ -n "$syntax_error" ]; then
        reasons="${reasons}语法错误:\n${syntax_error}\n\n"
    fi
    
    # 检查端口占用
    if lsof -i :"$PORT" >/dev/null 2>&1; then
        reasons="${reasons}端口 $PORT 被占用\n\n"
    fi
    
    # 检查服务器日志
    if [ -f "$REPO_DIR/server_new.log" ]; then
        local last_errors=$(grep -i "error\|exception\|fatal\|crash" "$REPO_DIR/server_new.log" 2>/dev/null | tail -20 || true)
        if [ -n "$last_errors" ]; then
            reasons="${reasons}服务器启动错误日志:\n${last_errors}\n\n"
        fi
    fi
    
    # 检查 .env 文件
    if [ ! -f "$REPO_DIR/.env" ]; then
        reasons="${reasons}缺少 .env 配置文件\n\n"
    fi
    
    # 检查依赖
    if [ ! -f "$REPO_DIR/package.json" ]; then
        reasons="${reasons}缺少 package.json (非 npm 项目，纯 Node.js 内置模块)\n\n"
    fi
    
    echo -e "$reasons"
}

# ============================================================
# 7. 尝试自动修复常见问题
# ============================================================
auto_fix_issues() {
    local failure_log="$1"
    local fixed=false
    
    # 修复1: 重复代码块 (server.js 末尾有大量重复的 securityHeaders、asyncExec 等)
    if echo "$failure_log" | grep -qi "重复\|duplicate\|syntax"; then
        log_yellow "检测到可能的重复代码问题，尝试清理..."
        
        # 找出 server.js 末尾重复的模式并去重
        local tmp_file="$REPO_DIR/.server_fix_tmp.js"
        awk '
        BEGIN { seen_security=0; seen_sanitize=0; seen_asyncExec=0; seen_requestQueue=0; seen_timing=0; }
        /app\.use\(securityHeaders\)/ { 
            if (seen_security++) next 
        }
        /^function securityHeaders/ {
            # skip duplicate
            if (seen_security > 0) { skip_until_next_main=1; next }
            seen_security++
        }
        skip_until_next_main && /^\/\/ Bob'\''s API optimization:/ { skip_until_next_main=0 }
        skip_until_next_main { next }
        
        /function asyncExec/ {
            if (seen_asyncExec++) next
            seen_asyncExec++
        }
        /function sanitizeInput/ {
            if (seen_sanitize++) next
            seen_sanitize++
        }
        /function validateAgentName/ {
            if (seen_validate++) next
            seen_validate++
        }
        /function validatePosition/ {
            if (seen_position++) next
            seen_position++
        }
        /const requestQueue/ {
            if (seen_requestQueue++) next
            seen_requestQueue++
        }
        /function timingMiddleware/ {
            if (seen_timing++) next
            seen_timing++
        }
        { print }
        ' "$SERVER_JS" > "$tmp_file" 2>/dev/null
        
        if [ $? -eq 0 ] && [ -s "$tmp_file" ]; then
            mv "$tmp_file" "$SERVER_JS"
            log_green "已清理重复代码块"
            fixed=true
        else
            rm -f "$tmp_file"
        fi
    fi
    
    # 修复2: 端口被占用 - 杀掉占用进程
    if echo "$failure_log" | grep -qi "端口.*占用\|EADDRINUSE"; then
        log_yellow "端口被占用，正在释放..."
        lsof -ti :"$PORT" | xargs kill -9 2>/dev/null
        sleep 1
        fixed=true
    fi
    
    # 修复3: 缺少 .env
    if echo "$failure_log" | grep -qi "缺少.*env"; then
        log_yellow "创建默认 .env 文件..."
        cat > "$REPO_DIR/.env" << 'ENVEOF'
AGNES_API_URL=https://apihub.agnes-ai.com/v1
ENVEOF
        fixed=true
    fi
    
    echo "$fixed"
}

# ============================================================
# 8. 执行一次完整的优化部署循环
# ============================================================
deploy_once() {
    log_cyan "═══════════════════════════════════════════"
    log_cyan "开始优化部署循环"
    log_cyan "═══════════════════════════════════════════"
    
    # Step 1: 备份当前版本
    local backup_name=$(backup_current_version)
    log_cyan "已备份当前版本: $backup_name"
    
    # Step 2: 运行并行优化脚本 (如果有agent修改代码)
    if [ -f "$REPO_DIR/parallel-implement.js" ]; then
        log_cyan "运行并行优化系统..."
        cd "$REPO_DIR"
        timeout 120 node parallel-implement.js >> "$REPO_DIR/optimization.log" 2>&1 || true
        log_green "优化脚本执行完成"
    fi
    
    # Step 3: 停止服务器
    stop_server
    
    # Step 4: 启动服务器
    start_server
    
    # Step 5: 健康检查
    if check_health; then
        log_green "═══════════════════════════════════════════"
        log_green "部署成功! 服务器运行在 http://localhost:$PORT"
        log_green "═══════════════════════════════════════════"
        return 0
    fi
    
    # Step 6: 健康检查失败 - 收集错误
    log_red "部署失败! 开始收集错误信息..."
    local failure_reasons=$(collect_failure_reasons)
    
    # 保存失败日志
    local failure_log_file="$BACKUP_DIR/failure_$(date +%Y%m%d_%H%M%S).log"
    echo "$failure_reasons" > "$failure_log_file"
    log_yellow "失败日志已保存到: $failure_log_file"
    
    # Step 7: 回退到备份版本
    restore_backup "$backup_name"
    
    # Step 8: 尝试自动修复
    log_cyan "尝试自动修复..."
    local fixed=$(auto_fix_issues "$failure_reasons")
    
    if [ "$fixed" = "true" ]; then
        log_green "自动修复完成，尝试重新部署..."
        stop_server
        start_server
        
        if check_health; then
            log_green "═══════════════════════════════════════════"
            log_green "修复后部署成功! 服务器运行在 http://localhost:$PORT"
            log_green "═══════════════════════════════════════════"
            return 0
        fi
        
        # 第二次修复尝试
        log_yellow "首次修复后仍未成功，尝试二次修复..."
        fixed=$(auto_fix_issues "$(collect_failure_reasons)")
        if [ "$fixed" = "true" ]; then
            stop_server
            start_server
            
            if check_health; then
                log_green "═══════════════════════════════════════════"
                log_green "二次修复后部署成功!"
                log_green "═══════════════════════════════════════════"
                return 0
            fi
        fi
    fi
    
    # Step 9: 最终回退 + 报告
    restore_backup "$backup_name"
    log_red "═══════════════════════════════════════════"
    log_red "部署最终失败! 已回退到备份版本: $backup_name"
    log_red "失败详情:"
    echo "$failure_reasons" | sed 's/^/  /'
    log_red "═══════════════════════════════════════════"
    
    # 提交回退记录
    cd "$REPO_DIR"
    git add -A 2>/dev/null
    git commit -m "🔄 部署失败回退: $backup_name" --allow-empty 2>/dev/null || true
    
    return 1
}

# ============================================================
# 主循环
# ============================================================
main() {
    log_cyan "🏢 虚拟办公室 - 智能优化部署系统 v2.0"
    log_cyan "📅 启动时间: $(date)"
    log_cyan "📁 项目目录: $REPO_DIR"
    log_cyan "🔗 服务器端口: $PORT"
    log_cyan "🔄 最大重试次数: $MAX_RETRIES"
    log_cyan ""
    
    local round=0
    while true; do
        round=$((round + 1))
        log_blue "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        log_blue "第 $round 轮部署循环"
        log_blue "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        deploy_once
        
        log_cyan ""
        log_cyan "等待下一轮... ($((3 * 60))秒)"
        sleep $((3 * 60))
    done
}

# 如果通过参数传入 --once，只执行一轮
if [ "$1" = "--once" ]; then
    deploy_once
    exit $?
fi

main
