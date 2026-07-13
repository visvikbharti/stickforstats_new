/**
 * Lesson 4: The Four Pillars of Power Analysis
 *
 * This lesson provides an in-depth exploration of the four interconnected
 * quantities: Sample Size (n), Effect Size (d), Significance Level (α),
 * and Statistical Power (1-β). Includes interactive calculators and
 * visualizations showing how changing one affects the others.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Grid,
  Slider,
  Alert,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  NavigateNext,
  NavigateBefore,
  CheckCircle,
  ExpandMore,
  Calculate,
  TrendingUp,
  Functions,
  Settings,
  Group,
  BoltOutlined,
  Warning,
} from '@mui/icons-material';
import { alpha as alphaFn } from '@mui/material/styles';

import {
  runPowerCalculation,
  runSampleSizeCalculation,
  runMinimumDetectableEffect,
  runPowerCurve,
} from '../../../statistical-analysis/utils/hubTestService';

// Step titles for the lesson
const steps = [
  'The Four Pillars Overview',
  'Sample Size (n)',
  'Effect Size (d)',
  'Significance Level (α)',
  'Power Interactive Calculator',
];

// This lesson's labels -> the calculator's test names. Every value the toggle can hold is mapped
// explicitly: a t-test variant that falls through to a default is not a rounding error, it is a
// different test (a one-sample power at the same d and n is far larger than a two-sample one).
const BACKEND_TEST_TYPE = {
  'two-sample': 't-test',
  'one-sample': 'one-sample-t',
  paired: 'paired-t',
};

const ALTERNATIVE = { two: 'two-sided', one: 'greater' };

// The chart title names the variant it is actually drawing, which is the one the toggle selects.
const CURVE_TITLE = {
  'two-sample': 'two-sample t-test',
  'one-sample': 'one-sample t-test',
  paired: 'paired t-test',
};

// The benchmark curves are drawn at α = 0.05, as the chart title says. Your α moves the red dot.
const CURVE_ALPHA = 0.05;

const CURVE_EFFECT_SIZES = [
  { d: 0.2, color: '#ff9800', label: 'd = 0.2 (Small)' },
  { d: 0.5, color: '#2196f3', label: 'd = 0.5 (Medium)' },
  { d: 0.8, color: '#4caf50', label: 'd = 0.8 (Large)' },
];

// `(null * 100).toFixed(1)` is "0.0" and `null.toFixed(3)` is a TypeError that unmounts the page.
// A quantity the calculator reports as undefined prints as an em dash, not as zero.
const formatPercent = (value, digits = 1) =>
  value === null || value === undefined || Number.isNaN(value) ? '—' : `${(value * 100).toFixed(digits)}%`;

const formatNumber = (value, digits = 3) =>
  value === null || value === undefined || Number.isNaN(value) ? '—' : value.toFixed(digits);

const Lesson04_FourPillars = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  // Calculator state
  const [solveFor, setSolveFor] = useState('n'); // 'n', 'd', 'alpha', 'power'
  const [sampleSize, setSampleSize] = useState(64);
  const [effectSize, setEffectSize] = useState(0.5);
  const [alpha, setAlpha] = useState(0.05);
  const [power, setPower] = useState(0.80);
  const [testType, setTestType] = useState('two-sample');
  const [tails, setTails] = useState('two');

  // Calculated result. `value` may be null -- see the em-dash formatters above.
  const [calculatedValue, setCalculatedValue] = useState(null);
  const [isCalculating, setIsCalculating] = useState(true);
  const [calcError, setCalcError] = useState(null);

  // Power at the settings the sliders are showing, for the marker on the curve.
  const [currentPower, setCurrentPower] = useState(null);

  // The three benchmark curves, from the backend. null while loading or on failure.
  const [curves, setCurves] = useState(null);
  const [curvesError, setCurvesError] = useState(null);

  // Power curve canvas
  const powerCurveRef = useRef(null);

  /**
   * All three modes now run on the backend, against the exact non-central t.
   *
   * What this lesson used to teach:
   *
   *   * `calculatePower` was a normal approximation to the non-central t, clamped into
   *     [0.0001, 0.9999]. The clamp is an invented claim at both ends.
   *
   *   * `calculateSampleSize` was the closed form n = 2·((z_α + z_β)/d)², which drops the fact
   *     that t's critical value itself depends on n. For d = 0.5, α = 0.05, power = 0.80 -- the
   *     single most common power analysis in the literature -- it returns 63 per group. The answer
   *     is 64: at 63 the design has 0.795 power, not the 0.80 the student is being taught to
   *     expect. The worked example in step 2 of this very lesson says 64.
   *
   *   * `calculateEffectSize` inverted the same closed form, and floored the result at 0.01, so a
   *     design that can detect nothing useful still reported a detectable effect. It is now the
   *     minimum detectable effect, solved against the exact power.
   */
  useEffect(() => {
    let cancelled = false;
    setIsCalculating(true);

    // The sliders fire on every pixel of travel; only the value the user settles on is worth a
    // round trip.
    const timer = setTimeout(async () => {
      const common = {
        testType: BACKEND_TEST_TYPE[testType],
        alpha,
        alternative: ALTERNATIVE[tails],
      };

      try {
        let result;

        if (solveFor === 'n') {
          const backend = await runSampleSizeCalculation({ ...common, effectSize, power });
          result = {
            type: 'n',
            value: backend.requiredN,
            totalN: backend.totalN,
            // The power the design will ACTUALLY have at that integer n -- at or just above the
            // target, never below.
            actualPower: backend.actualPower,
            label: testType === 'two-sample' ? 'Sample Size (per group)' : 'Sample Size',
          };
        } else if (solveFor === 'power') {
          const backend = await runPowerCalculation({ ...common, effectSize, sampleSize });
          result = { type: 'power', value: backend.power, label: 'Statistical Power' };
        } else if (solveFor === 'd') {
          const backend = await runMinimumDetectableEffect({ ...common, sampleSize, power });
          result = { type: 'd', value: backend.effect, label: 'Minimum Detectable Effect Size' };
        } else {
          result = { type: 'alpha', value: null, label: 'Note: α is typically fixed at 0.05' };
        }

        // The marker on the curve is the power of the settings on the sliders, which is the
        // answer we already have when the user is solving for power.
        const markerPower =
          result.type === 'power'
            ? result.value
            : (await runPowerCalculation({ ...common, effectSize, sampleSize })).power;

        if (cancelled) return;
        setCalculatedValue(result);
        setCurrentPower(markerPower);
        setCalcError(null);
      } catch (err) {
        if (cancelled) return;
        setCalculatedValue(null);
        setCurrentPower(null);
        setCalcError(err.message);
      } finally {
        if (!cancelled) setIsCalculating(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [solveFor, sampleSize, effectSize, alpha, power, testType, tails]);

  /**
   * The benchmark curves, from the backend's exact power curve -- one request per effect size.
   *
   * These used to be drawn for the independent two-sample t whatever the toggle said, because the
   * curve service pinned its t-variant to "independent" and there was no way to ask it for another
   * one. The curves were therefore labelled as two-sample and the marker -- which IS
   * variant-specific -- was withheld unless the toggle happened to agree.
   *
   * The curve service now takes the variant, so the honest thing is no longer to caveat the wrong
   * curve; it is to draw the right one. A paired t reaches a given power at far fewer subjects
   * than an independent t at the same d, and that difference is the entire point of the "different
   * designs" pillar this lesson teaches.
   *
   * α is fixed at 0.05 here, as the chart title says.
   */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const series = await Promise.all(
          CURVE_EFFECT_SIZES.map((benchmark) =>
            runPowerCurve({
              testType: BACKEND_TEST_TYPE[testType],
              effectSize: benchmark.d,
              alpha: CURVE_ALPHA,
              alternative: ALTERNATIVE[tails],
              nMin: 5,
              nMax: 200,
              step: 5,
            }).then((points) => ({ ...benchmark, points }))
          )
        );
        if (cancelled) return;
        setCurves(series);
        setCurvesError(null);
      } catch (err) {
        if (cancelled) return;
        // A curve we could not fetch is a chart we do not draw. The result above is unaffected.
        setCurves(null);
        setCurvesError(err.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tails, testType]);

  // Draw power curve
  const drawPowerCurve = useCallback(() => {
    const canvas = powerCurveRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Margins
    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    // Scales
    const xMin = 5;
    const xMax = 200;
    const yMin = 0;
    const yMax = 1;

    const xScale = (x) => margin.left + ((x - xMin) / (xMax - xMin)) * plotWidth;
    const yScale = (y) => margin.top + plotHeight - ((y - yMin) / (yMax - yMin)) * plotHeight;

    // Draw grid
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let y = 0; y <= 1; y += 0.2) {
      ctx.beginPath();
      ctx.moveTo(margin.left, yScale(y));
      ctx.lineTo(width - margin.right, yScale(y));
      ctx.stroke();
    }

    // Vertical grid lines
    for (let x = 0; x <= 200; x += 50) {
      ctx.beginPath();
      ctx.moveTo(xScale(x), margin.top);
      ctx.lineTo(xScale(x), height - margin.bottom);
      ctx.stroke();
    }

    // Draw 80% power reference line
    ctx.strokeStyle = '#4caf50';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(margin.left, yScale(0.8));
    ctx.lineTo(width - margin.right, yScale(0.8));
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw the benchmark curves. A point the backend could not compute is absent from the series
    // rather than plotted at zero, so the line has a gap where the power does not exist.
    (curves || []).forEach(({ color, points }) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();

      points.forEach((point, index) => {
        const x = xScale(point.n);
        const y = yScale(point.power);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    // Mark the current settings. The curves are now drawn for the SELECTED variant, so the marker
    // is a point on a line it actually belongs to and can always be drawn. (It could not be, while
    // these were pinned to two-sample: a paired power at the same d and n sits well above the
    // independent curve, and the dot would have read as a point on a line it was not on.)
    if (currentPower !== null && sampleSize >= xMin && sampleSize <= xMax) {
      ctx.fillStyle = '#d32f2f';
      ctx.beginPath();
      ctx.arc(xScale(sampleSize), yScale(currentPower), 8, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;

    // X-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';

    // X-axis labels
    for (let x = 0; x <= 200; x += 50) {
      ctx.fillText(x.toString(), xScale(x), height - margin.bottom + 20);
    }

    // Y-axis labels
    ctx.textAlign = 'right';
    for (let y = 0; y <= 1; y += 0.2) {
      ctx.fillText(y.toFixed(1), margin.left - 10, yScale(y) + 4);
    }

    // Axis titles
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Sample Size (n per group)', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Statistical Power', 0, 0);
    ctx.restore();

    // Title
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Power Curves: ${CURVE_TITLE[testType]} (α = 0.05)`, width / 2, 20);

    // Legend
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    CURVE_EFFECT_SIZES.forEach(({ color, label }, i) => {
      const legendY = margin.top + 20 + i * 20;
      ctx.fillStyle = color;
      ctx.fillRect(width - margin.right - 130, legendY - 8, 20, 12);
      ctx.fillStyle = '#333';
      ctx.fillText(label, width - margin.right - 105, legendY);
    });

    // 80% line label
    ctx.fillStyle = '#4caf50';
    ctx.fillText('80% Power', margin.left + 10, yScale(0.8) - 5);

    // An empty plot says so. It does not draw three flat lines at zero.
    if (!curves) {
      ctx.fillStyle = '#757575';
      ctx.font = '13px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        curvesError ? 'Power curves are unavailable right now.' : 'Calculating exact power curves…',
        width / 2,
        margin.top + plotHeight / 2
      );
    }

  }, [sampleSize, testType, curves, curvesError, currentPower]);

  useEffect(() => {
    if (activeStep === 0 || activeStep === 4) {
      drawPowerCurve();
    }
  }, [activeStep, drawPowerCurve]);

  // Handle step navigation
  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, activeStep]));
    setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  // Render Step 1: The Four Pillars Overview
  const renderStep1 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        The Four Pillars of Power Analysis
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          Power analysis involves four interconnected quantities. Understanding their relationships
          is the key to designing well-powered studies.
        </Typography>
      </Alert>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ height: '100%', borderTop: '4px solid #4caf50' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Group sx={{ fontSize: 48, color: '#4caf50', mb: 1 }} />
              <Typography variant="h6" gutterBottom>Sample Size</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50' }}>n</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Number of observations in each group
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ height: '100%', borderTop: '4px solid #2196f3' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUp sx={{ fontSize: 48, color: '#2196f3', mb: 1 }} />
              <Typography variant="h6" gutterBottom>Effect Size</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196f3' }}>d</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Standardized magnitude of the effect
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ height: '100%', borderTop: '4px solid #f44336' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Functions sx={{ fontSize: 48, color: '#f44336', mb: 1 }} />
              <Typography variant="h6" gutterBottom>Significance Level</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#f44336' }}>α</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Probability of Type I error
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ height: '100%', borderTop: '4px solid #9c27b0' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <BoltOutlined sx={{ fontSize: 48, color: '#9c27b0', mb: 1 }} />
              <Typography variant="h6" gutterBottom>Statistical Power</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#9c27b0' }}>1-β</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Probability of detecting true effect
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, bgcolor: 'background.default', mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
          The Fundamental Principle
        </Typography>
        <Box sx={{ textAlign: 'center', my: 3 }}>
          <Typography variant="h5" sx={{ fontFamily: 'serif' }}>
            <strong>Know any three → Solve for the fourth</strong>
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ textAlign: 'center' }}>
          These four quantities are mathematically linked. Fixing three determines the fourth.
        </Typography>
      </Paper>

      {/* Power curves visualization */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Power Curves: Visualizing the Relationships
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Each curve shows how power increases with sample size for a given effect size
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <canvas
            ref={powerCurveRef}
            width={700}
            height={400}
            style={{ maxWidth: '100%', border: '1px solid #ddd', borderRadius: 4 }}
          />
        </Box>
      </Paper>

      <Alert severity="success" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Key Insight:</strong> Larger effects are easier to detect (require smaller samples).
          The curves show that detecting a large effect (d = 0.8) requires ~26 per group, while
          detecting a small effect (d = 0.2) requires ~394 per group for 80% power.
        </Typography>
      </Alert>
    </Box>
  );

  // Render Step 2: Sample Size
  const renderStep2 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        Sample Size (n): The Resource You Control
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Sample size is typically what you solve for in power analysis—it's the resource you can
        adjust to achieve your desired power.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#4caf50' }}>
                Why Sample Size Matters
              </Typography>

              <Typography variant="body1" paragraph>
                Larger samples provide more <strong>precise estimates</strong> of population parameters.
                This reduces the overlap between H₀ and H₁ distributions, making effects easier to detect.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 2 }}>
                <Typography variant="body2" sx={{ fontFamily: 'serif', textAlign: 'center' }}>
                  Standard Error = σ / √n
                </Typography>
              </Paper>

              <Typography variant="body2" color="text.secondary">
                As n increases, the standard error decreases, making your test more sensitive
                to real differences.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sample Size Considerations
              </Typography>

              <List>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText
                    primary="Larger n = More power"
                    secondary="But diminishing returns after ~90% power"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Warning sx={{ color: '#ff9800' }} /></ListItemIcon>
                  <ListItemText
                    primary="Resource constraints"
                    secondary="Time, cost, availability of participants/specimens"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Warning sx={{ color: '#ff9800' }} /></ListItemIcon>
                  <ListItemText
                    primary="Ethical considerations"
                    secondary="Minimize animal use while maintaining scientific validity"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText
                    primary="Equal vs unequal groups"
                    secondary="Equal n is most efficient; unequal loses some power"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Sample Size Formula (Two-Sample t-test)
        </Typography>

        <Box sx={{ textAlign: 'center', my: 3 }}>
          <Typography sx={{ fontFamily: 'serif', fontSize: '1.3rem', mb: 2 }}>
            n = 2 × ((z<sub>α/2</sub> + z<sub>β</sub>) / d)²
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2">z<sub>α/2</sub></Typography>
              <Typography variant="body2">
                Critical value for significance level<br/>
                α = 0.05 → z = 1.96<br/>
                α = 0.01 → z = 2.576
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2">z<sub>β</sub></Typography>
              <Typography variant="body2">
                Critical value for power<br/>
                Power = 0.80 → z = 0.84<br/>
                Power = 0.90 → z = 1.28
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2">d</Typography>
              <Typography variant="body2">
                Cohen's d effect size<br/>
                Small = 0.2<br/>
                Medium = 0.5<br/>
                Large = 0.8
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Worked Example: Calculating Sample Size
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Paper sx={{ p: 3, bgcolor: (theme) => alphaFn(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
            <Typography variant="body1" paragraph>
              <strong>Scenario:</strong> You want to detect a medium effect (d = 0.5) with
              80% power at α = 0.05 (two-tailed).
            </Typography>

            <Typography variant="body1" sx={{ fontFamily: 'monospace', mb: 2 }}>
              n = 2 × ((1.96 + 0.84) / 0.5)²<br/>
              n = 2 × (2.80 / 0.5)²<br/>
              n = 2 × 5.6²<br/>
              n = 2 × 31.36<br/>
              n = 62.72 → 63<br/>
              <strong>Exact answer: n = 64 per group (128 total)</strong>
            </Typography>

            <Alert severity="info">
              <Typography variant="body2">
                Round up, and the formula still lands one subject short. The closed form uses the
                NORMAL critical value z<sub>α/2</sub> = 1.96, but the test you will actually run is
                a t-test, whose critical value depends on n and is always larger. Solved against
                the non-central t — which is what the calculator in step 5 does — the answer is 64
                per group. At 63 the design has 79.5% power, not the 80% the formula promises. The
                approximation is fine for teaching the shape of the relationship and not for
                deciding how many people to recruit.
              </Typography>
            </Alert>
          </Paper>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  // Render Step 3: Effect Size
  const renderStep3 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        Effect Size (d): The Magnitude You're Detecting
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Effect size is the standardized magnitude of the effect you want to detect. It's
        crucial for power analysis but often the hardest parameter to specify.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#2196f3' }}>
                What is Effect Size?
              </Typography>

              <Typography variant="body1" paragraph>
                Effect size measures how <strong>big</strong> an effect is in standardized units,
                independent of sample size.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 2 }}>
                <Typography variant="body1" sx={{ fontFamily: 'serif', textAlign: 'center' }}>
                  Cohen's d = (μ₁ - μ₂) / σ<sub>pooled</sub>
                </Typography>
              </Paper>

              <Typography variant="body2">
                <strong>Interpretation:</strong> A Cohen's d of 0.5 means the groups differ
                by half a standard deviation.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cohen's Benchmarks
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Size</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>d</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>% Overlap</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Interpretation</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell><Chip label="Small" size="small" sx={{ bgcolor: '#fff3e0' }} /></TableCell>
                      <TableCell>0.20</TableCell>
                      <TableCell>~85%</TableCell>
                      <TableCell>Subtle difference</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Chip label="Medium" size="small" sx={{ bgcolor: '#e3f2fd' }} /></TableCell>
                      <TableCell>0.50</TableCell>
                      <TableCell>~67%</TableCell>
                      <TableCell>Noticeable difference</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Chip label="Large" size="small" sx={{ bgcolor: '#e8f5e9' }} /></TableCell>
                      <TableCell>0.80</TableCell>
                      <TableCell>~53%</TableCell>
                      <TableCell>Obvious difference</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Caution:</strong> Cohen's benchmarks are context-free conventions.
                  Always consider what constitutes a meaningful effect in your specific field.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          How to Determine Effect Size
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: '#4caf50' }}>
                1. Prior Literature
              </Typography>
              <Typography variant="body2">
                <strong>Gold standard.</strong> Meta-analyses and prior studies provide the
                best estimates of expected effect sizes.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: '#2196f3' }}>
                2. Pilot Data
              </Typography>
              <Typography variant="body2">
                Run a small preliminary study to estimate effect size. Be cautious—pilot
                estimates are often inflated.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: '#ff9800' }}>
                3. MCID
              </Typography>
              <Typography variant="body2">
                <strong>Minimum Clinically Important Difference.</strong> What's the smallest
                effect that would matter practically?
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: '#f44336' }}>
                4. Cohen's Conventions
              </Typography>
              <Typography variant="body2">
                <strong>Last resort.</strong> Use only when no other information is available.
                Often criticized as arbitrary.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Other Effect Size Measures
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Measure</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Test Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Small</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Medium</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Large</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Cohen's d</TableCell>
                  <TableCell>t-tests</TableCell>
                  <TableCell>0.20</TableCell>
                  <TableCell>0.50</TableCell>
                  <TableCell>0.80</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Cohen's f</TableCell>
                  <TableCell>ANOVA</TableCell>
                  <TableCell>0.10</TableCell>
                  <TableCell>0.25</TableCell>
                  <TableCell>0.40</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>r (correlation)</TableCell>
                  <TableCell>Correlation</TableCell>
                  <TableCell>0.10</TableCell>
                  <TableCell>0.30</TableCell>
                  <TableCell>0.50</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Cohen's w</TableCell>
                  <TableCell>Chi-square</TableCell>
                  <TableCell>0.10</TableCell>
                  <TableCell>0.30</TableCell>
                  <TableCell>0.50</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Cohen's f²</TableCell>
                  <TableCell>Regression</TableCell>
                  <TableCell>0.02</TableCell>
                  <TableCell>0.15</TableCell>
                  <TableCell>0.35</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  // Render Step 4: Significance Level
  const renderStep4 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        Significance Level (α): Your False Positive Tolerance
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        The significance level (α) is the maximum probability of Type I error you're willing to accept.
        It's typically fixed at 0.05 by convention, but this choice has important implications.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#f44336' }}>
                What Does α Mean?
              </Typography>

              <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 2 }}>
                <Typography variant="body1" sx={{ fontFamily: 'serif', textAlign: 'center' }}>
                  α = P(Reject H₀ | H₀ is true)
                </Typography>
              </Paper>

              <Typography variant="body1" paragraph>
                If α = 0.05, you accept a <strong>5% risk</strong> of concluding there's an effect
                when there actually isn't one (false positive).
              </Typography>

              <Typography variant="body2" color="text.secondary">
                <strong>Interpretation:</strong> If H₀ were true and you ran the experiment
                many times, you'd incorrectly reject H₀ about 5% of the time.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Common α Levels
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>α</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Use Case</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>z-value (two-tailed)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>0.10</TableCell>
                      <TableCell>Exploratory, hypothesis-generating</TableCell>
                      <TableCell>1.645</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: (theme) => alphaFn(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
                      <TableCell><strong>0.05</strong></TableCell>
                      <TableCell>Standard scientific research</TableCell>
                      <TableCell>1.960</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>0.01</TableCell>
                      <TableCell>Confirmatory, high-stakes</TableCell>
                      <TableCell>2.576</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>0.001</TableCell>
                      <TableCell>Genome-wide, high multiplicity</TableCell>
                      <TableCell>3.291</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>5×10⁻⁸</TableCell>
                      <TableCell>GWAS significance threshold</TableCell>
                      <TableCell>5.451</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          The α-Power Trade-off
        </Typography>

        <Typography variant="body1" paragraph>
          For a fixed sample size and effect size, there's a direct trade-off:
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#f44336' }}>
                Stricter α (e.g., 0.01)
              </Typography>
              <List dense>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText primary="✓ Fewer false positives" />
                </ListItem>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText primary="✗ Lower power" />
                </ListItem>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText primary="✗ Need larger samples" />
                </ListItem>
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2196f3' }}>
                Lenient α (e.g., 0.10)
              </Typography>
              <List dense>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText primary="✓ Higher power" />
                </ListItem>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText primary="✓ Smaller samples needed" />
                </ListItem>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText primary="✗ More false positives" />
                </ListItem>
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      <Alert severity="warning" sx={{ mt: 3 }}>
        <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
          Important: Multiple Comparisons
        </Typography>
        <Typography variant="body2">
          When performing multiple tests, the family-wise error rate inflates. With k independent
          tests at α = 0.05, the probability of at least one false positive is:
          <br/><br/>
          <strong>P(≥1 FP) = 1 - (1-α)ᵏ</strong>
          <br/><br/>
          For 20 tests: 1 - 0.95²⁰ = 64% chance of at least one false positive!
          <br/><br/>
          Solutions: Bonferroni correction (α/k), Holm-Bonferroni, FDR control (Benjamini-Hochberg).
        </Typography>
      </Alert>
    </Box>
  );

  // Render Step 5: Interactive Calculator
  const renderStep5 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        Interactive Power Calculator
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Use this calculator to explore the relationships between the four pillars.
        Lock three parameters and solve for the fourth.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              What would you like to calculate?
            </Typography>

            <ToggleButtonGroup
              value={solveFor}
              exclusive
              onChange={(e, v) => v && setSolveFor(v)}
              fullWidth
              sx={{ mb: 3 }}
            >
              <ToggleButton value="n" sx={{ py: 2 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Group sx={{ fontSize: 24, display: 'block', mx: 'auto', mb: 0.5 }} />
                  <Typography variant="caption">Sample Size</Typography>
                </Box>
              </ToggleButton>
              <ToggleButton value="power" sx={{ py: 2 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <BoltOutlined sx={{ fontSize: 24, display: 'block', mx: 'auto', mb: 0.5 }} />
                  <Typography variant="caption">Power</Typography>
                </Box>
              </ToggleButton>
              <ToggleButton value="d" sx={{ py: 2 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <TrendingUp sx={{ fontSize: 24, display: 'block', mx: 'auto', mb: 0.5 }} />
                  <Typography variant="caption">Effect Size</Typography>
                </Box>
              </ToggleButton>
            </ToggleButtonGroup>

            <Divider sx={{ my: 2 }} />

            {/* Input parameters */}
            {solveFor !== 'n' && (
              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>
                  Sample Size (n per group): <strong>{sampleSize}</strong>
                </Typography>
                <Slider
                  value={sampleSize}
                  onChange={(e, v) => setSampleSize(v)}
                  min={5}
                  max={500}
                  step={1}
                  sx={{ color: '#4caf50' }}
                />
              </Box>
            )}

            {solveFor !== 'd' && (
              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>
                  Effect Size (Cohen's d): <strong>{effectSize}</strong>
                </Typography>
                <Slider
                  value={effectSize}
                  onChange={(e, v) => setEffectSize(v)}
                  min={0.1}
                  max={1.5}
                  step={0.05}
                  marks={[
                    { value: 0.2, label: 'Small' },
                    { value: 0.5, label: 'Medium' },
                    { value: 0.8, label: 'Large' },
                  ]}
                  sx={{ color: '#2196f3' }}
                />
              </Box>
            )}

            <Box sx={{ mb: 3 }}>
              <Typography gutterBottom>
                Significance Level (α): <strong>{alpha}</strong>
              </Typography>
              <Slider
                value={alpha}
                onChange={(e, v) => setAlpha(v)}
                min={0.01}
                max={0.10}
                step={0.01}
                marks={[
                  { value: 0.01, label: '0.01' },
                  { value: 0.05, label: '0.05' },
                  { value: 0.10, label: '0.10' },
                ]}
                sx={{ color: '#f44336' }}
              />
            </Box>

            {solveFor !== 'power' && (
              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>
                  Target Power: <strong>{power}</strong>
                </Typography>
                <Slider
                  value={power}
                  onChange={(e, v) => setPower(v)}
                  min={0.50}
                  max={0.99}
                  step={0.01}
                  marks={[
                    { value: 0.70, label: '70%' },
                    { value: 0.80, label: '80%' },
                    { value: 0.90, label: '90%' },
                  ]}
                  sx={{ color: '#9c27b0' }}
                />
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Test settings */}
            <Typography variant="subtitle2" gutterBottom>Test Settings</Typography>

            <ToggleButtonGroup
              value={testType}
              exclusive
              onChange={(e, v) => v && setTestType(v)}
              size="small"
              fullWidth
              sx={{ mb: 2 }}
            >
              <ToggleButton value="two-sample">Two-Sample</ToggleButton>
              <ToggleButton value="one-sample">One-Sample</ToggleButton>
              <ToggleButton value="paired">Paired</ToggleButton>
            </ToggleButtonGroup>

            <ToggleButtonGroup
              value={tails}
              exclusive
              onChange={(e, v) => v && setTails(v)}
              size="small"
              fullWidth
            >
              <ToggleButton value="two">Two-Tailed</ToggleButton>
              <ToggleButton value="one">One-Tailed</ToggleButton>
            </ToggleButtonGroup>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          {/* Result display */}
          <Paper sx={{ p: 3, mb: 3, bgcolor: (theme) => calculatedValue ? alphaFn(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) : theme.palette.background.default }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#4caf50' }}>
              <Calculate sx={{ mr: 1, verticalAlign: 'middle' }} />
              Result
            </Typography>

            {calcError && (
              <Alert severity="error">
                <Typography variant="body2">This could not be calculated: {calcError}</Typography>
              </Alert>
            )}

            {!calcError && isCalculating && !calculatedValue && (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body2" color="text.secondary">Calculating…</Typography>
              </Box>
            )}

            {!calcError && calculatedValue && calculatedValue.value !== null && (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  {calculatedValue.label}
                </Typography>
                <Typography variant="h2" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                  {calculatedValue.type === 'power'
                    ? formatPercent(calculatedValue.value)
                    : calculatedValue.type === 'd'
                    ? formatNumber(calculatedValue.value)
                    : calculatedValue.value}
                </Typography>
                {calculatedValue.type === 'n' && (
                  <Typography variant="body2" color="text.secondary">
                    {/* The old line printed n × 2 whatever the test was, so a paired design was
                        told to recruit twice the people it needs. The total comes from the
                        calculator, which knows how many samples the test has. */}
                    Total N = {calculatedValue.totalN ?? '—'} · power delivered at this n:{' '}
                    {formatPercent(calculatedValue.actualPower)}
                  </Typography>
                )}
              </Box>
            )}

            {!calcError && calculatedValue && calculatedValue.value === null && (
              <Alert severity="info">
                <Typography variant="body2">
                  {calculatedValue.type === 'alpha'
                    ? calculatedValue.label
                    : `${calculatedValue.label} is not defined for these inputs.`}
                </Typography>
              </Alert>
            )}
          </Paper>

          {/* Power curve */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Power Curves (Current Settings)
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <canvas
                ref={powerCurveRef}
                width={500}
                height={300}
                style={{ maxWidth: '100%', border: '1px solid #ddd', borderRadius: 4 }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
              {`Curves are for the ${CURVE_TITLE[testType]} — the variant selected above. ` +
                `Red dot shows your current settings (n = ${sampleSize}, d = ${effectSize}, α = ${alpha}).`}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Alert severity="success" sx={{ mt: 3 }}>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          Key Insights from the Calculator
        </Typography>
        <Typography variant="body2">
          • Doubling sample size increases power substantially but with diminishing returns<br/>
          • Detecting small effects (d = 0.2) requires ~6× more participants than large effects (d = 0.8)<br/>
          • Using α = 0.01 instead of 0.05 requires ~30% more participants for the same power<br/>
          • One-tailed tests have more power but should only be used when you can justify ignoring one direction
        </Typography>
      </Alert>
    </Box>
  );

  // Render current step content
  const renderStepContent = () => {
    switch (activeStep) {
      case 0: return renderStep1();
      case 1: return renderStep2();
      case 2: return renderStep3();
      case 3: return renderStep4();
      case 4: return renderStep5();
      default: return renderStep1();
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          background: 'linear-gradient(135deg, #d32f2f 0%, #f44336 50%, #ff5722 100%)',
          color: 'white',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Settings sx={{ fontSize: 40, mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Lesson 4: The Four Pillars
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              n, Effect Size, α, and Power Relationships
            </Typography>
          </Box>
        </Box>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          Master the interconnected quantities that determine statistical power and learn to
          calculate any one from the other three.
        </Typography>
      </Paper>

      {/* Stepper */}
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label, index) => (
          <Step key={label} completed={completedSteps.has(index)}>
            <StepLabel
              onClick={() => setActiveStep(index)}
              sx={{ cursor: 'pointer' }}
            >
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Content */}
      <Paper elevation={2} sx={{ p: 4, mb: 3, minHeight: 500 }}>
        {renderStepContent()}
      </Paper>

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          onClick={handleBack}
          disabled={activeStep === 0}
          startIcon={<NavigateBefore />}
        >
          Previous
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {steps.map((_, index) => (
            <Box
              key={index}
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: index === activeStep ? '#d32f2f' :
                         completedSteps.has(index) ? '#4caf50' : '#e0e0e0',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
              onClick={() => setActiveStep(index)}
            />
          ))}
        </Box>

        <Button
          variant="contained"
          onClick={() => {
            if (activeStep === steps.length - 1) {
              if (onComplete) onComplete();
            } else {
              handleNext();
            }
          }}
          endIcon={activeStep === steps.length - 1 ? <CheckCircle /> : <NavigateNext />}
          sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}
        >
          {activeStep === steps.length - 1 ? 'Complete' : 'Next'}
        </Button>
      </Box>

      {/* Completion message */}
      {activeStep === steps.length - 1 && completedSteps.size === steps.length - 1 && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            Lesson Complete! Key Concepts Mastered:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
              <ListItemText primary="The four pillars: n, d, α, and Power (1-β)" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
              <ListItemText primary="Sample size calculation formula and its derivation" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
              <ListItemText primary="Effect size measures and Cohen's benchmarks" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
              <ListItemText primary="The α-power trade-off and multiple testing considerations" />
            </ListItem>
          </List>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Next: Lesson 5 - Effect Size in Depth: Cohen's d, f, r, w, h with Full Derivations
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default Lesson04_FourPillars;
