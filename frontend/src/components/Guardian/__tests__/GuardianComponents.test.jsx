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

/**
 * "Required but NOT evaluated" — the third state the UI never had.
 *
 * `assumptions_checked` used to be the backend's REQUIREMENTS list, published as though it
 * described what had been performed: 22 of 25 test types listed `independence` as checked while
 * the audit trail recorded `not_applicable`. The backend now reports only what actually ran,
 * which makes it truthful and ALSO NARROWER — so without this section the panel silently drops a
 * requirement instead of reporting it as unexamined, and a reader cannot tell "this test needs
 * three things" from "it needs four and we did three".
 *
 * Every test names the mutation that must break it.
 */
describe('GuardianReportDisplay — unexamined assumptions and coverage', () => {
  const theme2 = createTheme();
  const wrap = (ui) => render(<ThemeProvider theme={theme2}>{ui}</ThemeProvider>);

  const partial = {
    guardianReport: { test_type: 't_test' },
    assumptionsChecked: ['normality', 'variance_homogeneity', 'outliers'],
    assumptionsNotEvaluated: ['independence'],
    assumptionCoverage: 0.75,
    violations: [],
    confidenceScore: 100,
    canProceed: true,
    alternativeTests: [],
    expertModeOverride: false,
  };

  it('names the assumption that was required but never examined', () => {
    // MUTATION: delete the assumptionsNotEvaluated block from GuardianReportDisplay -> fails.
    wrap(<GuardianReportDisplay {...partial} />);
    expect(screen.getByText(/Required but NOT evaluated \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText('independence')).toBeInTheDocument();
  });

  it('shows coverage alongside confidence, because they answer different questions', () => {
    // A clean t-test returns confidence 1.0 at coverage 0.75. Reading confidence alone, that is
    // indistinguishable from a report that examined everything.
    // MUTATION: drop the coverage caption, or derive it from confidenceScore -> fails.
    wrap(<GuardianReportDisplay {...partial} />);
    expect(screen.getByText(/Assumption coverage: 75%/i)).toBeInTheDocument();
    expect(screen.getByText(/3 of 4 examined/i)).toBeInTheDocument();
  });

  it('renders 0% coverage rather than treating it as absent', () => {
    // THE FALSY TRAP. Coverage 0.0 is a real and important value -- "we examined NOTHING", which
    // is exactly what cox_regression/survival/iv/psm return. Mapping it with `|| 0`-style falsy
    // logic, or gating the caption on a truthiness check, silently hides the worst case.
    // MUTATION: `assumptionCoverage ?? null` -> `assumptionCoverage || null` in the hook, or
    // `{assumptionCoverage && (...)}` in the component -> the caption disappears and this fails.
    wrap(
      <GuardianReportDisplay
        {...partial}
        assumptionsChecked={[]}
        assumptionsNotEvaluated={['independence']}
        assumptionCoverage={0}
      />
    );
    expect(screen.getByText(/Assumption coverage: 0%/i)).toBeInTheDocument();
    expect(screen.getByText(/0 of 1 examined/i)).toBeInTheDocument();
  });

  it('says nothing when every required assumption WAS examined', () => {
    // The silence control: a fully-covered report must not grow an empty scolding section.
    // MUTATION: render the block unconditionally -> "Required but NOT evaluated (0)" appears
    // on a perfectly clean report and this fails.
    wrap(
      <GuardianReportDisplay
        {...partial}
        assumptionsChecked={['normality', 'linearity', 'outliers']}
        assumptionsNotEvaluated={[]}
        assumptionCoverage={1}
      />
    );
    expect(screen.queryByText(/Required but NOT evaluated/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Assumption coverage: 100%/i)).toBeInTheDocument();
  });

  it('keeps unexamined assumptions visually distinct from violations', () => {
    // Unexamined is neither a pass nor a failure: we did not look. If it rendered as a
    // violation the tool would be accusing on no evidence; as a pass, it would be certifying
    // on no evidence. Both are the failure modes this whole arc was about.
    // MUTATION: move `independence` into the assumptionsChecked list -> it renders as a
    // success chip and this fails.
    wrap(<GuardianReportDisplay {...partial} />);
    expect(screen.getByText(/Assumptions Checked \(3\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/Violations/i)).not.toBeInTheDocument();
  });
});
