/**
 * PublicationPlotBuilder - Main layout for the Publication Engine
 *
 * Two-panel layout:
 * - Left sidebar: Data import + Plot type selection
 * - Center: Chart canvas
 * - Right sidebar: Customization panels + Export
 */

import React, { useRef, useState } from 'react';
import {
  Box, Typography, IconButton, Tooltip, Snackbar, Alert,
  useTheme, useMediaQuery
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Brush as BrushIcon,
  ChevronLeft as CollapseIcon,
  ChevronRight as ExpandIcon,
} from '@mui/icons-material';
import { PlotConfigProvider } from './context/PlotConfigContext';
import DataImporter from './components/DataImporter';
import PlotTypeSelector from './components/PlotTypeSelector';
import PlotCanvas from './components/PlotCanvas';
import CustomizationPanel from './components/CustomizationPanel';
import ExportPanel from './components/ExportPanel';

const PublicationPlotBuilderInner = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const canvasRef = useRef(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const isDarkMode = theme.palette.mode === 'dark';

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <Box
        sx={{
          px: 3, py: 1.5,
          borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          bgcolor: isDarkMode ? 'background.paper' : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <BrushIcon sx={{ color: theme.palette.primary.main }} />
        <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
          Publication Plot Builder
        </Typography>
        <ExportPanel canvasRef={canvasRef} onExport={showSnackbar} />
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Sidebar - Data & Plot Type */}
        <Box
          sx={{
            width: isMobile ? '100%' : 260,
            flexShrink: 0,
            borderRight: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            overflowY: 'auto',
            bgcolor: isDarkMode ? alpha(theme.palette.background.paper, 0.5) : '#fafafa',
            p: 1.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          <DataImporter />
          <PlotTypeSelector />
        </Box>

        {/* Center - Canvas */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
            bgcolor: isDarkMode ? 'background.default' : '#e8e8e8',
          }}
        >
          <PlotCanvas ref={canvasRef} />
        </Box>

        {/* Right Sidebar - Customization */}
        {!isMobile && (
          <Box
            sx={{
              width: rightPanelOpen ? 280 : 36,
              flexShrink: 0,
              borderLeft: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              overflowY: 'auto',
              bgcolor: isDarkMode ? alpha(theme.palette.background.paper, 0.5) : '#fafafa',
              transition: 'width 0.2s',
              position: 'relative',
            }}
          >
            <Tooltip title={rightPanelOpen ? 'Collapse panel' : 'Expand panel'}>
              <IconButton
                size="small"
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                sx={{
                  position: 'absolute',
                  left: -16,
                  top: 12,
                  zIndex: 1,
                  bgcolor: isDarkMode ? 'background.paper' : '#ffffff',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  '&:hover': { bgcolor: isDarkMode ? 'background.default' : '#f0f0f0' },
                }}
              >
                {rightPanelOpen ? <ExpandIcon fontSize="small" /> : <CollapseIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            {rightPanelOpen && (
              <Box sx={{ p: 1.5 }}>
                <CustomizationPanel />
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

const PublicationPlotBuilder = () => (
  <PlotConfigProvider>
    <PublicationPlotBuilderInner />
  </PlotConfigProvider>
);

export default PublicationPlotBuilder;
