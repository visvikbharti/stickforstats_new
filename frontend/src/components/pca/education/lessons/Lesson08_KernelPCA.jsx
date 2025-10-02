import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { MathJax } from 'better-react-mathjax';

/**
 * Lesson 8: The Kernel Trick Preview
 *
 * Introduces Kernel PCA for nonlinear dimensionality reduction
 * Topics covered:
 * - Limitations of linear PCA
 * - The kernel trick concept
 * - Common kernels (polynomial, RBF)
 * - Visualization of kernel PCA vs standard PCA on nonlinear data
 */

const Lesson08_KernelPCA = ({ onComplete }) => {
  const theme = useTheme();

  // State
  const [activeStep, setActiveStep] = useState(0);
  const [dataPattern, setDataPattern] = useState('circle');
  const [kernelType, setKernelType] = useState('rbf');
  const [gamma, setGamma] = useState(1.0);

  const canvasRef = useRef(null);
  const kernelCanvasRef = useRef(null);

  // Generate nonlinear data patterns
  const generateData = useCallback((pattern) => {
    const points = [];
    const n = 150;

    if (pattern === 'circle') {
      // Circle with noise
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * 2 * Math.PI;
        const radius = 2 + (Math.random() - 0.5) * 0.3;
        points.push({
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle),
          label: Math.cos(angle) > 0 ? 1 : 0
        });
      }
    } else if (pattern === 'spiral') {
      // Spiral
      for (let i = 0; i < n; i++) {
        const t = (i / n) * 4 * Math.PI;
        const radius = 0.3 + t * 0.15;
        const noise = (Math.random() - 0.5) * 0.2;
        points.push({
          x: radius * Math.cos(t) + noise,
          y: radius * Math.sin(t) + noise,
          label: t < 2 * Math.PI ? 0 : 1
        });
      }
    } else if (pattern === 'swiss') {
      // Swiss roll (2D projection)
      for (let i = 0; i < n; i++) {
        const t = (i / n) * 3 * Math.PI;
        const x = t * Math.cos(t) / 3;
        const y = (Math.random() - 0.5) * 2;
        points.push({
          x: x + (Math.random() - 0.5) * 0.3,
          y: y,
          label: y > 0 ? 1 : 0
        });
      }
    }

    return points;
  }, []);

  const data = useMemo(() => generateData(dataPattern), [dataPattern, generateData]);

  // Compute mean for centering
  const mean = useMemo(() => {
    const n = data.length;
    return {
      x: data.reduce((sum, p) => sum + p.x, 0) / n,
      y: data.reduce((sum, p) => sum + p.y, 0) / n
    };
  }, [data]);

  // Center data
  const centeredData = useMemo(() => {
    return data.map(p => ({
      x: p.x - mean.x,
      y: p.y - mean.y,
      label: p.label
    }));
  }, [data, mean]);

  // Standard PCA (linear)
  const linearPCA = useMemo(() => {
    const n = centeredData.length;

    // Compute covariance matrix
    let xx = 0, xy = 0, yy = 0;
    centeredData.forEach(p => {
      xx += p.x * p.x;
      xy += p.x * p.y;
      yy += p.y * p.y;
    });
    xx /= n;
    xy /= n;
    yy /= n;

    // Compute eigenvalues (simplified 2D case)
    const trace = xx + yy;
    const det = xx * yy - xy * xy;
    const discriminant = Math.sqrt(trace * trace - 4 * det);

    const lambda1 = (trace + discriminant) / 2;
    const lambda2 = (trace - discriminant) / 2;

    // First eigenvector
    const pc1 = { x: xy, y: lambda1 - xx };
    const len1 = Math.sqrt(pc1.x * pc1.x + pc1.y * pc1.y);

    return {
      pc1: { x: pc1.x / len1, y: pc1.y / len1 },
      lambda1,
      lambda2
    };
  }, [centeredData]);

  // Kernel function
  const kernel = useCallback((p1, p2, type, gamma) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dist2 = dx * dx + dy * dy;

    if (type === 'rbf') {
      // Radial basis function (Gaussian)
      return Math.exp(-gamma * dist2);
    } else if (type === 'polynomial') {
      // Polynomial kernel (degree 2)
      const dot = p1.x * p2.x + p1.y * p2.y;
      return (dot + 1) * (dot + 1);
    }

    return 0;
  }, []);

  // Simplified kernel PCA (for visualization)
  const kernelPCA = useMemo(() => {
    const n = centeredData.length;

    // Compute kernel matrix K
    const K = [];
    for (let i = 0; i < n; i++) {
      K[i] = [];
      for (let j = 0; j < n; j++) {
        K[i][j] = kernel(centeredData[i], centeredData[j], kernelType, gamma);
      }
    }

    // Center kernel matrix
    const rowMeans = K.map(row => row.reduce((sum, val) => sum + val, 0) / n);
    const totalMean = rowMeans.reduce((sum, val) => sum + val, 0) / n;

    const Kc = K.map((row, i) =>
      row.map((val, j) => val - rowMeans[i] - rowMeans[j] + totalMean)
    );

    // Project data using kernel trick (simplified - using first point as reference)
    const projections = centeredData.map((point, i) => {
      let coord = 0;
      for (let j = 0; j < Math.min(n, 50); j++) {
        coord += Kc[i][j];
      }
      return coord / Math.min(n, 50);
    });

    return { projections };
  }, [centeredData, kernelType, gamma, kernel]);

  // Draw original data with linear PCA
  const drawLinearPCA = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 40;

    // Draw axes
    ctx.strokeStyle = '#dddddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();

    // Draw principal component
    if (linearPCA) {
      const { pc1 } = linearPCA;
      const len = 3;

      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(centerX - pc1.x * len * scale, centerY - pc1.y * len * scale);
      ctx.lineTo(centerX + pc1.x * len * scale, centerY + pc1.y * len * scale);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('PC1 (Linear)', centerX + pc1.x * len * scale + 10, centerY + pc1.y * len * scale);
    }

    // Draw data points
    centeredData.forEach(point => {
      ctx.fillStyle = point.label === 1 ? '#2196f3' : '#ff9800';
      ctx.beginPath();
      ctx.arc(centerX + point.x * scale, centerY + point.y * scale, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Label
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('Standard (Linear) PCA', 10, 20);

  }, [centeredData, linearPCA]);

  // Draw kernel PCA result
  const drawKernelPCA = useCallback(() => {
    const canvas = kernelCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    // Find range of projections
    const { projections } = kernelPCA;
    const minProj = Math.min(...projections);
    const maxProj = Math.max(...projections);
    const range = maxProj - minProj;
    const scale = (width - 40) / range;

    // Draw axis
    ctx.strokeStyle = '#dddddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, centerY);
    ctx.lineTo(width - 20, centerY);
    ctx.stroke();

    // Draw 1D projection
    projections.forEach((proj, i) => {
      const x = 20 + (proj - minProj) * scale;

      ctx.fillStyle = data[i].label === 1 ? '#2196f3' : '#ff9800';
      ctx.beginPath();
      ctx.arc(x, centerY, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Label
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`Kernel PCA (${kernelType.toUpperCase()})`, 10, 20);

    ctx.font = '12px Arial';
    ctx.fillText('1D Projection', 10, height - 10);

  }, [data, kernelPCA, kernelType]);

  // Draw on updates
  useEffect(() => {
    drawLinearPCA();
  }, [drawLinearPCA]);

  useEffect(() => {
    drawKernelPCA();
  }, [drawKernelPCA]);

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
        {/* Step 1: Motivation */}
        <Step>
          <StepLabel>
            <Typography variant="h6">When Linear PCA Fails</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography paragraph>
                Standard PCA is a <strong>linear</strong> method. It finds the best linear subspace
                to represent the data. But what if the data has <strong>nonlinear structure</strong>?
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#e8f5e9' }}>
                    <CardContent>
                      <Typography variant="h6" color="success.main" gutterBottom>
                        ✓ Linear PCA Works Well
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">Data lies near a linear subspace</Typography></li>
                        <li><Typography variant="body2">Gaussian-like clusters</Typography></li>
                        <li><Typography variant="body2">Elongated clouds</Typography></li>
                      </ul>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#ffebee' }}>
                    <CardContent>
                      <Typography variant="h6" color="error.main" gutterBottom>
                        ✗ Linear PCA Struggles
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">Circular/curved patterns</Typography></li>
                        <li><Typography variant="body2">Swiss roll structures</Typography></li>
                        <li><Typography variant="body2">Spiral patterns</Typography></li>
                      </ul>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Alert severity="warning" sx={{ mb: 2 }}>
                <AlertTitle>The Problem</AlertTitle>
                A straight line (PC1) cannot capture the structure of a circle or spiral.
                We need a <strong>nonlinear</strong> approach!
              </Alert>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                The Solution: Kernel PCA
              </Typography>

              <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                <Typography paragraph>
                  <strong>Kernel PCA</strong> applies the "kernel trick" to perform PCA in a high-dimensional
                  feature space where the data becomes linearly separable, without explicitly computing
                  the transformation.
                </Typography>

                <Typography>
                  Think of it as: <em>"Make the data linearly separable by mapping to higher dimensions,
                  then apply PCA there."</em>
                </Typography>
              </Paper>

              <Button variant="contained" onClick={handleNext} sx={{ mt: 2 }}>
                Continue
              </Button>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 2: The Kernel Trick */}
        <Step>
          <StepLabel>
            <Typography variant="h6">The Kernel Trick</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>
                The Big Idea
              </Typography>

              <Paper sx={{ p: 2, bgcolor: 'white', mb: 2 }}>
                <Typography paragraph>
                  <strong>1. Map to high dimensions:</strong>
                </Typography>

                <MathJax>
                  {"\\[ \\phi: \\mathbb{R}^d \\rightarrow \\mathbb{R}^D \\quad (D \\gg d, \\text{ possibly } D = \\infty) \\]"}
                </MathJax>

                <Typography paragraph sx={{ mt: 2 }}>
                  <strong>2. Apply PCA in the high-dimensional space</strong>
                </Typography>

                <Typography paragraph>
                  <strong>3. The trick:</strong> We never explicitly compute <MathJax inline>{"\\(\\phi(\\mathbf{x})\\)"}</MathJax>!
                  Instead, we use a <strong>kernel function</strong>:
                </Typography>

                <MathJax>
                  {"\\[ k(\\mathbf{x}, \\mathbf{y}) = \\phi(\\mathbf{x})^T \\phi(\\mathbf{y}) \\]"}
                </MathJax>

                <Alert severity="success" sx={{ mt: 2 }}>
                  The kernel computes the <strong>inner product</strong> in the high-dimensional space
                  without ever going there!
                </Alert>
              </Paper>

              <Typography variant="h6" gutterBottom>
                Common Kernels
              </Typography>

              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    1. Radial Basis Function (RBF) Kernel
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <MathJax>
                    {"\\[ k(\\mathbf{x}, \\mathbf{y}) = \\exp\\left(-\\gamma \\|\\mathbf{x} - \\mathbf{y}\\|^2\\right) \\]"}
                  </MathJax>

                  <Typography paragraph sx={{ mt: 2 }}>
                    • Most popular choice
                  </Typography>
                  <Typography paragraph>
                    • Maps to <strong>infinite-dimensional</strong> space
                  </Typography>
                  <Typography paragraph>
                    • Parameter γ controls width of Gaussian
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    2. Polynomial Kernel
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <MathJax>
                    {"\\[ k(\\mathbf{x}, \\mathbf{y}) = (\\mathbf{x}^T \\mathbf{y} + c)^p \\]"}
                  </MathJax>

                  <Typography paragraph sx={{ mt: 2 }}>
                    • Maps to finite-dimensional space
                  </Typography>
                  <Typography paragraph>
                    • Degree p controls complexity
                  </Typography>
                  <Typography paragraph>
                    • Example (p=2): includes all quadratic terms
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    3. Linear Kernel (Standard PCA)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <MathJax>
                    {"\\[ k(\\mathbf{x}, \\mathbf{y}) = \\mathbf{x}^T \\mathbf{y} \\]"}
                  </MathJax>

                  <Typography paragraph sx={{ mt: 2 }}>
                    • No transformation - equivalent to standard PCA
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

        {/* Step 3: Interactive Comparison */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Compare Linear vs Kernel PCA</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography paragraph>
                Below you can see how Kernel PCA handles nonlinear data much better than linear PCA.
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Original Data with Linear PCA
                    </Typography>
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={400}
                      style={{ width: '100%', height: 'auto', border: '1px solid #ddd' }}
                    />
                  </Paper>

                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Kernel PCA Projection
                    </Typography>
                    <canvas
                      ref={kernelCanvasRef}
                      width={500}
                      height={200}
                      style={{ width: '100%', height: 'auto', border: '1px solid #ddd' }}
                    />
                  </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Data Pattern
                      </Typography>

                      <ToggleButtonGroup
                        value={dataPattern}
                        exclusive
                        onChange={(e, val) => val && setDataPattern(val)}
                        orientation="vertical"
                        fullWidth
                        size="small"
                      >
                        <ToggleButton value="circle">Circle</ToggleButton>
                        <ToggleButton value="spiral">Spiral</ToggleButton>
                        <ToggleButton value="swiss">Swiss Roll</ToggleButton>
                      </ToggleButtonGroup>
                    </CardContent>
                  </Card>

                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Kernel Type
                      </Typography>

                      <ToggleButtonGroup
                        value={kernelType}
                        exclusive
                        onChange={(e, val) => val && setKernelType(val)}
                        orientation="vertical"
                        fullWidth
                        size="small"
                      >
                        <ToggleButton value="rbf">RBF (Gaussian)</ToggleButton>
                        <ToggleButton value="polynomial">Polynomial (deg 2)</ToggleButton>
                      </ToggleButtonGroup>

                      {kernelType === 'rbf' && (
                        <Box sx={{ mt: 2 }}>
                          <Typography gutterBottom>
                            γ (gamma): {gamma.toFixed(1)}
                          </Typography>
                          <Slider
                            value={gamma}
                            onChange={(e, val) => setGamma(val)}
                            min={0.1}
                            max={5}
                            step={0.1}
                            marks={[
                              { value: 0.1, label: '0.1' },
                              { value: 5, label: '5' }
                            ]}
                          />
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            Higher γ = tighter clusters
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>

                  <Alert severity="info">
                    <strong>Notice:</strong> Linear PCA (red line) fails to separate the colored groups,
                    but Kernel PCA projects them into a space where they become more separated.
                  </Alert>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>Continue</Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 4: How It Works */}
        <Step>
          <StepLabel>
            <Typography variant="h6">How Kernel PCA Works</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>
                Algorithm Overview
              </Typography>

              <Paper sx={{ p: 2, bgcolor: 'white', mb: 2 }}>
                <Typography paragraph>
                  <strong>Input:</strong> Data points <MathJax inline>{"\\(\\mathbf{x}_1, \\ldots, \\mathbf{x}_n\\)"}</MathJax>,
                  kernel function <MathJax inline>{"\\(k(\\cdot, \\cdot)\\)"}</MathJax>
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography paragraph>
                  <strong>Step 1:</strong> Compute the kernel matrix <strong>K</strong>
                </Typography>

                <MathJax>
                  {"\\[ K_{ij} = k(\\mathbf{x}_i, \\mathbf{x}_j) = \\phi(\\mathbf{x}_i)^T \\phi(\\mathbf{x}_j) \\]"}
                </MathJax>

                <Typography paragraph sx={{ mt: 2 }}>
                  <strong>Step 2:</strong> Center the kernel matrix
                </Typography>

                <MathJax>
                  {"\\[ \\tilde{K} = K - \\mathbf{1}_n K - K \\mathbf{1}_n + \\mathbf{1}_n K \\mathbf{1}_n \\]"}
                </MathJax>

                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  (where <MathJax inline>{"\\(\\mathbf{1}_n\\)"}</MathJax> is n×n matrix of 1/n)
                </Typography>

                <Typography paragraph sx={{ mt: 2 }}>
                  <strong>Step 3:</strong> Eigendecomposition of <MathJax inline>{"\\(\\tilde{K}\\)"}</MathJax>
                </Typography>

                <MathJax>
                  {"\\[ \\tilde{K} \\mathbf{\\alpha}_i = \\lambda_i \\mathbf{\\alpha}_i \\]"}
                </MathJax>

                <Typography paragraph sx={{ mt: 2 }}>
                  <strong>Step 4:</strong> Project new point <MathJax inline>{"\\(\\mathbf{x}\\)"}</MathJax>
                </Typography>

                <MathJax>
                  {"\\[ z_i = \\sum_{j=1}^n \\alpha_{ij} k(\\mathbf{x}_j, \\mathbf{x}) \\]"}
                </MathJax>
              </Paper>

              <Alert severity="info" sx={{ mb: 2 }}>
                <AlertTitle>Key Insight</AlertTitle>
                We never compute <MathJax inline>{"\\(\\phi(\\mathbf{x})\\)"}</MathJax> explicitly!
                Everything is done using kernel evaluations.
              </Alert>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    🔍 Why Does This Work?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    Standard PCA computes eigenvectors of the covariance matrix:
                  </Typography>

                  <MathJax>
                    {"\\[ \\mathbf{C} = \\frac{1}{n} \\sum_{i=1}^n \\phi(\\mathbf{x}_i) \\phi(\\mathbf{x}_i)^T \\]"}
                  </MathJax>

                  <Typography paragraph sx={{ mt: 2 }}>
                    But the eigenvectors can be written as linear combinations of the data:
                  </Typography>

                  <MathJax>
                    {"\\[ \\mathbf{v}_i = \\sum_{j=1}^n \\alpha_{ij} \\phi(\\mathbf{x}_j) \\]"}
                  </MathJax>

                  <Typography paragraph sx={{ mt: 2 }}>
                    Substituting this into the eigenvalue equation <MathJax inline>{"\\(\\mathbf{C} \\mathbf{v}_i = \\lambda_i \\mathbf{v}_i\\)"}</MathJax>,
                    we arrive at the kernel matrix eigenvalue problem.
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

        {/* Step 5: Summary */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Summary & Completion</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                🚀 Advanced PCA Complete!
              </Typography>

              <Typography paragraph>
                You've learned how to extend PCA to handle nonlinear data structures using the kernel trick.
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#e8f5e9' }}>
                    <CardContent>
                      <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 40, mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        Key Concepts
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">Linear PCA limitations on nonlinear data</Typography></li>
                        <li><Typography variant="body2">The kernel trick: compute in high-D without going there</Typography></li>
                        <li><Typography variant="body2">Common kernels: RBF, Polynomial</Typography></li>
                        <li><Typography variant="body2">Kernel matrix eigendecomposition</Typography></li>
                      </ul>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#fff3e0' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        When to Use Kernel PCA
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>✓ Use Kernel PCA when:</strong>
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">Data has curved/nonlinear structure</Typography></li>
                        <li><Typography variant="body2">Linear PCA fails to separate classes</Typography></li>
                        <li><Typography variant="body2">You need manifold learning</Typography></li>
                      </ul>
                      <Typography variant="body2" paragraph sx={{ mt: 2 }}>
                        <strong>✗ Stick with linear PCA when:</strong>
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">Data is roughly linear</Typography></li>
                        <li><Typography variant="body2">You need interpretability</Typography></li>
                        <li><Typography variant="body2">Dataset is very large (kernel matrix is n×n)</Typography></li>
                      </ul>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Paper sx={{ p: 2, bgcolor: '#e3f2fd', mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Key Formula: RBF Kernel
                </Typography>

                <MathJax>
                  {"\\[ k(\\mathbf{x}, \\mathbf{y}) = \\exp\\left(-\\gamma \\|\\mathbf{x} - \\mathbf{y}\\|^2\\right) \\]"}
                </MathJax>

                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Maps to infinite-dimensional space, perfect for complex nonlinear patterns
                </Typography>
              </Paper>

              <Alert severity="success" sx={{ mb: 2 }}>
                <AlertTitle>Next Steps</AlertTitle>
                Continue to <strong>Lesson 9: Relationship to SVD</strong> to understand the deep
                connection between PCA and Singular Value Decomposition.
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

export default Lesson08_KernelPCA;
