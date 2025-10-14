/**
 * Probability Distributions - Test Suite
 *
 * Comprehensive tests for PMF, PDF, CDF, and random sample generation.
 * Validates correctness against known analytical solutions and statistical properties.
 *
 * Test Coverage:
 * - Helper functions (logFactorial, erf, Box-Muller)
 * - PMF/PDF calculations (Normal, Binomial, Poisson, Exponential)
 * - CDF calculations
 * - Random sample generation
 * - Edge cases and numerical stability
 */

import {
  logFactorial,
  erf,
  boxMuller,
  normalPdf,
  binomialPmf,
  poissonPmf,
  exponentialPdf,
  calculatePmfPdf,
  normalCdf,
  exponentialCdf,
  calculateCdf,
  generateNormalSample,
  generateBinomialSample,
  generatePoissonSample,
  generateExponentialSample,
  generateRandomSample,
  getDistributionMean,
  getDistributionVariance
} from './distributions';

// ============================================================
// HELPER FUNCTIONS TESTS
// ============================================================

describe('logFactorial', () => {
  test('should return 0 for 0! and 1!', () => {
    expect(logFactorial(0)).toBe(0);
    expect(logFactorial(1)).toBe(0);
  });

  test('should calculate log(5!) correctly', () => {
    // 5! = 120, log(120) ≈ 4.787
    expect(logFactorial(5)).toBeCloseTo(Math.log(120), 10);
  });

  test('should calculate log(10!) correctly', () => {
    // 10! = 3,628,800
    expect(logFactorial(10)).toBeCloseTo(Math.log(3628800), 10);
  });

  test('should handle large factorials without overflow', () => {
    // 170! would overflow, but log(170!) is ~706.57
    const result = logFactorial(170);
    expect(result).toBeGreaterThan(700);
    expect(result).toBeLessThan(710);
    expect(Number.isFinite(result)).toBe(true);
  });

  test('should return NaN for negative numbers', () => {
    expect(logFactorial(-1)).toBeNaN();
  });
});

describe('erf (Error Function)', () => {
  test('erf(0) should equal 0', () => {
    expect(erf(0)).toBeCloseTo(0, 7);
  });

  test('erf should be odd function: erf(-x) = -erf(x)', () => {
    expect(erf(-1)).toBeCloseTo(-erf(1), 7);
    expect(erf(-2)).toBeCloseTo(-erf(2), 7);
  });

  test('erf(1) should be approximately 0.8427', () => {
    expect(erf(1)).toBeCloseTo(0.8427007929, 6);
  });

  test('erf(∞) should approach 1', () => {
    expect(erf(5)).toBeCloseTo(1, 6);
    expect(erf(10)).toBeCloseTo(1, 6);
  });

  test('erf(-∞) should approach -1', () => {
    expect(erf(-5)).toBeCloseTo(-1, 6);
  });
});

describe('boxMuller (Box-Muller Transform)', () => {
  test('should return two values z1 and z2', () => {
    const { z1, z2 } = boxMuller();
    expect(typeof z1).toBe('number');
    expect(typeof z2).toBe('number');
    expect(Number.isFinite(z1)).toBe(true);
    expect(Number.isFinite(z2)).toBe(true);
  });

  test('should generate samples with approximately mean 0 and variance 1', () => {
    const samples = [];
    const n = 10000;

    for (let i = 0; i < n / 2; i++) {
      const { z1, z2 } = boxMuller();
      samples.push(z1, z2);
    }

    const mean = samples.reduce((a, b) => a + b, 0) / n;
    const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);

    // Mean should be close to 0 (within 0.05)
    expect(Math.abs(mean)).toBeLessThan(0.05);

    // Variance should be close to 1 (within 0.1)
    expect(Math.abs(variance - 1)).toBeLessThan(0.1);
  });
});

// ============================================================
// NORMAL DISTRIBUTION TESTS
// ============================================================

