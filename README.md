# 🏢 Virtual Office — 虚拟办公室

一个基于 Web 的虚拟办公室模拟器，拥有 8 位 AI 员工，具备实时动画、角色分工和自优化系统。

**版本:** v19 | **最后更新:** 2026-07-10 18:10 (Asia/Shanghai)

---

## 📊 实时状态面板

| 指标 | 数值 |
|------|------|
| 团队成员 | 8 人 |
| 平均心情 | 😊 68/100 |
| 平均精力 | ⚡ 76/100 |
| 优化轮次 | 第 18 轮 |
| 总变更数 | 152 次 |
| 代码行数 | 1,002 行 (server.js: 591, index.html: 185, style.css: 226) |
| 活跃状态 | 工作 2 · 编码 2 · 监控 1 · 测试 1 · 会议 1 · 研究 1 |

---

## 👥 角色阵容

| 角色 | 姓名 | 部门 | 状态 | 心情 | 精力 | 生产力 | 当前任务 |
|------|------|------|------|------|------|--------|----------|
| 👩‍💼 | Alice Chen | 管理 | 🟢 Working | 😐 Focused | 80 | 92% | Reviewing roadmap Q3 |
| 👨‍💻 | Bob Wang | 工程 | 🟢 Coding | 😄 Flow State | 75 | 88% | Building API endpoints |
| 👩‍🎨 | Carol Li | 设计 | 🟢 Working | 😊 Creative | 85 | 95% | Designing new dashboard |
| 🧑‍🔧 | David Zhang | 运维 | 🟡 Monitoring | 😐 Alert | 70 | 85% | Checking server health |
| 👩‍🔬 | Eve Liu | 质量 | 🟢 Testing | 😐 Analytical | 78 | 90% | Running test suite |
| 👨‍💼 | Frank Wu | 工程 | 🔵 Meeting | 🙂 Collaborative | 65 | 87% | Leading sprint review |
| 👩‍🏫 | Grace Zhao | 分析 | 🟢 Researching | 😃 Curious | 82 | 91% | Analyzing user metrics |
| 👨‍💻 | Henry Xu | 工程 | 🟢 Coding | 😐 Focused | 72 | 86% | Implementing components |

---

## ✨ 核心功能

- **🗺️ 虚拟办公室地图** — 交互式 2D 办公室布局，角色自由移动
- **👥 8 位 AI 员工** — 各自有角色、性格、部门和当前任务
- **💬 对话系统** — 角色间可以互相交流，消息气泡实时显示
- **🎯 任务分配** — 经理可以给员工分配任务，员工自主完成
- **📊 实时仪表盘** — 查看团队生产力、心情、精力的统计面板
- **🌙 日夜循环** — 办公室环境随时间变化，夜间模式自动切换
- **🔔 通知系统** — 员工状态变化时发送通知
- **🤖 自优化系统** — 团队会自动学习和改进工作流程

---

## 🤖 自优化系统 v5.0

Virtual Office 内置了多智能体自优化引擎，每轮迭代自动运行：

1. **📋 知识共享** — 每位员工学习其他成员的补丁和决策
2. **🔄 交叉改进** — 工程师优化设计师的方案，设计师改进工程师的代码
3. **📈 性能追踪** — 持续监控生产力指标，识别瓶颈
4. **🧠 经验积累** — 历史优化记录存储在 `.optimization_history/` 中
5. **🎯 版本管理** — 每次优化生成新版本，可追溯变更

当前知识库覆盖 7 位员工，共积累了 12 个补丁模板。

---

## 📁 项目结构

```
virtual-office/
├── server.js              # 后端服务 (591 行)
├── index.html             # 前端主页面 (185 行)
├── assets/
│   ├── css/style.css      # 样式表 (226 行)
│   └── js/
│       └── app.js         # 前端逻辑
├── agents/
│   └── personalities.json # 角色性格定义
├── .optimization_history/ # 优化历史记录
│   ├── version.json       # 版本与变更日志
│   └── knowledge.json     # 知识库
├── README.md              # 项目文档
└── package.json           # 依赖配置
```

---

## 📈 优化历史

最近 5 次提交：

| # | 提交 | 作者 | 描述 |
|---|------|------|------|
| 1 | `89beb5b` | Alice Chen | 👩‍💼 自动同步 — 优化第19轮, 版本v19 |
| 2 | `de895d9` | Alice Chen | 👩‍💼 自动同步 — 优化第19轮, 版本v19 |
| 3 | `cec9a23` | 🔒 Fix | 移除 package.json 中的 PAT token |
| 4 | `6af6f91` | Alice Chen | 👩‍💼 自动同步 — 优化第19轮, 版本v19 |
| 5 | `b7e07b2` | Alice Chen | 👩‍💼 自动同步 — 优化第19轮, 版本v19 |

---

## 💼 经理备注

**日期:** 2026-07-10 18:10 (Asia/Shanghai)  
**汇报人:** Alice Chen, Product Manager

### 今日团队观察

今天的团队状态整体稳健。下午 6 点时，办公室仍有 6 位同事在工位上，说明大家的工作热情很高。

**亮点:**
- Carol Li 生产力达到 95%，正在设计新的仪表盘界面，创意状态满分 💡
- Grace Zhao 以 91% 的生产力分析用户指标，好奇心驱动的研究方向很有价值 🔬
- Eve Liu 的测试套件运行顺利，分析型工作状态保证了质量底线 ✅

**关注事项:**
- Frank Wu 在开 Sprint Review 会议，精力降至 65，会后需关注恢复情况 📉
- David Zhang 监控服务器健康时心情偏紧张（55/100），建议安排一次轻松的站会缓解压力 😰
- Henry Xu 编码中但精力 72，接近傍晚时段，注意提醒他休息

**总体评价:** 团队平均心情 68/100，平均精力 76/100，处于正常偏好的水平。18 轮优化累计 152 次变更，代码库稳定增长至 1,002 行。自优化系统运行良好，知识共享机制正在发挥作用。

> "好的团队不是不犯错，而是每次犯错都变得更强。" — Alice Chen

---

*Virtual Office v19 · Powered by Multi-Agent Self-Optimization Engine*
