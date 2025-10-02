import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Collapse,
  Chip,
  Alert
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LightbulbIcon from '@mui/icons-material/Lightbulb';

/**
 * Educational Banner Component
 *
 * Displays contextual educational content recommendations within analysis pages
 * Links users to relevant learning modules based on the tool they're using
 */

const EducationalBanner = ({
  module = 'pca',
  variant = 'default',
  dismissible = true,
  compact = false
}) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);

  // Module configuration
  const moduleConfig = {
    pca: {
      title: 'Learn PCA Fundamentals',
      description: 'Master the theory behind dimensionality reduction with interactive lessons on variance maximization, eigenvalue decomposition, and component interpretation.',
      route: '/pca-learn',
      icon: <SchoolIcon />,
      color: '#1976d2',
      bgColor: '#e3f2fd',
      topics: ['Variance maximization', 'Scree plots', 'Biplots', 'Component selection']
    },
    ci: {
      title: 'Learn Confidence Intervals',
      description: 'Understand correct interpretation, coverage probability, and construction methods through hands-on simulations and real-world examples.',
      route: '/ci-learn',
      icon: <SchoolIcon />,
      color: '#2e7d32',
      bgColor: '#e8f5e9',
      topics: ['Interpretation', 'Coverage', 'Bootstrap', 'Sample size']
    },
    doe: {
      title: 'Learn Design of Experiments',
      description: 'Design efficient experiments and analyze factorial designs with interactive visualizations of main effects and interactions.',
      route: '/doe-learn',
      icon: <SchoolIcon />,
      color: '#ed6c02',
      bgColor: '#fff3e0',
      topics: ['Factorial designs', 'Interactions', 'ANOVA', 'Optimization']
    },
    probability: {
      title: 'Learn Probability Distributions',
      description: 'Master discrete and continuous distributions from Binomial to Normal with interactive parameter exploration.',
      route: '/probability-learn',
      icon: <SchoolIcon />,
      color: '#9c27b0',
      bgColor: '#f3e5f5',
      topics: ['Binomial', 'Poisson', 'Normal', 'CLT']
    }
  };

  const config = moduleConfig[module] || moduleConfig.pca;

  const handleDismiss = () => {
    setVisible(false);
    // Store dismissal in localStorage
    localStorage.setItem(`educationalBanner_${module}_dismissed`, 'true');
  };

  const handleLearnClick = () => {
    navigate(config.route);
  };

  const handleViewAllClick = () => {
    navigate('/learn');
  };

  // Check if banner was previously dismissed
  React.useEffect(() => {
    if (dismissible) {
      const wasDismissed = localStorage.getItem(`educationalBanner_${module}_dismissed`);
      if (wasDismissed === 'true') {
        setVisible(false);
      }
    }
  }, [module, dismissible]);

  if (!visible) return null;

  // Compact variant for smaller spaces
  if (compact) {
    return (
      <Alert
        severity="info"
        icon={<LightbulbIcon />}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={handleLearnClick}
              endIcon={<ArrowForwardIcon />}
            >
              Learn
            </Button>
            {dismissible && (
              <IconButton size="small" onClick={handleDismiss}>
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        }
        sx={{ mb: 2 }}
      >
        <Typography variant="body2">
          <strong>New to {module.toUpperCase()}?</strong> Check out our interactive lessons
        </Typography>
      </Alert>
    );
  }

  // Default variant - full banner
  return (
    <Collapse in={visible}>
      <Paper
        elevation={2}
        sx={{
          mb: 3,
          p: 3,
          bgcolor: config.bgColor,
          border: `2px solid ${config.color}`,
          position: 'relative'
        }}
      >
        {dismissible && (
          <IconButton
            size="small"
            onClick={handleDismiss}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'text.secondary'
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        )}

        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box
            sx={{
              bgcolor: 'white',
              color: config.color,
              p: 1.5,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <SchoolIcon sx={{ fontSize: 40 }} />
          </Box>

          <Box sx={{ flexGrow: 1, pr: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ color: config.color, fontWeight: 600 }}>
              {config.title}
            </Typography>

            <Typography variant="body2" color="text.secondary" paragraph>
              {config.description}
            </Typography>

            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
              {config.topics.map((topic, idx) => (
                <Chip
                  key={idx}
                  label={topic}
                  size="small"
                  sx={{
                    bgcolor: 'white',
                    fontSize: '0.75rem'
                  }}
                />
              ))}
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleLearnClick}
                endIcon={<ArrowForwardIcon />}
                sx={{
                  bgcolor: config.color,
                  '&:hover': { bgcolor: config.color, opacity: 0.9 }
                }}
              >
                Start Learning
              </Button>

              <Button
                variant="outlined"
                onClick={handleViewAllClick}
                sx={{
                  borderColor: config.color,
                  color: config.color,
                  '&:hover': { borderColor: config.color, bgcolor: 'rgba(0,0,0,0.04)' }
                }}
              >
                View All Courses
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Collapse>
  );
};

/**
 * Quick Learn Card - Minimal variant for sidebar or tight spaces
 */
export const QuickLearnCard = ({ module = 'pca' }) => {
  const navigate = useNavigate();

  const moduleConfig = {
    pca: { title: 'Learn PCA', route: '/pca-learn', color: '#1976d2' },
    ci: { title: 'Learn CI', route: '/ci-learn', color: '#2e7d32' },
    doe: { title: 'Learn DOE', route: '/doe-learn', color: '#ed6c02' },
    probability: { title: 'Learn Probability', route: '/probability-learn', color: '#9c27b0' }
  };

  const config = moduleConfig[module] || moduleConfig.pca;

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)'
        }
      }}
      onClick={() => navigate(config.route)}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <SchoolIcon sx={{ color: config.color, fontSize: 28 }} />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: config.color }}>
            {config.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Interactive lessons
          </Typography>
        </Box>
        <ArrowForwardIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
      </Box>
    </Paper>
  );
};

/**
 * Learning Hub Promo - Promotes the unified learning hub
 */
export const LearningHubPromo = ({ compact = false }) => {
  const navigate = useNavigate();

  if (compact) {
    return (
      <Alert
        severity="success"
        icon={<SchoolIcon />}
        action={
          <Button
            size="small"
            variant="outlined"
            color="success"
            onClick={() => navigate('/learn')}
          >
            Explore
          </Button>
        }
      >
        <Typography variant="body2">
          <strong>Learning Hub:</strong> 4 courses, 17 lessons, all interactive
        </Typography>
      </Alert>
    );
  }

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        cursor: 'pointer',
        transition: 'all 0.3s',
        '&:hover': {
          transform: 'scale(1.02)',
          boxShadow: 6
        }
      }}
      onClick={() => navigate('/learn')}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <SchoolIcon sx={{ fontSize: 48 }} />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            StickForStats Learning Hub
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            4 comprehensive courses • 17 interactive lessons • Real-world applications
          </Typography>
        </Box>
        <ArrowForwardIcon sx={{ fontSize: 32 }} />
      </Box>
    </Paper>
  );
};

export default EducationalBanner;
