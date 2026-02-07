"""
Prior Specifications for Bayesian Analysis
==========================================

Provides prior distributions and utilities for Bayesian statistical tests.

The default prior for effect sizes is the Cauchy distribution centered at 0,
following the JZS (Jeffreys-Zellner-Siow) approach.

References:
    Rouder, J. N., et al. (2009). Bayesian t tests.
    Ly, A., et al. (2016). Harold Jeffreys's default Bayes factor hypothesis tests.

Created: December 26, 2025
"""

from typing import Dict, Any, Tuple, Optional
from dataclasses import dataclass
import numpy as np
from scipy import stats


# Standard prior scales for effect size (Cauchy distribution)
PRIOR_SCALES = {
    'ultrawide': {
        'r': np.sqrt(2),  # ≈ 1.414
        'label': 'Ultra-wide',
        'description': 'Expecting very large effects (d > 1.0)',
        'typical_use': 'When prior research suggests very large effects'
    },
    'wide': {
        'r': 1.0,
        'label': 'Wide',
        'description': 'Expecting large effects (d ≈ 0.8)',
        'typical_use': 'When effects are expected to be large'
    },
    'medium': {
        'r': np.sqrt(2) / 2,  # ≈ 0.707
        'label': 'Medium (default)',
        'description': 'Default - moderate effect expectations (d ≈ 0.5)',
        'typical_use': 'General purpose, no strong prior expectations'
    },
    'narrow': {
        'r': 0.5,
        'label': 'Narrow',
        'description': 'Expecting small effects (d ≈ 0.2-0.3)',
        'typical_use': 'When effects are expected to be small'
    },
    'ultranarrow': {
        'r': np.sqrt(2) / 4,  # ≈ 0.354
        'label': 'Ultra-narrow',
        'description': 'Expecting very small effects (d < 0.2)',
        'typical_use': 'When only tiny effects are expected'
    }
}


@dataclass
class Prior:
    """Base class for prior distributions."""
    name: str
    parameters: Dict[str, float]

    def pdf(self, x: np.ndarray) -> np.ndarray:
        """Probability density function."""
        raise NotImplementedError

    def cdf(self, x: np.ndarray) -> np.ndarray:
        """Cumulative distribution function."""
        raise NotImplementedError

    def rvs(self, size: int = 1) -> np.ndarray:
        """Random variates."""
        raise NotImplementedError


@dataclass
class CauchyPrior(Prior):
    """
    Cauchy prior distribution for effect sizes.

    The Cauchy(0, r) prior is the default for effect sizes in Bayesian t-tests.
    It has heavy tails, allowing for a wide range of effect sizes.

    Parameters:
        location: Center of the distribution (typically 0)
        scale: Scale parameter (r), determines the width
    """

    def __init__(self, location: float = 0, scale: float = 0.707):
        self.name = 'cauchy'
        self.parameters = {'location': location, 'scale': scale}
        self.location = location
        self.scale = scale
        self._dist = stats.cauchy(loc=location, scale=scale)

    def pdf(self, x: np.ndarray) -> np.ndarray:
        """Probability density at x."""
        return self._dist.pdf(x)

    def cdf(self, x: np.ndarray) -> np.ndarray:
        """Cumulative probability at x."""
        return self._dist.cdf(x)

    def rvs(self, size: int = 1) -> np.ndarray:
        """Generate random samples."""
        return self._dist.rvs(size=size)

    def __repr__(self):
        return f"Cauchy(location={self.location}, scale={self.scale})"


@dataclass
class NormalPrior(Prior):
    """
    Normal prior distribution.

    Used for some Bayesian analyses where bounded expectations make sense.
    """

    def __init__(self, mean: float = 0, sd: float = 1.0):
        self.name = 'normal'
        self.parameters = {'mean': mean, 'sd': sd}
        self.mean = mean
        self.sd = sd
        self._dist = stats.norm(loc=mean, scale=sd)

    def pdf(self, x: np.ndarray) -> np.ndarray:
        return self._dist.pdf(x)

    def cdf(self, x: np.ndarray) -> np.ndarray:
        return self._dist.cdf(x)

    def rvs(self, size: int = 1) -> np.ndarray:
        return self._dist.rvs(size=size)

    def __repr__(self):
        return f"Normal(mean={self.mean}, sd={self.sd})"


@dataclass
class BetaPrior(Prior):
    """
    Beta prior distribution.

    Used for correlation coefficients and proportions (bounded [0,1]).
    For correlation, often transformed to [-1, 1].
    """

    def __init__(self, alpha: float = 1.0, beta: float = 1.0):
        self.name = 'beta'
        self.parameters = {'alpha': alpha, 'beta': beta}
        self.alpha = alpha
        self.beta = beta
        self._dist = stats.beta(alpha, beta)

    def pdf(self, x: np.ndarray) -> np.ndarray:
        return self._dist.pdf(x)

    def cdf(self, x: np.ndarray) -> np.ndarray:
        return self._dist.cdf(x)

    def rvs(self, size: int = 1) -> np.ndarray:
        return self._dist.rvs(size=size)

    def __repr__(self):
        return f"Beta(alpha={self.alpha}, beta={self.beta})"


