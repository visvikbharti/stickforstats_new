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
 * Lesson 5: Measurement System Analysis
 *
 * Covers:
 * - Importance of measurement reliability
 * - Gage R&R study design and analysis
 * - Repeatability vs Reproducibility
 * - Acceptance criteria and interpretation
 *
 * Interactive: Simulated Gage R&R study
 */

const Lesson05_MSA = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);

  // Backend API integration - Quick MSA API (no auth required!)
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

  // Simulated Gage R&R data
  const gageRRData = useMemo(() => {
    // 10 parts, 3 operators, 2 trials
    const partVariation = 5;  // True variation between parts
    const repeatability = 0.8;  // Equipment variation
    const reproducibility = 0.5;  // Operator variation

    const data = [];
    for (let part = 1; part <= 10; part++) {
      const trueValue = 100 + (part - 5.5) * partVariation;
      for (let operator = 1; operator <= 3; operator++) {
        const operatorBias = (operator - 2) * reproducibility;
        for (let trial = 1; trial <= 2; trial++) {
          const measurement = trueValue + operatorBias + (Math.random() - 0.5) * repeatability * 2;
          data.push({
            part,
            operator: `Operator ${operator}`,
            trial,
            measurement: Number(measurement.toFixed(2))
          });
        }
      }
    }

    // Calculate statistics
    const measurements = data.map(d => d.measurement);
    const totalVariation = Math.sqrt(measurements.reduce((sum, val) => {
      const mean = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      return sum + Math.pow(val - mean, 2);
    }, 0) / (measurements.length - 1));

    const rrVariation = Math.sqrt(Math.pow(repeatability, 2) + Math.pow(reproducibility, 2));
    const partVar = partVariation * 2;  // Approximate

    const rrPercent = (rrVariation / totalVariation) * 100;
    const repeatPercent = (repeatability / totalVariation) * 100;
    const reproducPercent = (reproducibility / totalVariation) * 100;
    const partPercent = (partVar / totalVariation) * 100;

    return {
      data,
      totalVariation: Number(totalVariation.toFixed(2)),
      rrVariation: Number(rrVariation.toFixed(2)),
      repeatability: Number(repeatability.toFixed(2)),
      reproducibility: Number(reproducibility.toFixed(2)),
      partVariation: Number(partVar.toFixed(2)),
      rrPercent: Number(rrPercent.toFixed(1)),
      repeatPercent: Number(repeatPercent.toFixed(1)),
      reproducPercent: Number(reproducPercent.toFixed(1)),
      partPercent: Number(partPercent.toFixed(1))
    };
  }, []);

  // REAL backend integration - Transform data and call Quick MSA API
  const handleTestBackendAPI = async () => {
    setIsLoadingBackend(true);
    setBackendResults(null);

    try {
      // Transform frontend data structure to backend format
      // Backend expects: { "Part1": { "Operator1": [trial1, trial2], "Operator2": [...] } }
      const measurements = {};

      gageRRData.data.forEach(row => {
        const partKey = `Part${row.part}`;
        const opKey = row.operator.replace(' ', '');

        if (!measurements[partKey]) {
          measurements[partKey] = {};
        }
        if (!measurements[partKey][opKey]) {
          measurements[partKey][opKey] = [];
        }
        measurements[partKey][opKey].push(row.measurement);
      });

      // Call REAL backend Quick MSA API (public endpoint, no auth!)
      const response = await fetch('http://localhost:8000/api/v1/sqc-analysis/quick-msa/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          msa_type: 'gage_rr',
          measurements: measurements
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

  const getAcceptability = (percent) => {
    if (percent < 10) return { rating: 'Acceptable', color: '#2e7d32' };
    if (percent < 30) return { rating: 'Marginal', color: '#ed6c02' };
    return { rating: 'Unacceptable', color: '#d32f2f' };
  };

  const rrAcceptability = getAcceptability(gageRRData.rrPercent);

  const steps = [
    {
      label: 'Introduction: Why Measurement System Analysis?',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Garbage In, Garbage Out
          </Typography>

          <Typography paragraph>
            Before improving a process or assessing capability, you must ensure your <strong>measurements
            are reliable</strong>. If your measurement system is flawed, all downstream analysis is worthless!
          </Typography>

          <Alert severity="error" sx={{ my: 2 }}>
            <strong>Critical Question:</strong> How much of the observed variation is due to the
            <em> measurement system</em> versus the <em>actual process</em>?
          </Alert>

          <Typography paragraph>
            <strong>Measurement System Analysis (MSA)</strong> quantifies the quality of your measurement
            system and ensures it's adequate for its intended use.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
            Sources of Measurement Variation
          </Typography>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, bgcolor: '#e3f2fd', height: '100%' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2', mb: 2 }}>
                  Repeatability (Equipment Variation)
                </Typography>
                <Typography variant="body2">
                  • <strong>Same operator, same part, multiple trials</strong>
                  <br />• Variation from the equipment itself
                  <br />• Also called <em>test-retest error</em>
                  <br />• Sources: instrument precision, environmental conditions, fixturing
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, bgcolor: '#e8f5e9', height: '100%' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2e7d32', mb: 2 }}>
                  Reproducibility (Operator Variation)
                </Typography>
                <Typography variant="body2">
                  • <strong>Different operators, same part</strong>
                  <br />• Variation between operators
                  <br />• Also called <em>appraiser variation</em>
                  <br />• Sources: technique differences, training, interpretation
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Typography paragraph sx={{ mt: 3 }}>
            <strong>Gage R&R (Repeatability & Reproducibility)</strong> is the most common MSA method.
            It decomposes total observed variation into:
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fff3e0', my: 2 }}>
            <Typography variant="body2" align="center" sx={{ fontWeight: 600 }}>
              Total Variation = Part Variation + Gage R&R (Repeatability + Reproducibility)
            </Typography>
          </Paper>

          <Alert severity="success" sx={{ my: 2 }}>
            <strong>Goal:</strong> Ensure Gage R&R contributes <strong>less than 10%</strong> of total
            variation. This means 90%+ of observed variation is real process/part variation!
          </Alert>
        </Box>
      )
    },
    {
      label: 'Theory: Gage R&R Study Design',
      content: (
        <MathJaxContext>
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
              Crossed Gage R&R Study
            </Typography>

            <Typography paragraph>
              The most common Gage R&R design is a <strong>crossed study</strong>:
            </Typography>

            <Paper sx={{ p: 3, bgcolor: '#f5f5f5', my: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Study Design Parameters:
              </Typography>
              <Typography variant="body2" paragraph>
                • <strong>Parts:</strong> 10 parts (minimum) spanning process variation
                <br />• <strong>Operators:</strong> 2-3 operators (appraisers)
                <br />• <strong>Trials:</strong> 2-3 repeat measurements per operator-part combination
                <br />• <strong>Order:</strong> Randomize to avoid bias
              </Typography>
              <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                Example: 10 parts × 3 operators × 2 trials = 60 total measurements
              </Typography>
            </Paper>

            <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
              ANOVA Method for Gage R&R
            </Typography>

            <Typography paragraph>
              The ANOVA (Analysis of Variance) method partitions total variation:
            </Typography>

            <MathJax>
              {"\\[ \\sigma_{\\text{Total}}^2 = \\sigma_{\\text{Part}}^2 + \\sigma_{\\text{Repeatability}}^2 + \\sigma_{\\text{Reproducibility}}^2 \\]"}
            </MathJax>

            <Typography paragraph sx={{ mt: 2 }}>
              Where:
            </Typography>
            <Typography component="div" variant="body2" sx={{ pl: 2 }}>
              • <MathJax inline>{"\\(\\sigma_{\\text{Part}}^2\\)"}</MathJax> = Variation between parts (good!)
              <br />• <MathJax inline>{"\\(\\sigma_{\\text{Repeatability}}^2\\)"}</MathJax> = Equipment variation (bad)
              <br />• <MathJax inline>{"\\(\\sigma_{\\text{Reproducibility}}^2\\)"}</MathJax> = Operator variation (bad)
            </Typography>

            <Typography paragraph sx={{ mt: 2 }}>
              <strong>Gage R&R</strong> combines the two "bad" sources:
            </Typography>

            <MathJax>
              {"\\[ \\sigma_{\\text{R\\&R}}^2 = \\sigma_{\\text{Repeatability}}^2 + \\sigma_{\\text{Reproducibility}}^2 \\]"}
            </MathJax>

            <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
              Acceptance Criteria
            </Typography>

            <Table size="small" sx={{ mt: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>%R&R of Total Variation</strong></TableCell>
                  <TableCell><strong>Rating</strong></TableCell>
                  <TableCell><strong>Action</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                  <TableCell>{'<'} 10%</TableCell>
                  <TableCell>Acceptable</TableCell>
                  <TableCell>Measurement system is adequate</TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: '#fff3e0' }}>
                  <TableCell>10% - 30%</TableCell>
                  <TableCell>Marginal</TableCell>
                  <TableCell>May be acceptable depending on application, cost, etc.</TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: '#ffebee' }}>
                  <TableCell>{'>'} 30%</TableCell>
                  <TableCell>Unacceptable</TableCell>
                  <TableCell>Improve measurement system before using for decisions</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>Rule of Thumb:</strong> The measurement system should consume less than 10% of the
              tolerance (or 30% of process variation). If %R&R {'>'} 30%, the measurement system is
              inadequate and must be improved!
            </Alert>

            <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
              Number of Distinct Categories (NDC)
            </Typography>

            <Typography paragraph>
              Another metric is the <strong>Number of Distinct Categories (NDC)</strong>:
            </Typography>

            <MathJax>
              {"\\[ \\text{NDC} = \\left\\lfloor 1.41 \\times \\frac{\\sigma_{\\text{Part}}}{\\sigma_{\\text{R\\&R}}} \\right\\rfloor \\]"}
            </MathJax>

            <Typography paragraph sx={{ mt: 2 }}>
              • <strong>NDC ≥ 5:</strong> Measurement system can distinguish parts adequately
              <br />• <strong>NDC {'<'} 5:</strong> System has poor discrimination
            </Typography>
          </Box>
        </MathJaxContext>
      )
    },
    {
      label: 'Interactive: Simulated Gage R&R Study',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Example Gage R&R Study Results
          </Typography>

          <Typography paragraph>
            Below is a simulated Gage R&R study with 10 parts, 3 operators, and 2 trials each.
          </Typography>

          <Paper sx={{ p: 3, bgcolor: '#f5f5f5', my: 2 }}>
            {/* Results Summary */}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ bgcolor: rrAcceptability.color, color: 'white' }}>
                  <CardContent>
                    <Typography variant="h4" align="center" sx={{ fontWeight: 700 }}>
                      %R&R = {gageRRData.rrPercent}%
                    </Typography>
                    <Typography variant="subtitle1" align="center">
                      {rrAcceptability.rating}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" paragraph>
                      <strong>Total Variation:</strong> {gageRRData.totalVariation}
                    </Typography>
                    <Typography variant="body2" paragraph>
                      <strong>Gage R&R:</strong> {gageRRData.rrVariation}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Part Variation:</strong> {gageRRData.partVariation}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Variance Components */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
              Variance Components Breakdown:
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Source</strong></TableCell>
                  <TableCell><strong>Std Dev</strong></TableCell>
                  <TableCell><strong>% of Total</strong></TableCell>
                  <TableCell><strong>Contribution</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                  <TableCell>Part-to-Part</TableCell>
                  <TableCell>{gageRRData.partVariation}</TableCell>
                  <TableCell>{gageRRData.partPercent}%</TableCell>
                  <TableCell>
                    <Box sx={{ width: '100%', bgcolor: '#c8e6c9', height: 20, borderRadius: 1 }}>
                      <Box sx={{ width: `${gageRRData.partPercent}%`, bgcolor: '#2e7d32', height: '100%', borderRadius: 1 }} />
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: '#fff3e0' }}>
                  <TableCell>Gage R&R</TableCell>
                  <TableCell>{gageRRData.rrVariation}</TableCell>
                  <TableCell>{gageRRData.rrPercent}%</TableCell>
                  <TableCell>
                    <Box sx={{ width: '100%', bgcolor: '#ffe0b2', height: 20, borderRadius: 1 }}>
                      <Box sx={{ width: `${gageRRData.rrPercent}%`, bgcolor: '#ed6c02', height: '100%', borderRadius: 1 }} />
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                  <TableCell sx={{ pl: 4 }}>• Repeatability</TableCell>
                  <TableCell>{gageRRData.repeatability}</TableCell>
                  <TableCell>{gageRRData.repeatPercent}%</TableCell>
                  <TableCell>
                    <Box sx={{ width: '100%', bgcolor: '#bbdefb', height: 20, borderRadius: 1 }}>
                      <Box sx={{ width: `${gageRRData.repeatPercent}%`, bgcolor: '#1976d2', height: '100%', borderRadius: 1 }} />
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: '#f3e5f5' }}>
                  <TableCell sx={{ pl: 4 }}>• Reproducibility</TableCell>
                  <TableCell>{gageRRData.reproducibility}</TableCell>
                  <TableCell>{gageRRData.reproducPercent}%</TableCell>
                  <TableCell>
                    <Box sx={{ width: '100%', bgcolor: '#e1bee7', height: 20, borderRadius: 1 }}>
                      <Box sx={{ width: `${gageRRData.reproducPercent}%`, bgcolor: '#9c27b0', height: '100%', borderRadius: 1 }} />
                    </Box>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {/* Sample Data Table */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
              Sample Measurements (First 12 of 60):
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Part</strong></TableCell>
                  <TableCell><strong>Operator</strong></TableCell>
                  <TableCell><strong>Trial</strong></TableCell>
                  <TableCell><strong>Measurement</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {gageRRData.data.slice(0, 12).map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.part}</TableCell>
                    <TableCell>{row.operator}</TableCell>
                    <TableCell>{row.trial}</TableCell>
                    <TableCell>{row.measurement}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Typography variant="caption" display="block" align="center" sx={{ mt: 1 }}>
              Showing 12 of {gageRRData.data.length} total measurements
            </Typography>
          </Paper>

          <Alert
            severity={
              gageRRData.rrPercent < 10 ? 'success' :
              gageRRData.rrPercent < 30 ? 'warning' : 'error'
            }
            sx={{ mt: 2 }}
          >
            <strong>Interpretation:</strong>{' '}
            {gageRRData.rrPercent < 10 &&
              `Excellent! Gage R&R is ${gageRRData.rrPercent}%, well below 10%. The measurement system is adequate for this application.`}
            {gageRRData.rrPercent >= 10 && gageRRData.rrPercent < 30 &&
              `Marginal. Gage R&R is ${gageRRData.rrPercent}%. May be acceptable depending on application requirements and improvement costs.`}
            {gageRRData.rrPercent >= 30 &&
              `Unacceptable! Gage R&R is ${gageRRData.rrPercent}%, consuming too much variation. Improve measurement system before use.`}
          </Alert>

          {/* REAL Backend Integration - No Authentication Required! */}
          <Box sx={{ mt: 4, p: 3, bgcolor: '#e8f5e9', borderRadius: 2, border: '2px solid #4caf50' }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 600 }}>
              🚀 Test with REAL Backend API
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: '#555' }}>
              Click below to send this Gage R&R data to the Django/Python backend for authentic
              SciPy/NumPy variance component analysis.
            </Typography>
            <Button
              variant="contained"
              color="success"
              onClick={handleTestBackendAPI}
              disabled={isLoadingBackend}
              startIcon={isLoadingBackend && <CircularProgress size={20} color="inherit" />}
              sx={{ mb: 2 }}
            >
              {isLoadingBackend ? 'Analyzing on Backend...' : '🔬 Analyze with Backend API'}
            </Button>

            {backendResults && (
              <Box sx={{ mt: 2 }}>
                {backendResults.error ? (
                  <Alert severity="error">
                    <strong>Backend Error:</strong> {backendResults.error}
                  </Alert>
                ) : (
                  <>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <strong>Backend Results (Python/SciPy):</strong> Real variance component analysis from Django backend
                    </Alert>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={4}>
                        <Chip
                          label={`%R&R: ${backendResults.rrPercent?.toFixed(1)}%`}
                          color={
                            backendResults.rrPercent < 10 ? 'success' :
                            backendResults.rrPercent < 30 ? 'warning' : 'error'
                          }
                          sx={{ fontWeight: 600, fontSize: '0.9rem' }}
                        />
                      </Grid>
                      <Grid item xs={6} sm={4}>
                        <Chip
                          label={`Repeatability: ${backendResults.repeatabilityPercent?.toFixed(1)}%`}
                          color="default"
                          sx={{ fontWeight: 600, fontSize: '0.9rem' }}
                        />
                      </Grid>
                      <Grid item xs={6} sm={4}>
                        <Chip
                          label={`Reproducibility: ${backendResults.reproducibilityPercent?.toFixed(1)}%`}
                          color="default"
                          sx={{ fontWeight: 600, fontSize: '0.9rem' }}
                        />
                      </Grid>
                      <Grid item xs={6} sm={4}>
                        <Chip
                          label={`Part-to-Part: ${backendResults.partToPartPercent?.toFixed(1)}%`}
                          color="primary"
                          sx={{ fontWeight: 600, fontSize: '0.9rem' }}
                        />
                      </Grid>
                      <Grid item xs={6} sm={4}>
                        <Chip
                          label={`NDC: ${backendResults.ndc?.toFixed(0)}`}
                          color={backendResults.ndc >= 5 ? 'success' : 'warning'}
                          sx={{ fontWeight: 600, fontSize: '0.9rem' }}
                        />
                      </Grid>
                      <Grid item xs={6} sm={4}>
                        <Chip
                          label={backendResults.assessment || 'N/A'}
                          color={
                            backendResults.assessment === 'Acceptable' ? 'success' : 'error'
                          }
                          sx={{ fontWeight: 600, fontSize: '0.9rem' }}
                        />
                      </Grid>
                    </Grid>

                    {backendResults.chart && (
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          Variance Components (Backend-generated):
                        </Typography>
                        <Box
                          component="div"
                          dangerouslySetInnerHTML={{ __html: backendResults.chart }}
                          sx={{
                            '& svg': { width: '100%', height: 'auto', maxHeight: '400px' }
                          }}
                        />
                      </Box>
                    )}

                    <Typography variant="caption" display="block" sx={{ mt: 2, color: '#666' }}>
                      📊 Calculations performed by Django backend using Python SciPy/NumPy libraries
                    </Typography>
                  </>
                )}
              </Box>
            )}
          </Box>
        </Box>
      )
    },
    {
      label: 'Practice: Improving Measurement Systems',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            What to Do When %R&R is Too High
          </Typography>

          <Typography paragraph>
            If your Gage R&R study shows unacceptable results, you must improve the measurement system
            before using it for process control or capability analysis.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
            Reducing Repeatability (Equipment Variation)
          </Typography>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2', mb: 1 }}>
                    Upgrade Equipment
                  </Typography>
                  <Typography variant="body2">
                    • Higher precision instruments
                    <br />• Better resolution/discrimination
                    <br />• Automated vs manual measurement
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2', mb: 1 }}>
                    Control Environment
                  </Typography>
                  <Typography variant="body2">
                    • Temperature/humidity control
                    <br />• Vibration isolation
                    <br />• Proper calibration frequency
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2', mb: 1 }}>
                    Improve Fixturing
                  </Typography>
                  <Typography variant="body2">
                    • Better clamping/positioning
                    <br />• Reduce part movement
                    <br />• Standardize measurement location
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2', mb: 1 }}>
                    Maintenance & Calibration
                  </Typography>
                  <Typography variant="body2">
                    • Regular preventive maintenance
                    <br />• Frequent calibration
                    <br />• Replace worn components
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
            Reducing Reproducibility (Operator Variation)
          </Typography>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2e7d32', mb: 1 }}>
                    Training & Standardization
                  </Typography>
                  <Typography variant="body2">
                    • Comprehensive operator training
                    <br />• Standard operating procedures (SOPs)
                    <br />• Regular competency checks
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2e7d32', mb: 1 }}>
                    Reduce Operator Influence
                  </Typography>
                  <Typography variant="body2">
                    • Automate measurements
                    <br />• Use fixtures/jigs
                    <br />• Standardize technique
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2e7d32', mb: 1 }}>
                    Visual Aids
                  </Typography>
                  <Typography variant="body2">
                    • Reference standards
                    <br />• Comparison charts
                    <br />• Clear acceptance criteria
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2e7d32', mb: 1 }}>
                    Attribute Agreement
                  </Typography>
                  <Typography variant="body2">
                    • For go/no-go: conduct agreement studies
                    <br />• Ensure consistent interpretation
                    <br />• Resolve disagreements through training
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Alert severity="warning" sx={{ mt: 3 }}>
            <strong>Cost-Benefit Analysis:</strong> Sometimes improving a measurement system is expensive.
            Compare the cost of improvement to the cost of making wrong decisions with poor measurements.
            A marginal system (10-30% R&R) may be acceptable if improvement costs are prohibitive.
          </Alert>
        </Box>
      )
    },
    {
      label: 'Summary: Measurement System Analysis',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Key Takeaways
          </Typography>

          <Paper sx={{ p: 3, bgcolor: '#f5f5f5', my: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              1. MSA is Critical for Quality
            </Typography>
            <Typography variant="body2" paragraph>
              • Measurement systems must be assessed BEFORE process analysis
              <br />• Poor measurements → wrong decisions
              <br />• "You can't improve what you can't measure accurately"
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              2. Gage R&R Components
            </Typography>
            <Typography variant="body2" paragraph>
              • <strong>Repeatability:</strong> Equipment/test-retest variation
              <br />• <strong>Reproducibility:</strong> Operator/appraiser variation
              <br />• <strong>Gage R&R:</strong> Combined measurement error
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              3. Acceptance Criteria
            </Typography>
            <Typography variant="body2" paragraph>
              • <strong>%R&R {'<'} 10%:</strong> Acceptable
              <br />• <strong>%R&R 10-30%:</strong> Marginal (depends on application)
              <br />• <strong>%R&R {'>'} 30%:</strong> Unacceptable (must improve)
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              4. Study Design
            </Typography>
            <Typography variant="body2">
              • 10+ parts spanning process range
              <br />• 2-3 operators
              <br />• 2-3 trials per operator-part combination
              <br />• Randomize order to avoid bias
            </Typography>
          </Paper>

          <Alert severity="success" sx={{ my: 2 }}>
            <strong>Complete MSA Process:</strong>
            <br />1. Conduct Gage R&R study
            <br />2. Calculate %R&R and NDC
            <br />3. If acceptable: Use system for process control/capability
            <br />4. If not: Improve system (reduce repeatability or reproducibility)
            <br />5. Re-validate after improvements
          </Alert>

          <Alert severity="info" sx={{ my: 2 }}>
            <strong>Next Lesson:</strong> Learn <strong>Acceptance Sampling</strong> — how to make
            accept/reject decisions on lots using statistical sampling plans and OC curves!
          </Alert>

          <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={handleComplete}
              fullWidth
            >
              Complete Lesson 5
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
          Lesson 5: Measurement System Analysis
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Master Gage R&R studies and measurement system validation
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
              Lesson 5 Complete! 🎉
            </Typography>
            <Typography paragraph>
              You've mastered Measurement System Analysis and Gage R&R!
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

export default Lesson05_MSA;
