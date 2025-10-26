"""
Guardian URL Configuration
"""

from django.urls import path
from .views import (
    GuardianCheckView,
    GuardianValidateNormalityView,
    GuardianDetectOutliersView,
    GuardianTestRequirementsView,
    GuardianHealthCheckView,
    GuardianExportPDFView,
    GuardianExportJSONView,
    TransformationSuggestView,
    TransformationApplyView,
    TransformationValidateView,
    TransformationCodeExportView
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

    # Export validation reports
    path('export/pdf/', GuardianExportPDFView.as_view(), name='export_pdf'),
    path('export/json/', GuardianExportJSONView.as_view(), name='export_json'),

    # Health check
    path('health/', GuardianHealthCheckView.as_view(), name='health'),

    # Transformation Wizard endpoints
    path('transformation/suggest/', TransformationSuggestView.as_view(), name='transformation_suggest'),
    path('transformation/apply/', TransformationApplyView.as_view(), name='transformation_apply'),
    path('transformation/validate/', TransformationValidateView.as_view(), name='transformation_validate'),
    path('transformation/export-code/', TransformationCodeExportView.as_view(), name='transformation_export_code'),
]