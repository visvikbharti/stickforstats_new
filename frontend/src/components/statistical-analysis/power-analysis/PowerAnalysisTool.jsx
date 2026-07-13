/**
 * Power Analysis Tool
 *
 * Sample size determination, power calculation, and minimum detectable effect.
 *
 * This header used to say: "All calculations run client-side using validated statistical
 * algorithms. No data leaves your browser." Neither half was true. The calculations ran on
 * `distributionFunctions.js`, whose own header concedes "These are approximations suitable for
 * interactive demonstrations" -- and they were not validated against G*Power, they disagreed with
 * it: the ANOVA sample size came out 2.3x to 3.3x too large, and the non-parametric sizes were the
 * parametric answer divided by a constant that assumes normally-distributed data.
 *
 * Every calculation now runs on the backend, against the exact non-central t, F and chi-square
 * distributions. Only the parameters you type are sent -- your data is not.
 *
 * Scientific Foundation:
 * - Cohen, J. (1988). Statistical power analysis for the behavioral sciences.
 * - Faul, F., et al. (2007). G*Power 3: A flexible statistical power analysis program.
 * - Hoenig, J. M. & Heisey, D. M. (2001). The abuse of power. The American Statistician 55(1).
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  TextField,
  Select,
  MenuItem,
  FormControl,
  FormHelperText,
  InputLabel,
  Button,
  Alert,
  AlertTitle,
  Chip,
  Slider,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
  Divider,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  useTheme
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import CalculateIcon from '@mui/icons-material/Calculate';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupsIcon from '@mui/icons-material/Groups';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ScienceIcon from '@mui/icons-material/Science';
import CodeIcon from '@mui/icons-material/Code';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart
} from 'recharts';

// Import validated power calculation utilities
import {
  runPowerCalculation,
  runSampleSizeCalculation,
  runPowerCurve,
  runMinimumDetectableEffect,
  isPowerTestSupported,
  totalSampleSize,
  acceptsSecondArm,
  secondArmFor,
} from '../utils/hubTestService';
import { interpretEffectSize } from '../../power-analysis/education/utils/powerCalculations';

// Import code generators for R and Python
import {
  generateRCode,
  generatePythonCode,
  downloadCode,
  copyToClipboard
} from '../../../utils/codeExport/powerAnalysisCodeGenerator';

// `(null * 100).toFixed(1)` is "0.0", because null coerces to 0. A power that could not be
// computed therefore used to headline as "0.0%" -- which does not say "we could not work this
// out", it says "this design has no chance whatsoever of detecting the effect". And
// `null.toFixed(3)` is a TypeError that unmounts the page. Both go through these.
const pct = (value, digits = 1) =>
  value === null || value === undefined || Number.isNaN(value) ? '—' : `${(value * 100).toFixed(digits)}%`;

const fx = (value, digits = 3) =>
  value === null || value === undefined || Number.isNaN(value) ? '—' : value.toFixed(digits);

// Small / medium / large, per Cohen. The curve is drawn at these three effect sizes.
const CURVE_BENCHMARKS = {
  d: [0.2, 0.5, 0.8],
  f: [0.1, 0.25, 0.4],
};

// Test type configurations with scientific metadata
const TEST_TYPES = {
  'two-sample-t': {
    name: 'Independent Samples t-test',
    description: 'Compare means of two independent groups',
    effectSizeLabel: "Cohen's d",
    effectSizeBenchmarks: { small: 0.2, medium: 0.5, large: 0.8 },
    formula: 'Power = P(|t| > t_crit | λ = d × √(n₁n₂/(n₁+n₂)))',
    reference: 'Cohen (1988), Chapter 2'
  },
  'one-sample-t': {
    name: 'One-Sample t-test',
    description: 'Compare sample mean to a known value',
    effectSizeLabel: "Cohen's d",
    effectSizeBenchmarks: { small: 0.2, medium: 0.5, large: 0.8 },
    formula: 'Power = P(|t| > t_crit | λ = d × √n)',
    reference: 'Cohen (1988), Chapter 2'
  },
  'paired-t': {
    name: 'Paired Samples t-test',
    description: 'Compare means of matched pairs',
    effectSizeLabel: "Cohen's d (paired)",
    effectSizeBenchmarks: { small: 0.2, medium: 0.5, large: 0.8 },
    formula: 'Power = P(|t| > t_crit | λ = d × √n)',
    reference: 'Cohen (1988), Chapter 2'
  },
  'anova': {
    name: 'One-Way ANOVA',
    description: 'Compare means across multiple groups',
    effectSizeLabel: "Cohen's f",
    effectSizeBenchmarks: { small: 0.10, medium: 0.25, large: 0.40 },
    formula: 'Power = P(F > F_crit | λ = n × k × f²)',
    reference: 'Cohen (1988), Chapter 8'
  },
  'correlation': {
    name: 'Correlation (Pearson r)',
    description: 'Test significance of correlation coefficient',
    effectSizeLabel: 'Correlation r',
    effectSizeBenchmarks: { small: 0.10, medium: 0.30, large: 0.50 },
    formula: "Power based on Fisher's z transformation",
    reference: 'Cohen (1988), Chapter 3'
  },
  'chi-square': {
    name: 'Chi-Square Test',
    description: 'Test of independence or goodness of fit',
    effectSizeLabel: "Cohen's w",
    effectSizeBenchmarks: { small: 0.10, medium: 0.30, large: 0.50 },
    formula: 'Power = P(χ² > χ²_crit | λ = n × w²)',
    reference: 'Cohen (1988), Chapter 7'
  },
  'mann-whitney': {
    name: 'Mann-Whitney U Test',
    description: 'Non-parametric alternative to independent t-test',
    effectSizeLabel: "Cohen's d equivalent",
    effectSizeBenchmarks: { small: 0.2, medium: 0.5, large: 0.8 },
    formula: 'Pitman ARE against the parametric test, for the parent distribution you choose',
    reference: 'Lehmann (1975)'
  },
  'wilcoxon': {
    name: 'Wilcoxon Signed-Rank Test',
    description: 'Non-parametric alternative to paired t-test',
    effectSizeLabel: "Cohen's d equivalent",
    effectSizeBenchmarks: { small: 0.2, medium: 0.5, large: 0.8 },
    formula: 'Pitman ARE against the parametric test, for the parent distribution you choose',
    reference: 'Lehmann (1975)'
  },
  'kruskal-wallis': {
    name: 'Kruskal-Wallis Test',
    description: 'Non-parametric alternative to one-way ANOVA',
    effectSizeLabel: "Cohen's f equivalent",
    effectSizeBenchmarks: { small: 0.10, medium: 0.25, large: 0.40 },
    formula: 'Pitman ARE against the parametric test, for the parent distribution you choose',
    reference: 'Lehmann (1975)'
  }
};

// Calculation modes
const CALC_MODES = {
  power: { label: 'Calculate Power', icon: <BoltIcon />, description: 'Given sample size and effect size, calculate power' },
  sampleSize: { label: 'Calculate Sample Size', icon: <GroupsIcon />, description: 'Given power and effect size, calculate required n' },
  effectSize: { label: 'Calculate Effect Size', icon: <TrendingUpIcon />, description: 'Given sample size and power, find detectable effect' }
};

/**
 * Main Power Analysis Tool Component
 */
