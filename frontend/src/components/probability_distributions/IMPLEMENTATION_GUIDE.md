# Probability Distributions Implementation Guide

This guide provides detailed instructions for implementing and extending the probability distributions module. It covers the architecture, implementation details, and best practices for working with the components.

## Architecture Overview

The probability distributions module follows a component-based architecture with the following key principles:

1. **Separation of Concerns**: Each component has a specific responsibility
2. **Composition**: Components are composed together to create complex functionality
3. **State Management**: React hooks for local state, can be extended with context/redux
4. **Pure Calculation**: Mathematical calculations are performed client-side for performance
5. **Interactive Visualization**: D3.js for rich, responsive visualizations

### Component Hierarchy

```
ProbabilityDistributionsPage
├── DistributionSelector
├── DistributionParameters
├── ProbabilityCalculator
│   └── DistributionPlot
├── Educational Components
│   ├── DistributionAnimation
│   ├── RandomSampleGenerator 
│   └── DataFitting
└── ApplicationSimulations
```

## Implementation Details

### State Management

The module uses React's useState and useEffect hooks for state management. For larger applications, you may want to consider using a context provider or Redux for global state management.

Example state structure:

```javascript
// Current distribution configuration
const [distributionType, setDistributionType] = useState('NORMAL');
const [parameters, setParameters] = useState({
  mean: 0,
  std: 1
});

// Calculation state
const [result, setResult] = useState(null);
const [calcHistory, setCalcHistory] = useState([]);

// UI state
const [isCalculating, setIsCalculating] = useState(false);
const [plotConfig, setPlotConfig] = useState({ /* ... */ });
```

### Mathematical Calculations

Probability calculations are performed client-side for better interactivity. For complex or computationally intensive calculations, consider offloading to a backend service.

Key mathematical functions:

1. **Probability Distribution Functions (PDF/PMF)**
   - Calculates the probability density or mass at specific points
   - Implemented as JavaScript functions for each distribution type

2. **Cumulative Distribution Functions (CDF)**
   - Calculates the cumulative probability
   - Often uses numerical approximations or summations

3. **Parameter Estimators**
   - Estimates distribution parameters based on sample data
   - Useful for data fitting components

### Error Handling and Validation

The module implements comprehensive error handling for:

1. Invalid parameter inputs (validation)
2. Calculation errors (numerical stability)
3. Visualization edge cases

### Example: Normal Distribution Implementation

```javascript
// PDF for Normal distribution
const normalPDF = (x, mean, std) => {
  const z = (x - mean) / std;
  return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
};

// CDF for Normal distribution using error function approximation
const normalCDF = (x, mean, std) => {
  const z = (x - mean) / (Math.sqrt(2) * std);
  return 0.5 * (1 + erf(z));
};

// Error function approximation
const erf = (x) => {
  // Constants for approximation
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return sign * y;
};
```

## Visualization with D3.js

The module uses D3.js for data visualization, allowing for rich, interactive graphics. The key visualization components are:

### Basic Plot Structure

```javascript
const drawPlot = () => {
  // Create scales
  const xScale = d3.scaleLinear()
    .domain([minX, maxX])
    .range([margin.left, width - margin.right]);
    
  const yScale = d3.scaleLinear()
    .domain([0, maxY])
    .range([height - margin.bottom, margin.top]);
    
  // Create axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale);
  
  // Add axes to SVG
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(xAxis);
    
  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(yAxis);
    
  // Draw lines for continuous distributions
  if (isContinuous) {
    const line = d3.line()
      .x((d, i) => xScale(xValues[i]))
      .y(d => yScale(d))
      .curve(d3.curveCatmullRom.alpha(0.5));
      
    svg.append("path")
      .datum(pdfValues)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line);
  } 
  // Draw bars for discrete distributions
  else {
    svg.selectAll(".bar")
      .data(pdfValues)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d, i) => xScale(i))
      .attr("y", d => yScale(d))
      .attr("width", xScale.bandwidth())
      .attr("height", d => height - margin.bottom - yScale(d))
      .attr("fill", "steelblue");
  }
};
```

### Highlighting Probability Areas

```javascript
// For continuous distributions
const area = d3.area()
  .x((d, i) => xScale(xValues[i + startIdx]))
  .y0(yScale(0))
  .y1(d => yScale(d))
  .curve(d3.curveCatmullRom.alpha(0.5));

svg.append("path")
  .datum(pdfValues.slice(startIdx, endIdx !== -1 ? endIdx : undefined))
  .attr("fill", "rgba(70, 130, 180, 0.3)")
  .attr("d", area);

// For discrete distributions
svg.selectAll(".bar")
  .attr("fill", (d, i) => (i >= range[0] && i <= range[1]) ? 
    "rgba(70, 130, 180, 0.8)" : "steelblue")
  .attr("opacity", (d, i) => (i >= range[0] && i <= range[1]) ? 1 : 0.7);
```

