from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ExperimentDesignViewSet,
    ModelAnalysisViewSet,
    OptimizationAnalysisViewSet
)
from ..views import (
    GenerateDesignView,
    AnalyzeExperimentView,
    OptimizeResponseView,
    GenerateReportView,
    ScreeningAnalysisView,
    DOEExamplesView
)

router = DefaultRouter()
router.register(r'experiment-designs', ExperimentDesignViewSet, basename='experiment-design')
router.register(r'model-analyses', ModelAnalysisViewSet)
router.register(r'optimization-analyses', OptimizationAnalysisViewSet)

urlpatterns = [
    path('', include(router.urls)),
    
    # Simplified API endpoints (no project requirement)
    path('generate-design/', GenerateDesignView.as_view(), name='doe-generate-design'),
    path('analyze-experiment/', AnalyzeExperimentView.as_view(), name='doe-analyze-experiment'),
    path('optimize-response/', OptimizeResponseView.as_view(), name='doe-optimize-response'),
    path('generate-report/', GenerateReportView.as_view(), name='doe-generate-report'),
    path('screening-analysis/', ScreeningAnalysisView.as_view(), name='doe-screening-analysis'),
    path('examples/', DOEExamplesView.as_view(), name='doe-examples'),
]