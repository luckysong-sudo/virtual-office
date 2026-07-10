/**
 * Virtual Office - 持续性自我优化系统 v5.0 (Idempotent State Machine)
 * 
 * 升级:
 *   1. 幂等性校验器 — 每个 injector 使用唯一 marker，Check-Before-Apply
 *   2. 变更摘要过滤 — 全部 no-op 时跳过 git commit + restart
 *   3. Agent 知识库缓存 — 已知 patch 不调用 callAgnes
 * 
 * 状态机:
 *   IDLE -> REVIEWING -> APPLYING -> COMMITTING -> RESTARTING -> VERIFYING -> IDLE
 *     |         |           |            |            |            |
 *     |         v           v            |            |            |
 *     |     ROLLBACK <- FAILURE <- FAILURE <- FAILURE <- FAILURE
 *     |         |
 *     +---- TIMEOUT -> IDLE
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

// ============================
// 状态机
// ============================

const STATES = {
    IDLE: 'IDLE', REVIEWING: 'REVIEWING', APPLYING: 'APPLYING',
    COMMITTING: 'COMMITTING', RESTARTING: 'RESTARTING',
    VERIFYING: 'VERIFYING', ROLLBACK: 'ROLLBACK', ERROR: 'ERROR'
};

var fsm = {
    currentState: STATES.IDLE,
    roundNum: 0,
    pendingChanges: [],
    patchBranch: 'patch-in-progress',
    restartLock: false,
    consecutiveFailures: 0,
    lastError: null
};

var versionData;
if (fs.existsSync(VERSION_FILE)) {
    versionData = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf-8'));
} else {
    versionData = { version: 1, rounds: 0, lastOptimized: null, changes: [] };
}

// ============================
// 工具函数
// ============================

function log(msg) {
    var ts = new Date().toISOString().replace('T',' ').split('.')[0];
    console.log('[' + ts + '] ' + msg);
}

function getStateLabel() {
    return '  [STATE:' + fsm.currentState + ' lock:' + fsm.restartLock + ']';
}

function saveVersion(changes) {
    versionData.rounds++;
    versionData.lastOptimized = new Date().toISOString();
    versionData.changes.push({
        round: versionData.rounds,
        timestamp: versionData.lastOptimized,
        changes: changes,
        version: versionData.version++,
        state: fsm.currentState
    });
    fs.writeFileSync(VERSION_FILE, JSON.stringify(versionData, null, 2));
    // 优化完成后自动同步到 GitHub
    syncToGitHub(changes);
}

function syncToGitHub(changes) {
    var readmePath = path.join(REPO_DIR, 'README.md');
    if (!fs.existsSync(readmePath)) return;
    
    var readme = fs.readFileSync(readmePath, 'utf-8');
    var modified = false;
    var now = new Date().toISOString().replace('T',' ').split('.')[0] + '+08:00';
    
    // 1. 更新版本号和最后更新时间
    var newHeader = '**状态**: 🟢 在线运行 | **版本**: v' + versionData.version + ' | **最后更新**: ' + now;
    var oldHeaderMatch = readme.match(/\*\*状态\*\*.*\| \*\*最后更新\*\*: .*/);
    if (oldHeaderMatch) {
        readme = readme.replace(oldHeaderMatch[0], newHeader);
        modified = true;
    }
    
    // 2. 更新优化轮次
    var newRounds = '自优化轮次 | ' + versionData.rounds;
    var oldRoundsMatch = readme.match(/(自优化轮次 \| )\d+/);
    if (oldRoundsMatch) {
        readme = readme.replace(oldRoundsMatch[0], newRounds);
        modified = true;
    }
    
    // 3. 更新累计变更
    var changeCount = changes && changes.length ? changes.length + ' 项' : '0 项';
    var newChanges = '累计变更 | ' + changeCount;
    var oldChangesMatch = readme.match(/(累计变更 \| ).*/);
    if (oldChangesMatch) {
        readme = readme.replace(oldChangesMatch[0], newChanges);
        modified = true;
    }
    
    if (!modified) {
        log('  📝 README 内容无需更新');
        return;
    }
    
    // 4. 写入更新后的 README
    fs.writeFileSync(readmePath, readme);
    
    // 5. git add + commit + push
    try {
        execSync('git add -A', { cwd: REPO_DIR, timeout: 5000 });
        var diffResult;
        try {
            diffResult = execSync('git diff --cached --quiet 2>&1 || echo CHANGES', { cwd: REPO_DIR, encoding: 'utf-8' }).trim();
        } catch(ex) { diffResult = 'CHANGES'; }
        
        if (diffResult === 'CHANGES') {
            execSync('git commit -m "📝 自动同步: 优化第 ' + versionData.rounds + ' 轮"', 
                { cwd: REPO_DIR, timeout: 10000 });
        }
        execSync('git push origin main', { cwd: REPO_DIR, timeout: 30000 });
        log('  🚀 README 已自动同步到 GitHub');
    } catch(e) {
        log('  ⚠️ GitHub 同步失败: ' + (e.message || '').substring(0, 100));
    }
}

