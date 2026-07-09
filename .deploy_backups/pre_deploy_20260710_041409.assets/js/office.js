/**
 * Virtual Office v4 - Complete frontend
 */
const API = './api/index.php';
const state = {
    agents: [], selectedAgent: null, conversations: {}, tasks: [], events: [],
    zoom: 1, offsetX: 0, offsetY: 0, simulationRunning: true, nightMode: false,
    clockInterval: null, eventTimer: null, simTimer: null, ambientTimer: null
};

const OFFICE = {
    width: 1200, height: 800,
    rooms: [
        { id:'lobby', name:'大堂', x:400, y:50, w:400, h:120, color:'rgba(15,23,42,.6)' },
        { id:'engineering', name:'工程区', x:50, y:200, w:350, h:250, color:'rgba(30,41,59,.8)' },
        { id:'design', name:'设计区', x:450, y:200, w:300, h:250, color:'rgba(30,41,59,.8)' },
        { id:'ops', name:'运维区', x:800, y:200, w:350, h:250, color:'rgba(30,41,59,.8)' },
        { id:'meeting', name:'会议室', x:100, y:500, w:400, h:150, color:'rgba(30,41,59,.8)' },
        { id:'break', name:'休息区', x:600, y:500, w:500, h:150, color:'rgba(30,41,59,.8)' },
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    initCanvas(); loadAllData(); setupEvents(); startClock();
    startSimulation(); startEventStream();
    setTimeout(() => { const ls = document.getElementById('loading-screen'); ls.style.opacity = '0'; setTimeout(() => ls.style.display = 'none', 500); }, 2000);
});

// ===== Canvas =====
let lastFrameTime = 0;
const FRAME_INTERVAL = 1000 / 60; // Target 60fps

function initCanvas() {
    const canvas = document.getElementById('floor-plan');
    const ctx = canvas.getContext('2d');
    function resize() { canvas.width = OFFICE.width; canvas.height = OFFICE.height; drawFloorPlan(ctx); }
    resize();
    const container = document.querySelector('.office-canvas');
    container.addEventListener('wheel', e => {
        e.preventDefault();
        state.zoom = Math.max(.3, Math.min(3, state.zoom + (e.deltaY > 0 ? -.1 : .1)));
        document.getElementById('zoom-level').textContent = Math.round(state.zoom * 100) + '%';
        updateTransform();
    });
    let pan = false;
    container.addEventListener('mousedown', e => { if (e.target === canvas) { pan = true; state.offsetX = e.clientX - state.offsetX; state.offsetY = e.clientY - state.offsetY; container.style.cursor = 'grabbing'; } });
    window.addEventListener('mousemove', e => { if (pan) { state.offsetX = e.clientX - state.offsetX; state.offsetY = e.clientY - state.offsetY; updateTransform(); } });
    window.addEventListener('mouseup', () => { pan = false; container.style.cursor = 'grab'; });
    container.style.cursor = 'grab';
}

function drawFloorPlan(ctx) {
    const W = OFFICE.width, H = OFFICE.height;
    ctx.fillStyle = '#16213e'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.03)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    OFFICE.rooms.forEach(r => {
        ctx.fillStyle = r.color; ctx.strokeStyle = 'rgba(59,130,246,.25)'; ctx.lineWidth = 2;
        rr(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(148,163,184,.4)'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(r.name.toUpperCase(), r.x + r.w / 2, r.y + 18);
    });
    ctx.fillStyle = 'rgba(22,33,62,.4)';
    ctx.fillRect(0, 170, W, 30); ctx.fillRect(0, 470, W, 30);
    ctx.fillRect(400, 170, 30, 300); ctx.fillRect(770, 170, 30, 300);
    [[30,100],[1170,100],[30,700],[1170,700],[580,100],[620,100],[580,700],[620,700]].forEach(([x,y]) => { ctx.font='18px sans-serif'; ctx.textAlign='center'; ctx.fillText('🪴',x,y); });
    ctx.font='16px sans-serif'; ctx.fillText('☕',850,575);
    ctx.font='9px sans-serif'; ctx.fillStyle='rgba(148,163,184,.3)'; ctx.fillText('咖啡机',850,595);
}

