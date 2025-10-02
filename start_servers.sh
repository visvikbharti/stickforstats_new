#!/bin/bash

# StickForStats Server Startup Script
# ===================================
# Starts both Django backend and React frontend servers

echo "========================================"
echo "Starting StickForStats v1.0 Production"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to kill servers on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

# Set trap for cleanup on script exit
trap cleanup EXIT INT TERM

# Check Python installation
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed${NC}"
    exit 1
fi

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites checked${NC}"
echo ""

# Start Django Backend
echo -e "${YELLOW}Starting Django Backend...${NC}"
cd backend

# Apply migrations if needed
echo "Applying database migrations..."
python3 manage.py migrate --noinput 2>/dev/null

# Start Django server
python3 manage.py runserver 8000 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started on http://localhost:8000${NC}"
echo ""

# Wait a moment for backend to start
sleep 2

# Start React Frontend
echo -e "${YELLOW}Starting React Frontend...${NC}"
cd ../frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Set environment variable for API URL
export REACT_APP_API_URL=http://localhost:8000/api

# Start React development server
npm start &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo -e "${GREEN}StickForStats is running!${NC}"
echo "========================================"
echo ""
echo "Backend API: http://localhost:8000/api"
echo "Frontend UI: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for servers
wait