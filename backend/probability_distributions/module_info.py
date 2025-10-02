"""
Probability Distributions Module Information

This module registers the Probability Distributions module with the central module registry.
"""

from typing import Dict, Any
from ..core.registry import ModuleRegistry

def register(registry: ModuleRegistry) -> None:
    """
    Register the Probability Distributions module with the registry.
    
    Args:
        registry: The module registry to register with
    """
    module_info = {
        'name': 'Probability Distributions',
        'display_name': 'Probability Distributions',
        'description': 'Interactive exploration and visualization of probability distributions, with calculators, simulations, and educational content.',
        'version': '1.1.0',
        'author': 'StickForStats Team',
        'entry_point': 'stickforstats.probability_distributions.views.distributions_dashboard',
        'api_namespace': 'stickforstats.probability_distributions.api.urls',
        'frontend_path': '/probability-distributions',
        'capabilities': [
            'distribution_visualization',
            'probability_calculation',
            'random_sample_generation',
            'distribution_fitting',
            'distribution_comparison',
            'educational_content',
            'clt_simulation'
        ],
        'dependencies': ['core'],
        'icon': 'ShowChart',
        'category': 'Probability Theory',
        'order': 10,
        'enabled': True,
        'metadata': {
            'primary_color': '#F44336',
            'supports_interactive_visualization': True,
            'supports_simulations': True,
            'supports_data_import': True,
            'supports_data_export': True,
            'supports_reporting': True,
            'supports_educational_content': True,
            'supports_animations': True
        },
        'services': {
            'distribution_service': {
                'service': 'stickforstats.probability_distributions.services.distribution_service.DistributionService',
                'description': 'Service for distribution calculations and operations'
            }
        },
        'documentation_url': '/docs/probability-distributions',
        'tutorials': [
            {
                'title': 'Introduction to Probability Distributions',
                'url': '/tutorials/distributions/intro'
            },
            {
                'title': 'Continuous vs. Discrete Distributions',
                'url': '/tutorials/distributions/continuous-discrete'
            },
            {
                'title': 'Working with the Normal Distribution',
                'url': '/tutorials/distributions/normal'
            },
            {
                'title': 'Binomial and Poisson Distributions',
                'url': '/tutorials/distributions/discrete'
            },
            {
                'title': 'Fitting Distributions to Data',
                'url': '/tutorials/distributions/fitting'
            },
            {
                'title': 'Central Limit Theorem Simulation',
                'url': '/tutorials/distributions/clt'
            }
        ]
    }
    
    registry.register_module('probability_distributions', module_info)