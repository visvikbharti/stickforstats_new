import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Tabs, 
  Tab, 
  Chip, 
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { usePrefetch } from '../../context/PrefetchContext';

/**
 * NavigationGraph component
 * 
 * Visualizes navigation paths and their relationships
 */
const NavigationGraph = ({ patterns, prefetchedResources }) => {
  if (!patterns || Object.keys(patterns).length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No navigation patterns have been recorded yet. Navigate through the app to build up patterns.
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Navigation Patterns (Path → Next Pages)
        </Typography>
        <List dense>
          {Object.entries(patterns).map(([path, data]) => (
            <ListItem key={path} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                <ListItemText 
                  primary={path} 
                  secondary={`Visits: ${data.count}`} 
                />
              </Box>
              <Box sx={{ pl: 2, width: '100%' }}>
                <Typography variant="caption" color="textSecondary">
                  Next Pages:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {Object.entries(data.nextPages || {}).map(([nextPage, count]) => {
                    const probability = data.count > 0 ? (count / data.count) * 100 : 0;
                    return (
                      <Chip 
                        key={nextPage} 
                        label={`${nextPage} (${count}, ${probability.toFixed(1)}%)`} 
                        size="small"
                        color={prefetchedResources.includes(nextPage) ? 'primary' : 'default'}
                        variant={prefetchedResources.includes(nextPage) ? 'filled' : 'outlined'}
                      />
                    );
                  })}
                </Box>
              </Box>
              <Divider sx={{ width: '100%', my: 1 }} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

NavigationGraph.propTypes = {
  patterns: PropTypes.object,
  prefetchedResources: PropTypes.array
};

/**
 * PrefetchDebug component
 * 
 * Debug component for visualizing prefetching activity
 */
const PrefetchDebug = ({ 
  showTitle = true, 
  position = { bottom: 16, right: 16 },
  defaultOpen = false,
  width = 400
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState(0);
  const [manualPrefetchPath, setManualPrefetchPath] = useState('');

  const { 
    stats, 
    prefetch, 
    resetPrefetching, 
    isPrefetchingEnabled, 
    setPrefetchingEnabled,
    prefetchOptions,
    setPrefetchOptions
  } = usePrefetch();

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Refresh stats
  const refreshStats = () => {
    // Stats will update automatically via context
  };

  // Reset prefetching
  const handleReset = () => {
    resetPrefetching();
  };

  // Toggle prefetching
  const handleTogglePrefetching = (event) => {
    setPrefetchingEnabled(event.target.checked);
  };

  // Handle manual prefetch
  const handleManualPrefetch = () => {
    if (manualPrefetchPath) {
      prefetch(manualPrefetchPath);
      setManualPrefetchPath('');
    }
  };

  // Update option
  const handleOptionChange = (option, value) => {
    setPrefetchOptions({ [option]: value });
  };

  // Toggle visibility
  const toggleVisibility = () => {
    setIsOpen(!isOpen);
  };

  return (
    <Box sx={{ 
      position: 'fixed', 
      zIndex: 1100,
      ...position,
      transition: 'all 0.3s ease-in-out',
    }}>
      {isOpen ? (
        <Card sx={{ width, maxHeight: '80vh', overflow: 'auto' }}>
          <Box sx={{ px: 1, py: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            {showTitle && (
              <Typography variant="subtitle2">
                Prefetch Debug Panel
              </Typography>
            )}
            <Box>
              <IconButton size="small" color="inherit" onClick={refreshStats}>
                <RefreshIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="inherit" onClick={toggleVisibility}>
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          
          <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
            <Tab label="Overview" />
            <Tab label="Navigation" />
            <Tab label="Settings" />
          </Tabs>
          
          <CardContent>
            {/* Overview Tab */}
            {activeTab === 0 && (
              <Box>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={isPrefetchingEnabled} 
                      onChange={handleTogglePrefetching}
                      color="primary"
                    />
                  }
                  label={`Prefetching is ${isPrefetchingEnabled ? 'enabled' : 'disabled'}`}
                />
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Current Navigation Path:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {stats.currentPath && stats.currentPath.map((path, index) => (
                      <Chip 
                        key={index} 
                        label={path} 
                        size="small" 
                        variant={index === stats.currentPath.length - 1 ? 'filled' : 'outlined'}
                        color={index === stats.currentPath.length - 1 ? 'primary' : 'default'}
                      />
                    ))}
                  </Box>
                </Box>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Prefetched Resources ({stats.prefetchedResources?.length || 0}):
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {stats.prefetchedResources && stats.prefetchedResources.map((resource) => (
                      <Chip key={resource} label={resource} size="small" color="secondary" />
                    ))}
                  </Box>
                </Box>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Manual Prefetch:
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={8}>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="/example/path"
                        value={manualPrefetchPath}
                        onChange={(e) => setManualPrefetchPath(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <Button 
                        variant="contained" 
                        size="small" 
                        fullWidth
                        disabled={!manualPrefetchPath || !isPrefetchingEnabled}
                        onClick={handleManualPrefetch}
                      >
                        Prefetch
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
                
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Tooltip title="Reset all navigation patterns and prefetched resources">
                    <Button 
                      startIcon={<DeleteIcon />} 
                      onClick={handleReset}
                      color="error"
                      size="small"
                      variant="outlined"
                    >
                      Reset All Data
                    </Button>
                  </Tooltip>
                </Box>
              </Box>
            )}
            
            {/* Navigation Tab */}
            {activeTab === 1 && (
              <NavigationGraph 
                patterns={stats.patterns || {}} 
                prefetchedResources={stats.prefetchedResources || []}
              />
            )}
            
            {/* Settings Tab */}
            {activeTab === 2 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Prefetching Options:
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={prefetchOptions.prefetchDocuments} 
                          onChange={(e) => handleOptionChange('prefetchDocuments', e.target.checked)}
                        />
                      }
                      label="Prefetch HTML Documents"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={prefetchOptions.respectDataSaver} 
                          onChange={(e) => handleOptionChange('respectDataSaver', e.target.checked)}
                        />
                      }
                      label="Respect Data-Saver Mode"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={prefetchOptions.onlyFastConnections} 
                          onChange={(e) => handleOptionChange('onlyFastConnections', e.target.checked)}
                        />
                      }
                      label="Only Prefetch on Fast Connections (4G+)"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={prefetchOptions.debug} 
                          onChange={(e) => handleOptionChange('debug', e.target.checked)}
                        />
                      }
                      label="Enable Debug Logging"
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>
      ) : (
        <Button 
          onClick={toggleVisibility} 
          variant="contained" 
          size="small"
          color="primary"
        >
          Prefetch Debug
        </Button>
      )}
    </Box>
  );
};

PrefetchDebug.propTypes = {
  showTitle: PropTypes.bool,
  position: PropTypes.object,
  defaultOpen: PropTypes.bool,
  width: PropTypes.number
};

export default PrefetchDebug;