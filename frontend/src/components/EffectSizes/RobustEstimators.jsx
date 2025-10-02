import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './RobustEstimators.scss';

const EstimatorTypes = {
  LOCATION: {
    id: 'location',
    name: 'Location Estimators',
    description: 'Robust measures of central tendency',
    methods: {
      trimmed_mean: {
        name: 'Trimmed Mean',
        description: 'Mean after removing extreme values',
        parameters: ['trim_percent'],
        formula: 'x̄_trim = mean(x[k+1:n-k])'
      },
      winsorized_mean: {
        name: 'Winsorized Mean',
        description: 'Mean after replacing extreme values',
        parameters: ['winsor_percent'],
        formula: 'x̄_wins = mean(x_winsorized)'
      },
      median: {
        name: 'Median',
        description: 'Middle value, 50% breakdown point',
        parameters: [],
        formula: 'M = x[(n+1)/2]'
      },
      hodges_lehmann: {
        name: 'Hodges-Lehmann',
        description: 'Median of pairwise averages',
        parameters: [],
        formula: 'HL = median{(xi + xj)/2}'
      },
      huber_m: {
        name: 'Huber M-estimator',
        description: 'Minimizes Huber loss function',
        parameters: ['k'],
        formula: 'ψ(x) = x if |x|≤k, k·sign(x) otherwise'
      },
      tukey_biweight: {
        name: 'Tukey Biweight',
        description: 'Redescending M-estimator',
        parameters: ['c'],
        formula: 'ψ(x) = x(1-(x/c)²)² if |x|≤c, 0 otherwise'
      },
      hampel: {
        name: 'Hampel M-estimator',
        description: 'Three-part redescending',
        parameters: ['a', 'b', 'c'],
        formula: 'Three-part piecewise function'
      }
    }
  },
  SCALE: {
    id: 'scale',
    name: 'Scale Estimators',
    description: 'Robust measures of spread',
    methods: {
      mad: {
        name: 'MAD',
        description: 'Median Absolute Deviation',
        parameters: ['scale_factor'],
        formula: 'MAD = b · median(|xi - median(x)|)'
      },
      iqr: {
        name: 'IQR',
        description: 'Interquartile Range',
        parameters: [],
        formula: 'IQR = Q3 - Q1'
      },
      sn: {
        name: 'Sn Estimator',
        description: 'Rousseeuw & Croux Sn',
        parameters: [],
        formula: 'Sn = c · median{median|xi - xj|}'
      },
      qn: {
        name: 'Qn Estimator',
        description: 'Rousseeuw & Croux Qn',
        parameters: [],
        formula: 'Qn = d · {|xi - xj|; i<j}(k)'
      },
      biweight_midvariance: {
        name: 'Biweight Midvariance',
        description: 'Tukey biweight scale',
        parameters: ['c'],
        formula: 'BWMV = n·Σ[a_i²(xi-M)²]/[Σa_i]²'
      },
      percentage_bend: {
        name: 'Percentage Bend',
        description: 'Wilcox percentage bend',
        parameters: ['beta'],
        formula: 'pb-midvariance'
      }
    }
  },
  CORRELATION: {
    id: 'correlation',
    name: 'Robust Correlation',
    description: 'Correlation resistant to outliers',
    methods: {
      spearman: {
        name: 'Spearman ρ',
        description: 'Rank correlation',
        parameters: [],
        formula: 'ρ = 1 - 6Σd²/[n(n²-1)]'
      },
      kendall: {
        name: 'Kendall τ',
        description: 'Concordance correlation',
        parameters: [],
        formula: 'τ = (C - D)/[n(n-1)/2]'
      },
      percentage_bend: {
        name: 'Percentage Bend',
        description: 'Wilcox robust correlation',
        parameters: ['beta'],
        formula: 'rpb = Σ(ψ(xi)ψ(yi))/√[Σψ²(xi)Σψ²(yi)]'
      },
      biweight_midcorrelation: {
        name: 'Biweight Midcorrelation',
        description: 'Based on biweight M-estimator',
        parameters: ['c'],
        formula: 'rbwm = Σ[wi·xi·yi]/√[Σwi·xi²·Σwi·yi²]'
      },
      winsorized: {
        name: 'Winsorized Correlation',
        description: 'Correlation of winsorized data',
        parameters: ['gamma'],
        formula: 'rw = cor(Xw, Yw)'
      },
      mcd: {
        name: 'MCD Correlation',
        description: 'Minimum Covariance Determinant',
        parameters: ['h'],
        formula: 'Based on MCD covariance'
      }
    }
  },
  REGRESSION: {
    id: 'regression',
    name: 'Robust Regression',
    description: 'Regression resistant to outliers',
    methods: {
      huber: {
        name: 'Huber Regression',
        description: 'M-estimator for regression',
        parameters: ['k'],
        formula: 'min Σρ(yi - xiᵀβ)'
      },
      tukey: {
        name: 'Tukey Bisquare',
        description: 'Redescending M-estimator',
        parameters: ['c'],
        formula: 'Biweight loss function'
      },
      lms: {
        name: 'LMS',
        description: 'Least Median of Squares',
        parameters: [],
        formula: 'min median(ri²)'
      },
      lts: {
        name: 'LTS',
        description: 'Least Trimmed Squares',
        parameters: ['alpha'],
        formula: 'min Σr²(i) for i=1:h'
      },
      mm: {
        name: 'MM-estimator',
        description: 'High breakdown & efficiency',
        parameters: ['eff'],
        formula: 'S-estimator + M-step'
      },
      theil_sen: {
        name: 'Theil-Sen',
        description: 'Median of pairwise slopes',
        parameters: [],
        formula: 'β = median{(yj-yi)/(xj-xi)}'
      }
    }
  }
};

