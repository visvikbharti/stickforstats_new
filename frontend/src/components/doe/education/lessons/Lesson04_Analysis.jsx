import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { MathJax } from 'better-react-mathjax';

/**
 * Lesson 4: Analysis & Interpretation
 *
 * Teaches how to analyze DOE results using ANOVA,
 * interpret effect sizes, and validate models
 */

const Lesson04_Analysis = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    'Design Matrix',
    'Calculate Effects',
    'ANOVA Table',
    'Residual Diagnostics'
  ];

  // Example 2² data
  const exampleData = [
    { run: 1, A: -1, B: -1, yield: 45, predicted: 45.5, residual: -0.5 },
    { run: 2, A: +1, B: -1, yield: 58, predicted: 57.5, residual: 0.5 },
    { run: 3, A: -1, B: +1, yield: 52, predicted: 51.5, residual: 0.5 },
    { run: 4, A: +1, B: +1, yield: 70, predicted: 69.5, residual: 0.5 }
  ];

  // Calculate effects
  const effects = useMemo(() => {
    const avgAll = (45 + 58 + 52 + 70) / 4; // 56.25

    // Main effect A
    const avgA_high = (58 + 70) / 2; // 64
    const avgA_low = (45 + 52) / 2; // 48.5
    const effectA = avgA_high - avgA_low; // 15.5

    // Main effect B
    const avgB_high = (52 + 70) / 2; // 61
    const avgB_low = (45 + 58) / 2; // 51.5
    const effectB = avgB_high - avgB_low; // 9.5

    // Interaction AB
    const interactionAB = ((70 - 52) - (58 - 45)) / 2; // (18 - 13) / 2 = 2.5

    return { avgAll, effectA, effectB, interactionAB };
  }, []);

  // ANOVA table data
  const anovaTable = [
    { source: 'Factor A', df: 1, ss: 120.25, ms: 120.25, f: 240.5, pValue: '< 0.001' },
    { source: 'Factor B', df: 1, ss: 45.13, ms: 45.13, f: 90.26, pValue: '< 0.001' },
    { source: 'Interaction AB', df: 1, ss: 3.13, ms: 3.13, f: 6.26, pValue: '0.045' },
    { source: 'Error', df: 4, ss: 2.0, ms: 0.5, f: '—', pValue: '—' },
    { source: 'Total', df: 7, ss: 170.51, ms: '—', f: '—', pValue: '—' }
  ];

  return (
    <Box>
      {/* Introduction */}
      <Paper elevation={2} sx={{ p: 4, mb: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#1976d2', fontWeight: 600 }}>
          Analysis & Interpretation
        </Typography>

        <Typography variant="h6" paragraph sx={{ mt: 2 }}>
          From Design Matrix to Optimal Conditions
        </Typography>

        <Typography paragraph>
          You've run your factorial experiment. You have data from all factor combinations. Now comes
          the critical part: <strong>analysis</strong>. How do you identify which factors matter? How
          large are the effects? Is your model valid?
        </Typography>

        <Typography paragraph>
          This lesson walks through the complete analysis workflow: calculating effects, running ANOVA,
          and checking model assumptions.
        </Typography>
      </Paper>

      {/* Stepper */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel
                onClick={() => setActiveStep(index)}
                sx={{ cursor: 'pointer' }}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Step 1: Design Matrix */}
      {activeStep === 0 && (
        <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
            📋 Step 1: Organize Your Design Matrix
          </Typography>

          <Typography paragraph>
            The design matrix shows all experimental runs with factor levels (coded as -1 and +1)
            and measured responses. This is your raw data.
          </Typography>

          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Run</strong></TableCell>
                  <TableCell align="center"><strong>Factor A (Temp)</strong></TableCell>
                  <TableCell align="center"><strong>Factor B (pH)</strong></TableCell>
                  <TableCell align="center"><strong>Response (Yield)</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {exampleData.map((row) => (
                  <TableRow key={row.run}>
                    <TableCell>{row.run}</TableCell>
                    <TableCell align="center">{row.A > 0 ? '+1 (High)' : '-1 (Low)'}</TableCell>
                    <TableCell align="center">{row.B > 0 ? '+1 (High)' : '-1 (Low)'}</TableCell>
                    <TableCell align="center">{row.yield}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Alert severity="info">
            <Typography variant="body2">
              <strong>Coded Units (-1, +1):</strong> Using coded units simplifies calculations and
              makes effect estimates directly comparable. -1 = low level, +1 = high level for each factor.
            </Typography>
          </Alert>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button variant="contained" onClick={() => setActiveStep(1)}>
              Next: Calculate Effects
            </Button>
          </Box>
        </Paper>
      )}

      {/* Step 2: Calculate Effects */}
      {activeStep === 1 && (
        <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
            🧮 Step 2: Calculate Main Effects & Interactions
          </Typography>

          <MathJax>
            <Typography paragraph>
              For a 2-level factorial design, effects are calculated by comparing averages at high
              and low levels.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Main Effect of Factor A
            </Typography>

            <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1, mb: 3 }}>
              <Typography paragraph>
                {"\\[ \\text{Effect}_A = \\bar{Y}_{A=+1} - \\bar{Y}_{A=-1} \\]"}
              </Typography>

              <Typography variant="body2">
                Average at A=+1: (58 + 70) / 2 = <strong>64</strong>
                <br />
                Average at A=-1: (45 + 52) / 2 = <strong>48.5</strong>
                <br />
                <strong>Effect of A: 64 - 48.5 = {effects.effectA}</strong>
              </Typography>
            </Box>

            <Typography variant="h6" gutterBottom>
              Main Effect of Factor B
            </Typography>

            <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1, mb: 3 }}>
              <Typography paragraph>
                {"\\[ \\text{Effect}_B = \\bar{Y}_{B=+1} - \\bar{Y}_{B=-1} \\]"}
              </Typography>

              <Typography variant="body2">
                Average at B=+1: (52 + 70) / 2 = <strong>61</strong>
                <br />
                Average at B=-1: (45 + 58) / 2 = <strong>51.5</strong>
                <br />
                <strong>Effect of B: 61 - 51.5 = {effects.effectB}</strong>
              </Typography>
            </Box>

            <Typography variant="h6" gutterBottom>
              Interaction Effect AB
            </Typography>

            <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 1, mb: 3 }}>
              <Typography paragraph>
                {"\\[ \\text{AB} = \\frac{[(Y_{++} - Y_{+-}) - (Y_{-+} - Y_{--})]}{2} \\]"}
              </Typography>

              <Typography variant="body2">
                (Y₊₊ - Y₊₋): (70 - 58) = <strong>12</strong>
                <br />
                (Y₋₊ - Y₋₋): (52 - 45) = <strong>7</strong>
                <br />
                <strong>Interaction: (12 - 7) / 2 = {effects.interactionAB}</strong>
              </Typography>
            </Box>

            {/* Effect Summary */}
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Main Effect A
                    </Typography>
                    <Typography variant="h4" color="primary">
                      +{effects.effectA}
                    </Typography>
                    <Typography variant="body2">
                      Largest effect — Temperature is most important!
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Main Effect B
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      +{effects.effectB}
                    </Typography>
                    <Typography variant="body2">
                      Moderate effect — pH matters but less than temp
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Interaction AB
                    </Typography>
                    <Typography variant="h4" color="warning.main">
                      +{effects.interactionAB}
                    </Typography>
                    <Typography variant="body2">
                      Small interaction — factors mostly independent
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </MathJax>

          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="outlined" onClick={() => setActiveStep(0)}>
              Back
            </Button>
            <Button variant="contained" onClick={() => setActiveStep(2)}>
              Next: ANOVA Table
            </Button>
          </Box>
        </Paper>
      )}

      {/* Step 3: ANOVA Table */}
      {activeStep === 2 && (
        <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
            📊 Step 3: Analysis of Variance (ANOVA)
          </Typography>

          <MathJax>
            <Typography paragraph>
              ANOVA partitions total variation into components: how much is explained by each factor,
              interactions, and random error? It also tests statistical significance.
            </Typography>

            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Source</strong></TableCell>
                    <TableCell align="center"><strong>DF</strong></TableCell>
                    <TableCell align="center"><strong>Sum of Squares</strong></TableCell>
                    <TableCell align="center"><strong>Mean Square</strong></TableCell>
                    <TableCell align="center"><strong>F-statistic</strong></TableCell>
                    <TableCell align="center"><strong>p-value</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {anovaTable.map((row) => (
                    <TableRow
                      key={row.source}
                      sx={{ bgcolor: row.source === 'Total' ? '#f5f5f5' : 'white' }}
                    >
                      <TableCell><strong>{row.source}</strong></TableCell>
                      <TableCell align="center">{row.df}</TableCell>
                      <TableCell align="center">{row.ss}</TableCell>
                      <TableCell align="center">{row.ms}</TableCell>
                      <TableCell align="center">{row.f}</TableCell>
                      <TableCell align="center">{row.pValue}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Interpretation:</strong>
                <br />
                • <strong>Factor A:</strong> F = 240.5, p &lt; 0.001 → <em>Highly significant</em>
                <br />
                • <strong>Factor B:</strong> F = 90.26, p &lt; 0.001 → <em>Highly significant</em>
                <br />
                • <strong>Interaction AB:</strong> F = 6.26, p = 0.045 → <em>Marginally significant</em>
                <br /><br />
                Conclusion: Both factors are important. Small but detectable interaction.
              </Typography>
            </Alert>

            <Typography variant="h6" gutterBottom>
              Understanding the ANOVA Table
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      F-statistic
                    </Typography>
                    <Typography variant="body2">
                      {"\\[ F = \\frac{\\text{MS}_\\text{factor}}{\\text{MS}_\\text{error}} \\]"}
                      <br /><br />
                      Ratio of explained variation to unexplained variation. Large F = effect is real.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      p-value
                    </Typography>
                    <Typography variant="body2">
                      Probability that observed effect is due to random chance.
                      <br /><br />
                      p &lt; 0.05: Effect is statistically significant (reject H₀: no effect)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </MathJax>

          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="outlined" onClick={() => setActiveStep(1)}>
              Back
            </Button>
            <Button variant="contained" onClick={() => setActiveStep(3)}>
              Next: Residuals
            </Button>
          </Box>
        </Paper>
      )}

      {/* Step 4: Residual Diagnostics */}
      {activeStep === 3 && (
        <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
            🔬 Step 4: Residual Diagnostics (Model Validation)
          </Typography>

          <Typography paragraph>
            Before trusting your model, check the <strong>residuals</strong> (observed - predicted).
            Residuals should be random, normally distributed, and show constant variance.
          </Typography>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    ✓ Good Residual Pattern
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • Random scatter around zero
                    <br />
                    • No obvious patterns or trends
                    <br />
                    • Roughly constant variance
                    <br />
                    • Approximately normal distribution
                  </Typography>
                  <Chip label="Model is Valid" color="success" />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', bgcolor: '#ffebee' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="error">
                    ✗ Bad Residual Patterns
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • Curved or U-shaped pattern → missing curvature term
                    <br />
                    • Funnel shape → non-constant variance
                    <br />
                    • Outliers → measurement errors or special causes
                    <br />
                    • Autocorrelation → time-order effects
                  </Typography>
                  <Chip label="Model Needs Work" color="error" />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>
            Example: Residual vs Fitted Plot
          </Typography>

          <Box sx={{ mb: 3 }}>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="predicted"
                  name="Fitted Value"
                  domain={[40, 75]}
                  label={{ value: 'Fitted Value', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  type="number"
                  dataKey="residual"
                  name="Residual"
                  domain={[-2, 2]}
                  label={{ value: 'Residual', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={exampleData} fill="#1976d2" />
              </ScatterChart>
            </ResponsiveContainer>
          </Box>

          <Alert severity="success">
            <Typography variant="body2">
              <strong>This Example: Good Pattern!</strong> Residuals are small (±0.5), randomly
              scattered around zero, with no obvious trend. The model fits well.
            </Typography>
          </Alert>

          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="outlined" onClick={() => setActiveStep(2)}>
              Back
            </Button>
          </Box>
        </Paper>
      )}

      {/* Summary and Completion */}
      <Paper elevation={3} sx={{ p: 4, mt: 4, bgcolor: '#e8f5e9' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#388e3c' }}>
          ✅ Key Takeaways
        </Typography>

        <Box sx={{ pl: 2 }}>
          <Typography paragraph>
            • <strong>Design matrix:</strong> Organize runs with coded factors (-1, +1) and responses
          </Typography>
          <Typography paragraph>
            • <strong>Calculate effects:</strong> Compare averages at high vs low levels
          </Typography>
          <Typography paragraph>
            • <strong>ANOVA:</strong> Test statistical significance using F-tests and p-values
          </Typography>
          <Typography paragraph>
            • <strong>Residual diagnostics:</strong> Validate model assumptions before trusting predictions
          </Typography>
          <Typography paragraph>
            • <strong>p &lt; 0.05:</strong> Effect is statistically significant (unlikely due to chance)
          </Typography>
          <Typography paragraph>
            • <strong>Good residuals:</strong> Random, normal, constant variance → model is valid
          </Typography>
        </Box>

        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Congratulations!</strong> You've completed the core DOE curriculum. You now
            understand factorial designs, design types, interactions, and analysis. You're equipped
            to design, execute, and analyze experiments systematically!
          </Typography>
        </Alert>

        {onComplete && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={onComplete}
              startIcon={<CheckCircleIcon />}
            >
              Mark Lesson Complete
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default Lesson04_Analysis;
