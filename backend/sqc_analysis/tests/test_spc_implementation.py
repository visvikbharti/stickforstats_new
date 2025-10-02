"""
Tests for the SPCImplementationService.
"""
import unittest
from datetime import datetime, timedelta
from stickforstats.sqc_analysis.services.spc_implementation_service import SPCImplementationService


class TestSPCImplementationService(unittest.TestCase):
    """Test cases for the SPCImplementationService."""

    def setUp(self):
        """Set up for the tests."""
        self.service = SPCImplementationService()

    def test_generate_implementation_roadmap(self):
        """Test generating an implementation roadmap."""
        implementation_parameters = {
            'organization_size': 'medium',
            'industry': 'manufacturing',
            'existing_quality_system': 'basic',
            'process_complexity': 'medium',
            'implementation_scope': 'department'
        }
        
        result = self.service.generate_implementation_roadmap(implementation_parameters)
        
        # Check that the result contains the expected keys
        self.assertIn('phases', result)
        self.assertIn('total_duration', result)
        self.assertIn('start_date', result)
        self.assertIn('end_date', result)
        self.assertIn('organization_info', result)
        
        # Check that the phases are properly structured
        phases = result['phases']
        self.assertGreater(len(phases), 0)
        
        for phase in phases:
            self.assertIn('name', phase)
            self.assertIn('description', phase)
            self.assertIn('duration', phase)
            self.assertIn('start_week', phase)
            self.assertIn('end_week', phase)
            self.assertIn('activities', phase)
            self.assertIn('deliverables', phase)
            self.assertIn('resources', phase)
            
            # Check that activities are defined
            self.assertGreater(len(phase['activities']), 0)
            
            # Check that week numbers make sense
            self.assertGreaterEqual(phase['start_week'], 1)
            self.assertGreater(phase['end_week'], phase['start_week'])
            self.assertEqual(phase['duration'], phase['end_week'] - phase['start_week'] + 1)
        
        # Check that the dates are valid
        self.assertIsInstance(result['start_date'], str)
        self.assertIsInstance(result['end_date'], str)
        
        start_date = datetime.strptime(result['start_date'], '%Y-%m-%d')
        end_date = datetime.strptime(result['end_date'], '%Y-%m-%d')
        
        self.assertLess(start_date, end_date)
        
        # Check that total duration matches the phases
        last_phase = phases[-1]
        self.assertEqual(result['total_duration'], last_phase['end_week'])
        
        # Check that the end date matches the duration
        expected_end_date = start_date + timedelta(weeks=result['total_duration'])
        self.assertLessEqual((expected_end_date - end_date).days, 7)  # Allow for rounding to weeks
        
        # Check that organization info includes the parameters
        org_info = result['organization_info']
        self.assertEqual(org_info['organization_size'], implementation_parameters['organization_size'])
        self.assertEqual(org_info['industry'], implementation_parameters['industry'])
        self.assertEqual(org_info['existing_quality_system'], implementation_parameters['existing_quality_system'])
        self.assertEqual(org_info['process_complexity'], implementation_parameters['process_complexity'])
        self.assertEqual(org_info['implementation_scope'], implementation_parameters['implementation_scope'])

    def test_create_control_plan(self):
        """Test creating a control plan."""
        control_plan_items = [
            {
                'process_step': 'Material Receipt',
                'characteristic': 'Material Purity',
                'specification': '99.5% min',
                'measurement_method': 'XRF Analysis',
                'sample_size': 1,
                'control_method': 'Certificate of Analysis Review',
                'reaction_plan': 'Reject shipment if below specification'
            },
            {
                'process_step': 'Mixing',
                'characteristic': 'Mix Temperature',
                'specification': '65°C ± 5°C',
                'measurement_method': 'Digital Thermometer',
                'sample_size': 'Every batch',
                'control_method': 'Process Control Chart',
                'reaction_plan': 'Adjust heater if outside control limits'
            },
            {
                'process_step': 'Filling',
                'characteristic': 'Fill Weight',
                'specification': '500g ± 5g',
                'measurement_method': 'Digital Scale',
                'sample_size': 'n=5, every hour',
                'control_method': 'Xbar-R Chart',
                'reaction_plan': 'Stop production if outside control limits, adjust filler'
            }
        ]
        
        metadata = {
            'plan_name': 'Product A Manufacturing Control Plan',
            'plan_owner': 'Quality Department',
            'revision': '1.0',
            'approval_date': '2025-01-15',
            'process_name': 'Product A Manufacturing Process'
        }
        
        result = self.service.create_control_plan(
            control_plan_items=control_plan_items,
            metadata=metadata
        )
        
        # Check that the result contains the expected keys
        self.assertIn('items', result)
        self.assertIn('metadata', result)
        self.assertIn('created', result)
        self.assertIn('id', result)
        
        # Check that the control plan items are included
        items = result['items']
        self.assertEqual(len(items), len(control_plan_items))
        
        for i, item in enumerate(items):
            self.assertEqual(item['process_step'], control_plan_items[i]['process_step'])
            self.assertEqual(item['characteristic'], control_plan_items[i]['characteristic'])
            self.assertEqual(item['specification'], control_plan_items[i]['specification'])
            self.assertEqual(item['measurement_method'], control_plan_items[i]['measurement_method'])
            self.assertEqual(item['sample_size'], control_plan_items[i]['sample_size'])
            self.assertEqual(item['control_method'], control_plan_items[i]['control_method'])
            self.assertEqual(item['reaction_plan'], control_plan_items[i]['reaction_plan'])
        
        # Check that the metadata is included
        result_metadata = result['metadata']
        self.assertEqual(result_metadata['plan_name'], metadata['plan_name'])
        self.assertEqual(result_metadata['plan_owner'], metadata['plan_owner'])
        self.assertEqual(result_metadata['revision'], metadata['revision'])
        self.assertEqual(result_metadata['approval_date'], metadata['approval_date'])
        self.assertEqual(result_metadata['process_name'], metadata['process_name'])
        
        # Check that created date is reasonable
        self.assertIsInstance(result['created'], str)
        created_date = datetime.strptime(result['created'], '%Y-%m-%d')
        self.assertLessEqual((datetime.now() - created_date).days, 1)

    def test_evaluate_control_plan(self):
        """Test evaluating a control plan."""
        control_plan = {
            'items': [
                {
                    'process_step': 'Material Receipt',
                    'characteristic': 'Material Purity',
                    'specification': '99.5% min',
                    'measurement_method': 'XRF Analysis',
                    'sample_size': 1,
                    'control_method': 'Certificate of Analysis Review',
                    'reaction_plan': 'Reject shipment if below specification'
                },
                {
                    'process_step': 'Mixing',
                    'characteristic': 'Mix Temperature',
                    'specification': '65°C ± 5°C',
                    'measurement_method': 'Digital Thermometer',
                    'sample_size': 'Every batch',
                    'control_method': 'Process Control Chart',
                    'reaction_plan': 'Adjust heater if outside control limits'
                }
            ],
            'metadata': {
                'plan_name': 'Product A Manufacturing Control Plan',
                'plan_owner': 'Quality Department',
                'revision': '1.0',
                'approval_date': '2025-01-15'
            }
        }
        
        result = self.service.evaluate_control_plan(control_plan)
        
        # Check that the result contains the expected keys
        self.assertIn('completeness_score', result)
        self.assertIn('quality_score', result)
        self.assertIn('item_evaluations', result)
        self.assertIn('improvement_recommendations', result)
        
        # Check that scores are within expected range
        self.assertGreaterEqual(result['completeness_score'], 0)
        self.assertLessEqual(result['completeness_score'], 100)
        self.assertGreaterEqual(result['quality_score'], 0)
        self.assertLessEqual(result['quality_score'], 100)
        
        # Check that each item has been evaluated
        item_evaluations = result['item_evaluations']
        self.assertEqual(len(item_evaluations), len(control_plan['items']))
        
        for item_eval in item_evaluations:
            self.assertIn('process_step', item_eval)
            self.assertIn('characteristic', item_eval)
            self.assertIn('completeness', item_eval)
            self.assertIn('quality', item_eval)
            self.assertIn('feedback', item_eval)
            
            # Check that scores are within expected range
            self.assertGreaterEqual(item_eval['completeness'], 0)
            self.assertLessEqual(item_eval['completeness'], 100)
            self.assertGreaterEqual(item_eval['quality'], 0)
            self.assertLessEqual(item_eval['quality'], 100)
        
        # Check that there are recommendations
        self.assertGreater(len(result['improvement_recommendations']), 0)

    def test_assess_implementation_maturity(self):
        """Test assessing SPC implementation maturity."""
        assessment_responses = {
            'leadership_commitment': 3,
            'employee_training': 2,
            'data_collection_systems': 4,
            'analytical_capabilities': 3,
            'improvement_processes': 2,
            'technology_utilization': 3,
            'process_documentation': 4,
            'corrective_action_processes': 3,
            'supplier_quality_management': 2,
            'customer_focus': 4
        }
        
        result = self.service.assess_implementation_maturity(assessment_responses)
        
        # Check that the result contains the expected keys
        self.assertIn('overall_score', result)
        self.assertIn('maturity_level', result)
        self.assertIn('dimension_scores', result)
        self.assertIn('strengths', result)
        self.assertIn('improvement_areas', result)
        self.assertIn('recommendations', result)
        self.assertIn('created', result)
        
        # Check that the overall score is calculated correctly
        self.assertGreaterEqual(result['overall_score'], 0)
        self.assertLessEqual(result['overall_score'], 100)
        
        # Manual calculation of average score
        avg_score = sum(assessment_responses.values()) / len(assessment_responses)
        expected_score = (avg_score / 5) * 100  # Scale from 0-5 to 0-100
        self.assertAlmostEqual(result['overall_score'], expected_score, places=1)
        
        # Check that maturity level is assigned
        self.assertIn(result['maturity_level'], [
            'Initial', 'Developing', 'Defined', 
            'Managed', 'Optimizing'
        ])
        
        # Check that dimension scores include all dimensions
        dimension_scores = result['dimension_scores']
        self.assertEqual(set(dimension_scores.keys()), set(assessment_responses.keys()))
        
        # Check that strengths and improvement areas are identified
        self.assertGreater(len(result['strengths']), 0)
        self.assertGreater(len(result['improvement_areas']), 0)
        self.assertGreater(len(result['recommendations']), 0)

    def test_get_case_study(self):
        """Test retrieving a case study."""
        industry = 'manufacturing'
        focus_area = 'process_improvement'
        
        result = self.service.get_case_study(
            industry=industry,
            focus_area=focus_area
        )
        
        # Check that the result contains the expected keys
        self.assertIn('title', result)
        self.assertIn('industry', result)
        self.assertIn('focus_area', result)
        self.assertIn('background', result)
        self.assertIn('challenge', result)
        self.assertIn('approach', result)
        self.assertIn('implementation', result)
        self.assertIn('results', result)
        self.assertIn('lessons_learned', result)
        
        # Check that the industry and focus area match
        self.assertEqual(result['industry'], industry)
        self.assertEqual(result['focus_area'], focus_area)
        
        # Check that results are quantified
        results = result['results']
        self.assertGreater(len(results), 0)
        
        # Test with different industry
        industry2 = 'healthcare'
        result2 = self.service.get_case_study(
            industry=industry2,
            focus_area=focus_area
        )
        
        # Should get a different case study
        self.assertEqual(result2['industry'], industry2)
        self.assertNotEqual(result2['title'], result['title'])

    def test_get_industry_recommendations(self):
        """Test getting industry-specific recommendations."""
        industry = 'manufacturing'
        
        result = self.service.get_industry_recommendations(industry)
        
        # Check that the result contains the expected keys
        self.assertIn('industry', result)
        self.assertIn('key_metrics', result)
        self.assertIn('critical_processes', result)
        self.assertIn('chart_recommendations', result)
        self.assertIn('implementation_tips', result)
        self.assertIn('common_challenges', result)
        self.assertIn('best_practices', result)
        
        # Check that the industry matches
        self.assertEqual(result['industry'], industry)
        
        # Check that recommendations are provided
        self.assertGreater(len(result['key_metrics']), 0)
        self.assertGreater(len(result['critical_processes']), 0)
        self.assertGreater(len(result['chart_recommendations']), 0)
        self.assertGreater(len(result['implementation_tips']), 0)
        self.assertGreater(len(result['common_challenges']), 0)
        self.assertGreater(len(result['best_practices']), 0)
        
        # Test with different industry
        industry2 = 'healthcare'
        result2 = self.service.get_industry_recommendations(industry2)
        
        # Should get different recommendations
        self.assertEqual(result2['industry'], industry2)
        self.assertNotEqual(result2['key_metrics'], result['key_metrics'])


if __name__ == '__main__':
    unittest.main()