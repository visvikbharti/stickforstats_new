/**
 * DecisionMatrixVisualization.jsx
 *
 * Interactive 2x2 decision matrix showing the four possible outcomes
 * in hypothesis testing: True Positive (Power), True Negative,
 * False Positive (Type I Error/α), False Negative (Type II Error/β).
 *
 * Features:
 * - Animated matrix cells with hover states
 * - Real-world examples for each outcome
 * - Adjustable α and β with live updates
 * - Sample trajectory animation
 * - Probability annotations
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Slider,
  Card,
  CardContent,
  Alert,
  Chip,
  useTheme
} from '@mui/material';
import { alpha as alphaFn } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';

// Cell data with real-world examples
const CELL_DATA = {
  truePositive: {
    title: 'True Positive',
    subtitle: 'Correct Rejection',
    probability: 'Power = 1 - β',
    color: '#4caf50',
    bgColor: (theme) => alphaFn(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08),
    icon: <CheckCircleIcon />,
    description: 'Correctly detecting a real effect',
    examples: [
      'Drug trial: Drug works AND we detect it',
      'Quality control: Defective product correctly identified',
      'Medical diagnosis: Disease present AND detected'
    ]
  },
  trueNegative: {
    title: 'True Negative',
    subtitle: 'Correct Non-Rejection',
    probability: '1 - α',
    color: '#2196f3',
    bgColor: (theme) => alphaFn(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08),
    icon: <CheckCircleIcon />,
    description: 'Correctly not detecting when no effect exists',
    examples: [
      'Drug trial: Placebo shows no effect (as expected)',
      'Quality control: Good product correctly passed',
      'Medical diagnosis: Healthy person tests negative'
    ]
  },
  falsePositive: {
    title: 'Type I Error',
    subtitle: 'False Positive',
    probability: 'α (Alpha)',
    color: '#f44336',
    bgColor: (theme) => alphaFn(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08),
    icon: <ErrorIcon />,
    description: 'Detecting an effect that does not exist',
    examples: [
      'Drug trial: Placebo appears effective (false alarm)',
      'Quality control: Good product incorrectly rejected',
      'Medical diagnosis: Healthy person diagnosed with disease'
    ]
  },
  falseNegative: {
    title: 'Type II Error',
    subtitle: 'False Negative',
    probability: 'β (Beta)',
    color: '#ff9800',
    bgColor: (theme) => alphaFn(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08),
    icon: <WarningIcon />,
    description: 'Missing a real effect that exists',
    examples: [
      'Drug trial: Effective drug appears ineffective (miss)',
      'Quality control: Defective product incorrectly passed',
      'Medical diagnosis: Sick person tests negative'
    ]
  }
};

// Matrix cell component
const MatrixCell = ({
  cellKey,
  data,
  probability,
  isHovered,
  onHover,
  size = 'medium'
}) => {
  const isLarge = size === 'large';

  return (
    <Card
      onMouseEnter={() => onHover(cellKey)}
      onMouseLeave={() => onHover(null)}
      sx={{
        height: isLarge ? 200 : 160,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isHovered ? 8 : 2,
        bgcolor: data.bgColor,
        border: `2px solid ${isHovered ? data.color : 'transparent'}`,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ color: data.color, mr: 1 }}>
            {data.icon}
          </Box>
          <Typography variant="subtitle1" fontWeight="bold" color={data.color}>
            {data.title}
          </Typography>
        </Box>

        {/* Subtitle */}
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {data.subtitle}
        </Typography>

        {/* Probability */}
        <Chip
          label={`P = ${typeof probability === 'number' ? probability.toFixed(3) : data.probability}`}
          size="small"
          sx={{
            bgcolor: data.color,
            color: 'white',
            fontWeight: 'bold',
            alignSelf: 'flex-start',
            mt: 'auto'
          }}
        />

        {/* Hover expansion */}
        {isHovered && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: 'rgba(255,255,255,0.95)',
              p: 1,
              borderTop: `2px solid ${data.color}`,
              animation: 'slideUp 0.2s ease'
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {data.description}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Main Decision Matrix Visualization Component
 */
const DecisionMatrixVisualization = ({ embedded = false }) => {
  const theme = useTheme();

  // State
  const [alpha, setAlpha] = useState(0.05);
  const [power, setPower] = useState(0.80);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [selectedExample, setSelectedExample] = useState(null);

  // Derived values
  const beta = 1 - power;

  // Cell probabilities
  const probabilities = useMemo(() => ({
    truePositive: power,
    trueNegative: 1 - alpha,
    falsePositive: alpha,
    falseNegative: beta
  }), [alpha, power, beta]);

  // Handle hover
  const handleHover = useCallback((cellKey) => {
    setHoveredCell(cellKey);
    if (cellKey && CELL_DATA[cellKey]) {
      setSelectedExample(CELL_DATA[cellKey]);
    }
  }, []);

  return (
    <Paper
      elevation={embedded ? 0 : 3}
      sx={{
        p: 3,
        bgcolor: embedded ? 'transparent' : 'background.paper'
      }}
    >
      {!embedded && (
        <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
          Decision Matrix: The Four Outcomes
        </Typography>
      )}

      <Typography variant="body2" color="text.secondary" paragraph>
        Every hypothesis test results in one of four outcomes. Understanding this 2×2 matrix
        is fundamental to statistical power analysis.
      </Typography>

      <Grid container spacing={3}>
        {/* Controls */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              Adjust Error Rates
            </Typography>

            {/* Alpha slider */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Significance Level (α): <strong>{alpha.toFixed(3)}</strong>
              </Typography>
              <Slider
                value={alpha}
                onChange={(e, v) => setAlpha(v)}
                min={0.01}
                max={0.20}
                step={0.01}
                marks={[
                  { value: 0.01, label: '0.01' },
                  { value: 0.05, label: '0.05' },
                  { value: 0.10, label: '0.10' }
                ]}
                sx={{ color: '#f44336' }}
              />
              <Typography variant="caption" color="text.secondary">
                Type I error rate (false positive risk)
              </Typography>
            </Box>

            {/* Power slider */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Statistical Power (1-β): <strong>{power.toFixed(2)}</strong>
              </Typography>
              <Slider
                value={power}
                onChange={(e, v) => setPower(v)}
                min={0.50}
                max={0.99}
                step={0.01}
                marks={[
                  { value: 0.70, label: '70%' },
                  { value: 0.80, label: '80%' },
                  { value: 0.90, label: '90%' }
                ]}
                sx={{ color: '#4caf50' }}
              />
              <Typography variant="caption" color="text.secondary">
                Type II error: β = {beta.toFixed(2)} ({(beta * 100).toFixed(0)}%)
              </Typography>
            </Box>

            {/* Error rate relationship */}
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="caption">
                <strong>Key Insight:</strong> α and β trade off against each other
                for fixed sample size. Lower α → higher β (and vice versa).
              </Typography>
            </Alert>
          </Paper>
        </Grid>

        {/* Matrix */}
        <Grid item xs={12} md={8}>
          <Box sx={{ position: 'relative' }}>
            {/* Column headers */}
            <Grid container spacing={1} sx={{ mb: 1 }}>
              <Grid item xs={4}>
                {/* Empty corner */}
              </Grid>
              <Grid item xs={4}>
                <Paper sx={{ p: 1, textAlign: 'center', bgcolor: (theme) => alphaFn(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
                  <Typography variant="subtitle2" fontWeight="bold" color="#2e7d32">
                    H₀ True
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    (No real effect)
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper sx={{ p: 1, textAlign: 'center', bgcolor: (theme) => alphaFn(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
                  <Typography variant="subtitle2" fontWeight="bold" color="#e65100">
                    H₁ True
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    (Effect exists)
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Row 1: Reject H₀ */}
            <Grid container spacing={1} sx={{ mb: 1 }}>
              <Grid item xs={4}>
                <Paper sx={{
                  p: 1,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  textAlign: 'center',
                  bgcolor: (theme) => alphaFn(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08)
                }}>
                  <Typography variant="subtitle2" fontWeight="bold" color="#c62828">
                    Reject H₀
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    (Declare effect)
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <MatrixCell
                  cellKey="falsePositive"
                  data={CELL_DATA.falsePositive}
                  probability={probabilities.falsePositive}
                  isHovered={hoveredCell === 'falsePositive'}
                  onHover={handleHover}
                />
              </Grid>
              <Grid item xs={4}>
                <MatrixCell
                  cellKey="truePositive"
                  data={CELL_DATA.truePositive}
                  probability={probabilities.truePositive}
                  isHovered={hoveredCell === 'truePositive'}
                  onHover={handleHover}
                />
              </Grid>
            </Grid>

            {/* Row 2: Fail to Reject H₀ */}
            <Grid container spacing={1}>
              <Grid item xs={4}>
                <Paper sx={{
                  p: 1,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  textAlign: 'center',
                  bgcolor: (theme) => alphaFn(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08)
                }}>
                  <Typography variant="subtitle2" fontWeight="bold" color="#1565c0">
                    Fail to Reject H₀
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    (No effect found)
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <MatrixCell
                  cellKey="trueNegative"
                  data={CELL_DATA.trueNegative}
                  probability={probabilities.trueNegative}
                  isHovered={hoveredCell === 'trueNegative'}
                  onHover={handleHover}
                />
              </Grid>
              <Grid item xs={4}>
                <MatrixCell
                  cellKey="falseNegative"
                  data={CELL_DATA.falseNegative}
                  probability={probabilities.falseNegative}
                  isHovered={hoveredCell === 'falseNegative'}
                  onHover={handleHover}
                />
              </Grid>
            </Grid>
          </Box>
        </Grid>

        {/* Example display */}
        {selectedExample && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: selectedExample.bgColor, border: `2px solid ${selectedExample.color}` }}>
              <Typography variant="subtitle1" fontWeight="bold" color={selectedExample.color} gutterBottom>
                {selectedExample.title}: Real-World Examples
              </Typography>
              <Grid container spacing={2}>
                {selectedExample.examples.map((example, idx) => (
                  <Grid item xs={12} md={4} key={idx}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <Box sx={{ color: selectedExample.color, mr: 1, mt: 0.5 }}>
                        {idx === 0 ? '💊' : idx === 1 ? '🏭' : '🏥'}
                      </Box>
                      <Typography variant="body2">{example}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Summary statistics */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              Probability Summary (When Testing)
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="#f44336" fontWeight="bold">
                    {(alpha * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="caption">False Positive Rate (α)</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="#2196f3" fontWeight="bold">
                    {((1 - alpha) * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="caption">Correct if H₀ true</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="#4caf50" fontWeight="bold">
                    {(power * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="caption">Detection Rate (Power)</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="#ff9800" fontWeight="bold">
                    {(beta * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="caption">Miss Rate (β)</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Educational note */}
        <Grid item xs={12}>
          <Alert severity="warning">
            <Typography variant="body2">
              <strong>Crucial Understanding:</strong> These probabilities are <em>conditional</em>.
              α is the probability of rejecting H₀ <em>given that H₀ is true</em>.
              Power is the probability of rejecting H₀ <em>given that H₁ is true</em>.
              They do NOT tell you the probability that your conclusion is correct!
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default DecisionMatrixVisualization;
