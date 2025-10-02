import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DoePage from '../DoePage';
import authService from '../../../services/authService';
import contentService from '../../../services/contentService';

// Mock the services
jest.mock('../../../services/authService', () => ({
  default: {
    getCurrentUser: jest.fn(),
  }
}));

jest.mock('../../../services/contentService', () => ({
  default: {
    getContent: jest.fn(),
  }
}));

// Mock the child components
jest.mock('../Introduction', () => {
  return function MockIntroduction() {
    return <div data-testid="introduction">Introduction Content</div>;
  };
});

jest.mock('../Fundamentals', () => {
  return function MockFundamentals() {
    return <div data-testid="fundamentals">Fundamentals Content</div>;
  };
});

jest.mock('../DesignTypes', () => {
  return function MockDesignTypes() {
    return <div data-testid="design-types">Design Types Content</div>;
  };
});

jest.mock('../Analysis', () => {
  return function MockAnalysis() {
    return <div data-testid="analysis">Analysis Content</div>;
  };
});

jest.mock('../CaseStudies', () => {
  return function MockCaseStudies() {
    return <div data-testid="case-studies">Case Studies Content</div>;
  };
});

jest.mock('../DesignBuilder', () => {
  return function MockDesignBuilder() {
    return <div data-testid="design-builder">Design Builder Content</div>;
  };
});

jest.mock('../utils/ResponsiveDoePage', () => {
  return function MockResponsiveDoePage({ children, tabs, activeTab, onTabChange }) {
    return (
      <div data-testid="responsive-doe-page">
        <div data-testid="tabs">
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              data-testid={`tab-${index}`}
              onClick={() => onTabChange({}, index)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div data-testid="content">{children}</div>
      </div>
    );
  };
});

describe('DoePage Component', () => {
  const mockUser = { id: 'user123', name: 'Test User' };
  const mockContent = {
    introduction: { title: 'Introduction' },
    fundamentals: { title: 'Fundamentals' },
    designTypes: { title: 'Design Types' },
    analysis: { title: 'Analysis' },
    caseStudies: { title: 'Case Studies' }
  };

  beforeEach(() => {
    fetchCurrentUser.mockResolvedValue(mockUser);
    fetchEducationalContent.mockResolvedValue(mockContent);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    render(<DoePage />);
    expect(screen.getByText(/Loading DOE Module/i)).toBeInTheDocument();
  });

  test('renders error message when content fails to load', async () => {
    const errorMessage = 'Failed to load content';
    fetchEducationalContent.mockRejectedValue(new Error(errorMessage));

    render(<DoePage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load content/i)).toBeInTheDocument();
    });
  });

  test('renders page with tabs after loading', async () => {
    render(<DoePage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('responsive-doe-page')).toBeInTheDocument();
      expect(screen.getByTestId('tabs')).toBeInTheDocument();
      expect(screen.getByTestId('tab-0')).toBeInTheDocument();
      expect(screen.getByTestId('tab-5')).toBeInTheDocument();
    });
  });

  test('shows Introduction component by default', async () => {
    render(<DoePage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('introduction')).toBeInTheDocument();
    });
  });

  test('changes content when tabs are clicked', async () => {
    render(<DoePage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('introduction')).toBeInTheDocument();
    });
    
    userEvent.click(screen.getByTestId('tab-1'));
    expect(screen.getByTestId('fundamentals')).toBeInTheDocument();
    
    userEvent.click(screen.getByTestId('tab-2'));
    expect(screen.getByTestId('design-types')).toBeInTheDocument();
    
    userEvent.click(screen.getByTestId('tab-3'));
    expect(screen.getByTestId('analysis')).toBeInTheDocument();
    
    userEvent.click(screen.getByTestId('tab-4'));
    expect(screen.getByTestId('case-studies')).toBeInTheDocument();
    
    userEvent.click(screen.getByTestId('tab-5'));
    expect(screen.getByTestId('design-builder')).toBeInTheDocument();
  });

  test('calls the services with correct parameters', async () => {
    render(<DoePage />);
    
    await waitFor(() => {
      expect(fetchCurrentUser).toHaveBeenCalledTimes(1);
      expect(fetchEducationalContent).toHaveBeenCalledTimes(1);
      expect(fetchEducationalContent).toHaveBeenCalledWith('doe');
    });
  });
});