"""
Multivariate Analysis Module
=============================

Comprehensive multivariate statistical analysis.

Includes:
- MANOVA (Multivariate Analysis of Variance)
- Canonical Correlation Analysis
- Discriminant Analysis (LDA, QDA)
- Factor Analysis
- Cluster Analysis
- Multidimensional Scaling
- Correspondence Analysis
- Hotelling's T-squared test

Author: StickForStats Development Team
Date: 2025-08-26
Version: 1.0.0
"""

from .multivariate_service import MultivariateService, MultivariateResults

__all__ = ['MultivariateService', 'MultivariateResults']