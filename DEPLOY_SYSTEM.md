# 🏢 虚拟办公室 - 智能优化部署系统 v2.0

## 系统概述

这是一个完整的**优化→应用→重启→失败处理→回退→修复→重试**自动化部署系统。

## 核心功能

### 1. 自动部署循环
- 每 3 分钟执行一次完整的优化部署循环
- 后台持续运行，无需人工干预

### 2. 代码基线保护
- 每次部署前从干净的 git 基线 (`cacea77`) 恢复代码
- 防止并行优化器累积的重复代码污染生产环境

### 3. 自动备份
- 部署前自动备份当前版本到 `.deploy_backups/`
- 支持随时回退到任意备份点

### 4. 健康检查
- 启动后自动检测服务器是否正常响应
- 验证响应内容是否为虚拟办公室服务（而非其他服务）
- 30 秒超时，每 3 秒重试一次

### 5. 失败自动收集
当部署失败时，系统自动收集：
- **语法错误**: 通过 `node --check` 检测
- **端口冲突**: 通过 `lsof` 检测端口占用
- **启动日志**: 捕获 `server_new.log` 的最后 30 行
- 全部保存到 `.deploy_backups/failure_*.log`

### 6. 自动回退
- 一旦检测到部署失败，立即恢复到备份前的干净版本
- 保证服务始终可用

### 7. 自动修复
系统按顺序尝试三种修复策略：

#### 策略 1: 代码去重
- 使用 Node.js 脚本识别重复的函数/变量声明
- 自动删除重复代码块（包括匹配花括号范围）
- 将 2000+ 行的冗余代码压缩到合理大小

#### 策略 2: 修复 app 引用
- 移除无效的 `app.use()` 调用（Express 风格，不兼容原生 http）
- 清理孤立的中间件函数定义
- 处理 `ReferenceError: app is not defined`

#### 策略 3: 从干净基线恢复
- 如果上述修复都失败，从 git 历史中恢复已知干净的版本

### 8. 重启验证
- 修复后自动重启服务器
- 再次执行健康检查
- 验证通过则部署成功

## 文件结构

```
virtual-office/
├── optimize-deploy.sh          # 主部署脚本
├── deploy.log                  # 部署日志
├── deploy_daemon.log           # 守护进程日志
├── .deploy_backups/            # 备份目录
│   ├── pre_deploy_*.server.js  # 部署前备份
│   ├── failure_*.log           # 失败详细日志
│   └── *.assets/               # 前端资源备份
├── server.js                   # 主服务器代码
├── index.html                  # 前端页面
├── assets/                     # 静态资源
└── parallel-implement.js       # 并行优化系统（自动启停）
```

## 使用方法

### 手动执行一次部署
```bash
cd /tmp/openclaw/workspace/virtual-office
bash optimize-deploy.sh --once
```

### 后台持续运行
```bash
cd /tmp/openclaw/workspace/virtual-office
nohup bash optimize-deploy.sh > deploy_daemon.log 2>&1 &
```

### 查看部署状态
```bash
tail -f /tmp/openclaw/workspace/virtual-office/deploy.log
```

### 手动回退到某个备份
```bash
# 列出所有备份
ls -la .deploy_backups/

# 手动恢复
cp .deploy_backups/pre_deploy_YYYYMMDD_HHMMSS.server.js server.js
PORT=9094 node server.js
```

### 停止部署系统
```bash
pkill -f "optimize-deploy.sh"
```

## 工作流程图

```
[开始]
  │
  ▼
[停止并行优化器]
  │
  ▼
[从干净基线恢复代码]
  │
  ▼
[备份当前版本]
  │
  ▼
[启动服务器]
  │
  ▼
[健康检查] ──成功──→ [部署完成 ✓]
  │
  失败
  │
  ▼
[收集失败原因]
  │
  ▼
[回退到备份]
  │
  ▼
[自动修复]
  ├─ 代码去重
  ├─ 修复 app 引用
  └─ 从干净基线恢复
  │
  ▼
[重启服务器]
  │
  ▼
[健康检查] ──成功──→ [修复部署成功 ✓]
  │
  失败
  │
  ▼
[最终回退]
  │
  ▼
[等待 180 秒]
  │
  └──→ [回到开始]
```

## 关键设计决策

1. **每次从干净基线开始**: 因为并行优化器会不断追加代码导致重复，最可靠的方式是每次部署前重置到已知干净的状态
2. **备份在恢复之后**: 确保备份的是干净版本，而不是已经污染的版本
3. **三层修复策略**: 从轻量级修复（去重）到中等修复（app引用）再到完全恢复（基线），逐步升级
4. **自动回退优先**: 任何修复失败都立即回退，保证服务可用性
