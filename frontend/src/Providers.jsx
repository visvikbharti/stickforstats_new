import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { MathJaxContext } from 'better-react-mathjax';
import ErrorBoundary from './components/common/ErrorBoundary';
import { AppThemeProvider } from './context/AppThemeContext';
import { DarkModeProvider } from './context/DarkModeContext';
import { BrandingProvider } from './context/BrandingContext';
import { AuthProvider } from './context/AuthContext';
import { PrefetchProvider } from './context/PrefetchContext';
import { CommandPaletteProvider } from './context/CommandPaletteContext';
import { SearchProvider } from './context/SearchContext';
import { OnboardingProvider } from './context/OnboardingContext';
import { SettingsProvider } from './context/SettingsContext';
import { TourProvider } from './components/onboarding';
import { mathJaxConfig, prefetchOptions } from './config/appConfig';

const snackbarProps = {
  maxSnack: 3,
  anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
  autoHideDuration: 5000,
};

/**
 * Composes an array of [Provider, props] pairs into a nested provider tree.
 * Providers are nested in array order (first = outermost).
 */
function composeProviders(providers, children) {
  return providers.reduceRight(
    (acc, [Provider, props = {}]) => <Provider {...props}>{acc}</Provider>,
    children
  );
}

const Providers = ({ onError, children }) =>
  composeProviders(
    [
      [ErrorBoundary, { onError }],
      [MathJaxContext, { config: mathJaxConfig }],
      [DarkModeProvider],
      [AppThemeProvider],
      [BrandingProvider],
      [SnackbarProvider, snackbarProps],
      [PrefetchProvider, { options: prefetchOptions }],
      [Router],
      [AuthProvider],
      [OnboardingProvider],
      [SearchProvider],
      [CommandPaletteProvider],
      [SettingsProvider],
      [TourProvider],
    ],
    children
  );

export default Providers;
