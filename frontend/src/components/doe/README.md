# Design of Experiments (DOE) Module

## Overview

The Design of Experiments (DOE) module provides a comprehensive set of tools for designing, analyzing, and optimizing experimental designs in biotechnology and pharmaceutical applications. This React implementation migrates and enhances the original Streamlit-based DOE module with improved interactivity, real-time updates, and responsive design.

## Directory Structure

```
doe/
├── DoePage.jsx               # Main container component
├── Introduction.jsx          # Educational content on DOE introduction
├── Fundamentals.jsx          # Fundamentals of DOE concepts
├── DesignTypes.jsx           # Different types of experimental designs
├── Analysis.jsx              # Analysis and interpretation of results
├── CaseStudies.jsx           # Real-world DOE application examples
├── DesignBuilder.jsx         # Interactive design builder tool
├── visualizations/           # Visualization components
│   ├── DesignMatrix.jsx      # Design matrix visualization
│   ├── DesignBuilder3D.jsx   # 3D design space visualization
│   ├── EffectPlot.jsx        # Main effects visualization
│   ├── InteractionPlot.jsx   # Interaction effects visualization
│   ├── ResponseSurfacePlot.jsx # 3D response surface visualization
│   ├── ContourPlot.jsx       # 2D contour plot visualization
│   ├── ResidualDiagnostics.jsx # Diagnostic plots for model validation
│   └── ResponsiveDesignMatrix.jsx # Responsive design matrix
├── utils/                    # Utility functions and components
│   ├── ResponsiveDoePage.jsx # Responsive page wrapper
│   ├── ResponsiveUtils.jsx   # Responsive design utilities
│   ├── responsiveStyles.js   # Responsive style utilities
│   └── index.js              # Exports utility functions
├── DOEWebSocketIntegration.jsx # WebSocket integration for real-time updates
├── ProgressTracker.jsx       # Progress tracking for long-running operations
└── README.md                 # This documentation file
```

## Key Components

### Page Components

- **DoePage**: Main container component with tab navigation
- **Introduction**: Educational content on DOE introduction
- **Fundamentals**: Interactive explanation of DOE fundamentals
- **DesignTypes**: Showcase of different experimental design types
- **Analysis**: Tools for analyzing and interpreting results
- **CaseStudies**: Real-world examples of DOE applications
- **DesignBuilder**: Interactive tool for creating custom experimental designs

### Visualization Components

- **DesignMatrix**: Tabular visualization of the experimental design
- **DesignBuilder3D**: 3D visualization of the design space
- **EffectPlot**: Bar chart visualization of main effects
- **InteractionPlot**: Line plot visualization of factor interactions
- **ResponseSurfacePlot**: 3D surface plot of the response model
- **ContourPlot**: 2D contour plot of the response model
- **ResidualDiagnostics**: Diagnostic plots for model validation

### Integration Components

- **DOEWebSocketIntegration**: Manages WebSocket connections for real-time updates
- **ProgressTracker**: Displays progress for long-running operations

### Responsive Utilities

- **ResponsiveDoePage**: Responsive page wrapper with adaptive layout
- **ResponsiveUtils**: Hooks and components for responsive design
- **responsiveStyles**: Style utilities for responsive layouts

## Key Features

1. **Interactive Design Builder**:
   - Factor and response definition
   - Multiple design types (factorial, fractional factorial, response surface)
   - Design matrix generation and visualization
   - Data entry and validation

2. **Real-time Analysis**:
   - WebSocket integration for long-running operations
   - Progress tracking and notifications
   - Incremental result delivery

3. **Interactive Visualizations**:
   - 2D and 3D design space visualization
   - Effect plots, interaction plots, and residual diagnostics
   - Response surface and contour plot visualization

4. **Educational Content**:
   - Interactive examples and simulations
   - Case studies with real-world applications
   - Step-by-step guides and explanations

5. **Responsive Design**:
   - Optimized for mobile, tablet, and desktop screens
   - Adaptive layout and navigation
   - Appropriate visualizations for different screen sizes

## Usage

### Basic Page Integration

```jsx
import { DoePage } from './components/doe';

function App() {
  return (
    <div className="App">
      <DoePage />
    </div>
  );
}
```

### Using the Design Builder

```jsx
import { DesignBuilder } from './components/doe';

function ExperimentPage() {
  return (
    <div className="ExperimentPage">
      <h1>Create Experiment</h1>
      <DesignBuilder />
    </div>
  );
}
```

### Using Visualization Components

```jsx
import { EffectPlot, InteractionPlot } from './components/doe/visualizations';

function ResultsPage({ data }) {
  return (
    <div className="ResultsPage">
      <h1>Results</h1>
      <EffectPlot data={data.effects} />
      <InteractionPlot data={data.interactions} />
    </div>
  );
}
```

### Using Responsive Utilities

```jsx
import { useIsMobile, ResponsiveGrid } from './components/doe/utils';

function ResponsivePage() {
  const isMobile = useIsMobile();
  
  return (
    <div className="ResponsivePage">
      <h1>{isMobile ? 'Mobile View' : 'Desktop View'}</h1>
      <ResponsiveGrid
        mobileColumns={1}
        tabletColumns={2}
        desktopColumns={3}
      >
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </ResponsiveGrid>
    </div>
  );
}
```

## API Integration

The DOE module communicates with the backend through a set of API functions defined in `doeService.js`. Key functions include:

- `createExperiment(experimentData)`: Create a new DOE experiment
- `generateDesign(experimentId, designParams)`: Generate a design matrix
- `analyzeDesign(analysisParams)`: Analyze experimental results
- `fetchOptimizationResults(designId, responseVar, modelType)`: Get optimization results

Real-time operations are handled through WebSocket connections, providing progress updates and incremental results.

## Styling

The DOE module uses Material-UI for styling, with custom responsive styles defined in `responsiveStyles.js`. Key styling patterns include:

- **Responsive layouts**: Using Grid and Box components with responsive breakpoints
- **Adaptive typography**: Using responsive font sizes and spacing
- **Component density**: Adjusting component density based on screen size
- **Visualization sizing**: Adapting visualizations to available screen space

## Performance Considerations

The DOE module includes several performance optimizations:

1. **Memoization**: Using React.memo and useMemo for expensive computations
2. **Lazy loading**: Using React.lazy and Suspense for code splitting
3. **Virtualization**: Using virtualized lists for large data sets
4. **Throttling**: Debouncing input handlers for real-time updates
5. **Incremental processing**: Breaking long operations into chunks with progress tracking

## Testing

The DOE module includes comprehensive tests in the `__tests__` directory. Key testing strategies include:

1. **Component tests**: Testing individual components with React Testing Library
2. **Integration tests**: Testing component interactions with user event simulation
3. **Service tests**: Testing API integration with mock fetch responses
4. **WebSocket tests**: Testing real-time updates with mock WebSocket servers

## Credits

The DOE module is part of the StickForStats platform, developed for biotechnology and pharmaceutical applications. It builds on the original Streamlit implementation, with enhanced features and improved user experience.

## License

See the LICENSE file in the root directory for licensing information.