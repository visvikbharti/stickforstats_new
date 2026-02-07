/**
 * Lesson 7: Power Analysis for Different Designs
 *
 * This lesson covers power analysis formulas and considerations for
 * various statistical tests, including parametric and non-parametric
 * designs. Includes the Asymptotic Relative Efficiency concept.
 */

import React, { useState, useCallback } from 'react';
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
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  NavigateNext,
  NavigateBefore,
  CheckCircle,
  ExpandMore,
  Science,
  Calculate,
  CompareArrows,
  Category,
  Timeline,
  ScatterPlot,
  Warning,
  Info,
  Lightbulb,
} from '@mui/icons-material';
import { useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';

// Step titles for the lesson
const steps = [
  't-Test Variants',
  'ANOVA Designs',
  'Chi-Square & Proportions',
  'Correlation & Regression',
  'Non-Parametric Tests',
];

const Lesson07_DifferentDesigns = ({ onComplete }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  // Calculator states
  const [testType, setTestType] = useState(0);
  const [effectSize, setEffectSize] = useState(0.5);
  const [sampleSize, setSampleSize] = useState(30);
  const [alpha, setAlpha] = useState(0.05);
  const [groups, setGroups] = useState(3);

  // Standard normal CDF
  const normalCDF = useCallback((x) => {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x) / Math.sqrt(2);
    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
    return 0.5 * (1.0 + sign * y);
  }, []);

  // Handle step navigation
  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, activeStep]));
    setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  // Render Step 1: t-Test Variants
  const renderStep1 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: theme.palette.error.dark, fontWeight: 600 }}>
        Power Analysis for t-Test Variants
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          The t-test family includes one-sample, two-sample (independent), and paired designs.
          Each has different power characteristics based on how variability is handled.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {/* One-sample t-test */}
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ height: '100%', borderTop: `4px solid ${theme.palette.info.main}` }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.info.main }}>
                One-Sample t-Test
              </Typography>

              <Typography variant="body2" paragraph>
                Tests whether a sample mean differs from a hypothesized value μ₀.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.light, 0.2), mb: 2 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1rem', textAlign: 'center' }}>
                  λ = d · √n
                </Typography>
              </Paper>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Sample Size Formula:
              </Typography>
              <Paper sx={{ p: 1, bgcolor: theme.palette.grey[isDarkMode ? 800 : 100] }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '0.9rem', textAlign: 'center' }}>
                  n = ((z<sub>α/2</sub> + z<sub>β</sub>) / d)²
                </Typography>
              </Paper>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                Effect size: d = (μ - μ₀) / σ
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Two-sample t-test */}
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ height: '100%', borderTop: `4px solid ${theme.palette.success.main}` }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.success.main }}>
                Two-Sample t-Test
              </Typography>

              <Typography variant="body2" paragraph>
                Compares means of two independent groups.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.success.light, 0.2), mb: 2 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1rem', textAlign: 'center' }}>
                  λ = d · √(n/2) (equal n)
                </Typography>
              </Paper>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Sample Size Formula (per group):
              </Typography>
              <Paper sx={{ p: 1, bgcolor: theme.palette.grey[isDarkMode ? 800 : 100] }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '0.9rem', textAlign: 'center' }}>
                  n = 2 × ((z<sub>α/2</sub> + z<sub>β</sub>) / d)²
                </Typography>
              </Paper>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                Effect size: d = (μ₁ - μ₂) / σ<sub>pooled</sub>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Paired t-test */}
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ height: '100%', borderTop: `4px solid ${theme.palette.warning.main}` }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.warning.main }}>
                Paired t-Test
              </Typography>

              <Typography variant="body2" paragraph>
                Compares means within subjects (repeated measures).
              </Typography>

              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.warning.light, 0.2), mb: 2 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1rem', textAlign: 'center' }}>
                  λ = d<sub>z</sub> · √n
                </Typography>
              </Paper>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Sample Size Formula (pairs):
              </Typography>
              <Paper sx={{ p: 1, bgcolor: theme.palette.grey[isDarkMode ? 800 : 100] }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '0.9rem', textAlign: 'center' }}>
                  n = ((z<sub>α/2</sub> + z<sub>β</sub>) / d<sub>z</sub>)²
                </Typography>
              </Paper>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                Effect size: d<sub>z</sub> = μ<sub>D</sub> / σ<sub>D</sub>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Why Paired Tests Have More Power
        </Typography>

        <Typography variant="body1" paragraph>
          Paired designs are often more powerful because they <strong>eliminate between-subject
          variability</strong>. Each subject serves as their own control.
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.light, 0.2) }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Independent Groups
              </Typography>
              <Typography variant="body2">
                Variability = Within-group + Between-subject<br/>
                SE = σ√(2/n)
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.success.light, 0.2) }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Paired Design
              </Typography>
              <Typography variant="body2">
                Variability = Within-subject only<br/>
                SE = σ<sub>D</sub>/√n (usually smaller)
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Rule of thumb:</strong> If the correlation between paired observations is ρ,
            the variance reduction factor is (1-ρ). With ρ = 0.5, paired design needs half the n.
          </Typography>
        </Alert>
      </Paper>

      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Unequal Group Sizes
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" paragraph>
            For unequal n₁ and n₂, the noncentrality parameter becomes:
          </Typography>

          <Paper sx={{ p: 2, bgcolor: theme.palette.grey[isDarkMode ? 900 : 50], mb: 2 }}>
            <Typography sx={{ fontFamily: 'serif', textAlign: 'center' }}>
              λ = d / √(1/n₁ + 1/n₂)
            </Typography>
          </Paper>

          <Typography variant="body1" paragraph>
            <strong>Optimal allocation:</strong> Equal groups (n₁ = n₂) maximize power for fixed total N.
          </Typography>

          <Typography variant="body2">
            With unequal costs, optimal ratio is: n₁/n₂ = √(c₂/c₁) where c is cost per subject.
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  // Render Step 2: ANOVA Designs
  const renderStep2 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: theme.palette.error.dark, fontWeight: 600 }}>
        Power Analysis for ANOVA Designs
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          ANOVA designs use the non-central F-distribution for power calculations.
          The complexity increases with factorial and repeated measures designs.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {/* One-way ANOVA */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.secondary.main }}>
                One-Way ANOVA
              </Typography>

              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.secondary.light, 0.2), mb: 2 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem', textAlign: 'center', mb: 1 }}>
                  λ = n · k · f²
                </Typography>
                <Typography variant="body2" sx={{ textAlign: 'center' }}>
                  df₁ = k - 1, df₂ = N - k
                </Typography>
              </Paper>

              <Typography variant="body2" paragraph>
                <strong>Parameters:</strong><br/>
                n = sample size per group<br/>
                k = number of groups<br/>
                f = Cohen's f effect size
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Sample Size (per group):
              </Typography>
              <Typography sx={{ fontFamily: 'serif', fontSize: '0.9rem' }}>
                n ≈ (z<sub>α</sub> + z<sub>β</sub>)² / (k · f²) + 1
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Two-way ANOVA */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.secondary.dark }}>
                Factorial ANOVA
              </Typography>

              <Typography variant="body2" paragraph>
                For 2×2 design with factors A and B:
              </Typography>

              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.secondary.light, 0.15), mb: 2 }}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  Main effect A: λ<sub>A</sub> = n·b·Σα²/σ²<br/>
                  Main effect B: λ<sub>B</sub> = n·a·Σβ²/σ²<br/>
                  Interaction: λ<sub>AB</sub> = n·Σ(αβ)²/σ²
                </Typography>
              </Paper>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Key insight:</strong> Interaction effects typically require larger samples
                  than main effects (often 4× as many subjects).
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Repeated Measures ANOVA
        </Typography>

        <Typography variant="body1" paragraph>
          Repeated measures designs can dramatically increase power by controlling for
          individual differences. The key parameter is the correlation between repeated measures.
        </Typography>

        <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.success.light, 0.2), mb: 2 }}>
          <Typography sx={{ fontFamily: 'serif', fontSize: '1rem', textAlign: 'center' }}>
            Effective n = n / (1 - ρ)
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'center', mt: 1 }}>
            where ρ is the average correlation between repeated measures
          </Typography>
        </Paper>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Correlation (ρ)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Power Multiplier</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Sample Size Reduction</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>0.3</TableCell>
                <TableCell align="center">1.43×</TableCell>
                <TableCell align="center">30% fewer needed</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>0.5</TableCell>
                <TableCell align="center">2.00×</TableCell>
                <TableCell align="center">50% fewer needed</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>0.7</TableCell>
                <TableCell align="center">3.33×</TableCell>
                <TableCell align="center">70% fewer needed</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>0.9</TableCell>
                <TableCell align="center">10.0×</TableCell>
                <TableCell align="center">90% fewer needed</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Special Considerations for ANOVA
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.warning.light, 0.2) }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Sphericity in Repeated Measures
                </Typography>
                <Typography variant="body2">
                  Violations of sphericity reduce power. Use Greenhouse-Geisser or
                  Huynh-Feldt corrections. Plan for the corrected df.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.light, 0.2) }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Post-Hoc Comparisons
                </Typography>
                <Typography variant="body2">
                  If planning specific contrasts, use contrast-specific power calculations.
                  Omnibus F is less powerful for detecting specific patterns.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  // Render Step 3: Chi-Square & Proportions
  const renderStep3 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: theme.palette.error.dark, fontWeight: 600 }}>
        Power Analysis for Chi-Square & Proportions
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          Categorical data analyses use chi-square distributions and Cohen's w or h effect sizes.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {/* Chi-square goodness-of-fit */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.error.main }}>
                Chi-Square Goodness-of-Fit
              </Typography>

              <Typography variant="body2" paragraph>
                Tests whether observed proportions differ from expected.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.error.light, 0.2), mb: 2 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1rem', textAlign: 'center', mb: 1 }}>
                  λ = N · w²
                </Typography>
                <Typography variant="body2" sx={{ textAlign: 'center' }}>
                  df = k - 1
                </Typography>
              </Paper>

              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Cohen's w:
              </Typography>
              <Paper sx={{ p: 1, bgcolor: theme.palette.grey[isDarkMode ? 800 : 100] }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '0.9rem', textAlign: 'center' }}>
                  w = √[Σ(p₀ - p₁)² / p₀]
                </Typography>
              </Paper>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                Small: 0.1 | Medium: 0.3 | Large: 0.5
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Chi-square independence */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.error.main }}>
                Chi-Square Test of Independence
              </Typography>

              <Typography variant="body2" paragraph>
                Tests association between two categorical variables.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.error.light, 0.15), mb: 2 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1rem', textAlign: 'center', mb: 1 }}>
                  λ = N · w²
                </Typography>
                <Typography variant="body2" sx={{ textAlign: 'center' }}>
                  df = (r-1)(c-1)
                </Typography>
              </Paper>

              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Sample Size:
              </Typography>
              <Paper sx={{ p: 1, bgcolor: theme.palette.grey[isDarkMode ? 800 : 100] }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '0.9rem', textAlign: 'center' }}>
                  N = (χ²<sub>α,df</sub> + χ²<sub>1-β,df</sub>) / w²
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Comparing Two Proportions
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.success.light, 0.2) }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Cohen's h Effect Size
              </Typography>

              <Typography sx={{ fontFamily: 'serif', fontSize: '1rem', textAlign: 'center', mb: 2 }}>
                h = 2·arcsin(√p₁) - 2·arcsin(√p₂)
              </Typography>

              <Typography variant="body2" paragraph>
                The arcsine transformation ensures equal detectability across the
                0-1 range of proportions.
              </Typography>

              <Typography variant="caption" color="text.secondary">
                Small: 0.2 | Medium: 0.5 | Large: 0.8
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.warning.light, 0.2) }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Sample Size per Group
              </Typography>

              <Typography sx={{ fontFamily: 'serif', fontSize: '1rem', textAlign: 'center', mb: 2 }}>
                n = 2 × ((z<sub>α/2</sub> + z<sub>β</sub>) / h)²
              </Typography>

              <Typography variant="body2">
                This is the same formula as two-sample t-test, using h instead of d.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Why Raw Proportion Differences Don't Work
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" paragraph>
            A difference of 0.10 vs 0.20 is very different from 0.50 vs 0.60, even though
            both are "10 percentage points":
          </Typography>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>p₁</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>p₂</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Difference</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Cohen's h</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>n per group (80%)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>0.10</TableCell>
                  <TableCell>0.20</TableCell>
                  <TableCell>0.10</TableCell>
                  <TableCell>0.29</TableCell>
                  <TableCell>186</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>0.20</TableCell>
                  <TableCell>0.30</TableCell>
                  <TableCell>0.10</TableCell>
                  <TableCell>0.23</TableCell>
                  <TableCell>295</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>0.45</TableCell>
                  <TableCell>0.55</TableCell>
                  <TableCell>0.10</TableCell>
                  <TableCell>0.20</TableCell>
                  <TableCell>393</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Differences near 0 or 1 are easier to detect than differences near 0.5.
            </Typography>
          </Alert>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  // Render Step 4: Correlation & Regression
  const renderStep4 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: theme.palette.error.dark, fontWeight: 600 }}>
        Power Analysis for Correlation & Regression
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          Correlation uses r directly as effect size, while regression uses f² (proportion
          of variance explained).
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {/* Correlation */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.info.main }}>
                Pearson Correlation
              </Typography>

              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.info.light, 0.2), mb: 2 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1rem', textAlign: 'center', mb: 1 }}>
                  z<sub>r</sub> = 0.5 · ln((1+r)/(1-r))
                </Typography>
                <Typography variant="body2" sx={{ textAlign: 'center' }}>
                  (Fisher's z transformation)
                </Typography>
              </Paper>

              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Sample Size Formula:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: theme.palette.grey[isDarkMode ? 800 : 100] }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '0.9rem', textAlign: 'center' }}>
                  n = ((z<sub>α/2</sub> + z<sub>β</sub>) / z<sub>r</sub>)² + 3
                </Typography>
              </Paper>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Effect Size Benchmarks:
              </Typography>
              <Typography variant="body2">
                Small: r = 0.1 (n ≈ 782)<br/>
                Medium: r = 0.3 (n ≈ 85)<br/>
                Large: r = 0.5 (n ≈ 28)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Multiple Regression */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.success.dark }}>
                Multiple Regression
              </Typography>

              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.success.light, 0.15), mb: 2 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1rem', textAlign: 'center', mb: 1 }}>
                  f² = R² / (1 - R²)
                </Typography>
                <Typography variant="body2" sx={{ textAlign: 'center' }}>
                  λ = f² · (n - k - 1)
                </Typography>
              </Paper>

              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Incremental f² (for added predictors):
              </Typography>
              <Paper sx={{ p: 2, bgcolor: theme.palette.grey[isDarkMode ? 800 : 100], mb: 2 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '0.9rem', textAlign: 'center' }}>
                  f² = (R²<sub>full</sub> - R²<sub>reduced</sub>) / (1 - R²<sub>full</sub>)
                </Typography>
              </Paper>

              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Effect Size Benchmarks:
              </Typography>
              <Typography variant="body2">
                Small: f² = 0.02<br/>
                Medium: f² = 0.15<br/>
                Large: f² = 0.35
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Sample Size for Regression
        </Typography>

        <Typography variant="body1" paragraph>
          Rules of thumb for regression sample size:
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.warning.light, 0.2) }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Tabachnick & Fidell
              </Typography>
              <Typography variant="body2">
                n ≥ 50 + 8k (for testing the model)<br/>
                n ≥ 104 + k (for testing individual predictors)
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.light, 0.2) }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Green's Rule
              </Typography>
              <Typography variant="body2">
                n ≥ 50 + 8k for R² test<br/>
                n ≥ 104 + k for coefficient tests<br/>
                (k = number of predictors)
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.success.light, 0.2) }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Power-Based
              </Typography>
              <Typography variant="body2">
                Better: Use actual f² to calculate<br/>
                required n via non-central F
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );

  // Render Step 5: Non-Parametric Tests
  const renderStep5 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: theme.palette.error.dark, fontWeight: 600 }}>
        Power Analysis for Non-Parametric Tests
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          Non-parametric tests don't assume normality but typically have lower power under
          normal conditions. The key concept is <strong>Asymptotic Relative Efficiency (ARE)</strong>.
        </Typography>
      </Alert>

      <Paper sx={{ p: 3, mb: 3, bgcolor: alpha(theme.palette.warning.light, 0.2) }}>
        <Typography variant="h6" gutterBottom>
          Asymptotic Relative Efficiency (ARE)
        </Typography>

        <Typography variant="body1" paragraph>
          ARE measures how many more observations a non-parametric test needs compared to its
          parametric counterpart to achieve the same power, assuming the parametric assumptions hold.
        </Typography>

        <Paper sx={{ p: 2, bgcolor: theme.palette.background.paper, mb: 2 }}>
          <Typography sx={{ fontFamily: 'serif', fontSize: '1.2rem', textAlign: 'center' }}>
            ARE = n<sub>parametric</sub> / n<sub>non-parametric</sub>
          </Typography>
        </Paper>

        <Alert severity="success">
          <Typography variant="body2">
            <strong>Key value:</strong> For normal data, most rank-based tests have ARE = 3/π ≈ 0.955
            compared to their parametric counterparts.
          </Typography>
        </Alert>
      </Paper>

      <Grid container spacing={3}>
        {/* Mann-Whitney */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.secondary.main }}>
                Mann-Whitney U Test
              </Typography>

              <Typography variant="body2" paragraph>
                Non-parametric alternative to independent samples t-test.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.secondary.light, 0.2), mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  ARE vs t-test (normal data):
                </Typography>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1.2rem', textAlign: 'center' }}>
                  ARE = 3/π ≈ 0.955
                </Typography>
              </Paper>

              <Typography variant="body2" paragraph>
                <strong>Power calculation:</strong> Multiply the t-test sample size by 1/0.955 ≈ 1.05
              </Typography>

              <Typography variant="body2" color="text.secondary">
                <strong>Effect size:</strong> Often uses probability of superiority:<br/>
                P(X {'>'} Y) where X ~ Group 1, Y ~ Group 2
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Wilcoxon */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.secondary.dark }}>
                Wilcoxon Signed-Rank Test
              </Typography>

              <Typography variant="body2" paragraph>
                Non-parametric alternative to paired t-test.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.secondary.light, 0.15), mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  ARE vs paired t-test (normal data):
                </Typography>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1.2rem', textAlign: 'center' }}>
                  ARE = 3/π ≈ 0.955
                </Typography>
              </Paper>

              <Typography variant="body2" paragraph>
                <strong>Interpretation:</strong> Only 5% less efficient than paired t-test
                when data are normal.
              </Typography>

              <Typography variant="body2" color="text.secondary">
                <strong>Advantage:</strong> More robust to outliers and non-normal distributions.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Kruskal-Wallis */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.dark }}>
                Kruskal-Wallis Test
              </Typography>

              <Typography variant="body2" paragraph>
                Non-parametric alternative to one-way ANOVA (k {'>'} 2 groups).
              </Typography>

              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.light, 0.15), mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  ARE vs one-way ANOVA:
                </Typography>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1.2rem', textAlign: 'center' }}>
                  ARE = 3/π ≈ 0.955
                </Typography>
              </Paper>

              <Typography variant="body2">
                <strong>Power approach:</strong> Calculate ANOVA n, then multiply by ~1.05
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Friedman */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.dark }}>
                Friedman Test
              </Typography>

              <Typography variant="body2" paragraph>
                Non-parametric alternative to repeated measures ANOVA.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.light, 0.2), mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  ARE vs RM-ANOVA:
                </Typography>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1.2rem', textAlign: 'center' }}>
                  ARE = 3/π ≈ 0.955
                </Typography>
              </Paper>

              <Typography variant="body2">
                <strong>Note:</strong> Particularly useful when ranking is more reliable than
                raw measurements.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          When to Use Non-Parametric Tests
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.success.light, 0.2) }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                Use Non-Parametric When:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: theme.palette.success.main, fontSize: 18 }} /></ListItemIcon>
                  <ListItemText primary="Data are clearly non-normal" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: theme.palette.success.main, fontSize: 18 }} /></ListItemIcon>
                  <ListItemText primary="Ordinal (ranked) data only" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: theme.palette.success.main, fontSize: 18 }} /></ListItemIcon>
                  <ListItemText primary="Heavy outliers present" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: theme.palette.success.main, fontSize: 18 }} /></ListItemIcon>
                  <ListItemText primary="Very small samples (n < 10)" />
                </ListItem>
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.light, 0.2) }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: theme.palette.info.main }}>
                Use Parametric When:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: theme.palette.info.main, fontSize: 18 }} /></ListItemIcon>
                  <ListItemText primary="Data approximately normal" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: theme.palette.info.main, fontSize: 18 }} /></ListItemIcon>
                  <ListItemText primary="Large samples (CLT applies)" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: theme.palette.info.main, fontSize: 18 }} /></ListItemIcon>
                  <ListItemText primary="Want confidence intervals" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: theme.palette.info.main, fontSize: 18 }} /></ListItemIcon>
                  <ListItemText primary="Complex designs (ANCOVA, etc.)" />
                </ListItem>
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      <Alert severity="success" sx={{ mt: 3 }}>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          Key Takeaway: The 3/π Rule
        </Typography>
        <Typography variant="body2">
          For normally distributed data, non-parametric rank tests require about 5% more observations
          (1/0.955 ≈ 1.047) to achieve the same power as parametric tests. However, for non-normal
          data, non-parametric tests can be substantially more powerful.
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
          <Category sx={{ fontSize: 40, mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Lesson 7: Power for Different Designs
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              Parametric & Non-Parametric Tests
            </Typography>
          </Box>
        </Box>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          Comprehensive coverage of power analysis for t-tests, ANOVA, chi-square, correlation,
          regression, and non-parametric alternatives.
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
              <ListItemText primary="Power formulas for t-test variants (one-sample, two-sample, paired)" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: theme.palette.success.main }} /></ListItemIcon>
              <ListItemText primary="ANOVA power including repeated measures and factorial designs" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: theme.palette.success.main }} /></ListItemIcon>
              <ListItemText primary="Chi-square, proportion, correlation, and regression power" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: theme.palette.success.main }} /></ListItemIcon>
              <ListItemText primary="Non-parametric tests and the ARE = 3/π concept" />
            </ListItem>
          </List>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Next: Lesson 8 - Assumptions and Their Violations
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default Lesson07_DifferentDesigns;
