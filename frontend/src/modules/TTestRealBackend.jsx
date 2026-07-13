/**
 * T-Test Module with REAL Backend Integration - PROFESSIONAL UI
 * ==============================================================
 * This module uses actual backend calculations with 50-decimal precision
 * Now with Professional UI featuring dark mode, gradients, and glass effects
 */

import React, { useState } from 'react';
import {
  Paper, Typography, TextField, Button, Grid,
  Card, CardContent, Alert, CircularProgress, Box,
  FormControl, InputLabel, Select, MenuItem, Divider,
  Chip, Fade, Zoom, Grow
} from '@mui/material';
import {
  Calculate, Clear,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { HighPrecisionStatisticalService } from '../services/HighPrecisionStatisticalService';
import ProfessionalContainer from '../components/common/ProfessionalContainer';
import { getApiUrl, endpoints } from '../config/apiConfig';

// Guardian Design Contract compliance
// "No statistical result may exist without an explicit, traceable assumption context."
import useGuardianReport from '../hooks/useGuardianReport';
import { GuardianReportDisplay, GuardianBadge } from '../components/Guardian';
import { isSignificant } from '../utils/formatStats';

/**
 * "N decimal places" for a 50-digit decimal STRING from the backend -- and an em dash when there
 * is no statistic. This used to be `results.t_statistic.split('.')[1]?.length || 0`, which throws
 * on null: a white screen the moment the backend honestly reported that t did not exist.
 */
const decimalPlacesLabel = (value) => {
  if (value === null || value === undefined) return 'no statistic';
  const decimals = String(value).split('.')[1]?.length || 0;
  return `${decimals} decimal places`;
};

/**
 * `null < 0.05` is TRUE in JavaScript, so a missing p-value used to render as "Significant".
 */
const significanceLabel = (pValue) => {
  const verdict = isSignificant(Number(pValue));
  if (pValue === null || pValue === undefined || verdict === null) return 'No p-value';
  return verdict ? 'Significant' : 'Not Significant';
};

const TTestRealBackend = () => {
  // Data state
  const [sample1, setSample1] = useState('');
  const [sample2, setSample2] = useState('');
  const [testType, setTestType] = useState('two_sample');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [assumptions, setAssumptions] = useState(null);
  const [animationKey, setAnimationKey] = useState(0);

  // Get dark mode state from local storage
  const [darkMode] = useState(() => {
    const saved = localStorage.getItem('professionalDarkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Guardian context for Design Contract compliance
  const resultsGuardian = useGuardianReport(results);

  // Service instance
  const service = new HighPrecisionStatisticalService();

  // Parse data helper
  const parseData = (dataString) => {
    if (!dataString.trim()) return null;
    return dataString
      .split(',')
      .map(val => parseFloat(val.trim()))
      .filter(val => !isNaN(val));
  };

  // Load example data (REAL data, not simulated)
  const loadExampleData = () => {
    // Medical study: Blood pressure control vs treatment
    setSample1('120, 125, 130, 128, 132, 127, 131, 129, 126, 133');
    setSample2('140, 138, 142, 145, 139, 143, 141, 144, 137, 146');
    setAnimationKey(prev => prev + 1); // Trigger re-animation
  };

  // Perform REAL calculation using backend
  const performRealCalculation = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setAssumptions(null);

    try {
      const data1 = parseData(sample1);
      const data2 = parseData(sample2);

      if (!data1 || data1.length < 2) {
        throw new Error('Sample 1 must have at least 2 values');
      }
      if (testType === 'two_sample' && (!data2 || data2.length < 2)) {
        throw new Error('Sample 2 must have at least 2 values');
      }

      // Call REAL backend API with 50 decimal precision
      const response = await service.performTTest({
        data1: data1,
        data2: data2,
        test_type: testType,
        options: {
          check_assumptions: true,
          validate_results: true,
          compare_standard: true
        }
      });

      // Extract high-precision results
      setResults(response.high_precision_result);
      setAssumptions(response.assumptions);

      // Show precision achieved
      // High precision results achieved

    } catch (err) {
      setError(err.message || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  // Check assumptions using backend
  const checkAssumptions = async () => {
    if (!results) return;

    try {
      const response = await fetch(getApiUrl(endpoints.assumptions.checkAll), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data1: parseData(sample1),
          data2: parseData(sample2),
          test: 't-test'
        })
      });

      const assumptionResults = await response.json();
      setAssumptions(assumptionResults);
    } catch (err) {
      console.error('Assumption check failed:', err);
    }
  };

  // Render results with 50 decimal precision
  const renderResults = () => {
    if (!results) return null;

    return (
      <Fade in timeout={800}>
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AssessmentIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  Results (50 Decimal Precision)
                </Typography>
              </Box>
              {resultsGuardian.hasGuardianContext && (
                <GuardianBadge
                  confidenceScore={resultsGuardian.confidenceScore}
                  violations={resultsGuardian.violations}
                  canProceed={resultsGuardian.canProceed}
                />
              )}
            </Box>
            <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Zoom in timeout={600}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    T-Statistic
                  </Typography>
                  <Typography variant="h6" sx={{
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                    color: 'primary.main',
                    fontWeight: 700
                  }}>
                    {results.t_statistic ?? '\u2014'}
                  </Typography>
                  {/* `results.t_statistic.split(...)` threw a TypeError -- a white screen -- the
                      moment the backend honestly reported a null statistic (identical constant
                      groups: t = 0/0). */}
                  <Chip
                    label={decimalPlacesLabel(results.t_statistic)}
                    color="success"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Paper>
              </Zoom>
            </Grid>

            <Grid item xs={12} md={6}>
              <Zoom in timeout={800}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    P-Value
                  </Typography>
                  <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
                    {results.p_value ?? '\u2014'}
                  </Typography>
                  <Chip
                    label={significanceLabel(results.p_value)}
                    color={
                      isSignificant(Number(results.p_value)) === null
                        ? 'default'
                        : isSignificant(Number(results.p_value))
                          ? 'success'
                          : 'warning'
                    }
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Paper>
              </Zoom>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="textSecondary">
                Mean Difference
              </Typography>
              <Typography variant="body1">
                {results.mean_difference || 'N/A'}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="textSecondary">
                Degrees of Freedom
              </Typography>
              <Typography variant="body1">
                {results.degrees_of_freedom || results.df}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="textSecondary">
                Confidence Interval (95%)
              </Typography>
              <Typography variant="body1">
                [{results.ci_lower || 'N/A'}, {results.ci_upper || 'N/A'}]
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="textSecondary">
                Effect Size (Cohen's d)
              </Typography>
              <Typography variant="body1">
                {results.effect_size || 'N/A'}
              </Typography>
            </Grid>
          </Grid>

          {/* Show comparison with standard precision */}
          {results.comparison && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Precision Improvement:</strong> {results.comparison.decimal_places_gained} additional decimal places
                compared to standard double precision
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>
    </Fade>
    );
  };

  // Render assumption checks
  const renderAssumptions = () => {
    if (!assumptions) return null;

    // The backend keys each assumption as normality_data1 / normality_data2 /
    // equal_variance with an { is_met, p_value } shape. The module previously
    // read .normality.passed / .equal_variance.passed / .independence.passed --
    // none of which exist -- so every run showed "⚠️ Violated" (and printed the
    // real high equal-variance p-value right next to a "Violated" label).
    const fmtP = (v) =>
      v === null || v === undefined || Number.isNaN(Number(v)) ? 'N/A' : Number(v).toFixed(4);
    const norm1 = assumptions.normality_data1;
    const norm2 = assumptions.normality_data2;
    const normalityMet = norm1 ? norm1.is_met && (norm2 ? norm2.is_met : true) : undefined;
    const normalityP = norm2
      ? `${fmtP(norm1?.p_value)}, ${fmtP(norm2?.p_value)}`
      : fmtP(norm1?.p_value);
    const eqVar = assumptions.equal_variance;

    return (
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary">
            ✅ Assumption Checks
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Alert severity={normalityMet ? "success" : "warning"}>
                <Typography variant="body2">
                  <strong>Normality:</strong> {normalityMet ? "✅ Met" : "⚠️ Violated"}
                </Typography>
                <Typography variant="caption">
                  p-value: {normalityP}
                </Typography>
              </Alert>
            </Grid>

            {eqVar && (
              <Grid item xs={12} md={4}>
                <Alert severity={eqVar.is_met ? "success" : "warning"}>
                  <Typography variant="body2">
                    <strong>Equal Variance:</strong> {eqVar.is_met ? "✅ Met" : "⚠️ Violated"}
                  </Typography>
                  <Typography variant="caption">
                    p-value: {fmtP(eqVar.p_value)}
                  </Typography>
                </Alert>
              </Grid>
            )}

            <Grid item xs={12} md={4}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Independence:</strong> ℹ️ Based on study design
                </Typography>
              </Alert>
            </Grid>
          </Grid>

          {/* Recommendations based on assumptions */}
          {assumptions.recommendations && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Recommendation:</strong> {assumptions.recommendations}
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <ProfessionalContainer
      title={
        <Typography variant="h4" sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <TrendingUpIcon sx={{ mr: 2, fontSize: 40 }} />
          T-Test Analysis
          <Chip
            label="50-decimal precision"
            color="success"
            size="small"
            sx={{ ml: 2 }}
          />
        </Typography>
      }
      gradient="primary"
      enableGlassMorphism={true}
    >
      <Typography variant="body1" color="text.secondary" paragraph align="center">
        Using actual backend calculations, NOT simulations
      </Typography>

        <Grid container spacing={3}>
          {/* Test configuration */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Test Type</InputLabel>
              <Select value={testType} onChange={(e) => setTestType(e.target.value)}>
                <MenuItem value="one_sample">One Sample</MenuItem>
                <MenuItem value="two_sample">Two Sample (Independent)</MenuItem>
                <MenuItem value="paired">Paired</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Sample 1 input */}
          <Grid item xs={12} md={testType === 'one_sample' ? 8 : 6}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Sample 1 (comma-separated)"
              value={sample1}
              onChange={(e) => setSample1(e.target.value)}
              placeholder="e.g., 23.5, 24.1, 22.8, 25.3"
            />
          </Grid>

          {/* Sample 2 input */}
          {testType !== 'one_sample' && (
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Sample 2 (comma-separated)"
                value={sample2}
                onChange={(e) => setSample2(e.target.value)}
                placeholder="e.g., 21.2, 20.8, 22.1, 21.5"
              />
            </Grid>
          )}

          {/* Action buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<Calculate />}
                onClick={performRealCalculation}
                disabled={loading || !sample1}
                size="large"
              >
                Calculate (Real Backend)
              </Button>
              <Button
                variant="outlined"
                onClick={loadExampleData}
              >
                Load Example
              </Button>
              <Button
                variant="outlined"
                startIcon={<Clear />}
                onClick={() => {
                  setSample1('');
                  setSample2('');
                  setResults(null);
                  setError(null);
                  setAssumptions(null);
                }}
                sx={{
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                    transform: 'rotate(180deg)',
                    transition: 'transform 0.3s'
                  }
                }}
              >
                Clear
              </Button>
            </Box>
          </Grid>
        </Grid>

        {/* Loading indicator */}
        {loading && (
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2 }}>
              Calculating with 50 decimal precision...
            </Typography>
          </Box>
        )}

        {/* Error display */}
        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        )}

        {/* Guardian Report - Design Contract Compliance */}
        {results && resultsGuardian.hasGuardianContext && (
          <Box sx={{ mt: 3 }}>
            <GuardianReportDisplay {...resultsGuardian.guardianProps} />
          </Box>
        )}

        {/* Results display */}
        {renderResults()}
        {renderAssumptions()}

        {/* Proof of real backend */}
        {results && (
          <Grow in timeout={1200}>
            <Alert severity="success" sx={{ mt: 3 }}>
              <Typography variant="body2">
                ✅ This calculation used the REAL backend API with 50 decimal precision.
                No Math.random() or simulations were used.
              </Typography>
            </Alert>
          </Grow>
        )}
    </ProfessionalContainer>
  );
};

export default TTestRealBackend;