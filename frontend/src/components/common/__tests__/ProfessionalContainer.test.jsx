/**
 * ProfessionalContainer Tests
 * ===========================
 *
 * After the 2026-04-17 UI redesign, ProfessionalContainer:
 *   - No longer creates its own ThemeProvider — inherits the parent theme.
 *   - Renders a flat surface (background.default) with no decorative blobs.
 *   - Keeps the floating dark-mode + fullscreen icon button chrome.
 *   - Exposes legacy `gradients` / `glassMorphism` / `neumorphism` as
 *     flat-styled objects for source-compatibility with modules still
 *     importing them.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import ProfessionalContainer, {
  gradients,
  glassMorphism,
  neumorphism,
} from '../ProfessionalContainer';
import { AppThemeProvider } from '../../../context/AppThemeContext';
import { DarkModeProvider } from '../../../context/DarkModeContext';
import { palette } from '../../../theme';

const wrap = (ui) =>
  render(
    <DarkModeProvider>
      <AppThemeProvider>{ui}</AppThemeProvider>
    </DarkModeProvider>
  );

beforeEach(() => {
  localStorage.clear();
  // jsdom doesn't implement the Fullscreen API; stub the bits we exercise.
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    value: null,
  });
  document.documentElement.requestFullscreen = jest.fn();
  document.exitFullscreen = jest.fn();
});

describe('ProfessionalContainer — rendering', () => {
  it('renders children', () => {
    wrap(
      <ProfessionalContainer>
        <div data-testid="child">hello</div>
      </ProfessionalContainer>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders the optional title node above children', () => {
    wrap(
      <ProfessionalContainer title={<h2 data-testid="title">Analysis</h2>}>
        <div data-testid="child">body</div>
      </ProfessionalContainer>
    );
    expect(screen.getByTestId('title')).toHaveTextContent('Analysis');
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});

describe('ProfessionalContainer — header chrome', () => {
  it('renders fullscreen and dark-mode toggle buttons by default', () => {
    wrap(
      <ProfessionalContainer>
        <div />
      </ProfessionalContainer>
    );
    expect(screen.getByRole('button', { name: /toggle fullscreen/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle dark mode/i })).toBeInTheDocument();
  });

  it('hides the fullscreen button when showFullscreen={false}', () => {
    wrap(
      <ProfessionalContainer showFullscreen={false}>
        <div />
      </ProfessionalContainer>
    );
    expect(screen.queryByRole('button', { name: /toggle fullscreen/i })).not.toBeInTheDocument();
  });

  it('hides the dark-mode toggle when showDarkModeToggle={false}', () => {
    wrap(
      <ProfessionalContainer showDarkModeToggle={false}>
        <div />
      </ProfessionalContainer>
    );
    expect(screen.queryByRole('button', { name: /toggle dark mode/i })).not.toBeInTheDocument();
  });

  it('clicking fullscreen requests Fullscreen API when not already full', () => {
    wrap(
      <ProfessionalContainer>
        <div />
      </ProfessionalContainer>
    );
    fireEvent.click(screen.getByRole('button', { name: /toggle fullscreen/i }));
    expect(document.documentElement.requestFullscreen).toHaveBeenCalledTimes(1);
  });

  it('renders customActions alongside the built-in chrome', () => {
    wrap(
      <ProfessionalContainer
        customActions={<button data-testid="extra">X</button>}
      >
        <div />
      </ProfessionalContainer>
    );
    expect(screen.getByTestId('extra')).toBeInTheDocument();
  });
});

describe('Legacy exports from ProfessionalContainer — backward compatibility', () => {
  it('`gradients` keys resolve to solid colors (no linear-gradient)', () => {
    for (const value of Object.values(gradients)) {
      expect(typeof value).toBe('string');
      expect(value).not.toMatch(/linear-gradient|radial-gradient/i);
    }
  });

  it('`glassMorphism.light/dark` are flat Paper styling', () => {
    for (const mode of ['light', 'dark']) {
      const gm = glassMorphism[mode];
      expect(gm.backdropFilter).toBe('none');
      expect(gm.boxShadow).toBe('none');
      expect(gm.background).toBe(palette[mode].bgPaper);
      expect(gm.border).toContain(palette[mode].border);
    }
  });

  it('`neumorphism.light/dark` are no-ops (flat, no shadow)', () => {
    expect(neumorphism.light.boxShadow).toBe('none');
    expect(neumorphism.dark.boxShadow).toBe('none');
  });
});
