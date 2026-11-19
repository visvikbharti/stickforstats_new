/**
 * The home page does not count the statistical tests.
 *
 * Three of its sentences said "46+ statistical tests". Nobody has counted that many tests that a
 * visitor can run from the navigation, and the landing page stopped saying it first. The three
 * sentences stand as they were, without the count.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ShowcaseHomePage from '../ShowcaseHomePage';

const pageText = () => document.body.textContent.replace(/\s+/g, ' ');

test('the three sentences stand without a count of tests', () => {
  render(
    <MemoryRouter>
      <ShowcaseHomePage />
    </MemoryRouter>
  );
  const text = pageText();
  expect(text).toContain(
    'Featuring statistical tests, Guardian assumption checking, and publication-quality visualizations.'
  );
  expect(text).toContain(
    'StickForStats provides statistical tests across multiple modules, with Guardian assumption checking and publication-quality visualizations.'
  );
  expect(text).toContain(
    'StickForStats is an open-source statistical platform featuring statistical tests, 8 education hubs, Guardian assumption checking, Publication Plot Builder, and more.'
  );
  expect(text).not.toMatch(/46/);
  expect(text).not.toMatch(/\d+\+?\s*statistical tests/i);
});
