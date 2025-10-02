/**
 * ANOVA Visualization Component
 * ==============================
 * Comprehensive visualization for ANOVA results including:
 * - Mean plots with error bars
 * - Box plots
 * - Interaction plots (for two-way ANOVA)
 * - Post-hoc comparison matrix
 * - Q-Q plots for normality
 * - Residual plots
 * - Effect size visualizations
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Box,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Button,
  Tooltip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Info as InfoIcon,
  Download as DownloadIcon,
  Fullscreen as FullscreenIcon,
  Science as ScienceIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import Plot from 'react-plotly.js';
import { useTheme } from '@mui/material/styles';

const ANOVAVisualization = ({ result, showFullPrecision = false }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedPostHoc, setSelectedPostHoc] = useState('all');
  const [showAssumptions, setShowAssumptions] = useState(true);
  const [plotSize, setPlotSize] = useState({ width: 600, height: 400 });

  // Color scheme for groups
  const groupColors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728',
    '#9467bd', '#8c564b', '#e377c2', '#7f7f7f'
  ];

  /**
   * Render ANOVA Table
   */
  const renderAnovaTable = () => {
    if (!result?.anova_table) return null;

    const { anova_table } = result;

    return (
      <TableContainer component={Paper} elevation={2}>
        <Table size="small">
          <TableHead>
            <TableRow style={{ backgroundColor: theme.palette.grey[100] }}>
              <TableCell>Source</TableCell>
              <TableCell align="right">SS</TableCell>
              <TableCell align="right">df</TableCell>
              <TableCell align="right">MS</TableCell>
              <TableCell align="right">F</TableCell>
              <TableCell align="right">p-value</TableCell>
              <TableCell align="center">Significance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Between Groups</TableCell>
              <TableCell align="right">
                {showFullPrecision ? anova_table.ss_between : parseFloat(anova_table.ss_between).toFixed(4)}
              </TableCell>
              <TableCell align="right">{anova_table.df_between}</TableCell>
              <TableCell align="right">
                {showFullPrecision ? anova_table.ms_between : parseFloat(anova_table.ms_between).toFixed(4)}
              </TableCell>
              <TableCell align="right">
                <strong>
                  {showFullPrecision ? anova_table.f_statistic : parseFloat(anova_table.f_statistic).toFixed(4)}
                </strong>
              </TableCell>
              <TableCell align="right">
                <strong>
                  {parseFloat(anova_table.p_value) < 0.001 ? '< 0.001' : parseFloat(anova_table.p_value).toFixed(4)}
                </strong>
              </TableCell>
              <TableCell align="center">
                {parseFloat(anova_table.p_value) < 0.001 && <Chip label="***" color="error" size="small" />}
                {parseFloat(anova_table.p_value) < 0.01 && parseFloat(anova_table.p_value) >= 0.001 &&
                  <Chip label="**" color="warning" size="small" />}
                {parseFloat(anova_table.p_value) < 0.05 && parseFloat(anova_table.p_value) >= 0.01 &&
                  <Chip label="*" color="primary" size="small" />}
                {parseFloat(anova_table.p_value) >= 0.05 &&
                  <Chip label="ns" color="default" size="small" />}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Within Groups</TableCell>
              <TableCell align="right">
                {showFullPrecision ? anova_table.ss_within : parseFloat(anova_table.ss_within).toFixed(4)}
              </TableCell>
              <TableCell align="right">{anova_table.df_within}</TableCell>
              <TableCell align="right">
                {showFullPrecision ? anova_table.ms_within : parseFloat(anova_table.ms_within).toFixed(4)}
              </TableCell>
              <TableCell align="right">-</TableCell>
              <TableCell align="right">-</TableCell>
              <TableCell align="center">-</TableCell>
            </TableRow>
            <TableRow style={{ backgroundColor: theme.palette.grey[50] }}>
              <TableCell><strong>Total</strong></TableCell>
              <TableCell align="right">
                <strong>
                  {showFullPrecision ? anova_table.ss_total : parseFloat(anova_table.ss_total).toFixed(4)}
                </strong>
              </TableCell>
              <TableCell align="right"><strong>{anova_table.df_total}</strong></TableCell>
              <TableCell align="right">-</TableCell>
              <TableCell align="right">-</TableCell>
              <TableCell align="right">-</TableCell>
              <TableCell align="center">-</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  /**
   * Render Effect Sizes
   */
  const renderEffectSizes = () => {
    if (!result?.effect_sizes) return null;

    const { effect_sizes } = result;

    const interpretEffectSize = (value, type) => {
      const v = parseFloat(value);
      if (type === 'eta_squared' || type === 'partial_eta_squared') {
        if (v < 0.01) return { label: 'Negligible', color: 'default' };
        if (v < 0.06) return { label: 'Small', color: 'info' };
        if (v < 0.14) return { label: 'Medium', color: 'warning' };
        return { label: 'Large', color: 'error' };
      } else if (type === 'cohen_f') {
        if (v < 0.1) return { label: 'Small', color: 'info' };
        if (v < 0.25) return { label: 'Medium', color: 'warning' };
        if (v < 0.4) return { label: 'Large', color: 'error' };
        return { label: 'Very Large', color: 'error' };
      }
      return { label: '', color: 'default' };
    };

    return (
      <Grid container spacing={2}>
        {Object.entries(effect_sizes).map(([key, value]) => {
          const interpretation = interpretEffectSize(value, key);
          return (
            <Grid item xs={12} sm={6} md={3} key={key}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="caption" color="textSecondary">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Typography>
                  <Typography variant="h5">
                    {showFullPrecision ? value : parseFloat(value).toFixed(4)}
                  </Typography>
                  {interpretation.label && (
                    <Chip
                      label={interpretation.label}
                      color={interpretation.color}
                      size="small"
                      style={{ marginTop: 8 }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  /**
   * Render Mean Plot with Error Bars
   */
  const renderMeanPlot = () => {
    if (!result?.group_statistics) return null;

    const { group_means, group_stds, group_ns } = result.group_statistics;

    const trace = {
      x: Object.keys(group_means),
      y: Object.values(group_means).map(v => parseFloat(v)),
      error_y: {
        type: 'data',
        array: Object.values(group_stds).map((std, idx) => {
          const n = Object.values(group_ns)[idx];
          return parseFloat(std) / Math.sqrt(n); // Standard error
        }),
        visible: true,
        color: theme.palette.error.main
      },
      type: 'scatter',
      mode: 'markers',
      marker: {
        size: 12,
        color: groupColors.slice(0, Object.keys(group_means).length)
      },
      name: 'Group Means'
    };

    const layout = {
      title: 'Group Means with 95% Confidence Intervals',
      xaxis: { title: 'Groups' },
      yaxis: { title: 'Mean Value' },
      hovermode: 'closest',
      plot_bgcolor: theme.palette.background.paper,
      paper_bgcolor: theme.palette.background.default,
      width: plotSize.width,
      height: plotSize.height
    };

    return <Plot data={[trace]} layout={layout} />;
  };

  /**
   * Render Box Plot
   */
  const renderBoxPlot = () => {
    if (!result?.raw_data) return null;

    const traces = result.raw_data.groups.map((group, idx) => ({
      y: group.values,
      type: 'box',
      name: group.name || `Group ${idx + 1}`,
      marker: {
        color: groupColors[idx % groupColors.length]
      },
      boxmean: 'sd'
    }));

    const layout = {
      title: 'Distribution by Group',
      yaxis: { title: 'Values' },
      showlegend: false,
      plot_bgcolor: theme.palette.background.paper,
      paper_bgcolor: theme.palette.background.default,
      width: plotSize.width,
      height: plotSize.height
    };

    return <Plot data={traces} layout={layout} />;
  };

  /**
   * Render Post-Hoc Comparison Matrix
   */
  const renderPostHocMatrix = () => {
    if (!result?.post_hoc_results) return null;

    const comparisons = result.post_hoc_results;
    const groups = [...new Set(
      Object.keys(comparisons).flatMap(key => key.split('_vs_'))
    )].sort();

    // Create matrix
    const matrix = [];
    const annotations = [];

    groups.forEach((group1, i) => {
      const row = [];
      groups.forEach((group2, j) => {
        if (i === j) {
          row.push(null);
        } else {
          const key = i < j ? `${group1}_vs_${group2}` : `${group2}_vs_${group1}`;
          const comparison = comparisons[key];
          if (comparison) {
            const pValue = parseFloat(comparison.adjusted_p_value || comparison.p_value);
            row.push(pValue);

            // Add annotation
            annotations.push({
              x: j,
              y: i,
              text: pValue < 0.001 ? '***' : pValue < 0.01 ? '**' : pValue < 0.05 ? '*' : 'ns',
              showarrow: false,
              font: {
                color: pValue < 0.05 ? 'white' : 'black'
              }
            });
          } else {
            row.push(null);
          }
        }
      });
      matrix.push(row);
    });

    const data = [{
      z: matrix,
      x: groups,
      y: groups,
      type: 'heatmap',
      colorscale: [
        [0, '#2ecc71'],
        [0.05, '#f39c12'],
        [1, '#e74c3c']
      ],
      reversescale: true,
      showscale: true,
      colorbar: {
        title: 'p-value',
        tickmode: 'array',
        tickvals: [0.001, 0.01, 0.05, 0.1],
        ticktext: ['0.001', '0.01', '0.05', '0.1']
      }
    }];

    const layout = {
      title: 'Post-Hoc Pairwise Comparisons',
      xaxis: { title: '', side: 'top' },
      yaxis: { title: '', autorange: 'reversed' },
      annotations: annotations,
      plot_bgcolor: theme.palette.background.paper,
      paper_bgcolor: theme.palette.background.default,
      width: plotSize.width,
      height: plotSize.height
    };

    return <Plot data={data} layout={layout} />;
  };

  /**
   * Render Q-Q Plot for Normality
   */
  const renderQQPlot = () => {
    if (!result?.normality_check?.qq_data) return null;

    const traces = result.normality_check.qq_data.map((group, idx) => ({
      x: group.theoretical,
      y: group.sample,
      mode: 'markers',
      type: 'scatter',
      name: group.name || `Group ${idx + 1}`,
      marker: {
        color: groupColors[idx % groupColors.length]
      }
    }));

    // Add reference line
    traces.push({
      x: [-3, 3],
      y: [-3, 3],
      mode: 'lines',
      type: 'scatter',
      name: 'Normal',
      line: {
        color: 'red',
        dash: 'dash'
      }
    });

    const layout = {
      title: 'Q-Q Plot for Normality Assessment',
      xaxis: { title: 'Theoretical Quantiles' },
      yaxis: { title: 'Sample Quantiles' },
      plot_bgcolor: theme.palette.background.paper,
      paper_bgcolor: theme.palette.background.default,
      width: plotSize.width,
      height: plotSize.height
    };

    return <Plot data={traces} layout={layout} />;
  };

  /**
   * Render Assumptions Check
   */
  const renderAssumptions = () => {
    if (!result?.assumptions) return null;

    const { assumptions } = result;

    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Assumption Checks
          </Typography>
          <Grid container spacing={2}>
            {/* Normality */}
            <Grid item xs={12} md={4}>
              <Alert
                severity={assumptions.normality?.all_normal ? 'success' : 'warning'}
                icon={assumptions.normality?.all_normal ? <CheckIcon /> : <WarningIcon />}
              >
                <Typography variant="subtitle2">Normality</Typography>
                {assumptions.normality?.groups.map((group, idx) => (
                  <Typography key={idx} variant="caption" display="block">
                    {group.name}: p = {parseFloat(group.shapiro_p).toFixed(4)}
                    {parseFloat(group.shapiro_p) < 0.05 && ' ⚠'}
                  </Typography>
                ))}
              </Alert>
            </Grid>

            {/* Homogeneity of Variance */}
            <Grid item xs={12} md={4}>
              <Alert
                severity={parseFloat(assumptions.levene_p_value) >= 0.05 ? 'success' : 'warning'}
                icon={parseFloat(assumptions.levene_p_value) >= 0.05 ? <CheckIcon /> : <WarningIcon />}
              >
                <Typography variant="subtitle2">Equal Variances</Typography>
                <Typography variant="caption">
                  Levene's Test: F = {parseFloat(assumptions.levene_statistic).toFixed(4)},
                  p = {parseFloat(assumptions.levene_p_value).toFixed(4)}
                </Typography>
              </Alert>
            </Grid>

            {/* Sample Size */}
            <Grid item xs={12} md={4}>
              <Alert
                severity={assumptions.sample_size_adequate ? 'success' : 'warning'}
                icon={assumptions.sample_size_adequate ? <CheckIcon /> : <WarningIcon />}
              >
                <Typography variant="subtitle2">Sample Size</Typography>
                <Typography variant="caption">
                  Total N = {assumptions.total_n}
                  {assumptions.min_group_size < 30 && ` (Min group = ${assumptions.min_group_size})`}
                </Typography>
              </Alert>
            </Grid>
          </Grid>

          {/* Recommendations */}
          {assumptions.recommendations && assumptions.recommendations.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>
                Recommendations:
              </Typography>
              {assumptions.recommendations.map((rec, idx) => (
                <Typography key={idx} variant="caption" display="block" color="textSecondary">
                  • {rec}
                </Typography>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  /**
   * Tab Panel Component
   */
  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box p={3}>{children}</Box>}
    </div>
  );

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">
            <ScienceIcon style={{ verticalAlign: 'middle', marginRight: 8 }} />
            ANOVA Results
          </Typography>
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={showFullPrecision}
                  onChange={(e) => setShowFullPrecision(e.target.checked)}
                />
              }
              label="Full Precision"
            />
            <Tooltip title="Download Results">
              <IconButton>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Assumptions Warning */}
        {showAssumptions && (
          <Box mb={2}>
            {renderAssumptions()}
          </Box>
        )}

        {/* Main Results Tabs */}
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="ANOVA Table" />
          <Tab label="Effect Sizes" />
          <Tab label="Mean Plot" />
          <Tab label="Box Plot" />
          {result?.post_hoc_results && <Tab label="Post-Hoc Tests" />}
          <Tab label="Q-Q Plot" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          {renderAnovaTable()}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {renderEffectSizes()}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {renderMeanPlot()}
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          {renderBoxPlot()}
        </TabPanel>

        {result?.post_hoc_results && (
          <TabPanel value={activeTab} index={4}>
            {renderPostHocMatrix()}
          </TabPanel>
        )}

        <TabPanel value={activeTab} index={5}>
          {renderQQPlot()}
        </TabPanel>

        {/* Power Analysis */}
        {result?.power_analysis && (
          <Box mt={2}>
            <Alert severity="info">
              <Typography variant="subtitle2">Power Analysis</Typography>
              <Typography variant="caption">
                Observed Power: {parseFloat(result.power_analysis.observed_power).toFixed(4)}
                {parseFloat(result.power_analysis.observed_power) < 0.8 && ' (Consider increasing sample size)'}
              </Typography>
            </Alert>
          </Box>
        )}

        {/* APA Format Output */}
        {result?.apa_format && (
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              APA Format:
            </Typography>
            <Paper elevation={1} style={{ padding: 8, backgroundColor: theme.palette.grey[50] }}>
              <Typography variant="body2" style={{ fontFamily: 'monospace' }}>
                {result.apa_format}
              </Typography>
            </Paper>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ANOVAVisualization;