from django.apps import AppConfig


class ConfidenceIntervalsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'confidence_intervals'
    verbose_name = 'Confidence Intervals'

    def ready(self):
        # Import signal handlers
        pass