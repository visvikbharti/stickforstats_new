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
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { MathJax } from 'better-react-mathjax';
import { alpha } from '@mui/material/styles';

// Import existing simulation
import SampleSizeSimulation from '../../simulations/SampleSizeSimulation';

/**
 * Lesson 4: Sample Size Effects
 *
 * Demonstrates how sample size affects confidence interval width,
 * precision, and the relationship between n and standard error
 */

const Lesson04_SampleSize = ({ onComplete }) => {
  const [showSimulation, setShowSimulation] = useState(false);

  return (
    <Box>
      {/* Introduction */}
      <Paper elevation={2} sx={{ p: 4, mb: 3, bgcolor: 'background.default' }}>
        <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          Sample Size Effects
        </Typography>

        <Typography variant="h6" paragraph sx={{ mt: 2 }}>
          Precision vs Cost: The Fundamental Trade-off
        </Typography>

        <Typography paragraph>
          You've learned what confidence intervals are, how coverage works, and how bootstrap methods
          handle difficult cases. But one question remains: <strong>How large should my sample be?</strong>
        </Typography>

        <Typography paragraph>
          The answer depends on how much <strong>precision</strong> you need. This lesson explores
          the precise mathematical relationship between sample size and interval width.
        </Typography>
      </Paper>

      {/* Section 1: The 1/√n Law */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
          📏 The 1/√n Law
        </Typography>

        <MathJax>
          <Typography paragraph>
            The width of a confidence interval depends on the <strong>standard error</strong>, which
            for the mean is:
          </Typography>

          <Box sx={{ p: 3, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), borderRadius: 2, mb: 3 }}>
            <Typography align="center" paragraph sx={{ fontSize: '1.3rem' }}>
              {"\\[ SE = \\frac{s}{\\sqrt{n}} \\]"}
            </Typography>

            <Typography align="center" variant="body2">
              Standard Error = Standard Deviation ÷ √(Sample Size)
            </Typography>
          </Box>

          <Alert severity="warning" icon={<TrendingDownIcon />} sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Critical Insight:</strong> Standard error decreases with the <em>square root</em>
              of n, not linearly. This means:
              <br />• To halve the width → need 4× the sample size
              <br />• To reduce width by 1/3 → need 9× the sample size
              <br />• To get 1/10th the width → need 100× the sample size!
            </Typography>
          </Alert>

          <Typography variant="h6" gutterBottom>
            Why √n? The Mathematical Story
          </Typography>

          <Typography paragraph>
            When you average n independent random variables, the variance of the average is:
          </Typography>

          <Typography align="center" paragraph>
            {"\\[ Var(\\bar{X}) = Var\\left(\\frac{X_1 + X_2 + \\cdots + X_n}{n}\\right) = \\frac{\\sigma^2}{n} \\]"}
          </Typography>

          <Typography paragraph>
            Taking the square root to get standard deviation (standard error):
          </Typography>

          <Typography align="center" paragraph>
            {"\\[ SD(\\bar{X}) = \\frac{\\sigma}{\\sqrt{n}} \\]"}
          </Typography>

          <Typography paragraph>
            This {"\\( 1/\\sqrt{n} \\)"} relationship is fundamental and appears everywhere in statistics!
          </Typography>
        </MathJax>
      </Paper>

      {/* Section 2: Practical Implications */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
          💡 Practical Implications
        </Typography>

        <Grid container spacing={3}>
          {/* Implication 1 */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <CardContent>
                <Chip label="The Bad News" color="warning" sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Diminishing Returns
                </Typography>
                <Typography paragraph variant="body2">
                  Going from n=10 to n=40 cuts width in half. But going from n=100 to n=400 also
                  only cuts width in half — 3× more data for the same improvement!
                </Typography>
                <Typography variant="body2">
                  <strong>Implication:</strong> Very large samples yield small additional gains in
                  precision. There's usually a "sweet spot" where cost vs precision is optimized.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Implication 2 */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <CardContent>
                <Chip label="The Good News" color="success" sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Small Samples Help A Lot
                </Typography>
                <Typography paragraph variant="body2">
                  Going from n=10 to n=40 (4× increase) halves the CI width. Going from n=40 to
                  n=160 (4× increase) halves it again. Initial increases matter most!
                </Typography>
                <Typography variant="body2">
                  <strong>Implication:</strong> Even modest sample sizes can give reasonable
                  precision. You don't always need thousands of observations.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Implication 3 */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <CardContent>
                <Chip label="Planning" color="info" sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Sample Size Planning
                </Typography>
                <Typography paragraph variant="body2">
                  Before collecting data, you can calculate required sample size for a target
                  precision (margin of error).
                </Typography>
                <MathJax>
                  <Typography variant="body2">
                    For margin of error E:
                    <br />
                    {"\\[ n = \\left(\\frac{z_{\\alpha/2} \\cdot \\sigma}{E}\\right)^2 \\]"}
                  </Typography>
                </MathJax>
              </CardContent>
            </Card>
          </Grid>

          {/* Implication 4 */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', bgcolor: (theme) => alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <CardContent>
                <Chip label="Warning" color="error" sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Variability Still Matters
                </Typography>
                <Typography paragraph variant="body2">
                  Sample size isn't everything! If your data has huge variability (large s), even
                  large n gives wide intervals.
                </Typography>
                <Typography variant="body2">
                  <strong>Implication:</strong> Reducing variability (better measurement, controlling
                  confounders) can be more cost-effective than increasing sample size.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Section 3: The Width Formula */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
          📐 Confidence Interval Width Formula
        </Typography>

        <MathJax>
          <Typography paragraph>
            For a 95% t-interval for the mean:
          </Typography>

          <Box sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, mb: 3 }}>
            <Typography align="center" paragraph sx={{ fontSize: '1.2rem' }}>
              {"\\[ \\text{Width} = 2 \\times t_{0.025, n-1} \\times \\frac{s}{\\sqrt{n}} \\]"}
            </Typography>
          </Box>

          <Typography paragraph>
            Breaking this down:
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  The "2×" Factor
                </Typography>
                <Typography variant="body2">
                  Width is twice the margin of error (covers both sides of the point estimate)
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  {"\\(t_{0.025, n-1}\\)"}
                </Typography>
                <Typography variant="body2">
                  Critical value, ≈1.96 for large n. Increases slightly for small n (accounts for
                  uncertainty in estimating s)
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  {"\\(\\frac{s}{\\sqrt{n}}\\)"}
                </Typography>
                <Typography variant="body2">
                  Standard error — this is where the {"\\(1/\\sqrt{n}\\)"} relationship comes in
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Accordion sx={{ mt: 3 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Example: How Does Width Scale with n?
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                Suppose s = 10 and we want 95% confidence. How does width change with n?
              </Typography>

              <Box component="table" sx={{ width: '100%', '& td, & th': { p: 1, border: (theme) => `1px solid ${theme.palette.divider}` } }}>
                <thead>
                  <tr>
                    <th>Sample Size (n)</th>
                    <th>SE = 10/√n</th>
                    <th>Width ≈ 2(1.96)SE</th>
                    <th>Reduction Factor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>10</td>
                    <td>3.16</td>
                    <td>12.4</td>
                    <td>—</td>
                  </tr>
                  <tr>
                    <td>40</td>
                    <td>1.58</td>
                    <td>6.2</td>
                    <td>1/2 (4× sample)</td>
                  </tr>
                  <tr>
                    <td>160</td>
                    <td>0.79</td>
                    <td>3.1</td>
                    <td>1/4 (16× sample)</td>
                  </tr>
                  <tr>
                    <td>640</td>
                    <td>0.40</td>
                    <td>1.6</td>
                    <td>1/8 (64× sample)</td>
                  </tr>
                </tbody>
              </Box>

              <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
                Notice: To cut width in half repeatedly, you need to quadruple n each time.
              </Typography>
            </AccordionDetails>
          </Accordion>
        </MathJax>
      </Paper>

      {/* Section 4: Interactive Simulation */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
          🔬 Interactive Sample Size Simulation
        </Typography>

        <Typography paragraph>
          Now explore the relationship between sample size and interval width yourself!
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Experiments to Try:</strong>
            <br />
            1. <strong>Verify √n Relationship:</strong> Start with n=25, note the width. Increase
            to n=100 (4× larger). Width should be approximately half.
            <br /><br />
            2. <strong>Variability Matters:</strong> Keep n fixed, but increase population SD.
            Watch intervals widen proportionally.
            <br /><br />
            3. <strong>Confidence Level Trade-off:</strong> Increase confidence from 95% to 99%.
            Intervals get wider even with same n.
            <br /><br />
            4. <strong>Coverage Check:</strong> Run many simulations. Does the actual coverage match
            the nominal level across different sample sizes?
          </Typography>
        </Alert>

        {!showSimulation && (
          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => setShowSimulation(true)}
            >
              Launch Interactive Simulation
            </Button>
          </Box>
        )}

        {showSimulation && (
          <Box sx={{ mt: 3 }}>
            <SampleSizeSimulation />
          </Box>
        )}
      </Paper>

      {/* Section 5: Practical Guidelines */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
          📋 Practical Sample Size Guidelines
        </Typography>

        <Typography paragraph>
          While optimal sample size depends on your specific situation, here are some rules of thumb:
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                  For Means (t-intervals)
                </Typography>
                <Typography variant="body2" paragraph>
                  • <strong>n ≥ 30:</strong> CLT kicks in, works well even with moderate skewness
                  <br />
                  • <strong>n ≥ 100:</strong> Good precision for most applications
                  <br />
                  • <strong>n ≥ 500:</strong> Excellent precision, diminishing returns beyond this
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                  For Proportions
                </Typography>
                <Typography variant="body2" paragraph>
                  • <strong>np ≥ 10 and n(1-p) ≥ 10:</strong> Minimum for normal approximation
                  <br />
                  • <strong>n ≥ 100:</strong> Reasonable for moderate p (0.2 to 0.8)
                  <br />
                  • <strong>Larger n needed</strong> when p near 0 or 1
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                  Pre-Specified Margin of Error
                </Typography>
                <MathJax>
                  <Typography variant="body2" paragraph>
                    If you want margin of error E with confidence level {"\\(1-\\alpha\\)"}:
                  </Typography>
                  <Typography align="center" sx={{ fontSize: '1.1rem' }}>
                    {"\\[ n = \\left(\\frac{z_{\\alpha/2} \\cdot \\sigma}{E}\\right)^2 \\]"}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    (Use pilot study or conservative estimate for σ)
                  </Typography>
                </MathJax>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                  Cost-Benefit Considerations
                </Typography>
                <Typography variant="body2">
                  • Balance precision gain vs data collection cost
                  <br />
                  • Consider power for hypothesis tests (if applicable)
                  <br />
                  • Account for expected dropout/missing data
                  <br />
                  • Regulatory requirements (e.g., FDA trials)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary and Completion */}
      <Paper elevation={3} sx={{ p: 4, mt: 4, bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'success.main' }}>
          ✅ Key Takeaways
        </Typography>

        <Box sx={{ pl: 2 }}>
          <Typography paragraph>
            • Standard error decreases as <strong>1/√n</strong>, not linearly with n
          </Typography>
          <Typography paragraph>
            • To halve interval width → need <strong>4× the sample size</strong>
          </Typography>
          <Typography paragraph>
            • <strong>Diminishing returns:</strong> Large samples give small additional precision gains
          </Typography>
          <Typography paragraph>
            • <strong>Variability matters:</strong> Reducing s can be more effective than increasing n
          </Typography>
          <Typography paragraph>
            • Use <strong>sample size formulas</strong> to plan studies with target precision
          </Typography>
          <Typography paragraph>
            • Consider <strong>cost-benefit trade-offs</strong> — there's usually an optimal n
          </Typography>
        </Box>

        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Congratulations!</strong> You've completed the core confidence intervals curriculum.
            You now understand interpretation, coverage, bootstrap methods, and sample size effects.
            You're equipped to construct and interpret confidence intervals correctly in practice!
          </Typography>
        </Alert>

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

export default Lesson04_SampleSize;
