import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Slider,
  Paper,
  Grid,
  Card,
  CardContent,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Chip,
  Divider
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RefreshIcon from '@mui/icons-material/Refresh';
import TimelineIcon from '@mui/icons-material/Timeline';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// Import utilities
import {
  generateCorrelated,
  generateElliptical,
  generateCircular,
  covarianceMatrix2D,
  eigendecomposition2D,
  varianceAlongDirection
} from '../utils';
import { animate, easing, animateVarianceSearch } from '../utils/animations';

/**
 * Lesson 2: Finding the Best Line
 *
 * Interactive lesson teaching how to find the direction of maximum variance.
 * Builds on Lesson 1's variance intuition to introduce optimization.
 */
const Lesson02_BestLine = ({ onComplete }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // State
  const [points, setPoints] = useState([]);
  const [angle, setAngle] = useState(0);
  const [variance, setVariance] = useState(0);
  const [maxVariance, setMaxVariance] = useState(0);
  const [maxAngle, setMaxAngle] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dataset, setDataset] = useState('correlated');
  const [searchMethod, setSearchMethod] = useState('incremental');
  const [searchProgress, setSearchProgress] = useState(0);
  const [varianceHistory, setVarianceHistory] = useState([]);
  const [showEllipse, setShowEllipse] = useState(true);
  const [showHistory, setShowHistory] = useState(true);

  // Constants
  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 400;
  const CENTER_X = CANVAS_WIDTH / 2;
  const CENTER_Y = CANVAS_HEIGHT / 2;
  const SCALE = 40;

  /**
   * Generate dataset
   */
  useEffect(() => {
    let newPoints = [];

    switch (dataset) {
      case 'correlated':
        newPoints = generateCorrelated(50, 0.8);
        break;
      case 'elliptical':
        newPoints = generateElliptical(50, 0, 0, 2, 0.5, Math.PI / 6);
        break;
      case 'circular':
        newPoints = generateCircular(50);
        break;
      default:
        newPoints = generateCorrelated(50, 0.8);
    }

    // Scale to canvas
    const scaled = newPoints.map(p => ({
      x: CENTER_X + p.x * SCALE,
      y: CENTER_Y - p.y * SCALE
    }));

    setPoints(scaled);
    setVarianceHistory([]);
    setSearchProgress(0);

    // Calculate true maximum
    const result = eigendecomposition2D(covarianceMatrix2D(newPoints));
    const trueMaxAngle = Math.atan2(result.v1.y, result.v1.x);
    setMaxAngle(trueMaxAngle);
    setMaxVariance(result.lambda1);
  }, [dataset]);

  /**
   * Calculate variance at current angle
   */
  useEffect(() => {
    if (points.length === 0) return;

    // Convert canvas points to data space
    const dataPoints = points.map(p => ({
      x: (p.x - CENTER_X) / SCALE,
      y: (CENTER_Y - p.y) / SCALE
    }));

    const result = varianceAlongDirection(dataPoints, angle);
    setVariance(result.variance);
  }, [angle, points]);

  /**
   * Canvas rendering
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_WIDTH; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CENTER_X, 0);
    ctx.lineTo(CENTER_X, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, CENTER_Y);
    ctx.lineTo(CANVAS_WIDTH, CENTER_Y);
    ctx.stroke();

    // Draw variance history (heatmap)
    if (showHistory && varianceHistory.length > 0) {
      varianceHistory.forEach(({ angle: histAngle, variance: histVar }) => {
        const intensity = histVar / maxVariance;
        const alpha = 0.15 * intensity;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = `rgba(76, 175, 80, ${alpha})`;
        ctx.lineWidth = 3;

        const dx = Math.cos(histAngle) * 150;
        const dy = -Math.sin(histAngle) * 150;

        ctx.beginPath();
        ctx.moveTo(CENTER_X - dx, CENTER_Y - dy);
        ctx.lineTo(CENTER_X + dx, CENTER_Y + dy);
        ctx.stroke();
        ctx.restore();
      });
    }

    // Draw covariance ellipse
    if (showEllipse && points.length > 0) {
      const dataPoints = points.map(p => ({
        x: (p.x - CENTER_X) / SCALE,
        y: (CENTER_Y - p.y) / SCALE
      }));

      const cov = covarianceMatrix2D(dataPoints);
      const { lambda1, lambda2, v1 } = eigendecomposition2D(cov);

      const ellipseAngle = Math.atan2(v1.y, v1.x);
      const a = Math.sqrt(lambda1) * 2 * SCALE;
      const b = Math.sqrt(lambda2) * 2 * SCALE;

      ctx.save();
      ctx.strokeStyle = '#1976d2';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4;
      ctx.setLineDash([5, 5]);

      ctx.beginPath();
      ctx.ellipse(CENTER_X, CENTER_Y, a, b, -ellipseAngle, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }

    // Draw maximum variance direction (faint)
    if (maxAngle !== 0) {
      const dx = Math.cos(maxAngle) * 180;
      const dy = -Math.sin(maxAngle) * 180;

      ctx.save();
      ctx.strokeStyle = '#4caf50';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.2;
      ctx.setLineDash([10, 5]);

      ctx.beginPath();
      ctx.moveTo(CENTER_X - dx, CENTER_Y - dy);
      ctx.lineTo(CENTER_X + dx, CENTER_Y + dy);
      ctx.stroke();
      ctx.restore();
    }

    // Draw current direction line
    const dx = Math.cos(angle) * 180;
    const dy = -Math.sin(angle) * 180;

    ctx.strokeStyle = '#f44336';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.8;

    ctx.beginPath();
    ctx.moveTo(CENTER_X - dx, CENTER_Y - dy);
    ctx.lineTo(CENTER_X + dx, CENTER_Y + dy);
    ctx.stroke();

    // Draw points
    points.forEach(point => {
      ctx.fillStyle = '#1976d2';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });

    // Draw variance indicator
    const barWidth = 200;
    const barHeight = 20;
    const barX = 20;
    const barY = CANVAS_HEIGHT - 40;

    // Background
    ctx.fillStyle = '#eee';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Variance bar
    const fillWidth = (variance / maxVariance) * barWidth;
    const hue = (variance / maxVariance) * 120; // Red to green
    ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
    ctx.fillRect(barX, barY, fillWidth, barHeight);

    // Border
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Label
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.fillText('Variance', barX, barY - 5);
    ctx.fillText(`${variance.toFixed(3)}`, barX + barWidth + 10, barY + 14);

  }, [points, angle, variance, maxVariance, maxAngle, varianceHistory, showEllipse, showHistory]);

  /**
   * Incremental search animation
   */
  const runIncrementalSearch = () => {
    if (points.length === 0) return;

    setIsAnimating(true);
    setVarianceHistory([]);

    const dataPoints = points.map(p => ({
      x: (p.x - CENTER_X) / SCALE,
      y: (CENTER_Y - p.y) / SCALE
    }));

    animationRef.current = animateVarianceSearch({
      fromAngle: 0,
      toAngle: Math.PI,
      duration: 3000,
      calculateVariance: (a) => {
        const result = varianceAlongDirection(dataPoints, a);
        return result.variance;
      },
      onUpdate: (currentAngle, currentVar, foundMaxAngle, foundMaxVar) => {
        setAngle(currentAngle);
        setVariance(currentVar);
        setSearchProgress((currentAngle / Math.PI) * 100);

        // Add to history every 5 degrees
        if (Math.floor((currentAngle * 180) / Math.PI) % 5 === 0) {
          setVarianceHistory(prev => [...prev, { angle: currentAngle, variance: currentVar }]);
        }
      },
      onComplete: (foundMaxAngle) => {
        setAngle(foundMaxAngle);
        setSearchProgress(100);
        setIsAnimating(false);
      }
    });
  };

  /**
   * Jump to solution
   */
  const jumpToSolution = () => {
    if (animationRef.current) {
      animationRef.current();
    }

    animate({
      from: angle,
      to: maxAngle,
      duration: 1000,
      easingFn: easing.easeInOutQuad,
      onUpdate: (value) => setAngle(value),
      onComplete: () => {
        setIsAnimating(false);
        setSearchProgress(100);
      }
    });
  };

  /**
   * Stop animation
   */
  const stopAnimation = () => {
    if (animationRef.current) {
      animationRef.current();
      animationRef.current = null;
    }
    setIsAnimating(false);
  };

  /**
   * Reset
   */
  const reset = () => {
    stopAnimation();
    setAngle(0);
    setVariance(0);
    setSearchProgress(0);
    setVarianceHistory([]);
  };

  return (
    <Box>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: '#f5f9ff', borderLeft: '4px solid #1976d2' }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#1976d2' }}>
          Lesson 2: Finding the Best Line
        </Typography>
        <Typography variant="body1" color="text.secondary">
          How do we systematically find the direction of maximum variance?
          Let's explore search strategies and discover the optimal solution.
        </Typography>
      </Paper>

      {/* Main content */}
      <Grid container spacing={3}>
        {/* Visualization */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Interactive Variance Search
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <canvas
                ref={canvasRef}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'crosshair'
                }}
              />
            </Box>

            {/* Controls */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Manual Angle Control: {(angle * 180 / Math.PI).toFixed(1)}°
              </Typography>
              <Slider
                value={angle}
                onChange={(e, val) => setAngle(val)}
                min={0}
                max={Math.PI}
                step={0.01}
                disabled={isAnimating}
                sx={{ mb: 2 }}
              />

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={isAnimating ? <PauseIcon /> : <PlayArrowIcon />}
                  onClick={isAnimating ? stopAnimation : runIncrementalSearch}
                  disabled={points.length === 0}
                >
                  {isAnimating ? 'Pause Search' : 'Start Search'}
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<TimelineIcon />}
                  onClick={jumpToSolution}
                  disabled={isAnimating || points.length === 0}
                >
                  Jump to Solution
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={reset}
                >
                  Reset
                </Button>
              </Box>

              {isAnimating && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Search Progress: {searchProgress.toFixed(0)}%
                  </Typography>
                  <Box
                    sx={{
                      width: '100%',
                      height: 8,
                      bgcolor: '#e0e0e0',
                      borderRadius: 4,
                      overflow: 'hidden'
                    }}
                  >
                    <Box
                      sx={{
                        width: `${searchProgress}%`,
                        height: '100%',
                        bgcolor: '#1976d2',
                        transition: 'width 0.1s'
                      }}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Controls and info */}
        <Grid item xs={12} md={4}>
          {/* Dataset selection */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Dataset
              </Typography>
              <ToggleButtonGroup
                value={dataset}
                exclusive
                onChange={(e, val) => val && setDataset(val)}
                size="small"
                fullWidth
                sx={{ mb: 2 }}
              >
                <ToggleButton value="correlated">Correlated</ToggleButton>
                <ToggleButton value="elliptical">Elliptical</ToggleButton>
                <ToggleButton value="circular">Circular</ToggleButton>
              </ToggleButtonGroup>

              <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setShowEllipse(!showEllipse)}
                >
                  {showEllipse ? 'Hide' : 'Show'} Ellipse
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  {showHistory ? 'Hide' : 'Show'} History
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Current metrics */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current State
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Angle
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#f44336' }}>
                  {(angle * 180 / Math.PI).toFixed(1)}°
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Variance
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#1976d2' }}>
                  {variance.toFixed(4)}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Maximum Variance
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#4caf50' }}>
                  {maxVariance.toFixed(4)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  at {(maxAngle * 180 / Math.PI).toFixed(1)}°
                </Typography>
              </Box>

              {variance > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={`${((variance / maxVariance) * 100).toFixed(1)}% of maximum`}
                    color={variance >= maxVariance * 0.95 ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Try this */}
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              💡 Try This
            </Typography>
            <Typography variant="body2">
              1. Manually adjust the angle slider
              <br />
              2. Run the incremental search
              <br />
              3. Try different datasets
              <br />
              4. Watch how the search explores all directions
            </Typography>
          </Alert>
        </Grid>
      </Grid>

      {/* Theory section */}
      <Paper elevation={2} sx={{ p: 3, mt: 3, bgcolor: '#fafafa' }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          📚 The Optimization Problem
        </Typography>

        <Typography variant="body1" paragraph>
          We want to find the direction <InlineMath math="\mathbf{u}" /> that maximizes variance:
        </Typography>

        <Box sx={{ my: 3, p: 2, bgcolor: '#fff', borderRadius: 1 }}>
          <BlockMath math="\text{maximize: } \quad \text{Var}(\mathbf{u}) = \frac{1}{n} \sum_{i=1}^{n} \left(\mathbf{x}_i \cdot \mathbf{u}\right)^2" />
          <BlockMath math="\text{subject to: } \quad \|\mathbf{u}\| = 1" />
        </Box>

        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          Search Strategies
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#f44336' }}>
                  1. Brute Force Search
                </Typography>
                <Typography variant="body2" paragraph>
                  Try many angles (0° to 180°) and pick the best.
                </Typography>
                <Typography variant="caption">
                  • Simple but slow: O(n × steps)
                  <br />• Approximate solution
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#4caf50' }}>
                  2. Eigendecomposition
                </Typography>
                <Typography variant="body2" paragraph>
                  Compute eigenvector of covariance matrix.
                </Typography>
                <Typography variant="caption">
                  • Fast: O(n) for 2D
                  <br />• Exact solution
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Key Insight:</strong> The direction of maximum variance is the eigenvector
            corresponding to the largest eigenvalue of the covariance matrix!
          </Typography>
        </Alert>
      </Paper>

      {/* Completion */}
      {onComplete && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button variant="contained" size="large" onClick={onComplete}>
            Complete Lesson 2
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default Lesson02_BestLine;
