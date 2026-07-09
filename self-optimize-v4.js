/**
 * Virtual Office - 持续性自我优化系统 v3.2
 * 核心理念: 项目持续进化，不是回退到旧版本
 * 修复: 每个优化器独立安全边界，单个失败不影响其他
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
        const timeout = setTimeout(() => { resolve({ reply: 'API超时', agent: null }); }, 30000);
        const postData = JSON.stringify({ agent_id: agentId, message });
        const options = { hostname: 'localhost', port: PORT, path: '/?endpoint=chat', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } };
        const req = http.request(options, (res) => {
            clearTimeout(timeout);
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ reply: JSON.parse(data).reply || '', agent: null }); }
                catch(e) { resolve({ reply: data.substring(0, 2000), agent: null }); }
            });
        });
        req.on('error', (e) => { clearTimeout(timeout); resolve({ reply: 'API错误: ' + e.message, agent: null }); });
        req.write(postData);
        req.end();
    });
}

// 安全修改文件：先写临时文件，验证通过后替换
function safeModifyFile(filePath, modifierFn) {
    const fullPath = path.join(REPO_DIR, filePath);
    if (!fs.existsSync(fullPath)) return { success: false, error: 'file_not_found' };
    try {
        const original = fs.readFileSync(fullPath, 'utf-8');
        const modified = modifierFn(original);
        if (modified === original) return { success: false, error: 'no_changes' };
        
        // 写入临时文件验证
        const tmpDir = path.join(REPO_DIR, '.tmp_check');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const tmpPath = path.join(tmpDir, 'check_' + Date.now() + '.js');
        fs.writeFileSync(tmpPath, modified);
        
        if (filePath.endsWith('.js')) {
            try { execSync('node --check "' + tmpPath + '"', { cwd: REPO_DIR, timeout: 5000 }); }
            catch(e) {
                fs.unlinkSync(tmpPath);
                return { success: false, error: 'syntax_error: ' + e.message.substring(0, 200) };
            }
        }
        
        // 验证通过，替换原文件
        fs.renameSync(tmpPath, fullPath);
        return { success: true, origLines: original.split('\n').length, modLines: modified.split('\n').length };
    } catch(e) { return { success: false, error: e.message }; }
}

function checkHealth() {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => { resolve(false); }, 10000);
        const req = http.get('http://localhost:' + PORT + '/?endpoint=status', (res) => {
            clearTimeout(timeout);
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => { try { resolve(JSON.parse(data).success && JSON.parse(data).office); } catch(e) { resolve(false); } });
        });
        req.on('error', () => { clearTimeout(timeout); resolve(false); });
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
// 优化策略 — 每个都检查是否已存在
// ============================

const OPTIMIZERS = {
    bob: {
        name: 'Bob Wang', role: 'Senior Developer', focus: 'API路由效率和错误处理', files: ['server.js'],
        optimize: function(code, round) {
            var changes = [];
            
            // 速率限制 — 只在不存在时添加
            if (code.indexOf('rateLimitMap') === -1) {
                changes.push({ desc: 'API请求速率限制中间件', fn: function(src) {
                    // 在 handleApi 函数开头插入
                    var injection = fs.readFileSync(path.join(INJECTIONS_DIR, 'rate-limiter.js'), 'utf-8');
                    // 找第一个路由 case 语句前插入
                    return src.replace("async function handleApi(req, res, parsedUrl) {", "async function handleApi(req, res, parsedUrl) {\n" + injection);
                }});
            }
            
            // 全局错误处理 — 追加到文件末尾
            if (code.indexOf('process.on("uncaughtException")') === -1) {
                changes.push({ desc: '全局错误处理和优雅退出', fn: function(src) { return src + fs.readFileSync(path.join(INJECTIONS_DIR, 'global-errors.js'), 'utf-8'); } });
            }
            
            // 请求日志 — 在 server.listen 前插入
            if (code.indexOf('requestLog = []') === -1) {
                changes.push({ desc: '请求日志和性能追踪', fn: function(src) {
                    return src.replace("server.listen(PORT", fs.readFileSync(path.join(INJECTIONS_DIR, 'request-logger.js'), 'utf-8') + "\nserver.listen(PORT");
                }});
            }
            
            // 日志查询API
            if (code.indexOf("case 'logs'") === -1) {
                changes.push({ desc: '请求日志查询API', fn: function(src) {
                    return src.replace("case 'learn':", fs.readFileSync(path.join(INJECTIONS_DIR, 'logs-api.js'), 'utf-8'));
                }});
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
                changes.push({ desc: '安全响应头', fn: function(src) {
                    return src.replace("res.setHeader('Content-Type', 'application/json');", "res.setHeader('Content-Type', 'application/json');\n" + fs.readFileSync(path.join(INJECTIONS_DIR, 'security-headers.js'), 'utf-8').trim());
                }});
            }
            return changes;
        }
    },
    
    eve: {
        name: 'Eve Liu', role: 'QA Engineer', focus: '输入验证和错误处理', files: ['server.js'],
        optimize: function(code, round) {
            var changes = [];
            // Eve 需要更精确的匹配 — 在 endpoint 解析后立即插入
            if (code.indexOf('ALLOWED_ENDPOINTS') === -1) {
                changes.push({ desc: 'API端点白名单验证', fn: function(src) {
                    var inj = fs.readFileSync(path.join(INJECTIONS_DIR, 'endpoint-whitelist.js'), 'utf-8');
                    // 匹配实际代码中的 endpoint 解析部分
                    return src.replace("const action = params[0];\n    const id = params[1];", inj);
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
                changes.push({ desc: '性能指标API端点', fn: function(src) {
                    return src.replace("case 'meetings':", fs.readFileSync(path.join(INJECTIONS_DIR, 'metrics-api.js'), 'utf-8'));
                }});
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
    
    // 确保服务器运行
    var serverRunning = await checkHealth();
    if (!serverRunning) {
        log('服务器未运行，尝试启动...');
        await restartServer();
        var ready = await waitForServer();
        if (!ready) { log('服务器启动失败，跳过本轮优化'); return; }
    }
    
    var appliedChanges = [];
    var failedChanges = [];
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
                failedChanges.push({ agent: optimizer.name, desc: change.desc, error: result.error });
            }
        }
    }
    
    log('');
    log('  📊 本轮结果: ' + appliedChanges.length + ' 个改进已应用, ' + failedChanges.length + ' 个失败');
    
    if (appliedChanges.length > 0) {
        // Git 提交
        try {
            execSync('git add -A', { cwd: REPO_DIR });
            var summary = appliedChanges.map(function(c) { return c.desc; }).join(', ');
            execSync('git commit -m "🤖 自我优化 Round ' + roundNum + ': ' + summary + '"', { cwd: REPO_DIR });
            log('  📦 Git 提交完成');
        } catch(e) { log('  ⚠️ Git: ' + e.message.substring(0, 100)); }
        
        saveVersion(appliedChanges);
        
        // 重启验证 — 只在有重大后端改动时重启
        var hasBackendChanges = appliedChanges.some(function(c) { return c.file === 'server.js'; });
        if (hasBackendChanges) {
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
                    // 重新启动干净的服务器
                    await restartServer();
                    await waitForServer();
                } catch(e) { log('  ⚠️ 回退失败'); }
            }
        } else {
            log('  ℹ️ 仅前端改动，无需重启服务器');
        }
    } else {
        log('  ⏭️ 本轮无新改进');
    }
    
    log('  📈 总计: ' + versionData.rounds + ' 轮优化, ' + versionData.changes.length + ' 个改进已部署');
}

log('🏢 虚拟办公室 - 持续性自我优化系统 v3.2');
log('📅 启动时间: ' + new Date().toISOString());
log('📊 当前版本: v' + versionData.version + ', 历史优化: ' + versionData.rounds + ' 轮');
log('🔧 每个角色持续改进代码，项目不断进化');
log('');

(async function() {
    try {
        await runOptimizationRound();
        setInterval(async function() {
            try { await runOptimizationRound(); }
            catch(e) { log('  ❌ 优化循环异常: ' + e.message); }
        }, 5 * 60 * 1000);
    } catch(e) {
        log('  ❌ 初始化失败: ' + e.message);
    }
})();