describe('normalPdf', () => {
  test('standard normal at x=0 should equal 1/√(2π)', () => {
    const expected = 1 / Math.sqrt(2 * Math.PI);
    expect(normalPdf(0, 0, 1)).toBeCloseTo(expected, 10);
  });

  test('standard normal should be symmetric', () => {
    expect(normalPdf(1, 0, 1)).toBeCloseTo(normalPdf(-1, 0, 1), 10);
    expect(normalPdf(2, 0, 1)).toBeCloseTo(normalPdf(-2, 0, 1), 10);
  });

  test('should integrate to approximately 1 (numerical check)', () => {
    // Riemann sum approximation
    let sum = 0;
    const dx = 0.01;
    for (let x = -5; x <= 5; x += dx) {
      sum += normalPdf(x, 0, 1) * dx;
    }
    expect(sum).toBeCloseTo(1, 2);
  });

  test('should handle non-standard normal', () => {
    // N(5, 2): max at x=5
    const pdfAt5 = normalPdf(5, 5, 2);
    const pdfAt6 = normalPdf(6, 5, 2);
    expect(pdfAt5).toBeGreaterThan(pdfAt6);
  });

  test('should return NaN for invalid std', () => {
    expect(normalPdf(0, 0, 0)).toBeNaN();
    expect(normalPdf(0, 0, -1)).toBeNaN();
  });
});

describe('normalCdf', () => {
  test('Φ(0) should equal 0.5 for standard normal', () => {
    expect(normalCdf(0, 0, 1)).toBeCloseTo(0.5, 7);
  });

  test('should be monotonically increasing', () => {
    expect(normalCdf(-1, 0, 1)).toBeLessThan(normalCdf(0, 0, 1));
    expect(normalCdf(0, 0, 1)).toBeLessThan(normalCdf(1, 0, 1));
  });

  test('Φ(1.96) ≈ 0.975 (important for 95% CI)', () => {
    expect(normalCdf(1.96, 0, 1)).toBeCloseTo(0.975, 3);
  });

  test('Φ(-1.96) ≈ 0.025', () => {
    expect(normalCdf(-1.96, 0, 1)).toBeCloseTo(0.025, 3);
  });

  test('should approach 0 and 1 at extremes', () => {
    expect(normalCdf(-5, 0, 1)).toBeCloseTo(0, 5);
    expect(normalCdf(5, 0, 1)).toBeCloseTo(1, 5);
  });
});

// ============================================================
// BINOMIAL DISTRIBUTION TESTS
// ============================================================

describe('binomialPmf', () => {
  test('P(X=5 | n=10, p=0.5) should equal C(10,5) * 0.5^10', () => {
    // C(10,5) = 252, 0.5^10 = 1/1024
    // Expected: 252/1024 ≈ 0.2461
    expect(binomialPmf(5, 10, 0.5)).toBeCloseTo(0.24609375, 8);
  });

  test('should return 0 for k > n', () => {
    expect(binomialPmf(15, 10, 0.5)).toBe(0);
  });

  test('should return 0 for k < 0', () => {
    expect(binomialPmf(-1, 10, 0.5)).toBe(0);
  });

  test('edge case: p=0, k=0 should return 1', () => {
    expect(binomialPmf(0, 10, 0)).toBe(1);
  });

  test('edge case: p=0, k>0 should return 0', () => {
    expect(binomialPmf(1, 10, 0)).toBe(0);
  });

  test('edge case: p=1, k=n should return 1', () => {
    expect(binomialPmf(10, 10, 1)).toBe(1);
  });

  test('edge case: p=1, k<n should return 0', () => {
    expect(binomialPmf(9, 10, 1)).toBe(0);
  });

  test('should handle large n without overflow', () => {
    // n=100, k=50, p=0.5
    const result = binomialPmf(50, 100, 0.5);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(0.1);
    expect(Number.isFinite(result)).toBe(true);
  });

  test('PMF should sum to approximately 1', () => {
    const n = 10;
    const p = 0.3;
    let sum = 0;
    for (let k = 0; k <= n; k++) {
      sum += binomialPmf(k, n, p);
    }
    expect(sum).toBeCloseTo(1, 8);
  });
});

