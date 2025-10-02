import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import * as d3 from 'd3';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10, schemeSet2, schemePaired } from 'd3-scale-chromatic';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { saveSvgAsPng } from 'save-svg-as-png';
import { useSnackbar } from 'notistack';

import { fetchPcaVisualizationData } from '../../api/pcaApi';

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

// 3D Point component for Three.js
const Point3D = React.memo(({ position, color, size, label, showLabels }) => {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {showLabels && label && (
        <Text
          position={[0, size * 1.5, 0]}
          fontSize={size * 2}
          color="black"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      )}
    </group>
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
            value={plotType}
            label="Plot Type"
            onChange={(e) => setPlotType(e.target.value)}
          >
            <MenuItem value="2D">2D Plot</MenuItem>
            <MenuItem value="3D">3D Plot</MenuItem>
          </Select>
        </FormControl>
        
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
          
          {plotType === '3D' && (
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

// 3D Scatter Plot Component
const ScatterPlot3D = React.memo(({ 
  data, 
  xComponent, 
  yComponent, 
  zComponent, 
  markerSize, 
  colorPalette, 
  showLabels, 
  loading 
}) => {
  const theme = useTheme();

  // Memoize unique groups and color scale
  const uniqueGroups = useMemo(() => {
    if (!data || !data.sample_data) return [];
    return Array.from(new Set(data.sample_data.map(d => d.group)));
  }, [data]);

  // Memoize color scale
  const colorScale = useMemo(() => {
    let scale;
    if (colorPalette === 'Category10') {
      scale = scaleOrdinal(schemeCategory10);
    } else if (colorPalette === 'Set2') {
      scale = scaleOrdinal(schemeSet2);
    } else {
      scale = scaleOrdinal(schemePaired);
    }
    scale.domain(uniqueGroups);
    return scale;
  }, [colorPalette, uniqueGroups]);

  // Memoize 3D points to avoid expensive recalculations
  const points3D = useMemo(() => {
    if (!data || !data.sample_data) return [];
    
    return data.sample_data.map((sample, index) => {
      // Calculate 3D position from PC values
      const pos = [
        sample.pc1 * 2, // Scale for better visualization
        sample.pc2 * 2,
        (sample.pc3 || 0) * 2
      ];

      const color = colorScale(sample.group);

      return (
        <Point3D
          key={index}
          position={pos}
          color={color}
          size={markerSize / 500}
          label={sample.sample_id}
          showLabels={showLabels}
        />
      );
    });
  }, [data, markerSize, showLabels, colorScale]);

  // Memoize legend items
  const legendItems = useMemo(() => {
    if (!uniqueGroups.length) return null;
    
    return uniqueGroups.map((group, idx) => (
      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        <Box sx={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          bgcolor: colorScale(group),
          mr: 1
        }} />
        <Typography variant="caption">{group}</Typography>
      </Box>
    ));
  }, [uniqueGroups, colorScale]);

  // Memoize axis labels
  const axisLabels = useMemo(() => (
    <>
      {/* X axis */}
      <line>
        <bufferGeometry
          attach="geometry"
          {...{
            attributes: {
              position: {
                array: new Float32Array([-2, 0, 0, 2, 0, 0]),
                itemSize: 3,
                count: 2
              }
            }
          }}
        />
        <lineBasicMaterial attach="material" color="red" linewidth={2} />
      </line>
      <Text position={[2.2, 0, 0]} fontSize={0.2} color="red">PC{xComponent}</Text>

      {/* Y axis */}
      <line>
        <bufferGeometry
          attach="geometry"
          {...{
            attributes: {
              position: {
                array: new Float32Array([0, -2, 0, 0, 2, 0]),
                itemSize: 3,
                count: 2
              }
            }
          }}
        />
        <lineBasicMaterial attach="material" color="green" linewidth={2} />
      </line>
      <Text position={[0, 2.2, 0]} fontSize={0.2} color="green">PC{yComponent}</Text>

      {/* Z axis */}
      <line>
        <bufferGeometry
          attach="geometry"
          {...{
            attributes: {
              position: {
                array: new Float32Array([0, 0, -2, 0, 0, 2]),
                itemSize: 3,
                count: 2
              }
            }
          }}
        />
        <lineBasicMaterial attach="material" color="blue" linewidth={2} />
      </line>
      <Text position={[0, 0, 2.2]} fontSize={0.2} color="blue">PC{zComponent}</Text>
    </>
  ), [xComponent, yComponent, zComponent]);

  return (
    <Box sx={{
      width: '100%',
      height: 500,
      border: '1px solid #ddd',
      borderRadius: 1,
      position: 'relative'
    }}>
      {/* Real-time update indicator */}
      {loading && (
        <Box sx={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 10,
          bgcolor: 'rgba(255,255,255,0.8)',
          borderRadius: 1,
          px: 1,
          py: 0.5
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CircularProgress size={16} sx={{ mr: 1 }} />
            <Typography variant="caption">
              Updating...
            </Typography>
          </Box>
        </Box>
      )}

      {/* Settings overlay */}
      <Box sx={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 10,
        display: 'flex',
        gap: 0.5
      }}>
        <Tooltip title="Toggle labels">
          <IconButton
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.8)' }}
          >
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Download as PNG">
          <IconButton
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.8)' }}
            onClick={() => {
              alert('This would save the 3D visualization as PNG');
            }}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Legend overlay */}
      {data && (
        <Box sx={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          zIndex: 10,
          bgcolor: 'rgba(255,255,255,0.8)',
          borderRadius: 1,
          p: 1
        }}>
          {legendItems}
        </Box>
      )}

      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <hemisphereLight intensity={0.5} groundColor="blue" />

        {/* Add a subtle environment reflection */}
        <color attach="background" args={['#f5f5f5']} />

        {/* Render all the 3D points */}
        {points3D}

        {/* Add a grid helper */}
        <gridHelper args={[10, 10, '#cccccc', '#eeeeee']} rotation={[Math.PI / 2, 0, 0]} />

        {/* Add axes */}
        <group>
          {axisLabels}
        </group>

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxDistance={10}
          minDistance={2}
        />
      </Canvas>
    </Box>
  );
});

