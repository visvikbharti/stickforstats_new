from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
import numpy as np
import scipy.stats as stats
import pandas as pd
import time

from django.shortcuts import get_object_or_404

from ..models import (
    ConfidenceIntervalProject,
    IntervalData,
    IntervalResult,
    SimulationResult,
    EducationalResource
)
from .serializers import (
    ConfidenceIntervalProjectSerializer,
    IntervalDataSerializer,
    IntervalResultSerializer,
    SimulationResultSerializer,
    EducationalResourceSerializer,
    CalculateIntervalSerializer,
    BootstrapSimulationSerializer,
    PmfPdfCalculationSerializer,
    CoverageSimulationSerializer
)
from ..services.interval_service import IntervalService
from ..services.bootstrap_service import BootstrapService
from ..services.error_handler import handle_api_exception, log_performance
from ..services.logging_service import logging_service


class ConfidenceIntervalProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ConfidenceIntervalProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ConfidenceIntervalProject.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        # Add the user to the request data
        mutable_data = request.data.copy()
        mutable_data['user'] = request.user.id
        serializer = self.get_serializer(data=mutable_data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class IntervalDataViewSet(viewsets.ModelViewSet):
    serializer_class = IntervalDataSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return IntervalData.objects.filter(project__user=self.request.user)
    
    def perform_create(self, serializer):
        project = get_object_or_404(
            ConfidenceIntervalProject, 
            id=self.request.data.get('project'),
            user=self.request.user
        )
        serializer.save(project=project)


class IntervalResultViewSet(viewsets.ModelViewSet):
    serializer_class = IntervalResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return IntervalResult.objects.filter(project__user=self.request.user)


class SimulationResultViewSet(viewsets.ModelViewSet):
    serializer_class = SimulationResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return SimulationResult.objects.filter(project__user=self.request.user)


class EducationalResourceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EducationalResourceSerializer
    queryset = EducationalResource.objects.all()
    
    def get_queryset(self):
        queryset = EducationalResource.objects.all()
        
        # Handle case-studies endpoint by filtering for EXAMPLE content type in APPLICATIONS category
        if self.basename == 'ci-case-studies':
            return queryset.filter(
                content_type='EXAMPLE',
                category='APPLICATIONS'
            ).order_by('order', 'title')
            
        # Support for both 'category' and 'section' parameters (section is an alias for category)
        category = self.request.query_params.get('category')
        section = self.request.query_params.get('section')
        
        filter_value = category or section
        if filter_value:
            queryset = queryset.filter(category=filter_value)
        
        return queryset.order_by('category', 'order')


class ConfidenceIntervalCalculationViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    @handle_api_exception
    @log_performance('interval_calculation')
    def calculate(self, request):
        serializer = CalculateIntervalSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        interval_type = data.get('interval_type')
        project_id = data.get('project_id')
        confidence_level = data.get('confidence_level', 0.95)
        
        # Get the project
        try:
            project = ConfidenceIntervalProject.objects.get(id=project_id, user=request.user)
        except ConfidenceIntervalProject.DoesNotExist:
            return Response(
                {"error": "Project not found or you don't have permission"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Handle data source - either from database or provided in the request
        numeric_data = None
        data_source = {}
        
        if 'data_id' in data and data.get('data_id'):
            try:
                interval_data = IntervalData.objects.get(id=data.get('data_id'), project__user=request.user)
                # Extract numeric data from the data field - it's stored in a JSON field
                if 'values' in interval_data.data:
                    numeric_data = np.array(interval_data.data['values'])
                else:
                    numeric_data = np.array(interval_data.data)
                data_source['type'] = 'stored'
                data_source['id'] = str(interval_data.id)
            except IntervalData.DoesNotExist:
                return Response(
                    {"error": "Data not found or you don't have permission"},
                    status=status.HTTP_404_NOT_FOUND
                )
        elif 'numeric_data' in data and data.get('numeric_data'):
            numeric_data = np.array(data.get('numeric_data'))
            data_source['type'] = 'provided'
        
        # Process different interval types
        result = None
        parameters = {}
        
        try:
            # Copy relevant parameters to the parameters dictionary
            for param in ['confidence_level', 'sample_size', 'successes', 'sample_mean', 
                         'sample_std', 'population_std', 'n_resamples', 'bootstrap_method']:
                if param in data and data.get(param) is not None:
                    parameters[param] = data.get(param)
            
            # Standard intervals for a single sample
            if interval_type == 'MEAN_Z':
                if numeric_data is not None:
                    result = IntervalService.mean_z_interval(
                        data=numeric_data,
                        confidence_level=confidence_level,
                        sigma=data.get('population_std')  # May be None, will be estimated
                    )
                else:
                    result = IntervalService.mean_z_interval_from_summary(
                        mean=data.get('sample_mean'),
                        sigma=data.get('population_std'),
                        n=data.get('sample_size'),
                        confidence_level=confidence_level
                    )
            
            elif interval_type == 'MEAN_T':
                if numeric_data is not None:
                    result = IntervalService.mean_t_interval(
                        data=numeric_data,
                        confidence_level=confidence_level
                    )
                else:
                    result = IntervalService.mean_t_interval_from_summary(
                        mean=data.get('sample_mean'),
                        s=data.get('sample_std'),
                        n=data.get('sample_size'),
                        confidence_level=confidence_level
                    )
            
            elif interval_type == 'PROPORTION_WALD':
                if numeric_data is not None:
                    # Assume 1 is success, 0 is failure
                    successes = int(np.sum(numeric_data == 1))
                    sample_size = len(numeric_data)
                else:
                    successes = data.get('successes')
                    sample_size = data.get('sample_size')
                
                result = IntervalService.proportion_wald_interval(
                    successes=successes,
                    sample_size=sample_size,
                    confidence_level=confidence_level
                )
            
            elif interval_type == 'PROPORTION_WILSON':
                if numeric_data is not None:
                    successes = int(np.sum(numeric_data == 1))
                    sample_size = len(numeric_data)
                else:
                    successes = data.get('successes')
                    sample_size = data.get('sample_size')
                
                result = IntervalService.proportion_wilson_interval(
                    successes=successes,
                    sample_size=sample_size,
                    confidence_level=confidence_level
                )
            
            elif interval_type == 'PROPORTION_CLOPPER_PEARSON':
                if numeric_data is not None:
                    successes = int(np.sum(numeric_data == 1))
                    sample_size = len(numeric_data)
                else:
                    successes = data.get('successes')
                    sample_size = data.get('sample_size')
                
                result = IntervalService.proportion_clopper_pearson_interval(
                    successes=successes,
                    sample_size=sample_size,
                    confidence_level=confidence_level
                )
            
            elif interval_type == 'VARIANCE':
                if numeric_data is not None:
                    result = IntervalService.variance_interval(
                        data=numeric_data,
                        confidence_level=confidence_level
                    )
                else:
                    return Response(
                        {"error": "Variance interval requires raw data"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Difference intervals
            elif interval_type == 'DIFFERENCE_MEANS':
                # Handle second data source
                numeric_data_2 = None
                
                if 'data_id_2' in data and data.get('data_id_2'):
                    try:
                        interval_data_2 = IntervalData.objects.get(
                            id=data.get('data_id_2'), 
                            project__user=request.user
                        )
                        # Extract numeric data from the data field
                        if 'values' in interval_data_2.data:
                            numeric_data_2 = np.array(interval_data_2.data['values'])
                        else:
                            numeric_data_2 = np.array(interval_data_2.data)
                        data_source['type_2'] = 'stored'
                        data_source['id_2'] = str(interval_data_2.id)
                    except IntervalData.DoesNotExist:
                        return Response(
                            {"error": "Second data set not found or you don't have permission"},
                            status=status.HTTP_404_NOT_FOUND
                        )
                elif 'numeric_data_2' in data and data.get('numeric_data_2'):
                    numeric_data_2 = np.array(data.get('numeric_data_2'))
                    data_source['type_2'] = 'provided'
                
                if numeric_data is not None and numeric_data_2 is not None:
                    result = IntervalService.difference_means_interval(
                        data1=numeric_data,
                        data2=numeric_data_2,
                        confidence_level=confidence_level,
                        equal_variances=data.get('equal_variances', False)
                    )
                else:
                    # Using summary statistics
                    result = IntervalService.difference_means_interval_from_summary(
                        mean1=data.get('sample_mean'),
                        mean2=data.get('sample_mean_2'),
                        s1=data.get('sample_std'),
                        s2=data.get('sample_std_2'),
                        n1=data.get('sample_size'),
                        n2=data.get('sample_size_2'),
                        confidence_level=confidence_level,
                        equal_variances=data.get('equal_variances', False)
                    )
            
            elif interval_type == 'DIFFERENCE_PROPORTIONS':
                if 'data_id' in data and 'data_id_2' in data:
                    try:
                        interval_data_1 = IntervalData.objects.get(
                            id=data.get('data_id'), 
                            project__user=request.user
                        )
                        interval_data_2 = IntervalData.objects.get(
                            id=data.get('data_id_2'), 
                            project__user=request.user
                        )
                        
                        # Assume 1 is success, 0 is failure
                        # Extract numeric data from the data fields
                        if 'values' in interval_data_1.data:
                            data1 = np.array(interval_data_1.data['values'])
                        else:
                            data1 = np.array(interval_data_1.data)

                        if 'values' in interval_data_2.data:
                            data2 = np.array(interval_data_2.data['values'])
                        else:
                            data2 = np.array(interval_data_2.data)
                        
                        x1 = int(np.sum(data1 == 1))
                        n1 = len(data1)
                        x2 = int(np.sum(data2 == 1))
                        n2 = len(data2)
                        
                        data_source['type'] = 'stored'
                        data_source['id'] = str(interval_data_1.id)
                        data_source['type_2'] = 'stored'
                        data_source['id_2'] = str(interval_data_2.id)
                    except IntervalData.DoesNotExist:
                        return Response(
                            {"error": "Data not found or you don't have permission"},
                            status=status.HTTP_404_NOT_FOUND
                        )
                else:
                    x1 = data.get('successes')
                    n1 = data.get('sample_size')
                    x2 = data.get('successes_2')
                    n2 = data.get('sample_size_2')
                    data_source['type'] = 'provided'
                
                result = IntervalService.difference_proportions_interval(
                    x1=x1, n1=n1, x2=x2, n2=n2,
                    confidence_level=confidence_level,
                    method=data.get('method', 'wald')
                )
            
            # Bootstrap intervals
            elif interval_type.startswith('BOOTSTRAP_'):
                n_resamples = data.get('n_resamples', 1000)
                bootstrap_method = data.get('bootstrap_method', 'percentile')
                
                if interval_type == 'BOOTSTRAP_SINGLE':
                    if numeric_data is None:
                        return Response(
                            {"error": "Bootstrap requires raw data"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    result = BootstrapService.bootstrap_ci(
                        data=numeric_data,
                        confidence_level=confidence_level,
                        n_resamples=n_resamples,
                        method=bootstrap_method
                    )
                
                elif interval_type == 'BOOTSTRAP_DIFFERENCE':
                    numeric_data_2 = None
                    if 'data_id_2' in data:
                        try:
                            interval_data_2 = IntervalData.objects.get(
                                id=data.get('data_id_2'), 
                                project__user=request.user
                            )
                            # Extract numeric data from the data field
                            if 'values' in interval_data_2.data:
                                numeric_data_2 = np.array(interval_data_2.data['values'])
                            else:
                                numeric_data_2 = np.array(interval_data_2.data)
                            data_source['type_2'] = 'stored'
                            data_source['id_2'] = str(interval_data_2.id)
                        except IntervalData.DoesNotExist:
                            return Response(
                                {"error": "Second data set not found"},
                                status=status.HTTP_404_NOT_FOUND
                            )
                    elif 'numeric_data_2' in data:
                        numeric_data_2 = np.array(data.get('numeric_data_2'))
                        data_source['type_2'] = 'provided'
                    
                    if numeric_data is None or numeric_data_2 is None:
                        return Response(
                            {"error": "Bootstrap difference requires two data sets"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    result = BootstrapService.bootstrap_difference(
                        data1=numeric_data,
                        data2=numeric_data_2,
                        confidence_level=confidence_level,
                        n_resamples=n_resamples,
                        method=bootstrap_method
                    )
            
            else:
                return Response(
                    {"error": f"Unknown interval type: {interval_type}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Save the result to the database
            # Get the IntervalData instance if we're using stored data
            data_source_obj = None
            if data_source.get('type') == 'stored' and data_source.get('id'):
                try:
                    data_source_obj = IntervalData.objects.get(id=data_source.get('id'))
                except IntervalData.DoesNotExist:
                    pass

            interval_result = IntervalResult.objects.create(
                project=project,
                name=data.get('name', f"{interval_type} Interval"),
                description=data.get('description', ''),
                interval_type=interval_type,
                confidence_level=confidence_level,
                parameters=parameters,
                data_source=data_source_obj,
                results=result
            )
            
            # Return the serialized result
            serializer = IntervalResultSerializer(interval_result)
            return Response(serializer.data)
        
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    @handle_api_exception
    @log_performance('bootstrap_simulation')
    def bootstrap_simulation(self, request):
        """Run a bootstrap simulation to demonstrate coverage properties."""
        serializer = BootstrapSimulationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        project_id = data.get('project_id')
        
        # Get the project
        try:
            project = ConfidenceIntervalProject.objects.get(id=project_id, user=request.user)
        except ConfidenceIntervalProject.DoesNotExist:
            return Response(
                {"error": "Project not found or you don't have permission"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            # Run the simulation
            result = BootstrapService.bootstrap_simulation(
                true_param=data.get('true_param'),
                sample_size=data.get('sample_size'),
                n_simulations=data.get('n_simulations', 1000),
                n_bootstrap=data.get('n_bootstrap', 1000),
                distribution=data.get('distribution', 'normal'),
                statistic=data.get('statistic', 'mean'),
                confidence_level=data.get('confidence_level', 0.95),
                method=data.get('method', 'percentile'),
                dist_params=data.get('dist_params', {})
            )
            
            # Save the result
            simulation_result = SimulationResult.objects.create(
                project=project,
                simulation_type='BOOTSTRAP_COVERAGE',
                parameters={
                    'true_param': data.get('true_param'),
                    'sample_size': data.get('sample_size'),
                    'n_simulations': data.get('n_simulations', 1000),
                    'n_bootstrap': data.get('n_bootstrap', 1000),
                    'distribution': data.get('distribution', 'normal'),
                    'statistic': data.get('statistic', 'mean'),
                    'confidence_level': data.get('confidence_level', 0.95),
                    'method': data.get('method', 'percentile'),
                    'dist_params': data.get('dist_params', {})
                },
                result=result
            )
            
            # Return the serialized result
            serializer = SimulationResultSerializer(simulation_result)
            return Response(serializer.data)
        
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class CoverageSimulationViewSet(viewsets.ViewSet):
    """
    ViewSet for confidence interval coverage simulation.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    @handle_api_exception
    @log_performance('coverage_simulation')
    def simulate(self, request):
        """Run a simulation to demonstrate coverage properties of confidence intervals."""
        serializer = CoverageSimulationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        project_id = data.get('project_id')
        
        # Get the project
        try:
            project = ConfidenceIntervalProject.objects.get(id=project_id, user=request.user)
        except ConfidenceIntervalProject.DoesNotExist:
            return Response(
                {"error": "Project not found or you don't have permission"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            # Extract parameters
            interval_type = data.get('interval_type')
            confidence_level = data.get('confidence_level', 0.95)
            sample_size = data.get('sample_size')
            n_simulations = data.get('n_simulations', 1000)
            distribution = data.get('distribution', 'NORMAL')
            dist_params = data.get('dist_params', {})
            additional_options = data.get('additional_options', {})
            
            # Function to generate random data based on distribution
            def generate_sample(n, dist, params):
                if dist.upper() == 'NORMAL':
                    mean = params.get('mean', 0)
                    std = params.get('std', 1)
                    return np.random.normal(mean, std, n)
                elif dist.upper() == 'BINOMIAL':
                    p = params.get('p', 0.5)
                    return np.random.binomial(1, p, n)
                elif dist.upper() == 'EXPONENTIAL':
                    scale = params.get('scale', 1)
                    return np.random.exponential(scale, n)
                elif dist.upper() == 'UNIFORM':
                    low = params.get('low', 0)
                    high = params.get('high', 1)
                    return np.random.uniform(low, high, n)
                else:
                    # Default to normal
                    return np.random.normal(0, 1, n)
            
            # Function to check if interval contains the true parameter
            def interval_contains_parameter(interval, true_param):
                return interval['lower_bound'] <= true_param and interval['upper_bound'] >= true_param
            
            # Track results
            intervals_containing_true_param = 0
            interval_widths = []
            
            # Set true parameter value based on distribution
            true_param = dist_params.get('mean', 0) if distribution.upper() == 'NORMAL' else \
                         dist_params.get('p', 0.5) if distribution.upper() == 'BINOMIAL' else \
                         0  # Default for other distributions
            
            # Run simulations
            for i in range(n_simulations):
                # Generate sample
                sample = generate_sample(sample_size, distribution, dist_params)
                
                # Calculate confidence interval based on interval type
                if interval_type == 'MEAN_Z':
                    # Get population std dev from parameters if provided
                    pop_std = dist_params.get('std', None)
                    
                    result = IntervalService.mean_z_interval(
                        data=sample,
                        confidence_level=confidence_level,
                        sigma=pop_std
                    )
                elif interval_type == 'MEAN_T':
                    result = IntervalService.mean_t_interval(
                        data=sample,
                        confidence_level=confidence_level
                    )
                elif interval_type.startswith('PROPORTION_'):
                    # For proportion intervals, convert data to binary successes
                    if distribution.upper() != 'BINOMIAL':
                        # If not already binomial, convert to binary based on median
                        median = np.median(sample)
                        binary_data = (sample > median).astype(int)
                    else:
                        binary_data = sample
                    
                    successes = int(np.sum(binary_data))
                    
                    if interval_type == 'PROPORTION_WALD':
                        result = IntervalService.proportion_wald_interval(
                            successes=successes,
                            sample_size=sample_size,
                            confidence_level=confidence_level,
                            continuity_correction=additional_options.get('continuity_correction', False)
                        )
                    elif interval_type == 'PROPORTION_WILSON':
                        result = IntervalService.proportion_wilson_interval(
                            successes=successes,
                            sample_size=sample_size,
                            confidence_level=confidence_level
                        )
                    elif interval_type == 'PROPORTION_CLOPPER_PEARSON':
                        result = IntervalService.proportion_clopper_pearson_interval(
                            successes=successes,
                            sample_size=sample_size,
                            confidence_level=confidence_level
                        )
                else:
                    # Default to t-interval
                    result = IntervalService.mean_t_interval(
                        data=sample,
                        confidence_level=confidence_level
                    )
                
                # Check if interval contains true parameter
                if interval_contains_parameter(result, true_param):
                    intervals_containing_true_param += 1
                
                # Record interval width
                interval_widths.append(result['upper_bound'] - result['lower_bound'])
            
            # Calculate coverage rate
            coverage_rate = intervals_containing_true_param / n_simulations
            
            # Calculate interval width statistics
            mean_interval_width = np.mean(interval_widths)
            median_interval_width = np.median(interval_widths)
            
            # Generate histogram of interval widths
            hist, bin_edges = np.histogram(interval_widths, bins=10)
            bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2
            width_histogram = []
            
            for i in range(len(hist)):
                width_histogram.append({
                    'bin_center': float(bin_centers[i]),
                    'bin_lower': float(bin_edges[i]),
                    'bin_upper': float(bin_edges[i+1]),
                    'count': int(hist[i]),
                    'frequency': float(hist[i] / n_simulations)
                })
            
            # Prepare results
            simulation_results = {
                'interval_type': interval_type,
                'confidence_level': confidence_level,
                'sample_size': sample_size,
                'n_simulations': n_simulations,
                'distribution_type': distribution,
                'distribution_params': dist_params,
                'coverage_rate': coverage_rate,
                'mean_interval_width': float(mean_interval_width),
                'median_interval_width': float(median_interval_width),
                'intervals_containing_true_param': intervals_containing_true_param,
                'width_histogram': width_histogram
            }
            
            # Save the simulation results
            simulation_result = SimulationResult.objects.create(
                project=project,
                simulation_type='COVERAGE_SIMULATION',
                parameters={
                    'interval_type': interval_type,
                    'confidence_level': confidence_level,
                    'sample_size': sample_size,
                    'n_simulations': n_simulations,
                    'distribution': distribution,
                    'dist_params': dist_params,
                    'additional_options': additional_options
                },
                result=simulation_results
            )
            
            # Return the serialized result
            serializer = SimulationResultSerializer(simulation_result)
            return Response(serializer.data)
        
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class DistributionCalculationViewSet(viewsets.ViewSet):
    """
    ViewSet for calculating PMF/PDF values for different distributions.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    @handle_api_exception
    @log_performance('pmf_pdf_calculation')
    def calculate_pmf_pdf(self, request):
        """Calculate PMF/PDF for various distributions."""
        serializer = PmfPdfCalculationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        distribution = data.get('distribution').upper()
        params = data.get('params', {})
        x_min = data.get('x_min')
        x_max = data.get('x_max')
        num_points = data.get('num_points', 100)
        discrete = data.get('discrete', False)
        
        try:
            # Generate x values based on distribution type
            if x_min is None or x_max is None:
                # Auto-determine range based on distribution
                if distribution == 'NORMAL':
                    mean = params.get('mean', 0)
                    std = params.get('std', 1)
                    x_min = mean - 4 * std
                    x_max = mean + 4 * std
                elif distribution == 'BINOMIAL':
                    n = params.get('n', 10)
                    x_min = 0
                    x_max = n
                    discrete = True
                elif distribution == 'POISSON':
                    lambda_val = params.get('lambda', 5)
                    x_min = 0
                    x_max = lambda_val * 3
                    discrete = True
                elif distribution == 'EXPONENTIAL':
                    scale = params.get('scale', 1)
                    x_min = 0
                    x_max = scale * 5
                elif distribution == 'UNIFORM':
                    a = params.get('a', 0)
                    b = params.get('b', 1)
                    x_min = a - 0.1 * (b - a)
                    x_max = b + 0.1 * (b - a)
                else:
                    x_min = -5
                    x_max = 5
            
            # Generate x values
            if discrete:
                x_values = np.arange(x_min, x_max + 1)
                num_points = len(x_values)
            else:
                x_values = np.linspace(x_min, x_max, num_points)
            
            # Calculate PMF/PDF values based on distribution
            y_values = []
            
            if distribution == 'NORMAL':
                mean = params.get('mean', 0)
                std = params.get('std', 1)
                y_values = stats.norm.pdf(x_values, loc=mean, scale=std)
            elif distribution == 'BINOMIAL':
                n = params.get('n', 10)
                p = params.get('p', 0.5)
                y_values = stats.binom.pmf(x_values, n, p)
            elif distribution == 'POISSON':
                lambda_val = params.get('lambda', 5)
                y_values = stats.poisson.pmf(x_values, lambda_val)
            elif distribution == 'EXPONENTIAL':
                scale = params.get('scale', 1)  # scale = 1/lambda
                y_values = stats.expon.pdf(x_values, scale=scale)
            elif distribution == 'UNIFORM':
                a = params.get('a', 0)
                b = params.get('b', 1)
                y_values = stats.uniform.pdf(x_values, loc=a, scale=b-a)
            else:
                return Response(
                    {"error": f"Unsupported distribution: {distribution}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Format results
            result = {
                'distribution': distribution,
                'params': params,
                'x_values': x_values.tolist(),
                'y_values': y_values.tolist(),
                'x_min': float(x_min),
                'x_max': float(x_max),
                'num_points': num_points,
                'discrete': discrete
            }
            
            return Response(result)
        
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )