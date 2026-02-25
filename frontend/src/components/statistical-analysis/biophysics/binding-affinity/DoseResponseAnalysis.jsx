/**
 * DoseResponseAnalysis - IC50/EC50 Curve Fitting
 *
 * Features:
 * - 4-parameter logistic (4PL) model fitting
 * - IC50, EC50, IC90, EC10, etc. calculations
 * - Hill slope analysis
 * - Variable vs fixed slope options
 * - Ki calculation with Cheng-Prusoff
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
import CalculateIcon from '@mui/icons-material/Calculate';

// Utilities
import { analyzeDoseResponse } from '../../../../utils/biophysics/bindingUtils';
import { calculateKiFromIC50 } from '../../../../utils/biophysics/enzymeKineticsUtils';

// ============================================================================
// CONSTANTS
// ============================================================================

const SAMPLE_DATA = {
  inhibition: {
    concentration: [0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1, 3, 10, 30, 100],
    response: [98, 95, 91, 78, 55, 32, 18, 8, 4, 2, 1]
  },
  stimulation: {
    concentration: [0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1, 3, 10, 30, 100],
    response: [2, 5, 12, 28, 52, 75, 88, 95, 98, 99, 100]
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DoseResponseAnalysis = ({ data, onAnalysisComplete }) => {
  // State
  const [concentrationData, setConcentrationData] = useState('');
  const [responseData, setResponseData] = useState('');
  const [concentrationUnit, setConcentrationUnit] = useState('μM');
  const [responseUnit, setResponseUnit] = useState('%');
  const [responseType, setResponseType] = useState('inhibition');
  const [results, setResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [codeTab, setCodeTab] = useState(0);

  // Ki calculation
  const [showKiCalc, setShowKiCalc] = useState(false);
  const [radioligandConc, setRadioligandConc] = useState('');
  const [radioligandKd, setRadioligandKd] = useState('');
  const [calculatedKi, setCalculatedKi] = useState(null);

  const canvasRef = useRef(null);

  // Parse data from textarea
  const parseData = useCallback((dataString) => {
    if (!dataString.trim()) return [];
    return dataString
      .split(/[\n,\s]+/)
      .map(v => parseFloat(v.trim()))
      .filter(v => !isNaN(v) && v > 0);
  }, []);

  // Load sample data
  const loadSampleData = useCallback((type) => {
    const sampleData = SAMPLE_DATA[type];
    setConcentrationData(sampleData.concentration.join('\n'));
    setResponseData(sampleData.response.join('\n'));
    setResponseType(type);
  }, []);

  // Run analysis
  const runAnalysis = useCallback(() => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const concentration = parseData(concentrationData);
      const response = parseData(responseData);

      if (concentration.length === 0 || response.length === 0) {
        throw new Error('Please enter concentration and response data');
      }

      if (concentration.length !== response.length) {
        throw new Error(`Data length mismatch: ${concentration.length} concentrations vs ${response.length} responses`);
      }

      const options = {
        concentrationUnit,
        responseUnit
      };

      const analysisResults = analyzeDoseResponse(concentration, response, options);

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
  }, [concentrationData, responseData, concentrationUnit, responseUnit, parseData, onAnalysisComplete]);

  // Calculate Ki
  const calculateKi = useCallback(() => {
    if (!results?.parameters?.IC50?.value || !radioligandConc || !radioligandKd) {
      return;
    }

    const IC50 = results.parameters.IC50.value;
    const L = parseFloat(radioligandConc);
    const Kd = parseFloat(radioligandKd);

    const Ki = calculateKiFromIC50(IC50, L, Kd);
    setCalculatedKi({
      value: Ki,
      formula: `Ki = IC50 / (1 + [L]/Kd) = ${IC50.toFixed(3)} / (1 + ${L}/${Kd}) = ${Ki.toFixed(4)} ${concentrationUnit}`
    });
  }, [results, radioligandConc, radioligandKd, concentrationUnit]);

  // Draw plot
  useEffect(() => {
    if (!results || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const margin = { top: 40, right: 60, bottom: 60, left: 80 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const concentration = parseData(concentrationData);
    const response = parseData(responseData);
    const logConc = concentration.map(c => Math.log10(c));

    const xMin = Math.min(...logConc) - 0.5;
    const xMax = Math.max(...logConc) + 0.5;
    const yMin = Math.min(0, ...response);
    const yMax = Math.max(100, ...response) * 1.1;

    const xScale = (logX) => margin.left + ((logX - xMin) / (xMax - xMin)) * plotWidth;
    const yScale = (y) => margin.top + plotHeight - ((y - yMin) / (yMax - yMin)) * plotHeight;

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    // Vertical grid lines at log intervals
    for (let logX = Math.ceil(xMin); logX <= Math.floor(xMax); logX++) {
      const x = xScale(logX);
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + plotHeight);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = margin.top + (i / 5) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + plotWidth, y);
      ctx.stroke();
    }

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
    ctx.fillText(`[Drug] (${concentrationUnit})`, margin.left + plotWidth / 2, height - 15);

    ctx.save();
    ctx.translate(20, margin.top + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`Response (${responseUnit})`, 0, 0);
    ctx.restore();

    // X-axis tick labels (log scale)
    ctx.font = '11px Arial';
    for (let logX = Math.ceil(xMin); logX <= Math.floor(xMax); logX++) {
      const x = xScale(logX);
      const conc = Math.pow(10, logX);
      let label;
      if (conc >= 1) {
        label = conc.toFixed(0);
      } else if (conc >= 0.01) {
        label = conc.toFixed(2);
      } else {
        label = conc.toExponential(0);
      }
      ctx.fillText(label, x, margin.top + plotHeight + 20);
    }

    // Y-axis tick labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const y = margin.top + (i / 5) * plotHeight;
      const value = yMax - (i / 5) * (yMax - yMin);
      ctx.fillText(value.toFixed(0), margin.left - 10, y + 4);
    }

    // Draw fitted curve
    if (results.curveData) {
      ctx.strokeStyle = '#9C27B0';
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      results.curveData.forEach((point, i) => {
        const x = xScale(point.logConcentration);
        const y = yScale(point.response);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Draw IC50 line
    if (results.parameters.IC50) {
      const LogIC50 = results.parameters.IC50.logValue;
      const IC50Response = (results.parameters.Top.value + results.parameters.Bottom.value) / 2;

      ctx.strokeStyle = '#FF5722';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.5;

      // Vertical line at IC50
      ctx.beginPath();
      ctx.moveTo(xScale(LogIC50), yScale(yMin));
      ctx.lineTo(xScale(LogIC50), yScale(IC50Response));
      ctx.stroke();

      // Horizontal line to y-axis
      ctx.beginPath();
      ctx.moveTo(margin.left, yScale(IC50Response));
      ctx.lineTo(xScale(LogIC50), yScale(IC50Response));
      ctx.stroke();

      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = '#FF5722';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'left';
      const labelText = results.type === 'Inhibition' ? 'IC50' : 'EC50';
      ctx.fillText(`${labelText} = ${results.parameters.IC50.value.toExponential(2)}`, xScale(LogIC50) + 5, yScale(IC50Response) - 10);
    }

    // Draw Top and Bottom lines
    if (results.parameters.Top && results.parameters.Bottom) {
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;

      // Top
      ctx.strokeStyle = '#4CAF50';
      ctx.beginPath();
      ctx.moveTo(margin.left, yScale(results.parameters.Top.value));
      ctx.lineTo(margin.left + plotWidth, yScale(results.parameters.Top.value));
      ctx.stroke();

      // Bottom
      ctx.strokeStyle = '#F44336';
      ctx.beginPath();
      ctx.moveTo(margin.left, yScale(results.parameters.Bottom.value));
      ctx.lineTo(margin.left + plotWidth, yScale(results.parameters.Bottom.value));
      ctx.stroke();

      ctx.setLineDash([]);
    }

    // Draw data points
    ctx.fillStyle = '#673AB7';
    logConc.forEach((logX, i) => {
      const x = xScale(logX);
      const y = yScale(response[i]);

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
    const title = results.type === 'Inhibition' ? 'Inhibition Curve' : 'Stimulation Curve';
    ctx.fillText(title, width / 2, 25);

    // Legend
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    const legendX = margin.left + plotWidth - 100;
    const legendY = margin.top + 20;

    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(legendX, legendY, 12, 3);
    ctx.fillStyle = '#333';
    ctx.fillText('Top', legendX + 16, legendY + 4);

    ctx.fillStyle = '#F44336';
    ctx.fillRect(legendX, legendY + 12, 12, 3);
    ctx.fillStyle = '#333';
    ctx.fillText('Bottom', legendX + 16, legendY + 16);

  }, [results, concentrationData, responseData, concentrationUnit, responseUnit, parseData]);

  // Generate R code
  const generateRCode = useCallback(() => {
    if (!results) return '';

    const concentration = parseData(concentrationData);
    const response = parseData(responseData);
    const paramName = results.type === 'Inhibition' ? 'IC50' : 'EC50';

    return `# Dose-Response Analysis in R
# Generated by StickForStats
# Date: ${new Date().toISOString().split('T')[0]}

# Install if needed
# install.packages("drc")  # For dose-response curves

library(drc)

# Data
concentration <- c(${concentration.join(', ')})
response <- c(${response.join(', ')})
data <- data.frame(conc = concentration, resp = response)

# Four-Parameter Logistic Model (4PL)
# y = Bottom + (Top - Bottom) / (1 + 10^((log${paramName} - log(x)) * HillSlope))

fit <- drm(resp ~ conc, data = data, fct = LL.4())

summary(fit)

# Extract parameters
params <- coef(fit)
cat("\\nParameter Estimates:\\n")
cat(sprintf("Top (Max response): %.2f\\n", params[3]))
cat(sprintf("Bottom (Min response): %.2f\\n", params[2]))
cat(sprintf("${paramName}: %.4f ${concentrationUnit}\\n", params[4]))
cat(sprintf("Hill Slope: %.4f\\n", params[1]))

# Calculate ${paramName}, IC10, IC90, etc.
ED(fit, c(10, 50, 90), interval = "delta")

# R-squared
pred <- predict(fit)
SS_res <- sum((response - pred)^2)
SS_tot <- sum((response - mean(response))^2)
R2 <- 1 - SS_res / SS_tot
cat(sprintf("R² = %.4f\\n", R2))

# Plot
plot(fit,
     xlab = "Concentration (${concentrationUnit})",
     ylab = "Response (${responseUnit})",
     main = "${results.type} Curve",
     log = "x",
     type = "all",
     col = "blue",
     pch = 16)

# Add ${paramName} line
abline(v = params[4], lty = 2, col = "red")
abline(h = (params[2] + params[3]) / 2, lty = 2, col = "red")

# Cheng-Prusoff Ki calculation (if competition binding)
# Ki = ${paramName} / (1 + [L]/Kd)
# Uncomment and fill in values:
# radioligand_conc <- 1  # nM
# radioligand_Kd <- 0.5  # nM
# Ki <- params[4] / (1 + radioligand_conc / radioligand_Kd)
# cat(sprintf("Ki = %.4f ${concentrationUnit}\\n", Ki))

# References:
# Cheng, Y. & Prusoff, W.H. (1973). Biochem Pharmacol.
# Motulsky, H. & Christopoulos, A. (2004). Fitting Models to Biological Data. Oxford.
`;
  }, [results, concentrationData, responseData, concentrationUnit, responseUnit, parseData]);

  // Generate Python code
  const generatePythonCode = useCallback(() => {
    if (!results) return '';

    const concentration = parseData(concentrationData);
    const response = parseData(responseData);
    const paramName = results.type === 'Inhibition' ? 'IC50' : 'EC50';

    return `# Dose-Response Analysis in Python
# Generated by StickForStats
# Date: ${new Date().toISOString().split('T')[0]}

import numpy as np
from scipy.optimize import curve_fit
import matplotlib.pyplot as plt

# Data
concentration = np.array([${concentration.join(', ')}])
response = np.array([${response.join(', ')}])

# Four-Parameter Logistic Model (4PL)
def four_pl(x, Bottom, Top, Log${paramName}, HillSlope):
    """
    4PL: y = Bottom + (Top - Bottom) / (1 + 10^((Log${paramName} - log10(x)) * HillSlope))
    """
    return Bottom + (Top - Bottom) / (1 + np.power(10, (Log${paramName} - np.log10(x)) * HillSlope))

# Fit
initial_guess = [
    ${results.parameters.Bottom.value.toFixed(2)},  # Bottom
    ${results.parameters.Top.value.toFixed(2)},     # Top
    ${results.parameters.IC50.logValue.toFixed(3)}, # Log${paramName}
    ${results.parameters.HillSlope.value.toFixed(2)}  # HillSlope
]

try:
    popt, pcov = curve_fit(
        four_pl, concentration, response,
        p0=initial_guess,
        bounds=([-np.inf, -np.inf, -np.inf, -np.inf],
                [np.inf, np.inf, np.inf, np.inf]),
        maxfev=5000
    )
    perr = np.sqrt(np.diag(pcov))

    Bottom, Top, Log${paramName}, HillSlope = popt
    ${paramName} = 10 ** Log${paramName}

    print("=== Dose-Response Analysis ===")
    print(f"Bottom: {Bottom:.2f} ± {perr[0]:.2f}")
    print(f"Top: {Top:.2f} ± {perr[1]:.2f}")
    print(f"${paramName}: {${paramName}:.4f} ${concentrationUnit} (Log = {Log${paramName}:.3f})")
    print(f"Hill Slope: {HillSlope:.4f} ± {perr[3]:.4f}")

    # R²
    predicted = four_pl(concentration, *popt)
    SS_res = np.sum((response - predicted) ** 2)
    SS_tot = np.sum((response - np.mean(response)) ** 2)
    R2 = 1 - SS_res / SS_tot
    print(f"R² = {R2:.4f}")

    # Calculate other effect levels
    def calc_ec(level, Bottom, Top, Log${paramName}, HillSlope):
        """Calculate concentration for given effect level"""
        fraction = level / 100
        if Top > Bottom:  # Inhibition
            fraction = 1 - fraction
        return 10 ** (Log${paramName} - np.log10((1 - fraction) / fraction) / HillSlope)

    print(f"\\n${paramName.replace('50', '10')}: {calc_ec(10, *popt):.4f} ${concentrationUnit}")
    print(f"${paramName}: {calc_ec(50, *popt):.4f} ${concentrationUnit}")
    print(f"${paramName.replace('50', '90')}: {calc_ec(90, *popt):.4f} ${concentrationUnit}")

except Exception as e:
    print(f"Fitting error: {e}")

# Plot
fig, ax = plt.subplots(figsize=(8, 6))

# Data points
ax.semilogx(concentration, response, 'o', markersize=8, color='#673AB7', label='Data')

# Fitted curve
x_fit = np.logspace(np.log10(min(concentration)) - 0.5, np.log10(max(concentration)) + 0.5, 200)
y_fit = four_pl(x_fit, *popt)
ax.semilogx(x_fit, y_fit, '-', linewidth=2, color='#9C27B0', label='4PL Fit')

# ${paramName} lines
ax.axvline(x=${paramName}, color='#FF5722', linestyle='--', alpha=0.7, label=f'${paramName} = {${paramName}:.4f}')
ax.axhline(y=(Top + Bottom) / 2, color='#FF5722', linestyle='--', alpha=0.7)

# Top and Bottom lines
ax.axhline(y=Top, color='#4CAF50', linestyle=':', alpha=0.5, label=f'Top = {Top:.1f}')
ax.axhline(y=Bottom, color='#F44336', linestyle=':', alpha=0.5, label=f'Bottom = {Bottom:.1f}')

ax.set_xlabel('Concentration (${concentrationUnit})')
ax.set_ylabel('Response (${responseUnit})')
ax.set_title('${results.type} Curve (4-Parameter Logistic)')
ax.legend(loc='best')
ax.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('dose_response.png', dpi=300, bbox_inches='tight')
plt.show()

# Cheng-Prusoff Ki calculation (for competition binding)
# Uncomment and fill in your values:
# radioligand_conc = 1.0  # ${concentrationUnit}
# radioligand_Kd = 0.5    # ${concentrationUnit}
# Ki = ${paramName} / (1 + radioligand_conc / radioligand_Kd)
# print(f"\\nKi (Cheng-Prusoff) = {Ki:.4f} ${concentrationUnit}")
`;
  }, [results, concentrationData, responseData, concentrationUnit, responseUnit, parseData]);

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
              Dose-Response Data
              <Tooltip title="Enter drug concentrations (positive values) and responses">
                <InfoIcon fontSize="small" color="action" />
              </Tooltip>
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label={`Concentration (${concentrationUnit})`}
                  value={concentrationData}
                  onChange={(e) => setConcentrationData(e.target.value)}
                  placeholder="Enter positive values"
                  helperText={`${parseData(concentrationData).length} values`}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label={`Response (${responseUnit})`}
                  value={responseData}
                  onChange={(e) => setResponseData(e.target.value)}
                  placeholder="Enter response values"
                  helperText={`${parseData(responseData).length} values`}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Concentration Unit</InputLabel>
                  <Select
                    value={concentrationUnit}
                    onChange={(e) => setConcentrationUnit(e.target.value)}
                    label="Concentration Unit"
                  >
                    <MenuItem value="pM">pM</MenuItem>
                    <MenuItem value="nM">nM</MenuItem>
                    <MenuItem value="μM">μM</MenuItem>
                    <MenuItem value="mM">mM</MenuItem>
                    <MenuItem value="μg/mL">μg/mL</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Response Unit</InputLabel>
                  <Select
                    value={responseUnit}
                    onChange={(e) => setResponseUnit(e.target.value)}
                    label="Response Unit"
                  >
                    <MenuItem value="%">% of control</MenuItem>
                    <MenuItem value="% viability">% viability</MenuItem>
                    <MenuItem value="% activity">% activity</MenuItem>
                    <MenuItem value="AU">Arbitrary units</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" size="small" onClick={() => loadSampleData('inhibition')}>
                Inhibition Example
              </Button>
              <Button variant="outlined" size="small" onClick={() => loadSampleData('stimulation')}>
                Stimulation Example
              </Button>
            </Box>

            <Button
              variant="contained"
              fullWidth
              startIcon={isAnalyzing ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
              onClick={runAnalysis}
              disabled={isAnalyzing}
              sx={{ mt: 2 }}
            >
              {isAnalyzing ? 'Analyzing...' : 'Fit Dose-Response Curve'}
            </Button>
          </Paper>

          {/* Ki Calculator */}
          {results && (
            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalculateIcon />
                  Cheng-Prusoff Ki Calculator
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="caption">
                    For competition binding assays, calculate Ki from IC50 using:<br />
                    <strong>Ki = IC50 / (1 + [L]/Kd)</strong>
                  </Typography>
                </Alert>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label={`Radioligand Conc (${concentrationUnit})`}
                      value={radioligandConc}
                      onChange={(e) => setRadioligandConc(e.target.value)}
                      type="number"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label={`Radioligand Kd (${concentrationUnit})`}
                      value={radioligandKd}
                      onChange={(e) => setRadioligandKd(e.target.value)}
                      type="number"
                    />
                  </Grid>
                </Grid>

                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={calculateKi}
                  disabled={!radioligandConc || !radioligandKd}
                >
                  Calculate Ki
                </Button>

                {calculatedKi && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Ki = {calculatedKi.value.toFixed(4)} {concentrationUnit}</strong>
                    </Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {calculatedKi.formula}
                    </Typography>
                  </Alert>
                )}
              </AccordionDetails>
            </Accordion>
          )}
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
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" color="primary">
                        {results.model}
                      </Typography>
                      <Chip
                        label={results.type}
                        size="small"
                        color={results.type === 'Inhibition' ? 'error' : 'success'}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mb: 2 }}>
                      {results.equation}
                    </Typography>

                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Parameter</TableCell>
                            <TableCell align="right">Value</TableCell>
                            <TableCell align="right">Std Error</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow sx={{ bgcolor: 'primary.50' }}>
                            <TableCell>
                              <strong>{results.type === 'Inhibition' ? 'IC50' : 'EC50'}</strong>
                              <Typography variant="caption" display="block" color="text.secondary">
                                {results.parameters.IC50.description}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <strong>{results.parameters.IC50.value.toExponential(3)} {concentrationUnit}</strong>
                            </TableCell>
                            <TableCell align="right">
                              {results.parameters.IC50.error?.toExponential(2) || '-'}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>
                              Hill Slope
                              <Typography variant="caption" display="block" color="text.secondary">
                                Steepness of curve
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{results.parameters.HillSlope.value.toFixed(4)}</TableCell>
                            <TableCell align="right">{results.parameters.HillSlope.error?.toFixed(4) || '-'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Top</TableCell>
                            <TableCell align="right">{results.parameters.Top.value.toFixed(2)} {responseUnit}</TableCell>
                            <TableCell align="right">{results.parameters.Top.error?.toFixed(2) || '-'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Bottom</TableCell>
                            <TableCell align="right">{results.parameters.Bottom.value.toFixed(2)} {responseUnit}</TableCell>
                            <TableCell align="right">{results.parameters.Bottom.error?.toFixed(2) || '-'}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Effect Levels */}
                    {results.effectLevels && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Effect Concentrations</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {Object.entries(results.effectLevels).map(([name, data]) => (
                            <Chip
                              key={name}
                              label={`${name}: ${data.value.toExponential(2)}`}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
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
                      <Chip
                        size="small"
                        label={`AIC = ${results.statistics?.AIC?.toFixed(1)}`}
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                </Card>

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
          <Typography variant="h6" gutterBottom>Dose-Response Curve</Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <canvas
              ref={canvasRef}
              width={700}
              height={450}
              style={{ maxWidth: '100%', height: 'auto', border: '1px solid #e0e0e0', borderRadius: 4 }}
            />
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="caption">
              The curve is fitted using the 4-parameter logistic (4PL) model with Levenberg-Marquardt optimization.
              X-axis is shown on a logarithmic scale.
            </Typography>
          </Alert>
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
                      a.download = `dose_response_${new Date().toISOString().split('T')[0]}.R`;
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
                      a.download = `dose_response_${new Date().toISOString().split('T')[0]}.py`;
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

export default DoseResponseAnalysis;
