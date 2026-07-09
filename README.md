# Virtual Office - 虚拟办公室 v5

一个基于 PHP + SQLite + Vanilla JS 的虚拟办公室 Web 世界。8 个由 **Agnes AI** 驱动的虚拟员工，在可视化的办公室中自由活动、工作、交流。

> 🚀 每个角色拥有独立的 API Key，上线即可自动工作。

## ✨ v5 全新功能

| 功能 | 说明 |
|------|------|
| 👑 **老板模式** | 向全员下达指令，所有角色同时给出 AI 驱动的反应 |
| 🌙 **日夜交替** | 切换日间/夜间模式，办公室氛围随之变化 |
| 😊 **心情系统** | 每个角色有心情值（0-100），聊天和接收任务都会影响 |
| 📊 **任务进度追踪** | 任务有进度条，完成后自动标记 |
| 📡 **实时事件流** | 左侧面板滚动显示办公室所有事件 |
| 👤 **角色详情** | 查看效率、心情、位置、专长的完整信息 |
| 🎨 **心情光环** | 角色头像外圈颜色实时反映心情状态 |
| 🧠 **Agent 记忆系统** | 每个角色有自己的知识库，对话时参考过往记忆 |
| 🤝 **关系网络** | 角色之间有亲密度，随互动增长 |
| 📊 **每日简报** | 办公室全景报告：生产力、心情、部门分布 |
| ☕ **咖啡休息** | 全员喝咖啡，精力+25、心情+10 |
| 📜 **时间线** | 角色对话/事件历史查看 |
| 📽️ **会议室** | 召集角色开会讨论议题 |
| ⌨️ **快捷键** | N/B/O/C/M/E 一键操作 |
| 📄 **导出报告** | 生成办公室文字报告 |
| 🧠 **自动学习** | 对话后自动提取关键词存入记忆 |

## 🏢 角色阵容

| 角色 | 代号 | 部门 | 性格 |
|------|------|------|------|
| Alice Chen | 👩‍💼 | 产品经理 | 条理清晰，战略规划 |
| Bob Wang | 👨‍💻 | 高级工程师 | 技术直球，解决方案导向 |
| Carol Li | 👩‍🎨 | UI/UX 设计师 | 创意十足，以人为本 |
| David Zhang | 🧑‍🔧 | DevOps | 务实高效，安全意识强 |
| Eve Liu | 👩‍🔬 | QA 工程师 | 严谨细致，系统化思维 |
| Frank Wu | 👨‍💼 | 技术负责人 | 沉稳远见，善于指导 |
| Grace Zhao | 👩‍🏫 | 数据科学家 | 分析驱动，好奇心强 |
| Henry Xu | 👨‍💻 | 前端开发 | 活力四射，前端极客 |

## 🚀 快速开始

### 前置要求
- PHP 7.4+（需启用 `sqlite3` 和 `curl` 扩展）

### 本地运行

```bash
cd virtual-office
php -S localhost:8080
```

打开 `http://localhost:8080`

### 🤖 配置 Agnes AI（已内置）

项目已内置 8 个角色的 Agnes AI API Key，开箱即用。

API 配置：
- **网关**: `https://apihub.agnes-ai.com/v1`
- **模型**: `agnes-2.0-flash`
- **密钥**: 每个角色独立 Key，负载均衡

如需自定义，编辑 `.env` 文件：

```bash
AGNES_API_URL=https://apihub.agnes-ai.com/v1
AGNES_KEY_ALICE=your-key-here
AGNES_KEY_BOB=your-key-here
# ... 其他角色同理
```

## 📁 项目结构

```
virtual-office/
├── index.html                  # 主页面
├── .env                        # API 密钥配置（已内置）
├── .env.example                # 配置模板
├── api/
│   └── index.php               # PHP API 后端 + SQLite
├── agents/
│   └── personalities.json      # 角色人格配置
├── assets/
│   ├── css/style.css           # 样式
│   └── js/office.js            # 前端应用
├── data/                       # SQLite 数据库（自动生成）
└── README.md
```

## 🎮 操作指南

- **点击角色** → 打开聊天面板
- **鼠标滚轮** → 缩放地图
- **拖拽空白** → 平移地图
- **👑 老板模式 (O)** → 向全员下达指令
- **🌙 夜间模式** → 切换日夜氛围
- **➕ 任务 (N)** → 创建并分配任务
- **☕ 咖啡 (C)** → 全员休息回血
- **📽️ 会议 (M)** → 召集角色开会
- **📊 简报 (B)** → 办公室全景报告
- **📄 导出 (E)** → 生成文字报告
- **⌨️ 快捷键** → 查看所有快捷键

## 🔌 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `agents` | GET | 获取所有智能体 |
| `chat` | POST | 与智能体对话 |
| `agent-chat` | POST | 智能体间对话 |
| `boss-order` | POST | 老板全员指令 |
| `tasks` | GET/POST | 任务管理 |
| `task-progress` | POST | 更新任务进度 |
| `events` | GET | 办公室事件流 |
| `update` | POST | 更新智能体状态 |
| `status` | GET | 办公室整体状态 |
| `timeline` | GET | 角色历史时间线 |
| `meetings` | GET/POST | 会议室管理 |
| `export` | GET | 导出办公室报告 |
| `memory` | GET/POST | 角色记忆管理 |
| `daily-briefing` | GET | 每日简报 |
| `relationships` | GET | 关系网络 |

## 🛠 自定义

### 添加新角色

1. 在 `api/index.php` seed 数组中添加
2. 在 `agents/personalities.json` 中配置人格
3. 在 `.env` 中添加 `AGNES_KEY_<ID>`
4. 重启服务

### 修改办公室布局

编辑 `assets/js/office.js` 中的 `OFFICE.rooms` 数组。

## License

MIT















## 📊 项目状态

- **最后更新**: 2026-07-09T20:15:47.312Z
- **最近提交**:
```
  27cef34 🔧 并行优化 Round 5945426: bob, henry, carol, david, eve, grace, alice, frank
  624bc65 🎉 Frank: 招聘新员工 - Employee_4
  37b60af 🔧 并行优化 Round 5945426: bob, henry, carol, david, eve, grace, alice, frank
  c99315c 🔧 并行优化 Round 5945425: bob, henry, carol, david, eve, grace, alice, frank
  1b9aad9 🎉 Frank: 招聘新员工 - Employee_3
```
- **最近变更统计**:
```
  .../css/style.css                                  |  634 +++++++
   .../pre_deploy_20260710_041409.assets/js/office.js | 1191 ++++++++++++
   .../pre_deploy_20260710_041409.index.html          |  486 +++++
   .../pre_deploy_20260710_041409.server.js           | 1947 ++++++++++++++++++++
   README.md                                          |   28 +-
   TEST_REPORT.md                                     |    4 +-
   agents/personalities.json                          |   17 +-
   api/skills.js                                      |   46 +
   assets/css/style.css                               |   44 +
   assets/js/office.js                                |   62 +
   index.html                                         |   40 +
   optimize-deploy.sh                                 |  371 ++++
   server.js                                          |  138 ++
   13 files changed, 4988 insertions(+), 20 deletions(-)
```
- **当前在线**: Bob Wang(Senior Developer), Henry Chen(Frontend Engineer), Carol Li(Designer), David Zhang(DevOps Engineer), Eve Liu(QA Engineer), Grace Wang(Data Analyst), Alice Zhao(Product Manager), Frank Huang(Tech Lead)
- **优化轮次**: 每5分钟一轮并行优化
- **GitHub**: https://github.com/luckysong-sudo/virtual-office

