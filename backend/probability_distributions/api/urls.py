from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    DistributionProjectViewSet,
    DistributionViewSet,
    DistributionUtilityViewSet
)

# Import our new simplified views
from ..views import (
    CreateDistributionView,
    CalculateProbabilityView,
    GenerateRandomSampleView,
    FitDistributionView,
    CompareApproximationsView,
    ProcessCapabilityView,
    SimulatePoissonProcessView,
    DistributionExamplesView
)

router = DefaultRouter()
router.register(r'projects', DistributionProjectViewSet, basename='distribution-project')
router.register(r'distributions', DistributionViewSet, basename='distribution')
router.register(r'utilities', DistributionUtilityViewSet, basename='distribution-utility')

urlpatterns = [
    path('', include(router.urls)),
    
    # New simplified endpoints (without project requirement)
    path('create/', CreateDistributionView.as_view(), name='create_distribution'),
    path('calculate/', CalculateProbabilityView.as_view(), name='calculate_probability'),
    path('sample/', GenerateRandomSampleView.as_view(), name='generate_sample'),
    path('fit/', FitDistributionView.as_view(), name='fit_distribution'),
    path('approximations/', CompareApproximationsView.as_view(), name='compare_approximations'),
    path('process-capability/', ProcessCapabilityView.as_view(), name='process_capability'),
    path('poisson-process/', SimulatePoissonProcessView.as_view(), name='simulate_poisson'),
    path('examples/', DistributionExamplesView.as_view(), name='examples'),
]