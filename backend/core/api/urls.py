"""
URL Configuration for Core Statistical API
===========================================
Created: 2025-08-06 12:30:00 UTC
Author: StickForStats Development Team
Version: 1.0.0

This module defines all URL patterns for the statistical analysis API endpoints.

Scientific Rigor: MAXIMUM
Enterprise Quality: Production-ready
RESTful Design: Fully compliant
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

from .views import (
    DataProfilingViewSet,
    InterpretationViewSet,
    AssumptionCheckingViewSet,
    HealthCheckView,
    StatisticsView
)

# API Documentation Schema
schema_view = get_schema_view(
    openapi.Info(
        title="StickForStats Core API",
        default_version='v1',
        description="""
        Comprehensive statistical analysis API with intelligent profiling,
        test recommendations, assumption checking, and interpretation.
        
        ## Features
        - **Data Profiling**: Intelligent analysis of datasets
        - **Test Recommendations**: AI-powered statistical test selection
        - **Assumption Checking**: Comprehensive verification with severity assessment
        - **Result Interpretation**: Human-readable explanations with APA formatting
        - **Batch Processing**: Handle multiple datasets efficiently
        - **Export Formats**: PDF, HTML, DOCX, LaTeX, Markdown
        
        ## Authentication
        All endpoints except health check require authentication via JWT or session.
        
        ## Rate Limiting
        - Standard endpoints: 1000 requests/hour
        - Profiling endpoints: 100 requests/hour
        - Batch operations: 10 requests/hour
        
        ## Scientific Standards
        - All statistical calculations validated against R/SciPy
        - APA 7th edition formatting for all results
        - Effect sizes and confidence intervals included
        - Assumption violations clearly indicated
        """,
        terms_of_service="https://www.stickforstats.com/terms/",
        contact=openapi.Contact(email="api@stickforstats.com"),
        license=openapi.License(name="MIT License"),
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)

# Create router for ViewSets
router = DefaultRouter(trailing_slash=True)

# Register ViewSets
router.register(
    r'profile',
    DataProfilingViewSet,
    basename='profile'
)

# URL patterns
urlpatterns = [
    # API Documentation
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('openapi/', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    
    # ViewSet routes
    path('', include(router.urls)),
    
    # Data Profiling endpoints
    path('profile/', DataProfilingViewSet.as_view({
        'post': 'create',  # Upload and profile dataset
    }), name='profile-upload'),
    
    path('profile/<str:pk>/', DataProfilingViewSet.as_view({
        'get': 'retrieve',  # Get profile by ID
    }), name='profile-detail'),
    
    path('profile/<str:pk>/recommendations/', DataProfilingViewSet.as_view({
        'get': 'recommendations',  # Get test recommendations
    }), name='profile-recommendations'),
    
    path('profile/<str:pk>/check-assumptions/', DataProfilingViewSet.as_view({
        'post': 'check_assumptions',  # Check assumptions for specific test
    }), name='profile-check-assumptions'),
    
    path('profile/<str:pk>/export/', DataProfilingViewSet.as_view({
        'post': 'export_report',  # Export report in various formats
    }), name='profile-export'),
    
    path('profile/batch/', DataProfilingViewSet.as_view({
        'post': 'batch_profile',  # Profile multiple datasets
    }), name='profile-batch'),
    
    # Interpretation endpoints
    path('interpret/', InterpretationViewSet.as_view({
        'get': 'list',  # List available interpretation types
    }), name='interpret-list'),
    
    path('interpret/t-test/', InterpretationViewSet.as_view({
        'post': 'interpret_t_test',
    }), name='interpret-t-test'),
    
    path('interpret/anova/', InterpretationViewSet.as_view({
        'post': 'interpret_anova',
    }), name='interpret-anova'),
    
    path('interpret/correlation/', InterpretationViewSet.as_view({
        'post': 'interpret_correlation',
    }), name='interpret-correlation'),
    
    path('interpret/regression/', InterpretationViewSet.as_view({
        'post': 'interpret_regression',
    }), name='interpret-regression'),
    
    path('interpret/chi-square/', InterpretationViewSet.as_view({
        'post': 'interpret_chi_square',
    }), name='interpret-chi-square'),
    
    path('interpret/apa-format/', InterpretationViewSet.as_view({
        'post': 'format_apa',
    }), name='interpret-apa-format'),
    
    # Assumption Checking endpoints
    path('assumptions/', AssumptionCheckingViewSet.as_view({
        'get': 'list',  # List available assumption checks
    }), name='assumptions-list'),
    
    path('assumptions/normality/', AssumptionCheckingViewSet.as_view({
        'post': 'check_normality',
    }), name='assumptions-normality'),
    
    path('assumptions/homogeneity/', AssumptionCheckingViewSet.as_view({
        'post': 'check_homogeneity',
    }), name='assumptions-homogeneity'),
    
    path('assumptions/independence/', AssumptionCheckingViewSet.as_view({
        'post': 'check_independence',
    }), name='assumptions-independence'),
    
    path('assumptions/linearity/', AssumptionCheckingViewSet.as_view({
        'post': 'check_linearity',
    }), name='assumptions-linearity'),
    
    path('assumptions/check-all/', AssumptionCheckingViewSet.as_view({
        'post': 'check_all',
    }), name='assumptions-check-all'),
    
    # Utility endpoints
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('stats/', StatisticsView.as_view(), name='usage-stats'),
]

# API versioning support
app_name = 'core_api_v1'

# Export URL patterns for inclusion in main URLs
api_v1_patterns = [
    path('v1/core/', include(urlpatterns)),
]