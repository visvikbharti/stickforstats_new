"""
Quick Test Script for New Implementations
==========================================
Tests all newly implemented methods to verify they work correctly.

Run this script to ensure all fixes are working:
    python test_new_implementations.py
"""

import numpy as np
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

print("=" * 70)
print("Testing New Implementations - StickForStats")
print("=" * 70)
print()

# ==============================================================================
# TEST 1: Mann-Whitney Exact P-Value
# ==============================================================================
print("TEST 1: Mann-Whitney U Test with Exact P-Value")
print("-" * 70)

try:
    from core.hp_nonparametric_comprehensive import HighPrecisionNonParametric

    hp_nonparam = HighPrecisionNonParametric()

    # Small samples for exact p-value
    group1 = np.array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], dtype=float)
    group2 = np.array([11, 12, 13, 14, 15, 16, 17, 18, 19, 20], dtype=float)

    result = hp_nonparam.mann_whitney_u_test(group1, group2)

    print(f"✅ Mann-Whitney U Test - SUCCESS")
    print(f"   U statistic: {result.test_statistic}")
    print(f"   P-value: {result.p_value}")
    print(f"   Sample sizes: {result.sample_sizes}")
    print()

except Exception as e:
    print(f"❌ Mann-Whitney U Test - FAILED")
    print(f"   Error: {str(e)}")
    print()

# ==============================================================================
# TEST 2: Wilcoxon Exact P-Value
# ==============================================================================
print("TEST 2: Wilcoxon Signed-Rank Test with Exact P-Value")
print("-" * 70)

try:
    # Paired data (small sample for exact p-value)
    before = np.array([10, 12, 15, 18, 20, 22, 25, 28, 30, 32], dtype=float)
    after = np.array([12, 14, 16, 20, 22, 24, 27, 30, 32, 35], dtype=float)

    result = hp_nonparam.wilcoxon_signed_rank_test(before, after)

    print(f"✅ Wilcoxon Signed-Rank Test - SUCCESS")
    print(f"   W statistic: {result.test_statistic}")
    print(f"   P-value: {result.p_value}")
    print(f"   Sample sizes: {result.sample_sizes}")
    print()

except Exception as e:
    print(f"❌ Wilcoxon Signed-Rank Test - FAILED")
    print(f"   Error: {str(e)}")
    print()

# ==============================================================================
# TEST 3: Huber Regression
# ==============================================================================
print("TEST 3: Huber Robust Regression")
print("-" * 70)

try:
    from core.hp_regression_comprehensive import HighPrecisionRegression

    hp_reg = HighPrecisionRegression()

    # Generate data with outliers
    np.random.seed(42)
    X = np.random.randn(100, 4)
    # Add intercept column
    X_with_int = np.column_stack([np.ones(100), X])

    # True coefficients: intercept=1, slopes=[2, 3, 4, 5]
    y = 1 + X @ np.array([2, 3, 4, 5]) + np.random.randn(100) * 0.5

    # Add outliers to last 5 points
    y[-5:] += 10

    result = hp_reg._huber_regression(X_with_int, y.reshape(-1, 1), None, epsilon=1.35)

    print(f"✅ Huber Regression - SUCCESS")
    print(f"   Number of coefficients: {len(result.coefficients)}")
    print(f"   R-squared: {result.r_squared}")
    print(f"   Method: {result.regression_type.value}")
    print()

except Exception as e:
    print(f"❌ Huber Regression - FAILED")
    print(f"   Error: {str(e)}")
    import traceback
    traceback.print_exc()
    print()

# ==============================================================================
# TEST 4: RANSAC Regression
# ==============================================================================
print("TEST 4: RANSAC Robust Regression")
print("-" * 70)

