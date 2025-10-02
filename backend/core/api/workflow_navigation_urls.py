"""
Workflow Navigation URL Configuration
=====================================

URL routing for workflow navigation API endpoints.

Author: Vishal Bharti
Date: 2025-08-26
Version: 1.0.0 (MVP)
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .workflow_navigation_views import WorkflowNavigationViewSet, WorkflowContextAPI

# Create router for viewsets
router = DefaultRouter()
router.register(r'navigation', WorkflowNavigationViewSet, basename='workflow-navigation')

urlpatterns = [
    # Include viewset routes
    path('workflow/', include(router.urls)),
    
    # Context management endpoint
    path('workflow/context/', WorkflowContextAPI.as_view(), name='workflow-context'),
    
    # Quick access endpoints (for convenience)
    path('workflow/quick/initialize/<str:workflow_id>/', 
         WorkflowNavigationViewSet.as_view({'post': 'initialize'}),
         name='quick-initialize'),
    
    path('workflow/quick/navigate/<str:workflow_id>/<str:step_id>/',
         WorkflowNavigationViewSet.as_view({'post': 'navigate'}),
         name='quick-navigate'),
]

# URL patterns will be:
# /api/workflow/navigation/initialize/
# /api/workflow/navigation/navigate/
# /api/workflow/navigation/validate/
# /api/workflow/navigation/actions/{workflow_id}/{step_id}/
# /api/workflow/navigation/save/
# /api/workflow/navigation/load/{workflow_id}/{state_id}/
# /api/workflow/navigation/recommendations/
# /api/workflow/navigation/decide/
# /api/workflow/context/