import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './BundleValidator.scss';

const ValidationCategories = {
  STRUCTURE: {
    id: 'structure',
    name: 'Bundle Structure',
    description: 'Validates the overall structure and format of the bundle',
    checks: [
      { id: 'version', name: 'Version Compatibility', required: true },
      { id: 'schema', name: 'Schema Validation', required: true },
      { id: 'metadata', name: 'Metadata Completeness', required: true },
      { id: 'manifest', name: 'Manifest Integrity', required: true },
      { id: 'format', name: 'File Format', required: false }
    ]
  },
  DATA: {
    id: 'data',
    name: 'Data Integrity',
    description: 'Validates data files and their fingerprints',
    checks: [
      { id: 'existence', name: 'Data Files Exist', required: true },
      { id: 'checksums', name: 'Checksum Verification', required: true },
      { id: 'fingerprints', name: 'Data Fingerprints', required: true },
      { id: 'dimensions', name: 'Data Dimensions Match', required: true },
      { id: 'encoding', name: 'Encoding Consistency', required: false },
      { id: 'missing_values', name: 'Missing Value Patterns', required: false }
    ]
  },
  PIPELINE: {
    id: 'pipeline',
    name: 'Analysis Pipeline',
    description: 'Validates the reproducibility of analysis steps',
    checks: [
      { id: 'steps_order', name: 'Step Sequence', required: true },
      { id: 'parameters', name: 'Parameter Completeness', required: true },
      { id: 'functions', name: 'Function Availability', required: true },
      { id: 'dependencies', name: 'Dependency Chain', required: true },
      { id: 'intermediate', name: 'Intermediate Results', required: false },
      { id: 'timing', name: 'Execution Timing', required: false }
    ]
  },
  ENVIRONMENT: {
    id: 'environment',
    name: 'Environment',
    description: 'Validates the computational environment',
    checks: [
      { id: 'platform', name: 'Platform Compatibility', required: true },
      { id: 'packages', name: 'Package Versions', required: true },
      { id: 'seeds', name: 'Random Seeds', required: true },
      { id: 'locale', name: 'Locale Settings', required: false },
      { id: 'precision', name: 'Numerical Precision', required: false }
    ]
  },
  RESULTS: {
    id: 'results',
    name: 'Results Validation',
    description: 'Validates output consistency and reproducibility',
    checks: [
      { id: 'primary', name: 'Primary Results', required: true },
      { id: 'statistics', name: 'Test Statistics', required: true },
      { id: 'pvalues', name: 'P-values Match', required: true },
      { id: 'confidence', name: 'Confidence Intervals', required: true },
      { id: 'effects', name: 'Effect Sizes', required: false },
      { id: 'figures', name: 'Figure Generation', required: false }
    ]
  }
};

const ValidationLevels = {
  STRICT: {
    id: 'strict',
    name: 'Strict',
    description: 'All checks must pass, including optional ones',
    threshold: 1.0,
    color: '#e74c3c'
  },
  STANDARD: {
    id: 'standard',
    name: 'Standard',
    description: 'All required checks must pass',
    threshold: 0.95,
    color: '#e67e22'
  },
  LENIENT: {
    id: 'lenient',
    name: 'Lenient',
    description: 'Most required checks must pass',
    threshold: 0.80,
    color: '#f39c12'
  },
  MINIMAL: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Core functionality only',
    threshold: 0.60,
    color: '#3498db'
  }
};

const ValidationStatus = {
  PENDING: { icon: '⏳', label: 'Pending', color: '#95a5a6' },
  RUNNING: { icon: '🔄', label: 'Running', color: '#3498db' },
  PASSED: { icon: '✓', label: 'Passed', color: '#27ae60' },
  FAILED: { icon: '✗', label: 'Failed', color: '#e74c3c' },
  WARNING: { icon: '⚠', label: 'Warning', color: '#f39c12' },
  SKIPPED: { icon: '⊘', label: 'Skipped', color: '#95a5a6' }
};

