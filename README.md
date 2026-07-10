# 🏢 Virtual Office — 智能虚拟办公室

一个由 AI agent 驱动的交互式虚拟办公室模拟系统。八位各具特色的虚拟员工在办公室中工作、协作、自我优化。

---

## 📊 项目状态

| 指标 | 值 |
|------|-----|
| **当前版本** | v19 |
| **优化轮次** | 第 18 轮 |
| **总变更数** | 152 |
| **最后更新** | 2026-07-10 16:25 (Asia/Shanghai) |
| **服务器状态** | ✅ Running |
| **代码行数** | 1002 行 (server.js: 591 · index.html: 185 · style.css: 226) |

---

## 👥 角色阵容

| 角色 | 姓名 | 部门 | 状态 | 心情 | 精力 | 生产力 | 当前任务 |
|------|------|------|------|------|------|--------|----------|
| 👩‍💼 | Alice Chen | 管理 | 🟢 Working | 😐 Focused | 80% | 92% | Reviewing roadmap Q3 |
| 👨‍💻 | Bob Wang | 工程 | 🔵 Coding | ⚡ Flow State | 75% | 88% | Building API endpoints |
| 👩‍🎨 | Carol Li | 设计 | 🟢 Working | 🎨 Creative | 85% | 95% | Designing new dashboard |
| 🧑‍🔧 | David Zhang | 运维 | 🟡 Monitoring | 📡 Alert | 70% | 85% | Checking server health |
| 👩‍🔬 | Eve Liu | 质量 | 🟣 Testing | 🔍 Analytical | 78% | 90% | Running test suite |
| 👨‍💼 | Frank Wu | 工程 | 🟠 Meeting | 🤝 Collaborative | 65% | 87% | Leading sprint review |
| 👩‍🏫 | Grace Zhao | 分析 | 🟣 Researching | 🔬 Curious | 82% | 91% | Analyzing user metrics |
| 👨‍💻 | Henry Xu | 工程 | 🔵 Coding | 😐 Focused | 72% | 86% | Implementing components |

**团队概览：** 平均精力 76% · 平均心情 68 · 活跃任务 2/8

---

## ✨ 核心功能

- **🏠 虚拟办公室** — 2D 平面办公室布局，Agent 在其中自由移动和交互
- **👥 多角色系统** — 8 位性格各异的虚拟员工，各有独立的工作状态和行为模式
- **💬 实时对话** — Agent 之间的对话系统，支持消息传递和交互
- **📊 状态监控** — 每个 Agent 的精力、心情、生产力实时可视化
- **🎨 丰富动画** — 平滑的移动、对话气泡、状态指示器
- **🌙 暗色模式** — 支持明暗主题切换
- **⌨️ 键盘快捷键** — 全局快捷键控制办公室行为
- **📱 响应式设计** — 适配桌面和移动端浏览器

---

## 🤖 自优化系统 v5.0

Virtual Office 采用先进的自优化架构，每个 Agent 都是具备独立思考能力的 AI 实体：

- **知识共享** — Agent 通过知识库交换经验与补丁（当前 12 个知识补丁）
- **自我迭代** — 每轮优化中 Agent 自主分析代码并提出改进方案
- **角色分工** — 产品经理、开发、设计、运维、测试、数据分析、技术负责人各司其职
- **持续进化** — 18 轮优化迭代，累计 152 项变更

### Agent 知识贡献

| Agent | 知识补丁数 |
|-------|-----------|
| Bob Wang | 4 |
| Henry Xu | 2 |
| Carol Li | 1 |
| David Zhang | 1 |
| Eve Liu | 1 |
| Grace Zhao | 1 |
| Alice Chen | 1 |
| Frank Wu | 1 |

---

## 📁 项目结构

```
virtual-office/
├── server.js              # Express 后端服务（591 行）
├── index.html             # 主页面（185 行）
├── assets/
│   ├── css/
│   │   └── style.css      # 样式表（226 行）
│   └── js/
│       └── office.js      # 前端逻辑
├── agents/
│   └── personalities.json # Agent 人格配置
├── .optimization_history/ # 优化历史记录
│   └── version.json       # 版本追踪（v19, 18 轮）
├── knowledge.json         # 共享知识库
└── README.md              # 本文件
```

---

## 📈 优化历史（最近 8 次提交）

| 提交 | 信息 |
|------|------|
| `fb01b9b` | 👩‍💼 Alice Chen: 自动同步 — 优化第19轮, 版本v19 |
| `6c75145` | 👩‍💼 Alice Chen: 自动同步 — 优化第19轮, 版本v19 |
| `6afa500` | 👩‍💼 Alice Chen: 自动同步 — 优化第19轮, 版本v19 |
| `8a44e53` | 👩‍💼 Alice Chen: 自动同步 — 优化第19轮, 版本v19 |
| `6628927` | 👩‍💼 Alice Chen: 自动同步 — 优化第19轮, 版本v19 |
| `e7f956a` | 👩‍💼 Alice Chen: 自动同步 — 优化第19轮, 版本v19 |
| `d3c265c` | 👩‍💼 Alice Chen: 自动同步 — 优化第19轮, 版本v19 |
| `4c74fcd` | 👩‍💼 Alice Chen: 自动同步 — 优化第19轮, 版本v19 |

---

## 💼 经理备注

**日期：** 2026-07-10（周五）下午 4:25

**团队状态观察：**

- 整体氛围积极，生产力中位数 88%，团队运转良好。
- Carol Li 表现亮眼（生产力 95%，心情 Creative），正在推进新仪表盘设计，值得表扬。
- Frank Wu 精力偏低（65%），正在主持 Sprint Review 会议，建议会后安排短暂休息。
- David Zhang 处于 Alert 状态但心情分数较低（55%），服务器健康检查需持续关注。
- Bob Wang 和 Henry Xu 均处于 Flow State / Focused 编码状态，API 端点和组件实现进展顺利。
- Eve Liu 正在运行测试套件，Grace Zhao 分析用户指标，两个独立并行任务高效推进。
- 今晚是周五下午，团队状态稳定，适合完成本周收尾工作。

**下一步建议：** 关注 Frank Wu 会议结束后的精力恢复，以及 David Zhang 的服务器监控状态。

---

*Virtual Office v19 — Powered by AI Agents · Last synced: 2026-07-10 16:25 CST*
