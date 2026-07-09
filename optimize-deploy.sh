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
PORT="${PORT:-9094}"
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
    log_cyan "启动服务器 (端口 $PORT)..."
    cd "$REPO_DIR"
    PORT=$PORT node server.js > "$REPO_DIR/server_new.log" 2>&1 &
    local pid=$!
    echo "$pid" > "$REPO_DIR/.server.pid"
    log_blue "服务器 PID: $pid"
    echo "$pid"
}

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

collect_failure_reasons() {
    local reasons=""
    local syntax_error
    syntax_error=$(cd "$REPO_DIR" && node --check server.js 2>&1 || true)
    if [ -n "$syntax_error" ]; then
        reasons="${reasons}语法错误:\n${syntax_error}\n\n"
    fi
    if lsof -i :"$PORT" >/dev/null 2>&1; then
        reasons="${reasons}端口 $PORT 被占用\n\n"
    fi
    if [ -f "$REPO_DIR/server_new.log" ]; then
        local last_errors
        last_errors=$(grep -i "error\|exception\|fatal\|crash" "$REPO_DIR/server_new.log" 2>/dev/null | tail -20 || true)
        if [ -n "$last_errors" ]; then
            reasons="${reasons}服务器启动错误日志:\n${last_errors}\n\n"
        fi
    fi
    echo -e "$reasons"
}

auto_fix_issues() {
    local failure_log="$1"
    local fixed=false
    if echo "$failure_log" | grep -qi "端口.*占用\|EADDRINUSE"; then
        log_yellow "端口被占用，正在释放..."
        lsof -ti :"$PORT" | xargs kill -9 2>/dev/null
        sleep 1
        fixed=true
    fi
    echo "$fixed"
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
    start_server

    # Step 5: 健康检查
    if check_health; then
        log_green "=========================================="
        log_green "部署成功! 服务器运行在 http://localhost:$PORT"
        log_green "=========================================="
        return 0
    fi

    # Step 6: 收集错误
    log_red "部署失败! 开始收集错误信息..."
    local failure_reasons
    failure_reasons=$(collect_failure_reasons)
    local failure_log_file="$BACKUP_DIR/failure_$(date +%Y%m%d_%H%M%S).log"
    echo "$failure_reasons" > "$failure_log_file"
    log_yellow "失败日志已保存到: $failure_log_file"

    # Step 7: 回退
    restore_backup "$backup_name"

    # Step 8: 自动修复
    log_cyan "尝试自动修复..."
    local fixed
    fixed=$(auto_fix_issues "$failure_reasons")

    if [ "$fixed" = "true" ]; then
        log_green "自动修复完成，尝试重新部署..."
        stop_server
        start_server
        if check_health; then
            log_green "修复后部署成功! 服务器运行在 http://localhost:$PORT"
            return 0
        fi
        log_yellow "首次修复后仍未成功，尝试二次修复..."
        local new_reasons
        new_reasons=$(collect_failure_reasons)
        fixed=$(auto_fix_issues "$new_reasons")
        if [ "$fixed" = "true" ]; then
            stop_server
            start_server
            if check_health; then
                log_green "二次修复后部署成功!"
                return 0
            fi
        fi
    fi

    # Step 9: 最终回退
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
    log_cyan "服务器端口: $PORT"
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
