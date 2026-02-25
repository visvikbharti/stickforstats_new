import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
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

const theme = createTheme();

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('EffectPlot Component', () => {
  const mockData = [
    { factor: 'Temperature', effect: -52.3, pValue: 0.0023, lowerCI: -70.1, upperCI: -34.5 },
    { factor: 'pH', effect: 27.8, pValue: 0.0156, lowerCI: 5.9, upperCI: 49.7 },
    { factor: 'Time', effect: 8.4, pValue: 0.0972, lowerCI: -1.5, upperCI: 18.3 },
    { factor: 'Concentration', effect: -15.6, pValue: 0.0456, lowerCI: -30.9, upperCI: -0.3 }
  ];

  test('renders without crashing', () => {
    renderWithTheme(<EffectPlot data={mockData} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  test('displays title correctly', () => {
    renderWithTheme(<EffectPlot data={mockData} />);
    expect(screen.getByText('Factor Effects')).toBeInTheDocument();
  });

  test('renders bar chart components', () => {
    renderWithTheme(<EffectPlot data={mockData} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });

  test('renders sort dropdown', () => {
    renderWithTheme(<EffectPlot data={mockData} />);
    expect(screen.getByLabelText('Sort By')).toBeInTheDocument();
  });

  test('shows no data message when data is null', () => {
    renderWithTheme(<EffectPlot data={null} />);
    expect(screen.getByText(/No effect data available/i)).toBeInTheDocument();
  });

  test('shows no data message when data is empty array', async () => {
    renderWithTheme(<EffectPlot data={[]} />);
    await waitFor(() => {
      expect(screen.getByText(/No effect data found/i)).toBeInTheDocument();
    });
  });

  test('renders reference lines for significance threshold', () => {
    renderWithTheme(<EffectPlot data={mockData} />);
    const referenceLines = screen.getAllByTestId('reference-line');
    expect(referenceLines.length).toBeGreaterThanOrEqual(1);
  });

  test('renders legend and cartesian grid', () => {
    renderWithTheme(<EffectPlot data={mockData} />);
    expect(screen.getByTestId('legend')).toBeInTheDocument();
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
  });

  test('renders with custom options', () => {
    renderWithTheme(
      <EffectPlot
        data={mockData}
        options={{ significanceThreshold: 0.1 }}
      />
    );
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});
