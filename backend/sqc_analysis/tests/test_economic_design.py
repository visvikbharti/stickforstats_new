"""
Tests for the EconomicDesignService.
"""
import unittest
from stickforstats.sqc_analysis.services.economic_design_service import EconomicDesignService


class TestEconomicDesignService(unittest.TestCase):
    """Test cases for the EconomicDesignService."""

    def setUp(self):
        """Set up for the tests."""
        self.service = EconomicDesignService()
        
        # Define common parameters for tests
        self.process_parameters = {
            'mean_time_to_failure': 100,
            'shift_size': 2.0,
            'std_dev': 1.0,
            'hourly_production': 100
        }
        
        self.cost_parameters = {
            'sampling_cost': 5.0,
            'fixed_sampling_cost': 10.0,
            'false_alarm_cost': 200.0,
            'hourly_defect_cost': 500.0,
            'finding_cost': 250.0
        }
        
        self.constraints = {
            'min_sample_size': 1,
            'max_sample_size': 10,
            'min_sampling_interval': 0.25,
            'max_sampling_interval': 5.0,
            'min_detection_power': 0.8,
            'max_false_alarm_rate': 0.01
        }

    def test_calculate_optimal_design_parameters(self):
        """Test calculating optimal design parameters."""
        result = self.service.calculate_optimal_design_parameters(
            process_parameters=self.process_parameters,
            cost_parameters=self.cost_parameters,
            chart_type='xbar',
            constraints=self.constraints
        )
        
        # Check that the result contains the expected keys
        self.assertIn('optimal_design', result)
        self.assertIn('performance_metrics', result)
        self.assertIn('cost_analysis', result)
        self.assertIn('search_details', result)
        
        # Check that the optimal design contains the expected parameters
        optimal_design = result['optimal_design']
        self.assertIn('sample_size', optimal_design)
        self.assertIn('sampling_interval', optimal_design)
        self.assertIn('k_factor', optimal_design)
        self.assertIn('ucl', optimal_design)
        self.assertIn('lcl', optimal_design)
        self.assertIn('center_line', optimal_design)
        
        # Check that the performance metrics contain the expected values
        performance_metrics = result['performance_metrics']
        self.assertIn('in_control_arl', performance_metrics)
        self.assertIn('out_of_control_arl', performance_metrics)
        self.assertIn('false_alarm_rate', performance_metrics)
        self.assertIn('detection_power', performance_metrics)
        
        # Check that the cost analysis contains the expected values
        cost_analysis = result['cost_analysis']
        self.assertIn('sampling_cost_per_hour', cost_analysis)
        self.assertIn('false_alarm_cost_per_hour', cost_analysis)
        self.assertIn('expected_cost_of_quality', cost_analysis)
        self.assertIn('total_hourly_cost', cost_analysis)
        self.assertIn('cost_without_spc', cost_analysis)
        self.assertIn('cost_savings_percent', cost_analysis)
        
        # Verify values are reasonable
        self.assertGreaterEqual(optimal_design['sample_size'], self.constraints['min_sample_size'])
        self.assertLessEqual(optimal_design['sample_size'], self.constraints['max_sample_size'])
        self.assertGreaterEqual(optimal_design['sampling_interval'], self.constraints['min_sampling_interval'])
        self.assertLessEqual(optimal_design['sampling_interval'], self.constraints['max_sampling_interval'])
        self.assertGreater(optimal_design['k_factor'], 0)
        self.assertGreater(performance_metrics['in_control_arl'], 1)
        self.assertLess(performance_metrics['out_of_control_arl'], performance_metrics['in_control_arl'])
        self.assertLessEqual(performance_metrics['false_alarm_rate'], self.constraints['max_false_alarm_rate'])
        self.assertGreaterEqual(performance_metrics['detection_power'], self.constraints['min_detection_power'])
        
        # Cost analysis should show some savings
        self.assertLess(cost_analysis['total_hourly_cost'], cost_analysis['cost_without_spc'])
        self.assertGreater(cost_analysis['cost_savings_percent'], 0)

    def test_compare_design_alternatives(self):
        """Test comparing multiple design alternatives."""
        alternatives = [
            {'sample_size': 3, 'sampling_interval': 1.0, 'k_factor': 3.0},
            {'sample_size': 5, 'sampling_interval': 0.5, 'k_factor': 2.5},
            {'sample_size': 2, 'sampling_interval': 2.0, 'k_factor': 3.5}
        ]
        
        result = self.service.compare_design_alternatives(
            process_parameters=self.process_parameters,
            cost_parameters=self.cost_parameters,
            alternatives=alternatives
        )
        
        # Check that the result contains the expected keys
        self.assertIn('comparison_table', result)
        self.assertIn('best_alternative', result)
        self.assertIn('visualization_data', result)
        
        # Check that the comparison table contains data for each alternative
        comparison_table = result['comparison_table']
        self.assertEqual(len(comparison_table), len(alternatives))
        
        # Check that each alternative has been evaluated
        for i, alt in enumerate(alternatives):
            alt_result = comparison_table[i]
            self.assertEqual(alt_result['sample_size'], alt['sample_size'])
            self.assertEqual(alt_result['sampling_interval'], alt['sampling_interval'])
            self.assertEqual(alt_result['k_factor'], alt['k_factor'])
            self.assertIn('in_control_arl', alt_result)
            self.assertIn('out_of_control_arl', alt_result)
            self.assertIn('total_hourly_cost', alt_result)
        
        # Check that the best alternative has been identified
        self.assertIn('index', result['best_alternative'])
        self.assertIn('cost', result['best_alternative'])
        self.assertGreaterEqual(result['best_alternative']['index'], 0)
        self.assertLess(result['best_alternative']['index'], len(alternatives))

    def test_calculate_cost_of_quality(self):
        """Test calculating cost of quality metrics."""
        quality_parameters = {
            'prevention_costs': [50000, 75000, 100000],
            'appraisal_costs': [30000, 40000, 45000],
            'internal_failure_costs': [80000, 50000, 30000],
            'external_failure_costs': [120000, 80000, 45000],
            'total_revenue': [1000000, 1100000, 1200000],
            'time_periods': ['Year 1', 'Year 2', 'Year 3']
        }
        
        result = self.service.calculate_cost_of_quality(quality_parameters)
        
        # Check that the result contains the expected keys
        self.assertIn('cost_breakdown', result)
        self.assertIn('cost_of_quality_percent', result)
        self.assertIn('category_trends', result)
        self.assertIn('optimization_recommendations', result)
        
        # Check that the cost breakdown contains data for each time period
        cost_breakdown = result['cost_breakdown']
        self.assertEqual(len(cost_breakdown), len(quality_parameters['time_periods']))
        
        # Check that the cost percentages are calculated correctly
        cost_of_quality_percent = result['cost_of_quality_percent']
        self.assertEqual(len(cost_of_quality_percent), len(quality_parameters['time_periods']))
        
        # Manual calculation for first period
        total_coq = (
            quality_parameters['prevention_costs'][0] +
            quality_parameters['appraisal_costs'][0] +
            quality_parameters['internal_failure_costs'][0] +
            quality_parameters['external_failure_costs'][0]
        )
        expected_percent = (total_coq / quality_parameters['total_revenue'][0]) * 100
        self.assertAlmostEqual(cost_of_quality_percent[0], expected_percent, places=5)
        
        # Check that the category trends have been calculated
        category_trends = result['category_trends']
        self.assertIn('prevention', category_trends)
        self.assertIn('appraisal', category_trends)
        self.assertIn('internal_failure', category_trends)
        self.assertIn('external_failure', category_trends)
        self.assertIn('total_cost_of_quality', category_trends)

    def test_calculate_spc_roi(self):
        """Test calculating ROI for SPC implementation."""
        initial_investment = 50000
        monthly_costs = [2000] * 24  # $2000 per month for 2 years
        monthly_benefits = [0, 0, 0, 0, 2000, 4000, 6000, 8000, 10000] + [10000] * 15  # Ramp-up period then steady
        time_horizon = 24  # 2 years
        
        result = self.service.calculate_spc_roi(
            initial_investment=initial_investment,
            monthly_costs=monthly_costs,
            monthly_benefits=monthly_benefits,
            time_horizon=time_horizon
        )
        
        # Check that the result contains the expected keys
        self.assertIn('roi', result)
        self.assertIn('payback_period', result)
        self.assertIn('npv', result)
        self.assertIn('irr', result)
        self.assertIn('cumulative_cash_flow', result)
        self.assertIn('monthly_cash_flow', result)
        
        # Check that the ROI metrics are calculated
        self.assertIsInstance(result['roi'], float)
        self.assertIsInstance(result['payback_period'], float)
        self.assertIsInstance(result['npv'], float)
        
        # Check that the cash flows are calculated for each month
        monthly_cash_flow = result['monthly_cash_flow']
        self.assertEqual(len(monthly_cash_flow), time_horizon)
        
        # The first month should include the initial investment
        self.assertEqual(monthly_cash_flow[0], -initial_investment - monthly_costs[0] + monthly_benefits[0])
        
        # All other months should be the difference between benefits and costs
        for i in range(1, time_horizon):
            self.assertEqual(monthly_cash_flow[i], monthly_benefits[i] - monthly_costs[i])
        
        # Cumulative cash flow should have the same length
        self.assertEqual(len(result['cumulative_cash_flow']), time_horizon)
        
        # The first cumulative value should match the first monthly value
        self.assertEqual(result['cumulative_cash_flow'][0], monthly_cash_flow[0])
        
        # Each subsequent cumulative value should add the previous
        for i in range(1, time_horizon):
            self.assertEqual(
                result['cumulative_cash_flow'][i],
                result['cumulative_cash_flow'][i-1] + monthly_cash_flow[i]
            )


if __name__ == '__main__':
    unittest.main()