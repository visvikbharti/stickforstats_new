"""
Tests for the EconomicDesignService.
"""
import unittest
from sqc_analysis.services.economic_design_service import EconomicDesignService


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
        self.assertIn('inputs', result)

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
        self.assertIn('false_alarm_probability', performance_metrics)
        self.assertIn('detection_probability', performance_metrics)
        self.assertIn('average_time_to_detect', performance_metrics)

        # Check that the cost analysis contains the expected values
        cost_analysis = result['cost_analysis']
        self.assertIn('hourly_sampling_cost', cost_analysis)
        self.assertIn('hourly_false_alarm_cost', cost_analysis)
        self.assertIn('hourly_ooc_cost', cost_analysis)
        self.assertIn('hourly_finding_cost', cost_analysis)
        self.assertIn('total_hourly_cost', cost_analysis)
        self.assertIn('traditional_design_cost', cost_analysis)
        self.assertIn('cost_savings_percent', cost_analysis)

        # Verify values are reasonable
        self.assertGreaterEqual(optimal_design['sample_size'], self.constraints['min_sample_size'])
        self.assertLessEqual(optimal_design['sample_size'], self.constraints['max_sample_size'])
        self.assertGreaterEqual(optimal_design['sampling_interval'], self.constraints['min_sampling_interval'])
        self.assertLessEqual(optimal_design['sampling_interval'], self.constraints['max_sampling_interval'])
        self.assertGreater(optimal_design['k_factor'], 0)
        self.assertGreater(performance_metrics['in_control_arl'], 1)
        self.assertLess(performance_metrics['out_of_control_arl'], performance_metrics['in_control_arl'])

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
        self.assertIn('alternatives', result)
        self.assertIn('best_alternative', result)

        # Check that the alternatives list contains data for each alternative
        alts = result['alternatives']
        self.assertEqual(len(alts), len(alternatives))

        # Check that each alternative has been evaluated
        for alt_result in alts:
            self.assertIn('name', alt_result)
            self.assertIn('design', alt_result)
            self.assertIn('performance', alt_result)
            self.assertIn('costs', alt_result)
            self.assertIn('in_control_arl', alt_result['performance'])
            self.assertIn('out_of_control_arl', alt_result['performance'])
            self.assertIn('total_hourly_cost', alt_result['costs'])

        # Check that the best alternative has been identified (it's a string name)
        self.assertIsInstance(result['best_alternative'], str)

    def test_calculate_cost_of_quality(self):
        """Test calculating cost of quality metrics."""
        quality_parameters = {
            'training_cost': 50000,
            'planning_cost': 25000,
            'preventive_maintenance': 10000,
            'process_improvement': 15000,
            'inspection_cost': 30000,
            'testing_cost': 10000,
            'audit_cost': 5000,
            'scrap_cost': 40000,
            'rework_cost': 30000,
            'downtime_cost': 10000,
            'warranty_cost': 60000,
            'returns_cost': 30000,
            'complaint_cost': 10000,
            'lost_sales_cost': 20000,
            'total_revenue': 1000000,
        }

        result = self.service.calculate_cost_of_quality(quality_parameters)

        # Check that the result contains the expected keys
        self.assertIn('summary', result)
        self.assertIn('prevention_costs', result)
        self.assertIn('appraisal_costs', result)
        self.assertIn('internal_failure_costs', result)
        self.assertIn('external_failure_costs', result)
        self.assertIn('maturity_level', result)
        self.assertIn('recommendations', result)

        # Check summary fields
        summary = result['summary']
        self.assertIn('total_coq', summary)
        self.assertIn('conformance_cost', summary)
        self.assertIn('nonconformance_cost', summary)
        self.assertIn('coq_as_percent_of_revenue', summary)

        # Verify totals are correct
        prevention_total = result['prevention_costs']['total']
        appraisal_total = result['appraisal_costs']['total']
        internal_total = result['internal_failure_costs']['total']
        external_total = result['external_failure_costs']['total']

        expected_total_coq = prevention_total + appraisal_total + internal_total + external_total
        self.assertAlmostEqual(summary['total_coq'], expected_total_coq, places=2)

        # Conformance = prevention + appraisal
        self.assertAlmostEqual(
            summary['conformance_cost'],
            prevention_total + appraisal_total,
            places=2
        )

        # Nonconformance = internal + external failures
        self.assertAlmostEqual(
            summary['nonconformance_cost'],
            internal_total + external_total,
            places=2
        )

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
        self.assertIn('roi_percent', result)
        self.assertIn('break_even_month', result)
        self.assertIn('npv', result)
        self.assertIn('irr_annual', result)
        self.assertIn('roi_data', result)
        self.assertIn('initial_investment', result)
        self.assertIn('total_costs', result)
        self.assertIn('total_benefits', result)
        self.assertIn('net_benefit', result)

        # Check that the ROI metrics are calculated
        self.assertIsInstance(result['roi_percent'], float)
        self.assertIsInstance(result['npv'], float)

        # Check roi_data structure
        roi_data = result['roi_data']
        self.assertIn('months', roi_data)
        self.assertIn('cumulative_costs', roi_data)
        self.assertIn('cumulative_benefits', roi_data)
        self.assertIn('net_benefits', roi_data)
        self.assertIn('monthly_roi', roi_data)

        # time_horizon=24 means 24 months of data + month 0 = 25 entries
        self.assertEqual(len(roi_data['months']), time_horizon + 1)
        self.assertEqual(len(roi_data['cumulative_costs']), time_horizon + 1)
        self.assertEqual(len(roi_data['cumulative_benefits']), time_horizon + 1)

        # Verify initial investment is captured
        self.assertEqual(result['initial_investment'], initial_investment)


if __name__ == '__main__':
    unittest.main()
