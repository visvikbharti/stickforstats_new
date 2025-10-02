"""
URL routing for SQC Analysis API.

This module defines the URL patterns for the SQC Analysis API endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from stickforstats.sqc_analysis.api.views import (
    ControlChartViewSet, ProcessCapabilityViewSet,
    AcceptanceSamplingViewSet, MeasurementSystemAnalysisViewSet,
    EconomicDesignViewSet, SPCImplementationViewSet,
    # Simplified API views
    QuickControlChartView, QuickProcessCapabilityView,
    QuickAcceptanceSamplingView, QuickMSAView,
    SQCSimulationView, SQCDemoDataView
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'control-charts', ControlChartViewSet, basename='control-chart')
router.register(r'process-capability', ProcessCapabilityViewSet, basename='process-capability')
router.register(r'acceptance-sampling', AcceptanceSamplingViewSet, basename='acceptance-sampling')
router.register(r'msa', MeasurementSystemAnalysisViewSet, basename='msa')
router.register(r'economic-design', EconomicDesignViewSet, basename='economic-design')
router.register(r'spc-implementation', SPCImplementationViewSet, basename='spc-implementation')

app_name = 'sqc_analysis'

urlpatterns = [
    path('', include(router.urls)),
    
    # Simplified API endpoints
    path('quick-control-chart/', QuickControlChartView.as_view(), name='quick-control-chart'),
    path('quick-capability/', QuickProcessCapabilityView.as_view(), name='quick-capability'),
    path('quick-sampling/', QuickAcceptanceSamplingView.as_view(), name='quick-sampling'),
    path('quick-msa/', QuickMSAView.as_view(), name='quick-msa'),
    path('simulation/', SQCSimulationView.as_view(), name='simulation'),
    path('demo/', SQCDemoDataView.as_view(), name='demo'),
]