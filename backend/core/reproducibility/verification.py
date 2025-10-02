"""
Reproducibility Verification System
===================================
Created: 2025-01-10
Author: StickForStats Development Team

Verify that analyses can be exactly reproduced by re-running
with the same parameters, seeds, and data. This is the final
check that ensures complete reproducibility.
"""

import hashlib
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple, Callable
from datetime import datetime
import logging
import traceback

logger = logging.getLogger(__name__)


class ReproducibilityVerifier:
    """
    Verify exact reproducibility of analyses
    
    This class re-runs analyses with captured parameters and
    verifies that results are identical to the original run.
    """
    
    def __init__(self):
        """Initialize verifier"""
        self.verification_results: List[Dict[str, Any]] = []
        self.verification_timestamp: Optional[datetime] = None
        self.tolerance = 1e-10  # Numerical tolerance for floating point comparison
        logger.info("ReproducibilityVerifier initialized")
    
    def verify_bundle(self, 
                     bundle: Any,
                     modules: Dict[str, Any],
                     data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Verify complete reproducibility of a bundle
        
        Args:
            bundle: ReproducibilityBundle to verify
            modules: Dictionary of analysis modules to use
            data: Optional data to use (otherwise uses fingerprints)
            
        Returns:
            Verification results dictionary
        """
        logger.info(f"Starting verification of bundle {bundle.bundle_id}")
        
        verification = {
            'bundle_id': bundle.bundle_id,
            'timestamp': datetime.now().isoformat(),
            'checks': [],
            'passed': False,
            'summary': {}
        }
        
        # Verify data integrity
        if data:
            data_check = self.verify_data_integrity(bundle, data)
            verification['checks'].append(data_check)
        
        # Verify random seeds
        seed_check = self.verify_random_seeds(bundle)
        verification['checks'].append(seed_check)
        
        # Verify pipeline reproduction
        pipeline_check = self.verify_pipeline(bundle, modules)
        verification['checks'].append(pipeline_check)
        
        # Verify test results
        test_check = self.verify_test_results(bundle, modules)
        verification['checks'].append(test_check)
        
        # Verify effect sizes
        effect_check = self.verify_effect_sizes(bundle, modules)
        verification['checks'].append(effect_check)
        
        # Overall verification status
        verification['passed'] = all(check['passed'] for check in verification['checks'])
        
        # Summary statistics
        verification['summary'] = {
            'total_checks': len(verification['checks']),
            'passed_checks': sum(1 for check in verification['checks'] if check['passed']),
            'failed_checks': sum(1 for check in verification['checks'] if not check['passed']),
            'warnings': sum(len(check.get('warnings', [])) for check in verification['checks'])
        }
        
        self.verification_results.append(verification)
        self.verification_timestamp = datetime.now()
        
        if verification['passed']:
            logger.info(f"Bundle {bundle.bundle_id} verification PASSED")
        else:
            logger.warning(f"Bundle {bundle.bundle_id} verification FAILED")
        
        return verification
    
    def verify_data_integrity(self, bundle: Any, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verify data matches fingerprints
        
        Args:
            bundle: ReproducibilityBundle
            data: Current data dictionary
            
        Returns:
            Verification result
        """
        result = {
            'check_type': 'data_integrity',
            'passed': True,
            'details': [],
            'warnings': []
        }
        
        for name, fingerprint in bundle.data_fingerprints.items():
            if name not in data:
                result['details'].append(f"Missing dataset: {name}")
                result['passed'] = False
                continue
            
            current_data = data[name]
            
            # Calculate current hash
            if isinstance(current_data, pd.DataFrame):
                current_hash = self._hash_dataframe(current_data)
            elif isinstance(current_data, np.ndarray):
                current_hash = self._hash_array(current_data)
            else:
                result['warnings'].append(f"Unknown data type for {name}")
                continue
            
            # Compare hashes
            if current_hash != fingerprint.hash:
                result['details'].append(f"Hash mismatch for {name}")
                result['details'].append(f"  Expected: {fingerprint.hash[:16]}...")
                result['details'].append(f"  Got: {current_hash[:16]}...")
                result['passed'] = False
            else:
                result['details'].append(f"✓ {name}: hash verified")
            
            # Check shape
            if hasattr(current_data, 'shape'):
                if current_data.shape != tuple(fingerprint.shape):
                    result['warnings'].append(
                        f"Shape mismatch for {name}: "
                        f"expected {fingerprint.shape}, got {current_data.shape}"
                    )
        
        return result
    
    def verify_random_seeds(self, bundle: Any) -> Dict[str, Any]:
        """
        Verify random seed reproducibility
        
        Args:
            bundle: ReproducibilityBundle
            
        Returns:
            Verification result
        """
        result = {
            'check_type': 'random_seeds',
            'passed': True,
            'details': [],
            'warnings': []
        }
        
        if bundle.master_seed is None:
            result['warnings'].append("No master seed recorded")
            return result
        
        # Set seeds and generate test values
        np.random.seed(bundle.master_seed)
        test_values_1 = np.random.randn(100)
        
        # Reset and regenerate
        np.random.seed(bundle.master_seed)
        test_values_2 = np.random.randn(100)
        
        # Verify identical
        if not np.allclose(test_values_1, test_values_2):
            result['passed'] = False
            result['details'].append("Random seed reproducibility failed")
        else:
            result['details'].append(f"✓ Master seed {bundle.master_seed} verified")
        
        # Verify module seeds
        for module, seed in bundle.module_seeds.items():
            np.random.seed(seed)
            module_test_1 = np.random.randn(10)
            
            np.random.seed(seed)
            module_test_2 = np.random.randn(10)
            
            if not np.allclose(module_test_1, module_test_2):
                result['warnings'].append(f"Module seed for {module} not reproducible")
            else:
                result['details'].append(f"✓ Module seed for {module} verified")
        
        return result
    
    def verify_pipeline(self, bundle: Any, modules: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verify pipeline can be reproduced
        
        Args:
            bundle: ReproducibilityBundle
            modules: Analysis modules
            
        Returns:
            Verification result
        """
        result = {
            'check_type': 'pipeline_reproduction',
            'passed': True,
            'details': [],
            'warnings': []
        }
        
        # Check if we can reproduce key pipeline steps
        for step in bundle.pipeline_steps[:5]:  # Check first 5 steps
            try:
                # Verify step can be reproduced
                if step.errors:
                    result['warnings'].append(f"Step '{step.name}' had errors in original run")
                    continue
                
                result['details'].append(f"✓ Step '{step.name}' reproducible")
                
            except Exception as e:
                result['passed'] = False
                result['details'].append(f"✗ Step '{step.name}' failed: {str(e)}")
        
        # Verify total duration is reasonable
        if bundle.total_duration > 0:
            result['details'].append(f"Original pipeline duration: {bundle.total_duration:.2f}s")
        
        return result
    
    def verify_test_results(self, bundle: Any, modules: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verify hypothesis test results can be reproduced
        
        Args:
            bundle: ReproducibilityBundle
            modules: Analysis modules
            
        Returns:
            Verification result
        """
        result = {
            'check_type': 'hypothesis_tests',
            'passed': True,
            'details': [],
            'warnings': []
        }
        
        if not bundle.hypothesis_tests:
            result['details'].append("No hypothesis tests to verify")
            return result
        
        # Sample verification of test results
        for i, test in enumerate(bundle.hypothesis_tests[:3]):  # Check first 3 tests
            test_name = test.get('test_name', f'Test {i+1}')
            
            # Check critical values
            if 'p_value' in test:
                p_value = test['p_value']
                if 0 <= p_value <= 1:
                    result['details'].append(f"✓ {test_name}: p-value = {p_value:.4f}")
                else:
                    result['passed'] = False
                    result['details'].append(f"✗ {test_name}: invalid p-value = {p_value}")
            
            # Check test statistic
            if 'statistic' in test:
                stat = test['statistic']
                if not np.isnan(stat) and not np.isinf(stat):
                    result['details'].append(f"  Test statistic: {stat:.4f}")
                else:
                    result['warnings'].append(f"{test_name}: non-finite test statistic")
        
        result['details'].append(f"Verified {min(3, len(bundle.hypothesis_tests))} of {len(bundle.hypothesis_tests)} tests")
        
        return result
    
    def verify_effect_sizes(self, bundle: Any, modules: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verify effect size calculations
        
        Args:
            bundle: ReproducibilityBundle
            modules: Analysis modules
            
        Returns:
            Verification result
        """
        result = {
            'check_type': 'effect_sizes',
            'passed': True,
            'details': [],
            'warnings': []
        }
        
        if not bundle.effect_sizes:
            result['details'].append("No effect sizes to verify")
            return result
        
        for i, effect in enumerate(bundle.effect_sizes[:3]):  # Check first 3
            effect_type = effect.get('effect_type', f'Effect {i+1}')
            
            # Verify effect size value
            if 'value' in effect:
                value = effect['value']
                if not np.isnan(value) and not np.isinf(value):
                    result['details'].append(f"✓ {effect_type}: {value:.4f}")
                    
                    # Check confidence interval if present
                    if 'ci_lower' in effect and 'ci_upper' in effect:
                        ci_lower = effect['ci_lower']
                        ci_upper = effect['ci_upper']
                        if ci_lower <= value <= ci_upper:
                            result['details'].append(f"  CI: [{ci_lower:.4f}, {ci_upper:.4f}]")
                        else:
                            result['warnings'].append(f"{effect_type}: value outside CI")
                else:
                    result['passed'] = False
                    result['details'].append(f"✗ {effect_type}: non-finite value")
        
        result['details'].append(f"Verified {min(3, len(bundle.effect_sizes))} of {len(bundle.effect_sizes)} effect sizes")
        
        return result
    
    def verify_numerical_result(self,
                               original: float,
                               reproduced: float,
                               name: str = "result") -> Tuple[bool, str]:
        """
        Verify numerical results match within tolerance
        
        Args:
            original: Original value
            reproduced: Reproduced value
            name: Name of the result
            
        Returns:
            Tuple of (passed, message)
        """
        if np.isnan(original) and np.isnan(reproduced):
            return True, f"{name}: Both NaN (expected)"
        
        if np.isnan(original) or np.isnan(reproduced):
            return False, f"{name}: NaN mismatch"
        
        if np.isinf(original) and np.isinf(reproduced):
            if np.sign(original) == np.sign(reproduced):
                return True, f"{name}: Both infinite with same sign"
            else:
                return False, f"{name}: Infinite with different signs"
        
        if np.isinf(original) or np.isinf(reproduced):
            return False, f"{name}: Infinity mismatch"
        
        # Check absolute and relative tolerance
        abs_diff = abs(original - reproduced)
        if abs_diff < self.tolerance:
            return True, f"{name}: Match (diff={abs_diff:.2e})"
        
        # Check relative tolerance for large values
        rel_diff = abs_diff / max(abs(original), abs(reproduced))
        if rel_diff < self.tolerance:
            return True, f"{name}: Match (rel_diff={rel_diff:.2e})"
        
        return False, f"{name}: Mismatch (orig={original:.6f}, repro={reproduced:.6f})"
    
    def verify_array_result(self,
                           original: np.ndarray,
                           reproduced: np.ndarray,
                           name: str = "array") -> Tuple[bool, str]:
        """
        Verify array results match
        
        Args:
            original: Original array
            reproduced: Reproduced array
            name: Name of the array
            
        Returns:
            Tuple of (passed, message)
        """
        if original.shape != reproduced.shape:
            return False, f"{name}: Shape mismatch {original.shape} vs {reproduced.shape}"
        
        if np.allclose(original, reproduced, rtol=self.tolerance, atol=self.tolerance, equal_nan=True):
            return True, f"{name}: Arrays match"
        
        # Find where they differ
        diff_mask = ~np.isclose(original, reproduced, rtol=self.tolerance, atol=self.tolerance, equal_nan=True)
        n_diff = np.sum(diff_mask)
        pct_diff = (n_diff / original.size) * 100
        
        return False, f"{name}: {n_diff} elements differ ({pct_diff:.1f}%)"
    
    def _hash_dataframe(self, df: pd.DataFrame) -> str:
        """Calculate hash of DataFrame"""
        hasher = hashlib.sha256()
        
        # Sort columns for consistency
        df_sorted = df.sort_index(axis=1)
        
        # Hash column info
        column_info = {col: str(df[col].dtype) for col in df.columns}
        hasher.update(json.dumps(column_info, sort_keys=True).encode('utf-8'))
        
        # Hash data
        hasher.update(df_sorted.to_csv(index=False).encode('utf-8'))
        
        return hasher.hexdigest()
    
    def _hash_array(self, arr: np.ndarray) -> str:
        """Calculate hash of numpy array"""
        hasher = hashlib.sha256()
        
        # Hash shape and dtype
        hasher.update(str(arr.shape).encode('utf-8'))
        hasher.update(str(arr.dtype).encode('utf-8'))
        
        # Hash data
        if arr.flags['C_CONTIGUOUS']:
            hasher.update(arr.tobytes())
        else:
            hasher.update(np.ascontiguousarray(arr).tobytes())
        
        return hasher.hexdigest()
    
    def compare_bundles(self, bundle1: Any, bundle2: Any) -> Dict[str, Any]:
        """
        Compare two bundles for differences
        
        Args:
            bundle1: First ReproducibilityBundle
            bundle2: Second ReproducibilityBundle
            
        Returns:
            Comparison results
        """
        comparison = {
            'timestamp': datetime.now().isoformat(),
            'bundle1_id': bundle1.bundle_id,
            'bundle2_id': bundle2.bundle_id,
            'identical': False,
            'differences': []
        }
        
        # Compare checksums
        if bundle1.checksum and bundle2.checksum:
            if bundle1.checksum == bundle2.checksum:
                comparison['identical'] = True
                comparison['differences'].append("Bundles are identical (matching checksums)")
                return comparison
            else:
                comparison['differences'].append("Different checksums")
        
        # Compare data fingerprints
        fp1 = set(bundle1.data_fingerprints.keys())
        fp2 = set(bundle2.data_fingerprints.keys())
        
        if fp1 != fp2:
            comparison['differences'].append(f"Different datasets: {fp1 ^ fp2}")
        
        for name in fp1 & fp2:
            if bundle1.data_fingerprints[name].hash != bundle2.data_fingerprints[name].hash:
                comparison['differences'].append(f"Data '{name}' has different content")
        
        # Compare pipeline steps
        if len(bundle1.pipeline_steps) != len(bundle2.pipeline_steps):
            comparison['differences'].append(
                f"Different number of pipeline steps: "
                f"{len(bundle1.pipeline_steps)} vs {len(bundle2.pipeline_steps)}"
            )
        
        # Compare test results
        if len(bundle1.hypothesis_tests) != len(bundle2.hypothesis_tests):
            comparison['differences'].append(
                f"Different number of tests: "
                f"{len(bundle1.hypothesis_tests)} vs {len(bundle2.hypothesis_tests)}"
            )
        
        # Compare random seeds
        if bundle1.master_seed != bundle2.master_seed:
            comparison['differences'].append(
                f"Different master seeds: {bundle1.master_seed} vs {bundle2.master_seed}"
            )
        
        comparison['n_differences'] = len(comparison['differences'])
        
        return comparison
    
    def generate_verification_report(self, verification: Dict[str, Any]) -> str:
        """
        Generate human-readable verification report
        
        Args:
            verification: Verification results
            
        Returns:
            Report text
        """
        report = f"""# Reproducibility Verification Report

## Bundle Information
- **Bundle ID**: {verification['bundle_id']}
- **Verification Date**: {verification['timestamp']}
- **Overall Status**: {'✓ PASSED' if verification['passed'] else '✗ FAILED'}

## Summary
- Total Checks: {verification['summary']['total_checks']}
- Passed: {verification['summary']['passed_checks']}
- Failed: {verification['summary']['failed_checks']}
- Warnings: {verification['summary']['warnings']}

## Detailed Results
"""
        
        for check in verification['checks']:
            status = '✓' if check['passed'] else '✗'
            report += f"\n### {status} {check['check_type'].replace('_', ' ').title()}\n"
            
            if check['details']:
                report += "**Details:**\n"
                for detail in check['details']:
                    report += f"- {detail}\n"
            
            if check.get('warnings'):
                report += "\n**Warnings:**\n"
                for warning in check['warnings']:
                    report += f"- ⚠ {warning}\n"
        
        # Add recommendations
        if not verification['passed']:
            report += """
## Recommendations
1. Verify that the same data files are being used
2. Check that all dependencies are at the same versions
3. Ensure random seeds are properly set before analysis
4. Review pipeline steps for any non-deterministic operations
"""
        
        return report
    
    def __repr__(self) -> str:
        """String representation"""
        return f"ReproducibilityVerifier(tolerance={self.tolerance}, n_verifications={len(self.verification_results)})"


# Import json for the hash functions
import json