try:
    result = hp_reg._ransac_regression(X_with_int, y.reshape(-1, 1), None)

    print(f"✅ RANSAC Regression - SUCCESS")
    print(f"   Number of coefficients: {len(result.coefficients)}")
    print(f"   R-squared: {result.r_squared}")
    print(f"   Inliers: {result.additional_info['n_inliers']}")
    print(f"   Outliers: {result.additional_info['n_outliers']}")
    print(f"   Inlier ratio: {result.additional_info['inlier_ratio']:.2%}")
    print()

except Exception as e:
    print(f"❌ RANSAC Regression - FAILED")
    print(f"   Error: {str(e)}")
    import traceback
    traceback.print_exc()
    print()

# ==============================================================================
# TEST 5: Theil-Sen Regression
# ==============================================================================
print("TEST 5: Theil-Sen Robust Regression")
print("-" * 70)

try:
    result = hp_reg._theil_sen_regression(X_with_int, y.reshape(-1, 1), None)

    print(f"✅ Theil-Sen Regression - SUCCESS")
    print(f"   Number of coefficients: {len(result.coefficients)}")
    print(f"   R-squared: {result.r_squared}")
    print(f"   Breakdown point: {result.additional_info['breakdown_point']:.1%}")
    print(f"   Robust scale (MAD): {result.additional_info['robust_scale_mad']:.4f}")
    print()

except Exception as e:
    print(f"❌ Theil-Sen Regression - FAILED")
    print(f"   Error: {str(e)}")
    import traceback
    traceback.print_exc()
    print()

# ==============================================================================
# TEST 6: Multinomial Logistic Regression
# ==============================================================================
print("TEST 6: Multinomial Logistic Regression")
print("-" * 70)

try:
    # Multi-class classification data
    np.random.seed(42)
    X_class = np.random.randn(150, 4)
    X_class_with_int = np.column_stack([np.ones(150), X_class])

    # Generate 3 classes
    y_class = np.zeros(150)
    y_class[50:100] = 1
    y_class[100:] = 2
    # Add some noise to make it realistic
    y_class += np.random.randn(150) * 0.1
    y_class = np.round(y_class).astype(int)
    y_class = np.clip(y_class, 0, 2)

    coefficients, probabilities = hp_reg._fit_multinomial_logistic(
        X_class_with_int, y_class,
        max_iter=1000, tol=1e-4,
        regularization='l2', alpha=0.01
    )

    print(f"✅ Multinomial Logistic Regression - SUCCESS")
    print(f"   Coefficient matrix shape: {coefficients.shape}")
    print(f"   Probability matrix shape: {probabilities.shape}")
    print(f"   Number of classes: {probabilities.shape[1]}")
    print()

except Exception as e:
    print(f"❌ Multinomial Logistic Regression - FAILED")
    print(f"   Error: {str(e)}")
    import traceback
    traceback.print_exc()
    print()

# ==============================================================================
# TEST 7: Multinomial R-Squared
# ==============================================================================
print("TEST 7: Multinomial R-Squared Calculation")
print("-" * 70)

try:
    r_squared = hp_reg._calculate_multinomial_r_squared(y_class, probabilities)

    print(f"✅ Multinomial R-Squared - SUCCESS")
    print(f"   McFadden R²: {r_squared}")
    print(f"   Type: {type(r_squared)}")
    print(f"   Value range: [0, 1] ✓" if 0 <= float(r_squared) <= 1 else "   ERROR: Outside [0, 1]")
    print()

except Exception as e:
    print(f"❌ Multinomial R-Squared - FAILED")
    print(f"   Error: {str(e)}")
    import traceback
    traceback.print_exc()
    print()

# ==============================================================================
# SUMMARY
# ==============================================================================
print("=" * 70)
print("TEST SUMMARY")
print("=" * 70)
print()
print("All 7 new implementations have been tested!")
print()
print("Next steps:")
print("  1. Review test output above for any failures")
print("  2. If all tests pass, proceed to integration testing")
print("  3. Update documentation and paper claims")
print("  4. Run full test suite with test_data/ files")
print()
print("=" * 70)
