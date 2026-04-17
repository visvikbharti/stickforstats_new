/**
 * AppThemeContext Tests
 * =====================
 *
 * AppThemeProvider delegates to src/theme.js while retaining the legacy
 * `gradients` / `glassMorphism` / `neumorphism` exports for source-compat
 * with modules still importing them. Those exports must now resolve to
 * flat, solid styling (no linear-gradient, no backdrop-blur, no embossed
 * neumorphism). These tests pin that contract.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  AppThemeProvider,
  useAppTheme,
  gradients,
  glassMorphism,
  neumorphism,
} from '../AppThemeContext';
import { DarkModeProvider } from '../DarkModeContext';
import { palette } from '../../theme';

const wrapAll = ({ children }) => (
  <DarkModeProvider>
    <AppThemeProvider>{children}</AppThemeProvider>
  </DarkModeProvider>
);

// DarkModeProvider persists to localStorage; reset before each test so
// toggle assertions don't leak.
beforeEach(() => {
  localStorage.clear();
});

describe('useAppTheme hook', () => {
  it('throws when used outside AppThemeProvider', () => {
    const prevError = console.error;
    console.error = jest.fn();
    expect(() => renderHook(() => useAppTheme())).toThrow(
      /AppThemeProvider/
    );
    console.error = prevError;
  });

  it('exposes theme, darkMode, toggleDarkMode, and palette helpers', () => {
    const { result } = renderHook(() => useAppTheme(), { wrapper: wrapAll });
    expect(result.current.theme.palette.mode).toBe('light');
    expect(result.current.darkMode).toBe(false);
    expect(typeof result.current.toggleDarkMode).toBe('function');
    expect(result.current.solids.primary).toBe(palette.light.primary);
  });

  it('toggleDarkMode flips mode to dark', () => {
    const { result } = renderHook(() => useAppTheme(), { wrapper: wrapAll });
    act(() => result.current.toggleDarkMode());
    expect(result.current.darkMode).toBe(true);
    expect(result.current.theme.palette.mode).toBe('dark');
    expect(result.current.solids.primary).toBe(palette.dark.primary);
  });
});

describe('Legacy `gradients` export — backward compatibility', () => {
  it('every legacy key resolves to a plain CSS color (no linear-gradient)', () => {
    for (const [key, value] of Object.entries(gradients)) {
      expect(typeof value).toBe('string');
      expect(value).not.toMatch(/linear-gradient|radial-gradient/i);
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('semantic keys map to the palette.light equivalents', () => {
    expect(gradients.primary).toBe(palette.light.primary);
    expect(gradients.success).toBe(palette.light.success);
    expect(gradients.red).toBe(palette.light.error); // "red" is the legacy key
    expect(gradients.warning).toBe(palette.light.warning);
    expect(gradients.info).toBe(palette.light.info);
  });

  it('covers every key the old palette exposed so existing imports resolve', () => {
    // Keys referenced by `modules/pages/StatisticalDashboard.jsx` and kin.
    const expected = [
      'primary',
      'success',
      'info',
      'warning',
      'dark',
      'purple',
      'blue',
      'green',
      'red',
      'orange',
    ];
    for (const key of expected) {
      expect(gradients[key]).toBeTruthy();
    }
  });
});

describe('Legacy `glassMorphism` export — now flat Paper styling', () => {
  it('backdropFilter is disabled in both modes', () => {
    expect(glassMorphism.light.backdropFilter).toBe('none');
    expect(glassMorphism.dark.backdropFilter).toBe('none');
  });

  it('background resolves to a solid palette.paper color', () => {
    expect(glassMorphism.light.background).toBe(palette.light.bgPaper);
    expect(glassMorphism.dark.background).toBe(palette.dark.bgPaper);
  });

  it('border is a 1 px hairline from the palette (no purple tint)', () => {
    expect(glassMorphism.light.border).toContain(palette.light.border);
    expect(glassMorphism.dark.border).toContain(palette.dark.border);
  });

  it('boxShadow is explicitly none', () => {
    expect(glassMorphism.light.boxShadow).toBe('none');
    expect(glassMorphism.dark.boxShadow).toBe('none');
  });
});

describe('Legacy `neumorphism` export — now a no-op', () => {
  it('returns flat Paper with no shadow in both modes', () => {
    expect(neumorphism.light.boxShadow).toBe('none');
    expect(neumorphism.dark.boxShadow).toBe('none');
    expect(String(neumorphism.light.background)).not.toMatch(/linear-gradient/i);
  });
});

describe('AppThemeProvider — provides MuiThemeProvider to descendants', () => {
  const Consumer = () => {
    const { theme } = useAppTheme();
    return (
      <div data-testid="mode" data-mode={theme.palette.mode}>
        {theme.palette.primary.main}
      </div>
    );
  };

  it('supplies the professional theme to wrapped children', () => {
    render(
      <DarkModeProvider>
        <AppThemeProvider>
          <Consumer />
        </AppThemeProvider>
      </DarkModeProvider>
    );
    const node = screen.getByTestId('mode');
    expect(node).toHaveAttribute('data-mode', 'light');
    expect(node).toHaveTextContent(palette.light.primary);
  });
});
