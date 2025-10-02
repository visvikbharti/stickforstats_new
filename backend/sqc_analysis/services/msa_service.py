"""
Measurement System Analysis (MSA) Service for Statistical Quality Control (SQC) Analysis.

This module provides services for analyzing measurement systems, including Gauge R&R,
attribute agreement analysis, and measurement system capability assessment.
Adapted from the original Streamlit implementation to work with Django/React architecture.
"""

import numpy as np
import pandas as pd
import scipy.stats as stats
from typing import Dict, List, Optional, Tuple, Union, Any
import math

class MSAService:
    """
    Service for Measurement System Analysis (MSA).
    """
    
    def __init__(self):
        """Initialize the MSA service."""
        pass
    
    def calculate_gauge_rr_anova(
        self,
        data: Union[pd.DataFrame, List[Dict[str, Any]]],
        parts_col: str = "Part",
        operators_col: str = "Operator",
        measurements_col: str = "Measurement"
    ) -> Dict[str, Any]:
        """
        Calculate Gauge R&R using ANOVA method.
        
        Args:
            data: DataFrame or list of dictionaries with measurement data
            parts_col: Column name for part identification
            operators_col: Column name for operator identification
            measurements_col: Column name for measurement values
            
        Returns:
            Dictionary with Gauge R&R results
        """
        # Convert to DataFrame if list of dictionaries
        if isinstance(data, list):
            df = pd.DataFrame(data)
        else:
            df = data.copy()
        
        # Ensure data is in the correct format
        if parts_col not in df.columns:
            raise ValueError(f"Column '{parts_col}' not found in data")
        if operators_col not in df.columns:
            raise ValueError(f"Column '{operators_col}' not found in data")
        if measurements_col not in df.columns:
            raise ValueError(f"Column '{measurements_col}' not found in data")
        
        # Extract basic information
        parts = df[parts_col].unique()
        operators = df[operators_col].unique()
        
        # Count number of parts, operators, and measurements per part-operator combination
        n_parts = len(parts)
        n_operators = len(operators)
        measurements_per_combination = df.groupby([parts_col, operators_col]).size().reset_index(name='count')
        n_trials = measurements_per_combination['count'].iloc[0]  # Assume balanced design
        
        # Check for balanced design
        if not all(measurements_per_combination['count'] == n_trials):
            raise ValueError("Unbalanced design detected. All part-operator combinations must have the same number of measurements.")
        
        # Calculate means
        overall_mean = df[measurements_col].mean()
        part_means = df.groupby(parts_col)[measurements_col].mean()
        operator_means = df.groupby(operators_col)[measurements_col].mean()
        
        # Create part-operator means for interaction
        df['part_operator'] = df[parts_col].astype(str) + "_" + df[operators_col].astype(str)
        part_operator_means = df.groupby('part_operator')[measurements_col].mean()
        
        # Calculate sums of squares
        SS_total = ((df[measurements_col] - overall_mean) ** 2).sum()
        SS_parts = n_operators * n_trials * ((part_means - overall_mean) ** 2).sum()
        SS_operators = n_parts * n_trials * ((operator_means - overall_mean) ** 2).sum()
        
        # Calculate part-operator interaction sum of squares
        SS_interaction = 0
        for part in parts:
            for operator in operators:
                subset = df[(df[parts_col] == part) & (df[operators_col] == operator)]
                part_op_mean = subset[measurements_col].mean()
                part_mean = part_means[part]
                op_mean = operator_means[operator]
                interaction_effect = part_op_mean - part_mean - op_mean + overall_mean
                SS_interaction += n_trials * (interaction_effect ** 2)
        
        # Calculate error (repeatability) sum of squares
        SS_error = SS_total - SS_parts - SS_operators - SS_interaction
        
        # Calculate degrees of freedom
        df_parts = n_parts - 1
        df_operators = n_operators - 1
        df_interaction = df_parts * df_operators
        df_error = n_parts * n_operators * (n_trials - 1)
        df_total = n_parts * n_operators * n_trials - 1
        
        # Calculate mean squares
        MS_parts = SS_parts / df_parts if df_parts > 0 else 0
        MS_operators = SS_operators / df_operators if df_operators > 0 else 0
        MS_interaction = SS_interaction / df_interaction if df_interaction > 0 else 0
        MS_error = SS_error / df_error if df_error > 0 else 0
        
        # Calculate F-statistics and p-values
        F_parts = MS_parts / MS_interaction if MS_interaction > 0 else 0
        F_operators = MS_operators / MS_interaction if MS_interaction > 0 else 0
        F_interaction = MS_interaction / MS_error if MS_error > 0 else 0
        
        p_parts = 1 - stats.f.cdf(F_parts, df_parts, df_interaction) if F_parts > 0 else 1
        p_operators = 1 - stats.f.cdf(F_operators, df_operators, df_interaction) if F_operators > 0 else 1
        p_interaction = 1 - stats.f.cdf(F_interaction, df_interaction, df_error) if F_interaction > 0 else 1
        
        # Calculate variance components
        # Repeatability (Equipment Variation)
        var_error = MS_error
        
        # Reproducibility (Operator Variation)
        var_operators = max(0, (MS_operators - MS_interaction) / (n_parts * n_trials))
        
        # Interaction (Operator by Part Interaction)
        var_interaction = max(0, (MS_interaction - MS_error) / n_trials)
        
        # Part variation
        var_parts = max(0, (MS_parts - MS_interaction) / (n_operators * n_trials))
        
        # Total Gauge R&R
        var_gauge_rr = var_error + var_operators + var_interaction
        
        # Total variation
        var_total = var_parts + var_gauge_rr
        
        # Calculate standard deviations
        std_error = math.sqrt(var_error)
        std_operators = math.sqrt(var_operators)
        std_interaction = math.sqrt(var_interaction)
        std_gauge_rr = math.sqrt(var_gauge_rr)
        std_parts = math.sqrt(var_parts)
        std_total = math.sqrt(var_total)
        
        # Calculate study variation (6 standard deviations)
        sv_error = 6 * std_error
        sv_operators = 6 * std_operators
        sv_interaction = 6 * std_interaction
        sv_gauge_rr = 6 * std_gauge_rr
        sv_parts = 6 * std_parts
        sv_total = 6 * std_total
        
        # Calculate % of study variation
        psv_error = 100 * sv_error / sv_total
        psv_operators = 100 * sv_operators / sv_total
        psv_interaction = 100 * sv_interaction / sv_total
        psv_gauge_rr = 100 * sv_gauge_rr / sv_total
        psv_parts = 100 * sv_parts / sv_total
        
        # Calculate % of tolerance
        tolerance = df[measurements_col].max() - df[measurements_col].min()  # Use data range as tolerance if not provided
        ptol_error = 100 * sv_error / tolerance
        ptol_operators = 100 * sv_operators / tolerance
        ptol_interaction = 100 * sv_interaction / tolerance
        ptol_gauge_rr = 100 * sv_gauge_rr / tolerance
        
        # Calculate number of distinct categories
        ndc = 1.41 * (sv_parts / sv_gauge_rr) if sv_gauge_rr > 0 else float('inf')
        
        # Create ANOVA table
        anova_table = {
            'Source': ['Part', 'Operator', 'Part*Operator', 'Repeatability', 'Total'],
            'DoF': [df_parts, df_operators, df_interaction, df_error, df_total],
            'SS': [float(SS_parts), float(SS_operators), float(SS_interaction), float(SS_error), float(SS_total)],
            'MS': [float(MS_parts), float(MS_operators), float(MS_interaction), float(MS_error), None],
            'F': [float(F_parts), float(F_operators), float(F_interaction), None, None],
            'P': [float(p_parts), float(p_operators), float(p_interaction), None, None]
        }
        
        # Create variance components table
        variance_table = {
            'Source': ['Repeatability', 'Reproducibility', 'Operator', 'Operator*Part', 'Gauge R&R', 'Part', 'Total'],
            'Variance': [
                float(var_error), 
                float(var_operators + var_interaction),
                float(var_operators),
                float(var_interaction),
                float(var_gauge_rr),
                float(var_parts),
                float(var_total)
            ],
            'StdDev': [
                float(std_error),
                float(math.sqrt(var_operators + var_interaction)),
                float(std_operators),
                float(std_interaction),
                float(std_gauge_rr),
                float(std_parts),
                float(std_total)
            ],
            'StudyVar': [
                float(sv_error),
                float(6 * math.sqrt(var_operators + var_interaction)),
                float(sv_operators),
                float(sv_interaction),
                float(sv_gauge_rr),
                float(sv_parts),
                float(sv_total)
            ],
            '%StudyVar': [
                float(psv_error),
                float(100 * 6 * math.sqrt(var_operators + var_interaction) / sv_total),
                float(psv_operators),
                float(psv_interaction),
                float(psv_gauge_rr),
                float(psv_parts),
                100.0
            ],
            '%Tolerance': [
                float(ptol_error),
                float(100 * 6 * math.sqrt(var_operators + var_interaction) / tolerance),
                float(ptol_operators),
                float(ptol_interaction),
                float(ptol_gauge_rr),
                None,
                None
            ]
        }
        
        # Prepare summary metrics
        summary = {
            'Number of Parts': n_parts,
            'Number of Operators': n_operators,
            'Number of Replicates': n_trials,
            'Total Number of Measurements': n_parts * n_operators * n_trials,
            'Overall Mean': float(overall_mean),
            'StdDev (Total)': float(std_total),
            'StdDev (Repeatability)': float(std_error),
            'StdDev (Reproducibility)': float(math.sqrt(var_operators + var_interaction)),
            'StdDev (Gauge R&R)': float(std_gauge_rr),
            'StdDev (Part Variation)': float(std_parts),
            '%StudyVar (Gauge R&R)': float(psv_gauge_rr),
            '%Tolerance (Gauge R&R)': float(ptol_gauge_rr),
            'Number of Distinct Categories': float(ndc),
            'Acceptance Criteria': {
                'NDC': 'Good: ≥5, Acceptable: ≥2, Poor: <2',
                '%StudyVar': 'Good: <10%, Acceptable: <30%, Poor: >30%',
                '%Tolerance': 'Good: <10%, Acceptable: <30%, Poor: >30%'
            }
        }
        
        # Create assessment based on common criteria
        assessment = {}
        
        if ndc >= 5:
            assessment['ndc'] = 'Good'
        elif ndc >= 2:
            assessment['ndc'] = 'Acceptable'
        else:
            assessment['ndc'] = 'Poor'
            
        if psv_gauge_rr < 10:
            assessment['psv'] = 'Good'
        elif psv_gauge_rr < 30:
            assessment['psv'] = 'Acceptable'
        else:
            assessment['psv'] = 'Poor'
            
        if ptol_gauge_rr < 10:
            assessment['ptol'] = 'Good'
        elif ptol_gauge_rr < 30:
            assessment['ptol'] = 'Acceptable'
        else:
            assessment['ptol'] = 'Poor'
        
        # Combine all results
        result = {
            'summary': summary,
            'assessment': assessment,
            'anova_table': anova_table,
            'variance_table': variance_table,
            'part_means': part_means.to_dict(),
            'operator_means': operator_means.to_dict()
        }
        
        return result
    
    def calculate_gauge_rr_range(
        self,
        data: Union[pd.DataFrame, List[Dict[str, Any]]],
        parts_col: str = "Part",
        operators_col: str = "Operator",
        measurements_col: str = "Measurement"
    ) -> Dict[str, Any]:
        """
        Calculate Gauge R&R using the Range method.
        
        Args:
            data: DataFrame or list of dictionaries with measurement data
            parts_col: Column name for part identification
            operators_col: Column name for operator identification
            measurements_col: Column name for measurement values
            
        Returns:
            Dictionary with Gauge R&R results
        """
        # Convert to DataFrame if list of dictionaries
        if isinstance(data, list):
            df = pd.DataFrame(data)
        else:
            df = data.copy()
        
        # Ensure data is in the correct format
        if parts_col not in df.columns:
            raise ValueError(f"Column '{parts_col}' not found in data")
        if operators_col not in df.columns:
            raise ValueError(f"Column '{operators_col}' not found in data")
        if measurements_col not in df.columns:
            raise ValueError(f"Column '{measurements_col}' not found in data")
        
        # Extract basic information
        parts = df[parts_col].unique()
        operators = df[operators_col].unique()
        
        # Count number of parts, operators, and measurements per part-operator combination
        n_parts = len(parts)
        n_operators = len(operators)
        measurements_per_combination = df.groupby([parts_col, operators_col]).size().reset_index(name='count')
        n_trials = measurements_per_combination['count'].iloc[0]  # Assume balanced design
        
        # Check for balanced design
        if not all(measurements_per_combination['count'] == n_trials):
            raise ValueError("Unbalanced design detected. All part-operator combinations must have the same number of measurements.")
        
        # Control chart constants for various n (number of trials)
        d2_constants = {2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326, 6: 2.534, 7: 2.704, 8: 2.847, 9: 2.970, 10: 3.078}
        d2 = d2_constants.get(n_trials, 1)  # Default to 1 if n not in constants
        
        # Calculate means
        overall_mean = df[measurements_col].mean()
        
        # Calculate ranges for each part-operator combination
        ranges = df.groupby([parts_col, operators_col])[measurements_col].max() - df.groupby([parts_col, operators_col])[measurements_col].min()
        r_bar = ranges.mean()  # Average range
        
        # Calculate average measurement for each part
        part_means = df.groupby(parts_col)[measurements_col].mean()
        r_part = part_means.max() - part_means.min()  # Range of part averages
        
        # Calculate repeatability (equipment variation)
        ev = r_bar / d2
        
        # Calculate reproducibility (operator variation)
        operator_means = df.groupby(operators_col)[measurements_col].mean()
        r_operator = operator_means.max() - operator_means.min()  # Range of operator averages
        
        # Constant for number of operators
        k2_constants = {2: 0.7071, 3: 0.5231, 4: 0.4467, 5: 0.4030, 6: 0.3742, 7: 0.3534, 8: 0.3375, 9: 0.3249, 10: 0.3146}
        k2 = k2_constants.get(n_operators, 0.3)  # Default if n not in constants
        
        av_raw = k2 * r_operator
        av = math.sqrt(max(0, av_raw**2 - (ev**2 / (n_parts * n_trials))))  # Adjusted for EV
        
        # Calculate gauge R&R
        grr = math.sqrt(ev**2 + av**2)
        
        # Calculate part variation
        d2_parts = d2_constants.get(n_parts, 1)  # Use d2 for number of parts
        pv = r_part / d2_parts
        
        # Calculate total variation
        tv = math.sqrt(grr**2 + pv**2)
        
        # Calculate study variation (6 standard deviations)
        sv_ev = 6 * ev
        sv_av = 6 * av
        sv_grr = 6 * grr
        sv_pv = 6 * pv
        sv_tv = 6 * tv
        
        # Calculate % of study variation
        psv_ev = 100 * sv_ev / sv_tv
        psv_av = 100 * sv_av / sv_tv
        psv_grr = 100 * sv_grr / sv_tv
        psv_pv = 100 * sv_pv / sv_tv
        
        # Calculate % of tolerance
        tolerance = df[measurements_col].max() - df[measurements_col].min()  # Use data range as tolerance if not provided
        ptol_ev = 100 * sv_ev / tolerance
        ptol_av = 100 * sv_av / tolerance
        ptol_grr = 100 * sv_grr / tolerance
        
        # Calculate number of distinct categories
        ndc = 1.41 * (sv_pv / sv_grr) if sv_grr > 0 else float('inf')
        
        # Create variance components table
        variance_table = {
            'Source': ['Repeatability (EV)', 'Reproducibility (AV)', 'Gauge R&R', 'Part Variation (PV)', 'Total Variation'],
            'StdDev': [
                float(ev),
                float(av),
                float(grr),
                float(pv),
                float(tv)
            ],
            'StudyVar': [
                float(sv_ev),
                float(sv_av),
                float(sv_grr),
                float(sv_pv),
                float(sv_tv)
            ],
            '%StudyVar': [
                float(psv_ev),
                float(psv_av),
                float(psv_grr),
                float(psv_pv),
                100.0
            ],
            '%Tolerance': [
                float(ptol_ev),
                float(ptol_av),
                float(ptol_grr),
                None,
                None
            ]
        }
        
        # Prepare summary metrics
        summary = {
            'Number of Parts': n_parts,
            'Number of Operators': n_operators,
            'Number of Replicates': n_trials,
            'Total Number of Measurements': n_parts * n_operators * n_trials,
            'Overall Mean': float(overall_mean),
            'Average Range': float(r_bar),
            'Range of Part Averages': float(r_part),
            'Range of Operator Averages': float(r_operator),
            'StdDev (Total)': float(tv),
            'StdDev (Repeatability)': float(ev),
            'StdDev (Reproducibility)': float(av),
            'StdDev (Gauge R&R)': float(grr),
            'StdDev (Part Variation)': float(pv),
            '%StudyVar (Gauge R&R)': float(psv_grr),
            '%Tolerance (Gauge R&R)': float(ptol_grr),
            'Number of Distinct Categories': float(ndc),
            'Acceptance Criteria': {
                'NDC': 'Good: ≥5, Acceptable: ≥2, Poor: <2',
                '%StudyVar': 'Good: <10%, Acceptable: <30%, Poor: >30%',
                '%Tolerance': 'Good: <10%, Acceptable: <30%, Poor: >30%'
            }
        }
        
        # Create assessment based on common criteria
        assessment = {}
        
        if ndc >= 5:
            assessment['ndc'] = 'Good'
        elif ndc >= 2:
            assessment['ndc'] = 'Acceptable'
        else:
            assessment['ndc'] = 'Poor'
            
        if psv_grr < 10:
            assessment['psv'] = 'Good'
        elif psv_grr < 30:
            assessment['psv'] = 'Acceptable'
        else:
            assessment['psv'] = 'Poor'
            
        if ptol_grr < 10:
            assessment['ptol'] = 'Good'
        elif ptol_grr < 30:
            assessment['ptol'] = 'Acceptable'
        else:
            assessment['ptol'] = 'Poor'
        
        # Combine all results
        result = {
            'method': 'Range',
            'summary': summary,
            'assessment': assessment,
            'variance_table': variance_table,
            'part_means': part_means.to_dict(),
            'operator_means': operator_means.to_dict(),
            'ranges': ranges.to_dict()
        }
        
        return result
    
    def attribute_agreement_analysis(
        self,
        data: Union[pd.DataFrame, List[Dict[str, Any]]],
        parts_col: str = "Part",
        operators_col: str = "Operator",
        assessment_col: str = "Assessment",
        reference_col: str = "Reference"
    ) -> Dict[str, Any]:
        """
        Perform Attribute Agreement Analysis.
        
        Args:
            data: DataFrame or list of dictionaries with attribute data
            parts_col: Column name for part identification
            operators_col: Column name for operator identification
            assessment_col: Column name for operator assessments
            reference_col: Column name for reference (standard) values
            
        Returns:
            Dictionary with attribute agreement analysis results
        """
        # Convert to DataFrame if list of dictionaries
        if isinstance(data, list):
            df = pd.DataFrame(data)
        else:
            df = data.copy()
        
        # Ensure data is in the correct format
        if parts_col not in df.columns:
            raise ValueError(f"Column '{parts_col}' not found in data")
        if operators_col not in df.columns:
            raise ValueError(f"Column '{operators_col}' not found in data")
        if assessment_col not in df.columns:
            raise ValueError(f"Column '{assessment_col}' not found in data")
        
        # Extract basic information
        parts = df[parts_col].unique()
        operators = df[operators_col].unique()
        
        # Determine if reference standard is provided
        has_reference = reference_col in df.columns
        
        # Count number of parts and operators
        n_parts = len(parts)
        n_operators = len(operators)
        
        # Get possible assessment values (categories)
        categories = df[assessment_col].unique()
        n_categories = len(categories)
        
        # Calculate within-operator agreement (repeatability)
        repeatability_results = {}
        
        # Check if there are repeated measurements
        trials_per_part_operator = df.groupby([parts_col, operators_col]).size()
        has_repeats = trials_per_part_operator.max() > 1
        
        if has_repeats:
            for operator in operators:
                operator_data = df[df[operators_col] == operator]
                agreements = 0
                total_comparisons = 0
                
                for part in parts:
                    part_data = operator_data[operator_data[parts_col] == part]
                    if len(part_data) <= 1:
                        continue  # Skip if only one assessment for this part
                    
                    # Count agreements across all pairs of assessments
                    assessments = part_data[assessment_col].values
                    for i in range(len(assessments)):
                        for j in range(i + 1, len(assessments)):
                            total_comparisons += 1
                            if assessments[i] == assessments[j]:
                                agreements += 1
                
                if total_comparisons > 0:
                    agreement_pct = 100 * agreements / total_comparisons
                else:
                    agreement_pct = float('nan')
                
                repeatability_results[str(operator)] = {
                    'agreements': agreements,
                    'total_comparisons': total_comparisons,
                    'agreement_percent': float(agreement_pct)
                }
        
        # Calculate between-operator agreement (reproducibility)
        reproducibility_results = {}
        
        for part in parts:
            part_data = df[df[parts_col] == part]
            
            # Calculate agreement across all operators
            if n_operators > 1:
                # Group data by operator and get the most frequent assessment for each
                operator_assessments = {}
                for operator in operators:
                    operator_part_data = part_data[part_data[operators_col] == operator]
                    if len(operator_part_data) > 0:
                        # Get most frequent assessment
                        assessment_counts = operator_part_data[assessment_col].value_counts()
                        operator_assessments[operator] = assessment_counts.index[0]
                
                # Count agreements across all pairs of operators
                agreements = 0
                total_comparisons = 0
                
                operators_with_data = list(operator_assessments.keys())
                for i in range(len(operators_with_data)):
                    for j in range(i + 1, len(operators_with_data)):
                        op_i = operators_with_data[i]
                        op_j = operators_with_data[j]
                        total_comparisons += 1
                        if operator_assessments[op_i] == operator_assessments[op_j]:
                            agreements += 1
                
                if total_comparisons > 0:
                    agreement_pct = 100 * agreements / total_comparisons
                else:
                    agreement_pct = float('nan')
                
                reproducibility_results[str(part)] = {
                    'agreements': agreements,
                    'total_comparisons': total_comparisons,
                    'agreement_percent': float(agreement_pct)
                }
        
        # Calculate overall reproducibility
        all_agreements = sum(r['agreements'] for r in reproducibility_results.values())
        all_comparisons = sum(r['total_comparisons'] for r in reproducibility_results.values())
        
        if all_comparisons > 0:
            overall_repro_pct = 100 * all_agreements / all_comparisons
        else:
            overall_repro_pct = float('nan')
        
        # Calculate agreement with reference standard (if provided)
        reference_results = {}
        
        if has_reference:
            for operator in operators:
                operator_data = df[df[operators_col] == operator]
                agreements = 0
                total_comparisons = 0
                
                for part in parts:
                    part_data = operator_data[operator_data[parts_col] == part]
                    if len(part_data) == 0:
                        continue
                    
                    # Get reference value for this part
                    ref_data = df[(df[parts_col] == part) & (df[reference_col].notna())]
                    if len(ref_data) == 0:
                        continue
                    
                    reference_value = ref_data[reference_col].iloc[0]
                    
                    # Count agreements with reference
                    for _, row in part_data.iterrows():
                        total_comparisons += 1
                        if row[assessment_col] == reference_value:
                            agreements += 1
                
                if total_comparisons > 0:
                    agreement_pct = 100 * agreements / total_comparisons
                else:
                    agreement_pct = float('nan')
                
                reference_results[str(operator)] = {
                    'agreements': agreements,
                    'total_comparisons': total_comparisons,
                    'agreement_percent': float(agreement_pct)
                }
            
            # Calculate overall agreement with reference
            all_ref_agreements = sum(r['agreements'] for r in reference_results.values())
            all_ref_comparisons = sum(r['total_comparisons'] for r in reference_results.values())
            
            if all_ref_comparisons > 0:
                overall_ref_pct = 100 * all_ref_agreements / all_ref_comparisons
            else:
                overall_ref_pct = float('nan')
        else:
            overall_ref_pct = None
        
        # Calculate Kappa statistics
        kappa_results = {}
        
        if has_reference:
            for operator in operators:
                operator_data = df[df[operators_col] == operator]
                
                # Create confusion matrix
                confusion = np.zeros((n_categories, n_categories))
                category_map = {cat: i for i, cat in enumerate(categories)}
                
                for part in parts:
                    part_data = operator_data[operator_data[parts_col] == part]
                    if len(part_data) == 0:
                        continue
                    
                    # Get reference value for this part
                    ref_data = df[(df[parts_col] == part) & (df[reference_col].notna())]
                    if len(ref_data) == 0:
                        continue
                    
                    reference_value = ref_data[reference_col].iloc[0]
                    
                    # Update confusion matrix
                    for _, row in part_data.iterrows():
                        assessment = row[assessment_col]
                        ref_idx = category_map.get(reference_value, 0)
                        assess_idx = category_map.get(assessment, 0)
                        confusion[ref_idx, assess_idx] += 1
                
                # Calculate kappa statistic
                n = confusion.sum()
                if n > 0:
                    observed_agreement = np.trace(confusion) / n
                    row_sums = confusion.sum(axis=1)
                    col_sums = confusion.sum(axis=0)
                    expected_agreement = np.sum(row_sums * col_sums) / (n * n)
                    
                    if expected_agreement < 1:
                        kappa = (observed_agreement - expected_agreement) / (1 - expected_agreement)
                    else:
                        kappa = 1.0  # Perfect agreement
                else:
                    observed_agreement = float('nan')
                    expected_agreement = float('nan')
                    kappa = float('nan')
                
                kappa_results[str(operator)] = {
                    'observed_agreement': float(observed_agreement),
                    'expected_agreement': float(expected_agreement),
                    'kappa': float(kappa)
                }
            
            # Calculate overall kappa
            all_confusion = np.zeros((n_categories, n_categories))
            
            for part in parts:
                for operator in operators:
                    operator_data = df[(df[parts_col] == part) & (df[operators_col] == operator)]
                    if len(operator_data) == 0:
                        continue
                    
                    # Get reference value for this part
                    ref_data = df[(df[parts_col] == part) & (df[reference_col].notna())]
                    if len(ref_data) == 0:
                        continue
                    
                    reference_value = ref_data[reference_col].iloc[0]
                    
                    # Update confusion matrix
                    for _, row in operator_data.iterrows():
                        assessment = row[assessment_col]
                        ref_idx = category_map.get(reference_value, 0)
                        assess_idx = category_map.get(assessment, 0)
                        all_confusion[ref_idx, assess_idx] += 1
            
            # Calculate overall kappa statistic
            n = all_confusion.sum()
            if n > 0:
                observed_agreement = np.trace(all_confusion) / n
                row_sums = all_confusion.sum(axis=1)
                col_sums = all_confusion.sum(axis=0)
                expected_agreement = np.sum(row_sums * col_sums) / (n * n)
                
                if expected_agreement < 1:
                    overall_kappa = (observed_agreement - expected_agreement) / (1 - expected_agreement)
                else:
                    overall_kappa = 1.0  # Perfect agreement
            else:
                observed_agreement = float('nan')
                expected_agreement = float('nan')
                overall_kappa = float('nan')
        else:
            overall_kappa = None
        
        # Create overall summary
        summary = {
            'Number of Parts': n_parts,
            'Number of Operators': n_operators,
            'Number of Categories': n_categories,
            'Has Reference Standard': has_reference,
            'Has Repeated Measurements': has_repeats
        }
        
        if has_repeats:
            summary['Overall Repeatability'] = float(np.mean([r['agreement_percent'] for r in repeatability_results.values() if not np.isnan(r['agreement_percent'])]))
        
        summary['Overall Reproducibility'] = float(overall_repro_pct)
        
        if has_reference:
            summary['Overall Agreement with Reference'] = float(overall_ref_pct)
            summary['Overall Kappa'] = float(overall_kappa)
        
        # Combine all results
        result = {
            'summary': summary,
            'repeatability': repeatability_results if has_repeats else None,
            'reproducibility': reproducibility_results,
            'reference_agreement': reference_results if has_reference else None,
            'kappa': kappa_results if has_reference else None,
            'categories': categories.tolist()
        }
        
        return result
    
    def analyze_linearity_bias(
        self,
        data: Union[pd.DataFrame, List[Dict[str, Any]]],
        reference_col: str = "Reference",
        measurement_col: str = "Measurement"
    ) -> Dict[str, Any]:
        """
        Analyze measurement system linearity and bias.
        
        Args:
            data: DataFrame or list of dictionaries with measurement data
            reference_col: Column name for reference (standard) values
            measurement_col: Column name for measurement values
            
        Returns:
            Dictionary with linearity and bias analysis results
        """
        # Convert to DataFrame if list of dictionaries
        if isinstance(data, list):
            df = pd.DataFrame(data)
        else:
            df = data.copy()
        
        # Ensure data is in the correct format
        if reference_col not in df.columns:
            raise ValueError(f"Column '{reference_col}' not found in data")
        if measurement_col not in df.columns:
            raise ValueError(f"Column '{measurement_col}' not found in data")
        
        # Calculate bias for each reference value
        df['Bias'] = df[measurement_col] - df[reference_col]
        df['Percent_Bias'] = 100 * df['Bias'] / df[reference_col]
        
        # Group by reference value
        grouped = df.groupby(reference_col)
        
        bias_results = {}
        for ref_value, group in grouped:
            bias_mean = group['Bias'].mean()
            bias_std = group['Bias'].std(ddof=1)
            percent_bias = group['Percent_Bias'].mean()
            
            # T-test for bias significance
            t_stat = bias_mean / (bias_std / np.sqrt(len(group)))
            p_value = 2 * (1 - stats.t.cdf(abs(t_stat), len(group) - 1))
            
            bias_results[str(ref_value)] = {
                'bias': float(bias_mean),
                'bias_std': float(bias_std),
                'percent_bias': float(percent_bias),
                't_statistic': float(t_stat),
                'p_value': float(p_value),
                'significant': bool(p_value < 0.05),
                'count': int(len(group))
            }
        
        # Calculate overall bias
        overall_bias = df['Bias'].mean()
        overall_bias_std = df['Bias'].std(ddof=1)
        overall_percent_bias = df['Percent_Bias'].mean()
        
        # T-test for overall bias significance
        t_stat = overall_bias / (overall_bias_std / np.sqrt(len(df)))
        p_value = 2 * (1 - stats.t.cdf(abs(t_stat), len(df) - 1))
        
        overall_bias_result = {
            'bias': float(overall_bias),
            'bias_std': float(overall_bias_std),
            'percent_bias': float(overall_percent_bias),
            't_statistic': float(t_stat),
            'p_value': float(p_value),
            'significant': bool(p_value < 0.05),
            'count': int(len(df))
        }
        
        # Analyze linearity
        # Perform linear regression of bias vs reference
        reference_values = df[reference_col].values
        bias_values = df['Bias'].values
        
        X = np.column_stack([np.ones_like(reference_values), reference_values])
        coef = np.linalg.lstsq(X, bias_values, rcond=None)[0]
        
        intercept = coef[0]  # Bias at zero reference
        slope = coef[1]  # Linearity (change in bias per unit change in reference)
        
        # Calculate predictions and residuals
        predicted_bias = intercept + slope * reference_values
        residuals = bias_values - predicted_bias
        
        # Calculate R-squared
        ss_total = np.sum((bias_values - np.mean(bias_values)) ** 2)
        ss_residual = np.sum(residuals ** 2)
        r_squared = 1 - (ss_residual / ss_total) if ss_total > 0 else 0
        
        # T-test for slope significance
        n = len(df)
        x_mean = np.mean(reference_values)
        s_xx = np.sum((reference_values - x_mean) ** 2)
        s_e = np.sqrt(ss_residual / (n - 2))
        t_slope = slope / (s_e / np.sqrt(s_xx))
        p_slope = 2 * (1 - stats.t.cdf(abs(t_slope), n - 2))
        
        linearity_result = {
            'intercept': float(intercept),
            'slope': float(slope),
            'r_squared': float(r_squared),
            't_statistic': float(t_slope),
            'p_value': float(p_slope),
            'significant': bool(p_slope < 0.05)
        }
        
        # Create result
        result = {
            'bias_by_reference': bias_results,
            'overall_bias': overall_bias_result,
            'linearity': linearity_result,
            'data_summary': {
                'min_reference': float(df[reference_col].min()),
                'max_reference': float(df[reference_col].max()),
                'reference_values': sorted(df[reference_col].unique().tolist()),
                'count': int(len(df))
            }
        }
        
        return result
    
    def analyze_stability(
        self,
        data: Union[pd.DataFrame, List[Dict[str, Any]]],
        measurement_col: str = "Measurement",
        time_col: str = "Time",
        reference_col: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze measurement system stability over time.
        
        Args:
            data: DataFrame or list of dictionaries with measurement data
            measurement_col: Column name for measurement values
            time_col: Column name for time/date values
            reference_col: Optional column name for reference values
            
        Returns:
            Dictionary with stability analysis results
        """
        # Convert to DataFrame if list of dictionaries
        if isinstance(data, list):
            df = pd.DataFrame(data)
        else:
            df = data.copy()
        
        # Ensure data is in the correct format
        if measurement_col not in df.columns:
            raise ValueError(f"Column '{measurement_col}' not found in data")
        if time_col not in df.columns:
            raise ValueError(f"Column '{time_col}' not found in data")
        
        # Convert time column to datetime if needed
        if not pd.api.types.is_datetime64_dtype(df[time_col]):
            try:
                df[time_col] = pd.to_datetime(df[time_col])
            except:
                # If conversion fails, create a numeric time index
                df[time_col] = pd.factorize(df[time_col])[0]
        
        # Sort by time
        df = df.sort_values(by=time_col)
        
        # Calculate bias if reference value is provided
        has_reference = reference_col is not None and reference_col in df.columns
        
        if has_reference:
            df['Bias'] = df[measurement_col] - df[reference_col]
            measurement_data = df['Bias']
            measurement_label = 'Bias'
        else:
            measurement_data = df[measurement_col]
            measurement_label = measurement_col
        
        # Calculate statistics for control chart
        mean = measurement_data.mean()
        std_dev = measurement_data.std(ddof=1)
        
        # Calculate control limits
        ucl = mean + 3 * std_dev
        lcl = mean - 3 * std_dev
        
        # Check for out-of-control points
        out_of_control = []
        for i, value in enumerate(measurement_data):
            if value > ucl or value < lcl:
                out_of_control.append(i)
        
        # Test for runs and trends in stability
        n = len(measurement_data)
        values = measurement_data.values
        runs_above = []
        runs_below = []
        trends_up = []
        trends_down = []
        
        # Check for runs above/below mean
        run_length = 0
        run_type = None
        run_start = 0
        
        for i, value in enumerate(values):
            if value > mean:
                if run_type == 'above':
                    run_length += 1
                else:
                    run_type = 'above'
                    run_length = 1
                    run_start = i
            elif value < mean:
                if run_type == 'below':
                    run_length += 1
                else:
                    run_type = 'below'
                    run_length = 1
                    run_start = i
            else:  # value == mean
                run_type = None
                run_length = 0
            
            # Check if run is long enough (7+ points)
            if run_length >= 7:
                if run_type == 'above' and run_start not in runs_above:
                    runs_above.append(run_start)
                elif run_type == 'below' and run_start not in runs_below:
                    runs_below.append(run_start)
        
        # Check for trends (6+ points in same direction)
        for i in range(n - 5):
            # Upward trend
            if all(values[i + j] < values[i + j + 1] for j in range(5)):
                trends_up.append(i)
            
            # Downward trend
            if all(values[i + j] > values[i + j + 1] for j in range(5)):
                trends_down.append(i)
        
        # Check for stability using regression analysis
        X = np.arange(n).reshape(-1, 1)
        y = values
        
        # Add constant for intercept
        X_with_const = np.column_stack([np.ones(n), X])
        
        # Calculate regression coefficients using OLS
        coeffs = np.linalg.lstsq(X_with_const, y, rcond=None)[0]
        intercept, slope = coeffs
        
        # Calculate predictions and residuals
        predicted = intercept + slope * X.flatten()
        residuals = y - predicted
        
        # Calculate standard error of slope
        ss_residuals = np.sum(residuals ** 2)
        ss_x = np.sum((X.flatten() - np.mean(X.flatten())) ** 2)
        std_err = np.sqrt(ss_residuals / (n - 2)) / np.sqrt(ss_x)
        
        # Calculate t-statistic and p-value for slope
        t_stat = slope / std_err
        p_value = 2 * (1 - stats.t.cdf(abs(t_stat), n - 2))
        
        # Determine stability based on tests
        is_stable = True
        if out_of_control:
            is_stable = False
        if runs_above or runs_below:
            is_stable = False
        if trends_up or trends_down:
            is_stable = False
        if p_value < 0.05:
            is_stable = False
        
        # Create result
        stability_result = {
            'measurement_name': measurement_label,
            'is_stable': is_stable,
            'mean': float(mean),
            'std_dev': float(std_dev),
            'ucl': float(ucl),
            'lcl': float(lcl),
            'out_of_control_points': out_of_control,
            'runs_above_mean': runs_above,
            'runs_below_mean': runs_below,
            'trends_upward': trends_up,
            'trends_downward': trends_down,
            'regression': {
                'intercept': float(intercept),
                'slope': float(slope),
                't_statistic': float(t_stat),
                'p_value': float(p_value),
                'significant_trend': bool(p_value < 0.05)
            },
            'data_summary': {
                'first_time': str(df[time_col].iloc[0]),
                'last_time': str(df[time_col].iloc[-1]),
                'count': int(n)
            }
        }
        
        return stability_result