# 🎱 彩票助手 - API Worker

支持双色球、大乐透、福彩3D、排列3/5 的彩票信息查询与分析工具。

## 一键部署

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button.svg)](https://deploy.workers.cloudflare.com/?url=https://github.com/OWNER/cp/tree/worker-api)

部署后需要：
1. 创建 D1 数据库：`wrangler d1 create cp-lottery`
2. 更新 `wrangler.toml` 中的 `database_id`
3. 运行数据库迁移：`wrangler d1 execute cp-lottery --remote --file=./src/db/schema.sql`

## 本地开发

```bash
npm install
npm run dev
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/lottery/latest?type=ssq` | 最新开奖 |
| GET | `/api/lottery/history?type=ssq&page=1` | 历史开奖 |
| GET | `/api/lottery/draw/ssq/2024001` | 单期详情 |
| GET | `/api/analysis/hot-cold?type=ssq` | 冷热号 |
| GET | `/api/analysis/missing?type=ssq` | 遗漏值 |
| POST | `/api/tools/recommend` | 推荐号码 |
| POST | `/api/tools/prize-calc` | 奖金计算 |
| GET/POST | `/api/webhooks` | Webhook 管理 |
