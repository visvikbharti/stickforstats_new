# Testing Strategy for D3.js Simulation Components

This document outlines the comprehensive testing strategy for the D3.js enhanced simulation components in the probability distributions module.

## Testing Layers

We employ a multi-layered testing approach to ensure reliability across all components:

1. **Unit Tests**: Testing individual functions and components in isolation
2. **Component Tests**: Testing component rendering and interactions
3. **Integration Tests**: Testing how components work together
4. **End-to-End Tests**: Testing full user workflows in a browser environment

## Testing Tools

- **Jest**: For unit and component testing
- **React Testing Library**: For component testing
- **Cypress**: For end-to-end testing

## Key Testing Considerations for D3.js Components

### 1. D3.js Integration

D3.js integration requires special consideration for testing:

- **DOM Manipulation**: D3.js directly manipulates the DOM
- **SVG Elements**: Testing SVG elements rendered by D3.js
- **Animation Testing**: Testing transitions and animations
- **Events Handling**: Testing D3.js event handlers

### 2. Data-Testid Attributes

All components should include data-testid attributes for consistent test selection:

| Component Area | Data-Testid Pattern |
|---------------|---------------------|
| Main container | `[component-name]-container` |
| Parameter controls | `[component-name]-parameters` |
| Charts/visualizations | `[component-name]-chart`, `[specific-chart]-chart` |
| Sliders | `[parameter-name]-slider` |
| Buttons | `[action-name]-button` |
| Result displays | `[metric-name]-metric`, `[result-type]-display` |
| Educational sections | `educational-content`, `[topic-name]-section` |

Example for EmailArrivalsD3:
```jsx
<Box data-testid="email-arrivals-container">
  <Box data-testid="email-arrivals-parameters">
    <Slider data-testid="arrival-rate-slider" />
    <Button data-testid="run-simulation-button">Run Simulation</Button>
  </Box>
  <svg data-testid="email-arrivals-chart" ref={chartRef}></svg>
  <Box data-testid="simulation-metrics">
    <Typography data-testid="arrivals-count">Arrivals: {count}</Typography>
  </Box>
</Box>
```

### 3. Jest Unit Tests

Unit tests focus on the pure calculation functions:

```javascript
// Example unit test for Poisson PMF calculation
describe('poissonPMF', () => {
  test('should calculate correct probabilities', () => {
    expect(poissonPMF(0, 1)).toBeCloseTo(0.368, 3);
    expect(poissonPMF(1, 1)).toBeCloseTo(0.368, 3);
    expect(poissonPMF(2, 1)).toBeCloseTo(0.184, 3);
  });
  
  test('should handle edge cases', () => {
    expect(poissonPMF(0, 0)).toBe(1);
    expect(poissonPMF(-1, 1)).toBe(0);
  });
});
```

### 4. Component Tests

Component tests verify rendering and basic interactions:

```javascript
// Mock D3 for component tests
jest.mock('d3', () => ({
  select: jest.fn(() => ({
    attr: jest.fn().mockReturnThis(),
    style: jest.fn().mockReturnThis(),
    append: jest.fn().mockReturnThis(),
    // Other methods...
  })),
  // Other functions...
}));

// Example component test
test('should render with default parameters', () => {
  render(<EmailArrivalsD3 />);
  
  expect(screen.getByTestId('email-arrivals-container')).toBeInTheDocument();
  expect(screen.getByTestId('arrival-rate-slider')).toBeInTheDocument();
  expect(screen.getByTestId('run-simulation-button')).toBeInTheDocument();
});

test('should update when parameters change', () => {
  render(<EmailArrivalsD3 />);
  
  // Simulate parameter change
  fireEvent.change(screen.getByTestId('arrival-rate-slider'), { target: { value: 20 } });
  fireEvent.click(screen.getByTestId('run-simulation-button'));
  
  // Check for updated display
  expect(screen.getByTestId('arrivals-count')).toHaveTextContent(/\d+/);
});
```

### 5. D3.js Specific Tests

For D3.js visualizations, test the rendering functions separately:

```javascript
test('should call D3 methods to render visualization', () => {
  // Mock D3 select
  const mockSelect = jest.fn().mockReturnValue({
    attr: jest.fn().mockReturnThis(),
    style: jest.fn().mockReturnThis(),
    append: jest.fn().mockReturnThis(),
    // Other methods...
  });
  
  d3.select = mockSelect;
  
  // Create a div for the test
  const div = document.createElement('div');
  
  // Call the rendering function directly
  renderChart(div, testData);
  
  // Verify D3 methods were called
  expect(mockSelect).toHaveBeenCalled();
  expect(mockSelect().append).toHaveBeenCalledWith('svg');
  // Other assertions...
});
```

### 6. Cypress End-to-End Tests

Cypress tests focus on complete user workflows:

```javascript
// Example Cypress test
it('should display Email Arrivals simulation with D3.js visualizations', () => {
  // Visit the simulations page
  cy.visit('/probability-distributions/simulations');
  
  // Select Email Arrivals simulation
  cy.contains('Email Arrivals (Poisson)').click();
  
  // Verify visualization is displayed
  cy.get('[data-testid="email-arrivals-chart"]').should('be.visible');
  
  // Change a parameter
  cy.get('[data-testid="arrival-rate-slider"]')
    .invoke('val', 25)
    .trigger('change');
  
  // Run simulation
  cy.get('[data-testid="run-simulation-button"]').click();
  
  // Verify results updated
  cy.get('[data-testid="arrivals-count"]').should('contain.text');
});
```

## Test Implementation Plan

For each simulation component:

1. Add data-testid attributes to all testable elements
2. Create unit tests for calculation functions
3. Create component tests for rendering and interactions
4. Include specific tests for D3.js visualizations
5. Add Cypress end-to-end tests for user workflows

## Test Coverage Goals

- **Unit Tests**: 90%+ coverage of calculation functions
- **Component Tests**: 80%+ coverage of component rendering and state updates
- **End-to-End Tests**: Cover all major user workflows

## Common Test Scenarios

For each simulation component, test:

1. **Initial Rendering**: Component renders with default parameters
2. **Parameter Changes**: UI updates when parameters change
3. **Calculation Accuracy**: Results match expected values
4. **Visualization Updates**: D3.js visualizations update correctly
5. **Educational Content**: Educational content is displayed correctly
6. **Interactive Features**: Interactive elements work as expected
7. **Responsiveness**: Component adapts to different screen sizes
8. **Error Handling**: Component handles invalid inputs gracefully

## Implementation Schedule

1. **Phase 1**: Add data-testid attributes to all components
2. **Phase 2**: Implement unit tests for calculations
3. **Phase 3**: Implement component tests
4. **Phase 4**: Implement Cypress end-to-end tests
5. **Phase 5**: Achieve coverage goals and fix any issues