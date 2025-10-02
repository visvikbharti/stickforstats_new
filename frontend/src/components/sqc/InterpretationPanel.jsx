import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  Chip,
  Collapse,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Assessment as AssessmentIcon,
  Speed as SpeedIcon,
  Functions as FunctionsIcon,
  BarChart as BarChartIcon,
  ShowChart as ShowChartIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

// Styled components
const ExpandMore = styled((props) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme, expand }) => ({
  transform: !expand ? 'rotate(0deg)' : 'rotate(180deg)',
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
}));

const StatusChip = styled(Chip)(({ theme, statusType }) => {
  const colors = {
    good: {
      bg: theme.palette.success.light,
      color: theme.palette.success.dark
    },
    warning: {
      bg: theme.palette.warning.light,
      color: theme.palette.warning.dark
    },
    error: {
      bg: theme.palette.error.light,
      color: theme.palette.error.dark
    },
    info: {
      bg: theme.palette.info.light,
      color: theme.palette.info.dark
    }
  };
  
  const style = colors[statusType] || colors.info;
  
  return {
    backgroundColor: style.bg,
    color: style.color,
    fontWeight: 500,
    fontSize: '0.85rem'
  };
});

const StatCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '4px',
    backgroundColor: theme.palette.primary.main
  }
}));

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.3 }
  }
};

/**
 * Interpretation Panel Component
 * 
 * Displays interpretation of control chart results with statistics and insights
 * 
 * @param {Object} props Component props
 * @param {string} props.interpretation Text interpretation of the control chart
 * @param {Object} props.statistics Process statistics
 */
