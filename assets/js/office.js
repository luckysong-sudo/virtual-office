/**
 * Virtual Office - Frontend Application v2
 * Interactive office world with AI agents, event stream, and detail panels
 */

const API = './api/index.php';

// ===== State =====
const state = {
    agents: [],
    selectedAgent: null,
    conversations: {},
    tasks: [],
    events: [],
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    simulationRunning: true,
};

// ===== Office Layout =====
const OFFICE = {
    width: 1200,
    height: 800,
    rooms: [
        { id: 'lobby', name: '大堂', x: 400, y: 50, w: 400, h: 120, color: 'rgba(15, 23, 42, 0.6)' },
        { id: 'engineering', name: '工程区', x: 50, y: 200, w: 350, h: 250, color: 'rgba(30, 41, 59, 0.8)' },
        { id: 'design', name: '设计区', x: 450, y: 200, w: 300, h: 250, color: 'rgba(30, 41, 59, 0.8)' },
        { id: 'ops', name: '运维区', x: 800, y: 200, w: 350, h: 250, color: 'rgba(30, 41, 59, 0.8)' },
        { id: 'meeting', name: '会议室', x: 100, y: 500, w: 400, h: 150, color: 'rgba(30, 41, 59, 0.8)' },
        { id: 'break', name: '休息区', x: 600, y: 500, w: 500, h: 150, color: 'rgba(30, 41, 59, 0.8)' },
    ]
};

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    loadAllData();
    setupEventListeners();
    startSimulation();
    startEventStream();
    
    setTimeout(() => {
        const ls = document.getElementById('loading-screen');
        ls.style.opacity = '0';
        setTimeout(() => ls.style.display = 'none', 500);
    }, 2000);
});

// ===== Canvas =====
function initCanvas() {
    const canvas = document.getElementById('floor-plan');
    const ctx = canvas.getContext('2d');
    
    function resize() {
        canvas.width = OFFICE.width;
        canvas.height = OFFICE.height;
        drawFloorPlan(ctx);
    }
    resize();
    
    const container = document.querySelector('.office-canvas');
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        state.zoom = Math.max(0.3, Math.min(3, state.zoom + (e.deltaY > 0 ? -0.1 : 0.1)));
        document.getElementById('zoom-level').textContent = Math.round(state.zoom * 100) + '%';
        updateCanvasTransform();
    });
    
    let isPanning = false;
    container.addEventListener('mousedown', (e) => {
        if (e.target === canvas || e.target === container) {
            isPanning = true;
            state.offsetX = e.clientX - state.offsetX;
            state.offsetY = e.clientY - state.offsetY;
            container.style.cursor = 'grabbing';
        }
    });
    window.addEventListener('mousemove', (e) => {
        if (isPanning) {
            state.offsetX = e.clientX - state.offsetX;
            state.offsetY = e.clientY - state.offsetY;
            updateCanvasTransform();
        }
    });
    window.addEventListener('mouseup', () => {
        isPanning = false;
        container.style.cursor = 'grab';
    });
    container.style.cursor = 'grab';
}

function drawFloorPlan(ctx) {
    const W = OFFICE.width, H = OFFICE.height;
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, W, H);
    
    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    
    // Rooms
    OFFICE.rooms.forEach(room => {
        ctx.fillStyle = room.color;
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
        ctx.lineWidth = 2;
        roundRect(ctx, room.x, room.y, room.w, room.h, 12);
        ctx.fill(); ctx.stroke();
        
        ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(room.name.toUpperCase(), room.x + room.w / 2, room.y + 18);
    });
    
    // Corridors
    ctx.fillStyle = 'rgba(22, 33, 62, 0.4)';
    ctx.fillRect(0, 170, W, 30);
    ctx.fillRect(0, 470, W, 30);
    ctx.fillRect(400, 170, 30, 300);
    ctx.fillRect(770, 170, 30, 300);
    
    // Decorations
    const plants = [[30,100],[1170,100],[30,700],[1170,700],[580,100],[620,100],[580,700],[620,700]];
    plants.forEach(([px, py]) => { ctx.font='18px sans-serif'; ctx.textAlign='center'; ctx.fillText('🪴', px, py); });
    ctx.font = '16px sans-serif'; ctx.fillText('☕', 850, 575);
    ctx.font = '9px sans-serif'; ctx.fillStyle = 'rgba(148,163,184,0.3)'; ctx.fillText('咖啡机', 850, 595);
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
}

function updateCanvasTransform() {
    const els = [document.getElementById('floor-plan'), document.getElementById('agents-layer'), document.getElementById('bubbles-layer')];
    const t = `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.zoom})`;
    els.forEach(el => {
        el.style.position = 'absolute';
        el.style.left = '0'; el.style.top = '0';
        el.style.transform = t;
        el.style.transformOrigin = '0 0';
    });
}

