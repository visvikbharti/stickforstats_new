"""
Core Django application configuration.
"""

from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)

class CoreConfig(AppConfig):
    """
    Configuration for the Core application.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    verbose_name = 'StickForStats Core'
    
    def ready(self):
        """
        Perform initialization when Django starts.
        This method is called once when the Django application is ready.
        """
        # Temporarily disabled registry initialization - TODO: Fix module imports
        pass
        # from .registry import register_module
        # 
        # # Initialize the module registry
        # try:
        #     # Register core module
        #     from .module_info import register as register_core
        #     from .registry import get_registry
        #     
        #     register_core(get_registry())
        #     logger.info("Core module registered")
        #     
        #     # Auto-discover and register other modules
        #     from django.apps import apps
        #     import importlib
        #     
        #     # Register statistical modules
        #     statistical_modules = [
        #         'confidence_intervals',
        #         'pca_analysis', 
        #         'doe_analysis',
        #         'sqc_analysis',
        #         'probability_distributions'
        #     ]
        #     
        #     for module_name in statistical_modules:
        #         try:
        #             # Try to import module_info and register the module
        #             module_info = importlib.import_module(f"{module_name}.module_info")
        #             if hasattr(module_info, 'register') and callable(module_info.register):
        #                 module_info.register(get_registry())
        #                 logger.info(f"Module {module_name} registered automatically")
        #         except ImportError:
        #             logger.warning(f"No module_info.py found for {module_name}")
        #         except Exception as e:
        #             logger.error(f"Error registering module {module_name}: {str(e)}")
        # 
        # except Exception as e:
        #     logger.error(f"Error during module registration: {str(e)}")