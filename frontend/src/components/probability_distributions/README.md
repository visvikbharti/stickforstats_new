# Probability Distributions Module

This module provides interactive visualizations and calculations for various probability distributions. It is designed to be both educational and practical, allowing users to explore statistical concepts and perform probability calculations.

## Components Overview

### Main Components

| Component | Description |
|-----------|-------------|
| `ProbabilityDistributionsPage` | The main page component that integrates all distribution components |
| `DistributionPlot` | Visualizes probability distributions with interactive elements |
| `ProbabilityCalculator` | Calculates probabilities for various distributions |
| `DistributionParameters` | Controls for adjusting distribution parameters |
| `DistributionSelector` | Component for selecting distribution types |
| `EnhancedTooltip` | Provides educational tooltips with rich content |
| `EducationalOverlay` | Detailed educational content in a modal overlay |

### Testing Components

| Component | Description |
|-----------|-------------|
| `TestCalculator` | Standalone educational calculator with guided tutorial and enhanced visualization features |

## Usage

### Basic Usage

To use the probability calculator in your application:

```jsx
import React, { useState } from 'react';
import ProbabilityCalculator from './components/probability_distributions/ProbabilityCalculator';
import DistributionParameters from './components/probability_distributions/DistributionParameters';

const MyStatisticsApp = () => {
  const [distributionType, setDistributionType] = useState('NORMAL');
  const [parameters, setParameters] = useState({ mean: 0, std: 1 });

  const handleParameterChange = (paramName, value) => {
    setParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  return (
    <div>
      <h1>My Statistics Application</h1>
      
      <DistributionParameters
        distributionType={distributionType}
        parameters={parameters}
        onParameterChange={handleParameterChange}
      />
      
      <ProbabilityCalculator
        distributionType={distributionType}
        parameters={parameters}
      />
    </div>
  );
};
```

### Using the Test Environment

The project includes a test environment for developing and testing the calculator components:

1. Navigate to the frontend directory
2. Run the test script: `./run_test_calculator.sh` or `./scripts/run_calculator_dev.sh`
3. This will start the development server and open the test calculator in your default browser

You can also access the test calculator directly at `/test/calculator` when running the application.

### TestCalculator Features

The `TestCalculator` component includes the following features:

- **Interactive Tutorial**: Step-by-step introduction for new users
- **Distribution Selection**: Support for all major probability distributions
- **Parameter Controls**: Intuitive controls with real-time visualization updates
- **Calculation Types**: Less than, greater than, between, and exactly calculations
- **Enhanced Visualization**: D3.js visualizations with highlighted probability areas
- **Educational Content**: Information about distributions and calculation methods
- **Calculation History**: Track and revisit previous calculations
- **Responsive Design**: Works across desktop and mobile devices

## Supported Distributions

The calculator supports the following probability distributions:

### Discrete Distributions

- **Binomial**: Models the number of successes in a fixed number of independent trials
- **Poisson**: Models the number of events occurring in a fixed interval
- **Geometric**: Models the number of trials until the first success
- **Negative Binomial**: Models the number of trials until a specified number of successes
- **Hypergeometric**: Models sampling without replacement from a finite population

### Continuous Distributions

- **Normal**: Models phenomena with symmetric variation around a mean
- **Uniform**: Models an equal probability across a range
- **Exponential**: Models the time between events in a Poisson process
- **Gamma**: Models waiting times or amounts that are always positive
- **Beta**: Models proportions or probabilities between 0 and 1
- **Log-Normal**: Models positive values with skewed distribution
- **Weibull**: Models lifetime and survival distributions
- **Student's t**: Models estimation with small sample sizes
- **Chi-Square**: Models the sum of squared standard normal variables
- **F-Distribution**: Models the ratio of two chi-squared distributions

## Component API Reference

### DistributionPlot

Visualizes probability distributions with customizable options.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | string | 'normal' | Distribution type ('normal', 'binomial', etc.) |
| `parameters` | object | {} | Parameters specific to the distribution |
| `plotConfig` | object | {} | Configuration for the plot (width, height, etc.) |
| `onCalculationComplete` | function | null | Callback when calculation completes |

#### PlotConfig Options

