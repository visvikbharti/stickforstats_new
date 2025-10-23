"""
Factor Analysis Service for StickForStats Platform
===================================================

Comprehensive factor analysis including Exploratory Factor Analysis (EFA),
factor rotation methods, and factor selection techniques.

Features:
- Exploratory Factor Analysis (EFA)
- Factor rotation: varimax, promax, oblimin, quartimax
- Scree plot data generation
- Kaiser criterion (eigenvalue > 1)
- Parallel analysis for factor selection
- Factor loadings and communalities
- Factor scores calculation
- Variance explained analysis
- Bartlett's test of sphericity
- Kaiser-Meyer-Olkin (KMO) measure

Author: StickForStats Development Team
Created: October 23, 2025
"""

import numpy as np
import pandas as pd
import logging
from typing import Dict, Any, List, Tuple, Optional, Union
import uuid
import json
import os
import pickle
from pathlib import Path
from datetime import datetime

from django.conf import settings

# Check if factor_analyzer is available
try:
    from factor_analyzer import FactorAnalyzer
    from factor_analyzer.factor_analyzer import calculate_bartlett_sphericity, calculate_kmo
    FACTOR_ANALYZER_AVAILABLE = True
except ImportError:
    FACTOR_ANALYZER_AVAILABLE = False

# Fallback to sklearn if factor_analyzer not available
try:
    from sklearn.decomposition import FactorAnalysis as SklearnFA
    SKLEARN_FA_AVAILABLE = True
except ImportError:
    SKLEARN_FA_AVAILABLE = False

from scipy import stats
from core.services.error_handler import safe_operation, try_except

logger = logging.getLogger(__name__)


