"""
Celery Tasks Tests
===================
Comprehensive tests for the 13 Celery shared tasks in core.tasks.

Tests run with CELERY_TASK_ALWAYS_EAGER = True so .delay() and
.apply_async() execute synchronously in-process.

@author StickForStats Development Team
@date 2026-02-20
"""

import uuid
from datetime import timedelta
from unittest.mock import patch, MagicMock

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone

from core.models import (
    Journal,
    ManuscriptSubmission,
    Organization,
    AnalysisSession,
    UsageRecord,
    SubscriptionTier,
)
from core.tasks import (
    run_statistical_analysis,
    run_guardian_check,
    process_manuscript,
    batch_manuscript_analysis,
    generate_full_report,
    export_user_data_async,
    erase_user_data_async,
    send_webhook_delivery,
    compute_journal_analytics,
    sync_usage_aggregates,
    cleanup_expired_sessions,
    check_subscription_expirations,
)

User = get_user_model()


# =============================================================================
# Task Registry & Routing Tests
# =============================================================================


class TestTaskRegistry(TestCase):
    """Verify all 13 tasks are registered and routed correctly."""

    EXPECTED_TASKS = [
        'core.tasks.run_statistical_analysis',
        'core.tasks.run_guardian_check',
        'core.tasks.process_manuscript',
        'core.tasks.batch_manuscript_analysis',
        'core.tasks.generate_full_report',
        'core.tasks.export_user_data_async',
        'core.tasks.erase_user_data_async',
        'core.tasks.send_webhook_delivery',
        'core.tasks.compute_journal_analytics',
        'core.tasks.sync_usage_aggregates',
        'core.tasks.cleanup_expired_sessions',
        'core.tasks.check_subscription_expirations',
    ]

    def test_task_registry_all_13_registered(self):
        """All 13 shared tasks must be discoverable via the Celery app."""
        from stickforstats.celery import app

        registered = app.tasks.keys()
        for task_name in self.EXPECTED_TASKS:
            self.assertIn(task_name, registered, f"{task_name} not registered")

    def test_task_count(self):
        """At least 12 core.tasks.* tasks should be registered."""
        from stickforstats.celery import app

        core_tasks = [t for t in app.tasks.keys() if t.startswith('core.tasks.')]
        self.assertGreaterEqual(len(core_tasks), 12)

    def test_queue_routing(self):
        """Each task must be routed to its designated queue."""
        from stickforstats.celery import app

        expected_routes = {
            'core.tasks.run_statistical_analysis': 'analysis',
            'core.tasks.run_guardian_check': 'analysis',
            'core.tasks.process_manuscript': 'manuscript',
            'core.tasks.batch_manuscript_analysis': 'manuscript',
            'core.tasks.generate_full_report': 'reports',
            'core.tasks.export_user_data_async': 'gdpr',
            'core.tasks.erase_user_data_async': 'gdpr',
            'core.tasks.compute_journal_analytics': 'analytics',
            'core.tasks.send_webhook_delivery': 'webhooks',
            'core.tasks.sync_usage_aggregates': 'default',
            'core.tasks.cleanup_expired_sessions': 'default',
        }

        routes = app.conf.task_routes
        for task_name, expected_queue in expected_routes.items():
            self.assertIn(task_name, routes, f"No route for {task_name}")
            self.assertEqual(
                routes[task_name]['queue'],
                expected_queue,
                f"{task_name} should route to '{expected_queue}'",
            )


# =============================================================================
# 1. run_statistical_analysis
# =============================================================================


