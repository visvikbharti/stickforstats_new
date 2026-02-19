"""
Journal Analytics Views
=======================
Analytics dashboard endpoints for journal editors/admins.
Provides aggregate statistics on manuscript submissions,
SQS scores, common issues, and review turnaround times.
"""

import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Avg, Count, Q, F
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

logger = logging.getLogger(__name__)


class JournalAnalyticsOverviewView(APIView):
    """
    GET /api/v1/journal/analytics/overview/
    Summary metrics for a journal's submissions.
    Query params: ?journal=<slug>&days=30
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from core.models import ManuscriptSubmission, Journal

        journal_slug = request.query_params.get('journal')
        days = min(int(request.query_params.get('days', 30)), 365)
        since = timezone.now() - timedelta(days=days)

        if not journal_slug:
            return Response({'error': 'journal parameter required'}, status=400)

        try:
            journal = Journal.objects.get(slug=journal_slug, is_active=True)
        except Journal.DoesNotExist:
            return Response({'error': 'Journal not found'}, status=404)

        submissions = ManuscriptSubmission.objects.filter(
            journal=journal,
            submitted_at__gte=since
        )

        total = submissions.count()
        by_status = dict(submissions.values_list('status').annotate(count=Count('id')))

        # SQS score aggregates
        scored = submissions.exclude(sqs_score__isnull=True)
        avg_score = scored.aggregate(avg=Avg('sqs_score'))['avg']

        # Score distribution buckets
        excellent = scored.filter(sqs_score__gte=80).count()
        good = scored.filter(sqs_score__gte=60, sqs_score__lt=80).count()
        needs_work = scored.filter(sqs_score__gte=40, sqs_score__lt=60).count()
        poor = scored.filter(sqs_score__lt=40).count()

        return Response({
            'journal': journal.name,
            'period_days': days,
            'total_submissions': total,
            'by_status': by_status,
            'sqs_scores': {
                'average': round(avg_score, 1) if avg_score else None,
                'distribution': {
                    'excellent_80_plus': excellent,
                    'good_60_79': good,
                    'needs_work_40_59': needs_work,
                    'poor_below_40': poor,
                },
                'scored_count': scored.count(),
            },
        })


class JournalAnalyticsIssuesView(APIView):
    """
    GET /api/v1/journal/analytics/issues/
    Most common statistical issues found across submissions.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from core.models import ManuscriptSubmission, Journal

        journal_slug = request.query_params.get('journal')
        days = min(int(request.query_params.get('days', 90)), 365)
        since = timezone.now() - timedelta(days=days)

        if not journal_slug:
            return Response({'error': 'journal parameter required'}, status=400)

        try:
            journal = Journal.objects.get(slug=journal_slug, is_active=True)
        except Journal.DoesNotExist:
            return Response({'error': 'Journal not found'}, status=404)

        submissions = ManuscriptSubmission.objects.filter(
            journal=journal,
            submitted_at__gte=since
        ).exclude(review_report__isnull=True)

        # Aggregate issues from review reports
        issue_counts = {}
        severity_counts = {'critical': 0, 'major': 0, 'moderate': 0, 'minor': 0}

        for sub in submissions:
            report = sub.review_report or {}
            findings = report.get('findings', [])
            for finding in findings:
                category = finding.get('category', 'other')
                severity = finding.get('severity', 'minor')
                issue_counts[category] = issue_counts.get(category, 0) + 1
                if severity in severity_counts:
                    severity_counts[severity] += 1

        # Sort by frequency
        sorted_issues = sorted(issue_counts.items(), key=lambda x: x[1], reverse=True)

        return Response({
            'journal': journal.name,
            'period_days': days,
            'submissions_analyzed': submissions.count(),
            'top_issues': [
                {'category': cat, 'count': cnt, 'percentage': round(cnt / max(submissions.count(), 1) * 100, 1)}
                for cat, cnt in sorted_issues[:20]
            ],
            'severity_breakdown': severity_counts,
        })


class JournalAnalyticsTrendsView(APIView):
    """
    GET /api/v1/journal/analytics/trends/
    SQS score trends over time (weekly aggregates).
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from core.models import ManuscriptSubmission, Journal
        from django.db.models.functions import TruncWeek

        journal_slug = request.query_params.get('journal')
        days = min(int(request.query_params.get('days', 180)), 365)
        since = timezone.now() - timedelta(days=days)

        if not journal_slug:
            return Response({'error': 'journal parameter required'}, status=400)

        try:
            journal = Journal.objects.get(slug=journal_slug, is_active=True)
        except Journal.DoesNotExist:
            return Response({'error': 'Journal not found'}, status=404)

        weekly = (
            ManuscriptSubmission.objects.filter(
                journal=journal,
                submitted_at__gte=since,
                sqs_score__isnull=False
            )
            .annotate(week=TruncWeek('submitted_at'))
            .values('week')
            .annotate(
                avg_score=Avg('sqs_score'),
                count=Count('id')
            )
            .order_by('week')
        )

        return Response({
            'journal': journal.name,
            'period_days': days,
            'weekly_trends': [
                {
                    'week': entry['week'].isoformat(),
                    'avg_sqs_score': round(entry['avg_score'], 1),
                    'submission_count': entry['count'],
                }
                for entry in weekly
            ],
        })


class JournalAnalyticsComparisonView(APIView):
    """
    GET /api/v1/journal/analytics/comparison/
    Compare current period vs previous period.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from core.models import ManuscriptSubmission, Journal

        journal_slug = request.query_params.get('journal')
        days = min(int(request.query_params.get('days', 30)), 365)

        if not journal_slug:
            return Response({'error': 'journal parameter required'}, status=400)

        try:
            journal = Journal.objects.get(slug=journal_slug, is_active=True)
        except Journal.DoesNotExist:
            return Response({'error': 'Journal not found'}, status=404)

        now = timezone.now()
        current_start = now - timedelta(days=days)
        previous_start = current_start - timedelta(days=days)

        def period_stats(start, end):
            qs = ManuscriptSubmission.objects.filter(
                journal=journal,
                submitted_at__gte=start,
                submitted_at__lt=end
            )
            scored = qs.exclude(sqs_score__isnull=True)
            return {
                'submissions': qs.count(),
                'avg_sqs_score': round(scored.aggregate(avg=Avg('sqs_score'))['avg'] or 0, 1),
                'scored_count': scored.count(),
            }

        current = period_stats(current_start, now)
        previous = period_stats(previous_start, current_start)

        # Calculate deltas
        def delta(curr, prev):
            if prev == 0:
                return None
            return round((curr - prev) / prev * 100, 1)

        return Response({
            'journal': journal.name,
            'period_days': days,
            'current_period': current,
            'previous_period': previous,
            'changes': {
                'submissions_pct': delta(current['submissions'], previous['submissions']),
                'avg_score_pct': delta(current['avg_sqs_score'], previous['avg_sqs_score']),
            },
        })