function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath()}

function updateTransform() {
    ['floor-plan','agents-layer','bubbles-layer'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.position = 'absolute'; el.style.left = '0'; el.style.top = '0';
        el.style.transform = `translate(${state.offsetX}px,${state.offsetY}px) scale(${state.zoom})`;
        el.style.transformOrigin = '0 0';
    });
}

// ===== Debounce utility per Eve's QA recommendation =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== Keyboard shortcuts per Alice's UX recommendation =====
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        switch(e.key.toLowerCase()) {
            case 'n': document.getElementById('btn-new-task').click(); break;
            case 'b': document.getElementById('btn-briefing').click(); break;
            case 'o': document.getElementById('btn-boss').click(); break;
            case 'c': document.getElementById('btn-coffee').click(); break;
            case 'm': document.getElementById('btn-meeting').click(); break;
            case 'e': exportReport(); break;
            case 'escape': closeAllModals(); break;
            case 'arrowdown': navigateAgents(1); break;
            case 'arrowup': navigateAgents(-1); break;
            case '=': case '+': zoomIn(); break;
            case '-': zoomOut(); break;
        }
    });
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display='none');
}

function navigateAgents(direction) {
    const items = document.querySelectorAll('.agent-list-item');
    if (!items.length) return;
    const active = document.querySelector('.agent-list-item.active');
    let idx = Array.from(items).indexOf(active);
    idx = (idx + direction + items.length) % items.length;
    items[idx].click();
}

// ===== Data =====
async function api(ep, m='GET', b=null) {
    const u = ep ? `${API}?endpoint=${ep}` : API;
    try { const r = await fetch(u, { method: m, headers: {'Content-Type':'application/json'}, body: b ? JSON.stringify(b) : null }); return await r.json(); }
    catch(e) { console.error(e); return {success:false,error:e.message}; }
}

async function loadAllData() {
    const [a, t, s] = await Promise.all([api('agents'), api('tasks'), api('status')]);
    if (a.success && a.agents) { state.agents = a.agents; renderList(); renderCanvas(); updateStats(); }
    if (t.success && t.tasks) { state.tasks = t.tasks; document.getElementById('task-count').textContent = t.tasks.length; }
    if (s.success && s.office) {
        document.getElementById('avg-mood').textContent = s.office.avg_mood || '--';
    }
}

// ===== Render =====
function renderList() {
    const list = document.getElementById('agent-list'); list.innerHTML = '';
    state.agents.forEach(a => {
        const d = document.createElement('div'); d.className = 'agent-list-item'; d.dataset.id = a.id;
        d.innerHTML = `<span class="agent-avatar">${a.avatar}</span><div class="agent-info"><div class="agent-name">${a.name}</div><div class="agent-role">${a.role}</div></div><span class="agent-status-dot status-${a.status}"></span>`;
        d.onclick = () => selectAgent(a.id); list.appendChild(d);
    });
}

function renderCanvas() {
    const layer = document.getElementById('agents-layer'); layer.innerHTML = '';
    layer.style.width = OFFICE.width + 'px'; layer.style.height = OFFICE.height + 'px';
    state.agents.forEach(a => {
        const d = document.createElement('div'); d.className = 'agent-entity'; d.id = `agent-${a.id}`;
        d.style.left = a.x + 'px'; d.style.top = a.y + 'px';
        const mood = a.mood_score || 50;
        const moodClass = mood >= 70 ? 'mood-good' : mood >= 40 ? 'mood-ok' : 'mood-bad';
        d.innerHTML = `<div class="agent-body ${a.status}"><div class="mood-ring ${moodClass}"></div>${a.avatar}</div><div class="agent-label">${a.name.split(' ')[0]}</div><div class="agent-task-label">${a.current_task||''}</div>`;
        d.onclick = e => { e.stopPropagation(); selectAgent(a.id); };
        layer.appendChild(d);
    });
}

function updateStats() {
    const t = state.agents.length;
    const avg = t ? Math.round(state.agents.reduce((s,a)=>s+(parseFloat(a.productivity)||0),0)/t) : 0;
    document.getElementById('agent-count').textContent = t;
    document.getElementById('avg-productivity').textContent = avg;
    const avgMood = t ? Math.round(state.agents.reduce((s,a)=>s+(parseFloat(a.mood_score)||50),0)/t) : 0;
    document.getElementById('avg-mood').textContent = avgMood;
}

