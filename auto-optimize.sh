#!/bin/bash
# Auto-Optimization Loop v3 - Continuous 7x24 optimization

REPO_DIR="/tmp/openclaw/workspace/virtual-office"
API_URL="http://localhost:9094"
POLL_INTERVAL=180  # 3 minutes between rounds

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

check_server() {
    if ! curl -s "${API_URL}/?endpoint=status" > /dev/null 2>&1; then
        log "⚠️ Server restarting..."
        cd "$REPO_DIR"
        PORT=9094 node server.js > /tmp/openclaw/workspace/virtual-office/server.log 2>&1 &
        sleep 3
    fi
}

agent_review() {
    local agent_id=$1
    local focus_area=$2
    local prompt="你是${agent_id}，请审查项目代码，专注于${focus_area}。提供具体的代码修改建议。用中文回答，控制在200字以内。"
    
    local response=$(curl -s -X POST "${API_URL}/?endpoint=chat" \
        -H "Content-Type: application/json" \
        -d "{\"agent_id\":\"${agent_id}\",\"message\":\"${prompt}\"}" 2>/dev/null)
    
    echo "$response"
}

apply_and_commit() {
    local agent_id=$1
    local suggestions=$2
    local focus=$3
    
    log "📝 ${agent_id} 优化: ${focus}"
    
    # Log optimization
    cat >> "$REPO_DIR/OPTIMIZATION_LOG.md" << EOF
## ${agent_id} - $(date '+%Y-%m-%d %H:%M')
**专注**: ${focus}
**建议**: ${suggestions}
---

EOF
    
    # Commit and push
    cd "$REPO_DIR"
    git add -A
    if ! git diff --cached --quiet; then
        git commit -m "🤖 ${agent_id}: ${focus}" 2>/dev/null
        git push 2>/dev/null && log "✅ ${agent_id} 已推送" || log "❌ 推送失败"
    fi
}

# Agent rotation
AGENTS=("bob" "henry" "carol" "david" "eve" "grace" "alice" "frank")
FOCUSES=(
    "API路由效率和错误处理"
    "前端性能和DOM优化" 
    "CSS和设计系统优化"
    "安全加固和部署优化"
    "质量保证和测试覆盖"
    "数据层性能和查询优化"
    "用户体验和产品功能"
    "架构设计和代码质量"
)

log "🚀 虚拟办公室自动优化系统启动"
log "📅 开始7x24持续优化..."

ROUND=0
while true; do
    ROUND=$((ROUND + 1))
    log "🔄 第 ${ROUND} 轮优化"
    
    check_server
    
    INDEX=$(( (ROUND - 1) % 8 ))
    AGENT=${AGENTS[$INDEX]}
    FOCUS=${FOCUSES[$INDEX]}
    
    log "👨‍💻 ${AGENT} 审查: ${FOCUS}"
    
    REVIEW=$(agent_review "$AGENT" "$FOCUS")
    REPLY=$(echo "$REVIEW" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('reply', '') or data.get('error', 'No response'))
except:
    print('Error')
" 2>/dev/null)
    
    if [ -n "$REPLY" ] && [ "$REPLY" != "Error" ] && [ "$REPLY" != "No response" ]; then
        apply_and_commit "$AGENT" "$REPLY" "$FOCUS"
    else
        log "⚠️ ${AGENT} 审查失败"
    fi
    
    sleep $POLL_INTERVAL
done
