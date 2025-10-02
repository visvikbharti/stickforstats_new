import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import ReportList from '../ReportList';
import * as useReportAPIModule from '../../../hooks/useReportAPI';

// Mock the useNavigate hook
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Sample report data for testing
const mockReports = [
  {
    id: '1',
    title: 'Test Report 1',
    description: 'This is a test report',
    format: 'pdf',
    created_at: '2023-05-15T12:00:00Z',
    analysis_count: 3,
    file_size: 256000
  },
  {
    id: '2',
    title: 'Test Report 2',
    description: 'Another test report',
    format: 'html',
    created_at: '2023-05-16T10:00:00Z',
    analysis_count: 2,
    file_size: 128000
  },
  {
    id: '3',
    title: 'Test Report 3',
    description: 'DOCX report',
    format: 'docx',
    created_at: '2023-05-17T09:00:00Z',
    analysis_count: 4,
    file_size: 350000
  }
];

describe('ReportList Component', () => {
  beforeEach(() => {
    // Mock the useReportAPI hook
    jest.spyOn(useReportAPIModule, 'useReportAPI').mockImplementation(() => ({
      reports: mockReports,
      loading: false,
      error: null,
      getReports: jest.fn().mockResolvedValue(mockReports),
      downloadReport: jest.fn()
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders report list correctly', async () => {
    render(
      <MemoryRouter>
        <ReportList />
      </MemoryRouter>
    );

    // Check for the heading
    expect(screen.getByText('Reports')).toBeInTheDocument();
    
    // Check for the "Create Report" button
    expect(screen.getByText('Create Report')).toBeInTheDocument();
    
    // Check that all reports are displayed
    expect(screen.getByText('Test Report 1')).toBeInTheDocument();
    expect(screen.getByText('Test Report 2')).toBeInTheDocument();
    expect(screen.getByText('Test Report 3')).toBeInTheDocument();
    
    // Check that format chips are displayed
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('HTML')).toBeInTheDocument();
    expect(screen.getByText('DOCX')).toBeInTheDocument();
    
    // Check that file sizes are displayed properly
    expect(screen.getByText('250.00 KB')).toBeInTheDocument();
    expect(screen.getByText('125.00 KB')).toBeInTheDocument();
    expect(screen.getByText('341.80 KB')).toBeInTheDocument();
  });

  test('handles search functionality', async () => {
    render(
      <MemoryRouter>
        <ReportList />
      </MemoryRouter>
    );

    // Get the search input
    const searchInput = screen.getByPlaceholderText('Search reports...');
    
    // Search for "Another"
    fireEvent.change(searchInput, { target: { value: 'Another' } });
    
    // Should only show the second report
    expect(screen.getByText('Test Report 2')).toBeInTheDocument();
    expect(screen.queryByText('Test Report 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Report 3')).not.toBeInTheDocument();
    
    // Clear the search
    fireEvent.change(searchInput, { target: { value: '' } });
    
    // All reports should be visible again
    expect(screen.getByText('Test Report 1')).toBeInTheDocument();
    expect(screen.getByText('Test Report 2')).toBeInTheDocument();
    expect(screen.getByText('Test Report 3')).toBeInTheDocument();
  });

  test('displays loading state', async () => {
    // Mock loading state
    jest.spyOn(useReportAPIModule, 'useReportAPI').mockImplementation(() => ({
      reports: [],
      loading: true,
      error: null,
      getReports: jest.fn(),
      downloadReport: jest.fn()
    }));

    render(
      <MemoryRouter>
        <ReportList />
      </MemoryRouter>
    );

    // Check for loading message
    expect(screen.getByText('Loading reports...')).toBeInTheDocument();
  });

  test('displays error state', async () => {
    // Mock error state
    jest.spyOn(useReportAPIModule, 'useReportAPI').mockImplementation(() => ({
      reports: [],
      loading: false,
      error: 'Failed to load reports',
      getReports: jest.fn(),
      downloadReport: jest.fn()
    }));

    render(
      <MemoryRouter>
        <ReportList />
      </MemoryRouter>
    );

    // Check for error message
    expect(screen.getByText('Error loading reports: Failed to load reports')).toBeInTheDocument();
  });

  test('displays empty state', async () => {
    // Mock empty state
    jest.spyOn(useReportAPIModule, 'useReportAPI').mockImplementation(() => ({
      reports: [],
      loading: false,
      error: null,
      getReports: jest.fn(),
      downloadReport: jest.fn()
    }));

    render(
      <MemoryRouter>
        <ReportList />
      </MemoryRouter>
    );

    // Check for empty message
    expect(screen.getByText('No reports have been generated yet')).toBeInTheDocument();
  });

  test('handles format filtering', async () => {
    render(
      <MemoryRouter>
        <ReportList />
      </MemoryRouter>
    );

    // Click on the PDF filter chip
    fireEvent.click(screen.getByText('PDF'));
    
    // Should only show the PDF report
    expect(screen.getByText('Test Report 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Report 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Report 3')).not.toBeInTheDocument();
    
    // Click on the PDF filter chip again to clear it
    fireEvent.click(screen.getByText('PDF'));
    
    // All reports should be visible again
    expect(screen.getByText('Test Report 1')).toBeInTheDocument();
    expect(screen.getByText('Test Report 2')).toBeInTheDocument();
    expect(screen.getByText('Test Report 3')).toBeInTheDocument();
  });
});