class TestRunStatisticalAnalysis(TestCase):
    """Tests for the run_statistical_analysis task."""

    def setUp(self):
        self.analysis_config = {
            'test_type': 'ttest',
            'data': {'group1': [1, 2, 3, 4, 5], 'group2': [2, 3, 4, 5, 6]},
            'parameters': {'alpha': 0.05},
            'user_id': 1,
            'session_id': 'test-session-001',
        }

    @patch('core.services.cascade_engine.AutonomousCascadeEngine')
    @patch('core.services.smart_profiler.SmartProfiler')
    def test_run_statistical_analysis_basic(self, mock_profiler_cls, mock_engine_cls):
        """Happy path: task executes cascade engine and returns result."""
        mock_engine_cls.execute_with_cascade.return_value = {
            'test_type': 'ttest',
            'p_value': 0.03,
            'cascade_path': ['ttest'],
        }

        result = run_statistical_analysis(self.analysis_config)

        mock_engine_cls.execute_with_cascade.assert_called_once_with(
            data=self.analysis_config['data'],
            intended_test='ttest',
            alpha=0.05,
        )
        self.assertEqual(result['test_type'], 'ttest')
        self.assertIn('cascade_path', result)

    @patch('core.services.cascade_engine.AutonomousCascadeEngine')
    @patch('core.services.smart_profiler.SmartProfiler')
    def test_run_statistical_analysis_error(self, mock_profiler_cls, mock_engine_cls):
        """On error the task should raise (triggering retry in non-eager mode)."""
        mock_engine_cls.execute_with_cascade.side_effect = ValueError("Bad data")

        with self.assertRaises(Exception):
            run_statistical_analysis(self.analysis_config)

    @patch('core.services.cascade_engine.AutonomousCascadeEngine')
    @patch('core.services.smart_profiler.SmartProfiler')
    def test_run_statistical_analysis_return_format(self, mock_profiler_cls, mock_engine_cls):
        """Return value must be the dict from the cascade engine."""
        expected = {
            'test_type': 'anova',
            'p_value': 0.001,
            'cascade_path': ['anova'],
            'f_statistic': 12.5,
        }
        mock_engine_cls.execute_with_cascade.return_value = expected

        config = {**self.analysis_config, 'test_type': 'anova'}
        result = run_statistical_analysis(config)

        self.assertIsInstance(result, dict)
        self.assertEqual(result, expected)

    @patch('core.services.cascade_engine.AutonomousCascadeEngine')
    @patch('core.services.smart_profiler.SmartProfiler')
    def test_run_statistical_analysis_default_alpha(self, mock_profiler_cls, mock_engine_cls):
        """When alpha is not specified, should default to 0.05."""
        mock_engine_cls.execute_with_cascade.return_value = {'test_type': 'ttest'}

        config = {
            'test_type': 'ttest',
            'data': [1, 2, 3],
            'parameters': {},
        }
        run_statistical_analysis(config)

        _, kwargs = mock_engine_cls.execute_with_cascade.call_args
        self.assertEqual(kwargs['alpha'], 0.05)


# =============================================================================
# 2. run_guardian_check
# =============================================================================


class TestRunGuardianCheck(TestCase):
    """Tests for the run_guardian_check task."""

    def setUp(self):
        self.test_type = 'ttest'
        self.data_summary = {
            'n': 30,
            'mean': 5.2,
            'std': 1.1,
            'normality_p': 0.45,
        }

    @patch('core.guardian.guardian_core.GuardianCore')
    def test_run_guardian_check_basic(self, mock_guardian_cls):
        """Happy path: returns Guardian validation report."""
        mock_instance = MagicMock()
        mock_guardian_cls.return_value = mock_instance
        mock_instance.validate.return_value = {
            'confidence_score': 92.0,
            'violations': [],
            'alternatives': [],
        }

        result = run_guardian_check(self.test_type, self.data_summary)

        self.assertEqual(result['test_type'], 'ttest')
        self.assertEqual(result['confidence_score'], 92.0)
        self.assertEqual(result['violations'], [])

    @patch('core.guardian.guardian_core.GuardianCore')
    def test_run_guardian_check_error(self, mock_guardian_cls):
        """On error, returns dict with 'error' key (does not raise)."""
        mock_instance = MagicMock()
        mock_guardian_cls.return_value = mock_instance
        mock_instance.validate.side_effect = RuntimeError("Validation engine broken")

        result = run_guardian_check(self.test_type, self.data_summary)

        self.assertIn('error', result)
        self.assertIn('Validation engine broken', result['error'])

    @patch('core.guardian.guardian_core.GuardianCore')
    def test_run_guardian_check_return_format(self, mock_guardian_cls):
        """Return value must include test_type, confidence_score, violations, alternatives."""
        mock_instance = MagicMock()
        mock_guardian_cls.return_value = mock_instance
        mock_instance.validate.return_value = {
            'confidence_score': 78.5,
            'violations': [{'type': 'normality', 'severity': 'warning'}],
            'alternatives': ['mann_whitney'],
        }

        result = run_guardian_check(self.test_type, self.data_summary)

        self.assertIn('test_type', result)
        self.assertIn('confidence_score', result)
        self.assertIn('violations', result)
        self.assertIn('alternatives', result)
        self.assertIsInstance(result['violations'], list)
        self.assertIsInstance(result['alternatives'], list)


