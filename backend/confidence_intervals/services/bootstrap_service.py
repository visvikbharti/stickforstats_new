import numpy as np
from typing import Dict, List, Union, Tuple, Any, Optional, Callable


class BootstrapService:
    """
    Service for calculating bootstrap confidence intervals.
    This implementation preserves the mathematical accuracy of the original bootstrap methods.
    """
    
    @staticmethod
    def bootstrap_ci(
        data: np.ndarray,
        statistic: Callable = np.mean,
        confidence_level: float = 0.95,
        n_resamples: int = 1000,
        method: str = 'percentile',
        random_seed: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Calculate bootstrap confidence intervals for a given statistic.
        
        Args:
            data: Input data array
            statistic: Function to compute the statistic of interest (default: np.mean)
            confidence_level: Desired confidence level (default: 0.95)
            n_resamples: Number of bootstrap resamples to generate (default: 1000)
            method: Bootstrap method ('percentile', 'basic', or 'bca')
            random_seed: Random seed for reproducibility (optional)
            
        Returns:
            Dictionary containing bootstrap confidence interval results
        """
        if random_seed is not None:
            np.random.seed(random_seed)
        
        # Calculate the statistic on the original data
        observed_stat = statistic(data)
        
        # Generate bootstrap resamples and calculate the statistic on each
        n = len(data)
        bootstrap_stats = np.zeros(n_resamples)
        
        for i in range(n_resamples):
            # Resample with replacement
            indices = np.random.randint(0, n, size=n)
            resample = data[indices]
            bootstrap_stats[i] = statistic(resample)
        
        # Calculate confidence interval based on the specified method
        alpha = 1 - confidence_level
        if method == 'percentile':
            # Percentile method
            lower_percentile = alpha / 2 * 100
            upper_percentile = (1 - alpha / 2) * 100
            
            lower_bound = np.percentile(bootstrap_stats, lower_percentile)
            upper_bound = np.percentile(bootstrap_stats, upper_percentile)
            
            interval_type = 'Bootstrap Percentile'
            
        elif method == 'basic':
            # Basic bootstrap (reverse percentile)
            lower_percentile = alpha / 2 * 100
            upper_percentile = (1 - alpha / 2) * 100
            
            # Reflection around the observed statistic
            lower_bound = 2 * observed_stat - np.percentile(bootstrap_stats, upper_percentile)
            upper_bound = 2 * observed_stat - np.percentile(bootstrap_stats, lower_percentile)
            
            interval_type = 'Basic Bootstrap'
            
        elif method == 'bca':
            # Bias-corrected and accelerated (BCa) bootstrap
            # This is a more complex method that adjusts for bias and skewness
            
            # Calculate bias-correction factor
            z0 = stats.norm.ppf(np.mean(bootstrap_stats < observed_stat))
            
            # Calculate acceleration factor (jackknife)
            jackknife_stats = np.zeros(n)
            for i in range(n):
                jackknife_sample = np.delete(data, i)
                jackknife_stats[i] = statistic(jackknife_sample)
            
            # Calculate acceleration factor
            jackknife_mean = np.mean(jackknife_stats)
            num = np.sum((jackknife_mean - jackknife_stats) ** 3)
            denom = 6 * (np.sum((jackknife_mean - jackknife_stats) ** 2) ** 1.5)
            
            # Avoid division by zero
            if denom == 0:
                a = 0
            else:
                a = num / denom
            
            # Calculate adjusted percentiles
            z_alpha1 = stats.norm.ppf(alpha / 2)
            z_alpha2 = stats.norm.ppf(1 - alpha / 2)
            
            p1 = stats.norm.cdf(z0 + (z0 + z_alpha1) / (1 - a * (z0 + z_alpha1)))
            p2 = stats.norm.cdf(z0 + (z0 + z_alpha2) / (1 - a * (z0 + z_alpha2)))
            
            # Calculate BCa interval
            lower_bound = np.percentile(bootstrap_stats, p1 * 100)
            upper_bound = np.percentile(bootstrap_stats, p2 * 100)
            
            interval_type = 'Bootstrap BCa'
            
        else:
            raise ValueError(f"Unknown bootstrap method: {method}")
        
        # Calculate standard error from bootstrap samples
        bootstrap_std_error = np.std(bootstrap_stats, ddof=1)
        
        return {
            'point_estimate': observed_stat,
            'lower_bound': lower_bound,
            'upper_bound': upper_bound,
            'confidence_level': confidence_level,
            'margin_of_error': max(upper_bound - observed_stat, observed_stat - lower_bound),
            'standard_error': bootstrap_std_error,
            'n_resamples': n_resamples,
            'sample_size': len(data),
            'interval_type': interval_type,
            'bootstrap_stats': bootstrap_stats.tolist() if n_resamples <= 1000 else None,
            'bootstrap_distribution': {
                'mean': float(np.mean(bootstrap_stats)),
                'std': float(np.std(bootstrap_stats, ddof=1)),
                'median': float(np.median(bootstrap_stats)),
                'min': float(np.min(bootstrap_stats)),
                'max': float(np.max(bootstrap_stats)),
                'q1': float(np.percentile(bootstrap_stats, 25)),
                'q3': float(np.percentile(bootstrap_stats, 75))
            }
        }
    
    @staticmethod
    def bootstrap_difference(
        data1: np.ndarray,
        data2: np.ndarray,
        statistic: Callable = np.mean,
        confidence_level: float = 0.95,
        n_resamples: int = 1000,
        method: str = 'percentile',
        random_seed: Optional[int] = None,
        paired: bool = False
    ) -> Dict[str, Any]:
        """
        Calculate bootstrap confidence intervals for the difference of two statistics.
        
        Args:
            data1: First data array
            data2: Second data array
            statistic: Function to compute the statistic of interest (default: np.mean)
            confidence_level: Desired confidence level (default: 0.95)
            n_resamples: Number of bootstrap resamples to generate (default: 1000)
            method: Bootstrap method ('percentile', 'basic', or 'bca')
            random_seed: Random seed for reproducibility (optional)
            paired: Whether the samples are paired (default: False)
            
        Returns:
            Dictionary containing bootstrap confidence interval results for the difference
        """
        if random_seed is not None:
            np.random.seed(random_seed)
        
        # Check if paired samples have the same length
        if paired and len(data1) != len(data2):
            raise ValueError("Paired samples must have the same length")
        
        # Calculate the difference statistic on the original data
        stat1 = statistic(data1)
        stat2 = statistic(data2)
        observed_diff = stat1 - stat2
        
        # Generate bootstrap resamples and calculate the difference on each
        n1 = len(data1)
        n2 = len(data2)
        bootstrap_diffs = np.zeros(n_resamples)
        
        for i in range(n_resamples):
            if paired:
                # For paired data, resample pairs together
                indices = np.random.randint(0, n1, size=n1)
                resample1 = data1[indices]
                resample2 = data2[indices]
            else:
                # For independent samples, resample each separately
                indices1 = np.random.randint(0, n1, size=n1)
                indices2 = np.random.randint(0, n2, size=n2)
                resample1 = data1[indices1]
                resample2 = data2[indices2]
            
            bootstrap_diffs[i] = statistic(resample1) - statistic(resample2)
        
        # Calculate confidence interval based on the specified method
        alpha = 1 - confidence_level
        if method == 'percentile':
            # Percentile method
            lower_percentile = alpha / 2 * 100
            upper_percentile = (1 - alpha / 2) * 100
            
            lower_bound = np.percentile(bootstrap_diffs, lower_percentile)
            upper_bound = np.percentile(bootstrap_diffs, upper_percentile)
            
            interval_type = 'Bootstrap Percentile'
            
        elif method == 'basic':
            # Basic bootstrap (reverse percentile)
            lower_percentile = alpha / 2 * 100
            upper_percentile = (1 - alpha / 2) * 100
            
            # Reflection around the observed difference
            lower_bound = 2 * observed_diff - np.percentile(bootstrap_diffs, upper_percentile)
            upper_bound = 2 * observed_diff - np.percentile(bootstrap_diffs, lower_percentile)
            
            interval_type = 'Basic Bootstrap'
            
        elif method == 'bca':
            # BCa method for difference is complex and would typically use a statistical package
            # This is a simplified implementation
            
            # Use the percentile method as a fallback
            lower_percentile = alpha / 2 * 100
            upper_percentile = (1 - alpha / 2) * 100
            
            lower_bound = np.percentile(bootstrap_diffs, lower_percentile)
            upper_bound = np.percentile(bootstrap_diffs, upper_percentile)
            
            interval_type = 'Bootstrap Percentile (BCa not implemented for differences)'
            
        else:
            raise ValueError(f"Unknown bootstrap method: {method}")
        
        # Calculate standard error from bootstrap samples
        bootstrap_std_error = np.std(bootstrap_diffs, ddof=1)
        
        return {
            'point_estimate': observed_diff,
            'lower_bound': lower_bound,
            'upper_bound': upper_bound,
            'confidence_level': confidence_level,
            'margin_of_error': max(upper_bound - observed_diff, observed_diff - lower_bound),
            'standard_error': bootstrap_std_error,
            'n_resamples': n_resamples,
            'sample_sizes': (n1, n2),
            'statistics': (stat1, stat2),
            'paired': paired,
            'interval_type': interval_type,
            'parameter': 'difference',
            'bootstrap_distribution': {
                'mean': float(np.mean(bootstrap_diffs)),
                'std': float(np.std(bootstrap_diffs, ddof=1)),
                'median': float(np.median(bootstrap_diffs)),
                'min': float(np.min(bootstrap_diffs)),
                'max': float(np.max(bootstrap_diffs)),
                'q1': float(np.percentile(bootstrap_diffs, 25)),
                'q3': float(np.percentile(bootstrap_diffs, 75))
            }
        }
    
    @staticmethod
    def generate_bootstrap_samples(
        data: np.ndarray,
        n_resamples: int = 1000,
        statistic: Callable = np.mean,
        random_seed: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate bootstrap samples and calculate the specified statistic on each.
        This is useful for visualization and simulation.
        
        Args:
            data: Input data array
            n_resamples: Number of bootstrap resamples to generate (default: 1000)
            statistic: Function to compute the statistic of interest (default: np.mean)
            random_seed: Random seed for reproducibility (optional)
            
        Returns:
            Dictionary containing bootstrap samples and statistics
        """
        if random_seed is not None:
            np.random.seed(random_seed)
        
        # Calculate the statistic on the original data
        observed_stat = statistic(data)
        
        # Generate bootstrap resamples and calculate the statistic on each
        n = len(data)
        bootstrap_stats = np.zeros(n_resamples)
        bootstrap_samples = []
        
        for i in range(n_resamples):
            # Resample with replacement
            indices = np.random.randint(0, n, size=n)
            resample = data[indices]
            bootstrap_stats[i] = statistic(resample)
            
            # Store the resample if requested (limited to prevent memory issues)
            if n_resamples <= 100:
                bootstrap_samples.append(resample.tolist())
        
        return {
            'original_data': data.tolist(),
            'original_statistic': float(observed_stat),
            'bootstrap_statistics': bootstrap_stats.tolist(),
            'bootstrap_samples': bootstrap_samples if bootstrap_samples else None,
            'n_resamples': n_resamples,
            'sample_size': n,
            'summary': {
                'mean': float(np.mean(bootstrap_stats)),
                'std': float(np.std(bootstrap_stats, ddof=1)),
                'median': float(np.median(bootstrap_stats)),
                'min': float(np.min(bootstrap_stats)),
                'max': float(np.max(bootstrap_stats)),
                'q1': float(np.percentile(bootstrap_stats, 25)),
                'q3': float(np.percentile(bootstrap_stats, 75))
            }
        }
    
    @staticmethod
    def bootstrap_simulation(
        true_param: float,
        sample_size: int,
        n_simulations: int = 1000,
        n_bootstrap: int = 1000,
        distribution: str = 'normal',
        distribution_params: Dict[str, Any] = None,
        confidence_level: float = 0.95,
        bootstrap_method: str = 'percentile',
        random_seed: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Simulate bootstrap confidence interval performance.
        
        Args:
            true_param: True parameter value
            sample_size: Size of each simulated sample
            n_simulations: Number of simulation iterations (default: 1000)
            n_bootstrap: Number of bootstrap resamples per simulation (default: 1000)
            distribution: Distribution to sample from ('normal', 'exponential', etc.)
            distribution_params: Additional distribution parameters
            confidence_level: Desired confidence level (default: 0.95)
            bootstrap_method: Bootstrap method ('percentile', 'basic', or 'bca')
            random_seed: Random seed for reproducibility (optional)
            
        Returns:
            Dictionary containing simulation results
        """
        if random_seed is not None:
            np.random.seed(random_seed)
        
        if distribution_params is None:
            distribution_params = {}
        
        # Initialize results storage
        contains_true = 0
        interval_widths = []
        lower_bounds = []
        upper_bounds = []
        point_estimates = []
        
        # Run simulations
        for i in range(n_simulations):
            # Generate sample from specified distribution
            if distribution == 'normal':
                mu = distribution_params.get('mu', true_param)
                sigma = distribution_params.get('sigma', 1.0)
                sample = np.random.normal(mu, sigma, sample_size)
                statistic = np.mean  # For normal, we typically estimate the mean
            
            elif distribution == 'exponential':
                scale = distribution_params.get('scale', 1.0 / true_param)
                sample = np.random.exponential(scale, sample_size)
                statistic = np.mean  # For exponential, we might estimate the mean (1/rate)
            
            elif distribution == 'bernoulli':
                p = distribution_params.get('p', true_param)
                sample = np.random.binomial(1, p, sample_size)
                statistic = np.mean  # For bernoulli, we estimate the proportion (mean)
            
            elif distribution == 'uniform':
                low = distribution_params.get('low', 0.0)
                high = distribution_params.get('high', true_param * 2)
                sample = np.random.uniform(low, high, sample_size)
                statistic = np.mean  # For uniform, we might estimate the mean
            
            else:
                raise ValueError(f"Unknown distribution: {distribution}")
            
            # Calculate bootstrap confidence interval
            result = BootstrapService.bootstrap_ci(
                sample,
                statistic=statistic,
                confidence_level=confidence_level,
                n_resamples=n_bootstrap,
                method=bootstrap_method
            )
            
            # Check if interval contains true parameter
            contains_true += (result['lower_bound'] <= true_param <= result['upper_bound'])
            
            # Store results
            interval_widths.append(result['upper_bound'] - result['lower_bound'])
            lower_bounds.append(result['lower_bound'])
            upper_bounds.append(result['upper_bound'])
            point_estimates.append(result['point_estimate'])
        
        # Calculate coverage probability
        coverage_prob = contains_true / n_simulations
        
        return {
            'true_param': true_param,
            'coverage_probability': coverage_prob,
            'nominal_level': confidence_level,
            'average_width': np.mean(interval_widths),
            'sample_size': sample_size,
            'n_simulations': n_simulations,
            'n_bootstrap': n_bootstrap,
            'distribution': distribution,
            'distribution_params': distribution_params,
            'bootstrap_method': bootstrap_method,
            'summary': {
                'contains_true': contains_true,
                'mean_width': float(np.mean(interval_widths)),
                'std_width': float(np.std(interval_widths, ddof=1)),
                'mean_lower': float(np.mean(lower_bounds)),
                'mean_upper': float(np.mean(upper_bounds)),
                'mean_point_est': float(np.mean(point_estimates)),
                'std_point_est': float(np.std(point_estimates, ddof=1))
            },
            'point_estimates': point_estimates,
            'interval_limits': {
                'lower': lower_bounds,
                'upper': upper_bounds
            }
        }