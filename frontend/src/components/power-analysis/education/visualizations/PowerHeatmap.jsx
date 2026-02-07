/**
 * PowerHeatmap.jsx
 *
 * Interactive 2D heatmap showing statistical power as a function of
 * sample size (x-axis) and effect size (y-axis).
 *
 * Features:
 * - Color gradient from red (low power) to green (high power)
 * - Contour lines at 70%, 80%, 90% power
 * - Click to get exact power values
 * - Multiple test types
 * - Sample size recommendations
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert
} from '@mui/material';
import { alpha as alphaFn } from '@mui/material/styles';
import { powerTwoSampleTTest, powerOneSampleTTest, powerOneWayANOVA } from '../utils/powerCalculations';

// Color scale for power values (red -> yellow -> green)
const getPowerColor = (power) => {
  if (power < 0.5) {
    // Red to yellow (0 -> 0.5)
    const ratio = power / 0.5;
    const r = 255;
    const g = Math.round(ratio * 255);
    const b = 0;
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Yellow to green (0.5 -> 1)
    const ratio = (power - 0.5) / 0.5;
    const r = Math.round(255 * (1 - ratio));
    const g = 255;
    const b = 0;
    return `rgb(${r}, ${g}, ${b})`;
  }
};

// Get power for different test types
const calculatePower = (testType, n, effectSize, alpha, groups = 3) => {
  switch (testType) {
    case 'two-sample-t':
      return powerTwoSampleTTest(n, n, effectSize, alpha);
    case 'one-sample-t':
      return powerOneSampleTTest(n, effectSize, alpha);
    case 'anova':
      return powerOneWayANOVA(n, groups, effectSize, alpha);
    default:
      return powerTwoSampleTTest(n, n, effectSize, alpha);
  }
};

/**
 * Main Power Heatmap Visualization Component
 */
