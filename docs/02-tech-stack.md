# 02 — 技术方案

## 技术选型

| 层级 | 选择 | 版本 | 理由 |
|------|------|------|------|
| 运行时 | Node.js | ≥16 | 内建 HTTP 服务器，零额外依赖 |
| 数据库 | sql.js | ^1.12.0 | 纯 JS SQLite，无需编译 |
| 前端 | 原生 HTML/CSS/JS | - | 无需构建工具，体积小 |
| 启动 | .bat 批处理 | - | 双击即用 |

## 架构

```
浏览器 (Chrome/Edge/Firefox)
    ↓ HTTP 请求 (fetch)
Node.js 服务器 (server.js:8765)
    ↓ sql.js
data/packages.db (SQLite)
```

## 数据库设计

### 数据库文件

- 位置：`data/packages.db`
- 引擎：SQLite 3 (sql.js WebAssembly)
- 工作模式：内存操作 + 每次写操作后持久化到磁盘

### 表结构

```sql
CREATE TABLE IF NOT EXISTS packages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient       TEXT    NOT NULL,           -- 收件人
  phone           TEXT    NOT NULL,           -- 电话号码
  pickup_code     TEXT    DEFAULT '',         -- 取件码
  tracking_number TEXT    DEFAULT '',         -- 快递编号
  photo_path      TEXT    DEFAULT '',         -- 照片相对路径
  status          TEXT    DEFAULT 'unpicked', -- 'picked' | 'unpicked'
  created_date    TEXT    NOT NULL,           -- YYYY-MM-DD
  created_at      TEXT    NOT NULL            -- ISO 8601
);
```

### 照片存储

- 照片文件存于 `assets/` 目录
- 数据库存相对路径（如 `assets/20260602_143025.jpg`）
- 上传通过 Base64 编码传输

## REST API 设计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/packages` | 获取全部记录 |
| GET | `/api/packages/search?q=kw` | 模糊搜索 |
| GET | `/api/packages/dates` | 获取日期列表 |
| POST | `/api/packages` | 新增记录 |
| PUT | `/api/packages/:id` | 更新记录 |
| DELETE | `/api/packages/:id` | 删除记录 |
| PATCH | `/api/packages/:id/toggle` | 切换状态 |
| POST | `/api/photos` | 上传照片 (Base64) |
| DELETE | `/api/photos` | 删除照片文件 |

## 项目文件结构

```
d:\Doghouse\
├── CLAUDE.md
├── 启动快递管理.bat
├── server.js                  # 服务器入口
├── package.json
├── docs/
├── devlog/
├── renderer/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── assets/                    # 照片文件
└── data/                      # 数据库文件
```
