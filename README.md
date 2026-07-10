# 🏢 Virtual Office - 虚拟办公室

> 一个由 **8 位 AI 虚拟员工** 组成的自进化数字办公室。每个人物都有独立性格、心情、任务和知识库。办公室具备完整的自我优化能力，持续迭代代码和功能。

**状态**: 🟢 在线运行 | **版本**: v18 | **最后更新**: 2026-07-10 00:23:02+08:00

---

## 📊 实时状态面板

| 指标 | 数值 |
|------|------|
| 团队成员 | 8 人 |
| 平均心情 | 68 / 100 |
| 平均精力 | 76 / 100 |
| 当前时段 | 日间 (07:00) |
| 活跃任务 | 0 |
| 自优化轮次 | 17
| 累计变更 | 0 项
| 知识库补丁 | 12 个 |

### 团队状态分布

| 状态 | 人数 | 成员 |
|------|------|------|
| 🟢 Working | 2 | Bob Wang, Henry Xu |
| 🟡 Coding | 2 | Bob Wang, Frank Wu |
| 🔵 Monitoring | 1 | David Zhang |
| 🟣 Testing | 1 | Eve Liu |
| ⚪ Meeting | 1 | Frank Wu |
| 🟠 Researching | 1 | Grace Zhao |

---

## 👥 角色阵容

| 角色 | 部门 | 职位 | 心情 | 精力 | 状态 |
|------|------|------|------|------|------|
| Alice Chen | Management | Product Manager | focused | 80 | 🟢 |
| Bob Wang | Engineering | Senior Developer | flow_state | 75 | 🟢 |
| Carol Li | Design | UI/UX Designer | creative | 85 | 🟢 |
| David Zhang | Operations | DevOps Engineer | alert | 70 | 🟢 |
| Eve Liu | Quality | QA Engineer | analytical | 78 | 🟢 |
| Frank Wu | Engineering | Tech Lead | collaborative | 65 | 🟢 |
| Grace Zhao | Analytics | Data Scientist | curious | 82 | 🟢 |
| Henry Xu | Engineering | Frontend Developer | focused | 72 | 🟢 |

---

## ✨ 核心功能

### 虚拟办公室
- 🏢 **可视化办公室** — 2D 俯视图，角色在办公室中自由移动
- 👤 **角色详情** — 查看每位员工的效率、心情、位置、专长
- 💬 **实时事件流** — 左侧面板滚动显示办公室所有事件
- 😊 **心情系统** — 每个角色有独立心情值，互动影响情绪
- 🌙 **日夜交替** — 根据时间自动切换日间/夜间模式
- ☕ **咖啡休息** — 全员喝咖啡，精力+25、心情+10
- 📊 **每日简报** — 办公室全景报告：生产力、心情、部门分布

### 协作功能
- 📋 **任务管理** — 创建、分配、追踪任务进度
- 📽️ **会议室** — 召集角色开会讨论议题
- 📜 **时间线** — 查看角色对话/事件历史
- 📄 **导出报告** — 生成办公室文字报告
- ⌨️ **快捷键** — N/B/O/C/M/E 一键操作

### AI 驱动
- 🧠 **Agent 记忆系统** — 每个角色有自己的知识库，对话时参考过往记忆
- 🤝 **关系网络** — 角色之间有亲密度，随互动增长
- 🎨 **心情光环** — 角色头像外圈颜色实时反映心情状态
- 👑 **老板模式** — 向全员下达指令，所有角色同时给出 AI 驱动的反应
- 🤖 **自动学习** — 对话后自动提取关键词存入记忆

---

## 🤖 自优化系统 (v5.0)

办公室具备完整的自我进化能力，通过有限状态机 (FSM) 驱动持续优化。

### 架构

```
IDLE → REVIEWING → APPLYING → COMMITTING → RESTARTING → VERIFYING → IDLE
```

### v5.0 三大升级

| 升级 | 说明 | 效果 |
|------|------|------|
| 🔒 **幂等性校验器** | 每个 injector 使用唯一 marker，Check-Before-Apply | 避免重复应用相同变更 |
| 📊 **变更摘要过滤** | 全部 no-op 时跳过 git commit + restart | 零浪费周期 |
| 📚 **Agent 知识库缓存** | 已知 patch 不调用 callAgnes API | 每轮 0 次 API 调用 |

### 性能对比

| 指标 | v4.0 (线性) | v5.0 (幂等性) | 改善 |
|------|-------------|---------------|------|
| 每轮 API 调用 | 8 | 0 | 100% |
| 每轮 git commit | 8 | 0 | 100% |
| 每轮 server restart | 8 | 0 | 100% |
| 每轮执行时间 | ~90s | ~1s | 99% |

