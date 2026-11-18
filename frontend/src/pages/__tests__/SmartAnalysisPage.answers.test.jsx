/**
 * The question page shows what the server sends: the profile of an uploaded file, and the answer
 * to a question about it.
 *
 * The page was written for other shapes than the two endpoints send, and its tests replaced the
 * service with answers in those shapes. With the server's own answers the page crashed twice:
 * - after the upload: the profile's `variables` is an object keyed by the variable's name, and
 *   the page called `.map` on it ("t.map is not a function" in the built page);
 * - after the answer: `translation.effect_size_interpretation` is an object with a category and
 *   a label, and the page put the object itself into the text.
 *
 * The answers used here are files saved from the two endpoints
 * (fixtures/questionPage.json; backend/tests/test_question_page_fixture.py checks the file against
 * the endpoints). Only the HTTP client is replaced.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import apiClient from '../../services/api';
import { getTheme } from '../../theme';
import SmartAnalysisPage from '../SmartAnalysisPage';
import saved from '../../components/autonomous/__tests__/fixtures/questionPage.json';

jest.mock('../../services/api', () => {
  const client = { get: jest.fn(), post: jest.fn() };
  return { __esModule: true, default: client, apiClient: client };
});

const renderPage = () =>
  render(
    <ThemeProvider theme={getTheme('light')}>
      <SmartAnalysisPage />
    </ThemeProvider>
  );

const upload = async () => {
  const file = new File([saved.csv], 'doses.csv', { type: 'text/csv' });
  fireEvent.drop(screen.getByText('Drag and drop your data file here'), { dataTransfer: { files: [file] } });
  return screen.findByText('Variable Summary');
};

beforeEach(() => {
  apiClient.post.mockImplementation((url) => {
    if (url.endsWith('/profile/')) return Promise.resolve({ data: JSON.parse(JSON.stringify(saved.profile)) });
    if (url.endsWith('/query/')) return Promise.resolve({ data: JSON.parse(JSON.stringify(saved.answer)) });
    return Promise.reject(new Error(`unexpected request to ${url}`));
  });
});

afterEach(() => jest.clearAllMocks());

test('the saved profile has the shape the server sends: variables keyed by name', () => {
  expect(Array.isArray(saved.profile.variables)).toBe(false);
  expect(Object.keys(saved.profile.variables)).toEqual(['dose', 'response']);
  expect(saved.answer.translation.effect_size_interpretation).toEqual({ category: 'very strong', label: 'Very strong' });
});

test('after an upload the page lists the variables of the file', async () => {
  renderPage();
  await upload();
  const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    .map((row) => within(row).getAllByRole('cell').map((c) => c.textContent));
  expect(rows).toEqual([
    ['dose', 'continuous', '38', '0.0%', 'normal'],
    ['response', 'continuous', '38', '0.0%', 'normal'],
  ]);
  // and the question can be asked
  expect(screen.getByText('Ask Your Question')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Ask a question about your data...')).toBeEnabled();
});

test('after a question the page shows the answer', async () => {
  renderPage();
  await upload();
  const box = screen.getByPlaceholderText('Ask a question about your data...');
  fireEvent.change(box, { target: { value: saved.question } });
  fireEvent.click(screen.getByRole('button', { name: 'submit query' }));
  await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(expect.stringMatching(/\/query\/$/), expect.anything(), expect.anything()));
  expect(await screen.findAllByText(/There IS a very strong positive relationship between the variables/)).not.toHaveLength(0);
  expect(screen.getByText('The correlation explains 91.9% of the variation.')).toBeInTheDocument();
  // the interpretation of the effect size is the label the server sends, not the object
  expect(screen.getByText('Very strong')).toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(/\[object Object\]/);
  // the numbers of the answer, as the researcher view shows them
  fireEvent.click(screen.getByRole('tab', { name: /researcher/i }));
  await screen.findByText('Technical Results');
  expect(screen.getByText('Pearson Correlation')).toBeInTheDocument();
  expect(screen.getByText('0.9586')).toBeInTheDocument();      // the statistic, r
  expect(screen.getByText('0.9190')).toBeInTheDocument();      // the effect size, r squared
});

test('the sentence for a report names the magnitude, or gives the label after the number', async () => {
  renderPage();
  await upload();
  fireEvent.change(screen.getByPlaceholderText('Ask a question about your data...'), { target: { value: saved.question } });
  fireEvent.click(screen.getByRole('button', { name: 'submit query' }));
  await screen.findAllByText(/There IS a very strong positive relationship/);
  fireEvent.click(screen.getByRole('tab', { name: /apa/i }));
  expect(await screen.findByText(/The effect size was 0\.92, indicating a very strong effect\./)).toBeInTheDocument();
});
