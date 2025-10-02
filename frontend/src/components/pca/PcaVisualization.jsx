import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  useMediaQuery,
  LinearProgress,
  Snackbar,
  Fade,
  Badge,
  Chip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DownloadIcon from '@mui/icons-material/Download';
import SettingsIcon from '@mui/icons-material/Settings';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useSnackbar } from 'notistack';

// Import API
import { fetchPcaVisualizationData } from '../../api/pcaApi';

// Import visualization components lazily
import { 
  ScatterPlot2D, 
  ScatterPlot3D, 
  LoadingPlot, 
  GeneContributionPlot, 
  ScreePlot, 
  PlotContainer 
} from './LazyVisualizationComponents';

// Helper Components
const TabPanel = React.memo(({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`pca-viz-tabpanel-${index}`}
      aria-labelledby={`pca-viz-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
});

// Loading component for lazy-loaded visualization components
const VisualizationLoading = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, width: '100%' }}>
    <CircularProgress />
  </Box>
);

// Realtime data notification component
const RealtimeNotification = React.memo(({ show, message, onClose }) => {
  return (
    <Snackbar
      open={show}
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      TransitionComponent={Fade}
    >
      <Alert
        severity="info"
        variant="filled"
        action={
          <IconButton size="small" color="inherit" onClick={onClose}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        }
      >
        {message}
      </Alert>
    </Snackbar>
  );
});

// Header with controls
const VisualizationHeader = React.memo(({ 
  title, 
  lastUpdate, 
  wsConnected, 
  updateCount, 
  loading, 
  realtimeEnabled, 
  visualizationData,
  onRefresh, 
  onToggleRealtime 
}) => (
  <>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h5">
        {title}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {wsConnected && (
          <Chip
            size="small"
            color="success"
            label="Connected"
            icon={<AutorenewIcon fontSize="small" />}
            variant="outlined"
          />
        )}

        <Tooltip title="Refresh visualization data">
          <IconButton
            color="primary"
            onClick={onRefresh}
            disabled={loading}
            size="small"
          >
            <Badge badgeContent={updateCount > 0 ? updateCount : null} color="error">
              <RefreshIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        <Tooltip title={realtimeEnabled ? "Turn off real-time updates" : "Turn on real-time updates"}>
          <IconButton
            color={realtimeEnabled ? "primary" : "default"}
            onClick={onToggleRealtime}
            size="small"
          >
            <NotificationsIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Export visualization">
          <IconButton
            color="primary"
            onClick={() => alert('Export visualization data')}
            size="small"
            disabled={!visualizationData}
          >
            <FileDownloadIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>

    <Typography paragraph>
      Visualize the results of your Principal Component Analysis. Explore patterns in your data,
      understand gene contributions, and analyze the variance explained by each component.
      {lastUpdate && (
        <Typography variant="caption" component="span" sx={{ ml: 1, color: 'text.secondary' }}>
          Last updated: {lastUpdate.toLocaleTimeString()}
        </Typography>
      )}
    </Typography>
  </>
));

// Visualization Settings Panel
const VisualizationSettings = React.memo(({ 
  plotType, setPlotType,
  xComponent, setXComponent,
  yComponent, setYComponent,
  zComponent, setZComponent,
  markerSize, setMarkerSize,
  ellipseTransparency, setEllipseTransparency,
  colorPalette, setColorPalette,
  showLabels, setShowLabels,
  includeGeneLoadings, setIncludeGeneLoadings,
  topGenesCount, setTopGenesCount,
}) => {
  const disable3D = process.env.REACT_APP_DISABLE_3D === 'true';
  
  return (
    <Card elevation={3}>
      <CardHeader
        title="Visualization Settings"
        subheader="Customize your PCA plots"
        avatar={<SettingsIcon color="primary" />}
      />
      <CardContent>
        <FormControl fullWidth margin="normal">
          <InputLabel id="plot-type-label">Plot Type</InputLabel>
          <Select
            labelId="plot-type-label"
            value={plotType}
            label="Plot Type"
            onChange={(e) => setPlotType(e.target.value)}
            disabled={disable3D}
          >
            <MenuItem value="2D">2D Plot</MenuItem>
            <MenuItem value="3D" disabled={disable3D}>
              3D Plot {disable3D ? "(Disabled)" : ""}
            </MenuItem>
          </Select>
        </FormControl>
        {disable3D && plotType === '3D' && (
          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
            3D visualization is currently disabled. Using 2D mode.
          </Typography>
        )}
        
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="x-component-label">X-Axis</InputLabel>
              <Select
                labelId="x-component-label"
                value={xComponent}
                label="X-Axis"
                onChange={(e) => setXComponent(e.target.value)}
              >
                {[1, 2, 3, 4, 5].map(num => (
                  <MenuItem key={num} value={num}>PC{num}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="y-component-label">Y-Axis</InputLabel>
              <Select
                labelId="y-component-label"
                value={yComponent}
                label="Y-Axis"
                onChange={(e) => setYComponent(e.target.value)}
              >
                {[1, 2, 3, 4, 5].map(num => (
                  <MenuItem key={num} value={num}>PC{num}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {plotType === '3D' && !disable3D && (
            <Grid item xs={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="z-component-label">Z-Axis</InputLabel>
                <Select
                  labelId="z-component-label"
                  value={zComponent}
                  label="Z-Axis"
                  onChange={(e) => setZComponent(e.target.value)}
                >
                  {[1, 2, 3, 4, 5].map(num => (
                    <MenuItem key={num} value={num}>PC{num}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
        </Grid>
        
        <Box sx={{ mt: 3 }}>
          <Typography gutterBottom>
            Marker Size
          </Typography>
          <Slider
            value={markerSize}
            onChange={(e, newValue) => setMarkerSize(newValue)}
            min={20}
            max={120}
            step={10}
          />
        </Box>
        
        <Box sx={{ mt: 3 }}>
          <Typography gutterBottom>
            Confidence Ellipse Transparency
          </Typography>
          <Slider
            value={ellipseTransparency}
            onChange={(e, newValue) => setEllipseTransparency(newValue)}
            min={0}
            max={0.5}
            step={0.05}
          />
        </Box>
        
        <FormControl fullWidth margin="normal">
          <InputLabel id="color-palette-label">Color Palette</InputLabel>
          <Select
            labelId="color-palette-label"
            value={colorPalette}
            label="Color Palette"
            onChange={(e) => setColorPalette(e.target.value)}
          >
            <MenuItem value="Category10">Category 10</MenuItem>
            <MenuItem value="Set2">Set 2</MenuItem>
            <MenuItem value="Paired">Paired</MenuItem>
          </Select>
        </FormControl>
        
        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
              />
            }
            label="Show sample labels"
          />
        </Box>
        
        <Box sx={{ mt: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={includeGeneLoadings}
                onChange={(e) => setIncludeGeneLoadings(e.target.checked)}
              />
            }
            label="Show gene loadings"
          />
        </Box>
        
        {includeGeneLoadings && (
          <Box sx={{ mt: 2, ml: 3 }}>
            <Typography gutterBottom variant="body2">
              Top genes to highlight
            </Typography>
            <Slider
              value={topGenesCount}
              onChange={(e, newValue) => setTopGenesCount(newValue)}
              min={5}
              max={30}
              step={5}
              marks
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
});

// Main component
const PcaVisualization = ({ projectId, resultId, onNext }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const disable3D = process.env.REACT_APP_DISABLE_3D === 'true';

  // Refs for visualizations
  const scatterplotRef = useRef(null);
  const loadingPlotRef = useRef(null);
  const geneContributionRef = useRef(null);
  const screePlotRef = useRef(null);

  // Tab state
  const [tabValue, setTabValue] = useState(0);

  // Visualization data
  const [visualizationData, setVisualizationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Websocket state
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateCount, setUpdateCount] = useState(0);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);

  // Visualization settings
  const [plotType, setPlotType] = useState(disable3D ? '2D' : '2D');
  const [xComponent, setXComponent] = useState(1);
  const [yComponent, setYComponent] = useState(2);
  const [zComponent, setZComponent] = useState(3);
  const [markerSize, setMarkerSize] = useState(60);
  const [showLabels, setShowLabels] = useState(true);
  const [includeGeneLoadings, setIncludeGeneLoadings] = useState(true);
  const [topGenesCount, setTopGenesCount] = useState(10);
  const [colorPalette, setColorPalette] = useState('Category10');
  const [ellipseTransparency, setEllipseTransparency] = useState(0.2);

  // WebSocket connection setup
  useEffect(() => {
    if (!projectId || !resultId || !realtimeEnabled) return;

    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/pca_analysis/${projectId}/${resultId}/`;
    const ws = new WebSocket(wsUrl);

    // Set up WebSocket event handlers
    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'new_visualization' || data.type === 'update_visualization') {
          // Handle new visualization data
          setUpdateAvailable(true);
          setUpdateCount(prev => prev + 1);
          setLastUpdate(new Date());
          setUpdateMessage(data.message || 'New visualization data available');

          // If auto-refresh is enabled, update visualization immediately
          if (realtimeEnabled) {
            loadVisualizationData();
          }
        } else if (data.type === 'analysis_status') {
          // Handle analysis status updates
          console.log('Analysis status update:', data.status);
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Clean up WebSocket on unmount
    return () => {
      ws.close();
    };
  }, [projectId, resultId, realtimeEnabled]);

  // Function to handle notification close
  const handleNotificationClose = useCallback((event, reason) => {
    if (reason === 'clickaway') return;
    setUpdateAvailable(false);
  }, []);

  // Function to manually refresh visualization
  const handleRefreshVisualization = useCallback(() => {
    loadVisualizationData();
    setUpdateAvailable(false);
    setUpdateCount(0);
  }, []);
  
  // Toggle realtime updates
  const handleToggleRealtime = useCallback(() => {
    setRealtimeEnabled(prev => !prev);
  }, []);

  useEffect(() => {
    if (resultId) {
      loadVisualizationData();
    }
  }, [resultId, plotType, xComponent, yComponent, zComponent, includeGeneLoadings, topGenesCount]);

  const loadVisualizationData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchPcaVisualizationData(resultId, {
        plot_type: plotType,
        x_component: xComponent,
        y_component: yComponent,
        z_component: plotType === '3D' ? zComponent : null,
        include_gene_loadings: includeGeneLoadings,
        top_genes_count: topGenesCount
      });
      
      setVisualizationData(data);
    } catch (err) {
      setError(`Failed to load visualization: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = useCallback((event, newValue) => {
    setTabValue(newValue);
  }, []);

  // Handle component changes in gene contribution plot
  const handleXComponentChange = useCallback((value) => {
    setXComponent(value);
  }, []);

  const handleTopGenesCountChange = useCallback((value) => {
    setTopGenesCount(value);
  }, []);

  // Memoize the header component
  const header = useMemo(() => (
    <VisualizationHeader
      title="PCA Visualization"
      lastUpdate={lastUpdate}
      wsConnected={wsConnected}
      updateCount={updateCount}
      loading={loading}
      realtimeEnabled={realtimeEnabled}
      visualizationData={visualizationData}
      onRefresh={handleRefreshVisualization}
      onToggleRealtime={handleToggleRealtime}
    />
  ), [
    lastUpdate, 
    wsConnected, 
    updateCount, 
    loading, 
    realtimeEnabled, 
    visualizationData, 
    handleRefreshVisualization, 
    handleToggleRealtime
  ]);

  // Memoize settings panel
  const settingsPanel = useMemo(() => (
    <VisualizationSettings
      plotType={plotType}
      setPlotType={setPlotType}
      xComponent={xComponent}
      setXComponent={setXComponent}
      yComponent={yComponent}
      setYComponent={setYComponent}
      zComponent={zComponent}
      setZComponent={setZComponent}
      markerSize={markerSize}
      setMarkerSize={setMarkerSize}
      ellipseTransparency={ellipseTransparency}
      setEllipseTransparency={setEllipseTransparency}
      colorPalette={colorPalette}
      setColorPalette={setColorPalette}
      showLabels={showLabels}
      setShowLabels={setShowLabels}
      includeGeneLoadings={includeGeneLoadings}
      setIncludeGeneLoadings={setIncludeGeneLoadings}
      topGenesCount={topGenesCount}
      setTopGenesCount={setTopGenesCount}
    />
  ), [
    plotType, 
    xComponent, 
    yComponent, 
    zComponent, 
    markerSize, 
    ellipseTransparency, 
    colorPalette, 
    showLabels, 
    includeGeneLoadings, 
    topGenesCount
  ]);

  // Memoize tab content
  const tabContent = useMemo(() => [
    // Scatter Plot Tab
    <TabPanel key="scatter" value={tabValue} index={0}>
      <Suspense fallback={<VisualizationLoading />}>
        <PlotContainer plotRef={scatterplotRef} filename="pca_plot">
          {plotType === '2D' ? (
            <ScatterPlot2D
              data={visualizationData}
              xComponent={xComponent}
              yComponent={yComponent}
              markerSize={markerSize}
              colorPalette={colorPalette}
              showLabels={showLabels}
              ellipseTransparency={ellipseTransparency}
              plotRef={scatterplotRef}
            />
          ) : (
            <ScatterPlot3D
              data={visualizationData}
              xComponent={xComponent}
              yComponent={yComponent}
              zComponent={zComponent}
              markerSize={markerSize}
              colorPalette={colorPalette}
              showLabels={showLabels}
              loading={loading}
            />
          )}
        </PlotContainer>
      </Suspense>
    </TabPanel>,
    
    // Loading Plot Tab
    <TabPanel key="loading" value={tabValue} index={1}>
      <Suspense fallback={<VisualizationLoading />}>
        <PlotContainer plotRef={loadingPlotRef} filename="loading_plot">
          <LoadingPlot
            data={visualizationData}
            xComponent={xComponent}
            yComponent={yComponent}
            plotRef={loadingPlotRef}
          />
        </PlotContainer>
      </Suspense>
    </TabPanel>,
    
    // Gene Contribution Tab
    <TabPanel key="genes" value={tabValue} index={2}>
      <Suspense fallback={<VisualizationLoading />}>
        <PlotContainer plotRef={geneContributionRef} filename="gene_contribution">
          <GeneContributionPlot
            data={visualizationData}
            xComponent={xComponent}
            topGenesCount={topGenesCount}
            plotRef={geneContributionRef}
            onChangeXComponent={handleXComponentChange}
            onChangeTopGenesCount={handleTopGenesCountChange}
          />
        </PlotContainer>
      </Suspense>
    </TabPanel>,
    
    // Scree Plot Tab
    <TabPanel key="scree" value={tabValue} index={3}>
      <Suspense fallback={<VisualizationLoading />}>
        <PlotContainer plotRef={screePlotRef} filename="scree_plot">
          <ScreePlot
            data={visualizationData}
            plotRef={screePlotRef}
          />
        </PlotContainer>
      </Suspense>
    </TabPanel>
  ], [
    tabValue, 
    visualizationData, 
    plotType, 
    xComponent, 
    yComponent, 
    zComponent, 
    markerSize, 
    colorPalette, 
    showLabels, 
    ellipseTransparency, 
    topGenesCount, 
    loading,
    handleXComponentChange,
    handleTopGenesCountChange,
    scatterplotRef,
    loadingPlotRef,
    geneContributionRef,
    screePlotRef
  ]);

  return (
    <Box>
      {/* Real-time notification */}
      <RealtimeNotification
        show={updateAvailable}
        message={`${updateMessage} ${updateCount > 1 ? `(${updateCount} updates)` : ''}`}
        onClose={handleNotificationClose}
      />

      {header}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && tabValue !== 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Loading visualization data...
          </Typography>
        </Box>
      )}

      {!loading || tabValue === 0 ? (
        <Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              {settingsPanel}
            </Grid>
            
            <Grid item xs={12} md={8}>
              <Box sx={{ width: '100%' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    aria-label="PCA visualization tabs"
                  >
                    <Tab label="PCA Plot" />
                    <Tab label="Loading Plot" />
                    <Tab label="Gene Contribution" />
                    <Tab label="Scree Plot" />
                  </Tabs>
                </Box>
                
                {/* Render tabs */}
                {tabContent[tabValue]}
              </Box>
            </Grid>
          </Grid>
        </Box>
      ) : null}
      
      <Divider sx={{ my: 4 }} />
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={onNext}
        >
          Continue to Interpretation
        </Button>
      </Box>
    </Box>
  );
};

export default PcaVisualization;