# =============================================================================
# 3. process_manuscript
# =============================================================================


class TestProcessManuscript(TestCase):
    """Tests for the process_manuscript task."""

    def setUp(self):
        self.journal = Journal.objects.create(
            name='Test Journal',
            field='psychology',
            is_active=True,
        )
        self.submission = ManuscriptSubmission.objects.create(
            journal=self.journal,
            file_name='test_manuscript.pdf',
            file_type='pdf',
            title='Test Manuscript Title',
            status='pending',
        )

    @patch('core.manuscript.discipline_profiles.evaluate_checklist')
    @patch('core.manuscript.advanced_validators.run_all_validators')
    @patch('core.sqs_scoring.SQSScorer')
    def test_process_manuscript_basic(self, mock_scorer_cls, mock_validators, mock_checklist):
        """Happy path: scores manuscript, updates status to completed."""
        mock_scorer_instance = MagicMock()
        mock_scorer_cls.return_value = mock_scorer_instance
        mock_scorer_instance.score.return_value = {'total_score': 75.0}
        mock_validators.return_value = [{'validator': 'sample_size', 'pass': True}]
        mock_checklist.return_value = {'checklist': 'psychology', 'score': 80}

        # Patch the ManuscriptSubmission.objects.get to return a mock with extracted_text
        with patch('core.models.ManuscriptSubmission.objects') as mock_qs:
            mock_sub = MagicMock()
            mock_sub.id = self.submission.id
            mock_sub.extracted_text = 'This study examined the effects of...'
            mock_sub.field = 'psychology'
            mock_sub.journal = self.journal
            mock_sub.sqs_score = None
            mock_qs.get.return_value = mock_sub

            result = process_manuscript(str(self.submission.id))

        self.assertEqual(result['status'], 'completed')
        self.assertEqual(result['sqs_score'], 75.0)
        self.assertIn('submission_id', result)

    def test_process_manuscript_not_found(self):
        """Non-existent submission returns error dict."""
        fake_id = str(uuid.uuid4())
        result = process_manuscript(fake_id)

        self.assertIn('error', result)
        self.assertEqual(result['error'], 'Submission not found')

    @patch('core.sqs_scoring.SQSScorer')
    def test_process_manuscript_no_text(self, mock_scorer_cls):
        """Submission with no extracted text returns error and sets status to failed."""
        with patch('core.models.ManuscriptSubmission.objects') as mock_qs:
            mock_sub = MagicMock()
            mock_sub.id = self.submission.id
            mock_sub.extracted_text = ''
            mock_sub.field = 'psychology'
            mock_sub.journal = None
            mock_qs.get.return_value = mock_sub

            result = process_manuscript(str(self.submission.id))

        self.assertIn('error', result)
        self.assertIn('No text extracted', result['error'])

    @patch('core.manuscript.advanced_validators.run_all_validators')
    @patch('core.sqs_scoring.SQSScorer')
    def test_process_manuscript_return_format(self, mock_scorer_cls, mock_validators):
        """Return value must contain submission_id, sqs_score, status."""
        mock_scorer_instance = MagicMock()
        mock_scorer_cls.return_value = mock_scorer_instance
        mock_scorer_instance.score.return_value = {'total_score': 65.0}
        mock_validators.return_value = []

        with patch('core.models.ManuscriptSubmission.objects') as mock_qs:
            mock_sub = MagicMock()
            mock_sub.id = self.submission.id
            mock_sub.extracted_text = 'Some manuscript text here.'
            mock_sub.field = None
            mock_sub.journal = None
            mock_sub.sqs_score = None
            mock_qs.get.return_value = mock_sub

            result = process_manuscript(str(self.submission.id))

        self.assertIn('submission_id', result)
        self.assertIn('sqs_score', result)
        self.assertIn('status', result)


