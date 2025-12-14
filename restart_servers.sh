#!/bin/bash
echo "🔄 Restarting StickForStats servers..."
echo ""
echo "🔴 Step 1: Stopping existing servers..."
pkill -9 -f "manage.py runserver"
pkill -9 -f "react-scripts"
sleep 3

echo "✅ Step 2: Starting backend (Django)..."
cd /Users/vishalbharti/StickForStats_v1.0_Production/backend
python3 manage.py runserver 8000 > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
sleep 5

echo "✅ Step 3: Starting frontend (React)..."
cd /Users/vishalbharti/StickForStats_v1.0_Production/frontend
PORT=3001 npm start > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo "⏳ Step 4: Waiting for frontend compilation (45 seconds)..."
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
    echo "   ❌ Backend FAILED"
fi

if lsof -i :3001 | grep -q LISTEN; then
    echo "   ✅ Frontend running on port 3001"
else
    echo "   ❌ Frontend FAILED (may need more time)"
fi

echo ""
echo "🌐 URLs:"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3001"
echo ""
echo "📋 View logs:"
echo "   Backend:  tail -f /tmp/backend.log"
echo "   Frontend: tail -f /tmp/frontend.log"
echo ""
echo "✅ Restart complete!"
