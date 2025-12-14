/**
 * MichaelisMentenAnalysis - Comprehensive Enzyme Kinetics Analysis
 *
 * Features:
 * - Michaelis-Menten non-linear fitting
 * - Hill equation for cooperativity
 * - Linear transformations (Lineweaver-Burk, Eadie-Hofstee, Hanes-Woolf)
 * - Enzyme inhibition analysis
 * - Interactive visualizations
 * - R/Python code export
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Chip,
  Alert,
  AlertTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Divider,
  Switch,
  FormControlLabel,
  Slider,
  CircularProgress
} from '@mui/material';

// Icons
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CodeIcon from '@mui/icons-material/Code';

// Utilities
import {
  analyzeMichaelisMenten,
  analyzeHill,
  calculateLineweaverBurk,
  calculateEadieHofstee,
  calculateHanesWoolf,
  generateMichaelisMentenCurve,
  generateHillCurve,
  INHIBITION_TYPES
} from '../../../../utils/biophysics';

// ============================================================================
// CONSTANTS
// ============================================================================

const ANALYSIS_MODES = [
  { id: 'michaelis-menten', label: 'Michaelis-Menten', description: 'Standard enzyme kinetics' },
  { id: 'hill', label: 'Hill Equation', description: 'With cooperativity' },
  { id: 'substrate-inhibition', label: 'Substrate Inhibition', description: 'With excess substrate inhibition' }
];

const SAMPLE_DATA = {
  standard: {
    substrate: [0.5, 1, 2, 5, 10, 20, 50, 100, 200],
    velocity: [2.1, 3.8, 6.2, 11.5, 16.8, 22.1, 28.3, 31.2, 33.5]
  },
  cooperative: {
    substrate: [0.1, 0.5, 1, 2, 5, 10, 20, 50, 100],
    velocity: [0.2, 1.5, 5.8, 15.2, 28.6, 32.1, 33.8, 34.2, 34.5]
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const MichaelisMentenAnalysis = ({ data, onAnalysisComplete }) => {
  // State
  const [analysisMode, setAnalysisMode] = useState('michaelis-menten');
  const [substrateData, setSubstrateData] = useState('');
  const [velocityData, setVelocityData] = useState('');
  const [substrateUnit, setSubstrateUnit] = useState('μM');
  const [velocityUnit, setVelocityUnit] = useState('μmol/min');
  const [enzymeConc, setEnzymeConc] = useState('');
  const [results, setResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [activeResultTab, setActiveResultTab] = useState(0);
  const [showLinearPlots, setShowLinearPlots] = useState(true);
  const [compareModels, setCompareModels] = useState(false);

  const canvasRef = useRef(null);
  const linearCanvasRef = useRef(null);

  // Parse data from textarea
  const parseData = useCallback((dataString) => {
    if (!dataString.trim()) return [];
    return dataString
      .split(/[\n,\s]+/)
      .map(v => parseFloat(v.trim()))
      .filter(v => !isNaN(v));
  }, []);

  // Load sample data
  const loadSampleData = useCallback((type) => {
    const sampleData = type === 'cooperative' ? SAMPLE_DATA.cooperative : SAMPLE_DATA.standard;
    setSubstrateData(sampleData.substrate.join('\n'));
    setVelocityData(sampleData.velocity.join('\n'));
  }, []);

  // Run analysis
  const runAnalysis = useCallback(() => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const substrate = parseData(substrateData);
      const velocity = parseData(velocityData);

      if (substrate.length === 0 || velocity.length === 0) {
        throw new Error('Please enter substrate and velocity data');
      }

      if (substrate.length !== velocity.length) {
        throw new Error(`Data length mismatch: ${substrate.length} substrate values vs ${velocity.length} velocity values`);
      }

      const options = {
        concentrationUnit: substrateUnit,
        velocityUnit: velocityUnit,
        enzymeConcentration: enzymeConc ? parseFloat(enzymeConc) : null
      };

      let analysisResults;

      if (analysisMode === 'michaelis-menten') {
        analysisResults = analyzeMichaelisMenten(substrate, velocity, options);
      } else if (analysisMode === 'hill') {
        analysisResults = analyzeHill(substrate, velocity, options);
      }

      if (!analysisResults.success) {
        throw new Error(analysisResults.errors?.join(', ') || 'Analysis failed');
      }

      // Compare with Hill model if requested
      if (compareModels && analysisMode === 'michaelis-menten') {
        const hillResults = analyzeHill(substrate, velocity, options);
        analysisResults.hillComparison = hillResults;
      }

      setResults(analysisResults);

      if (onAnalysisComplete) {
        onAnalysisComplete(analysisResults);
      }
    } catch (err) {
      setError(err.message);
      setResults(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, [substrateData, velocityData, analysisMode, substrateUnit, velocityUnit, enzymeConc, compareModels, parseData, onAnalysisComplete]);

  // Draw main plot
  useEffect(() => {
    if (!results || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Margins
    const margin = { top: 40, right: 40, bottom: 60, left: 80 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    // Data
    const substrate = parseData(substrateData);
    const velocity = parseData(velocityData);

    // Scales
    const xMax = Math.max(...substrate) * 1.1;
    const yMax = Math.max(...velocity, results.parameters.Vmax?.value || 0) * 1.1;

    const xScale = (x) => margin.left + (x / xMax) * plotWidth;
    const yScale = (y) => margin.top + plotHeight - (y / yMax) * plotHeight;

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + plotHeight);
    ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`[Substrate] (${substrateUnit})`, margin.left + plotWidth / 2, height - 15);

    ctx.save();
    ctx.translate(20, margin.top + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`Velocity (${velocityUnit})`, 0, 0);
    ctx.restore();

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const x = margin.left + (i / 5) * plotWidth;
      const y = margin.top + (i / 5) * plotHeight;

      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + plotHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + plotWidth, y);
      ctx.stroke();

      // Tick labels
      ctx.fillStyle = '#666';
      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText((xMax * i / 5).toFixed(1), x, margin.top + plotHeight + 20);

      ctx.textAlign = 'right';
      ctx.fillText((yMax * (5 - i) / 5).toFixed(1), margin.left - 10, y + 4);
    }

    // Draw fitted curve
    if (results.curveData) {
      ctx.strokeStyle = '#2196F3';
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      results.curveData.forEach((point, i) => {
        const x = xScale(point.S);
        const y = yScale(point.v);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Draw Vmax line
    if (results.parameters.Vmax) {
      const Vmax = results.parameters.Vmax.value;
      ctx.strokeStyle = '#FF9800';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(margin.left, yScale(Vmax));
      ctx.lineTo(margin.left + plotWidth, yScale(Vmax));
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#FF9800';
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`Vmax = ${Vmax.toFixed(2)}`, margin.left + plotWidth - 5, yScale(Vmax) - 5);
    }

    // Draw Km indicator
    if (results.parameters.Km || results.parameters.K05) {
      const Km = results.parameters.Km?.value || results.parameters.K05?.value;
      const halfVmax = (results.parameters.Vmax?.value || 0) / 2;

      ctx.strokeStyle = '#4CAF50';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.5;

      // Vertical line at Km
      ctx.beginPath();
      ctx.moveTo(xScale(Km), yScale(0));
      ctx.lineTo(xScale(Km), yScale(halfVmax));
      ctx.stroke();

      // Horizontal line to y-axis
      ctx.beginPath();
      ctx.moveTo(margin.left, yScale(halfVmax));
      ctx.lineTo(xScale(Km), yScale(halfVmax));
      ctx.stroke();

      ctx.setLineDash([]);

      ctx.fillStyle = '#4CAF50';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      const label = results.parameters.Km ? 'Km' : 'K₀.₅';
      ctx.fillText(`${label} = ${Km.toFixed(2)}`, xScale(Km) + 5, yScale(halfVmax) + 15);
    }

    // Draw data points
    ctx.fillStyle = '#1976D2';
    substrate.forEach((s, i) => {
      const x = xScale(s);
      const y = yScale(velocity[i]);

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(results.model || 'Enzyme Kinetics', width / 2, 25);

  }, [results, substrateData, velocityData, substrateUnit, velocityUnit, parseData]);

  // Draw linear transformation plots
  useEffect(() => {
    if (!results || !linearCanvasRef.current || !showLinearPlots) return;
    if (!results.linearTransformations) return;

    const canvas = linearCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const plots = [
      results.linearTransformations.lineweaverBurk,
      results.linearTransformations.eadieHofstee,
      results.linearTransformations.hanesWoolf
    ];

    const plotWidth = width / 3;
    const plotHeight = height;
    const margin = { top: 40, right: 20, bottom: 50, left: 60 };

    plots.forEach((plot, plotIndex) => {
      if (!plot) return;

      const offsetX = plotIndex * plotWidth;
      const innerWidth = plotWidth - margin.left - margin.right;
      const innerHeight = plotHeight - margin.top - margin.bottom;

      // Data points
      const xData = plot.dataPoints.map(p => p.x);
      const yData = plot.dataPoints.map(p => p.y);

      // Include line endpoints in scale calculation
      const allX = [...xData, ...plot.line.map(p => p.x)].filter(v => isFinite(v));
      const allY = [...yData, ...plot.line.map(p => p.y)].filter(v => isFinite(v));

      const xMin = Math.min(...allX) * (Math.min(...allX) < 0 ? 1.1 : 0.9);
      const xMax = Math.max(...allX) * 1.1;
      const yMin = Math.min(0, ...allY);
      const yMax = Math.max(...allY) * 1.1;

      const xScale = (x) => offsetX + margin.left + ((x - xMin) / (xMax - xMin)) * innerWidth;
      const yScale = (y) => margin.top + innerHeight - ((y - yMin) / (yMax - yMin)) * innerHeight;

      // Draw axes
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(offsetX + margin.left, margin.top);
      ctx.lineTo(offsetX + margin.left, margin.top + innerHeight);
      ctx.lineTo(offsetX + margin.left + innerWidth, margin.top + innerHeight);
      ctx.stroke();

      // Zero line if applicable
      if (xMin < 0) {
        ctx.strokeStyle = '#999';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(xScale(0), margin.top);
        ctx.lineTo(xScale(0), margin.top + innerHeight);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw fitted line
      ctx.strokeStyle = '#F44336';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const linePoints = plot.line.filter(p => isFinite(p.x) && isFinite(p.y));
      linePoints.forEach((p, i) => {
        const x = xScale(p.x);
        const y = yScale(p.y);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw data points
      ctx.fillStyle = '#1976D2';
      plot.dataPoints.forEach(p => {
        const x = xScale(p.x);
        const y = yScale(p.y);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Title
      ctx.fillStyle = '#333';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(plot.name, offsetX + plotWidth / 2, 20);

      // R² value
      ctx.font = '10px Arial';
      ctx.fillText(`R² = ${plot.parameters.R2.toFixed(4)}`, offsetX + plotWidth / 2, 35);

      // Axis labels
      ctx.font = '10px Arial';
      ctx.fillText(plot.xAxis, offsetX + plotWidth / 2, height - 10);
    });

  }, [results, showLinearPlots]);

  // Generate R code
  const generateRCode = useCallback(() => {
    if (!results) return '';

    const substrate = parseData(substrateData);
    const velocity = parseData(velocityData);

    return `# Enzyme Kinetics Analysis in R
# Generated by StickForStats
# Date: ${new Date().toISOString().split('T')[0]}

# Install required package if needed
# install.packages("drc")  # For dose-response curves
# install.packages("minpack.lm")  # For Levenberg-Marquardt

library(minpack.lm)

# Data
substrate <- c(${substrate.join(', ')})
velocity <- c(${velocity.join(', ')})
data <- data.frame(S = substrate, v = velocity)

# Michaelis-Menten Model
# v = Vmax * S / (Km + S)

mm_model <- function(S, Vmax, Km) {
  Vmax * S / (Km + S)
}

# Non-linear least squares fit
fit <- nlsLM(
  v ~ Vmax * S / (Km + S),
  data = data,
  start = list(Vmax = ${(results.parameters.Vmax?.value || 35).toFixed(2)},
               Km = ${(results.parameters.Km?.value || 10).toFixed(2)}),
  control = nls.lm.control(maxiter = 100)
)

# Results
summary(fit)
coef(fit)
confint(fit)

# Plot
S_pred <- seq(0, max(substrate) * 1.2, length.out = 100)
v_pred <- predict(fit, newdata = data.frame(S = S_pred))

plot(substrate, velocity,
     pch = 16, col = "blue",
     xlab = "Substrate Concentration (${substrateUnit})",
     ylab = "Velocity (${velocityUnit})",
     main = "Michaelis-Menten Kinetics")
lines(S_pred, v_pred, col = "red", lwd = 2)

# Add Vmax and Km lines
abline(h = coef(fit)["Vmax"], lty = 2, col = "orange")
abline(v = coef(fit)["Km"], lty = 2, col = "green")

# Lineweaver-Burk Plot
plot(1/substrate, 1/velocity,
     pch = 16, col = "blue",
     xlab = "1/[S]",
     ylab = "1/v",
     main = "Lineweaver-Burk Plot")
abline(lm(I(1/v) ~ I(1/S), data = data), col = "red")

# References:
# Cornish-Bowden, A. (2012). Fundamentals of Enzyme Kinetics. Wiley-Blackwell.
# Copeland, R.A. (2000). Enzymes: A Practical Introduction. Wiley-VCH.
`;
  }, [results, substrateData, velocityData, substrateUnit, velocityUnit, parseData]);

  // Generate Python code
  const generatePythonCode = useCallback(() => {
    if (!results) return '';

    const substrate = parseData(substrateData);
    const velocity = parseData(velocityData);

    return `# Enzyme Kinetics Analysis in Python
# Generated by StickForStats
# Date: ${new Date().toISOString().split('T')[0]}

import numpy as np
from scipy.optimize import curve_fit
import matplotlib.pyplot as plt

# Data
substrate = np.array([${substrate.join(', ')}])
velocity = np.array([${velocity.join(', ')}])

# Michaelis-Menten Model
def michaelis_menten(S, Vmax, Km):
    """v = Vmax * S / (Km + S)"""
    return Vmax * S / (Km + S)

# Fit the model
initial_guess = [${(results.parameters.Vmax?.value || 35).toFixed(2)}, ${(results.parameters.Km?.value || 10).toFixed(2)}]
popt, pcov = curve_fit(michaelis_menten, substrate, velocity, p0=initial_guess)
Vmax, Km = popt
Vmax_err, Km_err = np.sqrt(np.diag(pcov))

print(f"Vmax = {Vmax:.4f} ± {Vmax_err:.4f} ${velocityUnit}")
print(f"Km = {Km:.4f} ± {Km_err:.4f} ${substrateUnit}")

# Calculate R²
predicted = michaelis_menten(substrate, *popt)
SS_res = np.sum((velocity - predicted) ** 2)
SS_tot = np.sum((velocity - np.mean(velocity)) ** 2)
R2 = 1 - SS_res / SS_tot
print(f"R² = {R2:.4f}")

# Plot
fig, axes = plt.subplots(1, 2, figsize=(12, 5))

# Main plot
ax1 = axes[0]
S_fit = np.linspace(0, max(substrate) * 1.2, 100)
v_fit = michaelis_menten(S_fit, *popt)

ax1.scatter(substrate, velocity, c='blue', s=50, label='Data')
ax1.plot(S_fit, v_fit, 'r-', lw=2, label='Fit')
ax1.axhline(y=Vmax, color='orange', linestyle='--', label=f'Vmax = {Vmax:.2f}')
ax1.axvline(x=Km, color='green', linestyle='--', label=f'Km = {Km:.2f}')
ax1.set_xlabel('Substrate Concentration (${substrateUnit})')
ax1.set_ylabel('Velocity (${velocityUnit})')
ax1.set_title('Michaelis-Menten Kinetics')
ax1.legend()

# Lineweaver-Burk Plot
ax2 = axes[1]
inv_S = 1 / substrate
inv_v = 1 / velocity
ax2.scatter(inv_S, inv_v, c='blue', s=50)

# Linear fit for Lineweaver-Burk
slope = Km / Vmax
intercept = 1 / Vmax
x_lb = np.linspace(-1/Km * 0.5, max(inv_S) * 1.2, 100)
y_lb = slope * x_lb + intercept
ax2.plot(x_lb, y_lb, 'r-', lw=2)
ax2.axhline(y=0, color='gray', linestyle='-', lw=0.5)
ax2.axvline(x=0, color='gray', linestyle='-', lw=0.5)
ax2.set_xlabel('1/[S]')
ax2.set_ylabel('1/v')
ax2.set_title('Lineweaver-Burk Plot')

plt.tight_layout()
plt.savefig('enzyme_kinetics.png', dpi=300, bbox_inches='tight')
plt.show()

# References:
# Cornish-Bowden, A. (2012). Fundamentals of Enzyme Kinetics. Wiley-Blackwell.
# Copeland, R.A. (2000). Enzymes: A Practical Introduction. Wiley-VCH.
`;
  }, [results, substrateData, velocityData, substrateUnit, velocityUnit, parseData]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text, type) => {
    navigator.clipboard.writeText(text);
    // Could add a snackbar notification here
  }, []);

  return (
    <Box>
      {/* Input Section */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              Data Input
              <Tooltip title="Enter substrate concentrations and corresponding velocities">
                <InfoIcon fontSize="small" color="action" />
              </Tooltip>
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Analysis Mode</InputLabel>
              <Select
                value={analysisMode}
                onChange={(e) => setAnalysisMode(e.target.value)}
                label="Analysis Mode"
              >
                {ANALYSIS_MODES.map(mode => (
                  <MenuItem key={mode.id} value={mode.id}>
                    <Box>
                      <Typography variant="body2">{mode.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {mode.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label={`Substrate [${substrateUnit}]`}
                  value={substrateData}
                  onChange={(e) => setSubstrateData(e.target.value)}
                  placeholder="Enter values (one per line or comma-separated)"
                  helperText={`${parseData(substrateData).length} values`}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label={`Velocity [${velocityUnit}]`}
                  value={velocityData}
                  onChange={(e) => setVelocityData(e.target.value)}
                  placeholder="Enter values (one per line or comma-separated)"
                  helperText={`${parseData(velocityData).length} values`}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Substrate Unit</InputLabel>
                  <Select
                    value={substrateUnit}
                    onChange={(e) => setSubstrateUnit(e.target.value)}
                    label="Substrate Unit"
                  >
                    <MenuItem value="μM">μM</MenuItem>
                    <MenuItem value="mM">mM</MenuItem>
                    <MenuItem value="nM">nM</MenuItem>
                    <MenuItem value="M">M</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Velocity Unit</InputLabel>
                  <Select
                    value={velocityUnit}
                    onChange={(e) => setVelocityUnit(e.target.value)}
                    label="Velocity Unit"
                  >
                    <MenuItem value="μmol/min">μmol/min</MenuItem>
                    <MenuItem value="nmol/min">nmol/min</MenuItem>
                    <MenuItem value="μmol/s">μmol/s</MenuItem>
                    <MenuItem value="AU/min">AU/min</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="[Enzyme] (optional)"
                  value={enzymeConc}
                  onChange={(e) => setEnzymeConc(e.target.value)}
                  placeholder="For kcat calculation"
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => loadSampleData('standard')}
              >
                Load Standard Example
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => loadSampleData('cooperative')}
              >
                Load Cooperative Example
              </Button>
              <FormControlLabel
                control={
                  <Switch
                    checked={compareModels}
                    onChange={(e) => setCompareModels(e.target.checked)}
                    size="small"
                  />
                }
                label="Compare with Hill"
              />
            </Box>

            <Button
              variant="contained"
              fullWidth
              startIcon={isAnalyzing ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
              onClick={runAnalysis}
              disabled={isAnalyzing}
              sx={{ mt: 2 }}
            >
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </Button>
          </Paper>
        </Grid>

        {/* Results Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Results
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <AlertTitle>Error</AlertTitle>
                {error}
              </Alert>
            )}

            {results && (
              <>
                {/* Parameter Summary */}
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      {results.model}
                    </Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mb: 1 }}>
                      {results.equation}
                    </Typography>

                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Parameter</TableCell>
                            <TableCell align="right">Value</TableCell>
                            <TableCell align="right">Std Error</TableCell>
                            <TableCell align="right">95% CI</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(results.parameters).map(([name, param]) => (
                            <TableRow key={name}>
                              <TableCell>
                                <strong>{name}</strong>
                                {param.description && (
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    {param.description}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="right">
                                {param.value?.toFixed(4)} {param.unit}
                              </TableCell>
                              <TableCell align="right">
                                {param.error?.toFixed(4) || '-'}
                              </TableCell>
                              <TableCell align="right">
                                {param.ci95
                                  ? `[${param.ci95.lower?.toFixed(3)}, ${param.ci95.upper?.toFixed(3)}]`
                                  : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Statistics */}
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        label={`R² = ${results.statistics?.R2?.toFixed(4)}`}
                        color={results.statistics?.R2 > 0.95 ? 'success' : 'warning'}
                        icon={results.statistics?.R2 > 0.95 ? <CheckCircleIcon /> : <WarningIcon />}
                      />
                      <Chip
                        size="small"
                        label={`AIC = ${results.statistics?.AIC?.toFixed(1)}`}
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={`SE = ${results.statistics?.standardError?.toFixed(3)}`}
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                </Card>

                {/* Catalytic Efficiency */}
                {results.catalyticEfficiency && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>kcat</strong> = {results.catalyticEfficiency.kcat.toFixed(2)} s⁻¹
                    </Typography>
                    <Typography variant="body2">
                      <strong>kcat/Km</strong> = {results.catalyticEfficiency.kcatOverKm.toExponential(2)} {results.catalyticEfficiency.unit}
                    </Typography>
                  </Alert>
                )}

                {/* Interpretation */}
                {results.interpretation && results.interpretation.length > 0 && (
                  <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
                    <AlertTitle>Interpretation</AlertTitle>
                    {results.interpretation.map((text, i) => (
                      <Typography key={i} variant="body2">• {text}</Typography>
                    ))}
                  </Alert>
                )}

                {/* Warnings */}
                {results.warnings && results.warnings.length > 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    {results.warnings.map((w, i) => (
                      <Typography key={i} variant="body2">• {w}</Typography>
                    ))}
                  </Alert>
                )}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Visualization Section */}
      {results && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Visualization
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} lg={showLinearPlots ? 6 : 12}>
              <Typography variant="subtitle2" gutterBottom>
                {results.model}
              </Typography>
              <canvas
                ref={canvasRef}
                width={600}
                height={400}
                style={{ width: '100%', height: 'auto', border: '1px solid #e0e0e0', borderRadius: 4 }}
              />
            </Grid>

            {showLinearPlots && results.linearTransformations && (
              <Grid item xs={12} lg={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2">
                    Linear Transformations
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showLinearPlots}
                        onChange={(e) => setShowLinearPlots(e.target.checked)}
                        size="small"
                      />
                    }
                    label="Show"
                  />
                </Box>
                <canvas
                  ref={linearCanvasRef}
                  width={900}
                  height={300}
                  style={{ width: '100%', height: 'auto', border: '1px solid #e0e0e0', borderRadius: 4 }}
                />
                <Alert severity="warning" sx={{ mt: 1 }}>
                  <Typography variant="caption">
                    Note: Linear transformations distort error structure. Use non-linear regression (shown above) for parameter estimation.
                    Linear plots are shown for pedagogical purposes only.
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* Code Export Section */}
      {results && (
        <Accordion sx={{ mt: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CodeIcon />
              Export Code (R / Python)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Tabs
              value={activeResultTab}
              onChange={(e, v) => setActiveResultTab(v)}
              sx={{ mb: 2 }}
            >
              <Tab label="R Code" />
              <Tab label="Python Code" />
            </Tabs>

            {activeResultTab === 0 && (
              <Box>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <Button
                    size="small"
                    startIcon={<ContentCopyIcon />}
                    onClick={() => copyToClipboard(generateRCode(), 'R')}
                  >
                    Copy
                  </Button>
                  <Button
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => {
                      const blob = new Blob([generateRCode()], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `enzyme_kinetics_${new Date().toISOString().split('T')[0]}.R`;
                      a.click();
                    }}
                  >
                    Download .R
                  </Button>
                </Box>
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: '#1e1e1e',
                    color: '#d4d4d4',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    overflow: 'auto',
                    maxHeight: 400
                  }}
                >
                  <pre style={{ margin: 0 }}>{generateRCode()}</pre>
                </Paper>
              </Box>
            )}

            {activeResultTab === 1 && (
              <Box>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <Button
                    size="small"
                    startIcon={<ContentCopyIcon />}
                    onClick={() => copyToClipboard(generatePythonCode(), 'Python')}
                  >
                    Copy
                  </Button>
                  <Button
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => {
                      const blob = new Blob([generatePythonCode()], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `enzyme_kinetics_${new Date().toISOString().split('T')[0]}.py`;
                      a.click();
                    }}
                  >
                    Download .py
                  </Button>
                </Box>
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: '#1e1e1e',
                    color: '#d4d4d4',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    overflow: 'auto',
                    maxHeight: 400
                  }}
                >
                  <pre style={{ margin: 0 }}>{generatePythonCode()}</pre>
                </Paper>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};

export default MichaelisMentenAnalysis;
