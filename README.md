# Virtual Office - 虚拟办公室 v2

一个基于 PHP + SQLite + Vanilla JS 的虚拟办公室 Web 世界。内置 8 个由 Agnes AI 驱动的虚拟员工，他们在可视化的办公室场景中自由活动、工作、交流。

## ✨ v2 新功能

- 🤖 **Agnes AI 集成** — 每个角色都有独立的 personality 配置文件，通过 OpenAI 兼容 API 驱动真实对话
- 💬 **Agent 间对话** — 角色之间会自动进行环境对话，使用 Agnes AI 生成回复
- 📡 **实时事件流** — 左侧面板滚动显示办公室事件（任务分配、聊天、走动等）
- 👤 **角色详情面板** — 查看员工的效率、状态、位置、专长等详细信息
- 📋 **任务管理系统** — 创建任务并分配给团队成员
- 🗺️ **6 个功能区域** — 大堂、工程区、设计区、运维区、会议室、休息区
- 🪴 **办公室装饰** — 绿植、咖啡机等细节

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
- Agnes API（可选，用于 AI 对话）

### 本地运行

```bash
cd virtual-office
php -S localhost:8080
```

打开 `http://localhost:8080`

### 配置 Agnes AI

```bash
export AGNES_API_URL="http://your-agnes-server:8000/v1"
export AGNES_API_KEY="your-api-key"
```

不配置也可运行，会回退到默认回复。

## 📁 项目结构

```
virtual-office/
├── index.html                  # 主页面
├── api/
│   └── index.php               # PHP API 后端 + SQLite
├── agents/
│   └── personalities.json      # 角色人格配置文件
├── assets/
│   ├── css/style.css           # 样式
│   └── js/office.js            # 前端应用
├── data/                       # SQLite 数据库（自动生成）
└── README.md
```

## 🔌 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `agents` | GET | 获取所有智能体 |
| `agents/:id` | GET | 获取单个智能体 |
| `chat` | POST | 与智能体对话（AI 驱动） |
| `agent-chat` | POST | 智能体间对话（AI 驱动） |
| `tasks` | GET/POST | 任务管理 |
| `events` | GET | 办公室事件流 |
| `update` | POST | 更新智能体状态 |
| `status` | GET | 办公室整体状态 |
| `personality/:id` | GET | 获取角色人格配置 |

## 🎮 操作指南

- **点击角色头像** → 打开聊天面板
- **鼠标滚轮** → 缩放地图
- **拖拽空白区域** → 平移地图
- **工具栏按钮** → 缩放/重置视图
- **新建任务** → 分配给团队成员
- **左侧事件流** → 观察办公室动态

## 🛠 自定义

### 添加新角色

1. 在 `api/index.php` 的 seed 数组中添加
2. 在 `agents/personalities.json` 中配置人格
3. 重启服务

### 修改办公室布局

编辑 `assets/js/office.js` 中的 `OFFICE.rooms` 数组。

## License

MIT
