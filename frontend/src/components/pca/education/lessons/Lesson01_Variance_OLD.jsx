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
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RefreshIcon from '@mui/icons-material/Refresh';
import { MathJax, MathJaxContext } from 'better-react-mathjax';

/**
 * Lesson 1: The Variance Intuition
 *
 * Core Concept: Variance measures "spread" along a direction
 *
 * Interactive Elements:
 * - Draggable data points in 2D
 * - Rotatable direction vector
 * - Real-time variance calculation
 * - Variance ellipse visualization
 * - Automatic search for maximum variance direction
 *
 * Learning Objectives:
 * 1. Understand variance as geometric spread
 * 2. See how variance depends on direction
 * 3. Discover that data has "natural" axes of variation
 * 4. Prepare for PCA as "finding these axes"
 */

const Lesson01_Variance = () => {
  // Canvas ref for visualization
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Data state
  const [points, setPoints] = useState([]);
  const [directionAngle, setDirectionAngle] = useState(0);
  const [variance, setVariance] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showEllipse, setShowEllipse] = useState(true);
  const [showProjections, setShowProjections] = useState(false);
  const [datasetType, setDatasetType] = useState('correlated'); // 'correlated', 'circular', 'custom'

  // Canvas dimensions
  const width = 600;
  const height = 500;
  const padding = 60;

  // Initialize data
  useEffect(() => {
    generateData(datasetType);
  }, [datasetType]);

  // Main rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    render(ctx);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [points, directionAngle, showEllipse, showProjections, variance]);

  /**
   * Generate synthetic data
   */
  const generateData = (type) => {
    const n = 50;
    const newPoints = [];

    if (type === 'correlated') {
      // Generate correlated 2D data
      for (let i = 0; i < n; i++) {
        const x = (Math.random() - 0.5) * 200 + width / 2;
        const noise = (Math.random() - 0.5) * 80;
        const y = 0.7 * (x - width / 2) + height / 2 + noise;
        newPoints.push({ x, y });
      }
    } else if (type === 'circular') {
      // Generate circular data (no preferred direction)
      for (let i = 0; i < n; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const radius = 80 + Math.random() * 40;
        newPoints.push({
          x: width / 2 + radius * Math.cos(angle),
          y: height / 2 + radius * Math.sin(angle)
        });
      }
    } else {
      // Custom/manual points
      for (let i = 0; i < n; i++) {
        newPoints.push({
          x: Math.random() * (width - 2 * padding) + padding,
          y: Math.random() * (height - 2 * padding) + padding
        });
      }
    }

    setPoints(newPoints);
    calculateVariance(newPoints, directionAngle);
  };

  /**
   * Calculate variance along direction
   */
  const calculateVariance = (pts, angle) => {
    if (pts.length === 0) return;

    // Direction vector
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);

    // Center points
    const meanX = pts.reduce((sum, p) => sum + p.x, 0) / pts.length;
    const meanY = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;

    // Project onto direction and calculate variance
    let sumSquares = 0;
    const projections = [];

    pts.forEach(p => {
      const cx = p.x - meanX;
      const cy = p.y - meanY;
      const projection = cx * ux + cy * uy;
      projections.push(projection);
      sumSquares += projection * projection;
    });

    const v = sumSquares / pts.length;
    setVariance(v);

    return { variance: v, projections, mean: { x: meanX, y: meanY } };
  };

  /**
   * Main rendering function
   */
  const render = (ctx) => {
    // Clear canvas
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    drawGrid(ctx);

    // Calculate statistics
    if (points.length === 0) return;

    const meanX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

    // Draw variance ellipse
    if (showEllipse) {
      drawVarianceEllipse(ctx, points, meanX, meanY);
    }

    // Draw direction vector
    drawDirectionVector(ctx, meanX, meanY, directionAngle);

    // Draw projections if enabled
    if (showProjections) {
      drawProjections(ctx, points, meanX, meanY, directionAngle);
    }

    // Draw data points
    drawPoints(ctx, points);

    // Draw mean point
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(meanX, meanY, 6, 0, 2 * Math.PI);
    ctx.fill();

    // Draw axes labels
    drawAxes(ctx);
  };

  /**
   * Draw background grid
   */
  const drawGrid = (ctx) => {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = padding; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = padding; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
  };

  /**
   * Draw data points
   */
  const drawPoints = (ctx, pts) => {
    ctx.fillStyle = '#2196F3';
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  /**
   * Draw direction vector
   */
  const drawDirectionVector = (ctx, cx, cy, angle) => {
    const length = 150;
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);

    // Draw line
    ctx.strokeStyle = '#FF9800';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - ux * length, cy - uy * length);
    ctx.lineTo(cx + ux * length, cy + uy * length);
    ctx.stroke();

    // Draw arrowhead
    const arrowSize = 12;
    const arrowAngle = 0.4;

    ctx.fillStyle = '#FF9800';
    ctx.beginPath();
    ctx.moveTo(cx + ux * length, cy + uy * length);
    ctx.lineTo(
      cx + ux * length - arrowSize * Math.cos(angle - arrowAngle),
      cy + uy * length - arrowSize * Math.sin(angle - arrowAngle)
    );
    ctx.lineTo(
      cx + ux * length - arrowSize * Math.cos(angle + arrowAngle),
      cy + uy * length - arrowSize * Math.sin(angle + arrowAngle)
    );
    ctx.closePath();
    ctx.fill();

    // Draw variance label
    ctx.fillStyle = '#FF9800';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(
      `Var = ${variance.toFixed(1)}`,
      cx + ux * (length + 30),
      cy + uy * (length + 30)
    );
  };

  /**
   * Draw variance ellipse (2 standard deviations)
   */
  const drawVarianceEllipse = (ctx, pts, cx, cy) => {
    // Calculate covariance matrix
    const n = pts.length;
    let cxx = 0, cyy = 0, cxy = 0;

    pts.forEach(p => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      cxx += dx * dx;
      cyy += dy * dy;
      cxy += dx * dy;
    });

    cxx /= n;
    cyy /= n;
    cxy /= n;

    // Eigenvalues (axes lengths)
    const trace = cxx + cyy;
    const det = cxx * cyy - cxy * cxy;
    const lambda1 = (trace + Math.sqrt(trace * trace - 4 * det)) / 2;
    const lambda2 = (trace - Math.sqrt(trace * trace - 4 * det)) / 2;

    // Eigenvector for lambda1
    let ex = 1;
    let ey = (lambda1 - cxx) / cxy;
    const len = Math.sqrt(ex * ex + ey * ey);
    ex /= len;
    ey /= len;
    const angle = Math.atan2(ey, ex);

    // Draw ellipse (2 std deviations = ~95% confidence)
    const a = Math.sqrt(lambda1) * 2;
    const b = Math.sqrt(lambda2) * 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.strokeStyle = 'rgba(76, 175, 80, 0.5)';
    ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, a, b, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  /**
   * Draw projections onto direction
   */
  const drawProjections = (ctx, pts, cx, cy, angle) => {
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);

    ctx.strokeStyle = 'rgba(244, 67, 54, 0.3)';
    ctx.lineWidth = 1;

    pts.forEach(p => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const proj = dx * ux + dy * uy;
      const px = cx + proj * ux;
      const py = cy + proj * uy;

      // Draw projection line
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(px, py);
      ctx.stroke();

      // Draw projected point
      ctx.fillStyle = 'rgba(244, 67, 54, 0.6)';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  /**
   * Draw axes labels
   */
  const drawAxes = (ctx) => {
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.fillText('X', width - 40, height - padding + 30);
    ctx.fillText('Y', padding - 30, 40);
  };

  /**
   * Handle angle slider change
   */
  const handleAngleChange = (event, newValue) => {
    const angle = (newValue / 180) * Math.PI;
    setDirectionAngle(angle);
    calculateVariance(points, angle);
  };

  /**
   * Animate: search for maximum variance
   */
  const animateSearch = () => {
    if (isAnimating) {
      setIsAnimating(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    setIsAnimating(true);
    let currentAngle = 0;
    const speed = 0.02;
    let maxVariance = 0;
    let maxAngle = 0;

    const animate = () => {
      currentAngle += speed;
      setDirectionAngle(currentAngle);
      const result = calculateVariance(points, currentAngle);

      if (result.variance > maxVariance) {
        maxVariance = result.variance;
        maxAngle = currentAngle;
      }

      if (currentAngle < Math.PI) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Lock to maximum variance direction
        setDirectionAngle(maxAngle);
        calculateVariance(points, maxAngle);
        setIsAnimating(false);
      }
    };

    animate();
  };

  /**
   * Reset to default state
   */
  const handleReset = () => {
    setDirectionAngle(0);
    generateData(datasetType);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      setIsAnimating(false);
    }
  };

  return (
    <MathJaxContext>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#1976d2' }}>
          Lesson 1: The Variance Intuition
        </Typography>

        <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.8 }}>
          <strong>Core Question:</strong> What does "variance" mean geometrically?
        </Typography>

        <Typography variant="body1" paragraph sx={{ color: '#555' }}>
          Variance measures how "spread out" data is. But spread out <em>in which direction</em>?
          The key insight: variance depends on the direction we're looking from!
        </Typography>

        <Grid container spacing={3}>
          {/* Canvas visualization */}
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <canvas
                ref={canvasRef}
                width={width}
                height={height}
                style={{
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  cursor: 'crosshair'
                }}
              />

              {/* Controls */}
              <Box sx={{ mt: 2 }}>
                <Typography gutterBottom sx={{ fontWeight: 500 }}>
                  Direction Angle: {(directionAngle * 180 / Math.PI).toFixed(1)}°
                </Typography>
                <Slider
                  value={directionAngle * 180 / Math.PI}
                  onChange={handleAngleChange}
                  min={0}
                  max={180}
                  step={1}
                  marks={[
                    { value: 0, label: '0°' },
                    { value: 45, label: '45°' },
                    { value: 90, label: '90°' },
                    { value: 135, label: '135°' },
                    { value: 180, label: '180°' }
                  ]}
                  disabled={isAnimating}
                  sx={{ mt: 1 }}
                />

                <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    startIcon={isAnimating ? <PauseIcon /> : <PlayArrowIcon />}
                    onClick={animateSearch}
                    color={isAnimating ? 'secondary' : 'primary'}
                  >
                    {isAnimating ? 'Stop' : 'Find Max Variance'}
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={handleReset}
                    disabled={isAnimating}
                  >
                    Reset
                  </Button>

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

                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                    Dataset Type:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant={datasetType === 'correlated' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setDatasetType('correlated')}
                    >
                      Correlated
                    </Button>
                    <Button
                      variant={datasetType === 'circular' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setDatasetType('circular')}
                    >
                      Circular
                    </Button>
                    <Button
                      variant={datasetType === 'custom' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setDatasetType('custom')}
                    >
                      Random
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Explanation panel */}
          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 2, bgcolor: '#e3f2fd' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
                  🎯 Key Insight
                </Typography>
                <Typography variant="body2" paragraph>
                  The <strong style={{ color: '#FF9800' }}>orange line</strong> shows a direction through the data.
                </Typography>
                <Typography variant="body2" paragraph>
                  The <strong>variance value</strong> measures how spread out the data is <em>along that direction</em>.
                </Typography>
                <Typography variant="body2">
                  Try rotating the line! Notice how variance changes.
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📊 Current Variance
                </Typography>
                <Box
                  sx={{
                    bgcolor: '#FF9800',
                    color: 'white',
                    p: 2,
                    borderRadius: 2,
                    textAlign: 'center',
                    fontSize: '2rem',
                    fontWeight: 'bold'
                  }}
                >
                  {variance.toFixed(2)}
                </Box>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📐 Mathematical Definition
                </Typography>
                <Typography variant="body2" paragraph>
                  Variance along direction <MathJax inline>{"\\(\\mathbf{u}\\)"}</MathJax>:
                </Typography>
                <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, overflow: 'auto' }}>
                  <MathJax>
                    {"\\[\\text{Var}(\\mathbf{u}) = \\frac{1}{n}\\sum_{i=1}^n (\\mathbf{x}_i \\cdot \\mathbf{u})^2\\]"}
                  </MathJax>
                </Box>
                <Typography variant="body2" sx={{ mt: 2, color: '#666' }}>
                  where <MathJax inline>{"\\(\\mathbf{x}_i \\cdot \\mathbf{u}\\)"}</MathJax> is the
                  projection of point <MathJax inline>{"\\(\\mathbf{x}_i\\)"}</MathJax> onto direction{' '}
                  <MathJax inline>{"\\(\\mathbf{u}\\)"}</MathJax>.
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ mt: 2, bgcolor: '#fff3e0' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#F57C00' }}>
                  💡 Try This
                </Typography>
                <Typography variant="body2" paragraph>
                  1. Click "Find Max Variance" to watch the algorithm search
                </Typography>
                <Typography variant="body2" paragraph>
                  2. Switch to "Circular" data - what do you notice about the variance?
                </Typography>
                <Typography variant="body2">
                  3. Enable "Show Projections" to see how points map onto the line
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Next steps */}
        <Paper elevation={2} sx={{ p: 3, mt: 4, bgcolor: '#f5f5f5' }}>
          <Typography variant="h6" gutterBottom>
            🎓 What You've Learned
          </Typography>
          <Typography variant="body1" paragraph>
            • Variance is <strong>direction-dependent</strong> - it measures spread along a specific axis
          </Typography>
          <Typography variant="body1" paragraph>
            • The <strong style={{ color: '#4CAF50' }}>green ellipse</strong> shows variance in all directions simultaneously
          </Typography>
          <Typography variant="body1" paragraph>
            • Some directions have more variance than others - this is the core idea behind PCA!
          </Typography>
          <Typography variant="body1" sx={{ mt: 2, color: '#1976d2', fontWeight: 500 }}>
            → Next Lesson: Finding the direction of <em>maximum</em> variance
          </Typography>
        </Paper>
      </Box>
    </MathJaxContext>
  );
};

export default Lesson01_Variance;
