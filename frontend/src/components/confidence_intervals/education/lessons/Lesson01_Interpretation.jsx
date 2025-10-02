import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Button,
  Card,
  CardContent,
  Grid,
  Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import { MathJax } from 'better-react-mathjax';

// Import existing visualization
import IntervalConstructionAnimation from '../../visualizations/IntervalConstructionAnimation';

/**
 * Lesson 1: What is a Confidence Interval?
 *
 * Teaches correct interpretation of confidence intervals
 * through interactive visualizations and common misconceptions
 */

const Lesson01_Interpretation = ({ onComplete }) => {
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});

  const handleQuizAnswer = (questionId, answer) => {
    setQuizAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  return (
    <Box>
      {/* Introduction */}
      <Paper elevation={2} sx={{ p: 4, mb: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#1976d2', fontWeight: 600 }}>
          What is a Confidence Interval?
        </Typography>

        <Typography variant="h6" paragraph sx={{ mt: 2 }}>
          The Most Misunderstood Concept in Statistics
        </Typography>

        <Typography paragraph>
          A confidence interval is a range of plausible values for an unknown population parameter.
          But what does this really mean? And more importantly, what does it <strong>not</strong> mean?
        </Typography>

        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Critical Insight:</strong> A 95% confidence interval does NOT mean there is a 95%
            probability that the true parameter lies within this specific interval you calculated. This is
            the most common misinterpretation!
          </Typography>
        </Alert>
      </Paper>

      {/* Section 1: The Frequentist Interpretation */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
          📊 The Correct Frequentist Interpretation
        </Typography>

        <Typography paragraph>
          Imagine we repeat our study many, many times, each time:
        </Typography>

        <Box sx={{ pl: 3, mb: 3 }}>
          <Typography paragraph>
            1. Draw a random sample from the population
          </Typography>
          <Typography paragraph>
            2. Calculate the sample mean
          </Typography>
          <Typography paragraph>
            3. Construct a 95% confidence interval
          </Typography>
        </Box>

        <Alert severity="success" icon={<CheckCircleIcon />}>
          <Typography variant="body2">
            <strong>Correct Interpretation:</strong> If we repeat this process many times, about 95% of
            the intervals we construct will contain the true population parameter. The other 5% will not.
          </Typography>
        </Alert>

        <Box sx={{ mt: 3, p: 3, bgcolor: '#e3f2fd', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            The Key Insight
          </Typography>

          <MathJax>
            <Typography paragraph>
              The randomness is in the <strong>sampling process</strong>, not the parameter. The true
              parameter μ is fixed (but unknown). The interval changes each time we take a new sample.
            </Typography>

            <Typography paragraph sx={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>
              {"\\[ P(\\bar{X} - 1.96\\sigma/\\sqrt{n} < \\mu < \\bar{X} + 1.96\\sigma/\\sqrt{n}) = 0.95 \\]"}
            </Typography>

            <Typography variant="body2">
              This says: "The probability that the <em>random interval</em> (which depends on the random
              sample mean X̄) contains the <em>fixed parameter</em> μ is 0.95."
            </Typography>
          </MathJax>
        </Box>
      </Paper>

      {/* Section 2: Interactive Construction */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
          🔧 Interactive: Build Your Own Confidence Intervals
        </Typography>

        <Typography paragraph>
          Use this interactive tool to generate samples and see how the confidence interval changes
          each time. The true population mean is μ = 10.
        </Typography>

        <Box sx={{ mt: 3 }}>
          <IntervalConstructionAnimation
            height={400}
            initialSampleSize={30}
            initialConfidenceLevel={0.95}
          />
        </Box>

        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Try This:</strong> Click "New Sample" multiple times. Notice how the interval
            moves around? Each interval is different because each sample is different. About 95% of
            them contain μ = 10, but any individual interval either does or doesn't.
          </Typography>
        </Alert>
      </Paper>

      {/* Section 3: Common Misconceptions */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
          ⚠️ Common Misconceptions
        </Typography>

        <Grid container spacing={2}>
          {/* Misconception 1 */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', bgcolor: '#ffebee' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ErrorIcon sx={{ color: '#d32f2f', mr: 1 }} />
                  <Typography variant="h6" sx={{ color: '#d32f2f' }}>
                    Misconception #1
                  </Typography>
                </Box>

                <Typography paragraph sx={{ fontStyle: 'italic' }}>
                  "There is a 95% probability that μ lies in this interval [7.2, 9.8]."
                </Typography>

                <Typography variant="body2">
                  <strong>Why it's wrong:</strong> Once you've calculated a specific interval, μ either
                  is or isn't in it. The probability is either 0 or 1 (you just don't know which).
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Misconception 2 */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', bgcolor: '#ffebee' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ErrorIcon sx={{ color: '#d32f2f', mr: 1 }} />
                  <Typography variant="h6" sx={{ color: '#d32f2f' }}>
                    Misconception #2
                  </Typography>
                </Box>

                <Typography paragraph sx={{ fontStyle: 'italic' }}>
                  "95% of the data lies within the confidence interval."
                </Typography>

                <Typography variant="body2">
                  <strong>Why it's wrong:</strong> The confidence interval estimates the population
                  <em> parameter</em> (like the mean), not where individual data points fall. You're
                  thinking of a prediction interval or the range.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Misconception 3 */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', bgcolor: '#ffebee' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ErrorIcon sx={{ color: '#d32f2f', mr: 1 }} />
                  <Typography variant="h6" sx={{ color: '#d32f2f' }}>
                    Misconception #3
                  </Typography>
                </Box>

                <Typography paragraph sx={{ fontStyle: 'italic' }}>
                  "If I collect more samples, I can narrow down where μ is."
                </Typography>

                <Typography variant="body2">
                  <strong>Why it's wrong:</strong> μ is fixed. More samples give you a better
                  <em> estimate</em> (narrower intervals), but don't change where μ actually is.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Correct Statement */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', bgcolor: '#e8f5e9' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CheckCircleIcon sx={{ color: '#388e3c', mr: 1 }} />
                  <Typography variant="h6" sx={{ color: '#388e3c' }}>
                    Correct Statement
                  </Typography>
                </Box>

                <Typography paragraph sx={{ fontStyle: 'italic' }}>
                  "If I repeat this process many times, 95% of my intervals will capture μ."
                </Typography>

                <Typography variant="body2">
                  <strong>Why it's correct:</strong> This correctly identifies that the randomness is
                  in the <em>procedure</em>, not the parameter. The 95% refers to the long-run
                  performance of the method.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Section 4: The Formula Explained */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
          📐 The Standard Formula
        </Typography>

        <MathJax>
          <Box sx={{ p: 3, bgcolor: '#f5f5f5', borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" align="center" gutterBottom>
              {"\\[ \\text{Confidence Interval} = \\bar{x} \\pm t_{\\alpha/2, n-1} \\times \\frac{s}{\\sqrt{n}} \\]"}
            </Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  {"\\(\\bar{x}\\)"} = Sample Mean
                </Typography>
                <Typography variant="body2">
                  Your best point estimate of the population mean μ
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  {"\\(t_{\\alpha/2, n-1}\\)"} = Critical Value
                </Typography>
                <Typography variant="body2">
                  From the t-distribution with n-1 degrees of freedom. For 95% confidence and large n,
                  approximately 1.96
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  {"\\(s\\)"} = Sample Standard Deviation
                </Typography>
                <Typography variant="body2">
                  Measures the spread of your data
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  {"\\(\\frac{s}{\\sqrt{n}}\\)"} = Standard Error
                </Typography>
                <Typography variant="body2">
                  Measures how much the sample mean varies from sample to sample. Decreases as n increases!
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </MathJax>
      </Paper>

      {/* Section 5: Deep Dive (Optional) */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
            <InfoIcon sx={{ mr: 1 }} />
            Deep Dive: Why Does This Work?
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <MathJax>
            <Typography paragraph>
              The confidence interval is based on the sampling distribution of the sample mean. By
              the Central Limit Theorem, for large enough n:
            </Typography>

            <Typography align="center" paragraph>
              {"\\[ \\bar{X} \\sim N\\left(\\mu, \\frac{\\sigma^2}{n}\\right) \\]"}
            </Typography>

            <Typography paragraph>
              This means:
            </Typography>

            <Typography align="center" paragraph>
              {"\\[ \\frac{\\bar{X} - \\mu}{\\sigma/\\sqrt{n}} \\sim N(0, 1) \\]"}
            </Typography>

            <Typography paragraph>
              Since we don't know σ, we use the sample standard deviation s, giving us:
            </Typography>

            <Typography align="center" paragraph>
              {"\\[ \\frac{\\bar{X} - \\mu}{s/\\sqrt{n}} \\sim t_{n-1} \\]"}
            </Typography>

            <Typography paragraph>
              The critical value t<sub>α/2,n-1</sub> is chosen so that:
            </Typography>

            <Typography align="center" paragraph>
              {"\\[ P\\left(-t_{\\alpha/2,n-1} < \\frac{\\bar{X} - \\mu}{s/\\sqrt{n}} < t_{\\alpha/2,n-1}\\right) = 1 - \\alpha \\]"}
            </Typography>

            <Typography paragraph>
              Rearranging this inequality to isolate μ gives us the confidence interval formula!
            </Typography>
          </MathJax>
        </AccordionDetails>
      </Accordion>

      {/* Summary and Completion */}
      <Paper elevation={3} sx={{ p: 4, mt: 4, bgcolor: '#e8f5e9' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#388e3c' }}>
          ✅ Key Takeaways
        </Typography>

        <Box sx={{ pl: 2 }}>
          <Typography paragraph>
            • A confidence interval is about the <strong>procedure</strong>, not any single interval
          </Typography>
          <Typography paragraph>
            • The 95% refers to <strong>long-run coverage</strong> if we repeated the study many times
          </Typography>
          <Typography paragraph>
            • Once calculated, a specific interval either contains μ or doesn't (probability = 0 or 1)
          </Typography>
          <Typography paragraph>
            • The width depends on sample size, variability, and desired confidence level
          </Typography>
          <Typography paragraph>
            • Larger samples → narrower intervals → more precision
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

export default Lesson01_Interpretation;
