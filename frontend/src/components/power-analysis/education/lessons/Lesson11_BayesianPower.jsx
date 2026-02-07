/**
 * Lesson 11: Bayesian Power Analysis
 *
 * This advanced lesson covers Bayesian alternatives to frequentist power analysis:
 * Bayes Factor Design Analysis, Assurance, and precision-based planning.
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
} from '@mui/material';
import {
  NavigateNext,
  NavigateBefore,
  CheckCircle,
  ExpandMore,
  AutoGraph,
  Psychology,
  Compare,
  Functions,
  Warning,
} from '@mui/icons-material';
import { useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';

const steps = [
  'Why Bayesian?',
  'Bayes Factors',
  'Design Analysis',
  'Assurance (Bayesian Power)',
  'Precision-Based Planning',
];

const Lesson11_BayesianPower = ({ onComplete }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [priorWidth, setPriorWidth] = useState(0.707);
  const [sampleSize, setSampleSize] = useState(50);

  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, activeStep]));
    setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  const renderStep1 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: theme.palette.error.dark, fontWeight: 600 }}>
        Why Consider Bayesian Approaches?
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          Bayesian methods address fundamental limitations of frequentist power analysis
          and provide more intuitive measures of evidence.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ borderTop: `4px solid ${theme.palette.warning.main}` }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.warning.main }}>
                Frequentist Limitations
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><Warning sx={{ color: theme.palette.warning.main }} /></ListItemIcon>
                  <ListItemText
                    primary="Can't quantify evidence FOR H₀"
                    secondary="Only reject or fail to reject"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Warning sx={{ color: theme.palette.warning.main }} /></ListItemIcon>
                  <ListItemText
                    primary="Requires point effect size"
                    secondary="Uncertainty in effect ignored"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Warning sx={{ color: theme.palette.warning.main }} /></ListItemIcon>
                  <ListItemText
                    primary="Power depends on true unknown effect"
                    secondary="Which we don't know!"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Warning sx={{ color: theme.palette.warning.main }} /></ListItemIcon>
                  <ListItemText
                    primary="Binary decision framework"
                    secondary="p < 0.05 vs p ≥ 0.05"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ borderTop: `4px solid ${theme.palette.success.main}` }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.success.main }}>
                Bayesian Advantages
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: theme.palette.success.main }} /></ListItemIcon>
                  <ListItemText
                    primary="Evidence for either hypothesis"
                    secondary="BF₀₁ or BF₁₀"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: theme.palette.success.main }} /></ListItemIcon>
                  <ListItemText
                    primary="Incorporates prior uncertainty"
                    secondary="Distribution over effect sizes"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: theme.palette.success.main }} /></ListItemIcon>
                  <ListItemText
                    primary="Assurance integrates over uncertainty"
                    secondary="More realistic planning"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: theme.palette.success.main }} /></ListItemIcon>
                  <ListItemText
                    primary="Continuous evidence scale"
                    secondary="Strength of evidence quantified"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          When to Use Bayesian Design Analysis
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.success.light, 0.2) }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Consider Bayesian When:
              </Typography>
              <Typography variant="body2">
                • You want to conclude in favor of H₀<br/>
                • Effect size uncertainty is high<br/>
                • Sequential/adaptive designs planned<br/>
                • Prior information is available<br/>
                • Reviewers/field accept Bayesian methods
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.light, 0.2) }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Stick with Frequentist When:
              </Typography>
              <Typography variant="body2">
                • Regulatory submission (FDA, EMA)<br/>
                • Journal requires traditional analysis<br/>
                • Effect size well-established<br/>
                • Simple confirmatory study<br/>
                • Team unfamiliar with Bayesian
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );

  const renderStep2 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: theme.palette.error.dark, fontWeight: 600 }}>
        Bayes Factors: Quantifying Evidence
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          The Bayes Factor (BF) is the ratio of how well the data support one hypothesis
          versus another. It provides a continuous measure of evidence.
        </Typography>
      </Alert>

      <Paper sx={{ p: 3, mb: 3, bgcolor: alpha(theme.palette.secondary.light, 0.2) }}>
        <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
          The Bayes Factor
        </Typography>
        <Typography sx={{ fontFamily: 'serif', fontSize: '1.3rem', textAlign: 'center', mb: 2 }}>
          BF₁₀ = P(Data | H₁) / P(Data | H₀)
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" sx={{ textAlign: 'center' }}>
          BF₁₀ = 10 means data are 10× more likely under H₁ than H₀
        </Typography>
      </Paper>

      <Typography variant="h6" gutterBottom>
        Interpretation Guidelines
      </Typography>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: theme.palette.grey[isDarkMode ? 800 : 100] }}>
              <TableCell sx={{ fontWeight: 600 }}>BF₁₀</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Evidence for H₁</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>BF₀₁</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Evidence for H₀</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>{'>'} 100</TableCell>
              <TableCell>Extreme</TableCell>
              <TableCell>{'<'} 0.01</TableCell>
              <TableCell>-</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>30 - 100</TableCell>
              <TableCell>Very Strong</TableCell>
              <TableCell>0.01 - 0.033</TableCell>
              <TableCell>-</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>10 - 30</TableCell>
              <TableCell>Strong</TableCell>
              <TableCell>0.033 - 0.1</TableCell>
              <TableCell>-</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.light, 0.2) }}>
              <TableCell>3 - 10</TableCell>
              <TableCell>Moderate</TableCell>
              <TableCell>0.1 - 0.33</TableCell>
              <TableCell>-</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: alpha(theme.palette.warning.light, 0.2) }}>
              <TableCell>1 - 3</TableCell>
              <TableCell>Anecdotal</TableCell>
              <TableCell>0.33 - 1</TableCell>
              <TableCell>Anecdotal</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
              <TableCell>3 - 10</TableCell>
              <TableCell>Moderate for H₀</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
              <TableCell>{'>'} 10</TableCell>
              <TableCell>Strong for H₀</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="success">
        <Typography variant="body2">
          <strong>Key advantage:</strong> Unlike p-values, Bayes Factors can provide evidence
          <em> for</em> the null hypothesis (BF₀₁ {'>'} 3), not just failure to reject it.
        </Typography>
      </Alert>
    </Box>
  );

  const renderStep3 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: theme.palette.error.dark, fontWeight: 600 }}>
        Bayes Factor Design Analysis (BFDA)
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          BFDA asks: "How many observations do I need to achieve a desired level of
          evidence (e.g., BF {'>'} 10) with high probability?"
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.secondary.main }}>
                The BFDA Framework
              </Typography>

              <Typography variant="body1" paragraph>
                Instead of controlling Type I/II error rates, we design for:
              </Typography>

              <List dense>
                <ListItem>
                  <ListItemIcon><Chip label="1" size="small" sx={{ bgcolor: theme.palette.secondary.main, color: 'white' }} /></ListItemIcon>
                  <ListItemText
                    primary="Target evidence threshold"
                    secondary="e.g., BF₁₀ > 10 (strong evidence)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Chip label="2" size="small" sx={{ bgcolor: theme.palette.secondary.main, color: 'white' }} /></ListItemIcon>
                  <ListItemText
                    primary="Probability of achieving it"
                    secondary="e.g., 80% chance of BF > 10"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Chip label="3" size="small" sx={{ bgcolor: theme.palette.secondary.main, color: 'white' }} /></ListItemIcon>
                  <ListItemText
                    primary="Prior distribution on effect"
                    secondary="Reflects prior knowledge/uncertainty"
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
                The JZS Prior
              </Typography>

              <Paper sx={{ p: 2, bgcolor: theme.palette.grey[isDarkMode ? 800 : 100], mb: 2 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1rem', textAlign: 'center' }}>
                  δ ~ Cauchy(0, r)
                </Typography>
                <Typography variant="body2" sx={{ textAlign: 'center', mt: 1 }}>
                  r = √2/2 ≈ 0.707 (default "medium" prior)
                </Typography>
              </Paper>

              <Typography variant="body2" paragraph>
                The JZS (Jeffreys-Zellner-Siow) prior is the default in JASP and BayesFactor R package.
              </Typography>

              <Typography variant="body2">
                <strong>Scale parameter r:</strong><br/>
                • r = 0.5: narrow (small effects expected)<br/>
                • r = 0.707: medium (default)<br/>
                • r = 1.0: wide (large effects possible)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Sample Size for BFDA
        </Typography>

        <Typography variant="body1" paragraph>
          Approximate sample sizes for 80% probability of BF₁₀ {'>'} 10:
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: theme.palette.grey[isDarkMode ? 800 : 100] }}>
                <TableCell sx={{ fontWeight: 600 }}>True Effect (d)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>BFDA n/group</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Frequentist n/group (80% power)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>0.2 (Small)</TableCell>
                <TableCell align="center">~550</TableCell>
                <TableCell align="center">394</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>0.5 (Medium)</TableCell>
                <TableCell align="center">~85</TableCell>
                <TableCell align="center">64</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>0.8 (Large)</TableCell>
                <TableCell align="center">~35</TableCell>
                <TableCell align="center">26</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            BFDA typically requires larger samples than frequentist analysis because achieving
            strong evidence (BF {'>'} 10) is more demanding than p {'<'} 0.05.
          </Typography>
        </Alert>
      </Paper>
    </Box>
  );

  const renderStep4 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: theme.palette.error.dark, fontWeight: 600 }}>
        Assurance: Bayesian "Power"
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          <strong>Assurance</strong> is the Bayesian analog of power that accounts for
          uncertainty in the true effect size by averaging over a prior distribution.
        </Typography>
      </Alert>

      <Paper sx={{ p: 3, mb: 3, bgcolor: alpha(theme.palette.success.light, 0.2) }}>
        <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
          The Assurance Formula
        </Typography>
        <Typography sx={{ fontFamily: 'serif', fontSize: '1.2rem', textAlign: 'center', mb: 2 }}>
          Assurance = ∫ Power(θ) × π(θ) dθ
        </Typography>
        <Typography variant="body2" sx={{ textAlign: 'center' }}>
          Average power weighted by prior probability of each effect size θ
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.info.main }}>
                Why Assurance?
              </Typography>

              <Typography variant="body1" paragraph>
                Traditional power assumes a <em>point</em> effect size (e.g., d = 0.5 exactly).
                But we're never certain about the true effect.
              </Typography>

              <Typography variant="body1" paragraph>
                Assurance integrates over <em>all</em> plausible effect sizes, weighted by
                how likely we think each is.
              </Typography>

              <Alert severity="success">
                <Typography variant="body2">
                  <strong>Result:</strong> A more realistic and honest probability of success.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assurance vs Power
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Aspect</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Power</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Assurance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Effect size</TableCell>
                      <TableCell>Point value</TableCell>
                      <TableCell>Distribution</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Uncertainty</TableCell>
                      <TableCell>Ignored</TableCell>
                      <TableCell>Incorporated</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Interpretation</TableCell>
                      <TableCell>Conditional</TableCell>
                      <TableCell>Unconditional</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Typical value</TableCell>
                      <TableCell>80%</TableCell>
                      <TableCell>Usually lower</TableCell>
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
          Example: Power vs Assurance
        </Typography>

        <Typography variant="body1" paragraph>
          Study planning for d = 0.5 with n = 64 per group:
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.light, 0.2) }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Frequentist Power
              </Typography>
              <Typography variant="body2">
                Power = 80% <em>if</em> true d = 0.5 exactly<br/>
                (Ignores uncertainty in d estimate)
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.warning.light, 0.2) }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Assurance (prior: d ~ N(0.5, 0.15²))
              </Typography>
              <Typography variant="body2">
                Assurance ≈ 65%<br/>
                (Accounts for effect size uncertainty)
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            Assurance is often lower than power because it accounts for the possibility
            that the true effect is smaller than expected.
          </Typography>
        </Alert>
      </Paper>
    </Box>
  );

  const renderStep5 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: theme.palette.error.dark, fontWeight: 600 }}>
        Precision-Based Planning
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          Instead of planning for hypothesis testing, plan for <strong>estimation precision</strong>:
          what sample size gives you a sufficiently narrow confidence/credible interval?
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ borderTop: `4px solid ${theme.palette.info.main}` }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.info.main }}>
                The Precision Approach
              </Typography>

              <Typography variant="body1" paragraph>
                Rather than asking "Can I detect an effect?", ask:
              </Typography>

              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.info.light, 0.2), mb: 2 }}>
                <Typography variant="body1" sx={{ fontStyle: 'italic', textAlign: 'center' }}>
                  "How precisely can I estimate the effect?"
                </Typography>
              </Paper>

              <Typography variant="body2">
                Goal: Achieve a desired margin of error (half-width of confidence interval).
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sample Size for Precision
              </Typography>

              <Paper sx={{ p: 2, bgcolor: theme.palette.grey[isDarkMode ? 800 : 100], mb: 2 }}>
                <Typography sx={{ fontFamily: 'serif', fontSize: '1rem', textAlign: 'center' }}>
                  n = (z<sub>α/2</sub> × σ / MOE)²
                </Typography>
              </Paper>

              <Typography variant="body2" paragraph>
                <strong>MOE</strong> = Margin of Error (desired half-width)<br/>
                <strong>σ</strong> = Expected standard deviation
              </Typography>

              <Typography variant="body2">
                <strong>Example:</strong> To estimate mean with MOE = 0.5 points (σ = 2):<br/>
                n = (1.96 × 2 / 0.5)² = 62 subjects
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          When to Use Precision-Based Planning
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.success.light, 0.2) }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                Good For:
              </Typography>
              <Typography variant="body2">
                • Descriptive studies<br/>
                • Estimation-focused research<br/>
                • When effect direction is known<br/>
                • Parameter estimation
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.light, 0.2) }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: theme.palette.info.main }}>
                Advantages:
              </Typography>
              <Typography variant="body2">
                • No assumed effect size needed<br/>
                • Direct link to practical utility<br/>
                • Encourages effect estimation<br/>
                • Avoids NHST limitations
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.warning.light, 0.2) }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: theme.palette.warning.main }}>
                Limitations:
              </Typography>
              <Typography variant="body2">
                • Requires σ estimate<br/>
                • Doesn't address hypothesis testing<br/>
                • May need very large n for high precision<br/>
                • Less familiar to reviewers
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      <Alert severity="success" sx={{ mt: 3 }}>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          Summary: Bayesian Alternatives
        </Typography>
        <Typography variant="body2">
          • <strong>Bayes Factor Design Analysis:</strong> Plan for evidence strength<br/>
          • <strong>Assurance:</strong> Bayesian "power" accounting for effect uncertainty<br/>
          • <strong>Precision-Based:</strong> Plan for estimation accuracy<br/><br/>
          These methods complement (not replace) frequentist power analysis and may be
          more appropriate for certain research contexts.
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
          p: 3, mb: 4,
          background: 'linear-gradient(135deg, #d32f2f 0%, #f44336 50%, #ff5722 100%)',
          color: 'white', borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AutoGraph sx={{ fontSize: 40, mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Lesson 11: Bayesian Power Analysis
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              Bayes Factors, Assurance & Precision Planning
            </Typography>
          </Box>
        </Box>
        <Chip label="Advanced" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
      </Paper>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label, index) => (
          <Step key={label} completed={completedSteps.has(index)}>
            <StepLabel onClick={() => setActiveStep(index)} sx={{ cursor: 'pointer' }}>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper elevation={2} sx={{ p: 4, mb: 3, minHeight: 500 }}>
        {renderStepContent()}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button variant="outlined" onClick={handleBack} disabled={activeStep === 0} startIcon={<NavigateBefore />}>Previous</Button>
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

      {activeStep === steps.length - 1 && completedSteps.size === steps.length - 1 && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            🎉 Congratulations! You've Completed the Power Analysis Course!
          </Typography>
          <Typography variant="body2">
            You now have a comprehensive understanding of statistical power analysis, from
            fundamental concepts through advanced Bayesian methods. Key takeaways:<br/><br/>
            • Always conduct power analysis <em>before</em> data collection<br/>
            • Use conservative effect size estimates<br/>
            • Report sensitivity analyses alongside point estimates<br/>
            • Consider Bayesian alternatives when appropriate<br/>
            • Never calculate post hoc power<br/><br/>
            <strong>You're now equipped to design well-powered studies!</strong>
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default Lesson11_BayesianPower;
