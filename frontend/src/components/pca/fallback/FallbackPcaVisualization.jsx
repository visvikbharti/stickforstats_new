import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
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
import * as d3 from 'd3';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10, schemeSet2, schemePaired } from 'd3-scale-chromatic';
import { saveSvgAsPng } from 'save-svg-as-png';
import { useSnackbar } from 'notistack';

import { fetchPcaVisualizationData } from '../../../api/pcaApi';

// This is a fallback implementation that doesn't depend on Three.js
// to avoid BatchedMesh compatibility errors

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
            value="2D"
            label="Plot Type"
            onChange={(e) => setPlotType(e.target.value)}
          >
            <MenuItem value="2D">2D Plot</MenuItem>
            <MenuItem value="3D" disabled>3D Plot (Disabled)</MenuItem>
          </Select>
        </FormControl>
        
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
          3D visualization is disabled in this build. Only 2D mode is available.
        </Typography>
        
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

// 2D Scatter Plot Component
const ScatterPlot2D = React.memo(({ 
  data, 
  xComponent, 
  yComponent, 
  markerSize, 
  colorPalette, 
  showLabels, 
  ellipseTransparency,
  plotRef 
}) => {
  useEffect(() => {
    if (!data || !data.sample_data || data.sample_data.length === 0 || !plotRef.current) {
      return;
    }

    // Render the 2D scatter plot
    const render2DScatterPlot = () => {
      // Clear previous visualization
      d3.select(plotRef.current).selectAll("*").remove();
      
      // Extract data
      const sampleData = data.sample_data;
      const uniqueGroups = Array.from(new Set(sampleData.map(d => d.group)));
      
      // Set up dimensions and margins
      const margin = { top: 40, right: 120, bottom: 60, left: 80 };
      const width = Math.min(800, plotRef.current.clientWidth) - margin.left - margin.right;
      const height = 500 - margin.top - margin.bottom;
      
      // Create SVG element
      const svg = d3.select(plotRef.current)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
      
      // Set up scales
      const xValues = sampleData.map(d => d.pc1);
      const yValues = sampleData.map(d => d.pc2);
      const xMin = Math.min(...xValues);
      const xMax = Math.max(...xValues);
      const yMin = Math.min(...yValues);
      const yMax = Math.max(...yValues);
      
      // Add some padding to the axes
      const xPadding = (xMax - xMin) * 0.1;
      const yPadding = (yMax - yMin) * 0.1;
      
      const xScale = d3.scaleLinear()
        .domain([xMin - xPadding, xMax + xPadding])
        .range([0, width]);
      
      const yScale = d3.scaleLinear()
        .domain([yMin - yPadding, yMax + yPadding])
        .range([height, 0]);
      
      // Create color scale
      let colorScale;
      if (colorPalette === 'Category10') {
        colorScale = scaleOrdinal(schemeCategory10);
      } else if (colorPalette === 'Set2') {
        colorScale = scaleOrdinal(schemeSet2);
      } else if (colorPalette === 'Paired') {
        colorScale = scaleOrdinal(schemePaired);
      } else {
        colorScale = scaleOrdinal(schemeCategory10);
      }
      colorScale.domain(uniqueGroups);
      
      // Create axes
      const xAxis = d3.axisBottom(xScale);
      const yAxis = d3.axisLeft(yScale);
      
      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis);
      
      svg.append("g")
        .call(yAxis);
      
      // Add axis labels
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .text(`PC${xComponent} (${data.explained_variance[xComponent-1].toFixed(2)}%)`);
      
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .text(`PC${yComponent} (${data.explained_variance[yComponent-1].toFixed(2)}%)`);
      
      // Add title
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("PCA Scatter Plot");
      
      // Add confidence ellipses if we have group centroids
      if (data.group_centroids) {
        const confidenceEllipse = (group, meanX, meanY) => {
          // Get group data
          const groupData = sampleData.filter(d => d.group === group);
          if (groupData.length < 3) return null; // Need at least 3 points for an ellipse
          
          // Calculate covariance matrix
          let xx = 0, xy = 0, yy = 0;
          groupData.forEach(d => {
            const dx = d.pc1 - meanX;
            const dy = d.pc2 - meanY;
            xx += dx * dx;
            xy += dx * dy;
            yy += dy * dy;
          });
          xx /= groupData.length;
          xy /= groupData.length;
          yy /= groupData.length;
          
          // Calculate eigenvalues and eigenvectors
          const trace = xx + yy;
          const determinant = xx * yy - xy * xy;
          const lambda1 = (trace + Math.sqrt(trace * trace - 4 * determinant)) / 2;
          const lambda2 = (trace - Math.sqrt(trace * trace - 4 * determinant)) / 2;
          
          let ex1 = 1;
          let ey1 = (lambda1 - xx) / xy;
          const len1 = Math.sqrt(ex1 * ex1 + ey1 * ey1);
          ex1 /= len1;
          ey1 /= len1;
          
          let ex2 = 1;
          let ey2 = (lambda2 - xx) / xy;
          const len2 = Math.sqrt(ex2 * ex2 + ey2 * ey2);
          ex2 /= len2;
          ey2 /= len2;
          
          // For a 95% confidence interval, use 2.447 for n=3
          // Adjust based on the number of samples
          const nSamples = groupData.length;
          let factor;
          if (nSamples <= 3) factor = 2.45;
          else if (nSamples <= 5) factor = 2.0;
          else if (nSamples <= 10) factor = 1.8;
          else factor = 1.96; // Asymptotic to normal distribution
          
          // Draw the ellipse
          const ellipsePath = [];
          for (let i = 0; i <= 360; i += 5) {
            const angle = (i * Math.PI) / 180;
            const x = meanX + factor * Math.sqrt(lambda1) * Math.cos(angle) * ex1 + factor * Math.sqrt(lambda2) * Math.sin(angle) * ex2;
            const y = meanY + factor * Math.sqrt(lambda1) * Math.cos(angle) * ey1 + factor * Math.sqrt(lambda2) * Math.sin(angle) * ey2;
            ellipsePath.push([xScale(x), yScale(y)]);
          }
          
          const ellipse = d3.line()(ellipsePath);
          
          return svg.append("path")
            .attr("d", ellipse)
            .attr("stroke", colorScale(group))
            .attr("stroke-width", 1.5)
            .attr("fill", colorScale(group))
            .attr("fill-opacity", ellipseTransparency)
            .attr("stroke-opacity", 0.8);
        };
        
        // Draw ellipses for each group
        Object.entries(data.group_centroids).forEach(([group, centroid]) => {
          confidenceEllipse(group, centroid.PC1, centroid.PC2);
        });
      }
      
      // Plot data points
      const points = svg.selectAll("circle")
        .data(sampleData)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.pc1))
        .attr("cy", d => yScale(d.pc2))
        .attr("r", markerSize / 10)
        .attr("fill", d => colorScale(d.group))
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .attr("opacity", 0.8)
        .attr("class", "data-point");
      
      // Add sample labels if enabled
      if (showLabels) {
        svg.selectAll(".sample-label")
          .data(sampleData)
          .enter()
          .append("text")
          .attr("class", "sample-label")
          .attr("x", d => xScale(d.pc1) + (markerSize / 10) + 2)
          .attr("y", d => yScale(d.pc2) + 4)
          .text(d => d.sample_id)
          .attr("font-size", "10px")
          .attr("fill", "#333");
      }
      
      // Add tooltips
      points.append("title")
        .text(d => `${d.sample_id}\nGroup: ${d.group}\nPC${xComponent}: ${d.pc1.toFixed(3)}\nPC${yComponent}: ${d.pc2.toFixed(3)}`);
      
      // Add legend
      const legend = svg.append("g")
        .attr("transform", `translate(${width + 20}, 0)`);
      
      uniqueGroups.forEach((group, i) => {
        const legendRow = legend.append("g")
          .attr("transform", `translate(0, ${i * 20})`);
        
        legendRow.append("rect")
          .attr("width", 10)
          .attr("height", 10)
          .attr("fill", colorScale(group));
        
        legendRow.append("text")
          .attr("x", 15)
          .attr("y", 9)
          .attr("font-size", "12px")
          .text(group);
      });
      
      // Add interaction (zoom and pan)
      const zoom = d3.zoom()
        .scaleExtent([0.5, 5])
        .on("zoom", (event) => {
          svg.attr("transform", event.transform);
        });
      
      d3.select(plotRef.current).select("svg")
        .call(zoom);
    };

    render2DScatterPlot();
  }, [data, xComponent, yComponent, markerSize, colorPalette, showLabels, ellipseTransparency, plotRef]);

  return (
    <Box
      ref={plotRef}
      sx={{
        width: '100%',
        height: 500,
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center'
      }}
    />
  );
});

