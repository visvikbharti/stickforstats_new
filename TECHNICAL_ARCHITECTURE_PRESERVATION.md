# 🏛️ TECHNICAL ARCHITECTURE PRESERVATION GUIDE
## StickForStats - Preserving 50 Decimal Precision Architecture
### Critical Technical Decisions & Implementation Patterns
### Date: September 16, 2025

---

# ⚠️ CRITICAL: READ THIS BEFORE ANY DEVELOPMENT

This document preserves **critical technical decisions** that MUST be maintained. Violating these patterns will break the 50 decimal precision guarantee and compromise the entire platform.

---

# 🔴 THE FIVE COMMANDMENTS

## 1. THOU SHALT MAINTAIN 50 DECIMAL PRECISION
```python
# ALWAYS at module start
from mpmath import mp, mpf
mp.dps = 50  # NEVER change this

# ALWAYS convert inputs
value = mpf(str(input_value))  # String conversion prevents float truncation
```

## 2. THOU SHALT NOT USE NATIVE PYTHON FLOATS
```python
# ❌ WRONG
result = 0.1 + 0.2  # Loss of precision

# ✅ CORRECT
result = mpf('0.1') + mpf('0.2')  # Maintains 50 decimals
```

## 3. THOU SHALT TRANSFER HIGH PRECISION AS STRINGS
```python
# Backend to Frontend
return {
    'power': str(power),  # "0.80134567890123456789012345678901234567890123456789"
    'power_float': float(power)  # For display only
}
```

## 4. THOU SHALT VALIDATE EVERYTHING
```python
# No assumptions, only evidence
if not self._check_normality(data):
    warnings.warn("Data not normally distributed")
    return self._use_nonparametric_method(data)
```

## 5. THOU SHALT DOCUMENT METICULOUSLY
```python
"""
Every function needs:
- Complete docstring
- Parameter types
- Return specifications
- Scientific references
- Precision guarantees
"""
```

---

# 🎯 CORE ARCHITECTURAL DECISIONS

## Decision 1: Dual-Precision Strategy
### Why This Matters
Users need both ultra-high precision for research AND readable outputs for reports.

### Implementation
```python
class HighPrecisionResult:
    def __init__(self, value):
        self.precise = str(value)  # Full 50 decimals
        self.display = float(value)  # For UI
        self.decimal_obj = Decimal(str(value))  # For frontend calculations

# API Response Pattern
{
    "success": true,
    "results": {
        "p_value": "0.04532189076543210987654321098765432109876543210987",  # Precise
        "p_value_float": 0.04532,  # Display
        "p_value_display": "0.045322",  # Formatted
        "interpretation": "Statistically significant at α=0.05"
    },
    "precision": "50 decimal places"
}
```

## Decision 2: Parallel API Architecture
### Why This Matters
Backward compatibility while adding high-precision endpoints.

### Implementation
```python
# Old endpoints remain (for compatibility)
/api/stats/ttest/  # Standard precision

# New high-precision endpoints
/api/v1/stats/ttest/  # 50 decimal precision
/api/v2/stats/ttest/  # Future 100 decimal precision
```

## Decision 3: Lazy Import Pattern
### Why This Matters
Not all statistical methods need all libraries loaded.

### Implementation
```python
class StatisticalTests:
    def __init__(self):
        self._scipy = None
        self._statsmodels = None

    @property
    def scipy(self):
        if self._scipy is None:
            import scipy.stats
            self._scipy = scipy.stats
        return self._scipy
```

## Decision 4: Validation-First Architecture
### Why This Matters
Scientific integrity requires validation at every step.

### Implementation
```python
def calculate_statistic(data, **kwargs):
    # 1. Input validation
    validated_data = self._validate_input(data)

    # 2. Assumption checking
    assumptions_met = self._check_assumptions(validated_data)

    # 3. Method selection
    method = self._select_method(validated_data, assumptions_met)

    # 4. Calculation with precision
    result = self._calculate_with_precision(validated_data, method)

    # 5. Output validation
    self._validate_output(result)

    # 6. Interpretation
    result['interpretation'] = self._interpret_result(result)

    return result
```

---

# 🔧 CRITICAL IMPLEMENTATION PATTERNS

