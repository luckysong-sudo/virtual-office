/**
 * Auto-Implementation Orchestrator
 * Agents review code → generate patches → we apply them → commit & push
 * This ensures agents actually MODIFY SOURCE CODE, not just send text replies
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 9095;
const REPO_DIR = __dirname;
const API_URL = 'http://localhost:9094';

// Agent → file mapping for actual code implementation
const IMPLEMENTATION_ROSTER = [
    { agent: 'bob', file: 'server.js', focus: 'API路由效率和错误处理', desc: '优化API路由和错误处理逻辑' },
    { agent: 'henry', file: 'assets/js/office.js', focus: '前端性能和DOM优化', desc: '优化前端性能和DOM操作' },
    { agent: 'carol', file: 'assets/css/style.css', focus: 'CSS变量和设计系统', desc: '重构CSS变量和设计系统' },
    { agent: 'david', file: 'server.js', focus: '安全加固和CORS配置', desc: '加强服务器安全和CORS配置' },
    { agent: 'eve', file: 'auto-optimize.sh', focus: '输入验证和错误处理', desc: '增强输入验证和错误处理' },
    { agent: 'grace', file: 'api/skills.js', focus: '技能执行引擎优化', desc: '优化技能执行引擎' },
    { agent: 'alice', file: 'index.html', focus: '用户体验和交互优化', desc: '优化用户体验和交互' },
    { agent: 'frank', file: 'agents/personalities.json', focus: '角色配置和系统提示', desc: '优化角色配置和系统提示' },
];

let round = 0;

function log(msg) {
    const ts = new Date().toISOString().replace('T', ' ').split('.')[0];
    console.log(`[${ts}] ${msg}`);
}

function callAgnes(agentId, message) {
    return new Promise((resolve) => {
        const postData = JSON.stringify({
            agent_id: agentId,
            message: message
        });
        const options = {
            hostname: 'localhost',
            port: 9094,
            path: '/?endpoint=chat',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.reply || json.error || '无回复');
                } catch(e) {
                    resolve(data.substring(0, 200));
                }
            });
        });
        req.on('error', (e) => resolve(`API错误: ${e.message}`));
        req.write(postData);
        req.end();
    });
}

function readGitDiff() {
    try {
        return execSync('git diff --cached --stat', { cwd: REPO_DIR, encoding: 'utf-8' });
    } catch(e) {
        return '';
    }
}

function hasChanges() {
    try {
        execSync('git diff --cached --quiet', { cwd: REPO_DIR });
        return false;
    } catch(e) {
        return true;
    }
}

// Extract code blocks from agent response
function extractCodeBlocks(text) {
    const blocks = [];
    // Match ```lang ... ``` blocks
    const regex = /```(\w*)\n([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        blocks.push({ lang: match[1], code: match[2].trim() });
    }
    return blocks;
}

async function runRound() {
    round++;
    const roster = IMPLEMENTATION_ROSTER[(round - 1) % IMPLEMENTATION_ROSTER.length];
    const { agent, file, focus, desc } = roster;
    const filePath = path.join(REPO_DIR, file);
    
    log(`🔄 Round ${round}: ${agent} 实施优化 - ${desc}`);
    log(`📁 目标文件: ${file}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        log(`⚠️ 文件不存在: ${file}, 跳过`);
        return;
    }
    
    // Read current file
    const currentCode = fs.readFileSync(filePath, 'utf-8');
    
    // Build prompt asking agent to modify the actual code
    const prompt = `你是${agent}，${focus}专家。

请审查并修改以下代码文件。你必须：
1. 指出代码中的问题
2. 给出修改后的完整代码
3. 用代码块包裹修改后的代码（标记为 \`${file.endsWith('.js') ? 'javascript' : file.endsWith('.css') ? 'css' : file.endsWith('.json') ? 'json' : file.endsWith('.html') ? 'html' : 'plaintext'}\`）

当前代码:
\`\`\`${file.endsWith('.js') ? 'javascript' : file.endsWith('.css') ? 'css' : 'plaintext'}
${currentCode.substring(0, 3000)}
\`\`\`

请给出优化后的完整代码，确保可以直接替换原文件。用中文回答。`;

    // Get agent's response
    log(`🤖 正在请求 ${agent} 的代码修改...`);
    const response = await callAgnes(agent, prompt);
    
    // Extract code blocks from response
    const codeBlocks = extractCodeBlocks(response);
    
    if (codeBlocks.length > 0) {
        const newCode = codeBlocks[codeBlocks.length - 1].code;
        fs.writeFileSync(filePath, newCode);
        log(`✅ ${agent} 已修改 ${file} (${newCode.length} bytes)`);
        
        // Check if changes were actually made
        execSync('git add -A', { cwd: REPO_DIR });
        if (hasChanges()) {
            const diff = readGitDiff();
            execSync(`git commit -m "🔧 ${agent}: ${desc}"`, { cwd: REPO_DIR });
            try {
                execSync('git push', { cwd: REPO_DIR });
                log(`🚀 ${agent} 的代码已推送到 GitHub!`);
                log(`📊 变更统计:\n${diff}`);
            } catch(e) {
                log(`⚠️ 推送失败: ${e.message.substring(0, 100)}`);
            }
        } else {
            log(`⚠️ ${agent} 的修改未产生实际代码变更`);
        }
    } else {
        log(`⚠️ ${agent} 没有生成可执行的代码块，只生成了文本回复`);
        log(`💬 回复预览: ${response.substring(0, 200)}...`);
    }
}

// Start the orchestrator
log('🏢 虚拟办公室 - 自动代码实施系统启动');
log('📅 每5分钟一轮，8个角色轮流修改实际代码文件');
log('📊 所有代码变更自动推送到 GitHub');

// Run immediately, then every 5 minutes
(async () => {
    await runRound();
    setInterval(async () => {
        await runRound();
    }, 5 * 60 * 1000);
})();
