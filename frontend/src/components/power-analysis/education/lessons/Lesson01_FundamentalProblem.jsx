import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Alert,
  Button,
  Slider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import BalanceIcon from '@mui/icons-material/Balance';
import { MathJax, MathJaxContext } from 'better-react-mathjax';
import { alpha as alphaFn } from '@mui/material/styles';

/**
 * Lesson 1: The Fundamental Problem
 *
 * Introduction to power analysis: Why it matters, the ethical dimensions,
 * and the core question every researcher faces.
 *
 * Learning Objectives:
 * 1. Understand why sample size determination is critical
 * 2. Recognize the ethical implications of under/overpowered studies
 * 3. Appreciate power analysis as a principled solution
 *
 * Based on lecture notes Parts 1-2.
 */

const Lesson01_FundamentalProblem = ({ onComplete }) => {
  // Interactive scenario state
  const [sampleSize, setSampleSize] = useState(10);
  const [effectExists, setEffectExists] = useState(true);
  const [showOutcome, setShowOutcome] = useState(false);

  // Canvas for interactive visualization
  const canvasRef = useRef(null);

  // Simulate study outcomes based on sample size
  const simulateOutcome = () => {
    setShowOutcome(true);
  };

  // Calculate probability of detection (simplified for demo)
  const getPowerEstimate = (n) => {
    // Simplified power curve for medium effect (d=0.5)
    // Real power would use non-central t-distribution
    const power = 1 - Math.exp(-0.02 * n);
    return Math.min(power, 0.99);
  };

  const power = getPowerEstimate(sampleSize);
  const powerPercent = (power * 100).toFixed(0);

  // Outcome based on sample size and whether effect exists
  const getOutcome = () => {
    if (!effectExists) {
      // No real effect - might get false positive
      const falsePositiveProb = 0.05; // alpha
      const gotFalsePositive = Math.random() < falsePositiveProb;
      return gotFalsePositive
        ? { type: 'false_positive', message: 'Significant result (Type I Error!)', color: '#f44336' }
        : { type: 'true_negative', message: 'No significant result (Correct!)', color: '#4caf50' };
    } else {
      // Real effect exists - depends on power
      const detected = Math.random() < power;
      return detected
        ? { type: 'true_positive', message: 'Significant result (Detected!)', color: '#4caf50' }
        : { type: 'false_negative', message: 'No significant result (Type II Error!)', color: '#ff9800' };
    }
  };

  const outcome = showOutcome ? getOutcome() : null;

  // Draw scenario visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = 400;
    const height = 200;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    // Draw mice icons (simplified)
    const cols = Math.min(sampleSize, 10);
    const rows = Math.ceil(sampleSize / 10);
    const mouseSize = 20;
    const spacing = 35;
    const startX = 50;
    const startY = 30;

    ctx.font = '20px Arial';
    for (let i = 0; i < Math.min(sampleSize, 50); i++) {
      const row = Math.floor(i / 10);
      const col = i % 10;
      const x = startX + col * spacing;
      const y = startY + row * spacing;

      // Mouse emoji or simple icon
      ctx.fillText('🐭', x, y + 20);
    }

    if (sampleSize > 50) {
      ctx.fillStyle = '#666';
      ctx.font = '14px Arial';
      ctx.fillText(`+${sampleSize - 50} more...`, startX, startY + 6 * spacing);
    }

    // Power indicator
    ctx.fillStyle = power > 0.8 ? '#4caf50' : power > 0.5 ? '#ff9800' : '#f44336';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Power: ${powerPercent}%`, width - 120, 30);

    // Power bar
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(width - 120, 40, 100, 15);
    ctx.fillStyle = power > 0.8 ? '#4caf50' : power > 0.5 ? '#ff9800' : '#f44336';
    ctx.fillRect(width - 120, 40, power * 100, 15);

    // 80% threshold line
    ctx.strokeStyle = '#1976d2';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(width - 120 + 80, 35);
    ctx.lineTo(width - 120 + 80, 60);
    ctx.stroke();
    ctx.setLineDash([]);

  }, [sampleSize, power, powerPercent]);

  return (
    <MathJaxContext>
      <Box>
        {/* Introduction */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 4,
            bgcolor: (theme) => alphaFn(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08),
            borderLeft: '4px solid #f44336'
          }}
        >
          <Typography variant="h4" gutterBottom sx={{ color: '#c62828', fontWeight: 600 }}>
            The Fundamental Problem
          </Typography>

          <Typography variant="h6" sx={{ mb: 2, fontStyle: 'italic', color: '#555' }}>
            "How many subjects do I need?"
          </Typography>

          <Typography paragraph>
            This is perhaps the most common question in experimental design. Whether you're a PhD student
            planning your first mouse study, a clinical researcher designing a trial, or an industry
            scientist optimizing a process—this question sits at the intersection of <strong>ethics</strong>,
            <strong> resources</strong>, and <strong>statistics</strong>.
          </Typography>

          <Typography paragraph>
            Power analysis provides a <em>principled, mathematically grounded</em> answer.
          </Typography>
        </Paper>

        {/* The Stakes: Why This Matters */}
        <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
            <BalanceIcon /> The Stakes: Why This Matters
          </Typography>

          <Grid container spacing={3} sx={{ mt: 2 }}>
            {/* Too Few Subjects */}
            <Grid item xs={12} md={6}>
              <Card elevation={3} sx={{ height: '100%', borderTop: '4px solid #f44336' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#c62828', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ErrorIcon /> Too Few Subjects
                  </Typography>

                  <Box component="ul" sx={{ pl: 2 }}>
                    <Typography component="li" paragraph>
                      <strong>Wasted resources:</strong> The experiment can't reliably detect anything.
                      Time, money, and effort are spent with minimal chance of a conclusive result.
                    </Typography>
                    <Typography component="li" paragraph>
                      <strong>Potential animal suffering without scientific gain:</strong> In biomedical
                      research, using animals without reasonable expectation of valid results raises
                      serious ethical concerns.
                    </Typography>
                    <Typography component="li" paragraph>
                      <strong>False negative results:</strong> You may conclude "no effect" when an
                      effect actually exists, potentially misleading the entire field.
                    </Typography>
                    <Typography component="li">
                      <strong>Inflated effect sizes:</strong> Underpowered studies that do achieve
                      significance tend to dramatically overestimate true effect sizes.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Too Many Subjects */}
            <Grid item xs={12} md={6}>
              <Card elevation={3} sx={{ height: '100%', borderTop: '4px solid #ff9800' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#e65100', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon /> Too Many Subjects
                  </Typography>

                  <Box component="ul" sx={{ pl: 2 }}>
                    <Typography component="li" paragraph>
                      <strong>Unnecessary animal use:</strong> Using more subjects than needed violates
                      the "Reduction" principle of the 3Rs (Replace, Reduce, Refine).
                    </Typography>
                    <Typography component="li" paragraph>
                      <strong>Wasted resources:</strong> Each additional subject costs money, time,
                      and researcher effort that could be allocated elsewhere.
                    </Typography>
                    <Typography component="li" paragraph>
                      <strong>Ethical concerns:</strong> Excessive sample sizes are not "playing it safe"—
                      they represent unnecessary harm when subjects are sentient beings.
                    </Typography>
                    <Typography component="li">
                      <strong>Detects trivial effects:</strong> Very large studies can achieve
                      statistical significance for effects too small to matter practically.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* The Goldilocks Zone */}
          <Alert severity="success" sx={{ mt: 4 }} icon={<CheckCircleIcon />}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              The Goal: The "Goldilocks Zone"
            </Typography>
            <Typography variant="body2">
              Power analysis helps you find the sample size that's <strong>just right</strong>—large
              enough to detect effects of scientific interest with high probability, but not so large
              that you waste resources or cause unnecessary harm.
            </Typography>
          </Alert>
        </Paper>

        {/* Interactive Demo: Sample Size and Power */}
        <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
            🔬 Interactive Demo: Sample Size and Detection
          </Typography>

          <Typography paragraph>
            Adjust the sample size below and see how it affects your probability of detecting
            a real effect. This simplified simulation illustrates the core concept.
          </Typography>

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              {/* Controls */}
              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>
                  Sample Size per Group: <strong>{sampleSize}</strong>
                </Typography>
                <Slider
                  value={sampleSize}
                  onChange={(e, val) => {
                    setSampleSize(val);
                    setShowOutcome(false);
                  }}
                  min={3}
                  max={100}
                  valueLabelDisplay="auto"
                  marks={[
                    { value: 3, label: '3' },
                    { value: 10, label: '10' },
                    { value: 30, label: '30' },
                    { value: 64, label: '64 (80% power)' },
                    { value: 100, label: '100' }
                  ]}
                  sx={{ mt: 2 }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>Scenario:</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    label="Real effect exists"
                    color={effectExists ? 'primary' : 'default'}
                    onClick={() => { setEffectExists(true); setShowOutcome(false); }}
                    variant={effectExists ? 'filled' : 'outlined'}
                  />
                  <Chip
                    label="No real effect"
                    color={!effectExists ? 'primary' : 'default'}
                    onClick={() => { setEffectExists(false); setShowOutcome(false); }}
                    variant={!effectExists ? 'filled' : 'outlined'}
                  />
                </Box>
              </Box>

              <Button
                variant="contained"
                color="primary"
                onClick={simulateOutcome}
                sx={{ mb: 2 }}
              >
                Run Experiment
              </Button>

              {showOutcome && outcome && (
                <Alert severity={outcome.type.includes('positive') && !outcome.type.includes('false') ? 'success' : outcome.type === 'false_negative' ? 'warning' : outcome.type === 'true_negative' ? 'success' : 'error'}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {outcome.message}
                  </Typography>
                </Alert>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: 'center' }}>
                <canvas
                  ref={canvasRef}
                  style={{ border: '1px solid #e0e0e0', borderRadius: 8 }}
                />
                <Typography variant="caption" display="block" sx={{ mt: 1, color: '#666' }}>
                  Each 🐭 represents one subject. Power indicates probability of detecting a real effect.
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Power Interpretation */}
          <Box sx={{ mt: 3, p: 2, bgcolor: (theme) => power > 0.8 ? alphaFn(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) : power > 0.5 ? alphaFn(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) : alphaFn(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), borderRadius: 2 }}>
            <Typography variant="body1">
              With <strong>n = {sampleSize}</strong> per group and a medium effect size (d = 0.5):
            </Typography>
            <Typography variant="h6" sx={{ color: power > 0.8 ? '#2e7d32' : power > 0.5 ? '#e65100' : '#c62828' }}>
              {power > 0.8
                ? `✓ Adequate power (${powerPercent}%) - Good chance of detection`
                : power > 0.5
                  ? `⚠ Moderate power (${powerPercent}%) - Risky, may miss the effect`
                  : `✗ Low power (${powerPercent}%) - Very likely to miss the effect`}
            </Typography>
          </Box>
        </Paper>

        {/* The Deeper Question */}
        <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
            <LightbulbIcon /> The Deeper Question
          </Typography>

          <Typography paragraph>
            When a researcher asks "How many mice do I need?", they're really asking a deeper question:
          </Typography>

          <Paper elevation={0} sx={{ p: 3, bgcolor: (theme) => alphaFn(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" align="center" sx={{ fontStyle: 'italic' }}>
              "What is the <strong>minimum sample size</strong> that gives me a <strong>reasonable chance</strong> of
              detecting a real effect, <strong>if one exists</strong>?"
            </Typography>
          </Paper>

          <Typography paragraph>
            This question has several important components:
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    "Minimum sample size"
                  </Typography>
                  <Typography variant="body2">
                    We want efficiency—not too many, not too few. The smallest n that gets the job done.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    "Reasonable chance"
                  </Typography>
                  <Typography variant="body2">
                    This is <strong>statistical power</strong>—typically 80% or higher. We'll define this precisely.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    "If one exists"
                  </Typography>
                  <Typography variant="body2">
                    We can only detect effects that are real. Power analysis assumes H₁ is true.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        {/* Real-World Consequences */}
        <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
            📊 Real-World Consequences of Underpowered Studies
          </Typography>

          <Typography paragraph>
            The consequences of ignoring power analysis are not just theoretical:
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell><strong>Sample Size (per group)</strong></TableCell>
                  <TableCell><strong>Power (d = 0.5)</strong></TableCell>
                  <TableCell><strong>Probability of Missing Effect</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  { n: 5, power: 0.18, status: 'Severely underpowered' },
                  { n: 10, power: 0.29, status: 'Underpowered' },
                  { n: 20, power: 0.50, status: 'Coin flip' },
                  { n: 30, power: 0.66, status: 'Moderate' },
                  { n: 64, power: 0.80, status: 'Adequate (conventional)' },
                  { n: 100, power: 0.94, status: 'Well-powered' },
                ].map((row) => (
                  <TableRow key={row.n}>
                    <TableCell>{row.n}</TableCell>
                    <TableCell>{(row.power * 100).toFixed(0)}%</TableCell>
                    <TableCell>{((1 - row.power) * 100).toFixed(0)}%</TableCell>
                    <TableCell>
                      <Chip
                        label={row.status}
                        size="small"
                        color={row.power >= 0.8 ? 'success' : row.power >= 0.5 ? 'warning' : 'error'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Alert severity="warning" icon={<WarningIcon />}>
            <Typography variant="body2">
              <strong>Key Insight:</strong> With n = 10 per group (a common "ad hoc" choice), you have
              only a 29% chance of detecting a medium effect. This means <strong>71% of such experiments
              will "fail"</strong> not because the effect doesn't exist, but because the study was underpowered!
            </Typography>
          </Alert>
        </Paper>

        {/* Power Analysis as the Solution */}
        <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon /> Power Analysis: The Principled Solution
          </Typography>

          <Typography paragraph>
            Power analysis is a mathematical framework that relates four key quantities:
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { name: 'Sample Size (n)', description: 'Number of subjects per group', symbol: 'n' },
              { name: 'Effect Size (d)', description: 'Magnitude of the phenomenon', symbol: 'd' },
              { name: 'Significance Level (α)', description: 'False positive rate (typically 0.05)', symbol: 'α' },
              { name: 'Statistical Power (1-β)', description: 'Probability of detection', symbol: '1-β' }
            ].map((item, idx) => (
              <Grid item xs={12} sm={6} md={3} key={idx}>
                <Card variant="outlined" sx={{ height: '100%', textAlign: 'center', p: 2 }}>
                  <Typography variant="h4" sx={{ color: 'primary.main', fontFamily: 'serif', mb: 1 }}>
                    {item.symbol}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {item.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Paper elevation={0} sx={{ p: 3, bgcolor: (theme) => alphaFn(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32' }}>
              The Fundamental Relationship
            </Typography>
            <Typography paragraph>
              These four quantities are mathematically linked. If you know any three, you can solve for the fourth:
            </Typography>
            <MathJax>
              <Typography align="center" sx={{ fontSize: '1.2rem', py: 2 }}>
                {"\\[ n = f(\\text{Effect Size}, \\alpha, \\text{Power}, \\text{Test type}) \\]"}
              </Typography>
            </MathJax>
            <Typography variant="body2">
              In the following lessons, we'll derive this relationship precisely and learn how to use it.
            </Typography>
          </Paper>
        </Paper>

        {/* Summary */}
        <Paper elevation={2} sx={{ p: 4, mb: 4, bgcolor: 'background.default' }}>
          <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
            📝 Key Takeaways
          </Typography>

          <Box component="ul" sx={{ pl: 2 }}>
            <Typography component="li" paragraph>
              <strong>Sample size matters profoundly.</strong> Too few subjects waste resources and risk
              false negatives. Too many waste resources and raise ethical concerns.
            </Typography>
            <Typography component="li" paragraph>
              <strong>Power analysis is not optional.</strong> It's essential for ethical, efficient,
              and valid research. Many journals and ethics committees now require it.
            </Typography>
            <Typography component="li" paragraph>
              <strong>The goal is adequate power (typically 80%+).</strong> This gives you a reasonable
              chance of detecting effects of scientific interest.
            </Typography>
            <Typography component="li">
              <strong>Four quantities are interconnected:</strong> sample size, effect size, α, and power.
              Understanding their relationship is the foundation of study design.
            </Typography>
          </Box>
        </Paper>

        {/* Next Lesson Preview */}
        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Coming Next: Lesson 2 - Hypothesis Testing Framework
          </Typography>
          <Typography variant="body2">
            Before we can calculate power, we need to understand the hypothesis testing framework:
            null and alternative hypotheses, Type I and Type II errors, and the decision matrix.
          </Typography>
        </Alert>

        {/* Complete Lesson Button */}
        {onComplete && (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={onComplete}
              startIcon={<CheckCircleIcon />}
            >
              Mark Lesson Complete
            </Button>
          </Box>
        )}
      </Box>
    </MathJaxContext>
  );
};

export default Lesson01_FundamentalProblem;
