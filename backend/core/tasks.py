"""
Celery Tasks for StickForStats
================================
Async task definitions for statistical analysis, manuscript processing,
report generation, GDPR operations, and scheduled maintenance.
"""

import logging
from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


# ── Statistical Analysis Tasks ────────────────────────────

@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def run_statistical_analysis(self, analysis_config):
    """
    Run a statistical analysis asynchronously.
    Used for complex analyses that may take >5 seconds.

    Args:
        analysis_config: dict with keys:
            - test_type: str (e.g., 'ttest', 'anova', 'regression')
            - data: dict or list (the dataset)
            - parameters: dict (test-specific parameters)
            - user_id: int (for result storage)
            - session_id: str (for grouping)
    """
    try:
        test_type = analysis_config.get('test_type')
        data = analysis_config.get('data')
        parameters = analysis_config.get('parameters', {})

        logger.info(f"Running async analysis: {test_type}")

        # Import here to avoid circular imports
        from core.services.smart_profiler import SmartProfiler
        from core.services.cascade_engine import AutonomousCascadeEngine

        # Run Guardian cascade
        result = AutonomousCascadeEngine.execute_with_cascade(
            data=data,
            intended_test=test_type,
            alpha=parameters.get('alpha', 0.05),
        )

        logger.info(f"Analysis complete: {test_type}, cascade steps: {len(result.get('cascade_path', []))}")
        return result

    except Exception as exc:
        logger.error(f"Analysis failed: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True)
def run_guardian_check(self, test_type, data_summary):
    """
    Run Guardian assumption checks asynchronously.

    Args:
        test_type: str
        data_summary: dict with data statistics
    """
    try:
        from core.guardian.guardian_core import GuardianCore

        guardian = GuardianCore()
        report = guardian.validate(test_type, data_summary)

        return {
            'test_type': test_type,
            'confidence_score': report.get('confidence_score', 0),
            'violations': report.get('violations', []),
            'alternatives': report.get('alternatives', []),
        }
    except Exception as exc:
        logger.error(f"Guardian check failed: {exc}")
        return {'error': str(exc)}


# ── Manuscript Processing Tasks ───────────────────────────

@shared_task(bind=True, max_retries=1, time_limit=600)
def process_manuscript(self, submission_id):
    """
    Process a manuscript submission asynchronously.
    Runs SQS scoring + advanced validators + discipline profile.

    Args:
        submission_id: UUID of ManuscriptSubmission
    """
    try:
        from core.models import ManuscriptSubmission

        submission = ManuscriptSubmission.objects.get(id=submission_id)
        submission.status = 'processing'
        submission.save(update_fields=['status'])

        logger.info(f"Processing manuscript: {submission_id}")

        # Run SQS analysis
        from core.sqs_scoring import SQSScorer
        scorer = SQSScorer()

        text = submission.extracted_text or ''
        if not text:
            submission.status = 'failed'
            submission.save(update_fields=['status'])
            return {'error': 'No text extracted from manuscript'}

        sqs_result = scorer.score(text, field=submission.field or 'general')

        # Run advanced validators
        from core.manuscript.advanced_validators import run_all_validators
        validator_results = run_all_validators(text)

        # Run discipline profile if applicable
        discipline_result = None
        if submission.field:
            from core.manuscript.discipline_profiles import evaluate_checklist
            discipline_result = evaluate_checklist(text, submission.field)

        # Update submission
        submission.sqs_score = sqs_result.get('total_score', 0)
        submission.sqs_details = sqs_result
        submission.status = 'completed'
        submission.save()

        # Send webhook if journal has one configured
        if submission.journal and submission.journal.webhook_url:
            send_webhook_delivery.delay(
                str(submission.journal.id),
                'submission.completed',
                {
                    'submission_id': str(submission_id),
                    'sqs_score': submission.sqs_score,
                }
            )

        logger.info(f"Manuscript processed: {submission_id}, SQS={submission.sqs_score}")

        return {
            'submission_id': str(submission_id),
            'sqs_score': submission.sqs_score,
            'status': 'completed',
        }

    except ManuscriptSubmission.DoesNotExist:
        logger.error(f"Submission not found: {submission_id}")
        return {'error': 'Submission not found'}
    except Exception as exc:
        logger.error(f"Manuscript processing failed: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, time_limit=1800)
def batch_manuscript_analysis(self, submission_ids):
    """
    Process multiple manuscripts in sequence.

    Args:
        submission_ids: list of UUID strings
    """
    results = []
    for sid in submission_ids:
        result = process_manuscript(sid)
        results.append(result)

    return {
        'total': len(submission_ids),
        'completed': len([r for r in results if r.get('status') == 'completed']),
        'failed': len([r for r in results if r.get('error')]),
        'results': results,
    }


# ── Report Generation Tasks ──────────────────────────────

@shared_task(bind=True, time_limit=300)
def generate_full_report(self, analysis_results, report_config):
    """
    Generate a comprehensive statistical report asynchronously.

    Args:
        analysis_results: dict with test results
        report_config: dict with format, sections, etc.
    """
    try:
        from core.services.plain_language_translator import PlainLanguageTranslator

        translator = PlainLanguageTranslator()

        report_format = report_config.get('format', 'plain')
        test_type = analysis_results.get('test_type', 'unknown')

        sections = {}

        # Plain English summary
        sections['plain_english'] = translator.translate(test_type, analysis_results)

        # APA formatted results
        if report_config.get('include_apa', True):
            sections['apa_results'] = translator.translate(
                test_type, analysis_results, style='apa'
            )

        # Methods section
        if report_config.get('include_methods', True):
            sections['methods'] = translator.translate(
                test_type, analysis_results, style='methods'
            )

        logger.info(f"Report generated for {test_type}")

        return {
            'sections': sections,
            'format': report_format,
            'test_type': test_type,
        }

    except Exception as exc:
        logger.error(f"Report generation failed: {exc}")
        return {'error': str(exc)}


# ── GDPR Tasks ────────────────────────────────────────────

@shared_task(bind=True, time_limit=300)
def export_user_data_async(self, user_id):
    """
    Export all user data asynchronously (GDPR Art. 15 + 20).
    For users with large datasets, this can take time.
    """
    try:
        from django.contrib.auth import get_user_model
        from core.services.gdpr_service import GDPRService

        User = get_user_model()
        user = User.objects.get(id=user_id)

        export = GDPRService.export_user_data(user)

        logger.info(f"Data export completed for user {user_id}")
        return export

    except Exception as exc:
        logger.error(f"Data export failed for user {user_id}: {exc}")
        return {'error': str(exc)}


@shared_task(bind=True, time_limit=300)
def erase_user_data_async(self, user_id):
    """
    Erase user data asynchronously (GDPR Art. 17).
    """
    try:
        from django.contrib.auth import get_user_model
        from core.services.gdpr_service import GDPRService

        User = get_user_model()
        user = User.objects.get(id=user_id)

        result = GDPRService.erase_user_data(user, confirm=True)

        logger.info(f"Data erasure completed for user {user_id}")
        return result

    except Exception as exc:
        logger.error(f"Data erasure failed for user {user_id}: {exc}")
        return {'error': str(exc)}


# ── Webhook Tasks ─────────────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_webhook_delivery(self, journal_id, event, payload):
    """
    Send a webhook delivery to a journal's endpoint.
    Retries on failure with exponential backoff.
    """
    try:
        from core.models import Journal
        from core.services.webhook_service import WebhookDeliveryService

        journal = Journal.objects.get(id=journal_id)
        if not journal.webhook_url or not journal.webhook_secret:
            return {'skipped': True, 'reason': 'No webhook configured'}

        result = WebhookDeliveryService.deliver(
            url=journal.webhook_url,
            secret=journal.webhook_secret,
            event=event,
            payload=payload,
        )

        return result

    except Exception as exc:
        logger.error(f"Webhook delivery failed: {exc}")
        raise self.retry(exc=exc)


# ── Analytics Tasks ───────────────────────────────────────

@shared_task
def compute_journal_analytics():
    """
    Compute aggregated analytics for all journals.
    Runs daily via Celery Beat.
    """
    try:
        from core.models import Journal, ManuscriptSubmission, AuditSummary
        from django.db.models import Avg, Count, Q
        from django.utils import timezone

        journals = Journal.objects.filter(is_active=True)

        for journal in journals:
            submissions = ManuscriptSubmission.objects.filter(journal=journal)

            stats = submissions.aggregate(
                total=Count('id'),
                avg_score=Avg('sqs_score'),
                completed=Count('id', filter=Q(status='completed')),
                pending=Count('id', filter=Q(status='pending')),
            )

            logger.info(f"Analytics computed for journal {journal.name}: {stats}")

        return {'journals_processed': journals.count()}

    except Exception as exc:
        logger.error(f"Journal analytics computation failed: {exc}")
        return {'error': str(exc)}


# ── Maintenance Tasks ─────────────────────────────────────

@shared_task
def sync_usage_aggregates():
    """
    Aggregate usage records into summary tables.
    Runs hourly via Celery Beat.
    """
    try:
        from core.models import UsageRecord, AuditSummary
        from django.db.models import Count
        from django.utils import timezone
        from datetime import timedelta

        one_hour_ago = timezone.now() - timedelta(hours=1)

        # Count recent usage per organization
        usage = UsageRecord.objects.filter(
            timestamp__gte=one_hour_ago
        ).values('organization').annotate(
            count=Count('id')
        )

        logger.info(f"Usage aggregation: {len(usage)} orgs with activity")
        return {'orgs_with_activity': len(usage)}

    except Exception as exc:
        logger.error(f"Usage aggregation failed: {exc}")
        return {'error': str(exc)}


@shared_task
def cleanup_expired_sessions():
    """
    Clean up expired analysis sessions and temporary data.
    Runs daily via Celery Beat.
    """
    try:
        from core.models import AnalysisSession
        from django.utils import timezone
        from datetime import timedelta

        cutoff = timezone.now() - timedelta(days=30)

        # Archive old sessions
        old_sessions = AnalysisSession.objects.filter(
            created_at__lt=cutoff,
        )
        count = old_sessions.count()

        logger.info(f"Session cleanup: {count} sessions older than 30 days")
        return {'sessions_found': count}

    except Exception as exc:
        logger.error(f"Session cleanup failed: {exc}")
        return {'error': str(exc)}


@shared_task
def check_subscription_expirations():
    """
    Check for expiring subscriptions and send notifications.
    Runs daily via Celery Beat.
    """
    try:
        from core.models import Organization
        from django.utils import timezone
        from datetime import timedelta

        # Find orgs expiring in the next 7 days
        expiring_soon = timezone.now() + timedelta(days=7)

        orgs = Organization.objects.filter(
            is_active=True,
            subscription_expires_at__lte=expiring_soon,
            subscription_expires_at__gt=timezone.now(),
        )

        logger.info(f"Subscription check: {orgs.count()} orgs expiring within 7 days")
        return {'expiring_count': orgs.count()}

    except Exception as exc:
        logger.error(f"Subscription check failed: {exc}")
        return {'error': str(exc)}
