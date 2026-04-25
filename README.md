# 🎱 彩票助手

支持双色球、大乐透、福彩3D、排列3/5 的彩票信息查询与分析工具，部署在 Cloudflare 免费额度内。

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

## 项目结构

```
cp/
├── worker/                        # 后端 Worker
│   ├── src/
│   │   ├── db/                    # 数据库层
│   │   │   ├── schema.sql         # 7 张表定义
│   │   │   ├── types.ts           # TypeScript 类型
│   │   │   ├── adapter.ts         # DatabaseAdapter 接口
│   │   │   ├── d1-adapter.ts      # Cloudflare D1 实现
│   │   │   ├── sqlite-adapter.ts  # SQLite 本地开发适配器
│   │   │   └── index.ts
│   │   ├── routes/                # API 路由
│   │   │   ├── lottery.ts         # 开奖数据 (/api/lottery/*)
│   │   │   ├── analysis.ts        # 数据分析 (/api/analysis/*)
│   │   │   ├── tools.ts           # 工具 (/api/tools/*)
│   │   │   ├── pull.ts            # 数据拉取 (/api/lottery/pull)
│   │   │   └── webhooks.ts        # Webhook 管理 (/api/webhooks/*)
│   │   ├── services/              # 业务逻辑
│   │   │   ├── analysis.ts        # 冷热号/遗漏值/特征分析
│   │   │   ├── lottery-rules.ts   # 彩票规则/号码生成/查奖
│   │   │   ├── pull-service.ts    # 数据拉取服务
│   │   │   └── webhook-service.ts # Webhook 通知服务
│   │   ├── adapters/              # 数据源适配器
│   │   │   ├── types.ts           # DrawData/DataSourceAdapter 接口
│   │   │   ├── third-party.ts     # 第三方 API 适配器
│   │   │   └── index.ts
│   │   ├── cron/
│   │   │   └── handler.ts         # 定时任务处理器
│   │   └── index.ts               # 入口 (fetch + scheduled)
│   ├── wrangler.toml              # Cloudflare Worker 配置
│   ├── vitest.config.ts
│   └── package.json
├── frontend/                      # 前端 Vue 3
│   ├── src/
│   │   ├── api/
│   │   │   ├── types.ts           # 类型定义
│   │   │   └── client.ts          # API 客户端 (axios)
│   │   ├── components/
│   │   │   ├── AppHeader.vue      # 顶部导航栏
│   │   │   ├── SalesBanner.vue    # 销售信息横幅
│   │   │   ├── LatestDraw.vue     # 最新开奖号码
│   │   │   ├── RecentDrawsTable.vue # 最近开奖记录表
│   │   │   └── QuickActions.vue   # 快捷操作面板
│   │   ├── App.vue
│   │   └── main.ts
│   ├── vite.config.ts             # Vite 配置 (含 API 代理)
│   └── package.json
├── deploy.sh                      # 部署脚本
└── README.md
```

## 快速开始

### 环境要求

- Node.js >= 20
- npm >= 10

### 安装依赖

```bash
# 安装所有依赖（根工作区会自动安装 worker 和 frontend）
npm install

# 单独安装 worker 依赖
cd worker && npm install

# 单独安装 frontend 依赖
cd frontend && npm install
```

### 本地开发

启动后端 Worker（默认端口 8787）：

```bash
npm run dev:worker
# 或
cd worker && npm run dev
```

启动前端开发服务器（默认端口 5173，自动代理 /api 到 8787）：

```bash
npm run dev:frontend
# 或
cd frontend && npm run dev
```

### 运行测试

```bash
cd worker && npm test
# 或
cd worker && npx vitest run
```

## API 文档

### 开奖数据

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/lottery/latest?type=ssq` | 最新开奖 |
| GET | `/api/lottery/history?type=ssq&page=1&size=20` | 历史开奖（分页） |
| GET | `/api/lottery/draw/ssq/2024001` | 单期详情（含奖级和地区） |
| GET | `/api/lottery/prize-levels?type=ssq` | 奖级定义 |

支持的彩票类型：`ssq`（双色球）、`dlt`（大乐透）、`fc3d`（福彩3D）、`pl3`（排列3）、`pl5`（排列5）

### 数据分析

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/analysis/hot-cold?type=ssq&range=30` | 冷热号统计 |
| GET | `/api/analysis/missing?type=ssq&range=30` | 遗漏值分析 |
| GET | `/api/analysis/features?type=ssq&range=30` | 奇偶/大小特征 |
| GET | `/api/analysis/trend?type=ssq&range=30` | 走势图数据 |

