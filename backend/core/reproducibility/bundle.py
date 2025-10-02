"""
Reproducibility Bundle - Core Container for Analysis Reproducibility
====================================================================
Created: 2025-01-10
Author: StickForStats Development Team

The ReproducibilityBundle is a complete, self-contained snapshot of an
analysis session that can be shared, archived, and re-executed to produce
identical results. This is the cornerstone of reproducible research.

References:
- Peng, R. D. (2011). Reproducible research in computational science. Science.
- Stodden, V., et al. (2016). Enhancing reproducibility for computational methods. Science.
- Wilson, G., et al. (2017). Good enough practices in scientific computing. PLOS Comp Bio.
"""

import uuid
import hashlib
import json
import gzip
import pickle
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass, field, asdict
import numpy as np
import pandas as pd
import platform
import sys
import logging

logger = logging.getLogger(__name__)


@dataclass
class DataFingerprint:
    """Fingerprint of a dataset for verification"""
    name: str
    hash: str  # SHA-256 hash
    shape: Tuple[int, ...]
    dtype: str
    size_bytes: int
    missing_count: int
    missing_pattern: str  # 'random', 'systematic', 'none'
    statistics: Dict[str, float]  # min, max, mean, std, etc.
    created_at: datetime


@dataclass
class PipelineStep:
    """A single step in the analysis pipeline"""
    step_id: str
    name: str
    module: str
    function: str
    timestamp: datetime
    duration: float  # seconds
    input_params: Dict[str, Any]
    output_summary: Dict[str, Any]
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)


@dataclass
class DecisionPoint:
    """A point where an analytical decision was made"""
    decision_id: str
    timestamp: datetime
    decision_type: str  # 'test_selection', 'correction_method', etc.
    options_available: List[str]
    option_chosen: str
    rationale: str
    automated: bool  # Was this decision made automatically?
    confidence: Optional[float] = None


@dataclass
class EnvironmentInfo:
    """System and package environment information"""
    platform: str
    platform_version: str
    python_version: str
    numpy_version: str
    scipy_version: str
    pandas_version: str
    statsmodels_version: Optional[str]
    sklearn_version: Optional[str]
    other_packages: Dict[str, str]
    system_info: Dict[str, Any]
    created_at: datetime


@dataclass
class Citation:
    """Scientific citation for methods used"""
    key: str
    authors: str
    year: int
    title: str
    journal: Optional[str]
    doi: Optional[str]
    url: Optional[str]


