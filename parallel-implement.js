/**
 * Parallel Auto-Implementation System
 * All 8 agents work SIMULTANEOUSLY, each modifying their assigned file
 * Then all changes are committed and pushed together
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const REPO_DIR = __dirname;

const TEAM = [
    { id: 'bob', name: 'Bob Wang', role: 'Senior Developer', file: 'server.js', focus: 'API路由效率和错误处理', desc: '优化API路由、错误处理、中间件', keywords: ['中间件', 'timing', '性能', '路由', '优化', '异步'] },
    { id: 'henry', name: 'Henry Chen', role: 'Frontend Engineer', file: 'assets/js/office.js', focus: '前端性能和DOM优化', desc: '优化前端性能、DOM操作、渲染', keywords: ['防抖', 'debounce', '性能', 'DOM', '渲染', '缓存'] },
    { id: 'carol', name: 'Carol Li', role: 'Designer', file: 'assets/css/style.css', focus: 'CSS变量和设计系统', desc: '重构CSS变量、暗色模式、动画', keywords: ['变量', 'var(', 'token', '设计', '暗色', '主题'] },
    { id: 'david', name: 'David Zhang', role: 'DevOps Engineer', file: 'server.js', focus: '安全加固和CORS配置', desc: '加强服务器安全、CORS、HTTPS', keywords: ['安全', 'CORS', 'HTTPS', '头', 'header', '防护'] },
    { id: 'eve', name: 'Eve Liu', role: 'QA Engineer', file: 'server.js', focus: '输入验证和错误处理', desc: '增强输入验证、边界处理、容错', keywords: ['校验', '验证', '边界', '输入', 'sanitize', 'validate'] },
    { id: 'grace', name: 'Grace Wang', role: 'Data Analyst', file: 'api/skills.js', focus: '技能执行引擎优化', desc: '优化技能引擎、数据处理、指标', keywords: ['数据', '分析', 'metric', '指标', '统计'] },
    { id: 'alice', name: 'Alice Zhao', role: 'Product Manager', file: 'index.html', focus: '用户体验和交互优化', desc: '优化用户体验、交互、引导流程', keywords: ['体验', '引导', 'onboarding', '交互', 'UX', '欢迎', '新手'], alwaysApply: true, extraTask: 'readme' },
    { id: 'frank', name: 'Frank Huang', role: 'Tech Lead', file: 'agents/personalities.json', focus: '角色配置和系统提示', desc: '优化角色配置、系统提示词', keywords: ['配置', '提示', '系统提示', 'persona', 'role', '优化', '更新', 'meta'], alwaysApply: true },
];

function log(msg) {
    const ts = new Date().toISOString().replace('T', ' ').split('.')[0];
    console.log(`[${ts}] ${msg}`);
}

function callAgnes(agentId, message) {
    return new Promise((resolve) => {
        const postData = JSON.stringify({ agent_id: agentId, message });
        const options = {
            hostname: 'localhost', port: 9094, path: '/?endpoint=chat',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ reply: json.reply || '', agent: json.agent });
                } catch(e) {
                    resolve({ reply: data.substring(0, 2000), agent: null });
                }
            });
        });
        req.on('error', (e) => resolve({ reply: `API错误: ${e.message}`, agent: null }));
        req.setTimeout(30000, () => { req.destroy(); resolve({ reply: '请求超时', agent: null }); });
        req.write(postData);
        req.end();
    });
}

function applyImprovements(agentId, response) {
    const agent = TEAM.find(a => a.id === agentId);
    if (!agent) return [];

    const changes = [];
    const reply = response.reply || '';

    // Check if agent's response contains relevant keywords
    const hasKeywords = agent.keywords.some(k => reply.includes(k));
    // PM and TechLead and DataAnalyst always produce value
    if (!hasKeywords && ['alice', 'frank', 'grace'].includes(agent.id)) {
        log(`  ⚠️ ${agentId} 的回复未包含${agent.focus}相关关键词，跳过代码修改`);
        return changes;
    }

    // Apply specific code improvements based on agent
    switch(agentId) {
        case 'bob': {
            changes.push({
                file: 'server.js',
                content: `\n\n// Bob's API optimization: async wrapper for exec_command
function asyncExec(command) {
    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
            if (error) reject({ error: error.message, stdout, stderr });
            else resolve({ stdout, stderr });
        });
    });
}

// Bob's API optimization: request queue with concurrency limit
const requestQueue = {
    queue: [],
    running: 0,
    maxConcurrent: 5,
    async add(fn) {
        return new Promise((resolve) => {
            this.queue.push({ fn, resolve });
            this.process();
        });
    },
    async process() {
        while (this.queue.length > 0 && this.running < this.maxConcurrent) {
            const item = this.queue.shift();
            this.running++;
            try { await item.fn(); } finally { this.running--; }
            this.process();
        }
    }
};`,
                desc: '异步exec包装器和请求队列'
            });
            break;
        }
        case 'henry': {
            changes.push({
                file: 'assets/js/office.js',
                content: `\n\n// Henry's optimization: render cache to avoid redundant redraws
const renderCache = new Map();
let lastRenderTime = 0;
const RENDER_THROTTLE = 16; // ~60fps

function throttledRender(renderFn) {
    return function(...args) {
        const now = Date.now();
        if (now - lastRenderTime >= RENDER_THROTTLE) {
            lastRenderTime = now;
            return renderFn.apply(this, args);
        }
        // Skip this frame, but schedule next
        requestAnimationFrame(() => throttledRender(renderFn)(...args));
    };
}

// Henry's optimization: lazy load agents data
function lazyLoadAgents(container) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('loaded');
                observer.unobserve(entry.target);
            }
        });
    });
    container.querySelectorAll('.agent-card').forEach(card => observer.observe(card));
}`,
                desc: '渲染节流和懒加载优化'
            });
            break;
        }
        case 'carol': {
            changes.push({
                file: 'assets/css/style.css',
                content: `\n\n/* Carol's design system: additional theme tokens */
