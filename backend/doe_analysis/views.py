"""
Simplified API views for DOE analysis.
These provide a simpler interface than the ViewSet-based API.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.db import transaction
from django.http import FileResponse

from .models import (
    ExperimentDesign,
    FactorDefinition,
    ResponseDefinition,
    ModelAnalysis,
    ExperimentRun,
    OptimizationAnalysis,
)
from .api.serializers import (
    GenerateDesignSerializer,
    ExperimentDesignDetailSerializer,
    RunModelAnalysisSerializer,
    ModelAnalysisDetailSerializer,
    RunOptimizationSerializer,
    OptimizationAnalysisDetailSerializer,
)
from .services.design_generator import DesignGeneratorService
from .services.model_analyzer import ModelAnalyzerService
from .services.report_generator import ReportGeneratorService
from core.models import AnalysisSession
import pandas as pd
import logging

logger = logging.getLogger(__name__)


class GenerateDesignView(APIView):
    """Generate a new experimental design"""

    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = GenerateDesignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        design_type = serializer.validated_data["design_type"]
        name = serializer.validated_data["name"]
        description = serializer.validated_data.get("description", "")
        factors = serializer.validated_data["factors"]
        responses = serializer.validated_data["responses"]
        design_params = serializer.validated_data.get("design_params", {})

        try:
            session = AnalysisSession.objects.create(
                user=request.user if request.user.is_authenticated else None, name=f"DOE: {name}", analysis_type="DOE"
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
                    name=factor["name"],
                    symbol=factor.get("symbol", f"X{i+1}"),
                    units=factor.get("unit", ""),
                    factor_type=factor.get("data_type", "CONTINUOUS"),
                    low_level=factor.get("low_level"),
                    high_level=factor.get("high_level"),
                    center_point=factor.get("center_point"),
                    level_values=factor.get("categories", []),
                )

            for i, resp in enumerate(responses):
                ResponseDefinition.objects.create(
                    experiment_design=experiment,
                    name=resp["name"],
                    symbol=resp.get("symbol", f"Y{i+1}"),
                    units=resp.get("unit", ""),
                    description=resp.get("description", ""),
                    objective=resp.get("objective", "none"),
                    target_value=resp.get("target_value"),
                    lower_bound=resp.get("lower_bound"),
                    upper_bound=resp.get("upper_bound"),
                    importance=resp.get("weight", 3),
                )

            design_service = DesignGeneratorService()
            design_matrix = design_service.generate_design(
                design_type=design_type,
                factors=[
                    {
                        "name": f["name"],
                        "low_level": f.get("low_level"),
                        "high_level": f.get("high_level"),
                        "center_point": f.get("center_point"),
                        "is_categorical": f.get("data_type", "CONTINUOUS") == "CATEGORICAL",
                        "categories": f.get("categories", []),
                    }
                    for f in factors
                ],
                **design_params,
            )

            factor_names = [f["name"] for f in factors]
            response_names = [r["name"] for r in responses]

            for i, row in design_matrix.iterrows():
                ExperimentRun.objects.create(
                    experiment_design=experiment,
                    run_order=i + 1,
                    standard_order=i + 1,
                    factor_values={f: str(row[f]) for f in factor_names if f in row},
                    response_values={r: None for r in response_names},
                )

            experiment.num_runs = len(design_matrix)
            experiment.save(update_fields=["num_runs"])

            return Response(ExperimentDesignDetailSerializer(experiment).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.exception("Error generating design")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AnalyzeExperimentView(APIView):
    """Run model analysis on an experiment"""

    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = RunModelAnalysisSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        experiment_id = serializer.validated_data["experiment_design_id"]
        analysis_type = serializer.validated_data["analysis_type"]
        name = serializer.validated_data["name"]
        description = serializer.validated_data.get("description", "")
        responses = serializer.validated_data["responses"]
        analysis_params = serializer.validated_data.get("analysis_params", {})

        try:
            experiment = ExperimentDesign.objects.get(id=experiment_id)

            analysis = ModelAnalysis.objects.create(
                experiment_design=experiment,
                response_name=responses[0] if responses else "",
                name=name,
                description=description,
                model_type=analysis_type,
                status="RUNNING",
                responses=responses,
            )

            runs = experiment.runs.all()
            if not runs.exists():
                analysis.status = "FAILED"
                analysis.error_message = "No experiment runs found"
                analysis.save()
                return Response({"error": "No experiment runs found"}, status=status.HTTP_400_BAD_REQUEST)

            factor_names = list(experiment.factors.values_list("name", flat=True))
            data = []
            for run in runs:
                row = {"run_order": run.run_order}
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
                **analysis_params,
            )

            analysis.status = "COMPLETED"
            analysis.results = result
            analysis.save()

            return Response(ModelAnalysisDetailSerializer(analysis).data, status=status.HTTP_201_CREATED)
        except ExperimentDesign.DoesNotExist:
            return Response({"error": "Experiment design not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception("Error analyzing experiment")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class OptimizeResponseView(APIView):
    """Run optimization on a model analysis"""

    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = RunOptimizationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        model_analysis_id = serializer.validated_data["model_analysis_id"]
        name = serializer.validated_data["name"]
        description = serializer.validated_data.get("description", "")
        optimization_type = serializer.validated_data["optimization_type"]
        response_goals = serializer.validated_data["response_goals"]
        constraints = serializer.validated_data.get("constraints", [])
        optimization_params = serializer.validated_data.get("optimization_params", {})

        try:
            model_analysis = ModelAnalysis.objects.get(id=model_analysis_id)
            experiment = model_analysis.experiment_design

            optimization = OptimizationAnalysis.objects.create(
                experiment_design=experiment,
                model_analysis=model_analysis,
                name=name,
                description=description,
                optimization_type=optimization_type,
                status="RUNNING",
                response_goals=response_goals,
                constraints=constraints,
            )

            if model_analysis.status != "COMPLETED":
                optimization.status = "FAILED"
                optimization.error_message = "Model analysis is not completed"
                optimization.save()
                return Response({"error": "Model analysis is not completed"}, status=status.HTTP_400_BAD_REQUEST)

            factors = experiment.factors.all()
            factor_info = [
                {
                    "name": f.name,
                    "low_level": f.low_level,
                    "high_level": f.high_level,
                    "is_categorical": f.factor_type == "CATEGORICAL",
                    "categories": f.level_values,
                }
                for f in factors
            ]

            analyzer = ModelAnalyzerService()
            result = analyzer.optimize_response(
                model_results=model_analysis.results,
                factors=factor_info,
                response_goals=response_goals,
                constraints=constraints,
                optimization_type=optimization_type,
                **optimization_params,
            )

            optimization.status = "COMPLETED"
            optimization.results = result
            optimization.save()

            return Response(OptimizationAnalysisDetailSerializer(optimization).data, status=status.HTTP_201_CREATED)
        except ModelAnalysis.DoesNotExist:
            return Response({"error": "Model analysis not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception("Error optimizing response")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class GenerateReportView(APIView):
    """Generate a report for a model or optimization analysis"""

    permission_classes = [AllowAny]

    def post(self, request):
        analysis_id = request.data.get("analysis_id")
        report_type = request.data.get("report_type", "model")

        try:
            report_service = ReportGeneratorService()

            if report_type == "optimization":
                optimization = OptimizationAnalysis.objects.get(id=analysis_id)
                report_file = report_service.generate_optimization_report(optimization)
            else:
                analysis = ModelAnalysis.objects.get(id=analysis_id)
                report_file = report_service.generate_model_analysis_report(analysis)

            return FileResponse(open(report_file, "rb"), as_attachment=True, filename="doe_report.pdf")
        except (ModelAnalysis.DoesNotExist, OptimizationAnalysis.DoesNotExist):
            return Response({"error": "Analysis not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception("Error generating report")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ScreeningAnalysisView(APIView):
    """Screening design analysis"""

    permission_classes = [AllowAny]

    def post(self, request):
        """Run a screening analysis (main effects model for screening designs)"""
        design_id = request.data.get("experiment_design_id")
        try:
            experiment = ExperimentDesign.objects.get(id=design_id)
            if experiment.design_type not in ["PLACKETT_BURMAN", "FRACTIONAL_FACTORIAL", "DEFINITIVE_SCREENING"]:
                return Response(
                    {"error": "Screening analysis requires a screening design type"}, status=status.HTTP_400_BAD_REQUEST
                )

            runs = experiment.runs.all()
            if not runs.exists():
                return Response({"error": "No experiment runs found"}, status=status.HTTP_400_BAD_REQUEST)

            factor_names = list(experiment.factors.values_list("name", flat=True))
            response_names = list(experiment.responses.values_list("name", flat=True))

            data = []
            for run in runs:
                row = {"run_order": run.run_order}
                row.update(run.factor_values)
                row.update(run.response_values)
                data.append(row)
            df = pd.DataFrame(data)

            # Use linear model analysis for screening (main effects only)
            analyzer = ModelAnalyzerService()
            result = analyzer.analyze_model(
                design_type=experiment.design_type,
                data=df,
                factor_names=factor_names,
                response_names=response_names,
                analysis_type="linear",
            )

            return Response(result, status=status.HTTP_200_OK)
        except ExperimentDesign.DoesNotExist:
            return Response({"error": "Experiment design not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception("Error in screening analysis")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class DOEExamplesView(APIView):
    """Provide example designs and datasets"""

    permission_classes = [AllowAny]

    def get(self, request):
        """Return available DOE example configurations"""
        examples = {
            "factorial_2k": {
                "name": "2^k Factorial Design",
                "description": "Full factorial design with 2 levels per factor",
                "design_type": "FACTORIAL",
                "factors": [
                    {"name": "Temperature", "symbol": "X1", "unit": "C", "low_level": 150, "high_level": 200},
                    {"name": "Pressure", "symbol": "X2", "unit": "psi", "low_level": 50, "high_level": 100},
                    {"name": "Time", "symbol": "X3", "unit": "min", "low_level": 10, "high_level": 30},
                ],
                "responses": [
                    {"name": "Yield", "symbol": "Y1", "unit": "%", "objective": "maximize"},
                    {"name": "Purity", "symbol": "Y2", "unit": "%", "objective": "maximize"},
                ],
            },
            "ccd": {
                "name": "Central Composite Design",
                "description": "CCD for response surface methodology",
                "design_type": "CENTRAL_COMPOSITE",
                "factors": [
                    {"name": "Temperature", "symbol": "X1", "unit": "C", "low_level": 150, "high_level": 200},
                    {"name": "Concentration", "symbol": "X2", "unit": "mol/L", "low_level": 0.5, "high_level": 2.0},
                ],
                "responses": [{"name": "Conversion", "symbol": "Y1", "unit": "%", "objective": "maximize"}],
            },
            "box_behnken": {
                "name": "Box-Behnken Design",
                "description": "Box-Behnken design for 3 factors",
                "design_type": "BOX_BEHNKEN",
                "factors": [
                    {"name": "Speed", "symbol": "X1", "unit": "rpm", "low_level": 100, "high_level": 500},
                    {"name": "Feed Rate", "symbol": "X2", "unit": "mm/min", "low_level": 50, "high_level": 200},
                    {"name": "Depth", "symbol": "X3", "unit": "mm", "low_level": 0.5, "high_level": 2.0},
                ],
                "responses": [{"name": "Surface Roughness", "symbol": "Y1", "unit": "um", "objective": "minimize"}],
            },
            "plackett_burman": {
                "name": "Plackett-Burman Screening",
                "description": "Screening design for identifying significant factors",
                "design_type": "PLACKETT_BURMAN",
                "factors": [
                    {"name": "Factor A", "symbol": "A", "low_level": -1, "high_level": 1},
                    {"name": "Factor B", "symbol": "B", "low_level": -1, "high_level": 1},
                    {"name": "Factor C", "symbol": "C", "low_level": -1, "high_level": 1},
                    {"name": "Factor D", "symbol": "D", "low_level": -1, "high_level": 1},
                ],
                "responses": [{"name": "Response", "symbol": "Y", "objective": "maximize"}],
            },
        }
        return Response(examples, status=status.HTTP_200_OK)
