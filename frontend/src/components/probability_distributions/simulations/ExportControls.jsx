import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Button, 
  ButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  FormControlLabel,
  InputLabel,
  Checkbox,
  Slider,
  Typography,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  SaveAlt as SaveIcon,
  Image as ImageIcon,
  Code as CodeIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

import { 
  exportSvg, 
  exportPng, 
  getChartExportOptions, 
  fixSvgForExport 
} from './ExportUtils';

/**
 * ExportControls - Component for exporting D3.js visualizations
 * 
 * This component provides user interface controls for exporting
 * D3.js visualizations as SVG and PNG files, with customizable options.
 */
const ExportControls = ({
  // Chart reference
  chartRef,
  svgSelector,
  
  // Export options
  chartType = 'generic',
  formats = ['svg', 'png'],
  exportOptions = {},
  
  // Appearance
  variant = 'contained',
  size = 'small',
  color = 'primary',
  buttonStyle = {},
  showAdvancedOptions = true,
  showIcon = true,
  iconOnly = false,
  label = 'Export',
  className = '',
  
  // Layout
  orientation = 'horizontal',
  fullWidth = false,
  
  // Events
  onExportStart,
  onExportComplete,
  onExportError,
  
  // Additional props
  ...rest
}) => {
  // State for export options dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeFormat, setActiveFormat] = useState(formats[0] || 'svg');
  const [loading, setLoading] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState(null);
  
  // Get default options for selected chart type
  const defaultOptions = getChartExportOptions(chartType);
  
  // State for custom export options
  const [customOptions, setCustomOptions] = useState({
    filename: defaultOptions.filename,
    scale: defaultOptions.scale || 2,
    backgroundColor: defaultOptions.backgroundColor || '#ffffff',
    includeStyles: true,
    beautify: true
  });
  
  // Handle export action
  const handleExport = async (format) => {
    // Get SVG element
    let svgElement;
    
    if (chartRef && chartRef.current) {
      svgElement = chartRef.current;
    } else if (svgSelector) {
      svgElement = document.querySelector(svgSelector);
    } else {
      setExportError('No SVG element found for export');
      if (onExportError) onExportError('No SVG element found for export');
      return;
    }
    
    // Verify it's an SVG
    if (!svgElement || svgElement.tagName.toLowerCase() !== 'svg') {
      setExportError('Selected element is not an SVG');
      if (onExportError) onExportError('Selected element is not an SVG');
      return;
    }
    
    // Set loading state
    setLoading(true);
    if (onExportStart) onExportStart(format);
    
    try {
      // Fix SVG for export
      fixSvgForExport(svgElement);
      
      // Merge options
      const options = {
        ...defaultOptions,
        ...exportOptions,
        ...customOptions
      };
      
      // Add file extension if not present
      if (!options.filename.toLowerCase().endsWith(`.${format}`)) {
        options.filename = `${options.filename}.${format}`;
      }
      
      // Export based on format
      if (format === 'svg') {
        await exportSvg(svgElement, options);
      } else if (format === 'png') {
        await exportPng(svgElement, options);
      }
      
      // Set success
      setExportSuccess(true);
      if (onExportComplete) onExportComplete(format, options);
    } catch (error) {
      console.error(`Error exporting as ${format}:`, error);
      setExportError(`Failed to export as ${format}: ${error.message}`);
      if (onExportError) onExportError(error, format);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle options dialog
  const handleOpenDialog = () => {
    setDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };
  
  const handleAdvancedExport = () => {
    handleExport(activeFormat);
    handleCloseDialog();
  };
  
  // Handle option changes
  const handleOptionChange = (option, value) => {
    setCustomOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };
  
  // Close success message
  const handleCloseSuccess = () => {
    setExportSuccess(false);
  };
  
  // Close error message
  const handleCloseError = () => {
    setExportError(null);
  };
  
  // Render quick export buttons
  const renderQuickExportButtons = () => {
    if (formats.length === 1) {
      // Single format button
      return (
        <Button
          variant={variant}
          size={size}
          color={color}
          onClick={() => handleExport(formats[0])}
          disabled={loading}
          style={buttonStyle}
          className={className}
          startIcon={showIcon ? <SaveIcon /> : undefined}
          fullWidth={fullWidth}
          {...rest}
        >
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            iconOnly ? null : label
          )}
        </Button>
      );
    } else {
      // Multiple format buttons
      return (
        <ButtonGroup
          variant={variant}
          size={size}
          color={color}
          orientation={orientation}
          disabled={loading}
          className={className}
          fullWidth={fullWidth}
          {...rest}
        >
          {formats.map(format => (
            <Button
              key={format}
              onClick={() => handleExport(format)}
              style={buttonStyle}
              startIcon={showIcon ? (
                format === 'svg' ? <CodeIcon /> : <ImageIcon />
              ) : undefined}
            >
              {loading ? (
                <CircularProgress size={16} />
              ) : (
                iconOnly ? null : format.toUpperCase()
              )}
            </Button>
          ))}
          
          {showAdvancedOptions && (
            <Button
              onClick={handleOpenDialog}
              style={buttonStyle}
              startIcon={showIcon ? <SettingsIcon /> : undefined}
            >
              {iconOnly ? null : 'Options'}
            </Button>
          )}
        </ButtonGroup>
      );
    }
  };
  
  // Render advanced options dialog
  const renderAdvancedOptionsDialog = () => (
    <Dialog
      open={dialogOpen}
      onClose={handleCloseDialog}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Export Options</DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3, mt: 1 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="export-format-label">Format</InputLabel>
            <Select
              labelId="export-format-label"
              value={activeFormat}
              onChange={(e) => setActiveFormat(e.target.value)}
              label="Format"
            >
              {formats.map(format => (
                <MenuItem key={format} value={format}>
                  {format.toUpperCase()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Filename"
            value={customOptions.filename}
            onChange={(e) => handleOptionChange('filename', e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ mb: 2 }}>
            <Typography gutterBottom>Scale (PNG only)</Typography>
            <Slider
              value={customOptions.scale}
              onChange={(_, value) => handleOptionChange('scale', value)}
              min={1}
              max={5}
              step={0.5}
              marks={[
                { value: 1, label: '1x' },
                { value: 2, label: '2x' },
                { value: 3, label: '3x' },
                { value: 4, label: '4x' },
                { value: 5, label: '5x' }
              ]}
              valueLabelDisplay="auto"
              disabled={activeFormat !== 'png'}
            />
          </Box>
          
          <TextField
            fullWidth
            label="Background Color"
            value={customOptions.backgroundColor}
            onChange={(e) => handleOptionChange('backgroundColor', e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={customOptions.includeStyles}
                  onChange={(e) => handleOptionChange('includeStyles', e.target.checked)}
                />
              }
              label="Include Computed Styles"
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={customOptions.beautify}
                  onChange={(e) => handleOptionChange('beautify', e.target.checked)}
                  disabled={activeFormat !== 'svg'}
                />
              }
              label="Beautify SVG Output"
            />
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleCloseDialog}>Cancel</Button>
        <Button 
          onClick={handleAdvancedExport}
          variant="contained"
          color="primary"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
        >
          Export
        </Button>
      </DialogActions>
    </Dialog>
  );
  
  return (
    <Box>
      {/* Export Buttons */}
      {renderQuickExportButtons()}
      
      {/* Advanced Options Dialog */}
      {renderAdvancedOptionsDialog()}
      
      {/* Success Message */}
      <Snackbar
        open={exportSuccess}
        autoHideDuration={4000}
        onClose={handleCloseSuccess}
      >
        <Alert onClose={handleCloseSuccess} severity="success" variant="filled">
          Export completed successfully!
        </Alert>
      </Snackbar>
      
      {/* Error Message */}
      <Snackbar
        open={!!exportError}
        autoHideDuration={6000}
        onClose={handleCloseError}
      >
        <Alert onClose={handleCloseError} severity="error" variant="filled">
          {exportError}
        </Alert>
      </Snackbar>
    </Box>
  );
};

ExportControls.propTypes = {
  // Chart reference (one of these is required)
  chartRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) })
  ]),
  svgSelector: PropTypes.string,
  
  // Export options
  chartType: PropTypes.string,
  formats: PropTypes.arrayOf(PropTypes.oneOf(['svg', 'png'])),
  exportOptions: PropTypes.object,
  
  // Appearance
  variant: PropTypes.string,
  size: PropTypes.string,
  color: PropTypes.string,
  buttonStyle: PropTypes.object,
  showAdvancedOptions: PropTypes.bool,
  showIcon: PropTypes.bool,
  iconOnly: PropTypes.bool,
  label: PropTypes.string,
  className: PropTypes.string,
  
  // Layout
  orientation: PropTypes.oneOf(['horizontal', 'vertical']),
  fullWidth: PropTypes.bool,
  
  // Events
  onExportStart: PropTypes.func,
  onExportComplete: PropTypes.func,
  onExportError: PropTypes.func
};

export default ExportControls;