function getStatusFromServer(callback) {
    var req = http.get('http://localhost:' + PORT + '/?endpoint=status', function(res) {
        var data = '';
        res.on('data', function(chunk) { data += chunk; });
        res.on('end', function() {
            try {
                callback(JSON.parse(data));
            } catch(e) {
                callback(null);
            }
        });
    });
    req.on('error', function() { callback(null); });
    req.setTimeout(3000, function() { req.abort(); callback(null); });
}

// ============================
// Agent 知识库
// ============================

var knowledgeCache = { agents: {} };

function loadKnowledge() {
    try {
        var kf = path.join(REPO_DIR, 'knowledge.json');
        if (fs.existsSync(kf)) {
            knowledgeCache = JSON.parse(fs.readFileSync(kf, 'utf-8'));
        }
    } catch(e) {}
}

function recordPatch(agentId, marker, description, applied) {
    if (!knowledgeCache.agents[agentId]) knowledgeCache.agents[agentId] = { patches: [] };
    knowledgeCache.agents[agentId].patches.push({
        marker: marker, description: description, applied: applied,
        timestamp: new Date().toISOString()
    });
    try {
        fs.writeFileSync(path.join(REPO_DIR, 'knowledge.json'), JSON.stringify(knowledgeCache, null, 2));
    } catch(e) {}
}

function isKnownPatch(agentId, marker) {
    var patches = (knowledgeCache.agents[agentId] || {}).patches || [];
    return patches.some(function(p) { return p.marker === marker && p.applied; });
}

function getAgentSuggestions(agentId, filePath, lineCount) {
    // 如果该 agent 的所有 patch 都已知，跳过 callAgnes
    var agentPatches = (knowledgeCache.agents[agentId] || {}).patches || [];
    var allKnown = agentPatches.length > 0 && agentPatches.every(function(p) { return p.applied !== undefined; });
    
    if (allKnown && agentPatches.length >= 5) {
        return null; // 跳过 API 调用
    }
    
    return callAgnes(agentId, '你是 ' + agentId + '。文件: ' + filePath + ' (' + lineCount + '行)。请审查代码并提出 1-2 个具体的改进建议。100字以内。');
}

function callAgnes(agentId, message) {
    return new Promise((resolve) => {
        var timeout = setTimeout(function() {
            resolve({ reply: 'API超时 (30s)', agent: null });
        }, 30000);
        var postData = JSON.stringify({ agent_id: agentId, message });
        var options = {
            hostname: 'localhost', port: PORT,
            path: '/?endpoint=chat', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
        };
        var req = http.request(options, function(res) {
            clearTimeout(timeout);
            var data = '';
            res.on('data', function(chunk) { data += chunk; });
            res.on('end', function() {
                try { resolve({ reply: JSON.parse(data).reply || '', agent: null }); }
                catch(e) { resolve({ reply: data.substring(0, 2000), agent: null }); }
            });
        });
        req.on('error', function(e) { clearTimeout(timeout); resolve({ reply: 'API错误: ' + e.message, agent: null }); });
        req.write(postData);
        req.end();
    });
}

// ============================
// 幂等性校验器
// ============================

function checkMarkerExists(content, marker) {
    return content.indexOf(marker) !== -1;
}

