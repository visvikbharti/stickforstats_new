/**
 * Advanced Visualization Dashboard Component
 * ==========================================
 * Main component for rendering all advanced statistical visualizations
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Plot from 'react-plotly.js';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  ButtonGroup,
  IconButton,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Switch,
  FormControlLabel,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  CardActions,
  Fab,
  SpeedDial,
  SpeedDialIcon,
  SpeedDialAction
} from '@mui/material';

import {
  ThreeDRotation,
  Timeline,
  Dashboard,
  BubbleChart,
  ScatterPlot,
  ShowChart,
  PieChart,
  BarChart,
  Functions,
  CloudDownload,
  Print,
  Share,
  Settings,
  Fullscreen,
  FullscreenExit,
  PlayArrow,
  Pause,
  Refresh,
  ZoomIn,
  ZoomOut,
  CameraAlt,
  Palette,
  Info,
  Help,
  Save,
  FolderOpen,
  Assessment,
  Animation,
  Layers,
  NetworkCheck,
  Hub,
  Radar
} from '@mui/icons-material';

import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

// Import visualization service
import VisualizationService from '../../services/VisualizationService';
import StatisticsService from '../../services/StatisticsService';

// Import sub-components
import Plot3D from './Plot3D';
import AnimatedTimeSeries from './AnimatedTimeSeries';
import NetworkGraph from './NetworkGraph';
import StatisticalDashboard from './StatisticalDashboard';
import ExportDialog from './ExportDialog';

/**
 * Main Visualization Dashboard Component
 */
