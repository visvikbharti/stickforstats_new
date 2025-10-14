# StickForStats API Integration Guide

## Quick Start

Get up and running with the StickForStats API in 5 minutes.

### Step 1: Get Your API Key

1. Log in to your StickForStats account
2. Navigate to **Settings → API Keys**
3. Click **Generate New Key**
4. Copy your key immediately (shown only once)

### Step 2: Make Your First Request

```bash
# Basic API call to calculate normal distribution PDF
curl -X POST https://api.stickforstats.com/v1/distributions/calculate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "distribution": "normal",
    "operation": "pdf",
    "parameters": {
      "mean": 0,
      "standardDeviation": 1
    },
    "x": 0
  }'
```

### Step 3: Handle the Response

```json
{
  "result": 0.3989422804014327,
  "calculation": {
    "distribution": "normal",
    "operation": "pdf",
    "parameters": {
      "mean": 0,
      "standardDeviation": 1
    },
    "x": 0
  },
  "validation": {
    "isValid": true,
    "validatedAt": "2025-10-15T10:30:45.123Z"
  },
  "auditId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-10-15T10:30:45.123Z"
}
```

---

## Authentication

### Bearer Token Authentication

All API requests require a Bearer token in the Authorization header:

```http
Authorization: Bearer YOUR_API_KEY
```

### Getting Access Tokens

#### Option 1: Long-lived API Keys (Recommended for servers)

```javascript
// Store in environment variables
const API_KEY = process.env.STICKFORSTATS_API_KEY;

// Use in requests
const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
};
```

#### Option 2: OAuth 2.0 Flow (For user applications)

```javascript
// 1. Get authorization code
const authUrl = `https://auth.stickforstats.com/oauth/authorize?
  client_id=${CLIENT_ID}&
  redirect_uri=${REDIRECT_URI}&
  response_type=code&
  scope=read write`;

// 2. Exchange code for tokens
const tokenResponse = await fetch('https://auth.stickforstats.com/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code: authorizationCode,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI
  })
});

// 3. Use access token
const { access_token, refresh_token } = await tokenResponse.json();
```

### Token Refresh

Access tokens expire after 1 hour. Use refresh tokens to get new access tokens:

```javascript
async function refreshAccessToken(refreshToken) {
  const response = await fetch('https://api.stickforstats.com/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  const { accessToken, expiresIn } = await response.json();
  return { accessToken, expiresIn };
}
```

---

## SDK Installation

### JavaScript/TypeScript

```bash
npm install @stickforstats/sdk
# or
yarn add @stickforstats/sdk
```

```javascript
import { StickForStats } from '@stickforstats/sdk';

const client = new StickForStats({
  apiKey: 'YOUR_API_KEY',
  baseURL: 'https://api.stickforstats.com/v1' // optional
});

// Use the client
const result = await client.distributions.calculate({
  distribution: 'normal',
  operation: 'cdf',
  parameters: { mean: 100, standardDeviation: 15 },
  x: 115
});
```

### Python

```bash
pip install stickforstats
```

```python
from stickforstats import StickForStatsClient

client = StickForStatsClient(api_key='YOUR_API_KEY')

# Calculate distribution
result = client.distributions.calculate(
    distribution='normal',
    operation='pdf',
    parameters={'mean': 0, 'standardDeviation': 1},
    x=1.96
)

print(f"PDF value: {result['result']}")
```

### R

```r
# Install from CRAN
install.packages("stickforstats")

library(stickforstats)

# Initialize client
client <- stickforstats_client(api_key = "YOUR_API_KEY")

# Calculate distribution
result <- calculate_distribution(
  client,
  distribution = "normal",
  operation = "quantile",
  parameters = list(mean = 0, standardDeviation = 1),
  p = 0.975
)
```

---

## Common Use Cases

### 1. Statistical Calculations

#### Normal Distribution Analysis

```javascript
// Calculate probability P(X < 130) for IQ scores
const response = await client.distributions.calculate({
  distribution: 'normal',
  operation: 'cdf',
  parameters: {
    mean: 100,
    standardDeviation: 15
  },
  x: 130
});

console.log(`Probability of IQ < 130: ${response.result * 100}%`);
// Output: Probability of IQ < 130: 97.72%
```

#### Batch Calculations

