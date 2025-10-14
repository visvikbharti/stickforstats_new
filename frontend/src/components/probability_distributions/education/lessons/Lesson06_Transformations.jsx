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
import TransformIcon from '@mui/icons-material/Transform';
import FunctionsIcon from '@mui/icons-material/Functions';

/**
 * Probability Lesson 6: Transformations & Moment Generating Functions
 *
 * Topics:
 * - Transformations of random variables
 * - Change of variables technique
 * - Linear transformations
 * - Moment generating functions (MGFs)
 * - Properties and uniqueness of MGFs
 * - Using MGFs to find moments and distributions
 * - MGFs of common distributions
 */

const Lesson06_Transformations = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [xMean, setXMean] = useState(0);
  const [xStd, setXStd] = useState(1);
  const [transformType, setTransformType] = useState('linear');
  const [a, setA] = useState(2);
  const [b, setB] = useState(3);
  const [selectedDist, setSelectedDist] = useState('normal');

  // Generate transformed distribution
  const distributionData = useMemo(() => {
    const xValues = [];
    const yValues = [];
    const fXValues = [];
    const fYValues = [];

    if (transformType === 'linear') {
      // Y = aX + b
      for (let x = -4; x <= 4; x += 0.1) {
        const y = a * x + b;
        // Standard normal PDF
        const fX = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
        const fY = (1 / Math.abs(a)) * (1 / Math.sqrt(2 * Math.PI)) *
                   Math.exp(-0.5 * ((y - b) / a) ** 2);

        xValues.push(x);
        yValues.push(y);
        fXValues.push(fX);
        fYValues.push(fY);
      }

      return {
        xValues,
        yValues,
        fXValues,
        fYValues,
        yMean: b,
        yStd: Math.abs(a),
        formula: `Y = ${a}X + ${b}`
      };
    } else if (transformType === 'square') {
      // Y = X²
      for (let x = -3; x <= 3; x += 0.05) {
        const y = x * x;
        const fX = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);

        xValues.push(x);
        yValues.push(y);
        fXValues.push(fX);
      }

      // For Y = X², need to compute f_Y using Jacobian
      const yValuesUnique = [];
      const fYValuesComp = [];
      for (let y = 0; y <= 9; y += 0.1) {
        if (y === 0) {
          fYValuesComp.push(0);
        } else {
          const sqrtY = Math.sqrt(y);
          const fY = (1 / (2 * sqrtY)) * (
            (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * sqrtY * sqrtY) +
            (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * sqrtY * sqrtY)
          );
          fYValuesComp.push(fY);
        }
        yValuesUnique.push(y);
      }

      return {
        xValues,
        yValues,
        fXValues,
        fYValues: fYValuesComp,
        yValuesUnique,
        yMean: 1, // E[X²] for standard normal
        yStd: Math.sqrt(2),
        formula: 'Y = X²'
      };
    }

    return { xValues: [], yValues: [], fXValues: [], fYValues: [], yMean: 0, yStd: 1, formula: '' };
  }, [transformType, a, b]);

  // MGF formulas for common distributions
  const mgfTable = useMemo(() => {
    return [
      {
        distribution: 'Normal(μ, σ²)',
        mgf: 'exp(μt + σ²t²/2)',
        mean: 'μ',
        variance: 'σ²'
      },
      {
        distribution: 'Exponential(λ)',
        mgf: 'λ/(λ - t), t < λ',
        mean: '1/λ',
        variance: '1/λ²'
      },
      {
        distribution: 'Poisson(λ)',
        mgf: 'exp(λ(e^t - 1))',
        mean: 'λ',
        variance: 'λ'
      },
      {
        distribution: 'Binomial(n, p)',
        mgf: '(pe^t + 1-p)^n',
        mean: 'np',
        variance: 'np(1-p)'
      },
      {
        distribution: 'Uniform(a, b)',
        mgf: '(e^(bt) - e^(at))/(t(b-a))',
        mean: '(a+b)/2',
        variance: '(b-a)²/12'
      },
      {
        distribution: 'Gamma(α, β)',
        mgf: '(1 - t/β)^(-α), t < β',
        mean: 'α/β',
        variance: 'α/β²'
      }
    ];
  }, []);

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleComplete = () => {
    if (onComplete) onComplete();
  };

  // Render distribution visualization
  const renderDistributionPlot = () => {
    const width = 500;
    const height = 300;
    const margin = 50;

    // Use fixed axis range for linear transformation to show the shift when b changes
    // For square transformation, use appropriate range for chi-squared
    const xMin = transformType === 'square' ? 0 : -10;
    const xMax = transformType === 'square' ? 9 : 20;
    const yMax = 0.5;

    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Box sx={{ position: 'relative', width, height, border: '1px solid #ddd', bgcolor: 'white' }}>
          <svg width={width} height={height}>
            {/* Axes */}
            <line x1={margin} y1={height - margin} x2={width - 20} y2={height - margin}
                  stroke="black" strokeWidth="2" />
            <line x1={margin} y1={height - margin} x2={margin} y2={20}
                  stroke="black" strokeWidth="2" />

            {/* Labels */}
            <text x={width / 2} y={height - 10} textAnchor="middle" fontSize="12" fontWeight="bold">
              Value
            </text>
            <text x={10} y={height / 2} textAnchor="middle" fontSize="12" fontWeight="bold"
                  transform={`rotate(-90, 10, ${height / 2})`}>
              Density
            </text>

            {/* Plot transformed distribution */}
            {transformType === 'linear' && distributionData.yValues.length > 0 && (
              <path
                d={distributionData.yValues.map((y, i) => {
                  const x = margin + ((y - xMin) / (xMax - xMin)) * (width - margin - 20);
                  const yCoord = height - margin - (distributionData.fYValues[i] / yMax) * (height - margin - 20);
                  return `${i === 0 ? 'M' : 'L'} ${x} ${yCoord}`;
                }).join(' ')}
                stroke="#2196f3"
                strokeWidth="2"
                fill="none"
              />
            )}

            {transformType === 'square' && distributionData.yValuesUnique && (
              <path
                d={distributionData.yValuesUnique.map((y, i) => {
                  const x = margin + ((y - xMin) / (xMax - xMin)) * (width - margin - 20);
                  const yCoord = height - margin - (distributionData.fYValues[i] / yMax) * (height - margin - 20);
                  return `${i === 0 ? 'M' : 'L'} ${x} ${yCoord}`;
                }).join(' ')}
                stroke="#f44336"
                strokeWidth="2"
                fill="none"
              />
            )}
          </svg>

          <Box sx={{ position: 'absolute', top: 5, left: 5, bgcolor: 'rgba(255,255,255,0.9)',
                     p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {distributionData.formula}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>
              E[Y] ≈ {distributionData.yMean.toFixed(2)}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>
              SD[Y] ≈ {distributionData.yStd.toFixed(2)}
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  };

  const steps = [
    {
      label: 'Transformations of Random Variables',
      content: (
        <Box>
          <Alert severity="info" icon={<TransformIcon />} sx={{ mb: 2 }}>
            <strong>Transformation Problem:</strong> If X is a random variable with known distribution,
            and Y = g(X) for some function g, what is the distribution of Y?
          </Alert>

          <Typography variant="h6" gutterBottom>
            Why Transformations Matter
          </Typography>

          <Typography variant="body2" paragraph>
            Transformations arise constantly in probability and statistics:
          </Typography>

          <ul style={{ fontSize: '0.875rem' }}>
            <li><strong>Unit conversions:</strong> Temperature F = (9/5)C + 32</li>
            <li><strong>Standardization:</strong> Z = (X - μ) / σ</li>
            <li><strong>Nonlinear relationships:</strong> Y = X² (kinetic energy ∝ velocity²)</li>
            <li><strong>Derived quantities:</strong> Ratio, product, or sum of random variables</li>
          </ul>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            The Challenge
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 2 }}>
            <Typography variant="body2">
              Knowing the distribution of X doesn't automatically give us the distribution of Y = g(X).
              We need techniques to <strong>derive f<sub>Y</sub> from f<sub>X</sub></strong>.
            </Typography>
          </Paper>

          <Typography variant="h6" gutterBottom>
            Method 1: CDF Technique
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>General approach (works for any transformation):</strong>
            </Typography>
            <ol style={{ fontSize: '0.875rem', marginTop: 8 }}>
              <li>Find the CDF of Y: F<sub>Y</sub>(y) = P(Y ≤ y) = P(g(X) ≤ y)</li>
              <li>Express in terms of X: Solve g(X) ≤ y for X to get P(X ∈ A)</li>
              <li>Use F<sub>X</sub> to evaluate the probability</li>
              <li>Differentiate to get PDF: f<sub>Y</sub>(y) = dF<sub>Y</sub>/dy</li>
            </ol>
          </Paper>

          <Typography variant="h6" gutterBottom>
            Method 2: Change of Variables (Jacobian)
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>For strictly monotonic g (more direct):</strong>
            </Typography>
            <MathJax>
              {"\\[ f_Y(y) = f_X(g^{-1}(y)) \\left| \\frac{dx}{dy} \\right| \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Where g<sup>-1</sup> is the inverse function and |dx/dy| is the absolute value of the
              derivative (the Jacobian in 1D).
            </Typography>
          </Paper>

          <Alert severity="warning">
            <strong>Non-monotonic Functions:</strong> If g is not one-to-one (e.g., Y = X²),
            you must sum contributions from all x values that map to y.
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Example: Linear Transformation
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#e8f5e9' }}>
            <Typography variant="body2" gutterBottom>
              <strong>If X ~ N(0, 1) and Y = aX + b, then Y ~ N(b, a²)</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Proof using Jacobian:
            </Typography>
            <MathJax>
              {"\\[ x = \\frac{y - b}{a}, \\quad \\frac{dx}{dy} = \\frac{1}{a} \\]"}
            </MathJax>
            <MathJax>
              {"\\[ f_Y(y) = \\frac{1}{|a|} \\cdot \\frac{1}{\\sqrt{2\\pi}} \\exp\\left(-\\frac{1}{2}\\left(\\frac{y-b}{a}\\right)^2\\right) \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              This is the PDF of N(b, a²)!
            </Typography>
          </Paper>
        </Box>
      )
    },
    {
      label: 'Interactive Transformations',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Explore Transformations
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            Start with X ~ N(0,1) and apply transformations. See how the distribution of Y changes!
          </Alert>

          <Box sx={{ mb: 2 }}>
            <ToggleButtonGroup
              value={transformType}
              exclusive
              onChange={(e, val) => val && setTransformType(val)}
              size="small"
            >
              <ToggleButton value="linear">Linear: Y = aX + b</ToggleButton>
              <ToggleButton value="square">Square: Y = X²</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {transformType === 'linear' && (
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Slope (a)
                  </Typography>
                  <Slider
                    value={a}
                    onChange={(e, val) => setA(val)}
                    min={0.5}
                    max={3}
                    step={0.5}
                    marks={[
                      { value: 0.5, label: '0.5' },
                      { value: 2, label: '2' },
                      { value: 3, label: '3' }
                    ]}
                    valueLabelDisplay="on"
                  />
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Intercept (b)
                  </Typography>
                  <Slider
                    value={b}
                    onChange={(e, val) => setB(val)}
                    min={-3}
                    max={6}
                    step={1}
                    marks={[
                      { value: -3, label: '-3' },
                      { value: 0, label: '0' },
                      { value: 6, label: '6' }
                    ]}
                    valueLabelDisplay="on"
                  />
                </Paper>
              </Grid>
            </Grid>
          )}

          {renderDistributionPlot()}

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Original: X ~ N(0, 1)
                  </Typography>
                  <Typography variant="body2">
                    • Mean: 0<br/>
                    • Std Dev: 1<br/>
                    • Symmetric bell curve
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ bgcolor: '#e3f2fd' }}>
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Transformed: Y = {distributionData.formula}
                  </Typography>
                  <Typography variant="body2">
                    • Mean: {distributionData.yMean.toFixed(2)}<br/>
                    • Std Dev: {distributionData.yStd.toFixed(2)}<br/>
                    • {transformType === 'linear' ? 'Still normal!' : 'Chi-squared(1) shape'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Alert severity="success" sx={{ mt: 2 }}>
            <strong>Key Observations:</strong><br/>
            • <strong>Linear transformation (Y = aX + b):</strong> Preserves normality. Mean shifts by b,
            std dev scales by |a|.<br/>
            • <strong>Square transformation (Y = X²):</strong> Creates chi-squared distribution with 1 df.
            No longer symmetric!
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Derivation: Y = X²
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa' }}>
            <Typography variant="body2" gutterBottom>
              For Y = X² where X ~ N(0,1):
            </Typography>
            <MathJax>
              {"\\[ F_Y(y) = P(Y \\leq y) = P(X^2 \\leq y) = P(-\\sqrt{y} \\leq X \\leq \\sqrt{y}) \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Differentiating with respect to y:
            </Typography>
            <MathJax>
              {"\\[ f_Y(y) = \\frac{d}{dy}[\\Phi(\\sqrt{y}) - \\Phi(-\\sqrt{y})] = \\frac{1}{2\\sqrt{y}} [\\phi(\\sqrt{y}) + \\phi(-\\sqrt{y})] \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Since ϕ is symmetric: f<sub>Y</sub>(y) = (1/√y) ϕ(√y) for y &gt; 0
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              This matches the <strong>chi-squared(1)</strong> distribution!
            </Typography>
          </Paper>
        </Box>
      )
    },
    {
      label: 'Moment Generating Functions: Definition',
      content: (
        <Box>
          <Alert severity="info" icon={<FunctionsIcon />} sx={{ mb: 2 }}>
            The <strong>moment generating function (MGF)</strong> is a powerful tool that uniquely
            characterizes a distribution and simplifies moment calculations.
          </Alert>

          <Typography variant="h6" gutterBottom>
            Definition
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              The MGF of random variable X is defined as:
            </Typography>
            <MathJax>
              {"\\[ M_X(t) = E[e^{tX}] \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              For discrete X:
            </Typography>
            <MathJax>
              {"\\[ M_X(t) = \\sum_x e^{tx} p(x) \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              For continuous X:
            </Typography>
            <MathJax>
              {"\\[ M_X(t) = \\int_{-\\infty}^{\\infty} e^{tx} f(x) \\, dx \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              (Provided the integral/sum converges for t in some neighborhood of 0)
            </Typography>
          </Paper>

          <Typography variant="h6" gutterBottom>
            Why "Moment Generating"?
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#e8f5e9', mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Key Property:</strong> The MGF generates moments via derivatives at t=0:
            </Typography>
            <MathJax>
              {"\\[ E[X^n] = M_X^{(n)}(0) = \\left. \\frac{d^n M_X(t)}{dt^n} \\right|_{t=0} \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Proof idea: Expand e<sup>tX</sup> as Taylor series:
            </Typography>
            <MathJax>
              {"\\[ e^{tX} = 1 + tX + \\frac{t^2 X^2}{2!} + \\frac{t^3 X^3}{3!} + \\cdots \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Taking expectations:
            </Typography>
            <MathJax>
              {"\\[ M_X(t) = 1 + t E[X] + \\frac{t^2 E[X^2]}{2!} + \\frac{t^3 E[X^3]}{3!} + \\cdots \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Differentiating n times and setting t=0 extracts E[X<sup>n</sup>]!
            </Typography>
          </Paper>

          <Typography variant="h6" gutterBottom>
            Example: Exponential Distribution
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Let X ~ Exp(λ), so f(x) = λe<sup>-λx</sup> for x ≥ 0:
            </Typography>
            <MathJax>
              {"\\[ M_X(t) = \\int_0^{\\infty} e^{tx} \\lambda e^{-\\lambda x} \\, dx = \\lambda \\int_0^{\\infty} e^{-(\\lambda - t)x} \\, dx \\]"}
            </MathJax>
            <MathJax>
              {"\\[ = \\lambda \\left[ \\frac{e^{-(\\lambda - t)x}}{-(\\lambda - t)} \\right]_0^{\\infty} = \\frac{\\lambda}{\\lambda - t} \\quad (t < \\lambda) \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Now find E[X]:
            </Typography>
            <MathJax>
              {"\\[ M_X'(t) = \\frac{\\lambda}{(\\lambda - t)^2}, \\quad E[X] = M_X'(0) = \\frac{\\lambda}{\\lambda^2} = \\frac{1}{\\lambda} \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Find E[X²]:
            </Typography>
            <MathJax>
              {"\\[ M_X''(t) = \\frac{2\\lambda}{(\\lambda - t)^3}, \\quad E[X^2] = M_X''(0) = \\frac{2}{\\lambda^2} \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Variance: Var(X) = E[X²] - (E[X])² = 2/λ² - 1/λ² = <strong>1/λ²</strong> ✓
            </Typography>
          </Paper>

          <Alert severity="success">
            <strong>Power of MGFs:</strong> Computing moments via integration by parts or other methods
            can be tedious. MGFs provide a systematic, mechanical approach!
          </Alert>
        </Box>
      )
    },
    {
      label: 'Properties & Applications of MGFs',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Key Properties
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Chip label="1. Uniqueness" color="primary" size="small" sx={{ mb: 1 }} />
                  <Typography variant="body2">
                    <strong>Uniqueness Theorem:</strong> If M<sub>X</sub>(t) = M<sub>Y</sub>(t) for all
                    t in some neighborhood of 0, then X and Y have the same distribution.
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                    This means MGF uniquely identifies a distribution!
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Chip label="2. Linear Transformation" color="success" size="small" sx={{ mb: 1 }} />
                  <Typography variant="body2">
                    If Y = aX + b, then:
                  </Typography>
                  <MathJax>
                    {"\\[ M_Y(t) = e^{bt} M_X(at) \\]"}
                  </MathJax>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                    Proof: E[e<sup>tY</sup>] = E[e<sup>t(aX+b)</sup>] = e<sup>bt</sup>E[e<sup>atX</sup>]
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Chip label="3. Sum of Independent RVs" color="warning" size="small" sx={{ mb: 1 }} />
                  <Typography variant="body2">
                    If X and Y are independent, then:
                  </Typography>
                  <MathJax>
                    {"\\[ M_{X+Y}(t) = M_X(t) \\cdot M_Y(t) \\]"}
                  </MathJax>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                    MGFs of sums = product of MGFs (for independent variables)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Chip label="4. Convergence" color="error" size="small" sx={{ mb: 1 }} />
                  <Typography variant="body2">
                    If M<sub>X<sub>n</sub></sub>(t) → M<sub>X</sub>(t) for all t near 0, then
                    X<sub>n</sub> converges in distribution to X.
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                    Useful for proving limit theorems (e.g., CLT)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>
            Application: Sum of Independent Normals
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#e8f5e9', mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Theorem:</strong> If X ~ N(μ<sub>1</sub>, σ<sub>1</sub>²) and Y ~ N(μ<sub>2</sub>, σ<sub>2</sub>²)
              are independent, then X + Y ~ N(μ<sub>1</sub> + μ<sub>2</sub>, σ<sub>1</sub>² + σ<sub>2</sub>²).
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Proof using MGFs:
            </Typography>
            <MathJax>
              {"\\[ M_X(t) = \\exp(\\mu_1 t + \\sigma_1^2 t^2 / 2) \\]"}
            </MathJax>
            <MathJax>
              {"\\[ M_Y(t) = \\exp(\\mu_2 t + \\sigma_2^2 t^2 / 2) \\]"}
            </MathJax>
            <MathJax>
              {"\\[ M_{X+Y}(t) = M_X(t) M_Y(t) = \\exp\\left[(\\mu_1 + \\mu_2) t + (\\sigma_1^2 + \\sigma_2^2) t^2 / 2\\right] \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              This is the MGF of N(μ<sub>1</sub> + μ<sub>2</sub>, σ<sub>1</sub>² + σ<sub>2</sub>²).
              By uniqueness, X + Y has this distribution! ✓
            </Typography>
          </Paper>

          <Typography variant="h6" gutterBottom>
            MGF Table for Common Distributions
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Distribution</strong></TableCell>
                  <TableCell><strong>MGF M(t)</strong></TableCell>
                  <TableCell><strong>Mean</strong></TableCell>
                  <TableCell><strong>Variance</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mgfTable.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.distribution}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {row.mgf}
                    </TableCell>
                    <TableCell>{row.mean}</TableCell>
                    <TableCell>{row.variance}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Alert severity="info">
            <strong>Tip:</strong> When solving problems involving sums of independent random variables,
            MGFs are often the fastest approach—just multiply the MGFs and match to a known form!
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Example: Sum of Poissons
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa' }}>
            <Typography variant="body2" gutterBottom>
              If X ~ Poisson(λ<sub>1</sub>) and Y ~ Poisson(λ<sub>2</sub>) are independent, what is X + Y?
            </Typography>
            <MathJax>
              {"\\[ M_X(t) = \\exp(\\lambda_1 (e^t - 1)), \\quad M_Y(t) = \\exp(\\lambda_2 (e^t - 1)) \\]"}
            </MathJax>
            <MathJax>
              {"\\[ M_{X+Y}(t) = M_X(t) M_Y(t) = \\exp[(\\lambda_1 + \\lambda_2)(e^t - 1)] \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              This is the MGF of Poisson(λ<sub>1</sub> + λ<sub>2</sub>). Therefore, <strong>X + Y ~ Poisson(λ<sub>1</sub> + λ<sub>2</sub>)</strong>!
            </Typography>
          </Paper>
        </Box>
      )
    },
    {
      label: 'Summary & Mastery',
      content: (
        <Box>
          <Alert severity="success" icon={<TransformIcon />} sx={{ mb: 3 }}>
            <strong>Congratulations!</strong> You've completed the Probability Distributions module!
            You now have a comprehensive toolkit for understanding and working with random variables.
          </Alert>

          <Typography variant="h6" gutterBottom>
            What You've Mastered
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    ✓ Transformations
                  </Typography>
                  <Typography variant="body2">
                    Derive the distribution of Y = g(X) using CDF method or Jacobian/change of variables,
                    handling both monotonic and non-monotonic transformations.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    ✓ Moment Generating Functions
                  </Typography>
                  <Typography variant="body2">
                    Define, compute, and use MGFs to find moments, prove distribution results, and
                    work with sums of independent random variables.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    ✓ MGF Properties
                  </Typography>
                  <Typography variant="body2">
                    Apply uniqueness theorem, linear transformation property, and the product rule
                    for independent sums to solve complex problems elegantly.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    ✓ Common Distributions
                  </Typography>
                  <Typography variant="body2">
                    Recall MGFs for Normal, Exponential, Poisson, Binomial, Uniform, and Gamma
                    distributions—your reference table for quick problem-solving.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>
            Complete Module Summary
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#f3e5f5', mb: 3 }}>
            <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
              Lessons 1-6: Your Probability Journey
            </Typography>
            <ul style={{ fontSize: '0.875rem', marginTop: 8 }}>
              <li><strong>Lesson 1:</strong> Discrete distributions (Binomial, Poisson, Geometric)</li>
              <li><strong>Lesson 2:</strong> Continuous distributions (Normal, Exponential, Uniform)</li>
              <li><strong>Lesson 3:</strong> The Central Limit Theorem and its applications</li>
              <li><strong>Lesson 4:</strong> Real-world applications across domains</li>
              <li><strong>Lesson 5:</strong> Joint and conditional distributions, independence, covariance</li>
              <li><strong>Lesson 6:</strong> Transformations and moment generating functions</li>
            </ul>
          </Paper>

          <Typography variant="h6" gutterBottom>
            Key Techniques Summary
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Technique</strong></TableCell>
                  <TableCell><strong>When to Use</strong></TableCell>
                  <TableCell><strong>Key Formula</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>CDF Method</TableCell>
                  <TableCell>Any transformation Y = g(X)</TableCell>
                  <TableCell>F<sub>Y</sub>(y) = P(g(X) ≤ y)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Jacobian</TableCell>
                  <TableCell>Monotonic transformations</TableCell>
                  <TableCell>f<sub>Y</sub>(y) = f<sub>X</sub>(g<sup>-1</sup>(y)) |dx/dy|</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>MGF for Moments</TableCell>
                  <TableCell>Computing E[X<sup>n</sup>]</TableCell>
                  <TableCell>E[X<sup>n</sup>] = M<sup>(n)</sup>(0)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>MGF for Sums</TableCell>
                  <TableCell>Sum of independent RVs</TableCell>
                  <TableCell>M<sub>X+Y</sub>(t) = M<sub>X</sub>(t) M<sub>Y</sub>(t)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>MGF Uniqueness</TableCell>
                  <TableCell>Identifying distributions</TableCell>
                  <TableCell>M<sub>X</sub> = M<sub>Y</sub> ⟹ same distribution</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6" gutterBottom>
            Where to Go Next
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Statistical Inference
                  </Typography>
                  <Typography variant="body2">
                    Apply probability theory to estimation, hypothesis testing, and confidence intervals.
                    Build on your distributions knowledge!
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Stochastic Processes
                  </Typography>
                  <Typography variant="body2">
                    Extend to random variables indexed by time: Markov chains, Poisson processes,
                    Brownian motion, queuing theory.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Bayesian Statistics
                  </Typography>
                  <Typography variant="body2">
                    Use probability distributions as models for uncertainty about parameters.
                    Prior, likelihood, posterior—Bayes' theorem in action!
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Alert severity="success" sx={{ mb: 3 }}>
            <strong>Achievement Unlocked!</strong> You've completed all 6 lessons in the Probability
            Distributions module. You now have the foundational knowledge to tackle advanced statistics,
            machine learning, and data science with confidence.
          </Alert>

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={handleComplete}
              startIcon={<FunctionsIcon />}
            >
              Complete Probability Module!
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
          <TransformIcon sx={{ fontSize: 40, color: '#9c27b0', mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#9c27b0' }}>
              Transformations & MGFs
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Advanced Techniques for Random Variables
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

export default Lesson06_Transformations;
