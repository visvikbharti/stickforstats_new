import json
import uuid
import numpy as np
from django.test import TestCase, override_settings
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


@override_settings(SECURE_SSL_REDIRECT=False)
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

        # Create test data — data_type must be a valid choice, field is `data` (JSONField)
        self.data = IntervalData.objects.create(
            project=self.project,
            name='Test Data',
            data_type='NORMAL',
            data=[1.2, 2.3, 3.4, 4.5, 5.6, 6.7, 7.8, 8.9, 9.0, 10.1],
            description='Test numeric data'
        )

        # Binary data for proportion tests — data_type='BINOMIAL', field is `data`
        self.binary_data = IntervalData.objects.create(
            project=self.project,
            name='Binary Data',
            data_type='BINOMIAL',
            data=[1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0],
            description='Test binary data'
        )

    def test_project_list(self):
        """Test retrieving the list of projects for a user."""
        url = reverse('confidence_intervals_api:project-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response is paginated: {count, next, previous, results}
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['name'], 'Test Project')

    def test_create_project(self):
        """Test creating a new project."""
        url = reverse('confidence_intervals_api:project-list')
        data = {
            'name': 'New Project',
            'description': 'A new confidence interval project'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New Project')
        self.assertEqual(ConfidenceIntervalProject.objects.count(), 2)

    def test_calculate_mean_t_interval(self):
        """Test calculating a t-interval for the mean."""
        url = reverse('confidence_intervals_api:calculate-calculate-mean')
        data = {
            'data': [1.2, 2.3, 3.4, 4.5, 5.6, 6.7, 7.8, 8.9, 9.0, 10.1],
            'confidence_level': 0.95,
            'method': 't'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check result contains the expected fields
        self.assertIn('point_estimate', response.data)
        self.assertIn('ci_lower', response.data)
        self.assertIn('ci_upper', response.data)

    def test_calculate_proportion_interval(self):
        """Test calculating a confidence interval for a proportion."""
        url = reverse('confidence_intervals_api:calculate-calculate-proportion')
        data = {
            'successes': 9,
            'trials': 15,
            'confidence_level': 0.90,
            'method': 'wilson'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check result contains the expected fields
        self.assertIn('point_estimate', response.data)
        self.assertIn('ci_lower', response.data)
        self.assertIn('ci_upper', response.data)

    def test_calculate_bootstrap_interval(self):
        """Test calculating a bootstrap confidence interval."""
        url = reverse('confidence_intervals_api:calculate-calculate-bootstrap')
        data = {
            'data': [1.2, 2.3, 3.4, 4.5, 5.6, 6.7, 7.8, 8.9, 9.0, 10.1],
            'confidence_level': 0.95,
            'n_iterations': 500,
            'method': 'percentile'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check result contains the expected fields
        self.assertIn('point_estimate', response.data)
        self.assertIn('ci_lower', response.data)
        self.assertIn('ci_upper', response.data)

    def test_educational_resources(self):
        """Test retrieving educational resources."""
        # Create test resource — content_type and category must match model choices
        from ..models import EducationalResource
        resource = EducationalResource.objects.create(
            title='Understanding Confidence Intervals',
            content_type='EXPLANATION',
            content='This is a test educational resource about confidence intervals.',
            category='FOUNDATIONS',
            order=1
        )

        url = reverse('confidence_intervals_api:resource-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response is paginated: {count, next, previous, results}
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['title'], 'Understanding Confidence Intervals')

    def test_filter_educational_resources_by_section(self):
        """Test filtering educational resources by section (alias for category)."""
        from ..models import EducationalResource

        # Create several resources in different categories
        EducationalResource.objects.create(
            title='Basic CI Concepts',
            content_type='EXPLANATION',
            content='Basic concepts of confidence intervals.',
            category='FOUNDATIONS',
            order=1
        )

        EducationalResource.objects.create(
            title='Advanced CI Methods',
            content_type='EXPLANATION',
            content='Advanced methods for confidence intervals.',
            category='METHODS',
            order=1
        )

        url = reverse('confidence_intervals_api:resource-list') + '?section=FOUNDATIONS'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response is paginated: {count, next, previous, results}
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['title'], 'Basic CI Concepts')


# Add more tests as needed for other endpoints and functionality
