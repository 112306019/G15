#!/bin/bash
cd "$(dirname "$0")/frontend"
echo "📥 安裝前端依賴..."
npm install
echo "🚀 啟動前端 → http://localhost:5173"
npm run dev
