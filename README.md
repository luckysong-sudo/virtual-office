# 🏢 Virtual Office — 虚拟办公室

> 一个自优化的虚拟办公室模拟器。8 位 AI 角色在动态办公空间中协作、编码、设计、测试与分析，通过多轮自主迭代持续改进自身代码。

**版本号:** v19 | **最后更新:** 2026-07-10 18:50 (Asia/Shanghai) | **状态:** 🟢 在线运行

---

## 📊 实时状态面板

| 指标 | 值 |
|------|-----|
| 团队成员 | 8 人 |
| 平均心情 | 😊 68/100 |
| 平均精力 | ⚡ 76/100 |
| 优化轮次 | 18 轮 |
| 总变更数 | 152 次 |
| 当前状态 | 2 人工作 · 2 人编码 · 1 人监控 · 1 人测试 · 1 人开会 · 1 人研究 |
| 代码行数 | server.js: 591 · index.html: 185 · style.css: 226 (共 1002 行) |

---

## 👥 角色阵容

| 角色 | 姓名 | 部门 | 状态 | 心情 | 精力 | 生产力 | 当前任务 |
|------|------|------|------|------|------|--------|----------|
| 👩💼 | Alice Chen | 管理 | Working | Focused | 80 | 92% | Reviewing roadmap Q3 |
| 👨💻 | Bob Wang | 工程 | Coding | Flow State | 75 | 88% | Building API endpoints |
| 👩🎨 | Carol Li | 设计 | Working | Creative | 85 | 95% | Designing new dashboard |
| 🧑🔧 | David Zhang | 运维 | Monitoring | Alert | 70 | 85% | Checking server health |
| 👩🔬 | Eve Liu | 质量 | Testing | Analytical | 78 | 90% | Running test suite |
| 👨💼 | Frank Wu | 工程 | Meeting | Collaborative | 65 | 87% | Leading sprint review |
| 👩🏫 | Grace Zhao | 分析 | Researching | Curious | 82 | 91% | Analyzing user metrics |
| 👨💻 | Henry Xu | 工程 | Coding | Focused | 72 | 86% | Implementing components |

---

## ✨ 核心功能

- **🏗️ 虚拟办公室模拟** — 8 个 AI 代理在 2D 办公空间中自由移动、交互
- **🤖 自主优化系统** — 代理基于知识图谱持续改进代码
- **📊 实时仪表盘** — 可视化展示团队状态、心情、生产力与系统指标
- **🗣️ 对话系统** — 代理之间可以互相交谈，共享信息
- **📝 日志追踪** — 完整的请求日志与性能指标记录
- **🎨 暗色模式** — 支持深色主题切换
- **⌨️ 键盘快捷键** — 快速操作导航与功能控制
- **🛡️ 安全机制** — 端点白名单验证与速率限制中间件

---

## 🤖 自优化系统 v5.0

Virtual Office 的自优化引擎是项目的核心创新：

1. **知识图谱驱动** — 每个代理维护独立的知识图谱，记录其他代理的代码变更与决策
2. **多轮迭代优化** — 系统通过 18 轮自主迭代持续改进，累计完成 152 次变更
3. **角色分工明确** — 后端开发、前端开发、设计、运维、测试、数据分析、技术主管、产品经理各司其职
4. **自适应学习** — 代理根据历史优化记录调整行为策略，逐步提升代码质量
5. **经理监督** — Alice Chen 作为产品经理协调全局，确保优化方向符合业务目标

### 各代理知识图谱覆盖情况

| 代理 | 知识图谱条目数 |
|------|----------------|
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
├── server.js              # 主服务器 (591 行)
├── index.html             # 前端页面 (185 行)
├── assets/
│   └── css/
│       └── style.css      # 样式表 (226 行)
├── agents/
│   ├── personalities.json # 角色性格定义
│   └── [各代理目录]       # 代理专属文件
├── .optimization_history/
│   └── version.json       # 优化历史与变更记录
├── knowledge.json         # 全局知识图谱
└── README.md              # 项目文档
```

---

## 📈 优化历史（最近 5 次提交）

| # | 提交 | 说明 |
|---|------|------|
| 1 | `bc1949d` | 👩💼 Alice Chen: 自动同步 — 优化第18轮, 版本v19 |
| 2 | `23f6a75` | 👩💼 Alice Chen: 自动同步 — 优化第18轮, 版本v19 |
| 3 | `b528213` | 👩💼 Alice Chen: 自动同步 — 优化第18轮, 版本v19 |
| 4 | `9d63237` | 📝 自动同步: 优化第 17 轮 |
| 5 | `fc3a45b` | 👩💼 Alice Chen: 自动同步 — 优化第19轮, 版本v19 |

---

## 💼 经理备注

**Alice Chen 的观察 — 2026-07-10 18:50 CST**

今日团队整体表现稳健。Q3 路线图审查正在有序进行中，各角色均处于高效工作状态。

**亮点：**
- Carol Li（设计师）生产力最高达 95%，创意满满，新仪表盘设计进展顺利
- Grace Zhao（数据科学家）专注用户指标分析，生产力 91%，好奇心驱动发现
- Eve Liu（QA）测试套件运行中，分析型心态保证了质量把控

**关注点：**
- Frank Wu（技术主管）精力偏低（65%），可能因主持冲刺评审会议消耗较大，建议会后适当休息
- David Zhang（运维）心情分数 55 分偏低，保持警觉状态但需关注压力水平
- Henry Xu（前端）与 Bob Wang（后端）均在编码中，两人精力分别为 72 和 75，属正常范围

**总体评价：** 8 人团队在 18 轮优化中累计完成 152 次代码变更，系统已稳定运行。今日无紧急任务，团队处于良性工作状态。

---

*Virtual Office Simulator v19 · Powered by Autonomous AI Agents · Last synced by Alice Chen*
