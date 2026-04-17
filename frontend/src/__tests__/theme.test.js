/**
 * Theme System Tests
 * ==================
 *
 * Locks the Professional Research Software design tokens — solid fills,
 * 4 px rounding, 13 px system-ui base, hairline borders, no gradients on
 * functional UI. The redesign (commit 5442517) deliberately inverted
 * several previous defaults (16 px rounding, purple-pink gradient buttons,
 * translateY hover lifts). These tests guard against accidental reversion.
 */

import { getTheme, palette } from '../theme';

describe('theme.js — palette tokens', () => {
  it('exposes light and dark palettes', () => {
    expect(palette.light).toBeTruthy();
    expect(palette.dark).toBeTruthy();
  });

  it('uses a single solid primary accent (no gradient)', () => {
    expect(palette.light.primary).toBe('#1565c0');
    expect(palette.dark.primary).toBe('#64b5f6');
    expect(palette.light.primary).not.toMatch(/gradient|linear|-/i);
  });

  it('has hairline border tokens distinct from text', () => {
    expect(palette.light.border).toBe('#d0d7de');
    expect(palette.dark.border).toBe('#30363d');
    expect(palette.light.textPrimary).not.toBe(palette.light.border);
  });
});

describe('getTheme(mode) — top-level structure', () => {
  it.each(['light', 'dark'])('returns a usable MUI theme for %s mode', (mode) => {
    const theme = getTheme(mode);
    expect(theme.palette.mode).toBe(mode);
    expect(typeof theme.spacing).toBe('function');
    expect(theme.shape.borderRadius).toBe(4);
  });

  it('keeps typography base at 13 px with a system-first font stack', () => {
    const theme = getTheme('light');
    expect(theme.typography.fontSize).toBe(13);
    expect(theme.typography.fontFamily).toMatch(/^-apple-system/);
  });

  it('caps headline weight at 600 — no 800-weight marketing headlines', () => {
    const theme = getTheme('light');
    for (const key of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
      expect(theme.typography[key].fontWeight).toBeLessThanOrEqual(600);
    }
  });

  it('uses body2 around 0.8125 rem for data density', () => {
    const theme = getTheme('light');
    expect(theme.typography.body2.fontSize).toBe('0.8125rem');
  });
});

describe('getTheme component overrides — flat, solid, data-dense', () => {
  it('button defaults: flat fill, no elevation, no transform on hover', () => {
    const theme = getTheme('light');
    const root = theme.components.MuiButton.styleOverrides.root;
    expect(root.boxShadow).toBe('none');
    expect(root['&:hover'].boxShadow).toBe('none');
    expect(root).not.toHaveProperty('transform');
    expect(root['&:hover']).not.toHaveProperty('transform');
    expect(theme.components.MuiButton.defaultProps.disableElevation).toBe(true);
  });

  it('contained button uses solid primary color, not a linear-gradient', () => {
    const theme = getTheme('light');
    const contained = theme.components.MuiButton.styleOverrides.contained;
    expect(contained.backgroundColor).toBe(palette.light.primary);
    expect(String(contained.backgroundColor)).not.toMatch(/linear-gradient|radial-gradient/i);
  });

  it('Paper defaults render flat with solid background', () => {
    const theme = getTheme('light');
    const paperRoot = theme.components.MuiPaper.styleOverrides.root;
    expect(paperRoot.backgroundImage).toBe('none');
    expect(paperRoot.backgroundColor).toBe(palette.light.bgPaper);
  });

  it('Card default: hairline border, no drop shadow, no hover lift', () => {
    const theme = getTheme('light');
    const cardRoot = theme.components.MuiCard.styleOverrides.root;
    expect(cardRoot.boxShadow).toBe('none');
    expect(cardRoot.border).toContain(palette.light.border);
    expect(cardRoot).not.toHaveProperty('transform');
  });

  it('Menu / Popover / Autocomplete paper: solid surface, hairline border', () => {
    const theme = getTheme('dark');
    for (const key of ['MuiMenu', 'MuiPopover', 'MuiAutocomplete']) {
      const paper = theme.components[key].styleOverrides.paper;
      expect(paper.backgroundColor).toBe(palette.dark.bgPaper);
      expect(paper.backgroundImage).toBe('none');
      expect(paper.border).toContain(palette.dark.border);
    }
  });

  it('LinearProgress bar uses a solid primary fill (no gradient)', () => {
    const theme = getTheme('light');
    const bar = theme.components.MuiLinearProgress.styleOverrides.bar;
    expect(bar.backgroundColor).toBe(palette.light.primary);
    expect(bar).not.toHaveProperty('background');
  });

  it('Tabs indicator is a 2 px solid underline, not a gradient panel', () => {
    const theme = getTheme('light');
    const indicator = theme.components.MuiTabs.styleOverrides.indicator;
    expect(indicator.height).toBe(2);
    expect(indicator.backgroundColor).toBe(palette.light.primary);
  });

  it('Button, TextField, and IconButton default to compact sizes', () => {
    const theme = getTheme('light');
    const sm = (defaults) => defaults.defaultProps?.size;
    expect(sm(theme.components.MuiTextField)).toBe('small');
    expect(sm(theme.components.MuiIconButton)).toBe('small');
    expect(sm(theme.components.MuiSelect)).toBe('small');
  });
});
