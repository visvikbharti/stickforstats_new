# Probability Distributions Module - Enhanced with D3.js

This module provides interactive visualizations and calculations for various probability distributions, enhanced with D3.js visualizations. It is designed to be both educational and practical, allowing users to explore statistical concepts and perform probability calculations with rich, interactive visualizations.

## 🚀 New D3.js Enhanced Features

The module has been significantly enhanced with D3.js visualizations, offering several benefits over the previous Chart.js implementation:

- **More Interactive Visualizations**: Direct manipulation of chart elements
- **Customizable Graphics**: Fine-grained control over visualization appearance
- **Smooth Animations**: Smooth transitions between states for better understanding
- **Client-side Calculations**: Reduced API dependencies for better performance
- **Enhanced Educational Value**: Dynamic visualizations that respond to user input
- **Responsive Design**: Adapts to different screen sizes and devices
- **KaTeX Integration**: Mathematical formulas rendered with KaTeX for clarity and performance

### New D3.js Simulation Components

The module now includes the following interactive simulation components:

| Component | Description | Distribution | Key Features |
|-----------|-------------|--------------|--------------|
| `EmailArrivalsD3` | Simulates email arrivals at a server | Poisson | Arrival rate control, server capacity analysis, real-time animation |
| `QualityControlD3` | Manufacturing process quality control | Normal | Control charts, process capability, specification limits |
| `ClinicalTrialD3` | Clinical trial analysis and hypothesis testing | Binomial/Normal | Treatment effect visualization, p-value distribution, power analysis |
| `NetworkTrafficD3` | Network packet arrivals and queueing theory | Poisson | Queue visualization, packet flow, utilization metrics |
| `ManufacturingDefectsD3` | Analysis of manufacturing defects | Binomial | Acceptance sampling, OC curves, quality control metrics |

## Component Architecture

Each D3.js enhanced component follows a consistent architecture:

```
ApplicationSimulations
├── Component Selection
└── [Selected Component]
    ├── Parameter Controls
    │   └── Interactive Sliders/Inputs
    ├── D3.js Visualizations
    │   ├── Primary Chart
    │   ├── Secondary Visualization
    │   └── Animated Elements
    ├── Result Metrics
    │   └── Key Statistics Display
    └── Educational Content
        └── KaTeX Formulas
```

## Usage Examples

### Basic Integration

To use the enhanced simulation components in your application:

```jsx
import React, { useState } from 'react';
import { 
  EmailArrivalsD3, 
  QualityControlD3,
  ClinicalTrialD3,
  NetworkTrafficD3,
  ManufacturingDefectsD3 
} from './components/probability_distributions/simulations';

const StatisticalSimulations = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  return (
    <div>
      <h1>Statistical Simulations</h1>
      
      <EmailArrivalsD3
        projectId="project-123"
        setLoading={setLoading}
        setError={setError}
        setSimulationResult={setResult}
        result={result}
      />
      
      {/* Or any other simulation component */}
    </div>
  );
};
```

### Selecting Simulations Dynamically

You can also dynamically select which simulation to display:

```jsx
import { getSimulationComponent } from './components/probability_distributions/simulations';

const DynamicSimulation = ({ simulationType, ...props }) => {
  const SimulationComponent = getSimulationComponent(simulationType);
  
  return SimulationComponent ? (
    <SimulationComponent {...props} />
  ) : (
    <div>Simulation type not found</div>
  );
};
```

## Detailed Component Descriptions

### EmailArrivalsD3

Simulates email arrivals using the Poisson distribution to model the random arrival process.

**Key Features:**
- Adjustable arrival rate (λ) parameter
- Server capacity analysis
- Queue visualization for emails exceeding capacity
- Hourly and daily arrival pattern visualization
- Real-time email arrival animation
- Educational content on Poisson processes

**Educational Concepts:**
- Poisson distribution and its parameters
- Exponential inter-arrival times
- Queueing theory introduction
- Server capacity planning

### QualityControlD3

Visualizes manufacturing quality control using the Normal distribution to model process variation.

**Key Features:**
- Interactive process parameter controls (mean, standard deviation)
- Specification limit adjustment
- Control chart visualization with control limits
- Process capability indices calculation (Cp, Cpk)
- Defect rate estimation
- Interactive tolerance analysis

**Educational Concepts:**
- Normal distribution in manufacturing
- Statistical process control
- Control limits vs. specification limits
- Process capability and performance indices
- Six Sigma concepts

### ClinicalTrialD3

Simulates clinical trial outcomes using Binomial distribution and hypothesis testing.

