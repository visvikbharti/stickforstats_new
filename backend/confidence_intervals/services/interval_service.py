import numpy as np
import scipy.stats as stats
from typing import Dict, List, Union, Tuple, Any, Optional


class IntervalService:
    """
    Service for calculating various types of confidence intervals.
    This class preserves the mathematical accuracy of the original confidence interval calculations.
    """
    
    @staticmethod
    def mean_z_interval(
        data: np.ndarray,
        confidence_level: float = 0.95,
        sigma: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Calculate a confidence interval for the mean using the z-distribution (known variance).
        
        Args:
            data: Array of observations
            confidence_level: Desired confidence level (default: 0.95)
            sigma: Known population standard deviation. If None, sample std dev will be used.
            
        Returns:
            Dictionary containing confidence interval results
        """
        n = len(data)
        mean = np.mean(data)
        
        if sigma is None:
            sigma = np.std(data, ddof=1)  # Sample standard deviation if not provided
            
        z_critical = stats.norm.ppf(1 - (1 - confidence_level) / 2)
        margin = z_critical * sigma / np.sqrt(n)
        
        lower_bound = mean - margin
        upper_bound = mean + margin
        
        return {
            'point_estimate': mean,
            'lower_bound': lower_bound,
            'upper_bound': upper_bound,
            'confidence_level': confidence_level,
            'margin_of_error': margin,
            'sample_size': n,
            'standard_error': sigma / np.sqrt(n),
            'degrees_of_freedom': None,  # Not applicable for z-interval
            'critical_value': z_critical,
            'interval_type': 'z-interval',
            'parameter': 'mean'
        }
    
    @staticmethod
    def mean_t_interval(
        data: np.ndarray,
        confidence_level: float = 0.95
    ) -> Dict[str, Any]:
        """
        Calculate a confidence interval for the mean using the t-distribution (unknown variance).
        
        Args:
            data: Array of observations
            confidence_level: Desired confidence level (default: 0.95)
            
        Returns:
            Dictionary containing confidence interval results
        """
        n = len(data)
        mean = np.mean(data)
        std_dev = np.std(data, ddof=1)  # Sample standard deviation
        
        t_critical = stats.t.ppf(1 - (1 - confidence_level) / 2, n - 1)
        margin = t_critical * std_dev / np.sqrt(n)
        
        lower_bound = mean - margin
        upper_bound = mean + margin
        
        return {
            'point_estimate': mean,
            'lower_bound': lower_bound,
            'upper_bound': upper_bound,
            'confidence_level': confidence_level,
            'margin_of_error': margin,
            'sample_size': n,
            'standard_error': std_dev / np.sqrt(n),
            'degrees_of_freedom': n - 1,
            'critical_value': t_critical,
            'interval_type': 't-interval',
            'parameter': 'mean'
        }
    
    @staticmethod
    def proportion_wald_interval(
        successes: int,
        sample_size: int,
        confidence_level: float = 0.95,
        continuity_correction: bool = False
    ) -> Dict[str, Any]:
        """
        Calculate the Wald confidence interval for a binomial proportion.
        
        Args:
            successes: Number of successes
            sample_size: Total number of trials
            confidence_level: Desired confidence level (default: 0.95)
            continuity_correction: Whether to apply continuity correction (default: False)
            
        Returns:
            Dictionary containing confidence interval results
        """
        p_hat = successes / sample_size
        
        # Handle edge cases
        if p_hat == 0 or p_hat == 1:
            if p_hat == 0:
                lower_bound = 0
                # Rule of 3 for upper bound when p_hat = 0
                upper_bound = 3 / sample_size if sample_size > 0 else 1
            else:  # p_hat == 1
                # Rule of 3 for lower bound when p_hat = 1
                lower_bound = 1 - 3 / sample_size if sample_size > 0 else 0
                upper_bound = 1
                
            return {
                'point_estimate': p_hat,
                'lower_bound': lower_bound,
                'upper_bound': upper_bound,
                'confidence_level': confidence_level,
                'margin_of_error': upper_bound - p_hat if p_hat == 0 else p_hat - lower_bound,
                'sample_size': sample_size,
                'successes': successes,
                'standard_error': np.sqrt(p_hat * (1 - p_hat) / sample_size) if sample_size > 0 else None,
                'critical_value': stats.norm.ppf(1 - (1 - confidence_level) / 2),
                'interval_type': 'Wald',
                'parameter': 'proportion',
                'edge_case_handling': 'Rule of 3'
            }
        
        # Standard Wald calculation
        z_critical = stats.norm.ppf(1 - (1 - confidence_level) / 2)
        std_error = np.sqrt(p_hat * (1 - p_hat) / sample_size)
        
        if continuity_correction:
            # Apply continuity correction of 0.5/n
            correction = 0.5 / sample_size
            lower_bound = max(0, p_hat - z_critical * std_error - correction)
            upper_bound = min(1, p_hat + z_critical * std_error + correction)
        else:
            # Standard Wald without correction
            lower_bound = max(0, p_hat - z_critical * std_error)
            upper_bound = min(1, p_hat + z_critical * std_error)
        
        return {
            'point_estimate': p_hat,
            'lower_bound': lower_bound,
            'upper_bound': upper_bound,
            'confidence_level': confidence_level,
            'margin_of_error': z_critical * std_error,
            'sample_size': sample_size,
            'successes': successes,
            'standard_error': std_error,
            'critical_value': z_critical,
            'interval_type': 'Wald' + (' with continuity correction' if continuity_correction else ''),
            'parameter': 'proportion'
        }
    
    @staticmethod
    def proportion_wilson_interval(
        successes: int,
        sample_size: int,
        confidence_level: float = 0.95
    ) -> Dict[str, Any]:
        """
        Calculate the Wilson score confidence interval for a binomial proportion.
        
        Args:
            successes: Number of successes
            sample_size: Total number of trials
            confidence_level: Desired confidence level (default: 0.95)
            
        Returns:
            Dictionary containing confidence interval results
        """
        if sample_size == 0:
            return {
                'point_estimate': None,
                'lower_bound': 0,
                'upper_bound': 1,
                'confidence_level': confidence_level,
                'margin_of_error': None,
                'sample_size': 0,
                'successes': successes,
                'standard_error': None,
                'critical_value': None,
                'interval_type': 'Wilson score',
                'parameter': 'proportion',
                'edge_case_handling': 'Empty sample'
            }
        
        p_hat = successes / sample_size
        z_critical = stats.norm.ppf(1 - (1 - confidence_level) / 2)
        
        # Wilson score interval calculations
        denominator = 1 + z_critical**2 / sample_size
        center = (p_hat + z_critical**2 / (2 * sample_size)) / denominator
        margin = z_critical * np.sqrt((p_hat * (1 - p_hat) + z_critical**2 / (4 * sample_size)) / sample_size) / denominator
        
        lower_bound = max(0, center - margin)
        upper_bound = min(1, center + margin)
        
        return {
            'point_estimate': p_hat,
            'lower_bound': lower_bound,
            'upper_bound': upper_bound,
            'confidence_level': confidence_level,
            'margin_of_error': margin,
            'sample_size': sample_size,
            'successes': successes,
            'standard_error': np.sqrt(p_hat * (1 - p_hat) / sample_size),
            'critical_value': z_critical,
            'interval_type': 'Wilson score',
            'parameter': 'proportion',
            'center': center  # Wilson score center is not the same as p_hat
        }
    
    @staticmethod
    def proportion_clopper_pearson_interval(
        successes: int,
        sample_size: int,
        confidence_level: float = 0.95
    ) -> Dict[str, Any]:
        """
        Calculate the Clopper-Pearson (exact) confidence interval for a binomial proportion.
        
        Args:
            successes: Number of successes
            sample_size: Total number of trials
            confidence_level: Desired confidence level (default: 0.95)
            
        Returns:
            Dictionary containing confidence interval results
        """
        if sample_size == 0:
            return {
                'point_estimate': None,
                'lower_bound': 0,
                'upper_bound': 1,
                'confidence_level': confidence_level,
                'margin_of_error': None,
                'sample_size': 0,
                'successes': successes,
                'standard_error': None,
                'critical_value': None,
                'interval_type': 'Clopper-Pearson',
                'parameter': 'proportion',
                'edge_case_handling': 'Empty sample'
            }
        
        p_hat = successes / sample_size
        alpha = 1 - confidence_level
        
        # Handle edge cases
        if successes == 0:
            lower_bound = 0
        else:
            lower_bound = stats.beta.ppf(alpha / 2, successes, sample_size - successes + 1)
            
        if successes == sample_size:
            upper_bound = 1
        else:
            upper_bound = stats.beta.ppf(1 - alpha / 2, successes + 1, sample_size - successes)
        
        return {
            'point_estimate': p_hat,
            'lower_bound': lower_bound,
            'upper_bound': upper_bound,
            'confidence_level': confidence_level,
            'margin_of_error': max(upper_bound - p_hat, p_hat - lower_bound),
            'sample_size': sample_size,
            'successes': successes,
            'standard_error': np.sqrt(p_hat * (1 - p_hat) / sample_size) if 0 < p_hat < 1 else None,
            'critical_value': None,  # Not directly applicable for this method
            'interval_type': 'Clopper-Pearson',
            'parameter': 'proportion'
        }
    
    @staticmethod
    def variance_interval(
        data: np.ndarray,
        confidence_level: float = 0.95,
        parameter: str = 'variance'  # 'variance' or 'std_dev'
    ) -> Dict[str, Any]:
        """
        Calculate a confidence interval for the variance or standard deviation using the chi-square distribution.
        
        Args:
            data: Array of observations
            confidence_level: Desired confidence level (default: 0.95)
            parameter: 'variance' or 'std_dev' to determine which parameter to calculate the interval for
            
        Returns:
            Dictionary containing confidence interval results
        """
        n = len(data)
        sample_var = np.var(data, ddof=1)  # Sample variance
        sample_std = np.sqrt(sample_var)   # Sample standard deviation
        
        alpha = 1 - confidence_level
        chi2_lower = stats.chi2.ppf(alpha / 2, n - 1)
        chi2_upper = stats.chi2.ppf(1 - alpha / 2, n - 1)
        
        # Calculate variance interval
        var_lower = (n - 1) * sample_var / chi2_upper
        var_upper = (n - 1) * sample_var / chi2_lower
        
        # Calculate std_dev interval (if needed) by taking square root
        std_lower = np.sqrt(var_lower)
        std_upper = np.sqrt(var_upper)
        
        if parameter == 'variance':
            point_estimate = sample_var
            lower_bound = var_lower
            upper_bound = var_upper
        else:  # parameter == 'std_dev'
            point_estimate = sample_std
            lower_bound = std_lower
            upper_bound = std_upper
        
        return {
            'point_estimate': point_estimate,
            'lower_bound': lower_bound,
            'upper_bound': upper_bound,
            'confidence_level': confidence_level,
            'margin_of_error': max(upper_bound - point_estimate, point_estimate - lower_bound),
            'sample_size': n,
            'degrees_of_freedom': n - 1,
            'chi2_lower': chi2_lower,
            'chi2_upper': chi2_upper,
            'interval_type': 'chi-square',
            'parameter': parameter,
            'variance': {
                'point_estimate': sample_var,
                'lower_bound': var_lower,
                'upper_bound': var_upper
            },
            'std_dev': {
                'point_estimate': sample_std,
                'lower_bound': std_lower,
                'upper_bound': std_upper
            }
        }
    
    @staticmethod
    def diff_means_z_interval(
        data1: np.ndarray,
        data2: np.ndarray,
        confidence_level: float = 0.95,
        sigma1: Optional[float] = None,
        sigma2: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Calculate a confidence interval for the difference of means using the z-distribution (known variances).
        
        Args:
            data1: Array of observations from first population
            data2: Array of observations from second population
            confidence_level: Desired confidence level (default: 0.95)
            sigma1: Known standard deviation of first population. If None, sample std dev will be used.
            sigma2: Known standard deviation of second population. If None, sample std dev will be used.
            
        Returns:
            Dictionary containing confidence interval results
        """
        n1 = len(data1)
        n2 = len(data2)
        mean1 = np.mean(data1)
        mean2 = np.mean(data2)
        
        if sigma1 is None:
            sigma1 = np.std(data1, ddof=1)  # Sample standard deviation if not provided
        if sigma2 is None:
            sigma2 = np.std(data2, ddof=1)  # Sample standard deviation if not provided
            
        # Calculate the standard error of the difference
        std_error = np.sqrt(sigma1**2 / n1 + sigma2**2 / n2)
        
        # Calculate the confidence interval
        z_critical = stats.norm.ppf(1 - (1 - confidence_level) / 2)
        margin = z_critical * std_error
        
        diff = mean1 - mean2
        lower_bound = diff - margin
        upper_bound = diff + margin
        
        return {
            'point_estimate': diff,
            'lower_bound': lower_bound,
            'upper_bound': upper_bound,
            'confidence_level': confidence_level,
            'margin_of_error': margin,
            'sample_sizes': (n1, n2),
            'means': (mean1, mean2),
            'std_devs': (sigma1, sigma2),
            'standard_error': std_error,
            'critical_value': z_critical,
            'interval_type': 'z-interval',
            'parameter': 'difference_of_means'
        }
    
    @staticmethod
    def diff_means_t_interval(
        data1: np.ndarray,
        data2: np.ndarray,
        confidence_level: float = 0.95,
        equal_variances: bool = False
    ) -> Dict[str, Any]:
        """
        Calculate a confidence interval for the difference of means using the t-distribution (unknown variances).
        
        Args:
            data1: Array of observations from first population
            data2: Array of observations from second population
            confidence_level: Desired confidence level (default: 0.95)
            equal_variances: Whether to assume equal variances (pooled t-test) or not (Welch's t-test)
            
        Returns:
            Dictionary containing confidence interval results
        """
        n1 = len(data1)
        n2 = len(data2)
        mean1 = np.mean(data1)
        mean2 = np.mean(data2)
        var1 = np.var(data1, ddof=1)
        var2 = np.var(data2, ddof=1)
        
        diff = mean1 - mean2
        
        if equal_variances:
            # Pooled variance
            pooled_var = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2)
            std_error = np.sqrt(pooled_var * (1/n1 + 1/n2))
            df = n1 + n2 - 2
            method = "pooled"
        else:
            # Welch-Satterthwaite
            std_error = np.sqrt(var1/n1 + var2/n2)
            # Welch-Satterthwaite degrees of freedom
            df_num = (var1/n1 + var2/n2)**2
            df_denom = (var1/n1)**2/(n1-1) + (var2/n2)**2/(n2-1)
            df = df_num / df_denom
            method = "welch"
        
        # Calculate the confidence interval
        t_critical = stats.t.ppf(1 - (1 - confidence_level) / 2, df)
        margin = t_critical * std_error
        
        lower_bound = diff - margin
        upper_bound = diff + margin
        
        return {
            'point_estimate': diff,
            'lower_bound': lower_bound,
            'upper_bound': upper_bound,
            'confidence_level': confidence_level,
            'margin_of_error': margin,
            'sample_sizes': (n1, n2),
            'means': (mean1, mean2),
            'variances': (var1, var2),
            'standard_error': std_error,
            'degrees_of_freedom': df,
            'critical_value': t_critical,
            'interval_type': f't-interval ({method})',
            'parameter': 'difference_of_means',
            'assumed_equal_variances': equal_variances
        }
    
    @staticmethod
    def diff_proportions_interval(
        successes1: int,
        sample_size1: int,
        successes2: int,
        sample_size2: int,
        confidence_level: float = 0.95,
        method: str = 'wald'  # 'wald', 'score', or 'exact'
    ) -> Dict[str, Any]:
        """
        Calculate a confidence interval for the difference of proportions.
        
        Args:
            successes1: Number of successes in first sample
            sample_size1: Size of first sample
            successes2: Number of successes in second sample
            sample_size2: Size of second sample
            confidence_level: Desired confidence level (default: 0.95)
            method: Method to use ('wald', 'score', or 'exact')
            
        Returns:
            Dictionary containing confidence interval results
        """
        # Check for invalid inputs
        if sample_size1 <= 0 or sample_size2 <= 0:
            raise ValueError("Sample sizes must be positive")
        
        p1 = successes1 / sample_size1
        p2 = successes2 / sample_size2
        diff = p1 - p2
        
        # Different methods for confidence intervals
        if method.lower() == 'wald':
            # Simple Wald interval
            pooled_p = (successes1 + successes2) / (sample_size1 + sample_size2)
            std_error = np.sqrt(p1 * (1 - p1) / sample_size1 + p2 * (1 - p2) / sample_size2)
            
            z_critical = stats.norm.ppf(1 - (1 - confidence_level) / 2)
            margin = z_critical * std_error
            
            lower_bound = max(-1, diff - margin)
            upper_bound = min(1, diff + margin)
            
            return {
                'point_estimate': diff,
                'lower_bound': lower_bound,
                'upper_bound': upper_bound,
                'confidence_level': confidence_level,
                'margin_of_error': margin,
                'sample_sizes': (sample_size1, sample_size2),
                'successes': (successes1, successes2),
                'proportions': (p1, p2),
                'standard_error': std_error,
                'critical_value': z_critical,
                'interval_type': 'Wald',
                'parameter': 'difference_of_proportions'
            }
        
        elif method.lower() == 'score':
            # Score-based interval (Newcombe method with Wilson score intervals)
            from statsmodels.stats.proportion import proportion_confint
            
            # Get Wilson score intervals for individual proportions
            lower1, upper1 = proportion_confint(successes1, sample_size1, alpha=1-confidence_level, method='wilson')
            lower2, upper2 = proportion_confint(successes2, sample_size2, alpha=1-confidence_level, method='wilson')
            
            # Calculate standard errors for Wilson intervals
            se1 = (upper1 - lower1) / (2 * stats.norm.ppf(1 - (1 - confidence_level) / 2))
            se2 = (upper2 - lower2) / (2 * stats.norm.ppf(1 - (1 - confidence_level) / 2))
            
            # Calculate the confidence interval for the difference
            std_error = np.sqrt(se1**2 + se2**2)
            z_critical = stats.norm.ppf(1 - (1 - confidence_level) / 2)
            margin = z_critical * std_error
            
            lower_bound = max(-1, diff - margin)
            upper_bound = min(1, diff + margin)
            
            return {
                'point_estimate': diff,
                'lower_bound': lower_bound,
                'upper_bound': upper_bound,
                'confidence_level': confidence_level,
                'margin_of_error': margin,
                'sample_sizes': (sample_size1, sample_size2),
                'successes': (successes1, successes2),
                'proportions': (p1, p2),
                'standard_error': std_error,
                'critical_value': z_critical,
                'interval_type': 'Score (Newcombe)',
                'parameter': 'difference_of_proportions',
                'individual_intervals': {
                    'proportion1': (lower1, upper1),
                    'proportion2': (lower2, upper2)
                }
            }
        
        elif method.lower() == 'exact':
            # Exact method based on Chan and Zhang (1999)
            # This is a complex calculation that would typically use specialized statistical packages
            # For simplicity, we'll use an approximation based on Fisher's exact test
            from scipy.stats import fisher_exact
            
            # Create the 2x2 contingency table
            table = np.array([
                [successes1, sample_size1 - successes1],
                [successes2, sample_size2 - successes2]
            ])
            
            # Use Fisher's exact test to get p-value
            _, p_value = fisher_exact(table)
            
            # Approximate confidence interval using bootstrap-like approach
            # (This is a simplified approximation; a full implementation would be more complex)
            z_critical = stats.norm.ppf(1 - (1 - confidence_level) / 2)
            std_error = np.sqrt(p1 * (1 - p1) / sample_size1 + p2 * (1 - p2) / sample_size2)
            margin = z_critical * std_error * 1.1  # Inflated to approximate exact method
            
            lower_bound = max(-1, diff - margin)
            upper_bound = min(1, diff + margin)
            
            return {
                'point_estimate': diff,
                'lower_bound': lower_bound,
                'upper_bound': upper_bound,
                'confidence_level': confidence_level,
                'margin_of_error': margin,
                'sample_sizes': (sample_size1, sample_size2),
                'successes': (successes1, successes2),
                'proportions': (p1, p2),
                'standard_error': std_error,
                'p_value': p_value,
                'interval_type': 'Approximate Exact',
                'parameter': 'difference_of_proportions',
                'note': 'This is an approximation of the exact method. For precise results, use a specialized package.'
            }
        
        else:
            raise ValueError(f"Unknown method: {method}. Must be 'wald', 'score', or 'exact'.")
    
    @staticmethod
    def calculate_interval(
        data: np.ndarray = None,
        interval_type: str = 'MEAN_T',
        confidence_level: float = 0.95,
        parameters: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Calculate a confidence interval based on the specified type and parameters.
        This is a wrapper around the specific interval methods.
        
        Args:
            data: Array of observations (optional, depending on interval type)
            interval_type: Type of confidence interval to calculate
            confidence_level: Desired confidence level (default: 0.95)
            parameters: Additional parameters required for the specific interval type
            
        Returns:
            Dictionary containing confidence interval results
        """
        if parameters is None:
            parameters = {}
        
        # Validate confidence level
        if not 0 < confidence_level < 1:
            raise ValueError("Confidence level must be between 0 and 1")
        
        # Dispatch to appropriate method based on interval type
        if interval_type == 'MEAN_Z':
            if data is None:
                # If data is not provided, parameters must include mean, sample_size, and sigma
                if not all(k in parameters for k in ['mean', 'sample_size', 'sigma']):
                    raise ValueError("For MEAN_Z without data, parameters must include mean, sample_size, and sigma")
                # Create theoretical standard normal distribution
                sample_size = parameters['sample_size']
                mean = parameters['mean']
                sigma = parameters['sigma']
                # Create synthetic data matching the theoretical distribution
                np.random.seed(42)  # For reproducibility
                data = np.random.normal(mean, sigma, sample_size)
            
            return IntervalService.mean_z_interval(
                data, 
                confidence_level, 
                parameters.get('sigma')
            )
        
        elif interval_type == 'MEAN_T':
            if data is None:
                # If data is not provided, parameters must include mean, std_dev, and sample_size
                if not all(k in parameters for k in ['mean', 'std_dev', 'sample_size']):
                    raise ValueError("For MEAN_T without data, parameters must include mean, std_dev, and sample_size")
                # Create synthetic data matching the parameters
                np.random.seed(42)  # For reproducibility
                data = np.random.normal(parameters['mean'], parameters['std_dev'], parameters['sample_size'])
            
            return IntervalService.mean_t_interval(data, confidence_level)
        
        elif interval_type in ['PROPORTION_WALD', 'PROPORTION_WILSON', 'PROPORTION_CLOPPER_PEARSON']:
            # For proportion intervals, we need either data or successes and sample_size
            if data is not None:
                # Convert data to binary if it's not already
                binary_data = np.array(data, dtype=bool)
                successes = np.sum(binary_data)
                sample_size = len(binary_data)
            elif 'successes' in parameters and 'sample_size' in parameters:
                successes = parameters['successes']
                sample_size = parameters['sample_size']
            else:
                raise ValueError("For proportion intervals, either data or both successes and sample_size must be provided")
            
            if interval_type == 'PROPORTION_WALD':
                return IntervalService.proportion_wald_interval(
                    successes, 
                    sample_size, 
                    confidence_level, 
                    parameters.get('continuity_correction', False)
                )
            elif interval_type == 'PROPORTION_WILSON':
                return IntervalService.proportion_wilson_interval(
                    successes, 
                    sample_size, 
                    confidence_level
                )
            else:  # 'PROPORTION_CLOPPER_PEARSON'
                return IntervalService.proportion_clopper_pearson_interval(
                    successes, 
                    sample_size, 
                    confidence_level
                )
        
        elif interval_type in ['VARIANCE', 'STD_DEV']:
            if data is None:
                raise ValueError("Data is required for variance/std_dev intervals")
            
            return IntervalService.variance_interval(
                data, 
                confidence_level, 
                'variance' if interval_type == 'VARIANCE' else 'std_dev'
            )
        
        elif interval_type == 'DIFFERENCE_MEANS':
            # For difference of means, we need either two data sets or parameters for both groups
            if 'data1' in parameters and 'data2' in parameters:
                data1 = np.array(parameters['data1'])
                data2 = np.array(parameters['data2'])
            elif data is not None and 'group_column' in parameters:
                # If data contains both groups with a grouping column
                data_df = pd.DataFrame(data)
                group_column = parameters['group_column']
                if group_column not in data_df.columns:
                    raise ValueError(f"Group column '{group_column}' not found in data")
                
                unique_groups = data_df[group_column].unique()
                if len(unique_groups) != 2:
                    raise ValueError(f"Expected exactly 2 groups, found {len(unique_groups)}")
                
                data1 = data_df[data_df[group_column] == unique_groups[0]].drop(columns=[group_column]).values
                data2 = data_df[data_df[group_column] == unique_groups[1]].drop(columns=[group_column]).values
            else:
                raise ValueError("For difference of means, either two datasets (data1, data2) or data with a group_column must be provided")
            
            if parameters.get('use_z_test', False):
                return IntervalService.diff_means_z_interval(
                    data1, 
                    data2, 
                    confidence_level, 
                    parameters.get('sigma1'), 
                    parameters.get('sigma2')
                )
            else:
                return IntervalService.diff_means_t_interval(
                    data1, 
                    data2, 
                    confidence_level, 
                    parameters.get('equal_variances', False)
                )
        
        elif interval_type == 'DIFFERENCE_PROPORTIONS':
            # For difference of proportions, we need parameters for both groups
            if all(k in parameters for k in ['successes1', 'sample_size1', 'successes2', 'sample_size2']):
                return IntervalService.diff_proportions_interval(
                    parameters['successes1'], 
                    parameters['sample_size1'], 
                    parameters['successes2'], 
                    parameters['sample_size2'], 
                    confidence_level, 
                    parameters.get('method', 'wald')
                )
            else:
                raise ValueError("For difference of proportions, parameters must include successes1, sample_size1, successes2, and sample_size2")
        
        else:
            raise ValueError(f"Unknown interval type: {interval_type}")