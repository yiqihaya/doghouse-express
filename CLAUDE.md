# 快递信息收集软件 — 项目入口

## 项目简介

运行在 Windows 上的快递信息管理桌面软件。Node.js 本地 Web 服务器 + 浏览器前端，仿苹果官网风格，淡蓝色主色调。

## 快速启动

```
双击: 启动快递管理.bat
或命令行: npm start
```

浏览器自动打开 → `http://localhost:8765`

## 技术架构

| 层级 | 技术 |
|------|------|
| 后端 | Node.js HTTP 服务器 (server.js) |
| 数据库 | SQLite (sql.js WebAssembly) |
| 前端 | 原生 HTML/CSS/JS |
| 通信 | REST API (fetch) |

## 文档索引

| 文档 | 路径 | 用途 |
|------|------|------|
| 需求规格 | [docs/01-requirements.md](docs/01-requirements.md) | 功能需求清单、优先级 |
| 技术方案 | [docs/02-tech-stack.md](docs/02-tech-stack.md) | 技术选型、数据库设计、API 设计 |
| 设计规范 | [docs/03-design-spec.md](docs/03-design-spec.md) | UI 配色、字体、组件样式 |
| 执行计划 | [docs/04-execution-plan.md](docs/04-execution-plan.md) | 分阶段步骤、验收标准 |

## 开发日志

每次开发会话前，先查看最新日志了解进度：
- 日志目录：[devlog/](devlog/)
- 文件命名：`YYYY-MM-DD.md`

## 工作流程

```
每次会话开始：
  1. 阅读本文件（CLAUDE.md）
  2. 查看 devlog/ 最新日志，了解当前进度
  3. 对照 docs/04-execution-plan.md 确认下一步任务
  4. 执行当前阶段的步骤
  5. 每步验证通过后再继续

每次会话结束：
  1. 更新 devlog/YYYY-MM-DD.md
  2. 记录今日完成、遇到的问题、明日待办
```

## 项目结构

```
d:\Doghouse\
├── CLAUDE.md              # ← 你在这里
├── 启动快递管理.bat         # 双击启动
├── server.js              # Node.js HTTP 服务器 + API
├── package.json           # 项目配置
├── docs/                  # 规范文档
├── devlog/                # 开发日志
├── renderer/              # 前端页面
│   ├── index.html
│   ├── style.css
│   └── app.js
├── assets/                # 照片存储
└── data/                  # SQLite 数据库
```

## 编码规范

- 原生 HTML/CSS/JS，无前端框架
- 后端 API 统一前缀 `/api/`
- 数据库操作在 server.js 中完成
- 颜色使用 docs/03-design-spec.md 中定义的色值
- 中文注释
