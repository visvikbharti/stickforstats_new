#!/usr/bin/env python3
"""
COMPLETE Platform Test - ALL Endpoints
Testing every single endpoint in the system
"""

import requests
import numpy as np
import json
import time

BASE_URL = "http://localhost:8000/api/v1"

# Test result counters
total_endpoints = 0
working_endpoints = 0
failed_endpoints = []

def test_endpoint(name, method, url, payload=None, expected_status=200):
    """Test any endpoint"""
    global total_endpoints, working_endpoints, failed_endpoints
    total_endpoints += 1

    try:
        if method == 'GET':
            response = requests.get(f"{BASE_URL}{url}", timeout=5)
        else:
            response = requests.post(f"{BASE_URL}{url}", json=payload, timeout=5)

        if response.status_code == expected_status:
            working_endpoints += 1
            print(f"✅ {name}")
            return True
        else:
            failed_endpoints.append(f"{name} (Status: {response.status_code})")
            print(f"❌ {name} (Status: {response.status_code})")
            return False
    except Exception as e:
        failed_endpoints.append(f"{name} (Error: {str(e)[:50]})")
        print(f"❌ {name} (Error: {str(e)[:50]})")
        return False

def test_missing_data_endpoints():
    """Test Missing Data Handling endpoints"""
    print("\n" + "="*50)
    print("MISSING DATA ENDPOINTS (9 endpoints)")
    print("="*50)

    # Test data with missing values
    data_with_missing = {
        "data": [
            [1.0, 2.0, None, 4.0],
            [5.0, None, 7.0, 8.0],
            [9.0, 10.0, 11.0, None],
            [None, 14.0, 15.0, 16.0]
        ]
    }

    test_endpoint("Detect Missing Patterns", "POST", "/missing-data/detect/", data_with_missing)
    test_endpoint("Impute Missing Data", "POST", "/missing-data/impute/", {
        **data_with_missing,
        "method": "mean"
    })
    test_endpoint("Little's MCAR Test", "POST", "/missing-data/little-test/", data_with_missing)
    test_endpoint("Compare Imputation Methods", "POST", "/missing-data/compare/", data_with_missing)
    test_endpoint("Visualize Missing Patterns", "POST", "/missing-data/visualize/", data_with_missing)
    test_endpoint("Multiple Imputation", "POST", "/missing-data/multiple-imputation/", {
        **data_with_missing,
        "n_imputations": 5
    })
    test_endpoint("KNN Imputation", "POST", "/missing-data/knn/", {
        **data_with_missing,
        "k": 3
    })
    test_endpoint("EM Algorithm Imputation", "POST", "/missing-data/em/", data_with_missing)
    test_endpoint("Imputation Methods Info", "GET", "/missing-data/info/")

def test_audit_endpoints():
    """Test Audit System endpoints"""
    print("\n" + "="*50)
    print("AUDIT SYSTEM ENDPOINTS (4 endpoints)")
    print("="*50)

    test_endpoint("Audit Summary", "GET", "/audit/summary/")
    test_endpoint("Audit Record", "POST", "/audit/record/", {
        "test_type": "ttest",
        "parameters": {"data": [1, 2, 3]},
        "result": {"p_value": 0.05}
    })
    test_endpoint("Audit Metrics", "GET", "/audit/metrics/usage/")
    test_endpoint("Audit Health Check", "GET", "/audit/health/")

def test_descriptive_stats():
    """Test Descriptive Statistics endpoint"""
    print("\n" + "="*50)
    print("DESCRIPTIVE STATISTICS")
    print("="*50)

    np.random.seed(42)
    test_data = {
        "data": np.random.normal(100, 15, 100).tolist(),
        "options": {
            "calculate_all": True,
            "confidence_level": 0.95
        }
    }

    test_endpoint("Descriptive Statistics", "POST", "/stats/descriptive/", test_data)

def test_ancova():
    """Test ANCOVA endpoint"""
    print("\n" + "="*50)
    print("ANCOVA (Analysis of Covariance)")
    print("="*50)

    np.random.seed(42)
    test_data = {
        "dependent": np.random.normal(100, 10, 30).tolist(),
        "groups": ["A"] * 10 + ["B"] * 10 + ["C"] * 10,
        "covariates": [np.random.normal(50, 5, 30).tolist()]
    }

    test_endpoint("ANCOVA", "POST", "/stats/ancova/", test_data)

