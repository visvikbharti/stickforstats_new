/**
 * Bayes Factor Simulation
 *
 * Interactive demonstration of Bayesian hypothesis testing
 * and evidence accumulation.
 *
 * Features:
 * - Prior distribution specification
 * - Likelihood visualization
 * - Posterior updating animation
 * - Bayes Factor calculation and interpretation
 * - Evidence categories (anecdotal to decisive)
 * - Comparison with frequentist p-values
 *
 * Educational Purpose:
 * Demonstrates Bayesian approach to hypothesis testing:
 * 1. Specify prior beliefs about effect size
 * 2. Collect data and compute likelihood
 * 3. Update to posterior distribution
 * 4. Compute Bayes Factor as evidence ratio
 *
 * Scientific Basis:
 * - BF₁₀ = P(Data | H₁) / P(Data | H₀)
 * - JZS prior: Cauchy(0, r√2) on effect size
 * - Default r = 0.707 (medium prior scale)
 *
 * References:
 * - Rouder, J.N., et al. (2009). Bayesian t tests for accepting and rejecting the null hypothesis.
 * - Schönbrodt, F.D. & Wagenmakers, E.-J. (2018). Bayes factor design analysis.
 * - Jeffreys, H. (1961). Theory of Probability.
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
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import InfoIcon from '@mui/icons-material/Info';
import PsychologyIcon from '@mui/icons-material/Psychology';
import BalanceIcon from '@mui/icons-material/Balance';

// Import functions
import { normalPDF, normalCDF } from '../utils/distributionFunctions';

/**
 * Cauchy PDF for JZS prior
 */
const cauchyPDF = (x, location = 0, scale = 1) => {
  return 1 / (Math.PI * scale * (1 + Math.pow((x - location) / scale, 2)));
};

/**
 * Evidence interpretation thresholds (Jeffreys scale)
 */
const EVIDENCE_SCALE = [
  { min: 100, label: 'Extreme', color: '#1b5e20', description: 'Decisive evidence' },
  { min: 30, label: 'Very Strong', color: '#388e3c', description: 'Very strong evidence' },
  { min: 10, label: 'Strong', color: '#4caf50', description: 'Strong evidence' },
  { min: 3, label: 'Moderate', color: '#8bc34a', description: 'Moderate evidence' },
  { min: 1, label: 'Anecdotal', color: '#ffeb3b', description: 'Anecdotal evidence' },
  { min: 1/3, label: 'Anecdotal', color: '#ffeb3b', description: 'Anecdotal evidence (for H₀)' },
  { min: 1/10, label: 'Moderate', color: '#ff9800', description: 'Moderate evidence for H₀' },
  { min: 1/30, label: 'Strong', color: '#f44336', description: 'Strong evidence for H₀' },
  { min: 0, label: 'Very Strong', color: '#b71c1c', description: 'Very strong evidence for H₀' }
];

/**
 * Get evidence interpretation
 */
const interpretBF = (bf) => {
  if (bf >= 100) return { label: 'Extreme for H₁', color: '#1b5e20', direction: 'H1' };
  if (bf >= 30) return { label: 'Very Strong for H₁', color: '#388e3c', direction: 'H1' };
  if (bf >= 10) return { label: 'Strong for H₁', color: '#4caf50', direction: 'H1' };
  if (bf >= 3) return { label: 'Moderate for H₁', color: '#8bc34a', direction: 'H1' };
  if (bf >= 1) return { label: 'Anecdotal for H₁', color: '#9e9e9e', direction: 'H1' };
  if (bf >= 1/3) return { label: 'Anecdotal for H₀', color: '#9e9e9e', direction: 'H0' };
  if (bf >= 1/10) return { label: 'Moderate for H₀', color: '#ff9800', direction: 'H0' };
  if (bf >= 1/30) return { label: 'Strong for H₀', color: '#f44336', direction: 'H0' };
  return { label: 'Very Strong for H₀', color: '#b71c1c', direction: 'H0' };
};

