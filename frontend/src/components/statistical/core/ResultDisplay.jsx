import React, { useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Alert,
  AlertTitle,
  Tabs,
  Tab,
  LinearProgress
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  BarChart as BarChartIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  Share as ShareIcon,
  Print as PrintIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const ResultDisplay = ({
  results = null,
  testName = 'Statistical Test',
  showInterpretation = true,
  showEffectSize = true,
  showConfidenceIntervals = true,
  showStatistics = true,
  precision = 4,
  exportOptions = true,
  customMetrics = []
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!results) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <AssessmentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No results to display
          </Typography>
        </Box>
      </Paper>
    );
  }

  const formatValue = (value, decimals = precision) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') {
      if (Number.isInteger(value) && Math.abs(value) < 1000) return value.toString();
      return value.toFixed(decimals);
    }
    return value.toString();
  };

  const getSignificanceLevel = (pValue) => {
    if (pValue < 0.001) return '***';
    if (pValue < 0.01) return '**';
    if (pValue < 0.05) return '*';
    return 'ns';
  };

  const getSignificanceLabel = (pValue) => {
    if (pValue < 0.001) return 'Highly Significant';
    if (pValue < 0.01) return 'Very Significant';
    if (pValue < 0.05) return 'Significant';
    return 'Not Significant';
  };

  const getEffectSizeInterpretation = (effectSize, type = 'cohens_d') => {
    const thresholds = {
      cohens_d: { small: 0.2, medium: 0.5, large: 0.8 },
      eta_squared: { small: 0.01, medium: 0.06, large: 0.14 },
      r: { small: 0.1, medium: 0.3, large: 0.5 }
    };

    const threshold = thresholds[type] || thresholds.cohens_d;
    const absEffect = Math.abs(effectSize);

    if (absEffect < threshold.small) return 'Negligible';
    if (absEffect < threshold.medium) return 'Small';
    if (absEffect < threshold.large) return 'Medium';
    return 'Large';
  };

  const copyToClipboard = () => {
    const text = formatResultsAsText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatResultsAsText = () => {
    let text = `${testName} Results\n`;
    text += '='.repeat(50) + '\n\n';

    if (results.test_statistic !== undefined) {
      text += `Test Statistic: ${formatValue(results.test_statistic)}\n`;
    }
    if (results.p_value !== undefined) {
      text += `P-Value: ${formatValue(results.p_value)}\n`;
      text += `Significance: ${getSignificanceLabel(results.p_value)}\n`;
    }
    if (results.degrees_of_freedom !== undefined) {
      text += `Degrees of Freedom: ${formatValue(results.degrees_of_freedom)}\n`;
    }
    if (results.confidence_interval) {
      text += `95% CI: [${formatValue(results.confidence_interval[0])}, ${formatValue(results.confidence_interval[1])}]\n`;
    }
    if (results.effect_size !== undefined) {
      text += `Effect Size: ${formatValue(results.effect_size)} (${getEffectSizeInterpretation(results.effect_size)})\n`;
    }

    return text;
  };

  const downloadResults = (format = 'json') => {
    let content, mimeType, filename;

    if (format === 'json') {
      content = JSON.stringify(results, null, 2);
      mimeType = 'application/json';
      filename = `${testName.replace(/\s+/g, '_')}_results.json`;
    } else if (format === 'csv') {
      content = convertToCSV();
      mimeType = 'text/csv';
      filename = `${testName.replace(/\s+/g, '_')}_results.csv`;
    } else {
      content = formatResultsAsText();
      mimeType = 'text/plain';
      filename = `${testName.replace(/\s+/g, '_')}_results.txt`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const convertToCSV = () => {
    const rows = [['Metric', 'Value']];
    Object.entries(results).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        rows.push([key, JSON.stringify(value)]);
      } else {
        rows.push([key, formatValue(value)]);
      }
    });
    return rows.map(row => row.join(',')).join('\n');
  };

  const MainResults = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card sx={{
          background: results.p_value < 0.05
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white'
        }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              {results.p_value < 0.05 ? (
                <CheckIcon sx={{ fontSize: 32, mr: 1 }} />
              ) : (
                <CloseIcon sx={{ fontSize: 32, mr: 1 }} />
              )}
              <Typography variant="h5">
                {getSignificanceLabel(results.p_value)}
              </Typography>
            </Box>
            <Typography variant="h3">
              p = {formatValue(results.p_value)}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
              {results.p_value < 0.05
                ? 'Reject the null hypothesis'
                : 'Fail to reject the null hypothesis'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Test Statistic
            </Typography>
            <Typography variant="h3">
              {formatValue(results.test_statistic)}
            </Typography>
            {results.degrees_of_freedom !== undefined && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                df = {formatValue(results.degrees_of_freedom, 0)}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      {showEffectSize && results.effect_size !== undefined && (
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Effect Size
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h4">
                  {formatValue(results.effect_size)}
                </Typography>
                <Chip
                  label={getEffectSizeInterpretation(results.effect_size)}
                  color={
                    Math.abs(results.effect_size) >= 0.8 ? 'success' :
                    Math.abs(results.effect_size) >= 0.5 ? 'warning' : 'default'
                  }
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {showConfidenceIntervals && results.confidence_interval && (
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                95% Confidence Interval
              </Typography>
              <Typography variant="h5">
                [{formatValue(results.confidence_interval[0])}, {formatValue(results.confidence_interval[1])}]
              </Typography>
              <LinearProgress
                variant="determinate"
                value={50}
                sx={{ mt: 2, height: 8, borderRadius: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
      )}

      {customMetrics.map((metric, index) => (
        <Grid item xs={12} md={6} key={index}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {metric.label}
              </Typography>
              <Typography variant="h4">
                {formatValue(metric.value, metric.precision || precision)}
              </Typography>
              {metric.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {metric.description}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const DetailedStatistics = () => (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Metric</TableCell>
            <TableCell align="right">Value</TableCell>
            <TableCell>Description</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(results).map(([key, value]) => {
            if (typeof value === 'object' && value !== null) return null;
            const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return (
              <TableRow key={key}>
                <TableCell>{displayKey}</TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontFamily="monospace">
                    {formatValue(value)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {getMetricDescription(key)}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const getMetricDescription = (key) => {
    const descriptions = {
      'test_statistic': 'Calculated test statistic value',
      'p_value': 'Probability of obtaining results at least as extreme as observed',
      'degrees_of_freedom': 'Number of independent values that can vary',
      'effect_size': 'Magnitude of the difference between groups',
      'confidence_interval': 'Range likely to contain the true parameter value',
      'mean_difference': 'Difference between group means',
      'standard_error': 'Standard deviation of the sampling distribution'
    };
    return descriptions[key] || '';
  };

  const Interpretation = () => (
    <Box>
      <Alert severity={results.p_value < 0.05 ? 'success' : 'info'}>
        <AlertTitle>Statistical Interpretation</AlertTitle>
        <Typography variant="body2" paragraph>
          {results.p_value < 0.05
            ? `The test is statistically significant (p = ${formatValue(results.p_value)} < 0.05).
               There is strong evidence against the null hypothesis.`
            : `The test is not statistically significant (p = ${formatValue(results.p_value)} ≥ 0.05).
               There is insufficient evidence to reject the null hypothesis.`}
        </Typography>
        {results.effect_size !== undefined && (
          <Typography variant="body2" paragraph>
            The effect size is {formatValue(results.effect_size)} ({getEffectSizeInterpretation(results.effect_size)}),
            indicating a {getEffectSizeInterpretation(results.effect_size).toLowerCase()} practical significance.
          </Typography>
        )}
      </Alert>

      {results.confidence_interval && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <AlertTitle>Confidence Interval Interpretation</AlertTitle>
          <Typography variant="body2">
            We are 95% confident that the true population parameter lies between {' '}
            {formatValue(results.confidence_interval[0])} and {formatValue(results.confidence_interval[1])}.
            {results.confidence_interval[0] * results.confidence_interval[1] > 0 &&
              ' Since the interval does not contain zero, the effect is statistically significant.'}
          </Typography>
        </Alert>
      )}
    </Box>
  );

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BarChartIcon color="primary" />
          <Typography variant="h6">
            {testName} Results
          </Typography>
        </Box>

        {exportOptions && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Copy to clipboard">
              <IconButton onClick={copyToClipboard} size="small">
                {copied ? <CheckIcon color="success" /> : <CopyIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Download JSON">
              <IconButton onClick={() => downloadResults('json')} size="small">
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Print">
              <IconButton onClick={() => window.print()} size="small">
                <PrintIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Overview" />
        {showStatistics && <Tab label="Detailed Statistics" />}
        {showInterpretation && <Tab label="Interpretation" />}
      </Tabs>

      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && <MainResults />}
        {activeTab === 1 && showStatistics && <DetailedStatistics />}
        {activeTab === 2 && showInterpretation && <Interpretation />}
      </Box>
    </Paper>
  );
};

export default ResultDisplay;