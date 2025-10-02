#!/usr/bin/env python3
"""
Fix Import Script
=================
Fixes all occurrences of 'from stickforstats.core' to 'from core'
Following Working Principle #4: Evidence-Based
Following Working Principle #7: Strategic Approach
"""

import os
import re
import sys

def fix_imports_in_file(filepath):
    """Fix imports in a single file."""
    changes_made = []

    try:
        with open(filepath, 'r') as f:
            content = f.read()

        original_content = content

        # Pattern to match problematic imports
        patterns = [
            (r'from stickforstats\.core\.', 'from core.'),
            (r'import stickforstats\.core\.', 'import core.')
        ]

        for pattern, replacement in patterns:
            if re.search(pattern, content):
                matches = re.findall(pattern + r'.*', content)
                for match in matches:
                    changes_made.append(f"  - {match.strip()}")
                content = re.sub(pattern, replacement, content)

        if content != original_content:
            with open(filepath, 'w') as f:
                f.write(content)
            return True, changes_made
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False, []

    return False, []

def main():
    """Main function to fix all import issues."""
    print("=" * 70)
    print("FIXING IMPORT ISSUES IN STICKFORSTATS")
    print("=" * 70)

    # List of files identified with problematic imports
    files_to_fix = [
        'core/api/workflow_navigation_views.py',
        'core/services/visualization/visualization_service.py',
        'core/services/auth/auth_service.py',
        'core/services/profiling_service.py',
        'core/services/data_processing/statistical_utils.py',
        'core/services/workflow/workflow_service.py',
        'core/services/report/report_service.py',
        'core/services/analytics/machine_learning/ml_service.py',
        'core/services/analytics/time_series/time_series_service.py',
        'core/services/analytics/bayesian/bayesian_service.py',
        'core/services/session/session_service.py',
        'sqc_analysis/api/views.py',
        'sqc_analysis/api/serializers.py',
        'sqc_analysis/consumers.py',
        'sqc_analysis/models.py',
        'sqc_analysis/tasks.py',
        'doe_analysis/api/views.py',
        'doe_analysis/api/serializers.py',
        'doe_analysis/models.py'
    ]

    fixed_count = 0
    total_changes = []

    for filepath in files_to_fix:
        full_path = os.path.join(os.path.dirname(__file__), filepath)
        if os.path.exists(full_path):
            fixed, changes = fix_imports_in_file(full_path)
            if fixed:
                print(f"✅ Fixed: {filepath}")
                for change in changes:
                    print(change)
                    total_changes.append(change)
                fixed_count += 1
            else:
                if changes:
                    print(f"❌ Failed: {filepath}")
                # else: no changes needed
        else:
            print(f"⚠️  Not found: {filepath}")

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Files fixed: {fixed_count}/{len(files_to_fix)}")
    print(f"Total import lines changed: {len(total_changes)}")

    if fixed_count > 0:
        print("\n✅ Import fixes completed successfully!")
        print("Next step: Restart server and test ANCOVA endpoint")
    else:
        print("\n⚠️ No files were fixed. They may already be correct.")

    return 0 if fixed_count > 0 else 1

if __name__ == "__main__":
    sys.exit(main())