// ============================================================
// POISSON DISTRIBUTION TESTS
// ============================================================

describe('poissonPmf', () => {
  test('P(X=0 | λ=1) should equal e^(-1)', () => {
    expect(poissonPmf(0, 1)).toBeCloseTo(Math.exp(-1), 10);
  });

  test('P(X=3 | λ=5) should equal (5^3 * e^(-5)) / 3!', () => {
    const expected = (Math.pow(5, 3) * Math.exp(-5)) / 6;
    expect(poissonPmf(3, 5)).toBeCloseTo(expected, 10);
  });

  test('should return 0 for k < 0', () => {
    expect(poissonPmf(-1, 5)).toBe(0);
  });

  test('edge case: λ=0, k=0 should return 1', () => {
    expect(poissonPmf(0, 0)).toBe(1);
  });

  test('edge case: λ=0, k>0 should return 0', () => {
    expect(poissonPmf(1, 0)).toBe(0);
  });

  test('should handle large λ without overflow', () => {
    const result = poissonPmf(50, 50);
    expect(result).toBeGreaterThan(0);
    expect(Number.isFinite(result)).toBe(true);
  });

  test('PMF should sum to approximately 1 (up to reasonable k)', () => {
    const lambda = 3;
    let sum = 0;
    // Sum up to k=20 (covers >99.99% of probability)
    for (let k = 0; k <= 20; k++) {
      sum += poissonPmf(k, lambda);
    }
    expect(sum).toBeCloseTo(1, 4);
  });

  test('mean should equal λ (verified via samples)', () => {
    const lambda = 5;
    const n = 20;
    let sum = 0;
    for (let k = 0; k <= n; k++) {
      sum += k * poissonPmf(k, lambda);
    }
    expect(sum).toBeCloseTo(lambda, 1);
  });
});

// ============================================================
// EXPONENTIAL DISTRIBUTION TESTS
// ============================================================

describe('exponentialPdf', () => {
  test('f(0 | λ=1) should equal λ', () => {
    expect(exponentialPdf(0, 1)).toBe(1);
    expect(exponentialPdf(0, 2)).toBe(2);
  });

  test('f(x) should equal λ * e^(-λx)', () => {
    const x = 2;
    const lambda = 3;
    const expected = lambda * Math.exp(-lambda * x);
    expect(exponentialPdf(x, lambda)).toBeCloseTo(expected, 10);
  });

  test('should return 0 for x < 0', () => {
    expect(exponentialPdf(-1, 1)).toBe(0);
  });

  test('should return 0 for invalid rate', () => {
    expect(exponentialPdf(1, 0)).toBe(0);
    expect(exponentialPdf(1, -1)).toBe(0);
  });

  test('should integrate to approximately 1', () => {
    const lambda = 1;
    let sum = 0;
    const dx = 0.01;
    for (let x = 0; x <= 10; x += dx) {
      sum += exponentialPdf(x, lambda) * dx;
    }
    expect(sum).toBeCloseTo(1, 2);
  });
});

describe('exponentialCdf', () => {
  test('F(0) should equal 0', () => {
    expect(exponentialCdf(0, 1)).toBe(0);
  });

  test('F(x) should equal 1 - e^(-λx)', () => {
    const x = 2;
    const lambda = 1.5;
    const expected = 1 - Math.exp(-lambda * x);
    expect(exponentialCdf(x, lambda)).toBeCloseTo(expected, 10);
  });

  test('should approach 1 as x → ∞', () => {
    expect(exponentialCdf(10, 1)).toBeCloseTo(1, 4);
  });

  test('median should occur at x = ln(2)/λ', () => {
    const lambda = 2;
    const median = Math.log(2) / lambda;
    expect(exponentialCdf(median, lambda)).toBeCloseTo(0.5, 10);
  });
});

// ============================================================
// GENERIC PMF/PDF INTERFACE TESTS
// ============================================================