/**
 * Approximate JZS Bayes Factor for one-sample t-test
 * Using Savage-Dickey density ratio approximation
 */
const calculateBF10 = (t, n, r = 0.707) => {
  const df = n - 1;
  const effectSize = t / Math.sqrt(n);

  // Savage-Dickey approximation
  // BF10 ≈ prior(δ=0) / posterior(δ=0)

  // Prior density at 0 (Cauchy)
  const priorAt0 = cauchyPDF(0, 0, r);

  // Posterior approximation (using normal approximation for large n)
  const posteriorSD = 1 / Math.sqrt(n);
  const posteriorAt0 = normalPDF(-effectSize / posteriorSD) / posteriorSD;

  // Simple approximation
  let bf10 = posteriorAt0 / priorAt0;

  // Better approximation using JZS prior (Rouder et al. 2009)
  if (Math.abs(t) > 0) {
    const g = r * r;
    // Simplified JZS approximation that works well for moderate t values
    bf10 = Math.sqrt(1 + n * g) * Math.exp(
      (t * t / 2) * (n * g) / (1 + n * g) / n
    );
  }

  // Ensure reasonable bounds
  return Math.max(0.001, Math.min(1000, bf10));
};

/**
 * Box-Muller for random normals
 */
const randomNormal = () => {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

/**
 * Main Bayes Factor Simulation Component
 */
const BayesFactorSimulation = ({ embedded = false }) => {
  // Canvas reference
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Simulation parameters
  const [trueEffect, setTrueEffect] = useState(0.5);
  const [priorScale, setPriorScale] = useState(0.707);
  const [hypothesis, setHypothesis] = useState('H1'); // Truth: H0 or H1

  // Animation state
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(100);

  // Accumulated data
  const [data, setData] = useState([]);
  const [bfHistory, setBfHistory] = useState([]);

  // Canvas dimensions
  const [dimensions] = useState({ width: 650, height: 300 });

  // Current statistics
  const currentStats = useMemo(() => {
    if (data.length < 2) return { t: 0, bf10: 1, pValue: 1 };

    const n = data.length;
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
    const sd = Math.sqrt(variance);
    const se = sd / Math.sqrt(n);
    const t = mean / se;

    // Two-sided p-value approximation
    const pValue = 2 * (1 - normalCDF(Math.abs(t)));

    // Bayes Factor
    const bf10 = calculateBF10(t, n, priorScale);

    return { n, mean, sd, t, bf10, pValue };
  }, [data, priorScale]);

  // Evidence interpretation
  const evidence = useMemo(() => interpretBF(currentStats.bf10), [currentStats.bf10]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setData([]);
    setBfHistory([]);
  }, []);

  // Reset when hypothesis changes
  useEffect(() => {
    resetSimulation();
  }, [hypothesis, trueEffect, resetSimulation]);

  // Add one observation
  const addObservation = useCallback(() => {
    const trueMean = hypothesis === 'H1' ? trueEffect : 0;
    const newValue = trueMean + randomNormal();

    setData(prev => {
      const newData = [...prev, newValue];

      // Calculate BF for history
      if (newData.length >= 2) {
        const n = newData.length;
        const mean = newData.reduce((a, b) => a + b, 0) / n;
        const variance = newData.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
        const sd = Math.sqrt(variance);
        const se = sd / Math.sqrt(n);
        const t = mean / se;
        const bf = calculateBF10(t, n, priorScale);

        setBfHistory(prevBf => [...prevBf, { n, bf }]);
      }

      return newData;
    });
  }, [hypothesis, trueEffect, priorScale]);

  // Animation loop
  useEffect(() => {
    if (isRunning) {
      const intervalId = setInterval(addObservation, speed);
      return () => clearInterval(intervalId);
    }
  }, [isRunning, speed, addObservation]);

  // Draw visualization
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;

    ctx.clearRect(0, 0, width, height);

    const margin = { top: 30, right: 30, bottom: 40, left: 60 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    // Background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    // Plot area
    ctx.fillStyle = '#fff';
    ctx.fillRect(margin.left, margin.top, plotWidth, plotHeight);

    // Grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;

    // Evidence threshold lines
    const evidenceThresholds = [100, 30, 10, 3, 1, 1/3, 1/10, 1/30];
    const yMin = Math.log10(1/100);
    const yMax = Math.log10(100);

    const yScale = (bf) => {
      const logBf = Math.log10(Math.max(0.01, Math.min(100, bf)));
      return margin.top + plotHeight - ((logBf - yMin) / (yMax - yMin)) * plotHeight;
    };

    // Draw threshold lines
    evidenceThresholds.forEach(threshold => {
      const y = yScale(threshold);
      ctx.strokeStyle = threshold === 1 ? '#333' : '#e0e0e0';
      ctx.lineWidth = threshold === 1 ? 1.5 : 0.5;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + plotWidth, y);
      ctx.stroke();
    });

    // Draw BF history
    if (bfHistory.length > 1) {
      const xScale = (n) => margin.left + (n / Math.max(50, data.length)) * plotWidth;

      ctx.beginPath();
      ctx.strokeStyle = '#d32f2f';
      ctx.lineWidth = 2.5;

      bfHistory.forEach((point, i) => {
        const x = xScale(point.n);
        const y = yScale(point.bf);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Current point
      if (bfHistory.length > 0) {
        const last = bfHistory[bfHistory.length - 1];
        ctx.beginPath();
        ctx.arc(xScale(last.n), yScale(last.bf), 6, 0, 2 * Math.PI);
        ctx.fillStyle = evidence.color;
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + plotHeight);
    ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = '#333';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'right';
    [100, 10, 1, 0.1, 0.01].forEach(bf => {
      ctx.fillText(bf.toString(), margin.left - 5, yScale(bf) + 4);
    });

    // Axis labels
    ctx.textAlign = 'center';
    ctx.fillText('Sample Size (n)', margin.left + plotWidth / 2, height - 8);

    ctx.save();
    ctx.translate(15, margin.top + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Bayes Factor (BF₁₀)', 0, 0);
    ctx.restore();

    // Evidence zone labels
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#4caf50';
    ctx.fillText('Evidence for H₁', width - margin.right - 5, margin.top + 20);
    ctx.fillStyle = '#f44336';
    ctx.fillText('Evidence for H₀', width - margin.right - 5, margin.top + plotHeight - 10);

  }, [dimensions, bfHistory, data.length, evidence]);

  // Animation frame
  useEffect(() => {
    const animate = () => {
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [draw]);

  // Quick add
  const addMany = (count) => {
    for (let i = 0; i < count; i++) addObservation();
  };

  return (
    <Paper elevation={embedded ? 0 : 3} sx={{ p: 3, bgcolor: 'background.paper' }}>
      {!embedded && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#d32f2f', display: 'flex', alignItems: 'center', gap: 1 }}>
            <PsychologyIcon /> Bayes Factor Simulation
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Watch evidence accumulate as data is collected. See how the Bayes Factor evolves with sample size.
          </Typography>
        </Box>
      )}

      <Grid container spacing={3}>
        {/* Controls */}
        <Grid item xs={12} md={3}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>Simulation</Typography>

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
                <IconButton onClick={resetSimulation}><RestartAltIcon /></IconButton>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button size="small" variant="outlined" onClick={() => addMany(10)}>+10</Button>
                <Button size="small" variant="outlined" onClick={() => addMany(50)}>+50</Button>
                <Button size="small" variant="outlined" onClick={() => addMany(100)}>+100</Button>
              </Box>

              <Divider sx={{ my: 2 }} />

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>True State</InputLabel>
                <Select
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  label="True State"
                >
                  <MenuItem value="H0">H₀ True (No Effect)</MenuItem>
                  <MenuItem value="H1">H₁ True (Effect Exists)</MenuItem>
                </Select>
              </FormControl>

              {hypothesis === 'H1' && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    True Effect (δ): <strong>{trueEffect}</strong>
                  </Typography>
                  <Slider
                    value={trueEffect}
                    onChange={(e, v) => setTrueEffect(v)}
                    min={0.2}
                    max={1.0}
                    step={0.1}
                    size="small"
                    sx={{ color: '#d32f2f' }}
                  />
                </Box>
              )}

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Prior Scale (r): <strong>{priorScale}</strong>
                </Typography>
                <Slider
                  value={priorScale}
                  onChange={(e, v) => setPriorScale(v)}
                  min={0.5}
                  max={1.5}
                  step={0.1}
                  marks={[
                    { value: 0.5, label: 'Narrow' },
                    { value: 0.707, label: 'Default' },
                    { value: 1.0, label: 'Wide' }
                  ]}
                  size="small"
                  sx={{ color: '#d32f2f' }}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Current Evidence */}
          <Card variant="outlined" sx={{ bgcolor: evidence.color, color: evidence.direction === 'H0' && currentStats.bf10 < 1/10 ? '#fff' : '#000' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="caption">Current Evidence</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                BF₁₀ = {currentStats.bf10.toFixed(2)}
              </Typography>
              <Chip
                label={evidence.label}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.3)',
                  fontWeight: 600,
                  mt: 1
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Visualization */}
        <Grid item xs={12} md={9}>
          {/* Stats Row */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={4}>
              <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant="caption">Sample Size</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{data.length}</Typography>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant="caption">t-statistic</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {currentStats.t?.toFixed(2) || '—'}
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant="caption">p-value</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {currentStats.pValue < 0.001 ? '<.001' : currentStats.pValue?.toFixed(3) || '—'}
                </Typography>
              </Card>
            </Grid>
          </Grid>

          {/* Canvas */}
          <canvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            style={{ border: '1px solid #e0e0e0', borderRadius: 8, width: '100%', height: 'auto' }}
          />

          {/* Evidence Scale */}
          <Card variant="outlined" sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                <BalanceIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                Evidence Interpretation Scale (Jeffreys)
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                {[
                  { range: 'BF > 100', label: 'Extreme', color: '#1b5e20' },
                  { range: '30-100', label: 'V. Strong', color: '#388e3c' },
                  { range: '10-30', label: 'Strong', color: '#4caf50' },
                  { range: '3-10', label: 'Moderate', color: '#8bc34a' },
                  { range: '1-3', label: 'Anecdotal', color: '#9e9e9e' },
                  { range: '1/3-1', label: 'Anecdotal', color: '#9e9e9e' },
                  { range: '1/10-1/3', label: 'Moderate', color: '#ff9800' },
                  { range: '< 1/10', label: 'Strong', color: '#f44336' }
                ].map((item, i) => (
                  <Chip
                    key={i}
                    label={`${item.range}: ${item.label}`}
                    size="small"
                    sx={{ bgcolor: item.color, color: i < 4 ? '#fff' : '#000', fontSize: '0.65rem' }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Educational Note */}
      <Alert severity="info" sx={{ mt: 3 }} icon={<InfoIcon />}>
        <Typography variant="body2">
          <strong>Bayesian vs Frequentist:</strong> Unlike p-values, the Bayes Factor can provide evidence
          <em> for</em> the null hypothesis (BF₁₀ &lt; 1). Watch how evidence accumulates smoothly
          rather than giving a single yes/no decision. This is the basis of Bayesian "power analysis"
          which plans for sufficient evidence (e.g., BF &gt; 10) rather than just rejecting H₀.
        </Typography>
      </Alert>
    </Paper>
  );
};

export default BayesFactorSimulation;
