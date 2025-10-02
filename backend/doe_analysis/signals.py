"""
Signal handlers for DOE Analysis application
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import ModelAnalysis, OptimizationAnalysis


@receiver(post_save, sender=ModelAnalysis)
def model_analysis_status_changed(sender, instance, created, **kwargs):
    """
    Send a WebSocket message when a model analysis status changes
    """
    if not created and 'status' in instance.get_dirty_fields():
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"analysis_{instance.user.id}_{instance.experiment_design.id}",
            {
                'type': 'analysis_status',
                'message': {
                    'status': instance.status,
                    'analysis_id': instance.id
                }
            }
        )


@receiver(post_save, sender=OptimizationAnalysis)
def optimization_status_changed(sender, instance, created, **kwargs):
    """
    Send a WebSocket message when an optimization analysis status changes
    """
    if not created and 'status' in instance.get_dirty_fields():
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"optimization_{instance.user.id}_{instance.model_analysis.id}",
            {
                'type': 'optimization_status',
                'message': {
                    'status': instance.status,
                    'optimization_id': instance.id
                }
            }
        )


@receiver(post_delete, sender=ModelAnalysis)
def cleanup_model_analysis_files(sender, instance, **kwargs):
    """
    Clean up any files associated with a model analysis when it's deleted
    """
    # Delete any temporary files or generated reports
    pass


@receiver(post_delete, sender=OptimizationAnalysis)
def cleanup_optimization_files(sender, instance, **kwargs):
    """
    Clean up any files associated with an optimization analysis when it's deleted
    """
    # Delete any temporary files or generated reports
    pass