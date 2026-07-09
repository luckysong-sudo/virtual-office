<?php
/**
 * Virtual Office - PHP Backend API v2
 * Central hub for the virtual office world with Agnes AI agents
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
        ['frank', 'Frank Wu', 'Tech Lead', '👨‍💼', 'engineering', 'meeting', 'collaborative', 350, 180, 350, 180, 0.7, null, 'Leading sprint review', 87],
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

    case 'events':
        $limit = $_GET['limit'] ?? 20;
        $stmt = $db->prepare("SELECT * FROM office_events ORDER BY timestamp DESC LIMIT ?");
        $stmt->bindValue(1, intval($limit));
        $result = $stmt->execute();
        $events = [];
        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            $events[] = $row;
        }
        $response['events'] = $events;
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
            
            // Log event
            $stmt = $db->prepare("INSERT INTO office_events (agent_id, event_type, description) VALUES (?, ?, ?)");
            $stmt->bindValue(1, $data['assigned_to'] ?? null);
            $stmt->bindValue(2, 'task_assigned');
            $stmt->bindValue(3, "新任务: {$data['title']}");
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

    case 'agent-chat':
        // Agent-to-Agent conversation powered by Agnes AI
        $data = json_decode(file_get_contents('php://input'), true);
        $fromId = $data['from_id'] ?? '';
        $toId = $data['to_id'] ?? '';
        $message = $data['message'] ?? '';
        
        if ($fromId && $toId && $message) {
            $fromStmt = $db->prepare("SELECT * FROM agents WHERE id = ?");
            $fromStmt->bindValue(1, $fromId);
            $fromAgent = $fromStmt->execute()->fetchArray(SQLITE3_ASSOC);
            
            $toStmt = $db->prepare("SELECT * FROM agents WHERE id = ?");
            $toStmt->bindValue(1, $toId);
            $toAgent = $toStmt->execute()->fetchArray(SQLITE3_ASSOC);
            
            if ($fromAgent && $toAgent) {
                $toPersonality = loadPersonality($toId);
                $context = "你的同事 {$fromAgent['name']}（{$fromAgent['role']}）正在和你说话。他说：\"{$message}\"。请作为 {$toAgent['name']} 回复他，保持你的性格特点。";
                $reply = callAgnes($toAgent, $toPersonality, $context);
                
                // Update both agents status
                $stmt = $db->prepare("UPDATE agents SET status = 'talking', talking_to = ? WHERE id = ?");
                $stmt->bindValue(1, $toId);
                $stmt->bindValue(2, $fromId);
                $stmt->execute();
                
                $stmt = $db->prepare("UPDATE agents SET status = 'talking', talking_to = ? WHERE id = ?");
                $stmt->bindValue(1, $fromId);
                $stmt->bindValue(2, $toId);
                $stmt->execute();
                
                // Log event
                $stmt = $db->prepare("INSERT INTO office_events (agent_id, event_type, description) VALUES (?, ?, ?)");
                $stmt->bindValue(1, $fromId);
                $stmt->bindValue(2, 'conversation');
                $stmt->bindValue(3, "{$fromAgent['name']} 和 {$toAgent['name']} 在聊天");
                $stmt->execute();
                
                $response['reply'] = $reply;
                $response['from'] = $fromAgent;
                $response['to'] = $toAgent;
            }
        }
        break;

    case 'update':
        $data = json_decode(file_get_contents('php://input'), true);
        $agentId = $data['agent_id'] ?? null;
        if ($agentId) {
            $fields = [];
            $binds = [];
            foreach (['x', 'y', 'status', 'mood', 'target_x', 'target_y', 'talking_to', 'productivity', 'current_task'] as $field) {
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

    case 'personality':
        // Get personality config for an agent
        $personality = loadPersonality($id);
        $response['personality'] = $personality;
        break;

    default:
        $response['success'] = false;
        $response['error'] = "Unknown endpoint: $action";
        $response['endpoints'] = ['agents', 'messages', 'move', 'status', 'tasks', 'chat', 'update', 'events', 'agent-chat', 'personality'];
        break;
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);

/**
 * Load agent personality config from JSON file
 */
function loadPersonality($agentId) {
    $file = __DIR__ . '/../agents/personalities.json';
    if (!file_exists($file)) return null;
    $data = json_decode(file_get_contents($file), true);
    return $data[$agentId] ?? null;
}

/**
 * Call Agnes API to generate agent response
 */
function callAgnes($agent, $personality, $message, $tempOverride = null) {
    if (!$agent) return "Agent not found.";
    
    $endpoint = getenv('AGNES_API_URL') ?: 'http://localhost:8000/v1';
    $apiKey = getenv('AGNES_API_KEY') ?: '';
    $temp = $tempOverride ?? ($personality['temperature'] ?? 0.7);
    
    // Build system prompt from personality + agent state
    $sysPrompt = "你是一个虚拟办公室里的AI员工，正在自己的工位上工作。\n";
    if ($personality) {
        $sysPrompt .= $personality['system_prompt'] . "\n";
        $sysPrompt .= "你的专长：「" . implode('、', $personality['expertise']) . "」\n";
    } else {
        $sysPrompt .= "你是{$agent['name']}，{$agent['role']}。请用中文回答，语气自然友好。\n";
    }
    $sysPrompt .= "当前状态：{$agent['status']}。正在做的事：{$agent['current_task'] ?? '空闲'}\n";
    $sysPrompt .= "规则：用口语化中文回答，保持角色性格，控制在3-5句话。不要自称AI。";
    
    if (!empty($apiKey)) {
        $payload = json_encode([
            'model' => 'agnes/agnes-2.0-flash',
            'messages' => [
                ['role' => 'system', 'content' => $sysPrompt],
                ['role' => 'user', 'content' => $message],
            ],
            'temperature' => $temp,
            'max_tokens' => 500,
        ]);
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => rtrim($endpoint, '/') . '/chat/completions',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $apiKey,
            ],
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200 && $result) {
            $json = json_decode($result, true);
            if (isset($json['choices'][0]['message']['content'])) {
                return $json['choices'][0]['message']['content'];
            }
        }
    }
    
    // Fallback
    return "你好！我是{$agent['name']}，{$agent['role']}。你说得对，让我来想想...";
}