function validateAndApply(filePath, descriptor) {
    /**
     * descriptor = { marker, description, patchFn(originalCode) }
     * returns { success, applied, origLines?, modLines?, error?, reason? }
     */
    var fullPath = path.join(REPO_DIR, filePath);
    if (!fs.existsSync(fullPath)) {
        return { success: false, applied: false, error: 'file_not_found' };
    }
    
    var original = fs.readFileSync(fullPath, 'utf-8');
    
    // Step 1: 幂等性检查
    if (checkMarkerExists(original, descriptor.marker)) {
        return { success: true, applied: false, reason: 'marker_exists', marker: descriptor.marker };
    }
    
    // Step 2: 应用变更
    var modified = descriptor.patchFn(original);
    if (!modified || modified === original) {
        return { success: true, applied: false, reason: 'no_effect' };
    }
    
    // Step 3: 临时文件验证
    var tmpDir = path.join(REPO_DIR, '.tmp_check');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    var tmpPath = path.join(tmpDir, 'check_' + Date.now() + '.js');
    fs.writeFileSync(tmpPath, modified);
    
    // Step 4: 语法验证
    if (filePath.endsWith('.js')) {
        try {
            execSync('node --check "' + tmpPath + '"', { cwd: REPO_DIR, timeout: 5000 });
        } catch(e) {
            try { fs.unlinkSync(tmpPath); } catch(ex) {}
            return { success: false, applied: false, error: 'syntax_error: ' + e.message.substring(0, 200) };
        }
    }
    
    // Step 5: 替换
    fs.renameSync(tmpPath, fullPath);
    
    return {
        success: true, applied: true,
        origLines: original.split('\n').length,
        modLines: modified.split('\n').length,
        marker: descriptor.marker,
        description: descriptor.description
    };
}

// ============================
// 健康检查 — 指数退避
// ============================

function checkServerStatus() {
    return new Promise((resolve) => {
        var maxRetries = 5;
        var baseDelay = 2000;
        var attempt = 0;
        
        function tryCheck() {
            attempt++;
            var delay = baseDelay * Math.pow(2, attempt - 1);
            log('  🔍 健康检查 #' + attempt + '/' + maxRetries + ' (等待 ' + (delay/1000) + 's)...');
            
            var timeout = setTimeout(function() {
                log('  ❌ 健康检查 #' + attempt + ' 超时');
                if (attempt >= maxRetries) resolve(false);
                else setTimeout(tryCheck, delay);
            }, 10000);
            
            var req = http.get('http://localhost:' + PORT + '/?endpoint=status', function(res) {
                clearTimeout(timeout);
                var data = '';
                res.on('data', function(chunk) { data += chunk; });
                res.on('end', function() {
                    try {
                        var json = JSON.parse(data);
                        if (json.success && json.office) {
                            log('  ✅ 健康检查 #' + attempt + ' 通过!');
                            resolve(true);
                        } else {
                            log('  ⚠️ 健康检查 #' + attempt + ' 非健康状态');
                            setTimeout(tryCheck, delay);
                        }
                    } catch(e) {
                        log('  ⚠️ 健康检查 #' + attempt + ' 解析失败');
                        setTimeout(tryCheck, delay);
                    }
                });
            });
            
            req.on('error', function(e) {
                clearTimeout(timeout);
                log('  ⚠️ 健康检查 #' + attempt + ' 连接失败');
                if (attempt >= maxRetries) resolve(false);
                else setTimeout(tryCheck, delay);
            });
        }
        
        tryCheck();
    });
}

function restartServer() {
    return new Promise((resolve) => {
        fsm.restartLock = true;
        try { execSync('pkill -f "node.*server\\.js" 2>/dev/null || true', { cwd: REPO_DIR, timeout: 5000 }); } catch(e) {}
        setTimeout(function() {
            try {
                execSync('PORT=' + PORT + ' node server.js > ' + path.join(REPO_DIR, 'server_new.log') + ' 2>&1 &', { cwd: REPO_DIR });
                log('  [RESTART] 服务器已重启');
            } catch(e) { log('  ❌ 重启命令失败: ' + e.message); }
            resolve(true);
        }, 2000);
    });
}

function unlockRestart() {
    fsm.restartLock = false;
    log('  🔓 重启锁已释放');
}