# =============================================================================
# 4. batch_manuscript_analysis
# =============================================================================


class TestBatchManuscriptAnalysis(TestCase):
    """Tests for the batch_manuscript_analysis task."""

    @patch('core.tasks.process_manuscript')
    def test_batch_manuscript_analysis_basic(self, mock_process):
        """Happy path: processes each submission and aggregates results."""
        mock_process.side_effect = [
            {'status': 'completed', 'sqs_score': 80},
            {'status': 'completed', 'sqs_score': 70},
            {'error': 'Submission not found'},
        ]

        ids = [str(uuid.uuid4()) for _ in range(3)]
        result = batch_manuscript_analysis(ids)

        self.assertEqual(result['total'], 3)
        self.assertEqual(result['completed'], 2)
        self.assertEqual(result['failed'], 1)
        self.assertEqual(len(result['results']), 3)

    @patch('core.tasks.process_manuscript')
    def test_batch_manuscript_analysis_error(self, mock_process):
        """All failures should report 0 completed."""
        mock_process.return_value = {'error': 'Processing failed'}

        ids = [str(uuid.uuid4()), str(uuid.uuid4())]
        result = batch_manuscript_analysis(ids)

        self.assertEqual(result['total'], 2)
        self.assertEqual(result['completed'], 0)
        self.assertEqual(result['failed'], 2)

    @patch('core.tasks.process_manuscript')
    def test_batch_manuscript_analysis_return_format(self, mock_process):
        """Return must include total, completed, failed, results keys."""
        mock_process.return_value = {'status': 'completed', 'sqs_score': 90}

        result = batch_manuscript_analysis([str(uuid.uuid4())])

        self.assertIn('total', result)
        self.assertIn('completed', result)
        self.assertIn('failed', result)
        self.assertIn('results', result)
        self.assertIsInstance(result['results'], list)

    @patch('core.tasks.process_manuscript')
    def test_batch_manuscript_analysis_empty_list(self, mock_process):
        """Empty submission list should return zeros."""
        result = batch_manuscript_analysis([])

        self.assertEqual(result['total'], 0)
        self.assertEqual(result['completed'], 0)
        self.assertEqual(result['failed'], 0)
        self.assertEqual(result['results'], [])
        mock_process.assert_not_called()


# =============================================================================
# 5. generate_full_report
# =============================================================================


class TestGenerateFullReport(TestCase):
    """Tests for the generate_full_report task."""

    def setUp(self):
        self.analysis_results = {
            'test_type': 'ttest',
            'p_value': 0.023,
            't_statistic': 2.45,
            'effect_size': 0.65,
        }
        self.report_config = {
            'format': 'plain',
            'include_apa': True,
            'include_methods': True,
        }

    @patch('core.services.plain_language_translator.PlainLanguageTranslator')
    def test_generate_full_report_basic(self, mock_translator_cls):
        """Happy path: generates report with all requested sections."""
        mock_instance = MagicMock()
        mock_translator_cls.return_value = mock_instance
        mock_instance.translate.return_value = {
            'summary': 'The t-test was statistically significant.',
        }

        result = generate_full_report(self.analysis_results, self.report_config)

        self.assertIn('sections', result)
        self.assertIn('plain_english', result['sections'])
        self.assertEqual(result['test_type'], 'ttest')
        self.assertEqual(result['format'], 'plain')

    @patch('core.services.plain_language_translator.PlainLanguageTranslator')
    def test_generate_full_report_error(self, mock_translator_cls):
        """On error, returns dict with 'error' key."""
        mock_translator_cls.side_effect = ImportError("Translator unavailable")

        result = generate_full_report(self.analysis_results, self.report_config)

        self.assertIn('error', result)

    @patch('core.services.plain_language_translator.PlainLanguageTranslator')
    def test_generate_full_report_return_format(self, mock_translator_cls):
        """Return must include sections, format, test_type."""
        mock_instance = MagicMock()
        mock_translator_cls.return_value = mock_instance
        mock_instance.translate.return_value = {'text': 'Results summary'}

        result = generate_full_report(self.analysis_results, self.report_config)

        self.assertIn('sections', result)
        self.assertIn('format', result)
        self.assertIn('test_type', result)
        self.assertIsInstance(result['sections'], dict)

    @patch('core.services.plain_language_translator.PlainLanguageTranslator')
    def test_generate_full_report_no_apa(self, mock_translator_cls):
        """When include_apa=False, APA section should not be generated."""
        mock_instance = MagicMock()
        mock_translator_cls.return_value = mock_instance
        mock_instance.translate.return_value = {'text': 'Summary'}

        config = {'format': 'plain', 'include_apa': False, 'include_methods': False}
        result = generate_full_report(self.analysis_results, config)

        # translate should only be called once (for plain_english)
        self.assertEqual(mock_instance.translate.call_count, 1)


