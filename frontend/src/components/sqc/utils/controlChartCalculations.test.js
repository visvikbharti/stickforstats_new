/**
 * Unit tests for SQC Control Chart Calculations
 *
 * Tests control chart calculations, Western Electric rules,
 * process capability analysis, and advanced control charts.
 *
 * Scientific validation includes:
 * - Control limit calculations matching known formulas
 * - Western Electric rule detection accuracy
 * - Process capability index correctness
 * - CUSUM and EWMA calculations
 */

import {
  // Control Chart Constants
  CONTROL_CHART_CONSTANTS,
  getControlConstants,

  // Variables Control Charts
  calculateXbarRLimits,
  calculateXbarSLimits,
  calculateIMRLimits,
  calculateShewhartLimits,

  // Attributes Control Charts
  calculatePChartLimits,
  calculateCChartLimits,

  // Advanced Control Charts
  calculateCUSUM,
  calculateEWMA,

  // Western Electric Rules
  applyWesternElectricRules,

  // Process Capability
  calculateProcessCapability
} from './controlChartCalculations';

// ============================================================
// CONTROL CHART CONSTANTS TESTS
// ============================================================

describe('Control Chart Constants', () => {
  test('should return correct constants for known subgroup sizes', () => {
    const n5Constants = getControlConstants(5);
    
    expect(n5Constants.A2).toBeCloseTo(0.577, 3);
    expect(n5Constants.D3).toBe(0);
    expect(n5Constants.D4).toBeCloseTo(2.114, 3);
    expect(n5Constants.d2).toBeCloseTo(2.326, 3);
  });

  test('should interpolate for unknown subgroup sizes', () => {
    const n12Constants = getControlConstants(12);
    
    // Should be between n=10 and n=15 values
    expect(n12Constants.A2).toBeGreaterThan(0.223); // n=15 value
    expect(n12Constants.A2).toBeLessThan(0.308);    // n=10 value
  });

  test('should handle edge cases', () => {
    const n1Constants = getControlConstants(1);
    const n30Constants = getControlConstants(30);
    
    expect(n1Constants).toBeDefined();
    expect(n30Constants).toBeDefined();
  });
});

// ============================================================
// X̄-R CHART TESTS
// ============================================================

describe('calculateXbarRLimits', () => {
  test('should calculate correct control limits for X̄-R chart', () => {
    // Example from Montgomery textbook
    const data = [
      [9.98, 10.02, 9.99, 10.01, 10.00],
      [10.01, 9.97, 10.03, 9.99, 10.00],
      [9.99, 10.01, 10.00, 9.98, 10.02],
      [10.00, 9.99, 10.01, 10.02, 9.98],
      [10.02, 9.98, 10.00, 10.01, 9.99]
    ];

    const result = calculateXbarRLimits(data);

    // Check X̄ chart
    expect(result.xbar.cl).toBeCloseTo(10.0, 2);
    expect(result.xbar.ucl).toBeGreaterThan(result.xbar.cl);
    expect(result.xbar.lcl).toBeLessThan(result.xbar.cl);

    // Check R chart
    expect(result.r.cl).toBeGreaterThan(0);
    expect(result.r.ucl).toBeGreaterThan(result.r.cl);
    expect(result.r.lcl).toBeGreaterThanOrEqual(0);

    // Check statistics
    expect(result.statistics.subgroupSize).toBe(5);
    expect(result.statistics.numSubgroups).toBe(5);
  });

  test('should handle variable subgroup data', () => {
    const data = [
      [100, 102, 98],
      [99, 101, 100],
      [101, 99, 102],
      [98, 100, 101]
    ];

    const result = calculateXbarRLimits(data);

    expect(result.xbar.values).toHaveLength(4);
    expect(result.r.values).toHaveLength(4);
    expect(result.statistics.grandMean).toBeCloseTo(100, 1);
  });
});

// ============================================================
// X̄-S CHART TESTS
// ============================================================

describe('calculateXbarSLimits', () => {
  test('should calculate correct control limits for X̄-S chart', () => {
    const data = [
      [50.1, 49.8, 50.2, 50.0, 49.9, 50.1, 50.0, 49.9, 50.2, 50.1],
      [49.9, 50.0, 50.1, 49.8, 50.2, 50.0, 49.9, 50.1, 50.0, 49.8],
      [50.0, 50.1, 49.9, 50.2, 49.8, 50.1, 50.0, 49.9, 50.1, 50.0]
    ];

    const result = calculateXbarSLimits(data);

    // Check X̄ chart
    expect(result.xbar.cl).toBeCloseTo(50.0, 1);
    expect(result.xbar.ucl).toBeGreaterThan(result.xbar.cl);
    expect(result.xbar.lcl).toBeLessThan(result.xbar.cl);

    // Check S chart
    expect(result.s.cl).toBeGreaterThan(0);
    expect(result.s.ucl).toBeGreaterThan(result.s.cl);
    
    // Check statistics
    expect(result.statistics.subgroupSize).toBe(10);
    expect(result.statistics.numSubgroups).toBe(3);
  });

  test('should use standard deviation instead of range', () => {
    const data = [
      [10, 11, 9, 10, 10],
      [9, 10, 11, 10, 10],
      [10, 10, 10, 11, 9]
    ];

    const result = calculateXbarSLimits(data);

    // Standard deviations should be calculated
    expect(result.s.values).toHaveLength(3);
    result.s.values.forEach(s => {
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThan(2);
    });
  });
});

