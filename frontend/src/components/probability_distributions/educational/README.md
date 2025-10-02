# Probability Distributions Educational Components

This directory contains educational components for the Probability Distributions module. These components are designed to provide interactive, visual learning experiences for understanding statistical concepts.

## Components

### DistributionAnimation

An interactive animation component that visualizes probability distributions with adjustable parameters. It demonstrates how changing parameters affects the shape of distributions and includes step-by-step explanations.

**Features:**
- Interactive parameter controls with real-time visualization updates
- Step-by-step animations with educational explanations
- Random sample generation to demonstrate sampling from distributions
- Professional D3.js visualizations with smooth transitions
- Support for multiple distribution types:
  - Normal (Gaussian) distribution
  - Binomial distribution
  - Poisson distribution
  - Exponential distribution

**Usage:**
```jsx
import DistributionAnimation from './components/probability_distributions/educational/DistributionAnimation';

// For a Normal distribution
<DistributionAnimation type="NORMAL" />

// For a Binomial distribution
<DistributionAnimation type="BINOMIAL" />

// For a Poisson distribution
<DistributionAnimation type="POISSON" />

// For an Exponential distribution
<DistributionAnimation type="EXPONENTIAL" />
```

**Technical Implementation:**
- Uses D3.js for advanced, customizable visualizations
- Implements client-side calculations for all probability distributions
- Uses KaTeX for mathematical formula rendering
- Uses Framer Motion for smooth UI animations
- Responsive design that works across different screen sizes

## Adding New Distributions

To add a new distribution type:

1. Add calculation methods in the utility functions at the top of `DistributionAnimation.jsx`:
   - `calculatePmfPdf`
   - `calculateCdf`
   - `generateRandomSample`

2. Add default parameters in the `getDefaultParams` function

3. Add x-value generation logic in the `generateXValues` function

4. Create animation steps in the `getAnimationSteps` function

5. Add parameter controls in the `renderParameterControls` function

6. Add the distribution formula in the `getFormula` function

7. Add parameter descriptions in the `getParameterDescription` function

## Future Enhancements

Planned enhancements for this component include:

- Adding more distribution types (t-distribution, chi-squared, etc.)
- Adding comparison tools for multiple distributions
- Adding interactive quizzes and challenges
- Adding downloadable resources for educators
- Adding accessibility features for screen readers