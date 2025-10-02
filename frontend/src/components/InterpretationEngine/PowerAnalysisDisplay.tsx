/**
 * PowerAnalysisDisplay Component
 * 
 * Displays statistical power analysis results.
 * 
 * @timestamp 2025-08-06 22:46:00 UTC
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';

import { PowerAnalysisProps } from './InterpretationEngine.types';

const PowerAnalysisDisplay: React.FC<PowerAnalysisProps> = ({
  powerAnalysis,
  showRecommendations = true,
  targetPower = 0.8,
}) => {
  if (!powerAnalysis) return null;

  const isPowerAdequate = powerAnalysis.observedPower >= targetPower;
  const powerPercent = powerAnalysis.observedPower * 100;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Statistical Power Analysis
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Observed Power
            </Typography>
            <Typography variant="h6" color={isPowerAdequate ? 'success.main' : 'warning.main'}>
              {powerPercent.toFixed(1)}%
            </Typography>
          </Box>
          
          <LinearProgress
            variant="determinate"
            value={powerPercent}
            color={isPowerAdequate ? 'success' : 'warning'}
            sx={{ height: 10, borderRadius: 5 }}
          />
          
          <Typography variant="caption" color="text.secondary">
            Target: {(targetPower * 100).toFixed(0)}% (conventional threshold)
          </Typography>
        </Box>

        {powerAnalysis.requiredN && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Sample Size for {(targetPower * 100).toFixed(0)}% Power
            </Typography>
            <Typography variant="body1">
              N = {powerAnalysis.requiredN}
            </Typography>
          </Box>
        )}

        {powerAnalysis.detectedEffectSize && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Minimum Detectable Effect
            </Typography>
            <Typography variant="body1">
              {powerAnalysis.detectedEffectSize.toFixed(3)}
            </Typography>
          </Box>
        )}

        {!isPowerAdequate && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Low Statistical Power
            </Typography>
            <Typography variant="body2">
              The study has {powerPercent.toFixed(0)}% power, below the recommended {(targetPower * 100).toFixed(0)}%. 
              This increases the risk of Type II error (failing to detect a true effect).
            </Typography>
          </Alert>
        )}

        {showRecommendations && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Recommendations
            </Typography>
            <List dense>
              {isPowerAdequate ? (
                <ListItem>
                  <ListItemText
                    primary="Power is adequate for detecting medium to large effects"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ) : (
                <>
                  <ListItem>
                    <ListItemText
                      primary={`Increase sample size to N = ${powerAnalysis.requiredN || 'calculate required'} for adequate power`}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Consider the possibility of Type II error if results are not significant"
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Report and discuss power limitations in your conclusions"
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                </>
              )}
            </List>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default PowerAnalysisDisplay;