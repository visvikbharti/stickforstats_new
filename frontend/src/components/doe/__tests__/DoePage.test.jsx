import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the services BEFORE importing DoePage (virtual: true since files don't exist yet)
jest.mock('../../../services/authService', () => ({
  __esModule: true,
  default: {
    getCurrentUser: jest.fn(),
  }
}), { virtual: true });

jest.mock('../../../services/contentService', () => ({
  __esModule: true,
  default: {
    getContent: jest.fn(),
  }
}), { virtual: true });

// Mock the responsive utility to avoid MUI styled issues
jest.mock('../utils/ResponsiveUtils', () => ({
  useIsMobile: jest.fn(() => false),
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

// Import after mocks
import DoePage from '../DoePage';
import authService from '../../../services/authService';
import contentService from '../../../services/contentService';

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
    authService.getCurrentUser.mockResolvedValue(mockUser);
    contentService.getContent.mockResolvedValue(mockContent);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    render(<DoePage />);
    expect(screen.getByText(/Loading DOE Module/i)).toBeInTheDocument();
  });

  test('renders error message when content fails to load', async () => {
    contentService.getContent.mockRejectedValue(new Error('Failed to load content'));

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

  test('calls the services on mount', async () => {
    render(<DoePage />);

    await waitFor(() => {
      expect(authService.getCurrentUser).toHaveBeenCalledTimes(1);
      expect(contentService.getContent).toHaveBeenCalledTimes(1);
      expect(contentService.getContent).toHaveBeenCalledWith('doe');
    });
  });
});
