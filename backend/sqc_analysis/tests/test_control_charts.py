"""
Unit tests for SQC Analysis control chart functionality.

This module provides comprehensive testing for control chart services.
"""

import unittest
import pandas as pd
import numpy as np
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
import io
import json
import logging

from stickforstats.core.models import Dataset, AnalysisSession, AnalysisResult
from stickforstats.sqc_analysis.models import ControlChartAnalysis
from stickforstats.sqc_analysis.services.control_charts import ControlChartService

User = get_user_model()
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


class ControlChartAPITestCase(TestCase):
    """Test cases for the ControlChart API endpoints."""
    
    def setUp(self):
        """Set up test data."""
        # Create a test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpassword'
        )
        
        # Create a CSV file for testing
        self.csv_content = io.StringIO()
        self.csv_content.write('Batch,Measurement\n')
        self.csv_content.write('A,10.2\nA,10.5\nA,10.3\nA,10.4\nA,10.1\n')
        self.csv_content.write('B,10.3\nB,10.6\nB,10.4\nB,10.5\nB,10.2\n')
        self.csv_content.write('C,10.1\nC,10.4\nC,10.2\nC,10.3\nC,10.0\n')
        self.csv_content.seek(0)
        
        # Create a test dataset
        self.dataset = Dataset.objects.create(
            user=self.user,
            name='Test Dataset',
            description='Test dataset for control chart analysis',
            file=SimpleUploadedFile('test_data.csv', self.csv_content.getvalue().encode()),
            file_type='csv',
            rows=15,
            columns=2,
            column_types={'Batch': {'type': 'categorical'}, 'Measurement': {'type': 'numeric'}}
        )
        
        # Create a test analysis session
        self.session = AnalysisSession.objects.create(
            user=self.user,
            dataset=self.dataset,
            name='Test Analysis',
            module='sqc',
            status='in_progress',
            configuration={
                'analysis_type': 'control_chart',
                'chart_type': 'xbar_r'
            }
        )
        
        # Create a test analysis result
        self.result = AnalysisResult.objects.create(
            session=self.session,
            name='X-bar R Chart Results',
            analysis_type='control_chart_xbar_r',
            parameters={
                'chart_type': 'xbar_r',
                'parameter_column': 'Measurement',
                'grouping_column': 'Batch',
                'sample_size': 5,
                'detect_rules': True,
                'rule_set': 'western_electric'
            },
            result_summary={
                'center_line': 10.32,
                'upper_control_limit': 10.52,
                'lower_control_limit': 10.12,
                'has_violations': False,
                'process_statistics': {
                    'average': 10.32,
                    'average_range': 0.5,
                    'standard_deviation': 0.21,
                    'sample_size': 5,
                    'num_subgroups': 3
                }
            },
            result_detail={
                'chart_type': 'xbar_r',
                'data_points': [10.3, 10.4, 10.2],
                'violations': [],
                'secondary_center_line': 0.5,
                'secondary_upper_control_limit': 1.06,
                'secondary_lower_control_limit': 0,
                'secondary_data_points': [0.4, 0.4, 0.4],
                'secondary_violations': []
            },
            interpretation='The process appears to be in statistical control. Continue monitoring.',
            plot_data={
                'x_data': [1, 2, 3],
                'xbar_values': [10.3, 10.4, 10.2],
                'range_values': [0.4, 0.4, 0.4],
                'x_center_line': 10.32,
                'x_ucl': 10.52,
                'x_lcl': 10.12,
                'r_center_line': 0.5,
                'r_ucl': 1.06,
                'r_lcl': 0,
                'subgroup_labels': ['A', 'B', 'C'],
                'x_violations': [],
                'r_violations': []
            }
        )
        
        # Create a test control chart analysis
        self.control_chart = ControlChartAnalysis.objects.create(
            analysis_session=self.session,
            analysis_result=self.result,
            chart_type='xbar_r',
            sample_size=5,
            variable_sample_size=False,
            parameter_column='Measurement',
            grouping_column='Batch',
            time_column='',
            use_custom_limits=False,
            upper_control_limit=10.52,
            lower_control_limit=10.12,
            center_line=10.32,
            detect_rules=True,
            rule_set='western_electric',
            special_causes_detected=[]
        )
    
    def test_comparison_with_streamlit(self):
        """Compare results with expected Streamlit output."""
        # Load the CSV data into a DataFrame
        df = pd.read_csv(io.StringIO(self.csv_content.getvalue()))
        
        # Use the ControlChartService to calculate results
        service = ControlChartService()
        result = service.calculate_xbar_r_chart(
            data=df,
            value_column='Measurement',
            subgroup_column='Batch',
            sample_size=5,
            detect_rules=True,
            rule_set='western_electric'
        )
        
        # Compare with the stored test result
        self.assertAlmostEqual(result.center_line, float(self.result.result_summary['center_line']), places=2)
        self.assertAlmostEqual(result.upper_control_limit, float(self.result.result_summary['upper_control_limit']), places=2)
        self.assertAlmostEqual(result.lower_control_limit, float(self.result.result_summary['lower_control_limit']), places=2)
        
        # Compare number of data points
        self.assertEqual(len(result.data_points), len(self.result.result_detail['data_points']))
        
        # Compare data point values (approximately)
        for i, (actual, expected) in enumerate(zip(result.data_points, self.result.result_detail['data_points'])):
            self.assertAlmostEqual(actual, float(expected), places=2)


if __name__ == '__main__':
    unittest.main()