const VisualizationDashboard = ({
  data,
  testResults,
  visualizationType = 'auto',
  options = {},
  onExport,
  onShare,
  allowInteraction = true
}) => {
  const theme = useTheme();
  const plotRef = useRef(null);

  // State management
  const [plotData, setPlotData] = useState(null);
  const [plotLayout, setPlotLayout] = useState(null);
  const [plotConfig, setPlotConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPlotType, setSelectedPlotType] = useState(visualizationType);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('plotly_white');
  const [interactionMode, setInteractionMode] = useState('zoom');
  const [dashboardLayout, setDashboardLayout] = useState('2x2');
  const [notifications, setNotifications] = useState([]);

  // Visualization types with icons
  const visualizationTypes = [
    { value: 'scatter3d', label: '3D Scatter', icon: <ThreeDRotation /> },
    { value: 'timeseries', label: 'Time Series', icon: <Timeline /> },
    { value: 'dashboard', label: 'Dashboard', icon: <Dashboard /> },
    { value: 'heatmap', label: 'Heatmap', icon: <BubbleChart /> },
    { value: 'volcano', label: 'Volcano Plot', icon: <ScatterPlot /> },
    { value: 'parallel', label: 'Parallel Coords', icon: <ShowChart /> },
    { value: 'sankey', label: 'Sankey', icon: <Functions /> },
    { value: 'network', label: 'Network', icon: <Hub /> },
    { value: 'radar', label: 'Radar', icon: <Radar /> },
    { value: 'sunburst', label: 'Sunburst', icon: <PieChart /> },
    { value: 'correlation', label: 'Correlation', icon: <NetworkCheck /> },
    { value: 'decomposition', label: 'Decomposition', icon: <Layers /> }
  ];

  // Color themes
  const colorThemes = [
    { value: 'plotly_white', label: 'Light' },
    { value: 'plotly_dark', label: 'Dark' },
    { value: 'ggplot2', label: 'GGPlot2' },
    { value: 'seaborn', label: 'Seaborn' },
    { value: 'simple_white', label: 'Minimal' },
    { value: 'presentation', label: 'Presentation' }
  ];

  /**
   * Load visualization data
   */
  useEffect(() => {
    loadVisualization();
  }, [selectedPlotType, data, testResults]);

  /**
   * Load visualization from backend
   */
  const loadVisualization = async () => {
    if (!data) return;

    setLoading(true);
    setError(null);

    try {
      const response = await VisualizationService.createVisualization({
        type: selectedPlotType,
        data: data,
        testResults: testResults,
        options: {
          ...options,
          theme: selectedTheme,
          interactive: allowInteraction
        }
      });

      setPlotData(response.data);
      setPlotLayout(response.layout);
      setPlotConfig(response.config);

      // Show success notification
      addNotification('Visualization loaded successfully', 'success');
    } catch (err) {
      setError(err.message);
      addNotification('Failed to load visualization', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle plot type change
   */
  const handlePlotTypeChange = (event, newValue) => {
    if (newValue !== null) {
      setSelectedPlotType(newValue);
    }
  };

  /**
   * Toggle fullscreen mode
   */
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      plotRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  /**
   * Handle export
   */
  const handleExport = async (format, options) => {
    try {
      const exportData = await VisualizationService.exportVisualization({
        plotData,
        plotLayout,
        format,
        options
      });

      if (onExport) {
        onExport(exportData);
      }

      // Download file
      if (format === 'svg' || format === 'png') {
        const blob = new Blob([exportData.content], { type: `image/${format}` });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visualization.${format}`;
        a.click();
      }

      addNotification(`Exported as ${format.toUpperCase()}`, 'success');
    } catch (err) {
      addNotification('Export failed', 'error');
    }
  };

  /**
   * Handle share
   */
  const handleShare = async () => {
    try {
      const shareUrl = await VisualizationService.shareVisualization({
        plotData,
        plotLayout
      });

      if (onShare) {
        onShare(shareUrl);
      }

      // Copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      addNotification('Share link copied to clipboard', 'success');
    } catch (err) {
      addNotification('Sharing failed', 'error');
    }
  };

  /**
   * Add notification
   */
  const addNotification = (message, severity = 'info') => {
    setNotifications(prev => [...prev, { message, severity, id: Date.now() }]);
  };

  /**
   * Remove notification
   */
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  /**
   * Render main plot
   */
  const renderPlot = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height={400}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      );
    }

    if (!plotData) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height={400}>
          <Typography variant="body1" color="textSecondary">
            No data to visualize
          </Typography>
        </Box>
      );
    }

    // Render based on plot type
    switch (selectedPlotType) {
      case 'scatter3d':
        return (
          <Plot3D
            data={plotData}
            layout={plotLayout}
            config={plotConfig}
            onUpdate={setPlotData}
          />
        );

      case 'timeseries':
        return (
          <AnimatedTimeSeries
            data={plotData}
            layout={plotLayout}
            config={plotConfig}
            isAnimating={isAnimating}
            onToggleAnimation={() => setIsAnimating(!isAnimating)}
          />
        );

      case 'dashboard':
        return (
          <StatisticalDashboard
            testResults={testResults}
            data={data}
            layout={dashboardLayout}
            theme={selectedTheme}
          />
        );

      case 'network':
        return (
          <NetworkGraph
            data={plotData}
            layout={plotLayout}
            config={plotConfig}
            interactionMode={interactionMode}
          />
        );

      default:
        return (
          <Plot
            data={plotData}
            layout={{
              ...plotLayout,
              autosize: true,
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent'
            }}
            config={{
              ...plotConfig,
              responsive: true,
              displayModeBar: allowInteraction,
              displaylogo: false
            }}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler={true}
          />
        );
    }
  };

  /**
   * Render controls
   */
  const renderControls = () => (
    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
      <Grid container spacing={2} alignItems="center">
        {/* Plot type selector */}
        <Grid item xs={12} md={6}>
          <Tabs
            value={selectedPlotType}
            onChange={handlePlotTypeChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ minHeight: 48 }}
          >
            {visualizationTypes.map(type => (
              <Tab
                key={type.value}
                value={type.value}
                label={type.label}
                icon={type.icon}
                iconPosition="start"
                sx={{ minHeight: 48 }}
              />
            ))}
          </Tabs>
        </Grid>

        {/* Action buttons */}
        <Grid item xs={12} md={6}>
          <Box display="flex" justifyContent="flex-end" gap={1}>
            <ButtonGroup variant="outlined" size="small">
              <Tooltip title="Refresh">
                <Button onClick={loadVisualization}>
                  <Refresh />
                </Button>
              </Tooltip>
              <Tooltip title="Fullscreen">
                <Button onClick={toggleFullscreen}>
                  {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
                </Button>
              </Tooltip>
              <Tooltip title="Settings">
                <Button onClick={() => setShowSettings(!showSettings)}>
                  <Settings />
                </Button>
              </Tooltip>
            </ButtonGroup>

            <ButtonGroup variant="contained" size="small">
              <Button
                startIcon={<CloudDownload />}
                onClick={() => setShowExportDialog(true)}
              >
                Export
              </Button>
              <Button
                startIcon={<Share />}
                onClick={handleShare}
              >
                Share
              </Button>
            </ButtonGroup>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  /**
   * Render settings panel
   */
  const renderSettings = () => (
    <Drawer
      anchor="right"
      open={showSettings}
      onClose={() => setShowSettings(false)}
      sx={{ '& .MuiDrawer-paper': { width: 320 } }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Visualization Settings
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {/* Theme selector */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Color Theme</InputLabel>
          <Select
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
            label="Color Theme"
          >
            {colorThemes.map(theme => (
              <MenuItem key={theme.value} value={theme.value}>
                {theme.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Dashboard layout selector */}
        {selectedPlotType === 'dashboard' && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Dashboard Layout</InputLabel>
            <Select
              value={dashboardLayout}
              onChange={(e) => setDashboardLayout(e.target.value)}
              label="Dashboard Layout"
            >
              <MenuItem value="2x2">2x2 Grid</MenuItem>
              <MenuItem value="3x2">3x2 Grid</MenuItem>
              <MenuItem value="1x4">Single Row</MenuItem>
              <MenuItem value="4x1">Single Column</MenuItem>
            </Select>
          </FormControl>
        )}

        {/* Interaction mode */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Interaction Mode</InputLabel>
          <Select
            value={interactionMode}
            onChange={(e) => setInteractionMode(e.target.value)}
            label="Interaction Mode"
          >
            <MenuItem value="zoom">Zoom</MenuItem>
            <MenuItem value="pan">Pan</MenuItem>
            <MenuItem value="select">Select</MenuItem>
            <MenuItem value="lasso">Lasso</MenuItem>
          </Select>
        </FormControl>

        {/* Animation controls */}
        {(selectedPlotType === 'timeseries' || selectedPlotType === 'scatter3d') && (
          <FormControlLabel
            control={
              <Switch
                checked={isAnimating}
                onChange={(e) => setIsAnimating(e.target.checked)}
              />
            }
            label="Enable Animation"
            sx={{ mb: 2 }}
          />
        )}

        <Divider sx={{ my: 2 }} />

        {/* Plot-specific settings */}
        <Typography variant="subtitle2" gutterBottom>
          Advanced Options
        </Typography>

        <List dense>
          <ListItem>
            <ListItemText
              primary="Show Grid"
              secondary="Display grid lines"
            />
            <Switch defaultChecked />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Show Legend"
              secondary="Display plot legend"
            />
            <Switch defaultChecked />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Auto-scale"
              secondary="Automatically adjust axes"
            />
            <Switch defaultChecked />
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );

  return (
    <Paper
      ref={plotRef}
      elevation={3}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        bgcolor: theme.palette.background.paper
      }}
    >
      {/* Controls */}
      {renderControls()}

      {/* Main visualization area */}
      <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
        {renderPlot()}
      </Box>

      {/* Settings drawer */}
      {renderSettings()}

      {/* Export dialog */}
      <ExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={handleExport}
        plotData={plotData}
        plotLayout={plotLayout}
      />

      {/* Notifications */}
      {notifications.map(notification => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={4000}
          onClose={() => removeNotification(notification.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Alert
            onClose={() => removeNotification(notification.id)}
            severity={notification.severity}
            variant="filled"
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}

      {/* Floating action button for quick actions */}
      <SpeedDial
        ariaLabel="Quick Actions"
        sx={{ position: 'absolute', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
        hidden={!allowInteraction}
      >
        <SpeedDialAction
          icon={<CameraAlt />}
          tooltipTitle="Screenshot"
          onClick={() => handleExport('png', { scale: 2 })}
        />
        <SpeedDialAction
          icon={<Save />}
          tooltipTitle="Save"
          onClick={() => handleExport('json', {})}
        />
        <SpeedDialAction
          icon={<Print />}
          tooltipTitle="Print"
          onClick={() => window.print()}
        />
        <SpeedDialAction
          icon={<Help />}
          tooltipTitle="Help"
          onClick={() => window.open('/docs/visualization', '_blank')}
        />
      </SpeedDial>
    </Paper>
  );
};

export default VisualizationDashboard;