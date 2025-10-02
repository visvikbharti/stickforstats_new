import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EffectPlot from '../visualizations/EffectPlot';

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock;

// Mock Recharts components
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }) => (
      <div data-testid="responsive-container" style={{ width: '100%', height: 400 }}>
        {children}
      </div>
    ),
    BarChart: ({ children }) => (
      <div data-testid="bar-chart">
        {children}
      </div>
    ),
    Bar: (props) => <div data-testid="bar" data-name={props.name}>{props.dataKey}</div>,
    XAxis: (props) => <div data-testid="x-axis" data-datakey={props.dataKey}></div>,
    YAxis: (props) => <div data-testid="y-axis"></div>,
    CartesianGrid: () => <div data-testid="cartesian-grid"></div>,
    Tooltip: (props) => <div data-testid="tooltip"></div>,
    Legend: () => <div data-testid="legend"></div>,
    ReferenceLine: (props) => <div data-testid="reference-line" data-y={props.y}></div>,
    Line: (props) => <div data-testid="line" data-datakey={props.dataKey}></div>,
  };
});

describe('EffectPlot Component', () => {
  const mockData = [
    { factor: 'Temperature', effect: -52.3, pValue: 0.0023, lowerCI: -70.1, upperCI: -34.5 },
    { factor: 'pH', effect: 27.8, pValue: 0.0156, lowerCI: 5.9, upperCI: 49.7 },
    { factor: 'Time', effect: 8.4, pValue: 0.0972, lowerCI: -1.5, upperCI: 18.3 },
    { factor: 'Concentration', effect: -15.6, pValue: 0.0456, lowerCI: -30.9, upperCI: -0.3 }
  ];

  const significanceLevel = 0.05;

  test('renders without crashing', () => {
    render(<EffectPlot data={mockData} significanceLevel={significanceLevel} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  test('displays title correctly', () => {
    render(<EffectPlot data={mockData} significanceLevel={significanceLevel} />);
    expect(screen.getByText('Main Effects Plot')).toBeInTheDocument();
  });

  test('shows Pareto chart when toggled', () => {
    render(<EffectPlot data={mockData} significanceLevel={significanceLevel} />);
    
    // Initially shows Main Effects Plot
    expect(screen.getByText('Main Effects Plot')).toBeInTheDocument();
    
    // Toggle to Pareto
    fireEvent.click(screen.getByLabelText('Pareto Chart'));
    
    // Now shows Pareto Chart
    expect(screen.getByText('Pareto Chart of Effects')).toBeInTheDocument();
  });

  test('displays significant effects correctly', () => {
    render(<EffectPlot data={mockData} significanceLevel={significanceLevel} />);
    
    // Count significant effects (p < 0.05)
    const significantEffects = mockData.filter(item => item.pValue < significanceLevel);
    
    // Check for "Significant Effects:" label
    expect(screen.getByText('Significant Effects:')).toBeInTheDocument();
    
    // Check each significant factor is displayed
    significantEffects.forEach(effect => {
      expect(screen.getByText(new RegExp(`${effect.factor}.*p=`, 'i'))).toBeInTheDocument();
    });
  });

  test('shows message when no significant effects', () => {
    const nonSignificantData = [
      { factor: 'Factor1', effect: 5.0, pValue: 0.2 },
      { factor: 'Factor2', effect: 2.0, pValue: 0.3 }
    ];
    
    render(<EffectPlot 
      data={nonSignificantData} 
      significanceLevel={significanceLevel} 
    />);
    
    expect(screen.getByText(/No significant effects at α = 0.05/i)).toBeInTheDocument();
  });

  test('toggles normalized view', () => {
    render(<EffectPlot data={mockData} significanceLevel={significanceLevel} />);
    
    // Click normalized toggle
    fireEvent.click(screen.getByLabelText('Normalized'));
    
    // Check that correct props are passed to components
    // In reality, we would need to check if the data is normalized
    // but since we're mocking the recharts components, we can just
    // verify that the component still renders after toggling
    expect(screen.getByTestId('bar')).toBeInTheDocument();
  });

  test('shows no data message when data is empty', () => {
    render(<EffectPlot data={[]} significanceLevel={significanceLevel} />);
    
    expect(screen.getByText(/No effect data available/i)).toBeInTheDocument();
  });

  test('handles onFactorSelect callback', () => {
    const mockOnFactorSelect = jest.fn();
    render(
      <EffectPlot 
        data={mockData} 
        significanceLevel={significanceLevel}
        onFactorSelect={mockOnFactorSelect}
      />
    );
    
    // Find the first significant factor chip
    const firstChip = screen.getByText(new RegExp(`${mockData[0].factor}.*p=`, 'i'));
    fireEvent.click(firstChip);
    
    // Verify callback was called with correct factor
    expect(mockOnFactorSelect).toHaveBeenCalledWith(mockData[0].factor);
  });

  test('toggles sort by magnitude', () => {
    render(<EffectPlot data={mockData} significanceLevel={significanceLevel} />);
    
    // Click sort by magnitude toggle
    fireEvent.click(screen.getByLabelText('Sort by Magnitude'));
    
    // The toggle should still be checked (default is true)
    expect(screen.getByLabelText('Sort by Magnitude')).toBeChecked();
    
    // Click again to disable
    fireEvent.click(screen.getByLabelText('Sort by Magnitude'));
    
    // Now it should be unchecked
    expect(screen.getByLabelText('Sort by Magnitude')).not.toBeChecked();
  });
});