const OutlierMethods = {
  iqr: {
    name: 'IQR Method',
    description: 'Points beyond Q1-1.5×IQR or Q3+1.5×IQR',
    formula: 'x < Q1 - 1.5×IQR or x > Q3 + 1.5×IQR'
  },
  mad: {
    name: 'MAD Method',
    description: 'Points beyond median ± k×MAD',
    formula: '|x - median| > k×MAD'
  },
  zscore: {
    name: 'Z-Score',
    description: 'Points with |z| > threshold',
    formula: '|z| = |(x - μ)/σ| > threshold'
  },
  modified_zscore: {
    name: 'Modified Z-Score',
    description: 'Using median and MAD',
    formula: '0.6745(x - median)/MAD > threshold'
  },
  grubbs: {
    name: "Grubbs' Test",
    description: 'Statistical test for outliers',
    formula: 'G = max|xi - x̄|/s'
  },
  dixon: {
    name: "Dixon's Q Test",
    description: 'Ratio test for outliers',
    formula: 'Q = gap/range'
  },
  isolation_forest: {
    name: 'Isolation Forest',
    description: 'Tree-based anomaly detection',
    formula: 'Isolation path length'
  },
  local_outlier_factor: {
    name: 'LOF',
    description: 'Local density-based detection',
    formula: 'LOF = avg(lrd_neighbors)/lrd_point'
  }
};

