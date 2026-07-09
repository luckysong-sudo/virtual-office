/**
 * Agent Optimization Script
 * Has each agent review the project and provide optimization suggestions
 */

const API = 'http://localhost:9092';

async function chat(agentId, message) {
    try {
        const res = await fetch(`${API}/?endpoint=chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent_id: agentId, message })
        });
        return await res.json();
    } catch(e) {
        return { error: e.message, reply: `⚠️ Agnes API 暂时不可用（${e.message}），使用本地模拟回复。` };
    }
}

async function agentChat(fromId, toId, message) {
    try {
        const res = await fetch(`${API}/?endpoint=agent-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from_id: fromId, to_id: toId, message })
        });
        return await res.json();
    } catch(e) {
        return { error: e.message };
    }
}

async function getAgents() {
    const res = await fetch(`${API}/?endpoint=agents`);
    return (await res.json()).agents;
}

async function main() {
    console.log('🏢 虚拟办公室 - 全员优化评审会议\n');
    console.log('=' .repeat(60));
    
    const agents = await getAgents();
    const agentMap = {};
    agents.forEach(a => agentMap[a.id] = a);
    
    // Phase 1: Individual code reviews
    console.log('\n📋 第一阶段：个人代码评审\n');
    console.log('-'.repeat(60));
    
    const reviews = {};
    
    // Bob: Backend + API review
    console.log('\n👨‍💻 Bob (高级工程师) - 后端 API 评审...');
    const bobRes = await chat('bob', `请评审我们的虚拟办公室项目。重点关注：
1. api/index.php 的 Node.js 实现是否有问题
2. API 路由和错误处理是否完善
3. 性能瓶颈在哪里
4. 给出3个最重要的优化建议`);
    reviews.bob = bobRes.reply || bobRes.error || '无回复';
    console.log(`   → ${reviews.bob.substring(0, 200)}...`);
    
    // Henry: Frontend review
    console.log('\n👨‍💻 Henry (前端开发) - 前端代码评审...');
    const henryRes = await chat('henry', `请评审我们的虚拟办公室前端代码。重点关注：
1. office.js 的性能问题（DOM操作、重绘）
2. Canvas 渲染优化
3. 响应式设计和用户体验
4. 给出3个最重要的优化建议`);
    reviews.henry = henryRes.reply || henryRes.error || '无回复';
    console.log(`   → ${reviews.henry.substring(0, 200)}...`);
    
    // Carol: UI/UX review
    console.log('\n👩‍🎨 Carol (UI/UX 设计师) - 界面设计评审...');
    const carolRes = await chat('carol', `请评审我们的虚拟办公室界面设计。重点关注：
1. CSS 结构和可维护性
2. 暗色主题和夜间模式的视觉效果
3. 动画和过渡效果
4. 给出3个最重要的优化建议`);
    reviews.carol = carolRes.reply || carolRes.error || '无回复';
    console.log(`   → ${reviews.carol.substring(0, 200)}...`);
    
    // Eve: QA review
    console.log('\n👩‍🔬 Eve (QA工程师) - 质量保障评审...');
    const eveRes = await chat('eve', `请评审我们的虚拟办公室项目的代码质量和潜在bug。重点关注：
1. 代码中的边界情况和错误处理
2. API 的健壮性
3. 内存泄漏风险
4. 给出3个最重要的优化建议`);
    reviews.eve = eveRes.reply || eveRes.error || '无回复';
    console.log(`   → ${reviews.eve.substring(0, 200)}...`);
    
    // Grace: Data analysis
    console.log('\n👩‍🏫 Grace (数据科学家) - 数据层评审...');
    const graceRes = await chat('grace', `请评审我们的虚拟办公室数据层。重点关注：
1. 内存存储的数据结构是否合理
2. 关系网络和记忆系统的实现
3. 数据持久化方案
4. 给出3个最重要的优化建议`);
    reviews.grace = graceRes.reply || graceRes.error || '无回复';
    console.log(`   → ${reviews.grace.substring(0, 200)}...`);
    
    // Alice: Product review
    console.log('\n👩‍💼 Alice (产品经理) - 产品体验评审...');
    const aliceRes = await chat('alice', `请从产品角度评审我们的虚拟办公室。重点关注：
1. 用户交互流程是否顺畅
2. 功能完整性
3. 哪些体验可以更好
4. 给出3个最重要的优化建议`);
    reviews.alice = aliceRes.reply || aliceRes.error || '无回复';
    console.log(`   → ${reviews.alice.substring(0, 200)}...`);
    
    // Frank: Tech lead synthesis
    console.log('\n👨‍💼 Frank (技术负责人) - 综合评审...');
    const frankSummary = Object.entries(reviews).map(([k,v]) => `${k}: ${v}`).join('\n');
    const frankRes = await chat('frank', `以下是团队评审意见，请综合给出最终优化方案：\n\n${frankSummary}\n\n请作为技术负责人总结：
1. 最高优先级的3个优化项
2. 需要重构的关键模块
3. 实施计划建议`);
    reviews.frank = frankRes.reply || frankRes.error || '无回复';
    console.log(`   → ${reviews.frank.substring(0, 300)}...`);
    
    // Print full report
    console.log('\n' + '='.repeat(60));
    console.log('📊 完整评审报告');
    console.log('='.repeat(60));
    
    for (const [name, review] of Object.entries(reviews)) {
        const a = agentMap[name];
        console.log(`\n${a?.avatar || ''} ${a?.name || name} (${a?.role || ''}):`);
        console.log(review);
    }
    
    // Phase 2: Agent-to-agent discussion
    console.log('\n' + '='.repeat(60));
    console.log('💬 第二阶段：跨部门讨论');
    console.log('='.repeat(60));
    
    // Bob discusses with Henry about frontend-backend integration
    console.log('\n👨‍💻 Bob ↔ Henry: 前后端集成讨论...');
    const bhChat = await agentChat('bob', 'henry', 
        `我们刚做完代码评审。我的建议是优化 API 路由和错误处理。你觉得前端这边有什么需要配合的吗？`
    );
    console.log(`   Bob → Henry: 我们刚做完代码评审。我的建议是优化 API 路由和错误处理。你觉得前端这边有什么需要配合的吗？`);
    console.log(`   Henry → Bob: ${bhChat.reply || bhChat.error || '(无回复)'}`);
    
    // Carol discusses with Alice about UX
    console.log('\n👩‍🎨 Carol ↔ Alice: 用户体验讨论...');
    const caChat = await agentChat('carol', 'alice',
        `评审发现我们的夜间模式效果不错，但快捷提示不够明显。你觉得怎么改进用户体验最好？`
    );
    console.log(`   Carol → Alice: 评审发现我们的夜间模式效果不错，但快捷提示不够明显。你觉得怎么改进用户体验最好？`);
    console.log(`   Alice → Carol: ${caChat.reply || caChat.error || '(无回复)'}`);
    
    // Phase 3: Boss order - implement optimizations
    console.log('\n' + '='.repeat(60));
    console.log('👑 第三阶段：老板下令 - 全员执行优化');
    console.log('='.repeat(60));
    
    const bossRes = await fetch(`${API}/?endpoint=boss-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            order: '全员注意！根据刚才的代码评审，请每个人都提出一个具体的优化行动项，并立即执行。'
        })
    });
    const bossData = await bossRes.json();
    if (bossData.responses) {
        for (const [id, reply] of Object.entries(bossData.responses)) {
            const a = agentMap[id];
            console.log(`\n${a?.avatar || ''} ${a?.name || id}: ${reply.substring(0, 150)}`);
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 优化评审会议结束');
    console.log('='.repeat(60));
}

main().catch(console.error);
