
            case 'logs':
                response.logs = requestLog.slice(-50);
                response.totalLogs = requestLog.length;
                break;
                
            case 'learn':
