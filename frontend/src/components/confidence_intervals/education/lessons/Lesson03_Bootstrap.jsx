import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Button,
  Grid,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { MathJax } from 'better-react-mathjax';

// Import existing simulation
import BootstrapSimulation from '../../simulations/BootstrapSimulation';

/**
 * Lesson 3: Bootstrap Methods Interactive
 *
 * Teaches bootstrap resampling methods for constructing confidence intervals
 * without parametric assumptions
 */

const Lesson03_Bootstrap = ({ onComplete }) => {
  const [activeSection, setActiveSection] = useState(0);

  const sections = [
    'The Bootstrap Idea',
    'How Bootstrap Works',
    'Bootstrap CI Methods',
    'Try It Yourself'
  ];

  return (
    <Box>
      {/* Introduction */}
      <Paper elevation={2} sx={{ p: 4, mb: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#1976d2', fontWeight: 600 }}>
          Bootstrap Methods Interactive
        </Typography>

        <Typography variant="h6" paragraph sx={{ mt: 2 }}>
          Confidence Intervals Without Distributional Assumptions
        </Typography>

        <Typography paragraph>
          So far, we've used t-intervals which assume normality. But what if our data is skewed,
          bimodal, or just weird? Enter the <strong>bootstrap</strong> — a powerful resampling
          technique that works regardless of the underlying distribution!
        </Typography>

        <Alert severity="info" icon={<AutorenewIcon />}>
          <Typography variant="body2">
            <strong>The Bootstrap Philosophy:</strong> "The sample approximates the population."
            By resampling from our data, we can estimate the sampling distribution of any statistic
            without mathematical formulas.
          </Typography>
        </Alert>
      </Paper>

      {/* Progress Navigation */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeSection} alternativeLabel>
          {sections.map((label, index) => (
            <Step key={label}>
              <StepLabel
                onClick={() => setActiveSection(index)}
                sx={{ cursor: 'pointer' }}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Section 0: The Bootstrap Idea */}
      {activeSection === 0 && (
        <>
          <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
              💡 The Bootstrap Idea
            </Typography>

            <MathJax>
              <Typography paragraph>
                Suppose you want a confidence interval for the median (or any other statistic).
                The t-interval formula doesn't work for medians. What do you do?
              </Typography>

              <Box sx={{ p: 3, bgcolor: '#fff3e0', borderRadius: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ color: '#e65100' }}>
                  The Problem
                </Typography>

                <Typography paragraph>
                  We have one sample: {"\\( x_1, x_2, \\ldots, x_n \\)"}
                </Typography>

                <Typography paragraph>
                  We want to know: How much does the sample median vary from sample to sample?
                </Typography>

                <Typography paragraph>
                  But we can't draw more samples from the population (too expensive, too slow).
                </Typography>

                <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 2 }}>
                  "If only we could somehow simulate getting more samples..."
                </Typography>
              </Box>

              <Box sx={{ p: 3, bgcolor: '#e8f5e9', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32' }}>
                  The Bootstrap Solution
                </Typography>

                <Typography paragraph>
                  <strong>Key Insight:</strong> Our sample is the best approximation we have of the
                  population. So let's treat the sample <em>as if</em> it were the population!
                </Typography>

                <Typography paragraph>
                  <strong>The Procedure:</strong>
                </Typography>

                <Box sx={{ pl: 3 }}>
                  <Typography paragraph>
                    1. <strong>Resample:</strong> Draw n observations from your sample <em>with replacement</em>
                    (this is called a bootstrap sample)
                  </Typography>

                  <Typography paragraph>
                    2. <strong>Recalculate:</strong> Compute the statistic (e.g., median) on the bootstrap sample
                  </Typography>

                  <Typography paragraph>
                    3. <strong>Repeat:</strong> Do steps 1-2 many times (typically 1,000-10,000 times)
                  </Typography>

                  <Typography paragraph>
                    4. <strong>Analyze:</strong> The distribution of bootstrap statistics estimates the
                    sampling distribution of your original statistic
                  </Typography>
                </Box>
              </Box>
            </MathJax>
          </Paper>

          <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              🔍 Why "With Replacement"?
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', bgcolor: '#e3f2fd' }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      With Replacement
                    </Typography>
                    <Typography variant="body2" paragraph>
                      Each bootstrap sample can include the same original observation multiple times
                      or not at all. This mimics random sampling from the "population" (our sample).
                    </Typography>
                    <Chip label="Bootstrap Uses This" color="primary" size="small" />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', bgcolor: '#ffebee' }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Without Replacement
                    </Typography>
                    <Typography variant="body2" paragraph>
                      Each bootstrap sample would just be a permutation of the original data —
                      same values, different order. No new information!
                    </Typography>
                    <Chip label="Doesn't Work" color="error" size="small" />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="success" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>The Magic:</strong> By resampling with replacement, we create variability
                in our bootstrap samples, which mirrors the variability we'd see if we could take
                multiple samples from the true population.
              </Typography>
            </Alert>
          </Paper>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => setActiveSection(1)}
            >
              Next: How Bootstrap Works
            </Button>
          </Box>
        </>
      )}

      {/* Section 1: How Bootstrap Works */}
      {activeSection === 1 && (
        <>
          <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
              ⚙️ How Bootstrap Works: Step-by-Step
            </Typography>

            <MathJax>
              <Typography paragraph>
                Let's walk through a concrete example with a small dataset to see exactly what happens.
              </Typography>

              <Box sx={{ p: 3, bgcolor: '#fafafa', borderRadius: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Example: Bootstrap for the Median
                </Typography>

                <Typography paragraph>
                  <strong>Original Sample:</strong> {" [3, 7, 2, 9, 5] (n = 5)"}
                </Typography>

                <Typography paragraph>
                  <strong>Sample Median:</strong> 5
                </Typography>

                <Chip label="Step 1: First Bootstrap Sample" color="primary" sx={{ mt: 2, mb: 2 }} />

                <Typography paragraph>
                  Draw 5 values with replacement: {" [7, 3, 7, 2, 7]"}
                  <br />
                  Bootstrap Median: 7
                  <br />
                  <em>(Notice 7 appeared 3 times, and 9 and 5 didn't appear at all)</em>
                </Typography>

                <Chip label="Step 2: Second Bootstrap Sample" color="primary" sx={{ mt: 2, mb: 2 }} />

                <Typography paragraph>
                  Draw 5 values with replacement: {" [2, 5, 3, 2, 9]"}
                  <br />
                  Bootstrap Median: 3
                </Typography>

                <Chip label="Step 3: Third Bootstrap Sample" color="primary" sx={{ mt: 2, mb: 2 }} />

                <Typography paragraph>
                  Draw 5 values with replacement: {" [9, 9, 7, 5, 3]"}
                  <br />
                  Bootstrap Median: 7
                </Typography>

                <Typography paragraph sx={{ mt: 3, fontStyle: 'italic' }}>
                  ... repeat this process 997 more times to get 1,000 bootstrap medians ...
                </Typography>

                <Chip label="Step 4: Bootstrap Distribution" color="success" sx={{ mt: 2, mb: 2 }} />

                <Typography paragraph>
                  You now have 1,000 bootstrap medians. Their distribution approximates the
                  sampling distribution of the sample median!
                </Typography>
              </Box>

              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Key Point:</strong> Each bootstrap sample gives you a slightly different
                  median. The spread of these bootstrap medians tells you how much the sample median
                  varies due to sampling variability.
                </Typography>
              </Alert>
            </MathJax>
          </Paper>

          <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              📊 From Bootstrap Distribution to Confidence Interval
            </Typography>

            <Typography paragraph>
              Once you have the bootstrap distribution, there are several ways to construct a
              confidence interval. We'll explore three main methods in the next section.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: '#1976d2' }}>
                      Percentile Method
                    </Typography>
                    <Typography variant="body2">
                      Use the 2.5th and 97.5th percentiles of the bootstrap distribution
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: '#1976d2' }}>
                      Basic Method
                    </Typography>
                    <Typography variant="body2">
                      Reflect the bootstrap distribution around the sample statistic
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: '#1976d2' }}>
                      BCa Method
                    </Typography>
                    <Typography variant="body2">
                      Bias-corrected and accelerated — adjusts for skewness and bias
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
            <Button variant="outlined" onClick={() => setActiveSection(0)}>
              Back
            </Button>
            <Button variant="contained" onClick={() => setActiveSection(2)}>
              Next: Bootstrap CI Methods
            </Button>
          </Box>
        </>
      )}

      {/* Section 2: Bootstrap CI Methods */}
      {activeSection === 2 && (
        <>
          <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
              📐 Three Bootstrap Confidence Interval Methods
            </Typography>

            <MathJax>
              <Typography paragraph>
                Given B bootstrap replicates {" \\( T_1^*, T_2^*, \\ldots, T_B^* \\) "} of a
                statistic T, here are three ways to construct a 95% confidence interval:
              </Typography>

              {/* Percentile Method */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" sx={{ color: '#1976d2' }}>
                    1. Percentile Method (Simplest)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Formula
                    </Typography>

                    <Typography align="center" paragraph sx={{ fontSize: '1.1rem' }}>
                      {"\\[ [L, U] = [Q_{0.025}(T^*), Q_{0.975}(T^*)] \\]"}
                    </Typography>

                    <Typography paragraph>
                      Where {"\\( Q_p(T^*) \\)"} is the p-th quantile of the bootstrap distribution.
                    </Typography>

                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>How It Works:</strong> Simply take the 2.5th and 97.5th percentiles
                        of your bootstrap replicates. The middle 95% of the bootstrap distribution
                        becomes your confidence interval.
                      </Typography>
                    </Alert>

                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                      Pros and Cons
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                            ✓ Pros
                          </Typography>
                          <Typography variant="body2">
                            • Very intuitive
                            <br />• Easy to compute
                            <br />• Works for any statistic
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#c62828' }}>
                            ✗ Cons
                          </Typography>
                          <Typography variant="body2">
                            • Can have poor coverage if statistic is biased
                            <br />• Doesn't adjust for skewness
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Basic Method */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" sx={{ color: '#1976d2' }}>
                    2. Basic (Reverse Percentile) Method
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Formula
                    </Typography>

                    <Typography align="center" paragraph sx={{ fontSize: '1.1rem' }}>
                      {"\\[ [L, U] = [2T - Q_{0.975}(T^*), 2T - Q_{0.025}(T^*)] \\]"}
                    </Typography>

                    <Typography paragraph>
                      Where T is the sample statistic.
                    </Typography>

                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>How It Works:</strong> This method "reflects" the bootstrap
                        distribution around the sample statistic. It's based on the idea that
                        {" \\( T - \\theta \\approx \\theta - T^* \\)"}, where θ is the true parameter.
                      </Typography>
                    </Alert>

                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                      When to Use
                    </Typography>

                    <Typography variant="body2">
                      The basic method can perform better than the percentile method when the
                      bootstrap distribution is skewed but the sampling distribution is more symmetric.
                      It has better theoretical properties in some cases.
                    </Typography>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* BCa Method */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" sx={{ color: '#1976d2' }}>
                    3. BCa Method (Most Advanced)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Formula (Simplified Concept)
                    </Typography>

                    <Typography paragraph>
                      BCa stands for "Bias-Corrected and Accelerated". It adjusts the percentile
                      method to account for:
                    </Typography>

                    <Box sx={{ pl: 3, mb: 2 }}>
                      <Typography paragraph>
                        • <strong>Bias correction (BC):</strong> If the median of {"\\( T^* \\)"}
                        doesn't equal T, there's bias. BCa corrects for this.
                      </Typography>

                      <Typography paragraph>
                        • <strong>Acceleration (a):</strong> Adjusts for skewness in the bootstrap
                        distribution. Accounts for how the standard error changes with the parameter value.
                      </Typography>
                    </Box>

                    <Alert severity="success" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>Why BCa Is Better:</strong> BCa has been shown to have better
                        coverage properties than percentile or basic methods, especially when:
                        <br />• The statistic is transformation-sensitive
                        <br />• The data is skewed
                        <br />• The sample size is moderate (n = 30-100)
                      </Typography>
                    </Alert>

                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                      Trade-offs
                    </Typography>

                    <Typography variant="body2">
                      BCa requires more computation (needs jackknife estimates for acceleration).
                      But with modern computers, this is rarely a problem. It's the recommended
                      method in most situations.
                    </Typography>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </MathJax>
          </Paper>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
            <Button variant="outlined" onClick={() => setActiveSection(1)}>
              Back
            </Button>
            <Button variant="contained" onClick={() => setActiveSection(3)}>
              Next: Try It Yourself
            </Button>
          </Box>
        </>
      )}

      {/* Section 3: Interactive Simulation */}
      {activeSection === 3 && (
        <>
          <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
              🧪 Interactive Bootstrap Simulation
            </Typography>

            <Typography paragraph>
              Now it's your turn! Use the interactive simulation below to explore bootstrap
              confidence intervals for different statistics and distributions.
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Suggested Experiments:</strong>
                <br />
                1. <strong>Bootstrap for Median:</strong> Choose a skewed distribution (e.g., Log-normal),
                compute bootstrap CI for the median. Compare percentile, basic, and BCa methods.
                <br /><br />
                2. <strong>Bootstrap for Correlation:</strong> Generate correlated data and compute
                bootstrap CI for the correlation coefficient. Traditional methods struggle here!
                <br /><br />
                3. <strong>Small Sample Magic:</strong> Try n=10 with a weird distribution. Watch
                bootstrap work where t-intervals fail.
              </Typography>
            </Alert>

            <Box sx={{ mt: 3 }}>
              <BootstrapSimulation />
            </Box>
          </Paper>

          <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              🎓 Understanding the Results
            </Typography>

            <Typography paragraph>
              After running the simulation, pay attention to:
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Bootstrap Distribution
                    </Typography>
                    <Typography variant="body2">
                      The histogram shows the distribution of your bootstrap statistics. Its shape
                      tells you about the sampling distribution — is it symmetric, skewed, bimodal?
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Interval Comparison
                    </Typography>
                    <Typography variant="body2">
                      Compare the three methods (percentile, basic, BCa). For symmetric distributions,
                      they're similar. For skewed data, BCa often performs best.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Standard Error
                    </Typography>
                    <Typography variant="body2">
                      The standard deviation of the bootstrap distribution estimates the standard
                      error of your statistic — no formula needed!
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Coverage Check
                    </Typography>
                    <Typography variant="body2">
                      If you know the true parameter, check if it falls in the interval. Run multiple
                      simulations to estimate actual coverage probability.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
            <Button variant="outlined" onClick={() => setActiveSection(2)}>
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
            • Bootstrap works by <strong>resampling with replacement</strong> from your sample
          </Typography>
          <Typography paragraph>
            • The bootstrap distribution approximates the <strong>sampling distribution</strong>
          </Typography>
          <Typography paragraph>
            • Three main CI methods: <strong>Percentile</strong> (simple), <strong>Basic</strong> (reflected),
            <strong> BCa</strong> (bias-corrected)
          </Typography>
          <Typography paragraph>
            • Bootstrap <strong>doesn't assume normality</strong> — works for any distribution
          </Typography>
          <Typography paragraph>
            • Can compute CIs for <strong>any statistic</strong> (median, correlation, ratio, etc.)
          </Typography>
          <Typography paragraph>
            • BCa method generally has the <strong>best coverage properties</strong>
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

export default Lesson03_Bootstrap;
