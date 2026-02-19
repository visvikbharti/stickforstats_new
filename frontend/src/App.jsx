import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { MathJaxContext } from 'better-react-mathjax';
import ErrorBoundary from './components/common/ErrorBoundary';
import { ServiceWorkerUpdater, PWAInstallPrompt } from './components/common';
import { Box, CircularProgress, Typography, Button } from '@mui/material';

// Import Three.js setup (only loads Three.js when needed)
import './setupThree';

// Import i18n configuration (must be imported before any components that use translations)
import './i18n';

// Import Professional Landing Page (Scientific, minimal design)
import ProfessionalLandingPage from './components/Landing/ProfessionalLanding';

// Import theme context
import { AppThemeProvider } from './context/AppThemeContext';

// Import dark mode context
import { DarkModeProvider } from './context/DarkModeContext';

// Import branding context
import { BrandingProvider } from './context/BrandingContext';

// Import layout components
// import Navigation from './components/Navigation';
import SimpleNavigation from './components/SimpleNavigation';
import Footer from './components/Footer';

// Import auth components
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AuthDebug from './components/auth/AuthDebug';

// Import prefetching components
import { PrefetchProvider } from './context/PrefetchContext';

// AI Statistical Advisor - Global floating component
import AIAdvisorHub from './components/ai-advisor/AIAdvisorHub';
import PrefetchDebug from './components/navigation/PrefetchDebug';

// Import command palette components
import { CommandPaletteProvider } from './context/CommandPaletteContext';
import CommandPalette from './components/common/CommandPalette';

// Import search components
import { SearchProvider } from './context/SearchContext';
import GlobalSearch from './components/common/GlobalSearch';

// Import onboarding components
import { OnboardingProvider } from './context/OnboardingContext';
import {
  TourProvider,
  WelcomeModal,
  OnboardingChecklist,
  HelpButton
} from './components/onboarding';

// Import settings context (Expert Mode, etc.)
import { SettingsProvider } from './context/SettingsContext';

// Import Redux store
import { Provider as ReduxProvider } from 'react-redux';
import { store } from './store';

// Performance testing components are lazy loaded below

// Import main home page
import ShowcaseHomePage from './pages/ShowcaseHomePage';
import NotFoundPage from './pages/NotFoundPage';

// Lazy-load authentication pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DebugLoginPage = lazy(() => import('./pages/DebugLoginPage'));

