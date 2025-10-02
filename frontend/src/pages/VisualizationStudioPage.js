import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import {
  ShowChart as ShowChartIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  ScatterPlot as ScatterPlotIcon,
  Timeline as TimelineIcon,
  BubbleChart as BubbleChartIcon,
  Map as MapIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';

const VisualizationStudioPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [selectedChartType, setSelectedChartType] = useState('');

  const visualizationCategories = [
    {
      id: 'basic',
      label: 'Basic Charts',
      charts: [
        { id: 'bar', name: 'Bar Chart', icon: <BarChartIcon />, description: 'Compare categories' },
        { id: 'line', name: 'Line Chart', icon: <ShowChartIcon />, description: 'Show trends over time' },
        { id: 'pie', name: 'Pie Chart', icon: <PieChartIcon />, description: 'Show proportions' },
        { id: 'scatter', name: 'Scatter Plot', icon: <ScatterPlotIcon />, description: 'Show relationships' }
      ]
    },
    {
      id: 'statistical',
      label: 'Statistical Plots',
      charts: [
        { id: 'box', name: 'Box Plot', icon: <AssessmentIcon />, description: 'Distribution summary' },
        { id: 'histogram', name: 'Histogram', icon: <BarChartIcon />, description: 'Frequency distribution' },
        { id: 'qq', name: 'Q-Q Plot', icon: <ScatterPlotIcon />, description: 'Normality assessment' },
        { id: 'violin', name: 'Violin Plot', icon: <ShowChartIcon />, description: 'Distribution shape' }
      ]
    },
    {
      id: 'advanced',
      label: 'Advanced',
      charts: [
        { id: 'heatmap', name: 'Heatmap', icon: <MapIcon />, description: 'Matrix visualization' },
        { id: '3d', name: '3D Surface', icon: <BubbleChartIcon />, description: '3D relationships' },
        { id: 'parallel', name: 'Parallel Coordinates', icon: <TimelineIcon />, description: 'Multivariate data' },
        { id: 'network', name: 'Network Graph', icon: <BubbleChartIcon />, description: 'Relationships' }
      ]
    }
  ];

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Visualization Studio
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Create stunning, publication-ready visualizations from your data. Choose from a wide range of 
          chart types and customize every aspect of your visualizations.
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        {/* Left Panel - Chart Selection */}
        <Grid item xs={12} md={3}>
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Chart Types
            </Typography>
            <Tabs
              orientation="vertical"
              value={activeTab}
              onChange={handleTabChange}
              sx={{ borderRight: 1, borderColor: 'divider' }}
            >
              {visualizationCategories.map((category, index) => (
                <Tab key={category.id} label={category.label} />
              ))}
            </Tabs>
          </Paper>
        </Grid>

        {/* Center Panel - Chart Gallery */}
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {visualizationCategories[activeTab].label}
            </Typography>
            <Grid container spacing={2}>
              {visualizationCategories[activeTab].charts.map((chart) => (
                <Grid item xs={12} sm={6} key={chart.id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      border: selectedChartType === chart.id ? 2 : 0,
                      borderColor: 'primary.main'
                    }}
                    onClick={() => setSelectedChartType(chart.id)}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Box sx={{ color: 'primary.main', mr: 1 }}>
                          {chart.icon}
                        </Box>
                        <Typography variant="subtitle1">
                          {chart.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {chart.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* Visualization Preview Area */}
          <Paper elevation={1} sx={{ p: 3, mt: 3, minHeight: 400 }}>
            <Typography variant="h6" gutterBottom>
              Visualization Preview
            </Typography>
            {selectedChartType ? (
              <Box 
                sx={{ 
                  height: 350, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  bgcolor: 'grey.100',
                  borderRadius: 1
                }}
              >
                <Typography color="text.secondary">
                  Chart preview will appear here
                </Typography>
              </Box>
            ) : (
              <Box 
                sx={{ 
                  height: 350, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}
              >
                <Typography color="text.secondary">
                  Select a chart type to begin
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right Panel - Configuration */}
        <Grid item xs={12} md={3}>
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Configuration
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Dataset</InputLabel>
              <Select
                value={selectedDataset}
                onChange={(e) => setSelectedDataset(e.target.value)}
                label="Dataset"
              >
                <MenuItem value="">
                  <em>Select dataset</em>
                </MenuItem>
                <MenuItem value="dataset1">Sample Dataset 1</MenuItem>
                <MenuItem value="dataset2">Sample Dataset 2</MenuItem>
                <MenuItem value="upload">Upload New</MenuItem>
              </Select>
            </FormControl>

            {selectedChartType && (
              <>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
                  Chart Options
                </Typography>
                <Box mb={2}>
                  <Chip label="Title" size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                  <Chip label="Labels" size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                  <Chip label="Legend" size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                  <Chip label="Grid" size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                  <Chip label="Colors" size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                </Box>

                <Button fullWidth variant="contained" sx={{ mb: 1 }}>
                  Generate Visualization
                </Button>
                <Button fullWidth variant="outlined">
                  Export
                </Button>
              </>
            )}
          </Paper>

          <Paper elevation={1} sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Export Options
            </Typography>
            <Box>
              <Chip label="PNG" size="small" sx={{ mr: 0.5, mb: 0.5 }} />
              <Chip label="SVG" size="small" sx={{ mr: 0.5, mb: 0.5 }} />
              <Chip label="PDF" size="small" sx={{ mr: 0.5, mb: 0.5 }} />
              <Chip label="Interactive HTML" size="small" sx={{ mr: 0.5, mb: 0.5 }} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default VisualizationStudioPage;