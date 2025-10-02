import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PcaVisualization from '../PcaVisualization';
import * as pcaApi from '../../../api/pcaApi';

// Mock the api
jest.mock('../../../api/pcaApi', () => ({
  fetchPcaVisualizationData: jest.fn(),
}));

// Mock the svg-as-png library
jest.mock('save-svg-as-png', () => ({
  saveSvgAsPng: jest.fn(),
}));

// Mock the WebSocket
global.WebSocket = class {
  constructor(url) {
    this.url = url;
    this.readyState = WebSocket.OPEN;
    setTimeout(() => {
      if (this.onopen) {
        this.onopen();
      }
    }, 0);
  }

  send() {}
  close() {}

  static OPEN = 1;
};

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

// Helper function to render component with theme
const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('PcaVisualization Component', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock the API response
    pcaApi.fetchPcaVisualizationData.mockResolvedValue(mockVisualizationData);
  });

  test('renders loading state initially', () => {
    renderWithTheme(<PcaVisualization projectId="test-project" resultId="test-result" />);
    
    expect(screen.getByText(/Loading visualization data.../i)).toBeInTheDocument();
  });

  test('loads and displays PCA visualization data', async () => {
    renderWithTheme(<PcaVisualization projectId="test-project" resultId="test-result" />);
    
    // Wait for data to load
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
    
    // Check for visualization heading
    expect(screen.getByText(/PCA Visualization/i)).toBeInTheDocument();
    
    // Check for plot tabs
    expect(screen.getByRole('tab', { name: /PCA Plot/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Loading Plot/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Gene Contribution/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Scree Plot/i })).toBeInTheDocument();
  });

  test('allows switching between visualization tabs', async () => {
    renderWithTheme(<PcaVisualization projectId="test-project" resultId="test-result" />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(pcaApi.fetchPcaVisualizationData).toHaveBeenCalled();
    });
    
    // Click on Loading Plot tab
    fireEvent.click(screen.getByRole('tab', { name: /Loading Plot/i }));
    
    // Click on Gene Contribution tab
    fireEvent.click(screen.getByRole('tab', { name: /Gene Contribution/i }));
    
    // Check for gene-specific content in gene contribution tab
    await waitFor(() => {
      expect(screen.getByText(/Top genes to highlight/i)).toBeInTheDocument();
    });
    
    // Click on Scree Plot tab
    fireEvent.click(screen.getByRole('tab', { name: /Scree Plot/i }));
  });

  test('updates visualization settings correctly', async () => {
    renderWithTheme(<PcaVisualization projectId="test-project" resultId="test-result" />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(pcaApi.fetchPcaVisualizationData).toHaveBeenCalled();
    });
    
    // Change plot type to 3D
    fireEvent.mouseDown(screen.getByLabelText(/Plot Type/i));
    fireEvent.click(screen.getByRole('option', { name: /3D Plot/i }));
    
    // Change x-axis component
    fireEvent.mouseDown(screen.getByLabelText(/X-Axis/i));
    fireEvent.click(screen.getByRole('option', { name: /PC2/i }));
    
    // Verify API was called with updated settings
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

  test('handles WebSocket updates correctly', async () => {
    renderWithTheme(<PcaVisualization projectId="test-project" resultId="test-result" />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(pcaApi.fetchPcaVisualizationData).toHaveBeenCalled();
    });
    
    // Simulate WebSocket message
    const wsInstance = document.querySelectorAll('div')[0].__events.open[0];
    wsInstance();
    
    // Simulate a WebSocket message with update notification
    const messageEvent = {
      data: JSON.stringify({
        type: 'update_visualization',
        message: 'New visualization data available'
      })
    };
    
    document.querySelectorAll('div')[0].__events.message[0](messageEvent);
    
    // Verify the notification appears
    await waitFor(() => {
      expect(screen.getByText(/New visualization data available/i)).toBeInTheDocument();
    });
  });

  test('handles errors correctly', async () => {
    // Mock API error
    pcaApi.fetchPcaVisualizationData.mockRejectedValue(new Error('Failed to load data'));
    
    renderWithTheme(<PcaVisualization projectId="test-project" resultId="test-result" />);
    
    // Verify error is displayed
    await waitFor(() => {
      expect(screen.getByText(/Failed to load visualization: Failed to load data/i)).toBeInTheDocument();
    });
  });
});