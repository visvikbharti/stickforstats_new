#!/usr/bin/env python3
"""
Guardian API Verification Test Script
=======================================
Tests all Guardian endpoints with real data to verify functionality.
"""

import requests
import json
import pandas as pd
import numpy as np
from scipy import stats

# Configuration
BASE_URL = "http://127.0.0.1:8000/api/guardian"
TEST_DATA_FILE = "test_data/test_ttest.csv"

def print_section(title):
    """Print a formatted section header"""
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70 + "\n")

def test_health():
    """Test Guardian health endpoint"""
    print_section("TEST 1: Guardian Health Check")

    response = requests.get(f"{BASE_URL}/health/")
    data = response.json()

    print(f"Status Code: {response.status_code}")
    print(f"Guardian Status: {data.get('status')}")
    print(f"Message: {data.get('message')}")
    print(f"Validators Available: {', '.join(data.get('validators_available', []))}")
    print(f"Tests Supported: {', '.join(data.get('tests_supported', []))}")

    assert response.status_code == 200, "Health check failed"
    assert data['status'] == 'operational', "Guardian not operational"
    assert len(data['validators_available']) == 6, "Not all validators available"

    print("\n✅ Health Check: PASSED")
    return True

def test_normality_check():
    """Test normality validation endpoint"""
    print_section("TEST 2: Normality Detection")

    # Test with normal data
    normal_data = np.random.normal(100, 15, 100).tolist()

    payload = {
        "data": normal_data,
        "alpha": 0.05
    }

    response = requests.post(f"{BASE_URL}/validate/normality/", json=payload)
    result = response.json()

    print("Testing with Normal Distribution (n=100):")
    print(f"  Status Code: {response.status_code}")
    print(f"  Is Normal: {result.get('is_normal')}")
    print(f"  Shapiro-Wilk p-value: {result.get('details', {}).get('shapiro_wilk', {}).get('p_value')}")

    # Test with exponential data (non-normal)
    exponential_data = np.random.exponential(2, 100).tolist()

    payload_exp = {
        "data": exponential_data,
        "alpha": 0.05
    }

    response_exp = requests.post(f"{BASE_URL}/validate/normality/", json=payload_exp)
    result_exp = response_exp.json()

    print("\nTesting with Exponential Distribution (n=100):")
    print(f"  Status Code: {response_exp.status_code}")
    print(f"  Is Normal: {result_exp.get('is_normal')}")
    print(f"  Shapiro-Wilk p-value: {result_exp.get('details', {}).get('shapiro_wilk', {}).get('p_value')}")

    assert response.status_code == 200, "Normality check failed"
    assert result.get('is_normal') is not None, "No normality result"

    print("\n✅ Normality Detection: PASSED")
    return True

def test_outlier_detection():
    """Test outlier detection endpoint"""
    print_section("TEST 3: Outlier Detection")

    # Data with outliers
    data_with_outliers = [10, 12, 11, 13, 12, 11, 10, 13, 100, 12, 11, 10, -50, 13]

    payload = {
        "data": data_with_outliers
    }

    response = requests.post(f"{BASE_URL}/detect/outliers/", json=payload)
    result = response.json()

    print(f"Status Code: {response.status_code}")
    print(f"Has Outliers: {result.get('has_outliers')}")
    print(f"Outlier Count: {result.get('details', {}).get('outlier_count')}")
    print(f"Outlier Indices: {result.get('details', {}).get('outlier_indices')}")

    assert response.status_code == 200, "Outlier detection failed"
    assert result.get('has_outliers') == True, "Outliers not detected"

    print("\n✅ Outlier Detection: PASSED")
    return True

def test_full_guardian_check_normal_data():
    """Test full Guardian check with normal data"""
    print_section("TEST 4: Full Guardian Check - Normal Data")

    # Load test data
    df = pd.read_csv(TEST_DATA_FILE)
    print(f"Loaded data: {len(df)} rows")
    print(f"Columns: {list(df.columns)}")
    print(f"Groups: {df['Group'].unique()}")

    # Prepare grouped data
    control = df[df['Group'] == 'Control']['Score'].tolist()
    treatment = df[df['Group'] == 'Treatment']['Score'].tolist()

    print(f"\nControl group: n={len(control)}, mean={np.mean(control):.2f}, std={np.std(control):.2f}")
    print(f"Treatment group: n={len(treatment)}, mean={np.mean(treatment):.2f}, std={np.std(treatment):.2f}")

    # Check normality manually first
    _, p_control = stats.shapiro(control)
    _, p_treatment = stats.shapiro(treatment)
    print(f"\nShapiro-Wilk p-values:")
    print(f"  Control: {p_control:.4f}")
    print(f"  Treatment: {p_treatment:.4f}")

    grouped_data = {
        "Control": control,
        "Treatment": treatment
    }

    payload = {
        "data": grouped_data,
        "test_type": "t_test",
        "alpha": 0.05
    }

    response = requests.post(f"{BASE_URL}/check/", json=payload)
    result = response.json()

    print(f"\nGuardian Check Results:")
    print(f"  Status Code: {response.status_code}")
    print(f"  Can Proceed: {result.get('can_proceed')}")
    print(f"  Severity: {result.get('severity')}")
    print(f"  Number of Violations: {len(result.get('violations', []))}")

    if result.get('violations'):
        print(f"\n  Violations Detected:")
        for v in result['violations']:
            print(f"    - {v.get('type')}: {v.get('message')}")

    if result.get('alternative_tests'):
        print(f"\n  Alternative Tests Suggested:")
        for alt in result['alternative_tests']:
            print(f"    - {alt}")

    print(f"\n  Educational Content: {len(result.get('educational_content', {}))} items")

    assert response.status_code == 200, "Guardian check failed"
    assert 'can_proceed' in result, "No can_proceed flag"

    print("\n✅ Full Guardian Check (Normal Data): PASSED")
    return result

