/**
 * ExportPanel - Multi-format export controls
 */

import React, { useState } from 'react';
import {
  Box, Button, ButtonGroup, Menu, MenuItem, ListItemIcon, ListItemText,
  CircularProgress
} from '@mui/material';
import {
  SaveAlt as SaveIcon,
  Image as PngIcon,
  PictureAsPdf as PdfIcon,
  Code as SvgIcon,
  ContentCopy as ClipboardIcon,
} from '@mui/icons-material';
import { usePlotConfig } from '../context/PlotConfigContext';
import { exportChart } from '../utils/publicationExport';

const ExportPanel = ({ canvasRef, onExport }) => {
  const { state } = usePlotConfig();
  const [anchorEl, setAnchorEl] = useState(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format) => {
    setAnchorEl(null);
    if (!canvasRef?.current) return;

    const svgElement = canvasRef.current.getSvgElement();
    if (!svgElement) return;

    setExporting(true);
    try {
      const { width, height, dpi } = state.dimensions;
      await exportChart(svgElement, format, {
        dpi,
        widthInches: width,
        heightInches: height,
        filename: `figure_${state.plotType || 'plot'}.${format === 'clipboard' ? 'png' : format}`,
      });
      onExport?.(
        format === 'clipboard' ? 'Copied to clipboard' : `Exported as ${format.toUpperCase()}`,
        'success'
      );
    } catch (err) {
      onExport?.(`Export failed: ${err.message}`, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box>
      <ButtonGroup variant="outlined" size="small">
        <Button
          startIcon={exporting ? <CircularProgress size={14} /> : <SaveIcon />}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          disabled={exporting || !state.data}
        >
          Export
        </Button>
      </ButtonGroup>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => handleExport('svg')}>
          <ListItemIcon><SvgIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="SVG" secondary="Vector (scalable)" />
        </MenuItem>
        <MenuItem onClick={() => handleExport('png')}>
          <ListItemIcon><PngIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={`PNG (${state.dimensions.dpi} DPI)`} secondary="Raster image" />
        </MenuItem>
        <MenuItem onClick={() => handleExport('pdf')}>
          <ListItemIcon><PdfIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="PDF" secondary="Publication-ready" />
        </MenuItem>
        <MenuItem onClick={() => handleExport('clipboard')}>
          <ListItemIcon><ClipboardIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Copy to Clipboard" secondary="Paste anywhere" />
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ExportPanel;
