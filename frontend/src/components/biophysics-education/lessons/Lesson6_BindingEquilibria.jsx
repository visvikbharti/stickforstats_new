/**
 * Lesson 6: Binding Equilibria Fundamentals
 *
 * Comprehensive coverage of binding thermodynamics:
 * - What is binding affinity
 * - Kd and Ka definitions
 * - Thermodynamic basis (ΔG, ΔH, ΔS)
 * - Saturation binding curves
 * - Scatchard analysis
 * - Practical applications
 *
 * ~800 lines of educational content
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
  TextField,
  InputAdornment
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  ShowChart as ChartIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';

const STEPS = [
  'What is Binding Affinity?',
  'Kd and Ka: The Key Constants',
  'Thermodynamic Foundation',
  'Saturation Binding Curves',
  'Scatchard Analysis',
  'Practical Applications'
];

const Lesson6_BindingEquilibria = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [bindingParams, setBindingParams] = useState({
    Bmax: 100,
    Kd: 10,
    ligandConc: 50
  });
  const [thermoParams, setThermoParams] = useState({
    Kd: 1e-9, // 1 nM
    temperature: 298 // K
  });
  const [kdCalculator, setKdCalculator] = useState({
    kon: 1e6,
    koff: 1e-3
  });

  const bindingCanvasRef = useRef(null);
  const scatchardCanvasRef = useRef(null);
  const energyCanvasRef = useRef(null);

  // Calculate bound ligand
  const calculateBound = useCallback((L, Bmax, Kd) => {
    return (Bmax * L) / (Kd + L);
  }, []);

  // Draw saturation binding curve
  useEffect(() => {
    const canvas = bindingCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const maxL = bindingParams.Kd * 10;
    const maxB = bindingParams.Bmax * 1.1;

    const xScale = (width - 2 * padding) / maxL;
    const yScale = (height - 2 * padding) / maxB;

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

    // Draw binding curve
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let L = 0; L <= maxL; L += maxL / 100) {
      const B = calculateBound(L, bindingParams.Bmax, bindingParams.Kd);
      const x = padding + L * xScale;
      const y = height - padding - B * yScale;
      if (L === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Bmax line
    ctx.strokeStyle = '#ff9800';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    const bmaxY = height - padding - bindingParams.Bmax * yScale;
    ctx.beginPath();
    ctx.moveTo(padding, bmaxY);
    ctx.lineTo(width - padding, bmaxY);
    ctx.stroke();

    // Bmax/2 line
    const halfBmaxY = height - padding - (bindingParams.Bmax / 2) * yScale;
    ctx.beginPath();
    ctx.moveTo(padding, halfBmaxY);
    ctx.lineTo(width - padding, halfBmaxY);
    ctx.stroke();

    // Kd marker
    const kdX = padding + bindingParams.Kd * xScale;
    ctx.beginPath();
    ctx.moveTo(kdX, height - padding);
    ctx.lineTo(kdX, halfBmaxY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Kd point
    ctx.fillStyle = '#d32f2f';
    ctx.beginPath();
    ctx.arc(kdX, halfBmaxY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Current ligand concentration indicator
    if (bindingParams.ligandConc > 0 && bindingParams.ligandConc <= maxL) {
      const currentB = calculateBound(bindingParams.ligandConc, bindingParams.Bmax, bindingParams.Kd);
      const currentX = padding + bindingParams.ligandConc * xScale;
      const currentY = height - padding - currentB * yScale;

      ctx.strokeStyle = '#4caf50';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(currentX, height - padding);
      ctx.lineTo(currentX, currentY);
      ctx.lineTo(padding, currentY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#4caf50';
      ctx.beginPath();
      ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Labels
    ctx.fillStyle = '#333333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('[L] (free ligand concentration)', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('[B] (bound ligand)', 0, 0);
    ctx.restore();

    // Annotations
    ctx.font = '12px Arial';
    ctx.fillStyle = '#ff9800';
    ctx.textAlign = 'left';
    ctx.fillText('Bmax', padding + 5, bmaxY - 5);
    ctx.fillText('Bmax/2', padding + 5, halfBmaxY - 5);

    ctx.fillStyle = '#d32f2f';
    ctx.textAlign = 'center';
    ctx.fillText(`Kd = ${bindingParams.Kd}`, kdX, height - padding + 25);

  }, [bindingParams, calculateBound]);

  // Draw Scatchard plot
  useEffect(() => {
    const canvas = scatchardCanvasRef.current;
    if (!canvas || activeStep < 4) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Generate Scatchard data: B/F vs B
    // B = Bmax * L / (Kd + L)
    // F = L (free ligand)
    // B/F = Bmax/Kd - B/Kd

    const dataPoints = [];
    for (let L = bindingParams.Kd * 0.1; L <= bindingParams.Kd * 20; L += bindingParams.Kd * 0.5) {
      const B = calculateBound(L, bindingParams.Bmax, bindingParams.Kd);
      const F = L;
      dataPoints.push({
        B: B,
        BoverF: B / F
      });
    }

    const maxB = bindingParams.Bmax * 1.1;
    const maxBoverF = (bindingParams.Bmax / bindingParams.Kd) * 1.1;

    const xScale = (width - 2 * padding) / maxB;
    const yScale = (height - 2 * padding) / maxBoverF;

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

    // Draw Scatchard line
    // B/F = Bmax/Kd - B/Kd
    // Y-intercept = Bmax/Kd, X-intercept = Bmax, Slope = -1/Kd
    ctx.strokeStyle = '#9c27b0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const yInt = bindingParams.Bmax / bindingParams.Kd;
    const xInt = bindingParams.Bmax;
    ctx.moveTo(padding, height - padding - yInt * yScale);
    ctx.lineTo(padding + xInt * xScale, height - padding);
    ctx.stroke();

    // Data points
    ctx.fillStyle = '#9c27b0';
    dataPoints.forEach(d => {
      const x = padding + d.B * xScale;
      const y = height - padding - d.BoverF * yScale;
      if (y > padding && y < height - padding && x > padding && x < width - padding) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Mark intercepts
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.arc(padding, height - padding - yInt * yScale, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff9800';
    ctx.beginPath();
    ctx.arc(padding + xInt * xScale, height - padding, 8, 0, Math.PI * 2);
    ctx.fill();

    // Labels
    ctx.fillStyle = '#333333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('[B] (bound)', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('[B]/[F]', 0, 0);
    ctx.restore();

    // Annotations
    ctx.font = '12px Arial';
    ctx.fillStyle = '#4caf50';
    ctx.textAlign = 'left';
    ctx.fillText(`Y-int = Bmax/Kd = ${(yInt).toFixed(1)}`, padding + 10, height - padding - yInt * yScale + 15);

    ctx.fillStyle = '#ff9800';
    ctx.textAlign = 'center';
    ctx.fillText(`X-int = Bmax = ${xInt}`, padding + xInt * xScale, height - padding + 15);

    ctx.fillStyle = '#9c27b0';
    ctx.textAlign = 'left';
    ctx.fillText(`Slope = -1/Kd = ${(-1/bindingParams.Kd).toFixed(3)}`, width / 2, padding + 30);

  }, [bindingParams, activeStep, calculateBound]);

  // Draw energy diagram
  useEffect(() => {
    const canvas = energyCanvasRef.current;
    if (!canvas || activeStep < 2) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Calculate ΔG
    const R = 8.314; // J/mol/K
    const T = thermoParams.temperature;
    const Kd = thermoParams.Kd;
    const Ka = 1 / Kd;
    const deltaG = R * T * Math.log(Kd) / 1000; // kJ/mol

    // Energy level diagram
    const centerX = width / 2;
    const unbound = height - padding - 80;
    const boundLevel = unbound + deltaG * 2; // Scale for visualization

    // Draw energy levels
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 3;

    // Unbound state (P + L)
    ctx.beginPath();
    ctx.moveTo(centerX - 80, unbound);
    ctx.lineTo(centerX - 20, unbound);
    ctx.stroke();

    // Bound state (PL)
    ctx.beginPath();
    ctx.moveTo(centerX + 20, boundLevel);
    ctx.lineTo(centerX + 80, boundLevel);
    ctx.stroke();

    // Connecting arrow
    ctx.strokeStyle = '#666';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(centerX - 20, unbound);
    ctx.lineTo(centerX + 20, boundLevel);
    ctx.stroke();
    ctx.setLineDash([]);

    // ΔG arrow
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX + 100, unbound);
    ctx.lineTo(centerX + 100, boundLevel);
    ctx.stroke();

    // Arrow head
    ctx.beginPath();
    ctx.moveTo(centerX + 100, boundLevel);
    ctx.lineTo(centerX + 95, boundLevel - 10);
    ctx.moveTo(centerX + 100, boundLevel);
    ctx.lineTo(centerX + 105, boundLevel - 10);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#1976d2';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('P + L', centerX - 50, unbound - 10);
    ctx.fillText('PL', centerX + 50, boundLevel - 10);

    ctx.fillStyle = '#d32f2f';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`ΔG = ${deltaG.toFixed(1)} kJ/mol`, centerX + 110, (unbound + boundLevel) / 2);

    // Title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Free Energy of Binding', centerX, padding + 20);

    // Info box
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(padding, height - 80, width - 2 * padding, 60);
    ctx.strokeStyle = '#ddd';
    ctx.strokeRect(padding, height - 80, width - 2 * padding, 60);

    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Kd = ${Kd.toExponential(1)} M`, padding + 20, height - 55);
    ctx.fillText(`Ka = ${Ka.toExponential(1)} M⁻¹`, padding + 20, height - 35);
    ctx.fillText(`ΔG = RT ln(Kd) = ${deltaG.toFixed(2)} kJ/mol`, width / 2, height - 55);
    ctx.fillText(`T = ${T} K`, width / 2, height - 35);

  }, [thermoParams, activeStep]);

  const handleNext = () => setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 0));

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              What is Binding Affinity?
            </Typography>

            <Typography paragraph>
              Binding affinity describes how strongly a ligand (L) interacts with its binding
              partner, typically a protein (P). This fundamental concept underlies:
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Drug-Receptor Interactions
                    </Typography>
                    <Typography variant="body2">
                      How tightly does a drug bind to its target? Higher affinity often
                      means lower required doses.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Antibody-Antigen Binding
                    </Typography>
                    <Typography variant="body2">
                      Therapeutic antibodies need high affinity to effectively
                      neutralize their targets.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Protein-Protein Interactions
                    </Typography>
                    <Typography variant="body2">
                      Signaling pathways depend on specific, tuned affinities
                      between protein partners.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 3 }}>
              <Typography variant="h6" align="center" gutterBottom>
                The Binding Equilibrium
              </Typography>
              <Typography variant="h5" align="center" sx={{ fontFamily: 'serif' }}>
                P + L ⇌ PL
              </Typography>
              <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                Protein + Ligand ⇌ Protein-Ligand Complex
              </Typography>
            </Paper>

            <Alert severity="info">
              <Typography variant="body2">
                <strong>Key Insight:</strong> At equilibrium, the rate of complex formation equals
                the rate of dissociation. The position of this equilibrium defines the binding affinity.
              </Typography>
            </Alert>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              K<sub>d</sub> and K<sub>a</sub>: The Key Constants
            </Typography>

            <Typography paragraph>
              Binding affinity is quantified by two related equilibrium constants:
            </Typography>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
                  <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f' }}>
                    Dissociation Constant (K<sub>d</sub>)
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', mb: 2 }}>
                    K<sub>d</sub> = [P][L] / [PL]
                  </Typography>
                  <Typography variant="body2">
                    <strong>Units:</strong> Molar (M)<br/>
                    <strong>Interpretation:</strong> Concentration of ligand at which
                    half the binding sites are occupied<br/>
                    <strong>Lower K<sub>d</sub> = Higher affinity</strong>
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
                  <Typography variant="h6" gutterBottom sx={{ color: '#4caf50' }}>
                    Association Constant (K<sub>a</sub>)
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', mb: 2 }}>
                    K<sub>a</sub> = [PL] / [P][L] = 1/K<sub>d</sub>
                  </Typography>
                  <Typography variant="body2">
                    <strong>Units:</strong> M⁻¹<br/>
                    <strong>Interpretation:</strong> Strength of binding<br/>
                    <strong>Higher K<sub>a</sub> = Higher affinity</strong>
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Typography variant="subtitle1" gutterBottom>
              Kinetic Definition
            </Typography>

            <Paper sx={{ p: 2, bgcolor: 'background.default', mb: 3 }}>
              <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                P + L → PL (association: rate = k<sub>on</sub>[P][L])<br/>
                PL → P + L (dissociation: rate = k<sub>off</sub>[PL])<br/><br/>
                At equilibrium: k<sub>on</sub>[P][L] = k<sub>off</sub>[PL]<br/><br/>
                <strong>K<sub>d</sub> = k<sub>off</sub> / k<sub>on</sub></strong>
              </Typography>
            </Paper>

            <Typography variant="subtitle1" gutterBottom>
              K<sub>d</sub> Calculator
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <TextField
                  label="kon (M⁻¹s⁻¹)"
                  type="number"
                  value={kdCalculator.kon}
                  onChange={(e) => setKdCalculator(p => ({ ...p, kon: parseFloat(e.target.value) || 0 }))}
                  size="small"
                  fullWidth
                  InputProps={{
                    endAdornment: <InputAdornment position="end">M⁻¹s⁻¹</InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="koff (s⁻¹)"
                  type="number"
                  value={kdCalculator.koff}
                  onChange={(e) => setKdCalculator(p => ({ ...p, koff: parseFloat(e.target.value) || 0 }))}
                  size="small"
                  fullWidth
                  InputProps={{
                    endAdornment: <InputAdornment position="end">s⁻¹</InputAdornment>
                  }}
                />
              </Grid>
            </Grid>

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <Typography variant="body1">
                <strong>Calculated K<sub>d</sub>:</strong> {(kdCalculator.koff / kdCalculator.kon).toExponential(2)} M
                ({((kdCalculator.koff / kdCalculator.kon) * 1e9).toFixed(2)} nM)
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Half-life of complex:</strong> t<sub>1/2</sub> = ln(2)/k<sub>off</sub> = {(0.693 / kdCalculator.koff).toFixed(1)} seconds
              </Typography>
            </Paper>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Rule of thumb:</strong> Drug-like molecules typically have k<sub>on</sub> ~ 10⁵-10⁷ M⁻¹s⁻¹
                (diffusion-limited). Affinity is often tuned by changing k<sub>off</sub>.
              </Typography>
            </Alert>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Thermodynamic Foundation
            </Typography>

            <Typography paragraph>
              Binding affinity is fundamentally determined by the <strong>Gibbs free energy change</strong> (ΔG)
              of the binding reaction.
            </Typography>

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 3 }}>
              <Typography variant="h6" align="center" sx={{ fontFamily: 'serif' }}>
                ΔG° = -RT ln(K<sub>a</sub>) = RT ln(K<sub>d</sub>)
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                Where:<br/>
                R = 8.314 J/mol/K (gas constant)<br/>
                T = temperature in Kelvin<br/>
                K<sub>a</sub> = association constant (M⁻¹)<br/>
                K<sub>d</sub> = dissociation constant (M)
              </Typography>
            </Paper>

            <Typography variant="subtitle1" gutterBottom>
              Interactive: Explore the Energy-Affinity Relationship
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography>log₁₀(K<sub>d</sub>): {Math.log10(thermoParams.Kd).toFixed(1)} (K<sub>d</sub> = {thermoParams.Kd.toExponential(1)} M)</Typography>
                <Slider
                  value={Math.log10(thermoParams.Kd)}
                  onChange={(e, v) => setThermoParams(p => ({ ...p, Kd: Math.pow(10, v) }))}
                  min={-12}
                  max={-3}
                  step={0.5}
                  marks={[
                    { value: -12, label: 'pM' },
                    { value: -9, label: 'nM' },
                    { value: -6, label: 'μM' },
                    { value: -3, label: 'mM' }
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={v => `10^${v}`}
                />
              </Grid>
              <Grid item xs={6}>
                <Typography>Temperature: {thermoParams.temperature} K ({(thermoParams.temperature - 273).toFixed(0)}°C)</Typography>
                <Slider
                  value={thermoParams.temperature}
                  onChange={(e, v) => setThermoParams(p => ({ ...p, temperature: v }))}
                  min={273}
                  max={330}
                  valueLabelDisplay="auto"
                />
              </Grid>
            </Grid>

            <canvas ref={energyCanvasRef} width={450} height={300} style={{ border: '1px solid #ddd', display: 'block', margin: '0 auto' }} />

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" gutterBottom>
              ΔG Decomposition
            </Typography>

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 3 }}>
              <Typography variant="h6" align="center" sx={{ fontFamily: 'serif' }}>
                ΔG = ΔH - TΔS
              </Typography>
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>ΔH (enthalpy):</strong><br/>
                    • Hydrogen bonds<br/>
                    • Electrostatic interactions<br/>
                    • Van der Waals contacts<br/>
                    Typically favorable (negative)
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>-TΔS (entropy):</strong><br/>
                    • Hydrophobic effect (favorable)<br/>
                    • Loss of conformational freedom (unfavorable)<br/>
                    • Solvent release (favorable)<br/>
                    Can be positive or negative
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            <Alert severity="info">
              <Typography variant="body2">
                <strong>Practical insight:</strong> A K<sub>d</sub> of 1 nM corresponds to ΔG ≈ -51 kJ/mol at 25°C.
                Each 10-fold decrease in K<sub>d</sub> requires an additional ~5.7 kJ/mol of binding energy.
              </Typography>
            </Alert>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Saturation Binding Curves
            </Typography>

            <Typography paragraph>
              A saturation binding experiment measures how much ligand binds to a receptor
              as ligand concentration increases. The resulting curve is hyperbolic.
            </Typography>

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 3 }}>
              <Typography variant="h6" align="center" sx={{ fontFamily: 'serif' }}>
                B = B<sub>max</sub> × [L] / (K<sub>d</sub> + [L])
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" align="center">
                This is identical to the Michaelis-Menten equation!<br/>
                B = bound ligand, B<sub>max</sub> = maximum binding capacity
              </Typography>
            </Paper>

            <Typography variant="subtitle1" gutterBottom>
              Key Parameters
            </Typography>

            <Table size="small" sx={{ mb: 3 }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Parameter</strong></TableCell>
                  <TableCell><strong>Definition</strong></TableCell>
                  <TableCell><strong>What It Tells Us</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>B<sub>max</sub></TableCell>
                  <TableCell>Maximum specific binding</TableCell>
                  <TableCell>Number of binding sites (receptor density)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ color: '#d32f2f' }}>K<sub>d</sub></TableCell>
                  <TableCell>[L] at half-maximal binding</TableCell>
                  <TableCell>Binding affinity (lower = tighter)</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Typography variant="subtitle1" gutterBottom>
              Interactive Saturation Curve
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={4}>
                <Typography>B<sub>max</sub>: {bindingParams.Bmax}</Typography>
                <Slider
                  value={bindingParams.Bmax}
                  onChange={(e, v) => setBindingParams(p => ({ ...p, Bmax: v }))}
                  min={20}
                  max={200}
                  valueLabelDisplay="auto"
                />
              </Grid>
              <Grid item xs={4}>
                <Typography>K<sub>d</sub>: {bindingParams.Kd}</Typography>
                <Slider
                  value={bindingParams.Kd}
                  onChange={(e, v) => setBindingParams(p => ({ ...p, Kd: v }))}
                  min={1}
                  max={50}
                  valueLabelDisplay="auto"
                />
              </Grid>
              <Grid item xs={4}>
                <Typography>[L]: {bindingParams.ligandConc}</Typography>
                <Slider
                  value={bindingParams.ligandConc}
                  onChange={(e, v) => setBindingParams(p => ({ ...p, ligandConc: v }))}
                  min={0}
                  max={bindingParams.Kd * 10}
                  valueLabelDisplay="auto"
                />
              </Grid>
            </Grid>

            <canvas ref={bindingCanvasRef} width={500} height={350} style={{ border: '1px solid #ddd', display: 'block', margin: '0 auto' }} />

            <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
              <Typography variant="body2">
                <strong>Current binding:</strong> At [L] = {bindingParams.ligandConc}, B = {calculateBound(bindingParams.ligandConc, bindingParams.Bmax, bindingParams.Kd).toFixed(1)}
                ({(calculateBound(bindingParams.ligandConc, bindingParams.Bmax, bindingParams.Kd) / bindingParams.Bmax * 100).toFixed(1)}% of B<sub>max</sub>)
              </Typography>
            </Paper>
          </Box>
        );

      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Scatchard Analysis
            </Typography>

            <Typography paragraph>
              The <strong>Scatchard plot</strong> is a linearization of the binding equation that was
              historically used to determine K<sub>d</sub> and B<sub>max</sub> before non-linear regression
              became standard.
            </Typography>

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 3 }}>
              <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                Starting from: B = B<sub>max</sub> × [L] / (K<sub>d</sub> + [L])<br/><br/>
                Rearrange: B(K<sub>d</sub> + [L]) = B<sub>max</sub> × [L]<br/>
                BK<sub>d</sub> + B[L] = B<sub>max</sub>[L]<br/>
                B/[L] = B<sub>max</sub>/K<sub>d</sub> - B/K<sub>d</sub><br/><br/>
                <strong>B/F = B<sub>max</sub>/K<sub>d</sub> - B/K<sub>d</sub></strong>
              </Typography>
            </Paper>

            <Typography paragraph>
              Where F = [L] = free ligand concentration. This has the form y = b + mx:
            </Typography>

            <Table size="small" sx={{ mb: 3 }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Plot Element</strong></TableCell>
                  <TableCell><strong>Value</strong></TableCell>
                  <TableCell><strong>Extracts</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Y-axis</TableCell>
                  <TableCell>B/F (bound/free)</TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>X-axis</TableCell>
                  <TableCell>B (bound)</TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ color: '#9c27b0' }}>Slope</TableCell>
                  <TableCell>-1/K<sub>d</sub></TableCell>
                  <TableCell>K<sub>d</sub> = -1/slope</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ color: '#4caf50' }}>Y-intercept</TableCell>
                  <TableCell>B<sub>max</sub>/K<sub>d</sub></TableCell>
                  <TableCell>Combined with slope</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ color: '#ff9800' }}>X-intercept</TableCell>
                  <TableCell>B<sub>max</sub></TableCell>
                  <TableCell>Direct reading</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <canvas ref={scatchardCanvasRef} width={450} height={350} style={{ border: '1px solid #ddd', display: 'block', margin: '0 auto' }} />

            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Important:</strong> Like Lineweaver-Burk plots, Scatchard plots distort errors.
                Always use non-linear regression for parameter estimation. Use Scatchard plots only for:
              </Typography>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                <li>Quick visualization of binding behavior</li>
                <li>Detecting multiple binding sites (curves instead of straight line)</li>
                <li>Identifying positive/negative cooperativity</li>
              </ul>
            </Alert>
          </Box>
        );

      case 5:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Practical Applications
            </Typography>

            <Typography paragraph>
              Understanding binding equilibria is essential across many fields:
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Drug Discovery
                    </Typography>
                    <Typography variant="body2">
                      • Lead optimization targets K<sub>d</sub> in nM-pM range<br/>
                      • Structure-activity relationships (SAR)<br/>
                      • Selectivity: differential K<sub>d</sub> for target vs off-targets
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Antibody Engineering
                    </Typography>
                    <Typography variant="body2">
                      • Affinity maturation improves K<sub>d</sub><br/>
                      • Therapeutic antibodies: K<sub>d</sub> typically pM-nM<br/>
                      • Biosensor development for diagnostics
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Receptor Pharmacology
                    </Typography>
                    <Typography variant="body2">
                      • Receptor binding assays<br/>
                      • Agonist vs antagonist characterization<br/>
                      • Competition binding for drug screening
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Biosensor Design
                    </Typography>
                    <Typography variant="body2">
                      • SPR (Surface Plasmon Resonance)<br/>
                      • ITC (Isothermal Titration Calorimetry)<br/>
                      • Fluorescence polarization assays
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Typography variant="subtitle1" gutterBottom>
              Affinity Classification
            </Typography>

            <Table size="small" sx={{ mb: 3 }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>K<sub>d</sub> Range</strong></TableCell>
                  <TableCell><strong>Affinity Class</strong></TableCell>
                  <TableCell><strong>Examples</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>&gt; 1 mM</TableCell>
                  <TableCell>Very weak</TableCell>
                  <TableCell>Non-specific interactions</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>1 μM - 1 mM</TableCell>
                  <TableCell>Weak</TableCell>
                  <TableCell>Some metabolic enzymes</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>1 nM - 1 μM</TableCell>
                  <TableCell>Moderate</TableCell>
                  <TableCell>Many drugs, hormones</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>1 pM - 1 nM</TableCell>
                  <TableCell>High</TableCell>
                  <TableCell>Therapeutic antibodies</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>&lt; 1 pM</TableCell>
                  <TableCell>Extremely high</TableCell>
                  <TableCell>Streptavidin-biotin (fM)</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <Typography variant="subtitle2" gutterBottom>
                Key Equations Summary
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                K<sub>d</sub> = [P][L] / [PL] = k<sub>off</sub> / k<sub>on</sub><br/>
                K<sub>a</sub> = 1 / K<sub>d</sub><br/>
                ΔG° = RT ln(K<sub>d</sub>) = -RT ln(K<sub>a</sub>)<br/>
                B = B<sub>max</sub> × [L] / (K<sub>d</sub> + [L])<br/>
                B/F = B<sub>max</sub>/K<sub>d</sub> - B/K<sub>d</sub> (Scatchard)
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
          <ChartIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box>
            <Typography variant="h4">
              Lesson 6: Binding Equilibria Fundamentals
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              K<sub>d</sub>, K<sub>a</sub>, Thermodynamics, and Scatchard Analysis
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label="Intermediate" color="primary" size="small" />
          <Chip label="~25 minutes" variant="outlined" size="small" />
          <Chip label="Drug Discovery" variant="outlined" size="small" />
          <Chip label="Thermodynamics" variant="outlined" size="small" />
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
            You now understand the fundamental principles of binding equilibria and can
            interpret binding data using K<sub>d</sub>, thermodynamics, and Scatchard analysis.
          </Typography>
          <Typography variant="subtitle2" gutterBottom>
            Key Takeaways:
          </Typography>
          <ul>
            <li>K<sub>d</sub> = ligand concentration at half-maximal binding (lower = stronger)</li>
            <li>K<sub>d</sub> = k<sub>off</sub>/k<sub>on</sub> from kinetic rate constants</li>
            <li>ΔG° = RT ln(K<sub>d</sub>) links affinity to thermodynamics</li>
            <li>Saturation curves and Scatchard plots visualize binding behavior</li>
            <li>Non-linear regression is preferred over linear transformations</li>
          </ul>
          <Button variant="outlined" onClick={() => setActiveStep(0)} sx={{ mt: 2 }}>
            Review Lesson
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default Lesson6_BindingEquilibria;
