#!/usr/bin/env python3
"""
Test Polynomial Regression endpoint to identify the bug
"""

import requests
import numpy as np
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_polynomial_regression():
    """Test polynomial regression with different configurations"""

    print("="*60)
    print("POLYNOMIAL REGRESSION BUG INVESTIGATION")
    print("="*60)

    np.random.seed(42)
    X = np.random.randn(20).tolist()
    y = [2 * x**2 + x + np.random.normal(0, 0.5) for x in X]

    test_cases = [
        {
            "name": "Polynomial (degree 2)",
            "payload": {
                "X": X,
                "y": y,
                "type": "polynomial",
                "degree": 2
            }
        },
        {
            "name": "Polynomial (degree 3)",
            "payload": {
                "X": X,
                "y": y,
                "type": "polynomial",
                "degree": 3
            }
        },
        {
            "name": "Polynomial with data wrapper",
            "payload": {
                "data": {"X": X, "y": y},
                "type": "polynomial",
                "degree": 2
            }
        },
        {
            "name": "Polynomial without degree",
            "payload": {
                "X": X,
                "y": y,
                "type": "polynomial"
            }
        }
    ]

    for test in test_cases:
        print(f"\n{test['name']}:")
        print(f"Payload: {json.dumps(test['payload'], indent=2)[:200]}...")

        try:
            response = requests.post(
                f"{BASE_URL}/regression/",
                json=test['payload'],
                timeout=10
            )

            print(f"Status: {response.status_code}")

            if response.status_code == 200:
                result = response.json()
                print(f"✅ Success")
                if 'coefficients' in result:
                    print(f"   Coefficients: {len(result['coefficients'])} values")
            else:
                print(f"❌ Failed")
                error_text = response.text[:500]
                print(f"   Error: {error_text}")

                # Try to parse error details
                try:
                    error_json = response.json()
                    if 'error' in error_json:
                        print(f"   Error message: {error_json['error']}")
                    if 'details' in error_json:
                        print(f"   Details: {error_json['details']}")
                except:
                    pass

        except Exception as e:
            print(f"❌ Exception: {str(e)}")

if __name__ == "__main__":
    test_polynomial_regression()