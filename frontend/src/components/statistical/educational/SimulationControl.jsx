import React, { useState, useEffect } from 'react';
import {
  Paper,
  Box,
  Typography,
  Slider,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  Chip,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Replay as ResetIcon,
  Speed as SpeedIcon,
  Casino as RandomIcon,
  Settings as SettingsIcon,
  Download as DownloadIcon,
  TrendingUp as TrendingIcon,
  Science as ScienceIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const SimulationControl = ({
  parameters = [],
  onParameterChange = null,
  onRun = null,
  onReset = null,
  showVisualization = true,
  simulationType = 'sampling',
  allowAnimation = true,
  showStatistics = true,
  customControls = []
}) => {
  const [paramValues, setParamValues] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [simulationData, setSimulationData] = useState([]);
  const [currentIteration, setCurrentIteration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [animationInterval, setAnimationInterval] = useState(null);

  // Default parameters based on simulation type
  const defaultParameters = {
    sampling: [
      { id: 'sampleSize', label: 'Sample Size', type: 'slider', min: 10, max: 1000, default: 100, step: 10 },
      { id: 'numSamples', label: 'Number of Samples', type: 'slider', min: 1, max: 100, default: 10, step: 1 },
      { id: 'distribution', label: 'Distribution', type: 'select', options: ['Normal', 'Uniform', 'Exponential', 'Binomial'], default: 'Normal' }
    ],
    hypothesis: [
      { id: 'alpha', label: 'Significance Level (α)', type: 'slider', min: 0.01, max: 0.1, default: 0.05, step: 0.01 },
      { id: 'effectSize', label: 'Effect Size', type: 'slider', min: 0, max: 2, default: 0.5, step: 0.1 },
      { id: 'power', label: 'Statistical Power', type: 'slider', min: 0.5, max: 0.99, default: 0.8, step: 0.01 }
    ],
    regression: [
      { id: 'noise', label: 'Noise Level', type: 'slider', min: 0, max: 10, default: 1, step: 0.5 },
      { id: 'slope', label: 'True Slope', type: 'slider', min: -5, max: 5, default: 1, step: 0.1 },
      { id: 'intercept', label: 'True Intercept', type: 'slider', min: -10, max: 10, default: 0, step: 0.5 }
    ]
  };

  useEffect(() => {
    // Initialize parameter values
    const params = parameters.length > 0 ? parameters : defaultParameters[simulationType] || [];
    const initialValues = {};
    params.forEach(param => {
      initialValues[param.id] = param.default;
    });
    setParamValues(initialValues);
  }, [parameters, simulationType]);

  useEffect(() => {
    if (isRunning && allowAnimation) {
      const interval = setInterval(() => {
        runSimulationStep();
      }, 1000 / speed);
      setAnimationInterval(interval);
      return () => clearInterval(interval);
    }
  }, [isRunning, speed]);

  const handleParameterChange = (paramId, value) => {
    const newValues = { ...paramValues, [paramId]: value };
    setParamValues(newValues);
    if (onParameterChange) {
      onParameterChange(paramId, value);
    }
  };

  const runSimulationStep = () => {
    setCurrentIteration(prev => {
      const next = prev + 1;
      generateSimulationData(next);
      return next;
    });
  };

  const generateSimulationData = (iteration) => {
    // Generate sample simulation data based on type
    const newData = [];
    const sampleSize = paramValues.sampleSize || 100;

    for (let i = 0; i < sampleSize; i++) {
      let value;
      switch (paramValues.distribution || 'Normal') {
        case 'Normal':
          value = generateNormalValue(0, 1);
          break;
        case 'Uniform':
          value = Math.random();
          break;
        case 'Exponential':
          value = -Math.log(1 - Math.random());
          break;
        case 'Binomial':
          value = Math.random() < 0.5 ? 0 : 1;
          break;
        default:
          value = Math.random();
      }
      newData.push({ x: i, y: value, iteration });
    }

    setSimulationData(prev => [...prev.slice(-200), ...newData]);
    updateStatistics(newData);
  };

  const generateNormalValue = (mean = 0, stdDev = 1) => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  };

  const updateStatistics = (data) => {
    const values = data.map(d => d.y);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);

    setStatistics({
      mean: mean.toFixed(4),
      stdDev: stdDev.toFixed(4),
      min: min.toFixed(4),
      max: max.toFixed(4),
      count: values.length
    });
  };

  const handleRun = () => {
    setIsRunning(true);
    if (onRun) {
      onRun(paramValues);
    }
  };

  const handlePause = () => {
    setIsRunning(false);
    if (animationInterval) {
      clearInterval(animationInterval);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentIteration(0);
    setSimulationData([]);
    setStatistics(null);
    if (animationInterval) {
      clearInterval(animationInterval);
    }
    if (onReset) {
      onReset();
    }
  };

  const handleRandomize = () => {
    const params = parameters.length > 0 ? parameters : defaultParameters[simulationType] || [];
    const newValues = {};
    params.forEach(param => {
      if (param.type === 'slider') {
        const range = param.max - param.min;
        newValues[param.id] = param.min + Math.random() * range;
      } else if (param.type === 'select') {
        const randomIndex = Math.floor(Math.random() * param.options.length);
        newValues[param.id] = param.options[randomIndex];
      }
    });
    setParamValues(newValues);
  };

  const exportData = () => {
    const csv = simulationData.map(row =>
      `${row.x},${row.y},${row.iteration}`
    ).join('\n');

    const blob = new Blob([`x,y,iteration\n${csv}`], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulation_${simulationType}_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderParameter = (param) => {
    switch (param.type) {
      case 'slider':
        return (
          <Grid item xs={12} sm={6} key={param.id}>
            <Typography variant="body2" gutterBottom>
              {param.label}: {paramValues[param.id]?.toFixed(param.decimal || 2)}
            </Typography>
            <Slider
              value={paramValues[param.id] || param.default}
              onChange={(e, v) => handleParameterChange(param.id, v)}
              min={param.min}
              max={param.max}
              step={param.step}
              marks
              disabled={isRunning}
            />
          </Grid>
        );

      case 'select':
        return (
          <Grid item xs={12} sm={6} key={param.id}>
            <FormControl fullWidth size="small">
              <InputLabel>{param.label}</InputLabel>
              <Select
                value={paramValues[param.id] || param.default}
                onChange={(e) => handleParameterChange(param.id, e.target.value)}
                label={param.label}
                disabled={isRunning}
              >
                {param.options.map(option => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        );

      case 'number':
        return (
          <Grid item xs={12} sm={6} key={param.id}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label={param.label}
              value={paramValues[param.id] || param.default}
              onChange={(e) => handleParameterChange(param.id, parseFloat(e.target.value))}
              disabled={isRunning}
            />
          </Grid>
        );

      case 'switch':
        return (
          <Grid item xs={12} sm={6} key={param.id}>
            <FormControlLabel
              control={
                <Switch
                  checked={paramValues[param.id] || false}
                  onChange={(e) => handleParameterChange(param.id, e.target.checked)}
                  disabled={isRunning}
                />
              }
              label={param.label}
            />
          </Grid>
        );

      default:
        return null;
    }
  };

  const allParameters = parameters.length > 0 ? parameters : defaultParameters[simulationType] || [];

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScienceIcon color="primary" />
          <Typography variant="h6">
            Simulation Controls
          </Typography>
          {currentIteration > 0 && (
            <Chip
              label={`Iteration: ${currentIteration}`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Randomize Parameters">
            <IconButton onClick={handleRandomize} disabled={isRunning}>
              <RandomIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Advanced Settings">
            <IconButton onClick={() => setShowAdvanced(!showAdvanced)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export Data">
            <IconButton onClick={exportData} disabled={simulationData.length === 0}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {allParameters.map(param => renderParameter(param))}
        {customControls.map(control => (
          <Grid item xs={12} sm={6} key={control.id}>
            {control.render(paramValues, handleParameterChange)}
          </Grid>
        ))}
      </Grid>

      {showAdvanced && allowAnimation && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Animation Speed
          </Typography>
          <ToggleButtonGroup
            value={speed}
            exclusive
            onChange={(e, v) => v && setSpeed(v)}
            size="small"
          >
            <ToggleButton value={0.5}>0.5x</ToggleButton>
            <ToggleButton value={1}>1x</ToggleButton>
            <ToggleButton value={2}>2x</ToggleButton>
            <ToggleButton value={5}>5x</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        {!isRunning ? (
          <Button
            variant="contained"
            startIcon={<PlayIcon />}
            onClick={handleRun}
            fullWidth
          >
            Run Simulation
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<PauseIcon />}
            onClick={handlePause}
            fullWidth
            color="warning"
          >
            Pause
          </Button>
        )}
        <Button
          variant="outlined"
          startIcon={<ResetIcon />}
          onClick={handleReset}
          disabled={currentIteration === 0}
        >
          Reset
        </Button>
      </Box>

      {isRunning && (
        <LinearProgress sx={{ mb: 2 }} />
      )}

      {showVisualization && simulationData.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Simulation Results
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={simulationData.slice(-100)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" />
              <YAxis />
              <ChartTooltip />
              <Area
                type="monotone"
                dataKey="y"
                stroke="#667eea"
                fill="#667eea"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      )}

      {showStatistics && statistics && (
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Card variant="outlined">
              <CardContent sx={{ py: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Mean
                </Typography>
                <Typography variant="h6">
                  {statistics.mean}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card variant="outlined">
              <CardContent sx={{ py: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Std Dev
                </Typography>
                <Typography variant="h6">
                  {statistics.stdDev}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card variant="outlined">
              <CardContent sx={{ py: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Min
                </Typography>
                <Typography variant="h6">
                  {statistics.min}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card variant="outlined">
              <CardContent sx={{ py: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Max
                </Typography>
                <Typography variant="h6">
                  {statistics.max}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Paper>
  );
};

export default SimulationControl;