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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import SchoolIcon from '@mui/icons-material/School';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import axios from 'axios';

// Import components for displaying math formulas
import { MathJax } from 'better-react-mathjax';

// Import animation components
import CoverageAnimation from '../visualizations/CoverageAnimation';
import IntervalConstructionAnimation from '../visualizations/IntervalConstructionAnimation';

/**
 * Component presenting the theoretical foundations of confidence intervals
 */
const TheoryFoundations = () => {
  const [educationalContent, setEducationalContent] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch educational content from the backend
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await axios.get('/api/v1/confidence-intervals/educational/?section=FUNDAMENTALS');
        setEducationalContent(response.data);
      } catch (error) {
        console.error('Error fetching educational content:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchContent();
  }, []);

  // Render the educational content (MathJaxContext is provided globally in App.jsx)
  return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Theoretical Foundations of Confidence Intervals
        </Typography>
        
        <Typography paragraph>
          This section explores the fundamental concepts behind confidence intervals, their interpretation,
          and the mathematical principles that make them work.
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {/* Concept Overview */}
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                What is a Confidence Interval?
              </Typography>
              
              <Typography paragraph>
                A confidence interval is a range of values that is likely to contain an unknown population parameter. 
                Instead of estimating the parameter by a single value, we use an interval to indicate 
                the uncertainty present in the estimate.
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>The key insight:</strong> A 95% confidence interval does NOT mean there is a 95% probability 
                  that the parameter lies within the interval. Rather, it means that if we were to take many samples 
                  and construct a confidence interval from each sample, about 95% of these intervals would contain 
                  the true parameter value.
                </Typography>
              </Alert>
              
              <Box sx={{ mt: 3, mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Coverage Animation
                </Typography>
                
                <Typography paragraph>
                  This animation illustrates the concept of confidence interval coverage. Each horizontal line
                  represents a confidence interval constructed from a different random sample. The vertical line
                  shows the true population parameter.
                </Typography>
                
                <Box sx={{ height: 400, border: '1px solid #eee', p: 2, mb: 2 }}>
                  <CoverageAnimation />
                </Box>
                
                <Typography variant="body2" color="textSecondary">
                  Notice that about 95% of the intervals contain the true parameter (shown in red), while
                  about 5% of the intervals miss it. This is what we mean by "95% confidence."
                </Typography>
              </Box>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom>
                The General Formulation
              </Typography>
              
              <Typography paragraph>
                Most confidence intervals follow this general form:
              </Typography>
              
              <Box sx={{ textAlign: 'center', my: 2, p: 2, bgcolor: 'background.paper' }}>
                <MathJax inline={false}>{`\\text{Point Estimate} \\pm \\text{Critical Value} \\times \\text{Standard Error}`}</MathJax>
              </Box>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Point Estimate
                      </Typography>
                      <Typography variant="body2">
                        The single value that best estimates the parameter. Often the sample statistic
                        (e.g., sample mean <MathJax inline>{"\\bar{x}"}</MathJax> for estimating population mean <MathJax inline>{"\\mu"}</MathJax>).
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Critical Value
                      </Typography>
                      <Typography variant="body2">
                        Based on the sampling distribution and desired confidence level. 
                        (e.g., z-scores from standard normal or t-scores from t-distribution).
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Standard Error
                      </Typography>
                      <Typography variant="body2">
                        Measures the variability of the point estimate. Often related to the sample standard
                        deviation divided by <MathJax inline>{"\\sqrt{n}"}</MathJax>.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
            
            {/* Common Intervals */}
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Common Types of Confidence Intervals
              </Typography>
              
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">Confidence Interval for a Population Mean (Known Variance)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    When the population variance <MathJax inline>{"\\sigma^2"}</MathJax> is known, we can use the standard normal distribution (Z) to construct the interval.
                  </Typography>
                  
                  <Box sx={{ textAlign: 'center', my: 2, p: 2, bgcolor: 'background.paper' }}>
                    <MathJax inline={false}>{`\\bar{x} \\pm z_{\\alpha/2} \\frac{\\sigma}{\\sqrt{n}}`}</MathJax>
                  </Box>
                  
                  <Typography variant="body2">
                    <strong>Where:</strong>
                  </Typography>
                  <ul>
                    <li>
                      <Typography variant="body2">
                        <MathJax inline>{"\\bar{x}"}</MathJax> is the sample mean
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        <MathJax inline>{"z_{\\alpha/2}"}</MathJax> is the critical value from the standard normal distribution
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        <MathJax inline>{"\\sigma"}</MathJax> is the known population standard deviation
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        <MathJax inline>{"n"}</MathJax> is the sample size
                      </Typography>
                    </li>
                  </ul>
                  
                  <Typography variant="body2">
                    <strong>Common critical values:</strong>
                  </Typography>
                  <ul>
                    <li>
                      <Typography variant="body2">
                        For 90% confidence: <MathJax inline>{"z_{0.05} = 1.645"}</MathJax>
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        For 95% confidence: <MathJax inline>{"z_{0.025} = 1.96"}</MathJax>
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        For 99% confidence: <MathJax inline>{"z_{0.005} = 2.576"}</MathJax>
                      </Typography>
                    </li>
                  </ul>
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">Confidence Interval for a Population Mean (Unknown Variance)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    When the population variance is unknown (the common case), we estimate it using the sample variance and use the t-distribution.
                  </Typography>
                  
                  <Box sx={{ textAlign: 'center', my: 2, p: 2, bgcolor: 'background.paper' }}>
                    <MathJax inline={false}>{`\\bar{x} \\pm t_{\\alpha/2, n-1} \\frac{s}{\\sqrt{n}}`}</MathJax>
                  </Box>
                  
                  <Typography variant="body2">
                    <strong>Where:</strong>
                  </Typography>
                  <ul>
                    <li>
                      <Typography variant="body2">
                        <MathJax inline>{"\\bar{x}"}</MathJax> is the sample mean
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        <MathJax inline>{"t_{\\alpha/2, n-1}"}</MathJax> is the critical value from the t-distribution with <MathJax inline>{"n-1"}</MathJax> degrees of freedom
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        <MathJax inline>{"s"}</MathJax> is the sample standard deviation
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        <MathJax inline>{"n"}</MathJax> is the sample size
                      </Typography>
                    </li>
                  </ul>
                  
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Note:</strong> As the sample size increases, the t-distribution approaches the normal distribution,
                      and the t-interval becomes similar to the z-interval.
                    </Typography>
                  </Alert>
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">Confidence Interval for a Population Proportion</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    For a binomial proportion, several methods exist. The simplest is the Wald interval:
                  </Typography>
                  
                  <Box sx={{ textAlign: 'center', my: 2, p: 2, bgcolor: 'background.paper' }}>
                    <MathJax inline={false}>{`\\hat{p} \\pm z_{\\alpha/2} \\sqrt{\\frac{\\hat{p}(1-\\hat{p})}{n}}`}</MathJax>
                  </Box>
                  
                  <Typography variant="body2">
                    <strong>Where:</strong>
                  </Typography>
                  <ul>
                    <li>
                      <Typography variant="body2">
                        <MathJax inline>{"\\hat{p}"}</MathJax> is the sample proportion
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        <MathJax inline>{"z_{\\alpha/2}"}</MathJax> is the critical value from the standard normal distribution
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        <MathJax inline>{"n"}</MathJax> is the sample size
                      </Typography>
                    </li>
                  </ul>
                  
                  <Typography paragraph>
                    Alternative methods with better properties include:
                  </Typography>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Wilson Score Interval:
                  </Typography>
                  <Box sx={{ textAlign: 'center', my: 2, p: 2, bgcolor: 'background.paper' }}>
                    <MathJax inline={false}>{`\\frac{\\hat{p} + \\frac{z_{\\alpha/2}^2}{2n} \\pm z_{\\alpha/2}\\sqrt{\\frac{\\hat{p}(1-\\hat{p})}{n} + \\frac{z_{\\alpha/2}^2}{4n^2}}}{1 + \\frac{z_{\\alpha/2}^2}{n}}`}</MathJax>
                  </Box>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Clopper-Pearson (Exact) Interval:
                  </Typography>
                  <Typography variant="body2">
                    Based on the binomial distribution directly, providing coverage at least equal to the nominal level.
                  </Typography>
                  
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Caution:</strong> The Wald interval performs poorly when <MathJax inline>{"n"}</MathJax> is small or <MathJax inline>{"\\hat{p}"}</MathJax> is close to 0 or 1.
                      For small samples or extreme proportions, use Wilson Score or Clopper-Pearson methods.
                    </Typography>
                  </Alert>
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">Confidence Interval for Variance and Standard Deviation</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    For the population variance of a normal distribution, we use the chi-squared distribution:
                  </Typography>
                  
                  <Box sx={{ textAlign: 'center', my: 2, p: 2, bgcolor: 'background.paper' }}>
                    <MathJax inline={false}>{`\\left(\\frac{(n-1)s^2}{\\chi^2_{\\alpha/2, n-1}}, \\frac{(n-1)s^2}{\\chi^2_{1-\\alpha/2, n-1}}\\right)`}</MathJax>
                  </Box>
                  
                  <Typography variant="body2">
                    <strong>Where:</strong>
                  </Typography>
                  <ul>
                    <li>
                      <Typography variant="body2">
                        <MathJax inline>{"s^2"}</MathJax> is the sample variance
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        <MathJax inline>{"\\chi^2_{\\alpha/2, n-1}"}</MathJax> and <MathJax inline>{"\\chi^2_{1-\\alpha/2, n-1}"}</MathJax> are critical values from the chi-squared distribution with <MathJax inline>{"n-1"}</MathJax> degrees of freedom
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        <MathJax inline>{"n"}</MathJax> is the sample size
                      </Typography>
                    </li>
                  </ul>
                  
                  <Typography paragraph>
                    For the standard deviation, take the square root of the endpoints:
                  </Typography>
                  
                  <Box sx={{ textAlign: 'center', my: 2, p: 2, bgcolor: 'background.paper' }}>
                    <MathJax inline={false}>{`\\left(\\sqrt{\\frac{(n-1)s^2}{\\chi^2_{\\alpha/2, n-1}}}, \\sqrt{\\frac{(n-1)s^2}{\\chi^2_{1-\\alpha/2, n-1}}}\\right)`}</MathJax>
                  </Box>
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">Confidence Intervals for Differences</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    For the difference between two population means (independent samples):
                  </Typography>
                  
                  <Box sx={{ textAlign: 'center', my: 2, p: 2, bgcolor: 'background.paper' }}>
                    <MathJax inline={false}>{`(\\bar{x}_1 - \\bar{x}_2) \\pm t_{\\alpha/2, df} \\sqrt{\\frac{s_1^2}{n_1} + \\frac{s_2^2}{n_2}}`}</MathJax>
                  </Box>
                  
                  <Typography variant="body2" paragraph>
                    <strong>Where the degrees of freedom (df) can be approximated using the Welch-Satterthwaite equation:</strong>
                  </Typography>
                  
                  <Box sx={{ textAlign: 'center', my: 2, p: 2, bgcolor: 'background.paper' }}>
                    <MathJax inline={false}>{`df \\approx \\frac{\\left(\\frac{s_1^2}{n_1} + \\frac{s_2^2}{n_2}\\right)^2}{\\frac{(s_1^2/n_1)^2}{n_1-1} + \\frac{(s_2^2/n_2)^2}{n_2-1}}`}</MathJax>
                  </Box>
                  
                  <Typography paragraph>
                    For the difference between two population proportions:
                  </Typography>
                  
                  <Box sx={{ textAlign: 'center', my: 2, p: 2, bgcolor: 'background.paper' }}>
                    <MathJax inline={false}>{`(\\hat{p}_1 - \\hat{p}_2) \\pm z_{\\alpha/2} \\sqrt{\\frac{\\hat{p}_1(1-\\hat{p}_1)}{n_1} + \\frac{\\hat{p}_2(1-\\hat{p}_2)}{n_2}}`}</MathJax>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Paper>
            
            {/* Interpretation */}
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Correct Interpretation of Confidence Intervals
              </Typography>
              
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Common Misinterpretations
                </Typography>
                
                <Typography variant="body2" paragraph>
                  <strong>Incorrect:</strong> "There is a 95% probability that the true population mean lies within this interval."
                </Typography>
                
                <Typography variant="body2">
                  <strong>Incorrect:</strong> "95% of the population values fall within this interval."
                </Typography>
              </Alert>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Correct Interpretation
                </Typography>
                
                <Typography paragraph>
                  A confidence interval should be interpreted in terms of the procedure used to create it, not in terms of the specific interval obtained:
                </Typography>
                
                <Typography variant="body2" paragraph sx={{ pl: 2, borderLeft: '4px solid #1976d2', fontWeight: 'medium' }}>
                  "If we were to take many samples of the same size from this population and construct 95% confidence intervals for each sample, 
                  about 95% of these intervals would contain the true population parameter."
                </Typography>
                
                <Typography variant="body2">
                  Once a specific interval is calculated, the true parameter either lies within that interval or it doesn't—we just don't know which.
                </Typography>
              </Box>
              
              <Box sx={{ mt: 4 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Confidence Intervals vs. Prediction Intervals
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                          Confidence Interval
                        </Typography>
                        
                        <Typography variant="body2" paragraph>
                          Provides a range of plausible values for a population parameter.
                        </Typography>
                        
                        <Typography variant="body2" paragraph>
                          Example: "We are 95% confident that the population mean height is between 175cm and 178cm."
                        </Typography>
                        
                        <Chip label="Estimates a parameter" color="primary" size="small" />
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="secondary">
                          Prediction Interval
                        </Typography>
                        
                        <Typography variant="body2" paragraph>
                          Provides a range for a future individual observation.
                        </Typography>
                        
                        <Typography variant="body2" paragraph>
                          Example: "We are 95% confident that the height of the next person will be between 160cm and 192cm."
                        </Typography>
                        
                        <Chip label="Predicts a future value" color="secondary" size="small" />
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
            
            {/* Factors Affecting Width */}
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Factors Affecting Confidence Interval Width
              </Typography>
              
              <Typography paragraph>
                Understanding what influences the width of a confidence interval helps in planning studies and interpreting results.
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom color="primary">
                        Sample Size
                      </Typography>
                      
                      <Box sx={{ height: 100, bgcolor: 'background.paper', mb: 2 }}>
                        {/* Simple animation showing interval width decreasing with increasing n */}
                      </Box>
                      
                      <Typography variant="body2">
                        <strong>Effect:</strong> Larger sample sizes produce narrower intervals.
                      </Typography>
                      <Typography variant="body2">
                        <strong>Relationship:</strong> Width decreases proportionally to <MathJax inline>{"1/\\sqrt{n}"}</MathJax>.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom color="primary">
                        Confidence Level
                      </Typography>
                      
                      <Box sx={{ height: 100, bgcolor: 'background.paper', mb: 2 }}>
                        {/* Simple animation showing interval width increasing with confidence level */}
                      </Box>
                      
                      <Typography variant="body2">
                        <strong>Effect:</strong> Higher confidence levels produce wider intervals.
                      </Typography>
                      <Typography variant="body2">
                        <strong>Trade-off:</strong> More confidence requires accepting more uncertainty in estimation.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom color="primary">
                        Variability
                      </Typography>
                      
                      <Box sx={{ height: 100, bgcolor: 'background.paper', mb: 2 }}>
                        {/* Simple animation showing interval width increasing with data variability */}
                      </Box>
                      
                      <Typography variant="body2">
                        <strong>Effect:</strong> More variable data (larger standard deviation) produces wider intervals.
                      </Typography>
                      <Typography variant="body2">
                        <strong>Relationship:</strong> Width increases linearly with sample standard deviation.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3 }}>
                <IntervalConstructionAnimation />
                
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  The interactive animation above demonstrates how changing these factors affects the confidence interval width.
                </Typography>
              </Box>
            </Paper>
            
            {/* Connection to Hypothesis Testing */}
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Confidence Intervals and Hypothesis Testing
              </Typography>
              
              <Typography paragraph>
                Confidence intervals and hypothesis tests are closely related. In many cases, a confidence interval
                can be used to perform a hypothesis test, and vice versa.
              </Typography>
              
              <Box sx={{ p: 2, border: '1px dashed #1976d2', borderRadius: 1, mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  The Duality Principle:
                </Typography>
                
                <Typography variant="body2">
                  For a two-sided hypothesis test with significance level <MathJax inline>{"\\alpha"}</MathJax>, we reject the null hypothesis 
                  <MathJax inline>{"H_0: \\theta = \\theta_0"}</MathJax> if and only if <MathJax inline>{"\\theta_0"}</MathJax> lies outside the <MathJax inline>{"(1-\\alpha)"}</MathJax> confidence interval for <MathJax inline>{"\\theta"}</MathJax>.
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Using a Confidence Interval for Hypothesis Testing
                      </Typography>
                      
                      <Typography variant="body2" paragraph>
                        <strong>Example:</strong> Testing <MathJax inline>{"H_0: \\mu = 50"}</MathJax> vs <MathJax inline>{"H_1: \\mu \\neq 50"}</MathJax> at <MathJax inline>{"\\alpha = 0.05"}</MathJax>
                      </Typography>
                      
                      <Typography variant="body2" paragraph>
                        Suppose the 95% confidence interval is [48, 53].
                      </Typography>
                      
                      <Typography variant="body2" paragraph>
                        Since 50 is inside the interval, we fail to reject <MathJax inline>{"H_0"}</MathJax> at the 0.05 level.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Advantage of Confidence Intervals
                      </Typography>
                      
                      <Typography variant="body2" paragraph>
                        Confidence intervals provide more information than hypothesis tests:
                      </Typography>
                      
                      <Typography variant="body2">
                        - They show the precision of the estimate
                      </Typography>
                      <Typography variant="body2">
                        - They give a range of plausible values, not just a yes/no decision
                      </Typography>
                      <Typography variant="body2">
                        - They allow for practical interpretation of the effect size
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
            
            {/* Additional Content from the Educational Resources */}
            {educationalContent.map((resource) => (
              <Paper key={resource.id} elevation={2} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {resource.title}
                </Typography>
                
                <MathJax>{resource.content}</MathJax>
              </Paper>
            ))}
          </Box>
        )}
      </Box>
  );
};

export default TheoryFoundations;