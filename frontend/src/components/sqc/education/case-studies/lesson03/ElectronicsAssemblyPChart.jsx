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
  TrendingDown,
  ShowChart,
  Psychology,
  BuildCircle,
  School,
  MonetizationOn
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
  PieChart,
  Pie,
  Sector
} from 'recharts';
import { CaseStudyTemplate } from '../components/CaseStudyTemplate';
import { useSQCAnalysisAPI } from '../../../hooks/useSQCAnalysisAPI';

/**
 * Case Study: Electronics PCB Assembly Defect Monitoring (p-Chart)
 *
 * Industry: Electronics Manufacturing (IPC-A-610 Class 2)
 * Problem: Rising defect rates after production expansion
 * Technique: Attribute Control Chart (p-Chart for proportion defective)
 * Dataset: 30 daily samples with varying inspection sizes (50-200 boards/day)
 *
 * Learning Objectives:
 * - Understand attribute control charts vs. variables charts
 * - Learn p-chart construction with variable sample sizes
 * - Identify trends and patterns in proportion data
 * - Distinguish training issues from equipment problems
 * - Apply root cause analysis to attribute data
 */

const ElectronicsAssemblyPChart = ({ onComplete }) => {
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const [backendResults, setBackendResults] = useState(null);

  const { attributesControlChart } = useSQCAnalysisAPI();

  // ============================================================================
  // REALISTIC DATASET: PCB Assembly Defects (30 Days, Variable Sample Sizes)
  // ============================================================================
  const pcbDefectData = useMemo(() => {
    // TechBoard Solutions - PCB Assembly for Consumer Electronics
    // Period: 30 consecutive production days after Line 3 & 4 expansion
    //
    // BASELINE (Days 1-10): Established 2-line operation (experienced operators)
    // TRANSITION (Days 11-20): Lines 3-4 ramp-up (new operators, training in progress)
    // CRISIS (Days 21-30): Defect rate escalation (training gap exposed)
    //
    // SPECIAL CAUSE: New operators on Lines 3-4 lack proper training
    // - Days 1-10: ~2% baseline defect rate (normal)
    // - Days 11-20: ~3-4% defect rate (new operators, supervision present)
    // - Days 21-30: ~5-7% defect rate (supervision reduced, training gap evident)

    const data = [
      // === PHASE 1: BASELINE (Days 1-10) - Experienced Operators Only ===
      { day: 1, date: '2025-01-01', inspected: 120, defective: 2, line: '1-2', operators: 'Experienced', shift: '1st' },
      { day: 2, date: '2025-01-02', inspected: 135, defective: 3, line: '1-2', operators: 'Experienced', shift: '1st' },
      { day: 3, date: '2025-01-03', inspected: 115, defective: 2, line: '1-2', operators: 'Experienced', shift: '2nd' },
      { day: 4, date: '2025-01-04', inspected: 125, defective: 3, line: '1-2', operators: 'Experienced', shift: '1st' },
      { day: 5, date: '2025-01-05', inspected: 140, defective: 3, line: '1-2', operators: 'Experienced', shift: '1st' },
      { day: 6, date: '2025-01-06', inspected: 130, defective: 2, line: '1-2', operators: 'Experienced', shift: '2nd' },
      { day: 7, date: '2025-01-07', inspected: 145, defective: 4, line: '1-2', operators: 'Experienced', shift: '1st' },
      { day: 8, date: '2025-01-08', inspected: 125, defective: 2, line: '1-2', operators: 'Experienced', shift: '2nd' },
      { day: 9, date: '2025-01-09', inspected: 150, defective: 3, line: '1-2', operators: 'Experienced', shift: '1st' },
      { day: 10, date: '2025-01-10', inspected: 135, defective: 3, line: '1-2', operators: 'Experienced', shift: '1st' },

      // === PHASE 2: TRANSITION (Days 11-20) - Lines 3-4 Ramp-Up ===
      { day: 11, date: '2025-01-11', inspected: 160, defective: 5, line: '1-4', operators: 'Mixed', shift: '1st' },
      { day: 12, date: '2025-01-12', inspected: 170, defective: 6, line: '1-4', operators: 'Mixed', shift: '1st' },
      { day: 13, date: '2025-01-13', inspected: 155, defective: 5, line: '1-4', operators: 'Mixed', shift: '2nd' },
      { day: 14, date: '2025-01-14', inspected: 175, defective: 7, line: '1-4', operators: 'Mixed', shift: '1st' },
      { day: 15, date: '2025-01-15', inspected: 180, defective: 7, line: '1-4', operators: 'Mixed', shift: '1st' },
      { day: 16, date: '2025-01-16', inspected: 165, defective: 6, line: '1-4', operators: 'Mixed', shift: '2nd' },
      { day: 17, date: '2025-01-17', inspected: 185, defective: 8, line: '1-4', operators: 'Mixed', shift: '1st' },
      { day: 18, date: '2025-01-18', inspected: 170, defective: 7, line: '1-4', operators: 'Mixed', shift: '2nd' },
      { day: 19, date: '2025-01-19', inspected: 190, defective: 8, line: '1-4', operators: 'Mixed', shift: '1st' },
      { day: 20, date: '2025-01-20', inspected: 175, defective: 7, line: '1-4', operators: 'Mixed', shift: '1st' },

      // === PHASE 3: CRISIS (Days 21-30) - Training Gap Exposed ===
      { day: 21, date: '2025-01-21', inspected: 195, defective: 10, line: '1-4', operators: 'Mixed', shift: '1st' },
      { day: 22, date: '2025-01-22', inspected: 200, defective: 12, line: '1-4', operators: 'Mixed', shift: '1st' },
      { day: 23, date: '2025-01-23', inspected: 185, defective: 11, line: '1-4', operators: 'Mixed', shift: '2nd' },
      { day: 24, date: '2025-01-24', inspected: 190, defective: 13, line: '1-4', operators: 'Mixed', shift: '1st' },
      { day: 25, date: '2025-01-25', inspected: 200, defective: 14, line: '1-4', operators: 'Mixed', shift: '1st' },
      { day: 26, date: '2025-01-26', inspected: 180, defective: 12, line: '1-4', operators: 'Mixed', shift: '2nd' },
      { day: 27, date: '2025-01-27', inspected: 195, defective: 13, line: '1-4', operators: 'Mixed', shift: '1st' },
      { day: 28, date: '2025-01-28', inspected: 185, defective: 12, line: '1-4', operators: 'Mixed', shift: '2nd' },
      { day: 29, date: '2025-01-29', inspected: 200, defective: 14, line: '1-4', operators: 'Mixed', shift: '1st' },
      { day: 30, date: '2025-01-30', inspected: 190, defective: 13, line: '1-4', operators: 'Mixed', shift: '1st' }
    ];

    // Calculate proportion defective for each day
    return data.map(row => ({
      ...row,
      proportion: row.defective / row.inspected,
      percentDefective: ((row.defective / row.inspected) * 100).toFixed(2)
    }));
  }, []);

  // Calculate p-chart statistics
  const pChartStats = useMemo(() => {
    const totalInspected = pcbDefectData.reduce((sum, row) => sum + row.inspected, 0);
    const totalDefective = pcbDefectData.reduce((sum, row) => sum + row.defective, 0);
    const pBar = totalDefective / totalInspected; // Average proportion defective
    const avgSampleSize = totalInspected / pcbDefectData.length;

    // Calculate control limits (variable limits for each sample based on sample size)
    const dataWithLimits = pcbDefectData.map(row => {
      const n = row.inspected;
      const se = Math.sqrt((pBar * (1 - pBar)) / n); // Standard error of proportion
      const ucl = pBar + 3 * se;
      const lcl = Math.max(0, pBar - 3 * se); // LCL cannot be negative

      return {
        ...row,
        pBar,
        ucl,
        lcl,
        outOfControl: row.proportion > ucl || row.proportion < lcl
      };
    });

    // Detect trends (8 consecutive points above/below center line)
    const trendAnalysis = {
      hasUpwardTrend: false,
      trendStartDay: null,
      consecutiveAboveCL: 0
    };

    let consecutiveAbove = 0;
    for (let i = 0; i < dataWithLimits.length; i++) {
      if (dataWithLimits[i].proportion > pBar) {
        consecutiveAbove++;
        if (consecutiveAbove >= 8 && !trendAnalysis.hasUpwardTrend) {
          trendAnalysis.hasUpwardTrend = true;
          trendAnalysis.trendStartDay = dataWithLimits[i - 7].day;
          trendAnalysis.consecutiveAboveCL = consecutiveAbove;
        }
      } else {
        consecutiveAbove = 0;
      }
    }

    return {
      pBar,
      totalInspected,
      totalDefective,
      avgSampleSize,
      dataWithLimits,
      trendAnalysis,
      outOfControlCount: dataWithLimits.filter(d => d.outOfControl).length
    };
  }, [pcbDefectData]);

  // ============================================================================
  // SECTION 1: PROBLEM STATEMENT
  // ============================================================================
  const problemStatement = (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
        Business Context: Production Expansion Crisis
      </Typography>

      <Paper elevation={2} sx={{ p: 3, bgcolor: 'error.light', mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'error.dark' }}>
              <WarningAmber sx={{ mr: 1, verticalAlign: 'middle' }} />
              QUALITY CRISIS: Rising Defect Rates Threatening Customer Relationships
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body1" paragraph>
              <strong>Company:</strong> TechBoard Solutions, Inc.
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Industry:</strong> Electronics Manufacturing (PCB Assembly)
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Certification:</strong> ISO 9001:2015, IPC-A-610 Class 2 (Consumer Electronics)
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body1" paragraph>
              <strong>Production Volume:</strong> 200+ boards/day (target)
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Defect Rate (Current):</strong> 5-7% (up from 2% baseline)
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Annual Cost of Poor Quality:</strong> $500,000+ (rework, returns, warranty)
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
        The Situation
      </Typography>
      <Typography variant="body1" paragraph>
        TechBoard Solutions successfully operated 2 PCB assembly lines for 5 years with a stable
        defect rate of approximately 2%. To meet growing demand, management expanded to 4 production
        lines over 6 months, doubling capacity. However, quality metrics tell a troubling story:
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ bgcolor: 'success.light', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.dark' }}>
                Phase 1: Baseline
              </Typography>
              <Typography variant="body2" paragraph sx={{ mt: 1 }}>
                <strong>Days 1-10</strong>
              </Typography>
              <Typography variant="body2" paragraph>
                Lines 1-2 (experienced operators only)
              </Typography>
              <Typography variant="h4" sx={{ color: 'success.dark', fontWeight: 700 }}>
                ~2%
              </Typography>
              <Typography variant="body2">
                Defect Rate (Stable)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ bgcolor: 'warning.light', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.dark' }}>
                Phase 2: Transition
              </Typography>
              <Typography variant="body2" paragraph sx={{ mt: 1 }}>
                <strong>Days 11-20</strong>
              </Typography>
              <Typography variant="body2" paragraph>
                Lines 1-4 ramp-up (mixed experience)
              </Typography>
              <Typography variant="h4" sx={{ color: 'warning.dark', fontWeight: 700 }}>
                ~4%
              </Typography>
              <Typography variant="body2">
                Defect Rate (Rising)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ bgcolor: 'error.light', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'error.dark' }}>
                Phase 3: Crisis
              </Typography>
              <Typography variant="body2" paragraph sx={{ mt: 1 }}>
                <strong>Days 21-30</strong>
              </Typography>
              <Typography variant="body2" paragraph>
                Full production (training gap exposed)
              </Typography>
              <Typography variant="h4" sx={{ color: 'error.dark', fontWeight: 700 }}>
                ~7%
              </Typography>
              <Typography variant="body2">
                Defect Rate (Crisis)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
        Business Impact
      </Typography>
      <List>
        <ListItem>
          <ListItemIcon><MonetizationOn color="error" /></ListItemIcon>
          <ListItemText
            primary="Rework Costs: $350,000/year"
            secondary="7% defect rate × 50,000 boards/year × $100/board rework = $350K"
          />
        </ListItem>
        <ListItem>
          <ListItemIcon><MonetizationOn color="error" /></ListItemIcon>
          <ListItemText
            primary="Warranty Returns: $120,000/year"
            secondary="Field failures from escaped defects (solder joint failures, component issues)"
          />
        </ListItem>
        <ListItem>
          <ListItemIcon><MonetizationOn color="error" /></ListItemIcon>
          <ListItemText
            primary="Customer Complaints: 3 major accounts at risk"
            secondary="Consumer electronics OEMs threatening to switch suppliers"
          />
        </ListItem>
        <ListItem>
          <ListItemIcon><WarningAmber color="error" /></ListItemIcon>
          <ListItemText
            primary="Reputation Damage: ISO 9001 certification at risk"
            secondary="Surveillance audit in 60 days - rising defect trend will trigger findings"
          />
        </ListItem>
      </List>

      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
        Common Defect Types (IPC-A-610 Class 2 Violations)
      </Typography>
      <TableContainer component={Paper} elevation={2} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'primary.light' }}>
            <TableRow>
              <TableCell><strong>Defect Type</strong></TableCell>
              <TableCell><strong>% of Total Defects</strong></TableCell>
              <TableCell><strong>Root Cause (Suspected)</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Cold Solder Joints</TableCell>
              <TableCell>45%</TableCell>
              <TableCell>Insufficient soldering iron dwell time (training issue)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Component Misalignment</TableCell>
              <TableCell>30%</TableCell>
              <TableCell>Improper placement technique (training issue)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Solder Bridging</TableCell>
              <TableCell>15%</TableCell>
              <TableCell>Excessive solder application (training issue)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Damaged Components</TableCell>
              <TableCell>10%</TableCell>
              <TableCell>Improper handling (training issue)</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>Key Observation:</strong> All primary defect types point to operator technique issues,
          NOT equipment or material problems. This suggests a systemic training gap rather than random
          variation or equipment malfunction.
        </Typography>
      </Alert>

      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
        Management Question
      </Typography>
      <Paper elevation={3} sx={{ p: 3, bgcolor: 'info.light' }}>
        <Typography variant="body1" sx={{ fontStyle: 'italic', fontWeight: 500 }}>
          "Is the defect rate increase a temporary fluctuation, or is there a systematic problem
          requiring intervention? We need statistical evidence to justify the cost of a comprehensive
          operator certification program ($80,000 investment)."
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          <strong>— Sarah Chen, VP of Quality & Continuous Improvement</strong>
        </Typography>
      </Paper>

      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
        Statistical Challenge
      </Typography>
      <Typography variant="body1" paragraph>
        Unlike the pharmaceutical tablet weight case (variables data: X̄-R charts), PCB defects are
        <strong> attribute data</strong> — each board is classified as "defective" or "conforming"
        (pass/fail). We cannot measure "how much" a board fails, only "whether" it fails.
      </Typography>
      <Typography variant="body1" paragraph>
        Additionally, daily inspection sample sizes vary (50-200 boards) based on production volume,
        requiring <strong>variable control limits</strong> that adjust for each sample size.
      </Typography>

      <Alert severity="warning" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>Why p-Charts?</strong> When monitoring proportion/percentage defective with
          varying sample sizes, p-charts (proportion defective charts) are the appropriate SPC tool.
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
        p-Chart Theory: Statistical Foundations of Proportion Control Charts
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Attribute vs. Variables Data:</strong> Variables data (continuous measurements like
          weight, length) use X̄-R charts. Attribute data (discrete pass/fail classifications) use
          p-charts, np-charts, c-charts, or u-charts depending on the situation.
        </Typography>
      </Alert>

      <Divider sx={{ my: 3 }} />

      {/* Binomial Distribution Foundation */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main' }}>
        1. Binomial Distribution Foundation
      </Typography>
      <Typography variant="body1" paragraph>
        The p-chart is based on the <strong>binomial distribution</strong>, which models the number
        of "successes" (defectives) in a fixed number of independent trials (inspections).
      </Typography>

      <Paper elevation={2} sx={{ p: 3, bgcolor: 'grey.50', mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          Binomial Distribution Parameters
        </Typography>
        <MathJax>
          {`\\[
            X \\sim \\text{Binomial}(n, p)
          \\]`}
        </MathJax>
        <Typography variant="body2" paragraph sx={{ mt: 2 }}>
          <strong>Where:</strong>
        </Typography>
        <List dense>
          <ListItem>
            <MathJax inline>{"\\(n\\)"}</MathJax> = sample size (number of boards inspected)
          </ListItem>
          <ListItem>
            <MathJax inline>{"\\(p\\)"}</MathJax> = true proportion defective (population parameter)
          </ListItem>
          <ListItem>
            <MathJax inline>{"\\(X\\)"}</MathJax> = number of defective boards (random variable)
          </ListItem>
        </List>

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
          Mean and Variance
        </Typography>
        <MathJax>
          {`\\[
            \\begin{aligned}
            E[X] &= np \\\\
            \\text{Var}(X) &= np(1-p)
            \\end{aligned}
          \\]`}
        </MathJax>

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
          Proportion Defective (Sample Statistic)
        </Typography>
        <MathJax>
          {`\\[
            \\hat{p} = \\frac{X}{n} = \\frac{\\text{Number of defectives}}{\\text{Number inspected}}
          \\]`}
        </MathJax>
        <Typography variant="body2" paragraph sx={{ mt: 1 }}>
          <strong>Expected Value and Variance of</strong> <MathJax inline>{"\\(\\hat{p}\\)"}</MathJax>:
        </Typography>
        <MathJax>
          {`\\[
            \\begin{aligned}
            E[\\hat{p}] &= p \\\\
            \\text{Var}(\\hat{p}) &= \\frac{p(1-p)}{n}
            \\end{aligned}
          \\]`}
        </MathJax>
      </Paper>

      <Alert severity="success" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Key Insight:</strong> The variance of <MathJax inline>{"\\(\\hat{p}\\)"}</MathJax> decreases
          as sample size <MathJax inline>{"\\(n\\)"}</MathJax> increases. This is why control limits are
          <strong> tighter</strong> (narrower) for larger samples and <strong>wider</strong> for smaller samples.
        </Typography>
      </Alert>

      <Divider sx={{ my: 3 }} />

      {/* p-Chart Formulas */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main' }}>
        2. p-Chart Control Limits (Variable Limits)
      </Typography>
      <Typography variant="body1" paragraph>
        Since sample sizes vary (n = 50-200 in our case), we calculate <strong>individual control
        limits</strong> for each sample based on its specific sample size.
      </Typography>

      <Paper elevation={2} sx={{ p: 3, bgcolor: 'grey.50', mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          Step 1: Calculate Overall Average Proportion Defective (p̄)
        </Typography>
        <MathJax>
          {`\\[
            \\bar{p} = \\frac{\\sum_{i=1}^{k} d_i}{\\sum_{i=1}^{k} n_i} = \\frac{\\text{Total defectives}}{\\text{Total inspected}}
          \\]`}
        </MathJax>
        <Typography variant="body2" paragraph sx={{ mt: 1 }}>
          <strong>Where:</strong>
        </Typography>
        <List dense>
          <ListItem>
            <MathJax inline>{"\\(k\\)"}</MathJax> = number of samples (30 days in our case)
          </ListItem>
          <ListItem>
            <MathJax inline>{"\\(d_i\\)"}</MathJax> = number of defectives in sample <MathJax inline>{"\\(i\\)"}</MathJax>
          </ListItem>
          <ListItem>
            <MathJax inline>{"\\(n_i\\)"}</MathJax> = sample size of sample <MathJax inline>{"\\(i\\)"}</MathJax>
          </ListItem>
        </List>

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          Step 2: Calculate Standard Error for Each Sample
        </Typography>
        <MathJax>
          {`\\[
            \\sigma_{\\hat{p}_i} = \\sqrt{\\frac{\\bar{p}(1-\\bar{p})}{n_i}}
          \\]`}
        </MathJax>
        <Typography variant="body2" paragraph sx={{ mt: 1 }}>
          This is the standard deviation of the proportion defective for sample <MathJax inline>{"\\(i\\)"}</MathJax> with
          sample size <MathJax inline>{"\\(n_i\\)"}</MathJax>.
        </Typography>

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          Step 3: Calculate Control Limits for Each Sample (±3σ limits)
        </Typography>
        <MathJax>
          {`\\[
            \\begin{aligned}
            \\text{UCL}_i &= \\bar{p} + 3\\sqrt{\\frac{\\bar{p}(1-\\bar{p})}{n_i}} \\\\[10pt]
            \\text{CL} &= \\bar{p} \\\\[10pt]
            \\text{LCL}_i &= \\max\\left(0, \\bar{p} - 3\\sqrt{\\frac{\\bar{p}(1-\\bar{p})}{n_i}}\\right)
            \\end{aligned}
          \\]`}
        </MathJax>
        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
          <strong>Note:</strong> LCL cannot be negative (you can't have a negative proportion),
          so we take max(0, calculated LCL).
        </Typography>
      </Paper>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Variable vs. Constant Control Limits:</strong> If sample sizes are constant
          (all <MathJax inline>{"\\(n_i = n\\)"}</MathJax>), you only need to calculate limits once.
          If sample sizes vary (as in our case), you must calculate limits for each sample. Many
          textbooks show constant limits for simplicity, but real manufacturing often has variable
          sample sizes.
        </Typography>
      </Alert>

      <Divider sx={{ my: 3 }} />

      {/* Sample Size Requirements */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main' }}>
        3. Sample Size Requirements for p-Charts
      </Typography>
      <Typography variant="body1" paragraph>
        For the binomial distribution to be well-approximated by the normal distribution (required
        for ±3σ limits to be valid), we need adequate sample sizes:
      </Typography>

      <Paper elevation={2} sx={{ p: 3, bgcolor: 'grey.50', mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          Rule of Thumb: Sample Size Adequacy
        </Typography>
        <MathJax>
          {`\\[
            \\begin{aligned}
            n\\bar{p} &\\geq 5 \\quad \\text{(Expected number of defectives)} \\\\
            n(1-\\bar{p}) &\\geq 5 \\quad \\text{(Expected number of conforming)}
            \\end{aligned}
          \\]`}
        </MathJax>
        <Typography variant="body2" paragraph sx={{ mt: 2 }}>
          <strong>Our Case:</strong> With <MathJax inline>{"\\(\\bar{p} \\approx 0.045\\)"}</MathJax> (4.5%)
          and minimum sample size n = 50:
        </Typography>
        <MathJax>
          {`\\[
            \\begin{aligned}
            n\\bar{p} &= 50 \\times 0.045 = 2.25 \\quad \\text{(marginal)} \\\\
            n(1-\\bar{p}) &= 50 \\times 0.955 = 47.75 \\quad \\text{(excellent)}
            \\end{aligned}
          \\]`}
        </MathJax>
        <Typography variant="body2" sx={{ mt: 1 }}>
          The first condition is slightly below 5, suggesting we should be cautious with very small
          sample sizes. For most of our data (n &gt; 100), the normal approximation is excellent.
        </Typography>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* Interpretation Rules */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main' }}>
        4. Out-of-Control Conditions for p-Charts
      </Typography>
      <Typography variant="body1" paragraph>
        Similar to variables control charts, we look for evidence of special causes:
      </Typography>

      <TableContainer component={Paper} elevation={2} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'primary.light' }}>
            <TableRow>
              <TableCell><strong>Rule</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
              <TableCell><strong>Interpretation</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><strong>Rule 1</strong></TableCell>
              <TableCell>Any point beyond control limits</TableCell>
              <TableCell>Immediate investigation required (special cause present)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Rule 2</strong></TableCell>
              <TableCell>8+ consecutive points above/below center line</TableCell>
              <TableCell>Sustained shift or trend (training gap, process change)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Rule 3</strong></TableCell>
              <TableCell>6+ consecutive points increasing/decreasing</TableCell>
              <TableCell>Trend detected (gradual deterioration or improvement)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Rule 4</strong></TableCell>
              <TableCell>14+ consecutive points alternating up/down</TableCell>
              <TableCell>Overcontrol or systematic sampling bias</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="success">
        <Typography variant="body2">
          <strong>Our Focus:</strong> We'll primarily use Rules 1 and 2 to detect the training-related
          defect rate increase in the electronics assembly case.
        </Typography>
      </Alert>

      <Divider sx={{ my: 3 }} />

      {/* When to Use p-Charts vs. Other Attribute Charts */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main' }}>
        5. Choosing the Right Attribute Control Chart
      </Typography>
      <Typography variant="body1" paragraph>
        There are four main types of attribute control charts. Choose based on your data structure:
      </Typography>

      <TableContainer component={Paper} elevation={2}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'secondary.light' }}>
            <TableRow>
              <TableCell><strong>Chart Type</strong></TableCell>
              <TableCell><strong>What You're Counting</strong></TableCell>
              <TableCell><strong>Sample Size</strong></TableCell>
              <TableCell><strong>Use When...</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow sx={{ bgcolor: 'warning.light' }}>
              <TableCell><strong>p-Chart</strong></TableCell>
              <TableCell>Proportion defective</TableCell>
              <TableCell>Variable or constant</TableCell>
              <TableCell>You want % defective, sample sizes vary</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>np-Chart</strong></TableCell>
              <TableCell>Number defective</TableCell>
              <TableCell>Constant only</TableCell>
              <TableCell>Sample size is always the same, prefer counts</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>c-Chart</strong></TableCell>
              <TableCell>Number of defects (not units)</TableCell>
              <TableCell>Fixed inspection unit</TableCell>
              <TableCell>Counting defects in a fixed area/volume (e.g., scratches per panel)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>u-Chart</strong></TableCell>
              <TableCell>Defects per unit</TableCell>
              <TableCell>Variable inspection unit</TableCell>
              <TableCell>Counting defects per unit when inspection area varies</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Our Case:</strong> We're monitoring <strong>proportion of defective boards</strong> with
          <strong>varying daily sample sizes</strong> (50-200 boards/day), making the <strong>p-chart</strong> the
          correct choice.
        </Typography>
      </Alert>
    </Box>
  );

  // Backend integration function
  const handleAnalyzeWithBackend = async () => {
    try {
      setBackendLoading(true);
      setBackendError(null);

      // Prepare data for backend API
      const defectives = pcbDefectData.map(d => d.defective);
      const sampleSizes = pcbDefectData.map(d => d.inspected);

      const response = await attributesControlChart({
        defectives: defectives,
        sample_sizes: sampleSizes,
        chart_type: 'p'
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
  // SECTION 3: DATA & METHODOLOGY
  // ============================================================================
  const dataMethodology = (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
        Data Collection and Analysis Methodology
      </Typography>

      <Typography variant="body1" paragraph>
        Following IPC-A-610 inspection standards and ISO 9001 quality management principles, we
        implement a systematic 5-step process to analyze PCB assembly defect trends.
      </Typography>

      {/* 5-Step Methodology */}
      <Paper elevation={2} sx={{ p: 3, bgcolor: 'info.light', mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          5-Step p-Chart Analysis Process
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon><CheckCircleOutline color="primary" /></ListItemIcon>
            <ListItemText
              primary="Step 1: Data Collection"
              secondary="Record daily defective counts and inspection sample sizes for 30 consecutive days"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckCircleOutline color="primary" /></ListItemIcon>
            <ListItemText
              primary="Step 2: Calculate Proportions"
              secondary="Compute proportion defective (p̂) for each day: p̂ = defectives / inspected"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckCircleOutline color="primary" /></ListItemIcon>
            <ListItemText
              primary="Step 3: Calculate Control Limits"
              secondary="Compute p̄ (overall average) and variable control limits for each sample size"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckCircleOutline color="primary" /></ListItemIcon>
            <ListItemText
              primary="Step 4: Plot p-Chart"
              secondary="Visualize proportion defective over time with control limits"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckCircleOutline color="primary" /></ListItemIcon>
            <ListItemText
              primary="Step 5: Interpret Results"
              secondary="Apply control chart rules to identify special causes and trends"
            />
          </ListItem>
        </List>
      </Paper>

      {/* Dataset Overview */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
        Dataset: 30 Days of PCB Assembly Inspection Data
      </Typography>
      <TableContainer component={Paper} elevation={2} sx={{ mb: 3, maxHeight: 400 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.light' }}>
              <TableCell><strong>Day</strong></TableCell>
              <TableCell><strong>Date</strong></TableCell>
              <TableCell align="right"><strong>Inspected (n)</strong></TableCell>
              <TableCell align="right"><strong>Defective (d)</strong></TableCell>
              <TableCell align="right"><strong>Proportion (p̂)</strong></TableCell>
              <TableCell align="right"><strong>% Defective</strong></TableCell>
              <TableCell><strong>Phase</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pcbDefectData.map((row) => (
              <TableRow
                key={row.day}
                sx={{
                  bgcolor: row.day <= 10 ? 'success.light' :
                          row.day <= 20 ? 'warning.light' : 'error.light'
                }}
              >
                <TableCell>{row.day}</TableCell>
                <TableCell>{row.date}</TableCell>
                <TableCell align="right">{row.inspected}</TableCell>
                <TableCell align="right">{row.defective}</TableCell>
                <TableCell align="right">{row.proportion.toFixed(4)}</TableCell>
                <TableCell align="right">{row.percentDefective}%</TableCell>
                <TableCell>
                  <Chip
                    label={row.day <= 10 ? 'Baseline' : row.day <= 20 ? 'Transition' : 'Crisis'}
                    size="small"
                    color={row.day <= 10 ? 'success' : row.day <= 20 ? 'warning' : 'error'}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary Statistics */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
        Summary Statistics
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                {pChartStats.totalInspected.toLocaleString()}
              </Typography>
              <Typography variant="body2">
                Total Boards Inspected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="error" gutterBottom>
                {pChartStats.totalDefective}
              </Typography>
              <Typography variant="body2">
                Total Defective Boards
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="warning.dark" gutterBottom>
                {(pChartStats.pBar * 100).toFixed(2)}%
              </Typography>
              <Typography variant="body2">
                Overall Defect Rate (p̄)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="info.dark" gutterBottom>
                {Math.round(pChartStats.avgSampleSize)}
              </Typography>
              <Typography variant="body2">
                Average Sample Size
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Control Limits Calculations */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
        Control Limits Calculation (Example: Day 1)
      </Typography>
      <Paper elevation={2} sx={{ p: 3, bgcolor: 'grey.50', mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          Given Data for Day 1:
        </Typography>
        <List dense>
          <ListItem>
            Sample size (n₁) = {pcbDefectData[0].inspected} boards
          </ListItem>
          <ListItem>
            Defective boards (d₁) = {pcbDefectData[0].defective}
          </ListItem>
          <ListItem>
            Overall average proportion defective (p̄) = {(pChartStats.pBar * 100).toFixed(2)}% = {pChartStats.pBar.toFixed(4)}
          </ListItem>
        </List>

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
          Step 1: Calculate Standard Error
        </Typography>
        <MathJax>
          {`\\[
            \\begin{aligned}
            \\sigma_{\\hat{p}_1} &= \\sqrt{\\frac{\\bar{p}(1-\\bar{p})}{n_1}} \\\\[8pt]
            &= \\sqrt{\\frac{${pChartStats.pBar.toFixed(4)} \\times ${(1 - pChartStats.pBar).toFixed(4)}}{${pcbDefectData[0].inspected}}} \\\\[8pt]
            &= \\sqrt{\\frac{${(pChartStats.pBar * (1 - pChartStats.pBar)).toFixed(6)}}{${pcbDefectData[0].inspected}}} \\\\[8pt]
            &= ${Math.sqrt((pChartStats.pBar * (1 - pChartStats.pBar)) / pcbDefectData[0].inspected).toFixed(4)}
            \\end{aligned}
          \\]`}
        </MathJax>

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
          Step 2: Calculate Control Limits (±3σ)
        </Typography>
        <MathJax>
          {`\\[
            \\begin{aligned}
            \\text{UCL}_1 &= \\bar{p} + 3\\sigma_{\\hat{p}_1} \\\\[8pt]
            &= ${pChartStats.pBar.toFixed(4)} + 3 \\times ${Math.sqrt((pChartStats.pBar * (1 - pChartStats.pBar)) / pcbDefectData[0].inspected).toFixed(4)} \\\\[8pt]
            &= ${pChartStats.dataWithLimits[0].ucl.toFixed(4)} \\text{ or } ${(pChartStats.dataWithLimits[0].ucl * 100).toFixed(2)}\\% \\\\[12pt]
            \\text{CL} &= \\bar{p} = ${pChartStats.pBar.toFixed(4)} \\text{ or } ${(pChartStats.pBar * 100).toFixed(2)}\\% \\\\[12pt]
            \\text{LCL}_1 &= \\max(0, \\bar{p} - 3\\sigma_{\\hat{p}_1}) \\\\[8pt]
            &= \\max(0, ${pChartStats.pBar.toFixed(4)} - 3 \\times ${Math.sqrt((pChartStats.pBar * (1 - pChartStats.pBar)) / pcbDefectData[0].inspected).toFixed(4)}) \\\\[8pt]
            &= ${pChartStats.dataWithLimits[0].lcl.toFixed(4)} \\text{ or } ${(pChartStats.dataWithLimits[0].lcl * 100).toFixed(2)}\\%
            \\end{aligned}
          \\]`}
        </MathJax>

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
          Step 3: Compare Sample Proportion to Limits
        </Typography>
        <Typography variant="body2" paragraph>
          Sample proportion: p̂₁ = {pcbDefectData[0].defective}/{pcbDefectData[0].inspected} = {pcbDefectData[0].proportion.toFixed(4)} ({pcbDefectData[0].percentDefective}%)
        </Typography>
        <Typography variant="body2" paragraph>
          Since {(pChartStats.dataWithLimits[0].lcl * 100).toFixed(2)}% &lt; {pcbDefectData[0].percentDefective}% &lt; {(pChartStats.dataWithLimits[0].ucl * 100).toFixed(2)}%,
          Day 1 is <strong style={{color: 'green'}}>IN CONTROL</strong> ✅
        </Typography>
      </Paper>

      <Alert severity="info">
        <Typography variant="body2">
          <strong>Note:</strong> Each day has different control limits because sample sizes vary.
          Days with larger samples (n = 200) have tighter limits, while smaller samples (n = 50)
          have wider limits. This accounts for the increased uncertainty with smaller sample sizes.
        </Typography>
      </Alert>

      {/* PRIMARY P-CHART VISUALIZATION */}
      <Paper sx={{ p: 3, mt: 4, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom color="primary" sx={{ fontWeight: 600 }}>
          📊 p-Chart: PCB Assembly Defect Rate Over Time
        </Typography>

        <Typography variant="body2" paragraph color="text.secondary">
          <strong>Interactive p-chart showing:</strong> Proportion defective (%) for each day with variable control limits.
          Hover over data points for detailed information. Color-coding indicates process phases.
        </Typography>

        <ResponsiveContainer width="100%" height={450}>
          <LineChart
            data={pChartStats.dataWithLimits}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="day"
              label={{ value: 'Day Number', position: 'insideBottom', offset: -10, style: { fontWeight: 600 } }}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              label={{ value: 'Proportion Defective (%)', angle: -90, position: 'insideLeft', style: { fontWeight: 600 } }}
              domain={[0, 10]}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <Paper elevation={4} sx={{ p: 2, bgcolor: 'white', border: data.outOfControl ? '2px solid #f44336' : '2px solid #1976d2' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: data.outOfControl ? 'error.main' : 'primary.main' }}>
                        Day {data.day}
                      </Typography>
                      <Divider sx={{ my: 0.5 }} />
                      <Typography variant="body2" sx={{ fontSize: 11 }}>
                        <strong>Date:</strong> {data.date}
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: 11 }}>
                        <strong>Inspected:</strong> {data.inspected} boards
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: 11 }}>
                        <strong>Defective:</strong> {data.defective} boards
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: 11, fontWeight: 600 }}>
                        <strong>Defect Rate:</strong> {data.percentDefective}%
                      </Typography>
                      <Divider sx={{ my: 0.5 }} />
                      <Typography variant="body2" sx={{ fontSize: 10 }}>
                        <strong>UCL:</strong> {(data.ucl * 100).toFixed(2)}%
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: 10 }}>
                        <strong>Center Line (p̄):</strong> {(data.pBar * 100).toFixed(2)}%
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: 10 }}>
                        <strong>LCL:</strong> {(data.lcl * 100).toFixed(2)}%
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: 11, mt: 0.5, fontWeight: 600 }}>
                        <strong>Status:</strong> {data.outOfControl ? '🚨 OUT OF CONTROL' : '✅ In Control'}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block', mt: 0.5 }}>
                        {data.line} • {data.operators} • Shift {data.shift}
                      </Typography>
                    </Paper>
                  );
                }
                return null;
              }}
            />

            {/* Phase Shading */}
            <ReferenceArea x1={1} x2={10} fill="#4caf50" fillOpacity={0.08} label={{ value: 'Baseline', position: 'insideTop', fontSize: 12 }} />
            <ReferenceArea x1={11} x2={20} fill="#ff9800" fillOpacity={0.08} label={{ value: 'Transition', position: 'insideTop', fontSize: 12 }} />
            <ReferenceArea x1={21} x2={30} fill="#f44336" fillOpacity={0.10} label={{ value: 'Crisis', position: 'insideTop', fontSize: 12 }} />

            {/* Center Line (p̄) */}
            <ReferenceLine y={pChartStats.pBar * 100} stroke="#4caf50" strokeWidth={2} strokeDasharray="5 5"
              label={{ value: `p̄ (${(pChartStats.pBar * 100).toFixed(2)}%)`, position: 'right', fill: '#4caf50', fontSize: 11, fontWeight: 600 }} />

            {/* Variable Control Limits - using area to show the envelope */}
            <Line
              type="monotone"
              dataKey={(d) => d.ucl * 100}
              stroke="#f44336"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              name="UCL"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey={(d) => d.lcl * 100}
              stroke="#f44336"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              name="LCL"
              isAnimationActive={false}
            />

            {/* Proportion Defective - Color coded by phase */}
            <Line
              type="monotone"
              dataKey={(d) => d.proportion * 100}
              stroke="#1976d2"
              strokeWidth={3}
              dot={(props) => {
                const { cx, cy, payload } = props;
                const phaseColor = payload.day <= 10 ? '#4caf50' : payload.day <= 20 ? '#ff9800' : '#f44336';
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={payload.outOfControl ? 6 : 5}
                    fill={payload.outOfControl ? '#f44336' : phaseColor}
                    stroke="white"
                    strokeWidth={2}
                  />
                );
              }}
              name="Defect Rate (%)"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>

        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Chart Analysis:</strong> The p-chart reveals a clear upward trend starting Day 11, with defect rates
            climbing from ~2% (baseline) to 5-7% (crisis). Multiple points exceed UCL in the crisis phase (Days 21-30),
            indicating the process is <strong>out of statistical control</strong>. Variable control limits adjust for
            daily sample size differences.
          </Typography>
        </Alert>
      </Paper>
    </Box>
  );

  // ============================================================================
  // SECTION 4: INTERACTIVE SIMULATION
  // ============================================================================
  const interactiveSimulation = (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
        Interactive p-Chart Simulation (Backend Integration)
      </Typography>

      <Typography variant="body1" paragraph>
        Click the button below to analyze the 30-day PCB assembly dataset using the production-grade
        SciPy backend API. The backend will calculate p-chart statistics, control limits, and detect
        out-of-control conditions.
      </Typography>

      <Button
        variant="contained"
        color="primary"
        size="large"
        startIcon={backendLoading ? <CircularProgress size={20} color="inherit" /> : <ShowChart />}
        onClick={handleAnalyzeWithBackend}
        disabled={backendLoading}
        sx={{ mb: 3 }}
      >
        {backendLoading ? 'Analyzing with Backend...' : 'Analyze p-Chart with Backend API'}
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
                    p-Chart Parameters
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Overall Proportion Defective (p̄)"
                        secondary={`${(backendResults.p_bar * 100).toFixed(2)}% (${backendResults.p_bar.toFixed(4)})`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Total Inspected"
                        secondary={backendResults.total_inspected.toLocaleString()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Total Defective"
                        secondary={backendResults.total_defectives}
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
                    Control Chart Status
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Out-of-Control Points"
                        secondary={`${backendResults.out_of_control_count} of 30 samples`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Trend Detected?"
                        secondary={backendResults.trend_detected ? 'YES - Upward trend detected ⚠️' : 'No significant trend'}
                      />
                    </ListItem>
                    {backendResults.trend_start_day && (
                      <ListItem>
                        <ListItemText
                          primary="Trend Start Day"
                          secondary={`Day ${backendResults.trend_start_day}`}
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {backendResults.out_of_control_points && backendResults.out_of_control_points.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Out-of-Control Points Detected:</strong> Days {backendResults.out_of_control_points.join(', ')}
              </Typography>
            </Alert>
          )}
        </Paper>
      )}

      {/* Fallback: Frontend Calculations */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4 }}>
        Comprehensive p-Chart Analysis (Frontend Calculations)
      </Typography>

      <Grid container spacing={3}>
        {/* Control Chart Statistics */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                Control Chart Parameters
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary={`p̄ (Center Line) = ${(pChartStats.pBar * 100).toFixed(2)}%`}
                    secondary={`Overall average proportion defective`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={`Total Inspected: ${pChartStats.totalInspected.toLocaleString()} boards`}
                    secondary={`30 days of production`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={`Total Defective: ${pChartStats.totalDefective} boards`}
                    secondary={`Across all samples`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={`Average Sample Size: ${Math.round(pChartStats.avgSampleSize)} boards/day`}
                    secondary={`Range: 115-200 boards/day`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Out-of-Control Detection */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'error.main' }}>
                Out-of-Control Detection
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    {pChartStats.outOfControlCount > 0 ? <WarningAmber color="error" /> : <CheckCircleOutline color="success" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={`${pChartStats.outOfControlCount} points beyond control limits`}
                    secondary={pChartStats.outOfControlCount > 0 ? 'Special cause variation detected' : 'All points within limits'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    {pChartStats.trendAnalysis.hasUpwardTrend ? <TrendingUp color="error" /> : <TrendingDown color="success" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={pChartStats.trendAnalysis.hasUpwardTrend ? 'Upward trend detected ⚠️' : 'No sustained trend'}
                    secondary={pChartStats.trendAnalysis.hasUpwardTrend
                      ? `${pChartStats.trendAnalysis.consecutiveAboveCL} consecutive points above p̄ starting Day ${pChartStats.trendAnalysis.trendStartDay}`
                      : 'Process exhibiting random variation'}
                  />
                </ListItem>
              </List>

              {pChartStats.trendAnalysis.hasUpwardTrend && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>SPECIAL CAUSE DETECTED:</strong> The sustained upward trend starting
                    Day {pChartStats.trendAnalysis.trendStartDay} indicates a systematic problem
                    requiring root cause investigation. This is NOT random variation.
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Control Limits Table (First 10 Days Sample) */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Control Limits by Day (Sample: Days 1-10)
              </Typography>
              <TableContainer component={Paper} elevation={1}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'grey.200' }}>
                    <TableRow>
                      <TableCell><strong>Day</strong></TableCell>
                      <TableCell align="right"><strong>Sample Size (n)</strong></TableCell>
                      <TableCell align="right"><strong>Defective (d)</strong></TableCell>
                      <TableCell align="right"><strong>p̂ (%)</strong></TableCell>
                      <TableCell align="right"><strong>LCL (%)</strong></TableCell>
                      <TableCell align="right"><strong>CL (%)</strong></TableCell>
                      <TableCell align="right"><strong>UCL (%)</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pChartStats.dataWithLimits.slice(0, 10).map((row) => (
                      <TableRow key={row.day} sx={{ bgcolor: row.outOfControl ? 'error.light' : 'inherit' }}>
                        <TableCell>{row.day}</TableCell>
                        <TableCell align="right">{row.inspected}</TableCell>
                        <TableCell align="right">{row.defective}</TableCell>
                        <TableCell align="right">{row.percentDefective}%</TableCell>
                        <TableCell align="right">{(row.lcl * 100).toFixed(2)}%</TableCell>
                        <TableCell align="right">{(row.pBar * 100).toFixed(2)}%</TableCell>
                        <TableCell align="right">{(row.ucl * 100).toFixed(2)}%</TableCell>
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
              <Typography variant="caption" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                Note: Control limits vary by sample size. Larger samples have tighter limits.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Visualization Note:</strong> In a production implementation, this section would
          include an interactive p-chart visualization with plotted points, control limits, and
          annotations for out-of-control conditions. For this educational case study, we focus on
          the numerical analysis and interpretation.
        </Typography>
      </Alert>
    </Box>
  );

  // ============================================================================
  // SECTION 5: PROFESSIONAL INTERPRETATION
  // ============================================================================
  const interpretation = (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
        Professional Interpretation: Statistical + Business Analysis
      </Typography>

      <Typography variant="body1" paragraph>
        The p-chart analysis reveals compelling statistical evidence of a systematic quality problem
        requiring immediate intervention. Let's examine both the statistical and business implications.
      </Typography>

      <Divider sx={{ my: 3 }} />

      {/* Statistical Interpretation */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main' }}>
        1. Statistical Interpretation
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%', bgcolor: 'info.light' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'info.dark' }}>
                <Psychology sx={{ mr: 1, verticalAlign: 'middle' }} />
                Process Stability Assessment
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Overall Defect Rate: 4.5%"
                    secondary={`Baseline was 2% → 125% increase over 30 days`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Upward Trend Detected"
                    secondary={`${pChartStats.trendAnalysis.consecutiveAboveCL}+ consecutive points above center line starting Day ${pChartStats.trendAnalysis.trendStartDay}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Special Cause Variation"
                    secondary="Process is NOT in statistical control - systematic issue present"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%', bgcolor: 'warning.light' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'warning.dark' }}>
                <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
                Three-Phase Pattern Analysis
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Phase 1 (Days 1-10): Stable Baseline"
                    secondary="~2% defect rate, process in control"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Phase 2 (Days 11-20): Transition"
                    secondary="~4% defect rate, new lines ramp-up"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Phase 3 (Days 21-30): Crisis"
                    secondary="~7% defect rate, training gap exposed"
                  />
                </ListItem>
              </List>
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  The defect rate TRIPLED from baseline to crisis phase.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper elevation={2} sx={{ p: 3, bgcolor: 'grey.50', mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          Statistical Evidence: Why This is NOT Random Variation
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
            <ListItemText
              primary="1. Rule 2 Violation: 8+ Consecutive Points Above p̄"
              secondary={`Starting Day ${pChartStats.trendAnalysis.trendStartDay}, we observe ${pChartStats.trendAnalysis.consecutiveAboveCL}+ consecutive points above the center line. In a stable process, this has probability (1/2)^8 = 0.39% — highly unlikely to occur by chance.`}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
            <ListItemText
              primary="2. Systematic Trend Pattern"
              secondary="The defect rate increases in clear phases aligned with production expansion timeline, NOT random fluctuation."
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
            <ListItemText
              primary="3. Correlation with Operational Change"
              secondary="Defect rate increase coincides precisely with Lines 3-4 ramp-up (new operators). This temporal correlation strongly suggests causation."
            />
          </ListItem>
        </List>
      </Paper>

      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main', mt: 3 }}>
        2. Root Cause Analysis
      </Typography>
      <Typography variant="body1" paragraph>
        The data points to a <strong>training gap</strong> as the primary root cause:
      </Typography>

      <TableContainer component={Paper} elevation={2} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'error.light' }}>
            <TableRow>
              <TableCell><strong>Evidence</strong></TableCell>
              <TableCell><strong>Observation</strong></TableCell>
              <TableCell><strong>Conclusion</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><strong>Defect Timing</strong></TableCell>
              <TableCell>Increase starts Day 11 (Lines 3-4 launch)</TableCell>
              <TableCell>New operators are the variable</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Defect Types</strong></TableCell>
              <TableCell>75% cold solder joints + misalignment</TableCell>
              <TableCell>Manual soldering technique issues</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Phase 2 vs 3</strong></TableCell>
              <TableCell>4% → 7% after supervision reduced</TableCell>
              <TableCell>Operators lack independent competency</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Equipment/Materials</strong></TableCell>
              <TableCell>No equipment changes, same suppliers</TableCell>
              <TableCell>Eliminates equipment/material as cause</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Experienced Operators</strong></TableCell>
              <TableCell>Lines 1-2 maintain ~2% baseline</TableCell>
              <TableCell>Process is capable with proper training</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="success" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Root Cause Conclusion:</strong> The problem is NOT the process design, equipment,
          or materials. The problem is <strong>inadequate operator training</strong> for Lines 3-4.
          This is a human factors / training system issue, not a technical process issue.
        </Typography>
      </Alert>

      {/* PARETO CHART OF DEFECT TYPES */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom color="primary" sx={{ fontWeight: 600 }}>
          📊 Pareto Analysis: Defect Type Breakdown
        </Typography>

        <Typography variant="body2" paragraph color="text.secondary">
          Pareto principle: Focus on the "vital few" defect types that account for most quality issues.
          The chart shows defect types sorted by frequency, with cumulative percentage overlay.
        </Typography>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={[
              { type: 'Cold Solder\nJoints', count: 45, cumulative: 45, color: '#f44336' },
              { type: 'Component\nMisalignment', count: 30, cumulative: 75, color: '#ff9800' },
              { type: 'Solder\nBridging', count: 15, cumulative: 90, color: '#ff9800' },
              { type: 'Damaged\nComponents', count: 10, cumulative: 100, color: '#2196f3' }
            ]}
            margin={{ top: 20, right: 50, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="type"
              tick={{ fontSize: 11 }}
              interval={0}
              angle={0}
            />
            <YAxis
              yAxisId="left"
              label={{ value: 'Defect Count (%)', angle: -90, position: 'insideLeft', style: { fontWeight: 600 } }}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{ value: 'Cumulative (%)', angle: 90, position: 'insideRight', style: { fontWeight: 600 } }}
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <Paper elevation={4} sx={{ p: 2, bgcolor: 'white', border: `2px solid ${data.color}` }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: data.color }}>
                        {data.type.replace('\n', ' ')}
                      </Typography>
                      <Divider sx={{ my: 0.5 }} />
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        <strong>Frequency:</strong> {data.count}% of defects
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        <strong>Cumulative:</strong> {data.cumulative}%
                      </Typography>
                    </Paper>
                  );
                }
                return null;
              }}
            />
            <Legend />

            {/* 80% Reference Line (Pareto Principle) */}
            <ReferenceLine yAxisId="right" y={80} stroke="#4caf50" strokeWidth={2} strokeDasharray="5 5"
              label={{ value: '80% Line', position: 'right', fill: '#4caf50', fontSize: 11, fontWeight: 600 }} />

            <Bar yAxisId="left" dataKey="count" name="Defect Frequency (%)" radius={[10, 10, 0, 0]}>
              {[
                { type: 'Cold Solder\nJoints', count: 45, cumulative: 45, color: '#f44336' },
                { type: 'Component\nMisalignment', count: 30, cumulative: 75, color: '#ff9800' },
                { type: 'Solder\nBridging', count: 15, cumulative: 90, color: '#ff9800' },
                { type: 'Damaged\nComponents', count: 10, cumulative: 100, color: '#2196f3' }
              ].map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>

            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              stroke="#2196f3"
              strokeWidth={3}
              dot={{ fill: '#2196f3', r: 5 }}
              name="Cumulative %"
            />
          </BarChart>
        </ResponsiveContainer>

        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Alert severity="error">
              <Typography variant="body2" sx={{ fontSize: 11 }}>
                <strong>Vital Few (75%):</strong> Cold solder joints (45%) + Component misalignment (30%) = 75% of all defects.
                These two issues are directly linked to <strong>manual soldering technique</strong>.
              </Typography>
            </Alert>
          </Grid>
          <Grid item xs={12} md={6}>
            <Alert severity="success">
              <Typography variant="body2" sx={{ fontSize: 11 }}>
                <strong>Training Priority:</strong> Focus operator certification on soldering technique fundamentals
                (iron temperature, dwell time, flux application, component handling). Addressing top 2 defects
                will eliminate 75% of quality issues.
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* Business Interpretation */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main' }}>
        3. Business Impact Analysis
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ bgcolor: 'error.light', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'error.dark' }}>
                <MonetizationOn sx={{ mr: 1, verticalAlign: 'middle' }} />
                Financial Hemorrhage
              </Typography>
              <Typography variant="h4" sx={{ mt: 2, color: 'error.dark', fontWeight: 700 }}>
                $500K+/year
              </Typography>
              <Typography variant="body2" paragraph>
                Cost of Poor Quality
              </Typography>
              <List dense>
                <ListItem>
                  <Typography variant="caption">
                    • Rework: $350K/year
                  </Typography>
                </ListItem>
                <ListItem>
                  <Typography variant="caption">
                    • Warranty: $120K/year
                  </Typography>
                </ListItem>
                <ListItem>
                  <Typography variant="caption">
                    • Scrap: $30K/year
                  </Typography>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ bgcolor: 'warning.light', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.dark' }}>
                <WarningAmber sx={{ mr: 1, verticalAlign: 'middle' }} />
                Customer Risk
              </Typography>
              <Typography variant="h4" sx={{ mt: 2, color: 'warning.dark', fontWeight: 700 }}>
                3 Accounts
              </Typography>
              <Typography variant="body2" paragraph>
                At Risk of Loss
              </Typography>
              <Typography variant="body2">
                Major OEM customers threatening to switch suppliers due to quality issues.
                Combined annual revenue: <strong>$8M</strong>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ bgcolor: 'info.light', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'info.dark' }}>
                <BuildCircle sx={{ mr: 1, verticalAlign: 'middle' }} />
                Certification Risk
              </Typography>
              <Typography variant="h4" sx={{ mt: 2, color: 'info.dark', fontWeight: 700 }}>
                60 Days
              </Typography>
              <Typography variant="body2" paragraph>
                Until ISO Audit
              </Typography>
              <Typography variant="body2">
                Rising defect trend will trigger audit findings. Could jeopardize ISO 9001:2015 certification.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper elevation={3} sx={{ p: 3, bgcolor: 'error.light', mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'error.dark' }}>
          <WarningAmber sx={{ mr: 1, verticalAlign: 'middle' }} />
          Business Crisis: The Full Picture
        </Typography>
        <Typography variant="body1" paragraph>
          <strong>Direct Costs:</strong> $500K/year in rework, scrap, and warranty claims
        </Typography>
        <Typography variant="body1" paragraph>
          <strong>Indirect Costs:</strong> $8M+ revenue at risk from customer loss, certification
          jeopardy affecting ALL customers, competitive positioning damage in electronics market
        </Typography>
        <Typography variant="body1" paragraph>
          <strong>Strategic Impact:</strong> Expansion that was meant to grow the business is
          instead threatening its survival. The company's reputation as a reliable Tier-1 PCB
          assembler is at stake.
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Management Conclusion:</strong> Immediate intervention is not optional — it is
            existential. The statistical evidence provides irrefutable justification for investing
            in a comprehensive operator certification program.
          </Typography>
        </Alert>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* p-Chart vs X̄-R Chart Comparison */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main' }}>
        4. p-Chart vs. Variables Control Charts: Key Differences
      </Typography>
      <Typography variant="body1" paragraph>
        This case demonstrates why attribute control charts (p-charts) are necessary for pass/fail data:
      </Typography>

      <TableContainer component={Paper} elevation={2} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'primary.light' }}>
            <TableRow>
              <TableCell><strong>Aspect</strong></TableCell>
              <TableCell><strong>p-Chart (Attribute Data)</strong></TableCell>
              <TableCell><strong>X̄-R Chart (Variables Data)</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><strong>Data Type</strong></TableCell>
              <TableCell>Pass/Fail, Good/Bad, Conforming/Defective</TableCell>
              <TableCell>Continuous measurements (weight, length, temperature)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Information Content</strong></TableCell>
              <TableCell>Less information (only binary outcome)</TableCell>
              <TableCell>More information (magnitude of deviation)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Sample Size Requirements</strong></TableCell>
              <TableCell>Larger samples needed (np̄ ≥ 5 rule)</TableCell>
              <TableCell>Smaller samples adequate (n = 4-5 typical)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Distribution</strong></TableCell>
              <TableCell>Binomial distribution</TableCell>
              <TableCell>Normal distribution</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Control Limits</strong></TableCell>
              <TableCell>Variable limits if sample size varies</TableCell>
              <TableCell>Constant limits (based on subgroup size)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Sensitivity</strong></TableCell>
              <TableCell>Less sensitive (can miss small shifts)</TableCell>
              <TableCell>More sensitive (detects small shifts)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Cost to Collect Data</strong></TableCell>
              <TableCell>Lower (simple pass/fail inspection)</TableCell>
              <TableCell>Higher (requires measurement equipment)</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="info">
        <Typography variant="body2">
          <strong>When to Use p-Charts:</strong> When you can only classify units as pass/fail
          (like PCB defects), and you want to monitor the proportion defective over time.
          <strong> When to Use X̄-R Charts:</strong> When you have continuous measurement data
          (like tablet weights) and want to monitor both the process average and variation.
        </Typography>
      </Alert>
    </Box>
  );

  // ============================================================================
  // SECTION 6: BUSINESS RECOMMENDATIONS
  // ============================================================================
  const recommendations = (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
        Business Recommendations: Operator Certification Program
      </Typography>

      <Typography variant="body1" paragraph>
        Based on the statistical evidence and root cause analysis, we recommend a comprehensive
        3-phase approach to eliminate the training gap and restore process control.
      </Typography>

      <Divider sx={{ my: 3 }} />

      {/* Phase 1: Emergency Actions */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card elevation={3} sx={{ bgcolor: 'error.light' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'error.dark' }}>
                <WarningAmber sx={{ mr: 1, verticalAlign: 'middle' }} />
                Phase 1: Emergency Containment (Immediate - Week 1)
              </Typography>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                Objective: Stop the bleeding, prevent further customer impact
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline /></ListItemIcon>
                  <ListItemText
                    primary="1. Immediate 100% Inspection for Lines 3-4"
                    secondary="All boards from new operators undergo secondary inspection by experienced operators until defect rate drops below 3%"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline /></ListItemIcon>
                  <ListItemText
                    primary="2. Buddy System Implementation"
                    secondary="Pair each new operator with experienced mentor for 1-on-1 shadowing and immediate corrective feedback"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline /></ListItemIcon>
                  <ListItemText
                    primary="3. Root Cause Documentation"
                    secondary="Conduct 8D problem-solving for each defect type: cold solder joints, misalignment, bridging, component damage"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline /></ListItemIcon>
                  <ListItemText
                    primary="4. Customer Communication"
                    secondary="Proactive notification to 3 at-risk accounts with containment plan and timeline for permanent fix"
                  />
                </ListItem>
              </List>
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Cost:</strong> $25K (2 weeks of 100% inspection labor + mentor overtime)
                  <br /><strong>Timeline:</strong> 1-2 weeks
                  <br /><strong>Expected Result:</strong> Defect rate drops from 7% → 3-4% (containment, not permanent fix)
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Phase 2: Formal Training Program */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card elevation={3} sx={{ bgcolor: 'warning.light' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'warning.dark' }}>
                <School sx={{ mr: 1, verticalAlign: 'middle' }} />
                Phase 2: Formal Operator Certification Program (Weeks 2-8)
              </Typography>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                Objective: Build competency through structured training and assessment
              </Typography>

              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                Program Components:
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline /></ListItemIcon>
                  <ListItemText
                    primary="1. IPC-A-610 Certification Training (40 hours)"
                    secondary="Accredited training on Class 2 electronics assembly standards - industry-recognized certification"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline /></ListItemIcon>
                  <ListItemText
                    primary="2. Hands-On Soldering Technique Workshop (24 hours)"
                    secondary="Instructor-led practice on solder joint formation, proper dwell time, avoiding cold joints and bridging"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline /></ListItemIcon>
                  <ListItemText
                    primary="3. Component Placement & Handling (16 hours)"
                    secondary="ESD safety, proper component orientation, alignment verification, damage prevention"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline /></ListItemIcon>
                  <ListItemText
                    primary="4. Quality Inspection Skills (8 hours)"
                    secondary="Visual inspection criteria, when to ask for help, self-inspection discipline"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline /></ListItemIcon>
                  <ListItemText
                    primary="5. Competency Assessment"
                    secondary="Written exam (80% pass required) + Practical skills test (build 5 boards with <2% defect rate)"
                  />
                </ListItem>
              </List>

              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                Certification Levels:
              </Typography>
              <TableContainer component={Paper} elevation={1} sx={{ mt: 1 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'grey.300' }}>
                    <TableRow>
                      <TableCell><strong>Level</strong></TableCell>
                      <TableCell><strong>Requirements</strong></TableCell>
                      <TableCell><strong>Privileges</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell><strong>Trainee</strong></TableCell>
                      <TableCell>0-40 hours training</TableCell>
                      <TableCell>Must have mentor present, 100% inspection</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'warning.light' }}>
                      <TableCell><strong>Certified Operator</strong></TableCell>
                      <TableCell>88 hours + pass assessment</TableCell>
                      <TableCell>Independent work, standard sampling inspection</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'success.light' }}>
                      <TableCell><strong>Senior Operator</strong></TableCell>
                      <TableCell>Certified + 6 months + &lt;2% defect rate</TableCell>
                      <TableCell>Mentor trainees, lead complex assemblies</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Investment:</strong> $80,000 (training materials, instructor fees, certification exams, labor for 8 operators)
                  <br /><strong>Timeline:</strong> 6-8 weeks
                  <br /><strong>Expected Result:</strong> Defect rate drops to 2% baseline (sustainable)
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Phase 3: Sustaining System */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card elevation={3} sx={{ bgcolor: 'success.light' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'success.dark' }}>
                <CheckCircleOutline sx={{ mr: 1, verticalAlign: 'middle' }} />
                Phase 3: Sustaining System (Ongoing)
              </Typography>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                Objective: Prevent recurrence through systematic controls
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                  <ListItemText
                    primary="1. Real-Time p-Chart SPC Monitoring"
                    secondary="Automated daily defect tracking with alerts when control chart rules violated (8 consecutive points, out-of-control, etc.)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                  <ListItemText
                    primary="2. Annual Recertification Requirement"
                    secondary="All operators must pass annual IPC-A-610 recertification + skills assessment to maintain certification status"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                  <ListItemText
                    primary="3. New Hire Onboarding Protocol"
                    secondary="Formal 88-hour training program becomes MANDATORY before any new operator touches production boards"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                  <ListItemText
                    primary="4. Defect Trend Review (Monthly)"
                    secondary="Quality team reviews p-chart trends monthly, investigates any upward trends before they become crises"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                  <ListItemText
                    primary="5. Skills Refresh Training (Quarterly)"
                    secondary="4-hour refresher workshops on common defect types, new techniques, lessons learned"
                  />
                </ListItem>
              </List>
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Ongoing Cost:</strong> $20K/year (SPC software, recertification, refresher training)
                  <br /><strong>Benefit:</strong> Prevents future $500K/year quality crises, protects $8M+ customer base
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
              <TableCell align="right"><strong>Annual Savings</strong></TableCell>
              <TableCell align="right"><strong>Notes</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><strong>Phase 1: Emergency Containment</strong></TableCell>
              <TableCell align="right">$25,000</TableCell>
              <TableCell align="right">—</TableCell>
              <TableCell>2 weeks of intensive support</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Phase 2: Certification Program</strong></TableCell>
              <TableCell align="right">$80,000</TableCell>
              <TableCell align="right">—</TableCell>
              <TableCell>One-time investment (8 operators)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Phase 3: Sustaining System</strong></TableCell>
              <TableCell align="right">$20,000/year</TableCell>
              <TableCell align="right">—</TableCell>
              <TableCell>Ongoing operational expense</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell><strong>TOTAL INVESTMENT</strong></TableCell>
              <TableCell align="right"><strong>$105,000 initial + $20K/year</strong></TableCell>
              <TableCell align="right">—</TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow sx={{ height: 20 }}>
              <TableCell colSpan={4}></TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Rework Cost Elimination</strong></TableCell>
              <TableCell align="right">—</TableCell>
              <TableCell align="right">$350,000</TableCell>
              <TableCell>7% → 2% defect rate = 71% reduction</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Warranty Claims Reduction</strong></TableCell>
              <TableCell align="right">—</TableCell>
              <TableCell align="right">$120,000</TableCell>
              <TableCell>Fewer escaped defects</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Scrap Reduction</strong></TableCell>
              <TableCell align="right">—</TableCell>
              <TableCell align="right">$30,000</TableCell>
              <TableCell>Irreparable board scrap</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Customer Retention (Risk Avoidance)</strong></TableCell>
              <TableCell align="right">—</TableCell>
              <TableCell align="right">$500,000</TableCell>
              <TableCell>Gross profit from 3 at-risk accounts ($8M revenue × 6% margin)</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'success.light' }}>
              <TableCell><strong>TOTAL ANNUAL SAVINGS</strong></TableCell>
              <TableCell align="right">—</TableCell>
              <TableCell align="right"><strong>$1,000,000/year</strong></TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'success.dark', color: 'white' }}>
              <TableCell sx={{ color: 'white' }}><strong>NET BENEFIT (Year 1)</strong></TableCell>
              <TableCell align="right" sx={{ color: 'white' }}><strong>$105K investment</strong></TableCell>
              <TableCell align="right" sx={{ color: 'white' }}><strong>$1,000K savings</strong></TableCell>
              <TableCell sx={{ color: 'white' }}><strong>ROI: 852% (Payback: 1.3 months)</strong></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* BUSINESS IMPACT ROI VISUALIZATION */}
      <Paper sx={{ p: 3, mt: 3, mb: 3, bgcolor: 'success.light' }}>
        <Typography variant="h6" gutterBottom color="success.dark" sx={{ fontWeight: 600 }}>
          💰 Business Impact: Training Program ROI
        </Typography>

        <Typography variant="body2" paragraph color="text.secondary">
          Visual comparison of certification program investment vs. annual cost savings.
          First-Pass Yield improvement drives massive ROI through defect elimination.
        </Typography>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={[
              { category: 'Total\nInvestment', amount: 105, color: '#f44336', label: '$105K', description: 'One-time certification program' },
              { category: 'Annual\nSavings', amount: 1000, color: '#4caf50', label: '$1.0M', description: 'Recurring annual benefit' },
              { category: 'Net\nBenefit (Y1)', amount: 895, color: '#2196f3', label: '$895K', description: '852% ROI' }
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
              label={{ value: 'Amount ($K)', angle: -90, position: 'insideLeft', style: { fontWeight: 600 } }}
              tick={{ fontSize: 12 }}
              domain={[0, 1100]}
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
                        <strong>Amount:</strong> ${data.amount}K
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
            <Bar dataKey="amount" radius={[10, 10, 0, 0]}>
              {[
                { category: 'Total\nInvestment', amount: 105, color: '#f44336' },
                { category: 'Annual\nSavings', amount: 1000, color: '#4caf50' },
                { category: 'Net\nBenefit (Y1)', amount: 895, color: '#2196f3' }
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
                <strong>Investment:</strong> $105K one-time (Phase 1 emergency + Phase 2 certification program)
              </Typography>
            </Alert>
          </Grid>
          <Grid item xs={12} md={4}>
            <Alert severity="success">
              <Typography variant="body2" sx={{ fontSize: 11 }}>
                <strong>Annual Savings:</strong> $1.0M/year from rework elimination ($350K), warranty reduction ($120K), scrap savings ($30K), and customer retention ($500K)
              </Typography>
            </Alert>
          </Grid>
          <Grid item xs={12} md={4}>
            <Alert severity="info">
              <Typography variant="body2" sx={{ fontSize: 11 }}>
                <strong>Payback Period:</strong> 1.3 months (6 weeks). ROI: 852% in Year 1. First-Pass Yield: 93% → 98%
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      </Paper>

      <Alert severity="success">
        <Typography variant="body2">
          <strong>Financial Conclusion:</strong> The $105,000 investment in operator certification
          pays for itself in <strong>6 weeks</strong> through cost of poor quality elimination alone.
          Adding customer retention value, the ROI exceeds <strong>850%</strong> in Year 1. This is
          one of the highest-ROI quality improvements possible.
        </Typography>
      </Alert>

      <Divider sx={{ my: 3 }} />

      {/* Implementation Timeline */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
        Implementation Timeline (12-Week Program)
      </Typography>
      <TableContainer component={Paper} elevation={2}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'info.light' }}>
            <TableRow>
              <TableCell><strong>Week</strong></TableCell>
              <TableCell><strong>Phase</strong></TableCell>
              <TableCell><strong>Activities</strong></TableCell>
              <TableCell><strong>Expected Defect Rate</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>1-2</TableCell>
              <TableCell>Phase 1 (Containment)</TableCell>
              <TableCell>100% inspection, buddy system, root cause docs</TableCell>
              <TableCell>7% → 4%</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'warning.light' }}>
              <TableCell>3-10</TableCell>
              <TableCell>Phase 2 (Training)</TableCell>
              <TableCell>88-hour certification program, competency assessment</TableCell>
              <TableCell>4% → 2.5%</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'success.light' }}>
              <TableCell>11-12</TableCell>
              <TableCell>Phase 3 (Sustaining)</TableCell>
              <TableCell>SPC monitoring, protocols implementation</TableCell>
              <TableCell>2.5% → 2% (baseline)</TableCell>
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
        Key Takeaways: Lessons for Quality Professionals
      </Typography>

      <Typography variant="body1" paragraph>
        This electronics assembly case study provides eight essential lessons for using attribute
        control charts (p-charts) in manufacturing quality management.
      </Typography>

      <Divider sx={{ my: 3 }} />

      <Grid container spacing={3}>
        {/* Takeaway 1 */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent sx={{ bgcolor: 'info.light' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'info.dark' }}>
                <CheckCircleOutline sx={{ mr: 1, verticalAlign: 'middle' }} />
                1. p-Charts for Attribute Data (Pass/Fail Inspection)
              </Typography>
              <Typography variant="body1" paragraph>
                When you can only classify items as "good" or "bad" (pass/fail, conforming/defective),
                you MUST use attribute control charts, not variables charts.
              </Typography>
              <List dense>
                <ListItem>
                  <Typography variant="body2">
                    <strong>Use p-Charts:</strong> Proportion defective with varying sample sizes
                  </Typography>
                </ListItem>
                <ListItem>
                  <Typography variant="body2">
                    <strong>Use np-Charts:</strong> Number defective with constant sample size
                  </Typography>
                </ListItem>
                <ListItem>
                  <Typography variant="body2">
                    <strong>Use c-Charts:</strong> Count of defects (not defective units) per inspection unit
                  </Typography>
                </ListItem>
                <ListItem>
                  <Typography variant="body2">
                    <strong>Use u-Charts:</strong> Defects per unit with varying inspection areas
                  </Typography>
                </ListItem>
              </List>
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  <strong>Our Case:</strong> PCB boards are pass/fail with varying daily inspection
                  counts (50-200) → p-chart is correct choice.
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
                <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
                2. Variable Control Limits Reflect Sample Size Uncertainty
              </Typography>
              <Typography variant="body1" paragraph>
                When sample sizes vary, you MUST calculate individual control limits for each sample.
              </Typography>
              <MathJax>
                {`\\[
                  \\text{UCL}_i = \\bar{p} + 3\\sqrt{\\frac{\\bar{p}(1-\\bar{p})}{n_i}} \\quad \\text{(wider for small } n_i\\text{, tighter for large } n_i\\text{)}
                \\]`}
              </MathJax>
              <Typography variant="body2" paragraph sx={{ mt: 2 }}>
                <strong>Why?</strong> Smaller samples have more uncertainty (larger standard error),
                so we need wider limits to avoid false alarms. Larger samples have less uncertainty,
                allowing tighter limits for better sensitivity.
              </Typography>
              <Typography variant="body2">
                <strong>Practical Impact:</strong> Day with n=50 has wider limits (±3.0%) than day
                with n=200 has limits (±1.5%). This prevents false positive/negative errors.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Takeaway 3 */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent sx={{ bgcolor: 'error.light' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'error.dark' }}>
                <Psychology sx={{ mr: 1, verticalAlign: 'middle' }} />
                3. Trend Detection: 8+ Consecutive Points Rule
              </Typography>
              <Typography variant="body1" paragraph>
                Rule 2: Eight or more consecutive points above (or below) the center line indicates
                a <strong>systematic shift</strong>, even if no points exceed control limits.
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Statistical Basis:</strong> In a stable process, each point has 50% chance
                of being above/below p̄. Probability of 8 consecutive points on same side = (1/2)^8 = 0.39%.
                This is statistically significant evidence of special cause variation.
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Our Case:</strong> Days 11-30 showed sustained points above p̄, signaling
                the training gap issue before it became a full crisis. Early detection would have
                enabled earlier intervention.
              </Typography>
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  <strong>Lesson:</strong> Don't wait for out-of-control points. Trends are equally
                  important warnings of systematic problems.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Takeaway 4 */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent sx={{ bgcolor: 'success.light' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'success.dark' }}>
                <BuildCircle sx={{ mr: 1, verticalAlign: 'middle' }} />
                4. Attribute Charts Less Sensitive Than Variables Charts
              </Typography>
              <Typography variant="body1" paragraph>
                p-charts provide less information than X̄-R charts because pass/fail data discards
                the magnitude of deviation.
              </Typography>
              <TableContainer component={Paper} elevation={1} sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'grey.200' }}>
                    <TableRow>
                      <TableCell><strong>Chart Type</strong></TableCell>
                      <TableCell><strong>Sample Size Needed</strong></TableCell>
                      <TableCell><strong>Sensitivity</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Variables (X̄-R)</TableCell>
                      <TableCell>n = 4-5 typical</TableCell>
                      <TableCell>Detects 1-2σ shifts</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Attributes (p-chart)</TableCell>
                      <TableCell>n = 50-100+ typical</TableCell>
                      <TableCell>Detects larger shifts only</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="body2" sx={{ mt: 2 }}>
                <strong>Practical Guidance:</strong> Use variables charts whenever you CAN measure
                (weight, length, temperature). Use attribute charts when you CAN'T measure or
                measurement is too expensive (visual defects, functional tests).
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Takeaway 5 */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent sx={{ bgcolor: 'info.light' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'info.dark' }}>
                <School sx={{ mr: 1, verticalAlign: 'middle' }} />
                5. Training Gaps Show Distinctive p-Chart Patterns
              </Typography>
              <Typography variant="body1" paragraph>
                Training-related quality problems have a characteristic signature on p-charts:
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="info" /></ListItemIcon>
                  <ListItemText
                    primary="Correlation with Personnel Changes"
                    secondary="Defect rate increases coincide with new hires, operator rotations, or supervision changes"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="info" /></ListItemIcon>
                  <ListItemText
                    primary="Gradual Upward Trend (Not Sudden Spike)"
                    secondary="Training gaps manifest as sustained trends, not sudden jumps (unlike equipment failures)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="info" /></ListItemIcon>
                  <ListItemText
                    primary="Technique-Related Defect Types"
                    secondary="Cold solder joints, misalignment, improper handling — all human skill issues"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutline color="info" /></ListItemIcon>
                  <ListItemText
                    primary="No Equipment/Material Changes"
                    secondary="Process parameters unchanged, ruling out equipment/material root causes"
                  />
                </ListItem>
              </List>
              <Typography variant="body2" sx={{ mt: 2 }}>
                <strong>Contrast with Equipment Problems:</strong> Equipment failures show sudden
                spikes (single out-of-control point), not gradual trends. They affect all operators
                equally, not just new ones.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Takeaway 6 */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent sx={{ bgcolor: 'warning.light' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'warning.dark' }}>
                <MonetizationOn sx={{ mr: 1, verticalAlign: 'middle' }} />
                6. Training Investments Have Exceptional ROI
              </Typography>
              <Typography variant="body1" paragraph>
                Formal operator certification programs consistently deliver 500%+ ROI in manufacturing:
              </Typography>
              <Typography variant="body2" component="div" paragraph>
                <strong>Our Case:</strong>
                <br />• Investment: $105,000 (one-time) + $20K/year (sustaining)
                <br />• Annual Savings: $1,000,000 (rework + warranty + customer retention)
                <br />• Payback Period: 6 weeks
                <br />• 3-Year Net Benefit: $2.835 million
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Why Such High ROI?</strong> Because training addresses the root cause
                (operator competency), while alternatives (100% inspection, rework, warranty claims)
                only address symptoms. Prevention always beats detection.
              </Typography>
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  <strong>Management Lesson:</strong> Training often feels like an expense, but
                  statistical evidence (p-charts) can quantify the cost of poor training, making
                  the ROI case irrefutable.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Takeaway 7 */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent sx={{ bgcolor: 'error.light' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'error.dark' }}>
                <WarningAmber sx={{ mr: 1, verticalAlign: 'middle' }} />
                7. Expansion Without Training = Quality Crisis
              </Typography>
              <Typography variant="body1" paragraph>
                This case exemplifies a common manufacturing mistake: <strong>scaling production
                capacity without scaling training capacity</strong>.
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>The Trap:</strong> Management sees experienced operators maintaining 2%
                defect rate and assumes new operators can achieve the same "with a little practice."
                They overlook that the 2% rate is the result of years of experience, not beginner competency.
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>The Statistics:</strong> The p-chart provides objective evidence that the
                expansion strategy failed. Without formal training infrastructure, the defect rate
                TRIPLED (2% → 7%), threatening the business.
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Prevention:</strong> Before expanding capacity, establish:
              </Typography>
              <List dense>
                <ListItem>
                  <Typography variant="caption">
                    • Formal training curriculum (88+ hours for electronics assembly)
                  </Typography>
                </ListItem>
                <ListItem>
                  <Typography variant="caption">
                    • Competency assessment (written + practical)
                  </Typography>
                </ListItem>
                <ListItem>
                  <Typography variant="caption">
                    • Certification levels (trainee → certified → senior)
                  </Typography>
                </ListItem>
                <ListItem>
                  <Typography variant="caption">
                    • Real-time SPC monitoring (p-charts with automated alerts)
                  </Typography>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Takeaway 8 */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent sx={{ bgcolor: 'success.light' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'success.dark' }}>
                <CheckCircleOutline sx={{ mr: 1, verticalAlign: 'middle' }} />
                8. SPC is Both Detective AND Preventive
              </Typography>
              <Typography variant="body1" paragraph>
                Statistical Process Control (SPC) serves two critical functions:
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2, bgcolor: 'white' }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Detective Function
                    </Typography>
                    <Typography variant="body2">
                      p-Charts detect problems early (8-point trend rule alerts Day 18) before they
                      become crises (Day 30 customer complaints). This enables faster response and
                      lower containment costs.
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2, bgcolor: 'white' }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Preventive Function
                    </Typography>
                    <Typography variant="body2">
                      Once training is implemented and defect rate returns to 2%, ongoing p-chart
                      monitoring PREVENTS future training gaps. Any future upward trend triggers
                      investigation before it escalates.
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
              <Typography variant="body2" sx={{ mt: 2 }}>
                <strong>Long-Term Value:</strong> The $20K/year sustaining system (Phase 3)
                prevents future $500K/year crises. That's a 2,400% annual ROI on the monitoring
                infrastructure alone.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Final Summary */}
      <Paper elevation={3} sx={{ p: 3, bgcolor: 'primary.light', mt: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.dark' }}>
          Final Summary: The Power of Attribute Control Charts
        </Typography>
        <Typography variant="body1" paragraph>
          This electronics assembly case demonstrates that p-charts are essential tools for:
        </Typography>
        <List>
          <ListItem>
            <Typography variant="body2">
              ✅ Monitoring pass/fail quality metrics when continuous measurement isn't feasible
            </Typography>
          </ListItem>
          <ListItem>
            <Typography variant="body2">
              ✅ Detecting training gaps through trend analysis (8+ consecutive points rule)
            </Typography>
          </ListItem>
          <ListItem>
            <Typography variant="body2">
              ✅ Providing statistical justification for training investments (ROI quantification)
            </Typography>
          </ListItem>
          <ListItem>
            <Typography variant="body2">
              ✅ Preventing future quality crises through ongoing monitoring
            </Typography>
          </ListItem>
        </List>
        <Typography variant="body1" sx={{ mt: 2, fontWeight: 500 }}>
          The $105K investment in operator certification, justified by p-chart statistical evidence,
          saved TechBoard Solutions from a $500K+/year quality crisis and protected an $8M customer
          base. This is SPC in action — transforming data into decisions, and decisions into dollars.
        </Typography>
      </Paper>
    </Box>
  );

  // ============================================================================
  // METADATA
  // ============================================================================
  const metadata = {
    difficulty: 'Intermediate',
    estimatedTime: '45-60 minutes',
    topics: ['Attribute Control Charts', 'p-Charts', 'Binomial Distribution', 'Training Gap Analysis', 'Electronics Manufacturing'],
    prerequisites: ['Understanding of variables control charts (X̄-R)', 'Basic probability (binomial distribution)', 'Control chart interpretation rules'],
    industry: 'Electronics Manufacturing (PCB Assembly)',
    standards: ['IPC-A-610 Class 2', 'ISO 9001:2015']
  };

  // ============================================================================
  // RENDER: Case Study Template
  // ============================================================================
  return (
    <CaseStudyTemplate
      title="Electronics PCB Assembly Defect Monitoring"
      industry="Electronics Manufacturing"
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

export default ElectronicsAssemblyPChart;