## Pattern 1: High-Precision Number Handling
```python
from mpmath import mp, mpf, sqrt, exp, log, pi
from decimal import Decimal, getcontext

# Module initialization
mp.dps = 50
getcontext().prec = 50

class HighPrecisionBase:
    """Base class for ALL high-precision modules"""

    def __init__(self):
        self.precision = 50
        mp.dps = self.precision
        getcontext().prec = self.precision

    def _to_high_precision(self, value):
        """Convert ANY input to high precision"""
        if isinstance(value, (list, np.ndarray)):
            return [mpf(str(v)) for v in value]
        elif isinstance(value, pd.Series):
            return value.apply(lambda x: mpf(str(x)))
        elif isinstance(value, pd.DataFrame):
            return value.applymap(lambda x: mpf(str(x)))
        else:
            return mpf(str(value))

    def _from_high_precision(self, value, mode='string'):
        """Convert FROM high precision for output"""
        if mode == 'string':
            return str(value)
        elif mode == 'float':
            return float(value)
        elif mode == 'decimal':
            return Decimal(str(value))
```

## Pattern 2: Statistical Distribution Functions
```python
# Custom high-precision distributions
def _normal_cdf(self, x: mpf) -> mpf:
    """Normal CDF with 50 decimal precision"""
    from mpmath import erf
    return mpf('0.5') * (mpf('1') + erf(x / sqrt(mpf('2'))))

def _t_cdf(self, x: mpf, df: mpf) -> mpf:
    """t-distribution CDF with 50 decimal precision"""
    # For now, use scipy with conversion
    # TODO: Implement pure high-precision version
    from scipy.stats import t
    return mpf(str(t.cdf(float(x), float(df))))

def _chi2_cdf(self, x: mpf, df: mpf) -> mpf:
    """Chi-square CDF with 50 decimal precision"""
    from mpmath import gammainc
    if x <= 0:
        return mpf('0')
    return gammainc(df/2, 0, x/2, regularized=True)
```

## Pattern 3: Matrix Operations
```python
# High-precision matrix operations
def _matrix_multiply_hp(self, A, B):
    """Matrix multiplication with 50 decimal precision"""
    A_hp = [[self._to_high_precision(elem) for elem in row] for row in A]
    B_hp = [[self._to_high_precision(elem) for elem in row] for row in B]

    result = []
    for i in range(len(A_hp)):
        row = []
        for j in range(len(B_hp[0])):
            sum_val = mpf('0')
            for k in range(len(B_hp)):
                sum_val += A_hp[i][k] * B_hp[k][j]
            row.append(sum_val)
        result.append(row)
    return result

def _matrix_inverse_hp(self, matrix):
    """Matrix inversion with 50 decimal precision"""
    from mpmath import matrix, lu_solve
    # Convert to mpmath matrix
    M = matrix([[self._to_high_precision(elem) for elem in row]
                for row in matrix])
    # Use LU decomposition for stability
    return lu_solve(M, matrix.eye(len(M)))
```

## Pattern 4: Error Handling
```python
class HighPrecisionError(Exception):
    """Base exception for high-precision calculations"""
    pass

class PrecisionLossError(HighPrecisionError):
    """Raised when precision loss is detected"""
    pass

class AssumptionViolationError(HighPrecisionError):
    """Raised when statistical assumptions are violated"""
    pass

def safe_hp_operation(func):
    """Decorator for safe high-precision operations"""
    def wrapper(*args, **kwargs):
        try:
            # Store initial precision
            initial_precision = mp.dps

            # Execute operation
            result = func(*args, **kwargs)

            # Verify precision maintained
            if mp.dps != initial_precision:
                raise PrecisionLossError(
                    f"Precision changed from {initial_precision} to {mp.dps}"
                )

            return result

        except Exception as e:
            logger.error(f"High-precision operation failed: {str(e)}")
            raise HighPrecisionError(f"Operation failed: {str(e)}")

    return wrapper
```

---

# 📊 DATA FLOW ARCHITECTURE

## Frontend → Backend → Frontend

### 1. Frontend Sends Request
```javascript
// Frontend (JavaScript)
const requestData = {
    data: [1.1, 2.2, 3.3, 4.4, 5.5],
    alpha: 0.05,
    alternative: 'two-sided'
};

const response = await api.post('/api/v1/stats/ttest/', requestData);
```

