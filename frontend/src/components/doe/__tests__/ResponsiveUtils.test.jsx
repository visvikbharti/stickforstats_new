import React from 'react';
import { render, screen } from '@testing-library/react';
import { 
  useIsMobile, 
  useIsTablet, 
  useIsDesktop,
  ResponsiveView,
  MobileOnly,
  TabletOnly,
  DesktopOnly,
  NotMobile,
  ResponsiveGrid
} from '../utils/ResponsiveUtils';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

// Mock the MaterialUI hooks
jest.mock('@mui/material/styles', () => ({
  useTheme: jest.fn(),
}));

jest.mock('@mui/material/useMediaQuery', () => 
  jest.fn()
);

// Test component to use the hooks
function TestComponent({ hook }) {
  const result = hook();
  return <div data-testid="result">{result.toString()}</div>;
}

describe('Responsive Utils', () => {
  beforeEach(() => {
    // Set up the mock theme
    useTheme.mockReturnValue({
      breakpoints: {
        down: (breakpoint) => `@media (max-width:${breakpoint === 'sm' ? '599.95px' : '1199.95px'})`,
        between: (start, end) => `@media (min-width:${start === 'sm' ? '600px' : '0px'}) and (max-width:${end === 'md' ? '899.95px' : '1199.95px'})`,
        up: (breakpoint) => `@media (min-width:${breakpoint === 'lg' ? '1200px' : '600px'})`,
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
      // Mock useMediaQuery to simulate a desktop screen
      useMediaQuery.mockImplementation((query) => {
        return query === '@media (min-width:1200px)';
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
      // Mock useMediaQuery to simulate a desktop screen
      useMediaQuery.mockImplementation((query) => {
        return query === '@media (min-width:1200px)';
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
        return query !== '@media (min-width:1200px)';
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

  describe('ResponsiveGrid component', () => {
    test('renders with correct column count for mobile screens', () => {
      // Mock hooks for mobile screen
      useMediaQuery.mockImplementation(() => false);
      useIsMobile.mockReturnValue(true);
      useIsTablet.mockReturnValue(false);
      
      render(
        <ResponsiveGrid
          mobileColumns={1}
          tabletColumns={2}
          desktopColumns={3}
          spacing={2}
        >
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </ResponsiveGrid>
      );
      
      // Check that grid is rendered with mobile columns
      const grid = screen.getByText('Item 1').parentElement;
      expect(grid).toHaveStyle('display: grid');
      expect(grid).toHaveStyle('grid-template-columns: repeat(1, 1fr)');
    });
    
    test('renders with correct column count for tablet screens', () => {
      // Mock hooks for tablet screen
      useMediaQuery.mockImplementation(() => false);
      useIsMobile.mockReturnValue(false);
      useIsTablet.mockReturnValue(true);
      
      render(
        <ResponsiveGrid
          mobileColumns={1}
          tabletColumns={2}
          desktopColumns={3}
          spacing={2}
        >
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </ResponsiveGrid>
      );
      
      // Check that grid is rendered with tablet columns
      const grid = screen.getByText('Item 1').parentElement;
      expect(grid).toHaveStyle('display: grid');
      expect(grid).toHaveStyle('grid-template-columns: repeat(2, 1fr)');
    });
    
    test('renders with correct column count for desktop screens', () => {
      // Mock hooks for desktop screen
      useMediaQuery.mockImplementation(() => false);
      useIsMobile.mockReturnValue(false);
      useIsTablet.mockReturnValue(false);
      
      render(
        <ResponsiveGrid
          mobileColumns={1}
          tabletColumns={2}
          desktopColumns={3}
          spacing={2}
        >
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </ResponsiveGrid>
      );
      
      // Check that grid is rendered with desktop columns
      const grid = screen.getByText('Item 1').parentElement;
      expect(grid).toHaveStyle('display: grid');
      expect(grid).toHaveStyle('grid-template-columns: repeat(3, 1fr)');
    });
    
    test('applies correct spacing', () => {
      // Mock hooks
      useMediaQuery.mockImplementation(() => false);
      useIsMobile.mockReturnValue(true);
      
      render(
        <ResponsiveGrid
          mobileColumns={1}
          spacing={4}
        >
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveGrid>
      );
      
      // Check that grid has correct gap
      const grid = screen.getByText('Item 1').parentElement;
      expect(grid).toHaveStyle('gap: 4px');
    });
  });
});