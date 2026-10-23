/**
 * Survival Analysis and Factor Analysis say plainly that they can't run an analysis yet,
 * instead of faking success.
 *
 * Both pages' upload step was PCA's uploader, which posts to the PCA project API. When that
 * failed, it said "Data uploaded successfully!" or "Demo project created successfully (Offline
 * Mode)!" about a project that did not exist, and the page went no further. See the comments at
 * the top of SurvivalAnalysisPage.jsx and FactorAnalysisPage.jsx.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SurvivalAnalysisPage from '../SurvivalAnalysisPage';
import FactorAnalysisPage from '../FactorAnalysisPage';
import * as pcaApi from '../../api/pcaApi';

jest.mock('../../components/survival/SurvivalIntroduction', () => () => 'Survival introduction (mocked)');
jest.mock('../../components/factor/FactorIntroduction', () => () => 'Factor introduction (mocked)');
// The pages must not call the PCA API, as the old uploader did; mocked, so a call is counted rather than sent.
jest.mock('../../api/pcaApi', () => ({
  uploadPcaData: jest.fn(),
  createPcaDemoProject: jest.fn(),
  runPcaAnalysis: jest.fn(),
  getPcaResults: jest.fn(() => new Promise(() => {})),
  fetchPcaResults: jest.fn(() => new Promise(() => {})),
}));

const PAGES = [
  {
    name: 'Survival Analysis',
    Page: SurvivalAnalysisPage,
    path: '/survival-analysis',
    intro: 'Survival introduction (mocked)',
    title: /Running survival analysis on your own data isn.t available yet/,
  },
  {
    name: 'Factor Analysis',
    Page: FactorAnalysisPage,
    path: '/factor-analysis',
    intro: 'Factor introduction (mocked)',
    title: /Running factor analysis on your own data isn.t available yet/,
  },
];

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

describe.each(PAGES)('$name', ({ Page, path, intro, title }) => {
  const renderAt = (url) =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={`${path}/*`} element={<Page />} />
        </Routes>
      </MemoryRouter>
    );

  test('says plainly, as information, that running the analysis is not available', async () => {
    renderAt(path);
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardInfo');
    expect(await screen.findByText(intro)).toBeInTheDocument();
  });

  test('offers no upload or run step and sends no request, also on an old link', async () => {
    for (const url of [path, `${path}/3f1c2d9e-0000-4000-8000-000000000000`]) {
      const { unmount } = renderAt(url);
      await screen.findByText(intro);
      // The old page's buttons, and its uploader's (components/pca/DataUploader.jsx).
      expect(screen.queryByRole('button', { name: /Start Analysis|Get Started|Select File|Upload|Create Demo|Run/i })).toBeNull();
      expect(screen.queryByText(/Offline Mode|uploaded successfully|created successfully/i)).toBeNull();
      // The educational banner fell back to PCA's lessons on these pages.
      expect(screen.queryByText(/Learn PCA/)).toBeNull();
      unmount();
    }
    expect(global.fetch).not.toHaveBeenCalled();
    expect(xhrOpen).not.toHaveBeenCalled();
    const called = Object.entries(pcaApi).filter(([, f]) => jest.isMockFunction(f) && f.mock.calls.length);
    expect(called.map(([name]) => name)).toEqual([]);
  });
});
