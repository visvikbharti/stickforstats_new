/**
 * CorrelationMatrix Component
 * 
 * Interactive correlation matrix visualization with scientific accuracy.
 * 
 * @timestamp 2025-08-06 21:39:00 UTC
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tooltip,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  FormControlLabel,
  Switch,
  Alert,
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

import { CorrelationMatrixProps } from './ProfileViewer.types';

const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({
  correlations,
  variableNames,
  method = 'pearson',
  threshold = 0.3,
  interactive = true,
}) => {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showSignificantOnly, setShowSignificantOnly] = useState(false);
  const [correlationThreshold, setCorrelationThreshold] = useState(threshold);

  // Color scale for correlations
  const getCorrelationColor = (value: number): string => {
    const absValue = Math.abs(value);
    if (absValue < 0.3) return '#f5f5f5';
    if (absValue < 0.5) return value > 0 ? '#ffecb3' : '#e1f5fe';
    if (absValue < 0.7) return value > 0 ? '#ffcc80' : '#81d4fa';
    if (absValue < 0.9) return value > 0 ? '#ff9800' : '#29b6f6';
    return value > 0 ? '#f57c00' : '#0288d1';
  };

  // Get text color based on background
  const getTextColor = (value: number): string => {
    return Math.abs(value) > 0.5 ? 'white' : 'black';
  };

  // Filter correlations based on threshold
  const filteredCorrelations = useMemo(() => {
    if (!showSignificantOnly) return correlations;
    
    return correlations.map(row =>
      row.map(val => Math.abs(val) >= correlationThreshold ? val : null)
    );
  }, [correlations, showSignificantOnly, correlationThreshold]);

  // Calculate cell size based on zoom
  const cellSize = 60 * zoomLevel;

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleReset = () => {
    setZoomLevel(1);
    setSelectedCell(null);
    setShowSignificantOnly(false);
    setCorrelationThreshold(threshold);
  };

  if (!correlations || correlations.length === 0) {
    return (
      <Alert severity="info">
        No correlation data available for this dataset.
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Correlation Matrix ({method.charAt(0).toUpperCase() + method.slice(1)})
        </Typography>
        
        {interactive && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton size="small" onClick={handleZoomOut}>
                <ZoomOutIcon />
              </IconButton>
              <IconButton size="small" onClick={handleZoomIn}>
                <ZoomInIcon />
              </IconButton>
              <IconButton size="small" onClick={handleReset}>
                <RefreshIcon />
              </IconButton>
            </Box>
            
            <FormControlLabel
              control={
                <Switch
                  checked={showSignificantOnly}
                  onChange={(e) => setShowSignificantOnly(e.target.checked)}
                />
              }
              label="Show significant only"
            />
            
            {showSignificantOnly && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 200 }}>
                <Typography variant="body2">Threshold:</Typography>
                <Slider
                  value={correlationThreshold}
                  onChange={(e, v) => setCorrelationThreshold(v as number)}
                  min={0}
                  max={1}
                  step={0.1}
                  valueLabelDisplay="auto"
                  size="small"
                />
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Color Legend */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Strong Negative
        </Typography>
        <Box sx={{ display: 'flex', height: 20, flexGrow: 1, maxWidth: 300 }}>
          <Box sx={{ flexGrow: 1, bgcolor: '#0288d1' }} />
          <Box sx={{ flexGrow: 1, bgcolor: '#29b6f6' }} />
          <Box sx={{ flexGrow: 1, bgcolor: '#81d4fa' }} />
          <Box sx={{ flexGrow: 1, bgcolor: '#e1f5fe' }} />
          <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5' }} />
          <Box sx={{ flexGrow: 1, bgcolor: '#ffecb3' }} />
          <Box sx={{ flexGrow: 1, bgcolor: '#ffcc80' }} />
          <Box sx={{ flexGrow: 1, bgcolor: '#ff9800' }} />
          <Box sx={{ flexGrow: 1, bgcolor: '#f57c00' }} />
        </Box>
        <Typography variant="body2" color="text.secondary">
          Strong Positive
        </Typography>
      </Box>

      {/* Matrix */}
      <Box sx={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 600 }}>
        <Box sx={{ display: 'inline-block' }}>
          {/* Header Row */}
          <Box sx={{ display: 'flex', ml: cellSize + 'px' }}>
            {variableNames.map((name, idx) => (
              <Box
                key={`header-${idx}`}
                sx={{
                  width: cellSize,
                  height: cellSize,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: 'rotate(-45deg)',
                  transformOrigin: 'center',
                  fontSize: 12 * zoomLevel,
                }}
              >
                <Typography variant="caption" noWrap>
                  {name}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Matrix Rows */}
          {filteredCorrelations.map((row, rowIdx) => (
            <Box key={`row-${rowIdx}`} sx={{ display: 'flex' }}>
              {/* Row Label */}
              <Box
                sx={{
                  width: cellSize,
                  height: cellSize,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  pr: 1,
                  fontSize: 12 * zoomLevel,
                }}
              >
                <Typography variant="caption" noWrap>
                  {variableNames[rowIdx]}
                </Typography>
              </Box>

              {/* Cells */}
              {row.map((value, colIdx) => {
                const displayValue = value !== null ? value : 0;
                const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
                const isDiagonal = rowIdx === colIdx;

                return (
                  <Tooltip
                    key={`cell-${rowIdx}-${colIdx}`}
                    title={
                      <Box>
                        <Typography variant="caption">
                          {variableNames[rowIdx]} × {variableNames[colIdx]}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Correlation: {displayValue.toFixed(3)}
                        </Typography>
                      </Box>
                    }
                  >
                    <Box
                      onClick={() => interactive && setSelectedCell({ row: rowIdx, col: colIdx })}
                      sx={{
                        width: cellSize,
                        height: cellSize,
                        bgcolor: isDiagonal ? '#e0e0e0' : getCorrelationColor(displayValue),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: isSelected ? '2px solid #1976d2' : '1px solid #fff',
                        cursor: interactive ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                        '&:hover': interactive ? {
                          transform: 'scale(1.05)',
                          zIndex: 1,
                          boxShadow: 2,
                        } : {},
                      }}
                    >
                      {value !== null && !isDiagonal && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: getTextColor(displayValue),
                            fontSize: 11 * zoomLevel,
                            fontWeight: Math.abs(displayValue) > 0.7 ? 'bold' : 'normal',
                          }}
                        >
                          {displayValue.toFixed(2)}
                        </Typography>
                      )}
                      {isDiagonal && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                            fontSize: 11 * zoomLevel,
                          }}
                        >
                          1.00
                        </Typography>
                      )}
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Selected Cell Details */}
      {selectedCell && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected Correlation
          </Typography>
          <Typography variant="body2">
            <strong>{variableNames[selectedCell.row]}</strong> × <strong>{variableNames[selectedCell.col]}</strong>
          </Typography>
          <Typography variant="body2">
            Correlation coefficient: {correlations[selectedCell.row][selectedCell.col].toFixed(4)}
          </Typography>
          {Math.abs(correlations[selectedCell.row][selectedCell.col]) > 0.7 && (
            <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
              Strong correlation detected. Consider multicollinearity in regression models.
            </Typography>
          )}
        </Alert>
      )}
    </Paper>
  );
};

export default CorrelationMatrix;