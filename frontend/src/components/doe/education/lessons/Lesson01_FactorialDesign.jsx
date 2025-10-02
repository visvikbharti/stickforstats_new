import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Slider
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import ScienceIcon from '@mui/icons-material/Science';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MathJax } from 'better-react-mathjax';

/**
 * Lesson 1: Factorial Design Fundamentals
 *
 * Teaches why factorial designs are superior to OFAT (One-Factor-At-A-Time)
 * and introduces the basic structure of factorial experiments
 */

const Lesson01_FactorialDesign = ({ onComplete }) => {
  const [temperature, setTemperature] = useState(30);
  const [pH, setPH] = useState(6.5);
  const [showOFAT, setShowOFAT] = useState(false);
  const [showFactorial, setShowFactorial] = useState(false);

  // Simulate yield function (maximum at temp=32, pH=6.8)
  const calculateYield = (temp, ph) => {
    const tempEffect = -0.5 * ((temp - 32) ** 2) / 9;
    const pHEffect = -0.5 * ((ph - 6.8) ** 2) / 0.25;
    const interaction = 0.3 * (temp - 32) * (ph - 6.8) / 3;
    return Math.max(0, 100 + 10 * (tempEffect + pHEffect + interaction));
  };

  // OFAT (One-Factor-At-A-Time) Experiment
  const ofatExperiment = useMemo(() => {
    const baseTemp = 30;
    const basePH = 6.5;

    // Step 1: Vary temperature, fix pH
    const tempLevels = [28, 30, 32, 34];
    const tempResults = tempLevels.map(t => ({
      temp: t,
      pH: basePH,
      yield: calculateYield(t, basePH)
    }));
    const bestTemp = tempResults.reduce((max, curr) =>
      curr.yield > max.yield ? curr : max
    );

    // Step 2: Vary pH, fix temperature at "best"
    const pHLevels = [6.0, 6.5, 7.0, 7.5];
    const pHResults = pHLevels.map(p => ({
      temp: bestTemp.temp,
      pH: p,
      yield: calculateYield(bestTemp.temp, p)
    }));
    const bestPH = pHResults.reduce((max, curr) =>
      curr.yield > max.yield ? curr : max
    );

    return {
      tempResults,
      pHResults,
      bestConditions: { temp: bestTemp.temp, pH: bestPH.pH },
      finalYield: bestPH.yield,
      totalRuns: tempResults.length + pHResults.length
    };
  }, []);

  // Factorial Experiment (2² design)
  const factorialExperiment = useMemo(() => {
    const levels = {
      temp: [28, 34],
      pH: [6.0, 7.5]
    };

    const runs = [];
    levels.temp.forEach(t => {
      levels.pH.forEach(p => {
        runs.push({
          temp: t,
          pH: p,
          yield: calculateYield(t, p)
        });
      });
    });

    const bestRun = runs.reduce((max, curr) =>
      curr.yield > max.yield ? curr : max
    );

    // Estimate main effects
    const tempHighAvg = (runs[2].yield + runs[3].yield) / 2;
    const tempLowAvg = (runs[0].yield + runs[1].yield) / 2;
    const tempEffect = tempHighAvg - tempLowAvg;

    const pHHighAvg = (runs[1].yield + runs[3].yield) / 2;
    const pHLowAvg = (runs[0].yield + runs[2].yield) / 2;
    const pHEffect = pHHighAvg - pHLowAvg;

    // Interaction effect
    const interactionEffect =
      ((runs[3].yield - runs[2].yield) - (runs[1].yield - runs[0].yield)) / 2;

    return {
      runs,
      bestConditions: { temp: bestRun.temp, pH: bestRun.pH },
      finalYield: bestRun.yield,
      totalRuns: runs.length,
      tempEffect,
      pHEffect,
      interactionEffect
    };
  }, []);

  return (
    <Box>
      {/* Introduction */}
      <Paper elevation={2} sx={{ p: 4, mb: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#1976d2', fontWeight: 600 }}>
          Factorial Design Fundamentals
        </Typography>

        <Typography variant="h6" paragraph sx={{ mt: 2 }}>
          Why Change One Thing at a Time Doesn't Work
        </Typography>

        <Typography paragraph>
          Imagine you're optimizing a fermentation process. You have temperature and pH to adjust.
          The traditional approach is <strong>OFAT (One-Factor-At-A-Time)</strong>: first optimize
          temperature, then optimize pH. Seems logical, right?
        </Typography>

        <Alert severity="error" icon={<CloseIcon />}>
          <Typography variant="body2">
            <strong>The OFAT Problem:</strong> OFAT experiments miss <em>interactions</em> between
            factors. They can lead you to suboptimal conditions while using more experiments than
            necessary. Worse, they give you no information about how factors work together.
          </Typography>
        </Alert>
      </Paper>

      {/* The Problem with OFAT */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
          🔴 The OFAT Approach (One-Factor-At-A-Time)
        </Typography>

        <Typography paragraph>
          Let's walk through a typical OFAT experiment for optimizing protein yield:
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#fff3e0', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Step 1: Optimize Temperature
                </Typography>
                <Typography variant="body2" paragraph>
                  Fix pH at baseline (6.5). Test 4 temperature levels: 28°C, 30°C, 32°C, 34°C.
                  Find that 32°C gives best yield.
                </Typography>
                <Chip label="4 experiments" color="warning" size="small" />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#fff3e0', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Step 2: Optimize pH
                </Typography>
                <Typography variant="body2" paragraph>
                  Fix temperature at 32°C. Test 4 pH levels: 6.0, 6.5, 7.0, 7.5.
                  Find that pH 7.0 gives best yield.
                </Typography>
                <Chip label="4 more experiments" color="warning" size="small" />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Button
          variant="contained"
          color="warning"
          onClick={() => setShowOFAT(!showOFAT)}
          sx={{ mb: 3 }}
        >
          {showOFAT ? 'Hide' : 'Show'} OFAT Results
        </Button>

        {showOFAT && (
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TableContainer component={Paper} sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Temp (°C)</strong></TableCell>
                        <TableCell><strong>pH</strong></TableCell>
                        <TableCell><strong>Yield</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ofatExperiment.tempResults.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{row.temp}</TableCell>
                          <TableCell>{row.pH.toFixed(1)}</TableCell>
                          <TableCell>{row.yield.toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid item xs={12} md={6}>
                <TableContainer component={Paper} sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Temp (°C)</strong></TableCell>
                        <TableCell><strong>pH</strong></TableCell>
                        <TableCell><strong>Yield</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ofatExperiment.pHResults.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{row.temp}</TableCell>
                          <TableCell>{row.pH.toFixed(1)}</TableCell>
                          <TableCell>{row.yield.toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>

            <Paper sx={{ p: 2, bgcolor: '#ffe0b2' }}>
              <Typography variant="h6">OFAT Result</Typography>
              <Typography>
                <strong>Best Conditions:</strong> Temperature = {ofatExperiment.bestConditions.temp}°C,
                pH = {ofatExperiment.bestConditions.pH.toFixed(1)}
              </Typography>
              <Typography>
                <strong>Final Yield:</strong> {ofatExperiment.finalYield.toFixed(1)}
              </Typography>
              <Typography>
                <strong>Total Experiments:</strong> {ofatExperiment.totalRuns}
              </Typography>
            </Paper>
          </Box>
        )}

        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>What We Missed:</strong> OFAT assumes factors are independent. But what if high
            temperature works best with high pH, but low temperature works best with low pH? OFAT
            never tests these combinations, so it can't detect this <em>interaction</em>.
          </Typography>
        </Alert>
      </Paper>

      {/* The Factorial Approach */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
          ✅ The Factorial Approach (Test All Combinations)
        </Typography>

        <MathJax>
          <Typography paragraph>
            A <strong>2² factorial design</strong> tests all combinations of 2 factors at 2 levels each.
            For temperature (low=28°C, high=34°C) and pH (low=6.0, high=7.5):
          </Typography>

          <Box sx={{ p: 3, bgcolor: '#e8f5e9', borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Factorial Design Matrix
            </Typography>

            <Typography paragraph>
              Total combinations = {"\\(2^2 = 4\\)"} experiments
            </Typography>

            <TableContainer component={Paper} sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Run</strong></TableCell>
                    <TableCell><strong>Temp (°C)</strong></TableCell>
                    <TableCell><strong>pH</strong></TableCell>
                    <TableCell><strong>Yield</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {factorialExperiment.runs.map((run, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{run.temp}</TableCell>
                      <TableCell>{run.pH.toFixed(1)}</TableCell>
                      <TableCell>{run.yield.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </MathJax>

        <Button
          variant="contained"
          color="success"
          onClick={() => setShowFactorial(!showFactorial)}
          sx={{ mb: 3 }}
        >
          {showFactorial ? 'Hide' : 'Show'} Factorial Analysis
        </Button>

        {showFactorial && (
          <Box sx={{ mb: 3 }}>
            <Paper sx={{ p: 2, bgcolor: '#e8f5e9', mb: 2 }}>
              <Typography variant="h6">Factorial Result</Typography>
              <Typography>
                <strong>Best Conditions:</strong> Temperature = {factorialExperiment.bestConditions.temp}°C,
                pH = {factorialExperiment.bestConditions.pH.toFixed(1)}
              </Typography>
              <Typography>
                <strong>Final Yield:</strong> {factorialExperiment.finalYield.toFixed(1)}
              </Typography>
              <Typography>
                <strong>Total Experiments:</strong> {factorialExperiment.totalRuns}
              </Typography>
            </Paper>

            <Typography variant="h6" gutterBottom>
              Main Effects & Interactions
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Temperature Effect
                    </Typography>
                    <Typography variant="h5" color={factorialExperiment.tempEffect > 0 ? 'success.main' : 'error.main'}>
                      {factorialExperiment.tempEffect > 0 ? '+' : ''}
                      {factorialExperiment.tempEffect.toFixed(2)}
                    </Typography>
                    <Typography variant="body2">
                      Average change in yield when going from low to high temperature
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      pH Effect
                    </Typography>
                    <Typography variant="h5" color={factorialExperiment.pHEffect > 0 ? 'success.main' : 'error.main'}>
                      {factorialExperiment.pHEffect > 0 ? '+' : ''}
                      {factorialExperiment.pHEffect.toFixed(2)}
                    </Typography>
                    <Typography variant="body2">
                      Average change in yield when going from low to high pH
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: '#fff3e0' }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Interaction Effect
                    </Typography>
                    <Typography variant="h5" color="primary">
                      {factorialExperiment.interactionEffect > 0 ? '+' : ''}
                      {factorialExperiment.interactionEffect.toFixed(2)}
                    </Typography>
                    <Typography variant="body2">
                      How temp and pH combine — <strong>OFAT can't detect this!</strong>
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Factorial Wins:</strong> Fewer experiments (4 vs 8), better result
            (yield {factorialExperiment.finalYield.toFixed(1)} vs {ofatExperiment.finalYield.toFixed(1)}),
            AND we get information about the interaction!
          </Typography>
        </Alert>
      </Paper>

      {/* Key Concepts */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
          📚 Key Factorial Design Concepts
        </Typography>

        <MathJax>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Factors
                  </Typography>
                  <Typography variant="body2">
                    The variables you control (temperature, pH, concentration, etc.). Each factor
                    is tested at multiple <strong>levels</strong> (e.g., low, medium, high).
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Levels
                  </Typography>
                  <Typography variant="body2">
                    The specific values tested for each factor. A 2-level design tests each factor
                    at two values (often coded as -1 and +1, or "low" and "high").
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Main Effects
                  </Typography>
                  <Typography variant="body2">
                    The average effect of changing a factor from low to high, <em>averaged across
                    all levels of other factors</em>. This is more robust than OFAT estimates.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Interactions
                  </Typography>
                  <Typography variant="body2">
                    When the effect of one factor <em>depends on</em> the level of another factor.
                    Example: Temperature effect is larger at high pH than at low pH.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, p: 3, bgcolor: '#f5f5f5', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Factorial Design Notation
            </Typography>

            <Typography paragraph>
              A <strong>{"\\(2^k\\)"} factorial design</strong> has:
              <br />
              • k factors
              <br />
              • 2 levels per factor
              <br />
              • {"\\(2^k\\)"} total experimental runs
            </Typography>

            <Typography paragraph>
              Examples:
              <br />
              • {"\\(2^2\\)"} design: 2 factors, 4 runs
              <br />
              • {"\\(2^3\\)"} design: 3 factors, 8 runs
              <br />
              • {"\\(2^5\\)"} design: 5 factors, 32 runs
            </Typography>
          </Box>
        </MathJax>
      </Paper>

      {/* Summary and Completion */}
      <Paper elevation={3} sx={{ p: 4, mt: 4, bgcolor: '#e8f5e9' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#388e3c' }}>
          ✅ Key Takeaways
        </Typography>

        <Box sx={{ pl: 2 }}>
          <Typography paragraph>
            • <strong>OFAT is inefficient</strong> — more experiments, less information, misses interactions
          </Typography>
          <Typography paragraph>
            • <strong>Factorial designs test all combinations</strong> of factor levels systematically
          </Typography>
          <Typography paragraph>
            • <strong>Main effects are robust</strong> — averaged across all other factors
          </Typography>
          <Typography paragraph>
            • <strong>Interactions are revealed</strong> — factorial designs show when factors combine synergistically
          </Typography>
          <Typography paragraph>
            • <strong>{"\\(2^k\\)"} notation</strong> — k factors at 2 levels each = {"\\(2^k\\)"} total runs
          </Typography>
        </Box>

        {onComplete && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
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
      </Paper>
    </Box>
  );
};

export default Lesson01_FactorialDesign;
