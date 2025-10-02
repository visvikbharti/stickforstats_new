from django.contrib import admin
from .models import ConfidenceIntervalProject, IntervalData, IntervalResult, SimulationResult, EducationalResource

@admin.register(ConfidenceIntervalProject)
class ConfidenceIntervalProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'is_public', 'created_at')
    list_filter = ('is_public', 'created_at')
    search_fields = ('name', 'description', 'user__username')
    date_hierarchy = 'created_at'

@admin.register(IntervalData)
class IntervalDataAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'data_type', 'created_at')
    list_filter = ('data_type', 'created_at')
    search_fields = ('name', 'description', 'project__name')
    date_hierarchy = 'created_at'

@admin.register(IntervalResult)
class IntervalResultAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'interval_type', 'confidence_level', 'created_at')
    list_filter = ('interval_type', 'confidence_level', 'created_at')
    search_fields = ('name', 'description', 'project__name')
    date_hierarchy = 'created_at'

@admin.register(SimulationResult)
class SimulationResultAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'simulation_type', 'is_complete', 'created_at')
    list_filter = ('simulation_type', 'is_complete', 'created_at')
    search_fields = ('name', 'description', 'project__name')
    date_hierarchy = 'created_at'

@admin.register(EducationalResource)
class EducationalResourceAdmin(admin.ModelAdmin):
    list_display = ('title', 'content_type', 'category', 'is_public', 'order')
    list_filter = ('content_type', 'category', 'is_public')
    search_fields = ('title', 'content')
    list_editable = ('order', 'is_public')
    ordering = ('category', 'order', 'title')