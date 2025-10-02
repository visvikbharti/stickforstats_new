"""
API Views for StickForStats Core
Handles HTTP requests and responses for frontend-backend communication
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.cache import cache
from django.utils import timezone
import pandas as pd
import numpy as np
import json
import uuid
import io
from typing import Dict, List, Any

# Import our core modules
from .test_recommender import TestRecommendationEngine as TestRecommender
from .assumption_checker import AssumptionChecker
from .multiplicity import MultiplicityCorrector
from .power_analysis import PowerAnalyzer
from .effect_sizes import EffectSizeCalculator
# Temporarily comment out - TODO: Fix module structure
# from .reproducibility.bundle import ReproducibilityBundle

# Import serializers
from .serializers import (
    DataUploadSerializer,
    DataSummarySerializer,
    AssumptionCheckRequestSerializer,
    AssumptionResultSerializer,
    TestRecommendationRequestSerializer,
    RecommendedTestSerializer,
    TestExecutionRequestSerializer,
    TestResultSerializer,
    MultiplicityCorrectionRequestSerializer,
    MultiplicityCorrectionResultSerializer,
    PowerCalculationRequestSerializer,
    PowerAnalysisResultSerializer,
    EffectSizeCalculationRequestSerializer,
    EffectSizeResultSerializer,
    BundleCreationRequestSerializer,
    BundleInfoSerializer,
    ErrorResponseSerializer
)


class DataUploadView(APIView):
    """Handle data file uploads and return summary"""
    parser_classes = (MultiPartParser, FormParser)
    
    def post(self, request):
        serializer = DataUploadSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid data', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get the uploaded file
            uploaded_file = serializer.validated_data['file']
            file_type = serializer.validated_data.get('file_type', 'csv')
            
            # Read the file into a pandas DataFrame
            if file_type == 'csv':
                delimiter = serializer.validated_data.get('delimiter', ',')
                has_header = serializer.validated_data.get('has_header', True)
                df = pd.read_csv(
                    io.BytesIO(uploaded_file.read()),
                    delimiter=delimiter,
                    header=0 if has_header else None
                )
            elif file_type in ['excel', 'xlsx', 'xls']:
                df = pd.read_excel(io.BytesIO(uploaded_file.read()))
            else:
                return Response(
                    {'error': f'Unsupported file type: {file_type}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Generate unique data ID
            data_id = str(uuid.uuid4())
            
            # Store DataFrame in cache (for demo purposes)
            # In production, use proper storage (database, Redis, etc.)
            cache.set(f'data_{data_id}', df.to_json(), timeout=3600)  # 1 hour timeout
            
            # Prepare variable information
            variables = []
            for col in df.columns:
                var_info = {
                    'name': str(col),
                    'dtype': str(df[col].dtype),
                    'missing_count': int(df[col].isna().sum()),
                    'unique_count': int(df[col].nunique()),
                    'sample_values': df[col].dropna().head(5).tolist()
                }
                
                # Determine variable type
                if pd.api.types.is_numeric_dtype(df[col]):
                    if df[col].nunique() == 2:
                        var_info['type'] = 'binary'
                    elif df[col].nunique() < 10:
                        var_info['type'] = 'ordinal'
                    else:
                        var_info['type'] = 'continuous'
                else:
                    var_info['type'] = 'nominal'
                
                variables.append(var_info)
            
            # Prepare summary
            summary_data = {
                'data_id': data_id,
                'n_rows': len(df),
                'n_cols': len(df.columns),
                'variables': variables,
                'missing_summary': {
                    'total_missing': int(df.isna().sum().sum()),
                    'complete_rows': int(df.dropna().shape[0]),
                    'complete_cols': int(df.dropna(axis=1).shape[1])
                },
                'data_types': {
                    'numeric': sum(pd.api.types.is_numeric_dtype(df[col]) for col in df.columns),
                    'categorical': sum(pd.api.types.is_object_dtype(df[col]) for col in df.columns)
                },
                'preview': df.head(5).to_dict('records')
            }
            
            response_serializer = DataSummarySerializer(data=summary_data)
            if response_serializer.is_valid():
                return Response(response_serializer.data, status=status.HTTP_200_OK)
            else:
                return Response(
                    {'error': 'Failed to serialize response', 'details': response_serializer.errors},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
        except Exception as e:
            return Response(
                {'error': f'Failed to process file: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AssumptionCheckView(APIView):
    """Check statistical assumptions for the data"""
    parser_classes = (JSONParser,)
    
    def post(self, request):
        serializer = AssumptionCheckRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid request', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Retrieve data from cache
            data_id = serializer.validated_data['data_id']
            df_json = cache.get(f'data_{data_id}')
            
            if not df_json:
                return Response(
                    {'error': 'Data not found. Please upload data first.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            df = pd.read_json(df_json)
            
            # Get test parameters
            test_type = serializer.validated_data.get('test_type', 'normality')
            variables = serializer.validated_data.get('variables', df.columns.tolist())
            alpha = serializer.validated_data.get('alpha', 0.05)
            
            # Initialize assumption checker
            checker = AssumptionChecker(df)
            
            # Run appropriate tests
            results = []
            
            if test_type == 'normality':
                for var in variables:
                    if pd.api.types.is_numeric_dtype(df[var]):
                        result = checker.check_normality(var, alpha=alpha)
                        results.append(result)
            
            elif test_type == 'homogeneity':
                if len(variables) >= 2:
                    result = checker.check_homogeneity_of_variance(
                        variables[0], 
                        variables[1] if len(variables) > 1 else None,
                        alpha=alpha
                    )
                    results.append(result)
            
            elif test_type == 'independence':
                result = checker.check_independence(variables[0] if variables else None)
                results.append(result)
            
            elif test_type == 'outliers':
                for var in variables:
                    if pd.api.types.is_numeric_dtype(df[var]):
                        result = checker.detect_outliers(var)
                        results.append(result)
            
            # Format results
            formatted_results = []
            for result in results:
                formatted_result = {
                    'test_name': result.get('test', test_type),
                    'statistic': float(result.get('statistic', 0)),
                    'p_value': float(result.get('p_value', 1)),
                    'passed': result.get('passed', False),
                    'interpretation': result.get('interpretation', ''),
                    'recommendations': result.get('recommendations', [])
                }
                formatted_results.append(formatted_result)
            
            return Response(formatted_results, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Assumption check failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TestRecommendationView(APIView):
    """Recommend appropriate statistical tests based on data"""
    parser_classes = (JSONParser,)
    
    def post(self, request):
        serializer = TestRecommendationRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid request', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Retrieve data from cache
            data_id = serializer.validated_data['data_id']
            df_json = cache.get(f'data_{data_id}')
            
            if not df_json:
                return Response(
                    {'error': 'Data not found. Please upload data first.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            df = pd.read_json(df_json)
            
            # Get recommendation parameters
            dependent_var = serializer.validated_data['dependent_var']
            independent_vars = serializer.validated_data['independent_vars']
            hypothesis_type = serializer.validated_data.get('hypothesis_type', 'difference')
            is_paired = serializer.validated_data.get('is_paired', False)
            alpha = serializer.validated_data.get('alpha', 0.05)
            
            # Initialize test recommender
            recommender = TestRecommender(df)
            
            # Get recommendations
            recommendations = recommender.recommend_test(
                dependent_var=dependent_var,
                independent_vars=independent_vars,
                hypothesis_type=hypothesis_type,
                is_paired=is_paired,
                alpha=alpha
            )
            
            # Format recommendations
            formatted_recommendations = []
            for rec in recommendations:
                formatted_rec = {
                    'test_name': rec['test_name'],
                    'test_type': rec['test_type'],
                    'suitability_score': float(rec.get('score', 0.5)),
                    'reasons': rec.get('reasons', []),
                    'assumptions_met': rec.get('assumptions_met', []),
                    'assumptions_violated': rec.get('assumptions_violated', []),
                    'power_estimate': float(rec.get('power', 0.8)),
                    'sample_size_adequate': rec.get('sample_size_adequate', True),
                    'alternatives': rec.get('alternatives', [])
                }
                formatted_recommendations.append(formatted_rec)
            
            return Response(formatted_recommendations, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Test recommendation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TestExecutionView(APIView):
    """Execute a specific statistical test"""
    parser_classes = (JSONParser,)
    
    def post(self, request):
        serializer = TestExecutionRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid request', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Retrieve data from cache
            data_id = serializer.validated_data['data_id']
            df_json = cache.get(f'data_{data_id}')
            
            if not df_json:
                return Response(
                    {'error': 'Data not found. Please upload data first.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            df = pd.read_json(df_json)
            
            # Get test parameters
            test_type = serializer.validated_data['test_type']
            dependent_var = serializer.validated_data['dependent_var']
            independent_vars = serializer.validated_data.get('independent_vars', [])
            parameters = serializer.validated_data.get('parameters', {})
            options = serializer.validated_data.get('options', {})
            
            # Initialize test recommender (it has test execution methods)
            recommender = TestRecommender(df)
            
            # Execute the test
            result = recommender.run_test(
                test_type=test_type,
                dependent_var=dependent_var,
                independent_vars=independent_vars,
                **parameters
            )
            
            # Calculate effect size if not included
            if 'effect_size' not in result:
                effect_calc = EffectSizeCalculator()
                effect_size = effect_calc.calculate(
                    data=df,
                    dependent_var=dependent_var,
                    independent_vars=independent_vars,
                    test_type=test_type
                )
                result['effect_size'] = effect_size
            
            # Format result
            formatted_result = {
                'test_name': result.get('test_name', test_type),
                'statistic': float(result.get('statistic', 0)),
                'p_value': float(result.get('p_value', 1)),
                'degrees_of_freedom': float(result.get('df', 0)) if 'df' in result else None,
                'effect_size': result.get('effect_size', {}),
                'confidence_interval': result.get('confidence_interval', []),
                'summary_statistics': result.get('summary_stats', {}),
                'interpretation': result.get('interpretation', ''),
                'apa_format': result.get('apa_format', ''),
                'assumptions': result.get('assumptions', []),
                'post_hoc': result.get('post_hoc', None),
                'visualizations': []  # Would include base64 encoded plots
            }
            
            return Response(formatted_result, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Test execution failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MultiplicityCorrectionView(APIView):
    """Apply multiplicity correction to p-values"""
    parser_classes = (JSONParser,)
    
    def post(self, request):
        serializer = MultiplicityCorrectionRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid request', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get correction parameters
            p_values = serializer.validated_data['p_values']
            method = serializer.validated_data['method']
            alpha = serializer.validated_data.get('alpha', 0.05)
            hypothesis_names = serializer.validated_data.get('hypothesis_names', None)
            
            # Initialize corrector
            corrector = MultiplicityCorrector()
            
            # Apply correction
            result = corrector.correct(
                p_values=p_values,
                method=method,
                alpha=alpha
            )
            
            # Format result
            formatted_result = {
                'method': method,
                'alpha_original': alpha,
                'alpha_adjusted': result.get('alpha_adjusted', alpha),
                'p_values_original': p_values,
                'p_values_adjusted': result.get('adjusted_p_values', p_values),
                'rejected': result.get('rejected', []),
                'n_significant': sum(result.get('rejected', [])),
                'n_tests': len(p_values),
                'family_wise_error_rate': result.get('fwer', alpha),
                'false_discovery_rate': result.get('fdr', None),
                'summary': result.get('summary', '')
            }
            
            return Response(formatted_result, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Multiplicity correction failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PowerAnalysisView(APIView):
    """Calculate statistical power or required sample size"""
    parser_classes = (JSONParser,)
    
    def post(self, request):
        serializer = PowerCalculationRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid request', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get power analysis parameters
            test_type = serializer.validated_data['test_type']
            effect_size = serializer.validated_data['effect_size']
            alpha = serializer.validated_data.get('alpha', 0.05)
            n_groups = serializer.validated_data.get('n_groups', 2)
            alternative = serializer.validated_data.get('alternative', 'two-sided')
            
            # Initialize power analyzer
            analyzer = PowerAnalyzer()
            
            # Calculate power or sample size
            if 'sample_size' in serializer.validated_data:
                # Calculate power
                sample_size = serializer.validated_data['sample_size']
                result = analyzer.calculate_power(
                    test_type=test_type,
                    effect_size=effect_size,
                    sample_size=sample_size,
                    alpha=alpha,
                    n_groups=n_groups,
                    alternative=alternative
                )
            else:
                # Calculate required sample size
                power = serializer.validated_data['power']
                result = analyzer.calculate_sample_size(
                    test_type=test_type,
                    effect_size=effect_size,
                    power=power,
                    alpha=alpha,
                    n_groups=n_groups,
                    alternative=alternative
                )
            
            # Format result
            formatted_result = {
                'power': result.get('power', None),
                'sample_size': result.get('sample_size', None),
                'effect_size': effect_size,
                'alpha': alpha,
                'test_type': test_type,
                'n_groups': n_groups,
                'critical_value': result.get('critical_value', 0),
                'noncentrality': result.get('ncp', 0),
                'interpretation': result.get('interpretation', ''),
                'power_curve': result.get('power_curve', []),
                'recommendations': result.get('recommendations', [])
            }
            
            return Response(formatted_result, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Power analysis failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )