/**
 * PlainEnglishResults Tests (Pillar 1)
 * ====================================
 *
 * Renders the autonomous pipeline's output in three modes (Plain English,
 * Researcher, APA). Flips tabs, surfaces significance banners, forwards
 * next-step clicks to the parent, and renders warnings + confidence score.
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';

import PlainEnglishResults from '../PlainEnglishResults';
import { getTheme } from '../../../theme';

const wrap = (ui) => render(<ThemeProvider theme={getTheme('light')}>{ui}</ThemeProvider>);

const makeResult = (overrides = {}) => ({
  translation: {
    summary: 'Group A is significantly higher than Group B.',
    is_significant: true,
    effect_size_interpretation: 'large',
    ...overrides.translation,
  },
  cascade_result: {
    confidence_score: 0.92,
    result: {
      effect_size: 0.82,
      p_value: 0.003,
    },
    ...overrides.cascade_result,
  },
  warnings: overrides.warnings ?? [],
  suggested_next_steps: overrides.suggested_next_steps ?? [],
  ...overrides.root,
});

describe('PlainEnglishResults — empty state', () => {
  it('renders nothing when no result is supplied', () => {
    const { container } = wrap(<PlainEnglishResults result={null} mode="plain_english" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('PlainEnglishResults — significant result', () => {
  it('shows the significance banner and the translation summary', () => {
    wrap(<PlainEnglishResults result={makeResult()} mode="plain_english" />);
    // Summary appears twice (banner + PlainEnglishTab); both should render.
    expect(
      screen.getAllByText(/group a is significantly higher/i).length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/statistically significant result/i)).toBeInTheDocument();
  });

  it('switches to Researcher tab on click and calls onModeChange', () => {
    const onModeChange = jest.fn();
    wrap(
      <PlainEnglishResults
        result={makeResult()}
        mode="plain_english"
        onModeChange={onModeChange}
      />
    );
    const researcherTab = screen.getByRole('tab', { name: /researcher view/i });
    fireEvent.click(researcherTab);
    expect(onModeChange).toHaveBeenCalledWith('researcher');
  });

  it('exposes three tabs in the correct order', () => {
    wrap(<PlainEnglishResults result={makeResult()} mode="plain_english" />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent(/plain english/i);
    expect(tabs[1]).toHaveTextContent(/researcher view/i);
    expect(tabs[2]).toHaveTextContent(/apa format/i);
  });
});

describe('PlainEnglishResults — non-significant result', () => {
  it('renders the warning-variant banner with the summary text', () => {
    const result = makeResult({
      translation: {
        summary: 'No significant difference detected.',
        is_significant: false,
      },
    });
    wrap(<PlainEnglishResults result={result} mode="plain_english" />);
    expect(screen.getAllByText(/no significant difference/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/not statistically significant/i)).toBeInTheDocument();
  });
});

describe('PlainEnglishResults — next-step forwarding', () => {
  it('passes the step action to onNextStep when a step card is clicked', () => {
    const onNextStep = jest.fn();
    const action = { test: 'tukey_hsd', groups: 3 };
    const result = makeResult({
      suggested_next_steps: [
        {
          step: 'Run pairwise post-hoc tests',
          description: 'Follow up the significant omnibus ANOVA.',
          priority: 'high',
          action,
        },
      ],
    });
    wrap(
      <PlainEnglishResults
        result={result}
        mode="plain_english"
        onNextStep={onNextStep}
      />
    );
    const stepButton = screen
      .getByText(/run pairwise post-hoc tests/i)
      .closest('button');
    expect(stepButton).toBeInTheDocument();
    fireEvent.click(stepButton);
    expect(onNextStep).toHaveBeenCalledTimes(1);
    expect(onNextStep).toHaveBeenCalledWith(action);
  });
});