// Lazy-load main statistical pages
// DEPRECATED: ProfessionalStatisticalAnalysis caused ChunkLoadError - replaced by StatisticalAnalysisHub
// const ProfessionalStatisticalAnalysis = lazy(() => import('./pages/ProfessionalStatisticalAnalysis'));
const EnhancedStatisticalAnalysis = lazy(() => import('./pages/EnhancedStatisticalAnalysis'));
const TTestCompleteModule = lazy(() => import('./modules/TTestCompleteModule'));
const ANOVACompleteModule = lazy(() => import('./modules/ANOVACompleteModule'));
// Real Backend-Connected Test Modules (50-decimal precision)
const TTestRealBackend = lazy(() => import('./modules/TTestRealBackend'));
const ANOVARealBackend = lazy(() => import('./modules/ANOVARealBackend'));
// Using Real Backend-Connected Modules (50-decimal precision)
const HypothesisTestingModule = lazy(() => import('./modules/HypothesisTestingModuleReal'));
const CorrelationRegressionModule = lazy(() => import('./modules/CorrelationRegressionModuleReal'));
const NonParametricTestsReal = lazy(() => import('./modules/NonParametricTestsReal'));
const NonParametricTestsRealProfessional = lazy(() => import('./modules/NonParametricTestsRealProfessional'));
const PowerAnalysisReal = lazy(() => import('./modules/PowerAnalysisReal'));
// Mixed Effects Models & Causal Inference Modules (Phase 2/3 - December 2025)
const MixedModelsModule = lazy(() => import('./modules/MixedModelsModule'));
const CausalInferenceModule = lazy(() => import('./modules/CausalInferenceModule'));
// Multiple Testing Correction Panel
const MultiplicityCorrectionPanel = lazy(() => import('./components/MultiplicityCorrectionPanel/MultiplicityCorrectionPanel'));
const StatisticalDashboard = lazy(() => import('./pages/StatisticalDashboard'));
// Test Universe - Access to 40+ Statistical Tests
const TestSelectionDashboard = lazy(() => import('./components/TestSelectionDashboard'));
const GuardianWarning = lazy(() => import('./components/Guardian/GuardianWarning'));
const MasterTestRunner = lazy(() => import('./components/MasterTestRunner'));
// Unified Test Executor - Complete test workflow with all 46 tests
const UnifiedTestExecutor = lazy(() => import('./components/UnifiedTestExecutor'));
// Statistical Practice Audit Dashboard
const AuditDashboard = lazy(() => import('./components/AuditDashboard'));
const StatisticalTestsPage = lazy(() => import('./pages/StatisticalTestsPage'));
const StatisticsPage = lazy(() => import('./pages/StatisticsPage'));
const SQCAnalysisPage = lazy(() => import('./pages/SQCAnalysisPage'));
const DOEAnalysisPage = lazy(() => import('./pages/DOEAnalysisPage'));
const PCAAnalysisPage = lazy(() => import('./pages/PCAAnalysisPage'));
const SurvivalAnalysisPage = lazy(() => import('./pages/SurvivalAnalysisPage'));
const FactorAnalysisPage = lazy(() => import('./pages/FactorAnalysisPage'));
const PCAEducationHub = lazy(() => import('./components/pca/education/PCAEducationHub'));
const CIEducationHub = lazy(() => import('./components/confidence_intervals/education/CIEducationHub'));
const DOEEducationHub = lazy(() => import('./components/doe/education/DOEEducationHub'));
const ProbabilityEducationHub = lazy(() => import('./components/probability_distributions/education/ProbabilityEducationHub'));
const SQCEducationHub = lazy(() => import('./components/sqc/education/SQCEducationHub'));
const PowerAnalysisEducationHub = lazy(() => import('./components/power-analysis/education/PowerAnalysisEducationHub'));
const BiophysicsLearningHub = lazy(() => import('./components/biophysics-education/BiophysicsLearningHub'));
const StatisticalAnalysisHub = lazy(() => import('./components/statistical-analysis/StatisticalAnalysisHub'));
const MetaAnalysisHub = lazy(() => import('./components/meta-analysis/MetaAnalysisHub'));
const PublicationPlotsPage = lazy(() => import('./pages/PublicationPlotsPage'));
const PaperParserHub = lazy(() => import('./components/paper-parser/PaperParserHub'));
const LearningHub = lazy(() => import('./components/education/LearningHub'));
const WorkflowManagementPage = lazy(() => import('./pages/WorkflowManagementPage'));
const ReportManagementPage = lazy(() => import('./pages/ReportManagementPage'));
const ConfidenceIntervalsPage = lazy(() => import('./components/confidence_intervals/ConfidenceIntervalsPage'));
const ProbabilityDistributionsPage = lazy(() => import('./pages/LazyProbabilityDistributionsPage'));
const TestCalculator = lazy(() => import('./components/probability_distributions/TestCalculator'));
const AdvancedStatisticsPage = lazy(() => import('./pages/AdvancedStatisticsPage'));
const VisualizationStudioPage = lazy(() => import('./pages/VisualizationStudioPage'));
const ReportingStudioPage = lazy(() => import('./pages/ReportingStudioPage'));
const SecurityDashboardPage = lazy(() => import('./pages/SecurityDashboardPage'));
const PerformanceTestDashboard = lazy(() => import('./components/performance/PerformanceTestDashboard'));
const WebSocketMonitoringPage = lazy(() => import('./pages/WebSocketMonitoringPage'));
const RAGPerformanceMonitoringPage = lazy(() => import('./pages/RAGPerformanceMonitoringPage'));
const BrowserCompatibilityTestPage = lazy(() => import('./pages/BrowserCompatibilityTestPage'));
// Autonomous Intelligence Layer (v2.0)
const SmartAnalysisPage = lazy(() => import('./pages/SmartAnalysisPage'));
// Journal Integration / Manuscript Review (Pillar 2)
const ManuscriptReviewPage = lazy(() => import('./pages/ManuscriptReviewPage'));
// Platform Dashboard — Organization & Billing Management
const PlatformDashboardPage = lazy(() => import('./pages/PlatformDashboardPage'));
// Journal Analytics Dashboard (v2.0)
const JournalAnalyticsPage = lazy(() => import('./pages/JournalAnalyticsPage'));
const EnterpriseDashboard = lazy(() => import('./components/enterprise/EnterpriseDashboard'));
const KeyboardShortcutsPage = lazy(() => import('./pages/KeyboardShortcutsPage'));
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage'));
const BrandingManager = lazy(() => import('./components/admin/BrandingManager'));
// GDPR Privacy Dashboard (v2.0)
const PrivacyDashboardPage = lazy(() => import('./pages/PrivacyDashboardPage'));
// Plugin Marketplace
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'));
// Certification Program
const CertificationPage = lazy(() => import('./pages/CertificationPage'));
// API Documentation
const APIDocsPage = lazy(() => import('./pages/APIDocsPage'));

