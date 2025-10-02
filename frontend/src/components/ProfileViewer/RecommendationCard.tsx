/**
 * RecommendationCard Component
 * 
 * Displays actionable recommendations based on data profiling results.
 * 
 * @timestamp 2025-08-06 21:41:00 UTC
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Box,
} from '@mui/material';
import {
  CleaningServices as CleaningIcon,
  Transform as TransformIcon,
  Engineering as EngineeringIcon,
  Analytics as AnalyticsIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';

import { RecommendationCardProps } from './ProfileViewer.types';

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  category,
  recommendations,
  priority,
  icon,
}) => {
  const getCategoryIcon = () => {
    if (icon) return icon;
    
    switch (category) {
      case 'cleaning':
        return <CleaningIcon />;
      case 'transformation':
        return <TransformIcon />;
      case 'feature_engineering':
        return <EngineeringIcon />;
      case 'analysis':
        return <AnalyticsIcon />;
      default:
        return <CheckCircleIcon />;
    }
  };

  const getCategoryTitle = () => {
    switch (category) {
      case 'cleaning':
        return 'Data Cleaning';
      case 'transformation':
        return 'Data Transformation';
      case 'feature_engineering':
        return 'Feature Engineering';
      case 'analysis':
        return 'Analysis Suggestions';
      default:
        return 'Recommendations';
    }
  };

  const getPriorityColor = () => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const getPriorityLabel = () => {
    return priority.charAt(0).toUpperCase() + priority.slice(1) + ' Priority';
  };

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        avatar={getCategoryIcon()}
        title={getCategoryTitle()}
        subheader={
          <Chip
            label={getPriorityLabel()}
            size="small"
            color={getPriorityColor()}
            sx={{ mt: 1 }}
          />
        }
      />
      <CardContent>
        <List dense>
          {recommendations.map((recommendation, index) => (
            <ListItem key={index} sx={{ pl: 0 }}>
              <ListItemIcon sx={{ minWidth: 28 }}>
                <ArrowForwardIcon fontSize="small" color="action" />
              </ListItemIcon>
              <ListItemText
                primary={recommendation}
                primaryTypographyProps={{
                  variant: 'body2',
                }}
              />
            </ListItem>
          ))}
        </List>
        
        {category === 'cleaning' && recommendations.length > 0 && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Tip:</strong> Address data cleaning issues first to ensure accurate analysis results.
            </Typography>
          </Box>
        )}
        
        {category === 'transformation' && recommendations.length > 0 && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Tip:</strong> Transformations can improve model performance and meet statistical assumptions.
            </Typography>
          </Box>
        )}
        
        {category === 'feature_engineering' && recommendations.length > 0 && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Tip:</strong> Feature engineering can reveal hidden patterns and improve predictive power.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RecommendationCard;