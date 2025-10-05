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
 * Lesson 3: Attributes Control Charts
 *
 * Covers:
 * - p-charts (proportion defective)
 * - np-charts (number defective)
 * - c-charts (count of defects)
 * - u-charts (defects per unit)
 * - When to use each type
 *
 * Interactive: Build attribute charts and choose the right type
 */

const Lesson03_AttributesControlCharts = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);

  // Interactive state
  const [sampleSize, setSampleSize] = useState(100);
  const [defectRate, setDefectRate] = useState(0.05);

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

      // Extract proportions as individual measurements for I-MR chart analysis
      const measurements = proportionData.map(d => d.proportion);

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

  // Generate sample data for p and np charts
  const proportionData = useMemo(() => {
    const data = [];
    const numSamples = 25;

    for (let i = 0; i < numSamples; i++) {
      // Simulate defective items
      const n = sampleSize;
      const expectedDefects = n * defectRate;
      // Add some variation
      const defective = Math.max(0, Math.round(expectedDefects + (Math.random() - 0.5) * Math.sqrt(expectedDefects) * 3));
      const proportion = defective / n;

      data.push({
        sample: i + 1,
        n: n,
        defective: defective,
        proportion: Number(proportion.toFixed(4))
      });
    }

    return data;
  }, [sampleSize, defectRate]);

  // Calculate control limits for p-chart
  const pChartLimits = useMemo(() => {
    const pBar = proportionData.reduce((sum, d) => sum + d.proportion, 0) / proportionData.length;
    const n = sampleSize;
    const stdErr = Math.sqrt((pBar * (1 - pBar)) / n);

    return {
      center: pBar,
      ucl: Math.min(1, pBar + 3 * stdErr),
      lcl: Math.max(0, pBar - 3 * stdErr)
    };
  }, [proportionData, sampleSize]);

  // Generate sample data for c and u charts
  const defectsData = useMemo(() => {
    const data = [];
    const numSamples = 25;
    const avgDefectsPerUnit = 3;

    for (let i = 0; i < numSamples; i++) {
      // Simulate defects (Poisson-like)
      const lambda = avgDefectsPerUnit;
      const defects = Math.max(0, Math.round(lambda + (Math.random() - 0.5) * Math.sqrt(lambda) * 3));

      data.push({
        sample: i + 1,
        defects: defects,
        defectsPerUnit: defects // Assuming 1 unit inspected
      });
    }

    return data;
  }, []);

  // Calculate control limits for c-chart
  const cChartLimits = useMemo(() => {
    const cBar = defectsData.reduce((sum, d) => sum + d.defects, 0) / defectsData.length;

    return {
      center: cBar,
      ucl: cBar + 3 * Math.sqrt(cBar),
      lcl: Math.max(0, cBar - 3 * Math.sqrt(cBar))
    };
  }, [defectsData]);

  const steps = [
    {
      label: 'Introduction: Count Data and Proportions',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Monitoring Defects and Nonconformances
          </Typography>

          <Typography paragraph>
            Variables charts monitor <strong>continuous measurements</strong>. But what if you're counting
            <strong> defective items</strong> or <strong>defects per unit</strong>? That's where attributes
            charts come in.
          </Typography>

          <Alert severity="info" sx={{ my: 2 }}>
            <strong>Key Distinction:</strong>
            <br />• <strong>Defective:</strong> An item that doesn't meet specifications (pass/fail)
            <br />• <strong>Defect:</strong> A specific nonconformance on an item (an item can have multiple defects)
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
            Four Main Types of Attributes Charts
          </Typography>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: '#e3f2fd', height: '100%' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2', mb: 1 }}>
                  p-Chart
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Proportion Defective</strong>
                </Typography>
                <Typography variant="caption">
                  • Data: Fraction defective (0 to 1)
                  <br />• Sample size: Can vary
                  <br />• Example: % of loans rejected
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: '#e8f5e9', height: '100%' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2e7d32', mb: 1 }}>
                  np-Chart
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Number Defective</strong>
                </Typography>
                <Typography variant="caption">
                  • Data: Count of defective items
                  <br />• Sample size: Must be constant
                  <br />• Example: # of defective parts per batch
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: '#fff3e0', height: '100%' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#ed6c02', mb: 1 }}>
                  c-Chart
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Count of Defects</strong>
                </Typography>
                <Typography variant="caption">
                  • Data: Number of defects per unit
                  <br />• Sample size: Constant (usually 1 unit)
                  <br />• Example: # of scratches on a car hood
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: '#f3e5f5', height: '100%' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#9c27b0', mb: 1 }}>
                  u-Chart
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Defects Per Unit</strong>
                </Typography>
                <Typography variant="caption">
                  • Data: Average defects per unit
                  <br />• Sample size: Can vary (different # of units)
                  <br />• Example: Errors per 1000 lines of code
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Alert severity="warning" sx={{ mt: 3 }}>
            <strong>When to Use Attributes Charts:</strong>
            <br />• Data is pass/fail, yes/no, go/no-go
            <br />• Counting defects or defective items
            <br />• Can't measure continuously (e.g., scratches, typos, errors)
            <br />• Less sensitive than variables charts but easier to collect data
          </Alert>
        </Box>
      )
    },
    {
      label: 'Theory: p-Chart and np-Chart',
      content: (
        <MathJaxContext>
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
              Charts for Defective Items
            </Typography>

            <Typography paragraph>
              p-charts and np-charts monitor the <strong>number or proportion of defective items</strong>
              in a sample. Use them when each item is classified as conforming or non conforming (defective).
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
              p-Chart: Proportion Defective
            </Typography>

            <Typography paragraph>
              For each sample i with <MathJax inline>{"\\(n_i\\)"}</MathJax> items inspected and{' '}
              <MathJax inline>{"\\(d_i\\)"}</MathJax> defective items:
            </Typography>

            <MathJax>
              {"\\[ p_i = \\frac{d_i}{n_i} \\]"}
            </MathJax>

            <Typography paragraph sx={{ mt: 2 }}>
              Average proportion defective (center line):
            </Typography>

            <MathJax>
              {"\\[ \\bar{p} = \\frac{\\sum d_i}{\\sum n_i} \\]"}
            </MathJax>

            <Typography paragraph sx={{ mt: 2 }}>
              Control limits (assuming binomial distribution):
            </Typography>

            <MathJax>
              {"\\[ \\text{UCL}_p = \\bar{p} + 3\\sqrt{\\frac{\\bar{p}(1-\\bar{p})}{n}} \\]"}
            </MathJax>

            <MathJax>
              {"\\[ \\text{LCL}_p = \\bar{p} - 3\\sqrt{\\frac{\\bar{p}(1-\\bar{p})}{n}} \\]"}
            </MathJax>

            <Alert severity="info" sx={{ my: 2 }}>
              If LCL comes out negative, set it to zero (proportions can't be negative).
            </Alert>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
              np-Chart: Number Defective
            </Typography>

            <Typography paragraph>
              If sample size n is constant, you can plot the number defective directly:
            </Typography>

            <MathJax>
              {"\\[ \\text{UCL}_{np} = n\\bar{p} + 3\\sqrt{n\\bar{p}(1-\\bar{p})} \\]"}
            </MathJax>

            <MathJax>
              {"\\[ \\text{Center Line} = n\\bar{p} \\]"}
            </MathJax>

            <MathJax>
              {"\\[ \\text{LCL}_{np} = n\\bar{p} - 3\\sqrt{n\\bar{p}(1-\\bar{p})} \\]"}
            </MathJax>

            <Table size="small" sx={{ mt: 3 }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Chart</strong></TableCell>
                  <TableCell><strong>Plot</strong></TableCell>
                  <TableCell><strong>Sample Size</strong></TableCell>
                  <TableCell><strong>Use When</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>p-chart</TableCell>
                  <TableCell>Proportion (0 to 1)</TableCell>
                  <TableCell>Can vary</TableCell>
                  <TableCell>Sample sizes differ</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>np-chart</TableCell>
                  <TableCell>Count</TableCell>
                  <TableCell>Must be constant</TableCell>
                  <TableCell>Same sample size each time</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Alert severity="warning" sx={{ mt: 2 }}>
              <strong>Important:</strong> p and np charts assume a <strong>constant defect rate</strong>.
              If the rate changes, the limits will be wrong!
            </Alert>
          </Box>
        </MathJaxContext>
      )
    },
    {
      label: 'Interactive: Build p-Chart and np-Chart',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Interactive p-Chart Builder
          </Typography>

          <Typography paragraph>
            Adjust the parameters to see how sample size and defect rate affect the control chart.
          </Typography>

          <Paper sx={{ p: 3, bgcolor: '#f5f5f5', my: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                  Sample Size (n):
                </Typography>
                <Slider
                  value={sampleSize}
                  onChange={(e, val) => setSampleSize(val)}
                  min={50}
                  max={200}
                  step={25}
                  marks
                  valueLabelDisplay="on"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                  True Defect Rate (p):
                </Typography>
                <Slider
                  value={defectRate}
                  onChange={(e, val) => setDefectRate(val)}
                  min={0.01}
                  max={0.15}
                  step={0.01}
                  marks={[
                    { value: 0.01, label: '1%' },
                    { value: 0.05, label: '5%' },
                    { value: 0.10, label: '10%' },
                    { value: 0.15, label: '15%' }
                  ]}
                  valueLabelDisplay="on"
                  valueLabelFormat={(val) => `${(val * 100).toFixed(0)}%`}
                />
              </Grid>
            </Grid>

            {/* p-Chart Visualization */}
            <Paper sx={{ p: 2, bgcolor: 'white', mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom align="center" sx={{ fontWeight: 600 }}>
                p-Chart: Proportion Defective
              </Typography>
              <svg width="100%" height="300" style={{ border: '1px solid #ddd' }}>
                {/* Axes */}
                <line x1="50" y1="250" x2="750" y2="250" stroke="#666" strokeWidth="2" />
                <line x1="50" y1="50" x2="50" y2="250" stroke="#666" strokeWidth="2" />

                {/* Control limits */}
                <line
                  x1="50"
                  y1={250 - (pChartLimits.ucl * 200 / 0.2)}
                  x2="750"
                  y2={250 - (pChartLimits.ucl * 200 / 0.2)}
                  stroke="#d32f2f"
                  strokeWidth="1.5"
                  strokeDasharray="5,5"
                />
                <line
                  x1="50"
                  y1={250 - (pChartLimits.center * 200 / 0.2)}
                  x2="750"
                  y2={250 - (pChartLimits.center * 200 / 0.2)}
                  stroke="#2e7d32"
                  strokeWidth="2"
                />
                <line
                  x1="50"
                  y1={250 - (pChartLimits.lcl * 200 / 0.2)}
                  x2="750"
                  y2={250 - (pChartLimits.lcl * 200 / 0.2)}
                  stroke="#d32f2f"
                  strokeWidth="1.5"
                  strokeDasharray="5,5"
                />

                {/* Plot data points */}
                {proportionData.map((point, i) => {
                  const x = 50 + (i * (700 / (proportionData.length - 1)));
                  const y = 250 - (point.proportion * 200 / 0.2);
                  const outOfControl = point.proportion > pChartLimits.ucl ||
                                      point.proportion < pChartLimits.lcl;

                  return (
                    <g key={i}>
                      {i > 0 && (
                        <line
                          x1={50 + ((i - 1) * (700 / (proportionData.length - 1)))}
                          y1={250 - (proportionData[i - 1].proportion * 200 / 0.2)}
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
                <text x="400" y="280" fontSize="12" textAnchor="middle">Sample Number</text>
                <text x="25" y="150" fontSize="12" textAnchor="middle" transform="rotate(-90, 25, 150)">Proportion Defective</text>
                <text x="755" y={250 - (pChartLimits.ucl * 200 / 0.2)} fontSize="10">UCL</text>
                <text x="755" y={250 - (pChartLimits.center * 200 / 0.2)} fontSize="10">p̄</text>
                <text x="755" y={250 - (pChartLimits.lcl * 200 / 0.2)} fontSize="10">LCL</text>
              </svg>

              <Typography variant="caption" display="block" align="center" sx={{ mt: 1 }}>
                UCL = {pChartLimits.ucl.toFixed(4)} ({(pChartLimits.ucl * 100).toFixed(2)}%),
                p̄ = {pChartLimits.center.toFixed(4)} ({(pChartLimits.center * 100).toFixed(2)}%),
                LCL = {pChartLimits.lcl.toFixed(4)} ({(pChartLimits.lcl * 100).toFixed(2)}%)
              </Typography>
            </Paper>

            <Alert severity="success" sx={{ mt: 2 }}>
              <strong>Observation:</strong> Larger sample sizes produce narrower control limits (more
              precise estimates). Lower defect rates also produce narrower limits.
            </Alert>

            {/* Backend Integration Section */}
            <Box sx={{ mt: 4, p: 3, bgcolor: '#e8f5e9', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 600 }}>
                🔬 Test with Backend API (Real Statistical Engine)
              </Typography>
              <Typography variant="body2" paragraph sx={{ color: 'text.secondary' }}>
                Connect to the Django backend to analyze proportion data with real SciPy/NumPy calculations.
                The backend will treat proportions as individual measurements and perform I-MR chart analysis
                with professional matplotlib visualization.
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
                    Analyzing Proportions with Backend...
                  </>
                ) : (
                  '🔬 Analyze Proportions with Backend API'
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
                    Backend Analysis Results (I-MR Chart for Proportions)
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
                        label={`UCL: ${backendResults.results?.upper_control_limit?.toFixed(4) || 'N/A'}`}
                        color="error"
                        sx={{ width: '100%' }}
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Chip
                        label={`CL: ${backendResults.results?.center_line?.toFixed(4) || 'N/A'}`}
                        color="success"
                        sx={{ width: '100%' }}
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Chip
                        label={`LCL: ${backendResults.results?.lower_control_limit?.toFixed(4) || 'N/A'}`}
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
                        Backend-Generated I-MR Chart for Proportions (matplotlib SVG)
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
                    using SciPy/NumPy for calculations and matplotlib for visualization. Proportions are
                    treated as individual measurements for I-MR chart analysis, which is statistically
                    valid for monitoring attribute data over time!
                  </Alert>
                </Box>
              )}
            </Box>
          </Paper>
        </Box>
      )
    },
    {
      label: 'Theory: c-Chart and u-Chart',
      content: (
        <MathJaxContext>
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
              Charts for Defects (Not Defectives)
            </Typography>

            <Typography paragraph>
              c-charts and u-charts monitor the <strong>number of defects</strong> found in a unit
              or area of opportunity. Unlike p and np charts (which count defective items), these charts
              count individual defects — an item can have multiple defects and still not be "defective."
            </Typography>

            <Alert severity="info" sx={{ my: 2 }}>
              <strong>Examples:</strong>
              <br />• Number of scratches on a painted surface
              <br />• Typos per page in a document
              <br />• Software bugs per module
              <br />• Solder defects per circuit board
            </Alert>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
              c-Chart: Count of Defects
            </Typography>

            <Typography paragraph>
              Assumes <strong>constant sample size</strong> (same area of opportunity each time).
              Defects follow a <strong>Poisson distribution</strong>.
            </Typography>

            <MathJax>
              {"\\[ \\bar{c} = \\frac{\\sum c_i}{k} \\quad \\text{(Average count)} \\]"}
            </MathJax>

            <Typography paragraph sx={{ mt: 2 }}>
              Control limits:
            </Typography>

            <MathJax>
              {"\\[ \\text{UCL}_c = \\bar{c} + 3\\sqrt{\\bar{c}} \\]"}
            </MathJax>

            <MathJax>
              {"\\[ \\text{Center Line} = \\bar{c} \\]"}
            </MathJax>

            <MathJax>
              {"\\[ \\text{LCL}_c = \\bar{c} - 3\\sqrt{\\bar{c}} \\]"}
            </MathJax>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
              u-Chart: Defects Per Unit
            </Typography>

            <Typography paragraph>
              Allows <strong>varying sample sizes</strong> (different areas of opportunity). Plots
              defects per unit rather than total defects.
            </Typography>

            <MathJax>
              {"\\[ u_i = \\frac{c_i}{n_i} \\quad \\text{(Defects per unit)} \\]"}
            </MathJax>

            <MathJax>
              {"\\[ \\bar{u} = \\frac{\\sum c_i}{\\sum n_i} \\]"}
            </MathJax>

            <Typography paragraph sx={{ mt: 2 }}>
              Control limits (vary with <MathJax inline>{"\\(n_i\\)"}</MathJax>):
            </Typography>

            <MathJax>
              {"\\[ \\text{UCL}_{u_i} = \\bar{u} + 3\\sqrt{\\frac{\\bar{u}}{n_i}} \\]"}
            </MathJax>

            <MathJax>
              {"\\[ \\text{LCL}_{u_i} = \\bar{u} - 3\\sqrt{\\frac{\\bar{u}}{n_i}} \\]"}
            </MathJax>

            <Table size="small" sx={{ mt: 3 }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Chart</strong></TableCell>
                  <TableCell><strong>Plot</strong></TableCell>
                  <TableCell><strong>Sample Size</strong></TableCell>
                  <TableCell><strong>Distribution</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>c-chart</TableCell>
                  <TableCell>Count of defects</TableCell>
                  <TableCell>Constant</TableCell>
                  <TableCell>Poisson</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>u-chart</TableCell>
                  <TableCell>Defects per unit</TableCell>
                  <TableCell>Can vary</TableCell>
                  <TableCell>Poisson</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Alert severity="warning" sx={{ mt: 2 }}>
              <strong>Poisson Assumptions:</strong> Defects occur randomly, independently, at a constant
              rate over the area of opportunity. If these don't hold, control limits may be invalid.
            </Alert>
          </Box>
        </MathJaxContext>
      )
    },
    {
      label: 'Practice: Choosing the Right Chart',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Decision Tree: Which Attribute Chart?
          </Typography>

          <Typography paragraph>
            Follow this decision tree to choose the appropriate attributes control chart:
          </Typography>

          <Paper sx={{ p: 3, bgcolor: '#e3f2fd', my: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Step 1: Defectives or Defects?
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: 'white' }}>
                  <Typography variant="subtitle2" sx={{ color: '#1976d2', fontWeight: 600 }}>
                    Counting Defective Items
                  </Typography>
                  <Typography variant="body2" paragraph sx={{ mt: 1 }}>
                    Each item is pass/fail
                    <br />→ Use p-chart or np-chart
                  </Typography>
                  <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                    Examples: defective light bulbs, rejected loans, failed tests
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: 'white' }}>
                  <Typography variant="subtitle2" sx={{ color: '#ed6c02', fontWeight: 600 }}>
                    Counting Defects
                  </Typography>
                  <Typography variant="body2" paragraph sx={{ mt: 1 }}>
                    Counting occurrences in area
                    <br />→ Use c-chart or u-chart
                  </Typography>
                  <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                    Examples: scratches, errors, bugs, nonconformances
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
              Step 2: Sample Size Constant or Variable?
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Data Type</strong></TableCell>
                  <TableCell><strong>Constant n</strong></TableCell>
                  <TableCell><strong>Variable n</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Defective items</TableCell>
                  <TableCell><strong>np-chart</strong></TableCell>
                  <TableCell><strong>p-chart</strong></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Defects</TableCell>
                  <TableCell><strong>c-chart</strong></TableCell>
                  <TableCell><strong>u-chart</strong></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Paper>

          <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
            Practice Scenarios
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Scenario 1: Final Inspection
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Inspect 100 parts per hour. Record number that fail inspection.
                  </Typography>
                  <Alert severity="success" sx={{ py: 0.5 }}>
                    <Typography variant="caption">
                      <strong>Answer:</strong> np-chart (constant n, defective items)
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Scenario 2: Daily Audits
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Audit different number of transactions each day. Calculate % with errors.
                  </Typography>
                  <Alert severity="success" sx={{ py: 0.5 }}>
                    <Typography variant="caption">
                      <strong>Answer:</strong> p-chart (variable n, defective items)
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Scenario 3: Surface Defects
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Inspect 1 refrigerator door per shift. Count scratches and dents.
                  </Typography>
                  <Alert severity="success" sx={{ py: 0.5 }}>
                    <Typography variant="caption">
                      <strong>Answer:</strong> c-chart (constant area, counting defects)
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Scenario 4: Software Bugs
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Code modules vary in size. Track bugs per 1000 lines of code.
                  </Typography>
                  <Alert severity="success" sx={{ py: 0.5 }}>
                    <Typography variant="caption">
                      <strong>Answer:</strong> u-chart (variable area, defects per unit)
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )
    },
    {
      label: 'Summary: Attributes Control Charts',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Key Takeaways
          </Typography>

          <Paper sx={{ p: 3, bgcolor: '#f5f5f5', my: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              1. Four Types for Different Data
            </Typography>
            <Typography variant="body2" paragraph>
              • <strong>p-chart:</strong> Proportion defective (variable n)
              <br />• <strong>np-chart:</strong> Number defective (constant n)
              <br />• <strong>c-chart:</strong> Count of defects (constant area)
              <br />• <strong>u-chart:</strong> Defects per unit (variable area)
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              2. Defectives vs Defects
            </Typography>
            <Typography variant="body2" paragraph>
              • <strong>Defective:</strong> Item fails inspection (yes/no) → p or np
              <br />• <strong>Defect:</strong> Specific nonconformance, can have many per item → c or u
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              3. Sample Size Matters
            </Typography>
            <Typography variant="body2" paragraph>
              • Constant n → np-chart or c-chart (simpler)
              <br />• Variable n → p-chart or u-chart (more flexible, limits vary)
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              4. Less Sensitive Than Variables Charts
            </Typography>
            <Typography variant="body2">
              • Attributes charts need larger shifts to detect
              <br />• But easier to collect data (no precise measurements)
              <br />• Often the only option for pass/fail data
            </Typography>
          </Paper>

          <Alert severity="info" sx={{ my: 2 }}>
            <strong>Tip:</strong> If you can collect measurement data, use variables charts (X̄-R, X̄-S, I-MR)
            instead. They're more sensitive and provide more information. But when you can only count,
            attributes charts are your tool!
          </Alert>

          <Table size="small" sx={{ mt: 3 }}>
            <TableHead>
              <TableRow>
                <TableCell><strong>Chart</strong></TableCell>
                <TableCell><strong>Formula (UCL)</strong></TableCell>
                <TableCell><strong>Distribution</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>p-chart</TableCell>
                <TableCell>p̄ + 3√[p̄(1-p̄)/n]</TableCell>
                <TableCell>Binomial</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>np-chart</TableCell>
                <TableCell>np̄ + 3√[np̄(1-p̄)]</TableCell>
                <TableCell>Binomial</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>c-chart</TableCell>
                <TableCell>c̄ + 3√c̄</TableCell>
                <TableCell>Poisson</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>u-chart</TableCell>
                <TableCell>ū + 3√(ū/n)</TableCell>
                <TableCell>Poisson</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Alert severity="success" sx={{ my: 3 }}>
            <strong>Next Lesson:</strong> Process Capability Analysis — learn Cp, Cpk, Pp, Ppk and
            how to assess if your process can meet customer specifications!
          </Alert>

          <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={handleComplete}
              fullWidth
            >
              Complete Lesson 3
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
          Lesson 3: Attributes Control Charts
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Master p, np, c, and u charts for monitoring count data and proportions
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
              Lesson 3 Complete! 🎉
            </Typography>
            <Typography paragraph>
              You've mastered all four types of attributes control charts!
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

export default Lesson03_AttributesControlCharts;
