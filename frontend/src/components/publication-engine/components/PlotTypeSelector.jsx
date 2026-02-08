/**
 * PlotTypeSelector - Visual grid for selecting chart types
 */

import React from 'react';
import { Box, Typography, Paper, Grid, ButtonBase, useTheme } from '@mui/material';
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
} from '@mui/icons-material';
import { usePlotConfig } from '../context/PlotConfigContext';

const PLOT_TYPES = [
  { id: 'bar', name: 'Bar Chart', icon: BarIcon, desc: 'Grouped/stacked with error bars' },
  { id: 'scatter', name: 'Scatter Plot', icon: ScatterIcon, desc: 'Points with regression' },
  { id: 'boxplot', name: 'Box Plot', icon: BoxIcon, desc: 'Box-whisker with points' },
  { id: 'histogram', name: 'Histogram', icon: HistogramIcon, desc: 'Distribution bins' },
  { id: 'violin', name: 'Violin Plot', icon: ViolinIcon, desc: 'Density distribution' },
  { id: 'line', name: 'Line Chart', icon: LineIcon, desc: 'Trends with error bands' },
  { id: 'beforeafter', name: 'Before-After', icon: BeforeAfterIcon, desc: 'Paired data slopes' },
  { id: 'dotplot', name: 'Dot Plot', icon: DotIcon, desc: 'Strip chart with jitter' },
];

const PlotTypeSelector = () => {
  const theme = useTheme();
  const { state, setPlotType } = usePlotConfig();
  const isDarkMode = theme.palette.mode === 'dark';

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
      <Grid container spacing={0.5}>
        {PLOT_TYPES.map(({ id, name, icon: Icon, desc }) => {
          const isSelected = state.plotType === id;
          return (
            <Grid item xs={6} key={id}>
              <ButtonBase
                onClick={() => setPlotType(id)}
                sx={{
                  width: '100%',
                  p: 1,
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
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? theme.palette.primary.main : 'text.primary',
                    fontSize: '0.65rem',
                    lineHeight: 1.2,
                    textAlign: 'center',
                  }}
                >
                  {name}
                </Typography>
              </ButtonBase>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
};

export default PlotTypeSelector;
