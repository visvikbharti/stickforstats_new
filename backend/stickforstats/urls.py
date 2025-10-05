"""
Main URL configuration for the StickForStats v1.0 Production Django project.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse

# Simple view for testing
def index(request):
    return HttpResponse("<h1>StickForStats v1.0 Production</h1><p>Statistical Analysis Platform is running.</p>")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', index, name='index'),

    # Core API - include directly from api_urls
    path('api/', include('core.api_urls')),

    # Authentication endpoints
    path('api/auth/', include('authentication.urls')),

    # High-Precision API v1 - NEW!
    path('api/v1/', include('api.v1.urls')),

    # Statistical Analysis Modules - temporarily commented out due to import errors
    # path('api/v1/confidence-intervals/', include('confidence_intervals.api.urls')),
    # path('api/v1/probability-distributions/', include('probability_distributions.api.urls')),
    path('api/v1/sqc-analysis/', include('sqc_analysis.api.urls')),  # ← ENABLED for backend integration
    # path('api/v1/doe-analysis/', include('doe_analysis.api.urls')),
    # path('api/v1/pca-analysis/', include('pca_analysis.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)