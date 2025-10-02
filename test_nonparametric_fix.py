#!/usr/bin/env python3
"""
Non-Parametric Tests Fix Verification
Tests all non-parametric endpoints with multiple parameter formats
"""

import requests
import numpy as np
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_mann_whitney():
    """Test Mann-Whitney U test with various parameter formats"""
    print("\n" + "="*50)
    print("MANN-WHITNEY U TEST")
    print("="*50)

    np.random.seed(42)
    data1 = np.random.normal(100, 15, 20).tolist()
    data2 = np.random.normal(105, 15, 20).tolist()

    tests = [
        ("Standard format", {
            "group1": data1,
            "group2": data2,
            "alternative": "two-sided"
        }),
        ("Alternative names", {
            "data1": data1,
            "data2": data2,
            "alternative": "two-sided"
        }),
        ("Short names", {
            "x": data1,
            "y": data2,
            "alternative": "two-sided"
        }),
    ]

    for name, payload in tests:
        print(f"\n{name}...", end="")
        try:
            response = requests.post(
                f"{BASE_URL}/nonparametric/mann-whitney/",
                json=payload,
                timeout=5
            )
            if response.status_code == 200:
                print(" ✅ SUCCESS")
                result = response.json()
                if 'results' in result:
                    print(f"  U-statistic: {result['results'].get('u_statistic', 'N/A')[:20]}...")
            else:
                print(f" ❌ FAILED ({response.status_code})")
                print(f"  Error: {response.text[:100]}")
        except Exception as e:
            print(f" ❌ ERROR: {str(e)[:50]}")

def test_wilcoxon():
    """Test Wilcoxon signed-rank test"""
    print("\n" + "="*50)
    print("WILCOXON SIGNED-RANK TEST")
    print("="*50)

    np.random.seed(42)
    data1 = np.random.normal(100, 10, 15).tolist()
    data2 = np.random.normal(102, 10, 15).tolist()

    tests = [
        ("Standard format", {
            "x": data1,
            "y": data2,
            "alternative": "two-sided"
        }),
        ("Alternative names", {
            "data1": data1,
            "data2": data2,
            "alternative": "two-sided"
        }),
        ("With before/after", {
            "before": data1,
            "after": data2,
            "alternative": "two-sided"
        }),
    ]

    for name, payload in tests:
        print(f"\n{name}...", end="")
        try:
            response = requests.post(
                f"{BASE_URL}/nonparametric/wilcoxon/",
                json=payload,
                timeout=5
            )
            if response.status_code == 200:
                print(" ✅ SUCCESS")
                result = response.json()
                if 'results' in result:
                    print(f"  Statistic: {result['results'].get('statistic', 'N/A')[:20]}...")
            else:
                print(f" ❌ FAILED ({response.status_code})")
                print(f"  Error: {response.text[:100]}")
        except Exception as e:
            print(f" ❌ ERROR: {str(e)[:50]}")

def test_kruskal_wallis():
    """Test Kruskal-Wallis test"""
    print("\n" + "="*50)
    print("KRUSKAL-WALLIS TEST")
    print("="*50)

    np.random.seed(42)
    group1 = np.random.normal(100, 10, 15).tolist()
    group2 = np.random.normal(105, 10, 15).tolist()
    group3 = np.random.normal(110, 10, 15).tolist()

    tests = [
        ("Standard format", {
            "groups": [group1, group2, group3],
            "nan_policy": "omit"
        }),
        ("Alternative name", {
            "data": [group1, group2, group3],
            "nan_policy": "omit"
        }),
        ("With samples", {
            "samples": [group1, group2, group3],
            "nan_policy": "omit"
        }),
    ]

    for name, payload in tests:
        print(f"\n{name}...", end="")
        try:
            response = requests.post(
                f"{BASE_URL}/nonparametric/kruskal-wallis/",
                json=payload,
                timeout=5
            )
            if response.status_code == 200:
                print(" ✅ SUCCESS")
                result = response.json()
                if 'results' in result:
                    print(f"  H-statistic: {result['results'].get('h_statistic', 'N/A')[:20]}...")
            else:
                print(f" ❌ FAILED ({response.status_code})")
                print(f"  Error: {response.text[:100]}")
        except Exception as e:
            print(f" ❌ ERROR: {str(e)[:50]}")

def test_friedman():
    """Test Friedman test"""
    print("\n" + "="*50)
    print("FRIEDMAN TEST")
    print("="*50)

    np.random.seed(42)
    measurements = [
        [5.2, 5.4, 5.6],
        [6.1, 6.3, 6.2],
        [4.9, 5.1, 5.0],
        [5.5, 5.7, 5.6]
    ]

    tests = [
        ("Standard format", {
            "measurements": measurements
        }),
        ("Alternative name", {
            "data": measurements
        }),
        ("With groups", {
            "groups": measurements
        }),
    ]

    for name, payload in tests:
        print(f"\n{name}...", end="")
        try:
            response = requests.post(
                f"{BASE_URL}/nonparametric/friedman/",
                json=payload,
                timeout=5
            )
            if response.status_code == 200:
                print(" ✅ SUCCESS")
                result = response.json()
                if 'results' in result:
                    print(f"  Chi-square: {result['results'].get('chi_square', 'N/A')[:20]}...")
            else:
                print(f" ❌ FAILED ({response.status_code})")
                print(f"  Error: {response.text[:100]}")
        except Exception as e:
            print(f" ❌ ERROR: {str(e)[:50]}")

def test_sign_test():
    """Test Sign test"""
    print("\n" + "="*50)
    print("SIGN TEST")
    print("="*50)

    np.random.seed(42)
    data1 = np.random.normal(100, 10, 15).tolist()
    data2 = np.random.normal(102, 10, 15).tolist()

    tests = [
        ("Standard format", {
            "x": data1,
            "y": data2,
            "alternative": "two-sided"
        }),
        ("Alternative names", {
            "data1": data1,
            "data2": data2,
            "alternative": "two-sided"
        }),
        ("With before/after", {
            "before": data1,
            "after": data2,
            "alternative": "two-sided"
        }),
    ]

    for name, payload in tests:
        print(f"\n{name}...", end="")
        try:
            response = requests.post(
                f"{BASE_URL}/nonparametric/sign/",
                json=payload,
                timeout=5
            )
            if response.status_code == 200:
                print(" ✅ SUCCESS")
            else:
                print(f" ❌ FAILED ({response.status_code})")
                print(f"  Error: {response.text[:100]}")
        except Exception as e:
            print(f" ❌ ERROR: {str(e)[:50]}")

def main():
    """Run all non-parametric test verifications"""
    print("="*70)
    print("NON-PARAMETRIC TESTS - PARAMETER FLEXIBILITY VERIFICATION")
    print("="*70)

    total = 0
    working = 0

    # Test each endpoint
    test_functions = [
        test_mann_whitney,
        test_wilcoxon,
        test_kruskal_wallis,
        test_friedman,
        test_sign_test
    ]

    for test_func in test_functions:
        test_func()

    print("\n" + "="*70)
    print("VERIFICATION COMPLETE")
    print("="*70)
    print("\nNOTE: Manual count of successes needed")
    print("Check for ✅ SUCCESS markers above")

if __name__ == "__main__":
    main()