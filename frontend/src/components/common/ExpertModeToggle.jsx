/**
 * Expert Mode Toggle Component
 * ============================
 * A toggle button for enabling/disabling Expert Mode.
 *
 * When Expert Mode is enabled:
 * - Guardian warnings are still shown but don't block test execution
 * - Users can proceed with tests even when critical violations are detected
 * - Warning alerts are displayed to indicate Expert Mode is active
 *
 * This is intended for experienced statisticians who understand the implications
 * of proceeding with violated assumptions.
 */

import React from 'react';
import {
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Typography,
  Box,
  Chip
} from '@mui/material';
import {
  Science as ExpertIcon,
  Shield as ShieldIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useSettings } from '../../context/SettingsContext';

/**
 * Simple icon button toggle for Expert Mode
 */
const ExpertModeToggle = ({ showLabel = false, variant = 'icon' }) => {
  const { expertMode, toggleExpertMode } = useSettings();

  if (variant === 'switch') {
    return (
      <FormControlLabel
        control={
          <Switch
            checked={expertMode}
            onChange={toggleExpertMode}
            color="warning"
            size="small"
          />
        }
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {expertMode ? (
              <ExpertIcon fontSize="small" color="warning" />
            ) : (
              <ShieldIcon fontSize="small" color="primary" />
            )}
            <Typography variant="body2">
              {expertMode ? 'Expert Mode' : 'Protected Mode'}
            </Typography>
          </Box>
        }
      />
    );
  }

  if (variant === 'chip') {
    return (
      <Tooltip
        title={
          expertMode
            ? 'Expert Mode: Guardian warnings shown but tests not blocked. Click to disable.'
            : 'Protected Mode: Tests blocked on critical violations. Click to enable Expert Mode.'
        }
      >
        <Chip
          icon={expertMode ? <WarningIcon /> : <ShieldIcon />}
          label={expertMode ? 'Expert Mode' : 'Protected'}
          color={expertMode ? 'warning' : 'primary'}
          variant={expertMode ? 'filled' : 'outlined'}
          size="small"
          onClick={toggleExpertMode}
          sx={{
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'scale(1.05)'
            }
          }}
        />
      </Tooltip>
    );
  }

  // Default: icon button
  return (
    <Tooltip
      title={
        expertMode
          ? 'Expert Mode Active: Tests not blocked on violations. Click to enable protection.'
          : 'Protected Mode: Tests blocked on critical violations. Click for Expert Mode.'
      }
    >
      <IconButton
        onClick={toggleExpertMode}
        color={expertMode ? 'warning' : 'primary'}
        aria-label="toggle expert mode"
        sx={{
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: expertMode
              ? 'rgba(237, 108, 2, 0.1)'
              : 'rgba(25, 118, 210, 0.1)',
            transform: 'scale(1.1)'
          }
        }}
      >
        {expertMode ? (
          <ExpertIcon />
        ) : (
          <ShieldIcon />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default ExpertModeToggle;