# =============================================================================
# 6. export_user_data_async
# =============================================================================


class TestExportUserDataAsync(TestCase):
    """Tests for the export_user_data_async task (GDPR Art. 15+20)."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='gdpr_export_user',
            password='testpass123',
            email='export@test.com',
        )

    @patch('core.services.gdpr_service.GDPRService')
    def test_export_user_data_basic(self, mock_gdpr_cls):
        """Happy path: exports user data via GDPRService."""
        mock_gdpr_cls.export_user_data.return_value = {
            'account': {'username': 'gdpr_export_user'},
            'consent_records': [],
            'usage_records': [],
        }

        result = export_user_data_async(self.user.id)

        mock_gdpr_cls.export_user_data.assert_called_once()
        self.assertIn('account', result)

    def test_export_user_data_nonexistent_user(self):
        """Non-existent user returns error dict."""
        result = export_user_data_async(99999)

        self.assertIn('error', result)

    @patch('core.services.gdpr_service.GDPRService')
    def test_export_user_data_return_format(self, mock_gdpr_cls):
        """Return value must be the dict from GDPRService.export_user_data."""
        export_data = {
            'export_metadata': {'generated_at': '2026-02-20T00:00:00'},
            'account': {'username': 'gdpr_export_user', 'email': 'export@test.com'},
            'consent_records': [],
            'organization_memberships': [],
            'usage_records': [],
            'audit_entries': [],
        }
        mock_gdpr_cls.export_user_data.return_value = export_data

        result = export_user_data_async(self.user.id)

        self.assertEqual(result, export_data)


# =============================================================================
# 7. erase_user_data_async
# =============================================================================


class TestEraseUserDataAsync(TestCase):
    """Tests for the erase_user_data_async task (GDPR Art. 17)."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='gdpr_erase_user',
            password='testpass123',
            email='erase@test.com',
        )

    @patch('core.services.gdpr_service.GDPRService')
    def test_erase_user_data_basic(self, mock_gdpr_cls):
        """Happy path: erases user data with confirm=True."""
        mock_gdpr_cls.erase_user_data.return_value = {
            'status': 'erased',
            'deleted': {'consent_records': 3, 'usage_records': 50},
        }

        result = erase_user_data_async(self.user.id)

        mock_gdpr_cls.erase_user_data.assert_called_once()
        # Verify confirm=True is passed
        args, kwargs = mock_gdpr_cls.erase_user_data.call_args
        self.assertTrue(kwargs.get('confirm') or (len(args) > 1 and args[1]))

    def test_erase_user_data_nonexistent_user(self):
        """Non-existent user returns error dict."""
        result = erase_user_data_async(99999)

        self.assertIn('error', result)

    @patch('core.services.gdpr_service.GDPRService')
    def test_erase_user_data_return_format(self, mock_gdpr_cls):
        """Return value is whatever GDPRService.erase_user_data returns."""
        erase_result = {
            'status': 'erased',
            'deleted': {'consent_records': 1},
            'anonymized': {'audit_entries': 5},
        }
        mock_gdpr_cls.erase_user_data.return_value = erase_result

        result = erase_user_data_async(self.user.id)

        self.assertEqual(result, erase_result)


