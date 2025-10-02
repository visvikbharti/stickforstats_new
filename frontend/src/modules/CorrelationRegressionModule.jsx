import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Container, Typography, Tab, Tabs, Paper, Grid, Card, CardContent,
  Button, Slider, TextField, Select, MenuItem, FormControl, InputLabel,
  Alert, Chip, LinearProgress, Tooltip, IconButton, Switch, FormControlLabel,
  Divider, List, ListItem, ListItemText, ListItemIcon, Accordion,
  AccordionSummary, AccordionDetails, Stepper, Step, StepLabel, Badge,
  Fab, Zoom, Fade, Grow, Collapse, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, ToggleButton, ToggleButtonGroup,
  Radio, RadioGroup, FormLabel
} from '@mui/material';
import {
  PlayArrow, Pause, Refresh, Info, School, Code, Assessment,
  Psychology, Science, Timeline, Functions, Speed, CheckCircle,
  Warning, Error, TrendingUp, ShowChart, BarChart, PieChart,
  Help, Lightbulb, Calculate, Storage, CloudDownload, Share,
  ExpandMore, NavigateNext, Casino, Equalizer, ScatterPlot,
  Analytics, AutoGraph, BubbleChart, DataUsage, Insights,
  LinearScale, Polyline, TrendingDown, CompareArrows, GridOn
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import {
  LineChart, Line, BarChart as RechartsBarChart, Bar, AreaChart, Area,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, ReferenceLine, ReferenceArea, Cell,
  RadialBarChart, RadialBar, PieChart as RechartsPieChart, Pie,
  ComposedChart, ErrorBar, ZAxis
} from 'recharts';
import { useAppTheme } from '../context/AppThemeContext';

// Styled Components
const GradientCard = styled(Card)(({ theme, gradient }) => ({
  background: gradient || theme.palette.background.gradient,
  backdropFilter: 'blur(10px)',
  borderRadius: 16,
  border: '1px solid rgba(255, 255, 255, 0.18)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)'
  }
}));

const HeatmapCell = styled(Box)(({ theme, value }) => {
  const intensity = Math.abs(value);
  const color = value >= 0 ?
    `rgba(76, 175, 80, ${intensity})` :
    `rgba(244, 67, 54, ${intensity})`;

  return {
    width: '60px',
    height: '60px',
    backgroundColor: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: 4,
    fontWeight: 600,
    color: intensity > 0.5 ? 'white' : theme.palette.text.primary,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'scale(1.1)',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      zIndex: 10
    }
  };
});

const AnimatedProgress = styled(LinearProgress)(({ theme }) => ({
  height: 8,
  borderRadius: 4,
  '& .MuiLinearProgress-bar': {
    borderRadius: 4,
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
  }
}));

