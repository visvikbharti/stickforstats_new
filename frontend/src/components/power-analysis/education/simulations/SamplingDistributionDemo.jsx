/**
 * Sampling Distribution Demonstration
 *
 * Interactive simulation showing how test statistics accumulate
 * under H₀ and H₁, demonstrating the empirical basis of power.
 *
 * Features:
 * - Generate samples from populations under H₀ or H₁
 * - Build histogram of test statistics in real-time
 * - Show theoretical distribution overlay
 * - Count correct/incorrect decisions
 * - Running empirical power estimate
 * - Compare theoretical vs empirical power
 *
 * Educational Purpose:
 * This simulation answers "WHY does power work?" by showing:
 * 1. Test statistics follow predictable distributions
 * 2. Under H₁, the distribution shifts
 * 3. This shift determines how often we correctly reject H₀
 *
 * Scientific Basis:
 * - Under H₀: Z ~ N(0, 1)
 * - Under H₁: Z ~ N(δ√n, 1) where δ is effect size
 * - Power = P(Z > z_crit | H₁) = empirical rejection rate
 *
 * References:
 * - Neyman, J. & Pearson, E. (1933). On the Problem of the Most Efficient Tests.
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
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Divider,
  useTheme
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ScienceIcon from '@mui/icons-material/Science';
import InfoIcon from '@mui/icons-material/Info';

// Import distribution functions
import { normalPDF, normalCDF, normalQuantile } from '../utils/distributionFunctions';

/**
 * Box-Muller transform for generating standard normal random variates
 */
const randomNormal = () => {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

/**
 * Generate a sample mean from n observations
 */
const generateSampleMean = (n, trueMean = 0, trueSD = 1) => {
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += trueMean + trueSD * randomNormal();
  }
  return sum / n;
};

/**
 * Calculate z-statistic for one-sample test
 */
const calculateZStatistic = (sampleMean, n, nullMean = 0, sigma = 1) => {
  return (sampleMean - nullMean) / (sigma / Math.sqrt(n));
};

/**
 * Main Sampling Distribution Demo Component
 */