```javascript
// Process multiple calculations efficiently
const batchResponse = await client.distributions.batch({
  calculations: [
    {
      distribution: 'normal',
      operation: 'pdf',
      parameters: { mean: 0, standardDeviation: 1 },
      x: -2
    },
    {
      distribution: 'normal',
      operation: 'pdf',
      parameters: { mean: 0, standardDeviation: 1 },
      x: 0
    },
    {
      distribution: 'normal',
      operation: 'pdf',
      parameters: { mean: 0, standardDeviation: 1 },
      x: 2
    }
  ],
  parallel: true
});
```

### 2. Quality Control

#### Control Chart Generation

```javascript
// Generate X-bar control chart for manufacturing data
const controlChart = await client.sqc.controlChart({
  chartType: 'xbar',
  data: [
    [25.1, 25.3, 25.2, 25.0, 25.4],
    [24.9, 25.1, 25.2, 25.3, 25.0],
    [25.2, 25.1, 25.0, 25.3, 25.1]
  ],
  specifications: {
    lsl: 24.5,
    usl: 25.5,
    target: 25.0
  },
  westernElectricRules: true
});

// Check for out-of-control points
if (controlChart.violations.length > 0) {
  console.log('Process out of control!');
  controlChart.violations.forEach(v => {
    console.log(`Point ${v.point}: ${v.description}`);
  });
}
```

#### Process Capability Analysis

```javascript
// Analyze process capability
const capability = await client.sqc.processCapability({
  data: processData,
  lsl: 98,
  usl: 102,
  target: 100,
  confidenceLevel: 0.95
});

console.log(`Cpk: ${capability.capability.cpk}`);
console.log(`Process yield: ${capability.performance.yield * 100}%`);
```

### 3. Experimental Design

#### Generate Factorial Design

```javascript
// Create 2^3 factorial design
const design = await client.doe.design({
  type: 'full_factorial',
  factors: [
    { name: 'Temperature', low: 150, high: 200 },
    { name: 'Pressure', low: 10, high: 20 },
    { name: 'Time', low: 30, high: 60 }
  ],
  replicates: 2,
  centerPoints: 3,
  randomize: true
});

// Get experimental run order
console.log('Run order:', design.runOrder);
console.log('Design matrix:', design.matrix);
```

#### Analyze Experimental Results

```javascript
// Analyze DOE results with ANOVA
const analysis = await client.doe.analyze({
  design: design,
  responses: [
    {
      name: 'Yield',
      values: [85, 87, 82, 88, 90, 83, 86, 89, ...],
      target: 90
    }
  ],
  analysisType: 'anova',
  includeInteractions: true
});

// Get significant factors
const significantFactors = analysis.results.anova.factors
  .filter(f => f.pValue < 0.05)
  .map(f => f.name);
```

### 4. Confidence Intervals

#### Calculate Confidence Interval for Mean

```javascript
// 95% confidence interval for population mean
const ci = await client.confidenceIntervals.calculate({
  type: 'mean',
  data: [23.5, 24.1, 22.8, 25.2, 23.9, 24.5, 23.3, 24.8],
  confidenceLevel: 0.95,
  method: 't' // Use t-distribution for small samples
});

console.log(`95% CI: [${ci.lowerBound}, ${ci.upperBound}]`);
console.log(`Point estimate: ${ci.pointEstimate}`);
console.log(`Margin of error: ${ci.marginOfError}`);
```

---

## Error Handling

