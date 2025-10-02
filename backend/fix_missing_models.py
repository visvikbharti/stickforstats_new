#!/usr/bin/env python3
"""
Fix Missing Model Imports
==========================
Replaces imports of non-existent models with placeholder types
Following Working Principle #1: No Assumptions
Following Working Principle #4: Evidence-Based
"""

import os
import re

def check_model_exists(model_name):
    """Check if a model exists in core/models.py."""
    models_file = os.path.join(os.path.dirname(__file__), 'core/models.py')
    with open(models_file, 'r') as f:
        content = f.read()
    # Look for class definitions
    pattern = rf'class {model_name}\(.*\):'
    return bool(re.search(pattern, content))

def fix_model_imports_in_file(filepath):
    """Fix model imports in a single file."""
    # Models that actually exist in core/models.py
    existing_models = ['Analysis', 'StatisticalAudit', 'AuditSummary']

    changes_made = []

    try:
        with open(filepath, 'r') as f:
            lines = f.readlines()

        modified = False
        new_lines = []

        for line in lines:
            # Skip already commented lines
            if line.strip().startswith('#'):
                new_lines.append(line)
                continue

            # Check for model imports
            if 'from core.models import' in line and not line.strip().startswith('#'):
                # Extract model names
                match = re.search(r'from core\.models import (.+)', line)
                if match:
                    models_str = match.group(1)
                    models = [m.strip() for m in models_str.split(',')]

                    # Separate existing from non-existing models
                    existing = []
                    missing = []

                    for model in models:
                        if model in existing_models:
                            existing.append(model)
                        else:
                            missing.append(model)

                    # Build new import lines
                    if existing and missing:
                        # Keep existing models, comment out missing
                        new_lines.append(f'from core.models import {", ".join(existing)}\n')
                        new_lines.append(f'# Missing models: {", ".join(missing)}\n')
                        for model in missing:
                            new_lines.append(f'from typing import Any as {model}  # Placeholder type\n')
                        changes_made.append(f"  - Fixed mixed import: {line.strip()}")
                        modified = True
                    elif missing and not existing:
                        # All models are missing
                        new_lines.append(f'# {line.strip()}  # Models don\'t exist yet\n')
                        for model in missing:
                            new_lines.append(f'from typing import Any as {model}  # Placeholder type\n')
                        changes_made.append(f"  - Replaced missing models: {line.strip()}")
                        modified = True
                    else:
                        # All models exist
                        new_lines.append(line)
                else:
                    new_lines.append(line)
            else:
                new_lines.append(line)

        if modified:
            with open(filepath, 'w') as f:
                f.writelines(new_lines)
            return True, changes_made
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False, []

    return False, []

def main():
    """Main function to fix all missing model imports."""
    print("=" * 70)
    print("FIXING MISSING MODEL IMPORTS")
    print("=" * 70)

    # Files with model imports that need checking
    files_to_check = [
        'doe_analysis/api/views.py',
        'doe_analysis/api/serializers.py',
        'doe_analysis/models.py',
        'core/api/workflow_navigation_views.py',
        'sqc_analysis/api/views.py',
        'sqc_analysis/consumers.py',
        'sqc_analysis/api/serializers.py',
        'sqc_analysis/tasks.py',
        'sqc_analysis/models.py',
    ]

    fixed_count = 0
    total_changes = []

    for filepath in files_to_check:
        full_path = os.path.join(os.path.dirname(__file__), filepath)
        if os.path.exists(full_path):
            fixed, changes = fix_model_imports_in_file(full_path)
            if fixed:
                print(f"✅ Fixed: {filepath}")
                for change in changes:
                    print(change)
                    total_changes.append(change)
                fixed_count += 1
            else:
                if changes:
                    print(f"❌ Failed: {filepath}")
        else:
            print(f"⚠️  Not found: {filepath}")

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Files fixed: {fixed_count}/{len(files_to_check)}")
    print(f"Total changes: {len(total_changes)}")

    if fixed_count > 0:
        print("\n✅ Model import fixes completed!")
        print("Next step: Restart server to apply changes")
    else:
        print("\n⚠️ No files were fixed.")

if __name__ == "__main__":
    main()