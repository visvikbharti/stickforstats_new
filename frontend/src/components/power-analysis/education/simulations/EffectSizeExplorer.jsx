/**
 * Effect Size Explorer
 *
 * Interactive visualization demonstrating:
 * - Cohen's d and distribution overlap
 * - Effect size benchmarks (small, medium, large)
 * - Visual comparison of effect magnitudes
 * - Effect size conversions (d ↔ r ↔ f ↔ η²)
 *
 * Features:
 * - Two overlapping normal distributions
 * - Real-time overlap percentage calculation
 * - Benchmark reference zones
 * - Effect size converter tool
 * - Practical interpretation guide
 *
 * This visualization helps researchers develop intuition for effect sizes.
 *
 * Scientific Basis:
 * - Cohen's d = (μ₁ - μ₂) / σ_pooled
 * - Overlap coefficient: 2Φ(-|d|/2) where Φ is standard normal CDF
 * - Cohen's U3: Φ(d) = proportion of H₁ above H₀ median
 *
 * References:
 * - Cohen, J. (1988). Statistical Power Analysis for the Behavioral Sciences.
 * - McGraw, K.O. & Wong, S.P. (1992). A common language effect size statistic.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Slider,
  Button,
  Card,
  CardContent,
  Alert,
  Chip,
  Tooltip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  LinearProgress
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import InfoIcon from '@mui/icons-material/Info';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import CalculateIcon from '@mui/icons-material/Calculate';
import SchoolIcon from '@mui/icons-material/School';
import LightbulbIcon from '@mui/icons-material/Lightbulb';

// Import functions
import { alpha as alphaFn } from '@mui/material/styles';
import { normalPDF, normalCDF } from '../utils/distributionFunctions';
import { dToR, rToD, etaSquaredToF, fToEtaSquared } from '../utils/powerCalculations';

/**
 * Cohen's benchmarks configuration
 */
const BENCHMARKS = {
  d: {
    negligible: { max: 0.2, color: '#e0e0e0', label: 'Negligible' },
    small: { min: 0.2, max: 0.5, color: '#90caf9', label: 'Small' },
    medium: { min: 0.5, max: 0.8, color: '#ffb74d', label: 'Medium' },
    large: { min: 0.8, color: '#ef5350', label: 'Large' }
  }
};

/**
 * Real-world effect size examples
 */
const REAL_WORLD_EXAMPLES = [
  { d: 0.10, example: 'Height difference between 15 and 16 year old girls' },
  { d: 0.20, example: 'Effect of ibuprofen on headache pain' },
  { d: 0.30, example: 'Correlation between homework and grades (small)' },
  { d: 0.50, example: 'Difference between control and therapy group in depression' },
  { d: 0.70, example: 'Gender difference in aggression' },
  { d: 0.80, example: 'Effect of cognitive behavioral therapy on anxiety' },
  { d: 1.00, example: 'IQ difference between PhDs and college freshmen' },
  { d: 1.50, example: 'Height difference between men and women' },
  { d: 2.00, example: 'Effect of blindness on visual acuity tests (obviously!)' }
];

/**
 * Main Effect Size Explorer Component
 */
