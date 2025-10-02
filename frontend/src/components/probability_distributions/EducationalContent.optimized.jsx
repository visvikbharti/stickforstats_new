import React, { useState, useCallback, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  Divider,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Card,
  CardContent,
  CardMedia,
  Button
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SchoolIcon from '@mui/icons-material/School';
import FunctionsIcon from '@mui/icons-material/Functions';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { MathJax, MathJaxContext } from 'better-react-mathjax';

// Import animations and interactive components
import DistributionAnimation from './educational/DistributionAnimation';
import CLTSimulator from './educational/CLTSimulator';

// Memoized MathJax configuration
const mathJaxConfig = {
  loader: { load: ["[tex]/html"] },
  tex: {
    packages: { "[+]": ["html"] },
    inlineMath: [["$", "$"]],
    displayMath: [["$$", "$$"]]
  }
};

// Memoized TabPanel component
const TabPanel = React.memo(({ children, value, index }) => {
  return (
    <Box sx={{ py: 2 }} hidden={value !== index}>
      {value === index && children}
    </Box>
  );
});

// Memoized formula component
const Formula = React.memo(({ formula }) => (
  <Box sx={{ mx: 'auto', my: 2, textAlign: 'center' }}>
    <MathJax>{formula}</MathJax>
  </Box>
));

// Memoized property card component
const PropertyCard = React.memo(({ title, formula, description, height = '100%' }) => (
  <Card variant="outlined" sx={{ height }}>
    <CardContent>
      <Typography variant="subtitle2" color="primary" gutterBottom>
        {title}
      </Typography>
      {formula && <MathJax>{formula}</MathJax>}
      {description && (
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      )}
    </CardContent>
  </Card>
));

// Memoized property list item component
const PropertyListItem = React.memo(({ primary, secondary }) => (
  <ListItem>
    <ListItemIcon>
      <CheckCircleIcon color="primary" fontSize="small" />
    </ListItemIcon>
    <ListItemText primary={primary} secondary={secondary} />
  </ListItem>
));

// Memoized distribution image card component
const DistributionImageCard = React.memo(({ distributionType, description }) => (
  <Card>
    <CardMedia
      component="img"
      height="200"
      image={`/static/images/distributions/${distributionType.toLowerCase()}_distribution.png`}
      alt={`${distributionType} Distribution`}
    />
    <CardContent>
      <Typography variant="subtitle2" gutterBottom>
        {distributionType} Distribution
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {description}
      </Typography>
    </CardContent>
  </Card>
));

// Memoized interactive animation wrapper
const LocalDistributionAnimation = React.memo(({ type }) => (
  <Box sx={{ mt: 3 }}>
    <Typography variant="subtitle1" gutterBottom>
      Interactive Visualization
    </Typography>
    <Typography variant="body2" paragraph>
      Explore how changing parameters affects the shape of the distribution:
    </Typography>
    <DistributionAnimation distributionType={type} />
  </Box>
));

// Normal distribution content component
const NormalDistributionContent = React.memo(() => {
  const properties = useMemo(() => [
    { primary: "Symmetric about the mean" },
    { primary: "Mean = Median = Mode = μ" },
    { primary: "68-95-99.7 Rule: 68% of data within ±1σ, 95% within ±2σ, 99.7% within ±3σ" },
    { primary: "Standard Normal: when μ=0 and σ=1, denoted by Z ~ N(0,1)" }
  ], []);

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Typography variant="subtitle1" gutterBottom>
            The Normal Distribution
          </Typography>
          <Typography variant="body2" paragraph>
            The Normal (or Gaussian) distribution is one of the most important probability distributions
            in statistics. It is a continuous distribution that appears frequently in nature and is
            characterized by its bell-shaped curve.
          </Typography>
          
          <Typography variant="body2" paragraph>
            The Normal distribution is defined by two parameters:
          </Typography>
          
          <Box sx={{ ml: 3 }}>
            <Typography variant="body2">
              <strong>μ (mean)</strong>: Determines the center of the distribution
            </Typography>
            <Typography variant="body2">
              <strong>σ (standard deviation)</strong>: Determines the spread or width of the distribution
            </Typography>
          </Box>
          
          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            Probability Density Function:
          </Typography>
          
          <Formula formula={"$$f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}$$"} />
          
          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            Key Properties:
          </Typography>
          
          <List>
            {properties.map((prop, index) => (
              <PropertyListItem key={index} {...prop} />
            ))}
          </List>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <DistributionImageCard 
            distributionType="Normal"
            description="The bell-shaped curve shows the probability density function of a normal distribution with different parameter values."
          />
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Why it's important:
            </Typography>
            <Typography variant="body2" paragraph>
              The Normal distribution is central to statistics due to the Central Limit Theorem, 
              which states that the sum (or average) of a large number of independent random 
              variables tends toward a normal distribution, regardless of the original distribution.
            </Typography>
          </Box>
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 3 }} />
      
      <LocalDistributionAnimation type="NORMAL" />
    </Box>
  );
});

