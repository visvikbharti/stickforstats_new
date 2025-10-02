import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  CardActions,
  CardMedia,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import { 
  Dashboard as DashboardIcon,
  Dataset as DatasetIcon,
  Timeline as TimelineIcon,
  Science as ScienceIcon,
  Description as DescriptionIcon,
  Functions as FunctionsIcon,
  BarChart as BarChartIcon,
  BubbleChart as BubbleChartIcon,
  Add as AddIcon,
  Upload as UploadIcon,
  QuestionAnswer as QuestionAnswerIcon,
  Close as CloseIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

// Import RAG system components
import { QueryInterface } from '../rag';

const Dashboard = () => {
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [moduleCards, setModuleCards] = useState([]);
  const [openRagDialog, setOpenRagDialog] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch data when component mounts
    // Skip API calls in demo mode or when API is disabled
    if (process.env.REACT_APP_DISABLE_API !== 'true') {
      fetchDashboardData();
      fetchModules();
    } else {
      // Set default demo data
      setModuleCards([
        {
          id: 'confidence-intervals',
          title: 'Confidence Intervals',
          description: 'Calculate and visualize confidence intervals',
          icon: <FunctionsIcon fontSize="large" />,
          path: '/confidence-intervals',
          category: 'Analysis',
          enabled: true
        },
        {
          id: 'pca-analysis',
          title: 'PCA Analysis',
          description: 'Principal Component Analysis for dimensionality reduction',
          icon: <AssessmentIcon fontSize="large" />,
          path: '/pca-analysis',
          category: 'Analysis',
          enabled: true
        },
        {
          id: 'doe-analysis',
          title: 'DOE Analysis',
          description: 'Design of Experiments analysis',
          icon: <AssessmentIcon fontSize="large" />,
          path: '/doe-analysis',
          category: 'Analysis',
          enabled: true
        }
      ]);
      setLoading(false);
    }
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Use the Batch API to fetch multiple resources at once
      const response = await api.get('/api/v1/core/dashboard/');
      
      setRecentAnalyses(response.data.recent_analyses || []);
      setDatasets(response.data.datasets || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async () => {
    try {
      const response = await api.get('/api/v1/core/modules/');
      
      // Map modules to card data with defensive check
      const cards = Array.isArray(response.data) ? response.data.map(module => ({
        id: module.name,
        title: module.display_name || module.name,
        description: module.description || `Statistical analysis using ${module.name}`,
        icon: getModuleIcon(module.icon),
        path: module.frontend_path || `/modules/${module.name}`,
        category: module.category || 'Analysis',
        enabled: module.enabled !== false
      })) : [];
      
      setModuleCards(cards);
    } catch (err) {
      console.error('Error fetching modules:', err);
    }
  };

  const getModuleIcon = (iconName) => {
    switch (iconName) {
      case 'Functions':
        return <FunctionsIcon />;
      case 'BarChart':
        return <BarChartIcon />;
      case 'BubbleChart':
        return <BubbleChartIcon />;
      case 'Science':
        return <ScienceIcon />;
      case 'Timeline':
        return <TimelineIcon />;
      case 'QuestionAnswer':
        return <QuestionAnswerIcon />;
      default:
        return <ScienceIcon />;
    }
  };

  const handleAnalysisClick = (analysis) => {
    navigate(`/analyses/${analysis.id}`);
  };

  const handleDatasetClick = (dataset) => {
    navigate(`/datasets/${dataset.id}`);
  };

  const handleModuleClick = (modulePath) => {
    navigate(modulePath);
  };

  const handleNewAnalysis = () => {
    navigate('/analyses/new');
  };

  const handleUploadDataset = () => {
    navigate('/datasets/upload');
  };

  const handleOpenRagDialog = () => {
    setOpenRagDialog(true);
  };

  const handleCloseRagDialog = () => {
    setOpenRagDialog(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Welcome section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">
            Welcome, {user?.firstName || user?.username || 'User'}
          </Typography>
          <Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleNewAnalysis}
              sx={{ mr: 2 }}
            >
              New Analysis
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={handleUploadDataset}
            >
              Upload Dataset
            </Button>
          </Box>
        </Box>
        <Typography variant="body1" color="text.secondary">
          StickForStats provides comprehensive statistical analysis tools for your data.
          Get started by selecting a module below or continue with your recent analyses.
        </Typography>
      </Paper>

      {/* Error message if present */}
      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      {/* Main grid layout */}
      <Grid container spacing={3}>
        {/* Module cards */}
        <Grid item xs={12}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Statistical Modules
          </Typography>
          <Grid container spacing={2}>
            {moduleCards
              .filter(module => module.enabled)
              .map((module) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={module.id}>
                  <Card 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'scale(1.02)',
                        boxShadow: 4
                      }
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ mr: 1, color: 'primary.main' }}>
                          {module.icon}
                        </Box>
                        <Typography variant="h6" component="div">
                          {module.title}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {module.description}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button size="small" onClick={() => handleModuleClick(module.path)}>
                        Open Module
                      </Button>
                      <Chip 
                        label={module.category} 
                        size="small" 
                        sx={{ ml: 'auto' }} 
                        variant="outlined"
                      />
                    </CardActions>
                  </Card>
                </Grid>
              ))}
          </Grid>
        </Grid>

        {/* Recent analyses */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Recent Analyses
            </Typography>
            {recentAnalyses.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                No recent analyses found. Start a new analysis to see it here.
              </Typography>
            ) : (
              <List>
                {recentAnalyses.map((analysis) => (
                  <React.Fragment key={analysis.id}>
                    <ListItem 
                      button 
                      onClick={() => handleAnalysisClick(analysis)}
                      sx={{ borderRadius: 1 }}
                    >
                      <ListItemIcon>
                        <TimelineIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={analysis.name} 
                        secondary={`${analysis.analysis_type} • ${new Date(analysis.created_at).toLocaleDateString()}`} 
                      />
                      <Chip 
                        label={analysis.status} 
                        color={
                          analysis.status === 'Completed' ? 'success' : 
                          analysis.status === 'Failed' ? 'error' : 
                          'default'
                        }
                        size="small"
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Datasets */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Your Datasets
            </Typography>
            {datasets.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                No datasets found. Upload a dataset to get started.
              </Typography>
            ) : (
              <List>
                {datasets.map((dataset) => (
                  <React.Fragment key={dataset.id}>
                    <ListItem 
                      button 
                      onClick={() => handleDatasetClick(dataset)}
                      sx={{ borderRadius: 1 }}
                    >
                      <ListItemIcon>
                        <DatasetIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={dataset.name} 
                        secondary={`${dataset.row_count} rows • ${dataset.column_count} columns • ${new Date(dataset.created_at).toLocaleDateString()}`} 
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Floating action button for RAG assistant */}
      <Fab
        color="primary"
        aria-label="assistant"
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
        }}
        onClick={handleOpenRagDialog}
      >
        <QuestionAnswerIcon />
      </Fab>

      {/* RAG Assistant Dialog */}
      <Dialog
        open={openRagDialog}
        onClose={handleCloseRagDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: '80vh',
            maxHeight: '800px',
          }
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <QuestionAnswerIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Statistical Assistant</Typography>
          </Box>
          <IconButton
            aria-label="close"
            onClick={handleCloseRagDialog}
            sx={{
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <QueryInterface />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Dashboard;