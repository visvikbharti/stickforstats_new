/**
 * GuardianCascadeSimulator tests
 * ==============================
 * - renders without crashing
 * - exercises the scenario + mode toggles
 * - drives the backend-anchor button (mocked Guardian endpoint) and asserts the
 *   routing-verification result renders (loading -> done)
 *
 * The component draws to <canvas> and reads window.matchMedia /
 * requestAnimationFrame, none of which jsdom implements by default, so those are
 * stubbed here. The animation loop is neutralised (rAF is a no-op) so the
 * Monte-Carlo does not spin during the test.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import { getTheme } from '../../../../theme';
import GuardianCascadeSimulator from '../GuardianCascadeSimulator';
import guardianService from '../../../../services/GuardianService';

// Mock the Guardian backend service (singleton default export).
jest.mock('../../../../services/GuardianService', () => ({
  __esModule: true,
  default: {
    checkAssumptions: jest.fn(),
  },
}));

const theme = getTheme('light');
const renderSim = () =>
  render(
    <ThemeProvider theme={theme}>
      <GuardianCascadeSimulator />
    </ThemeProvider>
  );

beforeAll(() => {
  // window.matchMedia (used for prefers-reduced-motion)
  window.matchMedia =
    window.matchMedia ||
    jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

  // Neutralise the animation loop so the Monte-Carlo does not run during tests.
  global.requestAnimationFrame = jest.fn(() => 1);
  global.cancelAnimationFrame = jest.fn();

  // Stub a 2D canvas context (jsdom returns null without the `canvas` package).
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    setTransform: jest.fn(),
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    arcTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    globalAlpha: 1,
  }));
});

beforeEach(() => {
  guardianService.checkAssumptions.mockReset();
});

describe('GuardianCascadeSimulator', () => {
  it('renders without crashing', () => {
    renderSim();
    expect(screen.getByText(/Why one t-test isn/i)).toBeInTheDocument();
    // Honest-labelling notice must be present (integrity brand).
    expect(
      screen.getByText(/fast in-browser simulation that reproduces the backend calibration/i)
    ).toBeInTheDocument();
    // The default scenario (S2) verdict headline.
    expect(screen.getByText(/variance heterogeneity in an unbalanced design/i)).toBeInTheDocument();
  });

  it('switches scenario when a scenario toggle is pressed', () => {
    renderSim();
    const s6 = screen.getByRole('button', { name: /S6 · both/i });
    fireEvent.click(s6);
    expect(s6).toHaveAttribute('aria-pressed', 'true');
    // S6 verdict headline should now be shown. Match a phrase unique to the
    // verdict title — the S6 toggle-button hint also contains "the honest limit".
    expect(
      screen.getByText(/why variance-aware routing is the fix/i)
    ).toBeInTheDocument();
  });

  it('reveals the "How to read this" guide when the toggle is pressed', async () => {
    renderSim();
    // The guide is collapsed (unmountOnExit) — its section headers are absent.
    expect(screen.queryByText(/THE SIX SCENARIOS/i)).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /How to read this simulator/i })
    );
    expect(await screen.findByText(/THE SIX SCENARIOS/i)).toBeInTheDocument();
    expect(screen.getByText(/THE CONTROLS/i)).toBeInTheDocument();
    expect(screen.getByText(/THE READOUTS/i)).toBeInTheDocument();
  });

  it('switches measurement mode when the Power toggle is pressed', () => {
    renderSim();
    const power = screen.getByRole('button', { name: /Power \(real effect\)/i });
    fireEvent.click(power);
    expect(power).toHaveAttribute('aria-pressed', 'true');
    // In Power mode the published-benchmark strip is hidden.
    expect(screen.queryByText(/COMPARED AGAINST THE PUBLISHED BENCHMARK/i)).not.toBeInTheDocument();
  });

  it('anchors the current draw to the production Guardian and reports the routing match', async () => {
    // Backend reports a variance-homogeneity violation -> derived route = Welch.
    guardianService.checkAssumptions.mockResolvedValue({
      violations: [{ assumption: 'variance_homogeneity', severity: 'warning', p_value: 0.012 }],
      confidence_score: 0.72,
      can_proceed: true,
    });

    renderSim();
    const btn = screen.getByRole('button', {
      name: /Run this exact draw through the production Guardian/i,
    });
    fireEvent.click(btn);

    // Service called with the two-sample draw + t_test contract.
    expect(guardianService.checkAssumptions).toHaveBeenCalledTimes(1);
    const [data, testType, alpha] = guardianService.checkAssumptions.mock.calls[0];
    expect(data).toHaveProperty('group1');
    expect(data).toHaveProperty('group2');
    expect(testType).toBe('t_test');
    expect(alpha).toBe(0.05);

    // Result alert renders once the promise resolves.
    await screen.findByText(/production Guardian routed to/i);
    expect(screen.getByText(/Levene p=0.0120/i)).toBeInTheDocument();
  });

  it('degrades gracefully when the Guardian endpoint is unreachable', async () => {
    guardianService.checkAssumptions.mockRejectedValue(new Error('Network down'));
    renderSim();
    fireEvent.click(
      screen.getByRole('button', {
        name: /Run this exact draw through the production Guardian/i,
      })
    );
    await screen.findByText(/Guardian endpoint unreachable/i);
    // The component itself must not crash — its heading is still present.
    expect(screen.getByText(/Why one t-test isn/i)).toBeInTheDocument();
  });
});
