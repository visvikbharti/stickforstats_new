#!/usr/bin/env python3
"""
Test Missing Data endpoints after fixes
"""

import requests
import json

BASE_URL = 'http://localhost:8000/api/v1'
results = []

# Test data with missing values
data_with_missing = {
    'data': [
        [1.0, 2.0, None, 4.0],
        [5.0, None, 7.0, 8.0],
        [9.0, 10.0, 11.0, None],
        [None, 14.0, 15.0, 16.0]
    ]
}

# Test each endpoint
endpoints = [
    ('Detect Missing Patterns', 'POST', '/missing-data/detect/', data_with_missing),
    ('Impute Missing Data', 'POST', '/missing-data/impute/', {**data_with_missing, 'method': 'mean'}),
    ('Little\'s MCAR Test', 'POST', '/missing-data/little-test/', data_with_missing),
    ('Compare Imputation Methods', 'POST', '/missing-data/compare/', data_with_missing),
    ('Visualize Missing Patterns', 'POST', '/missing-data/visualize/', data_with_missing),
    ('Multiple Imputation', 'POST', '/missing-data/multiple-imputation/', {**data_with_missing, 'n_imputations': 5}),
    ('KNN Imputation', 'POST', '/missing-data/knn/', {**data_with_missing, 'k': 3}),
    ('EM Algorithm Imputation', 'POST', '/missing-data/em/', data_with_missing),
    ('Imputation Methods Info', 'GET', '/missing-data/info/', None)
]

print('\n' + '=' * 70)
print('MISSING DATA ENDPOINTS TEST - FINAL CHECK')
print('=' * 70)

for name, method, url, payload in endpoints:
    try:
        if method == 'GET':
            response = requests.get(f'{BASE_URL}{url}', timeout=5)
        else:
            response = requests.post(f'{BASE_URL}{url}', json=payload, timeout=5)
        
        if response.status_code == 200:
            print(f'✅ {name}: SUCCESS')
            results.append((name, 'SUCCESS'))
        else:
            print(f'❌ {name}: Status {response.status_code}')
            results.append((name, f'FAILED - Status {response.status_code}'))
    except Exception as e:
        print(f'❌ {name}: Error {str(e)[:50]}')
        results.append((name, f'FAILED - {str(e)[:50]}'))

# Summary
print('\n' + '=' * 70)
working = sum(1 for _, status in results if status == 'SUCCESS')
total = len(results)
print(f'RESULTS: {working}/{total} endpoints working ({working/total*100:.1f}%)')

if working == total:
    print('\n🎉 PERFECT! All 9 Missing Data endpoints are now working!')
    print('This category is now 100% functional!')
else:
    print(f'\nStill have {total - working} endpoint(s) to fix:')
    for name, status in results:
        if status != 'SUCCESS':
            print(f'  - {name}: {status}')

print('=' * 70)