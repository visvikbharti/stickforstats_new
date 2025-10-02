from django.test import TestCase
import pandas as pd
import numpy as np
from ..services.design_generator import DesignGeneratorService
from ..services.model_analyzer import ModelAnalyzerService


class DesignGeneratorServiceTests(TestCase):
    """Test cases for the design generator service"""
    
    def setUp(self):
        self.service = DesignGeneratorService()
        
        # Define common test factors
        self.test_factors = [
            {
                'name': 'Temperature',
                'low_level': 60,
                'high_level': 80,
                'is_categorical': False
            },
            {
                'name': 'Pressure',
                'low_level': 100,
                'high_level': 200,
                'is_categorical': False
            },
            {
                'name': 'Catalyst',
                'is_categorical': True,
                'categories': ['A', 'B', 'C']
            }
        ]
    
    def test_factorial_design_generation(self):
        """Test generation of a full factorial design"""
        # Generate a full factorial design with 2 factors
        design = self.service.generate_design(
            design_type='FACTORIAL',
            factors=self.test_factors[:2],
            center_points=0
        )
        
        # Should have 2^2 = 4 runs
        self.assertEqual(len(design), 4)
        
        # Check that all combinations are present
        self.assertTrue(any((row['Temperature'] == 60 and row['Pressure'] == 100) for _, row in design.iterrows()))
        self.assertTrue(any((row['Temperature'] == 60 and row['Pressure'] == 200) for _, row in design.iterrows()))
        self.assertTrue(any((row['Temperature'] == 80 and row['Pressure'] == 100) for _, row in design.iterrows()))
        self.assertTrue(any((row['Temperature'] == 80 and row['Pressure'] == 200) for _, row in design.iterrows()))
    
    def test_fractional_factorial_design(self):
        """Test generation of a fractional factorial design"""
        # Generate a half-fraction factorial design with 3 factors
        design = self.service.generate_design(
            design_type='FRACTIONAL_FACTORIAL',
            factors=self.test_factors[:2] + [{
                'name': 'Time',
                'low_level': 30,
                'high_level': 60,
                'is_categorical': False
            }],
            fraction=1/2,
            center_points=0
        )
        
        # Should have 2^3 * (1/2) = 4 runs
        self.assertEqual(len(design), 4)
    
    def test_central_composite_design(self):
        """Test generation of a central composite design"""
        # Generate a central composite design with 2 factors
        design = self.service.generate_design(
            design_type='CENTRAL_COMPOSITE',
            factors=self.test_factors[:2],
            alpha='rotatable',
            center_points=3
        )
        
        # Should have 2^2 factorial points + 2*2 star points + 3 center points = 11 runs
        self.assertEqual(len(design), 11)
    
    def test_box_behnken_design(self):
        """Test generation of a Box-Behnken design"""
        # Need at least 3 factors for Box-Behnken
        factors = self.test_factors[:2] + [{
            'name': 'Time',
            'low_level': 30,
            'high_level': 60,
            'is_categorical': False
        }]
        
        design = self.service.generate_design(
            design_type='BOX_BEHNKEN',
            factors=factors,
            center_points=3
        )
        
        # For 3 factors, Box-Behnken has 12 runs + 3 center points = 15 runs
        self.assertEqual(len(design), 15)
    
    def test_plackett_burman_design(self):
        """Test generation of a Plackett-Burman design"""
        # Generate a Plackett-Burman design with 3 factors
        design = self.service.generate_design(
            design_type='PLACKETT_BURMAN',
            factors=self.test_factors[:2] + [{
                'name': 'Time',
                'low_level': 30,
                'high_level': 60,
                'is_categorical': False
            }]
        )
        
        # For 3 factors, smallest Plackett-Burman design has 4 runs
        self.assertEqual(len(design), 4)
    
    def test_categorical_factor_handling(self):
        """Test that categorical factors are handled correctly"""
        # Generate a full factorial design with 1 continuous and 1 categorical factor
        design = self.service.generate_design(
            design_type='FACTORIAL',
            factors=[self.test_factors[0], self.test_factors[2]],
            center_points=0
        )
        
        # Should have 2 * 3 = 6 runs (2 levels for continuous, 3 categories)
        self.assertEqual(len(design), 6)
        
        # Check that all combinations are present
        for temp in [60, 80]:
            for cat in ['A', 'B', 'C']:
                self.assertTrue(any((row['Temperature'] == temp and row['Catalyst'] == cat) 
                                   for _, row in design.iterrows()))


