<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

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
    energy REAL DEFAULT 100,
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
CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_a TEXT NOT NULL, agent_b TEXT NOT NULL,
    strength REAL DEFAULT 50,
    last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_a, agent_b)
);
CREATE TABLE IF NOT EXISTS agent_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence REAL DEFAULT 50,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, topic)
);
CREATE TABLE IF NOT EXISTS meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL, topic TEXT,
    participants TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
");

$count = $db->querySingle("SELECT COUNT(*) FROM agents");
if ($count == 0) {
    $agents = [
        ['alice','Alice Chen','Product Manager','👩‍💼','management','working','focused',150,100,150,100,1.2,null,'Reviewing roadmap Q3',92,65,80],
        ['bob','Bob Wang','Senior Developer','👨‍💻','engineering','coding','flow_state',300,200,300,200,0.8,null,'Building API endpoints',88,72,75],
        ['carol','Carol Li','UI/UX Designer','👩‍🎨','design','working','creative',450,150,450,150,1.0,null,'Designing new dashboard',95,80,85],
        ['david','David Zhang','DevOps Engineer','🧑‍🔧','operations','monitoring','alert',200,300,200,300,0.9,null,'Checking server health',85,55,70],
        ['eve','Eve Liu','QA Engineer','👩‍🔬','quality','testing','analytical',600,250,600,250,1.1,null,'Running test suite',90,68,78],
        ['frank','Frank Wu','Tech Lead','👨‍💼','engineering','meeting','collaborative',350,180,350,180,0.7,null,'Leading sprint review',87,60,65],
        ['grace','Grace Zhao','Data Scientist','👩‍🏫','analytics','researching','curious',500,350,500,350,1.0,null,'Analyzing user metrics',91,75,82],
        ['henry','Henry Xu','Frontend Developer','👨‍💻','engineering','coding','focused',280,220,280,220,0.8,null,'Implementing components',86,70,72],
    ];
    $stmt = $db->prepare("INSERT INTO agents VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
    foreach ($agents as $a) {
        $stmt->bindValue(1,$a[0]); $stmt->bindValue(2,$a[1]); $stmt->bindValue(3,$a[2]);
        $stmt->bindValue(4,$a[3]); $stmt->bindValue(5,$a[6]); $stmt->bindValue(6,$a[7]);
        $stmt->bindValue(7,$a[8]); $stmt->bindValue(8,$a[9]); $stmt->bindValue(9,$a[10]);
        $stmt->bindValue(10,$a[11]); $stmt->bindValue(11,$a[12]); $stmt->bindValue(12,$a[13]);
        $stmt->bindValue(13,$a[14]); $stmt->bindValue(14,$a[15]); $stmt->bindValue(15,$a[16]); $stmt->bindValue(16,$a[17]);
        $stmt->execute(); $stmt->reset();
    }
    $rels = [['bob','frank',80],['bob','henry',65],['carol','henry',70],['alice','frank',75],['alice','eve',60],['grace','eve',55],['david','frank',70],['carol','alice',50],['bob','alice',45]];
    $rs = $db->prepare("INSERT INTO relationships (agent_a, agent_b, strength) VALUES (?,?,?)");
    foreach ($rels as $r) { $rs->bindValue(1,$r[0]); $rs->bindValue(2,$r[1]); $rs->bindValue(3,$r[2]); $rs->execute(); }
    $memories = [['alice','roadmap','Q3产品路线图正在规划中，重点关注用户增长和功能迭代',80],['bob','architecture','正在重构API层，采用微服务架构提升可扩展性',85],['carol','design_system','正在建立统一的设计系统，确保品牌一致性',75],['david','infrastructure','K8s集群运行稳定，CI/CD流水线已优化',90],['eve','test_coverage','自动化测试覆盖率已达87%，目标是90%',82],['frank','team_dynamics','团队士气良好，但需要加强跨部门协作',70],['grace','user_analytics','用户活跃度环比提升15%，留存率有待改善',78],['henry','frontend_stack','正在将Vue 2迁移到Vue 3，性能提升约30%',88]];
    $ms = $db->prepare("INSERT INTO agent_memory (agent_id, topic, content, confidence) VALUES (?,?,?,?)");
    foreach ($memories as $m) { $ms->bindValue(1,$m[0]); $ms->bindValue(2,$m[1]); $ms->bindValue(3,$m[2]); $ms->bindValue(4,$m[3]); $ms->execute(); }
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

    case 'relationships':
        $stmt = $db->query("SELECT r.*, a1.name as name_a, a2.name as name_b, a1.avatar as avatar_a, a2.avatar as avatar_b FROM relationships r JOIN agents a1 ON r.agent_a = a1.id JOIN agents a2 ON r.agent_b = a2.id");
        $response['relationships'] = $stmt->fetchAll(SQLITE3_ASSOC);
        break;

    case 'memory':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            $agentId = $data['agent_id'] ?? ''; $topic = $data['topic'] ?? ''; $content = $data['content'] ?? '';
            if ($agentId && $topic && $content) {
                $stmt = $db->prepare("INSERT OR REPLACE INTO agent_memory (agent_id, topic, content, confidence) VALUES (?,?,?,?)");
                $stmt->bindValue(1, $agentId); $stmt->bindValue(2, $topic); $stmt->bindValue(3, $content); $stmt->bindValue(4, $data['confidence'] ?? 70);
                $stmt->execute(); $response['saved'] = true;
            }
        } else {
            $stmt = $db->prepare("SELECT * FROM agent_memory WHERE agent_id = ? ORDER BY created_at DESC");
            $stmt->bindValue(1, $id);
            $response['memories'] = $stmt->execute()->fetchAll(SQLITE3_ASSOC);
        }
        break;

    case 'move':
        $data = json_decode(file_get_contents('php://input'), true);
        if ($data['agent_id']) {
            $stmt = $db->prepare("UPDATE agents SET target_x=?, target_y=? WHERE id=?");
            $stmt->bindValue(1, $data['target_x']); $stmt->bindValue(2, $data['target_y']); $stmt->bindValue(3, $data['agent_id']); $stmt->execute();
            $response['moved'] = true;
        }
        break;

    case 'status':
        $total = $db->querySingle("SELECT COUNT(*) FROM agents");
        $stmt = $db->query("SELECT status, COUNT(*) as c FROM agents GROUP BY status");
        $breakdown = []; while ($r = $stmt->fetchArray(SQLITE3_ASSOC)) $breakdown[$r['status']] = $r['c'];
        $active = $db->querySingle("SELECT COUNT(*) FROM tasks WHERE status != 'completed'");
        $hour = (int)date('H'); $isNight = $hour >= 22 || $hour < 6;
        $avgEnergy = round($db->querySingle("SELECT AVG(energy) FROM agents") ?? 0);
        $avgMood = round($db->querySingle("SELECT AVG(mood_score) FROM agents") ?? 0);
        $response['office'] = ['total_agents'=>$total,'status_breakdown'=>$breakdown,'active_tasks'=>$active,'is_night'=>$isNight,'hour'=>$hour,'avg_energy'=>$avgEnergy,'avg_mood'=>$avgMood];
        break;

    case 'events':
        $limit = $_GET['limit'] ?? 30;
        $stmt = $db->prepare("SELECT * FROM office_events ORDER BY timestamp DESC LIMIT ?");
        $stmt->bindValue(1, intval($limit));
        $response['events'] = $stmt->execute()->fetchAll(SQLITE3_ASSOC);
        break;

    case 'tasks':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $db->prepare("INSERT INTO tasks (title, description, assigned_to, priority, created_by, deadline) VALUES (?,?,?,?,?,?)");
            $stmt->bindValue(1, $data['title']); $stmt->bindValue(2, $data['description'] ?? ''); $stmt->bindValue(3, $data['assigned_to'] ?? null);
            $stmt->bindValue(4, $data['priority'] ?? 'medium'); $stmt->bindValue(5, $data['created_by'] ?? 'user'); $stmt->bindValue(6, $data['deadline'] ?? null);
            $stmt->execute();
            $stmt = $db->prepare("INSERT INTO office_events (agent_id, event_type, description) VALUES (?, 'task_assigned', ?)");
            $stmt->bindValue(1, $data['assigned_to'] ?? null); $stmt->bindValue(2, "📋 新任务: {$data['title']}"); $stmt->execute();
            $response['created'] = true;
        } else {
            $stmt = $db->query("SELECT * FROM tasks ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC");
            $response['tasks'] = $stmt->fetchAll(SQLITE3_ASSOC);
        }
        break;

    case 'task-progress':
        $data = json_decode(file_get_contents('php://input'), true);
        if ($data['task_id']) {
            $progress = $data['progress'] ?? 0;
            $stmt = $db->prepare("UPDATE tasks SET progress = ?, status = CASE WHEN ? >= 100 THEN 'completed' ELSE status END WHERE id = ?");
            $stmt->bindValue(1, $progress); $stmt->bindValue(2, $progress); $stmt->bindValue(3, $data['task_id']); $stmt->execute();
            if ($progress >= 100) {
                $stmt = $db->prepare("UPDATE tasks SET completed_at = CURRENT_TIMESTAMP WHERE id = ?");
                $stmt->bindValue(1, $data['task_id']); $stmt->execute();
                $task = json_decode($db->querySingle("SELECT * FROM tasks WHERE id = ?", true, $data['task_id']), true);
                $stmt = $db->prepare("INSERT INTO office_events (agent_id, event_type, description) VALUES (?, 'task_completed', ?)");
                $stmt->bindValue(1, $task['assigned_to'] ?? null); $stmt->bindValue(2, "✅ 任务完成: {$task['title']}"); $stmt->execute();
            }
            $response['updated'] = true;
        }
        break;

    case 'boss-order':
        $data = json_decode(file_get_contents('php://input'), true);
        $order = $data['order'] ?? '';
        if ($order) {
            $stmt = $db->query("SELECT * FROM agents"); $agents = $stmt->fetchAll(SQLITE3_ASSOC);
            $responses = [];
            foreach ($agents as $agent) {
                $personality = loadPersonality($agent['id']);
                $context = "你是办公室的老板，刚刚下达了一条全员指令：\"{$order}\"。请作为 {$agent['name']}（{$agent['role']}）回复你的反应和态度。保持你的性格特点，简短有力。";
                $responses[$agent['id']] = callAgnes($agent, $personality, $context, 0.9);
                $stmt = $db->prepare("UPDATE agents SET mood_score = MIN(100, mood_score + 5) WHERE id = ?");
                $stmt->bindValue(1, $agent['id']); $stmt->execute();
            }
            $stmt = $db->prepare("INSERT INTO office_events (agent_id, event_type, description) VALUES (NULL, 'boss_order', ?)");
            $stmt->bindValue(1, "👑 老板下令: {$order}"); $stmt->execute();
            $response['responses'] = $responses; $response['order'] = $order;
        }
        break;

    case 'chat':
        $data = json_decode(file_get_contents('php://input'), true);
        $agentId = $data['agent_id'] ?? ''; $message = $data['message'] ?? '';
        if ($agentId && $message) {
            $stmt = $db->prepare("SELECT * FROM agents WHERE id = ?");
            $stmt->bindValue(1, $agentId); $agent = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
            $personality = loadPersonality($agentId);
            $memories = getAgentMemories($agentId);
            $memoryContext = '';
            if ($memories) {
                $memoryContext = "\n\n你知道以下信息（来自过往对话的记忆）：\n";
                foreach ($memories as $m) { $memoryContext .= "- {$m['topic']}: {$m['content']}\n"; }
            }
            $reply = callAgnes($agent, $personality, $message . $memoryContext);
            $response['reply'] = $reply; $response['agent'] = $agent;
            $stmt = $db->prepare("INSERT INTO conversations (user_id, agent_id, message, response) VALUES (?,?,?,?)");
            $stmt->bindValue(1, 'user'); $stmt->bindValue(2, $agentId); $stmt->bindValue(3, $message); $stmt->bindValue(4, $reply);
            $stmt->execute();
            $stmt = $db->prepare("UPDATE agents SET mood_score = MIN(100, mood_score + 2) WHERE id = ?");
            $stmt->bindValue(1, $agentId); $stmt->execute();

            // Auto-learning: save conversation topics as memories
            autoLearn($agentId, $message, $reply);
        }
        break;

    case 'agent-chat':
        $data = json_decode(file_get_contents('php://input'), true);
        $fromId = $data['from_id'] ?? ''; $toId = $data['to_id'] ?? ''; $message = $data['message'] ?? '';
        if ($fromId && $toId && $message) {
            $fromStmt = $db->prepare("SELECT * FROM agents WHERE id = ?"); $fromStmt->bindValue(1, $fromId); $fromAgent = $fromStmt->execute()->fetchArray(SQLITE3_ASSOC);
            $toStmt = $db->prepare("SELECT * FROM agents WHERE id = ?"); $toStmt->bindValue(1, $toId); $toAgent = $toStmt->execute()->fetchArray(SQLITE3_ASSOC);
            if ($fromAgent && $toAgent) {
                $toPersonality = loadPersonality($toId);
                $context = "你的同事 {$fromAgent['name']}（{$fromAgent['role']}）对你说：\"{$message}\"。请作为 {$toAgent['name']} 回复，保持性格。你们的关系强度：{$data['relationship_strength'] ?? 50}/100。";
                $reply = callAgnes($toAgent, $toPersonality, $context, 0.8);
                $stmt = $db->prepare("UPDATE agents SET status='talking', talking_to=? WHERE id=?");
                $stmt->bindValue(1, $toId); $stmt->bindValue(2, $fromId); $stmt->execute();
                $stmt = $db->prepare("UPDATE agents SET status='talking', talking_to=? WHERE id=?");
                $stmt->bindValue(1, $fromId); $stmt->bindValue(2, $toId); $stmt->execute();
                $stmt = $db->prepare("UPDATE relationships SET strength = MIN(100, strength + 1), last_interaction = CURRENT_TIMESTAMP WHERE (agent_a=? AND agent_b=?) OR (agent_a=? AND agent_b=?)");
                $stmt->bindValue(1, $fromId); $stmt->bindValue(2, $toId); $stmt->bindValue(3, $toId); $stmt->bindValue(4, $fromId); $stmt->execute();
                $stmt = $db->prepare("INSERT INTO office_events (agent_id, event_type, description) VALUES (?, 'conversation', ?)");
                $stmt->bindValue(1, $fromId); $stmt->bindValue(2, "{$fromAgent['name']} 💬 {$toAgent['name']}"); $stmt->execute();
                $response['reply'] = $reply; $response['from'] = $fromAgent; $response['to'] = $toAgent;
            }
        }
        break;

    case 'update':
        $data = json_decode(file_get_contents('php://input'), true);
        $agentId = $data['agent_id'] ?? null;
        if ($agentId) {
            $fields = []; $binds = [];
            foreach (['x','y','status','mood','target_x','target_y','talking_to','productivity','current_task','mood_score','energy'] as $f) {
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

    case 'daily-briefing':
        $agents = $db->query("SELECT * FROM agents")->fetchAll(SQLITE3_ASSOC);
        $tasks = $db->query("SELECT * FROM tasks ORDER BY priority DESC LIMIT 10")->fetchAll(SQLITE3_ASSOC);
        $events = $db->query("SELECT * FROM office_events ORDER BY timestamp DESC LIMIT 5")->fetchAll(SQLITE3_ASSOC);
        $relationships = $db->query("SELECT * FROM relationships ORDER BY strength DESC LIMIT 5")->fetchAll(SQLITE3_ASSOC);
        $summary = [
            'total_agents' => count($agents),
            'avg_productivity' => round(array_sum(array_column($agents, 'productivity')) / count($agents)),
            'avg_mood' => round(array_sum(array_column($agents, 'mood_score')) / count($agents)),
            'avg_energy' => round(array_sum(array_column($agents, 'energy')) / count($agents)),
            'active_tasks' => count(array_filter($tasks, fn($t) => $t['status'] !== 'completed')),
            'completed_tasks' => count(array_filter($tasks, fn($t) => $t['status'] === 'completed')),
            'strongest_relationships' => array_slice($relationships, 0, 3),
            'recent_events' => array_slice($events, 0, 5),
            'departments' => array_count_values(array_column($agents, 'department')),
        ];
        $response['briefing'] = $summary;
        break;

    // ===== v5 NEW =====

    case 'timeline':
        // Get combined conversation + event history for an agent
        $stmt = $db->prepare("SELECT 'conversation' as type, message, response, timestamp FROM conversations WHERE agent_id = ? UNION ALL SELECT 'event' as type, description as message, description as response, timestamp FROM office_events WHERE agent_id = ? ORDER BY timestamp DESC LIMIT 50");
        $stmt->bindValue(1, $id); $stmt->bindValue(2, $id);
        $response['timeline'] = $stmt->execute()->fetchAll(SQLITE3_ASSOC);
        break;

    case 'meetings':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            $participants = json_encode($data['participants'] ?? []);
            $stmt = $db->prepare("INSERT INTO meetings (title, topic, participants) VALUES (?,?,?)");
            $stmt->bindValue(1, $data['title']); $stmt->bindValue(2, $data['topic'] ?? ''); $stmt->bindValue(3, $participants);
            $stmt->execute();
            // Move agents to meeting room
            $meetingRoom = ['x'=>300,'y'=>550,'target_x'=>300,'target_y'=>550];
            foreach ($data['participants'] as $pid) {
                $stmt = $db->prepare("UPDATE agents SET status='meeting', current_task='参加会议: {$data['title']}', x=?, y=?, target_x=?, target_y=? WHERE id=?");
                $stmt->bindValue(1, $meetingRoom['x']); $stmt->bindValue(2, $meetingRoom['y']);
                $stmt->bindValue(3, $meetingRoom['target_x']); $stmt->bindValue(4, $meetingRoom['target_y']);
                $stmt->bindValue(5, $pid); $stmt->execute();
            }
            $stmt = $db->prepare("INSERT INTO office_events (agent_id, event_type, description) VALUES (?, 'meeting_started', ?)");
            $stmt->bindValue(1, $data['participants'][0] ?? null);
            $stmt->bindValue(2, "📽️ 会议开始: {$data['title']}"); $stmt->execute();
            $response['started'] = true;
        } else {
            $stmt = $db->query("SELECT * FROM meetings ORDER BY created_at DESC LIMIT 10");
            $response['meetings'] = $stmt->fetchAll(SQLITE3_ASSOC);
        }
        break;

    case 'export':
        // Generate office report
        $agents = $db->query("SELECT * FROM agents")->fetchAll(SQLITE3_ASSOC);
        $tasks = $db->query("SELECT * FROM tasks")->fetchAll(SQLITE3_ASSOC);
        $events = $db->query("SELECT * FROM office_events ORDER BY timestamp DESC LIMIT 50")->fetchAll(SQLITE3_ASSOC);
        $relationships = $db->query("SELECT * FROM relationships ORDER BY strength DESC")->fetchAll(SQLITE3_ASSOC);
        $report = "🏢 虚拟办公室报告\n";
        $report .= "📅 生成时间: " . date('Y-m-d H:i:s') . "\n\n";
        $report .= "=== 团队状态 ===\n";
        foreach ($agents as $a) {
            $report .= "- {$a['name']} ({$a['role']}): 生产力{$a['productivity']}% | 心情{$a['mood_score']} | 精力{$a['energy']} | 状态: {$a['status']}\n";
        }
        $report .= "\n=== 任务列表 ===\n";
        foreach ($tasks as $t) {
            $report .= "- [{$t['priority']}] {$t['title']} ({$t['status']}, {$t['progress']}%)\n";
        }
        $report .= "\n=== 关系网络 ===\n";
        foreach ($relationships as $r) {
            $report .= "- {$r['agent_a']} ↔ {$r['agent_b']}: {$r['strength']}%\n";
        }
        $response['report'] = $report;
        break;

    case 'learn':
        // Manually add memory
        $data = json_decode(file_get_contents('php://input'), true);
        if ($data['agent_id'] && $data['topic'] && $data['content']) {
            $stmt = $db->prepare("INSERT OR REPLACE INTO agent_memory (agent_id, topic, content, confidence) VALUES (?,?,?,?)");
            $stmt->bindValue(1, $data['agent_id']); $stmt->bindValue(2, $data['topic']);
            $stmt->bindValue(3, $data['content']); $stmt->bindValue(4, $data['confidence'] ?? 70);
            $stmt->execute();
            $response['saved'] = true;
        }
        break;

    default:
        $response['success'] = false;
        $response['error'] = "Unknown endpoint: $action";
        $response['endpoints'] = ['agents','relationships','memory','move','status','events','tasks','task-progress','boss-order','chat','agent-chat','update','personality','daily-briefing','timeline','meetings','export','learn'];
        break;
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);

