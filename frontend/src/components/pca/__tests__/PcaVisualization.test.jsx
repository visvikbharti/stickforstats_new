import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Mock notistack before importing components
jest.mock('notistack', () => ({
  useSnackbar: () => ({
    enqueueSnackbar: jest.fn(),
    closeSnackbar: jest.fn(),
  }),
  SnackbarProvider: ({ children }) => children,
}));

// Mock lazy visualization components to avoid d3 ESM issues
jest.mock('../LazyVisualizationComponents', () => ({
  ScatterPlot2D: (props) => (
    <div data-testid="scatter-2d">
      Scatter 2D: PC{props.xComponent} vs PC{props.yComponent}
    </div>
  ),
  ScatterPlot3D: (props) => (
    <div data-testid="scatter-3d">Scatter 3D</div>
  ),
  LoadingPlot: (props) => (
    <div data-testid="loading-plot">Loading Plot</div>
  ),
  GeneContributionPlot: (props) => (
    <div data-testid="gene-contribution">
      Gene Contribution
      <div>Top genes to highlight</div>
    </div>
  ),
  ScreePlot: (props) => (
    <div data-testid="scree-plot">Scree Plot</div>
  ),
  PlotContainer: ({ children, ...props }) => (
    <div data-testid="plot-container">{children}</div>
  ),
}));

// Mock the api
jest.mock('../../../api/pcaApi', () => ({
  fetchPcaVisualizationData: jest.fn(),
}));

// Mock save-svg-as-png
jest.mock('save-svg-as-png', () => ({
  saveSvgAsPng: jest.fn(),
}));

// Mock WebSocket
let mockWsInstance;
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1;
    mockWsInstance = this;
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }
  send() {}
  close() {}
};
global.WebSocket.OPEN = 1;

import PcaVisualization from '../PcaVisualization';
import * as pcaApi from '../../../api/pcaApi';

// Sample mock data
const mockVisualizationData = {
  sample_data: [
    { sample_id: 'Sample1', group: 'Group1', pc1: 0.1, pc2: 0.5, pc3: -0.2 },
    { sample_id: 'Sample2', group: 'Group1', pc1: 0.3, pc2: 0.2, pc3: 0.1 },
    { sample_id: 'Sample3', group: 'Group2', pc1: -0.2, pc2: -0.3, pc3: 0.4 },
    { sample_id: 'Sample4', group: 'Group2', pc1: -0.4, pc2: -0.1, pc3: 0.3 },
  ],
  gene_loadings: [
    { gene_name: 'Gene1', pc1_loading: 0.8, pc2_loading: 0.1, pc3_loading: 0.05 },
    { gene_name: 'Gene2', pc1_loading: -0.7, pc2_loading: 0.2, pc3_loading: 0.1 },
    { gene_name: 'Gene3', pc1_loading: 0.1, pc2_loading: 0.75, pc3_loading: 0.15 },
    { gene_name: 'Gene4', pc1_loading: 0.05, pc2_loading: -0.65, pc3_loading: 0.2 },
    { gene_name: 'Gene5', pc1_loading: 0.15, pc2_loading: 0.1, pc3_loading: 0.7 },
  ],
  explained_variance: [35.2, 25.4, 15.7, 10.2, 5.6],
  cumulative_variance: [35.2, 60.6, 76.3, 86.5, 92.1],
  group_centroids: {
    'Group1': { PC1: 0.2, PC2: 0.35, PC3: -0.05 },
    'Group2': { PC1: -0.3, PC2: -0.2, PC3: 0.35 },
  }
};

// Create a theme for testing
const theme = createTheme();

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('PcaVisualization Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pcaApi.fetchPcaVisualizationData.mockResolvedValue(mockVisualizationData);
  });

  test('renders and fetches data on mount', async () => {
    renderWithTheme(<PcaVisualization projectId="test-project" resultId="test-result" />);

    // Component triggers data fetch on mount
    await waitFor(() => {
      expect(pcaApi.fetchPcaVisualizationData).toHaveBeenCalled();
    });

    expect(screen.getByText(/PCA Visualization/i)).toBeInTheDocument();
  });

  test('loads and displays PCA visualization data', async () => {
    renderWithTheme(<PcaVisualization projectId="test-project" resultId="test-result" />);

    await waitFor(() => {
      expect(pcaApi.fetchPcaVisualizationData).toHaveBeenCalledWith(
        'test-result',
        expect.objectContaining({
          plot_type: '2D',
          x_component: 1,
          y_component: 2
        })
      );
    });

    expect(screen.getByText(/PCA Visualization/i)).toBeInTheDocument();

    expect(screen.getByRole('tab', { name: /PCA Plot/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Loading Plot/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Gene Contribution/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Scree Plot/i })).toBeInTheDocument();
  });

  test('allows switching between visualization tabs', async () => {
    renderWithTheme(<PcaVisualization projectId="test-project" resultId="test-result" />);

    await waitFor(() => {
      expect(pcaApi.fetchPcaVisualizationData).toHaveBeenCalled();
    });

    // Wait for tabs to be available
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /PCA Plot/i })).toBeInTheDocument();
    });

    // Verify all tabs exist
    expect(screen.getByRole('tab', { name: /PCA Plot/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Loading Plot/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Gene Contribution/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Scree Plot/i })).toBeInTheDocument();

    // Click on Scree Plot tab (doesn't trigger a data refetch)
    fireEvent.click(screen.getByRole('tab', { name: /Scree Plot/i }));

    // Tabs should still be visible
    expect(screen.getByRole('tab', { name: /Scree Plot/i })).toBeInTheDocument();
  });

  test('updates visualization settings correctly', async () => {
    renderWithTheme(<PcaVisualization projectId="test-project" resultId="test-result" />);

    await waitFor(() => {
      expect(pcaApi.fetchPcaVisualizationData).toHaveBeenCalled();
    });

    // Change plot type to 3D
    fireEvent.mouseDown(screen.getByLabelText(/Plot Type/i));
    fireEvent.click(screen.getByRole('option', { name: /3D Plot/i }));

    // Change x-axis component
    fireEvent.mouseDown(screen.getByLabelText(/X-Axis/i));
    fireEvent.click(screen.getByRole('option', { name: /PC2/i }));

    await waitFor(() => {
      expect(pcaApi.fetchPcaVisualizationData).toHaveBeenCalledWith(
        'test-result',
        expect.objectContaining({
          plot_type: '3D',
          x_component: 2
        })
      );
    });
  });

  test('handles errors correctly', async () => {
    pcaApi.fetchPcaVisualizationData.mockRejectedValue(new Error('Failed to load data'));

    renderWithTheme(<PcaVisualization projectId="test-project" resultId="test-result" />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load visualization: Failed to load data/i)).toBeInTheDocument();
    });
  });
});
