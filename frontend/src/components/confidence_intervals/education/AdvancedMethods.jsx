import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Grid,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import SchoolIcon from '@mui/icons-material/School';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CodeIcon from '@mui/icons-material/Code';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';

// Import for rendering math formulas
import { MathJaxContext, MathJax } from 'better-react-mathjax';

/**
 * Advanced Methods component for Confidence Intervals module
 * Covers bootstrap methods, Bayesian intervals, robust intervals, and more
 */
const AdvancedMethods = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [educationalContent, setEducationalContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isDemoMode } = useAuth();
  
  // Fetch educational content from the backend
  useEffect(() => {
    const fetchContent = async () => {
      // In demo mode, use mock educational content
      if (isDemoMode) {
        const mockContent = [
          {
            id: 'demo-1',
            title: 'Bootstrap Confidence Intervals - Advanced Tutorial',
            content: 'Bootstrap methods provide a powerful approach to constructing confidence intervals without making strong distributional assumptions. The basic principle involves resampling from your data with replacement to estimate the sampling distribution of your statistic.'
          },
          {
            id: 'demo-2',
            title: 'Bayesian Credible Intervals',
            content: 'Bayesian credible intervals represent the uncertainty in parameter estimates from a Bayesian perspective. Unlike frequentist confidence intervals, credible intervals have a direct probability interpretation: there is a specified probability that the parameter lies within the interval.'
          }
        ];
        setEducationalContent(mockContent);
        setLoading(false);
        return;
      }
      
      try {
        const response = await axios.get('/api/v1/confidence-intervals/educational/?section=ADVANCED');
        setEducationalContent(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Error fetching educational content:', error);
        setEducationalContent([]); // Ensure it's always an array
      } finally {
        setLoading(false);
      }
    };
    
    fetchContent();
  }, [isDemoMode]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // MathJax configuration
  const mathJaxConfig = {
    tex: {
      inlineMath: [['$', '$'], ['\\(', '\\)']],
      displayMath: [['$$', '$$'], ['\\[', '\\]']],
      processEscapes: true
    },
    svg: {
      fontCache: 'global'
    }
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <Box>
        <Typography variant="h5" gutterBottom>
          Advanced Confidence Interval Methods
        </Typography>
        
        <Typography paragraph>
          This section explores advanced techniques for constructing confidence intervals beyond the standard parametric methods,
          addressing situations with complex data structures, non-standard distributions, and specialized requirements.
        </Typography>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="advanced methods tabs">
            <Tab label="Bootstrap Methods" icon={<EqualizerIcon />} iconPosition="start" />
            <Tab label="Bayesian Intervals" icon={<SchoolIcon />} iconPosition="start" />
            <Tab label="Robust Methods" icon={<InfoIcon />} iconPosition="start" />
            <Tab label="Computational Approaches" icon={<CodeIcon />} iconPosition="start" />
          </Tabs>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {/* Bootstrap Methods */}
            {activeTab === 0 && (
              <Box>
                <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Bootstrap Methods for Confidence Intervals
                  </Typography>
                  
                  <Typography paragraph>
                    Bootstrap methods provide a powerful, distribution-free approach to confidence interval construction.
                    They rely on resampling with replacement from the observed data to estimate the sampling distribution
                    of a statistic without making parametric assumptions.
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom color="primary">
                            Key Advantages
                          </Typography>
                          <ul>
                            <li>
                              <Typography variant="body2">
                                Requires fewer distributional assumptions
                              </Typography>
                            </li>
                            <li>
                              <Typography variant="body2">
                                Works for statistics with unknown sampling distributions
                              </Typography>
                            </li>
                            <li>
                              <Typography variant="body2">
                                Can be applied to complex estimators (medians, correlations, etc.)
                              </Typography>
                            </li>
                            <li>
                              <Typography variant="body2">
                                Provides valid inference when parametric methods fail
                              </Typography>
                            </li>
                          </ul>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom color="primary">
                            The Bootstrap Principle
                          </Typography>
                          <Typography variant="body2" paragraph>
                            The core idea of bootstrap is to treat the sample as a "population" and draw resamples from it
                            to estimate the sampling variability.
                          </Typography>
                          <MathJax>
                            {"$$\\text{Sample} \\xrightarrow{\\text{Resample}} \\text{Bootstrap Distribution} \\xrightarrow{\\text{Quantiles}} \\text{Confidence Interval}$$"}
                          </MathJax>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                  
                  <Divider sx={{ my: 3 }} />
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Common Bootstrap Interval Methods
                  </Typography>
                  
                  <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Percentile Bootstrap</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography paragraph>
                        The simplest bootstrap interval method uses empirical percentiles of the bootstrap distribution.
                      </Typography>
                      
                      <Box sx={{ p: 2, bgcolor: 'background.paper', mb: 2 }}>
                        <MathJax>
                          {"$$\\text{CI}_{1-\\alpha} = [\\hat{\\theta}^*_{(\\alpha/2)}, \\hat{\\theta}^*_{(1-\\alpha/2)}]$$"}
                        </MathJax>
                      </Box>
                      
                      <Typography variant="body2" paragraph>
                        Where <MathJax inline>{"\\hat\\theta^*_{(q)}"}</MathJax> is the <MathJax inline>{"q"}</MathJax>-th quantile of the bootstrap distribution.
                      </Typography>
                      
                      <Typography variant="body2" paragraph>
                        <strong>Algorithm:</strong>
                      </Typography>
                      <ol>
                        <li>
                          <Typography variant="body2">
                            Draw B bootstrap samples by sampling with replacement from the original data
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Calculate the statistic of interest for each bootstrap sample
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Find the <MathJax inline>{"\\alpha/2"}</MathJax> and <MathJax inline>{"1-\\alpha/2"}</MathJax> percentiles of the bootstrap distribution
                          </Typography>
                        </li>
                      </ol>
                      
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Note:</strong> The percentile method assumes that the bootstrap distribution is unbiased and symmetric.
                          It may perform poorly when these assumptions are violated.
                        </Typography>
                      </Alert>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Basic Bootstrap (Reflection Method)</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography paragraph>
                        The basic bootstrap method reflects the bootstrap distribution around the observed statistic.
                      </Typography>
                      
                      <Box sx={{ p: 2, bgcolor: 'background.paper', mb: 2 }}>
                        <MathJax>
                          {"$$\\text{CI}_{1-\\alpha} = [2\\hat{\\theta} - \\hat{\\theta}^*_{(1-\\alpha/2)}, 2\\hat{\\theta} - \\hat{\\theta}^*_{(\\alpha/2)}]$$"}
                        </MathJax>
                      </Box>
                      
                      <Typography variant="body2" paragraph>
                        Where <MathJax inline>{"\\hat{\\theta}"}</MathJax> is the observed statistic value and <MathJax inline>{"\\hat{\\theta}^*_{(q)}"}</MathJax> is the <MathJax inline>{"q"}</MathJax>-th quantile of the bootstrap distribution.
                      </Typography>
                      
                      <Typography variant="body2" paragraph>
                        This method can correct for bias in the bootstrap distribution but may produce bounds outside the parameter space
                        (e.g., negative variances or correlations outside [-1, 1]).
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">BCa (Bias-Corrected and Accelerated) Bootstrap</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography paragraph>
                        The BCa method adjusts for both bias and skewness in the bootstrap distribution, providing better coverage properties.
                      </Typography>
                      
                      <Box sx={{ p: 2, bgcolor: 'background.paper', mb: 2 }}>
                        <MathJax>
                          {"$$\\text{CI}_{1-\\alpha} = [\\hat{\\theta}^*_{(\\alpha_1)}, \\hat{\\theta}^*_{(\\alpha_2)}]$$"}
                        </MathJax>
                        <MathJax>
                          {"$$\\alpha_1 = \\Phi\\left(z_0 + \\frac{z_0 + z_{\\alpha/2}}{1 - a(z_0 + z_{\\alpha/2})}\\right)$$"}
                        </MathJax>
                        <MathJax>
                          {"$$\\alpha_2 = \\Phi\\left(z_0 + \\frac{z_0 + z_{1-\\alpha/2}}{1 - a(z_0 + z_{1-\\alpha/2})}\\right)$$"}
                        </MathJax>
                      </Box>
                      
                      <Typography variant="body2" paragraph>
                        Where:
                      </Typography>
                      <ul>
                        <li>
                          <Typography variant="body2">
                            <MathJax inline>{"z_0"}</MathJax> is the bias-correction factor, calculated as <MathJax inline>{"z_0 = \\Phi^{-1}(\\text{proportion of bootstrap values} < \\hat{\\theta})"}</MathJax>
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            <MathJax inline>{"a"}</MathJax> is the acceleration factor, related to the skewness of the bootstrap distribution
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            <MathJax inline>{"\\Phi"}</MathJax> is the standard normal CDF
                          </Typography>
                        </li>
                      </ul>
                      
                      <Alert severity="success" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Advantage:</strong> The BCa method provides the most accurate bootstrap intervals, especially for small samples
                          and skewed distributions. It's generally the recommended approach when computational resources permit.
                        </Typography>
                      </Alert>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Studentized Bootstrap (t-bootstrap)</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography paragraph>
                        The studentized bootstrap incorporates an estimate of the standard error for each bootstrap sample,
                        mimicking the t-interval approach.
                      </Typography>
                      
                      <Box sx={{ p: 2, bgcolor: 'background.paper', mb: 2 }}>
                        <MathJax>
                          {"$$\\text{CI}_{1-\\alpha} = [\\hat{\\theta} - t^*_{(1-\\alpha/2)} \\cdot \\hat{\\text{se}}(\\hat{\\theta}), \\hat{\\theta} - t^*_{(\\alpha/2)} \\cdot \\hat{\\text{se}}(\\hat{\\theta})]$$"}
                        </MathJax>
                      </Box>
                      
                      <Typography variant="body2" paragraph>
                        Where <MathJax inline>{"t^*_{(q)}"}</MathJax> is the <MathJax inline>{"q"}</MathJax>-th quantile of the studentized bootstrap distribution.
                      </Typography>
                      
                      <Typography variant="body2" paragraph>
                        <strong>Note:</strong> This method requires nested bootstrap samples to estimate the standard error for each bootstrap sample,
                        making it computationally intensive.
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Comparison of Bootstrap Methods
                    </Typography>
                    
                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Method</TableCell>
                            <TableCell>Advantages</TableCell>
                            <TableCell>Disadvantages</TableCell>
                            <TableCell>Best Used For</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell>Percentile</TableCell>
                            <TableCell>Simple, easy to implement and understand</TableCell>
                            <TableCell>Poor coverage for skewed distributions or small samples</TableCell>
                            <TableCell>Large samples with approximately symmetric distributions</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Basic</TableCell>
                            <TableCell>Corrects for bias in the bootstrap distribution</TableCell>
                            <TableCell>May produce intervals outside the parameter space</TableCell>
                            <TableCell>When the bootstrap distribution is biased</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>BCa</TableCell>
                            <TableCell>Better coverage for small samples and skewed distributions</TableCell>
                            <TableCell>More complex to implement, requires jackknife resampling</TableCell>
                            <TableCell>General purpose, especially with small samples or skewed distributions</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Studentized</TableCell>
                            <TableCell>Second-order accurate, theoretically optimal</TableCell>
                            <TableCell>Computationally intensive, requires nested bootstrapping</TableCell>
                            <TableCell>When high precision is required and computing power is available</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Paper>
              </Box>
            )}
            
            {/* Bayesian Intervals */}
            {activeTab === 1 && (
              <Box>
                <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Bayesian Credible Intervals
                  </Typography>
                  
                  <Typography paragraph>
                    Bayesian credible intervals provide an alternative to frequentist confidence intervals,
                    offering a more intuitive interpretation based on posterior probability distributions.
                  </Typography>
                  
                  <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="body2">
                      <strong>Key Distinction:</strong> Unlike confidence intervals, Bayesian credible intervals make direct probability statements
                      about the parameter. A 95% credible interval means that the probability that the parameter lies in the interval is 95%.
                    </Typography>
                  </Alert>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Bayesian Inference Framework
                  </Typography>
                  
                  <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom color="primary">
                            Bayesian Approach
                          </Typography>
                          <Box sx={{ p: 2, bgcolor: 'background.paper', mb: 2 }}>
                            <MathJax>
                              {"$$p(\\theta|\\text{data}) = \\frac{p(\\text{data}|\\theta) \\cdot p(\\theta)}{p(\\text{data})}$$"}
                            </MathJax>
                          </Box>
                          <Typography variant="body2">
                            <strong>Where:</strong>
                          </Typography>
                          <ul>
                            <li>
                              <Typography variant="body2">
                                <MathJax inline>{"p(\\theta|\\text{data})"}</MathJax> is the posterior distribution
                              </Typography>
                            </li>
                            <li>
                              <Typography variant="body2">
                                <MathJax inline>{"p(\\text{data}|\\theta)"}</MathJax> is the likelihood
                              </Typography>
                            </li>
                            <li>
                              <Typography variant="body2">
                                <MathJax inline>{"p(\\theta)"}</MathJax> is the prior distribution
                              </Typography>
                            </li>
                            <li>
                              <Typography variant="body2">
                                <MathJax inline>{"p(\\text{data})"}</MathJax> is the marginal likelihood (normalizing constant)
                              </Typography>
                            </li>
                          </ul>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom color="primary">
                            Credible Intervals from Posterior
                          </Typography>
                          <Typography variant="body2" paragraph>
                            A Bayesian credible interval is directly derived from the posterior distribution of the parameter.
                          </Typography>
                          <Typography variant="body2" paragraph>
                            <strong>Equal-tailed interval:</strong> Takes the $\alpha/2$ and $1-\alpha/2$ quantiles of the posterior distribution.
                          </Typography>
                          <Typography variant="body2">
                            <strong>Highest Posterior Density (HPD) interval:</strong> The shortest interval containing $(1-\alpha)$ of the posterior probability.
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Types of Bayesian Credible Intervals
                  </Typography>
                  
                  <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Equal-Tailed Credible Interval</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography paragraph>
                        Equal-tailed intervals place equal probability in both tails of the posterior distribution.
                      </Typography>
                      
                      <Box sx={{ p: 2, bgcolor: 'background.paper', mb: 2 }}>
                        <MathJax>
                          {"$$\\text{CI}_{1-\\alpha} = [\\theta_{(\\alpha/2)}, \\theta_{(1-\\alpha/2)}]$$"}
                        </MathJax>
                      </Box>
                      
                      <Typography variant="body2" paragraph>
                        Where <MathJax inline>{"\\theta_{(q)}"}</MathJax> is the <MathJax inline>{"q"}</MathJax>-th quantile of the posterior distribution.
                      </Typography>
                      
                      <Typography variant="body2" paragraph>
                        <strong>Advantages:</strong>
                      </Typography>
                      <ul>
                        <li>
                          <Typography variant="body2">
                            Easy to compute
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Analogous to frequentist intervals
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Works well for symmetric posteriors
                          </Typography>
                        </li>
                      </ul>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Highest Posterior Density (HPD) Interval</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography paragraph>
                        HPD intervals contain the most probable values of the parameter, making them the smallest possible credible intervals.
                      </Typography>
                      
                      <Box sx={{ p: 2, bgcolor: 'background.paper', mb: 2 }}>
                        <MathJax>
                          {"$$\\text{HPD}_{1-\\alpha} = \\{\\theta: p(\\theta|\\text{data}) \\geq k\\}$$"}
                        </MathJax>
                      </Box>
                      
                      <Typography variant="body2" paragraph>
                        Where <MathJax inline>{"k"}</MathJax> is chosen such that the interval contains <MathJax inline>{"(1-\\alpha)"}</MathJax> of the posterior probability.
                      </Typography>
                      
                      <Typography variant="body2" paragraph>
                        <strong>Advantages:</strong>
                      </Typography>
                      <ul>
                        <li>
                          <Typography variant="body2">
                            Shortest possible interval
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Contains the most probable parameter values
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Particularly useful for multimodal or skewed posteriors
                          </Typography>
                        </li>
                      </ul>
                      
                      <Typography variant="body2" paragraph>
                        <strong>Disadvantages:</strong>
                      </Typography>
                      <ul>
                        <li>
                          <Typography variant="body2">
                            More computationally intensive to find
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            May consist of disjoint regions for multimodal posteriors
                          </Typography>
                        </li>
                      </ul>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Bayesian vs. Frequentist Intervals</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer component={Paper} variant="outlined">
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Aspect</TableCell>
                              <TableCell>Frequentist Confidence Interval</TableCell>
                              <TableCell>Bayesian Credible Interval</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            <TableRow>
                              <TableCell>Interpretation</TableCell>
                              <TableCell>With repeated sampling, (1-α)% of intervals would contain the true parameter</TableCell>
                              <TableCell>The probability that the parameter lies in the interval is (1-α)%</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Parameter</TableCell>
                              <TableCell>Fixed but unknown value</TableCell>
                              <TableCell>Random variable with a distribution</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Prior Information</TableCell>
                              <TableCell>Not explicitly incorporated</TableCell>
                              <TableCell>Explicitly incorporated via prior distribution</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>With Small Samples</TableCell>
                              <TableCell>May have poor coverage</TableCell>
                              <TableCell>Can be accurate if prior is informative</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Conditioning</TableCell>
                              <TableCell>Conditions on unknown parameter</TableCell>
                              <TableCell>Conditions on observed data</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                      
                      <Typography variant="body2" sx={{ mt: 2 }}>
                        <strong>Numerical Example:</strong> For a normal mean with known variance, when using a conjugate normal prior,
                        the Bayesian credible interval can be written as:
                      </Typography>
                      
                      <Box sx={{ p: 2, bgcolor: 'background.paper', my: 2 }}>
                        <MathJax>
                          {"$$\\mu_{post} \\pm z_{\\alpha/2} \\cdot \\sigma_{post}$$"}
                        </MathJax>
                        <MathJax>
                          {"$$\\mu_{post} = \\frac{\\frac{n\\bar{x}}{\\sigma^2} + \\frac{\\mu_0}{\\tau^2}}{\\frac{n}{\\sigma^2} + \\frac{1}{\\tau^2}}$$"}
                        </MathJax>
                        <MathJax>
                          {"$$\\sigma_{post}^2 = \\frac{1}{\\frac{n}{\\sigma^2} + \\frac{1}{\\tau^2}}$$"}
                        </MathJax>
                      </Box>
                      
                      <Typography variant="body2">
                        Where <MathJax inline>{"\\mu_0"}</MathJax> and <MathJax inline>{"\\tau^2"}</MathJax> are the prior mean and variance, <MathJax inline>{"\\bar{x}"}</MathJax> is the sample mean, <MathJax inline>{"\\sigma^2"}</MathJax> is the known variance, and <MathJax inline>{"n"}</MathJax> is the sample size.
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                </Paper>
              </Box>
            )}
            
            {/* Robust Methods */}
            {activeTab === 2 && (
              <Box>
                <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Robust Confidence Intervals
                  </Typography>
                  
                  <Typography paragraph>
                    Robust confidence intervals maintain their performance even when data violate standard assumptions,
                    such as normality or the absence of outliers.
                  </Typography>
                  
                  <Alert severity="warning" sx={{ mb: 3 }}>
                    <Typography variant="body2">
                      <strong>Why Robust Methods Matter:</strong> Standard confidence intervals can be severely affected by outliers or heavy-tailed distributions,
                      leading to intervals that are too wide, too narrow, or miscentered.
                    </Typography>
                  </Alert>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Approaches to Robust Interval Construction
                  </Typography>
                  
                  <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Intervals Based on Robust Estimators</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography paragraph>
                        Replace the standard estimator with a robust alternative that is less affected by outliers.
                      </Typography>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Card variant="outlined" sx={{ height: '100%' }}>
                            <CardContent>
                              <Typography variant="subtitle1" gutterBottom color="primary">
                                Trimmed Mean
                              </Typography>
                              <Typography variant="body2" paragraph>
                                A trimmed mean excludes a percentage of the extreme values before calculating the mean.
                              </Typography>
                              <Box sx={{ p: 2, bgcolor: 'background.paper', mb: 2 }}>
                                <MathJax>
                                  {"$$\\bar{x}_{\\gamma} = \\frac{1}{n-2[\\gamma n]} \\sum_{i=[\\gamma n]+1}^{n-[\\gamma n]} x_{(i)}$$"}
                                </MathJax>
                              </Box>
                              <Typography variant="body2">
                                Where <MathJax inline>{"x_{(i)}"}</MathJax> are the ordered data points and <MathJax inline>{"\\gamma"}</MathJax> is the trimming percentage (often 0.1 or 0.2).
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Card variant="outlined" sx={{ height: '100%' }}>
                            <CardContent>
                              <Typography variant="subtitle1" gutterBottom color="primary">
                                Winsorized Mean
                              </Typography>
                              <Typography variant="body2" paragraph>
                                A Winsorized mean replaces extreme values with less extreme ones before calculating the mean.
                              </Typography>
                              <Box sx={{ p: 2, bgcolor: 'background.paper', mb: 2 }}>
                                <MathJax>
                                  {"$$\\bar{x}_{win} = \\frac{1}{n} \\left( [\\gamma n] \\cdot x_{([\\gamma n]+1)} + \\sum_{i=[\\gamma n]+1}^{n-[\\gamma n]} x_{(i)} + [\\gamma n] \\cdot x_{(n-[\\gamma n])} \\right)$$"}
                                </MathJax>
                              </Box>
                              <Typography variant="body2">
                                Where instead of removing extreme values, they are replaced with the nearest non-extreme values.
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="subtitle1" gutterBottom color="primary">
                                M-Estimators
                              </Typography>
                              <Typography variant="body2" paragraph>
                                M-estimators minimize a function of the residuals that gives less weight to outliers.
                              </Typography>
                              <Box sx={{ p: 2, bgcolor: 'background.paper', mb: 2 }}>
                                <MathJax>
                                  {"$$\\sum_{i=1}^{n} \\rho \\left( \\frac{x_i - T}{s} \\right) = 0$$"}
                                </MathJax>
                              </Box>
                              <Typography variant="body2">
                                Where $\rho$ is a robust loss function (e.g., Huber or Tukey's biweight), $T$ is the location estimator, and $s$ is a scale estimator.
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                      
                      <Typography variant="body2" sx={{ mt: 2 }}>
                        <strong>Confidence Interval Construction:</strong> Once a robust estimator is chosen, intervals can be constructed using:
                      </Typography>
                      <ul>
                        <li>
                          <Typography variant="body2">
                            Analytical methods based on asymptotic theory
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Bootstrap methods applied to the robust estimator
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Specialized methods for specific robust estimators
                          </Typography>
                        </li>
                      </ul>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Permutation and Randomization Methods</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography paragraph>
                        Permutation methods use resampling without replacement to construct distribution-free confidence intervals.
                      </Typography>
                      
                      <Typography variant="body2" paragraph>
                        <strong>Key Advantages:</strong>
                      </Typography>
                      <ul>
                        <li>
                          <Typography variant="body2">
                            No assumptions about the underlying distribution
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Particularly useful for comparing groups
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Exact rather than asymptotic in finite samples
                          </Typography>
                        </li>
                      </ul>
                      
                      <Typography variant="body2" paragraph>
                        <strong>Limitations:</strong>
                      </Typography>
                      <ul>
                        <li>
                          <Typography variant="body2">
                            Can be computationally intensive
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Requires exchangeability assumption
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            More commonly used for hypothesis testing than interval construction
                          </Typography>
                        </li>
                      </ul>
                      
                      <Typography variant="body2" paragraph>
                        <strong>Example: Permutation Confidence Interval for Difference in Means</strong>
                      </Typography>
                      <ol>
                        <li>
                          <Typography variant="body2">
                            Calculate the observed difference in means
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Generate permutation distribution by randomly reassigning group labels
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Use the duality with hypothesis testing to find values that would not be rejected
                          </Typography>
                        </li>
                      </ol>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Rank-Based and Nonparametric Intervals</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography paragraph>
                        Rank-based methods use the ranks of the data rather than their actual values, making them insensitive to outliers and transformations.
                      </Typography>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Card variant="outlined" sx={{ height: '100%' }}>
                            <CardContent>
                              <Typography variant="subtitle1" gutterBottom color="primary">
                                Wilcoxon Signed-Rank CI for Median
                              </Typography>
                              <Typography variant="body2" paragraph>
                                Based on the Wilcoxon signed-rank test, this method provides a confidence interval for the population median.
                              </Typography>
                              <Typography variant="body2" paragraph>
                                <strong>Procedure:</strong>
                              </Typography>
                              <ol>
                                <li>
                                  <Typography variant="body2">
                                    Calculate Walsh averages (pairwise means) from the data
                                  </Typography>
                                </li>
                                <li>
                                  <Typography variant="body2">
                                    Order the Walsh averages
                                  </Typography>
                                </li>
                                <li>
                                  <Typography variant="body2">
                                    Select the appropriate pair based on critical values from the Wilcoxon distribution
                                  </Typography>
                                </li>
                              </ol>
                            </CardContent>
                          </Card>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Card variant="outlined" sx={{ height: '100%' }}>
                            <CardContent>
                              <Typography variant="subtitle1" gutterBottom color="primary">
                                Hodges-Lehmann Estimator
                              </Typography>
                              <Typography variant="body2" paragraph>
                                The Hodges-Lehmann estimator is the median of all pairwise averages from the data.
                              </Typography>
                              <Box sx={{ p: 2, bgcolor: 'background.paper', mb: 2 }}>
                                <MathJax>
                                  {"$$\\hat{\\theta}_{HL} = \\text{median}\\left\\{\\frac{x_i + x_j}{2}, 1 \\leq i \\leq j \\leq n\\right\\}$$"}
                                </MathJax>
                              </Box>
                              <Typography variant="body2" paragraph>
                                <strong>Properties:</strong> Highly robust (50% breakdown point) while maintaining good efficiency (~95% of mean's efficiency with normal data).
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                      
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Key Insight:</strong> Rank-based methods provide robustness against outliers and are distribution-free,
                          requiring only that the data come from a continuous distribution.
                        </Typography>
                      </Alert>
                    </AccordionDetails>
                  </Accordion>
                </Paper>
              </Box>
            )}
            
            {/* Computational Approaches */}
            {activeTab === 3 && (
              <Box>
                <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Computational Approaches to Confidence Intervals
                  </Typography>
                  
                  <Typography paragraph>
                    Modern computational methods enable confidence interval construction for complex models and 
                    situations where analytical solutions are unavailable or impractical.
                  </Typography>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Simulation-Based Methods
                  </Typography>
                  
                  <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Monte Carlo Methods</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography paragraph>
                        Monte Carlo methods use random sampling to approximate sampling distributions and confidence intervals.
                      </Typography>
                      
                      <Typography variant="body2" paragraph>
                        <strong>Parametric Monte Carlo:</strong>
                      </Typography>
                      <ol>
                        <li>
                          <Typography variant="body2">
                            Fit a model to the data to estimate parameters
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Generate many datasets from the fitted model
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Calculate the statistic of interest for each simulated dataset
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Use the empirical distribution to construct confidence intervals
                          </Typography>
                        </li>
                      </ol>
                      
                      <Typography variant="body2" paragraph>
                        <strong>Applications:</strong>
                      </Typography>
                      <ul>
                        <li>
                          <Typography variant="body2">
                            Complex statistical models
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Functions of multiple parameters
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Validation of analytical approximations
                          </Typography>
                        </li>
                      </ul>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Markov Chain Monte Carlo (MCMC)</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography paragraph>
                        MCMC methods generate samples from the posterior distribution in Bayesian analysis, allowing for credible interval construction.
                      </Typography>
                      
                      <Typography variant="body2" paragraph>
                        <strong>Common MCMC Algorithms:</strong>
                      </Typography>
                      <ul>
                        <li>
                          <Typography variant="body2">
                            Metropolis-Hastings algorithm
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Gibbs sampling
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Hamiltonian Monte Carlo (HMC)
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            No-U-Turn Sampler (NUTS)
                          </Typography>
                        </li>
                      </ul>
                      
                      <Typography variant="body2" paragraph>
                        <strong>Credible Interval Construction:</strong>
                      </Typography>
                      <ol>
                        <li>
                          <Typography variant="body2">
                            Run MCMC to generate samples from the posterior distribution
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Check for convergence using diagnostics (e.g., trace plots, R-hat)
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Compute quantiles from the posterior samples for equal-tailed intervals
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Or find highest density regions for HPD intervals
                          </Typography>
                        </li>
                      </ol>
                      
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Advantage:</strong> MCMC allows credible intervals for any function of parameters from complex hierarchical models,
                          even when the posterior distribution has no closed form.
                        </Typography>
                      </Alert>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Profile Likelihood Methods</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography paragraph>
                        Profile likelihood methods construct confidence intervals by finding parameter values that make
                        the likelihood sufficiently close to its maximum.
                      </Typography>
                      
                      <Box sx={{ p: 2, bgcolor: 'background.paper', mb: 2 }}>
                        <MathJax>
                          {"$$\\text{CI}_{1-\\alpha} = \\{\\theta: -2\\log\\left(\\frac{L(\\theta)}{L(\\hat{\\theta})}\\right) \\leq \\chi^2_{1,1-\\alpha}\\}$$"}
                        </MathJax>
                      </Box>
                      
                      <Typography variant="body2" paragraph>
                        Where <MathJax inline>{"L(\\theta)"}</MathJax> is the likelihood function, <MathJax inline>{"\\hat{\\theta}"}</MathJax> is the maximum likelihood estimate, and <MathJax inline>{"\\chi^2_{1,1-\\alpha}"}</MathJax> is the <MathJax inline>{"(1-\\alpha)"}</MathJax> quantile of the chi-square distribution with 1 degree of freedom.
                      </Typography>
                      
                      <Typography variant="body2" paragraph>
                        <strong>For multi-parameter models:</strong> The profile likelihood fixes all other parameters at their conditional MLEs.
                      </Typography>
                      
                      <Box sx={{ p: 2, bgcolor: 'background.paper', mb: 2 }}>
                        <MathJax>
                          {"$$L_p(\\theta_j) = \\max_{\\theta_{-j}} L(\\theta_j, \\theta_{-j})$$"}
                        </MathJax>
                      </Box>
                      
                      <Typography variant="body2">
                        <strong>Advantages:</strong> Profile likelihood intervals don't rely on normal approximations and can capture asymmetry in the uncertainty about parameters.
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                    Numerical Optimization Techniques
                  </Typography>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Optimization-Based Intervals</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography paragraph>
                        For complex models where the likelihood or estimating equations must be solved numerically,
                        confidence intervals can be constructed using optimization algorithms.
                      </Typography>
                      
                      <Typography variant="body2" paragraph>
                        <strong>Root-Finding Approach:</strong>
                      </Typography>
                      <ol>
                        <li>
                          <Typography variant="body2">
                            Define a function <MathJax inline>{"f(\\theta) = -2\\log(L(\\theta)/L(\\hat{\\theta})) - \\chi^2_{1,1-\\alpha}"}</MathJax>
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Find the roots of <MathJax inline>{"f(\\theta)"}</MathJax> to determine the interval endpoints
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Use numerical methods like bisection, Newton-Raphson, or Brent's algorithm
                          </Typography>
                        </li>
                      </ol>
                      
                      <Typography variant="body2" paragraph>
                        <strong>Applications:</strong>
                      </Typography>
                      <ul>
                        <li>
                          <Typography variant="body2">
                            Nonlinear regression models
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Generalized linear mixed models
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Survival analysis with complex censoring
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Structural equation models
                          </Typography>
                        </li>
                      </ul>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Software Implementation Examples
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Card variant="outlined" sx={{ height: '100%' }}>
                          <CardContent>
                            <Typography variant="subtitle1" gutterBottom color="primary">
                              R
                            </Typography>
                            <Typography variant="body2" paragraph>
                              <strong>Bootstrap:</strong>
                            </Typography>
                            <pre style={{ backgroundColor: '#f5f5f5', padding: 8, borderRadius: 4, overflowX: 'auto' }}>
                              {`library(boot)
# Define statistic function
theta <- function(data, indices) {
  d <- data[indices, ]
  return(mean(d$x))
}
# Perform bootstrap
results <- boot(data, theta, R=1000)
# Calculate BCa intervals
boot.ci(results, type="bca")`}
                            </pre>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={4}>
                        <Card variant="outlined" sx={{ height: '100%' }}>
                          <CardContent>
                            <Typography variant="subtitle1" gutterBottom color="primary">
                              Python
                            </Typography>
                            <Typography variant="body2" paragraph>
                              <strong>MCMC with PyMC:</strong>
                            </Typography>
                            <pre style={{ backgroundColor: '#f5f5f5', padding: 8, borderRadius: 4, overflowX: 'auto' }}>
                              {`import pymc as pm
import numpy as np

# Define model
with pm.Model() as model:
    # Priors
    mu = pm.Normal('mu', mu=0, sigma=10)
    sigma = pm.HalfNormal('sigma', sigma=1)
    
    # Likelihood
    pm.Normal('y', mu=mu, sigma=sigma,
              observed=data)
    
    # Sample
    trace = pm.sample(1000)
    
# Credible intervals
pm.stats.hpd(trace['mu'], credible_interval=0.95)`}
                            </pre>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={4}>
                        <Card variant="outlined" sx={{ height: '100%' }}>
                          <CardContent>
                            <Typography variant="subtitle1" gutterBottom color="primary">
                              SAS
                            </Typography>
                            <Typography variant="body2" paragraph>
                              <strong>Profile Likelihood for GLM:</strong>
                            </Typography>
                            <pre style={{ backgroundColor: '#f5f5f5', padding: 8, borderRadius: 4, overflowX: 'auto' }}>
                              {`proc genmod data=mydata;
  model y = x1 x2 / dist=poisson
                      link=log;
  output out=results 
         pred=pred 
         resdev=resdev;
  /* Profile likelihood CI */
  contrast 'Effect of x1'
           x1 1 / estimate=exp
                  profile;
run;`}
                            </pre>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>
              </Box>
            )}
            
            {/* Custom Educational Content */}
            {Array.isArray(educationalContent) && educationalContent.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Additional Educational Resources
                </Typography>
                {educationalContent.map((content) => (
                  <Paper key={content.id} elevation={2} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      {content.title}
                    </Typography>
                    
                    <MathJax>
                      {content.content}
                    </MathJax>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </MathJaxContext>
  );
};

export default AdvancedMethods;