// Binomial Distribution Content
const BinomialDistributionContent = React.memo(() => {
  const properties = useMemo(() => [
    { primary: "Mean: E[X] = np" },
    { primary: "Variance: Var(X) = np(1-p)" },
    { primary: "Symmetric when p = 0.5, right-skewed when p < 0.5, left-skewed when p > 0.5" },
    { primary: "Mode: ⌊(n+1)p⌋ or ⌈(n+1)p⌉-1" }
  ], []);

  const applications = useMemo(() => [
    { primary: "Quality control (pass/fail inspection)" },
    { primary: "Survey responses (yes/no questions)" },
    { primary: "Genetics (presence/absence of a trait)" },
    { primary: "Medical testing (positive/negative results)" }
  ], []);

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Typography variant="subtitle1" gutterBottom>
            The Binomial Distribution
          </Typography>
          <Typography variant="body2" paragraph>
            The Binomial distribution models the number of successes in a fixed number of independent
            trials, each with the same probability of success. It is a discrete probability distribution
            that is fundamental to understanding processes with binary outcomes.
          </Typography>
          
          <Typography variant="body2" paragraph>
            The Binomial distribution is defined by two parameters:
          </Typography>
          
          <Box sx={{ ml: 3 }}>
            <Typography variant="body2">
              <strong>n (number of trials)</strong>: The total number of independent experiments
            </Typography>
            <Typography variant="body2">
              <strong>p (probability of success)</strong>: The probability of success in a single trial
            </Typography>
          </Box>
          
          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            Probability Mass Function:
          </Typography>
          
          <Formula formula={"$$P(X = k) = \\binom{n}{k} p^k (1-p)^{n-k}$$"} />
          <Typography variant="caption">
            where the binomial coefficient represents the number of ways to choose k items from n items
          </Typography>
          
          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            Key Properties:
          </Typography>
          
          <List>
            {properties.map((prop, index) => (
              <PropertyListItem key={index} {...prop} />
            ))}
          </List>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <DistributionImageCard 
            distributionType="Binomial"
            description="The probability mass function of binomial distributions with different parameter values."
          />
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Common Applications:
            </Typography>
            <List dense>
              {applications.map((app, index) => (
                <ListItem key={index}>
                  <ListItemText primary={app.primary} />
                </ListItem>
              ))}
            </List>
          </Box>
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 3 }} />
      
      <LocalDistributionAnimation type="BINOMIAL" />
    </Box>
  );
});