const RobustEstimators = () => {
  const dispatch = useDispatch();
  const { currentProject } = useSelector(state => state.project || {});
  
  const [data, setData] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [secondVariable, setSecondVariable] = useState('');
  const [parsedSecondVariable, setParsedSecondVariable] = useState(null);
  const [estimatorType, setEstimatorType] = useState('location');
  const [selectedMethod, setSelectedMethod] = useState('trimmed_mean');
  const [parameters, setParameters] = useState({
    trim_percent: 0.1,
    winsor_percent: 0.1,
    k: 1.345, // Huber
    c: 4.685, // Tukey
    a: 1.7, b: 3.4, c_hampel: 8.5, // Hampel
    scale_factor: 1.4826, // MAD
    beta: 0.2, // Percentage bend
    gamma: 0.2, // Winsorized correlation
    h: 0.75, // MCD
    alpha: 0.5, // LTS
    eff: 0.95 // MM-estimator
  });
  const [results, setResults] = useState(null);
  const [outliers, setOutliers] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [bootstrapCI, setBootstrapCI] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const plotRef = useRef(null);

  // Parse data
  const parseData = useCallback((text) => {
    if (!text.trim()) return null;
    
    // Try to parse as numbers (space, comma, or newline separated)
    const numbers = text
      .split(/[\s,\n]+/)
      .map(s => s.trim())
      .filter(s => s)
      .map(s => parseFloat(s))
      .filter(n => !isNaN(n));
    
    if (numbers.length === 0) return null;
    
    return numbers;
  }, []);

  // Calculate classical estimators for comparison
  const calculateClassicalEstimators = useCallback((data) => {
    const n = data.length;
    const sorted = [...data].sort((a, b) => a - b);
    
    // Mean
    const mean = data.reduce((sum, x) => sum + x, 0) / n;
    
    // Standard deviation
    const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1);
    const sd = Math.sqrt(variance);
    
    // Standard error
    const se = sd / Math.sqrt(n);
    
    // Median
    const median = n % 2 === 0 
      ? (sorted[n/2 - 1] + sorted[n/2]) / 2 
      : sorted[Math.floor(n/2)];
    
    // Quartiles
    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    
    return {
      mean,
      sd,
      se,
      median,
      q1,
      q3,
      iqr,
      min: sorted[0],
      max: sorted[n - 1],
      range: sorted[n - 1] - sorted[0],
      cv: sd / Math.abs(mean)
    };
  }, []);

  // Calculate trimmed mean
  const calculateTrimmedMean = useCallback((data, trimPercent = 0.1) => {
    const n = data.length;
    const sorted = [...data].sort((a, b) => a - b);
    const trimCount = Math.floor(n * trimPercent);
    
    if (trimCount === 0) {
      return data.reduce((sum, x) => sum + x, 0) / n;
    }
    
    const trimmed = sorted.slice(trimCount, n - trimCount);
    return trimmed.reduce((sum, x) => sum + x, 0) / trimmed.length;
  }, []);

  // Calculate winsorized mean
  const calculateWinsorizedMean = useCallback((data, winsorPercent = 0.1) => {
    const n = data.length;
    const sorted = [...data].sort((a, b) => a - b);
    const winsorCount = Math.floor(n * winsorPercent);
    
    if (winsorCount === 0) {
      return data.reduce((sum, x) => sum + x, 0) / n;
    }
    
    const winsorized = [...sorted];
    const lowerValue = sorted[winsorCount];
    const upperValue = sorted[n - winsorCount - 1];
    
    for (let i = 0; i < winsorCount; i++) {
      winsorized[i] = lowerValue;
      winsorized[n - 1 - i] = upperValue;
    }
    
    return winsorized.reduce((sum, x) => sum + x, 0) / n;
  }, []);

  // Calculate MAD (Median Absolute Deviation)
  const calculateMAD = useCallback((data, scaleFactor = 1.4826) => {
    const n = data.length;
    const median = calculateMedian(data);
    const deviations = data.map(x => Math.abs(x - median));
    const mad = calculateMedian(deviations);
    return mad * scaleFactor; // Scale factor for consistency with normal distribution
  }, []);

  // Calculate median (helper)
  const calculateMedian = (data) => {
    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;
    return n % 2 === 0 
      ? (sorted[n/2 - 1] + sorted[n/2]) / 2 
      : sorted[Math.floor(n/2)];
  };

  // Calculate Huber M-estimator
  const calculateHuberM = useCallback((data, k = 1.345, maxIter = 100, tol = 1e-6) => {
    const n = data.length;
    let location = calculateMedian(data);
    const mad = calculateMAD(data);
    
    if (mad === 0) return location;
    
    for (let iter = 0; iter < maxIter; iter++) {
      const weights = data.map(x => {
        const z = (x - location) / mad;
        return Math.abs(z) <= k ? 1 : k / Math.abs(z);
      });
      
      const newLocation = data.reduce((sum, x, i) => sum + weights[i] * x, 0) / 
                         weights.reduce((sum, w) => sum + w, 0);
      
      if (Math.abs(newLocation - location) < tol) break;
      location = newLocation;
    }
    
    return location;
  }, [calculateMAD]);

  // Calculate Tukey biweight M-estimator
  const calculateTukeyBiweight = useCallback((data, c = 4.685, maxIter = 100, tol = 1e-6) => {
    const n = data.length;
    let location = calculateMedian(data);
    const mad = calculateMAD(data);
    
    if (mad === 0) return location;
    
    for (let iter = 0; iter < maxIter; iter++) {
      const weights = data.map(x => {
        const u = (x - location) / (c * mad);
        return Math.abs(u) <= 1 ? Math.pow(1 - u * u, 2) : 0;
      });
      
      const sumWeights = weights.reduce((sum, w) => sum + w, 0);
      if (sumWeights === 0) break;
      
      const newLocation = data.reduce((sum, x, i) => sum + weights[i] * x, 0) / sumWeights;
      
      if (Math.abs(newLocation - location) < tol) break;
      location = newLocation;
    }
    
    return location;
  }, [calculateMAD]);

  // Calculate Hodges-Lehmann estimator
  const calculateHodgesLehmann = useCallback((data) => {
    const n = data.length;
    const pairwiseAverages = [];
    
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        pairwiseAverages.push((data[i] + data[j]) / 2);
      }
    }
    
    return calculateMedian(pairwiseAverages);
  }, []);

  // Calculate Sn scale estimator (Rousseeuw & Croux)
  const calculateSn = useCallback((data) => {
    const n = data.length;
    const c = n <= 9 ? [0, 0, 0.743, 1.851, 0.954, 1.351, 0.993, 1.198, 1.005, 1.131][n] : 1.0;
    
    const medians = [];
    for (let i = 0; i < n; i++) {
      const diffs = [];
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          diffs.push(Math.abs(data[i] - data[j]));
        }
      }
      medians.push(calculateMedian(diffs));
    }
    
    return c * 1.1926 * calculateMedian(medians);
  }, []);

  // Calculate Qn scale estimator (Rousseeuw & Croux)
  const calculateQn = useCallback((data) => {
    const n = data.length;
    const h = Math.floor(n / 2) + 1;
    const k = h * (h - 1) / 2;
    
    const diffs = [];
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        diffs.push(Math.abs(data[i] - data[j]));
      }
    }
    
    diffs.sort((a, b) => a - b);
    const d = n <= 9 ? [0, 0, 0.399, 0.994, 0.512, 0.844, 0.611, 0.857, 0.669, 0.872][n] : 
               n % 2 === 0 ? 0.76 : 0.80;
    
    return d * 2.2219 * diffs[Math.floor(k) - 1];
  }, []);

  // Calculate biweight midvariance
  const calculateBiweightMidvariance = useCallback((data, c = 9) => {
    const n = data.length;
    const median = calculateMedian(data);
    const mad = calculateMAD(data);
    
    if (mad === 0) return 0;
    
    const u = data.map(x => (x - median) / (c * mad));
    const weights = u.map(ui => Math.abs(ui) < 1 ? Math.pow(1 - ui * ui, 2) : 0);
    
    const numerator = n * data.reduce((sum, x, i) => {
      const ai = Math.abs(u[i]) < 1 ? 1 - u[i] * u[i] : 0;
      return sum + ai * ai * Math.pow(x - median, 2);
    }, 0);
    
    const denominator = Math.pow(weights.reduce((sum, w) => sum + w, 0), 2);
    
    return denominator > 0 ? Math.sqrt(numerator / denominator) : 0;
  }, [calculateMAD]);

  // Detect outliers
  const detectOutliers = useCallback((data, method = 'mad', threshold = 3) => {
    const n = data.length;
    const outlierIndices = [];
    
    switch (method) {
      case 'iqr': {
        const sorted = [...data].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(n * 0.25)];
        const q3 = sorted[Math.floor(n * 0.75)];
        const iqr = q3 - q1;
        const lower = q1 - 1.5 * iqr;
        const upper = q3 + 1.5 * iqr;
        
        data.forEach((x, i) => {
          if (x < lower || x > upper) outlierIndices.push(i);
        });
        break;
      }
      
      case 'mad': {
        const median = calculateMedian(data);
        const mad = calculateMAD(data);
        
        data.forEach((x, i) => {
          if (Math.abs(x - median) > threshold * mad) outlierIndices.push(i);
        });
        break;
      }
      
      case 'modified_zscore': {
        const median = calculateMedian(data);
        const mad = calculateMAD(data, 1);
        
        data.forEach((x, i) => {
          const modZ = 0.6745 * (x - median) / mad;
          if (Math.abs(modZ) > threshold) outlierIndices.push(i);
        });
        break;
      }
      
      case 'zscore': {
        const mean = data.reduce((sum, x) => sum + x, 0) / n;
        const sd = Math.sqrt(data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1));
        
        data.forEach((x, i) => {
          const z = (x - mean) / sd;
          if (Math.abs(z) > threshold) outlierIndices.push(i);
        });
        break;
      }
    }
    
    return {
      indices: outlierIndices,
      values: outlierIndices.map(i => data[i]),
      count: outlierIndices.length,
      percentage: (outlierIndices.length / n) * 100
    };
  }, [calculateMAD]);

  // Bootstrap confidence intervals
  const bootstrapConfidenceInterval = useCallback((data, estimator, nBoot = 1000, alpha = 0.05) => {
    const n = data.length;
    const estimates = [];
    
    for (let b = 0; b < nBoot; b++) {
      // Resample with replacement
      const sample = [];
      for (let i = 0; i < n; i++) {
        sample.push(data[Math.floor(Math.random() * n)]);
      }
      
      // Calculate estimator on bootstrap sample
      let estimate;
      switch (estimator) {
        case 'trimmed_mean':
          estimate = calculateTrimmedMean(sample, parameters.trim_percent);
          break;
        case 'winsorized_mean':
          estimate = calculateWinsorizedMean(sample, parameters.winsor_percent);
          break;
        case 'median':
          estimate = calculateMedian(sample);
          break;
        case 'huber_m':
          estimate = calculateHuberM(sample, parameters.k);
          break;
        case 'tukey_biweight':
          estimate = calculateTukeyBiweight(sample, parameters.c);
          break;
        case 'hodges_lehmann':
          estimate = calculateHodgesLehmann(sample);
          break;
        default:
          estimate = sample.reduce((sum, x) => sum + x, 0) / n;
      }
      
      estimates.push(estimate);
    }
    
    // Sort estimates
    estimates.sort((a, b) => a - b);
    
    // Calculate percentile CI
    const lowerIdx = Math.floor(nBoot * alpha / 2);
    const upperIdx = Math.floor(nBoot * (1 - alpha / 2));
    
    return {
      lower: estimates[lowerIdx],
      upper: estimates[upperIdx],
      point: calculateMedian(estimates),
      se: Math.sqrt(estimates.reduce((sum, e) => {
        const diff = e - calculateMedian(estimates);
        return sum + diff * diff;
      }, 0) / (nBoot - 1))
    };
  }, [calculateTrimmedMean, calculateWinsorizedMean, calculateHuberM, calculateTukeyBiweight, calculateHodgesLehmann, parameters]);

  // Calculate robust correlation
  const calculateRobustCorrelation = useCallback((x, y, method = 'spearman') => {
    const n = Math.min(x.length, y.length);
    
    switch (method) {
      case 'spearman': {
        // Rank correlation
        const rankX = getRanks(x.slice(0, n));
        const rankY = getRanks(y.slice(0, n));
        return calculatePearsonCorrelation(rankX, rankY);
      }
      
      case 'kendall': {
        // Kendall's tau
        let concordant = 0;
        let discordant = 0;
        
        for (let i = 0; i < n - 1; i++) {
          for (let j = i + 1; j < n; j++) {
            const xDiff = x[j] - x[i];
            const yDiff = y[j] - y[i];
            
            if (xDiff * yDiff > 0) concordant++;
            else if (xDiff * yDiff < 0) discordant++;
          }
        }
        
        return (concordant - discordant) / (n * (n - 1) / 2);
      }
      
      case 'winsorized': {
        // Winsorized correlation
        const winX = winsorizeData(x.slice(0, n), parameters.gamma);
        const winY = winsorizeData(y.slice(0, n), parameters.gamma);
        return calculatePearsonCorrelation(winX, winY);
      }
      
      case 'percentage_bend': {
        // Percentage bend correlation
        const beta = parameters.beta;
        const medX = calculateMedian(x.slice(0, n));
        const medY = calculateMedian(y.slice(0, n));
        
        // Calculate percentage bend weights
        const wx = calculatePercentageBendWeights(x.slice(0, n), beta);
        const wy = calculatePercentageBendWeights(y.slice(0, n), beta);
        
        // Weighted correlation
        let sumXY = 0, sumX2 = 0, sumY2 = 0;
        for (let i = 0; i < n; i++) {
          const weightedX = wx[i] * (x[i] - medX);
          const weightedY = wy[i] * (y[i] - medY);
          sumXY += weightedX * weightedY;
          sumX2 += weightedX * weightedX;
          sumY2 += weightedY * weightedY;
        }
        
        return sumXY / Math.sqrt(sumX2 * sumY2);
      }
      
      default:
        return calculatePearsonCorrelation(x.slice(0, n), y.slice(0, n));
    }
  }, [parameters]);

  // Helper functions
  const getRanks = (data) => {
    const n = data.length;
    const indexed = data.map((val, idx) => ({ val, idx }));
    indexed.sort((a, b) => a.val - b.val);
    
    const ranks = new Array(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j < n - 1 && indexed[j].val === indexed[j + 1].val) j++;
      
      const avgRank = (i + j + 2) / 2;
      for (let k = i; k <= j; k++) {
        ranks[indexed[k].idx] = avgRank;
      }
      i = j + 1;
    }
    
    return ranks;
  };

  const calculatePearsonCorrelation = (x, y) => {
    const n = x.length;
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;
    
    let sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      sumXY += dx * dy;
      sumX2 += dx * dx;
      sumY2 += dy * dy;
    }
    
    return sumXY / Math.sqrt(sumX2 * sumY2);
  };

  const winsorizeData = (data, gamma) => {
    const n = data.length;
    const sorted = [...data].sort((a, b) => a - b);
    const k = Math.floor(n * gamma);
    
    const winsorized = [...data];
    const lower = sorted[k];
    const upper = sorted[n - k - 1];
    
    return winsorized.map(x => x < lower ? lower : x > upper ? upper : x);
  };

  const calculatePercentageBendWeights = (data, beta) => {
    const n = data.length;
    const m = Math.floor((1 - beta) * n);
    const sorted = [...Math.abs(data)].sort((a, b) => a - b);
    const wb = sorted[m];
    
    return data.map(x => {
      const psi = Math.max(-wb, Math.min(wb, x));
      return psi / x;
    });
  };

  // Perform calculations
  const performCalculations = useCallback(() => {
    if (!parsedData || parsedData.length < 3) {
      alert('Please enter at least 3 numeric values');
      return;
    }
    
    setIsCalculating(true);
    
    // Classical estimators
    const classical = calculateClassicalEstimators(parsedData);
    
    // Robust estimators based on type
    let robustResult = null;
    
    if (estimatorType === 'location') {
      switch (selectedMethod) {
        case 'trimmed_mean':
          robustResult = calculateTrimmedMean(parsedData, parameters.trim_percent);
          break;
        case 'winsorized_mean':
          robustResult = calculateWinsorizedMean(parsedData, parameters.winsor_percent);
          break;
        case 'median':
          robustResult = calculateMedian(parsedData);
          break;
        case 'hodges_lehmann':
          robustResult = calculateHodgesLehmann(parsedData);
          break;
        case 'huber_m':
          robustResult = calculateHuberM(parsedData, parameters.k);
          break;
        case 'tukey_biweight':
          robustResult = calculateTukeyBiweight(parsedData, parameters.c);
          break;
        default:
          robustResult = classical.mean;
      }
    } else if (estimatorType === 'scale') {
      switch (selectedMethod) {
        case 'mad':
          robustResult = calculateMAD(parsedData, parameters.scale_factor);
          break;
        case 'iqr':
          robustResult = classical.iqr;
          break;
        case 'sn':
          robustResult = calculateSn(parsedData);
          break;
        case 'qn':
          robustResult = calculateQn(parsedData);
          break;
        case 'biweight_midvariance':
          robustResult = calculateBiweightMidvariance(parsedData, parameters.c);
          break;
        default:
          robustResult = classical.sd;
      }
    } else if (estimatorType === 'correlation' && parsedSecondVariable) {
      robustResult = calculateRobustCorrelation(parsedData, parsedSecondVariable, selectedMethod);
    }
    
    // Outlier detection
    const outlierResults = {
      iqr: detectOutliers(parsedData, 'iqr'),
      mad: detectOutliers(parsedData, 'mad'),
      modifiedZ: detectOutliers(parsedData, 'modified_zscore'),
      zscore: detectOutliers(parsedData, 'zscore')
    };
    
    // Bootstrap CI (for location estimators)
    let ciResult = null;
    if (estimatorType === 'location') {
      ciResult = bootstrapConfidenceInterval(parsedData, selectedMethod);
    }
    
    // Comparison
    const comparisonResult = {
      classical: estimatorType === 'location' ? classical.mean : classical.sd,
      robust: robustResult,
      difference: robustResult - (estimatorType === 'location' ? classical.mean : classical.sd),
      percentChange: ((robustResult - (estimatorType === 'location' ? classical.mean : classical.sd)) / 
                      (estimatorType === 'location' ? classical.mean : classical.sd)) * 100,
      efficiency: estimatorType === 'location' ? 
                  (classical.se * classical.se) / (ciResult?.se * ciResult?.se || 1) : 
                  null
    };
    
    setResults({
      type: estimatorType,
      method: selectedMethod,
      value: robustResult,
      classical,
      n: parsedData.length
    });
    
    setOutliers(outlierResults);
    setBootstrapCI(ciResult);
    setComparison(comparisonResult);
    
    setIsCalculating(false);
  }, [parsedData, parsedSecondVariable, estimatorType, selectedMethod, parameters,
      calculateClassicalEstimators, calculateTrimmedMean, calculateWinsorizedMean,
      calculateHodgesLehmann, calculateHuberM, calculateTukeyBiweight,
      calculateMAD, calculateSn, calculateQn, calculateBiweightMidvariance,
      detectOutliers, bootstrapConfidenceInterval, calculateRobustCorrelation]);

  // Update parsed data when input changes
  useEffect(() => {
    setParsedData(parseData(data));
  }, [data, parseData]);

  useEffect(() => {
    setParsedSecondVariable(parseData(secondVariable));
  }, [secondVariable, parseData]);

  // Generate visualization
  const generateVisualization = useCallback(() => {
    if (!plotRef.current || !parsedData) return;
    
    const canvas = plotRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw histogram with outliers highlighted
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    
    // Calculate bins
    const min = Math.min(...parsedData);
    const max = Math.max(...parsedData);
    const range = max - min;
    const nBins = Math.min(20, Math.ceil(Math.sqrt(parsedData.length)));
    const binWidth = range / nBins;
    
    const bins = Array(nBins).fill(0);
    const outlierIndices = outliers?.mad?.indices || [];
    
    parsedData.forEach((val, idx) => {
      const binIdx = Math.min(Math.floor((val - min) / binWidth), nBins - 1);
      bins[binIdx]++;
    });
    
    const maxCount = Math.max(...bins);
    
    // Draw axes
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.stroke();
    
    // Draw bins
    bins.forEach((count, i) => {
      const x = margin.left + (i * plotWidth / nBins);
      const barHeight = (count / maxCount) * plotHeight;
      const y = height - margin.bottom - barHeight;
      
      // Check if bin contains outliers
      const binMin = min + i * binWidth;
      const binMax = binMin + binWidth;
      const hasOutliers = parsedData.some((val, idx) => 
        val >= binMin && val < binMax && outlierIndices.includes(idx)
      );
      
      ctx.fillStyle = hasOutliers ? '#e74c3c' : '#3498db';
      ctx.fillRect(x, y, plotWidth / nBins - 2, barHeight);
    });
    
    // Draw robust estimate line
    if (results && estimatorType === 'location') {
      const x = margin.left + ((results.value - min) / range) * plotWidth;
      ctx.strokeStyle = '#27ae60';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, height - margin.bottom);
      ctx.stroke();
      
      // Label
      ctx.fillStyle = '#27ae60';
      ctx.font = '11px IBM Plex Sans';
      ctx.textAlign = 'center';
      ctx.fillText('Robust', x, margin.top - 5);
    }
    
    // Draw classical estimate line
    if (results && estimatorType === 'location') {
      const x = margin.left + ((results.classical.mean - min) / range) * plotWidth;
      ctx.strokeStyle = '#e67e22';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, height - margin.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Label
      ctx.fillStyle = '#e67e22';
      ctx.font = '11px IBM Plex Sans';
      ctx.textAlign = 'center';
      ctx.fillText('Classical', x, height - margin.bottom + 15);
    }
    
    // Title
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 12px IBM Plex Sans';
    ctx.textAlign = 'center';
    ctx.fillText('Distribution with Robust vs Classical Estimates', width / 2, 15);
  }, [parsedData, results, outliers, estimatorType]);

  useEffect(() => {
    generateVisualization();
  }, [parsedData, results, outliers, generateVisualization]);

  return (
    <div className="robust-estimators">
      <div className="estimators-header">
        <h2>Robust Statistical Estimators</h2>
        <div className="header-info">
          Resistant to outliers and violations of assumptions
        </div>
      </div>

      <div className="estimators-body">
        <div className="input-panel">
          <div className="data-input">
            <label>Data (space, comma, or line separated):</label>
            <textarea
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder="Enter numeric values...
Example: 1.2 3.4 5.6 7.8 9.0
or: 1.2, 3.4, 5.6, 7.8, 9.0"
              rows={6}
            />
            {parsedData && (
              <div className="data-info">
                {parsedData.length} values parsed
              </div>
            )}
          </div>

          {estimatorType === 'correlation' && (
            <div className="data-input">
              <label>Second Variable (for correlation):</label>
              <textarea
                value={secondVariable}
                onChange={(e) => setSecondVariable(e.target.value)}
                placeholder="Enter second variable values..."
                rows={6}
              />
              {parsedSecondVariable && (
                <div className="data-info">
                  {parsedSecondVariable.length} values parsed
                </div>
              )}
            </div>
          )}

          <div className="estimator-selection">
            <div className="type-selector">
              <label>Estimator Type:</label>
              <select
                value={estimatorType}
                onChange={(e) => {
                  setEstimatorType(e.target.value);
                  // Reset to first method of new type
                  const firstMethod = Object.keys(EstimatorTypes[e.target.value.toUpperCase()].methods)[0];
                  setSelectedMethod(firstMethod);
                }}
              >
                {Object.values(EstimatorTypes).map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="method-selector">
              <label>Method:</label>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
              >
                {Object.entries(EstimatorTypes[estimatorType.toUpperCase()].methods).map(([key, method]) => (
                  <option key={key} value={key}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="method-info">
            <div className="description">
              {EstimatorTypes[estimatorType.toUpperCase()].methods[selectedMethod]?.description}
            </div>
            <div className="formula">
              <strong>Formula:</strong> {EstimatorTypes[estimatorType.toUpperCase()].methods[selectedMethod]?.formula}
            </div>
          </div>

          {EstimatorTypes[estimatorType.toUpperCase()].methods[selectedMethod]?.parameters.length > 0 && (
            <div className="parameters">
              <h4>Parameters</h4>
              {EstimatorTypes[estimatorType.toUpperCase()].methods[selectedMethod].parameters.map(param => (
                <div key={param} className="parameter">
                  <label>{param}:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={parameters[param] || 0}
                    onChange={(e) => setParameters({
                      ...parameters,
                      [param]: parseFloat(e.target.value)
                    })}
                  />
                </div>
              ))}
            </div>
          )}

          <button
            className="calculate-btn"
            onClick={performCalculations}
            disabled={!parsedData || parsedData.length < 3 || isCalculating}
          >
            {isCalculating ? 'Calculating...' : 'Calculate Robust Estimate'}
          </button>
        </div>

        <div className="results-panel">
          <div className="visualization">
            <canvas
              ref={plotRef}
              width={500}
              height={300}
              className="distribution-plot"
            />
          </div>

          {results && (
            <div className="results-section">
              <h3>Results</h3>
              <div className="result-grid">
                <div className="result-item highlight">
                  <label>Robust Estimate:</label>
                  <span>{results.value.toFixed(4)}</span>
                </div>
                <div className="result-item">
                  <label>Classical Estimate:</label>
                  <span>
                    {estimatorType === 'location' ? 
                     results.classical.mean.toFixed(4) : 
                     results.classical.sd.toFixed(4)}
                  </span>
                </div>
                <div className="result-item">
                  <label>Sample Size:</label>
                  <span>{results.n}</span>
                </div>
                {bootstrapCI && (
                  <>
                    <div className="result-item">
                      <label>95% Bootstrap CI:</label>
                      <span>[{bootstrapCI.lower.toFixed(4)}, {bootstrapCI.upper.toFixed(4)}]</span>
                    </div>
                    <div className="result-item">
                      <label>Bootstrap SE:</label>
                      <span>{bootstrapCI.se.toFixed(4)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {comparison && (
            <div className="comparison-section">
              <h3>Comparison with Classical</h3>
              <div className="result-grid">
                <div className="result-item">
                  <label>Difference:</label>
                  <span className={Math.abs(comparison.difference) > 0.1 ? 'significant' : ''}>
                    {comparison.difference.toFixed(4)}
                  </span>
                </div>
                <div className="result-item">
                  <label>Percent Change:</label>
                  <span className={Math.abs(comparison.percentChange) > 5 ? 'significant' : ''}>
                    {comparison.percentChange.toFixed(2)}%
                  </span>
                </div>
                {comparison.efficiency && (
                  <div className="result-item">
                    <label>Relative Efficiency:</label>
                    <span>{(comparison.efficiency * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {outliers && (
            <div className="outliers-section">
              <h3>Outlier Detection</h3>
              <table>
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Count</th>
                    <th>Percentage</th>
                    <th>Indices</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>IQR Method</td>
                    <td>{outliers.iqr.count}</td>
                    <td>{outliers.iqr.percentage.toFixed(1)}%</td>
                    <td>{outliers.iqr.indices.join(', ') || 'None'}</td>
                  </tr>
                  <tr>
                    <td>MAD Method</td>
                    <td>{outliers.mad.count}</td>
                    <td>{outliers.mad.percentage.toFixed(1)}%</td>
                    <td>{outliers.mad.indices.join(', ') || 'None'}</td>
                  </tr>
                  <tr>
                    <td>Modified Z-Score</td>
                    <td>{outliers.modifiedZ.count}</td>
                    <td>{outliers.modifiedZ.percentage.toFixed(1)}%</td>
                    <td>{outliers.modifiedZ.indices.join(', ') || 'None'}</td>
                  </tr>
                  <tr>
                    <td>Z-Score</td>
                    <td>{outliers.zscore.count}</td>
                    <td>{outliers.zscore.percentage.toFixed(1)}%</td>
                    <td>{outliers.zscore.indices.join(', ') || 'None'}</td>
                  </tr>
                </tbody>
              </table>
              {outliers.mad.count > 0 && (
                <div className="outlier-values">
                  <strong>Outlier Values (MAD):</strong> {outliers.mad.values.map(v => v.toFixed(2)).join(', ')}
                </div>
              )}
            </div>
          )}

          {results && (
            <div className="descriptive-stats">
              <h3>Descriptive Statistics</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <label>Mean:</label>
                  <span>{results.classical.mean.toFixed(4)}</span>
                </div>
                <div className="stat-item">
                  <label>Median:</label>
                  <span>{results.classical.median.toFixed(4)}</span>
                </div>
                <div className="stat-item">
                  <label>SD:</label>
                  <span>{results.classical.sd.toFixed(4)}</span>
                </div>
                <div className="stat-item">
                  <label>MAD:</label>
                  <span>{calculateMAD(parsedData).toFixed(4)}</span>
                </div>
                <div className="stat-item">
                  <label>IQR:</label>
                  <span>{results.classical.iqr.toFixed(4)}</span>
                </div>
                <div className="stat-item">
                  <label>Range:</label>
                  <span>{results.classical.range.toFixed(4)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="estimators-footer">
        <div className="references">
          <strong>References:</strong> Huber (1981), Rousseeuw & Croux (1993), Wilcox (2012)
        </div>
      </div>
    </div>
  );
};

export default RobustEstimators;