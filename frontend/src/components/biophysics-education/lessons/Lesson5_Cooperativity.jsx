/**
 * Lesson 5: Cooperativity and the Hill Equation
 *
 * Comprehensive coverage of cooperative binding:
 * - What is cooperativity
 * - Positive vs negative cooperativity
 * - The Hill equation and Hill coefficient
 * - Hemoglobin as classic example
 * - Allosteric enzymes
 * - Physiological significance
 *
 * ~850 lines of educational content
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Science as ScienceIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckIcon,
  Favorite as HeartIcon
} from '@mui/icons-material';

const STEPS = [
  'What is Cooperativity?',
  'The Hill Equation',
  'Hill Plot Analysis',
  'Hemoglobin: The Classic Example',
  'Allosteric Enzymes',
  'Physiological Significance'
];

const Lesson5_Cooperativity = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [hillParams, setHillParams] = useState({
    Vmax: 100,
    K05: 25,
    n: 1
  });
  const [showComparison, setShowComparison] = useState(false);
  const [oxygenParams, setOxygenParams] = useState({
    pO2: 0, // partial pressure
    showMyoglobin: true,
    showHemoglobin: true
  });

  const mmCanvasRef = useRef(null);
  const hillPlotCanvasRef = useRef(null);
  const oxygenCanvasRef = useRef(null);
  const allostericCanvasRef = useRef(null);

  // Calculate Hill equation: v = Vmax * S^n / (K0.5^n + S^n)
  const hillEquation = useCallback((S, Vmax, K05, n) => {
    if (S === 0) return 0;
    const Sn = Math.pow(S, n);
    const K05n = Math.pow(K05, n);
    return (Vmax * Sn) / (K05n + Sn);
  }, []);

  // Draw Hill curve comparison
  useEffect(() => {
    const canvas = mmCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const maxS = 100;
    const maxV = hillParams.Vmax * 1.1;

    const xScale = (width - 2 * padding) / maxS;
    const yScale = (height - 2 * padding) / maxV;

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

    // Draw comparison curves if enabled
    if (showComparison) {
      // n = 1 (hyperbolic)
      ctx.strokeStyle = '#9e9e9e';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      for (let S = 0; S <= maxS; S += 0.5) {
        const v = hillEquation(S, hillParams.Vmax, hillParams.K05, 1);
        const x = padding + S * xScale;
        const y = height - padding - v * yScale;
        if (S === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Main Hill curve
    const getColor = (n) => {
      if (n < 1) return '#e91e63'; // Negative cooperativity
      if (n > 1) return '#4caf50'; // Positive cooperativity
      return '#1976d2'; // No cooperativity
    };

    ctx.strokeStyle = getColor(hillParams.n);
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let S = 0; S <= maxS; S += 0.5) {
      const v = hillEquation(S, hillParams.Vmax, hillParams.K05, hillParams.n);
      const x = padding + S * xScale;
      const y = height - padding - v * yScale;
      if (S === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Vmax line
    ctx.strokeStyle = '#ff9800';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    const vmaxY = height - padding - hillParams.Vmax * yScale;
    ctx.beginPath();
    ctx.moveTo(padding, vmaxY);
    ctx.lineTo(width - padding, vmaxY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Half-Vmax line
    ctx.strokeStyle = '#ff9800';
    ctx.setLineDash([3, 3]);
    const halfVmaxY = height - padding - (hillParams.Vmax / 2) * yScale;
    ctx.beginPath();
    ctx.moveTo(padding, halfVmaxY);
    ctx.lineTo(width - padding, halfVmaxY);
    ctx.stroke();

    // K0.5 mark
    const k05X = padding + hillParams.K05 * xScale;
    ctx.beginPath();
    ctx.moveTo(k05X, height - padding);
    ctx.lineTo(k05X, halfVmaxY);
    ctx.stroke();
    ctx.setLineDash([]);

    // K0.5 point
    ctx.fillStyle = '#ff9800';
    ctx.beginPath();
    ctx.arc(k05X, halfVmaxY, 6, 0, Math.PI * 2);
    ctx.fill();

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

    // Annotations
    ctx.font = '12px Arial';
    ctx.fillStyle = '#ff9800';
    ctx.textAlign = 'left';
    ctx.fillText(`K₀.₅ = ${hillParams.K05}`, k05X + 5, height - padding - 20);
    ctx.fillText('Vmax/2', padding + 5, halfVmaxY - 5);
    ctx.fillText('Vmax', padding + 5, vmaxY - 5);

    // Cooperativity indicator
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = getColor(hillParams.n);
    const label = hillParams.n > 1 ? 'Positive Cooperativity (n > 1)' :
                  hillParams.n < 1 ? 'Negative Cooperativity (n < 1)' :
                  'No Cooperativity (n = 1)';
    ctx.fillText(label, width / 2 - 80, padding + 20);

    // Legend
    if (showComparison) {
      ctx.font = '12px Arial';
      ctx.fillStyle = '#9e9e9e';
      ctx.fillText('--- n = 1 (hyperbolic)', width - padding - 120, padding + 40);
    }

  }, [hillParams, showComparison, hillEquation]);

  // Draw Hill plot (log-log)
  useEffect(() => {
    const canvas = hillPlotCanvasRef.current;
    if (!canvas || activeStep < 2) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Generate data points
    const dataPoints = [];
    for (let S = 1; S <= 200; S += 5) {
      const v = hillEquation(S, hillParams.Vmax, hillParams.K05, hillParams.n);
      const Y = v / hillParams.Vmax;
      if (Y > 0.01 && Y < 0.99) {
        dataPoints.push({
          logS: Math.log10(S),
          logYRatio: Math.log10(Y / (1 - Y))
        });
      }
    }

    // Scales
    const minLogS = Math.min(...dataPoints.map(d => d.logS));
    const maxLogS = Math.max(...dataPoints.map(d => d.logS));
    const minLogY = Math.min(...dataPoints.map(d => d.logYRatio));
    const maxLogY = Math.max(...dataPoints.map(d => d.logYRatio));

    const xRange = maxLogS - minLogS + 1;
    const yRange = maxLogY - minLogY + 2;

    const xToCanvas = x => padding + ((x - minLogS + 0.5) / xRange) * (width - 2 * padding);
    const yToCanvas = y => height - padding - ((y - minLogY + 1) / yRange) * (height - 2 * padding);

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

    // Axes (at y=0)
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, yToCanvas(0));
    ctx.lineTo(width - padding, yToCanvas(0));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(xToCanvas(Math.log10(hillParams.K05)), padding);
    ctx.lineTo(xToCanvas(Math.log10(hillParams.K05)), height - padding);
    ctx.stroke();

    // Draw the Hill plot line (should be linear with slope = n)
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    dataPoints.forEach((d, i) => {
      const x = xToCanvas(d.logS);
      const y = yToCanvas(d.logYRatio);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Data points
    ctx.fillStyle = '#1976d2';
    dataPoints.forEach(d => {
      ctx.beginPath();
      ctx.arc(xToCanvas(d.logS), yToCanvas(d.logYRatio), 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Mark K0.5 point (where Y/(1-Y) = 1, so log = 0)
    ctx.fillStyle = '#ff9800';
    ctx.beginPath();
    ctx.arc(xToCanvas(Math.log10(hillParams.K05)), yToCanvas(0), 8, 0, Math.PI * 2);
    ctx.fill();

    // Labels
    ctx.fillStyle = '#333333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('log₁₀[S]', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('log₁₀(Y/(1-Y))', 0, 0);
    ctx.restore();

    // Slope annotation
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#1976d2';
    ctx.textAlign = 'left';
    ctx.fillText(`Slope = n = ${hillParams.n.toFixed(2)}`, padding + 20, padding + 30);

    ctx.font = '12px Arial';
    ctx.fillStyle = '#ff9800';
    ctx.fillText(`log K₀.₅ = ${Math.log10(hillParams.K05).toFixed(2)}`, xToCanvas(Math.log10(hillParams.K05)) + 10, yToCanvas(0) - 10);

  }, [hillParams, activeStep, hillEquation]);

  // Draw oxygen binding curves
  useEffect(() => {
    const canvas = oxygenCanvasRef.current;
    if (!canvas || activeStep < 3) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const maxPO2 = 120; // mmHg
    const maxY = 1.1; // fractional saturation

    const xScale = (width - 2 * padding) / maxPO2;
    const yScale = (height - 2 * padding) / maxY;

    // Grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 6; i++) {
      const x = padding + (i / 6) * (width - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();

      // X-axis labels
      ctx.fillStyle = '#666';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(i * 20)}`, x, height - padding + 15);
    }
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i / 5) * (height - 2 * padding);
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

    // Myoglobin (n = 1, P50 ~ 3 mmHg)
    if (oxygenParams.showMyoglobin) {
      ctx.strokeStyle = '#1976d2';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let pO2 = 0; pO2 <= maxPO2; pO2 += 0.5) {
        const Y = pO2 / (3 + pO2); // Hyperbolic, P50 = 3
        const x = padding + pO2 * xScale;
        const y = height - padding - Y * yScale;
        if (pO2 === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Hemoglobin (n ~ 2.8, P50 ~ 26 mmHg)
    if (oxygenParams.showHemoglobin) {
      ctx.strokeStyle = '#d32f2f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let pO2 = 0; pO2 <= maxPO2; pO2 += 0.5) {
        const n = 2.8;
        const P50 = 26;
        const pO2n = Math.pow(pO2, n);
        const P50n = Math.pow(P50, n);
        const Y = pO2n / (P50n + pO2n);
        const x = padding + pO2 * xScale;
        const y = height - padding - Y * yScale;
        if (pO2 === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Reference lines for tissue and lung pO2
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#4caf50';
    ctx.lineWidth = 1;

    // Lung (100 mmHg)
    const lungX = padding + 100 * xScale;
    ctx.beginPath();
    ctx.moveTo(lungX, padding);
    ctx.lineTo(lungX, height - padding);
    ctx.stroke();

    // Tissue (40 mmHg)
    const tissueX = padding + 40 * xScale;
    ctx.strokeStyle = '#ff9800';
    ctx.beginPath();
    ctx.moveTo(tissueX, padding);
    ctx.lineTo(tissueX, height - padding);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = '#333333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('pO₂ (mmHg)', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Fractional Saturation (Y)', 0, 0);
    ctx.restore();

    // Legend
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    if (oxygenParams.showMyoglobin) {
      ctx.fillStyle = '#1976d2';
      ctx.fillText('— Myoglobin (n=1)', padding + 10, padding + 20);
    }
    if (oxygenParams.showHemoglobin) {
      ctx.fillStyle = '#d32f2f';
      ctx.fillText('— Hemoglobin (n≈2.8)', padding + 10, padding + 40);
    }

    ctx.fillStyle = '#4caf50';
    ctx.fillText('Lungs', lungX - 15, padding + 60);
    ctx.fillStyle = '#ff9800';
    ctx.fillText('Tissues', tissueX - 20, padding + 60);

  }, [oxygenParams, activeStep]);

  const handleNext = () => setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 0));

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              What is Cooperativity?
            </Typography>

            <Typography paragraph>
              Cooperativity occurs when the binding of one ligand to a multi-subunit protein
              affects the binding affinity of subsequent ligands. This creates a
              <strong> sigmoidal (S-shaped)</strong> binding curve instead of the normal
              hyperbolic curve.
            </Typography>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', bgcolor: '#e8f5e9' }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ color: '#4caf50', display: 'flex', alignItems: 'center' }}>
                      <TrendingUpIcon sx={{ mr: 1 }} />
                      Positive Cooperativity (n &gt; 1)
                    </Typography>
                    <Typography variant="body2">
                      First ligand binding <strong>increases</strong> affinity for subsequent ligands.
                      The curve is sigmoidal with a steep transition region.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Example:</strong> Hemoglobin - once one O₂ binds, the other
                      subunits become "eager" to bind more O₂.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', bgcolor: '#fce4ec' }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ color: '#e91e63', display: 'flex', alignItems: 'center' }}>
                      <TrendingDownIcon sx={{ mr: 1 }} />
                      Negative Cooperativity (n &lt; 1)
                    </Typography>
                    <Typography variant="body2">
                      First ligand binding <strong>decreases</strong> affinity for subsequent ligands.
                      The curve is shallower than hyperbolic.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Example:</strong> Some receptor tyrosine kinases show negative
                      cooperativity.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Key Insight:</strong> Cooperativity is an emergent property of multi-subunit
                proteins. Single-subunit proteins (like myoglobin) cannot show cooperativity.
              </Typography>
            </Alert>

            <Typography variant="subtitle1" gutterBottom>
              Interactive: Adjust the Hill Coefficient
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={4}>
                <Typography>Hill coefficient (n): {hillParams.n.toFixed(2)}</Typography>
                <Slider
                  value={hillParams.n}
                  onChange={(e, v) => setHillParams(p => ({ ...p, n: v }))}
                  min={0.3}
                  max={4}
                  step={0.1}
                  marks={[
                    { value: 0.5, label: '0.5' },
                    { value: 1, label: '1' },
                    { value: 2, label: '2' },
                    { value: 4, label: '4' }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography>K₀.₅: {hillParams.K05}</Typography>
                <Slider
                  value={hillParams.K05}
                  onChange={(e, v) => setHillParams(p => ({ ...p, K05: v }))}
                  min={5}
                  max={50}
                  valueLabelDisplay="auto"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  variant={showComparison ? 'contained' : 'outlined'}
                  onClick={() => setShowComparison(!showComparison)}
                  sx={{ mt: 2 }}
                >
                  {showComparison ? 'Hide' : 'Show'} n=1 Reference
                </Button>
              </Grid>
            </Grid>

            <canvas ref={mmCanvasRef} width={500} height={350} style={{ border: '1px solid #ddd', display: 'block', margin: '0 auto' }} />
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              The Hill Equation
            </Typography>

            <Typography paragraph>
              The Hill equation is an empirical equation that describes cooperative binding.
              It was developed by <strong>Archibald Hill</strong> in 1910 to describe
              oxygen binding to hemoglobin.
            </Typography>

            <Paper sx={{ p: 2, bgcolor: '#e3f2fd', mb: 3 }}>
              <Typography variant="h6" align="center" sx={{ fontFamily: 'serif', mb: 2 }}>
                v = V<sub>max</sub> × [S]<sup>n</sup> / (K<sub>0.5</sub><sup>n</sup> + [S]<sup>n</sup>)
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                Where:<br/>
                • V<sub>max</sub> = maximum velocity<br/>
                • [S] = substrate concentration<br/>
                • K<sub>0.5</sub> = substrate concentration at half-maximal velocity<br/>
                • n = Hill coefficient (measure of cooperativity)
              </Typography>
            </Paper>

            <Typography variant="subtitle1" gutterBottom>
              Interpreting the Hill Coefficient
            </Typography>

            <Table size="small" sx={{ mb: 3 }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>n Value</strong></TableCell>
                  <TableCell><strong>Interpretation</strong></TableCell>
                  <TableCell><strong>Curve Shape</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ color: '#e91e63' }}>n &lt; 1</TableCell>
                  <TableCell>Negative cooperativity</TableCell>
                  <TableCell>Shallower than hyperbolic</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ color: '#1976d2' }}>n = 1</TableCell>
                  <TableCell>No cooperativity (Michaelis-Menten)</TableCell>
                  <TableCell>Hyperbolic</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ color: '#4caf50' }}>n &gt; 1</TableCell>
                  <TableCell>Positive cooperativity</TableCell>
                  <TableCell>Sigmoidal</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ color: '#4caf50' }}>n = number of subunits</TableCell>
                  <TableCell>Maximum possible cooperativity</TableCell>
                  <TableCell>Very sharp transition</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Important:</strong> The Hill coefficient is NOT the same as the number of
                binding sites! It's a measure of cooperativity. For hemoglobin (4 sites), n ≈ 2.8,
                not 4.
              </Typography>
            </Alert>

            <Typography variant="subtitle1" gutterBottom>
              Relationship to Michaelis-Menten
            </Typography>

            <Paper sx={{ p: 2, bgcolor: '#f5f5f5', mb: 3 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                When n = 1, the Hill equation reduces to Michaelis-Menten:<br/><br/>
                v = V<sub>max</sub> × [S]<sup>1</sup> / (K<sub>0.5</sub><sup>1</sup> + [S]<sup>1</sup>)<br/>
                v = V<sub>max</sub> × [S] / (K<sub>m</sub> + [S])<br/><br/>
                K<sub>0.5</sub> = K<sub>m</sub> when n = 1
              </Typography>
            </Paper>

            <canvas ref={mmCanvasRef} width={500} height={350} style={{ border: '1px solid #ddd', display: 'block', margin: '0 auto' }} />
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Hill Plot Analysis
            </Typography>

            <Typography paragraph>
              The <strong>Hill plot</strong> is a linearization of the Hill equation that allows
              determination of n from experimental data.
            </Typography>

            <Paper sx={{ p: 2, bgcolor: '#e3f2fd', mb: 3 }}>
              <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                Starting from: Y = [S]ⁿ / (K<sub>0.5</sub>ⁿ + [S]ⁿ)<br/>
                where Y = v/V<sub>max</sub> (fractional saturation)<br/><br/>
                Rearrange: Y(K<sub>0.5</sub>ⁿ + [S]ⁿ) = [S]ⁿ<br/>
                Y×K<sub>0.5</sub>ⁿ = [S]ⁿ - Y×[S]ⁿ = [S]ⁿ(1-Y)<br/>
                Y/(1-Y) = [S]ⁿ/K<sub>0.5</sub>ⁿ<br/><br/>
                Take log: <strong>log(Y/(1-Y)) = n×log[S] - n×log(K<sub>0.5</sub>)</strong>
              </Typography>
            </Paper>

            <Typography paragraph>
              This has the form <strong>y = mx + b</strong>:
            </Typography>

            <Table size="small" sx={{ mb: 3 }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Plot Element</strong></TableCell>
                  <TableCell><strong>Value</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Y-axis</TableCell>
                  <TableCell>log(Y/(1-Y))</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>X-axis</TableCell>
                  <TableCell>log[S]</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ color: '#1976d2', fontWeight: 'bold' }}>Slope</TableCell>
                  <TableCell sx={{ color: '#1976d2', fontWeight: 'bold' }}>n (Hill coefficient)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>X-intercept (when Y/(1-Y) = 1)</TableCell>
                  <TableCell>log(K<sub>0.5</sub>)</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography>Hill coefficient (n): {hillParams.n.toFixed(2)}</Typography>
                <Slider
                  value={hillParams.n}
                  onChange={(e, v) => setHillParams(p => ({ ...p, n: v }))}
                  min={0.5}
                  max={4}
                  step={0.1}
                  valueLabelDisplay="auto"
                />
              </Grid>
              <Grid item xs={6}>
                <Typography>K₀.₅: {hillParams.K05}</Typography>
                <Slider
                  value={hillParams.K05}
                  onChange={(e, v) => setHillParams(p => ({ ...p, K05: v }))}
                  min={5}
                  max={50}
                  valueLabelDisplay="auto"
                />
              </Grid>
            </Grid>

            <canvas ref={hillPlotCanvasRef} width={500} height={400} style={{ border: '1px solid #ddd', display: 'block', margin: '0 auto' }} />

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Key Point:</strong> The slope of the Hill plot equals the Hill coefficient.
                For positive cooperativity (n &gt; 1), the line is steeper than 45°.
              </Typography>
            </Alert>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', display: 'flex', alignItems: 'center' }}>
              <HeartIcon sx={{ mr: 1 }} />
              Hemoglobin: The Classic Example
            </Typography>

            <Typography paragraph>
              Hemoglobin is the textbook example of positive cooperativity. It has
              <strong> 4 subunits</strong> (α₂β₂), each with a heme group that can bind one O₂.
            </Typography>

            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Physiological Significance:</strong> Cooperative O₂ binding allows
                hemoglobin to load oxygen efficiently in the lungs and release it efficiently
                in the tissues. This wouldn't be possible with hyperbolic binding!
              </Typography>
            </Alert>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Hemoglobin (4 subunits)
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      <li>P<sub>50</sub> ≈ 26 mmHg</li>
                      <li>Hill coefficient n ≈ 2.8</li>
                      <li>Sigmoidal binding curve</li>
                      <li>Large O₂ delivery to tissues</li>
                    </ul>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: '#1976d2' }} gutterBottom>
                      Myoglobin (1 subunit)
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      <li>P<sub>50</sub> ≈ 3 mmHg</li>
                      <li>Hill coefficient n = 1</li>
                      <li>Hyperbolic binding curve</li>
                      <li>High affinity O₂ storage</li>
                    </ul>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Box sx={{ mb: 2 }}>
              <ToggleButtonGroup
                value={[
                  oxygenParams.showMyoglobin ? 'myoglobin' : '',
                  oxygenParams.showHemoglobin ? 'hemoglobin' : ''
                ].filter(Boolean)}
                onChange={(e, newValues) => {
                  setOxygenParams(p => ({
                    ...p,
                    showMyoglobin: newValues.includes('myoglobin'),
                    showHemoglobin: newValues.includes('hemoglobin')
                  }));
                }}
                size="small"
              >
                <ToggleButton value="myoglobin" sx={{ color: '#1976d2' }}>
                  Myoglobin
                </ToggleButton>
                <ToggleButton value="hemoglobin" sx={{ color: '#d32f2f' }}>
                  Hemoglobin
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <canvas ref={oxygenCanvasRef} width={500} height={350} style={{ border: '1px solid #ddd', display: 'block', margin: '0 auto' }} />

            <Paper sx={{ p: 2, mt: 3, bgcolor: '#fff3e0' }}>
              <Typography variant="subtitle2" gutterBottom>
                Why Cooperativity Matters: O₂ Delivery
              </Typography>
              <Typography variant="body2">
                <strong>In lungs</strong> (pO₂ ≈ 100 mmHg): Hemoglobin is ~98% saturated<br/>
                <strong>In tissues</strong> (pO₂ ≈ 40 mmHg): Hemoglobin drops to ~75% saturated<br/>
                <strong>O₂ released:</strong> 98% - 75% = <strong>23% of capacity</strong><br/><br/>
                If hemoglobin had hyperbolic binding (like myoglobin):<br/>
                In lungs: ~97% saturated, In tissues: ~93% saturated<br/>
                O₂ released: only ~4% of capacity!
              </Typography>
            </Paper>
          </Box>
        );

      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Allosteric Enzymes
            </Typography>

            <Typography paragraph>
              Many regulatory enzymes show cooperative kinetics due to
              <strong> allosteric regulation</strong>. These enzymes have multiple subunits
              and can exist in different conformational states.
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Allosteric:</strong> From Greek "allos" (other) + "stereos" (solid/space).
                Allosteric sites are binding sites distinct from the active site that affect
                enzyme activity.
              </Typography>
            </Alert>

            <Typography variant="subtitle1" gutterBottom>
              The MWC (Monod-Wyman-Changeux) Model
            </Typography>

            <Paper sx={{ p: 2, bgcolor: '#e3f2fd', mb: 3 }}>
              <Typography variant="body2">
                Key assumptions of the MWC "concerted" model:
              </Typography>
              <ul style={{ margin: '10px 0', paddingLeft: 20 }}>
                <li><strong>T state</strong> (tense): Low substrate affinity</li>
                <li><strong>R state</strong> (relaxed): High substrate affinity</li>
                <li>All subunits switch together (concerted transition)</li>
                <li>Substrate binding shifts equilibrium toward R state</li>
              </ul>
            </Paper>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Card sx={{ bgcolor: '#ffebee' }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      T State (Tense)
                    </Typography>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Box sx={{
                        display: 'inline-flex',
                        gap: 0.5,
                        p: 1,
                        border: '3px solid #d32f2f',
                        borderRadius: 2
                      }}>
                        {[1,2,3,4].map(i => (
                          <Box key={i} sx={{
                            width: 30,
                            height: 30,
                            bgcolor: '#ffcdd2',
                            borderRadius: '50%',
                            border: '2px solid #d32f2f'
                          }} />
                        ))}
                      </Box>
                    </Box>
                    <Typography variant="body2" align="center">
                      Low affinity • Constrained • Less active
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ bgcolor: '#e8f5e9' }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      R State (Relaxed)
                    </Typography>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Box sx={{
                        display: 'inline-flex',
                        gap: 1,
                        p: 1,
                        border: '3px solid #4caf50',
                        borderRadius: 2
                      }}>
                        {[1,2,3,4].map(i => (
                          <Box key={i} sx={{
                            width: 35,
                            height: 35,
                            bgcolor: '#c8e6c9',
                            borderRadius: '50%',
                            border: '2px solid #4caf50'
                          }} />
                        ))}
                      </Box>
                    </Box>
                    <Typography variant="body2" align="center">
                      High affinity • Open • More active
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Typography variant="subtitle1" gutterBottom>
              Allosteric Modulators
            </Typography>

            <Table size="small" sx={{ mb: 3 }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Modulator Type</strong></TableCell>
                  <TableCell><strong>Effect</strong></TableCell>
                  <TableCell><strong>Shifts Equilibrium</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ color: '#4caf50' }}>Activator</TableCell>
                  <TableCell>Increases activity, decreases K<sub>0.5</sub></TableCell>
                  <TableCell>Toward R state</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ color: '#d32f2f' }}>Inhibitor</TableCell>
                  <TableCell>Decreases activity, increases K<sub>0.5</sub></TableCell>
                  <TableCell>Toward T state</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Alert severity="success">
              <Typography variant="body2">
                <strong>Example:</strong> Phosphofructokinase (PFK), the key regulatory enzyme
                in glycolysis, is activated by AMP and inhibited by ATP. When energy is low
                (high AMP/ATP ratio), glycolysis speeds up!
              </Typography>
            </Alert>
          </Box>
        );

      case 5:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Physiological Significance of Cooperativity
            </Typography>

            <Typography paragraph>
              Cooperative binding provides cells with powerful regulatory mechanisms that
              hyperbolic binding cannot achieve.
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      1. Ultrasensitive Response
                    </Typography>
                    <Typography variant="body2">
                      Small changes in substrate concentration produce large changes in activity.
                      With n = 4, going from 10% to 90% activity requires only an 81-fold
                      change in [S] (vs. 81× for n = 1).
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      2. Threshold Behavior
                    </Typography>
                    <Typography variant="body2">
                      Activity remains low until substrate crosses a threshold, then increases
                      rapidly. This creates "all-or-none" responses ideal for signaling pathways.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      3. Signal Amplification
                    </Typography>
                    <Typography variant="body2">
                      Cooperativity amplifies signals in cascades. A small change at the top
                      of a pathway produces a large response at the bottom.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      4. Noise Filtering
                    </Typography>
                    <Typography variant="body2">
                      Random fluctuations in substrate below the threshold have minimal effect.
                      Only sustained changes trigger a response.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" gutterBottom>
              Summary: Key Equations
            </Typography>

            <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell><strong>Hill equation</strong></TableCell>
                    <TableCell>v = V<sub>max</sub>[S]<sup>n</sup> / (K<sub>0.5</sub><sup>n</sup> + [S]<sup>n</sup>)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Hill plot</strong></TableCell>
                    <TableCell>log(Y/(1-Y)) = n·log[S] - n·log(K<sub>0.5</sub>)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Fractional saturation</strong></TableCell>
                    <TableCell>Y = v/V<sub>max</sub> = [S]<sup>n</sup> / (K<sub>0.5</sub><sup>n</sup> + [S]<sup>n</sup>)</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>

            <Paper sx={{ p: 2, mt: 3, bgcolor: '#fff3e0' }}>
              <Typography variant="subtitle2" gutterBottom>
                Key References
              </Typography>
              <Typography variant="body2" component="div">
                <ul style={{ margin: 0 }}>
                  <li>Hill, A.V. (1910). The possible effects of the aggregation of the molecules of haemoglobin. <em>J. Physiol.</em> 40, iv-vii.</li>
                  <li>Monod, J., Wyman, J., & Changeux, J.P. (1965). On the nature of allosteric transitions. <em>J. Mol. Biol.</em> 12, 88-118.</li>
                  <li>Koshland, D.E., Nemethy, G., & Filmer, D. (1966). Comparison of experimental binding data and theoretical models. <em>Biochemistry</em> 5, 365-385.</li>
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
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#f8f9fa' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ScienceIcon sx={{ fontSize: 40, color: '#4caf50', mr: 2 }} />
          <Box>
            <Typography variant="h4">
              Lesson 5: Cooperativity & Hill Equation
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Sigmoidal Kinetics, Allosteric Regulation, and Hemoglobin
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label="Intermediate" color="primary" size="small" />
          <Chip label="~30 minutes" variant="outlined" size="small" />
          <Chip label="Hemoglobin" variant="outlined" size="small" />
          <Chip label="Allosteric Regulation" variant="outlined" size="small" />
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
        <Paper sx={{ p: 3, mt: 3, bgcolor: '#e8f5e9' }}>
          <Typography variant="h5" gutterBottom color="success.main">
            <CheckIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Lesson Complete!
          </Typography>
          <Typography paragraph>
            You've mastered cooperative binding, the Hill equation, and understand why
            hemoglobin's sigmoidal binding curve is essential for efficient oxygen transport.
          </Typography>
          <Typography variant="subtitle2" gutterBottom>
            Key Takeaways:
          </Typography>
          <ul>
            <li>Cooperativity produces sigmoidal (S-shaped) binding curves</li>
            <li>Hill coefficient n &gt; 1 indicates positive cooperativity</li>
            <li>Hemoglobin (n ≈ 2.8) delivers O₂ efficiently; myoglobin (n = 1) stores it</li>
            <li>Allosteric enzymes switch between T and R states</li>
            <li>Cooperativity enables ultrasensitive responses in regulation</li>
          </ul>
          <Button variant="outlined" onClick={() => setActiveStep(0)} sx={{ mt: 2 }}>
            Review Lesson
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default Lesson5_Cooperativity;