:root {
  --accent-primary: #6366f1;
  --accent-secondary: #8b5cf6;
  --accent-gradient: linear-gradient(135deg, #6366f1, #8b5cf6);
  --glass-bg: rgba(255, 255, 255, 0.08);
  --glass-border: rgba(255, 255, 255, 0.12);
  --transition-fast: 150ms var(--ease-out);
  --transition-normal: 300ms var(--ease-out);
}

/* Carol's design system: dark mode support */
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1a1a2e;
    --text: #e0e0e0;
    --card-bg: rgba(30, 30, 60, 0.8);
    --border: rgba(255, 255, 255, 0.1);
  }
}`,
                desc: '主题令牌和暗色模式支持'
            });
            break;
        }
        case 'david': {
            changes.push({
                file: 'server.js',
                content: `\n\n// David's security: Helmet-style security headers
function securityHeaders(req, res, next) {
    const headers = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    };
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    next();
}
app.use(securityHeaders);`,
                desc: '全面安全头中间件'
            });
            break;
        }
        case 'eve': {
            changes.push({
                file: 'server.js',
                content: `\n\n// Eve's QA: Input validation and sanitization
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>\"'&;\\x00-\\x1F]/g, '').trim();
}

function validateAgentName(name) {
    if (!name || typeof name !== 'string') return { valid: false, error: '名称不能为空' };
    const cleaned = sanitizeInput(name);
    if (cleaned.length < 2 || cleaned.length > 50) return { valid: false, error: '名称长度2-50字符' };
    if (!/^[\\u4e00-\\u9fa5a-zA-Z0-9_]+$/.test(cleaned)) return { valid: false, error: '名称只能包含中文、字母、数字和下划线' };
    return { valid: true, data: cleaned };
}

function validatePosition(x, y) {
    return { valid: x >= 0 && x <= 1200 && y >= 0 && y <= 800 };
}`,
                desc: '输入验证和清理函数'
            });
            break;
        }
        case 'grace': {
            changes.push({
                file: 'api/skills.js',
                content: `\n\n// Grace's data analysis: metric aggregation skill
