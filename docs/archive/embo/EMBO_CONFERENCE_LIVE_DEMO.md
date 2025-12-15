# 🎯 EMBO CONFERENCE LIVE DEMO - November 12, 2025

**Status**: ✅ **SERVERS LIVE AND ACCESSIBLE**
**Location**: EMBO Conference
**WiFi Network**: EMBO Conference WiFi
**Your MacBook IP**: 192.168.8.101

---

## 🚀 SERVERS ARE LIVE

### **Backend (Django)**
```
Status:     ✅ RUNNING
PID:        49171
Port:       8000
Network:    0.0.0.0 (all interfaces)
Started:    November 12, 2025 09:34 AM
Health:     HTTP 200 ✅
```

**Access URLs:**
- **Your laptop**: http://localhost:8000
- **Network**: http://192.168.8.101:8000

### **Frontend (React)**
```
Status:     ✅ RUNNING
PID:        49316
Port:       3001
Network:    0.0.0.0 (all interfaces)
Started:    November 12, 2025 09:34 AM
Build:      Compiled successfully ✅
Health:     HTTP 200 ✅
```

**Access URLs:**
- **Your laptop**: http://localhost:3001
- **Network**: http://192.168.8.101:3001

---

## 📱 FOR CONFERENCE ATTENDEES

### **Share This URL:**

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   StickForStats Interactive Demo                │
│                                                 │
│   Open your browser and visit:                 │
│                                                 │
│   http://192.168.8.101:3001                    │
│                                                 │
│   Requirements:                                 │
│   • Connected to EMBO Conference WiFi           │
│   • Any modern web browser                      │
│   • No installation needed                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

### **For Your Poster/Slides:**

**QR Code Alternative**: Consider creating a QR code pointing to:
- `http://192.168.8.101:3001`

**Short Instructions for Poster:**
> **Try it yourself!**
> 1. Connect to EMBO Conference WiFi
> 2. Visit: http://192.168.8.101:3001
> 3. Upload sample data from /test_data
> 4. See Guardian statistical validation in action

---

## 🎬 DEMO FLOW (3-5 minutes)

### **1. Introduction (30 seconds)**
- Open: http://localhost:3001 (for your presentation screen)
- Point to landing page statistic: "Over 70% of researchers fail to reproduce published findings"
- Say: "This reproducibility crisis motivated Guardian - our real-time statistical validation system"

### **2. Navigate to Statistical Analysis (15 seconds)**
- Click "Get Started" or navigate to Statistical Analysis Hub
- Say: "Let me show you Guardian detecting and blocking invalid statistical tests"

### **3. Demo #1: Guardian BLOCKS Invalid Test (90 seconds)**

**Upload**: `test_data/Guardian_Demo_Normality_Violation.csv`

**Expected Result**: 🔴 **RED WARNING**

**What to say**:
> "I'm uploading data that violates normality assumptions. Watch what happens..."
> [Upload and show red warning]
> "Guardian detected the violation and blocked the parametric test. See the specific issue flagged?"
> "This prevents publishing false positives from violated assumptions."

**Key Points**:
- Guardian runs Shapiro-Wilk test (gold standard, 1965)
- Detects p-value < 0.05 indicating non-normality
- Blocks test from proceeding
- Shows specific violation with actionable guidance

### **4. Demo #2: Guardian ALLOWS Valid Test (90 seconds)**

**Upload**: `test_data/Guardian_Demo_Valid_Data.csv`

**Expected Result**: ✅ **GREEN PASS**

**What to say**:
> "Now I'm uploading data that meets all assumptions..."
> [Upload and show green pass]
> "Guardian validates silently when assumptions are met - no warnings."
> "The test proceeds normally because the data is valid."

**Key Points**:
- All assumptions pass (normality, variance homogeneity)
- Guardian allows test to proceed
- Silent validation when data is valid
- Results can be trusted

### **5. Highlight Technical Achievements (45 seconds)**

**Coverage**: 77.3% (17/22 components)
- Say: "17 of 22 components protected - 100% of components that need validation"
- Explain: PowerCalculator, BayesianCalculator use parameters only (no raw data)
- Explain: 3 visualization tools display already-validated data

**Performance**: <200ms response time
- Say: "Guardian responds in under 200ms for most validators"
- Emphasize: Real-time validation, no workflow disruption

**Gold Standard Tests**:
- Shapiro-Wilk (1965) for normality
- Levene's test for variance homogeneity
- Anderson-Darling for distribution fit
- Linearity detection for regression

**Active Blocking**:
- Say: "Guardian doesn't just warn - it actively prevents invalid tests"
- Show: can_proceed: false flag in blocked tests

### **6. Q&A Preparation**

**If asked: "Why only 77.3% coverage?"**
> "PowerCalculator and BayesianCalculator accept parameters only - you can't test if 'alpha = 0.05' is normally distributed, it's a decision parameter, not a measurement. Plus 3 visualization components display data that's already validated upstream. This gives us 100% coverage of components that actually need assumption validation."

