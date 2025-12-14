/**
 * BindingAffinityAnalysis - Saturation Binding and Kd Determination
 *
 * Features:
 * - One-site and two-site binding models
 * - Scatchard analysis
 * - Interactive saturation curves
 * - Hill coefficient for cooperativity
 * - R/Python code export
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  Tooltip,
  Switch,
  FormControlLabel,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';

// Icons
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CodeIcon from '@mui/icons-material/Code';

// Utilities
import {
  analyzeSaturationBinding,
  analyzeBindingWithHill,
  formatKd,
  classifyAffinity
} from '../../../../utils/biophysics';

// ============================================================================
// CONSTANTS
// ============================================================================

const SAMPLE_DATA = {
  highAffinity: {
    ligand: [0.1, 0.5, 1, 2, 5, 10, 20, 50, 100, 200],
    bound: [8.2, 32.1, 52.4, 71.3, 86.2, 92.1, 96.3, 98.5, 99.2, 99.6]
  },
  lowAffinity: {
    ligand: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
    bound: [4.8, 20.1, 33.3, 55.5, 71.4, 83.3, 92.6, 96.2, 98.0]
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const BindingAffinityAnalysis = ({ data, onAnalysisComplete }) => {
  // State
  const [ligandData, setLigandData] = useState('');
  const [boundData, setBoundData] = useState('');
  const [ligandUnit, setLigandUnit] = useState('nM');
  const [boundUnit, setBoundUnit] = useState('fmol/mg');
  const [analyzeHill, setAnalyzeHill] = useState(false);
  const [compareTwoSite, setCompareTwoSite] = useState(true);
  const [results, setResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [codeTab, setCodeTab] = useState(0);

  const mainCanvasRef = useRef(null);
  const scatchardCanvasRef = useRef(null);

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
    const sampleData = SAMPLE_DATA[type];
    setLigandData(sampleData.ligand.join('\n'));
    setBoundData(sampleData.bound.join('\n'));
  }, []);

  // Run analysis
  const runAnalysis = useCallback(() => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const ligand = parseData(ligandData);
      const bound = parseData(boundData);

      if (ligand.length === 0 || bound.length === 0) {
        throw new Error('Please enter ligand and bound data');
      }

      if (ligand.length !== bound.length) {
        throw new Error(`Data length mismatch: ${ligand.length} ligand values vs ${bound.length} bound values`);
      }

      const options = {
        concentrationUnit: ligandUnit,
        bindingUnit: boundUnit,
        compareTwoSite
      };

      let analysisResults;

      if (analyzeHill) {
        analysisResults = analyzeBindingWithHill(ligand, bound, options);
      } else {
        analysisResults = analyzeSaturationBinding(ligand, bound, options);
      }

      if (!analysisResults.success) {
        throw new Error(analysisResults.errors?.join(', ') || 'Analysis failed');
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
  }, [ligandData, boundData, ligandUnit, boundUnit, analyzeHill, compareTwoSite, parseData, onAnalysisComplete]);

  // Draw main binding curve
  useEffect(() => {
    if (!results || !mainCanvasRef.current) return;

    const canvas = mainCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const margin = { top: 40, right: 40, bottom: 60, left: 80 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const ligand = parseData(ligandData);
    const bound = parseData(boundData);

    const xMax = Math.max(...ligand) * 1.1;
    const yMax = Math.max(...bound, results.parameters.Bmax?.value || 0) * 1.1;

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
    ctx.fillText(`[Ligand] (${ligandUnit})`, margin.left + plotWidth / 2, height - 15);

    ctx.save();
    ctx.translate(20, margin.top + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`Specific Binding (${boundUnit})`, 0, 0);
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
        const x = xScale(point.L);
        const y = yScale(point.B);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Draw Bmax line
    if (results.parameters.Bmax) {
      const Bmax = results.parameters.Bmax.value;
      ctx.strokeStyle = '#FF9800';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(margin.left, yScale(Bmax));
      ctx.lineTo(margin.left + plotWidth, yScale(Bmax));
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#FF9800';
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`Bmax = ${Bmax.toFixed(1)}`, margin.left + plotWidth - 5, yScale(Bmax) - 5);
    }

    // Draw Kd indicator
    if (results.parameters.Kd) {
      const Kd = results.parameters.Kd.value;
      const halfBmax = (results.parameters.Bmax?.value || 0) / 2;

      ctx.strokeStyle = '#4CAF50';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(xScale(Kd), yScale(0));
      ctx.lineTo(xScale(Kd), yScale(halfBmax));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(margin.left, yScale(halfBmax));
      ctx.lineTo(xScale(Kd), yScale(halfBmax));
      ctx.stroke();

      ctx.setLineDash([]);

      ctx.fillStyle = '#4CAF50';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Kd = ${formatKd(Kd)}`, xScale(Kd) + 5, yScale(halfBmax) + 15);
    }

    // Draw data points
    ctx.fillStyle = '#1976D2';
    ligand.forEach((l, i) => {
      const x = xScale(l);
      const y = yScale(bound[i]);

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
    ctx.fillText('Saturation Binding Curve', width / 2, 25);

  }, [results, ligandData, boundData, ligandUnit, boundUnit, parseData]);

  // Draw Scatchard plot
  useEffect(() => {
    if (!results || !scatchardCanvasRef.current || !results.scatchard) return;

    const canvas = scatchardCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const margin = { top: 40, right: 40, bottom: 60, left: 80 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const scatchard = results.scatchard;
    const xData = scatchard.dataPoints.map(p => p.x);
    const yData = scatchard.dataPoints.map(p => p.y);

    const xMax = Math.max(...xData) * 1.2;
    const yMax = Math.max(...yData) * 1.2;

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
    ctx.fillText('Bound', margin.left + plotWidth / 2, height - 15);

    ctx.save();
    ctx.translate(20, margin.top + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Bound/Free', 0, 0);
    ctx.restore();

    // Draw fitted line
    ctx.strokeStyle = '#F44336';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const linePoints = scatchard.line.filter(p => p.x >= 0 && p.y >= 0 && p.x <= xMax && p.y <= yMax);
    if (linePoints.length >= 2) {
      linePoints.forEach((p, i) => {
        const x = xScale(p.x);
        const y = yScale(p.y);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Draw data points
    ctx.fillStyle = '#1976D2';
    scatchard.dataPoints.forEach(p => {
      const x = xScale(p.x);
      const y = yScale(p.y);

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Scatchard Plot', width / 2, 25);

    // Show Kd and Bmax from Scatchard
    ctx.font = '11px Arial';
    ctx.fillText(`Slope = -1/Kd = ${scatchard.parameters.slope.toFixed(4)}`, width / 2, height - 35);

  }, [results]);

  // Generate R code
  const generateRCode = useCallback(() => {
    if (!results) return '';

    const ligand = parseData(ligandData);
    const bound = parseData(boundData);

    return `# Binding Affinity Analysis in R
# Generated by StickForStats
# Date: ${new Date().toISOString().split('T')[0]}

library(minpack.lm)

# Data
ligand <- c(${ligand.join(', ')})
bound <- c(${bound.join(', ')})
data <- data.frame(L = ligand, B = bound)

# One-Site Binding Model
# B = Bmax * [L] / (Kd + [L])

binding_model <- function(L, Bmax, Kd) {
  Bmax * L / (Kd + L)
}

# Non-linear fit
fit <- nlsLM(
  B ~ Bmax * L / (Kd + L),
  data = data,
  start = list(Bmax = ${(results.parameters.Bmax?.value || 100).toFixed(2)},
               Kd = ${(results.parameters.Kd?.value || 10).toFixed(2)})
)

summary(fit)

# Results
Bmax <- coef(fit)["Bmax"]
Kd <- coef(fit)["Kd"]
Ka <- 1/Kd  # Association constant

cat(sprintf("Bmax = %.4f ${boundUnit}\\n", Bmax))
cat(sprintf("Kd = %.4f ${ligandUnit}\\n", Kd))
cat(sprintf("Ka = %.4e ${ligandUnit}^-1\\n", Ka))

# Plot
L_pred <- seq(0, max(ligand) * 1.2, length.out = 100)
B_pred <- predict(fit, newdata = data.frame(L = L_pred))

par(mfrow = c(1, 2))

# Saturation curve
plot(ligand, bound,
     pch = 16, col = "blue",
     xlab = "[Ligand] (${ligandUnit})",
     ylab = "Bound (${boundUnit})",
     main = "Saturation Binding")
lines(L_pred, B_pred, col = "red", lwd = 2)
abline(h = Bmax, lty = 2, col = "orange")
abline(v = Kd, lty = 2, col = "green")

# Scatchard plot
free <- ligand  # Approximation
B_over_F <- bound / free
plot(bound, B_over_F,
     pch = 16, col = "blue",
     xlab = "Bound",
     ylab = "Bound/Free",
     main = "Scatchard Plot")
abline(lm(B_over_F ~ bound), col = "red")

# References:
# Hulme, E.C. & Trevethick, M.A. (2010). Ligand binding assays. Br J Pharmacol.
# Motulsky, H.J. & Neubig, R.R. (2010). Analyzing binding data. Curr Protoc Neurosci.
`;
  }, [results, ligandData, boundData, ligandUnit, boundUnit, parseData]);

  // Generate Python code
  const generatePythonCode = useCallback(() => {
    if (!results) return '';

    const ligand = parseData(ligandData);
    const bound = parseData(boundData);

    return `# Binding Affinity Analysis in Python
# Generated by StickForStats
# Date: ${new Date().toISOString().split('T')[0]}

import numpy as np
from scipy.optimize import curve_fit
import matplotlib.pyplot as plt

# Data
ligand = np.array([${ligand.join(', ')}])
bound = np.array([${bound.join(', ')}])

# One-Site Binding Model
def binding_model(L, Bmax, Kd):
    """B = Bmax * [L] / (Kd + [L])"""
    return Bmax * L / (Kd + L)

# Fit
initial_guess = [${(results.parameters.Bmax?.value || 100).toFixed(2)}, ${(results.parameters.Kd?.value || 10).toFixed(2)}]
popt, pcov = curve_fit(binding_model, ligand, bound, p0=initial_guess)
Bmax, Kd = popt
Bmax_err, Kd_err = np.sqrt(np.diag(pcov))

print(f"Bmax = {Bmax:.4f} ± {Bmax_err:.4f} ${boundUnit}")
print(f"Kd = {Kd:.4f} ± {Kd_err:.4f} ${ligandUnit}")
print(f"Ka = {1/Kd:.4e} ${ligandUnit}^-1")

# R²
predicted = binding_model(ligand, *popt)
SS_res = np.sum((bound - predicted) ** 2)
SS_tot = np.sum((bound - np.mean(bound)) ** 2)
R2 = 1 - SS_res / SS_tot
print(f"R² = {R2:.4f}")

# Plot
fig, axes = plt.subplots(1, 2, figsize=(12, 5))

# Saturation curve
ax1 = axes[0]
L_fit = np.linspace(0, max(ligand) * 1.2, 100)
B_fit = binding_model(L_fit, *popt)

ax1.scatter(ligand, bound, c='blue', s=50, label='Data')
ax1.plot(L_fit, B_fit, 'r-', lw=2, label='Fit')
ax1.axhline(y=Bmax, color='orange', linestyle='--', label=f'Bmax = {Bmax:.1f}')
ax1.axvline(x=Kd, color='green', linestyle='--', label=f'Kd = {Kd:.2f}')
ax1.set_xlabel('[Ligand] (${ligandUnit})')
ax1.set_ylabel('Bound (${boundUnit})')
ax1.set_title('Saturation Binding Curve')
ax1.legend()

# Scatchard plot
ax2 = axes[1]
free = ligand  # Approximation
B_over_F = bound / free
ax2.scatter(bound, B_over_F, c='blue', s=50)

# Scatchard line: B/F = Bmax/Kd - B/Kd
# Slope = -1/Kd, intercept = Bmax/Kd
slope = -1/Kd
intercept = Bmax/Kd
x_line = np.array([0, Bmax])
y_line = intercept + slope * x_line
ax2.plot(x_line, y_line, 'r-', lw=2)

ax2.set_xlabel('Bound')
ax2.set_ylabel('Bound/Free')
ax2.set_title('Scatchard Plot')

plt.tight_layout()
plt.savefig('binding_analysis.png', dpi=300, bbox_inches='tight')
plt.show()
`;
  }, [results, ligandData, boundData, ligandUnit, boundUnit, parseData]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text);
  }, []);

  return (
    <Box>
      {/* Input Section */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              Binding Data
              <Tooltip title="Enter ligand concentrations and corresponding binding values">
                <InfoIcon fontSize="small" color="action" />
              </Tooltip>
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label={`[Ligand] (${ligandUnit})`}
                  value={ligandData}
                  onChange={(e) => setLigandData(e.target.value)}
                  placeholder="Enter values"
                  helperText={`${parseData(ligandData).length} values`}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label={`Bound (${boundUnit})`}
                  value={boundData}
                  onChange={(e) => setBoundData(e.target.value)}
                  placeholder="Enter values"
                  helperText={`${parseData(boundData).length} values`}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Ligand Unit</InputLabel>
                  <Select
                    value={ligandUnit}
                    onChange={(e) => setLigandUnit(e.target.value)}
                    label="Ligand Unit"
                  >
                    <MenuItem value="pM">pM</MenuItem>
                    <MenuItem value="nM">nM</MenuItem>
                    <MenuItem value="μM">μM</MenuItem>
                    <MenuItem value="mM">mM</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Binding Unit</InputLabel>
                  <Select
                    value={boundUnit}
                    onChange={(e) => setBoundUnit(e.target.value)}
                    label="Binding Unit"
                  >
                    <MenuItem value="fmol/mg">fmol/mg protein</MenuItem>
                    <MenuItem value="pmol/mg">pmol/mg protein</MenuItem>
                    <MenuItem value="%">% binding</MenuItem>
                    <MenuItem value="AU">Arbitrary units</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" size="small" onClick={() => loadSampleData('highAffinity')}>
                High Affinity Example
              </Button>
              <Button variant="outlined" size="small" onClick={() => loadSampleData('lowAffinity')}>
                Low Affinity Example
              </Button>
            </Box>

            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={<Switch checked={analyzeHill} onChange={(e) => setAnalyzeHill(e.target.checked)} size="small" />}
                label="Include Hill coefficient"
              />
              <FormControlLabel
                control={<Switch checked={compareTwoSite} onChange={(e) => setCompareTwoSite(e.target.checked)} size="small" />}
                label="Compare two-site model"
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
              {isAnalyzing ? 'Analyzing...' : 'Analyze Binding'}
            </Button>
          </Paper>
        </Grid>

        {/* Results Section */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Results</Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <AlertTitle>Error</AlertTitle>
                {error}
              </Alert>
            )}

            {results && (
              <>
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
                                {name === 'Kd' ? formatKd(param.value) : `${param.value?.toFixed(4)} ${param.unit || ''}`}
                              </TableCell>
                              <TableCell align="right">{param.error?.toFixed(4) || '-'}</TableCell>
                              <TableCell align="right">
                                {param.ci95 ? `[${param.ci95.lower?.toFixed(3)}, ${param.ci95.upper?.toFixed(3)}]` : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Derived Parameters */}
                    {results.derivedParameters?.Ka && (
                      <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="body2">
                          <strong>Ka</strong> (Association constant) = {results.derivedParameters.Ka.value.toExponential(3)} {results.derivedParameters.Ka.unit}
                        </Typography>
                      </Box>
                    )}

                    {/* Statistics */}
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        label={`R² = ${results.statistics?.R2?.toFixed(4)}`}
                        color={results.statistics?.R2 > 0.95 ? 'success' : 'warning'}
                        icon={results.statistics?.R2 > 0.95 ? <CheckCircleIcon /> : <WarningIcon />}
                      />
                      {results.parameters.Kd && (
                        <Chip
                          size="small"
                          label={classifyAffinity(results.parameters.Kd.value).description}
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>

                {/* Model Comparison */}
                {results.modelComparison && (
                  <Alert severity={results.modelComparison.preferredModel.includes('two-site') ? 'warning' : 'info'} sx={{ mb: 2 }}>
                    <AlertTitle>Model Comparison</AlertTitle>
                    <Typography variant="body2">{results.modelComparison.reason}</Typography>
                    {results.modelComparison.fTest && (
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        F-test: F = {results.modelComparison.fTest.Fstat.toFixed(2)}, p = {results.modelComparison.fTest.pValue.toExponential(2)}
                      </Typography>
                    )}
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

      {/* Visualization */}
      {results && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" gutterBottom>Visualization</Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <Typography variant="subtitle2" gutterBottom>Saturation Binding Curve</Typography>
              <canvas
                ref={mainCanvasRef}
                width={600}
                height={400}
                style={{ width: '100%', height: 'auto', border: '1px solid #e0e0e0', borderRadius: 4 }}
              />
            </Grid>

            <Grid item xs={12} md={5}>
              <Typography variant="subtitle2" gutterBottom>Scatchard Plot</Typography>
              <canvas
                ref={scatchardCanvasRef}
                width={400}
                height={350}
                style={{ width: '100%', height: 'auto', border: '1px solid #e0e0e0', borderRadius: 4 }}
              />
              <Alert severity="info" sx={{ mt: 1 }}>
                <Typography variant="caption">
                  Scatchard analysis is shown for visualization. Use non-linear regression (above) for parameter estimation.
                  Curvilinear Scatchard plots may indicate cooperativity or multiple binding sites.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Code Export */}
      {results && (
        <Accordion sx={{ mt: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CodeIcon />
              Export Code (R / Python)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Tabs value={codeTab} onChange={(e, v) => setCodeTab(v)} sx={{ mb: 2 }}>
              <Tab label="R Code" />
              <Tab label="Python Code" />
            </Tabs>

            {codeTab === 0 && (
              <Box>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => copyToClipboard(generateRCode())}>
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
                      a.download = `binding_analysis_${new Date().toISOString().split('T')[0]}.R`;
                      a.click();
                    }}
                  >
                    Download .R
                  </Button>
                </Box>
                <Paper sx={{ p: 2, bgcolor: '#1e1e1e', color: '#d4d4d4', fontFamily: 'monospace', fontSize: '0.8rem', overflow: 'auto', maxHeight: 400 }}>
                  <pre style={{ margin: 0 }}>{generateRCode()}</pre>
                </Paper>
              </Box>
            )}

            {codeTab === 1 && (
              <Box>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => copyToClipboard(generatePythonCode())}>
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
                      a.download = `binding_analysis_${new Date().toISOString().split('T')[0]}.py`;
                      a.click();
                    }}
                  >
                    Download .py
                  </Button>
                </Box>
                <Paper sx={{ p: 2, bgcolor: '#1e1e1e', color: '#d4d4d4', fontFamily: 'monospace', fontSize: '0.8rem', overflow: 'auto', maxHeight: 400 }}>
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

export default BindingAffinityAnalysis;