**Key Features:**
- Sample size and effect size adjustment
- Treatment and control group visualization
- P-value calculation and visualization
- Power analysis
- Type I and Type II error visualization
- Study design simulation

**Educational Concepts:**
- Binomial distribution in clinical trials
- Hypothesis testing framework
- P-values and statistical significance
- Power and sample size determination
- Normal approximation to Binomial

### NetworkTrafficD3

Models network packet arrivals and queue behavior using Poisson distribution and queueing theory.

**Key Features:**
- Adjustable arrival and service rates
- Queue size visualization over time
- Buffer size control and packet loss simulation
- Utilization and throughput metrics
- Packet flow animation
- Real-time queueing simulation

**Educational Concepts:**
- M/M/1/K queueing model
- Little's Law
- Utilization and throughput relationship
- Packet loss probability
- Discrete event simulation

### ManufacturingDefectsD3

Analyzes manufacturing defects using the Binomial distribution and acceptance sampling plans.

**Key Features:**
- Defect rate and batch size controls
- Acceptance sampling plan design
- Operating Characteristic (OC) curve visualization
- Producer's and consumer's risk analysis
- Average Outgoing Quality (AOQ) calculation
- Interactive sampling demonstration

**Educational Concepts:**
- Binomial distribution for defects
- Acceptance sampling methodology
- Operating Characteristic curves
- Alpha and Beta risks
- Sampling plan design

## D3.js Implementation Details

Each simulation component uses D3.js for interactive visualizations with the following key techniques:

### 1. SVG-based Rendering

```javascript
// Example D3.js initialization with React ref
const chartRef = useRef(null);

useEffect(() => {
  if (!chartRef.current) return;
  
  // Create SVG container
  const svg = d3.select(chartRef.current)
    .attr("width", width)
    .attr("height", height);
    
  // Clear previous content
  svg.selectAll("*").remove();
  
  // Add visualization elements
  // ...
}, [data, width, height]);
```

### 2. Scales and Axes

```javascript
// Create scales
const xScale = d3.scaleLinear()
  .domain([0, maxX])
  .range([margin.left, width - margin.right]);
  
const yScale = d3.scaleLinear()
  .domain([0, maxY])
  .range([height - margin.bottom, margin.top]);

// Create and add axes
const xAxis = d3.axisBottom(xScale);
const yAxis = d3.axisLeft(yScale);

svg.append("g")
  .attr("transform", `translate(0,${height - margin.bottom})`)
  .call(xAxis);
  
svg.append("g")
  .attr("transform", `translate(${margin.left},0)`)
  .call(yAxis);
```

### 3. Data Visualization

```javascript
// Line chart for continuous data
const line = d3.line()
  .x((d, i) => xScale(xValues[i]))
  .y(d => yScale(d))
  .curve(d3.curveCatmullRom.alpha(0.5));
  
svg.append("path")
  .datum(yValues)
  .attr("fill", "none")
  .attr("stroke", "steelblue")
  .attr("stroke-width", 2)
  .attr("d", line);

// Bars for discrete data
svg.selectAll(".bar")
  .data(values)
  .enter()
  .append("rect")
  .attr("class", "bar")
  .attr("x", (d, i) => xScale(i))
  .attr("y", d => yScale(d))
  .attr("width", barWidth)
  .attr("height", d => height - margin.bottom - yScale(d))
  .attr("fill", "steelblue");
```

### 4. Animations and Transitions

```javascript
// Animate data change
svg.selectAll(".bar")
  .data(newData)
  .transition()
  .duration(750)
  .attr("y", d => yScale(d))
  .attr("height", d => height - margin.bottom - yScale(d));

// Animate line drawing
svg.select("path")
  .transition()
  .duration(1000)
  .attr("d", line(newData));
```

### 5. Interactive Elements

```javascript
// Add tooltip interaction
svg.selectAll(".bar")
  .on("mouseover", (event, d) => {
    tooltip.style("opacity", 1)
      .html(`Value: ${d.toFixed(4)}`)
      .style("left", `${event.pageX + 10}px`)
      .style("top", `${event.pageY - 20}px`);
  })
  .on("mouseout", () => {
    tooltip.style("opacity", 0);
  });

// Add draggable elements
const drag = d3.drag()
  .on("drag", (event) => {
    const x = Math.max(margin.left, Math.min(width - margin.right, event.x));
    d3.select(event.sourceEvent.target)
      .attr("cx", x);
    const value = xScale.invert(x);
    setThreshold(value);
  });

svg.append("circle")
  .attr("cx", xScale(threshold))
  .attr("cy", height / 2)
  .attr("r", 8)
  .attr("fill", "red")
  .call(drag);
```

