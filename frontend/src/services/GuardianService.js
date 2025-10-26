/**
 * Guardian Service
 * ================
 * Frontend service layer for the Statistical Guardian system.
 * Validates statistical assumptions before tests are performed.
 *
 * The Guardian protects users from statistical malpractice by:
 * 1. Auto-detecting data distribution type (normal, non-parametric, multimodal, etc.)
 * 2. Checking all assumptions for the chosen test
 * 3. Blocking inappropriate tests
 * 4. Recommending alternative tests
 * 5. Providing detailed educational guidance
 */

const API_BASE_URL = 'http://127.0.0.1:8000/api/guardian';

class GuardianService {
  /**
   * Main Guardian check - validates all assumptions for a given test
   *
   * @param {Array|Object} data - The data to validate
   * @param {string} testType - The statistical test to be performed
   * @param {number} alpha - Significance level for assumption tests (default: 0.05)
   * @returns {Promise<Object>} Guardian report with violations and recommendations
   */
  async checkAssumptions(data, testType, alpha = 0.05) {
    try {
      const response = await fetch(`${API_BASE_URL}/check/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
          test_type: testType,
          alpha
        })
      });

      if (!response.ok) {
        throw new Error(`Guardian API error: ${response.statusText}`);
      }

      const report = await response.json();
      return report;
    } catch (error) {
      console.error('Guardian check failed:', error);
      throw error;
    }
  }

  /**
   * Check normality of data
   *
   * @param {Array} data - The data array to check
   * @param {number} alpha - Significance level (default: 0.05)
   * @returns {Promise<Object>} Normality test results
   */
  async checkNormality(data, alpha = 0.05) {
    try {
      const response = await fetch(`${API_BASE_URL}/validate/normality/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
          alpha
        })
      });

      if (!response.ok) {
        throw new Error(`Normality check error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Normality check failed:', error);
      throw error;
    }
  }

  /**
   * Detect outliers in data
   *
   * @param {Array} data - The data array to check
   * @returns {Promise<Object>} Outlier detection results
   */
  async detectOutliers(data) {
    try {
      const response = await fetch(`${API_BASE_URL}/detect/outliers/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data
        })
      });

      if (!response.ok) {
        throw new Error(`Outlier detection error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Outlier detection failed:', error);
      throw error;
    }
  }

  /**
   * Get assumption requirements for a specific test
   *
   * @param {string} testType - The statistical test type
   * @returns {Promise<Object>} Test requirements
   */
  async getTestRequirements(testType) {
    try {
      const response = await fetch(`${API_BASE_URL}/requirements/${testType}/`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Requirements fetch error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch test requirements:', error);
      throw error;
    }
  }

  /**
   * Get all available test requirements
   *
   * @returns {Promise<Object>} All test requirements
   */
  async getAllTestRequirements() {
    try {
      const response = await fetch(`${API_BASE_URL}/requirements/`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Requirements fetch error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch all test requirements:', error);
      throw error;
    }
  }

  /**
   * Health check for Guardian system
   *
   * @returns {Promise<Object>} Guardian system status
   */
  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/health/`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Health check error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Guardian health check failed:', error);
      throw error;
    }
  }

  /**
   * Auto-detect appropriate statistical tests based on data characteristics
   *
   * This is a higher-level function that:
   * 1. Analyzes data distribution (normal, non-normal, multimodal, etc.)
   * 2. Detects outliers
   * 3. Determines appropriate test categories (parametric vs non-parametric)
   * 4. Recommends specific tests
   *
   * @param {Array|Object} data - The data to analyze
   * @returns {Promise<Object>} Recommendations object
   */
  async autoDetectTests(data) {
    try {
      // Check normality first
      const dataArray = Array.isArray(data) ? data : Object.values(data)[0];
      const normalityResult = await this.checkNormality(dataArray);

      // Detect outliers
      const outlierResult = await this.detectOutliers(dataArray);

      // Determine recommendations
      const recommendations = {
        is_normal: normalityResult.is_normal,
        has_outliers: outlierResult.has_outliers,
        suggested_category: normalityResult.is_normal ? 'parametric' : 'non_parametric',
        suggested_tests: [],
        warnings: [],
        details: {
          normality: normalityResult.details,
          outliers: outlierResult.details
        }
      };

      // Add specific test recommendations
      if (normalityResult.is_normal && !outlierResult.has_outliers) {
        recommendations.suggested_tests = ['t_test', 'anova', 'pearson'];
        recommendations.warnings.push('Data appears suitable for parametric tests');
      } else if (!normalityResult.is_normal) {
        recommendations.suggested_tests = ['mann_whitney', 'kruskal_wallis', 'spearman'];
        recommendations.warnings.push('Non-normal distribution detected - use non-parametric tests');
      }

      if (outlierResult.has_outliers) {
        recommendations.suggested_tests.push('robust_regression');
        recommendations.warnings.push(`${outlierResult.details.outlier_count || 'Multiple'} outliers detected - consider robust methods`);
      }

      return recommendations;
    } catch (error) {
      console.error('Auto-detection failed:', error);
      throw error;
    }
  }

  /**
   * Map frontend test names to backend test types
   *
   * @param {string} frontendTestName - Test name used in frontend
   * @returns {string} Backend test type
   */
  mapTestName(frontendTestName) {
    const mapping = {
      // Parametric tests
      't-test': 't_test',
      'one-sample-t': 't_test',
      'independent-t': 't_test',
      'paired-t': 't_test',
      'anova': 'anova',
      'one-way-anova': 'anova',
      'pearson': 'pearson',
      'regression': 'regression',

      // Non-parametric tests
      'mann-whitney': 'mann_whitney',
      'wilcoxon': 'mann_whitney',
      'kruskal-wallis': 'kruskal_wallis',
      'spearman': 'pearson',  // Uses similar assumptions

      // Categorical tests
      'chi-square': 'chi_square',
      'fisher': 'chi_square'
    };

    return mapping[frontendTestName.toLowerCase()] || frontendTestName;
  }

  /**
   * Export validation report as PDF
   *
   * @param {Array|Object} data - The data to validate
   * @param {string} testType - The statistical test type
   * @param {number} alpha - Significance level (default: 0.05)
   * @returns {Promise<Blob>} PDF file as blob
   */
  async exportPDF(data, testType, alpha = 0.05) {
    try {
      const response = await fetch(`${API_BASE_URL}/export/pdf/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
          test_type: testType,
          alpha
        })
      });

      if (!response.ok) {
        throw new Error(`PDF export error: ${response.statusText}`);
      }

      // Get PDF blob
      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('PDF export failed:', error);
      throw error;
    }
  }

  /**
   * Export validation report as JSON
   *
   * @param {Array|Object} data - The data to validate
   * @param {string} testType - The statistical test type
   * @param {number} alpha - Significance level (default: 0.05)
   * @returns {Promise<Object>} Complete JSON validation report
   */
  async exportJSON(data, testType, alpha = 0.05) {
    try {
      const response = await fetch(`${API_BASE_URL}/export/json/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
          test_type: testType,
          alpha
        })
      });

      if (!response.ok) {
        throw new Error(`JSON export error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('JSON export failed:', error);
      throw error;
    }
  }

  /**
   * Helper function to trigger download of PDF report
   *
   * @param {Blob} pdfBlob - PDF file as blob
   * @param {string} testType - Test type for filename
   */
  downloadPDF(pdfBlob, testType) {
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `guardian_validation_report_${testType}_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Helper function to trigger download of JSON report
   *
   * @param {Object} jsonData - JSON report data
   * @param {string} testType - Test type for filename
   */
  downloadJSON(jsonData, testType) {
    const dataStr = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `guardian_validation_report_${testType}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

// Export singleton instance
const guardianService = new GuardianService();
export default guardianService;
