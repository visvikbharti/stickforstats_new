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

        # Design generator returns coded values (-1, 1) in factor columns
        # and actual values in _actual columns
        self.assertIn('Temperature_actual', design.columns)
        self.assertIn('Pressure_actual', design.columns)

        # Check that all combinations of actual values are present
        self.assertTrue(any((row['Temperature_actual'] == 60 and row['Pressure_actual'] == 100) for _, row in design.iterrows()))
        self.assertTrue(any((row['Temperature_actual'] == 60 and row['Pressure_actual'] == 200) for _, row in design.iterrows()))
        self.assertTrue(any((row['Temperature_actual'] == 80 and row['Pressure_actual'] == 100) for _, row in design.iterrows()))
        self.assertTrue(any((row['Temperature_actual'] == 80 and row['Pressure_actual'] == 200) for _, row in design.iterrows()))
    
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
        # PB designs start at n=8 (no n=4 support), so use 7 factors to trigger n=8
        pb_factors = [
            {'name': f'Factor{i+1}', 'low_level': i * 10, 'high_level': i * 10 + 10, 'is_categorical': False}
            for i in range(7)
        ]
        design = self.service.generate_design(
            design_type='PLACKETT_BURMAN',
            factors=pb_factors
        )

        # For 7 factors, PB design has n=8 runs
        self.assertEqual(len(design), 8)
        # Should have all 7 factor columns plus run_order
        for f in pb_factors:
            self.assertIn(f['name'], design.columns)
    
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

        # Continuous factor actual values are in Temperature_actual column;
        # categorical factor values are directly in the Catalyst column
        self.assertIn('Temperature_actual', design.columns)
        for temp in [60, 80]:
            for cat in ['A', 'B', 'C']:
                self.assertTrue(any((row['Temperature_actual'] == temp and row['Catalyst'] == cat)
                                   for _, row in design.iterrows()))


class ModelAnalyzerServiceTests(TestCase):
    """Test cases for the model analyzer service"""
    
    def setUp(self):
        self.service = ModelAnalyzerService()
        
        # Create sample factorial design data with replicates
        # (need >4 points so residual df > 0 for a 4-parameter model)
        self.factorial_data = pd.DataFrame({
            'Temperature': [60, 60, 80, 80, 60, 60, 80, 80],
            'Pressure': [100, 200, 100, 200, 100, 200, 100, 200],
            'Yield': [75, 85, 80, 95, 74, 86, 81, 94]
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
        # anova_lm().to_dict() returns {col: {term: value}}, e.g. {'sum_sq': {'Temperature': ...}}
        self.assertIn('Yield', result['anova_tables'])
        anova = result['anova_tables']['Yield']
        self.assertIn('sum_sq', anova)
        self.assertIn('Temperature', anova['sum_sq'])
        self.assertIn('Pressure', anova['sum_sq'])
        
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
        
        # Check model coefficients for quadratic and interaction terms
        self.assertIn('Yield', result['model_coefficients'])
        coeffs = result['model_coefficients']['Yield']
        self.assertIn('Temperature^2', coeffs)
        self.assertIn('Pressure^2', coeffs)
        # statsmodels uses ':' for interaction terms
        self.assertIn('Temperature:Pressure', coeffs)
    
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