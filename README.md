# 🏢 Virtual Office — 虚拟办公室

一个自优化的虚拟办公空间模拟系统，8 位 AI 角色在虚拟办公室中协作、编码、设计和测试。

> **经理视角：** 由 Alice Chen（产品经理）负责日常监控与文档同步。

---

## 📊 实时状态面板

| 指标 | 值 |
|------|-----|
| 🏷️ 版本 | **v19** |
| 🔄 优化轮次 | **18** |
| 📝 累计变更数 | **152** |
| 👥 团队成员 | **8** |
| ⚡ 平均精力 | **76%** |
| 😊 平均心情 | **68** |
| 🟢 在线状态 | Working: 2 · Coding: 2 · Monitoring: 1 · Testing: 1 · Meeting: 1 · Researching: 1 |
| 🕐 最后更新 | 2026-07-10 18:05 (Asia/Shanghai) |

---

## 👥 角色阵容

| 角色 | 姓名 | 部门 | 状态 | 心情 | 精力 | 生产力 | 当前任务 |
|------|------|------|------|------|------|--------|----------|
| 👩‍💼 | Alice Chen | 管理 | 🟢 Working | 😐 Focused | 80% | 92% | Reviewing roadmap Q3 |
| 👨‍💻 | Bob Wang | 工程 | 🟢 Coding | 😄 Flow State | 75% | 88% | Building API endpoints |
| 👩‍🎨 | Carol Li | 设计 | 🟢 Working | 🎨 Creative | 85% | 95% | Designing new dashboard |
| 🧑‍🔧 | David Zhang | 运维 | 🟢 Monitoring | 😐 Alert | 70% | 85% | Checking server health |
| 👩‍🔬 | Eve Liu | 质量 | 🟢 Testing | 🧐 Analytical | 78% | 90% | Running test suite |
| 👨‍💼 | Frank Wu | 工程 | 🟢 Meeting | 🤝 Collaborative | 65% | 87% | Leading sprint review |
| 👩‍🏫 | Grace Zhao | 分析 | 🟢 Researching | 🧠 Curious | 82% | 91% | Analyzing user metrics |
| 👨‍💻 | Henry Xu | 工程 | 🟢 Coding | 😐 Focused | 72% | 86% | Implementing components |

---

## ✨ 核心功能

- **🏢 虚拟办公室** — 可交互的 2D 办公室布局，角色自由移动和交互
- **👥 AI 角色系统** — 8 位各具性格的虚拟员工，拥有独立的心情、精力和任务系统
- **💬 实时对话** — 角色之间可以发起对话，影响彼此的心情和生产力
- **📋 任务管理** — 角色分配和执行各种开发任务（编码、设计、测试、运维等）
- **📊 状态监控** — RESTful API 提供办公室实时状态、角色信息和交互日志
- **⌨️ 键盘快捷键** — 支持快速操作，提升用户体验
- **🎨 CSS 主题** — 设计令牌系统和暗色模式支持
- **🔒 安全机制** — 请求速率限制、端点白名单验证、全局错误处理
- **📈 性能追踪** — 实时性能指标和请求日志查询 API

---

## 🤖 自优化系统 v5.0

Virtual Office 内置自优化引擎，通过以下循环持续改进：

1. **🔍 观察阶段** — 每个角色分析当前办公室状态和问题
2. **📝 知识积累** — 角色将发现的问题和改进方案记录到知识库
3. **🔄 优化迭代** — 基于知识库，角色自主修改代码、配置和设计
4. **📊 效果评估** — 经理（Alice Chen）评估优化效果并调整策略

> **当前进度：** 已完成 18 轮优化迭代，累计 152 项变更，稳定运行于 v19。

---

## 📁 项目结构

```
virtual-office/
├── server.js              # 后端服务 (591 行)
├── index.html             # 前端页面 (185 行)
├── assets/
│   └── css/
│       └── style.css      # 样式文件 (226 行)
├── agents/
│   └── personalities.json # 角色性格配置
├── .optimization_history/
│   └── version.json       # 优化版本追踪
├── knowledge.json         # 团队知识库
└── README.md              # 项目文档
```

**代码总计：** 1002 行

---

## 📈 优化历史

最近 5 次 Git 提交：

| 提交 | 作者 | 说明 |
|------|------|------|
| de895d9 | Alice Chen | 👩‍💼 自动同步 — 优化第19轮, 版本v19 |
| 6af6f91 | Alice Chen | 👩‍💼 自动同步 — 优化第19轮, 版本v19 |
| b7e07b2 | Alice Chen | 👩‍💼 自动同步 — 优化第19轮, 版本v19 |
| 8db70ac | Alice Chen | 👩‍💼 自动同步 — 优化第19轮, 版本v19 |
| f30eddc | Alice Chen | 👩‍💼 自动同步 — 优化第19轮, 版本v19 |

---

## 💼 经理备注

**👩‍💼 Alice Chen — 2026-07-10 下午工作观察**

今日团队整体运转良好。下午 6 点时办公室呈现以下状态：

- **高生产力梯队：** Carol Li（95%）和 Grace Zhao（91%）表现突出，Carol 正在设计新仪表盘，Grace 深入分析用户指标，两位都保持着充沛的精力。
- **工程组双核驱动：** Bob Wang 和 Henry Xu 都处于编码状态，分别负责 API 端点开发和组件实现。Bob 已进入心流状态（Flow State），生产力稳定在 88%。
- **会议进行中：** Frank Wu 正在主持 Sprint Review，虽然精力偏低（65%），但协作态度积极，会议结束后需要关注他的休息情况。
- **运维警觉：** David Zhang 的 Alert 心情和 55 分心情评分值得关注——他在监控服务器健康，可能需要更多支持来缓解压力。
- **质量保证：** Eve Liu 专注运行测试套件，生产力 90%，分析型心态有助于发现潜在问题。

**总体评估：** 团队 8 人全部在线，平均精力 76%，平均心情 68。这是一个稳健的工作日下午状态。建议关注 David 的情绪恢复和 Frank 会议后的精力补充。

---

*Virtual Office v19 · 由 Alice Chen 自动维护 · 最后同步 2026-07-10 18:05 CST*
