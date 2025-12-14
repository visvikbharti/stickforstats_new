/**
 * PriorPosteriorPlot.jsx
 *
 * Interactive Bayesian prior and posterior distribution visualization.
 * Shows how data updates our beliefs through Bayes' theorem.
 *
 * Features:
 * - Prior distribution specification (normal, Cauchy, uniform)
 * - Likelihood from data
 * - Posterior distribution calculation
 * - Animation of belief updating with accumulating data
 * - Credible interval display
 * - Prior sensitivity analysis
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
  Button,
  Alert,
  Chip,
  LinearProgress
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RefreshIcon from '@mui/icons-material/Refresh';
import { normalPDF, normalCDF, normalQuantile } from '../utils/distributionFunctions';

// Cauchy PDF
const cauchyPDF = (x, location = 0, scale = 1) => {
  return 1 / (Math.PI * scale * (1 + Math.pow((x - location) / scale, 2)));
};

// Uniform PDF
const uniformPDF = (x, min, max) => {
  if (x >= min && x <= max) {
    return 1 / (max - min);
  }
  return 0;
};

// Calculate prior density
const getPriorDensity = (x, priorType, priorParams) => {
  switch (priorType) {
    case 'normal':
      return normalPDF((x - priorParams.mean) / priorParams.sd) / priorParams.sd;
    case 'cauchy':
      return cauchyPDF(x, priorParams.location, priorParams.scale);
    case 'uniform':
      return uniformPDF(x, priorParams.min, priorParams.max);
    default:
      return normalPDF(x);
  }
};

// Calculate likelihood (assuming normal data)
const getLikelihood = (x, dataStats) => {
  if (!dataStats || dataStats.n === 0) return 1;

  const { mean, se } = dataStats;
  return normalPDF((x - mean) / se) / se;
};

/**
 * Main Prior-Posterior Plot Component
 */