**If asked: "What tests does Guardian use?"**
> "Shapiro-Wilk for normality (1965), Levene's for variance homogeneity, Anderson-Darling for distribution fit, and custom linearity detection for regression. All gold-standard tests from peer-reviewed literature."

**If asked: "How fast is it?"**
> "Under 200ms for most validators based on our October 27 testing. Fast enough for real-time validation without disrupting researcher workflow."

**If asked: "Does it block or just warn?"**
> "It actively blocks. Tests cannot proceed when assumptions fail - prevents researchers from publishing invalid results."

---

## 📊 AVAILABLE DEMO DATA FILES

All in: `/Users/vishalbharti/StickForStats_v1.0_Production/test_data/`

1. **Guardian_Demo_Valid_Data.csv** ✅
   - All assumptions met
   - Guardian allows test to proceed
   - Use for: Showing successful validation

2. **Guardian_Demo_Normality_Violation.csv** 🔴
   - Shapiro-Wilk fails (p < 0.05)
   - Guardian blocks test
   - Use for: Showing normality detection

3. **Guardian_Demo_Variance_Violation.csv** 🔴
   - Levene's test fails
   - Guardian blocks test
   - Use for: Showing variance homogeneity check

4. **Guardian_Demo_Small_Sample.csv** 🔴
   - n < 3 (insufficient)
   - Guardian blocks test
   - Use for: Showing sample size validation

5. **Guardian_Demo_Bootstrap_NonNormal.csv** ✅
   - Non-normal but uses bootstrap
   - Guardian suggests robust method
   - Use for: Showing alternative recommendations

6. **Guardian_Demo_Nonlinear.csv** 🔴
   - Violates linearity for regression
   - Guardian blocks linear regression
   - Use for: Showing linearity detection

---

## 🔍 SERVER MONITORING

### **Check Server Status**:
```bash
lsof -i :8000    # Backend
lsof -i :3001    # Frontend
```

### **View Live Logs**:
```bash
tail -f /tmp/backend_embo.log     # Backend logs
tail -f /tmp/frontend_embo.log    # Frontend logs
```

### **Check Server Health**:
```bash
# Backend
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/

# Frontend
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/
```

**Expected**: Both should return `200`

### **Restart Servers If Needed**:
```bash
# Stop all
./kill_servers.sh

# Wait 5 seconds
sleep 5

# Start network servers
./start_network_server.sh
```

---

## 🛡️ SECURITY & STABILITY

### **Keep Servers Running**:
- ✅ Servers run in background (nohup)
- ✅ Will survive terminal closure
- ✅ Keep laptop awake during demos
- ✅ Keep connected to EMBO WiFi

### **Firewall**:
- macOS may prompt for firewall access
- **Allow** Python and Node when prompted
- Required for network access

### **Network Requirements**:
- All attendees must be on EMBO Conference WiFi
- Same WiFi network as your MacBook
- IP address will change if you switch networks

---

## 📋 PRE-DEMO CHECKLIST (5 minutes before)

### **Technical Verification**:
- [ ] Backend responding: `curl http://localhost:8000/` → 200 ✅
- [ ] Frontend responding: `curl http://localhost:3001/` → 200 ✅
- [ ] Network access: `curl http://192.168.8.101:3001/` → 200 ✅
- [ ] Landing page shows: "Over 70% of researchers fail to reproduce..."
- [ ] Test files accessible in /test_data
- [ ] Browser zoom appropriate for audience (Cmd +)

### **Demo Preparation**:
- [ ] Open http://localhost:3001 in browser
- [ ] Navigate to Statistical Analysis Hub
- [ ] Open test_data folder for quick file access
- [ ] Have Guardian_Demo_Normality_Violation.csv ready
- [ ] Have Guardian_Demo_Valid_Data.csv ready
- [ ] Clear browser cache if needed (Cmd+Shift+R)

### **Physical Setup**:
- [ ] Laptop connected to power
- [ ] Screen brightness at max
- [ ] Browser in full screen mode (F11 or Fn+F)
- [ ] Close unnecessary tabs/windows
- [ ] Disable notifications (Do Not Disturb)
- [ ] Water nearby

### **Backup Plan**:
- [ ] Screenshot of Guardian blocking test (backup if live demo fails)
- [ ] Screenshot of Guardian allowing test
- [ ] Presentation slides as fallback
- [ ] This document open on phone for reference

---

## 🎯 KEY MESSAGES FOR ATTENDEES

### **What StickForStats Does**:
> "StickForStats is a web-based platform for statistical analysis with built-in Guardian - a real-time assumption validation system that prevents researchers from running invalid statistical tests."

### **Why It Matters**:
> "Over 70% of researchers fail to reproduce published findings, with ~50% citing poor statistical analysis. Guardian addresses this by detecting assumption violations before analysis, preventing false positives at the source."

