/**
 * Lesson 10: Real-World Applications and Worked Examples
 *
 * Complete worked examples walking through power analysis from start to finish.
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
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  NavigateNext,
  NavigateBefore,
  CheckCircle,
  ExpandMore,
  Science,
  Biotech,
  Psychology,
  Calculate,
  Warning,
} from '@mui/icons-material';
import { alpha as alphaFn } from '@mui/material/styles';

const steps = [
  'Protocol: Step-by-Step',
  'Example 1: Clinical Trial',
  'Example 2: Animal Study',
  'Example 3: Survey Research',
  'Common Mistakes to Avoid',
];

const Lesson10_RealWorld = ({ onComplete }) => {
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
        The Complete Power Analysis Protocol
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          Follow this systematic protocol for every study requiring power analysis.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {[
          { num: 1, title: 'Define Research Question', desc: 'What exactly are you testing? Specify hypotheses clearly.', color: '#2196f3' },
          { num: 2, title: 'Choose Statistical Test', desc: 't-test, ANOVA, chi-square, etc. based on data type and design.', color: '#4caf50' },
          { num: 3, title: 'Determine Effect Size', desc: 'From literature, pilot data, or MCID. This is the hardest step.', color: '#ff9800' },
          { num: 4, title: 'Set Alpha & Power', desc: 'Usually α = 0.05, Power = 0.80. Justify if different.', color: '#9c27b0' },
          { num: 5, title: 'Calculate Sample Size', desc: 'Use appropriate formula or software (G*Power, R).', color: '#f44336' },
          { num: 6, title: 'Adjust for Attrition', desc: 'Inflate n by expected dropout rate (e.g., 20%).', color: '#00bcd4' },
          { num: 7, title: 'Conduct Sensitivity Analysis', desc: 'Calculate power for range of effect sizes.', color: '#795548' },
          { num: 8, title: 'Document Everything', desc: 'Report all assumptions and calculations transparently.', color: '#607d8b' },
        ].map((step) => (
          <Grid item xs={12} md={6} lg={3} key={step.num}>
            <Card elevation={2} sx={{ height: '100%', borderTop: `4px solid ${step.color}` }}>
              <CardContent>
                <Chip label={`Step ${step.num}`} size="small" sx={{ bgcolor: step.color, color: 'white', mb: 1 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{step.title}</Typography>
                <Typography variant="body2" color="text.secondary">{step.desc}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 3, mt: 3, bgcolor: 'background.default' }}>
        <Typography variant="h6" gutterBottom>
          Documentation Checklist
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <List dense>
              <ListItem><ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                <ListItemText primary="Primary outcome specified" /></ListItem>
              <ListItem><ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                <ListItemText primary="Statistical test justified" /></ListItem>
              <ListItem><ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                <ListItemText primary="Effect size source cited" /></ListItem>
            </List>
          </Grid>
          <Grid item xs={12} md={6}>
            <List dense>
              <ListItem><ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                <ListItemText primary="α and power stated" /></ListItem>
              <ListItem><ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                <ListItemText primary="Final n calculated" /></ListItem>
              <ListItem><ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                <ListItemText primary="Software/formula specified" /></ListItem>
            </List>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );

  const renderStep2 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        <Biotech sx={{ mr: 1, verticalAlign: 'middle' }} />
        Example 1: Randomized Clinical Trial
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          <strong>Scenario:</strong> Testing whether a new cognitive training program improves
          memory scores compared to an active control condition.
        </Typography>
      </Alert>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Step 1: Research Question & Hypotheses</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" paragraph>
            <strong>Primary Question:</strong> Does 12 weeks of cognitive training improve
            memory performance more than active control?
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
            <Typography variant="body2">
              H₀: μ<sub>training</sub> = μ<sub>control</sub><br/>
              H₁: μ<sub>training</sub> {'>'} μ<sub>control</sub> (one-tailed)
            </Typography>
          </Paper>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Step 2: Effect Size Determination</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" paragraph>
            <strong>Literature Review:</strong> Meta-analysis by Smith et al. (2023) found
            mean effect of d = 0.45 (95% CI: 0.32-0.58) for similar interventions.
          </Typography>
          <Typography variant="body1">
            <strong>Decision:</strong> Use d = 0.40 (conservative estimate, 80% of literature value).
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Step 3: Sample Size Calculation</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 2 }}>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
              Test: Independent t-test (one-tailed)<br/>
              α = 0.05, Power = 0.80<br/>
              Effect size: d = 0.40<br/><br/>
              n = ((1.645 + 0.84) / 0.40)² × 2 = 78 per group<br/>
              With 20% attrition: 78 / 0.80 = 98 per group<br/><br/>
              <strong>Target: 100 per group (200 total)</strong>
            </Typography>
          </Paper>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Step 4: Sensitivity Analysis</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" paragraph>
            With n = 100 per group, we have 80% power to detect d = 0.40, but also:
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
            <Typography variant="body2">
              • d = 0.30: 54% power (might miss)<br/>
              • d = 0.35: 67% power (marginal)<br/>
              • d = 0.40: 80% power (target)<br/>
              • d = 0.50: 92% power (good)<br/>
              • d = 0.60: 98% power (excellent)
            </Typography>
          </Paper>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  const renderStep3 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        <Science sx={{ mr: 1, verticalAlign: 'middle' }} />
        Example 2: Preclinical Animal Study
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          <strong>Scenario:</strong> Testing whether a novel compound reduces tumor volume
          in a mouse xenograft model compared to vehicle control.
        </Typography>
      </Alert>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Design Considerations</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Ethical Imperative
                </Typography>
                <Typography variant="body2">
                  3Rs principle: Minimize animal numbers while maintaining scientific validity.
                  Power analysis is ethically required.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Effect Size Source
                </Typography>
                <Typography variant="body2">
                  Pilot study (n=5/group) showed 40% reduction in tumor volume.
                  d ≈ 1.2 (large effect for pharmacological intervention).
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Sample Size Calculation</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 2 }}>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
              Test: Two-sample t-test (two-tailed)<br/>
              α = 0.05, Power = 0.80<br/>
              Conservative effect size: d = 0.80 (below pilot)<br/><br/>
              n = 2 × ((1.96 + 0.84) / 0.80)² = 26 per group<br/><br/>
              <strong>Target: 13 mice per group × 2 groups = 26 total</strong>
            </Typography>
          </Paper>
          <Alert severity="warning">
            <Typography variant="body2">
              For animal studies, always use conservative effect size estimates.
              Pilot studies often overestimate effects.
            </Typography>
          </Alert>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  const renderStep4 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        <Psychology sx={{ mr: 1, verticalAlign: 'middle' }} />
        Example 3: Survey Research
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          <strong>Scenario:</strong> Testing whether job satisfaction differs between
          remote and in-office workers using a validated scale.
        </Typography>
      </Alert>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Unique Considerations</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List dense>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
              <ListItemText primary="Response rate typically 20-40% for online surveys" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
              <ListItemText primary="Need to account for incomplete responses" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
              <ListItemText primary="May have unequal group sizes" />
            </ListItem>
          </List>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Calculation with Adjustments</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 2 }}>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
              Test: Two-sample t-test<br/>
              α = 0.05, Power = 0.80<br/>
              Effect size: d = 0.35 (small-medium from literature)<br/><br/>
              Base n = 2 × ((1.96 + 0.84) / 0.35)² = 258 per group<br/>
              With 30% response rate: 258 / 0.30 = 860 invitations per group<br/><br/>
              <strong>Send 900 invitations per group (1800 total)</strong>
            </Typography>
          </Paper>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  const renderStep5 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        <Warning sx={{ mr: 1, verticalAlign: 'middle' }} />
        Common Mistakes to Avoid
      </Typography>

      <Alert severity="error" sx={{ mb: 3 }}>
        These mistakes can invalidate your power analysis or lead to wasted resources.
      </Alert>

      <Grid container spacing={3}>
        {[
          { title: 'Using Post Hoc Power', desc: 'Calculating power after data collection using observed effect size. This is meaningless.', solution: 'Use sensitivity analysis or confidence intervals instead.' },
          { title: 'Optimistic Effect Sizes', desc: 'Using the largest effect from published literature without accounting for publication bias.', solution: 'Use conservative estimates (50-80% of published values).' },
          { title: 'Ignoring Multiple Comparisons', desc: 'Planning for a single test when you\'ll actually conduct many.', solution: 'Adjust α for number of comparisons or plan for largest comparison.' },
          { title: 'Wrong Test Selection', desc: 'Planning power for t-test but actually running ANOVA or regression.', solution: 'Ensure power analysis matches actual planned analysis.' },
          { title: 'Ignoring Clustering', desc: 'Treating clustered data as independent observations.', solution: 'Account for design effect: DEFF = 1 + (m-1)ρ' },
          { title: 'No Attrition Adjustment', desc: 'Not inflating sample size for expected dropout.', solution: 'Divide target n by (1 - expected dropout rate).' },
        ].map((mistake, i) => (
          <Grid item xs={12} md={6} key={i}>
            <Card elevation={2} sx={{ height: '100%', borderLeft: '4px solid #f44336' }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#f44336' }}>
                  {i + 1}. {mistake.title}
                </Typography>
                <Typography variant="body2" paragraph>{mistake.desc}</Typography>
                <Paper sx={{ p: 1.5, bgcolor: (theme) => alphaFn(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
                  <Typography variant="body2" sx={{ color: '#2e7d32' }}>
                    <strong>Solution:</strong> {mistake.solution}
                  </Typography>
                </Paper>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
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
          <Calculate sx={{ fontSize: 40, mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Lesson 10: Real-World Applications
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              Complete Worked Examples
            </Typography>
          </Box>
        </Box>
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
          sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}
        >
          {activeStep === steps.length - 1 ? 'Complete' : 'Next'}
        </Button>
      </Box>
    </Box>
  );
};

export default Lesson10_RealWorld;
