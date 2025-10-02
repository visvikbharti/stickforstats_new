"""
Data Fingerprinting System for Reproducibility
==============================================
Created: 2025-01-10
Author: StickForStats Development Team

Create unique, verifiable fingerprints of datasets to ensure
data integrity and detect any changes between analysis sessions.
Uses SHA-256 hashing with additional metadata capture.
"""

import hashlib
import json
from typing import Dict, Any, Union, Optional, List, Tuple
from datetime import datetime
import numpy as np
import pandas as pd
import logging

logger = logging.getLogger(__name__)


class DataFingerprinter:
    """
    Create and verify cryptographic fingerprints of datasets
    
    This ensures that the exact same data is used when reproducing
    an analysis. Any change in the data will result in a different
    fingerprint, alerting users to potential reproducibility issues.
    """
    
    def __init__(self, hash_algorithm: str = 'sha256'):
        """
        Initialize fingerprinter
        
        Args:
            hash_algorithm: Hash algorithm to use ('sha256', 'sha512', 'md5')
        """
        self.hash_algorithm = hash_algorithm
        self.fingerprints = {}
        logger.info(f"DataFingerprinter initialized with {hash_algorithm}")
    
    def fingerprint_dataframe(self, 
                            df: pd.DataFrame, 
                            name: Optional[str] = None,
                            include_index: bool = False) -> Dict[str, Any]:
        """
        Create comprehensive fingerprint of a pandas DataFrame
        
        Args:
            df: DataFrame to fingerprint
            name: Optional name for the dataset
            include_index: Whether to include index in hash
            
        Returns:
            Dictionary containing fingerprint and metadata
        """
        name = name or f"dataframe_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Sort columns for consistent hashing
        df_sorted = df.sort_index(axis=1)
        
        # Create hash
        hasher = self._get_hasher()
        
        # Hash column names and types
        column_info = {col: str(df[col].dtype) for col in df.columns}
        hasher.update(json.dumps(column_info, sort_keys=True).encode('utf-8'))
        
        # Hash the data
        if include_index:
            data_str = df_sorted.to_csv(index=True)
        else:
            data_str = df_sorted.to_csv(index=False)
        hasher.update(data_str.encode('utf-8'))
        
        data_hash = hasher.hexdigest()
        
        # Collect metadata
        metadata = self._collect_dataframe_metadata(df)
        
        fingerprint = {
            'name': name,
            'type': 'pandas.DataFrame',
            'hash': data_hash,
            'algorithm': self.hash_algorithm,
            'created_at': datetime.now().isoformat(),
            'shape': df.shape,
            'columns': list(df.columns),
            'dtypes': {col: str(dtype) for col, dtype in df.dtypes.items()},
            'metadata': metadata,
            'include_index': include_index
        }
        
        self.fingerprints[name] = fingerprint
        logger.info(f"Created fingerprint for DataFrame '{name}': {data_hash[:16]}...")
        
        return fingerprint
    
    def fingerprint_array(self,
                         arr: np.ndarray,
                         name: Optional[str] = None) -> Dict[str, Any]:
        """
        Create fingerprint of a numpy array
        
        Args:
            arr: Array to fingerprint
            name: Optional name for the array
            
        Returns:
            Dictionary containing fingerprint and metadata
        """
        name = name or f"array_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Create hash
        hasher = self._get_hasher()
        
        # Hash array properties
        hasher.update(str(arr.shape).encode('utf-8'))
        hasher.update(str(arr.dtype).encode('utf-8'))
        
        # Hash the data
        if arr.flags['C_CONTIGUOUS']:
            hasher.update(arr.tobytes())
        else:
            # Ensure C-contiguous for consistent hashing
            hasher.update(np.ascontiguousarray(arr).tobytes())
        
        data_hash = hasher.hexdigest()
        
        # Collect metadata
        metadata = self._collect_array_metadata(arr)
        
        fingerprint = {
            'name': name,
            'type': 'numpy.ndarray',
            'hash': data_hash,
            'algorithm': self.hash_algorithm,
            'created_at': datetime.now().isoformat(),
            'shape': arr.shape,
            'dtype': str(arr.dtype),
            'metadata': metadata
        }
        
        self.fingerprints[name] = fingerprint
        logger.info(f"Created fingerprint for array '{name}': {data_hash[:16]}...")
        
        return fingerprint
    
    def fingerprint_dict(self,
                        data_dict: Dict[str, Any],
                        name: Optional[str] = None) -> Dict[str, Any]:
        """
        Create fingerprint of a dictionary (e.g., parameters)
        
        Args:
            data_dict: Dictionary to fingerprint
            name: Optional name
            
        Returns:
            Dictionary containing fingerprint
        """
        name = name or f"dict_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Create hash of sorted JSON representation
        hasher = self._get_hasher()
        json_str = json.dumps(data_dict, sort_keys=True, default=str)
        hasher.update(json_str.encode('utf-8'))
        
        data_hash = hasher.hexdigest()
        
        fingerprint = {
            'name': name,
            'type': 'dict',
            'hash': data_hash,
            'algorithm': self.hash_algorithm,
            'created_at': datetime.now().isoformat(),
            'n_keys': len(data_dict)
        }
        
        self.fingerprints[name] = fingerprint
        logger.info(f"Created fingerprint for dict '{name}': {data_hash[:16]}...")
        
        return fingerprint
    
    def verify_dataframe(self,
                        df: pd.DataFrame,
                        fingerprint: Dict[str, Any],
                        strict: bool = True) -> Tuple[bool, List[str]]:
        """
        Verify that a DataFrame matches a fingerprint
        
        Args:
            df: DataFrame to verify
            fingerprint: Previously created fingerprint
            strict: If True, all properties must match exactly
            
        Returns:
            Tuple of (is_valid, list_of_differences)
        """
        differences = []
        
        # Check shape
        if df.shape != tuple(fingerprint['shape']):
            differences.append(f"Shape mismatch: {df.shape} != {tuple(fingerprint['shape'])}")
        
        # Check columns
        if list(df.columns) != fingerprint['columns']:
            differences.append(f"Columns mismatch")
        
        # Check dtypes if strict
        if strict:
            current_dtypes = {col: str(dtype) for col, dtype in df.dtypes.items()}
            if current_dtypes != fingerprint['dtypes']:
                differences.append("Data types mismatch")
        
        # Check hash
        current_fingerprint = self.fingerprint_dataframe(
            df, 
            include_index=fingerprint.get('include_index', False)
        )
        
        if current_fingerprint['hash'] != fingerprint['hash']:
            differences.append(f"Data hash mismatch")
        
        is_valid = len(differences) == 0
        
        if is_valid:
            logger.info(f"DataFrame verification successful for '{fingerprint.get('name', 'unknown')}'")
        else:
            logger.warning(f"DataFrame verification failed with {len(differences)} differences")
        
        return is_valid, differences
    
    def verify_array(self,
                    arr: np.ndarray,
                    fingerprint: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Verify that an array matches a fingerprint
        
        Args:
            arr: Array to verify
            fingerprint: Previously created fingerprint
            
        Returns:
            Tuple of (is_valid, list_of_differences)
        """
        differences = []
        
        # Check shape
        if arr.shape != tuple(fingerprint['shape']):
            differences.append(f"Shape mismatch: {arr.shape} != {tuple(fingerprint['shape'])}")
        
        # Check dtype
        if str(arr.dtype) != fingerprint['dtype']:
            differences.append(f"Dtype mismatch: {arr.dtype} != {fingerprint['dtype']}")
        
        # Check hash
        current_fingerprint = self.fingerprint_array(arr)
        
        if current_fingerprint['hash'] != fingerprint['hash']:
            differences.append("Data hash mismatch")
        
        is_valid = len(differences) == 0
        
        if is_valid:
            logger.info(f"Array verification successful for '{fingerprint.get('name', 'unknown')}'")
        else:
            logger.warning(f"Array verification failed with {len(differences)} differences")
        
        return is_valid, differences
    
    def _get_hasher(self):
        """Get hash object based on algorithm"""
        if self.hash_algorithm == 'sha256':
            return hashlib.sha256()
        elif self.hash_algorithm == 'sha512':
            return hashlib.sha512()
        elif self.hash_algorithm == 'md5':
            return hashlib.md5()
        else:
            raise ValueError(f"Unsupported hash algorithm: {self.hash_algorithm}")
    
    def _collect_dataframe_metadata(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Collect metadata about a DataFrame"""
        metadata = {
            'n_rows': len(df),
            'n_cols': len(df.columns),
            'memory_usage_bytes': int(df.memory_usage(deep=True).sum()),
            'has_missing': df.isnull().any().any(),
            'missing_count': int(df.isnull().sum().sum()),
            'missing_percent': float((df.isnull().sum().sum() / df.size) * 100)
        }
        
        # Add statistics for numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            metadata['numeric_stats'] = {
                'n_numeric_cols': len(numeric_cols),
                'mean_overall': float(df[numeric_cols].mean().mean()),
                'std_overall': float(df[numeric_cols].std().mean()),
                'min_overall': float(df[numeric_cols].min().min()),
                'max_overall': float(df[numeric_cols].max().max())
            }
        
        # Add info about categorical columns
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns
        if len(categorical_cols) > 0:
            metadata['categorical_stats'] = {
                'n_categorical_cols': len(categorical_cols),
                'unique_counts': {
                    col: df[col].nunique() for col in categorical_cols
                }
            }
        
        return metadata
    
    def _collect_array_metadata(self, arr: np.ndarray) -> Dict[str, Any]:
        """Collect metadata about an array"""
        metadata = {
            'size': arr.size,
            'nbytes': arr.nbytes,
            'ndim': arr.ndim,
            'is_c_contiguous': arr.flags['C_CONTIGUOUS'],
            'is_f_contiguous': arr.flags['F_CONTIGUOUS']
        }
        
        # Add statistics for numeric arrays
        if np.issubdtype(arr.dtype, np.number):
            metadata['stats'] = {
                'min': float(np.nanmin(arr)) if arr.size > 0 else None,
                'max': float(np.nanmax(arr)) if arr.size > 0 else None,
                'mean': float(np.nanmean(arr)) if arr.size > 0 else None,
                'std': float(np.nanstd(arr)) if arr.size > 0 else None,
                'has_nan': bool(np.isnan(arr).any()),
                'nan_count': int(np.isnan(arr).sum())
            }
        
        return metadata
    
    def compare_fingerprints(self,
                            fp1: Dict[str, Any],
                            fp2: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compare two fingerprints and report differences
        
        Args:
            fp1: First fingerprint
            fp2: Second fingerprint
            
        Returns:
            Dictionary describing differences
        """
        comparison = {
            'identical': fp1['hash'] == fp2['hash'],
            'same_type': fp1['type'] == fp2['type'],
            'same_shape': fp1.get('shape') == fp2.get('shape'),
            'hash_match': fp1['hash'] == fp2['hash'],
            'differences': []
        }
        
        if fp1['type'] != fp2['type']:
            comparison['differences'].append(f"Type: {fp1['type']} vs {fp2['type']}")
        
        if fp1.get('shape') != fp2.get('shape'):
            comparison['differences'].append(f"Shape: {fp1.get('shape')} vs {fp2.get('shape')}")
        
        if fp1['hash'] != fp2['hash']:
            comparison['differences'].append("Data content differs")
        
        # Compare metadata if available
        if 'metadata' in fp1 and 'metadata' in fp2:
            meta1 = fp1['metadata']
            meta2 = fp2['metadata']
            
            if meta1.get('n_rows') != meta2.get('n_rows'):
                comparison['differences'].append(
                    f"Row count: {meta1.get('n_rows')} vs {meta2.get('n_rows')}"
                )
            
            if meta1.get('missing_count') != meta2.get('missing_count'):
                comparison['differences'].append(
                    f"Missing values: {meta1.get('missing_count')} vs {meta2.get('missing_count')}"
                )
        
        return comparison
    
    def export_fingerprints(self) -> Dict[str, Any]:
        """Export all fingerprints for storage"""
        return {
            'algorithm': self.hash_algorithm,
            'created_at': datetime.now().isoformat(),
            'fingerprints': self.fingerprints
        }
    
    def import_fingerprints(self, data: Dict[str, Any]) -> None:
        """Import fingerprints from storage"""
        self.hash_algorithm = data.get('algorithm', 'sha256')
        self.fingerprints = data.get('fingerprints', {})
        logger.info(f"Imported {len(self.fingerprints)} fingerprints")