@dataclass
class ReproducibilityBundle:
    """
    Complete reproducibility bundle for an analysis session
    
    This bundle contains everything needed to exactly reproduce
    an analysis, including data fingerprints, all parameters,
    the complete pipeline, environment info, and results.
    """
    
    # === Metadata ===
    bundle_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    version: str = "1.5.0"
    created_at: datetime = field(default_factory=datetime.now)
    created_by: str = field(default_factory=lambda: platform.node())
    title: str = "Untitled Analysis"
    description: str = ""
    tags: List[str] = field(default_factory=list)
    
    # === Data Fingerprints ===
    data_fingerprints: Dict[str, DataFingerprint] = field(default_factory=dict)
    original_data_paths: Dict[str, str] = field(default_factory=dict)
    
    # === Analysis Pipeline ===
    pipeline_steps: List[PipelineStep] = field(default_factory=list)
    decision_points: List[DecisionPoint] = field(default_factory=list)
    total_duration: float = 0.0
    
    # === Module States ===
    test_recommender_state: Dict[str, Any] = field(default_factory=dict)
    assumption_checks: List[Dict[str, Any]] = field(default_factory=list)
    hypothesis_tests: List[Dict[str, Any]] = field(default_factory=list)
    corrections_applied: List[Dict[str, Any]] = field(default_factory=list)
    power_analyses: List[Dict[str, Any]] = field(default_factory=list)
    effect_sizes: List[Dict[str, Any]] = field(default_factory=list)
    robust_estimates: List[Dict[str, Any]] = field(default_factory=list)
    
    # === Environment ===
    environment: Optional[EnvironmentInfo] = None
    dependencies: Dict[str, str] = field(default_factory=dict)
    
    # === Random State ===
    master_seed: Optional[int] = None
    module_seeds: Dict[str, int] = field(default_factory=dict)
    random_state_snapshots: Dict[str, Any] = field(default_factory=dict)
    
    # === Results ===
    final_results: Dict[str, Any] = field(default_factory=dict)
    figures: List[Dict[str, Any]] = field(default_factory=list)
    tables: List[pd.DataFrame] = field(default_factory=list)
    
    # === Methods Generation ===
    methods_text: str = ""
    citations: List[Citation] = field(default_factory=list)
    assumptions_stated: List[str] = field(default_factory=list)
    limitations: List[str] = field(default_factory=list)
    
    # === Validation ===
    is_complete: bool = False
    is_validated: bool = False
    validation_errors: List[str] = field(default_factory=list)
    checksum: Optional[str] = None
    
    def __post_init__(self):
        """Initialize bundle after creation"""
        if self.environment is None:
            self.capture_environment()
        
        logger.info(f"Created ReproducibilityBundle {self.bundle_id}")
    
    def capture_environment(self) -> None:
        """Capture current environment information"""
        try:
            import scipy
            scipy_version = scipy.__version__
        except ImportError:
            scipy_version = "not installed"
        
        try:
            import statsmodels
            statsmodels_version = statsmodels.__version__
        except ImportError:
            statsmodels_version = None
        
        try:
            import sklearn
            sklearn_version = sklearn.__version__
        except ImportError:
            sklearn_version = None
        
        self.environment = EnvironmentInfo(
            platform=platform.system(),
            platform_version=platform.version(),
            python_version=sys.version,
            numpy_version=np.__version__,
            scipy_version=scipy_version,
            pandas_version=pd.__version__,
            statsmodels_version=statsmodels_version,
            sklearn_version=sklearn_version,
            other_packages=self._get_installed_packages(),
            system_info={
                'processor': platform.processor(),
                'architecture': platform.architecture(),
                'machine': platform.machine(),
                'node': platform.node()
            },
            created_at=datetime.now()
        )
    
    def _get_installed_packages(self) -> Dict[str, str]:
        """Get list of installed packages"""
        packages = {}
        try:
            import pkg_resources
            for dist in pkg_resources.working_set:
                packages[dist.key] = dist.version
        except:
            logger.warning("Could not retrieve package list")
        return packages
    
    def add_data_fingerprint(self, name: str, data: Union[pd.DataFrame, np.ndarray]) -> None:
        """
        Add a data fingerprint to the bundle
        
        Args:
            name: Name identifier for the data
            data: The data to fingerprint
        """
        if isinstance(data, pd.DataFrame):
            fingerprint = self._fingerprint_dataframe(name, data)
        elif isinstance(data, np.ndarray):
            fingerprint = self._fingerprint_array(name, data)
        else:
            raise TypeError(f"Unsupported data type: {type(data)}")
        
        self.data_fingerprints[name] = fingerprint
        logger.info(f"Added fingerprint for data '{name}': {fingerprint.hash[:8]}...")
    
    def _fingerprint_dataframe(self, name: str, df: pd.DataFrame) -> DataFingerprint:
        """Create fingerprint for a DataFrame"""
        # Sort columns for consistent hashing
        df_sorted = df.sort_index(axis=1)
        
        # Create hash of data
        hasher = hashlib.sha256()
        hasher.update(df_sorted.to_csv(index=False).encode('utf-8'))
        data_hash = hasher.hexdigest()
        
        # Calculate statistics
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            statistics = {
                'n_rows': len(df),
                'n_cols': len(df.columns),
                'n_numeric': len(numeric_cols),
                'mean_overall': df[numeric_cols].mean().mean(),
                'std_overall': df[numeric_cols].std().mean(),
                'missing_pct': (df.isnull().sum().sum() / df.size) * 100
            }
        else:
            statistics = {
                'n_rows': len(df),
                'n_cols': len(df.columns),
                'n_numeric': 0,
                'missing_pct': (df.isnull().sum().sum() / df.size) * 100
            }
        
        # Detect missing pattern
        missing_count = df.isnull().sum().sum()
        if missing_count == 0:
            missing_pattern = 'none'
        elif df.isnull().all(axis=1).any() or df.isnull().all(axis=0).any():
            missing_pattern = 'systematic'
        else:
            missing_pattern = 'random'
        
        return DataFingerprint(
            name=name,
            hash=data_hash,
            shape=df.shape,
            dtype='DataFrame',
            size_bytes=df.memory_usage(deep=True).sum(),
            missing_count=missing_count,
            missing_pattern=missing_pattern,
            statistics=statistics,
            created_at=datetime.now()
        )
    
    def _fingerprint_array(self, name: str, arr: np.ndarray) -> DataFingerprint:
        """Create fingerprint for a numpy array"""
        # Create hash of data
        hasher = hashlib.sha256()
        hasher.update(arr.tobytes())
        data_hash = hasher.hexdigest()
        
        # Calculate statistics
        if np.issubdtype(arr.dtype, np.number):
            statistics = {
                'min': float(np.nanmin(arr)),
                'max': float(np.nanmax(arr)),
                'mean': float(np.nanmean(arr)),
                'std': float(np.nanstd(arr)),
                'median': float(np.nanmedian(arr))
            }
        else:
            statistics = {}
        
        missing_count = np.isnan(arr).sum() if np.issubdtype(arr.dtype, np.number) else 0
        
        return DataFingerprint(
            name=name,
            hash=data_hash,
            shape=arr.shape,
            dtype=str(arr.dtype),
            size_bytes=arr.nbytes,
            missing_count=int(missing_count),
            missing_pattern='none' if missing_count == 0 else 'random',
            statistics=statistics,
            created_at=datetime.now()
        )
    
    def add_pipeline_step(self, step: PipelineStep) -> None:
        """Add a pipeline step to the bundle"""
        self.pipeline_steps.append(step)
        self.total_duration += step.duration
        logger.debug(f"Added pipeline step: {step.name}")
    
    def add_decision_point(self, decision: DecisionPoint) -> None:
        """Add a decision point to the bundle"""
        self.decision_points.append(decision)
        logger.info(f"Recorded decision: {decision.decision_type} -> {decision.option_chosen}")
    
    def add_test_result(self, test_name: str, result: Dict[str, Any]) -> None:
        """Add a hypothesis test result"""
        test_record = {
            'test_name': test_name,
            'timestamp': datetime.now().isoformat(),
            **result
        }
        self.hypothesis_tests.append(test_record)
    
    def add_effect_size(self, effect_type: str, result: Dict[str, Any]) -> None:
        """Add an effect size calculation"""
        effect_record = {
            'effect_type': effect_type,
            'timestamp': datetime.now().isoformat(),
            **result
        }
        self.effect_sizes.append(effect_record)
    
    def set_random_seeds(self, master_seed: int) -> None:
        """Set and record random seeds for reproducibility"""
        self.master_seed = master_seed
        
        # Generate module-specific seeds deterministically
        rng = np.random.RandomState(master_seed)
        modules = [
            'numpy', 'scipy', 'pandas', 'sklearn',
            'test_recommender', 'power_analysis',
            'effect_sizes', 'robust_estimators',
            'bootstrap', 'permutation'
        ]
        
        for module in modules:
            self.module_seeds[module] = int(rng.randint(0, 2**32 - 1))
        
        # Actually set the seeds
        np.random.seed(self.module_seeds['numpy'])
        import random
        random.seed(self.module_seeds['numpy'])
        
        logger.info(f"Set master seed: {master_seed}")
    
    def validate(self) -> bool:
        """
        Validate the bundle for completeness and consistency
        
        Returns:
            True if bundle is valid, False otherwise
        """
        self.validation_errors.clear()
        
        # Check required fields
        if not self.bundle_id:
            self.validation_errors.append("Bundle ID is missing")
        
        if not self.data_fingerprints:
            self.validation_errors.append("No data fingerprints recorded")
        
        if not self.pipeline_steps:
            self.validation_errors.append("No pipeline steps recorded")
        
        if self.master_seed is None:
            self.validation_errors.append("Random seed not set")
        
        if not self.environment:
            self.validation_errors.append("Environment information missing")
        
        # Check pipeline consistency
        if self.pipeline_steps:
            total_duration = sum(step.duration for step in self.pipeline_steps)
            if abs(total_duration - self.total_duration) > 0.001:
                self.validation_errors.append("Pipeline duration mismatch")
        
        # Check for errors in pipeline
        for step in self.pipeline_steps:
            if step.errors:
                self.validation_errors.append(f"Pipeline step '{step.name}' has errors")
        
        self.is_validated = True
        self.is_complete = len(self.validation_errors) == 0
        
        if self.is_complete:
            # Calculate checksum
            self.checksum = self._calculate_checksum()
            logger.info(f"Bundle validated successfully. Checksum: {self.checksum[:8]}...")
        else:
            logger.warning(f"Bundle validation failed with {len(self.validation_errors)} errors")
        
        return self.is_complete
    
    def _calculate_checksum(self) -> str:
        """Calculate checksum for the bundle"""
        hasher = hashlib.sha256()
        
        # Hash key components
        hasher.update(self.bundle_id.encode('utf-8'))
        hasher.update(str(self.master_seed).encode('utf-8'))
        
        for fingerprint in self.data_fingerprints.values():
            hasher.update(fingerprint.hash.encode('utf-8'))
        
        for step in self.pipeline_steps:
            hasher.update(step.step_id.encode('utf-8'))
        
        return hasher.hexdigest()
    
    def get_summary(self) -> Dict[str, Any]:
        """Get a summary of the bundle"""
        return {
            'bundle_id': self.bundle_id,
            'title': self.title,
            'created_at': self.created_at.isoformat(),
            'is_complete': self.is_complete,
            'is_validated': self.is_validated,
            'checksum': self.checksum,
            'statistics': {
                'n_datasets': len(self.data_fingerprints),
                'n_pipeline_steps': len(self.pipeline_steps),
                'n_decisions': len(self.decision_points),
                'n_tests': len(self.hypothesis_tests),
                'n_effect_sizes': len(self.effect_sizes),
                'total_duration': self.total_duration,
                'master_seed': self.master_seed
            },
            'environment': {
                'platform': self.environment.platform if self.environment else None,
                'python_version': self.environment.python_version[:10] if self.environment else None
            }
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert bundle to dictionary for serialization"""
        # Convert dataclasses to dicts
        bundle_dict = asdict(self)
        
        # Convert datetime objects to ISO format strings
        bundle_dict['created_at'] = self.created_at.isoformat()
        
        if self.environment:
            bundle_dict['environment']['created_at'] = \
                self.environment.created_at.isoformat()
        
        # Convert DataFrames to dict format
        if self.tables:
            bundle_dict['tables'] = [
                table.to_dict('records') for table in self.tables
            ]
        
        return bundle_dict
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ReproducibilityBundle':
        """Create bundle from dictionary"""
        # Convert ISO strings back to datetime
        if isinstance(data.get('created_at'), str):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        
        # Reconstruct DataFrames
        if 'tables' in data and data['tables']:
            data['tables'] = [
                pd.DataFrame(table) for table in data['tables']
            ]
        
        return cls(**data)
    
    def __repr__(self) -> str:
        """String representation"""
        return (
            f"ReproducibilityBundle("
            f"id={self.bundle_id[:8]}..., "
            f"title='{self.title}', "
            f"complete={self.is_complete}, "
            f"steps={len(self.pipeline_steps)})"
        )