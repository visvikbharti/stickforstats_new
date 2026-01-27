/**
 * GuardianReportDisplay Component
 * ================================
 *
 * Displays Guardian assumption validation reports alongside statistical results.
 *
 * Design Contract Compliance:
 * - "No statistical result may exist without an explicit, traceable assumption context."
 * - This component ensures users always see assumption validation information
 *
 * Features:
 * - Assumption check list with pass/fail indicators
 * - Violation display with severity coloring
 * - Confidence score gauge
 * - Alternative test recommendations
 * - Collapsible detailed view
 * - Dark/light theme support
 *
 * @author StickForStats Development Team
 * @date 2026-01-26
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Collapse,
  IconButton,
  Alert,
  AlertTitle,
  Tooltip,
  Button,
  Stack,
  useTheme,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Shield as ShieldIcon,
  Lightbulb as LightbulbIcon,
  Science as ScienceIcon,
} from '@mui/icons-material';

import ConfidenceGauge from './ConfidenceGauge';
import ViolationCard from './ViolationCard';

/**
 * Main Guardian Report Display Component
 */
const GuardianReportDisplay = ({
  guardianReport,
  assumptionsChecked = [],
  violations = [],
  confidenceScore = 0,
  canProceed = true,
  alternativeTests = [],
  expertModeOverride = false,
  compact = false,
  onAlternativeSelect,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(!compact);
  const [showDetails, setShowDetails] = useState(false);

  // Handle missing Guardian context
  if (!guardianReport && assumptionsChecked.length === 0) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        <AlertTitle>Missing Guardian Context</AlertTitle>
        This result does not include assumption validation information.
        Statistical results should always include Guardian context for scientific validity.
      </Alert>
    );
  }

  // Count violations by severity
  const violationCounts = violations.reduce((acc, v) => {
    const severity = v.severity || 'info';
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {});

  const hasCritical = violationCounts.critical > 0;
  const hasWarning = violationCounts.warning > 0;

  // Determine overall status
  const getOverallStatus = () => {
    if (expertModeOverride) {
      return {
        severity: 'warning',
        message: 'Expert Mode Override Active',
        icon: ShieldIcon,
      };
    }
    if (!canProceed) {
      return {
        severity: 'error',
        message: 'Analysis Blocked - Critical Violations',
        icon: ErrorIcon,
      };
    }
    if (hasCritical) {
      return {
        severity: 'error',
        message: 'Critical Assumption Violations',
        icon: ErrorIcon,
      };
    }
    if (hasWarning) {
      return {
        severity: 'warning',
        message: 'Assumption Warnings Present',
        icon: WarningIcon,
      };
    }
    return {
      severity: 'success',
      message: 'All Assumptions Validated',
      icon: CheckCircleIcon,
    };
  };

  const status = getOverallStatus();

  return (
    <Paper
      elevation={2}
      sx={{
        mb: 2,
        overflow: 'hidden',
        border: `1px solid ${
          status.severity === 'error'
            ? theme.palette.error.main
            : status.severity === 'warning'
            ? theme.palette.warning.main
            : theme.palette.success.main
        }`,
      }}
    >
      {/* Header Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1.5,
          bgcolor:
            status.severity === 'error'
              ? 'error.light'
              : status.severity === 'warning'
              ? 'warning.light'
              : 'success.light',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <ShieldIcon
            sx={{
              color:
                status.severity === 'error'
                  ? 'error.dark'
                  : status.severity === 'warning'
                  ? 'warning.dark'
                  : 'success.dark',
            }}
          />
          <Typography
            variant="subtitle1"
            fontWeight="bold"
            sx={{
              color:
                status.severity === 'error'
                  ? 'error.dark'
                  : status.severity === 'warning'
                  ? 'warning.dark'
                  : 'success.dark',
            }}
          >
            Guardian Assumption Report
          </Typography>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}>
          {/* Violation Count Chips */}
          {violationCounts.critical > 0 && (
            <Chip
              size="small"
              color="error"
              label={`${violationCounts.critical} Critical`}
            />
          )}
          {violationCounts.warning > 0 && (
            <Chip
              size="small"
              color="warning"
              label={`${violationCounts.warning} Warning`}
            />
          )}

          {/* Confidence Score */}
          <Tooltip title={`Confidence Score: ${confidenceScore.toFixed(1)}%`}>
            <Chip
              size="small"
              variant="outlined"
              label={`${confidenceScore.toFixed(0)}%`}
              sx={{
                fontWeight: 'bold',
                borderColor:
                  confidenceScore >= 80
                    ? 'success.main'
                    : confidenceScore >= 60
                    ? 'warning.main'
                    : 'error.main',
                color:
                  confidenceScore >= 80
                    ? 'success.main'
                    : confidenceScore >= 60
                    ? 'warning.main'
                    : 'error.main',
              }}
            />
          </Tooltip>

          <IconButton size="small">
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Stack>
      </Box>

      {/* Expandable Content */}
      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          {/* Status Message */}
          <Alert severity={status.severity} icon={<status.icon />} sx={{ mb: 2 }}>
            {status.message}
          </Alert>

          {/* Expert Mode Warning */}
          {expertModeOverride && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <AlertTitle>Expert Mode Active</AlertTitle>
              You have overridden critical assumption violations. Results should
              be interpreted with caution and clearly reported in any publication.
            </Alert>
          )}

          {/* Confidence Gauge */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Result Confidence
            </Typography>
            <ConfidenceGauge score={confidenceScore} />
          </Box>

          {/* Assumptions Checked */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Assumptions Checked ({assumptionsChecked.length})
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {assumptionsChecked.map((assumption, idx) => {
                const hasViolation = violations.some(
                  (v) => v.assumption === assumption
                );
                return (
                  <Chip
                    key={idx}
                    size="small"
                    icon={
                      hasViolation ? (
                        <WarningIcon fontSize="small" />
                      ) : (
                        <CheckCircleIcon fontSize="small" />
                      )
                    }
                    label={assumption.replace(/_/g, ' ')}
                    color={hasViolation ? 'warning' : 'success'}
                    variant="outlined"
                  />
                );
              })}
            </Stack>
          </Box>

          {/* Violations */}
          {violations.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Violations ({violations.length})
              </Typography>
              <Stack spacing={1}>
                {violations.map((violation, idx) => (
                  <ViolationCard key={idx} violation={violation} />
                ))}
              </Stack>
            </Box>
          )}

          {/* Alternative Tests */}
          {alternativeTests.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                <LightbulbIcon
                  fontSize="small"
                  sx={{ verticalAlign: 'middle', mr: 0.5 }}
                />
                Recommended Alternatives
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {alternativeTests.map((test, idx) => (
                  <Chip
                    key={idx}
                    size="small"
                    icon={<ScienceIcon fontSize="small" />}
                    label={test.replace(/_/g, ' ')}
                    variant="outlined"
                    color="primary"
                    clickable={!!onAlternativeSelect}
                    onClick={() => onAlternativeSelect?.(test)}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Show Details Button */}
          {guardianReport && (
            <Button
              size="small"
              variant="text"
              onClick={() => setShowDetails(!showDetails)}
              startIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            >
              {showDetails ? 'Hide Details' : 'Show Full Report'}
            </Button>
          )}

          {/* Full Report Details */}
          <Collapse in={showDetails}>
            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: 'grey.100',
                borderRadius: 1,
                overflow: 'auto',
              }}
            >
              <Typography variant="caption" component="pre">
                {JSON.stringify(guardianReport, null, 2)}
              </Typography>
            </Box>
          </Collapse>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default GuardianReportDisplay;
