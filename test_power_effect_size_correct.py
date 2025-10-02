#!/usr/bin/env python3
"""
Test Effect Size T-Test with CORRECT parameter
"""
import requests
import json

response = requests.post(
    "http://localhost:8000/api/v1/power/effect-size/t-test/",
    json={
        "sample_size": 30,  # ✅ CORRECT: Just a number, not data arrays
        "power": 0.8,
        "alpha": 0.05,
        "test_type": "independent"
    }
)

print(f"Status: {response.status_code}")
if response.status_code == 200:
    print("✅ SUCCESS!")
    result = response.json()
    print(json.dumps(result, indent=2))
else:
    print(f"❌ FAILED")
    print(response.text)