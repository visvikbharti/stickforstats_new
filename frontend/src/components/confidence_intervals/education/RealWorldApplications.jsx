import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardHeader,
  CardActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tab,
  Tabs
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import BarChartIcon from '@mui/icons-material/BarChart';
import ScienceIcon from '@mui/icons-material/Science';
import BusinessIcon from '@mui/icons-material/Business';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import SchoolIcon from '@mui/icons-material/School';
import axios from 'axios';

// Import for rendering math formulas
import { MathJaxContext, MathJax } from 'better-react-mathjax';

/**
 * Real-World Applications component for Confidence Intervals module
 * Showcases how confidence intervals are used in various fields and practical examples
 */
const RealWorldApplications = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [caseStudies, setCaseStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch case studies from the backend
  useEffect(() => {
    const fetchCaseStudies = async () => {
      try {
        const response = await axios.get('/api/v1/confidence-intervals/case-studies/');
        // Ensure response.data is an array
        if (Array.isArray(response.data)) {
          setCaseStudies(response.data);
        } else if (response.data && Array.isArray(response.data.results)) {
          // Handle paginated response
          setCaseStudies(response.data.results);
        } else if (response.data && Array.isArray(response.data.data)) {
          // Handle wrapped data response
          setCaseStudies(response.data.data);
        } else {
          console.warn('Unexpected response format from case studies API:', response.data);
          // Set demo data as fallback
          setCaseStudies([
            {
              id: 'demo1',
              title: 'Clinical Trial for New Diabetes Treatment',
              field: 'Medical Research',
              context: 'A randomized controlled trial with 500 participants comparing a new diabetes medication to standard treatment.',
              key_finding: 'The new treatment reduced HbA1c levels by 1.2% compared to 0.8% for standard treatment.',
              interval_description: 'Difference: 0.4% (95% CI: 0.2% to 0.6%)',
              impact: 'The new treatment was approved based on the clinically significant improvement and narrow confidence interval.',
              source_url: '#'
            },
            {
              id: 'demo2',
              title: 'Online Learning Platform Effectiveness',
              field: 'Education',
              context: 'A study of 1,200 students comparing traditional classroom learning to an online platform for mathematics.',
              key_finding: 'Students using the online platform scored an average of 6 points higher on standardized tests.',
              interval_description: 'Mean difference: 6 points (95% CI: 2.5 to 9.5 points)',
              impact: 'Schools implemented a hybrid approach, using the online platform as a supplement to traditional teaching.',
              source_url: '#'
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching case studies:', error);
        // Even if there's an error, still set some demo data
        setCaseStudies([
          {
            id: 'demo1',
            title: 'Clinical Trial for New Diabetes Treatment',
            field: 'Medical Research',
            context: 'A randomized controlled trial with 500 participants comparing a new diabetes medication to standard treatment.',
            key_finding: 'The new treatment reduced HbA1c levels by 1.2% compared to 0.8% for standard treatment.',
            interval_description: 'Difference: 0.4% (95% CI: 0.2% to 0.6%)',
            impact: 'The new treatment was approved based on the clinically significant improvement and narrow confidence interval.',
            source_url: '#'
          },
          {
            id: 'demo2',
            title: 'Online Learning Platform Effectiveness',
            field: 'Education',
            context: 'A study of 1,200 students comparing traditional classroom learning to an online platform for mathematics.',
            key_finding: 'Students using the online platform scored an average of 6 points higher on standardized tests.',
            interval_description: 'Mean difference: 6 points (95% CI: 2.5 to 9.5 points)',
            impact: 'Schools implemented a hybrid approach, using the online platform as a supplement to traditional teaching.',
            source_url: '#'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCaseStudies();
  }, []);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // MathJax configuration
  const mathJaxConfig = {
    tex: {
      inlineMath: [['$', '$'], ['\\(', '\\)']],
      displayMath: [['$$', '$$'], ['\\[', '\\]']]
    },
    svg: {
      fontCache: 'global'
    }
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <Box>
        <Typography variant="h5" gutterBottom>
          Real-World Applications of Confidence Intervals
        </Typography>
        
        <Typography paragraph>
          Confidence intervals are essential tools in data analysis across many fields. This section explores 
          practical applications, common pitfalls, and best practices for interpreting and reporting confidence 
          intervals in real-world contexts.
        </Typography>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="applications tabs">
            <Tab label="Applications by Field" icon={<BusinessIcon />} iconPosition="start" />
            <Tab label="Case Studies" icon={<ScienceIcon />} iconPosition="start" />
            <Tab label="Best Practices" icon={<CheckCircleIcon />} iconPosition="start" />
            <Tab label="Common Pitfalls" icon={<WarningIcon />} iconPosition="start" />
          </Tabs>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {/* Applications by Field */}
            {activeTab === 0 && (
              <Box>
                <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Applications Across Different Fields
                  </Typography>
                  
                  <Typography paragraph>
                    Confidence intervals serve different purposes and address different questions depending on the field.
                    Here we explore how confidence intervals are applied in various disciplines.
                  </Typography>
                  
                  <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">
                        <LocalHospitalIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Medical Research and Clinical Trials
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            Key Applications
                          </Typography>
                          <List dense>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircleIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="Treatment Effect Estimation" 
                                secondary="Confidence intervals for the difference in outcomes between treatment and control groups" 
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircleIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="Risk Ratio and Odds Ratio Analysis" 
                                secondary="Intervals for relative measures of effect, often reported on log scale" 
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircleIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="Survival Analysis" 
                                secondary="Confidence bands for survival curves and hazard ratios" 
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircleIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="Bioequivalence Studies" 
                                secondary="Intervals used to demonstrate that generic drugs are equivalent to brand-name drugs" 
                              />
                            </ListItem>
                          </List>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            Example: Treatment Effect
                          </Typography>
                          <Typography variant="body2" paragraph>
                            In a clinical trial comparing a new blood pressure medication to a standard treatment, 
                            researchers reported a mean reduction in systolic blood pressure of 12.5 mmHg (95% CI: 9.8 to 15.2) 
                            compared to 8.3 mmHg (95% CI: 6.2 to 10.4) for the standard treatment.
                          </Typography>
                          <Typography variant="body2" paragraph>
                            The difference between treatments was 4.2 mmHg (95% CI: 1.1 to 7.3).
                          </Typography>
                          <Typography variant="body2">
                            <strong>Interpretation:</strong> Since the CI for the difference excludes zero, 
                            there is evidence of a statistically significant difference between treatments. 
                            The precision of the estimate (width of the CI) suggests moderate uncertainty 
                            about the true magnitude of the effect.
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Alert severity="info">
                            <Typography variant="body2">
                              <strong>Industry Standard:</strong> The CONSORT guidelines for reporting clinical trials recommend 
                              "For each primary and secondary outcome, results for each group, and the estimated effect size and its 
                              precision (such as 95% confidence interval)."
                            </Typography>
                          </Alert>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">
                        <BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Business and Market Research
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            Key Applications
                          </Typography>
                          <List dense>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircleIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="A/B Testing" 
                                secondary="Confidence intervals for conversion rate differences between website versions" 
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircleIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="Market Share Estimation" 
                                secondary="Intervals for the proportion of customers who prefer a product" 
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircleIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="Customer Lifetime Value" 
                                secondary="Confidence bounds on revenue projections" 
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircleIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="Marketing Campaign Effectiveness" 
                                secondary="Intervals for ROI and response rate metrics" 
                              />
                            </ListItem>
                          </List>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            Example: A/B Testing
                          </Typography>
                          <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, mb: 2 }}>
                            <Typography variant="body2" paragraph>
                              <strong>Version A:</strong> 320 conversions from 4,000 visitors (8.0%)
                            </Typography>
                            <Typography variant="body2" paragraph>
                              <strong>Version B:</strong> 384 conversions from 4,000 visitors (9.6%)
                            </Typography>
                            <Typography variant="body2" paragraph>
                              <strong>Difference:</strong> 1.6 percentage points (95% CI: 0.3 to 2.9)
                            </Typography>
                            <Typography variant="body2">
                              <strong>Relative improvement:</strong> 20% (95% CI: 4% to 36%)
                            </Typography>
                          </Box>
                          <Typography variant="body2">
                            <strong>Business Decision:</strong> Since the confidence interval for the difference excludes zero, 
                            there is evidence that Version B performs better. The lower bound of the relative improvement (4%) 
                            suggests that even in the conservative case, the improvement is meaningful for the business.
                          </Typography>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">
                        <BarChartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Environmental Science and Policy
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            Key Applications
                          </Typography>
                          <List dense>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircleIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="Climate Change Models" 
                                secondary="Confidence intervals for temperature change projections" 
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircleIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="Pollution Monitoring" 
                                secondary="Intervals for concentration of pollutants and compliance with regulations" 
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircleIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="Ecological Population Estimates" 
                                secondary="Confidence bounds for population sizes of endangered species" 
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircleIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="Environmental Impact Assessment" 
                                secondary="Intervals for potential effects of development projects" 
                              />
                            </ListItem>
                          </List>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            Example: Climate Projections
                          </Typography>
                          <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, mb: 2 }}>
                            <Typography variant="body2" paragraph>
                              The IPCC Sixth Assessment Report projects global warming of 1.5°C to 4.5°C by 2100 
                              under different scenarios, with a likely range (66% confidence interval) of 2.5°C to 4.0°C
                              for the high emissions scenario.
                            </Typography>
                          </Box>
                          <Typography variant="body2">
                            <strong>Policy Implications:</strong> The width of this interval represents uncertainty 
                            in climate sensitivity and future emissions. Even the lower bound of 2.5°C exceeds the 
                            2°C target in the Paris Agreement, suggesting a high probability of missing this target 
                            without substantial emissions reductions.
                          </Typography>
                          <Alert severity="info" sx={{ mt: 2 }}>
                            <Typography variant="body2">
                              <strong>Note:</strong> Environmental science often uses intervals with different confidence 
                              levels (e.g., 66% "likely range") than the conventional 95% used in other fields.
                            </Typography>
                          </Alert>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">
                        <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Education and Psychology
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            Key Applications
                          </Typography>
                          <List dense>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircleIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="Effect Sizes in Intervention Studies" 
                                secondary="Confidence intervals for Cohen's d, Hedges' g, etc." 
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircleIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="Test Score Analysis" 
                                secondary="Intervals for mean differences between teaching methods" 
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircleIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="Reliability Coefficients" 
                                secondary="Confidence intervals for Cronbach's alpha and other reliability measures" 
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircleIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="Meta-Analysis" 
                                secondary="Intervals for pooled effect sizes across multiple studies" 
                              />
                            </ListItem>
                          </List>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            Example: Educational Intervention
                          </Typography>
                          <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, mb: 2 }}>
                            <Typography variant="body2" paragraph>
                              A study comparing a new teaching method to traditional instruction found:
                            </Typography>
                            <Typography variant="body2" paragraph>
                              <strong>Standardized mean difference (Cohen's d):</strong> 0.45 (95% CI: 0.28 to 0.62)
                            </Typography>
                            <Typography variant="body2">
                              This represents a moderate effect size, with the confidence interval suggesting the true effect 
                              is likely at least small (0.28) but could be as large as medium-large (0.62).
                            </Typography>
                          </Box>
                          <Typography variant="body2">
                            <strong>Research Implications:</strong> The lower bound of the CI (0.28) represents a meaningful 
                            educational effect, providing strong evidence for the effectiveness of the new method. The precision 
                            of the estimate (width of CI) suggests adequate sample size and reliable measurement.
                          </Typography>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Paper>
                
                <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Specialized Confidence Interval Applications
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom color="primary">
                            Tolerance Intervals
                          </Typography>
                          <Typography variant="body2" paragraph>
                            <strong>Definition:</strong> Intervals that contain a specified proportion of the population with a given confidence level.
                          </Typography>
                          <Typography variant="body2" paragraph>
                            Unlike confidence intervals for the mean, tolerance intervals aim to cover individual observations.
                          </Typography>
                          <Box sx={{ p: 2, bgcolor: 'background.paper', mb: 2 }}>
                            <MathJax>
                              {"$$\\bar{x} \\pm k \\cdot s$$"}
                            </MathJax>
                            <Typography variant="body2">
                              Where $k$ depends on sample size, confidence level, and proportion of population to include.
                            </Typography>
                          </Box>
                          <Typography variant="body2">
                            <strong>Applications:</strong> Quality control, reference ranges in laboratory tests, environmental limits
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom color="primary">
                            Prediction Intervals
                          </Typography>
                          <Typography variant="body2" paragraph>
                            <strong>Definition:</strong> Intervals that predict where future observations will fall with a specified probability.
                          </Typography>
                          <Typography variant="body2" paragraph>
                            Wider than confidence intervals because they include both parameter uncertainty and individual variation.
                          </Typography>
                          <Box sx={{ p: 2, bgcolor: 'background.paper', mb: 2 }}>
                            <MathJax>
                              {"$$\\bar{x} \\pm t_{\\alpha/2, n-1} \\cdot s \\cdot \\sqrt{1 + \\frac{1}{n}}$$"}
                            </MathJax>
                          </Box>
                          <Typography variant="body2">
                            <strong>Applications:</strong> Forecasting, time series analysis, predictive modeling
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom color="primary">
                            Simultaneous Confidence Intervals
                          </Typography>
                          <Typography variant="body2" paragraph>
                            <strong>Definition:</strong> Sets of intervals for multiple parameters that maintain a specified joint confidence level.
                          </Typography>
                          <Typography variant="body2" paragraph>
                            Methods include Bonferroni, Scheffé, and Tukey procedures that adjust for multiple comparisons.
                          </Typography>
                          <Typography variant="body2">
                            <strong>Applications:</strong> ANOVA post-hoc tests, multiple regression parameters, dose-response curves
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>
            )}
            
            {/* Case Studies */}
            {activeTab === 1 && (
              <Box>
                <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Real-World Case Studies
                  </Typography>
                  
                  <Typography paragraph>
                    These case studies illustrate how confidence intervals are used to address practical questions 
                    in various fields. Each example demonstrates the application of statistical principles to real-world 
                    data and decision-making.
                  </Typography>
                  
                  <Grid container spacing={3}>
                    {Array.isArray(caseStudies) && caseStudies.map((study) => (
                      <Grid item xs={12} md={6} key={study.id}>
                        <Card variant="outlined">
                          <CardHeader
                            title={study.title}
                            subheader={study.field}
                          />
                          <CardContent>
                            <Typography variant="body2" paragraph>
                              <strong>Context:</strong> {study.context}
                            </Typography>
                            <Typography variant="body2" paragraph>
                              <strong>Key Finding:</strong> {study.key_finding}
                            </Typography>
                            <Typography variant="body2" paragraph>
                              <strong>Confidence Interval:</strong> {study.interval_description}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Impact/Decision:</strong> {study.impact}
                            </Typography>
                          </CardContent>
                          <CardActions>
                            <Button size="small" color="primary" href={study.source_url} target="_blank" rel="noopener">
                              Learn More
                            </Button>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                  
                  {(!Array.isArray(caseStudies) || caseStudies.length === 0) && (
                    <Alert severity="info">
                      No case studies available at this time. Please check back later.
                    </Alert>
                  )}
                </Paper>
                
                <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Featured Case Study: Clinical Trial Example
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={7}>
                      <Typography variant="subtitle1" gutterBottom>
                        Comparing Treatment Efficacy with Confidence Intervals
                      </Typography>
                      
                      <Typography variant="body2" paragraph>
                        A pharmaceutical company conducted a clinical trial comparing a new drug for reducing LDL cholesterol 
                        against an existing standard treatment. The study included 320 patients randomly assigned to either 
                        the new drug (n=160) or the standard treatment (n=160).
                      </Typography>
                      
                      <Typography variant="subtitle2" gutterBottom>
                        Key Results:
                      </Typography>
                      
                      <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, mb: 2 }}>
                        <Typography variant="body2" paragraph>
                          <strong>Mean LDL reduction with new drug:</strong> 42.3 mg/dL (95% CI: 38.6 to 46.0)
                        </Typography>
                        <Typography variant="body2" paragraph>
                          <strong>Mean LDL reduction with standard treatment:</strong> 36.9 mg/dL (95% CI: 33.5 to 40.3)
                        </Typography>
                        <Typography variant="body2">
                          <strong>Mean difference (new - standard):</strong> 5.4 mg/dL (95% CI: 0.2 to 10.6)
                        </Typography>
                      </Box>
                      
                      <Typography variant="subtitle2" gutterBottom>
                        Analysis and Decision:
                      </Typography>
                      
                      <Typography variant="body2" paragraph>
                        The confidence interval for the difference (0.2 to 10.6) barely excludes zero, indicating statistical 
                        significance at the conventional 5% level. However, the lower bound of 0.2 mg/dL is much smaller than 
                        the pre-specified minimally clinically important difference of 5 mg/dL.
                      </Typography>
                      
                      <Typography variant="body2">
                        This illustrates an important distinction between statistical significance and clinical significance. 
                        While the result is technically significant (p &lt; 0.05), the confidence interval suggests that the true 
                        treatment effect might be too small to be clinically meaningful in practice.
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={5}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom color="primary">
                            Visualization of Results
                          </Typography>
                          
                          <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5', mb: 2 }}>
                            {/* Placeholder for forest plot or confidence interval visualization */}
                            <Typography variant="body2" color="text.secondary">
                              [Forest plot visualization of trial results]
                            </Typography>
                          </Box>
                          
                          <Typography variant="subtitle2" gutterBottom>
                            Key Lessons:
                          </Typography>
                          
                          <List dense>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircleIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="The width of the confidence interval provides important context about precision" 
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircleIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="Statistical significance doesn't guarantee clinical importance" 
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircleIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="Confidence intervals facilitate better decision-making than p-values alone" 
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircleIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="Visualizing intervals aids interpretation and communication" 
                              />
                            </ListItem>
                          </List>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>
            )}
            
            {/* Best Practices */}
            {activeTab === 2 && (
              <Box>
                <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Best Practices for Using and Reporting Confidence Intervals
                  </Typography>
                  
                  <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="body2">
                      <strong>Key Principle:</strong> Confidence intervals should complement, not just replace, hypothesis tests.
                      They provide information about effect size, precision, and practical significance that p-values alone cannot convey.
                    </Typography>
                  </Alert>
                  
                  <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Planning and Study Design</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Sample Size for Precision" 
                            secondary="Design studies based on confidence interval width rather than just power for hypothesis tests" 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Pre-specify the Confidence Level" 
                            secondary="Select and justify the confidence level (typically 90%, 95%, or 99%) before data collection" 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Define Minimally Important Differences" 
                            secondary="Specify what effect size would be practically meaningful for your context" 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Consider Multiple Methods" 
                            secondary="For parameters with multiple confidence interval approaches, justify your choice or report several" 
                          />
                        </ListItem>
                      </List>
                      
                      <Alert severity="success" sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Sample Size for Precision Example
                        </Typography>
                        <Typography variant="body2">
                          Instead of calculating sample size based on 80% power to detect a difference at α = 0.05, 
                          determine sample size needed for a 95% confidence interval with half-width no more than ±5 units.
                          
                          <Box sx={{ p: 2, bgcolor: 'background.paper', mt: 1, borderRadius: 1 }}>
                            <MathJax>
                              {"$$n \\approx \\left(\\frac{z_{\\alpha/2} \\cdot \\sigma}{E}\\right)^2$$"}
                            </MathJax>
                            <Typography variant="body2">
                              Where E is the desired half-width of the confidence interval.
                            </Typography>
                          </Box>
                        </Typography>
                      </Alert>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Calculation and Analysis</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Verify Assumptions" 
                            secondary="Check that data meet the assumptions of the confidence interval method" 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Use Appropriate Methods" 
                            secondary="Select methods based on data characteristics (e.g., exact methods for small samples)" 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Consider Transformations" 
                            secondary="For skewed data, calculate intervals on transformed scale (e.g., log) then back-transform" 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Adjust for Multiple Comparisons" 
                            secondary="Use simultaneous confidence intervals when making multiple comparisons" 
                          />
                        </ListItem>
                      </List>
                      
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} md={6}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="subtitle2" gutterBottom color="primary">
                                Example: Skewed Data
                              </Typography>
                              <Typography variant="body2">
                                For income data (typically right-skewed):
                              </Typography>
                              <ol>
                                <li>
                                  <Typography variant="body2">
                                    Log-transform the data: <MathJax inline>{"Y = \\log(X)"}</MathJax>
                                  </Typography>
                                </li>
                                <li>
                                  <Typography variant="body2">
                                    Calculate 95% CI for mean of <MathJax inline>{"Y"}</MathJax>: <MathJax inline>{"[\\bar{Y}_L, \\bar{Y}_U]"}</MathJax>
                                  </Typography>
                                </li>
                                <li>
                                  <Typography variant="body2">
                                    Back-transform: <MathJax inline>{"[e^{\\bar{Y}_L}, e^{\\bar{Y}_U}]"}</MathJax>
                                  </Typography>
                                </li>
                              </ol>
                              <Typography variant="body2">
                                This produces an asymmetric interval that better reflects the data's distribution.
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="subtitle2" gutterBottom color="primary">
                                Example: Multiple Comparisons
                              </Typography>
                              <Typography variant="body2" paragraph>
                                When comparing means of 5 groups (10 pairwise comparisons):
                              </Typography>
                              <Typography variant="body2" paragraph>
                                <strong>Individual 95% CIs:</strong> Only 95% confidence for each comparison separately.
                              </Typography>
                              <Typography variant="body2" paragraph>
                                <strong>Bonferroni-adjusted 95% CIs:</strong> 99.5% individual confidence level ($1-0.05/10$) ensures 95% family-wise confidence.
                              </Typography>
                              <Typography variant="body2">
                                <strong>Tukey's HSD intervals:</strong> Specifically designed for all pairwise comparisons, more powerful than Bonferroni.
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Reporting and Visualization</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Report the Full Interval" 
                            secondary="Always show both lower and upper bounds, not just the margin of error" 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Include the Confidence Level" 
                            secondary="Clearly specify the level (e.g., 95% CI: 10.2 to 15.7)" 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Use Appropriate Precision" 
                            secondary="Report to a reasonable number of decimal places based on measurement precision" 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Visualize Intervals" 
                            secondary="Use forest plots, error bars, or other graphical methods to display confidence intervals" 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Describe the Method" 
                            secondary="Specify how the confidence interval was calculated, especially for non-standard methods" 
                          />
                        </ListItem>
                      </List>
                      
                      <Alert severity="success" sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Recommended Format for Reporting
                        </Typography>
                        <Typography variant="body2">
                          <strong>Text:</strong> "The mean difference was 5.4 mg/dL (95% CI: 0.2 to 10.6)."
                        </Typography>
                        <Typography variant="body2">
                          <strong>Tables:</strong> Include separate columns for point estimates and confidence intervals.
                        </Typography>
                        <Typography variant="body2">
                          <strong>Figures:</strong> Use error bars with clear captions explaining what they represent.
                        </Typography>
                      </Alert>
                      
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Example Visualization: Forest Plot
                        </Typography>
                        
                        {/* Placeholder for a forest plot example */}
                        <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5' }}>
                          <Typography variant="body2" color="text.secondary">
                            [Example forest plot showing confidence intervals across multiple studies or groups]
                          </Typography>
                        </Box>
                        
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Forest plots are particularly effective for meta-analyses and comparative studies, 
                          showing multiple confidence intervals and their relationship to a reference value (e.g., zero for differences).
                        </Typography>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Interpretation and Decision-Making</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Interpret the Entire Interval" 
                            secondary="Consider the range of plausible values, not just whether zero is excluded" 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Assess Practical Significance" 
                            secondary="Compare the interval to thresholds of practical or clinical importance" 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Avoid Dichotomous Thinking" 
                            secondary="Don't treat confidence intervals as simply 'significant' or 'not significant'" 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Consider External Validity" 
                            secondary="Discuss how generalizable the interval might be to other populations or contexts" 
                          />
                        </ListItem>
                      </List>
                      
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Interpretation Framework Examples
                        </Typography>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={4}>
                            <Typography variant="body2" paragraph>
                              <strong>CI entirely above threshold:</strong> Strong evidence of meaningful effect
                            </Typography>
                            <Typography variant="body2">
                              Example: Effect 10.5 (95% CI: 6.2 to 14.8), threshold = 5
                            </Typography>
                          </Grid>
                          
                          <Grid item xs={12} md={4}>
                            <Typography variant="body2" paragraph>
                              <strong>CI partially above threshold:</strong> Possible meaningful effect, but uncertainty remains
                            </Typography>
                            <Typography variant="body2">
                              Example: Effect 8.3 (95% CI: 2.1 to 14.5), threshold = 5
                            </Typography>
                          </Grid>
                          
                          <Grid item xs={12} md={4}>
                            <Typography variant="body2" paragraph>
                              <strong>CI entirely below threshold:</strong> Strong evidence against meaningful effect
                            </Typography>
                            <Typography variant="body2">
                              Example: Effect 2.7 (95% CI: 0.3 to 4.9), threshold = 5
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                      
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Remember:</strong> The confidence interval represents a range of plausible values for the population parameter.
                          A narrow interval indicates precision, while a wide interval suggests considerable uncertainty. Both the width and the
                          location of the interval relative to meaningful thresholds should inform decision-making.
                        </Typography>
                      </Alert>
                    </AccordionDetails>
                  </Accordion>
                </Paper>
              </Box>
            )}
            
            {/* Common Pitfalls */}
            {activeTab === 3 && (
              <Box>
                <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Common Pitfalls and Misconceptions
                  </Typography>
                  
                  <Typography paragraph>
                    Despite their utility, confidence intervals are often misunderstood or misused. 
                    Understanding these common pitfalls can help you avoid mistakes in interpretation and application.
                  </Typography>
                  
                  <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">
                        <WarningIcon sx={{ mr: 1, color: '#f44336' }} />
                        Misinterpreting the Confidence Level
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="error" gutterBottom>
                          INCORRECT Interpretation:
                        </Typography>
                        <Typography variant="body2" paragraph sx={{ fontStyle: 'italic' }}>
                          "There is a 95% probability that the true parameter lies within the confidence interval."
                        </Typography>
                        <Typography variant="body2">
                          This interpretation is wrong because it treats the true parameter as a random variable and the confidence 
                          interval as fixed, when the opposite is true in frequentist statistics.
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="success" gutterBottom>
                          CORRECT Interpretation:
                        </Typography>
                        <Typography variant="body2" paragraph sx={{ fontStyle: 'italic' }}>
                          "If we were to repeat the sampling process many times and calculate a 95% confidence interval each time, 
                          about 95% of these intervals would contain the true parameter value."
                        </Typography>
                        <Typography variant="body2">
                          This correctly describes the frequentist perspective where the true parameter is fixed, and the confidence 
                          interval is random (varies from sample to sample).
                        </Typography>
                      </Box>
                      
                      <Alert severity="info">
                        <Typography variant="body2">
                          <strong>Note:</strong> If you want to make probability statements about the parameter, use Bayesian credible intervals instead.
                        </Typography>
                      </Alert>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">
                        <WarningIcon sx={{ mr: 1, color: '#f44336' }} />
                        Confusing Confidence and Prediction Intervals
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            Confidence Interval
                          </Typography>
                          <Typography variant="body2" paragraph>
                            Estimates the range for a population parameter (e.g., the mean of all patients)
                          </Typography>
                          <Typography variant="body2" paragraph>
                            <strong>Example:</strong> "The mean cholesterol level for this population is 195 mg/dL (95% CI: 190 to 200)"
                          </Typography>
                          <Typography variant="body2">
                            <strong>Interpretation:</strong> We are 95% confident that the true population mean lies between 190 and 200 mg/dL.
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            Prediction Interval
                          </Typography>
                          <Typography variant="body2" paragraph>
                            Estimates the range for future individual observations (e.g., a new patient's value)
                          </Typography>
                          <Typography variant="body2" paragraph>
                            <strong>Example:</strong> "The cholesterol level for a new patient will be between 150 and 240 mg/dL with 95% probability"
                          </Typography>
                          <Typography variant="body2">
                            <strong>Interpretation:</strong> 95% of new patients will have cholesterol levels between 150 and 240 mg/dL.
                          </Typography>
                        </Grid>
                      </Grid>
                      
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Key Difference:</strong> Prediction intervals are always wider than confidence intervals for the same 
                          confidence level because they account for both the uncertainty in estimating the parameter and the variability 
                          of individual observations.
                        </Typography>
                      </Alert>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">
                        <WarningIcon sx={{ mr: 1, color: '#f44336' }} />
                        Over-Reliance on Statistical Significance
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" paragraph>
                        Many researchers focus solely on whether a confidence interval excludes the null value (e.g., zero for a difference), 
                        ignoring the valuable information about effect size and precision that the interval provides.
                      </Typography>
                      
                      <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Example: Two Studies with Different Conclusions
                        </Typography>
                        
                        <Typography variant="body2" paragraph>
                          <strong>Study A:</strong> Effect = 15 (95% CI: 1 to 29)
                        </Typography>
                        <Typography variant="body2" paragraph>
                          <strong>Study B:</strong> Effect = 5 (95% CI: -1 to 11)
                        </Typography>
                        
                        <Typography variant="body2" paragraph>
                          <strong>Simplistic approach:</strong> Study A shows a "significant" effect (CI excludes zero), 
                          while Study B does not (CI includes zero).
                        </Typography>
                        
                        <Typography variant="body2">
                          <strong>Better approach:</strong> Study A suggests a potentially large effect but with considerable uncertainty (wide CI). 
                          Study B shows a more precise estimate of a smaller effect that may or may not be zero. 
                          The true effect could actually be similar in both studies.
                        </Typography>
                      </Box>
                      
                      <Alert severity="warning">
                        <Typography variant="body2">
                          <strong>Remember:</strong> A confidence interval that just barely excludes zero often represents weak evidence, 
                          while a narrow interval that includes zero can provide strong evidence that any effect is likely to be small.
                        </Typography>
                      </Alert>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">
                        <WarningIcon sx={{ mr: 1, color: '#f44336' }} />
                        Inappropriate Methods and Violated Assumptions
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" paragraph>
                        Standard confidence interval methods often rely on assumptions that may not hold in real-world data, 
                        leading to intervals with incorrect coverage.
                      </Typography>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="subtitle2" gutterBottom color="error">
                                Common Assumption Violations
                              </Typography>
                              <List dense>
                                <ListItem>
                                  <ListItemIcon>
                                    <WarningIcon fontSize="small" color="error" />
                                  </ListItemIcon>
                                  <ListItemText 
                                    primary="Using t-intervals with highly skewed data" 
                                    secondary="Can lead to poor coverage, especially with small samples" 
                                  />
                                </ListItem>
                                <ListItem>
                                  <ListItemIcon>
                                    <WarningIcon fontSize="small" color="error" />
                                  </ListItemIcon>
                                  <ListItemText 
                                    primary="Applying Wald intervals for proportions near 0 or 1" 
                                    secondary="Can produce intervals outside the [0,1] range" 
                                  />
                                </ListItem>
                                <ListItem>
                                  <ListItemIcon>
                                    <WarningIcon fontSize="small" color="error" />
                                  </ListItemIcon>
                                  <ListItemText 
                                    primary="Ignoring clustering or repeated measures" 
                                    secondary="Results in artificially narrow intervals" 
                                  />
                                </ListItem>
                                <ListItem>
                                  <ListItemIcon>
                                    <WarningIcon fontSize="small" color="error" />
                                  </ListItemIcon>
                                  <ListItemText 
                                    primary="Using normal approximation with small samples" 
                                    secondary="Leads to systematically poor coverage" 
                                  />
                                </ListItem>
                              </List>
                            </CardContent>
                          </Card>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="subtitle2" gutterBottom color="success">
                                Solutions and Alternatives
                              </Typography>
                              <List dense>
                                <ListItem>
                                  <ListItemIcon>
                                    <CheckCircleIcon fontSize="small" color="success" />
                                  </ListItemIcon>
                                  <ListItemText 
                                    primary="Transform skewed data before analysis" 
                                    secondary="Log, square root, etc. based on data characteristics" 
                                  />
                                </ListItem>
                                <ListItem>
                                  <ListItemIcon>
                                    <CheckCircleIcon fontSize="small" color="success" />
                                  </ListItemIcon>
                                  <ListItemText 
                                    primary="Use exact methods for proportions" 
                                    secondary="Wilson score or Clopper-Pearson methods" 
                                  />
                                </ListItem>
                                <ListItem>
                                  <ListItemIcon>
                                    <CheckCircleIcon fontSize="small" color="success" />
                                  </ListItemIcon>
                                  <ListItemText 
                                    primary="Apply bootstrap or permutation methods" 
                                    secondary="Distribution-free approaches for complex situations" 
                                  />
                                </ListItem>
                                <ListItem>
                                  <ListItemIcon>
                                    <CheckCircleIcon fontSize="small" color="success" />
                                  </ListItemIcon>
                                  <ListItemText 
                                    primary="Use multilevel models for clustered data" 
                                    secondary="Properly account for data structure" 
                                  />
                                </ListItem>
                              </List>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                      
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Diagnostic Approach:</strong> When in doubt, simulation studies can verify whether a chosen confidence 
                          interval method achieves its nominal coverage rate for your specific data characteristics and sample size.
                        </Typography>
                      </Alert>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">
                        <WarningIcon sx={{ mr: 1, color: '#f44336' }} />
                        Cherry-Picking and Publication Bias
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" paragraph>
                        Selective reporting of confidence intervals (e.g., only those that exclude zero) leads to a 
                        distorted view of the evidence, particularly in published literature.
                      </Typography>
                      
                      <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Publication Bias Example
                        </Typography>
                        
                        <Typography variant="body2" paragraph>
                          Imagine 20 independent studies of the same phenomenon. By chance alone, we would expect one of them 
                          to produce a 95% confidence interval that doesn't include the true parameter.
                        </Typography>
                        
                        <Typography variant="body2">
                          If journals only publish "significant" results (intervals excluding zero), then the published 
                          literature would consist solely of studies with misleading intervals, creating a false impression 
                          of a real effect.
                        </Typography>
                      </Box>
                      
                      <Typography variant="subtitle2" gutterBottom>
                        Solutions:
                      </Typography>
                      
                      <List>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="success" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Pre-register studies and analysis plans" 
                            secondary="Commit to reporting all results before data collection" 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="success" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Conduct and publish replication studies" 
                            secondary="Even those that don't confirm previous findings" 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="success" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Use meta-analysis with bias correction" 
                            secondary="Methods like funnel plots can detect and adjust for publication bias" 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="success" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Report all analyses transparently" 
                            secondary="Including exploratory analyses clearly labeled as such" 
                          />
                        </ListItem>
                      </List>
                    </AccordionDetails>
                  </Accordion>
                </Paper>
                
                <Paper elevation={2} sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Learning from Real-World Examples
                  </Typography>
                  
                  <Typography paragraph>
                    Examining problematic cases can help reinforce good practices and avoid common mistakes.
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom color="error">
                            Case: Pharmaceutical Marketing
                          </Typography>
                          <Typography variant="body2" paragraph>
                            A pharmaceutical company claimed their drug reduced cholesterol "significantly more than competitor drugs" 
                            based on a study showing a 3% greater reduction (95% CI: 0.1% to 5.9%).
                          </Typography>
                          <Typography variant="body2" paragraph>
                            <strong>Problem:</strong> While the result was technically statistically significant, the lower bound 
                            was trivially different from zero, and well below the 5% difference generally considered clinically meaningful.
                          </Typography>
                          <Typography variant="body2">
                            <strong>Lesson:</strong> Statistical significance does not imply practical significance. Marketing claims 
                            should reflect the full range of plausible effects indicated by the confidence interval.
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom color="error">
                            Case: Educational Policy
                          </Typography>
                          <Typography variant="body2" paragraph>
                            A policy requiring expensive technology in classrooms was implemented based on a study showing 
                            improved test scores with a wide confidence interval (95% CI: 1% to 15%). Follow-up studies 
                            with larger samples found much smaller effects (95% CI: 0.5% to 3%).
                          </Typography>
                          <Typography variant="body2" paragraph>
                            <strong>Problem:</strong> The initial wide confidence interval indicated substantial uncertainty 
                            that was ignored in policymaking. The follow-up studies were consistent with a small effect at 
                            the lower end of the original interval.
                          </Typography>
                          <Typography variant="body2">
                            <strong>Lesson:</strong> Wide confidence intervals should prompt caution in decision-making, 
                            especially for costly interventions. Follow-up studies with larger samples can provide more precise estimates.
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </MathJaxContext>
  );
};

export default RealWorldApplications;