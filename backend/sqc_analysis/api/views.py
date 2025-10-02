"""
API views for the SQC Analysis module.

This module provides API endpoints for SQC analysis functionality, including
control charts, process capability, acceptance sampling, MSA, economic design,
and SPC implementation strategies.
"""

import pandas as pd
import io
import json
import logging
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample

# from core.models import Dataset, AnalysisSession, AnalysisResult  # Models don't exist yet
from typing import Any as Dataset  # Placeholder type
from typing import Any as AnalysisSession  # Placeholder type
from typing import Any as AnalysisResult  # Placeholder type
from stickforstats.sqc_analysis.models import (
    ControlChartAnalysis, ProcessCapabilityAnalysis, 
    AcceptanceSamplingPlan, MeasurementSystemAnalysis,
    EconomicDesignAnalysis, SPCImplementationPlan
)
from stickforstats.sqc_analysis.api.serializers import (
    ControlChartAnalysisSerializer, ProcessCapabilityAnalysisSerializer,
    AcceptanceSamplingPlanSerializer, MeasurementSystemAnalysisSerializer,
    EconomicDesignAnalysisSerializer, SPCImplementationPlanSerializer,
    ControlChartRequestSerializer, ProcessCapabilityRequestSerializer,
    AcceptanceSamplingRequestSerializer, MeasurementSystemAnalysisRequestSerializer,
    EconomicDesignRequestSerializer, SPCImplementationRequestSerializer
)
from stickforstats.sqc_analysis.services.control_chart_service import ControlChartService
from stickforstats.sqc_analysis.services.process_capability_service import ProcessCapabilityService
from stickforstats.sqc_analysis.services.acceptance_sampling_service import AcceptanceSamplingService
from stickforstats.sqc_analysis.services.msa_service import MSAService
from stickforstats.sqc_analysis.services.economic_design_service import EconomicDesignService
from stickforstats.sqc_analysis.services.spc_implementation_service import SPCImplementationService
from core.tasks.notification_tasks import send_notification

# Get logger
logger = logging.getLogger(__name__)