// ===== Data Loading =====
async function apiCall(endpoint, method = 'GET', body = null) {
    const url = endpoint ? `${API}?endpoint=${endpoint}` : API;
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    try {
        const res = await fetch(url, opts);
        return await res.json();
    } catch (err) {
        console.error('API Error:', err);
        return { success: false, error: err.message };
    }
}

async function loadAllData() {
    const [agentsRes, tasksRes] = await Promise.all([
        apiCall('agents'),
        apiCall('tasks'),
    ]);
    
    if (agentsRes.success && agentsRes.agents) {
        state.agents = agentsRes.agents;
        renderAgentList();
        renderAgentsOnCanvas();
        updateOfficeStats();
    }
    
    if (tasksRes.success && tasksRes.tasks) {
        state.tasks = tasksRes.tasks;
        document.getElementById('task-count').textContent = tasksRes.tasks.length;
    }
}

// ===== Rendering =====
function renderAgentList() {
    const list = document.getElementById('agent-list');
    list.innerHTML = '';
    
    state.agents.forEach(agent => {
        const div = document.createElement('div');
        div.className = 'agent-list-item';
        div.dataset.id = agent.id;
        div.innerHTML = `
            <span class="agent-avatar">${agent.avatar}</span>
            <div class="agent-info">
                <div class="agent-name">${agent.name}</div>
                <div class="agent-role">${agent.role}</div>
            </div>
            <span class="agent-status-dot status-${agent.status}"></span>
        `;
        div.addEventListener('click', () => selectAgent(agent.id));
        list.appendChild(div);
    });
}

function renderAgentsOnCanvas() {
    const layer = document.getElementById('agents-layer');
    layer.innerHTML = '';
    layer.style.width = OFFICE.width + 'px';
    layer.style.height = OFFICE.height + 'px';
    
    state.agents.forEach(agent => {
        const div = document.createElement('div');
        div.className = 'agent-entity';
        div.id = `agent-${agent.id}`;
        div.style.left = agent.x + 'px';
        div.style.top = agent.y + 'px';
        div.innerHTML = `
            <div class="agent-body ${agent.status}">${agent.avatar}</div>
            <div class="agent-label">${agent.name.split(' ')[0]}</div>
            <div class="agent-task-label">${agent.current_task || ''}</div>
        `;
        div.addEventListener('click', (e) => { e.stopPropagation(); selectAgent(agent.id); });
        layer.appendChild(div);
    });
}

function updateOfficeStats() {
    const total = state.agents.length;
    const avgProd = Math.round(state.agents.reduce((s, a) => s + parseFloat(a.productivity || 0), 0) / total);
    document.getElementById('agent-count').textContent = total;
    document.getElementById('avg-productivity').textContent = avgProd;
}

// ===== Agent Selection & Chat =====
function selectAgent(agentId) {
    state.selectedAgent = agentId;
    
    document.querySelectorAll('.agent-list-item').forEach(el => {
        el.classList.toggle('active', el.dataset.id === agentId);
    });
    
    const agent = state.agents.find(a => a.id === agentId);
    if (!agent) return;
    
    document.getElementById('panel-placeholder').style.display = 'none';
    document.getElementById('panel-content').style.display = 'flex';
    
    document.getElementById('panel-header').innerHTML = `
        <span class="avatar">${agent.avatar}</span>
        <div class="info">
            <div class="name">${agent.name}</div>
            <div class="role">${agent.role}</div>
        </div>
        <span class="status-badge">${agent.status}</span>
    `;
    
    if (!state.conversations[agentId]) {
        state.conversations[agentId] = [];
    }
    renderMessages(agentId);
    renderDetail(agent);
    switchTab('chat');
    
    document.getElementById('chat-input').focus();
}

