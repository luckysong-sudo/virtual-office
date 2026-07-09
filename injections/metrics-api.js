
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
                
            case 'meetings':
