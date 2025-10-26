"""
Transformation Engine
=====================
Automatic data transformation for fixing statistical assumption violations.
Provides intelligent suggestions, applies transformations, and validates improvements.

Author: StickForStats Development Team
Date: October 2025
"""

import numpy as np
from scipy import stats
from scipy.optimize import minimize_scalar
from typing import Dict, Any, List, Tuple, Optional
import warnings

warnings.filterwarnings('ignore')


class TransformationEngine:
    """
    Analyzes data and suggests/applies statistical transformations
    to fix assumption violations (especially normality).

    Supported transformations:
    - Log transformation (right skewness)
    - Square root transformation (count data)
    - Box-Cox transformation (general-purpose)
    - Inverse transformation (left skewness)
    - Rank transformation (severe non-normality)
    """

    TRANSFORMATION_TYPES = ['log', 'sqrt', 'boxcox', 'inverse', 'rank']

    # Skewness thresholds for transformation selection
    RIGHT_SKEW_THRESHOLD = 1.0
    LEFT_SKEW_THRESHOLD = -1.0
    MODERATE_SKEW = 0.5

    def suggest_transformation(self, data: np.ndarray,
                              violation_type: str = 'normality') -> Dict[str, Any]:
        """
        Analyze data characteristics and suggest best transformation.

        Parameters:
        -----------
        data : np.ndarray
            Original data with assumption violations
        violation_type : str
            Type of violation ('normality', 'variance', etc.)
            Currently focuses on normality

        Returns:
        --------
        Dict containing:
            - recommended: str (transformation name)
            - alternatives: List[str] (other options)
            - reason: str (explanation)
            - expected_improvement: float (0-100 score)
            - current_p_value: float (Shapiro-Wilk p-value)
            - estimated_p_value: float (expected after transform)
            - current_skewness: float
            - current_kurtosis: float
        """
        # Clean data
        data_clean = data[~np.isnan(data)]

        if len(data_clean) < 3:
            return {
                'recommended': None,
                'alternatives': [],
                'reason': 'Insufficient data for transformation (n < 3)',
                'expected_improvement': 0,
                'current_p_value': None,
                'estimated_p_value': None
            }

        # Calculate current statistics
        skewness = stats.skew(data_clean)
        kurtosis = stats.kurtosis(data_clean)

        # Test current normality
        if len(data_clean) <= 5000:
            shapiro_stat, shapiro_p = stats.shapiro(data_clean)
        else:
            # Use Anderson-Darling for large samples
            anderson_result = stats.anderson(data_clean)
            shapiro_p = 0.001 if anderson_result.statistic > anderson_result.critical_values[2] else 0.10

        current_p = shapiro_p

        # Check for negative values
        has_negative = np.any(data_clean < 0)
        has_zeros = np.any(data_clean == 0)
        min_val = np.min(data_clean)

        # Decision tree for transformation suggestion
        recommended = None
        alternatives = []
        reason = ""
        estimated_p = current_p

        if has_negative:
            # Can only use rank transformation for negative values
            recommended = 'rank'
            alternatives = []
            reason = f"Data contains negative values (min = {min_val:.3f}). Rank transformation maps to normal scores."
            estimated_p = 0.15  # Rank transformation should fix normality

        elif skewness > self.RIGHT_SKEW_THRESHOLD:
            # Right-skewed data
            if has_zeros:
                recommended = 'log'
                alternatives = ['sqrt', 'boxcox', 'rank']
                reason = f"Right-skewed distribution (skewness = {skewness:.2f}). Log transform with constant for zeros."
                estimated_p = min(0.15, current_p * 15)  # Estimated improvement
            else:
                recommended = 'boxcox'  # Box-Cox is most powerful when applicable
                alternatives = ['log', 'sqrt', 'rank']
                reason = f"Right-skewed distribution (skewness = {skewness:.2f}). Box-Cox finds optimal transformation."
                estimated_p = min(0.20, current_p * 20)

        elif skewness < self.LEFT_SKEW_THRESHOLD:
            # Left-skewed data
            if min_val <= 0:
                recommended = 'rank'
                alternatives = []
                reason = f"Left-skewed with non-positive values (min = {min_val:.3f}). Rank transformation required."
                estimated_p = 0.15
            else:
                recommended = 'inverse'
                alternatives = ['rank']
                reason = f"Left-skewed distribution (skewness = {skewness:.2f}). Inverse transformation recommended."
                estimated_p = min(0.12, current_p * 12)

        elif abs(skewness) > self.MODERATE_SKEW and current_p < 0.05:
            # Moderately skewed but still non-normal
            if has_zeros or min_val <= 0:
                recommended = 'rank'
                alternatives = []
                reason = f"Moderately skewed (skewness = {skewness:.2f}) with edge values. Rank transformation safest."
                estimated_p = 0.15
            else:
                recommended = 'boxcox'
                alternatives = ['log', 'sqrt', 'rank']
                reason = f"Moderately skewed (skewness = {skewness:.2f}). Box-Cox finds optimal transformation."
                estimated_p = min(0.18, current_p * 18)

        elif abs(kurtosis) > 3 and current_p < 0.05:
            # Heavy tails
            recommended = 'rank'
            alternatives = []
            reason = f"Heavy-tailed distribution (kurtosis = {kurtosis:.2f}). Rank transformation handles outliers."
            estimated_p = 0.15

        else:
            # Data is mildly non-normal or transformation won't help
            recommended = None
            alternatives = []
            reason = "Data is mildly non-normal. Transformation may not be necessary. Consider robust methods."
            estimated_p = current_p

        # Calculate expected improvement score (0-100)
        if recommended:
            if current_p == 0:
                current_p = 0.001  # Avoid division by zero
            improvement = min(100, ((estimated_p - current_p) / (0.20 - current_p)) * 100)
            improvement = max(0, improvement)  # Can't be negative
        else:
            improvement = 0

        return {
            'recommended': recommended,
            'alternatives': alternatives,
            'reason': reason,
            'expected_improvement': round(improvement, 1),
            'current_p_value': round(current_p, 4),
            'estimated_p_value': round(estimated_p, 4),
            'current_skewness': round(skewness, 3),
            'current_kurtosis': round(kurtosis, 3),
            'has_negative': has_negative,
            'has_zeros': has_zeros,
            'min_value': round(float(min_val), 3),
            'max_value': round(float(np.max(data_clean)), 3)
        }

    def apply_transformation(self, data: np.ndarray,
                           transform_type: str,
                           **kwargs) -> Dict[str, Any]:
        """
        Apply specified transformation to data.

        Parameters:
        -----------
        data : np.ndarray
            Original data
        transform_type : str
            One of: 'log', 'sqrt', 'boxcox', 'inverse', 'rank'
        **kwargs:
            - add_constant: float (for log/sqrt)
            - lambda_param: float (for Box-Cox, auto-detected if None)

        Returns:
        --------
        Dict containing:
            - transformed_data: np.ndarray
            - transformation: str
            - parameters: Dict
            - inverse_formula: str
            - success: bool
            - message: str
        """
        # Clean data
        data_clean = data[~np.isnan(data)]

        if len(data_clean) < 3:
            return {
                'transformed_data': data,
                'transformation': transform_type,
                'parameters': {},
                'inverse_formula': 'None',
                'success': False,
                'message': 'Insufficient data for transformation'
            }

        try:
            if transform_type == 'log':
                return self._apply_log(data_clean, **kwargs)
            elif transform_type == 'sqrt':
                return self._apply_sqrt(data_clean, **kwargs)
            elif transform_type == 'boxcox':
                return self._apply_boxcox(data_clean, **kwargs)
            elif transform_type == 'inverse':
                return self._apply_inverse(data_clean, **kwargs)
            elif transform_type == 'rank':
                return self._apply_rank(data_clean, **kwargs)
            else:
                return {
                    'transformed_data': data,
                    'transformation': transform_type,
                    'parameters': {},
                    'inverse_formula': 'None',
                    'success': False,
                    'message': f'Unknown transformation type: {transform_type}'
                }
        except Exception as e:
            return {
                'transformed_data': data,
                'transformation': transform_type,
                'parameters': {},
                'inverse_formula': 'None',
                'success': False,
                'message': f'Transformation failed: {str(e)}'
            }

    def _apply_log(self, data: np.ndarray, add_constant: Optional[float] = None) -> Dict[str, Any]:
        """Apply logarithmic transformation"""
        # Determine constant
        if add_constant is None:
            if np.any(data <= 0):
                add_constant = abs(np.min(data)) + 1.0
            else:
                add_constant = 0.0

        transformed = np.log(data + add_constant)

        return {
            'transformed_data': transformed,
            'transformation': 'log',
            'parameters': {'constant': round(add_constant, 4)},
            'inverse_formula': f'exp(y) - {add_constant:.4f}' if add_constant > 0 else 'exp(y)',
            'success': True,
            'message': f'Log transformation applied with constant = {add_constant:.4f}'
        }

    def _apply_sqrt(self, data: np.ndarray, add_constant: Optional[float] = None) -> Dict[str, Any]:
        """Apply square root transformation"""
        # Determine constant
        if add_constant is None:
            if np.any(data < 0):
                add_constant = abs(np.min(data)) + 0.5
            else:
                add_constant = 0.0

        transformed = np.sqrt(data + add_constant)

        return {
            'transformed_data': transformed,
            'transformation': 'sqrt',
            'parameters': {'constant': round(add_constant, 4)},
            'inverse_formula': f'y² - {add_constant:.4f}' if add_constant > 0 else 'y²',
            'success': True,
            'message': f'Square root transformation applied with constant = {add_constant:.4f}'
        }

    def _apply_boxcox(self, data: np.ndarray, lambda_param: Optional[float] = None) -> Dict[str, Any]:
        """Apply Box-Cox transformation"""
        # Box-Cox requires positive data
        if np.any(data <= 0):
            constant = abs(np.min(data)) + 1.0
            data_shifted = data + constant
        else:
            constant = 0.0
            data_shifted = data

        # Find optimal lambda if not provided
        if lambda_param is None:
            # Use MLE to find optimal lambda
            try:
                transformed, fitted_lambda = stats.boxcox(data_shifted)
            except:
                # Fallback: try common lambda values
                best_lambda = 0
                best_p = 0
                for test_lambda in [0, 0.5, 1.0, -0.5, -1.0]:
                    test_transformed = self._boxcox_transform(data_shifted, test_lambda)
                    _, p = stats.shapiro(test_transformed)
                    if p > best_p:
                        best_p = p
                        best_lambda = test_lambda
                fitted_lambda = best_lambda
                transformed = self._boxcox_transform(data_shifted, fitted_lambda)
        else:
            fitted_lambda = lambda_param
            transformed = self._boxcox_transform(data_shifted, fitted_lambda)

        # Inverse formula
        if abs(fitted_lambda) < 0.01:
            inverse = f'exp(y)' if constant == 0 else f'exp(y) - {constant:.4f}'
        else:
            inverse = f'(y * {fitted_lambda:.4f} + 1)^(1/{fitted_lambda:.4f})'
            if constant > 0:
                inverse += f' - {constant:.4f}'

        return {
            'transformed_data': transformed,
            'transformation': 'boxcox',
            'parameters': {
                'lambda': round(fitted_lambda, 4),
                'constant': round(constant, 4)
            },
            'inverse_formula': inverse,
            'success': True,
            'message': f'Box-Cox transformation applied with λ = {fitted_lambda:.4f}'
        }

    def _boxcox_transform(self, data: np.ndarray, lmbda: float) -> np.ndarray:
        """Manual Box-Cox transformation"""
        if abs(lmbda) < 1e-10:
            return np.log(data)
        else:
            return (data ** lmbda - 1) / lmbda

    def _apply_inverse(self, data: np.ndarray, add_constant: Optional[float] = None) -> Dict[str, Any]:
        """Apply inverse transformation"""
        # Determine constant to avoid division by zero
        if add_constant is None:
            if np.any(abs(data) < 0.1):
                add_constant = 0.1
            else:
                add_constant = 0.0

        transformed = 1.0 / (data + add_constant)

        return {
            'transformed_data': transformed,
            'transformation': 'inverse',
            'parameters': {'constant': round(add_constant, 4)},
            'inverse_formula': f'1/y - {add_constant:.4f}' if add_constant > 0 else '1/y',
            'success': True,
            'message': f'Inverse transformation applied with constant = {add_constant:.4f}'
        }

    def _apply_rank(self, data: np.ndarray, **kwargs) -> Dict[str, Any]:
        """Apply rank transformation (normal scores)"""
        # Convert to ranks
        ranks = stats.rankdata(data)

        # Convert ranks to normal scores (percentiles → z-scores)
        # Use van der Waerden scores: Φ^(-1)(r/(n+1))
        n = len(data)
        percentiles = ranks / (n + 1)
        normal_scores = stats.norm.ppf(percentiles)

        return {
            'transformed_data': normal_scores,
            'transformation': 'rank',
            'parameters': {'n': n},
            'inverse_formula': 'Rank-based; not directly invertible',
            'success': True,
            'message': 'Rank transformation applied (normal scores)'
        }

    def validate_transformation(self, original_data: np.ndarray,
                               transformed_data: np.ndarray) -> Dict[str, Any]:
        """
        Test if transformation improved normality.

        Returns:
        --------
        Dict containing:
            - original_p_value: float
            - transformed_p_value: float
            - improvement: bool
            - improvement_score: float (0-100)
            - still_violated: bool (p < 0.05)
            - shapiro_stat_before: float
            - shapiro_stat_after: float
            - skewness_before: float
            - skewness_after: float
        """
        # Clean data
        orig_clean = original_data[~np.isnan(original_data)]
        trans_clean = transformed_data[~np.isnan(transformed_data)]

        if len(orig_clean) < 3 or len(trans_clean) < 3:
            return {
                'improvement': False,
                'message': 'Insufficient data for validation'
            }

        # Test original data
        if len(orig_clean) <= 5000:
            orig_stat, orig_p = stats.shapiro(orig_clean)
        else:
            anderson_orig = stats.anderson(orig_clean)
            orig_p = 0.001 if anderson_orig.statistic > anderson_orig.critical_values[2] else 0.10
            orig_stat = anderson_orig.statistic / 10  # Normalize

        # Test transformed data
        if len(trans_clean) <= 5000:
            trans_stat, trans_p = stats.shapiro(trans_clean)
        else:
            anderson_trans = stats.anderson(trans_clean)
            trans_p = 0.001 if anderson_trans.statistic > anderson_trans.critical_values[2] else 0.10
            trans_stat = anderson_trans.statistic / 10

        # Calculate skewness
        orig_skew = stats.skew(orig_clean)
        trans_skew = stats.skew(trans_clean)

        # Determine improvement
        improved = trans_p > orig_p and abs(trans_skew) < abs(orig_skew)
        still_violated = trans_p < 0.05

        # Calculate improvement score
        if orig_p == 0:
            orig_p = 0.001
        p_improvement = ((trans_p - orig_p) / (1.0 - orig_p)) * 100
        skew_improvement = ((abs(orig_skew) - abs(trans_skew)) / (abs(orig_skew) + 0.1)) * 100

        improvement_score = max(0, min(100, (p_improvement + skew_improvement) / 2))

        return {
            'original_p_value': round(orig_p, 4),
            'transformed_p_value': round(trans_p, 4),
            'improvement': improved,
            'improvement_score': round(improvement_score, 1),
            'still_violated': still_violated,
            'shapiro_stat_before': round(float(orig_stat), 4),
            'shapiro_stat_after': round(float(trans_stat), 4),
            'skewness_before': round(orig_skew, 3),
            'skewness_after': round(trans_skew, 3),
            'kurtosis_before': round(stats.kurtosis(orig_clean), 3),
            'kurtosis_after': round(stats.kurtosis(trans_clean), 3)
        }

    def generate_code(self, transformation: str,
                     parameters: Dict,
                     language: str = 'python') -> str:
        """
        Generate reproducible code for the transformation.

        Parameters:
        -----------
        transformation : str
            Type of transformation
        parameters : Dict
            Transformation parameters
        language : str
            'python' or 'r'

        Returns:
        --------
        str : Executable code
        """
        if language == 'python':
            return self._generate_python_code(transformation, parameters)
        elif language == 'r':
            return self._generate_r_code(transformation, parameters)
        else:
            return f"# Unsupported language: {language}"

    def _generate_python_code(self, transformation: str, parameters: Dict) -> str:
        """Generate Python code for transformation"""
        code = "import numpy as np\nfrom scipy import stats\n\n"

        if transformation == 'log':
            const = parameters.get('constant', 0)
            if const > 0:
                code += f"# Log transformation with constant\ntransformed_data = np.log(data + {const})\n"
            else:
                code += "# Log transformation\ntransformed_data = np.log(data)\n"

        elif transformation == 'sqrt':
            const = parameters.get('constant', 0)
            if const > 0:
                code += f"# Square root transformation with constant\ntransformed_data = np.sqrt(data + {const})\n"
            else:
                code += "# Square root transformation\ntransformed_data = np.sqrt(data)\n"

        elif transformation == 'boxcox':
            lmbda = parameters.get('lambda', 1)
            const = parameters.get('constant', 0)
            if const > 0:
                code += f"# Box-Cox transformation (λ = {lmbda})\ntransformed_data, _ = stats.boxcox(data + {const})\n"
            else:
                code += f"# Box-Cox transformation (λ = {lmbda})\ntransformed_data, _ = stats.boxcox(data)\n"

        elif transformation == 'inverse':
            const = parameters.get('constant', 0)
            if const > 0:
                code += f"# Inverse transformation with constant\ntransformed_data = 1.0 / (data + {const})\n"
            else:
                code += "# Inverse transformation\ntransformed_data = 1.0 / data\n"

        elif transformation == 'rank':
            code += "# Rank transformation (normal scores)\nranks = stats.rankdata(data)\n"
            code += "n = len(data)\npercentiles = ranks / (n + 1)\n"
            code += "transformed_data = stats.norm.ppf(percentiles)\n"

        return code

    def _generate_r_code(self, transformation: str, parameters: Dict) -> str:
        """Generate R code for transformation"""
        code = "# Load required library\nlibrary(MASS)  # For Box-Cox\n\n"

        if transformation == 'log':
            const = parameters.get('constant', 0)
            if const > 0:
                code += f"# Log transformation with constant\ntransformed_data <- log(data + {const})\n"
            else:
                code += "# Log transformation\ntransformed_data <- log(data)\n"

        elif transformation == 'sqrt':
            const = parameters.get('constant', 0)
            if const > 0:
                code += f"# Square root transformation with constant\ntransformed_data <- sqrt(data + {const})\n"
            else:
                code += "# Square root transformation\ntransformed_data <- sqrt(data)\n"

        elif transformation == 'boxcox':
            lmbda = parameters.get('lambda', 1)
            code += f"# Box-Cox transformation\nbc <- boxcox(lm(data ~ 1), plot=FALSE)\ntransformed_data <- bc$x\n"

        elif transformation == 'inverse':
            const = parameters.get('constant', 0)
            if const > 0:
                code += f"# Inverse transformation with constant\ntransformed_data <- 1.0 / (data + {const})\n"
            else:
                code += "# Inverse transformation\ntransformed_data <- 1.0 / data\n"

        elif transformation == 'rank':
            code += "# Rank transformation (normal scores)\ntransformed_data <- qnorm((rank(data) - 0.5) / length(data))\n"

        return code
