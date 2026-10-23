/**
 * PCA Analysis says plainly that it can't run an analysis yet, instead of failing.
 *
 * Before, its upload step answered 500 for every visitor (the PCA API calls send no sign-in
 * token), then said "Data uploaded successfully!" about a made-up project and went no further;
 * running the analysis failed on the demo project even when signed in. See the comment at the
 * top of PCAAnalysisPage.jsx.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PCAAnalysisPage from '../PCAAnalysisPage';
import * as pcaApi from '../../api/pcaApi';

jest.mock('../../components/pca/PcaIntroduction', () => () => 'PCA introduction (mocked)');
jest.mock('../../components/education/EducationalBanner', () => () => null);
// The page must not call the PCA API at all; mocked, so a call is counted rather than sent.
jest.mock('../../api/pcaApi', () => ({
  uploadPcaData: jest.fn(),
  createPcaDemoProject: jest.fn(),
  runPcaAnalysis: jest.fn(),
  getPcaResults: jest.fn(() => new Promise(() => {})),
  fetchPcaResults: jest.fn(() => new Promise(() => {})),
}));

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/pca-analysis/*" element={<PCAAnalysisPage />} />
      </Routes>
    </MemoryRouter>
  );

const originalFetch = global.fetch;
let xhrOpen;
beforeEach(() => {
  global.fetch = jest.fn();
  xhrOpen = jest.spyOn(window.XMLHttpRequest.prototype, 'open'); // what axios uses in the browser
});
afterEach(() => {
  global.fetch = originalFetch;
  xhrOpen.mockRestore();
});

test('says plainly that running PCA is not available, and links to the learning hub', async () => {
  renderAt('/pca-analysis');
  expect(screen.getByText(/Running PCA on your own data isn.t available yet/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open the PCA learning hub' })).toHaveAttribute('href', '/pca-learn');
  expect(await screen.findByText('PCA introduction (mocked)')).toBeInTheDocument();
});

test('the notice is information, not an error', () => {
  renderAt('/pca-analysis');
  expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardInfo');
});

test('offers no upload or run step and sends no request, including on an old result link', async () => {
  for (const path of ['/pca-analysis', '/pca-analysis/3f1c2d9e-0000-4000-8000-000000000000']) {
    const { unmount } = renderAt(path);
    await screen.findByText('PCA introduction (mocked)');
    // The old page's buttons, and its uploader's (components/pca/DataUploader.jsx).
    expect(screen.queryByRole('button', { name: /Start Analysis|Select File|Upload|Create Demo|Run/i })).toBeNull();
    expect(screen.queryByText(/Demo Mode|uploaded successfully/i)).toBeNull();
    unmount();
  }
  expect(global.fetch).not.toHaveBeenCalled();
  expect(xhrOpen).not.toHaveBeenCalled();
  const called = Object.entries(pcaApi).filter(([, f]) => jest.isMockFunction(f) && f.mock.calls.length);
  expect(called.map(([name]) => name)).toEqual([]);
});
