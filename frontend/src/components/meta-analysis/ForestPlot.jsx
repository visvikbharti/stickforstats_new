/**
 * Forest Plot Component
 *
 * Visualizes individual study effects and pooled estimate.
 * Classic forest plot format with effect sizes and confidence intervals.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
} from '@mui/material';

const ForestPlot = ({ studies, pooledEffect, pooledCI, model }) => {
  // Calculate scale for the plot
  const scale = useMemo(() => {
    if (!studies || studies.length === 0 || !pooledCI || pooledCI.length < 2) {
      return { min: -1, max: 1 };
    }

    const allValues = [
      ...studies.flatMap(s => [s.ci_lower, s.ci_upper]),
      pooledCI[0],
      pooledCI[1]
    ];

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1;

    return {
      min: Math.floor((min - padding) * 10) / 10,
      max: Math.ceil((max + padding) * 10) / 10
    };
  }, [studies, pooledCI]);

  // Check for valid data after hooks
  const hasValidData = studies && studies.length > 0 && pooledCI && pooledCI.length >= 2;

  // Convert effect size to pixel position
  const toPixel = (value) => {
    const plotWidth = 300;
    const range = scale.max - scale.min;
    return ((value - scale.min) / range) * plotWidth;
  };

  // Render effect size marker and CI line
  const renderEffectPlot = (effect, ciLower, ciUpper, weight, isPooled = false) => {
    const markerSize = isPooled ? 12 : Math.max(4, Math.min(16, Math.sqrt(weight) * 2));
    const markerX = toPixel(effect);
    const ciStart = toPixel(ciLower);
    const ciEnd = toPixel(ciUpper);

    return (
      <svg width={300} height={24} style={{ display: 'block' }}>
        {/* CI Line */}
        <line
          x1={ciStart}
          y1={12}
          x2={ciEnd}
          y2={12}
          stroke={isPooled ? '#9c27b0' : '#1976d2'}
          strokeWidth={isPooled ? 2 : 1}
        />
        {/* CI endpoints */}
        <line x1={ciStart} y1={8} x2={ciStart} y2={16} stroke={isPooled ? '#9c27b0' : '#1976d2'} strokeWidth={1} />
        <line x1={ciEnd} y1={8} x2={ciEnd} y2={16} stroke={isPooled ? '#9c27b0' : '#1976d2'} strokeWidth={1} />
        {/* Effect size marker */}
        {isPooled ? (
          // Diamond for pooled effect
          <polygon
            points={`${markerX},${12 - markerSize/2} ${markerX + markerSize/2},12 ${markerX},${12 + markerSize/2} ${markerX - markerSize/2},12`}
            fill="#9c27b0"
          />
        ) : (
          // Square for individual studies
          <rect
            x={markerX - markerSize / 2}
            y={12 - markerSize / 2}
            width={markerSize}
            height={markerSize}
            fill="#1976d2"
          />
        )}
      </svg>
    );
  };

  // Render axis
  const renderAxis = () => {
    const ticks = [];
    const step = (scale.max - scale.min) / 5;

    for (let i = 0; i <= 5; i++) {
      const value = scale.min + step * i;
      ticks.push(value);
    }

    return (
      <svg width={300} height={30}>
        {/* Axis line */}
        <line x1={0} y1={5} x2={300} y2={5} stroke="#ccc" strokeWidth={1} />
        {/* Zero line (if in range) */}
        {scale.min <= 0 && scale.max >= 0 && (
          <line
            x1={toPixel(0)}
            y1={0}
            x2={toPixel(0)}
            y2={10}
            stroke="#999"
            strokeWidth={2}
            strokeDasharray="3,3"
          />
        )}
        {/* Tick marks and labels */}
        {ticks.map((tick, i) => (
          <g key={i}>
            <line x1={toPixel(tick)} y1={5} x2={toPixel(tick)} y2={10} stroke="#ccc" strokeWidth={1} />
            <text
              x={toPixel(tick)}
              y={25}
              textAnchor="middle"
              fontSize={10}
              fill="#666"
            >
              {tick.toFixed(2)}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  // Early return if no valid data (after all hooks)
  if (!hasValidData) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">No data available for forest plot</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Forest Plot
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {model === 'random' ? 'Random-effects model' : 'Fixed-effects model'} |
        Squares represent individual studies (size = weight) |
        Diamond represents pooled effect
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell width={150}>Study</TableCell>
              <TableCell width={80} align="right">Effect</TableCell>
              <TableCell width={120} align="right">95% CI</TableCell>
              <TableCell width={60} align="right">Weight</TableCell>
              <TableCell width={300} align="center">
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="caption">Effect Size Plot</Typography>
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {studies.map((study, index) => (
              <TableRow key={index} hover>
                <TableCell>
                  <Typography variant="body2">{study.study_name}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {study.effect_size.toFixed(3)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    [{study.ci_lower.toFixed(3)}, {study.ci_upper.toFixed(3)}]
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {study.weight_percent.toFixed(1)}%
                  </Typography>
                </TableCell>
                <TableCell>
                  {renderEffectPlot(study.effect_size, study.ci_lower, study.ci_upper, study.weight_percent)}
                </TableCell>
              </TableRow>
            ))}

            {/* Pooled effect row */}
            <TableRow sx={{ bgcolor: '#f3e5f5' }}>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Pooled ({model === 'random' ? 'RE' : 'FE'})
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                  {pooledEffect.toFixed(3)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                  [{pooledCI[0].toFixed(3)}, {pooledCI[1].toFixed(3)}]
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  100%
                </Typography>
              </TableCell>
              <TableCell>
                {renderEffectPlot(pooledEffect, pooledCI[0], pooledCI[1], 100, true)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Axis */}
        <Box sx={{ p: 2, pl: '410px' }}>
          {renderAxis()}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Favors Control
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Favors Treatment
            </Typography>
          </Box>
        </Box>
      </TableContainer>
    </Box>
  );
};

export default ForestPlot;
