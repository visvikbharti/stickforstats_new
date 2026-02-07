/**
 * Lesson 6: The Mathematics of Power
 *
 * This is the most mathematically intensive lesson, covering non-central
 * distributions, noncentrality parameters, and full derivations of power
 * and sample size formulas. Essential for deep understanding.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  Tabs,
  Tab,
} from '@mui/material';
import {
  NavigateNext,
  NavigateBefore,
  CheckCircle,
  ExpandMore,
  Functions,
  ShowChart,
  Science,
  Calculate,
  School,
  Lightbulb,
  Info,
} from '@mui/icons-material';
import { useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';

// Step titles for the lesson
const steps = [
  'Test Statistics Under H₀ vs H₁',
  'The Noncentrality Parameter',
  'Non-Central t-Distribution',
  'Non-Central F-Distribution',
  'Sample Size Formula Derivation',
];

const Lesson06_Mathematics = ({ onComplete }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  // Visualization state
  const [noncentrality, setNoncentrality] = useState(2.5);
  const [degreesOfFreedom, setDegreesOfFreedom] = useState(30);
  const [distributionType, setDistributionType] = useState('t');

  // Canvas refs
  const tDistCanvasRef = useRef(null);
  const fDistCanvasRef = useRef(null);

  // Standard normal PDF
  const normalPDF = (x, mean = 0, sd = 1) => {
    const z = (x - mean) / sd;
    return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
  };

  // Approximate t-distribution PDF
  const tPDF = (x, df, ncp = 0) => {
    // For central t (ncp = 0), use exact formula
    // For non-central, use approximation based on normal mixture
    if (ncp === 0) {
      const gamma = (n) => {
        if (n === 1) return 1;
        if (n === 0.5) return Math.sqrt(Math.PI);
        return (n - 1) * gamma(n - 1);
      };

      const coef = gamma((df + 1) / 2) / (Math.sqrt(df * Math.PI) * gamma(df / 2));
      return coef * Math.pow(1 + x * x / df, -(df + 1) / 2);
    } else {
      // Non-central t approximation using shifted normal
      // This is a simplified approximation for visualization
      const sd = Math.sqrt(1 + 1/df);
      return normalPDF(x, ncp, sd);
    }
  };

  // Draw t-distribution comparison
  const drawTDistribution = useCallback(() => {
    const canvas = tDistCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const margin = { top: 40, right: 20, bottom: 50, left: 50 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const xMin = -4;
    const xMax = 8;
    const yMax = 0.45;

    const xScale = (x) => margin.left + ((x - xMin) / (xMax - xMin)) * plotWidth;
    const yScale = (y) => margin.top + plotHeight - (y / yMax) * plotHeight;

    // Draw grid
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    for (let y = 0; y <= yMax; y += 0.1) {
      ctx.beginPath();
      ctx.moveTo(margin.left, yScale(y));
      ctx.lineTo(width - margin.right, yScale(y));
      ctx.stroke();
    }
    for (let x = xMin; x <= xMax; x += 1) {
      ctx.beginPath();
      ctx.moveTo(xScale(x), margin.top);
      ctx.lineTo(xScale(x), height - margin.bottom);
      ctx.stroke();
    }

    // Critical value for α = 0.05 (two-tailed)
    const critVal = 1.96;

    // Shade rejection region (α)
    ctx.fillStyle = 'rgba(244, 67, 54, 0.3)';
    ctx.beginPath();
    ctx.moveTo(xScale(critVal), yScale(0));
    for (let x = critVal; x <= xMax; x += 0.02) {
      ctx.lineTo(xScale(x), yScale(tPDF(x, degreesOfFreedom, 0)));
    }
    ctx.lineTo(xScale(xMax), yScale(0));
    ctx.closePath();
    ctx.fill();

    // Shade power region (under H₁, beyond critical value)
    ctx.fillStyle = 'rgba(33, 150, 243, 0.4)';
    ctx.beginPath();
    ctx.moveTo(xScale(critVal), yScale(0));
    for (let x = critVal; x <= xMax; x += 0.02) {
      ctx.lineTo(xScale(x), yScale(tPDF(x, degreesOfFreedom, noncentrality)));
    }
    ctx.lineTo(xScale(xMax), yScale(0));
    ctx.closePath();
    ctx.fill();

    // Shade β region (under H₁, before critical value)
    ctx.fillStyle = 'rgba(255, 152, 0, 0.3)';
    ctx.beginPath();
    ctx.moveTo(xScale(xMin), yScale(0));
    for (let x = xMin; x <= critVal; x += 0.02) {
      ctx.lineTo(xScale(x), yScale(tPDF(x, degreesOfFreedom, noncentrality)));
    }
    ctx.lineTo(xScale(critVal), yScale(0));
    ctx.closePath();
    ctx.fill();

    // Draw central t (H₀)
    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = xMin; x <= xMax; x += 0.02) {
      const y = tPDF(x, degreesOfFreedom, 0);
      if (x === xMin) ctx.moveTo(xScale(x), yScale(y));
      else ctx.lineTo(xScale(x), yScale(y));
    }
    ctx.stroke();

    // Draw non-central t (H₁)
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = xMin; x <= xMax; x += 0.02) {
      const y = tPDF(x, degreesOfFreedom, noncentrality);
      if (x === xMin) ctx.moveTo(xScale(x), yScale(y));
      else ctx.lineTo(xScale(x), yScale(y));
    }
    ctx.stroke();

    // Critical value line
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(xScale(critVal), margin.top);
    ctx.lineTo(xScale(critVal), height - margin.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';

    // X-axis labels
    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
      ctx.fillText(x.toString(), xScale(x), height - margin.bottom + 15);
    }

    // Y-axis labels
    ctx.textAlign = 'right';
    for (let y = 0; y <= yMax; y += 0.1) {
      ctx.fillText(y.toFixed(1), margin.left - 5, yScale(y) + 4);
    }

    // Distribution labels
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#424242';
    ctx.fillText('Central t (H₀)', margin.left + 10, margin.top + 20);
    ctx.fillStyle = '#1976d2';
    ctx.fillText(`Non-central t (H₁, λ=${noncentrality.toFixed(1)})`, margin.left + 10, margin.top + 38);

    // Region labels
    ctx.font = '11px Arial';
    ctx.fillStyle = '#f44336';
    ctx.fillText('α', width - 50, margin.top + 60);
    ctx.fillStyle = '#ff9800';
    ctx.fillText('β', xScale(noncentrality - 1.5), margin.top + 80);
    ctx.fillStyle = '#2196f3';
    ctx.fillText('Power', xScale(noncentrality + 1), margin.top + 60);

    // Title
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#333';
    ctx.fillText('Central vs Non-Central t-Distribution', width / 2, 20);

  }, [noncentrality, degreesOfFreedom]);

  useEffect(() => {
    if (activeStep === 2) {
      drawTDistribution();
    }
  }, [activeStep, drawTDistribution, noncentrality, degreesOfFreedom]);

  // Handle step navigation
  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, activeStep]));
    setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  // Render Step 1: Test Statistics
  const renderStep1 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: theme.palette.error.dark, fontWeight: 600 }}>
        Test Statistics: Distribution Under H₀ vs H₁
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          The key insight of power analysis is that test statistics follow <strong>different
          distributions</strong> depending on whether H₀ or H₁ is true.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ borderTop: `4px solid ${theme.palette.grey[800]}` }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Under H₀ (No Effect)
              </Typography>

              <Paper sx={{ p: 2, bgcolor: theme.palette.grey[isDarkMode ? 800 : 100], mb: 2 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem', textAlign: 'center' }}>
                  t = (X̄₁ - X̄₂) / SE ~ t<sub>df</sub>
                </Typography>
              </Paper>

              <Typography variant="body1" paragraph>
                When H₀ is true (μ₁ = μ₂), the test statistic follows a <strong>central
                t-distribution</strong> centered at 0.
              </Typography>

              <Typography variant="body2" color="text.secondary">
                The α region is determined by this distribution—we reject H₀ when t falls
                in the tails (beyond ±t<sub>critical</sub>).
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ borderTop: `4px solid ${theme.palette.primary.main}` }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main }}>
                Under H₁ (Effect Exists)
              </Typography>

              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.light, 0.2), mb: 2 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem', textAlign: 'center' }}>
                  t ~ t<sub>df</sub>(λ)
                </Typography>
              </Paper>

              <Typography variant="body1" paragraph>
                When H₁ is true (μ₁ ≠ μ₂), the test statistic follows a <strong>non-central
                t-distribution</strong> shifted away from 0.
              </Typography>

              <Typography variant="body2" color="text.secondary">
                The shift is determined by the <em>noncentrality parameter</em> λ, which
                depends on effect size and sample size.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          The Fundamental Insight
        </Typography>

        <Box sx={{ textAlign: 'center', my: 3 }}>
          <Typography sx={{ fontFamily: 'serif', fontSize: '1.3rem', mb: 2 }}>
            Power = P(t {'>'} t<sub>critical</sub> | H₁ is true)
          </Typography>
          <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem' }}>
            = Area under non-central t beyond the critical value
          </Typography>
        </Box>

        <Alert severity="success">
          <Typography variant="body2">
            <strong>Key Point:</strong> Power is calculated using the non-central distribution,
            while the critical value is determined by the central distribution.
          </Typography>
        </Alert>
      </Paper>

      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Why Two Different Distributions?
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" paragraph>
            The test statistic measures how far our observed difference is from zero
            (the null hypothesis value), in standard error units:
          </Typography>

          <Paper sx={{ p: 2, bgcolor: theme.palette.grey[isDarkMode ? 900 : 50], mb: 2 }}>
            <Typography sx={{ fontFamily: 'serif', textAlign: 'center' }}>
              t = (X̄₁ - X̄₂ - 0) / SE = (X̄₁ - X̄₂) / SE
            </Typography>
          </Paper>

          <Typography variant="body1" paragraph>
            <strong>Under H₀:</strong> The true difference is 0, so the expected value of t is 0.
            The variation comes entirely from sampling error → <em>central t</em>.
          </Typography>

          <Typography variant="body1">
            <strong>Under H₁:</strong> The true difference is not 0 (it's μ₁ - μ₂ = δ), so the
            expected value of t is not 0—it's shifted by the noncentrality parameter λ.
            → <em>non-central t</em>.
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  // Render Step 2: Noncentrality Parameter
  const renderStep2 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: theme.palette.error.dark, fontWeight: 600 }}>
        The Noncentrality Parameter (λ)
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          The noncentrality parameter λ (lambda) is the <strong>key link</strong> between effect size,
          sample size, and power. It determines how far the H₁ distribution is shifted from H₀.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.secondary.main }}>
                Definition for Two-Sample t-Test
              </Typography>

              <Paper sx={{ p: 3, bgcolor: alpha(theme.palette.secondary.light, 0.2), mb: 2 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1.3rem', textAlign: 'center', mb: 2 }}>
                  λ = (μ₁ - μ₂) / SE
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem', textAlign: 'center', mb: 1 }}>
                  = (μ₁ - μ₂) / (σ√(1/n₁ + 1/n₂))
                </Typography>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem', textAlign: 'center' }}>
                  = d · √(n/2) &nbsp;&nbsp;(equal groups, n per group)
                </Typography>
              </Paper>

              <Typography variant="body1" paragraph>
                <strong>Interpretation:</strong> λ is the true effect (μ₁ - μ₂) measured in
                standard error units. It tells us how many standard errors the true difference
                is from zero.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Why λ Determines Power
              </Typography>

              <Typography variant="body1" paragraph>
                The larger λ is, the more the H₁ distribution is shifted away from H₀,
                and the more of it falls beyond the critical value.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.success.light, 0.2), mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  λ increases when:
                </Typography>
                <List dense>
                  <ListItem sx={{ py: 0 }}>
                    <ListItemIcon><CheckCircle sx={{ color: theme.palette.success.main, fontSize: 18 }} /></ListItemIcon>
                    <ListItemText primary="Effect size (d) increases" />
                  </ListItem>
                  <ListItem sx={{ py: 0 }}>
                    <ListItemIcon><CheckCircle sx={{ color: theme.palette.success.main, fontSize: 18 }} /></ListItemIcon>
                    <ListItemText primary="Sample size (n) increases" />
                  </ListItem>
                  <ListItem sx={{ py: 0 }}>
                    <ListItemIcon><CheckCircle sx={{ color: theme.palette.success.main, fontSize: 18 }} /></ListItemIcon>
                    <ListItemText primary="Variability (σ) decreases" />
                  </ListItem>
                </List>
              </Paper>

              <Alert severity="success">
                <Typography variant="body2">
                  This is why power depends on n, d, and σ—they all affect λ!
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Noncentrality Parameters for Different Tests
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: theme.palette.grey[isDarkMode ? 800 : 100] }}>
                <TableCell sx={{ fontWeight: 600 }}>Test</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Noncentrality Parameter (λ)</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Distribution</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>One-sample t</TableCell>
                <TableCell sx={{ fontFamily: 'serif' }}>λ = d · √n</TableCell>
                <TableCell>Non-central t</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Two-sample t (equal n)</TableCell>
                <TableCell sx={{ fontFamily: 'serif' }}>λ = d · √(n/2)</TableCell>
                <TableCell>Non-central t</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Paired t</TableCell>
                <TableCell sx={{ fontFamily: 'serif' }}>λ = d<sub>z</sub> · √n</TableCell>
                <TableCell>Non-central t</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>One-way ANOVA</TableCell>
                <TableCell sx={{ fontFamily: 'serif' }}>λ = n · Σ(αⱼ²) / σ² = nf²</TableCell>
                <TableCell>Non-central F</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Chi-square</TableCell>
                <TableCell sx={{ fontFamily: 'serif' }}>λ = N · w²</TableCell>
                <TableCell>Non-central χ²</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Correlation</TableCell>
                <TableCell sx={{ fontFamily: 'serif' }}>λ ≈ ρ · √(n-3) / √(1-ρ²)</TableCell>
                <TableCell>Approx. normal</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Derivation: λ for Two-Sample t-Test
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Paper sx={{ p: 3, bgcolor: theme.palette.grey[isDarkMode ? 900 : 50] }}>
            <Typography variant="body1" paragraph>
              Starting from the test statistic:
            </Typography>

            <Typography sx={{ fontFamily: 'serif', fontSize: '1rem', mb: 2 }}>
              t = (X̄₁ - X̄₂) / (s<sub>p</sub>√(1/n₁ + 1/n₂))
            </Typography>

            <Typography variant="body1" paragraph>
              Under H₁, E[X̄₁ - X̄₂] = μ₁ - μ₂ ≠ 0. The expected value of t is:
            </Typography>

            <Typography sx={{ fontFamily: 'serif', fontSize: '1rem', mb: 2 }}>
              E[t | H₁] = (μ₁ - μ₂) / (σ√(1/n₁ + 1/n₂))
            </Typography>

            <Typography variant="body1" paragraph>
              For equal group sizes (n₁ = n₂ = n):
            </Typography>

            <Typography sx={{ fontFamily: 'serif', fontSize: '1rem', mb: 2 }}>
              λ = (μ₁ - μ₂) / (σ√(2/n)) = (μ₁ - μ₂) / σ · √(n/2) = d · √(n/2)
            </Typography>

            <Alert severity="info">
              <Typography variant="body2">
                This shows why power increases with √n: doubling n only increases λ by √2 ≈ 1.41.
              </Typography>
            </Alert>
          </Paper>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  // Render Step 3: Non-central t
  const renderStep3 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: theme.palette.error.dark, fontWeight: 600 }}>
        The Non-Central t-Distribution
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          The non-central t-distribution is the theoretical foundation for power calculation
          in t-tests. It describes the distribution of the t-statistic when H₁ is true.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Definition
              </Typography>

              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.light, 0.2), mb: 2 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1rem', textAlign: 'center' }}>
                  If Z ~ N(λ, 1) and V ~ χ²<sub>ν</sub> are independent,<br/>
                  then T = Z / √(V/ν) ~ t<sub>ν</sub>(λ)
                </Typography>
              </Paper>

              <Typography variant="body1" paragraph>
                <strong>Parameters:</strong>
              </Typography>

              <List dense>
                <ListItem>
                  <ListItemText
                    primary="ν (nu): Degrees of freedom"
                    secondary="Same as central t (n₁ + n₂ - 2 for two-sample)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="λ (lambda): Noncentrality parameter"
                    secondary="Determines the shift from center (0 for central t)"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          <Card elevation={3} sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Properties
              </Typography>

              <List dense>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: theme.palette.success.main }} /></ListItemIcon>
                  <ListItemText primary="Mean ≈ λ (for large df)" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: theme.palette.success.main }} /></ListItemIcon>
                  <ListItemText primary="Variance > 1 (always larger than central t)" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: theme.palette.success.main }} /></ListItemIcon>
                  <ListItemText primary="Skewed (not symmetric unless λ = 0)" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: theme.palette.success.main }} /></ListItemIcon>
                  <ListItemText primary="Approaches N(λ, 1 + λ²/2ν) as ν → ∞" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Interactive Visualization
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography gutterBottom>
                Noncentrality (λ): <strong>{noncentrality.toFixed(1)}</strong>
              </Typography>
              <Slider
                value={noncentrality}
                onChange={(e, v) => setNoncentrality(v)}
                min={0}
                max={5}
                step={0.1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 2, label: '2' },
                  { value: 4, label: '4' },
                ]}
                sx={{ color: theme.palette.primary.main }}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography gutterBottom>
                Degrees of Freedom: <strong>{degreesOfFreedom}</strong>
              </Typography>
              <Slider
                value={degreesOfFreedom}
                onChange={(e, v) => setDegreesOfFreedom(v)}
                min={5}
                max={100}
                step={5}
                marks={[
                  { value: 10, label: '10' },
                  { value: 30, label: '30' },
                  { value: 60, label: '60' },
                  { value: 100, label: '100' },
                ]}
                sx={{ color: theme.palette.success.main }}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <canvas
                ref={tDistCanvasRef}
                width={500}
                height={320}
                style={{ maxWidth: '100%', border: `1px solid ${theme.palette.divider}`, borderRadius: 4 }}
              />
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
              As λ increases, more of the blue distribution falls beyond the critical value,
              increasing power.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Power Calculation Formula
        </Typography>

        <Box sx={{ textAlign: 'center', my: 3 }}>
          <Typography sx={{ fontFamily: 'serif', fontSize: '1.2rem', mb: 2 }}>
            Power = P(T {'>'} t<sub>α/2,ν</sub> | λ) + P(T {'<'} -t<sub>α/2,ν</sub> | λ)
          </Typography>
          <Typography sx={{ fontFamily: 'serif', fontSize: '1rem' }}>
            = 1 - F<sub>t(ν,λ)</sub>(t<sub>α/2,ν</sub>) + F<sub>t(ν,λ)</sub>(-t<sub>α/2,ν</sub>)
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary">
          where F<sub>t(ν,λ)</sub> is the CDF of the non-central t-distribution with ν degrees
          of freedom and noncentrality λ.
        </Typography>
      </Paper>
    </Box>
  );

  // Render Step 4: Non-central F
  const renderStep4 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: theme.palette.error.dark, fontWeight: 600 }}>
        The Non-Central F-Distribution
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          For ANOVA and regression, power is calculated using the non-central F-distribution.
          The same principle applies: under H₁, the F-statistic follows a shifted distribution.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Definition
              </Typography>

              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.secondary.light, 0.2), mb: 2 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1rem', textAlign: 'center' }}>
                  If χ₁² ~ χ²<sub>df₁</sub>(λ) and χ₂² ~ χ²<sub>df₂</sub>(0),<br/>
                  then F = (χ₁²/df₁) / (χ₂²/df₂) ~ F<sub>df₁,df₂</sub>(λ)
                </Typography>
              </Paper>

              <Typography variant="body1" paragraph>
                <strong>Parameters:</strong>
              </Typography>

              <List dense>
                <ListItem>
                  <ListItemText
                    primary="df₁: Numerator degrees of freedom"
                    secondary="Number of groups - 1 (for one-way ANOVA)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="df₂: Denominator degrees of freedom"
                    secondary="N - k (total observations minus number of groups)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="λ: Noncentrality parameter"
                    secondary="λ = n × Σ(αⱼ²) / σ² for ANOVA"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Noncentrality for ANOVA
              </Typography>

              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.success.light, 0.2), mb: 2 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem', textAlign: 'center', mb: 2 }}>
                  λ = n · Σⱼ(μⱼ - μ)² / σ²
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography sx={{ fontFamily: 'serif', fontSize: '1rem', textAlign: 'center' }}>
                  = n · k · f²
                </Typography>
              </Paper>

              <Typography variant="body1" paragraph>
                where:
              </Typography>

              <List dense>
                <ListItem>
                  <ListItemText primary="n = sample size per group" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="k = number of groups" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="f = Cohen's f effect size" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="μⱼ = mean of group j" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="μ = grand mean" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Power Calculation for ANOVA
        </Typography>

        <Box sx={{ textAlign: 'center', my: 3 }}>
          <Typography sx={{ fontFamily: 'serif', fontSize: '1.2rem', mb: 2 }}>
            Power = P(F {'>'} F<sub>α,df₁,df₂</sub> | λ)
          </Typography>
          <Typography sx={{ fontFamily: 'serif', fontSize: '1rem' }}>
            = 1 - F<sub>F(df₁,df₂,λ)</sub>(F<sub>α,df₁,df₂</sub>)
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Note: F-tests are one-tailed (we only reject H₀ for large F values), so there's only
          one rejection region.
        </Typography>
      </Paper>

      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Worked Example: One-Way ANOVA Power
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Paper sx={{ p: 3, bgcolor: alpha(theme.palette.warning.light, 0.2) }}>
            <Typography variant="body1" paragraph>
              <strong>Scenario:</strong> 3 groups, n = 20 per group, f = 0.25 (medium), α = 0.05
            </Typography>

            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.9rem', mb: 2 }}>
              Step 1: Calculate noncentrality<br/>
              λ = n × k × f² = 20 × 3 × 0.25² = 20 × 3 × 0.0625 = 3.75<br/><br/>

              Step 2: Determine degrees of freedom<br/>
              df₁ = k - 1 = 3 - 1 = 2<br/>
              df₂ = N - k = 60 - 3 = 57<br/><br/>

              Step 3: Find critical F value<br/>
              F<sub>0.05,2,57</sub> ≈ 3.16<br/><br/>

              Step 4: Calculate power<br/>
              Power = P(F {'>'} 3.16 | λ = 3.75)<br/>
              Power ≈ 0.46
            </Typography>

            <Alert severity="warning">
              <Typography variant="body2">
                46% power is low! To achieve 80% power with f = 0.25, we'd need n ≈ 53 per group.
              </Typography>
            </Alert>
          </Paper>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  // Render Step 5: Sample Size Formula Derivation
  const renderStep5 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: theme.palette.error.dark, fontWeight: 600 }}>
        Sample Size Formula: Complete Derivation
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          We now derive the classic sample size formula using the large-sample normal approximation.
          This is the mathematical foundation for power analysis software.
        </Typography>
      </Alert>

      <Paper sx={{ p: 3, mb: 3, bgcolor: theme.palette.grey[isDarkMode ? 900 : 50] }}>
        <Typography variant="h6" gutterBottom>
          Step 1: Set Up the Problem
        </Typography>

        <Typography variant="body1" paragraph>
          For a two-sample t-test (two-tailed), we want to find n such that:
        </Typography>

        <Box sx={{ textAlign: 'center', my: 2 }}>
          <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem' }}>
            P(Reject H₀ | H₁) = 1 - β
          </Typography>
        </Box>

        <Typography variant="body1">
          We reject H₀ when |t| {'>'} t<sub>α/2</sub>. For large n, we use the normal approximation.
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, mb: 3, bgcolor: alpha(theme.palette.primary.light, 0.2) }}>
        <Typography variant="h6" gutterBottom>
          Step 2: Use Normal Approximation
        </Typography>

        <Typography variant="body1" paragraph>
          For large samples, the t-distribution approaches normal. We can write:
        </Typography>

        <Box sx={{ textAlign: 'center', my: 2 }}>
          <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem', mb: 1 }}>
            Z = (X̄₁ - X̄₂) / SE ~ N(δ/SE, 1) under H₁
          </Typography>
          <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem' }}>
            where δ = μ₁ - μ₂ (true difference)
          </Typography>
        </Box>

        <Typography variant="body1">
          We reject when Z {'>'} z<sub>α/2</sub> or Z {'<'} -z<sub>α/2</sub>
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, mb: 3, bgcolor: alpha(theme.palette.success.light, 0.2) }}>
        <Typography variant="h6" gutterBottom>
          Step 3: Derive the Power Equation
        </Typography>

        <Typography variant="body1" paragraph>
          For a one-sided alternative (right tail), power is:
        </Typography>

        <Box sx={{ textAlign: 'center', my: 2 }}>
          <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem', mb: 1 }}>
            Power = P(Z {'>'} z<sub>α</sub> | H₁)
          </Typography>
          <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem', mb: 1 }}>
            = P((Z - δ/SE) {'>'} z<sub>α</sub> - δ/SE)
          </Typography>
          <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem' }}>
            = 1 - Φ(z<sub>α</sub> - δ/SE)
          </Typography>
        </Box>

        <Typography variant="body1">
          We want this to equal 1 - β, so: Φ(z<sub>α</sub> - δ/SE) = β
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, mb: 3, bgcolor: alpha(theme.palette.warning.light, 0.2) }}>
        <Typography variant="h6" gutterBottom>
          Step 4: Solve for Sample Size
        </Typography>

        <Typography variant="body1" paragraph>
          From Φ(z<sub>α</sub> - δ/SE) = β, we get:
        </Typography>

        <Box sx={{ textAlign: 'center', my: 2 }}>
          <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem', mb: 1 }}>
            z<sub>α</sub> - δ/SE = -z<sub>β</sub>
          </Typography>
          <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem', mb: 1 }}>
            δ/SE = z<sub>α</sub> + z<sub>β</sub>
          </Typography>
        </Box>

        <Typography variant="body1" paragraph>
          Substituting SE = σ√(2/n) for equal groups:
        </Typography>

        <Box sx={{ textAlign: 'center', my: 2 }}>
          <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem', mb: 1 }}>
            δ / (σ√(2/n)) = z<sub>α</sub> + z<sub>β</sub>
          </Typography>
          <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem', mb: 1 }}>
            d · √(n/2) = z<sub>α</sub> + z<sub>β</sub>
          </Typography>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, bgcolor: theme.palette.error.dark, color: 'white' }}>
        <Typography variant="h6" gutterBottom>
          Final Formula (Two-Sample t-Test)
        </Typography>

        <Box sx={{ textAlign: 'center', my: 3 }}>
          <Typography sx={{ fontFamily: 'serif', fontSize: '1.5rem', mb: 2 }}>
            n = 2 × ((z<sub>α/2</sub> + z<sub>β</sub>) / d)²
          </Typography>
        </Box>

        <Typography variant="body1" paragraph>
          For two-tailed test with α = 0.05 and power = 0.80:
        </Typography>

        <Box sx={{ textAlign: 'center', my: 2 }}>
          <Typography sx={{ fontFamily: 'serif', fontSize: '1.2rem' }}>
            n = 2 × ((1.96 + 0.84) / d)² = 2 × (2.80 / d)² ≈ <strong>15.68 / d²</strong>
          </Typography>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Quick Reference: Sample Size per Group
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: theme.palette.grey[isDarkMode ? 800 : 100] }}>
                <TableCell sx={{ fontWeight: 600 }}>Effect Size (d)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>80% Power</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>90% Power</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>95% Power</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>0.2 (Small)</TableCell>
                <TableCell align="center">394</TableCell>
                <TableCell align="center">527</TableCell>
                <TableCell align="center">651</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>0.5 (Medium)</TableCell>
                <TableCell align="center">64</TableCell>
                <TableCell align="center">86</TableCell>
                <TableCell align="center">105</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>0.8 (Large)</TableCell>
                <TableCell align="center">26</TableCell>
                <TableCell align="center">34</TableCell>
                <TableCell align="center">42</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Two-sample t-test, two-tailed, α = 0.05. Values show n per group.
        </Typography>
      </Paper>

      <Alert severity="success" sx={{ mt: 3 }}>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          Summary: The Power-Sample Size Relationship
        </Typography>
        <Typography variant="body2">
          • n ∝ 1/d² — Detecting half the effect requires 4× the sample<br/>
          • n ∝ (z<sub>α</sub> + z<sub>β</sub>)² — Halving α or β increases n<br/>
          • These formulas use normal approximation; exact calculations use non-central distributions<br/>
          • G*Power and other software use exact methods with non-central t and F
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
          <Functions sx={{ fontSize: 40, mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Lesson 6: The Mathematics of Power
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              Non-Central Distributions & Full Derivations
            </Typography>
          </Box>
        </Box>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          Deep dive into the mathematical foundations: noncentrality parameters,
          non-central t and F distributions, and complete sample size formula derivation.
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
                bgcolor: index === activeStep ? theme.palette.error.dark :
                         completedSteps.has(index) ? theme.palette.success.main : theme.palette.divider,
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
          sx={{ bgcolor: theme.palette.error.dark, '&:hover': { bgcolor: theme.palette.error.dark } }}
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
              <ListItemIcon><CheckCircle sx={{ color: theme.palette.success.main }} /></ListItemIcon>
              <ListItemText primary="Central vs non-central distributions under H₀ and H₁" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: theme.palette.success.main }} /></ListItemIcon>
              <ListItemText primary="Noncentrality parameter λ and its role in power" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: theme.palette.success.main }} /></ListItemIcon>
              <ListItemText primary="Non-central t and F distributions" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: theme.palette.success.main }} /></ListItemIcon>
              <ListItemText primary="Complete derivation of the sample size formula" />
            </ListItem>
          </List>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Next: Lesson 7 - Power Analysis for Different Designs
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default Lesson06_Mathematics;
