#!/usr/bin/env python
"""
Temporarily disable authentication for development testing
"""

import os
import glob

# Files to update
files = [
    'ancova_view.py',
    'categorical_views.py',
    'correlation_views.py',
    'missing_data_views.py',
    'nonparametric_views.py',
    'power_views.py',
    'regression_views.py',
    'views.py'
]

for filename in files:
    filepath = filename
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            content = f.read()

        # Add AllowAny import if not present
        if 'AllowAny' not in content:
            content = content.replace(
                'from rest_framework.permissions import IsAuthenticated',
                'from rest_framework.permissions import IsAuthenticated, AllowAny'
            )

        # Replace IsAuthenticated with AllowAny
        content = content.replace('permission_classes = [IsAuthenticated]', 'permission_classes = [AllowAny]')
        content = content.replace('permission_classes=[IsAuthenticated]', 'permission_classes=[AllowAny]')

        with open(filepath, 'w') as f:
            f.write(content)

        print(f"Updated {filename}")

print("Authentication disabled for all API views (development mode)")