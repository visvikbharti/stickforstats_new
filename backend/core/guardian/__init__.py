"""
Guardian Module - Statistical Assumption Validation System
=========================================================

The Guardian is the scientific core of StickForStats, ensuring all statistical
results come with proper assumption context.

Design Contract Requirements:
- "No statistical result may exist without an explicit, traceable assumption context."
- Guardian must be invoked BEFORE any statistical computation
- Results must ALWAYS include GuardianReport

Exports:
- GuardianCore: Main Guardian class for assumption checking
- GuardianReport: Report dataclass with validation results
- AssumptionViolation: Individual violation details
- GuardianServiceWrapper: Service integration wrapper
- GuardianEnrichedResult: Result container with Guardian context
- guardian_protected: Decorator for automatic Guardian integration
- GuardianIntegratedService: Base class for Guardian-aware services
"""

from .guardian_core import (
    GuardianCore,
    GuardianReport,
    AssumptionViolation,
    NormalityValidator,
    VarianceHomogeneityValidator,
    IndependenceValidator,
    OutlierDetector,
    SampleSizeValidator,
    ModalityDetector,
    LinearityValidator,
    HomoscedasticityValidator,
    SEVERITY_WEIGHTS
)

from .service_integration import (
    GuardianServiceWrapper,
    GuardianEnrichedResult,
    GuardianIntegratedService,
    guardian_protected,
    resolve_test_type,
    TEST_TYPE_ALIASES
)

__all__ = [
    # Core classes
    'GuardianCore',
    'GuardianReport',
    'AssumptionViolation',

    # Validators
    'NormalityValidator',
    'VarianceHomogeneityValidator',
    'IndependenceValidator',
    'OutlierDetector',
    'SampleSizeValidator',
    'ModalityDetector',
    'LinearityValidator',
    'HomoscedasticityValidator',

    # Constants
    'SEVERITY_WEIGHTS',

    # Service integration
    'GuardianServiceWrapper',
    'GuardianEnrichedResult',
    'GuardianIntegratedService',
    'guardian_protected',
    'resolve_test_type',
    'TEST_TYPE_ALIASES'
]