// Plot container with download buttons
const PlotContainer = React.memo(({ children, plotRef, filename }) => {
  // Function to handle download
  const handleDownload = useCallback(() => {
    if (!plotRef.current) return;
    
    const svgElement = plotRef.current.querySelector('svg');
    if (svgElement) {
      saveSvgAsPng(svgElement, `${filename}.png`, { scale: 2.0 });
    }
  }, [plotRef, filename]);

  return (
    <Box sx={{ 
      p: 1, 
      border: '1px solid divider',
      borderRadius: 1,
      position: 'relative'
    }}>
      <Box sx={{ 
        position: 'absolute', 
        top: 10, 
        right: 10, 
        zIndex: 2,
        display: 'flex',
        gap: 1
      }}>
        <Tooltip title="Download as PNG">
          <IconButton 
            onClick={handleDownload}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.7)' }}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="View fullscreen">
          <IconButton
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.7)' }}
          >
            <FullscreenIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      {children}
    </Box>
  );
});

// Fallback 3D component that shows a disabled message
const Fallback3DComponent = () => {
  return (
    <Box 
      sx={{
        width: '100%',
        height: 500,
        border: '1px solid #ddd',
        borderRadius: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        p: 3
      }}
    >
      <Typography variant="h6" color="text.secondary" gutterBottom>
        3D Visualization Disabled
      </Typography>
      <Typography variant="body2" color="text.secondary" align="center">
        3D visualization is disabled in this build. Please use the 2D visualization tab instead.
      </Typography>
      <Button
        variant="outlined"
        color="primary"
        sx={{ mt: 2 }}
      >
        Switch to 2D View
      </Button>
    </Box>
  );
};

