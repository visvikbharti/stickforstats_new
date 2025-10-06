import React, { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Paper,
  Alert,
  Grid,
  Card,
  CardContent,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Chip,
  CircularProgress
} from '@mui/material';
import { MathJax } from 'better-react-mathjax';
import useSQCAnalysisAPI from '../../../../hooks/useSQCAnalysisAPI';

/**
 * Lesson 6: Acceptance Sampling
 *
 * Comprehensive lesson on acceptance sampling plans, OC curves, and quality risks.
 * Topics: Single/double/sequential sampling, AQL, LTPD, producer/consumer risk
 */

const Lesson06_AcceptanceSampling = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);

  // Interactive OC curve parameters
  const [sampleSize, setSampleSize] = useState(50);
  const [acceptanceNumber, setAcceptanceNumber] = useState(2);
  const [aql, setAql] = useState(1.0); // Acceptable Quality Level (%)
  const [ltpd, setLtpd] = useState(5.0); // Lot Tolerance Percent Defective (%)

  // Backend integration state
  const [backendResults, setBackendResults] = useState(null);
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState(null);

  // Initialize API hook
  const { quickAcceptanceSampling } = useSQCAnalysisAPI();

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);
  const handleReset = () => setActiveStep(0);
  const handleComplete = () => {
    if (onComplete) onComplete();
  };

  // Backend API integration
  const handleTestBackendAPI = async () => {
    try {
      setBackendLoading(true);
      setBackendError(null);

      // Call backend API with current parameters
      const response = await quickAcceptanceSampling({
        lot_size: 1000, // Default lot size
        aql: aql,
        ltpd: ltpd,
        producer_risk: 0.05,
        consumer_risk: 0.10
      });

      if (response.status === 'success') {
        setBackendResults(response.data);
      } else {
        setBackendError(response.message || 'Failed to generate sampling plan');
      }
    } catch (error) {
      console.error('Backend API error:', error);
      setBackendError(error.message || 'Failed to connect to backend API');
    } finally {
      setBackendLoading(false);
    }
  };

  // Binomial probability calculation
  const binomialProbability = (n, k, p) => {
    if (k > n || k < 0) return 0;

    // Calculate binomial coefficient C(n,k)
    let coefficient = 1;
    for (let i = 0; i < k; i++) {
      coefficient *= (n - i) / (i + 1);
    }

    return coefficient * Math.pow(p, k) * Math.pow(1 - p, n - k);
  };

  // Operating Characteristic (OC) curve calculation
  const ocCurveData = useMemo(() => {
    const data = [];

    // Calculate probability of acceptance for different lot qualities
    for (let pDefect = 0; pDefect <= 15; pDefect += 0.5) {
      const p = pDefect / 100; // Convert to probability

      // Probability of acceptance = P(X <= c) where X ~ Binomial(n, p)
      let pAccept = 0;
      for (let x = 0; x <= acceptanceNumber; x++) {
        pAccept += binomialProbability(sampleSize, x, p);
      }

      data.push({
        lotQuality: pDefect,
        pAccept: pAccept * 100 // Convert to percentage
      });
    }

    return data;
  }, [sampleSize, acceptanceNumber]);

  // Find probabilities at AQL and LTPD
  const riskMetrics = useMemo(() => {
    const pAql = aql / 100;
    const pLtpd = ltpd / 100;

    // Producer's risk (α): Probability of rejecting good lot at AQL
    let pAcceptAql = 0;
    for (let x = 0; x <= acceptanceNumber; x++) {
      pAcceptAql += binomialProbability(sampleSize, x, pAql);
    }
    const producerRisk = (1 - pAcceptAql) * 100;

    // Consumer's risk (β): Probability of accepting bad lot at LTPD
    let pAcceptLtpd = 0;
    for (let x = 0; x <= acceptanceNumber; x++) {
      pAcceptLtpd += binomialProbability(sampleSize, x, pLtpd);
    }
    const consumerRisk = pAcceptLtpd * 100;

    return {
      producerRisk: producerRisk.toFixed(2),
      consumerRisk: consumerRisk.toFixed(2),
      pAcceptAql: (pAcceptAql * 100).toFixed(2),
      pAcceptLtpd: (consumerRisk).toFixed(2)
    };
  }, [sampleSize, acceptanceNumber, aql, ltpd]);

  // Sample sampling plans (MIL-STD-105E inspired)
  const standardPlans = [
    { lotSize: '50-90', normalInspection: 'n=13, c=0', tightenedInspection: 'n=20, c=0', reducedInspection: 'n=5, c=0' },
    { lotSize: '91-150', normalInspection: 'n=20, c=1', tightenedInspection: 'n=32, c=1', reducedInspection: 'n=8, c=0' },
    { lotSize: '151-280', normalInspection: 'n=32, c=2', tightenedInspection: 'n=50, c=2', reducedInspection: 'n=13, c=0' },
    { lotSize: '281-500', normalInspection: 'n=50, c=3', tightenedInspection: 'n=80, c=3', reducedInspection: 'n=20, c=1' },
    { lotSize: '501-1200', normalInspection: 'n=80, c=5', tightenedInspection: 'n=125, c=5', reducedInspection: 'n=32, c=2' }
  ];

  const steps = [
    {
      label: 'Introduction: Why Acceptance Sampling?',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Making Accept/Reject Decisions on Lots
          </Typography>

          <Typography paragraph>
            <strong>Acceptance sampling</strong> is a statistical quality control technique where you inspect
            a random sample from a lot to decide whether to accept or reject the entire lot. It's used when:
          </Typography>

          <Grid container spacing={2} sx={{ my: 2 }}>
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: '#e3f2fd', height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2', mb: 1 }}>
                    When to Use
                  </Typography>
                  <Typography variant="body2" component="div">
                    • 100% inspection is too costly or time-consuming<br />
                    • Testing is destructive (e.g., crash tests, food tasting)<br />
                    • Large lots from external suppliers<br />
                    • Receiving inspection decisions<br />
                    • Final product auditing
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: '#fff3e0', height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#f57c00', mb: 1 }}>
                    Key Question
                  </Typography>
                  <Typography variant="body2">
                    "Based on finding <strong>d defects</strong> in a sample of <strong>n units</strong>,
                    should we accept or reject a lot of <strong>N units</strong>?"
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ my: 2 }}>
            <strong>Fundamental Trade-off:</strong> Acceptance sampling is <em>less informative</em> than 100%
            inspection but <em>more economical</em>. The goal is to balance inspection costs with the risks
            of accepting bad lots or rejecting good lots.
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600, mt: 3 }}>
            Types of Sampling Plans
          </Typography>

          <TableContainer component={Paper} sx={{ my: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Plan Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Advantage</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell><strong>Single Sampling</strong></TableCell>
                  <TableCell>Take one sample of n units, accept if d ≤ c</TableCell>
                  <TableCell>Simple, easy to administer</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Double Sampling</strong></TableCell>
                  <TableCell>Take first sample; if inconclusive, take second sample</TableCell>
                  <TableCell>Lower average sample size</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Sequential Sampling</strong></TableCell>
                  <TableCell>Inspect one-by-one, decide after each unit</TableCell>
                  <TableCell>Minimum expected sample size</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography paragraph sx={{ mt: 2 }}>
            In this lesson, we'll focus on <strong>single sampling plans</strong>, which are the most common
            and easiest to understand.
          </Typography>
        </Box>
      )
    },
    {
      label: 'Operating Characteristic (OC) Curves',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Understanding the OC Curve
          </Typography>

          <Typography paragraph>
            The <strong>Operating Characteristic (OC) curve</strong> shows the probability of accepting a lot
            for different levels of lot quality. It's the fundamental tool for evaluating sampling plans.
          </Typography>

          <MathJax>
            <Box sx={{ my: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>OC Curve Definition:</strong>
              </Typography>
              <Typography>
                {"\\[P_a(p) = \\sum_{x=0}^{c} \\binom{n}{x} p^x (1-p)^{n-x}\\]"}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                where <em>P<sub>a</sub>(p)</em> = probability of acceptance,{' '}
                <em>p</em> = lot fraction defective,{' '}
                <em>n</em> = sample size,{' '}
                <em>c</em> = acceptance number
              </Typography>
            </Box>
          </MathJax>

          <Alert severity="warning" sx={{ my: 2 }}>
            <strong>Key Insight:</strong> The OC curve shows that <em>no sampling plan is perfect</em>.
            There's always some risk of accepting bad lots or rejecting good lots. The goal is to design
            a plan that keeps these risks acceptably low.
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600, mt: 3 }}>
            Ideal vs. Real OC Curves
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2e7d32', mb: 2 }}>
                    Ideal OC Curve (Perfect Discrimination)
                  </Typography>
                  <svg width="100%" height="200" viewBox="0 0 300 200">
                    {/* Axes */}
                    <line x1="40" y1="160" x2="280" y2="160" stroke="#000" strokeWidth="2" />
                    <line x1="40" y1="20" x2="40" y2="160" stroke="#000" strokeWidth="2" />

                    {/* Ideal OC curve (step function) */}
                    <line x1="40" y1="30" x2="150" y2="30" stroke="#2e7d32" strokeWidth="3" />
                    <line x1="150" y1="30" x2="150" y2="150" stroke="#2e7d32" strokeWidth="3" strokeDasharray="5,5" />
                    <line x1="150" y1="150" x2="280" y2="150" stroke="#2e7d32" strokeWidth="3" />

                    {/* Labels */}
                    <text x="160" y="185" fontSize="12" textAnchor="middle">Lot Quality (% defective)</text>
                    <text x="10" y="95" fontSize="12" textAnchor="middle" transform="rotate(-90, 10, 95)">P(Accept)</text>
                    <text x="95" y="20" fontSize="11" fill="#2e7d32">100%</text>
                    <text x="200" y="145" fontSize="11" fill="#2e7d32">0%</text>
                  </svg>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Perfect plan: accepts all good lots, rejects all bad lots. <strong>Not achievable</strong> with sampling.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2', mb: 2 }}>
                    Real OC Curve (Gradual Transition)
                  </Typography>
                  <svg width="100%" height="200" viewBox="0 0 300 200">
                    {/* Axes */}
                    <line x1="40" y1="160" x2="280" y2="160" stroke="#000" strokeWidth="2" />
                    <line x1="40" y1="20" x2="40" y2="160" stroke="#000" strokeWidth="2" />

                    {/* Real OC curve (smooth S-curve) */}
                    <path d="M 40 30 Q 100 30 150 95 T 280 150" stroke="#1976d2" strokeWidth="3" fill="none" />

                    {/* Risk regions */}
                    <circle cx="80" cy="45" r="3" fill="#ff9800" />
                    <text x="85" y="48" fontSize="10" fill="#ff9800">α risk</text>
                    <circle cx="220" cy="120" r="3" fill="#d32f2f" />
                    <text x="225" y="123" fontSize="10" fill="#d32f2f">β risk</text>

                    {/* Labels */}
                    <text x="160" y="185" fontSize="12" textAnchor="middle">Lot Quality (% defective)</text>
                    <text x="10" y="95" fontSize="12" textAnchor="middle" transform="rotate(-90, 10, 95)">P(Accept)</text>
                  </svg>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Actual plan: gradual transition with producer's risk (α) and consumer's risk (β).
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )
    },
    {
      label: 'Interactive: Build Your Sampling Plan',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Design and Analyze a Sampling Plan
          </Typography>

          <Typography paragraph>
            Adjust the parameters below to see how they affect the Operating Characteristic curve and risks:
          </Typography>

          <Paper sx={{ p: 3, bgcolor: '#fafafa', mb: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography gutterBottom sx={{ fontWeight: 600 }}>
                  Sample Size (n): {sampleSize}
                </Typography>
                <Slider
                  value={sampleSize}
                  onChange={(e, val) => setSampleSize(val)}
                  min={10}
                  max={200}
                  step={5}
                  valueLabelDisplay="auto"
                  marks={[
                    { value: 10, label: '10' },
                    { value: 50, label: '50' },
                    { value: 100, label: '100' },
                    { value: 200, label: '200' }
                  ]}
                />
                <Typography variant="caption" color="text.secondary">
                  Number of units to inspect from the lot
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography gutterBottom sx={{ fontWeight: 600 }}>
                  Acceptance Number (c): {acceptanceNumber}
                </Typography>
                <Slider
                  value={acceptanceNumber}
                  onChange={(e, val) => setAcceptanceNumber(val)}
                  min={0}
                  max={10}
                  step={1}
                  valueLabelDisplay="auto"
                  marks={[
                    { value: 0, label: '0' },
                    { value: 2, label: '2' },
                    { value: 5, label: '5' },
                    { value: 10, label: '10' }
                  ]}
                />
                <Typography variant="caption" color="text.secondary">
                  Maximum defects allowed to accept lot
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography gutterBottom sx={{ fontWeight: 600 }}>
                  AQL (Acceptable Quality Level): {aql.toFixed(1)}%
                </Typography>
                <Slider
                  value={aql}
                  onChange={(e, val) => setAql(val)}
                  min={0.1}
                  max={5.0}
                  step={0.1}
                  valueLabelDisplay="auto"
                  marks={[
                    { value: 0.1, label: '0.1%' },
                    { value: 1.0, label: '1%' },
                    { value: 2.5, label: '2.5%' },
                    { value: 5.0, label: '5%' }
                  ]}
                />
                <Typography variant="caption" color="text.secondary">
                  Quality level considered "good" by producer
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography gutterBottom sx={{ fontWeight: 600 }}>
                  LTPD (Lot Tolerance % Defective): {ltpd.toFixed(1)}%
                </Typography>
                <Slider
                  value={ltpd}
                  onChange={(e, val) => setLtpd(val)}
                  min={1.0}
                  max={15.0}
                  step={0.5}
                  valueLabelDisplay="auto"
                  marks={[
                    { value: 1.0, label: '1%' },
                    { value: 5.0, label: '5%' },
                    { value: 10.0, label: '10%' },
                    { value: 15.0, label: '15%' }
                  ]}
                />
                <Typography variant="caption" color="text.secondary">
                  Quality level considered "unacceptable" by consumer
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* OC Curve Visualization */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1976d2' }}>
              Operating Characteristic (OC) Curve
            </Typography>

            <Box sx={{ width: '100%', overflowX: 'auto' }}>
              <svg width="700" height="350" viewBox="0 0 700 350">
                {/* Grid lines */}
                {Array.from({ length: 11 }).map((_, i) => (
                  <line
                    key={`grid-h-${i}`}
                    x1="60"
                    y1={30 + i * 28}
                    x2="650"
                    y2={30 + i * 28}
                    stroke="#e0e0e0"
                    strokeWidth="1"
                  />
                ))}
                {Array.from({ length: 16 }).map((_, i) => (
                  <line
                    key={`grid-v-${i}`}
                    x1={60 + i * 39.33}
                    y1={30}
                    x2={60 + i * 39.33}
                    y2={310}
                    stroke="#e0e0e0"
                    strokeWidth="1"
                  />
                ))}

                {/* Axes */}
                <line x1="60" y1="310" x2="650" y2="310" stroke="#000" strokeWidth="2" />
                <line x1="60" y1="30" x2="60" y2="310" stroke="#000" strokeWidth="2" />

                {/* OC Curve */}
                <path
                  d={ocCurveData.map((point, idx) => {
                    const x = 60 + (point.lotQuality / 15) * 590;
                    const y = 310 - (point.pAccept / 100) * 280;
                    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  stroke="#1976d2"
                  strokeWidth="3"
                  fill="none"
                />

                {/* AQL and LTPD markers */}
                <line
                  x1={60 + (aql / 15) * 590}
                  y1={30}
                  x2={60 + (aql / 15) * 590}
                  y2={310}
                  stroke="#4caf50"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
                <text
                  x={60 + (aql / 15) * 590}
                  y={20}
                  fontSize="12"
                  fill="#4caf50"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  AQL
                </text>

                <line
                  x1={60 + (ltpd / 15) * 590}
                  y1={30}
                  x2={60 + (ltpd / 15) * 590}
                  y2={310}
                  stroke="#d32f2f"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
                <text
                  x={60 + (ltpd / 15) * 590}
                  y={20}
                  fontSize="12"
                  fill="#d32f2f"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  LTPD
                </text>

                {/* Axis labels */}
                <text x="355" y="345" fontSize="14" textAnchor="middle" fontWeight="600">
                  Lot Quality (% Defective)
                </text>
                <text x="15" y="170" fontSize="14" textAnchor="middle" transform="rotate(-90, 15, 170)" fontWeight="600">
                  Probability of Acceptance (%)
                </text>

                {/* Y-axis tick labels */}
                {[0, 20, 40, 60, 80, 100].map((val, idx) => (
                  <text key={`y-${val}`} x="50" y={310 - (val / 100) * 280 + 5} fontSize="11" textAnchor="end">
                    {val}
                  </text>
                ))}

                {/* X-axis tick labels */}
                {[0, 3, 6, 9, 12, 15].map((val) => (
                  <text key={`x-${val}`} x={60 + (val / 15) * 590} y="325" fontSize="11" textAnchor="middle">
                    {val}
                  </text>
                ))}
              </svg>
            </Box>
          </Paper>

          {/* Risk Metrics */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: '#fff3e0', height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#f57c00', fontWeight: 600, mb: 2 }}>
                    Producer's Risk (α)
                  </Typography>
                  <Typography variant="h3" sx={{ color: '#f57c00', mb: 1 }}>
                    {riskMetrics.producerRisk}%
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Probability of <strong>rejecting a good lot</strong> (at AQL = {aql}%)
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    Acceptance probability at AQL: {riskMetrics.pAcceptAql}%
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Chip
                      label={parseFloat(riskMetrics.producerRisk) < 10 ? 'Good (α < 10%)' : 'High Risk'}
                      color={parseFloat(riskMetrics.producerRisk) < 10 ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: '#ffebee', height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#d32f2f', fontWeight: 600, mb: 2 }}>
                    Consumer's Risk (β)
                  </Typography>
                  <Typography variant="h3" sx={{ color: '#d32f2f', mb: 1 }}>
                    {riskMetrics.consumerRisk}%
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Probability of <strong>accepting a bad lot</strong> (at LTPD = {ltpd}%)
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    Acceptance probability at LTPD: {riskMetrics.pAcceptLtpd}%
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Chip
                      label={parseFloat(riskMetrics.consumerRisk) < 10 ? 'Good (β < 10%)' : 'High Risk'}
                      color={parseFloat(riskMetrics.consumerRisk) < 10 ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ mt: 3 }}>
            <strong>Design Goal:</strong> Choose <em>n</em> and <em>c</em> such that producer's risk
            (α) ≤ 5% and consumer's risk (β) ≤ 10%. Increasing sample size generally reduces both risks.
          </Alert>

          {/* Backend API Integration */}
          <Paper sx={{ p: 3, mt: 3, bgcolor: '#f0f7ff', border: '2px solid #1976d2' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1976d2' }}>
              🔬 Generate Optimal Plan with Backend API
            </Typography>

            <Typography paragraph variant="body2">
              Use real SciPy/NumPy optimization to calculate the optimal sampling plan based on your AQL and LTPD:
            </Typography>

            <Button
              variant="contained"
              color="success"
              onClick={handleTestBackendAPI}
              disabled={backendLoading}
              fullWidth
              sx={{ mt: 2, mb: 3 }}
            >
              {backendLoading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1, color: '#fff' }} />
                  Optimizing Sampling Plan...
                </>
              ) : (
                '🔬 Generate Optimal Plan with Backend API'
              )}
            </Button>

            {backendError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {backendError}
              </Alert>
            )}

            {backendResults && (
              <Box>
                <Alert severity="success" sx={{ mb: 3 }}>
                  ✅ Successfully generated optimal sampling plan using real SciPy/NumPy optimization!
                  The backend calculated the best n and c values to meet your specified producer and consumer risk targets.
                </Alert>

                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Backend Results:
                </Typography>

                <Grid container spacing={1} sx={{ mt: 1, mb: 3 }}>
                  <Grid item>
                    <Chip
                      label={`Plan Type: ${backendResults.results.plan_type.toUpperCase()}`}
                      color="primary"
                      sx={{ fontWeight: 600 }}
                    />
                  </Grid>
                  <Grid item>
                    <Chip
                      label={`Sample Size (n): ${backendResults.results.sample_size}`}
                      color="primary"
                      sx={{ fontWeight: 600 }}
                    />
                  </Grid>
                  <Grid item>
                    <Chip
                      label={`Acceptance Number (c): ${backendResults.results.acceptance_number}`}
                      color="primary"
                      sx={{ fontWeight: 600 }}
                    />
                  </Grid>
                  <Grid item>
                    <Chip
                      label={`Producer Risk (α): ${(backendResults.results.producer_risk_actual * 100).toFixed(2)}%`}
                      color={backendResults.results.producer_risk_actual <= 0.05 ? 'success' : 'warning'}
                      sx={{ fontWeight: 600 }}
                    />
                  </Grid>
                  <Grid item>
                    <Chip
                      label={`Consumer Risk (β): ${(backendResults.results.consumer_risk_actual * 100).toFixed(2)}%`}
                      color={backendResults.results.consumer_risk_actual <= 0.10 ? 'success' : 'warning'}
                      sx={{ fontWeight: 600 }}
                    />
                  </Grid>
                  <Grid item>
                    <Chip
                      label={`AQL: ${(backendResults.results.aql * 100).toFixed(2)}%`}
                      color="info"
                      sx={{ fontWeight: 600 }}
                    />
                  </Grid>
                  <Grid item>
                    <Chip
                      label={`AOQL: ${(backendResults.results.aoql * 100).toFixed(2)}%`}
                      color="info"
                      sx={{ fontWeight: 600 }}
                    />
                  </Grid>
                </Grid>

                {backendResults.visualizations?.oc_curve && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      Backend-Generated Operating Characteristic (OC) Curve:
                    </Typography>
                    <Box
                      sx={{
                        mt: 2,
                        p: 2,
                        bgcolor: '#fff',
                        borderRadius: 1,
                        border: '1px solid #e0e0e0'
                      }}
                      dangerouslySetInnerHTML={{ __html: backendResults.visualizations.oc_curve }}
                    />
                  </Box>
                )}

                {backendResults.interpretation && (
                  <Alert severity="info" sx={{ mt: 3 }}>
                    <strong>Interpretation:</strong> {backendResults.interpretation}
                  </Alert>
                )}
              </Box>
            )}
          </Paper>
        </Box>
      )
    },
    {
      label: 'Standard Sampling Plans (MIL-STD-105E)',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Industry-Standard Sampling Plans
          </Typography>

          <Typography paragraph>
            Rather than designing plans from scratch, most industries use standardized sampling plans.
            The most famous is <strong>MIL-STD-105E</strong> (now ANSI/ASQ Z1.4), which provides
            sampling plans based on lot size and desired AQL.
          </Typography>

          <Alert severity="info" sx={{ my: 2 }}>
            <strong>MIL-STD-105E Features:</strong>
            <ul style={{ marginBottom: 0 }}>
              <li>Provides plans for single, double, and multiple sampling</li>
              <li>Includes normal, tightened, and reduced inspection</li>
              <li>Switching rules based on quality history</li>
              <li>Widely used in military, automotive, electronics industries</li>
            </ul>
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', fontWeight: 600, mt: 3 }}>
            Sample Plans by Lot Size (AQL = 1.0%)
          </Typography>

          <TableContainer component={Paper} sx={{ my: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#1976d2' }}>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Lot Size</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Normal Inspection</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Tightened Inspection</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Reduced Inspection</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {standardPlans.map((plan, idx) => (
                  <TableRow key={idx} sx={{ '&:nth-of-type(even)': { bgcolor: '#f5f5f5' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>{plan.lotSize}</TableCell>
                    <TableCell>{plan.normalInspection}</TableCell>
                    <TableCell>{plan.tightenedInspection}</TableCell>
                    <TableCell>{plan.reducedInspection}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3 }}>
            <em>n</em> = sample size, <em>c</em> = acceptance number (accept if defects ≤ c, reject otherwise)
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', fontWeight: 600, mt: 3 }}>
            Switching Rules
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: '#e8f5e9', height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2e7d32', mb: 1 }}>
                    Normal → Reduced
                  </Typography>
                  <Typography variant="body2">
                    Switch to <strong>reduced inspection</strong> after 10 consecutive lots are accepted
                    and production is steady.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: '#ffebee', height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#d32f2f', mb: 1 }}>
                    Normal → Tightened
                  </Typography>
                  <Typography variant="body2">
                    Switch to <strong>tightened inspection</strong> when 2 out of 5 consecutive lots
                    are rejected.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: '#fff3e0', height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#f57c00', mb: 1 }}>
                    Discontinue Inspection
                  </Typography>
                  <Typography variant="body2">
                    <strong>Stop accepting lots</strong> if 5 consecutive lots are rejected under
                    tightened inspection.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Alert severity="warning" sx={{ mt: 3 }}>
            <strong>Important:</strong> Acceptance sampling does <em>not improve quality</em>—it only
            screens out bad lots. Use SPC and process improvement to actually improve quality!
          </Alert>
        </Box>
      )
    },
    {
      label: 'Summary & Real-World Applications',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Key Takeaways
          </Typography>

          <Grid container spacing={2} sx={{ my: 2 }}>
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: '#e3f2fd', height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2', mb: 2 }}>
                    When to Use Acceptance Sampling
                  </Typography>
                  <Typography variant="body2" component="div">
                    ✓ Destructive testing<br />
                    ✓ High inspection cost<br />
                    ✓ Large lot sizes<br />
                    ✓ Supplier receiving inspection<br />
                    ✓ Final product auditing<br />
                    <br />
                    <strong>NOT for:</strong><br />
                    ✗ Critical safety items (use 100% inspection)<br />
                    ✗ Process control (use SPC instead)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: '#f3e5f5', height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#7b1fa2', mb: 2 }}>
                    Design Considerations
                  </Typography>
                  <Typography variant="body2" component="div">
                    1. Define AQL (acceptable quality)<br />
                    2. Define LTPD (unacceptable quality)<br />
                    3. Set α risk (typically 5%)<br />
                    4. Set β risk (typically 10%)<br />
                    5. Calculate <em>n</em> and <em>c</em> from tables/software<br />
                    6. Validate with OC curve<br />
                    7. Implement switching rules
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600, mt: 3 }}>
            Real-World Examples
          </Typography>

          <TableContainer component={Paper} sx={{ my: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Industry</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Application</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Typical Plan</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell><strong>Electronics</strong></TableCell>
                  <TableCell>Receiving inspection of resistors</TableCell>
                  <TableCell>n=125, c=2 (AQL=0.65%)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Automotive</strong></TableCell>
                  <TableCell>Final assembly audit</TableCell>
                  <TableCell>n=80, c=1 (AQL=0.4%)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Pharmaceutical</strong></TableCell>
                  <TableCell>Tablet weight verification</TableCell>
                  <TableCell>n=50, c=0 (zero acceptance)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Food Industry</strong></TableCell>
                  <TableCell>Taste testing (destructive)</TableCell>
                  <TableCell>n=13, c=1 (AQL=2.5%)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Military</strong></TableCell>
                  <TableCell>Ammunition lot acceptance</TableCell>
                  <TableCell>MIL-STD-1916 (variables)</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <MathJax>
            <Box sx={{ my: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                <strong>Formula Summary:</strong>
              </Typography>
              <Typography paragraph>
                {"\\[\\text{OC Curve: } P_a(p) = \\sum_{x=0}^{c} \\binom{n}{x} p^x (1-p)^{n-x}\\]"}
              </Typography>
              <Typography paragraph>
                {"\\[\\text{Producer's Risk: } \\alpha = 1 - P_a(\\text{AQL})\\]"}
              </Typography>
              <Typography>
                {"\\[\\text{Consumer's Risk: } \\beta = P_a(\\text{LTPD})\\]"}
              </Typography>
            </Box>
          </MathJax>

          <Alert severity="success" sx={{ my: 2 }}>
            <strong>Congratulations!</strong> You've completed Lesson 6 on Acceptance Sampling.
            You now understand how to design sampling plans, interpret OC curves, and balance
            producer and consumer risks.
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 600, mt: 3 }}>
            Next Steps
          </Typography>

          <Typography paragraph>
            • Practice with MIL-STD-105E/ANSI Z1.4 tables<br />
            • Explore double and sequential sampling plans<br />
            • Study variables sampling plans (vs. attributes)<br />
            • Learn about continuous sampling plans (CSP-1, CSP-2)<br />
            • Integrate acceptance sampling with SPC for complete quality system
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              color="success"
              onClick={handleComplete}
              fullWidth
              size="large"
            >
              Complete Lesson 6: Acceptance Sampling
            </Button>
          </Box>
        </Box>
      )
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#d32f2f', fontWeight: 700 }}>
          Lesson 6: Acceptance Sampling
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Master sampling plans, OC curves, and quality risk management
        </Typography>

        <Stepper activeStep={activeStep} orientation="vertical" sx={{ mt: 3 }}>
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {step.label}
                </Typography>
              </StepLabel>
              <StepContent>
                <Box sx={{ mb: 2 }}>{step.content}</Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={index === steps.length - 1}
                  >
                    {index === steps.length - 1 ? 'Finish' : 'Continue'}
                  </Button>
                  <Button disabled={index === 0} onClick={handleBack}>
                    Back
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {activeStep === steps.length && (
          <Paper square elevation={0} sx={{ p: 3, mt: 3, bgcolor: '#e8f5e9' }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32' }}>
              Lesson 6 Complete! 🎉
            </Typography>
            <Typography paragraph>
              You've mastered acceptance sampling fundamentals and can now design effective
              sampling plans with controlled risks!
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button onClick={handleReset} variant="outlined">
                Review Lesson
              </Button>
              <Button onClick={handleComplete} variant="contained" color="success">
                Mark as Complete & Return to Hub
              </Button>
            </Box>
          </Paper>
        )}
      </Paper>
    </Container>
  );
};

export default Lesson06_AcceptanceSampling;
