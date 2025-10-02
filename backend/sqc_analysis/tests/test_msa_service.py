"""
Tests for the MSAService.
"""
import unittest
import pandas as pd
import numpy as np
from stickforstats.sqc_analysis.services.msa_service import MSAService


class TestMSAService(unittest.TestCase):
    """Test cases for the MSAService."""

    def setUp(self):
        """Set up for the tests."""
        self.service = MSAService()
        
        # Create sample data for Gauge R&R
        np.random.seed(42)
        parts = 10
        operators = 3
        replicates = 2
        
        data = []
        for part in range(1, parts + 1):
            true_value = 10 + np.random.normal(0, 1)
            for operator in range(1, operators + 1):
                operator_bias = np.random.normal(0, 0.2)
                for replicate in range(1, replicates + 1):
                    measurement = true_value + operator_bias + np.random.normal(0, 0.5)
                    data.append({
                        'Part': f'Part_{part}',
                        'Operator': f'Operator_{operator}',
                        'Measurement': measurement
                    })
        
        self.gauge_rr_data = pd.DataFrame(data)
        
        # Create sample data for Attribute Agreement
        data = []
        for part in range(1, parts + 1):
            true_value = 'Pass' if np.random.random() > 0.3 else 'Fail'
            for operator in range(1, operators + 1):
                for replicate in range(1, replicates + 1):
                    # 80% chance of matching true value
                    if np.random.random() < 0.8:
                        assessment = true_value
                    else:
                        assessment = 'Fail' if true_value == 'Pass' else 'Pass'
                    
                    data.append({
                        'Part': f'Part_{part}',
                        'Operator': f'Operator_{operator}',
                        'Assessment': assessment,
                        'Reference': true_value
                    })
        
        self.attribute_data = pd.DataFrame(data)
        
        # Create sample data for Linearity & Bias
        data = []
        reference_values = [10, 20, 30, 40, 50]
        replicates = 3
        
        for ref in reference_values:
            for rep in range(replicates):
                # Add a small bias and error
                measurement = ref * 1.02 + np.random.normal(0, 1)
                data.append({
                    'Reference': ref,
                    'Measurement': measurement
                })
        
        self.linearity_data = pd.DataFrame(data)

    def test_calculate_gauge_rr_anova(self):
        """Test calculating Gauge R&R using ANOVA method."""
        result = self.service.calculate_gauge_rr_anova(
            data=self.gauge_rr_data,
            parts_col='Part',
            operators_col='Operator',
            measurements_col='Measurement'
        )
        
        # Check that the result contains the expected keys
        self.assertIn('summary', result)
        self.assertIn('components', result)
        self.assertIn('assessment', result)
        self.assertIn('anova_table', result)
        
        # Check that the summary contains the expected statistics
        summary = result['summary']
        self.assertIn('StdDev (Repeatability)', summary)
        self.assertIn('StdDev (Reproducibility)', summary)
        self.assertIn('StdDev (Gauge R&R)', summary)
        self.assertIn('StdDev (Part Variation)', summary)
        self.assertIn('StdDev (Total)', summary)
        self.assertIn('%StudyVar (Gauge R&R)', summary)
        self.assertIn('Number of Distinct Categories', summary)
        
        # Verify values are reasonable
        self.assertGreater(summary['StdDev (Total)'], 0)
        self.assertGreater(summary['StdDev (Gauge R&R)'], 0)
        self.assertGreater(summary['StdDev (Part Variation)'], 0)
        self.assertGreaterEqual(summary['%StudyVar (Gauge R&R)'], 0)
        self.assertLessEqual(summary['%StudyVar (Gauge R&R)'], 100)
        self.assertGreaterEqual(summary['Number of Distinct Categories'], 1)

    def test_attribute_agreement_analysis(self):
        """Test attribute agreement analysis."""
        result = self.service.attribute_agreement_analysis(
            data=self.attribute_data,
            parts_col='Part',
            operators_col='Operator',
            assessment_col='Assessment',
            reference_col='Reference'
        )
        
        # Check that the result contains the expected keys
        self.assertIn('summary', result)
        self.assertIn('operator_results', result)
        self.assertIn('assessment_counts', result)
        
        # Check that the summary contains the expected statistics
        summary = result['summary']
        self.assertIn('Overall Reproducibility', summary)
        self.assertIn('Overall Agreement with Reference', summary)
        self.assertIn('Overall Kappa', summary)
        
        # Verify values are reasonable
        self.assertGreaterEqual(summary['Overall Reproducibility'], 0)
        self.assertLessEqual(summary['Overall Reproducibility'], 100)
        self.assertGreaterEqual(summary['Overall Agreement with Reference'], 0)
        self.assertLessEqual(summary['Overall Agreement with Reference'], 100)
        self.assertGreaterEqual(summary['Overall Kappa'], -1)
        self.assertLessEqual(summary['Overall Kappa'], 1)

    def test_analyze_linearity_bias(self):
        """Test linearity and bias analysis."""
        result = self.service.analyze_linearity_bias(
            data=self.linearity_data,
            reference_col='Reference',
            measurement_col='Measurement'
        )
        
        # Check that the result contains the expected keys
        self.assertIn('overall_bias', result)
        self.assertIn('linearity', result)
        self.assertIn('bias_by_reference', result)
        
        # Check that the bias analysis contains the expected statistics
        overall_bias = result['overall_bias']
        self.assertIn('bias', overall_bias)
        self.assertIn('bias_percent', overall_bias)
        self.assertIn('t_value', overall_bias)
        self.assertIn('p_value', overall_bias)
        self.assertIn('significant', overall_bias)
        
        # Check that the linearity analysis contains the expected statistics
        linearity = result['linearity']
        self.assertIn('slope', linearity)
        self.assertIn('intercept', linearity)
        self.assertIn('r_squared', linearity)
        self.assertIn('p_value', linearity)
        self.assertIn('significant', linearity)
        
        # Verify values are reasonable
        self.assertIsInstance(overall_bias['bias'], float)
        self.assertIsInstance(linearity['slope'], float)
        self.assertGreaterEqual(linearity['r_squared'], 0)
        self.assertLessEqual(linearity['r_squared'], 1)


if __name__ == '__main__':
    unittest.main()