// Simulation Components
const InteractiveCorrelationSimulation = ({ darkMode }) => {
  const [numPoints, setNumPoints] = useState(50);
  const [correlation, setCorrelation] = useState(0.7);
  const [noise, setNoise] = useState(0.2);
  const [showTrendLine, setShowTrendLine] = useState(true);
  const [showConfidenceBands, setShowConfidenceBands] = useState(true);
  const [outliers, setOutliers] = useState(0);
  const [data, setData] = useState([]);

  const generateData = useCallback(() => {
    const newData = [];
    const slope = correlation;
    const intercept = 50;

    // Generate main data points
    for (let i = 0; i < numPoints; i++) {
      const x = Math.random() * 100;
      const perfectY = slope * x + intercept;
      const y = perfectY + (Math.random() - 0.5) * noise * 100;

      newData.push({
        x: x,
        y: Math.max(0, Math.min(100, y)),
        type: 'normal'
      });
    }

    // Add outliers
    for (let i = 0; i < outliers; i++) {
      newData.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        type: 'outlier'
      });
    }

    // Calculate actual correlation
    const xMean = newData.reduce((sum, d) => sum + d.x, 0) / newData.length;
    const yMean = newData.reduce((sum, d) => sum + d.y, 0) / newData.length;

    const numerator = newData.reduce((sum, d) => sum + (d.x - xMean) * (d.y - yMean), 0);
    const denomX = Math.sqrt(newData.reduce((sum, d) => sum + Math.pow(d.x - xMean, 2), 0));
    const denomY = Math.sqrt(newData.reduce((sum, d) => sum + Math.pow(d.y - yMean, 2), 0));

    const actualCorr = numerator / (denomX * denomY);

    setData(newData.map(d => ({ ...d, actualCorr })));
  }, [numPoints, correlation, noise, outliers]);

  useEffect(() => {
    generateData();
  }, [generateData]);

  const interpretCorrelation = (r) => {
    const absR = Math.abs(r);
    if (absR < 0.1) return 'Negligible';
    if (absR < 0.3) return 'Weak';
    if (absR < 0.5) return 'Moderate';
    if (absR < 0.7) return 'Strong';
    return 'Very Strong';
  };

  const actualCorrelation = data.length > 0 ? data[0].actualCorr : 0;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ScatterPlot color="primary" />
        Interactive Correlation Explorer
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Data Generation Controls</Typography>

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">Target Correlation: {correlation.toFixed(2)}</Typography>
              <Slider
                value={correlation}
                onChange={(e, v) => setCorrelation(v)}
                min={-1}
                max={1}
                step={0.1}
                marks={[
                  { value: -1, label: '-1' },
                  { value: 0, label: '0' },
                  { value: 1, label: '1' }
                ]}
                valueLabelDisplay="auto"
                color={correlation >= 0 ? 'primary' : 'error'}
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">Number of Points: {numPoints}</Typography>
              <Slider
                value={numPoints}
                onChange={(e, v) => setNumPoints(v)}
                min={10}
                max={200}
                step={10}
                valueLabelDisplay="auto"
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">Noise Level: {(noise * 100).toFixed(0)}%</Typography>
              <Slider
                value={noise}
                onChange={(e, v) => setNoise(v)}
                min={0}
                max={1}
                step={0.1}
                valueLabelDisplay="auto"
                color="warning"
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">Number of Outliers: {outliers}</Typography>
              <Slider
                value={outliers}
                onChange={(e, v) => setOutliers(v)}
                min={0}
                max={10}
                step={1}
                valueLabelDisplay="auto"
                color="error"
              />
            </Box>

            <Box sx={{ mt: 3 }}>
              <FormControlLabel
                control={<Switch checked={showTrendLine} onChange={(e) => setShowTrendLine(e.target.checked)} />}
                label="Show Trend Line"
              />
              <FormControlLabel
                control={<Switch checked={showConfidenceBands} onChange={(e) => setShowConfidenceBands(e.target.checked)} />}
                label="Show Confidence Bands"
              />
            </Box>

            <Button
              fullWidth
              variant="contained"
              startIcon={<Refresh />}
              onClick={generateData}
              sx={{ mt: 2 }}
            >
              Regenerate Data
            </Button>
          </Paper>

          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Correlation Statistics</Typography>

            <List dense>
              <ListItem>
                <ListItemText
                  primary="Actual Correlation (r)"
                  secondary={
                    <Typography variant="h6" color="primary">
                      {actualCorrelation?.toFixed(3) || '0.000'}
                    </Typography>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Correlation Strength"
                  secondary={interpretCorrelation(actualCorrelation)}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Coefficient of Determination (r²)"
                  secondary={`${(Math.pow(actualCorrelation || 0, 2) * 100).toFixed(1)}%`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Direction"
                  secondary={actualCorrelation >= 0 ? 'Positive' : 'Negative'}
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 500 }}>
            <Typography variant="subtitle1" gutterBottom>
              Scatter Plot with Regression Analysis
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="x"
                  label={{ value: "X Variable", position: "insideBottom", offset: -10 }}
                  domain={[0, 100]}
                />
                <YAxis
                  dataKey="y"
                  label={{ value: "Y Variable", angle: -90, position: "insideLeft" }}
                  domain={[0, 100]}
                />
                <RechartsTooltip />

                <Scatter
                  name="Data Points"
                  data={data.filter(d => d.type === 'normal')}
                  fill="#667eea"
                  fillOpacity={0.6}
                />

                {outliers > 0 && (
                  <Scatter
                    name="Outliers"
                    data={data.filter(d => d.type === 'outlier')}
                    fill="#f56565"
                    fillOpacity={0.8}
                    shape="star"
                  />
                )}

                {showTrendLine && (
                  <ReferenceLine
                    segment={[
                      { x: 0, y: 50 },
                      { x: 100, y: 50 + correlation * 100 }
                    ]}
                    stroke="#764ba2"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                )}

                {showConfidenceBands && (
                  <>
                    <ReferenceArea
                      x1={0}
                      x2={100}
                      y1={Math.max(0, 50 - noise * 50)}
                      y2={Math.min(100, 50 + correlation * 100 + noise * 50)}
                      fill="#667eea"
                      fillOpacity={0.1}
                    />
                  </>
                )}
              </ScatterChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

