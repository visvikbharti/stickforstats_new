# 🚀 StickForStats Server Management Guide

Quick reference for starting and stopping StickForStats servers.

---

## 🛑 **STOP/KILL ALL SERVERS**

### Simple One-Command Method:
```bash
./kill_servers.sh
```

### Manual Methods (if script doesn't work):

**Method 1: Kill by process name**
```bash
pkill -9 -f "manage.py runserver"
pkill -9 -f "react-scripts"
```

**Method 2: Kill by port**
```bash
lsof -ti:3000,3001,8000 | xargs kill -9
```

**Method 3: Kill specific process**
```bash
# Find the process ID
lsof -i :8000    # Backend
lsof -i :3001    # Frontend

# Kill it
kill -9 <PID>
```

---

## ✅ **START SERVERS**

### Option 1: Localhost Only (Your Laptop Only)
```bash
./start_localhost.sh
```
**Access at:**
- Frontend: http://localhost:3001
- Backend: http://localhost:8000

### Option 2: Network Server (Share with Labmates)
```bash
./start_network_server.sh
```
**Access at:**
- Your laptop: http://localhost:3001
- Labmates: http://192.168.40.40:3001 *(or current IP)*

### Option 3: Old Restart Script
```bash
./restart_servers.sh
```

---

## 🔍 **CHECK SERVER STATUS**

### Check if servers are running:
```bash
lsof -i :8000    # Backend (Django)
lsof -i :3001    # Frontend (React)
```

### View live logs:
```bash
# Localhost logs
tail -f /tmp/backend_localhost.log
tail -f /tmp/frontend_localhost.log

# Network logs
tail -f /tmp/backend_network.log
tail -f /tmp/frontend_network.log
```

---

## 📋 **QUICK REFERENCE**

| Action | Command |
|--------|---------|
| **Kill all servers** | `./kill_servers.sh` |
| **Start (localhost only)** | `./start_localhost.sh` |
| **Start (network share)** | `./start_network_server.sh` |
| **Check backend status** | `lsof -i :8000` |
| **Check frontend status** | `lsof -i :3001` |
| **View backend logs** | `tail -f /tmp/backend_*.log` |
| **View frontend logs** | `tail -f /tmp/frontend_*.log` |

---

## 🔧 **MANUAL START COMMANDS**

If scripts don't work, you can start manually:

### Backend (Django):
```bash
cd backend
python3 manage.py runserver 8000
# For network: python3 manage.py runserver 0.0.0.0:8000
```

### Frontend (React):
```bash
cd frontend
PORT=3001 npm start
# For network: HOST=0.0.0.0 PORT=3001 npm start
```

---

## 🌐 **NETWORK ACCESS REQUIREMENTS**

For labmates to access:
1. ✅ Use `./start_network_server.sh`
2. ✅ Keep your laptop awake and connected to WiFi
3. ✅ Share the IP address shown in the startup message
4. ✅ Everyone must be on the same WiFi network
5. ✅ Allow firewall access if macOS prompts

---

## 🐛 **TROUBLESHOOTING**

### Problem: "Address already in use"
**Solution:**
```bash
./kill_servers.sh
# Wait 2 seconds
./start_localhost.sh  # or ./start_network_server.sh
```

### Problem: Frontend not loading
**Solution:**
```bash
# Check if it's still compiling
tail -f /tmp/frontend_localhost.log
# Wait up to 2 minutes for compilation
```

### Problem: Backend errors
**Solution:**
```bash
# Check logs
tail -f /tmp/backend_localhost.log
# Or run manually to see errors
cd backend
python3 manage.py runserver 8000
```

### Problem: Network access not working
**Solution:**
1. Check firewall settings (System Preferences → Security → Firewall)
2. Verify everyone is on same WiFi
3. Get current IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
4. Update IP in Django settings if changed

---

## 📝 **NOTES**

- Servers run in **background** - they continue after closing terminal
- Always use `./kill_servers.sh` before starting fresh
- Localhost is faster and more stable for solo work
- Network mode is for sharing with labmates
- Frontend takes ~45-60 seconds to compile on first start
- Backend starts in ~5 seconds

---

## 🆘 **EMERGENCY COMMANDS**

If nothing works:
```bash
# Nuclear option - kill everything
sudo lsof -ti:3000,3001,8000 | xargs sudo kill -9
pkill -9 python
pkill -9 node

# Then restart
./start_localhost.sh
```

---

**Created:** October 2025
**Last Updated:** October 29, 2025
