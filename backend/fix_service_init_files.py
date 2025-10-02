#!/usr/bin/env python3
"""
Fix all missing service imports in __init__.py files.
This will ensure all services can be imported from their parent packages.
"""
import os
import re
from pathlib import Path

# Map of service directories to their main class
SERVICE_CLASS_MAP = {
    'guidance': 'GuidanceService',
    'report': 'ReportService',
    'visualization': 'VisualizationService',
    'anova': 'AdvancedANOVAService',
    'dataset': 'DatasetService',
    'cache': 'CacheService',
    'audit': 'AuditService',
    'test_selection': 'TestSelectionService',
}

def fix_service_init_files():
    """Fix all service __init__.py files."""
    base_dir = Path('/Users/vishalbharti/StickForStats_v1.0_Production/backend/core/services')
    fixes = []

    for service_dir, class_name in SERVICE_CLASS_MAP.items():
        service_path = base_dir / service_dir
        init_file = service_path / '__init__.py'

        if service_path.exists():
            # Find the service file
            service_file = None
            for py_file in service_path.glob('*.py'):
                if py_file.name != '__init__.py':
                    content = py_file.read_text()
                    if f'class {class_name}' in content:
                        service_file = py_file.stem
                        break

            if not service_file:
                # Use default naming convention
                service_file = f'{service_dir}_service'

            # Write the __init__.py file
            init_content = f"""from .{service_file} import {class_name}

__all__ = ['{class_name}']"""

            init_file.write_text(init_content)
            fixes.append(f"Fixed {init_file}: importing {class_name} from {service_file}")

    return fixes

if __name__ == '__main__':
    print("Fixing service __init__.py files...")
    fixes = fix_service_init_files()

    for fix in fixes:
        print(f"  ✓ {fix}")

    print(f"\nFixed {len(fixes)} __init__.py files")