describe('calculatePmfPdf', () => {
  test('should handle NORMAL distribution', () => {
    const result = calculatePmfPdf('NORMAL', { mean: 0, std: 1 }, [0, 1, 2]);
    expect(result.x_values).toEqual([0, 1, 2]);
    expect(result.pmf_pdf_values).toHaveLength(3);
    expect(result.pmf_pdf_values[0]).toBeCloseTo(normalPdf(0, 0, 1), 10);
  });

  test('should handle BINOMIAL distribution', () => {
    const result = calculatePmfPdf('BINOMIAL', { n: 10, p: 0.5 }, [0, 5, 10]);
    expect(result.pmf_pdf_values[1]).toBeCloseTo(binomialPmf(5, 10, 0.5), 10);
  });

  test('should handle POISSON distribution', () => {
    const result = calculatePmfPdf('POISSON', { lambda: 3 }, [0, 3, 6]);
    expect(result.pmf_pdf_values[1]).toBeCloseTo(poissonPmf(3, 3), 10);
  });

  test('should handle EXPONENTIAL distribution', () => {
    const result = calculatePmfPdf('EXPONENTIAL', { rate: 2 }, [0, 1, 2]);
    expect(result.pmf_pdf_values[1]).toBeCloseTo(exponentialPdf(1, 2), 10);
  });

  test('should return zeros for unknown distribution', () => {
    const result = calculatePmfPdf('UNKNOWN', {}, [0, 1, 2]);
    expect(result.pmf_pdf_values).toEqual([0, 0, 0]);
  });
});

// ============================================================
// GENERIC CDF INTERFACE TESTS
// ============================================================

describe('calculateCdf', () => {
  test('should handle NORMAL distribution', () => {
    const result = calculateCdf('NORMAL', { mean: 0, std: 1 }, [-1, 0, 1]);
    expect(result.cdf_values[1]).toBeCloseTo(0.5, 7);
  });

  test('should handle EXPONENTIAL distribution', () => {
    const result = calculateCdf('EXPONENTIAL', { rate: 1 }, [0, 1, 2]);
    expect(result.cdf_values[0]).toBe(0);
    expect(result.cdf_values[1]).toBeCloseTo(1 - Math.exp(-1), 10);
  });

  test('should handle discrete distributions (cumulative sum)', () => {
    const result = calculateCdf('BINOMIAL', { n: 3, p: 0.5 }, [0, 1, 2, 3]);
    // CDF should be monotonically increasing
    expect(result.cdf_values[0]).toBeLessThan(result.cdf_values[1]);
    expect(result.cdf_values[1]).toBeLessThan(result.cdf_values[2]);
    expect(result.cdf_values[2]).toBeLessThan(result.cdf_values[3]);
    // Final value should be close to 1
    expect(result.cdf_values[3]).toBeCloseTo(1, 8);
  });
});

// ============================================================
// RANDOM SAMPLE GENERATION TESTS
// ============================================================

describe('generateNormalSample', () => {
  test('should generate correct sample size', () => {
    const sample = generateNormalSample(100, 0, 1);
    expect(sample).toHaveLength(100);
  });

  test('should generate sample with approximately correct mean', () => {
    const n = 5000;
    const trueMean = 10;
    const trueStd = 2;
    const sample = generateNormalSample(n, trueMean, trueStd);

    const sampleMean = sample.reduce((a, b) => a + b, 0) / n;

    // Sample mean should be within 0.1 of true mean (with high probability)
    expect(Math.abs(sampleMean - trueMean)).toBeLessThan(0.1);
  });

  test('should generate sample with approximately correct variance', () => {
    const n = 5000;
    const trueMean = 0;
    const trueStd = 3;
    const sample = generateNormalSample(n, trueMean, trueStd);

    const sampleMean = sample.reduce((a, b) => a + b, 0) / n;
    const sampleVar = sample.reduce((a, b) => a + (b - sampleMean) ** 2, 0) / (n - 1);

    // Sample variance should be within 0.5 of true variance
    expect(Math.abs(sampleVar - trueStd * trueStd)).toBeLessThan(0.5);
  });
});