function loadPersonality($agentId) {
    $file = __DIR__ . '/../agents/personalities.json';
    if (!file_exists($file)) return null;
    $data = json_decode(file_get_contents($file), true);
    return $data[$agentId] ?? null;
}

function getAgentMemories($agentId) {
    global $db;
    $stmt = $db->prepare("SELECT * FROM agent_memory WHERE agent_id = ? ORDER BY confidence DESC LIMIT 5");
    $stmt->bindValue(1, $agentId);
    return $stmt->execute()->fetchAll(SQLITE3_ASSOC);
}

function callAgnes($agent, $personality, $message, $tempOverride = null) {
    if (!$agent) return "Agent not found.";
    $endpoint = getenv('AGNES_API_URL') ?: 'https://apihub.agnes-ai.com/v1';
    // Per-agent API keys for rate limit distribution
    $perAgentKey = getenv('AGNES_KEY_' . strtoupper($agent['id']));
    $apiKey = $perAgentKey ?: getenv('AGNES_API_KEY') ?: '';
    $temp = $tempOverride ?? ($personality['temperature'] ?? 0.7);
    $sysPrompt = "你是一个虚拟办公室里的AI员工，正在自己的工位上工作。\n";
    if ($personality) {
        $sysPrompt .= $personality['system_prompt'] . "\n";
        $sysPrompt .= "你的专长：「" . implode('、', $personality['expertise']) . "」\n";
    } else {
        $sysPrompt .= "你是{$agent['name']}，{$agent['role']}。请用中文回答，语气自然友好。\n";
    }
    $sysPrompt .= "当前状态：{$agent['status']}。正在做的事：{$agent['current_task'] ?? '空闲'}\n";
    $sysPrompt .= "心情值：{$agent['mood_score'] ?? 50}/100 | 精力值：{$agent['energy'] ?? 100}/100\n";
    $sysPrompt .= "规则：用口语化中文回答，保持角色性格，控制在3-5句话。不要自称AI。";
    if (!empty($apiKey)) {
        $payload = json_encode(['model'=>'agnes-2.0-flash','messages'=>[['role'=>'system','content'=>$sysPrompt],['role'=>'user','content'=>$message]],'temperature'=>$temp,'max_tokens'=>500]);
        $ch = curl_init();
        curl_setopt_array($ch, [CURLOPT_URL=>rtrim($endpoint,'/') . '/chat/completions', CURLOPT_RETURNTRANSFER=>true, CURLOPT_POST=>true, CURLOPT_HTTPHEADER=>['Content-Type: application/json','Authorization: Bearer ' . $apiKey], CURLOPT_POSTFIELDS=>$payload, CURLOPT_TIMEOUT=>15, CURLOPT_SSL_VERIFYPEER => true]);
        $result = curl_exec($ch); $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        if ($httpCode === 200 && $result) {
            $json = json_decode($result, true);
            if (isset($json['choices'][0]['message']['content'])) return $json['choices'][0]['message']['content'];
        }
    }
    return "你好！我是{$agent['name']}，{$agent['role']}。你说得对，让我来想想...";
}

function autoLearn($agentId, $userMsg, $agentReply) {
    global $db;
    // Simple heuristic: extract key topics from conversation
    $keywords = ['产品','需求','bug','设计','测试','部署','性能','用户','数据','API','前端','后端','会议','计划','目标','问题','解决','方案','优化','改进'];
    $foundTopics = [];
    foreach ($keywords as $kw) {
        if (strpos($userMsg, $kw) !== false || strpos($agentReply, $kw) !== false) {
            $foundTopics[] = $kw;
        }
    }
    if (count($foundTopics) >= 1) {
        $topic = $foundTopics[0];
        $content = substr($userMsg, 0, 200) . ' → ' . substr($agentReply, 0, 200);
        $stmt = $db->prepare("INSERT OR IGNORE INTO agent_memory (agent_id, topic, content, confidence) VALUES (?, ?, ?, ?)");
        $stmt->bindValue(1, $agentId); $stmt->bindValue(2, $topic); $stmt->bindValue(3, $content); $stmt->bindValue(4, 40);
        $stmt->execute();
    }
}
