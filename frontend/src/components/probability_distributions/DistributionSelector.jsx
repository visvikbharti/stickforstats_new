import React from 'react';
import { 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Typography, 
  Paper, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails 
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const DISTRIBUTION_CATEGORIES = [
  {
    name: 'Discrete Distributions',
    distributions: [
      { value: 'BINOMIAL', label: 'Binomial', description: 'Models the number of successes in a fixed number of independent trials' },
      { value: 'POISSON', label: 'Poisson', description: 'Models the number of events occurring in a fixed interval' },
      { value: 'GEOMETRIC', label: 'Geometric', description: 'Models the number of trials until the first success' },
      { value: 'NEGATIVEBINOMIAL', label: 'Negative Binomial', description: 'Models the number of trials until a specified number of successes' },
      { value: 'HYPERGEOMETRIC', label: 'Hypergeometric', description: 'Models sampling without replacement from a finite population' }
    ]
  },
  {
    name: 'Continuous Distributions',
    distributions: [
      { value: 'NORMAL', label: 'Normal', description: 'Models phenomena with symmetric variation around a mean' },
      { value: 'UNIFORM', label: 'Uniform', description: 'Models an equal probability across a range' },
      { value: 'EXPONENTIAL', label: 'Exponential', description: 'Models the time between events in a Poisson process' },
      { value: 'GAMMA', label: 'Gamma', description: 'Models waiting times or amounts that are always positive' },
      { value: 'BETA', label: 'Beta', description: 'Models proportions or probabilities between 0 and 1' },
      { value: 'LOGNORMAL', label: 'Log-Normal', description: 'Models positive values with skewed distribution' },
      { value: 'WEIBULL', label: 'Weibull', description: 'Models lifetime and survival distributions' },
      { value: 'T', label: 'Student\'s t', description: 'Models estimation with small sample sizes' },
      { value: 'CHI2', label: 'Chi-Square', description: 'Models the sum of squared standard normal variables' },
      { value: 'F', label: 'F-Distribution', description: 'Models the ratio of two chi-squared distributions' }
    ]
  },
  {
    name: 'Multivariate Distributions',
    distributions: [
      { value: 'MULTIVARIATE_NORMAL', label: 'Multivariate Normal', description: 'Extension of normal distribution to multiple dimensions' },
      { value: 'DIRICHLET', label: 'Dirichlet', description: 'Multivariate extension of the beta distribution' }
    ]
  }
];

const DistributionSelector = ({ selectedType, onTypeChange }) => {
  const handleChange = (event) => {
    onTypeChange(event.target.value);
  };

  // Find the selected distribution's details
  let selectedDescription = '';
  for (const category of DISTRIBUTION_CATEGORIES) {
    const found = category.distributions.find(dist => dist.value === selectedType);
    if (found) {
      selectedDescription = found.description;
      break;
    }
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Select Distribution
      </Typography>
      
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Distribution Type</InputLabel>
        <Select
          value={selectedType}
          label="Distribution Type"
          onChange={handleChange}
        >
          {DISTRIBUTION_CATEGORIES.map((category) => [
            <MenuItem 
              key={`header-${category.name}`} 
              disabled 
              sx={{ opacity: 0.7, fontWeight: 'bold' }}
            >
              {category.name}
            </MenuItem>,
            ...category.distributions.map((distribution) => (
              <MenuItem 
                key={distribution.value} 
                value={distribution.value}
                sx={{ pl: 4 }}
              >
                {distribution.label}
              </MenuItem>
            ))
          ]).flat()}
        </Select>
      </FormControl>
      
      <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'background.paper', mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Description
        </Typography>
        <Typography variant="body2">
          {selectedDescription}
        </Typography>
      </Paper>
      
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Distribution Details</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <DistributionDetails type={selectedType} />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

const DistributionDetails = ({ type }) => {
  // Content for each distribution type
  const detailsContent = {
    NORMAL: (
      <>
        <Typography variant="body2" paragraph>
          The Normal distribution is one of the most important continuous probability 
          distributions. It's characterized by its bell-shaped curve, with a mean (μ) 
          that defines the center of the distribution and a standard deviation (σ) 
          that defines the spread.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>PDF:</strong> f(x) = (1/σ√(2π)) * e^(-(x-μ)²/(2σ²))
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Applications:</strong> Natural phenomena, measurement errors, sample means, 
          and many real-world scenarios due to the Central Limit Theorem.
        </Typography>
      </>
    ),
    BINOMIAL: (
      <>
        <Typography variant="body2" paragraph>
          The Binomial distribution models the number of successes in a fixed number (n) 
          of independent trials, each with the same probability (p) of success.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>PMF:</strong> P(X = k) = (n choose k) * p^k * (1-p)^(n-k)
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Applications:</strong> Coin flips, yes/no surveys, quality control 
          (pass/fail inspections), and binary outcomes with fixed trial count.
        </Typography>
      </>
    ),
    POISSON: (
      <>
        <Typography variant="body2" paragraph>
          The Poisson distribution models the number of events occurring in a fixed 
          interval of time or space, with a known average rate (λ) and independent 
          of the time since the last event.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>PMF:</strong> P(X = k) = (e^-λ * λ^k) / k!
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Applications:</strong> Number of calls per hour, website visits, 
          radioactive decay events, and rare events in fixed intervals.
        </Typography>
      </>
    ),
    // Add more distribution details here
  };

  // Default content if no specific details available
  const defaultContent = (
    <Typography variant="body2">
      This is a probability distribution with specific properties and applications.
      Select parameters to explore its characteristics.
    </Typography>
  );

  return detailsContent[type] || defaultContent;
};

export default DistributionSelector;