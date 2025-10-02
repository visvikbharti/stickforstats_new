# TestCalculator Component Documentation

The `TestCalculator` component is an enhanced version of the `ProbabilityCalculator` designed for educational purposes. It provides a comprehensive interface for exploring probability distributions with guided tutorials and interactive visualizations.

## Overview

The TestCalculator integrates multiple components from the probability distributions module into a standalone educational tool. It features:

1. **Interactive Tutorial**: A step-by-step guide for new users
2. **Distribution Selection**: Support for all major probability distributions
3. **Parameter Adjustment**: Intuitive controls with real-time updates
4. **Visualization**: D3.js-based visualization with probability area highlighting
5. **Calculation History**: Track and revisit previous calculations

## Usage

### Accessing the TestCalculator

There are multiple ways to access the TestCalculator:

1. **Direct URL**: Navigate to `/test/calculator` when the application is running
2. **Run Script**: Execute `./run_test_calculator.sh` from the project root
3. **Component Import**: Import and use the component directly:

```jsx
import TestCalculatorWithProviders from './components/probability_distributions/TestCalculator';

// In your React component
<TestCalculatorWithProviders />
```

### Component Structure

The TestCalculator wraps several key components:

- **DistributionSelector**: For choosing the distribution type
- **DistributionParameters**: For setting distribution parameters
- **ProbabilityCalculator**: The core calculation component
- **Educational Tutorial**: Step-by-step guidance for new users

## Feature Details

### Guided Tutorial System

The TestCalculator includes a comprehensive tutorial system for first-time users:

1. **Welcome Introduction**: Overview of the calculator's functionality
2. **Step 1 - Select Distribution**: Guide for selecting probability distributions
3. **Step 2 - Adjust Parameters**: Instructions for parameter adjustment
4. **Step 3 - Calculate Probabilities**: Guide for different calculation types
5. **Ready to Start**: Final step with additional resources

The tutorial uses local storage to remember if a user has completed it:

```javascript
// Check if user has seen tutorial
useEffect(() => {
  const hasSeenTutorial = localStorage.getItem('hasSeenCalculatorTutorial');
  if (hasSeenTutorial === 'true') {
    setShowInitialTutorial(false);
  }
}, []);
```

### Distribution Parameters

The component supports all major probability distributions with their specific parameters:

| Distribution | Parameters |
|--------------|------------|
| Normal | mean, std |
| Binomial | n, p |
| Poisson | lambda |
| Exponential | rate |
| Uniform | a, b |
| Gamma | shape, scale |
| Beta | alpha, beta |
| Log-Normal | mean, sigma |
| Weibull | shape, scale |

Parameters automatically update when the distribution type changes:

```javascript
const handleTypeSelect = (newType) => {
  setDistributionType(newType);
  
  // Set default parameters based on distribution type
  switch (newType) {
    case 'NORMAL':
      setParameters({ mean: 0, std: 1 });
      break;
    case 'BINOMIAL':
      setParameters({ n: 10, p: 0.5 });
      break;
    // Additional cases for other distributions
  }
};
```

### Responsive Design

The TestCalculator is fully responsive and adapts to different screen sizes:

- **Desktop**: Two-column layout with controls and visualization side by side
- **Mobile**: Stacked layout with controls above visualization
- **Tablet**: Adaptive layout based on available space

Responsive behavior is implemented using Material UI's useMediaQuery hook:

```javascript
const isMobile = useMediaQuery(theme.breakpoints.down('md'));

// Later in the component...
<Stepper 
  activeStep={activeStep} 
  orientation={isMobile ? "vertical" : "horizontal"} 
  sx={{ mb: 4, mt: 2 }}
>
  {/* Stepper content */}
</Stepper>
```

## Core Functionality

### Distribution Selection

The TestCalculator allows users to select from a wide range of probability distributions using the `DistributionSelector` component. Selection automatically updates parameters and visualizations.

### Parameter Controls

The `DistributionParameters` component provides intuitive controls specific to the selected distribution:

- Sliders for continuous parameters
- Number inputs for precise value entry
- Information tooltips explaining each parameter

### Probability Calculations

The component supports four types of probability calculations:

1. **Less Than**: P(X < value)
2. **Greater Than**: P(X > value)
3. **Between**: P(lower < X < upper)
4. **Exactly**: P(X = value) - Most useful for discrete distributions

Each calculation updates the visualization with appropriate highlighting of the probability area.

### Educational Content

Educational content is provided through:

1. **Tooltips**: Context-sensitive information about parameters and calculations
2. **Information Icons**: Hover/click for detailed explanations
3. **Educational Overlay**: Comprehensive explanations of statistical concepts
4. **Interactive Visualization**: Visual representation of probability areas

## Integration with Other Components

The TestCalculator integrates with several other components:

```jsx
<Card elevation={2} sx={{ borderRadius: 2 }}>
  <CardContent>
    <ProbabilityCalculator
      distributionType={distributionType}
      parameters={parameters}
    />
  </CardContent>
</Card>
```

## Testing

The component includes comprehensive testing:

1. **Unit Tests**: For pure calculation functions
2. **Component Tests**: For UI rendering and interactions
3. **Integration Tests**: For the complete calculator experience

Run the tests with:

```bash
npm test -- --testPathPattern=TestCalculator
```

## Best Practices

When using or extending the TestCalculator:

1. **Separate Calculation Logic**: Keep calculation logic separate from UI components
2. **Optimize Visualizations**: Use memoization for expensive D3.js operations
3. **Progressive Enhancement**: Provide fallbacks for unsupported features
4. **Accessibility**: Include descriptions for visual elements
5. **Educational Value**: Focus on clear connection between theory and visualization

## Implementation Guidelines

When implementing new features:

1. **Add Parameter Validation**: Ensure parameters are validated before calculations
2. **Use Consistent Design**: Follow the established Material UI patterns
3. **Include Educational Content**: Provide explanations for new features
4. **Test Thoroughly**: Include tests for edge cases and boundary conditions
5. **Document Additions**: Update documentation with new features

## Conclusion

The TestCalculator component provides a comprehensive educational tool for understanding probability distributions. It combines calculation functionality with educational features to create an engaging learning experience.

To contribute to the TestCalculator component, please follow the project's contributing guidelines and ensure that all changes maintain the educational focus of the component.