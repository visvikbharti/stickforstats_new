from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
import json
import pandas as pd
import io

from ..models import (
    ExperimentDesign, 
    FactorDefinition, 
    ResponseDefinition, 
    ModelAnalysis, 
    ExperimentRun
)

User = get_user_model()


class ExperimentDesignViewSetTests(TestCase):
    """Test cases for the ExperimentDesign API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create a test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpassword'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create a test experiment design
        self.experiment = ExperimentDesign.objects.create(
            name='Test Experiment',
            description='A test experiment design',
            design_type='FACTORIAL',
            user=self.user
        )
        
        # Create test factors
        self.factor1 = FactorDefinition.objects.create(
            experiment_design=self.experiment,
            name='Temperature',
            unit='°C',
            data_type='CONTINUOUS',
            low_level=60,
            high_level=80,
            is_categorical=False
        )
        
        self.factor2 = FactorDefinition.objects.create(
            experiment_design=self.experiment,
            name='Pressure',
            unit='kPa',
            data_type='CONTINUOUS',
            low_level=100,
            high_level=200,
            is_categorical=False
        )
        
        # Create test responses
        self.response1 = ResponseDefinition.objects.create(
            experiment_design=self.experiment,
            name='Yield',
            unit='%',
            description='Product yield',
            target_value=90,
            lower_bound=75,
            upper_bound=100,
            weight=1.0
        )
    
    def test_create_experiment_design(self):
        """Test creating a new experiment design"""
        url = reverse('experimentdesign-list')
        data = {
            'name': 'New Experiment',
            'description': 'A new experiment design',
            'design_type': 'FACTORIAL'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ExperimentDesign.objects.count(), 2)
        self.assertEqual(response.data['name'], 'New Experiment')
    
    def test_retrieve_experiment_design(self):
        """Test retrieving an experiment design"""
        url = reverse('experimentdesign-detail', args=[self.experiment.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Test Experiment')
        self.assertEqual(len(response.data['factors']), 2)
        self.assertEqual(len(response.data['responses']), 1)
    
    def test_generate_design(self):
        """Test generating a new design"""
        url = reverse('experimentdesign-generate-design')
        data = {
            'name': 'Generated Design',
            'description': 'A generated design',
            'design_type': 'FACTORIAL',
            'factors': [
                {
                    'name': 'Temperature',
                    'unit': '°C',
                    'data_type': 'CONTINUOUS',
                    'low_level': 60,
                    'high_level': 80,
                    'is_categorical': False
                },
                {
                    'name': 'Pressure',
                    'unit': 'kPa',
                    'data_type': 'CONTINUOUS',
                    'low_level': 100,
                    'high_level': 200,
                    'is_categorical': False
                }
            ],
            'responses': [
                {
                    'name': 'Yield',
                    'unit': '%',
                    'description': 'Product yield',
                    'target_value': 90,
                    'lower_bound': 75,
                    'upper_bound': 100,
                    'weight': 1.0
                }
            ],
            'design_params': {
                'center_points': 0
            }
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that a new experiment design was created
        self.assertEqual(ExperimentDesign.objects.count(), 2)
        
        # Check that runs were created with the design
        new_experiment = ExperimentDesign.objects.get(name='Generated Design')
        runs = ExperimentRun.objects.filter(experiment_design=new_experiment)
        
        # For a 2-factor factorial design, there should be 4 runs
        self.assertEqual(runs.count(), 4)
    
    def test_upload_design_data(self):
        """Test uploading data for an existing design"""
        # Create some experiment runs
        for i, (temp, pressure) in enumerate([(60, 100), (60, 200), (80, 100), (80, 200)]):
            ExperimentRun.objects.create(
                experiment_design=self.experiment,
                run_order=i + 1,
                factor_values={
                    'Temperature': temp,
                    'Pressure': pressure
                },
                response_values={
                    'Yield': None
                }
            )
        
        # Create a CSV file with response data
        csv_data = """run_order,Temperature,Pressure,Yield
1,60,100,75
2,60,200,85
3,80,100,80
4,80,200,95
"""
        csv_file = io.StringIO(csv_data)
        
        url = reverse('experimentdesign-upload-design-data', args=[self.experiment.id])
        response = self.client.post(url, {'file': csv_file}, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that the response values were updated
        runs = ExperimentRun.objects.filter(experiment_design=self.experiment)
        self.assertEqual(runs.count(), 4)
        
        yields = [run.response_values['Yield'] for run in runs]
        self.assertEqual(set(yields), {75.0, 85.0, 80.0, 95.0})


class ModelAnalysisViewSetTests(TestCase):
    """Test cases for the ModelAnalysis API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create a test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpassword'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create a test experiment design
        self.experiment = ExperimentDesign.objects.create(
            name='Test Experiment',
            description='A test experiment design',
            design_type='FACTORIAL',
            user=self.user
        )
        
        # Create test factors
        self.factor1 = FactorDefinition.objects.create(
            experiment_design=self.experiment,
            name='Temperature',
            unit='°C',
            data_type='CONTINUOUS',
            low_level=60,
            high_level=80,
            is_categorical=False
        )
        
        self.factor2 = FactorDefinition.objects.create(
            experiment_design=self.experiment,
            name='Pressure',
            unit='kPa',
            data_type='CONTINUOUS',
            low_level=100,
            high_level=200,
            is_categorical=False
        )
        
        # Create test responses
        self.response1 = ResponseDefinition.objects.create(
            experiment_design=self.experiment,
            name='Yield',
            unit='%',
            description='Product yield'
        )
        
        # Create experiment runs with data
        for i, (temp, pressure, yield_val) in enumerate([
            (60, 100, 75),
            (60, 200, 85),
            (80, 100, 80),
            (80, 200, 95)
        ]):
            ExperimentRun.objects.create(
                experiment_design=self.experiment,
                run_order=i + 1,
                factor_values={
                    'Temperature': temp,
                    'Pressure': pressure
                },
                response_values={
                    'Yield': yield_val
                }
            )
    
    def test_create_model_analysis(self):
        """Test creating a new model analysis"""
        url = reverse('modelanalysis-list')
        data = {
            'name': 'Test Analysis',
            'description': 'A test model analysis',
            'experiment_design': self.experiment.id,
            'analysis_type': 'FACTORIAL',
            'responses': ['Yield']
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ModelAnalysis.objects.count(), 1)
        self.assertEqual(response.data['name'], 'Test Analysis')
    
    def test_run_analysis(self):
        """Test running a model analysis"""
        url = reverse('modelanalysis-run-analysis')
        data = {
            'name': 'Run Analysis',
            'description': 'A model analysis run',
            'experiment_design_id': self.experiment.id,
            'analysis_type': 'FACTORIAL',
            'responses': ['Yield']
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that a new model analysis was created
        self.assertEqual(ModelAnalysis.objects.count(), 1)
        
        # Check that the analysis has results
        analysis = ModelAnalysis.objects.first()
        self.assertEqual(analysis.status, 'COMPLETED')
        self.assertIn('anova_tables', analysis.results)
        self.assertIn('model_coefficients', analysis.results)
        self.assertIn('model_equations', analysis.results)
        
        # Check the ANOVA results
        anova = analysis.results['anova_tables']['Yield']
        self.assertIn('Temperature', anova)
        self.assertIn('Pressure', anova)
        
        # Check model equation
        equation = analysis.results['model_equations']['Yield']
        self.assertIn('Temperature', equation)
        self.assertIn('Pressure', equation)