const EffectSizeExplorer = ({ embedded = false }) => {
  // Canvas reference
  const canvasRef = useRef(null);

  // Effect size state
  const [cohensD, setCohensD] = useState(0.5);

  // Visualization options
  const [showOverlapShading, setShowOverlapShading] = useState(true);
  const [showBenchmarks, setShowBenchmarks] = useState(true);
  const [animateD, setAnimateD] = useState(false);

  // Canvas dimensions
  const [dimensions, setDimensions] = useState({ width: 700, height: 350 });

  // Calculate derived metrics
  const calculations = useMemo(() => {
    const d = Math.abs(cohensD);

    // Overlap coefficient: proportion of area where distributions overlap
    // Formula: 2Φ(-|d|/2) where Φ is standard normal CDF
    const overlapCoefficient = 2 * normalCDF(-d / 2);

    // Cohen's U3: proportion of H₁ group above H₀ median
    const u3 = normalCDF(d);

    // Percent of non-overlap (Cohen's U1)
    const nonOverlap = 2 * normalCDF(d / 2) - 1;

    // Common Language Effect Size (CLES)
    // Probability that random person from group 2 > random person from group 1
    const cles = normalCDF(d / Math.sqrt(2));

    // Conversion to r
    const r = dToR(d);

    // Conversion to eta-squared (approximate)
    const etaSquared = (d * d) / (d * d + 4);

    // Conversion to Cohen's f
    const f = Math.sqrt(etaSquared / (1 - etaSquared));

    // Interpretation
    let interpretation;
    if (d < 0.2) interpretation = 'Negligible';
    else if (d < 0.5) interpretation = 'Small';
    else if (d < 0.8) interpretation = 'Medium';
    else interpretation = 'Large';

    return {
      d,
      overlapCoefficient,
      overlapPercent: overlapCoefficient * 100,
      nonOverlapPercent: nonOverlap * 100,
      u3,
      u3Percent: u3 * 100,
      cles,
      clesPercent: cles * 100,
      r,
      etaSquared,
      f,
      interpretation
    };
  }, [cohensD]);

  // Draw visualization
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Margins
    const margin = { top: 30, right: 30, bottom: 50, left: 50 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    // X scale: -4 to 4 + d
    const xMin = -4;
    const xMax = 4 + calculations.d;
    const xScale = (x) => margin.left + ((x - xMin) / (xMax - xMin)) * plotWidth;

    // Y scale
    const yMax = 0.45;
    const yScale = (y) => margin.top + plotHeight - (y / yMax) * plotHeight;

    // Background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    // Plot area
    ctx.fillStyle = '#fff';
    ctx.fillRect(margin.left, margin.top, plotWidth, plotHeight);

    // Benchmark zones (if enabled)
    if (showBenchmarks) {
      // Small zone
      ctx.fillStyle = 'rgba(144, 202, 249, 0.15)';
      const smallStart = xScale(0.2);
      const smallEnd = xScale(0.5);
      ctx.fillRect(smallStart, margin.top, smallEnd - smallStart, plotHeight);

      // Medium zone
      ctx.fillStyle = 'rgba(255, 183, 77, 0.15)';
      const medStart = xScale(0.5);
      const medEnd = xScale(0.8);
      ctx.fillRect(medStart, margin.top, medEnd - medStart, plotHeight);

      // Large zone
      ctx.fillStyle = 'rgba(239, 83, 80, 0.15)';
      const largeStart = xScale(0.8);
      ctx.fillRect(largeStart, margin.top, plotWidth - (largeStart - margin.left), plotHeight);

      // Labels
      ctx.font = '10px system-ui';
      ctx.fillStyle = '#666';
      ctx.textAlign = 'center';
      ctx.fillText('Small', (smallStart + smallEnd) / 2, margin.top + 15);
      ctx.fillText('Medium', (medStart + medEnd) / 2, margin.top + 15);
      ctx.fillText('Large', (largeStart + xScale(1.2)) / 2, margin.top + 15);
    }

    // Grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
      ctx.beginPath();
      ctx.moveTo(xScale(x), margin.top);
      ctx.lineTo(xScale(x), margin.top + plotHeight);
      ctx.stroke();
    }

    // Draw overlap region (shaded)
    if (showOverlapShading) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#9c27b0'; // Purple for overlap

      // Find overlap region boundaries
      ctx.beginPath();
      ctx.moveTo(xScale(xMin), yScale(0));

      for (let x = xMin; x <= xMax; x += 0.02) {
        const y1 = normalPDF(x);
        const y2 = normalPDF(x - calculations.d);
        const yMin = Math.min(y1, y2);
        ctx.lineTo(xScale(x), yScale(yMin));
      }

      ctx.lineTo(xScale(xMax), yScale(0));
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Draw Group 1 (Control) distribution - centered at 0
    ctx.beginPath();
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 3;
    for (let x = xMin; x <= xMax; x += 0.02) {
      const y = normalPDF(x);
      if (x === xMin) {
        ctx.moveTo(xScale(x), yScale(y));
      } else {
        ctx.lineTo(xScale(x), yScale(y));
      }
    }
    ctx.stroke();

    // Fill under curve 1
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#1976d2';
    ctx.beginPath();
    ctx.moveTo(xScale(xMin), yScale(0));
    for (let x = xMin; x <= xMax; x += 0.02) {
      ctx.lineTo(xScale(x), yScale(normalPDF(x)));
    }
    ctx.lineTo(xScale(xMax), yScale(0));
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Draw Group 2 (Treatment) distribution - centered at d
    ctx.beginPath();
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 3;
    for (let x = xMin; x <= xMax; x += 0.02) {
      const y = normalPDF(x - calculations.d);
      if (x === xMin) {
        ctx.moveTo(xScale(x), yScale(y));
      } else {
        ctx.lineTo(xScale(x), yScale(y));
      }
    }
    ctx.stroke();

    // Fill under curve 2
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#d32f2f';
    ctx.beginPath();
    ctx.moveTo(xScale(xMin), yScale(0));
    for (let x = xMin; x <= xMax; x += 0.02) {
      ctx.lineTo(xScale(x), yScale(normalPDF(x - calculations.d)));
    }
    ctx.lineTo(xScale(xMax), yScale(0));
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Draw effect size arrow
    const arrowY = yScale(0.35);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xScale(0), arrowY);
    ctx.lineTo(xScale(calculations.d), arrowY);
    ctx.stroke();

    // Arrow heads
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(xScale(calculations.d) - 8, arrowY - 5);
    ctx.lineTo(xScale(calculations.d), arrowY);
    ctx.lineTo(xScale(calculations.d) - 8, arrowY + 5);
    ctx.fill();

    // Effect size label
    ctx.font = 'bold 14px system-ui';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText(`d = ${calculations.d.toFixed(2)}`, xScale(calculations.d / 2), arrowY - 10);

    // Distribution labels
    ctx.font = 'bold 14px system-ui';
    ctx.fillStyle = '#1976d2';
    ctx.fillText('Control', xScale(0), yScale(normalPDF(0)) - 15);
    ctx.fillStyle = '#d32f2f';
    ctx.fillText('Treatment', xScale(calculations.d), yScale(normalPDF(0)) - 15);

    // Axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    // X-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + plotHeight);
    ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
    ctx.stroke();

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + plotHeight);
    ctx.stroke();

    // X-axis labels
    ctx.font = '11px system-ui';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
      ctx.fillText(x.toString(), xScale(x), margin.top + plotHeight + 18);
    }
    ctx.fillText('Standardized Score (z)', margin.left + plotWidth / 2, height - 8);

    // Overlap percentage display
    ctx.font = 'bold 16px system-ui';
    ctx.fillStyle = '#9c27b0';
    ctx.textAlign = 'right';
    ctx.fillText(`Overlap: ${calculations.overlapPercent.toFixed(1)}%`, width - margin.right - 10, margin.top + 30);

  }, [dimensions, calculations, showOverlapShading, showBenchmarks]);

  // Animation effect
  useEffect(() => {
    let frameId;
    const animate = () => {
      draw();
      frameId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(frameId);
  }, [draw]);

  // Find closest example
  const closestExample = useMemo(() => {
    return REAL_WORLD_EXAMPLES.reduce((prev, curr) =>
      Math.abs(curr.d - calculations.d) < Math.abs(prev.d - calculations.d) ? curr : prev
    );
  }, [calculations.d]);

  return (
    <Paper elevation={embedded ? 0 : 3} sx={{ p: 3, bgcolor: 'background.paper' }}>
      {!embedded && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#d32f2f', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CompareArrowsIcon /> Effect Size Explorer
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Visualize how effect size (Cohen's d) represents the separation between two distributions.
            Develop intuition for what "small," "medium," and "large" effects look like.
          </Typography>
        </Box>
      )}

      <Grid container spacing={3}>
        {/* Controls */}
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Cohen's d: <strong style={{ fontSize: '1.2rem' }}>{cohensD.toFixed(2)}</strong>
              </Typography>

              <Slider
                value={cohensD}
                onChange={(e, v) => setCohensD(v)}
                min={0}
                max={2}
                step={0.05}
                marks={[
                  { value: 0.2, label: 'S' },
                  { value: 0.5, label: 'M' },
                  { value: 0.8, label: 'L' }
                ]}
                sx={{ color: '#d32f2f' }}
              />

              {/* Quick select buttons */}
              <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                {[0.2, 0.5, 0.8, 1.0, 1.5].map(d => (
                  <Chip
                    key={d}
                    label={d === 0.2 ? 'Small' : d === 0.5 ? 'Medium' : d === 0.8 ? 'Large' : `d=${d}`}
                    onClick={() => setCohensD(d)}
                    color={cohensD === d ? 'error' : 'default'}
                    variant={cohensD === d ? 'filled' : 'outlined'}
                    size="small"
                  />
                ))}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Interpretation */}
              <Box sx={{
                p: 2,
                bgcolor: (theme) => {
                  const isDark = theme.palette.mode === 'dark';
                  const a = isDark ? 0.12 : 0.08;
                  if (calculations.interpretation === 'Negligible') return theme.palette.background.default;
                  if (calculations.interpretation === 'Small') return alphaFn(theme.palette.primary.main, a);
                  if (calculations.interpretation === 'Medium') return alphaFn(theme.palette.warning.main, a);
                  return alphaFn(theme.palette.error.main, a);
                },
                borderRadius: 2,
                textAlign: 'center'
              }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {calculations.interpretation}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Effect Size
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Metrics Card */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalculateIcon fontSize="small" /> Derived Metrics
              </Typography>

              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 500 }}>Overlap</TableCell>
                    <TableCell align="right">{calculations.overlapPercent.toFixed(1)}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 500 }}>Non-Overlap</TableCell>
                    <TableCell align="right">{calculations.nonOverlapPercent.toFixed(1)}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 500 }}>U3 (% above median)</TableCell>
                    <TableCell align="right">{calculations.u3Percent.toFixed(1)}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 500 }}>CLES (Prob. superiority)</TableCell>
                    <TableCell align="right">{calculations.clesPercent.toFixed(1)}%</TableCell>
                  </TableRow>
                  <Divider />
                  <TableRow>
                    <TableCell sx={{ fontWeight: 500 }}>Correlation (r)</TableCell>
                    <TableCell align="right">{calculations.r.toFixed(3)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 500 }}>Eta-squared (η²)</TableCell>
                    <TableCell align="right">{calculations.etaSquared.toFixed(3)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 500 }}>Cohen's f</TableCell>
                    <TableCell align="right">{calculations.f.toFixed(3)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        {/* Visualization */}
        <Grid item xs={12} md={8}>
          <Box sx={{ position: 'relative' }}>
            <canvas
              ref={canvasRef}
              width={dimensions.width}
              height={dimensions.height}
              style={{ border: '1px solid #e0e0e0', borderRadius: 8, width: '100%', height: 'auto' }}
            />
          </Box>

          {/* Progress Bar Visualization */}
          <Card variant="outlined" sx={{ mt: 2, p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Distribution Overlap Visualization
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ width: 80 }}>Overlap:</Typography>
              <Box sx={{ flexGrow: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={calculations.overlapPercent}
                  sx={{
                    height: 20,
                    borderRadius: 2,
                    bgcolor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#9c27b0',
                      borderRadius: 2
                    }
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ width: 60, fontWeight: 600 }}>
                {calculations.overlapPercent.toFixed(1)}%
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              With d = {calculations.d.toFixed(2)}, approximately {calculations.overlapPercent.toFixed(0)}% of the two distributions overlap.
              {calculations.u3Percent.toFixed(0)}% of the treatment group exceeds the control group median.
            </Typography>
          </Card>

          {/* Real-world example */}
          <Alert
            severity="info"
            icon={<LightbulbIcon />}
            sx={{ mt: 2 }}
          >
            <Typography variant="body2">
              <strong>Similar real-world effect:</strong> {closestExample.example}
              {closestExample.d !== calculations.d && ` (d ≈ ${closestExample.d})`}
            </Typography>
          </Alert>
        </Grid>
      </Grid>

      {/* Effect Size Reference Table */}
      <Card variant="outlined" sx={{ mt: 3, bgcolor: 'background.default' }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <SchoolIcon /> Effect Size Interpretation Guide
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Magnitude</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Cohen's d</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Correlation (r)</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Overlap %</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Example</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow sx={{ bgcolor: 'rgba(144, 202, 249, 0.2)' }}>
                  <TableCell><Chip label="Small" size="small" sx={{ bgcolor: '#90caf9' }} /></TableCell>
                  <TableCell>0.2</TableCell>
                  <TableCell>0.10</TableCell>
                  <TableCell>85%</TableCell>
                  <TableCell>Effect of aspirin on headaches</TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: 'rgba(255, 183, 77, 0.2)' }}>
                  <TableCell><Chip label="Medium" size="small" sx={{ bgcolor: '#ffb74d' }} /></TableCell>
                  <TableCell>0.5</TableCell>
                  <TableCell>0.24</TableCell>
                  <TableCell>67%</TableCell>
                  <TableCell>Therapy vs control for depression</TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: 'rgba(239, 83, 80, 0.2)' }}>
                  <TableCell><Chip label="Large" size="small" sx={{ bgcolor: '#ef5350', color: '#fff' }} /></TableCell>
                  <TableCell>0.8</TableCell>
                  <TableCell>0.37</TableCell>
                  <TableCell>53%</TableCell>
                  <TableCell>CBT for anxiety disorders</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Chip label="Very Large" size="small" variant="outlined" /></TableCell>
                  <TableCell>1.2+</TableCell>
                  <TableCell>0.51+</TableCell>
                  <TableCell>&lt;40%</TableCell>
                  <TableCell>Obvious, visible differences</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            <strong>Note:</strong> Cohen's benchmarks are general guidelines. The practical significance of an effect depends
            on the research context. A "small" effect in medicine (e.g., reducing mortality by 5%) can be highly meaningful,
            while a "large" effect in social psychology may have limited practical application.
          </Typography>
        </CardContent>
      </Card>

      {/* Formulas */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Conversion Formulas</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" sx={{ fontFamily: 'serif' }}>
              <strong>d to r:</strong> r = d / √(d² + 4)
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" sx={{ fontFamily: 'serif' }}>
              <strong>r to d:</strong> d = 2r / √(1 - r²)
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" sx={{ fontFamily: 'serif' }}>
              <strong>d to η²:</strong> η² = d² / (d² + 4)
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default EffectSizeExplorer;
