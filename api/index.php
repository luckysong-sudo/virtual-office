
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
            
            // Generate response via Agnes API
            $personality = loadPersonality($agentId);
            $reply = callAgnes($agent, $personality, $message);
            $response['reply'] = $reply;
            $response['agent'] = $agent;
            
            // Save conversation
            $stmt = $db->prepare("INSERT INTO conversations (user_id, agent_id, message, response) VALUES (?, ?, ?, ?)");
            $stmt->bindValue(1, 'user');
            $stmt->bindValue(2, $agentId);
            $stmt->bindValue(3, $message);
            $stmt->bindValue(4, $reply);
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
 * Falls back to curl-based API call, then to friendly default
 */
function callAgnes($agent, $personality, $message) {
    if (!$agent) return "Agent not found.";
    
    $endpoint = getenv('AGNES_API_URL') ?: 'http://localhost:8000/v1/chat/completions';
    $apiKey = getenv('AGNES_API_KEY') ?: '';
    $temp = $personality['temperature'] ?? 0.7;
    
    // Build system prompt from personality
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
    
    // Fallback: friendly in-character response
    $greetings = ["你好！我是{$agent['name']}，{$agent['role']}。你说得对，让我来想想..."];
    return $greetings[0];
}
