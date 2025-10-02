import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Slider,
  ToggleButtonGroup,
  ToggleButton,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { MathJax } from 'better-react-mathjax';

/**
 * Lesson 6: Projection and Reconstruction
 *
 * Teaches how PCA performs dimensionality reduction through:
 * - Projection onto principal components
 * - Reconstruction from reduced dimensions
 * - Visualization of reconstruction error
 * - Understanding information loss vs compression
 */

const Lesson06_Projection = ({ onComplete }) => {
  const theme = useTheme();

  // State
  const [activeStep, setActiveStep] = useState(0);
  const [numComponents, setNumComponents] = useState(2);
  const [viewAngle, setViewAngle] = useState(0);
  const [showOriginal, setShowOriginal] = useState(true);
  const [showProjected, setShowProjected] = useState(true);
  const [showReconstructed, setShowReconstructed] = useState(true);
  const [animating, setAnimating] = useState(false);
  const [currentPoint, setCurrentPoint] = useState(0);

  const canvasRef = useRef(null);

  // Generate 3D data (correlated)
  const data3D = useMemo(() => {
    const points = [];
    const n = 50;

    for (let i = 0; i < n; i++) {
      // Generate along primary direction
      const t = (i / n - 0.5) * 4;
      const noise1 = (Math.random() - 0.5) * 0.3;
      const noise2 = (Math.random() - 0.5) * 0.2;
      const noise3 = (Math.random() - 0.5) * 0.1;

      points.push({
        x: t + noise1,
        y: 0.8 * t + noise2,
        z: 0.3 * t + noise3
      });
    }

    return points;
  }, []);

  // Calculate mean
  const meanPoint = useMemo(() => {
    const n = data3D.length;
    return {
      x: data3D.reduce((sum, p) => sum + p.x, 0) / n,
      y: data3D.reduce((sum, p) => sum + p.y, 0) / n,
      z: data3D.reduce((sum, p) => sum + p.z, 0) / n
    };
  }, [data3D]);

  // Center the data
  const centeredData = useMemo(() => {
    return data3D.map(p => ({
      x: p.x - meanPoint.x,
      y: p.y - meanPoint.y,
      z: p.z - meanPoint.z
    }));
  }, [data3D, meanPoint]);

  // Calculate covariance matrix (3x3)
  const covMatrix = useMemo(() => {
    const n = centeredData.length;
    let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;

    centeredData.forEach(p => {
      xx += p.x * p.x;
      xy += p.x * p.y;
      xz += p.x * p.z;
      yy += p.y * p.y;
      yz += p.y * p.z;
      zz += p.z * p.z;
    });

    return {
      xx: xx / n, xy: xy / n, xz: xz / n,
      yy: yy / n, yz: yz / n,
      zz: zz / n
    };
  }, [centeredData]);

  // Simplified eigenvector calculation (for visualization purposes)
  const principalComponents = useMemo(() => {
    // PC1: direction of maximum variance
    const pc1 = { x: 1, y: 0.8, z: 0.3 };
    const len1 = Math.sqrt(pc1.x * pc1.x + pc1.y * pc1.y + pc1.z * pc1.z);

    // PC2: orthogonal direction
    const pc2 = { x: -0.8, y: 1, z: 0 };
    const len2 = Math.sqrt(pc2.x * pc2.x + pc2.y * pc2.y + pc2.z * pc2.z);

    // PC3: orthogonal to both
    const pc3 = { x: 0, y: 0, z: 1 };

    return {
      pc1: { x: pc1.x / len1, y: pc1.y / len1, z: pc1.z / len1 },
      pc2: { x: pc2.x / len2, y: pc2.y / len2, z: pc2.z / len2 },
      pc3: pc3
    };
  }, []);

  // Project data onto principal components
  const projectedData = useMemo(() => {
    return centeredData.map(p => {
      const { pc1, pc2, pc3 } = principalComponents;

      // Calculate coordinates in PC space
      const coord1 = p.x * pc1.x + p.y * pc1.y + p.z * pc1.z;
      const coord2 = p.x * pc2.x + p.y * pc2.y + p.z * pc2.z;
      const coord3 = p.x * pc3.x + p.y * pc3.y + p.z * pc3.z;

      return { coord1, coord2, coord3 };
    });
  }, [centeredData, principalComponents]);

  // Reconstruct data from selected components
  const reconstructedData = useMemo(() => {
    return projectedData.map(p => {
      const { pc1, pc2, pc3 } = principalComponents;

      // Use only selected number of components
      let x = 0, y = 0, z = 0;

      if (numComponents >= 1) {
        x += p.coord1 * pc1.x;
        y += p.coord1 * pc1.y;
        z += p.coord1 * pc1.z;
      }

      if (numComponents >= 2) {
        x += p.coord2 * pc2.x;
        y += p.coord2 * pc2.y;
        z += p.coord2 * pc2.z;
      }

      if (numComponents >= 3) {
        x += p.coord3 * pc3.x;
        y += p.coord3 * pc3.y;
        z += p.coord3 * pc3.z;
      }

      return { x, y, z };
    });
  }, [projectedData, principalComponents, numComponents]);

  // Calculate reconstruction error
  const reconstructionError = useMemo(() => {
    let totalError = 0;

    centeredData.forEach((orig, i) => {
      const recon = reconstructedData[i];
      const dx = orig.x - recon.x;
      const dy = orig.y - recon.y;
      const dz = orig.z - recon.z;
      totalError += Math.sqrt(dx * dx + dy * dy + dz * dz);
    });

    return (totalError / centeredData.length).toFixed(3);
  }, [centeredData, reconstructedData]);

  // Calculate variance explained
  const varianceExplained = useMemo(() => {
    // Total variance
    let totalVar = 0;
    centeredData.forEach(p => {
      totalVar += p.x * p.x + p.y * p.y + p.z * p.z;
    });

    // Explained variance (sum of squared coordinates in retained components)
    let explainedVar = 0;
    projectedData.forEach(p => {
      if (numComponents >= 1) explainedVar += p.coord1 * p.coord1;
      if (numComponents >= 2) explainedVar += p.coord2 * p.coord2;
      if (numComponents >= 3) explainedVar += p.coord3 * p.coord3;
    });

    return ((explainedVar / totalVar) * 100).toFixed(1);
  }, [centeredData, projectedData, numComponents]);

  // 3D visualization
  const draw3D = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // 3D projection parameters
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 60;
    const angle = viewAngle * Math.PI / 180;

    // Project 3D point to 2D
    const project = (point) => {
      // Rotate around Y axis
      const x = point.x * Math.cos(angle) + point.z * Math.sin(angle);
      const y = point.y;
      const z = -point.x * Math.sin(angle) + point.z * Math.cos(angle);

      // Simple perspective
      const perspective = 300 / (300 + z * scale);

      return {
        x: centerX + x * scale * perspective,
        y: centerY - y * scale * perspective,
        size: perspective
      };
    };

    // Draw axes
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;

    const axisLength = 3;
    const axes = [
      { from: { x: 0, y: 0, z: 0 }, to: { x: axisLength, y: 0, z: 0 }, color: '#ff5555', label: 'X' },
      { from: { x: 0, y: 0, z: 0 }, to: { x: 0, y: axisLength, z: 0 }, color: '#55ff55', label: 'Y' },
      { from: { x: 0, y: 0, z: 0 }, to: { x: 0, y: 0, z: axisLength }, color: '#5555ff', label: 'Z' }
    ];

    axes.forEach(axis => {
      const from = project(axis.from);
      const to = project(axis.to);

      ctx.strokeStyle = axis.color;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      ctx.fillStyle = axis.color;
      ctx.font = '12px Arial';
      ctx.fillText(axis.label, to.x + 5, to.y + 5);
    });

    // Draw principal components
    const { pc1, pc2, pc3 } = principalComponents;
    const pcAxes = [
      { vec: pc1, color: '#ff0000', scale: 2, label: 'PC1' },
      { vec: pc2, color: '#00aa00', scale: 1.5, label: 'PC2' },
      { vec: pc3, color: '#0000ff', scale: 1, label: 'PC3' }
    ];

    pcAxes.slice(0, numComponents).forEach(pc => {
      const from = project({ x: 0, y: 0, z: 0 });
      const to = project({
        x: pc.vec.x * pc.scale,
        y: pc.vec.y * pc.scale,
        z: pc.vec.z * pc.scale
      });

      ctx.strokeStyle = pc.color;
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = pc.color;
      ctx.font = 'bold 12px Arial';
      ctx.fillText(pc.label, to.x + 5, to.y);
    });

    // Draw connection lines (reconstruction error visualization)
    if (showOriginal && showReconstructed) {
      centeredData.forEach((orig, i) => {
        const recon = reconstructedData[i];
        const pOrig = project(orig);
        const pRecon = project(recon);

        ctx.strokeStyle = '#ffaa0088';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pOrig.x, pOrig.y);
        ctx.lineTo(pRecon.x, pRecon.y);
        ctx.stroke();
      });
    }

    // Draw original points
    if (showOriginal) {
      centeredData.forEach((point, i) => {
        const p = project(point);

        ctx.fillStyle = i === currentPoint && animating ? '#ff0000' : '#2196f3aa';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 * p.size, 0, 2 * Math.PI);
        ctx.fill();

        if (i === currentPoint && animating) {
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    }

    // Draw reconstructed points
    if (showReconstructed) {
      reconstructedData.forEach((point, i) => {
        const p = project(point);

        ctx.fillStyle = i === currentPoint && animating ? '#ff6600' : '#ff9800aa';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 * p.size, 0, 2 * Math.PI);
        ctx.fill();

        if (i === currentPoint && animating) {
          ctx.strokeStyle = '#ff6600';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    }

    // Draw projected points (in PC space, visualized on PC plane)
    if (showProjected && numComponents === 2) {
      projectedData.forEach((p, i) => {
        // Reconstruct just to visualize on PC plane
        const point = {
          x: p.coord1 * principalComponents.pc1.x + p.coord2 * principalComponents.pc2.x,
          y: p.coord1 * principalComponents.pc1.y + p.coord2 * principalComponents.pc2.y,
          z: p.coord1 * principalComponents.pc1.z + p.coord2 * principalComponents.pc2.z
        };

        const proj = project(point);

        ctx.fillStyle = '#4caf50aa';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 3 * proj.size, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

  }, [centeredData, reconstructedData, projectedData, principalComponents,
      viewAngle, numComponents, showOriginal, showProjected, showReconstructed,
      animating, currentPoint]);

  // Draw on mount and when dependencies change
  useEffect(() => {
    draw3D();
  }, [draw3D]);

  // Animation loop
  useEffect(() => {
    if (!animating) return;

    const interval = setInterval(() => {
      setCurrentPoint(prev => {
        if (prev >= centeredData.length - 1) {
          setAnimating(false);
          return 0;
        }
        return prev + 1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [animating, centeredData.length]);

  const handleNext = () => {
    setActiveStep(prev => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical">
        {/* Step 1: Introduction */}
        <Step>
          <StepLabel>
            <Typography variant="h6">What is Projection?</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography paragraph>
                <strong>Projection</strong> is how PCA performs dimensionality reduction. Instead of keeping
                all original dimensions, we project data onto a lower-dimensional subspace defined by the
                principal components.
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                <AlertTitle>The Core Idea</AlertTitle>
                Think of projection like casting a shadow. A 3D object casts a 2D shadow on a wall. Similarly,
                PCA projects high-dimensional data onto a lower-dimensional "shadow" that captures the most variance.
              </Alert>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>
                        1. Project
                      </Typography>
                      <Typography variant="body2">
                        Calculate coordinates in the principal component space
                      </Typography>
                      <MathJax>
                        {"\\[ z_i = \\mathbf{v}_i^T (\\mathbf{x} - \\mathbf{\\mu}) \\]"}
                      </MathJax>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>
                        2. Reduce
                      </Typography>
                      <Typography variant="body2">
                        Keep only the first k components, discard the rest
                      </Typography>
                      <MathJax>
                        {"\\[ \\mathbf{z} = [z_1, z_2, \\ldots, z_k] \\]"}
                      </MathJax>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>
                        3. Reconstruct
                      </Typography>
                      <Typography variant="body2">
                        Transform back to original space (approximate)
                      </Typography>
                      <MathJax>
                        {"\\[ \\hat{\\mathbf{x}} = \\sum_{i=1}^k z_i \\mathbf{v}_i + \\mathbf{\\mu} \\]"}
                      </MathJax>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Button variant="contained" onClick={handleNext}>
                Continue
              </Button>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 2: Visualization */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Visualize Projection in 3D</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography paragraph>
                Below is a 3D dataset. Watch how changing the number of principal components affects
                the reconstruction quality.
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 2 }}>
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={500}
                      style={{ width: '100%', height: 'auto', border: '1px solid #ddd' }}
                    />

                    <Box sx={{ mt: 2 }}>
                      <Typography gutterBottom>View Angle: {viewAngle}°</Typography>
                      <Slider
                        value={viewAngle}
                        onChange={(e, val) => setViewAngle(val)}
                        min={0}
                        max={360}
                        step={5}
                      />
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card sx={{ mb: 2, bgcolor: '#e3f2fd' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Controls</Typography>

                      <Typography gutterBottom sx={{ mt: 2 }}>
                        Number of Components: {numComponents}
                      </Typography>
                      <ToggleButtonGroup
                        value={numComponents}
                        exclusive
                        onChange={(e, val) => val && setNumComponents(val)}
                        fullWidth
                        size="small"
                      >
                        <ToggleButton value={1}>1</ToggleButton>
                        <ToggleButton value={2}>2</ToggleButton>
                        <ToggleButton value={3}>3</ToggleButton>
                      </ToggleButtonGroup>

                      <Divider sx={{ my: 2 }} />

                      <Typography variant="body2" gutterBottom>
                        <strong>Show:</strong>
                      </Typography>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Button
                          size="small"
                          variant={showOriginal ? "contained" : "outlined"}
                          onClick={() => setShowOriginal(!showOriginal)}
                          sx={{ bgcolor: showOriginal ? '#2196f3' : 'transparent' }}
                        >
                          Original Data
                        </Button>

                        <Button
                          size="small"
                          variant={showReconstructed ? "contained" : "outlined"}
                          onClick={() => setShowReconstructed(!showReconstructed)}
                          sx={{ bgcolor: showReconstructed ? '#ff9800' : 'transparent' }}
                        >
                          Reconstructed Data
                        </Button>

                        <Button
                          size="small"
                          variant={showProjected ? "contained" : "outlined"}
                          onClick={() => setShowProjected(!showProjected)}
                          disabled={numComponents !== 2}
                          sx={{ bgcolor: showProjected ? '#4caf50' : 'transparent' }}
                        >
                          Projected (PC space)
                        </Button>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Button
                        variant="outlined"
                        startIcon={animating ? <PauseIcon /> : <PlayArrowIcon />}
                        onClick={() => {
                          setAnimating(!animating);
                          if (!animating) setCurrentPoint(0);
                        }}
                        fullWidth
                      >
                        {animating ? 'Pause' : 'Animate Points'}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card sx={{ bgcolor: '#fff3e0' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Metrics
                      </Typography>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Variance Explained
                        </Typography>
                        <Typography variant="h4" color="success.main">
                          {varianceExplained}%
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Avg Reconstruction Error
                        </Typography>
                        <Typography variant="h4" color="error.main">
                          {reconstructionError}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Alert severity="success" sx={{ mt: 2 }}>
                <strong>Try This:</strong> Change the number of components and observe how:
                <li>1 component: Large orange error lines (high reconstruction error)</li>
                <li>2 components: Smaller error lines (better reconstruction)</li>
                <li>3 components: No error lines (perfect reconstruction)</li>
              </Alert>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>Continue</Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 3: Mathematics */}
        <Step>
          <StepLabel>
            <Typography variant="h6">The Mathematics of Projection</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>
                Projection Formula
              </Typography>

              <Paper sx={{ p: 2, bgcolor: 'white', mb: 2 }}>
                <Typography paragraph>
                  Given a data point <MathJax inline>{"\\(\\mathbf{x}\\)"}</MathJax> and principal components
                  <MathJax inline>{"\\(\\mathbf{v}_1, \\mathbf{v}_2, \\ldots, \\mathbf{v}_k\\)"}</MathJax>:
                </Typography>

                <MathJax>
                  {"\\[ \\mathbf{x}_{\\text{centered}} = \\mathbf{x} - \\mathbf{\\mu} \\]"}
                </MathJax>

                <MathJax>
                  {"\\[ z_i = \\mathbf{v}_i^T \\mathbf{x}_{\\text{centered}} = \\sum_{j=1}^d v_{ij} x_j \\]"}
                </MathJax>

                <Typography paragraph sx={{ mt: 2 }}>
                  The projection coordinates <MathJax inline>{"\\(z_i\\)"}</MathJax> represent the data in the
                  new coordinate system defined by the principal components.
                </Typography>
              </Paper>

              <Typography variant="h6" gutterBottom>
                Reconstruction Formula
              </Typography>

              <Paper sx={{ p: 2, bgcolor: 'white', mb: 2 }}>
                <Typography paragraph>
                  To reconstruct the approximate original point from k components:
                </Typography>

                <MathJax>
                  {"\\[ \\hat{\\mathbf{x}} = \\mathbf{\\mu} + \\sum_{i=1}^k z_i \\mathbf{v}_i \\]"}
                </MathJax>

                <Typography paragraph sx={{ mt: 2 }}>
                  If k = d (all components), then <MathJax inline>{"\\(\\hat{\\mathbf{x}} = \\mathbf{x}\\)"}</MathJax> (perfect reconstruction).
                  If k {"<"} d, we get an approximation.
                </Typography>
              </Paper>

              <Typography variant="h6" gutterBottom>
                Reconstruction Error
              </Typography>

              <Paper sx={{ p: 2, bgcolor: 'white', mb: 2 }}>
                <Typography paragraph>
                  The error for a single point is the Euclidean distance:
                </Typography>

                <MathJax>
                  {"\\[ \\text{Error} = \\|\\mathbf{x} - \\hat{\\mathbf{x}}\\| = \\left\\| \\sum_{i=k+1}^d z_i \\mathbf{v}_i \\right\\| \\]"}
                </MathJax>

                <Alert severity="info" sx={{ mt: 2 }}>
                  The reconstruction error comes from the discarded components (k+1 through d). The more
                  components we keep, the lower the error.
                </Alert>
              </Paper>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Why This Works: The Optimal Approximation Theorem
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    PCA provides the <strong>best k-dimensional linear approximation</strong> to the data
                    in terms of minimizing reconstruction error (squared L2 norm).
                  </Typography>

                  <Typography paragraph>
                    Formally, the PCA solution minimizes:
                  </Typography>

                  <MathJax>
                    {"\\[ \\min_{\\mathbf{v}_1, \\ldots, \\mathbf{v}_k} \\sum_{n=1}^N \\|\\mathbf{x}_n - \\hat{\\mathbf{x}}_n\\|^2 \\]"}
                  </MathJax>

                  <Typography paragraph sx={{ mt: 2 }}>
                    subject to the constraint that the <MathJax inline>{"\\(\\mathbf{v}_i\\)"}</MathJax> are orthonormal.
                    This is known as the <strong>Eckart-Young theorem</strong>.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>Continue</Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 4: Practical Considerations */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Choosing the Number of Components</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography paragraph>
                How many components should you keep? This is the fundamental tradeoff in dimensionality reduction:
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#e8f5e9' }}>
                    <CardContent>
                      <Typography variant="h6" color="success.main" gutterBottom>
                        ✓ Keep More Components
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">Lower reconstruction error</Typography></li>
                        <li><Typography variant="body2">Preserve more information</Typography></li>
                        <li><Typography variant="body2">Better for accurate reconstruction</Typography></li>
                      </ul>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>But:</strong> Less compression, more storage/computation
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#fff3e0' }}>
                    <CardContent>
                      <Typography variant="h6" color="warning.main" gutterBottom>
                        ⚡ Keep Fewer Components
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">Better compression</Typography></li>
                        <li><Typography variant="body2">Faster computation</Typography></li>
                        <li><Typography variant="body2">Easier visualization (2D/3D)</Typography></li>
                        <li><Typography variant="body2">May remove noise</Typography></li>
                      </ul>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>But:</strong> Information loss, higher error
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom>
                Common Selection Strategies
              </Typography>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>1. Variance Explained Threshold (e.g., 95%)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    Keep enough components to explain at least X% of total variance (commonly 90-95%).
                  </Typography>
                  <MathJax>
                    {"\\[ \\frac{\\sum_{i=1}^k \\lambda_i}{\\sum_{i=1}^d \\lambda_i} \\geq 0.95 \\]"}
                  </MathJax>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>2. Scree Plot (Elbow Method)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    Plot eigenvalues and look for an "elbow" where the curve flattens. Components after
                    the elbow contribute little additional variance.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>3. Task-Specific (Visualization, Classification, etc.)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    For visualization: Use 2 or 3 components (can plot in 2D/3D)
                  </Typography>
                  <Typography paragraph>
                    For machine learning: Cross-validate different values of k
                  </Typography>
                  <Typography paragraph>
                    For compression: Balance file size vs reconstruction quality
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <AlertTitle>No Universal Answer</AlertTitle>
                The "right" number of components depends on your specific application. There is always
                a tradeoff between simplicity and accuracy.
              </Alert>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>Continue</Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 5: Summary */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Summary & Completion</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                🎉 Lesson Complete!
              </Typography>

              <Typography paragraph>
                You've learned how PCA performs dimensionality reduction through projection and reconstruction:
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 40, mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        Key Concepts
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">Projection onto principal components</Typography></li>
                        <li><Typography variant="body2">Reconstruction from reduced dimensions</Typography></li>
                        <li><Typography variant="body2">Tradeoff between compression and accuracy</Typography></li>
                        <li><Typography variant="body2">Variance explained as quality metric</Typography></li>
                      </ul>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 40, mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        Key Formulas
                      </Typography>
                      <MathJax>
                        {"\\[ z_i = \\mathbf{v}_i^T (\\mathbf{x} - \\mathbf{\\mu}) \\]"}
                      </MathJax>
                      <MathJax>
                        {"\\[ \\hat{\\mathbf{x}} = \\mathbf{\\mu} + \\sum_{i=1}^k z_i \\mathbf{v}_i \\]"}
                      </MathJax>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Projection → Reconstruction
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Alert severity="success" sx={{ mb: 2 }}>
                <AlertTitle>Next Steps</AlertTitle>
                Continue to <strong>Lesson 7: The Variance Maximization Proof</strong> to understand
                the mathematical foundation that makes PCA optimal.
              </Alert>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleComplete}
                >
                  Complete Lesson
                </Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>
      </Stepper>
    </Box>
  );
};

export default Lesson06_Projection;
