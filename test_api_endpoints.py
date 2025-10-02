#!/usr/bin/env python3
"""
Test the working API endpoints with example data
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/v1/stats"

def test_ttest():
    """Test T-test endpoint"""
    print("\n=== Testing T-Test Endpoint ===")

    data = {
        "test_type": "two_sample",
        "data1": [32.5, 34.2, 31.8, 33.5, 35.1, 32.9, 34.7, 33.2, 31.5, 34.8],
        "data2": [28.9, 30.2, 29.5, 31.1, 28.7, 30.5, 29.8, 30.9, 29.2, 31.3],
        "parameters": {
            "mu": 0,
            "equal_var": False,
            "confidence": 0.95,
            "alternative": "two_sided"
        },
        "options": {
            "check_assumptions": False,
            "validate_results": False,
            "compare_standard": False,
            "calculate_effect_sizes": True
        }
    }

    response = requests.post(f"{BASE_URL}/ttest/", json=data)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print("T-statistic:", result.get('high_precision_result', {}).get('t_statistic', 'N/A')[:30])
        print("P-value:", result.get('high_precision_result', {}).get('p_value', 'N/A')[:30])
    else:
        print(f"Error: {response.text[:200]}")
    return response.status_code == 200

def test_descriptive():
    """Test Descriptive Statistics endpoint"""
    print("\n=== Testing Descriptive Statistics Endpoint ===")

    data = {
        "data": [10.5, 12.3, 11.8, 13.2, 10.9, 12.1, 11.5, 12.8, 11.2, 12.6],
        "options": {
            "calculate_all": True
        }
    }

    response = requests.post(f"{BASE_URL}/descriptive/", json=data)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        stats = result.get('high_precision_results', {})
        print("Mean:", stats.get('mean', 'N/A')[:30])
        print("Std Dev:", stats.get('std', 'N/A')[:30])
    else:
        print(f"Error: {response.text[:200]}")
    return response.status_code == 200

def test_anova():
    """Test ANOVA endpoint"""
    print("\n=== Testing ANOVA Endpoint ===")

    data = {
        "anova_type": "one_way",
        "groups": [
            [72, 75, 68, 70, 73],
            [78, 82, 80, 79, 81],
            [85, 88, 86, 87, 89]
        ],
        "options": {
            "check_assumptions": False,
            "calculate_effect_sizes": True
        }
    }

    response = requests.post(f"{BASE_URL}/anova/", json=data)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        hp_result = result.get('high_precision_result', {})
        print("F-statistic:", hp_result.get('f_statistic', 'N/A')[:30])
        print("P-value:", hp_result.get('p_value', 'N/A')[:30])
    else:
        print(f"Error: {response.text[:200]}")
    return response.status_code == 200

if __name__ == "__main__":
    print("Testing StickForStats API Endpoints")
    print("=" * 40)

    results = {
        "T-Test": test_ttest(),
        "Descriptive": test_descriptive(),
        "ANOVA": test_anova()
    }

    print("\n" + "=" * 40)
    print("Test Results Summary:")
    for test, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"  {test}: {status}")

    all_passed = all(results.values())
    if all_passed:
        print("\n🎉 All tests passed! API integration is working.")
    else:
        print("\n⚠️ Some tests failed. Check the error messages above.")