function renderMessages(agentId) {
    const container = document.getElementById('panel-messages');
    container.innerHTML = '';
    
    const msgs = state.conversations[agentId] || [];
    msgs.forEach(msg => {
        const div = document.createElement('div');
        div.className = `chat-msg ${msg.type}`;
        div.textContent = msg.content;
        container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message || !state.selectedAgent) return;
    
    input.value = '';
    
    if (!state.conversations[state.selectedAgent]) {
        state.conversations[state.selectedAgent] = [];
    }
    state.conversations[state.selectedAgent].push({ type: 'user', content: message });
    
    const agentId = state.selectedAgent;
    renderMessages(agentId);
    
    // Typing indicator
    const container = document.getElementById('panel-messages');
    const typing = document.createElement('div');
    typing.className = 'chat-msg agent talking-indicator';
    typing.textContent = '⌨️ 正在输入...';
    typing.id = 'typing-indicator';
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
    
    apiCall('chat', 'POST', { agent_id: agentId, message: message })
        .then(data => {
            const indicator = document.getElementById('typing-indicator');
            if (indicator) indicator.remove();
            
            if (data.reply) {
                state.conversations[agentId].push({ type: 'agent', content: data.reply });
                renderMessages(agentId);
                showSpeechBubble(agentId, data.reply);
            }
        });
}

function showSpeechBubble(agentId, text) {
    const layer = document.getElementById('bubbles-layer');
    const agent = state.agents.find(a => a.id === agentId);
    if (!agent) return;
    
    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    bubble.textContent = text;
    bubble.style.left = agent.x + 'px';
    bubble.style.top = (agent.y - 30) + 'px';
    layer.appendChild(bubble);
    setTimeout(() => bubble.remove(), 6000);
}

// ===== Tabs =====
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.style.display = panel.id === `tab-${tabName}` ? 'flex' : 'none';
        panel.style.flexDirection = 'column';
    });
}

// ===== Detail Panel =====
function renderDetail(agent) {
    const content = document.getElementById('detail-content');
    const prod = parseFloat(agent.productivity || 0);
    const prodClass = prod >= 85 ? 'high' : prod >= 60 ? 'medium' : 'low';
    
    content.innerHTML = `
        <div class="detail-avatar-large">${agent.avatar}</div>
        <div class="detail-name-large">${agent.name}</div>
        <div class="detail-role-large">${agent.role}</div>
        
        <div class="detail-section">
            <h4>基本信息</h4>
            <div class="detail-row"><span class="label">状态</span><span class="value status-${agent.status}">${agent.status}</span></div>
            <div class="detail-row"><span class="label">心情</span><span class="value">${agent.mood || 'neutral'}</span></div>
            <div class="detail-row"><span class="label">部门</span><span class="value">${agent.department}</span></div>
            <div class="detail-row"><span class="label">当前位置</span><span class="value">(${Math.round(agent.x)}, ${Math.round(agent.y)})</span></div>
        </div>
        
        <div class="detail-section">
            <h4>工作效率</h4>
            <div class="detail-row">
                <span class="label">生产力</span>
                <span class="value">${prod}%</span>
            </div>
            <div class="progress-bar"><div class="progress-fill ${prodClass}" style="width:${prod}%"></div></div>
        </div>
        
        <div class="detail-section">
            <h4>当前任务</h4>
            <div class="detail-row"><span class="value" style="font-size:0.8rem">${agent.current_task || '空闲中'}</span></div>
        </div>
        
        <div class="detail-section">
            <h4>正在交流</h4>
            <div class="detail-row"><span class="value">${agent.talking_to ? '与 ' + agent.talking_to + ' 聊天' : '无'}</span></div>
        </div>
    `;
}

// ===== Event Stream =====
function startEventStream() {
    loadEvents();
    setInterval(loadEvents, 5000);
}

async function loadEvents() {
    const data = await apiCall('events?limit=15');
    if (data.success && data.events) {
        const list = document.getElementById('event-list');
        const newEvents = data.events.filter(e => !state.events.find(old => old.id === e.id));
        
        newEvents.forEach(ev => {
            const time = ev.timestamp ? ev.timestamp.slice(11, 16) : '--:--';
            const icons = { conversation: '💬', task_assigned: '📋', meeting: '🤝', coffee: '☕' };
            const icon = icons[ev.event_type] || '📌';
            
            const div = document.createElement('div');
            div.className = 'event-item';
            div.innerHTML = `<span class="event-time">${time}</span>${icon} ${ev.description || ''}`;
            list.prepend(div);
            
            // Keep max 30 events visible
            while (list.children.length > 30) list.removeChild(list.lastChild);
        });
        
        state.events = data.events;
    }
}

// ===== Simulation =====
function startSimulation() {
    setInterval(simulationTick, 2000);
    setInterval(ambientChat, 12000);
    setInterval(autoMoveAgents, 8000);
}

function simulationTick() {
    if (!state.simulationRunning) return;
    
    state.agents.forEach(agent => {
        const dx = agent.target_x - agent.x;
        const dy = agent.target_y - agent.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 2) {
            const speed = parseFloat(agent.speed || 1);
            agent.x += (dx / dist) * speed * 12;
            agent.y += (dy / dist) * speed * 12;
        } else {
            const room = OFFICE.rooms[Math.floor(Math.random() * OFFICE.rooms.length)];
            agent.target_x = room.x + 40 + Math.random() * (room.w - 80);
            agent.target_y = room.y + 40 + Math.random() * (room.h - 80);
            
            if (Math.random() < 0.08) {
                const statuses = ['working','idle','coding','creative','testing','monitoring','researching'];
                agent.status = statuses[Math.floor(Math.random() * statuses.length)];
                updateAgentDOM(agent);
            }
        }
        
        updateAgentDOM(agent);
    });
}

