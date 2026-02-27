"""
Signal handlers for DOE Analysis application
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
import logging

from .models import ModelAnalysis, OptimizationAnalysis

logger = logging.getLogger(__name__)


@receiver(post_save, sender=ModelAnalysis)
def model_analysis_status_changed(sender, instance, created, update_fields=None, **kwargs):
    """
    Send a WebSocket message when a model analysis status changes.
    """
    if not created and update_fields and "status" in update_fields:
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"analysis_{instance.experiment_design_id}",
                    {
                        "type": "analysis_status",
                        "message": {"status": instance.status, "analysis_id": str(instance.id)},
                    },
                )
        except Exception:
            logger.debug("WebSocket notification skipped for ModelAnalysis %s", instance.id)


@receiver(post_save, sender=OptimizationAnalysis)
def optimization_status_changed(sender, instance, created, update_fields=None, **kwargs):
    """
    Send a WebSocket message when an optimization analysis status changes.
    """
    if not created and update_fields and "status" in update_fields:
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"optimization_{instance.experiment_design_id}",
                    {
                        "type": "optimization_status",
                        "message": {"status": instance.status, "optimization_id": str(instance.id)},
                    },
                )
        except Exception:
            logger.debug("WebSocket notification skipped for OptimizationAnalysis %s", instance.id)


@receiver(post_delete, sender=ModelAnalysis)
def cleanup_model_analysis_files(sender, instance, **kwargs):
    """Clean up any files associated with a model analysis when it's deleted"""


@receiver(post_delete, sender=OptimizationAnalysis)
def cleanup_optimization_files(sender, instance, **kwargs):
    """Clean up any files associated with an optimization analysis when it's deleted"""
