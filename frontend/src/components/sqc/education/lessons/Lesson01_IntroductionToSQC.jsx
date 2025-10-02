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
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { MathJax, MathJaxContext } from 'better-react-mathjax';

/**
 * Lesson 1: Introduction to Statistical Quality Control
 *
 * Covers:
 * - History and philosophy of SQC
 * - Common cause vs special cause variation
 * - Control vs capability
 * - SPC fundamentals
 *
 * Interactive: Visualize variation types
 */

const Lesson01_IntroductionToSQC = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);

  // Interactive state
  const [specialCauseFrequency, setSpecialCauseFrequency] = useState(5);
  const [variationType, setVariationType] = useState('common');

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

  // Generate simulated process data
  const processData = useMemo(() => {
    const data = [];
    const targetValue = 100;
    const commonCauseStdDev = 2;

    for (let i = 0; i < 30; i++) {
      let value = targetValue + (Math.random() - 0.5) * 2 * commonCauseStdDev * 2;

      // Add special cause variation
      if (variationType === 'special' && i % Math.floor(specialCauseFrequency) === 0) {
        value += (Math.random() > 0.5 ? 1 : -1) * commonCauseStdDev * 4;
      } else if (variationType === 'trend') {
        value += i * 0.3;
      } else if (variationType === 'shift') {
        value += i > 15 ? 5 : 0;
      }

      data.push({
        sample: i + 1,
        value: Number(value.toFixed(2))
      });
    }
    return data;
  }, [variationType, specialCauseFrequency]);

  const maxValue = Math.max(...processData.map(d => d.value));
  const minValue = Math.min(...processData.map(d => d.value));

  const steps = [
    {
      label: 'Introduction: Why Quality Control Matters',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            The Journey to World-Class Quality
          </Typography>

          <Typography paragraph>
            In the 1920s, Dr. Walter Shewhart at Bell Telephone Laboratories revolutionized manufacturing
            by introducing <strong>statistical process control (SPC)</strong>. His insight? All processes
            have variation, but not all variation is created equal.
          </Typography>

          <Alert severity="info" sx={{ my: 2 }}>
            <strong>Key Insight:</strong> Quality comes from preventing defects, not detecting them.
            SPC allows us to monitor processes in real-time and intervene before defects occur.
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
            The Quality Revolution
          </Typography>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2' }}>
                    1920s: Shewhart
                  </Typography>
                  <Typography variant="body2">
                    Invented control charts. Distinguished common cause from special cause variation.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2' }}>
                    1950s: Deming
                  </Typography>
                  <Typography variant="body2">
                    Brought SPC to Japan. "In God we trust; all others must bring data."
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2' }}>
                    1980s: Six Sigma
                  </Typography>
                  <Typography variant="body2">
                    Motorola developed Six Sigma methodology. Target: 3.4 defects per million.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2' }}>
                    1990s: Lean + SPC
                  </Typography>
                  <Typography variant="body2">
                    Toyota Production System combined lean manufacturing with SPC for continuous improvement.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography paragraph sx={{ mt: 3 }}>
            Today, SPC is the foundation of quality management in automotive, aerospace, pharmaceutical,
            and healthcare industries worldwide.
          </Typography>
        </Box>
      )
    },
    {
      label: 'Theory: Common Cause vs Special Cause Variation',
      content: (
        <MathJaxContext>
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
              The Two Types of Variation
            </Typography>

            <Typography paragraph>
              Shewhart's fundamental insight: All processes exhibit variation from two distinct sources:
            </Typography>

            <Paper sx={{ p: 2, bgcolor: '#e8f5e9', my: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                1. Common Cause Variation (Random Variation)
              </Typography>
              <Typography variant="body2" paragraph>
                • Natural, inherent variation in the process
                <br />• Many small sources: temperature fluctuations, material variations, operator differences
                <br />• Always present — predictable in aggregate
                <br />• Forms a stable, normal distribution
                <br />• <strong>Process is "in control"</strong>
              </Typography>
            </Paper>

            <Paper sx={{ p: 2, bgcolor: '#ffebee', my: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#d32f2f' }}>
                2. Special Cause Variation (Assignable Variation)
              </Typography>
              <Typography variant="body2" paragraph>
                • Unusual, sporadic sources of variation
                <br />• Few large sources: tool breakage, wrong material, operator error, machine malfunction
                <br />• NOT always present — unpredictable
                <br />• Creates outliers, trends, shifts, patterns
                <br />• <strong>Process is "out of control"</strong>
              </Typography>
            </Paper>

            <Alert severity="warning" sx={{ my: 2 }}>
              <strong>Critical Distinction:</strong> You can only improve a process by reducing common cause
              variation (system-level changes). Reacting to common cause variation as if it were special cause
              leads to <em>tampering</em> — making things worse!
            </Alert>

            <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
              Mathematical Framework
            </Typography>

            <Typography paragraph>
              For a process with only common cause variation, measurements follow a distribution:
            </Typography>

            <MathJax>
              {"\\[ X \\sim N(\\mu, \\sigma^2) \\]"}
            </MathJax>

            <Typography paragraph sx={{ mt: 2 }}>
              Where:
            </Typography>
            <Typography component="div" variant="body2" sx={{ pl: 2 }}>
              • <MathJax inline>{"\\(\\mu\\)"}</MathJax> = Process mean (target value)
              <br />• <MathJax inline>{"\\(\\sigma\\)"}</MathJax> = Process standard deviation (common cause variation)
            </Typography>

            <Typography paragraph sx={{ mt: 2 }}>
              Control limits (typically ±3σ from the mean) capture 99.73% of common cause variation:
            </Typography>

            <MathJax>
              {"\\[ \\text{UCL} = \\mu + 3\\sigma \\quad \\text{LCL} = \\mu - 3\\sigma \\]"}
            </MathJax>

            <Typography paragraph sx={{ mt: 2 }}>
              Points beyond these limits indicate special cause variation with high confidence.
            </Typography>

            <Table size="small" sx={{ mt: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Variation Type</strong></TableCell>
                  <TableCell><strong>Characteristics</strong></TableCell>
                  <TableCell><strong>Action</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Common Cause</TableCell>
                  <TableCell>Random, consistent pattern</TableCell>
                  <TableCell>Improve the system</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Special Cause</TableCell>
                  <TableCell>Outliers, trends, shifts</TableCell>
                  <TableCell>Find and eliminate root cause</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        </MathJaxContext>
      )
    },
    {
      label: 'Interactive: Visualize Variation Types',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Explore Different Types of Variation
          </Typography>

          <Typography paragraph>
            Use the controls below to simulate different process behaviors and see how they appear on a
            run chart. Understanding these patterns is critical for interpreting control charts.
          </Typography>

          <Paper sx={{ p: 3, bgcolor: '#f5f5f5', my: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
              Select Variation Pattern:
            </Typography>
            <ToggleButtonGroup
              value={variationType}
              exclusive
              onChange={(e, newValue) => newValue && setVariationType(newValue)}
              fullWidth
              sx={{ mb: 3 }}
            >
              <ToggleButton value="common" color="success">
                Common Cause Only
              </ToggleButton>
              <ToggleButton value="special" color="error">
                Random Special Causes
              </ToggleButton>
              <ToggleButton value="trend" color="warning">
                Trend (Drift)
              </ToggleButton>
              <ToggleButton value="shift" color="warning">
                Level Shift
              </ToggleButton>
            </ToggleButtonGroup>

            {variationType === 'special' && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Special Cause Frequency (every N samples):
                </Typography>
                <Slider
                  value={specialCauseFrequency}
                  onChange={(e, val) => setSpecialCauseFrequency(val)}
                  min={3}
                  max={10}
                  step={1}
                  marks
                  valueLabelDisplay="on"
                />
              </Box>
            )}

            {/* Run Chart Visualization */}
            <Paper sx={{ p: 2, bgcolor: 'white' }}>
              <Typography variant="subtitle2" gutterBottom align="center" sx={{ fontWeight: 600 }}>
                Process Run Chart
              </Typography>
              <svg width="100%" height="300" style={{ border: '1px solid #ddd' }}>
                {/* Background grid */}
                <line x1="50" y1="250" x2="750" y2="250" stroke="#666" strokeWidth="2" />
                <line x1="50" y1="50" x2="50" y2="250" stroke="#666" strokeWidth="2" />

                {/* Y-axis labels */}
                <text x="30" y="50" fontSize="10" textAnchor="end">{maxValue.toFixed(0)}</text>
                <text x="30" y="150" fontSize="10" textAnchor="end">{((maxValue + minValue) / 2).toFixed(0)}</text>
                <text x="30" y="250" fontSize="10" textAnchor="end">{minValue.toFixed(0)}</text>

                {/* X-axis label */}
                <text x="400" y="280" fontSize="12" textAnchor="middle" fontWeight="bold">Sample Number</text>
                <text x="25" y="150" fontSize="12" textAnchor="middle" fontWeight="bold" transform="rotate(-90, 25, 150)">Measurement</text>

                {/* Plot data points and lines */}
                {processData.map((point, i) => {
                  const x = 50 + (i * (700 / (processData.length - 1)));
                  const y = 250 - ((point.value - minValue) / (maxValue - minValue)) * 200;

                  return (
                    <g key={i}>
                      {i > 0 && (
                        <line
                          x1={50 + ((i - 1) * (700 / (processData.length - 1)))}
                          y1={250 - ((processData[i - 1].value - minValue) / (maxValue - minValue)) * 200}
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
                        fill={
                          variationType === 'special' && i % Math.floor(specialCauseFrequency) === 0 ? '#d32f2f' : '#1976d2'
                        }
                      />
                    </g>
                  );
                })}

                {/* Center line (target) */}
                <line
                  x1="50"
                  y1={250 - ((100 - minValue) / (maxValue - minValue)) * 200}
                  x2="750"
                  y2={250 - ((100 - minValue) / (maxValue - minValue)) * 200}
                  stroke="#2e7d32"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
              </svg>
            </Paper>

            {/* Interpretation */}
            <Alert
              severity={
                variationType === 'common' ? 'success' :
                variationType === 'special' ? 'error' : 'warning'
              }
              sx={{ mt: 2 }}
            >
              <strong>Interpretation:</strong>{' '}
              {variationType === 'common' &&
                'Process shows only common cause variation — random scatter around the target. Process is stable and predictable.'}
              {variationType === 'special' &&
                'Red points indicate special causes — sudden spikes or drops. Investigate and eliminate these root causes.'}
              {variationType === 'trend' &&
                'Process shows an upward trend — systematic drift. This is special cause variation (e.g., tool wear, temperature drift).'}
              {variationType === 'shift' &&
                'Process shows a sudden shift in level — a special cause occurred around sample 16. Investigate what changed.'}
            </Alert>
          </Paper>
        </Box>
      )
    },
    {
      label: 'Practice: Control vs Capability',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Understanding Control vs Capability
          </Typography>

          <Typography paragraph>
            Two distinct but complementary concepts:
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, bgcolor: '#e8f5e9', height: '100%' }}>
                <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 600, mb: 2 }}>
                  Statistical Control
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Question:</strong> Is the process stable and predictable?
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Tool:</strong> Control charts
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Criteria:</strong>
                  <br />• No points beyond control limits
                  <br />• No non-random patterns
                  <br />• Only common cause variation present
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Result:</strong> Process behaves consistently over time
                </Typography>
                <Alert severity="info" sx={{ mt: 2 }}>
                  A process must be in control <strong>before</strong> assessing capability!
                </Alert>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, bgcolor: '#e3f2fd', height: '100%' }}>
                <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 600, mb: 2 }}>
                  Process Capability
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Question:</strong> Does the process meet specification limits?
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Tool:</strong> Capability indices (Cp, Cpk)
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Criteria:</strong>
                  <br />• Cp ≥ 1.33 (capable)
                  <br />• Cpk ≥ 1.33 (capable and centered)
                  <br />• Process natural spread fits within spec limits
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Result:</strong> Process produces conforming parts
                </Typography>
                <Alert severity="info" sx={{ mt: 2 }}>
                  Capability assumes the process is already in control!
                </Alert>
              </Paper>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
            Four Possible Scenarios
          </Typography>

          <Table size="small" sx={{ mt: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell><strong>In Control?</strong></TableCell>
                <TableCell><strong>Capable?</strong></TableCell>
                <TableCell><strong>Situation</strong></TableCell>
                <TableCell><strong>Action</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                <TableCell>✓ Yes</TableCell>
                <TableCell>✓ Yes</TableCell>
                <TableCell>Ideal — stable and meeting specs</TableCell>
                <TableCell>Monitor and maintain</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: '#fff3e0' }}>
                <TableCell>✓ Yes</TableCell>
                <TableCell>✗ No</TableCell>
                <TableCell>Stable but too much variation</TableCell>
                <TableCell>Reduce common cause variation (improve system)</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: '#ffebee' }}>
                <TableCell>✗ No</TableCell>
                <TableCell>✓ Yes</TableCell>
                <TableCell>Capable but unstable</TableCell>
                <TableCell>Eliminate special causes first!</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: '#ffcdd2' }}>
                <TableCell>✗ No</TableCell>
                <TableCell>✗ No</TableCell>
                <TableCell>Worst case — unstable and incapable</TableCell>
                <TableCell>Eliminate special causes, then improve system</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Alert severity="warning" sx={{ mt: 3 }}>
            <strong>Common Mistake:</strong> Calculating capability indices on an out-of-control process.
            The indices will be meaningless! Always establish control first.
          </Alert>
        </Box>
      )
    },
    {
      label: 'Summary: The SPC Philosophy',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Key Takeaways
          </Typography>

          <Paper sx={{ p: 3, bgcolor: '#f5f5f5', my: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              1. All Variation Is Not Created Equal
            </Typography>
            <Typography variant="body2" paragraph>
              • <strong>Common cause variation:</strong> Inherent to the process, forms a stable pattern
              <br />• <strong>Special cause variation:</strong> Unusual events, creates outliers and patterns
              <br />• Understanding the difference prevents <em>tampering</em>
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              2. Control Charts Distinguish the Two
            </Typography>
            <Typography variant="body2" paragraph>
              • Control limits (±3σ) capture 99.73% of common cause variation
              <br />• Points beyond limits signal special causes
              <br />• Non-random patterns also indicate special causes
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              3. Control First, Then Capability
            </Typography>
            <Typography variant="body2" paragraph>
              • Control = stability over time (no special causes)
              <br />• Capability = meeting specifications (natural spread ≤ tolerance)
              <br />• Must achieve control before assessing capability
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              4. Prevention, Not Detection
            </Typography>
            <Typography variant="body2">
              • SPC allows real-time monitoring and early intervention
              <br />• Prevent defects rather than sorting good from bad
              <br />• Continuous improvement through variation reduction
            </Typography>
          </Paper>

          <Alert severity="success" sx={{ my: 2 }}>
            <strong>Deming's Philosophy:</strong> "If you can't describe what you are doing as a process,
            you don't know what you're doing." SPC gives us the tools to understand and improve processes scientifically.
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
            What's Next?
          </Typography>

          <Typography paragraph>
            In the following lessons, you'll learn:
          </Typography>
          <Typography component="div" variant="body2" sx={{ pl: 2 }}>
            • <strong>Lesson 2:</strong> Variables control charts (X̄-R, X̄-S, I-MR)
            <br />• <strong>Lesson 3:</strong> Attributes control charts (p, np, c, u)
            <br />• <strong>Lesson 4:</strong> Process capability analysis (Cp, Cpk, Six Sigma)
            <br />• <strong>Lesson 5:</strong> Measurement system analysis (Gage R&R)
            <br />• <strong>Lesson 6:</strong> Acceptance sampling and OC curves
          </Typography>

          <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={handleComplete}
              fullWidth
            >
              Complete Lesson 1
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
          Lesson 1: Introduction to Statistical Quality Control
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Learn the fundamentals of SPC, variation types, and the philosophy of quality control
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
              Lesson 1 Complete! 🎉
            </Typography>
            <Typography paragraph>
              You've learned the foundations of Statistical Quality Control. Ready for the next lesson?
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

export default Lesson01_IntroductionToSQC;
