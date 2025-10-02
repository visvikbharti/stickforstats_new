from django.apps import AppConfig


class SQCAnalysisConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'sqc_analysis'
    verbose_name = 'Statistical Quality Control Analysis'
    
    def ready(self):
        """
        Initialize the SQC Analysis module when Django starts.
        
        This method:
        1. Sets up signal handlers
        2. Registers the module with the central registry
        3. Initializes any required services
        """
        # Import here to avoid circular imports
        from ..core.registry import get_registry
        
        # Import module_info to register with central registry
        from . import module_info  # This will register the module with the registry