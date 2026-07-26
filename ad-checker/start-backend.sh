#!/bin/bash
cd "$(dirname "$0")/backend"
if [ ! -d ".venv" ]; then
  echo "📦 建立虛擬環境..."
  python3 -m venv .venv
fi
source .venv/bin/activate
echo "📥 安裝後端依賴..."
pip install -r requirements.txt -q
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi
echo "🚀 啟動後端 → http://localhost:8000"
uvicorn main:app --reload --reload-exclude '.venv' --host 0.0.0.0 --port 8000
