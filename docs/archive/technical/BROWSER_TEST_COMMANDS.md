# 🚀 BROWSER TEST QUICK START COMMANDS
## Immediate Testing Protocol
### Generated: September 21, 2025

---

## 📋 TERMINAL 1: Backend Server
```bash
cd /Users/vishalbharti/StickForStats_v1.0_Production/backend
python manage.py runserver
```

Expected output:
```
Starting development server at http://127.0.0.1:8000/
```

---

## 📋 TERMINAL 2: Frontend Server
```bash
cd /Users/vishalbharti/StickForStats_v1.0_Production/frontend
npm start
```

Expected output:
```
Compiled successfully!
You can now view the app in the browser.
Local: http://localhost:3000
```

---

## 📋 TERMINAL 3: Monitoring
```bash
# Watch for backend API calls
cd /Users/vishalbharti/StickForStats_v1.0_Production
tail -f backend/logs/django.log
```

---

## 🌐 BROWSER TESTING URLS

### Real Backend Modules (Test These!)
```
http://localhost:3000/modules/hypothesis-testing
http://localhost:3000/modules/correlation-regression
http://localhost:3000/modules/t-test-real
http://localhost:3000/modules/anova-real
```

### API Documentation
```
http://localhost:8000/api/swagger/
http://localhost:8000/api/v1/
```

---

## 🔍 BROWSER CONSOLE CHECKS

### Open Developer Tools (F12 or Cmd+Opt+I)

#### Check for Backend Connection:
```javascript
// In console, look for:
"Connected to 50-decimal precision backend"

// Or check manually:
fetch('http://localhost:8000/api/v1/stats/descriptive/', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({data: [1,2,3,4,5]})
}).then(r => r.json()).then(console.log)
```

#### Check for Errors:
- Red error messages
- CORS issues
- 404 Not Found
- Network failures

---

## ✅ VALIDATION CHECKLIST

### For Each Module:

1. **Page Loads**
   - [ ] No white screen
   - [ ] Components render
   - [ ] No console errors

2. **Backend Connection**
   - [ ] "Connected" indicator
   - [ ] Precision chip shows
   - [ ] API calls in Network tab

3. **Functionality**
   - [ ] Calculations execute
   - [ ] Results display
   - [ ] Precision values show
   - [ ] Visualizations work

4. **Data**
   - [ ] Real datasets load
   - [ ] Citations visible
   - [ ] No mock data

---

## 🐛 COMMON ISSUES & QUICK FIXES

### Backend Not Connected
```bash
# Check if running
lsof -i :8000

# Restart if needed
cd backend && python manage.py runserver
```

### Frontend Not Loading
```bash
# Check if running
lsof -i :3000

# Clear cache and restart
cd frontend
rm -rf node_modules/.cache
npm start
```

### CORS Error
```python
# Check backend/stickforstats/settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]
```

### Module Not Found
```javascript
// Check App.jsx imports
import HypothesisTestingModuleReal from './modules/HypothesisTestingModuleReal';
```

---

## 📸 SCREENSHOT EVIDENCE

### Take screenshots of:
1. Working precision display
2. Backend connection indicator
3. Real data in use
4. Any errors encountered

Save to: `/Users/vishalbharti/StickForStats_v1.0_Production/test_evidence/`

---

## 📊 PERFORMANCE METRICS

### Track and Document:
- Page load time
- API response time
- Calculation execution time
- Memory usage

### Browser Performance Tab:
1. Open DevTools → Performance
2. Start recording
3. Perform calculation
4. Stop recording
5. Note metrics

---

## 🎯 SUCCESS CRITERIA

### Module is Working If:
✅ Loads without errors
✅ Shows "Connected to backend"
✅ Displays 45+ decimal precision
✅ Uses real data
✅ Calculations complete < 1 second

### Module Needs Fix If:
❌ White screen or errors
❌ No backend connection
❌ Shows mock data
❌ Precision < 45 decimals
❌ Calculations timeout

---

## 📝 REPORTING TEMPLATE

### For Each Module Tested:
```markdown
## Module: [NAME]
- URL: [PATH]
- Status: [WORKING/NEEDS FIX]
- Backend Connected: [YES/NO]
- Precision Displayed: [XX decimals]
- Load Time: [XX ms]
- Issues Found: [LIST]
- Screenshots: [FILENAMES]
```

---

## 💡 PRO TIPS

1. **Test in Incognito Mode** - Avoids cache issues
2. **Keep Console Open** - See errors immediately
3. **Check Network Tab** - Monitor API calls
4. **Use Preserve Log** - Keep history across refreshes
5. **Test Both Chrome & Firefox** - Cross-browser validation

---

**Ready to Test! Execute commands above and validate our integration.**