// ===== Select Agent =====
function selectAgent(id) {
    state.selectedAgent = id;
    document.querySelectorAll('.agent-list-item').forEach(el => el.classList.toggle('active', el.dataset.id === id));
    const a = state.agents.find(x => x.id === id);
    if (!a) return;
    document.getElementById('panel-placeholder').style.display = 'none';
    document.getElementById('panel-content').style.display = 'flex';
    document.getElementById('panel-header').innerHTML = `<span class="avatar">${a.avatar}</span><div class="info"><div class="name">${a.name}</div><div class="role">${a.role}</div></div><span class="status-badge">${a.status}</span>`;
    if (!state.conversations[id]) state.conversations[id] = [];
    renderMessages(id); renderDetail(a); renderTasks(id); switchTab('chat');
    document.getElementById('chat-input').focus();
}

function renderMessages(id) {
    const c = document.getElementById('panel-messages'); c.innerHTML = '';
    (state.conversations[id]||[]).forEach(m => { const d=document.createElement('div'); d.className=`chat-msg ${m.type}`; d.textContent=m.content; c.appendChild(d); });
    c.scrollTop = c.scrollHeight;
}

function sendMessage() {
    const inp = document.getElementById('chat-input'); const msg = inp.value.trim();
    if (!msg || !state.selectedAgent) return;
    inp.value = '';
    if (!state.conversations[state.selectedAgent]) state.conversations[state.selectedAgent] = [];
    state.conversations[state.selectedAgent].push({type:'user',content:msg});
    const aid = state.selectedAgent; renderMessages(aid);
    const c = document.getElementById('panel-messages');
    const t = document.createElement('div'); t.className='chat-msg agent'; t.textContent='⌨️ 正在输入...'; t.id='typing'; c.appendChild(t); c.scrollTop=c.scrollHeight;
    api('chat','POST',{agent_id:aid,message:msg}).then(d => {
        const ti = document.getElementById('typing'); if(ti) ti.remove();
        if(d.reply) { state.conversations[aid].push({type:'agent',content:d.reply}); renderMessages(aid); showBubble(aid, d.reply); }
    });
}

function showBubble(id, text) {
    const agent = state.agents.find(a=>a.id===id); if(!agent) return;
    const layer = document.getElementById('bubbles-layer');
    const b = document.createElement('div'); b.className='speech-bubble'; b.textContent=text;
    b.style.left=agent.x+'px'; b.style.top=(agent.y-30)+'px';
    layer.appendChild(b); setTimeout(()=>b.remove(),6000);
}

// ===== Tabs =====
function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
    document.querySelectorAll('.tab-panel').forEach(p=>{p.style.display=p.id===`tab-${name}`?'flex':'none';p.style.flexDirection='column';});
}

