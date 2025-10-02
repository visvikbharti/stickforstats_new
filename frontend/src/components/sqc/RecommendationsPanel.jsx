import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Chip,
  Tooltip,
  IconButton,
  Button,
  Card,
  CardContent,
  CardActions,
  Collapse,
  CircularProgress,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  Lightbulb as LightbulbIcon,
  Science as ScienceIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Build as BuildIcon,
  Info as InfoIcon,
  BarChart as BarChartIcon,
  ShowChart as ShowChartIcon,
  Functions as FunctionsIcon,
  Speed as SpeedIcon,
  ExpandMore as ExpandMoreIcon,
  ArrowForward as ArrowForwardIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  NewReleases as NewReleasesIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

// Styled components
const RecommendationCard = styled(Card)(({ theme, severity }) => {
  const severityColors = {
    high: theme.palette.error.light,
    medium: theme.palette.warning.light,
    low: theme.palette.info.light
  };
  
  return {
    marginBottom: theme.spacing(2),
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 0.2s, box-shadow 0.2s',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows[4]
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      width: '4px',
      height: '100%',
      backgroundColor: severityColors[severity] || theme.palette.primary.main
    }
  };
});

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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { x: 20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.4 }
  }
};

/**
 * Recommendations Panel Component
 * 
 * Displays AI-driven recommendations based on analysis results
 * 
 * @param {Object} props Component props
 * @param {Array} props.recommendations List of recommendation objects
 * @param {Function} props.onRecommendationClick Callback when a recommendation is clicked
 */
const RecommendationsPanel = ({ recommendations = [], onRecommendationClick }) => {
  const theme = useTheme();
  
  // State for expanded recommendations
  const [expandedIds, setExpandedIds] = useState({});
  
  // Initialize with high-priority recommendations expanded
  useEffect(() => {
    if (recommendations.length > 0) {
      const initialExpanded = {};
      recommendations.forEach((rec, index) => {
        if (rec.severity === 'high') {
          initialExpanded[index] = true;
        }
      });
      setExpandedIds(initialExpanded);
    }
  }, [recommendations]);
  
  // Toggle expansion for a recommendation
  const handleExpandClick = (index) => {
    setExpandedIds(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };
  
  // Helper to get icon for recommendation type
  const getRecommendationIcon = (type, severity) => {
    const iconColor = severity === 'high' 
      ? theme.palette.error.main 
      : severity === 'medium' 
        ? theme.palette.warning.main 
        : theme.palette.info.main;
    
    switch (type) {
      case 'analysis':
        return <BarChartIcon sx={{ color: iconColor }} />;
      case 'education':
        return <SchoolIcon sx={{ color: iconColor }} />;
      case 'improvement':
        return <BuildIcon sx={{ color: iconColor }} />;
      case 'investigate':
        return <ScienceIcon sx={{ color: iconColor }} />;
      case 'information':
        return <InfoIcon sx={{ color: iconColor }} />;
      case 'report':
        return <AssignmentIcon sx={{ color: iconColor }} />;
      default:
        return <LightbulbIcon sx={{ color: iconColor }} />;
    }
  };
  
  // Helper to get action button label for recommendation type
  const getActionButtonLabel = (type) => {
    switch (type) {
      case 'analysis':
        return 'Run Analysis';
      case 'education':
        return 'Learn More';
      case 'improvement':
        return 'View Details';
      case 'investigate':
        return 'Investigate';
      case 'report':
        return 'Generate Report';
      default:
        return 'View';
    }
  };
  
  // Severity badge component
  const SeverityBadge = ({ severity }) => {
    let icon = null;
    let label = '';
    let color = '';
    
    switch (severity) {
      case 'high':
        icon = <ErrorIcon fontSize="small" />;
        label = 'High Priority';
        color = 'error';
        break;
      case 'medium':
        icon = <WarningIcon fontSize="small" />;
        label = 'Medium Priority';
        color = 'warning';
        break;
      case 'low':
        icon = <InfoIcon fontSize="small" />;
        label = 'Suggestion';
        color = 'info';
        break;
      default:
        icon = <InfoIcon fontSize="small" />;
        label = 'Information';
        color = 'default';
    }
    
    return (
      <Chip 
        icon={icon} 
        label={label} 
        size="small" 
        color={color} 
        variant="outlined"
      />
    );
  };
  
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Box>
        <Typography variant="h6" gutterBottom>
          Recommended Next Steps
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Based on your analysis results, here are personalized recommendations:
        </Typography>
        
        {recommendations.length === 0 ? (
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              textAlign: 'center',
              backgroundColor: theme.palette.action.hover,
              borderRadius: 2
            }}
          >
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="body1">
              Generating recommendations...
            </Typography>
          </Paper>
        ) : (
          <Box>
            {recommendations.map((recommendation, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: index * 0.1 }}
              >
                <RecommendationCard severity={recommendation.severity}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Box display="flex" alignItems="center">
                        <Box mr={1.5}>
                          {getRecommendationIcon(recommendation.action_type, recommendation.severity)}
                        </Box>
                        <Typography variant="subtitle1" component="div">
                          {recommendation.title}
                        </Typography>
                      </Box>
                      
                      <ExpandMore
                        expand={expandedIds[index]}
                        onClick={() => handleExpandClick(index)}
                        aria-expanded={expandedIds[index]}
                        aria-label="show more"
                        size="small"
                      >
                        <ExpandMoreIcon />
                      </ExpandMore>
                    </Box>
                    
                    <Collapse in={expandedIds[index]} timeout="auto">
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {recommendation.description}
                      </Typography>
                      
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <SeverityBadge severity={recommendation.severity} />
                        
                        {recommendation.action_type !== 'information' && (
                          <Button
                            size="small"
                            variant="outlined"
                            endIcon={<ArrowForwardIcon />}
                            onClick={() => onRecommendationClick(recommendation)}
                          >
                            {getActionButtonLabel(recommendation.action_type)}
                          </Button>
                        )}
                      </Box>
                    </Collapse>
                  </CardContent>
                </RecommendationCard>
              </motion.div>
            ))}
          </Box>
        )}
      </Box>
    </motion.div>
  );
};

export default RecommendationsPanel;