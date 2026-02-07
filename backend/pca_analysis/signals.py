"""
Signal handlers for PCA Analysis module
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
import logging

from .models import PCAResult, PCAVisualization

logger = logging.getLogger(__name__)


@receiver(post_save, sender=PCAResult)
def pca_result_status_changed(sender, instance, created, **kwargs):
    """
    Log when a PCA result is created or updated.
    """
    if created:
        logger.info(f"PCA result created: {instance.id} for project {instance.project.name}")
    else:
        logger.info(f"PCA result updated: {instance.id} status={instance.status}")


@receiver(post_save, sender=PCAVisualization)
def pca_visualization_created(sender, instance, created, **kwargs):
    """
    Log when a new visualization is created.
    """
    if created:
        logger.info(f"PCA visualization created: {instance.id} type={instance.plot_type}")


@receiver(post_delete, sender=PCAResult)
def cleanup_pca_result_files(sender, instance, **kwargs):
    """
    Clean up any files associated with a PCA result when it's deleted.
    """
    pass


@receiver(post_delete, sender=PCAVisualization)
def cleanup_visualization_files(sender, instance, **kwargs):
    """
    Clean up any files associated with a visualization when it's deleted.
    """
    pass
