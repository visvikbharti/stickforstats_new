"""
Meta-Analysis API Views

REST API endpoints for meta-analysis functionality.

@author StickForStats Team
@version 1.0.0
"""

from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from core.meta_analysis import (
    run_meta_analysis,
    get_meta_analysis_engine,
    StudyData,
    EffectSizeConverter
)


class MetaAnalysisView(APIView):
    """
    Main meta-analysis endpoint.

    POST: Run meta-analysis on provided studies
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Run meta-analysis on study data.

        Request body:
        {
            "studies": [
                {
                    "study_name": "Smith 2020",
                    "effect_size": 0.45,
                    "standard_error": 0.12,
                    "sample_size": 50,  // optional
                    "subgroup": "Treatment A"  // optional
                },
                ...
            ],
            "model": "random",  // "fixed" or "random"
            "method": "DL",     // "DL" or "PM"
            "alpha": 0.05       // significance level
        }

        Returns:
        {
            "success": true,
            "pooled_effect": 0.35,
            "pooled_se": 0.08,
            "pooled_ci": [0.19, 0.51],
            "heterogeneity": {...},
            "studies": [...],
            "publication_bias": {...},
            "funnel_plot_data": {...},
            "sensitivity_analysis": [...],
            "subgroup_analysis": {...}
        }
        """
        try:
            data = request.data
            studies = data.get('studies', [])
            model = data.get('model', 'random')
            method = data.get('method', 'DL')
            alpha = data.get('alpha', 0.05)

            # Validation
            if not studies or len(studies) < 2:
                return Response({
                    'success': False,
                    'error': 'At least 2 studies are required for meta-analysis'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validate each study
            for i, study in enumerate(studies):
                if 'effect_size' not in study:
                    return Response({
                        'success': False,
                        'error': f'Study {i+1} is missing effect_size'
                    }, status=status.HTTP_400_BAD_REQUEST)
                if 'standard_error' not in study:
                    return Response({
                        'success': False,
                        'error': f'Study {i+1} is missing standard_error'
                    }, status=status.HTTP_400_BAD_REQUEST)

            # Run meta-analysis
            results = run_meta_analysis(
                studies=studies,
                model=model,
                method=method,
                alpha=alpha
            )

            return Response(results)

        except ValueError as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Meta-analysis failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def convert_effect_size(request):
    """
    Convert between effect size measures.

    Request body:
    {
        "value": 0.5,
        "from_type": "d",       // "d", "r", "g", "or", "log_or"
        "to_type": "r",
        "n1": 30,              // optional, for some conversions
        "n2": 30               // optional
    }

    Returns:
    {
        "success": true,
        "original_value": 0.5,
        "original_type": "d",
        "converted_value": 0.24,
        "converted_type": "r"
    }
    """
    try:
        data = request.data
        value = data.get('value')
        from_type = data.get('from_type', 'd')
        to_type = data.get('to_type', 'r')
        n1 = data.get('n1')
        n2 = data.get('n2')
        n = data.get('n') or (n1 + n2 if n1 and n2 else None)

        if value is None:
            return Response({
                'success': False,
                'error': 'Value is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        converter = EffectSizeConverter()
        converted = None

        # Conversion logic
        if from_type == 'd':
            if to_type == 'r':
                converted = converter.d_to_r(value, n1, n2)
            elif to_type == 'g':
                if n:
                    converted = converter.d_to_hedges_g(value, n)
                else:
                    return Response({
                        'success': False,
                        'error': 'Sample size (n) required for d to g conversion'
                    }, status=status.HTTP_400_BAD_REQUEST)
            elif to_type == 'log_or':
                converted = converter.d_to_log_or(value)
            elif to_type == 'or':
                log_or = converter.d_to_log_or(value)
                converted = converter.log_or_to_or(log_or)
            elif to_type == 'd':
                converted = value

        elif from_type == 'r':
            if to_type == 'd':
                converted = converter.r_to_d(value)
            elif to_type == 'fisher_z':
                converted = converter.r_to_fisher_z(value)
            elif to_type == 'r':
                converted = value

        elif from_type == 'fisher_z':
            if to_type == 'r':
                converted = converter.fisher_z_to_r(value)

        elif from_type == 'or':
            if to_type == 'log_or':
                converted = converter.or_to_log_or(value)
            elif to_type == 'd':
                log_or = converter.or_to_log_or(value)
                converted = converter.log_or_to_d(log_or)
            elif to_type == 'or':
                converted = value

        elif from_type == 'log_or':
            if to_type == 'or':
                converted = converter.log_or_to_or(value)
            elif to_type == 'd':
                converted = converter.log_or_to_d(value)
            elif to_type == 'log_or':
                converted = value

        if converted is None:
            return Response({
                'success': False,
                'error': f'Conversion from {from_type} to {to_type} not supported'
            }, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'success': True,
            'original_value': value,
            'original_type': from_type,
            'converted_value': float(converted),
            'converted_type': to_type
        })

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def calculate_effect_size_se(request):
    """
    Calculate standard error for an effect size.

    Request body:
    {
        "effect_type": "d",  // "d" or "r"
        "effect_size": 0.5,
        "n1": 30,
        "n2": 30,
        "n": 60  // for correlation
    }

    Returns:
    {
        "success": true,
        "standard_error": 0.18
    }
    """
    try:
        data = request.data
        effect_type = data.get('effect_type', 'd')
        effect_size = data.get('effect_size')
        n1 = data.get('n1')
        n2 = data.get('n2')
        n = data.get('n')

        if effect_size is None:
            return Response({
                'success': False,
                'error': 'effect_size is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        converter = EffectSizeConverter()

        if effect_type == 'd':
            if not n1 or not n2:
                return Response({
                    'success': False,
                    'error': 'n1 and n2 required for Cohen\'s d SE calculation'
                }, status=status.HTTP_400_BAD_REQUEST)
            se = converter.calculate_se_d(effect_size, n1, n2)

        elif effect_type == 'r':
            if not n:
                return Response({
                    'success': False,
                    'error': 'n required for correlation SE calculation'
                }, status=status.HTTP_400_BAD_REQUEST)
            se = converter.calculate_se_r(effect_size, n)

        else:
            return Response({
                'success': False,
                'error': f'Unsupported effect type: {effect_type}'
            }, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'success': True,
            'effect_type': effect_type,
            'effect_size': effect_size,
            'standard_error': float(se)
        })

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def publication_bias_test(request):
    """
    Run publication bias tests on study data.

    Request body:
    {
        "studies": [
            {"study_name": "...", "effect_size": ..., "standard_error": ...},
            ...
        ]
    }

    Returns:
    {
        "success": true,
        "eggers_test": {...},
        "beggs_test": {...}
    }
    """
    try:
        data = request.data
        studies = data.get('studies', [])

        if len(studies) < 3:
            return Response({
                'success': False,
                'error': 'At least 3 studies required for publication bias tests'
            }, status=status.HTTP_400_BAD_REQUEST)

        engine = get_meta_analysis_engine()

        # Convert to StudyData objects
        study_objects = [
            StudyData(
                study_id=str(i),
                study_name=s.get('study_name', f'Study {i+1}'),
                effect_size=s['effect_size'],
                standard_error=s['standard_error']
            )
            for i, s in enumerate(studies)
        ]

        # Run tests
        eggers = engine.eggers_test(study_objects)
        beggs = engine.beggs_test(study_objects)

        return Response({
            'success': True,
            'eggers_test': eggers,
            'beggs_test': beggs
        })

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def sensitivity_analysis(request):
    """
    Run leave-one-out sensitivity analysis.

    Request body:
    {
        "studies": [...],
        "model": "random"
    }

    Returns:
    {
        "success": true,
        "sensitivity_results": [
            {"excluded_study": "...", "pooled_effect": ..., ...},
            ...
        ]
    }
    """
    try:
        data = request.data
        studies = data.get('studies', [])
        model = data.get('model', 'random')

        if len(studies) < 3:
            return Response({
                'success': False,
                'error': 'At least 3 studies required for sensitivity analysis'
            }, status=status.HTTP_400_BAD_REQUEST)

        engine = get_meta_analysis_engine()

        # Convert to StudyData objects
        study_objects = [
            StudyData(
                study_id=str(i),
                study_name=s.get('study_name', f'Study {i+1}'),
                effect_size=s['effect_size'],
                standard_error=s['standard_error']
            )
            for i, s in enumerate(studies)
        ]

        # Run sensitivity analysis
        results = engine.sensitivity_analysis(study_objects, model=model)

        return Response({
            'success': True,
            'sensitivity_results': results
        })

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def subgroup_analysis(request):
    """
    Run subgroup analysis.

    Request body:
    {
        "studies": [
            {"study_name": "...", "effect_size": ..., "standard_error": ..., "subgroup": "Group A"},
            ...
        ],
        "model": "random"
    }

    Returns:
    {
        "success": true,
        "subgroup_results": {...},
        "between_group_heterogeneity": {...}
    }
    """
    try:
        data = request.data
        studies = data.get('studies', [])
        model = data.get('model', 'random')

        if len(studies) < 2:
            return Response({
                'success': False,
                'error': 'At least 2 studies required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if subgroups exist
        has_subgroups = any(s.get('subgroup') for s in studies)
        if not has_subgroups:
            return Response({
                'success': False,
                'error': 'No subgroups found in study data'
            }, status=status.HTTP_400_BAD_REQUEST)

        engine = get_meta_analysis_engine()

        # Convert to StudyData objects
        study_objects = [
            StudyData(
                study_id=str(i),
                study_name=s.get('study_name', f'Study {i+1}'),
                effect_size=s['effect_size'],
                standard_error=s['standard_error'],
                subgroup=s.get('subgroup')
            )
            for i, s in enumerate(studies)
        ]

        # Run subgroup analysis
        results = engine.subgroup_analysis(study_objects, model=model)

        return Response({
            'success': True,
            **results
        })

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