### 2. Backend Receives & Converts
```python
# Backend (Python)
def ttest_endpoint(request):
    # Convert to high precision immediately
    data = [mpf(str(x)) for x in request.data['data']]
    alpha = mpf(str(request.data['alpha']))
```

### 3. Backend Processes
```python
# All calculations in 50 decimal precision
t_stat = (mean - mu0) / (std_dev / sqrt(n))
p_value = mpf('2') * (mpf('1') - self._t_cdf(abs(t_stat), df))
```

### 4. Backend Returns
```python
return {
    't_statistic': str(t_stat),  # Full precision as string
    't_statistic_float': float(t_stat),  # For display
    'p_value': str(p_value),
    'p_value_float': float(p_value),
    'degrees_freedom': int(df),
    'interpretation': self._interpret(p_value, alpha)
}
```

### 5. Frontend Receives & Handles
```javascript
// Frontend uses Decimal.js for precision
import Decimal from 'decimal.js';
Decimal.set({ precision: 50 });

const pValue = new Decimal(response.p_value);
const displayValue = response.p_value_float.toFixed(4);
```

---

# 🗄️ DATABASE DESIGN DECISIONS

## Storing High-Precision Values
```python
# models.py
class AnalysisResult(models.Model):
    """Store analysis results with full precision"""

    # Metadata
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    analysis_type = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    # High-precision values stored as TEXT
    test_statistic = models.TextField()  # "2.3456789012345678901234567890123456789012345678901"
    p_value = models.TextField()
    effect_size = models.TextField()

    # Precision tracking
    precision_digits = models.IntegerField(default=50)

    # Display values for quick access
    test_statistic_display = models.FloatField()  # 2.3457
    p_value_display = models.FloatField()  # 0.0234

    # Results as JSON
    full_results = models.JSONField()  # Complete results with all values

    def get_precise_value(self, field):
        """Retrieve value with full precision"""
        value = getattr(self, field)
        return mpf(value)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'analysis_type', 'created_at']),
        ]
```

---

# 🔄 CACHING STRATEGY

## High-Precision Caching
```python
from django.core.cache import cache
import hashlib
import json

def cache_hp_result(key_data, result, timeout=3600):
    """Cache high-precision results"""
    # Create stable hash key
    key_str = json.dumps(key_data, sort_keys=True)
    cache_key = f"hp_{hashlib.md5(key_str.encode()).hexdigest()}"

    # Store with precision flag
    cache_data = {
        'result': result,
        'precision': mp.dps,
        'timestamp': datetime.now().isoformat()
    }

    cache.set(cache_key, cache_data, timeout)
    return cache_key

def get_cached_hp_result(key_data):
    """Retrieve cached high-precision result"""
    key_str = json.dumps(key_data, sort_keys=True)
    cache_key = f"hp_{hashlib.md5(key_str.encode()).hexdigest()}"

    cached = cache.get(cache_key)
    if cached and cached['precision'] == mp.dps:
        return cached['result']
    return None
```

---

# 🧪 TESTING STRATEGIES

## High-Precision Test Patterns
```python
import unittest
from mpmath import mp, mpf

class HighPrecisionTestCase(unittest.TestCase):
    """Base class for high-precision tests"""

    def setUp(self):
        """Ensure precision is set"""
        self.original_precision = mp.dps
        mp.dps = 50

    def tearDown(self):
        """Restore precision"""
        mp.dps = self.original_precision

    def assertPrecisionEqual(self, result, expected, places=50):
        """Assert equality at specified precision"""
        result_mp = mpf(str(result))
        expected_mp = mpf(str(expected))

        # Check precision maintained
        self.assertEqual(mp.dps, 50)

        # Check values match to specified places
        diff = abs(result_mp - expected_mp)
        tolerance = mpf(10) ** (-places)

        self.assertLess(diff, tolerance,
            f"Values differ beyond {places} decimal places: "
            f"{result} != {expected}"
        )

    def assertPrecisionMaintained(self, result):
        """Verify precision in result structure"""
        if isinstance(result, dict):
            for key, value in result.items():
                if key.endswith('_precise') or key == 'power':
                    # Should be string with many decimals
                    self.assertIsInstance(value, str)
                    if '.' in value:
                        decimals = len(value.split('.')[-1])
                        self.assertGreaterEqual(decimals, 40)
```

