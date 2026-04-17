#!/bin/zsh

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo ""
echo "🚀 Starting RideRecon"
echo ""

echo "🔧 Starting backend..."
cd "$BACKEND_DIR"
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000 > /tmp/riderecon-backend.log 2>&1 &
BACKEND_PID=$!

echo "⏳ Waiting for backend on http://127.0.0.1:8000 ..."
until curl -s http://127.0.0.1:8000 > /dev/null; do
  sleep 1
done
echo "✅ Backend ready"

echo ""
echo "🎨 Starting frontend..."
cd "$FRONTEND_DIR"
npm run dev > /tmp/riderecon-frontend.log 2>&1 &
FRONTEND_PID=$!

echo "⏳ Waiting for frontend on http://localhost:3000 ..."
until curl -s http://localhost:3000 > /dev/null; do
  sleep 1
done
echo "✅ Frontend ready"

echo ""
echo "🌐 Opening browser..."
open http://localhost:3000

echo ""
echo "✅ RideRecon is ready"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://127.0.0.1:8000"
echo ""
echo "📄 Logs:"
echo "   Backend:  /tmp/riderecon-backend.log"
echo "   Frontend: /tmp/riderecon-frontend.log"
echo ""
echo "Press Ctrl+C to stop this script."
echo ""

wait