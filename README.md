# 🏢 Virtual Office

一个充满活力的虚拟办公室模拟器，展示 8 位 AI 角色的日常工作。每个人都有自己的角色、性格、情绪和精力值，在办公室里自由移动、交流、协作。

> **自优化架构** — 团队会自主审查代码、修复 bug、优化性能、改进体验。

---

## 📌 项目状态

| 指标 | 值 |
|------|-----|
| **当前版本** | v19 |
| **优化轮次** | 第 18 轮 |
| **总变更数** | 18 轮迭代 |
| **代码行数** | 1002 行（server.js 591 · index.html 185 · style.css 226） |
| **知识库补丁** | bob: 4 · henry: 2 · carol: 1 · david: 1 · eve: 1 · grace: 1 · alice: 1 · frank: 1 |
| **最后更新** | 2026-07-10 14:25 CST |
| **服务器状态** | ✅ 运行中 |

---

## 📊 实时状态面板

| 指标 | 数值 |
|------|------|
| 👥 团队成员 | **8** 人 |
| 📈 平均心情 | **68** / 100 |
| ⚡ 平均精力 | **76** / 100 |
| 🔁 优化轮次 | **18** |
| 🏗️ 工作区状态 | 活跃办公中 |
| 🌙 夜间模式 | ❌ 否（14:00） |

### 部门分布

| 部门 | 人数 | 成员 |
|------|------|------|
| Engineering | 3 | Bob Wang · Frank Wu · Henry Xu |
| Management | 1 | Alice Chen |
| Design | 1 | Carol Li |
| Operations | 1 | David Zhang |
| Quality | 1 | Eve Liu |
| Analytics | 1 | Grace Zhao |

---

## 👥 角色阵容

| 角色 | 职位 | 状态 | 心情 | 精力 | 当前任务 | 生产力 |
|------|------|------|------|------|----------|--------|
| 👩💼 Alice Chen | Product Manager | 🟢 Working | 😊 Focused | 80% | Reviewing roadmap Q3 | 92% |
| 👨💻 Bob Wang | Senior Developer | 🟢 Coding | 🌊 Flow State | 75% | Building API endpoints | 88% |
| 👩🎨 Carol Li | UI/UX Designer | 🟢 Working | 🎨 Creative | 85% | Designing new dashboard | 95% |
| 🧑🔧 David Zhang | DevOps Engineer | 🟡 Monitoring | ⚠️ Alert | 70% | Checking server health | 85% |
| 👩🔬 Eve Liu | QA Engineer | 🟢 Testing | 🔍 Analytical | 78% | Running test suite | 90% |
| 👨💼 Frank Wu | Tech Lead | 🟠 Meeting | 🤝 Collaborative | 65% | Leading sprint review | 87% |
| 👩🏫 Grace Zhao | Data Scientist | 🟢 Researching | 🧐 Curious | 82% | Analyzing user metrics | 91% |
| 👨💻 Henry Xu | Frontend Developer | 🟢 Coding | 😊 Focused | 72% | Implementing components | 86% |

---

## ✨ 核心功能

- **🏠 虚拟办公室空间** — 2D 俯视图，8 位角色自由走动
- **🗣️ 角色对话系统** — 角色可以互相交谈，显示气泡消息
- **😊 情绪与精力系统** — 每个角色有独立的心情值和精力值，随时间变化
- **📋 任务分配** — 管理者可以给角色分配任务，角色会前往工位执行
- **🎨 动态视觉设计** — 暗色/亮色主题切换，CSS 设计令牌系统
- **⌨️ 键盘快捷键** — 快速操作办公室各项功能
* **📱 响应式布局** — 适配桌面和移动端浏览器
- **🔧 自优化架构** — 团队自动审查、修复和优化代码

---

## 🤖 自优化系统 v5.0

Virtual Office 的核心创新：**团队会自己改进自己。**

### 工作原理

1. **每日站会** — 每天早晨 Frank Wu（Tech Lead）召集全员站会，回顾昨天进展、安排今天任务
2. **代码审查** — Bob Wang 审查所有变更，确保质量和一致性
3. **Bug 修复** — 发现问题立即修复，记录到知识系统中
4. **性能优化** — 定期分析服务器性能，优化响应速度和资源使用
5. **知识积累** — 每个角色维护自己的知识库，记录经验教训
6. **迭代演进** — 每轮优化都会让系统更完善

### 已实施优化

- ✅ 全局错误处理和优雅退出
- ✅ 请求日志和性能追踪
- ✅ 请求速率限制中间件
- ✅ API 端点白名单验证
- ✅ 安全响应头配置
- ✅ 性能指标 API 端点
- ✅ 键盘快捷键系统
- ✅ 页面加载动画
- ✅ CSS 设计令牌和暗色模式
- ✅ 版本元数据管理

---

## 📁 项目结构

```
virtual-office/
├── server.js                  # 后端服务器 (591 行)
├── index.html                 # 前端主页面 (185 行)
├── knowledge.json             # 团队知识库
├── assets/
│   ├── css/
│   │   └── style.css         # 样式表 (226 行)
│   └── js/
│       └── app.js            # 前端应用逻辑
├── .optimization_history/
│   └── version.json           # 版本历史和变更日志
└── README.md                  # 你正在看的这个文件
```

---

## 📈 优化历史（最近 5 次提交）

| # | 提交信息 | 作者 |
|---|---------|------|
| 1 | `f0048f4` 👩‍💼 Alice Chen: 自动同步 — 优化第19轮, 版本v19 | Alice Chen |
| 2 | `0855488` 👩‍💼 Alice Chen: 自动同步 — 优化第19轮, 版本v19 | Alice Chen |
| 3 | `0905487` 👩‍💼 Alice Chen: 自动同步 — 优化第19轮, 版本v19 | Alice Chen |
| 4 | `4bb6dc8` 👩‍💼 Alice Chen: 自动同步 — 优化第19轮, 版本v19 | Alice Chen |
| 5 | `0d90231` 👩‍💼 Alice Chen: 自动同步 — 优化第18轮, 版本v19 | Alice Chen |

---

## 💼 经理备注

**📅 2026-07-10 14:25 CST — Alice Chen 的每日观察**

> 今日办公室运转良好。团队整体生产力保持在较高水平，平均 89.1%。
>
> **亮点：**
> - Carol Li 以 95% 的生产力领先团队，正在推进新仪表盘设计，创意状态满分 ⚡
> - Grace Zhao 分析用户指标进展顺利，好奇心驱动的高效工作
> - Bob Wang 处于心流状态，API 端点构建稳步推进
>
> **关注点：**
> - David Zhang 心情分偏低（55），保持 Alert 状态——需要关注服务器健康，建议稍后沟通
> - Frank Wu 精力仅 65%，正在进行 sprint review 会议，注意控制时长避免疲劳
> - 整体平均心情 68，略低于理想值，可以考虑安排一次团队建设活动
>
> **下一步行动：**
> - 跟进 Eve Liu 的测试套件结果
> - 审查 Henry Xu 的前端组件实现进度
> - 准备 Q3 路线图评审材料
>
> — *Alice Chen, Product Manager*

---

*Last synced: 2026-07-10 14:25 Asia/Shanghai*
