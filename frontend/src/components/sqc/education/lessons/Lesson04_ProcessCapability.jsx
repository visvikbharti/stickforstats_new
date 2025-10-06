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
  Slider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress
} from '@mui/material';
import { MathJax, MathJaxContext } from 'better-react-mathjax';

/**
 * Lesson 4: Process Capability Analysis
 *
 * Covers:
 * - Process capability indices (Cp, Cpk, Pp, Ppk)
 * - Short-term vs long-term capability
 * - Six Sigma metrics (DPMO, Z-score)
 * - Interpreting capability values
 * - Real-world applications
 *
 * Interactive: Capability calculator with visual distribution
 */

const Lesson04_ProcessCapability = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);

  // Interactive state for capability calculator
  const [processMean, setProcessMean] = useState(100);
  const [processStdDev, setProcessStdDev] = useState(2);
  const [lsl, setLsl] = useState(94);
  const [usl, setUsl] = useState(106);

  // Backend API integration - NEW Quick API (no auth required!)
  const [backendResults, setBackendResults] = useState(null);
  const [isLoadingBackend, setIsLoadingBackend] = useState(false);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  // Generate sample data based on current slider values
  const generateSampleData = () => {
    const sampleSize = 100;
    const samples = [];

    for (let i = 0; i < sampleSize; i++) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const value = processMean + (z * processStdDev);
      samples.push({ id: i + 1, value: value.toFixed(4) });
    }
    return samples;
  };

  // REAL backend integration - Quick API (no authentication required!)
  const handleTestBackendAPI = async () => {
    setIsLoadingBackend(true);
    setBackendResults(null);

    try {
      // Generate sample data based on current slider settings
      const sampleData = generateSampleData();
      const measurements = sampleData.map(s => parseFloat(s.value));

      // Call REAL backend Quick API (public endpoint, no auth!)
      const response = await fetch('http://localhost:8000/api/v1/sqc-analysis/quick-capability/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          measurements: measurements,
          lower_spec_limit: lsl,
          upper_spec_limit: usl,
          target_value: (lsl + usl) / 2
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        setBackendResults(result.data);
      } else {
        setBackendResults({ error: result.error?.message || 'Backend calculation failed' });
      }
    } catch (err) {
      console.error('Backend API error:', err);
      setBackendResults({ error: `Backend not available: ${err.message}` });
    } finally {
      setIsLoadingBackend(false);
    }
  };

  // Calculate capability indices
  const capabilityMetrics = useMemo(() => {
    const specRange = usl - lsl;
    const processSpread = 6 * processStdDev;
    const target = (usl + lsl) / 2;

    // Cp: Potential capability (assumes centered)
    const cp = specRange / processSpread;

    // Cpk: Actual capability (accounts for centering)
    const cpuUpper = (usl - processMean) / (3 * processStdDev);
    const cplLower = (processMean - lsl) / (3 * processStdDev);
    const cpk = Math.min(cpuUpper, cplLower);

    // Z-scores
    const zUsl = (usl - processMean) / processStdDev;
    const zLsl = (processMean - lsl) / processStdDev;
    const zMin = Math.min(zUsl, zLsl);

    // DPMO (Defects Per Million Opportunities)
    const probAboveUsl = 1 - normalCDF(zUsl);
    const probBelowLsl = normalCDF(-zLsl);
    const probDefect = probAboveUsl + probBelowLsl;
    const dpmo = probDefect * 1000000;

    // Sigma level
    const sigmaLevel = zMin;

    // Yield
    const yieldPercent = (1 - probDefect) * 100;

    return {
      cp: Number(cp.toFixed(3)),
      cpk: Number(cpk.toFixed(3)),
      cpu: Number(cpuUpper.toFixed(3)),
      cpl: Number(cplLower.toFixed(3)),
      zUsl: Number(zUsl.toFixed(2)),
      zLsl: Number(zLsl.toFixed(2)),
      zMin: Number(zMin.toFixed(2)),
      dpmo: Math.round(dpmo),
      sigmaLevel: Number(sigmaLevel.toFixed(2)),
      yieldPercent: Number(yieldPercent.toFixed(2)),
      target: target
    };
  }, [processMean, processStdDev, lsl, usl]);

  // Simple normal CDF approximation
  function normalCDF(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  }

  // Get capability interpretation
  const getCapabilityInterpretation = (cpk) => {
    if (cpk >= 2.0) return { level: 'Excellent', color: '#2e7d32', desc: 'World-class performance' };
    if (cpk >= 1.67) return { level: 'Very Good', color: '#388e3c', desc: 'Six Sigma quality' };
    if (cpk >= 1.33) return { level: 'Good', color: '#689f38', desc: 'Capable process' };
    if (cpk >= 1.0) return { level: 'Adequate', color: '#fbc02d', desc: 'Minimally capable' };
    if (cpk >= 0.67) return { level: 'Poor', color: '#f57c00', desc: 'Marginally capable' };
    return { level: 'Inadequate', color: '#d32f2f', desc: 'Not capable' };
  };

  const interpretation = getCapabilityInterpretation(capabilityMetrics.cpk);

  const steps = [
    {
      label: 'Introduction: What is Process Capability?',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Can Your Process Meet Customer Requirements?
          </Typography>

          <Typography paragraph>
            A process can be <strong>in statistical control</strong> (stable, predictable) but still
            produce defects if the natural variation is too large compared to specification limits.
            <strong> Process capability</strong> quantifies this relationship.
          </Typography>

          <Alert severity="info" sx={{ my: 2 }}>
            <strong>Key Question:</strong> Is the process variation small enough that the output
            consistently falls within specification limits?
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
            The Voice of the Process vs Voice of the Customer
          </Typography>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, bgcolor: '#e3f2fd', height: '100%' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2', mb: 2 }}>
                  Voice of the Process (VoP)
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>What the process naturally produces</strong>
                </Typography>
                <Typography variant="body2">
                  • Measured by process variation (σ)
                  <br />• Natural spread ≈ 6σ (99.73% of data)
                  <br />• Determined by common cause variation
                  <br />• Shows actual capability
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, bgcolor: '#e8f5e9', height: '100%' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2e7d32', mb: 2 }}>
                  Voice of the Customer (VoC)
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>What the customer requires</strong>
                </Typography>
                <Typography variant="body2">
                  • Defined by specification limits
                  <br />• LSL (Lower Spec Limit) to USL (Upper Spec Limit)
                  <br />• Tolerance = USL - LSL
                  <br />• Shows required capability
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Typography paragraph sx={{ mt: 3 }}>
            <strong>Process Capability Analysis</strong> compares VoP to VoC. If VoP (natural spread)
            fits comfortably within VoC (spec limits), the process is <strong>capable</strong>.
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fff3e0', mt: 2 }}>
            <Typography variant="body2">
              <strong>Critical Requirement:</strong> The process must be <strong>in statistical control</strong>
              before assessing capability! Out-of-control processes have unpredictable variation,
              making capability indices meaningless.
            </Typography>
          </Paper>
        </Box>
      )
    },
    {
      label: 'Theory: Capability Indices Explained',
      content: (
        <MathJaxContext>
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
              Four Key Indices: Cp, Cpk, Pp, Ppk
            </Typography>

            <Typography paragraph>
              Process capability is measured using standardized indices. Each index tells a different
              part of the story.
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
              1. Cp (Process Potential Capability)
            </Typography>

            <Typography paragraph>
              Compares tolerance width to process spread, <strong>assuming perfect centering</strong>:
            </Typography>

            <MathJax>
              {"\\[ C_p = \\frac{\\text{USL} - \\text{LSL}}{6\\sigma} = \\frac{\\text{Tolerance}}{\\text{Process Spread}} \\]"}
            </MathJax>

            <Typography paragraph sx={{ mt: 2 }}>
              • <strong>Cp = 1.0:</strong> Process spread exactly equals tolerance (3σ fits on each side)
              <br />• <strong>Cp {'>'} 1.0:</strong> Process spread is narrower than tolerance (good!)
              <br />• <strong>Cp {'<'} 1.0:</strong> Process spread exceeds tolerance (defects inevitable)
            </Typography>

            <Alert severity="warning" sx={{ my: 2 }}>
              <strong>Limitation:</strong> Cp ignores process centering. A process can have high Cp but
              still produce defects if it's off-center!
            </Alert>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
              2. Cpk (Process Capability Index)
            </Typography>

            <Typography paragraph>
              Accounts for <strong>both spread AND centering</strong>:
            </Typography>

            <MathJax>
              {"\\[ C_{pk} = \\min\\left(\\frac{\\text{USL} - \\mu}{3\\sigma}, \\frac{\\mu - \\text{LSL}}{3\\sigma}\\right) \\]"}
            </MathJax>

            <Typography paragraph sx={{ mt: 2 }}>
              Where:
              <br />• <MathJax inline>{"\\(C_{pu} = \\frac{\\text{USL} - \\mu}{3\\sigma}\\)"}</MathJax> (upper capability)
              <br />• <MathJax inline>{"\\(C_{pl} = \\frac{\\mu - \\text{LSL}}{3\\sigma}\\)"}</MathJax> (lower capability)
              <br />• Cpk = min(Cpu, Cpl) — the "worst case"
            </Typography>

            <Typography paragraph>
              <strong>Key Insight:</strong> Cpk will always be ≤ Cp. They're equal only when the
              process is perfectly centered. The difference between Cp and Cpk reveals centering issues.
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
              3. Pp and Ppk (Process Performance Indices)
            </Typography>

            <Typography paragraph>
              Similar to Cp and Cpk, but use <strong>long-term variation</strong> (overall σ) instead
              of <strong>short-term variation</strong> (within-subgroup σ):
            </Typography>

            <MathJax>
              {"\\[ P_p = \\frac{\\text{USL} - \\text{LSL}}{6\\sigma_{\\text{overall}}} \\quad P_{pk} = \\min\\left(\\frac{\\text{USL} - \\mu}{3\\sigma_{\\text{overall}}}, \\frac{\\mu - \\text{LSL}}{3\\sigma_{\\text{overall}}}\\right) \\]"}
            </MathJax>

            <Alert severity="info" sx={{ my: 2 }}>
              <strong>Cp/Cpk vs Pp/Ppk:</strong>
              <br />• <strong>Cp/Cpk:</strong> Short-term (within-subgroup) — potential capability
              <br />• <strong>Pp/Ppk:</strong> Long-term (overall) — actual performance
              <br />• If Pp {'<'} Cp, the process drifts over time (special causes present)
            </Alert>

            <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
              Interpreting Capability Values
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Cpk Value</strong></TableCell>
                  <TableCell><strong>Sigma Level</strong></TableCell>
                  <TableCell><strong>DPMO</strong></TableCell>
                  <TableCell><strong>Yield</strong></TableCell>
                  <TableCell><strong>Rating</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                  <TableCell>≥ 2.0</TableCell>
                  <TableCell>6σ</TableCell>
                  <TableCell>3.4</TableCell>
                  <TableCell>99.9997%</TableCell>
                  <TableCell>Excellent (World-class)</TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: '#f1f8e9' }}>
                  <TableCell>≥ 1.67</TableCell>
                  <TableCell>5σ</TableCell>
                  <TableCell>233</TableCell>
                  <TableCell>99.98%</TableCell>
                  <TableCell>Very Good (Six Sigma)</TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: '#f9fbe7' }}>
                  <TableCell>≥ 1.33</TableCell>
                  <TableCell>4σ</TableCell>
                  <TableCell>6,210</TableCell>
                  <TableCell>99.38%</TableCell>
                  <TableCell>Good (Capable)</TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: '#fffde7' }}>
                  <TableCell>≥ 1.0</TableCell>
                  <TableCell>3σ</TableCell>
                  <TableCell>66,807</TableCell>
                  <TableCell>93.32%</TableCell>
                  <TableCell>Adequate (Minimum)</TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: '#fff3e0' }}>
                  <TableCell>≥ 0.67</TableCell>
                  <TableCell>2σ</TableCell>
                  <TableCell>308,537</TableCell>
                  <TableCell>69.15%</TableCell>
                  <TableCell>Poor</TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: '#ffebee' }}>
                  <TableCell>{'<'} 0.67</TableCell>
                  <TableCell>{'<'} 2σ</TableCell>
                  <TableCell>{'>'} 308,537</TableCell>
                  <TableCell>{'<'} 69%</TableCell>
                  <TableCell>Inadequate</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Alert severity="success" sx={{ mt: 2 }}>
              <strong>Industry Standard:</strong> Many industries require Cpk ≥ 1.33 (4σ level, ~6,200 DPMO).
              Automotive and aerospace often require Cpk ≥ 1.67 (5σ level, ~230 DPMO).
            </Alert>
          </Box>
        </MathJaxContext>
      )
    },
    {
      label: 'Interactive: Capability Calculator',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Interactive Process Capability Calculator
          </Typography>

          <Typography paragraph>
            Adjust the process parameters and specification limits to see how capability indices change.
            Watch what happens to defect rates as you move the process mean or increase variation!
          </Typography>

          <Paper sx={{ p: 3, bgcolor: '#f5f5f5', my: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                  Process Mean (μ):
                </Typography>
                <Slider
                  value={processMean}
                  onChange={(e, val) => setProcessMean(val)}
                  min={94}
                  max={106}
                  step={0.5}
                  marks={[
                    { value: 94, label: 'LSL' },
                    { value: 100, label: 'Target' },
                    { value: 106, label: 'USL' }
                  ]}
                  valueLabelDisplay="on"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                  Process Std Dev (σ):
                </Typography>
                <Slider
                  value={processStdDev}
                  onChange={(e, val) => setProcessStdDev(val)}
                  min={0.5}
                  max={4}
                  step={0.1}
                  marks={[
                    { value: 0.5, label: '0.5' },
                    { value: 2, label: '2' },
                    { value: 4, label: '4' }
                  ]}
                  valueLabelDisplay="on"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                  Lower Spec Limit (LSL):
                </Typography>
                <Slider
                  value={lsl}
                  onChange={(e, val) => setLsl(val)}
                  min={90}
                  max={98}
                  step={0.5}
                  valueLabelDisplay="on"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                  Upper Spec Limit (USL):
                </Typography>
                <Slider
                  value={usl}
                  onChange={(e, val) => setUsl(val)}
                  min={102}
                  max={110}
                  step={0.5}
                  valueLabelDisplay="on"
                />
              </Grid>
            </Grid>

            {/* Visual Distribution */}
            <Paper sx={{ p: 2, bgcolor: 'white', mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom align="center" sx={{ fontWeight: 600 }}>
                Process Distribution vs Specification Limits
              </Typography>
              <svg width="100%" height="300" style={{ border: '1px solid #ddd' }}>
                {/* Specification limits */}
                <line x1={50 + ((lsl - 90) / 20) * 700} y1="50" x2={50 + ((lsl - 90) / 20) * 700} y2="250" stroke="#d32f2f" strokeWidth="2" strokeDasharray="5,5" />
                <line x1={50 + ((usl - 90) / 20) * 700} y1="50" x2={50 + ((usl - 90) / 20) * 700} y2="250" stroke="#d32f2f" strokeWidth="2" strokeDasharray="5,5" />
                <text x={50 + ((lsl - 90) / 20) * 700} y="40" fontSize="12" textAnchor="middle" fill="#d32f2f">LSL</text>
                <text x={50 + ((usl - 90) / 20) * 700} y="40" fontSize="12" textAnchor="middle" fill="#d32f2f">USL</text>

                {/* Target line */}
                <line x1={50 + ((capabilityMetrics.target - 90) / 20) * 700} y1="50" x2={50 + ((capabilityMetrics.target - 90) / 20) * 700} y2="250" stroke="#2e7d32" strokeWidth="1" strokeDasharray="3,3" />
                <text x={50 + ((capabilityMetrics.target - 90) / 20) * 700} y="270" fontSize="10" textAnchor="middle" fill="#2e7d32">Target</text>

                {/* Normal distribution curve */}
                {Array.from({ length: 200 }).map((_, i) => {
                  const x = 90 + (i / 200) * 20;
                  const z = (x - processMean) / processStdDev;
                  const y = Math.exp(-0.5 * z * z) / (processStdDev * Math.sqrt(2 * Math.PI));
                  const svgX = 50 + (i / 200) * 700;
                  const svgY = 250 - (y * 150);

                  if (i === 0) return null;

                  const prevX = 90 + ((i - 1) / 200) * 20;
                  const prevZ = (prevX - processMean) / processStdDev;
                  const prevY = Math.exp(-0.5 * prevZ * prevZ) / (processStdDev * Math.sqrt(2 * Math.PI));
                  const prevSvgX = 50 + ((i - 1) / 200) * 700;
                  const prevSvgY = 250 - (prevY * 150);

                  // Color based on if within spec
                  const color = (x >= lsl && x <= usl) ? '#1976d2' : '#d32f2f';

                  return (
                    <line
                      key={i}
                      x1={prevSvgX}
                      y1={prevSvgY}
                      x2={svgX}
                      y2={svgY}
                      stroke={color}
                      strokeWidth="2"
                    />
                  );
                })}

                {/* Process mean marker */}
                <circle cx={50 + ((processMean - 90) / 20) * 700} cy="250" r="5" fill="#1976d2" />
                <text x={50 + ((processMean - 90) / 20) * 700} y="270" fontSize="10" textAnchor="middle" fill="#1976d2">μ</text>

                {/* Axes */}
                <line x1="50" y1="250" x2="750" y2="250" stroke="#666" strokeWidth="2" />
                <text x="400" y="290" fontSize="12" textAnchor="middle">Measurement Value</text>
              </svg>
            </Paper>

            {/* Metrics Display */}
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ bgcolor: interpretation.color, color: 'white' }}>
                  <CardContent>
                    <Typography variant="h4" align="center" sx={{ fontWeight: 700 }}>
                      Cpk = {capabilityMetrics.cpk}
                    </Typography>
                    <Typography variant="subtitle1" align="center">
                      {interpretation.level}
                    </Typography>
                    <Typography variant="body2" align="center">
                      {interpretation.desc}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" paragraph>
                      <strong>Cp:</strong> {capabilityMetrics.cp} (potential)
                    </Typography>
                    <Typography variant="body2" paragraph>
                      <strong>Cpu:</strong> {capabilityMetrics.cpu} | <strong>Cpl:</strong> {capabilityMetrics.cpl}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Sigma Level:</strong> {capabilityMetrics.sigmaLevel}σ
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" paragraph>
                      <strong>DPMO:</strong> {capabilityMetrics.dpmo.toLocaleString()}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Yield:</strong> {capabilityMetrics.yieldPercent}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" paragraph>
                      <strong>Z(USL):</strong> {capabilityMetrics.zUsl}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Z(LSL):</strong> {capabilityMetrics.zLsl}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert
              severity={capabilityMetrics.cpk >= 1.33 ? 'success' : capabilityMetrics.cpk >= 1.0 ? 'warning' : 'error'}
              sx={{ mt: 3 }}
            >
              <strong>Analysis:</strong>{' '}
              {capabilityMetrics.cpk >= 1.33 &&
                `Process is capable! With Cpk = ${capabilityMetrics.cpk}, you can expect approximately ${capabilityMetrics.dpmo.toLocaleString()} defects per million opportunities.`}
              {capabilityMetrics.cpk >= 1.0 && capabilityMetrics.cpk < 1.33 &&
                `Process is minimally capable. With Cpk = ${capabilityMetrics.cpk}, expect ${capabilityMetrics.dpmo.toLocaleString()} DPMO. Consider reducing variation or widening specifications.`}
              {capabilityMetrics.cpk < 1.0 &&
                `Process is NOT capable! Cpk = ${capabilityMetrics.cpk} means the process will produce significant defects (${capabilityMetrics.dpmo.toLocaleString()} DPMO). Immediate action required!`}
            </Alert>

            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>Tip:</strong> Try setting μ = {capabilityMetrics.target} (perfect centering) to see Cp and Cpk converge!
            </Alert>

            {/* Professional Statistical Analysis Section */}
            <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleTestBackendAPI}
                disabled={isLoadingBackend}
                startIcon={isLoadingBackend ? <CircularProgress size={20} /> : null}
                sx={{
                  bgcolor: 'primary.main',
                  '&:hover': { bgcolor: 'primary.dark' },
                  mb: 2
                }}
                fullWidth
              >
                {isLoadingBackend ? 'Performing Capability Analysis...' : '📊 Perform Capability Analysis'}
              </Button>

              {backendResults && !backendResults.error && (
                <Paper sx={{ p: 3, mt: 3, bgcolor: 'white', border: '2px solid #1976d2' }}>
                  <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', fontWeight: 600 }}>
                    ✅ Backend Results (Python/SciPy Calculated)
                  </Typography>

                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6} md={3}>
                      <Chip label={`Cp: ${backendResults.results?.cp?.toFixed(3)}`} color="primary" sx={{ width: '100%' }} />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Chip label={`Cpk: ${backendResults.results?.cpk?.toFixed(3)}`} color="primary" sx={{ width: '100%' }} />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Chip label={`Pp: ${backendResults.results?.pp?.toFixed(3)}`} color="secondary" sx={{ width: '100%' }} />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Chip label={`Ppk: ${backendResults.results?.ppk?.toFixed(3)}`} color="secondary" sx={{ width: '100%' }} />
                    </Grid>
                  </Grid>

                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid item xs={12} md={4}>
                      <Typography variant="body2"><strong>Mean:</strong> {backendResults.results?.mean?.toFixed(3)}</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="body2"><strong>Std Dev:</strong> {backendResults.results?.std_dev?.toFixed(3)}</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="body2"><strong>Sigma Level:</strong> {backendResults.results?.sigma_level}σ</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2"><strong>DPMO:</strong> {backendResults.results?.dpm?.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2"><strong>Yield:</strong> {backendResults.results?.process_yield?.toFixed(2)}%</Typography>
                    </Grid>
                  </Grid>

                  {backendResults.visualizations?.capability_plot && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" gutterBottom><strong>Backend Generated Visualization:</strong></Typography>
                      <img
                        src={backendResults.visualizations.capability_plot}
                        alt="Backend capability histogram"
                        style={{ width: '100%', maxWidth: '600px', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </Box>
                  )}

                  <Alert severity="success" sx={{ mt: 3 }}>
                    <strong>✓ Authentic Backend Calculation:</strong> These results were calculated by the Django backend using Python's SciPy and NumPy libraries. The histogram above was generated using matplotlib on the server.
                  </Alert>
                </Paper>
              )}

              {backendResults && backendResults.error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <strong>Backend Error:</strong> {backendResults.error}
                </Alert>
              )}

              {!backendResults && !isLoadingBackend && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <strong>How it works:</strong> When you click the button above, your browser sends the current slider values to the Django backend at <code>localhost:8000</code>. The backend generates 100 random samples, calculates all metrics using SciPy, and returns the results along with a matplotlib-generated visualization.
                </Alert>
              )}
            </Box>
          </Paper>
        </Box>
      )
    },
    {
      label: 'Practice: Six Sigma and Real Applications',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Six Sigma: The Quest for Near-Perfect Quality
          </Typography>

          <Typography paragraph>
            Six Sigma methodology targets <strong>Cpk ≥ 2.0</strong> (6σ level), which corresponds
            to only <strong>3.4 defects per million opportunities (DPMO)</strong> — near perfection!
          </Typography>

          <Paper sx={{ p: 3, bgcolor: '#e3f2fd', my: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              The Six Sigma Scale
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Sigma Level</strong></TableCell>
                  <TableCell><strong>Cpk</strong></TableCell>
                  <TableCell><strong>DPMO</strong></TableCell>
                  <TableCell><strong>Real-World Example</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>6σ</TableCell>
                  <TableCell>2.0</TableCell>
                  <TableCell>3.4</TableCell>
                  <TableCell>Airline baggage handling, Nuclear power safety</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>5σ</TableCell>
                  <TableCell>1.67</TableCell>
                  <TableCell>233</TableCell>
                  <TableCell>Domestic airline fatalities</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>4σ</TableCell>
                  <TableCell>1.33</TableCell>
                  <TableCell>6,210</TableCell>
                  <TableCell>Average manufacturing (industry standard)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>3σ</TableCell>
                  <TableCell>1.0</TableCell>
                  <TableCell>66,807</TableCell>
                  <TableCell>Restaurant food safety, Doctor prescriptions</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>2σ</TableCell>
                  <TableCell>0.67</TableCell>
                  <TableCell>308,537</TableCell>
                  <TableCell>Payroll processing errors</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>1σ</TableCell>
                  <TableCell>0.33</TableCell>
                  <TableCell>690,000</TableCell>
                  <TableCell>Unacceptable in most industries</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Alert severity="warning" sx={{ mt: 2 }}>
              <strong>Note:</strong> Traditional Six Sigma assumes a ±1.5σ shift over time. True 6σ
              (with shift) corresponds to Cpk = 1.5, resulting in ~3.4 DPMO.
            </Alert>
          </Paper>

          <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
            Industry Applications
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2', mb: 1 }}>
                    Automotive Manufacturing
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Requirement:</strong> Cpk ≥ 1.67 (Ppk ≥ 1.33)
                  </Typography>
                  <Typography variant="caption">
                    Critical dimensions (engine parts, safety systems) must meet stringent capability
                    requirements. Typical targets: 5σ for critical, 4σ for important.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2', mb: 1 }}>
                    Pharmaceutical
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Requirement:</strong> Cpk ≥ 1.33 (minimum)
                  </Typography>
                  <Typography variant="caption">
                    API concentration, tablet weight, dissolution rate must all be capable. FDA
                    requires process validation demonstrating consistent capability.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2', mb: 1 }}>
                    Semiconductor Fab
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Requirement:</strong> Cpk ≥ 2.0 (6σ)
                  </Typography>
                  <Typography variant="caption">
                    Chip feature sizes measured in nanometers require near-perfect capability.
                    Even tiny variations cause failures in billion-transistor chips.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2', mb: 1 }}>
                    Medical Device
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Requirement:</strong> Cpk ≥ 1.33 - 2.0
                  </Typography>
                  <Typography variant="caption">
                    Life-critical devices (pacemakers, surgical tools) require high capability.
                    Risk-based approach: higher risk → higher Cpk requirement.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
            Action Plan Based on Capability
          </Typography>

          <Table size="small" sx={{ mt: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell><strong>Situation</strong></TableCell>
                <TableCell><strong>Diagnosis</strong></TableCell>
                <TableCell><strong>Action</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Cp ≈ Cpk (both high)</TableCell>
                <TableCell>Centered and capable</TableCell>
                <TableCell>Monitor and maintain. Celebrate success!</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Cp high, Cpk low</TableCell>
                <TableCell>Not centered (shift/drift)</TableCell>
                <TableCell>Adjust process mean to target. Quick fix!</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Cp low, Cpk low</TableCell>
                <TableCell>Too much variation</TableCell>
                <TableCell>Reduce variation (improve process) or widen specs</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Ppk {'<'} Cpk</TableCell>
                <TableCell>Process drifts over time</TableCell>
                <TableCell>Eliminate special causes, improve control</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>
      )
    },
    {
      label: 'Summary: Process Capability',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Key Takeaways
          </Typography>

          <Paper sx={{ p: 3, bgcolor: '#f5f5f5', my: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              1. Capability Measures Process vs Specs
            </Typography>
            <Typography variant="body2" paragraph>
              • Voice of Process (VoP) = natural variation (6σ)
              <br />• Voice of Customer (VoC) = specification limits
              <br />• Capability = Can VoP fit within VoC?
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              2. Four Key Indices
            </Typography>
            <Typography variant="body2" paragraph>
              • <strong>Cp:</strong> Potential capability (assumes centered)
              <br />• <strong>Cpk:</strong> Actual capability (accounts for centering)
              <br />• <strong>Pp:</strong> Long-term potential
              <br />• <strong>Ppk:</strong> Long-term actual
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              3. Industry Standards
            </Typography>
            <Typography variant="body2" paragraph>
              • <strong>Cpk ≥ 1.33:</strong> Minimum for most industries (4σ)
              <br />• <strong>Cpk ≥ 1.67:</strong> Automotive, aerospace (5σ)
              <br />• <strong>Cpk ≥ 2.0:</strong> Six Sigma, semiconductors (6σ)
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              4. Prerequisites and Limitations
            </Typography>
            <Typography variant="body2">
              • Process MUST be in statistical control first
              <br />• Assumes normal distribution (or transform data)
              <br />• Both limits required for Cp/Cpk (use Z-scores for one-sided)
              <br />• Capability is only valid for stable processes
            </Typography>
          </Paper>

          <Alert severity="success" sx={{ my: 2 }}>
            <strong>Complete Process:</strong>
            <br />1. Establish statistical control (control charts)
            <br />2. Assess capability (Cp, Cpk, Pp, Ppk)
            <br />3. If capable: Monitor and maintain
            <br />4. If not capable: Reduce variation or adjust specifications
          </Alert>

          <Alert severity="info" sx={{ my: 2 }}>
            <strong>Next Lesson:</strong> Before trusting your capability analysis, ensure your
            <strong> measurements are reliable</strong>! Learn Measurement System Analysis (MSA)
            and Gage R&R studies.
          </Alert>

          <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={handleComplete}
              fullWidth
            >
              Complete Lesson 4
            </Button>
          </Box>
        </Box>
      )
    }
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#d32f2f', fontWeight: 700 }}>
          Lesson 4: Process Capability Analysis
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Master Cp, Cpk, Pp, Ppk and Six Sigma quality metrics
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
              Lesson 4 Complete! 🎉
            </Typography>
            <Typography paragraph>
              You've mastered process capability analysis and Six Sigma metrics!
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button onClick={handleReset} variant="outlined">
                Review Lesson
              </Button>
              <Button onClick={handleComplete} variant="contained" color="success">
                Mark as Complete & Continue
              </Button>
            </Box>
          </Paper>
        )}
      </Paper>
    </Container>
  );
};

export default Lesson04_ProcessCapability;
