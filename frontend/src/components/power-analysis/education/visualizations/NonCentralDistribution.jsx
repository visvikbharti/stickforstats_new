/**
 * NonCentralDistribution.jsx
 *
 * Interactive visualization comparing central and non-central t/F distributions.
 * Shows how the noncentrality parameter (NCP) shifts the distribution and
 * affects statistical power.
 *
 * Features:
 * - Central distribution under H₀ (blue)
 * - Non-central distribution under H₁ (red)
 * - Adjustable noncentrality parameter
 * - Critical value and rejection region
 * - Power calculation and visualization
 * - Mathematical formulas with MathJax
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
  Alert,
  Switch,
  FormControlLabel
} from '@mui/material';
import { alpha as alphaFn } from '@mui/material/styles';
import { normalPDF, normalCDF, tPDF, normalQuantile } from '../utils/distributionFunctions';

// Approximation for non-central t PDF
const nonCentralTPDF = (t, df, ncp) => {
  // Use series expansion approximation for non-central t
  // For large df, approaches normal with mean = ncp
  if (df > 100) {
    // Normal approximation
    return normalPDF(t - ncp);
  }

  // More accurate approximation using numerical integration concept
  // The non-central t distribution is a weighted sum of central t distributions
  let sum = 0;
  const maxTerms = 50;

  for (let j = 0; j < maxTerms; j++) {
    const weight = Math.exp(
      -ncp * ncp / 2 + j * Math.log(Math.abs(ncp) / Math.sqrt(2)) - factorialLog(j)
    );

    // Central t density at shifted point
    const tVal = t * Math.sqrt((df + 2 * j) / df);
    const centralT = tPDF(tVal, df + 2 * j) * Math.sqrt((df + 2 * j) / df);

    sum += weight * centralT;
  }

  return sum;
};

// Log factorial for numerical stability
const factorialLog = (n) => {
  if (n <= 1) return 0;
  let result = 0;
  for (let i = 2; i <= n; i++) {
    result += Math.log(i);
  }
  return result;
};

// Approximate non-central t CDF using normal approximation
const nonCentralTCDF = (t, df, ncp) => {
  // For large df, use normal approximation
  if (df > 30) {
    return normalCDF(t - ncp);
  }

  // For smaller df, use more careful approximation
  // This is the Patnaik approximation
  const mean = ncp * Math.sqrt(df / 2) * Math.exp(
    factorialLog(Math.floor((df - 1) / 2)) - factorialLog(Math.floor(df / 2))
  ) / Math.sqrt(Math.PI);

  const variance = (df * (1 + ncp * ncp)) / (df - 2) - mean * mean;
  const sd = Math.sqrt(Math.max(0.01, variance));

  return normalCDF((t - mean) / sd);
};

/**
 * Main Non-Central Distribution Visualization Component
 */
