import { lazy } from 'react';

// --- Lazy-loaded page components (code-split into separate chunks) ---

// Landing & home pages
export const ProfessionalLandingPage = lazy(() => import('../components/Landing/ProfessionalLanding'));
const ShowcaseHomePage = lazy(() => import('../pages/ShowcaseHomePage'));

// Global UI components (lazy-loaded to reduce main bundle)
export const AIAdvisorHub = lazy(() => import('../components/ai-advisor/AIAdvisorHub'));
export const PrefetchDebug = lazy(() => import('../components/navigation/PrefetchDebug'));
export const CommandPalette = lazy(() => import('../components/common/CommandPalette'));
export const GlobalSearch = lazy(() => import('../components/common/GlobalSearch'));

// Authentication pages
const LoginPage = lazy(() => import('../pages/LoginPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));

// /debug-login was historically a dev-only quick-login page bundling
// hardcoded test credentials. The page (and its credential strings)
// were removed in 2026-05-06 — see docs/CRITICAL_REVIEW_2026-05-06.md
// §P0-5. The route is preserved as an alias to the regular login page
// so bookmarks do not 404.
const DebugLoginPage = LoginPage;

// Main statistical pages
const EnhancedStatisticalAnalysis = lazy(() => import('../pages/EnhancedStatisticalAnalysis'));
const TTestCompleteModule = lazy(() => import('../modules/TTestCompleteModule'));
const ANOVACompleteModule = lazy(() => import('../modules/ANOVACompleteModule'));

// Real Backend-Connected Test Modules (50-decimal precision)
const TTestRealBackend = lazy(() => import('../modules/TTestRealBackend'));
const ANOVARealBackend = lazy(() => import('../modules/ANOVARealBackend'));

// Using Real Backend-Connected Modules (50-decimal precision)
const HypothesisTestingModuleReal = lazy(() => import('../modules/HypothesisTestingModuleReal'));
const WhyGuardianPage = lazy(() => import('../pages/WhyGuardianPage'));
const CorrelationRegressionModuleReal = lazy(() => import('../modules/CorrelationRegressionModuleReal'));
const NonParametricTestsRealProfessional = lazy(() => import('../modules/NonParametricTestsRealProfessional'));
const PowerAnalysisReal = lazy(() => import('../modules/PowerAnalysisReal'));

// Mixed Effects Models & Causal Inference Modules
const MixedModelsModule = lazy(() => import('../modules/MixedModelsModule'));
const CausalInferenceModule = lazy(() => import('../modules/CausalInferenceModule'));

// Multiple Testing Correction Panel
const MultiplicityCorrectionPanel = lazy(() => import('../components/MultiplicityCorrectionPanel/MultiplicityCorrectionPanel'));
const StatisticalDashboard = lazy(() => import('../pages/StatisticalDashboard'));

// Test Universe - Access to 40+ Statistical Tests
const TestSelectionDashboard = lazy(() => import('../components/TestSelectionDashboard'));
const GuardianWarning = lazy(() => import('../components/Guardian/GuardianWarning'));
const MasterTestRunner = lazy(() => import('../components/MasterTestRunner'));

// Unified Test Executor - Complete test workflow with all 46 tests
const UnifiedTestExecutor = lazy(() => import('../components/UnifiedTestExecutor'));

// Statistical Practice Audit Dashboard
const AuditDashboard = lazy(() => import('../components/AuditDashboard'));
const StatisticsPage = lazy(() => import('../pages/StatisticsPage'));
const SQCAnalysisPage = lazy(() => import('../pages/SQCAnalysisPage'));
const DOEAnalysisPage = lazy(() => import('../pages/DOEAnalysisPage'));
const PCAAnalysisPage = lazy(() => import('../pages/PCAAnalysisPage'));
const SurvivalAnalysisPage = lazy(() => import('../pages/SurvivalAnalysisPage'));
const GenomicsAnalysisPage = lazy(() => import('../pages/GenomicsAnalysisPage'));
const FactorAnalysisPage = lazy(() => import('../pages/FactorAnalysisPage'));
const PCAEducationHub = lazy(() => import('../components/pca/education/PCAEducationHub'));
const CIEducationHub = lazy(() => import('../components/confidence_intervals/education/CIEducationHub'));
const DOEEducationHub = lazy(() => import('../components/doe/education/DOEEducationHub'));
const ProbabilityEducationHub = lazy(() => import('../components/probability_distributions/education/ProbabilityEducationHub'));
const SQCEducationHub = lazy(() => import('../components/sqc/education/SQCEducationHub'));
const PowerAnalysisEducationHub = lazy(() => import('../components/power-analysis/education/PowerAnalysisEducationHub'));
const BiophysicsLearningHub = lazy(() => import('../components/biophysics-education/BiophysicsLearningHub'));
const StatisticalAnalysisHub = lazy(() => import('../components/statistical-analysis/StatisticalAnalysisHub'));
const MetaAnalysisHub = lazy(() => import('../components/meta-analysis/MetaAnalysisHub'));
const PublicationPlotsPage = lazy(() => import('../pages/PublicationPlotsPage'));
const PaperParserHub = lazy(() => import('../components/paper-parser/PaperParserHub'));
const LearningHub = lazy(() => import('../components/education/LearningHub'));
const WorkflowManagementPage = lazy(() => import('../pages/WorkflowManagementPage'));
const ReportManagementPage = lazy(() => import('../pages/ReportManagementPage'));
const ConfidenceIntervalsPage = lazy(() => import('../components/confidence_intervals/ConfidenceIntervalsPage'));
const ProbabilityDistributionsPage = lazy(() => import('../pages/LazyProbabilityDistributionsPage'));
const TestCalculator = lazy(() => import('../components/probability_distributions/TestCalculator'));
const AdvancedStatisticsPage = lazy(() => import('../pages/AdvancedStatisticsPage'));
const VisualizationStudioPage = lazy(() => import('../pages/VisualizationStudioPage'));
const ReportingStudioPage = lazy(() => import('../pages/ReportingStudioPage'));
const SecurityDashboardPage = lazy(() => import('../pages/SecurityDashboardPage'));
const PerformanceTestDashboard = lazy(() => import('../components/performance/PerformanceTestDashboard'));
const WebSocketMonitoringPage = lazy(() => import('../pages/WebSocketMonitoringPage'));
const RAGPerformanceMonitoringPage = lazy(() => import('../pages/RAGPerformanceMonitoringPage'));
const BrowserCompatibilityTestPage = lazy(() => import('../pages/BrowserCompatibilityTestPage'));

// Autonomous Intelligence Layer (v2.0)
const SmartAnalysisPage = lazy(() => import('../pages/SmartAnalysisPage'));

// Journal Integration / Manuscript Review (Pillar 2)
const ManuscriptReviewPage = lazy(() => import('../pages/ManuscriptReviewPage'));
const ManuscriptVerifierPage = lazy(() => import('../pages/ManuscriptVerifierPage'));
const ReviewerModePage = lazy(() => import('../pages/ReviewerModePage'));

// Platform Dashboard
const PlatformDashboardPage = lazy(() => import('../pages/PlatformDashboardPage'));

// Journal Analytics Dashboard (v2.0)
const JournalAnalyticsPage = lazy(() => import('../pages/JournalAnalyticsPage'));

const EnterpriseDashboard = lazy(() => import('../components/enterprise/EnterpriseDashboard'));
const KeyboardShortcutsPage = lazy(() => import('../pages/KeyboardShortcutsPage'));
const SearchResultsPage = lazy(() => import('../pages/SearchResultsPage'));
const BrandingManager = lazy(() => import('../components/admin/BrandingManager'));

// GDPR Privacy Dashboard (v2.0)
const PrivacyDashboardPage = lazy(() => import('../pages/PrivacyDashboardPage'));

// Plugin Marketplace
const MarketplacePage = lazy(() => import('../pages/MarketplacePage'));

// Certification Program
const CertificationPage = lazy(() => import('../pages/CertificationPage'));

// API Documentation
const APIDocsPage = lazy(() => import('../pages/APIDocsPage'));

// --- Route configuration ---
// Each entry is either
//   { path, component, loadingMessage, protected?, requiredRole?, props?, skeleton? }
// or a retired alias
//   { path, redirect }
// which renders <Navigate to={redirect} replace /> so old links do not 404.

const ROUTE_CONFIG = [
  // Home
  { path: '/', component: ShowcaseHomePage, loadingMessage: 'Loading Home...', skeleton: 'dashboard' },

  // v2.0 Pillar routes
  { path: '/smart-analysis', component: SmartAnalysisPage, loadingMessage: 'Loading Smart Analysis...', skeleton: 'analysis' },
  { path: '/manuscript-review', component: ManuscriptReviewPage, loadingMessage: 'Loading Manuscript Review...', skeleton: 'form' },
  { path: '/manuscript-verifier', component: ManuscriptVerifierPage, loadingMessage: 'Loading Manuscript Verifier...', skeleton: 'form' },
  { path: '/reviewer', component: ReviewerModePage, loadingMessage: 'Loading Reviewer Mode...', skeleton: 'form' },
  { path: '/review/:submissionId', component: ReviewerModePage, loadingMessage: 'Loading review...', skeleton: 'form' },
  { path: '/journal-analytics', component: JournalAnalyticsPage, loadingMessage: 'Loading Journal Analytics...', skeleton: 'dashboard' },
  { path: '/platform', component: PlatformDashboardPage, loadingMessage: 'Loading Platform Dashboard...', skeleton: 'dashboard' },

  // Main statistical pages
  { path: '/dashboard', component: StatisticalDashboard, loadingMessage: 'Loading Statistical Dashboard...', skeleton: 'dashboard' },
  // /analysis rendered the very same StatisticalAnalysisHub as
  // /statistical-analysis-tools, which is the one the nav and home page link.
  { path: '/analysis', redirect: '/statistical-analysis-tools' },
  { path: '/enhanced-analysis', component: EnhancedStatisticalAnalysis, loadingMessage: 'Loading Enhanced Analysis...', skeleton: 'analysis' },

  // Test modules
  { path: '/modules/t-test', component: TTestCompleteModule, loadingMessage: 'Loading T-Test Module...', skeleton: 'analysis' },
  { path: '/modules/anova', component: ANOVACompleteModule, loadingMessage: 'Loading ANOVA Module...', skeleton: 'analysis' },
  { path: '/test-universe', component: TestSelectionDashboard, loadingMessage: 'Loading Test Universe...', skeleton: 'dashboard' },
  {
    path: '/guardian-demo',
    component: GuardianWarning,
    loadingMessage: 'Loading Guardian System...',
    props: { educationalMode: true, onProceed: () => {}, onSelectAlternative: () => {}, onViewEvidence: () => {} }
  },
  { path: '/test-runner', component: MasterTestRunner, loadingMessage: 'Loading Master Test Runner...' },
  { path: '/unified-test', component: UnifiedTestExecutor, loadingMessage: 'Loading Unified Test Executor...' },
  { path: '/audit', component: AuditDashboard, loadingMessage: 'Loading Audit Dashboard...', skeleton: 'table' },

  // Real backend modules (50-decimal precision).
  //
  // These look like duplicates of /modules/t-test and /modules/anova but are
  // not, and must not be collapsed into them without porting the differences:
  //   - t-test-real renders the Guardian report/badge, the confidence interval
  //     and Cohen's d, none of which the canonical module shows. It is also the
  //     page e2e/capture_guardian.js drives to regenerate manuscript Figure 7.
  //   - anova-real reports the full 50-decimal SS/MS/F and every effect size
  //     (eta^2, omega^2, partial eta^2, Cohen's f) straight from
  //     high_precision_result; the canonical module rounds for display.
  { path: '/modules/t-test-real', component: TTestRealBackend, loadingMessage: 'Loading Real T-Test with Backend...' },
  { path: '/modules/anova-real', component: ANOVARealBackend, loadingMessage: 'Loading Real ANOVA with Backend...' },
  { path: '/modules/nonparametric-real', component: NonParametricTestsRealProfessional, loadingMessage: 'Loading Non-Parametric Tests with Professional UI...' },
  { path: '/modules/power-analysis-real', component: PowerAnalysisReal, loadingMessage: 'Loading Power Analysis with Backend...' },
  { path: '/modules/hypothesis-testing', component: HypothesisTestingModuleReal, loadingMessage: 'Loading Hypothesis Testing Module...' },
  { path: '/modules/correlation-regression', component: CorrelationRegressionModuleReal, loadingMessage: 'Loading Correlation & Regression Module...' },
  { path: '/modules/mixed-models', component: MixedModelsModule, loadingMessage: 'Loading Mixed Effects Models...' },
  { path: '/modules/causal-inference', component: CausalInferenceModule, loadingMessage: 'Loading Causal Inference Toolkit...' },
  { path: '/modules/multiplicity', component: MultiplicityCorrectionPanel, loadingMessage: 'Loading Multiplicity Correction...' },

  // Authentication
  { path: '/login', component: LoginPage, loadingMessage: 'Loading login...', skeleton: 'form' },
  { path: '/register', component: RegisterPage, loadingMessage: 'Loading registration...', skeleton: 'form' },
  // /debug-login is now an alias for /login (see top of file)
  { path: '/debug-login', component: DebugLoginPage, loadingMessage: 'Loading login...' },

  // Protected module routes
  { path: '/statistics/*', component: StatisticsPage, loadingMessage: 'Loading Statistics Module...', protected: true, skeleton: 'analysis' },
  { path: '/advanced-statistics/*', component: AdvancedStatisticsPage, loadingMessage: 'Loading Advanced Statistics Module...', protected: true, skeleton: 'analysis' },
  { path: '/visualization-studio/*', component: VisualizationStudioPage, loadingMessage: 'Loading Visualization Studio...', protected: true, skeleton: 'dashboard' },
  { path: '/workflows/*', component: WorkflowManagementPage, loadingMessage: 'Loading Workflow Management Module...', protected: true, skeleton: 'table' },
  { path: '/reports/*', component: ReportManagementPage, loadingMessage: 'Loading Report Management Module...', protected: true, skeleton: 'table' },
  { path: '/reporting-studio/*', component: ReportingStudioPage, loadingMessage: 'Loading Reporting Studio...', protected: true, skeleton: 'dashboard' },
  { path: '/enterprise', component: EnterpriseDashboard, loadingMessage: 'Loading Enterprise Dashboard...', protected: true, skeleton: 'dashboard' },

  // Analysis pages (not protected)
  { path: '/sqc-analysis/*', component: SQCAnalysisPage, loadingMessage: 'Loading SQC Analysis Module...', skeleton: 'analysis' },
  { path: '/doe-analysis/*', component: DOEAnalysisPage, loadingMessage: 'Loading DOE Analysis Module...', skeleton: 'analysis' },
  { path: '/pca-analysis/*', component: PCAAnalysisPage, loadingMessage: 'Loading PCA Analysis Module...', skeleton: 'analysis' },
  { path: '/survival-analysis/*', component: SurvivalAnalysisPage, loadingMessage: 'Loading Survival Analysis Module...', skeleton: 'analysis' },
  { path: '/genomics-analysis', component: GenomicsAnalysisPage, loadingMessage: 'Loading Genomics Analysis...', skeleton: 'analysis' },
  { path: '/factor-analysis/*', component: FactorAnalysisPage, loadingMessage: 'Loading Factor Analysis Module...', skeleton: 'analysis' },
  { path: '/meta-analysis', component: MetaAnalysisHub, loadingMessage: 'Loading Meta-Analysis...', skeleton: 'analysis' },
  { path: '/publication-plots', component: PublicationPlotsPage, loadingMessage: 'Loading Publication Plot Builder...', skeleton: 'dashboard' },
  { path: '/paper-parser', component: PaperParserHub, loadingMessage: 'Loading Paper Parser...', skeleton: 'form' },
  { path: '/statistical-analysis-tools', component: StatisticalAnalysisHub, loadingMessage: 'Loading Statistical Analysis Platform...', skeleton: 'dashboard' },
  { path: '/probability-distributions/*', component: ProbabilityDistributionsPage, loadingMessage: 'Loading Probability Distributions Module...' },
  { path: '/confidence-intervals/*', component: ConfidenceIntervalsPage, loadingMessage: 'Loading Confidence Intervals Module...' },

  // Education hubs
  { path: '/learn', component: LearningHub, loadingMessage: 'Loading Learning Hub...' },
  { path: '/why-guardian', component: WhyGuardianPage, loadingMessage: 'Loading the Why Guardian? demo...' },
  { path: '/pca-learn', component: PCAEducationHub, loadingMessage: 'Loading PCA Education...' },
  { path: '/ci-learn', component: CIEducationHub, loadingMessage: 'Loading CI Education...' },
  { path: '/doe-learn', component: DOEEducationHub, loadingMessage: 'Loading DOE Education...' },
  { path: '/probability-learn', component: ProbabilityEducationHub, loadingMessage: 'Loading Probability Education...' },
  { path: '/sqc-learn', component: SQCEducationHub, loadingMessage: 'Loading SQC Education...' },
  { path: '/power-learn', component: PowerAnalysisEducationHub, loadingMessage: 'Loading Power Analysis Education...' },
  { path: '/biophysics-learn', component: BiophysicsLearningHub, loadingMessage: 'Loading Biophysics Education...' },

  // Test & dev routes
  { path: '/test/calculator', component: TestCalculator, loadingMessage: 'Loading Test Calculator...' },
  { path: '/test/performance', component: PerformanceTestDashboard, loadingMessage: 'Loading Performance Test Dashboard...' },
  { path: '/testing/browser-compatibility', component: BrowserCompatibilityTestPage, loadingMessage: 'Loading Browser Compatibility Testing...' },

  // Admin routes (require admin role)
  { path: '/security', component: SecurityDashboardPage, loadingMessage: 'Loading Security Dashboard...', protected: true, requiredRole: 'admin' },
  { path: '/monitoring/websocket', component: WebSocketMonitoringPage, loadingMessage: 'Loading WebSocket Monitoring...', protected: true, requiredRole: 'admin' },
  { path: '/monitoring/rag-performance', component: RAGPerformanceMonitoringPage, loadingMessage: 'Loading RAG Performance Monitoring...', protected: true, requiredRole: 'admin' },
  { path: '/admin/branding', component: BrandingManager, loadingMessage: 'Loading Branding Manager...', protected: true, requiredRole: 'admin' },

  // Utility pages
  { path: '/shortcuts', component: KeyboardShortcutsPage, loadingMessage: 'Loading Keyboard Shortcuts...' },
  { path: '/search', component: SearchResultsPage, loadingMessage: 'Loading Search Results...' },

  // v2.0 platform pages
  // The GDPR data-controls dashboard lives at /privacy-settings, not /privacy:
  // the footer, beta banner and the register page's consent checkbox all link
  // /privacy expecting the legal Privacy Policy, which AppRoutes serves there.
  { path: '/privacy-settings', component: PrivacyDashboardPage, loadingMessage: 'Loading Privacy Settings...', skeleton: 'dashboard' },
  { path: '/marketplace', component: MarketplacePage, loadingMessage: 'Loading Plugin Marketplace...', skeleton: 'dashboard' },
  { path: '/certification', component: CertificationPage, loadingMessage: 'Loading Certification Program...', skeleton: 'form' },
  { path: '/api-docs', component: APIDocsPage, loadingMessage: 'Loading API Documentation...', skeleton: 'table' },
];

export default ROUTE_CONFIG;
