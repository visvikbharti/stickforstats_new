"""
URL Configuration for High-Precision Statistical API v1
"""

from django.urls import path
from .views import (
    HighPrecisionTTestView,
    HighPrecisionANOVAView,
    ComparisonView,
    DataImportView,
    ValidationDashboardView,
    health_check,
)
from .ancova_view import HighPrecisionANCOVAView
from .descriptive_view import DescriptiveStatisticsView
from .correlation_views import HighPrecisionCorrelationView, AutomaticTestSelectorView
from .power_views import (
    calculate_power_t_test,
    calculate_sample_size_t_test,
    calculate_effect_size_t_test,
    calculate_power_anova,
    calculate_power_correlation,
    calculate_power_chi_square,
    create_power_curves,
    optimal_allocation,
    sensitivity_analysis,
    comprehensive_power_report,
    power_analysis_info,
)
from .regression_views import HighPrecisionRegressionView
from .simple_regression_view import SimpleRegressionView
from .categorical_views import (
    chi_square_independence_test,
    chi_square_goodness_of_fit,
    fishers_exact_test,
    mcnemar_test,
    cochrans_q_test,
    g_test,
    binomial_test,
    multinomial_test,
    categorical_effect_sizes,
)
from .nonparametric_views import (
    mann_whitney_u_test,
    wilcoxon_signed_rank_test,
    kruskal_wallis_test,
    friedman_test,
    sign_test,
    moods_median_test,
    jonckheere_terpstra_test,
    pages_trend_test,
    nonparametric_post_hoc,
    nonparametric_effect_sizes,
)
from .missing_data_views import (
    detect_missing_patterns,
    impute_missing_data,
    perform_littles_mcar_test,
    compare_imputation_methods,
    visualize_missing_patterns,
    multiple_imputation,
    knn_imputation,
    em_algorithm_imputation,
    get_imputation_methods_info,
)
from .simple_test import simple_test
from .audit_views import AuditSummaryView, AuditRecordView, AuditMetricsView, audit_health_check
from .survival_views import (
    check_survival_availability,
    kaplan_meier_analysis,
    cox_regression,
    predict_survival,
    survival_tutorial,
)
from .factor_views import (
    check_factor_availability,
    test_adequacy,
    determine_factors,
    exploratory_factor_analysis,
    transform_factors,
    factor_tutorial,
)
from .ai_advisor_views import (
    AIAdvisorChatView,
    AIAdvisorStatusView,
    AIAdvisorConversationView,
    quick_recommendation,
    interpret_results,
    generate_methods_section,
    assumption_guidance,
    # NLP Enhanced endpoints
    parse_query,
    generate_analysis_plan,
    generate_apa_report,
    enhanced_chat,
)
from .meta_analysis_views import (
    MetaAnalysisView,
    convert_effect_size,
    calculate_effect_size_se,
    publication_bias_test,
    sensitivity_analysis as meta_sensitivity_analysis,
    subgroup_analysis,
)
from .report_views import ReportListView, ReportDetailView, generate_report, export_report
from .sqs_views import (
    SQSAnalyzeView,
    SQSAnalyzeTextView,
    SQSRulesView,
    SQSFieldsView,
    SQSCategoriesView,
    SQSQuickCheckView,
    SQSHealthView,
)
from .causal_views import (
    dag_create,
    dag_analyze,
    adjustment_sets,
    propensity_scores,
    matching,
    treatment_effects,
    sensitivity_analysis_view,
    mediation_baron_kenny,
    mediation_causal,
    mediation_sensitivity,
    mediation_multiple,
    did_analysis,
    did_event_study,
    did_parallel_trends,
    did_staggered,
)
from .mixed_models_views import (
    calculate_icc_view,
    fit_lmm,
    random_effects_view,
    compare_models_view,
    lmm_diagnostics,
)
from .autonomous_views import (
    SmartProfileView,
    AutonomousQueryView,
    CascadeExecuteView,
    TranslateResultsView,
    NextStepView,
)
from .manuscript_views import (
    ManuscriptAnalyzeView,
    ManuscriptParseView,
    ClaimExtractionView,
    ConsistencyCheckView,
    SubmissionReportView,
    JournalSubmitView,
)
from .batch_views import (
    BatchSubmitView,
    BatchStatusView,
)
from .data_import_views import (
    UniversalDataImportView,
    SupportedFormatsView,
)
from .schema_views import (
    OpenAPISchemaView,
    SwaggerUIView,
    ReDocView,
)
from .journal_analytics_views import (
    JournalAnalyticsOverviewView,
    JournalAnalyticsIssuesView,
    JournalAnalyticsTrendsView,
    JournalAnalyticsComparisonView,
)
from .platform_views import (
    TierInfoView,
    OrganizationCreateView,
    OrganizationDetailView,
    OrganizationMembersView,
    InviteMemberView,
    UsageDashboardView,
    BillingView,
    StripeWebhookView,
    APIKeyManageView,
    APIKeyRevokeView,
)
from .project_views import (
    ProjectListCreateView,
    ProjectDetailView,
    RBACPermissionsView,
    MemberRoleUpdateView,
)
from .gdpr_views import (
    ConsentStatusView,
    DataExportView,
    DataErasureView,
    PrivacyInfoView,
)
from . import marketplace_views
from . import lms_views
from . import certification_views
from . import sso_views
from . import site_license_views, plugin_runtime_views

