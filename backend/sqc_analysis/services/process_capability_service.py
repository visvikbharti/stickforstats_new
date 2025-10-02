"""
Process Capability Service for Statistical Quality Control (SQC) Analysis.

This module provides services for calculating and analyzing process capability,
including Cp, Cpk, and other capability indices.
"""

import numpy as np
import pandas as pd
import scipy.stats as stats
from scipy import optimize
from typing import Dict, List, Optional, Tuple, Union, Any

from .utils_service import calculate_process_capability, is_normal

class ProcessCapabilityService:
    """
    Service for process capability analysis.
    """
    
    def __init__(self):
        """Initialize the process capability service."""
        pass
    
    def calculate_capability_indices(
        self,
        data: Union[List[float], np.ndarray, pd.Series, pd.DataFrame],
        lsl: float,
        usl: float,
        target: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Calculate capability indices (Cp, Cpk, Pp, Ppk, etc.).
        
        Args:
            data: Process measurements
            lsl: Lower specification limit
            usl: Upper specification limit
            target: Target value (default is midpoint of spec limits)
            
        Returns:
            Dictionary of capability indices and statistics
        """
        # Use utility function to calculate capability indices
        indices = calculate_process_capability(data, usl, lsl, target)
        
        # Add normality test results
        is_normal_dist, p_value = is_normal(data)
        indices['is_normal'] = is_normal_dist
        indices['normality_p_value'] = p_value
        
        # Calculate within-spec percentage
        if isinstance(data, pd.DataFrame):
            if 'Mean' in data.columns:
                # Use Mean column if available (for subgroup data)
                values = data['Mean'].values
            else:
                # Use first numeric column
                values = data.select_dtypes(include=['number']).iloc[:, 0].values
        else:
            # Convert input to numpy array
            values = np.array(data)
        
        # Calculate out-of-spec percentages
        below_lsl = np.sum(values < lsl) / len(values) * 100
        above_usl = np.sum(values > usl) / len(values) * 100
        within_spec = 100 - below_lsl - above_usl
        
        indices['within_spec_percent'] = within_spec
        indices['below_lsl_percent'] = below_lsl
        indices['above_usl_percent'] = above_usl
        
        # Calculate expected ppm defective based on normal distribution
        if is_normal_dist:
            mean = indices['Mean']
            std_dev = indices['StdDev']
            
            # Calculate Z scores for spec limits
            z_lsl = (lsl - mean) / std_dev
            z_usl = (usl - mean) / std_dev
            
            # Calculate expected ppm below LSL and above USL
            ppm_below_lsl = stats.norm.cdf(z_lsl) * 1000000
            ppm_above_usl = (1 - stats.norm.cdf(z_usl)) * 1000000
            ppm_total = ppm_below_lsl + ppm_above_usl
            
            indices['expected_ppm_below_lsl'] = ppm_below_lsl
            indices['expected_ppm_above_usl'] = ppm_above_usl
            indices['expected_ppm_total'] = ppm_total
        
        return indices
    
    def non_normal_capability_analysis(
        self,
        data: Union[List[float], np.ndarray, pd.Series, pd.DataFrame],
        lsl: float,
        usl: float,
        target: Optional[float] = None,
        distribution: str = 'auto'
    ) -> Dict[str, Any]:
        """
        Perform capability analysis for non-normal data using distribution fitting.
        
        Args:
            data: Process measurements
            lsl: Lower specification limit
            usl: Upper specification limit
            target: Target value
            distribution: Distribution to fit ('auto', 'weibull', 'lognormal', etc.)
            
        Returns:
            Dictionary with non-normal capability results
        """
        # Extract data values
        if isinstance(data, pd.DataFrame):
            if 'Mean' in data.columns:
                # Use Mean column if available (for subgroup data)
                values = data['Mean'].values
            else:
                # Use first numeric column
                values = data.select_dtypes(include=['number']).iloc[:, 0].values
        else:
            # Convert input to numpy array
            values = np.array(data)
        
        # Check normality
        is_normal_dist, p_value = is_normal(values)
        
        result = {
            'is_normal': is_normal_dist,
            'normality_p_value': p_value,
            'original_data': {
                'mean': float(np.mean(values)),
                'std_dev': float(np.std(values, ddof=1)),
                'min': float(np.min(values)),
                'max': float(np.max(values)),
                'lsl': float(lsl),
                'usl': float(usl),
                'target': float(target) if target is not None else float((lsl + usl) / 2)
            }
        }
        
        # If data is normal, return standard capability indices
        if is_normal_dist and distribution != 'force_transform':
            standard_indices = self.calculate_capability_indices(values, lsl, usl, target)
            result['capability_indices'] = {
                'Cp': standard_indices['Cp'],
                'Cpk': standard_indices['Cpk'],
                'Pp': standard_indices['Pp'],
                'Ppk': standard_indices['Ppk'],
                'within_spec_percent': standard_indices['within_spec_percent']
            }
            result['transformation'] = 'none'
            result['transformed_data'] = None
            return result
        
        # Try different distributions if auto is selected
        if distribution == 'auto':
            # Compare different distributions and select the best fit
            distribution_fits = {}
            
            # Try Box-Cox transformation
            try:
                boxcox_lambda, _ = stats.boxcox(values)
                transformed_values = stats.boxcox(values, boxcox_lambda)
                is_transformed_normal, p_value = is_normal(transformed_values)
                distribution_fits['boxcox'] = {
                    'p_value': p_value,
                    'lambda': boxcox_lambda,
                    'transformed_values': transformed_values
                }
            except Exception as e:
                # Box-Cox requires all positive values
                distribution_fits['boxcox'] = {
                    'p_value': 0,
                    'error': str(e)
                }
            
            # Try Johnson transformation
            try:
                # Johnson transformation is more complex - use a simplified approach
                # with scipy's yeojohnson which is more flexible than boxcox
                yeo_lambda, _ = stats.yeojohnson(values)
                transformed_values = stats.yeojohnson(values, yeo_lambda)
                is_transformed_normal, p_value = is_normal(transformed_values)
                distribution_fits['yeojohnson'] = {
                    'p_value': p_value,
                    'lambda': yeo_lambda,
                    'transformed_values': transformed_values
                }
            except Exception as e:
                distribution_fits['yeojohnson'] = {
                    'p_value': 0,
                    'error': str(e)
                }
            
            # Select the best transformation
            best_transformation = None
            best_p_value = 0
            
            for trans_name, trans_info in distribution_fits.items():
                if 'p_value' in trans_info and trans_info['p_value'] > best_p_value:
                    best_p_value = trans_info['p_value']
                    best_transformation = trans_name
            
            if best_transformation and best_p_value > 0.05:
                # Use the best transformation
                distribution = best_transformation
            else:
                # No good transformation found, try direct distribution fitting
                distribution = 'direct_fit'
        
        # Apply the selected transformation or distribution
        if distribution == 'boxcox':
            # Apply Box-Cox transformation
            lambda_param, _ = stats.boxcox(values)
            transformed_values = stats.boxcox(values, lambda_param)
            
            # Calculate capability on transformed data
            transformed_lsl = self._transform_boxcox(lsl, lambda_param)
            transformed_usl = self._transform_boxcox(usl, lambda_param)
            transformed_target = self._transform_boxcox(
                target if target is not None else (lsl + usl) / 2, 
                lambda_param
            )
            
            # Calculate capability indices on transformed data
            transformed_indices = self.calculate_capability_indices(
                transformed_values, transformed_lsl, transformed_usl, transformed_target
            )
            
            result['transformation'] = 'boxcox'
            result['transformation_parameters'] = {'lambda': float(lambda_param)}
            result['transformed_data'] = {
                'mean': float(np.mean(transformed_values)),
                'std_dev': float(np.std(transformed_values, ddof=1)),
                'min': float(np.min(transformed_values)),
                'max': float(np.max(transformed_values)),
                'lsl': float(transformed_lsl),
                'usl': float(transformed_usl),
                'target': float(transformed_target)
            }
            result['capability_indices'] = {
                'Cp': transformed_indices['Cp'],
                'Cpk': transformed_indices['Cpk'],
                'Pp': transformed_indices['Pp'],
                'Ppk': transformed_indices['Ppk'],
                'within_spec_percent': transformed_indices['within_spec_percent']
            }
            
        elif distribution == 'yeojohnson':
            # Apply Yeo-Johnson transformation
            lambda_param, _ = stats.yeojohnson(values)
            transformed_values = stats.yeojohnson(values, lambda_param)
            
            # Calculate capability on transformed data
            transformed_lsl = self._transform_yeojohnson(lsl, lambda_param)
            transformed_usl = self._transform_yeojohnson(usl, lambda_param)
            transformed_target = self._transform_yeojohnson(
                target if target is not None else (lsl + usl) / 2, 
                lambda_param
            )
            
            # Calculate capability indices on transformed data
            transformed_indices = self.calculate_capability_indices(
                transformed_values, transformed_lsl, transformed_usl, transformed_target
            )
            
            result['transformation'] = 'yeojohnson'
            result['transformation_parameters'] = {'lambda': float(lambda_param)}
            result['transformed_data'] = {
                'mean': float(np.mean(transformed_values)),
                'std_dev': float(np.std(transformed_values, ddof=1)),
                'min': float(np.min(transformed_values)),
                'max': float(np.max(transformed_values)),
                'lsl': float(transformed_lsl),
                'usl': float(transformed_usl),
                'target': float(transformed_target)
            }
            result['capability_indices'] = {
                'Cp': transformed_indices['Cp'],
                'Cpk': transformed_indices['Cpk'],
                'Pp': transformed_indices['Pp'],
                'Ppk': transformed_indices['Ppk'],
                'within_spec_percent': transformed_indices['within_spec_percent']
            }
            
        elif distribution == 'direct_fit':
            # Directly fit distributions and calculate capability
            # Try common distributions
            distributions = ['gamma', 'lognorm', 'weibull_min']
            best_dist = None
            best_kstest = 0
            
            for dist_name in distributions:
                try:
                    # Fit distribution
                    params = getattr(stats, dist_name).fit(values)
                    # Calculate Kolmogorov-Smirnov test
                    ks_stat, ks_p = stats.kstest(values, dist_name, params)
                    
                    if ks_p > best_kstest:
                        best_kstest = ks_p
                        best_dist = {
                            'name': dist_name,
                            'params': params,
                            'ks_p': ks_p
                        }
                except Exception:
                    # Skip if distribution can't be fit
                    continue
            
            if best_dist:
                # Use the best-fitting distribution
                dist = getattr(stats, best_dist['name'])
                params = best_dist['params']
                
                # Calculate capability indices based on percentiles
                below_lsl = dist.cdf(lsl, *params)
                above_usl = 1 - dist.cdf(usl, *params)
                within_spec = 1 - below_lsl - above_usl
                
                # Calculate Z equivalents
                z_lsl = stats.norm.ppf(below_lsl)
                z_usl = stats.norm.ppf(1 - above_usl)
                
                # Calculate Z-based capability indices
                z_min = min(abs(z_lsl), abs(z_usl))
                z_bench = (z_usl - z_lsl) / 6
                
                result['transformation'] = 'direct_fit'
                result['distribution'] = {
                    'name': best_dist['name'],
                    'parameters': [float(p) for p in params],
                    'ks_test_p': float(best_dist['ks_p'])
                }
                result['capability_indices'] = {
                    'Z_bench': float(z_bench),
                    'Z_min': float(z_min),
                    'Ppk': float(z_min / 3),
                    'Pp': float(z_bench),
                    'within_spec_percent': float(within_spec * 100),
                    'below_lsl_percent': float(below_lsl * 100),
                    'above_usl_percent': float(above_usl * 100)
                }
            else:
                # If no good fit, fall back to percentile-based capability
                result['transformation'] = 'none'
                result['capability_indices'] = self._calculate_percentile_capability(
                    values, lsl, usl, target
                )
        
        else:
            # Unknown transformation, fall back to percentile-based capability
            result['transformation'] = 'none'
            result['capability_indices'] = self._calculate_percentile_capability(
                values, lsl, usl, target
            )
        
        return result
    
    def _transform_boxcox(self, x: float, lambda_param: float) -> float:
        """Apply Box-Cox transformation to a single value."""
        if lambda_param == 0:
            return np.log(x)
        else:
            return (x ** lambda_param - 1) / lambda_param
    
    def _transform_yeojohnson(self, x: float, lambda_param: float) -> float:
        """Apply Yeo-Johnson transformation to a single value."""
        if x >= 0:
            if lambda_param == 0:
                return np.log(x + 1)
            else:
                return ((x + 1) ** lambda_param - 1) / lambda_param
        else:
            if lambda_param == 2:
                return -np.log(-x + 1)
            else:
                return -((-x + 1) ** (2 - lambda_param) - 1) / (2 - lambda_param)
    
    def _calculate_percentile_capability(
        self, 
        data: np.ndarray, 
        lsl: float, 
        usl: float,
        target: Optional[float] = None
    ) -> Dict[str, float]:
        """Calculate capability indices based on percentiles."""
        if target is None:
            target = (lsl + usl) / 2
        
        # Calculate percentiles
        p_lsl = np.percentile(data, 0.135)  # 3 sigma below mean
        p_usl = np.percentile(data, 99.865)  # 3 sigma above mean
        median = np.median(data)
        
        # Calculate equivalent sigma
        sigma_equiv = (p_usl - p_lsl) / 6
        
        # Calculate percentile-based capability indices
        pp = (usl - lsl) / (6 * sigma_equiv) if sigma_equiv > 0 else float('inf')
        ppu = (usl - median) / (3 * sigma_equiv) if sigma_equiv > 0 else float('inf')
        ppl = (median - lsl) / (3 * sigma_equiv) if sigma_equiv > 0 else float('inf')
        ppk = min(ppu, ppl)
        
        # Calculate actual out-of-spec percentages
        below_lsl = np.sum(data < lsl) / len(data) * 100
        above_usl = np.sum(data > usl) / len(data) * 100
        within_spec = 100 - below_lsl - above_usl
        
        return {
            'Pp': float(pp),
            'Ppk': float(ppk),
            'Ppu': float(ppu),
            'Ppl': float(ppl),
            'within_spec_percent': float(within_spec),
            'below_lsl_percent': float(below_lsl),
            'above_usl_percent': float(above_usl)
        }