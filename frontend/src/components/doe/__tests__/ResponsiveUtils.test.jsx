import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

// Mock the MaterialUI hooks before importing component
jest.mock('@mui/material/styles', () => ({
  ...jest.requireActual('@mui/material/styles'),
  useTheme: jest.fn(),
}));

jest.mock('@mui/material/useMediaQuery', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Import after mocks are set up
const {
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  ResponsiveView,
  MobileOnly,
  TabletOnly,
  DesktopOnly,
  NotMobile,
} = jest.requireActual('../utils/ResponsiveUtils');

// Test component to use the hooks
function TestComponent({ hook }) {
  const result = hook();
  return <div data-testid="result">{result.toString()}</div>;
}

describe('Responsive Utils', () => {
  beforeEach(() => {
    // Set up the mock theme with correct MUI v5 breakpoint values
    const bpDown = { xs: '0px', sm: '599.95px', md: '899.95px', lg: '1199.95px', xl: '1535.95px' };
    const bpUp = { xs: '0px', sm: '600px', md: '900px', lg: '1200px', xl: '1536px' };
    useTheme.mockReturnValue({
      breakpoints: {
        down: (bp) => `@media (max-width:${bpDown[bp] || '1199.95px'})`,
        between: (start, end) => `@media (min-width:${bpUp[start] || '0px'}) and (max-width:${bpDown[end] || '1199.95px'})`,
        up: (bp) => `@media (min-width:${bpUp[bp] || '0px'})`,
      }
    });
  });

  describe('useIsMobile hook', () => {
    test('returns true for mobile screen', () => {
      useMediaQuery.mockReturnValue(true);
      
      render(<TestComponent hook={useIsMobile} />);
      expect(screen.getByTestId('result').textContent).toBe('true');
    });

    test('returns false for non-mobile screen', () => {
      useMediaQuery.mockReturnValue(false);
      
      render(<TestComponent hook={useIsMobile} />);
      expect(screen.getByTestId('result').textContent).toBe('false');
    });
  });

  describe('useIsTablet hook', () => {
    test('returns true for tablet screen', () => {
      useMediaQuery.mockReturnValue(true);
      
      render(<TestComponent hook={useIsTablet} />);
      expect(screen.getByTestId('result').textContent).toBe('true');
    });

    test('returns false for non-tablet screen', () => {
      useMediaQuery.mockReturnValue(false);
      
      render(<TestComponent hook={useIsTablet} />);
      expect(screen.getByTestId('result').textContent).toBe('false');
    });
  });

  describe('useIsDesktop hook', () => {
    test('returns true for desktop screen', () => {
      useMediaQuery.mockReturnValue(true);
      
      render(<TestComponent hook={useIsDesktop} />);
      expect(screen.getByTestId('result').textContent).toBe('true');
    });

    test('returns false for non-desktop screen', () => {
      useMediaQuery.mockReturnValue(false);
      
      render(<TestComponent hook={useIsDesktop} />);
      expect(screen.getByTestId('result').textContent).toBe('false');
    });
  });

  describe('ResponsiveView component', () => {
    test('renders mobile content for mobile screens', () => {
      // Mock useMediaQuery to simulate a mobile screen
      useMediaQuery.mockImplementation((query) => {
        return query === '@media (max-width:599.95px)';
      });
      
      render(
        <ResponsiveView
          mobileContent={<div data-testid="mobile-content">Mobile Content</div>}
          tabletContent={<div data-testid="tablet-content">Tablet Content</div>}
          desktopContent={<div data-testid="desktop-content">Desktop Content</div>}
        />
      );
      
      expect(screen.queryByTestId('mobile-content')).toBeInTheDocument();
      expect(screen.queryByTestId('tablet-content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('desktop-content')).not.toBeInTheDocument();
    });
    
    test('renders tablet content for tablet screens', () => {
      // Mock useMediaQuery to simulate a tablet screen
      useMediaQuery.mockImplementation((query) => {
        return query === '@media (min-width:600px) and (max-width:899.95px)';
      });
      
      render(
        <ResponsiveView
          mobileContent={<div data-testid="mobile-content">Mobile Content</div>}
          tabletContent={<div data-testid="tablet-content">Tablet Content</div>}
          desktopContent={<div data-testid="desktop-content">Desktop Content</div>}
        />
      );
      
      expect(screen.queryByTestId('mobile-content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tablet-content')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-content')).not.toBeInTheDocument();
    });
    
    test('renders desktop content for desktop screens', () => {
      // Mock useMediaQuery to simulate a desktop screen (up('md') = min-width:900px)
      useMediaQuery.mockImplementation((query) => {
        return query === '@media (min-width:900px)';
      });
      
      render(
        <ResponsiveView
          mobileContent={<div data-testid="mobile-content">Mobile Content</div>}
          tabletContent={<div data-testid="tablet-content">Tablet Content</div>}
          desktopContent={<div data-testid="desktop-content">Desktop Content</div>}
        />
      );
      
      expect(screen.queryByTestId('mobile-content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tablet-content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('desktop-content')).toBeInTheDocument();
    });
    
    test('falls back to desktop content if tablet content is not provided', () => {
      // Mock useMediaQuery to simulate a tablet screen
      useMediaQuery.mockImplementation((query) => {
        return query === '@media (min-width:600px) and (max-width:899.95px)';
      });
      
      render(
        <ResponsiveView
          mobileContent={<div data-testid="mobile-content">Mobile Content</div>}
          desktopContent={<div data-testid="desktop-content">Desktop Content</div>}
        />
      );
      
      expect(screen.queryByTestId('mobile-content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('desktop-content')).toBeInTheDocument();
    });
  });

  describe('MobileOnly component', () => {
    test('renders content only on mobile screens', () => {
      // Mock useMediaQuery to simulate a mobile screen
      useMediaQuery.mockImplementation((query) => {
        return query === '@media (max-width:599.95px)';
      });
      
      render(
        <MobileOnly>
          <div data-testid="mobile-content">Mobile Only Content</div>
        </MobileOnly>
      );
      
      expect(screen.queryByTestId('mobile-content')).toBeInTheDocument();
    });
    
    test('does not render content on non-mobile screens', () => {
      // Mock useMediaQuery to simulate a non-mobile screen
      useMediaQuery.mockImplementation((query) => {
        return query !== '@media (max-width:599.95px)';
      });
      
      render(
        <MobileOnly>
          <div data-testid="mobile-content">Mobile Only Content</div>
        </MobileOnly>
      );
      
      expect(screen.queryByTestId('mobile-content')).not.toBeInTheDocument();
    });
  });

  describe('TabletOnly component', () => {
    test('renders content only on tablet screens', () => {
      // Mock useMediaQuery to simulate a tablet screen
      useMediaQuery.mockImplementation((query) => {
        return query === '@media (min-width:600px) and (max-width:899.95px)';
      });
      
      render(
        <TabletOnly>
          <div data-testid="tablet-content">Tablet Only Content</div>
        </TabletOnly>
      );
      
      expect(screen.queryByTestId('tablet-content')).toBeInTheDocument();
    });
    
    test('does not render content on non-tablet screens', () => {
      // Mock useMediaQuery to simulate a non-tablet screen
      useMediaQuery.mockImplementation((query) => {
        return query !== '@media (min-width:600px) and (max-width:899.95px)';
      });
      
      render(
        <TabletOnly>
          <div data-testid="tablet-content">Tablet Only Content</div>
        </TabletOnly>
      );
      
      expect(screen.queryByTestId('tablet-content')).not.toBeInTheDocument();
    });
  });

  describe('DesktopOnly component', () => {
    test('renders content only on desktop screens', () => {
      // Mock useMediaQuery to simulate a desktop screen (up('md') = min-width:900px)
      useMediaQuery.mockImplementation((query) => {
        return query === '@media (min-width:900px)';
      });

      render(
        <DesktopOnly>
          <div data-testid="desktop-content">Desktop Only Content</div>
        </DesktopOnly>
      );

      expect(screen.queryByTestId('desktop-content')).toBeInTheDocument();
    });

    test('does not render content on non-desktop screens', () => {
      // Mock useMediaQuery to simulate a non-desktop screen
      useMediaQuery.mockImplementation((query) => {
        return query !== '@media (min-width:900px)';
      });

      render(
        <DesktopOnly>
          <div data-testid="desktop-content">Desktop Only Content</div>
        </DesktopOnly>
      );

      expect(screen.queryByTestId('desktop-content')).not.toBeInTheDocument();
    });
  });

  describe('NotMobile component', () => {
    test('renders content on non-mobile screens', () => {
      // Mock useMediaQuery to simulate a non-mobile screen
      useMediaQuery.mockImplementation((query) => {
        return query !== '@media (max-width:599.95px)';
      });
      
      render(
        <NotMobile>
          <div data-testid="not-mobile-content">Not Mobile Content</div>
        </NotMobile>
      );
      
      expect(screen.queryByTestId('not-mobile-content')).toBeInTheDocument();
    });
    
    test('does not render content on mobile screens', () => {
      // Mock useMediaQuery to simulate a mobile screen
      useMediaQuery.mockImplementation((query) => {
        return query === '@media (max-width:599.95px)';
      });
      
      render(
        <NotMobile>
          <div data-testid="not-mobile-content">Not Mobile Content</div>
        </NotMobile>
      );
      
      expect(screen.queryByTestId('not-mobile-content')).not.toBeInTheDocument();
    });
  });

});