from django.urls import path, include
# Temporarily comment out views that don't exist yet
# from .views import (
#     DashboardView, DatasetListView, DatasetDetailView,
#     AnalysisListView, AnalysisDetailView, ReportListView,
#     ReportDetailView, WorkflowListView, WorkflowDetailView,
#     AnalysisCreationView, DataUploadView, ReportGenerationView,
#     WorkflowCreationView, ModuleIntegrationView
# )

urlpatterns = [
    # Guardian System URLs (The Statistical Guardian - Protector of Scientific Integrity)
    path('guardian/', include('core.guardian.urls')),

    # API URLs - temporarily commented out due to import errors
    # path('api/', include('stickforstats.core.api.urls')),

    # View URLs - temporarily commented out until views are fixed
    # path('', DashboardView.as_view(), name='dashboard'),

    # # Dataset URLs
    # path('datasets/', DatasetListView.as_view(), name='dataset_list'),
    # path('datasets/<uuid:pk>/', DatasetDetailView.as_view(), name='dataset_detail'),
    # path('datasets/upload/', DataUploadView.as_view(), name='dataset_upload'),

    # # Analysis URLs
    # path('analyses/', AnalysisListView.as_view(), name='analysis_list'),
    # path('analyses/<uuid:pk>/', AnalysisDetailView.as_view(), name='analysis_detail'),
    # path('analyses/create/', AnalysisCreationView.as_view(), name='analysis_create'),

    # # Report URLs
    # path('reports/', ReportListView.as_view(), name='report_list'),
    # path('reports/<uuid:pk>/', ReportDetailView.as_view(), name='report_detail'),
    # path('reports/generate/', ReportGenerationView.as_view(), name='report_generate'),

    # # Workflow URLs
    # path('workflows/', WorkflowListView.as_view(), name='workflow_list'),
    # path('workflows/<uuid:pk>/', WorkflowDetailView.as_view(), name='workflow_detail'),
    # path('workflows/create/', WorkflowCreationView.as_view(), name='workflow_create'),

    # # Module URLs
    # path('modules/', ModuleIntegrationView.as_view(), name='module_list'),
]