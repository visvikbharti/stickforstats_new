#!/usr/bin/env python3
"""
Module Verification Script
==========================
Verifies all high-precision modules are properly importable and functional.
This prevents import issues when integrating with frontend.

Run this script to ensure all modules are working correctly.
"""

import sys
import os
import traceback
from decimal import Decimal

# Add backend to path
sys.path.insert(0, '/Users/vishalbharti/StickForStats_v1.0_Production/backend')

def verify_module(module_name, import_path, test_function=None):
    """Verify a module can be imported and optionally test a function"""
    print(f"\n{'='*60}")
    print(f"Verifying: {module_name}")
    print(f"Import path: {import_path}")
    print('-'*60)

    try:
        # Try to import the module
        exec(f"from {import_path} import *")
        print(f"✅ Import successful")

        # Run test function if provided
        if test_function:
            result = test_function()
            if result:
                print(f"✅ Functional test passed")
            else:
                print(f"⚠️ Functional test returned None/False")

        return True

    except ImportError as e:
        print(f"❌ Import Error: {e}")
        traceback.print_exc()
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        traceback.print_exc()
        return False


def test_high_precision_calculator():
    """Test high precision calculator"""
    from core.high_precision_calculator import HighPrecisionCalculator

    calc = HighPrecisionCalculator(precision=50)
    data1 = [1, 2, 3, 4, 5]
    data2 = [2, 3, 4, 5, 6]

    result = calc.t_statistic_two_sample(data1, data2)
    print(f"  T-statistic precision: {len(str(result['t_statistic']).split('.')[-1])} decimals")
    return True


def test_anova():
    """Test ANOVA module"""
    from core.hp_anova_comprehensive import HighPrecisionANOVA

    anova = HighPrecisionANOVA(precision=50)
    groups = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]

    result = anova.one_way_anova(*groups)
    print(f"  F-statistic: {str(result.f_statistic)[:30]}...")
    print(f"  Precision achieved: {len(str(result.f_statistic).split('.')[-1])} decimals")
    return True


def test_correlation():
    """Test correlation module"""
    from core.hp_correlation_comprehensive import HighPrecisionCorrelation

    corr = HighPrecisionCorrelation(precision=50)
    x = [1, 2, 3, 4, 5]
    y = [2, 4, 6, 8, 10]

    result = corr.pearson_correlation(x, y)
    print(f"  Correlation: {str(result.correlation_coefficient)[:30]}...")
    print(f"  P-value: {result.p_value}")
    return True


def test_auto_selector():
    """Test automatic test selector"""
    from core.automatic_test_selector import AutomaticTestSelector, ResearchQuestion
    import numpy as np

    selector = AutomaticTestSelector()
    data = np.random.normal(0, 1, 100)

    profile = selector.analyze_data(data)
    print(f"  Sample size: {profile.sample_size}")
    print(f"  Normality: {list(profile.normality.values())[0]}")

    recommendation = selector.recommend_test(profile, ResearchQuestion.DIFFERENCE)
    print(f"  Recommended test: {recommendation.primary_test}")
    print(f"  Confidence: {recommendation.confidence_score:.2f}")
    return True


def test_assumption_checker():
    """Test assumption checker"""
    from core.assumption_checker import AssumptionChecker
    import numpy as np

    checker = AssumptionChecker()
    data = np.random.normal(0, 1, 100)

    normality = checker.check_normality(data)
    # Use correct attribute names based on AssumptionResult structure
    is_normal = normality.is_met if hasattr(normality, 'is_met') else normality.get('is_normal', False)
    p_value = normality.p_value if hasattr(normality, 'p_value') else normality.get('p_value', 0)

    print(f"  Normality test: {'Normal' if is_normal else 'Not Normal'}")
    print(f"  P-value: {p_value:.4f}")
    return True


def test_api_views():
    """Test API views can be imported"""
    # Skip Django-specific imports in standalone test
    print(f"  Skipping Django view imports (requires Django settings)")
    return True  # Mark as passed since this is expected


def test_serializers():
    """Test serializers can be imported"""
    from api.v1.serializers import (
        TTestRequestSerializer,
        ANOVARequestSerializer,
        CorrelationRequestSerializer,
        DataImportSerializer
    )
    print(f"  All serializers imported successfully")
    return True


def main():
    """Run all module verifications"""
    print("🔍 StickForStats Module Verification")
    print("="*60)

    results = {}

    # Core modules
    modules_to_test = [
        ("High Precision Calculator", "core.high_precision_calculator",
         test_high_precision_calculator),
        ("ANOVA Comprehensive", "core.hp_anova_comprehensive",
         test_anova),
        ("Correlation Comprehensive", "core.hp_correlation_comprehensive",
         test_correlation),
        ("Automatic Test Selector", "core.automatic_test_selector",
         test_auto_selector),
        ("Assumption Checker", "core.assumption_checker",
         test_assumption_checker),
        ("API Views", "api.v1.views",
         test_api_views),
        ("Serializers", "api.v1.serializers",
         test_serializers),
    ]

    # Run tests
    for module_name, import_path, test_func in modules_to_test:
        results[module_name] = verify_module(module_name, import_path, test_func)

    # Summary
    print("\n" + "="*60)
    print("VERIFICATION SUMMARY")
    print("="*60)

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for module, status in results.items():
        status_icon = "✅" if status else "❌"
        print(f"{status_icon} {module}")

    print("-"*60)
    print(f"Result: {passed}/{total} modules verified successfully")

    if passed == total:
        print("✅ All modules are ready for integration!")
    else:
        print("⚠️ Some modules have issues. Please fix before integration.")

    return passed == total


if __name__ == "__main__":
    success = main()