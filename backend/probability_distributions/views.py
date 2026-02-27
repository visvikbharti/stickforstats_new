"""
Simplified API views for probability distributions.

These views provide stateless access to distribution calculations
without requiring a project or authentication context.
"""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from .services.distribution_service import DistributionService


class CreateDistributionView(APIView):
    """Create a distribution and return its properties/statistics."""

    permission_classes = [AllowAny]

    def post(self, request):
        distribution_type = request.data.get("distribution_type")
        parameters = request.data.get("parameters", {})

        if not distribution_type:
            return Response({"error": "distribution_type is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = DistributionService.create_distribution(distribution_type, parameters)
            return Response(result)
        except (ValueError, TypeError) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CalculateProbabilityView(APIView):
    """Calculate probability for a given distribution."""

    permission_classes = [AllowAny]

    def post(self, request):
        distribution_type = request.data.get("distribution_type")
        parameters = request.data.get("parameters", {})
        probability_type = request.data.get("probability_type", "less_than")
        x_value = request.data.get("x_value")
        lower_bound = request.data.get("lower_bound")
        upper_bound = request.data.get("upper_bound")

        if not distribution_type:
            return Response({"error": "distribution_type is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = DistributionService.calculate_probability(
                distribution_type,
                parameters,
                probability_type,
                lower_bound=lower_bound,
                upper_bound=upper_bound,
                x_value=x_value,
            )
            return Response(result)
        except (ValueError, TypeError) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class GenerateRandomSampleView(APIView):
    """Generate random samples from a distribution."""

    permission_classes = [AllowAny]

    def post(self, request):
        distribution_type = request.data.get("distribution_type")
        parameters = request.data.get("parameters", {})
        sample_size = request.data.get("sample_size", 100)
        seed = request.data.get("seed")

        if not distribution_type:
            return Response({"error": "distribution_type is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = DistributionService.generate_random_sample(distribution_type, parameters, sample_size, seed)
            return Response(result)
        except (ValueError, TypeError) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class FitDistributionView(APIView):
    """Fit distribution(s) to provided data."""

    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data.get("data")
        distribution_types = request.data.get("distribution_types")

        if not data:
            return Response({"error": "data is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = DistributionService.fit_distribution(data, distribution_types)
            return Response(result)
        except (ValueError, TypeError) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CompareApproximationsView(APIView):
    """Compare binomial approximations (Poisson and Normal)."""

    permission_classes = [AllowAny]

    def post(self, request):
        n = request.data.get("n")
        p = request.data.get("p")
        approximation_types = request.data.get("approximation_types")

        if n is None or p is None:
            return Response({"error": "n and p are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = DistributionService.compare_binomial_approximations(n, p, approximation_types)
            return Response(result)
        except (ValueError, TypeError) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ProcessCapabilityView(APIView):
    """Calculate process capability indices."""

    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data.get("data")
        lsl = request.data.get("lsl")
        usl = request.data.get("usl")
        target = request.data.get("target")

        if not data or lsl is None or usl is None:
            return Response({"error": "data, lsl, and usl are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = DistributionService.calculate_process_capability(data, lsl, usl, target)
            return Response(result)
        except (ValueError, TypeError) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SimulatePoissonProcessView(APIView):
    """Simulate a Poisson process."""

    permission_classes = [AllowAny]

    def post(self, request):
        rate = request.data.get("rate")
        time_period = request.data.get("time_period")
        num_simulations = request.data.get("num_simulations", 1)
        seed = request.data.get("seed")

        if rate is None or time_period is None:
            return Response({"error": "rate and time_period are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = DistributionService.simulate_poisson_process(rate, time_period, num_simulations, seed)
            return Response(result)
        except (ValueError, TypeError) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class DistributionExamplesView(APIView):
    """Return example distributions and use cases."""

    permission_classes = [AllowAny]

    def get(self, request):
        examples = {
            "discrete": [
                {
                    "name": "Binomial",
                    "type": "BINOMIAL",
                    "example_params": {"n": 10, "p": 0.5},
                    "use_case": "Number of successes in n independent trials",
                },
                {
                    "name": "Poisson",
                    "type": "POISSON",
                    "example_params": {"lambda": 5.0},
                    "use_case": "Number of events in a fixed interval",
                },
            ],
            "continuous": [
                {
                    "name": "Normal",
                    "type": "NORMAL",
                    "example_params": {"mu": 0, "sigma": 1},
                    "use_case": "Most common continuous distribution (CLT)",
                },
                {
                    "name": "Exponential",
                    "type": "EXPONENTIAL",
                    "example_params": {"lambda": 1.0},
                    "use_case": "Time between events in a Poisson process",
                },
                {
                    "name": "Gamma",
                    "type": "GAMMA",
                    "example_params": {"alpha": 2.0, "beta": 1.0},
                    "use_case": "Generalization of exponential and chi-squared",
                },
            ],
        }
        return Response(examples)
