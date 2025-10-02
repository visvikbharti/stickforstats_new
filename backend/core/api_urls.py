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
    PowerAnalysisView
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
]