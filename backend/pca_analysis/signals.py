"""
Signal handlers for PCA Analysis module
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import PCAResult, PCAVisualization


@receiver(post_save, sender=PCAResult)
def pca_result_status_changed(sender, instance, created, **kwargs):
    """
    Send a WebSocket message when a PCA result status changes
    """
    if not created and instance.get_dirty_fields().get('status'):
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"pca_analysis_{instance.user.id}_{instance.project.id}",
            {
                'type': 'pca_status',
                'message': {
                    'status': instance.status,
                    'result_id': str(instance.id),
                    'error_message': instance.error_message if instance.status == 'FAILED' else ''
                }
            }
        )


@receiver(post_save, sender=PCAVisualization)
def pca_visualization_created(sender, instance, created, **kwargs):
    """
    Send a WebSocket message when a new visualization is created
    """
    if created:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"pca_analysis_{instance.pca_result.user.id}_{instance.pca_result.project.id}",
            {
                'type': 'visualization_created',
                'message': {
                    'visualization_id': str(instance.id),
                    'name': instance.name,
                    'plot_type': instance.plot_type
                }
            }
        )


@receiver(post_delete, sender=PCAResult)
def cleanup_pca_result_files(sender, instance, **kwargs):
    """
    Clean up any files associated with a PCA result when it's deleted
    """
    # Delete any temporary files or generated reports
    pass


@receiver(post_delete, sender=PCAVisualization)
def cleanup_visualization_files(sender, instance, **kwargs):
    """
    Clean up any files associated with a visualization when it's deleted
    """
    # Delete any temporary files or generated images
    pass