// Poisson Distribution Content
const PoissonDistributionContent = React.memo(() => {
  const [showDerivations, setShowDerivations] = useState(false);
  
  const handleToggleDerivations = useCallback(() => {
    setShowDerivations(prev => !prev);
  }, []);

  const properties = useMemo(() => [
    { primary: "Mean: E[X] = λ" },
    { primary: "Variance: Var(X) = λ" },
    { primary: "Mode: ⌊λ⌋ (when λ is not an integer)" },
    { primary: "Skewness: 1/√λ (right-skewed for small λ, approaches symmetry for large λ)" }
  ], []);

  const applications = useMemo(() => [
    { primary: "Call center arrivals per hour" },
    { primary: "Number of accidents in a time period" },
    { primary: "Radioactive decay events" },
    { primary: "Mutations in a DNA sequence" },
    { primary: "Number of typos in a document" }
  ], []);

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Typography variant="subtitle1" gutterBottom>
            The Poisson Distribution
          </Typography>
          <Typography variant="body2" paragraph>
            The Poisson distribution models the number of events occurring within a fixed interval
            of time or space, assuming events occur at a constant average rate and independently of
            each other. It is a discrete probability distribution named after French mathematician
            Siméon Denis Poisson.
          </Typography>

          <Typography variant="body2" paragraph>
            The Poisson distribution is defined by a single parameter:
          </Typography>

          <Box sx={{ ml: 3 }}>
            <Typography variant="body2">
              <strong>λ (lambda)</strong>: The average number of events in the given interval
            </Typography>
          </Box>

          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            Probability Mass Function:
          </Typography>

          <Formula formula={"$$P(X = k) = \\frac{e^{-\\lambda} \\lambda^k}{k!}$$"} />

          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            Key Properties:
          </Typography>

          <List>
            {properties.map((prop, index) => (
              <PropertyListItem key={index} {...prop} />
            ))}
          </List>

          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            Poisson Process:
          </Typography>
          <Typography variant="body2" paragraph>
            A Poisson process is a stochastic process that counts the number of events in a given time interval.
            Events occur continuously and independently at a constant average rate. The number of events in
            disjoint time intervals are independent random variables.
          </Typography>
        </Grid>

        <Grid item xs={12} md={4}>
          <DistributionImageCard 
            distributionType="Poisson"
            description="The probability mass function of Poisson distributions with different parameter values."
          />

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Common Applications:
            </Typography>
            <List dense>
              {applications.map((app, index) => (
                <ListItem key={index}>
                  <ListItemText primary={app.primary} />
                </ListItem>
              ))}
            </List>
          </Box>
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          color="primary"
          endIcon={showDerivations ? <ExpandMoreIcon /> : <ExpandMoreIcon sx={{ transform: 'rotate(-90deg)' }} />}
          onClick={handleToggleDerivations}
        >
          {showDerivations ? "Hide Mathematical Derivations" : "Show Mathematical Derivations"}
        </Button>
      </Box>

      {showDerivations && <PoissonDistributionDerivations />}

      <Divider sx={{ my: 3 }} />

      <LocalDistributionAnimation type="POISSON" />
    </Box>
  );
});

// Placeholder components for additional distributions
const ExponentialDistributionContent = React.memo(() => (
  <Typography variant="body1">Exponential Distribution educational content goes here</Typography>
));

const UniformDistributionContent = React.memo(() => (
  <Typography variant="body1">Uniform Distribution educational content goes here</Typography>
));

const BetaDistributionContent = React.memo(() => (
  <Typography variant="body1">Beta Distribution educational content goes here</Typography>
));

