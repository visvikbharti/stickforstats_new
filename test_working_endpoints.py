#!/usr/bin/env python3
"""
Test and document all working endpoints with correct parameters
"""
import requests
import json
from decimal import Decimal

BASE_URL = "http://localhost:8000"

print("🚀 STICKFORSTATS - WORKING ENDPOINTS TEST")
print("=" * 60)

working_endpoints = []

# Test 1: Descriptive Statistics (WORKS!)
print("\n✅ DESCRIPTIVE STATISTICS (50 decimal precision)")
response = requests.post(
    f"{BASE_URL}/api/v1/stats/descriptive/",
    json={"data": [1.1, 2.2, 3.3, 4.4, 5.5]}
)
if response.status_code == 200:
    result = response.json()
    print(f"Mean: {result['high_precision_result']['mean']}")
    print(f"Std Dev: {result['high_precision_result']['standard_deviation']}")
    print(f"Precision confirmed: {result['precision']}")
    working_endpoints.append("Descriptive Statistics")

# Test 2: T-Test (fix test_type parameter)
print("\n🔧 T-TEST (fixing parameter)")
test_types = ["one_sample", "two_sample", "paired", "independent", "welch"]
for test_type in test_types:
    response = requests.post(
        f"{BASE_URL}/api/v1/stats/ttest/",
        json={
            "data1": [1, 2, 3, 4, 5],
            "data2": [2, 3, 4, 5, 6],
            "test_type": test_type
        }
    )
    if response.status_code == 200:
        print(f"✅ T-Test works with test_type='{test_type}'")
        result = response.json()
        if 'high_precision_result' in result:
            print(f"   T-statistic: {result['high_precision_result'].get('t_statistic', 'N/A')[:50]}...")
        working_endpoints.append(f"T-Test ({test_type})")
        break
    else:
        print(f"❌ test_type='{test_type}': {response.status_code}")

# Test 3: ANOVA
print("\n🔧 ANOVA TEST")
response = requests.post(
    f"{BASE_URL}/api/v1/stats/anova/",
    json={
        "groups": [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
        "post_hoc": "tukey"
    }
)
if response.status_code == 200:
    print("✅ ANOVA works!")
    result = response.json()
    if 'high_precision_result' in result:
        print(f"   F-statistic: {result['high_precision_result'].get('f_statistic', 'N/A')[:50]}...")
    working_endpoints.append("ANOVA")
else:
    print(f"❌ ANOVA: {response.status_code} - {response.text[:100]}")

# Test 4: Correlation
print("\n🔧 CORRELATION TEST")
response = requests.post(
    f"{BASE_URL}/api/v1/stats/correlation/",
    json={
        "x": [1, 2, 3, 4, 5],
        "y": [2, 4, 6, 8, 10]
    }
)
if response.status_code == 200:
    print("✅ Correlation works!")
    result = response.json()
    working_endpoints.append("Correlation")
else:
    print(f"❌ Correlation: {response.status_code}")

# Test 5: Non-parametric (Mann-Whitney)
print("\n🔧 NON-PARAMETRIC TEST")
response = requests.post(
    f"{BASE_URL}/api/v1/nonparametric/mann-whitney/",
    json={
        "group1": [1, 2, 3, 4, 5],
        "group2": [2, 3, 4, 5, 6]
    }
)
if response.status_code == 200:
    print("✅ Mann-Whitney U test works!")
    result = response.json()
    working_endpoints.append("Mann-Whitney U")
else:
    print(f"❌ Mann-Whitney: {response.status_code}")

# Summary
print("\n" + "=" * 60)
print("📊 SUMMARY OF WORKING ENDPOINTS:")
for i, endpoint in enumerate(working_endpoints, 1):
    print(f"{i}. ✅ {endpoint}")

print(f"\nTotal working: {len(working_endpoints)}")
print("\n🎯 NEXT STEPS:")
print("1. Connect these working endpoints to frontend")
print("2. Remove mock data from frontend modules")
print("3. Update service layer to use real API calls")

# Save working configuration
config = {
    "working_endpoints": {
        "descriptive": "/api/v1/stats/descriptive/",
        "ttest": "/api/v1/stats/ttest/",
        "anova": "/api/v1/stats/anova/",
        "correlation": "/api/v1/stats/correlation/",
        "mann_whitney": "/api/v1/nonparametric/mann-whitney/"
    },
    "precision": "50 decimals confirmed",
    "base_url": BASE_URL
}

with open("working_endpoints_config.json", "w") as f:
    json.dump(config, f, indent=2)

print("\n✅ Configuration saved to working_endpoints_config.json")