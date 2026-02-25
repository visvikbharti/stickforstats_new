/**
 * Lesson 2: Hypothesis Testing Framework
 *
 * This lesson covers the fundamental framework of hypothesis testing,
 * including null/alternative hypotheses, Type I and Type II errors,
 * and the decision matrix that underlies all power analysis.
 *
 * Mathematical foundations for understanding why power analysis matters.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Grid,
  Slider,
  Alert,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  NavigateNext,
  NavigateBefore,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Science,
  Psychology,
  ExpandMore,
  Lightbulb,
  GridOn,
  PlayArrow,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import { alpha as alphaFn } from '@mui/material/styles';

// Step titles for the lesson
const steps = [
  'The Hypothesis Testing Framework',
  'Null and Alternative Hypotheses',
  'The Decision Matrix',
  'Type I Error (α)',
  'Type II Error (β)',
];

const Lesson02_HypothesisTesting = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  // Decision Matrix Interactive State
  const [selectedCell, setSelectedCell] = useState(null);
  const [showRealWorld, setShowRealWorld] = useState(false);
  const [exampleDomain, setExampleDomain] = useState('medical');

  // Error Rate Simulator State
  const [alpha, setAlpha] = useState(0.05);
  const [beta, setBeta] = useState(0.20);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simulationResults, setSimulationResults] = useState({
    truePositives: 0,
    trueNegatives: 0,
    falsePositives: 0,
    falseNegatives: 0,
    totalTrials: 0,
  });

  // Canvas ref for visualization
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Handle step navigation
  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, activeStep]));
    setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  // Decision matrix cell data
  const decisionMatrix = {
    cells: [
      {
        id: 'tn',
        row: 0,
        col: 0,
        reality: 'H₀ True',
        decision: 'Fail to Reject H₀',
        outcome: 'True Negative',
        correct: true,
        probability: '1 - α',
        color: '#4caf50',
        description: 'Correctly concluded no effect exists when there truly is no effect.',
      },
      {
        id: 'fp',
        row: 0,
        col: 1,
        reality: 'H₀ True',
        decision: 'Reject H₀',
        outcome: 'False Positive',
        correct: false,
        probability: 'α',
        errorType: 'Type I',
        color: '#f44336',
        description: 'Incorrectly concluded an effect exists when there is no real effect.',
      },
      {
        id: 'fn',
        row: 1,
        col: 0,
        reality: 'H₁ True',
        decision: 'Fail to Reject H₀',
        outcome: 'False Negative',
        correct: false,
        probability: 'β',
        errorType: 'Type II',
        color: '#ff9800',
        description: 'Failed to detect a real effect that actually exists.',
      },
      {
        id: 'tp',
        row: 1,
        col: 1,
        reality: 'H₁ True',
        decision: 'Reject H₀',
        outcome: 'True Positive',
        correct: true,
        probability: '1 - β = Power',
        color: '#2196f3',
        description: 'Correctly detected a real effect that exists.',
      },
    ],
  };

  // Real-world examples for each domain
  const realWorldExamples = {
    medical: {
      title: 'Clinical Trial: New Drug',
      h0: 'The drug has no effect on blood pressure',
      h1: 'The drug reduces blood pressure',
      trueNegative: 'Correctly identify an ineffective drug → Don\'t waste resources',
      falsePositive: 'Approve an ineffective drug → Patients take useless medication',
      falseNegative: 'Reject an effective drug → Patients miss beneficial treatment',
      truePositive: 'Approve an effective drug → Patients receive beneficial treatment',
    },
    biology: {
      title: 'Gene Expression Study',
      h0: 'Gene X expression is unchanged between conditions',
      h1: 'Gene X is differentially expressed',
      trueNegative: 'Correctly identify genes unaffected by treatment',
      falsePositive: 'Report false differential expression → Wasted follow-up studies',
      falseNegative: 'Miss truly differentially expressed genes → Lost biological insights',
      truePositive: 'Discover genuinely affected genes → New biological understanding',
    },
    psychology: {
      title: 'Cognitive Intervention Study',
      h0: 'Training has no effect on memory performance',
      h1: 'Training improves memory performance',
      trueNegative: 'Correctly identify ineffective interventions',
      falsePositive: 'Recommend ineffective training → Wasted time and resources',
      falseNegative: 'Dismiss effective intervention → Patients miss cognitive benefits',
      truePositive: 'Identify effective intervention → Improved patient outcomes',
    },
    quality: {
      title: 'Manufacturing Quality Control',
      h0: 'Product batch meets quality standards',
      h1: 'Product batch is defective',
      trueNegative: 'Ship good products → Customer satisfaction',
      falsePositive: 'Reject good batch → Unnecessary waste and cost',
      falseNegative: 'Ship defective products → Customer complaints, recalls',
      truePositive: 'Catch defective batch → Prevent quality issues',
    },
  };

  // Run error rate simulation
  const runSimulation = useCallback(() => {
    const newResults = {
      truePositives: 0,
      trueNegatives: 0,
      falsePositives: 0,
      falseNegatives: 0,
      totalTrials: 1000,
    };

    // Simulate 1000 experiments
    // Assume 50% of experiments have true effects
    for (let i = 0; i < 1000; i++) {
      const hasRealEffect = Math.random() < 0.5;

      if (hasRealEffect) {
        // Reality: H₁ is true
        const detected = Math.random() > beta; // Power = 1 - β
        if (detected) {
          newResults.truePositives++;
        } else {
          newResults.falseNegatives++;
        }
      } else {
        // Reality: H₀ is true
        const falseAlarm = Math.random() < alpha;
        if (falseAlarm) {
          newResults.falsePositives++;
        } else {
          newResults.trueNegatives++;
        }
      }
    }

    setSimulationResults(newResults);
  }, [alpha, beta]);

  // Draw the hypothesis testing visualization
  const drawVisualization = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw two distributions: H₀ (null) and H₁ (alternative)
    const drawNormalCurve = (mean, sd, color, label, fillAlpha = 0.3) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;

      const xMin = -4;
      const xMax = 8;
      const xScale = width / (xMax - xMin);
      const yScale = height * 0.6;

      let firstPoint = true;
      for (let x = xMin; x <= xMax; x += 0.05) {
        const z = (x - mean) / sd;
        const y = Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));

        const canvasX = (x - xMin) * xScale;
        const canvasY = height - 50 - y * yScale * 4;

        if (firstPoint) {
          ctx.moveTo(canvasX, canvasY);
          firstPoint = false;
        } else {
          ctx.lineTo(canvasX, canvasY);
        }
      }
      ctx.stroke();

      // Label
      const labelX = (mean - xMin) * xScale;
      ctx.fillStyle = color;
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(label, labelX, height - 20);
    };

    // Critical value line
    const criticalValue = 1.96; // For α = 0.05, two-tailed
    const xMin = -4;
    const xMax = 8;
    const xScale = width / (xMax - xMin);

    const critX = (criticalValue - xMin) * xScale;

    // Shade rejection region (α)
    ctx.fillStyle = 'rgba(244, 67, 54, 0.3)';
    ctx.beginPath();
    ctx.moveTo(critX, height - 50);
    for (let x = criticalValue; x <= xMax; x += 0.05) {
      const z = x; // H₀ is centered at 0
      const y = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
      const canvasX = (x - xMin) * xScale;
      const canvasY = height - 50 - y * (height * 0.6) * 4;
      ctx.lineTo(canvasX, canvasY);
    }
    ctx.lineTo(width, height - 50);
    ctx.closePath();
    ctx.fill();

    // Shade β region (miss area under H₁)
    const effectSize = 2.5; // Cohen's d ≈ 1
    ctx.fillStyle = 'rgba(255, 152, 0, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, height - 50);
    for (let x = xMin; x <= criticalValue; x += 0.05) {
      const z = (x - effectSize);
      const y = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
      const canvasX = (x - xMin) * xScale;
      const canvasY = height - 50 - y * (height * 0.6) * 4;
      ctx.lineTo(canvasX, canvasY);
    }
    ctx.lineTo(critX, height - 50);
    ctx.closePath();
    ctx.fill();

    // Shade Power region (detection area under H₁)
    ctx.fillStyle = 'rgba(33, 150, 243, 0.3)';
    ctx.beginPath();
    ctx.moveTo(critX, height - 50);
    for (let x = criticalValue; x <= xMax; x += 0.05) {
      const z = (x - effectSize);
      const y = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
      const canvasX = (x - xMin) * xScale;
      const canvasY = height - 50 - y * (height * 0.6) * 4;
      ctx.lineTo(canvasX, canvasY);
    }
    ctx.lineTo(width, height - 50);
    ctx.closePath();
    ctx.fill();

    // Draw curves
    drawNormalCurve(0, 1, '#666', 'H₀ Distribution');
    drawNormalCurve(effectSize, 1, '#1976d2', 'H₁ Distribution');

    // Critical value line
    ctx.strokeStyle = '#f44336';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(critX, 30);
    ctx.lineTo(critX, height - 50);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels for regions
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';

    ctx.fillStyle = '#f44336';
    ctx.fillText('α (Type I)', width - 60, 60);

    ctx.fillStyle = '#ff9800';
    ctx.fillText('β (Type II)', critX - 80, 80);

    ctx.fillStyle = '#2196f3';
    ctx.fillText('Power (1-β)', critX + 80, 60);

    // X-axis
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 50);
    ctx.lineTo(width, height - 50);
    ctx.stroke();

    // Critical value label
    ctx.fillStyle = '#f44336';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('Critical Value', critX, height - 35);

  }, []);

  useEffect(() => {
    if (activeStep === 2 || activeStep === 3 || activeStep === 4) {
      drawVisualization();
    }
  }, [activeStep, drawVisualization]);

  // Render Step 1: The Hypothesis Testing Framework
  const renderStep1 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        The Scientific Method and Statistical Inference
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          Before we can understand power analysis, we must understand the <strong>hypothesis testing framework</strong>
          —the foundation upon which all statistical inference is built.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Science sx={{ color: '#d32f2f', mr: 1, fontSize: 28 }} />
                <Typography variant="h6">The Scientific Question</Typography>
              </Box>

              <Typography variant="body1" paragraph>
                Science progresses by asking questions and gathering evidence. But how do we determine
                if our evidence is strong enough to support a conclusion?
              </Typography>

              <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 2 }}>
                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                  <strong>Example:</strong> "Does this new drug reduce blood pressure more than the current treatment?"
                </Typography>
              </Paper>

              <Typography variant="body2" color="text.secondary">
                We need a rigorous framework to answer such questions while controlling
                the probability of being wrong.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Psychology sx={{ color: '#1976d2', mr: 1, fontSize: 28 }} />
                <Typography variant="h6">Statistical Hypothesis Testing</Typography>
              </Box>

              <Typography variant="body1" paragraph>
                Hypothesis testing provides a systematic approach to making decisions about
                populations based on sample data.
              </Typography>

              <Box sx={{ bgcolor: (theme) => alphaFn(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), p: 2, borderRadius: 1 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Key Components:</strong>
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} /></ListItemIcon>
                    <ListItemText primary="Formulate competing hypotheses" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} /></ListItemIcon>
                    <ListItemText primary="Collect and analyze data" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} /></ListItemIcon>
                    <ListItemText primary="Make a decision with controlled error rates" />
                  </ListItem>
                </List>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          The Logic of Hypothesis Testing
        </Typography>

        <Paper sx={{ p: 3, bgcolor: 'background.default' }}>
          <Typography variant="body1" paragraph>
            Hypothesis testing follows an approach similar to <strong>proof by contradiction</strong> in mathematics:
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, bgcolor: 'background.paper', textAlign: 'center', height: '100%' }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>Step 1</Typography>
                <Typography variant="body2">
                  Assume the null hypothesis (H₀) is true
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, bgcolor: 'background.paper', textAlign: 'center', height: '100%' }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>Step 2</Typography>
                <Typography variant="body2">
                  Calculate probability of observing our data under H₀
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, bgcolor: 'background.paper', textAlign: 'center', height: '100%' }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>Step 3</Typography>
                <Typography variant="body2">
                  If probability is very small, reject H₀
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, bgcolor: 'background.paper', textAlign: 'center', height: '100%' }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>Step 4</Typography>
                <Typography variant="body2">
                  Conclude in favor of alternative hypothesis (H₁)
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      <Alert severity="warning" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Critical Insight:</strong> This framework means we can never <em>prove</em> the null hypothesis—we
          can only fail to reject it. The absence of evidence is not evidence of absence.
        </Typography>
      </Alert>
    </Box>
  );

  // Render Step 2: Null and Alternative Hypotheses
  const renderStep2 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        Null and Alternative Hypotheses
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%', borderTop: '4px solid #9e9e9e' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                H₀: The Null Hypothesis
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                The hypothesis of "no effect" or "no difference"
              </Alert>

              <Typography variant="body1" paragraph>
                The null hypothesis represents the <strong>status quo</strong>—the assumption that
                nothing special is happening, no treatment effect exists, or groups don't differ.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: 'background.default', mb: 2 }}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  H₀: μ₁ = μ₂ (means are equal)<br/>
                  H₀: μ = μ₀ (mean equals specified value)<br/>
                  H₀: ρ = 0 (no correlation)<br/>
                  H₀: p₁ = p₂ (proportions are equal)
                </Typography>
              </Paper>

              <Typography variant="body2" color="text.secondary">
                <strong>Key point:</strong> The null hypothesis is what we test against. We assume it's
                true and ask: "How likely is our data if H₀ were true?"
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%', borderTop: '4px solid #1976d2' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                H₁ (or Hₐ): The Alternative Hypothesis
              </Typography>

              <Alert severity="success" sx={{ mb: 2 }}>
                The hypothesis of interest—what you hope to demonstrate
              </Alert>

              <Typography variant="body1" paragraph>
                The alternative hypothesis represents what you're actually trying to
                show—that there <strong>is</strong> an effect, a difference, or a relationship.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 2 }}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  H₁: μ₁ ≠ μ₂ (two-tailed: means differ)<br/>
                  H₁: μ₁ {'>'} μ₂ (one-tailed: group 1 higher)<br/>
                  H₁: μ₁ {'<'} μ₂ (one-tailed: group 1 lower)<br/>
                  H₁: ρ ≠ 0 (correlation exists)
                </Typography>
              </Paper>

              <Typography variant="body2" color="text.secondary">
                <strong>Key point:</strong> The alternative is what you believe is true and want to
                provide evidence for. Power analysis helps ensure you can detect this effect.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>One-Tailed vs Two-Tailed Tests</Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Two-Tailed Test
              </Typography>
              <Typography variant="body2" paragraph>
                H₁: μ₁ ≠ μ₂ (effect could be in either direction)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Use when:</strong> You want to detect any difference, regardless of direction.
                This is the more conservative and commonly used approach.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                One-Tailed Test
              </Typography>
              <Typography variant="body2" paragraph>
                H₁: μ₁ {'>'} μ₂ or H₁: μ₁ {'<'} μ₂ (specific direction)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Use when:</strong> You have strong theoretical reasons to predict a specific
                direction and effects in the opposite direction are meaningless.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Mathematical Formalization
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Paper sx={{ p: 3, bgcolor: 'background.default' }}>
            <Typography variant="body1" paragraph>
              For a two-sample comparison of means:
            </Typography>

            <Box sx={{ fontFamily: 'serif', fontSize: '1.1rem', textAlign: 'center', my: 2 }}>
              <Typography sx={{ fontFamily: 'serif', fontSize: '1.2rem', mb: 2 }}>
                <strong>Null:</strong> H₀: μ₁ - μ₂ = 0
              </Typography>
              <Typography sx={{ fontFamily: 'serif', fontSize: '1.2rem', mb: 2 }}>
                <strong>Alternative (two-tailed):</strong> H₁: μ₁ - μ₂ ≠ 0
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography sx={{ fontFamily: 'serif', fontSize: '1.2rem', mb: 2 }}>
                <strong>Test Statistic:</strong> t = (X̄₁ - X̄₂) / SE
              </Typography>
              <Typography sx={{ fontFamily: 'serif', fontSize: '1rem' }}>
                where SE = s_p √(1/n₁ + 1/n₂)
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary">
              The test statistic measures how many standard errors the observed difference
              is from the null hypothesis value (zero).
            </Typography>
          </Paper>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  // Render Step 3: The Decision Matrix
  const renderStep3 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        The Decision Matrix: Four Possible Outcomes
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        When making a decision based on statistical evidence, there are exactly <strong>four possible outcomes</strong>.
        Two are correct decisions, and two are errors. Understanding this matrix is essential for power analysis.
      </Alert>

      {/* Interactive Decision Matrix */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
          Interactive Decision Matrix
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
          Click each cell to explore the outcome in detail
        </Typography>

        <TableContainer>
          <Table sx={{ minWidth: 500 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.default' }}></TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, bgcolor: (theme) => alphaFn(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), width: '35%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingDown sx={{ mr: 1 }} />
                    Fail to Reject H₀
                  </Box>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, bgcolor: (theme) => alphaFn(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), width: '35%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp sx={{ mr: 1 }} />
                    Reject H₀
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.default' }}>
                  H₀ is True<br/>
                  <Typography variant="caption" color="text.secondary">
                    (No real effect)
                  </Typography>
                </TableCell>
                <TableCell
                  align="center"
                  onClick={() => setSelectedCell('tn')}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: (theme) => selectedCell === 'tn' ? alphaFn(theme.palette.success.main, 0.2) : theme.palette.action.hover,
                    border: selectedCell === 'tn' ? '3px solid #4caf50' : '1px solid #ddd',
                    transition: 'all 0.3s',
                    '&:hover': { bgcolor: (theme) => alphaFn(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) },
                    p: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 600 }}>
                    True Negative
                  </Typography>
                  <Typography variant="body2">Correct Decision</Typography>
                  <Chip label="P = 1 - α" size="small" sx={{ mt: 1, bgcolor: '#4caf50', color: 'white' }} />
                </TableCell>
                <TableCell
                  align="center"
                  onClick={() => setSelectedCell('fp')}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: (theme) => selectedCell === 'fp' ? alphaFn(theme.palette.error.main, 0.2) : theme.palette.action.hover,
                    border: selectedCell === 'fp' ? '3px solid #f44336' : '1px solid #ddd',
                    transition: 'all 0.3s',
                    '&:hover': { bgcolor: (theme) => alphaFn(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) },
                    p: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ color: '#f44336', fontWeight: 600 }}>
                    False Positive
                  </Typography>
                  <Typography variant="body2">Type I Error</Typography>
                  <Chip label="P = α" size="small" sx={{ mt: 1, bgcolor: '#f44336', color: 'white' }} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.default' }}>
                  H₁ is True<br/>
                  <Typography variant="caption" color="text.secondary">
                    (Real effect exists)
                  </Typography>
                </TableCell>
                <TableCell
                  align="center"
                  onClick={() => setSelectedCell('fn')}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: (theme) => selectedCell === 'fn' ? alphaFn(theme.palette.warning.main, 0.2) : theme.palette.action.hover,
                    border: selectedCell === 'fn' ? '3px solid #ff9800' : '1px solid #ddd',
                    transition: 'all 0.3s',
                    '&:hover': { bgcolor: (theme) => alphaFn(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) },
                    p: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ color: '#ff9800', fontWeight: 600 }}>
                    False Negative
                  </Typography>
                  <Typography variant="body2">Type II Error</Typography>
                  <Chip label="P = β" size="small" sx={{ mt: 1, bgcolor: '#ff9800', color: 'white' }} />
                </TableCell>
                <TableCell
                  align="center"
                  onClick={() => setSelectedCell('tp')}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: (theme) => selectedCell === 'tp' ? alphaFn(theme.palette.primary.main, 0.2) : theme.palette.action.hover,
                    border: selectedCell === 'tp' ? '3px solid #2196f3' : '1px solid #ddd',
                    transition: 'all 0.3s',
                    '&:hover': { bgcolor: (theme) => alphaFn(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) },
                    p: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ color: '#2196f3', fontWeight: 600 }}>
                    True Positive
                  </Typography>
                  <Typography variant="body2">Correct Decision</Typography>
                  <Chip label="P = 1 - β = Power" size="small" sx={{ mt: 1, bgcolor: '#2196f3', color: 'white' }} />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Selected cell details */}
        {selectedCell && (
          <Paper sx={{ mt: 3, p: 2, bgcolor: 'background.default' }}>
            <Typography variant="h6" gutterBottom>
              {decisionMatrix.cells.find(c => c.id === selectedCell)?.outcome}
            </Typography>
            <Typography variant="body1">
              {decisionMatrix.cells.find(c => c.id === selectedCell)?.description}
            </Typography>
          </Paper>
        )}
      </Paper>

      {/* Real-world examples toggle */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>Real-World Examples</Typography>

        <ToggleButtonGroup
          value={exampleDomain}
          exclusive
          onChange={(e, v) => v && setExampleDomain(v)}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="medical">Medical Trial</ToggleButton>
          <ToggleButton value="biology">Gene Expression</ToggleButton>
          <ToggleButton value="psychology">Psychology Study</ToggleButton>
          <ToggleButton value="quality">Quality Control</ToggleButton>
        </ToggleButtonGroup>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom color="primary">
            {realWorldExamples[exampleDomain].title}
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" color="text.secondary">Null Hypothesis (H₀)</Typography>
                <Typography variant="body2">{realWorldExamples[exampleDomain].h0}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
                <Typography variant="subtitle2" color="primary">Alternative Hypothesis (H₁)</Typography>
                <Typography variant="body2">{realWorldExamples[exampleDomain].h1}</Typography>
              </Paper>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
                <Typography variant="subtitle2" sx={{ color: '#4caf50' }}>True Negative</Typography>
                <Typography variant="body2">{realWorldExamples[exampleDomain].trueNegative}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
                <Typography variant="subtitle2" sx={{ color: '#f44336' }}>False Positive</Typography>
                <Typography variant="body2">{realWorldExamples[exampleDomain].falsePositive}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
                <Typography variant="subtitle2" sx={{ color: '#ff9800' }}>False Negative</Typography>
                <Typography variant="body2">{realWorldExamples[exampleDomain].falseNegative}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
                <Typography variant="subtitle2" sx={{ color: '#2196f3' }}>True Positive</Typography>
                <Typography variant="body2">{realWorldExamples[exampleDomain].truePositive}</Typography>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* Visualization */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Visual Representation: Overlapping Distributions
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The decision matrix outcomes map to areas under these two distributions
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <canvas
            ref={canvasRef}
            width={700}
            height={350}
            style={{ maxWidth: '100%', border: '1px solid #ddd', borderRadius: 4 }}
          />
        </Box>
      </Paper>
    </Box>
  );

  // Render Step 4: Type I Error
  const renderStep4 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        Type I Error (α): The False Positive
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ borderTop: '4px solid #f44336' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ErrorIcon sx={{ color: '#f44336', mr: 1, fontSize: 32 }} />
                <Typography variant="h6">Definition</Typography>
              </Box>

              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="body1">
                  <strong>Type I Error:</strong> Rejecting H₀ when H₀ is actually true
                </Typography>
              </Alert>

              <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 2 }}>
                <Typography variant="body1" sx={{ fontFamily: 'serif', fontSize: '1.1rem', textAlign: 'center' }}>
                  α = P(Reject H₀ | H₀ is true)
                </Typography>
              </Paper>

              <Typography variant="body1" paragraph>
                This is a <strong>false positive</strong>—concluding that an effect exists
                when in reality there is no effect. You've been fooled by random chance.
              </Typography>

              <Typography variant="body2" color="text.secondary">
                The significance level (α) is the maximum acceptable probability of making
                a Type I error. It's set <em>before</em> the experiment.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Why α = 0.05 is Standard
              </Typography>

              <Typography variant="body1" paragraph>
                The 5% significance level was popularized by R.A. Fisher in the 1920s.
                It represents a balance:
              </Typography>

              <List>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText
                    primary="Low enough to provide reasonable evidence"
                    secondary="Only 1 in 20 chance of false positive"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText
                    primary="High enough to be achievable"
                    secondary="Studies can be reasonably sized"
                  />
                </ListItem>
              </List>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Note:</strong> 0.05 is a <em>convention</em>, not a magic number.
                  Some fields use 0.01 or even 0.001 for more stringent control.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Consequences of Type I Error
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                🔬 In Research
              </Typography>
              <Typography variant="body2">
                Publishing false findings, contributing to the replication crisis,
                wasted resources on follow-up studies of non-existent effects.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                💊 In Medicine
              </Typography>
              <Typography variant="body2">
                Approving ineffective treatments, patients receiving useless medications,
                healthcare resources spent on non-beneficial interventions.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                🏭 In Industry
              </Typography>
              <Typography variant="body2">
                Implementing changes that don't actually improve processes,
                wasted investment based on spurious data patterns.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            The Multiple Testing Problem
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" paragraph>
            When you perform multiple tests, the probability of at least one Type I error increases:
          </Typography>

          <Paper sx={{ p: 2, bgcolor: 'background.default', mb: 2 }}>
            <Typography sx={{ fontFamily: 'serif', fontSize: '1.1rem', textAlign: 'center' }}>
              P(at least one Type I error) = 1 - (1 - α)^k
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
              where k = number of tests
            </Typography>
          </Paper>

          <TableContainer component={Paper} sx={{ maxWidth: 400 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Number of Tests</TableCell>
                  <TableCell align="right">P(≥1 Type I Error)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow><TableCell>1</TableCell><TableCell align="right">5.0%</TableCell></TableRow>
                <TableRow><TableCell>5</TableCell><TableCell align="right">22.6%</TableCell></TableRow>
                <TableRow><TableCell>10</TableCell><TableCell align="right">40.1%</TableCell></TableRow>
                <TableRow><TableCell>20</TableCell><TableCell align="right">64.2%</TableCell></TableRow>
                <TableRow><TableCell>100</TableCell><TableCell align="right">99.4%</TableCell></TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
            This is why corrections like Bonferroni (α/k) or false discovery rate (FDR)
            control are essential in high-throughput research.
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  // Render Step 5: Type II Error
  const renderStep5 = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
        Type II Error (β): The False Negative
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ borderTop: '4px solid #ff9800' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Warning sx={{ color: '#ff9800', mr: 1, fontSize: 32 }} />
                <Typography variant="h6">Definition</Typography>
              </Box>

              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body1">
                  <strong>Type II Error:</strong> Failing to reject H₀ when H₁ is actually true
                </Typography>
              </Alert>

              <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 2 }}>
                <Typography variant="body1" sx={{ fontFamily: 'serif', fontSize: '1.1rem', textAlign: 'center' }}>
                  β = P(Fail to reject H₀ | H₁ is true)
                </Typography>
              </Paper>

              <Typography variant="body1" paragraph>
                This is a <strong>false negative</strong>—failing to detect a real effect
                that actually exists. You've missed something important.
              </Typography>

              <Typography variant="body2" color="text.secondary">
                β is not set directly—it depends on sample size, effect size, α, and
                variability. Power analysis helps us control β.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ borderTop: '4px solid #2196f3' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Lightbulb sx={{ color: '#2196f3', mr: 1, fontSize: 32 }} />
                <Typography variant="h6">The Critical Connection: Power</Typography>
              </Box>

              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body1" sx={{ fontFamily: 'serif' }}>
                  <strong>Power = 1 - β</strong>
                </Typography>
              </Alert>

              <Typography variant="body1" paragraph>
                <strong>Statistical Power</strong> is the probability of correctly
                rejecting H₀ when H₁ is true—the probability of detecting a real effect.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
                <Typography variant="body2">
                  If β = 0.20 (20% chance of missing an effect),<br/>
                  then Power = 1 - 0.20 = 0.80 (80% chance of detecting it)
                </Typography>
              </Paper>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                The conventional target is 80% power (β = 0.20), meaning a 4:1 ratio
                of Type I to Type II error control when α = 0.05.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Consequences of Type II Error
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                🔬 In Research
              </Typography>
              <Typography variant="body2">
                Missing real discoveries, abandoning promising research directions,
                "negative" results that are actually inconclusive due to low power.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                💊 In Medicine
              </Typography>
              <Typography variant="body2">
                Rejecting effective treatments, patients missing beneficial therapies,
                delaying medical advances.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                🐁 In Animal Research
              </Typography>
              <Typography variant="body2">
                Wasted animal lives in underpowered studies, ethical violations when
                studies are too small to detect effects.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Rate Simulator */}
      <Paper sx={{ p: 3, mt: 3, bgcolor: 'background.default' }}>
        <Typography variant="h6" gutterBottom>
          Interactive Error Rate Simulator
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Adjust α and β to see how they affect decision outcomes across 1000 simulated experiments
          (assuming 50% of experiments have true effects)
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Typography gutterBottom>
              Significance Level (α): <strong>{alpha}</strong>
            </Typography>
            <Slider
              value={alpha}
              onChange={(e, v) => setAlpha(v)}
              min={0.01}
              max={0.20}
              step={0.01}
              marks={[
                { value: 0.01, label: '0.01' },
                { value: 0.05, label: '0.05' },
                { value: 0.10, label: '0.10' },
                { value: 0.20, label: '0.20' },
              ]}
              sx={{ color: '#f44336' }}
            />

            <Typography gutterBottom sx={{ mt: 3 }}>
              Type II Error Rate (β): <strong>{beta}</strong>
            </Typography>
            <Slider
              value={beta}
              onChange={(e, v) => setBeta(v)}
              min={0.05}
              max={0.50}
              step={0.05}
              marks={[
                { value: 0.05, label: '0.05' },
                { value: 0.20, label: '0.20' },
                { value: 0.35, label: '0.35' },
                { value: 0.50, label: '0.50' },
              ]}
              sx={{ color: '#ff9800' }}
            />

            <Typography variant="body2" sx={{ mt: 2 }}>
              Power (1 - β): <strong style={{ color: '#2196f3' }}>{(1 - beta).toFixed(2)}</strong>
            </Typography>

            <Button
              variant="contained"
              onClick={runSimulation}
              startIcon={<PlayArrow />}
              sx={{ mt: 3 }}
            >
              Run Simulation
            </Button>
          </Grid>

          <Grid item xs={12} md={8}>
            {simulationResults.totalTrials > 0 && (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ color: '#4caf50' }}>
                      {simulationResults.trueNegatives}
                    </Typography>
                    <Typography variant="body2">True Negatives</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Expected: ~{Math.round(500 * (1 - alpha))}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ color: '#f44336' }}>
                      {simulationResults.falsePositives}
                    </Typography>
                    <Typography variant="body2">False Positives (Type I)</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Expected: ~{Math.round(500 * alpha)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ color: '#ff9800' }}>
                      {simulationResults.falseNegatives}
                    </Typography>
                    <Typography variant="body2">False Negatives (Type II)</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Expected: ~{Math.round(500 * beta)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, bgcolor: (theme) => alphaFn(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ color: '#2196f3' }}>
                      {simulationResults.truePositives}
                    </Typography>
                    <Typography variant="body2">True Positives (Power)</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Expected: ~{Math.round(500 * (1 - beta))}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Summary relationship */}
      <Alert severity="success" sx={{ mt: 3 }}>
        <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
          Key Takeaway: The Trade-off
        </Typography>
        <Typography variant="body2">
          There's an inherent trade-off between Type I and Type II errors. For a fixed sample size:
          <br/>• Decreasing α (stricter threshold) → increases β (lower power)
          <br/>• Decreasing β (higher power) → increases α (more false positives)
          <br/><br/>
          <strong>Power analysis helps you find the right sample size to achieve your desired balance.</strong>
        </Typography>
      </Alert>
    </Box>
  );

  // Render current step content
  const renderStepContent = () => {
    switch (activeStep) {
      case 0: return renderStep1();
      case 1: return renderStep2();
      case 2: return renderStep3();
      case 3: return renderStep4();
      case 4: return renderStep5();
      default: return renderStep1();
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          background: 'linear-gradient(135deg, #d32f2f 0%, #f44336 50%, #ff5722 100%)',
          color: 'white',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <GridOn sx={{ fontSize: 40, mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Lesson 2: Hypothesis Testing Framework
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              Type I/II Errors and the Decision Matrix
            </Typography>
          </Box>
        </Box>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          Master the fundamental framework underlying all statistical hypothesis testing and power analysis.
        </Typography>
      </Paper>

      {/* Stepper */}
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label, index) => (
          <Step key={label} completed={completedSteps.has(index)}>
            <StepLabel
              onClick={() => setActiveStep(index)}
              sx={{ cursor: 'pointer' }}
            >
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Content */}
      <Paper elevation={2} sx={{ p: 4, mb: 3, minHeight: 500 }}>
        {renderStepContent()}
      </Paper>

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          onClick={handleBack}
          disabled={activeStep === 0}
          startIcon={<NavigateBefore />}
        >
          Previous
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {steps.map((_, index) => (
            <Box
              key={index}
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: index === activeStep ? '#d32f2f' :
                         completedSteps.has(index) ? '#4caf50' : '#e0e0e0',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
              onClick={() => setActiveStep(index)}
            />
          ))}
        </Box>

        <Button
          variant="contained"
          onClick={() => {
            if (activeStep === steps.length - 1) {
              // On last step, call onComplete to mark lesson as done
              if (onComplete) onComplete();
            } else {
              handleNext();
            }
          }}
          endIcon={activeStep === steps.length - 1 ? <CheckCircle /> : <NavigateNext />}
          sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}
        >
          {activeStep === steps.length - 1 ? 'Complete' : 'Next'}
        </Button>
      </Box>

      {/* Learning objectives summary */}
      {activeStep === steps.length - 1 && completedSteps.size === steps.length - 1 && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            Lesson Complete! Key Concepts Mastered:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
              <ListItemText primary="Null (H₀) and Alternative (H₁) hypothesis formulation" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
              <ListItemText primary="The four outcomes in the decision matrix" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
              <ListItemText primary="Type I Error (α) - false positive rate" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle sx={{ color: '#4caf50' }} /></ListItemIcon>
              <ListItemText primary="Type II Error (β) and its relationship to Power (1-β)" />
            </ListItem>
          </List>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Next: Lesson 3 - Statistical Power: Definition, Intuition, and the 80% Convention
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default Lesson02_HypothesisTesting;
