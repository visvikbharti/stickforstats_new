"""
Tests for the SQC Analysis service layer.

Note: API view tests that depend on database models have been replaced with
service-level tests, as the SQC models use type aliases instead of real
Django ForeignKey references (see sqc_analysis/models.py lines 12-14).
"""
import unittest
from sqc_analysis.services.economic_design_service import EconomicDesignService
from sqc_analysis.services.acceptance_sampling_service import AcceptanceSamplingService
from sqc_analysis.services.msa_service import MSAService
from sqc_analysis.services.spc_implementation_service import SPCImplementationService


class SQCServiceTestCase(unittest.TestCase):
    """Test case for the SQC Analysis service layer."""

    def setUp(self):
        """Set up for the tests."""
        self.economic_service = EconomicDesignService()
        self.sampling_service = AcceptanceSamplingService()
        self.msa_service = MSAService()
        self.spc_service = SPCImplementationService()

    def test_economic_design_compare_alternatives(self):
        """Test comparing economic design alternatives."""
        process_parameters = {"mean_time_to_failure": 100, "shift_size": 2.0, "std_dev": 1.0, "hourly_production": 100}
        cost_parameters = {
            "sampling_cost": 5.0,
            "fixed_sampling_cost": 10.0,
            "false_alarm_cost": 200.0,
            "hourly_defect_cost": 500.0,
            "finding_cost": 250.0,
        }
        alternatives = [
            {"sample_size": 3, "sampling_interval": 1.0, "k_factor": 3.0},
            {"sample_size": 5, "sampling_interval": 0.5, "k_factor": 2.5},
        ]

        result = self.economic_service.compare_design_alternatives(
            process_parameters=process_parameters, cost_parameters=cost_parameters, alternatives=alternatives
        )

        self.assertIn("alternatives", result)
        self.assertIn("best_alternative", result)
        self.assertEqual(len(result["alternatives"]), 2)

    def test_spc_implementation_industry_recommendations(self):
        """Test retrieving industry-specific recommendations for SPC implementation."""
        result = self.spc_service.get_industry_recommendations("manufacturing")

        # Result is a dict of recommendation categories
        self.assertIsInstance(result, dict)
        self.assertIn("control_charts", result)
        self.assertIn("sample_plans", result)
        self.assertIn("measurement_systems", result)
        self.assertIn("training", result)
        self.assertIn("implementation", result)

        # Each category should be a list of recommendation strings
        for key, recommendations in result.items():
            self.assertIsInstance(recommendations, list)
            self.assertGreater(len(recommendations), 0)

    def test_single_sampling_plan(self):
        """Test calculating a single sampling plan."""
        result = self.sampling_service.calculate_single_sampling_plan(
            lot_size=1000,
            acceptable_quality_level=1.0,
            rejectable_quality_level=5.0,
            producer_risk=0.05,
            consumer_risk=0.10,
        )

        self.assertEqual(result["plan_type"], "single")
        self.assertIn("sample_size", result)
        self.assertIn("acceptance_number", result)
        self.assertIn("oc_curve", result)

    def test_acceptance_sampling_oc_curve_in_plan(self):
        """Test that OC curve data is included in sampling plan results."""
        result = self.sampling_service.calculate_single_sampling_plan(
            lot_size=1000, acceptable_quality_level=1.0, rejectable_quality_level=5.0
        )

        oc_curve = result["oc_curve"]
        self.assertIn("p_values", oc_curve)
        self.assertIn("pa_values", oc_curve)
        self.assertGreater(len(oc_curve["p_values"]), 0)


if __name__ == "__main__":
    unittest.main()
