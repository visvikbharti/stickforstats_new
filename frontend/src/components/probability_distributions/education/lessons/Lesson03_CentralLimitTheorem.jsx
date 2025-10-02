import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Button,
  Grid,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { MathJax } from 'better-react-mathjax';

// Import existing CLT Simulator
import CLTSimulator from '../../educational/CLTSimulator';

/**
 * Lesson 3: Central Limit Theorem
 *
 * The most important theorem in statistics — why averages are normal
 * Uses existing CLTSimulator for interactive demonstration
 */

const Lesson03_CentralLimitTheorem = ({ onComplete }) => {
  return (
    <Box>
      {/* Introduction */}
      <Paper elevation={2} sx={{ p: 4, mb: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#1976d2', fontWeight: 600 }}>
          The Central Limit Theorem
        </Typography>

        <Typography variant="h6" paragraph sx={{ mt: 2 }}>
          The Most Important Theorem in Statistics
        </Typography>

        <Typography paragraph>
          You've learned about different distributions — some symmetric (Normal), some skewed (Exponential),
          some uniform. But here's the magic: <strong>no matter what distribution your data comes from,
          the average of many samples follows a Normal distribution!</strong>
        </Typography>

        <Alert severity="success" icon={<TrendingUpIcon />}>
          <Typography variant="body2">
            <strong>Why This Matters:</strong> The CLT is why we can use Normal-based methods (z-tests,
            t-tests, confidence intervals) even when data isn't Normal. It's the foundation of statistical
            inference.
          </Typography>
        </Alert>
      </Paper>

      {/* The Theorem */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
          📜 The Central Limit Theorem (CLT)
        </Typography>

        <MathJax>
          <Box sx={{ p: 3, bgcolor: '#e3f2fd', borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Formal Statement
            </Typography>

            <Typography paragraph>
              Let {"\\(X_1, X_2, \\ldots, X_n\\)"} be independent random variables from <em>any</em> distribution
              with mean μ and finite variance σ². Define the sample mean:
            </Typography>

            <Typography align="center" paragraph sx={{ fontSize: '1.2rem' }}>
              {"\\[ \\bar{X} = \\frac{1}{n}\\sum_{i=1}^{n} X_i \\]"}
            </Typography>

            <Typography paragraph>
              Then as n → ∞, the distribution of {"\\(\\bar{X}\\)"} approaches:
            </Typography>

            <Typography align="center" paragraph sx={{ fontSize: '1.2rem' }}>
              {"\\[ \\bar{X} \\sim N\\left(\\mu, \\frac{\\sigma^2}{n}\\right) \\]"}
            </Typography>

            <Typography variant="body2">
              Or equivalently, the <strong>standardized</strong> sample mean approaches a standard Normal:
            </Typography>

            <Typography align="center" sx={{ fontSize: '1.1rem', mt: 2 }}>
              {"\\[ Z = \\frac{\\bar{X} - \\mu}{\\sigma/\\sqrt{n}} \\sim N(0, 1) \\]"}
            </Typography>
          </Box>

          <Typography variant="h6" gutterBottom>
            What This Means in Plain English
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Chip label="1" color="primary" size="small" sx={{ mb: 1 }} />
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                    Any Distribution → Normal Averages
                  </Typography>
                  <Typography variant="body2">
                    Start with <em>any</em> distribution (Uniform, Exponential, Binomial, even weird custom ones).
                    Take many samples and compute their means. The distribution of those means will be Normal!
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Chip label="2" color="primary" size="small" sx={{ mb: 1 }} />
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                    Larger Sample → More Normal
                  </Typography>
                  <Typography variant="body2">
                    As sample size n increases, the approximation gets better. For most distributions,
                    n ≥ 30 is sufficient. For highly skewed distributions, you might need n ≥ 100.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Chip label="3" color="primary" size="small" sx={{ mb: 1 }} />
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                    Mean Stays the Same
                  </Typography>
                  <Typography variant="body2">
                    The mean of {"\\(\\bar{X}\\)"} equals the mean of the original distribution (μ).
                    Averaging doesn't change the center, just reduces the spread.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Chip label="4" color="primary" size="small" sx={{ mb: 1 }} />
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                    Variance Shrinks by 1/n
                  </Typography>
                  <Typography variant="body2">
                    The variance of {"\\(\\bar{X}\\)"} is {"\\(\\sigma^2/n\\)"}, so standard error
                    is {"\\(\\sigma/\\sqrt{n}\\)"}. Larger samples give more precise estimates.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </MathJax>
      </Paper>

      {/* Interactive CLT Simulator */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
          🎮 Interactive CLT Demonstration
        </Typography>

        <Typography paragraph>
          Watch the CLT in action! Choose any distribution and sample size. See how the sampling
          distribution of the mean becomes Normal as n increases.
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Try This Experiment:</strong>
            <br />
            1. Choose "Exponential" (highly skewed distribution)
            <br />
            2. Set sample size n = 5. Take many samples. The distribution of means is still skewed.
            <br />
            3. Increase n to 30. Watch the distribution of means become Normal!
            <br />
            4. Try n = 100. Even more Normal!
          </Typography>
        </Alert>

        <Box sx={{ mt: 3 }}>
          <CLTSimulator />
        </Box>
      </Paper>

      {/* Why It Works */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
          🤔 Why Does the CLT Work?
        </Typography>

        <Typography paragraph>
          The intuition behind the CLT involves three key ideas:
        </Typography>

        <MathJax>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    1. Averaging Cancels Extremes
                  </Typography>
                  <Typography variant="body2" paragraph>
                    When you average many random values, extreme high and extreme low values tend to cancel
                    out. This "smoothing" effect naturally pushes the distribution toward the middle.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    2. Sum of Many Small Contributions
                  </Typography>
                  <Typography variant="body2" paragraph>
                    The sample mean is the sum of n independent contributions, each scaled by 1/n. By the
                    law of large numbers, this sum converges to a predictable value (μ), with deviations
                    following a Normal pattern.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    3. Variance Accumulates Predictably
                  </Typography>
                  <Typography variant="body2" paragraph>
                    When you add independent random variables, their variances add:
                    {"\\[ \\text{Var}(X_1 + X_2 + \\cdots + X_n) = n\\sigma^2 \\]"}
                    <br />
                    Dividing by n² to get the mean's variance gives {"\\(\\sigma^2/n\\)"}, which shrinks
                    as n grows.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </MathJax>
      </Paper>

      {/* Applications */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
          🚀 Why the CLT is So Important
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#e8f5e9', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32' }}>
                  Confidence Intervals
                </Typography>
                <Typography variant="body2">
                  Even if data isn't Normal, sample means are approximately Normal (by CLT). So we can
                  use t-intervals and z-intervals for means with confidence!
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#e8f5e9', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32' }}>
                  Hypothesis Tests
                </Typography>
                <Typography variant="body2">
                  z-tests and t-tests rely on the assumption that the test statistic follows a Normal
                  distribution. The CLT guarantees this for large samples, regardless of data distribution.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#e3f2fd', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
                  Quality Control
                </Typography>
                <Typography variant="body2">
                  Control charts for process means work because sample means are Normal (by CLT), even if
                  individual measurements aren't.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#e3f2fd', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
                  Survey Sampling
                </Typography>
                <Typography variant="body2">
                  Pollsters use the CLT to construct margins of error. Even though individual responses
                  are binary (yes/no), the sample proportion (an average) is approximately Normal.
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

        <Box sx={{ pl: 2 }}>
          <Typography paragraph>
            • <strong>CLT = Averages are Normal</strong> — regardless of the original distribution
          </Typography>
          <Typography paragraph>
            • <strong>Larger n → Better approximation</strong> — typically n ≥ 30 is sufficient
          </Typography>
          <Typography paragraph>
            • <strong>Mean unchanged, variance shrinks</strong> — {"\\(\\mu\\)"} stays same, {"\\(\\sigma^2/n\\)"} decreases
          </Typography>
          <Typography paragraph>
            • <strong>Foundation of inference</strong> — enables t-tests, z-tests, confidence intervals
          </Typography>
          <Typography paragraph>
            • <strong>Works for any distribution</strong> — Uniform, Exponential, Binomial, custom distributions
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

export default Lesson03_CentralLimitTheorem;
