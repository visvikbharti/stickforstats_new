#!/usr/bin/env python3
"""
Quick test to verify backend endpoints without authentication
"""
import requests
import json

BASE_URL = "http://localhost:8000"

print("🔍 Testing StickForStats Backend Endpoints")
print("=" * 50)

# Test simple endpoints that might not require auth
endpoints = [
    ("GET", "/api/v1/test/", None),
    ("GET", "/api/v1/validation/dashboard/", None),
    ("POST", "/api/v1/stats/ttest/", {
        "data1": [1, 2, 3, 4, 5],
        "data2": [2, 3, 4, 5, 6],
        "test_type": "independent"
    }),
    ("POST", "/api/v1/stats/descriptive/", {
        "data": [1, 2, 3, 4, 5]
    }),
]

for method, endpoint, data in endpoints:
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url, timeout=5)
        else:
            response = requests.post(url, json=data, timeout=5)

        status_icon = "✅" if response.status_code < 400 else "❌"
        print(f"{status_icon} {endpoint}: {response.status_code}")

        if response.status_code == 200:
            print(f"   Response preview: {str(response.json())[:100]}...")
        elif response.status_code == 401:
            print(f"   Requires authentication")
        else:
            print(f"   Error: {response.text[:100]}")
    except Exception as e:
        print(f"❌ {endpoint}: {str(e)}")

print("\n📊 Testing if backend is running at all:")
try:
    response = requests.get(f"{BASE_URL}/", timeout=5)
    print(f"✅ Backend is running: {response.status_code}")
except:
    print(f"❌ Backend is NOT running on {BASE_URL}")
    print("\nTo start backend: cd backend && python manage.py runserver")