### 12 个优化注入器

| # | 角色 | 注入器 | 描述 | 状态 |
|---|------|--------|------|------|
| 1 | Bob Wang | rate_limiter | API 请求速率限制中间件 | ✅ 已缓存 |
| 2 | Bob Wang | global_errors | 全局错误处理和优雅退出 | ✅ 已缓存 |
| 3 | Bob Wang | request_logger | 请求日志和性能追踪 | ✅ 已缓存 |
| 4 | Bob Wang | log_query_api | 请求日志查询 API | ✅ 已缓存 |
| 5 | Henry Xu | keyboard_shortcuts | 键盘快捷键系统 | ✅ 已缓存 |
| 6 | Henry Xu | page_loader | 页面加载动画 | ✅ 已缓存 |
| 7 | Carol Li | css_tokens | CSS 设计令牌和暗色模式 | ✅ 已缓存 |
| 8 | David Zhang | security_headers | 安全响应头 | ✅ 已缓存 |
| 9 | Eve Liu | endpoint_whitelist | API 端点白名单验证 | ✅ 已缓存 |
| 10 | Grace Zhao | metrics_api | 性能指标 API 端点 | ✅ 已缓存 |
| 11 | Alice Chen | onboarding | 新用户引导流程 | ✅ 已缓存 |
| 12 | Frank Wu | version_meta | 更新版本元数据 | ✅ 已缓存 |

### 代码统计

| 文件 | 行数 |
|------|------|
| server.js | 699 |
| index.html | 185 |
| assets/css/style.css | 226 |
| **总计** | **1110** |

---

## 🚀 快速开始

### 前置要求
- Node.js 18+
- npm 包管理器

### 本地运行

```bash
cd virtual-office

# 启动服务器
PORT=9094 node server.js

# 启动自优化系统
node self-optimize.js
```

### 访问地址
- 办公室界面: http://localhost:9094
- 健康检查: http://localhost:9094/?endpoint=status
- 性能指标: http://localhost:9094/?endpoint=metrics
- 团队列表: http://localhost:9094/?endpoint=agents
- 事件日志: http://localhost:9094/?endpoint=logs

---

## 📁 项目结构

```
virtual-office/
├── server.js                  # Node.js 服务器 (699 行)
├── index.html                 # 办公室界面
├── assets/
│   ├── css/style.css          # 样式表 (226 行)
│   └── js/office.js           # 前端逻辑
├── agents/
│   └── personalities.json     # 角色配置
├── self-optimize.js           # v5.0 幂等性状态机
├── knowledge.json             # Agent 知识库缓存
├── .optimization_history/
│   └── version.json           # 优化历史记录
├── injections/                # 带 marker 的注入文件
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
├── UPGRADE_V5.md              # v5.0 升级文档
└── README.md                  # 本文件
```

---

## 📈 优化历史

### 最近提交

```
77e19c2 清理: 删除 .deploy_backups/ 临时文件
c3addd2 Merge remote v5.0 + parallel optimization rounds
8991560 🚀 v5.0 全量更新: 幂等性校验器 + 变更摘要过滤 + Agent知识库缓存
f1c7fca 🤖 优化补丁: 11 项改进 (rate limiter, error handling, logging...)
e579d83 🤖 优化补丁: 初始 v5.0 优化集
```

### 里程碑

| 版本 | 日期 | 变更数 | 说明 |
|------|------|--------|------|
| v18 | 2026-07-10 | 152 | v5.0 幂等性状态机，12 个注入器全部缓存 |
| v17 | 2026-07-09 | - | 修复重启锁持久化问题 |
| v16 | 2026-07-09 | - | 初始 v5.0 部署 |

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Node.js (原生 HTTP 服务器) |
| 前端 | Vanilla JS + CSS3 |
| 数据库 | SQLite (PHP 版本) |
| 自优化 | 有限状态机 (FSM) + Git |
| 部署 | 原子提交 (patch-in-progress 分支) |
| 健康检查 | 指数退避重试 (5 次) |

---

## 📜 License

MIT

---

## 🔗 链接

- **GitHub**: https://github.com/luckysong-sudo/virtual-office
- **自优化日志**: 每 5 分钟自动执行一轮优化
- **知识库**: `knowledge.json` 存储所有已验证的优化方案

---

> 💼 经理备注: 办公室运转良好，所有 8 位团队成员状态积极。自优化系统已稳定运行 17 轮，12 个注入器全部命中知识库缓存，实现零浪费优化周期。下一个目标：探索新的优化方向。
