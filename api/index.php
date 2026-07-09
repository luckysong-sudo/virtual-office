<?php
/**
 * Virtual Office - PHP Backend API v3
 * Full AI-driven virtual office with task tracking, boss mode, and day/night cycle
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dbFile = __DIR__ . '/data/office.db';
if (!is_dir(__DIR__ . '/data')) mkdir(__DIR__ . '/data', 0755, true);
$db = new SQLite3($dbFile);
$db->busyTimeout(5000);

$db->exec("
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, avatar TEXT NOT NULL,
    department TEXT NOT NULL, status TEXT DEFAULT 'idle', mood TEXT DEFAULT 'neutral',
    x REAL DEFAULT 0, y REAL DEFAULT 0, target_x REAL DEFAULT 0, target_y REAL DEFAULT 0,
    speed REAL DEFAULT 1.0, talking_to TEXT DEFAULT NULL, current_task TEXT DEFAULT NULL,
    productivity REAL DEFAULT 100, mood_score REAL DEFAULT 50,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL, agent_id TEXT NOT NULL,
    message TEXT NOT NULL, response TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS office_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT, event_type TEXT NOT NULL, description TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL, description TEXT, assigned_to TEXT,
    status TEXT DEFAULT 'pending', priority TEXT DEFAULT 'medium',
    progress REAL DEFAULT 0, deadline TEXT,
    created_by TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);
");

$count = $db->querySingle("SELECT COUNT(*) FROM agents");
if ($count == 0) {
    $agents = [
        ['alice', 'Alice Chen', 'Product Manager', '👩‍💼', 'management', 'working', 'focused', 150, 100, 150, 100, 1.2, null, 'Reviewing roadmap Q3', 92, 65],
        ['bob', 'Bob Wang', 'Senior Developer', '👨‍💻', 'engineering', 'coding', 'flow_state', 300, 200, 300, 200, 0.8, null, 'Building API endpoints', 88, 72],
        ['carol', 'Carol Li', 'UI/UX Designer', '👩‍🎨', 'design', 'working', 'creative', 450, 150, 450, 150, 1.0, null, 'Designing new dashboard', 95, 80],
        ['david', 'David Zhang', 'DevOps Engineer', '🧑‍🔧', 'operations', 'monitoring', 'alert', 200, 300, 200, 300, 0.9, null, 'Checking server health', 85, 55],
        ['eve', 'Eve Liu', 'QA Engineer', '👩‍🔬', 'quality', 'testing', 'analytical', 600, 250, 600, 250, 1.1, null, 'Running test suite', 90, 68],
        ['frank', 'Frank Wu', 'Tech Lead', '👨‍💼', 'engineering', 'meeting', 'collaborative', 350, 180, 350, 180, 0.7, null, 'Leading sprint review', 87, 60],
        ['grace', 'Grace Zhao', 'Data Scientist', '👩‍🏫', 'analytics', 'researching', 'curious', 500, 350, 500, 350, 1.0, null, 'Analyzing user metrics', 91, 75],
        ['henry', 'Henry Xu', 'Frontend Developer', '👨‍💻', 'engineering', 'coding', 'focused', 280, 220, 280, 220, 0.8, null, 'Implementing components', 86, 70],
    ];
    $stmt = $db->prepare("INSERT INTO agents VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    foreach ($agents as $a) {
        $stmt->bindValue(1, $a[0]); $stmt->bindValue(2, $a[1]); $stmt->bindValue(3, $a[2]);
        $stmt->bindValue(4, $a[3]); $stmt->bindValue(5, $a[6]); $stmt->bindValue(6, $a[7]);
        $stmt->bindValue(7, $a[8]); $stmt->bindValue(8, $a[9]); $stmt->bindValue(9, $a[10]);
        $stmt->bindValue(10, $a[11]); $stmt->bindValue(11, $a[12]); $stmt->bindValue(12, $a[13]);
        $stmt->bindValue(13, $a[14]); $stmt->bindValue(14, $a[15]);
        $stmt->execute(); $stmt->reset();
    }
}

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
            $response['agent'] = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
        } else {
            $result = $db->query("SELECT * FROM agents ORDER BY name");
            $response['agents'] = iterator_to_array($result, false);
        }
        break;

    case 'move':
        $data = json_decode(file_get_contents('php://input'), true);
        if ($data['agent_id']) {
            $stmt = $db->prepare("UPDATE agents SET target_x=?, target_y=? WHERE id=?");
            $stmt->bindValue(1, $data['target_x']); $stmt->bindValue(2, $data['target_y']);
            $stmt->bindValue(3, $data['agent_id']); $stmt->execute();
            $response['moved'] = true;
        }
        break;

    case 'status':
        $total = $db->querySingle("SELECT COUNT(*) FROM agents");
        $stmt = $db->query("SELECT status, COUNT(*) as c FROM agents GROUP BY status");
        $breakdown = [];
        while ($r = $stmt->fetchArray(SQLITE3_ASSOC)) $breakdown[$r['status']] = $r['c'];
        $active = $db->querySingle("SELECT COUNT(*) FROM tasks WHERE status != 'completed'");
        $hour = (int)date('H');
        $isNight = $hour >= 22 || $hour < 6;
        $response['office'] = [
            'total_agents' => $total,
            'status_breakdown' => $breakdown,
            'active_tasks' => $active,
            'is_night' => $isNight,
            'hour' => $hour,
        ];
        break;

    case 'events':
        $limit = $_GET['limit'] ?? 20;
        $stmt = $db->prepare("SELECT * FROM office_events ORDER BY timestamp DESC LIMIT ?");
        $stmt->bindValue(1, intval($limit));
        $response['events'] = $stmt->execute()->fetchAll(SQLITE3_ASSOC);
        break;

    case 'tasks':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $db->prepare("INSERT INTO tasks (title, description, assigned_to, priority, created_by, deadline) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->bindValue(1, $data['title']);
            $stmt->bindValue(2, $data['description'] ?? '');
            $stmt->bindValue(3, $data['assigned_to'] ?? null);
            $stmt->bindValue(4, $data['priority'] ?? 'medium');
            $stmt->bindValue(5, $data['created_by'] ?? 'user');
            $stmt->bindValue(6, $data['deadline'] ?? null);
            $stmt->execute();
            // Log event
            $stmt = $db->prepare("INSERT INTO office_events (agent_id, event_type, description) VALUES (?, 'task_assigned', ?)");
            $stmt->bindValue(1, $data['assigned_to'] ?? null);
            $stmt->bindValue(2, "📋 新任务: {$data['title']}");
            $stmt->execute();
            $response['created'] = true;
        } else {
            $stmt = $db->query("SELECT * FROM tasks ORDER BY 
                CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC");
            $response['tasks'] = $stmt->fetchAll(SQLITE3_ASSOC);
        }
        break;

    case 'task-progress':
        // Update task progress
        $data = json_decode(file_get_contents('php://input'), true);
        $taskId = $data['task_id'] ?? null;
        $progress = $data['progress'] ?? 0;
        if ($taskId) {
            $stmt = $db->prepare("UPDATE tasks SET progress = ?, status = CASE WHEN ? >= 100 THEN 'completed' ELSE status END WHERE id = ?");
            $stmt->bindValue(1, $progress);
            $stmt->bindValue(2, $progress);
            $stmt->bindValue(3, $taskId);
            $stmt->execute();
            if ($progress >= 100) {
                $stmt = $db->prepare("UPDATE tasks SET completed_at = CURRENT_TIMESTAMP WHERE id = ?");
                $stmt->bindValue(1, $taskId);
                $stmt->execute();
                $task = $db->querySingle("SELECT * FROM tasks WHERE id = ?", true, $taskId);
                $task = json_decode($task, true);
                $stmt = $db->prepare("INSERT INTO office_events (agent_id, event_type, description) VALUES (?, 'task_completed', ?)");
                $stmt->bindValue(1, $task['assigned_to'] ?? null);
                $stmt->bindValue(2, "✅ 任务完成: {$task['title']}");
                $stmt->execute();
            }
            $response['updated'] = true;
        }
        break;

    case 'boss-order':
        // Boss order: user gives a directive, ALL agents respond
        $data = json_decode(file_get_contents('php://input'), true);
        $order = $data['order'] ?? '';
        if ($order) {
            $stmt = $db->query("SELECT * FROM agents");
            $agents = $stmt->fetchAll(SQLITE3_ASSOC);
            $responses = [];
            foreach ($agents as $agent) {
                $personality = loadPersonality($agent['id']);
                $context = "你是办公室的老板，刚刚下达了一条全员指令：\"{$order}\"。请作为 {$agent['name']}（{$agent['role']}）回复你的反应和态度。保持你的性格特点，简短有力。";
                $responses[$agent['id']] = callAgnes($agent, $personality, $context, 0.9);
                
                // Boost mood for everyone receiving orders
                $updateStmt = $db->prepare("UPDATE agents SET mood_score = MIN(100, mood_score + 5) WHERE id = ?");
                $updateStmt->bindValue(1, $agent['id']);
                $updateStmt->execute();
            }
            // Log event
            $stmt = $db->prepare("INSERT INTO office_events (agent_id, event_type, description) VALUES (NULL, 'boss_order', ?)");
            $stmt->bindValue(1, "👑 老板下令: {$order}");
            $stmt->execute();
            $response['responses'] = $responses;
            $response['order'] = $order;
        }
        break;

    case 'chat':
        $data = json_decode(file_get_contents('php://input'), true);
        $agentId = $data['agent_id'] ?? '';
        $message = $data['message'] ?? '';
        if ($agentId && $message) {
            $stmt = $db->prepare("SELECT * FROM agents WHERE id = ?");
            $stmt->bindValue(1, $agentId);
            $agent = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
            $personality = loadPersonality($agentId);
            $reply = callAgnes($agent, $personality, $message);
            $response['reply'] = $reply;
            $response['agent'] = $agent;
            // Slight mood boost when chatting
            $stmt = $db->prepare("UPDATE agents SET mood_score = MIN(100, mood_score + 2) WHERE id = ?");
            $stmt->bindValue(1, $agentId);
            $stmt->execute();
        }
        break;

    case 'agent-chat':
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
                $context = "你的同事 {$fromAgent['name']}（{$fromAgent['role']}）对你说：\"{$message}\"。请作为 {$toAgent['name']} 回复，保持性格。";
                $reply = callAgnes($toAgent, $toPersonality, $context, 0.8);
                $stmt = $db->prepare("UPDATE agents SET status='talking', talking_to=? WHERE id=?");
                $stmt->bindValue(1, $toId); $stmt->bindValue(2, $fromId); $stmt->execute();
                $stmt = $db->prepare("UPDATE agents SET status='talking', talking_to=? WHERE id=?");
                $stmt->bindValue(1, $fromId); $stmt->bindValue(2, $toId); $stmt->execute();
                $stmt = $db->prepare("INSERT INTO office_events (agent_id, event_type, description) VALUES (?, 'conversation', ?)");
                $stmt->bindValue(1, $fromId);
                $stmt->bindValue(2, "{$fromAgent['name']} 💬 {$toAgent['name']}");
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
            $fields = []; $binds = [];
            foreach (['x','y','status','mood','target_x','target_y','talking_to','productivity','current_task','mood_score'] as $f) {
                if (isset($data[$f])) { $fields[] = "$f=?"; $binds[] = $data[$f]; }
            }
            if (!empty($fields)) {
                $sql = "UPDATE agents SET " . implode(', ', $fields) . " WHERE id=?";
                $binds[] = $agentId;
                $stmt = $db->prepare($sql);
                foreach ($binds as $i => $val) $stmt->bindValue($i+1, $val);
                $stmt->execute();
            }
        }
        break;

    case 'personality':
        $response['personality'] = loadPersonality($id);
        break;

    case 'night-mode':
        // Toggle night mode
        $response['night_mode'] = true;
        $response['message'] = '办公室进入夜间模式 🌙';
        break;

    default:
        $response['success'] = false;
        $response['error'] = "Unknown endpoint: $action";
        $response['endpoints'] = ['agents','messages','move','status','tasks','task-progress','boss-order','chat','agent-chat','update','events','personality','night-mode'];
        break;
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);

function loadPersonality($agentId) {
    $file = __DIR__ . '/../agents/personalities.json';
    if (!file_exists($file)) return null;
    $data = json_decode(file_get_contents($file), true);
    return $data[$agentId] ?? null;
}

function callAgnes($agent, $personality, $message, $tempOverride = null) {
    if (!$agent) return "Agent not found.";
    $endpoint = getenv('AGNES_API_URL') ?: 'http://localhost:8000/v1';
    $apiKey = getenv('AGNES_API_KEY') ?: '';
    $temp = $tempOverride ?? ($personality['temperature'] ?? 0.7);
    
    $sysPrompt = "你是一个虚拟办公室里的AI员工，正在自己的工位上工作。\n";
    if ($personality) {
        $sysPrompt .= $personality['system_prompt'] . "\n";
        $sysPrompt .= "你的专长：「" . implode('、', $personality['expertise']) . "」\n";
    } else {
        $sysPrompt .= "你是{$agent['name']}，{$agent['role']}。请用中文回答，语气自然友好。\n";
    }
    $sysPrompt .= "当前状态：{$agent['status']}。正在做的事：{$agent['current_task'] ?? '空闲'}\n";
    $sysPrompt .= "心情值：{$agent['mood_score'] ?? 50}/100\n";
    $sysPrompt .= "规则：用口语化中文回答，保持角色性格，控制在3-5句话。不要自称AI。";
    
    if (!empty($apiKey)) {
        $payload = json_encode([
            'model' => 'agnes/agnes-2.0-flash',
            'messages' => [['role'=>'system','content'=>$sysPrompt], ['role'=>'user','content'=>$message]],
            'temperature' => $temp, 'max_tokens' => 500,
        ]);
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => rtrim($endpoint,'/') . '/chat/completions',
            CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $apiKey],
            CURLOPT_POSTFIELDS => $payload, CURLOPT_TIMEOUT => 15, CURLOPT_SSL_VERIFYPEER => false,
        ]);
        $result = curl_exec($ch); $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        if ($httpCode === 200 && $result) {
            $json = json_decode($result, true);
            if (isset($json['choices'][0]['message']['content'])) return $json['choices'][0]['message']['content'];
        }
    }
    return "你好！我是{$agent['name']}，{$agent['role']}。你说得对，让我来想想...";
}
