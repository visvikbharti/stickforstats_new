from django.apps import AppConfig


class ProbabilityDistributionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'probability_distributions'
    verbose_name = 'Probability Distributions'
    
    def ready(self):
        """
        Initialize any application-specific settings or signals.
        """
        pass