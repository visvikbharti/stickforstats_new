#!/usr/bin/env python3
"""
Quick endpoint test to verify which endpoints are working
"""

import requests
import json

base_url = "http://localhost:8000/api/v1"

# Test configurations for different endpoints
endpoints = {
    'stats/ttest/': {
        'data': {
            'data1': [1, 2, 3, 4, 5],
            'data2': [6, 7, 8, 9, 10],
            'test_type': 'two_sample'
        }
    },
    'stats/anova/': {
        'data': {
            'anova_type': 'one_way',
            'groups': [
                [1, 2, 3, 4, 5],
                [6, 7, 8, 9, 10],
                [11, 12, 13, 14, 15]
            ],
            'alpha': 0.05
        }
    },
    'stats/correlation/': {
        'data': {
            'x': [1, 2, 3, 4, 5],
            'y': [2, 4, 6, 8, 10],
            'method': 'pearson'
        }
    },
    'stats/descriptive/': {
        'data': {
            'data': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        }
    },
    'nonparametric/mann-whitney/': {
        'data': {
            'group1': [1, 2, 3, 4, 5],
            'group2': [6, 7, 8, 9, 10]
        }
    },
    'nonparametric/wilcoxon/': {
        'data': {
            'x': [1, 2, 3, 4, 5],
            'alternative': 'two-sided'
        }
    },
    'nonparametric/kruskal-wallis/': {
        'data': {
            'groups': [
                [1, 2, 3],
                [4, 5, 6],
                [7, 8, 9]
            ],
            'nan_policy': 'omit'
        }
    },
    'categorical/chi-square/goodness/': {
        'data': {
            'observed': [10, 20, 30, 40],
            'expected': [15, 25, 20, 40]
        }
    },
    'categorical/fishers/': {
        'data': {
            'table': [[10, 20], [30, 25]]
        }
    },
    'stats/regression/': {
        'data': {
            'type': 'simple_linear',
            'X': [1, 2, 3, 4, 5],  # Simple linear uses 1D array
            'y': [2, 4, 6, 8, 10]
        }
    }
}

print("\n" + "="*60)
print("TESTING STICKFORSTATS ENDPOINTS")
print("="*60)

working_endpoints = []
failed_endpoints = []

for endpoint, config in endpoints.items():
    url = f"{base_url}/{endpoint}"
    try:
        response = requests.post(url, json=config['data'])

        if response.status_code == 200:
            result = response.json()
            # Check for high_precision_result
            if 'high_precision_result' in result:
                print(f"✅ {endpoint:30} - SUCCESS (50-decimal precision)")
                working_endpoints.append(endpoint)
            else:
                print(f"⚠️  {endpoint:30} - SUCCESS (no high precision)")
                working_endpoints.append(endpoint)
        else:
            print(f"❌ {endpoint:30} - FAILED ({response.status_code})")
            print(f"   Error: {response.text[:100]}...")
            failed_endpoints.append(endpoint)
    except Exception as e:
        print(f"❌ {endpoint:30} - ERROR: {str(e)}")
        failed_endpoints.append(endpoint)

print("\n" + "="*60)
print("SUMMARY")
print("="*60)
print(f"✅ Working endpoints: {len(working_endpoints)}/{len(endpoints)}")
print(f"❌ Failed endpoints: {len(failed_endpoints)}/{len(endpoints)}")

if working_endpoints:
    print("\nWorking endpoints:")
    for ep in working_endpoints:
        print(f"  - {ep}")

if failed_endpoints:
    print("\nFailed endpoints:")
    for ep in failed_endpoints:
        print(f"  - {ep}")

print("\n" + "="*60)