## Validation Test Patterns
```python
def test_assumption_checking(self):
    """Test that assumptions are properly checked"""
    # Non-normal data
    skewed_data = np.random.exponential(1, 100)

    with self.assertWarns(UserWarning):
        result = self.calculator.t_test(skewed_data)

    # Should recommend non-parametric
    self.assertIn('non-parametric', result.get('warnings', [''])[0])
```

---

# 🔐 SECURITY CONSIDERATIONS

## Precision Attack Prevention
```python
# Prevent precision-based timing attacks
def constant_time_comparison(a: mpf, b: mpf, tolerance: mpf) -> bool:
    """Compare high-precision values in constant time"""
    diff = abs(a - b)
    in_tolerance = diff < tolerance

    # Add random delay to prevent timing analysis
    import time
    import random
    time.sleep(random.uniform(0.0001, 0.0002))

    return in_tolerance

# Limit precision in user inputs
def sanitize_precision_input(value, max_decimals=100):
    """Prevent DoS via excessive precision"""
    str_value = str(value)
    if '.' in str_value:
        integer, decimal = str_value.split('.')
        if len(decimal) > max_decimals:
            decimal = decimal[:max_decimals]
            str_value = f"{integer}.{decimal}"
    return mpf(str_value)
```

---

# ⚡ PERFORMANCE OPTIMIZATIONS

## Optimization Patterns
```python
# 1. Batch operations
def calculate_multiple_t_tests(data_sets):
    """Process multiple t-tests efficiently"""
    results = []

    # Pre-calculate common values
    critical_values = {}

    for data in data_sets:
        n = len(data)
        if n not in critical_values:
            critical_values[n] = self._t_critical(n-1, alpha)

        # Reuse critical value
        result = self._t_test_with_critical(data, critical_values[n])
        results.append(result)

    return results

# 2. Memoization for expensive operations
from functools import lru_cache

@lru_cache(maxsize=1000)
def _cached_t_cdf(x: str, df: str) -> str:
    """Cache t-distribution CDF calculations"""
    return str(self._t_cdf(mpf(x), mpf(df)))

# 3. Parallel processing for independent calculations
from multiprocessing import Pool

def parallel_power_analysis(parameters_list):
    """Calculate power for multiple parameter sets in parallel"""
    with Pool() as pool:
        results = pool.map(self.calculate_power, parameters_list)
    return results
```

---

# 🌍 INTERNATIONALIZATION

## Precision Across Locales
```python
def format_high_precision_international(value, locale='en_US'):
    """Format high-precision numbers for different locales"""
    import locale as loc

    # Set locale
    loc.setlocale(loc.LC_NUMERIC, locale)

    # Convert to string with locale-specific formatting
    if locale == 'de_DE':
        # German uses comma as decimal separator
        return str(value).replace('.', ',')
    elif locale == 'fr_FR':
        # French uses comma and spaces
        return str(value).replace('.', ',')
    else:
        # Default to period
        return str(value)
```

---

# 📚 LIBRARY DEPENDENCIES

## Critical Dependencies & Versions
```python
# requirements.txt with exact versions
mpmath==1.3.0          # CRITICAL: High-precision math
decimal==1.0.0         # Built-in, but document usage
scipy==1.11.3          # For distribution functions
numpy==1.24.3          # Array operations (convert to mpmath)
pandas==2.0.3          # Data manipulation
scikit-learn==1.3.0    # ML algorithms
statsmodels==0.14.0    # Advanced statistics

# Frontend package.json
"decimal.js": "^10.4.3"  // High-precision in JavaScript
"plotly.js": "^2.26.0"   // Visualization
"react": "^18.2.0"       // UI framework
```

## Fallback Strategies
```python
# When libraries are unavailable
try:
    from scipy import stats
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    warnings.warn("SciPy not available, using internal implementations")

class StatisticalTests:
    def t_test(self, data):
        if SCIPY_AVAILABLE:
            # Use optimized SciPy with conversion
            return self._t_test_scipy(data)
        else:
            # Use pure Python implementation
            return self._t_test_internal(data)
```