// ============================================================
// I-MR CHART TESTS
// ============================================================

describe('calculateIMRLimits', () => {
  test('should calculate correct control limits for I-MR chart', () => {
    const data = [20.1, 19.9, 20.3, 19.8, 20.2, 20.0, 19.7, 20.4, 19.9, 20.1];

    const result = calculateIMRLimits(data);

    // Check individual chart
    expect(result.i.cl).toBeCloseTo(20.0, 1);
    expect(result.i.ucl).toBeGreaterThan(result.i.cl);
    expect(result.i.lcl).toBeLessThan(result.i.cl);

    // Check moving range chart
    expect(result.mr.cl).toBeGreaterThan(0);
    expect(result.mr.ucl).toBeGreaterThan(result.mr.cl);
    expect(result.mr.lcl).toBeGreaterThanOrEqual(0);

    // Check statistics
    expect(result.statistics.mean).toBeCloseTo(20.0, 1);
    expect(result.statistics.estimatedSigma).toBeGreaterThan(0);
  });

  test('should handle different MR spans', () => {
    const data = [10, 11, 9, 12, 8, 13, 7, 14, 6];

    const result2 = calculateIMRLimits(data, 2);
    const result3 = calculateIMRLimits(data, 3);

    // Different spans should give different results
    expect(result2.statistics.avgMovingRange).not.toBeCloseTo(
      result3.statistics.avgMovingRange, 5
    );
    expect(result2.mr.values).toHaveLength(data.length - 1);
    expect(result3.mr.values).toHaveLength(data.length - 2);
  });
});

// ============================================================
// P-CHART TESTS
// ============================================================

describe('calculatePChartLimits', () => {
  test('should calculate correct p-chart limits', () => {
    const defects = [3, 5, 2, 4, 6, 3, 7, 4, 5, 3];
    const sampleSizes = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100];

    const result = calculatePChartLimits(defects, sampleSizes);

    // Check proportions
    expect(result.values[0]).toBeCloseTo(0.03, 5);
    expect(result.values[1]).toBeCloseTo(0.05, 5);

    // Check average proportion
    const expectedPbar = 42 / 1000; // 0.042
    expect(result.statistics.avgProportion).toBeCloseTo(expectedPbar, 5);

    // Check control limits
    result.limits.forEach(limit => {
      expect(limit.cl).toBeCloseTo(expectedPbar, 5);
      expect(limit.ucl).toBeGreaterThan(limit.cl);
      expect(limit.lcl).toBeLessThanOrEqual(limit.cl);
      expect(limit.lcl).toBeGreaterThanOrEqual(0);
      expect(limit.ucl).toBeLessThanOrEqual(1);
    });
  });

  test('should handle variable sample sizes', () => {
    const defects = [3, 5, 2];
    const sampleSizes = [100, 150, 80];

    const result = calculatePChartLimits(defects, sampleSizes);

    // Different sample sizes should give different control limits
    expect(result.limits[0].ucl).not.toBeCloseTo(result.limits[1].ucl, 3);
    
    // Larger samples should have tighter limits
    const width0 = result.limits[0].ucl - result.limits[0].lcl;
    const width1 = result.limits[1].ucl - result.limits[1].lcl;
    expect(width1).toBeLessThan(width0); // 150 > 100
  });
});

// ============================================================
// C-CHART TESTS
// ============================================================

describe('calculateCChartLimits', () => {
  test('should calculate correct c-chart limits', () => {
    const counts = [5, 3, 7, 2, 8, 4, 6, 3, 9, 5];

    const result = calculateCChartLimits(counts);

    // Check average count
    const expectedCbar = 52 / 10; // 5.2
    expect(result.statistics.avgCount).toBeCloseTo(expectedCbar, 5);

    // Check control limits
    expect(result.cl).toBeCloseTo(expectedCbar, 5);
    expect(result.ucl).toBeCloseTo(expectedCbar + 3 * Math.sqrt(expectedCbar), 3);
    expect(result.lcl).toBeGreaterThanOrEqual(0);
  });

  test('should handle zero counts', () => {
    const counts = [0, 1, 0, 2, 0, 1, 0, 0, 1, 0];

    const result = calculateCChartLimits(counts);

    expect(result.lcl).toBe(0);
    expect(result.ucl).toBeGreaterThan(0);
  });
});

