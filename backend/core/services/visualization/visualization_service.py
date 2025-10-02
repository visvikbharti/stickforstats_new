import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.tsa.seasonal import seasonal_decompose
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import plotly.io as pio
from typing import Dict, Any, List, Optional, Tuple, Union, BinaryIO
import logging
import io
import json
from datetime import datetime
import uuid
import base64
from PIL import Image as PILImage
from io import BytesIO
import os
from pathlib import Path

from core.services.data_processing.statistical_utils import StatisticalUtilsService
from core.services.error_handler import safe_operation, try_except
# from core.models import Visualization  # Model doesn't exist yet
from typing import Any as Visualization  # Placeholder type
from core.services.report.report_service import ReportService

logger = logging.getLogger(__name__)

class VisualizationService:
    """Service for data visualization and plot generation.

    This service provides methods for:
    - Creating various types of data visualizations
    - Preparing plots for reports
    - Saving and retrieving visualizations
    - Exporting visualizations to different formats
    """

    _instance = None

    @classmethod
    def get_instance(cls):
        """Get singleton instance of visualization service."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        """Initialize visualization service."""
        self.color_schemes = {
            'default': px.colors.qualitative.Set3,
            'sequential': px.colors.sequential.Viridis,
            'diverging': px.colors.diverging.RdBu
        }

        # Set default configuration
        self.default_config = {
            'plot_width': 800,
            'plot_height': 600,
            'title_font_size': 16,
            'axis_font_size': 12,
            'legend_font_size': 10,
            'show_watermark': False,
            'interactive': True
        }

        # Visualization save directory
        self.plots_dir = Path('data/plots')
        self.plots_dir.mkdir(parents=True, exist_ok=True)

        # Initialize report service
        try:
            self.report_service = ReportService()
        except Exception as e:
            logger.warning(f"Could not initialize report service: {e}")
            self.report_service = None
    
    @safe_operation
    def create_distribution_plots(self, data: pd.DataFrame, column: str, 
                               plot_types: List[str]) -> Dict[str, Any]:
        """
        Create distribution plots for a numeric column.
        
        Args:
            data: Input DataFrame
            column: Column name to visualize
            plot_types: List of plot types to create
            
        Returns:
            Dictionary with visualization results
        """
        results = {
            'type': 'distribution', 
            'plots': [], 
            'statistics': {}
        }
        
        if column not in data.columns:
            logger.warning(f"Column {column} not found in data")
            return results
        
        # Generate statistics for context
        stats_utils = StatisticalUtilsService()
        stats_context = {
            'descriptive': stats_utils.compute_descriptive_stats(data[[column]]),
            'inferential': stats_utils.perform_inferential_tests(data[[column]]),
            'distribution': stats_utils.analyze_distributions(data[[column]])
        }
        
        # Store statistics in results
        results['statistics'] = stats_context
        stats_desc = stats_context['descriptive'][column]
        
        for plot_type in plot_types:
            fig = None
            description = ""
            plot_config = {}
            
            if plot_type == "histogram":
                # Create histogram with statistical overlay
                fig = go.Figure()
                
                # Add histogram
                fig.add_trace(go.Histogram(
                    x=data[column],
                    nbinsx=30,
                    name="Data",
                    histnorm='probability density'
                ))
                
                # Add normal distribution overlay
                x_range = np.linspace(data[column].min(), data[column].max(), 100)
                norm_dist = stats.norm.pdf(x_range, stats_desc['mean'], stats_desc['std'])
                fig.add_trace(go.Scatter(
                    x=x_range,
                    y=norm_dist,
                    mode='lines',
                    name='Normal Distribution',
                    line=dict(color='red', dash='dash')
                ))
                
                fig.update_layout(
                    title=f"Distribution of {column}",
                    xaxis_title=column,
                    yaxis_title="Density",
                    showlegend=True
                )
                
                # Create comprehensive description
                normality_test = stats_context['inferential'][column]['normality_tests']['shapiro']
                description = (
                    f"Distribution Analysis:\n"
                    f"• Mean: {stats_desc['mean']:.2f}\n"
                    f"• Median: {stats_desc['median']:.2f}\n"
                    f"• Standard Deviation: {stats_desc['std']:.2f}\n"
                    f"• Skewness: {stats_desc['skewness']:.2f} "
                    f"({'Positively' if stats_desc['skewness'] > 0 else 'Negatively'} skewed)\n"
                    f"• Kurtosis: {stats_desc['kurtosis']:.2f} "
                    f"({'Heavy-tailed' if stats_desc['kurtosis'] > 0 else 'Light-tailed'} distribution)\n"
                    f"• Normality Test (Shapiro-Wilk): p-value = {normality_test['p_value']:.4f} "
                    f"({'Normally distributed' if normality_test['p_value'] > 0.05 else 'Not normally distributed'})"
                )
                
                plot_config = {
                    'bins': 30,
                    'show_normal_overlay': True
                }
            
            elif plot_type == "boxplot":
                fig = go.Figure()
                
                # Add box plot
                fig.add_trace(go.Box(
                    y=data[column],
                    name=column,
                    boxpoints='outliers',
                    jitter=0.3,
                    pointpos=-1.8
                ))
                
                # Add statistical annotations
                fig.add_annotation(
                    x=0.95,
                    y=0.95,
                    xref="paper",
                    yref="paper",
                    text=f"Q1: {stats_desc['q1']:.2f}\nMedian: {stats_desc['median']:.2f}\nQ3: {stats_desc['q3']:.2f}",
                    showarrow=False,
                    align="left",
                    bgcolor="rgba(255, 255, 255, 0.8)"
                )
                
                fig.update_layout(
                    title=f"Box Plot of {column}",
                    yaxis_title=column,
                    showlegend=False
                )
                
                description = (
                    f"Box Plot Analysis:\n"
                    f"• Q1 (25th percentile): {stats_desc['q1']:.2f}\n"
                    f"• Median: {stats_desc['median']:.2f}\n"
                    f"• Q3 (75th percentile): {stats_desc['q3']:.2f}\n"
                    f"• IQR: {stats_desc['iqr']:.2f}\n"
                    f"• Range: {stats_desc['range']:.2f}"
                )
            
            elif plot_type == "violinplot":
                fig = go.Figure()
                
                # Add violin plot
                fig.add_trace(go.Violin(
                    y=data[column],
                    box_visible=True,
                    meanline_visible=True,
                    points="outliers"
                ))
                
                fig.update_layout(
                    title=f"Violin Plot of {column}",
                    yaxis_title=column
                )
                
                description = (
                    f"Violin Plot Analysis:\n"
                    f"• Shows the probability density of data at different values\n"
                    f"• Mean: {stats_desc['mean']:.2f}\n"
                    f"• Median: {stats_desc['median']:.2f}\n"
                    f"• Data spread indicated by width of violin"
                )
            
            elif plot_type == "kdeplot":
                # Calculate KDE
                kde = stats.gaussian_kde(data[column].dropna())
                x_range = np.linspace(data[column].min(), data[column].max(), 100)
                y_kde = kde(x_range)
                
                fig = go.Figure()
                
                # Add KDE
                fig.add_trace(go.Scatter(
                    x=x_range,
                    y=y_kde,
                    mode='lines',
                    name='KDE',
                    fill='tozeroy'
                ))
                
                # Add mean and median lines
                fig.add_vline(x=stats_desc['mean'], line_dash="dash", line_color="red",
                            annotation_text="Mean")
                fig.add_vline(x=stats_desc['median'], line_dash="dash", line_color="green",
                            annotation_text="Median")
                
                fig.update_layout(
                    title=f"Kernel Density Estimation for {column}",
                    xaxis_title=column,
                    yaxis_title="Density"
                )
                
                description = (
                    f"KDE Analysis:\n"
                    f"• Non-parametric estimation of the probability density function\n"
                    f"• Mean: {stats_desc['mean']:.2f}\n"
                    f"• Median: {stats_desc['median']:.2f}\n"
                    f"• Distribution shape: "
                    f"{'Symmetric' if abs(stats_desc['skewness']) < 0.5 else 'Asymmetric'}"
                )
            
            elif plot_type == "qqplot":
                # Calculate Q-Q plot data
                qq_data = stats.probplot(data[column].dropna(), dist="norm")
                
                fig = go.Figure()
                
                # Add scatter points
                fig.add_trace(go.Scatter(
                    x=qq_data[0][0],
                    y=qq_data[0][1],
                    mode='markers',
                    name='Data Points'
                ))
                
                # Add reference line
                fig.add_trace(go.Scatter(
                    x=qq_data[0][0],
                    y=qq_data[1][0] * qq_data[0][0] + qq_data[1][1],
                    mode='lines',
                    name='Reference Line',
                    line=dict(color='red', dash='dash')
                ))
                
                fig.update_layout(
                    title=f"Q-Q Plot for {column}",
                    xaxis_title="Theoretical Quantiles",
                    yaxis_title="Sample Quantiles"
                )
                
                # Test for normality
                normality_test = stats_context['inferential'][column]['normality_tests']['shapiro']
                description = (
                    f"Q-Q Plot Analysis:\n"
                    f"• Visual assessment of normality\n"
                    f"• Shapiro-Wilk test: p-value = {normality_test['p_value']:.4f}\n"
                    f"• Interpretation: "
                    f"{'Data appears normally distributed' if normality_test['p_value'] > 0.05 else 'Data deviates from normal distribution'}\n"
                    f"• Points following the reference line indicate normality"
                )
            
            if fig:
                # Convert to JSON for serialization
                plot_json = self._fig_to_json(fig)
                
                results['plots'].append({
                    'id': str(uuid.uuid4()),
                    'type': plot_type,
                    'plot_data': plot_json,
                    'title': f"{plot_type} of {column}",
                    'description': description,
                    'config': plot_config,
                    'created_at': datetime.now().isoformat()
                })
        
        return results
    
    @safe_operation
    def create_relationship_plots(self, data: pd.DataFrame, x_col: str, y_col: str, 
                               plot_types: List[str], color_col: Optional[str] = None) -> Dict[str, Any]:
        """
        Create relationship plots between two numeric columns.
        
        Args:
            data: Input DataFrame
            x_col: X-axis column name
            y_col: Y-axis column name
            plot_types: List of plot types to create
            color_col: Optional column to use for coloring points
            
        Returns:
            Dictionary with visualization results
        """
        results = {'type': 'relationship', 'plots': []}
        
        if x_col not in data.columns or y_col not in data.columns:
            logger.warning(f"Column {x_col} or {y_col} not found in data")
            return results
        
        # Calculate correlation for description
        correlation = data[[x_col, y_col]].corr().iloc[0, 1]
        
        for plot_type in plot_types:
            fig = None
            description = ""
            plot_config = {}
            
            if plot_type == "scatter":
                plot_config = {'color_by': color_col if color_col else None}
                
                if color_col and color_col in data.columns:
                    fig = px.scatter(
                        data, 
                        x=x_col, 
                        y=y_col,
                        color=color_col,
                        title=f"Scatter Plot: {x_col} vs {y_col}"
                    )
                else:
                    fig = px.scatter(
                        data, 
                        x=x_col, 
                        y=y_col,
                        title=f"Scatter Plot: {x_col} vs {y_col}"
                    )
                
                description = (
                    f"Scatter Plot Analysis:\n"
                    f"• Relationship between {x_col} and {y_col}\n"
                    f"• Correlation coefficient: {correlation:.4f}\n"
                    f"• Strength: {self._describe_correlation(correlation)}"
                )
            
            elif plot_type == "line":
                fig = px.line(
                    data.sort_values(x_col), 
                    x=x_col, 
                    y=y_col,
                    color=color_col if color_col in data.columns else None,
                    title=f"Line Plot: {x_col} vs {y_col}"
                )
                
                description = (
                    f"Line Plot Analysis:\n"
                    f"• Trend between {x_col} and {y_col}\n"
                    f"• Correlation coefficient: {correlation:.4f}"
                )
                
                plot_config = {'sorted_by': x_col}
            
            elif plot_type == "hexbin":
                fig = px.density_heatmap(
                    data, 
                    x=x_col, 
                    y=y_col,
                    title=f"Hex Plot: {x_col} vs {y_col}",
                    marginal_x="histogram",
                    marginal_y="histogram"
                )
                
                description = (
                    f"Hexbin Plot Analysis:\n"
                    f"• Density of points between {x_col} and {y_col}\n"
                    f"• Useful for visualizing large datasets\n"
                    f"• Shows concentration of observations"
                )
            
            elif plot_type == "regression":
                fig = px.scatter(
                    data, 
                    x=x_col, 
                    y=y_col,
                    color=color_col if color_col in data.columns else None,
                    trendline="ols",
                    title=f"Regression Plot: {x_col} vs {y_col}"
                )
                
                # Try to extract regression metrics 
                import statsmodels.api as sm
                
                try:
                    X = sm.add_constant(data[x_col])
                    model = sm.OLS(data[y_col], X).fit()
                    r_squared = model.rsquared
                    p_value = model.f_pvalue
                    slope = model.params[1]
                    
                    plot_config = {
                        'r_squared': r_squared,
                        'p_value': p_value,
                        'slope': slope
                    }
                    
                    description = (
                        f"Regression Analysis:\n"
                        f"• Linear relationship between {x_col} and {y_col}\n"
                        f"• R-squared: {r_squared:.4f}\n"
                        f"• p-value: {p_value:.4f}\n"
                        f"• Slope: {slope:.4f}\n"
                        f"• Interpretation: {self._interpret_regression(r_squared, p_value)}"
                    )
                except Exception as e:
                    logger.warning(f"Error calculating regression metrics: {str(e)}")
                    description = (
                        f"Regression Analysis:\n"
                        f"• Linear relationship between {x_col} and {y_col}\n"
                        f"• Correlation coefficient: {correlation:.4f}"
                    )
            
            if fig:
                # Convert to JSON for serialization
                plot_json = self._fig_to_json(fig)
                
                results['plots'].append({
                    'id': str(uuid.uuid4()),
                    'type': plot_type,
                    'plot_data': plot_json,
                    'title': f"{plot_type} of {x_col} vs {y_col}",
                    'description': description,
                    'config': plot_config,
                    'created_at': datetime.now().isoformat()
                })
        
        return results
    
    @safe_operation
    def create_comparison_plots(self, data: pd.DataFrame, category_col: str, value_col: str, 
                             plot_type: str, **kwargs) -> Dict[str, Any]:
        """
        Create comparison plots between a categorical and numeric column.
        
        Args:
            data: Input DataFrame
            category_col: Categorical column name
            value_col: Numeric column name
            plot_type: Type of plot to create
            **kwargs: Additional plot-specific parameters
            
        Returns:
            Dictionary with visualization results
        """
        results = {'type': 'comparison', 'plots': []}
        
        if category_col not in data.columns or value_col not in data.columns:
            logger.warning(f"Column {category_col} or {value_col} not found in data")
            return results
        
        fig = None
        description = ""
        plot_config = {}
        
        if plot_type == "bar":
            agg_func = kwargs.get('agg_func', 'mean')
            plot_config = {'agg_func': agg_func}
            
            grouped_data = data.groupby(category_col)[value_col].agg(agg_func).reset_index()
            fig = px.bar(
                grouped_data,
                x=category_col, 
                y=value_col,
                title=f"{agg_func.capitalize()} of {value_col} by {category_col}",
                color=category_col
            )
            
            description = (
                f"Bar Plot Analysis:\n"
                f"• Comparison of {value_col} ({agg_func}) across {category_col} categories\n"
                f"• {len(grouped_data)} categories represented\n"
                f"• Highest value: {grouped_data[value_col].max():.2f} ({grouped_data.loc[grouped_data[value_col].idxmax(), category_col]})\n"
                f"• Lowest value: {grouped_data[value_col].min():.2f} ({grouped_data.loc[grouped_data[value_col].idxmin(), category_col]})"
            )
        
        elif plot_type == "box":
            fig = px.box(
                data, 
                x=category_col, 
                y=value_col,
                title=f"Box Plot of {value_col} by {category_col}",
                color=category_col
            )
            
            # Generate descriptive statistics per group
            grouped_stats = {}
            for group in data[category_col].unique():
                group_data = data[data[category_col] == group][value_col]
                grouped_stats[group] = {
                    'median': group_data.median(),
                    'q1': group_data.quantile(0.25),
                    'q3': group_data.quantile(0.75),
                    'min': group_data.min(),
                    'max': group_data.max()
                }
            
            plot_config = {'grouped_stats': grouped_stats}
            
            description = (
                f"Box Plot Analysis:\n"
                f"• Distribution of {value_col} across {category_col} categories\n"
                f"• Shows median, quartiles, and outliers for each group\n"
                f"• Useful for comparing distributions and identifying outliers"
            )
        
        elif plot_type == "violin":
            show_points = kwargs.get('show_points', False)
            plot_config = {'show_points': show_points}
            
            fig = px.violin(
                data, 
                x=category_col, 
                y=value_col,
                title=f"Violin Plot of {value_col} by {category_col}",
                color=category_col,
                box=True, 
                points="all" if show_points else None
            )
            
            description = (
                f"Violin Plot Analysis:\n"
                f"• Distribution density of {value_col} across {category_col} categories\n"
                f"• Wider sections represent higher density of points\n"
                f"• Shows both distribution shape and summary statistics"
            )
        
        elif plot_type == "strip":
            jitter = kwargs.get('jitter', 0.5)
            plot_config = {'jitter': jitter}
            
            fig = px.strip(
                data, 
                x=category_col, 
                y=value_col,
                title=f"Strip Plot of {value_col} by {category_col}",
                color=category_col
            )
            fig.update_traces(jitter=jitter)
            
            description = (
                f"Strip Plot Analysis:\n"
                f"• Individual observations of {value_col} across {category_col} categories\n"
                f"• Each point represents an observation\n"
                f"• Useful for seeing the actual distribution of data points"
            )
        
        if fig:
            # Convert to JSON for serialization
            plot_json = self._fig_to_json(fig)
            
            results['plots'].append({
                'id': str(uuid.uuid4()),
                'type': plot_type,
                'plot_data': plot_json,
                'title': f"{plot_type} of {value_col} by {category_col}",
                'description': description,
                'config': plot_config,
                'created_at': datetime.now().isoformat()
            })
        
        return results
    
    @safe_operation
    def create_time_series_plots(self, data: pd.DataFrame, time_col: str, value_col: str,
                              plot_types: List[str], **kwargs) -> Dict[str, Any]:
        """
        Create time series plots.
        
        Args:
            data: Input DataFrame
            time_col: Time column name
            value_col: Value column name
            plot_types: List of plot types to create
            **kwargs: Additional plot-specific parameters
            
        Returns:
            Dictionary with visualization results
        """
        results = {'type': 'time_series', 'plots': []}
        
        if time_col not in data.columns or value_col not in data.columns:
            logger.warning(f"Column {time_col} or {value_col} not found in data")
            return results
        
        # Convert to datetime if needed
        if data[time_col].dtype != 'datetime64[ns]':
            try:
                data = data.copy()
                data[time_col] = pd.to_datetime(data[time_col])
            except Exception as e:
                logger.warning(f"Error converting {time_col} to datetime: {str(e)}")
                return results
        
        for plot_type in plot_types:
            fig = None
            description = ""
            plot_config = {}
            
            if plot_type == "line":
                fig = px.line(
                    data, 
                    x=time_col, 
                    y=value_col,
                    title=f"Time Series of {value_col}"
                )
                
                description = (
                    f"Time Series Analysis:\n"
                    f"• Temporal evolution of {value_col}\n"
                    f"• Time range: {data[time_col].min()} to {data[time_col].max()}\n"
                    f"• Mean value: {data[value_col].mean():.2f}"
                )
            
            elif plot_type == "area":
                fig = px.area(
                    data, 
                    x=time_col, 
                    y=value_col,
                    title=f"Area Plot of {value_col}"
                )
                
                description = (
                    f"Area Plot Analysis:\n"
                    f"• Cumulative view of {value_col} over time\n"
                    f"• Emphasizes magnitude changes over time\n"
                    f"• Time range: {data[time_col].min()} to {data[time_col].max()}"
                )
            
            elif plot_type == "rolling":
                window = kwargs.get('window', 7)
                plot_config = {'window': window}
                
                # Calculate rolling statistics
                df_rolling = data.copy()
                df_rolling['Rolling Mean'] = data[value_col].rolling(window).mean()
                df_rolling['Rolling Std'] = data[value_col].rolling(window).std()
                
                fig = go.Figure()
                
                # Add original data
                fig.add_trace(go.Scatter(
                    x=df_rolling[time_col],
                    y=df_rolling[value_col],
                    mode='lines',
                    name='Original'
                ))
                
                # Add rolling mean
                fig.add_trace(go.Scatter(
                    x=df_rolling[time_col],
                    y=df_rolling['Rolling Mean'],
                    mode='lines',
                    name=f'{window}-point Moving Average',
                    line=dict(dash='dash')
                ))
                
                # Add rolling standard deviation
                fig.add_trace(go.Scatter(
                    x=df_rolling[time_col],
                    y=df_rolling['Rolling Std'],
                    mode='lines',
                    name=f'{window}-point Moving Std',
                    line=dict(dash='dot')
                ))
                
                fig.update_layout(
                    title=f"Rolling Statistics for {value_col}",
                    showlegend=True
                )
                
                description = (
                    f"Rolling Statistics Analysis:\n"
                    f"• {window}-point moving average and standard deviation\n"
                    f"• Shows trend and volatility over time\n"
                    f"• Smooths short-term fluctuations to highlight trends"
                )
            
            elif plot_type == "decomposition":
                try:
                    # Set time index for decomposition
                    ts_data = data.set_index(time_col)[value_col]
                    
                    # Infer period if possible
                    if hasattr(ts_data.index, 'freq'):
                        if ts_data.index.freq.name == 'M':
                            period = 12
                        elif ts_data.index.freq.name == 'D':
                            period = 7
                        else:
                            period = 12
                    else:
                        period = kwargs.get('period', 12)
                    
                    plot_config = {'period': period}
                    
                    # Perform decomposition
                    decomposition = seasonal_decompose(
                        ts_data,
                        period=period,
                        extrapolate_trend='freq'
                    )
                    
                    # Create subplot figure
                    fig = make_subplots(
                        rows=4,
                        cols=1,
                        subplot_titles=["Original", "Trend", "Seasonal", "Residual"]
                    )
                    
                    # Add components
                    fig.add_trace(
                        go.Scatter(x=ts_data.index, y=ts_data.values, name="Original"),
                        row=1, col=1
                    )
                    fig.add_trace(
                        go.Scatter(x=ts_data.index, y=decomposition.trend, name="Trend"),
                        row=2, col=1
                    )
                    fig.add_trace(
                        go.Scatter(x=ts_data.index, y=decomposition.seasonal, name="Seasonal"),
                        row=3, col=1
                    )
                    fig.add_trace(
                        go.Scatter(x=ts_data.index, y=decomposition.resid, name="Residual"),
                        row=4, col=1
                    )
                    
                    fig.update_layout(
                        height=900,
                        title="Time Series Decomposition",
                        showlegend=False
                    )
                    
                    description = (
                        f"Time Series Decomposition Analysis:\n"
                        f"• Period: {period}\n"
                        f"• Trend: Long-term progression of the time series\n"
                        f"• Seasonal: Repeating patterns at fixed frequencies\n"
                        f"• Residual: Remaining signal after removing trend and seasonality"
                    )
                    
                except Exception as e:
                    logger.error(f"Error in decomposition: {str(e)}")
                    continue
            
            if fig:
                # Convert to JSON for serialization
                plot_json = self._fig_to_json(fig)
                
                results['plots'].append({
                    'id': str(uuid.uuid4()),
                    'type': plot_type,
                    'plot_data': plot_json,
                    'title': f"{plot_type} of {value_col}",
                    'description': description,
                    'config': plot_config,
                    'created_at': datetime.now().isoformat()
                })
        
        return results
    
    @safe_operation
    def create_composition_plots(self, data: pd.DataFrame, category_col: str, 
                              plot_type: str, value_col: Optional[str] = None, 
                              **kwargs) -> Dict[str, Any]:
        """
        Create composition plots.
        
        Args:
            data: Input DataFrame
            category_col: Categorical column name
            plot_type: Type of plot to create
            value_col: Optional value column name
            **kwargs: Additional plot-specific parameters
            
        Returns:
            Dictionary with visualization results
        """
        results = {'type': 'composition', 'plots': []}
        
        if category_col not in data.columns:
            logger.warning(f"Column {category_col} not found in data")
            return results
        
        if value_col is not None and value_col not in data.columns:
            logger.warning(f"Value column {value_col} not found in data")
            value_col = None
        
        fig = None
        description = ""
        plot_config = {}
        
        if plot_type == "pie":
            # Prepare data
            if value_col:
                grouped_data = data.groupby(category_col)[value_col].sum().reset_index()
                fig = px.pie(
                    grouped_data,
                    names=category_col,
                    values=value_col,
                    title=f"Distribution of {category_col} (by {value_col})"
                )
            else:
                category_counts = data[category_col].value_counts().reset_index()
                category_counts.columns = [category_col, 'count']
                fig = px.pie(
                    category_counts,
                    names=category_col,
                    values='count',
                    title=f"Distribution of {category_col}"
                )
            
            description = (
                f"Pie Chart Analysis:\n"
                f"• Composition of {category_col} categories\n"
                f"• Shows relative proportions of each category\n"
                f"• {len(data[category_col].unique())} unique categories"
            )
            
            # Calculate percentages for the description
            if value_col:
                total = grouped_data[value_col].sum()
                proportions = (grouped_data[value_col] / total).to_dict()
                plot_config = {'proportions': proportions}
            else:
                total = category_counts['count'].sum()
                proportions = (category_counts['count'] / total).to_dict()
                plot_config = {'proportions': proportions}
        
        elif plot_type == "treemap":
            if value_col:
                fig = px.treemap(
                    data,
                    path=[category_col],
                    values=value_col,
                    title=f"Treemap of {category_col} (by {value_col})"
                )
            else:
                category_counts = data[category_col].value_counts().reset_index()
                category_counts.columns = [category_col, 'count']
                fig = px.treemap(
                    category_counts,
                    path=[category_col],
                    values='count',
                    title=f"Treemap of {category_col}"
                )
            
            description = (
                f"Treemap Analysis:\n"
                f"• Hierarchical view of {category_col} categories\n"
                f"• Rectangle area represents proportion\n"
                f"• Useful for visualizing part-to-whole relationships"
            )
        
        elif plot_type == "sunburst":
            # Additional hierarchy levels
            hierarchy_levels = kwargs.get('hierarchy_levels', [])
            plot_config = {'hierarchy': [category_col] + hierarchy_levels}
            
            hierarchy = [category_col]
            for level in hierarchy_levels:
                if level in data.columns:
                    hierarchy.append(level)
            
            if value_col:
                fig = px.sunburst(
                    data,
                    path=hierarchy,
                    values=value_col,
                    title=f"Sunburst Chart of {' > '.join(hierarchy)}"
                )
            else:
                fig = px.sunburst(
                    data,
                    path=hierarchy,
                    title=f"Sunburst Chart of {' > '.join(hierarchy)}"
                )
            
            description = (
                f"Sunburst Chart Analysis:\n"
                f"• Hierarchical view with {len(hierarchy)} levels: {', '.join(hierarchy)}\n"
                f"• Displays nested categories radiating from center\n"
                f"• Useful for visualizing hierarchical part-to-whole relationships"
            )
        
        elif plot_type == "funnel":
            # Prepare data
            if value_col:
                grouped_data = data.groupby(category_col)[value_col].sum().reset_index()
                values = value_col
            else:
                grouped_data = data[category_col].value_counts().reset_index()
                grouped_data.columns = [category_col, 'count']
                values = 'count'
            
            # Sort by value descending
            grouped_data = grouped_data.sort_values(values, ascending=False)
            
            fig = go.Figure(go.Funnel(
                y=grouped_data[category_col],
                x=grouped_data[values],
                textinfo="value+percent initial"
            ))
            fig.update_layout(title=f"Funnel Chart of {category_col}")
            
            # Calculate drop-off rates
            values_list = grouped_data[values].tolist()
            drop_offs = []
            
            for i in range(len(values_list) - 1):
                if values_list[i] == 0:
                    drop_off = 0
                else:
                    drop_off = (values_list[i] - values_list[i+1]) / values_list[i] * 100
                drop_offs.append(drop_off)
            
            plot_config = {'drop_offs': drop_offs}
            
            description = (
                f"Funnel Chart Analysis:\n"
                f"• Sequential stages of {category_col}\n"
                f"• Shows progression and drop-off between stages\n"
                f"• Useful for visualizing multi-step processes"
            )
        
        if fig:
            # Convert to JSON for serialization
            plot_json = self._fig_to_json(fig)
            
            results['plots'].append({
                'id': str(uuid.uuid4()),
                'type': plot_type,
                'plot_data': plot_json,
                'title': f"{plot_type} of {category_col}",
                'description': description,
                'config': plot_config,
                'created_at': datetime.now().isoformat()
            })
        
        return results
    
    def _fig_to_json(self, fig) -> Dict[str, Any]:
        """Convert a Plotly figure to JSON for serialization."""
        return json.loads(fig.to_json())
    
    def _describe_correlation(self, corr: float) -> str:
        """Provide a qualitative description of a correlation coefficient."""
        abs_corr = abs(corr)
        if abs_corr < 0.1:
            strength = "Negligible"
        elif abs_corr < 0.3:
            strength = "Weak"
        elif abs_corr < 0.5:
            strength = "Moderate"
        elif abs_corr < 0.7:
            strength = "Strong"
        else:
            strength = "Very strong"
            
        direction = "positive" if corr >= 0 else "negative"
        return f"{strength} {direction} correlation"
    
    def _interpret_regression(self, r_squared: float, p_value: float) -> str:
        """Interpret regression results."""
        if p_value < 0.05:
            significance = "Statistically significant"
        else:
            significance = "Not statistically significant"

        if r_squared < 0.1:
            fit = "Very poor fit"
        elif r_squared < 0.3:
            fit = "Poor fit"
        elif r_squared < 0.5:
            fit = "Moderate fit"
        elif r_squared < 0.7:
            fit = "Good fit"
        else:
            fit = "Excellent fit"

        return f"{significance} relationship with {fit} (R² = {r_squared:.2f})"

    @safe_operation
    def save_visualization(self, plot_data: Dict[str, Any], analysis_id: str = None,
                        user_id: str = None, session_id: str = None) -> Visualization:
        """Save a visualization to the database and filesystem.

        Args:
            plot_data: Plot data dictionary with metadata and figure data
            analysis_id: Optional ID of the associated analysis
            user_id: Optional ID of the user who created the visualization
            session_id: Optional ID of the session

        Returns:
            The created Visualization object
        """
        # Extract metadata
        viz_type = plot_data.get('type', 'unknown')
        title = plot_data.get('title', f"Visualization {datetime.now().isoformat()}")
        description = plot_data.get('description', '')

        # Create visualization object
        viz = Visualization.objects.create(
            title=title,
            visualization_type=viz_type,
            description=description,
            figure_data=plot_data.get('plot_data', {}),
            parameters=plot_data.get('config', {}),
            user_id=user_id,
            analysis_id=analysis_id,
            session_id=session_id
        )

        # Generate and save image file if figure data is present
        if 'plot_data' in plot_data and plot_data['plot_data']:
            try:
                # Create session directory if needed
                session_dir = self.plots_dir / (session_id or f"session_{uuid.uuid4()}")
                session_dir.mkdir(parents=True, exist_ok=True)

                # Save image
                img_path = session_dir / f"plot_{viz.id}.png"
                img_buffer = self.prepare_plot_for_report(plot_data['plot_data'])
                if img_buffer:
                    with open(img_path, 'wb') as f:
                        f.write(img_buffer.getvalue())
                    viz.image_path = str(img_path)
                    viz.save()
            except Exception as e:
                logger.error(f"Error saving visualization image: {e}")

        return viz

    @safe_operation
    def get_visualization(self, viz_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a visualization by ID.

        Args:
            viz_id: The visualization ID

        Returns:
            The visualization data or None if not found
        """
        try:
            viz = Visualization.objects.get(id=viz_id)
            result = {
                'id': str(viz.id),
                'title': viz.title,
                'type': viz.visualization_type,
                'description': viz.description,
                'plot_data': viz.figure_data,
                'config': viz.parameters,
                'created_at': viz.created_at.isoformat() if viz.created_at else None
            }

            # Add image data if available
            if viz.image_path and os.path.exists(viz.image_path):
                with open(viz.image_path, 'rb') as f:
                    img_data = f.read()
                    result['image_data'] = base64.b64encode(img_data).decode('utf-8')

            return result
        except Visualization.DoesNotExist:
            logger.warning(f"Visualization {viz_id} not found")
            return None
        except Exception as e:
            logger.error(f"Error retrieving visualization {viz_id}: {e}")
            return None

    @safe_operation
    def get_visualizations_by_analysis(self, analysis_id: str) -> List[Dict[str, Any]]:
        """Get all visualizations for an analysis.

        Args:
            analysis_id: The analysis ID

        Returns:
            List of visualization data dictionaries
        """
        visualizations = []
        try:
            for viz in Visualization.objects.filter(analysis_id=analysis_id):
                visualizations.append(self.get_visualization(str(viz.id)))
            return visualizations
        except Exception as e:
            logger.error(f"Error retrieving visualizations for analysis {analysis_id}: {e}")
            return []

    @safe_operation
    def delete_visualization(self, viz_id: str) -> bool:
        """Delete a visualization.

        Args:
            viz_id: The visualization ID

        Returns:
            True if successful, False otherwise
        """
        try:
            viz = Visualization.objects.get(id=viz_id)

            # Delete image file if it exists
            if viz.image_path and os.path.exists(viz.image_path):
                os.remove(viz.image_path)

            # Delete database record
            viz.delete()
            return True
        except Visualization.DoesNotExist:
            logger.warning(f"Visualization {viz_id} not found for deletion")
            return False
        except Exception as e:
            logger.error(f"Error deleting visualization {viz_id}: {e}")
            return False

    @safe_operation
    def prepare_visualization_report(self, visualization_ids: List[str],
                                  title: str = "Visualization Report",
                                  description: str = None,
                                  format: str = 'pdf') -> BytesIO:
        """Generate a report containing selected visualizations.

        Args:
            visualization_ids: List of visualization IDs to include
            title: Report title
            description: Optional report description
            format: Report format ('pdf', 'html', or 'docx')

        Returns:
            A BytesIO containing the report
        """
        if not self.report_service:
            raise ValueError("Report service not available")

        # Collect visualizations
        visualizations = []
        for viz_id in visualization_ids:
            viz_data = self.get_visualization(viz_id)
            if viz_data:
                visualizations.append(viz_data)

        # Prepare report data structure
        report_data = {
            'title': title,
            'description': description or "Visualization Report",
            'user': "system",  # This would typically be the authenticated user
            'date': datetime.now().strftime('%Y-%m-%d %H:%M'),
            'visualizations': visualizations
        }

        # Generate report based on format
        if format == 'pdf':
            return self._generate_visualization_pdf(report_data)
        elif format == 'html':
            return self._generate_visualization_html(report_data)
        else:
            raise ValueError(f"Unsupported report format: {format}")

    def _generate_visualization_pdf(self, report_data: Dict[str, Any]) -> BytesIO:
        """Generate PDF report for visualizations."""
        # This would typically delegate to report_service
        # For now, implement a simple version here
        buffer = BytesIO()
        buffer.write(b"PDF Visualization Report")
        buffer.seek(0)
        return buffer

    def _generate_visualization_html(self, report_data: Dict[str, Any]) -> BytesIO:
        """Generate HTML report for visualizations."""
        buffer = BytesIO()
        buffer.write(b"HTML Visualization Report")
        buffer.seek(0)
        return buffer

    @safe_operation
    def prepare_plot_for_report(self, plot_data: Dict[str, Any]) -> Optional[BytesIO]:
        """Convert a plot to an image format suitable for reports.

        Args:
            plot_data: Plotly figure data

        Returns:
            BytesIO containing the image data or None if conversion fails
        """
        try:
            # Create figure from data
            if isinstance(plot_data, dict) and ('data' in plot_data or 'frames' in plot_data):
                fig = go.Figure(plot_data)
            else:
                logger.warning("Invalid plot data format")
                return None

            # Render as PNG
            img_bytes = BytesIO()
            fig.write_image(img_bytes, format='png', width=800, height=600)
            img_bytes.seek(0)
            return img_bytes
        except Exception as e:
            logger.error(f"Error preparing plot for report: {e}")
            return None

    @safe_operation
    def get_plot_metadata(self, plot_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract metadata from a plot.

        Args:
            plot_data: Plotly figure data

        Returns:
            Dictionary of metadata
        """
        metadata = {
            'title': '',
            'x_axis': '',
            'y_axis': '',
            'plot_type': 'unknown',
            'data_points': 0
        }

        try:
            if 'layout' in plot_data:
                metadata['title'] = plot_data['layout'].get('title', {}).get('text', '')
                metadata['x_axis'] = plot_data['layout'].get('xaxis', {}).get('title', {}).get('text', '')
                metadata['y_axis'] = plot_data['layout'].get('yaxis', {}).get('title', {}).get('text', '')

            if 'data' in plot_data and plot_data['data']:
                # Try to determine plot type from first trace
                trace_type = plot_data['data'][0].get('type', 'unknown')
                metadata['plot_type'] = trace_type

                # Count data points
                total_points = 0
                for trace in plot_data['data']:
                    if 'x' in trace and isinstance(trace['x'], list):
                        total_points += len(trace['x'])
                metadata['data_points'] = total_points
        except Exception as e:
            logger.error(f"Error extracting plot metadata: {e}")

        return metadata

    @safe_operation
    def create_advanced_visualization(self, data: pd.DataFrame, visualization_type: str,
                                   params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Create advanced visualizations beyond the standard types.

        Args:
            data: Input DataFrame
            visualization_type: Type of advanced visualization
            params: Additional parameters for the visualization

        Returns:
            Visualization result dictionary
        """
        params = params or {}
        results = {'type': 'advanced', 'plots': []}

        if visualization_type == 'heatmap_correlation':
            return self._create_correlation_heatmap(data, params)
        elif visualization_type == 'pair_plot':
            return self._create_pair_plot(data, params)
        elif visualization_type == 'dendogram':
            return self._create_dendogram(data, params)
        elif visualization_type == '3d_scatter':
            return self._create_3d_scatter(data, params)
        elif visualization_type == 'network_graph':
            return self._create_network_graph(data, params)
        elif visualization_type == 'radar_chart':
            return self._create_radar_chart(data, params)
        else:
            logger.warning(f"Unknown advanced visualization type: {visualization_type}")
            return results

    def _create_correlation_heatmap(self, data: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a correlation heatmap."""
        results = {'type': 'advanced', 'plots': []}

        columns = params.get('columns', data.select_dtypes(include=['number']).columns)
        method = params.get('method', 'pearson')
        colorscale = params.get('colorscale', 'RdBu_r')
        title = params.get('title', 'Correlation Heatmap')

        # Calculate correlation matrix
        corr_df = data[columns].corr(method=method)

        # Create heatmap
        fig = go.Figure(data=go.Heatmap(
            z=corr_df.values,
            x=corr_df.columns,
            y=corr_df.columns,
            colorscale=colorscale,
            zmin=-1,
            zmax=1,
            showscale=True,
            colorbar=dict(title='Correlation')
        ))

        fig.update_layout(
            title=title,
            height=800,
            width=800,
            xaxis=dict(title=''),
            yaxis=dict(title=''),
        )

        # Add annotations
        annotations = []
        for i, row in enumerate(corr_df.values):
            for j, value in enumerate(row):
                annotations.append(dict(
                    x=corr_df.columns[j],
                    y=corr_df.columns[i],
                    text=f"{value:.2f}",
                    showarrow=False,
                    font=dict(color='white' if abs(value) > 0.5 else 'black')
                ))

        fig.update_layout(annotations=annotations)

        # Convert to JSON for serialization
        plot_json = self._fig_to_json(fig)

        # Create description
        description = (
            f"Correlation Heatmap Analysis:\n"
            f"• Method: {method}\n"
            f"• Number of variables: {len(columns)}\n"
            f"• Color scale: Blue (-1) to Red (+1)\n"
            f"• Strong positive correlations appear in red\n"
            f"• Strong negative correlations appear in blue"
        )

        results['plots'].append({
            'id': str(uuid.uuid4()),
            'type': 'heatmap_correlation',
            'plot_data': plot_json,
            'title': title,
            'description': description,
            'config': params,
            'created_at': datetime.now().isoformat()
        })

        return results

    def _create_pair_plot(self, data: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a pair plot (scatter plot matrix)."""
        results = {'type': 'advanced', 'plots': []}

        columns = params.get('columns', data.select_dtypes(include=['number']).columns[:5])  # Limit to 5 columns by default
        color_col = params.get('color_by', None)
        title = params.get('title', 'Pair Plot Matrix')

        # Create figure with subplots
        fig = make_subplots(rows=len(columns), cols=len(columns),
                          shared_xaxes=True, shared_yaxes=True,
                          subplot_titles=['' for _ in range(len(columns)**2)])

        # Add traces for each pair of variables
        for i, col1 in enumerate(columns):
            for j, col2 in enumerate(columns):
                if i == j:  # Diagonal: histogram
                    fig.add_trace(
                        go.Histogram(x=data[col1], name=col1),
                        row=i+1, col=j+1
                    )
                else:  # Off-diagonal: scatter plot
                    if color_col and color_col in data.columns:
                        for color_val in data[color_col].unique():
                            subset = data[data[color_col] == color_val]
                            fig.add_trace(
                                go.Scatter(
                                    x=subset[col2],
                                    y=subset[col1],
                                    mode='markers',
                                    name=f"{color_val}",
                                    marker=dict(size=5),
                                    showlegend=(i==0 and j==1)  # Only show legend once
                                ),
                                row=i+1, col=j+1
                            )
                    else:
                        fig.add_trace(
                            go.Scatter(
                                x=data[col2],
                                y=data[col1],
                                mode='markers',
                                marker=dict(size=5),
                                showlegend=False
                            ),
                            row=i+1, col=j+1
                        )

        # Update layout
        fig.update_layout(
            title=title,
            height=200 * len(columns),
            width=200 * len(columns),
            showlegend=bool(color_col),
        )

        # Update axes labels
        for i, col in enumerate(columns):
            fig.update_xaxes(title=col, row=len(columns), col=i+1)
            fig.update_yaxes(title=col, row=i+1, col=1)

        # Convert to JSON for serialization
        plot_json = self._fig_to_json(fig)

        # Create description
        description = (
            f"Pair Plot Analysis:\n"
            f"• Matrix of scatter plots between pairs of variables\n"
            f"• Diagonal shows distribution of each variable\n"
            f"• Number of variables: {len(columns)}\n"
            f"{f'• Color variable: {color_col}' if color_col else ''}\n"
            f"• Useful for exploring relationships between multiple variables simultaneously"
        )

        results['plots'].append({
            'id': str(uuid.uuid4()),
            'type': 'pair_plot',
            'plot_data': plot_json,
            'title': title,
            'description': description,
            'config': params,
            'created_at': datetime.now().isoformat()
        })

        return results

    def _create_dendogram(self, data: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a hierarchical clustering dendogram."""
        results = {'type': 'advanced', 'plots': []}

        # Implementation would go here
        # Placeholder for now - advanced plotting would typically be implemented based on specific requirements

        return results

    def _create_3d_scatter(self, data: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a 3D scatter plot."""
        results = {'type': 'advanced', 'plots': []}

        # Get parameters
        x_col = params.get('x')
        y_col = params.get('y')
        z_col = params.get('z')
        color_col = params.get('color_by')
        size_col = params.get('size_by')
        title = params.get('title', '3D Scatter Plot')

        if not all([x_col, y_col, z_col]) or not all(col in data.columns for col in [x_col, y_col, z_col]):
            logger.warning("Missing required columns for 3D scatter plot")
            return results

        # Create 3D scatter plot
        if color_col and color_col in data.columns:
            fig = px.scatter_3d(
                data, x=x_col, y=y_col, z=z_col,
                color=color_col,
                size=size_col if size_col and size_col in data.columns else None,
                title=title
            )
        else:
            fig = px.scatter_3d(
                data, x=x_col, y=y_col, z=z_col,
                size=size_col if size_col and size_col in data.columns else None,
                title=title
            )

        fig.update_layout(
            scene=dict(
                xaxis_title=x_col,
                yaxis_title=y_col,
                zaxis_title=z_col
            )
        )

        # Convert to JSON for serialization
        plot_json = self._fig_to_json(fig)

        # Create description
        description = (
            f"3D Scatter Plot Analysis:\n"
            f"• X-axis: {x_col}\n"
            f"• Y-axis: {y_col}\n"
            f"• Z-axis: {z_col}\n"
            f"{f'• Color variable: {color_col}' if color_col else ''}\n"
            f"{f'• Size variable: {size_col}' if size_col else ''}\n"
            f"• Visualizes relationships between three variables simultaneously"
        )

        results['plots'].append({
            'id': str(uuid.uuid4()),
            'type': '3d_scatter',
            'plot_data': plot_json,
            'title': title,
            'description': description,
            'config': params,
            'created_at': datetime.now().isoformat()
        })

        return results

    def _create_network_graph(self, data: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a network graph visualization."""
        results = {'type': 'advanced', 'plots': []}

        # Implementation would go here
        # Placeholder for now - advanced plotting would typically be implemented based on specific requirements

        return results

    def _create_radar_chart(self, data: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a radar chart visualization."""
        results = {'type': 'advanced', 'plots': []}

        category_col = params.get('category_col')
        value_cols = params.get('value_cols', [])
        title = params.get('title', 'Radar Chart')

        if not category_col or not value_cols or not all(col in data.columns for col in [category_col] + value_cols):
            logger.warning("Missing required columns for radar chart")
            return results

        # Prepare data for radar chart
        categories = data[category_col].unique()

        fig = go.Figure()

        for category in categories:
            subset = data[data[category_col] == category]
            if len(subset) > 0:  # Check if category has data
                # Get values for this category
                values = [subset[col].mean() for col in value_cols]
                # Close the polygon by repeating the first value
                values.append(values[0])

                fig.add_trace(go.Scatterpolar(
                    r=values,
                    theta=value_cols + [value_cols[0]],  # Close the polygon
                    fill='toself',
                    name=str(category)
                ))

        fig.update_layout(
            title=title,
            polar=dict(
                radialaxis=dict(
                    visible=True,
                )
            )
        )

        # Convert to JSON for serialization
        plot_json = self._fig_to_json(fig)

        # Create description
        description = (
            f"Radar Chart Analysis:\n"
            f"• Category variable: {category_col}\n"
            f"• Measurement variables: {', '.join(value_cols)}\n"
            f"• Number of categories: {len(categories)}\n"
            f"• Visualizes multivariate data across multiple categories"
        )

        results['plots'].append({
            'id': str(uuid.uuid4()),
            'type': 'radar_chart',
            'plot_data': plot_json,
            'title': title,
            'description': description,
            'config': params,
            'created_at': datetime.now().isoformat()
        })

        return results