import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  Divider,
  LinearProgress,
  Slider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { MathJax } from 'better-react-mathjax';

// Import utilities
import {
  eigendecomposition2D,
  covarianceMatrix2D,
  mean,
  normalize
} from '../utils/linearAlgebra';
import {
  generateCorrelated
} from '../utils/dataGenerators';

const Lesson05_Eigendecomposition = () => {
  const theme = useTheme();

  // State
  const [activeStep, setActiveStep] = useState(0);
  const [correlation, setCorrelation] = useState(0.75);
  const [points, setPoints] = useState([]);
  const [animating, setAnimating] = useState(false);
  const [powerIterationStep, setPowerIterationStep] = useState(0);
  const [currentVector, setCurrentVector] = useState({ x: 1, y: 0 });

  // Canvas constants
  const CANVAS_WIDTH = 500;
  const CANVAS_HEIGHT = 500;
  const CENTER_X = CANVAS_WIDTH / 2;
  const CENTER_Y = CANVAS_HEIGHT / 2;
  const SCALE = 80;

  // Generate data
  const generateData = useCallback(() => {
    const newPoints = generateCorrelated(60, correlation, 0, 0, 1.5, 1);
    setPoints(newPoints);
    setPowerIterationStep(0);
    setCurrentVector({ x: 1, y: 0 });
  }, [correlation]);

  useEffect(() => {
    generateData();
  }, [generateData]);

  // Calculate covariance and eigendecomposition
  const stats = useMemo(() => {
    if (points.length === 0) return null;

    const cov = covarianceMatrix2D(points);
    const eigen = eigendecomposition2D(cov);

    return { cov, eigen };
  }, [points]);

  // Power iteration simulation
  useEffect(() => {
    if (!animating || !stats) return;

    const interval = setInterval(() => {
      setPowerIterationStep(prev => {
        if (prev >= 10) {
          setAnimating(false);
          return prev;
        }

        // Simulate power iteration: v_new = A * v_old / ||A * v_old||
        const { cov } = stats;
        const newX = cov.xx * currentVector.x + cov.xy * currentVector.y;
        const newY = cov.xy * currentVector.x + cov.yy * currentVector.y;

        const normalized = normalize({ x: newX, y: newY });
        setCurrentVector(normalized);

        return prev + 1;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [animating, stats, currentVector]);

  const handleStartPowerIteration = () => {
    setCurrentVector({ x: 1, y: 0 }); // Start from x-axis
    setPowerIterationStep(0);
    setAnimating(true);
  };

  const handleReset = () => {
    setCurrentVector({ x: 1, y: 0 });
    setPowerIterationStep(0);
    setAnimating(false);
  };

  // Drawing
  useEffect(() => {
    const canvas = document.getElementById('eigendecomp-canvas');
    if (!canvas || !stats) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const { cov, eigen } = stats;

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

    // Draw data points
    points.forEach(p => {
      const px = p.x * SCALE + CENTER_X;
      const py = CENTER_Y - p.y * SCALE;

      ctx.fillStyle = theme.palette.primary.main;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Draw eigenvectors (final answer)
    const drawVector = (v, color, lineWidth, label) => {
      const x = v.x * SCALE * 2 + CENTER_X;
      const y = CENTER_Y - v.y * SCALE * 2;

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
      const headLen = 12;
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
        ctx.fillText(label, x + 15, y - 10);
      }

      // Negative direction
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(CENTER_X, CENTER_Y);
      ctx.lineTo(CENTER_X - (x - CENTER_X), CENTER_Y - (y - CENTER_Y));
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    if (activeStep >= 2) {
      drawVector(eigen.v1, theme.palette.error.main, 4, `PC1 (λ=${eigen.lambda1.toFixed(2)})`);
      drawVector(eigen.v2, theme.palette.secondary.main, 4, `PC2 (λ=${eigen.lambda2.toFixed(2)})`);
    }

    // Draw current iteration vector (power iteration)
    if (animating || powerIterationStep > 0) {
      drawVector(currentVector, theme.palette.warning.main, 3, `Step ${powerIterationStep}`);
    }

    // Labels
    ctx.fillStyle = theme.palette.text.primary;
    ctx.font = '14px Arial';
    ctx.fillText('X', CANVAS_WIDTH - 30, CENTER_Y - 10);
    ctx.fillText('Y', CENTER_X + 10, 25);

  }, [theme, stats, points, activeStep, animating, currentVector, powerIterationStep]);

  const steps = [
    {
      label: 'Start with Data',
      description: 'We have a dataset with correlation between X and Y'
    },
    {
      label: 'Compute Covariance Matrix',
      description: 'Calculate how variables co-vary'
    },
    {
      label: 'Find Eigenvalues & Eigenvectors',
      description: 'Decompose the covariance matrix'
    },
    {
      label: 'Order by Eigenvalue',
      description: 'Sort components by variance explained'
    },
    {
      label: 'Project Data onto PCs',
      description: 'Transform to new coordinate system'
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Title */}
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        Lesson 5: Eigendecomposition Step-by-Step
      </Typography>

      {/* Theory Section */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          🔍 What is Eigendecomposition?
        </Typography>

        <Typography paragraph>
          <strong>Eigendecomposition</strong> is the process of breaking down a matrix into its
          eigenvalues and eigenvectors. For PCA, we decompose the <strong>covariance matrix</strong>
          to reveal the principal components.
        </Typography>

        <MathJax>
          <Box sx={{ my: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body1" align="center">
              {`\\[
                \\text{Cov}(X) = V \\Lambda V^T
              \\]`}
            </Typography>
            <Typography variant="caption" display="block" align="center" sx={{ mt: 1 }}>
              Where V contains eigenvectors (principal components) and Λ contains eigenvalues (variances)
            </Typography>
          </Box>
        </MathJax>

        <Alert severity="success" sx={{ mb: 2 }}>
          <AlertTitle>The Power of Eigendecomposition</AlertTitle>
          <Typography variant="body2">
            This decomposition reveals the <strong>natural axes</strong> of your data—the directions
            where variance is maximized. These become your principal components!
          </Typography>
        </Alert>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Eigenvectors (V)
                </Typography>
                <Typography variant="body2">
                  The <strong>directions</strong> of principal components.
                  Columns of V are the new coordinate axes.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="secondary" gutterBottom>
                  Eigenvalues (Λ)
                </Typography>
                <Typography variant="body2">
                  The <strong>variance</strong> along each principal component.
                  Larger values = more important directions.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="success.main" gutterBottom>
                  Orthogonality
                </Typography>
                <Typography variant="body2">
                  Principal components are <strong>perpendicular</strong>,
                  capturing independent patterns in data.
                </Typography>
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
                Step-by-Step PCA Pipeline
              </Typography>
              <Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={generateData}
                  startIcon={<RefreshIcon />}
                  sx={{ mr: 1 }}
                >
                  New Data
                </Button>
              </Box>
            </Box>

            <canvas
              id="eigendecomp-canvas"
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              style={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '4px',
                display: 'block',
                margin: '0 auto'
              }}
            />

            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" display="block" textAlign="center">
                {activeStep < 2
                  ? 'Follow the steps to see eigendecomposition in action'
                  : 'Principal components revealed! These are the directions of maximum variance.'}
              </Typography>
            </Box>
          </Paper>

          {/* Power Iteration Demo */}
          {activeStep === 2 && (
            <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                🔄 Power Iteration Method (Optional Deep Dive)
              </Typography>

              <Typography variant="body2" paragraph>
                One way to find eigenvectors is <strong>power iteration</strong>: repeatedly multiply
                a random vector by the matrix and normalize. It converges to the dominant eigenvector!
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={animating ? <PauseIcon /> : <PlayArrowIcon />}
                  onClick={animating ? () => setAnimating(false) : handleStartPowerIteration}
                  disabled={powerIterationStep >= 10}
                >
                  {animating ? 'Pause' : 'Start Iteration'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={handleReset}
                >
                  Reset
                </Button>
              </Box>

              {powerIterationStep > 0 && (
                <Box>
                  <LinearProgress
                    variant="determinate"
                    value={(powerIterationStep / 10) * 100}
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="caption">
                    Iteration {powerIterationStep}/10 - Watch the yellow vector converge to PC1!
                  </Typography>
                </Box>
              )}

              {powerIterationStep >= 10 && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Converged! The vector now points along the first principal component.
                </Alert>
              )}
            </Paper>
          )}
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              PCA Workflow
            </Typography>

            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel
                    optional={
                      index === activeStep ? (
                        <Typography variant="caption">Current step</Typography>
                      ) : null
                    }
                    StepIconComponent={() =>
                      index < activeStep ? (
                        <CheckCircleIcon color="success" />
                      ) : (
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            border: 2,
                            borderColor: index === activeStep ? 'primary.main' : 'grey.400',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: index === activeStep ? 'primary.main' : 'transparent',
                            color: index === activeStep ? 'white' : 'grey.400'
                          }}
                        >
                          {index + 1}
                        </Box>
                      )
                    }
                  >
                    {step.label}
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" paragraph>
                      {step.description}
                    </Typography>

                    {/* Show results for each step */}
                    {index === 1 && stats && (
                      <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                        <MathJax>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {`\\[\\text{Cov} = \\begin{bmatrix}
                              ${stats.cov.xx.toFixed(2)} & ${stats.cov.xy.toFixed(2)} \\\\
                              ${stats.cov.xy.toFixed(2)} & ${stats.cov.yy.toFixed(2)}
                            \\end{bmatrix}\\]`}
                          </Typography>
                        </MathJax>
                      </Box>
                    )}

                    {index === 2 && stats && (
                      <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Eigenvalues:</strong>
                        </Typography>
                        <Box sx={{ mb: 1 }}>
                          <Chip
                            label={`λ₁ = ${stats.eigen.lambda1.toFixed(3)}`}
                            color="error"
                            size="small"
                            sx={{ mr: 1 }}
                          />
                          <Chip
                            label={`λ₂ = ${stats.eigen.lambda2.toFixed(3)}`}
                            color="secondary"
                            size="small"
                          />
                        </Box>
                        <Typography variant="body2" gutterBottom sx={{ mt: 1 }}>
                          <strong>Eigenvectors:</strong>
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          v₁ = [{stats.eigen.v1.x.toFixed(3)}, {stats.eigen.v1.y.toFixed(3)}]<br />
                          v₂ = [{stats.eigen.v2.x.toFixed(3)}, {stats.eigen.v2.y.toFixed(3)}]
                        </Typography>
                      </Box>
                    )}

                    {index === 3 && stats && (
                      <Alert severity="info" sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          PC1 explains {((stats.eigen.lambda1 / (stats.eigen.lambda1 + stats.eigen.lambda2)) * 100).toFixed(1)}% of variance<br />
                          PC2 explains {((stats.eigen.lambda2 / (stats.eigen.lambda1 + stats.eigen.lambda2)) * 100).toFixed(1)}% of variance
                        </Typography>
                      </Alert>
                    )}

                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="contained"
                        onClick={() => setActiveStep(activeStep + 1)}
                        size="small"
                        disabled={index === steps.length - 1}
                      >
                        {index === steps.length - 1 ? 'Finished' : 'Continue'}
                      </Button>
                      <Button
                        disabled={index === 0}
                        onClick={() => setActiveStep(activeStep - 1)}
                        size="small"
                        sx={{ ml: 1 }}
                      >
                        Back
                      </Button>
                    </Box>
                  </StepContent>
                </Step>
              ))}
            </Stepper>

            {activeStep === steps.length && (
              <Box sx={{ p: 2, mt: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  🎉 PCA Complete!
                </Typography>
                <Typography variant="body2">
                  You've successfully transformed your data to principal component coordinates.
                  Each point is now expressed in terms of PC1 and PC2 instead of X and Y.
                </Typography>
                <Button
                  onClick={() => setActiveStep(0)}
                  size="small"
                  sx={{ mt: 1 }}
                >
                  Restart
                </Button>
              </Box>
            )}
          </Paper>

          {/* Controls */}
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Data Correlation:
            </Typography>
            <Slider
              value={correlation}
              onChange={(e, v) => setCorrelation(v)}
              min={-0.95}
              max={0.95}
              step={0.05}
              marks={[
                { value: -0.95, label: '-1' },
                { value: 0, label: '0' },
                { value: 0.95, label: '1' }
              ]}
            />
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Adjust correlation to see how PCA adapts to different data structures
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Summary */}
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          🎯 Congratulations! You've Mastered PCA Core Concepts
        </Typography>

        <Typography paragraph>
          You've completed the foundational lessons of PCA. Let's recap the journey:
        </Typography>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                  Lesson 1: Variance Intuition
                </Typography>
                <Typography variant="body2">
                  Variance as geometric spread along a direction
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                  Lesson 2: Finding the Best Line
                </Typography>
                <Typography variant="body2">
                  Searching for the direction of maximum variance
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                  Lesson 3: Covariance Matrix
                </Typography>
                <Typography variant="body2">
                  How variables co-vary, encoded in matrix form
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                  Lesson 4: Eigenvectors
                </Typography>
                <Typography variant="body2">
                  Special directions preserved by matrix transformations
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card variant="outlined" sx={{ bgcolor: 'primary.light' }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                  Lesson 5: Eigendecomposition (This Lesson!)
                </Typography>
                <Typography variant="body2">
                  Putting it all together: the complete PCA algorithm
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Alert severity="info">
          <AlertTitle>What's Next?</AlertTitle>
          <Typography variant="body2">
            You now understand the <strong>core mathematics</strong> of PCA! Lessons 6-10 cover
            advanced topics like projection, mathematical proofs, kernel PCA, and real-world applications.
          </Typography>
        </Alert>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Ready to apply PCA?
          </Typography>
          <Typography variant="body2">
            Head to the <strong>PCA Analysis</strong> page to analyze your own datasets using
            the concepts you've learned!
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default Lesson05_Eigendecomposition;
