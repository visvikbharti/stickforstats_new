from django.apps import AppConfig


class PCAAnalysisConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'pca_analysis'
    verbose_name = 'Principal Component Analysis'
    
    def ready(self):
        """Import signals when the app is ready"""
        import pca_analysis.signals