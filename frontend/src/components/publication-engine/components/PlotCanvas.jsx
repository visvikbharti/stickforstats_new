/**
 * PlotCanvas - SVG rendering surface for publication charts
 *
 * Manages the SVG element ref, dimensions, and chart component selection.
 * Always renders with white background for clean export.
 */

import React, { useRef, useMemo, useState, forwardRef, useImperativeHandle } from 'react';
import { Box, Typography, Paper, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { usePlotConfig } from '../context/PlotConfigContext';
import AnnotationLayer from './AnnotationLayer';

// Lazy chart imports
import D3BarChart from '../charts/D3BarChart';
import D3ScatterPlot from '../charts/D3ScatterPlot';
import D3BoxPlot from '../charts/D3BoxPlot';
import D3Histogram from '../charts/D3Histogram';
import D3ViolinPlot from '../charts/D3ViolinPlot';
import D3LineChart from '../charts/D3LineChart';
import D3BeforeAfter from '../charts/D3BeforeAfter';
import D3DotPlot from '../charts/D3DotPlot';
import D3KaplanMeier from '../charts/D3KaplanMeier';
import D3DoseResponse from '../charts/D3DoseResponse';
import D3BlandAltman from '../charts/D3BlandAltman';
import D3WaterfallChart from '../charts/D3WaterfallChart';
import D3ForestPlot from '../charts/D3ForestPlot';

const CHART_COMPONENTS = {
  bar: D3BarChart,
  scatter: D3ScatterPlot,
  boxplot: D3BoxPlot,
  histogram: D3Histogram,
  violin: D3ViolinPlot,
  line: D3LineChart,
  beforeafter: D3BeforeAfter,
  dotplot: D3DotPlot,
  kaplanmeier: D3KaplanMeier,
  doseresponse: D3DoseResponse,
  blandaltman: D3BlandAltman,
  waterfall: D3WaterfallChart,
  forest: D3ForestPlot,
};

const PlotCanvas = forwardRef((props, ref) => {
  const theme = useTheme();
  const svgRef = useRef(null);
  const { state } = usePlotConfig();
  const [scales, setScales] = useState(null);

  // Expose svgRef to parent for export
  useImperativeHandle(ref, () => ({
    getSvgElement: () => svgRef.current,
  }));

  const { width, height, unit, dpi } = state.dimensions;
  const pixelWidth = unit === 'inches' ? width * 96 : width;
  const pixelHeight = unit === 'inches' ? height * 96 : height;

  const ChartComponent = CHART_COMPONENTS[state.plotType] || null;
  const hasData = state.data && state.data.length > 0;
  const hasMapping = state.dataMapping.x || state.dataMapping.y;
  const isDarkMode = theme.palette.mode === 'dark';

  const handleScalesReady = useMemo(() => (newScales) => {
    setScales(newScales);
  }, []);

  return (
    <Paper
      elevation={isDarkMode ? 2 : 1}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
        bgcolor: isDarkMode ? '#2a2a3e' : '#f0f0f0',
        borderRadius: 2,
        overflow: 'auto',
        p: 3,
      }}
    >
      {!hasData ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Upload a CSV file to get started
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Supports CSV, TSV, and tab-delimited files
          </Typography>
        </Box>
      ) : !state.plotType ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Select a plot type
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose from 13 publication-quality chart types
          </Typography>
        </Box>
      ) : !hasMapping ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Map your data columns
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select which columns to use for X and Y axes
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            bgcolor: '#ffffff',
            borderRadius: 1,
            boxShadow: `0 1px 4px ${alpha('#000', 0.1)}`,
            overflow: 'hidden',
          }}
        >
          <svg
            ref={svgRef}
            width={pixelWidth}
            height={pixelHeight}
            viewBox={`0 0 ${pixelWidth} ${pixelHeight}`}
            style={{ display: 'block' }}
          >
            <rect width={pixelWidth} height={pixelHeight} fill="#ffffff" />
            {ChartComponent && (
              <ChartComponent svgRef={svgRef} onScalesReady={handleScalesReady} />
            )}
            {scales && state.annotations.length > 0 && (
              <AnnotationLayer scales={scales} />
            )}
          </svg>
        </Box>
      )}
    </Paper>
  );
});

PlotCanvas.displayName = 'PlotCanvas';

export default PlotCanvas;
