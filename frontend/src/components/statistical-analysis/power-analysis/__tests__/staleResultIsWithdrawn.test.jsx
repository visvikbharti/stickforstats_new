/**
 * The hook pattern that withdraws a stale answer — and must not kill the feature doing it.
 *
 * `results` in PowerAnalysisTool was only ever cleared by the Reset button, so every input could be
 * changed underneath a standing answer: the result card, the curve and the generated R/Python all
 * went on describing the PREVIOUS design under the new settings. The script made it plainly
 * self-contradictory, since it reads the parent from live state and the ARE from `results`:
 *
 *     # This analysis assumes a Laplace (heavy-tailed) parent, ARE = 0.9549
 *
 * — naming one distribution and computing with another, in one line. (A Laplace parent has
 * ARE = 1.5.)
 *
 * The fix is an effect that clears the result whenever an input changes, and bumps a monotonic
 * request id so a response launched under the OLD inputs cannot land under the new ones.
 *
 * That fix is dangerous in the obvious way: bump the id at the wrong moment and every response is
 * discarded as superseded, the button does nothing, and the feature is dead — silently, with no
 * error. So this pins BOTH halves. It reproduces the hook wiring exactly (primitive deps, async
 * resolve, requestRef) without MUI, which is the part under test.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

/** The exact shape of PowerAnalysisTool's staleness wiring. */
function Harness({ compute }) {
  const [effectSize, setEffectSize] = useState(0.5);
  const [parentDistribution, setParentDistribution] = useState('normal');
  const [results, setResults] = useState(null);
  const requestRef = useRef(0);

  // Deps are the INPUTS, all primitives. `results` is what this effect writes, so it is not a dep.
  useEffect(() => {
    requestRef.current += 1;
    setResults(null);
  }, [effectSize, parentDistribution]);

  const calculate = useCallback(async () => {
    const requestId = ++requestRef.current;
    const value = await compute(effectSize, parentDistribution);
    if (requestId !== requestRef.current) return; // superseded
    setResults(value);
  }, [compute, effectSize, parentDistribution]);

  return (
    <div>
      <button onClick={calculate}>Calculate</button>
      <input aria-label="effect size" value={effectSize} onChange={(e) => setEffectSize(Number(e.target.value))} />
      <button onClick={() => setParentDistribution('laplace')}>Set Laplace</button>
      <div data-testid="result">{results === null ? '—' : results}</div>
    </div>
  );
}

const flush = () => act(() => Promise.resolve());

describe('the Calculate button still works', () => {
  it('an answer appears on a fresh mount and click', async () => {
    render(<Harness compute={async () => 'POWER 80.1%'} />);

    fireEvent.click(screen.getByText('Calculate'));

    // If the clearing effect bumped the id at the wrong moment, this response would be thrown away
    // as superseded and the result would stay at the em dash forever.
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('POWER 80.1%'));
  });

  it('an answer appears again after an input changes and Calculate is clicked', async () => {
    render(<Harness compute={async (d) => `POWER for d=${d}`} />);

    fireEvent.click(screen.getByText('Calculate'));
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('POWER for d=0.5'));

    fireEvent.change(screen.getByLabelText('effect size'), { target: { value: '0.8' } });
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('—')); // withdrawn

    fireEvent.click(screen.getByText('Calculate'));
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('POWER for d=0.8'));
  });

  it('setting the result does not re-trigger the clearing effect', async () => {
    // The trap: if `results` were in the effect's dep list, writing it would immediately clear it,
    // and the answer would flash and vanish on every single click.
    render(<Harness compute={async () => 'STABLE'} />);

    fireEvent.click(screen.getByText('Calculate'));
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('STABLE'));

    await flush();
    await flush();
    expect(screen.getByTestId('result')).toHaveTextContent('STABLE'); // still there
  });
});

describe('a standing answer is withdrawn when the design changes underneath it', () => {
  it('changing the parent distribution clears the result', async () => {
    render(<Harness compute={async (_d, parent) => `POWER under ${parent}`} />);

    fireEvent.click(screen.getByText('Calculate'));
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('POWER under normal'));

    // Flip the parent WITHOUT recalculating. The standing answer was computed under a normal
    // parent; it is not the answer to this question any more, and the generated script must not go
    // on quoting its ARE under a Laplace heading.
    fireEvent.click(screen.getByText('Set Laplace'));

    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('—'));
  });

  it('a response launched under the OLD inputs cannot land under the new ones', async () => {
    // The race the requestRef bump exists for: click, change an input while the request is still in
    // flight, and the old answer must never appear against the new design.
    let resolveFirst;
    const compute = jest
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockImplementation(async () => 'NEW');

    render(<Harness compute={compute} />);

    fireEvent.click(screen.getByText('Calculate')); // in flight
    fireEvent.change(screen.getByLabelText('effect size'), { target: { value: '0.8' } });

    await act(async () => {
      resolveFirst('STALE ANSWER FOR d=0.5');
    });

    expect(screen.getByTestId('result')).not.toHaveTextContent('STALE ANSWER FOR d=0.5');
    expect(screen.getByTestId('result')).toHaveTextContent('—');
  });
});
