import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class StatisticalTestService {
  constructor() {
    this.apiClient = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000
    });

    this.testCategories = {
      parametric: {
        name: 'Parametric Tests',
        description: 'Tests assuming normal distribution',
        guardianProtected: true,
        tests: {
          tTest: {
            name: 'T-Test',
            variants: ['one_sample', 'two_sample', 'paired'],
            endpoint: '/api/v1/stats/ttest/',
            guardianRequired: true,
            assumptions: ['normality', 'independence', 'equal_variance'],
            minSampleSize: { one_sample: 3, two_sample: 3, paired: 3 }
          },
          anova: {
            name: 'ANOVA',
            variants: ['one_way', 'two_way', 'repeated_measures'],
            endpoint: '/api/v1/stats/anova/',
            guardianRequired: true,
            assumptions: ['normality', 'homogeneity', 'independence'],
            minSampleSize: 6
          },
          ancova: {
            name: 'ANCOVA',
            endpoint: '/api/v1/stats/ancova/',
            guardianRequired: true,
            assumptions: ['normality', 'homogeneity', 'linearity', 'homogeneity_regression'],
            minSampleSize: 10
          }
        }
      },
      nonparametric: {
        name: 'Non-Parametric Tests',
        description: 'Distribution-free tests',
        guardianProtected: false,
        tests: {
          mannWhitney: {
            name: 'Mann-Whitney U Test',
            endpoint: '/api/v1/nonparametric/mann-whitney/',
            guardianRequired: false,
            assumptions: ['independence', 'ordinal_data'],
            minSampleSize: 5
          },
          wilcoxon: {
            name: 'Wilcoxon Signed-Rank Test',
            endpoint: '/api/v1/nonparametric/wilcoxon/',
            guardianRequired: false,
            assumptions: ['paired_data', 'symmetry'],
            minSampleSize: 6
          },
          kruskalWallis: {
            name: 'Kruskal-Wallis Test',
            endpoint: '/api/v1/nonparametric/kruskal-wallis/',
            guardianRequired: false,
            assumptions: ['independence', 'ordinal_data'],
            minSampleSize: 6
          },
          friedman: {
            name: 'Friedman Test',
            endpoint: '/api/v1/nonparametric/friedman/',
            guardianRequired: false,
            assumptions: ['repeated_measures', 'ordinal_data'],
            minSampleSize: 6
          },
          signTest: {
            name: 'Sign Test',
            endpoint: '/api/v1/nonparametric/sign/',
            guardianRequired: false,
            assumptions: ['paired_data'],
            minSampleSize: 5
          },
          moodMedian: {
            name: "Mood's Median Test",
            endpoint: '/api/v1/nonparametric/mood/',
            guardianRequired: false,
            assumptions: ['independence'],
            minSampleSize: 6
          },
          jonckheere: {
            name: 'Jonckheere-Terpstra Test',
            endpoint: '/api/v1/nonparametric/jonckheere/',
            guardianRequired: false,
            assumptions: ['ordered_alternatives', 'independence'],
            minSampleSize: 6
          },
          page: {
            name: "Page's Trend Test",
            endpoint: '/api/v1/nonparametric/page/',
            guardianRequired: false,
            assumptions: ['repeated_measures', 'ordered_alternatives'],
            minSampleSize: 6
          }
        }
      },
      correlation: {
        name: 'Correlation & Regression',
        description: 'Relationship analysis',
        guardianProtected: true,
        tests: {
          pearson: {
            name: 'Pearson Correlation',
            endpoint: '/api/v1/stats/correlation/',
            method: 'pearson',
            guardianRequired: true,
            assumptions: ['normality', 'linearity', 'homoscedasticity'],
            minSampleSize: 10
          },
          spearman: {
            name: 'Spearman Correlation',
            endpoint: '/api/v1/stats/correlation/',
            method: 'spearman',
            guardianRequired: false,
            assumptions: ['monotonic_relationship'],
            minSampleSize: 7
          },
          kendall: {
            name: 'Kendall Tau',
            endpoint: '/api/v1/stats/correlation/',
            method: 'kendall',
            guardianRequired: false,
            assumptions: ['ordinal_data'],
            minSampleSize: 7
          },
          linearRegression: {
            name: 'Linear Regression',
            endpoint: '/api/v1/regression/linear/',
            guardianRequired: true,
            assumptions: ['linearity', 'independence', 'homoscedasticity', 'normality_residuals'],
            minSampleSize: 20
          },
          multipleRegression: {
            name: 'Multiple Regression',
            endpoint: '/api/v1/regression/multiple/',
            guardianRequired: true,
            assumptions: ['linearity', 'independence', 'multicollinearity', 'normality_residuals'],
            minSampleSize: 30
          },
          polynomialRegression: {
            name: 'Polynomial Regression',
            endpoint: '/api/v1/regression/polynomial/',
            guardianRequired: true,
            assumptions: ['polynomial_relationship', 'independence'],
            minSampleSize: 20
          },
          logisticRegression: {
            name: 'Logistic Regression',
            endpoint: '/api/v1/regression/logistic/',
            guardianRequired: true,
            assumptions: ['binary_outcome', 'independence', 'linearity_logit'],
            minSampleSize: 50
          },
          ridgeRegression: {
            name: 'Ridge Regression',
            endpoint: '/api/v1/regression/ridge/',
            guardianRequired: false,
            assumptions: ['multicollinearity_present'],
            minSampleSize: 20
          },
          lassoRegression: {
            name: 'Lasso Regression',
            endpoint: '/api/v1/regression/lasso/',
            guardianRequired: false,
            assumptions: ['feature_selection_needed'],
            minSampleSize: 20
          }
        }
      },
      categorical: {
        name: 'Categorical Analysis',
        description: 'Tests for categorical data',
        guardianProtected: false,
        tests: {
          chiSquareIndependence: {
            name: 'Chi-Square Independence',
            endpoint: '/api/v1/categorical/chi-square/independence/',
            guardianRequired: false,
            assumptions: ['expected_frequency_5', 'independence'],
            minSampleSize: 20
          },
          chiSquareGoodness: {
            name: 'Chi-Square Goodness of Fit',
            endpoint: '/api/v1/categorical/chi-square/goodness/',
            guardianRequired: false,
            assumptions: ['expected_frequency_5'],
            minSampleSize: 20
          },
          fishersExact: {
            name: "Fisher's Exact Test",
            endpoint: '/api/v1/categorical/fishers/',
            guardianRequired: false,
            assumptions: ['2x2_table', 'small_sample'],
            minSampleSize: 1
          },
          mcnemar: {
            name: "McNemar's Test",
            endpoint: '/api/v1/categorical/mcnemar/',
            guardianRequired: false,
            assumptions: ['paired_binary', 'dichotomous'],
            minSampleSize: 10
          },
          cochranQ: {
            name: "Cochran's Q Test",
            endpoint: '/api/v1/categorical/cochran-q/',
            guardianRequired: false,
            assumptions: ['repeated_binary', 'dichotomous'],
            minSampleSize: 10
          },
          gTest: {
            name: 'G-Test',
            endpoint: '/api/v1/categorical/g-test/',
            guardianRequired: false,
            assumptions: ['likelihood_ratio', 'independence'],
            minSampleSize: 20
          },
          binomial: {
            name: 'Binomial Test',
            endpoint: '/api/v1/categorical/binomial/',
            guardianRequired: false,
            assumptions: ['binary_outcome', 'fixed_probability'],
            minSampleSize: 1
          },
          multinomial: {
            name: 'Multinomial Test',
            endpoint: '/api/v1/categorical/multinomial/',
            guardianRequired: false,
            assumptions: ['multiple_categories', 'fixed_probabilities'],
            minSampleSize: 20
          }
        }
      },
      powerAnalysis: {
        name: 'Power Analysis',
        description: 'Sample size and power calculations',
        guardianProtected: false,
        tests: {
          tTestPower: {
            name: 'T-Test Power',
            endpoint: '/api/v1/power/t-test/',
            parameters: ['effect_size', 'alpha', 'sample_size']
          },
          anovaPower: {
            name: 'ANOVA Power',
            endpoint: '/api/v1/power/anova/',
            parameters: ['effect_size', 'alpha', 'groups', 'sample_size']
          },
          correlationPower: {
            name: 'Correlation Power',
            endpoint: '/api/v1/power/correlation/',
            parameters: ['effect_size', 'alpha', 'sample_size']
          },
          chiSquarePower: {
            name: 'Chi-Square Power',
            endpoint: '/api/v1/power/chi-square/',
            parameters: ['effect_size', 'alpha', 'df', 'sample_size']
          },
          sampleSize: {
            name: 'Sample Size Calculator',
            endpoint: '/api/v1/power/sample-size/t-test/',
            parameters: ['effect_size', 'alpha', 'power']
          },
          effectSize: {
            name: 'Effect Size Calculator',
            endpoint: '/api/v1/power/effect-size/t-test/',
            parameters: ['mean1', 'mean2', 'pooled_sd']
          },
          powerCurves: {
            name: 'Power Curves',
            endpoint: '/api/v1/power/curves/',
            parameters: ['test_type', 'effect_sizes', 'sample_sizes']
          },
          optimalAllocation: {
            name: 'Optimal Allocation',
            endpoint: '/api/v1/power/allocation/',
            parameters: ['total_sample', 'groups', 'variances']
          }
        }
      },
      missingData: {
        name: 'Missing Data Analysis',
        description: 'Handle missing values',
        guardianProtected: false,
        tests: {
          detectPatterns: {
            name: 'Detect Missing Patterns',
            endpoint: '/api/v1/missing-data/detect/',
            parameters: ['data']
          },
          littlesMCAR: {
            name: "Little's MCAR Test",
            endpoint: '/api/v1/missing-data/little-test/',
            parameters: ['data']
          },
          imputeMissing: {
            name: 'Impute Missing Data',
            endpoint: '/api/v1/missing-data/impute/',
            parameters: ['data', 'method']
          },
          multipleImputation: {
            name: 'Multiple Imputation',
            endpoint: '/api/v1/missing-data/multiple-imputation/',
            parameters: ['data', 'n_imputations']
          },
          knnImputation: {
            name: 'KNN Imputation',
            endpoint: '/api/v1/missing-data/knn/',
            parameters: ['data', 'k_neighbors']
          },
          emImputation: {
            name: 'EM Algorithm',
            endpoint: '/api/v1/missing-data/em/',
            parameters: ['data', 'max_iterations']
          },
          compareImputations: {
            name: 'Compare Methods',
            endpoint: '/api/v1/missing-data/compare/',
            parameters: ['data', 'methods']
          }
        }
      }
    };

    this.testCount = this.calculateTestCount();
  }

  calculateTestCount() {
    let count = 0;
    Object.values(this.testCategories).forEach(category => {
      count += Object.keys(category.tests).length;
    });
    return count;
  }

  async checkGuardianHealth() {
    try {
      const response = await this.apiClient.get('/api/guardian/health/');
      return {
        status: response.data.status,
        version: response.data.version,
        validators: response.data.validators,
        isOperational: response.data.status === 'operational'
      };
    } catch (error) {
      console.error('Guardian health check failed:', error);
      return {
        status: 'error',
        isOperational: false,
        error: error.message
      };
    }
  }

  async performGuardianCheck(data, testType) {
    try {
      const response = await this.apiClient.post('/api/guardian/check/', {
        data: data,
        test_type: testType,
        precision_required: 50
      });

      return {
        passed: response.data.passed,
        warnings: response.data.warnings || [],
        suggestions: response.data.suggestions || [],
        assumptions: response.data.assumptions || {},
        canProceed: response.data.can_proceed !== false,
        alternativeTests: response.data.alternative_tests || []
      };
    } catch (error) {
      console.warn('Guardian check failed, proceeding with caution:', error);
      return {
        passed: false,
        warnings: ['Guardian validation unavailable, results may be less reliable'],
        canProceed: true
      };
    }
  }

  async executeTest(testCategory, testName, params) {
    const category = this.testCategories[testCategory];
    if (!category || !category.tests[testName]) {
      throw new Error(`Test ${testName} not found in category ${testCategory}`);
    }

    const test = category.tests[testName];

    const startTime = Date.now();

    let guardianReport = null;
    if (test.guardianRequired || category.guardianProtected) {
      guardianReport = await this.performGuardianCheck(params.data, testName);

      if (!guardianReport.canProceed) {
        return {
          success: false,
          error: 'Guardian validation failed',
          guardianReport: guardianReport,
          suggestions: guardianReport.alternativeTests
        };
      }
    }

    try {
      const requestData = {
        ...params,
        options: {
          check_assumptions: true,
          validate_results: true,
          compare_standard: true,
          precision: 50,
          ...params.options
        }
      };

      const response = await this.apiClient.post(test.endpoint, requestData);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        testName: test.name,
        category: category.name,
        main_results: response.data.high_precision_result || response.data.results,
        statistics: response.data.statistics,
        assumptions: response.data.assumptions,
        guardian_report: guardianReport,
        precision_info: {
          decimal_places: 50,
          method: 'Python Decimal Library',
          verification: response.data.validation
        },
        interpretation: response.data.interpretation,
        visualizations: response.data.visualizations,
        metadata: {
          test_type: testName,
          execution_time_ms: executionTime,
          timestamp: new Date().toISOString(),
          api_version: 'v1',
          precision_guarantee: '50-decimal'
        },
        comparison: response.data.comparison,
        additional_metrics: response.data.additional_metrics
      };
    } catch (error) {
      console.error(`Test execution failed for ${testName}:`, error);

      return {
        success: false,
        error: error.response?.data?.error || error.message,
        testName: test.name,
        category: category.name,
        guardian_report: guardianReport,
        metadata: {
          test_type: testName,
          execution_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async runParametricTest(testType, data, options = {}) {
    const testMap = {
      't-test-one': { category: 'parametric', name: 'tTest', variant: 'one_sample' },
      't-test-two': { category: 'parametric', name: 'tTest', variant: 'two_sample' },
      't-test-paired': { category: 'parametric', name: 'tTest', variant: 'paired' },
      'anova-one-way': { category: 'parametric', name: 'anova', variant: 'one_way' },
      'anova-two-way': { category: 'parametric', name: 'anova', variant: 'two_way' },
      'ancova': { category: 'parametric', name: 'ancova', variant: null }
    };

    const testConfig = testMap[testType];
    if (!testConfig) {
      throw new Error(`Unknown parametric test type: ${testType}`);
    }

    const params = {
      test_type: testConfig.variant || testType,
      data1: data.data1 || data.group1 || data.values,
      data2: data.data2 || data.group2,
      groups: data.groups,
      covariate: data.covariate,
      parameters: {
        confidence: options.confidence || 0.95,
        equal_var: options.equalVariance !== false,
        mu: options.mu || 0,
        ...options.parameters
      },
      options: options
    };

    return this.executeTest(testConfig.category, testConfig.name, params);
  }

  async runCorrelationTest(method, xData, yData, options = {}) {
    const params = {
      method: method,
      x_data: xData,
      y_data: yData,
      confidence_level: options.confidence || 0.95,
      options: options
    };

    const testName = method === 'pearson' ? 'pearson' :
                     method === 'spearman' ? 'spearman' : 'kendall';

    return this.executeTest('correlation', testName, params);
  }

  async runRegressionAnalysis(type, data, options = {}) {
    const regressionMap = {
      'linear': 'linearRegression',
      'multiple': 'multipleRegression',
      'polynomial': 'polynomialRegression',
      'logistic': 'logisticRegression',
      'ridge': 'ridgeRegression',
      'lasso': 'lassoRegression'
    };

    const testName = regressionMap[type];
    if (!testName) {
      throw new Error(`Unknown regression type: ${type}`);
    }

    const params = {
      regression_type: type,
      x_data: data.x || data.predictors,
      y_data: data.y || data.response,
      degree: data.degree || 2,
      alpha: data.alpha || 1.0,
      options: options
    };

    return this.executeTest('correlation', testName, params);
  }

  async runNonParametricTest(testType, data, options = {}) {
    const testMap = {
      'mann-whitney': 'mannWhitney',
      'wilcoxon': 'wilcoxon',
      'kruskal-wallis': 'kruskalWallis',
      'friedman': 'friedman',
      'sign': 'signTest',
      'mood': 'moodMedian',
      'jonckheere': 'jonckheere',
      'page': 'page'
    };

    const testName = testMap[testType];
    if (!testName) {
      throw new Error(`Unknown non-parametric test: ${testType}`);
    }

    const params = {
      data: data,
      options: options
    };

    return this.executeTest('nonparametric', testName, params);
  }

  async runCategoricalTest(testType, data, options = {}) {
    const testMap = {
      'chi-square-independence': 'chiSquareIndependence',
      'chi-square-goodness': 'chiSquareGoodness',
      'fishers-exact': 'fishersExact',
      'mcnemar': 'mcnemar',
      'cochran-q': 'cochranQ',
      'g-test': 'gTest',
      'binomial': 'binomial',
      'multinomial': 'multinomial'
    };

    const testName = testMap[testType];
    if (!testName) {
      throw new Error(`Unknown categorical test: ${testType}`);
    }

    const params = {
      data: data,
      contingency_table: data.table,
      observed: data.observed,
      expected: data.expected,
      successes: data.successes,
      trials: data.trials,
      probability: data.probability,
      options: options
    };

    return this.executeTest('categorical', testName, params);
  }

  async runPowerAnalysis(analysisType, parameters) {
    const testName = analysisType.replace('-', '') + 'Power';

    try {
      const response = await this.apiClient.post(
        this.testCategories.powerAnalysis.tests[testName]?.endpoint ||
        `/api/v1/power/${analysisType}/`,
        parameters
      );

      return {
        success: true,
        results: response.data,
        metadata: {
          analysis_type: analysisType,
          precision: '50-decimal',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  async handleMissingData(operation, data, options = {}) {
    const operationMap = {
      'detect': 'detectPatterns',
      'little-test': 'littlesMCAR',
      'impute': 'imputeMissing',
      'multiple': 'multipleImputation',
      'knn': 'knnImputation',
      'em': 'emImputation',
      'compare': 'compareImputations'
    };

    const testName = operationMap[operation];
    if (!testName) {
      throw new Error(`Unknown missing data operation: ${operation}`);
    }

    const params = {
      data: data,
      method: options.method || 'mean',
      n_imputations: options.n_imputations || 5,
      k_neighbors: options.k_neighbors || 5,
      max_iterations: options.max_iterations || 100,
      methods: options.methods || ['mean', 'median', 'mode', 'forward_fill']
    };

    return this.executeTest('missingData', testName, params);
  }

  async getTestRecommendation(data, researchQuestion) {
    try {
      const response = await this.apiClient.post('/api/v1/stats/recommend/', {
        data: data,
        research_question: researchQuestion,
        include_assumptions: true,
        include_alternatives: true
      });

      return {
        success: true,
        primary_recommendation: response.data.primary_test,
        alternatives: response.data.alternative_tests,
        assumptions_check: response.data.assumptions,
        data_characteristics: response.data.data_profile,
        reasoning: response.data.reasoning
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  async uploadData(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await this.apiClient.post('/api/v1/data/import/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return {
        success: true,
        data: response.data.data,
        columns: response.data.columns,
        statistics: response.data.statistics,
        dataTypes: response.data.data_types
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  getTestInfo(category, testName) {
    const cat = this.testCategories[category];
    if (!cat || !cat.tests[testName]) {
      return null;
    }

    const test = cat.tests[testName];
    return {
      name: test.name,
      category: cat.name,
      assumptions: test.assumptions || [],
      minSampleSize: test.minSampleSize || 'Not specified',
      guardianRequired: test.guardianRequired || false,
      endpoint: test.endpoint,
      description: cat.description,
      parameters: test.parameters || []
    };
  }

  getAllTests() {
    const allTests = [];

    Object.entries(this.testCategories).forEach(([categoryKey, category]) => {
      Object.entries(category.tests).forEach(([testKey, test]) => {
        allTests.push({
          id: `${categoryKey}.${testKey}`,
          category: category.name,
          categoryKey: categoryKey,
          testKey: testKey,
          name: test.name,
          guardianProtected: test.guardianRequired || category.guardianProtected,
          assumptions: test.assumptions || [],
          minSampleSize: test.minSampleSize,
          endpoint: test.endpoint
        });
      });
    });

    return allTests;
  }

  getCategorySummary() {
    return Object.entries(this.testCategories).map(([key, category]) => ({
      key: key,
      name: category.name,
      description: category.description,
      testCount: Object.keys(category.tests).length,
      guardianProtected: category.guardianProtected,
      tests: Object.keys(category.tests)
    }));
  }
}

export default new StatisticalTestService();