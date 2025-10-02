import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Chip
} from '@mui/material';
import { MathJax } from 'better-react-mathjax';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import LinkIcon from '@mui/icons-material/Link';

/**
 * Probability Lesson 5: Joint & Conditional Distributions
 *
 * Topics:
 * - Joint probability mass/density functions
 * - Marginal distributions
 * - Conditional probability and distributions
 * - Independence
 * - Covariance and correlation
 * - Law of total probability and Bayes' theorem
 */

const Lesson05_JointDistributions = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [pA, setPa] = useState(0.6);
  const [pBGivenA, setPbGivenA] = useState(0.7);
  const [pBGivenNotA, setPbGivenNotA] = useState(0.3);
  const [correlationType, setCorrelationType] = useState('positive');
  const [selectedCell, setSelectedCell] = useState(null);

  // Joint distribution for discrete case
  const jointPMF = useMemo(() => {
    // P(A) = pA, P(~A) = 1 - pA
    // P(B|A) = pBGivenA, P(B|~A) = pBGivenNotA
    const pAB = pA * pBGivenA;
    const pANotB = pA * (1 - pBGivenA);
    const pNotAB = (1 - pA) * pBGivenNotA;
    const pNotANotB = (1 - pA) * (1 - pBGivenNotA);

    return {
      table: [
        [pAB, pANotB],
        [pNotAB, pNotANotB]
      ],
      marginalA: [pA, 1 - pA],
      marginalB: [pAB + pNotAB, pANotB + pNotANotB],
      pB: pAB + pNotAB,
      pNotB: pANotB + pNotANotB
    };
  }, [pA, pBGivenA, pBGivenNotA]);

  // Check independence
  const isIndependent = useMemo(() => {
    const threshold = 0.001;
    const pAB = jointPMF.table[0][0];
    const pA_val = jointPMF.marginalA[0];
    const pB_val = jointPMF.marginalB[0];
    const productMarginals = pA_val * pB_val;

    return Math.abs(pAB - productMarginals) < threshold;
  }, [jointPMF]);

  // Continuous bivariate normal simulation
  const bivariateData = useMemo(() => {
    const n = 100;
    const points = [];
    const rho = correlationType === 'positive' ? 0.7 :
                correlationType === 'negative' ? -0.7 : 0;

    for (let i = 0; i < n; i++) {
      // Box-Muller transform
      const u1 = Math.random();
      const u2 = Math.random();
      const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);

      // Apply correlation
      const x = z1;
      const y = rho * z1 + Math.sqrt(1 - rho * rho) * z2;

      points.push({ x, y });
    }

    return { points, rho };
  }, [correlationType]);

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleComplete = () => {
    if (onComplete) onComplete();
  };

  // Render scatter plot for bivariate data
  const renderScatterPlot = () => {
    const width = 350;
    const height = 350;
    const margin = 40;

    return (
      <Box sx={{ position: 'relative', width, height, border: '1px solid #ddd', bgcolor: 'white' }}>
        <svg width={width} height={height}>
          {/* Axes */}
          <line x1={margin} y1={height - margin} x2={width - 20} y2={height - margin}
                stroke="black" strokeWidth="2" />
          <line x1={margin} y1={height - margin} x2={margin} y2={20}
                stroke="black" strokeWidth="2" />

          {/* Origin lines */}
          <line
            x1={margin + (width - margin - 20) / 2}
            y1={20}
            x2={margin + (width - margin - 20) / 2}
            y2={height - margin}
            stroke="#ddd"
            strokeWidth="1"
            strokeDasharray="5,5"
          />
          <line
            x1={margin}
            y1={(height - margin + 20) / 2}
            x2={width - 20}
            y2={(height - margin + 20) / 2}
            stroke="#ddd"
            strokeWidth="1"
            strokeDasharray="5,5"
          />

          {/* Labels */}
          <text x={width / 2} y={height - 5} textAnchor="middle" fontSize="14" fontWeight="bold">
            X
          </text>
          <text x={10} y={height / 2} textAnchor="middle" fontSize="14" fontWeight="bold"
                transform={`rotate(-90, 10, ${height / 2})`}>
            Y
          </text>

          {/* Data points */}
          {bivariateData.points.map((pt, idx) => {
            const scale = 50;
            const cx = margin + (width - margin - 20) / 2 + pt.x * scale;
            const cy = (height - margin + 20) / 2 - pt.y * scale;

            if (cx < margin || cx > width - 20 || cy < 20 || cy > height - margin) return null;

            return (
              <circle
                key={idx}
                cx={cx}
                cy={cy}
                r={3}
                fill="rgba(33, 150, 243, 0.6)"
                stroke="white"
                strokeWidth="1"
              />
            );
          })}
        </svg>

        <Box sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'rgba(255,255,255,0.9)',
                   p: 1, border: '1px solid #ddd', borderRadius: 1, fontSize: '0.75rem' }}>
          <Typography variant="caption">
            ρ = {bivariateData.rho.toFixed(2)}
          </Typography>
        </Box>
      </Box>
    );
  };

  const steps = [
    {
      label: 'Joint Distributions Introduction',
      content: (
        <Box>
          <Alert severity="info" icon={<GroupWorkIcon />} sx={{ mb: 2 }}>
            <strong>Joint distributions</strong> describe the probability behavior of <em>two or more</em>
            random variables simultaneously. They let us model relationships and dependencies between variables.
          </Alert>

          <Typography variant="h6" gutterBottom>
            Motivation
          </Typography>

          <Typography variant="body2" paragraph>
            Real-world phenomena rarely involve isolated variables:
          </Typography>

          <ul style={{ fontSize: '0.875rem' }}>
            <li><strong>Heights and weights</strong> of individuals are correlated</li>
            <li><strong>Temperature and ice cream sales</strong> vary together</li>
            <li><strong>Study time and test score</strong> have a dependency</li>
            <li><strong>Component failures</strong> in a system may not be independent</li>
          </ul>

          <Typography variant="body2" paragraph sx={{ mt: 2 }}>
            Joint distributions provide the mathematical framework to answer questions like:
          </Typography>

          <ul style={{ fontSize: '0.875rem' }}>
            <li>What's the probability that <em>both</em> X and Y fall in certain ranges?</li>
            <li>How does knowing X affect the distribution of Y?</li>
            <li>Are X and Y independent?</li>
            <li>What's the strength and direction of their relationship?</li>
          </ul>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Discrete vs Continuous
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Discrete: Joint PMF
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    For discrete random variables X and Y:
                  </Typography>
                  <MathJax>
                    {"\\[ p(x, y) = P(X = x, Y = y) \\]"}
                  </MathJax>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Properties:
                  </Typography>
                  <ul style={{ fontSize: '0.75rem', marginTop: 4 }}>
                    <li>0 ≤ p(x,y) ≤ 1</li>
                    <li>Σ<sub>x</sub> Σ<sub>y</sub> p(x,y) = 1</li>
                  </ul>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Continuous: Joint PDF
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    For continuous random variables X and Y:
                  </Typography>
                  <MathJax>
                    {"\\[ f(x, y) \\geq 0 \\]"}
                  </MathJax>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Properties:
                  </Typography>
                  <ul style={{ fontSize: '0.75rem', marginTop: 4 }}>
                    <li>f(x,y) ≥ 0</li>
                    <li>∫∫ f(x,y) dx dy = 1</li>
                    <li>P((X,Y) ∈ A) = ∫∫<sub>A</sub> f(x,y) dx dy</li>
                  </ul>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Key Difference:</strong> For continuous variables, f(x,y) is <em>not</em> a probability—
            it's a density. Probabilities come from integrating over regions.
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Example: Rolling Two Dice
          </Typography>

          <Typography variant="body2">
            Let X = outcome of first die, Y = outcome of second die. Assuming fair dice:
          </Typography>

          <MathJax>
            {"\\[ p(x, y) = P(X = x, Y = y) = \\frac{1}{36} \\quad \\text{for } x, y \\in \\{1, 2, 3, 4, 5, 6\\} \\]"}
          </MathJax>

          <Typography variant="body2" sx={{ mt: 1 }}>
            This is a <strong>uniform joint distribution</strong> over 36 equally likely outcomes.
          </Typography>
        </Box>
      )
    },
    {
      label: 'Marginal Distributions',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            From Joint to Marginal
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            The <strong>marginal distribution</strong> of X is the distribution of X alone, obtained
            by "summing out" or "integrating out" Y from the joint distribution.
          </Alert>

          <Typography variant="h6" gutterBottom>
            Formulas
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: '#fafafa' }}>
                <Typography variant="subtitle2" gutterBottom>
                  <strong>Discrete Case</strong>
                </Typography>
                <MathJax>
                  {"\\[ p_X(x) = \\sum_{y} p(x, y) \\]"}
                </MathJax>
                <MathJax>
                  {"\\[ p_Y(y) = \\sum_{x} p(x, y) \\]"}
                </MathJax>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: '#fafafa' }}>
                <Typography variant="subtitle2" gutterBottom>
                  <strong>Continuous Case</strong>
                </Typography>
                <MathJax>
                  {"\\[ f_X(x) = \\int_{-\\infty}^{\\infty} f(x, y) \\, dy \\]"}
                </MathJax>
                <MathJax>
                  {"\\[ f_Y(y) = \\int_{-\\infty}^{\\infty} f(x, y) \\, dx \\]"}
                </MathJax>
              </Paper>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>
            Interactive Example: Discrete Joint Distribution
          </Typography>

          <Typography variant="body2" paragraph>
            Adjust the probabilities to see how joint and marginal distributions relate:
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  P(A)
                </Typography>
                <Slider
                  value={pA}
                  onChange={(e, val) => setPa(val)}
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  marks={[
                    { value: 0.1, label: '0.1' },
                    { value: 0.5, label: '0.5' },
                    { value: 0.9, label: '0.9' }
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => v.toFixed(2)}
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  P(B|A)
                </Typography>
                <Slider
                  value={pBGivenA}
                  onChange={(e, val) => setPbGivenA(val)}
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  marks={[
                    { value: 0.1, label: '0.1' },
                    { value: 0.5, label: '0.5' },
                    { value: 0.9, label: '0.9' }
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => v.toFixed(2)}
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  P(B|~A)
                </Typography>
                <Slider
                  value={pBGivenNotA}
                  onChange={(e, val) => setPbGivenNotA(val)}
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  marks={[
                    { value: 0.1, label: '0.1' },
                    { value: 0.5, label: '0.5' },
                    { value: 0.9, label: '0.9' }
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => v.toFixed(2)}
                />
              </Paper>
            </Grid>
          </Grid>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell></TableCell>
                  <TableCell align="center"><strong>B</strong></TableCell>
                  <TableCell align="center"><strong>~B</strong></TableCell>
                  <TableCell align="center" sx={{ bgcolor: '#e3f2fd' }}>
                    <strong>P(A)</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell><strong>A</strong></TableCell>
                  <TableCell align="center">{jointPMF.table[0][0].toFixed(3)}</TableCell>
                  <TableCell align="center">{jointPMF.table[0][1].toFixed(3)}</TableCell>
                  <TableCell align="center" sx={{ bgcolor: '#e3f2fd' }}>
                    <strong>{jointPMF.marginalA[0].toFixed(3)}</strong>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>~A</strong></TableCell>
                  <TableCell align="center">{jointPMF.table[1][0].toFixed(3)}</TableCell>
                  <TableCell align="center">{jointPMF.table[1][1].toFixed(3)}</TableCell>
                  <TableCell align="center" sx={{ bgcolor: '#e3f2fd' }}>
                    <strong>{jointPMF.marginalA[1].toFixed(3)}</strong>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ bgcolor: '#e8f5e9' }}><strong>P(B)</strong></TableCell>
                  <TableCell align="center" sx={{ bgcolor: '#e8f5e9' }}>
                    <strong>{jointPMF.marginalB[0].toFixed(3)}</strong>
                  </TableCell>
                  <TableCell align="center" sx={{ bgcolor: '#e8f5e9' }}>
                    <strong>{jointPMF.marginalB[1].toFixed(3)}</strong>
                  </TableCell>
                  <TableCell align="center" sx={{ bgcolor: '#fff3e0' }}>
                    <strong>1.000</strong>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="body2">
            • <strong>Joint probabilities</strong> (center cells): P(A,B), P(A,~B), etc.<br/>
            • <strong>Marginal of A</strong> (right column): Sum across rows<br/>
            • <strong>Marginal of B</strong> (bottom row): Sum across columns<br/>
            • <strong>Total probability</strong> (bottom-right): Always 1
          </Typography>

          <Alert severity="success" sx={{ mt: 2 }}>
            <strong>Interpretation:</strong> The marginal distribution tells us the probability
            distribution of one variable <em>ignoring</em> the other variable.
          </Alert>
        </Box>
      )
    },
    {
      label: 'Conditional Distributions',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Conditional Probability Review
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Conditional probability</strong> describes the distribution of Y <em>given</em>
            that we know X = x. It's central to understanding dependencies.
          </Alert>

          <Typography variant="h6" gutterBottom>
            Formulas
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: '#fafafa' }}>
                <Typography variant="subtitle2" gutterBottom>
                  <strong>Discrete Case</strong>
                </Typography>
                <MathJax>
                  {"\\[ p(y | x) = \\frac{p(x, y)}{p_X(x)} \\]"}
                </MathJax>
                <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                  Provided p<sub>X</sub>(x) &gt; 0
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: '#fafafa' }}>
                <Typography variant="subtitle2" gutterBottom>
                  <strong>Continuous Case</strong>
                </Typography>
                <MathJax>
                  {"\\[ f(y | x) = \\frac{f(x, y)}{f_X(x)} \\]"}
                </MathJax>
                <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                  Provided f<sub>X</sub>(x) &gt; 0
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>
            Key Properties
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              The conditional distribution is a <strong>proper probability distribution</strong>:
            </Typography>
            <ul style={{ fontSize: '0.875rem', marginTop: 8 }}>
              <li><strong>Discrete:</strong> Σ<sub>y</sub> p(y|x) = 1</li>
              <li><strong>Continuous:</strong> ∫ f(y|x) dy = 1</li>
            </ul>
          </Paper>

          <Typography variant="h6" gutterBottom>
            Example: Conditional from Joint Table
          </Typography>

          <Typography variant="body2" paragraph>
            Using the joint distribution from the previous step, calculate P(B|A):
          </Typography>

          <MathJax>
            {"\\[ P(B | A) = \\frac{P(A, B)}{P(A)} = \\frac{" +
            jointPMF.table[0][0].toFixed(3) + "}{" +
            jointPMF.marginalA[0].toFixed(3) + "} = " +
            pBGivenA.toFixed(3) + " \\]"}
          </MathJax>

          <Typography variant="body2" paragraph sx={{ mt: 2 }}>
            This matches the slider value for P(B|A) you set!
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Law of Total Probability
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              The marginal P(B) can be recovered from conditionals:
            </Typography>
            <MathJax>
              {"\\[ P(B) = P(B | A) P(A) + P(B | \\sim A) P(\\sim A) \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Verification:
            </Typography>
            <MathJax>
              {"\\[ P(B) = " + pBGivenA.toFixed(3) + " \\times " + pA.toFixed(3) +
              " + " + pBGivenNotA.toFixed(3) + " \\times " + (1 - pA).toFixed(3) +
              " = " + jointPMF.marginalB[0].toFixed(3) + " \\]"}
            </MathJax>
          </Paper>

          <Typography variant="h6" gutterBottom>
            Bayes' Theorem
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa' }}>
            <Typography variant="body2" gutterBottom>
              <strong>Bayes' theorem</strong> lets us reverse conditioning:
            </Typography>
            <MathJax>
              {"\\[ P(A | B) = \\frac{P(B | A) P(A)}{P(B)} \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              For our example:
            </Typography>
            <MathJax>
              {"\\[ P(A | B) = \\frac{" + pBGivenA.toFixed(3) + " \\times " + pA.toFixed(3) +
              "}{" + jointPMF.marginalB[0].toFixed(3) + "} = " +
              (jointPMF.table[0][0] / jointPMF.marginalB[0]).toFixed(3) + " \\]"}
            </MathJax>
          </Paper>

          <Alert severity="success" sx={{ mt: 2 }}>
            <strong>Why Bayes' Theorem Matters:</strong> It's the foundation of Bayesian inference,
            medical diagnosis (P(disease|test) from P(test|disease)), and countless applications!
          </Alert>
        </Box>
      )
    },
    {
      label: 'Independence & Covariance',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Statistical Independence
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            X and Y are <strong>independent</strong> if knowing X provides no information about Y,
            and vice versa. Mathematically: the joint distribution factors into marginals.
          </Alert>

          <Typography variant="h6" gutterBottom>
            Definition
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              X and Y are independent if and only if:
            </Typography>
            <MathJax>
              {"\\[ p(x, y) = p_X(x) \\cdot p_Y(y) \\quad \\text{(discrete)} \\]"}
            </MathJax>
            <MathJax>
              {"\\[ f(x, y) = f_X(x) \\cdot f_Y(y) \\quad \\text{(continuous)} \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Equivalently: <strong>p(y|x) = p<sub>Y</sub>(y)</strong> (conditioning doesn't change the distribution)
            </Typography>
          </Paper>

          <Typography variant="h6" gutterBottom>
            Your Joint Distribution
          </Typography>

          <Paper sx={{ p: 2, bgcolor: isIndependent ? '#e8f5e9' : '#ffebee', mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              {isIndependent ? 'Independent ✓' : 'Dependent ✗'}
            </Typography>
            <Typography variant="body2">
              Check: P(A,B) = {jointPMF.table[0][0].toFixed(3)}<br/>
              P(A) × P(B) = {(jointPMF.marginalA[0] * jointPMF.marginalB[0]).toFixed(3)}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {isIndependent ?
                'These match! A and B are independent.' :
                'These differ! A and B are dependent (P(B|A) ≠ P(B|~A)).'}
            </Typography>
          </Paper>

          <Typography variant="h6" gutterBottom>
            Covariance
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Covariance</strong> measures the degree of linear association:
            </Typography>
            <MathJax>
              {"\\[ \\text{Cov}(X, Y) = E[(X - \\mu_X)(Y - \\mu_Y)] = E[XY] - E[X]E[Y] \\]"}
            </MathJax>
            <ul style={{ marginTop: 8, fontSize: '0.875rem' }}>
              <li><strong>Cov(X,Y) &gt; 0:</strong> Positive association (X↑ when Y↑)</li>
              <li><strong>Cov(X,Y) &lt; 0:</strong> Negative association (X↑ when Y↓)</li>
              <li><strong>Cov(X,Y) = 0:</strong> No linear association (uncorrelated)</li>
            </ul>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Note:</strong> If X and Y are independent, then Cov(X,Y) = 0. But the converse
              is not always true! (Uncorrelated ≠ independent in general)
            </Typography>
          </Paper>

          <Typography variant="h6" gutterBottom>
            Correlation Coefficient
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Pearson correlation</strong> standardizes covariance to [-1, 1]:
            </Typography>
            <MathJax>
              {"\\[ \\rho = \\frac{\\text{Cov}(X, Y)}{\\sigma_X \\sigma_Y} \\]"}
            </MathJax>
            <ul style={{ marginTop: 8, fontSize: '0.875rem' }}>
              <li><strong>ρ = +1:</strong> Perfect positive linear relationship</li>
              <li><strong>ρ = −1:</strong> Perfect negative linear relationship</li>
              <li><strong>ρ = 0:</strong> No linear relationship</li>
            </ul>
          </Paper>

          <Typography variant="h6" gutterBottom>
            Interactive: Bivariate Normal
          </Typography>

          <Box sx={{ mb: 2 }}>
            <ToggleButtonGroup
              value={correlationType}
              exclusive
              onChange={(e, val) => val && setCorrelationType(val)}
              size="small"
            >
              <ToggleButton value="positive">Positive (ρ = 0.7)</ToggleButton>
              <ToggleButton value="zero">Zero (ρ = 0)</ToggleButton>
              <ToggleButton value="negative">Negative (ρ = −0.7)</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            {renderScatterPlot()}
          </Box>

          <Typography variant="body2">
            <strong>Interpretation:</strong> The scatter plot shows 100 draws from a bivariate normal
            distribution. Notice how the points cluster along a line when ρ ≠ 0, indicating correlation.
          </Typography>

          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Correlation ≠ Causation!</strong> Even if ρ is strong, it doesn't mean X causes Y
            or vice versa. Confounding variables, reverse causation, or coincidence are possibilities.
          </Alert>
        </Box>
      )
    },
    {
      label: 'Summary & Applications',
      content: (
        <Box>
          <Alert severity="success" icon={<LinkIcon />} sx={{ mb: 3 }}>
            <strong>Congratulations!</strong> You've learned joint and conditional distributions—
            the foundation for understanding multivariate relationships in probability and statistics.
          </Alert>

          <Typography variant="h6" gutterBottom>
            What You've Mastered
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    ✓ Joint Distributions
                  </Typography>
                  <Typography variant="body2">
                    Define and work with joint PMFs and PDFs, describing the probability behavior
                    of multiple random variables simultaneously.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    ✓ Marginal Distributions
                  </Typography>
                  <Typography variant="body2">
                    Extract the distribution of one variable by summing or integrating out others
                    from the joint distribution.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    ✓ Conditional Distributions
                  </Typography>
                  <Typography variant="body2">
                    Calculate and interpret conditional distributions, apply the law of total
                    probability, and use Bayes' theorem.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    ✓ Independence & Correlation
                  </Typography>
                  <Typography variant="body2">
                    Test for statistical independence, compute covariance and correlation, and
                    visualize bivariate relationships.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>
            Key Formulas Summary
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Concept</strong></TableCell>
                  <TableCell><strong>Formula (Discrete)</strong></TableCell>
                  <TableCell><strong>Formula (Continuous)</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Marginal</TableCell>
                  <TableCell>p<sub>X</sub>(x) = Σ<sub>y</sub> p(x,y)</TableCell>
                  <TableCell>f<sub>X</sub>(x) = ∫ f(x,y) dy</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Conditional</TableCell>
                  <TableCell>p(y|x) = p(x,y) / p<sub>X</sub>(x)</TableCell>
                  <TableCell>f(y|x) = f(x,y) / f<sub>X</sub>(x)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Independence</TableCell>
                  <TableCell>p(x,y) = p<sub>X</sub>(x) p<sub>Y</sub>(y)</TableCell>
                  <TableCell>f(x,y) = f<sub>X</sub>(x) f<sub>Y</sub>(y)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Covariance</TableCell>
                  <TableCell colSpan={2}>Cov(X,Y) = E[XY] − E[X]E[Y]</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Correlation</TableCell>
                  <TableCell colSpan={2}>ρ = Cov(X,Y) / (σ<sub>X</sub> σ<sub>Y</sub>)</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6" gutterBottom>
            Real-World Applications
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Risk Modeling
                  </Typography>
                  <Typography variant="body2">
                    Financial portfolios model joint distributions of asset returns to quantify
                    diversification benefits and tail risk.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Machine Learning
                  </Typography>
                  <Typography variant="body2">
                    Naive Bayes classifiers assume conditional independence. Graphical models
                    (Bayesian networks) encode joint distributions compactly.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Epidemiology
                  </Typography>
                  <Typography variant="body2">
                    Disease screening uses Bayes' theorem: P(disease|test+) requires
                    P(test+|disease), prevalence, and test specificity.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>Next Lesson:</strong> In Lesson 6, you'll learn about <strong>transformations
            of random variables</strong> and <strong>moment generating functions</strong>—
            powerful tools for deriving distributions and computing moments.
          </Alert>

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={handleComplete}
            >
              Complete Lesson
            </Button>
          </Box>
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <GroupWorkIcon sx={{ fontSize: 40, color: '#9c27b0', mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#9c27b0' }}>
              Joint & Conditional Distributions
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Understanding Multiple Random Variables
            </Typography>
          </Box>
        </Box>

        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>{step.label}</StepLabel>
              <StepContent>
                {step.content}
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    sx={{ mr: 1 }}
                  >
                    {index === steps.length - 1 ? 'Finish' : 'Continue'}
                  </Button>
                  {index > 0 && (
                    <Button onClick={handleBack}>
                      Back
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>
    </Box>
  );
};

export default Lesson05_JointDistributions;
