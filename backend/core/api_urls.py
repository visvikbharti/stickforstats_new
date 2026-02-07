"""
API URL Configuration for StickForStats Core
"""

from django.urls import path, include
from .api_views import (
    DataUploadView,
    AssumptionCheckView,
    TestRecommendationView,
    TestExecutionView,
    MultiplicityCorrectionView,
    PowerAnalysisView,
    # Bayesian Statistics Views
    BayesianTTestView,
    BayesianAnovaView,
    BayesianCorrelationView,
    BayesFactorInterpretView,
    PriorScalesView,
    # Pre-Registration Views
    PreRegistrationTemplatesView,
    PreRegistrationTemplateFieldsView,
    PreRegistrationCreateView,
    HypothesisFormulatorView,
    SampleSizeJustificationView,
    # P-Curve Analysis Views
    PCurveAnalysisView,
    PCurveParseView,
    PCurveVisualizationView,
    # Mixed Effects Models Views
    ICCCalculationView,
    LMMFitView,
    LMMCompareView,
    LMMDiagnosticsView,
    LMMRandomEffectsView,
    # Causal Inference Views
    DAGCreateView,
    DAGAnalyzeView,
    AdjustmentSetView,
    PropensityScoreView,
    MatchingView,
    TreatmentEffectView,
    SensitivityAnalysisView,
    # Mediation Analysis Views
    MediationBaronKennyView,
    CausalMediationView,
    MediationSensitivityView,
    MultipleMediatorsView,
    # Difference-in-Differences Views
    DiDView,
    EventStudyView,
    ParallelTrendsTestView,
    StaggeredDiDView
)

app_name = 'core-api'

urlpatterns = [
    # Guardian System - The Statistical Guardian (Revolutionary Feature!)
    path('guardian/', include('core.guardian.urls')),

    # Test Recommender endpoints
    path('test-recommender/upload-data/', DataUploadView.as_view(), name='upload-data'),
    path('test-recommender/check-assumptions/', AssumptionCheckView.as_view(), name='check-assumptions'),
    path('test-recommender/recommend/', TestRecommendationView.as_view(), name='recommend-test'),
    path('test-recommender/run-test/', TestExecutionView.as_view(), name='run-test'),

    # Multiplicity Correction endpoints
    path('multiplicity/correct/', MultiplicityCorrectionView.as_view(), name='multiplicity-correct'),

    # Power Analysis endpoints
    path('power/calculate/', PowerAnalysisView.as_view(), name='power-calculate'),

    # Bayesian Statistics endpoints
    path('bayesian/ttest/', BayesianTTestView.as_view(), name='bayesian-ttest'),
    path('bayesian/anova/', BayesianAnovaView.as_view(), name='bayesian-anova'),
    path('bayesian/correlation/', BayesianCorrelationView.as_view(), name='bayesian-correlation'),
    path('bayesian/interpret/', BayesFactorInterpretView.as_view(), name='bayesian-interpret'),
    path('bayesian/priors/', PriorScalesView.as_view(), name='bayesian-priors'),

    # Pre-Registration endpoints
    path('preregistration/templates/', PreRegistrationTemplatesView.as_view(), name='prereg-templates'),
    path('preregistration/templates/<str:template_name>/', PreRegistrationTemplateFieldsView.as_view(), name='prereg-template-fields'),
    path('preregistration/create/', PreRegistrationCreateView.as_view(), name='prereg-create'),
    path('preregistration/hypothesis/', HypothesisFormulatorView.as_view(), name='prereg-hypothesis'),
    path('preregistration/sample-size/', SampleSizeJustificationView.as_view(), name='prereg-sample-size'),

    # P-Curve Analysis endpoints
    path('pcurve/analyze/', PCurveAnalysisView.as_view(), name='pcurve-analyze'),
    path('pcurve/parse/', PCurveParseView.as_view(), name='pcurve-parse'),
    path('pcurve/visualize/', PCurveVisualizationView.as_view(), name='pcurve-visualize'),

    # Mixed Effects Models endpoints
    path('mixed/icc/', ICCCalculationView.as_view(), name='mixed-icc'),
    path('mixed/lmm/fit/', LMMFitView.as_view(), name='mixed-lmm-fit'),
    path('mixed/lmm/compare/', LMMCompareView.as_view(), name='mixed-lmm-compare'),
    path('mixed/lmm/diagnostics/', LMMDiagnosticsView.as_view(), name='mixed-lmm-diagnostics'),
    path('mixed/lmm/random-effects/', LMMRandomEffectsView.as_view(), name='mixed-lmm-random-effects'),

    # Causal Inference endpoints
    path('causal/dag/create/', DAGCreateView.as_view(), name='causal-dag-create'),
    path('causal/dag/analyze/', DAGAnalyzeView.as_view(), name='causal-dag-analyze'),
    path('causal/adjustment/', AdjustmentSetView.as_view(), name='causal-adjustment'),
    path('causal/propensity/', PropensityScoreView.as_view(), name='causal-propensity'),
    path('causal/match/', MatchingView.as_view(), name='causal-match'),
    path('causal/effect/', TreatmentEffectView.as_view(), name='causal-effect'),
    path('causal/sensitivity/', SensitivityAnalysisView.as_view(), name='causal-sensitivity'),

    # Mediation Analysis endpoints
    path('causal/mediation/baron-kenny/', MediationBaronKennyView.as_view(), name='causal-mediation-bk'),
    path('causal/mediation/causal/', CausalMediationView.as_view(), name='causal-mediation-imai'),
    path('causal/mediation/sensitivity/', MediationSensitivityView.as_view(), name='causal-mediation-sensitivity'),
    path('causal/mediation/multiple/', MultipleMediatorsView.as_view(), name='causal-mediation-multiple'),

    # Difference-in-Differences endpoints
    path('causal/did/', DiDView.as_view(), name='causal-did'),
    path('causal/did/event-study/', EventStudyView.as_view(), name='causal-event-study'),
    path('causal/did/parallel-trends/', ParallelTrendsTestView.as_view(), name='causal-parallel-trends'),
    path('causal/did/staggered/', StaggeredDiDView.as_view(), name='causal-staggered-did'),
]