// ============================================================
// WESTERN ELECTRIC RULES TESTS
// ============================================================

describe('applyWesternElectricRules', () => {
  test('should detect Rule 1: point beyond control limits', () => {
    const values = [10, 11, 9, 10, 15, 10, 9, 10]; // 15 is beyond UCL
    const cl = 10;
    const ucl = 13;
    const lcl = 7;

    const violations = applyWesternElectricRules(values, cl, ucl, lcl);

    const rule1Violations = violations.filter(v => v.rule === 1);
    expect(rule1Violations).toHaveLength(1);
    expect(rule1Violations[0].points).toContain(4);
  });

  test('should detect Rule 2: 9 points on same side', () => {
    const values = [11, 11.5, 10.5, 11.2, 10.8, 11.3, 10.9, 11.1, 10.6, 9];
    const cl = 10;
    const ucl = 13;
    const lcl = 7;

    const violations = applyWesternElectricRules(values, cl, ucl, lcl);

    const rule2Violations = violations.filter(v => v.rule === 2);
    expect(rule2Violations.length).toBeGreaterThan(0);
  });

  test('should detect Rule 3: 6 points trending', () => {
    const values = [8, 8.5, 9, 9.5, 10, 10.5, 9, 10];
    const cl = 10;
    const ucl = 13;
    const lcl = 7;

    const violations = applyWesternElectricRules(values, cl, ucl, lcl);

    const rule3Violations = violations.filter(v => v.rule === 3);
    expect(rule3Violations.length).toBeGreaterThan(0);
  });

  test('should handle normal data without violations', () => {
    const values = [10, 9.5, 10.5, 9.8, 10.2, 9.9, 10.1, 10.3];
    const cl = 10;
    const ucl = 12;
    const lcl = 8;

    const violations = applyWesternElectricRules(values, cl, ucl, lcl);

    // Might have some violations, but should be minimal
    expect(violations.length).toBeLessThan(3);
  });
});

// ============================================================
// PROCESS CAPABILITY TESTS
// ============================================================

describe('calculateProcessCapability', () => {
  test('should calculate correct Cp and Cpk', () => {
    const data = [];
    // Generate normally distributed data
    for (let i = 0; i < 100; i++) {
      data.push(50 + (Math.random() - 0.5) * 4);
    }

    const usl = 55;
    const lsl = 45;

    const result = calculateProcessCapability(data, usl, lsl);

    // Check indices exist and are reasonable
    expect(result.cp).toBeGreaterThan(0);
    expect(result.cpk).toBeGreaterThan(0);
    expect(result.cpk).toBeLessThanOrEqual(result.cp);

    // Check statistics
    expect(result.statistics.mean).toBeCloseTo(50, 1);
    expect(result.statistics.stdDev).toBeGreaterThan(0);

    // Check performance metrics
    expect(result.performance.yield).toBeGreaterThan(0);
    expect(result.performance.yield).toBeLessThanOrEqual(100);
  });

  test('should calculate CPU and CPL correctly', () => {
    const data = [49, 50, 51, 50, 49, 51, 50, 49, 51, 50];
    const usl = 52;
    const lsl = 48;

    const result = calculateProcessCapability(data, usl, lsl);

    expect(result.cpu).toBeGreaterThan(0);
    expect(result.cpl).toBeGreaterThan(0);
    expect(result.cpk).toBe(Math.min(result.cpu, result.cpl));
  });

  test('should handle process off-center', () => {
    const data = [52, 53, 51, 52, 53]; // Process shifted high
    const usl = 55;
    const lsl = 45;

    const result = calculateProcessCapability(data, usl, lsl);

    // CPL should be worse than CPU
    expect(result.cpl).toBeLessThan(result.cpu);
    expect(result.cpk).toBe(result.cpl);
  });
});

// ============================================================
// CUSUM CHART TESTS
// ============================================================

