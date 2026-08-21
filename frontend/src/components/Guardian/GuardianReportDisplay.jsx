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
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';

import ConfidenceGauge from './ConfidenceGauge';
import ViolationCard from './ViolationCard';

/**
 * Main Guardian Report Display Component
 */
const GuardianReportDisplay = ({
  guardianReport,
  assumptionsChecked = [],
  assumptionsNotEvaluated = [],
  assumptionCoverage = null,
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
            {/*
              Confidence grades how BAD the findings were; it is severity-weighted and says
              nothing about how much was examined. Shown together they answer different
              questions, and the pair is the point: on identical data, `pearson` returns
              confidence 1.0 at coverage 1.00 while `mann_whitney` returns confidence 1.0 at
              coverage 0.50. Reading confidence alone, those are indistinguishable.
            */}
            {assumptionCoverage !== null && (
              <Tooltip
                arrow
                title={
                  `Assumption coverage: ${assumptionsChecked.length} of ` +
                  `${assumptionsChecked.length + assumptionsNotEvaluated.length} required ` +
                  `assumptions were actually examined on this data. Confidence grades what was ` +
                  `FOUND; coverage says how much was LOOKED AT. A high confidence over low ` +
                  `coverage is a clean report on a small part of the question.`
                }
              >
                <Typography
                  variant="caption"
                  sx={{ display: 'block', mt: 0.5, color: theme.palette.text.secondary }}
                >
                  Assumption coverage: {Math.round(assumptionCoverage * 100)}%{' '}
                  ({assumptionsChecked.length} of{' '}
                  {assumptionsChecked.length + assumptionsNotEvaluated.length} examined)
                </Typography>
              </Tooltip>
            )}
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

          {/*
            Assumptions the test REQUIRES that were not examined on this data.

            Without this block the panel is silently narrower than the truth: the backend used
            to list every requirement as "checked" (independence on 22 of 25 test types, while
            the audit trail recorded not_applicable), and now lists only what actually ran. Show
            only the checked chips and a reader cannot tell "this test needs three things" from
            "it needs four and we did three".

            Styled deliberately unlike the checked chips -- neutral, dashed, a help icon rather
            than a tick or a warning. It is not a violation (we found nothing wrong) and it is
            not a pass (we did not look). It is the third state the UI never had.
          */}
          {assumptionsNotEvaluated.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Required but NOT evaluated ({assumptionsNotEvaluated.length})
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {assumptionsNotEvaluated.map((assumption, idx) => (
                  <Tooltip
                    key={idx}
                    arrow
                    title={
                      `This test requires ${assumption.replace(/_/g, ' ')}, but it could not be ` +
                      `examined on this data — so it is UNVERIFIED, not satisfied. ` +
                      (assumption === 'independence'
                        ? 'The lag-1 autocorrelation check runs only when the rows are declared ' +
                          'to be in a meaningful order; pass observation_order="sequential" if ' +
                          'they are.'
                        : 'Absence of evidence is not evidence of absence.')
                    }
                  >
                    <Chip
                      size="small"
                      icon={<HelpOutlineIcon fontSize="small" />}
                      label={assumption.replace(/_/g, ' ')}
                      variant="outlined"
                      sx={{
                        borderStyle: 'dashed',
                        color: theme.palette.text.secondary,
                        borderColor: theme.palette.divider,
                      }}
                    />
                  </Tooltip>
                ))}
              </Stack>
            </Box>
          )}

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
