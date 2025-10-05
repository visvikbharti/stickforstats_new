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
  CircularProgress,
  Chip
} from '@mui/material';
import { MathJax, MathJaxContext } from 'better-react-mathjax';
import useSQCAnalysisAPI from '../../../../hooks/useSQCAnalysisAPI';

/**
 * Lesson 2: Variables Control Charts
 *
 * Covers:
 * - X̄-R Charts (Mean and Range)
 * - X̄-S Charts (Mean and Standard Deviation)
 * - I-MR Charts (Individual and Moving Range)
 * - Control limit calculations
 * - Western Electric Rules
 *
 * Interactive: Build and interpret control charts
 */

const Lesson02_VariablesControlCharts = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);

  // Interactive state
  const [subgroupSize, setSubgroupSize] = useState(5);
  const [processShift, setProcessShift] = useState(0);

  // Backend integration state
  const [backendResults, setBackendResults] = useState(null);
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState(null);

  // Initialize API hook
  const { quickControlChart } = useSQCAnalysisAPI();

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

  // Backend API integration
  const handleTestBackendAPI = async () => {
    try {
      setBackendLoading(true);
      setBackendError(null);

      // Flatten subgroup data into individual measurements for I-MR chart
      const measurements = sampleData.flatMap(subgroup => subgroup.values);

      const response = await quickControlChart({
        measurements: measurements,
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

  // Constants for control chart factors
  const controlChartConstants = {
    3: { A2: 1.023, D3: 0, D4: 2.574, A3: 1.954, B3: 0, B4: 2.568, d2: 1.693 },
    4: { A2: 0.729, D3: 0, D4: 2.282, A3: 1.628, B3: 0, B4: 2.266, d2: 2.059 },
    5: { A2: 0.577, D3: 0, D4: 2.114, A3: 1.427, B3: 0, B4: 2.089, d2: 2.326 },
    6: { A2: 0.483, D3: 0, D4: 2.004, A3: 1.287, B3: 0.030, B4: 1.970, d2: 2.534 },
    7: { A2: 0.419, D3: 0.076, D4: 1.924, A3: 1.182, B3: 0.118, B4: 1.882, d2: 2.704 }
  };

  // Generate sample data
  const sampleData = useMemo(() => {
    const numSubgroups = 20;
    const targetMean = 100;
    const targetStdDev = 2;
    const data = [];

    for (let i = 0; i < numSubgroups; i++) {
      const subgroup = [];
      const shiftAmount = i >= 15 ? processShift : 0;

      for (let j = 0; j < subgroupSize; j++) {
        const value = targetMean + shiftAmount + (Math.random() - 0.5) * 2 * targetStdDev * 2;
        subgroup.push(Number(value.toFixed(2)));
      }

      const mean = subgroup.reduce((a, b) => a + b, 0) / subgroup.length;
      const range = Math.max(...subgroup) - Math.min(...subgroup);
      const stdDev = Math.sqrt(
        subgroup.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (subgroup.length - 1)
      );

      data.push({
        subgroup: i + 1,
        values: subgroup,
        mean: Number(mean.toFixed(2)),
        range: Number(range.toFixed(2)),
        stdDev: Number(stdDev.toFixed(2))
      });
    }

    return data;
  }, [subgroupSize, processShift]);

  // Calculate control limits
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const controlLimits = useMemo(() => {
    const constants = controlChartConstants[subgroupSize] || controlChartConstants[5];

    // Grand average (X̄̄)
    const grandMean = sampleData.reduce((sum, d) => sum + d.mean, 0) / sampleData.length;

    // Average range (R̄)
    const avgRange = sampleData.reduce((sum, d) => sum + d.range, 0) / sampleData.length;

    // Average standard deviation (S̄)
    const avgStdDev = sampleData.reduce((sum, d) => sum + d.stdDev, 0) / sampleData.length;

    // X̄-R Chart limits
    const xBarR = {
      xBar: {
        center: grandMean,
        ucl: grandMean + constants.A2 * avgRange,
        lcl: grandMean - constants.A2 * avgRange
      },
      r: {
        center: avgRange,
        ucl: constants.D4 * avgRange,
        lcl: constants.D3 * avgRange
      }
    };

    // X̄-S Chart limits
    const xBarS = {
      xBar: {
        center: grandMean,
        ucl: grandMean + constants.A3 * avgStdDev,
        lcl: grandMean - constants.A3 * avgStdDev
      },
      s: {
        center: avgStdDev,
        ucl: constants.B4 * avgStdDev,
        lcl: constants.B3 * avgStdDev
      }
    };

    return { xBarR, xBarS, constants };
  }, [sampleData, subgroupSize]);

  const steps = [
    {
      label: 'Introduction: Variables Control Charts',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Monitoring Continuous Measurements
          </Typography>

          <Typography paragraph>
            Variables control charts monitor <strong>continuous measurements</strong> like weight, length,
            temperature, or pressure. Unlike attributes charts (which count defects), variables charts use
            the actual measured values — making them more sensitive to process changes.
          </Typography>

          <Alert severity="info" sx={{ my: 2 }}>
            <strong>Key Advantage:</strong> Variables charts detect small process shifts faster than
            attributes charts because they use more information (exact measurements vs. pass/fail).
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
            Three Main Types
          </Typography>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2', mb: 1 }}>
                    X̄-R Chart
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Mean & Range</strong>
                  </Typography>
                  <Typography variant="caption">
                    • Most common
                    <br />• Subgroup size n = 2-10
                    <br />• Simple calculations
                    <br />• X̄ monitors location
                    <br />• R monitors spread
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2', mb: 1 }}>
                    X̄-S Chart
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Mean & Std Dev</strong>
                  </Typography>
                  <Typography variant="caption">
                    • For larger subgroups
                    <br />• Subgroup size n {'>'} 10
                    <br />• More efficient than R
                    <br />• X̄ monitors location
                    <br />• S monitors spread
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2', mb: 1 }}>
                    I-MR Chart
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Individuals & Moving Range</strong>
                  </Typography>
                  <Typography variant="caption">
                    • For single measurements
                    <br />• Subgroup size n = 1
                    <br />• Slow or expensive tests
                    <br />• I monitors location
                    <br />• MR monitors spread
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography paragraph sx={{ mt: 3 }}>
            All three types monitor <strong>both location and spread</strong> simultaneously — you need
            both charts to fully understand process behavior!
          </Typography>
        </Box>
      )
    },
    {
      label: 'Theory: X̄-R Chart Mathematics',
      content: (
        <MathJaxContext>
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
              X̄-R Chart: Mean and Range
            </Typography>

            <Typography paragraph>
              The X̄-R chart uses two separate charts to monitor process location (mean) and spread (range).
            </Typography>

            <Paper sx={{ p: 3, bgcolor: '#e3f2fd', my: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Step 1: Collect Subgroups
              </Typography>
              <Typography variant="body2" paragraph>
                Collect k subgroups (typically 20-25) of n measurements each (typically n = 4-6).
                Each subgroup represents a "snapshot" of the process at a specific time.
              </Typography>
            </Paper>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
              Step 2: Calculate Statistics for Each Subgroup
            </Typography>

            <Typography paragraph>
              For subgroup i with measurements <MathJax inline>{"\\(x_{i1}, x_{i2}, \\ldots, x_{in}\\)"}</MathJax>:
            </Typography>

            <MathJax>
              {"\\[ \\bar{X}_i = \\frac{1}{n} \\sum_{j=1}^{n} x_{ij} \\quad \\text{(Subgroup mean)} \\]"}
            </MathJax>

            <MathJax>
              {"\\[ R_i = \\max(x_{ij}) - \\min(x_{ij}) \\quad \\text{(Subgroup range)} \\]"}
            </MathJax>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
              Step 3: Calculate Grand Average and Average Range
            </Typography>

            <MathJax>
              {"\\[ \\bar{\\bar{X}} = \\frac{1}{k} \\sum_{i=1}^{k} \\bar{X}_i \\quad \\text{(Grand mean)} \\]"}
            </MathJax>

            <MathJax>
              {"\\[ \\bar{R} = \\frac{1}{k} \\sum_{i=1}^{k} R_i \\quad \\text{(Average range)} \\]"}
            </MathJax>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
              Step 4: Calculate Control Limits
            </Typography>

            <Typography paragraph sx={{ mt: 2 }}>
              <strong>X̄ Chart (Monitoring Process Mean):</strong>
            </Typography>

            <MathJax>
              {"\\[ \\text{UCL}_{\\bar{X}} = \\bar{\\bar{X}} + A_2 \\bar{R} \\]"}
            </MathJax>
            <MathJax>
              {"\\[ \\text{Center Line} = \\bar{\\bar{X}} \\]"}
            </MathJax>
            <MathJax>
              {"\\[ \\text{LCL}_{\\bar{X}} = \\bar{\\bar{X}} - A_2 \\bar{R} \\]"}
            </MathJax>

            <Typography paragraph sx={{ mt: 2 }}>
              <strong>R Chart (Monitoring Process Spread):</strong>
            </Typography>

            <MathJax>
              {"\\[ \\text{UCL}_{R} = D_4 \\bar{R} \\]"}
            </MathJax>
            <MathJax>
              {"\\[ \\text{Center Line} = \\bar{R} \\]"}
            </MathJax>
            <MathJax>
              {"\\[ \\text{LCL}_{R} = D_3 \\bar{R} \\]"}
            </MathJax>

            <Typography paragraph sx={{ mt: 2 }}>
              Where <MathJax inline>{"\\(A_2\\)"}</MathJax>, <MathJax inline>{"\\(D_3\\)"}</MathJax>,
              and <MathJax inline>{"\\(D_4\\)"}</MathJax> are control chart constants that depend on
              subgroup size n.
            </Typography>

            <Alert severity="info" sx={{ my: 2 }}>
              <strong>Why these constants?</strong> They convert the average range (R̄) to an estimate
              of the process standard deviation. The constants are derived from the distribution of the
              range statistic for samples from a normal population.
            </Alert>

            <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
              Control Chart Constants (Selected Values)
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>n</strong></TableCell>
                  <TableCell><strong>A₂</strong></TableCell>
                  <TableCell><strong>D₃</strong></TableCell>
                  <TableCell><strong>D₄</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>3</TableCell>
                  <TableCell>1.023</TableCell>
                  <TableCell>0</TableCell>
                  <TableCell>2.574</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>4</TableCell>
                  <TableCell>0.729</TableCell>
                  <TableCell>0</TableCell>
                  <TableCell>2.282</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>5</TableCell>
                  <TableCell>0.577</TableCell>
                  <TableCell>0</TableCell>
                  <TableCell>2.114</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>6</TableCell>
                  <TableCell>0.483</TableCell>
                  <TableCell>0</TableCell>
                  <TableCell>2.004</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>7</TableCell>
                  <TableCell>0.419</TableCell>
                  <TableCell>0.076</TableCell>
                  <TableCell>1.924</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Alert severity="warning" sx={{ mt: 2 }}>
              <strong>Important:</strong> Always analyze the R chart first! If the range is out of control,
              the control limits on the X̄ chart may be invalid.
            </Alert>
          </Box>
        </MathJaxContext>
      )
    },
    {
      label: 'Interactive: Build Your Own Control Chart',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Interactive X̄-R Chart Builder
          </Typography>

          <Typography paragraph>
            Adjust the parameters below to see how control charts respond to process changes.
            Watch what happens when the process shifts after subgroup 15!
          </Typography>

          <Paper sx={{ p: 3, bgcolor: '#f5f5f5', my: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                  Subgroup Size (n):
                </Typography>
                <Slider
                  value={subgroupSize}
                  onChange={(e, val) => setSubgroupSize(val)}
                  min={3}
                  max={7}
                  step={1}
                  marks
                  valueLabelDisplay="on"
                />
                <Typography variant="caption" color="text.secondary">
                  Typical: 4-6 measurements per subgroup
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                  Process Shift After Subgroup 15:
                </Typography>
                <Slider
                  value={processShift}
                  onChange={(e, val) => setProcessShift(val)}
                  min={0}
                  max={6}
                  step={0.5}
                  marks
                  valueLabelDisplay="on"
                />
                <Typography variant="caption" color="text.secondary">
                  Simulate a process shift (σ units)
                </Typography>
              </Grid>
            </Grid>

            {/* X̄ Chart */}
            <Paper sx={{ p: 2, bgcolor: 'white', mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom align="center" sx={{ fontWeight: 600 }}>
                X̄ Chart (Subgroup Means)
              </Typography>
              <svg width="100%" height="300" style={{ border: '1px solid #ddd' }}>
                {/* Axes */}
                <line x1="50" y1="250" x2="750" y2="250" stroke="#666" strokeWidth="2" />
                <line x1="50" y1="50" x2="50" y2="250" stroke="#666" strokeWidth="2" />

                {/* Control limits */}
                <line
                  x1="50"
                  y1={250 - ((controlLimits.xBarR.xBar.ucl - 94) / 16) * 200}
                  x2="750"
                  y2={250 - ((controlLimits.xBarR.xBar.ucl - 94) / 16) * 200}
                  stroke="#d32f2f"
                  strokeWidth="1.5"
                  strokeDasharray="5,5"
                />
                <line
                  x1="50"
                  y1={250 - ((controlLimits.xBarR.xBar.center - 94) / 16) * 200}
                  x2="750"
                  y2={250 - ((controlLimits.xBarR.xBar.center - 94) / 16) * 200}
                  stroke="#2e7d32"
                  strokeWidth="2"
                />
                <line
                  x1="50"
                  y1={250 - ((controlLimits.xBarR.xBar.lcl - 94) / 16) * 200}
                  x2="750"
                  y2={250 - ((controlLimits.xBarR.xBar.lcl - 94) / 16) * 200}
                  stroke="#d32f2f"
                  strokeWidth="1.5"
                  strokeDasharray="5,5"
                />

                {/* Plot points */}
                {sampleData.map((point, i) => {
                  const x = 50 + (i * (700 / (sampleData.length - 1)));
                  const y = 250 - ((point.mean - 94) / 16) * 200;
                  const outOfControl = point.mean > controlLimits.xBarR.xBar.ucl ||
                                      point.mean < controlLimits.xBarR.xBar.lcl;

                  return (
                    <g key={i}>
                      {i > 0 && (
                        <line
                          x1={50 + ((i - 1) * (700 / (sampleData.length - 1)))}
                          y1={250 - ((sampleData[i - 1].mean - 94) / 16) * 200}
                          x2={x}
                          y2={y}
                          stroke="#1976d2"
                          strokeWidth="1.5"
                        />
                      )}
                      <circle
                        cx={x}
                        cy={y}
                        r="4"
                        fill={outOfControl ? '#d32f2f' : '#1976d2'}
                      />
                    </g>
                  );
                })}

                {/* Labels */}
                <text x="400" y="280" fontSize="12" textAnchor="middle">Subgroup Number</text>
                <text x="25" y="150" fontSize="12" textAnchor="middle" transform="rotate(-90, 25, 150)">X̄</text>
                <text x="755" y={250 - ((controlLimits.xBarR.xBar.ucl - 94) / 16) * 200} fontSize="10">UCL</text>
                <text x="755" y={250 - ((controlLimits.xBarR.xBar.center - 94) / 16) * 200} fontSize="10">CL</text>
                <text x="755" y={250 - ((controlLimits.xBarR.xBar.lcl - 94) / 16) * 200} fontSize="10">LCL</text>
              </svg>

              <Typography variant="caption" display="block" align="center" sx={{ mt: 1 }}>
                UCL = {controlLimits.xBarR.xBar.ucl.toFixed(2)},
                CL = {controlLimits.xBarR.xBar.center.toFixed(2)},
                LCL = {controlLimits.xBarR.xBar.lcl.toFixed(2)}
              </Typography>
            </Paper>

            {/* R Chart */}
            <Paper sx={{ p: 2, bgcolor: 'white', mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom align="center" sx={{ fontWeight: 600 }}>
                R Chart (Subgroup Ranges)
              </Typography>
              <svg width="100%" height="250" style={{ border: '1px solid #ddd' }}>
                {/* Axes */}
                <line x1="50" y1="200" x2="750" y2="200" stroke="#666" strokeWidth="2" />
                <line x1="50" y1="50" x2="50" y2="200" stroke="#666" strokeWidth="2" />

                {/* Control limits */}
                <line
                  x1="50"
                  y1={200 - ((controlLimits.xBarR.r.ucl) / 15) * 150}
                  x2="750"
                  y2={200 - ((controlLimits.xBarR.r.ucl) / 15) * 150}
                  stroke="#d32f2f"
                  strokeWidth="1.5"
                  strokeDasharray="5,5"
                />
                <line
                  x1="50"
                  y1={200 - ((controlLimits.xBarR.r.center) / 15) * 150}
                  x2="750"
                  y2={200 - ((controlLimits.xBarR.r.center) / 15) * 150}
                  stroke="#2e7d32"
                  strokeWidth="2"
                />

                {/* Plot points */}
                {sampleData.map((point, i) => {
                  const x = 50 + (i * (700 / (sampleData.length - 1)));
                  const y = 200 - ((point.range) / 15) * 150;
                  const outOfControl = point.range > controlLimits.xBarR.r.ucl;

                  return (
                    <g key={i}>
                      {i > 0 && (
                        <line
                          x1={50 + ((i - 1) * (700 / (sampleData.length - 1)))}
                          y1={200 - ((sampleData[i - 1].range) / 15) * 150}
                          x2={x}
                          y2={y}
                          stroke="#ed6c02"
                          strokeWidth="1.5"
                        />
                      )}
                      <circle
                        cx={x}
                        cy={y}
                        r="4"
                        fill={outOfControl ? '#d32f2f' : '#ed6c02'}
                      />
                    </g>
                  );
                })}

                {/* Labels */}
                <text x="400" y="230" fontSize="12" textAnchor="middle">Subgroup Number</text>
                <text x="25" y="125" fontSize="12" textAnchor="middle" transform="rotate(-90, 25, 125)">R</text>
                <text x="755" y={200 - ((controlLimits.xBarR.r.ucl) / 15) * 150} fontSize="10">UCL</text>
                <text x="755" y={200 - ((controlLimits.xBarR.r.center) / 15) * 150} fontSize="10">CL</text>
              </svg>

              <Typography variant="caption" display="block" align="center" sx={{ mt: 1 }}>
                UCL = {controlLimits.xBarR.r.ucl.toFixed(2)},
                CL = {controlLimits.xBarR.r.center.toFixed(2)},
                LCL = {controlLimits.xBarR.r.lcl.toFixed(2)}
              </Typography>
            </Paper>

            {/* Interpretation */}
            <Alert
              severity={processShift > 2 ? 'error' : processShift > 0 ? 'warning' : 'success'}
              sx={{ mt: 2 }}
            >
              <strong>Interpretation:</strong>{' '}
              {processShift === 0 &&
                'Process is in control — all points within limits, random variation only.'}
              {processShift > 0 && processShift <= 2 &&
                'Small process shift detected. Some later points may approach or exceed control limits.'}
              {processShift > 2 &&
                'Significant process shift! Points exceed UCL after subgroup 15. Investigate and correct.'}
            </Alert>

            {/* Backend Integration Section */}
            <Box sx={{ mt: 4, p: 3, bgcolor: '#e8f5e9', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 600 }}>
                🔬 Test with Backend API (Real Statistical Engine)
              </Typography>
              <Typography variant="body2" paragraph sx={{ color: 'text.secondary' }}>
                Connect to the Django backend to analyze your data with real SciPy/NumPy calculations.
                The backend will generate an I-MR control chart with professional matplotlib visualization.
              </Typography>

              <Button
                variant="contained"
                size="large"
                onClick={handleTestBackendAPI}
                disabled={backendLoading}
                sx={{
                  bgcolor: '#2e7d32',
                  '&:hover': { bgcolor: '#1b5e20' },
                  mb: 2
                }}
                fullWidth
              >
                {backendLoading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                    Analyzing with Backend...
                  </>
                ) : (
                  '🔬 Analyze with Backend API'
                )}
              </Button>

              {backendError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <strong>Backend Error:</strong> {backendError}
                </Alert>
              )}

              {backendResults && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: '#2e7d32' }}>
                    Backend Analysis Results
                  </Typography>

                  <Grid container spacing={1} sx={{ mt: 1 }}>
                    <Grid item xs={6} md={3}>
                      <Chip
                        label={`Chart Type: ${backendResults.results?.chart_type?.toUpperCase() || 'N/A'}`}
                        color="primary"
                        sx={{ width: '100%' }}
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Chip
                        label={`UCL: ${backendResults.results?.upper_control_limit?.toFixed(2) || 'N/A'}`}
                        color="error"
                        sx={{ width: '100%' }}
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Chip
                        label={`CL: ${backendResults.results?.center_line?.toFixed(2) || 'N/A'}`}
                        color="success"
                        sx={{ width: '100%' }}
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Chip
                        label={`LCL: ${backendResults.results?.lower_control_limit?.toFixed(2) || 'N/A'}`}
                        color="warning"
                        sx={{ width: '100%' }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Chip
                        label={`Violations: ${backendResults.results?.violations?.length || 0}`}
                        color={backendResults.results?.violations?.length > 0 ? 'error' : 'success'}
                        sx={{ width: '100%' }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Chip
                        label={`In Control: ${backendResults.results?.is_in_control ? 'Yes ✓' : 'No ✗'}`}
                        color={backendResults.results?.is_in_control ? 'success' : 'error'}
                        sx={{ width: '100%' }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Chip
                        label={`Patterns Detected: ${Object.keys(backendResults.results?.patterns || {}).filter(k => backendResults.results?.patterns[k]).length}`}
                        color="info"
                        sx={{ width: '100%' }}
                      />
                    </Grid>
                  </Grid>

                  {backendResults.visualizations?.control_chart && (
                    <Paper sx={{ mt: 3, p: 2, bgcolor: 'white' }}>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                        Backend-Generated I-MR Control Chart (matplotlib SVG)
                      </Typography>
                      <Box
                        dangerouslySetInnerHTML={{
                          __html: backendResults.visualizations.control_chart
                        }}
                        sx={{
                          '& svg': {
                            width: '100%',
                            height: 'auto'
                          }
                        }}
                      />
                    </Paper>
                  )}

                  <Alert severity="success" sx={{ mt: 2 }}>
                    <strong>Real Backend Analysis:</strong> These results come from the Django backend
                    using SciPy/NumPy for calculations and matplotlib for visualization. This demonstrates
                    full-stack integration with professional statistical computing libraries!
                  </Alert>
                </Box>
              )}
            </Box>
          </Paper>
        </Box>
      )
    },
    {
      label: 'Practice: Western Electric Rules',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Detecting Special Causes: Beyond the Control Limits
          </Typography>

          <Typography paragraph>
            A point beyond control limits is obvious. But special causes can also create <strong>non-random
            patterns</strong> within the limits. The Western Electric rules (also called Nelson rules) help
            detect these patterns.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
            The 8 Western Electric Rules
          </Typography>

          <Paper sx={{ p: 3, bgcolor: '#f5f5f5', my: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: '#d32f2f', fontWeight: 600 }}>
                      Rule 1: Single Point Beyond 3σ
                    </Typography>
                    <Typography variant="body2">
                      Any point beyond UCL or LCL
                      <br /><strong>Probability:</strong> 0.3% (if in control)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: '#d32f2f', fontWeight: 600 }}>
                      Rule 2: 9 Points in a Row on Same Side
                    </Typography>
                    <Typography variant="body2">
                      9 consecutive points all above or all below center line
                      <br /><strong>Indicates:</strong> Process shift
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: '#d32f2f', fontWeight: 600 }}>
                      Rule 3: 6 Points Trending
                    </Typography>
                    <Typography variant="body2">
                      6 consecutive points steadily increasing or decreasing
                      <br /><strong>Indicates:</strong> Trend (drift, tool wear)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: '#d32f2f', fontWeight: 600 }}>
                      Rule 4: 14 Points Alternating
                    </Typography>
                    <Typography variant="body2">
                      14 consecutive points alternating up and down
                      <br /><strong>Indicates:</strong> Systematic variation (two streams)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: '#d32f2f', fontWeight: 600 }}>
                      Rule 5: 2 of 3 Beyond 2σ
                    </Typography>
                    <Typography variant="body2">
                      2 out of 3 consecutive points beyond 2σ (same side)
                      <br /><strong>Probability:</strong> 0.3% (if in control)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: '#d32f2f', fontWeight: 600 }}>
                      Rule 6: 4 of 5 Beyond 1σ
                    </Typography>
                    <Typography variant="body2">
                      4 out of 5 consecutive points beyond 1σ (same side)
                      <br /><strong>Indicates:</strong> Shift starting
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: '#d32f2f', fontWeight: 600 }}>
                      Rule 7: 15 Points Within 1σ
                    </Typography>
                    <Typography variant="body2">
                      15 consecutive points within ±1σ
                      <br /><strong>Indicates:</strong> Stratification (chart may be incorrect)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: '#d32f2f', fontWeight: 600 }}>
                      Rule 8: 8 Points Beyond 1σ
                    </Typography>
                    <Typography variant="body2">
                      8 consecutive points all beyond ±1σ (either side)
                      <br /><strong>Indicates:</strong> Mixture (two distributions)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>

          <Alert severity="info" sx={{ my: 2 }}>
            <strong>How to Use These Rules:</strong> Apply them systematically to every control chart.
            Any violation signals a special cause — investigate and take action!
          </Alert>

          <Alert severity="warning" sx={{ my: 2 }}>
            <strong>False Alarms:</strong> Using multiple rules increases false alarm rates. Balance
            sensitivity (catching real problems) with specificity (avoiding false alarms).
          </Alert>
        </Box>
      )
    },
    {
      label: 'Summary: Variables Control Charts',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Key Takeaways
          </Typography>

          <Paper sx={{ p: 3, bgcolor: '#f5f5f5', my: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              1. Variables Charts Monitor Continuous Data
            </Typography>
            <Typography variant="body2" paragraph>
              • More sensitive than attributes charts
              <br />• Use actual measurements (not just pass/fail)
              <br />• Detect smaller process shifts faster
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              2. Always Use TWO Charts
            </Typography>
            <Typography variant="body2" paragraph>
              • One chart for location (X̄ or I)
              <br />• One chart for spread (R, S, or MR)
              <br />• Analyze spread chart first!
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              3. Control Limit Calculations
            </Typography>
            <Typography variant="body2" paragraph>
              • Use control chart constants (A₂, D₃, D₄, etc.)
              <br />• Constants depend on subgroup size
              <br />• Based on ±3σ from the center line
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              4. Western Electric Rules Enhance Detection
            </Typography>
            <Typography variant="body2">
              • Detect patterns within control limits
              <br />• 8 rules for common special cause patterns
              <br />• Systematic approach to interpretation
            </Typography>
          </Paper>

          <Table size="small" sx={{ mt: 3 }}>
            <TableHead>
              <TableRow>
                <TableCell><strong>Chart Type</strong></TableCell>
                <TableCell><strong>When to Use</strong></TableCell>
                <TableCell><strong>Subgroup Size</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>X̄-R</TableCell>
                <TableCell>Most common; general purpose</TableCell>
                <TableCell>n = 2-10</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>X̄-S</TableCell>
                <TableCell>Larger subgroups; more efficient</TableCell>
                <TableCell>n {'>'} 10</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>I-MR</TableCell>
                <TableCell>Single measurements; slow/expensive tests</TableCell>
                <TableCell>n = 1</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Alert severity="success" sx={{ my: 3 }}>
            <strong>Next Lesson:</strong> Learn attributes control charts (p, np, c, u) for count data
            and proportions — when measurements aren't continuous!
          </Alert>

          <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={handleComplete}
              fullWidth
            >
              Complete Lesson 2
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
          Lesson 2: Variables Control Charts
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Master X̄-R, X̄-S, and I-MR charts for monitoring continuous measurements
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
              Lesson 2 Complete! 🎉
            </Typography>
            <Typography paragraph>
              You've mastered variables control charts and Western Electric rules!
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

export default Lesson02_VariablesControlCharts;
