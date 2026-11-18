/**
 * The two places where the question page turns what the server sends into what it shows.
 * The page test (pages/__tests__/SmartAnalysisPage.answers.test.jsx) runs the whole page on the
 * server's own answers; these are the cases that one saved answer does not hold.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { getTheme } from '../../../theme';
import PlainEnglishResults, { interpretationLabel } from '../PlainEnglishResults';
import apiClient from '../../../services/api';
import { profileData, variableList } from '../../../services/AutonomousService';

jest.mock('../../../services/api', () => {
  const client = { get: jest.fn(), post: jest.fn() };
  return { __esModule: true, default: client, apiClient: client };
});

describe('the variables of a profile', () => {
  test('an object keyed by name becomes a list, and every field is kept', () => {
    const sent = {
      dose: { type: 'continuous', n_unique: 38, missing_pct: 0, is_normal: true, mean: 1.5 },
      arm: { type: 'nominal', n_unique: 2, missing_pct: 2.5, is_normal: null, categories: ['a', 'b'] },
      titre: { type: 'continuous', n_unique: 30, missing_pct: 0, is_normal: false },
    };
    expect(variableList(sent)).toEqual([
      { name: 'dose', type: 'continuous', n_unique: 38, unique_values: 38, missing_pct: 0, is_normal: true, normality: 'normal', mean: 1.5 },
      { name: 'arm', type: 'nominal', n_unique: 2, unique_values: 2, missing_pct: 2.5, is_normal: null, normality: null, categories: ['a', 'b'] },
      { name: 'titre', type: 'continuous', n_unique: 30, unique_values: 30, missing_pct: 0, is_normal: false, normality: 'not normal' },
    ]);
  });

  test('a list is left as it is, and nothing is an empty list', () => {
    const list = [{ name: 'dose', type: 'continuous' }];
    expect(variableList(list)).toBe(list);
    expect(variableList(undefined)).toEqual([]);
    expect(variableList(null)).toEqual([]);
    expect(variableList('dose')).toEqual([]);
  });
});

describe('a profile, however the data were sent', () => {
  const sent = { profile: { n_rows: 3 }, variables: { dose: { type: 'continuous', n_unique: 3, missing_pct: 0, is_normal: true } } };

  test('rows sent as JSON come back with the variables as a list too', async () => {
    apiClient.post.mockResolvedValue({ data: sent });
    const profile = await profileData([{ dose: 1 }, { dose: 2 }, { dose: 3 }]);
    expect(apiClient.post).toHaveBeenCalledWith('/v1/autonomous/profile/', { data: [{ dose: 1 }, { dose: 2 }, { dose: 3 }] });
    expect(profile.variables.map((v) => v.name)).toEqual(['dose']);
    expect(profile.profile).toEqual({ n_rows: 3 });
  });

  test('a file comes back with the variables as a list', async () => {
    apiClient.post.mockResolvedValue({ data: sent });
    const profile = await profileData(new File(['dose\n1\n2\n3\n'], 'doses.csv', { type: 'text/csv' }));
    expect(profile.variables).toEqual([
      { name: 'dose', type: 'continuous', n_unique: 3, unique_values: 3, missing_pct: 0, is_normal: true, normality: 'normal' },
    ]);
  });
});

describe('the interpretation of an effect size', () => {
  test('is the label of the object the server sends', () => {
    expect(interpretationLabel({ category: 'very strong', label: 'Very strong' })).toBe('Very strong');
    expect(interpretationLabel({ category: 'odds_ratio', label: 'OR = 6.40' })).toBe('OR = 6.40');
    expect(interpretationLabel({ category: 'large' })).toBe('');
    expect(interpretationLabel('medium')).toBe('medium');
    expect(interpretationLabel(null)).toBe('');
    expect(interpretationLabel(undefined)).toBe('');
  });

  test('a label that restates the number is put after it in the sentence for a report', async () => {
    const answer = {
      translation: {
        summary: 'There IS a significant association (odds ratio = 6.40).',
        is_significant: true,
        effect_size_interpretation: { category: 'odds_ratio', label: 'OR = 6.40' },
      },
      cascade_result: {
        original_test: 'fisher_exact', final_test: 'fisher_exact', n_cascades: 0, cascade_path: [],
        result: { test_name: "Fisher's Exact Test", statistic: 6.4, p_value: 0.01, effect_size: 6.4, effect_size_name: 'Odds Ratio' },
      },
      warnings: [],
      suggested_next_steps: [],
    };
    render(
      <ThemeProvider theme={getTheme('light')}>
        <PlainEnglishResults result={answer} mode="plain_english" />
      </ThemeProvider>
    );
    expect(screen.getByText('OR = 6.40')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /apa/i }));
    expect(await screen.findByText(/The effect size was 6\.40 \(OR = 6\.40\)\./)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\[object Object\]|indicating a or = /i);
  });
});
