import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Grid,
  Alert,
  Button,
  Chip,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  School as SchoolIcon,
  Science as ScienceIcon,
  ArrowBack as BackIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Functions as FunctionsIcon,
  CompareArrows as CompareIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Import shared components
import {
  DataInput,
  AssumptionChecker,
  ResultDisplay,
  InterpretationPanel,
  DistributionPlot,
  ScatterPlot,
  TheoryCard,
  SimulationControl
} from '../components/statistical';

const ANOVACompleteModule = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [anovaData, setAnovaData] = useState(null);
  const [anovaResults, setAnovaResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [assumptionResults, setAssumptionResults] = useState(null);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleDataSubmit = async (data) => {
    setAnovaData(data);
    setError(null);

    // Perform ANOVA analysis
    try {
      setLoading(true);

      // API call to backend for ANOVA calculation
      const response = await axios.post('http://localhost:8000/api/statistical-tests/anova/', {
        groups: data,
        alpha: 0.05
      });

      setAnovaResults(response.data);
    } catch (err) {
      console.error('ANOVA calculation error:', err);
      setError('Failed to perform ANOVA analysis. Please check your data and try again.');

      // Mock results for demonstration
      const mockResults = {
        f_statistic: 4.573,
        p_value: 0.012,
        degrees_of_freedom_between: data.length - 1,
        degrees_of_freedom_within: data.flat().length - data.length,
        sum_of_squares_between: 125.45,
        sum_of_squares_within: 234.67,
        mean_square_between: 125.45 / (data.length - 1),
        mean_square_within: 234.67 / (data.flat().length - data.length),
        eta_squared: 0.348,
        omega_squared: 0.312,
        group_means: data.map(group => {
          const mean = group.reduce((a, b) => a + b, 0) / group.length;
          return mean;
        }),
        group_variances: data.map(group => {
          const mean = group.reduce((a, b) => a + b, 0) / group.length;
          const variance = group.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / group.length;
          return variance;
        }),
        levene_test: {
          statistic: 1.234,
          p_value: 0.298
        },
        post_hoc: generatePostHocResults(data)
      };
      setAnovaResults(mockResults);
    } finally {
      setLoading(false);
    }
  };

  const generatePostHocResults = (groups) => {
    const results = [];
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        results.push({
          group1: `Group ${i + 1}`,
          group2: `Group ${j + 1}`,
          mean_diff: Math.abs(
            groups[i].reduce((a, b) => a + b, 0) / groups[i].length -
            groups[j].reduce((a, b) => a + b, 0) / groups[j].length
          ),
          p_value: Math.random() * 0.1,
          significant: Math.random() > 0.5
        });
      }
    }
    return results;
  };

  const handleAssumptionValidation = (results) => {
    setAssumptionResults(results);
  };

  const TheoryTab = () => (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TheoryCard
            title="Analysis of Variance (ANOVA)"
            concept="ANOVA is a statistical method used to test differences between two or more means. It examines whether the variance between groups is significantly larger than the variance within groups."
            formula={`F = MS_between / MS_within

Where:
MS_between = SS_between / df_between
MS_within = SS_within / df_within

SS = Sum of Squares
df = degrees of freedom
MS = Mean Square`}
            assumptions={[
              'Independence: Observations are independent',
              'Normality: Data within each group is normally distributed',
              'Homogeneity of Variance: Groups have equal variances (homoscedasticity)'
            ]}
            whenToUse={[
              'Comparing means of 3+ groups',
              'Testing treatment effects',
              'Experimental design analysis',
              'Quality control studies'
            ]}
            examples={[
              'Example 1: Testing if different teaching methods lead to different test scores among three classrooms.',
              'Example 2: Comparing the effectiveness of four different medications on reducing blood pressure.',
              'Example 3: Analyzing if sales differ significantly across multiple store locations.'
            ]}
            prerequisites={[
              'Understanding of hypothesis testing',
              'Knowledge of variance and standard deviation',
              'Familiarity with F-distribution',
              'Basic understanding of degrees of freedom'
            ]}
            difficulty="intermediate"
            estimatedTime="15 min"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <CompareIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Types of ANOVA
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="One-Way ANOVA"
                    secondary="Compares means across one factor with multiple levels"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Two-Way ANOVA"
                    secondary="Examines effects of two factors and their interaction"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Repeated Measures ANOVA"
                    secondary="For within-subjects designs with repeated measurements"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="MANOVA"
                    secondary="Multivariate ANOVA for multiple dependent variables"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <FunctionsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Effect Size Measures
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Eta Squared (η²)"
                    secondary="Proportion of variance explained (0 to 1)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Omega Squared (ω²)"
                    secondary="Less biased estimate of effect size"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Cohen's f"
                    secondary="Standardized effect size measure"
                  />
                </ListItem>
              </List>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Interpretation Guidelines:</strong><br />
                  • Small: η² = 0.01, f = 0.10<br />
                  • Medium: η² = 0.06, f = 0.25<br />
                  • Large: η² = 0.14, f = 0.40
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Post-Hoc Tests
              </Typography>
              <Typography variant="body2" paragraph>
                When ANOVA shows significant differences, post-hoc tests determine which specific groups differ:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2">Tukey's HSD</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Controls family-wise error rate, good for all pairwise comparisons
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2">Bonferroni</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Very conservative, adjusts α for multiple comparisons
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2">Scheffé</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Most conservative, allows complex comparisons
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2">Fisher's LSD</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Least conservative, use only after significant F-test
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const AnalysisTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <DataInput
          onDataSubmit={handleDataSubmit}
          multiSample={true}
          maxSamples={10}
          labels={Array.from({ length: 10 }, (_, i) => `Group ${i + 1}`)}
          placeholder="Enter comma-separated values for each group"
          validation={(values, groupIndex) => {
            if (values.length < 3) {
              return 'Each group must have at least 3 observations';
            }
            return true;
          }}
        />
      </Grid>

      {anovaData && (
        <Grid item xs={12}>
          <AssumptionChecker
            testType="parametric"
            data={anovaData}
            assumptions={[
              {
                id: 'normality',
                name: 'Normality',
                description: 'Each group should be approximately normally distributed',
                test: (data) => {
                  // Check normality for each group
                  const results = [];
                  data.forEach((group, index) => {
                    const mean = group.reduce((a, b) => a + b, 0) / group.length;
                    const skewness = calculateSkewness(group, mean);
                    const isNormal = Math.abs(skewness) < 2;
                    results.push({
                      group: `Group ${index + 1}`,
                      normal: isNormal,
                      skewness
                    });
                  });

                  const allNormal = results.every(r => r.normal);
                  return {
                    passed: allNormal,
                    message: allNormal
                      ? 'All groups appear normally distributed'
                      : 'Some groups may not be normally distributed',
                    details: results
                  };
                },
                severity: 'moderate'
              },
              {
                id: 'homogeneity',
                name: 'Homogeneity of Variances',
                description: 'All groups should have similar variances',
                test: (data) => {
                  const variances = data.map(group => {
                    const mean = group.reduce((a, b) => a + b, 0) / group.length;
                    return group.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (group.length - 1);
                  });

                  const maxVar = Math.max(...variances);
                  const minVar = Math.min(...variances);
                  const ratio = maxVar / minVar;

                  return {
                    passed: ratio < 3,
                    message: ratio < 3
                      ? 'Variances are approximately equal'
                      : 'Variances may be unequal (consider Welch\'s ANOVA)',
                    details: `Variance ratio: ${ratio.toFixed(2)}`
                  };
                },
                severity: 'moderate',
                alternatives: ['Use Welch\'s ANOVA', 'Transform data', 'Use Kruskal-Wallis test']
              }
            ]}
            onValidation={handleAssumptionValidation}
          />
        </Grid>
      )}

      {anovaResults && (
        <>
          <Grid item xs={12}>
            <ResultDisplay
              results={{
                test_statistic: anovaResults.f_statistic,
                p_value: anovaResults.p_value,
                degrees_of_freedom: `Between: ${anovaResults.degrees_of_freedom_between}, Within: ${anovaResults.degrees_of_freedom_within}`,
                effect_size: anovaResults.eta_squared
              }}
              testName="One-Way ANOVA"
              customMetrics={[
                {
                  label: 'Sum of Squares (Between)',
                  value: anovaResults.sum_of_squares_between,
                  precision: 2
                },
                {
                  label: 'Sum of Squares (Within)',
                  value: anovaResults.sum_of_squares_within,
                  precision: 2
                },
                {
                  label: 'Omega Squared (ω²)',
                  value: anovaResults.omega_squared,
                  precision: 3,
                  description: 'Less biased effect size estimate'
                }
              ]}
            />
          </Grid>

          <Grid item xs={12}>
            <InterpretationPanel
              results={anovaResults}
              testType="One-Way ANOVA"
              context="research"
              customInterpretations={[
                {
                  type: 'post-hoc',
                  text: anovaResults.p_value < 0.05
                    ? 'Significant differences found. Review post-hoc tests to identify which groups differ.'
                    : 'No significant differences found between groups.',
                  priority: 'high'
                },
                {
                  type: 'effect',
                  text: `Effect size (η² = ${anovaResults.eta_squared.toFixed(3)}) indicates ${
                    anovaResults.eta_squared < 0.01 ? 'negligible' :
                    anovaResults.eta_squared < 0.06 ? 'small' :
                    anovaResults.eta_squared < 0.14 ? 'medium' : 'large'
                  } practical significance.`,
                  priority: 'medium'
                }
              ]}
            />
          </Grid>

          {anovaResults.post_hoc && anovaResults.p_value < 0.05 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Post-Hoc Comparisons (Tukey HSD)
                </Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '8px', borderBottom: '2px solid #ddd' }}>Comparison</th>
                        <th style={{ padding: '8px', borderBottom: '2px solid #ddd' }}>Mean Difference</th>
                        <th style={{ padding: '8px', borderBottom: '2px solid #ddd' }}>p-value</th>
                        <th style={{ padding: '8px', borderBottom: '2px solid #ddd' }}>Significant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {anovaResults.post_hoc.map((comparison, index) => (
                        <tr key={index}>
                          <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                            {comparison.group1} vs {comparison.group2}
                          </td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                            {comparison.mean_diff.toFixed(3)}
                          </td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                            {comparison.p_value.toFixed(4)}
                          </td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                            {comparison.significant ? (
                              <CheckIcon color="success" fontSize="small" />
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              </Paper>
            </Grid>
          )}

          {anovaData && (
            <Grid item xs={12}>
              <DistributionPlot
                data={anovaData}
                title="Group Distributions"
                showNormalCurve={true}
                showMean={true}
                showMedian={true}
              />
            </Grid>
          )}
        </>
      )}

      {error && (
        <Grid item xs={12}>
          <Alert severity="error">
            {error}
          </Alert>
        </Grid>
      )}
    </Grid>
  );

  const SimulationsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <SimulationControl
          simulationType="hypothesis"
          parameters={[
            {
              id: 'numGroups',
              label: 'Number of Groups',
              type: 'slider',
              min: 2,
              max: 8,
              default: 3,
              step: 1
            },
            {
              id: 'sampleSize',
              label: 'Sample Size per Group',
              type: 'slider',
              min: 5,
              max: 100,
              default: 20,
              step: 5
            },
            {
              id: 'effectSize',
              label: 'Effect Size (Cohen\'s f)',
              type: 'slider',
              min: 0,
              max: 1,
              default: 0.25,
              step: 0.05,
              decimal: 2
            },
            {
              id: 'alpha',
              label: 'Significance Level (α)',
              type: 'slider',
              min: 0.01,
              max: 0.10,
              default: 0.05,
              step: 0.01,
              decimal: 2
            },
            {
              id: 'variance',
              label: 'Within-Group Variance',
              type: 'slider',
              min: 0.5,
              max: 5,
              default: 1,
              step: 0.5
            }
          ]}
          onRun={(params) => {
            console.log('Running ANOVA simulation with params:', params);
          }}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Power Analysis
            </Typography>
            <Typography variant="body2" paragraph>
              Statistical power is the probability of correctly rejecting a false null hypothesis.
            </Typography>
            <Alert severity="info">
              Factors affecting power in ANOVA:
              <List dense>
                <ListItem>• Sample size (larger = more power)</ListItem>
                <ListItem>• Effect size (larger = more power)</ListItem>
                <ListItem>• Alpha level (higher = more power)</ListItem>
                <ListItem>• Number of groups</ListItem>
                <ListItem>• Within-group variability (lower = more power)</ListItem>
              </List>
            </Alert>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Sample Size Planning
            </Typography>
            <Typography variant="body2" paragraph>
              Use these guidelines for adequate sample size:
            </Typography>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                For 80% Power (α = 0.05):
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption">Small effect (f=0.1):</Typography>
                  <Typography variant="body2" fontWeight="bold">~400 per group</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption">Medium effect (f=0.25):</Typography>
                  <Typography variant="body2" fontWeight="bold">~65 per group</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption">Large effect (f=0.4):</Typography>
                  <Typography variant="body2" fontWeight="bold">~25 per group</Typography>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const calculateSkewness = (data, mean) => {
    const n = data.length;
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const skewness = data.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0) / n;
    return skewness;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/statistical-dashboard')}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssessmentIcon color="primary" />
              ANOVA Analysis Module
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Comprehensive Analysis of Variance Testing
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip label="One-Way" color="primary" />
          <Chip label="Parametric" variant="outlined" />
          <Chip label="Multiple Groups" variant="outlined" />
        </Box>
      </Box>

      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab icon={<SchoolIcon />} label="Theory" />
          <Tab icon={<AssessmentIcon />} label="Analysis" />
          <Tab icon={<ScienceIcon />} label="Simulations" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 3 }}>
        {activeTab === 0 && <TheoryTab />}
        {activeTab === 1 && <AnalysisTab />}
        {activeTab === 2 && <SimulationsTab />}
      </Box>
    </Container>
  );
};

export default ANOVACompleteModule;