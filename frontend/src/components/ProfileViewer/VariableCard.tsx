/**
 * VariableCard Component
 * 
 * Displays detailed information about a single variable with scientific accuracy.
 * 
 * @timestamp 2025-08-06 21:35:00 UTC
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  IconButton,
  Collapse,
  Checkbox,
  Tooltip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  ShowChart as ShowChartIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';

import { VariableCardProps } from './ProfileViewer.types';
import { VariableType } from '../../types/api.types';

const VariableCard: React.FC<VariableCardProps> = ({
  variable,
  isSelected,
  onSelect,
  showDetails,
  compact,
}) => {
  const [expanded, setExpanded] = useState(false);

  const getTypeIcon = () => {
    switch (variable.type) {
      case VariableType.CONTINUOUS:
        return <ShowChartIcon fontSize="small" />;
      case VariableType.CATEGORICAL:
      case VariableType.ORDINAL:
        return <BarChartIcon fontSize="small" />;
      default:
        return <InfoIcon fontSize="small" />;
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.9) return 'success.main';
    if (score >= 0.7) return 'warning.main';
    return 'error.main';
  };

  const formatNumber = (num: number | undefined, decimals: number = 2): string => {
    if (num === undefined || num === null) return '-';
    if (Number.isInteger(num)) return num.toLocaleString();
    return num.toFixed(decimals);
  };

  return (
    <Card sx={{ height: compact && !expanded ? 'auto' : '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Checkbox
                checked={isSelected}
                onChange={() => onSelect(variable.name)}
                size="small"
                sx={{ p: 0, mr: 1 }}
              />
              <Typography variant="subtitle2" fontWeight="bold">
                {variable.name}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={getTypeIcon()}
                label={variable.type}
                size="small"
                variant="outlined"
              />
              {variable.missing_percentage > 0 && (
                <Chip
                  icon={<WarningIcon fontSize="small" />}
                  label={`${variable.missing_percentage.toFixed(1)}% missing`}
                  size="small"
                  color={variable.missing_percentage > 10 ? 'warning' : 'default'}
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
          
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        {/* Quality Score */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Quality Score
            </Typography>
            <Typography variant="caption" fontWeight="bold">
              {(variable.quality_score * 100).toFixed(0)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={variable.quality_score * 100}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: 'grey.300',
              '& .MuiLinearProgress-bar': {
                bgcolor: getQualityColor(variable.quality_score),
              },
            }}
          />
        </Box>

        {/* Basic Statistics */}
        {!compact && (
          <Box>
            {variable.type === VariableType.CONTINUOUS && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Mean
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {formatNumber(variable.mean)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Std Dev
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {formatNumber(variable.std)}
                  </Typography>
                </Box>
              </Box>
            )}
            
            {(variable.type === VariableType.CATEGORICAL || 
              variable.type === VariableType.ORDINAL ||
              variable.type === VariableType.BINARY) && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Unique Values: {variable.unique_count}
                </Typography>
                {variable.categories && variable.categories.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {variable.categories.slice(0, 3).map((cat, idx) => (
                      <Typography key={idx} variant="caption" display="block">
                        {cat.value}: {cat.percentage.toFixed(1)}%
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
      </CardContent>

      {/* Expanded Details */}
      <Collapse in={expanded}>
        <Divider />
        <CardContent>
          {variable.type === VariableType.CONTINUOUS && (
            <>
              <Typography variant="subtitle2" gutterBottom>
                Distribution
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Range"
                    secondary={`${formatNumber(variable.min)} - ${formatNumber(variable.max)}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Quartiles"
                    secondary={`Q1: ${formatNumber(variable.q1)}, Q2: ${formatNumber(variable.median)}, Q3: ${formatNumber(variable.q3)}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Skewness"
                    secondary={formatNumber(variable.skewness)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Kurtosis"
                    secondary={formatNumber(variable.kurtosis)}
                  />
                </ListItem>
              </List>
              
              {variable.outliers && variable.outliers.count > 0 && (
                <>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Outliers
                  </Typography>
                  <Typography variant="body2">
                    {variable.outliers.count} outliers detected ({variable.outliers.method})
                  </Typography>
                </>
              )}
              
              {variable.distribution && (
                <>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Best Fit Distribution
                  </Typography>
                  <Typography variant="body2">
                    {variable.distribution.type} (p-value: {variable.distribution.goodness_of_fit.p_value.toFixed(4)})
                  </Typography>
                </>
              )}
            </>
          )}
          
          {variable.quality_issues && variable.quality_issues.length > 0 && (
            <>
              <Typography variant="subtitle2" gutterBottom>
                Quality Issues
              </Typography>
              <List dense>
                {variable.quality_issues.map((issue, idx) => (
                  <ListItem key={idx}>
                    <WarningIcon fontSize="small" sx={{ mr: 1, color: 'warning.main' }} />
                    <ListItemText primary={issue} />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </CardContent>
      </Collapse>
    </Card>
  );
};

export default VariableCard;