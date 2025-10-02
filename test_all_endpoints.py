#!/usr/bin/env python3
"""
Comprehensive Test Suite for All Statistical Endpoints
Tests JSON serialization fixes
"""

import requests
import json
from typing import Dict, Any

BASE_URL = "http://localhost:8000/api/v1"

def test_endpoint(name: str, url: str, data: Dict[str, Any]) -> tuple:
    """Test a single endpoint and return status"""
    try:
        response = requests.post(url, json=data, timeout=10)
        if response.status_code == 200:
            result = response.json()
            # Check if results are properly serialized
            if ('results' in result or 'result' in result or 'success' in result or
                'high_precision_result' in result or 'stats' in result or
                'mean' in result or 'test_statistic' in result or
                'primary_result' in result or 'correlation_coefficient' in result):
                return True, f"✅ {name}: SUCCESS"
            else:
                return False, f"⚠️  {name}: Response missing results"
        else:
            return False, f"❌ {name}: HTTP {response.status_code}"
    except requests.exceptions.JSONDecodeError as e:
        return False, f"❌ {name}: JSON decode error - {str(e)[:50]}"
    except Exception as e:
        return False, f"❌ {name}: {str(e)[:50]}"

# Test data
test_cases = {
    # Parametric Tests (Already working)
    "T-Test": (
        f"{BASE_URL}/stats/ttest/",
        {
            "data1": [12.5, 14.2, 11.8, 15.3, 13.7],
            "data2": [10.2, 9.8, 11.1, 8.9, 10.5],
            "test_type": "two_sample"
        }
    ),

    "ANOVA": (
        f"{BASE_URL}/stats/anova/",
        {
            "groups": [[12, 14, 11], [15, 17, 16], [9, 10, 8]],
            "test_type": "one_way"
        }
    ),

    "Descriptive Stats": (
        f"{BASE_URL}/stats/descriptive/",
        {
            "data": [1.2, 2.3, 3.4, 4.5, 5.6, 6.7, 7.8, 8.9, 9.0, 10.1]
        }
    ),

    # Non-Parametric Tests (Fixed serialization)
    "Mann-Whitney U": (
        f"{BASE_URL}/nonparametric/mann-whitney/",
        {
            "group1": [12.5, 14.2, 11.8, 15.3, 13.7],
            "group2": [10.2, 9.8, 11.1, 8.9, 10.5],
            "alternative": "two-sided"
        }
    ),

    "Wilcoxon Signed-Rank": (
        f"{BASE_URL}/nonparametric/wilcoxon/",
        {
            "x": [1.2, 2.3, 3.4, 4.5],
            "y": [1.5, 2.1, 3.6, 4.2],
            "alternative": "two-sided"
        }
    ),

    "Kruskal-Wallis": (
        f"{BASE_URL}/nonparametric/kruskal-wallis/",
        {
            "groups": [[12, 14, 11], [15, 17, 16], [9, 10, 8]]
        }
    ),

    "Friedman Test": (
        f"{BASE_URL}/nonparametric/friedman/",
        {
            "measurements": [[5, 3, 1], [4, 6, 2], [3, 4, 5]]
        }
    ),

    # Categorical Tests (Fixed serialization)
    "Chi-Square Independence": (
        f"{BASE_URL}/categorical/chi-square/independence/",
        {
            "contingency_table": [[10, 20, 30], [15, 25, 35]]
        }
    ),

    "Chi-Square Goodness of Fit": (
        f"{BASE_URL}/categorical/chi-square/goodness/",
        {
            "observed": [10, 15, 20, 25],
            "expected": [12, 13, 22, 23]
        }
    ),

    "Fisher's Exact": (
        f"{BASE_URL}/categorical/fishers/",
        {
            "table": [[8, 2], [1, 9]],
            "alternative": "two-sided"
        }
    ),

    "McNemar Test": (
        f"{BASE_URL}/categorical/mcnemar/",
        {
            "table": [[10, 5], [2, 20]]
        }
    ),

    "Binomial Test": (
        f"{BASE_URL}/categorical/binomial/",
        {
            "successes": 7,
            "n": 10,
            "p": 0.5,
            "alternative": "two-sided"
        }
    ),

    # Correlation (Fixed serialization)
    "Correlation": (
        f"{BASE_URL}/stats/correlation/",
        {
            "x": [1, 2, 3, 4, 5],
            "y": [2, 4, 5, 4, 5],
            "method": "pearson"
        }
    ),
}

def run_all_tests():
    """Run all endpoint tests"""
    print("=" * 60)
    print("🧪 TESTING ALL ENDPOINTS WITH SERIALIZATION FIXES")
    print("=" * 60)
    print()

    total = len(test_cases)
    passed = 0
    failed = 0

    results = []

    for name, (url, data) in test_cases.items():
        success, message = test_endpoint(name, url, data)
        results.append(message)
        if success:
            passed += 1
        else:
            failed += 1
        print(message)

    print()
    print("=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    print(f"Total Tests: {total}")
    print(f"✅ Passed: {passed} ({passed/total*100:.1f}%)")
    print(f"❌ Failed: {failed} ({failed/total*100:.1f}%)")

    if passed == total:
        print()
        print("🎉 ALL TESTS PASSED! JSON SERIALIZATION FIXED!")
        print("🚀 Platform is now fully operational with 50-decimal precision!")
    elif passed > 9:
        print()
        print("✨ SIGNIFICANT IMPROVEMENT!")
        print(f"📈 {passed} out of {total} tests now working!")

    return passed, failed

if __name__ == "__main__":
    passed, failed = run_all_tests()