const PriorPosteriorPlot = ({ embedded = false }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Prior settings
  const [priorType, setPriorType] = useState('normal');
  const [priorParams, setPriorParams] = useState({
    mean: 0,
    sd: 1,
    location: 0,
    scale: 0.707, // JZS default
    min: -2,
    max: 2
  });

  // Data settings
  const [trueEffect, setTrueEffect] = useState(0.5);
  const [sampleSize, setSampleSize] = useState(0);
  const [maxSampleSize, setMaxSampleSize] = useState(50);

  // Animation
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(500);

  // Simulated data
  const [dataPoints, setDataPoints] = useState([]);

  // Calculate data statistics
  const dataStats = useMemo(() => {
    if (dataPoints.length === 0) {
      return { mean: 0, sd: 1, se: 1, n: 0 };
    }

    const n = dataPoints.length;
    const mean = dataPoints.reduce((a, b) => a + b, 0) / n;
    const variance = dataPoints.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1 || 1);
    const sd = Math.sqrt(variance);
    const se = sd / Math.sqrt(n);

    return { mean, sd, se, n };
  }, [dataPoints]);

  // Calculate posterior (using normal-normal conjugate for simplicity)
  const posteriorParams = useMemo(() => {
    if (dataStats.n === 0) {
      return {
        mean: priorParams.mean,
        sd: priorParams.sd
      };
    }

    // For normal prior with normal likelihood
    const priorPrecision = 1 / (priorParams.sd * priorParams.sd);
    const likelihoodPrecision = dataStats.n / (dataStats.sd * dataStats.sd || 1);

    const posteriorPrecision = priorPrecision + likelihoodPrecision;
    const posteriorMean = (priorPrecision * priorParams.mean + likelihoodPrecision * dataStats.mean) / posteriorPrecision;
    const posteriorSd = 1 / Math.sqrt(posteriorPrecision);

    return {
      mean: posteriorMean,
      sd: posteriorSd
    };
  }, [priorParams, dataStats]);

  // Credible interval
  const credibleInterval = useMemo(() => {
    const lower = posteriorParams.mean + normalQuantile(0.025) * posteriorParams.sd;
    const upper = posteriorParams.mean + normalQuantile(0.975) * posteriorParams.sd;
    return { lower, upper };
  }, [posteriorParams]);

  // Animation effect
  useEffect(() => {
    if (isAnimating && sampleSize < maxSampleSize) {
      animationRef.current = setTimeout(() => {
        // Generate new data point from true effect
        const newPoint = trueEffect + Math.sqrt(-2 * Math.log(Math.random())) *
          Math.cos(2 * Math.PI * Math.random());

        setDataPoints(prev => [...prev, newPoint]);
        setSampleSize(prev => prev + 1);
      }, animationSpeed);
    } else if (sampleSize >= maxSampleSize) {
      setIsAnimating(false);
    }

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isAnimating, sampleSize, maxSampleSize, trueEffect, animationSpeed]);

  // Draw visualization
  const drawPlot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Margins
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    // X range
    const xMin = -4;
    const xMax = 4;
    const xScale = (x) => margin.left + ((x - xMin) / (xMax - xMin)) * plotWidth;

    // Find max Y
    let maxY = 0.5;
    for (let x = xMin; x <= xMax; x += 0.1) {
      const prior = getPriorDensity(x, priorType, priorParams);
      const posterior = normalPDF((x - posteriorParams.mean) / posteriorParams.sd) / posteriorParams.sd;
      maxY = Math.max(maxY, prior, posterior);
    }
    if (dataStats.n > 0) {
      for (let x = xMin; x <= xMax; x += 0.1) {
        const likelihood = getLikelihood(x, dataStats);
        maxY = Math.max(maxY, likelihood * 0.5); // Scale likelihood down for display
      }
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
    for (let x = -3; x <= 3; x++) {
      ctx.fillText(x.toString(), xScale(x), margin.top + plotHeight + 20);
    }
    ctx.fillText('Effect Size (θ)', width / 2, height - 10);

    // Y-axis label
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Density', 0, 0);
    ctx.restore();

    // Draw true effect line
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(xScale(trueEffect), margin.top);
    ctx.lineTo(xScale(trueEffect), margin.top + plotHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw credible interval shading
    if (dataStats.n > 0) {
      ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
      ctx.beginPath();
      ctx.moveTo(xScale(credibleInterval.lower), yScale(0));
      for (let x = credibleInterval.lower; x <= credibleInterval.upper; x += 0.02) {
        const y = normalPDF((x - posteriorParams.mean) / posteriorParams.sd) / posteriorParams.sd;
        ctx.lineTo(xScale(x), yScale(y));
      }
      ctx.lineTo(xScale(credibleInterval.upper), yScale(0));
      ctx.closePath();
      ctx.fill();
    }

    // Draw Prior (blue, dashed)
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    let first = true;
    for (let x = xMin; x <= xMax; x += 0.02) {
      const y = getPriorDensity(x, priorType, priorParams);
      if (first) {
        ctx.moveTo(xScale(x), yScale(y));
        first = false;
      } else {
        ctx.lineTo(xScale(x), yScale(y));
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Likelihood (orange, if data exists)
    if (dataStats.n > 0) {
      ctx.strokeStyle = '#ff9800';
      ctx.lineWidth = 2;
      ctx.beginPath();
      first = true;
      for (let x = xMin; x <= xMax; x += 0.02) {
        const y = getLikelihood(x, dataStats) * 0.5; // Scaled for display
        if (first) {
          ctx.moveTo(xScale(x), yScale(y));
          first = false;
        } else {
          ctx.lineTo(xScale(x), yScale(y));
        }
      }
      ctx.stroke();
    }

    // Draw Posterior (green, solid)
    if (dataStats.n > 0) {
      ctx.strokeStyle = '#4caf50';
      ctx.lineWidth = 3;
      ctx.beginPath();
      first = true;
      for (let x = xMin; x <= xMax; x += 0.02) {
        const y = normalPDF((x - posteriorParams.mean) / posteriorParams.sd) / posteriorParams.sd;
        if (first) {
          ctx.moveTo(xScale(x), yScale(y));
          first = false;
        } else {
          ctx.lineTo(xScale(x), yScale(y));
        }
      }
      ctx.stroke();
    }

    // Legend
    ctx.font = 'bold 12px Arial';
    let legendY = 25;

    // Prior
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(width - 150, legendY);
    ctx.lineTo(width - 120, legendY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#1976d2';
    ctx.textAlign = 'left';
    ctx.fillText('Prior', width - 115, legendY + 4);

    // Likelihood
    if (dataStats.n > 0) {
      legendY += 20;
      ctx.strokeStyle = '#ff9800';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width - 150, legendY);
      ctx.lineTo(width - 120, legendY);
      ctx.stroke();
      ctx.fillStyle = '#ff9800';
      ctx.fillText('Likelihood', width - 115, legendY + 4);
    }

    // Posterior
    if (dataStats.n > 0) {
      legendY += 20;
      ctx.strokeStyle = '#4caf50';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width - 150, legendY);
      ctx.lineTo(width - 120, legendY);
      ctx.stroke();
      ctx.fillStyle = '#4caf50';
      ctx.fillText('Posterior', width - 115, legendY + 4);
    }

    // True effect label
    ctx.fillStyle = '#666';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`True θ = ${trueEffect.toFixed(2)}`, xScale(trueEffect), margin.top - 5);

  }, [priorType, priorParams, posteriorParams, dataStats, trueEffect, credibleInterval]);

  // Redraw on changes
  useEffect(() => {
    drawPlot();
  }, [drawPlot]);

  // Reset data
  const handleReset = () => {
    setIsAnimating(false);
    setDataPoints([]);
    setSampleSize(0);
  };

  // Toggle animation
  const handleToggleAnimation = () => {
    if (sampleSize >= maxSampleSize) {
      handleReset();
    }
    setIsAnimating(!isAnimating);
  };

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
          Bayesian Prior-Posterior Analysis
        </Typography>
      )}

      <Typography variant="body2" color="text.secondary" paragraph>
        Watch how your prior beliefs (blue dashed) combine with data evidence (orange)
        to form posterior beliefs (green solid) through Bayes' theorem.
      </Typography>

      <Grid container spacing={3}>
        {/* Controls */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              Prior Settings
            </Typography>

            {/* Prior type */}
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Prior Type</InputLabel>
              <Select
                value={priorType}
                onChange={(e) => setPriorType(e.target.value)}
                label="Prior Type"
              >
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="cauchy">Cauchy (JZS)</MenuItem>
                <MenuItem value="uniform">Uniform</MenuItem>
              </Select>
            </FormControl>

            {/* Prior parameters */}
            {priorType === 'normal' && (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Prior Mean: <strong>{priorParams.mean.toFixed(2)}</strong>
                  </Typography>
                  <Slider
                    value={priorParams.mean}
                    onChange={(e, v) => setPriorParams(p => ({ ...p, mean: v }))}
                    min={-2}
                    max={2}
                    step={0.1}
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Prior SD: <strong>{priorParams.sd.toFixed(2)}</strong>
                  </Typography>
                  <Slider
                    value={priorParams.sd}
                    onChange={(e, v) => setPriorParams(p => ({ ...p, sd: v }))}
                    min={0.2}
                    max={3}
                    step={0.1}
                  />
                </Box>
              </>
            )}

            {priorType === 'cauchy' && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Scale (r): <strong>{priorParams.scale.toFixed(3)}</strong>
                </Typography>
                <Slider
                  value={priorParams.scale}
                  onChange={(e, v) => setPriorParams(p => ({ ...p, scale: v }))}
                  min={0.1}
                  max={2}
                  step={0.01}
                />
                <Typography variant="caption" color="text.secondary">
                  JZS default: r = 0.707 (1/√2)
                </Typography>
              </Box>
            )}

            <Typography variant="subtitle2" gutterBottom fontWeight="bold" sx={{ mt: 2 }}>
              Data Settings
            </Typography>

            {/* True effect */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                True Effect (θ): <strong>{trueEffect.toFixed(2)}</strong>
              </Typography>
              <Slider
                value={trueEffect}
                onChange={(e, v) => {
                  setTrueEffect(v);
                  handleReset();
                }}
                min={-2}
                max={2}
                step={0.1}
              />
            </Box>

            {/* Max sample size */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Max Sample Size: <strong>{maxSampleSize}</strong>
              </Typography>
              <Slider
                value={maxSampleSize}
                onChange={(e, v) => setMaxSampleSize(v)}
                min={10}
                max={200}
                step={10}
              />
            </Box>

            {/* Animation controls */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                variant="contained"
                startIcon={isAnimating ? <PauseIcon /> : <PlayArrowIcon />}
                onClick={handleToggleAnimation}
                sx={{ flex: 1 }}
              >
                {isAnimating ? 'Pause' : 'Start'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleReset}
              >
                Reset
              </Button>
            </Box>

            {/* Progress */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Sample: {sampleSize} / {maxSampleSize}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(sampleSize / maxSampleSize) * 100}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
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
          <Paper sx={{ p: 2, bgcolor: '#fafafa' }}>
            <Grid container spacing={3}>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="#1976d2" fontWeight="bold">
                    {priorParams.mean.toFixed(2)}
                  </Typography>
                  <Typography variant="caption">Prior Mean</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="#ff9800" fontWeight="bold">
                    {dataStats.n > 0 ? dataStats.mean.toFixed(2) : '—'}
                  </Typography>
                  <Typography variant="caption">Sample Mean</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="#4caf50" fontWeight="bold">
                    {posteriorParams.mean.toFixed(2)}
                  </Typography>
                  <Typography variant="caption">Posterior Mean</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Chip
                    label={`[${credibleInterval.lower.toFixed(2)}, ${credibleInterval.upper.toFixed(2)}]`}
                    color="success"
                    sx={{ fontWeight: 'bold' }}
                  />
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                    95% Credible Interval
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Educational notes */}
        <Grid item xs={12}>
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Bayesian Updating:</strong> The posterior is proportional to
              Prior × Likelihood. As more data accumulates, the posterior becomes
              narrower (more certain) and shifts toward the true effect.
              Notice how a skeptical prior (centered at 0) still converges to the truth
              with enough data!
            </Typography>
          </Alert>
        </Grid>

        {/* Prior sensitivity note */}
        <Grid item xs={12}>
          <Alert severity="warning">
            <Typography variant="body2">
              <strong>Prior Sensitivity:</strong> Try different priors to see how
              they affect the posterior with small samples. With large samples,
              the posterior is dominated by the likelihood (data), making the
              prior less important. This is called "swamping the prior."
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default PriorPosteriorPlot;
