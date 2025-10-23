# Troubleshooting Guide

This comprehensive guide helps you resolve common issues with the StickForStats platform. If you can't find a solution here, please contact our support team at support@stickforstats.com.

## Table of Contents

1. [Login and Authentication Issues](#login-and-authentication-issues)
2. [Data Import Problems](#data-import-problems)
3. [Calculation Errors](#calculation-errors)
4. [Visualization Issues](#visualization-issues)
5. [Performance Problems](#performance-problems)
6. [Export and Download Issues](#export-and-download-issues)
7. [API and Integration Problems](#api-and-integration-problems)
8. [Compliance and Validation Issues](#compliance-and-validation-issues)
9. [Browser Compatibility](#browser-compatibility)
10. [Error Messages Reference](#error-messages-reference)

---

## Login and Authentication Issues

### Problem: "Invalid credentials" error

**Symptoms:**
- Cannot log in despite correct password
- Error message appears immediately

**Solutions:**
1. **Check caps lock** - Passwords are case-sensitive
2. **Clear browser cache**:
   - Chrome: Ctrl+Shift+Del → Clear browsing data
   - Firefox: Ctrl+Shift+Del → Clear recent history
   - Safari: Develop → Empty Caches
3. **Reset password**:
   - Click "Forgot Password" on login page
   - Check email (including spam folder)
   - Use reset link within 24 hours
4. **Check account status**:
   - Verify email confirmation completed
   - Ensure account not suspended
   - Contact admin if enterprise user

### Problem: "Session expired" repeatedly

**Symptoms:**
- Logged out frequently
- Must re-login every few minutes

**Solutions:**
1. **Check browser settings**:
   ```
   Enable cookies for stickforstats.com
   Allow local storage
   Disable aggressive privacy extensions
   ```
2. **Network stability**:
   - Check internet connection
   - Disable VPN if unstable
   - Try different network
3. **Browser configuration**:
   - Use supported browser (Chrome, Firefox, Safari, Edge)
   - Update to latest version
   - Try incognito/private mode

### Problem: Two-factor authentication (2FA) issues

**Solutions:**
1. **Time sync issues**:
   - Ensure device clock is accurate
   - Enable automatic time setting
2. **Lost authenticator**:
   - Use backup codes
   - Contact support with account verification
3. **SMS not received**:
   - Check phone number format (+country code)
   - Verify SMS not blocked
   - Try voice call option

---

## Data Import Problems

### Problem: "Invalid file format" error

**Symptoms:**
- File upload rejected
- Error appears before processing

**Solutions:**

1. **Check file format**:
   ```
   Supported formats:
   - CSV (.csv) - Comma-separated
   - Excel (.xlsx, .xls)
   - JSON (.json)
   - Text (.txt) - Tab-delimited
   ```

2. **CSV formatting requirements**:
   ```csv
   # Correct format:
   Sample,Value,Group
   1,25.3,A
   2,24.8,A
   3,26.1,B

   # Common issues:
   - No headers
   - Wrong delimiter (use comma, not semicolon)
   - Special characters in headers
   - Extra blank rows
   ```

3. **Excel formatting**:
   - Data should start in cell A1
   - First row = headers
   - No merged cells
   - Single sheet or specify sheet name
   - Remove formulas (paste values only)

### Problem: "Data validation failed"

**Symptoms:**
- File uploads but processing fails
- Specific rows/columns highlighted

**Solutions:**

1. **Clean your data**:
   ```python
   # Common data issues and fixes:

   # Remove non-numeric characters
   "25.3 kg" → "25.3"
   "$1,234.56" → "1234.56"

   # Fix decimal separators
   "25,3" → "25.3"  # Use period, not comma

   # Handle missing values
   "" → Remove row or impute
   "N/A" → Remove or code as missing
   "-" → Remove or treat as missing
   ```

2. **Check data types**:
   - Numeric columns: Only numbers
   - Date columns: ISO format (YYYY-MM-DD)
   - Categories: Consistent spelling/case

3. **Size limitations**:
   - Max file size: 100MB
   - Max rows: 1,000,000
   - Max columns: 1,000
   - For larger files, use API or batch processing

### Problem: Copy-paste not working

**Solutions:**

1. **From Excel**:
   - Select data without headers
   - Copy (Ctrl+C)
   - Click in data input area
   - Paste (Ctrl+V)

2. **Format issues**:
   ```
   If paste includes formatting:
   1. Paste into Notepad first
   2. Copy from Notepad
   3. Paste into platform
   ```

3. **Browser permissions**:
   - Allow clipboard access
   - Try keyboard shortcuts instead of right-click

---

## Calculation Errors

### Problem: "Insufficient data" error

**Symptoms:**
- Calculation won't start
- Warning about sample size

**Minimum Requirements:**

| Analysis Type | Minimum Sample Size |
|--------------|-------------------|
| Mean confidence interval | 2 (better: 30+) |
| Standard deviation | 2 |
| Normality test | 3 (better: 20+) |
| Correlation | 3 pairs |
| Regression | n > p + 1 |
| Control charts | 20-25 subgroups |
| Process capability | 30 (better: 100+) |
| DOE | Depends on design |

**Solutions:**
1. Collect more data
2. Use appropriate small-sample methods
3. Consider bootstrap techniques
4. Aggregate similar datasets

### Problem: "Numerical overflow/underflow"

**Symptoms:**
- Results show Infinity or NaN
- Very large/small numbers

**Solutions:**

1. **Scale your data**:
   ```javascript
   // If values are very large
   Original: 1,000,000, 1,200,000, 1,100,000
   Scaled: 1.0, 1.2, 1.1 (millions)

   // If values are very small
   Original: 0.000001, 0.000002
   Scaled: 1.0, 2.0 (×10⁻⁶)
   ```

2. **Use log transformations**:
   - For exponential growth
   - For wide-ranging values
   - For percentage changes

3. **Check parameter bounds**:
   - Rates > 0
   - Probabilities: 0 to 1
   - Variances ≥ 0

### Problem: "Convergence failed"

**Symptoms:**
- Optimization doesn't complete
- Iterative methods fail

**Solutions:**

1. **Adjust settings**:
   ```
   Tolerance: Increase from 1e-6 to 1e-4
   Max iterations: Increase to 1000
   Starting values: Try different initial values
   ```

2. **Simplify model**:
   - Remove highly correlated variables
   - Reduce number of factors
   - Use simpler design

3. **Data issues**:
   - Check for perfect separation
   - Remove outliers temporarily
   - Ensure sufficient variation

---

## Visualization Issues

### Problem: Charts not displaying

**Symptoms:**
- Blank chart area
- Loading spinner continues

**Solutions:**

1. **Browser compatibility**:
   ```javascript
   // Check WebGL support
   1. Open browser console (F12)
   2. Type: window.WebGLRenderingContext
   3. Should not be undefined
   ```

2. **Enable hardware acceleration**:
   - Chrome: Settings → Advanced → System → Hardware acceleration
   - Firefox: Settings → Performance → Hardware acceleration

3. **Clear cache and reload**:
   - Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
   - Clear site data: Developer tools → Application → Clear storage

### Problem: 3D plots not rotating

**Solutions:**
1. Enable JavaScript
2. Allow WebGL
3. Update graphics drivers
4. Try different browser
5. Disable browser extensions

### Problem: Export quality poor

**Solutions:**

1. **For high-quality exports**:
   ```
   Format selection:
   - Print: Use PDF or SVG
   - Presentations: Use PNG at 300 DPI
   - Web: Use PNG at 72 DPI
   - Publication: Use SVG (vector)
   ```

2. **Adjust before export**:
   - Set desired dimensions
   - Configure font sizes
   - Choose color scheme
   - Hide gridlines if needed

---

## Performance Problems

### Problem: Slow loading times

**Symptoms:**
- Pages take >5 seconds to load
- Calculations timeout

**Solutions:**

1. **Check internet speed**:
   - Minimum: 10 Mbps recommended
   - Test at fast.com or speedtest.net

2. **Browser optimization**:
   ```
   1. Close unnecessary tabs (limit to 10)
   2. Disable unused extensions
   3. Clear browser cache
   4. Restart browser
   ```

3. **Data optimization**:
   - Reduce dataset size for testing
   - Use sampling for large datasets
   - Enable progressive loading

### Problem: Browser crashes/freezes

**Solutions:**

1. **Memory management**:
   - Check RAM usage (Task Manager/Activity Monitor)
   - Close other applications
   - Increase browser memory limit

2. **Dataset limits**:
   ```javascript
   // Break large operations into chunks
   Instead of: process(millionRows)
   Use:
   for (chunk of chunks(data, 10000)) {
     process(chunk)
   }
   ```

3. **Use batch processing**:
   - Split into multiple smaller jobs
   - Process overnight
   - Use API for automation

---

## Export and Download Issues

### Problem: Downloads fail or corrupt

**Solutions:**

1. **Check disk space**:
   - Ensure adequate free space
   - Clear downloads folder

2. **Browser settings**:
   - Set download location
   - Disable "Ask where to save"
   - Allow multiple downloads

3. **File corruption**:
   - Disable antivirus temporarily
   - Try different format
   - Use cloud export option

### Problem: Excel file won't open

**Solutions:**

1. **Compatibility**:
   - Use .xlsx for Excel 2007+
   - Use .xls for older versions
   - Try CSV as alternative

2. **Repair in Excel**:
   ```
   File → Open → Browse
   Select file → Open dropdown → Open and Repair
   ```

---

## API and Integration Problems

### Problem: "401 Unauthorized" API error

**Solutions:**

1. **Check authentication**:
   ```bash
   # Correct header format
   Authorization: Bearer YOUR_TOKEN_HERE

   # Common mistakes:
   # Missing "Bearer" prefix
   # Extra spaces
   # Expired token
   ```

2. **Token management**:
   - Tokens expire after 1 hour
   - Use refresh token to get new access token
   - Store securely (environment variables)

### Problem: "429 Too Many Requests"

**Solutions:**

1. **Implement rate limiting**:
   ```javascript
   // Add delay between requests
   const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

   for (const request of requests) {
     await makeRequest(request);
     await delay(100); // 100ms between requests
   }
   ```

2. **Use batch endpoints**:
   - Combine multiple operations
   - Single request for multiple calculations

3. **Upgrade plan**:
   - Professional: 5,000 requests/hour
   - Enterprise: Unlimited

### Problem: CORS errors

**Solutions:**

1. **For development**:
   - Use proxy configuration
   - Run from same domain
   - Use CORS browser extension (dev only)

2. **For production**:
   - Whitelist your domain
   - Use server-side requests
   - Configure proper headers

---

## Compliance and Validation Issues

### Problem: "Validation failed" for FDA compliance

**Requirements not met:**

1. **Electronic signatures**:
   - Enable in Settings → Compliance
   - Require for all critical operations
   - Cannot be retroactively added

2. **Audit trail incomplete**:
   - Enable before starting work
   - Cannot have gaps
   - Must include all changes

3. **Required fields**:
   ```
   Mandatory for compliance:
   - User identification
   - Timestamp (synchronized)
   - Action performed
   - Previous value (for changes)
   - Reason for change
   - Digital signature
   ```

### Problem: Audit trail verification fails

**Solutions:**

1. **Check blockchain integrity**:
   - No manual database edits
   - Sequential entry IDs
   - Valid signatures

2. **Time synchronization**:
   - Use NTP server
   - Check timezone settings
   - No manual time changes

---

## Browser Compatibility

### Supported Browsers (Recommended)

| Browser | Minimum Version | Recommended |
|---------|----------------|-------------|
| Chrome | 90+ | Latest |
| Firefox | 88+ | Latest |
| Safari | 14+ | Latest |
| Edge | 90+ | Latest |

### Problem: Features not working in browser

**Browser-specific fixes:**

1. **Internet Explorer**: Not supported, upgrade to Edge

2. **Safari issues**:
   - Enable WebGL
   - Allow cookies
   - Disable Intelligent Tracking Prevention for site

3. **Firefox issues**:
   - Check enhanced tracking protection
   - Allow canvas fingerprinting
   - Enable WebAssembly

4. **Chrome issues**:
   - Disable aggressive ad blockers
   - Allow JavaScript
   - Check site permissions

---

## Error Messages Reference

### Common Error Codes

| Code | Message | Solution |
|------|---------|----------|
| E001 | Invalid input format | Check data formatting guide |
| E002 | Calculation timeout | Reduce data size or complexity |
| E003 | Insufficient permissions | Check user role/permissions |
| E004 | Data validation failed | Review validation rules |
| E005 | Network error | Check internet connection |
| E006 | Server error | Wait and retry, contact support |
| E007 | Rate limit exceeded | Reduce request frequency |
| E008 | Invalid parameters | Check parameter bounds |
| E009 | Convergence failed | Adjust algorithm settings |
| E010 | Memory limit exceeded | Reduce dataset size |

### Validation Warning Codes

| Code | Warning | Action |
|------|---------|--------|
| W001 | Small sample size | Consider limitations in interpretation |
| W002 | Outliers detected | Review and decide on treatment |
| W003 | Non-normal data | Consider transformation or non-parametric methods |
| W004 | High correlation | Check for multicollinearity |
| W005 | Missing values | Decide on imputation strategy |

---

## Getting Additional Help

### Self-Service Resources

1. **Knowledge Base**: support.stickforstats.com/kb
2. **Video Tutorials**: youtube.com/stickforstats
3. **Community Forum**: forum.stickforstats.com
4. **API Documentation**: api.stickforstats.com/docs

### Contact Support

**Email Support**
- Standard: support@stickforstats.com (48hr response)
- Priority: priority@stickforstats.com (4hr response)
- Enterprise: enterprise@stickforstats.com (1hr response)

**Live Chat** (Professional/Enterprise)
- Available: Monday-Friday, 8 AM - 8 PM EST
- Access: Click chat icon in platform

**Phone Support** (Enterprise only)
- US: +1-555-STATS-11
- EU: +44-20-STATS-111
- APAC: +65-STATS-1111

### Information to Provide

When contacting support, include:

1. **Account information**:
   - Email address
   - Organization name
   - Subscription type

2. **Issue details**:
   - Error message (exact text or screenshot)
   - Steps to reproduce
   - When it started
   - Frequency

3. **Technical details**:
   - Browser and version
   - Operating system
   - Network type (corporate/home)
   - Any recent changes

4. **Attempted solutions**:
   - What you've tried
   - Results of troubleshooting

### Priority Levels

| Priority | Response Time | Examples |
|----------|--------------|----------|
| Critical | 1 hour | System down, data loss |
| High | 4 hours | Feature broken, blocking work |
| Medium | 24 hours | Workaround available |
| Low | 48 hours | Questions, enhancements |

---

## Preventive Measures

### Best Practices

1. **Regular maintenance**:
   - Clear cache weekly
   - Update browser monthly
   - Review permissions quarterly

2. **Data management**:
   - Validate before import
   - Keep backups
   - Document sources

3. **Performance optimization**:
   - Work with appropriate sample sizes
   - Use efficient formats
   - Close unused projects

4. **Security**:
   - Use strong passwords
   - Enable 2FA
   - Regular security reviews

---

*Last Updated: October 2025*
*Version: 1.0.0*
*© 2025 StickForStats, Inc.*