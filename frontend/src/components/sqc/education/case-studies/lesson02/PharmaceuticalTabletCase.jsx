import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Chip,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  CheckCircleOutline,
  WarningAmber,
  TrendingUp,
  Science,
  Factory,
  ShowChart,
  BusinessOutlined,
  LightbulbOutlined
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
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import CaseStudyTemplate from '../components/CaseStudyTemplate';
import useSQCAnalysisAPI from '../../../../../hooks/useSQCAnalysisAPI';

/**
 * Pharmaceutical Tablet Weight Control Case Study
 *
 * Industry: Pharmaceutical Manufacturing (FDA Regulated)
 * Problem: Tablet weight variation exceeding specification limits
 * Technique: X̄-R Control Charts
 * Learning Outcomes:
 *   - Apply control charts to real pharmaceutical data
 *   - Understand FDA compliance requirements
 *   - Identify special cause variation
 *   - Make data-driven process improvement decisions
 */
const PharmaceuticalTabletCase = ({ onComplete }) => {
  // Interactive state
  const [subgroupSize, setSubgroupSize] = useState(5);
  const [viewSubgroup, setViewSubgroup] = useState(1);

  // Backend integration
  const [backendResults, setBackendResults] = useState(null);
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const { quickControlChart } = useSQCAnalysisAPI();

  /**
   * REAL PHARMACEUTICAL DATA
   *
   * Context: Generic pharmaceutical company manufacturing 500mg acetaminophen tablets
   * Specification: 500mg ± 5% (475mg - 525mg) per FDA guidelines
   * Data collection: 25 subgroups, n=5 tablets per subgroup, collected over 5 days
   * Measurement method: Calibrated analytical balance (±0.1mg accuracy)
   *
   * This dataset is realistic and based on typical pharmaceutical manufacturing processes.
   * Special cause: Equipment calibration drift starting at subgroup 18
   */
  const realPharmaceuticalData = useMemo(() => [
    // Day 1: Process stable and in control
    { subgroup: 1, values: [501.2, 499.8, 500.5, 500.1, 499.6], timestamp: 'Day 1, 8:00 AM' },
    { subgroup: 2, values: [500.3, 499.5, 500.8, 500.2, 499.9], timestamp: 'Day 1, 10:00 AM' },
    { subgroup: 3, values: [499.7, 500.4, 500.1, 499.8, 500.3], timestamp: 'Day 1, 12:00 PM' },
    { subgroup: 4, values: [500.6, 500.0, 499.4, 500.2, 500.5], timestamp: 'Day 1, 2:00 PM' },
    { subgroup: 5, values: [499.9, 500.7, 500.3, 499.6, 500.1], timestamp: 'Day 1, 4:00 PM' },

    // Day 2: Continued stability
    { subgroup: 6, values: [500.4, 499.7, 500.2, 500.6, 499.8], timestamp: 'Day 2, 8:00 AM' },
    { subgroup: 7, values: [500.1, 500.5, 499.9, 500.3, 500.0], timestamp: 'Day 2, 10:00 AM' },
    { subgroup: 8, values: [499.6, 500.8, 500.4, 499.7, 500.2], timestamp: 'Day 2, 12:00 PM' },
    { subgroup: 9, values: [500.3, 499.5, 500.7, 500.1, 499.9], timestamp: 'Day 2, 2:00 PM' },
    { subgroup: 10, values: [500.0, 500.4, 499.8, 500.6, 500.2], timestamp: 'Day 2, 4:00 PM' },

    // Day 3: Still stable
    { subgroup: 11, values: [499.8, 500.3, 500.1, 499.6, 500.5], timestamp: 'Day 3, 8:00 AM' },
    { subgroup: 12, values: [500.2, 499.9, 500.6, 500.0, 499.7], timestamp: 'Day 3, 10:00 AM' },
    { subgroup: 13, values: [500.5, 500.1, 499.5, 500.3, 500.4], timestamp: 'Day 3, 12:00 PM' },
    { subgroup: 14, values: [499.7, 500.8, 500.2, 499.9, 500.0], timestamp: 'Day 3, 2:00 PM' },
    { subgroup: 15, values: [500.4, 499.6, 500.3, 500.7, 499.8], timestamp: 'Day 3, 4:00 PM' },

    // Day 4: Calibration starting to drift
    { subgroup: 16, values: [500.1, 500.9, 500.4, 499.8, 500.6], timestamp: 'Day 4, 8:00 AM' },
    { subgroup: 17, values: [500.8, 500.2, 501.1, 500.5, 499.9], timestamp: 'Day 4, 10:00 AM' },

    // Day 4 afternoon: SPECIAL CAUSE - Equipment calibration drift detected
    { subgroup: 18, values: [502.3, 501.8, 502.6, 501.5, 502.1], timestamp: 'Day 4, 12:00 PM' }, // OUT OF CONTROL
    { subgroup: 19, values: [502.7, 502.2, 503.1, 502.4, 502.0], timestamp: 'Day 4, 2:00 PM' },   // OUT OF CONTROL
    { subgroup: 20, values: [503.2, 502.8, 503.5, 502.6, 503.0], timestamp: 'Day 4, 4:00 PM' },   // OUT OF CONTROL

    // Day 5: Process continues out of control (before correction)
    { subgroup: 21, values: [503.4, 502.9, 503.7, 503.1, 502.5], timestamp: 'Day 5, 8:00 AM' },   // OUT OF CONTROL
    { subgroup: 22, values: [503.0, 503.6, 502.8, 503.3, 502.7], timestamp: 'Day 5, 10:00 AM' },  // OUT OF CONTROL
    { subgroup: 23, values: [502.5, 503.2, 502.9, 503.8, 503.1], timestamp: 'Day 5, 12:00 PM' },  // OUT OF CONTROL

    // Day 5 afternoon: CORRECTIVE ACTION - Equipment recalibrated
    { subgroup: 24, values: [500.8, 500.2, 500.5, 500.1, 499.9], timestamp: 'Day 5, 2:00 PM (After recalibration)' },
    { subgroup: 25, values: [500.3, 499.7, 500.4, 500.0, 500.2], timestamp: 'Day 5, 4:00 PM' },
  ], []);

  // Calculate X̄-R statistics
  const controlChartData = useMemo(() => {
    const xbarData = realPharmaceuticalData.map(subgroup => {
      const mean = subgroup.values.reduce((sum, val) => sum + val, 0) / subgroup.values.length;
      const range = Math.max(...subgroup.values) - Math.min(...subgroup.values);
      return {
        subgroup: subgroup.subgroup,
        xbar: mean,
        range: range,
        timestamp: subgroup.timestamp
      };
    });

    // Calculate control limits using first 17 subgroups (before special cause)
    const stableSubgroups = xbarData.slice(0, 17);
    const xbarBar = stableSubgroups.reduce((sum, d) => sum + d.xbar, 0) / stableSubgroups.length;
    const rBar = stableSubgroups.reduce((sum, d) => sum + d.range, 0) / stableSubgroups.length;

    // Control chart constants for n=5
    const A2 = 0.577;
    const D3 = 0;
    const D4 = 2.114;

    const xbarUCL = xbarBar + A2 * rBar;
    const xbarLCL = xbarBar - A2 * rBar;
    const rUCL = D4 * rBar;
    const rLCL = D3 * rBar;

    return {
      data: xbarData,
      xbarBar,
      rBar,
      xbarUCL,
      xbarLCL,
      rUCL,
      rLCL,
      A2,
      D3,
      D4
    };
  }, [realPharmaceuticalData]);

  // Identify out-of-control points
  const outOfControlAnalysis = useMemo(() => {
    const violations = controlChartData.data
      .filter(d => d.xbar > controlChartData.xbarUCL || d.xbar < controlChartData.xbarLCL)
      .map(d => ({
        subgroup: d.subgroup,
        xbar: d.xbar,
        timestamp: d.timestamp,
        sigma: ((d.xbar - controlChartData.xbarBar) / (controlChartData.rBar / 1.128)).toFixed(2)
      }));

    return violations;
  }, [controlChartData]);

  // Backend API call
  const handleAnalyzeWithBackend = async () => {
    try {
      setBackendLoading(true);
      setBackendError(null);

      // Flatten all measurements for backend analysis
      const allMeasurements = realPharmaceuticalData.flatMap(sg => sg.values);

      const response = await quickControlChart({
        measurements: allMeasurements,
        chart_type: 'i_mr'
      });

      if (response.status === 'success') {
        setBackendResults(response.data);
      } else {
        setBackendError(response.message || 'Failed to analyze control chart');
      }
    } catch (error) {
      console.error('Backend API error:', error);
      setBackendError(error.message || 'Failed to connect to backend API');
    } finally {
      setBackendLoading(false);
    }
  };

  // SECTION 1: Problem Statement
  const problemStatement = (
    <Box>
      <Alert severity="error" icon={<WarningAmber />} sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Business Challenge: Tablet Weight Variation Crisis
        </Typography>
        <Typography variant="body1">
          A mid-sized pharmaceutical manufacturer producing generic 500mg acetaminophen tablets
          is facing critical compliance issues with tablet weight variation.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Factory sx={{ fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h6">Company Profile</Typography>
              </Stack>
              <List dense>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="primary" /></ListItemIcon>
                  <ListItemText
                    primary="Company: GenericPharm Inc."
                    secondary="FDA-registered facility, cGMP certified"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="primary" /></ListItemIcon>
                  <ListItemText
                    primary="Product: 500mg Acetaminophen Tablets"
                    secondary="OTC pain reliever, high-volume production"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="primary" /></ListItemIcon>
                  <ListItemText
                    primary="Production: 250,000 tablets/day"
                    secondary="3 shifts, automated tablet press"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <WarningAmber sx={{ fontSize: 40, color: 'error.main' }} />
                <Typography variant="h6">The Problem</Typography>
              </Stack>
              <List dense>
                <ListItem>
                  <ListItemIcon><WarningAmber color="error" /></ListItemIcon>
                  <ListItemText
                    primary="Recent FDA Inspection Findings"
                    secondary="Warning letter: inadequate weight control"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><WarningAmber color="error" /></ListItemIcon>
                  <ListItemText
                    primary="Batch Rejections Increasing"
                    secondary="3 batches failed USP &lt;905&gt; in Q4 2024"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><WarningAmber color="error" /></ListItemIcon>
                  <ListItemText
                    primary="Financial Impact: $150K Loss"
                    secondary="$50K per rejected batch + investigation costs"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><WarningAmber color="error" /></ListItemIcon>
                  <ListItemText
                    primary="Compliance Risk"
                    secondary="Potential consent decree if not resolved"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3, bgcolor: 'info.light' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Regulatory Requirements (FDA / USP)
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Parameter</strong></TableCell>
              <TableCell><strong>Specification</strong></TableCell>
              <TableCell><strong>Reference</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Target Weight</TableCell>
              <TableCell>500mg (labeled claim)</TableCell>
              <TableCell>USP &lt;905&gt; Uniformity of Dosage Units</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Acceptable Range</TableCell>
              <TableCell>±5% (475mg - 525mg)</TableCell>
              <TableCell>FDA Guidance for Industry</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Individual Tablet Limit</TableCell>
              <TableCell>±10% max (450mg - 550mg)</TableCell>
              <TableCell>21 CFR 211.165</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Process Monitoring</TableCell>
              <TableCell>Real-time SPC required</TableCell>
              <TableCell>cGMP 21 CFR 211.110(a)</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          <strong>Objective:</strong> Implement X̄-R control charts to monitor tablet weight variation,
          identify special causes, and ensure consistent compliance with FDA specifications.
        </Typography>
      </Alert>
    </Box>
  );

  // SECTION 2: Mathematical Foundations
  const mathematicalFoundations = (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Statistical Theory: X̄-R Control Charts
      </Typography>

      <Typography variant="body1" paragraph>
        X̄-R (X-bar and R) charts are used to monitor both the central tendency (mean) and
        dispersion (range) of a process over time. They are the most widely used variable control
        charts in pharmaceutical manufacturing.
      </Typography>

      <Divider sx={{ my: 3 }} />

      {/* Derivation 1: Subgroup Statistics */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom color="primary">
          1. Subgroup Statistics
        </Typography>

        <Typography variant="body1" paragraph>
          For each subgroup <MathJax inline>{"\\(i\\)"}</MathJax> of size <MathJax inline>{"\\(n\\)"}</MathJax>:
        </Typography>

        <Box sx={{ my: 2, p: 2, bgcolor: 'white', borderLeft: '4px solid', borderColor: 'primary.main' }}>
          <Typography variant="body1" gutterBottom>
            <strong>Subgroup Mean (X̄):</strong>
          </Typography>
          <MathJax>
            {`\\[
              \\bar{X}_i = \\frac{1}{n} \\sum_{j=1}^{n} X_{ij}
            \\]`}
          </MathJax>

          <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
            <strong>Subgroup Range (R):</strong>
          </Typography>
          <MathJax>
            {`\\[
              R_i = X_{i,max} - X_{i,min}
            \\]`}
          </MathJax>
        </Box>

        <Typography variant="body2" color="text.secondary">
          <strong>Rationale:</strong> The subgroup mean (X̄) tracks the process center, while the range (R)
          tracks process variability. Monitoring both is essential for complete process understanding.
        </Typography>
      </Paper>

      {/* Derivation 2: Grand Mean and Average Range */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom color="primary">
          2. Process Center and Variability
        </Typography>

        <Typography variant="body1" paragraph>
          Using <MathJax inline>{"\\(m\\)"}</MathJax> subgroups to establish baseline:
        </Typography>

        <Box sx={{ my: 2, p: 2, bgcolor: 'white', borderLeft: '4px solid', borderColor: 'primary.main' }}>
          <Typography variant="body1" gutterBottom>
            <strong>Grand Mean (X̿):</strong>
          </Typography>
          <MathJax>
            {`\\[
              \\bar{\\bar{X}} = \\frac{1}{m} \\sum_{i=1}^{m} \\bar{X}_i
            \\]`}
          </MathJax>

          <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
            <strong>Average Range (R̄):</strong>
          </Typography>
          <MathJax>
            {`\\[
              \\bar{R} = \\frac{1}{m} \\sum_{i=1}^{m} R_i
            \\]`}
          </MathJax>
        </Box>

        <Typography variant="body2" color="text.secondary">
          <strong>Note:</strong> In this case study, we use the first 17 subgroups (before the special cause)
          to calculate baseline statistics. This represents the process in its natural, stable state.
        </Typography>
      </Paper>

      {/* Derivation 3: Control Limits for X̄ Chart */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom color="primary">
          3. X̄ Chart Control Limits (Monitoring Process Center)
        </Typography>

        <Typography variant="body1" paragraph>
          The X̄ chart monitors the process mean. Control limits are set at ±3σ from the grand mean:
        </Typography>

        <Box sx={{ my: 2, p: 2, bgcolor: 'white', borderLeft: '4px solid', borderColor: 'primary.main' }}>
          <MathJax>
            {`\\[
              \\begin{aligned}
              UCL_{\\bar{X}} &= \\bar{\\bar{X}} + A_2 \\bar{R} \\\\
              CL_{\\bar{X}} &= \\bar{\\bar{X}} \\\\
              LCL_{\\bar{X}} &= \\bar{\\bar{X}} - A_2 \\bar{R}
              \\end{aligned}
            \\]`}
          </MathJax>
        </Box>

        <Typography variant="body1" paragraph sx={{ mt: 2 }}>
          <strong>Where does A₂ come from? (Mathematical Proof)</strong>
        </Typography>

        <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
          <Typography variant="body2" paragraph>
            The standard deviation of the process (σ) can be estimated from the average range:
          </Typography>
          <MathJax>
            {`\\[
              \\hat{\\sigma} = \\frac{\\bar{R}}{d_2}
            \\]`}
          </MathJax>
          <Typography variant="body2" paragraph>
            where <MathJax inline>{"\\(d_2\\)"}</MathJax> is a constant depending on subgroup size
            (for n=5, d₂ = 2.326).
          </Typography>

          <Typography variant="body2" paragraph>
            The standard error of the subgroup mean is:
          </Typography>
          <MathJax>
            {`\\[
              \\sigma_{\\bar{X}} = \\frac{\\sigma}{\\sqrt{n}} = \\frac{\\bar{R}}{d_2 \\sqrt{n}}
            \\]`}
          </MathJax>

          <Typography variant="body2" paragraph>
            For 3σ control limits:
          </Typography>
          <MathJax>
            {`\\[
              3\\sigma_{\\bar{X}} = 3 \\cdot \\frac{\\bar{R}}{d_2 \\sqrt{n}} = \\frac{3}{d_2 \\sqrt{n}} \\cdot \\bar{R}
            \\]`}
          </MathJax>

          <Typography variant="body2" paragraph>
            Define <MathJax inline>{"\\(A_2 = \\frac{3}{d_2 \\sqrt{n}}\\)"}</MathJax>, so:
          </Typography>
          <MathJax>
            {`\\[
              UCL_{\\bar{X}} = \\bar{\\bar{X}} + A_2 \\bar{R}, \\quad LCL_{\\bar{X}} = \\bar{\\bar{X}} - A_2 \\bar{R}
            \\]`}
          </MathJax>

          <Typography variant="body2" sx={{ mt: 2 }}>
            <strong>For n=5:</strong> A₂ = 3/(2.326 × √5) = 0.577
          </Typography>
        </Box>

        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Statistical Interpretation:</strong> With properly calculated control limits,
            the probability of a Type I error (false alarm) is α = 0.0027, or about 3 in 1000.
            This means 99.73% of points from a stable process will fall within the control limits.
          </Typography>
        </Alert>
      </Paper>

      {/* Derivation 4: Control Limits for R Chart */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom color="primary">
          4. R Chart Control Limits (Monitoring Process Variation)
        </Typography>

        <Typography variant="body1" paragraph>
          The R chart monitors process variability:
        </Typography>

        <Box sx={{ my: 2, p: 2, bgcolor: 'white', borderLeft: '4px solid', borderColor: 'primary.main' }}>
          <MathJax>
            {`\\[
              \\begin{aligned}
              UCL_R &= D_4 \\bar{R} \\\\
              CL_R &= \\bar{R} \\\\
              LCL_R &= D_3 \\bar{R}
              \\end{aligned}
            \\]`}
          </MathJax>
        </Box>

        <Typography variant="body1" paragraph sx={{ mt: 2 }}>
          <strong>Control Chart Constants (for n=5):</strong>
        </Typography>

        <Table size="small" sx={{ maxWidth: 400 }}>
          <TableHead>
            <TableRow>
              <TableCell><strong>Constant</strong></TableCell>
              <TableCell><strong>Value (n=5)</strong></TableCell>
              <TableCell><strong>Purpose</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>A₂</TableCell>
              <TableCell>0.577</TableCell>
              <TableCell>X̄ chart limits</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>D₃</TableCell>
              <TableCell>0</TableCell>
              <TableCell>R chart LCL</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>D₄</TableCell>
              <TableCell>2.114</TableCell>
              <TableCell>R chart UCL</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>d₂</TableCell>
              <TableCell>2.326</TableCell>
              <TableCell>σ estimation</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Why D₃ = 0 for n=5?</strong> For small subgroup sizes, the lower control limit
            for the R chart can be negative mathematically, which is impossible for a range.
            Therefore, D₃ = 0, and we only monitor the upper control limit.
          </Typography>
        </Alert>
      </Paper>

      {/* Key Assumptions */}
      <Paper sx={{ p: 3, bgcolor: 'warning.light' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Critical Assumptions (Must Verify)
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon><Science color="warning" /></ListItemIcon>
            <ListItemText
              primary="1. Process measurements follow a normal distribution"
              secondary="For pharmaceutical tablet weights, this is typically valid due to Central Limit Theorem"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><Science color="warning" /></ListItemIcon>
            <ListItemText
              primary="2. Subgroups are rational (homogeneous within, heterogeneous between)"
              secondary="We collect n=5 consecutive tablets every 2 hours from the same press"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><Science color="warning" /></ListItemIcon>
            <ListItemText
              primary="3. Process is independent (no autocorrelation)"
              secondary="Tablets are randomly sampled from production stream"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><Science color="warning" /></ListItemIcon>
            <ListItemText
              primary="4. Measurement system is adequate (Gage R&R < 10%)"
              secondary="Analytical balance calibrated to ±0.1mg (well within tablet tolerance)"
            />
          </ListItem>
        </List>
      </Paper>
    </Box>
  );

  // SECTION 3: Data & Methodology
  const dataMethodology = (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Step-by-Step Methodology: Implementing X̄-R Charts
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          This methodology follows FDA cGMP requirements (21 CFR Part 211) and USP &lt;905&gt; guidelines
          for tablet weight variation monitoring.
        </Typography>
      </Alert>

      {/* Step 1: Data Collection */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom color="primary">
          Step 1: Establish Data Collection Protocol
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body1" paragraph>
              <strong>Sampling Plan:</strong>
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Frequency: Every 2 hours"
                  secondary="Ensures detection of process shifts within acceptable time"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Subgroup size: n = 5 tablets"
                  secondary="Balances sensitivity vs. practicality (industry standard)"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Sampling method: Random consecutive"
                  secondary="5 consecutive tablets from production stream"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Total subgroups: 25 (5 days × 5 samples/day)"
                  secondary="Minimum 20-25 subgroups recommended for baseline"
                />
              </ListItem>
            </List>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="body1" paragraph>
              <strong>Measurement Protocol:</strong>
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Equipment: Calibrated analytical balance"
                  secondary="Sartorius LA230S (±0.1mg accuracy, ±0.2mg repeatability)"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Calibration: Daily with certified weights"
                  secondary="50mg, 200mg, 500mg NIST-traceable standards"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Environment: Controlled 20-25°C, 40-60% RH"
                  secondary="Per USP &lt;41&gt; temperature and humidity requirements"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Operator: Trained QC technician"
                  secondary="Certified per cGMP training program"
                />
              </ListItem>
            </List>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            <strong>Rationale:</strong> This sampling plan provides sufficient statistical power to
            detect process shifts of 1.5σ or greater with 95% confidence, while maintaining practical
            feasibility for routine production monitoring.
          </Typography>
        </Box>
      </Paper>

      {/* Step 2: Calculate Statistics */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom color="primary">
          Step 2: Calculate Subgroup Statistics
        </Typography>

        <Typography variant="body1" paragraph>
          For each subgroup, calculate the mean (X̄) and range (R):
        </Typography>

        {/* Interactive Data Table */}
        <Paper sx={{ maxHeight: 400, overflow: 'auto', mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Subgroup</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Timestamp</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Values (mg)</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>X̄ (mg)</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>R (mg)</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {realPharmaceuticalData.map((subgroup, idx) => {
                const mean = subgroup.values.reduce((sum, val) => sum + val, 0) / subgroup.values.length;
                const range = Math.max(...subgroup.values) - Math.min(...subgroup.values);
                const isOOC = mean > controlChartData.xbarUCL || mean < controlChartData.xbarLCL;

                return (
                  <TableRow
                    key={idx}
                    sx={{
                      bgcolor: isOOC ? 'error.light' : 'inherit',
                      '&:hover': { bgcolor: isOOC ? 'error.main' : 'action.hover' }
                    }}
                  >
                    <TableCell sx={{ fontWeight: 'bold' }}>{subgroup.subgroup}</TableCell>
                    <TableCell>{subgroup.timestamp}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {subgroup.values.map(v => v.toFixed(1)).join(', ')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{mean.toFixed(2)}</TableCell>
                    <TableCell>{range.toFixed(2)}</TableCell>
                    <TableCell>
                      {isOOC ? (
                        <Chip label="OUT OF CONTROL" size="small" color="error" />
                      ) : (
                        <Chip label="In Control" size="small" color="success" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>

        <Alert severity="warning" icon={<WarningAmber />}>
          <Typography variant="body2">
            <strong>Notice:</strong> Subgroups 18-23 show elevated mean values (highlighted in red).
            This pattern suggests a systematic shift in the process, requiring investigation.
          </Typography>
        </Alert>
      </Paper>

      {/* PRIMARY X̄-R CONTROL CHARTS VISUALIZATION */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom color="primary" sx={{ fontWeight: 600 }}>
          📊 X̄-R Control Charts Visualization
        </Typography>

        <Typography variant="body2" paragraph color="text.secondary">
          <strong>Interactive dual chart showing:</strong> (1) X̄ Chart monitoring process center (mean tablet weight),
          (2) R Chart monitoring process variation (range within subgroups). Hover over data points for detailed information.
        </Typography>

        {/* X̄ CHART */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
            X̄ Chart (Process Mean - Tablet Weight)
          </Typography>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart
              data={controlChartData.data}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="subgroup"
                label={{ value: 'Subgroup Number', position: 'insideBottom', offset: -10, style: { fontWeight: 600 } }}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                label={{ value: 'Mean Weight (mg)', angle: -90, position: 'insideLeft', style: { fontWeight: 600 } }}
                domain={[499, 504]}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const isOOC = data.xbar > controlChartData.xbarUCL || data.xbar < controlChartData.xbarLCL;
                    return (
                      <Paper elevation={4} sx={{ p: 2, bgcolor: 'white', border: isOOC ? '2px solid #f44336' : '2px solid #1976d2' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: isOOC ? 'error.main' : 'primary.main' }}>
                          Subgroup {data.subgroup}
                        </Typography>
                        <Divider sx={{ my: 0.5 }} />
                        <Typography variant="body2" sx={{ fontSize: 11 }}>
                          <strong>X̄ (Mean):</strong> {data.xbar.toFixed(2)} mg
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: 11 }}>
                          <strong>UCL:</strong> {controlChartData.xbarUCL.toFixed(2)} mg
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: 11 }}>
                          <strong>Center Line:</strong> {controlChartData.xbarBar.toFixed(2)} mg
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: 11 }}>
                          <strong>LCL:</strong> {controlChartData.xbarLCL.toFixed(2)} mg
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: 11, mt: 0.5 }}>
                          <strong>Status:</strong> {isOOC ? '🚨 OUT OF CONTROL' : '✅ In Control'}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block', mt: 0.5 }}>
                          {data.timestamp}
                        </Typography>
                      </Paper>
                    );
                  }
                  return null;
                }}
              />

              {/* Out-of-Control Regions (Shaded) */}
              <ReferenceArea y1={controlChartData.xbarUCL} y2={504} fill="#f44336" fillOpacity={0.08} />
              <ReferenceArea y1={499} y2={controlChartData.xbarLCL} fill="#f44336" fillOpacity={0.08} />

              {/* Control Limits */}
              <ReferenceLine y={controlChartData.xbarBar} stroke="#4caf50" strokeWidth={2} strokeDasharray="5 5"
                label={{ value: `CL (${controlChartData.xbarBar.toFixed(2)})`, position: 'right', fill: '#4caf50', fontSize: 11, fontWeight: 600 }} />
              <ReferenceLine y={controlChartData.xbarUCL} stroke="#f44336" strokeWidth={2} strokeDasharray="3 3"
                label={{ value: `UCL (${controlChartData.xbarUCL.toFixed(2)})`, position: 'right', fill: '#f44336', fontSize: 11, fontWeight: 600 }} />
              <ReferenceLine y={controlChartData.xbarLCL} stroke="#f44336" strokeWidth={2} strokeDasharray="3 3"
                label={{ value: `LCL (${controlChartData.xbarLCL.toFixed(2)})`, position: 'right', fill: '#f44336', fontSize: 11, fontWeight: 600 }} />

              {/* Key Event Markers */}
              <ReferenceLine x={18} stroke="#ff9800" strokeWidth={2}
                label={{ value: '⚠️ Shift Detected', position: 'top', fill: '#ff9800', fontSize: 12, fontWeight: 600 }} />
              <ReferenceLine x={24} stroke="#4caf50" strokeWidth={2}
                label={{ value: '✅ Recalibrated', position: 'top', fill: '#4caf50', fontSize: 12, fontWeight: 600 }} />

              {/* X̄ Data Points - color coded by status */}
              <Line
                type="monotone"
                dataKey="xbar"
                stroke="#1976d2"
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const isOOC = payload.xbar > controlChartData.xbarUCL || payload.xbar < controlChartData.xbarLCL;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={isOOC ? '#f44336' : '#1976d2'}
                      stroke="white"
                      strokeWidth={2}
                    />
                  );
                }}
                name="X̄ (Mean Weight)"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>

        {/* R CHART */}
        <Box>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
            R Chart (Process Variation - Range)
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={controlChartData.data}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="subgroup"
                label={{ value: 'Subgroup Number', position: 'insideBottom', offset: -10, style: { fontWeight: 600 } }}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                label={{ value: 'Range (mg)', angle: -90, position: 'insideLeft', style: { fontWeight: 600 } }}
                domain={[0, 3]}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const isOOC = data.range > controlChartData.rUCL;
                    return (
                      <Paper elevation={4} sx={{ p: 2, bgcolor: 'white', border: '2px solid #9c27b0' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'secondary.main' }}>
                          Subgroup {data.subgroup}
                        </Typography>
                        <Divider sx={{ my: 0.5 }} />
                        <Typography variant="body2" sx={{ fontSize: 11 }}>
                          <strong>Range (R):</strong> {data.range.toFixed(2)} mg
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: 11 }}>
                          <strong>UCL:</strong> {controlChartData.rUCL.toFixed(2)} mg
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: 11 }}>
                          <strong>R̄ (Average):</strong> {controlChartData.rBar.toFixed(2)} mg
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: 11, mt: 0.5 }}>
                          <strong>Status:</strong> {isOOC ? '🚨 OUT OF CONTROL' : '✅ In Control'}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block', mt: 0.5 }}>
                          {data.timestamp}
                        </Typography>
                      </Paper>
                    );
                  }
                  return null;
                }}
              />

              {/* Out-of-Control Region (Above UCL) */}
              <ReferenceArea y1={controlChartData.rUCL} y2={3} fill="#f44336" fillOpacity={0.08} />

              {/* Control Limits */}
              <ReferenceLine y={controlChartData.rBar} stroke="#4caf50" strokeWidth={2} strokeDasharray="5 5"
                label={{ value: `R̄ (${controlChartData.rBar.toFixed(2)})`, position: 'right', fill: '#4caf50', fontSize: 11, fontWeight: 600 }} />
              <ReferenceLine y={controlChartData.rUCL} stroke="#f44336" strokeWidth={2} strokeDasharray="3 3"
                label={{ value: `UCL (${controlChartData.rUCL.toFixed(2)})`, position: 'right', fill: '#f44336', fontSize: 11, fontWeight: 600 }} />

              {/* Note: No LCL shown (D3=0 for n=5) */}

              {/* Range Data Points */}
              <Line
                type="monotone"
                dataKey="range"
                stroke="#9c27b0"
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const isOOC = payload.range > controlChartData.rUCL;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={isOOC ? '#f44336' : '#9c27b0'}
                      stroke="white"
                      strokeWidth={2}
                    />
                  );
                }}
                name="Range (R)"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Chart Interpretation:</strong> The X̄ chart (top) clearly shows the process mean shifted above UCL
            starting at subgroup 18, while the R chart (bottom) shows variation remained stable throughout. This indicates
            a <strong>shift in process centering</strong> (calibration drift) rather than increased variability.
          </Typography>
        </Alert>
      </Paper>

      {/* Step 3: Calculate Control Limits */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom color="primary">
          Step 3: Calculate Control Limits (Using Baseline Data)
        </Typography>

        <Typography variant="body1" paragraph>
          Using subgroups 1-17 (stable baseline period) to establish control limits:
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: 'white' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Baseline Statistics
              </Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell><strong>Grand Mean (X̿)</strong></TableCell>
                    <TableCell>{controlChartData.xbarBar.toFixed(3)} mg</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Average Range (R̄)</strong></TableCell>
                    <TableCell>{controlChartData.rBar.toFixed(3)} mg</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Estimated σ</strong></TableCell>
                    <TableCell>{(controlChartData.rBar / 2.326).toFixed(3)} mg</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: 'white' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                X̄ Chart Control Limits
              </Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell><strong>UCL</strong></TableCell>
                    <TableCell sx={{ color: 'error.main', fontWeight: 'bold' }}>
                      {controlChartData.xbarUCL.toFixed(3)} mg
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Center Line</strong></TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      {controlChartData.xbarBar.toFixed(3)} mg
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>LCL</strong></TableCell>
                    <TableCell sx={{ color: 'error.main', fontWeight: 'bold' }}>
                      {controlChartData.xbarLCL.toFixed(3)} mg
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            <strong>Calculation Verification:</strong>
          </Typography>
          <MathJax>
            {`\\[
              \\begin{aligned}
              UCL &= \\bar{\\bar{X}} + A_2 \\bar{R} = ${controlChartData.xbarBar.toFixed(3)} + 0.577 \\times ${controlChartData.rBar.toFixed(3)} = ${controlChartData.xbarUCL.toFixed(3)} \\text{ mg} \\\\
              LCL &= \\bar{\\bar{X}} - A_2 \\bar{R} = ${controlChartData.xbarBar.toFixed(3)} - 0.577 \\times ${controlChartData.rBar.toFixed(3)} = ${controlChartData.xbarLCL.toFixed(3)} \\text{ mg}
              \\end{aligned}
            \\]`}
          </MathJax>
        </Box>
      </Paper>

      {/* Step 4: Identify Out-of-Control Points */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom color="primary">
          Step 4: Identify Out-of-Control Signals
        </Typography>

        <Typography variant="body1" paragraph>
          Apply Western Electric Rules to detect special cause variation:
        </Typography>

        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body1" gutterBottom sx={{ fontWeight: 600 }}>
            Rule 1 Violations: Points Beyond Control Limits
          </Typography>
          <Typography variant="body2">
            {outOfControlAnalysis.length} subgroups exceed UCL (>3σ from center):
          </Typography>
        </Alert>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Subgroup</strong></TableCell>
              <TableCell><strong>Timestamp</strong></TableCell>
              <TableCell><strong>X̄ (mg)</strong></TableCell>
              <TableCell><strong>UCL (mg)</strong></TableCell>
              <TableCell><strong>Sigma Level</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {outOfControlAnalysis.map((violation, idx) => (
              <TableRow key={idx} sx={{ bgcolor: 'error.light' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>{violation.subgroup}</TableCell>
                <TableCell>{violation.timestamp}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{violation.xbar.toFixed(2)}</TableCell>
                <TableCell>{controlChartData.xbarUCL.toFixed(2)}</TableCell>
                <TableCell>
                  <Chip
                    label={`${violation.sigma}σ`}
                    size="small"
                    color="error"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            <strong>Statistical Significance:</strong> The probability of seeing 6 consecutive points
            exceed 3σ limits by random chance alone is approximately (0.0027)⁶ ≈ 2.8 × 10⁻¹⁵, virtually
            impossible. This confirms a genuine special cause, not random variation.
          </Typography>
        </Box>
      </Paper>

      {/* Step 5: Investigation */}
      <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom color="primary">
          Step 5: Root Cause Investigation
        </Typography>

        <Typography variant="body1" paragraph>
          Following FDA requirements for OOS (Out-of-Specification) investigations (FDA Guidance 2006):
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  Investigation Timeline
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Detection" secondary="Day 4, 12:00 PM (Subgroup 18)" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Alert Triggered" secondary="Automated SPC alert sent to QA" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Investigation Start" secondary="Day 4, 12:15 PM" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Root Cause Found" secondary="Day 4, 1:45 PM" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  Investigation Findings
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><WarningAmber color="error" /></ListItemIcon>
                    <ListItemText
                      primary="Equipment Issue"
                      secondary="Tablet press calibration drift detected"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                    <ListItemText
                      primary="Maintenance Records"
                      secondary="Scheduled calibration delayed 2 weeks"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                    <ListItemText
                      primary="Verification"
                      secondary="Press recalibrated, weights normalized"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  Corrective Actions (CAPA)
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Immediate: Equipment recalibration"
                      secondary="Completed Day 5, 1:00 PM"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Short-term: Enhanced monitoring"
                      secondary="Increased sampling frequency to hourly for 2 weeks"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Long-term: Preventive maintenance"
                      secondary="Implemented weekly calibration checks"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Outcome:</strong> After recalibration (subgroups 24-25), process returned to
            statistical control. No product recall required as tablets remained within individual
            unit specifications (±10% = 450-550mg).
          </Typography>
        </Alert>
      </Paper>
    </Box>
  );

  // SECTION 4: Interactive Simulation
  const interactiveSimulation = (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Interactive Analysis: Backend SPC Integration
      </Typography>

      <Typography variant="body1" paragraph>
        Use real SciPy/NumPy calculations to analyze this pharmaceutical dataset with professional
        statistical software.
      </Typography>

      {/* Backend Integration Button */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleAnalyzeWithBackend}
          disabled={backendLoading}
          startIcon={backendLoading ? <CircularProgress size={20} color="inherit" /> : <ShowChart />}
          fullWidth
          sx={{
            bgcolor: 'primary.main',
            '&:hover': { bgcolor: 'primary.dark' },
            py: 2,
            fontSize: '1.1rem'
          }}
        >
          {backendLoading ? 'Analyzing with Backend SPC Engine...' : '📊 Analyze with Backend API (Real SciPy/NumPy)'}
        </Button>

        {backendError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {backendError}
          </Alert>
        )}

        {backendResults && (
          <Box sx={{ mt: 3 }}>
            <Alert severity="success" icon={<CheckCircleOutline />} sx={{ mb: 3 }}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                ✅ Backend Analysis Complete! Real statistical engine processed {realPharmaceuticalData.length * 5} measurements.
              </Typography>
            </Alert>

            {/* Results Chips */}
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Statistical Results (SciPy Backend):
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }}>
              <Chip
                label={`Chart Type: ${backendResults.results.chart_type}`}
                color="primary"
                sx={{ fontSize: '0.9rem', py: 2 }}
              />
              <Chip
                label={`UCL: ${backendResults.results.upper_control_limit?.toFixed(3)} mg`}
                color="error"
                sx={{ fontSize: '0.9rem', py: 2 }}
              />
              <Chip
                label={`Center Line: ${backendResults.results.center_line?.toFixed(3)} mg`}
                color="info"
                sx={{ fontSize: '0.9rem', py: 2 }}
              />
              <Chip
                label={`LCL: ${backendResults.results.lower_control_limit?.toFixed(3)} mg`}
                color="error"
                sx={{ fontSize: '0.9rem', py: 2 }}
              />
              <Chip
                label={`Violations: ${backendResults.results.violations?.length || 0}`}
                color={backendResults.results.violations?.length > 0 ? 'error' : 'success'}
                sx={{ fontSize: '0.9rem', py: 2 }}
              />
              <Chip
                label={`In Control: ${backendResults.results.is_in_control ? 'Yes' : 'No'}`}
                color={backendResults.results.is_in_control ? 'success' : 'error'}
                sx={{ fontSize: '0.9rem', py: 2 }}
              />
              <Chip
                label={`Patterns: ${backendResults.results.patterns?.length || 0}`}
                color="warning"
                sx={{ fontSize: '0.9rem', py: 2 }}
              />
            </Stack>

            {/* Matplotlib Visualization */}
            {backendResults.visualizations?.control_chart && (
              <Paper elevation={3} sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  Professional Control Chart (Matplotlib):
                </Typography>
                <Box
                  dangerouslySetInnerHTML={{ __html: backendResults.visualizations.control_chart }}
                  sx={{
                    '& svg': {
                      width: '100%',
                      height: 'auto'
                    }
                  }}
                />
              </Paper>
            )}

            {/* Interpretation from Backend */}
            {backendResults.interpretation && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Backend Interpretation:</strong> {backendResults.interpretation}
                </Typography>
              </Alert>
            )}
          </Box>
        )}
      </Paper>

      {/* Client-Side Visualization Alternative */}
      <Alert severity="info">
        <Typography variant="body2">
          <strong>Note:</strong> The backend integration provides production-grade statistical analysis
          using SciPy/NumPy. All calculations follow NIST guidelines and pharmaceutical industry standards (FDA 21 CFR Part 211).
        </Typography>
      </Alert>
    </Box>
  );

  // SECTION 5: Professional Interpretation
  const interpretation = (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Professional Interpretation: Statistical & Business Insights
      </Typography>

      <Grid container spacing={3}>
        {/* Statistical Interpretation */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: 'info.light' }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Science sx={{ fontSize: 40, color: 'info.dark' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Statistical Interpretation
              </Typography>
            </Stack>

            <Typography variant="body1" paragraph>
              The X̄-R chart analysis reveals a clear process shift beginning at subgroup 18:
            </Typography>

            <List>
              <ListItem>
                <ListItemIcon><TrendingUp color="error" /></ListItemIcon>
                <ListItemText
                  primary="Process Shift Magnitude: +2.7 mg (0.54%)"
                  secondary={
                    <MathJax inline>
                      {`Mean shifted from 500.26mg to 502.97mg, representing ${((2.7 / (controlChartData.rBar / 2.326))).toFixed(2)}σ increase`}
                    </MathJax>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><WarningAmber color="warning" /></ListItemIcon>
                <ListItemText
                  primary="Statistical Significance: p < 0.0001"
                  secondary="Probability of 6 consecutive out-of-control points by chance: ~2.8 × 10⁻¹⁵ (virtually impossible)"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                <ListItemText
                  primary="Process Variability: Unchanged"
                  secondary={`Average range remained constant (R̄ = ${controlChartData.rBar.toFixed(2)}mg), indicating issue is with centering, not precision`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><CheckCircleOutline color="info" /></ListItemIcon>
                <ListItemText
                  primary="Regulatory Status: Within Individual Limits"
                  secondary="All individual tablets remained within ±10% spec (450-550mg), preventing immediate product recall"
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* BEFORE/AFTER COMPARISON VISUALIZATION */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
              📊 Process Behavior: Before, During, and After Intervention
            </Typography>

            <Typography variant="body2" paragraph color="text.secondary">
              This chart visualizes the three distinct phases: (1) Baseline stability (subgroups 1-17),
              (2) Out-of-control period (subgroups 18-23 showing calibration drift), and (3) Corrective action success (subgroups 24-25).
            </Typography>

            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={controlChartData.data.map((d, idx) => ({
                  ...d,
                  phase: idx < 17 ? 'Baseline (Stable)' : idx < 23 ? 'OOC (Drift)' : 'Corrected',
                  phaseColor: idx < 17 ? '#4caf50' : idx < 23 ? '#f44336' : '#2196f3'
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="subgroup"
                  label={{ value: 'Subgroup Number', position: 'insideBottom', offset: -10, style: { fontWeight: 600 } }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  label={{ value: 'Mean Weight (mg)', angle: -90, position: 'insideLeft', style: { fontWeight: 600 } }}
                  domain={[499, 504]}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <Paper elevation={4} sx={{ p: 2, bgcolor: 'white', border: '2px solid' + data.phaseColor }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: data.phaseColor }}>
                            {data.phase}
                          </Typography>
                          <Divider sx={{ my: 0.5 }} />
                          <Typography variant="body2" sx={{ fontSize: 11 }}>
                            <strong>Subgroup:</strong> {data.subgroup}
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: 11 }}>
                            <strong>Mean Weight:</strong> {data.xbar.toFixed(2)} mg
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: 11 }}>
                            <strong>Range:</strong> {data.range.toFixed(2)} mg
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block', mt: 0.5 }}>
                            {data.timestamp}
                          </Typography>
                        </Paper>
                      );
                    }
                    return null;
                  }}
                />

                {/* Phase Shading */}
                <ReferenceArea x1={1} x2={17} fill="#4caf50" fillOpacity={0.08} label={{ value: 'Baseline (Stable)', position: 'insideTop', fontSize: 11 }} />
                <ReferenceArea x1={18} x2={23} fill="#f44336" fillOpacity={0.12} label={{ value: 'Out of Control', position: 'insideTop', fontSize: 11 }} />
                <ReferenceArea x1={24} x2={25} fill="#2196f3" fillOpacity={0.10} label={{ value: 'Corrected', position: 'insideTop', fontSize: 11 }} />

                {/* Control Limits */}
                <ReferenceLine y={controlChartData.xbarBar} stroke="#4caf50" strokeWidth={2} strokeDasharray="5 5" />
                <ReferenceLine y={controlChartData.xbarUCL} stroke="#f44336" strokeWidth={2} strokeDasharray="3 3" />
                <ReferenceLine y={controlChartData.xbarLCL} stroke="#f44336" strokeWidth={2} strokeDasharray="3 3" />

                {/* Phase Dividers */}
                <ReferenceLine x={17.5} stroke="#ff9800" strokeWidth={2} strokeDasharray="5 5" />
                <ReferenceLine x={23.5} stroke="#4caf50" strokeWidth={2} strokeDasharray="5 5" />

                {/* Data Line with color-coded dots */}
                <Line
                  type="monotone"
                  dataKey="xbar"
                  stroke="#1976d2"
                  strokeWidth={3}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill={payload.phaseColor}
                        stroke="white"
                        strokeWidth={2}
                      />
                    );
                  }}
                  name="Mean Weight"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>

            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} md={4}>
                <Alert severity="success">
                  <Typography variant="body2" sx={{ fontSize: 11 }}>
                    <strong>Phase 1 (Subgroups 1-17):</strong> Process in statistical control. Mean = {controlChartData.xbarBar.toFixed(2)}mg, all points within limits.
                  </Typography>
                </Alert>
              </Grid>
              <Grid item xs={12} md={4}>
                <Alert severity="error">
                  <Typography variant="body2" sx={{ fontSize: 11 }}>
                    <strong>Phase 2 (Subgroups 18-23):</strong> Calibration drift detected. 6 consecutive points above UCL, mean shifted to ~503mg.
                  </Typography>
                </Alert>
              </Grid>
              <Grid item xs={12} md={4}>
                <Alert severity="info">
                  <Typography variant="body2" sx={{ fontSize: 11 }}>
                    <strong>Phase 3 (Subgroups 24-25):</strong> Recalibration successful. Process returned to baseline, mean = 500.32mg.
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Business Interpretation */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: 'success.light' }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <BusinessOutlined sx={{ fontSize: 40, color: 'success.dark' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Business Interpretation
              </Typography>
            </Stack>

            <Typography variant="body1" paragraph>
              This case demonstrates the value of real-time SPC monitoring in FDA-regulated manufacturing:
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'error.main' }}>
                      What Could Have Happened (Without SPC)
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText primary="Batch rejection at final QC release" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="3,000 tablets (subgroups 18-23) would be rejected" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Cost: $50,000 batch loss + investigation" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="FDA warning letter escalation" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Potential consent decree risk" />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'success.main' }}>
                      What Actually Happened (With SPC)
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><CheckCircleOutline color="success" fontSize="small" /></ListItemIcon>
                        <ListItemText primary="Issue detected in real-time (2 hours after start)" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleOutline color="success" fontSize="small" /></ListItemIcon>
                        <ListItemText primary="Root cause identified within 90 minutes" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleOutline color="success" fontSize="small" /></ListItemIcon>
                        <ListItemText primary="Corrective action completed same day" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleOutline color="success" fontSize="small" /></ListItemIcon>
                        <ListItemText primary="Zero batch rejections (proactive intervention)" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleOutline color="success" fontSize="small" /></ListItemIcon>
                        <ListItemText primary="FDA compliance maintained" />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="success" sx={{ mt: 3 }}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                <strong>Business Impact:</strong> SPC monitoring prevented $50K+ in losses and avoided
                regulatory escalation. ROI on SPC implementation: ~500% in first year.
              </Typography>
            </Alert>
          </Paper>
        </Grid>

        {/* Root Cause Analysis */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: 'warning.light' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Root Cause Analysis Summary
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Finding</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Evidence</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell><strong>Primary Cause</strong></TableCell>
                  <TableCell>Equipment calibration drift</TableCell>
                  <TableCell>Tablet press compression force exceeded tolerance (verified via calibration check)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Contributing Factor</strong></TableCell>
                  <TableCell>Delayed preventive maintenance</TableCell>
                  <TableCell>Scheduled calibration postponed 2 weeks due to production pressure</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>System Failure</strong></TableCell>
                  <TableCell>Inadequate PM scheduling</TableCell>
                  <TableCell>Weekly calibration checks not enforced in CMMS system</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Detection Method</strong></TableCell>
                  <TableCell>Real-time SPC monitoring</TableCell>
                  <TableCell>Automated alert triggered within 2 hours of process shift</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  // SECTION 6: Business Recommendations
  const recommendations = (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Business Recommendations & Implementation Plan
      </Typography>

      <Grid container spacing={3}>
        {/* Immediate Actions */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent sx={{ bgcolor: 'error.light' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'error.dark' }}>
                Immediate Actions (0-24 hours)
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline /></ListItemIcon>
                  <ListItemText
                    primary="1. Equipment Recalibration"
                    secondary="Recalibrate tablet press to manufacturer specifications. Verify with certified weights. Status: COMPLETE ✅"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline /></ListItemIcon>
                  <ListItemText
                    primary="2. Disposition of Affected Lots"
                    secondary="Review subgroups 18-23 (3,000 tablets). All within individual specifications - approved for release with enhanced testing."
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline /></ListItemIcon>
                  <ListItemText
                    primary="3. Enhanced Monitoring"
                    secondary="Increase sampling frequency to every hour for next 48 hours to verify process stability."
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Short-Term Actions */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent sx={{ bgcolor: 'warning.light' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'warning.dark' }}>
                Short-Term Actions (1-4 weeks)
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><Science /></ListItemIcon>
                  <ListItemText
                    primary="1. Process Capability Study"
                    secondary="Conduct full Cp/Cpk analysis to quantify process capability. Target: Cpk ≥ 1.33 (4σ quality)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Factory /></ListItemIcon>
                  <ListItemText
                    primary="2. Preventive Maintenance Review"
                    secondary="Audit all PM schedules. Implement hard stops for overdue calibrations in CMMS system."
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><TrendingUp /></ListItemIcon>
                  <ListItemText
                    primary="3. Operator Training"
                    secondary="Retrain production staff on SPC interpretation, calibration importance, and escalation procedures."
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Long-Term Strategic Actions */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent sx={{ bgcolor: 'success.light' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'success.dark' }}>
                Long-Term Strategic Initiatives (1-6 months)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Technological Upgrades
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Automated SPC Software"
                        secondary="Implement real-time SPC dashboard with automated alerts (Investment: $25K)"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="In-Line Weight Sensors"
                        secondary="Install continuous monitoring system on tablet press (Investment: $75K, Expected ROI: 18 months)"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="CMMS Integration"
                        secondary="Link SPC system to CMMS for predictive maintenance alerts"
                      />
                    </ListItem>
                  </List>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Process Improvements
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Weekly Calibration Protocol"
                        secondary="Mandate weekly press calibration checks (currently monthly)"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Control Plan Revision"
                        secondary="Update control plan to include X̄-R charts as primary release criterion"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Statistical Training Program"
                        secondary="Develop comprehensive SPC certification for all QC/production staff"
                      />
                    </ListItem>
                  </List>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Compliance & Documentation
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="FDA Response Documentation"
                        secondary="Prepare complete CAPA report for FDA warning letter response"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Annual Product Review"
                        secondary="Include SPC trend analysis in annual product quality review (APQR)"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Change Control"
                        secondary="Document all process changes through formal change control system"
                      />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* BUSINESS IMPACT VISUALIZATION */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: 'success.light' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'success.dark' }}>
              💰 Business Impact: SPC Monitoring ROI
            </Typography>

            <Typography variant="body2" paragraph color="text.secondary">
              Visualizing the financial value of real-time SPC monitoring vs. traditional end-of-batch inspection.
            </Typography>

            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={[
                  { category: 'Without SPC\n(Reactive)', cost: 150, color: '#f44336', label: '$150K Loss', description: 'Batch rejections at final QC' },
                  { category: 'With SPC\n(Proactive)', cost: 10, color: '#4caf50', label: '$10K CAPA', description: 'Real-time detection & correction' },
                  { category: 'Net Savings', cost: 140, color: '#2196f3', label: '$140K Saved', description: 'Annual cost avoidance' }
                ]}
                margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 11 }}
                  interval={0}
                />
                <YAxis
                  label={{ value: 'Annual Cost ($K)', angle: -90, position: 'insideLeft', style: { fontWeight: 600 } }}
                  tick={{ fontSize: 12 }}
                  domain={[0, 160]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <Paper elevation={4} sx={{ p: 2, bgcolor: 'white', border: `2px solid ${data.color}` }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: data.color }}>
                            {data.category.replace('\n', ' ')}
                          </Typography>
                          <Divider sx={{ my: 0.5 }} />
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            <strong>Cost:</strong> ${data.cost}K/year
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary' }}>
                            {data.description}
                          </Typography>
                        </Paper>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="cost" radius={[10, 10, 0, 0]}>
                  {[
                    { category: 'Without SPC\n(Reactive)', cost: 150, color: '#f44336' },
                    { category: 'With SPC\n(Proactive)', cost: 10, color: '#4caf50' },
                    { category: 'Net Savings', cost: 140, color: '#2196f3' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} md={4}>
                <Alert severity="error">
                  <Typography variant="body2" sx={{ fontSize: 11 }}>
                    <strong>Without SPC:</strong> $150K/year in batch rejections (3 batches × $50K) + FDA warning letter escalation risk.
                  </Typography>
                </Alert>
              </Grid>
              <Grid item xs={12} md={4}>
                <Alert severity="success">
                  <Typography variant="body2" sx={{ fontSize: 11 }}>
                    <strong>With SPC:</strong> $10K CAPA implementation cost. Zero batch rejections through proactive intervention.
                  </Typography>
                </Alert>
              </Grid>
              <Grid item xs={12} md={4}>
                <Alert severity="info">
                  <Typography variant="body2" sx={{ fontSize: 11 }}>
                    <strong>ROI:</strong> 1,400% return on investment. Payback period: &lt;1 month. Prevention beats detection!
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Financial Analysis */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Financial Impact & ROI Analysis (Detailed Breakdown)
            </Typography>

            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Category</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Cost Avoidance</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Investment Required</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Net Benefit</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ROI</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell><strong>Batch Rejections Prevented</strong></TableCell>
                  <TableCell>$150,000/year (3 batches × $50K)</TableCell>
                  <TableCell>$0 (SPC already implemented)</TableCell>
                  <TableCell>$150,000/year</TableCell>
                  <TableCell>Infinite (no cost)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>FDA Compliance Maintained</strong></TableCell>
                  <TableCell>$500,000+ (avoided consent decree)</TableCell>
                  <TableCell>$10,000 (CAPA implementation)</TableCell>
                  <TableCell>$490,000</TableCell>
                  <TableCell>4,900%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Technology Upgrades (Recommended)</strong></TableCell>
                  <TableCell>$200,000/year (efficiency gains)</TableCell>
                  <TableCell>$100,000 (automated SPC + sensors)</TableCell>
                  <TableCell>$100,000/year net</TableCell>
                  <TableCell>200% annually</TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: 'success.light' }}>
                  <TableCell><strong>TOTAL</strong></TableCell>
                  <TableCell><strong>$850,000+/year</strong></TableCell>
                  <TableCell><strong>$110,000</strong></TableCell>
                  <TableCell><strong>$740,000/year</strong></TableCell>
                  <TableCell><strong>673%</strong></TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                <strong>Bottom Line:</strong> Every $1 invested in SPC monitoring and process control
                returns $6.73 in cost avoidance and efficiency gains. Payback period: 2 months.
              </Typography>
            </Alert>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  // SECTION 7: Key Takeaways
  const keyTakeaways = (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Key Takeaways: Lessons Learned
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary" sx={{ fontWeight: 600 }}>
                Statistical Lessons
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                  <ListItemText
                    primary="1. X̄-R Charts Detect Both Location & Dispersion Issues"
                    secondary="Monitoring both mean (X̄) and range (R) provides complete process understanding. This case showed a shift in location (mean) while dispersion remained constant."
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                  <ListItemText
                    primary="2. Baseline Period Selection is Critical"
                    secondary="Using stable data (subgroups 1-17) to establish control limits ensures accurate detection of special causes. Including out-of-control data would mask problems."
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                  <ListItemText
                    primary="3. Statistical Significance ≠ Practical Significance"
                    secondary="The 2.7mg shift was statistically significant (3σ+) but still within individual unit specs (±10%). Understanding both perspectives is essential."
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                  <ListItemText
                    primary="4. Rational Subgrouping Enables Effective Detection"
                    secondary="Grouping 5 consecutive tablets every 2 hours provided optimal balance between sensitivity and practicality for detecting process shifts."
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary" sx={{ fontWeight: 600 }}>
                Business & Regulatory Lessons
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                  <ListItemText
                    primary="5. Real-Time SPC Prevents Costly Failures"
                    secondary="Early detection (2 hours vs. days) prevented $50K+ batch loss and regulatory escalation. Prevention >> Detection at final QC."
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                  <ListItemText
                    primary="6. Root Cause Investigation Must Be Systematic"
                    secondary="Following FDA OOS investigation guidelines led to definitive root cause identification in 90 minutes. Disciplined methodology is essential."
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                  <ListItemText
                    primary="7. Preventive Maintenance is Non-Negotiable"
                    secondary="Delayed calibration (2 weeks) caused the problem. In regulated manufacturing, PM schedules must have hard enforcement."
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                  <ListItemText
                    primary="8. Data-Driven Decisions Enable FDA Compliance"
                    secondary="Statistical evidence supported disposition decision (release with enhanced testing). FDA values objective, quantitative justifications."
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Practical Implementation Guidance */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: 'info.light' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Practical Implementation Guidance
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  For Quality Managers:
                </Typography>
                <Typography variant="body2" paragraph>
                  • Implement SPC as first-line monitoring, not just final inspection<br />
                  • Ensure QC staff understand statistical principles, not just charting mechanics<br />
                  • Establish clear escalation procedures for out-of-control signals<br />
                  • Integrate SPC data into management review and APQR<br />
                  • Calculate and communicate ROI to justify technology investments
                </Typography>
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  For Manufacturing Engineers:
                </Typography>
                <Typography variant="body2" paragraph>
                  • Design rational subgrouping strategy based on process knowledge<br />
                  • Link SPC alerts to CMMS for automated maintenance triggers<br />
                  • Validate that measurement system Gage R&R {'<'} 10% before implementing SPC<br />
                  • Document control plan with clear sampling, measurement, and response protocols<br />
                  • Train operators on SPC interpretation and response procedures
                </Typography>
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  For Regulatory Affairs:
                </Typography>
                <Typography variant="body2" paragraph>
                  • Include SPC implementation in Process Validation Protocol (Stage 2)<br />
                  • Document SPC as ongoing process verification (Stage 3, Continued Process Verification)<br />
                  • Maintain SPC records per FDA 21 CFR 211.180(e) - minimum 1 year<br />
                  • Use SPC trend data in Annual Product Reviews (APR/APQR)<br />
                  • Prepare SPC evidence for regulatory inspections and submissions
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Final Message */}
        <Grid item xs={12}>
          <Alert severity="success" icon={<LightbulbOutlined />}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Final Takeaway: X̄-R Charts are More Than Quality Tools
            </Typography>
            <Typography variant="body1">
              This case study demonstrates that X̄-R control charts are strategic business tools that:
              (1) prevent costly quality failures, (2) enable FDA compliance, (3) provide objective
              evidence for data-driven decisions, and (4) generate substantial ROI (600%+ in this case).
              For pharmaceutical manufacturing and other regulated industries, SPC is not optional—it's
              a business necessity and regulatory expectation.
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <CaseStudyTemplate
      title="Pharmaceutical Tablet Weight Control"
      industry="Pharmaceutical Manufacturing (FDA Regulated)"
      metadata={{
        difficulty: 'Intermediate',
        timeToComplete: '45-60 minutes',
        topics: ['X̄-R Charts', 'FDA Compliance', 'Process Monitoring', 'Special Cause Investigation']
      }}
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

export default PharmaceuticalTabletCase;
