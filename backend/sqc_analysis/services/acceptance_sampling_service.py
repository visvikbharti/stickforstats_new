"""
Acceptance Sampling Service for Statistical Quality Control (SQC) Analysis.

This module provides services for designing and analyzing acceptance sampling plans,
including single, double, and multiple sampling, and operating characteristic (OC) curve generation.
Adapted from the original Streamlit implementation to work with Django/React architecture.
"""

import numpy as np
import pandas as pd
import scipy.stats as stats
from typing import Dict, List, Optional, Tuple, Union, Any

from .utils_service import calc_oc_curve_points, calculate_arl

class AcceptanceSamplingService:
    """
    Service for acceptance sampling analysis.
    """
    
    def __init__(self):
        """Initialize the acceptance sampling service."""
        pass
    
    def calculate_single_sampling_plan(
        self,
        lot_size: int,
        acceptable_quality_level: float,
        rejectable_quality_level: float,
        producer_risk: float = 0.05,
        consumer_risk: float = 0.1
    ) -> Dict[str, Any]:
        """
        Calculate parameters for a single sampling plan.
        
        Args:
            lot_size: Size of the production lot
            acceptable_quality_level: Acceptable Quality Level (AQL)
            rejectable_quality_level: Lot Tolerance Percent Defective (LTPD)
            producer_risk: Producer's risk (alpha)
            consumer_risk: Consumer's risk (beta)
            
        Returns:
            Dictionary containing sampling plan parameters and OC curve data
        """
        # Convert percentages to proportions if needed
        p1 = acceptable_quality_level / 100 if acceptable_quality_level > 1 else acceptable_quality_level
        p2 = rejectable_quality_level / 100 if rejectable_quality_level > 1 else rejectable_quality_level
        
        # Initial guesses for sample size (n) and acceptance number (c)
        n_guess = int(lot_size * 0.1)  # 10% of lot size as initial guess
        if n_guess < 10:
            n_guess = 10
        if n_guess > 100:
            n_guess = 100
            
        c_guess = max(int(n_guess * p1 * 2), 1)
        
        # Search for optimal n and c
        best_n = n_guess
        best_c = c_guess
        best_risk_diff = float('inf')
        
        # Search range for n and c
        n_range = range(max(5, n_guess // 2), min(n_guess * 2, lot_size) + 1)
        
        for n in n_range:
            # Calculate acceptance probability at p1 (AQL)
            pa_p1 = sum(stats.binom.pmf(i, n, p1) for i in range(n + 1))
            
            # Start with c at max(1, n*p1) and decrease to find optimal value
            for c in range(min(n, max(1, int(n * p1 * 2))), -1, -1):
                # Calculate producer's and consumer's actual risks
                producer_actual_risk = 1 - sum(stats.binom.pmf(i, n, p1) for i in range(c + 1))
                consumer_actual_risk = sum(stats.binom.pmf(i, n, p2) for i in range(c + 1))
                
                # Check if both risks are satisfied
                if producer_actual_risk <= producer_risk and consumer_actual_risk <= consumer_risk:
                    # Calculate the difference from target risks
                    risk_diff = abs(producer_actual_risk - producer_risk) + abs(consumer_actual_risk - consumer_risk)
                    
                    # Update best plan if this is better
                    if risk_diff < best_risk_diff:
                        best_risk_diff = risk_diff
                        best_n = n
                        best_c = c
        
        # If no plan satisfies both risks, find the closest compromise
        if best_risk_diff == float('inf'):
            best_risk_diff = float('inf')
            
            for n in n_range:
                for c in range(min(n, max(1, int(n * p1 * 2))), -1, -1):
                    # Calculate producer's and consumer's actual risks
                    producer_actual_risk = 1 - sum(stats.binom.pmf(i, n, p1) for i in range(c + 1))
                    consumer_actual_risk = sum(stats.binom.pmf(i, n, p2) for i in range(c + 1))
                    
                    # Calculate weighted risk difference
                    risk_diff = abs(producer_actual_risk - producer_risk) + abs(consumer_actual_risk - consumer_risk)
                    
                    # Update best plan if this is better
                    if risk_diff < best_risk_diff:
                        best_risk_diff = risk_diff
                        best_n = n
                        best_c = c
        
        # Calculate actual risks with the chosen plan
        producer_actual_risk = 1 - sum(stats.binom.pmf(i, best_n, p1) for i in range(best_c + 1))
        consumer_actual_risk = sum(stats.binom.pmf(i, best_n, p2) for i in range(best_c + 1))
        
        # Calculate OC curve points
        p_values = np.linspace(0, min(0.3, p2 * 2), 100)
        p_values, pa_values = calc_oc_curve_points(best_n, best_c, p_values)
        
        # Calculate Average Outgoing Quality (AOQ) curve
        aoq_values = p_values * pa_values * (lot_size - best_n) / lot_size
        
        # Calculate Average Outgoing Quality Limit (AOQL)
        aoql = np.max(aoq_values)
        aoql_p = p_values[np.argmax(aoq_values)]
        
        # Calculate Average Total Inspection (ATI)
        ati_values = best_n + (1 - pa_values) * (lot_size - best_n)
        
        # Calculate Average Sample Number (ASN) for single sampling
        asn_values = np.full_like(p_values, best_n)
        
        # Prepare results
        result = {
            'plan_type': 'single',
            'sample_size': best_n,
            'acceptance_number': best_c,
            'producer_risk': float(producer_actual_risk),
            'consumer_risk': float(consumer_actual_risk),
            'aql': float(p1),
            'ltpd': float(p2),
            'oc_curve': {
                'p_values': p_values.tolist(),
                'pa_values': pa_values.tolist()
            },
            'aoq_curve': {
                'p_values': p_values.tolist(),
                'aoq_values': aoq_values.tolist(),
                'aoql': float(aoql),
                'aoql_p': float(aoql_p)
            },
            'ati_curve': {
                'p_values': p_values.tolist(),
                'ati_values': ati_values.tolist()
            },
            'asn_curve': {
                'p_values': p_values.tolist(),
                'asn_values': asn_values.tolist()
            }
        }
        
        return result
    
    def calculate_double_sampling_plan(
        self,
        lot_size: int,
        acceptable_quality_level: float,
        rejectable_quality_level: float,
        producer_risk: float = 0.05,
        consumer_risk: float = 0.1
    ) -> Dict[str, Any]:
        """
        Calculate parameters for a double sampling plan.
        
        Args:
            lot_size: Size of the production lot
            acceptable_quality_level: Acceptable Quality Level (AQL)
            rejectable_quality_level: Lot Tolerance Percent Defective (LTPD)
            producer_risk: Producer's risk (alpha)
            consumer_risk: Consumer's risk (beta)
            
        Returns:
            Dictionary containing sampling plan parameters and OC curve data
        """
        # Convert percentages to proportions if needed
        p1 = acceptable_quality_level / 100 if acceptable_quality_level > 1 else acceptable_quality_level
        p2 = rejectable_quality_level / 100 if rejectable_quality_level > 1 else rejectable_quality_level
        
        # First, calculate comparable single sampling plan
        single_plan = self.calculate_single_sampling_plan(
            lot_size,
            acceptable_quality_level,
            rejectable_quality_level,
            producer_risk,
            consumer_risk
        )
        
        n1 = int(single_plan['sample_size'] * 0.6)  # 60% of single sample size for first sample
        n2 = n1  # Equal sample sizes for simplicity
        
        # Initial guesses for acceptance/rejection numbers
        c1 = max(int(n1 * p1), 0)  # First acceptance number
        r1 = c1 + 1  # First rejection number
        c2 = max(int((n1 + n2) * p1 * 1.2), c1 + 1)  # Second acceptance number
        
        # Search for optimal acceptance/rejection numbers
        best_c1 = c1
        best_r1 = r1
        best_c2 = c2
        best_risk_diff = float('inf')
        
        # Search grid for acceptance/rejection numbers
        for c1_try in range(max(0, c1 - 2), c1 + 3):
            for r1_try in range(c1_try + 1, c1_try + 5):
                for c2_try in range(max(r1_try - 1, c1_try), min(n1 + n2, r1_try + 10)):
                    # Calculate OC function for this plan
                    p_values = np.linspace(0, min(0.3, p2 * 2), 20)
                    pa_values = np.zeros_like(p_values)
                    
                    for i, p in enumerate(p_values):
                        # Probability of acceptance on first sample
                        pa_first = sum(stats.binom.pmf(x, n1, p) for x in range(c1_try + 1))
                        
                        # Probability of needing a second sample
                        p_second = sum(stats.binom.pmf(x, n1, p) for x in range(c1_try + 1, r1_try))
                        
                        # Probability of acceptance on second sample
                        pa_second = 0
                        for x1 in range(c1_try + 1, r1_try):
                            # Probability of exactly x1 defects in first sample
                            p_x1 = stats.binom.pmf(x1, n1, p)
                            
                            # Probability of acceptance on second sample given x1 in first
                            pa_given_x1 = sum(stats.binom.pmf(x2, n2, p) 
                                             for x2 in range(c2_try - x1 + 1))
                            
                            pa_second += p_x1 * pa_given_x1
                        
                        # Overall probability of acceptance
                        pa_values[i] = pa_first + pa_second
                    
                    # Calculate producer's and consumer's actual risks
                    producer_actual_risk = 1 - np.interp(p1, p_values, pa_values)
                    consumer_actual_risk = np.interp(p2, p_values, pa_values)
                    
                    # Calculate the difference from target risks
                    risk_diff = abs(producer_actual_risk - producer_risk) + abs(consumer_actual_risk - consumer_risk)
                    
                    # Update best plan if this is better
                    if risk_diff < best_risk_diff:
                        best_risk_diff = risk_diff
                        best_c1 = c1_try
                        best_r1 = r1_try
                        best_c2 = c2_try
        
        # Calculate final OC curve and associated metrics with chosen parameters
        p_values = np.linspace(0, min(0.3, p2 * 2), 100)
        pa_values = np.zeros_like(p_values)
        asn_values = np.zeros_like(p_values)
        
        for i, p in enumerate(p_values):
            # Probability of acceptance on first sample
            pa_first = sum(stats.binom.pmf(x, n1, p) for x in range(best_c1 + 1))
            
            # Probability of needing a second sample
            p_second = sum(stats.binom.pmf(x, n1, p) for x in range(best_c1 + 1, best_r1))
            
            # Probability of acceptance on second sample
            pa_second = 0
            for x1 in range(best_c1 + 1, best_r1):
                # Probability of exactly x1 defects in first sample
                p_x1 = stats.binom.pmf(x1, n1, p)
                
                # Probability of acceptance on second sample given x1 in first
                pa_given_x1 = sum(stats.binom.pmf(x2, n2, p) 
                                 for x2 in range(best_c2 - x1 + 1))
                
                pa_second += p_x1 * pa_given_x1
            
            # Overall probability of acceptance
            pa_values[i] = pa_first + pa_second
            
            # Average Sample Number (ASN)
            asn_values[i] = n1 + n2 * p_second
        
        # Calculate Average Outgoing Quality (AOQ) curve
        aoq_values = p_values * pa_values * (lot_size - (n1 + n2 * (1 - pa_first) / (pa_first + pa_second))) / lot_size
        
        # Calculate Average Outgoing Quality Limit (AOQL)
        aoql = np.max(aoq_values)
        aoql_p = p_values[np.argmax(aoq_values)]
        
        # Calculate Average Total Inspection (ATI)
        ati_values = n1 + p_second * n2 + (1 - pa_values) * (lot_size - n1 - p_second * n2)
        
        # Calculate actual risks with the chosen plan
        producer_actual_risk = 1 - np.interp(p1, p_values, pa_values)
        consumer_actual_risk = np.interp(p2, p_values, pa_values)
        
        # Prepare results
        result = {
            'plan_type': 'double',
            'first_sample_size': n1,
            'second_sample_size': n2,
            'first_acceptance_number': best_c1,
            'first_rejection_number': best_r1,
            'second_acceptance_number': best_c2,
            'producer_risk': float(producer_actual_risk),
            'consumer_risk': float(consumer_actual_risk),
            'aql': float(p1),
            'ltpd': float(p2),
            'oc_curve': {
                'p_values': p_values.tolist(),
                'pa_values': pa_values.tolist()
            },
            'aoq_curve': {
                'p_values': p_values.tolist(),
                'aoq_values': aoq_values.tolist(),
                'aoql': float(aoql),
                'aoql_p': float(aoql_p)
            },
            'ati_curve': {
                'p_values': p_values.tolist(),
                'ati_values': ati_values.tolist()
            },
            'asn_curve': {
                'p_values': p_values.tolist(),
                'asn_values': asn_values.tolist()
            }
        }
        
        return result
    
    def lookup_ansi_z14_plan(
        self,
        lot_size: int,
        inspection_level: str = 'II',
        aql: float = 1.0
    ) -> Dict[str, Any]:
        """
        Look up sampling plan from ANSI/ASQ Z1.4 tables.
        
        Args:
            lot_size: Size of the production lot
            inspection_level: Inspection level (I, II, III)
            aql: Acceptable Quality Level in percent
            
        Returns:
            Dictionary containing sampling plan parameters
        """
        # Sample size code letters based on lot size and inspection level
        lot_size_ranges = [
            (2, 8), (9, 15), (16, 25), (26, 50), (51, 90), (91, 150),
            (151, 280), (281, 500), (501, 1200), (1201, 3200), (3201, 10000),
            (10001, 35000), (35001, 150000), (150001, 500000), (500001, float('inf'))
        ]
        
        code_letters = {
            'I': ['A', 'A', 'B', 'C', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N'],
            'II': ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q'],
            'III': ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R']
        }
        
        # Sample sizes for each code letter
        sample_sizes = {
            'A': 2, 'B': 3, 'C': 5, 'D': 8, 'E': 13,
            'F': 20, 'G': 32, 'H': 50, 'J': 80, 'K': 125,
            'L': 200, 'M': 315, 'N': 500, 'P': 800, 'Q': 1250,
            'R': 2000, 'S': 3150, 'T': 5000
        }
        
        # Acceptable and rejection numbers for normal inspection at given AQL
        # Format: {AQL: {code_letter: (acceptance_number, rejection_number)}}
        acceptance_numbers = {
            0.1: {'J': (0, 1), 'K': (0, 1), 'L': (0, 1), 'M': (1, 2), 'N': (1, 2),
                  'P': (2, 3), 'Q': (3, 4), 'R': (5, 6), 'S': (7, 8), 'T': (10, 11)},
            0.25: {'G': (0, 1), 'H': (0, 1), 'J': (0, 1), 'K': (1, 2), 'L': (1, 2),
                   'M': (2, 3), 'N': (3, 4), 'P': (5, 6), 'Q': (7, 8), 'R': (10, 11),
                   'S': (14, 15), 'T': (21, 22)},
            0.4: {'F': (0, 1), 'G': (0, 1), 'H': (0, 1), 'J': (1, 2), 'K': (1, 2),
                  'L': (2, 3), 'M': (3, 4), 'N': (5, 6), 'P': (7, 8), 'Q': (10, 11),
                  'R': (14, 15), 'S': (21, 22), 'T': (21, 22)},
            0.65: {'E': (0, 1), 'F': (0, 1), 'G': (0, 1), 'H': (1, 2), 'J': (1, 2),
                   'K': (2, 3), 'L': (3, 4), 'M': (5, 6), 'N': (7, 8), 'P': (10, 11),
                   'Q': (14, 15), 'R': (21, 22), 'S': (21, 22), 'T': (21, 22)},
            1.0: {'D': (0, 1), 'E': (0, 1), 'F': (0, 1), 'G': (1, 2), 'H': (1, 2),
                  'J': (2, 3), 'K': (3, 4), 'L': (5, 6), 'M': (7, 8), 'N': (10, 11),
                  'P': (14, 15), 'Q': (21, 22), 'R': (21, 22), 'S': (21, 22), 'T': (21, 22)},
            1.5: {'C': (0, 1), 'D': (0, 1), 'E': (0, 1), 'F': (1, 2), 'G': (1, 2),
                  'H': (2, 3), 'J': (3, 4), 'K': (5, 6), 'L': (7, 8), 'M': (10, 11),
                  'N': (14, 15), 'P': (21, 22), 'Q': (21, 22), 'R': (21, 22), 'S': (21, 22), 'T': (21, 22)},
            2.5: {'B': (0, 1), 'C': (0, 1), 'D': (0, 1), 'E': (1, 2), 'F': (1, 2),
                  'G': (2, 3), 'H': (3, 4), 'J': (5, 6), 'K': (7, 8), 'L': (10, 11),
                  'M': (14, 15), 'N': (21, 22), 'P': (21, 22), 'Q': (21, 22), 'R': (21, 22),
                  'S': (21, 22), 'T': (21, 22)},
            4.0: {'A': (0, 1), 'B': (0, 1), 'C': (0, 1), 'D': (1, 2), 'E': (1, 2),
                  'F': (2, 3), 'G': (3, 4), 'H': (5, 6), 'J': (7, 8), 'K': (10, 11),
                  'L': (14, 15), 'M': (21, 22), 'N': (21, 22), 'P': (21, 22), 'Q': (21, 22),
                  'R': (21, 22), 'S': (21, 22), 'T': (21, 22)}
        }
        
        # Find the appropriate lot size range
        lot_size_index = None
        for i, (min_size, max_size) in enumerate(lot_size_ranges):
            if min_size <= lot_size <= max_size:
                lot_size_index = i
                break
        
        if lot_size_index is None:
            raise ValueError(f"Invalid lot size: {lot_size}")
        
        # Get code letter based on lot size and inspection level
        if inspection_level not in code_letters:
            raise ValueError(f"Invalid inspection level: {inspection_level}")
        
        code_letter = code_letters[inspection_level][lot_size_index]
        
        # Find the closest AQL value
        aql_values = list(acceptance_numbers.keys())
        closest_aql = min(aql_values, key=lambda x: abs(x - aql))
        
        # Get sample size and acceptance/rejection numbers
        sample_size = sample_sizes[code_letter]
        
        # Check if the code letter exists for the AQL
        if code_letter not in acceptance_numbers[closest_aql]:
            # Find the next available code letter
            available_letters = list(acceptance_numbers[closest_aql].keys())
            for letter in sample_sizes:
                if letter in available_letters and sample_sizes[letter] >= sample_size:
                    code_letter = letter
                    sample_size = sample_sizes[code_letter]
                    break
        
        # Get acceptance and rejection numbers
        acceptance_number, rejection_number = acceptance_numbers[closest_aql].get(
            code_letter, (0, 1))  # Default if not found
        
        # Create OC curve
        p_values = np.linspace(0, 0.1, 100)
        p_values, pa_values = calc_oc_curve_points(sample_size, acceptance_number, p_values)
        
        return {
            'plan_type': 'ANSI_Z14',
            'lot_size': lot_size,
            'inspection_level': inspection_level,
            'aql': float(closest_aql),
            'code_letter': code_letter,
            'sample_size': sample_size,
            'acceptance_number': acceptance_number,
            'rejection_number': rejection_number,
            'oc_curve': {
                'p_values': p_values.tolist(),
                'pa_values': pa_values.tolist()
            }
        }
    
    def calculate_skip_lot_plan(
        self,
        base_plan: Dict[str, Any],
        frequency_index: int = 2
    ) -> Dict[str, Any]:
        """
        Calculate a skip-lot sampling plan based on a base plan.
        
        Args:
            base_plan: Base sampling plan (single or ANSI)
            frequency_index: Frequency index (f) for skip-lot sampling
            
        Returns:
            Dictionary containing skip-lot plan parameters
        """
        # Extract parameters from base plan
        plan_type = base_plan.get('plan_type')
        
        if plan_type == 'single':
            sample_size = base_plan.get('sample_size')
            acceptance_number = base_plan.get('acceptance_number')
        elif plan_type == 'ANSI_Z14':
            sample_size = base_plan.get('sample_size')
            acceptance_number = base_plan.get('acceptance_number')
        else:
            raise ValueError(f"Unsupported base plan type: {plan_type}")
        
        # Calculate skip-lot parameters
        inspection_fraction = 1 / frequency_index
        
        # Calculate OC curve for skip-lot plan
        p_values = np.linspace(0, 0.1, 100)
        base_pa_values = np.zeros_like(p_values)
        
        for i, p in enumerate(p_values):
            base_pa = 0
            for r in range(acceptance_number + 1):
                base_pa += stats.binom.pmf(r, sample_size, p)
            base_pa_values[i] = base_pa
        
        # Calculate effective OC curve for skip-lot plan
        pa_values = inspection_fraction * base_pa_values + (1 - inspection_fraction)
        
        # Calculate AOQ curve
        aoq_values = p_values * pa_values
        aoql = np.max(aoq_values)
        aoql_p = p_values[np.argmax(aoq_values)]
        
        # Calculate effective ASN
        asn_values = sample_size * inspection_fraction * np.ones_like(p_values)
        
        # Create result
        result = {
            'plan_type': 'skip_lot',
            'base_plan': base_plan,
            'frequency_index': frequency_index,
            'inspection_fraction': float(inspection_fraction),
            'effective_sample_size': float(sample_size * inspection_fraction),
            'oc_curve': {
                'p_values': p_values.tolist(),
                'pa_values': pa_values.tolist()
            },
            'aoq_curve': {
                'p_values': p_values.tolist(),
                'aoq_values': aoq_values.tolist(),
                'aoql': float(aoql),
                'aoql_p': float(aoql_p)
            },
            'asn_curve': {
                'p_values': p_values.tolist(),
                'asn_values': asn_values.tolist()
            }
        }
        
        return result
    
    def calculate_continuous_sampling_plan(
        self,
        clearing_interval: int,
        sampling_fraction: float,
        acceptance_number: int = 0
    ) -> Dict[str, Any]:
        """
        Calculate a continuous sampling plan (CSP-1).
        
        Args:
            clearing_interval: Number of consecutive items that must be defect-free (i)
            sampling_fraction: Fraction of items inspected during sampling (f)
            acceptance_number: Number of defects allowed during sampling (typically 0)
            
        Returns:
            Dictionary containing CSP parameters and performance metrics
        """
        # Validate inputs
        if clearing_interval < 1:
            raise ValueError("Clearing interval must be at least 1")
        if not 0 < sampling_fraction <= 1:
            raise ValueError("Sampling fraction must be between 0 and 1")
        if acceptance_number < 0:
            raise ValueError("Acceptance number must be non-negative")
        
        # Calculate Average Fraction Inspected (AFI) for various values of p
        p_values = np.linspace(0, 0.1, 100)
        afi_values = np.zeros_like(p_values)
        aql_value = np.zeros_like(p_values)
        
        for i, p in enumerate(p_values):
            # Probability of passing clearing interval
            p_i = (1 - p) ** clearing_interval
            
            # Probability of finding a defect during sampling
            p_d = 1 - (1 - p) ** (1 / sampling_fraction)
            
            # Calculate AFI using formula from Dodge-Romig
            if p > 0:
                afi_values[i] = sampling_fraction / (1 + (1 - sampling_fraction) * p_i / (1 - p_i))
            else:
                afi_values[i] = sampling_fraction
            
            # Calculate AOQ (Average Outgoing Quality)
            # AOQ = p * (1 - AFI)
            aql_value[i] = p_values[i] * (1 - afi_values[i])
        
        # Find AOQL (Average Outgoing Quality Limit)
        aoql = np.max(aql_value)
        aoql_p = p_values[np.argmax(aql_value)]
        
        # Create result
        result = {
            'plan_type': 'continuous',
            'clearing_interval': clearing_interval,
            'sampling_fraction': float(sampling_fraction),
            'acceptance_number': acceptance_number,
            'afi_curve': {
                'p_values': p_values.tolist(),
                'afi_values': afi_values.tolist()
            },
            'aoq_curve': {
                'p_values': p_values.tolist(),
                'aoq_values': aql_value.tolist(),
                'aoql': float(aoql),
                'aoql_p': float(aoql_p)
            }
        }
        
        return result
    
    def compare_sampling_plans(
        self,
        plan_list: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Compare multiple sampling plans.
        
        Args:
            plan_list: List of sampling plan dictionaries
            
        Returns:
            Dictionary with comparison metrics
        """
        if not plan_list:
            raise ValueError("Plan list cannot be empty")
        
        # Initialize arrays for comparison
        p_values = np.linspace(0, 0.1, 100)
        pa_curves = []
        asn_curves = []
        aoq_curves = []
        
        plan_names = []
        plan_details = []
        
        # Extract data from each plan
        for i, plan in enumerate(plan_list):
            plan_type = plan.get('plan_type')
            plan_names.append(f"Plan {i+1}: {plan_type}")
            
            # Add plan details
            if plan_type == 'single':
                plan_details.append({
                    'type': 'Single',
                    'n': plan.get('sample_size'),
                    'c': plan.get('acceptance_number')
                })
            elif plan_type == 'double':
                plan_details.append({
                    'type': 'Double',
                    'n1': plan.get('first_sample_size'),
                    'c1': plan.get('first_acceptance_number'),
                    'r1': plan.get('first_rejection_number'),
                    'n2': plan.get('second_sample_size'),
                    'c2': plan.get('second_acceptance_number')
                })
            elif plan_type == 'ANSI_Z14':
                plan_details.append({
                    'type': 'ANSI Z1.4',
                    'aql': plan.get('aql'),
                    'level': plan.get('inspection_level'),
                    'n': plan.get('sample_size'),
                    'c': plan.get('acceptance_number')
                })
            elif plan_type == 'skip_lot':
                base_plan = plan.get('base_plan')
                plan_details.append({
                    'type': 'Skip-Lot',
                    'f': plan.get('frequency_index'),
                    'base': f"{base_plan.get('plan_type')} (n={base_plan.get('sample_size')}, c={base_plan.get('acceptance_number')})"
                })
            elif plan_type == 'continuous':
                plan_details.append({
                    'type': 'CSP-1',
                    'i': plan.get('clearing_interval'),
                    'f': plan.get('sampling_fraction')
                })
            
            # Extract OC curve
            if 'oc_curve' in plan:
                plan_p_values = np.array(plan['oc_curve']['p_values'])
                plan_pa_values = np.array(plan['oc_curve']['pa_values'])
                
                # Interpolate to common p_values if needed
                if len(plan_p_values) != len(p_values) or not np.array_equal(plan_p_values, p_values):
                    pa_values = np.interp(p_values, plan_p_values, plan_pa_values)
                else:
                    pa_values = plan_pa_values
                
                pa_curves.append(pa_values)
            else:
                # Create dummy OC curve
                pa_curves.append(np.zeros_like(p_values))
            
            # Extract ASN curve
            if 'asn_curve' in plan:
                plan_p_values = np.array(plan['asn_curve']['p_values'])
                plan_asn_values = np.array(plan['asn_curve']['asn_values'])
                
                # Interpolate to common p_values if needed
                if len(plan_p_values) != len(p_values) or not np.array_equal(plan_p_values, p_values):
                    asn_values = np.interp(p_values, plan_p_values, plan_asn_values)
                else:
                    asn_values = plan_asn_values
                
                asn_curves.append(asn_values)
            else:
                # Create dummy ASN curve
                asn_curves.append(np.zeros_like(p_values))
            
            # Extract AOQ curve
            if 'aoq_curve' in plan:
                plan_p_values = np.array(plan['aoq_curve']['p_values'])
                plan_aoq_values = np.array(plan['aoq_curve']['aoq_values'])
                
                # Interpolate to common p_values if needed
                if len(plan_p_values) != len(p_values) or not np.array_equal(plan_p_values, p_values):
                    aoq_values = np.interp(p_values, plan_p_values, plan_aoq_values)
                else:
                    aoq_values = plan_aoq_values
                
                aoq_curves.append(aoq_values)
            else:
                # Create dummy AOQ curve
                aoq_curves.append(np.zeros_like(p_values))
        
        # Create comparison result
        comparison = {
            'p_values': p_values.tolist(),
            'plan_names': plan_names,
            'plan_details': plan_details,
            'oc_curves': [curve.tolist() for curve in pa_curves],
            'asn_curves': [curve.tolist() for curve in asn_curves],
            'aoq_curves': [curve.tolist() for curve in aoq_curves]
        }
        
        return comparison