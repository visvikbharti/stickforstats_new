#!/usr/bin/env python3
"""
Test script for Transformation Wizard API endpoints
Tests all 4 transformation endpoints to verify they're working correctly.
"""

import requests
import json
import numpy as np

API_BASE = "http://localhost:8000"

def test_transformation_suggest():
    """Test transformation suggestion endpoint"""
    print("\n" + "="*60)
    print("TEST 1: Transformation Suggestion")
    print("="*60)

    # Create right-skewed data (log transformation should be recommended)
    data = np.random.exponential(scale=2.0, size=100).tolist()

    response = requests.post(
        f"{API_BASE}/api/guardian/transformation/suggest/",
        json={
            "data": data,
            "violation_type": "normality"
        }
    )

    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Recommended: {result.get('recommended')}")
        print(f"✅ Alternatives: {result.get('alternatives')}")
        print(f"✅ Reason: {result.get('reason')}")
        print(f"✅ Expected Improvement: {result.get('expected_improvement')}%")
        return result
    else:
        print(f"❌ Error: {response.text}")
        return None


def test_transformation_apply(transformation_type="log"):
    """Test transformation application endpoint"""
    print("\n" + "="*60)
    print(f"TEST 2: Apply {transformation_type.upper()} Transformation")
    print("="*60)

    # Create sample data
    data = np.random.exponential(scale=2.0, size=50).tolist()

    response = requests.post(
        f"{API_BASE}/api/guardian/transformation/apply/",
        json={
            "data": data,
            "transformation": transformation_type,
            "parameters": {}
        }
    )

    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Transformation: {result.get('transformation')}")
        print(f"✅ Success: {result.get('success')}")
        print(f"✅ Formula: {result.get('formula')}")
        print(f"✅ Inverse Formula: {result.get('inverse_formula')}")
        print(f"✅ Data points transformed: {len(result.get('transformed_data', []))}")
        return result
    else:
        print(f"❌ Error: {response.text}")
        return None


def test_transformation_validate():
    """Test transformation validation endpoint"""
    print("\n" + "="*60)
    print("TEST 3: Validate Transformation")
    print("="*60)

    # Create original and transformed data
    original_data = np.random.exponential(scale=2.0, size=50).tolist()
    transformed_data = np.log(np.array(original_data) + 1).tolist()

    response = requests.post(
        f"{API_BASE}/api/guardian/transformation/validate/",
        json={
            "original_data": original_data,
            "transformed_data": transformed_data
        }
    )

    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Original p-value: {result.get('original_p_value'):.4f}")
        print(f"✅ Transformed p-value: {result.get('transformed_p_value'):.4f}")
        print(f"✅ Improvement: {result.get('improvement')}")
        print(f"✅ Improvement Score: {result.get('improvement_score')}%")
        return result
    else:
        print(f"❌ Error: {response.text}")
        return None


def test_code_export(transformation_type="log", language="python"):
    """Test code export endpoint"""
    print("\n" + "="*60)
    print(f"TEST 4: Export {language.upper()} Code for {transformation_type.upper()}")
    print("="*60)

    response = requests.post(
        f"{API_BASE}/api/guardian/transformation/export-code/",
        json={
            "transformation": transformation_type,
            "parameters": {"add_constant": 1.0},
            "language": language
        }
    )

    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Language: {result.get('language')}")
        print(f"✅ Code generated successfully:")
        print("-" * 60)
        print(result.get('code'))
        print("-" * 60)
        return result
    else:
        print(f"❌ Error: {response.text}")
        return None


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("TRANSFORMATION WIZARD API TEST SUITE")
    print("="*60)
    print("Testing all 4 transformation endpoints...")

    try:
        # Test 1: Suggest transformation
        suggestion = test_transformation_suggest()

        # Test 2: Apply transformation
        if suggestion:
            apply_result = test_transformation_apply(suggestion.get('recommended', 'log'))
        else:
            apply_result = test_transformation_apply('log')

        # Test 3: Validate transformation
        validation = test_transformation_validate()

        # Test 4: Export code (Python)
        code_python = test_code_export('log', 'python')

        # Test 4b: Export code (R)
        code_r = test_code_export('sqrt', 'r')

        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"✅ Suggestion endpoint: {'PASS' if suggestion else 'FAIL'}")
        print(f"✅ Apply endpoint: {'PASS' if apply_result else 'FAIL'}")
        print(f"✅ Validate endpoint: {'PASS' if validation else 'FAIL'}")
        print(f"✅ Code export (Python): {'PASS' if code_python else 'FAIL'}")
        print(f"✅ Code export (R): {'PASS' if code_r else 'FAIL'}")
        print("="*60)

        if all([suggestion, apply_result, validation, code_python, code_r]):
            print("\n🎉 ALL TESTS PASSED! Transformation Wizard API is fully operational.")
            return 0
        else:
            print("\n⚠️ Some tests failed. Check the output above.")
            return 1

    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to backend at", API_BASE)
        print("Make sure the Django server is running on port 8000")
        return 1
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
