#!/bin/bash

echo "🌐 Starting StickForStats Network Server..."
echo "=============================================="
echo ""

# Get local IP address
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo "📡 Your laptop's IP address: $LOCAL_IP"
echo ""

echo "🔴 Step 1: Stopping any existing servers..."
pkill -9 -f "manage.py runserver"
pkill -9 -f "react-scripts"
lsof -ti:3001,8000 | xargs kill -9 2>/dev/null
sleep 2
echo "   ✅ Existing servers stopped"
echo ""

echo "🚀 Step 2: Starting Django backend on network..."
cd /Users/vishalbharti/StickForStats_v1.0_Production/backend
python3 manage.py runserver 0.0.0.0:8000 > /tmp/backend_network.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
echo "   Backend URL: http://$LOCAL_IP:8000"
sleep 5
echo ""

echo "🚀 Step 3: Starting React frontend on network..."
cd /Users/vishalbharti/StickForStats_v1.0_Production/frontend
HOST=0.0.0.0 PORT=3001 npm start > /tmp/frontend_network.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
echo "   Frontend URL: http://$LOCAL_IP:3001"
echo ""

echo "⏳ Step 4: Waiting for servers to start (60 seconds)..."
for i in {1..12}; do
    echo -n "."
    sleep 5
done
echo ""
echo ""

echo "🔍 Step 5: Verifying servers..."
if lsof -i :8000 | grep -q LISTEN; then
    echo "   ✅ Backend running on port 8000"
else
    echo "   ❌ Backend FAILED - Check logs: tail -f /tmp/backend_network.log"
fi

if lsof -i :3001 | grep -q LISTEN; then
    echo "   ✅ Frontend running on port 3001"
else
    echo "   ⚠️  Frontend may still be compiling - Check logs: tail -f /tmp/frontend_network.log"
fi
echo ""

echo "=============================================="
echo "✅ SERVER IS NOW ACCESSIBLE ON LOCAL NETWORK!"
echo "=============================================="
echo ""
echo "📱 ACCESS URLs:"
echo ""
echo "   🖥️  Your laptop (localhost):"
echo "      Frontend: http://localhost:3001"
echo "      Backend:  http://localhost:8000"
echo ""
echo "   🌐 Network access (for labmates):"
echo "      Frontend: http://$LOCAL_IP:3001"
echo "      Backend:  http://$LOCAL_IP:8000"
echo ""
echo "=============================================="
echo ""
echo "📋 Share this with your labmates:"
echo ""
echo "   ┌─────────────────────────────────────────┐"
echo "   │  StickForStats is now live!             │"
echo "   │                                          │"
echo "   │  Open your browser and visit:           │"
echo "   │  http://$LOCAL_IP:3001                  │"
echo "   │                                          │"
echo "   │  Make sure you're on the same WiFi!     │"
echo "   └─────────────────────────────────────────┘"
echo ""
echo "=============================================="
echo ""
echo "📊 View logs:"
echo "   Backend:  tail -f /tmp/backend_network.log"
echo "   Frontend: tail -f /tmp/frontend_network.log"
echo ""
echo "🛑 To stop servers:"
echo "   pkill -9 -f \"manage.py runserver\""
echo "   pkill -9 -f \"react-scripts\""
echo ""
echo "🔥 Servers are running in background!"
echo "   Press Ctrl+C to exit this script (servers will keep running)"
echo ""

# Keep script running to show it's active
echo "Press Ctrl+C to exit (servers will continue running in background)"
while true; do
    sleep 3600
done