### Animations and Transitions

```javascript
// Animate bars growing from bottom
bars.transition()
  .duration(750)
  .attr("y", d => yScale(d))
  .attr("height", d => height - margin.bottom - yScale(d));

// Animate line drawing
path.attr("stroke-dasharray", function() {
    const length = this.getTotalLength();
    return `${length} ${length}`;
  })
  .attr("stroke-dashoffset", function() {
    return this.getTotalLength();
  })
  .transition()
  .duration(1000)
  .attr("stroke-dashoffset", 0);
```

## Adding Educational Features

### Interactive Simulations

The module includes several educational features:

1. **Central Limit Theorem Simulator**: Demonstrates how sample means approach a normal distribution
2. **Distribution Animation**: Visualizes how changing parameters affects the distribution
3. **Data Fitting**: Fits real data to distributions and validates the fit

### Implementation Example: Parameter Animation

```javascript
// Animate parameter changes
useEffect(() => {
  if (!prevParameters.current) {
    prevParameters.current = { ...parameters };
    return;
  }

  // Create animation timeline
  const startParams = { ...prevParameters.current };
  const endParams = { ...parameters };
  const steps = 30;
  
  const interpolateParams = (progress) => {
    const result = {};
    Object.keys(endParams).forEach(key => {
      result[key] = startParams[key] + (endParams[key] - startParams[key]) * progress;
    });
    return result;
  };
  
  // Run animation
  let frame = 0;
  const animate = () => {
    if (frame >= steps) {
      prevParameters.current = { ...parameters };
      return;
    }
    
    const progress = frame / steps;
    const interpolated = interpolateParams(progress);
    setAnimatedParameters(interpolated);
    
    frame++;
    requestAnimationFrame(animate);
  };
  
  requestAnimationFrame(animate);
}, [parameters]);
```

## Best Practices

1. **Performance Optimization**
   - Use memoization for expensive calculations (useMemo)
   - Optimize D3 rendering by only updating what changed
   - Throttle/debounce user inputs that trigger calculations

2. **Code Organization**
   - Keep pure calculation functions separate from UI components
   - Organize distribution-specific logic into separate modules
   - Group related components in subdirectories

3. **Progressive Enhancement**
   - Provide fallbacks for unsupported browsers
   - Gracefully degrade advanced visualizations on mobile devices
   - Offer simplified calculations when full precision isn't required

4. **Accessibility**
   - Include descriptive text alternatives for visualizations
   - Use semantic HTML elements and ARIA attributes
   - Support keyboard navigation for interactive elements

## Testing Strategy

1. **Unit Tests**
   - Test pure calculation functions for mathematical correctness
   - Verify edge cases and boundary conditions
   - Check numerical stability

2. **Component Tests**
   - Test component rendering and basic interactions
   - Verify state management and lifecycle behaviors
   - Test component composition and prop passing

3. **Integration Tests**
   - Test complete workflows (selection, parameter adjustment, calculation)
   - Verify that components work together correctly
   - Test visualization and calculation consistency

## Optimizing for Production

1. **Bundle Size Optimization**
   - Consider code splitting for the educational components
   - Lazy load rarely used distributions
   - Tree-shake D3.js to include only needed functionality

2. **Server-side Calculations**
   - Move complex calculations to the server for better performance
   - Implement caching for common calculations
   - Consider using WebAssembly for computation-heavy operations

3. **Progressive Web App Features**
   - Implement offline support for core functionality
   - Cache distribution visualizations
   - Use IndexedDB to store calculation history

## Conclusion

This guide covers the essential aspects of implementing and extending the probability distributions module. By following these patterns and best practices, you can create a robust, interactive, and educational tool for statistical analysis.

For specific implementation questions or to contribute to the module, please refer to the development team guidelines.

---

## Appendix: Implementation Checklist

- [ ] Core distribution calculations
  - [ ] PDF/PMF functions
  - [ ] CDF functions
  - [ ] Parameter validation
- [ ] Visualization components
  - [ ] Basic distribution plots
  - [ ] Probability area highlighting
  - [ ] Interactive elements
- [ ] Calculator UI
  - [ ] Parameter inputs
  - [ ] Calculation controls
  - [ ] Results display
- [ ] Educational features
  - [ ] Tooltips and explanations
  - [ ] Interactive animations
  - [ ] Tutorial guides
- [ ] Mobile responsiveness
  - [ ] Layout adjustments
  - [ ] Touch-friendly controls
  - [ ] Performance optimizations
- [ ] Accessibility
  - [ ] Keyboard navigation
  - [ ] Screen reader support
  - [ ] Color contrast compliance