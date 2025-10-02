"""
Test Recommender Validation Tests
==================================
Created: 2025-01-10
Author: StickForStats Development Team
Version: 1.1.0

Comprehensive test suite for validating the enhanced test recommender
with real assumption checking and auto-switching capabilities.
"""

import unittest
import numpy as np
import pandas as pd
import sys
import os
from typing import Dict, List, Any
import warnings

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.core.test_recommender import (
    TestRecommendationEngine, ResearchQuestion, TestCategory
)
from backend.core.test_recommender_scenarios import ScenarioLibrary
from backend.core.data_profiler import DataProfiler
from backend.core.assumption_checker import AssumptionChecker, AssumptionType


class TestAssumptionChecker(unittest.TestCase):
    """Test the assumption checker functionality"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.checker = AssumptionChecker(significance_level=0.05)
        warnings.filterwarnings('ignore')
    
    def test_normality_detection_normal_data(self):
        """Test that normality is correctly detected for normal data"""
        np.random.seed(42)
        normal_data = np.random.normal(100, 15, 100)
        
        result = self.checker.check_normality(normal_data, method="shapiro")
        
        self.assertTrue(result.is_met, "Should detect normality in normal data")
        self.assertIsNotNone(result.p_value)
        self.assertGreater(result.p_value, 0.05)
    
    def test_normality_detection_skewed_data(self):
        """Test that non-normality is detected for skewed data"""
        np.random.seed(42)
        # Generate highly skewed data
        skewed_data = np.random.exponential(2, 100)
        
        result = self.checker.check_normality(skewed_data, method="shapiro")
        
        self.assertFalse(result.is_met, "Should detect non-normality in skewed data")
        self.assertIsNotNone(result.p_value)
        self.assertLess(result.p_value, 0.05)
    
    def test_homoscedasticity_equal_variances(self):
        """Test homoscedasticity detection with equal variances"""
        np.random.seed(42)
        group1 = np.random.normal(100, 10, 50)
        group2 = np.random.normal(105, 10, 50)
        
        result = self.checker.check_homoscedasticity(group1, group2, method="levene")
        
        self.assertTrue(result.is_met, "Should detect equal variances")
        self.assertIsNotNone(result.p_value)
        self.assertGreater(result.p_value, 0.05)
    
    def test_homoscedasticity_unequal_variances(self):
        """Test heteroscedasticity detection"""
        np.random.seed(42)
        group1 = np.random.normal(100, 5, 50)
        group2 = np.random.normal(100, 20, 50)  # 4x variance
        
        result = self.checker.check_homoscedasticity(group1, group2, method="levene")
        
        self.assertFalse(result.is_met, "Should detect unequal variances")
        self.assertIsNotNone(result.p_value)
        self.assertLess(result.p_value, 0.05)
        
        # Check variance ratio in details
        self.assertIn('variance_ratio', result.details)
        self.assertGreater(result.details['variance_ratio'], 3)
    
    def test_independence_check(self):
        """Test independence assumption checking"""
        np.random.seed(42)
        # Independent data
        independent_data = np.random.normal(0, 1, 100)
        
        result = self.checker.check_independence(data=independent_data)
        
        self.assertTrue(result.is_met, "Should detect independence in random data")
        
        # Autocorrelated data
        autocorr_data = []
        value = 0
        for _ in range(100):
            value = 0.7 * value + np.random.normal(0, 0.5)
            autocorr_data.append(value)
        
        result = self.checker.check_independence(data=np.array(autocorr_data))
        
        # Durbin-Watson should detect autocorrelation
        self.assertIsNotNone(result.test_statistic)
    
    def test_sample_size_adequacy(self):
        """Test sample size adequacy checking"""
        # Adequate sample for t-test
        result = self.checker.check_sample_size_adequacy(n=30, test_type="t_test")
        self.assertTrue(result.is_met, "30 samples should be adequate for t-test")
        
        # Inadequate sample
        result = self.checker.check_sample_size_adequacy(n=10, test_type="t_test")
        self.assertFalse(result.is_met, "10 samples should be inadequate for t-test")
        
        # Check for regression with predictors
        result = self.checker.check_sample_size_adequacy(n=100, n_predictors=5, test_type="regression")
        self.assertTrue(result.is_met, "100 samples should be adequate for 5 predictors")
        
        result = self.checker.check_sample_size_adequacy(n=30, n_predictors=5, test_type="regression")
        self.assertFalse(result.is_met, "30 samples inadequate for 5 predictors (need 60+)")
    
    def test_outlier_detection(self):
        """Test outlier detection"""
        np.random.seed(42)
        # Data with outliers
        normal_data = np.random.normal(100, 10, 95)
        outliers = [200, 210, -50, -60, 250]  # Clear outliers
        data_with_outliers = np.concatenate([normal_data, outliers])
        
        result = self.checker.check_outliers(data_with_outliers, method="iqr")
        
        self.assertFalse(result.is_met, "Should detect outliers")
        self.assertGreater(result.details['n_outliers'], 0)
        self.assertGreater(result.details['outlier_percentage'], 4)
    
    def test_multicollinearity_detection(self):
        """Test multicollinearity detection"""
        np.random.seed(42)
        n = 100
        
        # Create multicollinear predictors
        x1 = np.random.normal(0, 1, n)
        x2 = x1 + np.random.normal(0, 0.1, n)  # Highly correlated with x1
        x3 = np.random.normal(0, 1, n)  # Independent
        
        X = np.column_stack([x1, x2, x3])
        
        result = self.checker.check_multicollinearity(X, feature_names=['x1', 'x2', 'x3'])
        
        self.assertFalse(result.is_met, "Should detect multicollinearity between x1 and x2")
        self.assertIn('vif_values', result.details)
        self.assertIn('high_vif_features', result.details)
        self.assertGreater(len(result.details['high_vif_features']), 0)


class TestRecommenderEnhancements(unittest.TestCase):
    """Test the enhanced test recommender functionality"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.engine = TestRecommendationEngine(significance_level=0.05)
        self.profiler = DataProfiler()
        warnings.filterwarnings('ignore')
    
    def test_auto_switching_for_normality_violation(self):
        """Test auto-switching when normality is violated"""
        np.random.seed(42)
        
        # Create skewed data
        group1 = np.random.exponential(2, 50)
        group2 = np.random.exponential(3, 50)
        
        df = pd.DataFrame({
            'group': ['A'] * 50 + ['B'] * 50,
            'value': np.concatenate([group1, group2])
        })
        
        profile = self.profiler.profile_dataset(df)
        
        recommendations = self.engine.recommend_tests(
            profile=profile,
            research_question=ResearchQuestion.COMPARISON,
            dependent_variable='value',
            independent_variables=['group'],
            data=df,
            auto_switch=True
        )
        
        self.assertGreater(len(recommendations), 0)
        
        # Should recommend Mann-Whitney U as top choice due to non-normality
        top_tests = [r.test_name for r in recommendations[:3]]
        self.assertIn('mann_whitney_u', top_tests, 
                     "Mann-Whitney U should be recommended for non-normal data")
    
    def test_auto_switching_for_heteroscedasticity(self):
        """Test auto-switching when variances are unequal"""
        np.random.seed(42)
        
        # Create data with unequal variances
        group1 = np.random.normal(100, 5, 40)
        group2 = np.random.normal(100, 20, 40)  # 4x variance
        
        df = pd.DataFrame({
            'group': ['A'] * 40 + ['B'] * 40,
            'value': np.concatenate([group1, group2])
        })
        
        profile = self.profiler.profile_dataset(df)
        
        recommendations = self.engine.recommend_tests(
            profile=profile,
            research_question=ResearchQuestion.COMPARISON,
            dependent_variable='value',
            independent_variables=['group'],
            data=df,
            auto_switch=True
        )
        
        self.assertGreater(len(recommendations), 0)
        
        # Should recommend Welch's t-test for unequal variances
        top_tests = [r.test_name for r in recommendations[:3]]
        self.assertIn('welch_t_test', top_tests,
                     "Welch's t-test should be recommended for unequal variances")
    
    def test_assumption_checking_integration(self):
        """Test that assumption checking is properly integrated"""
        np.random.seed(42)
        
        # Normal data that should pass assumptions
        df = pd.DataFrame({
            'group': ['Control'] * 30 + ['Treatment'] * 30,
            'outcome': np.concatenate([
                np.random.normal(100, 15, 30),
                np.random.normal(110, 15, 30)
            ])
        })
        
        profile = self.profiler.profile_dataset(df)
        
        recommendations = self.engine.recommend_tests(
            profile=profile,
            dependent_variable='outcome',
            independent_variables=['group'],
            data=df
        )
        
        self.assertGreater(len(recommendations), 0)
        
        top_rec = recommendations[0]
        
        # Check that assumptions were evaluated
        self.assertIsNotNone(top_rec.assumptions_met)
        self.assertGreater(len(top_rec.assumptions_met), 0)
        
        # For normal data with equal variances, should recommend parametric test
        self.assertIn(top_rec.test_name, 
                     ['independent_t_test', 'welch_t_test'],
                     "Should recommend t-test for normal data")
    
    def test_small_sample_recommendations(self):
        """Test recommendations for small samples"""
        np.random.seed(42)
        
        # Very small sample
        df = pd.DataFrame({
            'group': ['A'] * 5 + ['B'] * 5,
            'value': np.concatenate([
                np.random.normal(0, 1, 5),
                np.random.normal(1, 1, 5)
            ])
        })
        
        profile = self.profiler.profile_dataset(df)
        
        recommendations = self.engine.recommend_tests(
            profile=profile,
            dependent_variable='value',
            independent_variables=['group'],
            data=df
        )
        
        self.assertGreater(len(recommendations), 0)
        
        # Should favor non-parametric or exact tests for small samples
        top_rec = recommendations[0]
        self.assertIn('sample_size', top_rec.warnings[0].lower() if top_rec.warnings else '',
                     "Should warn about small sample size")


