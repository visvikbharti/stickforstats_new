/**
 * ViolationCard Component
 * =======================
 *
 * Displays a single assumption violation with severity, details, and recommendations.
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
  Stack,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Lightbulb as LightbulbIcon,
} from '@mui/icons-material';

/**
 * Severity configuration
 */
const SEVERITY_CONFIG = {
  critical: {
    color: 'error',
    icon: ErrorIcon,
    label: 'Critical',
    bgcolor: 'error.lighter',
    borderColor: 'error.main',
  },
  warning: {
    color: 'warning',
    icon: WarningIcon,
    label: 'Warning',
    bgcolor: 'warning.lighter',
    borderColor: 'warning.main',
  },
  info: {
    color: 'info',
    icon: InfoIcon,
    label: 'Info',
    bgcolor: 'info.lighter',
    borderColor: 'info.main',
  },
};

/**
 * ViolationCard Component
 */
const ViolationCard = ({ violation }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const {
    assumption = 'Unknown',
    severity = 'info',
    message = 'No details available',
    test_name,
    p_value,
    statistic,
    recommendation,
    visual_evidence,
  } = violation;

  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
  const SeverityIcon = config.icon;

  return (
    <Paper
      elevation={1}
      sx={{
        p: 1.5,
        borderLeft: `4px solid`,
        borderColor: config.borderColor,
        bgcolor:
          theme.palette.mode === 'dark'
            ? `${config.color}.dark`
            : `${config.color}.lighter`,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <SeverityIcon
            fontSize="small"
            color={config.color}
          />
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
              {assumption.replace(/_/g, ' ')}
            </Typography>
            <Chip
              size="small"
              label={config.label}
              color={config.color}
              sx={{ height: 20, fontSize: '0.7rem', mt: 0.5 }}
            />
          </Box>
        </Stack>

        {/* Stats */}
        <Stack direction="row" alignItems="center" spacing={1}>
          {p_value !== undefined && (
            <Tooltip title="p-value">
              <Chip
                size="small"
                variant="outlined"
                label={`p = ${p_value < 0.001 ? '<.001' : p_value.toFixed(3)}`}
                sx={{ fontSize: '0.7rem' }}
              />
            </Tooltip>
          )}
          {statistic !== undefined && (
            <Tooltip title="Test statistic">
              <Chip
                size="small"
                variant="outlined"
                label={`stat = ${statistic.toFixed(3)}`}
                sx={{ fontSize: '0.7rem' }}
              />
            </Tooltip>
          )}
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Stack>
      </Box>

      {/* Message */}
      <Typography variant="body2" sx={{ mt: 1 }}>
        {message}
      </Typography>

      {/* Expanded Details */}
      <Collapse in={expanded}>
        <Box sx={{ mt: 2 }}>
          {/* Test Name */}
          {test_name && (
            <Typography variant="caption" color="text.secondary" display="block">
              <strong>Test:</strong> {test_name}
            </Typography>
          )}

          {/* Recommendation */}
          {recommendation && (
            <Box
              sx={{
                mt: 1,
                p: 1,
                bgcolor: 'background.paper',
                borderRadius: 1,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Stack direction="row" alignItems="flex-start" spacing={1}>
                <LightbulbIcon
                  fontSize="small"
                  color="primary"
                  sx={{ mt: 0.25 }}
                />
                <Box>
                  <Typography variant="caption" fontWeight="bold" color="primary">
                    Recommendation
                  </Typography>
                  <Typography variant="body2">
                    {recommendation}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}

          {/* Visual Evidence */}
          {visual_evidence && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Visual Evidence:</strong> {visual_evidence}
              </Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default ViolationCard;
