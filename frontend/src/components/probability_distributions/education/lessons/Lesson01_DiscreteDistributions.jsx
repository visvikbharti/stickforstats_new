import React, { useState } from 'react';
import { alpha } from '@mui/material/styles';
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
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CasinoIcon from '@mui/icons-material/Casino';
import { MathJax } from 'better-react-mathjax';

// Import existing DistributionAnimation component
import DistributionAnimation from '../../educational/DistributionAnimation';

/**
 * Lesson 1: Discrete Distributions
 *
 * Introduction to discrete probability distributions
 * Covers Binomial and Poisson distributions with interactive examples
 */

const Lesson01_DiscreteDistributions = ({ onComplete }) => {
  const [activeDistribution, setActiveDistribution] = useState(0);

  const distributions = [
    {
      name: 'Binomial',
      type: 'BINOMIAL',
      description: 'Fixed trials, binary outcomes (success/failure)',
      realWorldExamples: [
        'Flipping a coin 10 times — how many heads?',
        'Testing 100 products — how many defective?',
        'Clinical trial with 50 patients — how many respond?'
      ],
      whenToUse: 'Fixed number of independent trials, each with same probability of success',
      parameters: ['n (number of trials)', 'p (probability of success)'],
      meanFormula: 'np',
      varianceFormula: 'np(1-p)'
    },
    {
      name: 'Poisson',
      type: 'POISSON',
      description: 'Counting rare events in fixed interval',
      realWorldExamples: [
        'Emails arriving per hour',
        'Defects per 1000 units manufactured',
        'Customer arrivals at a store per minute'
      ],
      whenToUse: 'Counting events in time/space when events are rare and independent',
      parameters: ['λ (lambda - average rate)'],
      meanFormula: 'λ',
      varianceFormula: 'λ'
    }
  ];

  const currentDist = distributions[activeDistribution];

  return (
    <Box>
      {/* Introduction */}
      <Paper elevation={2} sx={{ p: 4, mb: 3, bgcolor: 'background.default' }}>
        <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          Discrete Probability Distributions
        </Typography>

        <Typography variant="h6" paragraph sx={{ mt: 2 }}>
          Modeling Countable Outcomes
        </Typography>

        <Typography paragraph>
          Discrete distributions model <strong>countable</strong> outcomes — things you can list:
          0, 1, 2, 3, ... successes. Unlike continuous distributions (heights, weights), discrete
          distributions assign probabilities to specific integer values.
        </Typography>

        <Alert severity="info" icon={<CasinoIcon />}>
          <Typography variant="body2">
            <strong>Key Characteristic:</strong> Discrete random variables can only take on specific,
            separate values (usually integers). Think: number of heads in 10 coin flips (can be 0, 1, 2,
            ... 10, but not 3.7).
          </Typography>
        </Alert>
      </Paper>

      {/* PMF Explanation */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
          📊 Probability Mass Function (PMF)
        </Typography>

        <MathJax>
          <Typography paragraph>
            For discrete distributions, we use the <strong>Probability Mass Function (PMF)</strong>
            to specify the probability of each possible value:
          </Typography>

          <Typography align="center" paragraph sx={{ fontSize: '1.2rem', my: 3 }}>
            {"\\[ P(X = k) = \\text{probability that random variable } X \\text{ equals } k \\]"}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Properties of PMF
                  </Typography>
                  <Typography variant="body2" paragraph>
                    1. <strong>Non-negative:</strong> {"\\(P(X = k) \\geq 0\\)"} for all k
                  </Typography>
                  <Typography variant="body2" paragraph>
                    2. <strong>Sums to 1:</strong> {"\\(\\sum_{\\text{all } k} P(X = k) = 1\\)"}
                  </Typography>
                  <Typography variant="body2">
                    3. <strong>Discrete values only:</strong> Defined only for specific k values
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: 'background.default', height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    PMF vs PDF
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>PMF (Discrete):</strong> Gives exact probabilities for specific values
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>PDF (Continuous):</strong> Gives probability <em>density</em>,
                    not exact probabilities (covered in Lesson 2)
                  </Typography>
                  <Typography variant="body2">
                    PMF: P(X = 3) = 0.25 means 25% chance of exactly 3<br />
                    PDF: f(x = 3) = 0.25 does NOT mean 25% chance of exactly 3
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </MathJax>
      </Paper>

      {/* Distribution Selector */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
          🎯 Explore Discrete Distributions
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
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
          {currentDist.name} Distribution
        </Typography>

        <Typography variant="h6" paragraph color="text.secondary">
          {currentDist.description}
        </Typography>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
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
            <Card sx={{ bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
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
            <Card sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
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
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
          📚 Deep Dive: {currentDist.name} Distribution
        </Typography>

        {activeDistribution === 0 && (
          // Binomial Deep Dive
          <MathJax>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Formula Derivation
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  The Binomial PMF gives the probability of exactly k successes in n trials:
                </Typography>
                <Typography align="center" paragraph sx={{ fontSize: '1.2rem' }}>
                  {"\\[ P(X = k) = \\binom{n}{k} p^k (1-p)^{n-k} \\]"}
                </Typography>
                <Typography paragraph>
                  Where:
                </Typography>
                <Typography paragraph sx={{ ml: 2 }}>
                  • {"\\(\\binom{n}{k} = \\frac{n!}{k!(n-k)!}\\)"} — number of ways to choose k successes from n trials
                  <br />
                  • {"\\(p^k\\)"} — probability of k successes
                  <br />
                  • {"\\((1-p)^{n-k}\\)"} — probability of (n - k) failures
                </Typography>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Example:</strong> Flip 10 coins (n=10), each with p=0.5 chance of heads.
                    What's P(X = 3 heads)?
                    <br />
                    {"\\(P(X = 3) = \\binom{10}{3} (0.5)^3 (0.5)^7 = 120 \\times 0.125 \\times 0.0078 \\approx 0.117\\)"}
                    <br />
                    About 11.7% chance of exactly 3 heads.
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Assumptions
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  The Binomial distribution requires three key assumptions:
                </Typography>
                <Typography paragraph sx={{ ml: 2 }}>
                  1. <strong>Fixed number of trials (n):</strong> You know in advance how many trials you'll run
                  <br />
                  2. <strong>Independent trials:</strong> The outcome of one trial doesn't affect others
                  <br />
                  3. <strong>Constant probability (p):</strong> Each trial has the same probability of success
                </Typography>
                <Alert severity="warning">
                  <Typography variant="body2">
                    <strong>When Binomial Fails:</strong> If sampling without replacement from a small
                    population, trials are NOT independent → use Hypergeometric distribution instead.
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Shape and Symmetry
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  The shape of the Binomial distribution depends on p:
                </Typography>
                <Typography paragraph sx={{ ml: 2 }}>
                  • <strong>p = 0.5:</strong> Symmetric bell shape (centered at n/2)
                  <br />
                  • <strong>p {"<"} 0.5:</strong> Skewed right (more mass on left)
                  <br />
                  • <strong>p {">"} 0.5:</strong> Skewed left (more mass on right)
                </Typography>
                <Typography paragraph>
                  As n increases, the distribution becomes more bell-shaped (approaches Normal distribution).
                </Typography>
              </AccordionDetails>
            </Accordion>
          </MathJax>
        )}

        {activeDistribution === 1 && (
          // Poisson Deep Dive
          <MathJax>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Formula Derivation
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  The Poisson PMF gives the probability of exactly k events in a fixed interval:
                </Typography>
                <Typography align="center" paragraph sx={{ fontSize: '1.2rem' }}>
                  {"\\[ P(X = k) = \\frac{e^{-\\lambda} \\lambda^k}{k!} \\]"}
                </Typography>
                <Typography paragraph>
                  Where:
                </Typography>
                <Typography paragraph sx={{ ml: 2 }}>
                  • {"\\(\\lambda\\)"} (lambda) — average number of events per interval
                  <br />
                  • {"\\(e \\approx 2.71828\\)"} — Euler's number
                  <br />
                  • {"\\(k!\\)"} — k factorial
                </Typography>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Example:</strong> A call center receives an average of λ=5 calls per hour.
                    What's P(X = 3 calls in next hour)?
                    <br />
                    {"\\(P(X = 3) = \\frac{e^{-5} \\times 5^3}{3!} = \\frac{0.0067 \\times 125}{6} \\approx 0.140\\)"}
                    <br />
                    About 14% chance of exactly 3 calls.
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  When to Use Poisson
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  Use the Poisson distribution when:
                </Typography>
                <Typography paragraph sx={{ ml: 2 }}>
                  1. <strong>Counting events in fixed interval:</strong> Time, space, volume, etc.
                  <br />
                  2. <strong>Events are rare:</strong> Low probability of occurrence at any instant
                  <br />
                  3. <strong>Events are independent:</strong> One event doesn't affect probability of others
                  <br />
                  4. <strong>Constant average rate:</strong> λ doesn't change over time/space
                </Typography>
                <Alert severity="success">
                  <Typography variant="body2">
                    <strong>Classic Examples:</strong> Radioactive decay, traffic accidents at an
                    intersection, typos per page, customer arrivals, network packets per second.
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Poisson as Limit of Binomial
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  The Poisson distribution emerges as a limiting case of the Binomial distribution:
                </Typography>
                <Typography align="center" paragraph sx={{ fontSize: '1.1rem' }}>
                  {"\\[ \\text{Binomial}(n, p) \\xrightarrow{n \\to \\infty, p \\to 0, np = \\lambda} \\text{Poisson}(\\lambda) \\]"}
                </Typography>
                <Typography paragraph>
                  In plain English: When n is large and p is small, Binomial {"≈"} Poisson with λ = np.
                </Typography>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Rule of Thumb:</strong> Use Poisson approximation when n {"≥"} 20 and p {"≤"} 0.05
                    (or n {"≥"} 100 and np {"≤"} 10).
                  </Typography>
                </Alert>
                <Typography paragraph sx={{ mt: 2 }}>
                  <strong>Why this works:</strong> Imagine dividing time into n tiny intervals. In each interval,
                  there's a small probability p of an event. As n → ∞ and p → 0 (but np = λ stays constant),
                  the Binomial distribution converges to Poisson.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Special Property: Mean = Variance
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  A unique property of the Poisson distribution:
                </Typography>
                <Typography align="center" paragraph sx={{ fontSize: '1.2rem' }}>
                  {"\\[ E[X] = \\text{Var}(X) = \\lambda \\]"}
                </Typography>
                <Typography paragraph>
                  This is a <strong>diagnostic</strong> property. If your count data has mean ≈ variance,
                  Poisson is likely a good model. If variance {">"} mean, consider Negative Binomial
                  (overdispersion). If variance {"<"} mean, data might be underdispersed.
                </Typography>
                <Alert severity="warning">
                  <Typography variant="body2">
                    <strong>Testing for Poisson:</strong> Plot sample mean vs sample variance. If they're
                    approximately equal, Poisson is appropriate. If variance is much larger (common in real
                    data), use overdispersed models.
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>
          </MathJax>
        )}
      </Paper>

      {/* Comparison Table */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
          📋 Quick Reference: Binomial vs Poisson
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Binomial
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Fixed trials:</strong> You know n in advance
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Binary outcomes:</strong> Each trial is success/failure
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Parameters:</strong> n (trials), p (success probability)
                </Typography>
                <Typography variant="body2">
                  <strong>Examples:</strong> Coin flips, quality control sampling, A/B test conversions
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: 'success.dark' }}>
                  Poisson
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Unlimited trials:</strong> No fixed upper bound on counts
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Rare events:</strong> Low probability, but many opportunities
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Parameters:</strong> λ (average rate)
                </Typography>
                <Typography variant="body2">
                  <strong>Examples:</strong> Website visits per hour, defects per batch, emails per day
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary and Completion */}
      <Paper elevation={3} sx={{ p: 4, mt: 4, bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'success.dark' }}>
          ✅ Key Takeaways
        </Typography>

        <MathJax>
          <Box sx={{ pl: 2 }}>
            <Typography paragraph>
              • <strong>Discrete distributions model countable outcomes</strong> — 0, 1, 2, 3, ...
            </Typography>
            <Typography paragraph>
              • <strong>PMF gives exact probabilities</strong> — P(X = k) for specific values k
            </Typography>
            <Typography paragraph>
              • <strong>Binomial: Fixed n trials, binary outcomes</strong> — Use when you know # of trials
            </Typography>
            <Typography paragraph>
              • <strong>Poisson: Counting rare events</strong> — Use for event rates in time/space
            </Typography>
            <Typography paragraph>
              • <strong>Poisson approximates Binomial</strong> — When n large, p small, use Poisson(np)
            </Typography>
            <Typography paragraph>
              • <strong>Check assumptions!</strong> — Independent trials, constant probability
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

export default Lesson01_DiscreteDistributions;
