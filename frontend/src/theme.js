import { createTheme } from '@mui/material/styles';

/**
 * Professional Research Software theme.
 *
 * Style goals:
 *   - Flat, solid, data-dense — think SPSS / JASP / jamovi / Stata / JMP.
 *   - Neutral grayscale surfaces with one calm blue accent.
 *   - No gradients on functional UI. No hover transforms. No glassmorphism.
 *   - Hairline borders over heavy shadows. Restrained rounding (4px).
 *   - Conservative typography: system-ui, weights 400/500/600, 13px body.
 */

const PALETTE = {
  light: {
    primary: '#1565c0',
    primaryHover: '#0d47a1',
    primaryLight: '#42a5f5',
    primarySoft: '#e3f2fd',
    secondary: '#5e35b1',
    secondarySoft: '#ede7f6',
    success: '#2e7d32',
    warning: '#ed6c02',
    error: '#c62828',
    info: '#0277bd',
    bgDefault: '#f5f6f8',
    bgPaper: '#ffffff',
    bgSubtle: '#fafafa',
    bgElevated: '#ffffff',
    textPrimary: '#1a1d21',
    textSecondary: '#5c6370',
    textDisabled: '#9aa0a6',
    divider: '#e2e4e8',
    border: '#d0d7de',
    borderStrong: '#b1bac4',
    hover: '#f0f2f5',
    selected: '#e3ecf7',
    focusRing: 'rgba(21, 101, 192, 0.25)',
  },
  dark: {
    primary: '#64b5f6',
    primaryHover: '#90caf9',
    primaryLight: '#90caf9',
    primarySoft: 'rgba(100, 181, 246, 0.12)',
    secondary: '#b39ddb',
    secondarySoft: 'rgba(179, 157, 219, 0.12)',
    success: '#66bb6a',
    warning: '#ffa726',
    error: '#ef5350',
    info: '#29b6f6',
    bgDefault: '#0d1117',
    bgPaper: '#161b22',
    bgSubtle: '#1c2128',
    bgElevated: '#1c2128',
    textPrimary: '#e6edf3',
    textSecondary: '#8b949e',
    textDisabled: '#6e7681',
    divider: '#30363d',
    border: '#30363d',
    borderStrong: '#484f58',
    hover: '#1f242b',
    selected: '#22354f',
    focusRing: 'rgba(100, 181, 246, 0.35)',
  },
};

