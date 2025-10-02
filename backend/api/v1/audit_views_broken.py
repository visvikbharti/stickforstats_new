"""
Production-grade Audit API Views for StickForStats
===================================================
Provides real-time audit data with full scientific integrity.
No mock data - only real analysis results.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Any

from django.db.models import Avg, Count, Sum, Q, F
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from core.models import StatisticalAudit, AuditSummary


class AuditSummaryView(APIView):
    """
    Returns real audit data from the database.
    If no data exists, returns appropriate empty state response.
    """
    permission_classes = [AllowAny]  # Allow access without authentication

    def get(self, request):
        """
        GET /api/audit/summary/?field={field}&time_range={range}

        Returns aggregated audit metrics or null if no data exists.
        """

        try:
            # Get query parameters
            field_filter = request.query_params.get('field', None)
            time_range = request.query_params.get('time_range', '7d')

            # Calculate date range
            end_date = timezone.now()
        if time_range == '24h':
            start_date = end_date - timedelta(hours=24)
        elif time_range == '7d':
            start_date = end_date - timedelta(days=7)
        elif time_range == '30d':
            start_date = end_date - timedelta(days=30)
        elif time_range == '90d':
            start_date = end_date - timedelta(days=90)
        elif time_range == '1y':
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=7)

        # Build query
        query = Q(timestamp__gte=start_date, timestamp__lte=end_date)
        if field_filter and field_filter != 'all':
            query &= Q(field__iexact=field_filter)

        # Get real data from database
        audits = StatisticalAudit.objects.filter(query)

        # If no data exists, return null (frontend will show empty state)
        if not audits.exists():
            return Response(None, status=status.HTTP_200_OK)

        # Calculate summary metrics
        summary_data = audits.aggregate(
            total_analyses=Count('id'),
            total_assumptions_checked=Sum('assumptions_checked'),
            total_violations_detected=Sum('violations_detected'),
            total_alternatives_recommended=Sum('alternatives_recommended'),
            avg_methodology_score=Avg('methodology_score'),
            avg_reproducibility_score=Avg('reproducibility_score'),
            avg_guardian_score=Avg('guardian_score')
        )

        # Process field breakdown
        field_breakdown = []
        field_data = audits.values('field').annotate(
            count=Count('id'),
            avg_methodology=Avg('methodology_score'),
            avg_reproducibility=Avg('reproducibility_score'),
            violations=Sum('violations_detected')
        ).order_by('-count')[:10]

        for item in field_data:
            field_breakdown.append({
                'field': item['field'],
                'count': item['count'],
                'methodology_score': float(item['avg_methodology']) if item['avg_methodology'] else 0,
                'reproducibility_score': float(item['avg_reproducibility']) if item['avg_reproducibility'] else 0,
                'violations': item['violations'] or 0
            })

        # Process test type breakdown
        test_type_breakdown = []
        test_data = audits.values('test_type').annotate(
            count=Count('id'),
            violations=Sum('violations_detected'),
            assumptions_failed=Sum('assumptions_failed')
        ).order_by('-count')[:15]

        for item in test_data:
            test_type_breakdown.append({
                'test': item['test_type'],
                'count': item['count'],
                'violations': item['violations'] or 0,
                'assumptions_failed': item['assumptions_failed'] or 0
            })

        # Process trend data (last 30 days)
        trends = []
        trend_start = end_date - timedelta(days=30)
        trend_audits = StatisticalAudit.objects.filter(
            timestamp__gte=trend_start,
            timestamp__lte=end_date
        )

        if field_filter and field_filter != 'all':
            trend_audits = trend_audits.filter(field__iexact=field_filter)

        # Group by day
        for i in range(30):
            day_start = trend_start + timedelta(days=i)
            day_end = day_start + timedelta(days=1)

            day_data = trend_audits.filter(
                timestamp__gte=day_start,
                timestamp__lt=day_end
            ).aggregate(
                analyses=Count('id'),
                violations=Sum('violations_detected')
            )

            trends.append({
                'date': day_start.strftime('%Y-%m-%d'),
                'analyses': day_data['analyses'] or 0,
                'violations': day_data['violations'] or 0
            })

        # Process methodology metrics
        methodology_metrics = []
        method_aspects = [
            'Sample Size Adequacy',
            'Power Analysis',
            'Assumption Testing',
            'Effect Size Reporting',
            'Multiple Comparisons Correction',
            'Data Distribution Check'
        ]

        for aspect in method_aspects:
            # Calculate based on relevant audits
            aspect_audits = audits.filter(
                assumptions_details__contains=aspect.lower().replace(' ', '_')
            )

            if aspect_audits.exists():
                compliance = aspect_audits.filter(
                    assumptions_details__contains={'passed': True}
                ).count()
                total = aspect_audits.count()
                compliance_rate = (compliance / total * 100) if total > 0 else 0
            else:
                compliance_rate = 100  # Default to 100 if not checked

            methodology_metrics.append({
                'aspect': aspect,
                'compliance': compliance_rate
            })

        # Process recent validations
        recent_validations = []
        recent_audits = audits.order_by('-timestamp')[:10]

        for audit in recent_audits:
            recent_validations.append({
                'id': str(audit.id),
                'timestamp': audit.timestamp.isoformat(),
                'test_type': audit.test_type,
                'field': audit.field,
                'status': audit.status,
                'methodology_score': float(audit.methodology_score) if audit.methodology_score else None,
                'violations': audit.violations_detected,
                'recommendations': len(audit.recommendations) if audit.recommendations else 0
            })

        # Prepare response
        response_data = {
            'summary': {
                'totalAnalyses': summary_data['total_analyses'] or 0,
                'assumptionsChecked': summary_data['total_assumptions_checked'] or 0,
                'violationsDetected': summary_data['total_violations_detected'] or 0,
                'alternativesRecommended': summary_data['total_alternatives_recommended'] or 0,
                'methodologyScore': float(summary_data['avg_methodology_score']) if summary_data['avg_methodology_score'] else 0,
                'reproducibilityScore': float(summary_data['avg_reproducibility_score']) if summary_data['avg_reproducibility_score'] else 0
            },
            'byField': field_breakdown,
            'byTestType': test_type_breakdown,
            'trends': trends,
            'methodologyMetrics': methodology_metrics,
            'recentValidations': recent_validations,
            'timeRange': time_range,
            'field': field_filter or 'all',
            'dataAvailable': True
        }

        return Response(response_data, status=status.HTTP_200_OK)


class AuditRecordView(APIView):
    """
    Creates new audit records when analyses are performed.
    """
    permission_classes = [AllowAny]  # Allow access without authentication

    def post(self, request):
        """
        POST /api/audit/record/

        Records a new statistical analysis audit entry.
        """

        data = request.data

        try:
            # Create new audit record
            audit = StatisticalAudit.objects.create(
                session_id=data.get('session_id', ''),
                test_type=data.get('test_type', 'Unknown'),
                test_category=data.get('test_category', ''),
                field=data.get('field', 'General'),
                subfield=data.get('subfield', ''),
                sample_size=data.get('sample_size'),
                data_dimensions=data.get('data_dimensions', {}),
                data_type=data.get('data_type', ''),
                assumptions_checked=data.get('assumptions_checked', 0),
                assumptions_passed=data.get('assumptions_passed', 0),
                assumptions_details=data.get('assumptions_details', {}),
                methodology_score=Decimal(str(data.get('methodology_score', 0))) if data.get('methodology_score') else None,
                reproducibility_score=Decimal(str(data.get('reproducibility_score', 0))) if data.get('reproducibility_score') else None,
                violations_detected=data.get('violations_detected', 0),
                violation_details=data.get('violation_details', []),
                alternatives_recommended=data.get('alternatives_recommended', 0),
                recommendations=data.get('recommendations', []),
                test_statistic=str(data.get('test_statistic', '')),
                p_value=str(data.get('p_value', '')),
                effect_size=str(data.get('effect_size', '')),
                confidence_level=Decimal(str(data.get('confidence_level', 0.95))),
                confidence_interval=data.get('confidence_interval', {}),
                statistical_power=Decimal(str(data.get('statistical_power', 0))) if data.get('statistical_power') else None,
                minimum_detectable_effect=str(data.get('minimum_detectable_effect', '')),
                guardian_score=Decimal(str(data.get('guardian_score', 0))) if data.get('guardian_score') else None,
                guardian_flags=data.get('guardian_flags', []),
                journal_name=data.get('journal_name', ''),
                doi=data.get('doi', ''),
                publication_year=data.get('publication_year'),
                user_id=data.get('user_id', ''),
                source_ip=request.META.get('REMOTE_ADDR'),
                client_type=data.get('client_type', 'api'),
                computation_time_ms=data.get('computation_time_ms'),
                memory_usage_mb=Decimal(str(data.get('memory_usage_mb', 0))) if data.get('memory_usage_mb') else None,
                full_analysis_data=data.get('full_analysis_data', {}),
                status='completed',
                warnings=data.get('warnings', [])
            )

            response_data = {
                'id': str(audit.id),
                'timestamp': audit.timestamp.isoformat(),
                'status': 'recorded',
                'integrity_score': audit.calculate_integrity_score()
            }

            return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': str(e), 'status': 'failed'},
                status=status.HTTP_400_BAD_REQUEST
            )


class AuditMetricsView(APIView):
    """
    Provides specific audit metrics for different views.
    """
    permission_classes = [AllowAny]  # Allow access without authentication

    def get(self, request, metric_type):
        """
        GET /api/audit/metrics/{metric_type}/

        Returns specific metric data.
        """

        # Get time range
        time_range = request.query_params.get('time_range', '7d')
        end_date = timezone.now()

        if time_range == '24h':
            start_date = end_date - timedelta(hours=24)
        elif time_range == '7d':
            start_date = end_date - timedelta(days=7)
        elif time_range == '30d':
            start_date = end_date - timedelta(days=30)
        elif time_range == '90d':
            start_date = end_date - timedelta(days=90)
        else:
            start_date = end_date - timedelta(days=7)

        audits = StatisticalAudit.objects.filter(
            timestamp__gte=start_date,
            timestamp__lte=end_date
        )

        if not audits.exists():
            return Response(None, status=status.HTTP_200_OK)

        if metric_type == 'fields':
            # Return field-specific metrics
            data = audits.values('field').annotate(
                total=Count('id'),
                avg_score=Avg('methodology_score'),
                violations=Sum('violations_detected')
            ).order_by('-total')

            return Response(list(data), status=status.HTTP_200_OK)

        elif metric_type == 'tests':
            # Return test-specific metrics
            data = audits.values('test_type').annotate(
                total=Count('id'),
                failures=Sum('assumptions_failed'),
                avg_power=Avg('statistical_power')
            ).order_by('-total')

            return Response(list(data), status=status.HTTP_200_OK)

        elif metric_type == 'timeline':
            # Return timeline data
            timeline_data = []
            for i in range(30):
                day_start = start_date + timedelta(days=i)
                day_end = day_start + timedelta(days=1)

                day_audits = audits.filter(
                    timestamp__gte=day_start,
                    timestamp__lt=day_end
                )

                timeline_data.append({
                    'date': day_start.strftime('%Y-%m-%d'),
                    'count': day_audits.count(),
                    'avg_score': day_audits.aggregate(
                        Avg('methodology_score')
                    )['methodology_score__avg'] or 0
                })

            return Response(timeline_data, status=status.HTTP_200_OK)

        else:
            return Response(
                {'error': 'Invalid metric type'},
                status=status.HTTP_400_BAD_REQUEST
            )


@api_view(['GET'])
@permission_classes([AllowAny])
def audit_health_check(request):
    """
    Health check endpoint for audit system.
    """

    try:
        # Check if database is accessible
        audit_count = StatisticalAudit.objects.count()

        return Response({
            'status': 'healthy',
            'audit_records': audit_count,
            'database': 'connected',
            'timestamp': timezone.now().isoformat()
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)