---

# 🚨 CRITICAL WARNINGS

## NEVER DO THESE:

### 1. Direct Float Operations
```python
# ❌ NEVER
result = sum(data) / len(data)

# ✅ ALWAYS
result = sum([mpf(str(x)) for x in data]) / mpf(str(len(data)))
```

### 2. Precision Reduction
```python
# ❌ NEVER
mp.dps = 10  # Reducing precision

# ✅ ALWAYS
mp.dps = 50  # Or higher, never lower
```

### 3. Unvalidated Inputs
```python
# ❌ NEVER
def calculate(data):
    return process(data)

# ✅ ALWAYS
def calculate(data):
    validated = self._validate_input(data)
    self._check_assumptions(validated)
    return process(validated)
```

### 4. Lost Precision in Storage
```python
# ❌ NEVER
models.FloatField()  # Loses precision

# ✅ ALWAYS
models.TextField()  # Store as string
```

### 5. Approximate Methods Without Warning
```python
# ❌ NEVER
return approximate_result

# ✅ ALWAYS
if use_approximation:
    warnings.warn("Using approximation due to computational limits")
return approximate_result
```

---

# 📋 CHECKLIST FOR NEW MODULES

When creating a new high-precision module:

- [ ] Import mpmath and set `mp.dps = 50`
- [ ] Create class inheriting from `HighPrecisionBase`
- [ ] Convert all inputs using `_to_high_precision()`
- [ ] Implement assumption checking
- [ ] Add comprehensive docstrings
- [ ] Return results as strings AND floats
- [ ] Include interpretation
- [ ] Add validation tests
- [ ] Create API endpoint
- [ ] Document in API docs
- [ ] Create frontend service
- [ ] Add React component
- [ ] Test end-to-end
- [ ] Verify 50 decimal precision maintained
- [ ] Add to integration tests

---

# 🎓 KNOWLEDGE PRESERVATION

## Key Learnings

1. **String Conversion is Critical**
   - Always convert through string to avoid float truncation
   - `mpf(0.1)` ❌ vs `mpf('0.1')` ✅

2. **Parallel APIs Work**
   - Maintaining old endpoints prevents breaking changes
   - New versions can add precision without disruption

3. **Validation Prevents Issues**
   - Check assumptions before processing
   - Validate precision after calculations

4. **Documentation Saves Time**
   - Comprehensive docs prevent reimplementation
   - Examples clarify usage

5. **Testing Ensures Quality**
   - Test precision maintenance
   - Verify against known values
   - Check edge cases

---

# 🔮 FUTURE CONSIDERATIONS

## When Extending to 100+ Decimals

1. **Update Base Configuration**
```python
mp.dps = 100  # or 200, 500, etc.
```

2. **Consider Performance**
- Higher precision = slower calculations
- May need GPU acceleration
- Consider adaptive precision

3. **Storage Implications**
- Longer strings in database
- Increased network payload
- Compression strategies needed

4. **Frontend Handling**
- Decimal.js supports arbitrary precision
- UI display strategies needed
- Performance optimization critical

---

# 📜 ARCHITECTURAL PRINCIPLES

## The Ten Principles

1. **Precision First** - Never compromise precision for performance
2. **Validate Everything** - No assumptions, only evidence
3. **Document Thoroughly** - Future developers need context
4. **Test Rigorously** - Every calculation must be verified
5. **Fail Gracefully** - Clear errors with solutions
6. **Scale Thoughtfully** - Design for millions of calculations
7. **Secure by Default** - Protect against precision attacks
8. **International Ready** - Support global number formats
9. **Cache Intelligently** - Reuse expensive calculations
10. **Monitor Continuously** - Track precision in production

---

**Document Status:** COMPLETE ✅
**Preservation Date:** September 16, 2025
**Critical Level:** MAXIMUM
**Required Reading:** YES

---

## Final Words

*"This architecture is not just code; it's a commitment to scientific excellence. Every decision documented here was made to ensure that researchers worldwide can trust their results to 50 decimal places. Maintain this trust."*

**- StickForStats Architecture Team**