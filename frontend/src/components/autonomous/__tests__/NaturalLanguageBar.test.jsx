/**
 * NaturalLanguageBar Tests (Pillar 1)
 * ===================================
 *
 * The natural-language entry point for the autonomous analysis pipeline.
 * Given a data source and a plain-English question, it calls
 * `queryAnalysis` on the backend and forwards the result up through the
 * `onResult` callback.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';

import NaturalLanguageBar from '../NaturalLanguageBar';
import { getTheme } from '../../../theme';

jest.mock('../../../services/AutonomousService', () => ({
  queryAnalysis: jest.fn(),
}));
const { queryAnalysis } = require('../../../services/AutonomousService');

const wrap = (ui) => render(<ThemeProvider theme={getTheme('light')}>{ui}</ThemeProvider>);

beforeEach(() => {
  queryAnalysis.mockReset();
  localStorage.clear();
});

describe('NaturalLanguageBar — rendering', () => {
  it('shows the query placeholder and the disabled Send button by default', () => {
    wrap(<NaturalLanguageBar dataSource="profile-123" />);
    expect(screen.getByPlaceholderText(/ask a question about your data/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit query/i })).toBeDisabled();
  });

  it('history button is disabled when the history is empty', () => {
    wrap(<NaturalLanguageBar dataSource="profile-123" />);
    expect(screen.getByRole('button', { name: /query history/i })).toBeDisabled();
  });
});

describe('NaturalLanguageBar — submission flow', () => {
  it('calls queryAnalysis and surfaces the result via onResult', async () => {
    const onResult = jest.fn();
    const resultPayload = {
      test_type: 't_test',
      p_value: 0.03,
      plain_english: 'Group A is significantly higher than Group B.',
    };
    queryAnalysis.mockResolvedValue(resultPayload);

    wrap(
      <NaturalLanguageBar
        dataSource="profile-123"
        onResult={onResult}
      />
    );

    const input = screen.getByPlaceholderText(/ask a question about your data/i);
    await act(async () => {
      fireEvent.change(input, {
        target: { value: 'Is group A different from group B?' },
      });
    });

    const submit = screen.getByRole('button', { name: /submit query/i });
    expect(submit).not.toBeDisabled();
    await act(async () => {
      fireEvent.click(submit);
    });

    await waitFor(() => {
      expect(queryAnalysis).toHaveBeenCalledTimes(1);
    });
    expect(queryAnalysis).toHaveBeenCalledWith(
      'Is group A different from group B?',
      'profile-123',
      expect.any(String),
      0.05
    );
    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(resultPayload);
    });
  });

  it('forwards backend errors to onError', async () => {
    const onError = jest.fn();
    queryAnalysis.mockRejectedValue({
      response: { data: 'upstream service unavailable' },
    });

    wrap(<NaturalLanguageBar dataSource="profile-123" onError={onError} />);

    const input = screen.getByPlaceholderText(/ask a question about your data/i);
    await act(async () => {
      fireEvent.change(input, { target: { value: 'regression?' } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit query/i }));
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('upstream service unavailable');
    });
  });

  it('does not submit when there is no data source', async () => {
    wrap(<NaturalLanguageBar />);
    const input = screen.getByPlaceholderText(/ask a question about your data/i);
    await act(async () => {
      fireEvent.change(input, { target: { value: 'anything' } });
    });
    // Send button stays enabled by query text, but clicking shouldn't call
    // the backend because effectiveDataSource is falsy.
    const submit = screen.getByRole('button', { name: /submit query/i });
    await act(async () => {
      fireEvent.click(submit);
    });
    expect(queryAnalysis).not.toHaveBeenCalled();
  });
});
