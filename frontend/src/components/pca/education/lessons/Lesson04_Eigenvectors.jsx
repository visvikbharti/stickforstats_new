import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Slider,
  Button,
  Card,
  CardContent,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RefreshIcon from '@mui/icons-material/Refresh';
import { MathJax } from 'better-react-mathjax';

// Import utilities
import {
  eigendecomposition2D,
  covarianceMatrix2D,
  matrixVectorMultiply,
  normalize,
  magnitude
} from '../utils/linearAlgebra';
import {
  generateCorrelated
} from '../utils/dataGenerators';

const Lesson04_Eigenvectors = () => {
  const theme = useTheme();

  // State
  const [mode, setMode] = useState('exploration'); // 'exploration' or 'covariance'
  const [a, setA] = useState(2); // Matrix elements
  const [b, setB] = useState(0.5);
  const [c, setC] = useState(0.5);
  const [d, setD] = useState(1);
  const [selectedVector, setSelectedVector] = useState(null);
  const [showAllVectors, setShowAllVectors] = useState(true);
  const [animating, setAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);

  // Covariance mode
  const [correlation, setCorrelation] = useState(0.8);
  const [points, setPoints] = useState([]);

  // Canvas constants
  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 600;
  const CENTER_X = CANVAS_WIDTH / 2;
  const CENTER_Y = CANVAS_HEIGHT / 2;
  const SCALE = 60;

  // Generate data for covariance mode
  const generateData = useCallback(() => {
    const newPoints = generateCorrelated(50, correlation, 0, 0, 1.5, 1);
    setPoints(newPoints);
  }, [correlation]);

  useEffect(() => {
    if (mode === 'covariance') {
      generateData();
    }
  }, [mode, generateData]);

  // Calculate eigendecomposition
  const eigen = useMemo(() => {
    if (mode === 'exploration') {
      const matrix = { xx: a, xy: b, yx: c, yy: d };
      // Construct symmetric matrix for eigendecomposition
      const symMatrix = {
        xx: (a + a) / 2,
        yy: (d + d) / 2,
        xy: (b + c) / 2
      };
      return eigendecomposition2D(symMatrix);
    } else {
      // Covariance mode
      if (points.length === 0) return null;
      const cov = covarianceMatrix2D(points);
      return eigendecomposition2D(cov);
    }
  }, [mode, a, b, c, d, points]);

  // Generate test vectors in a circle
  const testVectors = useMemo(() => {
    const vectors = [];
    const numVectors = 24;
    for (let i = 0; i < numVectors; i++) {
      const angle = (i / numVectors) * 2 * Math.PI;
      vectors.push({
        x: Math.cos(angle),
        y: Math.sin(angle)
      });
    }
    return vectors;
  }, []);

  // Animation
  useEffect(() => {
    if (!animating) return;

    const interval = setInterval(() => {
      setAnimationProgress(prev => {
        if (prev >= 1) {
          setAnimating(false);
          return 1;
        }
        return prev + 0.02;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [animating]);

  const handleStartAnimation = () => {
    setAnimationProgress(0);
    setAnimating(true);
  };

  const handleResetAnimation = () => {
    setAnimationProgress(0);
    setAnimating(false);
  };

  // Drawing
  useEffect(() => {
    const canvas = document.getElementById('eigenvector-canvas');
    if (!canvas || !eigen) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = theme.palette.mode === 'dark' ? '#333' : '#eee';
    ctx.lineWidth = 1;

    for (let i = -10; i <= 10; i++) {
      if (i === 0) continue;
      // Vertical
      ctx.beginPath();
      ctx.moveTo(CENTER_X + i * SCALE, 0);
      ctx.lineTo(CENTER_X + i * SCALE, CANVAS_HEIGHT);
      ctx.stroke();
      // Horizontal
      ctx.beginPath();
      ctx.moveTo(0, CENTER_Y + i * SCALE);
      ctx.lineTo(CANVAS_WIDTH, CENTER_Y + i * SCALE);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = theme.palette.mode === 'dark' ? '#666' : '#ccc';
    ctx.lineWidth = 2;

    // X-axis
    ctx.beginPath();
    ctx.moveTo(0, CENTER_Y);
    ctx.lineTo(CANVAS_WIDTH, CENTER_Y);
    ctx.stroke();

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(CENTER_X, 0);
    ctx.lineTo(CENTER_X, CANVAS_HEIGHT);
    ctx.stroke();

    // Draw covariance data if in that mode
    if (mode === 'covariance' && points.length > 0) {
      points.forEach(p => {
        const px = p.x * SCALE + CENTER_X;
        const py = CENTER_Y - p.y * SCALE;

        ctx.fillStyle = theme.palette.primary.main;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    // Helper function to draw vector
    const drawVector = (v, color, lineWidth = 2, label = '') => {
      const x = v.x * SCALE + CENTER_X;
      const y = CENTER_Y - v.y * SCALE;

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = lineWidth;

      // Arrow line
      ctx.beginPath();
      ctx.moveTo(CENTER_X, CENTER_Y);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Arrow head
      const angle = Math.atan2(-v.y, v.x);
      const headLen = 10;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x - headLen * Math.cos(angle - Math.PI / 6),
        y + headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        x - headLen * Math.cos(angle + Math.PI / 6),
        y + headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      // Label
      if (label) {
        ctx.fillStyle = theme.palette.text.primary;
        ctx.font = 'bold 14px Arial';
        ctx.fillText(label, x + 15, y - 15);
      }
    };

    // Draw test vectors and their transformations
    if (showAllVectors) {
      testVectors.forEach((v, idx) => {
        // Original vector (before transformation)
        const t = animationProgress;

        // Interpolate between original and transformed
        let transformed;
        if (mode === 'exploration') {
          const matrix = { xx: a, xy: b, yx: c, yy: d };
          transformed = matrixVectorMultiply(matrix, v);
        } else {
          // For covariance, just show the vectors
          transformed = v;
        }

        const current = {
          x: v.x * (1 - t) + transformed.x * t,
          y: v.y * (1 - t) + transformed.y * t
        };

        // Check if this is close to an eigenvector
        const isEigen1 = Math.abs(Math.abs(v.x * eigen.v1.x + v.y * eigen.v1.y) - 1) < 0.05;
        const isEigen2 = Math.abs(Math.abs(v.x * eigen.v2.x + v.y * eigen.v2.y) - 1) < 0.05;

        const color = isEigen1 || isEigen2
          ? theme.palette.success.main
          : theme.palette.grey[400];

        const lineWidth = isEigen1 || isEigen2 ? 3 : 1;

        ctx.globalAlpha = 0.6;
        drawVector(current, color, lineWidth);
        ctx.globalAlpha = 1;
      });
    }

    // Draw eigenvectors (always visible)
    const eigen1Scaled = {
      x: eigen.v1.x * 2,
      y: eigen.v1.y * 2
    };
    const eigen2Scaled = {
      x: eigen.v2.x * 2,
      y: eigen.v2.y * 2
    };

    drawVector(eigen1Scaled, theme.palette.error.main, 4, `λ₁=${eigen.lambda1.toFixed(2)}`);
    drawVector(eigen2Scaled, theme.palette.secondary.main, 4, `λ₂=${eigen.lambda2.toFixed(2)}`);

    // Draw negative directions
    drawVector({ x: -eigen1Scaled.x, y: -eigen1Scaled.y }, theme.palette.error.main, 4);
    drawVector({ x: -eigen2Scaled.x, y: -eigen2Scaled.y }, theme.palette.secondary.main, 4);

    // Draw selected vector if any
    if (selectedVector) {
      let transformed;
      if (mode === 'exploration') {
        const matrix = { xx: a, xy: b, yx: c, yy: d };
        transformed = matrixVectorMultiply(matrix, selectedVector);
      } else {
        transformed = selectedVector;
      }

      drawVector(selectedVector, theme.palette.info.main, 3);

      if (animationProgress > 0) {
        drawVector(transformed, theme.palette.warning.main, 3);
      }
    }

    // Labels
    ctx.fillStyle = theme.palette.text.primary;
    ctx.font = '14px Arial';
    ctx.fillText('X', CANVAS_WIDTH - 30, CENTER_Y - 10);
    ctx.fillText('Y', CENTER_X + 10, 25);

  }, [theme, eigen, testVectors, showAllVectors, mode, a, b, c, d, points, animationProgress, selectedVector]);

  const handleCanvasClick = (e) => {
    const canvas = document.getElementById('eigenvector-canvas');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to data coordinates
    const dataX = (x - CENTER_X) / SCALE;
    const dataY = (CENTER_Y - y) / SCALE;

    // Normalize to unit vector
    const mag = Math.sqrt(dataX * dataX + dataY * dataY);
    if (mag > 0.1) {
      setSelectedVector({
        x: dataX / mag,
        y: dataY / mag
      });
      setAnimationProgress(0);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Title */}
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        Lesson 4: Eigenvectors as Special Directions
      </Typography>

      {/* Theory Section */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          🔄 The Magic of Eigenvectors
        </Typography>

        <Typography paragraph>
          Imagine a matrix as a <strong>transformation machine</strong> that stretches, rotates, and skews space.
          When you feed a vector into this machine, it usually comes out pointing in a completely different direction.
        </Typography>

        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>But eigenvectors are special!</strong> When you transform an eigenvector through a matrix,
            it comes out pointing in the <em>exact same direction</em> (or opposite direction). It only gets
            stretched or compressed by a scaling factor called the <strong>eigenvalue</strong>.
          </Typography>
        </Alert>

        <MathJax>
          <Box sx={{ my: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body1" align="center">
              {`\\[
                A\\mathbf{v} = \\lambda \\mathbf{v}
              \\]`}
            </Typography>
            <Typography variant="caption" display="block" align="center" sx={{ mt: 1 }}>
              Matrix A transforms eigenvector v into λ times itself (same direction!)
            </Typography>
          </Box>
        </MathJax>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  Regular Vectors
                </Typography>
                <Typography variant="body2">
                  Change direction AND magnitude when transformed by a matrix.
                  They rotate, skew, and move unpredictably.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="success.main" gutterBottom>
                  Eigenvectors ⭐
                </Typography>
                <Typography variant="body2">
                  Only change magnitude, NOT direction. They lie along the "stable axes" of the transformation.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Interactive Visualization */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Interactive Transformation
              </Typography>
              <Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={animating ? <PauseIcon /> : <PlayArrowIcon />}
                  onClick={animating ? () => setAnimating(false) : handleStartAnimation}
                  sx={{ mr: 1 }}
                >
                  {animating ? 'Pause' : 'Animate'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={handleResetAnimation}
                >
                  Reset
                </Button>
              </Box>
            </Box>

            <canvas
              id="eigenvector-canvas"
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onClick={handleCanvasClick}
              style={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '4px',
                display: 'block',
                margin: '0 auto',
                cursor: 'crosshair'
              }}
            />

            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" display="block" textAlign="center">
                <strong>Click anywhere</strong> to test a vector • <span style={{ color: theme.palette.error.main }}>●</span> Principal Eigenvector
                • <span style={{ color: theme.palette.secondary.main }}>●</span> Secondary Eigenvector
              </Typography>
            </Box>

            {animationProgress > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Watch how most vectors <strong>rotate</strong> during transformation,
                  but eigenvectors only <strong>stretch/compress</strong> along their line!
                </Typography>
              </Alert>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Mode
            </Typography>

            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(e, value) => value && setMode(value)}
              size="small"
              fullWidth
              sx={{ mb: 2 }}
            >
              <ToggleButton value="exploration">Explore Matrix</ToggleButton>
              <ToggleButton value="covariance">Data Covariance</ToggleButton>
            </ToggleButtonGroup>

            {mode === 'exploration' ? (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Matrix Elements:
                </Typography>

                <MathJax>
                  <Typography variant="body2" align="center" sx={{ mb: 2 }}>
                    {`\\[A = \\begin{bmatrix} ${a.toFixed(1)} & ${b.toFixed(1)} \\\\ ${c.toFixed(1)} & ${d.toFixed(1)} \\end{bmatrix}\\]`}
                  </Typography>
                </MathJax>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption">a (top-left): {a.toFixed(1)}</Typography>
                  <Slider value={a} onChange={(e, v) => setA(v)} min={-3} max={3} step={0.1} />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption">b (top-right): {b.toFixed(1)}</Typography>
                  <Slider value={b} onChange={(e, v) => setB(v)} min={-3} max={3} step={0.1} />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption">c (bottom-left): {c.toFixed(1)}</Typography>
                  <Slider value={c} onChange={(e, v) => setC(v)} min={-3} max={3} step={0.1} />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption">d (bottom-right): {d.toFixed(1)}</Typography>
                  <Slider value={d} onChange={(e, v) => setD(v)} min={-3} max={3} step={0.1} />
                </Box>
              </Box>
            ) : (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Data Correlation:
                </Typography>

                <Slider
                  value={correlation}
                  onChange={(e, v) => setCorrelation(v)}
                  min={-1}
                  max={1}
                  step={0.1}
                  marks={[
                    { value: -1, label: '-1' },
                    { value: 0, label: '0' },
                    { value: 1, label: '1' }
                  ]}
                />

                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={generateData}
                  sx={{ mt: 2 }}
                >
                  Regenerate Data
                </Button>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <FormControlLabel
              control={
                <Switch
                  checked={showAllVectors}
                  onChange={(e) => setShowAllVectors(e.target.checked)}
                />
              }
              label="Show test vectors"
            />
          </Paper>

          {eigen && (
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Eigenvalues:
              </Typography>
              <Box sx={{ mb: 1 }}>
                <Chip
                  label={`λ₁ = ${eigen.lambda1.toFixed(3)}`}
                  color="error"
                  size="small"
                  sx={{ mr: 1, mb: 0.5 }}
                />
                <Chip
                  label={`λ₂ = ${eigen.lambda2.toFixed(3)}`}
                  color="secondary"
                  size="small"
                  sx={{ mb: 0.5 }}
                />
              </Box>

              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Eigenvectors are scaled by these factors when transformed.
              </Typography>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle2" gutterBottom>
                Eigenvectors:
              </Typography>
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" display="block" color="error">
                  v₁ = [{eigen.v1.x.toFixed(3)}, {eigen.v1.y.toFixed(3)}]
                </Typography>
                <Typography variant="caption" display="block" color="secondary">
                  v₂ = [{eigen.v2.x.toFixed(3)}, {eigen.v2.y.toFixed(3)}]
                </Typography>
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  <strong>Live Update:</strong> Change the matrix sliders above to see how eigenvalues and eigenvectors change in real-time!
                </Typography>
              </Alert>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Connection to PCA */}
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          🎯 Connection to PCA
        </Typography>

        <Typography paragraph>
          Now here's the breakthrough: The <strong>covariance matrix of your data</strong> is also a matrix!
          Its eigenvectors point in the directions of maximum and minimum variance.
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%', bgcolor: 'error.50' }}>
              <CardContent>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  First Principal Component
                </Typography>
                <Typography variant="body2">
                  The eigenvector with the <strong>largest eigenvalue</strong> points in the direction
                  of maximum variance. This becomes PC1!
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%', bgcolor: 'secondary.50' }}>
              <CardContent>
                <Typography variant="subtitle2" color="secondary" gutterBottom>
                  Second Principal Component
                </Typography>
                <Typography variant="body2">
                  The eigenvector with the <strong>smaller eigenvalue</strong>, orthogonal to PC1,
                  captures the remaining variance. This becomes PC2!
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Alert severity="success">
              <MathJax>
                <Typography variant="body2">
                  <strong>Key Insight:</strong> PCA finds the eigendecomposition of the covariance matrix.
                  The eigenvectors become the principal components, and the eigenvalues tell you how much
                  variance each component captures!
                </Typography>
              </MathJax>
            </Alert>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Try This:
          </Typography>
          <Typography variant="body2">
            1. Switch to "Data Covariance" mode above<br />
            2. Adjust correlation slider and regenerate data<br />
            3. Watch how the eigenvectors (principal components) rotate to align with data spread!
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default Lesson04_Eigenvectors;
