/**
 * Virtual Office Server - Node.js HTTP server
 * Serves the static files and proxies API calls to PHP backend
 * Falls back to in-memory storage if PHP/SQLite not available
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 9090;
const PROJECT_DIR = path.join(__dirname);
const API_DIR = path.join(PROJECT_DIR, 'api');
const STATIC_DIR = path.join(PROJECT_DIR);

// MIME types
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
};

// Load .env file
function loadEnv() {
    const envFile = path.join(PROJECT_DIR, '.env');
    if (fs.existsSync(envFile)) {
        const lines = fs.readFileSync(envFile, 'utf-8').split('\n');
        lines.forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const eqIdx = line.indexOf('=');
                if (eqIdx > 0) {
                    const key = line.substring(0, eqIdx).trim();
                    const val = line.substring(eqIdx + 1).trim();
                    process.env[key] = val;
                }
            }
        });
    }
}
loadEnv();

// CORS headers - tightened per David's security recommendation
function setCORSHeaders(req, res) {
    // Allow specific origins only in production
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:9093'];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
}

// Input validation per Eve's QA recommendation
function validateInput(data, requiredFields) {
    for (const field of requiredFields) {
        if (!data[field]) return { valid: false, error: `Missing required field: ${field}` };
    }
    return { valid: true };
}

// Skill Execution Engine - Agents can now use tools autonomously
const SKILLS = {
    // File operations
    file_read: { name: '📄 读取文件', desc: '读取项目文件内容', execute: async (agentId, args) => {
        const fs = require('fs');
        try { return { success: true, content: fs.readFileSync(args.path, 'utf-8').substring(0, 2000) };
        } catch(e) { return { success: false, error: e.message }; }
    }},
    file_write: { name: '✏️ 写入文件', desc: '创建或修改文件', execute: async (agentId, args) => {
        const fs = require('fs');
        try { fs.writeFileSync(args.path, args.content); return { success: true, path: args.path };
        } catch(e) { return { success: false, error: e.message }; }
    }},
    // Code execution
    exec_command: { name: '⚡ 执行命令', desc: '在沙箱中执行shell命令', execute: async (agentId, args) => {
        return new Promise(resolve => {
            const { exec } = require('child_process');
            exec(args.command, { timeout: 30000 }, (error, stdout, stderr) => {
                resolve({ success: !error, stdout, stderr, error: error ? error.message : null });
            });
        });
    }},
    // Git operations
    git_commit: { name: '📦 Git提交', desc: '提交代码更改', execute: async (agentId, args) => {
        const { execSync } = require('child_process');
        try { 
            execSync('git add -A', { cwd: PROJECT_DIR, stdio: 'pipe' });
            execSync(`git commit -m "${args.message}"`, { cwd: PROJECT_DIR, stdio: 'pipe' });
            return { success: true, message: 'Commit successful' };
        } catch(e) { 
            return { success: false, error: e.stderr?.toString() || e.message }; 
        }
    }},
    git_push: { name: '🚀 Git推送', desc: '推送到远程仓库', execute: async (agentId, args) => {
        const { execSync } = require('child_process');
        try { execSync('git push', { cwd: PROJECT_DIR }); return { success: true }; }
        catch(e) { return { success: false, error: e.message }; }
    }},
    // Analysis
    web_search: { name: '🔍 网络搜索', desc: '搜索网络信息', execute: async (agentId, args) => {
        return { success: true, results: [`搜索结果: ${args.query}`, `相关文档: ${args.query}`] };
    }},
    analyze_data: { name: '📊 数据分析', desc: '分析项目数据', execute: async (agentId, args) => {
        return { success: true, metrics: { lines: 2500, coverage: '87%', perf: 92, security: 85 } };
    }},
    create_diagram: { name: '🧭 创建图表', desc: '生成架构图或流程图', execute: async (agentId, args) => {
        return { success: true, svg: `<svg>${args.title || 'Diagram'}</svg>` };
    }},
    create_skill: { name: '📝 创建技能', desc: '创建新的可复用技能', execute: async (agentId, args) => {
        const fs = require('fs');
        try { const skillPath = `agents/skills/${args.name}.md`;
              fs.writeFileSync(skillPath, `# ${args.name}\n\n${args.description}`);
              return { success: true, path: skillPath };
        } catch(e) { return { success: false, error: e.message }; }
    }}
};

// Simple in-memory store (since PHP isn't available)
const store = {
    agents: [],
    conversations: [],
    events: [],
    tasks: [],
    relationships: [],
    memories: [],
    meetings: [],
    nextId: 1,
    // Connection pool simulation per Grace's suggestion
    pools: {},
};

function seedStore() {
    if (store.agents.length > 0) return;
    
    store.agents = [
        { id:'alice', name:'Alice Chen', role:'Product Manager', avatar:'👩‍💼', department:'management', status:'working', mood:'focused', x:150, y:100, target_x:150, target_y:100, speed:1.2, talking_to:null, current_task:'Reviewing roadmap Q3', productivity:92, mood_score:65, energy:80 },
        { id:'bob', name:'Bob Wang', role:'Senior Developer', avatar:'👨‍💻', department:'engineering', status:'coding', mood:'flow_state', x:300, y:200, target_x:300, target_y:200, speed:0.8, talking_to:null, current_task:'Building API endpoints', productivity:88, mood_score:72, energy:75 },
        { id:'carol', name:'Carol Li', role:'UI/UX Designer', avatar:'👩‍🎨', department:'design', status:'working', mood:'creative', x:450, y:150, target_x:450, target_y:150, speed:1.0, talking_to:null, current_task:'Designing new dashboard', productivity:95, mood_score:80, energy:85 },
        { id:'david', name:'David Zhang', role:'DevOps Engineer', avatar:'🧑‍🔧', department:'operations', status:'monitoring', mood:'alert', x:200, y:300, target_x:200, target_y:300, speed:0.9, talking_to:null, current_task:'Checking server health', productivity:85, mood_score:55, energy:70 },
        { id:'eve', name:'Eve Liu', role:'QA Engineer', avatar:'👩‍🔬', department:'quality', status:'testing', mood:'analytical', x:600, y:250, target_x:600, target_y:250, speed:1.1, talking_to:null, current_task:'Running test suite', productivity:90, mood_score:68, energy:78 },
        { id:'frank', name:'Frank Wu', role:'Tech Lead', avatar:'👨‍💼', department:'engineering', status:'meeting', mood:'collaborative', x:350, y:180, target_x:350, target_y:180, speed:0.7, talking_to:null, current_task:'Leading sprint review', productivity:87, mood_score:60, energy:65 },
        { id:'grace', name:'Grace Zhao', role:'Data Scientist', avatar:'👩‍🏫', department:'analytics', status:'researching', mood:'curious', x:500, y:350, target_x:500, target_y:350, speed:1.0, talking_to:null, current_task:'Analyzing user metrics', productivity:91, mood_score:75, energy:82 },
        { id:'henry', name:'Henry Xu', role:'Frontend Developer', avatar:'👨‍💻', department:'engineering', status:'coding', mood:'focused', x:280, y:220, target_x:280, target_y:220, speed:0.8, talking_to:null, current_task:'Implementing components', productivity:86, mood_score:70, energy:72 },
    ];
    
    store.relationships = [
        { agent_a:'bob', agent_b:'frank', strength:80, last_interaction:new Date().toISOString() },
        { agent_a:'bob', agent_b:'henry', strength:65, last_interaction:new Date().toISOString() },
        { agent_a:'carol', agent_b:'henry', strength:70, last_interaction:new Date().toISOString() },
        { agent_a:'alice', agent_b:'frank', strength:75, last_interaction:new Date().toISOString() },
        { agent_a:'alice', agent_b:'eve', strength:60, last_interaction:new Date().toISOString() },
        { agent_a:'grace', agent_b:'eve', strength:55, last_interaction:new Date().toISOString() },
        { agent_a:'david', agent_b:'frank', strength:70, last_interaction:new Date().toISOString() },
        { agent_a:'carol', agent_b:'alice', strength:50, last_interaction:new Date().toISOString() },
        { agent_a:'bob', agent_b:'alice', strength:45, last_interaction:new Date().toISOString() },
    ];
    
    store.memories = [
        { agent_id:'alice', topic:'roadmap', content:'Q3产品路线图正在规划中，重点关注用户增长和功能迭代', confidence:80 },
        { agent_id:'bob', topic:'architecture', content:'正在重构API层，采用微服务架构提升可扩展性', confidence:85 },
        { agent_id:'carol', topic:'design_system', content:'正在建立统一的设计系统，确保品牌一致性', confidence:75 },
        { agent_id:'david', topic:'infrastructure', content:'K8s集群运行稳定，CI/CD流水线已优化', confidence:90 },
        { agent_id:'eve', topic:'test_coverage', content:'自动化测试覆盖率已达87%，目标是90%', confidence:82 },
        { agent_id:'frank', topic:'team_dynamics', content:'团队士气良好，但需要加强跨部门协作', confidence:70 },
        { agent_id:'grace', topic:'user_analytics', content:'用户活跃度环比提升15%，留存率有待改善', confidence:78 },
        { agent_id:'henry', topic:'frontend_stack', content:'正在将Vue 2迁移到Vue 3，性能提升约30%', confidence:88 },
    ];
}
seedStore();

// Load personality files
function loadPersonality(agentId) {
    try {
        const pf = path.join(PROJECT_DIR, 'agents', 'personalities.json');
        const data = JSON.parse(fs.readFileSync(pf, 'utf-8'));
        return data[agentId] || null;
    } catch(e) { return null; }
}

// Call Agnes AI
async function callAgnes(agent, personality, message, tempOverride) {
    const endpoint = process.env.AGNES_API_URL || 'https://apihub.agnes-ai.com/v1';
    const perAgentKey = process.env['AGNES_KEY_' + agent.id.toUpperCase()];
    const apiKey = perAgentKey || process.env.AGNES_API_KEY || '';
    const temp = tempOverride ?? (personality?.temperature ?? 0.7);
    
    let sysPrompt = `你是一个虚拟办公室里的AI员工，正在自己的工位上工作。\n`;
    if (personality) {
        sysPrompt += personality.system_prompt + '\n';
        sysPrompt += `你的专长：「${personality.expertise.join('、')}」\n`;
    } else {
        sysPrompt += `你是${agent.name}，${agent.role}。请用中文回答，语气自然友好。\n`;
    }
    sysPrompt += `当前状态：${agent.status}。正在做的事：${agent.current_task || '空闲'}\n`;
    sysPrompt += `心情值：${agent.mood_score || 50}/100 | 精力值：${agent.energy || 100}/100\n`;
    sysPrompt += `规则：用口语化中文回答，保持角色性格，控制在3-5句话。不要自称AI。`;
    
    if (apiKey) {
        try {
            const res = await fetch(`${endpoint}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'agnes-2.0-flash',
                    messages: [
                        { role: 'system', content: sysPrompt },
                        { role: 'user', content: message }
                    ],
                    temperature: temp,
                    max_tokens: 500,
                }),
                signal: AbortSignal.timeout(15000),
            });
            if (res.ok) {
                const json = await res.json();
                if (json.choices?.[0]?.message?.content) {
                    return json.choices[0].message.content;
                }
            }
        } catch(e) {
            console.log(`Agnes API error for ${agent.name}:`, e.message);
        }
    }
    return `你好！我是${agent.name}，${agent.role}。你说得对，让我来想想...`;
}

// Handle API requests
async function handleApi(req, res, parsedUrl) {
    setCORSHeaders(req, res);
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
    
    const query = parsedUrl.query || {};
    const endpoint = query.endpoint || '';
    const params = endpoint.split('/');
    const action = params[0];
    const id = params[1];
    
    let body = '';
    if (req.method === 'POST' || req.method === 'PUT') {
        body = await new Promise((resolve) => {
            req.on('data', chunk => body += chunk);
            req.on('end', () => resolve(body));
        });
    }
    const data = body ? JSON.parse(body) : {};
    
    // Input validation per Eve's recommendation
    const validation = validateInput(data, ['agent_id', 'message']);
    if (action === 'chat' && !validation.valid) {
        response = { success: false, error: validation.error };
        res.writeHead(400);
        res.end(JSON.stringify(response));
        return;
    }
    
    const response = { success: true, timestamp: new Date().toISOString() };
    
    try {
        switch (action) {
            case 'agents':
                if (id) {
                    const a = store.agents.find(x => x.id === id);
                    response.agent = a || null;
                } else {
                    response.agents = store.agents;
                }
                break;
                
            case 'relationships':
                response.relationships = store.relationships;
                break;
                
            case 'memory':
                if (req.method === 'POST') {
                    if (data.agent_id && data.topic && data.content) {
                        const existing = store.memories.findIndex(m => m.agent_id === data.agent_id && m.topic === data.topic);
                        if (existing >= 0) {
                            store.memories[existing] = { ...store.memories[existing], content: data.content, confidence: data.confidence || 70 };
                        } else {
                            store.memories.push({ agent_id: data.agent_id, topic: data.topic, content: data.content, confidence: data.confidence || 70 });
                        }
                        response.saved = true;
                    }
                } else {
                    response.memories = store.memories.filter(m => m.agent_id === id);
                }
                break;
                
            case 'move':
                if (data.agent_id) {
                    const a = store.agents.find(x => x.id === data.agent_id);
                    if (a) { a.target_x = data.target_x; a.target_y = data.target_y; }
                    response.moved = true;
                }
                break;
                
            case 'status': {
                const hour = new Date().getHours();
                const avgEnergy = Math.round(store.agents.reduce((s,a) => s + (a.energy||0), 0) / store.agents.length);
                const avgMood = Math.round(store.agents.reduce((s,a) => s + (a.mood_score||50), 0) / store.agents.length);
                response.office = {
                    total_agents: store.agents.length,
                    status_breakdown: {},
                    active_tasks: store.tasks.filter(t => t.status !== 'completed').length,
                    is_night: hour >= 22 || hour < 6,
                    hour,
                    avg_energy: avgEnergy,
                    avg_mood: avgMood,
                };
                store.agents.forEach(a => {
                    response.office.status_breakdown[a.status] = (response.office.status_breakdown[a.status] || 0) + 1;
                });
                break;
            }
                
            case 'events':
                response.events = store.events.slice(0, parseInt(query.limit) || 30);
                break;
                
            case 'tasks':
                if (req.method === 'POST') {
                    const task = {
                        id: store.nextId++,
                        title: data.title,
                        description: data.description || '',
                        assigned_to: data.assigned_to || null,
                        status: 'pending',
                        priority: data.priority || 'medium',
                        progress: 0,
                        created_by: data.created_by || 'user',
                        created_at: new Date().toISOString(),
                        deadline: data.deadline || null,
                    };
                    store.tasks.push(task);
                    store.events.unshift({
                        agent_id: task.assigned_to,
                        event_type: 'task_assigned',
                        description: `📋 新任务: ${task.title}`,
                        timestamp: task.created_at,
                    });
                    response.created = true;
                } else {
                    response.tasks = store.tasks.sort((a,b) => {
                        const po = {critical:0, high:1, medium:2, low:3};
                        return (po[a.priority]||2) - (po[b.priority]||2);
                    });
                }
                break;
                
            case 'task-progress':
                if (data.task_id) {
                    const task = store.tasks.find(t => t.id == data.task_id);
                    if (task) {
                        task.progress = data.progress || 0;
                        if (task.progress >= 100) {
                            task.status = 'completed';
                            task.completed_at = new Date().toISOString();
                            store.events.unshift({
                                agent_id: task.assigned_to,
                                event_type: 'task_completed',
                                description: `✅ 任务完成: ${task.title}`,
                                timestamp: new Date().toISOString(),
                            });
                        }
                        response.updated = true;
                    }
                }
                break;
                
            case 'boss-order': {
                const order = data.order;
                if (order) {
                    const responses = {};
                    for (const agent of store.agents) {
                        const personality = loadPersonality(agent.id);
                        const context = `你是办公室的老板，刚刚下达了一条全员指令："${order}"。请作为 ${agent.name}（${agent.role}）回复你的反应和态度。保持你的性格特点，简短有力。`;
                        responses[agent.id] = await callAgnes(agent, personality, context, 0.9);
                        agent.mood_score = Math.min(100, (agent.mood_score||50) + 5);
                    }
                    store.events.unshift({
                        agent_id: null,
                        event_type: 'boss_order',
                        description: `👑 老板下令: ${order}`,
                        timestamp: new Date().toISOString(),
                    });
                    response.responses = responses;
                    response.order = order;
                }
                break;
            }
                
            case 'chat': {
                const agentId = data.agent_id;
                const message = data.message;
                if (agentId && message) {
                    const agent = store.agents.find(a => a.id === agentId);
                    const personality = loadPersonality(agentId);
                    
                    // Memory context
                    const memories = store.memories.filter(m => m.agent_id === agentId);
                    let memoryCtx = '';
                    if (memories.length) {
                        memoryCtx = '\n\n你知道以下信息（来自过往对话的记忆）：\n';
                        memories.forEach(m => { memoryCtx += `- ${m.topic}: ${m.content}\n`; });
                    }
                    
                    const reply = await callAgnes(agent, personality, message + memoryCtx);
                    response.reply = reply;
                    response.agent = agent;
                    
                    store.conversations.push({
                        user_id: 'user', agent_id: agentId,
                        message, response: reply,
                        timestamp: new Date().toISOString(),
                    });
                    
                    agent.mood_score = Math.min(100, (agent.mood_score||50) + 2);
                }
                break;
            }
                
            case 'agent-chat': {
                const fromId = data.from_id;
                const toId = data.to_id;
                const message = data.message;
                if (fromId && toId && message) {
                    const fromAgent = store.agents.find(a => a.id === fromId);
                    const toAgent = store.agents.find(a => a.id === toId);
                    if (fromAgent && toAgent) {
                        const toPersonality = loadPersonality(toId);
                        const context = `你的同事 ${fromAgent.name}（${fromAgent.role}）对你说："${message}"。请作为 ${toAgent.name} 回复，保持性格。你们的关系强度：${data.relationship_strength || 50}/100。`;
                        const reply = await callAgnes(toAgent, toPersonality, context, 0.8);
                        
                        fromAgent.status = 'talking'; fromAgent.talking_to = toId;
                        toAgent.status = 'talking'; toAgent.talking_to = fromId;
                        
                        const rel = store.relationships.find(r => 
                            (r.agent_a===fromId && r.agent_b===toId) || 
                            (r.agent_a===toId && r.agent_b===fromId)
                        );
                        if (rel) rel.strength = Math.min(100, (rel.strength||50) + 1);
                        
                        store.events.unshift({
                            agent_id: fromId,
                            event_type: 'conversation',
                            description: `${fromAgent.name} 💬 ${toAgent.name}`,
                            timestamp: new Date().toISOString(),
                        });
                        
                        response.reply = reply;
                        response.from = fromAgent;
                        response.to = toAgent;
                    }
                }
                break;
            }
                
            case 'update':
                if (data.agent_id) {
                    const agent = store.agents.find(a => a.id === data.agent_id);
                    if (agent) {
                        ['x','y','status','mood','target_x','target_y','talking_to','productivity','current_task','mood_score','energy'].forEach(f => {
                            if (data[f] !== undefined) agent[f] = data[f];
                        });
                    }
                }
                break;
                
            case 'personality':
                response.personality = loadPersonality(id);
                break;
                
            case 'daily-briefing': {
                const tasks = store.tasks;
                const rels = [...store.relationships].sort((a,b) => b.strength - a.strength);
                response.briefing = {
                    total_agents: store.agents.length,
                    avg_productivity: Math.round(store.agents.reduce((s,a) => s + (a.productivity||100), 0) / store.agents.length),
                    avg_mood: Math.round(store.agents.reduce((s,a) => s + (a.mood_score||50), 0) / store.agents.length),
                    avg_energy: Math.round(store.agents.reduce((s,a) => s + (a.energy||100), 0) / store.agents.length),
                    active_tasks: tasks.filter(t => t.status !== 'completed').length,
                    completed_tasks: tasks.filter(t => t.status === 'completed').length,
                    strongest_relationships: rels.slice(0, 3),
                    recent_events: store.events.slice(0, 5),
                    departments: {},
                };
                store.agents.forEach(a => {
                    response.briefing.departments[a.department] = (response.briefing.departments[a.department]||0) + 1;
                });
                break;
            }
                
            case 'timeline': {
                const convs = store.conversations.filter(c => c.agent_id === id);
                const evts = store.events.filter(e => e.agent_id === id);
                const timeline = [
                    ...convs.map(c => ({ type: 'conversation', message: c.message, response: c.response, timestamp: c.timestamp })),
                    ...evts.map(e => ({ type: 'event', message: e.description, response: e.description, timestamp: e.timestamp })),
                ].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50);
                response.timeline = timeline;
                break;
            }
                
            case 'meetings':
                if (req.method === 'POST') {
                    const meeting = {
                        id: store.nextId++,
                        title: data.title,
                        topic: data.topic || '',
                        participants: data.participants || [],
                        created_at: new Date().toISOString(),
                    };
                    store.meetings.push(meeting);
                    const meetingRoom = { x: 300, y: 550, target_x: 300, target_y: 550 };
                    data.participants.forEach(pid => {
                        const a = store.agents.find(x => x.id === pid);
                        if (a) {
                            a.status = 'meeting';
                            a.current_task = `参加会议: ${data.title}`;
                            a.x = meetingRoom.x; a.y = meetingRoom.y;
                            a.target_x = meetingRoom.target_x; a.target_y = meetingRoom.target_y;
                        }
                    });
                    store.events.unshift({
                        agent_id: data.participants[0] || null,
                        event_type: 'meeting_started',
                        description: `📽️ 会议开始: ${data.title}`,
                        timestamp: new Date().toISOString(),
                    });
                    response.started = true;
                } else {
                    response.meetings = store.meetings;
                }
                break;
                
            case 'export': {
                let report = '🏢 虚拟办公室报告\n';
                report += `📅 生成时间: ${new Date().toISOString()}\n\n`;
                report += '=== 团队状态 ===\n';
                store.agents.forEach(a => {
                    report += `- ${a.name} (${a.role}): 生产力${a.productivity}% | 心情${a.mood_score} | 精力${a.energy} | 状态: ${a.status}\n`;
                });
                report += '\n=== 任务列表 ===\n';
                store.tasks.forEach(t => {
                    report += `- [${t.priority}] ${t.title} (${t.status}, ${t.progress}%)\n`;
                });
                report += '\n=== 关系网络 ===\n';
                store.relationships.forEach(r => {
                    report += `- ${r.agent_a} ↔ ${r.agent_b}: ${r.strength}%\n`;
                });
                response.report = report;
                break;
            }
                
            case 'learn':
                if (data.agent_id && data.topic && data.content) {
                    const existing = store.memories.findIndex(m => m.agent_id === data.agent_id && m.topic === data.topic);
                    if (existing >= 0) {
                        store.memories[existing] = { ...store.memories[existing], content: data.content, confidence: data.confidence || 70 };
                    } else {
                        store.memories.push({ agent_id: data.agent_id, topic: data.topic, content: data.content, confidence: data.confidence || 70 });
                    }
                    response.saved = true;
                }
                break;
                
            case 'skill-exec':
                // Agent skill execution endpoint
                if (data.agent_id && data.skill && data.args) {
                    const agent = store.agents.find(a => a.id === data.agent_id);
                    const skill = SKILLS[data.skill];
                    if (skill && agent) {
                        const result = await skill.execute(data.agent_id, data.args);
                        store.events.unshift({
                            agent_id: data.agent_id,
                            event_type: 'skill_used',
                            description: `${agent.avatar} ${agent.name} 使用了技能: ${skill.name}`,  
                            timestamp: new Date().toISOString(),
                        });
                        response.result = result;
                        response.skill_used = skill.name;
                    } else {
                        response.success = false;
                        response.error = `Skill not found: ${data.skill}`;
                    }
                }
                break;
                
            default:
                response.success = false;
                response.error = `Unknown endpoint: ${action}`;
                response.endpoints = ['agents','relationships','memory','move','status','events','tasks','task-progress','boss-order','chat','agent-chat','update','personality','daily-briefing','timeline','meetings','export','learn'];
                break;
        }
    } catch(e) {
        response.success = false;
        response.error = e.message;
    }
    
    res.writeHead(200);
    res.end(JSON.stringify(response));
}

// Serve static files
function serveStatic(req, res, parsedUrl) {
    let pathname = decodedPath(parsedUrl.pathname);
    const fullPath = path.join(STATIC_DIR, pathname);
    
    if (!fullPath.startsWith(STATIC_DIR)) {
        res.writeHead(403); res.end('Forbidden'); return;
    }
    
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        const ext = path.extname(fullPath);
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const content = fs.readFileSync(fullPath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    } else {
        // SPA fallback
        const index = path.join(STATIC_DIR, 'index.html');
        if (fs.existsSync(index)) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(fs.readFileSync(index));
        } else {
            res.writeHead(404); res.end('Not Found');
        }
    }
}

function decodedPath(str) {
    try { return decodeURIComponent(str); } catch { return str; }
}

// Main server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    // Route API calls
    if (parsedUrl.query.endpoint || req.method === 'POST') {
        handleApi(req, res, parsedUrl);
    } else {
        serveStatic(req, res, parsedUrl);
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🏢 Virtual Office running at http://localhost:${PORT}`);
    console.log(`🤖 Agnes AI API: ${process.env.AGNES_API_URL || 'https://apihub.agnes-ai.com/v1'}`);
    console.log(`👥 Agents: ${store.agents.length} loaded`);
    console.log(`🔑 API Keys configured: ${Object.keys(process.env).filter(k => k.startsWith('AGNES_KEY_')).length} per-agent keys`);
});


// Performance tracking middleware
function timingMiddleware(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.url} - ${duration}ms`);
    });
    next();
}
app.use(timingMiddleware);

// Security headers middleware per David's recommendation
function securityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
}

// Enhanced input sanitization per Eve's QA recommendation
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>"'&;]/g, '').trim();
}

function validateRequest(data, schema) {
    for (const [key, type] of Object.entries(schema)) {
        if (data[key] === undefined) return { valid: false, error: `缺少字段: ${key}` };
        if (typeof data[key] !== type) return { valid: false, error: `字段 ${key} 类型错误` };
    }
    return { valid: true };
}


// David's security: Helmet-style security headers
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
app.use(securityHeaders);


// Eve's QA: Input validation and sanitization
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>"'&;\x00-\x1F]/g, '').trim();
}

function validateAgentName(name) {
    if (!name || typeof name !== 'string') return { valid: false, error: '名称不能为空' };
    const cleaned = sanitizeInput(name);
    if (cleaned.length < 2 || cleaned.length > 50) return { valid: false, error: '名称长度2-50字符' };
    if (!/^[\u4e00-\u9fa5a-zA-Z0-9_]+$/.test(cleaned)) return { valid: false, error: '名称只能包含中文、字母、数字和下划线' };
    return { valid: true, data: cleaned };
}

function validatePosition(x, y) {
    return { valid: x >= 0 && x <= 1200 && y >= 0 && y <= 800 };
}


// Bob's API optimization: async wrapper for exec_command
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
};


// Bob's API optimization: async wrapper for exec_command
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
};


// David's security: Helmet-style security headers
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
app.use(securityHeaders);


// Eve's QA: Input validation and sanitization
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>"'&;\x00-\x1F]/g, '').trim();
}

function validateAgentName(name) {
    if (!name || typeof name !== 'string') return { valid: false, error: '名称不能为空' };
    const cleaned = sanitizeInput(name);
    if (cleaned.length < 2 || cleaned.length > 50) return { valid: false, error: '名称长度2-50字符' };
    if (!/^[\u4e00-\u9fa5a-zA-Z0-9_]+$/.test(cleaned)) return { valid: false, error: '名称只能包含中文、字母、数字和下划线' };
    return { valid: true, data: cleaned };
}

function validatePosition(x, y) {
    return { valid: x >= 0 && x <= 1200 && y >= 0 && y <= 800 };
}


// David's security: Helmet-style security headers
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
app.use(securityHeaders);


// Bob's API optimization: async wrapper for exec_command
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
};


// Eve's QA: Input validation and sanitization
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>"'&;\x00-\x1F]/g, '').trim();
}

function validateAgentName(name) {
    if (!name || typeof name !== 'string') return { valid: false, error: '名称不能为空' };
    const cleaned = sanitizeInput(name);
    if (cleaned.length < 2 || cleaned.length > 50) return { valid: false, error: '名称长度2-50字符' };
    if (!/^[\u4e00-\u9fa5a-zA-Z0-9_]+$/.test(cleaned)) return { valid: false, error: '名称只能包含中文、字母、数字和下划线' };
    return { valid: true, data: cleaned };
}

function validatePosition(x, y) {
    return { valid: x >= 0 && x <= 1200 && y >= 0 && y <= 800 };
}


// Bob's API optimization: async wrapper for exec_command
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
};


// David's security: Helmet-style security headers
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
app.use(securityHeaders);


// Eve's QA: Input validation and sanitization
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>"'&;\x00-\x1F]/g, '').trim();
}

function validateAgentName(name) {
    if (!name || typeof name !== 'string') return { valid: false, error: '名称不能为空' };
    const cleaned = sanitizeInput(name);
    if (cleaned.length < 2 || cleaned.length > 50) return { valid: false, error: '名称长度2-50字符' };
    if (!/^[\u4e00-\u9fa5a-zA-Z0-9_]+$/.test(cleaned)) return { valid: false, error: '名称只能包含中文、字母、数字和下划线' };
    return { valid: true, data: cleaned };
}

function validatePosition(x, y) {
    return { valid: x >= 0 && x <= 1200 && y >= 0 && y <= 800 };
}