const NonCentralDistribution = ({ embedded = false }) => {
  const canvasRef = useRef(null);

  // State
  const [distributionType, setDistributionType] = useState('t'); // 't' or 'normal'
  const [df, setDf] = useState(20);
  const [ncp, setNcp] = useState(2.0); // Noncentrality parameter
  const [alpha, setAlpha] = useState(0.05);
  const [showBothTails, setShowBothTails] = useState(true);
  const [showFormulas, setShowFormulas] = useState(true);

  // Derived calculations
  const calculations = useMemo(() => {
    // Critical value for rejection
    const criticalValue = distributionType === 't'
      ? normalQuantile(1 - alpha / (showBothTails ? 2 : 1)) * Math.sqrt((df + 2) / df)
      : normalQuantile(1 - alpha / (showBothTails ? 2 : 1));

    // Power calculation
    let power;
    if (distributionType === 't') {
      if (showBothTails) {
        power = 1 - nonCentralTCDF(criticalValue, df, ncp) + nonCentralTCDF(-criticalValue, df, ncp);
      } else {
        power = 1 - nonCentralTCDF(criticalValue, df, ncp);
      }
    } else {
      if (showBothTails) {
        power = 1 - normalCDF(criticalValue - ncp) + normalCDF(-criticalValue - ncp);
      } else {
        power = 1 - normalCDF(criticalValue - ncp);
      }
    }

    // Effect size (Cohen's d) from NCP for t-test
    // NCP = d * sqrt(n/2), so d = NCP * sqrt(2/n)
    // Assuming n = df + 1 for one-sample, or (df/2 + 1) for two-sample
    const n = Math.round((df + 2) / 2); // Approximate n per group
    const estimatedD = ncp / Math.sqrt(n);

    return { criticalValue, power, estimatedD, n };
  }, [distributionType, df, ncp, alpha, showBothTails]);

  // Canvas drawing
  const drawVisualization = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Margins and scales
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    // X range (standardized)
    const xMin = -4;
    const xMax = Math.max(6, ncp + 3);
    const xScale = (x) => margin.left + ((x - xMin) / (xMax - xMin)) * plotWidth;

    // Find max Y for scaling
    let maxY = 0.5;
    for (let x = xMin; x <= xMax; x += 0.1) {
      const y1 = distributionType === 't' ? tPDF(x, df) : normalPDF(x);
      const y2 = distributionType === 't' ? nonCentralTPDF(x, df, ncp) : normalPDF(x - ncp);
      maxY = Math.max(maxY, y1, y2);
    }
    maxY *= 1.1;

    const yScale = (y) => margin.top + plotHeight - (y / maxY) * plotHeight;

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + plotHeight);
    ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
    ctx.stroke();

    // X-axis labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
      ctx.fillText(x.toString(), xScale(x), margin.top + plotHeight + 20);
    }
    ctx.fillText('Test Statistic', width / 2, height - 10);

    // Y-axis label
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Probability Density', 0, 0);
    ctx.restore();

    // Draw critical value(s)
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    // Right critical value
    ctx.beginPath();
    ctx.moveTo(xScale(calculations.criticalValue), margin.top);
    ctx.lineTo(xScale(calculations.criticalValue), margin.top + plotHeight);
    ctx.stroke();

    // Left critical value (for two-tailed)
    if (showBothTails) {
      ctx.beginPath();
      ctx.moveTo(xScale(-calculations.criticalValue), margin.top);
      ctx.lineTo(xScale(-calculations.criticalValue), margin.top + plotHeight);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // Draw rejection regions (alpha)
    ctx.fillStyle = 'rgba(244, 67, 54, 0.3)';
    ctx.beginPath();
    ctx.moveTo(xScale(calculations.criticalValue), yScale(0));
    for (let x = calculations.criticalValue; x <= xMax; x += 0.05) {
      const y = distributionType === 't' ? tPDF(x, df) : normalPDF(x);
      ctx.lineTo(xScale(x), yScale(y));
    }
    ctx.lineTo(xScale(xMax), yScale(0));
    ctx.closePath();
    ctx.fill();

    if (showBothTails) {
      ctx.beginPath();
      ctx.moveTo(xScale(-calculations.criticalValue), yScale(0));
      for (let x = -calculations.criticalValue; x >= xMin; x -= 0.05) {
        const y = distributionType === 't' ? tPDF(x, df) : normalPDF(x);
        ctx.lineTo(xScale(x), yScale(y));
      }
      ctx.lineTo(xScale(xMin), yScale(0));
      ctx.closePath();
      ctx.fill();
    }

    // Draw power region (under H1, beyond critical value)
    ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
    ctx.beginPath();
    ctx.moveTo(xScale(calculations.criticalValue), yScale(0));
    for (let x = calculations.criticalValue; x <= xMax; x += 0.05) {
      const y = distributionType === 't' ? nonCentralTPDF(x, df, ncp) : normalPDF(x - ncp);
      ctx.lineTo(xScale(x), yScale(y));
    }
    ctx.lineTo(xScale(xMax), yScale(0));
    ctx.closePath();
    ctx.fill();

    // Draw Central Distribution (H₀) - Blue
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    let first = true;
    for (let x = xMin; x <= xMax; x += 0.05) {
      const y = distributionType === 't' ? tPDF(x, df) : normalPDF(x);
      if (first) {
        ctx.moveTo(xScale(x), yScale(y));
        first = false;
      } else {
        ctx.lineTo(xScale(x), yScale(y));
      }
    }
    ctx.stroke();

    // Draw Non-Central Distribution (H₁) - Red
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    first = true;
    for (let x = xMin; x <= xMax; x += 0.05) {
      const y = distributionType === 't' ? nonCentralTPDF(x, df, ncp) : normalPDF(x - ncp);
      if (first) {
        ctx.moveTo(xScale(x), yScale(y));
        first = false;
      } else {
        ctx.lineTo(xScale(x), yScale(y));
      }
    }
    ctx.stroke();

    // Draw NCP indicator
    ctx.fillStyle = '#d32f2f';
    ctx.beginPath();
    ctx.arc(xScale(ncp), yScale(0) - 5, 6, 0, 2 * Math.PI);
    ctx.fill();

    // Legend
    ctx.font = 'bold 14px Arial';

    // H₀ legend
    ctx.fillStyle = '#1976d2';
    ctx.fillRect(width - 180, 20, 20, 3);
    ctx.fillText('H₀: Central (λ = 0)', width - 150, 25);

    // H₁ legend
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(width - 180, 45, 20, 3);
    ctx.fillText(`H₁: Non-central (λ = ${ncp.toFixed(2)})`, width - 150, 50);

    // Critical value label
    ctx.fillStyle = '#666';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`t_crit = ${calculations.criticalValue.toFixed(2)}`, xScale(calculations.criticalValue), margin.top - 5);

    // Alpha and Power labels
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = '#f44336';
    ctx.fillText(`α = ${alpha}`, xScale(calculations.criticalValue + 0.5), yScale(0.1));

    ctx.fillStyle = '#4caf50';
    ctx.fillText(`Power = ${(calculations.power * 100).toFixed(1)}%`, xScale(ncp + 0.5), yScale(0.15));

  }, [distributionType, df, ncp, alpha, showBothTails, calculations]);

  // Effect on canvas
  useEffect(() => {
    drawVisualization();
  }, [drawVisualization]);

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
          Non-Central Distributions and Statistical Power
        </Typography>
      )}

      <Typography variant="body2" color="text.secondary" paragraph>
        The key to understanding power is the <strong>noncentrality parameter (λ)</strong>.
        Under H₀, the test statistic follows a central distribution (λ = 0).
        Under H₁, it follows a non-central distribution shifted by λ.
      </Typography>

      <Grid container spacing={3}>
        {/* Controls */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              Parameters
            </Typography>

            {/* Distribution type */}
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Distribution</InputLabel>
              <Select
                value={distributionType}
                onChange={(e) => setDistributionType(e.target.value)}
                label="Distribution"
              >
                <MenuItem value="t">t-distribution</MenuItem>
                <MenuItem value="normal">Normal (z)</MenuItem>
              </Select>
            </FormControl>

            {/* Degrees of freedom */}
            {distributionType === 't' && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Degrees of Freedom: <strong>{df}</strong>
                </Typography>
                <Slider
                  value={df}
                  onChange={(e, v) => setDf(v)}
                  min={5}
                  max={100}
                  step={1}
                  marks={[
                    { value: 10, label: '10' },
                    { value: 30, label: '30' },
                    { value: 60, label: '60' }
                  ]}
                />
              </Box>
            )}

            {/* Noncentrality parameter */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Noncentrality Parameter (λ): <strong>{ncp.toFixed(2)}</strong>
              </Typography>
              <Slider
                value={ncp}
                onChange={(e, v) => setNcp(v)}
                min={0}
                max={5}
                step={0.1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 2, label: '2' },
                  { value: 4, label: '4' }
                ]}
                sx={{ color: '#d32f2f' }}
              />
              <Typography variant="caption" color="text.secondary">
                λ = d × √(n/2) for two-sample t-test
              </Typography>
            </Box>

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

            {/* Two-tailed switch */}
            <FormControlLabel
              control={
                <Switch
                  checked={showBothTails}
                  onChange={(e) => setShowBothTails(e.target.checked)}
                />
              }
              label="Two-tailed test"
            />
          </Paper>
        </Grid>

        {/* Visualization */}
        <Grid item xs={12} md={8}>
          <Box sx={{ border: '1px solid #ddd', borderRadius: 1, overflow: 'hidden' }}>
            <canvas
              ref={canvasRef}
              width={700}
              height={400}
              style={{ display: 'block', width: '100%', height: 'auto' }}
            />
          </Box>
        </Grid>

        {/* Results */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
            <Grid container spacing={3}>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="#d32f2f" fontWeight="bold">
                    λ = {ncp.toFixed(2)}
                  </Typography>
                  <Typography variant="caption">Noncentrality Parameter</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="#4caf50" fontWeight="bold">
                    {(calculations.power * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="caption">Statistical Power</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="#1976d2" fontWeight="bold">
                    {calculations.criticalValue.toFixed(3)}
                  </Typography>
                  <Typography variant="caption">Critical Value</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="#ff9800" fontWeight="bold">
                    d ≈ {calculations.estimatedD.toFixed(2)}
                  </Typography>
                  <Typography variant="caption">Estimated Effect Size</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Formula display */}
        {showFormulas && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                Key Formulas
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                    <strong>Noncentrality Parameter (t-test):</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', pl: 2 }}>
                    λ = d × √(n/2) for two-sample<br />
                    λ = d × √n for one-sample/paired
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                    <strong>Power Calculation:</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', pl: 2 }}>
                    Power = P(|T| {'>'} t_crit | λ)<br />
                    Power = 1 - F_nc(t_crit; df, λ)
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Educational note */}
        <Grid item xs={12}>
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Key Insight:</strong> As λ increases (larger effect or larger n),
              the non-central distribution shifts further right, increasing the area
              beyond the critical value (power). This is why larger effects and larger
              samples yield more power.
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default NonCentralDistribution;