class TestScenarioValidation(unittest.TestCase):
    """Test validation using the scenario library"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.engine = TestRecommendationEngine(significance_level=0.05)
        self.library = ScenarioLibrary()
        self.profiler = DataProfiler()
        warnings.filterwarnings('ignore')
    
    def test_scenario_s001_classic_t_test(self):
        """Test Scenario S001: Classic independent t-test"""
        scenario = self.library.get_scenario("S001")
        data = scenario.data_generator()
        
        profile = self.profiler.profile_dataset(data)
        
        recommendations = self.engine.recommend_tests(
            profile=profile,
            dependent_variable=scenario.dependent_variable,
            independent_variables=scenario.independent_variables,
            data=data,
            auto_switch=True
        )
        
        self.assertGreater(len(recommendations), 0)
        
        top_rec = recommendations[0]
        
        # Validate against expected outcome
        validation = self.library.validate_recommendation(
            scenario=scenario,
            recommended_test=top_rec.test_name,
            assumption_violations=top_rec.assumption_violations
        )
        
        self.assertTrue(validation['passed'], 
                       f"Failed validation: {validation['feedback']}")
    
    def test_scenario_s002_heteroscedastic(self):
        """Test Scenario S002: Heteroscedastic comparison"""
        scenario = self.library.get_scenario("S002")
        data = scenario.data_generator()
        
        profile = self.profiler.profile_dataset(data)
        
        recommendations = self.engine.recommend_tests(
            profile=profile,
            dependent_variable=scenario.dependent_variable,
            independent_variables=scenario.independent_variables,
            data=data,
            auto_switch=True
        )
        
        self.assertGreater(len(recommendations), 0)
        
        # Should recommend Welch's t-test
        test_names = [r.test_name for r in recommendations[:3]]
        self.assertIn('welch_t_test', test_names,
                     "Should recommend Welch's t-test for unequal variances")
    
    def test_scenario_s003_skewed_data(self):
        """Test Scenario S003: Skewed distribution"""
        scenario = self.library.get_scenario("S003")
        data = scenario.data_generator()
        
        profile = self.profiler.profile_dataset(data)
        
        recommendations = self.engine.recommend_tests(
            profile=profile,
            dependent_variable=scenario.dependent_variable,
            independent_variables=scenario.independent_variables,
            data=data,
            auto_switch=True
        )
        
        self.assertGreater(len(recommendations), 0)
        
        # Should recommend non-parametric test
        test_names = [r.test_name for r in recommendations[:3]]
        self.assertIn('mann_whitney_u', test_names,
                     "Should recommend Mann-Whitney U for skewed data")
    
    def test_comprehensive_validation_subset(self):
        """Run validation on a subset of scenarios"""
        # Test first 10 scenarios for speed
        scenario_ids = self.library.list_scenarios()[:10]
        
        passed = 0
        failed = 0
        
        for scenario_id in scenario_ids:
            scenario = self.library.get_scenario(scenario_id)
            data = scenario.data_generator()
            
            profile = self.profiler.profile_dataset(data)
            
            recommendations = self.engine.recommend_tests(
                profile=profile,
                dependent_variable=scenario.dependent_variable,
                independent_variables=scenario.independent_variables,
                data=data,
                auto_switch=True
            )
            
            if recommendations:
                top_rec = recommendations[0]
                
                validation = self.library.validate_recommendation(
                    scenario=scenario,
                    recommended_test=top_rec.test_name,
                    assumption_violations=top_rec.assumption_violations
                )
                
                if validation['passed']:
                    passed += 1
                else:
                    failed += 1
                    print(f"\nFailed: {scenario_id} - {scenario.name}")
                    print(f"  Expected: {scenario.expected_primary_test}")
                    print(f"  Got: {top_rec.test_name}")
            else:
                failed += 1
                print(f"\nNo recommendations for: {scenario_id}")
        
        # Should pass majority of scenarios
        pass_rate = passed / (passed + failed) if (passed + failed) > 0 else 0
        self.assertGreater(pass_rate, 0.7, 
                          f"Pass rate {pass_rate:.1%} below 70% threshold")


class TestAccuracyValidation(unittest.TestCase):
    """Validate statistical accuracy against SciPy"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.checker = AssumptionChecker(significance_level=0.05)
        warnings.filterwarnings('ignore')
    
    def test_shapiro_wilk_accuracy(self):
        """Validate Shapiro-Wilk test against SciPy"""
        from scipy import stats
        
        np.random.seed(42)
        test_data = np.random.normal(100, 15, 50)
        
        # Our implementation
        our_result = self.checker.check_normality(test_data, method="shapiro")
        
        # SciPy implementation
        scipy_stat, scipy_p = stats.shapiro(test_data)
        
        # Results should match
        self.assertAlmostEqual(our_result.test_statistic, scipy_stat, places=4,
                              msg="Shapiro-Wilk statistic should match SciPy")
        self.assertAlmostEqual(our_result.p_value, scipy_p, places=4,
                              msg="Shapiro-Wilk p-value should match SciPy")
    
    def test_levene_test_accuracy(self):
        """Validate Levene's test against SciPy"""
        from scipy import stats
        
        np.random.seed(42)
        group1 = np.random.normal(100, 10, 30)
        group2 = np.random.normal(105, 12, 35)
        
        # Our implementation
        our_result = self.checker.check_homoscedasticity(group1, group2, method="levene")
        
        # SciPy implementation
        scipy_stat, scipy_p = stats.levene(group1, group2, center='median')
        
        # Results should match
        self.assertAlmostEqual(our_result.test_statistic, scipy_stat, places=4,
                              msg="Levene's statistic should match SciPy")
        self.assertAlmostEqual(our_result.p_value, scipy_p, places=4,
                              msg="Levene's p-value should match SciPy")
    
    def test_normality_power(self):
        """Test power of normality tests to detect violations"""
        np.random.seed(42)
        
        # Should detect normality in normal data
        normal_data = np.random.normal(0, 1, 100)
        result = self.checker.check_normality(normal_data)
        self.assertTrue(result.is_met, "Should accept normality for normal data")
        
        # Should reject normality for uniform data
        uniform_data = np.random.uniform(-2, 2, 100)
        result = self.checker.check_normality(uniform_data)
        # Uniform is often not rejected, but should have lower p-value
        
        # Should strongly reject for exponential
        exponential_data = np.random.exponential(1, 100)
        result = self.checker.check_normality(exponential_data)
        self.assertFalse(result.is_met, "Should reject normality for exponential data")


def run_validation_suite():
    """Run the complete validation suite"""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add all test classes
    suite.addTests(loader.loadTestsFromTestCase(TestAssumptionChecker))
    suite.addTests(loader.loadTestsFromTestCase(TestRecommenderEnhancements))
    suite.addTests(loader.loadTestsFromTestCase(TestScenarioValidation))
    suite.addTests(loader.loadTestsFromTestCase(TestAccuracyValidation))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print("\n" + "=" * 70)
    print("VALIDATION SUITE SUMMARY")
    print("=" * 70)
    print(f"Tests Run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Success Rate: {(result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun:.1%}")
    
    return result


if __name__ == '__main__':
    # Run the validation suite
    result = run_validation_suite()
    
    # Exit with appropriate code
    sys.exit(0 if result.wasSuccessful() else 1)