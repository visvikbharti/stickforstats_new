"""
Guardian URL Configuration
"""

from django.urls import path
from .views import (
    GuardianCheckView,
    GuardianValidateNormalityView,
    GuardianDetectOutliersView,
    GuardianTestRequirementsView,
    GuardianHealthCheckView
)

app_name = 'guardian'

urlpatterns = [
    # Main Guardian check endpoint
    path('check/', GuardianCheckView.as_view(), name='check'),

    # Specific validation endpoints
    path('validate/normality/', GuardianValidateNormalityView.as_view(), name='validate_normality'),
    path('detect/outliers/', GuardianDetectOutliersView.as_view(), name='detect_outliers'),

    # Test requirements information
    path('requirements/', GuardianTestRequirementsView.as_view(), name='requirements'),
    path('requirements/<str:test_type>/', GuardianTestRequirementsView.as_view(), name='requirements_detail'),

    # Health check
    path('health/', GuardianHealthCheckView.as_view(), name='health'),
]