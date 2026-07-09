/**
 * Virtual Office - 持续性自我优化系统 v4.0 (State Machine)
 * 
 * 核心架构: 有限状态机 (FSM) 替代线性脚本
 * 
 * 状态转换:
 *   IDLE -> REVIEWING -> APPLYING -> COMMITTING -> RESTARTING -> VERIFYING
 *     |         |           |            |            |            |
 *     |         v           v            v            v            v
 *     |     ROLLBACK <-- FAILURE <-- FAILURE <-- FAILURE <-- FAILURE
 *     |         |
 *     |     RECOVERED (回到 IDLE)
 *     |
 *     +---- TIMEOUT -> IDLE (自动恢复)
 * 
 * 设计原则:
 *   1. 原子提交: 所有修改暂存于 patch-in-progress 分支
 *   2. 指数退避健康检查: 5 次重试，每次翻倍等待
 *   3. 重启期间禁止回滚: 全局锁保护
 *   4. 每个优化器独立事务: 单个失败不影响整体
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

// ============================
// 状态机定义
// ============================

const STATES = {
    IDLE: 'IDLE',
    REVIEWING: 'REVIEWING',
    APPLYING: 'APPLYING',
    COMMITTING: 'COMMITTING',
    RESTARTING: 'RESTARTING',
    VERIFYING: 'VERIFYING',
    ROLLBACK: 'ROLLBACK',
    ERROR: 'ERROR'
};

// 全局状态
var fsm = {
    currentState: STATES.IDLE,
    roundNum: 0,
    pendingChanges: [],
    failedChanges: [],
    patchBranch: 'patch-in-progress',
    baseCommit: null,
    restartLock: false,  // 重启期间禁止回滚
    consecutiveFailures: 0,
    lastError: null,
    startTime: null
};

// ============================
// 工具函数
// ============================

function log(msg) {
    var ts = new Date().toISOString().replace('T', ' ').split('.')[0];
    console.log('[' + ts + '] ' + msg);
}

function getStateLabel() {
    return '  [STATE:' + fsm.currentState + ' lock:' + fsm.restartLock + ']';
}

function saveVersion(changes) {
    if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });
    var vd;
    if (fs.existsSync(VERSION_FILE)) {
        vd = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf-8'));
    } else {
        vd = { version: 1, rounds: 0, lastOptimized: null, changes: [] };
    }
    vd.rounds++;
    vd.lastOptimized = new Date().toISOString();
    vd.changes.push({
        round: vd.rounds,
        timestamp: vd.lastOptimized,
        changes: changes,
        version: vd.version++,
        state: fsm.currentState
    });
    fs.writeFileSync(VERSION_FILE, JSON.stringify(vd, null, 2));
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

function safeModifyFile(filePath, modifierFn) {
    var fullPath = path.join(REPO_DIR, filePath);
    if (!fs.existsSync(fullPath)) return { success: false, error: 'file_not_found' };
    try {
        var original = fs.readFileSync(fullPath, 'utf-8');
        var modified = modifierFn(original);
        if (modified === original) return { success: false, error: 'no_changes' };
        
        // 写入临时文件验证
        var tmpDir = path.join(REPO_DIR, '.tmp_check');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        var tmpPath = path.join(tmpDir, 'check_' + Date.now() + '.js');
        fs.writeFileSync(tmpPath, modified);
        
        if (filePath.endsWith('.js')) {
            try { execSync('node --check "' + tmpPath + '"', { cwd: REPO_DIR, timeout: 5000 }); }
            catch(e) {
                try { fs.unlinkSync(tmpPath); } catch(ex) {}
                return { success: false, error: 'syntax_error: ' + e.message.substring(0, 200) };
            }
        }
        
        // 验证通过，替换原文件
        fs.renameSync(tmpPath, fullPath);
        return { success: true, origLines: original.split('\n').length, modLines: modified.split('\n').length };
    } catch(e) { return { success: false, error: e.message }; }
}

// ============================
// 健康检查 — 指数退避
// ============================

function checkServerStatus() {
    return new Promise((resolve) => {
        var maxRetries = 5;
        var baseDelay = 2000; // 2秒
        var attempt = 0;
        
        function tryCheck() {
            attempt++;
            var delay = baseDelay * Math.pow(2, attempt - 1); // 2s, 4s, 8s, 16s, 32s
            
            log('  🔍 健康检查 #' + attempt + '/' + maxRetries + ' (等待 ' + (delay/1000) + 's)...');
            
            var timeout = setTimeout(function() {
                log('  ❌ 健康检查 #' + attempt + ' 超时');
                if (attempt >= maxRetries) {
                    log('  💀 连续 ' + maxRetries + ' 次失败，判定部署失败');
                    resolve(false);
                } else {
                    setTimeout(tryCheck, delay);
                }
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
                            log('  ⚠️ 健康检查 #' + attempt + ' 返回非健康状态');
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
                log('  ⚠️ 健康检查 #' + attempt + ' 连接失败: ' + e.message);
                if (attempt >= maxRetries) {
                    resolve(false);
                } else {
                    setTimeout(tryCheck, delay);
                }
            });
        }
        
        tryCheck();
    });
}

function restartServer() {
    return new Promise((resolve) => {
        fsm.restartLock = true; // 设置重启锁，禁止回滚
        
        try {
            execSync('pkill -f "node.*server\\.js" 2>/dev/null || true', { cwd: REPO_DIR, timeout: 5000 });
        } catch(e) {}
        
        setTimeout(function() {
            try {
                execSync('PORT=' + PORT + ' node server.js > ' + path.join(REPO_DIR, 'server_new.log') + ' 2>&1 &', { cwd: REPO_DIR });
                log('  [RESTART] 服务器已重启 (PID: ' + process.pid + ')');
            } catch(e) {
                log('  ❌ 服务器重启命令失败: ' + e.message);
            }
            resolve(true);
        }, 2000);
    });
}

function unlockRestart() {
    fsm.restartLock = false;
    log('  🔓 重启锁已释放');
}

// ============================
// Git 操作 — 原子提交到临时分支
// ============================

function atomicCommit(summary) {
    return new Promise((resolve) => {
        try {
            // 创建/切换到临时分支
            execSync('git checkout -B ' + fsm.patchBranch + ' 2>/dev/null || git checkout ' + fsm.patchBranch, { cwd: REPO_DIR });
            
            // 暂存所有修改
            execSync('git add -A', { cwd: REPO_DIR });
            
            // 检查是否有实际更改
            var diffResult = execSync('git diff --cached --quiet 2>&1 || echo "CHANGES"', { cwd: REPO_DIR, encoding: 'utf-8' }).trim();
            if (diffResult !== 'CHANGES') {
                log('  ⏭️ 没有实际更改需要提交');
                resolve({ committed: false });
                return;
            }
            
            // 提交到临时分支
            execSync('git commit -m "🤖 优化补丁: ' + summary + '"', { cwd: REPO_DIR });
            
            // 合并回 main
            execSync('git checkout main', { cwd: REPO_DIR });
            execSync('git merge ' + fsm.patchBranch + ' --no-edit', { cwd: REPO_DIR });
            
            // 删除临时分支
            execSync('git branch -D ' + fsm.patchBranch, { cwd: REPO_DIR });
            
            log('  📦 原子提交完成 (patch-in-progress -> main)');
            resolve({ committed: true });
        } catch(e) {
            log('  ❌ Git 原子提交失败: ' + e.message.substring(0, 200));
            // 清理临时分支
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
// 优化器定义
// ============================

var OPTIMIZERS = {
    bob: {
        name: 'Bob Wang', role: 'Senior Developer', focus: 'API路由效率和错误处理', files: ['server.js'],
        optimize: function(code, round) {
            var changes = [];
            var inj = function(file) { return fs.readFileSync(path.join(INJECTIONS_DIR, file), 'utf-8'); };
            
            if (code.indexOf('rateLimitMap') === -1) {
                changes.push({ desc: 'API请求速率限制中间件', fn: function(src) {
                    return src.replace('async function handleApi(req, res, parsedUrl) {', 'async function handleApi(req, res, parsedUrl) {\n' + inj('rate-limiter.js'));
                }});
            }
            if (code.indexOf('process.on("uncaughtException")') === -1) {
                changes.push({ desc: '全局错误处理和优雅退出', fn: function(src) { return src + inj('global-errors.js'); } });
            }
            if (code.indexOf('requestLog = []') === -1) {
                changes.push({ desc: '请求日志和性能追踪', fn: function(src) {
                    return src.replace('server.listen(PORT', inj('request-logger.js') + '\nserver.listen(PORT');
                }});
            }
            if (code.indexOf("case 'logs'") === -1) {
                changes.push({ desc: '请求日志查询API', fn: function(src) {
                    return src.replace("case 'learn':", inj('logs-api.js'));
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
                changes.push({ desc: '键盘快捷键系统', fn: function(src) {
                    return src.replace('</body>', '\n<script>\ndocument.addEventListener("keydown", function(e) {\n    if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); var si=document.getElementById("searchInput"); if(si)si.focus(); }\n    if (e.key === "Escape") { document.querySelectorAll(".modal").forEach(function(el){el.style.display="none";}); }\n});\n</script>\n</body>');
                }});
            }
            if (code.indexOf('page-loader') === -1) {
                changes.push({ desc: '页面加载动画', fn: function(src) {
                    return src.replace('<body>', '<div id="page-loader" style="position:fixed;inset:0;background:#f0f4f8;display:flex;align-items:center;justify-content:center;z-index:9999;font-size:3rem;">🏢</div>\n<script>setTimeout(function(){var l=document.getElementById("page-loader");if(l){l.style.opacity="0";setTimeout(function(){l.remove()},300);}},500);</script>\n<body>');
                }});
            }
            return changes;
        }
    },
    
    carol: {
        name: 'Carol Li', role: 'UI/UX Designer', focus: 'CSS和设计系统优化', files: ['assets/css/style.css'],
        optimize: function(code, round) {
            var changes = [];
            if (code.indexOf('--accent-primary') === -1) {
                changes.push({ desc: 'CSS设计令牌和暗色模式', fn: function(src) {
                    return src + fs.readFileSync(path.join(INJECTIONS_DIR, 'css-tokens.css'), 'utf-8');
                }});
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
            if (code.indexOf('ALLOWED_ENDPOINTS') === -1) {
                changes.push({ desc: 'API端点白名单验证', fn: function(src) {
                    var inj = fs.readFileSync(path.join(INJECTIONS_DIR, 'endpoint-whitelist.js'), 'utf-8');
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
                changes.push({ desc: '新用户引导流程', fn: function(src) {
                    return src.replace('<footer class="footer">', fs.readFileSync(obFile, 'utf-8'));
                }});
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
// 状态机处理器
// ============================

function getStateMachineHandler(state) {
    var handlers = {
        [STATES.IDLE]: function() {
            fsm.currentState = STATES.REVIEWING;
            log(getStateLabel() + ' ▶ 开始新一轮优化');
            processReviewRound();
        },
        
        [STATES.REVIEWING]: function() {
            // 由 processReviewRound 处理
        },
        
        [STATES.APPLYING]: function() {
            // 由 processApplyRound 处理
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
                    log(getStateLabel() + ' ⚠️ 没有需要提交的更改');
                    fsm.currentState = STATES.IDLE;
                    log(getStateLabel() + ' ◀ 回到空闲状态');
                }
            });
        },
        
        [STATES.RESTARTING]: function() {
            // 由 processRestart 处理
        },
        
        [STATES.VERIFYING]: function(success) {
            fsm.currentState = success ? STATES.IDLE : STATES.ROLLBACK;
            if (success) {
                log(getStateLabel() + ' ✅ 验证通过，回到空闲状态');
            } else {
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
            log(getStateLabel() + ' 💀 错误状态 — 需要人工介入');
            log(getStateLabel() + '    最后错误: ' + (fsm.lastError || '未知'));
            // 错误状态下等待 10 分钟后自动恢复
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
// 优化流程 — 分阶段执行
// ============================

function processReviewRound() {
    fsm.roundNum++;
    log('  📋 第 ' + fsm.roundNum + ' 轮 — 收集所有优化器的改进方案');
    
    var allChanges = [];
    var agentIds = Object.keys(OPTIMIZERS);
    var processed = 0;
    
    function processNext() {
        if (processed >= agentIds.length) {
            // 所有优化器处理完毕
            if (allChanges.length > 0) {
                fsm.pendingChanges = allChanges;
                fsm.currentState = STATES.APPLYING;
                processApplyRound();
            } else {
                log('  ⏭️ 本轮无新改进');
                fsm.currentState = STATES.IDLE;
            }
            return;
        }
        
        var agentId = agentIds[processed++];
        var optimizer = OPTIMIZERS[agentId];
        if (!optimizer) { processNext(); return; }
        
        log('  👨‍💻 ' + optimizer.name + ' (' + optimizer.role + ') - ' + optimizer.focus);
        
        var filePath = optimizer.files[0];
        var fullPath = path.join(REPO_DIR, filePath);
        if (!fs.existsSync(fullPath)) {
            log('  [SKIP] 文件不存在: ' + filePath);
            processNext();
            return;
        }
        
        var currentCode = fs.readFileSync(fullPath, 'utf-8');
        
        // 获取agent建议
        (async function() {
            try {
                var prompt = '你是' + optimizer.name + '（' + optimizer.role + '），专注于' + optimizer.focus + '。当前文件: ' + filePath + ' (' + currentCode.split('\n').length + '行)。请审查代码并提出改进建议。用中文回答，100字以内。';
                var response = await callAgnes(agentId, prompt);
                log('  💬 ' + (response.reply || '').substring(0, 100));
            } catch(e) { log('  ⚠️ 获取建议失败: ' + e.message); }
            
            // 应用优化
            var potentialChanges = optimizer.optimize(currentCode, fsm.roundNum);
            log('  🔧 ' + potentialChanges.length + ' 个改进方案');
            
            for (var ci = 0; ci < potentialChanges.length; ci++) {
                var change = potentialChanges[ci];
                var result = safeModifyFile(filePath, change.fn);
                
                if (result.success) {
                    log('  ✅ 已应用: ' + change.desc + ' (' + result.origLines + '→' + result.modLines + ' 行)');
                    allChanges.push({ agent: optimizer.name, file: filePath, desc: change.desc, linesChanged: result.modLines - result.origLines });
                } else if (result.error === 'no_changes') {
                    log('  ⏭️ 跳过: ' + change.desc + ' (已存在)');
                } else {
                    log('  ❌ 失败: ' + change.desc + ' - ' + result.error.substring(0, 100));
                }
            }
            
            processNext();
        })();
    }
    
    processNext();
}

function processApplyRound() {
    log('  📊 共 ' + fsm.pendingChanges.length + ' 个改进待提交');
    
    // 检查是否有后端改动
    var hasBackendChanges = fsm.pendingChanges.some(function(c) { return c.file === 'server.js'; });
    
    if (hasBackendChanges) {
        fsm.currentState = STATES.COMMITTING;
        var summary = fsm.pendingChanges.map(function(c) { return c.desc; }).join(', ');
        getStateMachineHandler(STATES.COMMITTING)(summary);
    } else {
        // 纯前端改动，直接提交不重启
        fsm.currentState = STATES.COMMITTING;
        var summary = fsm.pendingChanges.map(function(c) { return c.desc; }).join(', ');
        log('  ℹ️ 纯前端改动，提交后不重启');
        
        atomicCommit(summary).then(function(result) {
            if (result.committed) {
                saveVersion(fsm.pendingChanges);
                fsm.currentState = STATES.IDLE;
                log('  ✅ 前端改动已提交，无需重启');
            } else {
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
                // 保存版本信息
                saveVersion(fsm.pendingChanges);
                log('  📈 总计: ' + (versionData.rounds || 0) + ' 轮优化, ' + (versionData.changes ? versionData.changes.length : 0) + ' 个改进已部署');
            }
        });
    });
}

// ============================
// 主程序
// ============================

var versionData;
if (fs.existsSync(VERSION_FILE)) {
    versionData = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf-8'));
} else {
    versionData = { version: 1, rounds: 0, lastOptimized: null, changes: [] };
}

log('🏢 虚拟办公室 - 持续性自我优化系统 v4.0 (State Machine)');
log('📅 启动时间: ' + new Date().toISOString());
log('📊 当前版本: v' + versionData.version + ', 历史优化: ' + versionData.rounds + ' 轮');
log('🔧 状态机架构: 原子提交 + 指数退避健康检查 + 重启锁保护');
log('');

// 状态机事件队列
var eventQueue = [];
var processing = false;

function enqueueEvent(eventFn) {
    eventQueue.push(eventFn);
    if (!processing) processQueue();
}

function processQueue() {
    if (eventQueue.length === 0) { processing = false; return; }
    processing = true;
    var event = eventQueue.shift();
    event();
}

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
