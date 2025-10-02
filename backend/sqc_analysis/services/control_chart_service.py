"""
Control Chart Service for Statistical Quality Control (SQC) Analysis.

This module provides services for creating and analyzing control charts,
adapted from the original Streamlit implementation to work with Django/React architecture.
"""

import numpy as np
import pandas as pd
import json
from typing import Dict, List, Optional, Tuple, Union, Any

from .utils_service import (
    generate_process_data,
    generate_process_data_with_shifts,
    generate_process_data_with_trends,
    generate_process_data_with_cycle,
    generate_subgrouped_data,
    calculate_control_limits,
    detect_out_of_control_points,
    detect_runs_and_trends
)

class ControlChartService:
    """
    Service for control chart analysis.
    """
    
    def __init__(self):
        """Initialize the control chart service."""
        pass
    
    def generate_chart_data(
        self,
        chart_type: str,
        process_parameters: Dict[str, Any],
        special_cause: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate data for a control chart with optional special causes.
        
        Args:
            chart_type: Type of control chart ('xbar_r', 'xbar_s', 'imr', etc.)
            process_parameters: Dictionary of process parameters (mean, std_dev, etc.)
            special_cause: Optional dictionary of special cause parameters
            
        Returns:
            Dictionary containing generated data and chart information
        """
        # Extract process parameters
        mean = process_parameters.get('mean', 10.0)
        std_dev = process_parameters.get('std_dev', 1.0)
        n_samples = process_parameters.get('n_samples', 100)
        subgroup_size = process_parameters.get('subgroup_size', 5)
        
        # Generate base data based on special cause type
        if special_cause is None:
            raw_data = generate_process_data(
                mean=mean,
                std_dev=std_dev,
                n_samples=n_samples
            )
            special_cause_info = None
        elif special_cause.get('type') == 'shift':
            raw_data, shift_point = generate_process_data_with_shifts(
                mean=mean,
                std_dev=std_dev,
                n_samples=n_samples,
                shift_point=special_cause.get('shift_point'),
                shift_size=special_cause.get('shift_size', 2.0)
            )
            special_cause_info = {
                'type': 'shift',
                'shift_point': shift_point,
                'shift_size': special_cause.get('shift_size', 2.0)
            }
        elif special_cause.get('type') == 'trend':
            raw_data, trend_start = generate_process_data_with_trends(
                mean=mean,
                std_dev=std_dev,
                n_samples=n_samples,
                trend_start=special_cause.get('trend_start'),
                trend_slope=special_cause.get('trend_slope', 0.1)
            )
            special_cause_info = {
                'type': 'trend',
                'trend_start': trend_start,
                'trend_slope': special_cause.get('trend_slope', 0.1)
            }
        elif special_cause.get('type') == 'cycle':
            raw_data = generate_process_data_with_cycle(
                mean=mean,
                std_dev=std_dev,
                n_samples=n_samples,
                amplitude=special_cause.get('amplitude', 1.0),
                frequency=special_cause.get('frequency', 0.1)
            )
            special_cause_info = {
                'type': 'cycle',
                'amplitude': special_cause.get('amplitude', 1.0),
                'frequency': special_cause.get('frequency', 0.1)
            }
        else:
            # Default to regular process data
            raw_data = generate_process_data(
                mean=mean,
                std_dev=std_dev,
                n_samples=n_samples
            )
            special_cause_info = None
        
        # Process the data based on chart type
        if chart_type in ['xbar_r', 'xbar_s']:
            # Create subgrouped data
            df = generate_subgrouped_data(raw_data, subgroup_size=subgroup_size)
            
            # Calculate control limits
            limits = calculate_control_limits(df, control_type=chart_type, subgroup_size=subgroup_size)
            
            # Detect out-of-control points
            out_of_control_xbar = detect_out_of_control_points(df, limits, chart_type='xbar')
            
            if chart_type == 'xbar_r':
                out_of_control_r = detect_out_of_control_points(df, limits, chart_type='r')
                out_of_control = {
                    'xbar': out_of_control_xbar,
                    'r': out_of_control_r
                }
            else:  # xbar_s
                out_of_control_s = detect_out_of_control_points(df, limits, chart_type='s')
                out_of_control = {
                    'xbar': out_of_control_xbar,
                    's': out_of_control_s
                }
            
            # Detect runs and trends
            patterns = detect_runs_and_trends(df, column='Mean', 
                                             center_line=limits['xbar']['center'])
            
        elif chart_type == 'imr':
            # For IMR chart, we use individual data points
            df = pd.DataFrame({
                'Measurement': raw_data
            })
            
            # Add moving range
            df['MovingRange'] = df['Measurement'].diff().abs()
            
            # Calculate control limits
            limits = {}
            ind_mean = df['Measurement'].mean()
            mr_mean = df['MovingRange'].dropna().mean()
            d2 = 1.128  # Constant for n=2
            
            limits['individuals'] = {
                'center': ind_mean,
                'lcl': ind_mean - 3 * mr_mean / d2,
                'ucl': ind_mean + 3 * mr_mean / d2
            }
            
            limits['mr'] = {
                'center': mr_mean,
                'lcl': 0,
                'ucl': 3.267 * mr_mean  # D4 constant for n=2
            }
            
            # Detect out-of-control points
            out_of_control_i = []
            for i, value in enumerate(df['Measurement']):
                if (value > limits['individuals']['ucl'] or 
                    value < limits['individuals']['lcl']):
                    out_of_control_i.append(i)
            
            out_of_control_mr = []
            for i, value in enumerate(df['MovingRange'].dropna()):
                if (value > limits['mr']['ucl'] or 
                    value < limits['mr']['lcl']):
                    out_of_control_mr.append(i + 1)  # +1 because first MR is at index 1
            
            out_of_control = {
                'individuals': out_of_control_i,
                'mr': out_of_control_mr
            }
            
            # Detect runs and trends
            patterns = detect_runs_and_trends(df, column='Measurement', 
                                             center_line=limits['individuals']['center'])
        
        # Convert DataFrame to JSON-serializable format
        df_dict = df.to_dict(orient='records')
        
        # Create result dictionary
        result = {
            'chart_type': chart_type,
            'data': df_dict,
            'raw_data': raw_data.tolist(),
            'limits': limits,
            'out_of_control': out_of_control,
            'patterns': patterns,
            'process_parameters': process_parameters,
            'special_cause_info': special_cause_info
        }
        
        return result
    
    def analyze_control_chart(
        self,
        data: Union[pd.DataFrame, List[Dict[str, Any]]],
        chart_type: str,
        subgroup_size: int = 5
    ) -> Dict[str, Any]:
        """
        Analyze existing data for control chart analysis.
        
        Args:
            data: DataFrame or list of dictionaries with process data
            chart_type: Type of control chart ('xbar_r', 'xbar_s', 'imr', etc.)
            subgroup_size: Number of measurements per subgroup
            
        Returns:
            Dictionary containing analysis results
        """
        # Convert to DataFrame if list of dictionaries
        if isinstance(data, list):
            df = pd.DataFrame(data)
        else:
            df = data.copy()
        
        # Process based on chart type
        if chart_type in ['xbar_r', 'xbar_s']:
            # Check if data is already in subgroup format
            has_mean_column = 'Mean' in df.columns
            has_range_column = 'Range' in df.columns
            has_stddev_column = 'StdDev' in df.columns
            
            if not (has_mean_column and has_range_column):
                # Data is not in subgroup format, convert it
                # We assume data is in wide format with one row per subgroup
                # Identify sample columns (looking for Sample_X pattern)
                sample_cols = [col for col in df.columns if col.startswith('Sample_')]
                
                if not sample_cols:
                    # Assume all numeric columns are samples
                    sample_cols = df.select_dtypes(include=['number']).columns.tolist()
                
                if len(sample_cols) > 0:
                    # Calculate subgroup statistics
                    df['Mean'] = df[sample_cols].mean(axis=1)
                    df['Range'] = df[sample_cols].max(axis=1) - df[sample_cols].min(axis=1)
                    df['StdDev'] = df[sample_cols].std(axis=1, ddof=1)
                    
                    # Add subgroup number if not present
                    if 'Subgroup' not in df.columns:
                        df.insert(0, 'Subgroup', range(1, len(df) + 1))
            
            # Calculate control limits
            limits = calculate_control_limits(df, control_type=chart_type, subgroup_size=subgroup_size)
            
            # Detect out-of-control points
            out_of_control_xbar = detect_out_of_control_points(df, limits, chart_type='xbar')
            
            if chart_type == 'xbar_r':
                out_of_control_r = detect_out_of_control_points(df, limits, chart_type='r')
                out_of_control = {
                    'xbar': out_of_control_xbar,
                    'r': out_of_control_r
                }
            else:  # xbar_s
                out_of_control_s = detect_out_of_control_points(df, limits, chart_type='s')
                out_of_control = {
                    'xbar': out_of_control_xbar,
                    's': out_of_control_s
                }
            
            # Detect runs and trends
            patterns = detect_runs_and_trends(df, column='Mean', 
                                            center_line=limits['xbar']['center'])
            
        elif chart_type == 'imr':
            # For IMR chart, we assume data has a measurement column
            measurement_col = None
            
            # Try to find the measurement column
            potential_cols = ['Measurement', 'Value', 'Reading']
            for col in potential_cols:
                if col in df.columns:
                    measurement_col = col
                    break
            
            if measurement_col is None:
                # Use the first numeric column
                measurement_col = df.select_dtypes(include=['number']).columns[0]
            
            # Rename to standardized column name
            df = df.rename(columns={measurement_col: 'Measurement'})
            
            # Add moving range if not present
            if 'MovingRange' not in df.columns:
                df['MovingRange'] = df['Measurement'].diff().abs()
            
            # Calculate control limits
            limits = {}
            ind_mean = df['Measurement'].mean()
            mr_mean = df['MovingRange'].dropna().mean()
            d2 = 1.128  # Constant for n=2
            
            limits['individuals'] = {
                'center': ind_mean,
                'lcl': ind_mean - 3 * mr_mean / d2,
                'ucl': ind_mean + 3 * mr_mean / d2
            }
            
            limits['mr'] = {
                'center': mr_mean,
                'lcl': 0,
                'ucl': 3.267 * mr_mean  # D4 constant for n=2
            }
            
            # Detect out-of-control points
            out_of_control_i = []
            for i, value in enumerate(df['Measurement']):
                if (value > limits['individuals']['ucl'] or 
                    value < limits['individuals']['lcl']):
                    out_of_control_i.append(i)
            
            out_of_control_mr = []
            for i, value in enumerate(df['MovingRange'].dropna()):
                if (value > limits['mr']['ucl'] or 
                    value < limits['mr']['lcl']):
                    out_of_control_mr.append(i + 1)  # +1 because first MR is at index 1
            
            out_of_control = {
                'individuals': out_of_control_i,
                'mr': out_of_control_mr
            }
            
            # Detect runs and trends
            patterns = detect_runs_and_trends(df, column='Measurement', 
                                            center_line=limits['individuals']['center'])
        
        # Convert DataFrame to JSON-serializable format
        df_dict = df.to_dict(orient='records')
        
        # Create result dictionary
        result = {
            'chart_type': chart_type,
            'data': df_dict,
            'limits': limits,
            'out_of_control': out_of_control,
            'patterns': patterns
        }
        
        return result
    
    def generate_attributes_chart(
        self,
        chart_type: str,
        process_parameters: Dict[str, Any],
        special_cause: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate data for attributes control charts (p, np, c, u).
        
        Args:
            chart_type: Type of attributes chart ('p', 'np', 'c', 'u')
            process_parameters: Dictionary of process parameters
            special_cause: Optional dictionary of special cause parameters
            
        Returns:
            Dictionary containing generated data and chart information
        """
        # Extract parameters
        n_subgroups = process_parameters.get('n_subgroups', 25)
        
        if chart_type == 'p':
            # p chart - proportion of defective items
            sample_size = process_parameters.get('sample_size', 100)
            proportion = process_parameters.get('proportion', 0.05)
            
            # Generate data
            if special_cause and special_cause.get('type') == 'shift':
                # Create baseline data
                baseline_data = np.random.binomial(
                    n=sample_size, 
                    p=proportion, 
                    size=n_subgroups
                )
                
                # Apply shift if specified
                shift_point = special_cause.get('shift_point')
                shift_proportion = special_cause.get('shift_proportion', proportion * 2)
                
                if shift_point is None:
                    # Random shift point in second half
                    shift_point = np.random.randint(n_subgroups // 2, n_subgroups - 5)
                
                # Replace data after shift point
                if 0 < shift_point < n_subgroups:
                    baseline_data[shift_point:] = np.random.binomial(
                        n=sample_size,
                        p=shift_proportion,
                        size=n_subgroups - shift_point
                    )
                
                # Sample sizes can be variable for p charts
                if special_cause.get('variable_sample_size', False):
                    sample_sizes = np.random.randint(
                        int(sample_size * 0.7),
                        int(sample_size * 1.3),
                        size=n_subgroups
                    )
                else:
                    sample_sizes = np.full(n_subgroups, sample_size)
                
                # Calculate proportions
                defective_counts = baseline_data
                proportions = defective_counts / sample_sizes
                
                special_cause_info = {
                    'type': 'shift',
                    'shift_point': shift_point,
                    'baseline_proportion': proportion,
                    'shift_proportion': shift_proportion
                }
                
            else:
                # No special cause, generate regular data
                if process_parameters.get('variable_sample_size', False):
                    sample_sizes = np.random.randint(
                        int(sample_size * 0.7),
                        int(sample_size * 1.3),
                        size=n_subgroups
                    )
                else:
                    sample_sizes = np.full(n_subgroups, sample_size)
                
                defective_counts = np.random.binomial(
                    n=sample_sizes,
                    p=proportion,
                    size=n_subgroups
                )
                proportions = defective_counts / sample_sizes
                
                special_cause_info = None
            
            # Create DataFrame
            df = pd.DataFrame({
                'Subgroup': range(1, n_subgroups + 1),
                'SampleSize': sample_sizes,
                'Defective': defective_counts,
                'Proportion': proportions
            })
            
            # Calculate control limits
            p_bar = sum(df['Defective']) / sum(df['SampleSize'])
            
            # For variable sample sizes, calculate limits for each subgroup
            limits = {
                'p': {
                    'center': p_bar,
                    'lcl': [],
                    'ucl': []
                }
            }
            
            # Calculate limits for each subgroup
            for n in df['SampleSize']:
                # Calculate control limits for this sample size
                lcl = max(0, p_bar - 3 * np.sqrt(p_bar * (1 - p_bar) / n))
                ucl = min(1, p_bar + 3 * np.sqrt(p_bar * (1 - p_bar) / n))
                
                limits['p']['lcl'].append(lcl)
                limits['p']['ucl'].append(ucl)
            
            # Detect out-of-control points
            out_of_control = []
            for i, (p, lcl, ucl) in enumerate(zip(
                df['Proportion'], limits['p']['lcl'], limits['p']['ucl']
            )):
                if p < lcl or p > ucl:
                    out_of_control.append(i)
            
            # Detect runs and trends
            patterns = detect_runs_and_trends(df, column='Proportion', 
                                            center_line=p_bar)
            
        elif chart_type == 'np':
            # np chart - number of defective items (fixed sample size)
            sample_size = process_parameters.get('sample_size', 100)
            proportion = process_parameters.get('proportion', 0.05)
            
            # Generate data
            if special_cause and special_cause.get('type') == 'shift':
                # Create baseline data
                baseline_data = np.random.binomial(
                    n=sample_size, 
                    p=proportion, 
                    size=n_subgroups
                )
                
                # Apply shift if specified
                shift_point = special_cause.get('shift_point')
                shift_proportion = special_cause.get('shift_proportion', proportion * 2)
                
                if shift_point is None:
                    # Random shift point in second half
                    shift_point = np.random.randint(n_subgroups // 2, n_subgroups - 5)
                
                # Replace data after shift point
                if 0 < shift_point < n_subgroups:
                    baseline_data[shift_point:] = np.random.binomial(
                        n=sample_size,
                        p=shift_proportion,
                        size=n_subgroups - shift_point
                    )
                
                special_cause_info = {
                    'type': 'shift',
                    'shift_point': shift_point,
                    'baseline_proportion': proportion,
                    'shift_proportion': shift_proportion
                }
            else:
                # No special cause, generate regular data
                baseline_data = np.random.binomial(
                    n=sample_size,
                    p=proportion,
                    size=n_subgroups
                )
                
                special_cause_info = None
            
            # Create DataFrame
            df = pd.DataFrame({
                'Subgroup': range(1, n_subgroups + 1),
                'SampleSize': sample_size,
                'Defective': baseline_data
            })
            
            # Calculate control limits
            np_bar = df['Defective'].mean()
            
            limits = {
                'np': {
                    'center': np_bar,
                    'lcl': max(0, np_bar - 3 * np.sqrt(np_bar * (1 - proportion))),
                    'ucl': np_bar + 3 * np.sqrt(np_bar * (1 - proportion))
                }
            }
            
            # Detect out-of-control points
            out_of_control = []
            for i, np_val in enumerate(df['Defective']):
                if np_val < limits['np']['lcl'] or np_val > limits['np']['ucl']:
                    out_of_control.append(i)
            
            # Detect runs and trends
            patterns = detect_runs_and_trends(df, column='Defective', 
                                            center_line=np_bar)
            
        elif chart_type == 'c':
            # c chart - count of defects (fixed area of opportunity)
            mean_defects = process_parameters.get('mean_defects', 5)
            
            # Generate data
            if special_cause and special_cause.get('type') == 'shift':
                # Create baseline data
                baseline_data = np.random.poisson(
                    lam=mean_defects, 
                    size=n_subgroups
                )
                
                # Apply shift if specified
                shift_point = special_cause.get('shift_point')
                shift_mean = special_cause.get('shift_mean', mean_defects * 2)
                
                if shift_point is None:
                    # Random shift point in second half
                    shift_point = np.random.randint(n_subgroups // 2, n_subgroups - 5)
                
                # Replace data after shift point
                if 0 < shift_point < n_subgroups:
                    baseline_data[shift_point:] = np.random.poisson(
                        lam=shift_mean,
                        size=n_subgroups - shift_point
                    )
                
                special_cause_info = {
                    'type': 'shift',
                    'shift_point': shift_point,
                    'baseline_mean': mean_defects,
                    'shift_mean': shift_mean
                }
            else:
                # No special cause, generate regular data
                baseline_data = np.random.poisson(
                    lam=mean_defects,
                    size=n_subgroups
                )
                
                special_cause_info = None
            
            # Create DataFrame
            df = pd.DataFrame({
                'Subgroup': range(1, n_subgroups + 1),
                'Defects': baseline_data
            })
            
            # Calculate control limits
            c_bar = df['Defects'].mean()
            
            limits = {
                'c': {
                    'center': c_bar,
                    'lcl': max(0, c_bar - 3 * np.sqrt(c_bar)),
                    'ucl': c_bar + 3 * np.sqrt(c_bar)
                }
            }
            
            # Detect out-of-control points
            out_of_control = []
            for i, c_val in enumerate(df['Defects']):
                if c_val < limits['c']['lcl'] or c_val > limits['c']['ucl']:
                    out_of_control.append(i)
            
            # Detect runs and trends
            patterns = detect_runs_and_trends(df, column='Defects', 
                                            center_line=c_bar)
            
        elif chart_type == 'u':
            # u chart - defects per unit (variable area of opportunity)
            mean_defects_per_unit = process_parameters.get('mean_defects_per_unit', 0.5)
            base_units = process_parameters.get('base_units', 10)
            
            # Generate data
            if special_cause and special_cause.get('type') == 'shift':
                # Create variable units for each subgroup
                if process_parameters.get('variable_units', False):
                    units = np.random.randint(
                        int(base_units * 0.7),
                        int(base_units * 1.3),
                        size=n_subgroups
                    )
                else:
                    units = np.full(n_subgroups, base_units)
                
                # Calculate expected defects for each subgroup
                expected_defects = units * mean_defects_per_unit
                
                # Generate defects data
                defects = np.random.poisson(
                    lam=expected_defects,
                    size=n_subgroups
                )
                
                # Apply shift if specified
                shift_point = special_cause.get('shift_point')
                shift_mean = special_cause.get('shift_mean', mean_defects_per_unit * 2)
                
                if shift_point is None:
                    # Random shift point in second half
                    shift_point = np.random.randint(n_subgroups // 2, n_subgroups - 5)
                
                # Replace data after shift point
                if 0 < shift_point < n_subgroups:
                    expected_defects_shifted = units[shift_point:] * shift_mean
                    defects[shift_point:] = np.random.poisson(
                        lam=expected_defects_shifted,
                        size=n_subgroups - shift_point
                    )
                
                special_cause_info = {
                    'type': 'shift',
                    'shift_point': shift_point,
                    'baseline_mean': mean_defects_per_unit,
                    'shift_mean': shift_mean
                }
            else:
                # Create variable units for each subgroup
                if process_parameters.get('variable_units', False):
                    units = np.random.randint(
                        int(base_units * 0.7),
                        int(base_units * 1.3),
                        size=n_subgroups
                    )
                else:
                    units = np.full(n_subgroups, base_units)
                
                # Calculate expected defects for each subgroup
                expected_defects = units * mean_defects_per_unit
                
                # Generate defects data
                defects = np.random.poisson(
                    lam=expected_defects,
                    size=n_subgroups
                )
                
                special_cause_info = None
            
            # Calculate defects per unit
            defects_per_unit = defects / units
            
            # Create DataFrame
            df = pd.DataFrame({
                'Subgroup': range(1, n_subgroups + 1),
                'Units': units,
                'Defects': defects,
                'DefectsPerUnit': defects_per_unit
            })
            
            # Calculate control limits
            u_bar = sum(df['Defects']) / sum(df['Units'])
            
            # For variable units, calculate limits for each subgroup
            limits = {
                'u': {
                    'center': u_bar,
                    'lcl': [],
                    'ucl': []
                }
            }
            
            # Calculate limits for each subgroup
            for n in df['Units']:
                # Calculate control limits for this sample size
                lcl = max(0, u_bar - 3 * np.sqrt(u_bar / n))
                ucl = u_bar + 3 * np.sqrt(u_bar / n)
                
                limits['u']['lcl'].append(lcl)
                limits['u']['ucl'].append(ucl)
            
            # Detect out-of-control points
            out_of_control = []
            for i, (u, lcl, ucl) in enumerate(zip(
                df['DefectsPerUnit'], limits['u']['lcl'], limits['u']['ucl']
            )):
                if u < lcl or u > ucl:
                    out_of_control.append(i)
            
            # Detect runs and trends
            patterns = detect_runs_and_trends(df, column='DefectsPerUnit', 
                                            center_line=u_bar)
        
        # Convert DataFrame to JSON-serializable format
        df_dict = df.to_dict(orient='records')
        
        # Create result dictionary
        result = {
            'chart_type': chart_type,
            'data': df_dict,
            'limits': limits,
            'out_of_control': out_of_control,
            'patterns': patterns,
            'process_parameters': process_parameters,
            'special_cause_info': special_cause_info
        }
        
        return result
    
    def detect_control_chart_patterns(
        self,
        data: Union[pd.DataFrame, List[Dict[str, Any]]],
        chart_type: str,
        control_limits: Optional[Dict[str, Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Analyze a control chart for patterns and signals.
        
        Args:
            data: DataFrame or list of dictionaries with process data
            chart_type: Type of control chart
            control_limits: Optional pre-calculated control limits
            
        Returns:
            Dictionary containing pattern detection results
        """
        # Convert to DataFrame if list of dictionaries
        if isinstance(data, list):
            df = pd.DataFrame(data)
        else:
            df = data.copy()
        
        # Determine data column and calculate limits if not provided
        if chart_type in ['xbar', 'xbar_r', 'xbar_s']:
            column = 'Mean'
            if control_limits is None:
                subgroup_size = 5  # Default if not specified
                control_limits = calculate_control_limits(
                    df, 
                    control_type='xbar_r' if 'Range' in df.columns else 'xbar_s', 
                    subgroup_size=subgroup_size
                )
            center_line = control_limits['xbar']['center']
            
        elif chart_type in ['r', 'range']:
            column = 'Range'
            if control_limits is None:
                subgroup_size = 5  # Default if not specified
                control_limits = calculate_control_limits(
                    df, 
                    control_type='xbar_r', 
                    subgroup_size=subgroup_size
                )
            center_line = control_limits['r']['center']
            
        elif chart_type in ['s', 'stddev']:
            column = 'StdDev'
            if control_limits is None:
                subgroup_size = 5  # Default if not specified
                control_limits = calculate_control_limits(
                    df, 
                    control_type='xbar_s', 
                    subgroup_size=subgroup_size
                )
            center_line = control_limits['s']['center']
            
        elif chart_type in ['imr', 'individuals']:
            column = 'Measurement' if 'Measurement' in df.columns else df.columns[0]
            if control_limits is None:
                # Calculate IMR limits
                ind_mean = df[column].mean()
                mr_mean = df[column].diff().abs().dropna().mean()
                d2 = 1.128  # Constant for n=2
                
                control_limits = {
                    'individuals': {
                        'center': ind_mean,
                        'lcl': ind_mean - 3 * mr_mean / d2,
                        'ucl': ind_mean + 3 * mr_mean / d2
                    }
                }
            center_line = control_limits['individuals']['center']
            
        elif chart_type == 'mr':
            column = 'MovingRange' if 'MovingRange' in df.columns else df.iloc[:, 0].diff().abs()
            if control_limits is None:
                # Calculate MR limits
                mr_mean = column.mean() if isinstance(column, pd.Series) else np.mean(column)
                
                control_limits = {
                    'mr': {
                        'center': mr_mean,
                        'lcl': 0,
                        'ucl': 3.267 * mr_mean  # D4 constant for n=2
                    }
                }
            center_line = control_limits['mr']['center']
            
        elif chart_type == 'p':
            column = 'Proportion'
            if control_limits is None:
                # Calculate p-chart limits
                p_bar = sum(df['Defective']) / sum(df['SampleSize'])
                control_limits = {'p': {'center': p_bar}}
            center_line = control_limits['p']['center']
            
        elif chart_type == 'np':
            column = 'Defective'
            if control_limits is None:
                # Calculate np-chart limits
                np_bar = df[column].mean()
                control_limits = {'np': {'center': np_bar}}
            center_line = control_limits['np']['center']
            
        elif chart_type == 'c':
            column = 'Defects'
            if control_limits is None:
                # Calculate c-chart limits
                c_bar = df[column].mean()
                control_limits = {'c': {'center': c_bar}}
            center_line = control_limits['c']['center']
            
        elif chart_type == 'u':
            column = 'DefectsPerUnit'
            if control_limits is None:
                # Calculate u-chart limits
                u_bar = sum(df['Defects']) / sum(df['Units'])
                control_limits = {'u': {'center': u_bar}}
            center_line = control_limits['u']['center']
            
        else:
            # Unknown chart type, use first numeric column
            column = df.select_dtypes(include=['number']).columns[0]
            center_line = df[column].mean()
        
        # Detect runs and trends
        patterns = detect_runs_and_trends(df, column=column, center_line=center_line)
        
        # Add more sophisticated pattern detection
        
        # 1. Detect systematic/cyclical patterns
        # Run autocorrelation to detect cycles
        data_values = df[column].dropna().values
        if len(data_values) > 10:
            acf_values = np.correlate(data_values, data_values, mode='full')
            acf_values = acf_values[len(data_values)-1:]
            acf_values = acf_values / acf_values[0]  # Normalize
            
            # Check for significant autocorrelation
            significance_level = 1.96 / np.sqrt(len(data_values))  # 95% confidence
            
            cycles = []
            for lag in range(2, min(len(acf_values) // 2, 20)):
                if abs(acf_values[lag]) > significance_level:
                    cycles.append(lag)
            
            if cycles:
                patterns['cyclical'] = {
                    'detected': True,
                    'cycle_lengths': cycles,
                    'autocorrelation': acf_values[:20].tolist()
                }
            else:
                patterns['cyclical'] = {
                    'detected': False
                }
        
        # 2. Detect stratification (data clustered around center line)
        # Count points within 1 sigma of center line
        if chart_type in ['xbar', 'xbar_r', 'xbar_s', 'imr', 'individuals']:
            sigma = (control_limits[chart_type.replace('xbar', 'xbar') if 'xbar' in chart_type else 'individuals']['ucl'] - 
                    control_limits[chart_type.replace('xbar', 'xbar') if 'xbar' in chart_type else 'individuals']['center']) / 3
            
            within_1_sigma = 0
            for val in df[column]:
                if abs(val - center_line) < sigma:
                    within_1_sigma += 1
            
            strat_percent = within_1_sigma / len(df) * 100
            expected_percent = 68.26  # Expected % within 1 sigma for normal distribution
            
            if strat_percent > 85:  # Much higher than expected
                patterns['stratification'] = {
                    'detected': True,
                    'percent_within_1_sigma': strat_percent,
                    'expected_percent': expected_percent
                }
            else:
                patterns['stratification'] = {
                    'detected': False,
                    'percent_within_1_sigma': strat_percent,
                    'expected_percent': expected_percent
                }
        
        # 3. Detect mixture (points avoiding center line)
        # Count runs of points that don't cross center line
        runs_without_crossing = []
        current_run = 1
        above_center = df[column].iloc[0] > center_line
        
        for i in range(1, len(df)):
            current_above = df[column].iloc[i] > center_line
            if current_above == above_center:
                current_run += 1
            else:
                runs_without_crossing.append(current_run)
                current_run = 1
                above_center = current_above
        
        # Add the last run
        runs_without_crossing.append(current_run)
        
        # Check for long runs without crossing
        if max(runs_without_crossing) > 8 or len([r for r in runs_without_crossing if r > 5]) > 2:
            patterns['mixture'] = {
                'detected': True,
                'longest_run': max(runs_without_crossing),
                'runs': runs_without_crossing
            }
        else:
            patterns['mixture'] = {
                'detected': False,
                'longest_run': max(runs_without_crossing) if runs_without_crossing else 0
            }
        
        # Return all pattern detection results
        pattern_types = {
            'points_outside_limits': bool(patterns.get('out_of_control')),
            'runs_above_center': bool(patterns.get('above_center')),
            'runs_below_center': bool(patterns.get('below_center')),
            'trends_increasing': bool(patterns.get('increasing')),
            'trends_decreasing': bool(patterns.get('decreasing')),
            'cyclical_pattern': patterns.get('cyclical', {}).get('detected', False),
            'stratification': patterns.get('stratification', {}).get('detected', False),
            'mixture': patterns.get('mixture', {}).get('detected', False)
        }
        
        result = {
            'chart_type': chart_type,
            'patterns': patterns,
            'pattern_types': pattern_types,
            'center_line': center_line,
            'control_limits': control_limits
        }
        
        return result