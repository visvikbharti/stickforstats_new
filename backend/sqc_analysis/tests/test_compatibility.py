"""
Compatibility tests for the SQC Analysis module.
"""
import unittest
import importlib
from unittest.mock import MagicMock
from stickforstats.sqc_analysis import module_info


class TestModuleCompatibility(unittest.TestCase):
    """Test compatibility of the SQC Analysis module with other modules."""

    def test_module_registry_integration(self):
        """Test that the module can be registered with the core registry."""
        # Create a mock registry
        mock_registry = MagicMock()
        
        # Call the register function with the mock registry
        module_info.register(mock_registry)
        
        # Verify that register_module was called with the correct arguments
        mock_registry.register_module.assert_called_once_with('sqc_analysis', unittest.mock.ANY)
        
        # Get the module info dict that was passed
        module_info_dict = mock_registry.register_module.call_args[0][1]
        
        # Verify that the module info contains all required keys
        required_keys = [
            'name', 'display_name', 'description', 'version',
            'capabilities', 'api_namespace', 'frontend_path'
        ]
        
        for key in required_keys:
            self.assertIn(key, module_info_dict)
        
        # Verify that capabilities include all SQC analysis types
        required_capabilities = [
            'control_charts', 'process_capability', 'acceptance_sampling',
            'measurement_systems_analysis', 'economic_design', 'spc_implementation'
        ]
        
        for capability in required_capabilities:
            self.assertIn(capability, module_info_dict['capabilities'])

    def test_service_imports(self):
        """Test that all services can be imported."""
        services = [
            'stickforstats.sqc_analysis.services.control_chart_service',
            'stickforstats.sqc_analysis.services.process_capability_service',
            'stickforstats.sqc_analysis.services.acceptance_sampling_service',
            'stickforstats.sqc_analysis.services.msa_service',
            'stickforstats.sqc_analysis.services.economic_design_service',
            'stickforstats.sqc_analysis.services.spc_implementation_service',
            'stickforstats.sqc_analysis.services.utils_service'
        ]
        
        for service_module in services:
            try:
                module = importlib.import_module(service_module)
                self.assertIsNotNone(module)
            except ImportError as e:
                self.fail(f"Failed to import {service_module}: {e}")

    def test_core_dependency_compatibility(self):
        """Test compatibility with core module dependencies."""
        # Check if core models can be imported
        try:
            from stickforstats.core.models import AnalysisSession, AnalysisResult, Dataset
            self.assertTrue(True)
        except ImportError as e:
            self.fail(f"Failed to import core models: {e}")
        
        # Check if SQC models properly reference core models
        try:
            from stickforstats.sqc_analysis.models import ControlChartAnalysis
            
            # Check field relationships
            self.assertTrue(hasattr(ControlChartAnalysis, 'analysis_session'))
            self.assertTrue(hasattr(ControlChartAnalysis, 'analysis_result'))
        except (ImportError, AttributeError) as e:
            self.fail(f"Failed to verify model relationships: {e}")

    def test_api_compatibility(self):
        """Test compatibility with Django REST Framework."""
        try:
            from stickforstats.sqc_analysis.api.views import (
                ControlChartViewSet, ProcessCapabilityViewSet,
                AcceptanceSamplingViewSet, MeasurementSystemAnalysisViewSet,
                EconomicDesignViewSet, SPCImplementationViewSet
            )
            from stickforstats.sqc_analysis.api.serializers import (
                ControlChartAnalysisSerializer, ProcessCapabilityAnalysisSerializer,
                AcceptanceSamplingPlanSerializer, MeasurementSystemAnalysisSerializer,
                EconomicDesignAnalysisSerializer, SPCImplementationPlanSerializer
            )
            self.assertTrue(True)
        except ImportError as e:
            self.fail(f"Failed to import API components: {e}")

    def test_other_modules_compatibility(self):
        """Test compatibility with other statistical modules."""
        # Test importing from other modules (if available)
        other_modules = [
            'stickforstats.confidence_intervals',
            'stickforstats.probability_distributions',
            'stickforstats.doe_analysis',
            'stickforstats.pca_analysis'
        ]
        
        for module_name in other_modules:
            try:
                module = importlib.import_module(module_name)
                # If module exists, test passes
                self.assertTrue(True)
            except ImportError:
                # Skip if module doesn't exist, don't fail
                pass

    def test_service_implementations(self):
        """Test that all service classes are properly implemented."""
        service_classes = [
            ('stickforstats.sqc_analysis.services.control_chart_service', 'ControlChartService'),
            ('stickforstats.sqc_analysis.services.process_capability_service', 'ProcessCapabilityService'),
            ('stickforstats.sqc_analysis.services.acceptance_sampling_service', 'AcceptanceSamplingService'),
            ('stickforstats.sqc_analysis.services.msa_service', 'MSAService'),
            ('stickforstats.sqc_analysis.services.economic_design_service', 'EconomicDesignService'),
            ('stickforstats.sqc_analysis.services.spc_implementation_service', 'SPCImplementationService'),
            ('stickforstats.sqc_analysis.services.utils_service', 'SQCUtilsService')
        ]
        
        for module_name, class_name in service_classes:
            try:
                module = importlib.import_module(module_name)
                service_class = getattr(module, class_name)
                
                # Create an instance to ensure it's instantiable
                instance = service_class()
                self.assertIsNotNone(instance)
            except (ImportError, AttributeError) as e:
                self.fail(f"Failed to instantiate {class_name} from {module_name}: {e}")


if __name__ == '__main__':
    unittest.main()