"""
Utility services for Statistical Quality Control (SQC) Analysis.

This module contains utility functions for data generation, simulation,
and analysis used throughout the SQC module, adapted from the original
Streamlit implementation to work with Django/React architecture.
"""

import numpy as np
import pandas as pd
import scipy.stats as stats
from typing import Dict, List, Optional, Tuple, Union, Any, Callable

# Type aliases
DataSeries = Union[List[float], np.ndarray, pd.Series]
DataFrame = pd.DataFrame

def generate_process_data(
    mean: float = 10.0, 
    std_dev: float = 1.0, 
    n_samples: int = 100, 
    random_state: Optional[int] = None
) -> np.ndarray:
    """
    Generate simulated process data with Gaussian distribution.
    
    Args:
        mean: Process mean value
        std_dev: Process standard deviation
        n_samples: Number of data points to generate
        random_state: Random seed for reproducibility
        
    Returns:
        Array of simulated process measurements
    """
    if random_state is not None:
        np.random.seed(random_state)
    
    return np.random.normal(loc=mean, scale=std_dev, size=n_samples)

def generate_process_data_with_shifts(
    mean: float = 10.0,
    std_dev: float = 1.0,
    n_samples: int = 100,
    shift_point: Optional[int] = None,
    shift_size: float = 2.0,
    random_state: Optional[int] = None
) -> Tuple[np.ndarray, Optional[int]]:
    """
    Generate process data with a mean shift at a specified point.
    
    Args:
        mean: Initial process mean value
        std_dev: Process standard deviation
        n_samples: Number of data points to generate
        shift_point: Sample index where shift occurs (None for no shift)
        shift_size: Size of the mean shift in std_dev units
        random_state: Random seed for reproducibility
        
    Returns:
        Tuple of (data array, shift point index)
    """
    if random_state is not None:
        np.random.seed(random_state)
    
    data = np.random.normal(loc=mean, scale=std_dev, size=n_samples)
    
    # Apply shift if specified
    if shift_point is not None and 0 < shift_point < n_samples:
        data[shift_point:] = np.random.normal(
            loc=mean + shift_size * std_dev,
            scale=std_dev,
            size=n_samples - shift_point
        )
    elif shift_point is None and n_samples >= 50:
        # If no shift point specified but we have enough samples,
        # randomly introduce a shift in the second half of the data
        shift_point = np.random.randint(n_samples // 2, n_samples - 10)
        data[shift_point:] = np.random.normal(
            loc=mean + shift_size * std_dev,
            scale=std_dev,
            size=n_samples - shift_point
        )
    
    return data, shift_point

def generate_process_data_with_trends(
    mean: float = 10.0,
    std_dev: float = 1.0,
    n_samples: int = 100,
    trend_start: Optional[int] = None,
    trend_slope: float = 0.1,
    random_state: Optional[int] = None
) -> Tuple[np.ndarray, Optional[int]]:
    """
    Generate process data with a linear trend starting at a specified point.
    
    Args:
        mean: Initial process mean value
        std_dev: Process standard deviation
        n_samples: Number of data points to generate
        trend_start: Sample index where trend begins (None for no trend)
        trend_slope: Slope of the trend in units per sample
        random_state: Random seed for reproducibility
        
    Returns:
        Tuple of (data array, trend start index)
    """
    if random_state is not None:
        np.random.seed(random_state)
    
    data = np.random.normal(loc=mean, scale=std_dev, size=n_samples)
    
    # Apply trend if specified
    if trend_start is not None and 0 < trend_start < n_samples:
        trend_length = n_samples - trend_start
        trend = np.arange(trend_length) * trend_slope
        data[trend_start:] += trend
    elif trend_start is None and n_samples >= 50:
        # If no trend point specified but we have enough samples,
        # randomly introduce a trend in the second half of the data
        trend_start = np.random.randint(n_samples // 2, n_samples - 20)
        trend_length = n_samples - trend_start
        trend = np.arange(trend_length) * trend_slope
        data[trend_start:] += trend
    
    return data, trend_start

def generate_process_data_with_cycle(
    mean: float = 10.0,
    std_dev: float = 1.0,
    n_samples: int = 100,
    amplitude: float = 1.0,
    frequency: float = 0.1,
    random_state: Optional[int] = None
) -> np.ndarray:
    """
    Generate process data with a cyclic pattern.
    
    Args:
        mean: Process mean value
        std_dev: Process standard deviation
        n_samples: Number of data points to generate
        amplitude: Amplitude of the cyclic pattern
        frequency: Frequency of the cyclic pattern
        random_state: Random seed for reproducibility
        
    Returns:
        Array of simulated process measurements with cyclic pattern
    """
    if random_state is not None:
        np.random.seed(random_state)
    
    # Generate base normal data
    data = np.random.normal(loc=mean, scale=std_dev, size=n_samples)
    
    # Add cyclic pattern
    t = np.arange(n_samples)
    cycle = amplitude * np.sin(2 * np.pi * frequency * t)
    
    return data + cycle

def generate_subgrouped_data(
    data: np.ndarray,
    subgroup_size: int = 5
) -> pd.DataFrame:
    """
    Convert a 1D array of process data into a DataFrame of subgroups.
    
    Args:
        data: 1D array of process measurements
        subgroup_size: Number of measurements per subgroup
        
    Returns:
        DataFrame with each row representing a subgroup
    """
    # Calculate how many complete subgroups we can form
    n_complete_subgroups = len(data) // subgroup_size
    
    # Reshape data into subgroups
    reshaped_data = data[:n_complete_subgroups * subgroup_size].reshape(-1, subgroup_size)
    
    # Create column names
    columns = [f'Sample_{i+1}' for i in range(subgroup_size)]
    
    # Create DataFrame
    df = pd.DataFrame(reshaped_data, columns=columns)
    
    # Add subgroup statistics
    df['Mean'] = df.mean(axis=1)
    df['Range'] = df.max(axis=1) - df.min(axis=1)
    df['StdDev'] = df.std(axis=1, ddof=1)
    
    # Add subgroup number
    df.insert(0, 'Subgroup', range(1, n_complete_subgroups + 1))
    
    return df

def calculate_control_limits(
    data: pd.DataFrame,
    control_type: str = 'xbar_r',
    subgroup_size: int = 5
) -> Dict[str, Dict[str, float]]:
    """
    Calculate control limits for a control chart.
    
    Args:
        data: DataFrame with subgroup data
        control_type: Type of control chart ('xbar_r', 'xbar_s', 'imr', etc.)
        subgroup_size: Number of measurements per subgroup
        
    Returns:
        Dictionary containing control limits for each chart type
    """
    # Constants for control limits calculations
    n = subgroup_size
    
    # Dictionary of control chart constants
    constants = {
        # A2 constants for Xbar-R charts
        'A2': {2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577, 6: 0.483, 7: 0.419},
        # A3 constants for Xbar-S charts
        'A3': {2: 2.659, 3: 1.954, 4: 1.628, 5: 1.427, 6: 1.287, 7: 1.182},
        # D3 constants for R charts
        'D3': {2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0.076},
        # D4 constants for R charts
        'D4': {2: 3.267, 3: 2.574, 4: 2.282, 5: 2.114, 6: 2.004, 7: 1.924},
        # B3 constants for S charts
        'B3': {2: 0, 3: 0, 4: 0, 5: 0, 6: 0.030, 7: 0.118},
        # B4 constants for S charts
        'B4': {2: 3.267, 3: 2.568, 4: 2.266, 5: 2.089, 6: 1.970, 7: 1.882},
        # d2 constants for control charts
        'd2': {2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326, 6: 2.534, 7: 2.704}
    }
    
    # Get the appropriate constants based on subgroup size
    # Limit to supported subgroup sizes
    if n < 2:
        n = 2
    elif n > 7:
        n = 7
    
    limits = {}
    
    if control_type == 'xbar_r':
        # Calculate for Xbar and R charts
        xbar = data['Mean'].mean()
        r_bar = data['Range'].mean()
        
        # Xbar chart limits
        limits['xbar'] = {
            'center': xbar,
            'lcl': xbar - constants['A2'][n] * r_bar,
            'ucl': xbar + constants['A2'][n] * r_bar
        }
        
        # R chart limits
        limits['r'] = {
            'center': r_bar,
            'lcl': constants['D3'][n] * r_bar,
            'ucl': constants['D4'][n] * r_bar
        }
    
    elif control_type == 'xbar_s':
        # Calculate for Xbar and S charts
        xbar = data['Mean'].mean()
        s_bar = data['StdDev'].mean()
        
        # Xbar chart limits
        limits['xbar'] = {
            'center': xbar,
            'lcl': xbar - constants['A3'][n] * s_bar,
            'ucl': xbar + constants['A3'][n] * s_bar
        }
        
        # S chart limits
        limits['s'] = {
            'center': s_bar,
            'lcl': constants['B3'][n] * s_bar,
            'ucl': constants['B4'][n] * s_bar
        }
    
    elif control_type == 'imr':
        # Calculate for Individuals and Moving Range charts
        individuals = data.iloc[:, 1]  # Assuming first sample is in column 1
        moving_range = individuals.diff().abs()
        moving_range = moving_range.dropna()
        
        ind_mean = individuals.mean()
        mr_mean = moving_range.mean()
        
        # Individuals chart limits
        limits['individuals'] = {
            'center': ind_mean,
            'lcl': ind_mean - 3 * mr_mean / constants['d2'][2],
            'ucl': ind_mean + 3 * mr_mean / constants['d2'][2]
        }
        
        # Moving Range chart limits
        limits['mr'] = {
            'center': mr_mean,
            'lcl': 0,
            'ucl': constants['D4'][2] * mr_mean
        }
    
    return limits

def detect_out_of_control_points(
    data: pd.DataFrame,
    limits: Dict[str, Dict[str, float]],
    chart_type: str = 'xbar'
) -> List[int]:
    """
    Detect out-of-control points in a control chart.
    
    Args:
        data: DataFrame with process data
        limits: Dictionary of control limits
        chart_type: Type of chart to check ('xbar', 'r', 's', etc.)
        
    Returns:
        List of indices for out-of-control points
    """
    out_of_control = []
    
    if chart_type in limits:
        chart_limits = limits[chart_type]
        
        # Determine which column to check based on chart type
        if chart_type == 'xbar':
            column = 'Mean'
        elif chart_type == 'r':
            column = 'Range'
        elif chart_type == 's':
            column = 'StdDev'
        elif chart_type == 'individuals':
            column = data.columns[1]  # First sample column
        elif chart_type == 'mr':
            # Calculate moving range
            moving_range = data.iloc[:, 1].diff().abs()
            
            # Check moving range against limits
            for i, mr in moving_range.items():
                if mr > chart_limits['ucl'] or mr < chart_limits['lcl']:
                    out_of_control.append(i)
            
            return out_of_control
        else:
            # If unknown chart type, return empty list
            return []
        
        # Check values against limits
        for i, value in enumerate(data[column]):
            if value > chart_limits['ucl'] or value < chart_limits['lcl']:
                out_of_control.append(i)
    
    return out_of_control

def detect_runs_and_trends(
    data: pd.DataFrame,
    column: str = 'Mean',
    center_line: Optional[float] = None,
    run_length: int = 8
) -> Dict[str, List[int]]:
    """
    Detect runs and trends in control chart data.
    
    Args:
        data: DataFrame with process data
        column: Column name to analyze
        center_line: Center line value (if None, uses column mean)
        run_length: Number of points required for a run
        
    Returns:
        Dictionary with lists of indices for different patterns
    """
    if center_line is None:
        center_line = data[column].mean()
    
    values = data[column].values
    n = len(values)
    
    patterns = {
        'above_center': [],  # Runs above center line
        'below_center': [],  # Runs below center line
        'increasing': [],    # Trends increasing
        'decreasing': []     # Trends decreasing
    }
    
    # Check for runs above/below center line
    run_above = 0
    run_below = 0
    
    for i, value in enumerate(values):
        if value > center_line:
            run_above += 1
            run_below = 0
            if run_above >= run_length:
                patterns['above_center'].extend(range(i - run_length + 1, i + 1))
        elif value < center_line:
            run_below += 1
            run_above = 0
            if run_below >= run_length:
                patterns['below_center'].extend(range(i - run_length + 1, i + 1))
        else:
            run_above = 0
            run_below = 0
    
    # Check for trends
    trend_length = 6  # Number of points for a trend
    
    for i in range(n - trend_length + 1):
        # Get the slice of values for potential trend
        trend_slice = values[i:i+trend_length]
        
        # Check if strictly increasing
        if all(trend_slice[j] < trend_slice[j+1] for j in range(trend_length-1)):
            patterns['increasing'].extend(range(i, i + trend_length))
        
        # Check if strictly decreasing
        if all(trend_slice[j] > trend_slice[j+1] for j in range(trend_length-1)):
            patterns['decreasing'].extend(range(i, i + trend_length))
    
    return patterns

def calculate_process_capability(
    data: DataSeries,
    usl: float,
    lsl: float,
    target: Optional[float] = None
) -> Dict[str, float]:
    """
    Calculate process capability indices.
    
    Args:
        data: Series of process measurements
        usl: Upper specification limit
        lsl: Lower specification limit
        target: Target value (default is midpoint of spec limits)
        
    Returns:
        Dictionary of capability indices
    """
    if isinstance(data, pd.DataFrame):
        # If a DataFrame is provided, convert it to a Series
        # assuming the data is in individual measurements
        if 'Mean' in data.columns:
            data = data['Mean']
        else:
            # Use the first sample column
            data = data.iloc[:, 1]
    
    # Convert to numpy array if it's not already
    if not isinstance(data, np.ndarray):
        data = np.array(data)
    
    # Calculate basic statistics
    mean = np.mean(data)
    std_dev = np.std(data, ddof=1)
    
    # Calculate specification width and midpoint
    spec_width = usl - lsl
    if target is None:
        target = (usl + lsl) / 2
    
    # Calculate capability indices
    cp = spec_width / (6 * std_dev) if std_dev > 0 else float('inf')
    
    # Calculate one-sided capability indices
    cpu = (usl - mean) / (3 * std_dev) if std_dev > 0 else float('inf')
    cpl = (mean - lsl) / (3 * std_dev) if std_dev > 0 else float('inf')
    
    # Calculate overall capability index Cpk
    cpk = min(cpu, cpl)
    
    # Calculate Cpm (Taguchi's capability index)
    variance_to_target = np.mean((data - target) ** 2)
    cpm = cp / np.sqrt(1 + ((mean - target) / std_dev) ** 2) if std_dev > 0 else float('inf')
    
    # Calculate actual capability indices (Pp, Ppk)
    # pp and ppk are the same as cp and cpk for capability studies
    pp = cp
    ppk = cpk
    
    return {
        'Cp': cp,
        'Cpk': cpk,
        'Cpu': cpu,
        'Cpl': cpl,
        'Cpm': cpm,
        'Pp': pp,
        'Ppk': ppk,
        'Mean': mean,
        'StdDev': std_dev,
        'USL': usl,
        'LSL': lsl,
        'Target': target
    }

def calc_oc_curve_points(
    n: int,
    c: int,
    p_values: Optional[np.ndarray] = None
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Calculate points for an Operating Characteristic (OC) curve.
    
    Args:
        n: Sample size
        c: Acceptance number
        p_values: Array of proportion defective values to evaluate
        
    Returns:
        Tuple of (p_values, pa_values) arrays
    """
    if p_values is None:
        p_values = np.linspace(0, 0.3, 100)
    
    # Calculate probability of acceptance for each p value
    pa_values = np.zeros_like(p_values)
    
    for i, p in enumerate(p_values):
        # Sum probabilities from binomial distribution for r = 0 to c
        pa = 0
        for r in range(c + 1):
            pa += stats.binom.pmf(r, n, p)
        pa_values[i] = pa
    
    return p_values, pa_values

def calculate_arl(
    p: float,
    n: int,
    c: int
) -> float:
    """
    Calculate Average Run Length (ARL) for a control scheme.
    
    Args:
        p: Probability of a point being out of control
        n: Sample size
        c: Control limit parameter
        
    Returns:
        Average Run Length value
    """
    pa = 0
    for r in range(c + 1):
        pa += stats.binom.pmf(r, n, p)
    
    # ARL = 1 / (1 - Pa)
    arl = 1 / (1 - pa) if pa < 1 else float('inf')
    
    return arl

def is_normal(
    data: DataSeries, 
    alpha: float = 0.05
) -> Tuple[bool, float]:
    """
    Test if data follows a normal distribution using Shapiro-Wilk test.
    
    Args:
        data: Data series to test
        alpha: Significance level
        
    Returns:
        Tuple of (is_normal, p_value)
    """
    # Convert to numpy array if needed
    if not isinstance(data, np.ndarray):
        data = np.array(data)
    
    # Perform Shapiro-Wilk test
    stat, p_value = stats.shapiro(data)
    
    # Determine if normal based on p-value
    is_normal = p_value > alpha
    
    return is_normal, p_value