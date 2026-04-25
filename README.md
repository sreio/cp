# 🎱 彩票助手 - 前端

Vue 3 + Vite 构建的彩票助手前端，部署在 Cloudflare Pages。

[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button.svg)](https://deploy.workers.cloudflare.com/?url=https://github.com/OWNER/cp/tree/cp-frontend)

## 配置

部署后需要设置环境变量，将 API 地址指向你的 Worker：

```
VITE_API_BASE=https://your-cp-worker.your-subdomain.workers.dev
```

## 本地开发

```bash
npm install
npm run dev
```

开发模式下会自动代理 `/api` 请求到 `localhost:8787`（Worker 开发服务器）。

## 技术栈

- Vue 3 + TypeScript
- Vite 构建
- ECharts 图表
- Cloudflare Pages 部署
