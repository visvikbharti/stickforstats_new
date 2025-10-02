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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Chip,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Divider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import { MathJax } from 'better-react-mathjax';

// Import utilities
import {
  covarianceMatrix2D,
  mean,
  variance,
  covariance
} from '../utils/linearAlgebra';
import {
  generateCorrelated,
  generateCircular,
  generateRandom
} from '../utils/dataGenerators';

const Lesson03_CovarianceMatrix = () => {
  const theme = useTheme();

  // State
  const [datasetType, setDatasetType] = useState('correlated');
  const [correlation, setCorrelation] = useState(0.8);
  const [angleParam, setAngleParam] = useState(45); // For ellipse rotation
  const [points, setPoints] = useState([]);
  const [hoveredCell, setHoveredCell] = useState(null);

  // Canvas constants
  const CANVAS_WIDTH = 500;
  const CANVAS_HEIGHT = 500;
  const CENTER_X = CANVAS_WIDTH / 2;
  const CENTER_Y = CANVAS_HEIGHT / 2;
  const SCALE = 80;

  // Generate data based on type
  const generateData = useCallback(() => {
    let newPoints;

    switch (datasetType) {
      case 'correlated':
        newPoints = generateCorrelated(100, correlation, 0, 0, 1, 1);
        break;
      case 'circular':
        newPoints = generateCircular(100, 1.5);
        break;
      case 'random':
        newPoints = generateRandom(100, 0, 0, 1, 1);
        break;
      case 'diagonal':
        const angle = (angleParam * Math.PI) / 180;
        newPoints = generateCorrelated(100, 0.95, 0, 0, 1, 0.3);
        // Rotate points
        newPoints = newPoints.map(p => ({
          x: p.x * Math.cos(angle) - p.y * Math.sin(angle),
          y: p.x * Math.sin(angle) + p.y * Math.cos(angle)
        }));
        break;
      default:
        newPoints = generateCorrelated(100, 0.8, 0, 0, 1, 1);
    }

    setPoints(newPoints);
  }, [datasetType, correlation, angleParam]);

  useEffect(() => {
    generateData();
  }, [generateData]);

  // Calculate covariance matrix
  const covMatrix = useMemo(() => {
    if (points.length === 0) return { xx: 0, yy: 0, xy: 0 };
    return covarianceMatrix2D(points);
  }, [points]);

  // Calculate individual statistics
  const stats = useMemo(() => {
    if (points.length === 0) {
      return {
        meanX: 0, meanY: 0,
        varX: 0, varY: 0,
        covXY: 0,
        corrXY: 0
      };
    }

    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);

    const meanX = mean(xs);
    const meanY = mean(ys);
    const varX = variance(xs);
    const varY = variance(ys);
    const covXY = covariance(xs, ys);
    const corrXY = varX > 0 && varY > 0 ? covXY / Math.sqrt(varX * varY) : 0;

    return { meanX, meanY, varX, varY, covXY, corrXY };
  }, [points]);

  // Draw on canvas
  useEffect(() => {
    const canvas = document.getElementById('covariance-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw axes
    ctx.strokeStyle = theme.palette.mode === 'dark' ? '#666' : '#ccc';
    ctx.lineWidth = 1;

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

    // Draw grid
    ctx.strokeStyle = theme.palette.mode === 'dark' ? '#333' : '#eee';
    for (let i = -5; i <= 5; i++) {
      if (i === 0) continue;

      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(CENTER_X + i * SCALE, 0);
      ctx.lineTo(CENTER_X + i * SCALE, CANVAS_HEIGHT);
      ctx.stroke();

      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(0, CENTER_Y + i * SCALE);
      ctx.lineTo(CANVAS_WIDTH, CENTER_Y + i * SCALE);
      ctx.stroke();
    }

    // Draw mean point
    const meanX = stats.meanX * SCALE + CENTER_X;
    const meanY = CENTER_Y - stats.meanY * SCALE;

    ctx.fillStyle = theme.palette.error.main;
    ctx.beginPath();
    ctx.arc(meanX, meanY, 6, 0, 2 * Math.PI);
    ctx.fill();

    // Draw cross at mean
    ctx.strokeStyle = theme.palette.error.main;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(meanX - 10, meanY);
    ctx.lineTo(meanX + 10, meanY);
    ctx.moveTo(meanX, meanY - 10);
    ctx.lineTo(meanX, meanY + 10);
    ctx.stroke();

    // Draw deviation vectors if hovering
    if (hoveredCell === 'xx' || hoveredCell === 'yy' || hoveredCell === 'xy') {
      ctx.strokeStyle = theme.palette.primary.main;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;

      points.forEach(p => {
        const px = p.x * SCALE + CENTER_X;
        const py = CENTER_Y - p.y * SCALE;

        if (hoveredCell === 'xx') {
          // Show X deviations (horizontal lines from mean)
          ctx.beginPath();
          ctx.moveTo(meanX, py);
          ctx.lineTo(px, py);
          ctx.stroke();
        } else if (hoveredCell === 'yy') {
          // Show Y deviations (vertical lines from mean)
          ctx.beginPath();
          ctx.moveTo(px, meanY);
          ctx.lineTo(px, py);
          ctx.stroke();
        } else if (hoveredCell === 'xy') {
          // Show both deviations forming rectangles
          ctx.beginPath();
          ctx.moveTo(meanX, meanY);
          ctx.lineTo(px, meanY);
          ctx.lineTo(px, py);
          ctx.strokeStyle = theme.palette.secondary.main;
          ctx.stroke();
        }
      });

      ctx.globalAlpha = 1;
    }

    // Draw data points
    points.forEach(p => {
      const x = p.x * SCALE + CENTER_X;
      const y = CENTER_Y - p.y * SCALE;

      ctx.fillStyle = theme.palette.primary.main;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    ctx.globalAlpha = 1;

    // Draw axis labels
    ctx.fillStyle = theme.palette.text.primary;
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('X', CANVAS_WIDTH - 20, CENTER_Y - 10);
    ctx.fillText('Y', CENTER_X + 15, 20);

  }, [points, stats, theme, hoveredCell]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Title */}
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        Lesson 3: Covariance Matrix Unveiled
      </Typography>

      {/* Theory Section */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          📐 What is a Covariance Matrix?
        </Typography>

        <Typography paragraph>
          While variance measures spread along a single direction, <strong>covariance</strong> measures
          how two variables change <em>together</em>. The covariance matrix organizes these measurements
          into a compact mathematical structure.
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Key Insight:</strong> The covariance matrix is symmetric and contains all the
            information about how your data spreads and correlates in all directions.
          </Typography>
        </Alert>

        <MathJax>
          <Box sx={{ my: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body1" align="center">
              {`\\[
                \\text{Cov}(\\mathbf{X}) = \\begin{bmatrix}
                  \\text{Var}(X) & \\text{Cov}(X,Y) \\\\
                  \\text{Cov}(Y,X) & \\text{Var}(Y)
                \\end{bmatrix} = \\begin{bmatrix}
                  \\sigma_X^2 & \\sigma_{XY} \\\\
                  \\sigma_{XY} & \\sigma_Y^2
                \\end{bmatrix}
              \\]`}
            </Typography>
          </Box>
        </MathJax>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Diagonal Elements
                </Typography>
                <MathJax>
                  <Typography variant="body2">
                    {`\\(\\sigma_X^2\\) and \\(\\sigma_Y^2\\)`} are the <strong>variances</strong>
                    along X and Y axes.
                  </Typography>
                </MathJax>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="secondary" gutterBottom>
                  Off-Diagonal Elements
                </Typography>
                <MathJax>
                  <Typography variant="body2">
                    {`\\(\\sigma_{XY}\\)`} measures how X and Y <strong>co-vary</strong> together.
                  </Typography>
                </MathJax>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="success.main" gutterBottom>
                  Symmetry
                </Typography>
                <MathJax>
                  <Typography variant="body2">
                    {`\\(\\text{Cov}(X,Y) = \\text{Cov}(Y,X)\\)`} always, making the matrix symmetric.
                  </Typography>
                </MathJax>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Interactive Visualization */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Interactive Scatter Plot
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={generateData}
              >
                Regenerate
              </Button>
            </Box>

            <canvas
              id="covariance-canvas"
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              style={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '4px',
                display: 'block',
                margin: '0 auto'
              }}
            />

            <Typography variant="caption" display="block" textAlign="center" sx={{ mt: 1 }}>
              Red crosshair shows the mean (center) of the data
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Covariance Matrix
            </Typography>

            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{
                mb: 2,
                '& .MuiTableCell-root': {
                  fontSize: '1rem',
                  fontWeight: 500
                }
              }}
            >
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell></TableCell>
                    <TableCell align="center"><strong>X</strong></TableCell>
                    <TableCell align="center"><strong>Y</strong></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>X</strong></TableCell>
                    <TableCell
                      align="center"
                      onMouseEnter={() => setHoveredCell('xx')}
                      onMouseLeave={() => setHoveredCell(null)}
                      sx={{
                        bgcolor: hoveredCell === 'xx' ? 'primary.light' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <Chip
                        label={covMatrix.xx.toFixed(3)}
                        color="primary"
                        size="small"
                      />
                    </TableCell>
                    <TableCell
                      align="center"
                      onMouseEnter={() => setHoveredCell('xy')}
                      onMouseLeave={() => setHoveredCell(null)}
                      sx={{
                        bgcolor: hoveredCell === 'xy' ? 'secondary.light' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <Chip
                        label={covMatrix.xy.toFixed(3)}
                        color="secondary"
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Y</strong></TableCell>
                    <TableCell
                      align="center"
                      onMouseEnter={() => setHoveredCell('xy')}
                      onMouseLeave={() => setHoveredCell(null)}
                      sx={{
                        bgcolor: hoveredCell === 'xy' ? 'secondary.light' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <Chip
                        label={covMatrix.xy.toFixed(3)}
                        color="secondary"
                        size="small"
                      />
                    </TableCell>
                    <TableCell
                      align="center"
                      onMouseEnter={() => setHoveredCell('yy')}
                      onMouseLeave={() => setHoveredCell(null)}
                      sx={{
                        bgcolor: hoveredCell === 'yy' ? 'primary.light' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <Chip
                        label={covMatrix.yy.toFixed(3)}
                        color="primary"
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
              <Typography variant="caption">
                <strong>Hover over matrix cells</strong> to see what each element represents geometrically!
              </Typography>
            </Alert>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              Statistics:
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="body2">
                  Mean X: <strong>{stats.meanX.toFixed(3)}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  Mean Y: <strong>{stats.meanY.toFixed(3)}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  Var(X): <strong>{stats.varX.toFixed(3)}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  Var(Y): <strong>{stats.varY.toFixed(3)}</strong>
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2">
                  Correlation: <strong>{stats.corrXY.toFixed(3)}</strong>
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Controls */}
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          🎮 Dataset Controls
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography gutterBottom>Dataset Type:</Typography>
          <ToggleButtonGroup
            value={datasetType}
            exclusive
            onChange={(e, value) => value && setDatasetType(value)}
            size="small"
            fullWidth
          >
            <ToggleButton value="correlated">Correlated</ToggleButton>
            <ToggleButton value="circular">Circular</ToggleButton>
            <ToggleButton value="random">Random</ToggleButton>
            <ToggleButton value="diagonal">Diagonal</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {datasetType === 'correlated' && (
          <Box>
            <Typography gutterBottom>
              Correlation: {correlation.toFixed(2)}
            </Typography>
            <Slider
              value={correlation}
              onChange={(e, value) => setCorrelation(value)}
              min={-1}
              max={1}
              step={0.1}
              marks={[
                { value: -1, label: '-1' },
                { value: 0, label: '0' },
                { value: 1, label: '1' }
              ]}
            />
          </Box>
        )}

        {datasetType === 'diagonal' && (
          <Box>
            <Typography gutterBottom>
              Rotation Angle: {angleParam}°
            </Typography>
            <Slider
              value={angleParam}
              onChange={(e, value) => setAngleParam(value)}
              min={0}
              max={180}
              step={5}
              marks={[
                { value: 0, label: '0°' },
                { value: 45, label: '45°' },
                { value: 90, label: '90°' },
                { value: 135, label: '135°' },
                { value: 180, label: '180°' }
              ]}
            />
          </Box>
        )}
      </Paper>

      {/* Why This Matters */}
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          🎯 Connection to PCA
        </Typography>

        <Typography paragraph>
          The covariance matrix is <strong>the heart of PCA</strong>. Here's why:
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  📊 Captures All Relationships
                </Typography>
                <Typography variant="body2">
                  The covariance matrix contains complete information about how all variables
                  relate to each other. PCA uses this to find the directions of maximum variance.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="secondary" gutterBottom>
                  🔄 Enables Rotation
                </Typography>
                <Typography variant="body2">
                  By analyzing the covariance matrix (via eigendecomposition), PCA discovers
                  the optimal rotation that aligns axes with maximum variance directions.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Alert severity="success">
              <MathJax>
                <Typography variant="body2">
                  <strong>Next Lesson Preview:</strong> We'll decompose this covariance matrix
                  into eigenvalues and eigenvectors, revealing the principal components hidden within!
                </Typography>
              </MathJax>
            </Alert>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default Lesson03_CovarianceMatrix;
