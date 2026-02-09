from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db import transaction
from django.http import FileResponse

from core.models import AnalysisSession
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
import pandas as pd
import io
import logging

logger = logging.getLogger(__name__)


class ExperimentDesignViewSet(viewsets.ModelViewSet):
    """API endpoints for experiment designs"""
    queryset = ExperimentDesign.objects.all()
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ExperimentDesignDetailSerializer
        if self.action == 'generate_design':
            return GenerateDesignSerializer
        return ExperimentDesignSerializer

    def create(self, request, *args, **kwargs):
        """Create an experiment design with an analysis session"""
        session = AnalysisSession.objects.create(
            user=request.user if request.user.is_authenticated else None,
            name=request.data.get('name', 'DOE Analysis Session'),
            analysis_type='DOE'
        )

        mutable_data = request.data.copy()
        mutable_data['analysis_session'] = str(session.id)

        serializer = self.get_serializer(data=mutable_data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50MB

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def upload_design_data(self, request, pk=None):
        """Upload experiment data for an existing design"""
        experiment = self.get_object()

        try:
            file = request.FILES.get('file')
            if not file:
                return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

            if file.size > self.MAX_UPLOAD_SIZE:
                return Response(
                    {"error": f"File too large. Maximum size is {self.MAX_UPLOAD_SIZE // (1024 * 1024)}MB."},
                    status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
                )

            df = pd.read_csv(file)

            factor_names = list(experiment.factors.values_list('name', flat=True))
            response_names = list(experiment.responses.values_list('name', flat=True))

            missing_factors = [f for f in factor_names if f not in df.columns]
            missing_responses = [r for r in response_names if r not in df.columns]

            if missing_factors or missing_responses:
                return Response({
                    "error": "CSV file is missing required columns",
                    "missing_factors": missing_factors,
                    "missing_responses": missing_responses
                }, status=status.HTTP_400_BAD_REQUEST)

            experiment.runs.all().delete()

            for idx, row in df.iterrows():
                ExperimentRun.objects.create(
                    experiment_design=experiment,
                    run_order=row.get('run_order', idx + 1),
                    standard_order=row.get('standard_order', idx + 1),
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
        description = serializer.validated_data.get('description', '')
        factors = serializer.validated_data['factors']
        responses = serializer.validated_data['responses']
        design_params = serializer.validated_data.get('design_params', {})

        try:
            session = AnalysisSession.objects.create(
                user=request.user if request.user.is_authenticated else None,
                name=f'DOE: {name}',
                analysis_type='DOE'
            )

            experiment = ExperimentDesign.objects.create(
                analysis_session=session,
                name=name,
                description=description,
                design_type=design_type,
                num_factors=len(factors),
                num_runs=0,
            )

            for i, factor in enumerate(factors):
                FactorDefinition.objects.create(
                    experiment_design=experiment,
                    name=factor['name'],
                    symbol=factor.get('symbol', f'X{i+1}'),
                    units=factor.get('unit', ''),
                    factor_type=factor.get('data_type', 'CONTINUOUS'),
                    low_level=factor.get('low_level'),
                    high_level=factor.get('high_level'),
                    center_point=factor.get('center_point'),
                    level_values=factor.get('categories', [])
                )

            for i, resp in enumerate(responses):
                ResponseDefinition.objects.create(
                    experiment_design=experiment,
                    name=resp['name'],
                    symbol=resp.get('symbol', f'Y{i+1}'),
                    units=resp.get('unit', ''),
                    description=resp.get('description', ''),
                    objective=resp.get('objective', 'none'),
                    target_value=resp.get('target_value'),
                    lower_bound=resp.get('lower_bound'),
                    upper_bound=resp.get('upper_bound'),
                    importance=resp.get('weight', 3)
                )

            design_service = DesignGeneratorService()
            design_matrix = design_service.generate_design(
                design_type=design_type,
                factors=[{
                    'name': f['name'],
                    'low_level': f.get('low_level'),
                    'high_level': f.get('high_level'),
                    'center_point': f.get('center_point'),
                    'is_categorical': f.get('data_type', 'CONTINUOUS') == 'CATEGORICAL',
                    'categories': f.get('categories', [])
                } for f in factors],
                **design_params
            )

            factor_names = [f['name'] for f in factors]
            response_names = [r['name'] for r in responses]

            for i, row in design_matrix.iterrows():
                ExperimentRun.objects.create(
                    experiment_design=experiment,
                    run_order=i + 1,
                    standard_order=i + 1,
                    factor_values={f: str(row[f]) for f in factor_names if f in row},
                    response_values={r: None for r in response_names}
                )

            experiment.num_runs = len(design_matrix)
            experiment.save(update_fields=['num_runs'])

            return Response(
                ExperimentDesignDetailSerializer(experiment).data,
                status=status.HTTP_201_CREATED
            )

        except Exception as e:
            logger.exception("Error generating design")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def export_design(self, request, pk=None):
        """Export the design matrix as a CSV file"""
        experiment = self.get_object()
        runs = experiment.runs.all()

        if not runs.exists():
            return Response(
                {"error": "No runs found for this experiment"},
                status=status.HTTP_404_NOT_FOUND
            )

        factor_names = list(experiment.factors.values_list('name', flat=True))
        response_names = list(experiment.responses.values_list('name', flat=True))

        data = []
        for run in runs:
            row = {'run_order': run.run_order}
            row.update(run.factor_values)
            row.update(run.response_values)
            data.append(row)

        df = pd.DataFrame(data)

        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_buffer.seek(0)

        response = FileResponse(
            io.BytesIO(csv_buffer.getvalue().encode()),
            as_attachment=True,
            filename=f"{experiment.name}_design.csv"
        )

        return response


class ModelAnalysisViewSet(viewsets.ModelViewSet):
    """API endpoints for model analysis"""
    queryset = ModelAnalysis.objects.all()
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ModelAnalysisDetailSerializer
        if self.action == 'run_analysis':
            return RunModelAnalysisSerializer
        return ModelAnalysisSerializer

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

            analysis = ModelAnalysis.objects.create(
                experiment_design=experiment,
                response_name=responses[0] if responses else '',
                name=name,
                description=description,
                model_type=analysis_type,
                status='RUNNING',
                responses=responses
            )

            runs = experiment.runs.all()
            if not runs.exists():
                analysis.status = 'FAILED'
                analysis.error_message = "No experiment runs found"
                analysis.save()
                return Response(
                    {"error": "No experiment runs found"},
                    status=status.HTTP_400_BAD_REQUEST
                )

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

            factor_names = list(experiment.factors.values_list('name', flat=True))

            data = []
            for run in runs:
                row = {'run_order': run.run_order}
                row.update(run.factor_values)
                row.update({k: v for k, v in run.response_values.items() if k in responses})
                data.append(row)

            df = pd.DataFrame(data)

            analyzer = ModelAnalyzerService()
            result = analyzer.analyze_model(
                design_type=experiment.design_type,
                data=df,
                factor_names=factor_names,
                response_names=responses,
                analysis_type=analysis_type,
                **analysis_params
            )

            analysis.status = 'COMPLETED'
            analysis.results = result
            analysis.save()

            # WebSocket notification (optional, fails gracefully)
            try:
                from channels.layers import get_channel_layer
                from asgiref.sync import async_to_sync
                channel_layer = get_channel_layer()
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        f"analysis_{experiment.id}",
                        {'type': 'analysis_status', 'message': {
                            'status': 'COMPLETED', 'analysis_id': str(analysis.id)
                        }}
                    )
            except Exception:
                pass

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
            logger.exception("Error running analysis")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def generate_report(self, request, pk=None):
        """Generate a report for the model analysis"""
        analysis = self.get_object()
        report_service = ReportGeneratorService()
        report_file = report_service.generate_model_analysis_report(analysis)
        return FileResponse(
            open(report_file, 'rb'),
            as_attachment=True,
            filename=f"{analysis.name}_report.pdf"
        )


class OptimizationAnalysisViewSet(viewsets.ModelViewSet):
    """API endpoints for optimization analysis"""
    queryset = OptimizationAnalysis.objects.all()
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return OptimizationAnalysisDetailSerializer
        if self.action == 'run_optimization':
            return RunOptimizationSerializer
        return OptimizationAnalysisSerializer

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
            experiment = model_analysis.experiment_design

            optimization = OptimizationAnalysis.objects.create(
                experiment_design=experiment,
                model_analysis=model_analysis,
                name=name,
                description=description,
                optimization_type=optimization_type,
                status='RUNNING',
                response_goals=response_goals,
                constraints=constraints
            )

            if model_analysis.status != 'COMPLETED':
                optimization.status = 'FAILED'
                optimization.error_message = "Model analysis is not completed"
                optimization.save()
                return Response(
                    {"error": "Model analysis is not completed"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            factors = experiment.factors.all()
            factor_info = []
            for factor in factors:
                factor_info.append({
                    'name': factor.name,
                    'low_level': factor.low_level,
                    'high_level': factor.high_level,
                    'is_categorical': factor.factor_type == 'CATEGORICAL',
                    'categories': factor.level_values
                })

            model_results = model_analysis.results

            analyzer = ModelAnalyzerService()
            result = analyzer.optimize_response(
                model_results=model_results,
                factors=factor_info,
                response_goals=response_goals,
                constraints=constraints,
                optimization_type=optimization_type,
                **optimization_params
            )

            optimization.status = 'COMPLETED'
            optimization.results = result
            optimization.save()

            # WebSocket notification (optional, fails gracefully)
            try:
                from channels.layers import get_channel_layer
                from asgiref.sync import async_to_sync
                channel_layer = get_channel_layer()
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        f"optimization_{experiment.id}",
                        {'type': 'optimization_status', 'message': {
                            'status': 'COMPLETED', 'optimization_id': str(optimization.id)
                        }}
                    )
            except Exception:
                pass

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
            logger.exception("Error running optimization")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def generate_report(self, request, pk=None):
        """Generate a report for the optimization analysis"""
        optimization = self.get_object()
        report_service = ReportGeneratorService()
        report_file = report_service.generate_optimization_report(optimization)
        return FileResponse(
            open(report_file, 'rb'),
            as_attachment=True,
            filename=f"{optimization.name}_report.pdf"
        )
