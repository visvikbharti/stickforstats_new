"""
Control Charts service module for SQC Analysis.

This module provides services for creating and analyzing control charts,
converting the control chart functionality from the Streamlit-based SQC module.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Union, Any
from django.conf import settings
import json
import logging
import matplotlib.pyplot as plt
import io
import base64
from scipy import stats
from dataclasses import dataclass

# Get logger
logger = logging.getLogger(__name__)


@dataclass
class ControlChartResult:
    """Data class for control chart calculation results."""
    chart_type: str
    center_line: float
    upper_control_limit: float
    lower_control_limit: float
    data_points: list
    subgroups: list = None
    violations: list = None
    secondary_center_line: float = None
    secondary_upper_control_limit: float = None
    secondary_lower_control_limit: float = None
    secondary_data_points: list = None
    secondary_violations: list = None
    process_statistics: dict = None
    plot_data: dict = None
    chart_interpretation: str = None


class ControlChartService:
    """Service for control chart analysis."""
    
    def __init__(self):
        """Initialize the control chart service."""
        pass
    
    def calculate_xbar_r_chart(
        self, 
        data: pd.DataFrame, 
        value_column: str, 
        subgroup_column: Optional[str] = None,
        sample_size: int = 5,
        detect_rules: bool = True,
        rule_set: str = 'western_electric',
        custom_control_limits: Optional[Dict[str, float]] = None
    ) -> ControlChartResult:
        """
        Calculate X-bar and R chart control limits and statistics.
        
        Args:
            data: DataFrame containing the data
            value_column: Column containing the measurement values
            subgroup_column: Column used to define subgroups (if None, consecutive rows will be used)
            sample_size: Number of samples per subgroup (if subgroup_column is None)
            detect_rules: Whether to detect rule violations
            rule_set: Which set of rules to use for detection ('western_electric' or 'nelson')
            custom_control_limits: Optional dictionary with custom control limits
        
        Returns:
            ControlChartResult: Object containing all chart data and statistics
        """
        try:
            # Prepare data for analysis
            if subgroup_column:
                # Use existing subgroups
                grouped_data = data.groupby(subgroup_column)[value_column].apply(list).reset_index()
                subgroups = grouped_data[value_column].tolist()
                subgroup_labels = grouped_data[subgroup_column].tolist()
            else:
                # Create subgroups from consecutive rows
                values = data[value_column].tolist()
                subgroups = [values[i:i+sample_size] for i in range(0, len(values), sample_size) 
                            if len(values[i:i+sample_size]) == sample_size]
                subgroup_labels = [f"Subgroup {i+1}" for i in range(len(subgroups))]
            
            # Calculate subgroup statistics
            xbar_values = [np.mean(subgroup) for subgroup in subgroups]
            range_values = [np.max(subgroup) - np.min(subgroup) for subgroup in subgroups]
            
            # Calculate control limits
            xbar = np.mean(xbar_values)
            rbar = np.mean(range_values)
            
            # Control chart constants
            n = sample_size
            # Constants for X-bar chart
            a2_values = {2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577, 6: 0.483, 
                        7: 0.419, 8: 0.373, 9: 0.337, 10: 0.308}
            # Constants for R chart
            d3_values = {2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0.076, 8: 0.136, 9: 0.184, 10: 0.223}
            d4_values = {2: 3.267, 3: 2.575, 4: 2.282, 5: 2.115, 6: 2.004, 
                        7: 1.924, 8: 1.864, 9: 1.816, 10: 1.777}
            
            # Use constants for the appropriate sample size (default to 5 if not in range)
            a2 = a2_values.get(n, 0.577)  # Default to n=5 if not in range
            d3 = d3_values.get(n, 0)
            d4 = d4_values.get(n, 2.115)
            
            # Calculate control limits for X-bar chart
            x_ucl = xbar + (a2 * rbar)
            x_lcl = xbar - (a2 * rbar)
            
            # Calculate control limits for R chart
            r_ucl = d4 * rbar
            r_lcl = d3 * rbar
            
            # Apply custom control limits if provided
            if custom_control_limits:
                if 'x_ucl' in custom_control_limits:
                    x_ucl = custom_control_limits['x_ucl']
                if 'x_lcl' in custom_control_limits:
                    x_lcl = custom_control_limits['x_lcl']
                if 'x_cl' in custom_control_limits:
                    xbar = custom_control_limits['x_cl']
                if 'r_ucl' in custom_control_limits:
                    r_ucl = custom_control_limits['r_ucl']
                if 'r_lcl' in custom_control_limits:
                    r_lcl = custom_control_limits['r_lcl']
                if 'r_cl' in custom_control_limits:
                    rbar = custom_control_limits['r_cl']
            
            # Detect rule violations if requested
            x_violations = []
            r_violations = []
            
            if detect_rules:
                x_violations = self._detect_rule_violations(
                    xbar_values, xbar, x_ucl, x_lcl, rule_set
                )
                r_violations = self._detect_rule_violations(
                    range_values, rbar, r_ucl, r_lcl, rule_set
                )
            
            # Calculate process statistics
            process_stats = {
                'average': xbar,
                'average_range': rbar,
                'standard_deviation': rbar / self._get_d2(n),
                'sample_size': n,
                'num_subgroups': len(subgroups),
                'total_sample_points': sum(len(subgroup) for subgroup in subgroups),
            }
            
            # Generate interpretation
            interpretation = self._generate_xbar_r_interpretation(
                xbar_values, range_values, xbar, rbar, x_ucl, x_lcl, r_ucl, r_lcl,
                x_violations, r_violations, process_stats
            )
            
            # Prepare plot data in a format suitable for JavaScript libraries
            plot_data = {
                'x_data': list(range(1, len(xbar_values) + 1)),
                'xbar_values': xbar_values,
                'range_values': range_values,
                'x_center_line': xbar,
                'x_ucl': x_ucl,
                'x_lcl': x_lcl,
                'r_center_line': rbar,
                'r_ucl': r_ucl,
                'r_lcl': r_lcl,
                'subgroup_labels': subgroup_labels,
                'x_violations': x_violations,
                'r_violations': r_violations,
                'subgroups': [{'name': label, 'values': values} 
                             for label, values in zip(subgroup_labels, subgroups)]
            }
            
            # Create result object
            result = ControlChartResult(
                chart_type='xbar_r',
                center_line=xbar,
                upper_control_limit=x_ucl,
                lower_control_limit=x_lcl,
                data_points=xbar_values,
                subgroups=subgroups,
                violations=x_violations,
                secondary_center_line=rbar,
                secondary_upper_control_limit=r_ucl,
                secondary_lower_control_limit=r_lcl,
                secondary_data_points=range_values,
                secondary_violations=r_violations,
                process_statistics=process_stats,
                plot_data=plot_data,
                chart_interpretation=interpretation
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error calculating X-bar R chart: {str(e)}")
            raise
    
    def calculate_xbar_s_chart(
        self, 
        data: pd.DataFrame, 
        value_column: str, 
        subgroup_column: Optional[str] = None,
        sample_size: int = 5,
        detect_rules: bool = True,
        rule_set: str = 'western_electric',
        custom_control_limits: Optional[Dict[str, float]] = None
    ) -> ControlChartResult:
        """
        Calculate X-bar and S chart control limits and statistics.
        
        Args:
            data: DataFrame containing the data
            value_column: Column containing the measurement values
            subgroup_column: Column used to define subgroups (if None, consecutive rows will be used)
            sample_size: Number of samples per subgroup (if subgroup_column is None)
            detect_rules: Whether to detect rule violations
            rule_set: Which set of rules to use for detection ('western_electric' or 'nelson')
            custom_control_limits: Optional dictionary with custom control limits
        
        Returns:
            ControlChartResult: Object containing all chart data and statistics
        """
        try:
            # Prepare data for analysis
            if subgroup_column:
                # Use existing subgroups
                grouped_data = data.groupby(subgroup_column)[value_column].apply(list).reset_index()
                subgroups = grouped_data[value_column].tolist()
                subgroup_labels = grouped_data[subgroup_column].tolist()
            else:
                # Create subgroups from consecutive rows
                values = data[value_column].tolist()
                subgroups = [values[i:i+sample_size] for i in range(0, len(values), sample_size) 
                            if len(values[i:i+sample_size]) == sample_size]
                subgroup_labels = [f"Subgroup {i+1}" for i in range(len(subgroups))]
            
            # Calculate subgroup statistics
            xbar_values = [np.mean(subgroup) for subgroup in subgroups]
            s_values = [np.std(subgroup, ddof=1) for subgroup in subgroups]
            
            # Calculate overall statistics
            xbar = np.mean(xbar_values)
            sbar = np.mean(s_values)
            
            # Control chart constants
            n = sample_size
            # Constants for X-bar chart with S
            a3_values = {2: 2.659, 3: 1.954, 4: 1.628, 5: 1.427, 6: 1.287, 
                        7: 1.182, 8: 1.099, 9: 1.032, 10: 0.975}
            # Constants for S chart
            b3_values = {2: 0, 3: 0, 4: 0, 5: 0, 6: 0.030, 7: 0.118, 8: 0.185, 9: 0.239, 10: 0.284}
            b4_values = {2: 3.267, 3: 2.568, 4: 2.266, 5: 2.089, 6: 1.970, 
                        7: 1.882, 8: 1.815, 9: 1.761, 10: 1.716}
            
            # Use constants for the appropriate sample size
            a3 = a3_values.get(n, 1.427)  # Default to n=5 if not in range
            b3 = b3_values.get(n, 0)
            b4 = b4_values.get(n, 2.089)
            
            # Calculate control limits for X-bar chart
            x_ucl = xbar + (a3 * sbar)
            x_lcl = xbar - (a3 * sbar)
            
            # Calculate control limits for S chart
            s_ucl = b4 * sbar
            s_lcl = b3 * sbar
            
            # Apply custom control limits if provided
            if custom_control_limits:
                if 'x_ucl' in custom_control_limits:
                    x_ucl = custom_control_limits['x_ucl']
                if 'x_lcl' in custom_control_limits:
                    x_lcl = custom_control_limits['x_lcl']
                if 'x_cl' in custom_control_limits:
                    xbar = custom_control_limits['x_cl']
                if 's_ucl' in custom_control_limits:
                    s_ucl = custom_control_limits['s_ucl']
                if 's_lcl' in custom_control_limits:
                    s_lcl = custom_control_limits['s_lcl']
                if 's_cl' in custom_control_limits:
                    sbar = custom_control_limits['s_cl']
            
            # Detect rule violations if requested
            x_violations = []
            s_violations = []
            
            if detect_rules:
                x_violations = self._detect_rule_violations(
                    xbar_values, xbar, x_ucl, x_lcl, rule_set
                )
                s_violations = self._detect_rule_violations(
                    s_values, sbar, s_ucl, s_lcl, rule_set
                )
            
            # Calculate process statistics
            c4 = self._get_c4(n)
            process_stats = {
                'average': xbar,
                'average_std_dev': sbar,
                'estimated_std_dev': sbar / c4,
                'sample_size': n,
                'num_subgroups': len(subgroups),
                'total_sample_points': sum(len(subgroup) for subgroup in subgroups),
            }
            
            # Generate interpretation
            interpretation = self._generate_xbar_s_interpretation(
                xbar_values, s_values, xbar, sbar, x_ucl, x_lcl, s_ucl, s_lcl,
                x_violations, s_violations, process_stats
            )
            
            # Prepare plot data in a format suitable for JavaScript libraries
            plot_data = {
                'x_data': list(range(1, len(xbar_values) + 1)),
                'xbar_values': xbar_values,
                's_values': s_values,
                'x_center_line': xbar,
                'x_ucl': x_ucl,
                'x_lcl': x_lcl,
                's_center_line': sbar,
                's_ucl': s_ucl,
                's_lcl': s_lcl,
                'subgroup_labels': subgroup_labels,
                'x_violations': x_violations,
                's_violations': s_violations,
                'subgroups': [{'name': label, 'values': values} 
                             for label, values in zip(subgroup_labels, subgroups)]
            }
            
            # Create result object
            result = ControlChartResult(
                chart_type='xbar_s',
                center_line=xbar,
                upper_control_limit=x_ucl,
                lower_control_limit=x_lcl,
                data_points=xbar_values,
                subgroups=subgroups,
                violations=x_violations,
                secondary_center_line=sbar,
                secondary_upper_control_limit=s_ucl,
                secondary_lower_control_limit=s_lcl,
                secondary_data_points=s_values,
                secondary_violations=s_violations,
                process_statistics=process_stats,
                plot_data=plot_data,
                chart_interpretation=interpretation
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error calculating X-bar S chart: {str(e)}")
            raise
    
    def calculate_i_mr_chart(
        self, 
        data: pd.DataFrame, 
        value_column: str,
        time_column: Optional[str] = None,
        detect_rules: bool = True,
        rule_set: str = 'western_electric',
        custom_control_limits: Optional[Dict[str, float]] = None
    ) -> ControlChartResult:
        """
        Calculate Individual and Moving Range (I-MR) chart control limits and statistics.
        
        Args:
            data: DataFrame containing the data
            value_column: Column containing the individual measurement values
            time_column: Optional column for time-ordered data points
            detect_rules: Whether to detect rule violations
            rule_set: Which set of rules to use for detection ('western_electric' or 'nelson')
            custom_control_limits: Optional dictionary with custom control limits
        
        Returns:
            ControlChartResult: Object containing all chart data and statistics
        """
        try:
            # Extract the individual values
            if time_column and time_column in data.columns:
                # Sort by time column if provided
                data = data.sort_values(by=time_column)
            
            individual_values = data[value_column].tolist()
            
            # Calculate moving ranges (difference between consecutive points)
            moving_ranges = [abs(individual_values[i] - individual_values[i-1]) 
                            for i in range(1, len(individual_values))]
            
            # Calculate statistics
            x_bar = np.mean(individual_values)
            mr_bar = np.mean(moving_ranges)
            
            # Constants for I-MR chart
            d2 = 1.128  # For n=2 (moving range of 2 consecutive points)
            
            # Calculate control limits for individual chart
            i_ucl = x_bar + 3 * (mr_bar / d2)
            i_lcl = x_bar - 3 * (mr_bar / d2)
            
            # Calculate control limits for moving range chart
            mr_ucl = 3.267 * mr_bar  # D4 for n=2
            mr_lcl = 0  # D3 for n=2
            
            # Apply custom control limits if provided
            if custom_control_limits:
                if 'i_ucl' in custom_control_limits:
                    i_ucl = custom_control_limits['i_ucl']
                if 'i_lcl' in custom_control_limits:
                    i_lcl = custom_control_limits['i_lcl']
                if 'i_cl' in custom_control_limits:
                    x_bar = custom_control_limits['i_cl']
                if 'mr_ucl' in custom_control_limits:
                    mr_ucl = custom_control_limits['mr_ucl']
                if 'mr_lcl' in custom_control_limits:
                    mr_lcl = custom_control_limits['mr_lcl']
                if 'mr_cl' in custom_control_limits:
                    mr_bar = custom_control_limits['mr_cl']
            
            # Detect rule violations if requested
            i_violations = []
            mr_violations = []
            
            if detect_rules:
                i_violations = self._detect_rule_violations(
                    individual_values, x_bar, i_ucl, i_lcl, rule_set
                )
                # For MR chart, we need to handle the offset in indices
                mr_violations_raw = self._detect_rule_violations(
                    moving_ranges, mr_bar, mr_ucl, mr_lcl, rule_set
                )
                # Adjust indices to match original data (MR starts at index 1)
                mr_violations = [(point_idx + 1, rule_idx) for point_idx, rule_idx in mr_violations_raw]
            
            # Check for autocorrelation
            autocorrelation = None
            if len(individual_values) >= 30:  # Need sufficient data for reliable autocorrelation
                autocorrelation = np.corrcoef(individual_values[:-1], individual_values[1:])[0, 1]
            
            # Calculate process statistics
            process_stats = {
                'average': x_bar,
                'average_moving_range': mr_bar,
                'estimated_std_dev': mr_bar / d2,
                'num_points': len(individual_values),
                'autocorrelation': autocorrelation
            }
            
            # Generate interpretation
            interpretation = self._generate_i_mr_interpretation(
                individual_values, moving_ranges, x_bar, mr_bar, 
                i_ucl, i_lcl, mr_ucl, mr_lcl, i_violations, mr_violations, 
                process_stats, autocorrelation
            )
            
            # Prepare data points for MR chart (add None for the first point)
            mr_plot_values = [None] + moving_ranges
            
            # Prepare plot data
            if time_column and time_column in data.columns:
                x_data = data[time_column].tolist()
            else:
                x_data = list(range(1, len(individual_values) + 1))
            
            plot_data = {
                'x_data': x_data,
                'individual_values': individual_values,
                'moving_ranges': mr_plot_values,
                'i_center_line': x_bar,
                'i_ucl': i_ucl,
                'i_lcl': i_lcl,
                'mr_center_line': mr_bar,
                'mr_ucl': mr_ucl,
                'mr_lcl': mr_lcl,
                'i_violations': i_violations,
                'mr_violations': mr_violations,
                'autocorrelation': autocorrelation
            }
            
            # Create result object
            result = ControlChartResult(
                chart_type='i_mr',
                center_line=x_bar,
                upper_control_limit=i_ucl,
                lower_control_limit=i_lcl,
                data_points=individual_values,
                violations=i_violations,
                secondary_center_line=mr_bar,
                secondary_upper_control_limit=mr_ucl,
                secondary_lower_control_limit=mr_lcl,
                secondary_data_points=mr_plot_values,
                secondary_violations=mr_violations,
                process_statistics=process_stats,
                plot_data=plot_data,
                chart_interpretation=interpretation
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error calculating I-MR chart: {str(e)}")
            raise
    
    def calculate_p_chart(
        self, 
        data: pd.DataFrame,
        defective_column: str,
        sample_size_column: Optional[str] = None,
        sample_size: Optional[int] = None,
        detect_rules: bool = True,
        rule_set: str = 'western_electric',
        custom_control_limits: Optional[Dict[str, float]] = None
    ) -> ControlChartResult:
        """
        Calculate p chart (proportion defective) control limits and statistics.
        
        Args:
            data: DataFrame containing the data
            defective_column: Column containing the number of defectives
            sample_size_column: Column containing the sample size for each subgroup
            sample_size: Fixed sample size (if sample_size_column not provided)
            detect_rules: Whether to detect rule violations
            rule_set: Which set of rules to use for detection ('western_electric' or 'nelson')
            custom_control_limits: Optional dictionary with custom control limits
        
        Returns:
            ControlChartResult: Object containing all chart data and statistics
        """
        try:
            # Get defective counts
            defective_counts = data[defective_column].values
            
            # Get sample sizes
            if sample_size_column and sample_size_column in data.columns:
                sample_sizes = data[sample_size_column].values
                variable_sample_size = True
            elif sample_size:
                sample_sizes = np.full(len(defective_counts), sample_size)
                variable_sample_size = False
            else:
                raise ValueError("Either sample_size_column or sample_size must be provided")
            
            # Calculate proportion defective for each subgroup
            p_values = defective_counts / sample_sizes
            
            # Calculate overall proportion defective
            total_defectives = np.sum(defective_counts)
            total_inspected = np.sum(sample_sizes)
            p_bar = total_defectives / total_inspected
            
            # Calculate control limits for each subgroup
            p_ucl = []
            p_lcl = []
            
            for n in sample_sizes:
                # Standard 3-sigma limits for p chart
                sigma_p = np.sqrt((p_bar * (1 - p_bar)) / n)
                ucl = p_bar + 3 * sigma_p
                lcl = max(0, p_bar - 3 * sigma_p)  # Lower limit can't be negative
                
                p_ucl.append(ucl)
                p_lcl.append(lcl)
            
            # Apply custom control limits if provided
            if custom_control_limits:
                if 'p_cl' in custom_control_limits:
                    p_bar = custom_control_limits['p_cl']
                if 'p_ucl' in custom_control_limits and not variable_sample_size:
                    p_ucl = [custom_control_limits['p_ucl']] * len(p_values)
                if 'p_lcl' in custom_control_limits and not variable_sample_size:
                    p_lcl = [custom_control_limits['p_lcl']] * len(p_values)
            
            # Detect rule violations
            violations = []
            if detect_rules:
                # For variable control limits, we need to standardize the data
                if variable_sample_size:
                    # Convert to standardized z-scores
                    sigma_p_values = [np.sqrt((p_bar * (1 - p_bar)) / n) for n in sample_sizes]
                    z_scores = [(p - p_bar) / sigma_p for p, sigma_p in zip(p_values, sigma_p_values)]
                    
                    # Detect violations on standardized scores
                    violations = self._detect_rule_violations(
                        z_scores, 0, 3, -3, rule_set
                    )
                else:
                    # Fixed control limits
                    violations = self._detect_rule_violations(
                        p_values, p_bar, p_ucl[0], p_lcl[0], rule_set
                    )
            
            # Calculate process statistics
            process_stats = {
                'average_proportion': p_bar,
                'total_defectives': total_defectives,
                'total_inspected': total_inspected,
                'overall_percent_defective': p_bar * 100,
                'variable_sample_size': variable_sample_size
            }
            
            # Generate interpretation
            interpretation = self._generate_p_chart_interpretation(
                p_values, defective_counts, sample_sizes, p_bar,
                p_ucl, p_lcl, violations, process_stats
            )
            
            # Prepare plot data
            x_data = list(range(1, len(p_values) + 1))
            
            plot_data = {
                'x_data': x_data,
                'p_values': p_values.tolist(),
                'defective_counts': defective_counts.tolist(),
                'sample_sizes': sample_sizes.tolist(),
                'center_line': p_bar,
                'ucl': p_ucl,
                'lcl': p_lcl,
                'violations': violations,
                'variable_sample_size': variable_sample_size
            }
            
            # For consistent results, use the average UCL/LCL if variable sample size
            if variable_sample_size:
                avg_ucl = np.mean(p_ucl)
                avg_lcl = np.mean(p_lcl)
            else:
                avg_ucl = p_ucl[0]
                avg_lcl = p_lcl[0]
            
            # Create result object
            result = ControlChartResult(
                chart_type='p',
                center_line=p_bar,
                upper_control_limit=avg_ucl,
                lower_control_limit=avg_lcl,
                data_points=p_values.tolist(),
                violations=violations,
                process_statistics=process_stats,
                plot_data=plot_data,
                chart_interpretation=interpretation
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error calculating p chart: {str(e)}")
            raise
    
    def _get_d2(self, n: int) -> float:
        """Get the d2 constant for a given sample size."""
        d2_values = {
            2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326, 
            6: 2.534, 7: 2.704, 8: 2.847, 9: 2.970, 10: 3.078
        }
        return d2_values.get(n, 2.326)  # Default to n=5 if not in range
    
    def _get_c4(self, n: int) -> float:
        """Get the c4 constant for a given sample size."""
        return np.sqrt(2 / (n - 1)) * np.math.gamma(n / 2) / np.math.gamma((n - 1) / 2)
    
    def _detect_rule_violations(
        self, 
        values: List[float], 
        center_line: float, 
        ucl: float, 
        lcl: float, 
        rule_set: str = 'western_electric'
    ) -> List[Tuple[int, int]]:
        """
        Detect control chart rule violations.
        
        Args:
            values: Data points to check
            center_line: Chart center line
            ucl: Upper control limit
            lcl: Lower control limit
            rule_set: Which set of rules to use ('western_electric' or 'nelson')
        
        Returns:
            List of tuples (point_index, rule_number) indicating violations
        """
        violations = []
        
        # Convert to numpy array for easier manipulation
        values_array = np.array(values)
        n = len(values_array)
        
        # Calculate zones (A, B, C) for zone-based rules
        zone_a_upper = ucl
        zone_a_lower = center_line + 2 * (ucl - center_line) / 3
        zone_b_upper = zone_a_lower
        zone_b_lower = center_line + (ucl - center_line) / 3
        zone_c_upper = zone_b_lower
        zone_c_lower = center_line
        
        # Symmetric zones below center line
        zone_c_lower_neg = center_line - (ucl - center_line) / 3
        zone_b_lower_neg = center_line - 2 * (ucl - center_line) / 3
        zone_a_lower_neg = lcl
        
        # Rule 1: Any point beyond control limits
        for i in range(n):
            if values_array[i] > ucl or values_array[i] < lcl:
                violations.append((i, 1))
        
        if rule_set == 'western_electric':
            # Rule 2: 2 out of 3 consecutive points in Zone A or beyond
            for i in range(1, n-1):
                window = values_array[i-1:i+2]
                beyond_2sigma_count = sum(
                    (v >= zone_a_lower or v <= zone_b_lower_neg) for v in window
                )
                if beyond_2sigma_count >= 2:
                    violations.append((i, 2))
            
            # Rule 3: 4 out of 5 consecutive points in Zone B or beyond
            for i in range(2, n-2):
                window = values_array[i-2:i+3]
                beyond_1sigma_count = sum(
                    (v >= zone_b_lower or v <= zone_c_lower_neg) for v in window
                )
                if beyond_1sigma_count >= 4:
                    violations.append((i, 3))
            
            # Rule 4: 8 consecutive points on same side of center line
            for i in range(7, n):
                window = values_array[i-7:i+1]
                if all(v > center_line for v in window) or all(v < center_line for v in window):
                    violations.append((i, 4))
        
        elif rule_set == 'nelson':
            # Nelson Rule 2: 9 consecutive points on same side of center line
            for i in range(8, n):
                window = values_array[i-8:i+1]
                if all(v > center_line for v in window) or all(v < center_line for v in window):
                    violations.append((i, 2))
            
            # Nelson Rule 3: 6 consecutive points increasing or decreasing
            for i in range(5, n):
                window = values_array[i-5:i+1]
                if all(window[j] < window[j+1] for j in range(5)) or \
                   all(window[j] > window[j+1] for j in range(5)):
                    violations.append((i, 3))
            
            # Nelson Rule 4: 14 consecutive points alternating up and down
            for i in range(13, n):
                window = values_array[i-13:i+1]
                alternating = True
                for j in range(13):
                    if (window[j] < window[j+1] and window[j+1] < window[j+2]) or \
                       (window[j] > window[j+1] and window[j+1] > window[j+2]):
                        alternating = False
                        break
                if alternating:
                    violations.append((i, 4))
            
            # Nelson Rule 5: 2 out of 3 consecutive points in Zone A or beyond
            for i in range(1, n-1):
                window = values_array[i-1:i+2]
                beyond_2sigma_count = sum(
                    (v >= zone_a_lower or v <= zone_b_lower_neg) for v in window
                )
                if beyond_2sigma_count >= 2:
                    violations.append((i, 5))
            
            # Nelson Rule 6: 4 out of 5 consecutive points in Zone B or beyond
            for i in range(2, n-2):
                window = values_array[i-2:i+3]
                beyond_1sigma_count = sum(
                    (v >= zone_b_lower or v <= zone_c_lower_neg) for v in window
                )
                if beyond_1sigma_count >= 4:
                    violations.append((i, 6))
            
            # Nelson Rule 7: 15 consecutive points in Zone C (both above and below center line)
            for i in range(14, n):
                window = values_array[i-14:i+1]
                in_zone_c = sum(
                    (v < zone_b_lower and v > zone_c_lower_neg) for v in window
                )
                if in_zone_c == 15:
                    violations.append((i, 7))
            
            # Nelson Rule 8: 8 consecutive points on both sides of center line, none in Zone C
            for i in range(7, n):
                window = values_array[i-7:i+1]
                not_in_zone_c = all(
                    v >= zone_b_lower or v <= zone_c_lower_neg for v in window
                )
                both_sides = any(v > center_line for v in window) and any(v < center_line for v in window)
                if not_in_zone_c and both_sides:
                    violations.append((i, 8))
        
        return violations
    
    def _generate_xbar_r_interpretation(
        self,
        xbar_values: List[float],
        range_values: List[float],
        xbar: float,
        rbar: float,
        x_ucl: float,
        x_lcl: float,
        r_ucl: float,
        r_lcl: float,
        x_violations: List[Tuple[int, int]],
        r_violations: List[Tuple[int, int]],
        process_stats: Dict[str, Any]
    ) -> str:
        """Generate interpretation text for X-bar R chart results."""
        interpretation = []
        
        # Basic statistics summary
        interpretation.append(f"Process average: {xbar:.4f}")
        interpretation.append(f"Average range: {rbar:.4f}")
        interpretation.append(f"Estimated process standard deviation: {process_stats['standard_deviation']:.4f}")
        
        # Process control status
        x_out_of_control = any(rule == 1 for _, rule in x_violations)
        r_out_of_control = any(rule == 1 for _, rule in r_violations)
        
        if x_out_of_control or len(x_violations) > 0:
            interpretation.append("The process mean exhibits signs of special cause variation.")
            
            # Note specific violations
            violation_subgroups = set(i+1 for i, _ in x_violations)
            if violation_subgroups:
                interpretation.append(f"Subgroups {', '.join(map(str, sorted(violation_subgroups)))} show pattern violations on the X-bar chart.")
        else:
            interpretation.append("The process mean appears to be in statistical control.")
        
        if r_out_of_control or len(r_violations) > 0:
            interpretation.append("The process variation exhibits signs of special cause variation.")
            
            # Note specific violations
            violation_subgroups = set(i+1 for i, _ in r_violations)
            if violation_subgroups:
                interpretation.append(f"Subgroups {', '.join(map(str, sorted(violation_subgroups)))} show pattern violations on the R chart.")
        else:
            interpretation.append("The process variation appears to be in statistical control.")
        
        # Overall assessment
        if x_out_of_control or r_out_of_control or len(x_violations) > 0 or len(r_violations) > 0:
            interpretation.append("Recommended Action: Investigate the special causes identified and take corrective action.")
        else:
            interpretation.append("The process appears to be in statistical control. Continue monitoring.")
        
        return "\n".join(interpretation)
    
    def _generate_xbar_s_interpretation(
        self,
        xbar_values: List[float],
        s_values: List[float],
        xbar: float,
        sbar: float,
        x_ucl: float,
        x_lcl: float,
        s_ucl: float,
        s_lcl: float,
        x_violations: List[Tuple[int, int]],
        s_violations: List[Tuple[int, int]],
        process_stats: Dict[str, Any]
    ) -> str:
        """Generate interpretation text for X-bar S chart results."""
        interpretation = []
        
        # Basic statistics summary
        interpretation.append(f"Process average: {xbar:.4f}")
        interpretation.append(f"Average standard deviation: {sbar:.4f}")
        interpretation.append(f"Estimated process standard deviation: {process_stats['estimated_std_dev']:.4f}")
        
        # Process control status
        x_out_of_control = any(rule == 1 for _, rule in x_violations)
        s_out_of_control = any(rule == 1 for _, rule in s_violations)
        
        if x_out_of_control or len(x_violations) > 0:
            interpretation.append("The process mean exhibits signs of special cause variation.")
            
            # Note specific violations
            violation_subgroups = set(i+1 for i, _ in x_violations)
            if violation_subgroups:
                interpretation.append(f"Subgroups {', '.join(map(str, sorted(violation_subgroups)))} show pattern violations on the X-bar chart.")
        else:
            interpretation.append("The process mean appears to be in statistical control.")
        
        if s_out_of_control or len(s_violations) > 0:
            interpretation.append("The process variation exhibits signs of special cause variation.")
            
            # Note specific violations
            violation_subgroups = set(i+1 for i, _ in s_violations)
            if violation_subgroups:
                interpretation.append(f"Subgroups {', '.join(map(str, sorted(violation_subgroups)))} show pattern violations on the S chart.")
        else:
            interpretation.append("The process variation appears to be in statistical control.")
        
        # Comparison with X-bar R charts
        interpretation.append("The X-bar S chart is particularly suitable for this data as it provides better estimation of process variation with larger subgroup sizes.")
        
        # Overall assessment
        if x_out_of_control or s_out_of_control or len(x_violations) > 0 or len(s_violations) > 0:
            interpretation.append("Recommended Action: Investigate the special causes identified and take corrective action.")
        else:
            interpretation.append("The process appears to be in statistical control. Continue monitoring.")
        
        return "\n".join(interpretation)
    
    def _generate_i_mr_interpretation(
        self,
        individual_values: List[float],
        moving_ranges: List[float],
        x_bar: float,
        mr_bar: float,
        i_ucl: float,
        i_lcl: float,
        mr_ucl: float,
        mr_lcl: float,
        i_violations: List[Tuple[int, int]],
        mr_violations: List[Tuple[int, int]],
        process_stats: Dict[str, Any],
        autocorrelation: Optional[float]
    ) -> str:
        """Generate interpretation text for I-MR chart results."""
        interpretation = []
        
        # Basic statistics summary
        interpretation.append(f"Process average: {x_bar:.4f}")
        interpretation.append(f"Average moving range: {mr_bar:.4f}")
        interpretation.append(f"Estimated process standard deviation: {process_stats['estimated_std_dev']:.4f}")
        
        # Autocorrelation assessment
        if autocorrelation is not None:
            interpretation.append(f"Autocorrelation coefficient: {autocorrelation:.4f}")
            if abs(autocorrelation) > 0.5:
                interpretation.append("WARNING: Strong autocorrelation detected. I-MR chart assumptions may be violated.")
                interpretation.append("Consider using time series methods or investigating the autocorrelation source.")
            elif abs(autocorrelation) > 0.3:
                interpretation.append("CAUTION: Moderate autocorrelation detected. Results should be interpreted with care.")
        
        # Process control status
        i_out_of_control = any(rule == 1 for _, rule in i_violations)
        mr_out_of_control = any(rule == 1 for _, rule in mr_violations)
        
        if i_out_of_control or len(i_violations) > 0:
            interpretation.append("The process level exhibits signs of special cause variation.")
            
            # Note specific violations
            violation_points = set(i+1 for i, _ in i_violations)
            if violation_points:
                interpretation.append(f"Points {', '.join(map(str, sorted(violation_points)))} show pattern violations on the Individuals chart.")
        else:
            interpretation.append("The process level appears to be in statistical control.")
        
        if mr_out_of_control or len(mr_violations) > 0:
            interpretation.append("The process variation exhibits signs of special cause variation.")
            
            # Note specific violations
            violation_points = set(i+1 for i, _ in mr_violations)
            if violation_points:
                interpretation.append(f"Points {', '.join(map(str, sorted(violation_points)))} show pattern violations on the Moving Range chart.")
        else:
            interpretation.append("The process variation appears to be in statistical control.")
        
        # Overall assessment
        if i_out_of_control or mr_out_of_control or len(i_violations) > 0 or len(mr_violations) > 0:
            interpretation.append("Recommended Action: Investigate the special causes identified and take corrective action.")
        else:
            interpretation.append("The process appears to be in statistical control. Continue monitoring.")
        
        return "\n".join(interpretation)
    
    def _generate_p_chart_interpretation(
        self,
        p_values: List[float],
        defective_counts: List[int],
        sample_sizes: List[int],
        p_bar: float,
        p_ucl: List[float],
        p_lcl: List[float],
        violations: List[Tuple[int, int]],
        process_stats: Dict[str, Any]
    ) -> str:
        """Generate interpretation text for p chart results."""
        interpretation = []
        
        # Basic statistics summary
        interpretation.append(f"Average proportion defective: {p_bar:.4f} ({p_bar*100:.2f}%)")
        interpretation.append(f"Total defectives: {int(process_stats['total_defectives'])}")
        interpretation.append(f"Total inspected: {int(process_stats['total_inspected'])}")
        
        # Variable sample size assessment
        if process_stats['variable_sample_size']:
            interpretation.append("This chart uses variable sample sizes, resulting in different control limits for each subgroup.")
        
        # Process control status
        out_of_control = any(rule == 1 for _, rule in violations)
        
        if out_of_control or len(violations) > 0:
            interpretation.append("The proportion defective exhibits signs of special cause variation.")
            
            # Note specific violations
            violation_points = set(i+1 for i, _ in violations)
            if violation_points:
                interpretation.append(f"Subgroups {', '.join(map(str, sorted(violation_points)))} show pattern violations.")
            
            # Identify potential issues
            high_points = [i for i, p in enumerate(p_values) if p > p_bar + (p_ucl[i] - p_bar)/2]
            if high_points:
                high_subgroups = [i+1 for i in high_points]
                interpretation.append(f"Subgroups {', '.join(map(str, high_subgroups))} show elevated defect rates.")
                
            low_points = [i for i, p in enumerate(p_values) if p < p_bar - (p_bar - p_lcl[i])/2]
            if low_points:
                low_subgroups = [i+1 for i in low_points]
                interpretation.append(f"Subgroups {', '.join(map(str, low_subgroups))} show improved (lower) defect rates.")
        else:
            interpretation.append("The proportion defective appears to be in statistical control.")
        
        # Overall assessment
        if out_of_control or len(violations) > 0:
            interpretation.append("Recommended Action: Investigate the special causes identified and take corrective action.")
        else:
            interpretation.append("The process appears to be in statistical control. Continue monitoring.")
        
        # Process capability consideration
        if p_bar > 0.1:
            interpretation.append("NOTE: The defect rate is greater than 10%. Consider implementing process improvements.")
        
        return "\n".join(interpretation)