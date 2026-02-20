"""
Unit tests for SQC Analysis control chart functionality.

This module provides comprehensive testing for control chart services.
"""

import unittest
import pandas as pd
import numpy as np
from django.test import TestCase
import logging

from sqc_analysis.services.control_charts import ControlChartService

logger = logging.getLogger(__name__)


class ControlChartServiceTestCase(TestCase):
    """Test cases for the ControlChartService."""
    
    def setUp(self):
        """Set up test data."""
        # Create a control chart service instance
        self.service = ControlChartService()
        
        # Create test datasets
        self.xbar_r_data = pd.DataFrame({
            'Batch': ['A', 'A', 'A', 'A', 'A',
                     'B', 'B', 'B', 'B', 'B',
                     'C', 'C', 'C', 'C', 'C',
                     'D', 'D', 'D', 'D', 'D',
                     'E', 'E', 'E', 'E', 'E'],
            'Measurement': [10.2, 10.5, 10.3, 10.4, 10.1,
                           10.3, 10.6, 10.4, 10.5, 10.2,
                           10.1, 10.4, 10.2, 10.3, 10.0,
                           10.6, 10.7, 10.5, 10.8, 10.6,
                           10.4, 10.3, 10.2, 10.5, 10.3]
        })
        
        self.i_mr_data = pd.DataFrame({
            'Time': pd.date_range(start='2023-01-01', periods=20, freq='D'),
            'Measurement': [10.2, 10.5, 10.3, 10.4, 10.1, 10.7, 10.6, 10.2, 10.3, 10.5,
                           10.4, 10.3, 10.8, 10.6, 10.5, 10.4, 10.2, 10.1, 10.3, 10.4]
        })
        
        self.p_chart_data = pd.DataFrame({
            'Batch': ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
            'SampleSize': [100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
            'Defectives': [5, 7, 4, 6, 8, 5, 7, 9, 6, 4]
        })
    
    def test_calculate_xbar_r_chart(self):
        """Test calculation of X-bar and R chart."""
        # Calculate control chart
        result = self.service.calculate_xbar_r_chart(
            data=self.xbar_r_data,
            value_column='Measurement',
            subgroup_column='Batch',
            sample_size=5,
            detect_rules=True,
            rule_set='western_electric'
        )
        
        # Verify chart type
        self.assertEqual(result.chart_type, 'xbar_r')
        
        # Verify result structure
        self.assertIsNotNone(result.center_line)
        self.assertIsNotNone(result.upper_control_limit)
        self.assertIsNotNone(result.lower_control_limit)
        self.assertIsNotNone(result.data_points)
        self.assertIsNotNone(result.secondary_center_line)
        self.assertIsNotNone(result.secondary_upper_control_limit)
        self.assertIsNotNone(result.secondary_lower_control_limit)
        self.assertIsNotNone(result.secondary_data_points)
        
        # Verify data points length
        self.assertEqual(len(result.data_points), 5)  # 5 subgroups
        self.assertEqual(len(result.secondary_data_points), 5)  # 5 ranges
        
        # Verify reasonable control limits
        self.assertLess(result.lower_control_limit, result.center_line)
        self.assertGreater(result.upper_control_limit, result.center_line)
        
        # Verify control limits calculation (approximate)
        # For X-bar chart, UCL = Xbar-bar + A2 * Rbar
        # For R chart, UCL = D4 * Rbar, LCL = D3 * Rbar
        x_bar_values = np.array(result.data_points)
        r_values = np.array(result.secondary_data_points)
        
        x_bar_bar = np.mean(x_bar_values)
        r_bar = np.mean(r_values)
        
        # Constants for n=5: A2=0.577, D3=0, D4=2.115
        a2 = 0.577
        d3 = 0
        d4 = 2.115
        
        expected_x_ucl = x_bar_bar + a2 * r_bar
        expected_x_lcl = x_bar_bar - a2 * r_bar
        expected_r_ucl = d4 * r_bar
        expected_r_lcl = d3 * r_bar
        
        self.assertAlmostEqual(result.center_line, x_bar_bar, places=2)
        self.assertAlmostEqual(result.upper_control_limit, expected_x_ucl, places=2)
        self.assertAlmostEqual(result.lower_control_limit, expected_x_lcl, places=2)
        self.assertAlmostEqual(result.secondary_center_line, r_bar, places=2)
        self.assertAlmostEqual(result.secondary_upper_control_limit, expected_r_ucl, places=2)
        self.assertAlmostEqual(result.secondary_lower_control_limit, expected_r_lcl, places=2)
    
    def test_calculate_i_mr_chart(self):
        """Test calculation of I-MR chart."""
        # Calculate control chart
        result = self.service.calculate_i_mr_chart(
            data=self.i_mr_data,
            value_column='Measurement',
            time_column='Time',
            detect_rules=True,
            rule_set='western_electric'
        )
        
        # Verify chart type
        self.assertEqual(result.chart_type, 'i_mr')
        
        # Verify result structure
        self.assertIsNotNone(result.center_line)
        self.assertIsNotNone(result.upper_control_limit)
        self.assertIsNotNone(result.lower_control_limit)
        self.assertIsNotNone(result.data_points)
        self.assertIsNotNone(result.secondary_center_line)
        self.assertIsNotNone(result.secondary_upper_control_limit)
        self.assertIsNotNone(result.secondary_lower_control_limit)
        self.assertIsNotNone(result.secondary_data_points)
        
        # Verify data points length
        self.assertEqual(len(result.data_points), 20)  # 20 individual measurements
        self.assertEqual(len(result.secondary_data_points), 20)  # 19 moving ranges + 1 None at beginning
        
        # Verify reasonable control limits
        self.assertLess(result.lower_control_limit, result.center_line)
        self.assertGreater(result.upper_control_limit, result.center_line)
        
        # Verify control limits calculation (approximate)
        individual_values = np.array(result.data_points)
        moving_range_values = np.array([mr for mr in result.secondary_data_points if mr is not None])
        
        i_bar = np.mean(individual_values)
        mr_bar = np.mean(moving_range_values)
        
        # Constants for I-MR: d2=1.128, d3=0, d4=3.267
        d2 = 1.128
        d4 = 3.267
        
        expected_i_ucl = i_bar + 3 * (mr_bar / d2)
        expected_i_lcl = i_bar - 3 * (mr_bar / d2)
        expected_mr_ucl = d4 * mr_bar
        expected_mr_lcl = 0  # d3=0 for n=2
        
        self.assertAlmostEqual(result.center_line, i_bar, places=2)
        self.assertAlmostEqual(result.upper_control_limit, expected_i_ucl, places=2)
        self.assertAlmostEqual(result.lower_control_limit, expected_i_lcl, places=2)
        self.assertAlmostEqual(result.secondary_center_line, mr_bar, places=2)
        self.assertAlmostEqual(result.secondary_upper_control_limit, expected_mr_ucl, places=2)
        self.assertAlmostEqual(result.secondary_lower_control_limit, expected_mr_lcl, places=2)
    
    def test_calculate_p_chart(self):
        """Test calculation of p chart."""
        # Calculate control chart
        result = self.service.calculate_p_chart(
            data=self.p_chart_data,
            defective_column='Defectives',
            sample_size_column='SampleSize',
            detect_rules=True,
            rule_set='western_electric'
        )
        
        # Verify chart type
        self.assertEqual(result.chart_type, 'p')
        
        # Verify result structure
        self.assertIsNotNone(result.center_line)
        self.assertIsNotNone(result.upper_control_limit)
        self.assertIsNotNone(result.lower_control_limit)
        self.assertIsNotNone(result.data_points)
        
        # Verify data points length
        self.assertEqual(len(result.data_points), 10)  # 10 samples
        
        # Verify reasonable control limits
        self.assertLess(result.lower_control_limit, result.center_line)
        self.assertGreater(result.upper_control_limit, result.center_line)
        
        # Verify control limits calculation (approximate)
        p_values = np.array(result.data_points)
        p_bar = np.mean(p_values)
        n = 100  # fixed sample size
        
        expected_p_ucl = p_bar + 3 * np.sqrt((p_bar * (1 - p_bar)) / n)
        expected_p_lcl = max(0, p_bar - 3 * np.sqrt((p_bar * (1 - p_bar)) / n))
        
        self.assertAlmostEqual(result.center_line, p_bar, places=2)
        self.assertAlmostEqual(result.upper_control_limit, expected_p_ucl, places=2)
        self.assertAlmostEqual(result.lower_control_limit, expected_p_lcl, places=2)
    
    def test_rule_violation_detection(self):
        """Test detection of rule violations."""
        # Create a dataset with an obvious out-of-control point
        data = pd.DataFrame({
            'Batch': ['A', 'A', 'A', 'A', 'A',
                     'B', 'B', 'B', 'B', 'B',
                     'C', 'C', 'C', 'C', 'C',
                     'D', 'D', 'D', 'D', 'D',
                     'E', 'E', 'E', 'E', 'E'],
            'Measurement': [10.2, 10.5, 10.3, 10.4, 10.1,
                           10.3, 10.6, 10.4, 10.5, 10.2,
                           10.1, 10.4, 10.2, 10.3, 10.0,
                           15.0, 15.1, 15.2, 15.0, 15.1, # Obvious shift
                           10.4, 10.3, 10.2, 10.5, 10.3]
        })
        
        # Calculate control chart
        result = self.service.calculate_xbar_r_chart(
            data=data,
            value_column='Measurement',
            subgroup_column='Batch',
            sample_size=5,
            detect_rules=True,
            rule_set='western_electric'
        )
        
        # Verify that a rule violation is detected
        self.assertTrue(len(result.violations) > 0)
        
        # Verify that the violation is at the correct index (point D)
        violations = [idx for idx, _ in result.violations]
        self.assertIn(3, violations)  # 4th point (0-indexed) should have violation
        
        # Verify the rule type (Rule 1: Point beyond control limits)
        rule_types = [rule for _, rule in result.violations]
        self.assertIn(1, rule_types)  # Rule 1: Point beyond control limits
    
    def test_custom_control_limits(self):
        """Test with custom control limits."""
        # Define custom control limits
        custom_limits = {
            'x_ucl': 10.7,
            'x_lcl': 10.1,
            'x_cl': 10.4,
            'r_ucl': 0.8,
            'r_lcl': 0.0,
            'r_cl': 0.4
        }
        
        # Calculate control chart with custom limits
        result = self.service.calculate_xbar_r_chart(
            data=self.xbar_r_data,
            value_column='Measurement',
            subgroup_column='Batch',
            sample_size=5,
            detect_rules=True,
            rule_set='western_electric',
            custom_control_limits=custom_limits
        )
        
        # Verify custom control limits are applied
        self.assertEqual(result.center_line, custom_limits['x_cl'])
        self.assertEqual(result.upper_control_limit, custom_limits['x_ucl'])
        self.assertEqual(result.lower_control_limit, custom_limits['x_lcl'])
        self.assertEqual(result.secondary_center_line, custom_limits['r_cl'])
        self.assertEqual(result.secondary_upper_control_limit, custom_limits['r_ucl'])
        self.assertEqual(result.secondary_lower_control_limit, custom_limits['r_lcl'])


if __name__ == '__main__':
    unittest.main()