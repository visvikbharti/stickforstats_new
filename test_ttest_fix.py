#!/usr/bin/env python3
"""
Test T-Test Endpoint Fix
Verifies that T-Test accepts multiple parameter formats
"""

import requests
import json
import numpy as np

BASE_URL = "http://localhost:8000/api/v1"

def test_ttest_variations():
    """Test different parameter formats for T-Test"""

    print("=" * 60)
    print("TESTING T-TEST PARAMETER FLEXIBILITY")
    print("=" * 60)

    # Generate test data
    np.random.seed(42)
    data1 = np.random.normal(100, 15, 30).tolist()
    data2 = np.random.normal(105, 15, 30).tolist()

    test_cases = [
        {
            "name": "One-Sample T-Test (with mu)",
            "payload": {
                "test_type": "one-sample",  # With hyphen
                "data1": data1,
                "mu": 100  # Direct parameter
            }
        },
        {
            "name": "One-Sample T-Test (with hypothesized_mean)",
            "payload": {
                "test_type": "one_sample",  # With underscore
                "data1": data1,
                "hypothesized_mean": "100"
            }
        },
        {
            "name": "Independent T-Test (old name)",
            "payload": {
                "test_type": "independent",  # Old naming
                "data1": data1,
                "data2": data2
            }
        },
        {
            "name": "Two-Sample T-Test (new name)",
            "payload": {
                "test_type": "two_sample",  # Correct naming
                "data1": data1,
                "data2": data2
            }
        },
        {
            "name": "Paired T-Test",
            "payload": {
                "test_type": "paired",
                "data1": data1[:20],
                "data2": data2[:20]
            }
        },
        {
            "name": "T-Test with alpha",
            "payload": {
                "test_type": "two_sample",
                "data1": data1,
                "data2": data2,
                "alpha": 0.01  # Should convert to confidence_level=99
            }
        }
    ]

    results = []
    for i, test_case in enumerate(test_cases, 1):
        print(f"\nTest {i}: {test_case['name']}")
        print("-" * 40)

        response = requests.post(
            f"{BASE_URL}/stats/ttest/",
            json=test_case['payload'],
            headers={"Content-Type": "application/json"}
        )

        if response.status_code == 200:
            result = response.json()
            print(f"✓ SUCCESS")
            print(f"  Test Type: {result.get('test_type')}")

            # Check for high precision result
            if 'high_precision_result' in result:
                hp_result = result['high_precision_result']
                if 't_statistic' in hp_result:
                    print(f"  T-Statistic: {hp_result['t_statistic'][:10]}...")
                    print(f"  P-Value: {hp_result['p_value'][:10]}...")
                else:
                    print(f"  Result keys: {list(hp_result.keys())}")

            results.append({"test": test_case['name'], "status": "PASS"})
        else:
            print(f"✗ FAILED: Status {response.status_code}")
            try:
                error_data = response.json()
                print(f"  Error: {error_data.get('error', 'Unknown')}")
                if 'details' in error_data:
                    print(f"  Details: {error_data['details']}")
            except:
                print(f"  Response: {response.text[:200]}")

            results.append({"test": test_case['name'], "status": "FAIL"})

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    passed = sum(1 for r in results if r['status'] == "PASS")
    total = len(results)
    print(f"Passed: {passed}/{total}")
    print(f"Success Rate: {passed/total*100:.1f}%")

    if passed == total:
        print("\n✅ T-TEST ENDPOINT FULLY FIXED!")
    else:
        print("\n⚠️ Some test cases still failing")

    return passed == total

if __name__ == "__main__":
    success = test_ttest_variations()