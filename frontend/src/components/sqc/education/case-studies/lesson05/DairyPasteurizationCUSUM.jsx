import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Chip,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  CheckCircleOutline,
  WarningAmber,
  TrendingUp,
  Science,
  LocalHospital,
  Thermostat,
  BugReport,
  MonetizationOn,
  Timeline
} from '@mui/icons-material';
import { MathJax } from 'better-react-mathjax';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ComposedChart
} from 'recharts';
import { CaseStudyTemplate } from '../components/CaseStudyTemplate';
import { useSQCAnalysisAPI } from '../../../hooks/useSQCAnalysisAPI';

/**
 * Case Study: Dairy Pasteurization Temperature CUSUM Monitoring
 *
 * Industry: Food Manufacturing (Dairy Processing)
 * Problem: Small sustained temperature drift threatening food safety
 * Technique: CUSUM (Cumulative Sum) Control Charts
 * Dataset: 100 temperature readings with 0.5°C shift at reading 30
 *
 * Learning Objectives:
 * - Understand CUSUM charts for detecting small sustained shifts
 * - Learn why Shewhart charts miss small shifts (0.5-2σ)
 * - Apply CUSUM to food safety critical control points (HACCP)
 * - Calculate Average Run Length (ARL) for chart design
 * - Distinguish preventive monitoring from reactive detection
 */

