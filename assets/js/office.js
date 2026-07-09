/**
 * Virtual Office - Frontend Application
 * Manages the interactive office world, agent movement, and communication
 */

const API = './api/index.php';

// ===== State =====
const state = {
    agents: [],
    selectedAgent: null,
    conversations: {},
    tasks: [],
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    simulationRunning: true,
    moveTimers: {},
};

// ===== Office Dimensions =====
const OFFICE = {
    width: 1200,
    height: 800,
    rooms: [
        { id: 'lobby', name: '大堂', x: 400, y: 50, w: 400, h: 120 },
        { id: 'engineering', name: '工程区', x: 50, y: 200, w: 350, h: 250 },
        { id: 'design', name: '设计区', x: 450, y: 200, w: 300, h: 250 },
        { id: 'ops', name: '运维区', x: 800, y: 200, w: 350, h: 250 },
        { id: 'meeting', name: '会议室', x: 100, y: 500, w: 400, h: 150 },
        { id: 'break', name: '休息区', x: 600, y: 500, w: 500, h: 150 },
    ]
};

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    loadAgents();
    loadTasks();
    setupEventListeners();
    startSimulation();
    
    // Hide loading screen
    setTimeout(() => {
        const ls = document.getElementById('loading-screen');
        ls.style.opacity = '0';
        setTimeout(() => ls.style.display = 'none', 500);
    }, 2200);
});

// ===== Canvas Setup =====
function initCanvas() {
    const canvas = document.getElementById('floor-plan');
    const ctx = canvas.getContext('2d');
    
    function resize() {
        canvas.width = OFFICE.width;
        canvas.height = OFFICE.height;
        drawFloorPlan(ctx);
    }
    resize();
    window.addEventListener('resize', resize);
    
    // Pan & Zoom
    const container = document.querySelector('.office-canvas');
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        state.zoom = Math.max(0.3, Math.min(3, state.zoom + delta));
        document.getElementById('zoom-level').textContent = Math.round(state.zoom * 100) + '%';
        updateCanvasTransform();
    });
    
    // Drag to pan
    let isPanning = false;
    container.addEventListener('mousedown', (e) => {
        if (e.target === canvas || e.target === container) {
            isPanning = true;
            state.dragStart = { x: e.clientX - state.offsetX, y: e.clientY - state.offsetY };
            container.style.cursor = 'grabbing';
        }
    });
    window.addEventListener('mousemove', (e) => {
        if (isPanning) {
            state.offsetX = e.clientX - state.dragStart.x;
            state.offsetY = e.clientY - state.dragStart.y;
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
    
    // Background grid
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, W, H);
    
    // Grid lines
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
        // Room background
        ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.lineWidth = 2;
        roundRect(ctx, room.x, room.y, room.w, room.h, 12);
        ctx.fill();
        ctx.stroke();
        
        // Room label
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(room.name.toUpperCase(), room.x + room.w / 2, room.y + 20);
    });
    
    // Corridor
    ctx.fillStyle = 'rgba(22, 33, 62, 0.5)';
    ctx.fillRect(0, 170, W, 30);
    ctx.fillRect(0, 470, W, 30);
    ctx.fillRect(400, 170, 30, 300);
    ctx.fillRect(770, 170, 30, 300);
    
    // Plants decoration
    const plantPositions = [
        [30, 100], [1170, 100], [30, 700], [1170, 700],
        [580, 100], [620, 100], [580, 700], [620, 700]
    ];
    plantPositions.forEach(([px, py]) => {
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🪴', px, py);
    });
    
    // Coffee machine
    ctx.font = '18px sans-serif';
    ctx.fillText('☕', 850, 580);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'rgba(148,163,184,0.4)';
    ctx.fillText('咖啡机', 850, 600);
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function updateCanvasTransform() {
    const canvas = document.getElementById('floor-plan');
    const agentsLayer = document.getElementById('agents-layer');
    const bubblesLayer = document.getElementById('bubbles-layer');
    const t = `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.zoom})`;
    [canvas, agentsLayer, bubblesLayer].forEach(el => {
        el.style.transform = t;
        el.style.transformOrigin = '0 0';
    });
    canvas.style.position = 'absolute';
    canvas.style.left = '0'; canvas.style.top = '0';
    agentsLayer.style.position = 'absolute';
    agentsLayer.style.left = '0'; agentsLayer.style.top = '0';
    bubblesLayer.style.position = 'absolute';
    bubblesLayer.style.left = '0'; bubblesLayer.style.top = '0';
}

