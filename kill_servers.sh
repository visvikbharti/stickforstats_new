#!/bin/bash

echo "🛑 Stopping StickForStats Servers..."
echo "===================================="
echo ""

# Method 1: Kill by process name
echo "📌 Method 1: Killing Django backend..."
pkill -9 -f "manage.py runserver" 2>/dev/null && echo "   ✅ Django stopped" || echo "   ℹ️  Django not running"

echo "📌 Method 2: Killing React frontend..."
pkill -9 -f "react-scripts" 2>/dev/null && echo "   ✅ React stopped" || echo "   ℹ️  React not running"

# Method 2: Kill by port
echo "📌 Method 3: Killing processes on ports 3000, 3001, 8000..."
lsof -ti:3000,3001,8000 | xargs kill -9 2>/dev/null && echo "   ✅ Ports cleared" || echo "   ℹ️  Ports already free"

sleep 2

# Verify everything is stopped
echo ""
echo "🔍 Verification:"
if lsof -i :8000 | grep -q LISTEN; then
    echo "   ⚠️  WARNING: Port 8000 still in use"
    lsof -i :8000 | grep LISTEN
else
    echo "   ✅ Port 8000 is free"
fi

if lsof -i :3001 | grep -q LISTEN; then
    echo "   ⚠️  WARNING: Port 3001 still in use"
    lsof -i :3001 | grep LISTEN
else
    echo "   ✅ Port 3001 is free"
fi

if lsof -i :3000 | grep -q LISTEN; then
    echo "   ⚠️  WARNING: Port 3000 still in use"
    lsof -i :3000 | grep LISTEN
else
    echo "   ✅ Port 3000 is free"
fi

echo ""
echo "✅ All servers stopped!"
echo ""
