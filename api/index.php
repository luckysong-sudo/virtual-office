<?php
/**
 * Virtual Office - PHP Backend API
 * Central hub for the virtual office world
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Database (SQLite - zero config)
$dbFile = __DIR__ . '/data/office.db';
if (!is_dir(__DIR__ . '/data')) {
    mkdir(__DIR__ . '/data', 0755, true);
}
$db = new SQLite3($dbFile);
$db->busyTimeout(5000);

// Initialize schema
$db->exec("
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    avatar TEXT NOT NULL,
    department TEXT NOT NULL,
    status TEXT DEFAULT 'idle',
    mood TEXT DEFAULT 'neutral',
    x REAL DEFAULT 0,
    y REAL DEFAULT 0,
    target_x REAL DEFAULT 0,
    target_y REAL DEFAULT 0,
    speed REAL DEFAULT 1.0,
    talking_to TEXT DEFAULT NULL,
    current_task TEXT DEFAULT NULL,
    productivity REAL DEFAULT 100,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id TEXT NOT NULL,
    receiver_id TEXT DEFAULT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'chat',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_read INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS office_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT,
    event_type TEXT NOT NULL,
    description TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);
");

// Seed agents if empty
$count = $db->querySingle("SELECT COUNT(*) FROM agents");
if ($count == 0) {
    $agents = [
        ['alice', 'Alice Chen', 'Product Manager', '👩‍💼', 'management', 'working', 'focused', 150, 100, 150, 100, 1.2, null, 'Reviewing roadmap Q3', 92],
        ['bob', 'Bob Wang', 'Senior Developer', '👨‍💻', 'engineering', 'coding', 'flow_state', 300, 200, 300, 200, 0.8, null, 'Building API endpoints', 88],
        ['carol', 'Carol Li', 'UI/UX Designer', '👩‍🎨', 'design', 'working', 'creative', 450, 150, 450, 150, 1.0, null, 'Designing new dashboard', 95],
        ['david', 'David Zhang', 'DevOps Engineer', '🧑‍🔧', 'operations', 'monitoring', 'alert', 200, 300, 200, 300, 0.9, null, 'Checking server health', 85],
        ['eve', 'Eve Liu', 'QA Engineer', '👩‍🔬', 'quality', 'testing', 'analytical', 600, 250, 600, 250, 1.1, null, 'Running test suite', 90],
        ['frank', 'Frank Wu', 'Tech Lead', '👨‍💻‍', 'engineering', 'meeting', 'collaborative', 350, 180, 350, 180, 0.7, null, 'Leading sprint review', 87],
        ['grace', 'Grace Zhao', 'Data Scientist', '👩‍🏫', 'analytics', 'researching', 'curious', 500, 350, 500, 350, 1.0, null, 'Analyzing user metrics', 91],
        ['henry', 'Henry Xu', 'Frontend Developer', '👨‍💻', 'engineering', 'coding', 'focused', 280, 220, 280, 220, 0.8, null, 'Implementing components', 86],
    ];

    $stmt = $db->prepare("INSERT INTO agents VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    foreach ($agents as $a) {
        $stmt->bindValue(1, $a[0]);
        $stmt->bindValue(2, $a[1]);
        $stmt->bindValue(3, $a[2]);
        $stmt->bindValue(4, $a[3]);
        $stmt->bindValue(5, $a[6]);
        $stmt->bindValue(6, $a[7]);
        $stmt->bindValue(7, $a[8]);
        $stmt->bindValue(8, $a[9]);
        $stmt->bindValue(9, $a[10]);
        $stmt->bindValue(10, $a[11]);
        $stmt->bindValue(11, $a[12]);
        $stmt->bindValue(12, $a[13]);
        $stmt->bindValue(13, $a[14]);
        $stmt->bindValue(14, $a[15]);
        $stmt->bindValue(15, $a[16]);
        $stmt->execute();
        $stmt->reset();
    }
}

// Router
$endpoint = $_GET['endpoint'] ?? $_POST['endpoint'] ?? '';
$params = explode('/', trim($endpoint, '/'));
$action = $params[0] ?? '';
$id = $params[1] ?? null;

$response = ['success' => true, 'timestamp' => date('Y-m-d H:i:s')];

switch ($action) {
    case 'agents':
        if ($id) {
            $stmt = $db->prepare("SELECT * FROM agents WHERE id = ?");
            $stmt->bindValue(1, $id);
            $result = $stmt->execute();
            $agent = $result->fetchArray(SQLITE3_ASSOC);
            $response['agent'] = $agent ?: null;
        } else {
            $result = $db->query("SELECT * FROM agents ORDER BY name");
            $agents = [];
            while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
                $agents[] = $row;
            }
            $response['agents'] = $agents;
        }
        break;

    case 'messages':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            $sender = $data['sender_id'] ?? null;
            $receiver = $data['receiver_id'] ?? null;
            $content = $data['content'] ?? '';
            $type = $data['type'] ?? 'chat';

            if (!$sender || !$content) {
                $response['success'] = false;
                $response['error'] = 'Missing sender_id or content';
                break;
            }

            $stmt = $db->prepare("INSERT INTO messages (sender_id, receiver_id, content, type) VALUES (?, ?, ?, ?)");
            $stmt->bindValue(1, $sender);
            $stmt->bindValue(2, $receiver);
            $stmt->bindValue(3, $content);
            $stmt->bindValue(4, $type);
            $stmt->execute();

            // Log conversation
            if ($receiver && isset($data['response'])) {
                $stmt = $db->prepare("INSERT INTO conversations (user_id, agent_id, message, response) VALUES (?, ?, ?, ?)");
                $stmt->bindValue(1, $sender);
                $stmt->bindValue(2, $receiver);
                $stmt->bindValue(3, $content);
                $stmt->bindValue(4, $data['response'] ?? '');
                $stmt->execute();
            }

            $response['message'] = 'Sent';
        } else {
            $stmt = $db->prepare("SELECT * FROM messages WHERE receiver_id = ? OR sender_id = ? ORDER BY timestamp DESC LIMIT 50");
            $stmt->bindValue(1, $id ?: 'user');
            $stmt->bindValue(2, $id ?: 'user');
            $result = $stmt->execute();
            $messages = [];
            while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
                $messages[] = $row;
            }
            $response['messages'] = $messages;
        }
        break;

    case 'move':
        // Agent movement
        $data = json_decode(file_get_contents('php://input'), true);
        $agentId = $data['agent_id'] ?? null;
        $tx = $data['target_x'] ?? 0;
        $ty = $data['target_y'] ?? 0;
        if ($agentId) {
            $stmt = $db->prepare("UPDATE agents SET target_x = ?, target_y = ? WHERE id = ?");
            $stmt->bindValue(1, $tx);
            $stmt->bindValue(2, $ty);
            $stmt->bindValue(3, $agentId);
            $stmt->execute();
            $response['moved'] = true;
        }
        break;

    case 'status':
        // Get office status
        $stmt = $db->query("SELECT COUNT(*) as total FROM agents");
        $total = $stmt->fetchArray(SQLITE3_ASSOC)['total'];
        $stmt = $db->query("SELECT status, COUNT(*) as count FROM agents GROUP BY status");
        $statusBreakdown = [];
        while ($row = $stmt->fetchArray(SQLITE3_ASSOC)) {
            $statusBreakdown[$row['status']] = $row['count'];
        }
        $stmt = $db->query("SELECT COUNT(*) as active FROM tasks WHERE status != 'completed'");
        $activeTasks = $stmt->fetchArray(SQLITE3_ASSOC)['active'];
        $response['office'] = [
            'total_agents' => $total,
            'status_breakdown' => $statusBreakdown,
            'active_tasks' => $activeTasks,
            'uptime' => '24/7',
        ];
        break;

    case 'tasks':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $db->prepare("INSERT INTO tasks (title, description, assigned_to, priority, created_by) VALUES (?, ?, ?, ?, ?)");
            $stmt->bindValue(1, $data['title']);
            $stmt->bindValue(2, $data['description'] ?? '');
            $stmt->bindValue(3, $data['assigned_to'] ?? null);
            $stmt->bindValue(4, $data['priority'] ?? 'medium');
            $stmt->bindValue(5, $data['created_by'] ?? 'user');
            $stmt->execute();
            $response['created'] = true;
        } else {
            $stmt = $db->query("SELECT * FROM tasks ORDER BY 
                CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                created_at DESC");
            $tasks = [];
            while ($row = $stmt->fetchArray(SQLITE3_ASSOC)) {
                $tasks[] = $row;
            }
            $response['tasks'] = $tasks;
        }
        break;

    case 'chat':
        // User -> Agent chat endpoint
        $data = json_decode(file_get_contents('php://input'), true);
        $agentId = $data['agent_id'] ?? '';
        $message = $data['message'] ?? '';
        
        if ($agentId && $message) {
            // Load agent context
            $stmt = $db->prepare("SELECT * FROM agents WHERE id = ?");
            $stmt->bindValue(1, $agentId);
            $agent = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
            
            // Generate response based on agent personality
            $response['reply'] = generateAgentResponse($agent, $message);
            $response['agent'] = $agent;
            
            // Save conversation
            $stmt = $db->prepare("INSERT INTO conversations (user_id, agent_id, message, response) VALUES (?, ?, ?, ?)");
            $stmt->bindValue(1, 'user');
            $stmt->bindValue(2, $agentId);
            $stmt->bindValue(3, $message);
            $stmt->bindValue(4, $response['reply']);
            $stmt->execute();
        }
        break;

    case 'update':
        // Update agent positions/emotions
        $data = json_decode(file_get_contents('php://input'), true);
        $agentId = $data['agent_id'] ?? null;
        if ($agentId) {
            $fields = [];
            $values = [];
            $binds = [];
            foreach (['x', 'y', 'status', 'mood', 'target_x', 'target_y', 'talking_to', 'productivity'] as $field) {
                if (isset($data[$field])) {
                    $fields[] = "$field = ?";
                    $binds[] = $data[$field];
                }
            }
            if (!empty($fields)) {
                $sql = "UPDATE agents SET " . implode(', ', $fields) . " WHERE id = ?";
                $binds[] = $agentId;
                $stmt = $db->prepare($sql);
                foreach ($binds as $i => $val) {
                    $stmt->bindValue($i + 1, $val);
                }
                $stmt->execute();
            }
        }
        break;

    default:
        $response['success'] = false;
        $response['error'] = "Unknown endpoint: $action";
        $response['endpoints'] = ['agents', 'messages', 'move', 'status', 'tasks', 'chat', 'update'];
        break;
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);

/**
 * Simulate agent responses based on personality
 */
