/**
 * The Machine Learning module must not promise that data stays in the browser (issue #31 item 5:
 * the tools page must not contradict itself about where computation happens).
 *
 * It said "All ML training happens in your browser using TensorFlow.js. Your data never leaves your
 * computer". TensorFlow.js is not a dependency, and Linear Regression sends the selected columns to
 * the server for Guardian's assumption checks.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import MachineLearning from '../MachineLearning';

jest.mock('../LinearRegressionML', () => () => null);
jest.mock('../Classification', () => () => null);
jest.mock('../Clustering', () => () => null);

test('the module says where models are trained and what is sent to the server', () => {
  render(<MachineLearning data={null} onComplete={() => {}} />);
  const text = document.body.textContent.replace(/\s+/g, ' ');
  expect(text).not.toMatch(/never leaves your computer/);
  expect(text).not.toMatch(/TensorFlow/);
  expect(text).toContain(
    'Where it runs: Models are trained in your browser. Linear Regression also sends the variables ' +
      "you select to our server, for Guardian's assumption checks."
  );
});
