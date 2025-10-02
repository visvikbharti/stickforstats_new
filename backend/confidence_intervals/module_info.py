"""
Confidence Intervals Module Information

This module registers the Confidence Intervals module with the central module registry.
"""

from typing import Dict, Any
from ..core.registry import ModuleRegistry

def register(registry: ModuleRegistry) -> None:
    """
    Register the Confidence Intervals module with the registry.
    
    Args:
        registry: The module registry to register with
    """
    module_info = {
        'name': 'Confidence Intervals',
        'display_name': 'Confidence Intervals',
        'description': 'Comprehensive tools for confidence interval calculations, interactive simulations, visualizations, and educational content.',
        'version': '1.1.0',
        'author': 'StickForStats Team',
        'entry_point': 'stickforstats.confidence_intervals.views.ci_dashboard',
        'api_namespace': 'stickforstats.confidence_intervals.api.urls',
        'frontend_path': '/confidence-intervals',
        'capabilities': [
            'sample_based_intervals',
            'bootstrap_intervals',
            'coverage_simulations',
            'sample_size_simulations',
            'distribution_simulations',
            'interval_visualizations',
            'educational_content'
        ],
        'dependencies': ['core'],
        'icon': 'Timeline',
        'category': 'Statistical Inference',
        'order': 15,
        'enabled': True,
        'metadata': {
            'primary_color': '#9C27B0',
            'supports_interactive_visualization': True,
            'supports_simulations': True,
            'supports_data_import': True,
            'supports_data_export': True,
            'supports_reporting': True,
            'supports_educational_content': True,
            'supports_mathematical_proofs': True
        },
        'services': {
            'interval_service': {
                'service': 'stickforstats.confidence_intervals.services.interval_service.IntervalService',
                'description': 'Service for confidence interval calculations'
            },
            'bootstrap_service': {
                'service': 'stickforstats.confidence_intervals.services.bootstrap_service.BootstrapService',
                'description': 'Service for bootstrap interval calculations'
            }
        },
        'documentation_url': '/docs/confidence-intervals',
        'tutorials': [
            {
                'title': 'Understanding Confidence Intervals',
                'url': '/tutorials/ci/introduction'
            },
            {
                'title': 'Interval Calculation Methods',
                'url': '/tutorials/ci/calculation-methods'
            },
            {
                'title': 'Bootstrap Simulation Tutorial',
                'url': '/tutorials/ci/bootstrap'
            },
            {
                'title': 'Coverage Probability Simulation',
                'url': '/tutorials/ci/coverage'
            },
            {
                'title': 'Sample Size and Interval Width',
                'url': '/tutorials/ci/sample-size'
            },
            {
                'title': 'Visualizing Confidence Intervals',
                'url': '/tutorials/ci/visualization'
            }
        ]
    }
    
    registry.register_module('confidence_intervals', module_info)