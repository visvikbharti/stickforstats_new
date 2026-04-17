import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Tooltip, TextField, InputAdornment,
  Accordion, AccordionSummary, AccordionDetails, Fade,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Shield as ShieldIcon,
  Science as ScienceIcon,
  TrendingUp as TrendingUpIcon,
  Search as SearchIcon,
  Speed as SpeedIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import axios from 'axios';
import { getApiUrl, endpoints } from '../config/apiConfig';

// Golden Ratio for animations
const PHI = 1.618;

// Test categories with all discovered tests
const TEST_CATEGORIES = {
  parametric: {
    name: 'Parametric Tests',
    icon: <TrendingUpIcon />,
    color: '#FFD700',
    tests: [
      { id: 't_test', name: 'T-Test', endpoint: '/api/v1/stats/ttest/', precision: 50, guardian: true },
      { id: 'paired_t', name: 'Paired T-Test', endpoint: '/api/v1/stats/ttest/', precision: 50, guardian: true },
      { id: 'anova', name: 'One-Way ANOVA', endpoint: '/api/v1/stats/anova/', precision: 50, guardian: true },
      { id: 'ancova', name: 'ANCOVA', endpoint: '/api/v1/stats/ancova/', precision: 50, guardian: true },
      { id: 'manova', name: 'MANOVA', endpoint: '/api/v1/multivariate/manova/', precision: 50, guardian: false },
      { id: 'repeated_anova', name: 'Repeated Measures ANOVA', endpoint: '/api/v1/stats/anova/', precision: 50, guardian: true }
    ]
  },
  nonParametric: {
    name: 'Non-Parametric Tests',
    icon: <PsychologyIcon />,
    color: '#4CAF50',
    tests: [
      { id: 'mann_whitney', name: 'Mann-Whitney U', endpoint: '/api/v1/nonparametric/mann-whitney/', precision: 50, guardian: true },
      { id: 'wilcoxon', name: 'Wilcoxon Signed-Rank', endpoint: '/api/v1/nonparametric/wilcoxon/', precision: 50, guardian: true },
      { id: 'kruskal', name: 'Kruskal-Wallis', endpoint: '/api/v1/nonparametric/kruskal-wallis/', precision: 50, guardian: true },
      { id: 'friedman', name: 'Friedman Test', endpoint: '/api/v1/nonparametric/friedman/', precision: 50, guardian: true },
      { id: 'sign', name: 'Sign Test', endpoint: '/api/v1/nonparametric/sign/', precision: 50, guardian: false },
      { id: 'mood', name: "Mood's Median", endpoint: '/api/v1/nonparametric/mood/', precision: 50, guardian: false },
      { id: 'jonckheere', name: 'Jonckheere-Terpstra', endpoint: '/api/v1/nonparametric/jonckheere/', precision: 50, guardian: false },
      { id: 'page', name: "Page's Trend Test", endpoint: '/api/v1/nonparametric/page/', precision: 50, guardian: false }
    ]
  },
  correlation: {
    name: 'Correlation & Regression',
    icon: <TrendingUpIcon />,
    color: '#2196F3',
    tests: [
      { id: 'pearson', name: 'Pearson Correlation', endpoint: '/api/v1/stats/correlation/', precision: 50, guardian: true },
      { id: 'spearman', name: 'Spearman Correlation', endpoint: '/api/v1/stats/correlation/', precision: 50, guardian: true },
      { id: 'kendall', name: 'Kendall Tau', endpoint: '/api/v1/stats/correlation/', precision: 50, guardian: true },
      { id: 'linear_reg', name: 'Linear Regression', endpoint: '/api/v1/stats/regression/', precision: 50, guardian: true },
      { id: 'multiple_reg', name: 'Multiple Regression', endpoint: '/api/v1/regression/multiple/', precision: 50, guardian: true },
      { id: 'polynomial', name: 'Polynomial Regression', endpoint: '/api/v1/regression/polynomial/', precision: 50, guardian: false },
      { id: 'logistic', name: 'Logistic Regression', endpoint: '/api/v1/regression/logistic/', precision: 50, guardian: false },
      { id: 'ridge', name: 'Ridge Regression', endpoint: '/api/v1/regression/ridge/', precision: 50, guardian: false },
      { id: 'lasso', name: 'Lasso Regression', endpoint: '/api/v1/regression/lasso/', precision: 50, guardian: false }
    ]
  },
  categorical: {
    name: 'Categorical Analysis',
    icon: <ScienceIcon />,
    color: '#9C27B0',
    tests: [
      { id: 'chi_square', name: 'Chi-Square Independence', endpoint: '/api/v1/categorical/chi-square/independence/', precision: 50, guardian: true },
      { id: 'chi_goodness', name: 'Chi-Square Goodness of Fit', endpoint: '/api/v1/categorical/chi-square/goodness/', precision: 50, guardian: true },
      { id: 'fisher', name: "Fisher's Exact", endpoint: '/api/v1/categorical/fishers/', precision: 50, guardian: true },
      { id: 'mcnemar', name: 'McNemar Test', endpoint: '/api/v1/categorical/mcnemar/', precision: 50, guardian: false },
      { id: 'cochran', name: "Cochran's Q", endpoint: '/api/v1/categorical/cochran-q/', precision: 50, guardian: false },
      { id: 'g_test', name: 'G-Test', endpoint: '/api/v1/categorical/g-test/', precision: 50, guardian: false },
      { id: 'binomial', name: 'Binomial Test', endpoint: '/api/v1/categorical/binomial/', precision: 50, guardian: false },
      { id: 'multinomial', name: 'Multinomial Test', endpoint: '/api/v1/categorical/multinomial/', precision: 50, guardian: false }
    ]
  },
  power: {
    name: 'Power Analysis',
    icon: <SpeedIcon />,
    color: '#FF9800',
    tests: [
      { id: 'power_t', name: 'T-Test Power', endpoint: '/api/v1/power/t-test/', precision: 50, guardian: false },
      { id: 'sample_size', name: 'Sample Size Calculator', endpoint: '/api/v1/power/sample-size/t-test/', precision: 50, guardian: false },
      { id: 'effect_size', name: 'Effect Size Calculator', endpoint: '/api/v1/power/effect-size/t-test/', precision: 50, guardian: false },
      { id: 'power_anova', name: 'ANOVA Power', endpoint: '/api/v1/power/anova/', precision: 50, guardian: false },
      { id: 'power_corr', name: 'Correlation Power', endpoint: '/api/v1/power/correlation/', precision: 50, guardian: false },
      { id: 'power_chi', name: 'Chi-Square Power', endpoint: '/api/v1/power/chi-square/', precision: 50, guardian: false },
      { id: 'power_curves', name: 'Power Curves', endpoint: '/api/v1/power/curves/', precision: 50, guardian: false },
      { id: 'sensitivity', name: 'Sensitivity Analysis', endpoint: '/api/v1/power/sensitivity/', precision: 50, guardian: false }
    ]
  },
  missingData: {
    name: 'Missing Data Handling',
    icon: <SearchIcon />,
    color: '#607D8B',
    tests: [
      { id: 'detect', name: 'Pattern Detection', endpoint: '/api/v1/missing-data/detect/', precision: 50, guardian: false },
      { id: 'little', name: "Little's MCAR Test", endpoint: '/api/v1/missing-data/little-test/', precision: 50, guardian: false },
      { id: 'impute', name: 'Simple Imputation', endpoint: '/api/v1/missing-data/impute/', precision: 50, guardian: false },
      { id: 'multiple', name: 'Multiple Imputation', endpoint: '/api/v1/missing-data/multiple-imputation/', precision: 50, guardian: false },
      { id: 'knn', name: 'KNN Imputation', endpoint: '/api/v1/missing-data/knn/', precision: 50, guardian: false },
      { id: 'em', name: 'EM Algorithm', endpoint: '/api/v1/missing-data/em/', precision: 50, guardian: false },
      { id: 'visualize', name: 'Visualize Patterns', endpoint: '/api/v1/missing-data/visualize/', precision: 50, guardian: false }
    ]
  }
};

