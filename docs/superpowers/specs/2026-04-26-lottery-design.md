# 彩票助手 - 设计文档

## 项目概述

支持双色球、大乐透、福彩3D、排列3/5 的彩票信息查询与分析工具，部署在 Cloudflare 免费额度内。

## 支持的彩票类型

| 类型 | 代码 | 开奖时间 |
|------|------|---------|
| 双色球 | `ssq` | 周二、四、日 21:30 |
| 大乐透 | `dlt` | 周一、三、六 21:25 |
| 福彩3D | `fc3d` | 每日 21:15 |
| 排列3 | `pl3` | 每日 21:15 |
| 排列5 | `pl5` | 每日 21:15 |

## 功能特性

- **开奖查询** — 最新开奖、历史记录、单期详情
- **数据分析** — 冷热号统计、遗漏值分析、奇偶大小特征、走势图
- **号码工具** — 随机推荐号码、号码查奖、奖金计算
- **数据拉取** — 按期号或日期范围从第三方 API 拉取数据，支持冲突检测
- **Webhook 通知** — 新开奖结果自动推送到钉钉、企微、飞书或自定义 Webhook
- **定时任务** — Cloudflare Cron Trigger 自动拉取最新开奖数据

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + TypeScript + Vite |
| 后端 | Hono (Cloudflare Worker) |
| 数据库 | Cloudflare D1 (生产) / SQLite (本地开发) |
| 图表 | ECharts |
| 部署 | Cloudflare Pages + Workers |

## 架构设计

### 数据库适配器模式

使用 `DatabaseAdapter` 接口抽象数据库操作：
- `D1Adapter` — Cloudflare D1 实现（生产环境）
- `SQLiteD1Compat` — SQLite 本地开发适配器，包装 better-sqlite3

### 数据源适配器模式

使用 `DataSourceAdapter` 接口抽象数据获取：
- `ThirdPartyAdapter` — 从第三方 API 获取开奖数据
- 支持按期号、日期范围、批量拉取

### Webhook 通知

支持多种通知渠道：
- 钉钉机器人（HMAC-SHA256 签名）
- 企业微信机器人
- 飞书机器人
- 通用 HTTP Webhook

### 定时任务

Cloudflare Cron Trigger 自动拉取：
- 双色球：周二、四、日 21:30 (UTC 13:30)
- 大乐透：周一、三、六 21:25 (UTC 13:25)
- 小盘彩：每日 21:15 (UTC 13:15)

## 数据库表结构

| 表名 | 说明 |
|------|------|
| `ssq_draws` | 双色球开奖记录 |
| `dlt_draws` | 大乐透开奖记录 |
| `small_draws` | 小盘彩（福彩3D/排列3/5）开奖记录 |
| `prize_details` | 奖级详情 |
| `winning_locations` | 中奖地区 |
| `webhooks` | Webhook 配置 |
| `config` | 系统配置 |

## API 端点

### 开奖数据
- `GET /api/lottery/latest?type=ssq` — 最新开奖
- `GET /api/lottery/history?type=ssq&page=1` — 历史开奖
- `GET /api/lottery/draw/ssq/2024001` — 单期详情
- `GET /api/lottery/prize-levels?type=ssq` — 奖级定义

### 数据分析
- `GET /api/analysis/hot-cold?type=ssq&range=30` — 冷热号
- `GET /api/analysis/missing?type=ssq&range=30` — 遗漏值
- `GET /api/analysis/features?type=ssq&range=30` — 奇偶大小特征
- `GET /api/analysis/trend?type=ssq&range=30` — 走势图

### 工具
- `POST /api/tools/recommend` — 推荐号码
- `POST /api/tools/check-prize` — 号码查奖
- `POST /api/tools/prize-calc` — 奖金计算

### 数据拉取
- `POST /api/lottery/check-exists` — 预检查
- `POST /api/lottery/pull` — 拉取数据

### Webhook
- `GET/POST /api/webhooks` — 查询/创建
- `PUT/DELETE /api/webhooks/:id` — 更新/删除
- `POST /api/webhooks/:id/test` — 测试

## UI 设计

- 暗色主题：背景 #1e1e1e，卡片 #2d2d2d
- 红球：#e74c3c，蓝球：#3498db
- 响应式布局，左侧数据面板 + 右侧操作面板

## 部署方案

### 一键部署分支
- `worker-api` — Worker 独立部署分支（根目录即 Worker 源码）
- `cp-frontend` — 前端独立部署分支（根目录即 Vue 项目）

### 部署流程
1. Worker：Cloudflare Workers 一键部署 → 创建 D1 → 绑定 → 迁移
2. 前端：Cloudflare Pages 一键部署 → 设置 VITE_API_BASE 环境变量
