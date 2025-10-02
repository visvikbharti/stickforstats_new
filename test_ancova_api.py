#!/usr/bin/env python3
"""
Test ANCOVA API endpoint
"""

import requests
import json

# API endpoint
url = "http://localhost:8000/api/v1/stats/ancova/"

# Test data
data = {
    "groups": [[10, 12, 14], [15, 17, 19], [20, 22, 24]],
    "covariates": [[5, 6, 7], [8, 9, 10], [11, 12, 13]],
    "group_names": ["Group 1", "Group 2", "Group 3"],
    "covariate_names": ["Age"],
    "dependent_variable_name": "Outcome",
    "alpha": 0.05,
    "options": {
        "check_assumptions": False,
        "calculate_effect_sizes": True
    }
}

# Make request
response = requests.post(url, json=data)

# Print results
print(f"Status Code: {response.status_code}")
if response.status_code == 200:
    print(f"Response: {json.dumps(response.json(), indent=2)[:500]}...")
else:
    print(f"Error Response: {response.text}")