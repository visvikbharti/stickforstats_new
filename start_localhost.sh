#!/bin/bash

echo "🚀 Starting StickForStats (Localhost Only)..."
echo "=============================================="
echo ""

echo "🔴 Step 1: Stopping any existing servers..."
pkill -9 -f "manage.py runserver"
pkill -9 -f "react-scripts"
lsof -ti:3001,8000 | xargs kill -9 2>/dev/null
sleep 2
echo "   ✅ Cleaned up"
echo ""

echo "🚀 Step 2: Starting Django backend..."
cd /Users/vishalbharti/StickForStats_v1.0_Production/backend
python3 manage.py runserver 8000 > /tmp/backend_localhost.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
echo "   Backend URL: http://localhost:8000"
sleep 5
echo ""

echo "🚀 Step 3: Starting React frontend..."
cd /Users/vishalbharti/StickForStats_v1.0_Production/frontend
PORT=3001 npm start > /tmp/frontend_localhost.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
echo "   Frontend URL: http://localhost:3001"
echo ""

echo "⏳ Step 4: Waiting for servers to start (45 seconds)..."
for i in {1..9}; do
    echo -n "."
    sleep 5
done
echo ""
echo ""

echo "🔍 Step 5: Verifying servers..."
if lsof -i :8000 | grep -q LISTEN; then
    echo "   ✅ Backend running on port 8000"
else
    echo "   ❌ Backend FAILED - Check logs: tail -f /tmp/backend_localhost.log"
fi

if lsof -i :3001 | grep -q LISTEN; then
    echo "   ✅ Frontend running on port 3001"
else
    echo "   ⚠️  Frontend may still be compiling - Check logs: tail -f /tmp/frontend_localhost.log"
fi
echo ""

echo "=============================================="
echo "✅ Servers Started (Localhost Only)"
echo "=============================================="
echo ""
echo "📱 Access URLs (on this laptop only):"
echo "   Frontend: http://localhost:3001"
echo "   Backend:  http://localhost:8000"
echo ""
echo "📊 View logs:"
echo "   Backend:  tail -f /tmp/backend_localhost.log"
echo "   Frontend: tail -f /tmp/frontend_localhost.log"
echo ""
echo "🛑 To stop servers:"
echo "   ./kill_servers.sh"
echo ""
echo "🔥 Servers are running in background!"
echo ""
