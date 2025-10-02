import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip
} from '@mui/material';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Cell,
  Legend
} from 'recharts';

// Color scale for correlation values
const getCorrelationColor = (value) => {
  // Strong negative: blue, neutral: white, strong positive: red
  const absValue = Math.abs(value);

  if (value < 0) {
    // Negative correlations: shades of blue
    const intensity = Math.floor(255 * (1 - absValue));
    return `rgb(${intensity}, ${intensity}, 255)`;
  } else {
    // Positive correlations: shades of red
    const intensity = Math.floor(255 * (1 - absValue));
    return `rgb(255, ${intensity}, ${intensity})`;
  }
};

/**
 * Correlation Heatmap Component
 */
export const CorrelationHeatmap = ({ correlationMatrix, pValues, columnNames }) => {
  const heatmapData = useMemo(() => {
    const data = [];

    correlationMatrix.forEach((row, i) => {
      row.forEach((value, j) => {
        if (value !== null) {
          data.push({
            x: j,
            y: i,
            value: value,
            pValue: pValues[i][j],
            xLabel: columnNames[j],
            yLabel: columnNames[i],
            displayValue: value.toFixed(3),
            isSignificant: pValues[i][j] < 0.05
          });
        }
      });
    });

    return data;
  }, [correlationMatrix, pValues, columnNames]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box sx={{
          bgcolor: 'background.paper',
          p: 1.5,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1
        }}>
          <Typography variant="subtitle2">
            {data.xLabel} × {data.yLabel}
          </Typography>
          <Typography variant="body2">
            Correlation: {data.displayValue}
          </Typography>
          <Typography variant="body2">
            p-value: {data.pValue.toFixed(4)}
          </Typography>
          <Chip
            label={data.isSignificant ? 'Significant' : 'Not Significant'}
            size="small"
            color={data.isSignificant ? 'success' : 'default'}
            sx={{ mt: 0.5 }}
          />
        </Box>
      );
    }
    return null;
  };

  // Create grid cells for heatmap visualization
  const gridSize = columnNames.length;
  const cellSize = Math.min(600 / gridSize, 80);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Correlation Heatmap
        </Typography>

        <Box sx={{ position: 'relative', width: '100%', overflow: 'auto' }}>
          <svg width={gridSize * cellSize + 150} height={gridSize * cellSize + 150}>
            {/* Y-axis labels */}
            {columnNames.map((name, i) => (
              <text
                key={`y-${i}`}
                x={120}
                y={i * cellSize + cellSize / 2 + 40}
                textAnchor="end"
                fontSize="12"
                fill="#666"
              >
                {name}
              </text>
            ))}

            {/* X-axis labels */}
            {columnNames.map((name, i) => (
              <text
                key={`x-${i}`}
                x={i * cellSize + cellSize / 2 + 130}
                y={gridSize * cellSize + 60}
                textAnchor="middle"
                fontSize="12"
                fill="#666"
                transform={`rotate(-45, ${i * cellSize + cellSize / 2 + 130}, ${gridSize * cellSize + 60})`}
              >
                {name}
              </text>
            ))}

            {/* Heatmap cells */}
            {heatmapData.map((cell, index) => (
              <g key={index}>
                <rect
                  x={cell.x * cellSize + 130}
                  y={cell.y * cellSize + 20}
                  width={cellSize - 2}
                  height={cellSize - 2}
                  fill={getCorrelationColor(cell.value)}
                  stroke="#fff"
                  strokeWidth="1"
                />
                <text
                  x={cell.x * cellSize + cellSize / 2 + 130}
                  y={cell.y * cellSize + cellSize / 2 + 25}
                  textAnchor="middle"
                  fontSize="11"
                  fill={Math.abs(cell.value) > 0.5 ? '#fff' : '#000'}
                  fontWeight={cell.isSignificant ? 'bold' : 'normal'}
                >
                  {cell.displayValue}
                </text>
                {cell.isSignificant && (
                  <text
                    x={cell.x * cellSize + cellSize / 2 + 130}
                    y={cell.y * cellSize + cellSize / 2 + 38}
                    textAnchor="middle"
                    fontSize="10"
                    fill={Math.abs(cell.value) > 0.5 ? '#fff' : '#000'}
                  >
                    *
                  </text>
                )}
              </g>
            ))}
          </svg>
        </Box>

        {/* Color scale legend */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Color Scale
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 300,
              height: 20,
              background: 'linear-gradient(to right, rgb(0,0,255), rgb(255,255,255), rgb(255,0,0))',
              border: '1px solid #ccc'
            }} />
            <Typography variant="caption">-1.0 (Strong Negative) → 0 (No Correlation) → 1.0 (Strong Positive)</Typography>
          </Box>
          <Typography variant="caption" sx={{ mt: 1 }}>
            * indicates p-value {'<'} 0.05 (statistically significant)
          </Typography>
        </Box>

        {/* Interpretation guide */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Interpretation Guide
          </Typography>
          <Typography variant="body2" paragraph>
            • Values close to +1: Strong positive correlation (variables move together)
          </Typography>
          <Typography variant="body2" paragraph>
            • Values close to -1: Strong negative correlation (variables move oppositely)
          </Typography>
          <Typography variant="body2" paragraph>
            • Values close to 0: Little to no linear correlation
          </Typography>
          <Typography variant="body2">
            • Bold values with asterisk (*): Statistically significant at α = 0.05
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

/**
 * Correlation Scatter Plot Matrix
 */
export const CorrelationScatterMatrix = ({ data, columns, selectedColumns }) => {
  const scatterPlots = useMemo(() => {
    const plots = [];

    for (let i = 0; i < selectedColumns.length - 1; i++) {
      for (let j = i + 1; j < selectedColumns.length; j++) {
        const col1 = selectedColumns[i];
        const col2 = selectedColumns[j];

        const plotData = data
          .map(row => ({
            x: parseFloat(row[col1]),
            y: parseFloat(row[col2])
          }))
          .filter(point => !isNaN(point.x) && !isNaN(point.y));

        const correlation = plotData.length > 2 ?
          calculateCorrelation(plotData.map(p => p.x), plotData.map(p => p.y)) : 0;

        plots.push({
          xColumn: columns[col1],
          yColumn: columns[col2],
          data: plotData,
          correlation
        });
      }
    }

    return plots;
  }, [data, columns, selectedColumns]);

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 2 }}>
      {scatterPlots.map((plot, index) => (
        <Card key={index}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              {plot.xColumn} vs {plot.yColumn}
            </Typography>
            <Chip
              label={`r = ${plot.correlation.toFixed(3)}`}
              color={Math.abs(plot.correlation) > 0.7 ? 'error' :
                     Math.abs(plot.correlation) > 0.4 ? 'warning' : 'success'}
              size="small"
              sx={{ mb: 1 }}
            />

            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <XAxis
                  dataKey="x"
                  name={plot.xColumn}
                  label={{ value: plot.xColumn, position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  dataKey="y"
                  name={plot.yColumn}
                  label={{ value: plot.yColumn, angle: -90, position: 'insideLeft' }}
                />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter
                  data={plot.data}
                  fill="#1976d2"
                  fillOpacity={0.6}
                />
              </ScatterChart>
            </ResponsiveContainer>

            {/* Add trend line equation if correlation is significant */}
            {Math.abs(plot.correlation) > 0.3 && (
              <Typography variant="caption" color="text.secondary">
                {Math.abs(plot.correlation) > 0.7 ? 'Strong' :
                 Math.abs(plot.correlation) > 0.4 ? 'Moderate' : 'Weak'}
                {' '}{plot.correlation > 0 ? 'positive' : 'negative'} correlation
              </Typography>
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

// Helper function to calculate Pearson correlation
const calculateCorrelation = (x, y) => {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
};

export default CorrelationHeatmap;