describe('generateBinomialSample', () => {
  test('should generate correct sample size', () => {
    const sample = generateBinomialSample(100, 10, 0.5);
    expect(sample).toHaveLength(100);
  });

  test('all values should be in range [0, n]', () => {
    const sample = generateBinomialSample(100, 10, 0.5);
    sample.forEach(x => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(10);
      expect(Number.isInteger(x)).toBe(true);
    });
  });

  test('sample mean should approximate np', () => {
    const n = 20;
    const p = 0.3;
    const sampleSize = 5000;
    const sample = generateBinomialSample(sampleSize, n, p);

    const sampleMean = sample.reduce((a, b) => a + b, 0) / sampleSize;
    const expectedMean = n * p;

    expect(Math.abs(sampleMean - expectedMean)).toBeLessThan(0.3);
  });
});

describe('generatePoissonSample', () => {
  test('should generate correct sample size', () => {
    const sample = generatePoissonSample(100, 5);
    expect(sample).toHaveLength(100);
  });

  test('all values should be non-negative integers', () => {
    const sample = generatePoissonSample(100, 3);
    sample.forEach(x => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(x)).toBe(true);
    });
  });

  test('sample mean should approximate λ', () => {
    const lambda = 7;
    const sampleSize = 5000;
    const sample = generatePoissonSample(sampleSize, lambda);

    const sampleMean = sample.reduce((a, b) => a + b, 0) / sampleSize;

    expect(Math.abs(sampleMean - lambda)).toBeLessThan(0.3);
  });

  test('should handle large λ (using normal approximation)', () => {
    const lambda = 50;
    const sample = generatePoissonSample(1000, lambda);

    expect(sample).toHaveLength(1000);
    sample.forEach(x => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(x)).toBe(true);
    });
  });
});

describe('generateExponentialSample', () => {
  test('should generate correct sample size', () => {
    const sample = generateExponentialSample(100, 1);
    expect(sample).toHaveLength(100);
  });

  test('all values should be non-negative', () => {
    const sample = generateExponentialSample(100, 2);
    sample.forEach(x => {
      expect(x).toBeGreaterThanOrEqual(0);
    });
  });

  test('sample mean should approximate 1/λ', () => {
    const rate = 2;
    const sampleSize = 5000;
    const sample = generateExponentialSample(sampleSize, rate);

    const sampleMean = sample.reduce((a, b) => a + b, 0) / sampleSize;
    const expectedMean = 1 / rate;

    expect(Math.abs(sampleMean - expectedMean)).toBeLessThan(0.05);
  });
});

// ============================================================
// DISTRIBUTION MOMENTS TESTS
// ============================================================

describe('getDistributionMean', () => {
  test('should return correct mean for NORMAL', () => {
    expect(getDistributionMean('NORMAL', { mean: 5, std: 2 })).toBe(5);
  });

  test('should return correct mean for BINOMIAL', () => {
    expect(getDistributionMean('BINOMIAL', { n: 10, p: 0.3 })).toBe(3);
  });

  test('should return correct mean for POISSON', () => {
    expect(getDistributionMean('POISSON', { lambda: 7 })).toBe(7);
  });

  test('should return correct mean for EXPONENTIAL', () => {
    expect(getDistributionMean('EXPONENTIAL', { rate: 4 })).toBe(0.25);
  });
});

describe('getDistributionVariance', () => {
  test('should return correct variance for NORMAL', () => {
    expect(getDistributionVariance('NORMAL', { mean: 5, std: 3 })).toBe(9);
  });

  test('should return correct variance for BINOMIAL', () => {
    // Var = np(1-p) = 10 * 0.3 * 0.7 = 2.1
    expect(getDistributionVariance('BINOMIAL', { n: 10, p: 0.3 })).toBeCloseTo(2.1, 10);
  });

  test('should return correct variance for POISSON', () => {
    expect(getDistributionVariance('POISSON', { lambda: 5 })).toBe(5);
  });

  test('should return correct variance for EXPONENTIAL', () => {
    // Var = 1/λ² = 1/4 = 0.25
    expect(getDistributionVariance('EXPONENTIAL', { rate: 2 })).toBe(0.25);
  });
});
