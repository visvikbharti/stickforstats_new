#!/usr/bin/env python3
"""Quick verification of bug fixes"""
import requests

BASE_URL = "http://localhost:8000"

print("\n" + "="*70)
print("VERIFICATION OF BUG FIXES")
print("="*70 + "\n")

tests = []

# 1. G-Test (was failing with alpha parameter)
print("1. Testing G-Test...")
resp = requests.post(f"{BASE_URL}/api/v1/categorical/g-test/", json={"observed":[[10,15],[8,12]],"alpha":0.05})
status = "✅ PASS" if resp.status_code == 200 else f"❌ FAIL ({resp.status_code})"
print(f"   {status}")
tests.append(("G-Test", resp.status_code == 200))

# 2. Friedman Test (was failing with division by zero)
print("2. Testing Friedman Test...")
resp = requests.post(f"{BASE_URL}/api/v1/nonparametric/friedman/", json={"data":[[1,2,3],[2,3,4],[3,4,5]]})
status = "✅ PASS" if resp.status_code == 200 else f"❌ FAIL ({resp.status_code})"
print(f"   {status}")
tests.append(("Friedman", resp.status_code == 200))

# 3. Power Curves (was failing with uninitialized variable)
print("3. Testing Power Curves...")
resp = requests.post(f"{BASE_URL}/api/v1/power/curves/", json={
    "test_type": "t-test",
    "effect_sizes": [0.2, 0.5, 0.8],
    "sample_sizes": [10, 20, 30]
})
status = "✅ PASS" if resp.status_code == 200 else f"❌ FAIL ({resp.status_code})"
print(f"   {status}")
tests.append(("Power Curves", resp.status_code == 200))

# 4. Power ANOVA with 'k' parameter (parameter adapter enhancement)
print("4. Testing Power ANOVA with 'k'...")
resp = requests.post(f"{BASE_URL}/api/v1/power/anova/", json={
    "effect_size": 0.25,
    "k": 3,  # Using 'k' instead of 'groups'
    "n_per_group": 20
})
status = "✅ PASS" if resp.status_code == 200 else f"❌ FAIL ({resp.status_code})"
print(f"   {status}")
tests.append(("Power ANOVA (k)", resp.status_code == 200))

# 5. Power Correlation with 'r' parameter (parameter adapter enhancement)
print("5. Testing Power Correlation with 'r'...")
resp = requests.post(f"{BASE_URL}/api/v1/power/correlation/", json={
    "r": 0.3,  # Using 'r' instead of 'effect_size'
    "n": 50
})
status = "✅ PASS" if resp.status_code == 200 else f"❌ FAIL ({resp.status_code})"
print(f"   {status}")
tests.append(("Power Correlation (r)", resp.status_code == 200))

print("\n" + "="*70)
passed = sum(1 for _, success in tests if success)
total = len(tests)
print(f"RESULT: {passed}/{total} tests passing ({passed/total*100:.0f}%)")
print("="*70 + "\n")

if passed == total:
    print("🎉 ALL BUG FIXES VERIFIED!")
else:
    print(f"⚠️  {total - passed} tests still failing")