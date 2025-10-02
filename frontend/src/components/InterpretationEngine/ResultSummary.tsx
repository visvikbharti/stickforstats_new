/**
 * ResultSummary Component
 * 
 * Displays a comprehensive summary of test results.
 * 
 * @timestamp 2025-08-06 22:42:00 UTC
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  CheckCircle as SignificantIcon,
  Cancel as NotSignificantIcon,
  TrendingUp as EffectIcon,
  Groups as SampleIcon,
  Timeline as PowerIcon,
  BarChart as StatisticIcon,
} from '@mui/icons-material';

import { ResultSummaryProps, SignificanceLevel } from './InterpretationEngine.types';

const ResultSummary: React.FC<ResultSummaryProps> = ({
  result,
  significance,
  showEffectSize = true,
  showConfidenceInterval = true,
  compact = false,
}) => {
  // Get significance color
  const getSignificanceColor = (level: SignificanceLevel) => {
    switch (level) {
      case 'highly_significant':
        return 'success';
      case 'significant':
        return 'success';
      case 'marginally_significant':
        return 'warning';
      case 'not_significant':
        return 'default';
      default:
        return 'default';
    }
  };

  // Get effect size color
  const getEffectSizeColor = () => {
    if (!result.effectSize) return 'default';
    switch (result.effectSize.magnitude) {
      case 'large':
      case 'very_large':
        return 'success';
      case 'medium':
        return 'warning';
      case 'small':
        return 'info';
      case 'negligible':
        return 'default';
      default:
        return 'default';
    }
  };

  // Format p-value
  const formatPValue = (p: number) => {
    if (p < 0.001) return '< 0.001';
    if (p < 0.01) return p.toFixed(3);
    return p.toFixed(4);
  };

  if (compact) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{result.testName}</Typography>
            <Chip
              label={significance.replace('_', ' ')}
              color={getSignificanceColor(significance)}
              size="small"
            />
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">p-value</Typography>
              <Typography variant="h6">{formatPValue(result.pValue)}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">{result.statisticName}</Typography>
              <Typography variant="h6">{result.statistic.toFixed(3)}</Typography>
            </Grid>
            {result.effectSize && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">Effect Size</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6">{result.effectSize.value.toFixed(3)}</Typography>
                  <Chip
                    label={result.effectSize.magnitude}
                    size="small"
                    color={getEffectSizeColor()}
                  />
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Main Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <StatisticIcon color="primary" />
                <Typography variant="subtitle2" color="text.secondary">
                  Test Statistic
                </Typography>
              </Box>
              <Typography variant="h4">
                {result.statistic.toFixed(3)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {result.statisticName}
                {result.degreesOfFreedom && (
                  <>
                    {' '}(
                    {typeof result.degreesOfFreedom === 'number'
                      ? `df = ${result.degreesOfFreedom}`
                      : `df = ${result.degreesOfFreedom.numerator}, ${result.degreesOfFreedom.denominator}`}
                    )
                  </>
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {significance === 'significant' || significance === 'highly_significant' ? (
                  <SignificantIcon color="success" />
                ) : (
                  <NotSignificantIcon color="action" />
                )}
                <Typography variant="subtitle2" color="text.secondary">
                  P-Value
                </Typography>
              </Box>
              <Typography variant="h4">
                {formatPValue(result.pValue)}
              </Typography>
              <Chip
                label={significance.replace('_', ' ')}
                color={getSignificanceColor(significance)}
                size="small"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {showEffectSize && result.effectSize && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <EffectIcon color="primary" />
                  <Typography variant="subtitle2" color="text.secondary">
                    Effect Size
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {result.effectSize.value.toFixed(3)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {result.effectSize.measure}
                  </Typography>
                  <Chip
                    label={result.effectSize.magnitude}
                    color={getEffectSizeColor()}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Confidence Interval */}
      {showConfidenceInterval && result.confidenceInterval && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {(result.confidenceInterval.level * 100).toFixed(0)}% Confidence Interval
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h5">
                [{result.confidenceInterval.lower.toFixed(3)}, {result.confidenceInterval.upper.toFixed(3)}]
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The true population parameter is likely within this range
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Sample Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SampleIcon color="primary" />
            <Typography variant="h6">
              Sample Information
            </Typography>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                Total Sample Size
              </Typography>
              <Typography variant="h5">
                N = {result.sampleInfo.totalN}
              </Typography>
            </Grid>
            
            {result.sampleInfo.groups && result.sampleInfo.groups.map((group, idx) => (
              <Grid item xs={12} md={4} key={idx}>
                <Typography variant="body2" color="text.secondary">
                  {group.name}
                </Typography>
                <Typography variant="h6">
                  n = {group.n}
                </Typography>
                {group.mean !== undefined && (
                  <Typography variant="caption" color="text.secondary">
                    M = {group.mean.toFixed(2)}, SD = {group.sd?.toFixed(2)}
                  </Typography>
                )}
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Power Analysis */}
      {result.powerAnalysis && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PowerIcon color="primary" />
              <Typography variant="h6">
                Statistical Power
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Observed Power
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {(result.powerAnalysis.observedPower * 100).toFixed(0)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={result.powerAnalysis.observedPower * 100}
                color={result.powerAnalysis.observedPower >= 0.8 ? 'success' : 'warning'}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            
            {result.powerAnalysis.observedPower < 0.8 && (
              <Typography variant="caption" color="warning.main">
                Low statistical power. Consider increasing sample size for future studies.
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Key Findings */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Key Findings
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                {significance === 'significant' || significance === 'highly_significant' ? (
                  <SignificantIcon color="success" />
                ) : (
                  <NotSignificantIcon color="action" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  significance === 'highly_significant' ? 'Highly statistically significant result' :
                  significance === 'significant' ? 'Statistically significant result' :
                  significance === 'marginally_significant' ? 'Marginally significant result' :
                  'Not statistically significant'
                }
                secondary={`p = ${formatPValue(result.pValue)} compared to α = ${result.alpha}`}
              />
            </ListItem>
            
            {result.effectSize && (
              <ListItem>
                <ListItemIcon>
                  <EffectIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={`${result.effectSize.magnitude.charAt(0).toUpperCase() + result.effectSize.magnitude.slice(1)} effect size`}
                  secondary={result.effectSize.interpretation}
                />
              </ListItem>
            )}
            
            {result.powerAnalysis && (
              <ListItem>
                <ListItemIcon>
                  <PowerIcon color={result.powerAnalysis.observedPower >= 0.8 ? 'primary' : 'warning'} />
                </ListItemIcon>
                <ListItemText
                  primary={`Statistical power: ${(result.powerAnalysis.observedPower * 100).toFixed(0)}%`}
                  secondary={
                    result.powerAnalysis.observedPower >= 0.8 
                      ? 'Adequate power to detect effects'
                      : 'Low power - results should be interpreted with caution'
                  }
                />
              </ListItem>
            )}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ResultSummary;