class ModelAnalyzerServiceTests(TestCase):
    """Test cases for the model analyzer service"""
    
    def setUp(self):
        self.service = ModelAnalyzerService()
        
        # Create sample factorial design data
        self.factorial_data = pd.DataFrame({
            'Temperature': [60, 60, 80, 80],
            'Pressure': [100, 200, 100, 200],
            'Yield': [75, 85, 80, 95]
        })
        
        # Create sample response surface design data
        x1 = [-1, -1, 1, 1, -1.414, 1.414, 0, 0, 0, 0, 0]
        x2 = [-1, 1, -1, 1, 0, 0, -1.414, 1.414, 0, 0, 0]
        
        self.rsm_data = pd.DataFrame({
            'Temperature': [60, 60, 80, 80, 55.9, 84.1, 70, 70, 70, 70, 70],
            'Pressure': [100, 200, 100, 200, 150, 150, 79.3, 220.7, 150, 150, 150],
            'Yield': [75, 85, 80, 95, 70, 88, 79, 92, 90, 91, 89]
        })
    
    def test_factorial_model_analysis(self):
        """Test analysis of a factorial design"""
        result = self.service.analyze_model(
            design_type='FACTORIAL',
            data=self.factorial_data,
            factor_names=['Temperature', 'Pressure'],
            response_names=['Yield'],
            analysis_type='FACTORIAL'
        )
        
        # Check that the result contains expected keys
        self.assertIn('anova_tables', result)
        self.assertIn('model_coefficients', result)
        self.assertIn('model_equations', result)
        self.assertIn('model_statistics', result)
        
        # Check ANOVA table for Yield
        self.assertIn('Yield', result['anova_tables'])
        anova = result['anova_tables']['Yield']
        self.assertIn('Temperature', anova)
        self.assertIn('Pressure', anova)
        
        # Check model coefficients
        self.assertIn('Yield', result['model_coefficients'])
        coeffs = result['model_coefficients']['Yield']
        self.assertIn('Intercept', coeffs)
        self.assertIn('Temperature', coeffs)
        self.assertIn('Pressure', coeffs)
        
        # Check model equation
        self.assertIn('Yield', result['model_equations'])
        
        # Check model statistics
        self.assertIn('Yield', result['model_statistics'])
        stats = result['model_statistics']['Yield']
        self.assertIn('r_squared', stats)
        self.assertIn('adj_r_squared', stats)
        self.assertIn('rmse', stats)
    
    def test_response_surface_model_analysis(self):
        """Test analysis of a response surface design"""
        result = self.service.analyze_model(
            design_type='CENTRAL_COMPOSITE',
            data=self.rsm_data,
            factor_names=['Temperature', 'Pressure'],
            response_names=['Yield'],
            analysis_type='RESPONSE_SURFACE'
        )
        
        # Check that the result contains expected keys
        self.assertIn('anova_tables', result)
        self.assertIn('model_coefficients', result)
        self.assertIn('model_equations', result)
        self.assertIn('model_statistics', result)
        
        # Check model coefficients for quadratic terms
        self.assertIn('Yield', result['model_coefficients'])
        coeffs = result['model_coefficients']['Yield']
        self.assertIn('Temperature^2', coeffs)
        self.assertIn('Pressure^2', coeffs)
        self.assertIn('Temperature*Pressure', coeffs)
    
    def test_response_optimization(self):
        """Test optimization of responses"""
        # First create a model
        model_results = self.service.analyze_model(
            design_type='CENTRAL_COMPOSITE',
            data=self.rsm_data,
            factor_names=['Temperature', 'Pressure'],
            response_names=['Yield'],
            analysis_type='RESPONSE_SURFACE'
        )
        
        # Define factors for optimization
        factors = [
            {
                'name': 'Temperature',
                'low_level': 60,
                'high_level': 80,
                'is_categorical': False
            },
            {
                'name': 'Pressure',
                'low_level': 100,
                'high_level': 200,
                'is_categorical': False
            }
        ]
        
        # Define response goals
        response_goals = {
            'Yield': {
                'goal': 'MAXIMIZE',
                'lower_bound': 70,
                'upper_bound': 100,
                'weight': 1.0
            }
        }
        
        # Run optimization
        result = self.service.optimize_response(
            model_results=model_results,
            factors=factors,
            response_goals=response_goals,
            optimization_type='DESIRABILITY'
        )
        
        # Check that the result contains expected keys
        self.assertIn('optimal_solutions', result)
        self.assertTrue(len(result['optimal_solutions']) > 0)
        
        # Check the first solution
        solution = result['optimal_solutions'][0]
        self.assertIn('factor_settings', solution)
        self.assertIn('predicted_responses', solution)
        self.assertIn('desirability', solution)
        
        # Factor settings should be within bounds
        self.assertTrue(60 <= solution['factor_settings']['Temperature'] <= 80)
        self.assertTrue(100 <= solution['factor_settings']['Pressure'] <= 200)
        
        # Predicted Yield should be reasonable
        self.assertIn('Yield', solution['predicted_responses'])
        self.assertTrue(70 <= solution['predicted_responses']['Yield'] <= 100)
        
        # Desirability should be between 0 and 1
        self.assertTrue(0 <= solution['desirability'] <= 1)