function updateAgentDOM(agent) {
    const el = document.getElementById(`agent-${agent.id}`);
    if (!el) return;
    el.style.left = agent.x + 'px';
    el.style.top = agent.y + 'px';
    
    const body = el.querySelector('.agent-body');
    if (body) {
        body.className = 'agent-body ' + (agent.status || 'idle');
    }
    
    const taskLabel = el.querySelector('.agent-task-label');
    if (taskLabel) taskLabel.textContent = agent.current_task || '';
}

function autoMoveAgents() {
    if (!state.simulationRunning) return;
    // Randomly move a couple agents to simulate busyness
    const shuffled = [...state.agents].sort(() => Math.random() - 0.5).slice(0, 2);
    shuffled.forEach(agent => {
        const room = OFFICE.rooms[Math.floor(Math.random() * OFFICE.rooms.length)];
        agent.target_x = room.x + 40 + Math.random() * (room.w - 80);
        agent.target_y = room.y + 40 + Math.random() * (room.h - 80);
    });
}

// Ambient conversations between agents
function ambientChat() {
    if (!state.simulationRunning || state.agents.length < 2) return;
    if (Math.random() > 0.25) return;
    
    const i = Math.floor(Math.random() * state.agents.length);
    const j = (i + 1 + Math.floor(Math.random() * (state.agents.length - 1))) % state.agents.length;
    const a = state.agents[i];
    const b = state.agents[j];
    
    const phrases = [
        `${a.name.split(' ')[0]} 走向 ${b.name.split(' ')[0]} 的工位`,
        `${a.name.split(' ')[0]} 和 ${b.name.split(' ')[0]} 在走廊相遇`,
        `${a.name.split(' ')[0]} 拍了拍 ${b.name.split(' ')[0]} 的肩膀`,
    ];
    
    showToast(phrases[Math.floor(Math.random() * phrases.length)]);
    
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    a.target_x = mx - 30; a.target_y = my;
    b.target_x = mx + 30; b.target_y = my;
}

// ===== Event Listeners =====
function setupEventListeners() {
    document.getElementById('chat-send').addEventListener('click', sendMessage);
    document.getElementById('chat-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    document.getElementById('btn-new-task').addEventListener('click', () => {
        document.getElementById('modal-task').style.display = 'flex';
        populateAssignees();
    });
    
    document.getElementById('btn-pause').addEventListener('click', toggleSimulation);
}

function populateAssignees() {
    const sel = document.getElementById('task-assignee');
    sel.innerHTML = '<option value="">不指定分配</option>';
    state.agents.forEach(a => {
        sel.innerHTML += `<option value="${a.id}">${a.avatar} ${a.name} (${a.role})</option>`;
    });
}

async function createTask() {
    const title = document.getElementById('task-title').value.trim();
    if (!title) { showToast('请输入任务标题'); return; }
    
    const data = await apiCall('tasks', 'POST', {
        title,
        description: document.getElementById('task-desc').value.trim(),
        assigned_to: document.getElementById('task-assignee').value || null,
        priority: document.getElementById('task-priority').value,
        created_by: 'user',
    });
    
    if (data.created) {
        showToast('✅ 任务已创建！');
        closeModal();
        loadAllData();
    }
}

function closeModal() {
    document.getElementById('modal-task').style.display = 'none';
    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value = '';
}

function toggleSimulation() {
    state.simulationRunning = !state.simulationRunning;
    const btn = document.getElementById('btn-pause');
    btn.textContent = state.simulationRunning ? '⏸️ 暂停' : '▶️ 继续';
    showToast(state.simulationRunning ? '🟢 模拟已恢复' : '⏸️ 模拟已暂停');
}

function zoomIn() {
    state.zoom = Math.min(3, state.zoom + 0.15);
    document.getElementById('zoom-level').textContent = Math.round(state.zoom * 100) + '%';
    updateCanvasTransform();
}

function zoomOut() {
    state.zoom = Math.max(0.3, state.zoom - 0.15);
    document.getElementById('zoom-level').textContent = Math.round(state.zoom * 100) + '%';
    updateCanvasTransform();
}

function resetView() {
    state.zoom = 1; state.offsetX = 0; state.offsetY = 0;
    document.getElementById('zoom-level').textContent = '100%';
    updateCanvasTransform();
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.style.display = 'none', 3000);
}
