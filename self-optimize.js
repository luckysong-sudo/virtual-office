/**
 * Virtual Office - 持续性自我优化系统 v3.0
 * 核心理念: 项目持续进化，不是回退到旧版本
 * 流程: 审查 -> 安全修改 -> 语法验证 -> 提交 -> 重启 -> 健康检查
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_DIR = __dirname;
const PORT = 9094;
const INJECTIONS_DIR = path.join(REPO_DIR, 'injections');
const HISTORY_DIR = path.join(REPO_DIR, '.optimization_history');
const VERSION_FILE = path.join(HISTORY_DIR, 'version.json');

fs.mkdirSync(HISTORY_DIR, { recursive: true });

let versionData;
if (fs.existsSync(VERSION_FILE)) {
    versionData = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf-8'));
} else {
    versionData = { version: 1, rounds: 0, lastOptimized: null, changes: [] };
}

function log(msg) {
    console.log('[' + new Date().toISOString().replace('T',' ').split('.')[0] + '] ' + msg);
}

function saveVersion(changes) {
    versionData.rounds++;
    versionData.lastOptimized = new Date().toISOString();
    versionData.changes.push({ round: versionData.rounds, timestamp: versionData.lastOptimized, changes: changes, version: versionData.version++ });
    fs.writeFileSync(VERSION_FILE, JSON.stringify(versionData, null, 2));
}

function callAgnes(agentId, message) {
    return new Promise((resolve) => {
        const postData = JSON.stringify({ agent_id: agentId, message });
        const options = { hostname: 'localhost', port: PORT, path: '/?endpoint=chat', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ reply: JSON.parse(data).reply || '', agent: null }); }
                catch(e) { resolve({ reply: data.substring(0, 2000), agent: null }); }
            });
        });
        req.on('error', (e) => resolve({ reply: 'API错误: ' + e.message, agent: null }));
        req.setTimeout(30000, () => { req.destroy(); resolve({ reply: '请求超时', agent: null }); });
        req.write(postData);
        req.end();
    });
}

function safeModifyFile(filePath, modifierFn) {
    const fullPath = path.join(REPO_DIR, filePath);
    if (!fs.existsSync(fullPath)) return { success: false, error: 'file_not_found' };
    try {
        const original = fs.readFileSync(fullPath, 'utf-8');
        const modified = modifierFn(original);
        if (modified === original) return { success: false, error: 'no_changes' };
        fs.writeFileSync(fullPath, modified);
        if (filePath.endsWith('.js')) {
            try { execSync('node --check "' + fullPath + '"', { cwd: REPO_DIR, timeout: 5000 }); }
            catch(e) { fs.writeFileSync(fullPath, original); return { success: false, error: 'syntax_error: ' + e.message.substring(0, 200) }; }
        }
        return { success: true, origLines: original.split('\n').length, modLines: modified.split('\n').length };
    } catch(e) { return { success: false, error: e.message }; }
}

function checkHealth() {
    return new Promise((resolve) => {
        const req = http.get('http://localhost:' + PORT + '/?endpoint=status', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => { try { resolve(JSON.parse(data).success && JSON.parse(data).office); } catch(e) { resolve(false); } });
        });
        req.on('error', () => resolve(false));
        req.setTimeout(10000, () => { req.destroy(); resolve(false); });
    });
}

function restartServer() {
    return new Promise((resolve) => {
        try { execSync('pkill -f "node.*server\\.js" 2>/dev/null || true', { cwd: REPO_DIR, timeout: 5000 }); } catch(e) {}
        setTimeout(() => {
            try { execSync('PORT=' + PORT + ' node server.js > ' + path.join(REPO_DIR, 'server_new.log') + ' 2>&1 &', { cwd: REPO_DIR }); } catch(e) {}
            log('  [RESTART] 服务器已重启');
            resolve(true);
        }, 2000);
    });
}

function waitForServer(maxWait) {
    maxWait = maxWait || 15000;
    return new Promise((resolve) => {
        const start = Date.now();
        const check = setInterval(async () => {
            if (await checkHealth()) { clearInterval(check); resolve(true); }
            else if (Date.now() - start > maxWait) { clearInterval(check); resolve(false); }
        }, 2000);
    });
}

// ============================
// 优化策略 - 使用独立注入文件避免转义问题
// ============================

const OPTIMIZERS = {
    bob: {
        name: 'Bob Wang', role: 'Senior Developer', focus: 'API路由效率和错误处理', files: ['server.js'],
        optimize: function(code, round) {
            var changes = [];
            var inj = function(file, marker) {
                return fs.readFileSync(path.join(INJECTIONS_DIR, file), 'utf-8');
            };
            
            if (code.indexOf('rateLimitMap') === -1) {
                changes.push({ desc: 'API请求速率限制中间件', fn: function(src) { return src.replace('// Handle API requests', inj('rate-limiter.js') + '\n\n' + src.split('// Handle API requests')[1] || src); } });
            }
            if (code.indexOf('process.on("uncaughtException")') === -1) {
                changes.push({ desc: '全局错误处理和优雅退出', fn: function(src) { return src + inj('global-errors.js'); } });
            }
            if (code.indexOf('requestLogger') === -1) {
                changes.push({ desc: '请求日志和性能追踪', fn: function(src) { return src.replace('server.listen(PORT', inj('request-logger.js') + '\n\nserver.listen(PORT'); } });
            }
            if (code.indexOf("case 'logs'") === -1) {
                changes.push({ desc: '请求日志查询API', fn: function(src) { return src.replace("case 'learn':", inj('logs-api.js')); } });
            }
            return changes;
        }
    },
    
    henry: {
        name: 'Henry Xu', role: 'Frontend Developer', focus: '前端性能和DOM优化', files: ['index.html'],
        optimize: function(code, round) {
            var changes = [];
            if (code.indexOf('Ctrl+K') === -1) {
                changes.push({ desc: '键盘快捷键系统', fn: function(src) { return src.replace('</body>', '\n<script>\ndocument.addEventListener("keydown", function(e) {\n    if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); var si=document.getElementById("searchInput"); if(si)si.focus(); }\n    if (e.key === "Escape") { document.querySelectorAll(".modal").forEach(function(el){el.style.display="none";}); }\n});\n</script>\n</body>'); } });
            }
            if (code.indexOf('page-loader') === -1) {
                changes.push({ desc: '页面加载动画', fn: function(src) { return src.replace('<body>', '<div id="page-loader" style="position:fixed;inset:0;background:#f0f4f8;display:flex;align-items:center;justify-content:center;z-index:9999;font-size:3rem;">🏢</div>\n<script>setTimeout(function(){var l=document.getElementById("page-loader");if(l){l.style.opacity="0";setTimeout(function(){l.remove()},300);}},500);</script>\n<body>'); } });
            }
            return changes;
        }
    },
    
    carol: {
        name: 'Carol Li', role: 'UI/UX Designer', focus: 'CSS和设计系统优化', files: ['assets/css/style.css'],
        optimize: function(code, round) {
            var changes = [];
            if (code.indexOf('--accent-primary') === -1) {
                changes.push({ desc: 'CSS设计令牌和暗色模式', fn: function(src) { return src + fs.readFileSync(path.join(INJECTIONS_DIR, 'css-tokens.css'), 'utf-8'); } });
            }
            return changes;
        }
    },
    
    david: {
        name: 'David Zhang', role: 'DevOps Engineer', focus: '安全加固和部署优化', files: ['server.js'],
        optimize: function(code, round) {
            var changes = [];
            if (code.indexOf('X-Content-Type-Options') === -1) {
                changes.push({ desc: '安全响应头', fn: function(src) { return src.replace("res.setHeader('Content-Type', 'application/json');", "res.setHeader('Content-Type', 'application/json');\n" + fs.readFileSync(path.join(INJECTIONS_DIR, 'security-headers.js'), 'utf-8').trim()); } });
            }
            return changes;
        }
    },
    
    eve: {
        name: 'Eve Liu', role: 'QA Engineer', focus: '输入验证和错误处理', files: ['server.js'],
        optimize: function(code, round) {
            var changes = [];
            if (code.indexOf('ALLOWED_ENDPOINTS') === -1) {
                changes.push({ desc: 'API端点白名单验证', fn: function(src) {
                    var inj = fs.readFileSync(path.join(INJECTIONS_DIR, 'endpoint-whitelist.js'), 'utf-8');
                    // Insert after endpoint parsing but before action/id extraction
                    return src.replace('const action = params[0];\n    const id = params[1];', inj);
                }});
            }
            return changes;
        }
    },
    
    grace: {
        name: 'Grace Zhao', role: 'Data Scientist', focus: '数据分析和性能监控', files: ['server.js'],
        optimize: function(code, round) {
            var changes = [];
            if (code.indexOf("case 'metrics'") === -1) {
                changes.push({ desc: '性能指标API端点', fn: function(src) { return src.replace("case 'meetings':", fs.readFileSync(path.join(INJECTIONS_DIR, 'metrics-api.js'), 'utf-8')); } });
            }
            return changes;
        }
    },
    
    alice: {
        name: 'Alice Chen', role: 'Product Manager', focus: '用户体验和功能发现', files: ['index.html'],
        optimize: function(code, round) {
            var changes = [];
            var obFile = path.join(REPO_DIR, 'onboarding.html');
            if (fs.existsSync(obFile) && code.indexOf('onboarding-flow') === -1) {
                changes.push({ desc: '新用户引导流程', fn: function(src) { return src.replace('<footer class="footer">', fs.readFileSync(obFile, 'utf-8')); } });
            }
            return changes;
        }
    },
    
    frank: {
        name: 'Frank Wu', role: 'Tech Lead', focus: '架构设计和代码质量', files: ['agents/personalities.json'],
        optimize: function(code, round) {
            var changes = [];
            changes.push({ desc: '更新版本元数据', fn: function(src) {
                try {
                    var data = JSON.parse(src);
                    if (!data.meta) data.meta = {};
                    data.meta.version = String((parseInt(data.meta.version || '1') + 1));
                    data.meta.last_optimized = new Date().toISOString();
                    data.meta.optimization_round = versionData.rounds;
                    data.meta.self_optimizing = true;
                    return JSON.stringify(data, null, 2);
                } catch(e) { return src; }
            }});
            return changes;
        }
    }
};

// ============================
// 执行一轮优化
// ============================
async function runOptimizationRound() {
    var roundNum = versionData.rounds + 1;
    log('');
    log('=== 自我优化第 ' + roundNum + ' 轮 (版本 v' + versionData.version + ') ===');
    
    var serverRunning = await checkHealth();
    if (!serverRunning) {
        log('服务器未运行，尝试启动...');
        await restartServer();
        var ready = await waitForServer();
        if (!ready) { log('服务器启动失败，跳过本轮优化'); return; }
    }
    
    var appliedChanges = [];
    var skippedChanges = [];
    var agentIds = ['bob', 'henry', 'carol', 'david', 'eve', 'grace', 'alice', 'frank'];
    
    for (var idx = 0; idx < agentIds.length; idx++) {
        var agentId = agentIds[idx];
        var optimizer = OPTIMIZERS[agentId];
        if (!optimizer) continue;
        
        log('');
        log('  👨‍💻 ' + optimizer.name + ' (' + optimizer.role + ') - ' + optimizer.focus);
        
        var filePath = optimizer.files[0];
        var fullPath = path.join(REPO_DIR, filePath);
        if (!fs.existsSync(fullPath)) {
            log('  [SKIP] 文件不存在: ' + filePath);
            skippedChanges.push({ agent: optimizer.name, reason: 'file_not_found' });
            continue;
        }
        
        var currentCode = fs.readFileSync(fullPath, 'utf-8');
        
        // 获取agent建议
        try {
            var prompt = '你是' + optimizer.name + '（' + optimizer.role + '），专注于' + optimizer.focus + '。当前文件: ' + filePath + ' (' + currentCode.split('\n').length + '行)。请审查代码并提出改进建议。用中文回答，100字以内。';
            var response = await callAgnes(agentId, prompt);
            log('  💬 ' + (response.reply || '').substring(0, 100));
        } catch(e) { log('  ⚠️ 获取建议失败: ' + e.message); }
        
        // 应用优化
        var potentialChanges = optimizer.optimize(currentCode, roundNum);
        log('  🔧 ' + potentialChanges.length + ' 个改进方案');
        
        for (var ci = 0; ci < potentialChanges.length; ci++) {
            var change = potentialChanges[ci];
            var result = safeModifyFile(filePath, change.fn);
            
            if (result.success) {
                log('  ✅ 已应用: ' + change.desc + ' (' + result.origLines + '→' + result.modLines + ' 行)');
                appliedChanges.push({ agent: optimizer.name, file: filePath, desc: change.desc, linesChanged: result.modLines - result.origLines });
            } else if (result.error === 'no_changes') {
                log('  ⏭️ 跳过: ' + change.desc + ' (已存在)');
            } else {
                log('  ❌ 失败: ' + change.desc + ' - ' + result.error.substring(0, 100));
            }
        }
    }
    
    log('');
    log('  📊 本轮结果: ' + appliedChanges.length + ' 个改进已应用, ' + skippedChanges.length + ' 个跳过');
    
    if (appliedChanges.length > 0) {
        try {
            execSync('git add -A', { cwd: REPO_DIR });
            var summary = appliedChanges.map(function(c) { return c.desc; }).join(', ');
            execSync('git commit -m "🤖 自我优化 Round ' + roundNum + ': ' + summary + '"', { cwd: REPO_DIR });
            log('  📦 Git 提交完成');
        } catch(e) { log('  ⚠️ Git: ' + e.message.substring(0, 100)); }
        
        saveVersion(appliedChanges);
        
        log('  🔄 重启服务器验证...');
        await restartServer();
        var restarted = await waitForServer();
        
        if (restarted) {
            log('  ✅ 服务器重启成功! 新版本 v' + versionData.version);
        } else {
            log('  ❌ 服务器重启失败! 回退修改...');
            try {
                execSync('git reset --hard HEAD~1', { cwd: REPO_DIR });
                log('  ↩️ 已回退到上一版本');
            } catch(e) { log('  ⚠️ 回退失败'); }
        }
    }
    
    log('  📈 总计: ' + versionData.rounds + ' 轮优化, ' + versionData.changes.length + ' 个改进已部署');
}

log('🏢 虚拟办公室 - 持续性自我优化系统 v3.0');
log('📅 启动时间: ' + new Date().toISOString());
log('📊 初始版本: v' + versionData.version + ', 历史优化: ' + versionData.rounds + ' 轮');
log('🔧 每个角色持续改进代码，项目不断进化');
log('');

(async function() {
    await runOptimizationRound();
    setInterval(async function() { await runOptimizationRound(); }, 5 * 60 * 1000);
})();
