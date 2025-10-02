import React, { useState } from 'react';
import { 
  Fab, 
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  ListItemText,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';

import SpeedIcon from '@mui/icons-material/Speed';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SettingsIcon from '@mui/icons-material/Settings';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import DataUsageIcon from '@mui/icons-material/DataUsage';

import PerformanceDashboard from './PerformanceDashboard';
import { initPerformanceMonitoring, clearMetrics } from '../../utils/performanceMonitoring';

/**
 * Performance Monitor Toggle Component
 * 
 * Floating action button to toggle the performance monitoring dashboard
 * and control monitoring settings.
 */
const PerformanceMonitorToggle = ({ defaultVisible = false }) => {
  const [isVisible, setIsVisible] = useState(defaultVisible);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [monitoringOptions, setMonitoringOptions] = useState({
    logToConsole: false,
    sendToAnalytics: false,
    sendToBackend: false,
    includeResourceDetails: true,
  });
  
  // Initialize monitoring when component mounts
  React.useEffect(() => {
    initPerformanceMonitoring({
      ...monitoringOptions,
      logToConsole: monitoringOptions.logToConsole
    });
  }, [monitoringOptions]);
  
  // Toggle visibility of dashboard
  const toggleDashboard = () => {
    setIsVisible(prev => !prev);
  };
  
  // Open settings menu
  const handleOpenMenu = (event) => {
    setMenuAnchor(event.currentTarget);
  };
  
  // Close settings menu
  const handleCloseMenu = () => {
    setMenuAnchor(null);
  };
  
  // Toggle monitoring option
  const handleOptionChange = (option) => {
    const newOptions = {
      ...monitoringOptions,
      [option]: !monitoringOptions[option]
    };
    
    setMonitoringOptions(newOptions);
    
    // Re-initialize with new options
    initPerformanceMonitoring(newOptions);
  };
  
  // Toggle monitoring on/off
  const toggleMonitoring = () => {
    if (monitoringEnabled) {
      // Save current options before disabling
      setMonitoringEnabled(false);
    } else {
      // Re-enable with previous options
      setMonitoringEnabled(true);
      initPerformanceMonitoring(monitoringOptions);
    }
    
    handleCloseMenu();
  };
  
  // Clear all collected metrics
  const handleClearMetrics = () => {
    clearMetrics();
    handleCloseMenu();
  };
  
  // Download metrics as a JSON file
  const handleDownloadMetrics = () => {
    // This is implemented in the dashboard component
    // Just close the menu here
    handleCloseMenu();
  };
  
  return (
    <>
      {isVisible && <PerformanceDashboard />}
      
      <Tooltip title="Performance Monitoring">
        <Fab
          color="primary"
          size="medium"
          onClick={toggleDashboard}
          onContextMenu={(e) => {
            e.preventDefault();
            handleOpenMenu(e);
          }}
          aria-label="Performance monitoring"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1050,
            opacity: monitoringEnabled ? 1 : 0.5,
          }}
        >
          <SpeedIcon />
        </Fab>
      </Tooltip>
      
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={toggleMonitoring}>
          <ListItemIcon>
            {monitoringEnabled ? <VisibilityOffIcon /> : <VisibilityIcon />}
          </ListItemIcon>
          <ListItemText primary={monitoringEnabled ? "Disable Monitoring" : "Enable Monitoring"} />
        </MenuItem>
        
        <MenuItem onClick={toggleDashboard}>
          <ListItemIcon>
            <DataUsageIcon />
          </ListItemIcon>
          <ListItemText primary={isVisible ? "Hide Dashboard" : "Show Dashboard"} />
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={() => handleOptionChange('logToConsole')}>
          <ListItemIcon>
            {monitoringOptions.logToConsole ? 
              <ToggleButton value="check" selected size="small">
                <RefreshIcon fontSize="small" />
              </ToggleButton> :
              <ToggleButton value="check" size="small">
                <RefreshIcon fontSize="small" />
              </ToggleButton>
            }
          </ListItemIcon>
          <ListItemText 
            primary="Log to Console" 
            secondary="Print performance metrics to browser console"
          />
        </MenuItem>
        
        <MenuItem onClick={() => handleOptionChange('includeResourceDetails')}>
          <ListItemIcon>
            {monitoringOptions.includeResourceDetails ? 
              <ToggleButton value="check" selected size="small">
                <SettingsIcon fontSize="small" />
              </ToggleButton> :
              <ToggleButton value="check" size="small">
                <SettingsIcon fontSize="small" />
              </ToggleButton>
            }
          </ListItemIcon>
          <ListItemText 
            primary="Detailed Resources" 
            secondary="Collect detailed information about resources"
          />
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleClearMetrics}>
          <ListItemIcon>
            <DeleteIcon />
          </ListItemIcon>
          <ListItemText primary="Clear Metrics" />
        </MenuItem>
        
        <MenuItem onClick={handleDownloadMetrics}>
          <ListItemIcon>
            <SaveIcon />
          </ListItemIcon>
          <ListItemText primary="Download Metrics" />
        </MenuItem>
      </Menu>
    </>
  );
};

export default PerformanceMonitorToggle;