// ============================
// Git 原子提交
// ============================

function atomicCommit(summary) {
    return new Promise((resolve) => {
        try {
            execSync('git checkout -B ' + fsm.patchBranch + ' 2>/dev/null || git checkout ' + fsm.patchBranch, { cwd: REPO_DIR });
            execSync('git add -A', { cwd: REPO_DIR });
            
            var diffResult;
            try {
                diffResult = execSync('git diff --cached --quiet 2>&1 || echo "CHANGES"', { cwd: REPO_DIR, encoding: 'utf-8' }).trim();
            } catch(e) { diffResult = 'CHANGES'; }
            
            if (diffResult !== 'CHANGES') {
                log('  ⏭️ 没有实际更改需要提交');
                resolve({ committed: false });
                return;
            }
            
            execSync('git commit -m "🤖 优化补丁: ' + summary + '"', { cwd: REPO_DIR });
            execSync('git checkout main', { cwd: REPO_DIR });
            execSync('git merge ' + fsm.patchBranch + ' --no-edit', { cwd: REPO_DIR });
            execSync('git branch -D ' + fsm.patchBranch, { cwd: REPO_DIR });
            
            log('  📦 原子提交完成 (patch-in-progress -> main)');
            resolve({ committed: true });
        } catch(e) {
            log('  ❌ Git 原子提交失败: ' + e.message.substring(0, 200));
            try { execSync('git branch -D ' + fsm.patchBranch, { cwd: REPO_DIR }); } catch(ex) {}
            resolve({ committed: false, error: e.message });
        }
    });
}

function performRollback(reason) {
    log('  ↩️ 执行回滚: ' + reason);
    try {
        execSync('git reset --hard HEAD~1', { cwd: REPO_DIR });
        log('  ✅ 已回退到上一版本');
        return true;
    } catch(e) {
        log('  ❌ 回滚失败: ' + e.message);
        return false;
    }
}

// ============================
// 幂等性 Injector 定义
// ============================

function loadInjection(filename) {
    return fs.readFileSync(path.join(INJECTIONS_DIR, filename), 'utf-8');
}

