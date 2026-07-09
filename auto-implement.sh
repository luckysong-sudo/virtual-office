#!/bin/bash
# Auto-Implementation Loop - Agents ACTUALLY implement code changes
# Each agent: reviews code → generates patch → applies it → commits → pushes

REPO_DIR="/tmp/openclaw/workspace/virtual-office"
API_URL="http://localhost:9094"
POLL_INTERVAL=300  # 5 minutes between rounds

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

# Get agent to review code AND generate actual implementation
agent_implant() {
    local agent_id=$1
    local focus_area=$2
    local target_file=$3
    local file_content=$4
    
    local prompt="你是${agent_id}，${focus_area}专家。

请审查以下代码并**直接修改它**。你需要：
1. 找出代码中的问题
2. 给出具体的代码修改（使用统一的格式标记改动）
3. 解释为什么这样改

目标文件: ${target_file}
当前内容:
${file_content}

请给出完整的修改后的文件内容，用以下格式标记：
[MODIFY_START]
// 修改后的完整文件内容
[MODIFY_END]

用中文回答，控制在500字以内。"
    
    local response=$(curl -s -X POST "${API_URL}/?endpoint=chat" \
        -H "Content-Type: application/json" \
        -d "{\"agent_id\":\"${agent_id}\",\"message\":\"${prompt}\"}" 2>/dev/null)
    
    echo "$response"
}

# Extract modified code from agent response and apply it
extract_and_apply() {
    local agent_id=$1
    local response=$2
    local target_file=$3
    
    # Extract code between MODIFY_START and MODIFY_END
    local modified_code=$(echo "$response" | sed -n '/\[MODIFY_START\]/,/\[MODIFY_END\]/p' | grep -v '\[MODIFY' | sed '1d;$d')
    
    if [ -n "$modified_code" ]; then
        echo "$modified_code" > "$target_file"
        log "✅ ${agent_id} 已修改 ${target_file}"
        return 0
    else
        log "⚠️ ${agent_id} 没有生成可执行的代码修改"
        return 1
    fi
}

# Commit and push actual code changes
commit_code_changes() {
    local agent_id=$1
    local message=$2
    
    cd "$REPO_DIR"
    git add -A
    if git diff --cached --quiet; then
        log "⚠️ ${agent_id} 没有产生实际的代码更改"
        return 1
    fi
    
    git commit -m "🔧 ${agent_id} 实施优化: ${message}" 2>/dev/null
    git push 2>/dev/null
    if [ $? -eq 0 ]; then
        log "✅ ${agent_id} 的代码已推送到 GitHub"
        return 0
    else
        log "❌ ${agent_id} 推送失败"
        return 1
    fi
}

# Agent-File mapping for actual code implementation
declare -A AGENT_FILES
AGENT_FILES=(
    ["bob"]="server.js"
    ["henry"]="assets/js/office.js"
    ["carol"]="assets/css/style.css"
    ["david"]="server.js"
    ["eve"]="auto-optimize.sh"
    ["grace"]="api/skills.js"
    ["alice"]="index.html"
    ["frank"]="agents/personalities.json"
)

declare -A AGENT_FOCI
AGENT_FOCI=(
    ["bob"]="API路由和错误处理"
    ["henry"]="前端性能和DOM优化"
    ["carol"]="CSS变量和设计系统"
    ["david"]="安全加固和CORS配置"
    ["eve"]="输入验证和错误处理"
    ["grace"]="技能执行引擎"
    ["alice"]="用户体验和交互优化"
    ["frank"]="角色配置和系统提示"
)

log "🚀 虚拟办公室自动实施系统启动"
log "📅 每个角色将实际修改代码文件并推送到GitHub"

ROUND=0
while true; do
    ROUND=$((ROUND + 1))
    log "🔄 第 ${ROUND} 轮 - 代码实施"
    
    check_server
    
    # Pick next agent
    AGENTS=("bob" "henry" "carol" "david" "eve" "grace" "alice" "frank")
    INDEX=$(( (ROUND - 1) % 8 ))
    AGENT=${AGENTS[$INDEX]}
    FOCUS=${AGENT_FOCI[$AGENT]}
    TARGET_FILE=${AGENT_FILES[$AGENT]}
    
    log "👨‍💻 ${AGENT} 开始实施: ${FOCUS} → ${TARGET_FILE}"
    
    if [ ! -f "$TARGET_FILE" ]; then
        log "⚠️ 文件不存在: ${TARGET_FILE}, 跳过"
        sleep $POLL_INTERVAL
        continue
    fi
    
    # Read current file content
    FILE_CONTENT=$(cat "$TARGET_FILE")
    
    # Get agent's implementation
    RESPONSE=$(agent_implant "$AGENT" "$FOCUS" "$TARGET_FILE" "$FILE_CONTENT")
    
    # Extract and apply code changes
    if extract_and_apply "$AGENT" "$RESPONSE" "$TARGET_FILE"; then
        # Commit and push actual code
        commit_code_changes "$AGENT" "$FOCUS"
    else
        log "⚠️ ${AGENT} 未能生成可执行的代码修改，等待下一轮"
    fi
    
    log "⏰ 等待 ${POLL_INTERVAL} 秒..."
    sleep $POLL_INTERVAL
done