const TestSelectionDashboard = ({ onSelectTest }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [guardianStatus, setGuardianStatus] = useState('checking');
  const [selectedTest, setSelectedTest] = useState(null);
  const [showGuardianDialog, setShowGuardianDialog] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState('parametric');
  const [stats, setStats] = useState({
    totalTests: 0,
    guardianProtected: 0,
    precisionTests: 0
  });

  useEffect(() => {
    // Calculate statistics
    let total = 0, guardian = 0, precision = 0;
    Object.values(TEST_CATEGORIES).forEach(category => {
      category.tests.forEach(test => {
        total++;
        if (test.guardian) guardian++;
        if (test.precision === 50) precision++;
      });
    });
    setStats({ totalTests: total, guardianProtected: guardian, precisionTests: precision });

    // Check Guardian system status
    checkGuardianStatus();
  }, []);

  const checkGuardianStatus = async () => {
    try {
      const response = await axios.get(getApiUrl(endpoints.guardian.health));
      if (response.data.status === 'operational') {
        setGuardianStatus('active');
      } else {
        setGuardianStatus('inactive');
      }
    } catch (error) {
      setGuardianStatus('error');
    }
  };

  const handleTestSelect = async (test, category) => {
    setSelectedTest({ ...test, category });

    // If test has Guardian protection, check assumptions first
    if (test.guardian && guardianStatus === 'active') {
      setShowGuardianDialog(true);
      // In real implementation, would check actual data here
    } else {
      // Proceed directly to test
      if (onSelectTest) {
        onSelectTest(test, category);
      }
    }
  };

  const filteredCategories = () => {
    if (!searchTerm) return TEST_CATEGORIES;

    const filtered = {};
    Object.entries(TEST_CATEGORIES).forEach(([key, category]) => {
      const filteredTests = category.tests.filter(test =>
        test.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filteredTests.length > 0) {
        filtered[key] = { ...category, tests: filteredTests };
      }
    });
    return filtered;
  };

  return (
      <Box sx={{
        p: 3,
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}>
        {/* Header with Golden Ratio styling */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: PHI / 2 }}
        >
          <Typography
            variant="h3"
            sx={{
              textAlign: 'center',
              mb: 2,
              color: 'primary.main',
              fontWeight: 'bold'
            }}
          >
            Statistical Test Universe
          </Typography>
          <Typography variant="subtitle1" sx={{
            textAlign: 'center',
            mb: 3,
            color: 'text.secondary'
          }}>
            Choose from {stats.totalTests} advanced statistical tests • {stats.guardianProtected} Guardian Protected • {stats.precisionTests} with 50-decimal precision
          </Typography>
        </motion.div>

        {/* Guardian Status Bar */}
        <Fade in={true} timeout={1000}>
          <Alert
            severity={guardianStatus === 'active' ? 'success' : 'warning'}
            icon={<ShieldIcon />}
            sx={{
              mb: 3,
              bgcolor: 'background.paper',
            }}
          >
          {guardianStatus === 'active'
            ? '🛡️ Guardian System Active - Protecting against statistical malpractice'
            : '⚠️ Guardian System Checking - Some protections may be unavailable'}
        </Alert>
      </Fade>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ backgroundColor: 'primary.main', color: 'primary.contrastText' }}>
            <CardContent>
              <Typography variant="h4">{stats.totalTests}</Typography>
              <Typography variant="body2">Total Tests Available</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ backgroundColor: 'error.main', color: 'error.contrastText' }}>
            <CardContent>
              <Typography variant="h4">{stats.guardianProtected}</Typography>
              <Typography variant="body2">Guardian Protected</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ backgroundColor: 'info.main', color: 'info.contrastText' }}>
            <CardContent>
              <Typography variant="h4">{stats.precisionTests}</Typography>
              <Typography variant="body2">50-Decimal Precision</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ backgroundColor: 'success.main', color: 'success.contrastText' }}>
            <CardContent>
              <Typography variant="h4">φ</Typography>
              <Typography variant="body2">Golden Ratio: {PHI.toFixed(3)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

        {/* Search Bar */}
        <TextField
          fullWidth
          placeholder="Search for a statistical test..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              bgcolor: 'background.paper',
            }
          }}
          InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {/* Test Categories */}
      {Object.entries(filteredCategories()).map(([key, category]) => (
        <Accordion
          key={key}
          expanded={expandedCategory === key}
          onChange={() => setExpandedCategory(expandedCategory === key ? null : key)}
          sx={{
            mb: 2,
            bgcolor: 'background.paper',
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Box sx={{ color: category.color }}>{category.icon}</Box>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                {category.name}
              </Typography>
              <Chip
                label={`${category.tests.length} tests`}
                size="small"
                sx={{ bgcolor: category.color, color: 'white' }}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {category.tests.map((test) => (
                <Grid item xs={12} sm={6} md={4} key={test.id}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Card
                      sx={{
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: test.guardian ? '#FFD700' : 'divider',
                        bgcolor: 'background.paper',
                        '&:hover': {
                          borderColor: category.color,
                        }
                      }}
                      onClick={() => handleTestSelect(test, key)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {test.name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {test.guardian && (
                              <Tooltip title="Guardian Protected">
                                <ShieldIcon sx={{ color: '#FFD700', fontSize: 20 }} />
                              </Tooltip>
                            )}
                            {test.precision === 50 && (
                              <Tooltip title="50-Decimal Precision">
                                <Typography sx={{ color: '#4CAF50', fontSize: 12, fontWeight: 'bold' }}>
                                  50D
                                </Typography>
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {test.guardian ? 'Assumption checking enabled' : 'Standard test'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Guardian Pre-Check Dialog */}
      <Dialog open={showGuardianDialog} onClose={() => setShowGuardianDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#FFD700', color: '#000' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShieldIcon />
            Guardian Pre-Flight Check
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            The Guardian System will check all statistical assumptions before running {selectedTest?.name}.
          </Alert>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Assumptions to be checked:
          </Typography>
          <Box sx={{ pl: 2 }}>
            <Typography variant="body2">✓ Normality of distributions</Typography>
            <Typography variant="body2">✓ Homogeneity of variance</Typography>
            <Typography variant="body2">✓ Independence of observations</Typography>
            <Typography variant="body2">✓ Outlier detection</Typography>
            <Typography variant="body2">✓ Sample size adequacy</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowGuardianDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: '#FFD700', color: '#000' }}
            onClick={() => {
              setShowGuardianDialog(false);
              if (onSelectTest) onSelectTest(selectedTest, selectedTest.category);
            }}
          >
            Proceed with Guardian Check
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
  );
};

export default TestSelectionDashboard;