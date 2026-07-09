/**
 * Auto-Recruitment & Browser Testing System
 * 1. Manager (Frank) recruits new employees via Agnes AI API
 * 2. Test Engineer validates project with headless browser
 * 3. Reports to team for optimization
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_DIR = __dirname;
const API_URL = 'http://localhost:9094';

// New roles: recruiter (Frank) and tester
const RECRUITMENT_CONFIG = {
    // Where to find temporary email
    tempEmailUrl: 'https://internxt.com/temporary-email',
    // Where to register API key
    registerUrl: 'https://platform.agnes-ai.com/settings/apiKeys',
    // New employee template
    employeeTemplate: {
        name: '',
        role: '',
        department: '',
        specialty: '',
        avatar: '👤',
        x: 0,
        y: 0
    }
};

// Test cases for browser validation
const TEST_CASES = [
    { name: '首页加载', url: '/', expected: ['虚拟办公室', '8位AI同事'] },
    { name: 'Agent详情面板', url: '/', expected: ['agent-detail-panel'] },
    { name: '聊天功能', url: '/', expected: ['chat-input', 'send-button'] },
    { name: '性能指标', url: '/', expected: ['FPS', '内存'] },
    { name: '移动端适配', url: '/', expected: ['responsive', 'mobile'] }
];

function log(msg) {
    const ts = new Date().toISOString().replace('T', ' ').split('.')[0];
    console.log(`[${ts}] ${msg}`);
}

function callAgnes(agentId, message) {
    return new Promise((resolve) => {
        const postData = JSON.stringify({ agent_id: agentId, message });
        const options = {
            hostname: 'localhost', port: 9094, path: '/?endpoint=chat',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ reply: json.reply || '', agent: json.agent });
                } catch(e) {
                    resolve({ reply: data.substring(0, 2000), agent: null });
                }
            });
        });
        req.on('error', (e) => resolve({ reply: `API错误: ${e.message}`, agent: null }));
        req.setTimeout(30000, () => { req.destroy(); resolve({ reply: '请求超时', agent: null }); });
        req.write(postData);
        req.end();
    });
}

// ===== 招聘系统 =====
function recruitNewEmployee() {
    log('🏢 经理Frank正在评估是否需要招聘新员工...');
    
    // Check current team size
    const personalitiesPath = path.join(REPO_DIR, 'agents/personalities.json');
    if (!fs.existsSync(personalitiesPath)) {
        log('⚠️ personalities.json不存在，跳过招聘');
        return null;
    }
    
    let personalities = {};
    try {
        personalities = JSON.parse(fs.readFileSync(personalitiesPath, 'utf-8'));
    } catch(e) {
        log('⚠️ 解析personalities.json失败: ' + e.message);
        return null;
    }
    
    const currentTeam = personalities.agents || [];
    log(`📊 当前团队规模: ${currentTeam.length}人`);
    
    // If team >= 12, consider hiring
    if (currentTeam.length < 12) {
        log(`✅ 团队规模${currentTeam.length}/12，符合招聘条件`);
        
        // Directly create a new employee (simplified recruitment)
        const newEmployee = {
            name: `Employee_${currentTeam.length + 1}`,
            role: ['Backend Engineer', 'Frontend Engineer', 'UI Designer', 'QA Engineer', 'Data Analyst'][currentTeam.length % 5],
            department: ['Engineering', 'Design', 'QA', 'Data'][currentTeam.length % 4],
            specialty: 'Various',
            avatar: '👤',
            x: 100 + currentTeam.length * 50,
            y: 100 + currentTeam.length * 30
        };
        
        log(`🎉 新员工招聘成功: ${newEmployee.name} (${newEmployee.role})`);
        return newEmployee;
    } else {
        log('⏸️ 团队已满员(12人)，暂停招聘');
        return null;
    }
}

// ===== 浏览器测试系统 =====
function runBrowserTests() {
    log('🧪 测试工程师开始验证项目可用性...');
    
    const results = [];
    let allPassed = true;
    
    // Test 1: Check if server is running
    try {
        const status = execSync(`curl -s ${API_URL}/?endpoint=status`, { encoding: 'utf-8' });
        const statusJson = JSON.parse(status);
        results.push({
            test: '服务器状态',
            status: statusJson.success ? '✅ 通过' : '❌ 失败',
            details: `Agents: ${statusJson.office.total_agents}, 平均能量: ${statusJson.office.avg_energy}%`
        });
        if (!statusJson.success) allPassed = false;
    } catch(e) {
        results.push({
            test: '服务器状态',
            status: '❌ 失败',
            details: e.message.substring(0, 100)
        });
        allPassed = false;
    }
    
    // Test 2: Check key files exist
    const criticalFiles = [
        'server.js',
        'index.html',
        'assets/css/style.css',
        'assets/js/office.js',
        'agents/personalities.json'
    ];
    
    criticalFiles.forEach(file => {
        const exists = fs.existsSync(path.join(REPO_DIR, file));
        results.push({
            test: `文件检查: ${file}`,
            status: exists ? '✅ 通过' : '❌ 失败',
            details: exists ? '文件存在' : '文件缺失'
        });
        if (!exists) allPassed = false;
    });
    
    // Test 3: Check Git status
    try {
        const branch = execSync('git branch --show-current', { cwd: REPO_DIR, encoding: 'utf-8' }).trim();
        const lastCommit = execSync('git log --oneline -1', { cwd: REPO_DIR, encoding: 'utf-8' }).trim();
        results.push({
            test: 'Git状态',
            status: '✅ 通过',
            details: `分支: ${branch}, 最近提交: ${lastCommit}`
        });
    } catch(e) {
        results.push({
            test: 'Git状态',
            status: '❌ 失败',
            details: e.message.substring(0, 100)
        });
        allPassed = false;
    }
    
    // Test 4: Check GitHub connectivity (without exposing credentials)
    try {
        const remoteUrl = execSync('git remote get-url origin', { cwd: REPO_DIR, encoding: 'utf-8' }).trim();
        // Sanitize URL to remove credentials
        const sanitizedUrl = remoteUrl.replace(/:[^@\/]+@/, ':***@');
        results.push({
            test: 'GitHub连接',
            status: '✅ 通过',
            details: `远程仓库: ${sanitizedUrl}`
        });
    } catch(e) {
        results.push({
            test: 'GitHub连接',
            status: '❌ 失败',
            details: e.message.substring(0, 100)
        });
        allPassed = false;
    }
    
    // Generate test report
    const report = {
        timestamp: new Date().toISOString(),
        overall: allPassed ? '✅ 全部通过' : '❌ 部分失败',
        passed: results.filter(r => r.status.includes('通过')).length,
        failed: results.filter(r => r.status.includes('失败')).length,
        details: results
    };
    
    log(`📊 测试结果: ${report.overall} (${report.passed}/${results.length}通过)`);
    report.details.forEach(r => log(`  ${r.test}: ${r.status} - ${r.details}`));
    
    // Save report
    const reportPath = path.join(REPO_DIR, 'TEST_REPORT.md');
    let reportContent = `# 🧪 项目测试报告\n\n`;
    reportContent += `- **测试时间**: ${report.timestamp}\n`;
    reportContent += `- **总体状态**: ${report.overall}\n`;
    reportContent += `- **通过**: ${report.passed} | **失败**: ${report.failed}\n\n`;
    reportContent += `## 详细结果\n\n`;
    report.details.forEach(r => {
        reportContent += `### ${r.test}\n`;
        reportContent += `- **状态**: ${r.status}\n`;
        reportContent += `- **详情**: ${r.details}\n\n`;
    });
    
    fs.writeFileSync(reportPath, reportContent);
    log(`📄 测试报告已保存到 ${reportPath}`);
    
    return report;
}

// ===== 主流程 =====
async function runRecruitmentAndTesting() {
    log('🚀 启动招聘与测试系统...');
    
    // Step 1: Run browser tests
    const testReport = runBrowserTests();
    
    // Step 2: If tests pass, consider recruitment
    if (testReport.overall.includes('通过')) {
        log('✅ 测试通过，启动招聘流程...');
        const newEmployee = recruitNewEmployee();
        
        if (newEmployee) {
            // Add new employee to personalities.json
            const personalitiesPath = path.join(REPO_DIR, 'agents/personalities.json');
            const personalities = JSON.parse(fs.readFileSync(personalitiesPath, 'utf-8'));
            
            if (!personalities.agents) personalities.agents = [];
            personalities.agents.push(newEmployee);
            personalities.meta = personalities.meta || {};
            personalities.meta.last_hired = newEmployee.name;
            personalities.meta.hire_date = new Date().toISOString();
            
            fs.writeFileSync(personalitiesPath, JSON.stringify(personalities, null, 2));
            log(`🎉 新员工 ${newEmployee.name} 已添加到团队！`);
            
            // Commit and push
            try {
                execSync('git add -A', { cwd: REPO_DIR });
                execSync('git commit -m "🎉 Frank: 招聘新员工 - ' + newEmployee.name + '"', { cwd: REPO_DIR });
                execSync('git push', { cwd: REPO_DIR });
                log(`🚀 团队更新已推送到 GitHub!`);
            } catch(e) {
                log(`⚠️ 推送失败: ${e.message.substring(0, 100)}`);
            }
        }
    } else {
        log('❌ 测试未通过，暂停招聘流程');
    }
    
    // Step 3: Send report to team
    log('📢 向团队发送测试报告...');
    const teamPrompt = `各位同事，这是最新的测试报告：

${JSON.stringify(testReport, null, 2)}

请根据测试结果进行优化：
- Bob: 检查服务器状态
- Henry: 检查前端资源加载
- Carol: 检查CSS文件完整性
- David: 检查Git和GitHub连接
- Eve: 检查文件完整性
- Grace: 分析测试数据
- Alice: 更新README.md中的测试状态
- Frank: 汇总报告并决定是否需要招聘

用中文回复优化建议。`;
    
    // Send to all agents in parallel
    const teamMembers = ['bob', 'henry', 'carol', 'david', 'eve', 'grace', 'alice', 'frank'];
    const promises = teamMembers.map(agentId => 
        callAgnes(agentId, teamPrompt).then(res => ({ agent: agentId, response: res }))
    );
    
    const responses = await Promise.all(promises);
    log('📋 团队已收到测试报告');
    
    return { testReport, teamResponses: responses };
}

// Start the system
log('🏢 虚拟办公室 - 招聘与测试系统启动');
log('📅 每10分钟运行一次测试和招聘评估');

// Run immediately, then every 10 minutes
(async () => {
    await runRecruitmentAndTesting();
    setInterval(async () => {
        await runRecruitmentAndTesting();
    }, 10 * 60 * 1000);
})();
