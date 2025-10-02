#!/usr/bin/env python3
"""
Current Status Test - Quick verification of working endpoints
"""

import requests
import numpy as np

BASE_URL = "http://localhost:8000/api/v1"

def test_current_status():
    """Quick test of currently working endpoints"""

    print("=" * 70)
    print("STICKFORSTATS v1.0 - CURRENT ENDPOINT STATUS")
    print("=" * 70)

    np.random.seed(42)
    data1 = np.random.normal(100, 15, 30).tolist()
    data2 = np.random.normal(105, 15, 30).tolist()

    tests = [
        # T-Tests (Working)
        ("One-Sample T-Test", "/stats/ttest/", {
            "test_type": "one_sample",
            "data1": data1,
            "hypothesized_mean": "100"
        }),
        ("Independent T-Test", "/stats/ttest/", {
            "test_type": "independent",
            "data1": data1,
            "data2": data2
        }),
        ("Paired T-Test", "/stats/ttest/", {
            "test_type": "paired",
            "data1": data1[:20],
            "data2": data2[:20]
        }),

        # ANOVA (Partially Working)
        ("One-Way ANOVA", "/stats/anova/", {
            "data": [data1[:15], data2[:15], data1[15:30]]
        }),
        ("Two-Way ANOVA", "/stats/anova/", {
            "data": [data1[:10], data2[:10], data1[10:20], data2[10:20]],
            "factors": {"A": ["L1", "L1", "L2", "L2"], "B": ["L1", "L2", "L1", "L2"]}
        }),

        # Guardian System
        ("Guardian Health", "/guardian/health/", None),

        # Audit System
        ("Audit Health", "/v1/audit/health/", None)
    ]

    working = 0
    total = 0

    for name, endpoint, payload in tests:
        total += 1
        print(f"\n{name:<30}", end="")

        try:
            if payload is None:
                response = requests.get(f"{BASE_URL.replace('/v1', '')}{endpoint}")
            else:
                response = requests.post(
                    f"{BASE_URL}{endpoint}",
                    json=payload,
                    timeout=5
                )

            if response.status_code == 200:
                print("✅ WORKING")
                working += 1
            else:
                print(f"❌ FAILED ({response.status_code})")
        except Exception as e:
            print(f"❌ ERROR ({str(e)[:30]})")

    print("\n" + "=" * 70)
    print(f"SUMMARY: {working}/{total} endpoints working ({working/total*100:.1f}%)")
    print("=" * 70)

if __name__ == "__main__":
    test_current_status()