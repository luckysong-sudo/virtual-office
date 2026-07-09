/**
 * Smart Task Assignment System
 * Manager (Frank) automatically assigns tasks to idle employees
 * Coordinates with existing team members for collaborative work
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const REPO_DIR = __dirname;
const API_URL = 'http://localhost:9094';

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

// Available project modules that need work
const PROJECT_MODULES = [
    {
        name: 'API路由优化',
        file: 'server.js',
        type: 'backend',
        priority: 'high',
        description: '优化API路由效率和错误处理中间件',
        skills_needed: ['JavaScript', 'Node.js', 'Express'],
        estimated_hours: 4
    },
    {
        name: '前端性能优化',
        file: 'assets/js/office.js',
        type: 'frontend',
        priority: 'medium',
        description: '优化DOM操作和渲染性能',
        skills_needed: ['JavaScript', 'Canvas', 'Performance'],
        estimated_hours: 6
    },
    {
        name: 'CSS设计系统',
        file: 'assets/css/style.css',
        type: 'design',
        priority: 'medium',
        description: '完善CSS变量和暗色模式',
        skills_needed: ['CSS', 'Design Tokens', 'Responsive'],
        estimated_hours: 3
    },
    {
        name: '安全加固',
        file: 'server.js',
        type: 'security',
        priority: 'high',
        description: '加强CORS配置和安全头',
        skills_needed: ['Security', 'Node.js', 'CORS'],
        estimated_hours: 5
    },
    {
        name: '输入验证',
        file: 'server.js',
        type: 'qa',
        priority: 'high',
        description: '增强输入验证和边界处理',
        skills_needed: ['Validation', 'Testing', 'JavaScript'],
        estimated_hours: 3
    },
    {
        name: '技能执行引擎',
        file: 'api/skills.js',
        type: 'backend',
        priority: 'low',
        description: '优化技能执行引擎和数据处理',
        skills_needed: ['JavaScript', 'API Design'],
        estimated_hours: 8
    },
    {
        name: '用户体验优化',
        file: 'index.html',
        type: 'ux',
        priority: 'medium',
        description: '优化新手引导和交互流程',
        skills_needed: ['HTML', 'UX Design', 'JavaScript'],
        estimated_hours: 4
    },
    {
        name: '角色配置优化',
        file: 'agents/personalities.json',
        type: 'config',
        priority: 'low',
        description: '优化角色配置和系统提示',
        skills_needed: ['JSON', 'Configuration'],
        estimated_hours: 2
    }
];

// Task assignment logic
function assignTasks() {
    log('📋 开始智能任务分配...');
    
    // Load team info
    const personalitiesPath = path.join(REPO_DIR, 'agents/personalities.json');
    const personalities = JSON.parse(fs.readFileSync(personalitiesPath, 'utf-8'));
    const team = personalities.agents || [];
    
    // Separate existing agents and new employees
    const existingAgents = ['bob', 'henry', 'carol', 'david', 'eve', 'grace', 'alice', 'frank'];
    const newEmployees = team.filter(emp => !existingAgents.includes(emp.name.toLowerCase()));
    
    if (newEmployees.length === 0) {
        log('ℹ️ 没有新员工需要分配任务');
        return [];
    }
    
    log(`👥 发现 ${newEmployees.length} 名新员工需要任务分配`);
    
    // Get current tasks from task_assignments.json
    let taskAssignments = {};
    const taskFilePath = path.join(REPO_DIR, 'task_assignments.json');
    if (fs.existsSync(taskFilePath)) {
        taskAssignments = JSON.parse(fs.readFileSync(taskFilePath, 'utf-8'));
    }
    
    const assignments = [];
    
    // Assign tasks to each new employee
    newEmployees.forEach((employee, index) => {
        const moduleName = PROJECT_MODULES[index % PROJECT_MODULES.length].name;
        const module = PROJECT_MODULES.find(m => m.name === moduleName);
        
        // Find or create task for this employee
        if (!taskAssignments[employee.name]) {
            taskAssignments[employee.name] = {
                task: module.name,
                file: module.file,
                type: module.type,
                priority: module.priority,
                status: 'assigned',
                assigned_at: new Date().toISOString(),
                collaborator: null,
                description: module.description
            };
            
            assignments.push({
                employee: employee.name,
                task: module.name,
                file: module.file,
                type: module.type
            });
            
            log(`✅ ${employee.name} → ${module.name} (${module.file})`);
        }
    });
    
    // Save task assignments
    fs.writeFileSync(taskFilePath, JSON.stringify(taskAssignments, null, 2));
    log(`📝 任务分配已保存 (${assignments.length} 个任务)`);
    
    return assignments;
}

// Coordinate with existing team members
function coordinateCollaboration(assignments) {
    if (assignments.length === 0) return;
    
    log('🤝 开始协调团队协作...');
    
    // For each new employee, find a senior mentor
    const mentors = {
        'backend': 'bob',
        'frontend': 'henry',
        'design': 'carol',
        'security': 'david',
        'qa': 'eve',
        'ux': 'alice'
    };
    
    assignments.forEach(assignment => {
        const mentor = mentors[assignment.type];
        if (mentor) {
            log(`👨‍🏫 ${assignment.employee} 将跟随 ${mentor} 学习`);
            
            // Update task assignment with collaborator
            const taskFilePath = path.join(REPO_DIR, 'task_assignments.json');
            const taskAssignments = JSON.parse(fs.readFileSync(taskFilePath, 'utf-8'));
            if (taskAssignments[assignment.employee]) {
                taskAssignments[assignment.employee].collaborator = mentor;
                fs.writeFileSync(taskFilePath, JSON.stringify(taskAssignments, null, 2));
            }
        }
    });
}

// Generate daily briefing for new employees
function generateBriefing(assignments) {
    if (assignments.length === 0) return '';
    
    let briefing = '📢 新员工今日工作简报:\n\n';
    
    assignments.forEach(a => {
        briefing += `**${a.employee}**\n`;
        briefing += `- 📋 任务: ${a.task}\n`;
        briefing += `- 📁 文件: ${a.file}\n`;
        briefing += `- 🏷️ 类型: ${a.type}\n`;
        briefing += `- 👨‍🏫 导师: 待分配\n`;
        briefing += `- 📅 日期: ${new Date().toISOString().split('T')[0]}\n\n`;
    });
    
    briefing += '💡 提示: 请先阅读相关文件，然后开始工作。遇到问题可以向导师请教。\n';
    
    // Send briefing to all new employees
    assignments.forEach(a => {
        callAgnes(a.employee, briefing).then(response => {
            log(`📤 简报已发送给 ${a.employee}`);
        });
    });
    
    return briefing;
}

// Main execution
async function runTaskAssignment() {
    log('🚀 启动智能任务分配系统...');
    
    // Step 1: Assign tasks
    const assignments = assignTasks();
    
    if (assignments.length > 0) {
        // Step 2: Coordinate collaboration
        coordinateCollaboration(assignments);
        
        // Step 3: Generate briefing
        const briefing = generateBriefing(assignments);
        
        // Step 4: Commit and push
        try {
            const { execSync } = require('child_process');
            execSync('git add -A', { cwd: REPO_DIR });
            execSync('git commit -m "📋 Frank: 智能任务分配 - ' + assignments.map(a => a.employee).join(', ') + '"', { cwd: REPO_DIR });
            execSync('git push', { cwd: REPO_DIR });
            log('🚀 任务分配已推送到 GitHub!');
        } catch(e) {
            log(`⚠️ 推送失败: ${e.message.substring(0, 100)}`);
        }
    } else {
        log('ℹ️ 无需分配新任务');
    }
}

// Start the system
log('🏢 虚拟办公室 - 智能任务分配系统');
log('📅 每15分钟运行一次，自动为新员工分配任务');

// Run immediately
runTaskAssignment().catch(err => log(`❌ 错误: ${err.message}`));