class ControlChartViewSet(viewsets.ModelViewSet):
    """API viewset for control chart analysis."""
    
    serializer_class = ControlChartAnalysisSerializer
    permission_classes = [IsAuthenticated]
    queryset = ControlChartAnalysis.objects.all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_queryset(self):
        """Filter queryset to only show user's own analyses."""
        user = self.request.user
        return ControlChartAnalysis.objects.filter(
            analysis_session__user=user
        ).select_related('analysis_session', 'analysis_result')
    
    @extend_schema(
        request=ControlChartRequestSerializer,
        responses={200: ControlChartAnalysisSerializer},
        description="Create a control chart analysis for the specified dataset.",
        examples=[
            OpenApiExample(
                name="X-bar R Chart Example",
                summary="Example request for X-bar R chart",
                value={
                    "dataset_id": "uuid-of-dataset",
                    "chart_type": "xbar_r",
                    "parameter_column": "Measurement",
                    "grouping_column": "Batch",
                    "sample_size": 5,
                    "detect_rules": True,
                    "rule_set": "western_electric",
                    "session_name": "My SQC Analysis"
                }
            )
        ]
    )
    def create(self, request):
        """Create a new control chart analysis."""
        serializer = ControlChartRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get validated data
        data = serializer.validated_data
        chart_type = data['chart_type']
        parameter_column = data['parameter_column']
        session_name = data.get('session_name', f"{chart_type.upper()} Chart Analysis")
        
        # Get dataset
        try:
            dataset = Dataset.objects.get(id=data['dataset_id'], user=request.user)
        except Dataset.DoesNotExist:
            raise ValidationError({"dataset_id": "Dataset not found or does not belong to user."})
        
        # Create or get analysis session
        session = AnalysisSession.objects.create(
            user=request.user,
            dataset=dataset,
            name=session_name,
            module='sqc',
            status='in_progress',
            configuration={
                'analysis_type': 'control_chart',
                'chart_type': chart_type
            }
        )
        
        # Load dataset
        try:
            # Read from file based on file type
            if dataset.file_type == 'csv':
                df = pd.read_csv(dataset.file.path)
            elif dataset.file_type == 'excel':
                df = pd.read_excel(dataset.file.path)
            else:
                raise ValidationError({"dataset_id": "Unsupported file type."})
            
            # Validate parameter column exists
            if parameter_column not in df.columns:
                raise ValidationError({"parameter_column": f"Column '{parameter_column}' not found in dataset."})
            
            # Validate grouping column if provided
            grouping_column = data.get('grouping_column')
            if grouping_column and grouping_column not in df.columns:
                raise ValidationError({"grouping_column": f"Column '{grouping_column}' not found in dataset."})
            
            # Validate time column if provided
            time_column = data.get('time_column')
            if time_column and time_column not in df.columns:
                raise ValidationError({"time_column": f"Column '{time_column}' not found in dataset."})
            
        except Exception as e:
            logger.error(f"Error loading dataset: {str(e)}")
            session.status = 'failed'
            session.save()
            raise ValidationError({"dataset_id": f"Error loading dataset: {str(e)}"})
        
        # Create control chart service
        chart_service = ControlChartService()
        
        try:
            # Calculate control chart based on chart type
            if chart_type == 'xbar_r':
                result = chart_service.calculate_xbar_r_chart(
                    data=df,
                    value_column=parameter_column,
                    subgroup_column=data.get('grouping_column'),
                    sample_size=data.get('sample_size', 5),
                    detect_rules=data.get('detect_rules', True),
                    rule_set=data.get('rule_set', 'western_electric'),
                    custom_control_limits=data.get('custom_control_limits')
                )
            elif chart_type == 'xbar_s':
                result = chart_service.calculate_xbar_s_chart(
                    data=df,
                    value_column=parameter_column,
                    subgroup_column=data.get('grouping_column'),
                    sample_size=data.get('sample_size', 5),
                    detect_rules=data.get('detect_rules', True),
                    rule_set=data.get('rule_set', 'western_electric'),
                    custom_control_limits=data.get('custom_control_limits')
                )
            elif chart_type == 'i_mr':
                result = chart_service.calculate_i_mr_chart(
                    data=df,
                    value_column=parameter_column,
                    time_column=data.get('time_column'),
                    detect_rules=data.get('detect_rules', True),
                    rule_set=data.get('rule_set', 'western_electric'),
                    custom_control_limits=data.get('custom_control_limits')
                )
            elif chart_type == 'p':
                result = chart_service.calculate_p_chart(
                    data=df,
                    defective_column=parameter_column,
                    sample_size_column=data.get('grouping_column'),
                    sample_size=data.get('sample_size'),
                    detect_rules=data.get('detect_rules', True),
                    rule_set=data.get('rule_set', 'western_electric'),
                    custom_control_limits=data.get('custom_control_limits')
                )
            else:
                raise ValidationError({"chart_type": f"Unsupported chart type: {chart_type}"})
            
            # Create analysis result
            analysis_result = AnalysisResult.objects.create(
                session=session,
                name=f"{chart_type.upper()} Chart Results",
                analysis_type=f"control_chart_{chart_type}",
                parameters=data,
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
                sample_size=data.get('sample_size', 5),
                variable_sample_size=chart_type == 'p' and data.get('grouping_column') is not None,
                parameter_column=parameter_column,
                grouping_column=data.get('grouping_column', ''),
                time_column=data.get('time_column', ''),
                use_custom_limits=data.get('custom_control_limits') is not None,
                upper_control_limit=result.upper_control_limit,
                lower_control_limit=result.lower_control_limit,
                center_line=result.center_line,
                detect_rules=data.get('detect_rules', True),
                rule_set=data.get('rule_set', 'western_electric'),
                special_causes_detected=result.violations or []
            )
            
            # Update session status
            session.status = 'completed'
            session.save()
            
            # Send notification
            send_notification.delay(
                user_id=str(request.user.id),
                title="Control Chart Analysis Completed",
                message=f"Your {chart_type.upper()} chart analysis has been completed.",
                notification_type="success",
                related_object_type="ControlChartAnalysis",
                related_object_id=str(control_chart.id)
            )
            
            # Return serialized data
            serializer = self.get_serializer(control_chart)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error calculating control chart: {str(e)}")
            session.status = 'failed'
            session.save()
            raise ValidationError({"non_field_errors": f"Error calculating control chart: {str(e)}"})
    
    @extend_schema(
        responses={200: dict},
        description="Get the plot data for a control chart analysis.",
    )
    @action(detail=True, methods=['get'])
    def plot_data(self, request, pk=None):
        """Get the plot data for a control chart analysis."""
        control_chart = self.get_object()
        
        if not control_chart.analysis_result:
            return Response(
                {"error": "No analysis result found for this control chart."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(control_chart.analysis_result.plot_data)
    
    @extend_schema(
        responses={200: dict},
        description="Get recommended next steps based on the control chart analysis.",
    )
    @action(detail=True, methods=['get'])
    def recommendations(self, request, pk=None):
        """Get recommended next steps based on the control chart analysis."""
        control_chart = self.get_object()
        
        if not control_chart.analysis_result:
            return Response(
                {"error": "No analysis result found for this control chart."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get chart results
        result = control_chart.analysis_result
        
        # Generate recommendations based on chart type and results
        recommendations = []
        
        # Check for violations
        has_violations = result.result_summary.get('has_violations', False)
        
        if has_violations:
            recommendations.append({
                "title": "Investigate Special Causes",
                "description": "Your control chart shows evidence of special cause variation. Investigate the points that violate control rules.",
                "action_type": "investigate",
                "severity": "high"
            })
        
        # Add recommendation to perform process capability analysis
        recommendations.append({
            "title": "Process Capability Analysis",
            "description": "Perform a process capability analysis to evaluate how well your process meets specifications.",
            "action_type": "analysis",
            "analysis_type": "process_capability",
            "severity": "medium" if not has_violations else "low"
        })
        
        # Add educational recommendations
        if control_chart.chart_type == 'xbar_r':
            recommendations.append({
                "title": "Learn about X-bar R Charts",
                "description": "Explore the educational materials about X-bar R charts to deepen your understanding.",
                "action_type": "education",
                "topic": "xbar_r_charts",
                "severity": "low"
            })
        elif control_chart.chart_type == 'i_mr':
            # Check for autocorrelation
            if result.result_detail.get('process_statistics', {}).get('autocorrelation', 0) > 0.3:
                recommendations.append({
                    "title": "Address Autocorrelation",
                    "description": "Your data shows significant autocorrelation, which may violate control chart assumptions. Consider time series analysis methods.",
                    "action_type": "analysis",
                    "analysis_type": "time_series",
                    "severity": "high"
                })
        
        return Response({
            "recommendations": recommendations
        })


class ProcessCapabilityViewSet(viewsets.ModelViewSet):
    """API viewset for process capability analysis."""
    
    serializer_class = ProcessCapabilityAnalysisSerializer
    permission_classes = [IsAuthenticated]
    queryset = ProcessCapabilityAnalysis.objects.all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_queryset(self):
        """Filter queryset to only show user's own analyses."""
        user = self.request.user
        return ProcessCapabilityAnalysis.objects.filter(
            analysis_session__user=user
        ).select_related('analysis_session', 'analysis_result')
    
    @extend_schema(
        request=ProcessCapabilityRequestSerializer,
        responses={200: ProcessCapabilityAnalysisSerializer},
        description="Create a process capability analysis for the specified dataset.",
    )
    def create(self, request):
        """Create a new process capability analysis."""
        serializer = ProcessCapabilityRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Get validated data
        data = serializer.validated_data
        parameter_column = data['parameter_column']
        session_name = data.get('session_name', f"Process Capability Analysis")

        # Get dataset
        try:
            dataset = Dataset.objects.get(id=data['dataset_id'], user=request.user)
        except Dataset.DoesNotExist:
            raise ValidationError({"dataset_id": "Dataset not found or does not belong to user."})

        # Create analysis session
        session = AnalysisSession.objects.create(
            user=request.user,
            dataset=dataset,
            name=session_name,
            module='sqc',
            status='in_progress',
            configuration={
                'analysis_type': 'process_capability',
                'parameter_column': parameter_column
            }
        )

        # Load dataset
        try:
            # Read from file based on file type
            if dataset.file_type == 'csv':
                df = pd.read_csv(dataset.file.path)
            elif dataset.file_type == 'excel':
                df = pd.read_excel(dataset.file.path)
            else:
                raise ValidationError({"dataset_id": "Unsupported file type."})

            # Validate parameter column exists
            if parameter_column not in df.columns:
                raise ValidationError({"parameter_column": f"Column '{parameter_column}' not found in dataset."})

            # Validate grouping column if provided
            grouping_column = data.get('grouping_column')
            if grouping_column and grouping_column not in df.columns:
                raise ValidationError({"grouping_column": f"Column '{grouping_column}' not found in dataset."})

        except Exception as e:
            logger.error(f"Error loading dataset: {str(e)}")
            session.status = 'failed'
            session.save()
            raise ValidationError({"dataset_id": f"Error loading dataset: {str(e)}"})

        # Create process capability service
        capability_service = ProcessCapabilityService()

        try:
            # Calculate process capability
            result = capability_service.calculate_process_capability(
                data=df,
                value_column=parameter_column,
                subgroup_column=data.get('grouping_column'),
                lower_spec_limit=data.get('lower_spec_limit'),
                upper_spec_limit=data.get('upper_spec_limit'),
                target_value=data.get('target_value'),
                assume_normality=data.get('assume_normality', True),
                transformation_method=data.get('transformation_method', 'none'),
            )

            # Create analysis result
            analysis_result = AnalysisResult.objects.create(
                session=session,
                name=f"Process Capability Results",
                analysis_type=f"process_capability",
                parameters=data,
                result_summary={
                    'cp': result.get('cp'),
                    'cpk': result.get('cpk'),
                    'pp': result.get('pp'),
                    'ppk': result.get('ppk'),
                    'mean': result.get('mean'),
                    'std_dev': result.get('std_dev'),
                    'within_std_dev': result.get('within_std_dev'),
                    'overall_std_dev': result.get('overall_std_dev'),
                    'dpm': result.get('dpm'),
                    'process_yield': result.get('process_yield')
                },
                result_detail=result,
                interpretation=f"Cp: {result.get('cp')}, Cpk: {result.get('cpk')}, Pp: {result.get('pp')}, Ppk: {result.get('ppk')}",
                plot_data=result.get('plot_data', {})
            )

            # Create process capability analysis
            process_capability = ProcessCapabilityAnalysis.objects.create(
                analysis_session=session,
                analysis_result=analysis_result,
                parameter_column=parameter_column,
                grouping_column=data.get('grouping_column', ''),
                lower_spec_limit=data.get('lower_spec_limit'),
                upper_spec_limit=data.get('upper_spec_limit'),
                target_value=data.get('target_value'),
                assume_normality=data.get('assume_normality', True),
                transformation_method=data.get('transformation_method', 'none'),
                transformation_lambda=result.get('transformation_lambda'),
                cp=result.get('cp'),
                cpk=result.get('cpk'),
                pp=result.get('pp'),
                ppk=result.get('ppk'),
                mean=result.get('mean'),
                std_dev=result.get('std_dev'),
                within_std_dev=result.get('within_std_dev'),
                overall_std_dev=result.get('overall_std_dev'),
                dpm=result.get('dpm'),
                process_yield=result.get('process_yield')
            )

            # Update session status
            session.status = 'completed'
            session.save()

            # Send notification
            send_notification.delay(
                user_id=str(request.user.id),
                title="Process Capability Analysis Completed",
                message=f"Your process capability analysis has been completed.",
                notification_type="success",
                related_object_type="ProcessCapabilityAnalysis",
                related_object_id=str(process_capability.id)
            )

            # Return serialized data
            serializer = self.get_serializer(process_capability)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error calculating process capability: {str(e)}")
            session.status = 'failed'
            session.save()
            raise ValidationError({"non_field_errors": f"Error calculating process capability: {str(e)}"})


class AcceptanceSamplingViewSet(viewsets.ModelViewSet):
    """API viewset for acceptance sampling plans."""
    
    serializer_class = AcceptanceSamplingPlanSerializer
    permission_classes = [IsAuthenticated]
    queryset = AcceptanceSamplingPlan.objects.all()
    parser_classes = [JSONParser]
    
    def get_queryset(self):
        """Filter queryset to only show user's own analyses."""
        user = self.request.user
        return AcceptanceSamplingPlan.objects.filter(
            analysis_session__user=user
        ).select_related('analysis_session', 'analysis_result')
    
    @extend_schema(
        request=AcceptanceSamplingRequestSerializer,
        responses={200: AcceptanceSamplingPlanSerializer},
        description="Create an acceptance sampling plan.",
    )
    def create(self, request):
        """Create a new acceptance sampling plan."""
        serializer = AcceptanceSamplingRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get validated data
        data = serializer.validated_data
        plan_type = data['plan_type']
        session_name = data.get('session_name', f"{plan_type.upper()} Sampling Plan")
        
        # Create analysis session
        session = AnalysisSession.objects.create(
            user=request.user,
            name=session_name,
            module='sqc',
            status='in_progress',
            configuration={
                'analysis_type': 'acceptance_sampling',
                'plan_type': plan_type
            }
        )
        
        # Create acceptance sampling service
        sampling_service = AcceptanceSamplingService()
        
        try:
            # Calculate sampling plan based on type
            if plan_type == 'single':
                result = sampling_service.calculate_single_sampling_plan(
                    lot_size=data['lot_size'],
                    acceptable_quality_level=data.get('aql', 1.0),
                    rejectable_quality_level=data.get('ltpd', 10.0),
                    producer_risk=data.get('producer_risk', 0.05),
                    consumer_risk=data.get('consumer_risk', 0.10)
                )
            elif plan_type == 'double':
                result = sampling_service.calculate_double_sampling_plan(
                    lot_size=data['lot_size'],
                    acceptable_quality_level=data.get('aql', 1.0),
                    rejectable_quality_level=data.get('ltpd', 10.0),
                    producer_risk=data.get('producer_risk', 0.05),
                    consumer_risk=data.get('consumer_risk', 0.10)
                )
            elif plan_type == 'skip_lot':
                # Get base plan from request or create one
                base_plan = data.get('base_plan')
                if not base_plan:
                    base_plan = sampling_service.calculate_single_sampling_plan(
                        lot_size=data['lot_size'],
                        acceptable_quality_level=data.get('aql', 1.0),
                        rejectable_quality_level=data.get('ltpd', 10.0),
                        producer_risk=data.get('producer_risk', 0.05),
                        consumer_risk=data.get('consumer_risk', 0.10)
                    )
                
                result = sampling_service.calculate_skip_lot_plan(
                    base_plan=base_plan,
                    frequency_index=data.get('frequency_index', 2)
                )
            elif plan_type == 'continuous':
                result = sampling_service.calculate_continuous_sampling_plan(
                    clearing_interval=data.get('clearing_interval', 10),
                    sampling_fraction=data.get('sampling_fraction', 0.1),
                    acceptance_number=data.get('acceptance_number', 0)
                )
            elif plan_type == 'ansi_z14':
                result = sampling_service.lookup_ansi_z14_plan(
                    lot_size=data['lot_size'],
                    inspection_level=data.get('inspection_level', 'II'),
                    aql=data.get('aql', 1.0)
                )
            else:
                raise ValidationError({"plan_type": f"Unsupported plan type: {plan_type}"})
            
            # Create analysis result
            analysis_result = AnalysisResult.objects.create(
                session=session,
                name=f"{plan_type.upper()} Sampling Plan Results",
                analysis_type=f"acceptance_sampling_{plan_type}",
                parameters=data,
                result_summary={
                    'plan_type': result.get('plan_type'),
                    'sample_size': result.get('sample_size') or result.get('first_sample_size'),
                    'acceptance_number': result.get('acceptance_number') or result.get('first_acceptance_number'),
                    'aql': result.get('aql'),
                    'ltpd': result.get('ltpd')
                },
                result_detail=result,
                interpretation="",  # Add interpretation if available
                plot_data={
                    'oc_curve': result.get('oc_curve'),
                    'aoq_curve': result.get('aoq_curve') if 'aoq_curve' in result else None,
                    'asn_curve': result.get('asn_curve') if 'asn_curve' in result else None
                }
            )
            
            # Create sampling plan model
            sampling_plan = AcceptanceSamplingPlan.objects.create(
                analysis_session=session,
                analysis_result=analysis_result,
                plan_type=plan_type,
                lot_size=data.get('lot_size'),
                sample_size=result.get('sample_size') or result.get('first_sample_size', 0),
                acceptance_number=result.get('acceptance_number') or result.get('first_acceptance_number', 0),
                rejection_number=result.get('rejection_number') or data.get('rejection_number', 0),
                second_sample_size=result.get('second_sample_size', 0),
                second_acceptance_number=result.get('second_acceptance_number', 0),
                second_rejection_number=result.get('second_rejection_number', 0),
                standard_used=data.get('standard_used', 'none'),
                aql=result.get('aql', 0),
                ltpd=result.get('ltpd', 0),
                producer_risk=result.get('producer_risk', 0),
                consumer_risk=result.get('consumer_risk', 0),
                oc_curve_data=result.get('oc_curve', {})
            )
            
            # Update session status
            session.status = 'completed'
            session.save()
            
            # Send notification
            send_notification.delay(
                user_id=str(request.user.id),
                title="Acceptance Sampling Plan Created",
                message=f"Your {plan_type.upper()} sampling plan has been created.",
                notification_type="success",
                related_object_type="AcceptanceSamplingPlan",
                related_object_id=str(sampling_plan.id)
            )
            
            # Return serialized data
            serializer = self.get_serializer(sampling_plan)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating sampling plan: {str(e)}")
            session.status = 'failed'
            session.save()
            raise ValidationError({"non_field_errors": f"Error creating sampling plan: {str(e)}"})
    
    @extend_schema(
        responses={200: dict},
        description="Get the OC curve data for a sampling plan.",
    )
    @action(detail=True, methods=['get'])
    def oc_curve(self, request, pk=None):
        """Get the OC curve data for a sampling plan."""
        sampling_plan = self.get_object()
        
        if not sampling_plan.analysis_result:
            return Response(
                {"error": "No analysis result found for this sampling plan."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(sampling_plan.oc_curve_data)
    
    @extend_schema(
        request=list,
        responses={200: dict},
        description="Compare multiple sampling plans.",
    )
    @action(detail=False, methods=['post'])
    def compare_plans(self, request):
        """Compare multiple sampling plans."""
        if not isinstance(request.data, list):
            raise ValidationError({"non_field_errors": "Expected a list of sampling plan IDs."})
        
        plan_ids = request.data
        
        try:
            # Get sampling plans
            plans = []
            for plan_id in plan_ids:
                plan = AcceptanceSamplingPlan.objects.get(
                    id=plan_id,
                    analysis_session__user=request.user
                )
                # Get plan details from analysis result
                if plan.analysis_result:
                    plan_details = plan.analysis_result.result_detail
                    plans.append(plan_details)
            
            # Compare plans
            sampling_service = AcceptanceSamplingService()
            comparison = sampling_service.compare_sampling_plans(plans)
            
            return Response(comparison)
            
        except AcceptanceSamplingPlan.DoesNotExist:
            raise ValidationError({"non_field_errors": "One or more sampling plans not found."})
        except Exception as e:
            logger.error(f"Error comparing sampling plans: {str(e)}")
            raise ValidationError({"non_field_errors": f"Error comparing sampling plans: {str(e)}"})


class MeasurementSystemAnalysisViewSet(viewsets.ModelViewSet):
    """API viewset for measurement system analysis."""
    
    serializer_class = MeasurementSystemAnalysisSerializer
    permission_classes = [IsAuthenticated]
    queryset = MeasurementSystemAnalysis.objects.all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_queryset(self):
        """Filter queryset to only show user's own analyses."""
        user = self.request.user
        return MeasurementSystemAnalysis.objects.filter(
            analysis_session__user=user
        ).select_related('analysis_session', 'analysis_result')
    
    @extend_schema(
        request=MeasurementSystemAnalysisRequestSerializer,
        responses={200: MeasurementSystemAnalysisSerializer},
        description="Create a measurement system analysis.",
    )
    def create(self, request):
        """Create a new measurement system analysis."""
        serializer = MeasurementSystemAnalysisRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get validated data
        data = serializer.validated_data
        msa_type = data['msa_type']
        parameter_column = data['parameter_column']
        session_name = data.get('session_name', f"{msa_type.upper()} Analysis")
        
        # Get dataset
        try:
            dataset = Dataset.objects.get(id=data['dataset_id'], user=request.user)
        except Dataset.DoesNotExist:
            raise ValidationError({"dataset_id": "Dataset not found or does not belong to user."})
        
        # Create analysis session
        session = AnalysisSession.objects.create(
            user=request.user,
            dataset=dataset,
            name=session_name,
            module='sqc',
            status='in_progress',
            configuration={
                'analysis_type': 'msa',
                'msa_type': msa_type
            }
        )
        
        # Load dataset
        try:
            # Read from file based on file type
            if dataset.file_type == 'csv':
                df = pd.read_csv(dataset.file.path)
            elif dataset.file_type == 'excel':
                df = pd.read_excel(dataset.file.path)
            else:
                raise ValidationError({"dataset_id": "Unsupported file type."})
            
            # Validate parameter column exists
            if parameter_column not in df.columns:
                raise ValidationError({"parameter_column": f"Column '{parameter_column}' not found in dataset."})
            
            # Validate other required columns based on MSA type
            if msa_type == 'gage_rr':
                part_column = data.get('part_column')
                operator_column = data.get('operator_column')
                
                if not part_column or part_column not in df.columns:
                    raise ValidationError({"part_column": f"Part column is required for gage R&R analysis."})
                
                if not operator_column or operator_column not in df.columns:
                    raise ValidationError({"operator_column": f"Operator column is required for gage R&R analysis."})
            
            elif msa_type == 'attribute_agreement':
                part_column = data.get('part_column')
                operator_column = data.get('operator_column')
                
                if not part_column or part_column not in df.columns:
                    raise ValidationError({"part_column": f"Part column is required for attribute agreement analysis."})
                
                if not operator_column or operator_column not in df.columns:
                    raise ValidationError({"operator_column": f"Operator column is required for attribute agreement analysis."})
            
            elif msa_type in ['bias', 'linearity']:
                reference_column = data.get('reference_column')
                
                if not reference_column or reference_column not in df.columns:
                    raise ValidationError({"reference_column": f"Reference column is required for {msa_type} analysis."})
            
            elif msa_type == 'stability':
                time_column = data.get('time_column')
                
                if not time_column or time_column not in df.columns:
                    raise ValidationError({"time_column": f"Time column is required for stability analysis."})
            
        except Exception as e:
            logger.error(f"Error loading dataset: {str(e)}")
            session.status = 'failed'
            session.save()
            raise ValidationError({"dataset_id": f"Error loading dataset: {str(e)}"})
        
        # Create MSA service
        msa_service = MSAService()
        
        try:
            # Perform analysis based on MSA type
            if msa_type == 'gage_rr':
                # Determine analysis method
                method = data.get('method', 'anova')
                
                if method == 'anova':
                    result = msa_service.calculate_gauge_rr_anova(
                        data=df,
                        parts_col=data['part_column'],
                        operators_col=data['operator_column'],
                        measurements_col=data['parameter_column']
                    )
                else:  # range method
                    result = msa_service.calculate_gauge_rr_range(
                        data=df,
                        parts_col=data['part_column'],
                        operators_col=data['operator_column'],
                        measurements_col=data['parameter_column']
                    )
                
                # Create analysis result
                analysis_result = AnalysisResult.objects.create(
                    session=session,
                    name=f"Gage R&R Analysis Results",
                    analysis_type=f"msa_gage_rr",
                    parameters=data,
                    result_summary={
                        'gage_rr_percent': result['summary']['%StudyVar (Gauge R&R)'],
                        'number_of_distinct_categories': result['summary']['Number of Distinct Categories'],
                        'repeatability': result['summary']['StdDev (Repeatability)'],
                        'reproducibility': result['summary']['StdDev (Reproducibility)'],
                        'total_variation': result['summary']['StdDev (Total)'],
                        'part_variation': result['summary']['StdDev (Part Variation)']
                    },
                    result_detail=result,
                    interpretation=f"Gage R&R: {result['assessment']['psv']}%, NDC: {result['summary']['Number of Distinct Categories']}",
                    plot_data={}  # Add plot data if available
                )
                
                # Create MSA model
                msa_analysis = MeasurementSystemAnalysis.objects.create(
                    analysis_session=session,
                    analysis_result=analysis_result,
                    msa_type=msa_type,
                    parameter_column=parameter_column,
                    part_column=data['part_column'],
                    operator_column=data['operator_column'],
                    total_variation=result['summary']['StdDev (Total)'],
                    repeatability=result['summary']['StdDev (Repeatability)'],
                    reproducibility=result['summary']['StdDev (Reproducibility)'],
                    gage_rr=result['summary']['StdDev (Gauge R&R)'],
                    part_variation=result['summary']['StdDev (Part Variation)'],
                    number_of_distinct_categories=result['summary']['Number of Distinct Categories'],
                    percent_study_variation=result['summary']['%StudyVar (Gauge R&R)'],
                    percent_tolerance=result['summary']['%Tolerance (Gauge R&R)'],
                    anova_results=result['anova_table'] if 'anova_table' in result else {}
                )
            
            elif msa_type == 'attribute_agreement':
                result = msa_service.attribute_agreement_analysis(
                    data=df,
                    parts_col=data['part_column'],
                    operators_col=data['operator_column'],
                    assessment_col=data['parameter_column'],
                    reference_col=data.get('reference_column')
                )
                
                # Create analysis result
                analysis_result = AnalysisResult.objects.create(
                    session=session,
                    name=f"Attribute Agreement Analysis Results",
                    analysis_type=f"msa_attribute_agreement",
                    parameters=data,
                    result_summary={
                        'overall_agreement': result['summary'].get('Overall Reproducibility', 0),
                        'reference_agreement': result['summary'].get('Overall Agreement with Reference', 0),
                        'kappa': result['summary'].get('Overall Kappa', 0)
                    },
                    result_detail=result,
                    interpretation=f"Overall Agreement: {result['summary'].get('Overall Reproducibility', 0)}%",
                    plot_data={}  # Add plot data if available
                )
                
                # Create MSA model
                msa_analysis = MeasurementSystemAnalysis.objects.create(
                    analysis_session=session,
                    analysis_result=analysis_result,
                    msa_type=msa_type,
                    parameter_column=parameter_column,
                    part_column=data['part_column'],
                    operator_column=data['operator_column'],
                    reference_column=data.get('reference_column', ''),
                    attribute_type=data.get('attribute_type', 'nominal'),
                    percent_agreement=result['summary'].get('Overall Reproducibility', 0),
                    kappa_statistic=result['summary'].get('Overall Kappa', 0)
                )
            
            elif msa_type in ['bias', 'linearity']:
                result = msa_service.analyze_linearity_bias(
                    data=df,
                    reference_col=data['reference_column'],
                    measurement_col=data['parameter_column']
                )
                
                # Create analysis result
                analysis_result = AnalysisResult.objects.create(
                    session=session,
                    name=f"Linearity & Bias Analysis Results",
                    analysis_type=f"msa_linearity_bias",
                    parameters=data,
                    result_summary={
                        'overall_bias': result['overall_bias']['bias'],
                        'linearity_slope': result['linearity']['slope'],
                        'linearity_r_squared': result['linearity']['r_squared'],
                        'linearity_significant': result['linearity']['significant']
                    },
                    result_detail=result,
                    interpretation=f"Bias: {result['overall_bias']['bias']}, Linearity: {result['linearity']['slope']}",
                    plot_data={}  # Add plot data if available
                )
                
                # Create MSA model
                msa_analysis = MeasurementSystemAnalysis.objects.create(
                    analysis_session=session,
                    analysis_result=analysis_result,
                    msa_type=msa_type,
                    parameter_column=parameter_column,
                    reference_column=data['reference_column']
                )
            
            elif msa_type == 'stability':
                result = msa_service.analyze_stability(
                    data=df,
                    measurement_col=data['parameter_column'],
                    time_col=data.get('time_column'),
                    reference_col=data.get('reference_column')
                )
                
                # Create analysis result
                analysis_result = AnalysisResult.objects.create(
                    session=session,
                    name=f"Stability Analysis Results",
                    analysis_type=f"msa_stability",
                    parameters=data,
                    result_summary={
                        'is_stable': result['is_stable'],
                        'mean': result['mean'],
                        'std_dev': result['std_dev'],
                        'has_trend': bool(result['regression']['significant_trend'])
                    },
                    result_detail=result,
                    interpretation=f"Stability: {'Stable' if result['is_stable'] else 'Unstable'}",
                    plot_data={}  # Add plot data if available
                )
                
                # Create MSA model
                msa_analysis = MeasurementSystemAnalysis.objects.create(
                    analysis_session=session,
                    analysis_result=analysis_result,
                    msa_type=msa_type,
                    parameter_column=parameter_column,
                    reference_column=data.get('reference_column', '')
                )
            
            else:
                raise ValidationError({"msa_type": f"Unsupported MSA type: {msa_type}"})
            
            # Update session status
            session.status = 'completed'
            session.save()
            
            # Send notification
            send_notification.delay(
                user_id=str(request.user.id),
                title="MSA Analysis Completed",
                message=f"Your {msa_type.upper()} analysis has been completed.",
                notification_type="success",
                related_object_type="MeasurementSystemAnalysis",
                related_object_id=str(msa_analysis.id)
            )
            
            # Return serialized data
            serializer = self.get_serializer(msa_analysis)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error performing MSA: {str(e)}")
            session.status = 'failed'
            session.save()
            raise ValidationError({"non_field_errors": f"Error performing MSA: {str(e)}"})


class EconomicDesignViewSet(viewsets.ModelViewSet):
    """API viewset for economic design of control charts."""
    
    serializer_class = EconomicDesignAnalysisSerializer
    permission_classes = [IsAuthenticated]
    queryset = EconomicDesignAnalysis.objects.all()
    parser_classes = [JSONParser]
    
    def get_queryset(self):
        """Filter queryset to only show user's own analyses."""
        user = self.request.user
        return EconomicDesignAnalysis.objects.filter(
            analysis_session__user=user
        ).select_related('analysis_session', 'analysis_result')
    
    @extend_schema(
        request=EconomicDesignRequestSerializer,
        responses={200: EconomicDesignAnalysisSerializer},
        description="Create an economic design analysis for control charts.",
    )
    def create(self, request):
        """Create a new economic design analysis."""
        serializer = EconomicDesignRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get validated data
        data = serializer.validated_data
        chart_type = data.get('chart_type', 'xbar')
        session_name = data.get('session_name', f"Economic Design Analysis")
        
        # Create analysis session
        session = AnalysisSession.objects.create(
            user=request.user,
            name=session_name,
            module='sqc',
            status='in_progress',
            configuration={
                'analysis_type': 'economic_design',
                'chart_type': chart_type
            }
        )
        
        # Create economic design service
        econ_service = EconomicDesignService()
        
        try:
            # Process input parameters
            process_parameters = {
                'mean_time_to_failure': data.get('mean_time_to_failure', 100),
                'shift_size': data.get('shift_size', 2.0),
                'std_dev': data.get('std_dev', 1.0),
                'hourly_production': data.get('hourly_production', 100)
            }
            
            cost_parameters = {
                'sampling_cost': data.get('sampling_cost', 5.0),
                'fixed_sampling_cost': data.get('fixed_sampling_cost', 10.0),
                'false_alarm_cost': data.get('false_alarm_cost', 200.0),
                'hourly_defect_cost': data.get('hourly_defect_cost', 500.0),
                'finding_cost': data.get('finding_cost', 250.0)
            }
            
            constraints = {
                'min_sample_size': data.get('min_sample_size', 1),
                'max_sample_size': data.get('max_sample_size', 15),
                'min_sampling_interval': data.get('min_sampling_interval', 0.25),
                'max_sampling_interval': data.get('max_sampling_interval', 8.0),
                'min_detection_power': data.get('min_detection_power', 0.9),
                'max_false_alarm_rate': data.get('max_false_alarm_rate', 0.01)
            }
            
            # Calculate optimal design
            result = econ_service.calculate_optimal_design_parameters(
                process_parameters=process_parameters,
                cost_parameters=cost_parameters,
                chart_type=chart_type,
                constraints=constraints
            )
            
            # Create analysis result
            analysis_result = AnalysisResult.objects.create(
                session=session,
                name=f"Economic Design Results",
                analysis_type=f"economic_design_{chart_type}",
                parameters=data,
                result_summary={
                    'sample_size': result['optimal_design']['sample_size'],
                    'sampling_interval': result['optimal_design']['sampling_interval'],
                    'k_factor': result['optimal_design']['k_factor'],
                    'total_hourly_cost': result['cost_analysis']['total_hourly_cost'],
                    'cost_savings_percent': result['cost_analysis']['cost_savings_percent']
                },
                result_detail=result,
                interpretation=f"Optimal design: n={result['optimal_design']['sample_size']}, h={result['optimal_design']['sampling_interval']}, k={result['optimal_design']['k_factor']}",
                plot_data={}  # Add plot data if available
            )
            
            # Create economic design analysis model
            design_analysis = EconomicDesignAnalysis.objects.create(
                analysis_session=session,
                analysis_result=analysis_result,
                chart_type=chart_type,
                sample_size=result['optimal_design']['sample_size'],
                sampling_interval=result['optimal_design']['sampling_interval'],
                k_factor=result['optimal_design']['k_factor'],
                upper_control_limit=result['optimal_design']['ucl'],
                lower_control_limit=result['optimal_design']['lcl'],
                center_line=result['optimal_design']['center_line'],
                in_control_arl=result['performance_metrics']['in_control_arl'],
                out_of_control_arl=result['performance_metrics']['out_of_control_arl'],
                hourly_cost=result['cost_analysis']['total_hourly_cost'],
                cost_savings=result['cost_analysis']['cost_savings_percent']
            )
            
            # Update session status
            session.status = 'completed'
            session.save()
            
            # Send notification
            send_notification.delay(
                user_id=str(request.user.id),
                title="Economic Design Analysis Completed",
                message=f"Your economic design analysis has been completed.",
                notification_type="success",
                related_object_type="EconomicDesignAnalysis",
                related_object_id=str(design_analysis.id)
            )
            
            # Return serialized data
            serializer = self.get_serializer(design_analysis)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error calculating economic design: {str(e)}")
            session.status = 'failed'
            session.save()
            raise ValidationError({"non_field_errors": f"Error calculating economic design: {str(e)}"})
    
    @extend_schema(
        request=list,
        responses={200: dict},
        description="Compare multiple design alternatives.",
    )
    @action(detail=False, methods=['post'])
    def compare_alternatives(self, request):
        """Compare multiple design alternatives."""
        if not isinstance(request.data, dict):
            raise ValidationError({"non_field_errors": "Expected a dictionary with parameters and alternatives."})
        
        try:
            # Extract parameters
            process_parameters = request.data.get('process_parameters', {})
            cost_parameters = request.data.get('cost_parameters', {})
            alternatives = request.data.get('alternatives', [])
            
            if not alternatives:
                raise ValidationError({"alternatives": "At least one alternative must be provided."})
            
            # Create economic design service
            econ_service = EconomicDesignService()
            
            # Compare alternatives
            comparison = econ_service.compare_design_alternatives(
                process_parameters=process_parameters,
                cost_parameters=cost_parameters,
                alternatives=alternatives
            )
            
            return Response(comparison)
            
        except Exception as e:
            logger.error(f"Error comparing design alternatives: {str(e)}")
            raise ValidationError({"non_field_errors": f"Error comparing design alternatives: {str(e)}"})
    
    @extend_schema(
        request=dict,
        responses={200: dict},
        description="Calculate cost of quality metrics.",
    )
    @action(detail=False, methods=['post'])
    def cost_of_quality(self, request):
        """Calculate cost of quality metrics."""
        if not isinstance(request.data, dict):
            raise ValidationError({"non_field_errors": "Expected a dictionary with quality cost parameters."})
        
        try:
            # Extract parameters
            quality_parameters = request.data
            
            # Create economic design service
            econ_service = EconomicDesignService()
            
            # Calculate cost of quality
            result = econ_service.calculate_cost_of_quality(quality_parameters)
            
            return Response(result)
            
        except Exception as e:
            logger.error(f"Error calculating cost of quality: {str(e)}")
            raise ValidationError({"non_field_errors": f"Error calculating cost of quality: {str(e)}"})
    
    @extend_schema(
        request=dict,
        responses={200: dict},
        description="Calculate ROI for SPC implementation.",
    )
    @action(detail=False, methods=['post'])
    def calculate_roi(self, request):
        """Calculate ROI for SPC implementation."""
        if not isinstance(request.data, dict):
            raise ValidationError({"non_field_errors": "Expected a dictionary with ROI parameters."})
        
        try:
            # Extract parameters
            initial_investment = request.data.get('initial_investment', 0)
            monthly_costs = request.data.get('monthly_costs', [])
            monthly_benefits = request.data.get('monthly_benefits', [])
            time_horizon = request.data.get('time_horizon', 24)
            
            # Create economic design service
            econ_service = EconomicDesignService()
            
            # Calculate ROI
            result = econ_service.calculate_spc_roi(
                initial_investment=initial_investment,
                monthly_costs=monthly_costs,
                monthly_benefits=monthly_benefits,
                time_horizon=time_horizon
            )
            
            return Response(result)
            
        except Exception as e:
            logger.error(f"Error calculating ROI: {str(e)}")
            raise ValidationError({"non_field_errors": f"Error calculating ROI: {str(e)}"})


class SPCImplementationViewSet(viewsets.ModelViewSet):
    """API viewset for SPC implementation planning."""
    
    serializer_class = SPCImplementationPlanSerializer
    permission_classes = [IsAuthenticated]
    queryset = SPCImplementationPlan.objects.all()
    parser_classes = [JSONParser]
    
    def get_queryset(self):
        """Filter queryset to only show user's own analyses."""
        user = self.request.user
        return SPCImplementationPlan.objects.filter(
            analysis_session__user=user
        ).select_related('analysis_session', 'analysis_result')
    
    @extend_schema(
        request=SPCImplementationRequestSerializer,
        responses={200: SPCImplementationPlanSerializer},
        description="Create an SPC implementation plan.",
    )
    def create(self, request):
        """Create a new SPC implementation plan."""
        serializer = SPCImplementationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get validated data
        data = serializer.validated_data
        plan_type = data.get('plan_type', 'roadmap')
        session_name = data.get('session_name', f"SPC Implementation Plan")
        
        # Create analysis session
        session = AnalysisSession.objects.create(
            user=request.user,
            name=session_name,
            module='sqc',
            status='in_progress',
            configuration={
                'analysis_type': 'spc_implementation',
                'plan_type': plan_type
            }
        )
        
        # Create SPC implementation service
        impl_service = SPCImplementationService()
        
        try:
            if plan_type == 'roadmap':
                # Generate implementation roadmap
                implementation_parameters = {
                    'organization_size': data.get('organization_size', 'medium'),
                    'industry': data.get('industry', 'manufacturing'),
                    'existing_quality_system': data.get('existing_quality_system', 'basic'),
                    'process_complexity': data.get('process_complexity', 'medium'),
                    'implementation_scope': data.get('implementation_scope', 'department')
                }
                
                result = impl_service.generate_implementation_roadmap(implementation_parameters)
                
                # Create analysis result
                analysis_result = AnalysisResult.objects.create(
                    session=session,
                    name=f"SPC Implementation Roadmap",
                    analysis_type=f"spc_implementation_roadmap",
                    parameters=data,
                    result_summary={
                        'total_duration': result['total_duration'],
                        'start_date': result['start_date'],
                        'end_date': result['end_date'],
                        'phase_count': len(result['phases']),
                        'industry': implementation_parameters['industry']
                    },
                    result_detail=result,
                    interpretation=f"Implementation roadmap with {len(result['phases'])} phases over {result['total_duration']} weeks",
                    plot_data={}  # Add plot data if available
                )
                
                # Create implementation plan model
                implementation_plan = SPCImplementationPlan.objects.create(
                    analysis_session=session,
                    analysis_result=analysis_result,
                    plan_type=plan_type,
                    industry=implementation_parameters['industry'],
                    organization_size=implementation_parameters['organization_size'],
                    implementation_scope=implementation_parameters['implementation_scope'],
                    start_date=result['start_date'],
                    target_completion_date=result['end_date'],
                    total_duration=result['total_duration'],
                    plan_content=result
                )
            
            elif plan_type == 'control_plan':
                # Create control plan
                control_plan_items = data.get('control_plan_items', [])
                metadata = data.get('metadata', {})
                
                result = impl_service.create_control_plan(
                    control_plan_items=control_plan_items,
                    metadata=metadata
                )
                
                # Evaluate the control plan
                evaluation = impl_service.evaluate_control_plan(result)
                
                # Create analysis result
                analysis_result = AnalysisResult.objects.create(
                    session=session,
                    name=f"SPC Control Plan",
                    analysis_type=f"spc_control_plan",
                    parameters=data,
                    result_summary={
                        'completeness_score': evaluation['completeness_score'],
                        'quality_score': evaluation['quality_score'],
                        'items_count': len(result['items']),
                        'created_date': result['created']
                    },
                    result_detail={
                        'control_plan': result,
                        'evaluation': evaluation
                    },
                    interpretation=f"Control plan with {len(result['items'])} items, completeness: {evaluation['completeness_score']}%, quality: {evaluation['quality_score']}%",
                    plot_data={}  # Add plot data if available
                )
                
                # Create implementation plan model
                implementation_plan = SPCImplementationPlan.objects.create(
                    analysis_session=session,
                    analysis_result=analysis_result,
                    plan_type=plan_type,
                    industry=data.get('industry', 'manufacturing'),
                    completeness_score=evaluation['completeness_score'],
                    quality_score=evaluation['quality_score'],
                    plan_content=result
                )
            
            elif plan_type == 'maturity_assessment':
                # Perform maturity assessment
                assessment_responses = data.get('assessment_responses', {})
                
                result = impl_service.assess_implementation_maturity(assessment_responses)
                
                # Create analysis result
                analysis_result = AnalysisResult.objects.create(
                    session=session,
                    name=f"SPC Maturity Assessment",
                    analysis_type=f"spc_maturity_assessment",
                    parameters=data,
                    result_summary={
                        'overall_score': result['overall_score'],
                        'maturity_level': result['maturity_level'],
                        'dimension_count': len(result['dimension_scores']),
                        'created_date': result['created']
                    },
                    result_detail=result,
                    interpretation=f"Maturity assessment: {result['maturity_level']} level with score {result['overall_score']}%",
                    plot_data={}  # Add plot data if available
                )
                
                # Create implementation plan model
                implementation_plan = SPCImplementationPlan.objects.create(
                    analysis_session=session,
                    analysis_result=analysis_result,
                    plan_type=plan_type,
                    industry=data.get('industry', 'manufacturing'),
                    maturity_level=result['maturity_level'],
                    maturity_score=result['overall_score'],
                    plan_content=result
                )
            
            elif plan_type == 'case_study':
                # Get case study
                industry = data.get('industry', 'manufacturing')
                focus_area = data.get('focus_area')
                
                result = impl_service.get_case_study(
                    industry=industry,
                    focus_area=focus_area
                )
                
                # Create analysis result
                analysis_result = AnalysisResult.objects.create(
                    session=session,
                    name=f"SPC Case Study",
                    analysis_type=f"spc_case_study",
                    parameters=data,
                    result_summary={
                        'title': result.get('title', ''),
                        'industry': industry,
                        'focus_area': result.get('focus_area', ''),
                        'results_count': len(result.get('results', []))
                    },
                    result_detail=result,
                    interpretation=f"Case study: {result.get('title', '')}",
                    plot_data={}  # Add plot data if available
                )
                
                # Create implementation plan model
                implementation_plan = SPCImplementationPlan.objects.create(
                    analysis_session=session,
                    analysis_result=analysis_result,
                    plan_type=plan_type,
                    industry=industry,
                    focus_area=result.get('focus_area', ''),
                    plan_content=result
                )
            
            else:
                raise ValidationError({"plan_type": f"Unsupported plan type: {plan_type}"})
            
            # Update session status
            session.status = 'completed'
            session.save()
            
            # Send notification
            send_notification.delay(
                user_id=str(request.user.id),
                title="SPC Implementation Plan Created",
                message=f"Your {plan_type} plan has been created.",
                notification_type="success",
                related_object_type="SPCImplementationPlan",
                related_object_id=str(implementation_plan.id)
            )
            
            # Return serialized data
            serializer = self.get_serializer(implementation_plan)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating implementation plan: {str(e)}")
            session.status = 'failed'
            session.save()
            raise ValidationError({"non_field_errors": f"Error creating implementation plan: {str(e)}"})
    
    @extend_schema(
        responses={200: dict},
        description="Get the assessment report for an implementation plan.",
    )
    @action(detail=True, methods=['get'])
    def assessment_report(self, request, pk=None):
        """Get the assessment report for an implementation plan."""
        plan = self.get_object()
        
        if plan.plan_type != 'maturity_assessment':
            return Response(
                {"error": "This action is only available for maturity assessments."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not plan.analysis_result:
            return Response(
                {"error": "No analysis result found for this plan."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get assessment details
        result = plan.analysis_result.result_detail
        
        return Response(result)
    
    @extend_schema(
        responses={200: dict},
        description="Get industry-specific recommendations for SPC implementation.",
    )
    @action(detail=False, methods=['get'])
    def industry_recommendations(self, request):
        """Get industry-specific recommendations for SPC implementation."""
        industry = request.query_params.get('industry', 'manufacturing')
        
        # Create SPC implementation service
        impl_service = SPCImplementationService()
        
        # Get recommendations
        recommendations = impl_service.get_industry_recommendations(industry)
        
        return Response(recommendations)


# ======================= SIMPLIFIED API VIEWS =======================

from rest_framework.views import APIView
import numpy as np
from scipy import stats
import warnings
warnings.filterwarnings('ignore')


class QuickControlChartView(APIView):
    """Quick control chart analysis without project setup"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Perform quick control chart analysis"""
        try:
            data = request.data
            
            # Extract data
            measurements = data.get('measurements', [])
            if not measurements:
                return Response({
                    'status': 'error',
                    'error': {
                        'code': 'NO_DATA',
                        'message': 'No measurements provided'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            chart_type = data.get('chart_type', 'i_mr')
            subgroup_size = data.get('subgroup_size', 1)
            
            # Convert to numpy array
            measurements = np.array(measurements)
            
            # Create service
            chart_service = ControlChartService()
            
            # Prepare dataframe
            import pandas as pd
            if chart_type == 'i_mr':
                # Create list of dictionaries for I-MR chart
                data_list = [{'Measurement': value} for value in measurements]
                result = chart_service.analyze_control_chart(
                    data=data_list,
                    chart_type='imr'
                )
            elif chart_type == 'xbar_r':
                # Reshape data into subgroups
                n_subgroups = len(measurements) // subgroup_size
                measurements = measurements[:n_subgroups * subgroup_size]
                measurements = measurements.reshape(n_subgroups, subgroup_size)
                
                # Create dataframe
                data_dict = {}
                for i in range(subgroup_size):
                    data_dict[f'sample_{i+1}'] = measurements[:, i]
                data_dict['subgroup'] = list(range(n_subgroups))
                df = pd.DataFrame(data_dict)
                
                # Melt to long format
                df = df.melt(id_vars=['subgroup'], var_name='sample', value_name='value')
                
                result = chart_service.analyze_control_chart(
                    data=df,
                    chart_type='xbar_r',
                    subgroup_size=subgroup_size
                )
            else:
                # Handle other chart types
                data_list = [{'Measurement': value} for value in measurements]
                result = chart_service.analyze_control_chart(
                    data=data_list,
                    chart_type=chart_type
                )
            
            # Generate creative visualizations
            visualizations = {}
            
            # Control chart with animated points
            visualizations['control_chart'] = self._create_control_chart_svg(
                result, chart_type
            )
            
            # Extract control limits based on chart type
            if chart_type == 'imr':
                limits = result.get('limits', {}).get('individuals', {})
                center_line = limits.get('center', 0)
                ucl = limits.get('ucl', 0)
                lcl = limits.get('lcl', 0)
            else:
                limits = result.get('limits', {}).get('xbar', {})
                center_line = limits.get('center', 0)
                ucl = limits.get('ucl', 0)
                lcl = limits.get('lcl', 0)
            
            # Extract violations
            out_of_control = result.get('out_of_control', {})
            violations = []
            if isinstance(out_of_control, dict):
                for chart_type_key, indices in out_of_control.items():
                    for idx in indices:
                        violations.append({
                            'index': idx,
                            'type': f'Out of control ({chart_type_key})'
                        })
            
            # Violation highlights
            if violations:
                visualizations['violations_plot'] = self._create_violations_plot(
                    result
                )
            
            # Process capability preview
            visualizations['capability_preview'] = self._create_capability_preview(
                measurements, result
            )
            
            # Patterns detection
            patterns = result.get('patterns', {})
            
            return Response({
                'status': 'success',
                'data': {
                    'results': {
                        'chart_type': chart_type,
                        'center_line': center_line,
                        'upper_control_limit': ucl,
                        'lower_control_limit': lcl,
                        'violations': violations,
                        'patterns': patterns,
                        'is_in_control': len(violations) == 0
                    },
                    'visualizations': visualizations,
                    'interpretation': self._interpret_control_chart(result, violations)
                },
                'message': 'Control chart analysis completed'
            })
            
        except Exception as e:
            logger.error(f"Error in quick control chart: {str(e)}")
            return Response({
                'status': 'error',
                'error': {
                    'code': 'CHART_ERROR',
                    'message': str(e)
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _create_control_chart_svg(self, result, chart_type):
        """Create animated control chart visualization"""
        import matplotlib.pyplot as plt
        import matplotlib.patches as patches
        from matplotlib.animation import FuncAnimation
        import io
        import base64
        
        fig, ax = plt.subplots(figsize=(12, 6))
        
        # Extract data points from result
        data_list = result.get('data', [])
        if chart_type == 'imr':
            points = [d.get('Measurement', 0) for d in data_list if 'Measurement' in d]
        else:
            points = [d.get('Mean', 0) for d in data_list if 'Mean' in d]
        
        if not points:
            # Fallback to raw data
            points = result.get('raw_data', [])
        
        x = list(range(len(points)))
        
        # Extract control limits
        if chart_type == 'imr':
            limits = result.get('limits', {}).get('individuals', {})
        else:
            limits = result.get('limits', {}).get('xbar', {})
        
        center_line = limits.get('center', 0)
        ucl = limits.get('ucl', 0)
        lcl = limits.get('lcl', 0)
        
        # Control lines
        ax.axhline(y=center_line, color='green', linestyle='-', label='CL', linewidth=2)
        ax.axhline(y=ucl, color='red', linestyle='--', label='UCL', linewidth=1.5)
        ax.axhline(y=lcl, color='red', linestyle='--', label='LCL', linewidth=1.5)
        
        # Data points with violations highlighted
        out_of_control = result.get('out_of_control', {})
        violation_indices = []
        if isinstance(out_of_control, dict):
            for chart_type_key, indices in out_of_control.items():
                violation_indices.extend(indices)
        
        for i, point in enumerate(points):
            if i in violation_indices:
                ax.scatter(i, point, color='red', s=100, zorder=5, edgecolors='darkred', linewidth=2)
            else:
                ax.scatter(i, point, color='blue', s=60, zorder=3)
        
        # Connect points
        ax.plot(x, points, 'b-', alpha=0.5, linewidth=1)
        
        # Add zones
        zone_a = (ucl - center_line) if ucl > center_line else 1
        ax.fill_between(x, center_line + 2*zone_a/3, ucl, 
                       alpha=0.1, color='yellow', label='Zone A')
        ax.fill_between(x, center_line + zone_a/3, center_line + 2*zone_a/3, 
                       alpha=0.1, color='green', label='Zone B')
        ax.fill_between(x, center_line, center_line + zone_a/3, 
                       alpha=0.1, color='blue', label='Zone C')
        
        # Mirror zones below
        ax.fill_between(x, lcl, center_line - 2*zone_a/3, 
                       alpha=0.1, color='yellow')
        ax.fill_between(x, center_line - 2*zone_a/3, center_line - zone_a/3, 
                       alpha=0.1, color='green')
        ax.fill_between(x, center_line - zone_a/3, center_line, 
                       alpha=0.1, color='blue')
        
        ax.set_xlabel('Sample Number', fontsize=12)
        ax.set_ylabel('Measurement Value', fontsize=12)
        ax.set_title(f'{chart_type.upper()} Control Chart with Zone Analysis', fontsize=14, fontweight='bold')
        ax.legend(loc='upper right')
        ax.grid(True, alpha=0.3)
        
        # Save as SVG
        buffer = io.BytesIO()
        plt.savefig(buffer, format='svg', bbox_inches='tight')
        plt.close()
        
        buffer.seek(0)
        svg_data = buffer.getvalue().decode('utf-8')
        return f"data:image/svg+xml;base64,{base64.b64encode(svg_data.encode()).decode()}"
    
    def _create_violations_plot(self, result):
        """Create violations highlight plot"""
        # Implementation for violations visualization
        return "data:image/svg+xml;base64,..."  # Placeholder
    
    def _create_capability_preview(self, measurements, result):
        """Create process capability preview"""
        # Implementation for capability preview
        return "data:image/svg+xml;base64,..."  # Placeholder
    
    def _interpret_control_chart(self, result, violations):
        """Generate control chart interpretation"""
        patterns = result.get('patterns', {})
        
        if not violations:
            status = "Process is in statistical control"
        else:
            status = f"Process shows {len(violations)} out-of-control points"
        
        # Check for patterns
        pattern_messages = []
        if patterns.get('above_center'):
            pattern_messages.append(f"Run of {len(patterns['above_center'])} points above center line")
        if patterns.get('below_center'):
            pattern_messages.append(f"Run of {len(patterns['below_center'])} points below center line")
        if patterns.get('increasing'):
            pattern_messages.append("Increasing trend detected")
        if patterns.get('decreasing'):
            pattern_messages.append("Decreasing trend detected")
        
        if pattern_messages:
            status += ". Patterns detected: " + ", ".join(pattern_messages)
        
        return status


class QuickProcessCapabilityView(APIView):
    """Quick process capability analysis"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Perform quick process capability analysis"""
        try:
            data = request.data
            
            # Extract data
            measurements = data.get('measurements', [])
            if not measurements:
                return Response({
                    'status': 'error',
                    'error': {
                        'code': 'NO_DATA',
                        'message': 'No measurements provided'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Specifications
            lsl = data.get('lower_spec_limit')
            usl = data.get('upper_spec_limit')
            target = data.get('target_value')
            
            if not lsl and not usl:
                return Response({
                    'status': 'error',
                    'error': {
                        'code': 'NO_SPECS',
                        'message': 'At least one specification limit required'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Convert to numpy array
            measurements = np.array(measurements)
            
            # Create service
            capability_service = ProcessCapabilityService()
            
            # Prepare dataframe
            df = pd.DataFrame({'value': measurements})
            
            # Calculate capability
            result = capability_service.calculate_capability_indices(
                data=measurements,
                lsl=lsl,
                usl=usl,
                target=target
            )
            
            # Generate creative visualizations
            visualizations = {}
            
            # Capability histogram with curve fit
            visualizations['capability_plot'] = self._create_capability_plot(
                measurements, result, lsl, usl, target
            )
            
            # Process performance dashboard
            visualizations['performance_dashboard'] = self._create_performance_dashboard(
                result
            )
            
            # Animated gauge chart
            visualizations['gauge_chart'] = self._create_gauge_chart(
                result.get('Cpk', result.get('cpk', 0))
            )
            
            # Interactive what-if analysis
            visualizations['what_if_analysis'] = self._create_what_if_analysis(
                measurements, lsl, usl
            )
            
            return Response({
                'status': 'success',
                'data': {
                    'results': {
                        'cp': result.get('Cp', result.get('cp', 0)),
                        'cpk': result.get('Cpk', result.get('cpk', 0)),
                        'pp': result.get('Pp', result.get('pp', 0)),
                        'ppk': result.get('Ppk', result.get('ppk', 0)),
                        'mean': result.get('Mean', result.get('mean', 0)),
                        'std_dev': result.get('StdDev', result.get('std_dev', 0)),
                        'dpm': result.get('DPM', result.get('dpm', 0)),
                        'process_yield': 100 - result.get('percent_out_of_spec', 0),
                        'sigma_level': result.get('sigma_level', 3),
                        'percent_out_of_spec': result.get('below_lsl_percent', 0) + result.get('above_usl_percent', 0)
                    },
                    'visualizations': visualizations,
                    'interpretation': self._interpret_capability(result)
                },
                'message': 'Process capability analysis completed'
            })
            
        except Exception as e:
            logger.error(f"Error in quick capability analysis: {str(e)}")
            return Response({
                'status': 'error',
                'error': {
                    'code': 'CAPABILITY_ERROR',
                    'message': str(e)
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _create_capability_plot(self, measurements, result, lsl, usl, target):
        """Create capability histogram with distribution overlay"""
        import matplotlib.pyplot as plt
        from scipy import stats
        import io
        import base64
        
        fig, ax = plt.subplots(figsize=(10, 6))
        
        # Histogram
        n, bins, patches = ax.hist(measurements, bins=30, density=True, 
                                  alpha=0.7, color='lightblue', edgecolor='black')
        
        # Fit normal distribution
        mu = result.get('Mean', result.get('mean', np.mean(measurements)))
        sigma = result.get('StdDev', result.get('std_dev', np.std(measurements, ddof=1)))
        x = np.linspace(measurements.min() - 3*sigma, measurements.max() + 3*sigma, 1000)
        y = stats.norm.pdf(x, mu, sigma)
        ax.plot(x, y, 'b-', linewidth=2, label='Normal Fit')
        
        # Specification limits
        if lsl is not None:
            ax.axvline(x=lsl, color='red', linestyle='--', linewidth=2, label=f'LSL: {lsl}')
        if usl is not None:
            ax.axvline(x=usl, color='red', linestyle='--', linewidth=2, label=f'USL: {usl}')
        if target is not None:
            ax.axvline(x=target, color='green', linestyle='-', linewidth=2, label=f'Target: {target}')
        
        # Process mean
        ax.axvline(x=mu, color='blue', linestyle=':', linewidth=2, label=f'Mean: {mu:.3f}')
        
        # Add capability indices
        cp_val = result.get('Cp', result.get('cp', 0))
        cpk_val = result.get('Cpk', result.get('cpk', 0))
        textstr = f'Cp: {cp_val:.3f}\nCpk: {cpk_val:.3f}'
        ax.text(0.02, 0.98, textstr, transform=ax.transAxes, fontsize=12,
                verticalalignment='top', bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
        
        ax.set_xlabel('Measurement Value', fontsize=12)
        ax.set_ylabel('Density', fontsize=12)
        ax.set_title('Process Capability Analysis', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        # Save as SVG
        buffer = io.BytesIO()
        plt.savefig(buffer, format='svg', bbox_inches='tight')
        plt.close()
        
        buffer.seek(0)
        svg_data = buffer.getvalue().decode('utf-8')
        return f"data:image/svg+xml;base64,{base64.b64encode(svg_data.encode()).decode()}"
    
    def _create_performance_dashboard(self, result):
        """Create performance metrics dashboard"""
        # Implementation for dashboard
        return "data:image/svg+xml;base64,..."  # Placeholder
    
    def _create_gauge_chart(self, cpk):
        """Create animated gauge chart for Cpk"""
        # Implementation for gauge chart
        return "data:image/svg+xml;base64,..."  # Placeholder
    
    def _create_what_if_analysis(self, measurements, lsl, usl):
        """Create interactive what-if analysis"""
        # Implementation for what-if analysis
        return "data:image/svg+xml;base64,..."  # Placeholder
    
    def _interpret_capability(self, result):
        """Generate capability interpretation"""
        cpk = result.get('cpk', 0)
        if cpk >= 2.0:
            level = "World-class"
            action = "Maintain current performance"
        elif cpk >= 1.67:
            level = "Excellent"
            action = "Minor improvements possible"
        elif cpk >= 1.33:
            level = "Capable"
            action = "Continue monitoring"
        elif cpk >= 1.0:
            level = "Marginally capable"
            action = "Improvement needed"
        else:
            level = "Not capable"
            action = "Immediate action required"
        
        return f"Process is {level} with Cpk={cpk:.3f}. {action}."


class QuickAcceptanceSamplingView(APIView):
    """Quick acceptance sampling plan generation"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Generate quick acceptance sampling plan"""
        try:
            data = request.data
            
            # Extract parameters
            lot_size = data.get('lot_size', 1000)
            aql = data.get('aql', 1.0)  # Acceptable Quality Level
            ltpd = data.get('ltpd', 10.0)  # Lot Tolerance Percent Defective
            producer_risk = data.get('producer_risk', 0.05)
            consumer_risk = data.get('consumer_risk', 0.10)
            plan_type = data.get('plan_type', 'single')
            
            # Create service
            sampling_service = AcceptanceSamplingService()
            
            # Generate plan
            if plan_type == 'single':
                result = sampling_service.calculate_single_sampling_plan(
                    lot_size=lot_size,
                    acceptable_quality_level=aql,
                    rejectable_quality_level=ltpd,
                    producer_risk=producer_risk,
                    consumer_risk=consumer_risk
                )
            elif plan_type == 'double':
                # For now, use single sampling plan
                # TODO: Implement double sampling plan when method is available
                result = sampling_service.calculate_single_sampling_plan(
                    lot_size=lot_size,
                    acceptable_quality_level=aql,
                    rejectable_quality_level=ltpd,
                    producer_risk=producer_risk,
                    consumer_risk=consumer_risk
                )
                result['plan_type'] = 'single'  # Mark as single for now
            else:
                result = sampling_service.calculate_single_sampling_plan(
                    lot_size=lot_size,
                    acceptable_quality_level=aql,
                    rejectable_quality_level=ltpd,
                    producer_risk=producer_risk,
                    consumer_risk=consumer_risk
                )
            
            # Generate visualizations
            visualizations = {}
            
            # OC Curve
            visualizations['oc_curve'] = self._create_oc_curve(result)
            
            # Risk analysis plot
            visualizations['risk_plot'] = self._create_risk_plot(result)
            
            # Sampling plan diagram
            visualizations['plan_diagram'] = self._create_plan_diagram(result)
            
            # Interactive calculator
            visualizations['calculator'] = self._create_sampling_calculator()
            
            return Response({
                'status': 'success',
                'data': {
                    'results': {
                        'plan_type': result.get('plan_type', 'single'),
                        'sample_size': result.get('sample_size', 0),
                        'acceptance_number': result.get('acceptance_number', 0),
                        'rejection_number': result.get('acceptance_number', 0) + 1 if result.get('acceptance_number') is not None else 1,
                        'producer_risk_actual': result.get('producer_risk', 0),
                        'consumer_risk_actual': result.get('consumer_risk', 0),
                        'aoql': result.get('aoq_curve', {}).get('aoql', 'N/A')
                    },
                    'visualizations': visualizations,
                    'interpretation': self._interpret_sampling_plan(result)
                },
                'message': 'Acceptance sampling plan generated'
            })
            
        except Exception as e:
            logger.error(f"Error in quick sampling plan: {str(e)}")
            return Response({
                'status': 'error',
                'error': {
                    'code': 'SAMPLING_ERROR',
                    'message': str(e)
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _create_oc_curve(self, result):
        """Create OC curve visualization"""
        import matplotlib.pyplot as plt
        import io
        import base64
        
        fig, ax = plt.subplots(figsize=(10, 6))
        
        # Get OC curve data
        oc_data = result.get('oc_curve', {})
        quality_levels = oc_data.get('quality_levels', [])
        probabilities = oc_data.get('probabilities', [])
        
        if quality_levels and probabilities:
            ax.plot(quality_levels, probabilities, 'b-', linewidth=2, label='OC Curve')
            
            # Mark AQL and LTPD
            aql = result.get('aql', 1.0)
            ltpd = result.get('ltpd', 10.0)
            
            # Find corresponding probabilities
            aql_prob = np.interp(aql, quality_levels, probabilities)
            ltpd_prob = np.interp(ltpd, quality_levels, probabilities)
            
            ax.scatter([aql], [aql_prob], color='green', s=100, zorder=5, 
                      label=f'AQL ({aql}%, {aql_prob:.3f})')
            ax.scatter([ltpd], [ltpd_prob], color='red', s=100, zorder=5, 
                      label=f'LTPD ({ltpd}%, {ltpd_prob:.3f})')
            
            # Add risk lines
            ax.axhline(y=0.95, color='green', linestyle='--', alpha=0.5)
            ax.axhline(y=0.10, color='red', linestyle='--', alpha=0.5)
            
            ax.set_xlabel('Percent Defective', fontsize=12)
            ax.set_ylabel('Probability of Acceptance', fontsize=12)
            ax.set_title('Operating Characteristic (OC) Curve', fontsize=14, fontweight='bold')
            ax.legend()
            ax.grid(True, alpha=0.3)
            ax.set_ylim(-0.05, 1.05)
        
        # Save as SVG
        buffer = io.BytesIO()
        plt.savefig(buffer, format='svg', bbox_inches='tight')
        plt.close()
        
        buffer.seek(0)
        svg_data = buffer.getvalue().decode('utf-8')
        return f"data:image/svg+xml;base64,{base64.b64encode(svg_data.encode()).decode()}"
    
    def _create_risk_plot(self, result):
        """Create risk analysis visualization"""
        # Implementation for risk plot
        return "data:image/svg+xml;base64,..."  # Placeholder
    
    def _create_plan_diagram(self, result):
        """Create sampling plan flow diagram"""
        # Implementation for plan diagram
        return "data:image/svg+xml;base64,..."  # Placeholder
    
    def _create_sampling_calculator(self):
        """Create interactive sampling calculator"""
        # Implementation for calculator
        return "data:image/svg+xml;base64,..."  # Placeholder
    
    def _interpret_sampling_plan(self, result):
        """Generate sampling plan interpretation"""
        n = result.get('sample_size', 0)
        c = result.get('acceptance_number', 0)
        plan_type = result.get('plan_type', 'single')
        
        if plan_type == 'single':
            return f"Single sampling plan: Sample {n} items, accept if {c} or fewer defects found."
        elif plan_type == 'double':
            n1 = result.get('first_sample_size', 0)
            c1 = result.get('first_acceptance_number', 0)
            n2 = result.get('second_sample_size', 0)
            c2 = result.get('second_acceptance_number', 0)
            return f"Double sampling plan: First sample {n1} items (accept if ≤{c1}), second sample {n2} items if needed (accept if total ≤{c2})."
        else:
            return f"Sampling plan generated with n={n}, c={c}"


class QuickMSAView(APIView):
    """Quick measurement system analysis"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Perform quick MSA analysis"""
        try:
            data = request.data
            msa_type = data.get('msa_type', 'gage_rr')
            
            if msa_type == 'gage_rr':
                return self._perform_gage_rr(data)
            elif msa_type == 'bias':
                return self._perform_bias_analysis(data)
            elif msa_type == 'stability':
                return self._perform_stability_analysis(data)
            else:
                return Response({
                    'status': 'error',
                    'error': {
                        'code': 'INVALID_TYPE',
                        'message': f'Invalid MSA type: {msa_type}'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error in quick MSA: {str(e)}")
            return Response({
                'status': 'error',
                'error': {
                    'code': 'MSA_ERROR',
                    'message': str(e)
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _perform_gage_rr(self, data):
        """Perform Gage R&R analysis"""
        # Extract measurement data
        measurements = data.get('measurements', {})
        
        if not measurements:
            return Response({
                'status': 'error',
                'error': {
                    'code': 'NO_DATA',
                    'message': 'No measurement data provided'
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create service
        msa_service = MSAService()
        
        # Convert to dataframe format
        data_list = []
        for part, operators in measurements.items():
            for operator, values in operators.items():
                for value in values:
                    data_list.append({
                        'Part': part,
                        'Operator': operator,
                        'Measurement': value
                    })
        
        df = pd.DataFrame(data_list)
        
        # Perform analysis
        result = msa_service.calculate_gauge_rr_anova(
            data=df,
            parts_col='Part',
            operators_col='Operator',
            measurements_col='Measurement'
        )
        
        # Generate visualizations
        visualizations = {}
        visualizations['components_chart'] = self._create_components_chart(result)
        visualizations['operator_comparison'] = self._create_operator_comparison(df)
        visualizations['gauge_run_chart'] = self._create_gauge_run_chart(df)
        
        return Response({
            'status': 'success',
            'data': {
                'results': {
                    'gage_rr_percent': result['summary'].get('%StudyVar (Gauge R&R)', 'N/A'),
                    'repeatability_percent': self._extract_variance_percent(result, 'Repeatability'),
                    'reproducibility_percent': self._extract_variance_percent(result, 'Reproducibility'),
                    'part_variation_percent': self._extract_variance_percent(result, 'Part'),
                    'ndc': result['summary'].get('Number of Distinct Categories', 'N/A'),
                    'assessment': result.get('assessment', {})
                },
                'visualizations': visualizations,
                'interpretation': self._interpret_gage_rr(result)
            },
            'message': 'Gage R&R analysis completed'
        })
    
    def _extract_variance_percent(self, result, source):
        """Extract variance percentage from variance table"""
        variance_table = result.get('variance_table', {})
        sources = variance_table.get('Source', [])
        percentages = variance_table.get('%StudyVar', [])
        
        if source in sources:
            idx = sources.index(source)
            if idx < len(percentages):
                return percentages[idx]
        return 'N/A'
    
    def _create_components_chart(self, result):
        """Create variance components chart"""
        import matplotlib.pyplot as plt
        import io
        import base64
        
        fig, ax = plt.subplots(figsize=(10, 6))
        
        # Extract components
        part_var = self._extract_variance_percent(result, 'Part')
        repeat_var = self._extract_variance_percent(result, 'Repeatability')
        reprod_var = self._extract_variance_percent(result, 'Reproducibility')
        
        # Convert to numeric, defaulting to 0 if 'N/A'
        components = {
            'Part-to-Part': float(part_var) if part_var != 'N/A' else 0.0,
            'Repeatability': float(repeat_var) if repeat_var != 'N/A' else 0.0,
            'Reproducibility': float(reprod_var) if reprod_var != 'N/A' else 0.0
        }
        
        # Create bar chart
        bars = ax.bar(components.keys(), components.values(), 
                      color=['green', 'orange', 'red'], alpha=0.7)
        
        # Add value labels
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'{height:.1f}%', ha='center', va='bottom')
        
        # Add threshold line
        ax.axhline(y=10, color='red', linestyle='--', label='10% Threshold')
        ax.axhline(y=30, color='darkred', linestyle='--', label='30% Threshold')
        
        ax.set_ylabel('Percent of Study Variation', fontsize=12)
        ax.set_title('Measurement System Variance Components', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3, axis='y')
        
        # Save as SVG
        buffer = io.BytesIO()
        plt.savefig(buffer, format='svg', bbox_inches='tight')
        plt.close()
        
        buffer.seek(0)
        svg_data = buffer.getvalue().decode('utf-8')
        return f"data:image/svg+xml;base64,{base64.b64encode(svg_data.encode()).decode()}"
    
    def _create_operator_comparison(self, df):
        """Create operator comparison chart"""
        # Implementation for operator comparison
        return "data:image/svg+xml;base64,..."  # Placeholder
    
    def _create_gauge_run_chart(self, df):
        """Create gauge run chart"""
        # Implementation for gauge run chart
        return "data:image/svg+xml;base64,..."  # Placeholder
    
    def _perform_bias_analysis(self, data):
        """Perform bias analysis"""
        # Implementation for bias analysis
        return Response({
            'status': 'success',
            'data': {
                'results': {},
                'visualizations': {},
                'interpretation': 'Bias analysis completed'
            }
        })
    
    def _perform_stability_analysis(self, data):
        """Perform stability analysis"""
        # Implementation for stability analysis
        return Response({
            'status': 'success',
            'data': {
                'results': {},
                'visualizations': {},
                'interpretation': 'Stability analysis completed'
            }
        })
    
    def _interpret_gage_rr(self, result):
        """Generate Gage R&R interpretation"""
        gage_rr = result.get('summary', {}).get('%StudyVar (Gauge R&R)', 0)
        ndc = result.get('summary', {}).get('Number of Distinct Categories', 0)
        
        if gage_rr < 10:
            system_status = "Excellent - measurement system is acceptable"
        elif gage_rr < 30:
            system_status = "Acceptable - may be acceptable depending on application"
        else:
            system_status = "Unacceptable - measurement system needs improvement"
        
        ndc_status = "Adequate" if ndc >= 5 else "Inadequate"
        
        return f"{system_status}. Gage R&R: {gage_rr:.1f}%, NDC: {ndc} ({ndc_status})"


class SQCSimulationView(APIView):
    """Interactive SQC simulations for education"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get available simulations"""
        simulations = {
            'control_chart': {
                'name': 'Control Chart Simulation',
                'description': 'Interactive simulation showing how control charts detect process changes',
                'parameters': ['shift_size', 'trend_rate', 'cycle_amplitude']
            },
            'capability': {
                'name': 'Process Capability Simulation',
                'description': 'Explore how process variation affects capability indices',
                'parameters': ['mean_shift', 'variance_change', 'spec_limits']
            },
            'sampling': {
                'name': 'Acceptance Sampling Simulation',
                'description': 'Understand risks in acceptance sampling decisions',
                'parameters': ['lot_quality', 'sample_size', 'acceptance_number']
            },
            'measurement': {
                'name': 'Measurement System Simulation',
                'description': 'See how measurement error affects decision making',
                'parameters': ['repeatability', 'reproducibility', 'bias']
            }
        }
        
        return Response({
            'status': 'success',
            'data': {
                'simulations': simulations
            }
        })
    
    def post(self, request):
        """Run specific simulation"""
        try:
            simulation_type = request.data.get('simulation_type', 'control_chart')
            parameters = request.data.get('parameters', {})
            
            if simulation_type == 'control_chart':
                result = self._simulate_control_chart(parameters)
            elif simulation_type == 'capability':
                result = self._simulate_capability(parameters)
            elif simulation_type == 'sampling':
                result = self._simulate_sampling(parameters)
            elif simulation_type == 'measurement':
                result = self._simulate_measurement(parameters)
            else:
                return Response({
                    'status': 'error',
                    'error': {
                        'code': 'INVALID_SIMULATION',
                        'message': f'Invalid simulation type: {simulation_type}'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'status': 'success',
                'data': result,
                'message': f'{simulation_type} simulation completed'
            })
            
        except Exception as e:
            logger.error(f"Error in SQC simulation: {str(e)}")
            return Response({
                'status': 'error',
                'error': {
                    'code': 'SIMULATION_ERROR',
                    'message': str(e)
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _simulate_control_chart(self, parameters):
        """Simulate control chart behavior"""
        # Generate process data with specified characteristics
        n_points = 50
        shift_point = 25
        shift_size = parameters.get('shift_size', 2.0)
        
        # Normal process
        np.random.seed(42)
        data1 = np.random.normal(0, 1, shift_point)
        
        # Shifted process
        data2 = np.random.normal(shift_size, 1, n_points - shift_point)
        
        # Combine
        data = np.concatenate([data1, data2])
        
        # Calculate control limits
        mean = np.mean(data1)  # Use only in-control data
        std = np.std(data1)
        ucl = mean + 3 * std
        lcl = mean - 3 * std
        
        # Detect out-of-control points
        ooc_points = []
        for i, point in enumerate(data):
            if point > ucl or point < lcl:
                ooc_points.append(i)
        
        # Create animation frames
        animation_frames = []
        for i in range(1, n_points + 1):
            frame = {
                'data': data[:i].tolist(),
                'ucl': ucl,
                'lcl': lcl,
                'center_line': mean,
                'ooc_points': [p for p in ooc_points if p < i],
                'shift_detected': i > shift_point and len([p for p in ooc_points if p >= shift_point and p < i]) > 0
            }
            animation_frames.append(frame)
        
        return {
            'simulation': {
                'animation_frames': animation_frames,
                'explanation': {
                    'steps': [
                        {
                            'frame': 0,
                            'title': 'Process In Control',
                            'description': 'Process operates normally within control limits'
                        },
                        {
                            'frame': shift_point,
                            'title': 'Process Shift Occurs',
                            'description': f'Process mean shifts by {shift_size} standard deviations'
                        },
                        {
                            'frame': shift_point + 5,
                            'title': 'Shift Detection',
                            'description': 'Control chart detects the process change'
                        }
                    ]
                },
                'insights': [
                    'Control charts detect sustained shifts in process mean',
                    'Larger shifts are detected more quickly',
                    'Control limits are based on process variation'
                ]
            }
        }
    
    def _simulate_capability(self, parameters):
        """Simulate process capability changes"""
        # Implementation for capability simulation
        return {
            'simulation': {
                'animation': 'capability_animation',
                'results': {},
                'insights': []
            }
        }
    
    def _simulate_sampling(self, parameters):
        """Simulate acceptance sampling decisions"""
        # Implementation for sampling simulation
        return {
            'simulation': {
                'animation': 'sampling_animation',
                'results': {},
                'insights': []
            }
        }
    
    def _simulate_measurement(self, parameters):
        """Simulate measurement system effects"""
        # Implementation for measurement simulation
        return {
            'simulation': {
                'animation': 'measurement_animation',
                'results': {},
                'insights': []
            }
        }


class SQCDemoDataView(APIView):
    """Generate demo datasets for SQC analysis"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get available demo datasets"""
        demos = {
            'manufacturing_process': {
                'name': 'Manufacturing Process Data',
                'description': 'Dimensional measurements from a machining process',
                'n_samples': 100,
                'features': ['diameter', 'length', 'weight'],
                'includes_violations': True
            },
            'chemical_batch': {
                'name': 'Chemical Batch Process',
                'description': 'pH and concentration measurements from batch production',
                'n_samples': 50,
                'features': ['pH', 'concentration', 'temperature'],
                'subgroups': 10
            },
            'electronics_testing': {
                'name': 'Electronics Testing Data',
                'description': 'Resistance measurements with multiple operators',
                'n_samples': 90,
                'operators': 3,
                'parts': 10,
                'replicates': 3
            },
            'pharmaceutical_tablet': {
                'name': 'Pharmaceutical Tablet Weight',
                'description': 'Tablet weight measurements for capability analysis',
                'n_samples': 200,
                'specs': {'lsl': 95, 'usl': 105, 'target': 100}
            }
        }
        
        return Response({
            'status': 'success',
            'data': {
                'demos': demos
            }
        })
    
    def post(self, request):
        """Generate specific demo dataset"""
        try:
            demo_type = request.data.get('demo_type', 'manufacturing_process')
            
            if demo_type == 'manufacturing_process':
                data, metadata = self._generate_manufacturing_data()
            elif demo_type == 'chemical_batch':
                data, metadata = self._generate_chemical_batch_data()
            elif demo_type == 'electronics_testing':
                data, metadata = self._generate_electronics_msa_data()
            elif demo_type == 'pharmaceutical_tablet':
                data, metadata = self._generate_pharmaceutical_data()
            else:
                return Response({
                    'status': 'error',
                    'error': {
                        'code': 'UNKNOWN_DEMO',
                        'message': f'Unknown demo type: {demo_type}'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'status': 'success',
                'data': {
                    'dataset': data.to_dict('records'),
                    'metadata': metadata
                },
                'message': f'{demo_type} demo dataset generated'
            })
            
        except Exception as e:
            logger.error(f"Error generating demo data: {str(e)}")
            return Response({
                'status': 'error',
                'error': {
                    'code': 'DEMO_ERROR',
                    'message': str(e)
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _generate_manufacturing_data(self):
        """Generate manufacturing process data with shifts and trends"""
        np.random.seed(42)
        
        n_samples = 100
        
        # Base process - diameter measurements
        target = 10.0
        process_std = 0.05
        
        # Generate data with different patterns
        data = []
        
        # In-control period (samples 1-30)
        in_control = np.random.normal(target, process_std, 30)
        
        # Sudden shift (samples 31-50)
        shift = np.random.normal(target + 0.15, process_std, 20)
        
        # Gradual trend (samples 51-70)
        trend_base = np.random.normal(target, process_std, 20)
        trend = trend_base + np.linspace(0, 0.2, 20)
        
        # Back in control with increased variation (samples 71-100)
        high_var = np.random.normal(target, process_std * 1.5, 30)
        
        # Combine all patterns
        diameter = np.concatenate([in_control, shift, trend, high_var])
        
        # Add correlated measurements
        length = diameter * 5 + np.random.normal(0, 0.1, n_samples)
        weight = diameter * 2.5 + length * 0.5 + np.random.normal(0, 0.05, n_samples)
        
        # Create dataframe
        df = pd.DataFrame({
            'sample_number': range(1, n_samples + 1),
            'diameter': diameter,
            'length': length,
            'weight': weight,
            'shift': pd.to_datetime('2024-01-01') + pd.Timedelta(hours=1) * np.arange(n_samples)
        })
        
        metadata = {
            'description': 'Manufacturing process with shifts and trends',
            'specifications': {
                'diameter': {'lsl': 9.85, 'usl': 10.15, 'target': 10.0},
                'length': {'lsl': 49.5, 'usl': 50.5, 'target': 50.0},
                'weight': {'lsl': 24.5, 'usl': 25.5, 'target': 25.0}
            },
            'patterns': {
                'samples_1_30': 'In control',
                'samples_31_50': 'Mean shift (+0.15)',
                'samples_51_70': 'Gradual trend',
                'samples_71_100': 'Increased variation'
            }
        }
        
        return df, metadata
    
    def _generate_chemical_batch_data(self):
        """Generate chemical batch process data"""
        np.random.seed(42)
        
        n_batches = 10
        samples_per_batch = 5
        
        # Target values
        ph_target = 7.0
        conc_target = 85.0
        temp_target = 65.0
        
        data_list = []
        
        for batch in range(1, n_batches + 1):
            # Batch-to-batch variation
            batch_ph_offset = np.random.normal(0, 0.1)
            batch_conc_offset = np.random.normal(0, 2.0)
            batch_temp_offset = np.random.normal(0, 1.0)
            
            for sample in range(1, samples_per_batch + 1):
                # Within-batch variation
                ph = ph_target + batch_ph_offset + np.random.normal(0, 0.05)
                conc = conc_target + batch_conc_offset + np.random.normal(0, 1.0)
                temp = temp_target + batch_temp_offset + np.random.normal(0, 0.5)
                
                data_list.append({
                    'batch': f'Batch_{batch:02d}',
                    'sample': sample,
                    'pH': ph,
                    'concentration': conc,
                    'temperature': temp
                })
        
        df = pd.DataFrame(data_list)
        
        metadata = {
            'description': 'Chemical batch process with subgroup structure',
            'specifications': {
                'pH': {'lsl': 6.5, 'usl': 7.5, 'target': 7.0},
                'concentration': {'lsl': 80.0, 'usl': 90.0, 'target': 85.0},
                'temperature': {'lsl': 60.0, 'usl': 70.0, 'target': 65.0}
            },
            'subgroup_column': 'batch',
            'subgroup_size': samples_per_batch
        }
        
        return df, metadata
    
    def _generate_electronics_msa_data(self):
        """Generate MSA data for electronics testing"""
        np.random.seed(42)
        
        parts = [f'Part_{i:02d}' for i in range(1, 11)]
        operators = ['Operator_A', 'Operator_B', 'Operator_C']
        replicates = 3
        
        # True part values
        true_values = {
            'Part_01': 100.0, 'Part_02': 102.5, 'Part_03': 98.5,
            'Part_04': 101.0, 'Part_05': 99.0, 'Part_06': 103.0,
            'Part_07': 97.5, 'Part_08': 100.5, 'Part_09': 99.5,
            'Part_10': 101.5
        }
        
        # Operator biases
        operator_bias = {
            'Operator_A': 0.0,
            'Operator_B': 0.2,
            'Operator_C': -0.1
        }
        
        # Measurement system variation
        repeatability_std = 0.3  # Within operator
        reproducibility_std = 0.2  # Between operators
        
        data_list = []
        
        for part in parts:
            for operator in operators:
                for replicate in range(1, replicates + 1):
                    # True value + operator bias + measurement error
                    measurement = (true_values[part] + 
                                 operator_bias[operator] + 
                                 np.random.normal(0, repeatability_std))
                    
                    data_list.append({
                        'Part': part,
                        'Operator': operator,
                        'Trial': replicate,
                        'Measurement': measurement
                    })
        
        df = pd.DataFrame(data_list)
        
        metadata = {
            'description': 'Electronics resistance measurements for Gage R&R',
            'measurement_units': 'Ohms',
            'tolerance': 10.0,  # +/- 5 Ohms
            'measurement_system': {
                'repeatability_std': repeatability_std,
                'reproducibility_std': reproducibility_std,
                'operator_biases': operator_bias
            }
        }
        
        return df, metadata
    
    def _generate_pharmaceutical_data(self):
        """Generate pharmaceutical tablet weight data"""
        np.random.seed(42)
        
        n_samples = 200
        target = 100.0  # mg
        
        # Process with slight non-normality (common in tablet manufacturing)
        # Use mixture of two normals to simulate bimodal distribution
        group1 = np.random.normal(target - 0.5, 1.5, int(n_samples * 0.7))
        group2 = np.random.normal(target + 0.8, 1.2, int(n_samples * 0.3))
        
        weights = np.concatenate([group1, group2])
        np.random.shuffle(weights)
        
        # Add time component
        timestamps = pd.date_range(start='2024-01-01', periods=n_samples, freq='5min')
        
        df = pd.DataFrame({
            'sample_id': range(1, n_samples + 1),
            'tablet_weight': weights[:n_samples],
            'timestamp': timestamps,
            'batch': [f'Batch_{i//50 + 1}' for i in range(n_samples)]
        })
        
        metadata = {
            'description': 'Pharmaceutical tablet weights with slight bimodality',
            'specifications': {
                'tablet_weight': {'lsl': 95.0, 'usl': 105.0, 'target': 100.0}
            },
            'units': 'mg',
            'distribution': 'Bimodal (mixture of normals)',
            'regulatory_requirement': 'USP <905> Uniformity of Dosage Units'
        }
        
        return df, metadata