const DairyPasteurizationCUSUM = ({ onComplete }) => {
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const [backendResults, setBackendResults] = useState(null);

  const { cusumChart } = useSQCAnalysisAPI();

  // ============================================================================
  // REALISTIC DATASET: Pasteurization Temperature Monitoring (100 readings)
  // ============================================================================
  const pasteurizationData = useMemo(() => {
    // PureMilk Dairy Co. - HTST Pasteurization Line #2
    // Period: 100 consecutive hourly temperature readings
    // Target: 72.0°C (161.6°F) for 15 seconds (FDA HTST requirement)
    // Specification: 72.0°C ± 1.0°C (regulatory limit)
    //
    // PHASE 1 (Readings 1-29): Normal operation (μ = 72.0°C, σ = 0.3°C)
    // PHASE 2 (Readings 30-100): Heat exchanger fouling causes 0.5°C drift
    //                             (μ = 71.5°C, σ = 0.3°C)
    //
    // CRITICAL ISSUE: 0.5°C shift = 1.67σ shift
    // - Shewhart X̄-R chart: Unlikely to detect (within ±3σ limits)
    // - CUSUM chart: Designed to detect shifts of 0.5-2σ efficiently
    //
    // CONSEQUENCE: Temperature below 72°C increases Listeria monocytogenes
    //              survival risk exponentially

    const data = [];
    const targetTemp = 72.0; // °C (HACCP Critical Limit)
    const normalSigma = 0.3; // °C (process standard deviation)

    // Helper: Box-Muller transform for normal random generation
    const generateNormal = (mean, sigma) => {
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      return mean + z * sigma;
    };

    // Phase 1: Normal operation (Readings 1-29)
    for (let i = 1; i <= 29; i++) {
      const temp = generateNormal(targetTemp, normalSigma);
      data.push({
        reading: i,
        temperature: parseFloat(temp.toFixed(2)),
        timestamp: new Date(2025, 0, 1, 8, 0, 0, 0 + (i - 1) * 3600000).toISOString(),
        shift: 'Shift 1',
        operator: 'Rodriguez',
        phase: 'Normal',
        listeriaRisk: 'Low'
      });
    }

    // Phase 2: Heat exchanger fouling - 0.5°C drift (Readings 30-100)
    const shiftedMean = targetTemp - 0.5; // 71.5°C
    for (let i = 30; i <= 100; i++) {
      const temp = generateNormal(shiftedMean, normalSigma);
      data.push({
        reading: i,
        temperature: parseFloat(temp.toFixed(2)),
        timestamp: new Date(2025, 0, 1, 8, 0, 0, 0 + (i - 1) * 3600000).toISOString(),
        shift: i < 60 ? 'Shift 1' : (i < 85 ? 'Shift 2' : 'Shift 3'),
        operator: i < 60 ? 'Rodriguez' : (i < 85 ? 'Chen' : 'Martinez'),
        phase: 'Drift',
        listeriaRisk: 'ELEVATED'
      });
    }

    return data;
  }, []);

  // Calculate CUSUM statistics
  const cusumStats = useMemo(() => {
    const targetTemp = 72.0; // μ₀
    const sigma = 0.3; // Estimated process standard deviation

    // CUSUM design parameters (standard recommendations)
    // K = (μ₁ - μ₀)/2 where μ₁ is the shift we want to detect
    // For 0.5°C shift: K = 0.5/2 = 0.25°C = 0.833σ
    // Typically use K = 0.5σ for general 1σ shift detection
    const K = 0.5 * sigma; // Reference value = 0.15°C

    // H = decision interval (typically 4-5σ for ARL₀ ≈ 200-500)
    const H = 5 * sigma; // Decision interval = 1.5°C

    // Calculate tabular CUSUM (upper and lower one-sided CUSUMs)
    let cumulativeUpperSum = 0;
    let cumulativeLowerSum = 0;
    const cusumData = [];

    for (let i = 0; i < pasteurizationData.length; i++) {
      const xi = pasteurizationData[i].temperature;

      // Upper CUSUM (detects upward shifts)
      cumulativeUpperSum = Math.max(0, cumulativeUpperSum + (xi - targetTemp - K));

      // Lower CUSUM (detects downward shifts)
      cumulativeLowerSum = Math.max(0, cumulativeLowerSum + (targetTemp - xi - K));

      const upperOutOfControl = cumulativeUpperSum > H;
      const lowerOutOfControl = cumulativeLowerSum > H;

      cusumData.push({
        ...pasteurizationData[i],
        cusumUpper: parseFloat(cumulativeUpperSum.toFixed(3)),
        cusumLower: parseFloat(cumulativeLowerSum.toFixed(3)),
        upperOOC: upperOutOfControl,
        lowerOOC: lowerOutOfControl,
        outOfControl: upperOutOfControl || lowerOutOfControl
      });
    }

    // Find first out-of-control signal
    const firstSignalIndex = cusumData.findIndex(d => d.outOfControl);
    const firstSignalReading = firstSignalIndex >= 0 ? cusumData[firstSignalIndex].reading : null;

    // Count how many readings are out of control
    const outOfControlCount = cusumData.filter(d => d.outOfControl).length;

    // For Shewhart comparison: calculate control limits
    const mean = pasteurizationData.reduce((sum, d) => sum + d.temperature, 0) / pasteurizationData.length;
    const shewhart_UCL = targetTemp + 3 * sigma;
    const shewhart_LCL = targetTemp - 3 * sigma;

    // Count Shewhart violations
    const shewhartViolations = pasteurizationData.filter(
      d => d.temperature > shewhart_UCL || d.temperature < shewhart_LCL
    ).length;

    return {
      targetTemp,
      sigma,
      K,
      H,
      cusumData,
      firstSignalReading,
      outOfControlCount,
      shewhart_UCL,
      shewhart_LCL,
      shewhartViolations,
      actualShiftStart: 30, // Known from data generation
      detectionDelay: firstSignalReading ? firstSignalReading - 30 : null
    };
  }, [pasteurizationData]);

  // ============================================================================
  // SECTION 1: PROBLEM STATEMENT
  // ============================================================================
  const problemStatement = (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
        Business Context: Food Safety Crisis from Small Process Drift
      </Typography>

      <Paper elevation={2} sx={{ p: 3, bgcolor: 'error.light', mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'error.dark' }}>
              <WarningAmber sx={{ mr: 1, verticalAlign: 'middle' }} />
              CRITICAL FOOD SAFETY ISSUE: Pasteurization Temperature Drift
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body1" paragraph>
              <strong>Company:</strong> PureMilk Dairy Co.
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Industry:</strong> Dairy Processing (HTST Pasteurization)
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Regulatory:</strong> FDA FSMA, HACCP Certified, ISO 22000
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body1" paragraph>
              <strong>Daily Production:</strong> 50,000 gallons milk/day
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Critical Control Point:</strong> Pasteurization temperature
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Target:</strong> 72.0°C ± 1.0°C (FDA requirement)
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
        The Crisis
      </Typography>
      <Typography variant="body1" paragraph>
        PureMilk Dairy Co. operates a High-Temperature Short-Time (HTST) pasteurization system,
        a <strong>HACCP Critical Control Point</strong> that must maintain 72.0°C (161.6°F) for
        15 seconds to eliminate pathogens like <em>Listeria monocytogenes</em>, <em>Salmonella</em>,
        and pathogenic <em>E. coli</em>.
      </Typography>

      <Alert severity="error" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>The Hidden Danger:</strong> A gradual 0.5°C temperature drift in the pasteurization
          heat exchanger went undetected by traditional Shewhart X̄-R control charts for <strong>71 hours</strong>,
          potentially exposing 50,000+ consumers to pathogen contamination risk.
        </Typography>
      </Alert>

      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
        Why Traditional Charts Failed
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ bgcolor: 'warning.light', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.dark' }}>
                <Timeline sx={{ mr: 1, verticalAlign: 'middle' }} />
                Shewhart X̄-R Chart
              </Typography>
              <Typography variant="body2" paragraph sx={{ mt: 2 }}>
                <strong>Target:</strong> 72.0°C
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Control Limits:</strong> 72.0°C ± 3σ = 72.0°C ± 0.9°C
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Shift:</strong> 0.5°C (1.67σ)
              </Typography>
              <Typography variant="h5" sx={{ color: 'error.dark', fontWeight: 700, mt: 2 }}>
                0 Violations
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Shift too small to trigger ±3σ limits
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ bgcolor: 'success.light', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.dark' }}>
                <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
                CUSUM Chart
              </Typography>
              <Typography variant="body2" paragraph sx={{ mt: 2 }}>
                <strong>Target:</strong> 72.0°C
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Parameters:</strong> K = 0.5σ, H = 5σ
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Shift:</strong> 0.5°C (1.67σ)
              </Typography>
              <Typography variant="h5" sx={{ color: 'success.dark', fontWeight: 700, mt: 2 }}>
                Signal at Reading {cusumStats.firstSignalReading}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Detection delay: {cusumStats.detectionDelay} readings ({cusumStats.detectionDelay} hours)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
        Food Safety Consequences
      </Typography>
      <Typography variant="body1" paragraph>
        The 0.5°C temperature reduction from 72.0°C to 71.5°C may seem negligible, but microbiology
        tells a different story:
      </Typography>

      <TableContainer component={Paper} elevation={2} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'error.light' }}>
            <TableRow>
              <TableCell><strong>Temperature</strong></TableCell>
              <TableCell><strong>Listeria Log Reduction</strong></TableCell>
              <TableCell><strong>Survival Probability</strong></TableCell>
              <TableCell><strong>Risk Level</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow sx={{ bgcolor: 'success.light' }}>
              <TableCell>72.0°C (15 sec)</TableCell>
              <TableCell>6.5 log (99.9997%)</TableCell>
              <TableCell>0.0003%</TableCell>
              <TableCell>SAFE ✅</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'warning.light' }}>
              <TableCell>71.5°C (15 sec)</TableCell>
              <TableCell>5.2 log (99.9994%)</TableCell>
              <TableCell>0.0006%</TableCell>
              <TableCell>ELEVATED ⚠️</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'error.light' }}>
              <TableCell>71.0°C (15 sec)</TableCell>
              <TableCell>3.8 log (99.98%)</TableCell>
              <TableCell>0.02%</TableCell>
              <TableCell>CRITICAL ❌</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Critical Insight:</strong> A 0.5°C shift DOUBLES the Listeria survival probability
          from 0.0003% → 0.0006%. At 50,000 gallons/day production, this translates to potential
          pathogen presence in 30+ gallons vs. 15 gallons per day — a 100% increase in contamination risk.
        </Typography>
      </Alert>

      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
        Previous Incident: 2023 Listeria Outbreak
      </Typography>
      <Paper elevation={3} sx={{ p: 3, bgcolor: 'grey.100', mb: 3 }}>
        <List>
          <ListItem>
            <ListItemIcon><LocalHospital color="error" /></ListItemIcon>
            <ListItemText
              primary="Health Impact: 12 illnesses, 3 hospitalizations, 1 death"
              secondary="Elderly woman (78) died from Listeria meningitis traced to contaminated milk"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><MonetizationOn color="error" /></ListItemIcon>
            <ListItemText
              primary="Financial Impact: $8.2 million total cost"
              secondary="$3M product recall + $2.5M legal settlements + $1.7M brand damage + $1M FDA fines"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><WarningAmber color="error" /></ListItemIcon>
            <ListItemText
              primary="Operational Impact: 45-day plant shutdown"
              secondary="FDA mandatory shutdown, complete equipment sanitation, HACCP plan revision"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><BugReport color="error" /></ListItemIcon>
            <ListItemText
              primary="Root Cause: Pasteurization temperature drift (undetected for 5 days)"
              secondary="Heat exchanger fouling caused 0.8°C shift that Shewhart charts failed to detect"
            />
          </ListItem>
        </List>
      </Paper>

      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
        Current Situation: History Repeating?
      </Typography>
      <Typography variant="body1" paragraph>
        Quality managers reviewing 100 hours of pasteurization temperature data noticed the mean
        temperature seemed slightly lower than normal, but <strong>Shewhart X̄-R charts showed
        no out-of-control points</strong>. All 100 readings fell within ±3σ control limits.
      </Typography>
      <Typography variant="body1" paragraph>
        However, applying <strong>CUSUM analysis</strong> to the same data revealed a troubling
        pattern: the Lower CUSUM exceeded the decision interval at reading {cusumStats.firstSignalReading},
        indicating a sustained downward shift beginning around reading 30.
      </Typography>

      <Paper elevation={3} sx={{ p: 3, bgcolor: 'info.light', mt: 3 }}>
        <Typography variant="body1" sx={{ fontStyle: 'italic', fontWeight: 500 }}>
          "After the 2023 outbreak, we can't afford to miss another small shift. We need statistical
          tools sensitive enough to detect 0.5°C drifts BEFORE they become food safety crises.
          Traditional Shewhart charts aren't enough for critical control points."
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          <strong>— Dr. Sarah Martinez, VP of Quality & Food Safety</strong>
        </Typography>
      </Paper>

      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
        Statistical Challenge
      </Typography>
      <Typography variant="body1" paragraph>
        Shewhart control charts (X̄-R, p-charts) are designed to detect <strong>large,
        sudden shifts</strong> (≥2.5σ). They use ±3σ control limits, making them insensitive
        to <strong>small, sustained shifts</strong> (0.5-2σ).
      </Typography>
      <Typography variant="body1" paragraph>
        For food safety critical control points, where even 0.5°C matters, we need
        <strong> CUSUM (Cumulative Sum) charts</strong> — specifically designed to detect
        shifts as small as 0.5σ with minimal detection delay.
      </Typography>

      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>CUSUM Advantage:</strong> CUSUM charts accumulate deviations from target,
          making small consistent shifts visible. Average Run Length (ARL) for 1σ shift detection:
          Shewhart ARL ≈ 44 samples, CUSUM ARL ≈ 8 samples (5.5× faster detection).
        </Typography>
      </Alert>
    </Box>
  );

  // ============================================================================
  // SECTION 2: MATHEMATICAL FOUNDATIONS
  // ============================================================================
  const mathematicalFoundations = (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
        CUSUM Theory: Cumulative Sum Control Charts
      </Typography>

      <Typography variant="body1" paragraph>
        CUSUM charts were developed by E.S. Page (1954) to detect small, sustained shifts in
        process mean that Shewhart charts miss. Instead of plotting individual observations or
        sample means, CUSUM charts plot the <strong>cumulative sum of deviations</strong> from
        a target value.
      </Typography>

      <Divider sx={{ my: 3 }} />

      {/* Why CUSUM? */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main' }}>
        1. Why Shewhart Charts Fail for Small Shifts
      </Typography>

      <Paper elevation={2} sx={{ p: 3, bgcolor: 'grey.50', mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          Shewhart Chart Sensitivity Limitation
        </Typography>
        <Typography variant="body2" paragraph>
          Shewhart X̄ chart with ±3σ control limits:
        </Typography>
        <MathJax>
          {`\\[
            \\begin{aligned}
            \\text{UCL} &= \\mu_0 + 3\\sigma \\\\
            \\text{LCL} &= \\mu_0 - 3\\sigma
            \\end{aligned}
          \\]`}
        </MathJax>

        <Typography variant="body2" paragraph sx={{ mt: 2 }}>
          <strong>Detection Probability for Different Shift Sizes:</strong>
        </Typography>
        <TableContainer component={Paper} elevation={1} sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'grey.200' }}>
              <TableRow>
                <TableCell><strong>Shift Size</strong></TableCell>
                <TableCell><strong>Detection Probability (1 sample)</strong></TableCell>
                <TableCell><strong>Average Run Length (ARL)</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>0σ (in-control)</TableCell>
                <TableCell>0.27%</TableCell>
                <TableCell>370 samples</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: 'warning.light' }}>
                <TableCell>0.5σ</TableCell>
                <TableCell>1.2%</TableCell>
                <TableCell>84 samples ⚠️</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: 'warning.light' }}>
                <TableCell>1σ</TableCell>
                <TableCell>2.3%</TableCell>
                <TableCell>44 samples ⚠️</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: 'error.light' }}>
                <TableCell>1.5σ</TableCell>
                <TableCell>6.7%</TableCell>
                <TableCell>15 samples</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: 'success.light' }}>
                <TableCell>2σ</TableCell>
                <TableCell>16%</TableCell>
                <TableCell>6 samples ✅</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: 'success.light' }}>
                <TableCell>3σ</TableCell>
                <TableCell>50%</TableCell>
                <TableCell>2 samples ✅</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="caption">
            <strong>Key Problem:</strong> For 0.5σ shift (our 0.5°C case), Shewhart chart requires
            average of <strong>84 samples</strong> to detect. For 1σ shift, still requires 44 samples.
            This is unacceptable for food safety critical control points.
          </Typography>
        </Alert>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* CUSUM Algorithm */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main' }}>
        2. Tabular CUSUM Algorithm
      </Typography>

      <Typography variant="body1" paragraph>
        The most common CUSUM implementation is the <strong>tabular CUSUM</strong> (also called
        two-sided CUSUM), which uses two one-sided CUSUMs to detect both upward and downward shifts.
      </Typography>

      <Paper elevation={2} sx={{ p: 3, bgcolor: 'grey.50', mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          Upper CUSUM (Detects Upward Shifts)
        </Typography>
        <MathJax>
          {`\\[
            C_i^+ = \\max\\left(0, C_{i-1}^+ + (x_i - \\mu_0 - K)\\right)
          \\]`}
        </MathJax>
        <Typography variant="body2" sx={{ mt: 1 }}>
          where <MathJax inline>{"\\(C_0^+ = 0\\)"}</MathJax> (starting value)
        </Typography>

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          Lower CUSUM (Detects Downward Shifts)
        </Typography>
        <MathJax>
          {`\\[
            C_i^- = \\max\\left(0, C_{i-1}^- + (\\mu_0 - x_i - K)\\right)
          \\]`}
        </MathJax>
        <Typography variant="body2" sx={{ mt: 1 }}>
          where <MathJax inline>{"\\(C_0^- = 0\\)"}</MathJax> (starting value)
        </Typography>

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          Parameters:
        </Typography>
        <List dense>
          <ListItem>
            <MathJax inline>{"\\(x_i\\)"}</MathJax> = individual observation (temperature reading)
          </ListItem>
          <ListItem>
            <MathJax inline>{"\\(\\mu_0\\)"}</MathJax> = target value (72.0°C)
          </ListItem>
          <ListItem>
            <MathJax inline>{"\\(K\\)"}</MathJax> = reference value (allowance, slack value)
          </ListItem>
          <ListItem>
            <MathJax inline>{"\\(H\\)"}</MathJax> = decision interval (control limit for CUSUM)
          </ListItem>
        </List>

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          Out-of-Control Signal:
        </Typography>
        <MathJax>
          {`\\[
            \\text{Signal if: } C_i^+ > H \\text{ or } C_i^- > H
          \\]`}
        </MathJax>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* CUSUM Design Parameters */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main' }}>
        3. Choosing K and H (Design Parameters)
      </Typography>

      <Paper elevation={2} sx={{ p: 3, bgcolor: 'grey.50', mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          Reference Value K
        </Typography>
        <Typography variant="body2" paragraph>
          K determines the magnitude of shift the CUSUM is designed to detect efficiently.
        </Typography>
        <MathJax>
          {`\\[
            K = \\frac{|\\mu_1 - \\mu_0|}{2}
          \\]`}
        </MathJax>
        <Typography variant="body2" paragraph sx={{ mt: 1 }}>
          where:
        </Typography>
        <List dense>
          <ListItem>
            <MathJax inline>{"\\(\\mu_0\\)"}</MathJax> = target mean (in-control)
          </ListItem>
          <ListItem>
            <MathJax inline>{"\\(\\mu_1\\)"}</MathJax> = shifted mean (out-of-control) we want to detect
          </ListItem>
        </List>

        <Typography variant="body2" paragraph sx={{ mt: 2 }}>
          <strong>Common Practice:</strong> To detect a shift of δσ (in standard deviation units):
        </Typography>
        <MathJax>
          {`\\[
            K = \\frac{\\delta\\sigma}{2}
          \\]`}
        </MathJax>

        <Typography variant="body2" paragraph sx={{ mt: 1 }}>
          <strong>Typical Values:</strong>
        </Typography>
        <List dense>
          <ListItem>
            <Typography variant="caption">
              K = 0.5σ → Designed to detect 1σ shift (most common)
            </Typography>
          </ListItem>
          <ListItem>
            <Typography variant="caption">
              K = 0.25σ → Designed to detect 0.5σ shift (very sensitive)
            </Typography>
          </ListItem>
          <ListItem>
            <Typography variant="caption">
              K = 1.0σ → Designed to detect 2σ shift (less sensitive, faster ARL₀)
            </Typography>
          </ListItem>
        </List>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
          Decision Interval H
        </Typography>
        <Typography variant="body2" paragraph>
          H determines the trade-off between false alarm rate (ARL₀) and detection speed (ARL₁).
        </Typography>

        <Typography variant="body2" paragraph>
          <strong>Typical Values:</strong>
        </Typography>
        <MathJax>
          {`\\[
            \\begin{aligned}
            H = 4\\sigma &\\quad \\text{(ARL}_0 \\approx 200\\text{)} \\\\
            H = 5\\sigma &\\quad \\text{(ARL}_0 \\approx 500\\text{, recommended)} \\\\
            H = 6\\sigma &\\quad \\text{(ARL}_0 \\approx 1000\\text{)}
            \\end{aligned}
          \\]`}
        </MathJax>

        <Typography variant="body2" paragraph sx={{ mt: 2 }}>
          where ARL₀ (Average Run Length in-control) is the average number of samples before
          a false alarm when the process is actually in control.
        </Typography>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="caption">
            <strong>Standard Recommendation:</strong> Use K = 0.5σ and H = 5σ for general-purpose
            1σ shift detection with ARL₀ ≈ 500 (similar to Shewhart ±3σ limits which give ARL₀ = 370).
          </Typography>
        </Alert>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* Average Run Length */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main' }}>
        4. Average Run Length (ARL) Analysis
      </Typography>

      <Typography variant="body1" paragraph>
        ARL is the primary performance metric for control charts. It measures the average number
        of samples plotted before a signal is generated.
      </Typography>

      <Paper elevation={2} sx={{ p: 3, bgcolor: 'grey.50', mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          Two Key ARL Values:
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
            <ListItemText
              primary={<MathJax inline>{"\\(\\text{ARL}_0\\)"}</MathJax>}
              secondary="Average Run Length when process is IN CONTROL (larger is better - fewer false alarms)"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><WarningAmber color="error" /></ListItemIcon>
            <ListItemText
              primary={<MathJax inline>{"\\(\\text{ARL}_1\\)"}</MathJax>}
              secondary="Average Run Length when process is OUT OF CONTROL (smaller is better - faster detection)"
            />
          </ListItem>
        </List>

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          ARL Comparison: CUSUM vs. Shewhart
        </Typography>
        <TableContainer component={Paper} elevation={1} sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'primary.light' }}>
              <TableRow>
                <TableCell><strong>Shift Size</strong></TableCell>
                <TableCell align="center"><strong>Shewhart X̄ ARL</strong></TableCell>
                <TableCell align="center"><strong>CUSUM ARL (K=0.5σ, H=5σ)</strong></TableCell>
                <TableCell align="center"><strong>CUSUM Advantage</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>0σ (in-control)</TableCell>
                <TableCell align="center">370</TableCell>
                <TableCell align="center">465</TableCell>
                <TableCell align="center">+26% (fewer false alarms) ✅</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: 'success.light' }}>
                <TableCell>0.5σ</TableCell>
                <TableCell align="center">84</TableCell>
                <TableCell align="center">20</TableCell>
                <TableCell align="center">4.2× faster ✅✅✅</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: 'success.light' }}>
                <TableCell>1.0σ</TableCell>
                <TableCell align="center">44</TableCell>
                <TableCell align="center">8</TableCell>
                <TableCell align="center">5.5× faster ✅✅✅</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: 'success.light' }}>
                <TableCell>1.5σ</TableCell>
                <TableCell align="center">15</TableCell>
                <TableCell align="center">4.7</TableCell>
                <TableCell align="center">3.2× faster ✅✅</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: 'warning.light' }}>
                <TableCell>2.0σ</TableCell>
                <TableCell align="center">6.3</TableCell>
                <TableCell align="center">3.3</TableCell>
                <TableCell align="center">1.9× faster ✅</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: 'warning.light' }}>
                <TableCell>3.0σ</TableCell>
                <TableCell align="center">2.0</TableCell>
                <TableCell align="center">2.0</TableCell>
                <TableCell align="center">≈ Equal</TableCell>
              </TableRow>
            </TableBody>
        </Table>
        </TableContainer>

        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="caption">
            <strong>CUSUM Sweet Spot:</strong> CUSUM dramatically outperforms Shewhart for detecting
            shifts in the 0.5σ to 2σ range (4-5× faster detection). For large shifts (&gt;2.5σ),
            both methods perform similarly. This makes CUSUM ideal for food safety where small shifts matter.
          </Typography>
        </Alert>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* Our Case Study Parameters */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main' }}>
        5. Our Case Study: Pasteurization Temperature CUSUM
      </Typography>

      <Paper elevation={2} sx={{ p: 3, bgcolor: 'info.light', mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          Process Parameters:
        </Typography>
        <List dense>
          <ListItem>
            Target temperature (μ₀) = 72.0°C
          </ListItem>
          <ListItem>
            Process standard deviation (σ) = 0.3°C
          </ListItem>
          <ListItem>
            Actual shift = 0.5°C (from 72.0°C to 71.5°C)
          </ListItem>
          <ListItem>
            Shift in standard deviation units: δ = 0.5/0.3 = 1.67σ
          </ListItem>
        </List>

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
          CUSUM Design:
        </Typography>
        <MathJax>
          {`\\[
            \\begin{aligned}
            K &= 0.5\\sigma = 0.5 \\times 0.3 = 0.15°C \\\\
            H &= 5\\sigma = 5 \\times 0.3 = 1.5°C
            \\end{aligned}
          \\]`}
        </MathJax>

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
          Expected Performance:
        </Typography>
        <Typography variant="body2" paragraph>
          For a 1.67σ shift:
        </Typography>
        <List dense>
          <ListItem>
            Shewhart ARL ≈ 25 samples (interpolated from table)
          </ListItem>
          <ListItem>
            CUSUM ARL ≈ 5 samples (interpolated from table)
          </ListItem>
          <ListItem>
            <strong>Expected CUSUM Advantage: 5× faster detection</strong>
          </ListItem>
        </List>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="caption">
            <strong>Prediction:</strong> CUSUM should detect the 0.5°C shift around reading 30 + 5 = 35,
            while Shewhart chart would require until reading 30 + 25 = 55 (if it detects at all).
          </Typography>
        </Alert>
      </Paper>
    </Box>
  );

  // ============================================================================
  // SECTION 3: DATA & METHODOLOGY
  // ============================================================================
  const dataMethodology = (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
        Data Collection and CUSUM Analysis Methodology
      </Typography>

      <Typography variant="body1" paragraph>
        Following FDA FSMA and HACCP principles for Critical Control Point monitoring, we implement
        a systematic 6-step CUSUM analysis process for pasteurization temperature surveillance.
      </Typography>

      {/* 6-Step Methodology */}
      <Paper elevation={2} sx={{ p: 3, bgcolor: 'info.light', mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          6-Step CUSUM Analysis Process
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon><CheckCircleOutline color="primary" /></ListItemIcon>
            <ListItemText
              primary="Step 1: Data Collection"
              secondary="Continuous temperature monitoring with hourly readings from HTST pasteurizer"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckCircleOutline color="primary" /></ListItemIcon>
            <ListItemText
              primary="Step 2: Establish Baseline (μ₀, σ)"
              secondary="Determine target temperature and process standard deviation from historical in-control data"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckCircleOutline color="primary" /></ListItemIcon>
            <ListItemText
              primary="Step 3: Design CUSUM Parameters (K, H)"
              secondary="Choose K and H based on shift size to detect and acceptable false alarm rate"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckCircleOutline color="primary" /></ListItemIcon>
            <ListItemText
              primary="Step 4: Calculate Tabular CUSUM"
              secondary="Compute upper and lower cumulative sums (C⁺ and C⁻) for each reading"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckCircleOutline color="primary" /></ListItemIcon>
            <ListItemText
              primary="Step 5: Monitor for Out-of-Control Signals"
              secondary="Flag when C⁺ > H (upward shift) or C⁻ > H (downward shift)"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckCircleOutline color="primary" /></ListItemIcon>
            <ListItemText
              primary="Step 6: Investigate and Take Corrective Action"
              secondary="Identify root cause (heat exchanger fouling, sensor drift, etc.) and restore process"
            />
          </ListItem>
        </List>
      </Paper>

      {/* Dataset Overview */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
        Dataset: 100 Hours of Pasteurization Temperature Readings
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                100
              </Typography>
              <Typography variant="body2">
                Hourly Readings
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="info.dark" gutterBottom>
                72.0°C
              </Typography>
              <Typography variant="body2">
                Target Temperature (μ₀)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="warning.dark" gutterBottom>
                0.3°C
              </Typography>
              <Typography variant="body2">
                Process Std Dev (σ)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="error.dark" gutterBottom>
                0.5°C
              </Typography>
              <Typography variant="body2">
                Shift Size (Reading 30)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper} elevation={2} sx={{ mb: 3, maxHeight: 400 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.light' }}>
              <TableCell><strong>Reading</strong></TableCell>
              <TableCell align="right"><strong>Temperature (°C)</strong></TableCell>
              <TableCell align="right"><strong>CUSUM Upper (C⁺)</strong></TableCell>
              <TableCell align="right"><strong>CUSUM Lower (C⁻)</strong></TableCell>
              <TableCell><strong>Phase</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cusumStats.cusumData.slice(0, 20).map((row) => (
              <TableRow
                key={row.reading}
                sx={{
                  bgcolor: row.outOfControl ? 'error.light' :
                          row.phase === 'Normal' ? 'success.light' : 'warning.light'
                }}
              >
                <TableCell>{row.reading}</TableCell>
                <TableCell align="right">{row.temperature}</TableCell>
                <TableCell align="right">{row.cusumUpper}</TableCell>
                <TableCell align="right">{row.cusumLower}</TableCell>
                <TableCell>
                  <Chip
                    label={row.phase}
                    size="small"
                    color={row.phase === 'Normal' ? 'success' : 'warning'}
                  />
                </TableCell>
                <TableCell>
                  {row.outOfControl ? (
                    <Chip label="OUT" size="small" color="error" />
                  ) : (
                    <Chip label="IN" size="small" color="success" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic', mb: 3 }}>
        Table shows first 20 readings. Full dataset contains 100 hourly readings.
      </Typography>

      {/* Step-by-Step CUSUM Calculation Example */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
        Step-by-Step CUSUM Calculation (Readings 28-32)
      </Typography>

      <Paper elevation={2} sx={{ p: 3, bgcolor: 'grey.50', mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          CUSUM Parameters (from design):
        </Typography>
        <List dense>
          <ListItem>Target (μ₀) = 72.0°C</ListItem>
          <ListItem>Std Dev (σ) = 0.3°C</ListItem>
          <ListItem>Reference Value (K) = 0.5σ = 0.15°C</ListItem>
          <ListItem>Decision Interval (H) = 5σ = 1.5°C</ListItem>
        </List>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          Reading 28 (Last Normal Reading):
        </Typography>
        <Typography variant="body2" paragraph>
          x₂₈ = {cusumStats.cusumData[27].temperature}°C (from Phase 1: Normal)
        </Typography>
        <MathJax>
          {`\\[
            \\begin{aligned}
            C_{28}^+ &= \\max(0, C_{27}^+ + (x_{28} - 72.0 - 0.15)) \\\\
            &= \\max(0, ${cusumStats.cusumData[26].cusumUpper} + (${cusumStats.cusumData[27].temperature} - 72.15)) \\\\
            &= \\max(0, ${cusumStats.cusumData[26].cusumUpper} + ${(cusumStats.cusumData[27].temperature - 72.15).toFixed(3)}) \\\\
            &= ${cusumStats.cusumData[27].cusumUpper} \\\\[8pt]
            C_{28}^- &= \\max(0, C_{27}^- + (72.0 - x_{28} - 0.15)) \\\\
            &= \\max(0, ${cusumStats.cusumData[26].cusumLower} + (72.0 - ${cusumStats.cusumData[27].temperature} - 0.15)) \\\\
            &= \\max(0, ${cusumStats.cusumData[26].cusumLower} + ${(72.0 - cusumStats.cusumData[27].temperature - 0.15).toFixed(3)}) \\\\
            &= ${cusumStats.cusumData[27].cusumLower}
            \\end{aligned}
          \\]`}
        </MathJax>
        <Typography variant="body2" paragraph sx={{ mt: 1 }}>
          <strong>Status:</strong> Both C⁺ and C⁻ are &lt; H = 1.5°C → IN CONTROL ✅
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          Reading 30 (First Shifted Reading):
        </Typography>
        <Typography variant="body2" paragraph>
          x₃₀ = {cusumStats.cusumData[29].temperature}°C (from Phase 2: Drift, mean shifted to 71.5°C)
        </Typography>
        <MathJax>
          {`\\[
            \\begin{aligned}
            C_{30}^+ &= \\max(0, C_{29}^+ + (x_{30} - 72.15)) \\\\
            &= \\max(0, ${cusumStats.cusumData[28].cusumUpper} + (${cusumStats.cusumData[29].temperature} - 72.15)) \\\\
            &= ${cusumStats.cusumData[29].cusumUpper} \\\\[8pt]
            C_{30}^- &= \\max(0, C_{29}^- + (71.85 - x_{30})) \\\\
            &= \\max(0, ${cusumStats.cusumData[28].cusumLower} + (71.85 - ${cusumStats.cusumData[29].temperature})) \\\\
            &= ${cusumStats.cusumData[29].cusumLower}
            \\end{aligned}
          \\]`}
        </MathJax>
        <Typography variant="body2" paragraph sx={{ mt: 1 }}>
          <strong>Notice:</strong> C⁻ starts accumulating positive values as temperatures consistently
          fall below target. This is the CUSUM accumulation mechanism at work.
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          Readings 31-32 (Continued Accumulation):
        </Typography>
        <Typography variant="body2" paragraph>
          As the process continues at the shifted mean (71.5°C), each reading contributes approximately
          (72.0 - 71.5 - 0.15) = 0.35°C to C⁻. The cumulative sum grows rapidly:
        </Typography>
        <List dense>
          <ListItem>
            Reading 31: C⁻ ≈ {cusumStats.cusumData[30].cusumLower}°C (accumulating...)
          </ListItem>
          <ListItem>
            Reading 32: C⁻ ≈ {cusumStats.cusumData[31].cusumLower}°C (accumulating...)
          </ListItem>
          <ListItem>
            ...continues until C⁻ exceeds H = 1.5°C
          </ListItem>
        </List>

        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="caption">
            <strong>First Out-of-Control Signal:</strong> C⁻ exceeds H at reading <strong>{cusumStats.firstSignalReading}</strong>,
            which is {cusumStats.detectionDelay} readings after the actual shift at reading 30.
            This demonstrates the CUSUM's rapid detection capability for small shifts.
          </Typography>
        </Alert>
      </Paper>

      {/* Comparison: Shewhart vs CUSUM */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
        Side-by-Side Comparison: Shewhart vs. CUSUM Detection
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent sx={{ bgcolor: 'warning.light' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'warning.dark' }}>
                <Timeline sx={{ mr: 1, verticalAlign: 'middle' }} />
                Shewhart X̄ Chart
              </Typography>
              <Typography variant="body2" paragraph sx={{ mt: 2 }}>
                <strong>Control Limits:</strong>
              </Typography>
              <MathJax>
                {`\\[
                  \\begin{aligned}
                  \\text{UCL} &= 72.0 + 3(0.3) = 72.9°C \\\\
                  \\text{CL} &= 72.0°C \\\\
                  \\text{LCL} &= 72.0 - 3(0.3) = 71.1°C
                  \\end{aligned}
                \\]`}
              </MathJax>
              <Typography variant="body2" paragraph sx={{ mt: 2 }}>
                <strong>Shifted Process Mean:</strong> 71.5°C
              </Typography>
              <Typography variant="body2" paragraph>
                71.1°C &lt; 71.5°C &lt; 72.9°C → All points within limits!
              </Typography>
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  <strong>Result:</strong> {cusumStats.shewhartViolations} out-of-control points detected out of 100 readings.
                  The 0.5°C shift is too small for ±3σ limits to detect reliably.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent sx={{ bgcolor: 'success.light' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'success.dark' }}>
                <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
                CUSUM Chart
              </Typography>
              <Typography variant="body2" paragraph sx={{ mt: 2 }}>
                <strong>CUSUM Parameters:</strong>
              </Typography>
              <MathJax>
                {`\\[
                  \\begin{aligned}
                  K &= 0.5\\sigma = 0.15°C \\\\
                  H &= 5\\sigma = 1.5°C
                  \\end{aligned}
                \\]`}
              </MathJax>
              <Typography variant="body2" paragraph sx={{ mt: 2 }}>
                <strong>Detection Mechanism:</strong> Lower CUSUM (C⁻) accumulates deviations below target.
              </Typography>
              <Typography variant="body2" paragraph>
                After shift: Each reading adds ≈0.35°C to C⁻
              </Typography>
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  <strong>Result:</strong> First signal at reading {cusumStats.firstSignalReading} (only {cusumStats.detectionDelay} readings after shift).
                  CUSUM successfully detects the small sustained shift that Shewhart missed. ✅
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Key Takeaway:</strong> For this 0.5°C (1.67σ) shift, CUSUM detected the problem
          in {cusumStats.detectionDelay} hours, while Shewhart chart showed {cusumStats.shewhartViolations} violations.
          In food safety, this {cusumStats.detectionDelay}-hour faster detection could prevent pathogen
          contamination reaching consumers.
        </Typography>
      </Alert>
    </Box>
  );

  // ============================================================================
  // SECTION 4: INTERACTIVE SIMULATION
  // ============================================================================
  const interactiveSimulation = (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
        Interactive CUSUM Simulation (Backend Integration)
      </Typography>

      <Typography variant="body1" paragraph>
        Click the button below to analyze the 100-hour pasteurization temperature dataset using the
        production-grade SciPy backend API. The backend will calculate CUSUM statistics, detect
        out-of-control signals, and compare performance against Shewhart charts.
      </Typography>

      <Button
        variant="contained"
        color="primary"
        size="large"
        startIcon={backendLoading ? <CircularProgress size={20} color="inherit" /> : <Timeline />}
        onClick={handleAnalyzeWithBackend}
        disabled={backendLoading}
        sx={{ mb: 3 }}
      >
        {backendLoading ? 'Analyzing with Backend...' : 'Analyze CUSUM with Backend API'}
      </Button>

      {backendError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Backend Error:</strong> {backendError}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Please ensure the backend server is running. The analysis will continue with frontend
            calculations as a fallback.
          </Typography>
        </Alert>
      )}

      {backendResults && (
        <Paper elevation={3} sx={{ p: 3, bgcolor: 'success.light', mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'success.dark' }}>
            <CheckCircleOutline sx={{ mr: 1, verticalAlign: 'middle' }} />
            Backend Analysis Results
          </Typography>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                    CUSUM Parameters
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Target (μ₀)"
                        secondary={`${backendResults.target}°C`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Std Dev (σ)"
                        secondary={`${backendResults.std_dev}°C`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Reference Value (K)"
                        secondary={`${backendResults.reference_value}°C (${backendResults.k_sigma}σ)`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Decision Interval (H)"
                        secondary={`${backendResults.decision_interval}°C (${backendResults.h_sigma}σ)`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                    Detection Results
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="First Signal (Upper CUSUM)"
                        secondary={backendResults.first_upper_signal ? `Reading ${backendResults.first_upper_signal}` : 'None detected'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="First Signal (Lower CUSUM)"
                        secondary={backendResults.first_lower_signal ? `Reading ${backendResults.first_lower_signal}` : 'None detected'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Total Out-of-Control Points"
                        secondary={`${backendResults.out_of_control_count} of 100 readings`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Detection Delay (from reading 30)"
                        secondary={backendResults.first_lower_signal ? `${backendResults.first_lower_signal - 30} readings` : 'N/A'}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Fallback: Frontend Calculations */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4 }}>
        Comprehensive CUSUM Analysis (Frontend Calculations)
      </Typography>

      <Grid container spacing={3}>
        {/* CUSUM Statistics */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                CUSUM Design Parameters
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary={`Target (μ₀) = ${cusumStats.targetTemp}°C`}
                    secondary="FDA HTST pasteurization requirement"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={`Process σ = ${cusumStats.sigma}°C`}
                    secondary="Estimated from historical in-control data"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={`K (Reference Value) = ${cusumStats.K}°C (0.5σ)`}
                    secondary="Designed to detect 1σ shifts efficiently"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={`H (Decision Interval) = ${cusumStats.H}°C (5σ)`}
                    secondary="Target ARL₀ ≈ 500 (similar to Shewhart ±3σ)"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Detection Performance */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'error.main' }}>
                Detection Performance
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    {cusumStats.firstSignalReading ? <WarningAmber color="error" /> : <CheckCircleOutline color="success" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={cusumStats.firstSignalReading ?
                      `First CUSUM signal at reading ${cusumStats.firstSignalReading}` :
                      'No out-of-control signals detected'}
                    secondary={cusumStats.firstSignalReading ?
                      'Lower CUSUM (C⁻) exceeded decision interval H' :
                      'Process remained in control throughout monitoring period'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <TrendingUp color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`Detection delay: ${cusumStats.detectionDelay} readings`}
                    secondary={`Shift occurred at reading ${cusumStats.actualShiftStart}, detected at reading ${cusumStats.firstSignalReading}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Thermostat color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`Shewhart violations: ${cusumStats.shewhartViolations}`}
                    secondary="Traditional ±3σ chart failed to detect the 0.5°C shift"
                  />
                </ListItem>
              </List>

              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  <strong>CUSUM Advantage:</strong> Detected shift in {cusumStats.detectionDelay} hours
                  vs. Shewhart's {cusumStats.shewhartViolations} detections in 71 hours. This is
                  a {cusumStats.detectionDelay > 0 ? Math.round((71 - cusumStats.detectionDelay) / cusumStats.detectionDelay * 100) : 'N/A'}%
                  improvement in detection speed.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* CUSUM Values Over Time (Sample) */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                CUSUM Progression (Selected Readings)
              </Typography>
              <TableContainer component={Paper} elevation={1}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'grey.200' }}>
                    <TableRow>
                      <TableCell><strong>Reading</strong></TableCell>
                      <TableCell align="right"><strong>Temp (°C)</strong></TableCell>
                      <TableCell align="right"><strong>C⁺ (Upper)</strong></TableCell>
                      <TableCell align="right"><strong>C⁻ (Lower)</strong></TableCell>
                      <TableCell><strong>Phase</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...cusumStats.cusumData.slice(25, 30), ...cusumStats.cusumData.slice(29, 45)].map((row) => (
                      <TableRow
                        key={row.reading}
                        sx={{
                          bgcolor: row.outOfControl ? 'error.light' :
                                  row.reading < 30 ? 'success.light' : 'warning.light'
                        }}
                      >
                        <TableCell>{row.reading}</TableCell>
                        <TableCell align="right">{row.temperature}</TableCell>
                        <TableCell align="right">{row.cusumUpper}</TableCell>
                        <TableCell align="right" sx={{
                          fontWeight: row.cusumLower > cusumStats.H * 0.8 ? 'bold' : 'normal',
                          color: row.cusumLower > cusumStats.H ? 'error.main' : 'inherit'
                        }}>
                          {row.cusumLower}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={row.phase}
                            size="small"
                            color={row.phase === 'Normal' ? 'success' : 'warning'}
                          />
                        </TableCell>
                        <TableCell>
                          {row.outOfControl ? (
                            <Chip label="OUT" size="small" color="error" icon={<WarningAmber />} />
                          ) : (
                            <Chip label="IN" size="small" color="success" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="caption" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                Table shows readings 26-30 (pre-shift) and 30-45 (post-shift) to illustrate CUSUM accumulation.
                Notice how C⁻ (Lower CUSUM) grows rapidly after reading 30 when temperature shifts down.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* PRIMARY CUSUM CHART VISUALIZATION */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
            <Typography variant="h6" gutterBottom color="primary" sx={{ fontWeight: 600 }}>
              📊 CUSUM Chart: Tabular CUSUM (C⁺ and C⁻)
            </Typography>

            <Typography variant="body2" paragraph color="text.secondary">
              <strong>Dual CUSUM showing:</strong> Upper CUSUM (C⁺) detects upward shifts, Lower CUSUM (C⁻) detects downward shifts.
              Decision interval H = {cusumStats.H}°C shown as horizontal red line. Lower CUSUM exceeds H at reading {cusumStats.firstSignalReading}.
            </Typography>

            <ResponsiveContainer width="100%" height={450}>
              <LineChart
                data={cusumStats.cusumData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="reading"
                  label={{ value: 'Reading Number (Hours)', position: 'insideBottom', offset: -10, style: { fontWeight: 600 } }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  label={{ value: 'Cumulative Sum (°C)', angle: -90, position: 'insideLeft', style: { fontWeight: 600 } }}
                  domain={[0, 3]}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <Paper elevation={4} sx={{ p: 2, bgcolor: 'white', border: data.outOfControl ? '2px solid #f44336' : '2px solid #1976d2' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: data.outOfControl ? 'error.main' : 'primary.main' }}>
                            Reading {data.reading}
                          </Typography>
                          <Divider sx={{ my: 0.5 }} />
                          <Typography variant="body2" sx={{ fontSize: 11 }}>
                            <strong>Temperature:</strong> {data.temperature}°C
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: 11 }}>
                            <strong>C⁺ (Upper):</strong> {data.cusumUpper}°C
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: 11, fontWeight: 600 }}>
                            <strong>C⁻ (Lower):</strong> {data.cusumLower}°C
                          </Typography>
                          <Divider sx={{ my: 0.5 }} />
                          <Typography variant="body2" sx={{ fontSize: 10 }}>
                            <strong>Phase:</strong> {data.phase}
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: 11, mt: 0.5, fontWeight: 600 }}>
                            <strong>Status:</strong> {data.outOfControl ? '🚨 OUT OF CONTROL' : '✅ In Control'}
                          </Typography>
                        </Paper>
                      );
                    }
                    return null;
                  }}
                />

                {/* Phase Shading */}
                <ReferenceArea x1={1} x2={29} fill="#4caf50" fillOpacity={0.08} label={{ value: 'Normal Operation', position: 'insideTop', fontSize: 12 }} />
                <ReferenceArea x1={30} x2={100} fill="#f44336" fillOpacity={0.10} label={{ value: 'Shift (0.5°C drift)', position: 'insideTop', fontSize: 12 }} />

                {/* Decision Interval H */}
                <ReferenceLine y={cusumStats.H} stroke="#f44336" strokeWidth={3}
                  label={{ value: `H = ${cusumStats.H}°C`, position: 'right', fill: '#f44336', fontSize: 12, fontWeight: 600 }} />

                {/* Shift and Detection Markers */}
                <ReferenceLine x={30} stroke="#ff9800" strokeWidth={2}
                  label={{ value: '⚠️ Shift Onset', position: 'top', fill: '#ff9800', fontSize: 12, fontWeight: 600 }} />
                <ReferenceLine x={cusumStats.firstSignalReading} stroke="#f44336" strokeWidth={3}
                  label={{ value: `🚨 CUSUM Signal (Reading ${cusumStats.firstSignalReading})`, position: 'top', fill: '#f44336', fontSize: 12, fontWeight: 600 }} />

                {/* CUSUM Lines */}
                <Line
                  type="monotone"
                  dataKey="cusumUpper"
                  stroke="#2196f3"
                  strokeWidth={2}
                  dot={false}
                  name="C⁺ (Upper CUSUM)"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="cusumLower"
                  stroke="#9c27b0"
                  strokeWidth={3}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={payload.outOfControl ? 5 : 3}
                        fill={payload.outOfControl ? '#f44336' : '#9c27b0'}
                        stroke="white"
                        strokeWidth={2}
                      />
                    );
                  }}
                  name="C⁻ (Lower CUSUM)"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>

            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Chart Analysis:</strong> C⁻ (purple line) accumulates steadily after reading 30, crossing decision interval H
                at reading {cusumStats.firstSignalReading}. This signals a downward shift detected only {cusumStats.detectionDelay} readings
                after the actual 0.5°C drift. C⁺ (blue line) remains near zero, confirming no upward shift.
              </Typography>
            </Alert>
          </Paper>
        </Grid>

        {/* CUSUM VS SHEWHART COMPARISON */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
            <Typography variant="h6" gutterBottom color="primary" sx={{ fontWeight: 600 }}>
              📊 Method Comparison: CUSUM vs. Shewhart Detection
            </Typography>

            <Typography variant="body2" paragraph color="text.secondary">
              Comparing CUSUM and Shewhart responses to the same 0.5°C temperature shift. CUSUM detects in {cusumStats.detectionDelay} hours,
              while Shewhart misses the shift entirely (0 violations in first 71 hours).
            </Typography>

            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart
                data={cusumStats.cusumData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="reading"
                  label={{ value: 'Reading Number (Hours)', position: 'insideBottom', offset: -10, style: { fontWeight: 600 } }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  yAxisId="left"
                  label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft', style: { fontWeight: 600 } }}
                  domain={[70.5, 73.5]}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{ value: 'C⁻ (°C)', angle: 90, position: 'insideRight', style: { fontWeight: 600 } }}
                  domain={[0, 3]}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <Paper elevation={4} sx={{ p: 2, bgcolor: 'white', border: '2px solid #1976d2' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            Reading {data.reading}
                          </Typography>
                          <Divider sx={{ my: 0.5 }} />
                          <Typography variant="body2" sx={{ fontSize: 11 }}>
                            <strong>Temperature:</strong> {data.temperature}°C
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: 11 }}>
                            <strong>C⁻:</strong> {data.cusumLower}°C
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: 10 }}>
                            <strong>Phase:</strong> {data.phase}
                          </Typography>
                        </Paper>
                      );
                    }
                    return null;
                  }}
                />

                {/* Shewhart Control Limits */}
                <ReferenceLine yAxisId="left" y={72.0} stroke="#4caf50" strokeWidth={2} strokeDasharray="5 5"
                  label={{ value: 'Target (72.0°C)', position: 'right', fill: '#4caf50', fontSize: 10 }} />
                <ReferenceLine yAxisId="left" y={72.9} stroke="#f44336" strokeWidth={1.5} strokeDasharray="3 3"
                  label={{ value: 'UCL', position: 'right', fill: '#f44336', fontSize: 9 }} />
                <ReferenceLine yAxisId="left" y={71.1} stroke="#f44336" strokeWidth={1.5} strokeDasharray="3 3"
                  label={{ value: 'LCL', position: 'right', fill: '#f44336', fontSize: 9 }} />

                {/* CUSUM Decision Interval */}
                <ReferenceLine yAxisId="right" y={cusumStats.H} stroke="#9c27b0" strokeWidth={2}
                  label={{ value: `H = ${cusumStats.H}°C`, position: 'right', fill: '#9c27b0', fontSize: 10, fontWeight: 600 }} />

                {/* Detection Markers */}
                <ReferenceLine x={30} stroke="#ff9800" strokeWidth={2}
                  label={{ value: 'Shift', position: 'top', fill: '#ff9800', fontSize: 11 }} />
                <ReferenceLine x={cusumStats.firstSignalReading} stroke="#9c27b0" strokeWidth={2}
                  label={{ value: `CUSUM ✅`, position: 'top', fill: '#9c27b0', fontSize: 11, fontWeight: 600 }} />

                {/* Temperature (Shewhart perspective) */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="temperature"
                  stroke="#1976d2"
                  strokeWidth={2}
                  dot={{ fill: '#1976d2', r: 2 }}
                  name="Temperature"
                  isAnimationActive={false}
                />

                {/* CUSUM C⁻ */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cusumLower"
                  stroke="#9c27b0"
                  strokeWidth={3}
                  dot={false}
                  name="C⁻ (CUSUM)"
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>

            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <Alert severity="error">
                  <Typography variant="body2" sx={{ fontSize: 11 }}>
                    <strong>Shewhart Failure:</strong> All 100 temperature readings fall within ±3σ control limits.
                    Shewhart chart shows 0 violations in first 71 hours. Completely misses 0.5°C shift. ❌
                  </Typography>
                </Alert>
              </Grid>
              <Grid item xs={12} md={6}>
                <Alert severity="success">
                  <Typography variant="body2" sx={{ fontSize: 11 }}>
                    <strong>CUSUM Success:</strong> C⁻ exceeds H at reading {cusumStats.firstSignalReading}, detecting shift in only {cusumStats.detectionDelay} hours.
                    {Math.round((71 - cusumStats.detectionDelay) / cusumStats.detectionDelay * 100)}% faster detection. ✅
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Alert severity="success" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Enhanced Visualization:</strong> The interactive CUSUM charts above show the power of cumulative sum monitoring
          for detecting small sustained shifts that Shewhart charts miss completely.
        </Typography>
      </Alert>
    </Box>
  );

  // Backend integration function
  const handleAnalyzeWithBackend = async () => {
    try {
      setBackendLoading(true);
      setBackendError(null);

      const temperatures = pasteurizationData.map(d => d.temperature);

      const response = await cusumChart({
        data: temperatures,
        target: 72.0,
        std_dev: 0.3,
        reference_value: 0.15, // K = 0.5σ
        decision_interval: 1.5  // H = 5σ
      });

      if (response.status === 'success') {
        setBackendResults(response.data);
      }
    } catch (error) {
      setBackendError(error.message || 'Failed to connect to backend API');
    } finally {
      setBackendLoading(false);
    }
  };

  // ============================================================================
  // SECTION 5: PROFESSIONAL INTERPRETATION
  // ============================================================================
  const interpretation = (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
        Professional Interpretation: Food Safety Crisis Averted
      </Typography>

      <Typography variant="body1" paragraph>
        The CUSUM analysis reveals critical evidence of a sustained process shift that traditional
        Shewhart charts completely missed. This case demonstrates why CUSUM charts are essential for
        food safety critical control points where small shifts can have catastrophic consequences.
      </Typography>

      <Divider sx={{ my: 3 }} />

      {/* Statistical Interpretation */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main' }}>
        1. Statistical Interpretation
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%', bgcolor: 'error.light' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'error.dark' }}>
                <WarningAmber sx={{ mr: 1, verticalAlign: 'middle' }} />
                Process Shift Detection
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Shift Magnitude: 0.5°C (1.67σ)"
                    secondary="Temperature dropped from 72.0°C → 71.5°C at reading 30"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={`CUSUM Detection: Reading ${cusumStats.firstSignalReading}`}
                    secondary={`Lower CUSUM (C⁻) exceeded H = 1.5°C after ${cusumStats.detectionDelay} readings`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={`Shewhart Detection: ${cusumStats.shewhartViolations} violations`}
                    secondary="±3σ limits failed to detect sustained 1.67σ shift"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%', bgcolor: 'success.light' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'success.dark' }}>
                <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
                CUSUM Performance Metrics
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary={`Detection Delay: ${cusumStats.detectionDelay} hours`}
                    secondary="Time from shift start to first CUSUM signal"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Theoretical ARL₁ ≈ 5 samples"
                    secondary="Expected detection for 1.67σ shift with K=0.5σ, H=5σ"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="False Alarm Rate: ARL₀ ≈ 500"
                    secondary="1 false alarm every 500 readings (similar to Shewhart)"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper elevation={2} sx={{ p: 3, bgcolor: 'grey.50', mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          Why CUSUM Detected What Shewhart Missed
        </Typography>
        <Typography variant="body2" paragraph>
          The key to CUSUM's superior performance lies in its <strong>accumulation mechanism</strong>:
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 2, bgcolor: 'warning.light' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Shewhart Logic (Memoryless)
              </Typography>
              <Typography variant="body2">
                Each point evaluated independently against ±3σ limits. A 1.67σ shift produces
                readings at 71.5°C (mean), which fall between LCL=71.1°C and UCL=72.9°C.
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Result:</strong> No violations → Shift invisible
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 2, bgcolor: 'success.light' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                CUSUM Logic (Memory)
              </Typography>
              <Typography variant="body2">
                Accumulates deviations from target. Each reading at 71.5°C contributes
                (72.0 - 71.5 - 0.15) = 0.35°C to C⁻. After {cusumStats.detectionDelay} readings,
                cumulative sum reaches 1.5°C threshold.
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Result:</strong> C⁻ &gt; H → Shift detected ✅
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="caption">
            <strong>Key Insight:</strong> CUSUM has "memory" — it remembers small consistent
            deviations and accumulates evidence of a shift. This makes it dramatically more sensitive
            to small sustained shifts (0.5-2σ range) than Shewhart charts.
          </Typography>
        </Alert>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* Root Cause Analysis */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main' }}>
        2. Root Cause Analysis: Heat Exchanger Fouling
      </Typography>

      <Typography variant="body1" paragraph>
        The 0.5°C downward drift is characteristic of <strong>heat exchanger fouling</strong> —
        the gradual buildup of milk solids on heat transfer surfaces that reduces thermal efficiency.
      </Typography>

      <TableContainer component={Paper} elevation={2} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'info.light' }}>
            <TableRow>
              <TableCell><strong>Evidence</strong></TableCell>
              <TableCell><strong>Observation</strong></TableCell>
              <TableCell><strong>Conclusion</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><strong>Shift Pattern</strong></TableCell>
              <TableCell>Gradual onset, sustained decrease</TableCell>
              <TableCell>Consistent with fouling accumulation</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Shift Direction</strong></TableCell>
              <TableCell>Downward (reduced temperature)</TableCell>
              <TableCell>Reduced heat transfer efficiency</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Shift Magnitude</strong></TableCell>
              <TableCell>0.5°C (small but consistent)</TableCell>
              <TableCell>Early-stage fouling (not severe yet)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>No Equipment Alarms</strong></TableCell>
              <TableCell>All sensors functioning normally</TableCell>
              <TableCell>Rules out sensor drift or calibration issues</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Production Records</strong></TableCell>
              <TableCell>120+ hours since last CIP cycle</TableCell>
              <TableCell>Exceeds recommended 72-hour maximum</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Root Cause:</strong> Heat exchanger fouling due to extended operation (120 hours)
          without Clean-In-Place (CIP) cycle. Recommended CIP frequency: every 72 hours maximum.
          The plant was operating 67% beyond recommended cleaning interval.
        </Typography>
      </Alert>

      <Divider sx={{ my: 3 }} />

      {/* Food Safety Impact */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main' }}>
        3. Food Safety Impact Analysis
      </Typography>

      <Typography variant="body1" paragraph>
        The microbiological consequences of a 0.5°C reduction are more severe than they appear:
      </Typography>

      <Paper elevation={2} sx={{ p: 3, bgcolor: 'error.light', mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'error.dark' }}>
          <BugReport sx={{ mr: 1, verticalAlign: 'middle' }} />
          Listeria monocytogenes Survival Calculations
        </Typography>

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
          Thermal Inactivation Kinetics:
        </Typography>
        <Typography variant="body2" paragraph>
          D-value (Decimal Reduction Time) for Listeria at 72.0°C ≈ 0.23 seconds
        </Typography>
        <MathJax>
          {`\\[
            \\text{Log Reduction} = \\frac{t}{D} = \\frac{15 \\text{ sec}}{0.23 \\text{ sec}} = 6.5 \\text{ log}
          \\]`}
        </MathJax>

        <Typography variant="body2" paragraph sx={{ mt: 2 }}>
          At 72.0°C for 15 seconds: 6.5 log reduction = 99.9997% kill rate
        </Typography>

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
          Impact of 0.5°C Reduction to 71.5°C:
        </Typography>
        <Typography variant="body2" paragraph>
          D-value at 71.5°C ≈ 0.29 seconds (increases exponentially with lower temp)
        </Typography>
        <MathJax>
          {`\\[
            \\text{Log Reduction} = \\frac{15}{0.29} = 5.2 \\text{ log reduction}
          \\]`}
        </MathJax>

        <Typography variant="body2" paragraph sx={{ mt: 2 }}>
          At 71.5°C for 15 seconds: 5.2 log reduction = 99.9994% kill rate
        </Typography>

        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="caption">
            <strong>Risk Increase:</strong> Listeria survival probability increased from
            0.0003% → 0.0006% (100% increase). For 50,000 gallons/day production containing
            ~10⁶ CFU/mL initial contamination, this translates to 30 gallons with surviving
            Listeria vs. 15 gallons — doubling consumer exposure risk.
          </Typography>
        </Alert>
      </Paper>

      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
        Contaminated Product Exposure Window
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ bgcolor: 'warning.light', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.dark' }}>
                <Timeline sx={{ mr: 1, verticalAlign: 'middle' }} />
                Shift Duration
              </Typography>
              <Typography variant="h4" sx={{ mt: 2, color: 'warning.dark', fontWeight: 700 }}>
                {cusumStats.detectionDelay} hours
              </Typography>
              <Typography variant="body2">
                Time from shift start (reading 30) to CUSUM detection (reading {cusumStats.firstSignalReading})
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ bgcolor: 'error.light', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'error.dark' }}>
                <MonetizationOn sx={{ mr: 1, verticalAlign: 'middle' }} />
                Production Volume
              </Typography>
              <Typography variant="h4" sx={{ mt: 2, color: 'error.dark', fontWeight: 700 }}>
                {cusumStats.detectionDelay * 50000} gal
              </Typography>
              <Typography variant="body2">
                Milk processed during exposure window (50,000 gal/hr × {cusumStats.detectionDelay} hr)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ bgcolor: 'info.light', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'info.dark' }}>
                <LocalHospital sx={{ mr: 1, verticalAlign: 'middle' }} />
                Consumer Risk
              </Typography>
              <Typography variant="h4" sx={{ mt: 2, color: 'info.dark', fontWeight: 700 }}>
                2×
              </Typography>
              <Typography variant="body2">
                Listeria survival probability doubled vs. target 72.0°C pasteurization
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Alert severity="success">
        <Typography variant="body2">
          <strong>Crisis Averted:</strong> CUSUM detected the shift {71 - cusumStats.detectionDelay} hours
          faster than waiting for Shewhart violations. This early detection prevented {(71 - cusumStats.detectionDelay) * 50000}
          additional gallons from being processed under sub-optimal conditions, potentially avoiding
          a Listeria contamination outbreak similar to the 2023 incident.
        </Typography>
      </Alert>

      <Divider sx={{ my: 3 }} />

      {/* Comparison to 2023 Outbreak */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main' }}>
        4. Comparison to 2023 Listeria Outbreak
      </Typography>

      <Typography variant="body1" paragraph>
        The 2023 outbreak provides a sobering reference point for what could have happened without
        CUSUM monitoring:
      </Typography>

      <TableContainer component={Paper} elevation={2} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'primary.light' }}>
            <TableRow>
              <TableCell><strong>Metric</strong></TableCell>
              <TableCell><strong>2023 Outbreak (No CUSUM)</strong></TableCell>
              <TableCell><strong>2025 Near-Miss (With CUSUM)</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><strong>Shift Magnitude</strong></TableCell>
              <TableCell>0.8°C (2.67σ)</TableCell>
              <TableCell>0.5°C (1.67σ)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Detection Method</strong></TableCell>
              <TableCell>Shewhart X̄ chart</TableCell>
              <TableCell>CUSUM chart</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'error.light' }}>
              <TableCell><strong>Detection Time</strong></TableCell>
              <TableCell>5 days (120 hours)</TableCell>
              <TableCell>{cusumStats.detectionDelay} hours ✅</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'error.light' }}>
              <TableCell><strong>Contaminated Product</strong></TableCell>
              <TableCell>6 million gallons</TableCell>
              <TableCell>{cusumStats.detectionDelay * 50000} gallons (contained before distribution) ✅</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'error.light' }}>
              <TableCell><strong>Health Impact</strong></TableCell>
              <TableCell>12 illnesses, 3 hospitalizations, 1 death</TableCell>
              <TableCell>0 (prevented) ✅</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'success.light' }}>
              <TableCell><strong>Financial Cost</strong></TableCell>
              <TableCell>$8.2 million total</TableCell>
              <TableCell>$50K (CIP cycle + testing) ✅</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Business Impact ROI Visualization */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
          📊 Business Impact: CUSUM ROI Comparison
        </Typography>
        <Typography variant="body2" paragraph>
          Financial and operational comparison between Shewhart monitoring (2023 outbreak) vs CUSUM detection (2025 prevention).
        </Typography>

        <Grid container spacing={3}>
          {/* Cost Comparison Chart */}
          <Grid item xs={12} md={8}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={[
                  {
                    scenario: 'Without CUSUM\n(2023 Outbreak)',
                    cost: 8200,
                    color: '#f44336',
                    label: '$8.2M',
                    breakdown: 'Recall ($4.5M) + Legal ($2.0M) + Brand ($1.7M)'
                  },
                  {
                    scenario: 'With CUSUM\n(2025 Prevention)',
                    cost: 50,
                    color: '#4caf50',
                    label: '$50K',
                    breakdown: 'CIP cycle ($30K) + Testing ($15K) + Hold ($5K)'
                  },
                  {
                    scenario: 'Net Savings\n(CUSUM Benefit)',
                    cost: 8150,
                    color: '#2196f3',
                    label: '$8.15M',
                    breakdown: '99.4% cost reduction vs delayed detection'
                  }
                ]}
                margin={{ top: 20, right: 30, left: 80, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="scenario"
                  angle={0}
                  textAnchor="middle"
                  height={80}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  label={{ value: 'Cost (Thousands $)', angle: -90, position: 'insideLeft', fontSize: 14 }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <Paper elevation={3} sx={{ p: 2, maxWidth: 320 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                            {data.scenario.replace('\n', ' ')}
                          </Typography>
                          <Typography variant="body2" sx={{ color: data.color, fontWeight: 700, mb: 1 }}>
                            Total Cost: {data.label}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            {data.breakdown}
                          </Typography>
                        </Paper>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar
                  dataKey="cost"
                  name="Financial Impact ($K)"
                  radius={[10, 10, 0, 0]}
                  isAnimationActive={false}
                >
                  {[
                    { scenario: 'Without CUSUM\n(2023 Outbreak)', cost: 8200, color: '#f44336' },
                    { scenario: 'With CUSUM\n(2025 Prevention)', cost: 50, color: '#4caf50' },
                    { scenario: 'Net Savings\n(CUSUM Benefit)', cost: 8150, color: '#2196f3' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Grid>

          {/* Key Metrics Cards */}
          <Grid item xs={12} md={4}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Card elevation={2} sx={{ bgcolor: 'success.light', height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'success.dark', mb: 1 }}>
                      🎯 Detection Speed
                    </Typography>
                    <Typography variant="h4" sx={{ color: 'success.dark', fontWeight: 700 }}>
                      {((120 - cusumStats.detectionDelay) / 120 * 100).toFixed(0)}% faster
                    </Typography>
                    <Typography variant="caption">
                      {cusumStats.detectionDelay}h vs 120h
                      <br />({120 - cusumStats.detectionDelay}h advantage)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card elevation={2} sx={{ bgcolor: 'info.light', height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'info.dark', mb: 1 }}>
                      🛡️ Product Protected
                    </Typography>
                    <Typography variant="h4" sx={{ color: 'info.dark', fontWeight: 700 }}>
                      {((6000000 - cusumStats.detectionDelay * 50000) / 1000000).toFixed(2)}M gal
                    </Typography>
                    <Typography variant="caption">
                      Prevented from distribution
                      <br />({((1 - cusumStats.detectionDelay * 50000 / 6000000) * 100).toFixed(1)}% containment)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card elevation={2} sx={{ bgcolor: 'secondary.light', height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'secondary.dark', mb: 1 }}>
                      💰 ROI (First Year)
                    </Typography>
                    <Typography variant="h4" sx={{ color: 'secondary.dark', fontWeight: 700 }}>
                      16,300%
                    </Typography>
                    <Typography variant="caption">
                      $8.15M saved / $50K cost
                      <br />Payback: &lt;1 day
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Business Case:</strong> CUSUM implementation delivered 163× return on investment by detecting
            the process shift {120 - cusumStats.detectionDelay} hours faster than Shewhart charts. Early detection
            prevented a $8.2M outbreak, protecting consumer health and brand reputation while maintaining production continuity.
          </Typography>
        </Alert>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, bgcolor: 'success.light', mt: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'success.dark' }}>
          <CheckCircleOutline sx={{ mr: 1, verticalAlign: 'middle' }} />
          CUSUM Prevented a Repeat Outbreak
        </Typography>
        <Typography variant="body1">
          By detecting the 0.5°C shift in {cusumStats.detectionDelay} hours instead of 120+ hours,
          CUSUM monitoring prevented:
        </Typography>
        <List sx={{ mt: 1 }}>
          <ListItem>
            <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
            <ListItemText primary="Health Crisis: 0 illnesses vs. potential 12+ with delayed detection" />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
            <ListItemText primary={`Contamination: ${(71 - cusumStats.detectionDelay) * 50000} fewer gallons processed under sub-optimal conditions`} />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
            <ListItemText primary="Financial Loss: Avoided $8.2M outbreak cost (recall + legal + brand damage)" />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
            <ListItemText primary="Reputation: Maintained consumer trust and avoided media crisis" />
          </ListItem>
        </List>
      </Paper>
    </Box>
  );

  // ============================================================================
  // SECTION 6: BUSINESS RECOMMENDATIONS
  // ============================================================================
  const recommendations = (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
        Business Recommendations: CUSUM Implementation for Food Safety
      </Typography>

      <Typography variant="body1" paragraph>
        Based on the superior detection performance demonstrated in this case, we recommend a
        comprehensive CUSUM implementation program for all HACCP Critical Control Points.
      </Typography>

      <Divider sx={{ my: 3 }} />

      {/* Immediate Actions */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card elevation={3} sx={{ bgcolor: 'error.light' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'error.dark' }}>
                <WarningAmber sx={{ mr: 1, verticalAlign: 'middle' }} />
                Phase 1: Immediate Corrective Actions (24-48 hours)
              </Typography>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                Objective: Address current fouling issue and prevent immediate food safety risk
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline /></ListItemIcon>
                  <ListItemText
                    primary="1. Emergency CIP (Clean-In-Place) Cycle"
                    secondary="Immediately execute comprehensive heat exchanger cleaning protocol (alkaline + acid wash)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline /></ListItemIcon>
                  <ListItemText
                    primary="2. Product Hold & Testing"
                    secondary={`Place ${cusumStats.detectionDelay * 50000} gallons from exposure window on quality hold; perform Listeria testing`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline /></ListItemIcon>
                  <ListItemText
                    primary="3. Process Validation"
                    secondary="Re-verify pasteurization lethality at 72.0°C after CIP completion (temperature profiling + microbial challenge)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline /></ListItemIcon>
                  <ListItemText
                    primary="4. FDA Notification (if required)"
                    secondary="Evaluate need for FDA notification under FSMA 204 if product entered commerce"
                  />
                </ListItem>
              </List>
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Cost:</strong> $50,000 (CIP cycle, testing, product hold, validation)
                  <br /><strong>Timeline:</strong> 24-48 hours
                  <br /><strong>Expected Result:</strong> Temperature restored to 72.0°C ± 0.1°C
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* CUSUM Implementation */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card elevation={3} sx={{ bgcolor: 'warning.light' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'warning.dark' }}>
                <Science sx={{ mr: 1, verticalAlign: 'middle' }} />
                Phase 2: CUSUM Chart Implementation (1-3 months)
              </Typography>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                Objective: Deploy CUSUM monitoring for all HACCP Critical Control Points
              </Typography>

              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                Implementation Steps:
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline /></ListItemIcon>
                  <ListItemText
                    primary="1. Identify Critical Control Points for CUSUM"
                    secondary="Pasteurization temp, refrigeration temp, pH, water activity — any CCP where small shifts matter"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline /></ListItemIcon>
                  <ListItemText
                    primary="2. Establish Baseline Parameters (μ₀, σ)"
                    secondary="Collect 100+ in-control observations for each CCP to estimate target and variability"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline /></ListItemIcon>
                  <ListItemText
                    primary="3. Design CUSUM Parameters (K, H)"
                    secondary="Set K = 0.5σ, H = 5σ as standard; adjust based on shift size of concern and ARL requirements"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline /></ListItemIcon>
                  <ListItemText
                    primary="4. Software Implementation"
                    secondary="Integrate CUSUM algorithms into existing SCADA/historian system (auto-calculation + alerting)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline /></ListItemIcon>
                  <ListItemText
                    primary="5. Staff Training"
                    secondary="Train QA team on CUSUM interpretation, investigation protocols, and response procedures"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline /></ListItemIcon>
                  <ListItemText
                    primary="6. Validation & Approval"
                    secondary="Update HACCP plan to include CUSUM monitoring; obtain regulatory approval if required"
                  />
                </ListItem>
              </List>

              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                CUSUM Design for Common CCPs:
              </Typography>
              <TableContainer component={Paper} elevation={1} sx={{ mt: 1 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'grey.300' }}>
                    <TableRow>
                      <TableCell><strong>CCP</strong></TableCell>
                      <TableCell><strong>Target (μ₀)</strong></TableCell>
                      <TableCell><strong>Typical σ</strong></TableCell>
                      <TableCell><strong>K (0.5σ)</strong></TableCell>
                      <TableCell><strong>H (5σ)</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow sx={{ bgcolor: 'warning.light' }}>
                      <TableCell><strong>Pasteurization Temp</strong></TableCell>
                      <TableCell>72.0°C</TableCell>
                      <TableCell>0.3°C</TableCell>
                      <TableCell>0.15°C</TableCell>
                      <TableCell>1.5°C</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Cold Storage Temp</strong></TableCell>
                      <TableCell>4.0°C</TableCell>
                      <TableCell>0.5°C</TableCell>
                      <TableCell>0.25°C</TableCell>
                      <TableCell>2.5°C</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Product pH</strong></TableCell>
                      <TableCell>6.7</TableCell>
                      <TableCell>0.1</TableCell>
                      <TableCell>0.05</TableCell>
                      <TableCell>0.5</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Water Activity (aw)</strong></TableCell>
                      <TableCell>0.85</TableCell>
                      <TableCell>0.02</TableCell>
                      <TableCell>0.01</TableCell>
                      <TableCell>0.10</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Investment:</strong> $150,000 (software integration, validation, training, 3 months labor)
                  <br /><strong>Timeline:</strong> 1-3 months
                  <br /><strong>Expected Result:</strong> Real-time CUSUM monitoring for all CCPs with automated alerts
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Preventive Maintenance */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card elevation={3} sx={{ bgcolor: 'success.light' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'success.dark' }}>
                <CheckCircleOutline sx={{ mr: 1, verticalAlign: 'middle' }} />
                Phase 3: Preventive Maintenance Optimization (Ongoing)
              </Typography>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                Objective: Use CUSUM as early warning for equipment maintenance needs
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                  <ListItemText
                    primary="1. CIP Frequency Adjustment"
                    secondary="Reduce CIP interval from 120 hours → 72 hours maximum based on CUSUM drift patterns"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                  <ListItemText
                    primary="2. Predictive Maintenance Triggers"
                    secondary="Use CUSUM signals as leading indicators for fouling, sensor drift, valve leakage before they become critical"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                  <ListItemText
                    primary="3. CUSUM-Based Process Control"
                    secondary="Implement feedback control: Auto-adjust heater output when CUSUM Lower approaches 50% of H (proactive vs. reactive)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                  <ListItemText
                    primary="4. Quarterly CUSUM Review"
                    secondary="QA team reviews CUSUM trends quarterly to identify chronic issues, optimize parameters, prevent recurrence"
                  />
                </ListItem>
              </List>
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Ongoing Cost:</strong> $30K/year (additional CIP cycles, software maintenance, quarterly reviews)
                  <br /><strong>Benefit:</strong> Prevents $8.2M outbreak costs, maintains food safety, protects brand reputation
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* ROI Analysis */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main' }}>
        Return on Investment (ROI) Analysis
      </Typography>

      <TableContainer component={Paper} elevation={3} sx={{ mb: 3 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'primary.light' }}>
            <TableRow>
              <TableCell><strong>Item</strong></TableCell>
              <TableCell align="right"><strong>Cost</strong></TableCell>
              <TableCell align="right"><strong>Annual Benefit</strong></TableCell>
              <TableCell align="right"><strong>Notes</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><strong>Phase 1: Emergency Response</strong></TableCell>
              <TableCell align="right">$50,000</TableCell>
              <TableCell align="right">—</TableCell>
              <TableCell>One-time corrective action</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Phase 2: CUSUM Implementation</strong></TableCell>
              <TableCell align="right">$150,000</TableCell>
              <TableCell align="right">—</TableCell>
              <TableCell>One-time software + validation</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Phase 3: Preventive Maintenance</strong></TableCell>
              <TableCell align="right">$30,000/year</TableCell>
              <TableCell align="right">—</TableCell>
              <TableCell>Ongoing operational expense</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell><strong>TOTAL INVESTMENT</strong></TableCell>
              <TableCell align="right"><strong>$200,000 initial + $30K/year</strong></TableCell>
              <TableCell align="right">—</TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow sx={{ height: 20 }}>
              <TableCell colSpan={4}></TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Outbreak Prevention (Risk Avoidance)</strong></TableCell>
              <TableCell align="right">—</TableCell>
              <TableCell align="right">$8,200,000</TableCell>
              <TableCell>Avoided costs from 2023-type outbreak (amortized annually)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Reduced Product Waste</strong></TableCell>
              <TableCell align="right">—</TableCell>
              <TableCell align="right">$200,000</TableCell>
              <TableCell>Faster detection = less product on hold/discard</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Optimized Maintenance Schedule</strong></TableCell>
              <TableCell align="right">—</TableCell>
              <TableCell align="right">$100,000</TableCell>
              <TableCell>Predictive maintenance vs. reactive failures</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'success.light' }}>
              <TableCell><strong>TOTAL ANNUAL BENEFIT</strong></TableCell>
              <TableCell align="right">—</TableCell>
              <TableCell align="right"><strong>$8,500,000/year</strong></TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'success.dark', color: 'white' }}>
              <TableCell sx={{ color: 'white' }}><strong>NET BENEFIT (Year 1)</strong></TableCell>
              <TableCell align="right" sx={{ color: 'white' }}><strong>$230K investment</strong></TableCell>
              <TableCell align="right" sx={{ color: 'white' }}><strong>$8,500K benefit</strong></TableCell>
              <TableCell sx={{ color: 'white' }}><strong>ROI: 3,600% (Payback: 10 days)</strong></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="success">
        <Typography variant="body2">
          <strong>Financial Conclusion:</strong> The $200,000 CUSUM implementation investment pays
          for itself in <strong>10 days</strong> of outbreak prevention alone. With an ROI exceeding
          <strong>3,600%</strong> in Year 1, this is one of the highest-value food safety investments
          possible. The avoided cost of a single Listeria outbreak ($8.2M) justifies CUSUM implementation
          41 times over.
        </Typography>
      </Alert>

      <Divider sx={{ my: 3 }} />

      {/* Implementation Timeline */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
        Implementation Timeline (3-Month Program)
      </Typography>
      <TableContainer component={Paper} elevation={2}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'info.light' }}>
            <TableRow>
              <TableCell><strong>Week</strong></TableCell>
              <TableCell><strong>Phase</strong></TableCell>
              <TableCell><strong>Activities</strong></TableCell>
              <TableCell><strong>Deliverable</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow sx={{ bgcolor: 'error.light' }}>
              <TableCell>1</TableCell>
              <TableCell>Phase 1</TableCell>
              <TableCell>Emergency CIP, product testing, validation</TableCell>
              <TableCell>Temperature restored to 72.0°C</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'warning.light' }}>
              <TableCell>2-4</TableCell>
              <TableCell>Phase 2 (Design)</TableCell>
              <TableCell>Baseline data collection, parameter design, software selection</TableCell>
              <TableCell>CUSUM design specifications approved</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'warning.light' }}>
              <TableCell>5-8</TableCell>
              <TableCell>Phase 2 (Implementation)</TableCell>
              <TableCell>Software integration, algorithm validation, staff training</TableCell>
              <TableCell>CUSUM live for 3 CCPs (pasteurization, cold storage, pH)</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'warning.light' }}>
              <TableCell>9-12</TableCell>
              <TableCell>Phase 2 (Expansion)</TableCell>
              <TableCell>Expand to all CCPs, HACCP plan updates, regulatory approval</TableCell>
              <TableCell>Full CUSUM deployment (8 CCPs monitored)</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'success.light' }}>
              <TableCell>13+</TableCell>
              <TableCell>Phase 3 (Sustaining)</TableCell>
              <TableCell>Preventive maintenance optimization, quarterly reviews</TableCell>
              <TableCell>Ongoing food safety excellence</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // ============================================================================
  // SECTION 7: KEY TAKEAWAYS
  // ============================================================================
  const keyTakeaways = (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
        Key Takeaways: CUSUM for Food Safety Critical Control Points
      </Typography>

      <Typography variant="body1" paragraph>
        This dairy pasteurization case study provides eight essential lessons for implementing
        CUSUM charts in food safety applications where small process shifts have serious consequences.
      </Typography>

      <Divider sx={{ my: 3 }} />

      <Grid container spacing={3}>
        {/* Takeaway 1 */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent sx={{ bgcolor: 'info.light' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'info.dark' }}>
                <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
                1. CUSUM Excels at Small Shift Detection (0.5-2σ Range)
              </Typography>
              <Typography variant="body1" paragraph>
                For detecting shifts in the 0.5-2σ range, CUSUM outperforms Shewhart charts by
                4-5× in average detection time (ARL).
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Our Case:</strong> 0.5°C shift (1.67σ) detected in {cusumStats.detectionDelay} hours
                vs. Shewhart's {cusumStats.shewhartViolations} detections in 71 hours. For food safety CCPs,
                this speed difference can prevent contamination outbreaks.
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>When to Use CUSUM:</strong> Any process where small sustained shifts are
                more dangerous than large sudden changes. Examples: pasteurization temperature,
                refrigeration, pH control, chemical concentrations.
              </Typography>
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  <strong>Decision Rule:</strong> If you care about 1σ shifts → Use CUSUM.
                  If you only care about 2.5σ+ shifts → Shewhart is sufficient.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Takeaway 2 */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent sx={{ bgcolor: 'warning.light' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'warning.dark' }}>
                <Science sx={{ mr: 1, verticalAlign: 'middle' }} />
                2. CUSUM Has Memory — Shewhart Does Not
              </Typography>
              <Typography variant="body1" paragraph>
                The fundamental difference between CUSUM and Shewhart is <strong>memory</strong>:
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2, bgcolor: 'white' }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                      Shewhart (Memoryless)
                    </Typography>
                    <Typography variant="body2">
                      Each point evaluated independently. Past points forgotten. Can't detect
                      patterns of small consistent deviations.
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2, bgcolor: 'white' }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                      CUSUM (With Memory)
                    </Typography>
                    <Typography variant="body2">
                      Accumulates evidence over time. Small consistent deviations add up.
                      Detects trends that Shewhart misses.
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
              <Typography variant="body2" paragraph sx={{ mt: 2 }}>
                <strong>Analogy:</strong> Shewhart is like checking your bank balance once per month
                (memoryless). CUSUM is like maintaining a running balance that shows cumulative spending
                patterns (memory).
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Takeaway 3 */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent sx={{ bgcolor: 'success.light' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'success.dark' }}>
                <CheckCircleOutline sx={{ mr: 1, verticalAlign: 'middle' }} />
                3. CUSUM Design Parameters: K and H Trade-Offs
              </Typography>
              <Typography variant="body1" paragraph>
                Choosing K and H involves trade-offs between sensitivity and false alarm rate:
              </Typography>

              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                Reference Value (K):
              </Typography>
              <List dense>
                <ListItem>
                  <Typography variant="body2">
                    <strong>K = 0.25σ:</strong> Detects 0.5σ shifts quickly (very sensitive, more false alarms)
                  </Typography>
                </ListItem>
                <ListItem>
                  <Typography variant="body2">
                    <strong>K = 0.5σ:</strong> Detects 1σ shifts efficiently (recommended default)
                  </Typography>
                </ListItem>
                <ListItem>
                  <Typography variant="body2">
                    <strong>K = 1.0σ:</strong> Detects 2σ shifts (less sensitive, fewer false alarms)
                  </Typography>
                </ListItem>
              </List>

              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                Decision Interval (H):
              </Typography>
              <List dense>
                <ListItem>
                  <Typography variant="body2">
                    <strong>H = 4σ:</strong> ARL₀ ≈ 200 (more false alarms, faster detection)
                  </Typography>
                </ListItem>
                <ListItem>
                  <Typography variant="body2">
                    <strong>H = 5σ:</strong> ARL₀ ≈ 500 (recommended default, similar to Shewhart)
                  </Typography>
                </ListItem>
                <ListItem>
                  <Typography variant="body2">
                    <strong>H = 6σ:</strong> ARL₀ ≈ 1000 (fewer false alarms, slower detection)
                  </Typography>
                </ListItem>
              </List>

              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  <strong>Standard Recommendation:</strong> Start with K = 0.5σ, H = 5σ for general-purpose
                  1σ shift detection. Adjust based on process-specific requirements and historical data.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Takeaway 4 */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent sx={{ bgcolor: 'error.light' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'error.dark' }}>
                <BugReport sx={{ mr: 1, verticalAlign: 'middle' }} />
                4. Small Temperature Shifts = Big Pathogen Survival Increases
              </Typography>
              <Typography variant="body1" paragraph>
                Microbial inactivation kinetics are <strong>exponential</strong> with temperature.
                Small temperature reductions cause disproportionately large increases in pathogen survival.
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Our Case:</strong> 0.5°C reduction (72.0°C → 71.5°C) DOUBLED Listeria
                survival probability from 0.0003% → 0.0006%. At 50,000 gallons/day production,
                this translates to 30 gallons with surviving pathogens vs. 15 gallons — a 100%
                increase in consumer exposure risk.
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>General Rule (D-value doubling):</strong> Every 5-7°C decrease approximately
                doubles microbial survival (varies by organism). Even 0.5-1°C matters at critical
                thresholds like pasteurization temperatures.
              </Typography>
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  <strong>Food Safety Principle:</strong> For HACCP CCPs involving lethal treatments
                  (pasteurization, cooking, sterilization), CUSUM is not optional — it's essential
                  for detecting small shifts before they become public health crises.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Takeaway 5 */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent sx={{ bgcolor: 'info.light' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'info.dark' }}>
                <LocalHospital sx={{ mr: 1, verticalAlign: 'middle' }} />
                5. CUSUM ROI in Food Safety is Extraordinary (3,600%+)
              </Typography>
              <Typography variant="body1" paragraph>
                CUSUM implementation has one of the highest ROIs in food safety because it prevents
                low-probability, high-consequence events (outbreaks).
              </Typography>
              <Typography variant="body2" component="div" paragraph>
                <strong>Our Case:</strong>
                <br />• Investment: $200,000 (one-time) + $30K/year (ongoing)
                <br />• Annual Benefit: $8.5M (outbreak prevention + waste reduction + maintenance optimization)
                <br />• Payback Period: 10 days
                <br />• Year 1 ROI: 3,600%
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Why Such High ROI?</strong> A single Listeria outbreak costs $8.2M (recall +
                legal + brand damage + FDA fines). CUSUM prevents this by detecting problems {71 - cusumStats.detectionDelay}
                hours faster, stopping contaminated product before distribution.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Takeaway 6 */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent sx={{ bgcolor: 'warning.light' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'warning.dark' }}>
                <Thermostat sx={{ mr: 1, verticalAlign: 'middle' }} />
                6. Heat Exchanger Fouling Shows Characteristic CUSUM Pattern
              </Typography>
              <Typography variant="body1" paragraph>
                Different root causes produce distinctive CUSUM signatures:
              </Typography>
              <TableContainer component={Paper} elevation={1} sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'grey.200' }}>
                    <TableRow>
                      <TableCell><strong>Root Cause</strong></TableCell>
                      <TableCell><strong>CUSUM Pattern</strong></TableCell>
                      <TableCell><strong>Speed</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell><strong>Heat Exchanger Fouling</strong></TableCell>
                      <TableCell>Gradual downward drift (Lower CUSUM accumulation)</TableCell>
                      <TableCell>Slow (hours to days)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Sensor Drift</strong></TableCell>
                      <TableCell>Steady upward or downward (direction depends on drift)</TableCell>
                      <TableCell>Very slow (days to weeks)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Valve Leak</strong></TableCell>
                      <TableCell>Sudden shift (Both CUSUMs may signal simultaneously)</TableCell>
                      <TableCell>Fast (minutes to hours)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Control Loop Issue</strong></TableCell>
                      <TableCell>Oscillating (CUSUMs alternate Upper/Lower)</TableCell>
                      <TableCell>Variable</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="body2" sx={{ mt: 2 }}>
                <strong>Practical Tip:</strong> Experienced operators can identify root causes
                from CUSUM patterns, enabling faster corrective actions.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Takeaway 7 */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent sx={{ bgcolor: 'success.light' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'success.dark' }}>
                <CheckCircleOutline sx={{ mr: 1, verticalAlign: 'middle' }} />
                7. CUSUM as Predictive Maintenance Tool
              </Typography>
              <Typography variant="body1" paragraph>
                Beyond quality control, CUSUM serves as an early warning system for equipment maintenance:
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                  <ListItemText
                    primary="Proactive vs. Reactive"
                    secondary="Detect fouling at C⁻ = 0.75°C (50% of H) and schedule CIP proactively, vs. waiting for out-of-control signal"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                  <ListItemText
                    primary="Optimized CIP Scheduling"
                    secondary="Data-driven CIP frequency based on CUSUM trends, vs. arbitrary time-based schedules"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                  <ListItemText
                    primary="Sensor Health Monitoring"
                    secondary="Sudden CUSUM jumps may indicate sensor issues rather than process changes"
                  />
                </ListItem>
              </List>
              <Typography variant="body2" sx={{ mt: 2 }}>
                <strong>Cost Savings:</strong> Predictive maintenance reduces emergency downtime by 30-50%,
                saves $100K+/year in reactive repairs, and extends equipment life.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Takeaway 8 */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent sx={{ bgcolor: 'error.light' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'error.dark' }}>
                <WarningAmber sx={{ mr: 1, verticalAlign: 'middle' }} />
                8. CUSUM + Shewhart = Comprehensive Monitoring Strategy
              </Typography>
              <Typography variant="body1" paragraph>
                CUSUM and Shewhart charts are complementary, not substitutes:
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2, bgcolor: 'white' }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                      Shewhart's Strength
                    </Typography>
                    <Typography variant="body2">
                      Excellent for detecting large sudden shifts (≥2.5σ). Simpler to understand
                      and interpret for operators. Good for processes with occasional large disturbances.
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2, bgcolor: 'white' }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                      CUSUM's Strength
                    </Typography>
                    <Typography variant="body2">
                      Superior for detecting small sustained shifts (0.5-2σ). Essential for food safety
                      CCPs. Requires more training but provides earlier warnings.
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
              <Typography variant="body2" paragraph sx={{ mt: 2 }}>
                <strong>Best Practice:</strong> Implement BOTH on critical processes:
              </Typography>
              <List dense>
                <ListItem>
                  <Typography variant="caption">
                    • CUSUM for early detection of small drifts (primary monitoring)
                  </Typography>
                </ListItem>
                <ListItem>
                  <Typography variant="caption">
                    • Shewhart for operator-friendly visualization and large shift backup
                  </Typography>
                </ListItem>
              </List>
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  <strong>HACCP Recommendation:</strong> For any CCP where ±1σ shift poses food safety
                  risk, deploy CUSUM as primary monitoring tool with Shewhart as secondary/visual aid.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Final Summary */}
      <Paper elevation={3} sx={{ p: 3, bgcolor: 'primary.light', mt: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.dark' }}>
          Final Summary: CUSUM Saved Lives and Millions of Dollars
        </Typography>
        <Typography variant="body1" paragraph>
          This dairy pasteurization case demonstrates that CUSUM charts are not just statistical
          tools — they are life-saving technologies for food safety:
        </Typography>
        <List>
          <ListItem>
            <Typography variant="body2">
              ✅ Detected 0.5°C shift in {cusumStats.detectionDelay} hours (vs. Shewhart: no detection in 71 hours)
            </Typography>
          </ListItem>
          <ListItem>
            <Typography variant="body2">
              ✅ Prevented {(71 - cusumStats.detectionDelay) * 50000} gallons from being processed under sub-optimal conditions
            </Typography>
          </ListItem>
          <ListItem>
            <Typography variant="body2">
              ✅ Avoided potential Listeria outbreak (0 illnesses vs. 2023's 12 illnesses, 1 death)
            </Typography>
          </ListItem>
          <ListItem>
            <Typography variant="body2">
              ✅ Saved $8.2M in outbreak costs (recall + legal + brand damage)
            </Typography>
          </ListItem>
          <ListItem>
            <Typography variant="body2">
              ✅ ROI of 3,600% in Year 1 ($200K investment → $8.5M benefit)
            </Typography>
          </ListItem>
        </List>
        <Typography variant="body1" sx={{ mt: 2, fontWeight: 500 }}>
          For food manufacturers operating HACCP CCPs, CUSUM implementation is not a "nice to have"
          — it's a critical safety investment that protects consumers, prevents outbreaks, and
          safeguards your brand's reputation. The question isn't "Can we afford CUSUM?" but rather
          "Can we afford NOT to implement CUSUM?"
        </Typography>
      </Paper>
    </Box>
  );

  // ============================================================================
  // METADATA
  // ============================================================================
  const metadata = {
    difficulty: 'Advanced',
    estimatedTime: '60-75 minutes',
    topics: ['CUSUM Charts', 'Food Safety', 'HACCP', 'Small Shift Detection', 'Average Run Length'],
    prerequisites: ['Shewhart control charts (X̄-R)', 'Normal distribution', 'Process capability concepts'],
    industry: 'Food Manufacturing (Dairy Processing)',
    standards: ['FDA FSMA', 'HACCP', 'ISO 22000']
  };

  // ============================================================================
  // RENDER: Case Study Template
  // ============================================================================
  return (
    <CaseStudyTemplate
      title="Dairy Pasteurization Temperature CUSUM Monitoring"
      industry="Food Manufacturing (Dairy Processing)"
      metadata={metadata}
      problemStatement={problemStatement}
      mathematicalFoundations={mathematicalFoundations}
      dataMethodology={dataMethodology}
      interactiveSimulation={interactiveSimulation}
      interpretation={interpretation}
      recommendations={recommendations}
      keyTakeaways={keyTakeaways}
      onComplete={onComplete}
    />
  );
};

export default DairyPasteurizationCUSUM;
