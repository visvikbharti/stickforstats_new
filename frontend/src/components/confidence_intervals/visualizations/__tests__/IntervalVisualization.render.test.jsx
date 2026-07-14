/**
 * Regression test: IntervalVisualization must render.
 *
 * It used to name `generateDistributionCurve` in its useEffect dependency array
 * while declaring that function as a component-scoped const three lines BELOW the
 * hook. A deps array is evaluated during render, so every single render read the
 * binding inside its temporal dead zone and threw
 *
 *     ReferenceError: Cannot access 'generateDistributionCurve' before initialization
 *
 * The component's own early return ("No data to visualize") sits after the hooks,
 * so even the empty-props render crashed — which is what this test pins down.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

import IntervalVisualization from '../IntervalVisualization';

// d3 and jstat ship ESM, which CRA's jest does not transform. Stub them with a
// chainable proxy. This does not weaken the test: the TDZ ReferenceError fires when
// the useEffect deps array is evaluated *during render*, long before any d3 call.
jest.mock('d3', () => {
  const chain = new Proxy(function () {}, {
    get: () => chain,
    apply: () => chain,
  });
  return new Proxy({}, { get: () => chain });
});
jest.mock('jstat', () => ({
  jStat: new Proxy({}, { get: () => new Proxy(function () {}, { get: () => () => 0, apply: () => 0 }) }),
}));

describe('IntervalVisualization', () => {
  it('renders with no result instead of throwing a TDZ ReferenceError', () => {
    expect(() => render(<IntervalVisualization />)).not.toThrow();
    expect(screen.getByText(/No data to visualize/i)).toBeTruthy();
  });

  it('renders a real interval result without throwing', () => {
    const result = {
      lower_bound: 9.2,
      upper_bound: 11.4,
      point_estimate: 10.3,
      interval_type: 'MEAN_T',
      confidence_level: 0.95,
      sample_size: 30,
    };
    expect(() => render(<IntervalVisualization result={result} />)).not.toThrow();
  });
});