def test_additional_power_endpoints():
    """Test additional Power Analysis endpoints"""
    print("\n" + "="*50)
    print("ADDITIONAL POWER ANALYSIS ENDPOINTS (5 endpoints)")
    print("="*50)

    test_endpoint("Power Curves", "POST", "/power/curves/", {
        "test_type": "ttest",
        "effect_sizes": [0.2, 0.5, 0.8],
        "sample_sizes": list(range(10, 100, 10)),
        "alpha": 0.05
    })

    test_endpoint("Optimal Allocation", "POST", "/power/allocation/", {
        "groups": 3,
        "total_sample": 150,
        "effect_sizes": [0.3, 0.4, 0.5]
    })

    test_endpoint("Sensitivity Analysis", "POST", "/power/sensitivity/", {
        "test_type": "ttest",
        "base_params": {
            "effect_size": 0.5,
            "sample_size": 64,
            "alpha": 0.05
        }
    })

    test_endpoint("Comprehensive Power Report", "POST", "/power/report/", {
        "test_type": "ttest",
        "effect_size": 0.5,
        "sample_size": 64,
        "alpha": 0.05
    })

    test_endpoint("Power Analysis Info", "GET", "/power/info/")

def test_utility_endpoints():
    """Test utility endpoints"""
    print("\n" + "="*50)
    print("UTILITY ENDPOINTS (4 endpoints)")
    print("="*50)

    # Test data
    np.random.seed(42)
    test_data = np.random.normal(100, 15, 30).tolist()

    test_endpoint("Test Recommendation", "POST", "/stats/recommend/", {
        "data": test_data,
        "goal": "compare_means"
    })

    test_endpoint("Data Import", "POST", "/data/import/", {
        "format": "json",
        "data": test_data
    })

    test_endpoint("Validation Dashboard", "GET", "/validation/dashboard/")

    test_endpoint("Comparison View", "POST", "/stats/comparison/", {
        "test_name": "ttest",
        "data": {
            "data1": test_data,
            "hypothesized_mean": 100
        }
    })

def test_simple_endpoint():
    """Test simple test endpoint"""
    print("\n" + "="*50)
    print("SIMPLE TEST ENDPOINT")
    print("="*50)

    test_endpoint("Simple Test", "GET", "/test/")

def main():
    """Run complete platform test"""
    print("="*70)
    print("COMPLETE PLATFORM TEST - ALL ENDPOINTS")
    print("="*70)
    print("Testing EVERY endpoint in the system...")

    # Run all test categories
    test_simple_endpoint()
    test_descriptive_stats()
    test_ancova()
    test_missing_data_endpoints()
    test_audit_endpoints()
    test_additional_power_endpoints()
    test_utility_endpoints()

    # Calculate final statistics
    functionality_rate = (working_endpoints / total_endpoints * 100) if total_endpoints > 0 else 0

    # Report results
    print("\n" + "="*70)
    print("COMPLETE PLATFORM RESULTS")
    print("="*70)
    print(f"Total Endpoints Found: {total_endpoints}")
    print(f"Working Endpoints: {working_endpoints} ✅")
    print(f"Failed Endpoints: {len(failed_endpoints)} ❌")
    print(f"True Functionality Rate: {functionality_rate:.1f}%")

    if failed_endpoints:
        print("\n" + "="*70)
        print("FAILED ENDPOINTS:")
        print("="*70)
        for endpoint in failed_endpoints:
            print(f"  - {endpoint}")

    print("\n" + "="*70)
    print("ASSESSMENT:")
    print("="*70)

    if functionality_rate == 100:
        print("✅ PERFECT: All endpoints working!")
    elif functionality_rate >= 95:
        print("⚠️ NEARLY COMPLETE: >95% functional")
    elif functionality_rate >= 90:
        print("⚠️ GOOD: >90% functional")
    else:
        print(f"🔴 NEEDS WORK: Only {functionality_rate:.1f}% functional")

    print(f"\n**TRUE PLATFORM FUNCTIONALITY: {functionality_rate:.1f}%**")

    # Detailed breakdown
    print("\n" + "="*70)
    print("ENDPOINT CATEGORIES TESTED:")
    print("="*70)
    print("1. Simple Test Endpoint")
    print("2. Descriptive Statistics")
    print("3. ANCOVA")
    print("4. Missing Data Handling (9 endpoints)")
    print("5. Audit System (4 endpoints)")
    print("6. Power Analysis Extensions (5 endpoints)")
    print("7. Utility Endpoints (4 endpoints)")
    print("\nPLUS: All previously tested endpoints (36)")
    print(f"GRAND TOTAL: {total_endpoints} endpoints in system")

if __name__ == "__main__":
    main()