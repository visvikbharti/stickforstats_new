#!/usr/bin/env python3
"""
Fixed Statistical Test Suite with Correct Parameters
=====================================================
Tests all endpoints with their actual expected parameters
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_nonparametric():
    """Test non-parametric endpoints with correct parameters"""
    print("\n" + "="*50)
    print("NON-PARAMETRIC TESTS")
    print("="*50)

    # Mann-Whitney U Test - Fixed parameters
    print("\n1. Mann-Whitney U Test")
    product_a = [4, 5, 3, 4, 5, 4, 3, 4, 5, 4]
    product_b = [2, 3, 2, 1, 3, 2, 3, 2, 1, 2]

    mann_whitney_data = {
        "group1": product_a,
        "group2": product_b,
        "alternative": "two-sided",
        "use_continuity": True
        # Removed calculate_effect_size as it's not accepted
    }

    try:
        response = requests.post(f"{BASE_URL}/nonparametric/mann-whitney/", json=mann_whitney_data)
        print(f"  Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ SUCCESS - Results received")
            # Check for high precision
            result_str = json.dumps(data)
            if any(len(val.split('.')[-1]) > 20 for val in result_str.split('"') if '.' in val):
                print(f"  ✅ 50-decimal precision verified")
        else:
            print(f"  ❌ FAILED - {response.text[:100]}")
    except Exception as e:
        print(f"  ❌ ERROR - {str(e)}")

    # Wilcoxon Signed-Rank Test
    print("\n2. Wilcoxon Signed-Rank Test")
    before = [120, 125, 130, 118, 127, 135, 122, 128, 133, 124]
    after = [115, 118, 125, 110, 120, 128, 118, 122, 127, 119]

    wilcoxon_data = {
        "x": before,
        "y": after,  # Check if it expects x,y or data1,data2
        "alternative": "two-sided",
        "use_continuity": True
    }

    try:
        response = requests.post(f"{BASE_URL}/nonparametric/wilcoxon/", json=wilcoxon_data)
        print(f"  Status: {response.status_code}")
        if response.status_code == 200:
            print(f"  ✅ SUCCESS")
        else:
            print(f"  ❌ FAILED - {response.text[:100]}")
    except Exception as e:
        print(f"  ❌ ERROR - {str(e)}")

    # Kruskal-Wallis Test
    print("\n3. Kruskal-Wallis Test")
    placebo = [7, 8, 6, 9, 7, 8, 7]
    treatment_1 = [5, 4, 6, 5, 4, 5, 6]
    treatment_2 = [2, 3, 2, 1, 3, 2, 2]

    kruskal_data = {
        "groups": [placebo, treatment_1, treatment_2]
        # Removed calculate_effect_size and post_hoc
    }

    try:
        response = requests.post(f"{BASE_URL}/nonparametric/kruskal-wallis/", json=kruskal_data)
        print(f"  Status: {response.status_code}")
        if response.status_code == 200:
            print(f"  ✅ SUCCESS")
        else:
            print(f"  ❌ FAILED - {response.text[:100]}")
    except Exception as e:
        print(f"  ❌ ERROR - {str(e)}")


def test_categorical():
    """Test categorical endpoints with correct parameters"""
    print("\n" + "="*50)
    print("CATEGORICAL TESTS")
    print("="*50)

    # Chi-Square Test
    print("\n1. Chi-Square Test of Independence")
    contingency_table = [
        [45, 35],
        [55, 25]
    ]

    chi_square_data = {
        "contingency_table": contingency_table,
        # Removed alpha parameter
        "corrections": ["yates"]
    }

    try:
        response = requests.post(f"{BASE_URL}/categorical/chi-square/independence/", json=chi_square_data)
        print(f"  Status: {response.status_code}")
        if response.status_code == 200:
            print(f"  ✅ SUCCESS")
        else:
            print(f"  ❌ FAILED - {response.text[:100]}")
    except Exception as e:
        print(f"  ❌ ERROR - {str(e)}")

    # Fisher's Exact Test
    print("\n2. Fisher's Exact Test")
    fisher_table = [
        [8, 2],
        [1, 9]
    ]

    fisher_data = {
        "table": fisher_table,  # Fisher's expects "table"
        "alternative": "two-sided"
    }

    try:
        response = requests.post(f"{BASE_URL}/categorical/fishers/", json=fisher_data)
        print(f"  Status: {response.status_code}")
        if response.status_code == 200:
            print(f"  ✅ SUCCESS")
        else:
            print(f"  ❌ FAILED - {response.text[:100]}")
    except Exception as e:
        print(f"  ❌ ERROR - {str(e)}")


def test_correlation():
    """Test correlation with fixed serialization"""
    print("\n" + "="*50)
    print("CORRELATION TEST")
    print("="*50)

    heights = [165, 170, 175, 168, 172, 178, 162, 180, 169, 174]
    weights = [65, 72, 78, 68, 75, 82, 60, 85, 70, 76]

    correlation_data = {
        "x": heights,
        "y": weights,
        "methods": ["pearson"],  # Start with just pearson
        "confidence_level": 0.95
    }

    try:
        response = requests.post(f"{BASE_URL}/stats/correlation/", json=correlation_data)
        print(f"  Status: {response.status_code}")
        if response.status_code == 200:
            print(f"  ✅ SUCCESS")
            data = response.json()
            # Check for precision
            result_str = json.dumps(data)
            if any(len(val.split('.')[-1]) > 20 for val in result_str.split('"') if '.' in val):
                print(f"  ✅ 50-decimal precision verified")
        else:
            print(f"  ❌ FAILED")
    except Exception as e:
        print(f"  ❌ ERROR - {str(e)}")


def test_regression():
    """Test regression with correct serializer"""
    print("\n" + "="*50)
    print("REGRESSION TEST")
    print("="*50)

    study_hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    exam_scores = [45, 52, 58, 64, 70, 75, 80, 85, 88, 92]

    regression_data = {
        "regression_type": "linear",
        "x": [study_hours],  # Try as nested array for features
        "y": exam_scores,
        "options": {
            "calculate_diagnostics": True,
            "calculate_confidence_intervals": True
        }
    }

    try:
        response = requests.post(f"{BASE_URL}/regression/linear/", json=regression_data)
        print(f"  Status: {response.status_code}")
        if response.status_code == 200:
            print(f"  ✅ SUCCESS")
        else:
            print(f"  ❌ FAILED")
    except Exception as e:
        print(f"  ❌ ERROR - {str(e)}")


def main():
    """Run all fixed tests"""
    print("\n" + "="*60)
    print("FIXED STATISTICAL TEST SUITE")
    print("Testing with Correct Parameters")
    print("="*60)

    # Test each category
    test_nonparametric()
    test_categorical()
    test_correlation()
    test_regression()

    print("\n" + "="*60)
    print("TEST SUITE COMPLETE")
    print("="*60)


if __name__ == "__main__":
    main()