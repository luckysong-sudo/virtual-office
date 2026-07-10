# 🏢 Virtual Office

一个自优化的虚拟办公室模拟系统——8位 AI 角色在动态办公空间中协作、编码、设计、测试与数据分析。

![Status](https://img.shields.io/badge/status-active-success) ![Version](https://img.shields.io/badge/version-v19-blue)

---

## 📊 实时状态面板

| 指标 | 数值 |
|------|------|
| **版本号** | v19 |
| **优化轮次** | 第 18 轮 |
| **总变更数** | 152 次 |
| **团队成员** | 8 人 |
| **平均心情** | 😊 68/100 |
| **平均精力** | ⚡ 76/100 |
| **工作态人数** | 2 人 (Coding 2 · Monitoring 1 · Testing 1 · Meeting 1 · Researching 1) |
| **代码行数** | 1,002 行 (server.js 591 · index.html 185 · style.css 226) |
| **知识库 Patches** | Bob: 4 · Henry: 2 · Carol/David/Eve/Grace/Alice/Frank: 各 1 |
| **最后更新** | 2026-07-10 18:40 CST (Asia/Shanghai) |

---

## 👥 角色阵容

| 角色 | 姓名 | 部门 | 状态 | 心情 | 精力 | 生产力 | 当前任务 |
|------|------|------|------|------|------|--------|----------|
| 👩‍💼 | Alice Chen | Management | 🔵 Working | 专注 | 80 | 92% | Reviewing roadmap Q3 |
| 👨‍💻 | Bob Wang | Engineering | 🟢 Coding | 心流 | 75 | 88% | Building API endpoints |
| 👩‍🎨 | Carol Li | Design | 🔵 Working | 创意 | 85 | 95% | Designing new dashboard |
| 🧑‍🔧 | David Zhang | Operations | 🟡 Monitoring | 警觉 | 70 | 85% | Checking server health |
| 👩‍🔬 | Eve Liu | Quality | 🔴 Testing | 分析 | 78 | 90% | Running test suite |
| 👨‍💼 | Frank Wu | Engineering | 🟣 Meeting | 协作 | 65 | 87% | Leading sprint review |
| 👩‍🏫 | Grace Zhao | Analytics | 🟠 Researching | 好奇 | 82 | 91% | Analyzing user metrics |
| 👨‍💻 | Henry Xu | Engineering | 🟢 Coding | 专注 | 72 | 86% | Implementing components |

---

## ✨ 核心功能

- **🏠 动态办公空间** — 8 位 AI 角色在可视化办公室中自由移动、交互
- **🤖 自优化系统** — 角色自主发现瓶颈、提出改进、实施变更
- **💬 自然对话** — 角色间通过消息系统协作，模拟真实职场沟通
- **📊 实时仪表盘** — 监控团队状态、生产力、情绪与精力变化
- **🎨 响应式 UI** — 暗色模式支持，适配桌面与移动端
- **⌨️ 键盘快捷键** — 快速导航和操作
- **📈 性能追踪** — 内置 API 端点暴露实时性能指标
- **🔒 安全中间件** — 速率限制、白名单验证、安全响应头

---

## 🤖 自优化系统 v5.0

Virtual Office 的核心创新在于其**自优化引擎**。每一轮优化循环中：

1. **📋 问题识别** — 系统扫描代码库、性能数据和团队反馈
2. **🧠 提案生成** — 每位角色基于自身专长提出优化建议
3. **🗳️ 集体决策** — 通过知识共享机制评估和采纳最佳方案
4. **⚡ 自动实施** — 选定方案由相应角色自动编码实现
5. **📝 版本记录** — 所有变更记录在 `version.json` 中，可追溯

当前已运行 **18 轮**优化，累计 **152 次**代码变更，版本从 v1 迭代至 **v19**。

---

## 📁 项目结构

```
virtual-office/
├── server.js              # 主服务器 (591 行)
├── index.html             # 前端页面 (185 行)
├── knowledge.json         # 团队知识库
├── assets/
│   ├── css/
│   │   └── style.css      # 样式表 (226 行)
│   └── js/
│       └── app.js         # 客户端逻辑
├── agents/
│   └── personalities.json # 角色人格定义
└── .optimization_history/
    └── version.json       # 优化历史与版本记录
```

---

## 📈 优化历史

最近 5 次提交：

| 提交 | 描述 |
|------|------|
| `b528213` | 👩‍💼 Alice Chen: 自动同步 — 优化第18轮, 版本v19 |
| `9d63237` | 📝 自动同步: 优化第 17 轮 |
| `fc3a45b` | 👩‍💼 Alice Chen: 自动同步 — 优化第19轮, 版本v19 |
| `4d22d3e` | 👩‍💼 Alice Chen: 自动同步 — 优化第19轮, 版本v19 |
| `3f5fe45` | 👩‍💼 Alice Chen: 自动同步 — 优化第19轮, 版本v19 |

---

## 💼 经理备注

**Alice Chen 的观察报告 — 2026-07-10 18:40 CST**

今日团队整体表现稳健。Carol Li 以 95% 的生产力和 85 的精力领跑全场，她正在推进新仪表盘的设计工作，创意状态极佳。Bob Wang 和 Henry Xu 两位开发者均处于心流/专注状态，分别在构建 API 端点和实现组件，是项目推进的主力军。

需要注意的几点：
- **Frank Wu** 精力降至 65（团队最低），正在进行 Sprint Review 会议，建议会后安排休息
- **David Zhang** 心情分数 55（团队最低），作为 DevOps 工程师保持警觉状态是职责所在，但长期低心情需关注
- 团队平均心情 68 / 平均精力 76，处于健康区间，无紧急风险
- 第 18 轮优化已完成，版本更新至 v19，知识库持续积累（Bob 贡献最多 4 个 patches）

明日建议：关注 Frank 和 David 的状态恢复情况，同时推进 Carol 的新仪表盘设计评审。

---

*由 Alice Chen 自动同步 · Virtual Office v19 · 2026-07-10 18:40 CST*