var INJECTORS = {
    // ---- Bob Wang: 后端优化 ----
    'bob.rate_limiter': {
        agentId: 'bob',
        marker: '// [BOB_RATE_LIMITER_START]',
        description: 'API请求速率限制中间件',
        filePath: 'server.js',
        patchFn: function(code) {
            return code.replace(
                'async function handleApi(req, res, parsedUrl) {',
                'async function handleApi(req, res, parsedUrl) {\n' + loadInjection('bob-rate-limiter.js')
            );
        }
    },
    'bob.global_errors': {
        agentId: 'bob',
        marker: '// [BOB_GLOBAL_ERRORS_START]',
        description: '全局错误处理和优雅退出',
        filePath: 'server.js',
        patchFn: function(code) { return code + loadInjection('bob-global-errors.js'); }
    },
    'bob.request_logger': {
        agentId: 'bob',
        marker: '// [BOB_REQUEST_LOGGER_START]',
        description: '请求日志和性能追踪',
        filePath: 'server.js',
        patchFn: function(code) {
            return code.replace(
                'server.listen(PORT',
                loadInjection('bob-request-logger.js') + '\nserver.listen(PORT'
            );
        }
    },
    'bob.log_query_api': {
        agentId: 'bob',
        marker: '// [BOB_LOG_QUERY_API_START]',
        description: '请求日志查询API',
        filePath: 'server.js',
        patchFn: function(code) {
            return code.replace(
                "case 'learn':",
                loadInjection('bob-log-query-api.js')
            );
        }
    },
    
    // ---- Henry Xu: 前端优化 ----
    'henry.keyboard_shortcuts': {
        agentId: 'henry',
        marker: '<!-- [HENRY_KEYBOARD_SHORTCUTS_START] -->',
        description: '键盘快捷键系统',
        filePath: 'index.html',
        patchFn: function(code) {
            return code.replace('</body>',
                '\n' + loadInjection('henry-keyboard-shortcuts.js') + '\n</body>'
            );
        }
    },
    'henry.page_loader': {
        agentId: 'henry',
        marker: '<!-- [HENRY_PAGE_LOADER_START] -->',
        description: '页面加载动画',
        filePath: 'index.html',
        patchFn: function(code) {
            return code.replace('<body>',
                loadInjection('henry-page-loader.js') + '\n<body>'
            );
        }
    },
    
    // ---- Carol Li: CSS 优化 ----
    'carol.css_tokens': {
        agentId: 'carol',
        marker: '/* [CAROL_CSS_TOKENS_START] */',
        description: 'CSS设计令牌和暗色模式',
        filePath: 'assets/css/style.css',
        patchFn: function(code) { return code + loadInjection('carol-css-tokens.css'); }
    },
    
    // ---- David Zhang: 安全加固 ----
    'david.security_headers': {
        agentId: 'david',
        marker: '// [DAVID_SECURITY_HEADERS_START]',
        description: '安全响应头',
        filePath: 'server.js',
        patchFn: function(code) {
            return code.replace(
                "res.setHeader('Content-Type', 'application/json');",
                "res.setHeader('Content-Type', 'application/json');\n" + loadInjection('david-security-headers.js').trim()
            );
        }
    },
    
    // ---- Eve Liu: 输入验证 ----
    'eve.endpoint_whitelist': {
        agentId: 'eve',
        marker: '// [EVE_ENDPOINT_WHITELIST_START]',
        description: 'API端点白名单验证',
        filePath: 'server.js',
        patchFn: function(code) {
            return code.replace(
                'const action = params[0];\n    const id = params[1];',
                loadInjection('eve-endpoint-whitelist.js')
            );
        }
    },
    
    // ---- Grace Zhao: 数据分析 ----
    'grace.metrics_api': {
        agentId: 'grace',
        marker: '// [GRACE_METRICS_API_START]',
        description: '性能指标API端点',
        filePath: 'server.js',
        patchFn: function(code) {
            return code.replace(
                "case 'meetings':",
                loadInjection('grace-metrics-api.js')
            );
        }
    },
    
    // ---- Alice Chen: 用户体验 ----
    'alice.onboarding': {
        agentId: 'alice',
        marker: '<!-- [ALICE_ONBOARDING_START] -->',
        description: '新用户引导流程',
        filePath: 'index.html',
        patchFn: function(code) {
            var obFile = path.join(REPO_DIR, 'onboarding.html');
            if (!fs.existsSync(obFile)) return code;
            return code.replace('<footer class="footer">', fs.readFileSync(obFile, 'utf-8'));
        }
    },
    
    // ---- Frank Wu: 架构设计 ----
    'frank.version_meta': {
        agentId: 'frank',
        marker: '// [FRANK_VERSION_META_START]',
        description: '更新版本元数据',
        filePath: 'agents/personalities.json',
        patchFn: function(code) {
            try {
                var data = JSON.parse(code);
                if (!data.meta) data.meta = {};
                data.meta.version = String((parseInt(data.meta.version || '1') + 1));
                data.meta.last_optimized = new Date().toISOString();
                data.meta.optimization_round = versionData.rounds;
                data.meta.self_optimizing = true;
                return JSON.stringify(data, null, 2);
            } catch(e) { return code; }
        }
    }
};

// 有序列表，保持执行顺序
var INJECTOR_KEYS = [
    'bob.rate_limiter', 'bob.global_errors', 'bob.request_logger', 'bob.log_query_api',
    'henry.keyboard_shortcuts', 'henry.page_loader',
    'carol.css_tokens',
    'david.security_headers',
    'eve.endpoint_whitelist',
    'grace.metrics_api',
    'alice.onboarding',
    'frank.version_meta'
];

// ============================
// 状态机处理器
// ============================