```js
{
  width: 600,             // Width of the plot in pixels
  height: 300,            // Height of the plot in pixels
  showPdf: true,          // Show probability density/mass function
  showCdf: false,         // Show cumulative distribution function
  fillArea: false,        // Fill area under the curve/bars
  fillRange: [null, null], // Range to fill [start, end]
  showGrid: true,         // Show grid lines
  margin: {               // Margins around the plot
    top: 30,
    right: 30,
    bottom: 50,
    left: 60
  }
}
```

### ProbabilityCalculator

Calculates and displays probabilities for different distribution types.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `distributionType` | string | 'NORMAL' | Type of distribution (NORMAL, BINOMIAL, etc.) |
| `parameters` | object | {} | Parameters for the distribution |
| `onAreaSelect` | function | null | Callback when probability area is selected |

### DistributionParameters

Component for adjusting distribution parameters.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `distributionType` | string | 'NORMAL' | Type of distribution |
| `parameters` | object | {} | Current parameter values |
| `onParameterChange` | function | null | Callback when a single parameter changes |
| `onChange` | function | null | Callback when all parameters change |

### DistributionSelector

Component for selecting distribution types.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selectedType` | string | 'NORMAL' | Currently selected distribution type |
| `onTypeChange` | function | () => {} | Callback when type changes |

### EnhancedTooltip

Component for displaying rich educational tooltips.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | string | '' | Title of the tooltip |
| `content` | node | null | Main content |
| `image` | node | null | Optional image |
| `formula` | node | null | Optional mathematical formula |
| `customStyles` | object | {} | Additional styling |

### EducationalOverlay

Modal overlay for detailed educational content.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | boolean | false | Whether overlay is visible |
| `onClose` | function | () => {} | Callback when closed |
| `title` | string | '' | Overlay title |
| `content` | array | [] | Array of content sections |
| `distribution` | object | null | Distribution info to display |

## Calculation Types

The calculator supports the following probability calculations:

1. **Less Than (CDF)**: P(X < value) - Calculates the probability that a random variable is less than a specified value.
2. **Greater Than**: P(X > value) - Calculates the probability that a random variable exceeds a specified value.
3. **Between**: P(lower < X < upper) - Calculates the probability that a random variable falls within a specified range.
4. **Exactly**: P(X = value) - Calculates the probability that a random variable equals exactly a specified value. For continuous distributions, this is approximately zero.

## Extending the Module

### Adding a New Distribution

To add support for a new distribution:

1. Update the `DistributionSelector` component to include the new distribution
2. Add calculation functions for the distribution in the `ProbabilityCalculator` component
3. Implement visualization logic in the `DistributionPlot` component
4. Add parameter controls in `DistributionParameters`

### Example: Adding a New Distribution

```jsx
// In DistributionSelector.jsx
const DISTRIBUTION_CATEGORIES = [
  {
    name: 'Discrete Distributions',
    distributions: [
      // Existing distributions...
      { 
        value: 'CUSTOM', 
        label: 'Custom Distribution', 
        description: 'Description of your custom distribution' 
      },
    ]
  },
  // ...
];

// In ProbabilityCalculator.jsx
// Add calculation function for your distribution
const customDistributionPMF = (k, params) => {
  // Implementation...
};

// Update getDistributionInfo
const getDistributionInfo = (distributionType, params) => {
  switch (distributionType) {
    // Existing cases...
    case 'CUSTOM':
      return {
        type: 'Custom',
        notation: `Custom(${params.param1}, ${params.param2})`,
        description: 'Description of your custom distribution',
        formula: 'Your formula here',
        parameters: `param1=${params.param1}, param2=${params.param2}`
      };
    // ...
  }
};

// In calculateProbability function, add case for your distribution
switch (type) {
  // Existing cases...
  case 'CUSTOM': {
    // Implementation...
    break;
  }
  // ...
}
```

## Development and Testing

### Development Workflow

1. Use the test environment to develop and test new features
2. Run the test script: `./scripts/run_calculator_dev.sh`
3. Make changes to the components and see them reflected in real-time

### Testing

The components can be tested using:

```bash
npm test -- --watchAll=false src/components/probability_distributions
```

Individual component tests can be run with:

```bash
npm test -- src/components/probability_distributions/ProbabilityCalculator.test.jsx
npm test -- src/__tests__/components/probability_distributions/TestCalculator.test.jsx
```