/**
 * EffectSizeDisplay Component
 * 
 * Displays effect size with interpretation and benchmarks.
 * 
 * @timestamp 2025-08-06 22:45:00 UTC
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Grid,
} from '@mui/material';

import { EffectSizeDisplayProps } from './InterpretationEngine.types';

const EffectSizeDisplay: React.FC<EffectSizeDisplayProps> = ({
  effectSize,
  showInterpretation = true,
  showConfidenceInterval = true,
  showBenchmarks = true,
}) => {
  if (!effectSize) return null;

  const getMagnitudeColor = () => {
    switch (effectSize.magnitude) {
      case 'very_large':
      case 'large':
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

  const getBenchmarks = () => {
    const measure = effectSize.measure.toLowerCase();
    if (measure.includes('cohen') || measure === 'd') {
      return { small: 0.2, medium: 0.5, large: 0.8 };
    } else if (measure === 'r' || measure.includes('correlation')) {
      return { small: 0.1, medium: 0.3, large: 0.5 };
    } else if (measure.includes('eta') || measure.includes('η²')) {
      return { small: 0.01, medium: 0.06, large: 0.14 };
    }
    return { small: 0.2, medium: 0.5, large: 0.8 };
  };

  const benchmarks = getBenchmarks();
  const effectPercent = Math.min((Math.abs(effectSize.value) / 1.5) * 100, 100);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Effect Size
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {effectSize.measure}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6">
                {effectSize.value.toFixed(3)}
              </Typography>
              <Chip
                label={effectSize.magnitude}
                size="small"
                color={getMagnitudeColor()}
              />
            </Box>
          </Box>
          
          <LinearProgress
            variant="determinate"
            value={effectPercent}
            color={getMagnitudeColor()}
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Box>

        {showConfidenceInterval && effectSize.confidenceInterval && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              95% Confidence Interval
            </Typography>
            <Typography variant="body1">
              [{effectSize.confidenceInterval.lower.toFixed(3)}, {effectSize.confidenceInterval.upper.toFixed(3)}]
            </Typography>
          </Box>
        )}

        {showBenchmarks && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Benchmarks for {effectSize.measure}
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Small</Typography>
                  <Typography variant="body2">{benchmarks.small}</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Medium</Typography>
                  <Typography variant="body2">{benchmarks.medium}</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Large</Typography>
                  <Typography variant="body2">{benchmarks.large}</Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        {showInterpretation && (
          <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2">
              {effectSize.interpretation}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default EffectSizeDisplay;