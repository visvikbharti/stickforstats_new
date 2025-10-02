"""
Bundle Serialization System for Import/Export
=============================================
Created: 2025-01-10
Author: StickForStats Development Team

Handle serialization, compression, and export of reproducibility
bundles in various formats. Supports JSON, compressed archives,
and binary formats for efficient storage and sharing.
"""

import json
import gzip
import pickle
import zipfile
import tarfile
import hashlib
import base64
from pathlib import Path
from typing import Dict, Any, Optional, Union, List, BinaryIO
from datetime import datetime
import numpy as np
import pandas as pd
import logging
import io

logger = logging.getLogger(__name__)


class BundleSerializer:
    """
    Serialize and deserialize reproducibility bundles
    
    Supports multiple formats and compression options for
    efficient storage and transmission of analysis bundles.
    """
    
    # Supported formats
    FORMATS = {
        'json': 'JavaScript Object Notation (human-readable)',
        'json.gz': 'Compressed JSON',
        'pickle': 'Python pickle format (binary)',
        'pickle.gz': 'Compressed pickle',
        'zip': 'ZIP archive with structured contents',
        'tar.gz': 'Compressed TAR archive'
    }
    
    def __init__(self):
        """Initialize serializer"""
        self.compression_level = 9  # Maximum compression
        self.include_raw_data = False  # Whether to include raw data in exports
        self.max_data_size = 100 * 1024 * 1024  # 100MB limit for raw data
        logger.info("BundleSerializer initialized")
    
    def export_bundle(self,
                     bundle: Any,
                     filepath: Union[str, Path],
                     format: str = 'json.gz',
                     include_data: bool = False,
                     password: Optional[str] = None) -> bool:
        """
        Export reproducibility bundle to file
        
        Args:
            bundle: ReproducibilityBundle instance
            filepath: Output file path
            format: Export format (json, json.gz, pickle, pickle.gz, zip, tar.gz)
            include_data: Whether to include raw data (if available)
            password: Optional password for encryption (ZIP only)
            
        Returns:
            True if successful, False otherwise
        """
        filepath = Path(filepath)
        
        try:
            # Validate bundle first
            if not bundle.validate():
                logger.warning("Bundle validation failed, exporting anyway")
            
            # Convert bundle to serializable format
            bundle_data = self._prepare_bundle_data(bundle, include_data)
            
            # Export based on format
            if format == 'json':
                self._export_json(bundle_data, filepath)
            elif format == 'json.gz':
                self._export_json_gz(bundle_data, filepath)
            elif format == 'pickle':
                self._export_pickle(bundle_data, filepath)
            elif format == 'pickle.gz':
                self._export_pickle_gz(bundle_data, filepath)
            elif format == 'zip':
                self._export_zip(bundle_data, filepath, password)
            elif format == 'tar.gz':
                self._export_tar_gz(bundle_data, filepath)
            else:
                raise ValueError(f"Unsupported format: {format}")
            
            # Calculate file size
            file_size = filepath.stat().st_size
            logger.info(f"Exported bundle to {filepath} ({self._format_size(file_size)}) as {format}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to export bundle: {e}")
            return False
    
    def import_bundle(self,
                     filepath: Union[str, Path],
                     format: Optional[str] = None,
                     password: Optional[str] = None) -> Optional[Any]:
        """
        Import reproducibility bundle from file
        
        Args:
            filepath: Input file path
            format: Format (auto-detected if None)
            password: Password for encrypted files
            
        Returns:
            ReproducibilityBundle instance or None if failed
        """
        filepath = Path(filepath)
        
        if not filepath.exists():
            logger.error(f"File not found: {filepath}")
            return None
        
        try:
            # Auto-detect format if not specified
            if format is None:
                format = self._detect_format(filepath)
            
            # Import based on format
            if format == 'json':
                bundle_data = self._import_json(filepath)
            elif format == 'json.gz':
                bundle_data = self._import_json_gz(filepath)
            elif format == 'pickle':
                bundle_data = self._import_pickle(filepath)
            elif format == 'pickle.gz':
                bundle_data = self._import_pickle_gz(filepath)
            elif format == 'zip':
                bundle_data = self._import_zip(filepath, password)
            elif format == 'tar.gz':
                bundle_data = self._import_tar_gz(filepath)
            else:
                raise ValueError(f"Unsupported format: {format}")
            
            # Reconstruct bundle
            bundle = self._reconstruct_bundle(bundle_data)
            
            logger.info(f"Imported bundle from {filepath} (format: {format})")
            return bundle
            
        except Exception as e:
            logger.error(f"Failed to import bundle: {e}")
            return None
    
    def _prepare_bundle_data(self, bundle: Any, include_data: bool) -> Dict[str, Any]:
        """Prepare bundle data for serialization"""
        # Get basic bundle data
        bundle_data = bundle.to_dict()
        
        # Add serialization metadata
        bundle_data['_serialization'] = {
            'version': '1.0',
            'timestamp': datetime.now().isoformat(),
            'format_version': bundle.version,
            'includes_raw_data': include_data
        }
        
        # Optionally include raw data
        if include_data and hasattr(bundle, 'raw_data'):
            bundle_data['raw_data'] = self._serialize_raw_data(bundle.raw_data)
        
        # Convert numpy arrays and pandas objects
        bundle_data = self._convert_special_types(bundle_data)
        
        return bundle_data
    
    def _convert_special_types(self, obj: Any) -> Any:
        """Convert special types (numpy, pandas) to serializable format"""
        if isinstance(obj, np.ndarray):
            return {
                '_type': 'numpy.ndarray',
                'data': obj.tolist(),
                'dtype': str(obj.dtype),
                'shape': obj.shape
            }
        elif isinstance(obj, pd.DataFrame):
            return {
                '_type': 'pandas.DataFrame',
                'data': obj.to_dict('records'),
                'columns': list(obj.columns),
                'index': obj.index.tolist()
            }
        elif isinstance(obj, pd.Series):
            return {
                '_type': 'pandas.Series',
                'data': obj.tolist(),
                'name': obj.name,
                'index': obj.index.tolist()
            }
        elif isinstance(obj, dict):
            return {k: self._convert_special_types(v) for k, v in obj.items()}
        elif isinstance(obj, (list, tuple)):
            return [self._convert_special_types(item) for item in obj]
        elif isinstance(obj, datetime):
            return {
                '_type': 'datetime',
                'value': obj.isoformat()
            }
        else:
            return obj
    
    def _reconstruct_special_types(self, obj: Any) -> Any:
        """Reconstruct special types from serialized format"""
        if isinstance(obj, dict):
            if '_type' in obj:
                if obj['_type'] == 'numpy.ndarray':
                    arr = np.array(obj['data'], dtype=obj['dtype'])
                    return arr.reshape(obj['shape'])
                elif obj['_type'] == 'pandas.DataFrame':
                    return pd.DataFrame(obj['data'], columns=obj['columns'])
                elif obj['_type'] == 'pandas.Series':
                    return pd.Series(obj['data'], name=obj['name'])
                elif obj['_type'] == 'datetime':
                    return datetime.fromisoformat(obj['value'])
            else:
                return {k: self._reconstruct_special_types(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._reconstruct_special_types(item) for item in obj]
        else:
            return obj
    
    def _serialize_raw_data(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Serialize raw data with size limits"""
        serialized = {}
        total_size = 0
        
        for key, data in raw_data.items():
            # Estimate size
            if isinstance(data, pd.DataFrame):
                size = data.memory_usage(deep=True).sum()
            elif isinstance(data, np.ndarray):
                size = data.nbytes
            else:
                size = len(pickle.dumps(data))
            
            if total_size + size > self.max_data_size:
                logger.warning(f"Skipping {key} due to size limit")
                serialized[key] = {
                    '_type': 'skipped',
                    'reason': 'size_limit',
                    'size': size
                }
            else:
                serialized[key] = self._convert_special_types(data)
                total_size += size
        
        return serialized
    
    # JSON export/import methods
    def _export_json(self, data: Dict[str, Any], filepath: Path) -> None:
        """Export as JSON"""
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2, default=str)
    
    def _export_json_gz(self, data: Dict[str, Any], filepath: Path) -> None:
        """Export as compressed JSON"""
        json_str = json.dumps(data, indent=2, default=str)
        with gzip.open(filepath, 'wt', compresslevel=self.compression_level) as f:
            f.write(json_str)
    
    def _import_json(self, filepath: Path) -> Dict[str, Any]:
        """Import from JSON"""
        with open(filepath, 'r') as f:
            return json.load(f)
    
    def _import_json_gz(self, filepath: Path) -> Dict[str, Any]:
        """Import from compressed JSON"""
        with gzip.open(filepath, 'rt') as f:
            return json.load(f)
    
    # Pickle export/import methods
    def _export_pickle(self, data: Dict[str, Any], filepath: Path) -> None:
        """Export as pickle"""
        with open(filepath, 'wb') as f:
            pickle.dump(data, f, protocol=pickle.HIGHEST_PROTOCOL)
    
    def _export_pickle_gz(self, data: Dict[str, Any], filepath: Path) -> None:
        """Export as compressed pickle"""
        with gzip.open(filepath, 'wb', compresslevel=self.compression_level) as f:
            pickle.dump(data, f, protocol=pickle.HIGHEST_PROTOCOL)
    
    def _import_pickle(self, filepath: Path) -> Dict[str, Any]:
        """Import from pickle"""
        with open(filepath, 'rb') as f:
            return pickle.load(f)
    
    def _import_pickle_gz(self, filepath: Path) -> Dict[str, Any]:
        """Import from compressed pickle"""
        with gzip.open(filepath, 'rb') as f:
            return pickle.load(f)
    
    # Archive export/import methods
    def _export_zip(self, data: Dict[str, Any], filepath: Path, 
                   password: Optional[str] = None) -> None:
        """Export as ZIP archive"""
        with zipfile.ZipFile(filepath, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Set password if provided
            if password:
                zf.setpassword(password.encode('utf-8'))
            
            # Main bundle data
            bundle_json = json.dumps(data, indent=2, default=str)
            zf.writestr('bundle.json', bundle_json)
            
            # Add metadata file
            metadata = {
                'created_at': datetime.now().isoformat(),
                'version': data.get('version', '1.5.0'),
                'bundle_id': data.get('bundle_id', 'unknown'),
                'checksum': hashlib.sha256(bundle_json.encode()).hexdigest()
            }
            zf.writestr('metadata.json', json.dumps(metadata, indent=2))
            
            # Add methods text if available
            if 'methods_text' in data:
                zf.writestr('methods.md', data['methods_text'])
            
            # Add README
            readme = self._generate_readme(data)
            zf.writestr('README.md', readme)
    
    def _export_tar_gz(self, data: Dict[str, Any], filepath: Path) -> None:
        """Export as compressed TAR archive"""
        with tarfile.open(filepath, 'w:gz') as tf:
            # Create in-memory files
            bundle_json = json.dumps(data, indent=2, default=str).encode('utf-8')
            self._add_to_tar(tf, 'bundle.json', bundle_json)
            
            # Add metadata
            metadata = {
                'created_at': datetime.now().isoformat(),
                'version': data.get('version', '1.5.0'),
                'bundle_id': data.get('bundle_id', 'unknown')
            }
            metadata_json = json.dumps(metadata, indent=2).encode('utf-8')
            self._add_to_tar(tf, 'metadata.json', metadata_json)
            
            # Add methods text
            if 'methods_text' in data:
                self._add_to_tar(tf, 'methods.md', data['methods_text'].encode('utf-8'))
    
    def _add_to_tar(self, tf: tarfile.TarFile, name: str, data: bytes) -> None:
        """Add data to TAR file"""
        info = tarfile.TarInfo(name=name)
        info.size = len(data)
        info.mtime = datetime.now().timestamp()
        tf.addfile(info, io.BytesIO(data))
    
    def _import_zip(self, filepath: Path, password: Optional[str] = None) -> Dict[str, Any]:
        """Import from ZIP archive"""
        with zipfile.ZipFile(filepath, 'r') as zf:
            if password:
                zf.setpassword(password.encode('utf-8'))
            
            # Read main bundle data
            with zf.open('bundle.json') as f:
                return json.load(f)
    
    def _import_tar_gz(self, filepath: Path) -> Dict[str, Any]:
        """Import from compressed TAR archive"""
        with tarfile.open(filepath, 'r:gz') as tf:
            # Extract bundle.json
            bundle_member = tf.getmember('bundle.json')
            f = tf.extractfile(bundle_member)
            if f:
                return json.load(f)
            else:
                raise ValueError("bundle.json not found in archive")
    
    def _detect_format(self, filepath: Path) -> str:
        """Auto-detect file format"""
        suffix = filepath.suffix.lower()
        name = filepath.name.lower()
        
        if name.endswith('.json.gz'):
            return 'json.gz'
        elif name.endswith('.pickle.gz'):
            return 'pickle.gz'
        elif name.endswith('.tar.gz'):
            return 'tar.gz'
        elif suffix == '.json':
            return 'json'
        elif suffix == '.pickle' or suffix == '.pkl':
            return 'pickle'
        elif suffix == '.zip':
            return 'zip'
        elif suffix == '.gz':
            # Try to detect based on content
            with gzip.open(filepath, 'rb') as f:
                header = f.read(10)
                if b'{' in header:  # Likely JSON
                    return 'json.gz'
                else:
                    return 'pickle.gz'
        else:
            # Try to read as JSON
            try:
                with open(filepath, 'r') as f:
                    json.load(f)
                return 'json'
            except:
                return 'pickle'
    
    def _reconstruct_bundle(self, data: Dict[str, Any]) -> Any:
        """Reconstruct ReproducibilityBundle from data"""
        # Import the bundle class
        from .bundle import ReproducibilityBundle
        
        # Reconstruct special types
        data = self._reconstruct_special_types(data)
        
        # Remove serialization metadata
        if '_serialization' in data:
            del data['_serialization']
        
        # Create bundle instance
        return ReproducibilityBundle.from_dict(data)
    
    def _generate_readme(self, data: Dict[str, Any]) -> str:
        """Generate README for archive"""
        readme = f"""# StickForStats Reproducibility Bundle

## Bundle Information
- **Bundle ID**: {data.get('bundle_id', 'unknown')}
- **Created**: {data.get('created_at', 'unknown')}
- **Version**: {data.get('version', '1.5.0')}
- **Title**: {data.get('title', 'Untitled Analysis')}

## Description
{data.get('description', 'No description provided.')}

## Contents
- `bundle.json`: Complete analysis bundle data
- `metadata.json`: Bundle metadata and checksums
- `methods.md`: Auto-generated methods section (if available)
- `README.md`: This file

## Usage
To import this bundle:
```python
from stickforstats.reproducibility import BundleSerializer
serializer = BundleSerializer()
bundle = serializer.import_bundle('path/to/bundle.zip')
```

## Verification
The bundle includes checksums to verify data integrity.
Use the ReproducibilityVerifier to confirm exact reproducibility.

## License
This bundle is part of StickForStats v1.5.0
Created for reproducible scientific research.
"""
        return readme
    
    def _format_size(self, size_bytes: int) -> str:
        """Format file size in human-readable format"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"
    
    def validate_bundle_file(self, filepath: Union[str, Path]) -> Dict[str, Any]:
        """
        Validate a bundle file without fully loading it
        
        Args:
            filepath: Path to bundle file
            
        Returns:
            Validation results dictionary
        """
        filepath = Path(filepath)
        results = {
            'valid': False,
            'file_exists': filepath.exists(),
            'file_size': 0,
            'format': None,
            'errors': []
        }
        
        if not filepath.exists():
            results['errors'].append('File does not exist')
            return results
        
        # Get file size
        results['file_size'] = filepath.stat().st_size
        
        try:
            # Detect format
            format = self._detect_format(filepath)
            results['format'] = format
            
            # Try to load metadata only
            if format in ['zip']:
                with zipfile.ZipFile(filepath, 'r') as zf:
                    if 'metadata.json' in zf.namelist():
                        with zf.open('metadata.json') as f:
                            metadata = json.load(f)
                            results['metadata'] = metadata
                            results['valid'] = True
            else:
                # For other formats, try minimal import
                bundle = self.import_bundle(filepath, format)
                if bundle:
                    results['valid'] = True
                    results['bundle_id'] = bundle.bundle_id
                    results['checksum'] = bundle.checksum
        
        except Exception as e:
            results['errors'].append(str(e))
        
        return results
    
    def __repr__(self) -> str:
        """String representation"""
        return f"BundleSerializer(compression={self.compression_level}, max_size={self.max_data_size})"