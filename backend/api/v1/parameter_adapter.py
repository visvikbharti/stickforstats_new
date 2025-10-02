"""
Universal Parameter Adapter for StickForStats API
==================================================
Handles parameter normalization for all 46 statistical test endpoints
Maintains backward compatibility while standardizing internally
"""

from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)


class UniversalParameterAdapter:
    """
    Adapts incoming API parameters to expected formats
    Provides a single source of truth for parameter mappings
    """

    # Test type mappings
    TEST_TYPE_MAPPINGS = {
        # T-Test variations
        'independent': 'two_sample',
        'two-sample': 'two_sample',
        'one-sample': 'one_sample',
        'paired-sample': 'paired',
        'dependent': 'paired',

        # ANOVA variations
        'one-way': 'one_way',
        'oneway': 'one_way',
        '1way': 'one_way',
        'two-way': 'two_way',
        'twoway': 'two_way',
        '2way': 'two_way',
        'repeated': 'repeated_measures',
        'rm': 'repeated_measures',
        'repeated-measures': 'repeated_measures',
    }

    # Parameter name mappings (old -> new)
    PARAMETER_MAPPINGS = {
        'common': {
            'mu': 'hypothesized_mean',
            'conf_level': 'confidence_level',
            'conf.level': 'confidence_level',
            'sig_level': 'alpha',
            'significance': 'alpha',
            'alternative_hypothesis': 'alternative',
            'alt': 'alternative',
        },

        'data_parameters': {
            # Various ways to specify data
            'group1': 'data1',
            'group2': 'data2',
            'x_data': 'x',
            'y_data': 'y',
            'sample1': 'data1',
            'sample2': 'data2',
            'treatment': 'data2',
            'control': 'data1',
            'observations': 'data',
            'values': 'data',
            'measurements': 'data',
        },

        'nonparametric': {
            # Don't map x/y as they're used by Wilcoxon and Sign tests
            # 'x': 'data1',  # Removed - Wilcoxon needs x as x
            # 'y': 'data2',  # Removed - Wilcoxon needs y as y
            'group_1': 'group1',
            'group_2': 'group2',
            'sample_1': 'data1',
            'sample_2': 'data2',
            'sample1': 'data1',
            'sample2': 'data2',
        },

        'categorical': {
            'table': 'contingency_table',
            'cont_table': 'contingency_table',
            'observed_frequencies': 'observed',
            'expected_frequencies': 'expected',
            'obs': 'observed',
            'exp': 'expected',
            'n_trials': 'trials',
            'n_success': 'successes',
            'prob': 'probability',
        },

        'power': {
            'es': 'effect_size',
            'effectsize': 'effect_size',
            'r': 'effect_size',  # ✅ ADDED: correlation coefficient to effect size
            'd': 'effect_size',  # ✅ ADDED: Cohen's d to effect size
            'sig_level': 'alpha',
            'significance': 'alpha',
            'n': 'sample_size',
            'n_sample': 'sample_size',
            'n_per_group': 'sample_size',
            'power_level': 'power',
            'k': 'groups',  # ✅ ADDED: number of groups (k) for ANOVA
            'n_groups': 'groups',  # ✅ ADDED: alternative naming
            'num_groups': 'groups',  # ✅ ADDED: alternative naming
        },

        'regression': {
            'predictors': 'x',
            'response': 'y',
            'independent': 'x',
            'dependent': 'y',
            'features': 'x',
            'target': 'y',
            'x_vars': 'x',
            'y_var': 'y',
        },

        'correlation': {
            'var1': 'x',
            'var2': 'y',
            'variable1': 'x',
            'variable2': 'y',
            'first': 'x',
            'second': 'y',
        }
    }

    # Alternative values mappings
    ALTERNATIVE_MAPPINGS = {
        'two-sided': 'two_sided',
        'two.sided': 'two_sided',
        'both': 'two_sided',
        'not_equal': 'two_sided',
        'ne': 'two_sided',
        '!=': 'two_sided',
        'less_than': 'less',
        'lt': 'less',
        '<': 'less',
        'greater_than': 'greater',
        'gt': 'greater',
        '>': 'greater',
    }

    # Method/type mappings
    METHOD_MAPPINGS = {
        'pearson_r': 'pearson',
        'spearman_rho': 'spearman',
        'kendall_tau': 'kendall',
        'kendalls': 'kendall',
        'rank': 'spearman',
    }

    def adapt_parameters(self, endpoint_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main method to adapt parameters based on endpoint type

        Args:
            endpoint_type: Type of endpoint (ttest, anova, regression, etc.)
            params: Original parameters from request

        Returns:
            Adapted parameters in standardized format
        """

        # Create a copy to avoid modifying original
        adapted = params.copy()

        # Apply common mappings
        adapted = self._apply_common_mappings(adapted)

        # Apply endpoint-specific mappings
        if endpoint_type == 'ttest':
            adapted = self._adapt_ttest_params(adapted)
        elif endpoint_type == 'anova':
            adapted = self._adapt_anova_params(adapted)
        elif endpoint_type == 'nonparametric':
            adapted = self._adapt_nonparametric_params(adapted)
        elif endpoint_type == 'categorical':
            adapted = self._adapt_categorical_params(adapted)
        elif endpoint_type == 'power':
            adapted = self._adapt_power_params(adapted)
        elif endpoint_type == 'regression':
            adapted = self._adapt_regression_params(adapted)
        elif endpoint_type == 'correlation':
            adapted = self._adapt_correlation_params(adapted)

        # Handle alpha/confidence_level conversion
        adapted = self._normalize_significance_level(adapted)

        # Log the adaptation for debugging
        if params != adapted:
            logger.debug(f"Parameter adaptation: {params} -> {adapted}")

        return adapted

    def _apply_common_mappings(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Apply common parameter mappings across all endpoints"""
        for old_name, new_name in self.PARAMETER_MAPPINGS['common'].items():
            if old_name in params and new_name not in params:
                params[new_name] = params.pop(old_name)

        # Handle alternative hypothesis
        if 'alternative' in params:
            alt = str(params['alternative']).lower()
            if alt in self.ALTERNATIVE_MAPPINGS:
                params['alternative'] = self.ALTERNATIVE_MAPPINGS[alt]

        return params

    def _adapt_ttest_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Adapt T-Test specific parameters"""
        # Handle test_type
        if 'test_type' in params:
            test_type = str(params['test_type']).lower()
            if test_type in self.TEST_TYPE_MAPPINGS:
                params['test_type'] = self.TEST_TYPE_MAPPINGS[test_type]

        # Handle data parameters
        for old_name, new_name in self.PARAMETER_MAPPINGS['data_parameters'].items():
            if old_name in params and new_name not in params:
                params[new_name] = params.pop(old_name)

        # Handle mu in parameters dict
        if 'parameters' in params and 'mu' in params['parameters']:
            if 'hypothesized_mean' not in params:
                params['hypothesized_mean'] = params['parameters']['mu']

        return params

    def _adapt_anova_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Adapt ANOVA specific parameters"""
        # Handle anova_type
        if 'anova_type' in params:
            anova_type = str(params['anova_type']).lower()
            if anova_type in self.TEST_TYPE_MAPPINGS:
                params['anova_type'] = self.TEST_TYPE_MAPPINGS[anova_type]

        # Handle data vs groups
        if 'data' in params and 'groups' not in params:
            params['groups'] = params.pop('data')

        # Handle repeated measures flag
        if params.get('repeated') == True:
            params['anova_type'] = 'repeated_measures'

        return params

    def _adapt_nonparametric_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Adapt non-parametric test parameters"""
        # Map common non-parametric parameters
        mappings = self.PARAMETER_MAPPINGS['nonparametric']

        # Handle various data parameter names
        if 'x' in params and 'group1' not in params:
            params['group1'] = params.pop('x')
        if 'y' in params and 'group2' not in params:
            params['group2'] = params.pop('y')

        # Handle data1/data2 to group1/group2
        if 'data1' in params and 'group1' not in params:
            params['group1'] = params.pop('data1')
        if 'data2' in params and 'group2' not in params:
            params['group2'] = params.pop('data2')

        # Handle groups parameter (list of groups)
        # ✅ FIXED: Use .get() instead of .pop() to preserve 'data' key for effect sizes endpoint
        # The 'data' key serves as structural container in some endpoints
        if 'data' in params and 'groups' not in params:
            # Only transform if 'data' is a list (actual data), not a dict (structural container)
            if isinstance(params['data'], list):
                params['groups'] = params.pop('data')
            else:
                # Preserve 'data' key for endpoints that use it as a structural container
                params['groups'] = params.get('data')

        return params

    def _adapt_categorical_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Adapt categorical test parameters"""
        for old_name, new_name in self.PARAMETER_MAPPINGS['categorical'].items():
            if old_name in params and new_name not in params:
                params[new_name] = params.pop(old_name)

        return params

    def _adapt_power_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Adapt power analysis parameters"""
        for old_name, new_name in self.PARAMETER_MAPPINGS['power'].items():
            if old_name in params and new_name not in params:
                params[new_name] = params.pop(old_name)

        # Handle which parameter to calculate (set to None)
        if 'calculate' in params:
            calc_param = params.pop('calculate')
            if calc_param in ['sample_size', 'n']:
                params['sample_size'] = None
            elif calc_param in ['power', 'power_level']:
                params['power'] = None
            elif calc_param in ['effect_size', 'es']:
                params['effect_size'] = None

        return params

    def _adapt_regression_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Adapt regression parameters"""
        for old_name, new_name in self.PARAMETER_MAPPINGS['regression'].items():
            if old_name in params and new_name not in params:
                params[new_name] = params.pop(old_name)

        # Keep 'type' field as is - the serializer expects it
        # Don't convert to regression_type

        return params

    def _adapt_correlation_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Adapt correlation parameters"""
        for old_name, new_name in self.PARAMETER_MAPPINGS['correlation'].items():
            if old_name in params and new_name not in params:
                params[new_name] = params.pop(old_name)

        # Handle method parameter
        if 'method' in params:
            method = str(params['method']).lower()
            if method in self.METHOD_MAPPINGS:
                params['method'] = self.METHOD_MAPPINGS[method]

        return params

    def _normalize_significance_level(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Convert between alpha and confidence_level"""
        if 'alpha' in params and 'confidence_level' not in params:
            alpha = float(params.get('alpha', 0.05))
            params['confidence_level'] = str((1 - alpha) * 100)
        elif 'confidence_level' in params:
            # Ensure it's a string
            params['confidence_level'] = str(params['confidence_level'])

        return params


# Singleton instance
parameter_adapter = UniversalParameterAdapter()