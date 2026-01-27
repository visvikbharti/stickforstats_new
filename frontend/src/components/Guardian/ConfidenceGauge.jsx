/**
 * ConfidenceGauge Component
 * =========================
 *
 * Visual gauge displaying the Guardian confidence score for statistical results.
 *
 * @author StickForStats Development Team
 * @date 2026-01-26
 */

import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Tooltip,
  Stack,
  useTheme,
} from '@mui/material';

/**
 * Get color based on score
 */
const getScoreColor = (score, theme) => {
  if (score >= 80) return theme.palette.success.main;
  if (score >= 60) return theme.palette.warning.main;
  return theme.palette.error.main;
};

/**
 * Get interpretation based on score
 */
const getInterpretation = (score) => {
  if (score >= 90) return 'Excellent - All assumptions well supported';
  if (score >= 80) return 'Good - Minor concerns, results reliable';
  if (score >= 70) return 'Acceptable - Some assumptions questionable';
  if (score >= 60) return 'Caution - Notable assumption issues';
  if (score >= 50) return 'Warning - Consider alternative analysis';
  return 'Critical - Results may be unreliable';
};

/**
 * ConfidenceGauge Component
 */
const ConfidenceGauge = ({ score = 0, showInterpretation = true }) => {
  const theme = useTheme();
  const color = getScoreColor(score, theme);
  const interpretation = getInterpretation(score);

  return (
    <Tooltip title={interpretation}>
      <Box>
        {/* Score Display */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Confidence Score
          </Typography>
          <Typography
            variant="h6"
            fontWeight="bold"
            sx={{ color }}
          >
            {score.toFixed(0)}%
          </Typography>
        </Stack>

        {/* Progress Bar */}
        <Box sx={{ position: 'relative' }}>
          {/* Background Track */}
          <LinearProgress
            variant="determinate"
            value={100}
            sx={{
              height: 12,
              borderRadius: 1,
              bgcolor: theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                bgcolor: theme.palette.grey[200],
              },
            }}
          />

          {/* Colored Progress */}
          <LinearProgress
            variant="determinate"
            value={score}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 12,
              borderRadius: 1,
              bgcolor: 'transparent',
              '& .MuiLinearProgress-bar': {
                bgcolor: color,
                borderRadius: 1,
              },
            }}
          />

          {/* Threshold Markers */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: '60%',
              width: '1px',
              height: 12,
              bgcolor: theme.palette.warning.main,
              opacity: 0.5,
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: '80%',
              width: '1px',
              height: 12,
              bgcolor: theme.palette.success.main,
              opacity: 0.5,
            }}
          />
        </Box>

        {/* Threshold Labels */}
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="error.main">
            0%
          </Typography>
          <Typography variant="caption" color="warning.main">
            60%
          </Typography>
          <Typography variant="caption" color="success.main">
            80%
          </Typography>
          <Typography variant="caption" color="success.main">
            100%
          </Typography>
        </Stack>

        {/* Interpretation */}
        {showInterpretation && (
          <Typography
            variant="caption"
            sx={{
              mt: 1,
              display: 'block',
              color: 'text.secondary',
              fontStyle: 'italic',
            }}
          >
            {interpretation}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
};

export default ConfidenceGauge;
