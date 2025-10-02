import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Chip
} from '@mui/material';
import { MathJax } from 'better-react-mathjax';
import BalanceIcon from '@mui/icons-material/Balance';
import TuneIcon from '@mui/icons-material/Tune';

/**
 * DOE Lesson 7: Optimization & Desirability Functions
 *
 * Topics:
 * - Multi-objective optimization challenges
 * - Desirability function framework
 * - Individual desirability (target, maximize, minimize)
 * - Overall desirability (geometric mean)
 * - Trade-offs and Pareto frontiers
 */

const Lesson07_Desirability = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [temp, setTemp] = useState(160);
  const [catalyst, setCatalyst] = useState(2.0);
  const [yieldWeight, setYieldWeight] = useState(1);
  const [purityWeight, setPurityWeight] = useState(1);
  const [costWeight, setCostWeight] = useState(1);
  const [targetType, setTargetType] = useState('balanced');

  // Simulate three competing responses
  const responses = useMemo(() => {
    const tempCoded = (temp - 160) / 10;
    const catCoded = (catalyst - 2.0) / 0.5;

    // Yield: maximize (higher is better)
    const yieldValue = 85 + 3 * tempCoded + 2 * catCoded
                       - 0.5 * tempCoded * tempCoded
                       - 0.3 * catCoded * catCoded
                       + 0.4 * tempCoded * catCoded;

    // Purity: maximize (higher is better)
    const purityValue = 95 - 1.5 * tempCoded + 2.5 * catCoded
                        - 0.6 * tempCoded * tempCoded
                        - 0.4 * catCoded * catCoded
                        - 0.3 * tempCoded * catCoded;

    // Cost: minimize (lower is better)
    const costValue = 50 + 4 * tempCoded + 6 * catCoded
                      + 0.3 * tempCoded * tempCoded
                      + 0.5 * catCoded * catCoded;

    return {
      yield: Math.max(70, Math.min(95, yieldValue)),
      purity: Math.max(88, Math.min(99, purityValue)),
      cost: Math.max(40, Math.min(70, costValue))
    };
  }, [temp, catalyst]);

  // Individual desirability functions
  const desirabilities = useMemo(() => {
    // Yield: maximize (target = 95, lower = 75)
    const dYield = responses.yield <= 75 ? 0 :
                   responses.yield >= 95 ? 1 :
                   Math.pow((responses.yield - 75) / (95 - 75), 2);

    // Purity: maximize (target = 99, lower = 90)
    const dPurity = responses.purity <= 90 ? 0 :
                    responses.purity >= 99 ? 1 :
                    Math.pow((responses.purity - 90) / (99 - 90), 2);

    // Cost: minimize (target = 40, upper = 65)
    const dCost = responses.cost >= 65 ? 0 :
                  responses.cost <= 40 ? 1 :
                  Math.pow((65 - responses.cost) / (65 - 40), 2);

    // Overall desirability (weighted geometric mean)
    const totalWeight = yieldWeight + purityWeight + costWeight;
    const D = Math.pow(
      Math.pow(dYield, yieldWeight) *
      Math.pow(dPurity, purityWeight) *
      Math.pow(dCost, costWeight),
      1 / totalWeight
    );

    return {
      yield: dYield,
      purity: dPurity,
      cost: dCost,
      overall: D
    };
  }, [responses, yieldWeight, purityWeight, costWeight]);

  // Find optimum for different objectives
  const optima = useMemo(() => {
    const results = {
      yield: { temp: 0, catalyst: 0, responses: {}, D: 0 },
      purity: { temp: 0, catalyst: 0, responses: {}, D: 0 },
      cost: { temp: 0, catalyst: 0, responses: {}, D: 0 },
      balanced: { temp: 0, catalyst: 0, responses: {}, D: 0 }
    };

    // Search grid
    for (let t = 150; t <= 170; t += 0.5) {
      for (let c = 1.5; c <= 2.5; c += 0.05) {
        const tempCoded = (t - 160) / 10;
        const catCoded = (c - 2.0) / 0.5;

        const y = 85 + 3 * tempCoded + 2 * catCoded
                  - 0.5 * tempCoded * tempCoded
                  - 0.3 * catCoded * catCoded
                  + 0.4 * tempCoded * catCoded;

        const p = 95 - 1.5 * tempCoded + 2.5 * catCoded
                  - 0.6 * tempCoded * tempCoded
                  - 0.4 * catCoded * catCoded
                  - 0.3 * tempCoded * catCoded;

        const co = 50 + 4 * tempCoded + 6 * catCoded
                   + 0.3 * tempCoded * tempCoded
                   + 0.5 * catCoded * catCoded;

        const resp = {
          yield: Math.max(70, Math.min(95, y)),
          purity: Math.max(88, Math.min(99, p)),
          cost: Math.max(40, Math.min(70, co))
        };

        // Desirabilities
        const dY = resp.yield <= 75 ? 0 : resp.yield >= 95 ? 1 :
                   Math.pow((resp.yield - 75) / 20, 2);
        const dP = resp.purity <= 90 ? 0 : resp.purity >= 99 ? 1 :
                   Math.pow((resp.purity - 90) / 9, 2);
        const dC = resp.cost >= 65 ? 0 : resp.cost <= 40 ? 1 :
                   Math.pow((65 - resp.cost) / 25, 2);

        // Overall (equal weights)
        const D = Math.pow(dY * dP * dC, 1/3);

        // Check if best for yield
        if (resp.yield > results.yield.responses.yield || results.yield.responses.yield === undefined) {
          results.yield = { temp: t, catalyst: c, responses: resp, D };
        }

        // Check if best for purity
        if (resp.purity > results.purity.responses.purity || results.purity.responses.purity === undefined) {
          results.purity = { temp: t, catalyst: c, responses: resp, D };
        }

        // Check if best for cost
        if (resp.cost < results.cost.responses.cost || results.cost.responses.cost === undefined) {
          results.cost = { temp: t, catalyst: c, responses: resp, D };
        }

        // Check if best overall desirability
        if (D > results.balanced.D) {
          results.balanced = { temp: t, catalyst: c, responses: resp, D };
        }
      }
    }

    return results;
  }, []);

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleComplete = () => {
    if (onComplete) onComplete();
  };

  // Render Pareto frontier
  const renderParetoPlot = () => {
    const width = 400;
    const height = 300;
    const margin = 50;

    // Generate Pareto solutions
    const solutions = [];
    for (let t = 150; t <= 170; t += 1) {
      for (let c = 1.5; c <= 2.5; c += 0.1) {
        const tempCoded = (t - 160) / 10;
        const catCoded = (c - 2.0) / 0.5;

        const y = Math.max(70, Math.min(95, 85 + 3 * tempCoded + 2 * catCoded
                  - 0.5 * tempCoded * tempCoded - 0.3 * catCoded * catCoded
                  + 0.4 * tempCoded * catCoded));

        const co = Math.max(40, Math.min(70, 50 + 4 * tempCoded + 6 * catCoded
                   + 0.3 * tempCoded * tempCoded + 0.5 * catCoded * catCoded));

        solutions.push({ yield: y, cost: co, temp: t, catalyst: c });
      }
    }

    return (
      <Box sx={{ position: 'relative', width, height, border: '1px solid #ddd', bgcolor: 'white' }}>
        <svg width={width} height={height}>
          {/* Axes */}
          <line x1={margin} y1={height - margin} x2={width - 20} y2={height - margin}
                stroke="black" strokeWidth="2" />
          <line x1={margin} y1={height - margin} x2={margin} y2={20}
                stroke="black" strokeWidth="2" />

          {/* Labels */}
          <text x={width / 2} y={height - 10} textAnchor="middle" fontSize="12" fontWeight="bold">
            Yield (%)
          </text>
          <text x={15} y={height / 2} textAnchor="middle" fontSize="12" fontWeight="bold"
                transform={`rotate(-90, 15, ${height / 2})`}>
            Cost ($)
          </text>

          {/* Grid */}
          {[75, 80, 85, 90, 95].map(y => (
            <g key={`y-${y}`}>
              <line
                x1={margin + ((y - 70) / 25) * (width - margin - 20)}
                y1={height - margin}
                x2={margin + ((y - 70) / 25) * (width - margin - 20)}
                y2={height - margin + 5}
                stroke="black"
              />
              <text
                x={margin + ((y - 70) / 25) * (width - margin - 20)}
                y={height - margin + 18}
                textAnchor="middle"
                fontSize="10"
              >
                {y}
              </text>
            </g>
          ))}

          {[40, 50, 60, 70].map(c => (
            <g key={`c-${c}`}>
              <line
                x1={margin - 5}
                y1={height - margin - ((c - 40) / 30) * (height - margin - 20)}
                x2={margin}
                y2={height - margin - ((c - 40) / 30) * (height - margin - 20)}
                stroke="black"
              />
              <text
                x={margin - 10}
                y={height - margin - ((c - 40) / 30) * (height - margin - 20) + 3}
                textAnchor="end"
                fontSize="10"
              >
                {c}
              </text>
            </g>
          ))}

          {/* Solutions */}
          {solutions.map((sol, idx) => (
            <circle
              key={idx}
              cx={margin + ((sol.yield - 70) / 25) * (width - margin - 20)}
              cy={height - margin - ((sol.cost - 40) / 30) * (height - margin - 20)}
              r={2}
              fill="rgba(33, 150, 243, 0.3)"
            />
          ))}

          {/* Optima markers */}
          {/* Yield optimum */}
          <circle
            cx={margin + ((optima.yield.responses.yield - 70) / 25) * (width - margin - 20)}
            cy={height - margin - ((optima.yield.responses.cost - 40) / 30) * (height - margin - 20)}
            r={6}
            fill="green"
            stroke="white"
            strokeWidth="2"
          />

          {/* Cost optimum */}
          <circle
            cx={margin + ((optima.cost.responses.yield - 70) / 25) * (width - margin - 20)}
            cy={height - margin - ((optima.cost.responses.cost - 40) / 30) * (height - margin - 20)}
            r={6}
            fill="red"
            stroke="white"
            strokeWidth="2"
          />

          {/* Balanced optimum */}
          <circle
            cx={margin + ((optima.balanced.responses.yield - 70) / 25) * (width - margin - 20)}
            cy={height - margin - ((optima.balanced.responses.cost - 40) / 30) * (height - margin - 20)}
            r={7}
            fill="gold"
            stroke="black"
            strokeWidth="2"
          />
        </svg>

        <Box sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'rgba(255,255,255,0.95)',
                   p: 1, border: '1px solid #ddd', borderRadius: 1, fontSize: '0.75rem' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
            <Box sx={{ width: 12, height: 12, bgcolor: 'green', borderRadius: '50%' }} />
            <Typography variant="caption">Max Yield</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
            <Box sx={{ width: 12, height: 12, bgcolor: 'red', borderRadius: '50%' }} />
            <Typography variant="caption">Min Cost</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, bgcolor: 'gold', borderRadius: '50%' }} />
            <Typography variant="caption">Balanced</Typography>
          </Box>
        </Box>
      </Box>
    );
  };

  const steps = [
    {
      label: 'The Multi-Objective Challenge',
      content: (
        <Box>
          <Alert severity="warning" icon={<BalanceIcon />} sx={{ mb: 2 }}>
            <strong>Real-World Dilemma:</strong> Optimizing one response often degrades others.
            How do we find the "best" compromise when objectives conflict?
          </Alert>

          <Typography variant="h6" gutterBottom>
            Why Single-Response Optimization Fails
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Objective</strong></TableCell>
                  <TableCell><strong>Optimum Settings</strong></TableCell>
                  <TableCell><strong>Yield (%)</strong></TableCell>
                  <TableCell><strong>Purity (%)</strong></TableCell>
                  <TableCell><strong>Cost ($)</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                  <TableCell>Maximize Yield</TableCell>
                  <TableCell>
                    T={optima.yield.temp.toFixed(1)}°C, Cat={optima.yield.catalyst.toFixed(2)}%
                  </TableCell>
                  <TableCell><strong>{optima.yield.responses.yield.toFixed(1)}</strong></TableCell>
                  <TableCell sx={{ color: 'error.main' }}>{optima.yield.responses.purity.toFixed(1)}</TableCell>
                  <TableCell sx={{ color: 'error.main' }}>{optima.yield.responses.cost.toFixed(1)}</TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                  <TableCell>Maximize Purity</TableCell>
                  <TableCell>
                    T={optima.purity.temp.toFixed(1)}°C, Cat={optima.purity.catalyst.toFixed(2)}%
                  </TableCell>
                  <TableCell sx={{ color: 'error.main' }}>{optima.purity.responses.yield.toFixed(1)}</TableCell>
                  <TableCell><strong>{optima.purity.responses.purity.toFixed(1)}</strong></TableCell>
                  <TableCell sx={{ color: 'error.main' }}>{optima.purity.responses.cost.toFixed(1)}</TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: '#ffebee' }}>
                  <TableCell>Minimize Cost</TableCell>
                  <TableCell>
                    T={optima.cost.temp.toFixed(1)}°C, Cat={optima.cost.catalyst.toFixed(2)}%
                  </TableCell>
                  <TableCell sx={{ color: 'error.main' }}>{optima.cost.responses.yield.toFixed(1)}</TableCell>
                  <TableCell sx={{ color: 'error.main' }}>{optima.cost.responses.purity.toFixed(1)}</TableCell>
                  <TableCell><strong>{optima.cost.responses.cost.toFixed(1)}</strong></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>The Problem:</strong> Each single-objective optimum is terrible for the other
            responses! We need a systematic way to balance competing goals.
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Pareto Frontier
          </Typography>

          <Typography variant="body2" paragraph>
            The <strong>Pareto frontier</strong> is the set of solutions where improving one
            objective requires worsening another. No free lunch!
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            {renderParetoPlot()}
          </Box>

          <Typography variant="body2" paragraph>
            • <span style={{ color: 'green', fontWeight: 'bold' }}>Green:</span> Maximum yield (but high cost)<br/>
            • <span style={{ color: 'red', fontWeight: 'bold' }}>Red:</span> Minimum cost (but low yield)<br/>
            • <span style={{ color: 'gold', fontWeight: 'bold' }}>Gold:</span> Balanced trade-off
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Solution Approaches
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    1. Constrained Optimization
                  </Typography>
                  <Typography variant="body2">
                    Optimize one response while constraining others:<br/>
                    <em>Maximize yield subject to purity ≥ 95%, cost ≤ $55</em>
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ bgcolor: '#e8f5e9' }}>
                <CardContent>
                  <Typography variant="subtitle2" color="success.main" gutterBottom>
                    2. Desirability Functions ✓
                  </Typography>
                  <Typography variant="body2">
                    Convert all responses to a common 0-1 scale, then combine into a single
                    overall desirability to optimize.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )
    },
    {
      label: 'Desirability Functions Framework',
      content: (
        <Box>
          <Alert severity="info" icon={<TuneIcon />} sx={{ mb: 2 }}>
            <strong>Derringer-Suich Desirability Functions</strong> transform each response to a
            0-1 scale where 0 = completely undesirable and 1 = ideal.
          </Alert>

          <Typography variant="h6" gutterBottom>
            Individual Desirability Functions
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Chip label="Larger-the-Better" color="success" size="small" sx={{ mb: 1 }} />
                  <Typography variant="body2" gutterBottom>
                    For responses to <strong>maximize</strong> (e.g., yield, strength):
                  </Typography>
                  <MathJax>
                    {"\\[ d_i = \\begin{cases} 0 & y_i \\leq L \\\\ \\left(\\frac{y_i - L}{T - L}\\right)^r & L < y_i < T \\\\ 1 & y_i \\geq T \\end{cases} \\]"}
                  </MathJax>
                  <Typography variant="caption">
                    L = lower bound, T = target
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Chip label="Smaller-the-Better" color="error" size="small" sx={{ mb: 1 }} />
                  <Typography variant="body2" gutterBottom>
                    For responses to <strong>minimize</strong> (e.g., cost, defects):
                  </Typography>
                  <MathJax>
                    {"\\[ d_i = \\begin{cases} 1 & y_i \\leq T \\\\ \\left(\\frac{U - y_i}{U - T}\\right)^r & T < y_i < U \\\\ 0 & y_i \\geq U \\end{cases} \\]"}
                  </MathJax>
                  <Typography variant="caption">
                    T = target, U = upper bound
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Chip label="Target-is-Best" color="primary" size="small" sx={{ mb: 1 }} />
                  <Typography variant="body2" gutterBottom>
                    For <strong>nominal</strong> targets (e.g., pH, diameter):
                  </Typography>
                  <MathJax>
                    {"\\[ d_i = \\begin{cases} \\left(\\frac{y_i - L}{T - L}\\right)^{r_1} & L < y_i < T \\\\ \\left(\\frac{U - y_i}{U - T}\\right)^{r_2} & T < y_i < U \\\\ 0 & \\text{otherwise} \\end{cases} \\]"}
                  </MathJax>
                  <Typography variant="caption">
                    L, T, U = lower, target, upper
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>
            The Weight Parameter r
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              The exponent <em>r</em> controls the shape of the desirability curve:
            </Typography>
            <ul style={{ marginTop: 8, fontSize: '0.875rem' }}>
              <li><strong>r = 1:</strong> Linear transformation (neutral)</li>
              <li><strong>r &gt; 1:</strong> Emphasizes achieving the target (convex)</li>
              <li><strong>r &lt; 1:</strong> Less emphasis on target (concave)</li>
            </ul>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Typically, r = 1 or r = 2 is used unless there's strong domain knowledge.
            </Typography>
          </Paper>

          <Typography variant="h6" gutterBottom>
            Overall Desirability
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa' }}>
            <Typography variant="body2" gutterBottom>
              Combine individual desirabilities using the <strong>weighted geometric mean</strong>:
            </Typography>
            <MathJax>
              {"\\[ D = \\left( d_1^{w_1} \\cdot d_2^{w_2} \\cdot \\ldots \\cdot d_k^{w_k} \\right)^{1 / \\sum w_i} \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Where w<sub>i</sub> is the importance weight for response <em>i</em>.
            </Typography>
          </Paper>

          <Alert severity="success" sx={{ mt: 2 }}>
            <strong>Why Geometric Mean?</strong> If any single response is completely undesirable
            (d<sub>i</sub> = 0), then D = 0. This prevents compensating a terrible response with
            good performance elsewhere—a key advantage over arithmetic mean!
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Example: Chemical Process
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Response</strong></TableCell>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell><strong>Lower</strong></TableCell>
                  <TableCell><strong>Target</strong></TableCell>
                  <TableCell><strong>Upper</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Yield (%)</TableCell>
                  <TableCell>Maximize</TableCell>
                  <TableCell>75</TableCell>
                  <TableCell>95</TableCell>
                  <TableCell>—</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Purity (%)</TableCell>
                  <TableCell>Maximize</TableCell>
                  <TableCell>90</TableCell>
                  <TableCell>99</TableCell>
                  <TableCell>—</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Cost ($)</TableCell>
                  <TableCell>Minimize</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>40</TableCell>
                  <TableCell>65</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )
    },
    {
      label: 'Interactive Optimization',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Explore Trade-offs in Real Time
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            Adjust factor settings and weights to see how they affect individual and overall
            desirability. Find the sweet spot!
          </Alert>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Temperature (°C)
                </Typography>
                <Slider
                  value={temp}
                  onChange={(e, val) => setTemp(val)}
                  min={150}
                  max={170}
                  step={1}
                  marks={[
                    { value: 150, label: '150' },
                    { value: 160, label: '160' },
                    { value: 170, label: '170' }
                  ]}
                  valueLabelDisplay="on"
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Catalyst (%)
                </Typography>
                <Slider
                  value={catalyst}
                  onChange={(e, val) => setCatalyst(val)}
                  min={1.5}
                  max={2.5}
                  step={0.1}
                  marks={[
                    { value: 1.5, label: '1.5' },
                    { value: 2.0, label: '2.0' },
                    { value: 2.5, label: '2.5' }
                  ]}
                  valueLabelDisplay="on"
                />
              </Paper>
            </Grid>
          </Grid>

          <Paper sx={{ p: 2, mb: 2, bgcolor: '#fafafa' }}>
            <Typography variant="h6" gutterBottom>
              Current Results
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">Yield</Typography>
                <Typography variant="h6">{responses.yield.toFixed(1)}%</Typography>
                <Typography variant="caption" color={desirabilities.yield > 0.7 ? 'success.main' : 'error.main'}>
                  d = {desirabilities.yield.toFixed(3)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">Purity</Typography>
                <Typography variant="h6">{responses.purity.toFixed(1)}%</Typography>
                <Typography variant="caption" color={desirabilities.purity > 0.7 ? 'success.main' : 'error.main'}>
                  d = {desirabilities.purity.toFixed(3)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">Cost</Typography>
                <Typography variant="h6">${responses.cost.toFixed(1)}</Typography>
                <Typography variant="caption" color={desirabilities.cost > 0.7 ? 'success.main' : 'error.main'}>
                  d = {desirabilities.cost.toFixed(3)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">Overall</Typography>
                <Typography variant="h6" color="primary">{(desirabilities.overall * 100).toFixed(1)}%</Typography>
                <Typography variant="caption">
                  D = {desirabilities.overall.toFixed(3)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          <Typography variant="h6" gutterBottom>
            Importance Weights
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Yield Importance
                </Typography>
                <Slider
                  value={yieldWeight}
                  onChange={(e, val) => setYieldWeight(val)}
                  min={0.5}
                  max={3}
                  step={0.5}
                  marks={[
                    { value: 0.5, label: '0.5' },
                    { value: 1, label: '1' },
                    { value: 3, label: '3' }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Purity Importance
                </Typography>
                <Slider
                  value={purityWeight}
                  onChange={(e, val) => setPurityWeight(val)}
                  min={0.5}
                  max={3}
                  step={0.5}
                  marks={[
                    { value: 0.5, label: '0.5' },
                    { value: 1, label: '1' },
                    { value: 3, label: '3' }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Cost Importance
                </Typography>
                <Slider
                  value={costWeight}
                  onChange={(e, val) => setCostWeight(val)}
                  min={0.5}
                  max={3}
                  step={0.5}
                  marks={[
                    { value: 0.5, label: '0.5' },
                    { value: 1, label: '1' },
                    { value: 3, label: '3' }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Paper>
            </Grid>
          </Grid>

          <Alert severity={desirabilities.overall > 0.8 ? 'success' : 'warning'} sx={{ mb: 2 }}>
            {desirabilities.overall > 0.8 ? (
              <strong>Excellent!</strong>
            ) : (
              <strong>Room for Improvement:</strong>
            )}
            {' '}Overall desirability is {(desirabilities.overall * 100).toFixed(1)}%.
            {desirabilities.overall < 0.8 && ' Try adjusting settings or weights.'}
          </Alert>

          <Typography variant="h6" gutterBottom>
            Quick Presets
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              sx={{ mr: 1 }}
              onClick={() => {
                setTemp(optima.balanced.temp);
                setCatalyst(optima.balanced.catalyst);
              }}
            >
              Jump to Balanced Optimum
            </Button>
            <Button
              variant="outlined"
              size="small"
              sx={{ mr: 1 }}
              onClick={() => {
                setTemp(optima.yield.temp);
                setCatalyst(optima.yield.catalyst);
              }}
            >
              Max Yield
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setTemp(optima.cost.temp);
                setCatalyst(optima.cost.catalyst);
              }}
            >
              Min Cost
            </Button>
          </Box>

          <Paper sx={{ p: 2, bgcolor: '#e8f5e9' }}>
            <Typography variant="subtitle2" color="success.main" gutterBottom>
              <strong>Optimal Settings (Balanced)</strong>
            </Typography>
            <Typography variant="body2">
              • Temperature: <strong>{optima.balanced.temp.toFixed(1)}°C</strong><br/>
              • Catalyst: <strong>{optima.balanced.catalyst.toFixed(2)}%</strong><br/>
              • Overall Desirability: <strong>{(optima.balanced.D * 100).toFixed(1)}%</strong>
            </Typography>
          </Paper>
        </Box>
      )
    },
    {
      label: 'Implementation Guidelines',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Step-by-Step Procedure
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Step</strong></TableCell>
                  <TableCell><strong>Action</strong></TableCell>
                  <TableCell><strong>Details</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>1</TableCell>
                  <TableCell>Fit Models</TableCell>
                  <TableCell>Build RSM models for each response (Lesson 6)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>2</TableCell>
                  <TableCell>Define Desirability</TableCell>
                  <TableCell>Choose type (max/min/target) and bounds (L, T, U) for each response</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>3</TableCell>
                  <TableCell>Assign Weights</TableCell>
                  <TableCell>Set importance weights w<sub>i</sub> based on priorities</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>4</TableCell>
                  <TableCell>Optimize D</TableCell>
                  <TableCell>Use numerical optimizer to maximize overall desirability</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>5</TableCell>
                  <TableCell>Confirm</TableCell>
                  <TableCell>Run experiments at predicted optimum, validate performance</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6" gutterBottom>
            Choosing Bounds and Targets
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Best Practices
                  </Typography>
                  <ul style={{ fontSize: '0.875rem', margin: '8px 0' }}>
                    <li>Use engineering specs or customer requirements</li>
                    <li>Set L/U at practical limits, not observed data range</li>
                    <li>Target (T) should be ideal/aspiration, not just "good enough"</li>
                    <li>Involve domain experts and stakeholders</li>
                  </ul>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Common Pitfalls
                  </Typography>
                  <ul style={{ fontSize: '0.875rem', margin: '8px 0' }}>
                    <li>Setting bounds too tight → D always near 0</li>
                    <li>Setting bounds too loose → No discrimination</li>
                    <li>Ignoring feasibility constraints</li>
                    <li>Using equal weights when priorities differ</li>
                  </ul>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>
            Software Implementation
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Most statistical software packages support desirability optimization:
            </Typography>
            <ul style={{ fontSize: '0.875rem', marginTop: 8 }}>
              <li><strong>Minitab:</strong> Response Optimizer with desirability functions</li>
              <li><strong>JMP:</strong> Prediction Profiler with desirability maximization</li>
              <li><strong>Design-Expert:</strong> Numerical and graphical optimization</li>
              <li><strong>R:</strong> <code>desirability</code> package</li>
              <li><strong>Python:</strong> Custom implementation with <code>scipy.optimize</code></li>
            </ul>
          </Paper>

          <Typography variant="h6" gutterBottom>
            Extensions and Alternatives
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Method</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                  <TableCell><strong>When to Use</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Harrington Functions</TableCell>
                  <TableCell>Exponential transformation alternative to Derringer-Suich</TableCell>
                  <TableCell>Smoother curves, easier derivatives</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Pareto Optimization</TableCell>
                  <TableCell>Find entire frontier of non-dominated solutions</TableCell>
                  <TableCell>Explore multiple trade-offs, no clear weights</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Lexicographic</TableCell>
                  <TableCell>Optimize responses in strict priority order</TableCell>
                  <TableCell>Clear hierarchy (safety &gt; cost, etc.)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Goal Programming</TableCell>
                  <TableCell>Minimize deviations from individual targets</TableCell>
                  <TableCell>Multiple conflicting goals with targets</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Alert severity="success">
            <strong>Industry Standard:</strong> Desirability functions are widely used in
            pharmaceuticals, chemicals, and manufacturing because they're intuitive, flexible,
            and well-supported by software.
          </Alert>
        </Box>
      )
    },
    {
      label: 'Summary & Key Takeaways',
      content: (
        <Box>
          <Alert severity="success" icon={<BalanceIcon />} sx={{ mb: 3 }}>
            <strong>Congratulations!</strong> You've mastered multi-objective optimization using
            desirability functions—a critical skill for real-world process improvement.
          </Alert>

          <Typography variant="h6" gutterBottom>
            What You've Learned
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    ✓ Multi-Objective Challenge
                  </Typography>
                  <Typography variant="body2">
                    Understand why single-response optimization fails when objectives conflict,
                    and how Pareto frontiers reveal trade-offs.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    ✓ Desirability Framework
                  </Typography>
                  <Typography variant="body2">
                    Apply Derringer-Suich desirability functions to transform responses to 0-1 scale
                    and combine them using weighted geometric mean.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    ✓ Interactive Exploration
                  </Typography>
                  <Typography variant="body2">
                    Adjust factor settings and importance weights in real time to find optimal
                    trade-offs for your specific priorities.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    ✓ Practical Implementation
                  </Typography>
                  <Typography variant="body2">
                    Follow a systematic 5-step procedure from model fitting to confirmation,
                    supported by standard statistical software.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>
            Key Formulas
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Overall Desirability:</strong>
            </Typography>
            <MathJax>
              {"\\[ D = \\left( \\prod_{i=1}^{k} d_i^{w_i} \\right)^{1 / \\sum w_i} \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 2 }}>
              <strong>Individual Desirability (Maximize):</strong>
            </Typography>
            <MathJax>
              {"\\[ d_i = \\begin{cases} 0 & y_i \\leq L \\\\ \\left(\\frac{y_i - L}{T - L}\\right)^r & L < y_i < T \\\\ 1 & y_i \\geq T \\end{cases} \\]"}
            </MathJax>
          </Paper>

          <Typography variant="h6" gutterBottom>
            Decision Guide
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Situation</strong></TableCell>
                  <TableCell><strong>Recommended Approach</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>2-3 responses, clear importance weights</TableCell>
                  <TableCell>Desirability functions (Derringer-Suich)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>One critical constraint (e.g., safety)</TableCell>
                  <TableCell>Constrained optimization</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Uncertain about trade-offs</TableCell>
                  <TableCell>Pareto frontier exploration</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Strict priority hierarchy</TableCell>
                  <TableCell>Lexicographic optimization</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Many responses (&gt;5)</TableCell>
                  <TableCell>Principal component desirability or multi-criteria methods</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6" gutterBottom>
            Real-World Success Story
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#e3f2fd', mb: 3 }}>
            <Typography variant="body2">
              <strong>Pharmaceutical Tablet Manufacturing:</strong> A company needed to optimize
              hardness (maximize), dissolution time (minimize), and coating uniformity (target).
              Using desirability functions with w=(2,1.5,1), they improved overall quality by 40%
              while reducing production cost by 12%, saving $5M annually.
            </Typography>
          </Paper>

          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>Next Lesson:</strong> In Lesson 8, you'll learn <strong>Robust Design &
            Taguchi Methods</strong>—how to make processes insensitive to noise and variation.
          </Alert>

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={handleComplete}
            >
              Complete Lesson
            </Button>
          </Box>
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <BalanceIcon sx={{ fontSize: 40, color: '#1976d2', mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2' }}>
              Optimization & Desirability Functions
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Balancing Competing Objectives
            </Typography>
          </Box>
        </Box>

        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>{step.label}</StepLabel>
              <StepContent>
                {step.content}
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    sx={{ mr: 1 }}
                  >
                    {index === steps.length - 1 ? 'Finish' : 'Continue'}
                  </Button>
                  {index > 0 && (
                    <Button onClick={handleBack}>
                      Back
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>
    </Box>
  );
};

export default Lesson07_Desirability;
