/**
 * GuardianBadge Component
 * =======================
 *
 * A compact badge indicator for Guardian status.
 * Can be placed next to statistical results to show at-a-glance assumption status.
 *
 * @author StickForStats Development Team
 * @date 2026-01-26
 */

import React from 'react';
import {
  Box,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Shield as ShieldIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

/**
 * GuardianBadge Component
 */
const GuardianBadge = ({
  confidenceScore = 0,
  violations = [],
  canProceed = true,
  expertModeOverride = false,
  size = 'small',
  showScore = true,
  onClick,
}) => {
  // Count violations by severity
  const criticalCount = violations.filter((v) => v.severity === 'critical').length;
  const warningCount = violations.filter((v) => v.severity === 'warning').length;

  // Determine badge status
  const getStatus = () => {
    if (expertModeOverride) {
      return {
        color: 'warning',
        icon: ShieldIcon,
        label: 'Override',
        tooltip: 'Expert mode override active',
      };
    }
    if (!canProceed || criticalCount > 0) {
      return {
        color: 'error',
        icon: ErrorIcon,
        label: criticalCount > 0 ? `${criticalCount} Critical` : 'Blocked',
        tooltip: `Critical violations: ${criticalCount}`,
      };
    }
    if (warningCount > 0) {
      return {
        color: 'warning',
        icon: WarningIcon,
        label: `${warningCount} Warning`,
        tooltip: `Warning violations: ${warningCount}`,
      };
    }
    return {
      color: 'success',
      icon: CheckCircleIcon,
      label: 'Valid',
      tooltip: 'All assumptions validated',
    };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  // Build tooltip content
  const tooltipContent = (
    <Box>
      <Box fontWeight="bold" mb={0.5}>
        Guardian Status: {status.label}
      </Box>
      <Box>Confidence: {confidenceScore.toFixed(0)}%</Box>
      {criticalCount > 0 && (
        <Box color="error.main">Critical violations: {criticalCount}</Box>
      )}
      {warningCount > 0 && (
        <Box color="warning.main">Warnings: {warningCount}</Box>
      )}
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} arrow>
      <Chip
        size={size}
        icon={<StatusIcon fontSize="small" />}
        label={showScore ? `${confidenceScore.toFixed(0)}%` : status.label}
        color={status.color}
        variant="outlined"
        onClick={onClick}
        sx={{
          cursor: onClick ? 'pointer' : 'default',
          fontWeight: 'bold',
          '& .MuiChip-icon': {
            color: `${status.color}.main`,
          },
        }}
      />
    </Tooltip>
  );
};

export default GuardianBadge;