// ===== Data Loading =====
async function apiCall(params = '', method = 'GET', body = null) {
    const url = params ? `${API}?endpoint=${params}` : API;
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

async function loadAgents() {
    const data = await apiCall('agents');
    if (data.success && data.agents) {
        state.agents = data.agents;
        renderAgentList();
        renderAgentsOnCanvas();
        updateOfficeStats();
    }
}

async function loadTasks() {
    const data = await apiCall('tasks');
    if (data.success && data.tasks) {
        state.tasks = data.tasks;
        document.getElementById('task-count').textContent = data.tasks.length;
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
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            selectAgent(agent.id);
        });
        layer.appendChild(div);
    });
}

function updateOfficeStats() {
    const total = state.agents.length;
    const avgProd = Math.round(state.agents.reduce((s, a) => s + parseFloat(a.productivity || 0), 0) / total);
    document.getElementById('avg-productivity').textContent = avgProd;
}

// ===== Agent Selection & Chat =====
function selectAgent(agentId) {
    state.selectedAgent = agentId;
    
    // Highlight in list
    document.querySelectorAll('.agent-list-item').forEach(el => {
        el.classList.toggle('active', el.dataset.id === agentId);
    });
    
    const agent = state.agents.find(a => a.id === agentId);
    if (!agent) return;
    
    // Show panel
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
    
    // Init conversation
    if (!state.conversations[agentId]) {
        state.conversations[agentId] = [];
    }
    renderMessages(agentId);
    
    // Focus input
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
    
    // Add user message
    if (!state.conversations[state.selectedAgent]) {
        state.conversations[state.selectedAgent] = [];
    }
    state.conversations[state.selectedAgent].push({ type: 'user', content: message });
    
    const agentId = state.selectedAgent;
    renderMessages(agentId);
    
    // Show typing indicator
    const container = document.getElementById('panel-messages');
    const typing = document.createElement('div');
    typing.className = 'chat-msg agent talking-indicator';
    typing.textContent = '...';
    typing.id = 'typing-indicator';
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
    
    // Send to API
    apiCall('chat', 'POST', {
        agent_id: agentId,
        message: message
    }).then(data => {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
        
        if (data.reply) {
            state.conversations[agentId].push({ type: 'agent', content: data.reply });
            renderMessages(agentId);
            
            // Show speech bubble on canvas
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
    
    // Auto-remove after 5s
    setTimeout(() => bubble.remove(), 5000);
}

// ===== Simulation Loop =====
function startSimulation() {
    setInterval(simulationTick, 2000);
    setInterval(ambientChat, 15000);
}

function simulationTick() {
    if (!state.simulationRunning) return;
    
    state.agents.forEach(agent => {
        // Move towards target
        const dx = agent.target_x - agent.x;
        const dy = agent.target_y - agent.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 2) {
            const speed = parseFloat(agent.speed || 1);
            agent.x += (dx / dist) * speed * 15;
            agent.y += (dy / dist) * speed * 15;
        } else {
            // Pick new random position in a room
            const room = OFFICE.rooms[Math.floor(Math.random() * OFFICE.rooms.length)];
            agent.target_x = room.x + 40 + Math.random() * (room.w - 80);
            agent.target_y = room.y + 40 + Math.random() * (room.h - 80);
            
            // Occasionally change status
            if (Math.random() < 0.1) {
                const statuses = ['working', 'idle', 'coding', 'creative', 'testing', 'monitoring', 'researching'];
                agent.status = statuses[Math.floor(Math.random() * statuses.length)];
            }
        }
        
        // Update DOM position
        const el = document.getElementById(`agent-${agent.id}`);
        if (el) {
            el.style.left = agent.x + 'px';
            el.style.top = agent.y + 'px';
        }
        
        // Update task label
        const taskLabel = el?.querySelector('.agent-task-label');
        if (taskLabel && agent.current_task) {
            taskLabel.textContent = agent.current_task;
        }
    });
}

// Ambient conversation between agents
function ambientChat() {
    if (!state.simulationRunning || state.agents.length < 2) return;
    if (Math.random() > 0.3) return; // 30% chance
    
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
    
    // Make them walk toward each other
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
        sel.innerHTML += `<option value="${a.id}">${a.name} (${a.role})</option>`;
    });
}

async function createTask() {
    const title = document.getElementById('task-title').value.trim();
    if (!title) { showToast('请输入任务标题'); return; }
    
    const data = await apiCall('tasks', 'POST', {
        title: title,
        description: document.getElementById('task-desc').value.trim(),
        assigned_to: document.getElementById('task-assignee').value || null,
        priority: document.getElementById('task-priority').value,
        created_by: 'user',
    });
    
    if (data.created) {
        showToast('✅ 任务已创建！');
        closeModal();
        loadTasks();
        
        // Notify assigned agent
        if (data.assigned_to) {
            showToast(`📨 已向 ${state.agents.find(a => a.id === data.assigned_to)?.name} 分配任务`);
        }
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

// ===== Zoom Controls =====
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

// ===== Toast Notifications =====
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.style.display = 'none', 3000);
}
