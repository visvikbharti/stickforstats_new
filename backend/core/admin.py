from django.contrib import admin
from .models import Analysis

@admin.register(Analysis)
class AnalysisAdmin(admin.ModelAdmin):
    list_display = ('name', 'analysis_type', 'created_at')
    list_filter = ('analysis_type', 'created_at')
    search_fields = ('name', 'description')
    date_hierarchy = 'created_at'