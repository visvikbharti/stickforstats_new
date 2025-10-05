"""
Celery tasks for SQC Analysis.

This module provides asynchronous task processing for the SQC Analysis module.
"""

import logging
import traceback
import pandas as pd
import numpy as np
from typing import Dict, Optional, Union, Any
from celery import shared_task
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from django.contrib.auth import get_user_model
from django.db import transaction

# from core.models import AnalysisSession, AnalysisResult, User  # Models don't exist yet
from typing import Any as AnalysisSession  # Placeholder type
from typing import Any as AnalysisResult  # Placeholder type
from typing import Any as User  # Placeholder type
from sqc_analysis.models import (
    ControlChartAnalysis, ProcessCapabilityAnalysis, 
    AcceptanceSamplingPlan, MeasurementSystemAnalysis
)
from sqc_analysis.services.control_charts import ControlChartService

User = get_user_model()
logger = logging.getLogger(__name__)
channel_layer = get_channel_layer()


@shared_task(bind=True, max_retries=3)
def process_control_chart_analysis(
    self, 
    session_id: str, 
    chart_type: str,
    parameter_column: str,
    user_id: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Process control chart analysis asynchronously.
    
    Args:
        session_id: ID of the analysis session
        chart_type: Type of control chart to generate
        parameter_column: Column containing the measurement data
        user_id: ID of the user who initiated the analysis
        **kwargs: Additional parameters for the analysis
    
    Returns:
        Dictionary with the analysis results
    """
    try:
        user = User.objects.get(id=user_id)
        session = AnalysisSession.objects.get(id=session_id, user=user)
        
        # Send initial progress update
        send_progress_update(user_id, session_id, 10, "Loading dataset...")
        
        # Load dataset from file
        dataset = session.dataset
        file_path = dataset.file.path
        
        try:
            # Load dataset into pandas DataFrame
            if dataset.file_type == 'csv':
                df = pd.read_csv(file_path, header=0 if dataset.has_header else None,
                                delimiter=dataset.delimiter)
            elif dataset.file_type == 'excel':
                df = pd.read_excel(file_path, header=0 if dataset.has_header else None)
            else:
                raise ValueError(f"Unsupported file type: {dataset.file_type}")
        except Exception as e:
            logger.error(f"Error loading dataset: {str(e)}")
            session.status = 'failed'
            session.save()
            return {
                'status': 'failed',
                'error': f"Error loading dataset: {str(e)}"
            }
        
        # Validate required columns
        if parameter_column not in df.columns:
            session.status = 'failed'
            session.save()
            return {
                'status': 'failed',
                'error': f"Column '{parameter_column}' not found in dataset."
            }
        
        grouping_column = kwargs.get('grouping_column')
        if grouping_column and grouping_column not in df.columns:
            session.status = 'failed'
            session.save()
            return {
                'status': 'failed',
                'error': f"Column '{grouping_column}' not found in dataset."
            }
        
        time_column = kwargs.get('time_column')
        if time_column and time_column not in df.columns:
            session.status = 'failed'
            session.save()
            return {
                'status': 'failed',
                'error': f"Column '{time_column}' not found in dataset."
            }
        
        # Send progress update
        send_progress_update(user_id, session_id, 30, "Preparing analysis...")
        
        # Create control chart service
        chart_service = ControlChartService()
        
        # Send progress update
        send_progress_update(user_id, session_id, 50, "Calculating control limits...")
        
        # Calculate control chart based on chart type
        try:
            if chart_type == 'xbar_r':
                result = chart_service.calculate_xbar_r_chart(
                    data=df,
                    value_column=parameter_column,
                    subgroup_column=grouping_column,
                    sample_size=kwargs.get('sample_size', 5),
                    detect_rules=kwargs.get('detect_rules', True),
                    rule_set=kwargs.get('rule_set', 'western_electric'),
                    custom_control_limits=kwargs.get('custom_control_limits')
                )
            elif chart_type == 'xbar_s':
                result = chart_service.calculate_xbar_s_chart(
                    data=df,
                    value_column=parameter_column,
                    subgroup_column=grouping_column,
                    sample_size=kwargs.get('sample_size', 5),
                    detect_rules=kwargs.get('detect_rules', True),
                    rule_set=kwargs.get('rule_set', 'western_electric'),
                    custom_control_limits=kwargs.get('custom_control_limits')
                )
            elif chart_type == 'i_mr':
                result = chart_service.calculate_i_mr_chart(
                    data=df,
                    value_column=parameter_column,
                    time_column=time_column,
                    detect_rules=kwargs.get('detect_rules', True),
                    rule_set=kwargs.get('rule_set', 'western_electric'),
                    custom_control_limits=kwargs.get('custom_control_limits')
                )
            elif chart_type == 'p':
                result = chart_service.calculate_p_chart(
                    data=df,
                    defective_column=parameter_column,
                    sample_size_column=grouping_column,
                    sample_size=kwargs.get('sample_size'),
                    detect_rules=kwargs.get('detect_rules', True),
                    rule_set=kwargs.get('rule_set', 'western_electric'),
                    custom_control_limits=kwargs.get('custom_control_limits')
                )
            else:
                raise ValueError(f"Unsupported chart type: {chart_type}")
        except Exception as e:
            logger.error(f"Error calculating control chart: {str(e)}")
            logger.error(traceback.format_exc())
            session.status = 'failed'
            session.save()
            return {
                'status': 'failed',
                'error': f"Error calculating control chart: {str(e)}"
            }
        
        # Send progress update
        send_progress_update(user_id, session_id, 70, "Storing analysis results...")
        
        # Save results to database
        try:
            with transaction.atomic():
                # Create analysis result
                analysis_result = AnalysisResult.objects.create(
                    session=session,
                    name=f"{chart_type.upper()} Chart Results",
                    analysis_type=f"control_chart_{chart_type}",
                    parameters=kwargs,
                    result_summary={
                        'center_line': result.center_line,
                        'upper_control_limit': result.upper_control_limit,
                        'lower_control_limit': result.lower_control_limit,
                        'has_violations': len(result.violations) > 0 if result.violations else False,
                        'process_statistics': result.process_statistics
                    },
                    result_detail={
                        'chart_type': result.chart_type,
                        'data_points': result.data_points,
                        'violations': result.violations,
                        'secondary_center_line': result.secondary_center_line,
                        'secondary_upper_control_limit': result.secondary_upper_control_limit,
                        'secondary_lower_control_limit': result.secondary_lower_control_limit,
                        'secondary_data_points': result.secondary_data_points,
                        'secondary_violations': result.secondary_violations
                    },
                    interpretation=result.chart_interpretation,
                    plot_data=result.plot_data
                )
                
                # Create control chart analysis
                control_chart = ControlChartAnalysis.objects.create(
                    analysis_session=session,
                    analysis_result=analysis_result,
                    chart_type=chart_type,
                    sample_size=kwargs.get('sample_size', 5),
                    variable_sample_size=(chart_type == 'p' and grouping_column is not None),
                    parameter_column=parameter_column,
                    grouping_column=grouping_column or '',
                    time_column=time_column or '',
                    use_custom_limits=kwargs.get('custom_control_limits') is not None,
                    upper_control_limit=result.upper_control_limit,
                    lower_control_limit=result.lower_control_limit,
                    center_line=result.center_line,
                    detect_rules=kwargs.get('detect_rules', True),
                    rule_set=kwargs.get('rule_set', 'western_electric'),
                    special_causes_detected=result.violations or []
                )
                
                # Update session status
                session.status = 'completed'
                session.save()
        except Exception as e:
            logger.error(f"Error saving analysis results: {str(e)}")
            logger.error(traceback.format_exc())
            session.status = 'failed'
            session.save()
            return {
                'status': 'failed',
                'error': f"Error saving analysis results: {str(e)}"
            }
        
        # Send progress update
        send_progress_update(user_id, session_id, 100, "Analysis complete!")
        
        # Send analysis complete notification
        send_analysis_complete(user_id, session_id, str(control_chart.id))
        
        # Create notification
        create_notification(
            user_id=user_id,
            title="Control Chart Analysis Completed",
            message=f"Your {chart_type.upper()} chart analysis '{session.name}' has been completed.",
            notification_type="success",
            related_object_type="ControlChartAnalysis",
            related_object_id=str(control_chart.id)
        )
        
        # Return analysis result
        return {
            'status': 'completed',
            'result': {
                'session_id': str(session.id),
                'analysis_id': str(analysis_result.id),
                'control_chart_id': str(control_chart.id)
            }
        }
        
    except Exception as e:
        logger.error(f"Unexpected error in process_control_chart_analysis: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Try to update session status if possible
        try:
            session = AnalysisSession.objects.get(id=session_id)
            session.status = 'failed'
            session.save()
        except Exception:
            pass
        
        # Retry the task or raise the exception
        if self.request.retries < self.max_retries:
            self.retry(exc=e, countdown=2 ** self.request.retries * 10)
        
        return {
            'status': 'failed',
            'error': f"Unexpected error: {str(e)}"
        }


def send_progress_update(user_id, session_id, progress, message):
    """Send progress update via WebSocket."""
    try:
        async_to_sync(channel_layer.group_send)(
            f"analysis_{user_id}",
            {
                'type': 'progress_update',
                'data': {
                    'session_id': session_id,
                    'progress': progress,
                    'message': message
                }
            }
        )
    except Exception as e:
        logger.error(f"Error sending progress update: {str(e)}")


def send_analysis_complete(user_id, session_id, result_id):
    """Send analysis complete notification via WebSocket."""
    try:
        async_to_sync(channel_layer.group_send)(
            f"analysis_{user_id}",
            {
                'type': 'analysis_complete',
                'data': {
                    'session_id': session_id,
                    'result_id': result_id,
                    'message': "Analysis completed successfully!"
                }
            }
        )
    except Exception as e:
        logger.error(f"Error sending analysis complete notification: {str(e)}")


@shared_task
def create_notification(user_id, title, message, notification_type="info", 
                       related_object_type=None, related_object_id=None):
    """Create a notification for a user."""
    try:
# from core.models import Notification  # Models don't exist yet
from typing import Any as Notification  # Placeholder type
        
        # Create notification
        user = User.objects.get(id=user_id)
        notification = Notification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            related_object_type=related_object_type,
            related_object_id=related_object_id
        )
        
        # Send notification via WebSocket
        async_to_sync(channel_layer.group_send)(
            f"notifications_{user_id}",
            {
                'type': 'notification',
                'notification': {
                    'id': str(notification.id),
                    'title': notification.title,
                    'message': notification.message,
                    'notification_type': notification.notification_type,
                    'related_object_type': notification.related_object_type,
                    'related_object_id': notification.related_object_id,
                    'created_at': notification.created_at.isoformat()
                }
            }
        )
        
        return str(notification.id)
    except Exception as e:
        logger.error(f"Error creating notification: {str(e)}")
        return None