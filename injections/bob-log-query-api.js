
            // [BOB_LOG_QUERY_API_START]
            case 'logs':
                response.logs = requestLog.slice(-50);
                response.totalLogs = requestLog.length;
                break;
            // [BOB_LOG_QUERY_API_END]

            case 'learn':
