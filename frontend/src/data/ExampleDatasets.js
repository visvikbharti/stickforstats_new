/**
 * Example Datasets for Statistical Tests
 * =======================================
 * Professional-grade example datasets for demonstration and testing
 * Each dataset includes description, context, and expected insights
 */

export const ExampleDatasets = {
  // T-TEST DATASETS
  ttest: {
    oneSample: {
      bloodPressure: {
        name: "Blood Pressure Study",
        description: "Systolic blood pressure measurements from 30 patients testing if mean differs from population norm of 120 mmHg",
        hypothesizedMean: 120,
        data: [118, 122, 125, 119, 127, 121, 124, 120, 115, 128, 126, 119, 123, 125, 121, 117, 129, 124, 122, 118, 126, 121, 123, 119, 125, 124, 120, 122, 118, 127],
        expectedOutcome: "Significant difference from 120 mmHg",
        context: "Medical research comparing patient group to known population parameter"
      },
      manufacturingQC: {
        name: "Manufacturing Quality Control",
        description: "Widget weights (grams) testing if production meets 500g specification",
        hypothesizedMean: 500,
        data: [498.2, 501.5, 499.8, 502.1, 497.9, 500.3, 501.2, 499.5, 498.7, 500.8, 502.3, 497.6, 501.1, 499.2, 500.5],
        expectedOutcome: "No significant deviation from 500g specification",
        context: "Industrial QC ensuring products meet specifications"
      }
    },
    paired: {
      beforeAfterTraining: {
        name: "Training Effectiveness",
        description: "Test scores before and after training program for same individuals",
        before: [65, 70, 68, 72, 75, 69, 71, 67, 73, 66, 74, 68, 70, 72, 69],
        after: [72, 78, 75, 80, 82, 76, 79, 74, 81, 73, 80, 75, 77, 79, 76],
        expectedOutcome: "Significant improvement after training",
        context: "Educational assessment of intervention effectiveness"
      },
      drugEfficacy: {
        name: "Drug Efficacy Trial",
        description: "Pain scores (0-10) before and after medication for same patients",
        before: [8, 7, 9, 6, 8, 7, 8, 9, 7, 8, 6, 7, 8, 9, 7],
        after: [4, 3, 5, 2, 4, 3, 3, 5, 2, 4, 3, 2, 4, 5, 3],
        expectedOutcome: "Significant reduction in pain scores",
        context: "Clinical trial measuring treatment effectiveness"
      }
    },
    independent: {
      genderWageGap: {
        name: "Wage Gap Analysis",
        description: "Hourly wages ($) comparing male and female employees in same role",
        group1Name: "Male",
        group1Data: [32.5, 34.2, 31.8, 33.5, 35.1, 32.9, 34.7, 33.2, 31.5, 34.8, 33.6, 32.1, 34.3, 33.9, 32.7],
        group2Name: "Female",
        group2Data: [28.9, 30.2, 29.5, 31.1, 28.7, 30.5, 29.8, 30.9, 29.2, 31.3, 30.1, 29.6, 30.8, 29.3, 30.4],
        expectedOutcome: "Significant difference in wages",
        context: "HR analytics investigating pay equity"
      },
      treatmentControl: {
        name: "Clinical Treatment vs Control",
        description: "Recovery time (days) for treatment vs control group",
        group1Name: "Treatment",
        group1Data: [12, 14, 11, 13, 10, 15, 12, 11, 13, 14, 12, 10, 13, 11, 12],
        group2Name: "Control",
        group2Data: [18, 20, 17, 19, 21, 18, 22, 19, 20, 18, 21, 19, 20, 18, 19],
        expectedOutcome: "Treatment group recovers significantly faster",
        context: "Randomized controlled trial in medical research"
      }
    }
  },

  // ANOVA DATASETS
  anova: {
    oneWay: {
      teachingMethods: {
        name: "Teaching Methods Comparison",
        description: "Test scores for students taught using three different methods",
        groups: [
          { name: "Traditional", data: [72, 75, 68, 70, 73, 71, 69, 74, 72, 70] },
          { name: "Online", data: [78, 82, 80, 79, 81, 83, 77, 80, 79, 81] },
          { name: "Hybrid", data: [85, 88, 86, 87, 89, 84, 86, 88, 85, 87] }
        ],
        expectedOutcome: "Significant differences among teaching methods",
        context: "Educational research on pedagogical effectiveness"
      },
      fertilizers: {
        name: "Agricultural Yield Study",
        description: "Crop yield (kg/plot) for four different fertilizer types",
        groups: [
          { name: "Control", data: [42, 44, 41, 43, 40, 45, 42, 43, 41, 44] },
          { name: "Fertilizer A", data: [48, 50, 47, 49, 51, 48, 49, 50, 48, 49] },
          { name: "Fertilizer B", data: [55, 57, 54, 56, 58, 55, 56, 57, 55, 56] },
          { name: "Fertilizer C", data: [52, 54, 51, 53, 55, 52, 53, 54, 52, 53] }
        ],
        expectedOutcome: "Fertilizer B shows highest yield",
        context: "Agricultural optimization research"
      }
    },
    ancova: {
      salaryEducationAge: {
        name: "Salary Analysis with Age Covariate",
        description: "Salary comparison across education levels controlling for age",
        groups: [
          { name: "High School", data: [45000, 48000, 42000, 47000, 44000, 46000, 43000, 45000] },
          { name: "Bachelor's", data: [62000, 65000, 60000, 64000, 61000, 63000, 62000, 64000] },
          { name: "Master's", data: [78000, 82000, 75000, 80000, 77000, 79000, 76000, 81000] }
        ],
        covariate: {
          name: "Age",
          data: [25, 30, 22, 28, 24, 26, 23, 27, 32, 35, 28, 34, 30, 33, 31, 34, 38, 42, 35, 40, 36, 39, 37, 41]
        },
        expectedOutcome: "Education effect remains significant after controlling for age",
        context: "HR analytics adjusting for confounding variables"
      },
      drugDoseBaseline: {
        name: "Drug Efficacy with Baseline Control",
        description: "Treatment outcomes for different doses controlling for baseline severity",
        groups: [
          { name: "Placebo", data: [5.2, 5.5, 4.8, 5.3, 5.1, 5.4, 4.9, 5.2] },
          { name: "Low Dose", data: [3.8, 4.1, 3.5, 3.9, 3.7, 4.0, 3.6, 3.8] },
          { name: "High Dose", data: [2.5, 2.8, 2.2, 2.6, 2.4, 2.7, 2.3, 2.5] }
        ],
        covariate: {
          name: "Baseline Severity",
          data: [7.2, 7.5, 6.8, 7.3, 7.1, 7.4, 6.9, 7.2, 8.1, 8.4, 7.8, 8.2, 8.0, 8.3, 7.9, 8.1, 8.8, 9.1, 8.5, 8.9, 8.7, 9.0, 8.6, 8.8]
        },
        expectedOutcome: "Dose-response relationship after adjusting for baseline",
        context: "Clinical trial with covariate adjustment"
      }
    }
  },

  // REGRESSION DATASETS
  regression: {
    linear: {
      heightWeight: {
        name: "Height-Weight Relationship",
        description: "Predicting weight from height in adults",
        x: [160, 165, 170, 175, 180, 185, 155, 168, 172, 178, 182, 158, 163, 177, 183],
        y: [55, 62, 68, 75, 82, 88, 52, 65, 70, 78, 85, 54, 60, 76, 87],
        xLabel: "Height (cm)",
        yLabel: "Weight (kg)",
        expectedOutcome: "Strong positive linear relationship",
        context: "Biomedical research on anthropometric relationships"
      },
      advertisingSales: {
        name: "Advertising Impact on Sales",
        description: "Sales revenue vs advertising spend",
        x: [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 1500, 3500, 5500, 7500, 9500],
        y: [12000, 18000, 25000, 32000, 38000, 43000, 47000, 50000, 52000, 53000, 15000, 28000, 40000, 45000, 51000],
        xLabel: "Advertising Spend ($)",
        yLabel: "Sales Revenue ($)",
        expectedOutcome: "Diminishing returns at higher spending",
        context: "Marketing analytics for ROI optimization"
      }
    },
    multiple: {
      housePrices: {
        name: "House Price Prediction",
        description: "Predicting house prices from multiple features",
        predictors: {
          area: [1200, 1500, 1800, 2000, 2200, 1100, 1600, 1900, 2100, 2300, 1400, 1700, 2400, 1300, 2500],
          bedrooms: [2, 3, 3, 4, 4, 2, 3, 3, 4, 5, 2, 3, 5, 2, 5],
          age: [10, 5, 8, 2, 15, 20, 3, 6, 1, 12, 18, 4, 7, 25, 9]
        },
        response: [250000, 320000, 380000, 450000, 420000, 220000, 350000, 400000, 480000, 460000, 280000, 360000, 490000, 230000, 500000],
        expectedOutcome: "Area and bedrooms positively affect price, age negatively",
        context: "Real estate valuation modeling"
      }
    },
    logistic: {
      creditDefault: {
        name: "Credit Default Prediction",
        description: "Predicting loan default (1) or repayment (0)",
        income: [30000, 45000, 55000, 70000, 35000, 60000, 40000, 50000, 65000, 75000, 32000, 48000, 58000, 42000, 68000],
        creditScore: [580, 620, 680, 720, 590, 700, 610, 650, 710, 740, 585, 630, 690, 615, 730],
        outcome: [1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0],
        expectedOutcome: "Higher income and credit score reduce default probability",
        context: "Financial risk assessment"
      }
    }
  },

  // CORRELATION DATASETS
  correlation: {
    studyHoursGrades: {
      name: "Study Hours vs Grades",
      description: "Relationship between study hours per week and final grades",
      x: [5, 8, 10, 12, 15, 18, 20, 22, 25, 28, 7, 13, 17, 23, 27],
      y: [60, 65, 70, 75, 80, 82, 85, 87, 90, 92, 63, 77, 81, 88, 91],
      xLabel: "Study Hours per Week",
      yLabel: "Final Grade (%)",
      expectedOutcome: "Strong positive correlation (r ≈ 0.95)",
      context: "Educational research on study effectiveness"
    },
    temperatureIceCream: {
      name: "Temperature vs Ice Cream Sales",
      description: "Daily temperature and ice cream sales relationship",
      x: [15, 18, 20, 22, 25, 28, 30, 32, 35, 24, 26, 29, 31, 33, 21],
      y: [120, 180, 250, 320, 420, 510, 580, 620, 680, 380, 450, 540, 600, 650, 280],
      xLabel: "Temperature (°C)",
      yLabel: "Ice Cream Sales (units)",
      expectedOutcome: "Very strong positive correlation (r ≈ 0.98)",
      context: "Business analytics for seasonal products"
    },
    ageReactionTime: {
      name: "Age vs Reaction Time",
      description: "Relationship between age and reaction time",
      x: [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 22, 38, 42, 52, 58],
      y: [180, 185, 195, 210, 225, 245, 270, 300, 335, 375, 182, 215, 235, 280, 320],
      xLabel: "Age (years)",
      yLabel: "Reaction Time (ms)",
      expectedOutcome: "Positive correlation showing slower reactions with age",
      context: "Cognitive psychology research"
    }
  },

  // NON-PARAMETRIC TEST DATASETS
  nonParametric: {
    mannWhitney: {
      customerSatisfaction: {
        name: "Customer Satisfaction Ratings",
        description: "Ordinal satisfaction scores (1-10) for two service types",
        group1Name: "Service A",
        group1Data: [7, 8, 6, 7, 9, 8, 7, 6, 8, 7, 9, 8, 7, 6, 8],
        group2Name: "Service B",
        group2Data: [4, 5, 3, 4, 6, 5, 4, 3, 5, 4, 6, 5, 4, 3, 5],
        expectedOutcome: "Service A has significantly higher ratings",
        context: "Customer experience research with ordinal data"
      }
    },
    wilcoxon: {
      painReduction: {
        name: "Pain Score Reduction",
        description: "Pain scores (1-10 ordinal) before and after treatment",
        before: [8, 7, 9, 6, 8, 7, 9, 8, 7, 6, 8, 9, 7, 8, 6],
        after: [5, 4, 6, 3, 5, 4, 5, 4, 3, 2, 4, 5, 3, 4, 2],
        expectedOutcome: "Significant reduction in pain scores",
        context: "Clinical trial with ordinal outcome measures"
      }
    },
    kruskalWallis: {
      brandPreference: {
        name: "Brand Preference Rankings",
        description: "Preference rankings (1-100) for three brands",
        groups: [
          { name: "Brand A", data: [45, 52, 48, 50, 47, 51, 49, 46, 50, 48] },
          { name: "Brand B", data: [72, 78, 75, 80, 73, 77, 74, 76, 79, 75] },
          { name: "Brand C", data: [62, 65, 60, 64, 61, 63, 62, 64, 61, 63] }
        ],
        expectedOutcome: "Brand B has highest preference",
        context: "Market research with ranked preferences"
      }
    },
    friedman: {
      wineRatings: {
        name: "Wine Tasting Ratings",
        description: "Same judges rating 4 wines (repeated measures)",
        subjects: ["Judge1", "Judge2", "Judge3", "Judge4", "Judge5", "Judge6", "Judge7", "Judge8"],
        wines: {
          "Wine A": [7, 6, 8, 7, 6, 7, 8, 7],
          "Wine B": [9, 8, 9, 8, 9, 8, 9, 8],
          "Wine C": [5, 4, 6, 5, 4, 5, 6, 5],
          "Wine D": [8, 7, 8, 7, 8, 7, 8, 7]
        },
        expectedOutcome: "Wine B rated highest, Wine C lowest",
        context: "Sensory evaluation with repeated measures"
      }
    }
  },

  // CATEGORICAL TEST DATASETS
  categorical: {
    chiSquare: {
      genderProductPreference: {
        name: "Gender vs Product Preference",
        description: "Testing independence of gender and product choice",
        contingencyTable: [
          [45, 30, 25],  // Male: Product A, B, C
          [25, 40, 35]   // Female: Product A, B, C
        ],
        rowLabels: ["Male", "Female"],
        colLabels: ["Product A", "Product B", "Product C"],
        expectedOutcome: "Significant association between gender and preference",
        context: "Market segmentation analysis"
      },
      diceRoll: {
        name: "Dice Fairness Test",
        description: "Testing if a dice is fair (equal probabilities)",
        observed: [8, 12, 10, 15, 9, 6],  // Observed frequencies for faces 1-6
        expected: [10, 10, 10, 10, 10, 10],  // Expected if fair
        categories: ["1", "2", "3", "4", "5", "6"],
        expectedOutcome: "Possible bias towards face 4",
        context: "Quality control in gaming industry"
      }
    },
    fishersExact: {
      treatmentOutcome: {
        name: "Treatment Efficacy (Small Sample)",
        description: "2x2 table for treatment success/failure",
        contingencyTable: [
          [8, 2],   // Treatment: Success, Failure
          [3, 7]    // Control: Success, Failure
        ],
        rowLabels: ["Treatment", "Control"],
        colLabels: ["Success", "Failure"],
        expectedOutcome: "Treatment significantly more effective",
        context: "Small clinical trial analysis"
      }
    },
    mcNemar: {
      beforeAfterPreference: {
        name: "Preference Change Analysis",
        description: "Testing if preferences changed after intervention",
        contingencyTable: [
          [30, 15],  // Before Yes: After Yes, After No
          [5, 20]    // Before No: After Yes, After No
        ],
        expectedOutcome: "Significant shift in preferences",
        context: "Marketing campaign effectiveness"
      }
    }
  },

  // POWER ANALYSIS DATASETS
  powerAnalysis: {
    ttest: {
      clinicalTrial: {
        name: "Clinical Trial Planning",
        description: "Sample size for detecting clinically meaningful difference",
        effectSize: 0.5,  // Medium effect
        alpha: 0.05,
        power: 0.80,
        expectedN: 64,  // Per group
        context: "Planning phase of RCT"
      }
    },
    anova: {
      educationalIntervention: {
        name: "Educational Intervention Study",
        description: "Sample size for 4-group comparison",
        groups: 4,
        effectSize: 0.25,  // Small-medium effect
        alpha: 0.05,
        power: 0.80,
        expectedN: 45,  // Per group
        context: "Educational research planning"
      }
    }
  },

  // TIME SERIES DATASETS
  timeSeries: {
    monthlySeasonalSales: {
      name: "Monthly Sales with Seasonality",
      description: "3 years of monthly sales showing trend and seasonal patterns",
      dates: generateMonthlyDates(36),
      values: [
        // Year 1
        45000, 42000, 48000, 52000, 58000, 62000, 68000, 70000, 65000, 55000, 50000, 60000,
        // Year 2
        48000, 45000, 52000, 56000, 62000, 66000, 72000, 74000, 69000, 58000, 53000, 64000,
        // Year 3
        51000, 48000, 55000, 59000, 65000, 69000, 75000, 77000, 72000, 61000, 56000, 67000
      ],
      expectedOutcome: "Upward trend with summer peaks",
      context: "Retail sales forecasting"
    },
    dailyStockPrices: {
      name: "Stock Price Time Series",
      description: "Daily closing prices showing volatility",
      dates: generateDailyDates(30),
      values: [
        100, 102, 101, 103, 105, 104, 106, 108, 107, 109,
        108, 110, 112, 111, 113, 115, 114, 116, 115, 117,
        119, 118, 120, 122, 121, 123, 125, 124, 126, 128
      ],
      expectedOutcome: "Upward trend with daily volatility",
      context: "Financial time series analysis"
    }
  }
};

