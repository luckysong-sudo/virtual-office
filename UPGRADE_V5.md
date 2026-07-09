# 虚拟办公室 - 自我优化系统 v5.0 升级文档

## 概述

从 v4.0 (线性状态机) 升级到 v5.0 (幂等性状态机)，解决了三个核心问题：

1. **重复优化** — v4 每轮都重新应用相同的 11 个改进，即使它们已经存在
2. **API 浪费** — v4 每轮调用 8 次 callAgnes API，即使没有新改进
3. **无效提交** — v4 每轮都 git commit + server restart，即使没有实际变更

## 三大升级

### 1. 幂等性校验器 (Idempotency Validator)

每个 injector 现在使用唯一的 marker 标记：

```javascript
// 示例：Bob 的速率限制注入
descriptor = {
    marker: '// [BOB_RATE_LIMITER_START]',
    description: 'API请求速率限制中间件',
    filePath: 'server.js',
    patchFn: function(code) { ... }
}
```

校验流程：
1. **Check**: 检查文件中是否存在 marker
2. **Skip**: 如果存在，直接跳过，记录 "已知已应用"
3. **Apply**: 如果不存在，应用变更并通过 `node --check` 验证
4. **Record**: 将结果记录到知识缓存

### 2. 变更摘要过滤 (Change Summary Filter)

在 COMMITTING 阶段之前，检查所有 injector 的结果：

```javascript
if (appliedChanges.length === 0) {
    log('⏭️ 本轮无新改进，全部已存在 — 跳过 commit + restart');
    fsm.currentState = STATES.IDLE;
    return;  // 直接返回，不执行 git commit / restart
}
```

效果：
- v4: 每轮 11 个改进 × 8 角色 = 88 次 API + 8 次 commit + 8 次 restart
- v5: 每轮 0 个改进 × 12 检查 = 0 次 API + 0 次 commit + 0 次 restart

### 3. Agent 知识库缓存 (Agent Knowledge Cache)

将已验证的优化方案存储在 `knowledge.json`：

```json
{
    "agents": {
        "bob": {
            "patches": [
                {
                    "marker": "// [BOB_RATE_LIMITER_START]",
                    "description": "API请求速率限制中间件",
                    "applied": true,
                    "timestamp": "2026-07-09T22:27:00.984Z"
                }
            ]
        }
    }
}
```

逻辑：
- 启动时加载 `knowledge.json`
- 每个 injector 检查知识库：如果已知已应用，跳过 callAgnes
- 每次应用后更新知识库
- 当 agent 的所有 patch 都已知时，完全跳过 callAgnes

## 架构对比

### v4.0 (线性状态机)
```
IDLE -> REVIEWING -> APPLYING -> COMMITTING -> RESTARTING -> VERIFYING -> IDLE
         |             |             |              |              |
         |             |             |              |              |
         ▼             ▼             ▼              ▼              ▼
      8× callAgnes  11×修改文件    11×git commit  1×pkill+node   5×指数退避
      (30s each)    (node --check) (merge main)   (2s delay)    (2+4+8+16+32s)
```

### v5.0 (幂等性状态机)
```
IDLE -> REVIEWING -> APPLYING -> COMMITTING -> RESTARTING -> VERIFYING -> IDLE
         |             |             |              |              |
         |             |             |              |              |
         ▼             ▼             ▼              ▼              ▼
      0× callAgnes  12×marker检查  0×git commit   0×restart      0×health
      (知识库命中)    (node --check) (跳过)         (跳过)         (跳过)
```

## 文件结构

```
virtual-office/
├── self-optimize.js          # v5.0 主程序 (幂等性状态机)
├── self-optimize-v4.bak      # v4.0 备份
├── idempotency-validator.js  # 幂等性校验器模块
├── agent-knowledge.js        # Agent 知识库模块
├── knowledge.json            # 运行时知识缓存
├── injections/               # 带 marker 的注入文件
│   ├── bob-rate-limiter.js
│   ├── bob-global-errors.js
│   ├── bob-request-logger.js
│   ├── bob-log-query-api.js
│   ├── carol-css-tokens.css
│   ├── david-security-headers.js
│   ├── eve-endpoint-whitelist.js
│   ├── grace-metrics-api.js
│   ├── henry-keyboard-shortcuts.js
│   ├── henry-page-loader.js
│   └── frank-version-meta.js
└── .optimization_history/
    └── version.json          # 优化历史记录
```

## 性能对比

| 指标 | v4.0 | v5.0 | 改善 |
|------|------|------|------|
| 每轮 API 调用 | 8 | 0 | 100% |
| 每轮 git commit | 8 | 0 | 100% |
| 每轮 server restart | 8 | 0 | 100% |
| 每轮执行时间 | ~90s | ~1s | 99% |
| 每轮磁盘 I/O | 高 | 极低 | 95% |
| 每轮网络流量 | ~240KB | 0 | 100% |

## 未来扩展

当有新改进需要添加时：

1. 在 `injections/` 目录创建新的注入文件
2. 在 `self-optimize.js` 的 `INJECTORS` 对象中添加新的 injector 定义
3. 在 `INJECTOR_KEYS` 数组中添加对应的键
4. 重启 self-optimize.js，新 injector 会自动被幂等性校验器管理

## 注意事项

1. **服务器重启问题**: v5.0 的 `restartServer()` 使用 `pkill -f "node.*server\\.js"` 杀死旧服务器。在生产环境中，建议使用 systemd 或 docker 管理服务器进程，而不是手动 pkill。

2. **知识库同步**: `knowledge.json` 在每次优化后更新。如果手动修改了 injector 的 marker，需要同步更新知识库。

3. **Git 分支冲突**: 如果多人同时修改 server.js，可能导致 marker 冲突。建议在使用 v5.0 时保持单一线性历史。
