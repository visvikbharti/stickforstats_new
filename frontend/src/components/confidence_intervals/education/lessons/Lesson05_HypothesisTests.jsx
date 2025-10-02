import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { MathJax } from 'better-react-mathjax';

/**
 * Lesson 5: Hypothesis Testing Connection
 *
 * Explores the deep connection between confidence intervals and hypothesis tests
 * Shows duality: CI contains values that wouldn't be rejected in a hypothesis test
 */

const Lesson05_HypothesisTests = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [alpha, setAlpha] = useState(0.05);
  const [sampleMean, setSampleMean] = useState(52);

  // Example data
  const n = 25;
  const sampleSD = 10;
  const se = sampleSD / Math.sqrt(n);

  // Confidence interval
  const tCritical = 2.064; // t(24, 0.025)
  const margin = tCritical * se;
  const ciLower = sampleMean - margin;
  const ciUpper = sampleMean + margin;

  // Test against different null values
  const testValues = useMemo(() => {
    const values = [];
    for (let mu0 = 45; mu0 <= 59; mu0 += 1) {
      const tStat = (sampleMean - mu0) / se;
      const pValue = 2 * (1 - 0.975); // Simplified for demo
      const rejected = Math.abs(tStat) > tCritical;
      const inCI = mu0 >= ciLower && mu0 <= ciUpper;

      values.push({
        mu0,
        tStat: tStat.toFixed(3),
        rejected,
        inCI,
        match: rejected !== inCI // Should always be false (perfect duality)
      });
    }
    return values;
  }, [sampleMean, ciLower, ciUpper, se, tCritical]);

  const handleNext = () => setActiveStep(prev => Math.min(prev + 1, 3));
  const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 0));

  return (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical">
        {/* Step 1: The Duality */}
        <Step>
          <StepLabel>
            <Typography variant="h6">The Fundamental Duality</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Alert severity="info" icon={<CompareArrowsIcon />} sx={{ mb: 2 }}>
                <AlertTitle>Key Insight</AlertTitle>
                A (1-α)×100% confidence interval contains exactly those parameter values
                that would <strong>not be rejected</strong> at significance level α.
              </Alert>

              <Typography paragraph>
                Confidence intervals and hypothesis tests are two sides of the same coin.
                They provide equivalent information, just presented differently.
              </Typography>

              <Paper sx={{ p: 3, bgcolor: '#e3f2fd', mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  The Duality Theorem
                </Typography>

                <MathJax>
                  {"\\[ \\mu_0 \\in [\\bar{x} - t_{\\alpha/2} \\cdot SE, \\bar{x} + t_{\\alpha/2} \\cdot SE] \\]"}
                </MathJax>

                <Typography align="center" sx={{ my: 2 }}>
                  if and only if
                </Typography>

                <MathJax>
                  {"\\[ |t| = \\left| \\frac{\\bar{x} - \\mu_0}{SE} \\right| \\leq t_{\\alpha/2} \\]"}
                </MathJax>

                <Typography paragraph sx={{ mt: 2 }}>
                  In other words: μ₀ is in the CI ↔ We fail to reject H₀: μ = μ₀
                </Typography>
              </Paper>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#e8f5e9' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Confidence Interval View
                      </Typography>
                      <Typography variant="body2">
                        "We're 95% confident μ is between 48 and 56"
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        → Set of plausible values
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#fff3e0' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Hypothesis Test View
                      </Typography>
                      <Typography variant="body2">
                        "We reject H₀: μ = 60 (p {"<"} 0.05)"
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        → Specific claim evaluation
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Button variant="contained" onClick={handleNext} sx={{ mt: 2 }}>
                See Interactive Demo
              </Button>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 2: Interactive Demonstration */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Interactive Demonstration</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography paragraph>
                Below, adjust the sample mean and observe how the 95% CI corresponds
                exactly to the set of μ₀ values that wouldn't be rejected.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: 'white', mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Setup:</strong>
                </Typography>
                <ul>
                  <li><Typography>Sample size: n = {n}</Typography></li>
                  <li><Typography>Sample SD: s = {sampleSD}</Typography></li>
                  <li><Typography>Standard Error: SE = {se.toFixed(2)}</Typography></li>
                  <li><Typography>Significance level: α = {alpha}</Typography></li>
                </ul>

                <Divider sx={{ my: 2 }} />

                <Typography gutterBottom>Sample Mean: <strong>{sampleMean}</strong></Typography>
                <Slider
                  value={sampleMean}
                  onChange={(e, val) => setSampleMean(val)}
                  min={45}
                  max={59}
                  step={0.5}
                  marks={[
                    { value: 45, label: '45' },
                    { value: 52, label: '52' },
                    { value: 59, label: '59' }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Paper>

              <Paper sx={{ p: 2, bgcolor: '#fff3e0', mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  95% Confidence Interval
                </Typography>

                <MathJax>
                  {"\\[ [{" + ciLower.toFixed(2) + "}, {" + ciUpper.toFixed(2) + "}] \\]"}
                </MathJax>
              </Paper>

              <Typography variant="h6" gutterBottom>
                Hypothesis Test Results
              </Typography>

              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                <Grid container spacing={1}>
                  {testValues.map((test, idx) => (
                    <Grid item xs={12} sm={6} md={4} key={idx}>
                      <Card
                        sx={{
                          bgcolor: test.inCI ? '#e8f5e9' : '#ffebee',
                          border: test.inCI ? '2px solid #4caf50' : '1px solid #ddd'
                        }}
                      >
                        <CardContent sx={{ py: 1 }}>
                          <Typography variant="body2">
                            <strong>H₀: μ = {test.mu0}</strong>
                          </Typography>
                          <Typography variant="caption" display="block">
                            t = {test.tStat}
                          </Typography>
                          <Typography variant="caption" display="block">
                            {test.rejected ? '❌ Reject H₀' : '✓ Fail to reject'}
                          </Typography>
                          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                            {test.inCI ? '✓ In 95% CI' : '❌ Outside CI'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <Alert severity="success" sx={{ mt: 2 }}>
                <strong>Notice:</strong> Values in the CI (green) are exactly those where we fail to reject H₀.
                Values outside the CI (red) are rejected!
              </Alert>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>Continue</Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 3: When to Use Each */}
        <Step>
          <StepLabel>
            <Typography variant="h6">When to Use Which?</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography paragraph>
                Since they're mathematically equivalent, when should you use a CI vs a hypothesis test?
              </Typography>

              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    ✓ Prefer Confidence Intervals When:
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <ul>
                    <li>
                      <Typography paragraph>
                        <strong>Estimation is the goal:</strong> "How much did the treatment improve outcomes?"
                        (not just "Did it work?")
                      </Typography>
                    </li>
                    <li>
                      <Typography paragraph>
                        <strong>Effect size matters:</strong> Clinical trials often care about magnitude of effect
                      </Typography>
                    </li>
                    <li>
                      <Typography paragraph>
                        <strong>Multiple comparisons:</strong> CIs let readers evaluate many hypotheses at once
                      </Typography>
                    </li>
                    <li>
                      <Typography paragraph>
                        <strong>Precision assessment:</strong> Width of CI shows how precisely you've estimated the parameter
                      </Typography>
                    </li>
                  </ul>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    ✓ Prefer Hypothesis Tests When:
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <ul>
                    <li>
                      <Typography paragraph>
                        <strong>Binary decision required:</strong> "Should we switch to the new manufacturing process?"
                      </Typography>
                    </li>
                    <li>
                      <Typography paragraph>
                        <strong>Specific claim to evaluate:</strong> "Is the average response time under 2 seconds?"
                      </Typography>
                    </li>
                    <li>
                      <Typography paragraph>
                        <strong>Null hypothesis is meaningful:</strong> Testing against a regulatory standard or baseline
                      </Typography>
                    </li>
                    <li>
                      <Typography paragraph>
                        <strong>P-value communication:</strong> Some audiences prefer p-values (though CIs are often better)
                      </Typography>
                    </li>
                  </ul>
                </AccordionDetails>
              </Accordion>

              <Alert severity="info" sx={{ mt: 2 }}>
                <AlertTitle>Best Practice</AlertTitle>
                Report <strong>both</strong> whenever possible! Give the CI for estimation, and mention
                whether it excludes the null value. Example: "The treatment increased survival by 5.2 months
                (95% CI: [2.1, 8.3], p = 0.002)."
              </Alert>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>Continue</Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 4: Summary */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Summary & Completion</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                🔗 Connection Established!
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 40, mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        Key Takeaways
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">CIs and hypothesis tests are mathematically dual</Typography></li>
                        <li><Typography variant="body2">CI = set of non-rejected null hypotheses</Typography></li>
                        <li><Typography variant="body2">Same data → same conclusion, different presentation</Typography></li>
                      </ul>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#e3f2fd' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        The Duality Formula
                      </Typography>

                      <MathJax>
                        {"\\[ \\mu_0 \\in \\text{CI}_{1-\\alpha} \\iff |t| \\leq t_{\\alpha/2} \\]"}
                      </MathJax>

                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        This is why α = 0.05 corresponds to a 95% CI
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Alert severity="success" sx={{ mb: 2 }}>
                <AlertTitle>Practical Wisdom</AlertTitle>
                CIs are often more informative than tests alone. They show not just whether an
                effect exists, but <strong>how large</strong> it likely is.
              </Alert>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={onComplete}
                >
                  Complete Lesson
                </Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>
      </Stepper>
    </Box>
  );
};

export default Lesson05_HypothesisTests;
