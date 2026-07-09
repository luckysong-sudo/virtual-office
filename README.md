# Virtual Office - 虚拟办公室

一个基于 PHP + JavaScript 的虚拟办公室 Web 世界。内置多个 AI 智能体角色，它们在一个可视化的办公室场景中自由活动、工作、交流。

## 🏢 功能特性

- **可视化办公室场景** - Canvas 绘制的楼层平面图，包含多个功能区域
- **8 个 AI 智能体角色** - 产品经理、高级工程师、设计师、DevOps、QA、技术负责人、数据科学家、前端开发
- **实时移动模拟** - 智能体在办公室中自由走动，偶尔相互互动
- **对话系统** - 点击任何角色发起对话，下达任务或闲聊
- **任务管理系统** - 创建任务并分配给团队成员
- **环境聊天** - 智能体之间会随机进行环境对话
- **缩放和平移** - 支持鼠标滚轮缩放和拖拽平移

## 🚀 快速开始

### 前置要求
- PHP 7.4+ (带 SQLite3 扩展)
- 任意 Web 服务器 (Apache/Nginx/PHP 内置服务器)

### 本地运行

```bash
cd virtual-office
php -S localhost:8080
```

然后打开 `http://localhost:8080`

### Docker 运行

```bash
docker run -p 8080:80 \
  -v $(pwd):/var/www/html \
  --name virtual-office \
  php:8.2-apache
```

## 📁 项目结构

```
virtual-office/
├── index.html              # 主页面
├── api/
│   └── index.php           # PHP API 后端 (含 SQLite 数据库)
├── assets/
│   ├── css/
│   │   └── style.css       # 样式表
│   └── js/
│       └── office.js       # 前端应用逻辑
├── data/                   # SQLite 数据库目录 (自动生成)
└── README.md
```

## 👥 团队成员

| 角色 | 代号 | 部门 | 特点 |
|------|------|------|------|
| Alice Chen | 👩‍💼 | 产品管理 | 组织能力强，战略规划 |
| Bob Wang | 👨‍💻 | 工程 | 技术直球，解决方案导向 |
| Carol Li | 👩‍🎨 | 设计 | 创意十足，用户视角 |
| David Zhang | 🧑‍🔧 | 运维 | 务实高效，安全意识强 |
| Eve Liu | 👩‍🔬 | 质量 | 注重细节，方法严谨 |
| Frank Wu | 👨‍💻 | 工程 | 经验丰富，善于指导 |
| Grace Zhao | 👩‍🏫 | 数据分析 | 数据驱动，好奇心强 |
| Henry Xu | 👨‍💻 | 工程 | 充满活力，前端专家 |

## 🔌 API 端点

所有端点通过 `api/index.php?endpoint=<name>` 访问

| 端点 | 方法 | 说明 |
|------|------|------|
| `agents` | GET | 获取所有智能体 |
| `agents/:id` | GET | 获取单个智能体详情 |
| `chat` | POST | 与智能体对话 |
| `tasks` | GET/POST | 获取/创建任务 |
| `update` | POST | 更新智能体状态 |
| `status` | GET | 获取办公室整体状态 |

## 🛠 自定义

### 添加新的智能体

在 `api/index.php` 的 seed 部分添加：

```php
['new_id', 'New Name', 'Role', '🎭', 'department', 'status', 'mood', x, y, tx, ty, speed, task, productivity]
```

并在 `generateAgentResponse()` 的 `$responses` 数组中添加对应的回复模板。

### 修改办公室布局

编辑 `assets/js/office.js` 中的 `OFFICE.rooms` 数组。

## 📝 License

MIT
