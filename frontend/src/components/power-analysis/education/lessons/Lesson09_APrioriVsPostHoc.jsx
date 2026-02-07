/**
 * Lesson 9: A Priori vs Post Hoc Power Analysis
 *
 * This critical lesson explains why post hoc power analysis is fundamentally
 * flawed and what to do instead after collecting data.
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
  Alert,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
} from '@mui/material';
import {
  NavigateNext,
  NavigateBefore,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Timeline,
  Block,
  Lightbulb,
} from '@mui/icons-material';
import { alpha as alphaFn } from '@mui/material/styles';

const steps = [
  'A Priori: The Right Way',
  'Post Hoc: The Wrong Way',
  'The Mathematical Problem',
  'What To Do Instead',
  'Sensitivity Analysis',
];

const Lesson09_APrioriVsPostHoc = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [pValue, setPValue] = useState(0.08);

  // Calculate "observed power" (to show it's just a transformation of p)
  const normalCDF = useCallback((x) => {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x) / Math.sqrt(2);
    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
    return 0.5 * (1.0 + sign * y);
  }, []);

  const observedPower = useCallback(() => {
    const z = -Math.abs(normalQuantile(pValue / 2));
    return normalCDF(z - 1.96);
  }, [pValue]);

  const normalQuantile = (p) => {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
               1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
               6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
               -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const pLow = 0.02425, pHigh = 1 - pLow;
    let q, r;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    } else if (p <= pHigh) {
      q = p - 0.5; r = q * q;
      return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    }
  };

  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, activeStep]));
    setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  const renderStep1 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        A Priori Power Analysis: The Right Approach
      </Typography>

      <Alert severity="success" sx={{ mb: 3 }}>
        <Typography variant="body1">
          <strong>A priori</strong> (Latin: "from before") power analysis is conducted
          <em> before</em> data collection to determine required sample size.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ borderTop: '4px solid #4caf50' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#4caf50' }}>
                When to Conduct
              </Typography>

              <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Timeline sx={{ mr: 2, color: '#4caf50' }} />
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    BEFORE collecting any data
                  </Typography>
                </Box>
              </Paper>

              <List dense>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText primary="During study design phase" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText primary="For grant applications" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText primary="Ethics committee submissions" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText primary="Clinical trial registration" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                The A Priori Process
              </Typography>

              <List>
                <ListItem>
                  <ListItemIcon><Chip label="1" size="small" sx={{ bgcolor: '#2196f3', color: 'white' }} /></ListItemIcon>
                  <ListItemText
                    primary="Specify target power"
                    secondary="Usually 80% or 90%"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Chip label="2" size="small" sx={{ bgcolor: '#2196f3', color: 'white' }} /></ListItemIcon>
                  <ListItemText
                    primary="Set significance level"
                    secondary="Usually α = 0.05"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Chip label="3" size="small" sx={{ bgcolor: '#2196f3', color: 'white' }} /></ListItemIcon>
                  <ListItemText
                    primary="Estimate effect size"
                    secondary="From prior research or MCID"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Chip label="4" size="small" sx={{ bgcolor: '#2196f3', color: 'white' }} /></ListItemIcon>
                  <ListItemText
                    primary="Calculate required n"
                    secondary="Using appropriate formula"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Key principle:</strong> A priori power analysis uses an <em>expected</em> or
          <em>hypothesized</em> effect size based on prior knowledge—not the observed effect
          from your own data.
        </Typography>
      </Alert>
    </Box>
  );

  const renderStep2 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        Post Hoc Power Analysis: Why It's Meaningless
      </Typography>

      <Alert severity="error" sx={{ mb: 3 }}>
        <Typography variant="body1">
          <strong>Post hoc</strong> (Latin: "after this") power analysis—calculating power
          using the observed effect size after data collection—is <strong>statistically
          invalid</strong> and provides no useful information.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ borderTop: '4px solid #f44336' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#f44336' }}>
                <Block sx={{ mr: 1, verticalAlign: 'middle' }} />
                The Fundamental Flaw
              </Typography>

              <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'center' }}>
                  Post hoc power is just a monotonic transformation of the p-value
                </Typography>
              </Paper>

              <Typography variant="body1" paragraph>
                It tells you <strong>nothing new</strong>. If p {'<'} 0.05, post hoc power will
                be high. If p {'>'} 0.05, post hoc power will be low. It's circular reasoning.
              </Typography>

              <Typography variant="body2" color="text.secondary">
                "The power of a study that found p = 0.08 was low" is equivalent to saying
                "the p-value was 0.08"—no new information.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Why Researchers Do It (Incorrectly)
              </Typography>

              <List dense>
                <ListItem>
                  <ListItemIcon><ErrorIcon sx={{ color: '#f44336' }} /></ListItemIcon>
                  <ListItemText
                    primary="To explain non-significant results"
                    secondary='"Our study was underpowered"—but this is unknowable'
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><ErrorIcon sx={{ color: '#f44336' }} /></ListItemIcon>
                  <ListItemText
                    primary="Reviewer request"
                    secondary="Uninformed reviewers sometimes ask for it"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><ErrorIcon sx={{ color: '#f44336' }} /></ListItemIcon>
                  <ListItemText
                    primary="To justify sample size retrospectively"
                    secondary="This is not how power analysis works"
                  />
                </ListItem>
              </List>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Many journals and statistical guidelines now explicitly discourage
                  or prohibit post hoc power calculations.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3, bgcolor: 'background.default' }}>
        <Typography variant="h6" gutterBottom>
          Expert Consensus Against Post Hoc Power
        </Typography>
        <Typography variant="body2" paragraph sx={{ fontStyle: 'italic' }}>
          "Post hoc power calculations are fundamentally flawed... The observed power is
          simply a transformation of the P value and adds no new information."
        </Typography>
        <Typography variant="caption">
          — Hoenig & Heisey (2001), The American Statistician
        </Typography>
      </Paper>
    </Box>
  );

  const renderStep3 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        The Mathematical Problem with Post Hoc Power
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          Post hoc power using observed effect size is a <strong>one-to-one function</strong>
          of the p-value. This demonstration shows why it provides no additional information.
        </Typography>
      </Alert>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Interactive Demonstration
        </Typography>

        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              label="Observed p-value"
              type="number"
              value={pValue}
              onChange={(e) => setPValue(Math.max(0.001, Math.min(0.999, parseFloat(e.target.value) || 0.08)))}
              inputProps={{ step: 0.01, min: 0.001, max: 0.999 }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(pValue < 0.05 ? theme.palette.success.main : theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Post Hoc "Power"</Typography>
              <Typography variant="h4" sx={{ color: pValue < 0.05 ? '#4caf50' : '#f44336' }}>
                {(observedPower() * 100).toFixed(1)}%
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              Notice: High p-value → Low power<br/>
              Low p-value → High power<br/>
              <strong>It's completely determined by p!</strong>
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'background.default' }}>
              <TableCell sx={{ fontWeight: 600 }}>p-value</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Post Hoc "Power"</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>What This Tells You</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>0.001</TableCell>
              <TableCell>~99%</TableCell>
              <TableCell>The p-value was 0.001 (nothing new)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>0.01</TableCell>
              <TableCell>~90%</TableCell>
              <TableCell>The p-value was 0.01 (nothing new)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>0.05</TableCell>
              <TableCell>~50%</TableCell>
              <TableCell>The p-value was 0.05 (nothing new)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>0.10</TableCell>
              <TableCell>~35%</TableCell>
              <TableCell>The p-value was 0.10 (nothing new)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>0.50</TableCell>
              <TableCell>~8%</TableCell>
              <TableCell>The p-value was 0.50 (nothing new)</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="error">
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          The Core Problem
        </Typography>
        <Typography variant="body2">
          Post hoc power treats the observed effect as if it were the true effect. But the
          whole reason for hypothesis testing is that we <em>don't know</em> the true effect!
          The observed effect is just one sample from a distribution of possible effects.
        </Typography>
      </Alert>
    </Box>
  );

  const renderStep4 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        What To Do Instead After Data Collection
      </Typography>

      <Alert severity="success" sx={{ mb: 3 }}>
        <Typography variant="body1">
          If you have non-significant results and want to communicate uncertainty,
          there are valid alternatives to post hoc power.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ borderTop: '4px solid #2196f3' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#2196f3' }}>
                1. Confidence Intervals
              </Typography>

              <Typography variant="body1" paragraph>
                Report the confidence interval for your effect size. This shows the range
                of plausible true effects.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 2 }}>
                <Typography variant="body2">
                  <strong>Example:</strong> "The observed effect was d = 0.30 (95% CI: -0.10 to 0.70)"
                </Typography>
              </Paper>

              <Typography variant="body2" color="text.secondary">
                A CI including zero indicates the data are consistent with no effect,
                but also consistent with meaningful effects in either direction.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ borderTop: '4px solid #4caf50' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#4caf50' }}>
                2. Sensitivity Analysis
              </Typography>

              <Typography variant="body1" paragraph>
                Report what effect sizes you <em>could</em> have detected with your sample size.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 2 }}>
                <Typography variant="body2">
                  <strong>Example:</strong> "With n = 50 per group and α = 0.05, we had 80% power
                  to detect effects of d ≥ 0.57"
                </Typography>
              </Paper>

              <Typography variant="body2" color="text.secondary">
                This is informative because it uses the <em>a priori</em> sample size,
                not the observed effect.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ borderTop: '4px solid #ff9800' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#ff9800' }}>
                3. Equivalence Testing
              </Typography>

              <Typography variant="body1" paragraph>
                If you want to conclude "no effect," use equivalence or inferiority testing
                (TOST procedure).
              </Typography>

              <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 2 }}>
                <Typography variant="body2">
                  Define equivalence bounds (e.g., ±0.3 SD) and test whether the effect
                  falls within them.
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ borderTop: '4px solid #9c27b0' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#9c27b0' }}>
                4. Bayes Factors
              </Typography>

              <Typography variant="body1" paragraph>
                Quantify evidence for H₀ vs H₁ directly, without the asymmetry of
                frequentist testing.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 2 }}>
                <Typography variant="body2">
                  BF₀₁ = 5 means the data are 5× more likely under H₀ than H₁
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderStep5 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        Sensitivity Analysis: The Valid Alternative
      </Typography>

      <Alert severity="success" sx={{ mb: 3 }}>
        <Typography variant="body1">
          Sensitivity analysis asks: "Given our sample size, what is the minimum effect size
          we could detect with 80% power?" This is valid and informative.
        </Typography>
      </Alert>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          How to Report Sensitivity Analysis
        </Typography>

        <Typography variant="body1" paragraph>
          <strong>Valid:</strong> "With our sample of n = 40 per group, α = 0.05, we had
          80% power to detect effects of d ≥ 0.63. Effects smaller than this may have
          gone undetected."
        </Typography>

        <Typography variant="body1" paragraph>
          <strong>Invalid:</strong> "Our observed effect was d = 0.30 with p = 0.15,
          giving us 35% post hoc power, indicating the study was underpowered."
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Sensitivity Analysis Table Example
        </Typography>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: (theme) => alphaFn(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
                <TableCell sx={{ fontWeight: 600 }}>Effect Size (d)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Power (n=40/group)</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Interpretation</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>0.20 (Small)</TableCell>
                <TableCell align="center">17%</TableCell>
                <TableCell>Would likely miss</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>0.40</TableCell>
                <TableCell align="center">48%</TableCell>
                <TableCell>Coin flip</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>0.50 (Medium)</TableCell>
                <TableCell align="center">64%</TableCell>
                <TableCell>Marginal detection</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: (theme) => alphaFn(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
                <TableCell>0.63</TableCell>
                <TableCell align="center">80%</TableCell>
                <TableCell>Minimum detectable (target)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>0.80 (Large)</TableCell>
                <TableCell align="center">94%</TableCell>
                <TableCell>Reliable detection</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Alert severity="info">
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          Key Takeaway
        </Typography>
        <Typography variant="body2">
          • <strong>A priori power:</strong> Plan before data collection ✓<br/>
          • <strong>Post hoc power:</strong> Never calculate this ✗<br/>
          • <strong>Sensitivity analysis:</strong> Valid for interpreting completed studies ✓<br/>
          • <strong>Confidence intervals:</strong> Always report these ✓
        </Typography>
      </Alert>
    </Box>
  );

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
          <Timeline sx={{ fontSize: 40, mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Lesson 9: A Priori vs Post Hoc
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              The Right Way vs The Wrong Way
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label, index) => (
          <Step key={label} completed={completedSteps.has(index)}>
            <StepLabel onClick={() => setActiveStep(index)} sx={{ cursor: 'pointer' }}>
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper elevation={2} sx={{ p: 4, mb: 3, minHeight: 500 }}>
        {renderStepContent()}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button variant="outlined" onClick={handleBack} disabled={activeStep === 0} startIcon={<NavigateBefore />}>
          Previous
        </Button>
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
    </Box>
  );
};

export default Lesson09_APrioriVsPostHoc;
