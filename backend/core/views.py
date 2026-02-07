"""
Core Views for StickForStats
=============================

This module contains Django views for the web interface.

Note: Most data operations are handled through the REST API (api_views.py).
The views in this file are for Django template-based pages.

Models Status:
- Analysis, Report: Implemented (models.py)
- Dataset, Visualization, Workflow: Planned for future implementation
  Currently, data handling uses pandas DataFrames via API endpoints.
"""

from django.shortcuts import render, redirect
from django.views.generic import TemplateView, ListView, DetailView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import JsonResponse, HttpResponse
from django.conf import settings
import os
import logging

from .models import Analysis, Report  # Report is alias to Analysis

logger = logging.getLogger(__name__)


class AnalysisListView(LoginRequiredMixin, ListView):
    """List of user's analyses."""
    model = Analysis
    template_name = 'core/analyses.html'
    context_object_name = 'analyses'

    def get_queryset(self):
        # Note: Analysis model doesn't have user field yet
        # This is placeholder for when user authentication is fully implemented
        return Analysis.objects.all().order_by('-created_at')[:20]


class AnalysisDetailView(LoginRequiredMixin, DetailView):
    """Detailed view of an analysis with results."""
    model = Analysis
    template_name = 'core/analysis_detail.html'
    context_object_name = 'analysis'


class ReportListView(LoginRequiredMixin, ListView):
    """List of user's reports."""
    model = Report  # Report is an alias to Analysis
    template_name = 'core/reports.html'
    context_object_name = 'reports'

    def get_queryset(self):
        return Report.objects.all().order_by('-created_at')[:20]


class ReportDetailView(LoginRequiredMixin, DetailView):
    """Detailed view of a report with download options."""
    model = Report  # Report is an alias to Analysis
    template_name = 'core/report_detail.html'
    context_object_name = 'report'


class DataUploadView(LoginRequiredMixin, TemplateView):
    """View for uploading new datasets."""
    template_name = 'core/upload_dataset.html'


class ReportGenerationView(LoginRequiredMixin, TemplateView):
    """View for generating new reports."""
    template_name = 'core/generate_report.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['analyses'] = Analysis.objects.all().order_by('-created_at')[:20]
        return context


# ============================================================================
# PLACEHOLDER VIEWS - These require models that are not yet implemented
# ============================================================================
#
# The following views are documented here for future implementation:
#
# class DashboardView - Requires Dataset model
# class DatasetListView - Requires Dataset model
# class DatasetDetailView - Requires Dataset model
# class WorkflowListView - Requires Workflow model
# class WorkflowDetailView - Requires Workflow model
# class WorkflowCreationView - Requires Workflow and Dataset models
# class AnalysisCreationView - Requires Dataset model
# class ModuleIntegrationView - Requires ModuleRegistry
#
# These views are NOT used in the current URL configuration.
# See core/urls.py for active routes.
# ============================================================================
