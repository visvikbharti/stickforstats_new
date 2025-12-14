/**
 * Lesson 5: Effect Size - The Crucial Concept
 *
 * This comprehensive lesson covers all major effect size measures including
 * Cohen's d, f, r, w, h, and f² with full mathematical derivations,
 * conversions between measures, and practical guidance on determination.
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
  TextField,
  Tabs,
  Tab,
  ToggleButton,
  ToggleButtonGroup,
  InputAdornment,
} from '@mui/material';
import {
  NavigateNext,
  NavigateBefore,
  CheckCircle,
  ExpandMore,
  TrendingUp,
  Functions,
  Calculate,
  SwapHoriz,
  Science,
  School,
  Psychology,
  Warning,
  Info,
  Lightbulb,
} from '@mui/icons-material';

// Step titles for the lesson
const steps = [
  'What is Effect Size?',
  "Cohen's d (Means)",
  "Cohen's f & η² (ANOVA)",
  "r, w, h (Other Measures)",
  'Conversions & Determination',
];

const Lesson05_EffectSize = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  // Effect size visualization state
  const [cohensD, setCohensD] = useState(0.5);
  const [mean1, setMean1] = useState(100);
  const [mean2, setMean2] = useState(110);
  const [stdDev, setStdDev] = useState(20);

  // Converter state
  const [converterTab, setConverterTab] = useState(0);
  const [inputD, setInputD] = useState(0.5);
  const [inputR, setInputR] = useState(0.243);
  const [inputEta2, setInputEta2] = useState(0.06);

  // Canvas ref for visualization
  const canvasRef = useRef(null);

  // Calculate Cohen's d from means and SD
  const calculateCohensD = useCallback((m1, m2, sd) => {
    return (m2 - m1) / sd;
  }, []);

  // Update Cohen's d when inputs change
  useEffect(() => {
    const d = calculateCohensD(mean1, mean2, stdDev);
    setCohensD(d);
  }, [mean1, mean2, stdDev, calculateCohensD]);

  // Effect size conversions
  const dToR = (d) => d / Math.sqrt(d * d + 4);
  const rToD = (r) => (2 * r) / Math.sqrt(1 - r * r);
  const eta2ToD = (eta2) => 2 * Math.sqrt(eta2 / (1 - eta2));
  const dToEta2 = (d) => (d * d) / (d * d + 4);
  const eta2ToF = (eta2) => Math.sqrt(eta2 / (1 - eta2));
  const fToEta2 = (f) => (f * f) / (1 + f * f);

  // Draw overlapping distributions visualization
  const drawDistributions = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Parameters
    const m1 = 0;
    const m2 = cohensD;
    const sd = 1;

    const xMin = -4;
    const xMax = 4 + cohensD;
    const xScale = width / (xMax - xMin);
    const yScale = height * 0.6;
    const baseY = height - 50;

    // Normal PDF
    const normalPDF = (x, mean, sigma) => {
      const z = (x - mean) / sigma;
      return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
    };

    // Draw overlap region
    ctx.fillStyle = 'rgba(156, 39, 176, 0.3)';
    ctx.beginPath();
    const overlapStart = Math.max(xMin, m1 - 3);
    const overlapEnd = Math.min(xMax, m2 + 3);

    for (let x = overlapStart; x <= overlapEnd; x += 0.02) {
      const y1 = normalPDF(x, m1, sd);
      const y2 = normalPDF(x, m2, sd);
      const minY = Math.min(y1, y2);
      const canvasX = (x - xMin) * xScale;
      const canvasY = baseY - minY * yScale * 4;

      if (x === overlapStart) {
        ctx.moveTo(canvasX, baseY);
        ctx.lineTo(canvasX, canvasY);
      } else {
        ctx.lineTo(canvasX, canvasY);
      }
    }
    ctx.lineTo((overlapEnd - xMin) * xScale, baseY);
    ctx.closePath();
    ctx.fill();

    // Draw Group 1 distribution (control)
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = xMin; x <= xMax; x += 0.02) {
      const y = normalPDF(x, m1, sd);
      const canvasX = (x - xMin) * xScale;
      const canvasY = baseY - y * yScale * 4;
      if (x === xMin) ctx.moveTo(canvasX, canvasY);
      else ctx.lineTo(canvasX, canvasY);
    }
    ctx.stroke();

    // Draw Group 2 distribution (treatment)
    ctx.strokeStyle = '#f44336';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = xMin; x <= xMax; x += 0.02) {
      const y = normalPDF(x, m2, sd);
      const canvasX = (x - xMin) * xScale;
      const canvasY = baseY - y * yScale * 4;
      if (x === xMin) ctx.moveTo(canvasX, canvasY);
      else ctx.lineTo(canvasX, canvasY);
    }
    ctx.stroke();

    // Mean lines
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;

    ctx.strokeStyle = '#1976d2';
    ctx.beginPath();
    ctx.moveTo((m1 - xMin) * xScale, 20);
    ctx.lineTo((m1 - xMin) * xScale, baseY);
    ctx.stroke();

    ctx.strokeStyle = '#f44336';
    ctx.beginPath();
    ctx.moveTo((m2 - xMin) * xScale, 20);
    ctx.lineTo((m2 - xMin) * xScale, baseY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Effect size arrow
    if (cohensD > 0.1) {
      ctx.strokeStyle = '#4caf50';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const arrowY = 30;
      ctx.moveTo((m1 - xMin) * xScale, arrowY);
      ctx.lineTo((m2 - xMin) * xScale, arrowY);
      ctx.stroke();

      // Arrow head
      ctx.fillStyle = '#4caf50';
      ctx.beginPath();
      ctx.moveTo((m2 - xMin) * xScale, arrowY);
      ctx.lineTo((m2 - xMin) * xScale - 10, arrowY - 5);
      ctx.lineTo((m2 - xMin) * xScale - 10, arrowY + 5);
      ctx.closePath();
      ctx.fill();
    }

    // Labels
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';

    ctx.fillStyle = '#1976d2';
    ctx.fillText('Group 1 (Control)', (m1 - xMin) * xScale, height - 10);

    ctx.fillStyle = '#f44336';
    ctx.fillText('Group 2 (Treatment)', (m2 - xMin) * xScale, height - 10);

    ctx.fillStyle = '#4caf50';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`d = ${cohensD.toFixed(2)}`, ((m1 + m2) / 2 - xMin) * xScale, 20);

    // Overlap percentage
    const overlap = calculateOverlap(cohensD);
    ctx.fillStyle = '#9c27b0';
    ctx.font = '12px Arial';
    ctx.fillText(`${(overlap * 100).toFixed(0)}% overlap`, width / 2, 50);

  }, [cohensD]);

  // Calculate distribution overlap
  const calculateOverlap = (d) => {
    // Overlap coefficient approximation
    return 2 * (1 - normalCDF(Math.abs(d) / 2));
  };

  const normalCDF = (x) => {
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
  };

  useEffect(() => {
    if (activeStep === 1) {
      drawDistributions();
    }
  }, [activeStep, drawDistributions, cohensD]);

  // Handle step navigation
  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, activeStep]));
    setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  // Render Step 1: What is Effect Size?
  const renderStep1 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        What is Effect Size?
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          Effect size is a <strong>standardized measure of the magnitude</strong> of a phenomenon.
          Unlike p-values, effect sizes tell you <em>how big</em> an effect is, not just whether it exists.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp sx={{ color: '#2196f3', mr: 1, fontSize: 28 }} />
                <Typography variant="h6">The Core Idea</Typography>
              </Box>

              <Typography variant="body1" paragraph>
                Effect size separates <strong>magnitude</strong> from <strong>statistical significance</strong>.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: '#e3f2fd', mb: 2 }}>
                <Typography variant="body2" sx={{ textAlign: 'center' }}>
                  <strong>Statistical Significance:</strong> "Is there an effect?"<br/>
                  <strong>Effect Size:</strong> "How big is the effect?"
                </Typography>
              </Paper>

              <Typography variant="body2" color="text.secondary">
                A tiny effect can be statistically significant with a large sample size.
                A large effect can be non-significant with a small sample size.
                Effect size tells you what matters—the actual magnitude.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Functions sx={{ color: '#f44336', mr: 1, fontSize: 28 }} />
                <Typography variant="h6">Why Standardize?</Typography>
              </Box>

              <Typography variant="body1" paragraph>
                Effect sizes are expressed in <strong>standard units</strong>, making them:
              </Typography>

              <List>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText
                    primary="Comparable across studies"
                    secondary="Different scales, different populations"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText
                    primary="Independent of sample size"
                    secondary="Same effect → same d, regardless of n"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText
                    primary="Meta-analyzable"
                    secondary="Can combine results across studies"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          The Effect Size Family
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 600 }}>Measure</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Test Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Formula</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Interpretation</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell><Chip label="Cohen's d" color="primary" size="small" /></TableCell>
                <TableCell>t-tests</TableCell>
                <TableCell sx={{ fontFamily: 'serif' }}>(μ₁ - μ₂) / σ</TableCell>
                <TableCell>Difference in standard deviations</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Chip label="Cohen's f" color="secondary" size="small" /></TableCell>
                <TableCell>ANOVA</TableCell>
                <TableCell sx={{ fontFamily: 'serif' }}>√(η² / (1 - η²))</TableCell>
                <TableCell>Ratio of effect to error variance</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Chip label="r" color="success" size="small" /></TableCell>
                <TableCell>Correlation</TableCell>
                <TableCell sx={{ fontFamily: 'serif' }}>Σxy / √(Σx²·Σy²)</TableCell>
                <TableCell>Strength of linear relationship</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Chip label="Cohen's w" color="warning" size="small" /></TableCell>
                <TableCell>Chi-square</TableCell>
                <TableCell sx={{ fontFamily: 'serif' }}>√(χ²/N)</TableCell>
                <TableCell>Deviation from expected proportions</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Chip label="Cohen's h" color="error" size="small" /></TableCell>
                <TableCell>Proportions</TableCell>
                <TableCell sx={{ fontFamily: 'serif' }}>2(arcsin√p₁ - arcsin√p₂)</TableCell>
                <TableCell>Difference in proportions (transformed)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Chip label="Cohen's f²" color="info" size="small" /></TableCell>
                <TableCell>Regression</TableCell>
                <TableCell sx={{ fontFamily: 'serif' }}>R² / (1 - R²)</TableCell>
                <TableCell>Ratio of explained to unexplained variance</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );

  // Render Step 2: Cohen's d
  const renderStep2 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        Cohen's d: The Gold Standard for Mean Differences
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Cohen's d is the most widely used effect size measure. It quantifies the difference
        between two means in standard deviation units.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#2196f3' }}>
                Mathematical Definition
              </Typography>

              <Paper sx={{ p: 3, bgcolor: '#e3f2fd', mb: 3 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1.3rem', textAlign: 'center', mb: 2 }}>
                  d = (μ₁ - μ₂) / σ<sub>pooled</sub>
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography sx={{ fontFamily: 'serif', fontSize: '1rem', textAlign: 'center' }}>
                  σ<sub>pooled</sub> = √[((n₁-1)s₁² + (n₂-1)s₂²) / (n₁+n₂-2)]
                </Typography>
              </Paper>

              <Typography variant="body1" paragraph>
                <strong>Interpretation:</strong> A Cohen's d of 0.5 means the two group means
                differ by half a standard deviation.
              </Typography>

              <Typography variant="body2" color="text.secondary">
                The pooled standard deviation assumes equal variances (homoscedasticity).
                For unequal variances, use Glass's Δ (dividing by control group SD only).
              </Typography>
            </CardContent>
          </Card>

          <Card elevation={3} sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cohen's Benchmarks
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Size</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>d</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>% Non-overlap</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Example</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Small</TableCell>
                      <TableCell align="center"><strong>0.20</strong></TableCell>
                      <TableCell align="center">14.7%</TableCell>
                      <TableCell>Height difference: 0.5 cm</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                      <TableCell>Medium</TableCell>
                      <TableCell align="center"><strong>0.50</strong></TableCell>
                      <TableCell align="center">33.0%</TableCell>
                      <TableCell>Height difference: 1.3 cm</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Large</TableCell>
                      <TableCell align="center"><strong>0.80</strong></TableCell>
                      <TableCell align="center">47.4%</TableCell>
                      <TableCell>Height difference: 2 cm</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Very Large</TableCell>
                      <TableCell align="center"><strong>1.20</strong></TableCell>
                      <TableCell align="center">62.8%</TableCell>
                      <TableCell>Male vs female height</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Interactive Visualization
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Adjust effect size to see how distributions overlap
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography gutterBottom>
                Cohen's d: <strong>{cohensD.toFixed(2)}</strong>
                <Chip
                  label={
                    Math.abs(cohensD) < 0.35 ? 'Small' :
                    Math.abs(cohensD) < 0.65 ? 'Medium' :
                    Math.abs(cohensD) < 1.0 ? 'Large' : 'Very Large'
                  }
                  size="small"
                  sx={{ ml: 2 }}
                  color={
                    Math.abs(cohensD) < 0.35 ? 'warning' :
                    Math.abs(cohensD) < 0.65 ? 'info' :
                    Math.abs(cohensD) < 1.0 ? 'success' : 'secondary'
                  }
                />
              </Typography>
              <Slider
                value={cohensD}
                onChange={(e, v) => setCohensD(v)}
                min={0}
                max={2}
                step={0.1}
                marks={[
                  { value: 0.2, label: '0.2' },
                  { value: 0.5, label: '0.5' },
                  { value: 0.8, label: '0.8' },
                  { value: 1.2, label: '1.2' },
                ]}
                sx={{ color: '#2196f3' }}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <canvas
                ref={canvasRef}
                width={500}
                height={300}
                style={{ maxWidth: '100%', border: '1px solid #ddd', borderRadius: 4 }}
              />
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Overlap:</strong> {(calculateOverlap(cohensD) * 100).toFixed(0)}% of the distributions overlap.
                <br/>
                <strong>Non-overlap:</strong> {(100 - calculateOverlap(cohensD) * 100).toFixed(0)}% of treatment group
                exceeds control group median.
              </Typography>
            </Alert>
          </Paper>
        </Grid>
      </Grid>

      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Variants of Cohen's d
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  Hedges' g
                </Typography>
                <Typography sx={{ fontFamily: 'serif', fontSize: '0.9rem', mb: 1 }}>
                  g = d × (1 - 3/(4(n₁+n₂)-9))
                </Typography>
                <Typography variant="body2">
                  Corrects for small sample bias. Use when n {'<'} 20 per group.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, bgcolor: '#e8f5e9' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  Glass's Δ
                </Typography>
                <Typography sx={{ fontFamily: 'serif', fontSize: '0.9rem', mb: 1 }}>
                  Δ = (μ₁ - μ₂) / σ<sub>control</sub>
                </Typography>
                <Typography variant="body2">
                  Uses only control group SD. Use when treatment affects variability.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  Cohen's d<sub>z</sub>
                </Typography>
                <Typography sx={{ fontFamily: 'serif', fontSize: '0.9rem', mb: 1 }}>
                  d<sub>z</sub> = μ<sub>D</sub> / σ<sub>D</sub>
                </Typography>
                <Typography variant="body2">
                  For paired/repeated measures. Uses difference score SD.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  // Render Step 3: Cohen's f and η²
  const renderStep3 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        Cohen's f and η²: Effect Sizes for ANOVA
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        When comparing more than two groups, Cohen's f and η² (eta-squared) are the
        appropriate effect size measures.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#9c27b0' }}>
                Eta-Squared (η²)
              </Typography>

              <Paper sx={{ p: 2, bgcolor: '#f3e5f5', mb: 2 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1.2rem', textAlign: 'center' }}>
                  η² = SS<sub>between</sub> / SS<sub>total</sub>
                </Typography>
              </Paper>

              <Typography variant="body1" paragraph>
                <strong>Interpretation:</strong> η² represents the <em>proportion of total variance</em>
                explained by group membership.
              </Typography>

              <Typography variant="body2" paragraph>
                η² = 0.10 means 10% of the variance in the outcome is explained by group differences.
              </Typography>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Caution:</strong> η² is biased upward in small samples. Consider using
                  partial η² or ω² (omega-squared) for better estimates.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#673ab7' }}>
                Cohen's f
              </Typography>

              <Paper sx={{ p: 2, bgcolor: '#ede7f6', mb: 2 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1.2rem', textAlign: 'center', mb: 2 }}>
                  f = √(η² / (1 - η²))
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography sx={{ fontFamily: 'serif', fontSize: '1rem', textAlign: 'center' }}>
                  f = σ<sub>m</sub> / σ
                </Typography>
              </Paper>

              <Typography variant="body1" paragraph>
                <strong>Interpretation:</strong> f is the ratio of the standard deviation of group
                means to the within-group standard deviation.
              </Typography>

              <Typography variant="body2" color="text.secondary">
                f is the preferred effect size for power analysis in ANOVA designs because it
                directly relates to the noncentrality parameter.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Cohen's Benchmarks for ANOVA
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 600 }}>Size</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>f</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>η²</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>f²</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Interpretation</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Small</TableCell>
                <TableCell align="center"><strong>0.10</strong></TableCell>
                <TableCell align="center">0.01</TableCell>
                <TableCell align="center">0.01</TableCell>
                <TableCell>1% variance explained</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                <TableCell>Medium</TableCell>
                <TableCell align="center"><strong>0.25</strong></TableCell>
                <TableCell align="center">0.06</TableCell>
                <TableCell align="center">0.0625</TableCell>
                <TableCell>6% variance explained</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Large</TableCell>
                <TableCell align="center"><strong>0.40</strong></TableCell>
                <TableCell align="center">0.14</TableCell>
                <TableCell align="center">0.16</TableCell>
                <TableCell>14% variance explained</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Mathematical Derivation: f from Group Means
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Paper sx={{ p: 3, bgcolor: '#fafafa' }}>
            <Typography variant="body1" paragraph>
              For k groups with means μ₁, μ₂, ..., μₖ and grand mean μ:
            </Typography>

            <Box sx={{ textAlign: 'center', my: 3 }}>
              <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem', mb: 2 }}>
                σ<sub>m</sub> = √[Σ(μᵢ - μ)² / k]
              </Typography>
              <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem', mb: 2 }}>
                f = σ<sub>m</sub> / σ
              </Typography>
            </Box>

            <Typography variant="body1" paragraph>
              <strong>Example:</strong> Three groups with means 10, 12, 14 and within-group SD = 5:
            </Typography>

            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
              Grand mean μ = (10 + 12 + 14) / 3 = 12<br/>
              σ<sub>m</sub> = √[((-2)² + 0² + 2²) / 3] = √(8/3) = 1.63<br/>
              f = 1.63 / 5 = 0.33 (medium-large effect)
            </Typography>
          </Paper>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Partial η² vs η²
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  η² (Eta-squared)
                </Typography>
                <Typography sx={{ fontFamily: 'serif', mb: 1 }}>
                  η² = SS<sub>effect</sub> / SS<sub>total</sub>
                </Typography>
                <Typography variant="body2">
                  Proportion of total variance explained.
                  All effects in a design sum to ≤ 1.
                  Used for one-way ANOVA.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: '#e8f5e9' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  Partial η² (η²<sub>p</sub>)
                </Typography>
                <Typography sx={{ fontFamily: 'serif', mb: 1 }}>
                  η²<sub>p</sub> = SS<sub>effect</sub> / (SS<sub>effect</sub> + SS<sub>error</sub>)
                </Typography>
                <Typography variant="body2">
                  Proportion of variance explained after removing other effects.
                  Can sum to {'>'} 1 across effects.
                  More appropriate for factorial ANOVA.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  // Render Step 4: Other Effect Size Measures
  const renderStep4 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        Other Effect Size Measures: r, w, h
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Different statistical tests require different effect size measures.
        Here we cover measures for correlations, chi-square tests, and proportion comparisons.
      </Alert>

      <Grid container spacing={3}>
        {/* Correlation r */}
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#4caf50' }}>
                Correlation Coefficient (r)
              </Typography>

              <Paper sx={{ p: 2, bgcolor: '#e8f5e9', mb: 2 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem', textAlign: 'center' }}>
                  r = Σ(x-x̄)(y-ȳ) / √[Σ(x-x̄)²·Σ(y-ȳ)²]
                </Typography>
              </Paper>

              <Typography variant="body1" paragraph>
                <strong>Range:</strong> -1 to +1
              </Typography>

              <Typography variant="body1" paragraph>
                <strong>Interpretation:</strong> r² represents the proportion of variance shared
                between two variables.
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>Small</TableCell>
                      <TableCell align="right"><strong>±0.10</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Medium</TableCell>
                      <TableCell align="right"><strong>±0.30</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Large</TableCell>
                      <TableCell align="right"><strong>±0.50</strong></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Cohen's w */}
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#ff9800' }}>
                Cohen's w (Chi-Square)
              </Typography>

              <Paper sx={{ p: 2, bgcolor: '#fff3e0', mb: 2 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem', textAlign: 'center' }}>
                  w = √(χ²/N) = √[Σ(O-E)²/(E·N)]
                </Typography>
              </Paper>

              <Typography variant="body1" paragraph>
                <strong>Range:</strong> 0 to ∞ (typically {'<'} 1)
              </Typography>

              <Typography variant="body1" paragraph>
                <strong>Use:</strong> Chi-square goodness-of-fit and independence tests.
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>Small</TableCell>
                      <TableCell align="right"><strong>0.10</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Medium</TableCell>
                      <TableCell align="right"><strong>0.30</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Large</TableCell>
                      <TableCell align="right"><strong>0.50</strong></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Cohen's h */}
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#f44336' }}>
                Cohen's h (Proportions)
              </Typography>

              <Paper sx={{ p: 2, bgcolor: '#ffebee', mb: 2 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem', textAlign: 'center' }}>
                  h = 2·arcsin(√p₁) - 2·arcsin(√p₂)
                </Typography>
              </Paper>

              <Typography variant="body1" paragraph>
                <strong>Range:</strong> -π to +π (typically {'<'} 1)
              </Typography>

              <Typography variant="body1" paragraph>
                <strong>Why transform?</strong> Raw proportion differences aren't comparable
                (0.1 vs 0.2 differs from 0.5 vs 0.6).
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>Small</TableCell>
                      <TableCell align="right"><strong>0.20</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Medium</TableCell>
                      <TableCell align="right"><strong>0.50</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Large</TableCell>
                      <TableCell align="right"><strong>0.80</strong></TableCell>
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
          Cohen's f² for Regression
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
              <Typography sx={{ fontFamily: 'serif', fontSize: '1.2rem', textAlign: 'center', mb: 2 }}>
                f² = R² / (1 - R²)
              </Typography>

              <Typography variant="body2" paragraph>
                For multiple regression, f² measures the ratio of explained to unexplained variance.
              </Typography>

              <Typography variant="body2">
                <strong>Incremental f²:</strong> For testing the effect of adding predictors:
              </Typography>

              <Typography sx={{ fontFamily: 'serif', fontSize: '1rem', textAlign: 'center', mt: 1 }}>
                f² = (R²<sub>AB</sub> - R²<sub>A</sub>) / (1 - R²<sub>AB</sub>)
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Size</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>f²</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>R²</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Small</TableCell>
                    <TableCell align="center"><strong>0.02</strong></TableCell>
                    <TableCell align="center">0.02</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Medium</TableCell>
                    <TableCell align="center"><strong>0.15</strong></TableCell>
                    <TableCell align="center">0.13</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Large</TableCell>
                    <TableCell align="center"><strong>0.35</strong></TableCell>
                    <TableCell align="center">0.26</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </Paper>

      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Odds Ratio as Effect Size
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" paragraph>
            For 2×2 contingency tables, the <strong>Odds Ratio (OR)</strong> is often used:
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 2 }}>
            <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem', textAlign: 'center' }}>
              OR = (a·d) / (b·c)
            </Typography>
          </Paper>

          <Typography variant="body2" paragraph>
            <strong>Interpretation:</strong>
            <br/>• OR = 1: No association
            <br/>• OR {'>'} 1: Positive association
            <br/>• OR {'<'} 1: Negative association
          </Typography>

          <Typography variant="body2">
            Convert OR to Cohen's d: <strong>d = ln(OR) × √3 / π ≈ ln(OR) × 0.55</strong>
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  // Render Step 5: Conversions and Determination
  const renderStep5 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        Effect Size Conversions & Determination
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Different studies report different effect size measures. Here's how to convert
        between them and determine which value to use for your power analysis.
      </Alert>

      <Grid container spacing={3}>
        {/* Converter */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <SwapHoriz sx={{ mr: 1, verticalAlign: 'middle' }} />
              Effect Size Converter
            </Typography>

            <Tabs
              value={converterTab}
              onChange={(e, v) => setConverterTab(v)}
              sx={{ mb: 2 }}
            >
              <Tab label="d ↔ r" />
              <Tab label="d ↔ η²" />
              <Tab label="η² ↔ f" />
            </Tabs>

            {converterTab === 0 && (
              <Box>
                <TextField
                  label="Cohen's d"
                  type="number"
                  value={inputD}
                  onChange={(e) => setInputD(parseFloat(e.target.value) || 0)}
                  size="small"
                  fullWidth
                  sx={{ mb: 2 }}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">→ r = {dToR(inputD).toFixed(3)}</InputAdornment>
                  }}
                />
                <TextField
                  label="Correlation r"
                  type="number"
                  value={inputR}
                  onChange={(e) => setInputR(parseFloat(e.target.value) || 0)}
                  size="small"
                  fullWidth
                  InputProps={{
                    endAdornment: <InputAdornment position="end">→ d = {rToD(inputR).toFixed(3)}</InputAdornment>
                  }}
                />
                <Paper sx={{ p: 2, mt: 2, bgcolor: '#f5f5f5' }}>
                  <Typography variant="caption">
                    <strong>Formulas:</strong><br/>
                    d = 2r / √(1 - r²)<br/>
                    r = d / √(d² + 4)
                  </Typography>
                </Paper>
              </Box>
            )}

            {converterTab === 1 && (
              <Box>
                <TextField
                  label="Cohen's d"
                  type="number"
                  value={inputD}
                  onChange={(e) => setInputD(parseFloat(e.target.value) || 0)}
                  size="small"
                  fullWidth
                  sx={{ mb: 2 }}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">→ η² = {dToEta2(inputD).toFixed(3)}</InputAdornment>
                  }}
                />
                <TextField
                  label="Eta-squared (η²)"
                  type="number"
                  value={inputEta2}
                  onChange={(e) => setInputEta2(parseFloat(e.target.value) || 0)}
                  size="small"
                  fullWidth
                  InputProps={{
                    endAdornment: <InputAdornment position="end">→ d = {eta2ToD(inputEta2).toFixed(3)}</InputAdornment>
                  }}
                />
                <Paper sx={{ p: 2, mt: 2, bgcolor: '#f5f5f5' }}>
                  <Typography variant="caption">
                    <strong>Formulas:</strong><br/>
                    d = 2√(η² / (1 - η²))<br/>
                    η² = d² / (d² + 4)
                  </Typography>
                </Paper>
              </Box>
            )}

            {converterTab === 2 && (
              <Box>
                <TextField
                  label="Eta-squared (η²)"
                  type="number"
                  value={inputEta2}
                  onChange={(e) => setInputEta2(parseFloat(e.target.value) || 0)}
                  size="small"
                  fullWidth
                  sx={{ mb: 2 }}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">→ f = {eta2ToF(inputEta2).toFixed(3)}</InputAdornment>
                  }}
                />
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Formula:</strong> f = √(η² / (1 - η²))
                  </Typography>
                </Alert>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* How to determine effect size */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              How to Determine Effect Size
            </Typography>

            <List>
              <ListItem>
                <ListItemIcon>
                  <Chip label="1" size="small" sx={{ bgcolor: '#4caf50', color: 'white' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Prior Literature (Gold Standard)"
                  secondary="Meta-analyses provide the best estimates. Look for studies in your specific domain."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Chip label="2" size="small" sx={{ bgcolor: '#2196f3', color: 'white' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Pilot Data"
                  secondary="Run a small preliminary study. Caution: pilot estimates are often inflated."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Chip label="3" size="small" sx={{ bgcolor: '#ff9800', color: 'white' }} />
                </ListItemIcon>
                <ListItemText
                  primary="MCID / Smallest Effect of Interest"
                  secondary="What's the smallest effect that would be practically meaningful?"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Chip label="4" size="small" sx={{ bgcolor: '#f44336', color: 'white' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Cohen's Conventions (Last Resort)"
                  secondary="Use only when no other information is available. Often criticized as arbitrary."
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3, bgcolor: '#fff3e0' }}>
        <Typography variant="h6" gutterBottom>
          <Warning sx={{ mr: 1, verticalAlign: 'middle', color: '#ff9800' }} />
          The Winner's Curse: Why Published Effect Sizes are Inflated
        </Typography>

        <Typography variant="body1" paragraph>
          Effect sizes from published literature are typically <strong>overestimated</strong> due to:
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: '#fff' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Publication Bias
              </Typography>
              <Typography variant="body2">
                Significant results are more likely to be published. Studies finding small
                effects often end up in the file drawer.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: '#fff' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Low-Powered Studies
              </Typography>
              <Typography variant="body2">
                Underpowered studies that happen to find significance will necessarily
                overestimate the true effect size.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: '#fff' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                p-Hacking
              </Typography>
              <Typography variant="body2">
                Selective reporting, optional stopping, and other questionable research
                practices inflate observed effects.
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Recommendation:</strong> When using literature values, consider using a
            more conservative estimate (e.g., 80% of the published effect size) or conduct
            a sensitivity analysis across a range of plausible effect sizes.
          </Typography>
        </Alert>
      </Paper>

      <Alert severity="success" sx={{ mt: 3 }}>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          Summary: Choosing the Right Effect Size
        </Typography>
        <Typography variant="body2">
          • <strong>t-tests:</strong> Cohen's d (or Hedges' g for small samples)<br/>
          • <strong>ANOVA:</strong> Cohen's f (preferred for power) or η²/partial η²<br/>
          • <strong>Correlation:</strong> r directly<br/>
          • <strong>Chi-square:</strong> Cohen's w<br/>
          • <strong>Proportions:</strong> Cohen's h<br/>
          • <strong>Regression:</strong> f² or R²
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
          <TrendingUp sx={{ fontSize: 40, mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Lesson 5: Effect Size
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              Cohen's d, f, r, w, h with Full Derivations
            </Typography>
          </Box>
        </Box>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          Master all major effect size measures, their mathematical foundations,
          conversions between them, and how to determine appropriate values for your research.
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
              <ListItemText primary="Cohen's d for comparing means (with variants g, Δ, dz)" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
              <ListItemText primary="Cohen's f and η² for ANOVA designs" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
              <ListItemText primary="Other measures: r, w, h, f² for various test types" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
              <ListItemText primary="Effect size conversions and determination strategies" />
            </ListItem>
          </List>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Next: Lesson 6 - The Mathematics of Power: Non-Central Distributions
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default Lesson05_EffectSize;
