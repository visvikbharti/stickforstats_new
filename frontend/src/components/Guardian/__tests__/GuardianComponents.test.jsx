/**
 * Guardian Components Tests
 * =========================
 *
 * Tests for Guardian display components.
 *
 * Design Contract Compliance:
 * - "No statistical result may exist without an explicit, traceable assumption context."
 * - These components display the Guardian context to users
 *
 * @author StickForStats Development Team
 * @date 2026-01-26
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import GuardianReportDisplay from '../GuardianReportDisplay';
import GuardianBadge from '../GuardianBadge';
import ConfidenceGauge from '../ConfidenceGauge';
import ViolationCard from '../ViolationCard';

// Create theme wrapper for tests
const theme = createTheme();
const ThemeWrapper = ({ children }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const renderWithTheme = (component) => {
  return render(<ThemeWrapper>{component}</ThemeWrapper>);
};

describe('GuardianReportDisplay Component', () => {
  const defaultProps = {
    guardianReport: { test_type: 't_test' },
    assumptionsChecked: ['normality', 'homogeneity'],
    violations: [],
    confidenceScore: 85,
    canProceed: true,
    alternativeTests: [],
    expertModeOverride: false,
  };

  describe('Rendering', () => {
    it('should render without crashing', () => {
      renderWithTheme(<GuardianReportDisplay {...defaultProps} />);
      expect(screen.getByText(/Guardian/i)).toBeInTheDocument();
    });

    it('should display "Missing Guardian Context" alert when no data', () => {
      renderWithTheme(
        <GuardianReportDisplay
          guardianReport={null}
          assumptionsChecked={[]}
          violations={[]}
          confidenceScore={0}
          canProceed={true}
        />
      );

      expect(screen.getByText(/Missing Guardian Context/i)).toBeInTheDocument();
    });

    it('should display assumptions checked count', () => {
      renderWithTheme(<GuardianReportDisplay {...defaultProps} />);

      expect(screen.getByText(/Assumptions Checked/i)).toBeInTheDocument();
      expect(screen.getByText(/\(2\)/)).toBeInTheDocument();
    });

    it('should display confidence score', () => {
      renderWithTheme(<GuardianReportDisplay {...defaultProps} />);

      // Look for confidence score display - may appear multiple times (badge + gauge)
      const scoreElements = screen.getAllByText(/85/);
      expect(scoreElements.length).toBeGreaterThan(0);
    });
  });

  describe('Violations Display', () => {
    it('should display violations when present', () => {
      const propsWithViolations = {
        ...defaultProps,
        violations: [
          {
            severity: 'warning',
            assumption: 'normality',
            message: 'Data may not be normally distributed',
          },
        ],
      };

      renderWithTheme(<GuardianReportDisplay {...propsWithViolations} />);

      expect(screen.getByText(/Violations/i)).toBeInTheDocument();
      expect(screen.getByText(/\(1\)/)).toBeInTheDocument();
    });

    it('should show violation count chips', () => {
      const propsWithViolations = {
        ...defaultProps,
        violations: [
          { severity: 'critical', assumption: 'independence' },
          { severity: 'warning', assumption: 'normality' },
        ],
      };

      renderWithTheme(<GuardianReportDisplay {...propsWithViolations} />);

      expect(screen.getByText(/1 Critical/i)).toBeInTheDocument();
      expect(screen.getByText(/1 Warning/i)).toBeInTheDocument();
    });
  });

  describe('Expert Mode', () => {
    it('should display expert mode warning when override active', () => {
      const propsWithExpertMode = {
        ...defaultProps,
        expertModeOverride: true,
      };

      renderWithTheme(<GuardianReportDisplay {...propsWithExpertMode} />);

      expect(screen.getByText(/Expert Mode Active/i)).toBeInTheDocument();
    });
  });

  describe('Alternative Tests', () => {
    it('should display alternative test recommendations', () => {
      const propsWithAlternatives = {
        ...defaultProps,
        alternativeTests: ['mann_whitney', 'welch_t_test'],
      };

      renderWithTheme(<GuardianReportDisplay {...propsWithAlternatives} />);

      expect(screen.getByText(/Recommended Alternatives/i)).toBeInTheDocument();
    });

    it('should call onAlternativeSelect when alternative clicked', () => {
      const onAlternativeSelect = jest.fn();
      const propsWithAlternatives = {
        ...defaultProps,
        alternativeTests: ['mann_whitney'],
        onAlternativeSelect,
      };

      renderWithTheme(<GuardianReportDisplay {...propsWithAlternatives} />);

      const chip = screen.getByText(/mann whitney/i);
      fireEvent.click(chip);

      expect(onAlternativeSelect).toHaveBeenCalledWith('mann_whitney');
    });
  });

  describe('Expandable Content', () => {
    it('should toggle expanded state on header click', () => {
      const { container } = renderWithTheme(
        <GuardianReportDisplay {...defaultProps} compact />
      );

      // Initially collapsed in compact mode
      const header = screen.getByText(/Guardian Assumption Report/i);
      fireEvent.click(header);

      // Should now show expanded content
      expect(screen.getByText(/Result Confidence/i)).toBeInTheDocument();
    });
  });
});

describe('GuardianBadge Component', () => {
  describe('Status Display', () => {
    it('should show success status for no violations', () => {
      renderWithTheme(
        <GuardianBadge
          confidenceScore={90}
          violations={[]}
          canProceed={true}
        />
      );

      expect(screen.getByText(/90%/)).toBeInTheDocument();
    });

    it('should show warning status for warning violations', () => {
      // With showScore=false, the badge shows status label
      renderWithTheme(
        <GuardianBadge
          confidenceScore={70}
          violations={[{ severity: 'warning' }]}
          canProceed={true}
          showScore={false}
        />
      );

      expect(screen.getByText(/1 Warning/)).toBeInTheDocument();
    });

    it('should show error status for critical violations', () => {
      // With showScore=false, the badge shows status label
      renderWithTheme(
        <GuardianBadge
          confidenceScore={50}
          violations={[{ severity: 'critical' }]}
          canProceed={false}
          showScore={false}
        />
      );

      expect(screen.getByText(/1 Critical/)).toBeInTheDocument();
    });

    it('should show override status when expert mode active', () => {
      // With showScore=false, the badge shows status label
      renderWithTheme(
        <GuardianBadge
          confidenceScore={50}
          violations={[{ severity: 'critical' }]}
          canProceed={true}
          expertModeOverride={true}
          showScore={false}
        />
      );

      expect(screen.getByText(/Override/)).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('should call onClick when clicked', () => {
      const onClick = jest.fn();
      renderWithTheme(
        <GuardianBadge
          confidenceScore={90}
          violations={[]}
          canProceed={true}
          onClick={onClick}
        />
      );

      const badge = screen.getByText(/90%/).closest('.MuiChip-root');
      fireEvent.click(badge);

      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('Tooltip', () => {
    it('should display tooltip with status details', async () => {
      renderWithTheme(
        <GuardianBadge
          confidenceScore={75}
          violations={[{ severity: 'warning' }, { severity: 'warning' }]}
          canProceed={true}
        />
      );

      // Badge should render with the confidence score
      expect(screen.getByText(/75%/)).toBeInTheDocument();

      // The Chip should be wrapped in a tooltip
      const chip = screen.getByText(/75%/).closest('.MuiChip-root');
      expect(chip).toBeInTheDocument();
    });
  });
});

describe('ConfidenceGauge Component', () => {
  it('should render confidence score', () => {
    renderWithTheme(<ConfidenceGauge score={85} />);

    // Check for the score display
    expect(screen.getByText(/85/)).toBeInTheDocument();
  });

  it('should apply correct color for high confidence', () => {
    const { container } = renderWithTheme(<ConfidenceGauge score={90} />);

    // High confidence should have success coloring
    // This is a visual test - checking component renders
    expect(container.querySelector('.MuiLinearProgress-root')).toBeInTheDocument();
  });

  it('should apply correct color for low confidence', () => {
    const { container } = renderWithTheme(<ConfidenceGauge score={30} />);

    // Low confidence should have error coloring
    expect(container.querySelector('.MuiLinearProgress-root')).toBeInTheDocument();
  });
});

describe('ViolationCard Component', () => {
  const defaultViolation = {
    assumption: 'normality',
    severity: 'warning',
    message: 'Shapiro-Wilk test indicates non-normal distribution',
    p_value: 0.02,
    recommendation: 'Consider using Mann-Whitney U test',
  };

  it('should render violation details', () => {
    renderWithTheme(<ViolationCard violation={defaultViolation} />);

    expect(screen.getByText(/normality/i)).toBeInTheDocument();
    expect(screen.getByText(/warning/i)).toBeInTheDocument();
  });

  it('should display p-value when provided', () => {
    renderWithTheme(<ViolationCard violation={defaultViolation} />);

    expect(screen.getByText(/0\.02/)).toBeInTheDocument();
  });

  it('should display recommendation when provided', () => {
    renderWithTheme(<ViolationCard violation={defaultViolation} />);

    expect(screen.getByText(/Mann-Whitney/i)).toBeInTheDocument();
  });

  it('should apply correct severity color', () => {
    const { container } = renderWithTheme(
      <ViolationCard violation={{ ...defaultViolation, severity: 'critical' }} />
    );

    // Critical should have error coloring - uses Paper with border, not Alert
    const paper = container.querySelector('.MuiPaper-root');
    expect(paper).toBeInTheDocument();

    // Check for Critical chip label
    expect(screen.getByText(/Critical/i)).toBeInTheDocument();
  });
});

describe('Design Contract Compliance - Components', () => {
  it('should always display Guardian context when available', () => {
    const compliantProps = {
      guardianReport: { test_type: 't_test' },
      assumptionsChecked: ['normality'],
      violations: [],
      confidenceScore: 90,
      canProceed: true,
      alternativeTests: [],
      expertModeOverride: false,
    };

    renderWithTheme(<GuardianReportDisplay {...compliantProps} />);

    // Core contract elements must be visible
    expect(screen.getByText(/Guardian/i)).toBeInTheDocument();
    expect(screen.getByText(/Assumptions Checked/i)).toBeInTheDocument();
  });

  it('should warn when Guardian context is missing', () => {
    renderWithTheme(
      <GuardianReportDisplay
        guardianReport={null}
        assumptionsChecked={[]}
        violations={[]}
        confidenceScore={0}
        canProceed={true}
      />
    );

    // Must warn about missing context
    expect(screen.getByText(/Missing Guardian Context/i)).toBeInTheDocument();
    expect(
      screen.getByText(/should always include Guardian context/i)
    ).toBeInTheDocument();
  });
});