const getDesignTokens = (mode) => {
  const c = mode === 'dark' ? PALETTE.dark : PALETTE.light;
  return {
    palette: {
      mode,
      primary: {
        main: c.primary,
        dark: c.primaryHover,
        light: c.primaryLight,
        contrastText: '#ffffff',
      },
      secondary: {
        main: c.secondary,
        contrastText: '#ffffff',
      },
      success: { main: c.success, contrastText: '#ffffff' },
      warning: { main: c.warning, contrastText: '#ffffff' },
      error: { main: c.error, contrastText: '#ffffff' },
      info: { main: c.info, contrastText: '#ffffff' },
      background: {
        default: c.bgDefault,
        paper: c.bgPaper,
        subtle: c.bgSubtle,
        elevated: c.bgElevated,
      },
      text: {
        primary: c.textPrimary,
        secondary: c.textSecondary,
        disabled: c.textDisabled,
      },
      divider: c.divider,
      action: {
        hover: c.hover,
        selected: c.selected,
        disabled: c.textDisabled,
        disabledBackground: c.bgSubtle,
      },
    },
    typography: {
      fontSize: 13,
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
      h1: { fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.01em', color: c.textPrimary },
      h2: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.25, letterSpacing: '-0.01em', color: c.textPrimary },
      h3: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.3, color: c.textPrimary },
      h4: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.35, color: c.textPrimary },
      h5: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.4, color: c.textPrimary },
      h6: { fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.4, color: c.textPrimary },
      subtitle1: { fontSize: '0.9375rem', fontWeight: 500, lineHeight: 1.5 },
      subtitle2: { fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.5 },
      body1: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.5 },
      body2: { fontSize: '0.8125rem', fontWeight: 400, lineHeight: 1.45 },
      caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.5, color: c.textSecondary },
      button: { fontSize: '0.8125rem', fontWeight: 500, textTransform: 'none', letterSpacing: 0 },
      overline: { fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.8 },
    },
    shape: { borderRadius: 4 },
    shadows: [
      'none',
      mode === 'dark' ? '0 1px 2px rgba(0,0,0,0.4)' : '0 1px 2px rgba(15,23,42,0.06)',
      mode === 'dark' ? '0 2px 4px rgba(0,0,0,0.45)' : '0 1px 3px rgba(15,23,42,0.08)',
      mode === 'dark' ? '0 2px 6px rgba(0,0,0,0.5)' : '0 2px 6px rgba(15,23,42,0.08)',
      mode === 'dark' ? '0 4px 8px rgba(0,0,0,0.5)' : '0 2px 8px rgba(15,23,42,0.1)',
      mode === 'dark' ? '0 4px 10px rgba(0,0,0,0.55)' : '0 3px 10px rgba(15,23,42,0.1)',
      mode === 'dark' ? '0 6px 12px rgba(0,0,0,0.55)' : '0 4px 12px rgba(15,23,42,0.12)',
      mode === 'dark' ? '0 6px 14px rgba(0,0,0,0.6)' : '0 4px 14px rgba(15,23,42,0.12)',
      mode === 'dark' ? '0 8px 16px rgba(0,0,0,0.6)' : '0 6px 16px rgba(15,23,42,0.14)',
      ...Array(16).fill(
        mode === 'dark' ? '0 10px 20px rgba(0,0,0,0.65)' : '0 8px 20px rgba(15,23,42,0.14)'
      ),
    ],
  };
};