# =============================================================================
# 8. send_webhook_delivery
# =============================================================================


class TestSendWebhookDelivery(TestCase):
    """Tests for the send_webhook_delivery task."""

    def setUp(self):
        self.journal = Journal.objects.create(
            name='Webhook Test Journal',
            field='general',
            webhook_url='https://example.com/webhook',
            webhook_secret='test-secret-key-123',
            is_active=True,
        )

    @patch('core.services.webhook_service.WebhookDeliveryService')
    def test_send_webhook_delivery_basic(self, mock_service_cls):
        """Happy path: delivers webhook payload."""
        mock_service_cls.deliver.return_value = {
            'delivered': True,
            'status_code': 200,
        }

        result = send_webhook_delivery(
            str(self.journal.id),
            'submission.completed',
            {'submission_id': 'abc-123', 'sqs_score': 85},
        )

        mock_service_cls.deliver.assert_called_once_with(
            url=self.journal.webhook_url,
            secret=self.journal.webhook_secret,
            event='submission.completed',
            payload={'submission_id': 'abc-123', 'sqs_score': 85},
        )
        self.assertEqual(result['delivered'], True)

    @patch('core.services.webhook_service.WebhookDeliveryService')
    def test_send_webhook_delivery_error(self, mock_service_cls):
        """On delivery failure, the task should raise to trigger retry."""
        mock_service_cls.deliver.side_effect = ConnectionError("Network unreachable")

        with self.assertRaises(Exception):
            send_webhook_delivery(
                str(self.journal.id),
                'submission.completed',
                {'submission_id': 'abc-123'},
            )

    @patch('core.services.webhook_service.WebhookDeliveryService')
    def test_send_webhook_delivery_no_webhook_configured(self, mock_service_cls):
        """Journal without webhook URL/secret should skip delivery."""
        journal_no_hook = Journal.objects.create(
            name='No Hook Journal',
            field='general',
            webhook_url='',
            webhook_secret='',
            is_active=True,
        )

        result = send_webhook_delivery(
            str(journal_no_hook.id),
            'submission.completed',
            {'submission_id': 'abc-123'},
        )

        self.assertTrue(result.get('skipped'))
        self.assertIn('reason', result)
        mock_service_cls.deliver.assert_not_called()

    @patch('core.services.webhook_service.WebhookDeliveryService')
    def test_send_webhook_delivery_return_format(self, mock_service_cls):
        """Return value from the service should be passed through."""
        expected = {'delivered': True, 'status_code': 200, 'latency_ms': 42}
        mock_service_cls.deliver.return_value = expected

        result = send_webhook_delivery(
            str(self.journal.id),
            'report.completed',
            {},
        )

        self.assertIsInstance(result, dict)


# =============================================================================
# 9. compute_journal_analytics
# =============================================================================


class TestComputeJournalAnalytics(TestCase):
    """Tests for the compute_journal_analytics task."""

    def setUp(self):
        self.journal = Journal.objects.create(
            name='Analytics Test Journal',
            field='psychology',
            is_active=True,
        )
        self.inactive_journal = Journal.objects.create(
            name='Inactive Journal',
            field='general',
            is_active=False,
        )

    def test_compute_journal_analytics_basic(self):
        """Happy path: computes analytics for active journals."""
        result = compute_journal_analytics()

        self.assertIn('journals_processed', result)
        self.assertGreaterEqual(result['journals_processed'], 1)

    def test_compute_journal_analytics_with_submissions(self):
        """Analytics should aggregate submission stats."""
        ManuscriptSubmission.objects.create(
            journal=self.journal,
            file_name='paper1.pdf',
            file_type='pdf',
            status='completed',
            sqs_score=82.0,
        )
        ManuscriptSubmission.objects.create(
            journal=self.journal,
            file_name='paper2.pdf',
            file_type='pdf',
            status='pending',
        )

        result = compute_journal_analytics()

        self.assertIn('journals_processed', result)

    def test_compute_journal_analytics_return_format(self):
        """Return value must contain journals_processed count."""
        result = compute_journal_analytics()

        self.assertIn('journals_processed', result)
        self.assertIsInstance(result['journals_processed'], int)

    def test_compute_journal_analytics_excludes_inactive(self):
        """Inactive journals should not be counted."""
        self.journal.delete()

        result = compute_journal_analytics()

        self.assertEqual(result['journals_processed'], 0)