function getStateMachineHandler(state) {
    var handlers = {
        [STATES.IDLE]: function() {
            fsm.currentState = STATES.REVIEWING;
            log(getStateLabel() + ' ▶ 开始新一轮优化');
            processReviewRound();
        },
        
        [STATES.COMMITTING]: function(summary) {
            fsm.currentState = STATES.COMMITTING;
            log(getStateLabel() + ' 📦 原子提交到临时分支...');
            
            atomicCommit(summary).then(function(result) {
                if (result.committed) {
                    log(getStateLabel() + ' ✅ 提交成功，进入重启阶段');
                    fsm.currentState = STATES.RESTARTING;
                    processRestart();
                } else {
                    log(getStateLabel() + ' ⏭️ 没有需要提交的更改');
                    fsm.currentState = STATES.IDLE;
                }
            });
        },
        
        [STATES.VERIFYING]: function(success) {
            if (success) {
                unlockRestart();
                fsm.currentState = STATES.IDLE;
                log(getStateLabel() + ' ✅ 验证通过，回到空闲状态');
            } else {
                fsm.currentState = STATES.ROLLBACK;
                log(getStateLabel() + ' ❌ 验证失败，进入回滚状态');
            }
        },
        
        [STATES.ROLLBACK]: function() {
            fsm.currentState = STATES.ROLLBACK;
            log(getStateLabel() + ' ↩️ 执行回滚...');
            
            var rolledBack = performRollback('健康检查连续5次失败');
            unlockRestart();
            
            if (rolledBack) {
                fsm.consecutiveFailures = 0;
                fsm.currentState = STATES.IDLE;
                log(getStateLabel() + ' ✅ 回滚完成，回到空闲状态');
            } else {
                fsm.currentState = STATES.ERROR;
                log(getStateLabel() + ' 💀 回滚失败，进入错误状态');
            }
        },
        
        [STATES.ERROR]: function() {
            unlockRestart();
            log(getStateLabel() + ' 💀 错误状态 — 需要人工介入');
            log(getStateLabel() + '    最后错误: ' + (fsm.lastError || '未知'));
            setTimeout(function() {
                log(getStateLabel() + ' ⏰ 错误超时，尝试恢复...');
                fsm.currentState = STATES.IDLE;
                fsm.consecutiveFailures = 0;
            }, 10 * 60 * 1000);
        }
    };
    return handlers[state] || handlers[STATES.IDLE];
}

// ============================
// 优化流程
// ============================

function processReviewRound() {
    fsm.roundNum++;
    log('');
    log('  📋 第 ' + fsm.roundNum + ' 轮 — 幂等性校验 + 变更摘要');
    
    var appliedChanges = [];
    var skippedChanges = [];
    var injectorKeys = INJECTOR_KEYS.slice();
    var idx = 0;
    
    function processNext() {
        if (idx >= injectorKeys.length) {
            // 所有 injector 处理完毕
            if (appliedChanges.length > 0) {
                fsm.pendingChanges = appliedChanges;
                processApplyRound();
            } else {
                log('  ⏭️ 本轮无新改进，全部已存在 — 跳过 commit + restart');
                fsm.currentState = STATES.IDLE;
                log(getStateLabel() + ' ◀ 回到空闲状态');
            }
            return;
        }
        
        var key = injectorKeys[idx++];
        var injector = INJECTORS[key];
        if (!injector) { processNext(); return; }
        
        var filePath = injector.filePath;
        var fullPath = path.join(REPO_DIR, filePath);
        if (!fs.existsSync(fullPath)) {
            log('  ⏭️ ' + injector.description + ' — 文件不存在: ' + filePath);
            recordPatch(injector.agentId, injector.marker, injector.description, false);
            processNext();
            return;
        }
        
        var currentCode = fs.readFileSync(fullPath, 'utf-8');
        
        // 知识库检查: 如果已知此 patch 已应用，直接跳过
        if (isKnownPatch(injector.agentId, injector.marker)) {
            log('  📚 ' + injector.description + ' — 知识库命中 (已知已应用)');
            skippedChanges.push({ agent: injector.agentId, desc: injector.description, reason: 'known_applied' });
            processNext();
            return;
        }
        
        // 获取 Agnes 建议 (知识库未命中时才调用)
        getAgentSuggestions(injector.agentId, filePath, currentCode.split('\n').length)
            .then(function(response) {
                if (response && response.reply) {
                    log('  💬 ' + response.reply.substring(0, 100));
                }
                
                // 幂等性校验 + 应用
                var result = validateAndApply(filePath, injector);
                
                if (result.applied) {
                    log('  ✅ 已应用: ' + result.description + ' (' + result.origLines + '→' + result.modLines + ' 行)');
                    appliedChanges.push({
                        agent: injector.agentId,
                        file: filePath,
                        desc: result.description,
                        linesChanged: result.modLines - result.origLines
                    });
                    recordPatch(injector.agentId, injector.marker, result.description, true);
                } else if (result.success && !result.applied) {
                    log('  ⏭️ 跳过: ' + result.description + ' (' + (result.reason || '无变更') + ')');
                    skippedChanges.push({ agent: injector.agentId, desc: result.description, reason: result.reason });
                    recordPatch(injector.agentId, injector.marker, result.description, true); // 已知已存在
                } else {
                    log('  ❌ 失败: ' + result.description + ' — ' + result.error);
                    recordPatch(injector.agentId, injector.marker, result.description, false);
                }
                
                processNext();
            })
            .catch(function(e) {
                log('  ❌ 处理异常: ' + e.message);
                processNext();
            });
    }
    
    processNext();
}

