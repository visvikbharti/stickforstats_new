"""
Celery Configuration for StickForStats
=======================================
Async task processing for long-running statistical analyses,
manuscript review, batch operations, and scheduled tasks.
"""

import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "stickforstats.settings")

app = Celery("stickforstats")

# Load config from Django settings, namespace 'CELERY'
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks in all installed apps
app.autodiscover_tasks()

# Task routing — send different task types to different queues
app.conf.task_routes = {
    "core.tasks.run_statistical_analysis": {"queue": "analysis"},
    "core.tasks.run_guardian_check": {"queue": "analysis"},
    "core.tasks.process_manuscript": {"queue": "manuscript"},
    "core.tasks.batch_manuscript_analysis": {"queue": "manuscript"},
    "core.tasks.generate_full_report": {"queue": "reports"},
    "core.tasks.export_user_data_async": {"queue": "gdpr"},
    "core.tasks.erase_user_data_async": {"queue": "gdpr"},
    "core.tasks.compute_journal_analytics": {"queue": "analytics"},
    "core.tasks.send_webhook_delivery": {"queue": "webhooks"},
    "core.tasks.sync_usage_aggregates": {"queue": "default"},
    "core.tasks.cleanup_expired_sessions": {"queue": "default"},
}

# Beat schedule — periodic tasks
app.conf.beat_schedule = {
    "sync-usage-aggregates-hourly": {
        "task": "core.tasks.sync_usage_aggregates",
        "schedule": crontab(minute=0),  # Every hour
    },
    "cleanup-expired-sessions-daily": {
        "task": "core.tasks.cleanup_expired_sessions",
        "schedule": crontab(hour=3, minute=0),  # 3 AM daily
    },
    "compute-journal-analytics-daily": {
        "task": "core.tasks.compute_journal_analytics",
        "schedule": crontab(hour=4, minute=0),  # 4 AM daily
    },
    "check-subscription-expirations-daily": {
        "task": "core.tasks.check_subscription_expirations",
        "schedule": crontab(hour=6, minute=0),  # 6 AM daily
    },
}

# Task configuration
app.conf.task_serializer = "json"
app.conf.result_serializer = "json"
app.conf.accept_content = ["json"]
app.conf.task_track_started = True
app.conf.task_time_limit = 600  # 10 minutes hard limit
app.conf.task_soft_time_limit = 300  # 5 minutes soft limit
app.conf.worker_max_tasks_per_child = 100  # Prevent memory leaks
app.conf.worker_prefetch_multiplier = 1  # Fair scheduling


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task for testing Celery connectivity."""
    print(f"Request: {self.request!r}")
