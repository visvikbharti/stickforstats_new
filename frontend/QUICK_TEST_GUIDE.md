# Quick Test Guide - Integration Test Suite

## Quick Start

Run all integration tests:
```bash
cd /Users/vishalbharti/StickForStats_v1.0_Production/frontend
npm test -- --testPathPattern="validation/__tests__"
```

## Individual Test Files

### 1. Validation Integration Tests (36 tests)
Tests validation system integration with all statistical modules.

```bash
npm test -- ValidationIntegration.test.js
```

**What it tests:**
- Probability distributions (Normal, Binomial, Poisson, Exponential)
- Confidence intervals
- Design of Experiments (DOE)
- Statistical Quality Control (SQC)
- Matrix operations
- Error recovery
- Performance with large datasets

**Expected runtime:** ~10-15 seconds

---

### 2. End-to-End Workflow Tests (43 tests)
Tests complete user workflows from input to output.

```bash
npm test -- EndToEndWorkflows.test.js
```

**What it tests:**
- Complete probability analysis workflows
- CI calculation workflows
- DOE design and analysis workflows
- SQC control chart workflows
- Cross-module data flows
- Backend synchronization
- UI integration
- Error recovery in workflows

**Expected runtime:** ~15-20 seconds

---

### 3. Compliance Tests (35 tests)
Verifies regulatory compliance (FDA, GxP, ISO).

```bash
npm test -- ComplianceTests.test.js
```

**What it tests:**
- FDA 21 CFR Part 11 compliance
  - Electronic records
  - Electronic signatures
  - Audit trails
  - Data integrity
  - Access controls
- GxP compliance
  - Documentation practices
  - Traceability
  - Change control
- ISO 9001:2015
  - Quality management
  - Risk assessments
  - CAPA tracking
  - Continuous improvement

**Expected runtime:** ~8-12 seconds

---

### 4. Performance Tests (29 tests)
Load and stress testing under various conditions.

```bash
npm test -- PerformanceTests.test.js
```

**What it tests:**
- High volume operations (1000+ validations/sec)
- Large datasets (100,000 elements)
- Concurrent operations (100+ simultaneous)
- Memory management
- Stress conditions
- Resource exhaustion
- Error recovery performance
- Optimization verification

**Expected runtime:** ~20-30 seconds

---

## Common Test Commands

### Run with verbose output:
```bash
npm test -- ValidationIntegration.test.js --verbose
```

### Run specific test suite:
```bash
npm test -- ValidationIntegration.test.js -t "Probability Distribution Integration"
```

### Run with coverage:
```bash
npm test -- ValidationIntegration.test.js --coverage
```

### Run all and watch for changes:
```bash
npm test -- --testPathPattern="validation/__tests__" --watch
```

### Run in CI mode (no watch):
```bash
npm test -- --testPathPattern="validation/__tests__" --ci
```

## Test Statistics

| Test File | Lines | Tests | Runtime |
|-----------|-------|-------|---------|
| ValidationIntegration | 1,026 | 36 | ~10-15s |
| EndToEndWorkflows | 1,120 | 43 | ~15-20s |
| ComplianceTests | 1,057 | 35 | ~8-12s |
| PerformanceTests | 913 | 29 | ~20-30s |
| **TOTAL** | **4,116** | **143** | **~53-77s** |

## Performance Benchmarks

These benchmarks should be met when running PerformanceTests.test.js:

| Metric | Target | Status |
|--------|--------|--------|
| Single validation | < 10ms | PASS |
| Array validation (10k) | < 100ms | PASS |
| Matrix validation (50x50) | < 200ms | PASS |
| Complete workflow | < 50ms | PASS |
| Throughput | > 1000 ops/sec | PASS |
| Memory overhead | < 20% | PASS |

## Troubleshooting

### Tests timing out?
Increase timeout:
```bash
npm test -- ValidationIntegration.test.js --testTimeout=10000
```

### Memory issues?
Run tests individually:
```bash
npm test -- ValidationIntegration.test.js
npm test -- EndToEndWorkflows.test.js
# etc.
```

### Need debug output?
```bash
DEBUG=* npm test -- ValidationIntegration.test.js
```

## Success Criteria

All tests MUST:
- ✅ Pass with 100% success rate
- ✅ Complete within expected runtime
- ✅ Meet all performance benchmarks
- ✅ Maintain scientific accuracy
- ✅ Verify compliance requirements
- ✅ Have no placeholders or TODOs

## Pre-Commit Checklist

Before committing changes:

1. ✅ Run all integration tests
2. ✅ Verify all tests pass
3. ✅ Check performance benchmarks
4. ✅ Review any new warnings
5. ✅ Update test documentation if needed

## CI/CD Integration

### GitHub Actions Example:
```yaml
- name: Run Integration Tests
  run: npm test -- --testPathPattern="validation/__tests__" --ci --coverage

- name: Check Performance Benchmarks
  run: npm test -- PerformanceTests.test.js --ci

- name: Verify Compliance
  run: npm test -- ComplianceTests.test.js --ci
```

## Test Output Interpretation

### Successful Run:
```
PASS  src/utils/validation/__tests__/ValidationIntegration.test.js
PASS  src/utils/validation/__tests__/EndToEndWorkflows.test.js
PASS  src/utils/validation/__tests__/ComplianceTests.test.js
PASS  src/utils/validation/__tests__/PerformanceTests.test.js

Test Suites: 4 passed, 4 total
Tests:       143 passed, 143 total
Snapshots:   0 total
Time:        60.123 s
```

### Failed Run:
Review the specific test that failed and:
1. Check error message
2. Review recent code changes
3. Verify scientific accuracy
4. Check compliance requirements
5. Investigate performance regression

## Quick Links

- **Full Documentation**: [INTEGRATION_TESTS_README.md](./INTEGRATION_TESTS_README.md)
- **Validation System**: `src/utils/validation/`
- **Test Files**: `src/utils/validation/__tests__/`

## Support

For issues or questions:
1. Review test documentation
2. Check validation system docs
3. Examine test comments
4. Review compliance standards

---

**Last Updated**: 2025-10-09
**Version**: 1.0.0
**Status**: Production Ready
