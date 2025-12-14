/**
 * Lesson 3: Statistical Power
 *
 * This lesson covers the definition of statistical power, its intuition,
 * why 80% is the conventional target, and when to use different power levels.
 * Includes interactive visualizations showing the relationship between
 * overlapping distributions, critical values, and power.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Grid,
  Slider,
  Alert,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
} from '@mui/material';
import {
  NavigateNext,
  NavigateBefore,
  CheckCircle,
  BoltOutlined,
  ExpandMore,
  Lightbulb,
  Science,
  Warning,
  Info,
  PlayArrow,
  TrendingUp,
  Psychology,
  School,
  BarChart,
} from '@mui/icons-material';

// Step titles for the lesson
const steps = [
  'What is Statistical Power?',
  'Power as Probability',
  'The 80% Convention',
  'Factors Affecting Power',
  'Choosing Your Target Power',
];

const Lesson03_StatisticalPower = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  // Interactive visualization state
  const [effectSize, setEffectSize] = useState(0.5);
  const [sampleSize, setSampleSize] = useState(30);
  const [alpha, setAlpha] = useState(0.05);
  const [calculatedPower, setCalculatedPower] = useState(0.478);
  const [calculatedBeta, setCalculatedBeta] = useState(0.522);

  // Animation state
  const [animationPhase, setAnimationPhase] = useState(0);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Calculate power based on parameters (simplified formula for two-sample t-test)
  const calculatePower = useCallback(() => {
    // Simplified power calculation using normal approximation
    // λ (noncentrality) = d * sqrt(n/2) for two-sample t-test
    const noncentrality = effectSize * Math.sqrt(sampleSize / 2);

    // Critical value for two-tailed test
    const zAlpha = alpha === 0.05 ? 1.96 : alpha === 0.01 ? 2.576 : alpha === 0.10 ? 1.645 : 1.96;

    // Power approximation using standard normal CDF
    // Φ(λ - z_{α/2}) + Φ(-λ - z_{α/2})
    const z1 = noncentrality - zAlpha;
    const z2 = -noncentrality - zAlpha;

    // Standard normal CDF approximation
    const normalCDF = (x) => {
      const a1 = 0.254829592;
      const a2 = -0.284496736;
      const a3 = 1.421413741;
      const a4 = -1.453152027;
      const a5 = 1.061405429;
      const p = 0.3275911;
      const sign = x < 0 ? -1 : 1;
      x = Math.abs(x) / Math.sqrt(2);
      const t = 1.0 / (1.0 + p * x);
      const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
      return 0.5 * (1.0 + sign * y);
    };

    const power = normalCDF(z1) + normalCDF(z2);
    setCalculatedPower(Math.min(0.999, Math.max(0.001, power)));
    setCalculatedBeta(1 - Math.min(0.999, Math.max(0.001, power)));
  }, [effectSize, sampleSize, alpha]);

  useEffect(() => {
    calculatePower();
  }, [calculatePower]);

  // Draw the power visualization
  const drawPowerVisualization = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Parameters for drawing
    const h0Mean = 0;
    // Use actual noncentrality parameter: λ = d × √(n/2), scaled for visualization
    const noncentrality = effectSize * Math.sqrt(sampleSize / 2);
    // Scale the noncentrality to fit nicely in the visualization (max around 4-5)
    const h1Mean = Math.min(noncentrality * 0.8, 5);
    const sd = 1;

    // Calculate critical value dynamically using inverse normal approximation
    // For two-tailed test, we need z_{α/2}
    const normalQuantile = (p) => {
      // Rational approximation for inverse normal CDF (Abramowitz and Stegun)
      if (p <= 0) return -Infinity;
      if (p >= 1) return Infinity;
      if (p === 0.5) return 0;

      const a = [
        -3.969683028665376e+01,
        2.209460984245205e+02,
        -2.759285104469687e+02,
        1.383577518672690e+02,
        -3.066479806614716e+01,
        2.506628277459239e+00
      ];
      const b = [
        -5.447609879822406e+01,
        1.615858368580409e+02,
        -1.556989798598866e+02,
        6.680131188771972e+01,
        -1.328068155288572e+01
      ];
      const c = [
        -7.784894002430293e-03,
        -3.223964580411365e-01,
        -2.400758277161838e+00,
        -2.549732539343734e+00,
        4.374664141464968e+00,
        2.938163982698783e+00
      ];
      const d = [
        7.784695709041462e-03,
        3.224671290700398e-01,
        2.445134137142996e+00,
        3.754408661907416e+00
      ];

      const pLow = 0.02425;
      const pHigh = 1 - pLow;
      let q, r;

      if (p < pLow) {
        q = Math.sqrt(-2 * Math.log(p));
        return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
               ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
      } else if (p <= pHigh) {
        q = p - 0.5;
        r = q * q;
        return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
               (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
      } else {
        q = Math.sqrt(-2 * Math.log(1 - p));
        return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
                ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
      }
    };

    // Critical value for two-tailed test at current alpha
    const critVal = normalQuantile(1 - alpha / 2);

    const xMin = -4;
    const xMax = 7;
    const xScale = width / (xMax - xMin);
    const yScale = height * 0.55;
    const baseY = height - 60;

    // Helper: Normal PDF
    const normalPDF = (x, mean, sd) => {
      const z = (x - mean) / sd;
      return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
    };

    // Draw filled regions first

    // 1. Alpha region (Type I error - red) - under H0 beyond critical value
    ctx.fillStyle = 'rgba(244, 67, 54, 0.4)';
    ctx.beginPath();
    ctx.moveTo((critVal - xMin) * xScale, baseY);
    for (let x = critVal; x <= xMax; x += 0.02) {
      const y = normalPDF(x, h0Mean, sd);
      ctx.lineTo((x - xMin) * xScale, baseY - y * yScale * 4);
    }
    ctx.lineTo((xMax - xMin) * xScale, baseY);
    ctx.closePath();
    ctx.fill();

    // 2. Beta region (Type II error - orange) - under H1 before critical value
    ctx.fillStyle = 'rgba(255, 152, 0, 0.4)';
    ctx.beginPath();
    ctx.moveTo((xMin - xMin) * xScale, baseY);
    for (let x = xMin; x <= critVal; x += 0.02) {
      const y = normalPDF(x, h1Mean, sd);
      ctx.lineTo((x - xMin) * xScale, baseY - y * yScale * 4);
    }
    ctx.lineTo((critVal - xMin) * xScale, baseY);
    ctx.closePath();
    ctx.fill();

    // 3. Power region (blue) - under H1 beyond critical value
    ctx.fillStyle = 'rgba(33, 150, 243, 0.5)';
    ctx.beginPath();
    ctx.moveTo((critVal - xMin) * xScale, baseY);
    for (let x = critVal; x <= xMax; x += 0.02) {
      const y = normalPDF(x, h1Mean, sd);
      ctx.lineTo((x - xMin) * xScale, baseY - y * yScale * 4);
    }
    ctx.lineTo((xMax - xMin) * xScale, baseY);
    ctx.closePath();
    ctx.fill();

    // Draw distribution curves
    // H0 distribution (gray/black)
    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = xMin; x <= xMax; x += 0.02) {
      const y = normalPDF(x, h0Mean, sd);
      const canvasX = (x - xMin) * xScale;
      const canvasY = baseY - y * yScale * 4;
      if (x === xMin) ctx.moveTo(canvasX, canvasY);
      else ctx.lineTo(canvasX, canvasY);
    }
    ctx.stroke();

    // H1 distribution (blue)
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = xMin; x <= xMax; x += 0.02) {
      const y = normalPDF(x, h1Mean, sd);
      const canvasX = (x - xMin) * xScale;
      const canvasY = baseY - y * yScale * 4;
      if (x === xMin) ctx.moveTo(canvasX, canvasY);
      else ctx.lineTo(canvasX, canvasY);
    }
    ctx.stroke();

    // Critical value line
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    const critX = (critVal - xMin) * xScale;
    ctx.beginPath();
    ctx.moveTo(critX, 20);
    ctx.lineTo(critX, baseY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';

    // Distribution labels
    ctx.fillStyle = '#424242';
    ctx.fillText('H₀ Distribution', (h0Mean - xMin) * xScale, 25);

    ctx.fillStyle = '#1976d2';
    ctx.fillText('H₁ Distribution', (h1Mean - xMin) * xScale, 25);

    // Region labels
    ctx.font = '12px Arial';

    ctx.fillStyle = '#f44336';
    ctx.fillText(`α = ${alpha}`, width - 50, 50);

    ctx.fillStyle = '#ff9800';
    ctx.fillText(`β = ${calculatedBeta.toFixed(3)}`, critX - 60, 70);

    ctx.fillStyle = '#2196f3';
    ctx.fillText(`Power = ${calculatedPower.toFixed(3)}`, critX + 70, 50);

    // Critical value label
    ctx.fillStyle = '#d32f2f';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('Critical Value', critX, baseY + 20);

    // X-axis
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    ctx.lineTo(width, baseY);
    ctx.stroke();

    // Effect size indicator
    ctx.fillStyle = '#666';
    ctx.font = '11px Arial';
    ctx.fillText(`Effect Size (d) = ${effectSize}`, width / 2, height - 10);

  }, [effectSize, sampleSize, alpha, calculatedPower, calculatedBeta]);

  useEffect(() => {
    if (activeStep === 1 || activeStep === 3) {
      drawPowerVisualization();
    }
  }, [activeStep, drawPowerVisualization, effectSize, sampleSize, alpha]);

  // Handle step navigation
  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, activeStep]));
    setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  // Render Step 1: What is Statistical Power?
  const renderStep1 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        What is Statistical Power?
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          Statistical power is one of the most important concepts in study design—it determines
          whether your study can actually answer the question you're asking.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%', borderTop: '4px solid #2196f3' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BoltOutlined sx={{ color: '#2196f3', mr: 1, fontSize: 32 }} />
                <Typography variant="h6">The Definition</Typography>
              </Box>

              <Paper sx={{ p: 2, bgcolor: '#e3f2fd', mb: 2 }}>
                <Typography variant="body1" sx={{ fontFamily: 'serif', fontSize: '1.1rem', textAlign: 'center' }}>
                  <strong>Power = P(Reject H₀ | H₁ is true)</strong>
                </Typography>
              </Paper>

              <Typography variant="body1" paragraph>
                In plain language: <strong>Power is the probability of detecting a real effect
                when one actually exists.</strong>
              </Typography>

              <Typography variant="body1" paragraph>
                Equivalently, since β is the probability of a Type II error:
              </Typography>

              <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
                <Typography variant="body1" sx={{ fontFamily: 'serif', fontSize: '1.1rem', textAlign: 'center' }}>
                  <strong>Power = 1 - β</strong>
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Lightbulb sx={{ color: '#ff9800', mr: 1, fontSize: 32 }} />
                <Typography variant="h6">The Intuition</Typography>
              </Box>

              <Typography variant="body1" paragraph>
                Think of power as your study's <strong>"sensitivity"</strong> to real effects.
              </Typography>

              <List>
                <ListItem>
                  <ListItemIcon>
                    <TrendingUp sx={{ color: '#4caf50' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="High Power (e.g., 90%)"
                    secondary="You're very likely to detect a real effect if it exists"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Warning sx={{ color: '#ff9800' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Low Power (e.g., 40%)"
                    secondary="You'll miss the effect more often than you'll find it"
                  />
                </ListItem>
              </List>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Critical insight:</strong> A non-significant result from a low-powered
                  study tells you almost nothing—it could easily be a false negative.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3, bgcolor: '#fafafa' }}>
        <Typography variant="h6" gutterBottom>
          The Coin Flip Analogy
        </Typography>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="body1" paragraph>
              Imagine you're trying to determine if a coin is biased (lands heads 60% of the time
              instead of 50%). Power tells you how likely you are to correctly identify the bias
              if it really exists.
            </Typography>

            <Typography variant="body1">
              With <strong>low power</strong>: Even with a biased coin, you'd often conclude "no bias"
              because your sample is too small to reliably detect the difference.
            </Typography>

            <Typography variant="body1" sx={{ mt: 2 }}>
              With <strong>high power</strong>: You'd reliably detect the bias when it exists—few
              false negatives.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: '#e3f2fd', textAlign: 'center' }}>
              <Typography variant="h2">🪙</Typography>
              <Typography variant="body2" color="text.secondary">
                Is this coin biased?<br/>
                Power determines if you can tell.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );

  // Render Step 2: Power as Probability
  const renderStep2 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        Visualizing Power: The Two Distributions
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Power is the area under the H₁ distribution that falls beyond the critical value—the
        portion where we would correctly reject H₀.
      </Alert>

      {/* Interactive Visualization */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Interactive Power Visualization
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Adjust the effect size and significance level to see how power changes
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <canvas
            ref={canvasRef}
            width={700}
            height={350}
            style={{ maxWidth: '100%', border: '1px solid #ddd', borderRadius: 4 }}
          />
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Typography gutterBottom>
              Effect Size (Cohen's d): <strong>{effectSize}</strong>
            </Typography>
            <Slider
              value={effectSize}
              onChange={(e, v) => setEffectSize(v)}
              min={0.1}
              max={1.5}
              step={0.1}
              marks={[
                { value: 0.2, label: 'Small' },
                { value: 0.5, label: 'Medium' },
                { value: 0.8, label: 'Large' },
              ]}
              sx={{ color: '#1976d2' }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography gutterBottom>
              Sample Size (per group): <strong>{sampleSize}</strong>
            </Typography>
            <Slider
              value={sampleSize}
              onChange={(e, v) => setSampleSize(v)}
              min={10}
              max={200}
              step={5}
              marks={[
                { value: 10, label: '10' },
                { value: 50, label: '50' },
                { value: 100, label: '100' },
                { value: 200, label: '200' },
              ]}
              sx={{ color: '#4caf50' }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography gutterBottom>
              Significance Level (α): <strong>{alpha}</strong>
            </Typography>
            <Slider
              value={alpha}
              onChange={(e, v) => setAlpha(v)}
              min={0.01}
              max={0.10}
              step={0.01}
              marks={[
                { value: 0.01, label: '0.01' },
                { value: 0.05, label: '0.05' },
                { value: 0.10, label: '0.10' },
              ]}
              sx={{ color: '#f44336' }}
            />
          </Grid>
        </Grid>

        {/* Power meter */}
        <Paper sx={{ p: 2, mt: 3, bgcolor: '#f5f5f5' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <Typography variant="h6">Calculated Power:</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ position: 'relative', height: 30 }}>
                <LinearProgress
                  variant="determinate"
                  value={calculatedPower * 100}
                  sx={{
                    height: 30,
                    borderRadius: 2,
                    bgcolor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: calculatedPower >= 0.8 ? '#4caf50' :
                               calculatedPower >= 0.6 ? '#ff9800' : '#f44336',
                    },
                  }}
                />
                <Typography
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontWeight: 600,
                    color: calculatedPower > 0.5 ? 'white' : 'black',
                  }}
                >
                  {(calculatedPower * 100).toFixed(1)}%
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Chip
                label={calculatedPower >= 0.8 ? 'Adequate' : calculatedPower >= 0.6 ? 'Marginal' : 'Underpowered'}
                color={calculatedPower >= 0.8 ? 'success' : calculatedPower >= 0.6 ? 'warning' : 'error'}
              />
            </Grid>
          </Grid>
        </Paper>
      </Paper>

      {/* Mathematical explanation */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Mathematical Formulation
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Paper sx={{ p: 3, bgcolor: '#fafafa' }}>
            <Typography variant="body1" paragraph>
              For a two-sample t-test with equal group sizes, power is calculated as:
            </Typography>

            <Box sx={{ textAlign: 'center', my: 3 }}>
              <Typography sx={{ fontFamily: 'serif', fontSize: '1.2rem', mb: 2 }}>
                λ = d · √(n/2)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                where λ is the noncentrality parameter, d is effect size, n is sample size per group
              </Typography>

              <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem' }}>
                Power ≈ Φ(λ - z<sub>α/2</sub>) + Φ(-λ - z<sub>α/2</sub>)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                where Φ is the standard normal CDF
              </Typography>
            </Box>

            <Alert severity="info">
              <Typography variant="body2">
                The exact calculation uses the non-central t-distribution, but the normal
                approximation works well for larger samples (n {'>'} 30 per group).
              </Typography>
            </Alert>
          </Paper>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  // Render Step 3: The 80% Convention
  const renderStep3 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        The 80% Convention: Why We Target 0.80 Power
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        The 80% power convention is widely used, but understanding <em>why</em> helps you
        decide when to deviate from it.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
                Historical Origin
              </Typography>

              <Typography variant="body1" paragraph>
                The 80% convention was established by <strong>Jacob Cohen</strong> in his influential
                work on statistical power (1960s-1980s). But why 80%?
              </Typography>

              <Paper sx={{ p: 2, bgcolor: '#e3f2fd', mb: 2 }}>
                <Typography variant="body1" sx={{ textAlign: 'center' }}>
                  <strong>The 4:1 Ratio Logic</strong>
                </Typography>
              </Paper>

              <Typography variant="body1" paragraph>
                With α = 0.05 (5% Type I error) and Power = 0.80 (β = 20% Type II error):
              </Typography>

              <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
                <Typography variant="body1" sx={{ fontFamily: 'serif', textAlign: 'center' }}>
                  β / α = 0.20 / 0.05 = <strong>4:1</strong>
                </Typography>
              </Paper>

              <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
                This implies Type II errors are considered 4 times more acceptable than
                Type I errors—a reasonable trade-off in many scientific contexts.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#ff9800' }}>
                Is 80% Always Appropriate?
              </Typography>

              <Typography variant="body1" paragraph>
                The 80% target is a <em>convention</em>, not a law. Consider:
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Situation</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Recommended Power</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Exploratory research</TableCell>
                      <TableCell>70-80%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Standard confirmatory</TableCell>
                      <TableCell>80%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Replication studies</TableCell>
                      <TableCell>90%+</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Clinical trials (efficacy)</TableCell>
                      <TableCell>80-90%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Non-inferiority trials</TableCell>
                      <TableCell>80-90%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Resource-limited</TableCell>
                      <TableCell>Maximize given constraints</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          The Cost-Benefit Perspective
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: '#ffebee', height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ color: '#f44336', fontWeight: 600 }}>
                Cost of Type I Error (α)
              </Typography>
              <Typography variant="body2">
                False positives lead to:
              </Typography>
              <List dense>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText primary="• Publishing false findings" />
                </ListItem>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText primary="• Wasted follow-up research" />
                </ListItem>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText primary="• Potentially harmful decisions" />
                </ListItem>
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: '#fff3e0', height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ color: '#ff9800', fontWeight: 600 }}>
                Cost of Type II Error (β)
              </Typography>
              <Typography variant="body2">
                False negatives lead to:
              </Typography>
              <List dense>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText primary="• Missing real discoveries" />
                </ListItem>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText primary="• Abandoning promising avenues" />
                </ListItem>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText primary="• Wasted experimental resources" />
                </ListItem>
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: '#e8f5e9', height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ color: '#4caf50', fontWeight: 600 }}>
                The Balance (80% Power)
              </Typography>
              <Typography variant="body2">
                80% power with α = 0.05 means:
              </Typography>
              <List dense>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText primary="• 5% false positive rate" />
                </ListItem>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText primary="• 20% false negative rate" />
                </ListItem>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText primary="• Manageable sample sizes" />
                </ListItem>
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      <Alert severity="warning" sx={{ mt: 3 }}>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          Important Consideration
        </Typography>
        <Typography variant="body2">
          Even 80% power means you'll miss <strong>1 in 5</strong> real effects. In critical
          applications where missing an effect is very costly, aim for 90% or higher.
        </Typography>
      </Alert>
    </Box>
  );

  // Render Step 4: Factors Affecting Power
  const renderStep4 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        The Four Factors That Determine Power
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Power is determined by four interconnected quantities. Understanding these relationships
        is the key to designing well-powered studies.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#4caf50' }}>
                1. Sample Size (n) — Increases Power ↑
              </Typography>

              <Typography variant="body1" paragraph>
                Larger samples give more precise estimates and make it easier to detect effects.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: '#e8f5e9', mb: 2 }}>
                <Typography variant="body2">
                  <strong>Rule of thumb:</strong> To double power from 50% to ~84%, you need
                  roughly 4× the sample size.
                </Typography>
              </Paper>

              <Typography variant="body2" color="text.secondary">
                This is why power analysis is often about finding the minimum sample size
                needed for adequate power.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
                2. Effect Size (d) — Increases Power ↑
              </Typography>

              <Typography variant="body1" paragraph>
                Larger effects are easier to detect. Effect size is the "signal" you're
                trying to find in the "noise."
              </Typography>

              <Paper sx={{ p: 2, bgcolor: '#e3f2fd', mb: 2 }}>
                <Typography variant="body2">
                  <strong>Cohen's benchmarks:</strong><br/>
                  Small: d = 0.2 | Medium: d = 0.5 | Large: d = 0.8
                </Typography>
              </Paper>

              <Typography variant="body2" color="text.secondary">
                You can't control the true effect size, but you can estimate it from
                prior research or specify the minimum effect worth detecting.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#f44336' }}>
                3. Significance Level (α) — Increases Power ↑
              </Typography>

              <Typography variant="body1" paragraph>
                A larger α (more lenient threshold) means more power, but at the cost
                of more false positives.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: '#ffebee', mb: 2 }}>
                <Typography variant="body2">
                  <strong>Trade-off:</strong> Using α = 0.10 instead of 0.05 increases power
                  but doubles your false positive rate.
                </Typography>
              </Paper>

              <Typography variant="body2" color="text.secondary">
                In practice, α is usually fixed at 0.05 by convention. Adjust other
                factors to achieve desired power.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#9c27b0' }}>
                4. Variability (σ) — Decreases Power ↓
              </Typography>

              <Typography variant="body1" paragraph>
                More variability ("noise") makes it harder to detect effects. This is
                why controlled experiments have more power.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: '#f3e5f5', mb: 2 }}>
                <Typography variant="body2">
                  <strong>Ways to reduce variability:</strong><br/>
                  • Better measurement instruments<br/>
                  • Homogeneous samples<br/>
                  • Within-subject designs<br/>
                  • Statistical controls (covariates)
                </Typography>
              </Paper>

              <Typography variant="body2" color="text.secondary">
                Effect size (d) incorporates variability: d = (μ₁ - μ₂) / σ
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Summary relationship */}
      <Paper sx={{ p: 3, mt: 3, bgcolor: '#fafafa' }}>
        <Typography variant="h6" gutterBottom>
          The Fundamental Relationship
        </Typography>

        <Box sx={{ textAlign: 'center', my: 3 }}>
          <Typography sx={{ fontFamily: 'serif', fontSize: '1.3rem' }}>
            Power = f(n, d, α, σ)
          </Typography>
        </Box>

        <Typography variant="body1" sx={{ textAlign: 'center', mb: 3 }}>
          <strong>Know any three → Solve for the fourth</strong>
        </Typography>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#e0e0e0' }}>
                <TableCell sx={{ fontWeight: 600 }}>Solve For</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Given</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Use Case</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: '#4caf50' }}>Sample Size (n)</TableCell>
                <TableCell>Power, d, α</TableCell>
                <TableCell>Planning a new study (most common)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: '#2196f3' }}>Power</TableCell>
                <TableCell>n, d, α</TableCell>
                <TableCell>Evaluating a planned or completed study</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: '#ff9800' }}>Effect Size (d)</TableCell>
                <TableCell>n, Power, α</TableCell>
                <TableCell>Sensitivity analysis (what can you detect?)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: '#f44336' }}>Alpha (α)</TableCell>
                <TableCell>n, d, Power</TableCell>
                <TableCell>Rarely done (α usually fixed at 0.05)</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );

  // Render Step 5: Choosing Your Target Power
  const renderStep5 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        Choosing Your Target Power Level
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        While 80% is conventional, the "right" power level depends on your specific research context.
        Here's how to make an informed decision.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Decision Framework for Target Power
              </Typography>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Power Level</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>β (Miss Rate)</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>When to Use</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Considerations</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <Chip label="70%" color="warning" size="small" />
                      </TableCell>
                      <TableCell>30%</TableCell>
                      <TableCell>
                        • Pilot studies<br/>
                        • Exploratory research<br/>
                        • Resource-constrained studies
                      </TableCell>
                      <TableCell>
                        High risk of false negatives; results should be interpreted cautiously
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                      <TableCell>
                        <Chip label="80%" color="success" size="small" />
                      </TableCell>
                      <TableCell>20%</TableCell>
                      <TableCell>
                        • Standard scientific research<br/>
                        • Most journal publications<br/>
                        • Grant applications
                      </TableCell>
                      <TableCell>
                        The conventional target; balances detection with feasibility
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Chip label="90%" color="primary" size="small" />
                      </TableCell>
                      <TableCell>10%</TableCell>
                      <TableCell>
                        • Replication studies<br/>
                        • High-stakes decisions<br/>
                        • Well-funded research
                      </TableCell>
                      <TableCell>
                        Requires ~30% more participants than 80% power
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Chip label="95%" color="secondary" size="small" />
                      </TableCell>
                      <TableCell>5%</TableCell>
                      <TableCell>
                        • Critical clinical trials<br/>
                        • Regulatory submissions<br/>
                        • Definitive studies
                      </TableCell>
                      <TableCell>
                        Requires ~60% more participants than 80% power
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Questions to Guide Your Decision
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: '#fff3e0', height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                <Warning sx={{ fontSize: 18, mr: 1, verticalAlign: 'middle' }} />
                Favor Higher Power (90%+) When:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="Missing an effect has serious consequences" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Study is expensive or difficult to replicate" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Results will inform critical decisions" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="You're attempting to replicate prior findings" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Effect size estimates are uncertain" />
                </ListItem>
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: '#e3f2fd', height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                <Info sx={{ fontSize: 18, mr: 1, verticalAlign: 'middle' }} />
                80% May Be Sufficient When:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="Research is exploratory in nature" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Resources are limited" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Study can be easily replicated" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Effect size is well-established" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Following standard practice in your field" />
                </ListItem>
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Sample size comparison */}
      <Paper sx={{ p: 3, mt: 3, bgcolor: '#fafafa' }}>
        <Typography variant="h6" gutterBottom>
          Sample Size Requirements by Power Level
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Two-sample t-test, α = 0.05, two-tailed
        </Typography>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#e0e0e0' }}>
                <TableCell sx={{ fontWeight: 600 }}>Effect Size (d)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Power = 70%</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Power = 80%</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Power = 90%</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Power = 95%</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Small (d = 0.2)</TableCell>
                <TableCell align="center">310</TableCell>
                <TableCell align="center" sx={{ bgcolor: '#e8f5e9', fontWeight: 600 }}>394</TableCell>
                <TableCell align="center">527</TableCell>
                <TableCell align="center">651</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Medium (d = 0.5)</TableCell>
                <TableCell align="center">51</TableCell>
                <TableCell align="center" sx={{ bgcolor: '#e8f5e9', fontWeight: 600 }}>64</TableCell>
                <TableCell align="center">86</TableCell>
                <TableCell align="center">105</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Large (d = 0.8)</TableCell>
                <TableCell align="center">21</TableCell>
                <TableCell align="center" sx={{ bgcolor: '#e8f5e9', fontWeight: 600 }}>26</TableCell>
                <TableCell align="center">34</TableCell>
                <TableCell align="center">42</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Values show n per group (total N = 2n). Calculated using normal approximation.
        </Typography>
      </Paper>

      <Alert severity="success" sx={{ mt: 3 }}>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          Key Takeaways
        </Typography>
        <Typography variant="body2">
          • 80% power is a reasonable default for most research<br/>
          • Consider the costs of Type II errors in your specific context<br/>
          • Higher power requires more resources but provides more reliable results<br/>
          • Always justify your power level in grant applications and publications<br/>
          • When in doubt, aim higher—the cost of an underpowered study is often wasted effort
        </Typography>
      </Alert>
    </Box>
  );

  // Render current step content
  const renderStepContent = () => {
    switch (activeStep) {
      case 0: return renderStep1();
      case 1: return renderStep2();
      case 2: return renderStep3();
      case 3: return renderStep4();
      case 4: return renderStep5();
      default: return renderStep1();
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          background: 'linear-gradient(135deg, #d32f2f 0%, #f44336 50%, #ff5722 100%)',
          color: 'white',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <BoltOutlined sx={{ fontSize: 40, mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Lesson 3: Statistical Power
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              Definition, Intuition, and the 80% Convention
            </Typography>
          </Box>
        </Box>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          Understand what statistical power means, why it matters, and how to choose
          the right target power for your research.
        </Typography>
      </Paper>

      {/* Stepper */}
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label, index) => (
          <Step key={label} completed={completedSteps.has(index)}>
            <StepLabel
              onClick={() => setActiveStep(index)}
              sx={{ cursor: 'pointer' }}
            >
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Content */}
      <Paper elevation={2} sx={{ p: 4, mb: 3, minHeight: 500 }}>
        {renderStepContent()}
      </Paper>

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          onClick={handleBack}
          disabled={activeStep === 0}
          startIcon={<NavigateBefore />}
        >
          Previous
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {steps.map((_, index) => (
            <Box
              key={index}
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: index === activeStep ? '#d32f2f' :
                         completedSteps.has(index) ? '#4caf50' : '#e0e0e0',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
              onClick={() => setActiveStep(index)}
            />
          ))}
        </Box>

        <Button
          variant="contained"
          onClick={() => {
            if (activeStep === steps.length - 1) {
              if (onComplete) onComplete();
            } else {
              handleNext();
            }
          }}
          endIcon={activeStep === steps.length - 1 ? <CheckCircle /> : <NavigateNext />}
          sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}
        >
          {activeStep === steps.length - 1 ? 'Complete' : 'Next'}
        </Button>
      </Box>

      {/* Completion message */}
      {activeStep === steps.length - 1 && completedSteps.size === steps.length - 1 && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            Lesson Complete! Key Concepts Mastered:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
              <ListItemText primary="Statistical power definition: P(Reject H₀ | H₁ is true) = 1 - β" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
              <ListItemText primary="Visual understanding of power as area under the H₁ distribution" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
              <ListItemText primary="The 80% convention and the 4:1 α/β ratio logic" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
              <ListItemText primary="Four factors affecting power: n, d, α, σ" />
            </ListItem>
          </List>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Next: Lesson 4 - The Four Pillars: Understanding the n, Effect Size, α, and Power Relationships
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default Lesson03_StatisticalPower;
