"""
PCA Analysis Module Information

This module registers the PCA (Principal Component Analysis) module with the central module registry.
"""

from typing import Dict, Any
from ..core.registry import ModuleRegistry

def register(registry: ModuleRegistry) -> None:
    """
    Register the PCA Analysis module with the registry.
    
    Args:
        registry: The module registry to register with
    """
    module_info = {
        'name': 'PCA Analysis',
        'display_name': 'Principal Component Analysis',
        'description': 'Comprehensive tools for PCA analysis of genetic and multivariate data, with 2D and 3D visualizations, group analysis, and sample management.',
        'version': '1.1.0',
        'author': 'StickForStats Team',
        'entry_point': 'stickforstats.pca_analysis.views.pca_dashboard',
        'api_namespace': 'stickforstats.pca_analysis.urls',
        'frontend_path': '/pca-analysis',
        'capabilities': [
            'pca_analysis',
            'gene_analysis',
            'loading_plots',
            'contribution_plots',
            'group_analysis',
            'sample_management'
        ],
        'dependencies': ['core'],
        'icon': 'BubbleChart',
        'category': 'Multivariate Analysis',
        'order': 30,
        'enabled': True,
        'metadata': {
            'primary_color': '#4CAF50',
            'supports_interactive_visualization': True,
            'supports_2d_plots': True,
            'supports_3d_plots': True,
            'supports_data_import': True,
            'supports_data_export': True,
            'supports_reporting': True,
            'supports_batch_processing': True,
            'supports_gene_filtering': True
        },
        'services': {
            'pca_service': {
                'service': 'stickforstats.pca_analysis.services.pca_service.PCAService',
                'description': 'Service for principal component analysis'
            },
            'data_processor': {
                'service': 'stickforstats.pca_analysis.services.data_processor.DataProcessor',
                'description': 'Service for data preprocessing and normalization'
            }
        },
        'documentation_url': '/docs/pca-analysis',
        'tutorials': [
            {
                'title': 'Getting Started with PCA Analysis',
                'url': '/tutorials/pca/intro'
            },
            {
                'title': 'Understanding PCA Visualizations',
                'url': '/tutorials/pca/visualizations'
            },
            {
                'title': 'Gene Expression Analysis with PCA',
                'url': '/tutorials/pca/gene-analysis'
            },
            {
                'title': 'Interpreting Loading Plots',
                'url': '/tutorials/pca/loading-plots'
            },
            {
                'title': 'Group Analysis and Clustering',
                'url': '/tutorials/pca/group-analysis'
            }
        ]
    }
    
    registry.register_module('pca_analysis', module_info)