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
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TimelineIcon from '@mui/icons-material/Timeline';

/**
 * DOE Lesson 6: Response Surface Methodology (RSM)
 *
 * Topics:
 * - Second-order polynomial models
 * - Central Composite Design (CCD)
 * - Contour plots and 3D surfaces
 * - Steepest ascent/descent
 * - Optimization strategies
 */

const Lesson06_RSM = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [temp, setTemp] = useState(150);
  const [time, setTime] = useState(30);
  const [designType, setDesignType] = useState('factorial');
  const [showContours, setShowContours] = useState(true);

  // Second-order model simulation
  // Response = 60 + 2*temp + 1.5*time - 0.008*temp² - 0.02*time² + 0.01*temp*time
  const calculateResponse = (t, tm) => {
    const tempCoded = (t - 150) / 10;
    const timeCoded = (tm - 30) / 5;

    return 60 + 2 * tempCoded + 1.5 * timeCoded
           - 0.8 * tempCoded * tempCoded
           - 0.6 * timeCoded * timeCoded
           + 0.3 * tempCoded * timeCoded;
  };

  const currentYield = useMemo(() => calculateResponse(temp, time), [temp, time]);

  // Central Composite Design points
  const ccdPoints = useMemo(() => {
    if (designType === 'factorial') {
      // 2^2 factorial only
      return [
        { temp: 140, time: 25, type: 'factorial' },
        { temp: 160, time: 25, type: 'factorial' },
        { temp: 140, time: 35, type: 'factorial' },
        { temp: 160, time: 35, type: 'factorial' }
      ];
    } else if (designType === 'ccd') {
      // Full CCD: factorial + axial + center
      const alpha = 1.414; // for rotatability
      return [
        // Factorial points
        { temp: 140, time: 25, type: 'factorial' },
        { temp: 160, time: 25, type: 'factorial' },
        { temp: 140, time: 35, type: 'factorial' },
        { temp: 160, time: 35, type: 'factorial' },
        // Axial points
        { temp: 150 - alpha * 10, time: 30, type: 'axial' },
        { temp: 150 + alpha * 10, time: 30, type: 'axial' },
        { temp: 150, time: 30 - alpha * 5, type: 'axial' },
        { temp: 150, time: 30 + alpha * 5, type: 'axial' },
        // Center points
        { temp: 150, time: 30, type: 'center' },
        { temp: 150, time: 30, type: 'center' },
        { temp: 150, time: 30, type: 'center' }
      ];
    }
    return [];
  }, [designType]);

  // Generate contour data
  const contourData = useMemo(() => {
    const data = [];
    for (let t = 135; t <= 165; t += 2) {
      for (let tm = 22; tm <= 38; tm += 1) {
        const y = calculateResponse(t, tm);
        data.push({ temp: t, time: tm, yield: y });
      }
    }
    return data;
  }, []);

  // Find optimum
  const optimum = useMemo(() => {
    let maxYield = -Infinity;
    let optTemp = 150;
    let optTime = 30;

    for (let t = 135; t <= 165; t += 0.5) {
      for (let tm = 22; tm <= 38; tm += 0.5) {
        const y = calculateResponse(t, tm);
        if (y > maxYield) {
          maxYield = y;
          optTemp = t;
          optTime = tm;
        }
      }
    }

    return { temp: optTemp, time: optTime, yield: maxYield };
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

  // Render contour visualization
  const renderContourPlot = () => {
    const width = 400;
    const height = 320;
    const margin = 40;

    const yieldLevels = [58, 60, 62, 64, 65, 66, 66.5];

    return (
      <Box sx={{ position: 'relative', width, height, border: '1px solid #ddd', bgcolor: 'white' }}>
        <svg width={width} height={height}>
          {/* Axes */}
          <line x1={margin} y1={height - margin} x2={width - 20} y2={height - margin}
                stroke="black" strokeWidth="2" />
          <line x1={margin} y1={height - margin} x2={margin} y2={20}
                stroke="black" strokeWidth="2" />

          {/* Axis labels */}
          <text x={width / 2} y={height - 5} textAnchor="middle" fontSize="12">
            Temperature (°C)
          </text>
          <text x={15} y={height / 2} textAnchor="middle" fontSize="12"
                transform={`rotate(-90, 15, ${height / 2})`}>
            Time (min)
          </text>

          {/* Grid ticks */}
          {[135, 145, 155, 165].map((t, i) => (
            <g key={`temp-${i}`}>
              <line
                x1={margin + ((t - 135) / 30) * (width - margin - 20)}
                y1={height - margin}
                x2={margin + ((t - 135) / 30) * (width - margin - 20)}
                y2={height - margin + 5}
                stroke="black"
              />
              <text
                x={margin + ((t - 135) / 30) * (width - margin - 20)}
                y={height - margin + 18}
                textAnchor="middle"
                fontSize="10"
              >
                {t}
              </text>
            </g>
          ))}

          {[22, 26, 30, 34, 38].map((tm, i) => (
            <g key={`time-${i}`}>
              <line
                x1={margin - 5}
                y1={height - margin - ((tm - 22) / 16) * (height - margin - 20)}
                x2={margin}
                y2={height - margin - ((tm - 22) / 16) * (height - margin - 20)}
                stroke="black"
              />
              <text
                x={margin - 10}
                y={height - margin - ((tm - 22) / 16) * (height - margin - 20) + 3}
                textAnchor="end"
                fontSize="10"
              >
                {tm}
              </text>
            </g>
          ))}

          {/* Contour lines */}
          {showContours && yieldLevels.map((level, idx) => {
            const color = `hsl(${200 + idx * 20}, 70%, 60%)`;
            const points = contourData.filter(d =>
              Math.abs(d.yield - level) < 0.5
            );

            return points.map((pt, i) => (
              <circle
                key={`contour-${idx}-${i}`}
                cx={margin + ((pt.temp - 135) / 30) * (width - margin - 20)}
                cy={height - margin - ((pt.time - 22) / 16) * (height - margin - 20)}
                r={1.5}
                fill={color}
                opacity={0.6}
              />
            ));
          })}

          {/* Design points */}
          {ccdPoints.map((pt, idx) => {
            const x = margin + ((pt.temp - 135) / 30) * (width - margin - 20);
            const y = height - margin - ((pt.time - 22) / 16) * (height - margin - 20);
            const color = pt.type === 'factorial' ? '#2196f3' :
                         pt.type === 'axial' ? '#f44336' : '#4caf50';
            const size = pt.type === 'center' ? 4 : 6;

            return (
              <circle
                key={`point-${idx}`}
                cx={x}
                cy={y}
                r={size}
                fill={color}
                stroke="white"
                strokeWidth="2"
              />
            );
          })}

          {/* Current point */}
          <circle
            cx={margin + ((temp - 135) / 30) * (width - margin - 20)}
            cy={height - margin - ((time - 22) / 16) * (height - margin - 20)}
            r={7}
            fill="gold"
            stroke="black"
            strokeWidth="2"
          />

          {/* Optimum point */}
          <g>
            <circle
              cx={margin + ((optimum.temp - 135) / 30) * (width - margin - 20)}
              cy={height - margin - ((optimum.time - 22) / 16) * (height - margin - 20)}
              r={8}
              fill="none"
              stroke="#e91e63"
              strokeWidth="3"
            />
            <text
              x={margin + ((optimum.temp - 135) / 30) * (width - margin - 20)}
              y={height - margin - ((optimum.time - 22) / 16) * (height - margin - 20) - 15}
              textAnchor="middle"
              fontSize="11"
              fontWeight="bold"
              fill="#e91e63"
            >
              OPT
            </text>
          </g>
        </svg>

        {/* Legend */}
        <Box sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'rgba(255,255,255,0.9)',
                   p: 1, border: '1px solid #ddd', borderRadius: 1, fontSize: '0.75rem' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
            <Box sx={{ width: 12, height: 12, bgcolor: '#2196f3', border: '1px solid white' }} />
            <Typography variant="caption">Factorial</Typography>
          </Box>
          {designType === 'ccd' && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#f44336', border: '1px solid white' }} />
                <Typography variant="caption">Axial</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#4caf50', border: '1px solid white' }} />
                <Typography variant="caption">Center</Typography>
              </Box>
            </>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
            <Box sx={{ width: 12, height: 12, bgcolor: 'gold', border: '1px solid black' }} />
            <Typography variant="caption">Current</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, bgcolor: 'transparent', border: '2px solid #e91e63' }} />
            <Typography variant="caption">Optimum</Typography>
          </Box>
        </Box>
      </Box>
    );
  };

  const steps = [
    {
      label: 'Introduction to RSM',
      content: (
        <Box>
          <Alert severity="info" icon={<TrendingUpIcon />} sx={{ mb: 2 }}>
            <strong>Response Surface Methodology (RSM)</strong> is a collection of statistical and
            mathematical techniques for modeling and optimizing processes where the response is
            influenced by several variables.
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Why RSM?
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Limitations of First-Order Designs
                  </Typography>
                  <Typography variant="body2">
                    • Factorial designs assume linear relationships<br/>
                    • Cannot detect curvature<br/>
                    • Miss optimal operating conditions<br/>
                    • Inadequate for optimization
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ bgcolor: '#e8f5e9' }}>
                <CardContent>
                  <Typography variant="subtitle2" color="success.main" gutterBottom>
                    RSM Advantages
                  </Typography>
                  <Typography variant="body2">
                    • Models quadratic (curved) relationships<br/>
                    • Identifies optimal settings<br/>
                    • Estimates interaction effects<br/>
                    • Visualizes response surfaces
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            The Second-Order Model
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa' }}>
            <Typography variant="body2" gutterBottom>
              For <em>k</em> factors, the general second-order polynomial is:
            </Typography>
            <MathJax>
              {"\\[ y = \\beta_0 + \\sum_{i=1}^{k} \\beta_i x_i + \\sum_{i=1}^{k} \\beta_{ii} x_i^2 + \\sum_{i<j} \\beta_{ij} x_i x_j + \\varepsilon \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Where:
            </Typography>
            <ul style={{ marginTop: 4, fontSize: '0.875rem' }}>
              <li><strong>Linear terms</strong> (β<sub>i</sub>x<sub>i</sub>): Main effects</li>
              <li><strong>Quadratic terms</strong> (β<sub>ii</sub>x<sub>i</sub>²): Curvature</li>
              <li><strong>Interaction terms</strong> (β<sub>ij</sub>x<sub>i</sub>x<sub>j</sub>): Two-way interactions</li>
            </ul>
          </Paper>

          <Alert severity="success" sx={{ mt: 2 }}>
            <strong>Key Insight:</strong> The quadratic terms allow the model to capture peaks,
            valleys, and saddle points—exactly what we need for optimization!
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Example: Chemical Yield Optimization
          </Typography>

          <Typography variant="body2" paragraph>
            Consider optimizing a chemical reaction with two factors:
          </Typography>

          <ul style={{ fontSize: '0.875rem' }}>
            <li><strong>Temperature</strong> (140-160°C)</li>
            <li><strong>Reaction Time</strong> (25-35 minutes)</li>
            <li><strong>Response:</strong> Product yield (%)</li>
          </ul>

          <Typography variant="body2" paragraph sx={{ mt: 1 }}>
            A factorial design might tell us the main effects, but <strong>RSM reveals the
            optimal combination</strong> that maximizes yield.
          </Typography>
        </Box>
      )
    },
    {
      label: 'Central Composite Design',
      content: (
        <Box>
          <Alert severity="info" icon={<TimelineIcon />} sx={{ mb: 2 }}>
            The <strong>Central Composite Design (CCD)</strong> is the most popular RSM design.
            It efficiently estimates second-order models with minimal runs.
          </Alert>

          <Typography variant="h6" gutterBottom>
            CCD Structure
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              A CCD consists of <strong>three types of points</strong>:
            </Typography>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Chip label="1. Factorial Points" color="primary" size="small" sx={{ mb: 1 }} />
                    <Typography variant="body2">
                      • 2<sup>k</sup> points at corners<br/>
                      • Estimate linear & interaction terms<br/>
                      • Coded as ±1
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Chip label="2. Axial Points" color="error" size="small" sx={{ mb: 1 }} />
                    <Typography variant="body2">
                      • 2k points on axes<br/>
                      • Estimate quadratic terms<br/>
                      • Coded as ±α (typically 1.414)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Chip label="3. Center Points" color="success" size="small" sx={{ mb: 1 }} />
                    <Typography variant="body2">
                      • n<sub>c</sub> replicates at center<br/>
                      • Estimate pure error<br/>
                      • Check for curvature
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>

          <Typography variant="h6" gutterBottom>
            Total Runs
          </Typography>

          <MathJax>
            {"\\[ N = 2^k + 2k + n_c \\]"}
          </MathJax>

          <Typography variant="body2" paragraph sx={{ mt: 1 }}>
            For k=2 factors with n<sub>c</sub>=3 center points: N = 4 + 4 + 3 = <strong>11 runs</strong>
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Interactive Design Comparison
          </Typography>

          <Box sx={{ mb: 2 }}>
            <ToggleButtonGroup
              value={designType}
              exclusive
              onChange={(e, val) => val && setDesignType(val)}
              size="small"
            >
              <ToggleButton value="factorial">2² Factorial Only (4 runs)</ToggleButton>
              <ToggleButton value="ccd">Full CCD (11 runs)</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            {renderContourPlot()}
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Run</strong></TableCell>
                  <TableCell><strong>Temp (°C)</strong></TableCell>
                  <TableCell><strong>Time (min)</strong></TableCell>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell><strong>Yield (%)</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ccdPoints.map((pt, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{pt.temp.toFixed(1)}</TableCell>
                    <TableCell>{pt.time.toFixed(1)}</TableCell>
                    <TableCell>
                      <Chip
                        label={pt.type}
                        size="small"
                        color={pt.type === 'factorial' ? 'primary' :
                               pt.type === 'axial' ? 'error' : 'success'}
                      />
                    </TableCell>
                    <TableCell>{calculateResponse(pt.temp, pt.time).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Alert severity="success" sx={{ mt: 2 }}>
            <strong>Why CCD Works:</strong> The factorial points capture linear trends and
            interactions, the axial points reveal curvature, and center points provide pure error
            estimation and curvature detection.
          </Alert>
        </Box>
      )
    },
    {
      label: 'Contour Plots & Surfaces',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Visualizing the Response Surface
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Contour plots</strong> show lines of constant response, like elevation lines
            on a topographic map. They make optimization intuitive and reveal system behavior.
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Interactive Exploration
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Temperature (°C)
                </Typography>
                <Slider
                  value={temp}
                  onChange={(e, val) => setTemp(val)}
                  min={135}
                  max={165}
                  step={1}
                  marks={[
                    { value: 135, label: '135' },
                    { value: 150, label: '150' },
                    { value: 165, label: '165' }
                  ]}
                  valueLabelDisplay="on"
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Reaction Time (min)
                </Typography>
                <Slider
                  value={time}
                  onChange={(e, val) => setTime(val)}
                  min={22}
                  max={38}
                  step={1}
                  marks={[
                    { value: 22, label: '22' },
                    { value: 30, label: '30' },
                    { value: 38, label: '38' }
                  ]}
                  valueLabelDisplay="on"
                />
              </Paper>
            </Grid>
          </Grid>

          <Paper sx={{ p: 2, mt: 2, bgcolor: '#e3f2fd' }}>
            <Typography variant="h6" gutterBottom>
              Current Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">Temperature</Typography>
                <Typography variant="h6">{temp}°C</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">Time</Typography>
                <Typography variant="h6">{time} min</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">Predicted Yield</Typography>
                <Typography variant="h6" color="primary">{currentYield.toFixed(2)}%</Typography>
              </Grid>
            </Grid>
          </Paper>

          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            {renderContourPlot()}
          </Box>

          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowContours(!showContours)}
            >
              {showContours ? 'Hide' : 'Show'} Contours
            </Button>
          </Box>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Reading the Contour Plot
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Identifying Optimum
                  </Typography>
                  <Typography variant="body2">
                    • The <span style={{ color: '#e91e63', fontWeight: 'bold' }}>OPT</span> marker
                    shows maximum yield<br/>
                    • Optimal temperature: <strong>{optimum.temp.toFixed(1)}°C</strong><br/>
                    • Optimal time: <strong>{optimum.time.toFixed(1)} min</strong><br/>
                    • Maximum yield: <strong>{optimum.yield.toFixed(2)}%</strong>
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Surface Characteristics
                  </Typography>
                  <Typography variant="body2">
                    • <strong>Circular contours:</strong> No interaction<br/>
                    • <strong>Elliptical contours:</strong> Interaction present<br/>
                    • <strong>Closely spaced:</strong> Steep slope<br/>
                    • <strong>Center cluster:</strong> Maximum/minimum
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Caution:</strong> Contour plots are 2D slices of higher-dimensional surfaces.
            For 3+ factors, you must examine multiple 2D projections to understand the full response.
          </Alert>
        </Box>
      )
    },
    {
      label: 'Optimization Strategies',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Finding the Optimum
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            Once we have a fitted second-order model, we can use analytical or numerical methods
            to find optimal factor settings.
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Method 1: Canonical Analysis
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Transform the model to <strong>canonical form</strong> to identify the nature of
              the stationary point:
            </Typography>
            <MathJax>
              {"\\[ y = y_s + \\lambda_1 w_1^2 + \\lambda_2 w_2^2 + \\cdots + \\lambda_k w_k^2 \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Where λ<sub>i</sub> are eigenvalues of the quadratic coefficient matrix:
            </Typography>
            <ul style={{ marginTop: 8, fontSize: '0.875rem' }}>
              <li><strong>All λ<sub>i</sub> &lt; 0:</strong> Maximum (our goal for yield!)</li>
              <li><strong>All λ<sub>i</sub> &gt; 0:</strong> Minimum (avoid this)</li>
              <li><strong>Mixed signs:</strong> Saddle point (not optimal)</li>
            </ul>
          </Paper>

          <Typography variant="h6" gutterBottom>
            Method 2: Steepest Ascent/Descent
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              When far from the optimum, move in the direction of <strong>steepest ascent</strong>
              (for maximization):
            </Typography>
            <MathJax>
              {"\\[ \\nabla y = \\left[ \\frac{\\partial y}{\\partial x_1}, \\frac{\\partial y}{\\partial x_2}, \\ldots, \\frac{\\partial y}{\\partial x_k} \\right] \\]"}
            </MathJax>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Steps:
            </Typography>
            <ol style={{ marginTop: 8, fontSize: '0.875rem' }}>
              <li>Compute gradient at current point</li>
              <li>Move in direction of gradient</li>
              <li>Run experiments along this path</li>
              <li>Continue until response stops improving</li>
              <li>Fit new RSM model in the optimal region</li>
            </ol>
          </Paper>

          <Typography variant="h6" gutterBottom>
            Method 3: Ridge Analysis
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 2 }}>
            <Typography variant="body2">
              When the stationary point is far outside the experimental region or is a saddle point,
              <strong> ridge analysis</strong> finds the best settings within a constrained region:
            </Typography>
            <MathJax>
              {"\\[ \\max_{\\mathbf{x}} \\quad y(\\mathbf{x}) \\quad \\text{subject to} \\quad \\|\\mathbf{x}\\|^2 \\leq r^2 \\]"}
            </MathJax>
          </Paper>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Practical Example
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Method</strong></TableCell>
                  <TableCell><strong>Best Use Case</strong></TableCell>
                  <TableCell><strong>Complexity</strong></TableCell>
                  <TableCell><strong>Result</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Canonical Analysis</TableCell>
                  <TableCell>Well-behaved surface, stationary point in region</TableCell>
                  <TableCell>Moderate</TableCell>
                  <TableCell>Exact optimum</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Steepest Ascent</TableCell>
                  <TableCell>Far from optimum, sequential experimentation</TableCell>
                  <TableCell>Low</TableCell>
                  <TableCell>Approximate path</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Ridge Analysis</TableCell>
                  <TableCell>Saddle point or constrained region</TableCell>
                  <TableCell>High</TableCell>
                  <TableCell>Constrained max</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Alert severity="success" sx={{ mt: 2 }}>
            <strong>Our Example Optimum:</strong> The canonical analysis reveals a maximum at
            Temp = {optimum.temp.toFixed(1)}°C, Time = {optimum.time.toFixed(1)} min,
            with yield = {optimum.yield.toFixed(2)}%. This is {((optimum.yield - currentYield) / currentYield * 100).toFixed(1)}%
            better than the current settings!
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Confirmation Runs
          </Typography>

          <Typography variant="body2">
            Always conduct <strong>confirmation runs</strong> at the predicted optimum:
          </Typography>
          <ul style={{ marginTop: 8, fontSize: '0.875rem' }}>
            <li>Run 3-5 replicates at optimal settings</li>
            <li>Compare observed vs. predicted response</li>
            <li>If discrepancy is large, refit the model or expand design space</li>
          </ul>
        </Box>
      )
    },
    {
      label: 'Summary & Key Takeaways',
      content: (
        <Box>
          <Alert severity="success" icon={<TrendingUpIcon />} sx={{ mb: 3 }}>
            <strong>Congratulations!</strong> You've learned Response Surface Methodology—the gold
            standard for process optimization and modeling curved relationships.
          </Alert>

          <Typography variant="h6" gutterBottom>
            What You've Mastered
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    ✓ Second-Order Models
                  </Typography>
                  <Typography variant="body2">
                    Understand how quadratic terms capture curvature and enable optimization that
                    first-order models cannot achieve.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    ✓ Central Composite Design
                  </Typography>
                  <Typography variant="body2">
                    Efficiently estimate all second-order coefficients using factorial, axial,
                    and center points.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    ✓ Contour Visualization
                  </Typography>
                  <Typography variant="body2">
                    Read and interpret contour plots to identify optimal regions and understand
                    response surface shape.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    ✓ Optimization Methods
                  </Typography>
                  <Typography variant="body2">
                    Apply canonical analysis, steepest ascent, and ridge analysis to find optimal
                    factor settings.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>
            RSM Best Practices
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Guideline</strong></TableCell>
                  <TableCell><strong>Rationale</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Use coded variables (−1, 0, +1)</TableCell>
                  <TableCell>Standardizes coefficients for comparison</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Include 3-5 center points</TableCell>
                  <TableCell>Estimate pure error and detect curvature</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Check for lack-of-fit</TableCell>
                  <TableCell>Ensure model adequately describes data</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Examine residual plots</TableCell>
                  <TableCell>Validate model assumptions</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Confirm predictions experimentally</TableCell>
                  <TableCell>Validate optimum before full-scale implementation</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Use sequential experimentation</TableCell>
                  <TableCell>Start with screening, then RSM near optimum</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6" gutterBottom>
            When to Use RSM
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: '#e8f5e9' }}>
                <Typography variant="subtitle2" color="success.main" gutterBottom>
                  <strong>✓ Good Applications</strong>
                </Typography>
                <ul style={{ fontSize: '0.875rem', margin: '8px 0' }}>
                  <li>Process optimization (yield, quality)</li>
                  <li>Finding operating sweet spots</li>
                  <li>Modeling curved relationships</li>
                  <li>2-5 continuous factors</li>
                  <li>Well-understood processes</li>
                </ul>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: '#ffebee' }}>
                <Typography variant="subtitle2" color="error.main" gutterBottom>
                  <strong>✗ Poor Applications</strong>
                </Typography>
                <ul style={{ fontSize: '0.875rem', margin: '8px 0' }}>
                  <li>Screening many factors (&gt;5)</li>
                  <li>Categorical factors only</li>
                  <li>Purely linear relationships</li>
                  <li>Highly constrained regions</li>
                  <li>Unstable or noisy processes</li>
                </ul>
              </Paper>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>
            Real-World Impact
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#fafafa', mb: 3 }}>
            <Typography variant="body2">
              <strong>Case Study:</strong> A semiconductor manufacturer used RSM to optimize
              chemical vapor deposition. By modeling temperature, pressure, and gas flow rate,
              they increased film uniformity by 35% and reduced defects by 50%, saving $2M annually.
            </Typography>
          </Paper>

          <Alert severity="info">
            <strong>Next Steps:</strong> In Lesson 7, you'll learn how to handle multiple
            competing responses simultaneously using <strong>desirability functions</strong>
            and multi-objective optimization.
          </Alert>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
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
          <TrendingUpIcon sx={{ fontSize: 40, color: '#1976d2', mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2' }}>
              Response Surface Methodology
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Modeling Curvature and Optimizing Processes
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

export default Lesson06_RSM;
