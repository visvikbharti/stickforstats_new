/**
 * AssumptionsDisplay Component
 * 
 * Displays assumption checking results for statistical tests.
 * 
 * @timestamp 2025-08-06 22:47:00 UTC
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Chip,
} from '@mui/material';
import {
  CheckCircle as MetIcon,
  Cancel as NotMetIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

import { AssumptionsDisplayProps } from './InterpretationEngine.types';

const AssumptionsDisplay: React.FC<AssumptionsDisplayProps> = ({
  assumptions,
  showRemediation = true,
  onRemediate,
}) => {
  if (!assumptions || assumptions.length === 0) return null;

  const metCount = assumptions.filter(a => a.met).length;
  const notMetCount = assumptions.filter(a => !a.met).length;
  const allMet = notMetCount === 0;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Assumption Checking
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Chip
          icon={<MetIcon />}
          label={`${metCount} Met`}
          color="success"
          size="small"
        />
        {notMetCount > 0 && (
          <Chip
            icon={<NotMetIcon />}
            label={`${notMetCount} Not Met`}
            color="error"
            size="small"
          />
        )}
      </Box>

      {!allMet && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">
            Some assumptions were not met. Results should be interpreted with caution.
          </Typography>
        </Alert>
      )}

      <List>
        {assumptions.map((assumption, idx) => (
          <ListItem key={idx} sx={{ alignItems: 'flex-start' }}>
            <ListItemIcon>
              {assumption.met ? (
                <MetIcon color="success" />
              ) : (
                <NotMetIcon color="error" />
              )}
            </ListItemIcon>
            <ListItemText
              primary={assumption.assumption}
              secondary={
                <>
                  <Typography variant="body2" color="text.secondary">
                    {assumption.details}
                  </Typography>
                  {!assumption.met && assumption.impact && (
                    <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 1 }}>
                      Impact: {assumption.impact}
                    </Typography>
                  )}
                </>
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default AssumptionsDisplay;