def get_prior_description(scale_name: str) -> Dict[str, Any]:
    """
    Get description for a prior scale.

    Args:
        scale_name: One of 'ultrawide', 'wide', 'medium', 'narrow', 'ultranarrow'

    Returns:
        Dictionary with scale parameters and description
    """
    if scale_name.lower() in PRIOR_SCALES:
        return PRIOR_SCALES[scale_name.lower()]
    elif isinstance(scale_name, (int, float)):
        # Custom scale
        return {
            'r': float(scale_name),
            'label': f'Custom (r = {scale_name})',
            'description': 'User-specified prior scale',
            'typical_use': 'Custom analysis'
        }
    else:
        raise ValueError(f"Unknown prior scale: {scale_name}")


def get_prior_scale_value(scale_name: str) -> float:
    """
    Get the numeric scale value for a named prior.

    Args:
        scale_name: Prior name or numeric value

    Returns:
        Numeric scale value (r)
    """
    if isinstance(scale_name, (int, float)):
        return float(scale_name)

    scale_name = scale_name.lower()
    if scale_name in PRIOR_SCALES:
        return PRIOR_SCALES[scale_name]['r']
    else:
        raise ValueError(f"Unknown prior scale: {scale_name}")


def create_effect_size_prior(
    scale: float = 0.707,
    distribution: str = 'cauchy',
    **kwargs
) -> Prior:
    """
    Create a prior distribution for effect size.

    Args:
        scale: Scale parameter (default: medium = sqrt(2)/2)
        distribution: 'cauchy' (default) or 'normal'
        **kwargs: Additional distribution parameters

    Returns:
        Prior distribution object
    """
    if distribution.lower() == 'cauchy':
        return CauchyPrior(location=kwargs.get('location', 0), scale=scale)
    elif distribution.lower() == 'normal':
        return NormalPrior(mean=kwargs.get('mean', 0), sd=scale)
    else:
        raise ValueError(f"Unknown distribution: {distribution}")


def prior_sensitivity_analysis(
    data: np.ndarray,
    scales: list = None,
    test_func: callable = None
) -> Dict[str, float]:
    """
    Perform prior sensitivity analysis.

    Computes Bayes Factors across different prior scales to assess
    robustness of conclusions.

    Args:
        data: Data array
        scales: List of scale values to test (default: standard scales)
        test_func: Function that computes BF given data and scale

    Returns:
        Dictionary mapping scale names to Bayes Factors
    """
    if scales is None:
        scales = [
            ('ultranarrow', PRIOR_SCALES['ultranarrow']['r']),
            ('narrow', PRIOR_SCALES['narrow']['r']),
            ('medium', PRIOR_SCALES['medium']['r']),
            ('wide', PRIOR_SCALES['wide']['r']),
            ('ultrawide', PRIOR_SCALES['ultrawide']['r'])
        ]

    if test_func is None:
        raise ValueError("test_func must be provided")

    results = {}
    for name, r in scales:
        bf = test_func(data, prior_scale=r)
        results[name] = bf

    return results


def visualize_prior(
    prior: Prior,
    x_range: Tuple[float, float] = (-3, 3),
    n_points: int = 200
) -> Dict[str, np.ndarray]:
    """
    Generate data for prior visualization.

    Args:
        prior: Prior distribution object
        x_range: Range for x-axis
        n_points: Number of points

    Returns:
        Dictionary with 'x' and 'y' arrays for plotting
    """
    x = np.linspace(x_range[0], x_range[1], n_points)
    y = prior.pdf(x)

    return {
        'x': x.tolist(),
        'y': y.tolist(),
        'prior_type': prior.name,
        'parameters': prior.parameters
    }


# Informed priors for specific domains
INFORMED_PRIORS = {
    'social_psychology': {
        'description': 'Based on meta-analyses of social psychology effects',
        'effect_size_prior': CauchyPrior(0, 0.4),  # Smaller effects typical
        'reference': 'Richard, Bond, & Stokes-Zoota (2003)'
    },
    'cognitive_psychology': {
        'description': 'Based on cognitive psychology effect sizes',
        'effect_size_prior': CauchyPrior(0, 0.5),
        'reference': 'Lakens (2013)'
    },
    'clinical': {
        'description': 'Based on clinical intervention effects',
        'effect_size_prior': CauchyPrior(0, 0.6),
        'reference': 'Cuijpers et al. (2014)'
    },
    'education': {
        'description': 'Based on educational intervention effects',
        'effect_size_prior': CauchyPrior(0, 0.4),
        'reference': 'Hattie (2009)'
    }
}


def get_informed_prior(domain: str) -> Dict[str, Any]:
    """
    Get an informed prior for a specific research domain.

    Args:
        domain: Research domain name

    Returns:
        Dictionary with prior and reference information
    """
    domain = domain.lower().replace(' ', '_')
    if domain in INFORMED_PRIORS:
        return INFORMED_PRIORS[domain]
    else:
        available = list(INFORMED_PRIORS.keys())
        raise ValueError(f"Unknown domain: {domain}. Available: {available}")
