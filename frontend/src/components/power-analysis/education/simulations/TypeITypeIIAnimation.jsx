/**
 * Type I and Type II Error Animation
 *
 * Interactive visualization demonstrating the fundamental concepts of:
 * - Type I Error (α) - False Positive Rate
 * - Type II Error (β) - False Negative Rate
 * - Statistical Power (1 - β)
 *
 * Features:
 * - Two overlapping normal distributions (H₀ and H₁)
 * - Draggable critical value line
 * - Real-time shaded regions showing α, β, and power
 * - Effect size and sample size controls
 * - Educational annotations and formulas
 *
 * This is the foundational visualization for understanding power analysis.
 *
 * Scientific Basis:
 * - H₀ distribution: N(0, 1) - Standard normal under null
 * - H₁ distribution: N(δ√n, 1) - Shifted by noncentrality parameter
 * - Critical value: z_{1-α/2} for two-sided test
 *
 * References:
 * - Cohen, J. (1988). Statistical Power Analysis for the Behavioral Sciences.
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
  Chip,
  Tooltip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import InfoIcon from '@mui/icons-material/Info';
import TuneIcon from '@mui/icons-material/Tune';
import SchoolIcon from '@mui/icons-material/School';

// Import distribution functions
import { normalPDF, normalCDF, normalQuantile } from '../utils/distributionFunctions';

/**
 * Main Type I/Type II Animation Component
 */
