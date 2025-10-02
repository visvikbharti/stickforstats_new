"""
Tests for the AcceptanceSamplingService.
"""
import unittest
import numpy as np
from stickforstats.sqc_analysis.services.acceptance_sampling_service import AcceptanceSamplingService


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
            consumer_risk=0.10
        )
        
        # Check that the result contains the expected keys
        self.assertIn('plan_type', result)
        self.assertIn('sample_size', result)
        self.assertIn('acceptance_number', result)
        self.assertIn('oc_curve', result)
        
        # Check that the values are of the expected types
        self.assertEqual(result['plan_type'], 'single')
        self.assertIsInstance(result['sample_size'], int)
        self.assertIsInstance(result['acceptance_number'], int)
        self.assertIsInstance(result['oc_curve'], dict)
        
        # Verify sample size and acceptance number are reasonable
        self.assertGreater(result['sample_size'], 0)
        self.assertGreaterEqual(result['acceptance_number'], 0)

    def test_calculate_double_sampling_plan(self):
        """Test calculating a double sampling plan."""
        result = self.service.calculate_double_sampling_plan(
            lot_size=1000,
            acceptable_quality_level=1.0,
            rejectable_quality_level=5.0,
            producer_risk=0.05,
            consumer_risk=0.10
        )
        
        # Check that the result contains the expected keys
        self.assertIn('plan_type', result)
        self.assertIn('first_sample_size', result)
        self.assertIn('first_acceptance_number', result)
        self.assertIn('first_rejection_number', result)
        self.assertIn('second_sample_size', result)
        self.assertIn('second_acceptance_number', result)
        self.assertIn('second_rejection_number', result)
        self.assertIn('oc_curve', result)
        
        # Check that the values are of the expected types
        self.assertEqual(result['plan_type'], 'double')
        self.assertIsInstance(result['first_sample_size'], int)
        self.assertIsInstance(result['first_acceptance_number'], int)
        self.assertIsInstance(result['first_rejection_number'], int)
        self.assertIsInstance(result['second_sample_size'], int)
        self.assertIsInstance(result['second_acceptance_number'], int)
        self.assertIsInstance(result['second_rejection_number'], int)
        
        # Verify sample sizes and acceptance numbers are reasonable
        self.assertGreater(result['first_sample_size'], 0)
        self.assertGreaterEqual(result['first_acceptance_number'], 0)
        self.assertGreater(result['first_rejection_number'], result['first_acceptance_number'])
        self.assertGreater(result['second_sample_size'], 0)
        self.assertGreaterEqual(result['second_acceptance_number'], 0)
        self.assertGreater(result['second_rejection_number'], result['second_acceptance_number'])

    def test_calculate_oc_curve(self):
        """Test calculating the OC curve for a sampling plan."""
        oc_curve = self.service.calculate_oc_curve(
            sample_size=50,
            acceptance_number=2,
            quality_levels=np.linspace(0.01, 0.10, 10).tolist()
        )
        
        # Check that the result is a dictionary with quality levels and probabilities
        self.assertIsInstance(oc_curve, dict)
        self.assertIn('quality_levels', oc_curve)
        self.assertIn('probabilities', oc_curve)
        
        # Check that the arrays have the expected length
        self.assertEqual(len(oc_curve['quality_levels']), 10)
        self.assertEqual(len(oc_curve['probabilities']), 10)
        
        # Check that probabilities are between 0 and 1
        for prob in oc_curve['probabilities']:
            self.assertGreaterEqual(prob, 0.0)
            self.assertLessEqual(prob, 1.0)
        
        # Verify that the probabilities decrease as quality levels increase
        self.assertGreater(oc_curve['probabilities'][0], oc_curve['probabilities'][-1])


if __name__ == '__main__':
    unittest.main()