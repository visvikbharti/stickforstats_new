"""
Tests for the AcceptanceSamplingService.
"""
import unittest
from sqc_analysis.services.acceptance_sampling_service import AcceptanceSamplingService


class TestAcceptanceSamplingService(unittest.TestCase):
    """Test cases for the AcceptanceSamplingService."""

    def setUp(self):
        """Set up for the tests."""
        self.service = AcceptanceSamplingService()

    def test_calculate_single_sampling_plan(self):
        """Test calculating a single sampling plan."""
        result = self.service.calculate_single_sampling_plan(
            lot_size=1000,
            acceptable_quality_level=1.0,
            rejectable_quality_level=5.0,
            producer_risk=0.05,
            consumer_risk=0.10,
        )

        # Check that the result contains the expected keys
        self.assertIn("plan_type", result)
        self.assertIn("sample_size", result)
        self.assertIn("acceptance_number", result)
        self.assertIn("oc_curve", result)

        # Check that the values are of the expected types
        self.assertEqual(result["plan_type"], "single")
        self.assertIsInstance(result["sample_size"], int)
        self.assertIsInstance(result["acceptance_number"], int)
        self.assertIsInstance(result["oc_curve"], dict)

        # Verify sample size and acceptance number are reasonable
        self.assertGreater(result["sample_size"], 0)
        self.assertGreaterEqual(result["acceptance_number"], 0)

    def test_calculate_double_sampling_plan(self):
        """Test calculating a double sampling plan."""
        result = self.service.calculate_double_sampling_plan(
            lot_size=1000,
            acceptable_quality_level=1.0,
            rejectable_quality_level=5.0,
            producer_risk=0.05,
            consumer_risk=0.10,
        )

        # Check that the result contains the expected keys
        self.assertIn("plan_type", result)
        self.assertIn("first_sample_size", result)
        self.assertIn("first_acceptance_number", result)
        self.assertIn("first_rejection_number", result)
        self.assertIn("second_sample_size", result)
        self.assertIn("second_acceptance_number", result)
        self.assertIn("oc_curve", result)

        # Check that the values are of the expected types
        self.assertEqual(result["plan_type"], "double")
        self.assertIsInstance(result["first_sample_size"], int)
        self.assertIsInstance(result["first_acceptance_number"], int)
        self.assertIsInstance(result["first_rejection_number"], int)
        self.assertIsInstance(result["second_sample_size"], int)
        self.assertIsInstance(result["second_acceptance_number"], int)

        # Verify sample sizes and acceptance numbers are reasonable
        self.assertGreater(result["first_sample_size"], 0)
        self.assertGreaterEqual(result["first_acceptance_number"], 0)
        self.assertGreater(result["first_rejection_number"], result["first_acceptance_number"])
        self.assertGreater(result["second_sample_size"], 0)
        self.assertGreaterEqual(result["second_acceptance_number"], 0)

    def test_calculate_oc_curve(self):
        """Test that OC curve data is included in single sampling plan results."""
        result = self.service.calculate_single_sampling_plan(
            lot_size=1000,
            acceptable_quality_level=1.0,
            rejectable_quality_level=5.0,
            producer_risk=0.05,
            consumer_risk=0.10,
        )

        # Check that OC curve data is present
        oc_curve = result["oc_curve"]
        self.assertIn("p_values", oc_curve)
        self.assertIn("pa_values", oc_curve)

        # Check that the arrays have the expected length
        self.assertEqual(len(oc_curve["p_values"]), len(oc_curve["pa_values"]))
        self.assertGreater(len(oc_curve["p_values"]), 0)

        # Check that probabilities are between 0 and 1 (with floating point tolerance)
        for prob in oc_curve["pa_values"]:
            self.assertGreaterEqual(prob, -1e-10)
            self.assertLessEqual(prob, 1.0 + 1e-10)

        # Verify the OC curve is monotonically non-increasing (within tolerance)
        # At p=0, acceptance probability should be ~1.0
        self.assertAlmostEqual(oc_curve["pa_values"][0], 1.0, places=5)


if __name__ == "__main__":
    unittest.main()