const InterpretationPanel = ({ interpretation, statistics }) => {
  const theme = useTheme();
  
  // State for expanded sections
  const [expanded, setExpanded] = useState(true);
  const [expandedStats, setExpandedStats] = useState(true);
  
  // Ref for animated text
  const interpretationRef = useRef(null);
  
  // Extract key status indicators
  const getProcessStatus = () => {
    if (!interpretation) return 'unknown';
    
    if (interpretation.includes('out of control') || 
        interpretation.includes('special cause')) {
      return 'error';
    } else if (interpretation.includes('warning') || 
               interpretation.includes('caution')) {
      return 'warning';
    } else if (interpretation.includes('in statistical control') || 
               interpretation.includes('in control')) {
      return 'good';
    } else {
      return 'info';
    }
  };
  
  const processStatus = getProcessStatus();
  
  // Get status label
  const getStatusLabel = () => {
    switch (processStatus) {
      case 'good':
        return 'Process In Control';
      case 'warning':
        return 'Process Needs Attention';
      case 'error':
        return 'Process Out Of Control';
      default:
        return 'Analysis Complete';
    }
  };
  
  // Get status icon
  const getStatusIcon = () => {
    switch (processStatus) {
      case 'good':
        return <CheckIcon />;
      case 'warning':
        return <WarningIcon />;
      case 'error':
        return <ErrorIcon />;
      default:
        return <InfoIcon />;
    }
  };
  
  // Format a statistics value with appropriate precision
  const formatStatValue = (value, precision = 4) => {
    if (value === undefined || value === null) return 'N/A';
    
    // If it's a number, format it
    if (typeof value === 'number') {
      // For very small or very large numbers, use scientific notation
      if (Math.abs(value) < 0.001 || Math.abs(value) > 100000) {
        return value.toExponential(precision);
      }
      // Otherwise use fixed precision
      return value.toFixed(precision);
    }
    
    // Return as is for other types
    return value;
  };
  
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Box>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">
            Results Interpretation
          </Typography>
          
          <StatusChip 
            label={getStatusLabel()} 
            statusType={processStatus}
            icon={getStatusIcon()} 
          />
        </Box>
        
        {/* Main interpretation section */}
        <motion.div variants={itemVariants}>
          <Paper 
            elevation={1} 
            sx={{ 
              p: 2, 
              mb: 3, 
              backgroundColor: theme.palette.background.default 
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1" fontWeight="500">
                Analysis Summary
              </Typography>
              
              <ExpandMore
                expand={expanded}
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
                aria-label="show more"
                size="small"
              >
                <ExpandMoreIcon />
              </ExpandMore>
            </Box>
            
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Box mt={2} ref={interpretationRef}>
                {interpretation ? (
                  interpretation.split('\n').map((paragraph, index) => (
                    <Typography 
                      key={index} 
                      variant="body2" 
                      paragraph={index < interpretation.split('\n').length - 1}
                      color="text.secondary"
                    >
                      {paragraph}
                    </Typography>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No interpretation available for this analysis.
                  </Typography>
                )}
              </Box>
            </Collapse>
          </Paper>
        </motion.div>
        
        {/* Statistics section */}
        {statistics && Object.keys(statistics).length > 0 && (
          <motion.div variants={itemVariants}>
            <Paper 
              elevation={1} 
              sx={{ 
                p: 2,
                backgroundColor: theme.palette.background.default
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" fontWeight="500">
                  Process Statistics
                </Typography>
                
                <ExpandMore
                  expand={expandedStats}
                  onClick={() => setExpandedStats(!expandedStats)}
                  aria-expanded={expandedStats}
                  aria-label="show more"
                  size="small"
                >
                  <ExpandMoreIcon />
                </ExpandMore>
              </Box>
              
              <Collapse in={expandedStats} timeout="auto" unmountOnExit>
                <TableContainer component={Box} sx={{ mt: 2 }}>
                  <Table size="small">
                    <TableBody>
                      {/* Central tendency */}
                      {statistics.average !== undefined && (
                        <TableRow>
                          <TableCell component="th" scope="row" width="60%">
                            Process Average
                          </TableCell>
                          <TableCell align="right">
                            {formatStatValue(statistics.average)}
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {/* Variability */}
                      {statistics.standard_deviation !== undefined && (
                        <TableRow>
                          <TableCell component="th" scope="row">
                            Standard Deviation
                          </TableCell>
                          <TableCell align="right">
                            {formatStatValue(statistics.standard_deviation)}
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {statistics.average_range !== undefined && (
                        <TableRow>
                          <TableCell component="th" scope="row">
                            Average Range
                          </TableCell>
                          <TableCell align="right">
                            {formatStatValue(statistics.average_range)}
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {statistics.average_std_dev !== undefined && (
                        <TableRow>
                          <TableCell component="th" scope="row">
                            Average Standard Deviation
                          </TableCell>
                          <TableCell align="right">
                            {formatStatValue(statistics.average_std_dev)}
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {/* Sample information */}
                      {statistics.sample_size !== undefined && (
                        <TableRow>
                          <TableCell component="th" scope="row">
                            Subgroup Size
                          </TableCell>
                          <TableCell align="right">
                            {statistics.sample_size}
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {statistics.num_subgroups !== undefined && (
                        <TableRow>
                          <TableCell component="th" scope="row">
                            Number of Subgroups
                          </TableCell>
                          <TableCell align="right">
                            {statistics.num_subgroups}
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {statistics.total_sample_points !== undefined && (
                        <TableRow>
                          <TableCell component="th" scope="row">
                            Total Sample Points
                          </TableCell>
                          <TableCell align="right">
                            {statistics.total_sample_points}
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {/* Autocorrelation (for I-MR charts) */}
                      {statistics.autocorrelation !== undefined && (
                        <TableRow>
                          <TableCell component="th" scope="row">
                            <Tooltip title="Correlation between consecutive measurements">
                              <span>Autocorrelation</span>
                            </Tooltip>
                          </TableCell>
                          <TableCell align="right">
                            {formatStatValue(statistics.autocorrelation)}
                            {Math.abs(statistics.autocorrelation) > 0.5 && (
                              <Tooltip title="High autocorrelation may violate control chart assumptions">
                                <WarningIcon fontSize="small" sx={{ ml: 1, color: 'warning.main' }} />
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {/* For p charts */}
                      {statistics.average_proportion !== undefined && (
                        <TableRow>
                          <TableCell component="th" scope="row">
                            Average Proportion Defective
                          </TableCell>
                          <TableCell align="right">
                            {(statistics.average_proportion * 100).toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {statistics.total_defectives !== undefined && (
                        <TableRow>
                          <TableCell component="th" scope="row">
                            Total Defectives
                          </TableCell>
                          <TableCell align="right">
                            {statistics.total_defectives}
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {statistics.total_inspected !== undefined && (
                        <TableRow>
                          <TableCell component="th" scope="row">
                            Total Units Inspected
                          </TableCell>
                          <TableCell align="right">
                            {statistics.total_inspected}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Collapse>
            </Paper>
          </motion.div>
        )}
      </Box>
    </motion.div>
  );
};

export default InterpretationPanel;