const SamplingDistributionDemo = ({ embedded = false }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // Canvas reference
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Simulation parameters
  const [effectSize, setEffectSize] = useState(0.5);
  const [sampleSize, setSampleSize] = useState(25);
  const [alpha, setAlpha] = useState(0.05);
  const [hypothesis, setHypothesis] = useState('H1'); // 'H0' or 'H1'

  // Animation state
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(50); // ms per sample

  // Results tracking
  const [samples, setSamples] = useState([]);
  const [histogram, setHistogram] = useState([]);
  const [stats, setStats] = useState({
    totalSamples: 0,
    rejections: 0,
    empiricalPower: 0
  });

  // Canvas dimensions
  const [dimensions] = useState({ width: 700, height: 400 });

  // Critical value
  const criticalValue = useMemo(() => {
    return normalQuantile(1 - alpha / 2);
  }, [alpha]);

  // Theoretical power
  const theoreticalPower = useMemo(() => {
    if (hypothesis === 'H0') return alpha; // Under H0, rejection rate should equal alpha
    const ncp = effectSize * Math.sqrt(sampleSize);
    const powerUpper = 1 - normalCDF(criticalValue - ncp);
    const powerLower = normalCDF(-criticalValue - ncp);
    return powerUpper + powerLower;
  }, [hypothesis, effectSize, sampleSize, alpha, criticalValue]);

  // Initialize histogram bins
  const initHistogram = useCallback(() => {
    const bins = [];
    for (let x = -5; x < 5; x += 0.25) {
      bins.push({ min: x, max: x + 0.25, count: 0 });
    }
    return bins;
  }, []);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setSamples([]);
    setHistogram(initHistogram());
    setStats({ totalSamples: 0, rejections: 0, empiricalPower: 0 });
  }, [initHistogram]);

  // Initialize on mount
  useEffect(() => {
    resetSimulation();
  }, [resetSimulation]);

  // Reset when parameters change significantly
  useEffect(() => {
    resetSimulation();
  }, [effectSize, sampleSize, alpha, hypothesis, resetSimulation]);

  // Run one sample
  const runOneSample = useCallback(() => {
    const trueMean = hypothesis === 'H1' ? effectSize : 0;
    const sampleMean = generateSampleMean(sampleSize, trueMean, 1);
    const zStat = calculateZStatistic(sampleMean, sampleSize, 0, 1);
    const rejected = Math.abs(zStat) > criticalValue;

    // Update samples (keep last 100 for visualization)
    setSamples(prev => {
      const newSamples = [...prev, { z: zStat, rejected, time: Date.now() }];
      return newSamples.slice(-100);
    });

    // Update histogram
    setHistogram(prev => {
      const newHist = [...prev];
      const binIndex = newHist.findIndex(bin => zStat >= bin.min && zStat < bin.max);
      if (binIndex >= 0) {
        newHist[binIndex] = { ...newHist[binIndex], count: newHist[binIndex].count + 1 };
      }
      return newHist;
    });

    // Update stats
    setStats(prev => {
      const newTotal = prev.totalSamples + 1;
      const newRejections = prev.rejections + (rejected ? 1 : 0);
      return {
        totalSamples: newTotal,
        rejections: newRejections,
        empiricalPower: newRejections / newTotal
      };
    });
  }, [hypothesis, effectSize, sampleSize, criticalValue]);

  // Animation loop
  useEffect(() => {
    if (isRunning) {
      const intervalId = setInterval(runOneSample, speed);
      return () => clearInterval(intervalId);
    }
  }, [isRunning, speed, runOneSample]);

  // Draw visualization
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Margins
    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    // Scales
    const xMin = -5;
    const xMax = 5;
    const xScale = (x) => margin.left + ((x - xMin) / (xMax - xMin)) * plotWidth;

    const maxCount = Math.max(...histogram.map(b => b.count), 1);
    const yScale = (count) => margin.top + plotHeight - (count / maxCount) * plotHeight * 0.9;

    // Background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    // Plot area
    ctx.fillStyle = '#fff';
    ctx.fillRect(margin.left, margin.top, plotWidth, plotHeight);

    // Grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let x = -4; x <= 4; x++) {
      ctx.beginPath();
      ctx.moveTo(xScale(x), margin.top);
      ctx.lineTo(xScale(x), margin.top + plotHeight);
      ctx.stroke();
    }

    // Rejection regions (shaded)
    ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
    // Right rejection region
    ctx.fillRect(xScale(criticalValue), margin.top, xScale(xMax) - xScale(criticalValue), plotHeight);
    // Left rejection region
    ctx.fillRect(xScale(xMin), margin.top, xScale(-criticalValue) - xScale(xMin), plotHeight);

    // Critical value lines
    ctx.strokeStyle = '#4caf50';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(xScale(criticalValue), margin.top);
    ctx.lineTo(xScale(criticalValue), margin.top + plotHeight);
    ctx.moveTo(xScale(-criticalValue), margin.top);
    ctx.lineTo(xScale(-criticalValue), margin.top + plotHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw histogram bars
    histogram.forEach(bin => {
      if (bin.count > 0) {
        const barWidth = (xScale(bin.max) - xScale(bin.min)) - 1;
        const barHeight = (bin.count / maxCount) * plotHeight * 0.9;
        const x = xScale(bin.min) + 0.5;
        const y = margin.top + plotHeight - barHeight;

        // Color based on rejection region
        const midpoint = (bin.min + bin.max) / 2;
        const inRejection = Math.abs(midpoint) > criticalValue;

        ctx.fillStyle = inRejection ? 'rgba(76, 175, 80, 0.7)' : 'rgba(255, 152, 0, 0.7)';
        ctx.fillRect(x, y, barWidth, barHeight);

        ctx.strokeStyle = inRejection ? '#388e3c' : '#f57c00';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);
      }
    });

    // Draw theoretical distribution overlay
    const ncp = hypothesis === 'H1' ? effectSize * Math.sqrt(sampleSize) : 0;
    const theoreticalMax = normalPDF(ncp);
    const scaleFactor = (plotHeight * 0.85) / theoreticalMax;

    ctx.beginPath();
    ctx.strokeStyle = hypothesis === 'H1' ? '#d32f2f' : '#1976d2';
    ctx.lineWidth = 2.5;
    for (let x = xMin; x <= xMax; x += 0.05) {
      const y = normalPDF(x - ncp);
      const scaledY = margin.top + plotHeight - y * scaleFactor;
      if (x === xMin) {
        ctx.moveTo(xScale(x), scaledY);
      } else {
        ctx.lineTo(xScale(x), scaledY);
      }
    }
    ctx.stroke();

    // Draw recent samples as dots
    const now = Date.now();
    samples.forEach(sample => {
      const age = now - sample.time;
      const opacity = Math.max(0, 1 - age / 3000);
      if (opacity > 0) {
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(xScale(sample.z), margin.top + plotHeight - 10, 5, 0, 2 * Math.PI);
        ctx.fillStyle = sample.rejected ? '#4caf50' : '#ff9800';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;

    // Axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + plotHeight);
    ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + plotHeight);
    ctx.stroke();

    // X-axis labels
    ctx.fillStyle = '#333';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    for (let x = -4; x <= 4; x++) {
      ctx.fillText(x.toString(), xScale(x), margin.top + plotHeight + 18);
    }
    ctx.fillText('Test Statistic (z)', margin.left + plotWidth / 2, height - 8);

    // Y-axis label
    ctx.save();
    ctx.translate(15, margin.top + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Frequency', 0, 0);
    ctx.restore();

    // Title/labels
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4caf50';
    ctx.fillText(`Critical z = ±${criticalValue.toFixed(3)}`, margin.left + 5, margin.top + 15);

    ctx.fillStyle = hypothesis === 'H1' ? '#d32f2f' : '#1976d2';
    ctx.textAlign = 'right';
    ctx.fillText(
      hypothesis === 'H1'
        ? `Sampling under H₁ (effect = ${effectSize})`
        : 'Sampling under H₀ (no effect)',
      width - margin.right - 5,
      margin.top + 15
    );

  }, [dimensions, histogram, samples, criticalValue, hypothesis, effectSize, sampleSize]);

  // Animation frame
  useEffect(() => {
    const animate = () => {
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  // Quick run many samples
  const runManySamples = (count) => {
    for (let i = 0; i < count; i++) {
      runOneSample();
    }
  };

  return (
    <Paper elevation={embedded ? 0 : 3} sx={{ p: 3, bgcolor: theme.palette.background.paper }}>
      {!embedded && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.error.dark, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScienceIcon /> Sampling Distribution Simulation
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Watch how test statistics accumulate under H₀ or H₁. See empirical power converge to theoretical power.
          </Typography>
        </Box>
      )}

      <Grid container spacing={3}>
        {/* Controls */}
        <Grid item xs={12} md={3}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Simulation Controls
              </Typography>

              {/* Play/Pause/Reset */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant={isRunning ? 'outlined' : 'contained'}
                  color="error"
                  startIcon={isRunning ? <PauseIcon /> : <PlayArrowIcon />}
                  onClick={() => setIsRunning(!isRunning)}
                  fullWidth
                >
                  {isRunning ? 'Pause' : 'Run'}
                </Button>
                <IconButton onClick={resetSimulation} title="Reset">
                  <RestartAltIcon />
                </IconButton>
              </Box>

              {/* Quick run buttons */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button size="small" variant="outlined" onClick={() => runManySamples(10)}>+10</Button>
                <Button size="small" variant="outlined" onClick={() => runManySamples(100)}>+100</Button>
                <Button size="small" variant="outlined" onClick={() => runManySamples(1000)}>+1000</Button>
              </Box>

              {/* Speed control */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Speed: {Math.round(1000 / speed)}/sec
                </Typography>
                <Slider
                  value={speed}
                  onChange={(e, v) => setSpeed(v)}
                  min={10}
                  max={200}
                  step={10}
                  size="small"
                  sx={{ color: theme.palette.error.dark }}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Hypothesis selection */}
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Sampling Under</InputLabel>
                <Select
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  label="Sampling Under"
                >
                  <MenuItem value="H0">H₀ (No Effect)</MenuItem>
                  <MenuItem value="H1">H₁ (Effect Exists)</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Effect Size (d): <strong>{effectSize}</strong>
                </Typography>
                <Slider
                  value={effectSize}
                  onChange={(e, v) => setEffectSize(v)}
                  min={0.1}
                  max={1.5}
                  step={0.1}
                  disabled={hypothesis === 'H0'}
                  size="small"
                  sx={{ color: theme.palette.error.dark }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Sample Size (n): <strong>{sampleSize}</strong>
                </Typography>
                <Slider
                  value={sampleSize}
                  onChange={(e, v) => setSampleSize(v)}
                  min={10}
                  max={100}
                  step={5}
                  size="small"
                  sx={{ color: theme.palette.error.dark }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Alpha (α): <strong>{alpha}</strong>
                </Typography>
                <Slider
                  value={alpha}
                  onChange={(e, v) => setAlpha(v)}
                  min={0.01}
                  max={0.10}
                  step={0.01}
                  size="small"
                  sx={{ color: theme.palette.error.dark }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Visualization and Results */}
        <Grid item xs={12} md={9}>
          {/* Results Cards */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant="caption" color="text.secondary">Samples</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{stats.totalSamples}</Typography>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined" sx={{ textAlign: 'center', p: 1, bgcolor: isDarkMode ? theme.palette.success.dark + '20' : '#e8f5e9' }}>
                <Typography variant="caption" color="text.secondary">Rejections</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.success.main }}>{stats.rejections}</Typography>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant="caption" color="text.secondary">Empirical {hypothesis === 'H1' ? 'Power' : 'α'}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.error.dark }}>
                  {(stats.empiricalPower * 100).toFixed(1)}%
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant="caption" color="text.secondary">Theoretical {hypothesis === 'H1' ? 'Power' : 'α'}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                  {(theoreticalPower * 100).toFixed(1)}%
                </Typography>
              </Card>
            </Grid>
          </Grid>

          {/* Convergence indicator */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2">
                Convergence: Empirical → Theoretical
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Difference: {Math.abs(stats.empiricalPower - theoreticalPower).toFixed(3)}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.max(0, 100 - Math.abs(stats.empiricalPower - theoreticalPower) * 500)}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: isDarkMode ? theme.palette.grey[700] : '#e0e0e0',
                '& .MuiLinearProgress-bar': {
                  bgcolor: Math.abs(stats.empiricalPower - theoreticalPower) < 0.02 ? theme.palette.success.main : theme.palette.warning.main
                }
              }}
            />
          </Box>

          {/* Canvas */}
          <Box sx={{ position: 'relative' }}>
            <canvas
              ref={canvasRef}
              width={dimensions.width}
              height={dimensions.height}
              style={{ border: `1px solid ${isDarkMode ? theme.palette.divider : '#e0e0e0'}`, borderRadius: 8, width: '100%', height: 'auto' }}
            />
          </Box>

          {/* Legend */}
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 16, height: 16, bgcolor: theme.palette.success.main + '4D', border: `1px solid ${theme.palette.success.main}` }} />
              <Typography variant="caption">Rejection Region</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 16, height: 16, bgcolor: theme.palette.success.main + 'B3' }} />
              <Typography variant="caption">Rejected (Correct if H₁)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 16, height: 16, bgcolor: theme.palette.warning.main + 'B3' }} />
              <Typography variant="caption">Not Rejected</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 24, height: 3, bgcolor: hypothesis === 'H1' ? theme.palette.error.dark : theme.palette.primary.main }} />
              <Typography variant="caption">Theoretical Distribution</Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Educational Alert */}
      <Alert severity="info" sx={{ mt: 3 }} icon={<InfoIcon />}>
        <Typography variant="body2">
          <strong>What This Shows:</strong> Each sample generates a test statistic (z-score).
          Under H₁, the distribution shifts right by δ√n, causing more samples to fall in the rejection region.
          As you run more samples, the <em>empirical</em> rejection rate converges to the <em>theoretical</em> power.
          {hypothesis === 'H0' && ' Under H₀, the rejection rate should converge to α (the Type I error rate).'}
        </Typography>
      </Alert>
    </Paper>
  );
};

export default SamplingDistributionDemo;
