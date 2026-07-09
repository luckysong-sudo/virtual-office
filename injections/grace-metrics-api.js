
            // [GRACE_METRICS_API_START]
            case 'metrics':
                response.metrics = {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    cpu: process.cpuUsage(),
                    agentsOnline: store.agents.length,
                    totalConversations: store.conversations.length,
                    totalEvents: store.events.length,
                };
                break;
            // [GRACE_METRICS_API_END]

            case 'meetings':