### Standard Error Response

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid parameter value",
    "details": {
      "field": "parameters.standardDeviation",
      "constraint": "must be greater than 0",
      "provided": -1
    },
    "timestamp": "2025-10-15T10:30:45.123Z",
    "requestId": "req_abc123"
  }
}
```

### Error Codes

| Code | HTTP Status | Description | Action |
|------|-------------|-------------|---------|
| `AUTHENTICATION_ERROR` | 401 | Invalid or expired token | Check API key |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions | Check plan limits |
| `VALIDATION_ERROR` | 400 | Invalid input parameters | Fix parameters |
| `NOT_FOUND` | 404 | Resource not found | Check endpoint |
| `RATE_LIMIT_ERROR` | 429 | Too many requests | Implement backoff |
| `SERVER_ERROR` | 500 | Internal server error | Retry with backoff |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily down | Wait and retry |

### Implementing Retry Logic

```javascript
async function apiCallWithRetry(fn, maxRetries = 3) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on client errors
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Usage
const result = await apiCallWithRetry(() =>
  client.distributions.calculate(params)
);
```

---

## Rate Limiting

### Rate Limits by Plan

| Plan | Requests/Hour | Burst | Concurrent |
|------|--------------|-------|------------|
| Free | 100 | 10/min | 2 |
| Professional | 5,000 | 100/min | 10 |
| Enterprise | Unlimited | Unlimited | Unlimited |

### Rate Limit Headers

Every response includes rate limit information:

```http
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4995
X-RateLimit-Reset: 1634294400
```

### Handling Rate Limits

```javascript
class RateLimitedClient {
  constructor(client) {
    this.client = client;
    this.queue = [];
    this.processing = false;
  }

