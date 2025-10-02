from django.shortcuts import render, redirect
from django.views.generic import TemplateView, ListView, DetailView, CreateView, UpdateView, DeleteView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.http import JsonResponse, HttpResponse
from django.conf import settings
import os
import logging

from .models import Analysis, Report  # Report is alias to Analysis
# Commented out non-existent import - TODO: Fix module structure
# from stickforstats.mainapp.models import Dataset, Visualization, Workflow

logger = logging.getLogger(__name__)

class DashboardView(LoginRequiredMixin, TemplateView):
    """Main dashboard view that shows user's statistics and recent activity."""
    template_name = 'core/dashboard.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user
        
        # Get counts
        context['dataset_count'] = Dataset.objects.filter(user=user).count()
        context['analysis_count'] = Analysis.objects.filter(user=user).count()
        context['analysis_count_alt'] = Analysis.objects.filter(user=user).count()
        
        # Get recent items
        context['recent_datasets'] = Dataset.objects.filter(user=user).order_by('-created_at')[:5]
        context['recent_analyses'] = Analysis.objects.filter(user=user).order_by('-created_at')[:5]
        context['recent_analyses_alt'] = Analysis.objects.filter(user=user).order_by('-created_at')[:5]
        
        return context

class DatasetListView(LoginRequiredMixin, ListView):
    """List of user's datasets."""
    model = Dataset
    template_name = 'core/datasets.html'
    context_object_name = 'datasets'
    
    def get_queryset(self):
        return Dataset.objects.filter(user=self.request.user).order_by('-created_at')

class DatasetDetailView(LoginRequiredMixin, DetailView):
    """Detailed view of a dataset with preview and metadata."""
    model = Dataset
    template_name = 'core/dataset_detail.html'
    context_object_name = 'dataset'
    
    def get_queryset(self):
        return Dataset.objects.filter(user=self.request.user)

class AnalysisListView(LoginRequiredMixin, ListView):
    """List of user's analyses."""
    model = Analysis
    template_name = 'core/analyses.html'
    context_object_name = 'analyses'
    
    def get_queryset(self):
        return Analysis.objects.filter(user=self.request.user).order_by('-created_at')

class AnalysisDetailView(LoginRequiredMixin, DetailView):
    """Detailed view of an analysis with results and visualizations."""
    model = Analysis
    template_name = 'core/analysis_detail.html'
    context_object_name = 'analysis'
    
    def get_queryset(self):
        return Analysis.objects.filter(user=self.request.user)
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Add visualizations for this analysis
        context['visualizations'] = Visualization.objects.filter(analysis=self.object)
        return context

class ReportListView(LoginRequiredMixin, ListView):
    """List of user's reports."""
    model = Report  # Report is now an alias to Analysis
    template_name = 'core/reports.html'
    context_object_name = 'reports'
    
    def get_queryset(self):
        return Report.objects.filter(user=self.request.user).order_by('-created_at')

class ReportDetailView(LoginRequiredMixin, DetailView):
    """Detailed view of a report with download options."""
    model = Report  # Report is now an alias to Analysis
    template_name = 'core/report_detail.html'
    context_object_name = 'report'
    
    def get_queryset(self):
        return Report.objects.filter(user=self.request.user)
    
class WorkflowListView(LoginRequiredMixin, ListView):
    """List of user's workflows."""
    model = Workflow
    template_name = 'core/workflows.html'
    context_object_name = 'workflows'
    
    def get_queryset(self):
        return Workflow.objects.filter(user=self.request.user).order_by('-created_at')

class WorkflowDetailView(LoginRequiredMixin, DetailView):
    """Detailed view of a workflow."""
    model = Workflow
    template_name = 'core/workflow_detail.html'
    context_object_name = 'workflow'
    
    def get_queryset(self):
        return Workflow.objects.filter(user=self.request.user)

class AnalysisCreationView(LoginRequiredMixin, TemplateView):
    """View for creating a new analysis."""
    template_name = 'core/create_analysis.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Add datasets for selection
        context['datasets'] = Dataset.objects.filter(user=self.request.user).order_by('-created_at')
        return context

class DataUploadView(LoginRequiredMixin, TemplateView):
    """View for uploading new datasets."""
    template_name = 'core/upload_dataset.html'

class ReportGenerationView(LoginRequiredMixin, TemplateView):
    """View for generating new reports."""
    template_name = 'core/generate_report.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Add analyses for selection
        context['analyses'] = Analysis.objects.filter(user=self.request.user).order_by('-created_at')
        return context

class WorkflowCreationView(LoginRequiredMixin, TemplateView):
    """View for creating new workflows."""
    template_name = 'core/create_workflow.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Add datasets and analyses for selection
        context['datasets'] = Dataset.objects.filter(user=self.request.user).order_by('-created_at')
        context['analyses'] = Analysis.objects.filter(user=self.request.user).order_by('-created_at')
        return context

class ModuleIntegrationView(LoginRequiredMixin, TemplateView):
    """View that shows all available analysis modules."""
    template_name = 'core/modules.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # This would dynamically load available modules from the registry
        from .registry import ModuleRegistry
        context['modules'] = ModuleRegistry.get_registered_modules()
        return context