#!/usr/bin/env python3
"""
Quick Verification Test - Corrected Parameters
===============================================
Tests the 11 most critical failing endpoints with CORRECTED parameters
based on source code analysis.
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_with_correct_params():
    """Test critical endpoints with corrected parameters"""

    print("\n🔧 TESTING WITH CORRECTED PARAMETERS\n")
    print("="*70)

    tests = []

    # 1. T-TEST - CORRECTED
    print("\n1. Testing T-Test with CORRECTED parameters...")
    response = requests.post(
        f"{BASE_URL}/api/v1/stats/ttest/",
        json={
            "test_type": "independent",  # Alias for "two_sample"
            "data1": [1, 2, 3, 4, 5],    # ✅ CORRECTED from "group1"
            "data2": [3, 4, 5, 6, 7],    # ✅ CORRECTED from "group2"
            "alpha": 0.05
        }
    )
    status = "✅ PASS" if response.status_code == 200 else f"❌ FAIL ({response.status_code})"
    print(f"   T-Test: {status}")
    if response.status_code != 200:
        print(f"   Error: {response.text[:200]}")
    tests.append(("T-Test", response.status_code == 200))

    # 2. LINEAR REGRESSION - CORRECTED
    print("\n2. Testing Linear Regression with CORRECTED parameters...")
    response = requests.post(
        f"{BASE_URL}/api/v1/regression/linear/",
        json={
            "type": "simple_linear",              # ✅ ADDED
            "X": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], # ✅ Capital X (was lowercase)
            "y": [2.1, 4.3, 5.8, 7.9, 10.2, 12.1, 14.3, 16.2, 18.1, 20.3],
            "alpha": 0.05
        }
    )
    status = "✅ PASS" if response.status_code == 200 else f"❌ FAIL ({response.status_code})"
    print(f"   Linear Regression: {status}")
    if response.status_code != 200:
        print(f"   Error: {response.text[:200]}")
    tests.append(("Linear Regression", response.status_code == 200))

    # 3. MULTIPLE REGRESSION - CORRECTED
    print("\n3. Testing Multiple Regression with CORRECTED parameters...")
    response = requests.post(
        f"{BASE_URL}/api/v1/regression/multiple/",
        json={
            "type": "multiple_linear",  # ✅ ADDED
            "X": [[1, 10], [2, 20], [3, 30], [4, 40], [5, 50]],  # ✅ 2D array
            "y": [2.1, 4.3, 5.8, 7.9, 10.2],
            "alpha": 0.05
        }
    )
    status = "✅ PASS" if response.status_code == 200 else f"❌ FAIL ({response.status_code})"
    print(f"   Multiple Regression: {status}")
    if response.status_code != 200:
        print(f"   Error: {response.text[:200]}")
    tests.append(("Multiple Regression", response.status_code == 200))

    # 4. CHI-SQUARE INDEPENDENCE - CORRECTED
    print("\n4. Testing Chi-Square Independence with CORRECTED parameters...")
    response = requests.post(
        f"{BASE_URL}/api/v1/categorical/chi-square/independence/",
        json={
            "contingency_table": [[10, 15, 5], [8, 12, 10]],  # ✅ CORRECTED from "observed"
            "alpha": 0.05,
            "yates_correction": False
        }
    )
    status = "✅ PASS" if response.status_code == 200 else f"❌ FAIL ({response.status_code})"
    print(f"   Chi-Square Independence: {status}")
    if response.status_code != 200:
        print(f"   Error: {response.text[:200]}")
    tests.append(("Chi-Square", response.status_code == 200))

    # 5. EFFECT SIZE T-TEST - CORRECTED
    print("\n5. Testing Effect Size T-Test with CORRECTED parameters...")
    response = requests.post(
        f"{BASE_URL}/api/v1/power/effect-size/t-test/",
        json={
            "data1": [1, 2, 3, 4, 5],  # ✅ CORRECTED from "group1"
            "data2": [3, 4, 5, 6, 7]   # ✅ CORRECTED from "group2"
            # Note: Removed "sample_size" to let it calculate from data
        }
    )
    status = "✅ PASS" if response.status_code == 200 else f"❌ FAIL ({response.status_code})"
    print(f"   Effect Size T-Test: {status}")
    if response.status_code != 200:
        print(f"   Error: {response.text[:200]}")
    tests.append(("Effect Size", response.status_code == 200))

    # 6. POWER ANOVA - CORRECTED
    print("\n6. Testing Power ANOVA with CORRECTED parameters...")
    response = requests.post(
        f"{BASE_URL}/api/v1/power/anova/",
        json={
            "effect_size": 0.25,
            "k": 3,                  # ✅ CORRECTED from "n_groups"
            "n_per_group": 20,
            "alpha": 0.05
        }
    )
    status = "✅ PASS" if response.status_code == 200 else f"❌ FAIL ({response.status_code})"
    print(f"   Power ANOVA: {status}")
    if response.status_code != 200:
        print(f"   Error: {response.text[:200]}")
    tests.append(("Power ANOVA", response.status_code == 200))

    # 7. POWER CORRELATION - Test both parameter names
    print("\n7. Testing Power Correlation with CORRECTED parameters...")
    response = requests.post(
        f"{BASE_URL}/api/v1/power/correlation/",
        json={
            "r": 0.3,           # Try "r" first
            "n": 50,
            "alpha": 0.05
        }
    )
    status = "✅ PASS" if response.status_code == 200 else f"❌ FAIL ({response.status_code})"
    print(f"   Power Correlation: {status}")
    if response.status_code != 200:
        print(f"   Error: {response.text[:200]}")
    tests.append(("Power Correlation", response.status_code == 200))

    # 8. OPTIMAL ALLOCATION - CORRECTED
    print("\n8. Testing Optimal Allocation with CORRECTED parameters...")
    response = requests.post(
        f"{BASE_URL}/api/v1/power/allocation/",
        json={
            "total_sample_size": 100,  # ✅ CORRECTED from "total_n"
            "k": 3,                    # ✅ CORRECTED from "n_groups"
            "effect_sizes": [0.5, 0.5, 0.5]
        }
    )
    status = "✅ PASS" if response.status_code == 200 else f"❌ FAIL ({response.status_code})"
    print(f"   Optimal Allocation: {status}")
    if response.status_code != 200:
        print(f"   Error: {response.text[:200]}")
    tests.append(("Optimal Allocation", response.status_code == 200))

    # Summary
    print("\n" + "="*70)
    print("\n📊 QUICK TEST SUMMARY")
    print("="*70)
    passed = sum(1 for _, success in tests if success)
    total = len(tests)
    print(f"\nPassed: {passed}/{total} ({passed/total*100:.1f}%)")

    print("\nDetailed Results:")
    for name, success in tests:
        status = "✅" if success else "❌"
        print(f"  {status} {name}")

    print("\n" + "="*70)

    if passed == total:
        print("\n🎉 ALL CORRECTED TESTS PASSING!")
    elif passed > total/2:
        print("\n✅ MAJORITY PASSING - Good progress!")
    else:
        print("\n⚠️  More fixes needed - continue debugging")

if __name__ == "__main__":
    test_with_correct_params()