const TypeITypeIIAnimation = ({ embedded = false, onPowerChange = null }) => {
  // Canvas reference
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);
  const animationRef = useRef(null);
  const samplesRef = useRef([]);

  // Interactive parameters
  const [effectSize, setEffectSize] = useState(0.5);  // Cohen's d
  const [sampleSize, setSampleSize] = useState(30);
  const [alpha, setAlpha] = useState(0.05);
  const [testType, setTestType] = useState('two-sided');

  // Visualization options
  const [showLabels, setShowLabels] = useState(true);
  const [showFormulas, setShowFormulas] = useState(true);
  const [highlightRegion, setHighlightRegion] = useState(null); // 'alpha', 'beta', 'power', null

  // Dragging state for critical value
  const [isDragging, setIsDragging] = useState(false);
  const [customCriticalValue, setCustomCriticalValue] = useState(null);

  // Canvas dimensions
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 });

  // Calculate derived values
  const calculations = useMemo(() => {
    // Noncentrality parameter (for standardized test statistic)
    const ncp = effectSize * Math.sqrt(sampleSize);

    // Critical value(s)
    let criticalValueUpper, criticalValueLower;
    if (testType === 'two-sided') {
      criticalValueUpper = customCriticalValue ?? normalQuantile(1 - alpha / 2);
      criticalValueLower = -criticalValueUpper;
    } else if (testType === 'greater') {
      criticalValueUpper = customCriticalValue ?? normalQuantile(1 - alpha);
      criticalValueLower = -Infinity;
    } else {
      criticalValueLower = customCriticalValue ?? normalQuantile(alpha);
      criticalValueUpper = Infinity;
    }

    // Type I error (α) - already set by user, but we can verify
    const typeIError = alpha;

    // Type II error (β) - probability of NOT rejecting when H₁ is true
    let beta;
    if (testType === 'two-sided') {
      const upperBeta = normalCDF(criticalValueUpper - ncp);
      const lowerBeta = normalCDF(criticalValueLower - ncp);
      beta = upperBeta - lowerBeta;
    } else if (testType === 'greater') {
      beta = normalCDF(criticalValueUpper - ncp);
    } else {
      beta = 1 - normalCDF(criticalValueLower - ncp);
    }

    // Power (1 - β)
    const power = 1 - beta;

    return {
      ncp,
      criticalValueUpper,
      criticalValueLower,
      typeIError,
      beta,
      power
    };
  }, [effectSize, sampleSize, alpha, testType, customCriticalValue]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const width = Math.min(containerRef.current.clientWidth - 32, 900);
        setDimensions({ width, height: Math.min(450, width * 0.5) });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Notify parent of power changes
  useEffect(() => {
    if (onPowerChange) {
      onPowerChange(calculations.power);
    }
  }, [calculations.power, onPowerChange]);

  // Drawing function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Margins and scales
    const margin = { top: 40, right: 30, bottom: 60, left: 50 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    // X scale: -4 to max(4, ncp + 3)
    const xMin = -4;
    const xMax = Math.max(4, calculations.ncp + 3);
    const xScale = (x) => margin.left + ((x - xMin) / (xMax - xMin)) * plotWidth;
    const xScaleInverse = (px) => xMin + ((px - margin.left) / plotWidth) * (xMax - xMin);

    // Y scale: 0 to 0.45 (max of standard normal PDF)
    const yMax = 0.45;
    const yScale = (y) => margin.top + plotHeight - (y / yMax) * plotHeight;

    // Store scales for interaction
    canvas._scales = { xScale, xScaleInverse, yScale, margin, plotWidth, plotHeight };

    // Background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    // Plot area background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(margin.left, margin.top, plotWidth, plotHeight);

    // Grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;

    // Vertical grid
    for (let x = Math.ceil(xMin); x <= xMax; x++) {
      ctx.beginPath();
      ctx.moveTo(xScale(x), margin.top);
      ctx.lineTo(xScale(x), margin.top + plotHeight);
      ctx.stroke();
    }

    // Horizontal grid
    for (let y = 0; y <= 0.4; y += 0.1) {
      ctx.beginPath();
      ctx.moveTo(margin.left, yScale(y));
      ctx.lineTo(margin.left + plotWidth, yScale(y));
      ctx.stroke();
    }

    // Draw shaded regions FIRST (under the curves)
    const { criticalValueUpper, criticalValueLower, ncp } = calculations;

    // Alpha region (Type I Error) - rejection region under H₀
    ctx.globalAlpha = highlightRegion === 'alpha' ? 0.6 : 0.3;
    ctx.fillStyle = '#f44336'; // Red

    // Upper tail (always for two-sided and greater)
    if (criticalValueUpper < xMax) {
      ctx.beginPath();
      ctx.moveTo(xScale(criticalValueUpper), yScale(0));
      for (let x = criticalValueUpper; x <= xMax; x += 0.02) {
        ctx.lineTo(xScale(x), yScale(normalPDF(x)));
      }
      ctx.lineTo(xScale(xMax), yScale(0));
      ctx.closePath();
      ctx.fill();
    }

    // Lower tail (for two-sided and less)
    if (criticalValueLower > xMin && testType !== 'greater') {
      ctx.beginPath();
      ctx.moveTo(xScale(xMin), yScale(0));
      for (let x = xMin; x <= criticalValueLower; x += 0.02) {
        ctx.lineTo(xScale(x), yScale(normalPDF(x)));
      }
      ctx.lineTo(xScale(criticalValueLower), yScale(0));
      ctx.closePath();
      ctx.fill();
    }

    // Beta region (Type II Error) - non-rejection region under H₁
    ctx.globalAlpha = highlightRegion === 'beta' ? 0.6 : 0.3;
    ctx.fillStyle = '#ff9800'; // Orange

    const leftBound = testType === 'greater' ? xMin : criticalValueLower;
    const rightBound = testType === 'less' ? xMax : criticalValueUpper;

    ctx.beginPath();
    ctx.moveTo(xScale(Math.max(leftBound, xMin)), yScale(0));
    for (let x = Math.max(leftBound, xMin); x <= Math.min(rightBound, xMax); x += 0.02) {
      ctx.lineTo(xScale(x), yScale(normalPDF(x - ncp)));
    }
    ctx.lineTo(xScale(Math.min(rightBound, xMax)), yScale(0));
    ctx.closePath();
    ctx.fill();

    // Power region - rejection region under H₁
    ctx.globalAlpha = highlightRegion === 'power' ? 0.6 : 0.3;
    ctx.fillStyle = '#4caf50'; // Green

    // Upper tail power
    if (criticalValueUpper < xMax) {
      ctx.beginPath();
      ctx.moveTo(xScale(criticalValueUpper), yScale(0));
      for (let x = criticalValueUpper; x <= xMax; x += 0.02) {
        ctx.lineTo(xScale(x), yScale(normalPDF(x - ncp)));
      }
      ctx.lineTo(xScale(xMax), yScale(0));
      ctx.closePath();
      ctx.fill();
    }

    // Lower tail power (for two-sided)
    if (testType === 'two-sided' && criticalValueLower > xMin) {
      ctx.beginPath();
      ctx.moveTo(xScale(xMin), yScale(0));
      for (let x = xMin; x <= criticalValueLower; x += 0.02) {
        ctx.lineTo(xScale(x), yScale(normalPDF(x - ncp)));
      }
      ctx.lineTo(xScale(criticalValueLower), yScale(0));
      ctx.closePath();
      ctx.fill();
    }

    ctx.globalAlpha = 1.0;

    // Draw H₀ distribution (standard normal, centered at 0)
    ctx.beginPath();
    ctx.strokeStyle = '#1976d2'; // Blue
    ctx.lineWidth = 2.5;
    for (let x = xMin; x <= xMax; x += 0.02) {
      const y = normalPDF(x);
      if (x === xMin) {
        ctx.moveTo(xScale(x), yScale(y));
      } else {
        ctx.lineTo(xScale(x), yScale(y));
      }
    }
    ctx.stroke();

    // Draw H₁ distribution (shifted by ncp)
    ctx.beginPath();
    ctx.strokeStyle = '#d32f2f'; // Red
    ctx.lineWidth = 2.5;
    for (let x = xMin; x <= xMax; x += 0.02) {
      const y = normalPDF(x - ncp);
      if (x === xMin) {
        ctx.moveTo(xScale(x), yScale(y));
      } else {
        ctx.lineTo(xScale(x), yScale(y));
      }
    }
    ctx.stroke();

    // Draw critical value line(s)
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;

    if (criticalValueUpper < xMax) {
      ctx.beginPath();
      ctx.moveTo(xScale(criticalValueUpper), margin.top);
      ctx.lineTo(xScale(criticalValueUpper), margin.top + plotHeight);
      ctx.stroke();
    }

    if (testType === 'two-sided' && criticalValueLower > xMin) {
      ctx.beginPath();
      ctx.moveTo(xScale(criticalValueLower), margin.top);
      ctx.lineTo(xScale(criticalValueLower), margin.top + plotHeight);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // Draw axes
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
    ctx.fillStyle = '#333';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    for (let x = Math.ceil(xMin); x <= xMax; x++) {
      ctx.fillText(x.toString(), xScale(x), margin.top + plotHeight + 20);
    }
    ctx.fillText('Test Statistic (z)', margin.left + plotWidth / 2, height - 10);

    // Y-axis label
    ctx.save();
    ctx.translate(15, margin.top + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Probability Density', 0, 0);
    ctx.restore();

    // Labels and annotations
    if (showLabels) {
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';

      // H₀ label
      ctx.fillStyle = '#1976d2';
      ctx.textAlign = 'center';
      const h0Peak = yScale(normalPDF(0));
      ctx.fillText('H₀', xScale(0), h0Peak - 15);
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText('(Null True)', xScale(0), h0Peak - 2);

      // H₁ label
      ctx.fillStyle = '#d32f2f';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      const h1Peak = yScale(normalPDF(0));
      ctx.fillText('H₁', xScale(ncp), h1Peak - 15);
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText('(Effect Exists)', xScale(ncp), h1Peak - 2);

      // Critical value label
      if (criticalValueUpper < xMax) {
        ctx.fillStyle = '#333';
        ctx.font = '11px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Critical: ${criticalValueUpper.toFixed(2)}`, xScale(criticalValueUpper) + 5, margin.top + 20);
      }

      // Region labels with values
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';

      // Alpha label
      if (criticalValueUpper < xMax) {
        ctx.fillStyle = '#f44336';
        ctx.textAlign = 'center';
        const alphaX = (criticalValueUpper + xMax) / 2;
        ctx.fillText(`α = ${(calculations.typeIError * 100).toFixed(1)}%`, xScale(alphaX), margin.top + plotHeight - 20);
      }

      // Beta label
      ctx.fillStyle = '#ff9800';
      const betaX = (leftBound + rightBound) / 2 + ncp * 0.3;
      ctx.fillText(`β = ${(calculations.beta * 100).toFixed(1)}%`, xScale(Math.min(betaX, ncp)), margin.top + plotHeight / 2);

      // Power label
      ctx.fillStyle = '#4caf50';
      const powerX = Math.min((criticalValueUpper + xMax) / 2 + ncp * 0.5, xMax - 0.5);
      ctx.fillText(`Power = ${(calculations.power * 100).toFixed(1)}%`, xScale(powerX), margin.top + plotHeight / 2 - 30);
    }

    // Draw animated samples if playing
    if (samplesRef.current.length > 0) {
      samplesRef.current.forEach((sample, i) => {
        const age = Date.now() - sample.time;
        const opacity = Math.max(0, 1 - age / 2000);

        if (opacity > 0) {
          ctx.globalAlpha = opacity;
          ctx.beginPath();
          ctx.arc(xScale(sample.value), yScale(sample.y), 6, 0, 2 * Math.PI);
          ctx.fillStyle = sample.rejected ? '#4caf50' : '#ff9800';
          ctx.fill();
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      });

      // Clean old samples
      samplesRef.current = samplesRef.current.filter(s => Date.now() - s.time < 2000);
    }

  }, [dimensions, calculations, testType, showLabels, highlightRegion]);

  // Animation loop
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

  // Sample generation animation
  useEffect(() => {
    let intervalId;

    if (isPlaying) {
      intervalId = setInterval(() => {
        // Generate sample under H₁ (effect exists)
        const z = calculations.ncp + randomNormal();
        const rejected = testType === 'two-sided'
          ? Math.abs(z) > calculations.criticalValueUpper
          : testType === 'greater'
            ? z > calculations.criticalValueUpper
            : z < calculations.criticalValueLower;

        samplesRef.current.push({
          value: z,
          y: normalPDF(z - calculations.ncp) * 0.8,
          rejected,
          time: Date.now()
        });

        // Limit samples
        if (samplesRef.current.length > 50) {
          samplesRef.current = samplesRef.current.slice(-50);
        }
      }, 200);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaying, calculations, testType]);

  // Mouse interaction for dragging critical value
  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas._scales) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const { xScale, xScaleInverse } = canvas._scales;

    const critX = xScale(calculations.criticalValueUpper);
    if (Math.abs(x - critX) < 15) {
      setIsDragging(true);
    }
  }, [calculations.criticalValueUpper]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas || !canvas._scales) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const { xScaleInverse } = canvas._scales;

    const newCritical = Math.max(0.5, Math.min(4, xScaleInverse(x)));
    setCustomCriticalValue(newCritical);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Reset to default critical value
  const resetCriticalValue = () => {
    setCustomCriticalValue(null);
  };

  // Random normal generator (Box-Muller)
  const randomNormal = () => {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  return (
    <Paper
      elevation={embedded ? 0 : 3}
      sx={{ p: 3, bgcolor: '#fff' }}
      ref={containerRef}
    >
      {!embedded && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#d32f2f', display: 'flex', alignItems: 'center', gap: 1 }}>
            <SchoolIcon /> Type I & Type II Error Visualization
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Interactive demonstration of statistical errors and power. Drag the critical value line or adjust parameters.
          </Typography>
        </Box>
      )}

      <Grid container spacing={3}>
        {/* Controls */}
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TuneIcon fontSize="small" /> Parameters
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Effect Size (Cohen's d): <strong>{effectSize.toFixed(2)}</strong>
                </Typography>
                <Slider
                  value={effectSize}
                  onChange={(e, v) => setEffectSize(v)}
                  min={0.1}
                  max={1.5}
                  step={0.05}
                  marks={[
                    { value: 0.2, label: 'S' },
                    { value: 0.5, label: 'M' },
                    { value: 0.8, label: 'L' }
                  ]}
                  sx={{ color: '#d32f2f' }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Sample Size (n): <strong>{sampleSize}</strong>
                </Typography>
                <Slider
                  value={sampleSize}
                  onChange={(e, v) => setSampleSize(v)}
                  min={10}
                  max={200}
                  step={5}
                  sx={{ color: '#d32f2f' }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
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
                    { value: 0.01, label: '0.01' },
                    { value: 0.05, label: '0.05' },
                    { value: 0.10, label: '0.10' }
                  ]}
                  sx={{ color: '#d32f2f' }}
                />
              </Box>

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Test Type</InputLabel>
                <Select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value)}
                  label="Test Type"
                >
                  <MenuItem value="two-sided">Two-sided</MenuItem>
                  <MenuItem value="greater">One-sided (greater)</MenuItem>
                  <MenuItem value="less">One-sided (less)</MenuItem>
                </Select>
              </FormControl>

              <Divider sx={{ my: 2 }} />

              <FormControlLabel
                control={
                  <Switch
                    checked={showLabels}
                    onChange={(e) => setShowLabels(e.target.checked)}
                    size="small"
                  />
                }
                label="Show Labels"
              />
            </CardContent>
          </Card>

          {/* Results Card */}
          <Card variant="outlined" sx={{ bgcolor: '#f5f5f5' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Calculated Values
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Chip
                  label={`α (Type I) = ${(calculations.typeIError * 100).toFixed(1)}%`}
                  sx={{
                    bgcolor: highlightRegion === 'alpha' ? '#f44336' : '#ffcdd2',
                    color: highlightRegion === 'alpha' ? '#fff' : '#c62828',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  onClick={() => setHighlightRegion(highlightRegion === 'alpha' ? null : 'alpha')}
                />

                <Chip
                  label={`β (Type II) = ${(calculations.beta * 100).toFixed(1)}%`}
                  sx={{
                    bgcolor: highlightRegion === 'beta' ? '#ff9800' : '#ffe0b2',
                    color: highlightRegion === 'beta' ? '#fff' : '#e65100',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  onClick={() => setHighlightRegion(highlightRegion === 'beta' ? null : 'beta')}
                />

                <Chip
                  label={`Power = ${(calculations.power * 100).toFixed(1)}%`}
                  sx={{
                    bgcolor: highlightRegion === 'power' ? '#4caf50' : '#c8e6c9',
                    color: highlightRegion === 'power' ? '#fff' : '#2e7d32',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  onClick={() => setHighlightRegion(highlightRegion === 'power' ? null : 'power')}
                />

                <Divider sx={{ my: 1 }} />

                <Typography variant="caption" color="text.secondary">
                  NCP (λ) = {calculations.ncp.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Critical z = ±{calculations.criticalValueUpper.toFixed(3)}
                </Typography>
              </Box>
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
              style={{
                cursor: isDragging ? 'ew-resize' : 'default',
                border: '1px solid #e0e0e0',
                borderRadius: 8
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />

            {/* Animation controls */}
            <Box sx={{
              position: 'absolute',
              bottom: 70,
              left: 60,
              display: 'flex',
              gap: 1,
              bgcolor: 'rgba(255,255,255,0.9)',
              borderRadius: 2,
              p: 0.5
            }}>
              <Tooltip title={isPlaying ? "Pause sampling" : "Start sampling under H₁"}>
                <IconButton
                  size="small"
                  onClick={() => setIsPlaying(!isPlaying)}
                  color={isPlaying ? "error" : "primary"}
                >
                  {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
              </Tooltip>

              <Tooltip title="Reset samples">
                <IconButton
                  size="small"
                  onClick={() => { samplesRef.current = []; }}
                >
                  <RestartAltIcon />
                </IconButton>
              </Tooltip>

              {customCriticalValue !== null && (
                <Tooltip title="Reset critical value">
                  <Button
                    size="small"
                    onClick={resetCriticalValue}
                    sx={{ fontSize: '0.7rem' }}
                  >
                    Reset
                  </Button>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Legend */}
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 24, height: 3, bgcolor: '#1976d2' }} />
              <Typography variant="caption">H₀ Distribution (Null True)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 24, height: 3, bgcolor: '#d32f2f' }} />
              <Typography variant="caption">H₁ Distribution (Effect Exists)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 16, height: 16, bgcolor: '#f44336', opacity: 0.3 }} />
              <Typography variant="caption">α (Type I Error)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 16, height: 16, bgcolor: '#ff9800', opacity: 0.3 }} />
              <Typography variant="caption">β (Type II Error)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 16, height: 16, bgcolor: '#4caf50', opacity: 0.3 }} />
              <Typography variant="caption">Power (1 - β)</Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Educational Alert */}
      <Alert severity="info" sx={{ mt: 3 }} icon={<InfoIcon />}>
        <Typography variant="body2">
          <strong>Key Insight:</strong> As effect size (d) or sample size (n) increases, the H₁ distribution shifts right,
          reducing β (orange) and increasing power (green). The critical value determines α (red),
          which remains constant at your chosen significance level.
        </Typography>
      </Alert>

      {/* Formulas */}
      {showFormulas && (
        <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Mathematical Relationships</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" sx={{ fontFamily: 'serif', fontSize: '1rem' }}>
                <strong>Noncentrality Parameter:</strong><br />
                λ = d × √n = {effectSize.toFixed(2)} × √{sampleSize} = {calculations.ncp.toFixed(2)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" sx={{ fontFamily: 'serif', fontSize: '1rem' }}>
                <strong>Power:</strong><br />
                1 - β = P(Reject H₀ | H₁ true) = {(calculations.power * 100).toFixed(1)}%
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" sx={{ fontFamily: 'serif', fontSize: '1rem' }}>
                <strong>To achieve 80% power:</strong><br />
                n ≈ 2 × ((z_α + z_β) / d)² ≈ {Math.ceil(2 * Math.pow((1.96 + 0.84) / effectSize, 2))}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      )}
    </Paper>
  );
};

export default TypeITypeIIAnimation;