// Loading fallback component
const LoadingComponent = ({ message = "Loading module..." }) => (
  <Box 
    sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '50vh',
      p: 4 
    }}
  >
    <CircularProgress size={40} />
    <Typography variant="h6" sx={{ mt: 2 }}>
      {message}
    </Typography>
  </Box>
);

// MathJax configuration
const mathJaxConfig = {
  loader: { load: ["[tex]/html"] },
  tex: {
    packages: { "[+]": ["html"] },
    inlineMath: [
      ["$", "$"],
      ["\\(", "\\)"]
    ],
    displayMath: [
      ["$$", "$$"],
      ["\\[", "\\]"]
    ]
  }
};

// Prefetch manager configuration
const prefetchOptions = {
  // Navigation pattern tracking
  maxPathLength: 10,                // Maximum length of navigation path to track
  maxPathsToStore: 100,             // Maximum number of unique paths to remember
  minimumVisitThreshold: 2,         // Minimum visits to a path before prediction is made
  
  // Prefetching behavior
  prefetchThreshold: 0.25,          // Probability threshold for prefetching (0.0 to 1.0)
  maxPrefetchResources: 5,          // Maximum resources to prefetch at once
  prefetchDocuments: true,          // Whether to prefetch HTML documents
  prefetchAssets: true,             // Whether to prefetch assets (JS, CSS, images)
  
  // Prefetching constraints
  respectDataSaver: true,           // Respect data-saver mode
  onlyFastConnections: true,        // Only prefetch on fast connections (4G+)
  
  // Debug
  debug: process.env.NODE_ENV === 'development' // Enable debug logging in development
};

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
    // Use golden ratio timing (φ * 1000 milliseconds)
    setTimeout(() => {
      setShowLanding(false);
    }, 1618);
  };

  // Global error handler for production errors
  const handleGlobalError = (error, errorInfo) => {
    // In a real app, you might want to log this to a service like Sentry
    console.error('Global error caught:', error);
    console.error('Component stack:', errorInfo?.componentStack);
  };

  // Show prefetch debug panel only in development
  const showPrefetchDebug = process.env.NODE_ENV === 'development';

  // Show cosmic landing page first
  if (showLanding) {
    return (
      <ErrorBoundary onError={handleGlobalError}>
        <ProfessionalLandingPage
          onEnter={handleEnterApp}
          animatingOut={animatingOut}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary onError={handleGlobalError}>
      <MathJaxContext config={mathJaxConfig}>
        <DarkModeProvider>
          <AppThemeProvider>
            <BrandingProvider>
              <SnackbarProvider 
              maxSnack={3}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              autoHideDuration={5000}
            >
              <ReduxProvider store={store}>
              <PrefetchProvider options={prefetchOptions}>
                <Router>
                  <AuthProvider>
                    <OnboardingProvider>
                      <SearchProvider>
                        <CommandPaletteProvider>
                          <SettingsProvider>
                            <TourProvider>
                              <div className="App">
                              <SimpleNavigation />
                              <CommandPalette />
                              <GlobalSearch />
                              <WelcomeModal />
                              {/* <OnboardingChecklist /> */}
                              <HelpButton />
                              {/* AI Statistical Advisor - Available on all pages */}
                              <AIAdvisorHub />
                              <main style={{ minHeight: 'calc(100vh - 120px)', padding: '0' }}>
                        <Routes>
                        {/* Home page after landing */}
                        <Route path="/" element={<ShowcaseHomePage />} />

                        {/* Smart Analysis — Autonomous Intelligence Layer (v2.0) */}
                        <Route
                          path="/smart-analysis"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading Smart Analysis..." />}>
                              <SmartAnalysisPage />
                            </Suspense>
                          }
                        />

                        {/* Manuscript Review — Journal Integration (Pillar 2) */}
                        <Route
                          path="/manuscript-review"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading Manuscript Review..." />}>
                              <ManuscriptReviewPage />
                            </Suspense>
                          }
                        />

                        {/* Journal Analytics Dashboard (v2.0) */}
                        <Route
                          path="/journal-analytics"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading Journal Analytics..." />}>
                              <JournalAnalyticsPage />
                            </Suspense>
                          }
                        />

                        {/* Platform Dashboard — Organization & Billing Management */}
                        <Route
                          path="/platform"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading Platform Dashboard..." />}>
                              <PlatformDashboardPage />
                            </Suspense>
                          }
                        />

                        {/* Main Statistical Dashboard - The Hub */}
                        <Route
                          path="/dashboard"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading Statistical Dashboard..." />}>
                              <StatisticalDashboard />
                            </Suspense>
                          }
                        />
                        
                        {/* Professional Statistical Analysis - Main Analysis Interface */}
                        {/* Updated to use StatisticalAnalysisHub (Guardian-protected version) */}
                        <Route
                          path="/analysis"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading Analysis Interface..." />}>
                              <StatisticalAnalysisHub />
                            </Suspense>
                          }
                        />

                        {/* DEPRECATED: Legacy Statistical Analysis Page - REPLACED by /statistical-analysis-tools */}
                        {/* This route caused ChunkLoadError - ProfessionalStatisticalAnalysis.jsx is redundant */}
                        {/* All links now point to /statistical-analysis-tools (StatisticalAnalysisHub) */}
                        {/*
                        <Route
                          path="/statistical-analysis"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading Statistical Analysis..." />}>
                              <ProfessionalStatisticalAnalysis />
                            </Suspense>
                          }
                        />
                        */}


                        {/* Enhanced Statistical Analysis with Educational Content */}
                        <Route
                          path="/enhanced-analysis"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading Enhanced Analysis..." />}>
                              <EnhancedStatisticalAnalysis />
                            </Suspense>
                          }
                        />


                        {/* T-Test Complete Module */}
                        <Route
                          path="/modules/t-test"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading T-Test Module..." />}>
                              <TTestCompleteModule />
                            </Suspense>
                          }
                        />

                        {/* ANOVA Complete Module */}
                        <Route
                          path="/modules/anova"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading ANOVA Module..." />}>
                              <ANOVACompleteModule />
                            </Suspense>
                          }
                        />

                        {/* TEST UNIVERSE - Access to 40+ Statistical Tests with Guardian Protection */}
                        <Route
                          path="/test-universe"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading Test Universe..." />}>
                              <TestSelectionDashboard />
                            </Suspense>
                          }
                        />

                        {/* Guardian System Demo - Test Assumption Checking */}
                        <Route
                          path="/guardian-demo"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading Guardian System..." />}>
                              <GuardianWarning
                                educationalMode={true}
                                onProceed={() => {}}
                                onSelectAlternative={() => {}}
                                onViewEvidence={() => {}}
                              />
                            </Suspense>
                          }
                        />

                        {/* Master Test Runner - Complete Test Workflow */}
                        <Route
                          path="/test-runner"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading Master Test Runner..." />}>
                              <MasterTestRunner />
                            </Suspense>
                          }
                        />

                        {/* Unified Test Executor - All 46 Tests with Guardian Integration */}
                        <Route
                          path="/unified-test"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading Unified Test Executor..." />}>
                              <UnifiedTestExecutor />
                            </Suspense>
                          }
                        />

                        {/* Statistical Practice Audit Dashboard */}
                        <Route
                          path="/audit"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading Audit Dashboard..." />}>
                              <AuditDashboard />
                            </Suspense>
                          }
                        />

                        {/* T-Test with Real Backend (50-decimal precision) */}
                        <Route
                          path="/modules/t-test-real"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading Real T-Test with Backend..." />}>
                              <TTestRealBackend />
                            </Suspense>
                          }
                        />

                        {/* ANOVA with Real Backend (50-decimal precision) */}
                        <Route
                          path="/modules/anova-real"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading Real ANOVA with Backend..." />}>
                              <ANOVARealBackend />
                            </Suspense>
                          }
                        />

                        {/* Non-Parametric Tests with Real Backend (50-decimal precision) - PROFESSIONAL UI */}
                        <Route
                          path="/modules/nonparametric-real"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading Non-Parametric Tests with Professional UI..." />}>
                              <NonParametricTestsRealProfessional />
                            </Suspense>
                          }
                        />

                        {/* Power Analysis with Real Backend (50-decimal precision) */}
                        <Route
                          path="/modules/power-analysis-real"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading Power Analysis with Backend..." />}>
                              <PowerAnalysisReal />
                            </Suspense>
                          }
                        />

                        {/* Hypothesis Testing Module with Comprehensive Simulations */}
                        <Route
                          path="/modules/hypothesis-testing"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading Hypothesis Testing Module..." />}>
                              <HypothesisTestingModule />
                            </Suspense>
                          }
                        />

                        {/* Correlation & Regression Module with Advanced Features */}
                        <Route
                          path="/modules/correlation-regression"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading Correlation & Regression Module..." />}>
                              <CorrelationRegressionModule />
                            </Suspense>
                          }
                        />

                        {/* Mixed Effects Models Module (Phase 2 - December 2025) */}
                        <Route
                          path="/modules/mixed-models"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading Mixed Effects Models..." />}>
                              <MixedModelsModule />
                            </Suspense>
                          }
                        />

                        {/* Causal Inference Module (Phase 2 - December 2025) */}
                        <Route
                          path="/modules/causal-inference"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading Causal Inference Toolkit..." />}>
                              <CausalInferenceModule />
                            </Suspense>
                          }
                        />

                        {/* Multiple Testing Correction - Prevent p-hacking */}
                        <Route
                          path="/modules/multiplicity"
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading Multiplicity Correction..." />}>
                              <MultiplicityCorrectionPanel />
                            </Suspense>
                          }
                        />

                        {/* DEPRECATED: Legacy Statistical Tests Page - REPLACED by /statistical-analysis-tools */}
                        {/* This route used unprotected NonParametricTests and CategoricalTests components */}
                        {/* Guardian-protected versions are available in StatisticalAnalysisHub at /statistical-analysis-tools */}
                        {/* Deprecated: October 26, 2025 - Guardian Phase 1 Batch 1.5-1.6 */}
                        {/*
                        <Route
                          path="/statistical-tests"
                          element={
                            <ProtectedRoute>
                              <Suspense fallback={<LoadingComponent message="Loading Statistical Tests..." />}>
                                <StatisticalTestsPage />
                              </Suspense>
                            </ProtectedRoute>
                          }
                        />
                        */}
                        
                        {/* Enterprise Dashboard */}
                        <Route 
                          path="/enterprise" 
                          element={
                            <ProtectedRoute>
                              <Suspense fallback={<LoadingComponent message="Loading Enterprise Dashboard..." />}>
                                <EnterpriseDashboard />
                              </Suspense>
                            </ProtectedRoute>
                          } 
                        />
                        
                        {/* Authentication routes */}
                        <Route 
                          path="/login" 
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading login..." />}>
                              <LoginPage />
                            </Suspense>
                          } 
                        />
                        
                        <Route 
                          path="/register" 
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading registration..." />}>
                              <RegisterPage />
                            </Suspense>
                          } 
                        />
                        
                        <Route 
                          path="/debug-login" 
                          element={
                            <Suspense fallback={<LoadingComponent message="Loading debug login..." />}>
                              <DebugLoginPage />
                            </Suspense>
                          } 
                        />
                        
                        {/* All main module routes are lazy loaded - Protected */}
                        <Route 
                          path="/statistics/*" 
                          element={
                            <ProtectedRoute>
                              <Suspense fallback={<LoadingComponent message="Loading Statistics Module..." />}>
                                <StatisticsPage />
                              </Suspense>
                            </ProtectedRoute>
                          } 
                        />
                      
                      <Route
                        path="/sqc-analysis/*"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading SQC Analysis Module..." />}>
                            <SQCAnalysisPage />
                          </Suspense>
                        }
                      />

                      <Route
                        path="/doe-analysis/*"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading DOE Analysis Module..." />}>
                            <DOEAnalysisPage />
                          </Suspense>
                        }
                      />

                      <Route
                        path="/pca-analysis/*"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading PCA Analysis Module..." />}>
                            <PCAAnalysisPage />
                          </Suspense>
                        }
                      />

                      <Route
                        path="/survival-analysis/*"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading Survival Analysis Module..." />}>
                            <SurvivalAnalysisPage />
                          </Suspense>
                        }
                      />

                      <Route
                        path="/factor-analysis/*"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading Factor Analysis Module..." />}>
                            <FactorAnalysisPage />
                          </Suspense>
                        }
                      />

                      {/* Meta-Analysis Module - Forest Plots, Heterogeneity, Publication Bias */}
                      <Route
                        path="/meta-analysis"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading Meta-Analysis..." />}>
                            <MetaAnalysisHub />
                          </Suspense>
                        }
                      />

                      {/* Publication Plot Builder - Prism-like publication-quality plots */}
                      <Route
                        path="/publication-plots"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading Publication Plot Builder..." />}>
                            <PublicationPlotsPage />
                          </Suspense>
                        }
                      />

                      {/* Paper Parser - Analyze papers for statistical quality */}
                      <Route
                        path="/paper-parser"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading Paper Parser..." />}>
                            <PaperParserHub />
                          </Suspense>
                        }
                      />

                      <Route
                        path="/learn"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading Learning Hub..." />}>
                            <LearningHub />
                          </Suspense>
                        }
                      />

                      <Route
                        path="/pca-learn"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading PCA Education..." />}>
                            <PCAEducationHub />
                          </Suspense>
                        }
                      />

                      <Route
                        path="/ci-learn"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading CI Education..." />}>
                            <CIEducationHub />
                          </Suspense>
                        }
                      />

                      <Route
                        path="/doe-learn"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading DOE Education..." />}>
                            <DOEEducationHub />
                          </Suspense>
                        }
                      />

                      <Route
                        path="/probability-learn"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading Probability Education..." />}>
                            <ProbabilityEducationHub />
                          </Suspense>
                        }
                      />

                      <Route
                        path="/sqc-learn"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading SQC Education..." />}>
                            <SQCEducationHub />
                          </Suspense>
                        }
                      />

                      <Route
                        path="/power-learn"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading Power Analysis Education..." />}>
                            <PowerAnalysisEducationHub />
                          </Suspense>
                        }
                      />

                      <Route
                        path="/biophysics-learn"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading Biophysics Education..." />}>
                            <BiophysicsLearningHub />
                          </Suspense>
                        }
                      />

                      <Route
                        path="/statistical-analysis-tools"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading Statistical Analysis Platform..." />}>
                            <StatisticalAnalysisHub />
                          </Suspense>
                        }
                      />

                      <Route
                        path="/probability-distributions/*"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading Probability Distributions Module..." />}>
                            <ProbabilityDistributionsPage />
                          </Suspense>
                        }
                      />

                      <Route
                        path="/confidence-intervals/*"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading Confidence Intervals Module..." />}>
                            <ConfidenceIntervalsPage />
                          </Suspense>
                        }
                      />
                      
                      <Route 
                        path="/advanced-statistics/*" 
                        element={
                          <ProtectedRoute>
                            <Suspense fallback={<LoadingComponent message="Loading Advanced Statistics Module..." />}>
                              <AdvancedStatisticsPage />
                            </Suspense>
                          </ProtectedRoute>
                        } 
                      />
                      
                      <Route 
                        path="/visualization-studio/*" 
                        element={
                          <ProtectedRoute>
                            <Suspense fallback={<LoadingComponent message="Loading Visualization Studio..." />}>
                              <VisualizationStudioPage />
                            </Suspense>
                          </ProtectedRoute>
                        } 
                      />
                      
                      <Route 
                        path="/workflows/*" 
                        element={
                          <ProtectedRoute>
                            <Suspense fallback={<LoadingComponent message="Loading Workflow Management Module..." />}>
                              <WorkflowManagementPage />
                            </Suspense>
                          </ProtectedRoute>
                        } 
                      />
                      
                      <Route 
                        path="/reports/*" 
                        element={
                          <ProtectedRoute>
                            <Suspense fallback={<LoadingComponent message="Loading Report Management Module..." />}>
                              <ReportManagementPage />
                            </Suspense>
                          </ProtectedRoute>
                        } 
                      />
                      
                      <Route 
                        path="/reporting-studio/*" 
                        element={
                          <ProtectedRoute>
                            <Suspense fallback={<LoadingComponent message="Loading Reporting Studio..." />}>
                              <ReportingStudioPage />
                            </Suspense>
                          </ProtectedRoute>
                        } 
                      />
                      
                      {/* Test routes - for development only */}
                      <Route 
                        path="/test/calculator" 
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading Test Calculator..." />}>
                            <TestCalculator />
                          </Suspense>
                        } 
                      />
                      
                      <Route
                        path="/test/performance"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading Performance Test Dashboard..." />}>
                            <PerformanceTestDashboard />
                          </Suspense>
                        }
                      />
                      
                      {/* Security Dashboard (admin only) */}
                      <Route
                        path="/security"
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <Suspense fallback={<LoadingComponent message="Loading Security Dashboard..." />}>
                              <SecurityDashboardPage />
                            </Suspense>
                          </ProtectedRoute>
                        }
                      />
                      
                      {/* WebSocket Monitoring Dashboard (admin only) */}
                      <Route
                        path="/monitoring/websocket"
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <Suspense fallback={<LoadingComponent message="Loading WebSocket Monitoring..." />}>
                              <WebSocketMonitoringPage />
                            </Suspense>
                          </ProtectedRoute>
                        }
                      />
                      
                      {/* RAG Performance Monitoring Dashboard (admin only) */}
                      <Route
                        path="/monitoring/rag-performance"
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <Suspense fallback={<LoadingComponent message="Loading RAG Performance Monitoring..." />}>
                              <RAGPerformanceMonitoringPage />
                            </Suspense>
                          </ProtectedRoute>
                        }
                      />
                      
                      {/* Browser Compatibility Testing Page */}
                      <Route
                        path="/testing/browser-compatibility"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading Browser Compatibility Testing..." />}>
                            <BrowserCompatibilityTestPage />
                          </Suspense>
                        }
                      />
                      
                      {/* Keyboard Shortcuts Page */}
                      <Route
                        path="/shortcuts"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading Keyboard Shortcuts..." />}>
                            <KeyboardShortcutsPage />
                          </Suspense>
                        }
                      />
                      
                      {/* Search Results Page */}
                      <Route
                        path="/search"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading Search Results..." />}>
                            <SearchResultsPage />
                          </Suspense>
                        }
                      />
                      
                      {/* Branding Management (admin only) */}
                      <Route
                        path="/admin/branding"
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <Suspense fallback={<LoadingComponent message="Loading Branding Manager..." />}>
                              <BrandingManager />
                            </Suspense>
                          </ProtectedRoute>
                        }
                      />
                      
                      {/* Access Denied route */}
                      <Route path="/unauthorized" element={
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                          <Typography variant="h4" gutterBottom>Access Denied</Typography>
                          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>You don't have permission to access this page.</Typography>
                          <Button variant="contained" href="/">Return Home</Button>
                        </Box>
                      } />

                      {/* Terms of Service */}
                      <Route path="/terms" element={
                        <Box sx={{ maxWidth: 800, mx: 'auto', p: 4, minHeight: '60vh' }}>
                          <Typography variant="h4" gutterBottom>Terms of Service</Typography>
                          <Typography variant="body1" paragraph>StickForStats is open-source software released under the MIT License. It is provided as-is for academic and research purposes.</Typography>
                          <Typography variant="body1" paragraph>By using this software, you agree to use it responsibly and in accordance with your institution's policies. You are solely responsible for verifying the correctness of any statistical results before using them in publications or decision-making.</Typography>
                          <Typography variant="body1" paragraph>This software is not a substitute for professional statistical consultation. The authors make no warranties regarding the accuracy or suitability of the software for any particular purpose.</Typography>
                          <Button variant="outlined" href="/" sx={{ mt: 2 }}>Return Home</Button>
                        </Box>
                      } />

                      {/* Privacy Dashboard — GDPR Compliance (v2.0) */}
                      <Route
                        path="/privacy"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading Privacy Dashboard..." />}>
                            <PrivacyDashboardPage />
                          </Suspense>
                        }
                      />

                      {/* Plugin Marketplace */}
                      <Route
                        path="/marketplace"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading Plugin Marketplace..." />}>
                            <MarketplacePage />
                          </Suspense>
                        }
                      />

                      {/* Certification Program */}
                      <Route
                        path="/certification"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading Certification Program..." />}>
                            <CertificationPage />
                          </Suspense>
                        }
                      />

                      {/* API Documentation */}
                      <Route
                        path="/api-docs"
                        element={
                          <Suspense fallback={<LoadingComponent message="Loading API Documentation..." />}>
                            <APIDocsPage />
                          </Suspense>
                        }
                      />

                      {/* Catch-all route for 404 */}
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </main>
                  <Footer />
                    <ServiceWorkerUpdater />
                    <PWAInstallPrompt />
                    {showPrefetchDebug && <PrefetchDebug position={{ bottom: 16, right: 16 }} />}
                    {/* {process.env.NODE_ENV === 'development' && <AuthDebug />} */}
                              </div>
                            </TourProvider>
                          </SettingsProvider>
                        </CommandPaletteProvider>
                    </SearchProvider>
                  </OnboardingProvider>
                </AuthProvider>
              </Router>
            </PrefetchProvider>
            </ReduxProvider>
          </SnackbarProvider>
        </BrandingProvider>
      </AppThemeProvider>
      </DarkModeProvider>
      </MathJaxContext>
    </ErrorBoundary>
  );
}

export default App;