function generateAgentResponse($agent, $message) {
    if (!$agent) return "Agent not found.";
    
    $responses = [
        'alice' => [
            'tone' => 'organized, strategic, encouraging',
            'examples' => [
                "好问题！从产品角度看，我们可以这样规划...",
                "我同意你的想法。让我把它加入我们的优先级列表。",
                "这个方向不错，但我们需要考虑用户留存率。",
                "让我安排一个站会讨论这个方案。",
            ]
        ],
        'bob' => [
            'tone' => 'technical, direct, solution-oriented',
            'examples' => [
                "这个可以用微服务架构来实现。我来画个草图。",
                "技术上完全可行，大概需要2-3天。",
                "我建议用GraphQL而不是REST，这样更灵活。",
                "我刚重构了那段代码，性能提升了40%。",
            ]
        ],
        'carol' => [
            'tone' => 'creative, visual, user-focused',
            'examples' => [
                "让我想想视觉效果...我觉得可以用渐变色搭配圆角设计。",
                "用户体验是关键，我建议做一个原型先看看效果。",
                "这个交互流程可以更流畅，我有个更好的方案。",
                "配色方面，我正在研究新的设计趋势。",
            ]
        ],
        'david' => [
            'tone' => 'practical, security-conscious, efficient',
            'examples' => [
                "服务器一切正常。我已经优化了部署流程。",
                "安全方面建议启用双因素认证。",
                "CI/CD流水线已经配置好了，自动测试通过率98%。",
                "监控告警已经设置完毕，异常会在30秒内通知。",
            ]
        ],
        'eve' => [
            'tone' => 'detail-oriented, thorough, methodical',
            'examples' => [
                "我刚跑完回归测试，发现了3个边界case的问题。",
                "覆盖率目前达到87%，还有提升空间。",
                "这个功能需要更多测试用例，我来补充一下。",
                "自动化测试脚本已经更新，新功能的测试只需一键。",
            ]
        ],
        'frank' => [
            'tone' => 'experienced, mentoring, big-picture',
            'examples' => [
                "这个技术方案不错，但我们要考虑可维护性。",
                "让我们一起review一下代码架构。",
                "团队最近进展很好，继续保持这个节奏。",
                "我建议采用迭代式开发，每两周一个里程碑。",
            ]
        ],
        'grace' => [
            'tone' => 'analytical, curious, data-driven',
            'examples' => [
                "数据分析显示用户活跃度提升了15%。",
                "我从日志中发现了一些有趣的模式...",
                "机器学习模型训练完成，准确率达到了94%。",
                "让我跑一下A/B测试来看看哪个版本更好。",
            ]
        ],
        'henry' => [
            'tone' => 'energetic, detail-focused, frontend-passionate',
            'examples' => [
                "组件已经封装好了，响应式设计也适配了。",
                "我用Vue 3重写了那个页面，性能提升明显。",
                "动画效果我加了过渡，体验流畅了很多。",
                "CSS Grid布局让响应式变得简单多了。",
            ]
        ],
    ];
    
    $personality = $responses[$agent['id']] ?? $responses['alice'];
    
    // Simple keyword matching for contextual responses
    $msgLower = mb_strtolower($message, 'UTF-8');
    
    if (strpos($msgLower, '你好') !== false || strpos($msgLower, 'hello') !== false || strpos($msgLower, 'hi') !== false) {
        $greetings = [
            "你好！我是{$agent['name']}，{$agent['role']}。有什么可以帮你的？",
            "嗨！今天工作进展顺利。你需要什么帮助？",
            "你好呀！我刚忙完一阵，正好可以聊聊。",
        ];
        return $greetings[array_rand($greetings)];
    }
    
    if (strpos($msgLower, '任务') !== false || strpos($msgLower, '做') !== false || strpos($msgLower, 'implement') !== false) {
        $tasks = [
            "收到任务！我会尽快完成。预计需要一些时间。",
            "好的，让我先分析一下需求，然后制定计划。",
            "没问题，交给我吧。我会保持进度同步。",
        ];
        return $tasks[array_rand($tasks)];
    }
    
    if (strpos($msgLower, '代码') !== false || strpos($msgLower, 'code') !== false || strpos($msgLower, '开发') !== false) {
        $coding = [
            "代码方面正是我的强项。让我来梳理一下思路。",
            "我正在处理一段关键逻辑，稍等，我整理好再详细说。",
            "好的，技术实现上我有几个方案可以分享。",
        ];
        return $coding[array_rand($coding)];
    }
    
    if (strpos($msgLower, '设计') !== false || strpos($msgLower, 'design') !== false || strpos($msgLower, '界面') !== false) {
        $design = [
            "设计方面我正在构思新的方案，很有创意！",
            "用户体验是最重要的，我在优化交互细节。",
            "视觉设计上我有一些大胆的想法，想听听你的意见。",
        ];
        return $design[array_rand($design)];
    }
    
    // Default: pick random response
    return $personality['examples'][array_rand($personality['examples'])];
}
