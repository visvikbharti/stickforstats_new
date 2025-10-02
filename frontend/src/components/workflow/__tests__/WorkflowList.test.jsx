import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import WorkflowList from '../WorkflowList';
import * as useWorkflowAPIModule from '../../../hooks/useWorkflowAPI';

// Mock the useNavigate hook
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Sample workflow data for testing
const mockWorkflows = [
  {
    id: '1',
    name: 'Test Workflow 1',
    description: 'This is a test workflow',
    status: 'draft',
    created_at: '2023-05-15T12:00:00Z',
    updated_at: '2023-05-15T13:00:00Z',
    last_executed_at: null
  },
  {
    id: '2',
    name: 'Test Workflow 2',
    description: 'Another test workflow',
    status: 'completed',
    created_at: '2023-05-16T10:00:00Z',
    updated_at: '2023-05-16T12:00:00Z',
    last_executed_at: '2023-05-16T11:00:00Z'
  },
  {
    id: '3',
    name: 'Test Workflow 3',
    description: 'In-progress workflow',
    status: 'in_progress',
    created_at: '2023-05-17T09:00:00Z',
    updated_at: '2023-05-17T10:00:00Z',
    last_executed_at: '2023-05-17T09:30:00Z'
  }
];

describe('WorkflowList Component', () => {
  beforeEach(() => {
    // Mock the useWorkflowAPI hook
    jest.spyOn(useWorkflowAPIModule, 'useWorkflowAPI').mockImplementation(() => ({
      workflows: mockWorkflows,
      loading: false,
      error: null,
      fetchWorkflows: jest.fn().mockResolvedValue(mockWorkflows),
      deleteWorkflow: jest.fn(),
      executeWorkflow: jest.fn(),
      cancelExecution: jest.fn(),
      cloneWorkflow: jest.fn(),
      exportWorkflow: jest.fn()
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders workflow list correctly', async () => {
    render(
      <MemoryRouter>
        <WorkflowList />
      </MemoryRouter>
    );

    // Check for the heading
    expect(screen.getByText('Workflows')).toBeInTheDocument();
    
    // Check for the "Create Workflow" button
    expect(screen.getByText('Create Workflow')).toBeInTheDocument();
    
    // Check that all workflows are displayed
    expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
    expect(screen.getByText('Test Workflow 2')).toBeInTheDocument();
    expect(screen.getByText('Test Workflow 3')).toBeInTheDocument();
    
    // Check that status chips are displayed
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  test('handles search functionality', async () => {
    render(
      <MemoryRouter>
        <WorkflowList />
      </MemoryRouter>
    );

    // Get the search input
    const searchInput = screen.getByLabelText('Search workflows');
    
    // Search for "Another"
    fireEvent.change(searchInput, { target: { value: 'Another' } });
    
    // Should only show the second workflow
    expect(screen.getByText('Test Workflow 2')).toBeInTheDocument();
    expect(screen.queryByText('Test Workflow 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Workflow 3')).not.toBeInTheDocument();
    
    // Clear the search
    fireEvent.change(searchInput, { target: { value: '' } });
    
    // All workflows should be visible again
    expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
    expect(screen.getByText('Test Workflow 2')).toBeInTheDocument();
    expect(screen.getByText('Test Workflow 3')).toBeInTheDocument();
  });

  test('displays loading state', async () => {
    // Mock loading state
    jest.spyOn(useWorkflowAPIModule, 'useWorkflowAPI').mockImplementation(() => ({
      workflows: [],
      loading: true,
      error: null,
      fetchWorkflows: jest.fn(),
      deleteWorkflow: jest.fn(),
      executeWorkflow: jest.fn(),
      cancelExecution: jest.fn(),
      cloneWorkflow: jest.fn(),
      exportWorkflow: jest.fn()
    }));

    render(
      <MemoryRouter>
        <WorkflowList />
      </MemoryRouter>
    );

    // Check for loading message
    expect(screen.getByText('Loading workflows...')).toBeInTheDocument();
  });

  test('displays error state', async () => {
    // Mock error state
    jest.spyOn(useWorkflowAPIModule, 'useWorkflowAPI').mockImplementation(() => ({
      workflows: [],
      loading: false,
      error: 'Failed to load workflows',
      fetchWorkflows: jest.fn(),
      deleteWorkflow: jest.fn(),
      executeWorkflow: jest.fn(),
      cancelExecution: jest.fn(),
      cloneWorkflow: jest.fn(),
      exportWorkflow: jest.fn()
    }));

    render(
      <MemoryRouter>
        <WorkflowList />
      </MemoryRouter>
    );

    // Check for error message
    expect(screen.getByText('Error loading workflows: Failed to load workflows')).toBeInTheDocument();
  });

  test('displays empty state', async () => {
    // Mock empty state
    jest.spyOn(useWorkflowAPIModule, 'useWorkflowAPI').mockImplementation(() => ({
      workflows: [],
      loading: false,
      error: null,
      fetchWorkflows: jest.fn(),
      deleteWorkflow: jest.fn(),
      executeWorkflow: jest.fn(),
      cancelExecution: jest.fn(),
      cloneWorkflow: jest.fn(),
      exportWorkflow: jest.fn()
    }));

    render(
      <MemoryRouter>
        <WorkflowList />
      </MemoryRouter>
    );

    // Check for empty message
    expect(screen.getByText('No workflows yet')).toBeInTheDocument();
  });
});