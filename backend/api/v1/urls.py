"""
URL Configuration for High-Precision Statistical API v1
"""

from django.urls import path
from .views import (
    HighPrecisionTTestView,
    HighPrecisionANOVAView,
    ComparisonView,
    DataImportView,
    ValidationDashboardView
)
from .ancova_view import HighPrecisionANCOVAView
from .descriptive_view import DescriptiveStatisticsView
from .correlation_views import (
    HighPrecisionCorrelationView,
    AutomaticTestSelectorView
)
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
    power_analysis_info
)
from .regression_views import (
    HighPrecisionRegressionView
)
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
    categorical_effect_sizes
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
    nonparametric_effect_sizes
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
    get_imputation_methods_info
)
from .simple_test import simple_test
from .audit_views import (
    AuditSummaryView,
    AuditRecordView,
    AuditMetricsView,
    audit_health_check
)

app_name = 'api-v1'

urlpatterns = [
    # High-precision statistical tests
    path('stats/ttest/', HighPrecisionTTestView.as_view(), name='hp-ttest'),
    path('stats/anova/', HighPrecisionANOVAView.as_view(), name='hp-anova'),
    path('stats/ancova/', HighPrecisionANCOVAView.as_view(), name='hp-ancova'),
    path('stats/correlation/', HighPrecisionCorrelationView.as_view(), name='hp-correlation'),
    path('stats/regression/', SimpleRegressionView.as_view(), name='hp-regression-stats'),  # Using simple version temporarily
    path('stats/descriptive/', DescriptiveStatisticsView.as_view(), name='hp-descriptive'),
    path('stats/comparison/', ComparisonView.as_view(), name='comparison'),

    # Automatic test selection
    path('stats/recommend/', AutomaticTestSelectorView.as_view(), name='test-recommendation'),

    # Data management
    path('data/import/', DataImportView.as_view(), name='data-import'),

    # Validation and metrics
    path('validation/dashboard/', ValidationDashboardView.as_view(), name='validation-dashboard'),

    # Power Analysis endpoints (50 decimal precision)
    path('power/t-test/', calculate_power_t_test, name='power-t-test'),
    path('power/sample-size/t-test/', calculate_sample_size_t_test, name='sample-size-t-test'),
    path('power/effect-size/t-test/', calculate_effect_size_t_test, name='effect-size-t-test'),
    path('power/anova/', calculate_power_anova, name='power-anova'),
    path('power/correlation/', calculate_power_correlation, name='power-correlation'),
    path('power/chi-square/', calculate_power_chi_square, name='power-chi-square'),
    path('power/curves/', create_power_curves, name='power-curves'),
    path('power/allocation/', optimal_allocation, name='optimal-allocation'),
    path('power/sensitivity/', sensitivity_analysis, name='sensitivity-analysis'),
    path('power/report/', comprehensive_power_report, name='power-report'),
    path('power/info/', power_analysis_info, name='power-info'),

    # Simple test endpoint
    path('test/', simple_test, name='simple-test'),

    # Regression Analysis endpoints (50 decimal precision)
    path('regression/', HighPrecisionRegressionView.as_view(), name='hp-regression'),
    path('regression/linear/', HighPrecisionRegressionView.as_view(), name='linear-regression'),
    path('regression/multiple/', HighPrecisionRegressionView.as_view(), name='multiple-regression'),
    path('regression/polynomial/', HighPrecisionRegressionView.as_view(), name='polynomial-regression'),
    path('regression/logistic/', HighPrecisionRegressionView.as_view(), name='logistic-regression'),
    path('regression/ridge/', HighPrecisionRegressionView.as_view(), name='ridge-regression'),
    path('regression/lasso/', HighPrecisionRegressionView.as_view(), name='lasso-regression'),

    # Categorical Analysis endpoints (50 decimal precision)
    path('categorical/chi-square/independence/', chi_square_independence_test, name='chi-square-independence'),
    path('categorical/chi-square/goodness/', chi_square_goodness_of_fit, name='chi-square-goodness'),
    path('categorical/fishers/', fishers_exact_test, name='fishers-exact'),
    path('categorical/mcnemar/', mcnemar_test, name='mcnemar'),
    path('categorical/cochran-q/', cochrans_q_test, name='cochran-q'),
    path('categorical/g-test/', g_test, name='g-test'),
    path('categorical/binomial/', binomial_test, name='binomial'),
    path('categorical/multinomial/', multinomial_test, name='multinomial'),
    path('categorical/effect-sizes/', categorical_effect_sizes, name='categorical-effect-sizes'),

    # Non-parametric Analysis endpoints (50 decimal precision)
    path('nonparametric/mann-whitney/', mann_whitney_u_test, name='mann-whitney'),
    path('nonparametric/wilcoxon/', wilcoxon_signed_rank_test, name='wilcoxon'),
    path('nonparametric/kruskal-wallis/', kruskal_wallis_test, name='kruskal-wallis'),
    path('nonparametric/friedman/', friedman_test, name='friedman'),
    path('nonparametric/sign/', sign_test, name='sign-test'),
    path('nonparametric/mood/', moods_median_test, name='mood-median'),
    path('nonparametric/jonckheere/', jonckheere_terpstra_test, name='jonckheere'),
    path('nonparametric/page/', pages_trend_test, name='page-trend'),
    path('nonparametric/post-hoc/', nonparametric_post_hoc, name='nonparametric-post-hoc'),
    path('nonparametric/effect-sizes/', nonparametric_effect_sizes, name='nonparametric-effect-sizes'),

    # Missing Data endpoints
    path('missing-data/detect/', detect_missing_patterns, name='detect-missing'),
    path('missing-data/impute/', impute_missing_data, name='impute-missing'),
    path('missing-data/little-test/', perform_littles_mcar_test, name='little-mcar'),
    path('missing-data/compare/', compare_imputation_methods, name='compare-imputation'),
    path('missing-data/visualize/', visualize_missing_patterns, name='visualize-missing'),
    path('missing-data/multiple-imputation/', multiple_imputation, name='multiple-imputation'),
    path('missing-data/knn/', knn_imputation, name='knn-imputation'),
    path('missing-data/em/', em_algorithm_imputation, name='em-imputation'),
    path('missing-data/info/', get_imputation_methods_info, name='imputation-info'),

    # Audit System endpoints (Real data only - no mock data)
    path('audit/summary/', AuditSummaryView.as_view(), name='audit-summary'),
    path('audit/record/', AuditRecordView.as_view(), name='audit-record'),
    path('audit/metrics/<str:metric_type>/', AuditMetricsView.as_view(), name='audit-metrics'),
    path('audit/health/', audit_health_check, name='audit-health'),
]