// Helper function to generate monthly dates
function generateMonthlyDates(months) {
  const dates = [];
  const startDate = new Date('2022-01-01');
  for (let i = 0; i < months; i++) {
    const date = new Date(startDate);
    date.setMonth(startDate.getMonth() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

// Helper function to generate daily dates
function generateDailyDates(days) {
  const dates = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

// Function to get formatted data for direct use
export const getExampleData = (testType, subType, datasetKey) => {
  try {
    const dataset = ExampleDatasets[testType]?.[subType]?.[datasetKey];
    if (!dataset) {
      console.warn(`Dataset not found: ${testType}.${subType}.${datasetKey}`);
      return null;
    }

    // Format data based on test type
    let formattedData = { ...dataset };

    // Convert arrays to comma-separated strings for text inputs
    if (Array.isArray(dataset.data)) {
      formattedData.dataString = dataset.data.join(', ');
    }

    if (dataset.groups) {
      formattedData.groups = dataset.groups.map(group => ({
        ...group,
        dataString: group.data.join(', ')
      }));
    }

    return formattedData;
  } catch (error) {
    console.error('Error getting example data:', error);
    return null;
  }
};

// Function to get all available datasets for a test type
export const getAvailableDatasets = (testType, subType) => {
  const datasets = ExampleDatasets[testType]?.[subType];
  if (!datasets) return [];

  return Object.keys(datasets).map(key => ({
    key,
    name: datasets[key].name,
    description: datasets[key].description
  }));
};

// Export helper function for quick data loading
export const loadExampleData = (component, datasetKey) => {
  const mapping = {
    'ttest': { type: 'ttest', subType: 'independent' },
    'anova': { type: 'anova', subType: 'oneWay' },
    'regression': { type: 'regression', subType: 'linear' },
    'correlation': { type: 'correlation', subType: null },
    'nonparametric': { type: 'nonParametric', subType: 'mannWhitney' },
    'categorical': { type: 'categorical', subType: 'chiSquare' }
  };

  const config = mapping[component.toLowerCase()];
  if (!config) return null;

  return getExampleData(config.type, config.subType || datasetKey, datasetKey);
};

export default ExampleDatasets;