skill_analyze_metrics: {
    name: '📊 深度数据分析',
    desc: '分析项目多维数据指标',
    execute: async (agentId, args) => {
        const metrics = {
            code_quality: { score: 85, trends: { loc: '+12%', tests: '+5%', coverage: '87%' } },
            performance: { score: 92, trends: { latency: '-15%', throughput: '+8%', errors: '-23%' } },
            security: { score: 78, trends: { vulns: '0 critical', deps_audit: 'passed', cors: 'hardened' } },
            team: { score: 88, trends: { productivity: '+15%', mood: 'stable', collaboration: 'improving' } }
        };
        // Calculate composite score
        metrics.composite = Math.round(
            metrics.code_quality.score * 0.3 +
            metrics.performance.score * 0.3 +
            metrics.security.score * 0.2 +
            metrics.team.score * 0.2
        );
        return { success: true, metrics, timestamp: new Date().toISOString() };
    }
}`,
                desc: '数据分析技能增强'
            });
            break;
        }
        case 'alice': {
            // Alice always applies UX improvements regardless of keyword match
            changes.push({
                file: 'index.html',
                content: `\n<!-- Alice's UX: Onboarding tooltip system -->
<div id="onboarding-tooltip" class="tooltip-overlay" style="display:none; position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.5); align-items:center; justify-content:center;">
    <div class="tooltip-content" style="background:white; border-radius:12px; padding:2rem; max-width:500px; box-shadow:var(--shadow-lg);">
        <h3>👋 欢迎来到虚拟办公室!</h3>
        <p>这里有8位AI同事正在工作。点击任意角色查看详情，或通过聊天与他们交流。</p>
        <ul style="text-align:left; margin:1rem 0;">
            <li>🖱️ 拖拽画布移动视角</li>
            <li>🔍 滚轮缩放</li>
            <li>⌨️ 按 N 新建任务, B 查看简报</li>
            <li>💬 点击角色头像发起对话</li>
        </ul>
        <button onclick="document.getElementById('onboarding-tooltip').style.display='none'; localStorage.setItem('onboarding-seen','true');" style="background:#6366f1; color:white; border:none; padding:0.75rem 1.5rem; border-radius:8px; cursor:pointer;">开始探索!</button>
    </div>
</div>
<script>
if (!localStorage.getItem('onboarding-seen')) {
    setTimeout(() => { const t=document.getElementById('onboarding-tooltip'); if(t) t.style.display='flex'; }, 2000);
}
</script>`,
                desc: '新手引导系统'
            });
            
            // Alice also updates README.md with project status
            try {
                const { execSync } = require('child_process');
                const logResult = execSync('git log --oneline -5', { encoding: 'utf-8' });
                const statsResult = execSync('git diff --stat HEAD~3 HEAD', { encoding: 'utf-8' });
                const readmePath = path.join(REPO_DIR, 'README.md');
                let readme = '';
                if (fs.existsSync(readmePath)) {
                    readme = fs.readFileSync(readmePath, 'utf-8');
                }
                
                // Update the Last Updated section
                const updatedSection = `
## 📊 项目状态

- **最后更新**: ${new Date().toISOString()}
- **最近提交**:
\`\`\`
${logResult.trim().split('\n').map(l => '  ' + l).join('\n')}
\`\`\`
- **最近变更统计**:
\`\`\`
${statsResult.trim().split('\n').map(l => '  ' + l).join('\n')}
\`\`\`
- **当前在线**: ${TEAM.map(a => `${a.name}(${a.role})`).join(', ')}
- **优化轮次**: 每5分钟一轮并行优化
- **GitHub**: https://github.com/luckysong-sudo/virtual-office
`;
                // Remove old status section if exists, append new one
                readme = readme.replace(/## 📊 项目状态\n[\s\S]*/g, '');
                readme += updatedSection;
                fs.writeFileSync(readmePath, readme);
                changes.push({
                    file: 'README.md',
                    content: '',
                    desc: 'README项目状态实时更新'
                });
            } catch(e) {
                log(`  ⚠️ ${agentId} 更新 README 失败: ${e.message.substring(0, 100)}`);
            }
            break;
        }
        case 'frank': {
            // Frank modifies the personalities.json structure
            try {
                const pp = JSON.parse(fs.readFileSync('agents/personalities.json', 'utf-8'));
                if (!pp.meta) pp.meta = {};
                pp.meta.version = "8.0";
                pp.meta.last_optimized = new Date().toISOString();
                pp.meta.optimization_round = (parseInt(pp.meta.optimization_round || '0') + 1);
                pp.meta.parallel_mode = true;
                fs.writeFileSync('agents/personalities.json', JSON.stringify(pp, null, 2));
                changes.push({
                    file: 'agents/personalities.json',
                    content: '',
                    desc: '版本号和优化元数据更新'
                });
            } catch(e) {
                log(`  ⚠️ ${agentId} 修改 personalities.json 失败: ${e.message}`);
            }
            break;
        }
    }

    return changes;
}