// General probability content
const GeneralProbabilityContent = React.memo(() => {
  const discreteDistributions = useMemo(() => [
    { primary: "Binomial", secondary: "Models number of successes in fixed number of trials" },
    { primary: "Poisson", secondary: "Models number of events in a fixed interval" },
    { primary: "Geometric", secondary: "Models number of trials until first success" }
  ], []);

  const continuousDistributions = useMemo(() => [
    { primary: "Normal", secondary: "Bell-shaped distribution, central to statistics" },
    { primary: "Exponential", secondary: "Models time between events in a Poisson process" },
    { primary: "Uniform", secondary: "Equal probability within a range" }
  ], []);

  return (
    <Box>
      <Typography variant="body2" paragraph>
        Probability distributions are mathematical functions that describe the likelihood of obtaining
        possible values of a random variable. They are fundamental to statistics and data analysis.
      </Typography>
      
      <Typography variant="body2" paragraph>
        Select a specific distribution from the dropdown menu to learn more about its properties,
        applications, and mathematical foundations.
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Discrete Distributions
              </Typography>
              <Typography variant="body2" paragraph>
                Probability distributions for random variables that can take only a countable number of values.
              </Typography>
              <List dense>
                {discreteDistributions.map((dist, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={dist.primary} secondary={dist.secondary} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Continuous Distributions
              </Typography>
              <Typography variant="body2" paragraph>
                Probability distributions for random variables that can take any value in a continuous range.
              </Typography>
              <List dense>
                {continuousDistributions.map((dist, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={dist.primary} secondary={dist.secondary} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
});

// Placeholder for derviations components
const PoissonDistributionDerivations = React.memo(() => (
  <Typography variant="body1">Poisson distribution derivations would be rendered here</Typography>
));

const NormalDistributionDerivations = React.memo(() => (
  <Typography variant="body1">Normal distribution derivations would be rendered here</Typography>
));

// Mathematical properties section
const MathematicalProperties = React.memo(({ distributionType }) => {
  const [showDerivations, setShowDerivations] = useState(false);

  const handleToggleDerivations = useCallback(() => {
    setShowDerivations(prev => !prev);
  }, []);

  // Memoized content for the Normal distribution
  const normalProperties = useMemo(() => (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Mathematical Properties of the Normal Distribution
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <PropertyCard
            title="Moment Generating Function"
            formula={"$$M_X(t) = e^{\\mu t + \\frac{1}{2}\\sigma^2 t^2}$$"}
            description="The MGF is useful for deriving moments and establishing the distribution of sums of independent normal variables."
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <PropertyCard
            title="Characteristic Function"
            formula={"$$\\varphi_X(t) = e^{i\\mu t - \\frac{1}{2}\\sigma^2 t^2}$$"}
            description="The characteristic function is the Fourier transform of the probability density function."
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <PropertyCard
            title="Entropy"
            formula={"$$H(X) = \\frac{1}{2}\\ln(2\\pi e \\sigma^2)$$"}
            description="The normal distribution maximizes entropy among all distributions with the same variance."
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <PropertyCard
            title="Standardization"
            formula={"$$Z = \\frac{X - \\mu}{\\sigma} \\sim N(0, 1)$$"}
            description="Any normal distribution can be transformed to the standard normal distribution."
          />
        </Grid>
      </Grid>
      
      <Typography variant="subtitle1" sx={{ mt: 3 }} gutterBottom>
        Advanced Properties
      </Typography>
      
      <List>
        <PropertyListItem 
          primary="Sum of Independent Normal Variables" 
          secondary={"If X₁ ~ N(μ₁, σ₁²) and X₂ ~ N(μ₂, σ₂²) are independent, then X₁ + X₂ ~ N(μ₁ + μ₂, σ₁² + σ₂²)"}
        />
        <PropertyListItem 
          primary="Linear Transformation" 
          secondary={"If X ~ N(μ, σ²), then aX + b ~ N(aμ + b, a²σ²) for constants a ≠ 0 and b"}
        />
        <PropertyListItem
          primary="Reproductive Property"
          secondary={"The normal distribution is one of the few distributions closed under addition and scalar multiplication"}
        />
      </List>
      
      <Box sx={{ mt: 3, mb: 2 }}>
        <Button
          variant="outlined"
          color="primary"
          endIcon={showDerivations ? <ExpandMoreIcon /> : <ExpandMoreIcon sx={{ transform: 'rotate(-90deg)' }} />}
          onClick={handleToggleDerivations}
        >
          {showDerivations ? "Hide Mathematical Derivations" : "Show Mathematical Derivations"}
        </Button>
      </Box>
      
      {showDerivations && <NormalDistributionDerivations />}
    </Box>
  ), [showDerivations, handleToggleDerivations]);

  // Memoized content for the Binomial distribution
  const binomialProperties = useMemo(() => (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Mathematical Properties of the Binomial Distribution
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <PropertyCard
            title="Probability Generating Function"
            formula={"$$G_X(t) = (1-p+pt)^n$$"}
            description="The PGF is useful for finding moments and analyzing sums of independent binomial variables."
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <PropertyCard
            title="Moment Generating Function"
            formula={"$$M_X(t) = (1-p+pe^t)^n$$"}
            description="The MGF provides an alternative way to analyze the distribution's properties."
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <PropertyCard
            title="Recurrence Relation"
            formula={"$$P(X = k+1) = \\frac{p(n-k)}{(k+1)(1-p)}P(X = k)$$"}
            description="This relation allows efficient computation of probabilities for consecutive values."
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <PropertyCard
            title="Entropy"
            formula={"$$H(X) \\approx \\frac{1}{2}\\log_2(2\\pi e np(1-p))$$"}
            description="Approximation for large n, represents the uncertainty in the distribution."
          />
        </Grid>
      </Grid>
      
      <Typography variant="subtitle1" sx={{ mt: 3 }} gutterBottom>
        Advanced Properties
      </Typography>
      
      <List>
        <PropertyListItem 
          primary="Sum of Independent Binomial Variables" 
          secondary={"If X₁ ~ Bin(n₁, p) and X₂ ~ Bin(n₂, p) with the same p, then X₁ + X₂ ~ Bin(n₁ + n₂, p)"}
        />
      </List>
    </Box>
  ), []);

  // Choose content based on distribution type
  const getContent = useCallback(() => {
    switch (distributionType) {
      case 'NORMAL':
        return normalProperties;
      case 'BINOMIAL':
        return binomialProperties;
      default:
        return <Typography>Select a specific distribution to view its mathematical properties.</Typography>;
    }
  }, [distributionType, normalProperties, binomialProperties]);

  return getContent();
});

// Historical context section
const HistoricalContext = React.memo(({ distributionType }) => {
  // Content would vary based on distribution type
  // This is a placeholder for demonstration
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Historical Development of {distributionType.replace('_', ' ')} Distribution
      </Typography>
      <Typography variant="body1">
        Historical information about the {distributionType.toLowerCase()} distribution would be displayed here.
      </Typography>
    </Box>
  );
});

// Interactive simulations section
const InteractiveSimulations = React.memo(({ distributionType }) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Interactive Simulations for {distributionType.replace('_', ' ')} Distribution
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Parameter Exploration
              </Typography>
              <Typography variant="body2" paragraph>
                Explore how different parameter values affect the shape of the distribution:
              </Typography>
              <Box sx={{ height: '400px' }}>
                <DistributionAnimation distributionType={distributionType} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {distributionType === 'NORMAL' && (
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Central Limit Theorem Demonstration
                </Typography>
                <Typography variant="body2" paragraph>
                  See how the sum or average of random variables approaches a normal distribution:
                </Typography>
                <Box sx={{ height: '400px' }}>
                  <CLTSimulator />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
});

// Applications section
const Applications = React.memo(({ distributionType }) => {
  // Application examples for each distribution type
  const applicationExamples = useMemo(() => {
    switch (distributionType) {
      case 'NORMAL':
        return [
          { field: "Biology", example: "Heights and weights in populations" },
          { field: "Finance", example: "Stock price movements and portfolio returns" },
          { field: "Manufacturing", example: "Process variation and quality control" },
          { field: "Psychology", example: "IQ scores and standardized test results" }
        ];
      case 'BINOMIAL':
        return [
          { field: "Medicine", example: "Success/failure of treatments in clinical trials" },
          { field: "Quality Control", example: "Defective items in manufacturing" },
          { field: "Polling", example: "Voter preference in elections" },
          { field: "Genetics", example: "Inheritance of traits following Mendelian patterns" }
        ];
      case 'POISSON':
        return [
          { field: "Customer Service", example: "Number of calls per hour at a call center" },
          { field: "Insurance", example: "Number of claims filed per day" },
          { field: "Website Management", example: "Number of visitors per minute" },
          { field: "Public Safety", example: "Number of accidents at an intersection" }
        ];
      default:
        return [];
    }
  }, [distributionType]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Real-world Applications of the {distributionType.replace('_', ' ')} Distribution
      </Typography>
      
      <Typography variant="body2" paragraph>
        The {distributionType.toLowerCase()} distribution is applied in numerous fields to model real-world phenomena.
      </Typography>
      
      <Grid container spacing={3}>
        {applicationExamples.map((app, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  {app.field}
                </Typography>
                <Typography variant="body2">
                  {app.example}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
});

// Probability fundamentals section
const ProbabilityFundamentals = React.memo(() => {
  // Define memoized accordion items
  const basicProbabilityItems = useMemo(() => [
    { 
      primary: "Sample Space (Ω)", 
      secondary: "The set of all possible outcomes from a random experiment."
    },
    {
      primary: "Event", 
      secondary: "A subset of the sample space, representing a collection of outcomes."
    },
    {
      primary: "Probability Measure", 
      secondary: "A function that assigns a number between 0 and 1 to events, representing their likelihood."
    }
  ], []);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Probability Fundamentals
      </Typography>
      
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">
            <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Basic Probability Concepts
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" paragraph>
            Probability theory provides a framework for dealing with uncertainty and randomness. 
            It's built on a few key concepts:
          </Typography>
          
          <List>
            {basicProbabilityItems.map((item, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <CheckCircleIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary={item.primary} 
                  secondary={item.secondary}
                />
              </ListItem>
            ))}
          </List>
          
          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            Axioms of Probability:
          </Typography>
          
          <Box sx={{ ml: 3, mt: 1 }}>
            <MathJax>{"$$P(\\Omega) = 1$$"}</MathJax>
            <Typography variant="caption" color="text.secondary">
              The probability of the entire sample space is 1
            </Typography>
            
            <MathJax>{"$$P(A) \\geq 0 \\text{ for all events } A$$"}</MathJax>
            <Typography variant="caption" color="text.secondary">
              Probabilities are never negative
            </Typography>
            
            <MathJax>{"$$P(\\cup_{i=1}^{\\infty} A_i) = \\sum_{i=1}^{\\infty} P(A_i) \\text{ for mutually exclusive events}$$"}</MathJax>
            <Typography variant="caption" color="text.secondary">
              The probability of a union of mutually exclusive events is the sum of their individual probabilities
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>
      
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">
            <FunctionsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Random Variables
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" paragraph>
            A random variable is a function that maps outcomes from a sample space to real numbers, 
            allowing us to perform mathematical operations on random outcomes.
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Discrete Random Variables
                  </Typography>
                  <Typography variant="body2">
                    Take on countable values (e.g., 0, 1, 2, ...). 
                    Described by a Probability Mass Function (PMF).
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <MathJax>{"$$P(X = x) = f_X(x)$$"}</MathJax>
                    <Typography variant="caption" color="text.secondary">
                      PMF gives the probability that X equals exactly x
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Continuous Random Variables
                  </Typography>
                  <Typography variant="body2">
                    Take on uncountable values in an interval. 
                    Described by a Probability Density Function (PDF).
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <MathJax>{"$$P(a \\leq X \\leq b) = \\int_a^b f_X(x) dx$$"}</MathJax>
                    <Typography variant="caption" color="text.secondary">
                      PDF gives the density of probability, not probability directly
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Common Characteristics of Distributions:
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="body2" fontWeight="bold">Expected Value (Mean)</Typography>
                  <MathJax>{"$$E[X] = \\sum x \\cdot P(X = x) \\text{ or } \\int x \\cdot f(x) dx$$"}</MathJax>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="body2" fontWeight="bold">Variance</Typography>
                  <MathJax>{"$$Var(X) = E[(X - E[X])^2]$$"}</MathJax>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="body2" fontWeight="bold">Cumulative Distribution Function</Typography>
                  <MathJax>{"$$F_X(x) = P(X \\leq x)$$"}</MathJax>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </AccordionDetails>
      </Accordion>
      
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">
            <HistoryEduIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Key Theorems
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Law of Large Numbers
                  </Typography>
                  <Typography variant="body2" paragraph>
                    As the number of trials increases, the sample mean approaches the expected value.
                  </Typography>
                  <MathJax>{"$$\\lim_{n \\to \\infty} P\\left( \\left| \\frac{S_n}{n} - \\mu \\right| < \\epsilon \\right) = 1$$"}</MathJax>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Central Limit Theorem
                  </Typography>
                  <Typography variant="body2" paragraph>
                    The sum (or average) of a large number of independent random variables tends toward a normal distribution.
                  </Typography>
                  <MathJax>{"$$\\frac{\\bar{X}_n - \\mu}{\\sigma/\\sqrt{n}} \\xrightarrow{d} N(0,1)$$"}</MathJax>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button 
              variant="outlined" 
              color="primary"
              onClick={() => window.open('/probability-distributions/interactive-clt', '_blank')}
            >
              Explore the Central Limit Theorem Interactively
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
});

// Main component that selects appropriate content based on distribution type
const EducationalContent = React.memo(({ distributionType }) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = useCallback((event, newValue) => {
    setActiveTab(newValue);
  }, []);

  // Memoized function to select the appropriate distribution content
  const getDistributionContent = useCallback(() => {
    switch (distributionType) {
      case 'NORMAL':
        return <NormalDistributionContent />;
      case 'BINOMIAL':
        return <BinomialDistributionContent />;
      case 'POISSON':
        return <PoissonDistributionContent />;
      case 'EXPONENTIAL':
        return <ExponentialDistributionContent />;
      case 'UNIFORM':
        return <UniformDistributionContent />;
      case 'BETA':
        return <BetaDistributionContent />;
      default:
        return <GeneralProbabilityContent />;
    }
  }, [distributionType]);

  // Memoized tabs
  const tabs = useMemo(() => [
    "Distribution Concepts",
    "Mathematical Properties",
    "Historical Context",
    "Interactive Simulations",
    "Applications"
  ], []);

  return (
    <MathJaxContext config={mathJaxConfig}>
      <Box sx={{ width: '100%' }}>
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Educational Resources
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Explore the theoretical foundations, applications, and mathematical properties of probability distributions.
          </Typography>
          
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            variant="scrollable" 
            scrollButtons="auto"
          >
            {tabs.map((tab, index) => (
              <Tab key={index} label={tab} />
            ))}
          </Tabs>
          
          <Divider sx={{ my: 2 }} />
          
          <TabPanel value={activeTab} index={0}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Understanding {distributionType.replace('_', ' ')} Distribution
              </Typography>
              {getDistributionContent()}
            </Box>
          </TabPanel>
          
          <TabPanel value={activeTab} index={1}>
            <MathematicalProperties distributionType={distributionType} />
          </TabPanel>
          
          <TabPanel value={activeTab} index={2}>
            <HistoricalContext distributionType={distributionType} />
          </TabPanel>
          
          <TabPanel value={activeTab} index={3}>
            <InteractiveSimulations distributionType={distributionType} />
          </TabPanel>
          
          <TabPanel value={activeTab} index={4}>
            <Applications distributionType={distributionType} />
          </TabPanel>
        </Paper>
        
        <ProbabilityFundamentals />
      </Box>
    </MathJaxContext>
  );
});

export default EducationalContent;