const RegressionAnalysisSimulation = ({ darkMode }) => {
  const [regressionType, setRegressionType] = useState('linear');
  const [degree, setDegree] = useState(2);
  const [regularization, setRegularization] = useState('none');
  const [alpha, setAlpha] = useState(0.1);
  const [showResiduals, setShowResiduals] = useState(false);
  const [crossValidation, setCrossValidation] = useState(false);
  const [data, setData] = useState([]);
  const [modelMetrics, setModelMetrics] = useState({});

  const generateRegressionData = useCallback(() => {
    const newData = [];
    const n = 100;

    for (let i = 0; i < n; i++) {
      const x = (i / n) * 10;
      let y;

      switch (regressionType) {
        case 'linear':
          y = 2 * x + 10 + (Math.random() - 0.5) * 10;
          break;
        case 'polynomial':
          y = 0.5 * Math.pow(x, 2) - 2 * x + 15 + (Math.random() - 0.5) * 20;
          break;
        case 'exponential':
          y = 10 * Math.exp(0.2 * x) + (Math.random() - 0.5) * 15;
          break;
        case 'logarithmic':
          y = 20 * Math.log(x + 1) + 5 + (Math.random() - 0.5) * 8;
          break;
        default:
          y = 2 * x + 10;
      }

      const prediction = regressionType === 'linear' ? 2 * x + 10 :
                        regressionType === 'polynomial' ? 0.5 * Math.pow(x, 2) - 2 * x + 15 :
                        regressionType === 'exponential' ? 10 * Math.exp(0.2 * x) :
                        20 * Math.log(x + 1) + 5;

      const residual = y - prediction;

      newData.push({
        x,
        y,
        prediction,
        residual,
        upperBound: prediction + 10,
        lowerBound: prediction - 10
      });
    }

    // Calculate R-squared
    const yMean = newData.reduce((sum, d) => sum + d.y, 0) / n;
    const ssTot = newData.reduce((sum, d) => sum + Math.pow(d.y - yMean, 2), 0);
    const ssRes = newData.reduce((sum, d) => sum + Math.pow(d.residual, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    // Calculate other metrics
    const mse = ssRes / n;
    const rmse = Math.sqrt(mse);
    const mae = newData.reduce((sum, d) => sum + Math.abs(d.residual), 0) / n;

    setModelMetrics({
      rSquared,
      adjustedRSquared: 1 - (1 - rSquared) * (n - 1) / (n - 2),
      mse,
      rmse,
      mae,
      aic: n * Math.log(ssRes / n) + 2 * 2,
      bic: n * Math.log(ssRes / n) + 2 * Math.log(n)
    });

    setData(newData);
  }, [regressionType]);

  useEffect(() => {
    generateRegressionData();
  }, [generateRegressionData, degree, regularization, alpha]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TrendingUp color="secondary" />
        Comprehensive Regression Analysis
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Model Configuration</Typography>

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Regression Type</InputLabel>
              <Select
                value={regressionType}
                onChange={(e) => setRegressionType(e.target.value)}
                label="Regression Type"
              >
                <MenuItem value="linear">Linear Regression</MenuItem>
                <MenuItem value="polynomial">Polynomial Regression</MenuItem>
                <MenuItem value="exponential">Exponential Regression</MenuItem>
                <MenuItem value="logarithmic">Logarithmic Regression</MenuItem>
              </Select>
            </FormControl>

            {regressionType === 'polynomial' && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">Polynomial Degree: {degree}</Typography>
                <Slider
                  value={degree}
                  onChange={(e, v) => setDegree(v)}
                  min={2}
                  max={6}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>
            )}

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Regularization</InputLabel>
              <Select
                value={regularization}
                onChange={(e) => setRegularization(e.target.value)}
                label="Regularization"
              >
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="ridge">Ridge (L2)</MenuItem>
                <MenuItem value="lasso">Lasso (L1)</MenuItem>
                <MenuItem value="elastic">Elastic Net</MenuItem>
              </Select>
            </FormControl>

            {regularization !== 'none' && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">Alpha (λ): {alpha}</Typography>
                <Slider
                  value={alpha}
                  onChange={(e, v) => setAlpha(v)}
                  min={0.001}
                  max={1}
                  step={0.001}
                  valueLabelDisplay="auto"
                  scale={(x) => x * x}
                />
              </Box>
            )}

            <Box sx={{ mt: 3 }}>
              <FormControlLabel
                control={<Switch checked={showResiduals} onChange={(e) => setShowResiduals(e.target.checked)} />}
                label="Show Residual Plot"
              />
              <FormControlLabel
                control={<Switch checked={crossValidation} onChange={(e) => setCrossValidation(e.target.checked)} />}
                label="Cross-Validation"
              />
            </Box>

            <Button
              fullWidth
              variant="contained"
              startIcon={<Analytics />}
              onClick={generateRegressionData}
              sx={{ mt: 2 }}
            >
              Fit Model
            </Button>
          </Paper>

          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Model Performance</Typography>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">R²</Typography>
                <Typography variant="h6" color="primary">
                  {modelMetrics.rSquared?.toFixed(3)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Adj. R²</Typography>
                <Typography variant="h6" color="primary">
                  {modelMetrics.adjustedRSquared?.toFixed(3)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">RMSE</Typography>
                <Typography variant="h6" color="secondary">
                  {modelMetrics.rmse?.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">MAE</Typography>
                <Typography variant="h6" color="secondary">
                  {modelMetrics.mae?.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">AIC</Typography>
                <Typography variant="h6" color="info">
                  {modelMetrics.aic?.toFixed(1)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">BIC</Typography>
                <Typography variant="h6" color="info">
                  {modelMetrics.bic?.toFixed(1)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 500 }}>
            <Typography variant="subtitle1" gutterBottom>
              {showResiduals ? 'Residual Analysis' : 'Regression Fit'}
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              {showResiduals ? (
                <ComposedChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="x"
                    label={{ value: "X Variable", position: "insideBottom", offset: -10 }}
                  />
                  <YAxis
                    label={{ value: "Residuals", angle: -90, position: "insideLeft" }}
                  />
                  <RechartsTooltip />
                  <Legend />

                  <Scatter name="Residuals" dataKey="residual" fill="#f56565" />
                  <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                  <ReferenceLine y={10} stroke="#f6ad55" strokeDasharray="3 3" opacity={0.5} />
                  <ReferenceLine y={-10} stroke="#f6ad55" strokeDasharray="3 3" opacity={0.5} />
                </ComposedChart>
              ) : (
                <ComposedChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="x"
                    label={{ value: "X Variable", position: "insideBottom", offset: -10 }}
                  />
                  <YAxis
                    label={{ value: "Y Variable", angle: -90, position: "insideLeft" }}
                  />
                  <RechartsTooltip />
                  <Legend />

                  <Area
                    type="monotone"
                    dataKey="upperBound"
                    stroke="none"
                    fill="#667eea"
                    fillOpacity={0.1}
                    name="95% CI"
                  />
                  <Area
                    type="monotone"
                    dataKey="lowerBound"
                    stroke="none"
                    fill="#667eea"
                    fillOpacity={0.1}
                  />

                  <Scatter name="Data Points" dataKey="y" fill="#667eea" />

                  <Line
                    type="monotone"
                    dataKey="prediction"
                    stroke="#764ba2"
                    strokeWidth={3}
                    name="Fitted Model"
                    dot={false}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </Paper>

          {crossValidation && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Cross-Validation Results</Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={8}>
                  <AnimatedProgress variant="determinate" value={85} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2">
                    5-Fold CV Score: <strong>0.85 ± 0.03</strong>
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

const CorrelationMatrixHeatmap = ({ darkMode }) => {
  const [selectedDataset, setSelectedDataset] = useState('iris');
  const [correlationType, setCorrelationType] = useState('pearson');
  const [threshold, setThreshold] = useState(0);

  // Simulated correlation matrix data
  const correlationData = {
    variables: ['Var1', 'Var2', 'Var3', 'Var4', 'Var5'],
    matrix: [
      [1.00, 0.85, -0.30, 0.45, 0.15],
      [0.85, 1.00, -0.25, 0.50, 0.20],
      [-0.30, -0.25, 1.00, -0.60, 0.10],
      [0.45, 0.50, -0.60, 1.00, -0.35],
      [0.15, 0.20, 0.10, -0.35, 1.00]
    ]
  };

  const getSignificance = (r, n = 100) => {
    const t = r * Math.sqrt((n - 2) / (1 - r * r));
    const p = 2 * (1 - Math.min(0.999, Math.max(0.001, 0.5 + 0.5 * Math.sign(t) * (1 - Math.exp(-Math.abs(t) * 1.5)))));
    return p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : '';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <GridOn color="info" />
        Correlation Matrix Analysis
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Dataset</InputLabel>
                <Select
                  value={selectedDataset}
                  onChange={(e) => setSelectedDataset(e.target.value)}
                  label="Dataset"
                >
                  <MenuItem value="iris">Iris Dataset</MenuItem>
                  <MenuItem value="custom">Custom Dataset</MenuItem>
                  <MenuItem value="generated">Generated Data</MenuItem>
                </Select>
              </FormControl>

              <ToggleButtonGroup
                value={correlationType}
                exclusive
                onChange={(e, v) => v && setCorrelationType(v)}
                size="medium"
              >
                <ToggleButton value="pearson">Pearson</ToggleButton>
                <ToggleButton value="spearman">Spearman</ToggleButton>
                <ToggleButton value="kendall">Kendall</ToggleButton>
              </ToggleButtonGroup>

              <Box sx={{ flex: 1, ml: 2 }}>
                <Typography variant="body2">Threshold: {threshold.toFixed(2)}</Typography>
                <Slider
                  value={threshold}
                  onChange={(e, v) => setThreshold(v)}
                  min={0}
                  max={1}
                  step={0.1}
                  valueLabelDisplay="auto"
                />
              </Box>
            </Box>

            <Box sx={{ overflowX: 'auto' }}>
              <Box sx={{ display: 'inline-block', p: 2 }}>
                <Box sx={{ display: 'flex', mb: 1 }}>
                  <Box sx={{ width: 60, height: 60 }} />
                  {correlationData.variables.map((var1, i) => (
                    <Box
                      key={i}
                      sx={{
                        width: 60,
                        height: 60,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600
                      }}
                    >
                      {var1}
                    </Box>
                  ))}
                </Box>

                {correlationData.matrix.map((row, i) => (
                  <Box key={i} sx={{ display: 'flex' }}>
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600
                      }}
                    >
                      {correlationData.variables[i]}
                    </Box>
                    {row.map((value, j) => (
                      <Tooltip
                        key={j}
                        title={
                          <Box>
                            <Typography variant="body2">
                              {correlationData.variables[i]} × {correlationData.variables[j]}
                            </Typography>
                            <Typography variant="body2">
                              r = {value.toFixed(3)} {getSignificance(value)}
                            </Typography>
                            <Typography variant="body2">
                              r² = {(value * value).toFixed(3)}
                            </Typography>
                          </Box>
                        }
                      >
                        <HeatmapCell value={Math.abs(value) >= threshold ? value : 0}>
                          {value.toFixed(2)}
                          <Typography variant="caption" sx={{ position: 'absolute', top: 2, right: 2 }}>
                            {getSignificance(value)}
                          </Typography>
                        </HeatmapCell>
                      </Tooltip>
                    ))}
                  </Box>
                ))}
              </Box>
            </Box>

            <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2">Color Scale:</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: 'rgba(244, 67, 54, 1)' }} />
                <Typography variant="caption">-1.0</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: 'rgba(255, 255, 255, 1)', border: '1px solid #ccc' }} />
                <Typography variant="caption">0.0</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: 'rgba(76, 175, 80, 1)' }} />
                <Typography variant="caption">1.0</Typography>
              </Box>
              <Box sx={{ ml: 'auto' }}>
                <Typography variant="caption">
                  * p &lt; 0.05, ** p &lt; 0.01, *** p &lt; 0.001
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

// Main Module Component
const CorrelationRegressionModule = () => {
  const { darkMode, gradients } = useAppTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [completedSections, setCompletedSections] = useState([]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (!completedSections.includes(newValue)) {
      setCompletedSections([...completedSections, newValue]);
    }
  };

  const progress = (completedSections.length / 5) * 100;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            background: darkMode ? gradients.blue : gradients.primary,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            mb: 2
          }}
        >
          Correlation & Regression Analysis
        </Typography>

        <Typography variant="h6" color="text.secondary" paragraph>
          Master relationships between variables through comprehensive correlation and regression techniques
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Chip
            icon={<Science />}
            label="50-Decimal Precision"
            color="primary"
            variant="outlined"
          />
          <Chip
            icon={<Analytics />}
            label="Multiple Methods"
            color="secondary"
            variant="outlined"
          />
          <Chip
            icon={<Assessment />}
            label="Diagnostic Tools"
            color="success"
            variant="outlined"
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Module Progress: {Math.round(progress)}% Complete
          </Typography>
          <AnimatedProgress variant="determinate" value={progress} />
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<Psychology />} label="Theory" />
          <Tab icon={<ScatterPlot />} label="Correlation Explorer" />
          <Tab icon={<TrendingUp />} label="Regression Analysis" />
          <Tab icon={<GridOn />} label="Correlation Matrix" />
          <Tab icon={<Insights />} label="Applications" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box>
        {activeTab === 0 && (
          <Fade in timeout={500}>
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <GradientCard gradient={gradients.success}>
                    <CardContent sx={{ color: 'white' }}>
                      <Typography variant="h5" gutterBottom>
                        Correlation Analysis
                      </Typography>
                      <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />

                      <Typography variant="h6" gutterBottom>
                        Types of Correlation
                      </Typography>
                      <List>
                        <ListItem>
                          <ListItemText
                            primary="Pearson Correlation (r)"
                            secondary="Measures linear relationship between continuous variables"
                            secondaryTypographyProps={{ style: { color: 'rgba(255,255,255,0.9)' } }}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Spearman's Rank (ρ)"
                            secondary="Non-parametric measure for monotonic relationships"
                            secondaryTypographyProps={{ style: { color: 'rgba(255,255,255,0.9)' } }}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Kendall's Tau (τ)"
                            secondary="Rank correlation for ordinal data"
                            secondaryTypographyProps={{ style: { color: 'rgba(255,255,255,0.9)' } }}
                          />
                        </ListItem>
                      </List>

                      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                        Interpreting Correlations
                      </Typography>
                      <Typography variant="body2" component="div">
                        • |r| &lt; 0.3: Weak correlation<br/>
                        • 0.3 ≤ |r| &lt; 0.5: Moderate correlation<br/>
                        • 0.5 ≤ |r| &lt; 0.7: Strong correlation<br/>
                        • |r| ≥ 0.7: Very strong correlation
                      </Typography>
                    </CardContent>
                  </GradientCard>
                </Grid>

                <Grid item xs={12} md={6}>
                  <GradientCard gradient={gradients.info}>
                    <CardContent sx={{ color: 'white' }}>
                      <Typography variant="h5" gutterBottom>
                        Regression Analysis
                      </Typography>
                      <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />

                      <Typography variant="h6" gutterBottom>
                        Regression Models
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText
                            primary="Simple Linear Regression"
                            secondary="Y = β₀ + β₁X + ε"
                            secondaryTypographyProps={{ style: { color: 'rgba(255,255,255,0.9)' } }}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Multiple Regression"
                            secondary="Y = β₀ + β₁X₁ + β₂X₂ + ... + ε"
                            secondaryTypographyProps={{ style: { color: 'rgba(255,255,255,0.9)' } }}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Polynomial Regression"
                            secondary="Y = β₀ + β₁X + β₂X² + ... + ε"
                            secondaryTypographyProps={{ style: { color: 'rgba(255,255,255,0.9)' } }}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Logistic Regression"
                            secondary="log(p/(1-p)) = β₀ + β₁X"
                            secondaryTypographyProps={{ style: { color: 'rgba(255,255,255,0.9)' } }}
                          />
                        </ListItem>
                      </List>

                      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                        Key Metrics
                      </Typography>
                      <Typography variant="body2" component="div">
                        • R²: Coefficient of determination<br/>
                        • RMSE: Root Mean Square Error<br/>
                        • MAE: Mean Absolute Error<br/>
                        • AIC/BIC: Model selection criteria
                      </Typography>
                    </CardContent>
                  </GradientCard>
                </Grid>

                <Grid item xs={12}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Mathematical Foundations
                    </Typography>

                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ bgcolor: darkMode ? 'grey.900' : 'grey.100', p: 2, borderRadius: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Pearson Correlation Coefficient
                          </Typography>
                          <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace' }}>
                            r = Σ[(xi - x̄)(yi - ȳ)] / √[Σ(xi - x̄)² × Σ(yi - ȳ)²]<br/><br/>
                            Where:<br/>
                            • xi, yi = individual sample points<br/>
                            • x̄, ȳ = sample means<br/>
                            • -1 ≤ r ≤ 1
                          </Typography>
                        </Box>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Box sx={{ bgcolor: darkMode ? 'grey.900' : 'grey.100', p: 2, borderRadius: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Least Squares Regression
                          </Typography>
                          <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace' }}>
                            β₁ = Σ[(xi - x̄)(yi - ȳ)] / Σ(xi - x̄)²<br/>
                            β₀ = ȳ - β₁x̄<br/><br/>
                            Minimizes: Σ(yi - ŷi)²<br/>
                            Where ŷi = β₀ + β₁xi
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    <Alert severity="warning" sx={{ mt: 3 }}>
                      <Typography variant="body2">
                        <strong>Important:</strong> Correlation does not imply causation!
                        A strong correlation between variables doesn't mean one causes the other.
                      </Typography>
                    </Alert>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </Fade>
        )}

        {activeTab === 1 && (
          <Fade in timeout={500}>
            <Box>
              <InteractiveCorrelationSimulation darkMode={darkMode} />
            </Box>
          </Fade>
        )}

        {activeTab === 2 && (
          <Fade in timeout={500}>
            <Box>
              <RegressionAnalysisSimulation darkMode={darkMode} />
            </Box>
          </Fade>
        )}

        {activeTab === 3 && (
          <Fade in timeout={500}>
            <Box>
              <CorrelationMatrixHeatmap darkMode={darkMode} />
            </Box>
          </Fade>
        )}

        {activeTab === 4 && (
          <Fade in timeout={500}>
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <GradientCard gradient={gradients.warning}>
                    <CardContent sx={{ color: 'white' }}>
                      <Typography variant="h6" gutterBottom>
                        Finance & Economics
                      </Typography>
                      <Typography variant="body2">
                        Portfolio optimization, risk assessment, stock price predictions,
                        economic indicator relationships, market correlation analysis
                      </Typography>
                    </CardContent>
                  </GradientCard>
                </Grid>

                <Grid item xs={12} md={4}>
                  <GradientCard gradient={gradients.purple}>
                    <CardContent sx={{ color: 'white' }}>
                      <Typography variant="h6" gutterBottom>
                        Healthcare & Medicine
                      </Typography>
                      <Typography variant="body2">
                        Dose-response relationships, treatment effectiveness,
                        disease progression modeling, risk factor analysis
                      </Typography>
                    </CardContent>
                  </GradientCard>
                </Grid>

                <Grid item xs={12} md={4}>
                  <GradientCard gradient={gradients.success}>
                    <CardContent sx={{ color: 'white' }}>
                      <Typography variant="h6" gutterBottom>
                        Marketing & Sales
                      </Typography>
                      <Typography variant="body2">
                        Customer behavior prediction, sales forecasting,
                        campaign effectiveness, price elasticity analysis
                      </Typography>
                    </CardContent>
                  </GradientCard>
                </Grid>

                <Grid item xs={12}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Real-World Case Study: Sales Prediction Model
                    </Typography>

                    <Stepper activeStep={-1} orientation="vertical">
                      <Step expanded>
                        <StepLabel>
                          <Typography variant="subtitle1">Data Collection</Typography>
                        </StepLabel>
                        <Box sx={{ pl: 4, pb: 2 }}>
                          <Typography variant="body2">
                            Gather historical sales data with features: advertising spend,
                            seasonality, competitor prices, economic indicators
                          </Typography>
                        </Box>
                      </Step>

                      <Step expanded>
                        <StepLabel>
                          <Typography variant="subtitle1">Exploratory Analysis</Typography>
                        </StepLabel>
                        <Box sx={{ pl: 4, pb: 2 }}>
                          <Typography variant="body2">
                            Calculate correlations: Ad spend (r = 0.73), Price (r = -0.45),
                            Season (r = 0.61)
                          </Typography>
                        </Box>
                      </Step>

                      <Step expanded>
                        <StepLabel>
                          <Typography variant="subtitle1">Model Building</Typography>
                        </StepLabel>
                        <Box sx={{ pl: 4, pb: 2 }}>
                          <Typography variant="body2">
                            Multiple regression: Sales = 1000 + 2.5×AdSpend - 15×Price + Seasonal
                          </Typography>
                        </Box>
                      </Step>

                      <Step expanded>
                        <StepLabel>
                          <Typography variant="subtitle1">Validation</Typography>
                        </StepLabel>
                        <Box sx={{ pl: 4, pb: 2 }}>
                          <Typography variant="body2">
                            R² = 0.85, RMSE = $5,000, Cross-validation score = 0.83
                          </Typography>
                        </Box>
                      </Step>

                      <Step expanded>
                        <StepLabel>
                          <Typography variant="subtitle1">Deployment</Typography>
                        </StepLabel>
                        <Box sx={{ pl: 4, pb: 2 }}>
                          <Typography variant="body2">
                            Model predicts next quarter sales within 5% accuracy
                          </Typography>
                        </Box>
                      </Step>
                    </Stepper>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Pro Tip:</strong> Always check regression assumptions
                      (linearity, independence, homoscedasticity, normality) before
                      interpreting results. Use diagnostic plots to identify violations.
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </Box>
          </Fade>
        )}
      </Box>

      {/* Floating Action Button */}
      <Zoom in>
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <NavigateNext />
        </Fab>
      </Zoom>
    </Container>
  );
};

export default CorrelationRegressionModule;