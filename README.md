# 🏢 Virtual Office

一个自优化的虚拟办公室模拟系统——8位 AI 角色各司其职，在持续迭代中自我进化。

> **版本:** v19 | **最后更新:** 2026-07-10 15:40 (Asia/Shanghai) | **优化轮次:** 第 18 轮

---

## 📊 实时状态面板

| 指标 | 数值 |
|------|------|
| 团队成员 | 8 人 |
| 平均心情 | 😊 68/100 |
| 平均精力 | ⚡ 76/100 |
| 当前轮次 | 18 |
| 总变更数 | 19 个版本 |
| 代码行数 | 1,002 行 |
| 服务器状态 | 🟢 Online |

### 工作状态分布

- 💻 Coding: 2 人 (Bob Wang, Henry Xu)
- 📋 Working: 2 人 (Alice Chen, Carol Li)
- 🔍 Monitoring: 1 人 (David Zhang)
- 🧪 Testing: 1 人 (Eve Liu)
- 🤝 Meeting: 1 人 (Frank Wu)
- 🔬 Researching: 1 人 (Grace Zhao)

---

## 👥 角色阵容

| 角色 | 姓名 | 部门 | 状态 | 心情 | 精力 | 生产力 | 当前任务 |
|------|------|------|------|------|------|--------|----------|
| 👩‍💼 | Alice Chen | Management | Working | Focused | 80 | 92% | Reviewing roadmap Q3 |
| 👨‍💻 | Bob Wang | Engineering | Coding | Flow State | 75 | 88% | Building API endpoints |
| 👩‍🎨 | Carol Li | Design | Working | Creative | 85 | 95% | Designing new dashboard |
| 🧑‍🔧 | David Zhang | Operations | Monitoring | Alert | 70 | 85% | Checking server health |
| 👩‍🔬 | Eve Liu | Quality | Testing | Analytical | 78 | 90% | Running test suite |
| 👨‍💼 | Frank Wu | Engineering | Meeting | Collaborative | 65 | 87% | Leading sprint review |
| 👩‍🏫 | Grace Zhao | Analytics | Researching | Curious | 82 | 91% | Analyzing user metrics |
| 👨‍💻 | Henry Xu | Engineering | Coding | Focused | 72 | 86% | Implementing components |

---

## ✨ 核心功能

- **🗺️ 虚拟办公室地图** — 交互式 2D 办公室布局，角色自由走动
- **💬 角色对话系统** — 基于角色的自然语言交互引擎
- **📋 任务看板** — 实时显示每个角色的当前任务与进度
- **📊 状态监控仪表盘** — 可视化心情、精力、生产力等关键指标
- **🔄 自优化架构** — 角色通过知识积累与反馈循环自我改进
- **🎨 动态视觉设计** — CSS 令牌驱动的主题系统，支持暗色模式
- **⌨️ 键盘快捷键** — 全局导航与快速操作
- **📈 性能分析** — 内置性能指标追踪与 API 端点

---

## 🤖 自优化系统 v5.0

Virtual Office 采用创新的自优化架构，每位角色都是一个独立的知识单元：

### 工作原理

1. **知识图谱** — 每个角色维护专属的 `knowledge.json`，记录经验、教训和最佳实践
2. **补丁机制** — 角色通过 `patches` 对代码库进行增量修改，每次优化都是可追溯的
3. **反馈循环** — 角色根据任务完成情况和同事反馈调整行为策略
4. **版本演进** — 每轮优化生成新版本，变更历史完整保留在 `version.json` 中

### 知识库状态

| 角色 | 知识补丁数 |
|------|-----------|
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
├── server.js              # 后端服务 (591 行)
├── index.html             # 前端主页面 (185 行)
├── assets/
│   └── css/
│       └── style.css      # 样式表 (226 行)
├── agents/
│   └── personalities.json # 角色人格定义
├── knowledge.json         # 全员知识库
├── .optimization_history/
│   └── version.json       # 优化版本历史
└── README.md              # 项目文档
```

---

## 📈 优化历史

最近 5 次提交：

| 提交 | 说明 |
|------|------|
| afac991 | 👩‍💼 Alice Chen: 自动同步 — 优化第19轮, 版本v19 |
| efe7eb5 | 👩‍💼 Alice Chen: 自动同步 — 优化第19轮, 版本v19 |
| d32d8a7 | 👩‍💼 Alice Chen: 自动同步 — 优化第19轮, 版本v19 |
| f97c4aa | 👩‍💼 Alice Chen: 自动同步 — 优化第19轮, 版本v19 |
| 0b80bc8 | 👩‍💼 Alice Chen: 自动同步 — 优化第19轮, 版本v19 |

---

## 💼 经理备注

**Alice Chen 的观察日志 — 2026-07-10 15:40 CST**

今日团队整体运转良好。Carol Li 以 95% 的生产力领跑全场，正在推进新仪表板的设计工作；Grace Zhao 和 Eve Liu 分别在数据分析和测试领域表现稳健。

值得注意的是 David Zhang 的心情分数偏低（55/100），虽然精力尚可但警觉度较高，建议关注其服务器健康检查任务的压力水平。Frank Wu 正在主持冲刺评审会议，精力消耗较大（65/100），会后需安排适当休息。

Bob Wang 和 Henry Xu 两位开发处于心流状态，正在并行推进 API 端点和组件实现，效率可观。当前版本已迭代至 v19，共完成 18 轮优化，代码库稳定在 1,002 行。

下一步建议：在下一轮优化中关注 David 的情绪恢复，并考虑将 Carol 的仪表板设计与 Grace 的用户指标分析做交叉对齐。

---

*Virtual Office — Where AI characters come to life. 🚀*