  async request(method, params) {
    return new Promise((resolve, reject) => {
      this.queue.push({ method, params, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const { method, params, resolve, reject } = this.queue.shift();

      try {
        const result = await this.client[method](params);
        resolve(result);
      } catch (error) {
        if (error.code === 'RATE_LIMIT_ERROR') {
          // Put back in queue and wait
          this.queue.unshift({ method, params, resolve, reject });
          const resetTime = error.headers['x-ratelimit-reset'];
          const waitTime = resetTime * 1000 - Date.now();
          await new Promise(r => setTimeout(r, waitTime));
        } else {
          reject(error);
        }
      }

      // Small delay between requests
      await new Promise(r => setTimeout(r, 100));
    }

    this.processing = false;
  }
}
```

---

## Webhooks

### Setting Up Webhooks

Configure webhooks to receive real-time notifications:

```javascript
// Register webhook endpoint
const webhook = await client.webhooks.create({
  url: 'https://your-app.com/webhooks/stickforstats',
  events: ['calculation.completed', 'analysis.failed', 'export.ready'],
  secret: 'your_webhook_secret'
});
```

### Webhook Payload

```json
{
  "event": "calculation.completed",
  "timestamp": "2025-10-15T10:30:45.123Z",
  "data": {
    "calculationId": "calc_abc123",
    "type": "distribution",
    "status": "completed",
    "result": {...}
  },
  "signature": "sha256=abcdef123456..."
}
```

### Verifying Webhook Signatures

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return `sha256=${expectedSignature}` === signature;
}

// Express webhook handler
app.post('/webhooks/stickforstats', (req, res) => {
  const signature = req.headers['x-stickforstats-signature'];

  if (!verifyWebhookSignature(req.body, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook
  switch (req.body.event) {
    case 'calculation.completed':
      handleCalculationComplete(req.body.data);
      break;
    // ... handle other events
  }

  res.status(200).send('OK');
});
```

---

## Best Practices

### 1. Security

```javascript
// DON'T: Hardcode API keys
const apiKey = 'sk_live_abc123'; // Bad!

// DO: Use environment variables
const apiKey = process.env.STICKFORSTATS_API_KEY; // Good!

// DO: Use secrets management
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();
const secret = await secretsManager.getSecretValue({ SecretId: 'stickforstats' });
const apiKey = JSON.parse(secret.SecretString).apiKey;
```

### 2. Performance

```javascript
// Batch operations when possible
// DON'T: Multiple sequential calls
for (const value of values) {
  const result = await client.distributions.calculate({
    distribution: 'normal',
    operation: 'pdf',
    parameters: { mean: 0, standardDeviation: 1 },
    x: value
  });
}

// DO: Single batch call
const results = await client.distributions.batch({
  calculations: values.map(x => ({
    distribution: 'normal',
    operation: 'pdf',
    parameters: { mean: 0, standardDeviation: 1 },
    x
  }))
});
```

### 3. Error Recovery

```javascript
// Implement comprehensive error handling
class StickForStatsService {
  async calculateWithFallback(params) {
    try {
      // Try API first
      return await this.client.distributions.calculate(params);
    } catch (error) {
      if (error.code === 'SERVICE_UNAVAILABLE') {
        // Fallback to local calculation if available
        return this.localCalculate(params);
      }

      // Log error for monitoring
      this.logger.error('API calculation failed', { error, params });

      // Re-throw for caller to handle
      throw error;
    }
  }
}
```

### 4. Caching

```javascript
// Cache frequently used calculations
class CachedClient {
  constructor(client) {
    this.client = client;
    this.cache = new Map();
    this.cacheTime = 3600000; // 1 hour
  }

  async calculate(params) {
    const key = JSON.stringify(params);

    // Check cache
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      if (Date.now() - cached.timestamp < this.cacheTime) {
        return cached.data;
      }
    }

    // Make API call
    const result = await this.client.distributions.calculate(params);

    // Cache result
    this.cache.set(key, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  }
}
```

---

## Testing

### Unit Testing API Calls

```javascript
// Jest example
const { StickForStats } = require('@stickforstats/sdk');

describe('StickForStats API', () => {
  let client;

  beforeAll(() => {
    client = new StickForStats({
      apiKey: process.env.TEST_API_KEY,
      baseURL: process.env.TEST_API_URL
    });
  });

  test('calculates normal distribution PDF', async () => {
    const result = await client.distributions.calculate({
      distribution: 'normal',
      operation: 'pdf',
      parameters: { mean: 0, standardDeviation: 1 },
      x: 0
    });

    expect(result.result).toBeCloseTo(0.3989, 4);
    expect(result.validation.isValid).toBe(true);
  });

  test('handles invalid parameters', async () => {
    await expect(client.distributions.calculate({
      distribution: 'normal',
      operation: 'pdf',
      parameters: { mean: 0, standardDeviation: -1 }, // Invalid!
      x: 0
    })).rejects.toThrow('standardDeviation must be greater than 0');
  });
});
```

### Integration Testing

```javascript
// Test complete workflow
describe('Complete Analysis Workflow', () => {
  test('performs end-to-end DOE analysis', async () => {
    // 1. Generate design
    const design = await client.doe.design({
      type: 'full_factorial',
      factors: [
        { name: 'A', low: -1, high: 1 },
        { name: 'B', low: -1, high: 1 }
      ]
    });

    expect(design.totalRuns).toBe(4);

    // 2. Simulate response data
    const responses = design.matrix.map(row =>
      row[0] * 2 + row[1] * 3 + Math.random()
    );

    // 3. Analyze results
    const analysis = await client.doe.analyze({
      design: design,
      responses: [{
        name: 'Y',
        values: responses
      }],
      analysisType: 'regression'
    });

    expect(analysis.results.regression.rSquared).toBeGreaterThan(0.8);
  });
});
```

---

## Migration Guide

### Migrating from Other Platforms

#### From Minitab

```python
# Minitab macro
# CALC> PDF 1.96;
# SUBC> NORMAL 0 1.

# StickForStats equivalent
result = client.distributions.calculate(
    distribution='normal',
    operation='pdf',
    parameters={'mean': 0, 'standardDeviation': 1},
    x=1.96
)
```

#### From R

```r
# R code
pnorm(1.96, mean = 0, sd = 1)

# StickForStats equivalent
result <- calculate_distribution(
  client,
  distribution = "normal",
  operation = "cdf",
  parameters = list(mean = 0, standardDeviation = 1),
  x = 1.96
)
```

#### From Python (SciPy)

```python
# SciPy code
from scipy import stats
stats.norm.pdf(1.96, loc=0, scale=1)

# StickForStats equivalent
result = client.distributions.calculate(
    distribution='normal',
    operation='pdf',
    parameters={'mean': 0, 'standardDeviation': 1},
    x=1.96
)
```

---

## Support Resources

### Documentation
- **API Reference**: https://api.stickforstats.com/docs
- **SDK Documentation**: https://docs.stickforstats.com/sdk
- **Examples Repository**: https://github.com/stickforstats/examples

### Getting Help
- **Email**: api-support@stickforstats.com
- **Stack Overflow**: Tag `stickforstats`
- **GitHub Issues**: https://github.com/stickforstats/sdk/issues
- **Discord**: https://discord.gg/stickforstats

### Status and Monitoring
- **API Status**: https://status.stickforstats.com
- **Service Health**: https://api.stickforstats.com/health
- **Changelog**: https://docs.stickforstats.com/changelog

---

*API Version: 1.0.0*
*Last Updated: October 2025*
*© 2025 StickForStats, Inc.*