/**
 * PlotTypeSelector - Visual grid for selecting chart types
 * Organized into Standard (8) and Scientific (5) sections.
 */

import React from 'react';
import { Typography, Paper, Grid, ButtonBase, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  BarChart as BarIcon,
  ScatterPlot as ScatterIcon,
  Timeline as LineIcon,
  ViewColumn as HistogramIcon,
  Equalizer as BoxIcon,
  GraphicEq as ViolinIcon,
  TrendingUp as BeforeAfterIcon,
  FiberManualRecord as DotIcon,
  ShowChart as KMIcon,
  TrendingDown as DoseIcon,
  CompareArrows as BAIcon,
  WaterfallChart as WaterfallIcon,
  AccountTree as ForestIcon,
} from '@mui/icons-material';
import { usePlotConfig } from '../context/PlotConfigContext';

const STANDARD_TYPES = [
  { id: 'bar', name: 'Bar Chart', icon: BarIcon },
  { id: 'scatter', name: 'Scatter Plot', icon: ScatterIcon },
  { id: 'boxplot', name: 'Box Plot', icon: BoxIcon },
  { id: 'histogram', name: 'Histogram', icon: HistogramIcon },
  { id: 'violin', name: 'Violin Plot', icon: ViolinIcon },
  { id: 'line', name: 'Line Chart', icon: LineIcon },
  { id: 'beforeafter', name: 'Before-After', icon: BeforeAfterIcon },
  { id: 'dotplot', name: 'Dot Plot', icon: DotIcon },
];

const SCIENTIFIC_TYPES = [
  { id: 'kaplanmeier', name: 'Kaplan-Meier', icon: KMIcon },
  { id: 'doseresponse', name: 'Dose-Response', icon: DoseIcon },
  { id: 'blandaltman', name: 'Bland-Altman', icon: BAIcon },
  { id: 'waterfall', name: 'Waterfall', icon: WaterfallIcon },
  { id: 'forest', name: 'Forest Plot', icon: ForestIcon },
];

const PlotTypeSelector = () => {
  const theme = useTheme();
  const { state, setPlotType } = usePlotConfig();
  const isDarkMode = theme.palette.mode === 'dark';

  const renderButton = ({ id, name, icon: Icon }) => {
    const isSelected = state.plotType === id;
    return (
      <Grid item xs={4} key={id}>
        <ButtonBase
          onClick={() => setPlotType(id)}
          sx={{
            width: '100%',
            p: 0.75,
            borderRadius: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            border: isSelected
              ? `2px solid ${theme.palette.primary.main}`
              : `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            bgcolor: isSelected
              ? alpha(theme.palette.primary.main, 0.08)
              : 'transparent',
            transition: 'all 0.15s',
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.04),
            },
          }}
        >
          <Icon
            fontSize="small"
            sx={{
              color: isSelected ? theme.palette.primary.main : 'text.secondary',
              mb: 0.25,
              fontSize: '1rem',
            }}
          />
          <Typography
            variant="caption"
            sx={{
              fontWeight: isSelected ? 600 : 400,
              color: isSelected ? theme.palette.primary.main : 'text.primary',
              fontSize: '0.6rem',
              lineHeight: 1.2,
              textAlign: 'center',
            }}
          >
            {name}
          </Typography>
        </ButtonBase>
      </Grid>
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        bgcolor: isDarkMode ? 'background.paper' : '#f8f9fa',
        borderRadius: 2,
      }}
    >
      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
        Plot Type
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Standard
      </Typography>
      <Grid container spacing={0.5} sx={{ mb: 1 }}>
        {STANDARD_TYPES.map(renderButton)}
      </Grid>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, mt: 0.5, fontWeight: 600, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Scientific
      </Typography>
      <Grid container spacing={0.5}>
        {SCIENTIFIC_TYPES.map(renderButton)}
      </Grid>
    </Paper>
  );
};

export default PlotTypeSelector;