// Loading Plot Component
const LoadingPlot = React.memo(({ 
  data, 
  xComponent, 
  yComponent, 
  plotRef 
}) => {
  const theme = useTheme();

  useEffect(() => {
    if (!data || !data.gene_loadings || data.gene_loadings.length === 0 || !plotRef.current) {
      return;
    }

    // Clear previous visualization
    d3.select(plotRef.current).selectAll("*").remove();
    
    // Extract data
    const loadings = data.gene_loadings;
    
    // Set up dimensions and margins
    const margin = { top: 40, right: 40, bottom: 60, left: 80 };
    const width = Math.min(700, plotRef.current.clientWidth) - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
    
    // Create SVG element
    const svg = d3.select(plotRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Determine data bounds
    const maxAbs = Math.max(
      ...loadings.map(d => Math.abs(d.pc1_loading)),
      ...loadings.map(d => Math.abs(d.pc2_loading))
    );
    const domainBound = Math.max(maxAbs * 1.1, 0.1);
    
    // Set up scales
    const xScale = d3.scaleLinear()
      .domain([-domainBound, domainBound])
      .range([0, width]);
    
    const yScale = d3.scaleLinear()
      .domain([-domainBound, domainBound])
      .range([height, 0]);
    
    // Create axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);
    
    svg.append("g")
      .attr("transform", `translate(0,${height / 2})`)
      .call(xAxis);
    
    svg.append("g")
      .attr("transform", `translate(${width / 2},0)`)
      .call(yAxis);
    
    // Add axis labels
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 10)
      .text(`PC${xComponent} Loadings (${data.explained_variance[xComponent-1].toFixed(2)}%)`);
    
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 15)
      .text(`PC${yComponent} Loadings (${data.explained_variance[yComponent-1].toFixed(2)}%)`);
    
    // Add title
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", -margin.top / 2)
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text("Gene Loading Plot");
    
    // Add grid lines
    svg.append("line")
      .attr("x1", xScale(-domainBound))
      .attr("y1", yScale(0))
      .attr("x2", xScale(domainBound))
      .attr("y2", yScale(0))
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4");
    
    svg.append("line")
      .attr("x1", xScale(0))
      .attr("y1", yScale(-domainBound))
      .attr("x2", xScale(0))
      .attr("y2", yScale(domainBound))
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4");
    
    // Add a unit circle
    svg.append("circle")
      .attr("cx", xScale(0))
      .attr("cy", yScale(0))
      .attr("r", xScale(1) - xScale(0))
      .attr("fill", "none")
      .attr("stroke", "#aaa")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3");
    
    // Plot all genes as small gray dots
    const allGenes = svg.append("g").attr("class", "all-genes");
    
    // Plot background genes
    allGenes.selectAll("circle")
      .data(loadings)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.pc1_loading))
      .attr("cy", d => yScale(d.pc2_loading))
      .attr("r", 3)
      .attr("fill", "#aaa")
      .attr("opacity", 0.3);
    
    // Plot top genes
    const topGenes = svg.append("g").attr("class", "top-genes");
    
    topGenes.selectAll("circle")
      .data(loadings)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.pc1_loading))
      .attr("cy", d => yScale(d.pc2_loading))
      .attr("r", 5)
      .attr("fill", theme.palette.primary.main)
      .attr("stroke", "white")
      .attr("stroke-width", 1);
    
    // Add gene labels for top genes
    topGenes.selectAll("text")
      .data(loadings)
      .enter()
      .append("text")
      .attr("x", d => xScale(d.pc1_loading) + (d.pc1_loading > 0 ? 8 : -8))
      .attr("y", d => yScale(d.pc2_loading) + 4)
      .attr("text-anchor", d => d.pc1_loading > 0 ? "start" : "end")
      .text(d => d.gene_name)
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("fill", "#333");
    
    // Add arrows from origin to genes
    topGenes.selectAll("line")
      .data(loadings)
      .enter()
      .append("line")
      .attr("x1", xScale(0))
      .attr("y1", yScale(0))
      .attr("x2", d => xScale(d.pc1_loading))
      .attr("y2", d => yScale(d.pc2_loading))
      .attr("stroke", theme.palette.secondary.main)
      .attr("stroke-width", 1)
      .attr("opacity", 0.6)
      .attr("marker-end", "url(#arrow)");
    
    // Add arrowhead marker
    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 4)
      .attr("markerHeight", 4)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", theme.palette.secondary.main);

  }, [data, xComponent, yComponent, plotRef, theme]);

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

