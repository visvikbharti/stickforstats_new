"""
Report Management API Views

REST API endpoints for managing analysis reports.
Provides CRUD operations for storing, retrieving, and exporting analysis results.

@author StickForStats Team
@version 1.0.0
"""

from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
import uuid

from core.models import Analysis


class ReportListView(APIView):
    """
    List all reports or create a new report.

    GET: List all reports with pagination
    POST: Create a new report from analysis results
    """
    permission_classes = [AllowAny]

    def get(self, request):
        """List all reports."""
        try:
            # Get query parameters
            limit = int(request.query_params.get('limit', 50))
            offset = int(request.query_params.get('offset', 0))
            analysis_type = request.query_params.get('type', None)

            # Build query
            queryset = Analysis.objects.all()
            if analysis_type:
                queryset = queryset.filter(analysis_type=analysis_type)

            # Get total count before pagination
            total_count = queryset.count()

            # Apply pagination
            reports = queryset[offset:offset + limit]

            # Serialize
            results = []
            for report in reports:
                results.append({
                    'id': str(report.id),
                    'name': report.name,
                    'description': report.description,
                    'analysis_type': report.analysis_type,
                    'created_at': report.created_at.isoformat(),
                    'updated_at': report.updated_at.isoformat(),
                    'parameters': report.parameters,
                })

            return Response({
                'success': True,
                'results': results,
                'total': total_count,
                'limit': limit,
                'offset': offset,
            })

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        """Create a new report."""
        try:
            data = request.data

            # Validate required fields
            name = data.get('name')
            if not name:
                return Response({
                    'success': False,
                    'error': 'Report name is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Create report
            report = Analysis.objects.create(
                name=name,
                description=data.get('description', ''),
                analysis_type=data.get('analysis_type', 'general'),
                parameters=data.get('parameters', {}),
            )

            return Response({
                'success': True,
                'id': str(report.id),
                'name': report.name,
                'description': report.description,
                'analysis_type': report.analysis_type,
                'created_at': report.created_at.isoformat(),
                'message': 'Report created successfully'
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ReportDetailView(APIView):
    """
    Retrieve, update, or delete a single report.

    GET: Retrieve report details
    PUT: Update report
    DELETE: Delete report
    """
    permission_classes = [AllowAny]

    def get(self, request, report_id):
        """Get a single report by ID."""
        try:
            report = get_object_or_404(Analysis, id=report_id)

            return Response({
                'success': True,
                'id': str(report.id),
                'name': report.name,
                'description': report.description,
                'analysis_type': report.analysis_type,
                'created_at': report.created_at.isoformat(),
                'updated_at': report.updated_at.isoformat(),
                'parameters': report.parameters,
            })

        except Analysis.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Report not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request, report_id):
        """Update a report."""
        try:
            report = get_object_or_404(Analysis, id=report_id)
            data = request.data

            # Update fields
            if 'name' in data:
                report.name = data['name']
            if 'description' in data:
                report.description = data['description']
            if 'analysis_type' in data:
                report.analysis_type = data['analysis_type']
            if 'parameters' in data:
                report.parameters = data['parameters']

            report.save()

            return Response({
                'success': True,
                'id': str(report.id),
                'name': report.name,
                'message': 'Report updated successfully'
            })

        except Analysis.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Report not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, report_id):
        """Delete a report."""
        try:
            report = get_object_or_404(Analysis, id=report_id)
            report_name = report.name
            report.delete()

            return Response({
                'success': True,
                'message': f'Report "{report_name}" deleted successfully'
            })

        except Analysis.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Report not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def generate_report(request):
    """
    Generate a report from analysis data.

    Takes analysis results and creates a stored report.
    """
    try:
        data = request.data

        # Validate required fields
        name = data.get('name', f"Report_{timezone.now().strftime('%Y%m%d_%H%M%S')}")
        analysis_type = data.get('analysis_type', 'statistical_analysis')

        # Store the full analysis data in parameters
        parameters = {
            'results': data.get('results', {}),
            'settings': data.get('settings', {}),
            'metadata': {
                'generated_at': timezone.now().isoformat(),
                'format': data.get('format', 'json'),
                'version': '1.0'
            }
        }

        # Create the report
        report = Analysis.objects.create(
            name=name,
            description=data.get('description', f'{analysis_type} report'),
            analysis_type=analysis_type,
            parameters=parameters,
        )

        return Response({
            'success': True,
            'id': str(report.id),
            'name': report.name,
            'analysis_type': report.analysis_type,
            'created_at': report.created_at.isoformat(),
            'message': 'Report generated successfully'
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({
            'success': False,
            'error': f'Failed to generate report: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def export_report(request, report_id):
    """
    Export a report in the specified format.

    Supported formats: json, html (PDF/DOCX planned for future)
    """
    try:
        report = get_object_or_404(Analysis, id=report_id)
        export_format = request.query_params.get('format', 'json')

        if export_format == 'json':
            # Return full JSON data
            return Response({
                'success': True,
                'report': {
                    'id': str(report.id),
                    'name': report.name,
                    'description': report.description,
                    'analysis_type': report.analysis_type,
                    'created_at': report.created_at.isoformat(),
                    'updated_at': report.updated_at.isoformat(),
                    'data': report.parameters,
                },
                'export_format': 'json',
                'exported_at': timezone.now().isoformat()
            })

        elif export_format == 'html':
            # Generate basic HTML report
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>{report.name}</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 40px; }}
                    h1 {{ color: #333; }}
                    .meta {{ color: #666; font-size: 0.9em; }}
                    .section {{ margin: 20px 0; padding: 15px; background: #f5f5f5; }}
                    pre {{ background: #eee; padding: 10px; overflow-x: auto; }}
                </style>
            </head>
            <body>
                <h1>{report.name}</h1>
                <p class="meta">Analysis Type: {report.analysis_type}</p>
                <p class="meta">Created: {report.created_at.strftime('%Y-%m-%d %H:%M:%S')}</p>
                <div class="section">
                    <h2>Description</h2>
                    <p>{report.description or 'No description provided.'}</p>
                </div>
                <div class="section">
                    <h2>Results</h2>
                    <pre>{str(report.parameters)}</pre>
                </div>
                <footer>
                    <p class="meta">Generated by StickForStats</p>
                </footer>
            </body>
            </html>
            """

            from django.http import HttpResponse
            response = HttpResponse(html_content, content_type='text/html')
            response['Content-Disposition'] = f'attachment; filename="{report.name}.html"'
            return response

        else:
            return Response({
                'success': False,
                'error': f'Export format "{export_format}" not supported. Use "json" or "html".'
            }, status=status.HTTP_400_BAD_REQUEST)

    except Analysis.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Report not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
