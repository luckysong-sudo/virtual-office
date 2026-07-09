#!/bin/bash
# ============================================================
# Virtual Office - 部署守护脚本
# 职责: 确保服务器持续运行，配合 self-optimize.js 做增量优化
# ============================================================

set -o pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_JS="$REPO_DIR/server.js"
LOG_FILE="$REPO_DIR/deploy.log"
BACKUP_DIR="$REPO_DIR/.deploy_backups"
PORT=9094
HEALTH_CHECK_INTERVAL=3
HEALTH_CHECK_TIMEOUT=30

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
    local bn="pre_deploy_$(date +%Y%m%d_%H%M%S)"
    cp "$SERVER_JS" "$BACKUP_DIR/$bn.server.js" 2>/dev/null
    cp "$REPO_DIR/index.html" "$BACKUP_DIR/$bn.index.html" 2>/dev/null
    [ -d "$REPO_DIR/assets" ] && cp -r "$REPO_DIR/assets" "$BACKUP_DIR/$bn.assets" 2>/dev/null
    echo "$bn"
}

restore_backup() {
    local bn="$1"
    if [ -z "$bn" ] || [ ! -d "$BACKUP_DIR" ]; then
        log_red "没有可用的备份"
        return 1
    fi
    log_cyan "回退到备份: $bn"
    cp "$BACKUP_DIR/$bn.server.js" "$SERVER_JS" 2>/dev/null
    cp "$BACKUP_DIR/$bn.index.html" "$REPO_DIR/index.html" 2>/dev/null
    if [ -d "$BACKUP_DIR/$bn.assets" ]; then
        rm -rf "$REPO_DIR/assets"
        cp -r "$BACKUP_DIR/$bn.assets" "$REPO_DIR/assets" 2>/dev/null
    fi
    log_green "已回退到备份: $bn"
}

stop_server() {
    local pids
    pids=$(pgrep -f "node.*server\.js" 2>/dev/null)
    if [ -n "$pids" ]; then
        log_cyan "停止服务器 (PIDs: $pids)..."
        kill $pids 2>/dev/null
        sleep 2
        pids=$(pgrep -f "node.*server\.js" 2>/dev/null)
        [ -n "$pids" ] && kill -9 $pids 2>/dev/null
        sleep 1
        log_green "服务器已停止"
    fi
}

start_server() {
    log_cyan "启动服务器 (端口 $PORT)..."
    cd "$REPO_DIR"
    PORT=$PORT node server.js > "$REPO_DIR/server_new.log" 2>&1 &
    local pid=$!
    echo "$pid" > "$REPO_DIR/.server.pid"
    log_blue "PID: $pid"
}

check_health() {
    local retries=0
    local max=$((HEALTH_CHECK_TIMEOUT / HEALTH_CHECK_INTERVAL))
    while [ $retries -lt $max ]; do
        local code
        code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/?endpoint=status" 2>/dev/null)
        if [ "$code" = "200" ]; then
            local body
            body=$(curl -s "http://localhost:$PORT/?endpoint=status" 2>/dev/null)
            if echo "$body" | grep -q "office\|agents\|virtual"; then
                log_green "健康检查通过 (尝试 $((retries+1))/$max)"
                return 0
            fi
        fi
        sleep $HEALTH_CHECK_INTERVAL
        retries=$((retries + 1))
    done
    log_red "健康检查失败 (超时 ${HEALTH_CHECK_TIMEOUT}s)"
    return 1
}

# 确保 self-optimize.js 在运行
ensure_optimizer_running() {
    if ! pgrep -f "self-optimize" > /dev/null 2>&1; then
        log_yellow "自我优化系统未运行，后台启动..."
        cd "$REPO_DIR"
        nohup node self-optimize.js >> "$REPO_DIR/optimizer.log" 2>&1 &
        log_green "自我优化系统已启动 (PID: $!)"
    else
        log_green "自我优化系统已在运行"
    fi
}

deploy_once() {
    log_cyan "============================================"
    log_cyan "开始部署循环"
    log_cyan "============================================"

    # 确保优化器在运行
    ensure_optimizer_running

    # 停止服务器
    stop_server

    # 启动
    start_server
    sleep 3

    # 健康检查
    if check_health; then
        log_green "============================================"
        log_green "部署成功! http://localhost:$PORT"
        log_green "============================================"
        return 0
    fi

    # 失败处理
    log_red "部署失败! 收集错误..."
    local reasons=""
    reasons=$(cd "$REPO_DIR" && node --check server.js 2>&1 || true)
    if [ -f "$REPO_DIR/server_new.log" ]; then
        reasons="${reasons}\n$(tail -20 server_new.log)"
    fi
    log_yellow "错误: $(echo -e "$reasons" | head -5)"

    # 回退
    local backup_name
    backup_name=$(backup_current_version)
    restore_backup "$backup_name"

    # 重启验证
    log_cyan "重启回退后的服务器..."
    stop_server
    start_server
    sleep 3

    if check_health; then
        log_green "回退后部署成功!"
        return 0
    fi

    log_red "============================================"
    log_red "最终失败! 已回退到: $backup_name"
    log_red "============================================"
    return 1
}

main() {
    log_cyan "Virtual Office - 部署守护系统"
    log_cyan "启动时间: $(date)"
    log_cyan ""

    local round=0
    while true; do
        round=$((round + 1))
        log_blue "--- 第 $round 轮 ---"
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
