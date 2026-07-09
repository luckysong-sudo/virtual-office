# Virtual Office - 虚拟办公室 v3

一个基于 PHP + SQLite + Vanilla JS 的虚拟办公室 Web 世界。8 个由 Agnes AI 驱动的虚拟员工，在可视化的办公室中自由活动、工作、交流。

## ✨ v3 新功能

- 👑 **老板模式** — 向全员下达指令，所有角色同时给出 AI 驱动的反应
- 🌙 **日夜交替** — 切换日间/夜间模式，办公室氛围随之变化
- 😊 **心情系统** — 每个角色有心情值（0-100），聊天和接收任务都会影响
- 📊 **任务进度追踪** — 任务有进度条，完成后自动标记
- 📡 **实时事件流** — 左侧面板滚动显示办公室所有事件
- 👤 **角色详情** — 查看效率、心情、位置、专长的完整信息
- 🎨 **心情光环** — 角色头像外圈颜色反映心情状态

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

### 配置 Agnes AI（可选）

```bash
export AGNES_API_URL="http://your-agnes-server:8000/v1"
export AGNES_API_KEY="your-key-here"
```

不配置也可运行，会回退到默认回复。

## 📁 项目结构

```
virtual-office/
├── index.html                  # 主页面
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
- **👑 老板模式** → 向全员下达指令
- **🌙 夜间模式** → 切换日夜氛围
- **➕ 任务** → 创建并分配任务
- **💬 聊天** → 与单个角色对话

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

## 🛠 自定义

### 添加新角色

1. 在 `api/index.php` seed 数组中添加
2. 在 `agents/personalities.json` 中配置人格
3. 重启服务

### 修改办公室布局

编辑 `assets/js/office.js` 中的 `OFFICE.rooms` 数组。

## License

MIT