const PowerAnalysisTool = ({ data, setData, onComplete }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // State management
  const [calculationMode, setCalculationMode] = useState('sampleSize');
  const [testType, setTestType] = useState('two-sample-t');
  const [alternative, setAlternative] = useState('two-sided');
  const [activeTab, setActiveTab] = useState(0);

  // Input parameters
  const [alpha, setAlpha] = useState(0.05);
  const [power, setPower] = useState(0.80);
  const [effectSize, setEffectSize] = useState(0.5);
  const [sampleSize, setSampleSize] = useState(30);
  const [sampleSize2, setSampleSize2] = useState(30);
  const [numGroups, setNumGroups] = useState(3);
  const [degreesOfFreedom, setDegreesOfFreedom] = useState(1);
  const [allocationRatio, setAllocationRatio] = useState(1);

  // Results
  const [results, setResults] = useState(null);
  const [powerCurveData, setPowerCurveData] = useState(null);
  const [error, setError] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  // Monotonic request counter: only the newest request may write to state.
  const requestRef = useRef(0);
  // The rank tests' power depends on the shape of the parent distribution, and the old code
  // silently assumed 'normal'. It is now the user's choice, and it is shown in the result.
  const [parentDistribution, setParentDistribution] = useState('normal');

  // Code export state
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [codeTab, setCodeTab] = useState(0); // 0 = R, 1 = Python
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Get current test configuration
  const currentTest = TEST_TYPES[testType];

  // NOTE: this must be declared BEFORE calculatePower. It is named in calculatePower's dependency
  // array, and a dependency array is an ordinary argument -- it is evaluated during render, at the
  // useCallback call. With the declaration below, that read hit the temporal dead zone and threw
  // `ReferenceError: Cannot access 'buildPowerCurves' before initialization` on EVERY render, so
  // the whole Power Analysis Tool white-screened. (CI's eslint does not lint .jsx, so nothing
  // caught it; the same TDZ class crashed three other components earlier this month.)
  /**
   * Three exact power curves -- small, medium and large effect -- from the backend.
   *
   * The old version called the browser engine per point and wrote `|| 0` into any point whose
   * power failed to compute, plotting a FAILED calculation as a power of zero.
   */
  // Cohen's benchmarks for THIS test. The chart reads the same value, so its data keys and the
  // keys we fetch can no longer drift apart.
  const usesCohensF = currentTest.effectSizeLabel.includes('f');
  const curveBenchmarks = CURVE_BENCHMARKS[usesCohensF ? 'f' : 'd'];
  const effectSizeSymbol = usesCohensF ? 'f' : 'd';

  /**
   * The second arm of the design being reported. ONE value, ONE rule, read by EVERY consumer.
   *
   * This has been fixed five times, and it came back every time, because the rule for "does this
   * design have a second arm" was re-derived at each call site and the derivations drifted:
   *
   *   1. the power request dropped it entirely -- the box did nothing at all;
   *   2. the total N kept a STALE one after the test changed, exporting 90 subjects for a
   *      Mann-Whitney whose power was computed at 30/30;
   *   3. the code generator put an n2 into the script that the power had ignored;
   *   4. the minimum-detectable-effect request dropped it, answering a 30/60 design as a balanced
   *      30/30 one -- overstating the smallest detectable effect by 16%;
   *   5. and the curve's allocation ratio ignored the MODE. The group-2 box does not render in
   *      sample-size mode, but `sampleSize2` survives in state, so after entering 30/60 in power
   *      mode and switching to sample-size mode the curve was drawn at a 1:2 allocation while the
   *      answer above it ("64 per group") is balanced: the curve claimed 90.1% power at the very n
   *      the answer said gives 80.1%.
   *
   * Two conditions, and BOTH matter: the test must have a second arm, and the box must actually be
   * on screen. A value the user cannot see is not a value they have told us.
   */
  const secondArm = secondArmFor(calculationMode, testType, sampleSize2);

  // n2/n1, held fixed as n1 moves along the curve, so the curve describes the SAME ALLOCATION as
  // the headline rather than a balanced design the user did not ask for. G*Power does the same.
  //
  // To be precise about what this does and does not buy: the curve is drawn at Cohen's benchmark
  // effect sizes (0.2 / 0.5 / 0.8), on a grid of n = 10, 20, ... 500 -- not at the user's own d,
  // and not necessarily at their own n. So it is not literally a line through the headline dot; it
  // is the family of curves the headline belongs to. What is fixed here is that it is no longer the
  // family for a DIFFERENT design.
  const curveAllocationRatio = secondArm && sampleSize ? secondArm / sampleSize : 1;

  const buildPowerCurves = useCallback(async () => {
    if (!isPowerTestSupported(testType)) return null;

    const benchmarks = curveBenchmarks;

    const series = await Promise.all(
      benchmarks.map((es) =>
        runPowerCurve({
          testType,
          effectSize: es,
          alpha,
          groups: numGroups,
          alternative,
          nMin: 10,
          nMax: 500,
          step: 10,
          // Hold n2/n1 fixed as n1 moves along the curve, so the curve describes the user's own
          // allocation instead of a balanced design they did not ask for.
          allocationRatio: curveAllocationRatio,
        }).then((points) => ({ es, points }))
      )
    );

    // Merge the three series on n. A point missing from a series stays missing -- it is not
    // plotted at zero.
    const byN = new Map();
    for (const { es, points } of series) {
      for (const point of points) {
        if (!byN.has(point.n)) byN.set(point.n, { n: point.n });
        byN.get(point.n)[`d_${es}`] = point.power;
      }
    }

    return [...byN.values()].sort((a, b) => a.n - b.n);
  }, [testType, alpha, alternative, numGroups, curveBenchmarks, curveAllocationRatio]);

  /**
   * All three modes now run on the backend, against the exact non-central distributions.
   *
   * This component called the browser-side engine with the CORRECT argument order (unlike the
   * Study Design Wizard, which did not), so it was only ever as wrong as the engine underneath
   * it -- but that engine sat on `distributionFunctions.js`, whose own header concedes: "These
   * are approximations suitable for interactive demonstrations." It was what the production
   * Power Analysis Tool ran on.
   *
   * Two things it did that were not approximation but invention:
   *
   *   - The non-parametric sample sizes were the parametric answer divided by 0.955:
   *     `Math.ceil(parametricResult.n1 / 0.955)`. That IS the standard Pitman-ARE method, but
   *     0.955 = 3/pi is the ARE for a NORMAL parent -- an absurd assumption for a rank test you
   *     reached for BECAUSE normality failed, and it points the wrong way. Under the heavy tails
   *     that drive you off the t-test, the rank test needs FEWER subjects, not 5% more: 43 per
   *     group for a Laplace parent, 22 for an exponential one, against 68 for a normal one. The
   *     parent distribution is now an explicit input and the ARE used is shown.
   *
   *   - `minimumDetectableEffectSize` binary-searched the approximate power. It is now solved
   *     against the exact power on the backend.
   */
  /**
   * An answer belongs to the inputs it was computed from. Change the inputs and it is withdrawn.
   *
   * `results` was only ever cleared by the Reset button, so every input on this screen could be
   * changed underneath a standing answer. The result card, the power curve and the generated
   * R/Python all went on describing the PREVIOUS design, under the new settings.
   *
   * The generated script made it concrete and self-contradictory. `getCodeParams` reads
   * `parentDistribution` from live state and the ARE from `results`, so running a Mann-Whitney
   * under a normal parent and then flipping the dropdown to Laplace -- without recalculating --
   * emitted:
   *
   *     # This analysis assumes a Laplace (heavy-tailed) parent, ARE = 0.9549
   *
   * A Laplace parent has ARE = 1.5. The script named one distribution and computed with another,
   * in the same line.
   *
   * Clearing the result is the whole fix: the code panel already refuses to generate a script when
   * there is no result ("Run a power analysis first"), and the cards render nothing. The bump to
   * `requestRef` withdraws anything still in flight, so a request launched under the old inputs
   * cannot answer under the new ones either.
   *
   * `results` is deliberately NOT in the dependency list -- it is what this effect writes.
   */
  useEffect(() => {
    requestRef.current += 1;
    setResults(null);
    setPowerCurveData(null);
    setError(null);
    setIsCalculating(false);
  }, [testType, calculationMode, alpha, power, effectSize, sampleSize, sampleSize2, numGroups,
      degreesOfFreedom, allocationRatio, alternative, parentDistribution]);

  const calculatePower = useCallback(async () => {
    // Two clicks with different parameters race. If the first is slower, its answer lands last and
    // is displayed against the second set of inputs -- a result for a design the user is no longer
    // looking at. Only the newest request may write.
    const requestId = ++requestRef.current;

    setError(null);
    setIsCalculating(true);

    const common = {
      testType,
      effectSize,
      alpha,
      groups: numGroups,
      df: degreesOfFreedom,
      alternative,
      parentDistribution,
    };

    try {
      let result;

      if (calculationMode === 'power') {

        const backend = await runPowerCalculation({ ...common, sampleSize, sampleSize2: secondArm });
        result = {
          mode: 'power',
          power: backend.power,
          beta: backend.beta,
          ncp: backend.nonCentrality,
          criticalValue: backend.criticalValue,
          interpretation: backend.interpretation,
          // `backend.groups` is numGroups, which DEFAULTS TO 3 and has no UI control for the
          // two-group tests -- the "Number of Groups" field only renders for anova and
          // kruskal-wallis. So `sampleSize * backend.groups` made a two-sample t at n = 30 into a
          // total N of 90. It is not rendered in power mode, which is why it survived, but
          // handleExport writes the whole results object into the downloaded JSON -- so the wrong
          // total went into the artifact the researcher keeps.
          totalN: totalSampleSize(testType, sampleSize, secondArm, numGroups),
          are: backend.are ?? null,
          parentDistribution: backend.parentDistribution ?? null,
          assumptionNote: backend.note ?? null,
        };
      } else if (calculationMode === 'sampleSize') {
        const backend = await runSampleSizeCalculation({ ...common, power });
        const perGroup = backend.perGroup;
        result = {
          mode: 'sampleSize',
          n: backend.requiredN,
          nPerGroup: perGroup,
          n1: perGroup,
          n2: perGroup,
          totalN: backend.totalN,
          // The power the design will ACTUALLY have at that integer n -- at or just above the
          // target, never below.
          achievedPower: backend.actualPower,
          power: backend.actualPower,
          are: backend.are ?? null,
          parentDistribution: backend.parentDistribution ?? null,
          assumptionNote: backend.note ?? null,
          parametricSampleSize: backend.parametricSampleSize ?? null,
        };
      } else {
        const backend = await runMinimumDetectableEffect({
          ...common,
          sampleSize,
          sampleSize2: secondArm,
          power,
        });
        result = {
          mode: 'effectSize',
          effectSize: backend.effect,
          // The chip below wants a benchmark WORD. `backend.note` is a paragraph, and setting it
          // here rendered the whole Hoenig & Heisey explanation as a chip label.
          interpretation:
            backend.effect === null
              ? null
              : interpretEffectSize(backend.effect, usesCohensF ? 'cohens_f' : 'cohens_d'),
          sampleSize,
          power: backend.achievedPower,
        };
      }

      result.testType = testType;
      result.testName = currentTest.name;
      result.alpha = alpha;
      result.effectSizeLabel = currentTest.effectSizeLabel;
      result.reference = currentTest.reference;

      if (requestId !== requestRef.current) return; // superseded
      setResults(result);

      // A missing curve is a missing chart, not a wrong number: the headline result stands even
      // if the curve request fails.
      try {
        const curves = await buildPowerCurves();
        if (requestId === requestRef.current) setPowerCurveData(curves);
      } catch {
        if (requestId === requestRef.current) setPowerCurveData(null);
      }
    } catch (err) {
      if (requestId !== requestRef.current) return;
      setError(err.message);
      setResults(null);
      setPowerCurveData(null);
    } finally {
      if (requestId === requestRef.current) setIsCalculating(false);
    }
  }, [calculationMode, testType, alpha, power, effectSize, sampleSize, sampleSize2,
      numGroups, degreesOfFreedom, alternative, parentDistribution, currentTest, buildPowerCurves,
      usesCohensF]);

  /**
   * Reset all inputs to defaults
   */
  const handleReset = () => {
    setAlpha(0.05);
    setPower(0.80);
    setEffectSize(0.5);
    setSampleSize(30);
    setSampleSize2(30);
    setNumGroups(3);
    setDegreesOfFreedom(1);
    setAllocationRatio(1);
    setResults(null);
    setPowerCurveData(null);
    setError(null);
  };

  /**
   * Export results as JSON
   */
  const handleExport = () => {
    if (!results) return;

    const exportData = {
      analysis: 'Power Analysis',
      timestamp: new Date().toISOString(),
      parameters: {
        testType: currentTest.name,
        calculationMode,
        alpha,
        power: calculationMode === 'power' ? results.power : power,
        effectSize: calculationMode === 'effectSize' ? results.effectSize : effectSize,
        sampleSize: calculationMode === 'sampleSize' ? results.totalN : sampleSize,
        alternative
      },
      results,
      reference: currentTest.reference
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `power_analysis_${testType}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Get interpretation of power level
   */
  const getPowerInterpretation = (powerValue) => {
    // Every `>=` comparison against null is false, so a MISSING power used to fall all the way
    // through to "Very Low -- Likely underpowered study". That is a verdict about a study,
    // delivered with total confidence, by a calculation that failed.
    if (powerValue === null || powerValue === undefined || Number.isNaN(powerValue)) {
      return { level: 'Not computed', color: theme.palette.text.secondary, description: 'Power is not defined for this design' };
    }
    if (powerValue >= 0.95) return { level: 'Excellent', color: theme.palette.success.dark, description: 'Very high probability of detecting effect' };
    if (powerValue >= 0.80) return { level: 'Adequate', color: theme.palette.success.main, description: 'Standard convention for most research' };
    if (powerValue >= 0.60) return { level: 'Moderate', color: theme.palette.warning.main, description: 'Acceptable for exploratory research' };
    if (powerValue >= 0.40) return { level: 'Low', color: theme.palette.error.main, description: 'High risk of Type II error' };
    return { level: 'Very Low', color: theme.palette.error.dark, description: 'Likely underpowered study' };
  };

  /**
   * Get parameters for code generation
   */
  const getCodeParams = useCallback(() => ({
    testType,
    calculationMode,
    alpha,
    power,
    effectSize,
    // The generated script must describe the design whose answer is on screen. Only the tests that
    // HAVE a second arm get one -- the group-2 box does not clear when the test changes, and a
    // stale value handed to a Mann-Whitney would put an n2 in the script that the power ignored.
    sampleSize,
    sampleSize2: secondArm,
    numGroups,
    degreesOfFreedom,
    allocationRatio,
    alternative,
    // The rank-test generators hardcoded the NORMAL-parent ARE (0.955) while the tool computed
    // with whichever parent the user picked. Pick Laplace and the screen said 43 per group while
    // the script you copied computed 68.
    parentDistribution,
    results: results || {}
  }), [testType, calculationMode, alpha, power, effectSize, sampleSize, sampleSize2, numGroups, degreesOfFreedom, allocationRatio, alternative, parentDistribution, results]);

  /**
   * Generate code for current analysis
   */
  const generatedRCode = useMemo(() => {
    if (!results) return '# Run a power analysis first to generate R code';
    return generateRCode(getCodeParams());
  }, [results, getCodeParams]);

  const generatedPythonCode = useMemo(() => {
    if (!results) return '# Run a power analysis first to generate Python code';
    return generatePythonCode(getCodeParams());
  }, [results, getCodeParams]);

  /**
   * Handle copy to clipboard
   */
  const handleCopyCode = async () => {
    const code = codeTab === 0 ? generatedRCode : generatedPythonCode;
    const success = await copyToClipboard(code);
    if (success) {
      setSnackbarMessage(`${codeTab === 0 ? 'R' : 'Python'} code copied to clipboard!`);
      setSnackbarOpen(true);
    }
  };

  /**
   * Handle download code
   */
  const handleDownloadCode = () => {
    const code = codeTab === 0 ? generatedRCode : generatedPythonCode;
    const language = codeTab === 0 ? 'R' : 'Python';
    downloadCode(code, language, testType);
  };

  return (
    <Box sx={{ py: 2 }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <BoltIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Statistical Power Analysis
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Client-side calculations validated against G*Power 3.1.9.7
            </Typography>
          </Box>
        </Box>

        <Alert severity="info" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', '& .MuiAlert-icon': { color: 'white' } }}>
          <Typography variant="body2">
            <strong>Why Power Analysis?</strong> Determine the sample size needed to detect effects of scientific interest
            with adequate probability. Avoid underpowered studies that waste resources and may produce false negatives.
          </Typography>
        </Alert>
      </Paper>

      <Grid container spacing={3}>
        {/* Left Panel - Configuration */}
        <Grid item xs={12} md={5}>
          <Paper elevation={2} sx={{ p: 3 }}>
            {/* Calculation Mode */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <FormLabel sx={{ mb: 1, fontWeight: 600 }}>What do you want to calculate?</FormLabel>
              <RadioGroup
                value={calculationMode}
                onChange={(e) => setCalculationMode(e.target.value)}
              >
                {Object.entries(CALC_MODES).map(([key, mode]) => (
                  <FormControlLabel
                    key={key}
                    value={key}
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {mode.icon}
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{mode.label}</Typography>
                          <Typography variant="caption" color="text.secondary">{mode.description}</Typography>
                        </Box>
                      </Box>
                    }
                    sx={{ mb: 1 }}
                  />
                ))}
              </RadioGroup>
            </FormControl>

            <Divider sx={{ my: 2 }} />

            {/* Test Type Selection */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Statistical Test</InputLabel>
              <Select
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                label="Statistical Test"
              >
                <MenuItem disabled sx={{ fontWeight: 600, opacity: 1 }}>Parametric Tests</MenuItem>
                <MenuItem value="two-sample-t">Independent Samples t-test</MenuItem>
                <MenuItem value="one-sample-t">One-Sample t-test</MenuItem>
                <MenuItem value="paired-t">Paired Samples t-test</MenuItem>
                <MenuItem value="anova">One-Way ANOVA</MenuItem>
                <MenuItem value="correlation">Correlation (Pearson r)</MenuItem>
                <MenuItem value="chi-square">Chi-Square Test</MenuItem>
                <MenuItem disabled sx={{ fontWeight: 600, opacity: 1, mt: 1 }}>Non-Parametric Tests</MenuItem>
                <MenuItem value="mann-whitney">Mann-Whitney U</MenuItem>
                <MenuItem value="wilcoxon">Wilcoxon Signed-Rank</MenuItem>
                <MenuItem value="kruskal-wallis">Kruskal-Wallis</MenuItem>
              </Select>
            </FormControl>

            {/* Test-specific info */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <AlertTitle>{currentTest.name}</AlertTitle>
              <Typography variant="body2">{currentTest.description}</Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Effect size: <strong>{currentTest.effectSizeLabel}</strong>
              </Typography>
              <Typography variant="caption" display="block">
                Benchmarks: Small={currentTest.effectSizeBenchmarks.small},
                Medium={currentTest.effectSizeBenchmarks.medium},
                Large={currentTest.effectSizeBenchmarks.large}
              </Typography>
            </Alert>

            {/* Input Parameters */}
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Input Parameters
            </Typography>

            {/* Alpha (always shown) */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Significance Level (α): <strong>{alpha}</strong>
              </Typography>
              <Slider
                value={alpha}
                onChange={(_, v) => setAlpha(v)}
                min={0.001}
                max={0.10}
                step={0.001}
                marks={[
                  { value: 0.01, label: '0.01' },
                  { value: 0.05, label: '0.05' },
                  { value: 0.10, label: '0.10' }
                ]}
              />
            </Box>

            {/* Power (shown when calculating sample size or effect size) */}
            {calculationMode !== 'power' && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Desired Power (1-β): <strong>{(power * 100).toFixed(0)}%</strong>
                </Typography>
                <Slider
                  value={power}
                  onChange={(_, v) => setPower(v)}
                  min={0.50}
                  max={0.99}
                  step={0.01}
                  marks={[
                    { value: 0.80, label: '80%' },
                    { value: 0.90, label: '90%' },
                    { value: 0.95, label: '95%' }
                  ]}
                />
              </Box>
            )}

            {/* Effect Size (shown when calculating power or sample size) */}
            {calculationMode !== 'effectSize' && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Effect Size ({currentTest.effectSizeLabel}): <strong>{effectSize}</strong>
                  <Chip
                    label={interpretEffectSize(effectSize, currentTest.effectSizeLabel.includes('f') ? 'cohens_f' : 'cohens_d')}
                    size="small"
                    sx={{ ml: 1 }}
                    color={effectSize >= currentTest.effectSizeBenchmarks.large ? 'success' :
                           effectSize >= currentTest.effectSizeBenchmarks.medium ? 'warning' : 'default'}
                  />
                </Typography>
                <Slider
                  value={effectSize}
                  onChange={(_, v) => setEffectSize(v)}
                  min={0.01}
                  max={testType.includes('anova') || testType === 'kruskal-wallis' ? 0.8 : 1.5}
                  step={0.01}
                  marks={[
                    { value: currentTest.effectSizeBenchmarks.small, label: 'S' },
                    { value: currentTest.effectSizeBenchmarks.medium, label: 'M' },
                    { value: currentTest.effectSizeBenchmarks.large, label: 'L' }
                  ]}
                />
              </Box>
            )}

            {/* Sample Size (shown when calculating power or effect size) */}
            {calculationMode !== 'sampleSize' && (
              <>
                <TextField
                  fullWidth
                  label={testType === 'two-sample-t' || testType === 'mann-whitney' ? 'Sample Size (Group 1)' : 'Sample Size'}
                  type="number"
                  value={sampleSize}
                  onChange={(e) => setSampleSize(parseInt(e.target.value) || 0)}
                  sx={{ mb: 2 }}
                  InputProps={{ inputProps: { min: 2 } }}
                />

                {/*
                  Shown only for the two-sample t-test, which is the one test here whose power we
                  can actually compute for unequal groups (non-centrality d*sqrt(n1*n2/(n1+n2))).
                  It used to be shown for Mann-Whitney as well, and in both cases the value was
                  collected and then never sent: enter n1 = 30, n2 = 60 and you were shown the
                  power for 30/30. A field that does nothing is worse than no field, because the
                  user believes they have told us something.
                */}
                {acceptsSecondArm(testType) && (
                  <TextField
                    fullWidth
                    label="Sample Size (Group 2)"
                    type="number"
                    value={sampleSize2}
                    onChange={(e) => setSampleSize2(parseInt(e.target.value) || 0)}
                    sx={{ mb: 2 }}
                    InputProps={{ inputProps: { min: 2 } }}
                    helperText="Leave equal to Group 1 for a balanced design."
                  />
                )}
              </>
            )}

            {/* Test-specific parameters */}
            {(testType === 'anova' || testType === 'kruskal-wallis') && (
              <TextField
                fullWidth
                label="Number of Groups"
                type="number"
                value={numGroups}
                onChange={(e) => setNumGroups(parseInt(e.target.value) || 2)}
                sx={{ mb: 2 }}
                InputProps={{ inputProps: { min: 2, max: 20 } }}
              />
            )}

            {testType === 'chi-square' && (
              <TextField
                fullWidth
                label="Degrees of Freedom"
                type="number"
                value={degreesOfFreedom}
                onChange={(e) => setDegreesOfFreedom(parseInt(e.target.value) || 1)}
                sx={{ mb: 2 }}
                InputProps={{ inputProps: { min: 1 } }}
              />
            )}

            {/*
              The power of a rank test has no distribution-free closed form -- it depends on the
              shape of the distribution the data came from. The old code silently assumed a NORMAL
              parent (ARE = 3/pi), which is an absurd assumption for a test you reached for
              BECAUSE normality failed, and it points the wrong way: under heavy tails the rank
              test needs FEWER subjects than the t-test, not 5% more. So it is a choice now, and
              the ARE that follows from it is shown in the results.
            */}
            {['mann-whitney', 'wilcoxon', 'kruskal-wallis'].includes(testType) && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Parent Distribution</InputLabel>
                <Select
                  value={parentDistribution}
                  onChange={(e) => setParentDistribution(e.target.value)}
                  label="Parent Distribution"
                >
                  <MenuItem value="normal">Normal (ARE 0.955 — rank test needs ~5% more)</MenuItem>
                  <MenuItem value="uniform">Uniform (ARE 1.000)</MenuItem>
                  <MenuItem value="logistic">Logistic (ARE 1.097)</MenuItem>
                  <MenuItem value="laplace">Laplace / heavy-tailed (ARE 1.500)</MenuItem>
                  <MenuItem value="exponential">Exponential / skewed (ARE 3.000)</MenuItem>
                </Select>
                <FormHelperText>
                  A rank test's power depends on the shape of the data. This choice changes the
                  answer substantially — for d = 0.5 at 80% power it moves the requirement from 68
                  per group (normal) to 22 (exponential).
                </FormHelperText>
              </FormControl>
            )}

            {/* Alternative hypothesis */}
            {!['anova', 'chi-square', 'kruskal-wallis'].includes(testType) && (
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Alternative Hypothesis</InputLabel>
                <Select
                  value={alternative}
                  onChange={(e) => setAlternative(e.target.value)}
                  label="Alternative Hypothesis"
                >
                  <MenuItem value="two-sided">Two-sided (μ₁ ≠ μ₂)</MenuItem>
                  <MenuItem value="greater">One-sided (μ₁ &gt; μ₂)</MenuItem>
                  <MenuItem value="less">One-sided (μ₁ &lt; μ₂)</MenuItem>
                </Select>
              </FormControl>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={calculatePower}
                disabled={isCalculating}
                startIcon={<CalculateIcon />}
                fullWidth
              >
                Calculate
              </Button>
              <Button
                variant="outlined"
                onClick={handleReset}
                startIcon={<RefreshIcon />}
              >
                Reset
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Right Panel - Results */}
        <Grid item xs={12} md={7}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertTitle>Calculation Error</AlertTitle>
              {error}
            </Alert>
          )}

          {results && (
            <>
              {/* Main Result Card */}
              <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Results: {currentTest.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Export R/Python Code">
                      <IconButton onClick={() => setCodeDialogOpen(true)} size="small" color="primary">
                        <CodeIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Export JSON Results">
                      <IconButton onClick={handleExport} size="small">
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Primary Result */}
                <Card sx={{ bgcolor: isDarkMode ? theme.palette.primary.dark + '20' : theme.palette.primary.light + '30', mb: 2 }}>
                  <CardContent>
                    {calculationMode === 'power' && (
                      <>
                        <Typography variant="h3" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                          {pct(results.power, 1)}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          Statistical Power
                        </Typography>
                        {(() => {
                          const interp = getPowerInterpretation(results.power);
                          return (
                            <Chip
                              label={interp.level}
                              sx={{ mt: 1, bgcolor: interp.color, color: 'white' }}
                            />
                          );
                        })()}
                      </>
                    )}

                    {calculationMode === 'sampleSize' && (
                      <>
                        <Typography variant="h3" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                          {results.totalN ?? results.n ?? '—'}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          Required Total Sample Size
                        </Typography>
                        {results.n1 && results.n2 && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            Group 1: {results.n1} | Group 2: {results.n2}
                          </Typography>
                        )}
                        {results.nPerGroup && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {results.nPerGroup} per group × {numGroups} groups
                          </Typography>
                        )}
                      </>
                    )}

                    {calculationMode === 'effectSize' && (
                      <>
                        <Typography variant="h3" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                          {fx(results.effectSize, 3)}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          Minimum Detectable {currentTest.effectSizeLabel}
                        </Typography>
                        <Chip
                          label={results.interpretation}
                          sx={{ mt: 1 }}
                          color={results.interpretation === 'large' ? 'success' :
                                 results.interpretation === 'medium' ? 'warning' : 'default'}
                        />
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Detailed Results Table */}
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 500 }}>Test Type</TableCell>
                        <TableCell>{currentTest.name}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 500 }}>Significance Level (α)</TableCell>
                        <TableCell>{alpha}</TableCell>
                      </TableRow>
                      {calculationMode === 'power' ? (
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500 }}>Power (1-β)</TableCell>
                          <TableCell>{pct(results.power, 2)}</TableCell>
                        </TableRow>
                      ) : (
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500 }}>Target Power</TableCell>
                          <TableCell>{(power * 100).toFixed(0)}%</TableCell>
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell sx={{ fontWeight: 500 }}>Effect Size ({currentTest.effectSizeLabel})</TableCell>
                        <TableCell>
                          {calculationMode === 'effectSize' ? fx(results.effectSize, 3) : effectSize}
                        </TableCell>
                      </TableRow>
                      {/* `!== undefined` does NOT catch null, and null.toFixed(4) is a TypeError that
                          unmounts the page. The correlation and rank-test endpoints return no
                          non-centrality at all, so this crashed for four of the nine tests. */}
                      {results.ncp != null && (
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500 }}>Noncentrality Parameter (λ)</TableCell>
                          <TableCell>{results.ncp.toFixed(4)}</TableCell>
                        </TableRow>
                      )}
                      {results.df !== undefined && (
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500 }}>Degrees of Freedom</TableCell>
                          <TableCell>{results.df}</TableCell>
                        </TableRow>
                      )}
                      {results.criticalValue != null && (
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500 }}>Critical Value</TableCell>
                          <TableCell>{results.criticalValue.toFixed(4)}</TableCell>
                        </TableRow>
                      )}
                      {results.are != null && (
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500 }}>Asymptotic Relative Efficiency</TableCell>
                          <TableCell>
                            {results.are.toFixed(4)} vs the parametric test, assuming a{' '}
                            <strong>{results.parentDistribution}</strong> parent distribution
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Reference */}
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  Reference: {currentTest.reference}
                </Typography>
              </Paper>

              {/* Power Curve Visualization */}
              {powerCurveData && powerCurveData.length > 0 && (
                <Paper elevation={2} sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Power Curves by Effect Size
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Shows how power changes with sample size for small (d=0.2), medium (d=0.5), and large (d=0.8) effects
                  </Typography>

                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={powerCurveData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="n"
                        label={{ value: 'Sample Size (per group)', position: 'bottom', offset: -5 }}
                      />
                      <YAxis
                        domain={[0, 1]}
                        tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                        label={{ value: 'Power', angle: -90, position: 'insideLeft' }}
                      />
                      <RechartsTooltip
                        formatter={(value) => `${(value * 100).toFixed(1)}%`}
                        labelFormatter={(n) => `n = ${n}`}
                      />
                      <Legend />
                      <ReferenceLine y={0.8} stroke={theme.palette.text.secondary} strokeDasharray="5 5" label="80%" />
                      {/* The data keys follow CURVE_BENCHMARKS, which is [0.1, 0.25, 0.4] for
                          Cohen's f and [0.2, 0.5, 0.8] for Cohen's d. These <Line> elements used to
                          hardcode the d keys, so every ANOVA and Kruskal-Wallis curve rendered as
                          an empty chart: axes, a legend naming three effect sizes, and no lines. */}
                      {curveBenchmarks.map((es, index) => (
                        <Line
                          key={es}
                          type="monotone"
                          dataKey={`d_${es}`}
                          stroke={[theme.palette.primary.light, theme.palette.primary.main, theme.palette.primary.dark][index]}
                          strokeWidth={2}
                          name={`${['Small', 'Medium', 'Large'][index]} (${effectSizeSymbol} = ${es})`}
                          dot={false}
                          connectNulls={false}
                        />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                </Paper>
              )}

              {/* Interpretation Guide */}
              <Paper elevation={1} sx={{ p: 3, mt: 3, bgcolor: isDarkMode ? theme.palette.warning.dark + '20' : theme.palette.warning.light + '30' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  <ScienceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Interpretation Guide
                </Typography>

                {calculationMode === 'power' && (
                  <Box>
                    {/* Three states, not two. `null >= 0.80` is false, so an undefined power fell
                        into the `else` and was announced as an "Underpowered Study" with "only
                        —% power" -- while the chip above it, which IS tri-state, simultaneously
                        read "Not computed". A design we could not evaluate is not a design we
                        evaluated and found wanting. */}
                    {results.power == null ? (
                      <Alert severity="info" sx={{ mb: 1 }}>
                        <AlertTitle>Power not computed</AlertTitle>
                        The power of this design is not defined, so there is nothing to interpret.
                        This is not a finding about the study; it means the calculation could not be
                        carried out for the values entered.
                      </Alert>
                    ) : results.power >= 0.80 ? (
                      <Alert severity="success" sx={{ mb: 1 }}>
                        <AlertTitle>Adequate Power</AlertTitle>
                        Your study has {pct(results.power, 0)} power to detect an effect of {effectSize}
                        ({currentTest.effectSizeLabel}). This meets the conventional 80% threshold.
                      </Alert>
                    ) : (
                      <Alert severity="warning" sx={{ mb: 1 }}>
                        <AlertTitle>Underpowered Study</AlertTitle>
                        Your study has only {pct(results.power, 0)} power.
                        Consider increasing sample size or accepting a larger effect size of interest.
                      </Alert>
                    )}
                  </Box>
                )}

                {results.assumptionNote && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <AlertTitle>Approximate — this rests on an assumption about your data</AlertTitle>
                    {results.assumptionNote}
                  </Alert>
                )}

                {calculationMode === 'sampleSize' && (
                  <Alert severity="info">
                    <AlertTitle>Sample Size Recommendation</AlertTitle>
                    To detect an effect size of {effectSize} ({interpretEffectSize(effectSize, 'cohens_d')})
                    with {(power * 100).toFixed(0)}% power at α={alpha}, you need{' '}
                    <strong>{results.totalN ?? results.n ?? '—'}</strong> total participants.
                  </Alert>
                )}

                {calculationMode === 'effectSize' && (
                  <Alert severity="info">
                    <AlertTitle>Sensitivity Analysis</AlertTitle>
                    With n={sampleSize} and {(power * 100).toFixed(0)}% power at α={alpha},
                    your study can reliably detect effects of{' '}
                    {fx(results.effectSize, 2)}
                    {results.interpretation && ` (${results.interpretation})`} or larger.
                    Smaller effects may go undetected.
                    <br />
                    <br />
                    This is reported <em>instead of</em> observed (post-hoc) power. Feeding the
                    effect you observed back into the power formula yields a number that is a
                    monotone function of your p-value, so a non-significant result always comes
                    back &ldquo;underpowered&rdquo; by construction — it cannot tell you anything
                    the p-value did not already say (Hoenig &amp; Heisey, 2001).
                  </Alert>
                )}

                <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                  <strong>Note:</strong> Power analysis should be conducted <em>before</em> data collection (a priori).
                  Post-hoc power analysis is generally uninformative—if your test was non-significant,
                  post-hoc power tells you nothing new. Instead, report confidence intervals.
                </Typography>
              </Paper>
            </>
          )}

          {/* Initial state - no results */}
          {!results && !error && (
            <Paper elevation={1} sx={{ p: 4, textAlign: 'center', bgcolor: theme.palette.grey[isDarkMode ? 800 : 50] }}>
              <BoltIcon sx={{ fontSize: 64, color: theme.palette.text.disabled, mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Configure Your Analysis
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select a test type, enter your parameters, and click Calculate to perform power analysis.
              </Typography>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" gutterBottom>
                Quick Effect Size Reference (Cohen's Benchmarks)
              </Typography>
              <TableContainer sx={{ maxWidth: 400, mx: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Test</TableCell>
                      <TableCell align="center">Small</TableCell>
                      <TableCell align="center">Medium</TableCell>
                      <TableCell align="center">Large</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>t-test (d)</TableCell>
                      <TableCell align="center">0.2</TableCell>
                      <TableCell align="center">0.5</TableCell>
                      <TableCell align="center">0.8</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>ANOVA (f)</TableCell>
                      <TableCell align="center">0.10</TableCell>
                      <TableCell align="center">0.25</TableCell>
                      <TableCell align="center">0.40</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Correlation (r)</TableCell>
                      <TableCell align="center">0.10</TableCell>
                      <TableCell align="center">0.30</TableCell>
                      <TableCell align="center">0.50</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Chi-square (w)</TableCell>
                      <TableCell align="center">0.10</TableCell>
                      <TableCell align="center">0.30</TableCell>
                      <TableCell align="center">0.50</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Scientific References */}
      <Paper elevation={1} sx={{ p: 2, mt: 3, bgcolor: theme.palette.grey[isDarkMode ? 800 : 50] }}>
        <Typography variant="caption" color="text.secondary">
          <strong>Scientific Foundation:</strong> Cohen, J. (1988). Statistical power analysis for the behavioral sciences (2nd ed.).
          Lawrence Erlbaum Associates. | Faul, F., Erdfelder, E., Lang, A.-G., & Buchner, A. (2007). G*Power 3:
          A flexible statistical power analysis program for the social, behavioral, and biomedical sciences.
          Behavior Research Methods, 39(2), 175-191.
        </Typography>
      </Paper>

      {/* Code Export Dialog */}
      <Dialog
        open={codeDialogOpen}
        onClose={() => setCodeDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CodeIcon color="primary" />
          Export Reproducible Code
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Reproducibility:</strong> This code replicates your exact analysis in R or Python.
              Run it to verify StickForStats calculations or include in your research paper's supplementary materials.
            </Typography>
          </Alert>

          <Tabs
            value={codeTab}
            onChange={(_, v) => setCodeTab(v)}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>R</Typography>
                  <Chip label="pwr" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>Python</Typography>
                  <Chip label="statsmodels" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                </Box>
              }
            />
          </Tabs>

          <Paper
            elevation={0}
            sx={{
              bgcolor: isDarkMode ? theme.palette.grey[900] : '#1e1e1e',
              color: '#d4d4d4',
              p: 2,
              borderRadius: 1,
              maxHeight: 400,
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {codeTab === 0 ? generatedRCode : generatedPythonCode}
          </Paper>

          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Chip
              label={codeTab === 0 ? 'Requires: pwr package' : 'Requires: statsmodels, scipy'}
              size="small"
              variant="outlined"
            />
            <Chip
              label="G*Power validated"
              size="small"
              color="success"
              variant="outlined"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCodeDialogOpen(false)}>
            Close
          </Button>
          <Button
            startIcon={<ContentCopyIcon />}
            onClick={handleCopyCode}
            variant="outlined"
          >
            Copy Code
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            onClick={handleDownloadCode}
            variant="contained"
          >
            Download {codeTab === 0 ? '.R' : '.py'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for copy confirmation */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default PowerAnalysisTool;
