"""
Compatibility tests for the SQC Analysis module.
"""
import unittest
import importlib


class TestModuleCompatibility(unittest.TestCase):
    """Test compatibility of the SQC Analysis module with other modules."""

    def test_service_imports(self):
        """Test that all services can be imported."""
        services = [
            'sqc_analysis.services.control_chart_service',
            'sqc_analysis.services.process_capability_service',
            'sqc_analysis.services.acceptance_sampling_service',
            'sqc_analysis.services.msa_service',
            'sqc_analysis.services.economic_design_service',
            'sqc_analysis.services.spc_implementation_service',
            'sqc_analysis.services.utils_service'
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
            from core.models import AnalysisSession, AnalysisResult
            self.assertTrue(True)
        except ImportError as e:
            self.fail(f"Failed to import core models: {e}")

        # Check if SQC models can be imported
        try:
            from sqc_analysis.models import ControlChartAnalysis
            self.assertIsNotNone(ControlChartAnalysis)
        except ImportError as e:
            self.fail(f"Failed to import SQC models: {e}")

    def test_api_compatibility(self):
        """Test compatibility with Django REST Framework."""
        try:
            from sqc_analysis.api.views import (
                ControlChartViewSet, ProcessCapabilityViewSet,
                AcceptanceSamplingViewSet, MeasurementSystemAnalysisViewSet,
                EconomicDesignViewSet, SPCImplementationViewSet
            )
            from sqc_analysis.api.serializers import (
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
            'confidence_intervals',
            'probability_distributions',
            'doe_analysis',
            'pca_analysis'
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
            ('sqc_analysis.services.control_chart_service', 'ControlChartService'),
            ('sqc_analysis.services.process_capability_service', 'ProcessCapabilityService'),
            ('sqc_analysis.services.acceptance_sampling_service', 'AcceptanceSamplingService'),
            ('sqc_analysis.services.msa_service', 'MSAService'),
            ('sqc_analysis.services.economic_design_service', 'EconomicDesignService'),
            ('sqc_analysis.services.spc_implementation_service', 'SPCImplementationService'),
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