const getComponentOverrides = (mode) => {
  const c = mode === 'dark' ? PALETTE.dark : PALETTE.light;
  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontSize: '13px',
          backgroundColor: c.bgDefault,
          color: c.textPrimary,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        '*::-webkit-scrollbar': { width: 10, height: 10 },
        '*::-webkit-scrollbar-track': { background: 'transparent' },
        '*::-webkit-scrollbar-thumb': {
          background: c.borderStrong,
          borderRadius: 5,
          border: `2px solid ${c.bgDefault}`,
        },
        '*::-webkit-scrollbar-thumb:hover': { background: c.textSecondary },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontSize: '0.8125rem',
          fontWeight: 500,
          minHeight: 32,
          padding: '6px 14px',
          borderRadius: 4,
          boxShadow: 'none',
          transition: 'background-color 120ms ease, border-color 120ms ease, color 120ms ease',
          '&:hover': { boxShadow: 'none' },
          '&:active': { boxShadow: 'none' },
          '&.Mui-focusVisible': {
            boxShadow: `0 0 0 3px ${c.focusRing}`,
          },
        },
        contained: {
          backgroundColor: c.primary,
          color: '#ffffff',
          '&:hover': {
            backgroundColor: c.primaryHover,
            boxShadow: 'none',
          },
        },
        outlined: {
          borderColor: c.border,
          color: c.textPrimary,
          backgroundColor: c.bgPaper,
          '&:hover': {
            borderColor: c.borderStrong,
            backgroundColor: c.hover,
          },
        },
        text: {
          color: c.primary,
          '&:hover': { backgroundColor: c.primarySoft },
        },
        sizeSmall: { minHeight: 28, padding: '4px 10px', fontSize: '0.75rem' },
        sizeLarge: { minHeight: 38, padding: '8px 18px', fontSize: '0.875rem' },
      },
      defaultProps: { disableElevation: true, disableRipple: false },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          padding: 6,
          borderRadius: 4,
          color: c.textSecondary,
          '&:hover': { backgroundColor: c.hover, color: c.textPrimary },
        },
      },
      defaultProps: { size: 'small' },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: mode === 'dark' ? '0 4px 10px rgba(0,0,0,0.55)' : '0 3px 10px rgba(15,23,42,0.15)',
          backgroundColor: c.primary,
          color: '#ffffff',
          '&:hover': { backgroundColor: c.primaryHover },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: c.bgPaper,
        },
        outlined: { borderColor: c.border },
        elevation1: {
          border: `1px solid ${c.border}`,
          boxShadow: 'none',
        },
        elevation2: {
          border: `1px solid ${c.border}`,
          boxShadow: mode === 'dark' ? '0 1px 2px rgba(0,0,0,0.4)' : '0 1px 2px rgba(15,23,42,0.06)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: c.bgPaper,
          border: `1px solid ${c.border}`,
          borderRadius: 6,
          boxShadow: 'none',
        },
      },
      defaultProps: { elevation: 0 },
    },
    MuiCardContent: {
      styleOverrides: {
        root: { padding: '14px 16px', '&:last-child': { paddingBottom: '14px' } },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
          borderBottom: `1px solid ${c.divider}`,
        },
        title: { fontSize: '0.9375rem', fontWeight: 600 },
        subheader: { fontSize: '0.8125rem', color: c.textSecondary },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: c.bgPaper,
          color: c.textPrimary,
          borderBottom: `1px solid ${c.divider}`,
          boxShadow: 'none',
          backgroundImage: 'none',
        },
      },
      defaultProps: { elevation: 0 },
    },
    MuiToolbar: {
      styleOverrides: {
        root: { minHeight: '48px !important', padding: '0 16px !important' },
      },
      defaultProps: { variant: 'dense' },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: c.bgPaper,
          borderRight: `1px solid ${c.divider}`,
          backgroundImage: 'none',
        },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: c.divider } },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: '0.75rem',
          fontWeight: 500,
          height: 22,
          borderRadius: 4,
          backgroundColor: c.bgSubtle,
          color: c.textPrimary,
          border: `1px solid ${c.border}`,
        },
        label: { padding: '0 8px' },
        outlined: { backgroundColor: 'transparent' },
        colorPrimary: {
          backgroundColor: c.primarySoft,
          color: c.primary,
          borderColor: mode === 'dark' ? 'rgba(100,181,246,0.35)' : 'rgba(21,101,192,0.25)',
        },
      },
      defaultProps: { size: 'small' },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 36,
          borderBottom: `1px solid ${c.divider}`,
          backgroundColor: 'transparent',
        },
        indicator: { height: 2, backgroundColor: c.primary },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontSize: '0.8125rem',
          fontWeight: 500,
          minHeight: 36,
          padding: '8px 14px',
          color: c.textSecondary,
          '&:hover': { color: c.textPrimary, backgroundColor: 'transparent' },
          '&.Mui-selected': { color: c.primary, fontWeight: 600 },
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
    },
    MuiFormControl: {
      styleOverrides: {
        root: { marginTop: 4, marginBottom: 4 },
      },
      defaultProps: { size: 'small', margin: 'normal' },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          fontWeight: 500,
          color: c.textSecondary,
          '&.Mui-focused': { color: c.primary },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: { root: { fontSize: '0.6875rem', marginTop: 2 } },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          color: c.textSecondary,
          '&.Mui-focused': { color: c.primary },
        },
        shrink: {
          backgroundColor: c.bgPaper,
          padding: '0 4px',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          borderRadius: 4,
          backgroundColor: c.bgPaper,
          transition: 'border-color 120ms ease, box-shadow 120ms ease',
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: c.borderStrong },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: c.primary,
            borderWidth: 1,
          },
          '&.Mui-focused': { boxShadow: `0 0 0 3px ${c.focusRing}` },
          '&.Mui-disabled': { backgroundColor: c.bgSubtle },
        },
        notchedOutline: { borderColor: c.border },
        input: { padding: '8px 12px' },
      },
    },
    MuiInputBase: {
      styleOverrides: { root: { fontSize: '0.8125rem' } },
    },
    MuiSelect: {
      styleOverrides: {
        select: { fontSize: '0.8125rem', padding: '8px 12px' },
        icon: { color: c.textSecondary },
      },
      defaultProps: { size: 'small', variant: 'outlined' },
    },
    MuiNativeSelect: {
      styleOverrides: {
        select: {
          fontSize: '0.8125rem',
          padding: '8px 12px',
          backgroundColor: c.bgPaper,
          color: c.textPrimary,
          borderRadius: 4,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: c.bgPaper,
          backgroundImage: 'none',
          border: `1px solid ${c.border}`,
          borderRadius: 4,
          boxShadow: mode === 'dark'
            ? '0 8px 20px rgba(0,0,0,0.5)'
            : '0 6px 16px rgba(15,23,42,0.14)',
        },
        list: { padding: '4px 0' },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          padding: '8px 14px',
          minHeight: 32,
          color: c.textPrimary,
          '&:hover': { backgroundColor: c.hover },
          '&.Mui-selected': {
            backgroundColor: c.selected,
            fontWeight: 500,
            '&:hover': { backgroundColor: c.selected },
          },
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          backgroundColor: c.bgPaper,
          backgroundImage: 'none',
          border: `1px solid ${c.border}`,
          borderRadius: 4,
          boxShadow: mode === 'dark'
            ? '0 8px 20px rgba(0,0,0,0.5)'
            : '0 6px 16px rgba(15,23,42,0.14)',
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          backgroundColor: c.bgPaper,
          backgroundImage: 'none',
          border: `1px solid ${c.border}`,
          borderRadius: 4,
          boxShadow: mode === 'dark'
            ? '0 8px 20px rgba(0,0,0,0.5)'
            : '0 6px 16px rgba(15,23,42,0.14)',
        },
        listbox: {
          padding: '4px 0',
          '& .MuiAutocomplete-option': {
            fontSize: '0.8125rem',
            padding: '8px 14px',
            minHeight: 32,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          backgroundColor: c.bgPaper,
          border: `1px solid ${c.border}`,
          borderRadius: 6,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
          fontWeight: 600,
          padding: '14px 20px',
          borderBottom: `1px solid ${c.divider}`,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: { fontSize: '0.8125rem', padding: '16px 20px' },
      },
    },
    MuiDialogActions: {
      styleOverrides: { root: { padding: '12px 20px', borderTop: `1px solid ${c.divider}` } },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          fontSize: '0.8125rem',
          border: `1px solid ${c.border}`,
          padding: '8px 14px',
        },
        standardSuccess: {
          backgroundColor: mode === 'dark' ? 'rgba(102,187,106,0.12)' : '#e8f5e9',
          color: mode === 'dark' ? '#a5d6a7' : '#1b5e20',
          borderColor: mode === 'dark' ? 'rgba(102,187,106,0.35)' : '#c8e6c9',
        },
        standardWarning: {
          backgroundColor: mode === 'dark' ? 'rgba(255,167,38,0.12)' : '#fff8e1',
          color: mode === 'dark' ? '#ffd180' : '#8f5b00',
          borderColor: mode === 'dark' ? 'rgba(255,167,38,0.35)' : '#ffe0a3',
        },
        standardError: {
          backgroundColor: mode === 'dark' ? 'rgba(239,83,80,0.12)' : '#fdecea',
          color: mode === 'dark' ? '#ef9a9a' : '#8d1e1e',
          borderColor: mode === 'dark' ? 'rgba(239,83,80,0.35)' : '#f5c0bd',
        },
        standardInfo: {
          backgroundColor: mode === 'dark' ? 'rgba(41,182,246,0.12)' : '#e1f5fe',
          color: mode === 'dark' ? '#81d4fa' : '#014361',
          borderColor: mode === 'dark' ? 'rgba(41,182,246,0.35)' : '#b3e5fc',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: mode === 'dark' ? '#2a2f37' : '#1a1d21',
          color: '#ffffff',
          fontSize: '0.75rem',
          padding: '6px 10px',
          borderRadius: 4,
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        },
        arrow: { color: mode === 'dark' ? '#2a2f37' : '#1a1d21' },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 6,
          borderRadius: 3,
          backgroundColor: mode === 'dark' ? 'rgba(100,181,246,0.15)' : 'rgba(21,101,192,0.12)',
        },
        bar: { backgroundColor: c.primary, borderRadius: 3 },
      },
    },
    MuiCircularProgress: {
      styleOverrides: { root: { color: c.primary } },
    },
    MuiTable: {
      styleOverrides: { root: { fontSize: '0.8125rem' } },
    },
    MuiTableHead: {
      styleOverrides: {
        root: { backgroundColor: c.bgSubtle },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          padding: '8px 14px',
          borderBottom: `1px solid ${c.divider}`,
        },
        head: {
          fontWeight: 600,
          color: c.textSecondary,
          textTransform: 'none',
          letterSpacing: 0,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { '&:hover': { backgroundColor: c.hover } },
      },
    },
    MuiList: {
      styleOverrides: { root: { padding: '4px 0' } },
      defaultProps: { dense: true },
    },
    MuiListItem: {
      styleOverrides: {
        root: { paddingTop: 4, paddingBottom: 4, fontSize: '0.8125rem' },
      },
      defaultProps: { dense: true },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: { fontSize: '0.8125rem' },
        secondary: { fontSize: '0.75rem' },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          paddingTop: 6,
          paddingBottom: 6,
          fontSize: '0.8125rem',
          '&:hover': { backgroundColor: c.hover },
          '&.Mui-selected': {
            backgroundColor: c.selected,
            '&:hover': { backgroundColor: c.selected },
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: { padding: 4, color: c.textSecondary, '&.Mui-checked': { color: c.primary } },
      },
      defaultProps: { size: 'small' },
    },
    MuiRadio: {
      styleOverrides: {
        root: { padding: 4, color: c.textSecondary, '&.Mui-checked': { color: c.primary } },
      },
      defaultProps: { size: 'small' },
    },
    MuiSwitch: {
      defaultProps: { size: 'small' },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: c.bgPaper,
          border: `1px solid ${c.border}`,
          borderRadius: 4,
          boxShadow: 'none',
          '&:before': { display: 'none' },
          '&.Mui-expanded': { margin: 0 },
        },
      },
      defaultProps: { elevation: 0, disableGutters: true },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          minHeight: 40,
          padding: '0 14px',
          '&.Mui-expanded': { minHeight: 40, borderBottom: `1px solid ${c.divider}` },
        },
        content: {
          margin: '10px 0',
          fontSize: '0.875rem',
          fontWeight: 500,
          '&.Mui-expanded': { margin: '10px 0' },
        },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: { root: { padding: '14px', fontSize: '0.8125rem' } },
    },
    MuiBadge: {
      styleOverrides: {
        badge: { fontSize: '0.6875rem', fontWeight: 600, height: 18, minWidth: 18 },
      },
    },
    MuiBreadcrumbs: {
      styleOverrides: {
        root: { fontSize: '0.8125rem', color: c.textSecondary },
        separator: { color: c.textDisabled, marginLeft: 6, marginRight: 6 },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: c.primary,
          textDecoration: 'none',
          '&:hover': { color: c.primaryHover, textDecoration: 'underline' },
        },
      },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          color: c.border,
          '&.Mui-active': { color: c.primary },
          '&.Mui-completed': { color: c.success },
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          fontSize: '0.8125rem',
          '&.Mui-active': { fontWeight: 600, color: c.textPrimary },
          '&.Mui-completed': { color: c.textPrimary },
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: { backgroundColor: 'rgba(0,0,0,0.55)' },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: c.bgSubtle,
          borderRadius: 4,
        },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          backgroundColor: c.bgPaper,
          color: c.textPrimary,
          border: `1px solid ${c.border}`,
          borderRadius: 4,
          boxShadow: mode === 'dark' ? '0 6px 14px rgba(0,0,0,0.6)' : '0 4px 14px rgba(15,23,42,0.12)',
        },
      },
    },
  };
};

export const palette = PALETTE;

export const getTheme = (mode) => {
  const tokens = getDesignTokens(mode);
  return createTheme({
    ...tokens,
    components: getComponentOverrides(mode),
  });
};

export default getTheme;
