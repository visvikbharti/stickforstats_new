#!/usr/bin/env python3
"""
Simple API test to verify endpoints are working
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

print("Testing StickForStats API Endpoints...")
print("="*50)

# Test 1: Simple T-Test
print("\n1. Testing T-Test Endpoint...")
payload = {
    "test_type": "two_sample",
    "data1": ["1", "2", "3", "4", "5"],
    "data2": ["6", "7", "8", "9", "10"],
    "alternative": "two_sided",
    "confidence_level": "95"
}

try:
    response = requests.post(f"{BASE_URL}/stats/ttest/", json=payload)
    print(f"   Status Code: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"   T-statistic: {result.get('t_statistic', 'N/A')[:50]}...")
        print(f"   P-value: {result.get('p_value', 'N/A')[:50]}...")
    else:
        print(f"   Error: {response.text[:200]}")
except Exception as e:
    print(f"   Exception: {e}")

# Test 2: Simple ANOVA
print("\n2. Testing ANOVA Endpoint...")
payload = {
    "anova_type": "one_way",
    "groups": [
        ["1", "2", "3"],
        ["4", "5", "6"],
        ["7", "8", "9"]
    ]
}

try:
    response = requests.post(f"{BASE_URL}/stats/anova/", json=payload)
    print(f"   Status Code: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"   F-statistic: {result.get('f_statistic', 'N/A')}")
        print(f"   P-value: {result.get('p_value', 'N/A')}")
    else:
        print(f"   Error: {response.text[:200]}")
except Exception as e:
    print(f"   Exception: {e}")

# Test 3: Check available endpoints
print("\n3. Checking Available Endpoints...")
try:
    response = requests.get(f"{BASE_URL}/")
    print(f"   Status Code: {response.status_code}")
    if response.status_code == 404:
        print("   Note: Root endpoint not configured (expected)")
except Exception as e:
    print(f"   Exception: {e}")

print("\n" + "="*50)
print("Test Complete!")