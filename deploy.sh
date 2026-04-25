#!/bin/bash
set -e

echo "🎱 彩票助手 - 部署脚本"
echo "========================"

# 部署 Worker
echo "📦 部署 Worker..."
cd worker
npm install --production=false
npm run deploy
cd ..

# 构建并部署前端
echo "🌐 构建前端..."
cd frontend
npm install
npm run build

echo "📤 部署到 Cloudflare Pages..."
npx wrangler pages deploy dist --project-name=cp-lottery
cd ..

echo "✅ 部署完成!"
