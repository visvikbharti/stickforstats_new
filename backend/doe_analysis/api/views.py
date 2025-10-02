from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.http import FileResponse

from ..models import (
    ExperimentDesign, 
    FactorDefinition, 
    ResponseDefinition, 
    ModelAnalysis, 
    ExperimentRun, 
    OptimizationAnalysis
)
from .serializers import (
    ExperimentDesignSerializer,
    ExperimentDesignDetailSerializer,
    FactorDefinitionSerializer,
    ResponseDefinitionSerializer, 
    ModelAnalysisSerializer,
    ModelAnalysisDetailSerializer,
    ExperimentRunSerializer,
    OptimizationAnalysisSerializer,
    OptimizationAnalysisDetailSerializer,
    GenerateDesignSerializer,
    RunModelAnalysisSerializer,
    RunOptimizationSerializer
)
from ..services.design_generator import DesignGeneratorService
from ..services.model_analyzer import ModelAnalyzerService
from ..services.report_generator import ReportGeneratorService
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import pandas as pd
import json
import io


class ExperimentDesignViewSet(viewsets.ModelViewSet):
    """API endpoints for experiment designs"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter to only return experiment designs for the current user"""
        return ExperimentDesign.objects.filter(analysis_session__user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ExperimentDesignDetailSerializer
        if self.action == 'generate_design':
            return GenerateDesignSerializer
        return ExperimentDesignSerializer

    def create(self, request, *args, **kwargs):
        """Create an experiment design with an analysis session"""
        # First create an analysis session
# from core.models import AnalysisSession  # Models don't exist yet
from typing import Any as AnalysisSession  # Placeholder type
        session = AnalysisSession.objects.create(
            user=request.user,
            name=request.data.get('name', 'DOE Analysis Session'),
            analysis_type='DOE'
        )

        # Add the session ID to the request data
        mutable_data = request.data.copy()
        mutable_data['analysis_session'] = str(session.id)

        # Create the experiment design
        serializer = self.get_serializer(data=mutable_data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def upload_design_data(self, request, pk=None):
        """Upload experiment data for an existing design"""
        experiment = self.get_object()
        
        try:
            file = request.FILES.get('file')
            if not file:
                return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Read the CSV file
            df = pd.read_csv(file)
            
            # Validate that the columns match the expected factors and responses
            factor_names = list(FactorDefinition.objects.filter(
                experiment_design=experiment).values_list('name', flat=True))
            response_names = list(ResponseDefinition.objects.filter(
                experiment_design=experiment).values_list('name', flat=True))
            
            missing_factors = [f for f in factor_names if f not in df.columns]
            missing_responses = [r for r in response_names if r not in df.columns]
            
            if missing_factors or missing_responses:
                return Response({
                    "error": "CSV file is missing required columns",
                    "missing_factors": missing_factors,
                    "missing_responses": missing_responses
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Delete existing experiment runs for this design
            ExperimentRun.objects.filter(experiment_design=experiment).delete()
            
            # Create new experiment runs
            for _, row in df.iterrows():
                run = ExperimentRun.objects.create(
                    experiment_design=experiment,
                    run_order=row.get('run_order', 0),
                    factor_values={f: str(row[f]) for f in factor_names},
                    response_values={r: float(row[r]) for r in response_names}
                )
            
            return Response({"message": "Experiment data uploaded successfully"}, 
                          status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    @transaction.atomic
    def generate_design(self, request):
        """Generate a new experimental design based on provided parameters"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        design_type = serializer.validated_data['design_type']
        name = serializer.validated_data['name']
        description = serializer.validated_data['description']
        factors = serializer.validated_data['factors']
        responses = serializer.validated_data['responses']
        design_params = serializer.validated_data.get('design_params', {})
        
        try:
            # Create the experiment design
            experiment = ExperimentDesign.objects.create(
                name=name,
                description=description,
                design_type=design_type,
                user=request.user
            )
            
            # Create factor definitions
            for factor in factors:
                FactorDefinition.objects.create(
                    experiment_design=experiment,
                    name=factor['name'],
                    unit=factor.get('unit', ''),
                    data_type=factor.get('data_type', 'CONTINUOUS'),
                    low_level=factor.get('low_level'),
                    high_level=factor.get('high_level'),
                    center_point=factor.get('center_point'),
                    is_categorical=factor.get('is_categorical', False),
                    categories=factor.get('categories', [])
                )
                
            # Create response definitions
            for response in responses:
                ResponseDefinition.objects.create(
                    experiment_design=experiment,
                    name=response['name'],
                    unit=response.get('unit', ''),
                    description=response.get('description', ''),
                    target_value=response.get('target_value'),
                    lower_bound=response.get('lower_bound'),
                    upper_bound=response.get('upper_bound'),
                    weight=response.get('weight', 1.0)
                )
                
            # Generate the design matrix using the service
            design_service = DesignGeneratorService()
            design_matrix = design_service.generate_design(
                design_type=design_type,
                factors=[{
                    'name': f['name'],
                    'low_level': f.get('low_level'),
                    'high_level': f.get('high_level'),
                    'center_point': f.get('center_point'),
                    'is_categorical': f.get('is_categorical', False),
                    'categories': f.get('categories', [])
                } for f in factors],
                **design_params
            )
            
            # Create experiment runs with empty response values
            factor_names = [f['name'] for f in factors]
            response_names = [r['name'] for r in responses]
            
            for i, row in design_matrix.iterrows():
                ExperimentRun.objects.create(
                    experiment_design=experiment,
                    run_order=i + 1,
                    factor_values={f: str(row[f]) for f in factor_names},
                    response_values={r: None for r in response_names}
                )
            
            return Response(
                ExperimentDesignDetailSerializer(experiment).data, 
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def export_design(self, request, pk=None):
        """Export the design matrix as a CSV file"""
        experiment = self.get_object()
        runs = ExperimentRun.objects.filter(experiment_design=experiment)
        
        if not runs.exists():
            return Response(
                {"error": "No runs found for this experiment"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create a DataFrame from the runs
        factor_names = list(FactorDefinition.objects.filter(
            experiment_design=experiment).values_list('name', flat=True))
        response_names = list(ResponseDefinition.objects.filter(
            experiment_design=experiment).values_list('name', flat=True))
        
        data = []
        for run in runs:
            row = {'run_order': run.run_order}
            row.update(run.factor_values)
            row.update(run.response_values)
            data.append(row)
        
        df = pd.DataFrame(data)
        
        # Create a CSV file in memory
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_buffer.seek(0)
        
        # Create a response with the CSV file
        response = FileResponse(
            io.BytesIO(csv_buffer.getvalue().encode()),
            as_attachment=True,
            filename=f"{experiment.name}_design.csv"
        )
        
        return response


class ModelAnalysisViewSet(viewsets.ModelViewSet):
    """API endpoints for model analysis"""
    queryset = ModelAnalysis.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ModelAnalysisDetailSerializer
        if self.action == 'run_analysis':
            return RunModelAnalysisSerializer
        return ModelAnalysisSerializer
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    @transaction.atomic
    def run_analysis(self, request):
        """Run a model analysis on an experiment design"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        experiment_id = serializer.validated_data['experiment_design_id']
        analysis_type = serializer.validated_data['analysis_type']
        name = serializer.validated_data['name']
        description = serializer.validated_data.get('description', '')
        responses = serializer.validated_data['responses']
        analysis_params = serializer.validated_data.get('analysis_params', {})
        
        try:
            experiment = ExperimentDesign.objects.get(id=experiment_id)
            
            # Create a unique channel name for WebSocket updates
            channel_name = f"analysis_{request.user.id}_{experiment_id}"
            
            # Create the model analysis
            analysis = ModelAnalysis.objects.create(
                experiment_design=experiment,
                name=name,
                description=description,
                analysis_type=analysis_type,
                user=request.user,
                status='RUNNING',
                responses=responses
            )
            
            # Get the run data
            runs = ExperimentRun.objects.filter(experiment_design=experiment)
            if not runs.exists():
                analysis.status = 'FAILED'
                analysis.error_message = "No experiment runs found"
                analysis.save()
                return Response(
                    {"error": "No experiment runs found"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if all required response data is available
            missing_responses = []
            for run in runs:
                for response_name in responses:
                    if response_name not in run.response_values or run.response_values[response_name] is None:
                        missing_responses.append(f"Run {run.run_order}, response {response_name}")
            
            if missing_responses:
                analysis.status = 'FAILED'
                analysis.error_message = f"Missing response data: {', '.join(missing_responses[:5])}"
                analysis.save()
                return Response(
                    {"error": f"Missing response data: {', '.join(missing_responses[:5])}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create a DataFrame from the runs
            factor_names = list(FactorDefinition.objects.filter(
                experiment_design=experiment).values_list('name', flat=True))
            
            data = []
            for run in runs:
                row = {'run_order': run.run_order}
                row.update(run.factor_values)
                row.update({k: v for k, v in run.response_values.items() if k in responses})
                data.append(row)
            
            df = pd.DataFrame(data)
            
            # Get the service and run the analysis
            analyzer = ModelAnalyzerService()
            
            # Start the analysis in a background Celery task
            # But for now, run it synchronously for simplicity
            result = analyzer.analyze_model(
                design_type=experiment.design_type,
                data=df,
                factor_names=factor_names,
                response_names=responses,
                analysis_type=analysis_type,
                **analysis_params
            )
            
            # Update the analysis with the results
            analysis.status = 'COMPLETED'
            analysis.results = result
            analysis.save()
            
            # Send a WebSocket message to notify the client
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                channel_name,
                {
                    'type': 'analysis_status',
                    'message': {
                        'status': 'COMPLETED',
                        'analysis_id': analysis.id
                    }
                }
            )
            
            return Response(
                ModelAnalysisDetailSerializer(analysis).data, 
                status=status.HTTP_201_CREATED
            )
            
        except ExperimentDesign.DoesNotExist:
            return Response(
                {"error": "Experiment design not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def generate_report(self, request, pk=None):
        """Generate a report for the model analysis"""
        analysis = self.get_object()
        
        # Initialize the report generator service
        report_service = ReportGeneratorService()
        
        # Generate the report (this would typically be asynchronous)
        report_file = report_service.generate_model_analysis_report(analysis)
        
        # Return the file as a download
        return FileResponse(
            open(report_file, 'rb'),
            as_attachment=True,
            filename=f"{analysis.name}_report.pdf"
        )


class OptimizationAnalysisViewSet(viewsets.ModelViewSet):
    """API endpoints for optimization analysis"""
    queryset = OptimizationAnalysis.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return OptimizationAnalysisDetailSerializer
        if self.action == 'run_optimization':
            return RunOptimizationSerializer
        return OptimizationAnalysisSerializer
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    @transaction.atomic
    def run_optimization(self, request):
        """Run optimization on a model analysis"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        model_analysis_id = serializer.validated_data['model_analysis_id']
        name = serializer.validated_data['name']
        description = serializer.validated_data.get('description', '')
        optimization_type = serializer.validated_data['optimization_type']
        response_goals = serializer.validated_data['response_goals']
        constraints = serializer.validated_data.get('constraints', [])
        optimization_params = serializer.validated_data.get('optimization_params', {})
        
        try:
            model_analysis = ModelAnalysis.objects.get(id=model_analysis_id)
            
            # Create a unique channel name for WebSocket updates
            channel_name = f"optimization_{request.user.id}_{model_analysis_id}"
            
            # Create the optimization analysis
            optimization = OptimizationAnalysis.objects.create(
                model_analysis=model_analysis,
                name=name,
                description=description,
                optimization_type=optimization_type,
                user=request.user,
                status='RUNNING',
                response_goals=response_goals,
                constraints=constraints
            )
            
            # Ensure the model analysis is complete
            if model_analysis.status != 'COMPLETED':
                optimization.status = 'FAILED'
                optimization.error_message = "Model analysis is not completed"
                optimization.save()
                return Response(
                    {"error": "Model analysis is not completed"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the factor and response information
            experiment = model_analysis.experiment_design
            factors = FactorDefinition.objects.filter(experiment_design=experiment)
            
            factor_info = []
            for factor in factors:
                factor_info.append({
                    'name': factor.name,
                    'low_level': factor.low_level,
                    'high_level': factor.high_level,
                    'is_categorical': factor.is_categorical,
                    'categories': factor.categories
                })
            
            # Get the model results from the analysis
            model_results = model_analysis.results
            
            # Get the analyzer service and run the optimization
            analyzer = ModelAnalyzerService()
            
            # Start the optimization in a background Celery task
            # But for now, run it synchronously for simplicity
            result = analyzer.optimize_response(
                model_results=model_results,
                factors=factor_info,
                response_goals=response_goals,
                constraints=constraints,
                optimization_type=optimization_type,
                **optimization_params
            )
            
            # Update the optimization with the results
            optimization.status = 'COMPLETED'
            optimization.results = result
            optimization.save()
            
            # Send a WebSocket message to notify the client
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                channel_name,
                {
                    'type': 'optimization_status',
                    'message': {
                        'status': 'COMPLETED',
                        'optimization_id': optimization.id
                    }
                }
            )
            
            return Response(
                OptimizationAnalysisDetailSerializer(optimization).data, 
                status=status.HTTP_201_CREATED
            )
            
        except ModelAnalysis.DoesNotExist:
            return Response(
                {"error": "Model analysis not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def generate_report(self, request, pk=None):
        """Generate a report for the optimization analysis"""
        optimization = self.get_object()
        
        # Initialize the report generator service
        report_service = ReportGeneratorService()
        
        # Generate the report (this would typically be asynchronous)
        report_file = report_service.generate_optimization_report(optimization)
        
        # Return the file as a download
        return FileResponse(
            open(report_file, 'rb'),
            as_attachment=True,
            filename=f"{optimization.name}_report.pdf"
        )