const PowerHeatmap = ({ embedded = false }) => {
  const canvasRef = useRef(null);

  // State
  const [testType, setTestType] = useState('two-sample-t');
  const [alpha, setAlpha] = useState(0.05);
  const [groups, setGroups] = useState(3);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);

  // Grid parameters
  const nMin = 5;
  const nMax = 150;
  const nStep = 5;
  const effectMin = 0.1;
  const effectMax = 1.2;
  const effectStep = 0.05;

  // Generate sample size array
  const sampleSizes = useMemo(() => {
    const sizes = [];
    for (let n = nMin; n <= nMax; n += nStep) {
      sizes.push(n);
    }
    return sizes;
  }, []);

  // Generate effect size array
  const effectSizes = useMemo(() => {
    const effects = [];
    for (let d = effectMin; d <= effectMax; d += effectStep) {
      effects.push(parseFloat(d.toFixed(2)));
    }
    return effects;
  }, []);

  // Calculate power grid
  const powerGrid = useMemo(() => {
    const grid = [];
    for (let i = 0; i < effectSizes.length; i++) {
      const row = [];
      for (let j = 0; j < sampleSizes.length; j++) {
        const power = calculatePower(testType, sampleSizes[j], effectSizes[i], alpha, groups);
        row.push(Math.min(1, Math.max(0, power)));
      }
      grid.push(row);
    }
    return grid;
  }, [testType, alpha, groups, sampleSizes, effectSizes]);

  // Find contour lines
  const findContourPoints = useCallback((targetPower) => {
    const points = [];
    for (let i = 0; i < effectSizes.length; i++) {
      for (let j = 0; j < sampleSizes.length - 1; j++) {
        const p1 = powerGrid[i][j];
        const p2 = powerGrid[i][j + 1];

        // Check if contour crosses between these points
        if ((p1 <= targetPower && p2 >= targetPower) || (p1 >= targetPower && p2 <= targetPower)) {
          // Interpolate position
          const ratio = (targetPower - p1) / (p2 - p1);
          const n = sampleSizes[j] + ratio * nStep;
          points.push({ n, d: effectSizes[i] });
        }
      }
    }
    return points;
  }, [powerGrid, sampleSizes, effectSizes]);

  // Draw heatmap
  const drawHeatmap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Margins
    const margin = { top: 40, right: 120, bottom: 60, left: 70 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    // Cell dimensions
    const cellWidth = plotWidth / sampleSizes.length;
    const cellHeight = plotHeight / effectSizes.length;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw cells
    for (let i = 0; i < effectSizes.length; i++) {
      for (let j = 0; j < sampleSizes.length; j++) {
        const power = powerGrid[i][j];
        const x = margin.left + j * cellWidth;
        const y = margin.top + (effectSizes.length - 1 - i) * cellHeight;

        ctx.fillStyle = getPowerColor(power);
        ctx.fillRect(x, y, cellWidth, cellHeight);

        // Highlight hovered cell
        if (hoveredCell && hoveredCell.i === i && hoveredCell.j === j) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
        }

        // Highlight selected cell
        if (selectedCell && selectedCell.i === i && selectedCell.j === j) {
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
        }
      }
    }

    // Draw contour lines
    const contourLevels = [0.7, 0.8, 0.9];
    const contourColors = ['#fff', '#fff', '#fff'];

    contourLevels.forEach((level, idx) => {
      const points = findContourPoints(level);

      if (points.length > 0) {
        ctx.strokeStyle = contourColors[idx];
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);

        // Sort points by effect size
        points.sort((a, b) => a.d - b.d);

        ctx.beginPath();
        points.forEach((point, i) => {
          const x = margin.left + ((point.n - nMin) / (nMax - nMin)) * plotWidth;
          const y = margin.top + (1 - (point.d - effectMin) / (effectMax - effectMin)) * plotHeight;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();

        // Label contour
        if (points.length > 0) {
          const lastPoint = points[points.length - 1];
          const x = margin.left + ((lastPoint.n - nMin) / (nMax - nMin)) * plotWidth;
          const y = margin.top + (1 - (lastPoint.d - effectMin) / (effectMax - effectMin)) * plotHeight;

          ctx.fillStyle = '#fff';
          ctx.font = 'bold 11px Arial';
          ctx.textAlign = 'left';
          ctx.fillText(`${(level * 100).toFixed(0)}%`, x + 5, y);
        }
      }
    });

    ctx.setLineDash([]);

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + plotHeight);
    ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
    ctx.stroke();

    // X-axis labels (sample size)
    ctx.fillStyle = '#333';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    for (let j = 0; j < sampleSizes.length; j += 3) {
      const x = margin.left + j * cellWidth + cellWidth / 2;
      ctx.fillText(sampleSizes[j].toString(), x, margin.top + plotHeight + 20);
    }
    ctx.font = '13px Arial';
    ctx.fillText('Sample Size (n per group)', margin.left + plotWidth / 2, height - 10);

    // Y-axis labels (effect size)
    ctx.textAlign = 'right';
    ctx.font = '11px Arial';
    for (let i = 0; i < effectSizes.length; i += 4) {
      const y = margin.top + (effectSizes.length - 1 - i) * cellHeight + cellHeight / 2;
      ctx.fillText(effectSizes[i].toFixed(2), margin.left - 8, y + 4);
    }

    // Y-axis title
    ctx.save();
    ctx.translate(15, margin.top + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.font = '13px Arial';
    ctx.fillText("Effect Size (Cohen's d)", 0, 0);
    ctx.restore();

    // Draw color legend
    const legendX = width - 100;
    const legendY = margin.top;
    const legendWidth = 20;
    const legendHeight = plotHeight;

    // Gradient
    for (let i = 0; i < legendHeight; i++) {
      const power = 1 - i / legendHeight;
      ctx.fillStyle = getPowerColor(power);
      ctx.fillRect(legendX, legendY + i, legendWidth, 1);
    }

    // Legend border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

    // Legend labels
    ctx.fillStyle = '#333';
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('1.0', legendX + legendWidth + 5, legendY + 10);
    ctx.fillText('0.8', legendX + legendWidth + 5, legendY + legendHeight * 0.2 + 4);
    ctx.fillText('0.5', legendX + legendWidth + 5, legendY + legendHeight * 0.5 + 4);
    ctx.fillText('0.0', legendX + legendWidth + 5, legendY + legendHeight);

    // Legend title
    ctx.save();
    ctx.translate(legendX + legendWidth + 35, legendY + legendHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Power', 0, 0);
    ctx.restore();

    // Title
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#333';
    const testName = testType === 'two-sample-t' ? 'Two-Sample t-Test' :
                     testType === 'one-sample-t' ? 'One-Sample t-Test' : `ANOVA (${groups} groups)`;
    ctx.fillText(`Power Heatmap: ${testName} (α = ${alpha})`, width / 2, 20);

  }, [powerGrid, sampleSizes, effectSizes, hoveredCell, selectedCell, findContourPoints, testType, alpha, groups]);

  // Handle canvas mouse events
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const margin = { top: 40, right: 120, bottom: 60, left: 70 };
    const plotWidth = canvas.width - margin.left - margin.right;
    const plotHeight = canvas.height - margin.top - margin.bottom;

    const cellWidth = plotWidth / sampleSizes.length;
    const cellHeight = plotHeight / effectSizes.length;

    const j = Math.floor((x - margin.left) / cellWidth);
    const i = effectSizes.length - 1 - Math.floor((y - margin.top) / cellHeight);

    if (i >= 0 && i < effectSizes.length && j >= 0 && j < sampleSizes.length) {
      setHoveredCell({ i, j });
    } else {
      setHoveredCell(null);
    }
  }, [sampleSizes, effectSizes]);

  const handleClick = useCallback((e) => {
    if (hoveredCell) {
      setSelectedCell({ ...hoveredCell });
    }
  }, [hoveredCell]);

  // Redraw on state change
  useEffect(() => {
    drawHeatmap();
  }, [drawHeatmap]);

  // Get info for hovered/selected cell
  const cellInfo = useMemo(() => {
    const cell = selectedCell || hoveredCell;
    if (!cell) return null;

    return {
      n: sampleSizes[cell.j],
      d: effectSizes[cell.i],
      power: powerGrid[cell.i][cell.j]
    };
  }, [hoveredCell, selectedCell, sampleSizes, effectSizes, powerGrid]);

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
          Power Heatmap
        </Typography>
      )}

      <Typography variant="body2" color="text.secondary" paragraph>
        This heatmap shows statistical power as a function of sample size and effect size.
        Warmer colors (green) indicate higher power. White dashed lines show 70%, 80%, and 90% power contours.
      </Typography>

      <Grid container spacing={3}>
        {/* Controls */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              Settings
            </Typography>

            {/* Test type */}
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Test Type</InputLabel>
              <Select
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                label="Test Type"
              >
                <MenuItem value="two-sample-t">Two-Sample t-Test</MenuItem>
                <MenuItem value="one-sample-t">One-Sample t-Test</MenuItem>
                <MenuItem value="anova">One-Way ANOVA</MenuItem>
              </Select>
            </FormControl>

            {/* Groups for ANOVA */}
            {testType === 'anova' && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Number of Groups: <strong>{groups}</strong>
                </Typography>
                <Slider
                  value={groups}
                  onChange={(e, v) => setGroups(v)}
                  min={2}
                  max={6}
                  step={1}
                  marks
                />
              </Box>
            )}

            {/* Alpha */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Significance Level (α): <strong>{alpha}</strong>
              </Typography>
              <Slider
                value={alpha}
                onChange={(e, v) => setAlpha(v)}
                min={0.01}
                max={0.10}
                step={0.01}
                marks={[
                  { value: 0.01, label: '.01' },
                  { value: 0.05, label: '.05' },
                  { value: 0.10, label: '.10' }
                ]}
              />
            </Box>

            {/* Cell info */}
            {cellInfo && (
              <Paper sx={{ p: 2, bgcolor: 'background.paper', border: '2px solid #d32f2f' }}>
                <Typography variant="subtitle2" gutterBottom fontWeight="bold" color="#d32f2f">
                  Selected Point
                </Typography>
                <Typography variant="body2">
                  <strong>n per group:</strong> {cellInfo.n}
                </Typography>
                <Typography variant="body2">
                  <strong>Effect size (d):</strong> {cellInfo.d.toFixed(2)}
                </Typography>
                <Typography variant="body2">
                  <strong>Power:</strong>{' '}
                  <Chip
                    label={`${(cellInfo.power * 100).toFixed(1)}%`}
                    size="small"
                    sx={{
                      bgcolor: getPowerColor(cellInfo.power),
                      color: cellInfo.power > 0.5 ? '#000' : '#fff',
                      fontWeight: 'bold'
                    }}
                  />
                </Typography>
                {testType === 'two-sample-t' && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Total N = {cellInfo.n * 2}
                  </Typography>
                )}
              </Paper>
            )}
          </Paper>
        </Grid>

        {/* Heatmap */}
        <Grid item xs={12} md={9}>
          <Box
            sx={{
              border: '1px solid #ddd',
              borderRadius: 1,
              overflow: 'hidden',
              cursor: 'crosshair'
            }}
          >
            <canvas
              ref={canvasRef}
              width={700}
              height={450}
              style={{ display: 'block', width: '100%', height: 'auto' }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredCell(null)}
              onClick={handleClick}
            />
          </Box>
        </Grid>

        {/* Interpretation guide */}
        <Grid item xs={12}>
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Reading the Heatmap:</strong> Find your expected effect size on the Y-axis,
              then move right to find the sample size that achieves your desired power (follow
              the contour lines). For example, with d = 0.5 (medium effect) and α = 0.05,
              you need approximately n = 65 per group to achieve 80% power in a two-sample t-test.
            </Typography>
          </Alert>
        </Grid>

        {/* Effect size benchmarks */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              Cohen's d Effect Size Benchmarks
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center', p: 1, bgcolor: (theme) => alphaFn(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), borderRadius: 1 }}>
                  <Typography variant="h6" color="#1976d2">d = 0.2</Typography>
                  <Typography variant="caption">Small Effect</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center', p: 1, bgcolor: (theme) => alphaFn(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), borderRadius: 1 }}>
                  <Typography variant="h6" color="#e65100">d = 0.5</Typography>
                  <Typography variant="caption">Medium Effect</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center', p: 1, bgcolor: (theme) => alphaFn(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), borderRadius: 1 }}>
                  <Typography variant="h6" color="#2e7d32">d = 0.8</Typography>
                  <Typography variant="caption">Large Effect</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default PowerHeatmap;
