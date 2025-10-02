"""
Distribution Service - Core mathematical implementations for probability distributions.

This module contains services for calculating and analyzing probability distributions,
preserving the exact mathematical implementations from the original Streamlit application.
"""

import numpy as np
import scipy.stats as stats
from math import factorial, exp, sqrt, pi, gamma, lgamma
import pandas as pd
import logging
from typing import Dict, List, Tuple, Any, Optional, Union

logger = logging.getLogger(__name__)

class DistributionService:
    """
    Service for performing probability distribution calculations and analysis.
    """
    
    @staticmethod
    def create_distribution(distribution_type: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a distribution with the specified type and parameters.
        
        Args:
            distribution_type: Type of distribution (e.g., 'BINOMIAL', 'POISSON', 'NORMAL')
            parameters: Distribution-specific parameters
            
        Returns:
            Distribution properties including parameters and basic statistics
        """
        try:
            distribution_data = {
                'type': distribution_type,
                'parameters': parameters,
                'statistics': {}
            }
            
            # Calculate basic statistics based on distribution type
            if distribution_type == 'BINOMIAL':
                n = parameters.get('n', 10)
                p = parameters.get('p', 0.5)
                
                # Validate parameters
                if n <= 0 or not isinstance(n, int):
                    raise ValueError("Parameter 'n' must be a positive integer")
                if p < 0 or p > 1:
                    raise ValueError("Parameter 'p' must be between 0 and 1")
                
                distribution_data['statistics'] = {
                    'mean': n * p,
                    'variance': n * p * (1 - p),
                    'standard_deviation': np.sqrt(n * p * (1 - p)),
                    'skewness': (1 - 2 * p) / np.sqrt(n * p * (1 - p)),
                    'kurtosis': (1 - 6 * p * (1 - p)) / (n * p * (1 - p))  # Excess kurtosis
                }
                
            elif distribution_type == 'POISSON':
                lambda_val = parameters.get('lambda', 1.0)
                
                # Validate parameters
                if lambda_val <= 0:
                    raise ValueError("Parameter 'lambda' must be positive")
                
                distribution_data['statistics'] = {
                    'mean': lambda_val,
                    'variance': lambda_val,
                    'standard_deviation': np.sqrt(lambda_val),
                    'skewness': 1 / np.sqrt(lambda_val),
                    'kurtosis': 1 / lambda_val  # Excess kurtosis
                }
                
            elif distribution_type == 'NORMAL':
                mu = parameters.get('mu', 0.0)
                sigma = parameters.get('sigma', 1.0)
                
                # Validate parameters
                if sigma <= 0:
                    raise ValueError("Parameter 'sigma' must be positive")
                
                distribution_data['statistics'] = {
                    'mean': mu,
                    'variance': sigma**2,
                    'standard_deviation': sigma,
                    'skewness': 0,
                    'kurtosis': 0  # Excess kurtosis
                }
                
            elif distribution_type == 'EXPONENTIAL':
                rate = parameters.get('rate', 1.0)
                
                # Validate parameters
                if rate <= 0:
                    raise ValueError("Parameter 'rate' must be positive")
                
                distribution_data['statistics'] = {
                    'mean': 1 / rate,
                    'variance': 1 / (rate**2),
                    'standard_deviation': 1 / rate,
                    'skewness': 2,
                    'kurtosis': 6  # Excess kurtosis
                }
                
            elif distribution_type == 'UNIFORM':
                a = parameters.get('a', 0.0)
                b = parameters.get('b', 1.0)
                
                # Validate parameters
                if b <= a:
                    raise ValueError("Parameter 'b' must be greater than 'a'")
                
                distribution_data['statistics'] = {
                    'mean': (a + b) / 2,
                    'variance': (b - a)**2 / 12,
                    'standard_deviation': (b - a) / np.sqrt(12),
                    'skewness': 0,
                    'kurtosis': -6/5  # Excess kurtosis
                }
                
            elif distribution_type == 'GAMMA':
                shape = parameters.get('shape', 1.0)
                scale = parameters.get('scale', 1.0)
                
                # Validate parameters
                if shape <= 0 or scale <= 0:
                    raise ValueError("Parameters 'shape' and 'scale' must be positive")
                
                distribution_data['statistics'] = {
                    'mean': shape * scale,
                    'variance': shape * scale**2,
                    'standard_deviation': np.sqrt(shape) * scale,
                    'skewness': 2 / np.sqrt(shape),
                    'kurtosis': 6 / shape  # Excess kurtosis
                }
                
            elif distribution_type == 'BETA':
                alpha = parameters.get('alpha', 1.0)
                beta = parameters.get('beta', 1.0)
                
                # Validate parameters
                if alpha <= 0 or beta <= 0:
                    raise ValueError("Parameters 'alpha' and 'beta' must be positive")
                
                distribution_data['statistics'] = {
                    'mean': alpha / (alpha + beta),
                    'variance': (alpha * beta) / ((alpha + beta)**2 * (alpha + beta + 1)),
                    'standard_deviation': np.sqrt((alpha * beta) / ((alpha + beta)**2 * (alpha + beta + 1))),
                    'skewness': 2 * (beta - alpha) * np.sqrt(alpha + beta + 1) / ((alpha + beta) * np.sqrt(alpha * beta)),
                    'kurtosis': 6 * ((alpha - beta)**2 * (alpha + beta + 1) - alpha * beta * (alpha + beta + 2)) / (alpha * beta * (alpha + beta + 2) * (alpha + beta + 3))
                }
                
            elif distribution_type == 'CHI_SQUARED':
                df = parameters.get('df', 1)
                
                # Validate parameters
                if df <= 0 or not isinstance(df, int):
                    raise ValueError("Parameter 'df' must be a positive integer")
                
                distribution_data['statistics'] = {
                    'mean': df,
                    'variance': 2 * df,
                    'standard_deviation': np.sqrt(2 * df),
                    'skewness': np.sqrt(8 / df),
                    'kurtosis': 12 / df  # Excess kurtosis
                }
                
            elif distribution_type == 'T':
                df = parameters.get('df', 1)
                
                # Validate parameters
                if df <= 0:
                    raise ValueError("Parameter 'df' must be positive")
                
                if df > 2:
                    variance = df / (df - 2)
                else:
                    variance = float('inf')
                    
                if df > 3:
                    skewness = 0
                else:
                    skewness = float('nan')
                    
                if df > 4:
                    kurtosis = 6 / (df - 4)
                else:
                    kurtosis = float('inf')
                
                distribution_data['statistics'] = {
                    'mean': 0 if df > 1 else float('nan'),
                    'variance': variance,
                    'standard_deviation': np.sqrt(variance) if not np.isinf(variance) else float('inf'),
                    'skewness': skewness,
                    'kurtosis': kurtosis  # Excess kurtosis
                }
                
            elif distribution_type == 'F':
                dfn = parameters.get('dfn', 1)
                dfd = parameters.get('dfd', 1)
                
                # Validate parameters
                if dfn <= 0 or dfd <= 0:
                    raise ValueError("Parameters 'dfn' and 'dfd' must be positive")
                
                if dfd > 2:
                    mean = dfd / (dfd - 2)
                else:
                    mean = float('inf')
                    
                if dfd > 4:
                    variance = (2 * dfd**2 * (dfn + dfd - 2)) / (dfn * (dfd - 2)**2 * (dfd - 4))
                else:
                    variance = float('inf')
                
                distribution_data['statistics'] = {
                    'mean': mean,
                    'variance': variance,
                    'standard_deviation': np.sqrt(variance) if not np.isinf(variance) else float('inf'),
                    'skewness': float('nan'),  # Complex formula, omitted for simplicity
                    'kurtosis': float('nan')  # Complex formula, omitted for simplicity
                }
                
            elif distribution_type == 'LOG_NORMAL':
                mu = parameters.get('mu', 0.0)
                sigma = parameters.get('sigma', 1.0)
                
                # Validate parameters
                if sigma <= 0:
                    raise ValueError("Parameter 'sigma' must be positive")
                
                distribution_data['statistics'] = {
                    'mean': np.exp(mu + sigma**2 / 2),
                    'variance': (np.exp(sigma**2) - 1) * np.exp(2 * mu + sigma**2),
                    'standard_deviation': np.sqrt((np.exp(sigma**2) - 1) * np.exp(2 * mu + sigma**2)),
                    'skewness': (np.exp(sigma**2) + 2) * np.sqrt(np.exp(sigma**2) - 1),
                    'kurtosis': np.exp(4 * sigma**2) + 2 * np.exp(3 * sigma**2) + 3 * np.exp(2 * sigma**2) - 6
                }
                
            elif distribution_type == 'WEIBULL':
                shape = parameters.get('shape', 1.0)
                scale = parameters.get('scale', 1.0)
                
                # Validate parameters
                if shape <= 0 or scale <= 0:
                    raise ValueError("Parameters 'shape' and 'scale' must be positive")
                
                distribution_data['statistics'] = {
                    'mean': scale * gamma(1 + 1/shape),
                    'variance': scale**2 * (gamma(1 + 2/shape) - (gamma(1 + 1/shape))**2),
                    'standard_deviation': np.sqrt(scale**2 * (gamma(1 + 2/shape) - (gamma(1 + 1/shape))**2)),
                    'skewness': (gamma(1 + 3/shape) * scale**3 - 3 * scale * scale**2 * gamma(1 + 1/shape) * gamma(1 + 2/shape) + 2 * (scale * gamma(1 + 1/shape))**3) / (scale**2 * (gamma(1 + 2/shape) - (gamma(1 + 1/shape))**2))**(3/2),
                    'kurtosis': float('nan')  # Complex formula, omitted for simplicity
                }
                
            else:
                raise ValueError(f"Unsupported distribution type: {distribution_type}")
                
            return distribution_data
            
        except Exception as e:
            logger.error(f"Error creating distribution: {str(e)}")
            raise
            
    @staticmethod
    def calculate_pmf(distribution_type: str, parameters: Dict[str, Any], x_values: List[Union[int, float]]) -> Dict[str, Any]:
        """
        Calculate the Probability Mass Function (PMF) for discrete distributions.
        
        Args:
            distribution_type: Type of distribution
            parameters: Distribution-specific parameters
            x_values: List of x values to calculate PMF for
            
        Returns:
            Dictionary containing x values and corresponding PMF values
        """
        try:
            pmf_values = []
            
            if distribution_type == 'BINOMIAL':
                n = parameters.get('n', 10)
                p = parameters.get('p', 0.5)
                
                # Using scipy.stats for accurate calculations
                pmf_values = stats.binom.pmf(x_values, n, p)
                
            elif distribution_type == 'POISSON':
                lambda_val = parameters.get('lambda', 1.0)
                
                # Using scipy.stats for accurate calculations
                pmf_values = stats.poisson.pmf(x_values, lambda_val)
                
            elif distribution_type in ['NORMAL', 'EXPONENTIAL', 'UNIFORM', 'GAMMA', 'BETA', 'CHI_SQUARED', 'T', 'F', 'LOG_NORMAL', 'WEIBULL']:
                raise ValueError(f"{distribution_type} is a continuous distribution and does not have a PMF")
                
            else:
                raise ValueError(f"Unsupported distribution type: {distribution_type}")
                
            # Convert numpy array to list for JSON serialization
            pmf_values = pmf_values.tolist() if isinstance(pmf_values, np.ndarray) else pmf_values
            
            return {
                'x_values': x_values,
                'pmf_values': pmf_values
            }
            
        except Exception as e:
            logger.error(f"Error calculating PMF: {str(e)}")
            raise
            
    @staticmethod
    def calculate_pdf(distribution_type: str, parameters: Dict[str, Any], x_values: List[Union[int, float]]) -> Dict[str, Any]:
        """
        Calculate the Probability Density Function (PDF) for continuous distributions.
        
        Args:
            distribution_type: Type of distribution
            parameters: Distribution-specific parameters
            x_values: List of x values to calculate PDF for
            
        Returns:
            Dictionary containing x values and corresponding PDF values
        """
        try:
            pdf_values = []
            
            if distribution_type == 'NORMAL':
                mu = parameters.get('mu', 0.0)
                sigma = parameters.get('sigma', 1.0)
                
                # Using scipy.stats for accurate calculations
                pdf_values = stats.norm.pdf(x_values, loc=mu, scale=sigma)
                
            elif distribution_type == 'EXPONENTIAL':
                rate = parameters.get('rate', 1.0)
                
                # Using scipy.stats for accurate calculations
                # Note: scipy uses scale = 1/rate
                pdf_values = stats.expon.pdf(x_values, scale=1/rate)
                
            elif distribution_type == 'UNIFORM':
                a = parameters.get('a', 0.0)
                b = parameters.get('b', 1.0)
                
                # Using scipy.stats for accurate calculations
                pdf_values = stats.uniform.pdf(x_values, loc=a, scale=b-a)
                
            elif distribution_type == 'GAMMA':
                shape = parameters.get('shape', 1.0)
                scale = parameters.get('scale', 1.0)
                
                # Using scipy.stats for accurate calculations
                pdf_values = stats.gamma.pdf(x_values, a=shape, scale=scale)
                
            elif distribution_type == 'BETA':
                alpha = parameters.get('alpha', 1.0)
                beta = parameters.get('beta', 1.0)
                
                # Using scipy.stats for accurate calculations
                pdf_values = stats.beta.pdf(x_values, a=alpha, b=beta)
                
            elif distribution_type == 'CHI_SQUARED':
                df = parameters.get('df', 1)
                
                # Using scipy.stats for accurate calculations
                pdf_values = stats.chi2.pdf(x_values, df=df)
                
            elif distribution_type == 'T':
                df = parameters.get('df', 1)
                
                # Using scipy.stats for accurate calculations
                pdf_values = stats.t.pdf(x_values, df=df)
                
            elif distribution_type == 'F':
                dfn = parameters.get('dfn', 1)
                dfd = parameters.get('dfd', 1)
                
                # Using scipy.stats for accurate calculations
                pdf_values = stats.f.pdf(x_values, dfn=dfn, dfd=dfd)
                
            elif distribution_type == 'LOG_NORMAL':
                mu = parameters.get('mu', 0.0)
                sigma = parameters.get('sigma', 1.0)
                
                # Using scipy.stats for accurate calculations
                pdf_values = stats.lognorm.pdf(x_values, s=sigma, scale=np.exp(mu))
                
            elif distribution_type == 'WEIBULL':
                shape = parameters.get('shape', 1.0)
                scale = parameters.get('scale', 1.0)
                
                # Using scipy.stats for accurate calculations
                pdf_values = stats.weibull_min.pdf(x_values, c=shape, scale=scale)
                
            elif distribution_type in ['BINOMIAL', 'POISSON']:
                raise ValueError(f"{distribution_type} is a discrete distribution and does not have a PDF")
                
            else:
                raise ValueError(f"Unsupported distribution type: {distribution_type}")
                
            # Convert numpy array to list for JSON serialization
            pdf_values = pdf_values.tolist() if isinstance(pdf_values, np.ndarray) else pdf_values
            
            return {
                'x_values': x_values,
                'pdf_values': pdf_values
            }
            
        except Exception as e:
            logger.error(f"Error calculating PDF: {str(e)}")
            raise
            
    @staticmethod
    def calculate_cdf(distribution_type: str, parameters: Dict[str, Any], x_values: List[Union[int, float]]) -> Dict[str, Any]:
        """
        Calculate the Cumulative Distribution Function (CDF) for any distribution.
        
        Args:
            distribution_type: Type of distribution
            parameters: Distribution-specific parameters
            x_values: List of x values to calculate CDF for
            
        Returns:
            Dictionary containing x values and corresponding CDF values
        """
        try:
            cdf_values = []
            
            if distribution_type == 'BINOMIAL':
                n = parameters.get('n', 10)
                p = parameters.get('p', 0.5)
                
                # Using scipy.stats for accurate calculations
                cdf_values = stats.binom.cdf(x_values, n, p)
                
            elif distribution_type == 'POISSON':
                lambda_val = parameters.get('lambda', 1.0)
                
                # Using scipy.stats for accurate calculations
                cdf_values = stats.poisson.cdf(x_values, lambda_val)
                
            elif distribution_type == 'NORMAL':
                mu = parameters.get('mu', 0.0)
                sigma = parameters.get('sigma', 1.0)
                
                # Using scipy.stats for accurate calculations
                cdf_values = stats.norm.cdf(x_values, loc=mu, scale=sigma)
                
            elif distribution_type == 'EXPONENTIAL':
                rate = parameters.get('rate', 1.0)
                
                # Using scipy.stats for accurate calculations
                cdf_values = stats.expon.cdf(x_values, scale=1/rate)
                
            elif distribution_type == 'UNIFORM':
                a = parameters.get('a', 0.0)
                b = parameters.get('b', 1.0)
                
                # Using scipy.stats for accurate calculations
                cdf_values = stats.uniform.cdf(x_values, loc=a, scale=b-a)
                
            elif distribution_type == 'GAMMA':
                shape = parameters.get('shape', 1.0)
                scale = parameters.get('scale', 1.0)
                
                # Using scipy.stats for accurate calculations
                cdf_values = stats.gamma.cdf(x_values, a=shape, scale=scale)
                
            elif distribution_type == 'BETA':
                alpha = parameters.get('alpha', 1.0)
                beta = parameters.get('beta', 1.0)
                
                # Using scipy.stats for accurate calculations
                cdf_values = stats.beta.cdf(x_values, a=alpha, b=beta)
                
            elif distribution_type == 'CHI_SQUARED':
                df = parameters.get('df', 1)
                
                # Using scipy.stats for accurate calculations
                cdf_values = stats.chi2.cdf(x_values, df=df)
                
            elif distribution_type == 'T':
                df = parameters.get('df', 1)
                
                # Using scipy.stats for accurate calculations
                cdf_values = stats.t.cdf(x_values, df=df)
                
            elif distribution_type == 'F':
                dfn = parameters.get('dfn', 1)
                dfd = parameters.get('dfd', 1)
                
                # Using scipy.stats for accurate calculations
                cdf_values = stats.f.cdf(x_values, dfn=dfn, dfd=dfd)
                
            elif distribution_type == 'LOG_NORMAL':
                mu = parameters.get('mu', 0.0)
                sigma = parameters.get('sigma', 1.0)
                
                # Using scipy.stats for accurate calculations
                cdf_values = stats.lognorm.cdf(x_values, s=sigma, scale=np.exp(mu))
                
            elif distribution_type == 'WEIBULL':
                shape = parameters.get('shape', 1.0)
                scale = parameters.get('scale', 1.0)
                
                # Using scipy.stats for accurate calculations
                cdf_values = stats.weibull_min.cdf(x_values, c=shape, scale=scale)
                
            else:
                raise ValueError(f"Unsupported distribution type: {distribution_type}")
                
            # Convert numpy array to list for JSON serialization
            cdf_values = cdf_values.tolist() if isinstance(cdf_values, np.ndarray) else cdf_values
            
            return {
                'x_values': x_values,
                'cdf_values': cdf_values
            }
            
        except Exception as e:
            logger.error(f"Error calculating CDF: {str(e)}")
            raise
            
    @staticmethod
    def calculate_probability(distribution_type: str, parameters: Dict[str, Any], 
                             probability_type: str, values: Dict[str, float]) -> Dict[str, Any]:
        """
        Calculate various probability queries for a distribution.
        
        Args:
            distribution_type: Type of distribution
            parameters: Distribution-specific parameters
            probability_type: Type of probability query (e.g., 'LESS_THAN', 'GREATER_THAN', 'BETWEEN')
            values: Dictionary of values needed for the probability query
            
        Returns:
            Dictionary containing the calculated probability and related information
        """
        try:
            probability = None
            
            if distribution_type == 'BINOMIAL':
                n = parameters.get('n', 10)
                p = parameters.get('p', 0.5)
                
                if probability_type == 'EQUAL_TO':
                    k = values.get('k', 0)
                    probability = stats.binom.pmf(k, n, p)
                    
                elif probability_type == 'LESS_THAN_OR_EQUAL':
                    k = values.get('k', 0)
                    probability = stats.binom.cdf(k, n, p)
                    
                elif probability_type == 'GREATER_THAN':
                    k = values.get('k', 0)
                    probability = 1 - stats.binom.cdf(k, n, p)
                    
                elif probability_type == 'BETWEEN':
                    k1 = values.get('k1', 0)
                    k2 = values.get('k2', n)
                    probability = stats.binom.cdf(k2, n, p) - stats.binom.cdf(k1 - 1, n, p)
                    
                else:
                    raise ValueError(f"Unsupported probability type: {probability_type}")
                    
            elif distribution_type == 'POISSON':
                lambda_val = parameters.get('lambda', 1.0)
                
                if probability_type == 'EQUAL_TO':
                    k = values.get('k', 0)
                    probability = stats.poisson.pmf(k, lambda_val)
                    
                elif probability_type == 'LESS_THAN_OR_EQUAL':
                    k = values.get('k', 0)
                    probability = stats.poisson.cdf(k, lambda_val)
                    
                elif probability_type == 'GREATER_THAN':
                    k = values.get('k', 0)
                    probability = 1 - stats.poisson.cdf(k, lambda_val)
                    
                elif probability_type == 'BETWEEN':
                    k1 = values.get('k1', 0)
                    k2 = values.get('k2', int(lambda_val * 3))
                    probability = stats.poisson.cdf(k2, lambda_val) - stats.poisson.cdf(k1 - 1, lambda_val)
                    
                else:
                    raise ValueError(f"Unsupported probability type: {probability_type}")
                    
            elif distribution_type == 'NORMAL':
                mu = parameters.get('mu', 0.0)
                sigma = parameters.get('sigma', 1.0)
                
                if probability_type == 'LESS_THAN_OR_EQUAL':
                    x = values.get('x', 0)
                    probability = stats.norm.cdf(x, loc=mu, scale=sigma)
                    
                elif probability_type == 'GREATER_THAN':
                    x = values.get('x', 0)
                    probability = 1 - stats.norm.cdf(x, loc=mu, scale=sigma)
                    
                elif probability_type == 'BETWEEN':
                    x1 = values.get('x1', mu - sigma)
                    x2 = values.get('x2', mu + sigma)
                    probability = stats.norm.cdf(x2, loc=mu, scale=sigma) - stats.norm.cdf(x1, loc=mu, scale=sigma)
                    
                elif probability_type == 'WITHIN_K_STD':
                    k = values.get('k', 1.0)
                    probability = stats.norm.cdf(mu + k * sigma, loc=mu, scale=sigma) - stats.norm.cdf(mu - k * sigma, loc=mu, scale=sigma)
                    
                else:
                    raise ValueError(f"Unsupported probability type: {probability_type}")
                    
            else:
                # For other distributions, implement similar probability calculations
                # based on their respective scipy.stats functions
                raise ValueError(f"Probability calculations for {distribution_type} not yet implemented")
                
            return {
                'probability': probability,
                'distribution_type': distribution_type,
                'parameters': parameters,
                'probability_type': probability_type,
                'values': values
            }
            
        except Exception as e:
            logger.error(f"Error calculating probability: {str(e)}")
            raise
            
    @staticmethod
    def generate_random_samples(distribution_type: str, parameters: Dict[str, Any], sample_size: int) -> Dict[str, Any]:
        """
        Generate random samples from a specified distribution.
        
        Args:
            distribution_type: Type of distribution
            parameters: Distribution-specific parameters
            sample_size: Number of samples to generate
            
        Returns:
            Dictionary containing the generated samples and summary statistics
        """
        try:
            samples = []
            
            if distribution_type == 'BINOMIAL':
                n = parameters.get('n', 10)
                p = parameters.get('p', 0.5)
                
                samples = stats.binom.rvs(n, p, size=sample_size)
                
            elif distribution_type == 'POISSON':
                lambda_val = parameters.get('lambda', 1.0)
                
                samples = stats.poisson.rvs(lambda_val, size=sample_size)
                
            elif distribution_type == 'NORMAL':
                mu = parameters.get('mu', 0.0)
                sigma = parameters.get('sigma', 1.0)
                
                samples = stats.norm.rvs(loc=mu, scale=sigma, size=sample_size)
                
            elif distribution_type == 'EXPONENTIAL':
                rate = parameters.get('rate', 1.0)
                
                samples = stats.expon.rvs(scale=1/rate, size=sample_size)
                
            elif distribution_type == 'UNIFORM':
                a = parameters.get('a', 0.0)
                b = parameters.get('b', 1.0)
                
                samples = stats.uniform.rvs(loc=a, scale=b-a, size=sample_size)
                
            elif distribution_type == 'GAMMA':
                shape = parameters.get('shape', 1.0)
                scale = parameters.get('scale', 1.0)
                
                samples = stats.gamma.rvs(a=shape, scale=scale, size=sample_size)
                
            elif distribution_type == 'BETA':
                alpha = parameters.get('alpha', 1.0)
                beta = parameters.get('beta', 1.0)
                
                samples = stats.beta.rvs(a=alpha, b=beta, size=sample_size)
                
            elif distribution_type == 'CHI_SQUARED':
                df = parameters.get('df', 1)
                
                samples = stats.chi2.rvs(df=df, size=sample_size)
                
            elif distribution_type == 'T':
                df = parameters.get('df', 1)
                
                samples = stats.t.rvs(df=df, size=sample_size)
                
            elif distribution_type == 'F':
                dfn = parameters.get('dfn', 1)
                dfd = parameters.get('dfd', 1)
                
                samples = stats.f.rvs(dfn=dfn, dfd=dfd, size=sample_size)
                
            elif distribution_type == 'LOG_NORMAL':
                mu = parameters.get('mu', 0.0)
                sigma = parameters.get('sigma', 1.0)
                
                samples = stats.lognorm.rvs(s=sigma, scale=np.exp(mu), size=sample_size)
                
            elif distribution_type == 'WEIBULL':
                shape = parameters.get('shape', 1.0)
                scale = parameters.get('scale', 1.0)
                
                samples = stats.weibull_min.rvs(c=shape, scale=scale, size=sample_size)
                
            else:
                raise ValueError(f"Unsupported distribution type: {distribution_type}")
                
            # Calculate summary statistics
            samples_list = samples.tolist() if isinstance(samples, np.ndarray) else samples
            summary = {
                'mean': float(np.mean(samples)),
                'median': float(np.median(samples)),
                'std_dev': float(np.std(samples, ddof=1)),
                'min': float(np.min(samples)),
                'max': float(np.max(samples)),
                'q1': float(np.percentile(samples, 25)),
                'q3': float(np.percentile(samples, 75))
            }
            
            return {
                'samples': samples_list,
                'summary': summary
            }
            
        except Exception as e:
            logger.error(f"Error generating random samples: {str(e)}")
            raise
            
    @staticmethod
    def fit_distribution(data: List[Union[int, float]], distribution_type: str) -> Dict[str, Any]:
        """
        Fit a distribution to given data.
        
        Args:
            data: List of data points
            distribution_type: Type of distribution to fit
            
        Returns:
            Dictionary containing fitted parameters and goodness-of-fit statistics
        """
        try:
            fitted_params = {}
            goodness_of_fit = {}
            
            # Convert data to numpy array
            data_array = np.array(data)
            
            if distribution_type == 'BINOMIAL':
                # For binomial, estimate n and p
                # This is a simplification; proper binomial fitting is more complex
                n = int(np.ceil(np.max(data_array)))
                p = np.mean(data_array) / n
                
                fitted_params = {'n': n, 'p': p}
                
                # Calculate expected frequencies
                expected = stats.binom.pmf(np.arange(n + 1), n, p) * len(data_array)
                
                # Calculate chi-square statistic
                observed = np.bincount(data_array.astype(int), minlength=n + 1)
                valid_indices = expected > 5  # Only use bins with expected frequency > 5
                
                if np.sum(valid_indices) > 1:
                    chi_square = np.sum(((observed[valid_indices] - expected[valid_indices]) ** 2) / expected[valid_indices])
                    dof = np.sum(valid_indices) - 2  # Subtract 2 for estimated parameters (n and p)
                    p_value = 1 - stats.chi2.cdf(chi_square, dof) if dof > 0 else np.nan
                    
                    goodness_of_fit = {
                        'chi_square': float(chi_square),
                        'dof': int(dof),
                        'p_value': float(p_value)
                    }
                else:
                    goodness_of_fit = {
                        'chi_square': np.nan,
                        'dof': 0,
                        'p_value': np.nan,
                        'error': 'Insufficient data for chi-square test'
                    }
                
            elif distribution_type == 'POISSON':
                # For Poisson, estimate lambda
                lambda_est = np.mean(data_array)
                
                fitted_params = {'lambda': float(lambda_est)}
                
                # Calculate expected frequencies
                max_k = max(int(np.max(data_array)), int(lambda_est * 3))
                expected = stats.poisson.pmf(np.arange(max_k + 1), lambda_est) * len(data_array)
                
                # Calculate chi-square statistic
                observed = np.bincount(data_array.astype(int), minlength=max_k + 1)
                valid_indices = expected > 5  # Only use bins with expected frequency > 5
                
                if np.sum(valid_indices) > 1:
                    chi_square = np.sum(((observed[valid_indices] - expected[valid_indices]) ** 2) / expected[valid_indices])
                    dof = np.sum(valid_indices) - 1  # Subtract 1 for estimated parameter (lambda)
                    p_value = 1 - stats.chi2.cdf(chi_square, dof) if dof > 0 else np.nan
                    
                    goodness_of_fit = {
                        'chi_square': float(chi_square),
                        'dof': int(dof),
                        'p_value': float(p_value)
                    }
                else:
                    goodness_of_fit = {
                        'chi_square': np.nan,
                        'dof': 0,
                        'p_value': np.nan,
                        'error': 'Insufficient data for chi-square test'
                    }
                
            elif distribution_type == 'NORMAL':
                # For normal, estimate mu and sigma
                mu_est = np.mean(data_array)
                sigma_est = np.std(data_array, ddof=1)
                
                fitted_params = {'mu': float(mu_est), 'sigma': float(sigma_est)}
                
                # Perform Kolmogorov-Smirnov test
                ks_statistic, ks_p_value = stats.kstest(data_array, 'norm', args=(mu_est, sigma_est))
                
                # Perform Shapiro-Wilk test for normality
                if len(data_array) <= 5000:  # Shapiro-Wilk is reliable for n <= 5000
                    sw_statistic, sw_p_value = stats.shapiro(data_array)
                else:
                    sw_statistic, sw_p_value = np.nan, np.nan
                
                # Calculate Anderson-Darling test
                ad_result = stats.anderson(data_array, 'norm')
                ad_statistic = ad_result.statistic
                ad_critical_values = ad_result.critical_values.tolist()
                ad_significance_levels = [15.0, 10.0, 5.0, 2.5, 1.0]  # Default significance levels for 'norm'
                
                goodness_of_fit = {
                    'ks_statistic': float(ks_statistic),
                    'ks_p_value': float(ks_p_value),
                    'sw_statistic': float(sw_statistic) if not np.isnan(sw_statistic) else None,
                    'sw_p_value': float(sw_p_value) if not np.isnan(sw_p_value) else None,
                    'ad_statistic': float(ad_statistic),
                    'ad_critical_values': ad_critical_values,
                    'ad_significance_levels': ad_significance_levels
                }
                
            elif distribution_type == 'EXPONENTIAL':
                # For exponential, estimate rate
                rate_est = 1 / np.mean(data_array)
                
                fitted_params = {'rate': float(rate_est)}
                
                # Perform Kolmogorov-Smirnov test
                ks_statistic, ks_p_value = stats.kstest(data_array, 'expon', args=(0, 1/rate_est))
                
                goodness_of_fit = {
                    'ks_statistic': float(ks_statistic),
                    'ks_p_value': float(ks_p_value)
                }
                
            elif distribution_type == 'UNIFORM':
                # For uniform, estimate a and b
                a_est = np.min(data_array)
                b_est = np.max(data_array)
                
                fitted_params = {'a': float(a_est), 'b': float(b_est)}
                
                # Perform Kolmogorov-Smirnov test
                ks_statistic, ks_p_value = stats.kstest(data_array, 'uniform', args=(a_est, b_est - a_est))
                
                goodness_of_fit = {
                    'ks_statistic': float(ks_statistic),
                    'ks_p_value': float(ks_p_value)
                }
                
            elif distribution_type == 'GAMMA':
                # For gamma, estimate shape and scale using method of moments
                mean = np.mean(data_array)
                variance = np.var(data_array, ddof=1)
                shape_est = mean**2 / variance
                scale_est = variance / mean
                
                fitted_params = {'shape': float(shape_est), 'scale': float(scale_est)}
                
                # Perform Kolmogorov-Smirnov test
                ks_statistic, ks_p_value = stats.kstest(data_array, 'gamma', args=(shape_est, 0, scale_est))
                
                goodness_of_fit = {
                    'ks_statistic': float(ks_statistic),
                    'ks_p_value': float(ks_p_value)
                }
                
            elif distribution_type == 'BETA':
                # For beta, data must be in [0, 1]
                if np.min(data_array) < 0 or np.max(data_array) > 1:
                    raise ValueError("Beta distribution can only be fit to data in the range [0, 1]")
                
                # Estimate alpha and beta using method of moments
                mean = np.mean(data_array)
                variance = np.var(data_array, ddof=1)
                
                if variance == 0:
                    raise ValueError("Cannot fit beta distribution to constant data")
                
                alpha_est = mean * (mean * (1 - mean) / variance - 1)
                beta_est = (1 - mean) * (mean * (1 - mean) / variance - 1)
                
                fitted_params = {'alpha': float(alpha_est), 'beta': float(beta_est)}
                
                # Perform Kolmogorov-Smirnov test
                ks_statistic, ks_p_value = stats.kstest(data_array, 'beta', args=(alpha_est, beta_est))
                
                goodness_of_fit = {
                    'ks_statistic': float(ks_statistic),
                    'ks_p_value': float(ks_p_value)
                }
                
            else:
                # For other distributions, implement fitting logic
                # based on their respective scipy.stats functions
                raise ValueError(f"Distribution fitting for {distribution_type} not yet implemented")
                
            return {
                'fitted_parameters': fitted_params,
                'goodness_of_fit': goodness_of_fit
            }
            
        except Exception as e:
            logger.error(f"Error fitting distribution: {str(e)}")
            raise
    
    @staticmethod
    def compare_binomial_approximations(n: int, p: float, 
                                     approximation_types: List[str] = ['POISSON', 'NORMAL']) -> Dict[str, Any]:
        """
        Compare binomial distribution with its Poisson and Normal approximations.
        
        Args:
            n: Number of trials for the binomial distribution
            p: Probability of success for the binomial distribution
            approximation_types: List of approximation types to compare
            
        Returns:
            Dictionary containing comparison data and error metrics
        """
        try:
            # Calculate derived parameters
            np_val = n * p
            npq = n * p * (1 - p)
            
            # Determine appropriate range for k values
            mean = np_val
            std_dev = np.sqrt(npq)
            
            if np_val < 10:
                # For small np values, include more of the left tail
                k_min = max(0, int(mean - 3 * std_dev))
                k_max = min(n, int(mean + 4 * std_dev))
            else:
                # For larger np values, use a more symmetric range
                k_min = max(0, int(mean - 4 * std_dev))
                k_max = min(n, int(mean + 4 * std_dev))
            
            k_values = np.arange(k_min, k_max + 1)
            
            # Calculate exact binomial probabilities
            binom_pmf = stats.binom.pmf(k_values, n, p)
            
            # Calculate approximations and errors
            approximations = {}
            errors = {}
            
            if 'POISSON' in approximation_types:
                # Poisson approximation
                poisson_pmf = stats.poisson.pmf(k_values, np_val)
                poisson_errors = np.abs(binom_pmf - poisson_pmf)
                
                # Calculate total variation distance (TVD)
                tvd_poisson = 0.5 * np.sum(poisson_errors)
                
                # Calculate Kullback-Leibler divergence
                epsilon = 1e-10  # Small value to avoid division by zero
                kl_poisson = np.sum(binom_pmf * np.log((binom_pmf + epsilon) / (poisson_pmf + epsilon)))
                
                approximations['POISSON'] = {
                    'pmf': poisson_pmf.tolist(),
                    'suitability': n >= 20 and p <= 0.05 and np_val < 10
                }
                
                errors['POISSON'] = {
                    'absolute_errors': poisson_errors.tolist(),
                    'max_error': float(np.max(poisson_errors)),
                    'max_error_k': int(k_values[np.argmax(poisson_errors)]),
                    'tvd': float(tvd_poisson),
                    'kl_divergence': float(kl_poisson)
                }
            
            if 'NORMAL' in approximation_types:
                # Normal approximation (with continuity correction)
                normal_approx = stats.norm.cdf(k_values + 0.5, loc=np_val, scale=np.sqrt(npq)) - \
                               stats.norm.cdf(k_values - 0.5, loc=np_val, scale=np.sqrt(npq))
                normal_errors = np.abs(binom_pmf - normal_approx)
                
                # Calculate total variation distance (TVD)
                tvd_normal = 0.5 * np.sum(normal_errors)
                
                # Calculate Kullback-Leibler divergence
                epsilon = 1e-10  # Small value to avoid division by zero
                kl_normal = np.sum(binom_pmf * np.log((binom_pmf + epsilon) / (normal_approx + epsilon)))
                
                approximations['NORMAL'] = {
                    'pmf': normal_approx.tolist(),
                    'suitability': np_val >= 5 and n * (1 - p) >= 5
                }
                
                errors['NORMAL'] = {
                    'absolute_errors': normal_errors.tolist(),
                    'max_error': float(np.max(normal_errors)),
                    'max_error_k': int(k_values[np.argmax(normal_errors)]),
                    'tvd': float(tvd_normal),
                    'kl_divergence': float(kl_normal)
                }
            
            # Determine which approximation is better
            better_approximation = None
            if 'POISSON' in approximation_types and 'NORMAL' in approximation_types:
                if errors['POISSON']['tvd'] < errors['NORMAL']['tvd']:
                    better_approximation = 'POISSON'
                    difference = errors['NORMAL']['tvd'] - errors['POISSON']['tvd']
                elif errors['NORMAL']['tvd'] < errors['POISSON']['tvd']:
                    better_approximation = 'NORMAL'
                    difference = errors['POISSON']['tvd'] - errors['NORMAL']['tvd']
                else:
                    better_approximation = 'BOTH_EQUAL'
                    difference = 0
            
            return {
                'parameters': {
                    'n': n,
                    'p': p,
                    'np': np_val,
                    'npq': npq
                },
                'k_values': k_values.tolist(),
                'binomial_pmf': binom_pmf.tolist(),
                'approximations': approximations,
                'errors': errors,
                'better_approximation': better_approximation,
                'difference': float(difference) if better_approximation and better_approximation != 'BOTH_EQUAL' else 0
            }
            
        except Exception as e:
            logger.error(f"Error comparing binomial approximations: {str(e)}")
            raise
    
    @staticmethod
    def simulate_poisson_process(rate: float, duration: float, num_simulations: int = 1) -> Dict[str, Any]:
        """
        Simulate a Poisson process (e.g., arrivals in a time period).
        
        Args:
            rate: Average rate of events per unit time
            duration: Duration of the simulation
            num_simulations: Number of separate simulations to run
            
        Returns:
            Dictionary containing simulation results
        """
        try:
            # Expected number of events
            expected_events = rate * duration
            
            # Simulate multiple Poisson processes
            simulations = []
            event_counts = []
            
            for _ in range(num_simulations):
                # Simulate interarrival times (exponential distribution)
                interarrival_times = np.random.exponential(1/rate, size=int(expected_events*2))
                arrival_times = np.cumsum(interarrival_times)
                arrival_times = arrival_times[arrival_times <= duration]
                
                event_counts.append(len(arrival_times))
                
                # For the first simulation, store detailed results
                if len(simulations) == 0:
                    simulations.append({
                        'arrival_times': arrival_times.tolist(),
                        'interarrival_times': interarrival_times[:len(arrival_times)].tolist() if len(arrival_times) > 0 else [],
                        'total_events': len(arrival_times)
                    })
            
            # Calculate theoretical probabilities
            k_values = np.arange(0, max(int(expected_events*2), max(event_counts) + 1))
            poisson_pmf = stats.poisson.pmf(k_values, expected_events)
            
            # Calculate histogram of event counts
            bin_edges = np.arange(min(min(event_counts), 0) - 0.5, max(max(event_counts), len(k_values) - 1) + 1.5)
            hist, _ = np.histogram(event_counts, bins=bin_edges)
            hist = hist / num_simulations  # Convert to proportions
            
            return {
                'parameters': {
                    'rate': rate,
                    'duration': duration,
                    'expected_events': expected_events
                },
                'simulations': simulations,
                'event_counts': event_counts,
                'k_values': k_values.tolist(),
                'theoretical_pmf': poisson_pmf.tolist(),
                'observed_pmf': hist.tolist(),
                'bin_edges': bin_edges.tolist(),
                'total_simulations': num_simulations
            }
            
        except Exception as e:
            logger.error(f"Error simulating Poisson process: {str(e)}")
            raise
    
    @staticmethod
    def calculate_process_capability(mean: float, std_dev: float, lsl: float, usl: float) -> Dict[str, Any]:
        """
        Calculate process capability indices for quality control.
        
        Args:
            mean: Process mean
            std_dev: Process standard deviation
            lsl: Lower specification limit
            usl: Upper specification limit
            
        Returns:
            Dictionary containing process capability indices and defect rates
        """
        try:
            # Calculate process capability indices
            cp = (usl - lsl) / (6 * std_dev) if std_dev > 0 else float('inf')
            
            # Process capability index accounting for centering
            cpu = (usl - mean) / (3 * std_dev) if std_dev > 0 else float('inf')
            cpl = (mean - lsl) / (3 * std_dev) if std_dev > 0 else float('inf')
            cpk = min(cpu, cpl)
            
            # Calculate defect rates
            lower_defect_rate = stats.norm.cdf(lsl, loc=mean, scale=std_dev)
            upper_defect_rate = 1 - stats.norm.cdf(usl, loc=mean, scale=std_dev)
            total_defect_rate = lower_defect_rate + upper_defect_rate
            
            # Calculate in PPM (parts per million)
            defect_ppm = total_defect_rate * 1_000_000
            
            return {
                'parameters': {
                    'mean': mean,
                    'std_dev': std_dev,
                    'lsl': lsl,
                    'usl': usl
                },
                'capability_indices': {
                    'cp': float(cp),
                    'cpu': float(cpu),
                    'cpl': float(cpl),
                    'cpk': float(cpk)
                },
                'defect_rates': {
                    'lower': float(lower_defect_rate),
                    'upper': float(upper_defect_rate),
                    'total': float(total_defect_rate),
                    'ppm': float(defect_ppm)
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating process capability: {str(e)}")
            raise
    
    @staticmethod
    def simulate_clinical_trial(control_rate: float, treatment_effect: float, 
                              sample_size: int, num_simulations: int = 1) -> Dict[str, Any]:
        """
        Simulate a clinical trial with binomial outcomes and normal approximation.
        
        Args:
            control_rate: Response rate in the control group
            treatment_effect: Additional response rate in the treatment group
            sample_size: Number of patients in each group
            num_simulations: Number of separate simulations to run
            
        Returns:
            Dictionary containing simulation results
        """
        try:
            treatment_rate = min(control_rate + treatment_effect, 1.0)
            
            simulations = []
            p_values_exact = []
            p_values_normal = []
            
            for _ in range(num_simulations):
                # Simulate trial
                control_responses = np.random.binomial(1, control_rate, sample_size)
                treatment_responses = np.random.binomial(1, treatment_rate, sample_size)
                
                control_successes = np.sum(control_responses)
                treatment_successes = np.sum(treatment_responses)
                
                # Calculate statistics
                control_rate_obs = control_successes / sample_size
                treatment_rate_obs = treatment_successes / sample_size
                observed_diff = treatment_rate_obs - control_rate_obs
                
                # Exact test (Fisher's exact test)
                contingency_table = np.array([
                    [treatment_successes, sample_size - treatment_successes],
                    [control_successes, sample_size - control_successes]
                ])
                
                odd_ratio, p_value_exact = stats.fisher_exact(contingency_table)
                
                # Normal approximation (Z-test for proportions)
                pooled_prop = (treatment_successes + control_successes) / (2 * sample_size)
                se = np.sqrt(pooled_prop * (1 - pooled_prop) * (2 / sample_size))
                z_stat = (treatment_rate_obs - control_rate_obs) / se
                p_value_normal = 2 * (1 - stats.norm.cdf(abs(z_stat)))
                
                p_values_exact.append(p_value_exact)
                p_values_normal.append(p_value_normal)
                
                # For the first simulation, store detailed results
                if len(simulations) == 0:
                    simulations.append({
                        'control_successes': int(control_successes),
                        'treatment_successes': int(treatment_successes),
                        'control_rate': float(control_rate_obs),
                        'treatment_rate': float(treatment_rate_obs),
                        'observed_diff': float(observed_diff),
                        'p_value_exact': float(p_value_exact),
                        'p_value_normal': float(p_value_normal)
                    })
            
            # Calculate power (proportion of significant results)
            alpha = 0.05
            power_exact = np.mean([p <= alpha for p in p_values_exact])
            power_normal = np.mean([p <= alpha for p in p_values_normal])
            
            return {
                'parameters': {
                    'control_rate': control_rate,
                    'treatment_rate': treatment_rate,
                    'treatment_effect': treatment_effect,
                    'sample_size': sample_size
                },
                'simulations': simulations,
                'p_values': {
                    'exact': p_values_exact,
                    'normal': p_values_normal
                },
                'power': {
                    'exact': float(power_exact),
                    'normal': float(power_normal),
                    'alpha': alpha
                },
                'total_simulations': num_simulations
            }
            
        except Exception as e:
            logger.error(f"Error simulating clinical trial: {str(e)}")
            raise