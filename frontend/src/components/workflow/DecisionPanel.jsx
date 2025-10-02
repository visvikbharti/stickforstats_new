/**
 * DecisionPanel Component
 * 
 * Simple decision interface for workflow decision points.
 * MVP version - clear and functional.
 * 
 * @author Vishal Bharti
 * @date 2025-08-26
 * @version 1.0.0 (MVP)
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  Card,
  CardContent,
  CardActions,
  Alert,
  AlertTitle,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Grid,
  Tooltip
} from '@mui/material';
import {
  HelpOutline as HelpIcon,
  CheckCircle as SelectIcon,
  ArrowForward as ProceedIcon,
  Info as InfoIcon,
  Star as RecommendedIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const DecisionPanel = ({ 
  decisionNode = null, 
  onDecision, 
  context = {},
  recommendations = []
}) => {
  const [selectedOption, setSelectedOption] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  // Handle option selection
  const handleOptionSelect = (optionId) => {
    setSelectedOption(optionId);
  };

  // Handle decision submission
  const handleSubmitDecision = () => {
    if (selectedOption && onDecision) {
      onDecision(selectedOption);
      setSelectedOption('');
    }
  };

  // Get recommendation level color
  const getRecommendationColor = (level) => {
    switch (level) {
      case 'required': return 'error';
      case 'strongly_recommended': return 'warning';
      case 'recommended': return 'success';
      case 'optional': return 'info';
      default: return 'default';
    }
  };

  // No decision node - show placeholder
  if (!decisionNode) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box textAlign="center" sx={{ py: 4 }}>
          <InfoIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary">
            No Decision Required
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Continue with the workflow steps
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Decision Required
        </Typography>
        <Typography variant="body1" color="primary" sx={{ mb: 2 }}>
          {decisionNode.question}
        </Typography>
        {decisionNode.help_text && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              {decisionNode.help_text}
            </Typography>
          </Alert>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Options */}
      <Typography variant="h6" gutterBottom>
        Available Options
      </Typography>
      
      <RadioGroup
        value={selectedOption}
        onChange={(e) => handleOptionSelect(e.target.value)}
      >
        <Grid container spacing={2}>
          {decisionNode.options?.map((option) => {
            const isRecommended = option.recommendation_level === 'strongly_recommended' || 
                                 option.recommendation_level === 'recommended';
            
            return (
              <Grid item xs={12} key={option.id}>
                <Card 
                  variant={selectedOption === option.id ? 'elevation' : 'outlined'}
                  sx={{ 
                    borderColor: selectedOption === option.id ? 'primary.main' : undefined,
                    borderWidth: selectedOption === option.id ? 2 : 1
                  }}
                >
                  <CardContent>
                    <FormControlLabel
                      value={option.id}
                      control={<Radio />}
                      label={
                        <Box>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1">
                              {option.label}
                            </Typography>
                            {isRecommended && (
                              <Tooltip title="Recommended based on your data">
                                <RecommendedIcon color="warning" fontSize="small" />
                              </Tooltip>
                            )}
                            <Chip 
                              label={option.recommendation_level.replace('_', ' ')}
                              size="small"
                              color={getRecommendationColor(option.recommendation_level)}
                            />
                          </Box>
                          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            {option.description}
                          </Typography>
                          {option.rationale && (
                            <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
                              Why: {option.rationale}
                            </Typography>
                          )}
                        </Box>
                      }
                    />

                    {/* Prerequisites if any */}
                    {option.prerequisites?.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="textSecondary">
                          Prerequisites:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                          {option.prerequisites.map((prereq, idx) => (
                            <Chip key={idx} label={prereq} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </RadioGroup>

      {/* Context-based hints */}
      {recommendations.length > 0 && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <AlertTitle>Recommendations based on your data</AlertTitle>
          <List dense>
            {recommendations.map((rec, idx) => (
              <ListItem key={idx}>
                <ListItemText 
                  primary={rec.message}
                  secondary={rec.rationale}
                />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      {/* Action Buttons */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="text"
          startIcon={<HelpIcon />}
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide' : 'Show'} Details
        </Button>
        
        <Button
          variant="contained"
          startIcon={<ProceedIcon />}
          onClick={handleSubmitDecision}
          disabled={!selectedOption}
        >
          Proceed with Selection
        </Button>
      </Box>

      {/* Additional Details - Collapsible */}
      {showDetails && (
        <Box sx={{ mt: 3 }}>
          <Alert severity="warning">
            <AlertTitle>Important Considerations</AlertTitle>
            <Typography variant="body2">
              Your selection will determine the statistical analysis path. 
              Consider your research question and data characteristics carefully.
            </Typography>
          </Alert>
        </Box>
      )}
    </Paper>
  );
};

export default DecisionPanel;