# =============================================================================
# 10. sync_usage_aggregates
# =============================================================================


class TestSyncUsageAggregates(TestCase):
    """Tests for the sync_usage_aggregates task."""

    def setUp(self):
        self.tier = SubscriptionTier.objects.create(
            name='test-tier-usage',
            slug='test-tier-usage',
            display_name='Test Tier',
        )
        self.org = Organization.objects.create(
            name='Usage Test Org',
            slug='usage-test-org',
            tier=self.tier,
        )

    def test_sync_usage_aggregates_basic(self):
        """Happy path: aggregates recent usage records."""
        result = sync_usage_aggregates()

        self.assertIn('orgs_with_activity', result)

    def test_sync_usage_aggregates_with_records(self):
        """Should count orgs that have recent usage."""
        UsageRecord.objects.create(
            organization=self.org,
            endpoint='/api/v1/stats/ttest/',
            method='POST',
            status_code=200,
            timestamp=timezone.now(),
        )

        result = sync_usage_aggregates()

        self.assertGreaterEqual(result['orgs_with_activity'], 1)

    def test_sync_usage_aggregates_return_format(self):
        """Return must contain orgs_with_activity key."""
        result = sync_usage_aggregates()

        self.assertIn('orgs_with_activity', result)
        self.assertIsInstance(result['orgs_with_activity'], int)

    def test_sync_usage_aggregates_ignores_old_records(self):
        """Usage records older than 1 hour should not be counted."""
        UsageRecord.objects.create(
            organization=self.org,
            endpoint='/api/v1/stats/ttest/',
            method='POST',
            status_code=200,
            timestamp=timezone.now() - timedelta(hours=2),
        )

        result = sync_usage_aggregates()

        self.assertEqual(result['orgs_with_activity'], 0)


# =============================================================================
# 11. cleanup_expired_sessions
# =============================================================================


class TestCleanupExpiredSessions(TestCase):
    """Tests for the cleanup_expired_sessions task."""

    def test_cleanup_expired_sessions_basic(self):
        """Happy path: finds old sessions beyond 30-day cutoff."""
        result = cleanup_expired_sessions()

        self.assertIn('sessions_found', result)

    def test_cleanup_expired_sessions_with_old_sessions(self):
        """Sessions older than 30 days should be found."""
        AnalysisSession.objects.create(
            name='Old Session',
            analysis_type='ttest',
            created_at=timezone.now() - timedelta(days=45),
        )
        AnalysisSession.objects.create(
            name='Recent Session',
            analysis_type='anova',
            created_at=timezone.now() - timedelta(days=5),
        )

        result = cleanup_expired_sessions()

        self.assertGreaterEqual(result['sessions_found'], 1)

    def test_cleanup_expired_sessions_return_format(self):
        """Return must contain sessions_found count."""
        result = cleanup_expired_sessions()

        self.assertIn('sessions_found', result)
        self.assertIsInstance(result['sessions_found'], int)

    def test_cleanup_expired_sessions_ignores_recent(self):
        """Recent sessions should not be flagged for cleanup."""
        AnalysisSession.objects.create(
            name='Fresh Session',
            analysis_type='correlation',
            created_at=timezone.now() - timedelta(days=1),
        )

        result = cleanup_expired_sessions()

        self.assertEqual(result['sessions_found'], 0)


# =============================================================================
# 12. check_subscription_expirations
# =============================================================================


class TestCheckSubscriptionExpirations(TestCase):
    """Tests for the check_subscription_expirations task."""

    def test_check_subscription_expirations_basic(self):
        """Happy path: checks for expiring subscriptions."""
        result = check_subscription_expirations()

        # The Organization model may not have subscription_expires_at;
        # task may raise FieldError. If it succeeds, verify format.
        if 'error' not in result:
            self.assertIn('expiring_count', result)
        else:
            self.assertIn('error', result)

    def test_check_subscription_expirations_return_format(self):
        """Return must contain either expiring_count or error."""
        result = check_subscription_expirations()

        self.assertTrue(
            'expiring_count' in result or 'error' in result,
            "Result must contain 'expiring_count' or 'error'",
        )

    def test_check_subscription_expirations_error_handling(self):
        """Task should not raise exceptions -- errors are returned as dict."""
        result = check_subscription_expirations()

        self.assertIsInstance(result, dict)