function processApplyRound() {
    log('  📊 共 ' + fsm.pendingChanges.length + ' 个改进待提交');
    
    var hasBackendChanges = fsm.pendingChanges.some(function(c) { return c.file === 'server.js'; });
    
    if (hasBackendChanges) {
        fsm.currentState = STATES.COMMITTING;
        var summary = fsm.pendingChanges.map(function(c) { return c.desc; }).join(', ');
        getStateMachineHandler(STATES.COMMITTING)(summary);
    } else {
        fsm.currentState = STATES.COMMITTING;
        var summary = fsm.pendingChanges.map(function(c) { return c.desc; }).join(', ');
        log('  ℹ️ 纯前端改动，提交后不重启');
        
        atomicCommit(summary).then(function(result) {
            if (result.committed) {
                saveVersion(fsm.pendingChanges);
                fsm.currentState = STATES.IDLE;
                log('  ✅ 前端改动已提交，无需重启');
            } else {
                syncToGitHub([]);
                fsm.currentState = STATES.IDLE;
            }
        });
    }
}

function processRestart() {
    fsm.currentState = STATES.RESTARTING;
    log('  🔄 重启服务器...');
    
    restartServer().then(function() {
        fsm.currentState = STATES.VERIFYING;
        log('  🔍 启动健康检查 (指数退避, 5次重试)...');
        
        checkServerStatus().then(function(success) {
            getStateMachineHandler(STATES.VERIFYING)(success);
            
            if (success) {
                saveVersion(fsm.pendingChanges);
                log('  📈 总计: ' + versionData.rounds + ' 轮优化, ' + versionData.changes.length + ' 个改进已部署');
            } else {
                // 无新变更时也同步 README（更新时间和版本号）
                syncToGitHub([]);
            }
        });
    });
}

// ============================
// 主程序
// ============================

log('🏢 虚拟办公室 - 持续性自我优化系统 v5.0 (Idempotent State Machine)');
log('📅 启动时间: ' + new Date().toISOString());
log('📊 当前版本: v' + versionData.version + ', 历史优化: ' + versionData.rounds + ' 轮');
log('🔧 幂等性校验 + 变更摘要过滤 + Agent 知识库缓存');
log('');

loadKnowledge();

// 启动状态机
getStateMachineHandler(STATES.IDLE)();

// 每 5 分钟触发一轮优化
setInterval(function() {
    if (fsm.currentState === STATES.IDLE && !fsm.restartLock) {
        log('');
        log('⏰ 定时触发: 开始新一轮优化');
        getStateMachineHandler(STATES.IDLE)();
    } else {
        log('⏰ 定时触发: 跳过 (状态=' + fsm.currentState + ', lock=' + fsm.restartLock + ')');
    }
}, 5 * 60 * 1000);

// 状态变化日志
setInterval(function() {
    if (fsm.currentState !== STATES.IDLE) {
        log('📊 状态: ' + fsm.currentState + ' | 待处理: ' + fsm.pendingChanges.length + ' | 失败次数: ' + fsm.consecutiveFailures);
    }
}, 60000);

// 每 5 分钟自动同步 README 到 GitHub
setInterval(function() {
    log('📝 定时同步 README 到 GitHub...');
    syncToGitHub(fsm.pendingChanges);
}, 5 * 60 * 1000);