// ===== Detail =====
function renderDetail(a) {
    const p = parseFloat(a.productivity||0);
    const mood = a.mood_score || 50;
    const energy = a.energy || 100;
    const mColor = mood>=70?'var(--ok)':mood>=40?'var(--warn)':'var(--bad)';
    const eColor = energy>=70?'var(--ok)':energy>=40?'var(--warn)':'var(--bad)';
    const pColor = p>=85?'var(--ok)':p>=60?'var(--warn)':'var(--bad)';
    const pClass = p>=85?'high':p>=60?'med':'low';
    
    // Load memories
    api(`memory/${a.id}`).then(d => {
        let memHtml = '';
        if (d.memories) {
            memHtml = '<div class="detail-section"><h4>🧠 记忆</h4>';
            d.memories.forEach(m => {
                memHtml += `<div class="memory-item"><div class="memory-topic">${m.topic}</div><div class="memory-content">${m.content}</div><div class="memory-conf">信心: ${m.confidence}%</div></div>`;
            });
            memHtml += '</div>';
        }
        
        // Load relationships
        api('relationships').then(rels => {
            let relHtml = '';
            if (rels.relationships) {
                const myRels = rels.relationships.filter(r => r.agent_a === a.id || r.agent_b === a.id);
                if (myRels.length) {
                    relHtml = '<div class="detail-section"><h4>🤝 关系</h4>';
                    myRels.forEach(r => {
                        const otherId = r.agent_a === a.id ? r.agent_b : r.agent_a;
                        const other = state.agents.find(x => x.id === otherId);
                        const otherName = other ? other.name : otherId;
                        const relColor = r.strength >= 70 ? 'var(--ok)' : r.strength >= 40 ? 'var(--warn)' : 'var(--dim)';
                        relHtml += `<div class="relation-item"><span class="rel-avatars">${other ? other.avatar : '👤'}</span><span class="rel-name">${otherName}</span><span class="rel-strength" style="color:${relColor}">${r.strength}%</span></div>`;
                    });
                    relHtml += '</div>';
                }
            }
            
            document.getElementById('detail-content').innerHTML = `
                <div class="detail-avatar-large">${a.avatar}</div>
                <div class="detail-name-large">${a.name}</div>
                <div class="detail-role-large">${a.role}</div>
                <div class="detail-section"><h4>基本信息</h4>
                    <div class="detail-row"><span class="label">状态</span><span class="value">${a.status}</span></div>
                    <div class="detail-row"><span class="label">部门</span><span class="value">${a.department}</span></div>
                    <div class="detail-row"><span class="label">位置</span><span class="value">(${Math.round(a.x)}, ${Math.round(a.y)})</span></div>
                </div>
                <div class="detail-section"><h4>心情 ${mood>=70?'😊':mood>=40?'😐':'😞'} (${mood}/100)</h4>
                    <div class="mood-bar"><div class="mood-fill" style="width:${mood}%;background:${mColor}"></div></div>
                </div>
                <div class="detail-section"><h4>精力 (${energy}/100)</h4>
                    <div class="energy-bar"><div class="mood-fill" style="width:${energy}%;background:${eColor}"></div></div>
                </div>
                <div class="detail-section"><h4>生产力 ${p}%</h4>
                    <div class="progress-bar"><div class="progress-fill ${pClass}" style="width:${p}%"></div></div>
                </div>
                <div class="detail-section"><h4>当前任务</h4>
                    <div class="detail-row"><span class="value" style="font-size:.8rem">${a.current_task||'空闲中'}</span></div>
                </div>
                <div class="detail-section"><h4>正在交流</h4>
                    <div class="detail-row"><span class="value">${a.talking_to?'与 '+a.talking_to+' 聊天':'无'}</span></div>
                </div>
                ${memHtml}${relHtml}`;
        });
    });
}

// ===== Tasks =====
function renderTasks(agentId) {
    const list = document.getElementById('task-list'); list.innerHTML = '';
    const agentTasks = state.tasks.filter(t => t.assigned_to === agentId || !t.assigned_to);
    if (!agentTasks.length) { list.innerHTML = '<p style="color:var(--dim);text-align:center;padding:2rem">暂无任务</p>'; return; }
    agentTasks.forEach(t => {
        const d = document.createElement('div'); d.className = 'task-item';
        const prioClass = `task-priority-${t.priority}`;
        d.innerHTML = `<div class="task-title">${t.title}</div>
            <div class="task-meta"><span class="${prioClass}">${t.priority==='critical'?'🔴紧急':t.priority==='high'?'🟠高':t.priority==='medium'?'🔵中':'⚪低'}</span><span>${t.status}</span></div>
            <div class="task-progress"><div class="task-progress-fill" style="width:${t.progress||0}%"></div></div>
            <div style="font-size:.7rem;color:var(--dim);margin-top:2px">${t.progress||0}%</div>`;
        list.appendChild(d);
    });
}

