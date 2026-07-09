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
        return { error: e.message, reply: `[${agentId}] API不可用: ${e.message}` };
    }
}

async function main() {
    console.log('🏢 虚拟办公室 - 全员优化执行会议\n');
    console.log('='.repeat(70));
    
    // Read actual code files to give agents real context
    const fs = await import('fs');
    const codeFiles = {
        'api/index.php': fs.readFileSync('/tmp/openclaw/workspace/virtual-office/api/index.php', 'utf-8'),
        'assets/js/office.js': fs.readFileSync('/tmp/openclaw/workspace/virtual-office/assets/js/office.js', 'utf-8'),
        'assets/css/style.css': fs.readFileSync('/tmp/openclaw/workspace/virtual-office/assets/css/style.css', 'utf-8'),
        'index.html': fs.readFileSync('/tmp/openclaw/workspace/virtual-office/index.html', 'utf-8'),
        'server.js': fs.readFileSync('/tmp/openclaw/workspace/virtual-office/server.js', 'utf-8'),
    };
    
    const codePreview = Object.entries(codeFiles).map(([f,c]) =>
        `--- ${f} (${c.length} bytes) ---\n${c.substring(0, 300)}...\n`
    ).join('\n');
    
    const tasks = [
        {
            id: 'bob',
            prompt: `你是Bob Wang，高级工程师。请审查以下代码并给出具体优化方案：\n\n${codePreview}\n\n请重点关注：\n1. API路由效率和错误处理\n2. 内存存储的性能瓶颈\n3. 给出具体的代码优化建议（直接指出哪一行/哪个函数需要改）\n4. 用中文回答，控制在200字以内`,
        },
        {
            id: 'henry',
            prompt: `你是Henry Xu，前端开发。请审查以下代码并给出具体优化方案：\n\n${codePreview}\n\n请重点关注：\n1. office.js 中的DOM操作和重绘性能\n2. Canvas渲染优化\n3. 给出具体的代码优化建议\n4. 用中文回答，控制在200字以内`,
        },
        {
            id: 'carol',
            prompt: `你是Carol Li，UI/UX设计师。请审查以下代码并给出具体优化方案：\n\n${codePreview}\n\n请重点关注：\n1. CSS结构和变量使用\n2. 夜间模式效果\n3. 动画性能\n4. 给出具体的CSS优化建议\n5. 用中文回答，控制在200字以内`,
        },
        {
            id: 'david',
            prompt: `你是David Zhang，DevOps工程师。请审查以下代码并给出具体优化方案：\n\n${codePreview}\n\n请重点关注：\n1. server.js 的安全配置\n2. .env 管理和敏感信息保护\n3. 部署和监控建议\n4. 给出具体的安全优化建议\n5. 用中文回答，控制在200字以内`,
        },
        {
            id: 'eve',
            prompt: `你是Eve Liu，QA工程师。请审查以下代码并找出潜在bug：\n\n${codePreview}\n\n请重点关注：\n1. API的错误处理和边界情况\n2. 内存泄漏风险\n3. 竞态条件和数据一致性\n4. 给出具体的测试和优化建议\n5. 用中文回答，控制在200字以内`,
        },
        {
            id: 'grace',
            prompt: `你是Grace Zhao，数据科学家。请审查以下代码并给出数据层优化建议：\n\n${codePreview}\n\n请重点关注：\n1. 内存数据存储的效率\n2. 关系网络和记忆系统的实现\n3. 数据查询性能\n4. 给出具体的数据结构优化建议\n5. 用中文回答，控制在200字以内`,
        },
        {
            id: 'alice',
            prompt: `你是Alice Chen，产品经理。请从用户体验角度审查以下代码：\n\n${codePreview}\n\n请重点关注：\n1. 交互流程和用户引导\n2. 功能完整性和优先级\n3. 新手上手体验\n4. 给出具体的产品优化建议\n5. 用中文回答，控制在200字以内`,
        },
        {
            id: 'frank',
            prompt: `你是Frank Wu，技术负责人。请综合评估以下代码并给出架构优化建议：\n\n${codePreview}\n\n请重点关注：\n1. 整体架构设计和模块化\n2. 代码复用和DRY原则\n3. 可扩展性和维护性\n4. 给出具体的架构优化建议\n5. 用中文回答，控制在200字以内`,
        },
    ];
    
    const results = {};
    
    // Phase 1: Individual reviews
    console.log('\n📋 第一阶段：个人代码审查\n');
    console.log('-'.repeat(70));
    
    for (const task of tasks) {
        const agent = JSON.parse(fs.readFileSync('/tmp/openclaw/workspace/virtual-office/agents/personalities.json', 'utf-8'))[task.id];
        console.log(`\n${agent?.avatar || '?'} ${agent?.name || task.id} (${agent?.role || ''}) 审查中...`);
        const res = await chat(task.id, task.prompt);
        results[task.id] = res.reply || res.error || '无回复';
        console.log(`   → ${results[task.id].substring(0, 200)}...`);
        await new Promise(r => setTimeout(r, 500)); // Rate limit
    }
    
    // Phase 2: Frank synthesizes
    console.log('\n' + '='.repeat(70));
    console.log('👨‍💼 第二阶段：Frank 综合优化方案\n');
    console.log('-'.repeat(70));
    
    const summary = Object.entries(results).map(([k,v]) => `${k}: ${v}`).join('\n\n');
    const frankRes = await chat('frank', `以下是团队审查结果，请综合给出最终优化方案：\n\n${summary}\n\n请作为技术负责人给出：\n1. 最高优先级的5个优化项\n2. 每个优化项的具体实施步骤\n3. 预期效果和风险评估\n用中文回答，控制在300字以内`);
    results.frank_synthesis = frankRes.reply || frankRes.error || '无回复';
    console.log(`   → ${results.frank_synthesis.substring(0, 400)}...`);
    
    // Phase 3: Print full report
    console.log('\n' + '='.repeat(70));
    console.log('📊 完整优化报告\n');
    console.log('='.repeat(70));
    
    for (const [id, review] of Object.entries(results)) {
        const agent = JSON.parse(fs.readFileSync('/tmp/openclaw/workspace/virtual-office/agents/personalities.json', 'utf-8'))[id] || {name:id,role:'',avatar:'👤'};
        console.log(`\n${agent.avatar} ${agent.name} (${agent.role}):`);
        console.log(review);
        console.log('-'.repeat(70));
    }
    
    // Save report
    fs.writeFileSync('/tmp/openclaw/workspace/virtual-office/OPTIMIZATION_REPORT.md', `# 🏢 虚拟办公室 - 全员优化报告\n\n> 生成时间: ${new Date().toISOString()}\n> AI引擎: Agnes AI (agnes-2.0-flash)\n\n` + Object.entries(results).map(([k,v]) => `## ${k}\n\n${v}\n`).join('\n'));
    
    console.log('\n✅ 优化报告已保存至 OPTIMIZATION_REPORT.md');
}

main().catch(console.error);