app_name = "api-v1"

urlpatterns = [
    # Health check endpoint (for container orchestration)
    path("health/", health_check, name="health-check"),
    # High-precision statistical tests
    path("stats/ttest/", HighPrecisionTTestView.as_view(), name="hp-ttest"),
    path("stats/anova/", HighPrecisionANOVAView.as_view(), name="hp-anova"),
    # Alias routes for MANOVA and Repeated Measures ANOVA (use same view with anova_type parameter)
    path("multivariate/manova/", HighPrecisionANOVAView.as_view(), name="hp-manova"),
    path("anova/repeated-measures/", HighPrecisionANOVAView.as_view(), name="hp-repeated-measures"),
    path("stats/ancova/", HighPrecisionANCOVAView.as_view(), name="hp-ancova"),
    path("stats/correlation/", HighPrecisionCorrelationView.as_view(), name="hp-correlation"),
    path(
        "stats/regression/", SimpleRegressionView.as_view(), name="hp-regression-stats"
    ),  # Using simple version temporarily
    path("stats/descriptive/", DescriptiveStatisticsView.as_view(), name="hp-descriptive"),
    path("stats/comparison/", ComparisonView.as_view(), name="comparison"),
    # Automatic test selection
    path("stats/recommend/", AutomaticTestSelectorView.as_view(), name="test-recommendation"),
    # Data management
    path("data/import/", DataImportView.as_view(), name="data-import"),
    path("data/universal-import/", UniversalDataImportView.as_view(), name="universal-data-import"),
    path("data/supported-formats/", SupportedFormatsView.as_view(), name="supported-formats"),
    # Validation and metrics
    path("validation/dashboard/", ValidationDashboardView.as_view(), name="validation-dashboard"),
    # Power Analysis endpoints (50 decimal precision)
    path("power/t-test/", calculate_power_t_test, name="power-t-test"),
    path("power/sample-size/t-test/", calculate_sample_size_t_test, name="sample-size-t-test"),
    path("power/effect-size/t-test/", calculate_effect_size_t_test, name="effect-size-t-test"),
    path("power/anova/", calculate_power_anova, name="power-anova"),
    path("power/correlation/", calculate_power_correlation, name="power-correlation"),
    path("power/chi-square/", calculate_power_chi_square, name="power-chi-square"),
    path("power/curves/", create_power_curves, name="power-curves"),
    path("power/allocation/", optimal_allocation, name="optimal-allocation"),
    path("power/sensitivity/", sensitivity_analysis, name="sensitivity-analysis"),
    path("power/report/", comprehensive_power_report, name="power-report"),
    path("power/info/", power_analysis_info, name="power-info"),
    # Simple test endpoint
    path("test/", simple_test, name="simple-test"),
    # Regression Analysis endpoints (50 decimal precision)
    path("regression/", HighPrecisionRegressionView.as_view(), name="hp-regression"),
    path("regression/linear/", HighPrecisionRegressionView.as_view(), name="linear-regression"),
    path("regression/multiple/", HighPrecisionRegressionView.as_view(), name="multiple-regression"),
    path("regression/polynomial/", HighPrecisionRegressionView.as_view(), name="polynomial-regression"),
    path("regression/logistic/", HighPrecisionRegressionView.as_view(), name="logistic-regression"),
    path("regression/ridge/", HighPrecisionRegressionView.as_view(), name="ridge-regression"),
    path("regression/lasso/", HighPrecisionRegressionView.as_view(), name="lasso-regression"),
    # Categorical Analysis endpoints (50 decimal precision)
    path("categorical/chi-square/independence/", chi_square_independence_test, name="chi-square-independence"),
    path("categorical/chi-square/goodness/", chi_square_goodness_of_fit, name="chi-square-goodness"),
    path("categorical/fishers/", fishers_exact_test, name="fishers-exact"),
    path("categorical/mcnemar/", mcnemar_test, name="mcnemar"),
    path("categorical/cochran-q/", cochrans_q_test, name="cochran-q"),
    path("categorical/g-test/", g_test, name="g-test"),
    path("categorical/binomial/", binomial_test, name="binomial"),
    path("categorical/multinomial/", multinomial_test, name="multinomial"),
    path("categorical/effect-sizes/", categorical_effect_sizes, name="categorical-effect-sizes"),
    # Non-parametric Analysis endpoints (50 decimal precision)
    path("nonparametric/mann-whitney/", mann_whitney_u_test, name="mann-whitney"),
    path("nonparametric/wilcoxon/", wilcoxon_signed_rank_test, name="wilcoxon"),
    path("nonparametric/kruskal-wallis/", kruskal_wallis_test, name="kruskal-wallis"),
    path("nonparametric/friedman/", friedman_test, name="friedman"),
    path("nonparametric/sign/", sign_test, name="sign-test"),
    path("nonparametric/mood/", moods_median_test, name="mood-median"),
    path("nonparametric/jonckheere/", jonckheere_terpstra_test, name="jonckheere"),
    path("nonparametric/page/", pages_trend_test, name="page-trend"),
    path("nonparametric/post-hoc/", nonparametric_post_hoc, name="nonparametric-post-hoc"),
    path("nonparametric/effect-sizes/", nonparametric_effect_sizes, name="nonparametric-effect-sizes"),
    # Missing Data endpoints
    path("missing-data/detect/", detect_missing_patterns, name="detect-missing"),
    path("missing-data/impute/", impute_missing_data, name="impute-missing"),
    path("missing-data/little-test/", perform_littles_mcar_test, name="little-mcar"),
    path("missing-data/compare/", compare_imputation_methods, name="compare-imputation"),
    path("missing-data/visualize/", visualize_missing_patterns, name="visualize-missing"),
    path("missing-data/multiple-imputation/", multiple_imputation, name="multiple-imputation"),
    path("missing-data/knn/", knn_imputation, name="knn-imputation"),
    path("missing-data/em/", em_algorithm_imputation, name="em-imputation"),
    path("missing-data/info/", get_imputation_methods_info, name="imputation-info"),
    # Audit System endpoints (Real data only - no mock data)
    path("audit/summary/", AuditSummaryView.as_view(), name="audit-summary"),
    path("audit/record/", AuditRecordView.as_view(), name="audit-record"),
    path("audit/metrics/<str:metric_type>/", AuditMetricsView.as_view(), name="audit-metrics"),
    path("audit/health/", audit_health_check, name="audit-health"),
    # Survival Analysis endpoints
    path("survival/availability/", check_survival_availability, name="survival-availability"),
    path("survival/kaplan-meier/", kaplan_meier_analysis, name="kaplan-meier"),
    path("survival/cox-regression/", cox_regression, name="cox-regression"),
    path("survival/predict/", predict_survival, name="survival-predict"),
    path("survival/tutorial/", survival_tutorial, name="survival-tutorial"),
    # Factor Analysis endpoints
    path("factor/availability/", check_factor_availability, name="factor-availability"),
    path("factor/adequacy/", test_adequacy, name="factor-adequacy"),
    path("factor/determine/", determine_factors, name="determine-factors"),
    path("factor/efa/", exploratory_factor_analysis, name="exploratory-factor-analysis"),
    path("factor/transform/", transform_factors, name="factor-transform"),
    path("factor/tutorial/", factor_tutorial, name="factor-tutorial"),
    # AI Advisor endpoints (Claude-powered statistical guidance)
    path("ai-advisor/chat/", AIAdvisorChatView.as_view(), name="ai-advisor-chat"),
    path("ai-advisor/status/", AIAdvisorStatusView.as_view(), name="ai-advisor-status"),
    path(
        "ai-advisor/conversation/<str:conversation_id>/",
        AIAdvisorConversationView.as_view(),
        name="ai-advisor-conversation",
    ),
    path("ai-advisor/quick-recommend/", quick_recommendation, name="ai-advisor-quick-recommend"),
    path("ai-advisor/interpret/", interpret_results, name="ai-advisor-interpret"),
    path("ai-advisor/methods-section/", generate_methods_section, name="ai-advisor-methods"),
    path("ai-advisor/assumption-guidance/", assumption_guidance, name="ai-advisor-assumption"),
    # NLP Enhanced AI Advisor endpoints
    path("ai-advisor/parse-query/", parse_query, name="ai-advisor-parse-query"),
    path("ai-advisor/analysis-plan/", generate_analysis_plan, name="ai-advisor-analysis-plan"),
    path("ai-advisor/apa-report/", generate_apa_report, name="ai-advisor-apa-report"),
    path("ai-advisor/enhanced-chat/", enhanced_chat, name="ai-advisor-enhanced-chat"),
    # Meta-Analysis endpoints
    path("meta-analysis/", MetaAnalysisView.as_view(), name="meta-analysis"),
    path("meta-analysis/convert-effect/", convert_effect_size, name="meta-convert-effect"),
    path("meta-analysis/calculate-se/", calculate_effect_size_se, name="meta-calculate-se"),
    path("meta-analysis/publication-bias/", publication_bias_test, name="meta-publication-bias"),
    path("meta-analysis/sensitivity/", meta_sensitivity_analysis, name="meta-sensitivity"),
    path("meta-analysis/subgroup/", subgroup_analysis, name="meta-subgroup"),
    # Report Management endpoints
    path("reports/", ReportListView.as_view(), name="report-list"),
    path("reports/generate/", generate_report, name="report-generate"),
    path("reports/<uuid:report_id>/", ReportDetailView.as_view(), name="report-detail"),
    path("reports/<uuid:report_id>/export/", export_report, name="report-export"),
    # Statistical Quality Score (SQS) endpoints
    path("sqs/analyze/", SQSAnalyzeView.as_view(), name="sqs-analyze"),
    path("sqs/analyze-text/", SQSAnalyzeTextView.as_view(), name="sqs-analyze-text"),
    path("sqs/rules/", SQSRulesView.as_view(), name="sqs-rules"),
    path("sqs/fields/", SQSFieldsView.as_view(), name="sqs-fields"),
    path("sqs/categories/", SQSCategoriesView.as_view(), name="sqs-categories"),
    path("sqs/quick-check/", SQSQuickCheckView.as_view(), name="sqs-quick-check"),
    path("sqs/health/", SQSHealthView.as_view(), name="sqs-health"),
    # Causal Inference endpoints
    path("core/causal/dag/create/", dag_create, name="causal-dag-create"),
    path("core/causal/dag/analyze/", dag_analyze, name="causal-dag-analyze"),
    path("core/causal/adjustment/", adjustment_sets, name="causal-adjustment"),
    path("core/causal/propensity/", propensity_scores, name="causal-propensity"),
    path("core/causal/match/", matching, name="causal-matching"),
    path("core/causal/effect/", treatment_effects, name="causal-effect"),
    path("core/causal/sensitivity/", sensitivity_analysis_view, name="causal-sensitivity"),
    path("core/causal/mediation/baron-kenny/", mediation_baron_kenny, name="causal-mediation-bk"),
    path("core/causal/mediation/causal/", mediation_causal, name="causal-mediation-causal"),
    path("core/causal/mediation/sensitivity/", mediation_sensitivity, name="causal-mediation-sensitivity"),
    path("core/causal/mediation/multiple/", mediation_multiple, name="causal-mediation-multiple"),
    path("core/causal/did/", did_analysis, name="causal-did"),
    path("core/causal/did/event-study/", did_event_study, name="causal-did-event-study"),
    path("core/causal/did/parallel-trends/", did_parallel_trends, name="causal-did-parallel-trends"),
    path("core/causal/did/staggered/", did_staggered, name="causal-did-staggered"),
    # Mixed Models endpoints
    path("core/mixed/icc/", calculate_icc_view, name="mixed-icc"),
    path("core/mixed/lmm/fit/", fit_lmm, name="mixed-lmm-fit"),
    path("core/mixed/lmm/random-effects/", random_effects_view, name="mixed-random-effects"),
    path("core/mixed/lmm/compare/", compare_models_view, name="mixed-compare"),
    path("core/mixed/lmm/diagnostics/", lmm_diagnostics, name="mixed-diagnostics"),
    # Autonomous Intelligence Layer endpoints (v2.0)
    path("autonomous/profile/", SmartProfileView.as_view(), name="autonomous-profile"),
    path("autonomous/query/", AutonomousQueryView.as_view(), name="autonomous-query"),
    path("autonomous/cascade/", CascadeExecuteView.as_view(), name="autonomous-cascade"),
    path("autonomous/translate/", TranslateResultsView.as_view(), name="autonomous-translate"),
    path("autonomous/next-step/", NextStepView.as_view(), name="autonomous-next-step"),
    # Manuscript Review / Journal Integration endpoints (Pillar 2)
    path("manuscript/analyze/", ManuscriptAnalyzeView.as_view(), name="manuscript-analyze"),
    path("manuscript/parse/", ManuscriptParseView.as_view(), name="manuscript-parse"),
    path("manuscript/claims/", ClaimExtractionView.as_view(), name="manuscript-claims"),
    path("manuscript/consistency/", ConsistencyCheckView.as_view(), name="manuscript-consistency"),
    path("manuscript/report/<uuid:submission_id>/", SubmissionReportView.as_view(), name="manuscript-report"),
    path("manuscript/journal/submit/", JournalSubmitView.as_view(), name="journal-submit"),
    path("manuscript/batch-submit/", BatchSubmitView.as_view(), name="manuscript-batch-submit"),
    path("manuscript/batch-status/<str:batch_id>/", BatchStatusView.as_view(), name="manuscript-batch-status"),
    # Journal Analytics
    path("journal/analytics/overview/", JournalAnalyticsOverviewView.as_view(), name="journal-analytics-overview"),
    path("journal/analytics/issues/", JournalAnalyticsIssuesView.as_view(), name="journal-analytics-issues"),
    path("journal/analytics/trends/", JournalAnalyticsTrendsView.as_view(), name="journal-analytics-trends"),
    path(
        "journal/analytics/comparison/", JournalAnalyticsComparisonView.as_view(), name="journal-analytics-comparison"
    ),
    # Universal Data Import
    path("data/universal-import/", UniversalDataImportView.as_view(), name="universal-data-import"),
    path("data/supported-formats/", SupportedFormatsView.as_view(), name="supported-formats"),
    # Platform — Universal Platform Layer (Pillar 3)
    path("platform/tiers/", TierInfoView.as_view(), name="platform-tiers"),
    path("platform/organizations/", OrganizationCreateView.as_view(), name="platform-org-list"),
    path("platform/organizations/<slug:org_slug>/", OrganizationDetailView.as_view(), name="platform-org-detail"),
    path(
        "platform/organizations/<slug:org_slug>/members/",
        OrganizationMembersView.as_view(),
        name="platform-org-members",
    ),
    path("platform/organizations/<slug:org_slug>/invite/", InviteMemberView.as_view(), name="platform-org-invite"),
    path("platform/usage/", UsageDashboardView.as_view(), name="platform-usage"),
    path("platform/billing/", BillingView.as_view(), name="platform-billing"),
    path("platform/billing/webhook/", StripeWebhookView.as_view(), name="platform-stripe-webhook"),
    path("platform/api-keys/", APIKeyManageView.as_view(), name="platform-api-keys"),
    path("platform/api-keys/<uuid:key_id>/", APIKeyRevokeView.as_view(), name="platform-api-key-revoke"),
    # Projects & RBAC
    path("platform/projects/", ProjectListCreateView.as_view(), name="project-list-create"),
    path("platform/projects/<slug:project_slug>/", ProjectDetailView.as_view(), name="project-detail"),
    path("platform/permissions/", RBACPermissionsView.as_view(), name="rbac-permissions"),
    path(
        "platform/organizations/<slug:org_slug>/members/<uuid:member_id>/role/",
        MemberRoleUpdateView.as_view(),
        name="member-role-update",
    ),
    # GDPR / Privacy
    path("privacy/consent/", ConsentStatusView.as_view(), name="privacy-consent"),
    path("privacy/export/", DataExportView.as_view(), name="privacy-export"),
    path("privacy/erase/", DataErasureView.as_view(), name="privacy-erase"),
    path("privacy/info/", PrivacyInfoView.as_view(), name="privacy-info"),
    # ── Marketplace ─────────────────────────────────────────
    path("marketplace/plugins/", marketplace_views.MarketplaceListView.as_view(), name="marketplace-list"),
    path("marketplace/plugins/<slug:plugin_slug>/", marketplace_views.PluginDetailView.as_view(), name="plugin-detail"),
    path(
        "marketplace/plugins/<slug:plugin_slug>/install/",
        marketplace_views.PluginInstallView.as_view(),
        name="plugin-install",
    ),
    path(
        "marketplace/plugins/<slug:plugin_slug>/review/",
        marketplace_views.PluginReviewView.as_view(),
        name="plugin-review",
    ),
    path("marketplace/installed/", marketplace_views.InstalledPluginsView.as_view(), name="installed-plugins"),
    # ── LMS Integration (LTI 1.3) ──────────────────────────
    path("lti/config/", lms_views.LTIConfigView.as_view(), name="lti-config"),
    path("lti/login/", lms_views.LTILoginView.as_view(), name="lti-login"),
    path("lti/launch/", lms_views.LTILaunchView.as_view(), name="lti-launch"),
    path("lti/deep-link/", lms_views.LTIDeepLinkView.as_view(), name="lti-deep-link"),
    path("lti/grade/", lms_views.LTIGradePassbackView.as_view(), name="lti-grade"),
    path("lti/platforms/", lms_views.LTIPlatformsView.as_view(), name="lti-platforms"),
    path("lti/jwks/", lms_views.LTIJWKSView.as_view(), name="lti-jwks"),
    # ── Certification Program ───────────────────────────────
    path("certification/levels/", certification_views.CertificationLevelsView.as_view(), name="cert-levels"),
    path(
        "certification/levels/<str:level_id>/",
        certification_views.CertificationLevelDetailView.as_view(),
        name="cert-level-detail",
    ),
    path("certification/exam/start/", certification_views.ExamStartView.as_view(), name="cert-exam-start"),
    path("certification/exam/submit/", certification_views.ExamSubmitView.as_view(), name="cert-exam-submit"),
    path(
        "certification/verify/<str:certificate_id>/",
        certification_views.CertificateVerifyView.as_view(),
        name="cert-verify",
    ),
    path(
        "certification/my-certifications/", certification_views.UserCertificationsView.as_view(), name="cert-my-certs"
    ),
    # ── SSO / OIDC ──────────────────────────────────────────
    path("sso/config/", sso_views.SSOConfigView.as_view(), name="sso-config"),
    path("sso/login/", sso_views.SSOLoginView.as_view(), name="sso-login"),
    path("sso/callback/", sso_views.SSOCallbackView.as_view(), name="sso-callback"),
    path("sso/validate/", sso_views.SSOTokenValidateView.as_view(), name="sso-validate"),
    path("sso/providers/", sso_views.SSOProvidersView.as_view(), name="sso-providers"),
    # ── Site Licensing ──────────────────────────────────────
    path("licensing/tiers/", site_license_views.SiteLicenseTiersView.as_view(), name="license-tiers"),
    path("licensing/create/", site_license_views.SiteLicenseCreateView.as_view(), name="license-create"),
    path("licensing/verify/", site_license_views.SiteLicenseVerifyView.as_view(), name="license-verify"),
    path("licensing/usage/<str:license_key>/", site_license_views.SiteLicenseUsageView.as_view(), name="license-usage"),
    path(
        "licensing/report/<str:license_key>/", site_license_views.SiteLicenseReportView.as_view(), name="license-report"
    ),
    # ── Plugin Runtime ──────────────────────────────────────
    path(
        "marketplace/plugins/<slug:plugin_slug>/execute/",
        plugin_runtime_views.PluginExecuteView.as_view(),
        name="plugin-execute",
    ),
    path(
        "marketplace/plugins/<slug:plugin_slug>/config/",
        plugin_runtime_views.PluginConfigUpdateView.as_view(),
        name="plugin-config",
    ),
    # OpenAPI Schema & Documentation
    path("schema/", OpenAPISchemaView.as_view(), name="openapi-schema"),
    path("schema/swagger/", SwaggerUIView.as_view(), name="swagger-ui"),
    path("schema/redoc/", ReDocView.as_view(), name="redoc"),
]