// ===== Events =====
function startEventStream() { loadEvents(); state.eventTimer = setInterval(loadEvents, 5000); }
async function loadEvents() {
    const d = await api('events?limit=15');
    if (!d.success || !d.events) return;
    const list = document.getElementById('event-list');
    d.events.forEach(ev => {
        if (document.querySelector(`[data-event-id="${ev.id}"]`)) return;
        const time = ev.timestamp ? ev.timestamp.slice(11,16) : '--:--';
        const icons = {conversation:'💬',task_assigned:'📋',task_completed:'✅',boss_order:'👑'};
        const i = icons[ev.event_type]||'📌';
        const d = document.createElement('div'); d.className='event-item'; d.dataset.eventId=ev.id;
        d.innerHTML = `<span class="et">${time}</span>${i} ${ev.description||''}`;
        list.prepend(d);
        while(list.children.length > 30) list.removeChild(list.lastChild);
    });
    state.events = d.events;
}

// ===== Clock =====
function startClock() {
    state.clockInterval = setInterval(() => {
        const now = new Date();
        document.getElementById('time-display').textContent = `🕐 ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    }, 1000);
}

// ===== Simulation =====
function startSimulation() {
    state.simTimer = setInterval(simTick, 2000);
    state.ambientTimer = setInterval(ambientChat, 10000);
}

function simTick() {
    if (!state.simulationRunning) return;
    state.agents.forEach(a => {
        const dx=a.target_x-a.x, dy=a.target_y-a.y, dist=Math.sqrt(dx*dx+dy*dy);
        if(dist>2){const s=parseFloat(a.speed||1); a.x+=(dx/dist)*s*12; a.y+=(dy/dist)*s*12;}
        else{const r=OFFICE.rooms[Math.floor(Math.random()*OFFICE.rooms.length)]; a.target_x=r.x+40+Math.random()*(r.w-80); a.target_y=r.y+40+Math.random()*(r.h-80);}
        updateAgentEl(a);
    });
}

function updateAgentEl(a) {
    const el = document.getElementById(`agent-${a.id}`); if(!el) return;
    el.style.left=a.x+'px'; el.style.top=a.y+'px';
    const body = el.querySelector('.agent-body'); if(body) body.className='agent-body '+a.status;
    const tl = el.querySelector('.agent-task-label'); if(tl) tl.textContent=a.current_task||'';
    // Update mood ring
    const ring = el.querySelector('.mood-ring');
    if (ring) {
        const mood = a.mood_score || 50;
        ring.className = 'mood-ring ' + (mood >= 70 ? 'mood-good' : mood >= 40 ? 'mood-ok' : 'mood-bad');
    }
}

function ambientChat() {
    if(!state.simulationRunning||state.agents.length<2) return;
    if(Math.random()>0.2) return;
    const i=Math.floor(Math.random()*state.agents.length);
    const j=(i+1+Math.floor(Math.random()*(state.agents.length-1)))%state.agents.length;
    const a=state.agents[i], b=state.agents[j];
    const phrases=[`${a.name.split(' ')[0]} 走向 ${b.name.split(' ')[0]} 的工位`, `${a.name.split(' ')[0]} 和 ${b.name.split(' ')[0]} 在走廊相遇`, `${a.name.split(' ')[0]} 拍了拍 ${b.name.split(' ')[0]} 的肩膀`];
    showToast(phrases[Math.floor(Math.random()*phrases.length)]);
    const mx=(a.x+b.x)/2, my=(a.y+b.y)/2; a.target_x=mx-30;a.target_y=my; b.target_x=mx+30;b.target_y=my;
}

// ===== Boss Mode =====
async function sendBossOrder() {
    const order = document.getElementById('boss-order').value.trim();
    if(!order) { showToast('请输入指令'); return; }
    closeModal('modal-boss');
    showToast('👑 老板下令中...');
    const d = await api('boss-order','POST',{order});
    if(d.responses) {
        showBossResponses(d.responses, order);
        Object.keys(d.responses).forEach(aid => {
            if(!state.conversations[aid]) state.conversations[aid]=[];
            state.conversations[aid].push({type:'system',content:`👑 老板: ${order}`});
            state.conversations[aid].push({type:'agent',content:d.responses[aid]});
        });
        if(state.selectedAgent && state.conversations[state.selectedAgent]) renderMessages(state.selectedAgent);
    }
}

function showBossResponses(responses, order) {
    const overlay = document.createElement('div'); overlay.className='modal-overlay'; overlay.id='modal-boss-responses';
    let html='<div class="modal"><h3>👑 全员反应</h3><p style="color:var(--dim);margin-bottom:1rem">老板说: "<em>'+order+'</em>"</p>';
    Object.entries(responses).forEach(([aid, reply]) => {
        const a = state.agents.find(x=>x.id===aid);
        if(a) html+=`<div class="boss-response"><div class="br-header"><span class="br-avatar">${a.avatar}</span><span class="br-name">${a.name}</span><span class="br-role">${a.role}</span></div><div class="br-reply">${reply}</div></div>`;
    });
    html+='<div class="modal-actions" style="margin-top:1rem"><button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">关闭</button></div></div>';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };
}

// ===== Daily Briefing =====
async function showBriefing() {
    closeModal('modal-briefing');
    const d = await api('daily-briefing');
    if (!d.success || !d.briefing) return;
    const b = d.briefing;
    let html = '<div class="briefing-grid">';
    html += `<div class="briefing-card"><div class="bc-value">${b.total_agents}</div><div class="bc-label">团队成员</div></div>`;
    html += `<div class="briefing-card"><div class="bc-value" style="color:var(--ok)">${b.avg_productivity}%</div><div class="bc-label">平均生产力</div></div>`;
    html += `<div class="briefing-card"><div class="bc-value" style="color:var(--warn)">${b.avg_mood}</div><div class="bc-label">平均心情</div></div>`;
    html += `<div class="briefing-card"><div class="bc-value" style="color:var(--cyan)">${b.avg_energy}</div><div class="bc-label">平均精力</div></div>`;
    html += `<div class="briefing-card"><div class="bc-value" style="color:var(--accent)">${b.active_tasks}</div><div class="bc-label">进行中任务</div></div>`;
    html += `<div class="briefing-card"><div class="bc-value" style="color:var(--ok)">${b.completed_tasks}</div><div class="bc-label">已完成任务</div></div>`;
    html += '</div>';
    
    // Department breakdown
    html += '<div class="briefing-section"><h4>部门分布</h4><div style="display:flex;gap:.5rem;flex-wrap:wrap">';
    Object.entries(b.departments||{}).forEach(([dept, count]) => {
        html += `<span style="background:var(--card);padding:3px 10px;border-radius:10px;font-size:.75rem">${dept}: ${count}</span>`;
    });
    html += '</div></div>';
    
    // Strongest relationships
    if (b.strongest_relationships && b.strongest_relationships.length) {
        html += '<div class="briefing-section"><h4>🤝 最紧密关系</h4>';
        b.strongest_relationships.forEach(r => {
            html += `<div class="relation-item"><span class="rel-avatars">${r.avatar_a}${r.avatar_b}</span><span class="rel-name">${r.name_a} ↔ ${r.name_b}</span><span class="rel-strength">${r.strength}%</span></div>`;
        });
        html += '</div>';
    }
    
    // Recent events
    if (b.recent_events && b.recent_events.length) {
        html += '<div class="briefing-section"><h4>📡 最近动态</h4>';
        b.recent_events.forEach(ev => {
            const time = ev.timestamp ? ev.timestamp.slice(11,16) : '';
            html += `<div style="font-size:.75rem;color:var(--dim);padding:.2rem 0">${time} - ${ev.description||''}</div>`;
        });
        html += '</div>';
    }
    
    document.getElementById('briefing-content').innerHTML = html;
    document.getElementById('modal-briefing').style.display = 'flex';
}

// ===== Coffee Break =====
function coffeeBreak() {
    let count = 0;
    state.agents.forEach(a => {
        a.energy = Math.min(100, (a.energy || 50) + 25);
        a.mood_score = Math.min(100, (a.mood_score || 50) + 10);
        a.status = 'coffee';
        count++;
    });
    showToast(`☕ 全员喝杯咖啡！精力 +${count * 25}，心情 +${count * 10}`);
    
    // Update server
    state.agents.forEach(a => {
        api('update','POST',{agent_id:a.id,energy:a.energy,mood_score:a.mood_score,status:a.status});
    });
    
    // Reset after 10s
    setTimeout(() => {
        state.agents.forEach(a => {
            a.status = 'working';
            const el = document.getElementById(`agent-${a.id}`);
            if (el) { const body = el.querySelector('.agent-body'); if(body) body.className='agent-body working'; }
        });
    }, 10000);
}

// ===== Listeners =====
function setupEvents() {
    document.getElementById('chat-send').onclick = sendMessage;
    document.getElementById('chat-input').onkeydown = e => { if(e.key==='Enter') sendMessage(); };
    document.getElementById('btn-new-task').onclick = () => { document.getElementById('modal-task').style.display='flex'; populateAssignees(); };
    document.getElementById('btn-boss').onclick = () => { document.getElementById('modal-boss').style.display='flex'; };
    document.getElementById('btn-briefing').onclick = showBriefing;
    document.getElementById('btn-coffee').onclick = coffeeBreak;
    document.getElementById('btn-pause').onclick = () => {
        state.simulationRunning=!state.simulationRunning;
        document.getElementById('btn-pause').textContent=state.simulationRunning?'⏸️':'▶️';
        showToast(state.simulationRunning?'🟢 恢复':'⏸️ 暂停');
    };
    document.getElementById('btn-night').onclick = toggleNight;
    document.getElementById('btn-meeting').onclick = showMeetingModal;
    document.getElementById('btn-export').onclick = exportReport;
    document.getElementById('btn-shortcuts').onclick = () => { document.getElementById('modal-shortcuts').style.display='flex'; };
}

function populateAssignees() {
    const s=document.getElementById('task-assignee'); s.innerHTML='<option value="">不指定</option>';
    state.agents.forEach(a=>s.innerHTML+=`<option value="${a.id}">${a.avatar} ${a.name}</option>`);
}

async function createTask() {
    const title=document.getElementById('task-title').value.trim();
    if(!title){showToast('请输入任务标题');return;}
    const d=await api('tasks','POST',{title,description:document.getElementById('task-desc').value.trim(),assigned_to:document.getElementById('task-assignee').value||null,priority:document.getElementById('task-priority').value,created_by:'user'});
    if(d.created){showToast('✅ 任务已创建！');closeModal('modal-task');loadAllData();}
}

function closeModal(id) { document.getElementById(id).style.display='none'; }

function toggleNight() {
    state.nightMode=!state.nightMode;
    document.body.classList.toggle('night-mode',state.nightMode);
    document.getElementById('btn-night').textContent=state.nightMode?'☀️':'🌙';
    showToast(state.nightMode?'🌙 夜间模式':'☀️ 日间模式');
}

function zoomIn(){state.zoom=Math.min(3,state.zoom+.15);document.getElementById('zoom-level').textContent=Math.round(state.zoom*100)+'%';updateTransform();}
function zoomOut(){state.zoom=Math.max(.3,state.zoom-.15);document.getElementById('zoom-level').textContent=Math.round(state.zoom*100)+'%';updateTransform();}
function resetView(){state.zoom=1;state.offsetX=0;state.offsetY=0;document.getElementById('zoom-level').textContent='100%';updateTransform();}

// ===== Export Report per Alice's recommendation =====
function exportReport() {
    const agents = state.agents.map(a => `${a.avatar} ${a.name} (${a.role}): 生产力${a.productivity}% | 心情${a.mood_score} | 精力${a.energy}`).join('\n');
    const report = `🏢 虚拟办公室报告\n📅 ${new Date().toLocaleString()}\n\n=== 团队状态 ===\n${agents}\n\n=== 任务列表 ===\n${state.tasks.map(t => `[- ${t.priority}] ${t.title} (${t.status}, ${t.progress}%)`).join('\n')}`;
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `office-report-${new Date().toISOString().slice(0,10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📄 报告已导出');
}

// ===== Meeting Modal =====
function showMeetingModal() {
    document.getElementById('modal-meeting').style.display='flex';
    populateMeetingParticipants();
}

function populateMeetingParticipants() {
    const container = document.getElementById('meeting-participant-select');
    container.innerHTML = '';
    state.agents.forEach(a => {
        const label = document.createElement('label');
        label.className = 'mp-check';
        label.innerHTML = `<input type="checkbox" value="${a.id}" checked onchange="this.parentElement.classList.toggle('checked', this.checked)"> ${a.avatar} ${a.name}`;
        container.appendChild(label);
    });
}

async function startMeeting() {
    const checkboxes = document.querySelectorAll('#meeting-participant-select input:checked');
    const participants = Array.from(checkboxes).map(cb => cb.value);
    const title = document.getElementById('meeting-title').value.trim() || '临时会议';
    const topic = document.getElementById('meeting-topic').value.trim();
    
    if (!participants.length) { showToast('请至少选择一位参会人'); return; }
    
    closeModal('modal-meeting');
    showToast(`📽️ 会议开始: ${title}`);
    
    // Update agent positions to meeting room
    const meetingRoom = { x: 300, y: 550, target_x: 300, target_y: 550 };
    participants.forEach(pid => {
        const agent = state.agents.find(a => a.id === pid);
        if (agent) {
            Object.assign(agent, meetingRoom);
            agent.status = 'meeting';
            agent.current_task = `参加会议: ${title}`;
            updateAgentEl(agent);
        }
    });
    
    // Show meeting overlay
    const overlay = document.getElementById('meeting-overlay');
    overlay.style.display = 'flex';
    overlay.querySelector('.meeting-title').textContent = `📽️ 会议进行中: ${title}`;
    overlay.querySelector('.meeting-participants').textContent = participants.map(id => {
        const a = state.agents.find(x => x.id === id);
        return a ? `${a.avatar} ${a.name.split(' ')[0]}` : id;
    }).join(' • ');
    
    // Auto-end meeting after 30 seconds
    setTimeout(() => {
        overlay.style.display = 'none';
        participants.forEach(pid => {
            const agent = state.agents.find(a => a.id === pid);
            if (agent) {
                agent.status = 'working';
                agent.current_task = '会议结束，返回工作';
                // Return to random room
                const r = OFFICE.rooms[Math.floor(Math.random()*OFFICE.rooms.length)];
                agent.target_x = r.x + 40 + Math.random()*(r.w-80);
                agent.target_y = r.y + 40 + Math.random()*(r.h-80);
            }
        });
        showToast('✅ 会议结束');
    }, 30000);
}

function showToast(msg) {
    const t=document.getElementById('toast'); t.textContent=msg; t.style.display='block';
    clearTimeout(t._t); t._t=setTimeout(()=>t.style.display='none',3000);
}


// Enhanced debounce with leading/trailing options
function debounce(func, wait, options = {}) {
    let timeout, timerId, prevTime = 0;
    return function executedFunction(...args) {
        const now = Date.now();
        const remaining = wait - (now - prevTime);
        if (options.leading && now - prevTime < wait) {
            prevTime = now;
            func.apply(this, args);
        } else if (remaining <= 0 || remaining > wait) {
            if (timerId) { clearTimeout(timerId); timerId = null; }
            prevTime = now;
            func.apply(this, args);
        } else if (!timerId) {
            timerId = setTimeout(() => {
                prevTime = options.trailing !== false ? Date.now() : 0;
                timerId = null;
                func.apply(this, args);
            }, remaining);
        }
    };
}


// Henry's optimization: render cache to avoid redundant redraws
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
}


// Henry's optimization: render cache to avoid redundant redraws
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
}


// Henry's optimization: render cache to avoid redundant redraws
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
}


// Henry's optimization: render cache to avoid redundant redraws
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
}


// Henry's optimization: render cache to avoid redundant redraws
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
}


// Henry's optimization: render cache to avoid redundant redraws
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
}


// Henry's optimization: render cache to avoid redundant redraws
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
}


// Henry's optimization: render cache to avoid redundant redraws
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
}


// Henry's optimization: render cache to avoid redundant redraws
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
}


// Henry's optimization: render cache to avoid redundant redraws
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
}


// Henry's optimization: render cache to avoid redundant redraws
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
}


// Henry's optimization: render cache to avoid redundant redraws
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
}


// Henry's optimization: render cache to avoid redundant redraws
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
}


// Henry's optimization: render cache to avoid redundant redraws
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
}


// Henry's optimization: render cache to avoid redundant redraws
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
}


// Henry's optimization: render cache to avoid redundant redraws
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
}


// Henry's optimization: render cache to avoid redundant redraws
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
}


// Henry's optimization: render cache to avoid redundant redraws
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
}