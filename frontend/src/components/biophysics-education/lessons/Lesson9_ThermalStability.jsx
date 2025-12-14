/**
 * Lesson 9: Thermal Stability Analysis
 *
 * Comprehensive coverage of protein thermal stability:
 * - Two-state folding model
 * - Melting temperature (Tm)
 * - Thermodynamic parameters (ΔH, ΔG, ΔS)
 * - Van't Hoff analysis
 * - Differential Scanning Calorimetry (DSC)
 * - Practical applications
 *
 * ~800 lines of educational content
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
  TextField,
  InputAdornment
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Thermostat as ThermostatIcon,
  Science as ScienceIcon,
  CheckCircle as CheckIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';

const STEPS = [
  'Protein Thermal Stability',
  'Two-State Model',
  'Melting Curve Analysis',
  'Thermodynamic Parameters',
  'Van\'t Hoff Analysis',
  'Practical Applications'
];

const Lesson9_ThermalStability = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [thermalParams, setThermalParams] = useState({
    Tm: 60, // °C
    deltaH: 300, // kJ/mol
    yNative: 100,
    yDenatured: 10
  });
  const [temperature, setTemperature] = useState(50);
  const [dscParams, setDscParams] = useState({
    Tm: 65,
    deltaH: 400,
    width: 5
  });

  const meltCurveCanvasRef = useRef(null);
  const vanHoffCanvasRef = useRef(null);
  const dscCanvasRef = useRef(null);
  const energyLandscapeCanvasRef = useRef(null);

  // Calculate fraction unfolded using two-state model
  const calculateFractionUnfolded = useCallback((T, Tm, deltaH) => {
    const R = 8.314; // J/mol/K
    const TKelvin = T + 273.15;
    const TmKelvin = Tm + 273.15;
    const deltaHJ = deltaH * 1000; // Convert kJ to J

    // ΔG = ΔH(1 - T/Tm) assuming ΔCp = 0
    const deltaG = deltaHJ * (1 - TKelvin / TmKelvin);

    // K = exp(-ΔG/RT)
    const K = Math.exp(-deltaG / (R * TKelvin));

    // Fraction unfolded = K / (1 + K)
    return K / (1 + K);
  }, []);

  // Draw melting curve
  useEffect(() => {
    const canvas = meltCurveCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const minT = 20;
    const maxT = 100;
    const tRange = maxT - minT;

    const { yNative, yDenatured, Tm, deltaH } = thermalParams;
    const yRange = Math.abs(yNative - yDenatured) * 1.2;
    const minY = Math.min(yNative, yDenatured) - yRange * 0.1;
    const maxY = Math.max(yNative, yDenatured) + yRange * 0.1;

    const tToCanvas = t => padding + ((t - minT) / tRange) * (width - 2 * padding);
    const yToCanvas = y => height - padding - ((y - minY) / (maxY - minY)) * (height - 2 * padding);

    // Grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let t = 20; t <= 100; t += 10) {
      ctx.beginPath();
      ctx.moveTo(tToCanvas(t), padding);
      ctx.lineTo(tToCanvas(t), height - padding);
      ctx.stroke();
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

    // Draw melting curve
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let T = minT; T <= maxT; T += 0.5) {
      const fu = calculateFractionUnfolded(T, Tm, deltaH);
      const signal = yNative + fu * (yDenatured - yNative);
      const x = tToCanvas(T);
      const y = yToCanvas(signal);
      if (T === minT) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Tm marker
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tToCanvas(Tm), height - padding);
    ctx.lineTo(tToCanvas(Tm), padding);
    ctx.stroke();

    // Midpoint marker
    const midSignal = (yNative + yDenatured) / 2;
    ctx.beginPath();
    ctx.moveTo(padding, yToCanvas(midSignal));
    ctx.lineTo(width - padding, yToCanvas(midSignal));
    ctx.stroke();
    ctx.setLineDash([]);

    // Tm point
    ctx.fillStyle = '#1976d2';
    ctx.beginPath();
    ctx.arc(tToCanvas(Tm), yToCanvas(midSignal), 8, 0, Math.PI * 2);
    ctx.fill();

    // Current temperature indicator
    const currentFu = calculateFractionUnfolded(temperature, Tm, deltaH);
    const currentSignal = yNative + currentFu * (yDenatured - yNative);
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.arc(tToCanvas(temperature), yToCanvas(currentSignal), 6, 0, Math.PI * 2);
    ctx.fill();

    // Native and denatured lines
    ctx.strokeStyle = '#666';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padding, yToCanvas(yNative));
    ctx.lineTo(width - padding, yToCanvas(yNative));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(padding, yToCanvas(yDenatured));
    ctx.lineTo(width - padding, yToCanvas(yDenatured));
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = '#333333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Temperature (°C)', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Signal (CD, Fluorescence, etc.)', 0, 0);
    ctx.restore();

    // Annotations
    ctx.font = '12px Arial';
    ctx.fillStyle = '#1976d2';
    ctx.textAlign = 'center';
    ctx.fillText(`Tm = ${Tm}°C`, tToCanvas(Tm), height - padding + 25);

    ctx.fillStyle = '#666';
    ctx.textAlign = 'right';
    ctx.fillText('Native', padding - 5, yToCanvas(yNative) + 4);
    ctx.fillText('Denatured', padding - 5, yToCanvas(yDenatured) + 4);

    // Current state info
    ctx.fillStyle = '#4caf50';
    ctx.textAlign = 'left';
    ctx.fillText(`T = ${temperature}°C`, tToCanvas(temperature) + 10, yToCanvas(currentSignal) - 10);
    ctx.fillText(`${(currentFu * 100).toFixed(1)}% unfolded`, tToCanvas(temperature) + 10, yToCanvas(currentSignal) + 5);

  }, [thermalParams, temperature, calculateFractionUnfolded]);

  // Draw Van't Hoff plot
  useEffect(() => {
    const canvas = vanHoffCanvasRef.current;
    if (!canvas || activeStep < 4) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const { Tm, deltaH } = thermalParams;
    const R = 8.314;

    // Calculate ln(K) vs 1/T
    const dataPoints = [];
    for (let T = Tm - 15; T <= Tm + 15; T += 1) {
      const fu = calculateFractionUnfolded(T, Tm, deltaH);
      if (fu > 0.01 && fu < 0.99) {
        const K = fu / (1 - fu);
        const invT = 1 / (T + 273.15);
        const lnK = Math.log(K);
        dataPoints.push({ T, invT, lnK, K });
      }
    }

    // Scales
    const minInvT = Math.min(...dataPoints.map(d => d.invT));
    const maxInvT = Math.max(...dataPoints.map(d => d.invT));
    const invTRange = maxInvT - minInvT;

    const minLnK = Math.min(...dataPoints.map(d => d.lnK));
    const maxLnK = Math.max(...dataPoints.map(d => d.lnK));
    const lnKRange = maxLnK - minLnK;

    const invTToCanvas = x => padding + ((x - minInvT) / invTRange) * (width - 2 * padding);
    const lnKToCanvas = y => height - padding - ((y - minLnK) / lnKRange) * (height - 2 * padding);

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
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Plot the line (should be linear)
    ctx.strokeStyle = '#9c27b0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    dataPoints.forEach((d, i) => {
      const x = invTToCanvas(d.invT);
      const y = lnKToCanvas(d.lnK);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Data points
    ctx.fillStyle = '#9c27b0';
    dataPoints.forEach(d => {
      ctx.beginPath();
      ctx.arc(invTToCanvas(d.invT), lnKToCanvas(d.lnK), 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // K = 1 line (Tm)
    ctx.strokeStyle = '#ff9800';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, lnKToCanvas(0));
    ctx.lineTo(width - padding, lnKToCanvas(0));
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('1/T (K⁻¹)', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('ln(K)', 0, 0);
    ctx.restore();

    // Annotations
    ctx.font = '12px Arial';
    ctx.fillStyle = '#9c27b0';
    ctx.textAlign = 'left';
    ctx.fillText(`Slope = -ΔH/R`, padding + 20, padding + 25);
    ctx.fillText(`ΔH = ${deltaH} kJ/mol`, padding + 20, padding + 40);

    ctx.fillStyle = '#ff9800';
    ctx.fillText('ln(K) = 0 at Tm', width - padding - 100, lnKToCanvas(0) - 10);

  }, [thermalParams, activeStep, calculateFractionUnfolded]);

  // Draw DSC curve
  useEffect(() => {
    const canvas = dscCanvasRef.current;
    if (!canvas || activeStep < 3) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const { Tm, deltaH, width: peakWidth } = dscParams;

    const minT = 30;
    const maxT = 100;
    const tRange = maxT - minT;

    // DSC peak modeled as Gaussian-like
    const dscSignal = (T) => {
      const baseline = 0;
      const peakHeight = deltaH / (peakWidth * Math.sqrt(2 * Math.PI));
      return baseline + peakHeight * Math.exp(-Math.pow(T - Tm, 2) / (2 * Math.pow(peakWidth, 2)));
    };

    const maxCP = dscSignal(Tm) * 1.2;

    const tToCanvas = t => padding + ((t - minT) / tRange) * (width - 2 * padding);
    const cpToCanvas = cp => height - padding - (cp / maxCP) * (height - 2 * padding);

    // Grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let t = 30; t <= 100; t += 10) {
      ctx.beginPath();
      ctx.moveTo(tToCanvas(t), padding);
      ctx.lineTo(tToCanvas(t), height - padding);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw DSC curve
    ctx.strokeStyle = '#e91e63';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let T = minT; T <= maxT; T += 0.5) {
      const cp = dscSignal(T);
      const x = tToCanvas(T);
      const y = cpToCanvas(cp);
      if (T === minT) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Fill area under peak
    ctx.fillStyle = 'rgba(233, 30, 99, 0.2)';
    ctx.beginPath();
    ctx.moveTo(tToCanvas(minT), cpToCanvas(0));
    for (let T = minT; T <= maxT; T += 0.5) {
      const cp = dscSignal(T);
      ctx.lineTo(tToCanvas(T), cpToCanvas(cp));
    }
    ctx.lineTo(tToCanvas(maxT), cpToCanvas(0));
    ctx.closePath();
    ctx.fill();

    // Tm marker
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tToCanvas(Tm), height - padding);
    ctx.lineTo(tToCanvas(Tm), cpToCanvas(dscSignal(Tm)));
    ctx.stroke();
    ctx.setLineDash([]);

    // Peak point
    ctx.fillStyle = '#1976d2';
    ctx.beginPath();
    ctx.arc(tToCanvas(Tm), cpToCanvas(dscSignal(Tm)), 8, 0, Math.PI * 2);
    ctx.fill();

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Temperature (°C)', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Cp (Heat Capacity)', 0, 0);
    ctx.restore();

    // Annotations
    ctx.font = '12px Arial';
    ctx.fillStyle = '#1976d2';
    ctx.fillText(`Tm = ${Tm}°C`, tToCanvas(Tm), height - padding + 20);

    ctx.fillStyle = '#e91e63';
    ctx.textAlign = 'left';
    ctx.fillText(`Area = ΔH = ${deltaH} kJ/mol`, width / 2, padding + 30);

  }, [dscParams, activeStep]);

  const handleNext = () => setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 0));

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Why Protein Thermal Stability Matters
            </Typography>

            <Typography paragraph>
              Thermal stability refers to a protein's resistance to unfolding (denaturation)
              when heated. It's a critical property for:
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Biopharmaceuticals
                    </Typography>
                    <Typography variant="body2">
                      • Shelf-life prediction<br/>
                      • Formulation development<br/>
                      • Cold chain requirements<br/>
                      • Quality control specifications
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Protein Engineering
                    </Typography>
                    <Typography variant="body2">
                      • Compare mutant stability<br/>
                      • Directed evolution endpoint<br/>
                      • Industrial enzyme optimization<br/>
                      • Thermophile protein design
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Disease Research
                    </Typography>
                    <Typography variant="body2">
                      • Misfolding diseases (Alzheimer's, prions)<br/>
                      • Mutation effects on stability<br/>
                      • Drug effects on target proteins<br/>
                      • Protein aggregation studies
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Basic Research
                    </Typography>
                    <Typography variant="body2">
                      • Folding thermodynamics<br/>
                      • Structure-stability relationships<br/>
                      • Evolutionary adaptation<br/>
                      • Ligand binding effects
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="info">
              <Typography variant="body2">
                <strong>Key Metric:</strong> The <strong>melting temperature (Tm)</strong> is the
                temperature at which 50% of the protein is unfolded. Higher Tm = more stable protein.
              </Typography>
            </Alert>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              The Two-State Folding Model
            </Typography>

            <Typography paragraph>
              Many small globular proteins unfold via a <strong>two-state mechanism</strong>:
              only native (N) and denatured (D) states are significantly populated.
            </Typography>

            <Paper sx={{ p: 2, bgcolor: '#e3f2fd', mb: 3 }}>
              <Typography variant="h5" align="center" sx={{ fontFamily: 'serif' }}>
                N ⇌ D
              </Typography>
              <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                Native ⇌ Denatured<br/>
                K = [D]/[N] = fraction unfolded / fraction folded
              </Typography>
            </Paper>

            <Typography variant="subtitle1" gutterBottom>
              Key Equations
            </Typography>

            <Paper sx={{ p: 2, bgcolor: '#f5f5f5', mb: 3 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                <strong>Equilibrium constant:</strong><br/>
                K = f<sub>U</sub> / (1 - f<sub>U</sub>) = [D]/[N]<br/><br/>

                <strong>Fraction unfolded:</strong><br/>
                f<sub>U</sub> = K / (1 + K) = 1 / (1 + e<sup>ΔG/RT</sup>)<br/><br/>

                <strong>Free energy of unfolding:</strong><br/>
                ΔG = -RT ln(K) = ΔH - TΔS<br/><br/>

                <strong>At the melting temperature Tm:</strong><br/>
                ΔG(Tm) = 0, therefore K = 1, f<sub>U</sub> = 0.5
              </Typography>
            </Paper>

            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Two-state assumption:</strong> This model assumes no intermediates.
                For larger, multi-domain proteins, the unfolding may be more complex with
                populated intermediates.
              </Typography>
            </Alert>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Temperature</strong></TableCell>
                  <TableCell><strong>K</strong></TableCell>
                  <TableCell><strong>f<sub>U</sub></strong></TableCell>
                  <TableCell><strong>State</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>T &lt;&lt; Tm</TableCell>
                  <TableCell>~0</TableCell>
                  <TableCell>~0%</TableCell>
                  <TableCell>Mostly native</TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                  <TableCell><strong>T = Tm</strong></TableCell>
                  <TableCell><strong>1</strong></TableCell>
                  <TableCell><strong>50%</strong></TableCell>
                  <TableCell><strong>Equal N and D</strong></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>T &gt;&gt; Tm</TableCell>
                  <TableCell>~∞</TableCell>
                  <TableCell>~100%</TableCell>
                  <TableCell>Mostly denatured</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Melting Curve Analysis
            </Typography>

            <Typography paragraph>
              A thermal melting experiment monitors a signal that changes upon unfolding
              (CD at 222 nm, fluorescence, absorbance) as temperature increases.
            </Typography>

            <Typography variant="subtitle1" gutterBottom>
              Interactive Melting Curve
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6} md={3}>
                <Typography variant="body2">Tm: {thermalParams.Tm}°C</Typography>
                <Slider
                  value={thermalParams.Tm}
                  onChange={(e, v) => setThermalParams(p => ({ ...p, Tm: v }))}
                  min={40}
                  max={80}
                  valueLabelDisplay="auto"
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2">ΔH: {thermalParams.deltaH} kJ/mol</Typography>
                <Slider
                  value={thermalParams.deltaH}
                  onChange={(e, v) => setThermalParams(p => ({ ...p, deltaH: v }))}
                  min={100}
                  max={600}
                  valueLabelDisplay="auto"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2">Current Temperature: {temperature}°C</Typography>
                <Slider
                  value={temperature}
                  onChange={(e, v) => setTemperature(v)}
                  min={20}
                  max={100}
                  valueLabelDisplay="auto"
                  sx={{ color: '#4caf50' }}
                />
              </Grid>
            </Grid>

            <canvas ref={meltCurveCanvasRef} width={550} height={350} style={{ border: '1px solid #ddd', display: 'block', margin: '0 auto 20px' }} />

            <Typography variant="subtitle1" gutterBottom>
              Analysis Equation
            </Typography>

            <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                Signal(T) = y<sub>N</sub> + (y<sub>D</sub> - y<sub>N</sub>) × f<sub>U</sub>(T)<br/><br/>
                Where:<br/>
                y<sub>N</sub> = signal of native state<br/>
                y<sub>D</sub> = signal of denatured state<br/>
                f<sub>U</sub>(T) = fraction unfolded at temperature T
              </Typography>
            </Paper>

            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Effect of ΔH:</strong> Higher ΔH makes the transition sharper (more cooperative).
                Try adjusting the ΔH slider to see this effect!
              </Typography>
            </Alert>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Thermodynamic Parameters
            </Typography>

            <Typography paragraph>
              Thermal denaturation experiments yield key thermodynamic parameters that
              describe the energetics of protein folding:
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', bgcolor: '#e3f2fd' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
                      ΔH (Enthalpy)
                    </Typography>
                    <Typography variant="body2">
                      Heat absorbed during unfolding.<br/><br/>
                      <strong>Typical range:</strong> 200-600 kJ/mol<br/>
                      <strong>Sources:</strong> Breaking hydrogen bonds, disrupting van der Waals contacts
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', bgcolor: '#fce4ec' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: '#e91e63' }}>
                      ΔS (Entropy)
                    </Typography>
                    <Typography variant="body2">
                      Change in disorder upon unfolding.<br/><br/>
                      <strong>Typical:</strong> Positive (unfolded is more disordered)<br/>
                      <strong>At Tm:</strong> ΔS = ΔH/Tm
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', bgcolor: '#e8f5e9' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: '#4caf50' }}>
                      ΔG (Free Energy)
                    </Typography>
                    <Typography variant="body2">
                      Stability of native state.<br/><br/>
                      <strong>At 25°C:</strong> 20-60 kJ/mol typical<br/>
                      <strong>At Tm:</strong> ΔG = 0 by definition
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Typography variant="subtitle1" gutterBottom>
              Differential Scanning Calorimetry (DSC)
            </Typography>

            <Typography paragraph>
              DSC directly measures the heat capacity (Cp) as a function of temperature.
              The area under the Cp peak equals ΔH.
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={4}>
                <Typography variant="body2">DSC Tm: {dscParams.Tm}°C</Typography>
                <Slider
                  value={dscParams.Tm}
                  onChange={(e, v) => setDscParams(p => ({ ...p, Tm: v }))}
                  min={40}
                  max={90}
                  valueLabelDisplay="auto"
                />
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2">ΔH: {dscParams.deltaH} kJ/mol</Typography>
                <Slider
                  value={dscParams.deltaH}
                  onChange={(e, v) => setDscParams(p => ({ ...p, deltaH: v }))}
                  min={100}
                  max={800}
                  valueLabelDisplay="auto"
                />
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2">Peak Width: {dscParams.width}°C</Typography>
                <Slider
                  value={dscParams.width}
                  onChange={(e, v) => setDscParams(p => ({ ...p, width: v }))}
                  min={2}
                  max={15}
                  valueLabelDisplay="auto"
                />
              </Grid>
            </Grid>

            <canvas ref={dscCanvasRef} width={500} height={300} style={{ border: '1px solid #ddd', display: 'block', margin: '0 auto' }} />
          </Box>
        );

      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Van't Hoff Analysis
            </Typography>

            <Typography paragraph>
              The <strong>Van't Hoff equation</strong> relates the equilibrium constant K
              to temperature, allowing extraction of ΔH from thermal data.
            </Typography>

            <Paper sx={{ p: 2, bgcolor: '#f3e5f5', mb: 3 }}>
              <Typography variant="h6" align="center" sx={{ fontFamily: 'serif' }}>
                ln(K) = -ΔH/RT + ΔS/R
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" align="center">
                Plot of ln(K) vs 1/T gives a straight line:<br/>
                <strong>Slope = -ΔH/R</strong><br/>
                <strong>Y-intercept = ΔS/R</strong>
              </Typography>
            </Paper>

            <canvas ref={vanHoffCanvasRef} width={500} height={350} style={{ border: '1px solid #ddd', display: 'block', margin: '0 auto 20px' }} />

            <Typography variant="subtitle1" gutterBottom>
              Van't Hoff vs Calorimetric ΔH
            </Typography>

            <Table size="small" sx={{ mb: 3 }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Method</strong></TableCell>
                  <TableCell><strong>ΔH<sub>vH</sub> (Van't Hoff)</strong></TableCell>
                  <TableCell><strong>ΔH<sub>cal</sub> (DSC)</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Measurement</TableCell>
                  <TableCell>From curve shape</TableCell>
                  <TableCell>Direct heat measurement</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Assumption</TableCell>
                  <TableCell>Two-state model</TableCell>
                  <TableCell>None</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Information</TableCell>
                  <TableCell>Cooperativity unit</TableCell>
                  <TableCell>Total enthalpy</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Alert severity="info">
              <Typography variant="body2">
                <strong>Cooperativity Check:</strong> If ΔH<sub>vH</sub> ≈ ΔH<sub>cal</sub>, the
                protein follows two-state folding. If ΔH<sub>vH</sub> &lt; ΔH<sub>cal</sub>,
                intermediates are present.
              </Typography>
            </Alert>
          </Box>
        );

      case 5:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Practical Applications
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Formulation Screening
                    </Typography>
                    <Typography variant="body2">
                      Compare Tm in different buffers, pH, excipients to find
                      optimal formulation conditions for biopharmaceuticals.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Ligand Binding
                    </Typography>
                    <Typography variant="body2">
                      Ligand binding often stabilizes proteins (ΔTm &gt; 0).
                      Used as a drug binding assay (Thermal Shift Assay).
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Mutation Effects
                    </Typography>
                    <Typography variant="body2">
                      Compare wild-type vs mutant stability. Disease mutations
                      often destabilize proteins (ΔTm &lt; 0).
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Aggregation Risk
                    </Typography>
                    <Typography variant="body2">
                      Lower Tm correlates with higher aggregation propensity.
                      Target Tm &gt; 50°C for storage stability.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Typography variant="subtitle1" gutterBottom>
              Experimental Techniques
            </Typography>

            <Table size="small" sx={{ mb: 3 }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Technique</strong></TableCell>
                  <TableCell><strong>Signal</strong></TableCell>
                  <TableCell><strong>Advantages</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>CD Thermal Melt</TableCell>
                  <TableCell>Ellipticity (222 nm)</TableCell>
                  <TableCell>Secondary structure info</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>DSF (Thermal Shift)</TableCell>
                  <TableCell>SYPRO Orange fluorescence</TableCell>
                  <TableCell>High-throughput, low sample</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>DSC</TableCell>
                  <TableCell>Heat capacity</TableCell>
                  <TableCell>Direct ΔH, no assumptions</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Intrinsic Fluorescence</TableCell>
                  <TableCell>Trp emission</TableCell>
                  <TableCell>Label-free, tertiary structure</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>nanoDSF</TableCell>
                  <TableCell>Intrinsic Trp ratio</TableCell>
                  <TableCell>Low sample, no dye</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
              <Typography variant="subtitle2" gutterBottom>
                Summary: Key Equations
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                Two-state: N ⇌ D, K = [D]/[N]<br/>
                f<sub>U</sub> = K / (1 + K)<br/>
                ΔG = -RT ln(K) = ΔH - TΔS<br/>
                At Tm: ΔG = 0, K = 1<br/>
                ΔS = ΔH / Tm<br/>
                Van't Hoff: ln(K) = -ΔH/RT + ΔS/R
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
          <ThermostatIcon sx={{ fontSize: 40, color: '#d32f2f', mr: 2 }} />
          <Box>
            <Typography variant="h4">
              Lesson 9: Thermal Stability Analysis
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Melting Temperature, Thermodynamics, and Protein Stability
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label="Advanced" color="secondary" size="small" />
          <Chip label="~30 minutes" variant="outlined" size="small" />
          <Chip label="Thermodynamics" variant="outlined" size="small" />
          <Chip label="Protein Folding" variant="outlined" size="small" />
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
            Congratulations! You've completed the Biophysics Education curriculum and
            now understand thermal stability analysis, including melting curves,
            thermodynamic parameters, and Van't Hoff analysis.
          </Typography>
          <Typography variant="subtitle2" gutterBottom>
            Key Takeaways:
          </Typography>
          <ul>
            <li>Tm = temperature at which 50% of protein is unfolded</li>
            <li>Two-state model: N ⇌ D with K = 1 at Tm</li>
            <li>ΔG = ΔH - TΔS = 0 at Tm, so ΔS = ΔH/Tm</li>
            <li>Van't Hoff plot: ln(K) vs 1/T gives -ΔH/R as slope</li>
            <li>DSC directly measures ΔH as area under Cp peak</li>
          </ul>
          <Button variant="outlined" onClick={() => setActiveStep(0)} sx={{ mt: 2 }}>
            Review Lesson
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default Lesson9_ThermalStability;
