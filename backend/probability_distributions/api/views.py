from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from ..models import (
    DistributionProject, Distribution, DistributionVisualization,
    DataSet, DistributionFitting, DistributionComparison,
    BinomialApproximation, ApplicationSimulation
)
from .serializers import (
    DistributionProjectSerializer, DistributionSerializer,
    DistributionVisualizationSerializer, DataSetSerializer,
    DistributionFittingSerializer, DistributionComparisonSerializer,
    BinomialApproximationSerializer, ApplicationSimulationSerializer,
    ProbabilityCalculationSerializer, RandomSampleSerializer,
    BinomialApproximationRequestSerializer, DataFittingRequestSerializer,
    ProcessCapabilityRequestSerializer, ClinicalTrialSimulationSerializer
)
from ..services.distribution_service import DistributionService


class DistributionProjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing distribution projects.
    Provides CRUD operations and custom actions for project management.
    """
    serializer_class = DistributionProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DistributionProject.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Create a copy of an existing distribution project with all its associated data.
        """
        original_project = self.get_object()
        
        # Create new project
        new_project = DistributionProject.objects.create(
            user=request.user,
            name=f"Copy of {original_project.name}",
            description=original_project.description
        )
        
        # Copy distributions and related data
        for dist in original_project.distributions.all():
            new_dist = Distribution.objects.create(
                project=new_project,
                distribution_type=dist.distribution_type,
                parameters=dist.parameters,
                name=dist.name,
                description=dist.description
            )
            
            # Copy visualizations
            for viz in dist.visualizations.all():
                DistributionVisualization.objects.create(
                    distribution=new_dist,
                    plot_type=viz.plot_type,
                    settings=viz.settings
                )
        
        # Copy datasets
        for dataset in original_project.datasets.all():
            DataSet.objects.create(
                project=new_project,
                name=dataset.name,
                description=dataset.description,
                data=dataset.data,
                metadata=dataset.metadata
            )
            
        return Response(DistributionProjectSerializer(new_project).data)


class DistributionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing probability distributions.
    Provides CRUD operations and calculations for distributions.
    """
    serializer_class = DistributionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Distribution.objects.filter(project__user=self.request.user)
    
    def perform_create(self, serializer):
        project_id = self.request.data.get('project')
        project = get_object_or_404(DistributionProject, id=project_id, user=self.request.user)
        serializer.save(project=project)

    @action(detail=True, methods=['post'])
    def calculate_pmf_pdf(self, request, pk=None):
        """
        Calculate the PMF or PDF for a distribution.
        """
        distribution = self.get_object()
        serializer = ProbabilityCalculationSerializer(data=request.data)
        
        if serializer.is_valid():
            x_values = serializer.validated_data.get('x_values', [])
            result = DistributionService.calculate_pmf_pdf(
                distribution.distribution_type,
                distribution.parameters,
                x_values
            )
            return Response(result)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def calculate_cdf(self, request, pk=None):
        """
        Calculate the CDF for a distribution.
        """
        distribution = self.get_object()
        serializer = ProbabilityCalculationSerializer(data=request.data)
        
        if serializer.is_valid():
            x_values = serializer.validated_data.get('x_values', [])
            result = DistributionService.calculate_cdf(
                distribution.distribution_type,
                distribution.parameters,
                x_values
            )
            return Response(result)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def calculate_probability(self, request, pk=None):
        """
        Calculate probability for a distribution (less than, greater than, between, exactly).
        """
        distribution = self.get_object()
        serializer = ProbabilityCalculationSerializer(data=request.data)
        
        if serializer.is_valid():
            probability_type = serializer.validated_data.get('probability_type', 'less_than')
            lower_bound = serializer.validated_data.get('lower_bound')
            upper_bound = serializer.validated_data.get('upper_bound')
            x_value = serializer.validated_data.get('x_values', [0])[0] if serializer.validated_data.get('x_values') else None
            
            result = DistributionService.calculate_probability(
                distribution.distribution_type,
                distribution.parameters,
                probability_type,
                lower_bound=lower_bound,
                upper_bound=upper_bound,
                x_value=x_value
            )
            return Response(result)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def generate_random_sample(self, request, pk=None):
        """
        Generate random samples from a distribution.
        """
        distribution = self.get_object()
        serializer = RandomSampleSerializer(data=request.data)
        
        if serializer.is_valid():
            sample_size = serializer.validated_data.get('sample_size')
            seed = serializer.validated_data.get('seed')
            
            result = DistributionService.generate_random_sample(
                distribution.distribution_type,
                distribution.parameters,
                sample_size,
                seed
            )
            return Response(result)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DistributionUtilityViewSet(viewsets.ViewSet):
    """
    ViewSet for utility operations on distributions not tied to specific models.
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def binomial_approximation(self, request):
        """
        Compare binomial approximations (Poisson and Normal).
        """
        serializer = BinomialApproximationRequestSerializer(data=request.data)
        if serializer.is_valid():
            n = serializer.validated_data.get('n')
            p = serializer.validated_data.get('p')
            approximation_types = serializer.validated_data.get('approximation_types')
            
            result = DistributionService.compare_binomial_approximations(n, p, approximation_types)
            
            # Save the result if requested
            if request.data.get('save', False):
                project_id = request.data.get('project_id')
                if project_id:
                    project = get_object_or_404(DistributionProject, id=project_id, user=request.user)
                    BinomialApproximation.objects.create(
                        project=project,
                        n=n,
                        p=p,
                        approximation_types=approximation_types,
                        results=result
                    )
                    
            return Response(result)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def fit_distribution(self, request):
        """
        Fit a distribution to provided data.
        """
        serializer = DataFittingRequestSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data.get('data')
            distribution_types = serializer.validated_data.get('distribution_types')
            
            result = DistributionService.fit_distribution(data, distribution_types)
            
            # Save the result if requested
            if request.data.get('save', False):
                project_id = request.data.get('project_id')
                if project_id:
                    project = get_object_or_404(DistributionProject, id=project_id, user=request.user)
                    
                    # Create dataset
                    dataset = DataSet.objects.create(
                        project=project,
                        name=request.data.get('name', 'Fitted Dataset'),
                        description=request.data.get('description', ''),
                        data=data
                    )
                    
                    # Create fitting result
                    DistributionFitting.objects.create(
                        dataset=dataset,
                        tested_distributions=distribution_types,
                        results=result
                    )
                    
            return Response(result)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def process_capability(self, request):
        """
        Calculate process capability indices.
        """
        serializer = ProcessCapabilityRequestSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data.get('data')
            lsl = serializer.validated_data.get('lsl')
            usl = serializer.validated_data.get('usl')
            target = serializer.validated_data.get('target')
            
            result = DistributionService.calculate_process_capability(data, lsl, usl, target)
            return Response(result)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def clinical_trial_simulation(self, request):
        """
        Simulate a clinical trial with treatment and control groups.
        """
        serializer = ClinicalTrialSimulationSerializer(data=request.data)
        if serializer.is_valid():
            treatment_effect = serializer.validated_data.get('treatment_effect')
            control_mean = serializer.validated_data.get('control_mean')
            control_sd = serializer.validated_data.get('control_sd')
            treatment_sd = serializer.validated_data.get('treatment_sd')
            n_control = serializer.validated_data.get('n_control')
            n_treatment = serializer.validated_data.get('n_treatment')
            n_simulations = serializer.validated_data.get('n_simulations')
            seed = serializer.validated_data.get('seed')
            
            result = DistributionService.simulate_clinical_trial(
                treatment_effect, control_mean, control_sd, treatment_sd,
                n_control, n_treatment, n_simulations, seed
            )
            
            # Save the result if requested
            if request.data.get('save', False):
                project_id = request.data.get('project_id')
                if project_id:
                    project = get_object_or_404(DistributionProject, id=project_id, user=request.user)
                    
                    ApplicationSimulation.objects.create(
                        project=project,
                        simulation_type='CLINICAL_TRIAL',
                        parameters={
                            'treatment_effect': treatment_effect,
                            'control_mean': control_mean,
                            'control_sd': control_sd,
                            'treatment_sd': treatment_sd,
                            'n_control': n_control,
                            'n_treatment': n_treatment,
                            'n_simulations': n_simulations
                        },
                        results=result
                    )
                    
            return Response(result)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def poisson_process(self, request):
        """
        Simulate a Poisson process.
        """
        # Extract parameters
        rate = request.data.get('rate')
        time_period = request.data.get('time_period')
        num_simulations = request.data.get('num_simulations', 1)
        seed = request.data.get('seed')
        
        if not rate or not time_period:
            return Response(
                {"error": "Rate and time_period are required parameters"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        result = DistributionService.simulate_poisson_process(
            rate, time_period, num_simulations, seed
        )
        
        # Save the result if requested
        if request.data.get('save', False):
            project_id = request.data.get('project_id')
            if project_id:
                project = get_object_or_404(DistributionProject, id=project_id, user=request.user)
                
                ApplicationSimulation.objects.create(
                    project=project,
                    simulation_type='POISSON_PROCESS',
                    parameters={
                        'rate': rate,
                        'time_period': time_period,
                        'num_simulations': num_simulations
                    },
                    results=result
                )
                
        return Response(result)