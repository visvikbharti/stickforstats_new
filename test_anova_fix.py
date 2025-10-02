#!/usr/bin/env python3
"""
Test ANOVA Endpoint Fix
Verifies that ANOVA accepts multiple parameter formats
"""

import requests
import json
import numpy as np

BASE_URL = "http://localhost:8000/api/v1"

def test_anova_variations():
    """Test different parameter formats for ANOVA"""

    print("=" * 60)
    print("TESTING ANOVA PARAMETER FLEXIBILITY")
    print("=" * 60)

    # Generate test data
    np.random.seed(42)
    group1 = np.random.normal(100, 15, 20).tolist()
    group2 = np.random.normal(105, 15, 20).tolist()
    group3 = np.random.normal(110, 15, 20).tolist()

    test_cases = [
        {
            "name": "One-Way ANOVA (with 'data' parameter)",
            "payload": {
                "data": [group1, group2, group3],
                "anova_type": "one-way"  # With hyphen
            }
        },
        {
            "name": "One-Way ANOVA (with 'groups' parameter)",
            "payload": {
                "groups": [group1, group2, group3],
                "anova_type": "one_way"  # With underscore
            }
        },
        {
            "name": "Repeated Measures ANOVA",
            "payload": {
                "data": [group1[:15], group2[:15]],
                "repeated": True  # Should set anova_type to repeated_measures
            }
        },
        {
            "name": "Two-Way ANOVA",
            "payload": {
                "data": [group1[:10], group2[:10], group3[:10], group1[10:20]],
                "factors": {
                    "A": ["Level1", "Level1", "Level2", "Level2"],
                    "B": ["Level1", "Level2", "Level1", "Level2"]
                }
            }
        },
        {
            "name": "ANOVA with Post-hoc",
            "payload": {
                "groups": [group1, group2, group3],
                "post_hoc": "tukey"
            }
        }
    ]

    results = []
    for i, test_case in enumerate(test_cases, 1):
        print(f"\nTest {i}: {test_case['name']}")
        print("-" * 40)

        response = requests.post(
            f"{BASE_URL}/stats/anova/",
            json=test_case['payload'],
            headers={"Content-Type": "application/json"}
        )

        if response.status_code == 200:
            result = response.json()
            print(f"✓ SUCCESS")

            # Check for key ANOVA results
            if 'f_statistic' in result:
                print(f"  F-Statistic: {result['f_statistic']}")
                print(f"  P-Value: {result.get('p_value', 'N/A')}")
            elif 'high_precision_result' in result:
                hp_result = result['high_precision_result']
                print(f"  F-Statistic: {hp_result.get('f_statistic', 'N/A')}")
                print(f"  P-Value: {hp_result.get('p_value', 'N/A')}")
            else:
                print(f"  Result keys: {list(result.keys())[:5]}")

            results.append({"test": test_case['name'], "status": "PASS"})
        else:
            print(f"✗ FAILED: Status {response.status_code}")
            try:
                error_data = response.json()
                print(f"  Error: {error_data.get('error', 'Unknown')}")
                if 'details' in error_data:
                    for key, value in error_data['details'].items():
                        print(f"    {key}: {value}")
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
        print("\n✅ ANOVA ENDPOINT FULLY FIXED!")
    else:
        print("\n⚠️ Some test cases still failing")
        for r in results:
            if r['status'] == "FAIL":
                print(f"  - {r['test']}")

    return passed == total

if __name__ == "__main__":
    success = test_anova_variations()