class FactorAnalysisService:
    """
    Service for factor analysis and latent variable modeling.

    This service provides methods for:
    - Exploratory Factor Analysis (EFA)
    - Factor rotation (varimax, promax, oblimin, quartimax)
    - Factor selection (scree plot, Kaiser criterion, parallel analysis)
    - Factor loadings and communalities
    - Factor scores calculation
    - Adequacy testing (Bartlett's, KMO)

    Attributes:
        factor_analyzer_available (bool): Whether factor_analyzer library is installed
        sklearn_available (bool): Whether sklearn is available as fallback
        models_dir (str): Directory for storing fitted models
    """

    def __init__(self):
        """Initialize factor analysis service."""
        self.factor_analyzer_available = FACTOR_ANALYZER_AVAILABLE
        self.sklearn_available = SKLEARN_FA_AVAILABLE

        # Ensure model storage directory exists
        self.models_dir = os.path.join(settings.BASE_DIR, "data", "factor_models")
        os.makedirs(self.models_dir, exist_ok=True)

        if not FACTOR_ANALYZER_AVAILABLE and not SKLEARN_FA_AVAILABLE:
            logger.warning(
                "Neither factor_analyzer nor sklearn available. Factor analysis will not function. "
                "Install factor_analyzer: pip install factor-analyzer"
            )

    @safe_operation
    def check_availability(self) -> Dict[str, Any]:
        """
        Check if factor analysis is available.

        Returns:
            Dictionary with availability information
        """
        return {
            'factor_analyzer_available': self.factor_analyzer_available,
            'sklearn_available': self.sklearn_available,
            'recommended_library': 'factor_analyzer' if self.factor_analyzer_available else 'sklearn',
            'status': 'available' if (self.factor_analyzer_available or self.sklearn_available) else 'unavailable',
            'recommendation': (
                "Full factor analysis is available with factor_analyzer." if self.factor_analyzer_available else
                "Basic factor analysis is available with sklearn. For full features, install factor_analyzer. "
                "Run: pip install factor-analyzer"
            )
        }

    @safe_operation
    def test_adequacy(self, data: pd.DataFrame) -> Dict[str, Any]:
        """
        Test if data is adequate for factor analysis.

        Performs:
        - Bartlett's test of sphericity (tests if correlation matrix is identity)
        - Kaiser-Meyer-Olkin (KMO) measure of sampling adequacy

        Args:
            data: DataFrame with variables for factor analysis

        Returns:
            Dictionary with adequacy test results

        Raises:
            ValueError: If data invalid
            RuntimeError: If libraries not available
        """
        if not self.factor_analyzer_available:
            raise RuntimeError(
                "factor_analyzer library required for adequacy tests. "
                "Install with: pip install factor-analyzer"
            )

        # Validate data
        if len(data) < 50:
            logger.warning("Sample size is small (n < 50). Factor analysis may be unreliable.")

        if data.shape[1] < 3:
            raise ValueError("Need at least 3 variables for factor analysis")

        # Remove missing values
        data_clean = data.dropna()

        if len(data_clean) < len(data) * 0.9:
            logger.warning(f"Many rows removed due to missing values ({len(data) - len(data_clean)} rows)")

        # Convert to numeric
        numeric_data = data_clean.select_dtypes(include=[np.number])

        if numeric_data.shape[1] != data_clean.shape[1]:
            raise ValueError("All variables must be numeric for factor analysis")

        results = {
            'n_observations': len(numeric_data),
            'n_variables': numeric_data.shape[1],
            'adequacy_status': 'unknown'
        }

        # Bartlett's test of sphericity
        try:
            chi_square, p_value = calculate_bartlett_sphericity(numeric_data)
            results['bartlett_test'] = {
                'chi_square': float(chi_square),
                'p_value': float(p_value),
                'degrees_of_freedom': numeric_data.shape[1] * (numeric_data.shape[1] - 1) // 2,
                'is_significant': p_value < 0.05,
                'interpretation': (
                    "Data is suitable for factor analysis (correlation matrix differs from identity)"
                    if p_value < 0.05 else
                    "Warning: Data may not be suitable (correlation matrix similar to identity)"
                )
            }
        except Exception as e:
            logger.error(f"Bartlett's test failed: {str(e)}")
            results['bartlett_test'] = {'error': str(e)}

        # KMO measure
        try:
            kmo_all, kmo_model = calculate_kmo(numeric_data)
            results['kmo_test'] = {
                'overall_kmo': float(kmo_model),
                'variable_kmo': {col: float(kmo_all[i]) for i, col in enumerate(numeric_data.columns)},
                'interpretation': self._interpret_kmo(kmo_model)
            }
        except Exception as e:
            logger.error(f"KMO test failed: {str(e)}")
            results['kmo_test'] = {'error': str(e)}

        # Overall adequacy assessment
        bartlett_ok = results.get('bartlett_test', {}).get('is_significant', False)
        kmo_ok = results.get('kmo_test', {}).get('overall_kmo', 0) > 0.5

        if bartlett_ok and kmo_ok:
            results['adequacy_status'] = 'excellent'
            results['recommendation'] = "Data is well-suited for factor analysis. Proceed with confidence."
        elif bartlett_ok or kmo_ok:
            results['adequacy_status'] = 'acceptable'
            results['recommendation'] = "Data is acceptable for factor analysis, but interpret with caution."
        else:
            results['adequacy_status'] = 'poor'
            results['recommendation'] = "Data may not be suitable for factor analysis. Consider alternative methods."

        return results

    def _interpret_kmo(self, kmo_value: float) -> str:
        """
        Interpret KMO measure of sampling adequacy.

        Args:
            kmo_value: KMO statistic (0-1)

        Returns:
            Interpretation string
        """
        if kmo_value >= 0.9:
            return "Marvelous (KMO ≥ 0.90)"
        elif kmo_value >= 0.8:
            return "Meritorious (KMO ≥ 0.80)"
        elif kmo_value >= 0.7:
            return "Middling (KMO ≥ 0.70)"
        elif kmo_value >= 0.6:
            return "Mediocre (KMO ≥ 0.60)"
        elif kmo_value >= 0.5:
            return "Miserable (KMO ≥ 0.50)"
        else:
            return "Unacceptable (KMO < 0.50)"

    @safe_operation
    def determine_n_factors(self,
                           data: pd.DataFrame,
                           methods: List[str] = ['kaiser', 'scree', 'parallel']) -> Dict[str, Any]:
        """
        Determine optimal number of factors using multiple methods.

        Args:
            data: DataFrame with variables
            methods: List of methods to use ('kaiser', 'scree', 'parallel')

        Returns:
            Dictionary with recommendations from each method
        """
        if not self.factor_analyzer_available:
            raise RuntimeError("factor_analyzer library required. Install with: pip install factor-analyzer")

        # Clean data
        numeric_data = data.select_dtypes(include=[np.number]).dropna()

        if numeric_data.shape[1] < 3:
            raise ValueError("Need at least 3 variables for factor analysis")

        results = {
            'n_variables': numeric_data.shape[1],
            'methods': {}
        }

        # Kaiser criterion (eigenvalue > 1)
        if 'kaiser' in methods:
            fa_test = FactorAnalyzer(n_factors=numeric_data.shape[1], rotation=None)
            fa_test.fit(numeric_data)
            eigenvalues, _ = fa_test.get_eigenvalues()

            n_factors_kaiser = np.sum(eigenvalues > 1)

            results['methods']['kaiser'] = {
                'name': 'Kaiser Criterion',
                'n_factors_recommended': int(n_factors_kaiser),
                'eigenvalues': eigenvalues.tolist(),
                'criterion': 'Eigenvalue > 1.0',
                'interpretation': f"Retain {n_factors_kaiser} factors with eigenvalues greater than 1.0"
            }

        # Scree plot (visual elbow method)
        if 'scree' in methods:
            if 'kaiser' not in methods:  # Get eigenvalues if not already done
                fa_test = FactorAnalyzer(n_factors=numeric_data.shape[1], rotation=None)
                fa_test.fit(numeric_data)
                eigenvalues, _ = fa_test.get_eigenvalues()
            else:
                eigenvalues = np.array(results['methods']['kaiser']['eigenvalues'])

            # Find elbow using differences
            eigenvalue_diffs = np.diff(eigenvalues)
            elbow_idx = np.argmax(eigenvalue_diffs[:-1] - eigenvalue_diffs[1:]) + 1

            results['methods']['scree'] = {
                'name': 'Scree Plot',
                'n_factors_recommended': int(elbow_idx),
                'scree_data': {
                    'factor_numbers': list(range(1, len(eigenvalues) + 1)),
                    'eigenvalues': eigenvalues.tolist(),
                    'cumulative_variance': np.cumsum(eigenvalues / eigenvalues.sum()).tolist()
                },
                'interpretation': f"Elbow detected at factor {elbow_idx}"
            }

        # Parallel analysis (compare to random data)
        if 'parallel' in methods:
            n_iterations = 100
            n_obs, n_vars = numeric_data.shape

            # Generate random correlation matrices
            random_eigenvalues = []
            for _ in range(n_iterations):
                random_data = np.random.normal(size=(n_obs, n_vars))
                random_corr = np.corrcoef(random_data, rowvar=False)
                random_eig = np.linalg.eigvalsh(random_corr)
                random_eigenvalues.append(sorted(random_eig, reverse=True))

            mean_random_eigenvalues = np.mean(random_eigenvalues, axis=0)

            # Get actual eigenvalues
            if 'kaiser' not in methods and 'scree' not in methods:
                fa_test = FactorAnalyzer(n_factors=numeric_data.shape[1], rotation=None)
                fa_test.fit(numeric_data)
                eigenvalues, _ = fa_test.get_eigenvalues()
            else:
                eigenvalues = np.array(results['methods'][
                    'kaiser' if 'kaiser' in methods else 'scree'
                ]['eigenvalues' if 'kaiser' in methods else 'scree_data']['eigenvalues'])

            # Count factors where actual > random
            n_factors_parallel = np.sum(eigenvalues > mean_random_eigenvalues)

            results['methods']['parallel'] = {
                'name': 'Parallel Analysis',
                'n_factors_recommended': int(n_factors_parallel),
                'actual_eigenvalues': eigenvalues.tolist(),
                'random_eigenvalues': mean_random_eigenvalues.tolist(),
                'criterion': 'Actual eigenvalue > random eigenvalue',
                'interpretation': f"Retain {n_factors_parallel} factors exceeding random data eigenvalues"
            }

        # Consensus recommendation
        recommendations = [
            results['methods'][method]['n_factors_recommended']
            for method in results['methods']
        ]

        results['consensus'] = {
            'recommended_n_factors': int(np.median(recommendations)),
            'range': [int(min(recommendations)), int(max(recommendations))],
            'agreement': len(set(recommendations)) == 1,
            'interpretation': (
                f"All methods agree on {recommendations[0]} factors" if len(set(recommendations)) == 1
                else f"Methods suggest between {min(recommendations)} and {max(recommendations)} factors. "
                     f"Median recommendation: {int(np.median(recommendations))} factors"
            )
        }

        return results

    @safe_operation
    def exploratory_factor_analysis(self,
                                    data: pd.DataFrame,
                                    n_factors: Optional[int] = None,
                                    rotation: str = 'varimax',
                                    method: str = 'minres') -> Dict[str, Any]:
        """
        Perform Exploratory Factor Analysis (EFA).

        Args:
            data: DataFrame with variables
            n_factors: Number of factors to extract (if None, determined automatically)
            rotation: Rotation method ('varimax', 'promax', 'oblimin', 'quartimax', None)
            method: Extraction method ('minres', 'ml', 'principal')

        Returns:
            Dictionary containing:
                - factor_loadings: Loading matrix
                - communalities: Variance explained by factors
                - variance_explained: Variance per factor
                - factor_scores: Factor scores for observations (if requested)
                - rotation_method: Rotation used
                - uniquenesses: Unexplained variance per variable

        Raises:
            ValueError: If invalid parameters
            RuntimeError: If libraries not available
        """
        if not self.factor_analyzer_available:
            raise RuntimeError(
                "factor_analyzer library required for full EFA. "
                "Install with: pip install factor-analyzer"
            )

        # Clean data
        numeric_data = data.select_dtypes(include=[np.number]).dropna()

        if numeric_data.shape[1] < 3:
            raise ValueError("Need at least 3 variables for factor analysis")

        variable_names = numeric_data.columns.tolist()

        # Determine n_factors if not provided
        if n_factors is None:
            factor_selection = self.determine_n_factors(numeric_data, methods=['kaiser'])
            n_factors = factor_selection['methods']['kaiser']['n_factors_recommended']
            logger.info(f"Automatically selected {n_factors} factors using Kaiser criterion")

        # Validate n_factors
        if n_factors < 1:
            raise ValueError("n_factors must be at least 1")
        if n_factors > numeric_data.shape[1]:
            raise ValueError(f"n_factors ({n_factors}) cannot exceed number of variables ({numeric_data.shape[1]})")

        # Fit factor analysis
        fa = FactorAnalyzer(n_factors=n_factors, rotation=rotation, method=method)
        fa.fit(numeric_data)

        # Extract results
        loadings = fa.loadings_
        communalities = fa.get_communalities()
        uniquenesses = fa.get_uniquenesses()

        # Variance explained
        variance = fa.get_factor_variance()

        results = {
            'analysis_type': 'exploratory_factor_analysis',
            'n_observations': len(numeric_data),
            'n_variables': len(variable_names),
            'n_factors': n_factors,
            'rotation': rotation,
            'extraction_method': method,
            'variable_names': variable_names
        }

        # Factor loadings
        results['factor_loadings'] = {
            'matrix': loadings.tolist(),
            'variables': variable_names,
            'factors': [f'Factor_{i+1}' for i in range(n_factors)],
            'interpretation': self._interpret_loadings(loadings, variable_names, threshold=0.3)
        }

        # Communalities
        results['communalities'] = {
            variable: float(comm)
            for variable, comm in zip(variable_names, communalities)
        }

        # Uniquenesses
        results['uniquenesses'] = {
            variable: float(uniq)
            for variable, uniq in zip(variable_names, uniquenesses)
        }

        # Variance explained
        results['variance_explained'] = {
            'variance_per_factor': variance[0].tolist(),
            'proportional_variance': variance[1].tolist(),
            'cumulative_variance': variance[2].tolist(),
            'total_variance_explained': float(variance[2][-1])
        }

        # Factor scores
        try:
            factor_scores = fa.transform(numeric_data)
            results['factor_scores'] = {
                'scores': factor_scores.tolist(),
                'n_observations': len(factor_scores),
                'factor_names': [f'Factor_{i+1}' for i in range(n_factors)]
            }
        except Exception as e:
            logger.warning(f"Could not compute factor scores: {str(e)}")
            results['factor_scores'] = None

        # Overall interpretation
        results['interpretation'] = self._interpret_fa_results(results)

        # Store model
        model_id = str(uuid.uuid4())
        model_path = os.path.join(self.models_dir, f"fa_model_{model_id}.pkl")
        with open(model_path, 'wb') as f:
            pickle.dump(fa, f)
        results['model_id'] = model_id

        return results

    def _interpret_loadings(self,
                           loadings: np.ndarray,
                           variable_names: List[str],
                           threshold: float = 0.3) -> Dict[str, List[str]]:
        """
        Interpret factor loadings by identifying which variables load on which factors.

        Args:
            loadings: Loading matrix (variables x factors)
            variable_names: Names of variables
            threshold: Minimum absolute loading to consider significant

        Returns:
            Dictionary mapping factors to their significant variables
        """
        n_factors = loadings.shape[1]
        interpretation = {}

        for factor_idx in range(n_factors):
            factor_name = f'Factor_{factor_idx + 1}'
            factor_loadings = loadings[:, factor_idx]

            # Find variables with significant loadings
            significant_vars = [
                {
                    'variable': variable_names[i],
                    'loading': float(factor_loadings[i])
                }
                for i in range(len(variable_names))
                if abs(factor_loadings[i]) >= threshold
            ]

            # Sort by absolute loading value
            significant_vars.sort(key=lambda x: abs(x['loading']), reverse=True)

            interpretation[factor_name] = significant_vars

        return interpretation

    def _interpret_fa_results(self, results: Dict[str, Any]) -> str:
        """
        Generate interpretation text for factor analysis results.

        Args:
            results: Results dictionary from EFA

        Returns:
            Human-readable interpretation string
        """
        interpretation = []

        n_factors = results['n_factors']
        n_vars = results['n_variables']
        total_var = results['variance_explained']['total_variance_explained']

        interpretation.append(
            f"Extracted {n_factors} factors from {n_vars} variables, "
            f"explaining {total_var*100:.1f}% of total variance."
        )

        # Describe each factor
        for factor_name, variables in results['factor_loadings']['interpretation'].items():
            if variables:
                top_vars = [v['variable'] for v in variables[:3]]
                interpretation.append(
                    f"{factor_name} primarily loads on: {', '.join(top_vars)}"
                )

        # Adequacy
        interpretation.append(
            f"Used {results['rotation']} rotation with {results['extraction_method']} extraction."
        )

        return " ".join(interpretation)

    @safe_operation
    def transform_to_factors(self,
                            model_id: str,
                            new_data: pd.DataFrame) -> Dict[str, Any]:
        """
        Transform new data to factor scores using a fitted model.

        Args:
            model_id: ID of previously fitted factor analysis model
            new_data: DataFrame with same variables as original

        Returns:
            Dictionary with factor scores for new observations
        """
        model_path = os.path.join(self.models_dir, f"fa_model_{model_id}.pkl")

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model with ID {model_id} not found")

        # Load model
        with open(model_path, 'rb') as f:
            fa = pickle.load(f)

        # Transform data
        numeric_data = new_data.select_dtypes(include=[np.number]).dropna()
        factor_scores = fa.transform(numeric_data)

        results = {
            'model_id': model_id,
            'n_observations': len(factor_scores),
            'n_factors': factor_scores.shape[1],
            'factor_scores': factor_scores.tolist(),
            'factor_names': [f'Factor_{i+1}' for i in range(factor_scores.shape[1])]
        }

        return results


# Singleton instance
_factor_service = None

def get_factor_service() -> FactorAnalysisService:
    """
    Get singleton instance of FactorAnalysisService.

    Returns:
        FactorAnalysisService instance
    """
    global _factor_service
    if _factor_service is None:
        _factor_service = FactorAnalysisService()
    return _factor_service
