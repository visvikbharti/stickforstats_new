"""
Descriptive Statistics View for High-Precision Statistical API
===============================================================
Implements comprehensive descriptive statistics with 50-decimal precision
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from mpmath import mp, mpf
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Union
import logging
import json

logger = logging.getLogger(__name__)

# Set high precision for all calculations
mp.dps = 50


class DescriptiveStatisticsView(APIView):
    """
    High-precision descriptive statistics implementation.

    This endpoint provides:
    - Central tendency measures (mean, median, mode)
    - Dispersion measures (variance, std dev, range, IQR)
    - Shape measures (skewness, kurtosis)
    - Position measures (percentiles, quartiles)
    - 50 decimal place precision throughout
    """
    permission_classes = [AllowAny]  # Allow public access for statistical calculations

    def calculate_mean(self, data: List[float]) -> str:
        """Calculate arithmetic mean with high precision"""
        mp.dps = 50
        values = [mpf(str(x)) for x in data]
        mean = sum(values) / mpf(len(values))
        return str(mean)

    def calculate_median(self, data: List[float]) -> str:
        """Calculate median with high precision"""
        mp.dps = 50
        values = sorted([mpf(str(x)) for x in data])
        n = len(values)

        if n % 2 == 0:
            median = (values[n//2 - 1] + values[n//2]) / mpf(2)
        else:
            median = values[n//2]

        return str(median)

    def calculate_mode(self, data: List[float]) -> Union[str, List[str]]:
        """Calculate mode(s) with high precision"""
        from collections import Counter
        counts = Counter(data)
        max_count = max(counts.values())
        modes = [str(k) for k, v in counts.items() if v == max_count]

        if len(modes) == 1:
            return modes[0]
        elif len(modes) == len(counts):
            return None  # No mode (all values appear equally)
        else:
            return modes  # Multiple modes

    def calculate_variance(self, data: List[float], ddof: int = 0) -> str:
        """Calculate variance with high precision"""
        mp.dps = 50
        values = [mpf(str(x)) for x in data]
        n = len(values)
        mean = sum(values) / mpf(n)

        squared_diffs = [(v - mean) ** 2 for v in values]
        variance = sum(squared_diffs) / mpf(n - ddof)

        return str(variance)

    def calculate_std_dev(self, data: List[float], ddof: int = 0) -> str:
        """Calculate standard deviation with high precision"""
        mp.dps = 50
        variance = mpf(self.calculate_variance(data, ddof))
        std_dev = variance ** mpf('0.5')
        return str(std_dev)

    def calculate_range(self, data: List[float]) -> str:
        """Calculate range with high precision"""
        mp.dps = 50
        values = [mpf(str(x)) for x in data]
        data_range = max(values) - min(values)
        return str(data_range)

    def calculate_iqr(self, data: List[float]) -> Dict[str, str]:
        """Calculate interquartile range with high precision"""
        mp.dps = 50
        values = sorted([mpf(str(x)) for x in data])
        n = len(values)

        # Calculate Q1 (25th percentile)
        q1_pos = (n - 1) * mpf('0.25')
        q1_lower = int(q1_pos)
        q1_weight = q1_pos - q1_lower
        q1 = values[q1_lower] * (mpf(1) - q1_weight) + values[min(q1_lower + 1, n - 1)] * q1_weight

        # Calculate Q3 (75th percentile)
        q3_pos = (n - 1) * mpf('0.75')
        q3_lower = int(q3_pos)
        q3_weight = q3_pos - q3_lower
        q3 = values[q3_lower] * (mpf(1) - q3_weight) + values[min(q3_lower + 1, n - 1)] * q3_weight

        iqr = q3 - q1

        return {
            'q1': str(q1),
            'q3': str(q3),
            'iqr': str(iqr)
        }

    def calculate_skewness(self, data: List[float]) -> str:
        """Calculate skewness with high precision"""
        mp.dps = 50
        values = [mpf(str(x)) for x in data]
        n = len(values)

        mean = sum(values) / mpf(n)
        std_dev = mpf(self.calculate_std_dev(data, ddof=0))

        if std_dev == 0:
            return str(mpf(0))

        # Calculate third moment
        third_moment = sum([(v - mean) ** 3 for v in values]) / mpf(n)
        skewness = third_moment / (std_dev ** 3)

        return str(skewness)

    def calculate_kurtosis(self, data: List[float], excess: bool = True) -> str:
        """Calculate kurtosis with high precision"""
        mp.dps = 50
        values = [mpf(str(x)) for x in data]
        n = len(values)

        mean = sum(values) / mpf(n)
        std_dev = mpf(self.calculate_std_dev(data, ddof=0))

        if std_dev == 0:
            return str(mpf(0))

        # Calculate fourth moment
        fourth_moment = sum([(v - mean) ** 4 for v in values]) / mpf(n)
        kurtosis = fourth_moment / (std_dev ** 4)

        if excess:
            kurtosis -= mpf(3)  # Excess kurtosis (0 for normal distribution)

        return str(kurtosis)

    def calculate_percentile(self, data: List[float], percentile: float) -> str:
        """Calculate specific percentile with high precision"""
        mp.dps = 50
        values = sorted([mpf(str(x)) for x in data])
        n = len(values)

        p = mpf(str(percentile)) / mpf(100)
        pos = (n - 1) * p
        lower = int(pos)
        weight = pos - lower

        if lower >= n - 1:
            return str(values[-1])

        result = values[lower] * (mpf(1) - weight) + values[lower + 1] * weight
        return str(result)

    def calculate_geometric_mean(self, data: List[float]) -> str:
        """Calculate geometric mean with high precision"""
        mp.dps = 50

        # Check for non-positive values
        if any(x <= 0 for x in data):
            return None  # Geometric mean undefined for non-positive values

        values = [mpf(str(x)) for x in data]
        n = len(values)

        # Use logarithms to avoid overflow
        from mpmath import log, exp
        log_sum = sum([log(v) for v in values])
        geom_mean = exp(log_sum / mpf(n))

        return str(geom_mean)

    def calculate_harmonic_mean(self, data: List[float]) -> str:
        """Calculate harmonic mean with high precision"""
        mp.dps = 50

        # Check for non-positive values
        if any(x <= 0 for x in data):
            return None  # Harmonic mean undefined for non-positive values

        values = [mpf(str(x)) for x in data]
        n = len(values)

        reciprocal_sum = sum([mpf(1) / v for v in values])
        harm_mean = mpf(n) / reciprocal_sum

        return str(harm_mean)

    def calculate_cv(self, data: List[float]) -> str:
        """Calculate coefficient of variation with high precision"""
        mp.dps = 50

        mean = mpf(self.calculate_mean(data))
        std_dev = mpf(self.calculate_std_dev(data, ddof=1))

        if mean == 0:
            return None  # CV undefined when mean is 0

        cv = (std_dev / abs(mean)) * mpf(100)
        return str(cv)

    def calculate_z_scores(self, data: List[float]) -> List[str]:
        """Calculate z-scores for all data points with high precision"""
        mp.dps = 50

        mean = mpf(self.calculate_mean(data))
        std_dev = mpf(self.calculate_std_dev(data, ddof=0))

        if std_dev == 0:
            return [str(mpf(0)) for _ in data]

        values = [mpf(str(x)) for x in data]
        z_scores = [(v - mean) / std_dev for v in values]

        return [str(z) for z in z_scores]

    def calculate_mad(self, data: List[float]) -> str:
        """Calculate Median Absolute Deviation with high precision"""
        mp.dps = 50

        median = mpf(self.calculate_median(data))
        values = [mpf(str(x)) for x in data]

        absolute_deviations = [abs(v - median) for v in values]
        mad = mpf(self.calculate_median([float(str(d)) for d in absolute_deviations]))

        return str(mad)

    def post(self, request):
        """
        Perform high-precision descriptive statistics

        Request body:
        {
            "data": "1,2,3,4,5" or [1,2,3,4,5],
            "statistics": ["mean", "median", "std", ...] or "all"
        }

        Returns comprehensive descriptive statistics with 50 decimal precision
        """
        try:
            # Parse request data
            data_input = request.data.get('data')
            requested_stats = request.data.get('statistics', 'all')

            # Handle flexible data input
            if isinstance(data_input, str):
                # Parse comma-separated string
                data = [float(x.strip()) for x in data_input.split(',') if x.strip()]
            elif isinstance(data_input, list):
                data = [float(x) for x in data_input]
            else:
                return Response(
                    {'error': 'Invalid data format. Provide comma-separated string or list of numbers.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate data
            if len(data) < 1:
                return Response(
                    {'error': 'Need at least 1 data point for descriptive statistics'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Calculate all statistics
            results = {
                'sample_size': len(data),
                'precision': '50 decimal places',
                'high_precision_result': {},  # Will store all high-precision calculations
                'metadata': {
                    'precision': 50,
                    'algorithm': 'mpmath_high_precision',
                    'version': '1.0.0'
                }
            }

            # Determine which statistics to calculate
            if requested_stats == 'all':
                stats_to_calc = [
                    'mean', 'median', 'mode', 'std', 'variance',
                    'range', 'iqr', 'min', 'max', 'sum',
                    'skewness', 'kurtosis', 'cv', 'mad',
                    'geometric_mean', 'harmonic_mean',
                    'q1', 'q2', 'q3', 'p10', 'p90', 'p95', 'p99'
                ]
            elif isinstance(requested_stats, list):
                stats_to_calc = requested_stats
            else:
                stats_to_calc = ['mean', 'median', 'std', 'variance']

            # Calculate requested statistics
            hp_result = {}  # Store high-precision calculations

            if 'mean' in stats_to_calc:
                hp_result['mean'] = self.calculate_mean(data)

            if 'median' in stats_to_calc or 'q2' in stats_to_calc:
                hp_result['median'] = self.calculate_median(data)
                if 'q2' in stats_to_calc:
                    hp_result['q2'] = hp_result['median']

            if 'mode' in stats_to_calc:
                hp_result['mode'] = self.calculate_mode(data)

            if 'std' in stats_to_calc:
                hp_result['std'] = self.calculate_std_dev(data, ddof=1)
                hp_result['std_population'] = self.calculate_std_dev(data, ddof=0)

            if 'variance' in stats_to_calc:
                hp_result['variance'] = self.calculate_variance(data, ddof=1)
                hp_result['variance_population'] = self.calculate_variance(data, ddof=0)

            if 'range' in stats_to_calc:
                hp_result['range'] = self.calculate_range(data)

            if 'iqr' in stats_to_calc or 'q1' in stats_to_calc or 'q3' in stats_to_calc:
                iqr_data = self.calculate_iqr(data)
                if 'iqr' in stats_to_calc:
                    hp_result['iqr'] = iqr_data['iqr']
                if 'q1' in stats_to_calc:
                    hp_result['q1'] = iqr_data['q1']
                if 'q3' in stats_to_calc:
                    hp_result['q3'] = iqr_data['q3']

            if 'min' in stats_to_calc:
                mp.dps = 50
                hp_result['min'] = str(min([mpf(str(x)) for x in data]))

            if 'max' in stats_to_calc:
                mp.dps = 50
                hp_result['max'] = str(max([mpf(str(x)) for x in data]))

            if 'sum' in stats_to_calc:
                mp.dps = 50
                hp_result['sum'] = str(sum([mpf(str(x)) for x in data]))

            if 'skewness' in stats_to_calc:
                hp_result['skewness'] = self.calculate_skewness(data)

            if 'kurtosis' in stats_to_calc:
                hp_result['kurtosis'] = self.calculate_kurtosis(data)

            if 'cv' in stats_to_calc:
                cv = self.calculate_cv(data)
                if cv is not None:
                    hp_result['coefficient_of_variation'] = cv

            if 'mad' in stats_to_calc:
                hp_result['mad'] = self.calculate_mad(data)

            if 'geometric_mean' in stats_to_calc:
                geom_mean = self.calculate_geometric_mean(data)
                if geom_mean is not None:
                    hp_result['geometric_mean'] = geom_mean

            if 'harmonic_mean' in stats_to_calc:
                harm_mean = self.calculate_harmonic_mean(data)
                if harm_mean is not None:
                    hp_result['harmonic_mean'] = harm_mean

            # Calculate specific percentiles
            percentiles_to_calc = []
            if 'p10' in stats_to_calc:
                percentiles_to_calc.append(('p10', 10))
            if 'p90' in stats_to_calc:
                percentiles_to_calc.append(('p90', 90))
            if 'p95' in stats_to_calc:
                percentiles_to_calc.append(('p95', 95))
            if 'p99' in stats_to_calc:
                percentiles_to_calc.append(('p99', 99))

            for name, p in percentiles_to_calc:
                hp_result[name] = self.calculate_percentile(data, p)

            # Calculate z-scores if requested
            if 'z_scores' in stats_to_calc:
                hp_result['z_scores'] = self.calculate_z_scores(data)

            # Store high-precision results
            results['high_precision_result'] = hp_result

            # Add interpretation
            if 'skewness' in hp_result:
                skew_val = float(hp_result['skewness'])
                if abs(skew_val) < 0.5:
                    results['skewness_interpretation'] = 'Approximately symmetric'
                elif skew_val < -0.5:
                    results['skewness_interpretation'] = 'Negatively skewed (left-tailed)'
                else:
                    results['skewness_interpretation'] = 'Positively skewed (right-tailed)'

            if 'kurtosis' in hp_result:
                kurt_val = float(hp_result['kurtosis'])
                if abs(kurt_val) < 1:
                    results['kurtosis_interpretation'] = 'Approximately mesokurtic (normal-like)'
                elif kurt_val < -1:
                    results['kurtosis_interpretation'] = 'Platykurtic (light-tailed, flat)'
                else:
                    results['kurtosis_interpretation'] = 'Leptokurtic (heavy-tailed, peaked)'

            logger.info(f"Calculated descriptive statistics for {len(data)} data points")

            return Response(results, status=status.HTTP_200_OK)

        except ValueError as e:
            logger.error(f"Value error in descriptive statistics: {str(e)}")
            return Response(
                {'error': f'Invalid numeric data: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error in descriptive statistics calculation: {str(e)}")
            return Response(
                {'error': f'Calculation error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )