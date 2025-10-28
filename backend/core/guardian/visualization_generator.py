"""
Guardian Visualization Generator
=================================
Generates publication-ready diagnostic plots for statistical assumption validation.
All visualizations follow academic publication standards.

Author: StickForStats Development Team
Date: October 2025
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-GUI backend
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
import seaborn as sns
from scipy import stats
import io
import base64
from typing import Dict, Any, List, Tuple, Optional
import warnings

warnings.filterwarnings('ignore')

# Set professional styling
sns.set_style("whitegrid")
plt.rcParams['figure.facecolor'] = 'white'
plt.rcParams['axes.facecolor'] = 'white'
plt.rcParams['font.size'] = 10
plt.rcParams['axes.titlesize'] = 12
plt.rcParams['axes.labelsize'] = 10


class VisualizationGenerator:
    """
    Generates publication-quality diagnostic plots for Guardian validation reports.

    All plots follow academic standards and can be directly included in publications.
    """

    def __init__(self):
        """Initialize visualization generator"""
        self.dpi = 150  # High resolution for publication
        self.figsize = (6, 4)  # Standard size for reports

    def generate_all_diagnostics(self, data: np.ndarray,
                                 violations: List[Dict[str, Any]],
                                 test_type: str) -> Dict[str, str]:
        """
        Generate all relevant diagnostic plots based on violations

        Parameters:
        -----------
        data : np.ndarray or list
            The data array(s) to visualize - can be single array or list of arrays
        violations : List[Dict]
            List of violations detected
        test_type : str
            Type of statistical test

        Returns:
        --------
        Dict[str, str] : Dictionary mapping plot_name -> base64_encoded_image
        """
        plots = {}

        # Convert list to numpy array if needed (for single group data)
        if isinstance(data, list) and len(data) > 0:
            # Check if it's a list of arrays (multiple groups) or single list
            if isinstance(data[0], (list, np.ndarray)):
                # Multiple groups - combine for overall visualization
                data_combined = np.concatenate([np.array(g).flatten() for g in data])
            else:
                # Single list - convert to array
                data_combined = np.array(data)
        elif isinstance(data, np.ndarray):
            data_combined = data.flatten() if len(data.shape) > 1 else data
        else:
            # Invalid data type - skip visualization
            return plots

        # Always generate basic plots
        plots['histogram'] = self.generate_histogram(data_combined)
        plots['boxplot'] = self.generate_boxplot(data_combined)

        # Generate Q-Q plot for tests that check normality (parametric tests)
        # Show Q-Q plot for any test that requires normality assumption
        if test_type in ['t_test', 'anova', 'pearson', 'regression']:
            plots['qq_plot'] = self.generate_qq_plot(data_combined)

        # Generate additional plots based on test type
        if test_type in ['t_test', 'anova', 'mann_whitney']:
            if isinstance(data, list) and len(data) > 1:
                # Multiple groups - generate comparison plot
                plots['group_comparison'] = self.generate_group_comparison(data)

        return plots

    def generate_qq_plot(self, data: np.ndarray) -> str:
        """
        Generate Q-Q plot for normality assessment

        The Q-Q (Quantile-Quantile) plot is the gold standard for visually
        assessing normality. Points should fall on the diagonal line if
        data is normally distributed.

        Parameters:
        -----------
        data : np.ndarray
            Data array to plot

        Returns:
        --------
        str : Base64-encoded PNG image
        """
        # Flatten if needed
        data_flat = data.flatten() if len(data.shape) > 1 else data
        data_clean = data_flat[~np.isnan(data_flat)]

        if len(data_clean) < 3:
            return self._generate_error_plot("Insufficient data for Q-Q plot")

        fig, ax = plt.subplots(figsize=self.figsize, dpi=self.dpi)

        # Calculate theoretical and sample quantiles
        (theoretical_quantiles, ordered_values), (slope, intercept, r) = stats.probplot(
            data_clean, dist="norm", plot=None
        )

        # Plot sample points
        ax.scatter(theoretical_quantiles, ordered_values,
                  alpha=0.6, s=30, color='#1976d2',
                  edgecolors='navy', linewidth=0.5,
                  label='Sample quantiles')

        # Plot theoretical line
        theoretical_line = slope * theoretical_quantiles + intercept
        ax.plot(theoretical_quantiles, theoretical_line,
               'r--', linewidth=2, label='Normal distribution',
               alpha=0.8)

        # Add reference bands (optional - shows where 95% of points should be)
        # Calculate 95% confidence envelope
        n = len(data_clean)
        se = np.std(ordered_values) * np.sqrt(1 + 1/n)
        upper_band = theoretical_line + 1.96 * se
        lower_band = theoretical_line - 1.96 * se
        ax.fill_between(theoretical_quantiles, lower_band, upper_band,
                        alpha=0.1, color='red',
                        label='95% confidence envelope')

        ax.set_xlabel('Theoretical Quantiles (Normal Distribution)', fontsize=10)
        ax.set_ylabel('Sample Quantiles', fontsize=10)
        ax.set_title('Q-Q Plot: Normality Assessment', fontsize=12, fontweight='bold')
        ax.legend(loc='upper left', fontsize=8)
        ax.grid(True, alpha=0.3, linestyle='--')

        # Add interpretation text
        if abs(r) > 0.98:
            interpretation = "Excellent fit to normal distribution"
            color = 'green'
        elif abs(r) > 0.95:
            interpretation = "Good fit to normal distribution"
            color = 'orange'
        else:
            interpretation = "Poor fit to normal distribution"
            color = 'red'

        ax.text(0.05, 0.95, f'R² = {r**2:.4f}\n{interpretation}',
               transform=ax.transAxes,
               verticalalignment='top',
               bbox=dict(boxstyle='round', facecolor=color, alpha=0.2),
               fontsize=8)

        plt.tight_layout()

        # Convert to base64
        return self._fig_to_base64(fig)

    def generate_histogram(self, data: np.ndarray) -> str:
        """
        Generate histogram with normal distribution overlay

        Shows the actual distribution of data compared to the theoretical
        normal distribution. Deviations indicate non-normality.

        Parameters:
        -----------
        data : np.ndarray
            Data array to plot

        Returns:
        --------
        str : Base64-encoded PNG image
        """
        # Flatten if needed
        data_flat = data.flatten() if len(data.shape) > 1 else data
        data_clean = data_flat[~np.isnan(data_flat)]

        if len(data_clean) < 3:
            return self._generate_error_plot("Insufficient data for histogram")

        fig, ax = plt.subplots(figsize=self.figsize, dpi=self.dpi)

        # Calculate optimal number of bins using Freedman-Diaconis rule
        q75, q25 = np.percentile(data_clean, [75, 25])
        iqr = q75 - q25
        bin_width = 2 * iqr / (len(data_clean) ** (1/3))
        n_bins = int(np.ceil((data_clean.max() - data_clean.min()) / bin_width))
        n_bins = max(10, min(n_bins, 50))  # Constrain between 10-50 bins

        # Plot histogram
        n, bins, patches = ax.hist(data_clean, bins=n_bins,
                                   density=True, alpha=0.7,
                                   color='#1976d2', edgecolor='navy',
                                   label='Observed distribution')

        # Overlay normal distribution
        mu, sigma = np.mean(data_clean), np.std(data_clean)
        x_range = np.linspace(data_clean.min(), data_clean.max(), 100)
        normal_curve = stats.norm.pdf(x_range, mu, sigma)
        ax.plot(x_range, normal_curve, 'r--', linewidth=2,
               label=f'Normal(μ={mu:.2f}, σ={sigma:.2f})',
               alpha=0.8)

        # Add vertical lines for mean and median
        mean_val = np.mean(data_clean)
        median_val = np.median(data_clean)
        ax.axvline(mean_val, color='green', linestyle='--',
                  linewidth=1.5, label=f'Mean = {mean_val:.2f}', alpha=0.7)
        ax.axvline(median_val, color='orange', linestyle='--',
                  linewidth=1.5, label=f'Median = {median_val:.2f}', alpha=0.7)

        ax.set_xlabel('Value', fontsize=10)
        ax.set_ylabel('Density', fontsize=10)
        ax.set_title('Distribution Analysis: Histogram with Normal Overlay',
                    fontsize=12, fontweight='bold')
        ax.legend(loc='best', fontsize=8)
        ax.grid(True, alpha=0.3, linestyle='--', axis='y')

        # Add statistics box
        skewness = stats.skew(data_clean)
        kurtosis = stats.kurtosis(data_clean)
        stats_text = f'n = {len(data_clean)}\nSkewness = {skewness:.3f}\nKurtosis = {kurtosis:.3f}'
        ax.text(0.95, 0.95, stats_text,
               transform=ax.transAxes,
               verticalalignment='top',
               horizontalalignment='right',
               bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.3),
               fontsize=8)

        plt.tight_layout()

        return self._fig_to_base64(fig)

    def generate_boxplot(self, data: np.ndarray) -> str:
        """
        Generate box plot for outlier detection

        Shows median, quartiles, and outliers. Points beyond whiskers
        are potential outliers.

        Parameters:
        -----------
        data : np.ndarray
            Data array to plot

        Returns:
        --------
        str : Base64-encoded PNG image
        """
        # Flatten if needed
        data_flat = data.flatten() if len(data.shape) > 1 else data
        data_clean = data_flat[~np.isnan(data_flat)]

        if len(data_clean) < 3:
            return self._generate_error_plot("Insufficient data for box plot")

        fig, ax = plt.subplots(figsize=(5, 6), dpi=self.dpi)

        # Create box plot
        bp = ax.boxplot(data_clean, vert=True, patch_artist=True,
                       widths=0.6,
                       boxprops=dict(facecolor='#1976d2', alpha=0.7, edgecolor='navy'),
                       whiskerprops=dict(color='navy', linewidth=1.5),
                       capprops=dict(color='navy', linewidth=1.5),
                       medianprops=dict(color='red', linewidth=2),
                       flierprops=dict(marker='o', markerfacecolor='red',
                                      markersize=6, alpha=0.6,
                                      markeredgecolor='darkred'))

        # Add strip plot for individual points (jittered)
        y_values = data_clean
        x_values = np.random.normal(1, 0.04, size=len(y_values))
        ax.scatter(x_values, y_values, alpha=0.3, s=20, color='black',
                  label='Individual data points')

        ax.set_ylabel('Value', fontsize=11, fontweight='bold')
        ax.set_title('Box Plot: Outlier Detection', fontsize=12, fontweight='bold')
        ax.set_xticks([1])
        ax.set_xticklabels(['Data'])
        ax.grid(True, alpha=0.3, linestyle='--', axis='y')

        # Calculate and display statistics
        q1 = np.percentile(data_clean, 25)
        q2 = np.percentile(data_clean, 50)  # median
        q3 = np.percentile(data_clean, 75)
        iqr = q3 - q1
        lower_fence = q1 - 1.5 * iqr
        upper_fence = q3 + 1.5 * iqr
        outliers = data_clean[(data_clean < lower_fence) | (data_clean > upper_fence)]

        stats_text = (f'Median = {q2:.2f}\n'
                     f'Q1 = {q1:.2f}\n'
                     f'Q3 = {q3:.2f}\n'
                     f'IQR = {iqr:.2f}\n'
                     f'Outliers = {len(outliers)} ({len(outliers)/len(data_clean)*100:.1f}%)')

        ax.text(1.35, 0.5, stats_text,
               transform=ax.get_xaxis_transform(),
               verticalalignment='center',
               bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5),
               fontsize=9)

        plt.tight_layout()

        return self._fig_to_base64(fig)

    def generate_group_comparison(self, data: List[np.ndarray]) -> str:
        """
        Generate side-by-side comparison of groups

        Parameters:
        -----------
        data : List[np.ndarray]
            List of arrays, one per group

        Returns:
        --------
        str : Base64-encoded PNG image
        """
        if not isinstance(data, list):
            return self._generate_error_plot("Data must be a list of arrays for group comparison")

        if len(data) < 2:
            return self._generate_error_plot("At least 2 groups required for comparison")

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 5), dpi=self.dpi)

        # Clean data
        cleaned_groups = []
        for group in data:
            group_flat = group.flatten() if len(group.shape) > 1 else group
            group_clean = group_flat[~np.isnan(group_flat)]
            cleaned_groups.append(group_clean)

        group_labels = [f'Group {i+1}' for i in range(len(cleaned_groups))]

        # Left plot: Box plots
        bp = ax1.boxplot(cleaned_groups, labels=group_labels,
                        patch_artist=True, widths=0.6)

        # Color each box differently
        colors = ['#1976d2', '#f57c00', '#2e7d32', '#d32f2f', '#7b1fa2']
        for patch, color in zip(bp['boxes'], colors[:len(cleaned_groups)]):
            patch.set_facecolor(color)
            patch.set_alpha(0.7)

        ax1.set_ylabel('Value', fontsize=10, fontweight='bold')
        ax1.set_title('Group Comparison: Box Plots', fontsize=11, fontweight='bold')
        ax1.grid(True, alpha=0.3, linestyle='--', axis='y')

        # Right plot: Violin plots
        parts = ax2.violinplot(cleaned_groups, positions=range(1, len(cleaned_groups)+1),
                              showmeans=True, showmedians=True)

        # Color violin plots
        for pc, color in zip(parts['bodies'], colors[:len(cleaned_groups)]):
            pc.set_facecolor(color)
            pc.set_alpha(0.7)

        ax2.set_xticks(range(1, len(cleaned_groups)+1))
        ax2.set_xticklabels(group_labels)
        ax2.set_ylabel('Value', fontsize=10, fontweight='bold')
        ax2.set_title('Group Comparison: Violin Plots', fontsize=11, fontweight='bold')
        ax2.grid(True, alpha=0.3, linestyle='--', axis='y')

        # Add summary statistics
        summary = "Group Statistics:\n"
        for i, (group, label) in enumerate(zip(cleaned_groups, group_labels)):
            summary += f"{label}: n={len(group)}, μ={np.mean(group):.2f}, σ={np.std(group):.2f}\n"

        fig.text(0.5, 0.02, summary, ha='center', fontsize=8,
                bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.3))

        plt.tight_layout(rect=[0, 0.08, 1, 1])

        return self._fig_to_base64(fig)

    def _fig_to_base64(self, fig) -> str:
        """Convert matplotlib figure to base64-encoded PNG string"""
        buffer = io.BytesIO()
        fig.savefig(buffer, format='png', dpi=self.dpi, bbox_inches='tight',
                   facecolor='white', edgecolor='none')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        plt.close(fig)
        buffer.close()
        return image_base64

    def _generate_error_plot(self, message: str) -> str:
        """Generate an error message plot"""
        fig, ax = plt.subplots(figsize=self.figsize, dpi=self.dpi)
        ax.text(0.5, 0.5, f"⚠️\n{message}",
               ha='center', va='center',
               fontsize=12, color='red',
               bbox=dict(boxstyle='round', facecolor='yellow', alpha=0.3))
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.axis('off')
        plt.tight_layout()
        return self._fig_to_base64(fig)
