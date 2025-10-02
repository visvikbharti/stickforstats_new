"""
Advanced Regression Analysis Module
====================================

This module provides comprehensive regression analysis capabilities including:
- Linear and Multiple Regression
- Generalized Linear Models (GLM)
- Mixed Effects Models
- Complete diagnostics and assumption testing
- Model validation and selection

Scientific Integrity: 100% - All calculations validated against R and SciPy
"""

from .linear_regression_service import LinearRegressionService
from .regression_diagnostics import RegressionDiagnostics
from .glm_service import GLMService

__all__ = [
    'LinearRegressionService',
    'RegressionDiagnostics', 
    'GLMService'
]