"""
URL patterns for the PCA Analysis application.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers

from . import views

# Create a router for top-level resources
router = DefaultRouter()
router.register(r'projects', views.PCAProjectViewSet, basename='pca-project')
router.register(r'results', views.PCAResultViewSet, basename='pca-result')

# Create nested routers for project resources
project_router = routers.NestedSimpleRouter(router, r'projects', lookup='project')
project_router.register(r'groups', views.SampleGroupViewSet, basename='project-group')
project_router.register(r'samples', views.SampleViewSet, basename='project-sample')
project_router.register(r'genes', views.GeneViewSet, basename='project-gene')

# Create nested routers for result resources
result_router = routers.NestedSimpleRouter(router, r'results', lookup='result')
result_router.register(r'visualizations', views.PCAVisualizationViewSet, basename='result-visualization')

# Add new simplified API endpoints
simplified_urls = [
    path('quick/', views.QuickPCAView.as_view(), name='pca-quick'),
    path('interactive/', views.InteractivePCAView.as_view(), name='pca-interactive'),
    path('gene-contribution/', views.GeneContributionView.as_view(), name='pca-gene-contribution'),
    path('comparison/', views.PCAComparisonView.as_view(), name='pca-comparison'),
    path('simulation/', views.PCASimulationView.as_view(), name='pca-simulation'),
    path('demo/', views.DemoDataView.as_view(), name='pca-demo'),
]

urlpatterns = [
    path('', include(router.urls)),
    path('', include(project_router.urls)),
    path('', include(result_router.urls)),
] + simplified_urls