import React, { useState } from 'react';
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
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHead
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { MathJax } from 'better-react-mathjax';

/**
 * Lesson 7: Advanced Bootstrap Methods
 *
 * Deep dive into bootstrap theory and advanced methods
 * BCa, studentized bootstrap, bootstrap-t
 */

const Lesson07_AdvancedBootstrap = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => setActiveStep(prev => Math.min(prev + 1, 3));
  const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 0));

  return (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical">
        {/* Step 1: Beyond Percentile Bootstrap */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Beyond the Percentile Method</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography paragraph>
                In Lesson 3, we covered the <strong>percentile bootstrap</strong>. While simple and intuitive,
                it has limitations. Advanced methods can provide better coverage in challenging situations.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: 'white', mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Recap: Percentile Bootstrap
                </Typography>

                <Typography paragraph>
                  1. Resample B times, compute θ̂* for each
                </Typography>
                <Typography paragraph>
                  2. 95% CI = [2.5th percentile, 97.5th percentile] of bootstrap distribution
                </Typography>

                <Alert severity="warning" sx={{ mt: 2 }}>
                  <AlertTitle>Limitations</AlertTitle>
                  <ul>
                    <li><Typography variant="body2">Assumes bootstrap distribution is unbiased</Typography></li>
                    <li><Typography variant="body2">Doesn't account for skewness correctly</Typography></li>
                    <li><Typography variant="body2">Coverage can be poor for small n or skewed estimators</Typography></li>
                  </ul>
                </Alert>
              </Paper>

              <Typography variant="h6" gutterBottom>
                The Bootstrap Family
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Chip label="Simple" color="success" size="small" sx={{ mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        Percentile
                      </Typography>
                      <Typography variant="body2">
                        Directly use bootstrap quantiles
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Chip label="Better" color="primary" size="small" sx={{ mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        BCa
                      </Typography>
                      <Typography variant="body2">
                        Bias-corrected and accelerated
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Chip label="Advanced" color="warning" size="small" sx={{ mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        Bootstrap-t
                      </Typography>
                      <Typography variant="body2">
                        Studentized intervals
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Button variant="contained" onClick={handleNext} sx={{ mt: 2 }}>
                Learn BCa Method
              </Button>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 2: BCa Bootstrap */}
        <Step>
          <StepLabel>
            <Typography variant="h6">BCa Bootstrap</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>
                Bias-Corrected and Accelerated (BCa) Bootstrap
              </Typography>

              <Typography paragraph>
                Developed by Efron (1987), BCa corrects for two issues:
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#e3f2fd' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Bias Correction
                      </Typography>
                      <Typography variant="body2" paragraph>
                        Accounts for bias in the bootstrap distribution relative to the true sampling distribution
                      </Typography>
                      <Typography variant="body2">
                        <strong>Example:</strong> If bootstrap estimates tend to be systematically too high,
                        BCa adjusts the percentiles
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#fff3e0' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Acceleration
                      </Typography>
                      <Typography variant="body2" paragraph>
                        Accounts for skewness and non-constant variance of the estimator
                      </Typography>
                      <Typography variant="body2">
                        <strong>Example:</strong> Sample variance is skewed; BCa creates asymmetric CI
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Paper sx={{ p: 2, bgcolor: 'white', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                  BCa Algorithm
                </Typography>

                <ol>
                  <li>
                    <Typography paragraph>
                      <strong>Generate bootstrap samples</strong> (B = 1000-10000)
                    </Typography>
                  </li>

                  <li>
                    <Typography paragraph>
                      <strong>Estimate bias correction (z₀):</strong>
                    </Typography>
                    <MathJax>
                      {"\\[ z_0 = \\Phi^{-1}\\left(\\frac{\\#\\{\\hat{\\theta}^* < \\hat{\\theta}\\}}{B}\\right) \\]"}
                    </MathJax>
                    <Typography variant="caption" display="block">
                      (Φ⁻¹ is the inverse standard normal CDF)
                    </Typography>
                  </li>

                  <li>
                    <Typography paragraph sx={{ mt: 2 }}>
                      <strong>Estimate acceleration (a):</strong> Using jackknife
                    </Typography>
                    <Typography variant="body2" paragraph>
                      • Leave out each observation
                    </Typography>
                    <Typography variant="body2" paragraph>
                      • Compute θ̂₍ᵢ₎ for each
                    </Typography>
                    <MathJax>
                      {"\\[ a = \\frac{\\sum_i (\\bar{\\theta}_{(\\cdot)} - \\hat{\\theta}_{(i)})^3}{6[\\sum_i (\\bar{\\theta}_{(\\cdot)} - \\hat{\\theta}_{(i)})^2]^{3/2}} \\]"}
                    </MathJax>
                  </li>

                  <li>
                    <Typography paragraph sx={{ mt: 2 }}>
                      <strong>Compute adjusted percentiles:</strong>
                    </Typography>
                    <MathJax>
                      {"\\[ \\alpha_1 = \\Phi\\left(z_0 + \\frac{z_0 + z_{\\alpha/2}}{1 - a(z_0 + z_{\\alpha/2})}\\right) \\]"}
                    </MathJax>
                    <MathJax>
                      {"\\[ \\alpha_2 = \\Phi\\left(z_0 + \\frac{z_0 + z_{1-\\alpha/2}}{1 - a(z_0 + z_{1-\\alpha/2})}\\right) \\]"}
                    </MathJax>
                  </li>

                  <li>
                    <Typography paragraph sx={{ mt: 2 }}>
                      <strong>CI:</strong> [α₁-th percentile, α₂-th percentile] of bootstrap distribution
                    </Typography>
                  </li>
                </ol>
              </Paper>

              <Alert severity="success">
                <AlertTitle>Why BCa is Better</AlertTitle>
                BCa intervals are:
                <li><strong>Transformation-invariant:</strong> If CI for θ is [L, U], then CI for g(θ) is [g(L), g(U)]</li>
                <li><strong>Second-order accurate:</strong> Error is O(n⁻²) vs O(n⁻¹) for percentile</li>
                <li><strong>Better coverage:</strong> Closer to nominal 95% in simulations</li>
              </Alert>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>Continue</Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 3: Bootstrap-t (Studentized) */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Bootstrap-t Method</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>
                Studentized Bootstrap (Bootstrap-t)
              </Typography>

              <Typography paragraph>
                Instead of bootstrapping the estimator θ̂, bootstrap the <strong>t-statistic</strong>.
                This can provide even better coverage than BCa.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: '#e3f2fd', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                  Algorithm
                </Typography>

                <ol>
                  <li>
                    <Typography paragraph>
                      For each bootstrap sample b = 1,...,B:
                    </Typography>
                    <Typography paragraph sx={{ ml: 2 }}>
                      • Compute θ̂*ᵦ
                    </Typography>
                    <Typography paragraph sx={{ ml: 2 }}>
                      • Estimate SE*ᵦ (using nested bootstrap or analytic formula)
                    </Typography>
                    <Typography paragraph sx={{ ml: 2 }}>
                      • Compute t*ᵦ = (θ̂*ᵦ - θ̂) / SE*ᵦ
                    </Typography>
                  </li>

                  <li>
                    <Typography paragraph>
                      Find quantiles of {'{'}&apos;t*₁, ..., t*ᴮ{'}'}: [t₍α/₂₎, t₍₁₋α/₂₎]
                    </Typography>
                  </li>

                  <li>
                    <Typography paragraph>
                      Construct CI:
                    </Typography>
                    <MathJax>
                      {"\\[ [\\hat{\\theta} - t_{(1-\\alpha/2)} \\cdot SE, \\hat{\\theta} - t_{(\\alpha/2)} \\cdot SE] \\]"}
                    </MathJax>
                    <Typography variant="caption" display="block">
                      (Note the reversed order due to subtraction)
                    </Typography>
                  </li>
                </ol>
              </Paper>

              <Alert severity="info" sx={{ mb: 2 }}>
                <AlertTitle>Why Studentize?</AlertTitle>
                <Typography paragraph>
                  The studentized statistic t* has a distribution that:
                </Typography>
                <ul>
                  <li><Typography variant="body2">Converges faster to its limiting distribution</Typography></li>
                  <li><Typography variant="body2">Is more stable across different situations</Typography></li>
                  <li><Typography variant="body2">Adapts to local variability better</Typography></li>
                </ul>
              </Alert>

              <Typography variant="h6" gutterBottom>
                Comparison of Methods
              </Typography>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Method</strong></TableCell>
                    <TableCell><strong>Pros</strong></TableCell>
                    <TableCell><strong>Cons</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell><strong>Percentile</strong></TableCell>
                    <TableCell>Simple, fast</TableCell>
                    <TableCell>Poor coverage for skewed θ̂</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>BCa</strong></TableCell>
                    <TableCell>Better coverage, transformation-invariant</TableCell>
                    <TableCell>Requires jackknife (more computation)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Bootstrap-t</strong></TableCell>
                    <TableCell>Best theoretical properties</TableCell>
                    <TableCell>Needs SE estimate, double bootstrap costly</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Paper sx={{ p: 2, bgcolor: '#fff3e0', mt: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                  Practical Recommendation
                </Typography>
                <ul>
                  <li><Typography><strong>Default choice:</strong> BCa (good balance of accuracy and computational cost)</Typography></li>
                  <li><Typography><strong>When SE available:</strong> Bootstrap-t (e.g., for means, proportions)</Typography></li>
                  <li><Typography><strong>Quick exploration:</strong> Percentile (fast, usually good enough)</Typography></li>
                  <li><Typography><strong>Complex estimators:</strong> BCa or double bootstrap</Typography></li>
                </ul>
              </Paper>

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
                🔬 Advanced Bootstrap Mastered!
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 40, mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        Key Concepts
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">Percentile bootstrap is simple but limited</Typography></li>
                        <li><Typography variant="body2">BCa corrects for bias and skewness</Typography></li>
                        <li><Typography variant="body2">Bootstrap-t uses studentization for better coverage</Typography></li>
                        <li><Typography variant="body2">All methods are non-parametric</Typography></li>
                      </ul>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#e3f2fd' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Decision Tree
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Start:</strong> Need CI for statistic θ̂
                      </Typography>
                      <Typography variant="body2" paragraph>
                        → Parametric formula exists? Use it
                      </Typography>
                      <Typography variant="body2" paragraph>
                        → No? Use bootstrap
                      </Typography>
                      <Typography variant="body2" paragraph>
                        &nbsp;&nbsp;&nbsp;→ SE available? Bootstrap-t
                      </Typography>
                      <Typography variant="body2">
                        &nbsp;&nbsp;&nbsp;→ No SE? BCa
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Alert severity="success" sx={{ mb: 2 }}>
                <AlertTitle>The Bootstrap Philosophy</AlertTitle>
                "Use the data to tell you about the data." Bootstrap methods let the empirical
                distribution approximate the true distribution, without strong parametric assumptions.
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

export default Lesson07_AdvancedBootstrap;
