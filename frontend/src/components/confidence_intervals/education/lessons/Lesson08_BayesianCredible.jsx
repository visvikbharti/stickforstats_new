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
  Slider,
  Chip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { MathJax } from 'better-react-mathjax';

/**
 * Lesson 8: Bayesian Credible Intervals
 *
 * Introduces Bayesian alternative to frequentist CIs
 * Shows fundamental philosophical difference and practical implications
 */

const Lesson08_BayesianCredible = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [priorMean, setPriorMean] = useState(50);
  const [priorSD, setPriorSD] = useState(10);
  const [observedMean, setObservedMean] = useState(55);

  // Bayesian updating for normal-normal conjugate
  const n = 25;
  const sampleSD = 8;
  const dataSD = sampleSD / Math.sqrt(n); // SEM

  const posterior = useMemo(() => {
    const priorPrecision = 1 / (priorSD * priorSD);
    const dataPrecision = 1 / (dataSD * dataSD);

    const postPrecision = priorPrecision + dataPrecision;
    const postVariance = 1 / postPrecision;
    const postSD = Math.sqrt(postVariance);

    const postMean = (priorPrecision * priorMean + dataPrecision * observedMean) / postPrecision;

    // 95% credible interval
    const lower = postMean - 1.96 * postSD;
    const upper = postMean + 1.96 * postSD;

    return { mean: postMean, sd: postSD, lower, upper };
  }, [priorMean, priorSD, observedMean, dataSD]);

  const handleNext = () => setActiveStep(prev => Math.min(prev + 1, 4));
  const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 0));

  return (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical">
        {/* Step 1: Two Philosophies */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Two Philosophical Approaches</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Alert severity="info" icon={<CompareArrowsIcon />} sx={{ mb: 2 }}>
                <AlertTitle>Fundamental Difference</AlertTitle>
                Frequentist CIs and Bayesian credible intervals answer <strong>different questions</strong>
                about uncertainty!
              </Alert>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#e3f2fd', height: '100%' }}>
                    <CardContent>
                      <Chip label="Frequentist" color="primary" sx={{ mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        Confidence Interval
                      </Typography>

                      <Typography variant="body2" paragraph>
                        <strong>Philosophy:</strong> Parameter θ is fixed (unknown). Data are random.
                      </Typography>

                      <Typography variant="body2" paragraph>
                        <strong>Interpretation:</strong>
                        "If we repeated this procedure many times, 95% of intervals would contain θ."
                      </Typography>

                      <Typography variant="body2" paragraph>
                        <strong>Probability statement:</strong> About the <em>procedure</em>, not the parameter
                      </Typography>

                      <Alert severity="warning" sx={{ mt: 1 }}>
                        <Typography variant="caption">
                          ❌ WRONG: "There's a 95% chance θ is in [L, U]"
                        </Typography>
                      </Alert>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#f3e5f5', height: '100%' }}>
                    <CardContent>
                      <Chip label="Bayesian" color="secondary" sx={{ mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        Credible Interval
                      </Typography>

                      <Typography variant="body2" paragraph>
                        <strong>Philosophy:</strong> Parameter θ is random (has a distribution). Data are fixed.
                      </Typography>

                      <Typography variant="body2" paragraph>
                        <strong>Interpretation:</strong>
                        "Given the observed data, there's a 95% probability that θ is in [L, U]."
                      </Typography>

                      <Typography variant="body2" paragraph>
                        <strong>Probability statement:</strong> Directly about the parameter!
                      </Typography>

                      <Alert severity="success" sx={{ mt: 1 }}>
                        <Typography variant="caption">
                          ✓ CORRECT: "There's a 95% chance θ is in [L, U]"
                        </Typography>
                      </Alert>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                  Why This Matters
                </Typography>
                <Typography paragraph>
                  Most people (including many scientists) intuitively interpret CIs the Bayesian way—as
                  probability statements about the parameter. But frequentist CIs don't support that interpretation!
                </Typography>
                <Typography>
                  Bayesian credible intervals give you what you actually want: direct probability statements.
                </Typography>
              </Paper>

              <Button variant="contained" onClick={handleNext} sx={{ mt: 2 }}>
                Learn How Bayesian Works
              </Button>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 2: Bayes' Theorem */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Bayes' Theorem</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>
                The Foundation: Bayes' Theorem
              </Typography>

              <Paper sx={{ p: 3, bgcolor: '#e3f2fd', mb: 2 }}>
                <MathJax>
                  {"\\[ P(\\theta \\mid \\text{data}) = \\frac{P(\\text{data} \\mid \\theta) \\cdot P(\\theta)}{P(\\text{data})} \\]"}
                </MathJax>

                <Typography paragraph sx={{ mt: 2 }}>
                  Or more compactly:
                </Typography>

                <MathJax>
                  {"\\[ \\text{Posterior} \\propto \\text{Likelihood} \\times \\text{Prior} \\]"}
                </MathJax>
              </Paper>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>
                        Prior P(θ)
                      </Typography>
                      <Typography variant="body2">
                        What you believe about θ <strong>before</strong> seeing the data
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Example: "I think μ is around 50, give or take 10"
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>
                        Likelihood P(data|θ)
                      </Typography>
                      <Typography variant="body2">
                        How likely is the observed data for each possible θ value?
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Example: "If μ = 55, how likely is x̄ = 55?"
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>
                        Posterior P(θ|data)
                      </Typography>
                      <Typography variant="body2">
                        What you believe about θ <strong>after</strong> seeing the data
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Example: "Now I think μ is around 54, give or take 4"
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom>
                The Bayesian Learning Process
              </Typography>

              <Paper sx={{ p: 2, bgcolor: 'white' }}>
                <ol>
                  <li>
                    <Typography paragraph>
                      <strong>Specify prior distribution:</strong> Encode your initial beliefs about θ
                    </Typography>
                  </li>
                  <li>
                    <Typography paragraph>
                      <strong>Collect data:</strong> Observe x₁, x₂, ..., xₙ
                    </Typography>
                  </li>
                  <li>
                    <Typography paragraph>
                      <strong>Compute likelihood:</strong> How probable is this data for each θ?
                    </Typography>
                  </li>
                  <li>
                    <Typography paragraph>
                      <strong>Update via Bayes' theorem:</strong> Combine prior and likelihood to get posterior
                    </Typography>
                  </li>
                  <li>
                    <Typography paragraph>
                      <strong>Credible interval:</strong> Find region containing 95% of posterior probability mass
                    </Typography>
                  </li>
                </ol>
              </Paper>

              <Alert severity="info" sx={{ mt: 2 }}>
                <AlertTitle>Key Insight</AlertTitle>
                The posterior is a <strong>compromise</strong> between your prior belief and what the data say.
                Strong data overwhelm weak priors. Strong priors resist conflicting data.
              </Alert>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>See Interactive Example</Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 3: Interactive Bayesian Updating */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Interactive Bayesian Updating</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography paragraph>
                Adjust your prior belief and observed data to see how the posterior (and credible interval) updates.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: 'white', mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  Scenario: Estimating Mean IQ
                </Typography>
                <Typography variant="body2">
                  Sample size: n = {n}, Sample SD: s = {sampleSD}
                </Typography>
              </Paper>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                    <Typography variant="h6" gutterBottom>
                      Prior Belief
                    </Typography>

                    <Typography gutterBottom>Prior Mean: μ₀ = {priorMean}</Typography>
                    <Slider
                      value={priorMean}
                      onChange={(e, val) => setPriorMean(val)}
                      min={30}
                      max={70}
                      step={1}
                      marks={[
                        { value: 40, label: '40' },
                        { value: 50, label: '50' },
                        { value: 60, label: '60' }
                      ]}
                    />

                    <Typography gutterBottom sx={{ mt: 2 }}>Prior SD: σ₀ = {priorSD}</Typography>
                    <Slider
                      value={priorSD}
                      onChange={(e, val) => setPriorSD(val)}
                      min={2}
                      max={20}
                      step={1}
                      marks={[
                        { value: 2, label: 'Strong' },
                        { value: 10, label: 'Medium' },
                        { value: 20, label: 'Weak' }
                      ]}
                    />
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
                    <Typography variant="h6" gutterBottom>
                      Observed Data
                    </Typography>

                    <Typography gutterBottom>Sample Mean: x̄ = {observedMean}</Typography>
                    <Slider
                      value={observedMean}
                      onChange={(e, val) => setObservedMean(val)}
                      min={40}
                      max={70}
                      step={0.5}
                      marks={[
                        { value: 45, label: '45' },
                        { value: 55, label: '55' },
                        { value: 65, label: '65' }
                      ]}
                    />
                  </Paper>
                </Grid>
              </Grid>

              <Paper sx={{ p: 3, bgcolor: '#f3e5f5', mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Posterior Distribution
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2">
                      <strong>Posterior Mean:</strong> {posterior.mean.toFixed(2)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Posterior SD:</strong> {posterior.sd.toFixed(2)}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" paragraph>
                      <strong>95% Credible Interval:</strong>
                    </Typography>
                    <MathJax>
                      {"\\[ [{" + posterior.lower.toFixed(2) + "}, {" + posterior.upper.toFixed(2) + "}] \\]"}
                    </MathJax>
                  </Grid>
                </Grid>

                <Alert severity="success" sx={{ mt: 2 }}>
                  <strong>Interpretation:</strong> Given the data and prior, there's a 95% probability that
                  the true mean IQ is between {posterior.lower.toFixed(1)} and {posterior.upper.toFixed(1)}.
                </Alert>
              </Paper>

              <Typography variant="h6" gutterBottom>
                Observations
              </Typography>

              <ul>
                <li>
                  <Typography paragraph>
                    When prior is <strong>weak</strong> (large σ₀): Posterior ≈ data (frequentist-like)
                  </Typography>
                </li>
                <li>
                  <Typography paragraph>
                    When prior is <strong>strong</strong> (small σ₀): Prior pulls posterior away from data
                  </Typography>
                </li>
                <li>
                  <Typography>
                    Posterior precision = Prior precision + Data precision (information adds!)
                  </Typography>
                </li>
              </ul>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>Continue</Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 4: Pros & Cons */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Bayesian vs Frequentist</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography paragraph>
                Both approaches have merits. The choice depends on your philosophical stance and practical needs.
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#e8f5e9' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        ✅ Bayesian Advantages
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">Direct probability statements about parameters</Typography></li>
                        <li><Typography variant="body2">Incorporates prior knowledge naturally</Typography></li>
                        <li><Typography variant="body2">Works for small samples</Typography></li>
                        <li><Typography variant="body2">Provides full posterior distribution</Typography></li>
                        <li><Typography variant="body2">Intuitive interpretation</Typography></li>
                      </ul>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#ffebee' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        ❌ Bayesian Challenges
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">Requires specifying a prior (subjective)</Typography></li>
                        <li><Typography variant="body2">Computationally intensive (MCMC often needed)</Typography></li>
                        <li><Typography variant="body2">Different priors → different answers</Typography></li>
                        <li><Typography variant="body2">Not always clear what prior to use</Typography></li>
                        <li><Typography variant="body2">Less standardized than frequentist</Typography></li>
                      </ul>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom>
                When to Use Each
              </Typography>

              <Paper sx={{ p: 2, bgcolor: 'white', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                  Use Bayesian When:
                </Typography>
                <ul>
                  <li><Typography>You have legitimate prior information to incorporate</Typography></li>
                  <li><Typography>You need direct probability statements</Typography></li>
                  <li><Typography>Sequential updating is important (clinical trials)</Typography></li>
                  <li><Typography>Small sample size makes frequentist methods unreliable</Typography></li>
                </ul>
              </Paper>

              <Paper sx={{ p: 2, bgcolor: 'white', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                  Use Frequentist When:
                </Typography>
                <ul>
                  <li><Typography>You want objective, assumption-minimal inference</Typography></li>
                  <li><Typography>Prior information is unavailable or controversial</Typography></li>
                  <li><Typography>Regulatory standards require frequentist methods</Typography></li>
                  <li><Typography>You have large samples (both converge anyway)</Typography></li>
                </ul>
              </Paper>

              <Alert severity="info">
                <AlertTitle>Modern Perspective</AlertTitle>
                The debate is less heated than it used to be. Many statisticians use both, choosing based on
                the problem. With large data, both give similar answers. With informative priors, Bayesian
                can be more efficient.
              </Alert>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>Continue</Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 5: Summary */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Summary & Completion</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                🎓 CI Curriculum Complete!
              </Typography>

              <Typography paragraph sx={{ fontSize: '1.1rem' }}>
                Congratulations! You've completed all 8 lessons on Confidence Intervals, from basic
                interpretation to advanced Bayesian methods.
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 40, mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        What You've Mastered
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">Correct interpretation of CIs</Typography></li>
                        <li><Typography variant="body2">Coverage probability and sampling</Typography></li>
                        <li><Typography variant="body2">Bootstrap resampling methods</Typography></li>
                        <li><Typography variant="body2">Sample size effects</Typography></li>
                        <li><Typography variant="body2">CI-hypothesis test duality</Typography></li>
                        <li><Typography variant="body2">Handling non-normal data</Typography></li>
                        <li><Typography variant="body2">Advanced bootstrap (BCa, bootstrap-t)</Typography></li>
                        <li><Typography variant="body2">Bayesian credible intervals</Typography></li>
                      </ul>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#e3f2fd' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Your Interval Toolkit
                      </Typography>

                      <Typography variant="body2" paragraph>
                        <strong>Normal data, large n:</strong> t-interval
                      </Typography>

                      <Typography variant="body2" paragraph>
                        <strong>Skewed data:</strong> Transform or bootstrap
                      </Typography>

                      <Typography variant="body2" paragraph>
                        <strong>Non-parametric:</strong> Bootstrap (BCa best)
                      </Typography>

                      <Typography variant="body2" paragraph>
                        <strong>With prior info:</strong> Bayesian credible interval
                      </Typography>

                      <Typography variant="body2">
                        <strong>Checking result:</strong> Compare to hypothesis test
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Alert severity="success" sx={{ mb: 2 }}>
                <AlertTitle>Congratulations!</AlertTitle>
                You now have a comprehensive understanding of confidence intervals—from their frequentist
                foundations to advanced computational methods and Bayesian alternatives. You're ready to
                apply these methods in research and practice!
              </Alert>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  startIcon={<CheckCircleIcon />}
                  onClick={onComplete}
                  sx={{ fontSize: '1.1rem', py: 1.5, px: 4 }}
                >
                  Complete CI Curriculum
                </Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>
      </Stepper>
    </Box>
  );
};

export default Lesson08_BayesianCredible;
