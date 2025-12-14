/**
 * Lesson 8: Assumptions and Their Violations
 *
 * This lesson covers the assumptions underlying power analysis, what happens
 * when they're violated, and how to handle common violations.
 */

import React, { useState } from 'react';
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
  Warning,
  Error as ErrorIcon,
  Info,
  Security,
  BugReport,
  Build,
} from '@mui/icons-material';

const steps = [
  'Core Assumptions',
  'Normality Violations',
  'Variance Heterogeneity',
  'Independence Violations',
  'Effect Size Uncertainty',
];

const Lesson08_Assumptions = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());

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
        Core Assumptions of Power Analysis
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Power analysis relies on several assumptions. Understanding these helps you
        interpret results appropriately and plan for potential violations.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#2196f3' }}>
                Statistical Assumptions
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText
                    primary="Normality"
                    secondary="Data follows normal distribution (or CLT applies)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText
                    primary="Homogeneity of Variance"
                    secondary="Equal variances across groups"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText
                    primary="Independence"
                    secondary="Observations are independent of each other"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText
                    primary="Random Sampling"
                    secondary="Sample is representative of population"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#ff9800' }}>
                Planning Assumptions
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><Warning sx={{ color: '#ff9800' }} /></ListItemIcon>
                  <ListItemText
                    primary="Effect Size Accuracy"
                    secondary="Assumed effect size reflects true population value"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Warning sx={{ color: '#ff9800' }} /></ListItemIcon>
                  <ListItemText
                    primary="Variance Estimate"
                    secondary="σ² is correctly specified"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Warning sx={{ color: '#ff9800' }} /></ListItemIcon>
                  <ListItemText
                    primary="No Attrition"
                    secondary="All enrolled subjects complete the study"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Warning sx={{ color: '#ff9800' }} /></ListItemIcon>
                  <ListItemText
                    primary="Correct Test Selection"
                    secondary="Planned analysis matches actual analysis"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3, bgcolor: '#fff3e0' }}>
        <Typography variant="h6" gutterBottom>
          Severity of Violations
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Assumption</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Severity</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Impact</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Independence</TableCell>
                <TableCell><Chip label="Critical" color="error" size="small" /></TableCell>
                <TableCell>Inflated Type I error, invalid p-values</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Variance Homogeneity</TableCell>
                <TableCell><Chip label="Moderate" color="warning" size="small" /></TableCell>
                <TableCell>Affects Type I error with unequal n</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Normality</TableCell>
                <TableCell><Chip label="Usually Mild" color="success" size="small" /></TableCell>
                <TableCell>Robust with n {'>'} 30 (CLT)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Effect Size Estimate</TableCell>
                <TableCell><Chip label="Moderate" color="warning" size="small" /></TableCell>
                <TableCell>Under/overpowered studies</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );

  const renderStep2 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        Normality Violations
      </Typography>

      <Alert severity="success" sx={{ mb: 3 }}>
        <Typography variant="body1">
          <strong>Good news:</strong> The t-test and ANOVA are remarkably robust to normality violations,
          especially with larger samples due to the Central Limit Theorem.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                When Normality Matters Less
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText primary="Sample size ≥ 30 per group (CLT)" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText primary="Symmetric distributions (even if not normal)" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText primary="Equal group sizes" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText primary="Two-tailed tests (more robust)" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#f44336' }}>
                When Normality Matters More
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><ErrorIcon sx={{ color: '#f44336' }} /></ListItemIcon>
                  <ListItemText primary="Small samples (n < 15)" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><ErrorIcon sx={{ color: '#f44336' }} /></ListItemIcon>
                  <ListItemText primary="Heavily skewed distributions" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><ErrorIcon sx={{ color: '#f44336' }} /></ListItemIcon>
                  <ListItemText primary="Heavy-tailed (high kurtosis) data" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><ErrorIcon sx={{ color: '#f44336' }} /></ListItemIcon>
                  <ListItemText primary="One-tailed tests at extreme α levels" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Solutions for Non-Normal Data
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Data Transformation
              </Typography>
              <Typography variant="body2">
                Log, square root, or Box-Cox transformations can normalize skewed data.
                Recalculate effect size on transformed scale.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: '#e8f5e9' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Non-Parametric Tests
              </Typography>
              <Typography variant="body2">
                Mann-Whitney, Wilcoxon, Kruskal-Wallis. Remember: need ~5% more subjects
                (ARE = 3/π).
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Bootstrap Methods
              </Typography>
              <Typography variant="body2">
                Resampling-based inference doesn't assume normality. Power via simulation.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );

  const renderStep3 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        Variance Heterogeneity (Heteroscedasticity)
      </Typography>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="body1">
          Unequal variances affect Type I error rates, especially with unequal sample sizes.
          The combination of unequal n and unequal variance is particularly problematic.
        </Typography>
      </Alert>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Impact on Type I Error
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Scenario</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actual α (nominal 0.05)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Equal n, equal σ²</TableCell>
                <TableCell>≈ 0.05 (correct)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Equal n, unequal σ²</TableCell>
                <TableCell>≈ 0.05 (robust)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Larger n in group with larger σ²</TableCell>
                <TableCell>{'<'} 0.05 (conservative)</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: '#ffebee' }}>
                <TableCell>Larger n in group with smaller σ²</TableCell>
                <TableCell>{'>'} 0.05 (liberal/inflated)</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#4caf50' }}>
                Solutions
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><Build sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText
                    primary="Welch's t-test"
                    secondary="Adjusts df for unequal variances"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Build sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText
                    primary="Welch's ANOVA"
                    secondary="Or Brown-Forsythe for multiple groups"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Build sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText
                    primary="Equal sample sizes"
                    secondary="Makes test robust to variance inequality"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Build sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText
                    primary="Variance-stabilizing transformations"
                    secondary="Log, sqrt for positive skewed data"
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
                Power Implications
              </Typography>
              <Typography variant="body1" paragraph>
                Standard power calculations assume equal variances. When variances differ:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="• Use the larger variance for conservative estimates"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="• Or calculate separate d for each comparison"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="• Consider simulation-based power analysis"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderStep4 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        Independence Violations: The Most Serious Problem
      </Typography>

      <Alert severity="error" sx={{ mb: 3 }}>
        <Typography variant="body1">
          <strong>Critical:</strong> Independence violations are the most serious assumption violation.
          They can cause dramatic inflation of Type I error rates and render standard power
          calculations meaningless.
        </Typography>
      </Alert>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Common Sources of Non-Independence
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, bgcolor: '#ffebee' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Clustering
              </Typography>
              <Typography variant="body2">
                Students within classrooms, patients within hospitals, cells within animals
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Repeated Measures
              </Typography>
              <Typography variant="body2">
                Multiple measurements on same subject over time
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Spatial/Temporal
              </Typography>
              <Typography variant="body2">
                Geographic proximity, time series data
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, bgcolor: '#e8f5e9' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Family/Genetic
              </Typography>
              <Typography variant="body2">
                Siblings, twins, related individuals
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      <Card elevation={3} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            The Design Effect
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
            <Typography sx={{ fontFamily: 'serif', fontSize: '1.2rem', textAlign: 'center', mb: 1 }}>
              Design Effect (DEFF) = 1 + (m - 1)ρ
            </Typography>
            <Typography sx={{ fontFamily: 'serif', fontSize: '1rem', textAlign: 'center' }}>
              n<sub>effective</sub> = n / DEFF
            </Typography>
          </Paper>

          <Typography variant="body1" paragraph>
            <strong>m</strong> = average cluster size<br/>
            <strong>ρ</strong> = intraclass correlation (ICC)
          </Typography>

          <Alert severity="info">
            <Typography variant="body2">
              <strong>Example:</strong> With 20 students per classroom and ICC = 0.15:<br/>
              DEFF = 1 + (20-1)(0.15) = 3.85<br/>
              You need ~4× as many students as naive calculation suggests!
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#4caf50' }}>
          Solutions for Clustered Data
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon><Build sx={{ color: '#4caf50' }} /></ListItemIcon>
            <ListItemText
              primary="Mixed Effects Models"
              secondary="Account for clustering through random effects"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><Build sx={{ color: '#4caf50' }} /></ListItemIcon>
            <ListItemText
              primary="GEE (Generalized Estimating Equations)"
              secondary="Robust standard errors for clustered data"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><Build sx={{ color: '#4caf50' }} /></ListItemIcon>
            <ListItemText
              primary="Cluster-Level Analysis"
              secondary="Analyze cluster means (loses power but maintains validity)"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><Build sx={{ color: '#4caf50' }} /></ListItemIcon>
            <ListItemText
              primary="Specialized Power Software"
              secondary="Use tools that account for clustering (e.g., PowerUp!, PASS)"
            />
          </ListItem>
        </List>
      </Paper>
    </Box>
  );

  const renderStep5 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        Effect Size Uncertainty: The Winner's Curse
      </Typography>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="body1">
          Effect sizes from prior literature are often <strong>overestimated</strong> due to
          publication bias and small sample sizes. Planning based on inflated estimates leads
          to underpowered studies.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#ff9800' }}>
                Sources of Effect Size Inflation
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><BugReport sx={{ color: '#ff9800' }} /></ListItemIcon>
                  <ListItemText
                    primary="Publication Bias"
                    secondary="Only significant results get published"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><BugReport sx={{ color: '#ff9800' }} /></ListItemIcon>
                  <ListItemText
                    primary="Small Sample Bias"
                    secondary="Significant small studies have inflated effects"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><BugReport sx={{ color: '#ff9800' }} /></ListItemIcon>
                  <ListItemText
                    primary="Questionable Practices"
                    secondary="p-hacking, selective reporting"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><BugReport sx={{ color: '#ff9800' }} /></ListItemIcon>
                  <ListItemText
                    primary="Regression to Mean"
                    secondary="Follow-up studies typically find smaller effects"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#4caf50' }}>
                Recommended Approaches
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><Security sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText
                    primary="Use Conservative Estimates"
                    secondary="Use 50-80% of published effect sizes"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Security sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText
                    primary="Sensitivity Analysis"
                    secondary="Calculate power for range of plausible effects"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Security sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText
                    primary="Minimum Effect of Interest"
                    secondary="Power for smallest meaningful effect"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Security sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText
                    primary="Meta-Analytic Estimates"
                    secondary="Use pooled effect sizes when available"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Sensitivity Analysis: The Gold Standard
        </Typography>

        <Typography variant="body1" paragraph>
          Instead of a single power calculation, report power across a range of effect sizes:
        </Typography>

        <TableContainer component={Paper} sx={{ maxWidth: 500, mx: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 600 }}>Effect Size (d)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Power (n=50/group)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow><TableCell>0.30</TableCell><TableCell align="center">39%</TableCell></TableRow>
              <TableRow><TableCell>0.40</TableCell><TableCell align="center">60%</TableCell></TableRow>
              <TableRow sx={{ bgcolor: '#e8f5e9' }}><TableCell>0.50</TableCell><TableCell align="center">78%</TableCell></TableRow>
              <TableRow><TableCell>0.60</TableCell><TableCell align="center">89%</TableCell></TableRow>
              <TableRow><TableCell>0.70</TableCell><TableCell align="center">96%</TableCell></TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="body2">
            This approach acknowledges uncertainty and helps reviewers/funders understand
            the robustness of your power analysis.
          </Typography>
        </Alert>
      </Paper>
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
          <Warning sx={{ fontSize: 40, mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Lesson 8: Assumptions and Violations
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              Understanding When Power Analysis May Be Misleading
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
          sx={{ bgcolor: '#d32f2f' }}
        >
          {activeStep === steps.length - 1 ? 'Complete' : 'Next'}
        </Button>
      </Box>
    </Box>
  );
};

export default Lesson08_Assumptions;