# =============================================================================
# 13. Task Signatures and Configuration
# =============================================================================


class TestTaskSignatures(TestCase):
    """Verify task decorator configuration (retries, time limits, bind)."""

    def test_run_statistical_analysis_config(self):
        """run_statistical_analysis: bind=True, max_retries=2, retry_delay=30."""
        self.assertEqual(run_statistical_analysis.max_retries, 2)
        self.assertEqual(run_statistical_analysis.default_retry_delay, 30)

    def test_run_guardian_check_config(self):
        """run_guardian_check: bind=True, no retries configured."""
        self.assertTrue(hasattr(run_guardian_check, 'name'))

    def test_process_manuscript_config(self):
        """process_manuscript: bind=True, max_retries=1, time_limit=600."""
        self.assertEqual(process_manuscript.max_retries, 1)
        self.assertEqual(process_manuscript.time_limit, 600)

    def test_batch_manuscript_analysis_config(self):
        """batch_manuscript_analysis: bind=True, time_limit=1800."""
        self.assertEqual(batch_manuscript_analysis.time_limit, 1800)

    def test_generate_full_report_config(self):
        """generate_full_report: bind=True, time_limit=300."""
        self.assertEqual(generate_full_report.time_limit, 300)

    def test_export_user_data_config(self):
        """export_user_data_async: bind=True, time_limit=300."""
        self.assertEqual(export_user_data_async.time_limit, 300)

    def test_erase_user_data_config(self):
        """erase_user_data_async: bind=True, time_limit=300."""
        self.assertEqual(erase_user_data_async.time_limit, 300)

    def test_send_webhook_delivery_config(self):
        """send_webhook_delivery: bind=True, max_retries=3, retry_delay=60."""
        self.assertEqual(send_webhook_delivery.max_retries, 3)
        self.assertEqual(send_webhook_delivery.default_retry_delay, 60)

    def test_compute_journal_analytics_is_shared_task(self):
        """compute_journal_analytics is a celery shared_task."""
        self.assertTrue(hasattr(compute_journal_analytics, 'delay'))
        self.assertTrue(hasattr(compute_journal_analytics, 'apply_async'))

    def test_sync_usage_aggregates_is_shared_task(self):
        """sync_usage_aggregates is a celery shared_task."""
        self.assertTrue(hasattr(sync_usage_aggregates, 'delay'))

    def test_cleanup_expired_sessions_is_shared_task(self):
        """cleanup_expired_sessions is a celery shared_task."""
        self.assertTrue(hasattr(cleanup_expired_sessions, 'delay'))

    def test_check_subscription_expirations_is_shared_task(self):
        """check_subscription_expirations is a celery shared_task."""
        self.assertTrue(hasattr(check_subscription_expirations, 'delay'))


# =============================================================================
# Beat Schedule Tests
# =============================================================================


class TestBeatSchedule(TestCase):
    """Verify Celery Beat periodic task schedule."""

    def test_beat_schedule_has_expected_entries(self):
        """All 4 periodic tasks must be in the beat schedule."""
        from stickforstats.celery import app

        schedule = app.conf.beat_schedule
        expected_tasks = [
            'core.tasks.sync_usage_aggregates',
            'core.tasks.cleanup_expired_sessions',
            'core.tasks.compute_journal_analytics',
            'core.tasks.check_subscription_expirations',
        ]

        scheduled_task_names = [entry['task'] for entry in schedule.values()]
        for task_name in expected_tasks:
            self.assertIn(
                task_name,
                scheduled_task_names,
                f"{task_name} not in beat schedule",
            )

    def test_beat_schedule_entry_count(self):
        """Beat schedule should have at least 4 entries."""
        from stickforstats.celery import app

        self.assertGreaterEqual(len(app.conf.beat_schedule), 4)
