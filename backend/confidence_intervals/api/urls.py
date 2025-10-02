from django.urls import path, include
from .views import (
    ConfidenceIntervalProjectViewSet,
    IntervalDataViewSet,
    IntervalResultViewSet,
    SimulationResultViewSet,
    EducationalResourceViewSet
)
from .calculation_views import ConfidenceIntervalCalculationViewSet
from rest_framework.routers import DefaultRouter

# Create router for viewsets
router = DefaultRouter()
router.register(r'projects', ConfidenceIntervalProjectViewSet, basename='project')
router.register(r'data', IntervalDataViewSet, basename='data')
router.register(r'results', IntervalResultViewSet, basename='result')
router.register(r'simulations', SimulationResultViewSet, basename='simulation')
router.register(r'resources', EducationalResourceViewSet, basename='resource')

# Register calculation viewset - THIS IS WHAT RESEARCHERS ACTUALLY NEED
router.register(r'calculate', ConfidenceIntervalCalculationViewSet, basename='calculate')

app_name = 'confidence_intervals_api'

# Use router URLs
urlpatterns = router.urls