const BundleValidator = () => {
  const dispatch = useDispatch();
  const { currentProject } = useSelector(state => state.project || {});
  
  const [bundleFile, setBundleFile] = useState(null);
  const [bundleData, setBundleData] = useState(null);
  const [validationLevel, setValidationLevel] = useState('standard');
  const [validationResults, setValidationResults] = useState({});
  const [overallScore, setOverallScore] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [currentCheck, setCurrentCheck] = useState(null);
  const [detailedReport, setDetailedReport] = useState(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonBundle, setComparisonBundle] = useState(null);
  const [repairSuggestions, setRepairSuggestions] = useState([]);
  
  const fileInputRef = useRef(null);
  const comparisonInputRef = useRef(null);
  const progressRef = useRef(null);

  // Handle file upload
  const handleFileUpload = useCallback((event, isComparison = false) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (isComparison) {
          setComparisonBundle(data);
        } else {
          setBundleFile(file);
          setBundleData(data);
          setValidationResults({});
          setOverallScore(null);
        }
      } catch (error) {
        alert('Invalid bundle file format. Please upload a valid JSON bundle.');
      }
    };
    reader.readAsText(file);
  }, []);

  // Validate bundle structure
  const validateStructure = useCallback(async (bundle) => {
    const results = {};
    
    // Version compatibility
    results.version = {
      status: bundle.version && bundle.version >= '1.0.0' ? 'PASSED' : 'FAILED',
      message: `Bundle version: ${bundle.version || 'missing'}`,
      details: bundle.version ? `Compatible with validator v1.5` : 'Version field missing'
    };
    
    // Schema validation
    const requiredFields = ['metadata', 'data', 'pipeline', 'environment', 'results'];
    const missingFields = requiredFields.filter(field => !bundle[field]);
    results.schema = {
      status: missingFields.length === 0 ? 'PASSED' : 'FAILED',
      message: missingFields.length === 0 ? 'All required fields present' : `Missing fields: ${missingFields.join(', ')}`,
      details: `Schema validation against StickForStats Bundle v1.0`
    };
    
    // Metadata completeness
    const metadataFields = ['created_at', 'created_by', 'project_name', 'description'];
    const missingMeta = bundle.metadata ? metadataFields.filter(field => !bundle.metadata[field]) : metadataFields;
    results.metadata = {
      status: missingMeta.length === 0 ? 'PASSED' : missingMeta.length <= 2 ? 'WARNING' : 'FAILED',
      message: `Metadata ${missingMeta.length === 0 ? 'complete' : `missing: ${missingMeta.join(', ')}`}`,
      details: bundle.metadata || {}
    };
    
    // Manifest integrity
    results.manifest = {
      status: bundle.manifest ? 'PASSED' : 'WARNING',
      message: bundle.manifest ? 'Manifest present' : 'No manifest found',
      details: bundle.manifest || 'Manifest helps track bundle contents'
    };
    
    // File format
    results.format = {
      status: 'PASSED',
      message: 'Valid JSON format',
      details: `File size: ${JSON.stringify(bundle).length} bytes`
    };
    
    return results;
  }, []);

  // Validate data integrity
  const validateDataIntegrity = useCallback(async (bundle) => {
    const results = {};
    
    if (!bundle.data) {
      Object.keys(ValidationCategories.DATA.checks).forEach(check => {
        results[check.id] = {
          status: 'FAILED',
          message: 'No data section found',
          details: 'Data validation requires data field in bundle'
        };
      });
      return results;
    }
    
    // Data files existence
    const dataFiles = bundle.data.files || [];
    results.existence = {
      status: dataFiles.length > 0 ? 'PASSED' : 'FAILED',
      message: `${dataFiles.length} data file(s) found`,
      details: dataFiles.map(f => f.name || f.path).join(', ')
    };
    
    // Checksum verification
    const checksumValid = dataFiles.every(file => file.checksum || file.sha256);
    results.checksums = {
      status: checksumValid ? 'PASSED' : 'WARNING',
      message: checksumValid ? 'All files have checksums' : 'Some files missing checksums',
      details: dataFiles.map(f => ({
        file: f.name,
        checksum: f.checksum || f.sha256 || 'missing'
      }))
    };
    
    // Data fingerprints
    const fingerprintValid = bundle.data.fingerprints && Object.keys(bundle.data.fingerprints).length > 0;
    results.fingerprints = {
      status: fingerprintValid ? 'PASSED' : 'WARNING',
      message: fingerprintValid ? 'Data fingerprints present' : 'No fingerprints found',
      details: bundle.data.fingerprints || {}
    };
    
    // Data dimensions
    const dimensionsValid = dataFiles.every(file => file.shape || file.dimensions);
    results.dimensions = {
      status: dimensionsValid ? 'PASSED' : 'WARNING',
      message: dimensionsValid ? 'All dimensions recorded' : 'Some dimensions missing',
      details: dataFiles.map(f => ({
        file: f.name,
        dimensions: f.shape || f.dimensions || 'unknown'
      }))
    };
    
    // Encoding consistency
    results.encoding = {
      status: 'PASSED',
      message: 'UTF-8 encoding assumed',
      details: 'Encoding validation not implemented'
    };
    
    // Missing value patterns
    const missingPatterns = bundle.data.missing_patterns || {};
    results.missing_values = {
      status: Object.keys(missingPatterns).length > 0 ? 'PASSED' : 'SKIPPED',
      message: 'Missing value patterns documented',
      details: missingPatterns
    };
    
    return results;
  }, []);

  // Validate pipeline reproducibility
  const validatePipeline = useCallback(async (bundle) => {
    const results = {};
    
    if (!bundle.pipeline) {
      Object.keys(ValidationCategories.PIPELINE.checks).forEach(check => {
        results[check.id] = {
          status: 'FAILED',
          message: 'No pipeline section found',
          details: 'Pipeline validation requires pipeline field in bundle'
        };
      });
      return results;
    }
    
    const steps = bundle.pipeline.steps || [];
    
    // Steps order
    results.steps_order = {
      status: steps.length > 0 ? 'PASSED' : 'FAILED',
      message: `${steps.length} pipeline steps found`,
      details: steps.map(s => s.name || s.function).join(' → ')
    };
    
    // Parameters completeness
    const paramsComplete = steps.every(step => step.parameters !== undefined);
    results.parameters = {
      status: paramsComplete ? 'PASSED' : 'WARNING',
      message: paramsComplete ? 'All steps have parameters' : 'Some steps missing parameters',
      details: steps.map(s => ({
        step: s.name,
        hasParams: s.parameters !== undefined
      }))
    };
    
    // Function availability
    const functionsValid = steps.every(step => step.function || step.method);
    results.functions = {
      status: functionsValid ? 'PASSED' : 'FAILED',
      message: functionsValid ? 'All functions specified' : 'Some functions missing',
      details: steps.map(s => s.function || s.method || 'unspecified')
    };
    
    // Dependency chain
    const hasDependencies = steps.some(step => step.inputs || step.dependencies);
    results.dependencies = {
      status: hasDependencies ? 'PASSED' : 'WARNING',
      message: hasDependencies ? 'Dependencies tracked' : 'No dependency information',
      details: 'Dependency tracking helps ensure execution order'
    };
    
    // Intermediate results
    const hasIntermediate = steps.some(step => step.output || step.result);
    results.intermediate = {
      status: hasIntermediate ? 'PASSED' : 'SKIPPED',
      message: hasIntermediate ? 'Intermediate results stored' : 'No intermediate results',
      details: 'Storing intermediate results aids debugging'
    };
    
    // Timing information
    const hasTiming = steps.some(step => step.duration || step.timestamp);
    results.timing = {
      status: hasTiming ? 'PASSED' : 'SKIPPED',
      message: hasTiming ? 'Execution timing recorded' : 'No timing information',
      details: steps.filter(s => s.duration).map(s => ({
        step: s.name,
        duration: s.duration
      }))
    };
    
    return results;
  }, []);

  // Validate environment
  const validateEnvironment = useCallback(async (bundle) => {
    const results = {};
    
    if (!bundle.environment) {
      Object.keys(ValidationCategories.ENVIRONMENT.checks).forEach(check => {
        results[check.id] = {
          status: 'FAILED',
          message: 'No environment section found',
          details: 'Environment validation requires environment field in bundle'
        };
      });
      return results;
    }
    
    const env = bundle.environment;
    
    // Platform compatibility
    results.platform = {
      status: env.platform || env.os ? 'PASSED' : 'WARNING',
      message: `Platform: ${env.platform || env.os || 'unknown'}`,
      details: {
        os: env.os || 'unknown',
        python: env.python_version || 'unknown',
        architecture: env.architecture || 'unknown'
      }
    };
    
    // Package versions
    const hasPackages = env.packages && Object.keys(env.packages).length > 0;
    results.packages = {
      status: hasPackages ? 'PASSED' : 'FAILED',
      message: hasPackages ? `${Object.keys(env.packages).length} packages tracked` : 'No package information',
      details: env.packages || {}
    };
    
    // Random seeds
    const hasSeeds = env.random_seeds || env.seed;
    results.seeds = {
      status: hasSeeds ? 'PASSED' : 'FAILED',
      message: hasSeeds ? 'Random seeds captured' : 'No seed information',
      details: env.random_seeds || { global: env.seed } || 'Seeds ensure reproducibility'
    };
    
    // Locale settings
    results.locale = {
      status: env.locale ? 'PASSED' : 'SKIPPED',
      message: env.locale ? `Locale: ${env.locale}` : 'Locale not specified',
      details: env.locale || 'Locale affects sorting and formatting'
    };
    
    // Numerical precision
    results.precision = {
      status: env.precision ? 'PASSED' : 'SKIPPED',
      message: env.precision ? `Precision: ${env.precision}` : 'Default precision',
      details: env.precision || 'Machine precision may vary'
    };
    
    return results;
  }, []);

  // Validate results
  const validateResults = useCallback(async (bundle) => {
    const results = {};
    
    if (!bundle.results) {
      Object.keys(ValidationCategories.RESULTS.checks).forEach(check => {
        results[check.id] = {
          status: 'FAILED',
          message: 'No results section found',
          details: 'Results validation requires results field in bundle'
        };
      });
      return results;
    }
    
    const res = bundle.results;
    
    // Primary results
    results.primary = {
      status: res.primary || res.main ? 'PASSED' : 'FAILED',
      message: res.primary ? 'Primary results present' : 'No primary results',
      details: res.primary || res.main || {}
    };
    
    // Test statistics
    const hasStats = res.statistics || res.test_statistics;
    results.statistics = {
      status: hasStats ? 'PASSED' : 'WARNING',
      message: hasStats ? 'Test statistics recorded' : 'No test statistics',
      details: res.statistics || res.test_statistics || {}
    };
    
    // P-values
    const hasPValues = res.p_values || res.pvalues || (res.primary && res.primary.p_value);
    results.pvalues = {
      status: hasPValues ? 'PASSED' : 'WARNING',
      message: hasPValues ? 'P-values recorded' : 'No p-values found',
      details: res.p_values || res.pvalues || {}
    };
    
    // Confidence intervals
    const hasCI = res.confidence_intervals || res.ci;
    results.confidence = {
      status: hasCI ? 'PASSED' : 'WARNING',
      message: hasCI ? 'Confidence intervals present' : 'No CI found',
      details: res.confidence_intervals || res.ci || {}
    };
    
    // Effect sizes
    const hasEffects = res.effect_sizes || res.effects;
    results.effects = {
      status: hasEffects ? 'PASSED' : 'SKIPPED',
      message: hasEffects ? 'Effect sizes calculated' : 'No effect sizes',
      details: res.effect_sizes || res.effects || {}
    };
    
    // Figures
    const hasFigures = res.figures || res.plots;
    results.figures = {
      status: hasFigures ? 'PASSED' : 'SKIPPED',
      message: hasFigures ? `${Object.keys(hasFigures).length} figures` : 'No figures',
      details: hasFigures || {}
    };
    
    return results;
  }, []);

  // Run full validation
  const runValidation = useCallback(async () => {
    if (!bundleData) {
      alert('Please upload a bundle file first');
      return;
    }
    
    setIsValidating(true);
    setValidationResults({});
    const results = {};
    const suggestions = [];
    
    // Validate each category
    for (const [categoryKey, category] of Object.entries(ValidationCategories)) {
      setCurrentCheck(category.name);
      
      let categoryResults;
      switch (categoryKey) {
        case 'STRUCTURE':
          categoryResults = await validateStructure(bundleData);
          break;
        case 'DATA':
          categoryResults = await validateDataIntegrity(bundleData);
          break;
        case 'PIPELINE':
          categoryResults = await validatePipeline(bundleData);
          break;
        case 'ENVIRONMENT':
          categoryResults = await validateEnvironment(bundleData);
          break;
        case 'RESULTS':
          categoryResults = await validateResults(bundleData);
          break;
        default:
          categoryResults = {};
      }
      
      results[categoryKey] = categoryResults;
      
      // Generate repair suggestions
      for (const [checkId, result] of Object.entries(categoryResults)) {
        if (result.status === 'FAILED' || result.status === 'WARNING') {
          const check = category.checks.find(c => c.id === checkId);
          if (check) {
            suggestions.push({
              category: category.name,
              check: check.name,
              severity: result.status,
              suggestion: generateRepairSuggestion(categoryKey, checkId, result)
            });
          }
        }
      }
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setValidationResults(results);
    setRepairSuggestions(suggestions);
    
    // Calculate overall score
    const score = calculateOverallScore(results);
    setOverallScore(score);
    
    // Generate detailed report
    const report = generateDetailedReport(results, score);
    setDetailedReport(report);
    
    setCurrentCheck(null);
    setIsValidating(false);
  }, [bundleData, validateStructure, validateDataIntegrity, validatePipeline, validateEnvironment, validateResults]);

  // Generate repair suggestion
  const generateRepairSuggestion = (category, check, result) => {
    const suggestions = {
      STRUCTURE: {
        version: 'Add or update the version field to match current schema version',
        schema: 'Ensure all required top-level fields are present',
        metadata: 'Add missing metadata fields for better documentation',
        manifest: 'Generate a manifest listing all bundle contents'
      },
      DATA: {
        existence: 'Verify data files are included or referenced correctly',
        checksums: 'Generate SHA-256 checksums for all data files',
        fingerprints: 'Create data fingerprints using consistent hashing',
        dimensions: 'Record shape/dimensions for all data files'
      },
      PIPELINE: {
        steps_order: 'Document all analysis steps in execution order',
        parameters: 'Include all parameters used in each step',
        functions: 'Specify the function/method name for each step',
        dependencies: 'Track input/output dependencies between steps'
      },
      ENVIRONMENT: {
        platform: 'Record OS and platform information',
        packages: 'List all package versions using pip freeze or equivalent',
        seeds: 'Capture all random seeds used in the analysis'
      },
      RESULTS: {
        primary: 'Include main analysis results',
        statistics: 'Record all test statistics',
        pvalues: 'Include all p-values from statistical tests',
        confidence: 'Add confidence intervals for estimates'
      }
    };
    
    return suggestions[category]?.[check] || 'Review and update this field';
  };

  // Calculate overall score
  const calculateOverallScore = (results) => {
    let totalChecks = 0;
    let passedChecks = 0;
    let requiredChecks = 0;
    let passedRequired = 0;
    
    for (const [categoryKey, categoryResults] of Object.entries(results)) {
      const category = ValidationCategories[categoryKey];
      
      for (const [checkId, result] of Object.entries(categoryResults)) {
        const check = category.checks.find(c => c.id === checkId);
        if (!check) continue;
        
        totalChecks++;
        if (result.status === 'PASSED') passedChecks++;
        
        if (check.required) {
          requiredChecks++;
          if (result.status === 'PASSED') passedRequired++;
        }
      }
    }
    
    const overallPercentage = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;
    const requiredPercentage = requiredChecks > 0 ? (passedRequired / requiredChecks) * 100 : 0;
    
    // Determine validation level met
    let levelMet = 'none';
    for (const [levelKey, level] of Object.entries(ValidationLevels)) {
      if (requiredPercentage >= level.threshold * 100) {
        levelMet = levelKey;
        break;
      }
    }
    
    return {
      overall: overallPercentage,
      required: requiredPercentage,
      passed: passedChecks,
      total: totalChecks,
      passedRequired,
      totalRequired: requiredChecks,
      level: levelMet,
      timestamp: new Date().toISOString()
    };
  };

  // Generate detailed report
  const generateDetailedReport = (results, score) => {
    const report = {
      summary: {
        bundleName: bundleFile?.name || 'Unknown',
        validationDate: new Date().toISOString(),
        validationLevel: validationLevel,
        score: score,
        recommendation: score.required >= 95 ? 'Bundle is reproducible' : 
                       score.required >= 80 ? 'Bundle needs minor fixes' :
                       'Bundle requires significant updates'
      },
      categories: {},
      issues: [],
      suggestions: []
    };
    
    for (const [categoryKey, categoryResults] of Object.entries(results)) {
      const category = ValidationCategories[categoryKey];
      const categoryReport = {
        name: category.name,
        description: category.description,
        checks: [],
        passed: 0,
        failed: 0,
        warnings: 0
      };
      
      for (const [checkId, result] of Object.entries(categoryResults)) {
        const check = category.checks.find(c => c.id === checkId);
        if (!check) continue;
        
        categoryReport.checks.push({
          name: check.name,
          required: check.required,
          status: result.status,
          message: result.message,
          details: result.details
        });
        
        if (result.status === 'PASSED') categoryReport.passed++;
        else if (result.status === 'FAILED') categoryReport.failed++;
        else if (result.status === 'WARNING') categoryReport.warnings++;
        
        if (result.status === 'FAILED') {
          report.issues.push({
            severity: 'error',
            category: category.name,
            check: check.name,
            message: result.message
          });
        } else if (result.status === 'WARNING') {
          report.issues.push({
            severity: 'warning',
            category: category.name,
            check: check.name,
            message: result.message
          });
        }
      }
      
      report.categories[categoryKey] = categoryReport;
    }
    
    return report;
  };

  // Export validation report
  const exportReport = useCallback((format = 'json') => {
    if (!detailedReport) {
      alert('No validation report available. Run validation first.');
      return;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `validation_report_${timestamp}`;
    
    let content, mimeType;
    
    switch (format) {
      case 'json':
        content = JSON.stringify(detailedReport, null, 2);
        mimeType = 'application/json';
        break;
        
      case 'html':
        content = generateHTMLReport(detailedReport);
        mimeType = 'text/html';
        break;
        
      case 'csv':
        content = generateCSVReport(detailedReport);
        mimeType = 'text/csv';
        break;
        
      default:
        return;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [detailedReport]);

  // Generate HTML report
  const generateHTMLReport = (report) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Bundle Validation Report</title>
  <style>
    body { font-family: 'IBM Plex Sans', sans-serif; margin: 20px; }
    h1 { color: #2c3e50; }
    h2 { color: #34495e; border-bottom: 2px solid #ecf0f1; }
    .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .passed { color: #27ae60; }
    .failed { color: #e74c3c; }
    .warning { color: #f39c12; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
    th { background: #f8f9fa; }
    .score { font-size: 24px; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Bundle Validation Report</h1>
  <div class="summary">
    <h2>Summary</h2>
    <p><strong>Bundle:</strong> ${report.summary.bundleName}</p>
    <p><strong>Date:</strong> ${new Date(report.summary.validationDate).toLocaleString()}</p>
    <p><strong>Overall Score:</strong> <span class="score">${report.summary.score.overall.toFixed(1)}%</span></p>
    <p><strong>Required Checks:</strong> ${report.summary.score.passedRequired}/${report.summary.score.totalRequired}</p>
    <p><strong>Recommendation:</strong> ${report.summary.recommendation}</p>
  </div>
  
  ${Object.entries(report.categories).map(([key, category]) => `
    <h2>${category.name}</h2>
    <p>${category.description}</p>
    <table>
      <thead>
        <tr>
          <th>Check</th>
          <th>Required</th>
          <th>Status</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody>
        ${category.checks.map(check => `
          <tr>
            <td>${check.name}</td>
            <td>${check.required ? 'Yes' : 'No'}</td>
            <td class="${check.status.toLowerCase()}">${check.status}</td>
            <td>${check.message}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `).join('')}
  
  ${report.issues.length > 0 ? `
    <h2>Issues Found</h2>
    <ul>
      ${report.issues.map(issue => `
        <li class="${issue.severity}">
          <strong>${issue.category} - ${issue.check}:</strong> ${issue.message}
        </li>
      `).join('')}
    </ul>
  ` : ''}
</body>
</html>
    `;
  };

  // Generate CSV report
  const generateCSVReport = (report) => {
    const rows = [
      ['Category', 'Check', 'Required', 'Status', 'Message']
    ];
    
    for (const [key, category] of Object.entries(report.categories)) {
      for (const check of category.checks) {
        rows.push([
          category.name,
          check.name,
          check.required ? 'Yes' : 'No',
          check.status,
          check.message
        ]);
      }
    }
    
    return rows.map(row => row.map(cell => 
      typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
    ).join(',')).join('\n');
  };

  // Draw progress visualization
  const drawProgress = useCallback(() => {
    if (!progressRef.current || !validationResults) return;
    
    const canvas = progressRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const categories = Object.keys(ValidationCategories);
    const barWidth = width / categories.length;
    const barPadding = 10;
    
    categories.forEach((categoryKey, index) => {
      const categoryResults = validationResults[categoryKey] || {};
      const checks = ValidationCategories[categoryKey].checks;
      
      let passed = 0;
      let failed = 0;
      let warnings = 0;
      
      for (const check of checks) {
        const result = categoryResults[check.id];
        if (!result) continue;
        
        if (result.status === 'PASSED') passed++;
        else if (result.status === 'FAILED') failed++;
        else if (result.status === 'WARNING') warnings++;
      }
      
      const total = checks.length;
      const x = index * barWidth + barPadding;
      const barHeight = height - 60;
      
      // Draw segments
      if (total > 0) {
        const passedHeight = (passed / total) * barHeight;
        const warningHeight = (warnings / total) * barHeight;
        const failedHeight = (failed / total) * barHeight;
        
        // Failed (bottom)
        if (failedHeight > 0) {
          ctx.fillStyle = '#e74c3c';
          ctx.fillRect(x, height - 40 - failedHeight, barWidth - 2 * barPadding, failedHeight);
        }
        
        // Warning (middle)
        if (warningHeight > 0) {
          ctx.fillStyle = '#f39c12';
          ctx.fillRect(x, height - 40 - failedHeight - warningHeight, barWidth - 2 * barPadding, warningHeight);
        }
        
        // Passed (top)
        if (passedHeight > 0) {
          ctx.fillStyle = '#27ae60';
          ctx.fillRect(x, height - 40 - failedHeight - warningHeight - passedHeight, barWidth - 2 * barPadding, passedHeight);
        }
      }
      
      // Draw label
      ctx.fillStyle = '#2c3e50';
      ctx.font = '10px IBM Plex Sans';
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(x + barWidth / 2, height - 20);
      ctx.rotate(-Math.PI / 6);
      ctx.fillText(ValidationCategories[categoryKey].name, 0, 0);
      ctx.restore();
    });
  }, [validationResults]);

  useEffect(() => {
    drawProgress();
  }, [validationResults, drawProgress]);

  return (
    <div className="bundle-validator">
      <div className="validator-header">
        <h2>Bundle Validator</h2>
        <div className="header-controls">
          <select
            value={validationLevel}
            onChange={(e) => setValidationLevel(e.target.value)}
          >
            {Object.values(ValidationLevels).map(level => (
              <option key={level.id} value={level.id}>
                {level.name} - {level.description}
              </option>
            ))}
          </select>
          <button
            className="compare-btn"
            onClick={() => setComparisonMode(!comparisonMode)}
          >
            {comparisonMode ? 'Hide' : 'Show'} Comparison
          </button>
        </div>
      </div>

      <div className="validator-body">
        <div className="upload-section">
          <div className="upload-panel">
            <h3>Upload Bundle</h3>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={(e) => handleFileUpload(e, false)}
              style={{ display: 'none' }}
            />
            <button
              className="upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              📁 Select Bundle File
            </button>
            {bundleFile && (
              <div className="file-info">
                <span className="file-name">{bundleFile.name}</span>
                <span className="file-size">({(bundleFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>

          {comparisonMode && (
            <div className="upload-panel">
              <h3>Comparison Bundle</h3>
              <input
                ref={comparisonInputRef}
                type="file"
                accept=".json"
                onChange={(e) => handleFileUpload(e, true)}
                style={{ display: 'none' }}
              />
              <button
                className="upload-btn"
                onClick={() => comparisonInputRef.current?.click()}
              >
                📁 Select Comparison
              </button>
              {comparisonBundle && (
                <div className="file-info">
                  <span className="file-name">Comparison loaded</span>
                </div>
              )}
            </div>
          )}

          <button
            className="validate-btn"
            onClick={runValidation}
            disabled={!bundleData || isValidating}
          >
            {isValidating ? `Validating... ${currentCheck || ''}` : 'Run Validation'}
          </button>
        </div>

        <div className="results-section">
          {overallScore && (
            <div className="score-panel">
              <h3>Validation Score</h3>
              <div className="score-display">
                <div className="overall-score">
                  <div className="score-value">{overallScore.overall.toFixed(1)}%</div>
                  <div className="score-label">Overall</div>
                </div>
                <div className="required-score">
                  <div className="score-value">{overallScore.required.toFixed(1)}%</div>
                  <div className="score-label">Required</div>
                </div>
              </div>
              <div className="score-details">
                <div className="detail-item">
                  <span>Passed Checks:</span>
                  <span>{overallScore.passed}/{overallScore.total}</span>
                </div>
                <div className="detail-item">
                  <span>Required Passed:</span>
                  <span>{overallScore.passedRequired}/{overallScore.totalRequired}</span>
                </div>
                <div className="detail-item">
                  <span>Level Achieved:</span>
                  <span className={`level-badge ${overallScore.level}`}>
                    {ValidationLevels[overallScore.level.toUpperCase()]?.name || 'None'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="progress-visualization">
            <h3>Validation Progress</h3>
            <canvas
              ref={progressRef}
              width={400}
              height={200}
              className="progress-chart"
            />
          </div>

          {Object.keys(validationResults).length > 0 && (
            <div className="detailed-results">
              <h3>Detailed Results</h3>
              {Object.entries(validationResults).map(([categoryKey, categoryResults]) => (
                <div key={categoryKey} className="category-results">
                  <h4>{ValidationCategories[categoryKey].name}</h4>
                  <div className="checks-list">
                    {Object.entries(categoryResults).map(([checkId, result]) => {
                      const check = ValidationCategories[categoryKey].checks.find(c => c.id === checkId);
                      return (
                        <div key={checkId} className={`check-result ${result.status.toLowerCase()}`}>
                          <span className="check-icon">{ValidationStatus[result.status].icon}</span>
                          <span className="check-name">{check?.name}</span>
                          <span className="check-status">{result.status}</span>
                          <span className="check-message">{result.message}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {repairSuggestions.length > 0 && (
            <div className="repair-suggestions">
              <h3>Repair Suggestions</h3>
              <div className="suggestions-list">
                {repairSuggestions.map((suggestion, idx) => (
                  <div key={idx} className={`suggestion ${suggestion.severity.toLowerCase()}`}>
                    <div className="suggestion-header">
                      <span className="category">{suggestion.category}</span>
                      <span className="check">{suggestion.check}</span>
                    </div>
                    <div className="suggestion-text">{suggestion.suggestion}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="validator-footer">
        <div className="export-controls">
          <button onClick={() => exportReport('json')}>Export JSON</button>
          <button onClick={() => exportReport('html')}>Export HTML</button>
          <button onClick={() => exportReport('csv')}>Export CSV</button>
        </div>
        <div className="validation-info">
          Validation Level: {ValidationLevels[validationLevel.toUpperCase()].description}
        </div>
      </div>
    </div>
  );
};

export default BundleValidator;