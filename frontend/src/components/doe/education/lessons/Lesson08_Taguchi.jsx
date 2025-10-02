import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Slider,
  Chip,
  Divider
} from '@mui/material';
import { MathJax } from 'better-react-mathjax';
import SecurityIcon from '@mui/icons-material/Security';
import SettingsIcon from '@mui/icons-material/Settings';

/**
 * DOE Lesson 8: Robust Design & Taguchi Methods
 *
 * Topics:
 * - Taguchi's philosophy of quality
 * - Signal-to-noise ratios (SNR)
 * - Inner and outer arrays (crossed design)
 * - Parameter design vs tolerance design
 * - Quadratic loss function
 * - Practical robustness strategies
 */

const Lesson08_Taguchi = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [temp, setTemp] = useState(350);
  const [pressure, setPressure] = useState(60);
  const [noiseHumidity, setNoiseHumidity] = useState(50);
  const [noiseMaterial, setNoiseMaterial] = useState(0);

  // Simulate response with noise factors
  const calculateResponse = (t, p, h, m) => {
    // Control factors: temp, pressure
    // Noise factors: humidity, material variation
    const tempEffect = 0.5 * (t - 350);
    const pressureEffect = 0.3 * (p - 60);
    const interaction = 0.01 * (t - 350) * (p - 60);

    // Noise effects
    const humidityEffect = 0.15 * (h - 50);
    const materialEffect = m * 2; // m ranges -1 to +1

    // Temperature moderates humidity sensitivity (key to robustness!)
    const tempHumidityInteraction = -0.003 * (t - 350) * (h - 50);

    const baseline = 100;
    return baseline + tempEffect + pressureEffect + interaction
           + humidityEffect + materialEffect + tempHumidityInteraction;
  };

  // Calculate SNR for current settings across noise conditions
  const snrAnalysis = useMemo(() => {
    const noiseConditions = [
      { humidity: 40, material: -1 },
      { humidity: 50, material: 0 },
      { humidity: 60, material: 1 }
    ];

    const responses = noiseConditions.map(n =>
      calculateResponse(temp, pressure, n.humidity, n.material)
    );

    const mean = responses.reduce((sum, r) => sum + r, 0) / responses.length;
    const variance = responses.reduce((sum, r) => sum + (r - mean) ** 2, 0) / responses.length;
    const sd = Math.sqrt(variance);

    // Signal-to-noise ratio (nominal-the-best)
    const snr = 10 * Math.log10(mean * mean / variance);

    return {
      responses,
      mean,
      sd,
      variance,
      snr,
      noiseConditions
    };
  }, [temp, pressure]);

  // Optimal robust settings
  const optimalSettings = useMemo(() => {
    let maxSNR = -Infinity;
    let optTemp = 350;
    let optPressure = 60;

    for (let t = 330; t <= 370; t += 2) {
      for (let p = 50; p <= 70; p += 1) {
        const noiseResponses = [
          calculateResponse(t, p, 40, -1),
          calculateResponse(t, p, 50, 0),
          calculateResponse(t, p, 60, 1)
        ];

        const m = noiseResponses.reduce((sum, r) => sum + r, 0) / 3;
        const v = noiseResponses.reduce((sum, r) => sum + (r - m) ** 2, 0) / 3;
        const s = 10 * Math.log10(m * m / v);

        if (s > maxSNR) {
          maxSNR = s;
          optTemp = t;
          optPressure = p;
        }
      }
    }

    return { temp: optTemp, pressure: optPressure, snr: maxSNR };
  }, []);

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleComplete = () => {
    if (onComplete) onComplete();
  };

  const steps = [
    {
      label: "Taguchi's Philosophy",
      content: (
        <Box>
          <Alert severity="info" icon={<SecurityIcon />} sx={{ mb: 2 }}>
            <strong>Genichi Taguchi's Vision:</strong> Quality should be designed into products and
            processes, not inspected in. The goal is <strong>robustness</strong>—performance that
            is insensitive to uncontrollable variation.
          </Alert>

          <Typography variant="h6" gutterBottom>
            The Quality Loss Function
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Taguchi introduced the <strong>quadratic loss function</strong> to quantify the
              cost of deviation from target:
            </Typography>
            <MathJax>
              {"\\[ L(y) = k (y - T)^2 \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Where:
            </Typography>
            <ul style={{ marginTop: 8, fontSize: '0.875rem' }}>
              <li><em>y</em> = observed response</li>
              <li><em>T</em> = target value</li>
              <li><em>k</em> = cost coefficient</li>
            </ul>
          </Paper>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="error" gutterBottom>
                    Traditional View (Step Function)
                  </Typography>
                  <Typography variant="body2">
                    • Inside specs = zero loss<br/>
                    • Outside specs = scrap/rework<br/>
                    • All "good" parts are equally good<br/>
                    • <strong>Problem:</strong> Ignores gradual degradation
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ bgcolor: '#e8f5e9' }}>
                <CardContent>
                  <Typography variant="subtitle2" color="success.main" gutterBottom>
                    Taguchi View (Quadratic Loss)
                  </Typography>
                  <Typography variant="body2">
                    • Loss increases with deviation from target<br/>
                    • Small deviations matter<br/>
                    • Continuous improvement rewarded<br/>
                    • <strong>Insight:</strong> Reduce variation around target
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Key Concepts
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Concept</strong></TableCell>
                  <TableCell><strong>Definition</strong></TableCell>
                  <TableCell><strong>Example</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell><strong>Control Factors</strong></TableCell>
                  <TableCell>Variables you can set and control</TableCell>
                  <TableCell>Temperature, pressure, catalyst</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Noise Factors</strong></TableCell>
                  <TableCell>Uncontrollable or expensive-to-control variation</TableCell>
                  <TableCell>Humidity, raw material batch, wear</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Signal Factors</strong></TableCell>
                  <TableCell>Intended input/operating conditions</TableCell>
                  <TableCell>Customer settings, load conditions</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Robustness</strong></TableCell>
                  <TableCell>Low sensitivity to noise factors</TableCell>
                  <TableCell>Consistent yield despite humidity changes</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6" gutterBottom>
            Three Strategies for Quality
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Chip label="1. Parameter Design" color="success" size="small" sx={{ mb: 1 }} />
                  <Typography variant="body2">
                    <strong>Find control factor settings that minimize sensitivity to noise.</strong><br/>
                    • Low cost<br/>
                    • High leverage<br/>
                    • Taguchi's focus
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Chip label="2. Tolerance Design" color="warning" size="small" sx={{ mb: 1 }} />
                  <Typography variant="body2">
                    <strong>Tighten tolerances on critical components.</strong><br/>
                    • Higher cost<br/>
                    • Reduces noise<br/>
                    • Use after parameter design
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Chip label="3. Inspection" color="error" size="small" sx={{ mb: 1 }} />
                  <Typography variant="body2">
                    <strong>Screen out defects after production.</strong><br/>
                    • Highest cost<br/>
                    • Waste<br/>
                    • Last resort
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Alert severity="success" sx={{ mt: 2 }}>
            <strong>Taguchi's Insight:</strong> Parameter design is the most cost-effective strategy.
            By cleverly choosing control factor levels, you can make the process immune to noise—
            without tightening tolerances or inspecting parts!
          </Alert>
        </Box>
      )
    },
    {
      label: 'Signal-to-Noise Ratios',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Measuring Robustness
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            The <strong>signal-to-noise ratio (SNR)</strong> combines the mean response (signal)
            and variability (noise) into a single metric. Higher SNR = more robust.
          </Alert>

          <Typography variant="h6" gutterBottom>
            Three Types of SNR
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Chip label="Nominal-the-Best" color="primary" size="small" sx={{ mb: 1 }} />
                  <Typography variant="body2" gutterBottom>
                    <strong>Target a specific value</strong>
                  </Typography>
                  <MathJax>
                    {"\\[ \\text{SNR} = 10 \\log_{10} \\left( \\frac{\\bar{y}^2}{s^2} \\right) \\]"}
                  </MathJax>
                  <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                    Example: Dimension, voltage, pH
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Chip label="Larger-the-Better" color="success" size="small" sx={{ mb: 1 }} />
                  <Typography variant="body2" gutterBottom>
                    <strong>Maximize response</strong>
                  </Typography>
                  <MathJax>
                    {"\\[ \\text{SNR} = -10 \\log_{10} \\left( \\frac{1}{n} \\sum \\frac{1}{y_i^2} \\right) \\]"}
                  </MathJax>
                  <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                    Example: Strength, yield, efficiency
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Chip label="Smaller-the-Better" color="error" size="small" sx={{ mb: 1 }} />
                  <Typography variant="body2" gutterBottom>
                    <strong>Minimize response</strong>
                  </Typography>
                  <MathJax>
                    {"\\[ \\text{SNR} = -10 \\log_{10} \\left( \\frac{1}{n} \\sum y_i^2 \\right) \\]"}
                  </MathJax>
                  <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                    Example: Defects, wear, cost
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>
            Why SNR Works
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Nominal-the-Best SNR Interpretation:</strong>
            </Typography>
            <ul style={{ marginTop: 8, fontSize: '0.875rem' }}>
              <li><strong>Numerator (ȳ²):</strong> Signal—squared mean reflects on-target performance</li>
              <li><strong>Denominator (s²):</strong> Noise—variance captures sensitivity to noise factors</li>
              <li><strong>Ratio:</strong> Higher mean and lower variance both increase SNR</li>
              <li><strong>Log scale:</strong> Additive effects, easier interpretation</li>
            </ul>
          </Paper>

          <Typography variant="h6" gutterBottom>
            Calculation Example
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Noise Condition</strong></TableCell>
                  <TableCell><strong>Response</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Low humidity, Good material</TableCell>
                  <TableCell>98.2</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Medium humidity, Average material</TableCell>
                  <TableCell>100.1</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>High humidity, Poor material</TableCell>
                  <TableCell>97.5</TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                  <TableCell><strong>Mean (ȳ)</strong></TableCell>
                  <TableCell><strong>98.6</strong></TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                  <TableCell><strong>Std Dev (s)</strong></TableCell>
                  <TableCell><strong>1.35</strong></TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                  <TableCell><strong>SNR (dB)</strong></TableCell>
                  <TableCell><strong>37.2 dB</strong></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Alert severity="success">
            <strong>Goal:</strong> Choose control factor settings that <strong>maximize SNR</strong>.
            This ensures the process is both on-target and insensitive to noise factors.
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Two-Step Optimization
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa' }}>
            <Typography variant="body2">
              Taguchi recommends a two-step approach:
            </Typography>
            <ol style={{ marginTop: 8, fontSize: '0.875rem' }}>
              <li><strong>Step 1: Maximize SNR</strong> — Reduce variability using control factors</li>
              <li><strong>Step 2: Adjust Mean</strong> — Bring mean to target using a "tuning factor"
                (a control factor that affects mean but not variance)</li>
            </ol>
            <Typography variant="body2" sx={{ mt: 1 }}>
              This decouples robustness from target adjustment—a powerful simplification!
            </Typography>
          </Paper>
        </Box>
      )
    },
    {
      label: 'Inner & Outer Arrays',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            The Crossed Array Design
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            Taguchi uses a <strong>crossed array</strong> structure: an <strong>inner array</strong>
            for control factors crossed with an <strong>outer array</strong> for noise factors.
          </Alert>

          <Typography variant="h6" gutterBottom>
            Design Structure
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Inner Array (Control Factors)
                  </Typography>
                  <Typography variant="body2">
                    • Orthogonal array (e.g., L<sub>8</sub>, L<sub>16</sub>)<br/>
                    • Control factors we can set<br/>
                    • Designed to estimate main effects efficiently<br/>
                    • Example: Temperature, Pressure, Time
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="error" gutterBottom>
                    Outer Array (Noise Factors)
                  </Typography>
                  <Typography variant="body2">
                    • Small design (often 2-4 runs)<br/>
                    • Noise factors we cannot/won't control<br/>
                    • Mimics real-world variation<br/>
                    • Example: Humidity, Material batch, Wear
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>
            Example: L<sub>4</sub> × N<sub>3</sub> Design
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell rowSpan={2} sx={{ borderRight: '2px solid #1976d2' }}>
                    <strong>Run</strong>
                  </TableCell>
                  <TableCell colSpan={2} align="center" sx={{ borderRight: '2px solid #1976d2', bgcolor: '#e3f2fd' }}>
                    <strong>Inner Array (Control)</strong>
                  </TableCell>
                  <TableCell colSpan={3} align="center" sx={{ bgcolor: '#ffebee' }}>
                    <strong>Outer Array (Noise)</strong>
                  </TableCell>
                  <TableCell rowSpan={2}><strong>SNR</strong></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ bgcolor: '#e3f2fd' }}>Temp</TableCell>
                  <TableCell sx={{ bgcolor: '#e3f2fd', borderRight: '2px solid #1976d2' }}>Press</TableCell>
                  <TableCell sx={{ bgcolor: '#ffebee' }}>N1</TableCell>
                  <TableCell sx={{ bgcolor: '#ffebee' }}>N2</TableCell>
                  <TableCell sx={{ bgcolor: '#ffebee' }}>N3</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ borderRight: '2px solid #1976d2' }}>1</TableCell>
                  <TableCell>330</TableCell>
                  <TableCell sx={{ borderRight: '2px solid #1976d2' }}>50</TableCell>
                  <TableCell>95.2</TableCell>
                  <TableCell>96.8</TableCell>
                  <TableCell>94.5</TableCell>
                  <TableCell><strong>35.6</strong></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ borderRight: '2px solid #1976d2' }}>2</TableCell>
                  <TableCell>330</TableCell>
                  <TableCell sx={{ borderRight: '2px solid #1976d2' }}>70</TableCell>
                  <TableCell>97.1</TableCell>
                  <TableCell>98.3</TableCell>
                  <TableCell>96.9</TableCell>
                  <TableCell><strong>37.8</strong></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ borderRight: '2px solid #1976d2' }}>3</TableCell>
                  <TableCell>370</TableCell>
                  <TableCell sx={{ borderRight: '2px solid #1976d2' }}>50</TableCell>
                  <TableCell>102.5</TableCell>
                  <TableCell>103.1</TableCell>
                  <TableCell>102.8</TableCell>
                  <TableCell><strong>40.2</strong></TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                  <TableCell sx={{ borderRight: '2px solid #1976d2' }}>4</TableCell>
                  <TableCell>370</TableCell>
                  <TableCell sx={{ borderRight: '2px solid #1976d2' }}>70</TableCell>
                  <TableCell>105.8</TableCell>
                  <TableCell>106.2</TableCell>
                  <TableCell>106.0</TableCell>
                  <TableCell><strong>40.5 ✓</strong></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="body2" paragraph>
            • Each inner array run is tested under all outer array noise conditions<br/>
            • For each run, calculate SNR from the 3 noise responses<br/>
            • Analyze SNR to find robust control settings<br/>
            • <span style={{ color: '#4caf50', fontWeight: 'bold' }}>Run 4 (Temp=370°C, Press=70 psi)
            has highest SNR → most robust!</span>
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Advantages of Crossed Arrays
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ bgcolor: '#e8f5e9' }}>
                <CardContent>
                  <Typography variant="subtitle2" color="success.main" gutterBottom>
                    <strong>✓ Benefits</strong>
                  </Typography>
                  <ul style={{ fontSize: '0.875rem', margin: '8px 0' }}>
                    <li>Explicitly tests robustness to noise</li>
                    <li>Identifies control×noise interactions</li>
                    <li>Efficient orthogonal arrays reduce runs</li>
                    <li>Direct SNR calculation for each setting</li>
                  </ul>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ bgcolor: '#fff3e0' }}>
                <CardContent>
                  <Typography variant="subtitle2" color="warning.main" gutterBottom>
                    <strong>⚠ Limitations</strong>
                  </Typography>
                  <ul style={{ fontSize: '0.875rem', margin: '8px 0' }}>
                    <li>Can require many runs (inner × outer)</li>
                    <li>Assumes noise can be varied experimentally</li>
                    <li>Orthogonal arrays may confound interactions</li>
                    <li>Alternative: combined array designs</li>
                  </ul>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Alert severity="info">
            <strong>Modern Alternative:</strong> Combined array designs (single array with both
            control and noise factors) are often more efficient and allow full interaction estimation.
            RSM can also identify robust regions. Choose based on experimental constraints!
          </Alert>
        </Box>
      )
    },
    {
      label: 'Interactive Robustness Exploration',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Find Robust Settings
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            Adjust control factors and observe how noise factors affect variability. The goal is
            to find settings where the response is <strong>insensitive to noise</strong>.
          </Alert>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Control Factors (You Set These)
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" gutterBottom>
                  Temperature (°C)
                </Typography>
                <Slider
                  value={temp}
                  onChange={(e, val) => setTemp(val)}
                  min={330}
                  max={370}
                  step={5}
                  marks={[
                    { value: 330, label: '330' },
                    { value: 350, label: '350' },
                    { value: 370, label: '370' }
                  ]}
                  valueLabelDisplay="on"
                />
                <Typography variant="body2" gutterBottom sx={{ mt: 2 }}>
                  Pressure (psi)
                </Typography>
                <Slider
                  value={pressure}
                  onChange={(e, val) => setPressure(val)}
                  min={50}
                  max={70}
                  step={2}
                  marks={[
                    { value: 50, label: '50' },
                    { value: 60, label: '60' },
                    { value: 70, label: '70' }
                  ]}
                  valueLabelDisplay="on"
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: '#ffebee' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Noise Factors (Uncontrollable)
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" gutterBottom>
                  Humidity (%) — Simulate variation
                </Typography>
                <Slider
                  value={noiseHumidity}
                  onChange={(e, val) => setNoiseHumidity(val)}
                  min={40}
                  max={60}
                  step={5}
                  marks={[
                    { value: 40, label: '40' },
                    { value: 50, label: '50' },
                    { value: 60, label: '60' }
                  ]}
                  valueLabelDisplay="on"
                  disabled
                  sx={{ opacity: 0.6 }}
                />
                <Typography variant="body2" gutterBottom sx={{ mt: 2 }}>
                  Material Variation — Simulate variation
                </Typography>
                <Slider
                  value={noiseMaterial}
                  onChange={(e, val) => setNoiseMaterial(val)}
                  min={-1}
                  max={1}
                  step={1}
                  marks={[
                    { value: -1, label: 'Poor' },
                    { value: 0, label: 'Avg' },
                    { value: 1, label: 'Good' }
                  ]}
                  valueLabelDisplay="off"
                  disabled
                  sx={{ opacity: 0.6 }}
                />
              </Paper>
            </Grid>
          </Grid>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Robustness Analysis
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Noise Condition</strong></TableCell>
                    <TableCell><strong>Humidity</strong></TableCell>
                    <TableCell><strong>Material</strong></TableCell>
                    <TableCell align="right"><strong>Response</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {snrAnalysis.noiseConditions.map((noise, idx) => (
                    <TableRow key={idx}>
                      <TableCell>N{idx + 1}</TableCell>
                      <TableCell>{noise.humidity}%</TableCell>
                      <TableCell>
                        {noise.material === -1 ? 'Poor' : noise.material === 0 ? 'Avg' : 'Good'}
                      </TableCell>
                      <TableCell align="right">{snrAnalysis.responses[idx].toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                    <TableCell colSpan={3}><strong>Mean (ȳ)</strong></TableCell>
                    <TableCell align="right"><strong>{snrAnalysis.mean.toFixed(2)}</strong></TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                    <TableCell colSpan={3}><strong>Std Dev (s)</strong></TableCell>
                    <TableCell align="right"><strong>{snrAnalysis.sd.toFixed(2)}</strong></TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                    <TableCell colSpan={3}><strong>SNR (dB)</strong></TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                        {snrAnalysis.snr.toFixed(2)} dB
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Alert
            severity={snrAnalysis.snr >= optimalSettings.snr - 0.5 ? 'success' : 'warning'}
            sx={{ mb: 2 }}
          >
            {snrAnalysis.snr >= optimalSettings.snr - 0.5 ? (
              <strong>Excellent! You've found robust settings.</strong>
            ) : (
              <strong>Room for improvement.</strong>
            )}
            {' '}Your SNR is {snrAnalysis.snr.toFixed(2)} dB.
            The optimal SNR is {optimalSettings.snr.toFixed(2)} dB at
            Temp={optimalSettings.temp}°C, Pressure={optimalSettings.pressure} psi.
          </Alert>

          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                setTemp(optimalSettings.temp);
                setPressure(optimalSettings.pressure);
              }}
            >
              Jump to Optimal Robust Settings
            </Button>
          </Box>

          <Typography variant="h6" gutterBottom>
            Key Observation
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#e8f5e9' }}>
            <Typography variant="body2">
              Notice how certain control factor combinations make the process <strong>less sensitive</strong>
              to humidity and material variation. This is the essence of robust design—finding
              control factor settings that neutralize noise effects through clever exploitation
              of <strong>control×noise interactions</strong>!
            </Typography>
          </Paper>
        </Box>
      )
    },
    {
      label: 'Summary & Best Practices',
      content: (
        <Box>
          <Alert severity="success" icon={<SecurityIcon />} sx={{ mb: 3 }}>
            <strong>Congratulations!</strong> You've mastered Taguchi Methods and Robust Design—
            powerful techniques for creating processes that perform consistently despite variation.
          </Alert>

          <Typography variant="h6" gutterBottom>
            What You've Learned
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    ✓ Taguchi Philosophy
                  </Typography>
                  <Typography variant="body2">
                    Design quality in through parameter design, using the quadratic loss function
                    to quantify the cost of variation.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    ✓ Signal-to-Noise Ratios
                  </Typography>
                  <Typography variant="body2">
                    Calculate and maximize SNR to find settings that are both on-target and
                    insensitive to noise factors.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    ✓ Crossed Array Design
                  </Typography>
                  <Typography variant="body2">
                    Use inner and outer arrays to systematically study control factor effects
                    under various noise conditions.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    ✓ Robustness Strategy
                  </Typography>
                  <Typography variant="body2">
                    Prioritize parameter design over tolerance tightening or inspection—the most
                    cost-effective path to quality.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>
            Implementation Workflow
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Step</strong></TableCell>
                  <TableCell><strong>Action</strong></TableCell>
                  <TableCell><strong>Deliverable</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>1. Define Quality Characteristic</TableCell>
                  <TableCell>Identify response to optimize (target value)</TableCell>
                  <TableCell>Y, target T, specs</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>2. Identify Factors</TableCell>
                  <TableCell>List control and noise factors</TableCell>
                  <TableCell>Control/noise factor lists</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>3. Design Experiment</TableCell>
                  <TableCell>Choose inner and outer arrays</TableCell>
                  <TableCell>Crossed array design</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>4. Run Experiment</TableCell>
                  <TableCell>Collect data for all combinations</TableCell>
                  <TableCell>Response data matrix</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>5. Calculate SNR</TableCell>
                  <TableCell>Compute SNR for each inner array run</TableCell>
                  <TableCell>SNR values</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>6. Analyze SNR</TableCell>
                  <TableCell>Identify control factors that maximize SNR</TableCell>
                  <TableCell>Robust settings</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>7. Adjust Mean</TableCell>
                  <TableCell>Use tuning factor to hit target</TableCell>
                  <TableCell>Final settings</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>8. Confirm</TableCell>
                  <TableCell>Run confirmation experiments</TableCell>
                  <TableCell>Validation report</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6" gutterBottom>
            Best Practices
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: '#e8f5e9' }}>
                <Typography variant="subtitle2" color="success.main" gutterBottom>
                  <strong>✓ Do This</strong>
                </Typography>
                <ul style={{ fontSize: '0.875rem', margin: '8px 0' }}>
                  <li>Focus on low-cost parameter design first</li>
                  <li>Include realistic noise conditions in outer array</li>
                  <li>Use appropriate SNR for your objective</li>
                  <li>Validate predictions with confirmation runs</li>
                  <li>Document the loss function rationale</li>
                </ul>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: '#ffebee' }}>
                <Typography variant="subtitle2" color="error.main" gutterBottom>
                  <strong>✗ Avoid This</strong>
                </Typography>
                <ul style={{ fontSize: '0.875rem', margin: '8px 0' }}>
                  <li>Ignoring noise factors altogether</li>
                  <li>Using arbitrary or unrealistic noise levels</li>
                  <li>Confusing SNR types (nominal vs larger/smaller)</li>
                  <li>Skipping confirmation experiments</li>
                  <li>Over-reliance on orthogonal arrays (consider RSM too)</li>
                </ul>
              </Paper>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>
            Modern Perspectives
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Taguchi's Legacy:</strong>
            </Typography>
            <Typography variant="body2">
              While some aspects of Taguchi methods (e.g., strict use of orthogonal arrays, SNR
              metrics) have been refined or replaced by modern approaches (RSM, response modeling,
              dual response surface optimization), the <strong>core philosophy</strong> remains
              invaluable:
            </Typography>
            <ul style={{ marginTop: 8, fontSize: '0.875rem' }}>
              <li><strong>Build in quality</strong> through clever design, not inspection</li>
              <li><strong>Minimize variation</strong> around target using control factors</li>
              <li><strong>Test robustness</strong> explicitly against noise</li>
              <li><strong>Low-cost solutions</strong> through parameter design</li>
            </ul>
          </Paper>

          <Typography variant="h6" gutterBottom>
            Real-World Impact
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#e3f2fd', mb: 3 }}>
            <Typography variant="body2">
              <strong>Case Study:</strong> A major automotive supplier used Taguchi methods to
              optimize a welding process. By identifying control factor settings that minimized
              sensitivity to material variation and ambient temperature, they reduced defect rates
              from 8% to 0.5% <em>without changing materials or tightening tolerances</em>—saving
              $10M over 3 years.
            </Typography>
          </Paper>

          <Alert severity="success" sx={{ mb: 3 }}>
            <strong>You've Completed the DOE Module!</strong> You now have a comprehensive toolkit
            spanning factorial designs, blocking, RSM, multi-objective optimization, and robust
            design. These are the methods used by leading engineers and scientists worldwide.
          </Alert>

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={handleComplete}
            >
              Complete DOE Module!
            </Button>
          </Box>
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SecurityIcon sx={{ fontSize: 40, color: '#1976d2', mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2' }}>
              Robust Design & Taguchi Methods
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Designing for Quality Despite Variation
            </Typography>
          </Box>
        </Box>

        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>{step.label}</StepLabel>
              <StepContent>
                {step.content}
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    sx={{ mr: 1 }}
                  >
                    {index === steps.length - 1 ? 'Finish' : 'Continue'}
                  </Button>
                  {index > 0 && (
                    <Button onClick={handleBack}>
                      Back
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>
    </Box>
  );
};

export default Lesson08_Taguchi;
