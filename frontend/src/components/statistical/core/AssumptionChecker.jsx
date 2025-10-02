import React, { useState, useEffect } from 'react';
import {
  Paper,
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  AlertTitle,
  Collapse,
  Button,
  LinearProgress,
  Chip,
  Grid,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as FailIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Psychology as PsychologyIcon,
  Assessment as AssessmentIcon,
  Help as HelpIcon
} from '@mui/icons-material';

const AssumptionChecker = ({
  testType = 'parametric',
  data = null,
  assumptions = [],
  onValidation = null,
  autoCheck = true,
  showRecommendations = true,
  showAlternatives = true
}) => {
  const [checkResults, setCheckResults] = useState({});
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(false);
  const [overallStatus, setOverallStatus] = useState('pending');
  const [recommendations, setRecommendations] = useState([]);

  const defaultAssumptions = {
    parametric: [
      {
        id: 'normality',
        name: 'Normality',
        description: 'Data should be approximately normally distributed',
        test: (data) => checkNormality(data),
        severity: 'critical',
        alternatives: ['Use non-parametric tests', 'Transform data', 'Check for outliers']
      },
      {
        id: 'independence',
        name: 'Independence',
        description: 'Observations should be independent of each other',
        test: (data) => checkIndependence(data),
        severity: 'critical',
        alternatives: ['Use repeated measures design', 'Account for clustering']
      },
      {
        id: 'homogeneity',
        name: 'Homogeneity of Variance',
        description: 'Groups should have similar variances',
        test: (data) => checkHomogeneity(data),
        severity: 'moderate',
        alternatives: ['Use Welch\'s correction', 'Transform data', 'Use non-parametric test']
      },
      {
        id: 'sample_size',
        name: 'Adequate Sample Size',
        description: 'Sample size should be sufficient for reliable results',
        test: (data) => checkSampleSize(data),
        severity: 'moderate',
        alternatives: ['Collect more data', 'Use bootstrapping', 'Report limitations']
      }
    ],
    nonparametric: [
      {
        id: 'independence',
        name: 'Independence',
        description: 'Observations should be independent',
        test: (data) => checkIndependence(data),
        severity: 'critical'
      },
      {
        id: 'sample_size',
        name: 'Minimum Sample Size',
        description: 'Minimum sample size requirements',
        test: (data) => checkMinimumSampleSize(data),
        severity: 'moderate'
      }
    ]
  };

  const checkNormality = (data) => {
    if (!data || data.length < 3) {
      return {
        passed: false,
        message: 'Insufficient data for normality check',
        details: 'Need at least 3 data points'
      };
    }

    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const skewness = calculateSkewness(data, mean);
    const kurtosis = calculateKurtosis(data, mean);

    const isNormal = Math.abs(skewness) < 2 && Math.abs(kurtosis) < 7;

    return {
      passed: isNormal,
      message: isNormal
        ? 'Data appears normally distributed'
        : 'Data may not be normally distributed',
      details: `Skewness: ${skewness.toFixed(3)}, Kurtosis: ${kurtosis.toFixed(3)}`,
      metrics: { skewness, kurtosis }
    };
  };

  const calculateSkewness = (data, mean) => {
    const n = data.length;
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const skewness = data.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0) / n;
    return skewness;
  };

  const calculateKurtosis = (data, mean) => {
    const n = data.length;
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const kurtosis = data.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 4), 0) / n - 3;
    return kurtosis;
  };

  const checkIndependence = (data) => {
    return {
      passed: true,
      message: 'Independence assumed (requires study design verification)',
      details: 'Check that observations are not correlated or repeated measures',
      warning: true
    };
  };

  const checkHomogeneity = (data) => {
    if (!Array.isArray(data[0])) {
      return {
        passed: true,
        message: 'Single sample - homogeneity not applicable',
        details: 'Homogeneity of variance applies to multiple groups'
      };
    }

    const variances = data.map(group => {
      const mean = group.reduce((a, b) => a + b, 0) / group.length;
      return group.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / group.length;
    });

    const maxVar = Math.max(...variances);
    const minVar = Math.min(...variances);
    const ratio = maxVar / minVar;

    const passed = ratio < 3;

    return {
      passed,
      message: passed
        ? 'Variances are approximately equal'
        : 'Variances may be unequal',
      details: `Variance ratio: ${ratio.toFixed(2)} (threshold: 3.0)`,
      metrics: { variances, ratio }
    };
  };

  const checkSampleSize = (data) => {
    const n = Array.isArray(data[0])
      ? Math.min(...data.map(group => group.length))
      : data.length;

    const adequate = n >= 30;
    const minimal = n >= 20;

    return {
      passed: adequate,
      warning: !adequate && minimal,
      message: adequate
        ? 'Sample size is adequate'
        : minimal
          ? 'Sample size is minimal but acceptable'
          : 'Sample size may be too small',
      details: `n = ${n} (recommended: ≥ 30)`,
      metrics: { n, adequate, minimal }
    };
  };

  const checkMinimumSampleSize = (data) => {
    const n = Array.isArray(data[0])
      ? Math.min(...data.map(group => group.length))
      : data.length;

    const passed = n >= 5;

    return {
      passed,
      message: passed
        ? 'Minimum sample size met'
        : 'Sample size below minimum',
      details: `n = ${n} (minimum: 5)`,
      metrics: { n }
    };
  };

  useEffect(() => {
    if (data && autoCheck) {
      runAssumptionChecks();
    }
  }, [data, testType]);

  const runAssumptionChecks = async () => {
    setLoading(true);
    const assumptionsToCheck = assumptions.length > 0
      ? assumptions
      : defaultAssumptions[testType] || [];

    const results = {};
    let allPassed = true;
    let hasWarnings = false;
    const newRecommendations = [];

    for (const assumption of assumptionsToCheck) {
      const result = assumption.test(data);
      results[assumption.id] = { ...result, assumption };

      if (!result.passed) {
        allPassed = false;
        if (assumption.severity === 'critical') {
          newRecommendations.push({
            type: 'critical',
            message: `Critical assumption violated: ${assumption.name}`,
            alternatives: assumption.alternatives
          });
        }
      }
      if (result.warning) {
        hasWarnings = true;
      }
    }

    setCheckResults(results);
    setRecommendations(newRecommendations);
    setOverallStatus(allPassed ? 'passed' : hasWarnings ? 'warning' : 'failed');

    if (onValidation) {
      onValidation({ results, passed: allPassed, recommendations: newRecommendations });
    }

    setLoading(false);
  };

  const toggleExpanded = (assumptionId) => {
    setExpanded(prev => ({
      ...prev,
      [assumptionId]: !prev[assumptionId]
    }));
  };

  const getStatusIcon = (result) => {
    if (result.passed) return <CheckIcon color="success" />;
    if (result.warning) return <WarningIcon color="warning" />;
    return <FailIcon color="error" />;
  };

  const getOverallStatusDisplay = () => {
    switch (overallStatus) {
      case 'passed':
        return (
          <Alert severity="success" sx={{ mb: 2 }}>
            <AlertTitle>All Assumptions Met</AlertTitle>
            Your data meets all the required assumptions for {testType} testing.
          </Alert>
        );
      case 'warning':
        return (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>Some Concerns</AlertTitle>
            Some assumptions require attention. Review the details below.
          </Alert>
        );
      case 'failed':
        return (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Assumptions Violated</AlertTitle>
            Critical assumptions are not met. Consider alternatives or data transformation.
          </Alert>
        );
      default:
        return null;
    }
  };

  if (!data) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <PsychologyIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Enter data to check assumptions
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AssessmentIcon color="primary" />
        <Typography variant="h6">
          Assumption Validation
        </Typography>
        <Tooltip title="Statistical tests have assumptions that should be met for valid results">
          <IconButton size="small">
            <HelpIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {!autoCheck && (
          <Button
            variant="outlined"
            size="small"
            onClick={runAssumptionChecks}
            disabled={loading}
            sx={{ ml: 'auto' }}
          >
            Check Assumptions
          </Button>
        )}
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {Object.keys(checkResults).length > 0 && (
        <>
          {getOverallStatusDisplay()}

          <List>
            {Object.entries(checkResults).map(([id, result]) => (
              <React.Fragment key={id}>
                <ListItem
                  button
                  onClick={() => toggleExpanded(id)}
                  sx={{
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: 'background.default'
                  }}
                >
                  <ListItemIcon>
                    {getStatusIcon(result)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {result.assumption.name}
                        {result.assumption.severity && (
                          <Chip
                            label={result.assumption.severity}
                            size="small"
                            color={result.assumption.severity === 'critical' ? 'error' : 'warning'}
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={result.message}
                  />
                  <IconButton>
                    {expanded[id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </ListItem>

                <Collapse in={expanded[id]}>
                  <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {result.assumption.description}
                    </Typography>

                    {result.details && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        {result.details}
                      </Alert>
                    )}

                    {!result.passed && result.assumption.alternatives && showAlternatives && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Recommended Actions:
                        </Typography>
                        <List dense>
                          {result.assumption.alternatives.map((alt, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                <InfoIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary={alt} />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </Box>
                </Collapse>
                <Divider />
              </React.Fragment>
            ))}
          </List>

          {showRecommendations && recommendations.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recommendations
              </Typography>
              <Grid container spacing={2}>
                {recommendations.map((rec, index) => (
                  <Grid item xs={12} key={index}>
                    <Alert severity={rec.type === 'critical' ? 'error' : 'warning'}>
                      <AlertTitle>{rec.message}</AlertTitle>
                      {rec.alternatives && (
                        <Box component="ul" sx={{ m: 0, pl: 2 }}>
                          {rec.alternatives.map((alt, i) => (
                            <li key={i}>{alt}</li>
                          ))}
                        </Box>
                      )}
                    </Alert>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
};

export default AssumptionChecker;