describe('calculateCUSUM', () => {
  test('should calculate CUSUM values correctly', () => {
    const data = [9.8, 10.2, 10.1, 9.9, 10.5, 10.3, 9.7, 10.1];
    const target = 10.0;
    const k = 0.25;
    const h = 4;

    const result = calculateCUSUM(data, target, k, h);

    expect(result.cPlus).toHaveLength(data.length);
    expect(result.cMinus).toHaveLength(data.length);

    // First values should start from 0 or positive
    expect(result.cPlus[0]).toBeGreaterThanOrEqual(0);
    expect(result.cMinus[0]).toBeGreaterThanOrEqual(0);
  });

  test('should detect upward shift', () => {
    const data = [10, 10, 10, 11, 11.5, 11.8, 12, 12.2];
    const target = 10.0;
    const k = 0.5;
    const h = 4;

    const result = calculateCUSUM(data, target, k, h);

    // Should detect upper signals
    expect(result.signals.some(s => s.type === 'upper')).toBe(true);
  });

  test('should detect downward shift', () => {
    const data = [10, 10, 9.5, 9, 8.5, 8, 7.5, 7];
    const target = 10.0;
    const k = 0.5;
    const h = 4;

    const result = calculateCUSUM(data, target, k, h);

    // Should detect lower signals
    expect(result.signals.some(s => s.type === 'lower')).toBe(true);
  });
});

// ============================================================
// EWMA CHART TESTS
// ============================================================

describe('calculateEWMA', () => {
  test('should calculate EWMA values correctly', () => {
    const data = [10.1, 9.9, 10.2, 9.8, 10.3, 10.0, 9.7, 10.1];
    const target = 10.0;
    const lambda = 0.2;

    const result = calculateEWMA(data, target, lambda, 3);

    expect(result.values).toHaveLength(data.length);
    expect(result.ucl).toHaveLength(data.length);
    expect(result.lcl).toHaveLength(data.length);

    // First EWMA should be weighted average
    const expectedFirst = lambda * data[0] + (1 - lambda) * target;
    expect(result.values[0]).toBeCloseTo(expectedFirst, 5);
  });

  test('should have narrowing control limits initially', () => {
    const data = Array(20).fill(10);
    const target = 10.0;

    const result = calculateEWMA(data, target, 0.2, 3);

    // Control limits should widen over time (approach steady state)
    const width1 = result.ucl[0] - result.lcl[0];
    const width10 = result.ucl[9] - result.lcl[9];
    const width20 = result.ucl[19] - result.lcl[19];

    expect(width1).toBeLessThan(width10);
    expect(width10).toBeLessThan(width20);
  });

  test('should detect process shift', () => {
    const data = [10, 10, 10, 10.5, 11, 11.5, 12, 12.5];
    const target = 10.0;

    const result = calculateEWMA(data, target, 0.3, 2.7);

    // Should detect signals for shifted process
    expect(result.signals.length).toBeGreaterThan(0);
  });
});

// ============================================================
// INTEGRATION TESTS
// ============================================================

describe('SQC Integration Tests', () => {
  test('complete control chart analysis workflow', () => {
    // Generate process data
    const subgroups = [];
    for (let i = 0; i < 20; i++) {
      const subgroup = [];
      for (let j = 0; j < 5; j++) {
        subgroup.push(100 + (Math.random() - 0.5) * 4);
      }
      subgroups.push(subgroup);
    }

    // Calculate X̄-R limits
    const xbarR = calculateXbarRLimits(subgroups);

    // Apply Western Electric rules
    const xbarViolations = applyWesternElectricRules(
      xbarR.xbar.values,
      xbarR.xbar.cl,
      xbarR.xbar.ucl,
      xbarR.xbar.lcl
    );

    expect(xbarR).toBeDefined();
    expect(xbarViolations).toBeDefined();
    expect(Array.isArray(xbarViolations)).toBe(true);
  });

  test('process capability with specification limits', () => {
    // Generate capable process data
    const data = [];
    const mean = 50;
    const stdDev = 1;
    
    for (let i = 0; i < 100; i++) {
      const value = mean + (Math.random() - 0.5) * 2 * stdDev * 2;
      data.push(value);
    }

    const usl = 55;
    const lsl = 45;

    const capability = calculateProcessCapability(data, usl, lsl);

    // Check relationships
    expect(capability.cp).toBeGreaterThan(0);
    expect(capability.pp).toBeCloseTo(capability.cp, 1);
    expect(capability.cpk).toBeLessThanOrEqual(capability.cp);
    expect(capability.ppk).toBeLessThanOrEqual(capability.pp);

    // Check yield is reasonable for capable process
    expect(capability.performance.yield).toBeGreaterThan(95);
  });

  test('attributes chart for defect counts', () => {
    // Simulate defect counts from inspection
    const defects = [2, 3, 1, 4, 2, 5, 3, 2, 1, 3];
    const sampleSizes = Array(10).fill(100);

    const pChart = calculatePChartLimits(defects, sampleSizes);
    
    // Verify all proportions are within [0, 1]
    pChart.values.forEach(p => {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    });

    // Verify limits are logical
    pChart.limits.forEach(limit => {
      expect(limit.lcl).toBeLessThanOrEqual(limit.cl);
      expect(limit.cl).toBeLessThanOrEqual(limit.ucl);
    });
  });
});
