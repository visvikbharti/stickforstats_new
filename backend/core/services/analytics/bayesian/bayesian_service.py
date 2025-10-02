import numpy as np
import pandas as pd
import logging
from typing import Dict, Any, List, Tuple, Optional, Union
import uuid
import json
import os
from pathlib import Path
from datetime import datetime
import pickle
import base64

from django.conf import settings

# Check if PyMC3 is available, otherwise use compatibility mode
try:
    import pymc3 as pm
    import arviz as az
    PYMC_AVAILABLE = True
except ImportError:
    PYMC_AVAILABLE = False

from core.services.error_handler import safe_operation, try_except

logger = logging.getLogger(__name__)

class BayesianService:
    """
    Service for Bayesian statistical analysis.
    
    This service provides methods for:
    - Bayesian statistical inference and hypothesis testing
    - Credible interval calculation
    - Bayes factor computation
    - Posterior distribution analysis and visualization
    """
    
    def __init__(self):
        """Initialize Bayesian analysis service."""
        self.pymc_available = PYMC_AVAILABLE
        
        # Ensure model storage directory exists
        self.models_dir = os.path.join(settings.BASE_DIR, "data", "bayesian_models")
        os.makedirs(self.models_dir, exist_ok=True)
        
        if not PYMC_AVAILABLE:
            logger.warning(
                "PyMC3 not available. Bayesian analysis will run in compatibility mode, "
                "which provides simplified functionality. Install PyMC3 for full features."
            )
    
    @safe_operation
    def check_availability(self) -> Dict[str, Any]:
        """
        Check if full Bayesian analysis is available.
        
        Returns:
            Dictionary with availability information
        """
        return {
            'pymc_available': self.pymc_available,
            'mode': 'full' if self.pymc_available else 'compatibility',
            'recommendation': (
                "Full Bayesian analysis is available." if self.pymc_available else
                "Install PyMC3 and ArviZ for full Bayesian analysis capabilities. "
                "Run: pip install pymc3 arviz"
            )
        }
    
    @safe_operation
    def perform_bayesian_ttest(self, data: pd.DataFrame, 
                             group_col: str, value_col: str,
                             rope_width: float = 0.1,
                             credible_interval: float = 0.95,
                             n_samples: int = 2000) -> Dict[str, Any]:
        """
        Perform Bayesian t-test (comparing two groups).
        
        Args:
            data: Input DataFrame
            group_col: Column containing group labels
            value_col: Column containing values to compare
            rope_width: Region of practical equivalence (in units of effect size)
            credible_interval: Credible interval size (0-1)
            n_samples: Number of MCMC samples
            
        Returns:
            Dictionary containing analysis results
        """
        # Check if required columns exist
        if group_col not in data.columns:
            raise ValueError(f"Group column '{group_col}' not found in data")
        if value_col not in data.columns:
            raise ValueError(f"Value column '{value_col}' not found in data")
        
        # Extract groups
        groups = data[group_col].unique()
        if len(groups) != 2:
            raise ValueError(f"Bayesian t-test requires exactly 2 groups, but found {len(groups)}")
        
        # Extract data for each group
        group1_data = data[data[group_col] == groups[0]][value_col].dropna().values
        group2_data = data[data[group_col] == groups[1]][value_col].dropna().values
        
        # Check if we have enough data
        if len(group1_data) < 3 or len(group2_data) < 3:
            raise ValueError(f"Each group must have at least 3 observations, but found {len(group1_data)} and {len(group2_data)}")
        
        # Check if PyMC3 is available for full Bayesian analysis
        if self.pymc_available:
            return self._perform_pymc_ttest(
                group1_data, group2_data, groups, 
                rope_width, credible_interval, n_samples
            )
        else:
            return self._perform_compatibility_ttest(
                group1_data, group2_data, groups, 
                rope_width, credible_interval
            )
    
    def _perform_pymc_ttest(self, group1_data: np.ndarray, group2_data: np.ndarray,
                          groups: np.ndarray, rope_width: float,
                          credible_interval: float, n_samples: int) -> Dict[str, Any]:
        """Perform Bayesian t-test using PyMC3."""
        # Create PyMC3 model
        with pm.Model() as model:
            # Priors
            group1_mean = pm.Normal('group1_mean', mu=0, sigma=10)
            group2_mean = pm.Normal('group2_mean', mu=0, sigma=10)
            
            group1_std = pm.HalfNormal('group1_std', sigma=10)
            group2_std = pm.HalfNormal('group2_std', sigma=10)
            
            # Likelihood
            group1_obs = pm.Normal('group1_obs', mu=group1_mean, sigma=group1_std, observed=group1_data)
            group2_obs = pm.Normal('group2_obs', mu=group2_mean, sigma=group2_std, observed=group2_data)
            
            # Calculate effect size
            diff = pm.Deterministic('diff', group1_mean - group2_mean)
            pooled_std = pm.Deterministic('pooled_std', pm.math.sqrt((group1_std**2 + group2_std**2) / 2))
            effect_size = pm.Deterministic('effect_size', diff / pooled_std)
            
            # Sample from the posterior
            trace = pm.sample(n_samples, return_inferencedata=True)
        
        # Calculate summary statistics
        summary = az.summary(trace, var_names=['group1_mean', 'group2_mean', 'diff', 'effect_size'])
        
        # Calculate probabilities
        effect_samples = trace.posterior['effect_size'].values.flatten()
        
        # Probability of direction (that the effect is positive)
        prob_direction = np.mean(effect_samples > 0)
        prob_direction = max(prob_direction, 1 - prob_direction)  # Always report > 0.5
        
        # Probability of practical significance (outside ROPE)
        rope_lower = -rope_width
        rope_upper = rope_width
        prob_rope = np.mean((effect_samples >= rope_lower) & (effect_samples <= rope_upper))
        prob_significant = 1 - prob_rope
        
        # Extract posterior samples
        posterior_samples = {
            'group1_mean': trace.posterior['group1_mean'].values.flatten().tolist(),
            'group2_mean': trace.posterior['group2_mean'].values.flatten().tolist(),
            'diff': trace.posterior['diff'].values.flatten().tolist(),
            'effect_size': effect_samples.tolist()
        }
        
        # Generate a unique model ID
        model_id = str(uuid.uuid4())
        
        # Save the model
        model_path = os.path.join(self.models_dir, f"{model_id}.pkl")
        with open(model_path, 'wb') as f:
            pickle.dump({
                'trace': trace,
                'model_info': {
                    'type': 'bayesian_ttest',
                    'groups': [str(g) for g in groups],
                    'date_created': datetime.now().isoformat(),
                    'parameters': {
                        'rope_width': rope_width,
                        'credible_interval': credible_interval,
                        'n_samples': n_samples
                    }
                }
            }, f)
        
        # Create results dictionary
        results = {
            'model_id': model_id,
            'model': 'bayesian_ttest',
            'groups': [str(g) for g in groups],
            'statistics': {
                'group1_mean': {
                    'mean': float(summary.loc['group1_mean', 'mean']),
                    'sd': float(summary.loc['group1_mean', 'sd']),
                    'hdi_lower': float(summary.loc['group1_mean', f'hdi_{int(credible_interval * 100)}%_lower']),
                    'hdi_upper': float(summary.loc['group1_mean', f'hdi_{int(credible_interval * 100)}%_upper'])
                },
                'group2_mean': {
                    'mean': float(summary.loc['group2_mean', 'mean']),
                    'sd': float(summary.loc['group2_mean', 'sd']),
                    'hdi_lower': float(summary.loc['group2_mean', f'hdi_{int(credible_interval * 100)}%_lower']),
                    'hdi_upper': float(summary.loc['group2_mean', f'hdi_{int(credible_interval * 100)}%_upper'])
                },
                'diff': {
                    'mean': float(summary.loc['diff', 'mean']),
                    'sd': float(summary.loc['diff', 'sd']),
                    'hdi_lower': float(summary.loc['diff', f'hdi_{int(credible_interval * 100)}%_lower']),
                    'hdi_upper': float(summary.loc['diff', f'hdi_{int(credible_interval * 100)}%_upper'])
                },
                'effect_size': {
                    'mean': float(summary.loc['effect_size', 'mean']),
                    'sd': float(summary.loc['effect_size', 'sd']),
                    'hdi_lower': float(summary.loc['effect_size', f'hdi_{int(credible_interval * 100)}%_lower']),
                    'hdi_upper': float(summary.loc['effect_size', f'hdi_{int(credible_interval * 100)}%_upper'])
                }
            },
            'probabilities': {
                'direction': float(prob_direction),
                'in_rope': float(prob_rope),
                'significant': float(prob_significant)
            },
            'samples': posterior_samples,
            'analysis_type': 'bayesian_ttest'
        }
        
        # Add interpretation
        results['interpretation'] = self._interpret_bayesian_ttest(
            results['probabilities']['direction'],
            results['probabilities']['in_rope'],
            results['statistics']
        )
        
        return results
    
    def _perform_compatibility_ttest(self, group1_data: np.ndarray, group2_data: np.ndarray,
                                   groups: np.ndarray, rope_width: float,
                                   credible_interval: float) -> Dict[str, Any]:
        """
        Perform simplified Bayesian t-test when PyMC3 is not available.
        This uses a more straightforward approach but still provides Bayesian-inspired insights.
        """
        # Calculate basic statistics
        group1_mean = np.mean(group1_data)
        group2_mean = np.mean(group2_data)
        group1_std = np.std(group1_data, ddof=1)
        group2_std = np.std(group2_data, ddof=1)
        
        # Calculate difference and effect size
        diff = group1_mean - group2_mean
        pooled_std = np.sqrt((group1_std**2 + group2_std**2) / 2)
        effect_size = diff / pooled_std
        
        # Perform classical t-test
        from scipy import stats
        t_stat, p_value = stats.ttest_ind(group1_data, group2_data, equal_var=False)
        
        # Calculate confidence intervals (as an approximation to credible intervals)
        n1, n2 = len(group1_data), len(group2_data)
        
        # Group means CIs
        group1_sem = group1_std / np.sqrt(n1)
        group2_sem = group2_std / np.sqrt(n2)
        group1_ci = stats.t.interval(credible_interval, n1-1, loc=group1_mean, scale=group1_sem)
        group2_ci = stats.t.interval(credible_interval, n2-1, loc=group2_mean, scale=group2_sem)
        
        # Difference CI
        diff_sem = np.sqrt(group1_sem**2 + group2_sem**2)
        diff_ci = stats.t.interval(credible_interval, min(n1-1, n2-1), loc=diff, scale=diff_sem)
        
        # Effect size CI (approximation)
        es_sem = np.sqrt((effect_size**2) * (1/(2*(n1+n2-2)) + effect_size**2/(2*(n1+n2))))
        es_ci = stats.t.interval(credible_interval, min(n1-1, n2-1), loc=effect_size, scale=es_sem)
        
        # Calculate probabilities
        if effect_size > 0:
            prob_direction = 1 - p_value / 2  # Approximate
        else:
            prob_direction = p_value / 2
        
        prob_direction = max(prob_direction, 1 - prob_direction)  # Always report > 0.5
        
        # Probability of practical significance (outside ROPE)
        # This is a crude approximation in compatibility mode
        if abs(effect_size) <= rope_width:
            prob_rope = 0.8  # High probability in ROPE if effect size is small
            prob_significant = 0.2
        elif abs(effect_size) <= 2 * rope_width:
            prob_rope = 0.5  # Moderate probability if somewhat near ROPE
            prob_significant = 0.5
        else:
            prob_rope = 0.2  # Low probability in ROPE if effect size is large
            prob_significant = 0.8
        
        # Create simplified posterior samples using bootstrap
        n_samples = 1000
        g1_samples = np.random.choice(group1_data, size=(n_samples, len(group1_data)), replace=True)
        g2_samples = np.random.choice(group2_data, size=(n_samples, len(group2_data)), replace=True)
        
        g1_means = np.mean(g1_samples, axis=1)
        g2_means = np.mean(g2_samples, axis=1)
        sample_diffs = g1_means - g2_means
        
        # Calculate sample effect sizes (simplified)
        g1_stds = np.std(g1_samples, axis=1, ddof=1)
        g2_stds = np.std(g2_samples, axis=1, ddof=1)
        pooled_stds = np.sqrt((g1_stds**2 + g2_stds**2) / 2)
        sample_effect_sizes = sample_diffs / pooled_stds
        
        posterior_samples = {
            'group1_mean': g1_means.tolist(),
            'group2_mean': g2_means.tolist(),
            'diff': sample_diffs.tolist(),
            'effect_size': sample_effect_sizes.tolist()
        }
        
        # Generate a unique analysis ID
        analysis_id = str(uuid.uuid4())
        
        # Create results dictionary
        results = {
            'model_id': analysis_id,
            'model': 'bayesian_ttest_compatibility',
            'groups': [str(g) for g in groups],
            'statistics': {
                'group1_mean': {
                    'mean': float(group1_mean),
                    'sd': float(group1_std / np.sqrt(n1)),  # standard error
                    'hdi_lower': float(group1_ci[0]),
                    'hdi_upper': float(group1_ci[1])
                },
                'group2_mean': {
                    'mean': float(group2_mean),
                    'sd': float(group2_std / np.sqrt(n2)),  # standard error
                    'hdi_lower': float(group2_ci[0]),
                    'hdi_upper': float(group2_ci[1])
                },
                'diff': {
                    'mean': float(diff),
                    'sd': float(diff_sem),
                    'hdi_lower': float(diff_ci[0]),
                    'hdi_upper': float(diff_ci[1])
                },
                'effect_size': {
                    'mean': float(effect_size),
                    'sd': float(es_sem),
                    'hdi_lower': float(es_ci[0]),
                    'hdi_upper': float(es_ci[1])
                },
                'frequentist': {
                    't_statistic': float(t_stat),
                    'p_value': float(p_value),
                    'df': float(min(n1-1, n2-1))
                }
            },
            'probabilities': {
                'direction': float(prob_direction),
                'in_rope': float(prob_rope),
                'significant': float(prob_significant)
            },
            'samples': posterior_samples,
            'compatibility_mode': True,
            'analysis_type': 'bayesian_ttest'
        }
        
        # Add interpretation
        results['interpretation'] = self._interpret_bayesian_ttest(
            results['probabilities']['direction'],
            results['probabilities']['in_rope'],
            results['statistics']
        )
        
        return results
    
    def _interpret_bayesian_ttest(self, prob_direction: float, prob_rope: float, 
                                summary: Dict[str, Any]) -> Dict[str, str]:
        """Generate interpretation for Bayesian t-test results."""
        effect_size = summary['effect_size']['mean']
        
        # Direction of effect
        if prob_direction > 0.95:
            direction = "strong evidence"
        elif prob_direction > 0.9:
            direction = "moderate evidence"
        else:
            direction = "weak evidence"
            
        # Practical significance
        if prob_rope > 0.9:
            significance = "strong evidence for practical equivalence"
        elif prob_rope > 0.75:
            significance = "moderate evidence for practical equivalence"
        elif 1 - prob_rope > 0.9:
            significance = "strong evidence for practical difference"
        elif 1 - prob_rope > 0.75:
            significance = "moderate evidence for practical difference"
        else:
            significance = "inconclusive evidence regarding practical significance"
        
        # Effect size description
        if abs(effect_size) < 0.2:
            effect_description = "negligible"
        elif abs(effect_size) < 0.5:
            effect_description = "small"
        elif abs(effect_size) < 0.8:
            effect_description = "medium"
        else:
            effect_description = "large"
            
        # Main interpretation
        main_interp = (
            f"The analysis shows {direction} that the effect is "
            f"{'positive' if effect_size > 0 else 'negative'} "
            f"with a {effect_description} effect size (d = {effect_size:.2f}). "
            f"There is {significance}."
        )
        
        # Additional context
        difference = summary['diff']['mean']
        diff_lower = summary['diff']['hdi_lower']
        diff_upper = summary['diff']['hdi_upper']
        
        context = (
            f"The estimated difference between groups is {difference:.2f} "
            f"[{diff_lower:.2f}, {diff_upper:.2f}]. "
        )
        
        # Guidance on usage
        guidance = (
            "Bayesian analysis provides direct probability statements about parameters "
            "rather than dichotomous reject/fail-to-reject decisions. The evidence for "
            "an effect should be considered along with its practical significance in "
            "your specific context."
        )
        
        return {
            'main': main_interp,
            'context': context,
            'guidance': guidance
        }
    
    @safe_operation
    def perform_bayesian_correlation(self, data: pd.DataFrame, 
                                   var1: str, var2: str,
                                   rope_width: float = 0.1,
                                   credible_interval: float = 0.95,
                                   n_samples: int = 2000) -> Dict[str, Any]:
        """
        Perform Bayesian correlation analysis.
        
        Args:
            data: Input DataFrame
            var1: First variable name
            var2: Second variable name
            rope_width: Region of practical equivalence
            credible_interval: Credible interval size (0-1)
            n_samples: Number of MCMC samples
            
        Returns:
            Dictionary containing analysis results
        """
        # Check if required columns exist
        if var1 not in data.columns:
            raise ValueError(f"Variable '{var1}' not found in data")
        if var2 not in data.columns:
            raise ValueError(f"Variable '{var2}' not found in data")
        
        # Extract paired data, removing any rows with NaN
        paired_data = data[[var1, var2]].dropna()
        x = paired_data[var1].values
        y = paired_data[var2].values
        
        # Check if we have enough data
        if len(x) < 5:
            raise ValueError(f"Need at least 5 observations, but found {len(x)}")
        
        # Check if PyMC3 is available for full Bayesian analysis
        if self.pymc_available:
            return self._perform_pymc_correlation(
                x, y, var1, var2, rope_width, credible_interval, n_samples
            )
        else:
            return self._perform_compatibility_correlation(
                x, y, var1, var2, rope_width, credible_interval
            )
    
    def _perform_pymc_correlation(self, x: np.ndarray, y: np.ndarray,
                                var1: str, var2: str, rope_width: float,
                                credible_interval: float, n_samples: int) -> Dict[str, Any]:
        """Perform Bayesian correlation using PyMC3."""
        # Standardize data
        x_std = (x - np.mean(x)) / np.std(x)
        y_std = (y - np.mean(y)) / np.std(y)
        
        # Create PyMC3 model
        with pm.Model() as model:
            # Prior for correlation coefficient (using Beta distribution transformed to [-1, 1])
            beta = pm.Beta('beta', alpha=2, beta=2)
            rho = pm.Deterministic('rho', 2 * beta - 1)  # Transform to [-1, 1]
            
            # Likelihood (multivariate normal)
            mu = np.zeros(2)
            cov = pm.math.stack([
                [1, rho],
                [rho, 1]
            ])
            
            observed = np.column_stack((x_std, y_std))
            pm.MvNormal('likelihood', mu=mu, cov=cov, observed=observed)
            
            # Sample from the posterior
            trace = pm.sample(n_samples, return_inferencedata=True)
        
        # Calculate summary statistics
        summary = az.summary(trace, var_names=['rho'])
        
        # Calculate probabilities
        rho_samples = trace.posterior['rho'].values.flatten()
        
        # Probability of direction (that correlation is positive)
        prob_direction = np.mean(rho_samples > 0)
        prob_direction = max(prob_direction, 1 - prob_direction)  # Always report > 0.5
        
        # Probability of practical significance (outside ROPE)
        rope_lower = -rope_width
        rope_upper = rope_width
        prob_rope = np.mean((rho_samples >= rope_lower) & (rho_samples <= rope_upper))
        prob_significant = 1 - prob_rope
        
        # Calculate Bayes factor (approximate)
        bf10 = self._compute_correlation_bayes_factor(x, y)
        
        # Extract posterior samples
        posterior_samples = {
            'rho': rho_samples.tolist()
        }
        
        # Generate a unique model ID
        model_id = str(uuid.uuid4())
        
        # Save the model
        model_path = os.path.join(self.models_dir, f"{model_id}.pkl")
        with open(model_path, 'wb') as f:
            pickle.dump({
                'trace': trace,
                'model_info': {
                    'type': 'bayesian_correlation',
                    'variables': [var1, var2],
                    'date_created': datetime.now().isoformat(),
                    'parameters': {
                        'rope_width': rope_width,
                        'credible_interval': credible_interval,
                        'n_samples': n_samples
                    }
                }
            }, f)
        
        # Create results dictionary
        results = {
            'model_id': model_id,
            'model': 'bayesian_correlation',
            'variables': [var1, var2],
            'statistics': {
                'rho': {
                    'mean': float(summary.loc['rho', 'mean']),
                    'sd': float(summary.loc['rho', 'sd']),
                    'hdi_lower': float(summary.loc['rho', f'hdi_{int(credible_interval * 100)}%_lower']),
                    'hdi_upper': float(summary.loc['rho', f'hdi_{int(credible_interval * 100)}%_upper'])
                }
            },
            'probabilities': {
                'direction': float(prob_direction),
                'in_rope': float(prob_rope),
                'significant': float(prob_significant)
            },
            'bayes_factor': float(bf10),
            'samples': posterior_samples,
            'analysis_type': 'bayesian_correlation'
        }
        
        # Add interpretation
        results['interpretation'] = self._interpret_bayesian_correlation(
            prob_direction, prob_rope, bf10, results['statistics']['rho']['mean']
        )
        
        return results
    
    def _perform_compatibility_correlation(self, x: np.ndarray, y: np.ndarray,
                                         var1: str, var2: str, rope_width: float,
                                         credible_interval: float) -> Dict[str, Any]:
        """
        Perform simplified Bayesian correlation when PyMC3 is not available.
        This uses a more straightforward approach but still provides Bayesian-inspired insights.
        """
        # Calculate correlation coefficient
        from scipy import stats
        r, p_value = stats.pearsonr(x, y)
        
        # Calculate sample size
        n = len(x)
        
        # Fisher transformation for confidence interval
        z = np.arctanh(r)
        z_se = 1 / np.sqrt(n - 3)
        
        # Calculate confidence interval (as an approximation to credible interval)
        z_crit = stats.norm.ppf((1 + credible_interval) / 2)
        z_lower = z - z_crit * z_se
        z_upper = z + z_crit * z_se
        
        # Transform back to correlation scale
        r_lower = np.tanh(z_lower)
        r_upper = np.tanh(z_upper)
        
        # Calculate Bayes factor
        bf10 = self._compute_correlation_bayes_factor(x, y)
        
        # Calculate probabilities
        if r > 0:
            prob_direction = 1 - p_value / 2  # Approximate
        else:
            prob_direction = p_value / 2
        
        prob_direction = max(prob_direction, 1 - prob_direction)  # Always report > 0.5
        
        # Probability of practical significance (outside ROPE)
        # This is a crude approximation in compatibility mode
        if abs(r) <= rope_width:
            prob_rope = 0.8  # High probability in ROPE if correlation is small
            prob_significant = 0.2
        elif abs(r) <= 2 * rope_width:
            prob_rope = 0.5  # Moderate probability if somewhat near ROPE
            prob_significant = 0.5
        else:
            prob_rope = 0.2  # Low probability in ROPE if correlation is large
            prob_significant = 0.8
        
        # Create simplified posterior samples using bootstrap
        n_samples = 1000
        indices = np.random.choice(n, size=(n_samples, n), replace=True)
        r_samples = np.array([
            stats.pearsonr(x[idx], y[idx])[0] for idx in indices
        ])
        
        # Generate a unique analysis ID
        analysis_id = str(uuid.uuid4())
        
        # Create results dictionary
        results = {
            'model_id': analysis_id,
            'model': 'bayesian_correlation_compatibility',
            'variables': [var1, var2],
            'statistics': {
                'rho': {
                    'mean': float(r),
                    'sd': float(z_se / (1 - r**2)),  # approximation
                    'hdi_lower': float(r_lower),
                    'hdi_upper': float(r_upper)
                },
                'frequentist': {
                    'r': float(r),
                    'p_value': float(p_value),
                    'n': int(n)
                }
            },
            'probabilities': {
                'direction': float(prob_direction),
                'in_rope': float(prob_rope),
                'significant': float(prob_significant)
            },
            'bayes_factor': float(bf10),
            'samples': {
                'rho': r_samples.tolist()
            },
            'compatibility_mode': True,
            'analysis_type': 'bayesian_correlation'
        }
        
        # Add interpretation
        results['interpretation'] = self._interpret_bayesian_correlation(
            prob_direction, prob_rope, bf10, r
        )
        
        return results
    
    def _compute_correlation_bayes_factor(self, x: np.ndarray, y: np.ndarray) -> float:
        """
        Compute Bayes factor for correlation (BF10).
        
        This uses the Jeffreys-Zellner-Siow approach for calculating Bayes factor,
        comparing H1 (correlation exists) to H0 (no correlation).
        """
        n = len(x)
        r = np.corrcoef(x, y)[0, 1]
        
        # Calculate Bayes factor using analytical approximation
        r_squared = r**2
        bf10 = np.sqrt((n/2) * np.pi) * (1 - r_squared)**((n-1)/2-1)
        
        # Ensure BF10 is at least 1/100 and at most 100 for numerical stability
        return max(min(bf10, 100), 0.01)
    
    def _interpret_bayesian_correlation(self, prob_direction: float, prob_rope: float, 
                                      bf10: float, rho: float) -> Dict[str, str]:
        """Generate interpretation for Bayesian correlation results."""
        # Direction of effect
        if prob_direction > 0.95:
            direction = "strong evidence"
        elif prob_direction > 0.9:
            direction = "moderate evidence"
        else:
            direction = "weak evidence"
            
        # Practical significance
        if prob_rope > 0.9:
            significance = "strong evidence for practical equivalence"
        elif prob_rope > 0.75:
            significance = "moderate evidence for practical equivalence"
        elif 1 - prob_rope > 0.9:
            significance = "strong evidence for practical significance"
        elif 1 - prob_rope > 0.75:
            significance = "moderate evidence for practical significance"
        else:
            significance = "inconclusive evidence regarding practical significance"
        
        # Bayes factor interpretation
        if bf10 > 100:
            bf_interpretation = "extreme evidence for correlation"
        elif bf10 > 30:
            bf_interpretation = "very strong evidence for correlation"
        elif bf10 > 10:
            bf_interpretation = "strong evidence for correlation"
        elif bf10 > 3:
            bf_interpretation = "moderate evidence for correlation"
        elif bf10 > 1:
            bf_interpretation = "anecdotal evidence for correlation"
        elif bf10 > 1/3:
            bf_interpretation = "anecdotal evidence for the null hypothesis"
        elif bf10 > 1/10:
            bf_interpretation = "moderate evidence for the null hypothesis"
        else:
            bf_interpretation = "strong evidence for the null hypothesis"
        
        # Correlation strength description
        if abs(rho) < 0.1:
            correlation_strength = "negligible"
        elif abs(rho) < 0.3:
            correlation_strength = "weak"
        elif abs(rho) < 0.5:
            correlation_strength = "moderate"
        elif abs(rho) < 0.7:
            correlation_strength = "strong"
        else:
            correlation_strength = "very strong"
            
        # Main interpretation
        main_interp = (
            f"The analysis shows {direction} that the correlation is "
            f"{'positive' if rho > 0 else 'negative'} "
            f"with a {correlation_strength} correlation coefficient (ρ = {rho:.2f}). "
            f"The Bayes factor (BF10 = {bf10:.2f}) indicates {bf_interpretation}. "
            f"There is {significance}."
        )
        
        # Guidance on usage
        guidance = (
            "Bayesian correlation analysis provides a probabilistic framework for "
            "assessing the strength and direction of relationships between variables. "
            "The Bayes factor quantifies how much more likely the data are under "
            "the alternative hypothesis (correlation exists) compared to the null "
            "hypothesis (no correlation)."
        )
        
        return {
            'main': main_interp,
            'guidance': guidance
        }
    
    @safe_operation
    def perform_bayesian_regression(self, data: pd.DataFrame, 
                                  target: str, predictors: List[str],
                                  credible_interval: float = 0.95,
                                  n_samples: int = 2000) -> Dict[str, Any]:
        """
        Perform Bayesian linear regression.
        
        Args:
            data: Input DataFrame
            target: Target variable name
            predictors: List of predictor variable names
            credible_interval: Credible interval size (0-1)
            n_samples: Number of MCMC samples
            
        Returns:
            Dictionary containing analysis results
        """
        # Check if required columns exist
        if target not in data.columns:
            raise ValueError(f"Target variable '{target}' not found in data")
            
        missing_predictors = [p for p in predictors if p not in data.columns]
        if missing_predictors:
            raise ValueError(f"Predictor variables {missing_predictors} not found in data")
        
        # Extract data
        data_clean = data[[target] + predictors].dropna()
        X = data_clean[predictors]
        y = data_clean[target]
        
        # Check if we have enough data
        if len(X) < len(predictors) + 2:
            raise ValueError(f"Need at least {len(predictors) + 2} observations, but found {len(X)}")
        
        # Check if PyMC3 is available for full Bayesian analysis
        if self.pymc_available:
            return self._perform_pymc_regression(
                X, y, target, predictors, credible_interval, n_samples
            )
        else:
            return self._perform_compatibility_regression(
                X, y, target, predictors, credible_interval
            )
    
    def _perform_pymc_regression(self, X: pd.DataFrame, y: pd.Series,
                               target: str, predictors: List[str],
                               credible_interval: float, n_samples: int) -> Dict[str, Any]:
        """Perform Bayesian linear regression using PyMC3."""
        # Standardize predictors for better sampling
        X_std = (X - X.mean()) / X.std()
        
        # Create PyMC3 model
        with pm.Model() as model:
            # Priors for coefficients
            alpha = pm.Normal('alpha', mu=0, sigma=10)  # Intercept
            betas = {}
            for predictor in predictors:
                betas[predictor] = pm.Normal(f'beta_{predictor}', mu=0, sigma=10)
            
            # Prior for error
            sigma = pm.HalfNormal('sigma', sigma=10)
            
            # Expected value
            mu = alpha
            for predictor in predictors:
                mu = mu + betas[predictor] * X_std[predictor].values
            
            # Likelihood
            likelihood = pm.Normal('likelihood', mu=mu, sigma=sigma, observed=y.values)
            
            # Sample from the posterior
            trace = pm.sample(n_samples, return_inferencedata=True)
        
        # Calculate summary statistics
        var_names = ['alpha'] + [f'beta_{predictor}' for predictor in predictors] + ['sigma']
        summary = az.summary(trace, var_names=var_names)
        
        # Calculate R-squared (Bayesian version)
        y_pred = trace.posterior['alpha'].values.mean()
        for predictor in predictors:
            y_pred += trace.posterior[f'beta_{predictor}'].values.mean() * X_std[predictor].values
        
        # Calculate proportion of variance explained
        ss_total = np.sum((y.values - np.mean(y.values))**2)
        ss_residual = np.sum((y.values - y_pred)**2)
        r_squared = 1 - ss_residual / ss_total
        
        # Calculate probabilities for each coefficient
        coef_probabilities = {}
        for predictor in predictors:
            beta_samples = trace.posterior[f'beta_{predictor}'].values.flatten()
            
            # Probability of direction (that the coefficient is positive)
            prob_direction = np.mean(beta_samples > 0)
            prob_direction = max(prob_direction, 1 - prob_direction)  # Always report > 0.5
            
            # Probability of practical significance (outside ROPE)
            rope_width = 0.1  # Small effect size threshold
            rope_lower = -rope_width
            rope_upper = rope_width
            prob_rope = np.mean((beta_samples >= rope_lower) & (beta_samples <= rope_upper))
            prob_significant = 1 - prob_rope
            
            coef_probabilities[predictor] = {
                'direction': float(prob_direction),
                'in_rope': float(prob_rope),
                'significant': float(prob_significant)
            }
        
        # Extract posterior samples
        posterior_samples = {
            'alpha': trace.posterior['alpha'].values.flatten().tolist(),
            'sigma': trace.posterior['sigma'].values.flatten().tolist()
        }
        
        for predictor in predictors:
            posterior_samples[f'beta_{predictor}'] = trace.posterior[f'beta_{predictor}'].values.flatten().tolist()
        
        # Generate a unique model ID
        model_id = str(uuid.uuid4())
        
        # Save the model
        model_path = os.path.join(self.models_dir, f"{model_id}.pkl")
        with open(model_path, 'wb') as f:
            pickle.dump({
                'trace': trace,
                'model_info': {
                    'type': 'bayesian_regression',
                    'target': target,
                    'predictors': predictors,
                    'date_created': datetime.now().isoformat(),
                    'parameters': {
                        'credible_interval': credible_interval,
                        'n_samples': n_samples
                    },
                    'X_std_params': {
                        'mean': X.mean().to_dict(),
                        'std': X.std().to_dict()
                    }
                }
            }, f)
        
        # Create coefficient statistics
        coefficient_stats = {
            'alpha': {
                'mean': float(summary.loc['alpha', 'mean']),
                'sd': float(summary.loc['alpha', 'sd']),
                'hdi_lower': float(summary.loc['alpha', f'hdi_{int(credible_interval * 100)}%_lower']),
                'hdi_upper': float(summary.loc['alpha', f'hdi_{int(credible_interval * 100)}%_upper'])
            }
        }
        
        for predictor in predictors:
            beta_key = f'beta_{predictor}'
            coefficient_stats[predictor] = {
                'mean': float(summary.loc[beta_key, 'mean']),
                'sd': float(summary.loc[beta_key, 'sd']),
                'hdi_lower': float(summary.loc[beta_key, f'hdi_{int(credible_interval * 100)}%_lower']),
                'hdi_upper': float(summary.loc[beta_key, f'hdi_{int(credible_interval * 100)}%_upper'])
            }
        
        # Create results dictionary
        results = {
            'model_id': model_id,
            'model': 'bayesian_regression',
            'target': target,
            'predictors': predictors,
            'statistics': {
                'coefficients': coefficient_stats,
                'sigma': {
                    'mean': float(summary.loc['sigma', 'mean']),
                    'sd': float(summary.loc['sigma', 'sd']),
                    'hdi_lower': float(summary.loc['sigma', f'hdi_{int(credible_interval * 100)}%_lower']),
                    'hdi_upper': float(summary.loc['sigma', f'hdi_{int(credible_interval * 100)}%_upper'])
                },
                'r_squared': float(r_squared)
            },
            'coef_probabilities': coef_probabilities,
            'samples': posterior_samples,
            'analysis_type': 'bayesian_regression'
        }
        
        # Add interpretation
        results['interpretation'] = self._interpret_bayesian_regression(
            coef_probabilities, r_squared, coefficient_stats
        )
        
        return results
    
    def _perform_compatibility_regression(self, X: pd.DataFrame, y: pd.Series,
                                        target: str, predictors: List[str],
                                        credible_interval: float) -> Dict[str, Any]:
        """
        Perform simplified Bayesian regression when PyMC3 is not available.
        This uses classical regression but adds Bayesian-inspired interpretations.
        """
        # Standardize predictors for better comparison
        X_std = (X - X.mean()) / X.std()
        
        # Fit classical regression model
        from sklearn.linear_model import LinearRegression
        model = LinearRegression()
        model.fit(X_std, y)
        
        # Calculate predictions and R-squared
        y_pred = model.predict(X_std)
        r_squared = model.score(X_std, y)
        
        # Calculate residual standard deviation
        residuals = y - y_pred
        sigma = np.std(residuals, ddof=X.shape[1] + 1)
        
        # Calculate standard errors for coefficients
        from scipy import stats
        n = len(X)
        p = len(predictors)
        dof = n - p - 1
        
        # Create X matrix with intercept
        X_matrix = np.column_stack((np.ones(n), X_std.values))
        
        # Calculate covariance matrix of coefficients
        mse = np.sum(residuals**2) / dof
        Xinv = np.linalg.pinv(X_matrix.T @ X_matrix)
        coef_cov = Xinv * mse
        
        # Extract standard errors
        se = np.sqrt(np.diag(coef_cov))
        
        # Calculate t-statistics and p-values
        intercept_tstat = model.intercept_ / se[0]
        intercept_pval = 2 * (1 - stats.t.cdf(np.abs(intercept_tstat), dof))
        
        coef_tstats = model.coef_ / se[1:]
        coef_pvals = 2 * (1 - stats.t.cdf(np.abs(coef_tstats), dof))
        
        # Calculate confidence intervals
        alpha = 1 - credible_interval
        t_critical = stats.t.ppf(1 - alpha/2, dof)
        
        intercept_ci = (
            model.intercept_ - t_critical * se[0],
            model.intercept_ + t_critical * se[0]
        )
        
        coef_cis = []
        for i, coef in enumerate(model.coef_):
            coef_cis.append((
                coef - t_critical * se[i+1],
                coef + t_critical * se[i+1]
            ))
        
        # Calculate probabilities for each coefficient
        coef_probabilities = {}
        for i, predictor in enumerate(predictors):
            # Probability of direction (that the coefficient is positive)
            if model.coef_[i] > 0:
                prob_direction = 1 - coef_pvals[i] / 2
            else:
                prob_direction = coef_pvals[i] / 2
                
            prob_direction = max(prob_direction, 1 - prob_direction)  # Always report > 0.5
            
            # Probability of practical significance (outside ROPE)
            # This is a crude approximation in compatibility mode
            coef_std = model.coef_[i] / np.std(X[predictor])  # Standardized coefficient
            rope_width = 0.1  # Small effect size threshold
            
            if abs(coef_std) <= rope_width:
                prob_rope = 0.8  # High probability in ROPE if coefficient is small
                prob_significant = 0.2
            elif abs(coef_std) <= 2 * rope_width:
                prob_rope = 0.5  # Moderate probability if somewhat near ROPE
                prob_significant = 0.5
            else:
                prob_rope = 0.2  # Low probability in ROPE if coefficient is large
                prob_significant = 0.8
            
            coef_probabilities[predictor] = {
                'direction': float(prob_direction),
                'in_rope': float(prob_rope),
                'significant': float(prob_significant)
            }
        
        # Create simplified posterior samples using bootstrap
        n_samples = 1000
        indices = np.random.choice(n, size=(n_samples, n), replace=True)
        
        posterior_samples = {
            'alpha': [],
            'sigma': []
        }
        
        for predictor in predictors:
            posterior_samples[f'beta_{predictor}'] = []
        
        # Perform bootstrap for parameter estimates
        for idx in indices:
            X_boot = X_std.iloc[idx]
            y_boot = y.iloc[idx]
            
            model_boot = LinearRegression()
            model_boot.fit(X_boot, y_boot)
            
            posterior_samples['alpha'].append(float(model_boot.intercept_))
            
            for i, predictor in enumerate(predictors):
                posterior_samples[f'beta_{predictor}'].append(float(model_boot.coef_[i]))
            
            # Calculate sigma for this bootstrap sample
            y_pred_boot = model_boot.predict(X_boot)
            residuals_boot = y_boot - y_pred_boot
            sigma_boot = np.std(residuals_boot, ddof=X.shape[1] + 1)
            posterior_samples['sigma'].append(float(sigma_boot))
        
        # Generate a unique analysis ID
        analysis_id = str(uuid.uuid4())
        
        # Create coefficient statistics
        coefficient_stats = {
            'alpha': {
                'mean': float(model.intercept_),
                'sd': float(se[0]),
                'hdi_lower': float(intercept_ci[0]),
                'hdi_upper': float(intercept_ci[1])
            }
        }
        
        for i, predictor in enumerate(predictors):
            coefficient_stats[predictor] = {
                'mean': float(model.coef_[i]),
                'sd': float(se[i+1]),
                'hdi_lower': float(coef_cis[i][0]),
                'hdi_upper': float(coef_cis[i][1])
            }
        
        # Create results dictionary
        results = {
            'model_id': analysis_id,
            'model': 'bayesian_regression_compatibility',
            'target': target,
            'predictors': predictors,
            'statistics': {
                'coefficients': coefficient_stats,
                'sigma': {
                    'mean': float(sigma),
                    'sd': float(sigma / np.sqrt(2 * dof)),  # approximate
                    'hdi_lower': float(sigma * np.sqrt(dof / stats.chi2.ppf(0.975, dof))),
                    'hdi_upper': float(sigma * np.sqrt(dof / stats.chi2.ppf(0.025, dof)))
                },
                'r_squared': float(r_squared),
                'frequentist': {
                    'f_statistic': float(r_squared * (n - p - 1) / ((1 - r_squared) * p)),
                    'f_pvalue': float(1 - stats.f.cdf(r_squared * (n - p - 1) / ((1 - r_squared) * p), p, n - p - 1)),
                    'n': int(n),
                    'p': int(p)
                }
            },
            'coef_probabilities': coef_probabilities,
            'samples': posterior_samples,
            'compatibility_mode': True,
            'analysis_type': 'bayesian_regression'
        }
        
        # Add interpretation
        results['interpretation'] = self._interpret_bayesian_regression(
            coef_probabilities, r_squared, coefficient_stats
        )
        
        return results
    
    def _interpret_bayesian_regression(self, coef_probabilities: Dict[str, Dict[str, float]], 
                                     r_squared: float, 
                                     coefficients: Dict[str, Dict[str, float]]) -> Dict[str, str]:
        """Generate interpretation for Bayesian regression results."""
        # Interpret model fit
        if r_squared > 0.7:
            fit_quality = "very good"
        elif r_squared > 0.5:
            fit_quality = "good"
        elif r_squared > 0.3:
            fit_quality = "moderate"
        else:
            fit_quality = "poor"
            
        # Main interpretation
        main_interp = (
            f"The Bayesian regression model explains {r_squared:.1%} of the variance "
            f"in the outcome variable, which represents a {fit_quality} fit. "
        )
        
        # Find significant predictors
        significant_predictors = [
            (pred, probs) for pred, probs in coef_probabilities.items()
            if probs.get('significant', 0) > 0.75
        ]
        
        if significant_predictors:
            main_interp += "The model identified the following notable predictors: "
            pred_texts = []
            
            for pred, probs in significant_predictors:
                beta = coefficients[pred]['mean']
                direction = "positive" if beta > 0 else "negative"
                
                pred_texts.append(
                    f"{pred} ({direction} effect, {probs['significant']:.1%} probability of significance)"
                )
            
            main_interp += ", ".join(pred_texts) + "."
        else:
            main_interp += (
                "The model did not identify predictors with strong evidence of practical significance. "
                "This suggests either weak relationships between predictors and the outcome, "
                "or insufficient evidence in the data to detect such relationships."
            )
        
        # Add coefficient details
        coef_details = "Coefficient estimates (with 95% credible intervals):\n"
        for name, stats in coefficients.items():
            if name == 'alpha':
                coef_details += f"Intercept: {stats['mean']:.3f} [{stats['hdi_lower']:.3f}, {stats['hdi_upper']:.3f}]\n"
            else:
                coef_details += f"{name}: {stats['mean']:.3f} [{stats['hdi_lower']:.3f}, {stats['hdi_upper']:.3f}]\n"
        
        # Add guidance
        guidance = (
            "Bayesian regression provides posterior distributions for all model parameters, "
            "allowing for direct probability statements about coefficients. Unlike traditional "
            "p-values, these probabilities represent the actual likelihood of effects given the data. "
            "The approach also naturally handles uncertainty in predictions."
        )
        
        return {
            'main': main_interp,
            'coefficient_details': coef_details,
            'guidance': guidance
        }
    
    @safe_operation
    def get_model_info(self, model_id: str) -> Dict[str, Any]:
        """
        Get information about a Bayesian model.
        
        Args:
            model_id: ID of the model
            
        Returns:
            Dictionary with model information
        """
        model_path = os.path.join(self.models_dir, f"{model_id}.pkl")
        if not os.path.exists(model_path):
            raise ValueError(f"Model with ID {model_id} not found")
            
        with open(model_path, 'rb') as f:
            model_data = pickle.load(f)
            
        # Extract basic info without the actual trace
        return {
            'model_id': model_id,
            'model_info': model_data['model_info']
        }
    
    @safe_operation
    def list_models(self) -> List[Dict[str, Any]]:
        """
        List all Bayesian models.
        
        Returns:
            List of dictionaries with model information
        """
        models = []
        
        for filename in os.listdir(self.models_dir):
            if filename.endswith('.pkl'):
                model_id = filename.split('.')[0]
                
                try:
                    model_info = self.get_model_info(model_id)
                    models.append({
                        'id': model_id,
                        'type': model_info['model_info']['type'],
                        'date_created': model_info['model_info'].get('date_created'),
                    })
                except Exception as e:
                    logger.warning(f"Error loading model {model_id}: {str(e)}")
        
        return models
    
    @safe_operation
    def delete_model(self, model_id: str) -> bool:
        """
        Delete a Bayesian model.
        
        Args:
            model_id: ID of the model
            
        Returns:
            True if deletion was successful
        """
        model_path = os.path.join(self.models_dir, f"{model_id}.pkl")
        if not os.path.exists(model_path):
            raise ValueError(f"Model with ID {model_id} not found")
            
        os.remove(model_path)
        
        return True

# Initialize global Bayesian service
bayesian_service = BayesianService()

def get_bayesian_service() -> BayesianService:
    """Get the global Bayesian service instance."""
    return bayesian_service