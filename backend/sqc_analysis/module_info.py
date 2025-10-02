"""
SQC Analysis Module Information

This module registers the SQC (Statistical Quality Control) Analysis module with the central module registry.
"""

from typing import Dict, Any
from ..core.registry import ModuleRegistry

def register(registry: ModuleRegistry) -> None:
    """
    Register the SQC Analysis module with the registry.
    
    Args:
        registry: The module registry to register with
    """
    module_info = {
        'name': 'SQC Analysis',
        'display_name': 'Statistical Quality Control Analysis',
        'description': 'Comprehensive tools for control charts, process capability, acceptance sampling, measurement systems analysis, economic design, and SPC implementation.',
        'version': '1.1.0',
        'author': 'StickForStats Team',
        'entry_point': 'stickforstats.sqc_analysis.views.sqc_dashboard',
        'api_namespace': 'stickforstats.sqc_analysis.api.urls',
        'frontend_path': '/sqc-analysis',
        'capabilities': [
            'control_charts',
            'process_capability',
            'acceptance_sampling',
            'measurement_systems_analysis',
            'economic_design',
            'spc_implementation'
        ],
        'dependencies': ['core'],
        'icon': 'BarChart',
        'category': 'Quality Control',
        'order': 40,
        'enabled': True,
        'metadata': {
            'primary_color': '#2196F3',
            'supports_interactive_visualization': True,
            'supports_simulation': True,
            'supports_data_import': True,
            'supports_data_export': True,
            'supports_reporting': True,
            'supports_cost_optimization': True,
            'supports_roadmap_generation': True
        },
        'data_handlers': {
            'control_chart_data': {
                'handler': 'stickforstats.sqc_analysis.services.data_handlers.handle_control_chart_data',
                'description': 'Processes data for control chart analysis'
            },
            'capability_data': {
                'handler': 'stickforstats.sqc_analysis.services.data_handlers.handle_capability_data',
                'description': 'Processes data for process capability analysis'
            },
            'sampling_plan_data': {
                'handler': 'stickforstats.sqc_analysis.services.data_handlers.handle_sampling_plan_data',
                'description': 'Processes data for acceptance sampling plans'
            },
            'msa_data': {
                'handler': 'stickforstats.sqc_analysis.services.data_handlers.handle_msa_data',
                'description': 'Processes data for measurement systems analysis'
            },
            'economic_design_data': {
                'handler': 'stickforstats.sqc_analysis.services.data_handlers.handle_economic_design_data',
                'description': 'Processes data for economic design of control charts'
            },
            'spc_implementation_data': {
                'handler': 'stickforstats.sqc_analysis.services.data_handlers.handle_spc_implementation_data',
                'description': 'Processes data for SPC implementation planning'
            }
        },
        'services': {
            'control_chart': {
                'service': 'stickforstats.sqc_analysis.services.control_chart_service.ControlChartService',
                'description': 'Service for control chart analysis and monitoring'
            },
            'process_capability': {
                'service': 'stickforstats.sqc_analysis.services.process_capability_service.ProcessCapabilityService',
                'description': 'Service for process capability analysis'
            },
            'acceptance_sampling': {
                'service': 'stickforstats.sqc_analysis.services.acceptance_sampling_service.AcceptanceSamplingService',
                'description': 'Service for designing and analyzing acceptance sampling plans'
            },
            'msa': {
                'service': 'stickforstats.sqc_analysis.services.msa_service.MSAService',
                'description': 'Service for measurement system analysis'
            },
            'economic_design': {
                'service': 'stickforstats.sqc_analysis.services.economic_design_service.EconomicDesignService',
                'description': 'Service for economic design of control charts'
            },
            'spc_implementation': {
                'service': 'stickforstats.sqc_analysis.services.spc_implementation_service.SPCImplementationService',
                'description': 'Service for SPC implementation strategies and planning'
            },
            'utils': {
                'service': 'stickforstats.sqc_analysis.services.utils_service.SQCUtilsService',
                'description': 'Utility service for SQC analysis'
            }
        },
        'documentation_url': '/docs/sqc-analysis',
        'tutorials': [
            {
                'title': 'Getting Started with Control Charts',
                'url': '/tutorials/sqc/control-charts-intro'
            },
            {
                'title': 'Performing Process Capability Analysis',
                'url': '/tutorials/sqc/process-capability'
            },
            {
                'title': 'Designing Acceptance Sampling Plans',
                'url': '/tutorials/sqc/acceptance-sampling'
            },
            {
                'title': 'Conducting Measurement System Analysis',
                'url': '/tutorials/sqc/msa'
            },
            {
                'title': 'Cost Optimizing Control Charts',
                'url': '/tutorials/sqc/economic-design'
            },
            {
                'title': 'Creating SPC Implementation Plans',
                'url': '/tutorials/sqc/spc-implementation'
            }
        ]
    }
    
    registry.register_module('sqc_analysis', module_info)