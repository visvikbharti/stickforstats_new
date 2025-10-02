import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Grid,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { MathJax } from 'better-react-mathjax';

// Import existing simulation
import CoverageSimulation from '../../simulations/CoverageSimulation';
import CoverageAnimation from '../../visualizations/CoverageAnimation';

/**
 * Lesson 2: Coverage Probability Visualized
 *
 * Demonstrates coverage probability through repeated sampling
 * Shows that 95% of intervals contain the true parameter
 */

const Lesson02_Coverage = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    'Understand Coverage',
    'Watch Animation',
    'Run Simulation',
    'Explore Edge Cases'
  ];

  return (
    <Box>
      {/* Introduction */}
      <Paper elevation={2} sx={{ p: 4, mb: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#1976d2', fontWeight: 600 }}>
          Coverage Probability Visualized
        </Typography>

        <Typography variant="h6" paragraph sx={{ mt: 2 }}>
          Seeing is Believing: The Repeated Sampling Interpretation
        </Typography>

        <Typography paragraph>
          In Lesson 1, we learned that "95% confidence" means that <strong>if we repeat the procedure
          many times</strong>, 95% of the intervals will contain the true parameter. But what does
          that actually look like? Let's see it in action!
        </Typography>
      </Paper>

      {/* Progress Stepper */}
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

      {/* Step 1: Understand Coverage */}
      {activeStep === 0 && (
        <>
          <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
              📚 What is Coverage Probability?
            </Typography>

            <MathJax>
              <Typography paragraph>
                <strong>Coverage Probability</strong> is the long-run proportion of confidence intervals
                that contain the true parameter value when the procedure is repeated many times under
                identical conditions.
              </Typography>

              <Box sx={{ p: 3, bgcolor: '#e3f2fd', borderRadius: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Formal Definition
                </Typography>

                <Typography paragraph>
                  For a confidence interval procedure with nominal confidence level {" 1 - α:"}
                </Typography>

                <Typography align="center" paragraph sx={{ fontSize: '1.1rem' }}>
                  {"\\[ \\text{Coverage Probability} = P(\\theta \\in [L(X), U(X)]) = 1 - \\alpha \\]"}
                </Typography>

                <Typography variant="body2">
                  Where:
                  <br />• θ is the true (fixed) parameter
                  <br />• L(X) and U(X) are the lower and upper bounds (functions of random data X)
                  <br />• The probability is over all possible samples X
                </Typography>
              </Box>

              <Alert severity="info" icon={<PlayArrowIcon />}>
                <Typography variant="body2">
                  <strong>The Key Insight:</strong> The randomness is in the <em>data</em> (X), which
                  makes the interval endpoints L(X) and U(X) random. The parameter θ is fixed. Each
                  time we collect new data, we get a different interval.
                </Typography>
              </Alert>
            </MathJax>
          </Paper>

          <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              🎯 The Coverage Experiment
            </Typography>

            <Typography paragraph>
              Imagine we conduct the following experiment:
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', bgcolor: '#f5f5f5' }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Step 1: Set the True Parameter
                    </Typography>
                    <Typography variant="body2">
                      Let's say the true population mean μ = 10. This is our "ground truth" that
                      we're trying to estimate.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', bgcolor: '#f5f5f5' }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Step 2: Sample and Calculate
                    </Typography>
                    <Typography variant="body2">
                      Draw a random sample of size n from the population. Calculate x̄ and construct
                      a 95% confidence interval.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', bgcolor: '#f5f5f5' }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Step 3: Check Coverage
                    </Typography>
                    <Typography variant="body2">
                      Does the interval [L, U] contain μ = 10? Mark it as "hit" if yes, "miss" if no.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', bgcolor: '#f5f5f5' }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Step 4: Repeat Many Times
                    </Typography>
                    <Typography variant="body2">
                      Repeat steps 2-3 a thousand times. Count how many intervals contained μ.
                      This proportion is the <em>empirical coverage probability</em>.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="success" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Expected Result:</strong> If we used a 95% confidence procedure correctly,
                we should see approximately 95% of the intervals containing μ = 10. The remaining
                5% will miss (too high or too low).
              </Typography>
            </Alert>
          </Paper>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => setActiveStep(1)}
            >
              Next: Watch Animation
            </Button>
          </Box>
        </>
      )}

      {/* Step 2: Watch Animation */}
      {activeStep === 1 && (
        <>
          <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
              🎬 Animated Coverage Demonstration
            </Typography>

            <Typography paragraph>
              This animation shows many confidence intervals constructed from different samples.
              Each horizontal line represents one 95% confidence interval. The vertical red line
              is the true parameter μ.
            </Typography>

            <Box sx={{ mt: 3, mb: 3 }}>
              <CoverageAnimation
                height={500}
                numIntervals={100}
                confidenceLevel={0.95}
                sampleSize={30}
              />
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: '#e8f5e9' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#388e3c' }}>
                      Green Intervals
                    </Typography>
                    <Typography variant="body2">
                      These intervals <strong>contain</strong> the true parameter (μ). About 95%
                      should be green.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: '#ffebee' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#d32f2f' }}>
                      Red Intervals
                    </Typography>
                    <Typography variant="body2">
                      These intervals <strong>miss</strong> the true parameter. About 5% should
                      be red.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: '#e3f2fd' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#1976d2' }}>
                      Key Observation
                    </Typography>
                    <Typography variant="body2">
                      Each interval is <em>different</em> because each sample is different. Some
                      are wide, some narrow. Some hit, some miss.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="warning" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Critical Point:</strong> You can't tell from looking at a single interval
                whether it contains μ or not! You need to know the true μ (which we don't in practice).
                But the <em>procedure</em> is calibrated to give 95% coverage in the long run.
              </Typography>
            </Alert>
          </Paper>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
            <Button variant="outlined" onClick={() => setActiveStep(0)}>
              Back
            </Button>
            <Button variant="contained" onClick={() => setActiveStep(2)}>
              Next: Run Simulation
            </Button>
          </Box>
        </>
      )}

      {/* Step 3: Run Simulation */}
      {activeStep === 2 && (
        <>
          <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
              🔬 Interactive Coverage Simulation
            </Typography>

            <Typography paragraph>
              Now it's your turn! Run a coverage simulation to verify that different confidence
              interval methods achieve their nominal coverage levels.
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Try This:</strong>
                <br />
                1. Start with "Mean (t-interval)" and Normal distribution
                <br />
                2. Set confidence level to 95% and sample size to 30
                <br />
                3. Run 1000 simulations
                <br />
                4. Check if the actual coverage is close to 95%
              </Typography>
            </Alert>

            <Box sx={{ mt: 3 }}>
              <CoverageSimulation />
            </Box>
          </Paper>

          <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              📊 Interpreting the Results
            </Typography>

            <Typography paragraph>
              After running the simulation, you'll see:
            </Typography>

            <Box sx={{ pl: 3 }}>
              <Typography paragraph>
                • <strong>Actual Coverage:</strong> The proportion of intervals that contained the
                true parameter in your simulation
              </Typography>

              <Typography paragraph>
                • <strong>Expected Coverage:</strong> The nominal confidence level (e.g., 95%)
              </Typography>

              <Typography paragraph>
                • <strong>Coverage Error:</strong> The difference between actual and expected.
                Should be small due to random variation
              </Typography>

              <Typography paragraph>
                • <strong>Visualization:</strong> A chart showing the distribution of results
              </Typography>
            </Box>

            <Alert severity="success">
              <Typography variant="body2">
                <strong>What to Expect:</strong> With 1000 simulations at 95% confidence, you should
                see actual coverage between 94% and 96% most of the time. Larger deviations suggest
                violated assumptions or incorrect methods.
              </Typography>
            </Alert>
          </Paper>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
            <Button variant="outlined" onClick={() => setActiveStep(1)}>
              Back
            </Button>
            <Button variant="contained" onClick={() => setActiveStep(3)}>
              Next: Explore Edge Cases
            </Button>
          </Box>
        </>
      )}

      {/* Step 4: Explore Edge Cases */}
      {activeStep === 3 && (
        <>
          <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
              ⚠️ When Coverage Breaks Down
            </Typography>

            <Typography paragraph>
              Not all confidence interval methods achieve their nominal coverage under all conditions.
              Let's explore when things go wrong.
            </Typography>

            <Grid container spacing={3}>
              {/* Edge Case 1: Small Sample + Non-normality */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', bgcolor: '#fff3e0' }}>
                  <CardContent>
                    <Chip label="Common Pitfall" color="warning" sx={{ mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Small Sample + Skewed Distribution
                    </Typography>
                    <Typography paragraph variant="body2">
                      <strong>The Problem:</strong> t-intervals assume normality. With small samples
                      (n &lt; 30) from highly skewed distributions, actual coverage can be &lt;90%
                      even when targeting 95%.
                    </Typography>
                    <Typography variant="body2">
                      <strong>Try It:</strong> Set distribution to "Gamma" or "Log-normal", sample
                      size to 10, and watch coverage drop below nominal.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Edge Case 2: Wald vs Wilson for proportions */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', bgcolor: '#fff3e0' }}>
                  <CardContent>
                    <Chip label="Method Matters" color="warning" sx={{ mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Wald Interval for Extreme Proportions
                    </Typography>
                    <Typography paragraph variant="body2">
                      <strong>The Problem:</strong> The Wald interval for proportions (p̂ ± z√[p̂(1-p̂)/n])
                      can have terrible coverage when p is near 0 or 1.
                    </Typography>
                    <Typography variant="body2">
                      <strong>Try It:</strong> Compare "Proportion (Wald)" vs "Proportion (Wilson)"
                      with Binomial(n=30, p=0.05). Wilson is much better!
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Edge Case 3: Sample size matters */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', bgcolor: '#e8f5e9' }}>
                  <CardContent>
                    <Chip label="Good News" color="success" sx={{ mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Large Samples Save the Day
                    </Typography>
                    <Typography paragraph variant="body2">
                      <strong>The Solution:</strong> By the Central Limit Theorem, as n increases,
                      the sampling distribution becomes more normal, and coverage improves.
                    </Typography>
                    <Typography variant="body2">
                      <strong>Try It:</strong> Use a skewed distribution but increase sample size
                      to 100 or 500. Watch coverage approach nominal 95%.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Edge Case 4: Bootstrap to the rescue */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', bgcolor: '#e8f5e9' }}>
                  <CardContent>
                    <Chip label="Advanced Technique" color="success" sx={{ mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Bootstrap Methods Are Robust
                    </Typography>
                    <Typography paragraph variant="body2">
                      <strong>The Solution:</strong> Bootstrap confidence intervals don't assume
                      normality and often achieve better coverage in difficult situations.
                    </Typography>
                    <Typography variant="body2">
                      We'll explore bootstrap methods in depth in the next lesson!
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
            <Button variant="outlined" onClick={() => setActiveStep(2)}>
              Back
            </Button>
          </Box>
        </>
      )}

      {/* Summary and Completion */}
      <Paper elevation={3} sx={{ p: 4, mt: 4, bgcolor: '#e8f5e9' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#388e3c' }}>
          ✅ Key Takeaways
        </Typography>

        <Box sx={{ pl: 2 }}>
          <Typography paragraph>
            • Coverage probability is the <strong>long-run proportion</strong> of intervals that contain θ
          </Typography>
          <Typography paragraph>
            • A 95% CI procedure should produce intervals where ~95% contain θ and ~5% miss
          </Typography>
          <Typography paragraph>
            • You can't tell if a specific interval contains θ without knowing θ
          </Typography>
          <Typography paragraph>
            • Coverage can break down with: small samples, skewed distributions, extreme parameters
          </Typography>
          <Typography paragraph>
            • Different methods (t, Wald, Wilson, bootstrap) have different coverage properties
          </Typography>
        </Box>

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

export default Lesson02_Coverage;
