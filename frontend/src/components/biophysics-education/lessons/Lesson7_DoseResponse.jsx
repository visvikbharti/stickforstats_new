/**
 * Lesson 7: Dose-Response Analysis
 *
 * Comprehensive coverage of dose-response curves:
 * - IC50 and EC50 concepts
 * - 4-Parameter Logistic (4PL) model
 * - Hill slope interpretation
 * - Drug screening applications
 * - Cheng-Prusoff equation
 * - Therapeutic index
 *
 * ~850 lines of educational content
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
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  LocalPharmacy as PharmacyIcon,
  CheckCircle as CheckIcon,
  TrendingDown as InhibitionIcon,
  TrendingUp as StimulationIcon
} from '@mui/icons-material';

const STEPS = [
  'Introduction to Dose-Response',
  'The 4-Parameter Logistic Model',
  'IC50 vs EC50',
  'Hill Slope Interpretation',
  'Cheng-Prusoff Equation',
  'Drug Discovery Applications'
];

const Lesson7_DoseResponse = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [params4PL, setParams4PL] = useState({
    top: 100,
    bottom: 0,
    logIC50: -6, // 1 μM
    hillSlope: 1
  });
  const [responseType, setResponseType] = useState('inhibition');
  const [chengPrusoffInputs, setChengPrusoffInputs] = useState({
    IC50: 100, // nM
    ligandConc: 10, // nM
    Kd: 1 // nM
  });
  const [showMultipleCurves, setShowMultipleCurves] = useState(false);

  const doseResponseCanvasRef = useRef(null);
  const hillComparisonCanvasRef = useRef(null);
  const therapeuticCanvasRef = useRef(null);

  // 4PL equation
  const fourPL = useCallback((logConc, top, bottom, logIC50, hillSlope) => {
    return bottom + (top - bottom) / (1 + Math.pow(10, (logIC50 - logConc) * hillSlope));
  }, []);

  // Draw dose-response curve
  useEffect(() => {
    const canvas = doseResponseCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const minLog = -10;
    const maxLog = -3;
    const logRange = maxLog - minLog;

    const maxY = Math.max(params4PL.top, params4PL.bottom) * 1.1 + 10;
    const minY = Math.min(params4PL.top, params4PL.bottom) - 10;
    const yRange = maxY - minY;

    const xToCanvas = x => padding + ((x - minLog) / logRange) * (width - 2 * padding);
    const yToCanvas = y => height - padding - ((y - minY) / yRange) * (height - 2 * padding);

    // Grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 7; i++) {
      const x = padding + (i / 7) * (width - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
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

    // Draw comparison curves if enabled
    if (showMultipleCurves) {
      const hillSlopes = [0.5, 1, 2];
      hillSlopes.forEach((h, idx) => {
        if (Math.abs(h - params4PL.hillSlope) < 0.1) return; // Skip if same as main
        ctx.strokeStyle = ['#ffb74d', '#90caf9', '#ce93d8'][idx];
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        for (let logC = minLog; logC <= maxLog; logC += 0.05) {
          const y = fourPL(logC, params4PL.top, params4PL.bottom, params4PL.logIC50, h);
          const cx = xToCanvas(logC);
          const cy = yToCanvas(y);
          if (logC === minLog) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        }
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    // Main curve
    const curveColor = responseType === 'inhibition' ? '#d32f2f' : '#4caf50';
    ctx.strokeStyle = curveColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let logC = minLog; logC <= maxLog; logC += 0.05) {
      const y = fourPL(logC, params4PL.top, params4PL.bottom, params4PL.logIC50, params4PL.hillSlope);
      const cx = xToCanvas(logC);
      const cy = yToCanvas(y);
      if (logC === minLog) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    // IC50/EC50 marker
    const ic50Y = (params4PL.top + params4PL.bottom) / 2;
    const ic50X = xToCanvas(params4PL.logIC50);
    const ic50CanvasY = yToCanvas(ic50Y);

    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ic50X, height - padding);
    ctx.lineTo(ic50X, ic50CanvasY);
    ctx.lineTo(padding, ic50CanvasY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ff9800';
    ctx.beginPath();
    ctx.arc(ic50X, ic50CanvasY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Top and Bottom lines
    ctx.strokeStyle = '#666';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padding, yToCanvas(params4PL.top));
    ctx.lineTo(width - padding, yToCanvas(params4PL.top));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(padding, yToCanvas(params4PL.bottom));
    ctx.lineTo(width - padding, yToCanvas(params4PL.bottom));
    ctx.stroke();
    ctx.setLineDash([]);

    // X-axis labels (log scale)
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    const logLabels = [-10, -9, -8, -7, -6, -5, -4, -3];
    const concLabels = ['pM', '10pM', '100pM', 'nM', '10nM', '100nM', 'μM', '10μM'];
    logLabels.forEach((log, idx) => {
      if (log >= minLog && log <= maxLog) {
        ctx.fillText(concLabels[idx] || `10^${log}`, xToCanvas(log), height - padding + 15);
      }
    });

    // Labels
    ctx.fillStyle = '#333333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('[Drug] (log scale)', width / 2, height - 5);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Response (%)', 0, 0);
    ctx.restore();

    // Annotations
    ctx.font = '12px Arial';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'left';
    ctx.fillText(`Top = ${params4PL.top}`, width - padding - 80, yToCanvas(params4PL.top) - 5);
    ctx.fillText(`Bottom = ${params4PL.bottom}`, width - padding - 80, yToCanvas(params4PL.bottom) + 15);

    ctx.fillStyle = '#ff9800';
    ctx.font = 'bold 12px Arial';
    const ic50Label = responseType === 'inhibition' ? 'IC50' : 'EC50';
    ctx.fillText(`${ic50Label} = ${Math.pow(10, params4PL.logIC50 + 9).toFixed(1)} nM`, ic50X + 10, ic50CanvasY - 10);

  }, [params4PL, responseType, showMultipleCurves, fourPL]);

  // Draw Hill slope comparison
  useEffect(() => {
    const canvas = hillComparisonCanvasRef.current;
    if (!canvas || activeStep < 3) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const minLog = -9;
    const maxLog = -5;
    const logRange = maxLog - minLog;

    const xToCanvas = x => padding + ((x - minLog) / logRange) * (width - 2 * padding);
    const yToCanvas = y => height - padding - (y / 110) * (height - 2 * padding);

    // Grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const x = padding + (i / 4) * (width - 2 * padding);
      const y = padding + (i / 4) * (height - 2 * padding);
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

    // Draw curves for different Hill slopes
    const hillSlopes = [
      { h: 0.5, color: '#ff9800', label: 'n = 0.5 (shallow)' },
      { h: 1, color: '#1976d2', label: 'n = 1 (standard)' },
      { h: 2, color: '#9c27b0', label: 'n = 2 (steep)' },
      { h: 4, color: '#d32f2f', label: 'n = 4 (very steep)' }
    ];

    hillSlopes.forEach(({ h, color }) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let logC = minLog; logC <= maxLog; logC += 0.05) {
        const y = fourPL(logC, 100, 0, -7, h);
        const cx = xToCanvas(logC);
        const cy = yToCanvas(y);
        if (logC === minLog) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    });

    // IC50 line
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xToCanvas(-7), padding);
    ctx.lineTo(xToCanvas(-7), height - padding);
    ctx.stroke();
    ctx.setLineDash([]);

    // Legend
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    hillSlopes.forEach(({ color, label }, idx) => {
      ctx.fillStyle = color;
      ctx.fillRect(width - padding - 110, padding + 15 + idx * 20, 15, 10);
      ctx.fillStyle = '#333';
      ctx.fillText(label, width - padding - 90, padding + 23 + idx * 20);
    });

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('[Drug]', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Response (%)', 0, 0);
    ctx.restore();

  }, [activeStep, fourPL]);

  const handleNext = () => setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 0));

  // Cheng-Prusoff calculation
  const calculateKi = () => {
    const { IC50, ligandConc, Kd } = chengPrusoffInputs;
    return IC50 / (1 + ligandConc / Kd);
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Introduction to Dose-Response Analysis
            </Typography>

            <Typography paragraph>
              A <strong>dose-response curve</strong> shows how the magnitude of a biological
              response changes with the concentration of a drug or compound. This is the
              foundation of pharmacology and drug discovery.
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Card sx={{ bgcolor: (theme) => alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ color: '#d32f2f', display: 'flex', alignItems: 'center' }}>
                      <InhibitionIcon sx={{ mr: 1 }} />
                      Inhibition Curves
                    </Typography>
                    <Typography variant="body2">
                      Response <strong>decreases</strong> with drug concentration.<br/>
                      Examples: enzyme inhibitors, receptor antagonists<br/>
                      Key parameter: <strong>IC50</strong> (inhibitory concentration)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ color: '#4caf50', display: 'flex', alignItems: 'center' }}>
                      <StimulationIcon sx={{ mr: 1 }} />
                      Stimulation Curves
                    </Typography>
                    <Typography variant="body2">
                      Response <strong>increases</strong> with drug concentration.<br/>
                      Examples: receptor agonists, growth factors<br/>
                      Key parameter: <strong>EC50</strong> (effective concentration)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Key Principle:</strong> Dose-response curves are typically plotted with
                drug concentration on a <strong>logarithmic scale</strong>. This makes the
                sigmoidal curve symmetric and easier to analyze.
              </Typography>
            </Alert>

            <Typography variant="subtitle1" gutterBottom>
              Interactive: Choose Response Type
            </Typography>

            <Box sx={{ mb: 2 }}>
              <ToggleButtonGroup
                value={responseType}
                exclusive
                onChange={(e, v) => v && setResponseType(v)}
                size="small"
              >
                <ToggleButton value="inhibition" sx={{ color: '#d32f2f' }}>
                  <InhibitionIcon sx={{ mr: 1 }} />
                  Inhibition
                </ToggleButton>
                <ToggleButton value="stimulation" sx={{ color: '#4caf50' }}>
                  <StimulationIcon sx={{ mr: 1 }} />
                  Stimulation
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {responseType === 'stimulation' && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                For stimulation curves, swap Top and Bottom values below to see the ascending curve.
              </Alert>
            )}

            <canvas ref={doseResponseCanvasRef} width={550} height={350} style={{ border: '1px solid #ddd', display: 'block', margin: '0 auto' }} />
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              The 4-Parameter Logistic (4PL) Model
            </Typography>

            <Typography paragraph>
              The 4PL model is the standard equation for fitting dose-response data.
              It describes the sigmoidal relationship between concentration and response.
            </Typography>

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 3 }}>
              <Typography variant="h6" align="center" sx={{ fontFamily: 'serif' }}>
                Y = Bottom + (Top - Bottom) / (1 + 10<sup>(LogIC50 - X) × HillSlope</sup>)
              </Typography>
            </Paper>

            <Typography variant="subtitle1" gutterBottom>
              The Four Parameters
            </Typography>

            <Table size="small" sx={{ mb: 3 }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Parameter</strong></TableCell>
                  <TableCell><strong>Meaning</strong></TableCell>
                  <TableCell><strong>Typical Values</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ color: '#4caf50' }}>Top</TableCell>
                  <TableCell>Upper asymptote (max response)</TableCell>
                  <TableCell>100% for normalized data</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ color: '#d32f2f' }}>Bottom</TableCell>
                  <TableCell>Lower asymptote (min response)</TableCell>
                  <TableCell>0% for complete inhibition</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ color: '#ff9800', fontWeight: 'bold' }}>LogIC50</TableCell>
                  <TableCell>Log of concentration at 50% response</TableCell>
                  <TableCell>-9 to -3 (nM to mM range)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ color: '#9c27b0' }}>Hill Slope</TableCell>
                  <TableCell>Steepness of the curve</TableCell>
                  <TableCell>Usually ~1, can vary 0.5-4</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Typography variant="subtitle1" gutterBottom>
              Interactive: Adjust Parameters
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6} md={3}>
                <Typography variant="body2">Top: {params4PL.top}</Typography>
                <Slider
                  value={params4PL.top}
                  onChange={(e, v) => setParams4PL(p => ({ ...p, top: v }))}
                  min={50}
                  max={150}
                  valueLabelDisplay="auto"
                  sx={{ color: '#4caf50' }}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2">Bottom: {params4PL.bottom}</Typography>
                <Slider
                  value={params4PL.bottom}
                  onChange={(e, v) => setParams4PL(p => ({ ...p, bottom: v }))}
                  min={-20}
                  max={50}
                  valueLabelDisplay="auto"
                  sx={{ color: '#d32f2f' }}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2">Log IC50: {params4PL.logIC50} ({Math.pow(10, params4PL.logIC50 + 9).toFixed(1)} nM)</Typography>
                <Slider
                  value={params4PL.logIC50}
                  onChange={(e, v) => setParams4PL(p => ({ ...p, logIC50: v }))}
                  min={-9}
                  max={-4}
                  step={0.1}
                  valueLabelDisplay="auto"
                  sx={{ color: '#ff9800' }}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2">Hill Slope: {params4PL.hillSlope.toFixed(1)}</Typography>
                <Slider
                  value={params4PL.hillSlope}
                  onChange={(e, v) => setParams4PL(p => ({ ...p, hillSlope: v }))}
                  min={0.3}
                  max={4}
                  step={0.1}
                  valueLabelDisplay="auto"
                  sx={{ color: '#9c27b0' }}
                />
              </Grid>
            </Grid>

            <canvas ref={doseResponseCanvasRef} width={550} height={350} style={{ border: '1px solid #ddd', display: 'block', margin: '0 auto' }} />

            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Tip:</strong> A well-behaved dose-response curve should have Top ~100%,
                Bottom ~0%, and a complete sigmoidal shape. Partial curves (not reaching
                top or bottom) make IC50 estimation unreliable.
              </Typography>
            </Alert>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              IC50 vs EC50: What's the Difference?
            </Typography>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
                  <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f' }}>
                    IC50 (Inhibitory Concentration 50%)
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Concentration that produces <strong>50% inhibition</strong> of the maximum response.
                  </Typography>
                  <Typography variant="body2">
                    <strong>Used for:</strong>
                    <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                      <li>Enzyme inhibitors</li>
                      <li>Receptor antagonists</li>
                      <li>Cytotoxicity assays</li>
                      <li>Drug interaction studies</li>
                    </ul>
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
                  <Typography variant="h6" gutterBottom sx={{ color: '#4caf50' }}>
                    EC50 (Effective Concentration 50%)
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Concentration that produces <strong>50% of the maximum effect</strong>.
                  </Typography>
                  <Typography variant="body2">
                    <strong>Used for:</strong>
                    <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                      <li>Receptor agonists</li>
                      <li>Growth factors</li>
                      <li>Drug efficacy studies</li>
                      <li>Potency comparisons</li>
                    </ul>
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Important Distinction:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                  <li><strong>IC50 is NOT the same as Ki!</strong> IC50 depends on assay conditions.</li>
                  <li><strong>EC50 is NOT the same as Kd!</strong> EC50 reflects functional potency.</li>
                  <li>Use the Cheng-Prusoff equation to convert IC50 to Ki (see next lesson).</li>
                </ul>
              </Typography>
            </Alert>

            <Typography variant="subtitle1" gutterBottom>
              Related Concentrations
            </Typography>

            <Table size="small" sx={{ mb: 3 }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Parameter</strong></TableCell>
                  <TableCell><strong>Definition</strong></TableCell>
                  <TableCell><strong>Use Case</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>IC10 / EC10</TableCell>
                  <TableCell>10% effect concentration</TableCell>
                  <TableCell>Threshold of activity</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>IC20 / EC20</TableCell>
                  <TableCell>20% effect concentration</TableCell>
                  <TableCell>Low-dose response</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>IC50 / EC50</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>50% effect concentration</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Standard potency measure</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>IC90 / EC90</TableCell>
                  <TableCell>90% effect concentration</TableCell>
                  <TableCell>Near-complete inhibition</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>IC99</TableCell>
                  <TableCell>99% inhibition</TableCell>
                  <TableCell>Complete kill (e.g., antibiotics)</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" gutterBottom>
                Calculating ICx from IC50 and Hill Slope
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                ICx = IC50 × ((100-x)/x)<sup>1/n</sup><br/><br/>
                Example: IC90 = IC50 × (10/90)<sup>1/n</sup> = IC50 × 0.111<sup>1/n</sup><br/><br/>
                If n = 1: IC90 = IC50 × 9 = ~9-fold higher than IC50
              </Typography>
            </Paper>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Hill Slope Interpretation
            </Typography>

            <Typography paragraph>
              The <strong>Hill slope</strong> (also called "slope factor" or "n<sub>H</sub>")
              determines the steepness of the dose-response curve. It provides information
              about the binding mechanism.
            </Typography>

            <canvas ref={hillComparisonCanvasRef} width={500} height={350} style={{ border: '1px solid #ddd', display: 'block', margin: '0 auto' }} />

            <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
              What Hill Slope Tells Us
            </Typography>

            <Table size="small" sx={{ mb: 3 }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Hill Slope</strong></TableCell>
                  <TableCell><strong>Curve Shape</strong></TableCell>
                  <TableCell><strong>Possible Mechanisms</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ color: '#ff9800' }}>n &lt; 1</TableCell>
                  <TableCell>Shallow (spread out)</TableCell>
                  <TableCell>
                    • Negative cooperativity<br/>
                    • Multiple binding sites with different affinities<br/>
                    • Non-specific effects at high concentrations
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ color: '#1976d2', fontWeight: 'bold' }}>n = 1</TableCell>
                  <TableCell>Standard sigmoidal</TableCell>
                  <TableCell>
                    • Simple 1:1 binding<br/>
                    • Single binding site<br/>
                    • Mass action kinetics
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ color: '#9c27b0' }}>n &gt; 1</TableCell>
                  <TableCell>Steep (switch-like)</TableCell>
                  <TableCell>
                    • Positive cooperativity<br/>
                    • Ultrasensitive response<br/>
                    • Multiple drug molecules required
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Practical Rule:</strong> For drug discovery, Hill slopes between 0.7-1.3
                are considered "normal." Values outside this range warrant investigation of
                the mechanism or assay artifacts.
              </Typography>
            </Alert>

            <Typography variant="subtitle1" gutterBottom>
              Impact on IC90/IC10 Ratio
            </Typography>

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <Typography variant="body2" paragraph>
                The Hill slope dramatically affects how wide the dose range is from minimal
                to maximal effect:
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                IC90/IC10 ratio = 81<sup>1/n</sup><br/><br/>
                n = 0.5: IC90/IC10 = 81² = 6561 (huge dose range!)<br/>
                n = 1.0: IC90/IC10 = 81 (standard)<br/>
                n = 2.0: IC90/IC10 = 9 (narrow dose range)<br/>
                n = 4.0: IC90/IC10 = 3 (very narrow, switch-like)
              </Typography>
            </Paper>
          </Box>
        );

      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Cheng-Prusoff Equation
            </Typography>

            <Typography paragraph>
              The <strong>Cheng-Prusoff equation</strong> converts IC50 (which depends on assay
              conditions) to K<sub>i</sub> (an intrinsic property of the inhibitor).
            </Typography>

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 3 }}>
              <Typography variant="h6" align="center" sx={{ fontFamily: 'serif' }}>
                K<sub>i</sub> = IC50 / (1 + [L]/K<sub>d</sub>)
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" align="center">
                Where [L] is the radioligand/substrate concentration and K<sub>d</sub> is its
                dissociation constant for the receptor/enzyme.
              </Typography>
            </Paper>

            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>When to use Cheng-Prusoff:</strong> This equation applies to
                <em> competitive inhibitors</em> in equilibrium binding assays. For enzyme
                assays, use K<sub>m</sub> instead of K<sub>d</sub>.
              </Typography>
            </Alert>

            <Typography variant="subtitle1" gutterBottom>
              Interactive Calculator
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="IC50"
                  type="number"
                  value={chengPrusoffInputs.IC50}
                  onChange={(e) => setChengPrusoffInputs(p => ({ ...p, IC50: parseFloat(e.target.value) || 0 }))}
                  size="small"
                  fullWidth
                  InputProps={{
                    endAdornment: <InputAdornment position="end">nM</InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="[Ligand]"
                  type="number"
                  value={chengPrusoffInputs.ligandConc}
                  onChange={(e) => setChengPrusoffInputs(p => ({ ...p, ligandConc: parseFloat(e.target.value) || 0 }))}
                  size="small"
                  fullWidth
                  InputProps={{
                    endAdornment: <InputAdornment position="end">nM</InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Kd (or Km)"
                  type="number"
                  value={chengPrusoffInputs.Kd}
                  onChange={(e) => setChengPrusoffInputs(p => ({ ...p, Kd: parseFloat(e.target.value) || 0 }))}
                  size="small"
                  fullWidth
                  InputProps={{
                    endAdornment: <InputAdornment position="end">nM</InputAdornment>
                  }}
                />
              </Grid>
            </Grid>

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <Typography variant="h6">
                Calculated K<sub>i</sub> = {calculateKi().toFixed(2)} nM
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, fontFamily: 'monospace' }}>
                K<sub>i</sub> = {chengPrusoffInputs.IC50} / (1 + {chengPrusoffInputs.ligandConc}/{chengPrusoffInputs.Kd})<br/>
                K<sub>i</sub> = {chengPrusoffInputs.IC50} / {(1 + chengPrusoffInputs.ligandConc/chengPrusoffInputs.Kd).toFixed(2)}<br/>
                K<sub>i</sub> = {calculateKi().toFixed(2)} nM
              </Typography>
            </Paper>

            <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
              Key Insight: IC50 vs K<sub>i</sub>
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>[L]/K<sub>d</sub></strong></TableCell>
                  <TableCell><strong>IC50/K<sub>i</sub> Ratio</strong></TableCell>
                  <TableCell><strong>Interpretation</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>0.1</TableCell>
                  <TableCell>1.1</TableCell>
                  <TableCell>IC50 ≈ K<sub>i</sub> (low ligand)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>1</TableCell>
                  <TableCell>2</TableCell>
                  <TableCell>IC50 = 2 × K<sub>i</sub></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>10</TableCell>
                  <TableCell>11</TableCell>
                  <TableCell>IC50 >> K<sub>i</sub> (high ligand)</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        );

      case 5:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Drug Discovery Applications
            </Typography>

            <Typography paragraph>
              Dose-response analysis is central to every stage of drug discovery:
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      1. High-Throughput Screening (HTS)
                    </Typography>
                    <Typography variant="body2">
                      • Initial single-point screens at fixed concentration<br/>
                      • Hits confirmed with dose-response curves<br/>
                      • IC50 used to rank and prioritize compounds
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      2. Lead Optimization
                    </Typography>
                    <Typography variant="body2">
                      • Structure-Activity Relationships (SAR)<br/>
                      • Track IC50 changes with chemical modifications<br/>
                      • Goal: improve potency while maintaining selectivity
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      3. Selectivity Profiling
                    </Typography>
                    <Typography variant="body2">
                      • Compare IC50 against target vs off-targets<br/>
                      • Selectivity ratio = IC50(off-target) / IC50(target)<br/>
                      • Higher ratio = better selectivity
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      4. Safety Assessment
                    </Typography>
                    <Typography variant="body2">
                      • Therapeutic Index = TD50 / ED50<br/>
                      • Cytotoxicity CC50 vs efficacy EC50<br/>
                      • Selectivity Index = CC50 / EC50 (antiviral)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Typography variant="subtitle1" gutterBottom>
              Therapeutic Index
            </Typography>

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 3 }}>
              <Typography variant="body1" sx={{ fontFamily: 'serif', textAlign: 'center', mb: 2 }}>
                Therapeutic Index (TI) = TD50 / ED50
              </Typography>
              <Typography variant="body2">
                <strong>TD50:</strong> Dose producing toxicity in 50% of subjects<br/>
                <strong>ED50:</strong> Dose producing therapeutic effect in 50% of subjects<br/><br/>
                <strong>Interpretation:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                  <li>TI &gt; 10: Generally considered safe margin</li>
                  <li>TI 1-10: Narrow therapeutic window (careful dosing needed)</li>
                  <li>TI &lt; 1: Toxic before therapeutic (not viable)</li>
                </ul>
              </Typography>
            </Paper>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" gutterBottom>
              Summary: Key Equations
            </Typography>

            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                <strong>4PL Model:</strong><br/>
                Y = Bottom + (Top - Bottom) / (1 + 10<sup>(LogIC50-X)×n</sup>)<br/><br/>
                <strong>Cheng-Prusoff:</strong><br/>
                K<sub>i</sub> = IC50 / (1 + [L]/K<sub>d</sub>)<br/><br/>
                <strong>ICx from IC50:</strong><br/>
                ICx = IC50 × ((100-x)/x)<sup>1/n</sup><br/><br/>
                <strong>Therapeutic Index:</strong><br/>
                TI = TD50 / ED50
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
          <PharmacyIcon sx={{ fontSize: 40, color: '#d32f2f', mr: 2 }} />
          <Box>
            <Typography variant="h4">
              Lesson 7: Dose-Response Analysis
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              IC50, EC50, 4PL Model, and Drug Discovery Applications
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label="Intermediate" color="primary" size="small" />
          <Chip label="~30 minutes" variant="outlined" size="small" />
          <Chip label="Drug Discovery" variant="outlined" size="small" />
          <Chip label="Pharmacology" variant="outlined" size="small" />
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
            You've mastered dose-response analysis, including the 4PL model, IC50/EC50 interpretation,
            Hill slope analysis, and the Cheng-Prusoff equation.
          </Typography>
          <Typography variant="subtitle2" gutterBottom>
            Key Takeaways:
          </Typography>
          <ul>
            <li>4PL model has 4 parameters: Top, Bottom, LogIC50, Hill Slope</li>
            <li>IC50 = inhibition potency, EC50 = activation potency</li>
            <li>Hill slope indicates binding mechanism (n=1 is simple 1:1)</li>
            <li>Cheng-Prusoff converts IC50 to Ki for competitive inhibitors</li>
            <li>Therapeutic index guides safety assessment</li>
          </ul>
          <Button variant="outlined" onClick={() => setActiveStep(0)} sx={{ mt: 2 }}>
            Review Lesson
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default Lesson7_DoseResponse;
