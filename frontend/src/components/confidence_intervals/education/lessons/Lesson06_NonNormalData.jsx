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
  Chip,
  Slider,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { MathJax } from 'better-react-mathjax';

/**
 * Lesson 6: Non-Normal Data & Transformations
 *
 * Explores what happens when normality assumption fails
 * Covers transformations and robust alternatives
 */

const Lesson06_NonNormalData = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [distribution, setDistribution] = useState('skewed');
  const [sampleSize, setSampleSize] = useState(30);
  const [transformation, setTransformation] = useState('none');

  // Simulate coverage rates for different scenarios
  const coverageData = useMemo(() => {
    const scenarios = {
      skewed: { n30: 0.89, n50: 0.91, n100: 0.93, n500: 0.945 },
      heavy: { n30: 0.92, n50: 0.93, n100: 0.94, n500: 0.948 },
      normal: { n30: 0.95, n50: 0.95, n100: 0.95, n500: 0.95 }
    };

    const key = sampleSize >= 500 ? 'n500' : sampleSize >= 100 ? 'n100' : sampleSize >= 50 ? 'n50' : 'n30';
    return scenarios[distribution][key];
  }, [distribution, sampleSize]);

  const handleNext = () => setActiveStep(prev => Math.min(prev + 1, 4));
  const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 0));

  return (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical">
        {/* Step 1: The Normality Assumption */}
        <Step>
          <StepLabel>
            <Typography variant="h6">The Normality Assumption</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography paragraph>
                The standard t-based confidence interval formula assumes the data come from a
                <strong> normal distribution</strong>. But what happens when this assumption fails?
              </Typography>

              <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
                <AlertTitle>The Classic Formula Assumes Normality</AlertTitle>
                <MathJax>
                  {"\\[ \\bar{x} \\pm t_{n-1, \\alpha/2} \\cdot \\frac{s}{\\sqrt{n}} \\]"}
                </MathJax>
                <Typography sx={{ mt: 1 }}>
                  This formula is <strong>exact</strong> for normal data, but only <strong>approximate</strong> for non-normal data.
                </Typography>
              </Alert>

              <Typography variant="h6" gutterBottom>
                Types of Non-Normality
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>
                        Skewed Distributions
                      </Typography>
                      <Typography variant="body2" paragraph>
                        • Income data (right-skewed)
                      </Typography>
                      <Typography variant="body2" paragraph>
                        • Reaction times
                      </Typography>
                      <Typography variant="body2">
                        • Survival times
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        <strong>Impact:</strong> Moderate coverage issues for small n
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>
                        Heavy-Tailed
                      </Typography>
                      <Typography variant="body2" paragraph>
                        • Financial returns
                      </Typography>
                      <Typography variant="body2" paragraph>
                        • Insurance claims
                      </Typography>
                      <Typography variant="body2">
                        • Outlier-prone data
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        <strong>Impact:</strong> Intervals too narrow (overcoverage)
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>
                        Discrete/Bounded
                      </Typography>
                      <Typography variant="body2" paragraph>
                        • Likert scales (1-5)
                      </Typography>
                      <Typography variant="body2" paragraph>
                        • Proportions
                      </Typography>
                      <Typography variant="body2">
                        • Counts
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        <strong>Impact:</strong> May violate boundaries
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                  The Central Limit Theorem to the Rescue!
                </Typography>
                <Typography paragraph>
                  For large enough n, the sampling distribution of x̄ becomes approximately normal
                  <strong> regardless</strong> of the population distribution.
                </Typography>
                <Typography>
                  Rule of thumb: n ≥ 30 usually works, but depends on how non-normal the data are.
                </Typography>
              </Paper>

              <Button variant="contained" onClick={handleNext} sx={{ mt: 2 }}>
                Explore Impact
              </Button>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 2: Impact on Coverage */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Impact on Coverage Probability</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography paragraph>
                Explore how non-normality affects the actual coverage rate of "95%" confidence intervals.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: 'white', mb: 2 }}>
                <Typography gutterBottom>Population Distribution:</Typography>
                <ToggleButtonGroup
                  value={distribution}
                  exclusive
                  onChange={(e, val) => val && setDistribution(val)}
                  fullWidth
                  size="small"
                  sx={{ mb: 2 }}
                >
                  <ToggleButton value="normal">Normal</ToggleButton>
                  <ToggleButton value="skewed">Skewed (Exp)</ToggleButton>
                  <ToggleButton value="heavy">Heavy-Tailed (t₃)</ToggleButton>
                </ToggleButtonGroup>

                <Typography gutterBottom>Sample Size: n = {sampleSize}</Typography>
                <Slider
                  value={sampleSize}
                  onChange={(e, val) => setSampleSize(val)}
                  min={10}
                  max={500}
                  step={10}
                  marks={[
                    { value: 10, label: '10' },
                    { value: 30, label: '30' },
                    { value: 100, label: '100' },
                    { value: 500, label: '500' }
                  ]}
                />
              </Paper>

              <Paper sx={{ p: 3, bgcolor: coverageData >= 0.945 ? '#e8f5e9' : '#fff3e0', mb: 2 }}>
                <Typography variant="h4" align="center" sx={{ mb: 1 }}>
                  {(coverageData * 100).toFixed(1)}%
                </Typography>
                <Typography variant="subtitle1" align="center" gutterBottom>
                  Actual Coverage Rate
                </Typography>
                <Typography variant="caption" align="center" display="block">
                  (Target: 95%)
                </Typography>
              </Paper>

              {coverageData < 0.94 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <AlertTitle>Undercoverage!</AlertTitle>
                  The interval is too narrow. True parameter is captured less than 95% of the time.
                  Consider: larger sample size, transformation, or bootstrap.
                </Alert>
              )}

              {coverageData >= 0.945 && coverageData <= 0.955 && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <AlertTitle>Good Coverage!</AlertTitle>
                  The CLT has kicked in. The t-interval works well even for non-normal data with this sample size.
                </Alert>
              )}

              <Typography variant="h6" gutterBottom>
                Key Insights
              </Typography>

              <ul>
                <li>
                  <Typography paragraph>
                    <strong>Normal data:</strong> 95% CI has exactly 95% coverage for any n
                  </Typography>
                </li>
                <li>
                  <Typography paragraph>
                    <strong>Skewed data:</strong> Needs n ≈ 50-100 for good coverage
                  </Typography>
                </li>
                <li>
                  <Typography paragraph>
                    <strong>Heavy-tailed data:</strong> Even better coverage than nominal (conservative)
                  </Typography>
                </li>
                <li>
                  <Typography>
                    <strong>Rule of thumb:</strong> If n ≥ 30 and no extreme outliers, t-interval usually works
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

        {/* Step 3: Transformations */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Data Transformations</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography paragraph>
                One solution to non-normality: <strong>transform</strong> the data to make it more symmetric,
                then compute the CI on the transformed scale.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: 'white', mb: 2 }}>
                <Typography gutterBottom>Common Transformation:</Typography>
                <ToggleButtonGroup
                  value={transformation}
                  exclusive
                  onChange={(e, val) => val && setTransformation(val)}
                  fullWidth
                  size="small"
                >
                  <ToggleButton value="none">None</ToggleButton>
                  <ToggleButton value="log">Log</ToggleButton>
                  <ToggleButton value="sqrt">Square Root</ToggleButton>
                  <ToggleButton value="reciprocal">Reciprocal</ToggleButton>
                </ToggleButtonGroup>
              </Paper>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Log Transformation
                      </Typography>
                      <MathJax>
                        {"\\[ Y = \\log(X) \\]"}
                      </MathJax>
                      <Typography variant="body2" paragraph sx={{ mt: 1 }}>
                        <strong>Use for:</strong> Right-skewed data (income, prices)
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Interpretation:</strong> CI for log(μ), back-transform gives CI for geometric mean
                      </Typography>
                      <Typography variant="body2">
                        <strong>Back-transform:</strong> exp(CI) gives multiplicative CI
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Square Root
                      </Typography>
                      <MathJax>
                        {"\\[ Y = \\sqrt{X} \\]"}
                      </MathJax>
                      <Typography variant="body2" paragraph sx={{ mt: 1 }}>
                        <strong>Use for:</strong> Count data (Poisson-like)
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Interpretation:</strong> Stabilizes variance
                      </Typography>
                      <Typography variant="body2">
                        <strong>Back-transform:</strong> Square the CI endpoints
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mb: 2 }}>
                <AlertTitle>Transformation Steps</AlertTitle>
                <ol>
                  <li>Transform data: Y = g(X)</li>
                  <li>Compute CI on transformed scale</li>
                  <li>Back-transform: g⁻¹(CI<sub>Y</sub>) gives CI for original parameter</li>
                </ol>
              </Alert>

              <Paper sx={{ p: 2, bgcolor: '#fff3e0', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                  ⚠️ Important Note on Interpretation
                </Typography>
                <Typography paragraph>
                  After back-transformation, you get a CI for a <strong>different parameter</strong>!
                </Typography>
                <Typography>
                  • Log transformation → CI for <strong>geometric mean</strong> (not arithmetic mean)
                  <br />
                  • This is often what you want for skewed data (e.g., median income)
                </Typography>
              </Paper>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>Continue</Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 4: Robust Alternatives */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Robust Alternatives</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography paragraph>
                When transformations aren't appropriate or you're unsure about the distribution,
                use <strong>robust methods</strong> that work regardless of the shape.
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#e8f5e9' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        1. Bootstrap CI (Covered in Lesson 3)
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Pros:</strong>
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">No distributional assumptions</Typography></li>
                        <li><Typography variant="body2">Works for any statistic</Typography></li>
                        <li><Typography variant="body2">Automatically handles skewness</Typography></li>
                      </ul>
                      <Typography variant="body2" paragraph sx={{ mt: 1 }}>
                        <strong>Cons:</strong>
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">Computationally intensive</Typography></li>
                        <li><Typography variant="body2">Needs moderate sample size (n ≥ 20)</Typography></li>
                      </ul>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#e3f2fd' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        2. Rank-Based Methods
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Sign Test CI:</strong> For median (not mean)
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Wilcoxon Signed-Rank CI:</strong> For pseudo-median
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Pros:</strong>
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">Distribution-free</Typography></li>
                        <li><Typography variant="body2">Resistant to outliers</Typography></li>
                      </ul>
                      <Typography variant="body2" paragraph sx={{ mt: 1 }}>
                        <strong>Cons:</strong>
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">CI is for median, not mean</Typography></li>
                        <li><Typography variant="body2">Less power if data are actually normal</Typography></li>
                      </ul>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Card sx={{ bgcolor: '#fff3e0' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        3. Trimmed Mean CI
                      </Typography>
                      <Typography variant="body2" paragraph>
                        Remove extreme values (e.g., top/bottom 10%) and compute CI for trimmed mean.
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Pros:</strong> Resistant to outliers while still estimating a "mean-like" quantity
                      </Typography>
                      <Typography variant="body2">
                        <strong>Cons:</strong> Loses information from tails
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Alert severity="success" sx={{ mb: 2 }}>
                <AlertTitle>Decision Guide</AlertTitle>
                <ul>
                  <li><Typography variant="body2"><strong>n {">"} 100:</strong> Standard t-interval usually fine</Typography></li>
                  <li><Typography variant="body2"><strong>n = 30-100, skewed:</strong> Consider log transformation or bootstrap</Typography></li>
                  <li><Typography variant="body2"><strong>n {"<"} 30, very skewed:</strong> Bootstrap percentile or transformation required</Typography></li>
                  <li><Typography variant="body2"><strong>Heavy outliers:</strong> Trimmed mean or robust bootstrap</Typography></li>
                  <li><Typography variant="body2"><strong>Want median:</strong> Sign test or Wilcoxon CI</Typography></li>
                </ul>
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
                🛡️ Robustness Mastered!
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
                        <li><Typography variant="body2">t-intervals assume normality but are robust for large n</Typography></li>
                        <li><Typography variant="body2">CLT saves us: n ≥ 30 usually sufficient</Typography></li>
                        <li><Typography variant="body2">Transformations can fix skewness</Typography></li>
                        <li><Typography variant="body2">Bootstrap works without assumptions</Typography></li>
                      </ul>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#e3f2fd' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Practical Workflow
                      </Typography>
                      <ol>
                        <li><Typography variant="body2">Check sample size (n ≥ 30?)</Typography></li>
                        <li><Typography variant="body2">Plot histogram/QQ-plot</Typography></li>
                        <li><Typography variant="body2">If symmetric: use t-interval</Typography></li>
                        <li><Typography variant="body2">If skewed: transform or bootstrap</Typography></li>
                        <li><Typography variant="body2">If outliers: robust method</Typography></li>
                      </ol>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

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

export default Lesson06_NonNormalData;
