"""
Tests for the SQC Analysis API views.
"""
import json
import uuid
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from stickforstats.core.models import AnalysisSession, AnalysisResult, Dataset
from stickforstats.sqc_analysis.models import (
    ControlChartAnalysis, ProcessCapabilityAnalysis,
    AcceptanceSamplingPlan, MeasurementSystemAnalysis,
    EconomicDesignAnalysis, SPCImplementationPlan
)

User = get_user_model()


class SQCAnalysisAPITestCase(APITestCase):
    """Test case for the SQC Analysis API endpoints."""

    def setUp(self):
        """Set up for the tests."""
        self.client = APIClient()
        
        # Create a test user
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@example.com',
            password='testpassword'
        )
        
        # Authenticate the client
        self.client.force_authenticate(user=self.user)
        
        # Create a test dataset
        self.dataset = Dataset.objects.create(
            user=self.user,
            name='Test Dataset',
            description='Test dataset for SQC analysis',
            file_type='csv',
            file='path/to/test_data.csv',
            columns_info={
                'value': {'type': 'numeric'},
                'group': {'type': 'categorical'},
                'time': {'type': 'datetime'}
            }
        )
        
        # Create a test analysis session
        self.session = AnalysisSession.objects.create(
            user=self.user,
            name='Test Analysis Session',
            module='sqc',
            status='completed',
            configuration={
                'analysis_type': 'control_chart',
                'chart_type': 'xbar_r'
            }
        )
        
        # Create a test analysis result
        self.result = AnalysisResult.objects.create(
            session=self.session,
            name='Test Analysis Result',
            analysis_type='control_chart_xbar_r',
            parameters={},
            result_summary={},
            result_detail={},
            interpretation='Test interpretation'
        )
        
        # Create a test control chart analysis
        self.control_chart = ControlChartAnalysis.objects.create(
            analysis_session=self.session,
            analysis_result=self.result,
            chart_type='xbar_r',
            sample_size=5,
            parameter_column='value',
            grouping_column='group',
            time_column='time',
            upper_control_limit=55.0,
            lower_control_limit=45.0,
            center_line=50.0
        )
        
        # Create test acceptance sampling plan
        self.sampling_plan = AcceptanceSamplingPlan.objects.create(
            analysis_session=self.session,
            analysis_result=self.result,
            plan_type='single',
            lot_size=1000,
            sample_size=80,
            acceptance_number=2,
            rejection_number=3,
            standard_used='ansi_z1.4',
            aql=1.0,
            ltpd=5.0,
            producer_risk=0.05,
            consumer_risk=0.10,
            oc_curve_data={}
        )
        
        # Create test MSA analysis
        self.msa = MeasurementSystemAnalysis.objects.create(
            analysis_session=self.session,
            analysis_result=self.result,
            msa_type='gage_rr',
            parameter_column='value',
            part_column='part',
            operator_column='operator',
            total_variation=1.0,
            repeatability=0.3,
            reproducibility=0.2,
            gage_rr=0.5,
            part_variation=0.8,
            number_of_distinct_categories=5,
            percent_study_variation=25.0,
            percent_tolerance=15.0
        )
        
        # Create test economic design analysis
        self.economic_design = EconomicDesignAnalysis.objects.create(
            analysis_session=self.session,
            analysis_result=self.result,
            chart_type='xbar',
            sample_size=5,
            sampling_interval=1.0,
            k_factor=3.0,
            upper_control_limit=55.0,
            lower_control_limit=45.0,
            center_line=50.0,
            in_control_arl=370.0,
            out_of_control_arl=10.0,
            hourly_cost=50.0,
            cost_savings=15.0
        )
        
        # Create test SPC implementation plan
        self.implementation_plan = SPCImplementationPlan.objects.create(
            analysis_session=self.session,
            analysis_result=self.result,
            plan_type='roadmap',
            industry='manufacturing',
            organization_size='medium',
            implementation_scope='department',
            start_date='2025-01-01',
            target_completion_date='2025-06-30',
            total_duration=26,
            plan_content={}
        )

    def test_control_chart_list(self):
        """Test retrieving the list of control chart analyses."""
        url = reverse('sqc_analysis:control-chart-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], str(self.control_chart.id))
        self.assertEqual(response.data[0]['chart_type'], self.control_chart.chart_type)

    def test_acceptance_sampling_list(self):
        """Test retrieving the list of acceptance sampling plans."""
        url = reverse('sqc_analysis:acceptance-sampling-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], str(self.sampling_plan.id))
        self.assertEqual(response.data[0]['plan_type'], self.sampling_plan.plan_type)

    def test_msa_list(self):
        """Test retrieving the list of MSA analyses."""
        url = reverse('sqc_analysis:msa-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], str(self.msa.id))
        self.assertEqual(response.data[0]['msa_type'], self.msa.msa_type)

    def test_economic_design_list(self):
        """Test retrieving the list of economic design analyses."""
        url = reverse('sqc_analysis:economic-design-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], str(self.economic_design.id))
        self.assertEqual(response.data[0]['chart_type'], self.economic_design.chart_type)

    def test_spc_implementation_list(self):
        """Test retrieving the list of SPC implementation plans."""
        url = reverse('sqc_analysis:spc-implementation-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], str(self.implementation_plan.id))
        self.assertEqual(response.data[0]['plan_type'], self.implementation_plan.plan_type)

    def test_acceptance_sampling_oc_curve(self):
        """Test retrieving the OC curve for a sampling plan."""
        url = reverse('sqc_analysis:acceptance-sampling-oc-curve', args=[self.sampling_plan.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_economic_design_compare_alternatives(self):
        """Test comparing economic design alternatives."""
        url = reverse('sqc_analysis:economic-design-compare-alternatives')
        
        data = {
            'process_parameters': {
                'mean_time_to_failure': 100,
                'shift_size': 2.0,
                'std_dev': 1.0,
                'hourly_production': 100
            },
            'cost_parameters': {
                'sampling_cost': 5.0,
                'fixed_sampling_cost': 10.0,
                'false_alarm_cost': 200.0,
                'hourly_defect_cost': 500.0,
                'finding_cost': 250.0
            },
            'alternatives': [
                {'sample_size': 3, 'sampling_interval': 1.0, 'k_factor': 3.0},
                {'sample_size': 5, 'sampling_interval': 0.5, 'k_factor': 2.5}
            ]
        }
        
        response = self.client.post(url, data=data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('comparison_table', response.data)
        self.assertIn('best_alternative', response.data)
        self.assertEqual(len(response.data['comparison_table']), 2)

    def test_spc_implementation_industry_recommendations(self):
        """Test retrieving industry-specific recommendations for SPC implementation."""
        url = reverse('sqc_analysis:spc-implementation-industry-recommendations')
        response = self.client.get(url, {'industry': 'manufacturing'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('industry', response.data)
        self.assertIn('key_metrics', response.data)
        self.assertIn('critical_processes', response.data)
        self.assertEqual(response.data['industry'], 'manufacturing')

    def test_unauthorized_access(self):
        """Test that unauthenticated requests are denied."""
        # Log out the client
        self.client.force_authenticate(user=None)
        
        url = reverse('sqc_analysis:control-chart-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


if __name__ == '__main__':
    unittest.main()