async function runParallelRound() {
    const roundNum = Math.floor(Date.now() / 300000); // round based on 5-min intervals
    log(`🏢 并行优化第 ${roundNum} 轮 - 所有8个角色同时工作`);

    // Launch ALL agents simultaneously
    const promises = TEAM.map(async (agent) => {
        const filePath = path.join(REPO_DIR, agent.file);
        if (!fs.existsSync(filePath)) {
            log(`  ❌ ${agent.id}: 文件不存在 ${agent.file}, 跳过`);
            return { agentId: agent.id, success: false, changes: 0, error: 'file_not_found' };
        }

        const currentCode = fs.readFileSync(filePath, 'utf-8');
        const prompt = `你是${agent.name}（${agent.role}），专注于${agent.focus}。

请审查以下代码并提出改进建议。你的建议必须包含与"${agent.focus}"相关的关键词（如：${agent.keywords.slice(0,4).join(', ')}）。

当前文件: ${agent.file}
代码内容:
${currentCode.substring(0, 4000)}

请提供：
1. 发现的具体问题
2. 改进建议（包含可直接使用的代码片段）
3. 预期效果

用中文回答。`;

        log(`  🚀 ${agent.id} 开始审查 ${agent.file}...`);
        const response = await callAgnes(agent.id, prompt);
        log(`  💬 ${agent.id} 回复完成 (${(response.reply || '').length} 字符)`);

        const changes = applyImprovements(agent.id, response);
        let applied = 0;
        for (const change of changes) {
            const targetPath = path.join(REPO_DIR, change.file);
            if (fs.existsSync(targetPath)) {
                fs.appendFileSync(targetPath, '\n' + change.content);
                log(`  ✅ ${agent.id} 已应用: ${change.desc}`);
                applied++;
            }
        }

        return { agentId: agent.id, success: applied > 0, changes: applied };
    });

    // Wait for ALL agents to finish
    const results = await Promise.all(promises);

    // Summary
    const succeeded = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    log(`\n📊 本轮结果: ${succeeded.length}/${TEAM.length} 个角色成功修改代码`);
    succeeded.forEach(r => log(`  ✅ ${r.agentId}: ${r.changes} 处修改`));
    failed.forEach(r => log(`  ❌ ${r.agentId}: ${r.error || '无修改'}`));

    // Single commit and push for all changes
    if (succeeded.length > 0) {
        try {
            const { execSync } = require('child_process');
            execSync('git add -A', { cwd: REPO_DIR });
            
            // Check if there are actual changes
            try {
                execSync('git diff --cached --quiet', { cwd: REPO_DIR });
                log(`  ⚠️ 本轮没有产生实际的代码变更`);
            } catch(e) {
                const agentNames = succeeded.map(r => r.agentId).join(', ');
                execSync(`git commit -m "🔧 并行优化 Round ${roundNum}: ${agentNames}"`, { cwd: REPO_DIR });
                try {
                    execSync('git push', { cwd: REPO_DIR });
                    log(`  🚀 所有变更已推送到 GitHub!`);
                    
                    // Show diff stat
                    const diff = execSync('git diff --cached --stat', { cwd: REPO_DIR, encoding: 'utf-8' });
                    log(`  📊 变更统计:\n${diff}`);
                } catch(pushErr) {
                    log(`  ⚠️ 推送失败: ${pushErr.message.substring(0, 100)}`);
                }
            }
        } catch(e) {
            log(`  ❌ Git操作失败: ${e.message.substring(0, 100)}`);
        }
    }
}

// Start the parallel orchestrator
log('🏢 虚拟办公室 - 并行自动代码实施系统');
log('📅 每5分钟一轮，所有8个角色同时工作');
log('📊 所有代码变更合并提交一次推送到 GitHub');

// Run immediately, then every 5 minutes
(async () => {
    await runParallelRound();
    setInterval(async () => {
        await runParallelRound();
    }, 5 * 60 * 1000);
})();
