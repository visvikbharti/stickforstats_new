/**
 * The calibration benchmark is Fig. 7 of the manuscript.
 *
 * The home page, the page of the live demonstration and the demonstration itself called it
 * "Figure 8", in eight sentences. In the manuscript of this repository
 * (paper/bmc_bioinformatics/manuscript.md) the figure of the calibration benchmark is Fig. 7, and
 * its panel A is the Type I error that the demonstration counts.
 */
import fs from 'fs';
import path from 'path';
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { getTheme } from '../../theme';
import ShowcaseHomePage from '../ShowcaseHomePage';
import WhyGuardianPage from '../WhyGuardianPage';

jest.mock('../../services/GuardianService', () => ({
  __esModule: true,
  default: { checkAssumptions: jest.fn() },
}));

const SRC = path.join(__dirname, '../..');
const REPOSITORY = path.join(SRC, '../..');
const source = (relative) => fs.readFileSync(path.join(SRC, relative), 'utf8');
// the text of the page, every run of white space (the fixed space before the number included) as one space
const pageText = () => document.body.textContent.replace(/\s+/g, ' ');

beforeAll(() => {
  window.matchMedia =
    window.matchMedia ||
    jest.fn().mockImplementation((query) => ({
      matches: false, media: query, onchange: null, addEventListener: jest.fn(), removeEventListener: jest.fn(),
      addListener: jest.fn(), removeListener: jest.fn(), dispatchEvent: jest.fn(),
    }));
  // the demonstration draws on a canvas and runs in animation frames; neither is needed for its text
  global.requestAnimationFrame = jest.fn(() => 1);
  global.cancelAnimationFrame = jest.fn();
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    setTransform: jest.fn(), clearRect: jest.fn(), fillRect: jest.fn(), beginPath: jest.fn(), moveTo: jest.fn(),
    lineTo: jest.fn(), arcTo: jest.fn(), closePath: jest.fn(), stroke: jest.fn(), fill: jest.fn(),
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1,
  }));
});

test('in the manuscript of the repository the calibration benchmark is Fig. 7, and panel A is the Type I error', () => {
  const manuscript = fs.readFileSync(path.join(REPOSITORY, 'paper/bmc_bioinformatics/manuscript.md'), 'utf8');
  expect(manuscript).toContain('![**Fig. 7. Calibration of the Guardian cascade under known ground truth.**');
  expect(manuscript).toContain('(A) Type I error (raw p < 0.05)');
  // and it has no eighth figure
  expect(manuscript.match(/!\[\*\*Fig\. \d+\./g)).toEqual([1, 2, 3, 4, 5, 6, 7].map((n) => `![**Fig. ${n}.`));
});

test('the home page calls it Fig. 7', () => {
  render(
    <MemoryRouter>
      <ShowcaseHomePage />
    </MemoryRouter>
  );
  expect(pageText()).toContain(
    'a live, reproducible demonstration of the manuscript’s calibration benchmark (Fig. 7), running right in your browser.'
  );
  expect(pageText()).not.toMatch(/Fig(ure)?\.?\s*8/i);
});

test('the page of the demonstration and the demonstration call it Fig. 7', () => {
  render(
    <ThemeProvider theme={getTheme('light')}>
      <WhyGuardianPage />
    </ThemeProvider>
  );
  const text = pageText();
  expect(text).toContain('It reproduces the manuscript’s calibration benchmark (Fig. 7) right in your browser:');
  // of the demonstration, what is on the screen before anything is opened
  expect(text).toContain('benchmark (manuscript Fig. 7) within Monte-Carlo error');
  expect(text).toContain('COMPARED AGAINST THE SUBMITTED BENCHMARK (FIG. 7, PANEL A)');
  expect(text).toContain('This component is Fig. 7 of the manuscript, made interactive');
  expect(text).not.toMatch(/Fig(ure)?\.?\s*8/i);
  expect(screen.getByText(/Why one t-test isn/i)).toBeInTheDocument();
});

test('the eight sentences, in the files that hold them', () => {
  const simulator = source('components/statistical/educational/GuardianCascadeSimulator.jsx');
  const sentences = [
    [source('pages/ShowcaseHomePage.jsx'), 'calibration benchmark (Fig.&nbsp;7), running right in your browser.'],
    [source('pages/WhyGuardianPage.jsx'), 'calibration benchmark (Fig.&nbsp;7) right in your browser:'],
    [simulator, "'The exact Fig. 7 numbers for the current scenario, so you can confirm the live simulation is converging to the submitted result.',"],
    [simulator, 'benchmark</b> (manuscript Fig. 7) within Monte-Carlo error'],
    [simulator, 'COMPARED AGAINST THE SUBMITTED BENCHMARK (FIG. 7, PANEL A)'],
    [simulator, 'This component is Fig. 7 of the manuscript, made interactive'],
    [simulator, 'This widget is <b>Fig. 7 of the manuscript, made interactive</b>.'],
    [simulator, 'StickForStats calibration benchmark (Fig. 7), seed'],
  ];
  expect(sentences).toHaveLength(8);
  // The manuscript is under review, and the demonstration says "submitted" of its benchmark, in five places.
  expect(simulator.match(/submitted/gi)).toHaveLength(6);          // the five, and the comment beside the strip
  expect(simulator).not.toMatch(/published/i);
  for (const words of ['line up with the submitted numbers.', "'Submitted-benchmark strip',", 'converging to the submitted result.',
    'settle onto the submitted-benchmark strip,', 'COMPARED AGAINST THE SUBMITTED BENCHMARK (FIG. 7, PANEL A)']) {
    expect(simulator).toContain(words);
  }
  sentences.forEach(([text, sentence]) => expect(text.split(sentence)).toHaveLength(2));
});

test('no file of the client calls the benchmark Figure 8', () => {
  const found = [];
  const walk = (directory) => {
    fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__') walk(full);
      } else if (/\.(jsx?|tsx?|md)$/.test(entry.name) && /fig(ure)?\.?(&nbsp;|\s)*8\b/i.test(fs.readFileSync(full, 'utf8'))) {
        found.push(path.relative(SRC, full));
      }
    });
  };
  walk(SRC);
  expect(found).toEqual([]);
});