// Main component
const FallbackPcaVisualization = ({ projectId, resultId, onNext }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
  const [plotType, setPlotType] = useState('2D');
  const [xComponent, setXComponent] = useState(1);
  const [yComponent, setYComponent] = useState(2);
  const [zComponent, setZComponent] = useState(3);
  const [markerSize, setMarkerSize] = useState(60);
  const [showLabels, setShowLabels] = useState(true);
  const [includeGeneLoadings, setIncludeGeneLoadings] = useState(true);
  const [topGenesCount, setTopGenesCount] = useState(10);
  const [colorPalette, setColorPalette] = useState('Category10');
  const [ellipseTransparency, setEllipseTransparency] = useState(0.2);

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
    // If selecting 3D tab, force back to 2D since 3D is disabled
    if (newValue === 0 && plotType === '3D') {
      setPlotType('2D');
    }
    setTabValue(newValue);
  }, [plotType]);

  return (
    <Box>
      {/* Real-time notification */}
      <RealtimeNotification
        show={updateAvailable}
        message={`${updateMessage} ${updateCount > 1 ? `(${updateCount} updates)` : ''}`}
        onClose={handleNotificationClose}
      />

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
                
                {/* Scatter Plot Tab */}
                <TabPanel value={tabValue} index={0}>
                  <PlotContainer plotRef={scatterplotRef} filename="pca_plot">
                    {plotType === '3D' ? (
                      <Fallback3DComponent />
                    ) : (
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
                    )}
                  </PlotContainer>
                </TabPanel>
                
                {/* Other tabs would go here */}
                <TabPanel value={tabValue} index={1}>
                  <Typography variant="h6" color="text.secondary" align="center">
                    Loading Plot
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Loading plot visualization is disabled in this build.
                  </Typography>
                </TabPanel>
                
                <TabPanel value={tabValue} index={2}>
                  <Typography variant="h6" color="text.secondary" align="center">
                    Gene Contribution
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Gene contribution visualization is disabled in this build.
                  </Typography>
                </TabPanel>
                
                <TabPanel value={tabValue} index={3}>
                  <Typography variant="h6" color="text.secondary" align="center">
                    Scree Plot
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Scree plot visualization is disabled in this build.
                  </Typography>
                </TabPanel>
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

export default FallbackPcaVisualization;