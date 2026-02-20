/**
 * ChartSpecificPanel - Dynamic chart-specific options panel.
 * Shows relevant controls based on the active plot type.
 */

import React from 'react';
import {
  Box, Typography, FormControl, InputLabel, Select, MenuItem,
  Slider, Switch, FormControlLabel, TextField, Divider,
} from '@mui/material';
import { usePlotConfig } from '../../context/PlotConfigContext';

const Section = ({ label, children }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
      {label}
    </Typography>
    {children}
  </Box>
);

const ChartSpecificPanel = () => {
  const { state, dispatch } = usePlotConfig();
  const { plotType } = state;

  // ── Scatter ──────────────────────────────────────────────
  if (plotType === 'scatter') {
    const s = state.scatter;
    const update = (p) => dispatch({ type: 'SET_SCATTER_OPTIONS', payload: p });

    return (
      <Box>
        <Section label="Regression">
          <FormControlLabel
            control={<Switch checked={s.showRegression} onChange={(e) => update({ showRegression: e.target.checked })} size="small" />}
            label={<Typography variant="body2">Show Regression</Typography>}
          />
          {s.showRegression && (
            <FormControl fullWidth size="small" sx={{ mt: 1, mb: 1 }}>
              <InputLabel>Type</InputLabel>
              <Select value={s.regressionType} label="Type" onChange={(e) => update({ regressionType: e.target.value })}>
                <MenuItem value="linear">Linear</MenuItem>
                <MenuItem value="quadratic">Quadratic (degree 2)</MenuItem>
                <MenuItem value="cubic">Cubic (degree 3)</MenuItem>
                <MenuItem value="loess">LOESS Smoother</MenuItem>
              </Select>
            </FormControl>
          )}
          {s.showRegression && (
            <FormControlLabel
              control={<Switch checked={s.showCI} onChange={(e) => update({ showCI: e.target.checked })} size="small" />}
              label={<Typography variant="body2">Confidence Band</Typography>}
            />
          )}
        </Section>
        <Divider sx={{ my: 1 }} />
        <Section label="Point Style">
          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <InputLabel>Shape</InputLabel>
            <Select value={s.pointShape} label="Shape" onChange={(e) => update({ pointShape: e.target.value })}>
              <MenuItem value="circle">Circle</MenuItem>
              <MenuItem value="square">Square</MenuItem>
              <MenuItem value="triangle">Triangle</MenuItem>
              <MenuItem value="diamond">Diamond</MenuItem>
              <MenuItem value="cross">Cross</MenuItem>
              <MenuItem value="star">Star</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            Point Size: {s.pointSize}
          </Typography>
          <Slider value={s.pointSize} onChange={(_, v) => update({ pointSize: v })} min={1} max={12} step={0.5} size="small" />
          <Typography variant="caption" color="text.secondary">
            Opacity: {s.pointOpacity}
          </Typography>
          <Slider value={s.pointOpacity} onChange={(_, v) => update({ pointOpacity: v })} min={0.1} max={1} step={0.05} size="small" />
        </Section>
      </Box>
    );
  }

  // ── Kaplan-Meier ─────────────────────────────────────────
  if (plotType === 'kaplanmeier') {
    const km = state.kaplanMeier;
    const update = (p) => dispatch({ type: 'SET_KAPLANMEIER_OPTIONS', payload: p });

    return (
      <Box>
        <Section label="Confidence Interval">
          <FormControlLabel
            control={<Switch checked={km.showCI} onChange={(e) => update({ showCI: e.target.checked })} size="small" />}
            label={<Typography variant="body2">Show CI Band</Typography>}
          />
        </Section>
        <Section label="Censoring">
          <FormControlLabel
            control={<Switch checked={km.showCensorMarks} onChange={(e) => update({ showCensorMarks: e.target.checked })} size="small" />}
            label={<Typography variant="body2">Show Censor Marks</Typography>}
          />
          {km.showCensorMarks && (
            <>
              <Typography variant="caption" color="text.secondary">Mark Size: {km.censorMarkSize}</Typography>
              <Slider value={km.censorMarkSize} onChange={(_, v) => update({ censorMarkSize: v })} min={3} max={12} step={1} size="small" />
            </>
          )}
        </Section>
        <Section label="Display">
          <FormControlLabel
            control={<Switch checked={km.showRiskTable} onChange={(e) => update({ showRiskTable: e.target.checked })} size="small" />}
            label={<Typography variant="body2">Risk Table</Typography>}
          />
          <FormControlLabel
            control={<Switch checked={km.showMedianLine} onChange={(e) => update({ showMedianLine: e.target.checked })} size="small" />}
            label={<Typography variant="body2">Median Survival Line</Typography>}
          />
        </Section>
      </Box>
    );
  }

  // ── Dose-Response ────────────────────────────────────────
  if (plotType === 'doseresponse') {
    const dr = state.doseResponse;
    const update = (p) => dispatch({ type: 'SET_DOSERESPONSE_OPTIONS', payload: p });

    return (
      <Box>
        <Section label="Curve Fitting">
          <FormControlLabel
            control={<Switch checked={dr.showIC50Line} onChange={(e) => update({ showIC50Line: e.target.checked })} size="small" />}
            label={<Typography variant="body2">Show IC50 Line</Typography>}
          />
          <FormControlLabel
            control={<Switch checked={dr.showAsymptotes} onChange={(e) => update({ showAsymptotes: e.target.checked })} size="small" />}
            label={<Typography variant="body2">Show Asymptotes</Typography>}
          />
          <FormControlLabel
            control={<Switch checked={dr.showHillSlope} onChange={(e) => update({ showHillSlope: e.target.checked })} size="small" />}
            label={<Typography variant="body2">Show Hill Slope</Typography>}
          />
        </Section>
        <Section label="Data Points">
          <FormControlLabel
            control={<Switch checked={dr.showErrorBars} onChange={(e) => update({ showErrorBars: e.target.checked })} size="small" />}
            label={<Typography variant="body2">Show Error Bars</Typography>}
          />
        </Section>
      </Box>
    );
  }

  // ── Bland-Altman ─────────────────────────────────────────
  if (plotType === 'blandaltman') {
    const ba = state.blandAltman;
    const update = (p) => dispatch({ type: 'SET_BLANDALTMAN_OPTIONS', payload: p });

    return (
      <Box>
        <Section label="Agreement Lines">
          <FormControlLabel
            control={<Switch checked={ba.showBiasLine} onChange={(e) => update({ showBiasLine: e.target.checked })} size="small" />}
            label={<Typography variant="body2">Show Bias Line</Typography>}
          />
          <FormControlLabel
            control={<Switch checked={ba.showLOA} onChange={(e) => update({ showLOA: e.target.checked })} size="small" />}
            label={<Typography variant="body2">Limits of Agreement</Typography>}
          />
          {ba.showLOA && (
            <>
              <Typography variant="caption" color="text.secondary">SD Multiplier: {ba.sdMultiplier}</Typography>
              <Slider value={ba.sdMultiplier} onChange={(_, v) => update({ sdMultiplier: v })} min={1} max={3} step={0.01} size="small" />
            </>
          )}
        </Section>
        <Section label="Display">
          <FormControlLabel
            control={<Switch checked={ba.showStats} onChange={(e) => update({ showStats: e.target.checked })} size="small" />}
            label={<Typography variant="body2">Show Statistics</Typography>}
          />
          <FormControlLabel
            control={<Switch checked={ba.showPercentageDiff} onChange={(e) => update({ showPercentageDiff: e.target.checked })} size="small" />}
            label={<Typography variant="body2">Percentage Difference</Typography>}
          />
          <Typography variant="caption" color="text.secondary">Point Size: {ba.pointSize}</Typography>
          <Slider value={ba.pointSize} onChange={(_, v) => update({ pointSize: v })} min={1} max={10} step={0.5} size="small" />
        </Section>
      </Box>
    );
  }

  // ── Waterfall ────────────────────────────────────────────
  if (plotType === 'waterfall') {
    const wf = state.waterfall;
    const update = (p) => dispatch({ type: 'SET_WATERFALL_OPTIONS', payload: p });

    return (
      <Box>
        <Section label="Display">
          <FormControlLabel
            control={<Switch checked={wf.showConnectors} onChange={(e) => update({ showConnectors: e.target.checked })} size="small" />}
            label={<Typography variant="body2">Connector Lines</Typography>}
          />
          <FormControlLabel
            control={<Switch checked={wf.showValues} onChange={(e) => update({ showValues: e.target.checked })} size="small" />}
            label={<Typography variant="body2">Value Labels</Typography>}
          />
          <FormControlLabel
            control={<Switch checked={wf.showTotal} onChange={(e) => update({ showTotal: e.target.checked })} size="small" />}
            label={<Typography variant="body2">Total Bar</Typography>}
          />
          {wf.showTotal && (
            <TextField
              label="Total Label"
              value={wf.totalLabel}
              onChange={(e) => update({ totalLabel: e.target.value })}
              size="small"
              fullWidth
              sx={{ mt: 1 }}
            />
          )}
        </Section>
      </Box>
    );
  }

  // ── Forest ───────────────────────────────────────────────
  if (plotType === 'forest') {
    const fp = state.forest;
    const update = (p) => dispatch({ type: 'SET_FOREST_OPTIONS', payload: p });

    return (
      <Box>
        <Section label="Reference">
          <TextField
            label="Null Effect Value"
            value={fp.referenceValue}
            onChange={(e) => update({ referenceValue: +e.target.value || 1 })}
            size="small"
            type="number"
            fullWidth
            sx={{ mb: 1 }}
          />
          <FormControlLabel
            control={<Switch checked={fp.logScale} onChange={(e) => update({ logScale: e.target.checked })} size="small" />}
            label={<Typography variant="body2">Log Scale</Typography>}
          />
        </Section>
        <Section label="Display">
          <FormControlLabel
            control={<Switch checked={fp.showWeights} onChange={(e) => update({ showWeights: e.target.checked })} size="small" />}
            label={<Typography variant="body2">Show Weights</Typography>}
          />
          <FormControlLabel
            control={<Switch checked={fp.showHeterogeneity} onChange={(e) => update({ showHeterogeneity: e.target.checked })} size="small" />}
            label={<Typography variant="body2">Heterogeneity (I\u00B2)</Typography>}
          />
          <Typography variant="caption" color="text.secondary">Diamond Height: {fp.diamondHeight}</Typography>
          <Slider value={fp.diamondHeight} onChange={(_, v) => update({ diamondHeight: v })} min={6} max={20} step={1} size="small" />
        </Section>
      </Box>
    );
  }

  // No specific options for this chart type
  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="body2" color="text.secondary" align="center">
        No additional options for this chart type.
      </Typography>
    </Box>
  );
};

export default ChartSpecificPanel;
