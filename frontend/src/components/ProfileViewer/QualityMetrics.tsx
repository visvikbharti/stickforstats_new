/**
 * QualityMetrics Component
 * 
 * Displays comprehensive data quality metrics with visual indicators.
 * 
 * @timestamp 2025-08-06 21:37:00 UTC
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

import { QualityMetricsProps } from './ProfileViewer.types';

const QualityMetrics: React.FC<QualityMetricsProps> = ({
  overallScore,
  missingDataScore,
  outlierScore,
  consistencyScore,
  showDetails,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 0.9) return '#4CAF50';
    if (score >= 0.7) return '#FF9800';
    if (score >= 0.5) return '#FFC107';
    return '#F44336';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.9) return 'Excellent';
    if (score >= 0.7) return 'Good';
    if (score >= 0.5) return 'Fair';
    return 'Poor';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 0.9) return <CheckCircleIcon color="success" />;
    if (score >= 0.7) return <InfoIcon color="info" />;
    if (score >= 0.5) return <WarningIcon color="warning" />;
    return <ErrorIcon color="error" />;
  };

  const metrics = [
    {
      title: 'Missing Data',
      score: missingDataScore,
      description: 'Completeness of the dataset',
      recommendations: [
        'Consider imputation for missing values',
        'Investigate patterns in missing data',
        'Document reasons for missingness',
      ],
    },
    {
      title: 'Outliers',
      score: outlierScore,
      description: 'Detection of extreme values',
      recommendations: [
        'Review outliers for data entry errors',
        'Consider robust statistical methods',
        'Document legitimate extreme values',
      ],
    },
    {
      title: 'Consistency',
      score: consistencyScore,
      description: 'Data type and format consistency',
      recommendations: [
        'Standardize date formats',
        'Ensure consistent categorical values',
        'Check for duplicate entries',
      ],
    },
  ];

  return (
    <Box>
      {/* Overall Quality Score */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Overall Data Quality
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ flexGrow: 1, mr: 2 }}>
              <LinearProgress
                variant="determinate"
                value={overallScore * 100}
                sx={{
                  height: 20,
                  borderRadius: 10,
                  bgcolor: 'grey.300',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getScoreColor(overallScore),
                    borderRadius: 10,
                  },
                }}
              />
            </Box>
            <Typography variant="h5" sx={{ color: getScoreColor(overallScore) }}>
              {(overallScore * 100).toFixed(0)}%
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {getScoreIcon(overallScore)}
            <Chip
              label={getScoreLabel(overallScore)}
              sx={{
                bgcolor: getScoreColor(overallScore),
                color: 'white',
              }}
            />
            <Typography variant="body2" color="text.secondary">
              Based on completeness, accuracy, and consistency metrics
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Individual Metrics */}
      <Grid container spacing={3}>
        {metrics.map((metric) => (
          <Grid item xs={12} md={4} key={metric.title}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {metric.title}
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h4">
                      {(metric.score * 100).toFixed(0)}%
                    </Typography>
                    {getScoreIcon(metric.score)}
                  </Box>
                  
                  <LinearProgress
                    variant="determinate"
                    value={metric.score * 100}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'grey.300',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: getScoreColor(metric.score),
                      },
                    }}
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {metric.description}
                </Typography>
                
                {showDetails && metric.score < 0.9 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" fontWeight="bold" gutterBottom>
                      Recommendations:
                    </Typography>
                    <List dense>
                      {metric.recommendations.map((rec, idx) => (
                        <ListItem key={idx} sx={{ pl: 0 }}>
                          <ListItemIcon sx={{ minWidth: 24 }}>
                            <InfoIcon fontSize="small" color="action" />
                          </ListItemIcon>
                          <ListItemText
                            primary={rec}
                            primaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quality Alert */}
      {overallScore < 0.7 && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Data Quality Attention Required
          </Typography>
          <Typography variant="body2">
            Your dataset has quality issues that may affect analysis results.
            Consider addressing the recommendations above before proceeding with statistical tests.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default QualityMetrics;