// Gene Contribution Plot Component
const GeneContributionPlot = React.memo(({ 
  data, 
  xComponent, 
  topGenesCount, 
  plotRef,
  onChangeXComponent,
  onChangeTopGenesCount 
}) => {
  const theme = useTheme();
  
  // Memoize mockPathways for stability
  const mockPathways = useMemo(() => [
    { id: 'p1', name: 'Cell Signaling', color: '#8dd3c7' },
    { id: 'p2', name: 'Metabolism', color: '#ffffb3' },
    { id: 'p3', name: 'Immune Response', color: '#bebada' },
    { id: 'p4', name: 'Cell Structure', color: '#fb8072' },
    { id: 'p5', name: 'Development', color: '#80b1d3' }
  ], []);
  
  useEffect(() => {
    if (!data || !data.gene_loadings || data.gene_loadings.length === 0 || !plotRef.current) {
      return;
    }
    
    // Clear previous visualization
    d3.select(plotRef.current).selectAll("*").remove();
    
    // Extract data
    const geneLoadings = data.gene_loadings;
    const pcIndex = xComponent - 1; // PC is 1-indexed, array is 0-indexed
    
    // Sort genes by absolute contribution to selected PC
    const sortedGenes = [...geneLoadings].sort((a, b) => {
      const aContrib = Math.abs(a[`pc${pcIndex + 1}_loading`]);
      const bContrib = Math.abs(b[`pc${pcIndex + 1}_loading`]);
      return bContrib - aContrib;
    });
    
    // Take top N genes
    const topGenes = sortedGenes.slice(0, topGenesCount);
    
    // Assign pathways to genes based on some pattern in gene name
    const genePathways = topGenes.map(gene => {
      const geneName = gene.gene_name.toLowerCase();
      let pathwayIds = [];
      
      // Simple rule-based assignment for demo purposes
      if (geneName.includes('a') || geneName.includes('b')) pathwayIds.push('p1');
      if (geneName.includes('c') || geneName.includes('d')) pathwayIds.push('p2');
      if (geneName.includes('e') || geneName.includes('f')) pathwayIds.push('p3');
      if (geneName.includes('g') || geneName.includes('h')) pathwayIds.push('p4');
      if (geneName.includes('i') || geneName.includes('j')) pathwayIds.push('p5');
      
      // If no pathways matched, assign a random one
      if (pathwayIds.length === 0) {
        pathwayIds.push(mockPathways[Math.floor(Math.random() * mockPathways.length)].id);
      }
      
      return {
        ...gene,
        pathways: pathwayIds.map(id => mockPathways.find(p => p.id === id))
      };
    });
    
    // Set up dimensions and margins
    const margin = { top: 40, right: 120, bottom: 60, left: 180 };
    const width = Math.min(700, plotRef.current.clientWidth) - margin.left - margin.right;
    const height = Math.max(topGenes.length * 30, 400) - margin.top - margin.bottom;
    
    // Create SVG element
    const svg = d3.select(plotRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Set up scales
    const xMax = Math.max(...topGenes.map(d => Math.abs(d[`pc${pcIndex + 1}_loading`])));
    const xPadding = xMax * 0.1;
    
    const xScale = d3.scaleLinear()
      .domain([-xMax - xPadding, xMax + xPadding])
      .range([0, width]);
    
    const yScale = d3.scaleBand()
      .domain(topGenes.map(d => d.gene_name))
      .range([0, height])
      .padding(0.2);
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d => d.toFixed(2));
    
    const yAxis = d3.axisLeft(yScale);
    
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis);
    
    svg.append("g")
      .call(yAxis)
      .selectAll(".tick text")
      .attr("font-size", "12px");
    
    // Add axis labels
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 10)
      .text(`Loading Value (Contribution to PC${pcIndex + 1})`);
    
    // Add title
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", -margin.top / 2)
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text(`Top ${topGenes.length} Gene Contributors to PC${pcIndex + 1}`);
    
    // Add subtitle
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", -margin.top / 2 + 20)
      .attr("font-size", "12px")
      .text(`Explained Variance: ${data.explained_variance[pcIndex].toFixed(2)}%`);
    
    // Add zero line
    svg.append("line")
      .attr("x1", xScale(0))
      .attr("y1", 0)
      .attr("x2", xScale(0))
      .attr("y2", height)
      .attr("stroke", "#888")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3");
    
    // Plot horizontal bars
    svg.selectAll(".gene-bar")
      .data(genePathways)
      .enter()
      .append("rect")
      .attr("class", "gene-bar")
      .attr("x", d => {
        const loadingValue = d[`pc${pcIndex + 1}_loading`];
        return loadingValue < 0 ? xScale(loadingValue) : xScale(0);
      })
      .attr("y", d => yScale(d.gene_name))
      .attr("width", d => {
        const loadingValue = d[`pc${pcIndex + 1}_loading`];
        return Math.abs(xScale(loadingValue) - xScale(0));
      })
      .attr("height", yScale.bandwidth())
      .attr("fill", d => d[`pc${pcIndex + 1}_loading`] > 0 ? theme.palette.primary.main : theme.palette.secondary.main)
      .attr("opacity", 0.8)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);
    
    // Add pathway indicators (small colored circles) next to gene names
    const pathwayIndicators = svg.append("g")
      .attr("class", "pathway-indicators");
    
    genePathways.forEach((gene) => {
      // Calculate position based on gene name
      const y = yScale(gene.gene_name) + yScale.bandwidth() / 2;
      
      // For each pathway, add a small colored circle
      gene.pathways.forEach((pathway, idx) => {
        pathwayIndicators.append("circle")
          .attr("cx", -margin.left + 150 + (idx * 15)) // Position circles in front of gene names
          .attr("cy", y)
          .attr("r", 5)
          .attr("fill", pathway.color)
          .attr("stroke", "#fff")
          .attr("stroke-width", 0.5)
          .attr("data-pathway", pathway.id)
          .append("title")
          .text(`${pathway.name} pathway`);
      });
    });
    
    // Add loading values
    svg.selectAll(".gene-value")
      .data(topGenes)
      .enter()
      .append("text")
      .attr("class", "gene-value")
      .attr("x", d => {
        const loadingValue = d[`pc${pcIndex + 1}_loading`];
        return loadingValue > 0 ?
          xScale(loadingValue) + 5 :
          xScale(loadingValue) - 5;
      })
      .attr("y", d => yScale(d.gene_name) + yScale.bandwidth() / 2 + 4)
      .attr("text-anchor", d => d[`pc${pcIndex + 1}_loading`] > 0 ? "start" : "end")
      .attr("font-size", "11px")
      .text(d => d[`pc${pcIndex + 1}_loading`].toFixed(3));
    
    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width + 20}, 0)`);
    
    // Positive contribution
    legend.append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", theme.palette.primary.main);
    
    legend.append("text")
      .attr("x", 20)
      .attr("y", 12)
      .text("Positive contribution");
    
    // Negative contribution
    legend.append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("y", 25)
      .attr("fill", theme.palette.secondary.main);
    
    legend.append("text")
      .attr("x", 20)
      .attr("y", 37)
      .text("Negative contribution");
    
    // Add description of gene contributions
    const description = svg.append("text")
      .attr("x", width / 2)
      .attr("y", -margin.top / 2 + 40)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("fill", "#555");
    
    description.append("tspan")
      .attr("x", width / 2)
      .text("Genes with larger absolute values have stronger influence on this principal component.");
    
    description.append("tspan")
      .attr("x", width / 2)
      .attr("dy", "1.2em")
      .text("Positive values indicate the gene increases in the direction of the PC, negative values decrease.");
    
    description.append("tspan")
      .attr("x", width / 2)
      .attr("dy", "1.2em")
      .text("Colored circles indicate associated biological pathways.");
    
    // Add pathway legend
    const pathwayLegend = svg.append("g")
      .attr("transform", `translate(${width + 20}, 70)`);
    
    pathwayLegend.append("text")
      .attr("font-weight", "bold")
      .attr("font-size", "12px")
      .text("Biological Pathways:");
    
    mockPathways.forEach((pathway, idx) => {
      pathwayLegend.append("circle")
        .attr("cx", 7.5)
        .attr("cy", 20 + (idx * 20))
        .attr("r", 5)
        .attr("fill", pathway.color)
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5);
      
      pathwayLegend.append("text")
        .attr("x", 20)
        .attr("y", 24 + (idx * 20))
        .attr("font-size", "11px")
        .text(pathway.name);
    });
    
    // Add interactive highlighting for pathways
    d3.selectAll("[data-pathway]").on("mouseover", function() {
      const pathway = d3.select(this).attr("data-pathway");
      d3.selectAll(`[data-pathway="${pathway}"]`)
        .attr("stroke-width", 2)
        .attr("r", 6);
    }).on("mouseout", function() {
      const pathway = d3.select(this).attr("data-pathway");
      d3.selectAll(`[data-pathway="${pathway}"]`)
        .attr("stroke-width", 0.5)
        .attr("r", 5);
    });
    
  }, [data, xComponent, topGenesCount, plotRef, theme, mockPathways]);

  return (
    <>
      {/* PC selector for gene contribution tab */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body2">
          Principal Component:
        </Typography>
        <Box sx={{ minWidth: 120 }}>
          <FormControl fullWidth size="small">
            <Select
              value={xComponent}
              onChange={(e) => onChangeXComponent(e.target.value)}
              displayEmpty
            >
              {[1, 2, 3, 4, 5].map((num) => (
                <MenuItem key={num} value={num}>
                  PC{num} ({data?.explained_variance[num-1]?.toFixed(2)}%)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Typography variant="body2" sx={{ ml: 2 }}>
          Top genes:
        </Typography>
        <Box sx={{ width: 150 }}>
          <Slider
            value={topGenesCount}
            onChange={(e, newValue) => onChangeTopGenesCount(newValue)}
            min={5}
            max={30}
            step={5}
            marks
            valueLabelDisplay="auto"
            size="small"
          />
        </Box>
      </Box>

      {/* Enhanced description */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        This visualization shows the top genes that contribute most to the selected principal component.
        Genes are ranked by their absolute loading values, which indicate their importance in defining this component.
        Positive values (blue) increase along the PC axis, while negative values (orange) decrease.
      </Typography>

      <Box
        ref={plotRef}
        sx={{
          width: '100%',
          height: 500,
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center'
        }}
      />
    </>
  );
});

// Scree Plot Component
const ScreePlot = React.memo(({ data, plotRef }) => {
  const theme = useTheme();

  useEffect(() => {
    if (!data || !data.explained_variance || data.explained_variance.length === 0 || !plotRef.current) {
      return;
    }
    
    // Clear previous visualization
    d3.select(plotRef.current).selectAll("*").remove();
    
    // Extract data
    const explainedVariance = data.explained_variance;
    const cumulativeVariance = data.cumulative_variance;
    
    // Set up dimensions and margins
    const margin = { top: 40, right: 80, bottom: 60, left: 80 };
    const width = Math.min(700, plotRef.current.clientWidth) - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    // Create SVG element
    const svg = d3.select(plotRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Set up scales
    const xScale = d3.scaleBand()
      .domain(explainedVariance.map((_, i) => i + 1))
      .range([0, width])
      .padding(0.2);
    
    const yScaleLeft = d3.scaleLinear()
      .domain([0, Math.max(...explainedVariance) * 1.1])
      .range([height, 0]);
    
    const yScaleRight = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0]);
    
    // Create axes
    const xAxis = d3.axisBottom(xScale);
    const yAxisLeft = d3.axisLeft(yScaleLeft);
    const yAxisRight = d3.axisRight(yScaleRight);
    
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis);
    
    svg.append("g")
      .call(yAxisLeft);
    
    svg.append("g")
      .attr("transform", `translate(${width},0)`)
      .call(yAxisRight);
    
    // Add axis labels
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 10)
      .text("Principal Component");
    
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 15)
      .text("Explained Variance (%)");
    
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", width + margin.right - 15)
      .text("Cumulative Variance (%)");
    
    // Add title
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", -margin.top / 2)
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text("Scree Plot - Explained Variance");
    
    // Plot individual variance bars
    svg.selectAll(".variance-bar")
      .data(explainedVariance)
      .enter()
      .append("rect")
      .attr("class", "variance-bar")
      .attr("x", (d, i) => xScale(i + 1))
      .attr("y", d => yScaleLeft(d))
      .attr("width", xScale.bandwidth())
      .attr("height", d => height - yScaleLeft(d))
      .attr("fill", theme.palette.primary.main)
      .attr("opacity", 0.7);
    
    // Plot cumulative variance line
    const line = d3.line()
      .x((d, i) => xScale(i + 1) + xScale.bandwidth() / 2)
      .y(d => yScaleRight(d));
    
    svg.append("path")
      .datum(cumulativeVariance)
      .attr("fill", "none")
      .attr("stroke", theme.palette.secondary.main)
      .attr("stroke-width", 2)
      .attr("d", line);
    
    // Add dots for the cumulative variance
    svg.selectAll(".cumulative-dot")
      .data(cumulativeVariance)
      .enter()
      .append("circle")
      .attr("class", "cumulative-dot")
      .attr("cx", (d, i) => xScale(i + 1) + xScale.bandwidth() / 2)
      .attr("cy", d => yScaleRight(d))
      .attr("r", 4)
      .attr("fill", theme.palette.secondary.main);
    
    // Add tooltips for variance bars
    svg.selectAll(".variance-bar")
      .append("title")
      .text((d, i) => `PC${i + 1}: ${d.toFixed(2)}%`);
    
    // Add hover effects
    svg.selectAll(".variance-bar")
      .on("mouseover", function() {
        d3.select(this)
          .attr("opacity", 1);
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("opacity", 0.7);
      });
    
    // Add a horizontal line at 80% cumulative variance
    const eightyPercentY = yScaleRight(80);
    svg.append("line")
      .attr("x1", 0)
      .attr("y1", eightyPercentY)
      .attr("x2", width)
      .attr("y2", eightyPercentY)
      .attr("stroke", "#888")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3");
    
    svg.append("text")
      .attr("x", width - 5)
      .attr("y", eightyPercentY - 5)
      .attr("text-anchor", "end")
      .attr("font-size", "10px")
      .text("80% Variance");
    
    // Find where cumulative variance exceeds 80%
    const pcFor80Percent = cumulativeVariance.findIndex(d => d >= 80) + 1;
    if (pcFor80Percent > 0 && pcFor80Percent <= cumulativeVariance.length) {
      svg.append("line")
        .attr("x1", xScale(pcFor80Percent) + xScale.bandwidth() / 2)
        .attr("y1", eightyPercentY)
        .attr("x2", xScale(pcFor80Percent) + xScale.bandwidth() / 2)
        .attr("y2", height)
        .attr("stroke", "#888")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3,3");
      
      svg.append("text")
        .attr("x", xScale(pcFor80Percent) + xScale.bandwidth() / 2)
        .attr("y", height + 20)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .text(`PC${pcFor80Percent}`);
    }
  }, [data, plotRef, theme]);

  return (
    <Box
      ref={plotRef}
      sx={{
        width: '100%',
        height: 400,
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

// Main component
const PcaVisualization = ({ projectId, resultId, onNext }) => {
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
    </TabPanel>,
    
    // Loading Plot Tab
    <TabPanel key="loading" value={tabValue} index={1}>
      <PlotContainer plotRef={loadingPlotRef} filename="loading_plot">
        <LoadingPlot
          data={visualizationData}
          xComponent={xComponent}
          yComponent={yComponent}
          plotRef={loadingPlotRef}
        />
      </PlotContainer>
    </TabPanel>,
    
    // Gene Contribution Tab
    <TabPanel key="genes" value={tabValue} index={2}>
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
    </TabPanel>,
    
    // Scree Plot Tab
    <TabPanel key="scree" value={tabValue} index={3}>
      <PlotContainer plotRef={screePlotRef} filename="scree_plot">
        <ScreePlot
          data={visualizationData}
          plotRef={screePlotRef}
        />
      </PlotContainer>
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
    handleTopGenesCountChange
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