# 03 — UI 设计规范

## 设计理念

仿苹果官网风格：干净、留白充足、圆角卡片、微阴影、SF 风格排版。

## 配色方案

| 用途 | 色值 | 说明 |
|------|------|------|
| 主色（Primary） | `#007AFF` | 苹果蓝，按钮、链接、选中态 |
| 主色浅 | `#E8F4FD` | 主色 10% 透明度等效，hover 背景 |
| 主色深 | `#0056CC` | 按钮按下态 |
| 背景色 | `#F5F5F7` | 苹果灰白，页面背景 |
| 卡片色 | `#FFFFFF` | 白色卡片背景 |
| 侧边栏背景 | `#F0F0F2` | 浅灰侧边栏 |
| 文字主色 | `#1D1D1F` | 标题、正文 |
| 文字次要 | `#86868B` | 辅助信息、标签 |
| 文字占位 | `#C7C7CC` | 输入框占位符 |
| 分割线 | `#E5E5EA` | 列表分割、边框 |
| 成功绿 | `#34C759` | 已取件状态 |
| 警示橙 | `#FF9500` | 未取件状态 |
| 错误红 | `#FF3B30` | 删除操作 |
| 毛玻璃 | `rgba(0,0,0,0.4)` | 弹窗遮罩 |

## 字体规范

| 层级 | 字号 | 字重 | 用途 |
|------|------|------|------|
| H1 | 28px | 600 | 页面标题 |
| H2 | 20px | 600 | 分组标题（日期） |
| H3 | 16px | 500 | 卡片标题（收件人） |
| Body | 14px | 400 | 正文、输入框 |
| Caption | 12px | 400 | 辅助信息、时间戳 |
| Small | 11px | 400 | 标签、角标 |

- 字体族：`-apple-system, "Microsoft YaHei", "PingFang SC", sans-serif`
- macOS 优先使用苹方，Windows 回退微软雅黑

## 布局规范

| 属性 | 值 |
|------|-----|
| 侧边栏宽度 | 260px |
| 卡片最小宽度 | 280px |
| 卡片网格间距 | 16px |
| 页面内边距 | 32px |
| 卡片圆角 | 12px |
| 按钮圆角 | 8px |
| 输入框圆角 | 8px |
| 弹窗圆角 | 16px |

## 组件规范

### 按钮

```
主按钮：bg=#007AFF, color=#FFF, radius=8px, padding=10px 24px
次按钮：bg=transparent, border=#007AFF, color=#007AFF
危险按钮：bg=#FF3B30, color=#FFF
```

### 卡片

```
bg=#FFF, radius=12px, shadow: 0 2px 8px rgba(0,0,0,0.08)
hover: shadow 0 4px 16px rgba(0,0,0,0.12) + translateY(-2px)
```

### 输入框

```
bg=#FFF, border=#E5E5EA, radius=8px, padding=10px 14px
focus: border=#007AFF, shadow: 0 0 0 3px rgba(0,122,255,0.15)
```

### 模态弹窗

```
遮罩：rgba(0,0,0,0.4), backdrop-filter: blur(4px)
弹窗：bg=#FFF, radius=16px, max-width=500px, 居中
```

### 状态角标

```
已取件：bg=#34C759, color=#FFF, 文字 "已取"
未取件：bg=#FF9500, color=#FFF, 文字 "未取"
```

## 动效规范

| 动效 | 时长 | 缓动 |
|------|------|------|
| 卡片 hover | 0.2s | ease-out |
| 弹窗进出 | 0.25s | ease-out |
| 按钮点击 | 0.1s | ease-in-out |
| 搜索过滤 | 0.15s | ease-out |
