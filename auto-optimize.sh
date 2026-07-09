#!/bin/bash
# Auto-Optimization Loop v3 - With Skill Execution

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

execute_skill() {
    local agent_id=$1
    local skill=$2
    local args=$3
    
    local response=$(curl -s -X POST "${API_URL}/?endpoint=skill-exec" \
        -H "Content-Type: application/json" \
        -d "{\"agent_id\":\"${agent_id}\",\"skill\":\"${skill}\",\"args\":${args}}" 2>/dev/null)
    
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

SKILLS=(
    "analyze_data"
    "exec_command"
    "create_diagram"
    "git_commit"
    "file_read"
    "web_search"
    "create_skill"
    "exec_command"
)

log "🚀 虚拟办公室自动优化系统启动 (带技能执行)"
log "📅 开始7x24持续优化..."

ROUND=0
while true; do
    ROUND=$((ROUND + 1))
    log "🔄 第 ${ROUND} 轮优化"
    
    check_server
    
    INDEX=$(( (ROUND - 1) % 8 ))
    AGENT=${AGENTS[$INDEX]}
    FOCUS=${FOCUSES[$INDEX]}
    SKILL=${SKILLS[$INDEX]}
    
    log "👨‍💻 ${AGENT} 审查: ${FOCUS}"
    log "🛠️ ${AGENT} 使用技能: ${SKILL}"
    
    # Execute skill first
    case $SKILL in
        "analyze_data")
            EXEC_RESULT=$(execute_skill "$AGENT" "analyze_data" "{}")
            log "📊 ${AGENT} 数据分析结果: $EXEC_RESULT"
            ;;
        "exec_command")
            EXEC_RESULT=$(execute_skill "$AGENT" "exec_command" "{\"command\":\"git log --oneline -5\"}")
            log "⚡ ${AGENT} 命令执行结果: $EXEC_RESULT"
            ;;
        "create_diagram")
            EXEC_RESULT=$(execute_skill "$AGENT" "create_diagram" "{\"title\":\"${FOCUS}\"}")
            log "🧭 ${AGENT} 图表创建结果: $EXEC_RESULT"
            ;;
        "git_commit")
            EXEC_RESULT=$(execute_skill "$AGENT" "git_commit" "{\"message\":\"Auto-commit from ${AGENT}\"}")
            log "📦 ${AGENT} Git提交结果: $EXEC_RESULT"
            ;;
        "file_read")
            EXEC_RESULT=$(execute_skill "$AGENT" "file_read" "{\"path\":\"agents/personalities.json\"}")
            log "📄 ${AGENT} 文件读取结果: ${EXEC_RESULT:0:100}..."
            ;;
        "web_search")
            EXEC_RESULT=$(execute_skill "$AGENT" "web_search" "{\"query\":\"${FOCUS}\"}")
            log "🔍 ${AGENT} 搜索结果: $EXEC_RESULT"
            ;;
        "create_skill")
            EXEC_RESULT=$(execute_skill "$AGENT" "create_skill" "{\"name\":\"${FOCUS//-/_}\",\"description\":\"${FOCUS}\",\"usage\":\"auto-generated\"}")
            log "📝 ${AGENT} 技能创建结果: $EXEC_RESULT"
            ;;
    esac
    
    # Get agent review
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
