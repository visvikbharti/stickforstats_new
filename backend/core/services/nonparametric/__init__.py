"""
Non-parametric Statistical Tests Module
========================================

Distribution-free statistical tests for when parametric assumptions are not met.

Includes:
- Mann-Whitney U test
- Wilcoxon signed-rank test
- Kruskal-Wallis test
- Friedman test
- Sign test
- Runs test
- And more

Author: StickForStats Development Team
Date: 2025-08-26
Version: 1.0.0
"""

from .nonparametric_service import NonParametricService

__all__ = ['NonParametricService']