import React, { Suspense, useState } from 'react';
import { ServiceWorkerUpdater, PWAInstallPrompt } from './components/common';
import LoadingFallback from './components/common/LoadingFallback';
import SkipNavigation from './components/common/SkipNavigation';
import SimpleNavigation from './components/SimpleNavigation';
import Footer from './components/Footer';
import { WelcomeModal, HelpButton } from './components/onboarding';
import Providers from './Providers';
import { AppRoutes, ProfessionalLandingPage, AIAdvisorHub, PrefetchDebug, CommandPalette, GlobalSearch } from './routes';
import ErrorBoundary from './components/common/ErrorBoundary';

// Import i18n configuration (must be imported before any components that use translations)
import './i18n';

function App() {
  // Check if we're on a deep link (any path other than home)
  // If so, skip the landing page to allow direct URL navigation
  const isDeepLink = window.location.pathname !== '/' && window.location.pathname !== '';

  // Cosmic landing page state - skip if deep linking
  const [showLanding, setShowLanding] = useState(!isDeepLink);
  const [animatingOut, setAnimatingOut] = useState(false);

  // Handle entering the main app from landing
  const handleEnterApp = () => {
    setAnimatingOut(true);
    // Use golden ratio timing
    setTimeout(() => {
      setShowLanding(false);
    }, 1618);
  };

  // Global error handler for production errors
  const handleGlobalError = (error, errorInfo) => {
    console.error('Global error caught:', error);
    console.error('Component stack:', errorInfo?.componentStack);
  };

  // Show prefetch debug panel only in development
  const showPrefetchDebug = process.env.NODE_ENV === 'development';

  // Show cosmic landing page first
  if (showLanding) {
    return (
      <ErrorBoundary onError={handleGlobalError}>
        <Suspense fallback={<LoadingFallback message="Loading..." />}>
          <ProfessionalLandingPage
            onEnter={handleEnterApp}
            animatingOut={animatingOut}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <Providers onError={handleGlobalError}>
      <div className="App">
        <SkipNavigation />
        <SimpleNavigation />
        <Suspense fallback={null}>
          <CommandPalette />
          <GlobalSearch />
          <AIAdvisorHub />
        </Suspense>
        <WelcomeModal />
        <HelpButton />
        <main id="main-content" style={{ minHeight: 'calc(100vh - 120px)', padding: '0' }}>
          <AppRoutes />
        </main>
        <Footer />
        <ServiceWorkerUpdater />
        <PWAInstallPrompt />
        {showPrefetchDebug && <Suspense fallback={null}><PrefetchDebug position={{ bottom: 16, right: 16 }} /></Suspense>}
      </div>
    </Providers>
  );
}

export default App;
