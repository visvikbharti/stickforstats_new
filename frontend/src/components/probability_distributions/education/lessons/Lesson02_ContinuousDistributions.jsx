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
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TimelineIcon from '@mui/icons-material/Timeline';
import { MathJax } from 'better-react-mathjax';

// Import existing DistributionAnimation component
import DistributionAnimation from '../../educational/DistributionAnimation';

/**
 * Lesson 2: Continuous Distributions
 *
 * Introduction to continuous probability distributions
 * Covers Normal and Exponential distributions with interactive examples
 */

const Lesson02_ContinuousDistributions = ({ onComplete }) => {
  const [activeDistribution, setActiveDistribution] = useState(0);

  const distributions = [
    {
      name: 'Normal (Gaussian)',
      type: 'NORMAL',
      description: 'The bell curve — symmetric, unbounded, defined by mean and standard deviation',
      realWorldExamples: [
        'Human heights — mean ≈ 170 cm, σ ≈ 10 cm',
        'IQ scores — mean = 100, σ = 15',
        'Measurement errors in lab experiments',
        'Test scores (when large sample and central limit applies)'
      ],
      whenToUse: 'Continuous data that is symmetric, results from many small independent effects',
      parameters: ['μ (mean)', 'σ (standard deviation)'],
      meanFormula: 'μ',
      varianceFormula: 'σ²'
    },
    {
      name: 'Exponential',
      type: 'EXPONENTIAL',
      description: 'Waiting times — time until first event in Poisson process',
      realWorldExamples: [
        'Time between customer arrivals at a store',
        'Lifespan of electronic components',
        'Time until next earthquake',
        'Duration between phone calls to a call center'
      ],
      whenToUse: 'Modeling time between independent events (memoryless property)',
      parameters: ['λ (rate parameter)'],
      meanFormula: '1/λ',
      varianceFormula: '1/λ²'
    }
  ];

  const currentDist = distributions[activeDistribution];

  return (
    <Box>
      {/* Introduction */}
      <Paper elevation={2} sx={{ p: 4, mb: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#1976d2', fontWeight: 600 }}>
          Continuous Probability Distributions
        </Typography>

        <Typography variant="h6" paragraph sx={{ mt: 2 }}>
          Modeling Measurements and Waiting Times
        </Typography>

        <Typography paragraph>
          Continuous distributions model <strong>measurable quantities</strong> that can take on
          <em> any value</em> within a range — heights, weights, times, temperatures. Unlike discrete
          distributions (which jump from 0 to 1 to 2), continuous distributions are smooth curves.
        </Typography>

        <Alert severity="info" icon={<TimelineIcon />}>
          <Typography variant="body2">
            <strong>Key Difference from Discrete:</strong> For continuous random variables,
            P(X = exact value) = 0! Instead, we calculate P(a {"<"} X {"<"} b) — probability of
            being in a <em>range</em>. This is why we use PDF (density) instead of PMF (mass).
          </Typography>
        </Alert>
      </Paper>

      {/* PDF and CDF Explanation */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
          📊 PDF and CDF for Continuous Distributions
        </Typography>

        <MathJax>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: '#e3f2fd', height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Probability Density Function (PDF)
                  </Typography>
                  <Typography variant="body2" paragraph>
                    The PDF, denoted f(x), gives the <strong>relative likelihood</strong> of values.
                    It does NOT give probabilities directly!
                  </Typography>
                  <Typography align="center" paragraph sx={{ fontSize: '1.1rem' }}>
                    {"\\[ P(a < X < b) = \\int_a^b f(x) \\, dx \\]"}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Properties:</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    • f(x) ≥ 0 for all x<br />
                    • {"\\(\\int_{-\\infty}^{\\infty} f(x) \\, dx = 1\\)"}<br />
                    • f(x) can be {">"} 1 (it's a density, not probability!)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: '#f5f5f5', height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Cumulative Distribution Function (CDF)
                  </Typography>
                  <Typography variant="body2" paragraph>
                    The CDF, denoted F(x), gives the probability that X ≤ x:
                  </Typography>
                  <Typography align="center" paragraph sx={{ fontSize: '1.1rem' }}>
                    {"\\[ F(x) = P(X \\leq x) = \\int_{-\\infty}^x f(t) \\, dt \\]"}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Properties:</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    • F(x) ranges from 0 to 1<br />
                    • F(x) is non-decreasing<br />
                    • F(-∞) = 0, F(∞) = 1
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Alert severity="warning">
                <Typography variant="body2">
                  <strong>Common Misconception:</strong> If f(x) = 0.4, does that mean P(X = x) = 40%?
                  <br />
                  <strong>NO!</strong> f(x) is a density, not a probability. For continuous distributions,
                  P(X = any exact value) = 0. To find probabilities, integrate the PDF over a range or
                  use the CDF.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </MathJax>
      </Paper>

      {/* Distribution Selector */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
          🎯 Explore Continuous Distributions
        </Typography>

        <Tabs
          value={activeDistribution}
          onChange={(e, newValue) => setActiveDistribution(newValue)}
          variant="fullWidth"
        >
          {distributions.map((dist, idx) => (
            <Tab key={idx} label={dist.name} />
          ))}
        </Tabs>
      </Paper>

      {/* Distribution Overview */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
          {currentDist.name} Distribution
        </Typography>

        <Typography variant="h6" paragraph color="text.secondary">
          {currentDist.description}
        </Typography>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#e8f5e9', height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  When to Use
                </Typography>
                <Typography variant="body2">
                  {currentDist.whenToUse}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#fff3e0', height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Parameters
                </Typography>
                {currentDist.parameters.map((param, idx) => (
                  <Typography key={idx} variant="body2">
                    • {param}
                  </Typography>
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#e3f2fd', height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Mean & Variance
                </Typography>
                <MathJax>
                  <Typography variant="body2">
                    Mean: {"\\(E[X] = \\)"}{currentDist.meanFormula}
                  </Typography>
                  <Typography variant="body2">
                    Variance: {"\\(\\text{Var}(X) = \\)"}{currentDist.varianceFormula}
                  </Typography>
                </MathJax>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Real-World Examples:</strong>
          </Typography>
          {currentDist.realWorldExamples.map((example, idx) => (
            <Typography key={idx} variant="body2" sx={{ ml: 2 }}>
              • {example}
            </Typography>
          ))}
        </Alert>

        {/* Interactive Simulation */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Interactive Visualization
          </Typography>
          <Typography variant="body2" paragraph color="text.secondary">
            Play the animation below to see how the {currentDist.name} distribution works.
            Adjust the parameters using the sliders to see how they affect the shape of the distribution.
          </Typography>

          <DistributionAnimation type={currentDist.type} />
        </Box>
      </Paper>

      {/* Deep Dives */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
          📚 Deep Dive: {currentDist.name} Distribution
        </Typography>

        {activeDistribution === 0 && (
          // Normal Deep Dive
          <MathJax>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  The Normal PDF Formula
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  The Normal (Gaussian) distribution has the iconic bell-shaped PDF:
                </Typography>
                <Typography align="center" paragraph sx={{ fontSize: '1.2rem' }}>
                  {"\\[ f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2} \\]"}
                </Typography>
                <Typography paragraph>
                  Where:
                </Typography>
                <Typography paragraph sx={{ ml: 2 }}>
                  • μ (mu) — mean, controls the center<br />
                  • σ (sigma) — standard deviation, controls the spread<br />
                  • π ≈ 3.14159, e ≈ 2.71828 (mathematical constants)
                </Typography>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Why this formula?</strong> The exponential {"\\(-\\frac{1}{2}z^2\\)"} term creates
                    the symmetric bell shape. The coefficient {"\\(\\frac{1}{\\sigma\\sqrt{2\\pi}}\\)"} ensures
                    the area under the curve equals 1 (total probability).
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  The 68-95-99.7 Rule
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  The <strong>Empirical Rule</strong> states that for a Normal distribution:
                </Typography>
                <Typography paragraph sx={{ ml: 2 }}>
                  • <strong>68%</strong> of data falls within <strong>1 standard deviation</strong> of the mean
                  (μ ± σ)<br />
                  • <strong>95%</strong> within <strong>2 standard deviations</strong> (μ ± 2σ)<br />
                  • <strong>99.7%</strong> within <strong>3 standard deviations</strong> (μ ± 3σ)
                </Typography>
                <Alert severity="success">
                  <Typography variant="body2">
                    <strong>Example:</strong> Heights have μ = 170 cm, σ = 10 cm
                    <br />
                    • 68% of people are between 160-180 cm (170 ± 10)
                    <br />
                    • 95% are between 150-190 cm (170 ± 20)
                    <br />
                    • 99.7% are between 140-200 cm (170 ± 30)
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Standard Normal Distribution (Z-Distribution)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  The <strong>Standard Normal</strong> distribution has μ = 0 and σ = 1. Any Normal
                  distribution can be standardized using the z-score transformation:
                </Typography>
                <Typography align="center" paragraph sx={{ fontSize: '1.2rem' }}>
                  {"\\[ Z = \\frac{X - \\mu}{\\sigma} \\]"}
                </Typography>
                <Typography paragraph>
                  Z represents "how many standard deviations away from the mean" a value is.
                </Typography>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Example:</strong> If heights have μ = 170 cm, σ = 10 cm, and you're 185 cm tall:
                    <br />
                    {"\\[ Z = \\frac{185 - 170}{10} = 1.5 \\]"}
                    <br />
                    You're 1.5 standard deviations above the mean. Using a Z-table, P(Z {"<"} 1.5) ≈ 0.933,
                    meaning you're taller than ~93% of people.
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Why Is the Normal So Important?
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  The Normal distribution is the <strong>most important distribution in statistics</strong>
                  for several reasons:
                </Typography>
                <Typography paragraph sx={{ ml: 2 }}>
                  1. <strong>Central Limit Theorem:</strong> Sample means are approximately Normal, regardless
                  of the original distribution (covered in Lesson 3)
                  <br /><br />
                  2. <strong>Mathematical tractability:</strong> Many statistical methods (t-tests, ANOVA,
                  regression) assume Normality because it simplifies calculations
                  <br /><br />
                  3. <strong>Natural occurrence:</strong> Many phenomena result from sums of small independent
                  effects → CLT → Normal distribution
                  <br /><br />
                  4. <strong>Maximum entropy:</strong> Given only mean and variance, Normal distribution has
                  the highest entropy (least informative/most conservative choice)
                </Typography>
              </AccordionDetails>
            </Accordion>
          </MathJax>
        )}

        {activeDistribution === 1 && (
          // Exponential Deep Dive
          <MathJax>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  The Exponential PDF and CDF
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  The Exponential distribution models waiting times until the first event:
                </Typography>
                <Typography align="center" paragraph sx={{ fontSize: '1.2rem' }}>
                  {"\\[ f(x) = \\lambda e^{-\\lambda x}, \\quad x \\geq 0 \\]"}
                </Typography>
                <Typography paragraph>
                  The CDF (probability of waiting at most x time units) has a simple closed form:
                </Typography>
                <Typography align="center" paragraph sx={{ fontSize: '1.2rem' }}>
                  {"\\[ F(x) = P(X \\leq x) = 1 - e^{-\\lambda x} \\]"}
                </Typography>
                <Typography paragraph>
                  Where λ (lambda) is the <strong>rate parameter</strong> — average number of events per
                  time unit. The mean waiting time is 1/λ.
                </Typography>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Example:</strong> Customers arrive at rate λ = 5 per hour. What's the probability
                    of waiting at most 10 minutes (1/6 hour) for the next customer?
                    <br />
                    {"\\[ P(X \\leq 1/6) = 1 - e^{-5 \\times 1/6} = 1 - e^{-0.833} \\approx 0.565 \\]"}
                    <br />
                    About 56.5% chance.
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  The Memoryless Property
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  The Exponential distribution has a unique <strong>memoryless property</strong>:
                </Typography>
                <Typography align="center" paragraph sx={{ fontSize: '1.1rem' }}>
                  {"\\[ P(X > s + t \\mid X > s) = P(X > t) \\]"}
                </Typography>
                <Typography paragraph>
                  In plain English: If you've already waited s time units without an event occurring,
                  the probability of waiting <em>an additional</em> t time units is the same as if you
                  had just started waiting. <strong>The distribution "forgets" how long you've waited.</strong>
                </Typography>
                <Alert severity="warning">
                  <Typography variant="body2">
                    <strong>Example:</strong> You've been waiting 10 minutes for a bus (which arrives
                    exponentially). The probability of waiting another 5 minutes is the same as if you
                    had just arrived at the bus stop — the distribution doesn't "remember" your 10-minute wait!
                  </Typography>
                </Alert>
                <Typography paragraph sx={{ mt: 2 }}>
                  This property makes the Exponential distribution unrealistic for many real-world scenarios
                  (e.g., component lifetimes often have "wear-out" effects that violate memorylessness).
                  However, it's mathematically convenient and a good approximation for many processes.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Connection to Poisson Process
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  The Exponential distribution is intimately connected to the Poisson distribution:
                </Typography>
                <Typography paragraph sx={{ ml: 2 }}>
                  • <strong>Poisson:</strong> Counts the <em>number of events</em> in a fixed time interval
                  <br />
                  • <strong>Exponential:</strong> Measures the <em>time until the first event</em>
                </Typography>
                <Typography paragraph>
                  If events occur according to a Poisson process with rate λ, then:
                </Typography>
                <Typography paragraph sx={{ ml: 2 }}>
                  • The time until the first event ~ Exponential(λ)
                  <br />
                  • The time between consecutive events ~ Exponential(λ)
                </Typography>
                <Alert severity="success">
                  <Typography variant="body2">
                    <strong>Example:</strong> Calls arrive at a call center at λ = 10 calls/hour (Poisson).
                    <br />
                    • Poisson(10): P(exactly 8 calls in next hour)
                    <br />
                    • Exponential(10): P(next call arrives within 6 minutes)
                    <br />
                    Same underlying process, different questions!
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Mean and Variance Relationship
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  For the Exponential(λ) distribution:
                </Typography>
                <Typography align="center" paragraph sx={{ fontSize: '1.2rem' }}>
                  {"\\[ E[X] = \\frac{1}{\\lambda}, \\quad \\text{Var}(X) = \\frac{1}{\\lambda^2} \\]"}
                </Typography>
                <Typography paragraph>
                  Notice that Var(X) = [E[X]]². This means:
                </Typography>
                <Typography align="center" paragraph sx={{ fontSize: '1.1rem' }}>
                  {"\\[ \\text{Standard Deviation} = \\sqrt{\\text{Var}(X)} = \\frac{1}{\\lambda} = \\text{Mean} \\]"}
                </Typography>
                <Typography paragraph>
                  The standard deviation equals the mean! This is a <strong>diagnostic property</strong> —
                  if your positive continuous data has SD ≈ mean, Exponential might be a good model.
                </Typography>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Coefficient of Variation:</strong> CV = σ/μ = 1 for all Exponential distributions.
                    This constant CV is unique to the Exponential family.
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>
          </MathJax>
        )}
      </Paper>

      {/* Comparison Table */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
          📋 Quick Reference: Normal vs Exponential
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#e3f2fd' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Normal (Gaussian)
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Shape:</strong> Symmetric bell curve
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Range:</strong> (-∞, +∞) — unbounded
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Parameters:</strong> μ (mean), σ (standard deviation)
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Properties:</strong> 68-95-99.7 rule, CLT foundation
                </Typography>
                <Typography variant="body2">
                  <strong>Examples:</strong> Heights, IQ scores, measurement errors, aggregated data
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#e8f5e9' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32' }}>
                  Exponential
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Shape:</strong> Skewed right, decreasing
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Range:</strong> [0, +∞) — non-negative only
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Parameters:</strong> λ (rate)
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Properties:</strong> Memoryless, mean = SD = 1/λ
                </Typography>
                <Typography variant="body2">
                  <strong>Examples:</strong> Waiting times, time between arrivals, component lifetimes
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary and Completion */}
      <Paper elevation={3} sx={{ p: 4, mt: 4, bgcolor: '#e8f5e9' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#388e3c' }}>
          ✅ Key Takeaways
        </Typography>

        <MathJax>
          <Box sx={{ pl: 2 }}>
            <Typography paragraph>
              • <strong>Continuous distributions model measurements</strong> — can take any value in a range
            </Typography>
            <Typography paragraph>
              • <strong>PDF gives density, not probabilities</strong> — integrate to find P(a {"<"} X {"<"} b)
            </Typography>
            <Typography paragraph>
              • <strong>CDF gives cumulative probability</strong> — F(x) = P(X ≤ x)
            </Typography>
            <Typography paragraph>
              • <strong>Normal: Symmetric bell curve</strong> — 68-95-99.7 rule, CLT foundation
            </Typography>
            <Typography paragraph>
              • <strong>Exponential: Waiting times</strong> — Memoryless property, mean = SD
            </Typography>
            <Typography paragraph>
              • <strong>Choose based on data characteristics</strong> — Symmetric vs skewed, bounded vs unbounded
            </Typography>
          </Box>
        </MathJax>

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

export default Lesson02_ContinuousDistributions;
