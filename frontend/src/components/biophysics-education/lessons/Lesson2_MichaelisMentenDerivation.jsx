/**
 * Lesson 2: Michaelis-Menten Equation Derivation
 *
 * Step-by-step derivation with:
 * - Mathematical rigor
 * - Biological interpretation
 * - Interactive demonstrations
 * - Practice problems
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { alpha } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Card,
  CardContent,
  Grid,
  Slider,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TextField
} from '@mui/material';

// Icons
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import QuizIcon from '@mui/icons-material/Quiz';

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS = [
  { label: 'Setting Up', description: 'The reaction scheme' },
  { label: 'Steady-State', description: 'Applying the assumption' },
  { label: 'Derivation', description: 'Step-by-step math' },
  { label: 'The Equation', description: 'Final form and meaning' },
  { label: 'Practice', description: 'Test your understanding' }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Lesson2_MichaelisMentenDerivation = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [curveParams, setCurveParams] = useState({ Vmax: 100, Km: 20 });
  const [quizAnswers, setQuizAnswers] = useState({});
  const canvasRef = useRef(null);

  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  // Interactive MM curve
  useEffect(() => {
    if (!canvasRef.current || activeStep !== 3) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const margin = { top: 40, right: 40, bottom: 60, left: 70 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const { Vmax, Km } = curveParams;
    const maxS = Km * 10;

    const xScale = (s) => margin.left + (s / maxS) * plotWidth;
    const yScale = (v) => margin.top + plotHeight - (v / (Vmax * 1.1)) * plotHeight;

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const x = margin.left + (i / 5) * plotWidth;
      const y = margin.top + (i / 5) * plotHeight;

      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + plotHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + plotWidth, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + plotHeight);
    ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('[S] (substrate concentration)', margin.left + plotWidth / 2, height - 15);

    ctx.save();
    ctx.translate(20, margin.top + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('v (velocity)', 0, 0);
    ctx.restore();

    // Draw MM curve
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 3;
    ctx.beginPath();

    for (let i = 0; i <= 100; i++) {
      const s = (i / 100) * maxS;
      const v = (Vmax * s) / (Km + s);
      const x = xScale(s);
      const y = yScale(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Vmax line
    ctx.strokeStyle = '#FF9800';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin.left, yScale(Vmax));
    ctx.lineTo(margin.left + plotWidth, yScale(Vmax));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#FF9800';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Vmax = ${Vmax}`, margin.left + plotWidth - 5, yScale(Vmax) - 5);

    // Draw Km indicator
    ctx.strokeStyle = '#4CAF50';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(xScale(Km), yScale(0));
    ctx.lineTo(xScale(Km), yScale(Vmax / 2));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(margin.left, yScale(Vmax / 2));
    ctx.lineTo(xScale(Km), yScale(Vmax / 2));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#4CAF50';
    ctx.fillText(`Km = ${Km}`, xScale(Km) + 30, yScale(Vmax / 2) + 15);
    ctx.fillText('Vmax/2', margin.left + 35, yScale(Vmax / 2) - 5);

    // Draw point at Km, Vmax/2
    ctx.fillStyle = '#E91E63';
    ctx.beginPath();
    ctx.arc(xScale(Km), yScale(Vmax / 2), 6, 0, Math.PI * 2);
    ctx.fill();

    // Title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Michaelis-Menten Kinetics', width / 2, 25);

  }, [activeStep, curveParams]);

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
              Setting Up the Derivation
            </Typography>

            <Typography paragraph>
              We begin with the simple enzyme reaction scheme that we introduced in Lesson 1.
              Our goal is to derive an equation relating reaction velocity (v) to substrate
              concentration [S].
            </Typography>

            <Paper sx={{ p: 3, mb: 3, bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <Typography variant="h6" gutterBottom color="success.dark">
                The Reaction Scheme
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '1.3rem',
                  textAlign: 'center',
                  p: 2,
                  bgcolor: 'background.paper',
                  borderRadius: 1
                }}
              >
                E + S ⇌<sub style={{fontSize: '0.8rem'}}>k₁ / k₋₁</sub> ES →<sub style={{fontSize: '0.8rem'}}>k₂</sub> E + P
              </Typography>
            </Paper>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Rate Constants
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell><strong>k₁</strong></TableCell>
                            <TableCell>E + S → ES</TableCell>
                            <TableCell>M⁻¹s⁻¹</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell><strong>k₋₁</strong></TableCell>
                            <TableCell>ES → E + S</TableCell>
                            <TableCell>s⁻¹</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell><strong>k₂</strong> (kcat)</TableCell>
                            <TableCell>ES → E + P</TableCell>
                            <TableCell>s⁻¹</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Key Assumptions
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                        <ListItemText primary="[S] >> [E]ₜₒₜₐₗ" secondary="Substrate in large excess" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                        <ListItemText primary="d[ES]/dt = 0" secondary="Steady-state assumption" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                        <ListItemText primary="[P] ≈ 0" secondary="Initial velocity conditions" />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 3 }}>
              <AlertTitle>Conservation of Enzyme</AlertTitle>
              <Typography
                sx={{ fontFamily: 'monospace', fontSize: '1.1rem' }}
              >
                [E]ₜₒₜₐₗ = [E] + [ES]
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Total enzyme concentration is constant and equals free enzyme plus enzyme-substrate complex.
              </Typography>
            </Alert>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
              Applying the Steady-State Assumption
            </Typography>

            <Typography paragraph>
              At steady state, the concentration of ES remains constant. This means the rate
              of ES formation equals the rate of ES breakdown.
            </Typography>

            <Paper sx={{ p: 3, mb: 3, bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <Typography variant="h6" gutterBottom color="warning.dark">
                Rate of ES Formation
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '1.1rem',
                  textAlign: 'center',
                  p: 2,
                  bgcolor: 'background.paper',
                  borderRadius: 1
                }}
              >
                Rate of formation = k₁[E][S]
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                ES is formed when free enzyme (E) binds substrate (S).
              </Typography>
            </Paper>

            <Paper sx={{ p: 3, mb: 3, bgcolor: (theme) => alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <Typography variant="h6" gutterBottom color="error.dark">
                Rate of ES Breakdown
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '1.1rem',
                  textAlign: 'center',
                  p: 2,
                  bgcolor: 'background.paper',
                  borderRadius: 1
                }}
              >
                Rate of breakdown = k₋₁[ES] + k₂[ES] = (k₋₁ + k₂)[ES]
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                ES breaks down either by dissociating back to E + S (rate k₋₁) or by forming product (rate k₂).
              </Typography>
            </Paper>

            <Paper sx={{ p: 3, bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <Typography variant="h6" gutterBottom color="success.dark">
                Setting Up the Equation
              </Typography>
              <Typography paragraph>
                At steady state, these rates are equal:
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '1.1rem',
                  textAlign: 'center',
                  p: 2,
                  bgcolor: 'background.paper',
                  borderRadius: 1
                }}
              >
                k₁[E][S] = (k₋₁ + k₂)[ES]
              </Typography>
            </Paper>

            <Alert severity="warning" sx={{ mt: 3 }}>
              <AlertTitle>Why Not Equilibrium?</AlertTitle>
              Michaelis & Menten (1913) originally assumed rapid equilibrium (k₋₁ >> k₂).
              The steady-state assumption (Briggs & Haldane, 1925) is more general and
              doesn't require this restriction.
            </Alert>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
              Step-by-Step Derivation
            </Typography>

            <Typography paragraph>
              Follow along as we derive the Michaelis-Menten equation from the steady-state condition.
            </Typography>

            {/* Step 1 */}
            <Paper sx={{ p: 2, mb: 2, borderLeft: '4px solid #2196F3' }}>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                <strong>Step 1:</strong> Start with steady-state condition
              </Typography>
              <Typography sx={{ fontFamily: 'monospace', bgcolor: 'background.default', p: 1, borderRadius: 1 }}>
                k₁[E][S] = (k₋₁ + k₂)[ES]
              </Typography>
            </Paper>

            {/* Step 2 */}
            <Paper sx={{ p: 2, mb: 2, borderLeft: '4px solid #4CAF50' }}>
              <Typography variant="subtitle1" color="success.main" gutterBottom>
                <strong>Step 2:</strong> Substitute [E] = [E]ₜₒₜₐₗ - [ES]
              </Typography>
              <Typography sx={{ fontFamily: 'monospace', bgcolor: 'background.default', p: 1, borderRadius: 1 }}>
                k₁([E]ₜₒₜₐₗ - [ES])[S] = (k₋₁ + k₂)[ES]
              </Typography>
            </Paper>

            {/* Step 3 */}
            <Paper sx={{ p: 2, mb: 2, borderLeft: '4px solid #FF9800' }}>
              <Typography variant="subtitle1" color="warning.main" gutterBottom>
                <strong>Step 3:</strong> Expand and rearrange
              </Typography>
              <Typography sx={{ fontFamily: 'monospace', bgcolor: 'background.default', p: 1, borderRadius: 1 }}>
                k₁[E]ₜₒₜₐₗ[S] - k₁[ES][S] = (k₋₁ + k₂)[ES]
              </Typography>
              <Typography sx={{ fontFamily: 'monospace', bgcolor: 'background.default', p: 1, borderRadius: 1, mt: 1 }}>
                k₁[E]ₜₒₜₐₗ[S] = (k₋₁ + k₂)[ES] + k₁[ES][S]
              </Typography>
              <Typography sx={{ fontFamily: 'monospace', bgcolor: 'background.default', p: 1, borderRadius: 1, mt: 1 }}>
                k₁[E]ₜₒₜₐₗ[S] = [ES](k₋₁ + k₂ + k₁[S])
              </Typography>
            </Paper>

            {/* Step 4 */}
            <Paper sx={{ p: 2, mb: 2, borderLeft: '4px solid #9C27B0' }}>
              <Typography variant="subtitle1" color="secondary" gutterBottom>
                <strong>Step 4:</strong> Solve for [ES]
              </Typography>
              <Typography sx={{ fontFamily: 'monospace', bgcolor: 'background.default', p: 1, borderRadius: 1 }}>
                [ES] = k₁[E]ₜₒₜₐₗ[S] / (k₋₁ + k₂ + k₁[S])
              </Typography>
              <Typography sx={{ fontFamily: 'monospace', bgcolor: 'background.default', p: 1, borderRadius: 1, mt: 1 }}>
                [ES] = [E]ₜₒₜₐₗ[S] / ((k₋₁ + k₂)/k₁ + [S])
              </Typography>
            </Paper>

            {/* Step 5 */}
            <Paper sx={{ p: 2, mb: 2, borderLeft: '4px solid #E91E63' }}>
              <Typography variant="subtitle1" sx={{ color: '#E91E63' }} gutterBottom>
                <strong>Step 5:</strong> Define Km = (k₋₁ + k₂)/k₁
              </Typography>
              <Typography sx={{ fontFamily: 'monospace', bgcolor: 'background.default', p: 1, borderRadius: 1 }}>
                [ES] = [E]ₜₒₜₐₗ[S] / (Km + [S])
              </Typography>
            </Paper>

            {/* Step 6 */}
            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), borderLeft: '4px solid #4CAF50' }}>
              <Typography variant="subtitle1" color="success.dark" gutterBottom>
                <strong>Step 6:</strong> Calculate velocity v = k₂[ES]
              </Typography>
              <Typography sx={{ fontFamily: 'monospace', bgcolor: 'background.paper', p: 1, borderRadius: 1 }}>
                v = k₂[ES] = k₂[E]ₜₒₜₐₗ[S] / (Km + [S])
              </Typography>
              <Typography sx={{ mt: 1 }}>
                Define <strong>Vmax = k₂[E]ₜₒₜₐₗ</strong> (maximum velocity when all enzyme is saturated):
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  bgcolor: 'background.paper',
                  p: 2,
                  borderRadius: 1,
                  textAlign: 'center',
                  mt: 1
                }}
              >
                v = Vmax[S] / (Km + [S])
              </Typography>
            </Paper>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
              The Michaelis-Menten Equation
            </Typography>

            <Paper sx={{ p: 3, mb: 3, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 'bold' }}>
                v = V<sub>max</sub>[S] / (K<sub>m</sub> + [S])
              </Typography>
            </Paper>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Parameter Meanings
                    </Typography>

                    <Typography variant="subtitle2" sx={{ mt: 2 }}>
                      V<sub>max</sub> (Maximum Velocity)
                    </Typography>
                    <Typography variant="body2" paragraph>
                      The velocity when all enzyme molecules are bound to substrate (enzyme is saturated).
                      V<sub>max</sub> = k<sub>cat</sub> × [E]<sub>total</sub>
                    </Typography>

                    <Typography variant="subtitle2">
                      K<sub>m</sub> (Michaelis Constant)
                    </Typography>
                    <Typography variant="body2" paragraph>
                      The substrate concentration at which v = V<sub>max</sub>/2.
                      It reflects the affinity of enzyme for substrate.
                    </Typography>

                    <Alert severity="info">
                      <strong>Lower K<sub>m</sub> = Higher affinity</strong>
                    </Alert>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Interactive Michaelis-Menten Curve
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">V<sub>max</sub>: {curveParams.Vmax}</Typography>
                    <Slider
                      value={curveParams.Vmax}
                      onChange={(e, v) => setCurveParams(p => ({ ...p, Vmax: v }))}
                      min={20}
                      max={200}
                      valueLabelDisplay="auto"
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">K<sub>m</sub>: {curveParams.Km}</Typography>
                    <Slider
                      value={curveParams.Km}
                      onChange={(e, v) => setCurveParams(p => ({ ...p, Km: v }))}
                      min={5}
                      max={100}
                      valueLabelDisplay="auto"
                    />
                  </Box>

                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={300}
                    style={{ width: '100%', height: 'auto', border: '1px solid #e0e0e0', borderRadius: 4 }}
                  />
                </Paper>
              </Grid>
            </Grid>

            <Paper sx={{ p: 3, mt: 3, bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <Typography variant="h6" gutterBottom color="warning.dark">
                Limiting Cases
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">
                    When [S] {"<<"} K<sub>m</sub>:
                  </Typography>
                  <Typography sx={{ fontFamily: 'monospace', bgcolor: 'background.paper', p: 1, borderRadius: 1 }}>
                    v ≈ (V<sub>max</sub>/K<sub>m</sub>)[S]
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    First-order kinetics (linear in [S])
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">
                    When [S] {">>"} K<sub>m</sub>:
                  </Typography>
                  <Typography sx={{ fontFamily: 'monospace', bgcolor: 'background.paper', p: 1, borderRadius: 1 }}>
                    v ≈ V<sub>max</sub>
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Zero-order kinetics (independent of [S])
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        );

      case 4:
        return (
          <Box>
            <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
              Practice Problems
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              Test your understanding of the Michaelis-Menten equation with these problems.
            </Alert>

            {/* Problem 1 */}
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  <QuizIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Problem 1: Finding V<sub>max</sub>/2
                </Typography>
                <Typography paragraph>
                  An enzyme has K<sub>m</sub> = 10 μM and V<sub>max</sub> = 100 μmol/min.
                  What is the velocity when [S] = 10 μM?
                </Typography>
                <TextField
                  label="Your answer (μmol/min)"
                  variant="outlined"
                  size="small"
                  value={quizAnswers.q1 || ''}
                  onChange={(e) => setQuizAnswers({ ...quizAnswers, q1: e.target.value })}
                />
                {quizAnswers.q1 === '50' && (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    Correct! When [S] = K<sub>m</sub>, v = V<sub>max</sub>/2 = 50 μmol/min
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Problem 2 */}
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  <QuizIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Problem 2: Calculating Velocity
                </Typography>
                <Typography paragraph>
                  With K<sub>m</sub> = 5 mM and V<sub>max</sub> = 200 μmol/min, calculate v when [S] = 15 mM.
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Hint: v = V<sub>max</sub>[S] / (K<sub>m</sub> + [S])
                </Typography>
                <TextField
                  label="Your answer (μmol/min)"
                  variant="outlined"
                  size="small"
                  value={quizAnswers.q2 || ''}
                  onChange={(e) => setQuizAnswers({ ...quizAnswers, q2: e.target.value })}
                />
                {quizAnswers.q2 === '150' && (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    Correct! v = 200 × 15 / (5 + 15) = 3000/20 = 150 μmol/min
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Paper sx={{ p: 3, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Summary of Lesson 2
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                  <ListItemText primary="Michaelis-Menten equation: v = Vmax[S] / (Km + [S])" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                  <ListItemText primary="Km = (k₋₁ + k₂) / k₁ — reflects substrate affinity" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                  <ListItemText primary="Vmax = kcat × [E]total — maximum catalytic rate" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                  <ListItemText primary="At [S] = Km, velocity = Vmax/2" />
                </ListItem>
              </List>
            </Paper>

            <Button
              variant="contained"
              size="large"
              color="success"
              onClick={onComplete}
              fullWidth
              sx={{ mt: 3 }}
              startIcon={<CheckCircleIcon />}
            >
              Complete Lesson 2
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((step) => (
            <Step key={step.label}>
              <StepLabel>
                <Typography variant="caption">{step.label}</Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      <Paper sx={{ p: 4 }}>
        {renderStepContent()}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0}
            startIcon={<NavigateBeforeIcon />}
          >
            Previous
          </Button>

          <Chip
            label={`Step ${activeStep + 1} of ${STEPS.length}`}
            color="primary"
            variant="outlined"
          />

          {activeStep < STEPS.length - 1 && (
            <Button
              onClick={handleNext}
              variant="contained"
              endIcon={<NavigateNextIcon />}
            >
              Next
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default Lesson2_MichaelisMentenDerivation;
