/**
 * Lesson 3: Linear Transformation Methods in Enzyme Kinetics
 *
 * Covers:
 * - Lineweaver-Burk (double reciprocal) plot
 * - Eadie-Hofstee plot
 * - Hanes-Woolf plot
 * - Error propagation and why non-linear regression is better
 * - Historical context and modern recommendations
 *
 * ~800 lines of comprehensive educational content
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { alpha } from '@mui/material/styles';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Slider,
  Grid,
  Card,
  CardContent,
  Alert,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Science as ScienceIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';

const STEPS = [
  'The Need for Linearization',
  'Lineweaver-Burk Plot',
  'Eadie-Hofstee Plot',
  'Hanes-Woolf Plot',
  'Error Propagation Problem',
  'Modern Recommendations'
];

// Generate synthetic Michaelis-Menten data with noise
const generateMMData = (Vmax, Km, noise = 0.05) => {
  const substrates = [1, 2, 5, 10, 20, 50, 100, 200];
  return substrates.map(S => {
    const vTrue = (Vmax * S) / (Km + S);
    const vNoisy = vTrue * (1 + (Math.random() - 0.5) * 2 * noise);
    return { S, v: Math.max(0.1, vNoisy), vTrue };
  });
};

const Lesson3_LinearTransformations = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [params, setParams] = useState({ Vmax: 100, Km: 20 });
  const [noiseLevel, setNoiseLevel] = useState(0.1);
  const [data, setData] = useState(() => generateMMData(100, 20, 0.1));
  const [showErrors, setShowErrors] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState('lineweaver-burk');

  const mmCanvasRef = useRef(null);
  const lwbCanvasRef = useRef(null);
  const ehCanvasRef = useRef(null);
  const hwCanvasRef = useRef(null);
  const comparisonCanvasRef = useRef(null);

  // Regenerate data when parameters or noise change
  const regenerateData = useCallback(() => {
    setData(generateMMData(params.Vmax, params.Km, noiseLevel));
  }, [params.Vmax, params.Km, noiseLevel]);

  // Draw Michaelis-Menten plot
  useEffect(() => {
    const canvas = mmCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;

    // Clear
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Calculate scales
    const maxS = Math.max(...data.map(d => d.S)) * 1.1;
    const maxV = params.Vmax * 1.1;

    const xScale = (width - 2 * padding) / maxS;
    const yScale = (height - 2 * padding) / maxV;

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const x = padding + (i / 5) * (width - 2 * padding);
      const y = padding + (i / 5) * (height - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw fitted curve
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let S = 0; S <= maxS; S += maxS / 100) {
      const v = (params.Vmax * S) / (params.Km + S);
      const x = padding + S * xScale;
      const y = height - padding - v * yScale;
      if (S === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Vmax line
    ctx.strokeStyle = '#ff9800';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    const vmaxY = height - padding - params.Vmax * yScale;
    ctx.moveTo(padding, vmaxY);
    ctx.lineTo(width - padding, vmaxY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw data points
    data.forEach(d => {
      const x = padding + d.S * xScale;
      const y = height - padding - d.v * yScale;

      ctx.fillStyle = '#d32f2f';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Labels
    ctx.fillStyle = '#333333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('[S] (substrate concentration)', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('v (reaction rate)', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#ff9800';
    ctx.textAlign = 'left';
    ctx.fillText(`Vmax = ${params.Vmax}`, width - padding - 80, vmaxY - 5);

  }, [data, params]);

  // Draw Lineweaver-Burk plot
  useEffect(() => {
    const canvas = lwbCanvasRef.current;
    if (!canvas || activeStep < 1) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Transform data: 1/v vs 1/S
    const transformed = data.map(d => ({
      x: 1 / d.S,
      y: 1 / d.v,
      originalS: d.S,
      originalV: d.v
    }));

    // Calculate linear regression
    const n = transformed.length;
    const sumX = transformed.reduce((s, d) => s + d.x, 0);
    const sumY = transformed.reduce((s, d) => s + d.y, 0);
    const sumXY = transformed.reduce((s, d) => s + d.x * d.y, 0);
    const sumXX = transformed.reduce((s, d) => s + d.x * d.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // True parameters from linear regression
    const VmaxEst = 1 / intercept;
    const KmEst = slope * VmaxEst;

    // Scale for plot (include negative x for intercept)
    const maxX = Math.max(...transformed.map(d => d.x)) * 1.2;
    const minX = -maxX * 0.3;
    const maxY = Math.max(...transformed.map(d => d.y)) * 1.2;
    const minY = Math.min(0, intercept - slope * maxX * 0.5);

    const xRange = maxX - minX;
    const yRange = maxY - minY;

    const xToCanvas = x => padding + ((x - minX) / xRange) * (width - 2 * padding);
    const yToCanvas = y => height - padding - ((y - minY) / yRange) * (height - 2 * padding);

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      const x = padding + (i / 10) * (width - 2 * padding);
      const y = padding + (i / 10) * (height - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw axes at origin
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    const originX = xToCanvas(0);
    const originY = yToCanvas(0);

    ctx.beginPath();
    ctx.moveTo(padding, originY);
    ctx.lineTo(width - padding, originY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(originX, padding);
    ctx.lineTo(originX, height - padding);
    ctx.stroke();

    // Draw regression line
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const lineStartX = minX;
    const lineEndX = maxX;
    ctx.moveTo(xToCanvas(lineStartX), yToCanvas(intercept + slope * lineStartX));
    ctx.lineTo(xToCanvas(lineEndX), yToCanvas(intercept + slope * lineEndX));
    ctx.stroke();

    // Mark intercepts
    // Y-intercept (1/Vmax)
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.arc(xToCanvas(0), yToCanvas(intercept), 8, 0, Math.PI * 2);
    ctx.fill();

    // X-intercept (-1/Km)
    const xIntercept = -intercept / slope;
    ctx.fillStyle = '#ff9800';
    ctx.beginPath();
    ctx.arc(xToCanvas(xIntercept), yToCanvas(0), 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw data points with error bars if enabled
    transformed.forEach(d => {
      const x = xToCanvas(d.x);
      const y = yToCanvas(d.y);

      if (showErrors) {
        // Show how errors are magnified at low S (high 1/S)
        const errorMagnification = d.x / (1 / data[data.length - 1].S);
        ctx.strokeStyle = `rgba(211, 47, 47, ${0.3 + 0.7 * (errorMagnification / 10)})`;
        ctx.lineWidth = 2 + errorMagnification * 2;
        ctx.beginPath();
        ctx.moveTo(x, y - 10 * errorMagnification);
        ctx.lineTo(x, y + 10 * errorMagnification);
        ctx.stroke();
      }

      ctx.fillStyle = '#d32f2f';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Labels
    ctx.fillStyle = '#333333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('1/[S]', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('1/v', 0, 0);
    ctx.restore();

    // Annotations
    ctx.font = '12px Arial';
    ctx.fillStyle = '#4caf50';
    ctx.textAlign = 'left';
    ctx.fillText(`Y-int = 1/Vmax = ${intercept.toFixed(4)}`, xToCanvas(0) + 10, yToCanvas(intercept) - 10);
    ctx.fillText(`Vmax ≈ ${VmaxEst.toFixed(1)}`, xToCanvas(0) + 10, yToCanvas(intercept) + 15);

    ctx.fillStyle = '#ff9800';
    ctx.textAlign = 'center';
    ctx.fillText(`X-int = -1/Km`, xToCanvas(xIntercept), yToCanvas(0) + 20);
    ctx.fillText(`Km ≈ ${KmEst.toFixed(1)}`, xToCanvas(xIntercept), yToCanvas(0) + 35);

  }, [data, activeStep, showErrors, params]);

  // Draw Eadie-Hofstee plot
  useEffect(() => {
    const canvas = ehCanvasRef.current;
    if (!canvas || activeStep < 2) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Transform data: v vs v/[S]
    const transformed = data.map(d => ({
      x: d.v / d.S,
      y: d.v
    }));

    // Linear regression
    const n = transformed.length;
    const sumX = transformed.reduce((s, d) => s + d.x, 0);
    const sumY = transformed.reduce((s, d) => s + d.y, 0);
    const sumXY = transformed.reduce((s, d) => s + d.x * d.y, 0);
    const sumXX = transformed.reduce((s, d) => s + d.x * d.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // EH: v = Vmax - Km(v/[S])
    // slope = -Km, intercept = Vmax
    const VmaxEst = intercept;
    const KmEst = -slope;

    // Scales
    const maxX = Math.max(...transformed.map(d => d.x)) * 1.2;
    const maxY = Math.max(...transformed.map(d => d.y), intercept) * 1.1;

    const xScale = (width - 2 * padding) / maxX;
    const yScale = (height - 2 * padding) / maxY;

    // Grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const x = padding + (i / 5) * (width - 2 * padding);
      const y = padding + (i / 5) * (height - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Regression line
    ctx.strokeStyle = '#9c27b0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding - intercept * yScale);
    const endX = maxX;
    const endY = intercept + slope * endX;
    ctx.lineTo(padding + endX * xScale, height - padding - endY * yScale);
    ctx.stroke();

    // Data points
    transformed.forEach(d => {
      const x = padding + d.x * xScale;
      const y = height - padding - d.y * yScale;

      ctx.fillStyle = '#9c27b0';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Labels
    ctx.fillStyle = '#333333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('v/[S]', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('v', 0, 0);
    ctx.restore();

    // Annotations
    ctx.font = '12px Arial';
    ctx.fillStyle = '#9c27b0';
    ctx.textAlign = 'left';
    ctx.fillText(`Y-int = Vmax ≈ ${VmaxEst.toFixed(1)}`, padding + 10, height - padding - intercept * yScale - 10);
    ctx.fillText(`Slope = -Km ≈ ${KmEst.toFixed(1)}`, width / 2, padding + 20);

  }, [data, activeStep]);

  // Draw Hanes-Woolf plot
  useEffect(() => {
    const canvas = hwCanvasRef.current;
    if (!canvas || activeStep < 3) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Transform data: [S]/v vs [S]
    const transformed = data.map(d => ({
      x: d.S,
      y: d.S / d.v
    }));

    // Linear regression
    const n = transformed.length;
    const sumX = transformed.reduce((s, d) => s + d.x, 0);
    const sumY = transformed.reduce((s, d) => s + d.y, 0);
    const sumXY = transformed.reduce((s, d) => s + d.x * d.y, 0);
    const sumXX = transformed.reduce((s, d) => s + d.x * d.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // HW: [S]/v = [S]/Vmax + Km/Vmax
    // slope = 1/Vmax, intercept = Km/Vmax
    const VmaxEst = 1 / slope;
    const KmEst = intercept * VmaxEst;

    // Scales (include negative x for intercept)
    const maxX = Math.max(...transformed.map(d => d.x)) * 1.1;
    const minX = -KmEst * 1.2;
    const maxY = Math.max(...transformed.map(d => d.y)) * 1.1;

    const xRange = maxX - minX;
    const yRange = maxY;

    const xToCanvas = x => padding + ((x - minX) / xRange) * (width - 2 * padding);
    const yToCanvas = y => height - padding - (y / yRange) * (height - 2 * padding);

    // Grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      const x = padding + (i / 10) * (width - 2 * padding);
      const y = padding + (i / 10) * (height - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    const originX = xToCanvas(0);
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(originX, padding);
    ctx.lineTo(originX, height - padding);
    ctx.stroke();

    // Regression line
    ctx.strokeStyle = '#009688';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const lineStart = minX;
    const lineEnd = maxX;
    ctx.moveTo(xToCanvas(lineStart), yToCanvas(intercept + slope * lineStart));
    ctx.lineTo(xToCanvas(lineEnd), yToCanvas(intercept + slope * lineEnd));
    ctx.stroke();

    // Mark x-intercept
    const xInt = -KmEst;
    ctx.fillStyle = '#ff9800';
    ctx.beginPath();
    ctx.arc(xToCanvas(xInt), yToCanvas(0), 8, 0, Math.PI * 2);
    ctx.fill();

    // Data points
    transformed.forEach(d => {
      ctx.fillStyle = '#009688';
      ctx.beginPath();
      ctx.arc(xToCanvas(d.x), yToCanvas(d.y), 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Labels
    ctx.fillStyle = '#333333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('[S]', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('[S]/v', 0, 0);
    ctx.restore();

    // Annotations
    ctx.font = '12px Arial';
    ctx.fillStyle = '#009688';
    ctx.textAlign = 'left';
    ctx.fillText(`Slope = 1/Vmax`, width / 2 + 50, padding + 30);
    ctx.fillText(`Vmax ≈ ${VmaxEst.toFixed(1)}`, width / 2 + 50, padding + 45);

    ctx.fillStyle = '#ff9800';
    ctx.textAlign = 'center';
    ctx.fillText(`X-int = -Km ≈ ${(-xInt).toFixed(1)}`, xToCanvas(xInt), yToCanvas(0) + 20);

  }, [data, activeStep]);

  const handleNext = () => setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 0));

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Why Did Scientists Need Linear Transformations?
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Historical Context:</strong> Before computers became widely available (pre-1980s),
                fitting non-linear equations to data was extremely difficult. Linear regression, however,
                could be done by hand with a ruler and graph paper!
              </Typography>
            </Alert>

            <Typography paragraph>
              The Michaelis-Menten equation is <strong>non-linear</strong>:
            </Typography>

            <Paper sx={{ p: 2, bgcolor: 'background.default', textAlign: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontFamily: 'serif', fontStyle: 'italic' }}>
                v = V<sub>max</sub> × [S] / (K<sub>m</sub> + [S])
              </Typography>
            </Paper>

            <Typography paragraph>
              Scientists developed algebraic tricks to transform this equation into linear form:
            </Typography>

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), textAlign: 'center', mb: 3 }}>
              <Typography variant="body1">
                <strong>Non-linear:</strong> y = f(x, parameters) → Difficult to fit<br/>
                <strong>Linear:</strong> Y = mX + b → Easy to fit with a straight line!
              </Typography>
            </Paper>

            <Typography paragraph>
              The three most famous linear transformations are:
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
                  <CardContent>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      Lineweaver-Burk (1934)
                    </Typography>
                    <Typography variant="body2">
                      1/v vs 1/[S]<br/>
                      Most famous, but most problematic
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', bgcolor: (theme) => alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ color: '#9c27b0' }} gutterBottom>
                      Eadie-Hofstee (1942)
                    </Typography>
                    <Typography variant="body2">
                      v vs v/[S]<br/>
                      Better error distribution
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', bgcolor: (theme) => alpha(theme.palette.info.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ color: '#009688' }} gutterBottom>
                      Hanes-Woolf (1932)
                    </Typography>
                    <Typography variant="body2">
                      [S]/v vs [S]<br/>
                      Best error properties
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Interactive: Adjust the true parameters
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography>Vmax: {params.Vmax}</Typography>
                  <Slider
                    value={params.Vmax}
                    onChange={(e, v) => setParams(p => ({ ...p, Vmax: v }))}
                    min={50}
                    max={200}
                    valueLabelDisplay="auto"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography>Km: {params.Km}</Typography>
                  <Slider
                    value={params.Km}
                    onChange={(e, v) => setParams(p => ({ ...p, Km: v }))}
                    min={5}
                    max={100}
                    valueLabelDisplay="auto"
                  />
                </Grid>
              </Grid>
              <Button variant="outlined" onClick={regenerateData} sx={{ mt: 1 }}>
                Regenerate Data
              </Button>
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Standard Michaelis-Menten Plot
              </Typography>
              <canvas ref={mmCanvasRef} width={500} height={350} style={{ border: '1px solid #ddd' }} />
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Lineweaver-Burk (Double Reciprocal) Plot
            </Typography>

            <Typography paragraph>
              <strong>Hans Lineweaver and Dean Burk</strong> (1934) derived the most famous linearization
              by taking the reciprocal of both sides of the Michaelis-Menten equation:
            </Typography>

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 3 }}>
              <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                Starting from: v = V<sub>max</sub>[S] / (K<sub>m</sub> + [S])<br/><br/>
                Take reciprocal: 1/v = (K<sub>m</sub> + [S]) / (V<sub>max</sub>[S])<br/><br/>
                Separate: <strong>1/v = (K<sub>m</sub>/V<sub>max</sub>)(1/[S]) + 1/V<sub>max</sub></strong>
              </Typography>
            </Paper>

            <Typography paragraph>
              This has the form <strong>y = mx + b</strong> where:
            </Typography>

            <Table size="small" sx={{ mb: 3 }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Linear Form</strong></TableCell>
                  <TableCell><strong>Parameter</strong></TableCell>
                  <TableCell><strong>Extract From</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Y = 1/v</TableCell>
                  <TableCell>Dependent variable</TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>X = 1/[S]</TableCell>
                  <TableCell>Independent variable</TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Slope = K<sub>m</sub>/V<sub>max</sub></TableCell>
                  <TableCell>K<sub>m</sub></TableCell>
                  <TableCell>Slope × V<sub>max</sub></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ color: '#4caf50' }}>Y-intercept = 1/V<sub>max</sub></TableCell>
                  <TableCell>V<sub>max</sub></TableCell>
                  <TableCell>1 / (Y-intercept)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ color: '#ff9800' }}>X-intercept = -1/K<sub>m</sub></TableCell>
                  <TableCell>K<sub>m</sub></TableCell>
                  <TableCell>-1 / (X-intercept)</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showErrors}
                    onChange={(e) => setShowErrors(e.target.checked)}
                  />
                }
                label="Show error magnification"
              />
              <Typography variant="caption" display="block" color="text.secondary">
                Notice how errors become larger at high 1/[S] (low substrate concentrations)
              </Typography>
            </Box>

            <canvas ref={lwbCanvasRef} width={500} height={400} style={{ border: '1px solid #ddd' }} />

            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Key Problem:</strong> The reciprocal transformation disproportionately magnifies
                errors at low substrate concentrations. Points at low [S] have high 1/[S] values and
                dominate the regression despite having the largest experimental errors.
              </Typography>
            </Alert>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: '#9c27b0' }}>
              Eadie-Hofstee Plot
            </Typography>

            <Typography paragraph>
              <strong>George Eadie</strong> (1942) and <strong>Barend Hofstee</strong> (1959) developed
              an alternative linearization that avoids plotting reciprocals directly:
            </Typography>

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 3 }}>
              <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                Starting from: v = V<sub>max</sub>[S] / (K<sub>m</sub> + [S])<br/><br/>
                Multiply both sides by (K<sub>m</sub> + [S]):<br/>
                v(K<sub>m</sub> + [S]) = V<sub>max</sub>[S]<br/><br/>
                Expand: vK<sub>m</sub> + v[S] = V<sub>max</sub>[S]<br/><br/>
                Rearrange: <strong>v = V<sub>max</sub> - K<sub>m</sub>(v/[S])</strong>
              </Typography>
            </Paper>

            <Typography paragraph>
              This gives us the linear form <strong>y = b + mx</strong> where:
            </Typography>

            <Table size="small" sx={{ mb: 3 }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Variable</strong></TableCell>
                  <TableCell><strong>Meaning</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Y = v</TableCell>
                  <TableCell>Reaction rate (not reciprocal!)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>X = v/[S]</TableCell>
                  <TableCell>Rate divided by substrate</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Y-intercept = V<sub>max</sub></TableCell>
                  <TableCell>Direct reading of V<sub>max</sub></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Slope = -K<sub>m</sub></TableCell>
                  <TableCell>Negative slope gives K<sub>m</sub></TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <canvas ref={ehCanvasRef} width={500} height={400} style={{ border: '1px solid #ddd' }} />

            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Advantages:</strong>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>No reciprocal on y-axis - errors not as severely distorted</li>
                  <li>V<sub>max</sub> is read directly from Y-intercept</li>
                  <li>More uniform distribution of points along the line</li>
                </ul>
              </Typography>
            </Alert>

            <Alert severity="warning" sx={{ mt: 1 }}>
              <Typography variant="body2">
                <strong>Limitation:</strong> Both X and Y axes contain 'v', which means errors in v
                affect both axes. This correlation can distort the regression.
              </Typography>
            </Alert>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: '#009688' }}>
              Hanes-Woolf Plot
            </Typography>

            <Typography paragraph>
              <strong>Charles Hanes</strong> (1932) and <strong>Barnet Woolf</strong> developed
              what is statistically the best of the three linearizations:
            </Typography>

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.info.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 3 }}>
              <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                Starting from Lineweaver-Burk:<br/>
                1/v = (K<sub>m</sub>/V<sub>max</sub>)(1/[S]) + 1/V<sub>max</sub><br/><br/>
                Multiply both sides by [S]:<br/>
                <strong>[S]/v = [S]/V<sub>max</sub> + K<sub>m</sub>/V<sub>max</sub></strong>
              </Typography>
            </Paper>

            <Typography paragraph>
              Linear form <strong>y = mx + b</strong>:
            </Typography>

            <Table size="small" sx={{ mb: 3 }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Variable</strong></TableCell>
                  <TableCell><strong>Meaning</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Y = [S]/v</TableCell>
                  <TableCell>Substrate divided by rate</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>X = [S]</TableCell>
                  <TableCell>Substrate concentration (unchanged!)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Slope = 1/V<sub>max</sub></TableCell>
                  <TableCell>V<sub>max</sub> = 1/slope</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Y-intercept = K<sub>m</sub>/V<sub>max</sub></TableCell>
                  <TableCell>K<sub>m</sub> = intercept × V<sub>max</sub></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>X-intercept = -K<sub>m</sub></TableCell>
                  <TableCell>Direct reading of -K<sub>m</sub></TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <canvas ref={hwCanvasRef} width={500} height={400} style={{ border: '1px solid #ddd' }} />

            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Why Hanes-Woolf is statistically superior:</strong>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>X-axis has <em>no transformation</em> - [S] is the independent variable as measured</li>
                  <li>Error in rate (v) only affects Y-axis, not both</li>
                  <li>More even spread of data points along x-axis</li>
                  <li>Less weight given to imprecise low-[S] measurements</li>
                </ul>
              </Typography>
            </Alert>
          </Box>
        );

      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="error">
              The Error Propagation Problem
            </Typography>

            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>CRITICAL UNDERSTANDING:</strong> All linear transformations distort experimental
                errors, leading to biased parameter estimates. This is why modern software uses
                non-linear regression instead.
              </Typography>
            </Alert>

            <Typography variant="subtitle1" gutterBottom>
              Error Distortion in Lineweaver-Burk
            </Typography>

            <Typography paragraph>
              When we transform v → 1/v, small errors at low v values become enormous:
            </Typography>

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 3 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                If v = 10 ± 1 (10% error):<br/>
                1/v = 0.100 ± 0.01 (10% relative error)<br/><br/>
                If v = 2 ± 0.5 (25% error):<br/>
                1/v = 0.50 ± 0.125 (25% relative error, but now HUGE on graph)<br/><br/>
                At low [S], rate measurements are least reliable,<br/>
                yet 1/[S] is largest, so these points dominate the fit!
              </Typography>
            </Paper>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Interactive: See how noise affects different transformations
              </Typography>
              <Typography>Noise Level: {(noiseLevel * 100).toFixed(0)}%</Typography>
              <Slider
                value={noiseLevel}
                onChange={(e, v) => setNoiseLevel(v)}
                min={0}
                max={0.3}
                step={0.01}
                valueLabelDisplay="auto"
                valueLabelFormat={v => `${(v * 100).toFixed(0)}%`}
              />
              <Button variant="outlined" onClick={regenerateData} sx={{ mt: 1 }}>
                Regenerate with New Noise
              </Button>
            </Box>

            <Typography variant="subtitle1" gutterBottom>
              Comparison of Parameter Estimates
            </Typography>

            {(() => {
              // Calculate estimates from each method
              const calcLWB = () => {
                const trans = data.map(d => ({ x: 1/d.S, y: 1/d.v }));
                const n = trans.length;
                const sumX = trans.reduce((s, d) => s + d.x, 0);
                const sumY = trans.reduce((s, d) => s + d.y, 0);
                const sumXY = trans.reduce((s, d) => s + d.x * d.y, 0);
                const sumXX = trans.reduce((s, d) => s + d.x * d.x, 0);
                const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
                const intercept = (sumY - slope * sumX) / n;
                return { Vmax: 1/intercept, Km: slope/intercept };
              };

              const calcEH = () => {
                const trans = data.map(d => ({ x: d.v/d.S, y: d.v }));
                const n = trans.length;
                const sumX = trans.reduce((s, d) => s + d.x, 0);
                const sumY = trans.reduce((s, d) => s + d.y, 0);
                const sumXY = trans.reduce((s, d) => s + d.x * d.y, 0);
                const sumXX = trans.reduce((s, d) => s + d.x * d.x, 0);
                const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
                const intercept = (sumY - slope * sumX) / n;
                return { Vmax: intercept, Km: -slope };
              };

              const calcHW = () => {
                const trans = data.map(d => ({ x: d.S, y: d.S/d.v }));
                const n = trans.length;
                const sumX = trans.reduce((s, d) => s + d.x, 0);
                const sumY = trans.reduce((s, d) => s + d.y, 0);
                const sumXY = trans.reduce((s, d) => s + d.x * d.y, 0);
                const sumXX = trans.reduce((s, d) => s + d.x * d.x, 0);
                const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
                const intercept = (sumY - slope * sumX) / n;
                return { Vmax: 1/slope, Km: intercept/slope };
              };

              const lwb = calcLWB();
              const eh = calcEH();
              const hw = calcHW();

              return (
                <Table size="small" sx={{ mb: 3 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Method</strong></TableCell>
                      <TableCell align="right"><strong>V<sub>max</sub> est.</strong></TableCell>
                      <TableCell align="right"><strong>Error</strong></TableCell>
                      <TableCell align="right"><strong>K<sub>m</sub> est.</strong></TableCell>
                      <TableCell align="right"><strong>Error</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow sx={{ bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
                      <TableCell>True Value</TableCell>
                      <TableCell align="right">{params.Vmax}</TableCell>
                      <TableCell align="right">-</TableCell>
                      <TableCell align="right">{params.Km}</TableCell>
                      <TableCell align="right">-</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Lineweaver-Burk</TableCell>
                      <TableCell align="right">{lwb.Vmax.toFixed(1)}</TableCell>
                      <TableCell align="right" sx={{ color: Math.abs(lwb.Vmax - params.Vmax) > 10 ? 'red' : 'inherit' }}>
                        {((lwb.Vmax - params.Vmax) / params.Vmax * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell align="right">{lwb.Km.toFixed(1)}</TableCell>
                      <TableCell align="right" sx={{ color: Math.abs(lwb.Km - params.Km) > 5 ? 'red' : 'inherit' }}>
                        {((lwb.Km - params.Km) / params.Km * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Eadie-Hofstee</TableCell>
                      <TableCell align="right">{eh.Vmax.toFixed(1)}</TableCell>
                      <TableCell align="right">
                        {((eh.Vmax - params.Vmax) / params.Vmax * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell align="right">{eh.Km.toFixed(1)}</TableCell>
                      <TableCell align="right">
                        {((eh.Km - params.Km) / params.Km * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Hanes-Woolf</TableCell>
                      <TableCell align="right">{hw.Vmax.toFixed(1)}</TableCell>
                      <TableCell align="right">
                        {((hw.Vmax - params.Vmax) / params.Vmax * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell align="right">{hw.Km.toFixed(1)}</TableCell>
                      <TableCell align="right">
                        {((hw.Km - params.Km) / params.Km * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              );
            })()}

            <Alert severity="info">
              <Typography variant="body2">
                <strong>Try increasing the noise level</strong> to see how Lineweaver-Burk estimates
                become increasingly unreliable compared to Hanes-Woolf.
              </Typography>
            </Alert>
          </Box>
        );

      case 5:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Modern Recommendations
            </Typography>

            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Bottom Line:</strong> Always use non-linear regression (Levenberg-Marquardt)
                for fitting kinetic data. Use linear plots only for visualization and diagnosis.
              </Typography>
            </Alert>

            <Typography variant="subtitle1" gutterBottom>
              Why Non-Linear Regression is Superior
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="error" gutterBottom>
                      Linear Transformations
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      <li>Distort error structure</li>
                      <li>Give unequal weight to points</li>
                      <li>Can produce negative parameters</li>
                      <li>Different methods give different answers</li>
                      <li>Statistical assumptions violated</li>
                    </ul>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="success.main" gutterBottom>
                      Non-Linear Regression
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      <li>Preserves error structure</li>
                      <li>Proper weighting of all points</li>
                      <li>Can constrain positive parameters</li>
                      <li>Single, optimal answer</li>
                      <li>Valid confidence intervals</li>
                    </ul>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Typography variant="subtitle1" gutterBottom>
              When Linear Plots Are Still Useful
            </Typography>

            <Typography paragraph>
              Despite their limitations for parameter estimation, linear plots remain valuable:
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Diagnosis
                  </Typography>
                  <Typography variant="body2">
                    Lineweaver-Burk plots clearly show deviations from ideal Michaelis-Menten
                    behavior (cooperativity, substrate inhibition, etc.)
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    <ScienceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Inhibitor Analysis
                  </Typography>
                  <Typography variant="body2">
                    Classic pattern recognition for inhibition types (competitive, non-competitive)
                    is easiest on Lineweaver-Burk plots
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    <InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Teaching
                  </Typography>
                  <Typography variant="body2">
                    Understanding these transformations helps students grasp the mathematical
                    relationships in enzyme kinetics
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" gutterBottom>
              Summary: Comparison of Methods
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Method</strong></TableCell>
                  <TableCell><strong>Plot</strong></TableCell>
                  <TableCell><strong>Error Distortion</strong></TableCell>
                  <TableCell><strong>Use For</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Lineweaver-Burk</TableCell>
                  <TableCell>1/v vs 1/[S]</TableCell>
                  <TableCell>
                    <Chip label="Severe" size="small" color="error" />
                  </TableCell>
                  <TableCell>Inhibitor pattern diagnosis</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Eadie-Hofstee</TableCell>
                  <TableCell>v vs v/[S]</TableCell>
                  <TableCell>
                    <Chip label="Moderate" size="small" color="warning" />
                  </TableCell>
                  <TableCell>Quick visual estimate</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Hanes-Woolf</TableCell>
                  <TableCell>[S]/v vs [S]</TableCell>
                  <TableCell>
                    <Chip label="Minimal" size="small" color="success" />
                  </TableCell>
                  <TableCell>Best linear estimate</TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
                  <TableCell><strong>Non-linear (LM)</strong></TableCell>
                  <TableCell>v vs [S]</TableCell>
                  <TableCell>
                    <Chip label="None" size="small" color="success" />
                  </TableCell>
                  <TableCell><strong>Always preferred</strong></TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Historical Note:</strong> The Lineweaver-Burk plot remains one of the most
                cited papers in biochemistry history (Lineweaver & Burk, 1934, JACS). Despite its
                statistical flaws, it revolutionized enzyme kinetics by making parameter estimation
                accessible before computers.
              </Typography>
            </Alert>

            <Paper sx={{ p: 2, mt: 3, bgcolor: 'background.default' }}>
              <Typography variant="subtitle1" gutterBottom>
                Key References
              </Typography>
              <Typography variant="body2" component="div">
                <ul style={{ margin: 0 }}>
                  <li>Lineweaver, H. & Burk, D. (1934). The Determination of Enzyme Dissociation Constants. <em>J. Am. Chem. Soc.</em> 56, 658-666.</li>
                  <li>Hanes, C.S. (1932). Studies on Plant Amylases. <em>Biochem. J.</em> 26, 1406-1421.</li>
                  <li>Eadie, G.S. (1942). The Inhibition of Cholinesterase by Physostigmine and Prostigmine. <em>J. Biol. Chem.</em> 146, 85-93.</li>
                  <li>Cornish-Bowden, A. (2012). <em>Fundamentals of Enzyme Kinetics</em>. 4th ed. Wiley-Blackwell.</li>
                </ul>
              </Typography>
            </Paper>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TimelineIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box>
            <Typography variant="h4">
              Lesson 3: Linear Transformation Methods
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Lineweaver-Burk, Eadie-Hofstee, and Hanes-Woolf Plots
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label="Intermediate" color="primary" size="small" />
          <Chip label="~25 minutes" variant="outlined" size="small" />
          <Chip label="Historical Methods" variant="outlined" size="small" />
          <Chip label="Error Analysis" variant="outlined" size="small" />
        </Box>
      </Paper>

      <Stepper activeStep={activeStep} orientation="vertical">
        {STEPS.map((label, index) => (
          <Step key={label}>
            <StepLabel
              sx={{ cursor: 'pointer' }}
              onClick={() => setActiveStep(index)}
            >
              {label}
            </StepLabel>
            <StepContent>
              <Box sx={{ mb: 2 }}>
                {renderStepContent(index)}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  disabled={index === 0}
                  onClick={handleBack}
                  startIcon={<PrevIcon />}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  endIcon={index < STEPS.length - 1 ? <NextIcon /> : <CheckIcon />}
                >
                  {index === STEPS.length - 1 ? 'Complete Lesson' : 'Continue'}
                </Button>
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>

      {activeStep === STEPS.length && (
        <Paper sx={{ p: 3, mt: 3, bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
          <Typography variant="h5" gutterBottom color="success.main">
            <CheckIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Lesson Complete!
          </Typography>
          <Typography paragraph>
            You've learned about the three classical linear transformations of the Michaelis-Menten
            equation, their mathematical derivations, and why non-linear regression is now the
            preferred method.
          </Typography>
          <Typography variant="subtitle2" gutterBottom>
            Key Takeaways:
          </Typography>
          <ul>
            <li>Lineweaver-Burk: 1/v vs 1/[S] - most famous but worst statistically</li>
            <li>Eadie-Hofstee: v vs v/[S] - better but has correlated axes</li>
            <li>Hanes-Woolf: [S]/v vs [S] - best linear method</li>
            <li>Non-linear regression is always preferred for parameter estimation</li>
            <li>Linear plots remain useful for diagnosis and teaching</li>
          </ul>
          <Button variant="outlined" onClick={() => setActiveStep(0)} sx={{ mt: 2 }}>
            Review Lesson
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default Lesson3_LinearTransformations;
