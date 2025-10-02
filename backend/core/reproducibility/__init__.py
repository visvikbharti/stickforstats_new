"""
Reproducibility and Provenance Bundle System
============================================
Created: 2025-01-10
Author: StickForStats Development Team
Version: 1.5.0

This package ensures complete reproducibility of statistical analyses
by capturing all data, parameters, decisions, and environment information
in a self-contained bundle that can be shared, archived, and re-executed
to produce identical results.

Key Components:
- ReproducibilityBundle: Main bundle class
- DataFingerprinter: Create verifiable data hashes
- PipelineTracker: Track analysis pipeline
- StateCapture: Capture module states
- SeedManager: Manage random seeds
- MethodsGenerator: Auto-generate methods text
- BundleSerializer: Import/export bundles
- ReproducibilityVerifier: Verify exact reproducibility

Scientific Rigor: MAXIMUM
Purpose: Ensure reproducible research and combat the reproducibility crisis
"""

from .bundle import ReproducibilityBundle
from .fingerprinting import DataFingerprinter
from .pipeline_tracker import PipelineTracker
from .state_capture import StateCapture
from .seed_manager import SeedManager
from .methods_generator import MethodsGenerator
from .serialization import BundleSerializer
from .verification import ReproducibilityVerifier

__all__ = [
    'ReproducibilityBundle',
    'DataFingerprinter',
    'PipelineTracker',
    'StateCapture',
    'SeedManager',
    'MethodsGenerator',
    'BundleSerializer',
    'ReproducibilityVerifier'
]

# Version information
__version__ = '1.5.0'