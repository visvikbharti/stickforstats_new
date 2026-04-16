"""Utilities for sending WebSocket messages from synchronous code (Celery tasks)."""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def send_analysis_progress(session_id, progress, stage="", message=""):
    """Send analysis progress update via WebSocket."""
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"analysis_{session_id}",
            {
                "type": "analysis.progress",
                "progress": progress,
                "stage": stage,
                "message": message,
            },
        )


def send_analysis_complete(session_id, results):
    """Send analysis completion via WebSocket."""
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"analysis_{session_id}",
            {
                "type": "analysis.complete",
                "results": results,
            },
        )


def send_analysis_error(session_id, error):
    """Send analysis error via WebSocket."""
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"analysis_{session_id}",
            {
                "type": "analysis.error",
                "error": str(error),
            },
        )


def send_guardian_alert(session_id, violation, severity="warning"):
    """Send Guardian violation alert via WebSocket."""
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"analysis_{session_id}",
            {
                "type": "guardian.alert",
                "violation": violation,
                "severity": severity,
            },
        )


def send_user_notification(user_id, title, message, level="info"):
    """Send notification to a specific user."""
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"notifications_{user_id}",
            {
                "type": "system.notification",
                "title": title,
                "message": message,
                "level": level,
            },
        )


def send_task_complete(user_id, task_id, task_type, result_url="", message=""):
    """Notify user that an async task completed."""
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"notifications_{user_id}",
            {
                "type": "task.complete",
                "task_id": task_id,
                "task_type": task_type,
                "result_url": result_url,
                "message": message or f"{task_type} completed",
            },
        )