### **How Guardian Works**:
> "Guardian runs gold-standard tests like Shapiro-Wilk and Levene's in real-time. When assumptions fail, it blocks the test and explains what's wrong. When assumptions pass, it validates silently. Response time under 200ms - fast enough to be invisible to workflow."

### **What Makes It Unique**:
> "Most tools warn after analysis or don't check at all. Guardian blocks invalid tests before they run, preventing publication of unreliable results. It's like spell-check but for statistical validity."

---

## 🌐 NETWORK CONFIGURATION DETAILS

### **Current Configuration**:
- **WiFi**: EMBO Conference WiFi
- **MacBook IP**: 192.168.8.101
- **Subnet**: 192.168.8.0/24
- **Backend**: Listening on 0.0.0.0:8000 (all interfaces)
- **Frontend**: Listening on 0.0.0.0:3001 (all interfaces)

### **Django Settings**:
- **ALLOWED_HOSTS**: `['localhost', '127.0.0.1', '192.168.40.40', '*']`
- **CORS**: Allows all origins in DEBUG mode
- **DEBUG**: True (development mode)

### **If IP Changes** (switched WiFi):
1. Get new IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
2. Servers auto-listen on all IPs (0.0.0.0)
3. Update attendee URL with new IP
4. No server restart needed

---

## 📞 TROUBLESHOOTING

### **Problem**: Attendees can't access URL

**Solutions**:
1. Verify they're on EMBO Conference WiFi (same network)
2. Verify servers still running: `lsof -i :3001`
3. Check firewall isn't blocking: System Preferences → Security → Firewall
4. Get current IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
5. Provide updated URL if IP changed

### **Problem**: Slow loading

**Solutions**:
- First load takes 2-3 seconds (normal)
- Subsequent loads are instant (caching)
- Check WiFi signal strength
- Restart servers if needed

### **Problem**: Upload not working

**Solutions**:
- Check backend is running: `lsof -i :8000`
- Check backend logs: `tail -f /tmp/backend_embo.log`
- Verify CORS is enabled (should be in DEBUG mode)
- Hard refresh browser: Cmd+Shift+R

### **Problem**: Backend errors

**Solutions**:
1. Check logs: `tail -30 /tmp/backend_embo.log`
2. Common issues:
   - Import errors (check sqc_analysis app)
   - Database locked (restart backend)
   - Port conflict (kill and restart)

---

## 📚 SCIENTIFIC INTEGRITY REFERENCES

### **Reproducibility Crisis**:
- Baker, M. (2016). *1,500 scientists lift the lid on reproducibility*. Nature, 533(7604), 452-454.
- "Over 70% of researchers have tried and failed to reproduce another scientist's experiments"
- "52% agree there is a significant 'crisis' of reproducibility"

### **Statistical Testing**:
- Shapiro, S. S., & Wilk, M. B. (1965). An analysis of variance test for normality. Biometrika, 52(3/4), 591-611.
- Levene, H. (1960). Robust tests for equality of variances. In Contributions to probability and statistics (pp. 278-292).

### **Guardian Coverage**:
- 17/22 components = 77.3% coverage
- 5 excluded: 2 parameter-only, 3 visualization-only
- 100% coverage of components requiring validation

---

## ✅ FINAL STATUS

| Component | Status | Evidence |
|-----------|--------|----------|
| **Backend Server** | ✅ RUNNING | PID 49171, HTTP 200 |
| **Frontend Server** | ✅ RUNNING | PID 49316, HTTP 200 |
| **Network Access** | ✅ ACTIVE | http://192.168.8.101:3001 |
| **Localhost Access** | ✅ ACTIVE | http://localhost:3001 |
| **Demo Files** | ✅ READY | 6 CSV files in test_data/ |
| **Landing Page** | ✅ VERIFIED | "Over 70%" citation correct |
| **Scientific Integrity** | ✅ MAINTAINED | All claims evidence-based |
| **EMBO WiFi** | ✅ CONNECTED | IP: 192.168.8.101 |

---

## 🎉 YOU'RE READY FOR EMBO!

**Key Advantages for Conference Demo**:

1. ✅ **Live Interactive Demo** - Attendees can try it themselves
2. ✅ **No Installation Required** - Works in any browser
3. ✅ **Real-Time Validation** - See Guardian in action immediately
4. ✅ **Multiple Demo Scenarios** - 6 different test cases
5. ✅ **Network Accessible** - Share with entire poster session
6. ✅ **Evidence-Based Claims** - Every statistic cited and verified
7. ✅ **Gold Standard Methods** - Peer-reviewed tests (1960s-present)
8. ✅ **Scientific Rigor** - Same standards we enforce in Guardian

**This is exactly what you did for your lab meeting - now on EMBO WiFi!**

---

**Created**: November 12, 2025
**Location**: EMBO Conference
**Network**: EMBO WiFi (192.168.8.101)
**Status**: ✅ **LIVE AND READY**

**Go show the research community what you've built! 🚀**