## KaTeX Integration for Mathematical Formulas

The module uses KaTeX for rendering mathematical formulas, providing better performance and clarity:

```jsx
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

// In the component
<div className="formula-container">
  <h4>Poisson Probability Mass Function</h4>
  <BlockMath math={`P(X = k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}`} />
  
  <h4>Expected Value and Variance</h4>
  <div>
    Mean: <InlineMath math={`E[X] = \\lambda`} />
  </div>
  <div>
    Variance: <InlineMath math={`Var[X] = \\lambda`} />
  </div>
</div>
```

## Client-side Statistical Calculations

All simulation components perform calculations on the client side, reducing API dependencies:

```javascript
// Example: Poisson PMF calculation
const poissonPMF = (k, lambda) => {
  if (k < 0 || !Number.isInteger(k)) return 0;
  
  // Calculate lambda^k * e^(-lambda) / k!
  // Use logarithms for numerical stability with large values
  const logResult = k * Math.log(lambda) - lambda - logFactorial(k);
  return Math.exp(logResult);
};

// Factorial using logarithms for numerical stability
const logFactorial = (n) => {
  if (n === 0 || n === 1) return 0;
  let result = 0;
  for (let i = 2; i <= n; i++) {
    result += Math.log(i);
  }
  return result;
};
```

## Responsive Design

All simulation components are designed to be responsive across different devices:

```jsx
// Responsive size handling
const [dimensions, setDimensions] = useState({
  width: window.innerWidth > 960 ? 800 : window.innerWidth - 40,
  height: 400
});

// Update dimensions on window resize
useEffect(() => {
  const handleResize = () => {
    setDimensions({
      width: window.innerWidth > 960 ? 800 : window.innerWidth - 40,
      height: 400
    });
  };
  
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

// Pass dimensions to D3 visualization
<svg 
  ref={chartRef}
  width={dimensions.width}
  height={dimensions.height}
/>
```

## Testing

Each D3.js enhanced component has corresponding test files:

```javascript
// Example test for EmailArrivalsD3 component
import { render, screen, fireEvent } from '@testing-library/react';
import EmailArrivalsD3 from '../components/probability_distributions/simulations/EmailArrivalsD3';

// Mock D3 and other dependencies
jest.mock('d3', () => ({
  select: jest.fn(() => ({
    attr: jest.fn().mockReturnThis(),
    style: jest.fn().mockReturnThis(),
    append: jest.fn().mockReturnThis(),
    // Other D3 methods...
  })),
  // Other D3 functions...
}));

describe('EmailArrivalsD3 Component', () => {
  test('renders correctly with default props', () => {
    render(<EmailArrivalsD3 />);
    expect(screen.getByText(/Email Arrivals Simulation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Arrival Rate/i)).toBeInTheDocument();
  });
  
  test('updates simulation when parameters change', () => {
    render(<EmailArrivalsD3 />);
    const arrivalRateInput = screen.getByLabelText(/Arrival Rate/i);
    fireEvent.change(arrivalRateInput, { target: { value: 20 } });
    // Assert expected behavior...
  });
  
  // Additional tests...
});
```

## Future Enhancements

Planned enhancements for the D3.js visualization components:

1. **Visualization Export**: Add ability to export visualizations as SVG/PNG files
2. **Additional Simulations**: More real-world applications of probability distributions
3. **Performance Optimization**: Further optimize D3.js visualizations for large datasets
4. **Accessibility Improvements**: Enhanced keyboard navigation and screen reader support
5. **Advanced Animations**: More sophisticated animations for educational purposes
6. **Mobile Touch Interactions**: Better touch interactions for mobile devices
7. **WebGL Integration**: 3D visualizations for certain distributions and applications
8. **Custom Distribution Builder**: Interface for creating and visualizing custom distributions

## Technical Requirements

- React 18+
- D3.js 7.x
- KaTeX 0.16+
- Material UI 5.x
- Modern browser with ES6 support

## Contribution Guidelines

If you'd like to contribute to the probability distributions module:

1. Follow the existing code style and component patterns
2. Ensure all components have corresponding test files
3. Document new components in this README
4. Optimize visualizations for performance and responsiveness
5. Maintain educational focus with clear explanations and formulas
6. Support responsive design for all screen sizes

## Credits

D3.js enhanced probability distributions module developed for StickForStats statistical analysis platform.

## License

This module is part of the StickForStats platform and is covered by the same license as the main project.