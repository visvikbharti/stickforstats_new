/**
 * The question page shows what the server sends: the profile of an uploaded file, and, where the
 * answer to a question would be, the one sentence with which the server answers every question in
 * this version.
 *
 * The page was written for other shapes than the endpoints send, and its tests replaced the
 * service with answers in those shapes. With the server's own profile the page crashed after the
 * upload: `variables` is an object keyed by the variable's name, and the page called `.map` on it
 * ("t.map is not a function" in the built page).
 *
 * The server cannot read a question (the part that would has never been loaded), and until this
 * version it answered every question with the first test the file suggested. It now answers 501
 * with one sentence. The page showed "Analysis failed" in place of whatever the server said; it
 * shows the server's sentence now, where the answer would be.
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
import SmartAnalysisPage, { NO_QUESTION_IS_READ } from '../SmartAnalysisPage';
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
    if (url.endsWith('/query/')) {
      // what the HTTP client hands over for an answer with status 501
      const refused = new Error('Request failed with status code 501');
      refused.response = { status: saved.refusal.status, data: JSON.parse(JSON.stringify(saved.refusal.body)) };
      return Promise.reject(refused);
    }
    return Promise.reject(new Error(`unexpected request to ${url}`));
  });
});

afterEach(() => jest.clearAllMocks());

test('the saved profile has the shape the server sends: variables keyed by name', () => {
  expect(Array.isArray(saved.profile.variables)).toBe(false);
  expect(Object.keys(saved.profile.variables)).toEqual(['dose', 'response']);
});

const SENTENCE = 'This version cannot read a question, so nothing was analysed. Run the test you want on its own page.';

test('the saved answer to a question is the sentence of the server, with status 501', () => {
  expect(saved.refusal).toEqual({ status: 501, body: { error: SENTENCE } });
  expect(saved.answer).toBeUndefined();
});

test('before a file is uploaded the page says that no question is answered', () => {
  renderPage();
  expect(NO_QUESTION_IS_READ).toBe(
    'This version cannot read a question, so no question is answered here. Run the test you want on its own page.'
  );
  expect(screen.getByText(NO_QUESTION_IS_READ)).toBeInTheDocument();
  expect(screen.queryByText(/ask a question in plain English/i)).not.toBeInTheDocument();
  // the upload is offered as before, and no request has been sent
  expect(screen.getByText('Drag and drop your data file here')).toBeInTheDocument();
  expect(apiClient.post).not.toHaveBeenCalled();
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

const ask = async () => {
  const box = screen.getByPlaceholderText('Ask a question about your data...');
  fireEvent.change(box, { target: { value: saved.question } });
  fireEvent.click(screen.getByRole('button', { name: 'submit query' }));
  await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(expect.stringMatching(/\/query\/$/), expect.anything(), expect.anything()));
  // the box is closed while the question is on its way, and open again when the server has answered
  await waitFor(() => expect(screen.getByPlaceholderText('Ask a question about your data...')).toBeEnabled());
};

test('after a question the page shows the sentence of the server where the answer would be', async () => {
  renderPage();
  await upload();
  await ask();
  const shown = await screen.findByText(SENTENCE);
  expect(shown).toBeInTheDocument();
  // in place of the answer: below the box for the question, and no result beside it
  const box = screen.getByPlaceholderText('Ask a question about your data...');
  expect(box.compareDocumentPosition(shown) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getAllByRole('alert')).toHaveLength(1);
  expect(within(screen.getByRole('alert')).getByText(SENTENCE)).toBeInTheDocument();
  for (const text of [/Analysis failed/, /Statistically Significant/i, /Guardian Confidence Score/i, /Why this test\?/i, /Suggested Next Steps/i]) {
    expect(screen.queryByText(text)).not.toBeInTheDocument();
  }
  // the question was sent with the file, and nothing else was asked of the server
  expect(apiClient.post).toHaveBeenCalledTimes(2);
});

test('the sentence can be closed', async () => {
  renderPage();
  await upload();
  await ask();
  await screen.findByText(SENTENCE);
  fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: /close/i }));
  expect(screen.queryByText(SENTENCE)).not.toBeInTheDocument();
});

test('when no answer comes at all the page says so in the same place', async () => {
  apiClient.post.mockImplementation((url) => {
    if (url.endsWith('/profile/')) return Promise.resolve({ data: JSON.parse(JSON.stringify(saved.profile)) });
    return Promise.reject(new Error('Network Error'));
  });
  renderPage();
  await upload();
  await ask();
  expect(await screen.findByText('Network Error')).toBeInTheDocument();
  expect(screen.queryByText(SENTENCE)).not.toBeInTheDocument();
});
