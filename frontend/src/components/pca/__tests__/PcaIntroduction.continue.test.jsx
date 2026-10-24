/**
 * The introduction offers "Continue to Data Upload" only where an upload step follows.
 * PCAAnalysisPage.jsx shows it with no upload step, and passes no onNext; the button did nothing.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PcaIntroduction from '../PcaIntroduction';

// d3 draws the figures; any call returns the same chainable stub, which is enough for jsdom.
jest.mock('d3', () => {
  const stub = new Proxy(function d3Stub() {}, {
    get: (target, prop) => (prop === 'then' || typeof prop === 'symbol' ? undefined : stub),
    apply: () => stub,
  });
  return stub;
});

const renderIntro = (props) => render(<MemoryRouter><PcaIntroduction {...props} /></MemoryRouter>);

test('no Continue button without a next step', () => {
  renderIntro({});
  expect(screen.queryByRole('button', { name: 'Continue to Data Upload' })).toBeNull();
});

test('the Continue button is there when a next step is given', () => {
  renderIntro({ onNext: () => {} });
  expect(screen.getByRole('button', { name: 'Continue to Data Upload' })).toBeInTheDocument();
});
