import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Slider,
  Button,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Switch,
  FormControlLabel,
  ToggleButtonGroup,
  ToggleButton,
  Alert
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RefreshIcon from '@mui/icons-material/Refresh';
import { MathJax, MathJaxContext } from 'better-react-mathjax';

// Import utilities (DRY principle)
import {
  generateCorrelated,
  generateCircular,
  generateRandom,
  covarianceMatrix2D,
  eigendecomposition2D,
  varianceAlongDirection
} from '../utils';
import { animateVarianceSearch } from '../utils/animations';

/**
 * Lesson 1: The Variance Intuition (REFACTORED)
 *
 * Now using shared utilities for:
 * - Data generation
 * - Mathematical calculations
 * - Animation management
 *
 * Reduced from 651 lines to ~420 lines (35% reduction)
 */

const Lesson01_Variance = ({ onComplete }) => {
  // Refs
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // State
  const [points, setPoints] = useState([]);
  const [directionAngle, setDirectionAngle] = useState(0);
  const [variance, setVariance] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showEllipse, setShowEllipse] = useState(true);
  const [showProjections, setShowProjections] = useState(false);
  const [datasetType, setDatasetType] = useState('correlated');

  // Canvas dimensions
  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 500;
  const PADDING = 60;
  const SCALE = 40;
  const CENTER_X = CANVAS_WIDTH / 2;
  const CENTER_Y = CANVAS_HEIGHT / 2;

  /**
   * Generate dataset using utilities
   */
  useEffect(() => {
    let dataPoints = [];

    switch (datasetType) {
      case 'correlated':
        dataPoints = generateCorrelated(50, 0.8);
        break;
      case 'circular':
        dataPoints = generateCircular(50);
        break;
      case 'random':
        dataPoints = generateRandom(50);
        break;
      default:
        dataPoints = generateCorrelated(50, 0.8);
    }

    // Scale to canvas
    const scaledPoints = dataPoints.map(p => ({
      x: CENTER_X + p.x * SCALE,
      y: CENTER_Y - p.y * SCALE
    }));

    setPoints(scaledPoints);
    setDirectionAngle(0);
  }, [datasetType]);

  /**
   * Calculate variance using utility
   */
  useEffect(() => {
    if (points.length === 0) return;

    // Convert canvas points to data space
    const dataPoints = points.map(p => ({
      x: (p.x - CENTER_X) / SCALE,
      y: (CENTER_Y - p.y) / SCALE
    }));

    const result = varianceAlongDirection(dataPoints, directionAngle);
    setVariance(result.variance);
  }, [directionAngle, points]);

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
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let x = PADDING; x < CANVAS_WIDTH; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, PADDING);
      ctx.lineTo(x, CANVAS_HEIGHT - PADDING);
      ctx.stroke();
    }
    for (let y = PADDING; y < CANVAS_HEIGHT; y += 50) {
      ctx.beginPath();
      ctx.moveTo(PADDING, y);
      ctx.lineTo(CANVAS_WIDTH - PADDING, y);
      ctx.stroke();
    }

    // Calculate center
    const meanX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

    // Draw variance ellipse using utility
    if (showEllipse) {
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
      ctx.translate(meanX, meanY);
      ctx.rotate(-ellipseAngle);
      ctx.strokeStyle = 'rgba(76, 175, 80, 0.5)';
      ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, a, b, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Draw direction vector
    const length = 150;
    const ux = Math.cos(directionAngle);
    const uy = -Math.sin(directionAngle); // Flip for canvas coords

    ctx.strokeStyle = '#FF9800';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(meanX - ux * length, meanY - uy * length);
    ctx.lineTo(meanX + ux * length, meanY + uy * length);
    ctx.stroke();

    // Arrowhead
    const arrowSize = 12;
    const arrowAngle = 0.4;
    ctx.fillStyle = '#FF9800';
    ctx.beginPath();
    ctx.moveTo(meanX + ux * length, meanY + uy * length);
    ctx.lineTo(
      meanX + ux * length - arrowSize * Math.cos(directionAngle - arrowAngle),
      meanY + uy * length + arrowSize * Math.sin(directionAngle - arrowAngle)
    );
    ctx.lineTo(
      meanX + ux * length - arrowSize * Math.cos(directionAngle + arrowAngle),
      meanY + uy * length + arrowSize * Math.sin(directionAngle + arrowAngle)
    );
    ctx.closePath();
    ctx.fill();

    // Draw projections
    if (showProjections) {
      ctx.strokeStyle = 'rgba(244, 67, 54, 0.3)';
      ctx.lineWidth = 1;

      points.forEach(p => {
        const dx = p.x - meanX;
        const dy = p.y - meanY;
        const proj = dx * ux + dy * uy;
        const px = meanX + proj * ux;
        const py = meanY + proj * uy;

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(px, py);
        ctx.stroke();

        ctx.fillStyle = 'rgba(244, 67, 54, 0.6)';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    // Draw points
    points.forEach(point => {
      ctx.fillStyle = '#2196F3';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });

    // Draw mean
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(meanX, meanY, 6, 0, 2 * Math.PI);
    ctx.fill();

    // Variance label
    ctx.fillStyle = '#FF9800';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(
      `Variance = ${variance.toFixed(1)}`,
      meanX + ux * (length + 40),
      meanY + uy * (length + 40)
    );

  }, [points, directionAngle, showEllipse, showProjections, variance]);

  /**
   * Animate variance search using utility
   */
  const animateSearch = () => {
    if (points.length === 0) return;

    setIsAnimating(true);

    const dataPoints = points.map(p => ({
      x: (p.x - CENTER_X) / SCALE,
      y: (CENTER_Y - p.y) / SCALE
    }));

    animationRef.current = animateVarianceSearch({
      fromAngle: 0,
      toAngle: Math.PI,
      duration: 3000,
      calculateVariance: (angle) => {
        const result = varianceAlongDirection(dataPoints, angle);
        return result.variance;
      },
      onUpdate: (angle) => {
        setDirectionAngle(angle);
      },
      onComplete: (maxAngle) => {
        setDirectionAngle(maxAngle);
        setIsAnimating(false);
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
    setDirectionAngle(0);
    setVariance(0);
  };

  return (
    <MathJaxContext>
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
        {/* Header */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: '#e3f2fd', borderLeft: '4px solid #1976d2' }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#1976d2' }}>
            Lesson 1: The Variance Intuition
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Explore how variance measures spread along a direction. Interact with data to
            build geometric intuition for Principal Component Analysis.
          </Typography>
        </Paper>

        <Grid container spacing={3}>
          {/* Visualization */}
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Interactive Visualization
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
                  Direction: {(directionAngle * 180 / Math.PI).toFixed(1)}°
                </Typography>
                <Slider
                  value={directionAngle}
                  onChange={(e, val) => setDirectionAngle(val)}
                  min={0}
                  max={Math.PI}
                  step={0.01}
                  disabled={isAnimating}
                  sx={{ mb: 2 }}
                />

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={isAnimating ? <PauseIcon /> : <PlayArrowIcon />}
                    onClick={isAnimating ? stopAnimation : animateSearch}
                  >
                    {isAnimating ? 'Stop' : 'Find Maximum'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={reset}
                  >
                    Reset
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showEllipse}
                        onChange={(e) => setShowEllipse(e.target.checked)}
                      />
                    }
                    label="Show Ellipse"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showProjections}
                        onChange={(e) => setShowProjections(e.target.checked)}
                      />
                    }
                    label="Show Projections"
                  />
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Info panel */}
          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Dataset
                </Typography>
                <ToggleButtonGroup
                  value={datasetType}
                  exclusive
                  onChange={(e, val) => val && setDatasetType(val)}
                  size="small"
                  fullWidth
                >
                  <ToggleButton value="correlated">Correlated</ToggleButton>
                  <ToggleButton value="circular">Circular</ToggleButton>
                  <ToggleButton value="random">Random</ToggleButton>
                </ToggleButtonGroup>
              </CardContent>
            </Card>

            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Current Variance
                </Typography>
                <Typography variant="h3" sx={{ color: '#1976d2', fontWeight: 600 }}>
                  {variance.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>

            <Alert severity="info">
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                💡 Try This
              </Typography>
              <Typography variant="body2">
                • Rotate the direction manually
                <br />• Click "Find Maximum" to search
                <br />• Try different datasets
                <br />• Enable projections to see how points map to the line
              </Typography>
            </Alert>
          </Grid>
        </Grid>

        {/* Theory section */}
        <Paper elevation={2} sx={{ p: 3, mt: 3, bgcolor: '#fafafa' }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            📐 The Mathematics
          </Typography>

          <Typography variant="body1" paragraph>
            Variance along a direction <MathJax inline>{"\\(\\mathbf{u}\\)"}</MathJax> is:
          </Typography>

          <Box sx={{ my: 2, p: 2, bgcolor: '#fff', borderRadius: 1 }}>
            <MathJax>
              {
                "\\[\\text{Var}(\\mathbf{u}) = \\frac{1}{n} \\sum_{i=1}^{n} \\left(\\mathbf{x}_i \\cdot \\mathbf{u}\\right)^2\\]"
              }
            </MathJax>
          </Box>

          <Typography variant="body1" paragraph>
            Where <MathJax inline>{"\\(\\mathbf{x}_i\\)"}</MathJax> are centered data points
            and <MathJax inline>{"\\(\\mathbf{u}\\)"}</MathJax> is a unit vector.
          </Typography>

          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Key Insight:</strong> The ellipse shows the "natural shape" of the data.
              Its major axis points in the direction of maximum variance—this is the first
              principal component!
            </Typography>
          </Alert>
        </Paper>

        {/* Completion button */}
        {onComplete && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button variant="contained" size="large" onClick={onComplete}>
              Complete Lesson 1
            </Button>
          </Box>
        )}
      </Box>
    </MathJaxContext>
  );
};

export default Lesson01_Variance;
