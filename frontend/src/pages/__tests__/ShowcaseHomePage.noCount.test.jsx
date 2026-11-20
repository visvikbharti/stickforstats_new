/**
 * The home page does not count the statistical tests, and it counts the education hubs as they are.
 *
 * Three of its sentences said "46+ statistical tests". Nobody has counted that many tests that a
 * visitor can run from the navigation, and the landing page stopped saying it first. The three
 * sentences stand as they were, without the count.
 *
 * The third said "8 education hubs". The Learning Hub lists seven, and seven have an address.
 */
import fs from 'fs';
import path from 'path';
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
    'StickForStats is an open-source statistical platform featuring statistical tests, 7 education hubs, Guardian assumption checking, Publication Plot Builder, and more.'
  );
  expect(text).not.toMatch(/46/);
  expect(text).not.toMatch(/\d+\+?\s*statistical tests/i);
});

test('the number of education hubs is the number the Learning Hub lists and the routes serve', () => {
  const source = (relative) => fs.readFileSync(path.join(__dirname, '../..', relative), 'utf8');
  const served = source('routes/routeConfig.js').match(/path: '\/[a-z]+-learn'/g).map((entry) => entry.slice(7, -1));
  const listed = source('components/education/LearningHub.jsx').match(/route: '\/[a-z]+-learn'/g).map((entry) => entry.slice(8, -1));
  expect(served).toHaveLength(7);
  expect([...listed].sort()).toEqual([...served].sort());
  render(
    <MemoryRouter>
      <ShowcaseHomePage />
    </MemoryRouter>
  );
  const counts = pageText().match(/\d+ education hubs/g);
  expect(counts).toEqual([`${served.length} education hubs`]);
});
