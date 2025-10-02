"""
DOE Analysis Module Information

This module registers the DOE (Design of Experiments) Analysis module with the central module registry.
"""

from typing import Dict, Any
from ..core.registry import ModuleRegistry

def register(registry: ModuleRegistry) -> None:
    """
    Register the DOE Analysis module with the registry.
    
    Args:
        registry: The module registry to register with
    """
    module_info = {
        'name': 'DOE Analysis',
        'display_name': 'Design of Experiments',
        'description': 'Comprehensive tools for designing, analyzing, and visualizing experimental designs including factorial, response surface, and custom designs.',
        'version': '1.1.0',
        'author': 'StickForStats Team',
        'entry_point': 'stickforstats.doe_analysis.views.doe_dashboard',
        'api_namespace': 'stickforstats.doe_analysis.api.urls',
        'frontend_path': '/doe-analysis',
        'capabilities': [
            'factorial_design',
            'response_surface',
            'central_composite',
            'box_behnken',
            'mixture_design',
            'custom_design',
            'model_analysis',
            'effect_plots'
        ],
        'dependencies': ['core'],
        'icon': 'Science',
        'category': 'Experimental Design',
        'order': 20,
        'enabled': True,
        'metadata': {
            'primary_color': '#FF9800',
            'supports_interactive_visualization': True,
            'supports_data_import': True,
            'supports_data_export': True,
            'supports_reporting': True,
            'supports_power_analysis': True,
            'supports_design_evaluation': True,
            'supports_model_diagnostics': True,
            'supports_optimization': True
        },
        'services': {
            'design_generator': {
                'service': 'stickforstats.doe_analysis.services.design_generator.DesignGenerator',
                'description': 'Service for generating experimental designs'
            },
            'model_analyzer': {
                'service': 'stickforstats.doe_analysis.services.model_analyzer.ModelAnalyzer',
                'description': 'Service for analyzing experimental results and models'
            },
            'report_generator': {
                'service': 'stickforstats.doe_analysis.services.report_generator.ReportGenerator',
                'description': 'Service for generating DOE analysis reports'
            }
        },
        'documentation_url': '/docs/doe-analysis',
        'tutorials': [
            {
                'title': 'Getting Started with DOE',
                'url': '/tutorials/doe/intro'
            },
            {
                'title': 'Designing Factorial Experiments',
                'url': '/tutorials/doe/factorial'
            },
            {
                'title': 'Response Surface Methodology',
                'url': '/tutorials/doe/response-surface'
            },
            {
                'title': 'Analyzing DOE Results',
                'url': '/tutorials/doe/analysis'
            },
            {
                'title': 'Interpreting Effect Plots',
                'url': '/tutorials/doe/effect-plots'
            },
            {
                'title': 'Process Optimization with DOE',
                'url': '/tutorials/doe/optimization'
            }
        ]
    }
    
    registry.register_module('doe_analysis', module_info)