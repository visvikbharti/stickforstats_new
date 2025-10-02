"""
Confidence Intervals Calculation API Views
Real statistical calculation endpoints for researchers.
No placeholders - actual working calculations.

Author: StickForStats Development Team
Date: August 19, 2025
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
import numpy as np
import json
from typing import List, Dict, Any

from ..services.calculation_engine import ConfidenceIntervalCalculator
from ..services.interpretation_engine import InterpretationEngine
from ..services.error_handler import handle_api_exception, log_performance
from ..services.logging_service import logging_service


class ConfidenceIntervalCalculationViewSet(viewsets.ViewSet):
    """
    Direct calculation endpoints for confidence intervals.
    These are the endpoints researchers actually need.
    """
    
    permission_classes = [AllowAny]  # For testing - will add auth later
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.calculator = ConfidenceIntervalCalculator()
        self.interpreter = InterpretationEngine()
    
    @action(methods=['POST'], detail=False, url_path='mean')
    @handle_api_exception
    @log_performance('ci_mean_calculation')
    def calculate_mean(self, request):
        """
        Calculate confidence interval for population mean.
        
        POST /api/v1/confidence-intervals/calculate/mean/
        
        Request body:
        {
            "data": [1.2, 2.3, 3.4, ...],
            "confidence_level": 0.95,
            "method": "t"  # or "z"
        }
        
        Returns:
        {
            "point_estimate": 2.3,
            "ci_lower": 1.8,
            "ci_upper": 2.8,
            "interpretation": {...},
            ...
        }
        """
        # Extract and validate input
        data = request.data.get('data', [])
        confidence_level = request.data.get('confidence_level', 0.95)
        method = request.data.get('method', 't')
        
        if not data:
            return Response(
                {"error": "Data array is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Perform calculation
        result = self.calculator.calculate_mean_ci(
            data=data,
            confidence_level=confidence_level,
            method=method
        )
        
        # Add interpretation
        interpretation = self.interpreter.interpret_mean_ci(
            mean=result['point_estimate'],
            ci_lower=result['ci_lower'],
            ci_upper=result['ci_upper'],
            confidence_level=confidence_level,
            sample_size=result['sample_size']
        )
        result['interpretation'] = interpretation
        
        # Log the calculation
        logging_service.log_calculation(
            calculation_type='mean_ci',
            parameters={
                'n': len(data),
                'confidence_level': confidence_level,
                'method': method
            },
            result=result
        )
        
        return Response(result, status=status.HTTP_200_OK)
    
    @action(methods=['POST'], detail=False, url_path='proportion')
    @handle_api_exception
    @log_performance('ci_proportion_calculation')
    def calculate_proportion(self, request):
        """
        Calculate confidence interval for population proportion.
        
        POST /api/v1/confidence-intervals/calculate/proportion/
        
        Request body:
        {
            "successes": 45,
            "trials": 100,
            "confidence_level": 0.95,
            "method": "wilson"  # or "normal", "jeffreys", "agresti-coull"
        }
        """
        successes = request.data.get('successes')
        trials = request.data.get('trials')
        confidence_level = request.data.get('confidence_level', 0.95)
        method = request.data.get('method', 'wilson')
        
        if successes is None or trials is None:
            return Response(
                {"error": "Both 'successes' and 'trials' are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Perform calculation
        result = self.calculator.calculate_proportion_ci(
            successes=successes,
            trials=trials,
            confidence_level=confidence_level,
            method=method
        )
        
        # Add interpretation
        interpretation = self.interpreter.interpret_proportion_ci(
            proportion=result['point_estimate'],
            ci_lower=result['ci_lower'],
            ci_upper=result['ci_upper'],
            confidence_level=confidence_level,
            successes=successes,
            trials=trials
        )
        result['interpretation'] = interpretation
        
        # Log the calculation
        logging_service.log_calculation(
            calculation_type='proportion_ci',
            parameters={
                'successes': successes,
                'trials': trials,
                'confidence_level': confidence_level,
                'method': method
            },
            result=result
        )
        
        return Response(result, status=status.HTTP_200_OK)
    
    @action(methods=['POST'], detail=False, url_path='bootstrap')
    @handle_api_exception
    @log_performance('ci_bootstrap_calculation')
    def calculate_bootstrap(self, request):
        """
        Calculate bootstrap confidence interval.
        
        POST /api/v1/confidence-intervals/calculate/bootstrap/
        
        Request body:
        {
            "data": [1.2, 2.3, 3.4, ...],
            "confidence_level": 0.95,
            "n_iterations": 10000,
            "method": "percentile",  # or "bca"
            "random_state": 42  # optional, for reproducibility
        }
        """
        data = request.data.get('data', [])
        confidence_level = request.data.get('confidence_level', 0.95)
        n_iterations = request.data.get('n_iterations', 10000)
        method = request.data.get('method', 'percentile')
        random_state = request.data.get('random_state', None)
        
        if not data:
            return Response(
                {"error": "Data array is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Perform calculation
        result = self.calculator.calculate_bootstrap_ci(
            data=data,
            confidence_level=confidence_level,
            n_iterations=n_iterations,
            method=method,
            random_state=random_state
        )
        
        # Add interpretation
        interpretation = self.interpreter.interpret_bootstrap_ci(
            estimate=result['point_estimate'],
            ci_lower=result['ci_lower'],
            ci_upper=result['ci_upper'],
            confidence_level=confidence_level,
            n_iterations=n_iterations
        )
        result['interpretation'] = interpretation
        
        # Log the calculation
        logging_service.log_bootstrap(
            data_size=len(data),
            n_iterations=n_iterations,
            confidence_level=confidence_level,
            duration_seconds=0  # Will be added by performance decorator
        )
        
        return Response(result, status=status.HTTP_200_OK)
    
    @action(methods=['POST'], detail=False, url_path='compare')
    @handle_api_exception
    @log_performance('ci_comparison_calculation')
    def compare_groups(self, request):
        """
        Calculate confidence interval for difference between two groups.
        
        POST /api/v1/confidence-intervals/calculate/compare/
        
        Request body:
        {
            "group1": [1.2, 2.3, 3.4, ...],
            "group2": [2.1, 3.2, 4.3, ...],
            "confidence_level": 0.95,
            "paired": false,
            "equal_variance": false
        }
        """
        group1 = request.data.get('group1', [])
        group2 = request.data.get('group2', [])
        confidence_level = request.data.get('confidence_level', 0.95)
        paired = request.data.get('paired', False)
        equal_variance = request.data.get('equal_variance', False)
        
        if not group1 or not group2:
            return Response(
                {"error": "Both group1 and group2 are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Perform calculation
        result = self.calculator.calculate_difference_ci(
            group1=group1,
            group2=group2,
            confidence_level=confidence_level,
            paired=paired,
            equal_variance=equal_variance
        )
        
        # Add interpretation
        interpretation = self.interpreter.interpret_comparison_ci(
            mean_diff=result['mean_difference'],
            ci_lower=result['ci_lower'],
            ci_upper=result['ci_upper'],
            p_value=result.get('p_value'),
            cohens_d=result.get('cohens_d'),
            confidence_level=confidence_level
        )
        result['interpretation'] = interpretation
        
        # Log the calculation
        logging_service.log_calculation(
            calculation_type='group_comparison',
            parameters={
                'n1': len(group1),
                'n2': len(group2),
                'confidence_level': confidence_level,
                'paired': paired,
                'equal_variance': equal_variance
            },
            result=result
        )
        
        return Response(result, status=status.HTTP_200_OK)
    
    @action(methods=['GET'], detail=False, url_path='methods')
    def list_methods(self, request):
        """
        List all available CI calculation methods.
        
        GET /api/v1/confidence-intervals/calculate/methods/
        
        Returns information about all available calculation methods.
        """
        methods = {
            "mean": {
                "endpoint": "/api/v1/confidence-intervals/calculate/mean/",
                "description": "Confidence interval for population mean",
                "methods": ["t", "z"],
                "required_params": ["data"],
                "optional_params": ["confidence_level", "method"]
            },
            "proportion": {
                "endpoint": "/api/v1/confidence-intervals/calculate/proportion/",
                "description": "Confidence interval for population proportion",
                "methods": ["wilson", "normal", "jeffreys", "agresti-coull"],
                "required_params": ["successes", "trials"],
                "optional_params": ["confidence_level", "method"]
            },
            "bootstrap": {
                "endpoint": "/api/v1/confidence-intervals/calculate/bootstrap/",
                "description": "Non-parametric bootstrap confidence interval",
                "methods": ["percentile", "bca"],
                "required_params": ["data"],
                "optional_params": ["confidence_level", "n_iterations", "method", "random_state"]
            },
            "compare": {
                "endpoint": "/api/v1/confidence-intervals/calculate/compare/",
                "description": "Confidence interval for difference between two groups",
                "required_params": ["group1", "group2"],
                "optional_params": ["confidence_level", "paired", "equal_variance"]
            }
        }
        
        return Response(methods, status=status.HTTP_200_OK)
    
    @action(methods=['POST'], detail=False, url_path='validate')
    def validate_data(self, request):
        """
        Validate data before calculation.
        
        POST /api/v1/confidence-intervals/calculate/validate/
        
        Checks if data is suitable for CI calculation.
        """
        data = request.data.get('data', [])
        calculation_type = request.data.get('type', 'mean')
        
        validation_result = {
            "valid": True,
            "warnings": [],
            "errors": [],
            "statistics": {}
        }
        
        if not data:
            validation_result["valid"] = False
            validation_result["errors"].append("Data array is empty")
            return Response(validation_result, status=status.HTTP_200_OK)
        
        # Convert to numpy array
        try:
            data_array = np.array(data, dtype=float)
        except (ValueError, TypeError):
            validation_result["valid"] = False
            validation_result["errors"].append("Data contains non-numeric values")
            return Response(validation_result, status=status.HTTP_200_OK)
        
        # Check for NaN values
        nan_count = np.isnan(data_array).sum()
        if nan_count > 0:
            validation_result["warnings"].append(f"Data contains {nan_count} missing values (will be removed)")
            data_array = data_array[~np.isnan(data_array)]
        
        # Check sample size
        n = len(data_array)
        if n < 2:
            validation_result["valid"] = False
            validation_result["errors"].append("Sample size must be at least 2")
            return Response(validation_result, status=status.HTTP_200_OK)
        
        if n < 30:
            validation_result["warnings"].append(f"Small sample size (n={n}). Results may be less reliable.")
        
        # Calculate basic statistics
        validation_result["statistics"] = {
            "n": n,
            "mean": float(np.mean(data_array)),
            "std": float(np.std(data_array, ddof=1)),
            "min": float(np.min(data_array)),
            "max": float(np.max(data_array)),
            "median": float(np.median(data_array))
        }
        
        # Check for normality (for mean CI)
        if calculation_type == 'mean' and n >= 8:
            from scipy import stats
            _, p_value = stats.shapiro(data_array)
            validation_result["statistics"]["normality_p_value"] = float(p_value)
            if p_value < 0.05:
                validation_result["warnings"].append(
                    "Data may not be normally distributed (p < 0.05). "
                    "Consider using bootstrap CI for more robust results."
                )
        
        return Response(validation_result, status=status.HTTP_200_OK)