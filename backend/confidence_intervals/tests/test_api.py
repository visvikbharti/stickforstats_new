import json
import uuid
import numpy as np
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from ..models import (
    ConfidenceIntervalProject,
    IntervalData,
    IntervalResult,
    SimulationResult
)

User = get_user_model()


class ConfidenceIntervalAPITests(TestCase):
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpassword'
        )
        
        # Create test client
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # Create a test project
        self.project = ConfidenceIntervalProject.objects.create(
            user=self.user,
            name='Test Project',
            description='A test confidence interval project'
        )
        
        # Create test data
        self.data = IntervalData.objects.create(
            project=self.project,
            name='Test Data',
            data_type='NUMERIC',
            numeric_data=[1.2, 2.3, 3.4, 4.5, 5.6, 6.7, 7.8, 8.9, 9.0, 10.1],
            description='Test numeric data'
        )
        
        # Binary data for proportion tests
        self.binary_data = IntervalData.objects.create(
            project=self.project,
            name='Binary Data',
            data_type='CATEGORICAL',
            numeric_data=[1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0],
            description='Test binary data'
        )
    
    def test_project_list(self):
        """Test retrieving the list of projects for a user."""
        url = reverse('ci-project-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Test Project')
    
    def test_create_project(self):
        """Test creating a new project."""
        url = reverse('ci-project-list')
        data = {
            'name': 'New Project',
            'description': 'A new confidence interval project'
        }
        
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New Project')
        self.assertEqual(ConfidenceIntervalProject.objects.count(), 2)
    
    def test_calculate_mean_t_interval(self):
        """Test calculating a t-interval for the mean."""
        url = reverse('ci-calculate-calculate')
        data = {
            'interval_type': 'MEAN_T',
            'project_id': str(self.project.id),
            'data_id': str(self.data.id),
            'confidence_level': 0.95
        }
        
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['interval_type'], 'MEAN_T')
        self.assertTrue('result' in response.data)
        
        # Check result contains the expected fields
        result = response.data['result']
        self.assertTrue('mean' in result)
        self.assertTrue('lower' in result)
        self.assertTrue('upper' in result)
    
    def test_calculate_proportion_interval(self):
        """Test calculating a confidence interval for a proportion."""
        url = reverse('ci-calculate-calculate')
        data = {
            'interval_type': 'PROPORTION_WILSON',
            'project_id': str(self.project.id),
            'data_id': str(self.binary_data.id),
            'confidence_level': 0.90
        }
        
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['interval_type'], 'PROPORTION_WILSON')
        
        # Check result contains the expected fields
        result = response.data['result']
        self.assertTrue('proportion' in result)
        self.assertTrue('lower' in result)
        self.assertTrue('upper' in result)
    
    def test_calculate_bootstrap_interval(self):
        """Test calculating a bootstrap confidence interval."""
        url = reverse('ci-calculate-calculate')
        data = {
            'interval_type': 'BOOTSTRAP_SINGLE',
            'project_id': str(self.project.id),
            'data_id': str(self.data.id),
            'confidence_level': 0.95,
            'n_resamples': 500,
            'bootstrap_method': 'percentile'
        }
        
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['interval_type'], 'BOOTSTRAP_SINGLE')
        
        # Check result contains the expected fields
        result = response.data['result']
        self.assertTrue('statistic' in result)
        self.assertTrue('lower' in result)
        self.assertTrue('upper' in result)
        self.assertTrue('bootstrap_replicates' in result)
    
    def test_educational_resources(self):
        """Test retrieving educational resources."""
        # Create test resource
        from ..models import EducationalResource
        resource = EducationalResource.objects.create(
            title='Understanding Confidence Intervals',
            content_type='TEXT',
            content='This is a test educational resource about confidence intervals.',
            section='FUNDAMENTALS',
            order=1
        )
        
        url = reverse('ci-educational-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Understanding Confidence Intervals')
    
    def test_filter_educational_resources_by_section(self):
        """Test filtering educational resources by section."""
        from ..models import EducationalResource
        
        # Create several resources in different sections
        EducationalResource.objects.create(
            title='Basic CI Concepts',
            content_type='TEXT',
            content='Basic concepts of confidence intervals.',
            section='FUNDAMENTALS',
            order=1
        )
        
        EducationalResource.objects.create(
            title='Advanced CI Methods',
            content_type='TEXT',
            content='Advanced methods for confidence intervals.',
            section='ADVANCED',
            order=1
        )
        
        url = reverse('ci-educational-list') + '?section=FUNDAMENTALS'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Basic CI Concepts')


# Add more tests as needed for other endpoints and functionality