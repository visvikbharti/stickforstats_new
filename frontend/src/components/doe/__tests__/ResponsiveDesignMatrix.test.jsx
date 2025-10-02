import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ResponsiveDesignMatrix from '../visualizations/ResponsiveDesignMatrix';
import * as ResponsiveUtils from '../utils/ResponsiveUtils';

// Mock the responsive utilities
jest.mock('../utils/ResponsiveUtils', () => ({
  MobileOnly: ({ children }) => <div data-testid="mobile-view">{children}</div>,
  TabletOnly: ({ children }) => <div data-testid="tablet-view">{children}</div>,
  DesktopOnly: ({ children }) => <div data-testid="desktop-view">{children}</div>,
  useIsMobile: jest.fn()
}));

describe('ResponsiveDesignMatrix Component', () => {
  const mockDesignMatrix = [
    { 
      runOrder: 1, 
      stdOrder: 1, 
      Temperature_coded: -1, 
      IPTG_coded: -1, 
      OD600_coded: -1,
      Temperature_natural: 25,
      IPTG_natural: 0.1,
      OD600_natural: 0.6,
      "Protein Yield": 120.5
    },
    { 
      runOrder: 2, 
      stdOrder: 2, 
      Temperature_coded: 1, 
      IPTG_coded: -1, 
      OD600_coded: -1,
      Temperature_natural: 37,
      IPTG_natural: 0.1,
      OD600_natural: 0.6,
      "Protein Yield": 95.2
    },
    { 
      runOrder: 3, 
      stdOrder: 3, 
      Temperature_coded: -1, 
      IPTG_coded: 1, 
      OD600_coded: -1,
      Temperature_natural: 25,
      IPTG_natural: 1.0,
      OD600_natural: 0.6,
      "Protein Yield": 155.3
    },
    { 
      runOrder: 4, 
      stdOrder: 4, 
      Temperature_coded: 1, 
      IPTG_coded: 1, 
      OD600_coded: -1,
      Temperature_natural: 37,
      IPTG_natural: 1.0,
      OD600_natural: 0.6,
      "Protein Yield": 110.8
    }
  ];
  
  const mockFactors = [
    { name: 'Temperature', low: 25, high: 37, units: '°C' },
    { name: 'IPTG', low: 0.1, high: 1.0, units: 'mM' },
    { name: 'OD600', low: 0.6, high: 1.2, units: '' }
  ];
  
  const mockResponses = [
    { name: 'Protein Yield', units: 'mg/L' }
  ];

  const mockOnRunSelect = jest.fn();
  const mockOnExport = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    ResponsiveUtils.useIsMobile.mockReturnValue(false);
    
    // Mock global objects needed for export functionality
    global.URL.createObjectURL = jest.fn(() => 'blob:test');
    global.URL.revokeObjectURL = jest.fn();
    global.Blob = function(content, options) {
      return { content, options };
    };
    
    const mockCreateElement = document.createElement.bind(document);
    document.createElement = jest.fn((tagName) => {
      const element = mockCreateElement(tagName);
      if (tagName === 'a') {
        element.download = '';
        element.click = jest.fn();
      }
      return element;
    });
    
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
  });
  
  afterEach(() => {
    document.createElement = document.createElement.bind(document);
  });

  test('renders all view versions', () => {
    render(
      <ResponsiveDesignMatrix
        designMatrix={mockDesignMatrix}
        factors={mockFactors}
        responses={mockResponses}
        designType="Factorial"
        onRunSelect={mockOnRunSelect}
        onExport={mockOnExport}
      />
    );
    
    expect(screen.getByTestId('mobile-view')).toBeInTheDocument();
    expect(screen.getByTestId('tablet-view')).toBeInTheDocument();
    expect(screen.getByTestId('desktop-view')).toBeInTheDocument();
  });

  test('displays design information correctly', () => {
    render(
      <ResponsiveDesignMatrix
        designMatrix={mockDesignMatrix}
        factors={mockFactors}
        responses={mockResponses}
        designType="Factorial"
        onRunSelect={mockOnRunSelect}
        onExport={mockOnExport}
      />
    );
    
    // Check design info
    expect(screen.getByText('Design Information')).toBeInTheDocument();
    expect(screen.getByText('Type: Factorial')).toBeInTheDocument();
    expect(screen.getByText('Runs: 4')).toBeInTheDocument();
    expect(screen.getByText('Factors: 3')).toBeInTheDocument();
    expect(screen.getByText('Responses: 1')).toBeInTheDocument();
  });

  test('toggles filter panel when filter button is clicked', () => {
    render(
      <ResponsiveDesignMatrix
        designMatrix={mockDesignMatrix}
        factors={mockFactors}
        responses={mockResponses}
        designType="Factorial"
      />
    );
    
    // Find and click the filter button
    fireEvent.click(screen.getByText('Filters'));
    
    // Check that filter options are visible
    expect(screen.getByLabelText('Coded Values')).toBeInTheDocument();
    expect(screen.getByLabelText('Show Responses')).toBeInTheDocument();
  });

  test('calls onRunSelect when clicking view details', () => {
    // Mock mobile view for simpler testing
    ResponsiveUtils.useIsMobile.mockReturnValue(true);
    
    render(
      <ResponsiveDesignMatrix
        designMatrix={mockDesignMatrix}
        factors={mockFactors}
        responses={mockResponses}
        designType="Factorial"
        onRunSelect={mockOnRunSelect}
      />
    );
    
    // Find and click a view details button in mobile view
    const viewButtons = screen.getAllByText('View Details');
    fireEvent.click(viewButtons[0]);
    
    // Check that onRunSelect was called with the correct run data
    expect(mockOnRunSelect).toHaveBeenCalledWith(mockDesignMatrix[0]);
  });

  test('calls onExport with design matrix data when export button is clicked', () => {
    render(
      <ResponsiveDesignMatrix
        designMatrix={mockDesignMatrix}
        factors={mockFactors}
        responses={mockResponses}
        designType="Factorial"
        onExport={mockOnExport}
      />
    );
    
    // Find and click the export button
    fireEvent.click(screen.getByText('Export'));
    
    // Check that onExport was called with the design matrix
    expect(mockOnExport).toHaveBeenCalledWith(mockDesignMatrix);
  });

  test('creates default CSV export when no onExport is provided', () => {
    render(
      <ResponsiveDesignMatrix
        designMatrix={mockDesignMatrix}
        factors={mockFactors}
        responses={mockResponses}
        designType="Factorial"
      />
    );
    
    // Find and click the export button
    fireEvent.click(screen.getByText('Export'));
    
    // Check that a link was created
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(document.body.appendChild).toHaveBeenCalled();
    expect(document.body.removeChild).toHaveBeenCalled();
    
    // Get the created link
    const createdLink = document.createElement.mock.results.find(
      result => result.value.tagName === 'A'
    ).value;
    
    // Check link properties
    expect(createdLink.download).toBe('design_matrix_factorial.csv');
    expect(createdLink.click).toHaveBeenCalled();
  });

  test('toggles between coded and natural values', () => {
    render(
      <ResponsiveDesignMatrix
        designMatrix={mockDesignMatrix}
        factors={mockFactors}
        responses={mockResponses}
        designType="Factorial"
      />
    );
    
    // First make filters visible
    fireEvent.click(screen.getByText('Filters'));
    
    // Get the coded values checkbox
    const codedValuesCheckbox = screen.getByLabelText('Coded Values');
    
    // Initially it should be checked (default)
    expect(codedValuesCheckbox).toBeChecked();
    
    // Uncheck to show natural values
    fireEvent.click(codedValuesCheckbox);
    
    // Now it should be unchecked
    expect(codedValuesCheckbox).not.toBeChecked();
    
    // Check it again
    fireEvent.click(codedValuesCheckbox);
    
    // Now it should be checked again
    expect(codedValuesCheckbox).toBeChecked();
  });

  test('toggles response visibility', () => {
    render(
      <ResponsiveDesignMatrix
        designMatrix={mockDesignMatrix}
        factors={mockFactors}
        responses={mockResponses}
        designType="Factorial"
      />
    );
    
    // First make filters visible
    fireEvent.click(screen.getByText('Filters'));
    
    // Get the show responses checkbox
    const responsesCheckbox = screen.getByLabelText('Show Responses');
    
    // Initially it should be checked (default)
    expect(responsesCheckbox).toBeChecked();
    
    // Uncheck to hide responses
    fireEvent.click(responsesCheckbox);
    
    // Now it should be unchecked
    expect(responsesCheckbox).not.toBeChecked();
  });

  test('renders without responses', () => {
    render(
      <ResponsiveDesignMatrix
        designMatrix={mockDesignMatrix}
        factors={mockFactors}
        designType="Factorial"
      />
    );
    
    // Should still render without errors
    expect(screen.getByText('Design Matrix')).toBeInTheDocument();
    
    // Should not show the responses checkbox
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.queryByLabelText('Show Responses')).not.toBeInTheDocument();
  });
});