### 工具

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/tools/recommend` | 随机推荐号码 |
| POST | `/api/tools/check-prize` | 号码查奖 |
| POST | `/api/tools/prize-calc` | 奖金计算 |

**推荐号码示例：**

```json
POST /api/tools/recommend
{ "type": "ssq", "count": 5 }
```

**奖金计算示例：**

```json
POST /api/tools/prize-calc
{ "type": "ssq", "prize_level": "一等奖", "count": 1 }
```

### 数据拉取

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/lottery/check-exists` | 预检查数据是否存在 |
| POST | `/api/lottery/pull` | 拉取数据 |

**按期号拉取：**

```json
POST /api/lottery/pull
{
  "type": "ssq",
  "mode": "issue",
  "issues": ["2024001", "2024002"],
  "force_update": false
}
```

**按日期范围拉取：**

```json
POST /api/lottery/pull
{
  "type": "ssq",
  "mode": "date_range",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

### Webhook 管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/webhooks` | 查询所有 Webhook |
| POST | `/api/webhooks` | 创建 Webhook |
| PUT | `/api/webhooks/:id` | 更新 Webhook |
| DELETE | `/api/webhooks/:id` | 删除 Webhook |
| POST | `/api/webhooks/:id/test` | 测试 Webhook |

**创建 Webhook 示例：**

```json
POST /api/webhooks
{
  "name": "开奖通知群",
  "type": "dingtalk",
  "url": "https://oapi.dingtalk.com/robot/send?access_token=xxx",
  "secret": "SEC...",
  "enabled": true,
  "events": ["draw.new"]
}
```

支持的 Webhook 类型：`dingtalk`（钉钉）、`wechat`（企业微信）、`feishu`（飞书）、`generic`（通用 HTTP）

## 数据库

### 表结构

| 表名 | 说明 |
|------|------|
| `ssq_draws` | 双色球开奖记录 |
| `dlt_draws` | 大乐透开奖记录 |
| `small_draws` | 小盘彩（福彩3D/排列3/5）开奖记录 |
| `prize_details` | 奖级详情 |
| `winning_locations` | 中奖地区 |
| `webhooks` | Webhook 配置 |
| `config` | 系统配置 |

### 本地数据库迁移

```bash
cd worker && npm run db:migrate
```

## 部署

### 前置条件

1. 安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
2. 登录 Cloudflare：`wrangler login`
3. 创建 D1 数据库：`wrangler d1 create cp-lottery`
4. 更新 `worker/wrangler.toml` 中的 `database_id`

### 一键部署

```bash
chmod +x deploy.sh
./deploy.sh
```

### 分步部署

**部署 Worker：**

```bash
cd worker
wrangler d1 execute cp-lottery --remote --file=./src/db/schema.sql
npm run deploy
```

**部署前端到 Cloudflare Pages：**

```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=cp-lottery
```

### 定时任务

Worker 部署后会自动注册 Cron Trigger：

| 彩票 | 时间 (UTC) | 对应北京时间 |
|------|-----------|-------------|
| 双色球 | `30 13 * * 0,2,4` | 周二、四、日 21:30 |
| 大乐透 | `25 13 * * 1,3,5` | 周一、三、六 21:25 |
| 福彩3D/排列3/5 | `15 13 * * *` | 每日 21:15 |

## 开发说明

### 适配器模式

项目使用两种适配器模式：

1. **数据库适配器** — `DatabaseAdapter` 接口，`D1Adapter` 实现，`SQLiteD1Compat` 包装器用于本地开发
2. **数据源适配器** — `DataSourceAdapter` 接口，`ThirdPartyAdapter` 实现，支持从第三方 API 获取开奖数据

### 本地开发流程

```bash
# 终端 1：启动 Worker
cd worker && npm run dev

# 终端 2：启动前端
cd frontend && npm run dev

# 终端 3：运行测试
cd worker && npx vitest
```

## 许可证

MIT