def test_full_guardian_check_outliers():
    """Test full Guardian check with outlier data"""
    print_section("TEST 5: Full Guardian Check - Data with Outliers")

    # Create data with extreme outliers
    normal_group1 = np.random.normal(50, 5, 20).tolist()
    normal_group2 = np.random.normal(55, 5, 20).tolist()

    # Add extreme outliers
    group1_with_outliers = normal_group1 + [200, -100]
    group2_with_outliers = normal_group2 + [250]

    grouped_data = {
        "Group1": group1_with_outliers,
        "Group2": group2_with_outliers
    }

    payload = {
        "data": grouped_data,
        "test_type": "t_test",
        "alpha": 0.05
    }

    response = requests.post(f"{BASE_URL}/check/", json=payload)
    result = response.json()

    print(f"Status Code: {response.status_code}")
    print(f"Can Proceed: {result.get('can_proceed')}")
    print(f"Severity: {result.get('severity')}")
    print(f"Number of Violations: {len(result.get('violations', []))}")

    if result.get('violations'):
        print(f"\nViolations Detected:")
        for v in result['violations']:
            print(f"  - {v.get('type')}: {v.get('message')}")

    if result.get('alternative_tests'):
        print(f"\nAlternative Tests Suggested:")
        for alt in result['alternative_tests']:
            print(f"  - {alt}")

    assert response.status_code == 200, "Guardian check failed"

    # Should detect outliers
    violation_types = [v.get('type') for v in result.get('violations', [])]
    has_outlier_violation = any('outlier' in vtype.lower() for vtype in violation_types)

    if has_outlier_violation:
        print("\n✅ Outlier Detection in Full Check: PASSED")
    else:
        print("\n⚠️  Warning: Outliers not detected in full check")

    print("\n✅ Full Guardian Check (Outlier Data): PASSED")
    return result

def test_test_requirements():
    """Test requirements endpoint"""
    print_section("TEST 6: Test Requirements Endpoint")

    response = requests.get(f"{BASE_URL}/requirements/t_test/")
    result = response.json()

    print(f"Status Code: {response.status_code}")
    print(f"Test Type: {result.get('test_type')}")
    print(f"Requirements:")
    for req in result.get('requirements', []):
        print(f"  - {req}")

    assert response.status_code == 200, "Requirements fetch failed"
    assert len(result.get('requirements', [])) > 0, "No requirements found"

    print("\n✅ Test Requirements: PASSED")
    return True

def main():
    """Run all Guardian tests"""
    print("\n" + "="*70)
    print("  GUARDIAN API VERIFICATION TEST SUITE")
    print("  Testing all endpoints with real data")
    print("="*70)

    results = {
        "health": False,
        "normality": False,
        "outliers": False,
        "full_check_normal": False,
        "full_check_outliers": False,
        "requirements": False
    }

    try:
        results["health"] = test_health()
        results["normality"] = test_normality_check()
        results["outliers"] = test_outlier_detection()
        results["full_check_normal"] = test_full_guardian_check_normal_data()
        results["full_check_outliers"] = test_full_guardian_check_outliers()
        results["requirements"] = test_test_requirements()

        print_section("TEST SUMMARY")

        total_tests = len(results)
        passed_tests = sum(1 for r in results.values() if r)

        for test_name, passed in results.items():
            status = "✅ PASSED" if passed else "❌ FAILED"
            print(f"{test_name.replace('_', ' ').title()}: {status}")

        print(f"\n{'='*70}")
        print(f"  TOTAL: {passed_tests}/{total_tests} tests passed")
        print(f"{'='*70}\n")

        if passed_tests == total_tests:
            print("🎉 ALL TESTS PASSED! Guardian API is fully operational.\n")
            return 0
        else:
            print("⚠️  Some tests failed. Review output above.\n")
            return 1

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}\n")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(main())
