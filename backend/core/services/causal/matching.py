"""
Propensity Score Matching Module
================================

Implements matching methods for causal inference.

Matching creates comparable treatment and control groups by
pairing units with similar covariate values or propensity scores.

Methods Implemented:
- Nearest neighbor matching (greedy)
- Nearest neighbor with caliper
- Optimal matching (minimizes total distance)
- Coarsened exact matching

References:
    Rosenbaum, P. R. (2002). Observational Studies (2nd ed.).
    Stuart, E. A. (2010). Matching methods for causal inference:
    A review and a look forward. Statistical Science, 25(1), 1-21.

Created: December 26, 2025
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple, Union
import numpy as np
import pandas as pd
from scipy.spatial.distance import cdist
from scipy.optimize import linear_sum_assignment


@dataclass
class MatchingResult:
    """Result of propensity score matching."""
    matched_data: pd.DataFrame
    matched_pairs: List[Tuple[int, int]]  # (treated_idx, control_idx)
    n_treated: int
    n_matched: int
    n_unmatched: int
    balance_after: Dict[str, Any]
    match_quality: Dict[str, Any]
    warnings: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            'n_treated': self.n_treated,
            'n_matched': self.n_matched,
            'n_unmatched': self.n_unmatched,
            'match_rate': self.n_matched / self.n_treated if self.n_treated > 0 else 0,
            'matched_pairs': self.matched_pairs[:10],  # First 10 for API
            'balance_after': self.balance_after,
            'match_quality': self.match_quality,
            'warnings': self.warnings
        }


def propensity_score_matching(
    data: pd.DataFrame,
    treatment: str,
    propensity_scores: np.ndarray,
    outcome: Optional[str] = None,
    method: str = 'nearest',
    ratio: int = 1,
    caliper: Optional[float] = None,
    replacement: bool = False,
    covariates: Optional[List[str]] = None
) -> MatchingResult:
    """
    Perform propensity score matching.

    Args:
        data: DataFrame with observations
        treatment: Name of treatment variable
        propensity_scores: Estimated propensity scores
        outcome: Name of outcome variable (optional, for effect estimation)
        method: 'nearest' or 'optimal'
        ratio: Number of control matches per treated (1:k matching)
        caliper: Maximum distance for valid match (in PS units)
        replacement: Allow matching with replacement
        covariates: Covariates for balance assessment

    Returns:
        MatchingResult with matched data and diagnostics
    """
    warnings = []

    # Get treatment indicators
    T = data[treatment].values
    treated_idx = np.where(T == 1)[0]
    control_idx = np.where(T == 0)[0]

    n_treated = len(treated_idx)
    n_control = len(control_idx)

    if n_control < n_treated:
        warnings.append(f"Fewer controls ({n_control}) than treated ({n_treated})")

    if ratio > 1 and n_control < ratio * n_treated:
        warnings.append(f"Insufficient controls for {ratio}:1 matching")

    # Set default caliper (0.2 * SD of propensity scores)
    if caliper is None:
        caliper = 0.2 * np.std(propensity_scores)

    # Perform matching based on method
    if method == 'nearest':
        matched_pairs = nearest_neighbor_matching(
            propensity_scores,
            treated_idx,
            control_idx,
            ratio=ratio,
            caliper=caliper,
            replacement=replacement
        )
    elif method == 'optimal':
        matched_pairs = optimal_matching(
            propensity_scores,
            treated_idx,
            control_idx,
            caliper=caliper
        )
    else:
        raise ValueError(f"Unknown method: {method}")

    n_matched = len(matched_pairs)
    n_unmatched = n_treated - n_matched

    if n_unmatched > 0:
        warnings.append(f"{n_unmatched} treated units unmatched")

    # Create matched dataset
    matched_treated_idx = [p[0] for p in matched_pairs]
    matched_control_idx = [p[1] for p in matched_pairs]

    # Include matched observations (each pair appears once)
    all_matched_idx = list(set(matched_treated_idx + matched_control_idx))
    matched_data = data.iloc[all_matched_idx].copy()
    matched_data['_match_id'] = None

    # Assign match IDs
    for i, (t_idx, c_idx) in enumerate(matched_pairs):
        matched_data.loc[matched_data.index == data.index[t_idx], '_match_id'] = i
        matched_data.loc[matched_data.index == data.index[c_idx], '_match_id'] = i

    # Assess balance after matching
    balance_after = {}
    if covariates:
        balance_after = assess_balance(
            matched_data,
            treatment,
            covariates
        )

    # Match quality metrics
    match_quality = _assess_match_quality(
        propensity_scores,
        matched_pairs,
        caliper
    )

    return MatchingResult(
        matched_data=matched_data,
        matched_pairs=matched_pairs,
        n_treated=n_treated,
        n_matched=n_matched,
        n_unmatched=n_unmatched,
        balance_after=balance_after,
        match_quality=match_quality,
        warnings=warnings
    )


def nearest_neighbor_matching(
    scores: np.ndarray,
    treated_idx: np.ndarray,
    control_idx: np.ndarray,
    ratio: int = 1,
    caliper: Optional[float] = None,
    replacement: bool = False
) -> List[Tuple[int, int]]:
    """
    Greedy nearest neighbor matching.

    Matches each treated unit to the nearest control unit(s).
    Order of matching can affect results.

    Args:
        scores: Propensity scores for all units
        treated_idx: Indices of treated units
        control_idx: Indices of control units
        ratio: Number of controls per treated
        caliper: Maximum allowed distance
        replacement: Allow controls to be matched multiple times

    Returns:
        List of (treated_index, control_index) pairs
    """
    matched_pairs = []
    available_controls = set(control_idx)

    # Randomize order of treated units
    np.random.shuffle(treated_idx)

    for t_idx in treated_idx:
        t_score = scores[t_idx]

        # Find nearest available control(s)
        best_matches = []

        for c_idx in available_controls:
            distance = abs(scores[c_idx] - t_score)

            if caliper is None or distance <= caliper:
                best_matches.append((c_idx, distance))

        # Sort by distance and take top 'ratio' matches
        best_matches.sort(key=lambda x: x[1])
        best_matches = best_matches[:ratio]

        for c_idx, dist in best_matches:
            matched_pairs.append((int(t_idx), int(c_idx)))

            if not replacement:
                available_controls.discard(c_idx)

    return matched_pairs


def optimal_matching(
    scores: np.ndarray,
    treated_idx: np.ndarray,
    control_idx: np.ndarray,
    caliper: Optional[float] = None
) -> List[Tuple[int, int]]:
    """
    Optimal matching using Hungarian algorithm.

    Finds the matching that minimizes total distance across all pairs.
    More computationally intensive but produces better overall balance.

    Args:
        scores: Propensity scores
        treated_idx: Indices of treated units
        control_idx: Indices of control units
        caliper: Maximum allowed distance (inf for violations)

    Returns:
        List of (treated_index, control_index) pairs
    """
    n_treated = len(treated_idx)
    n_control = len(control_idx)

    # Create distance matrix
    treated_scores = scores[treated_idx].reshape(-1, 1)
    control_scores = scores[control_idx].reshape(-1, 1)

    dist_matrix = cdist(treated_scores, control_scores, metric='euclidean')

    # Apply caliper (set large penalty for violations)
    if caliper is not None:
        large_value = 1e10
        dist_matrix[dist_matrix > caliper] = large_value

    # Solve assignment problem
    # Need more controls than treated for optimal matching
    if n_control >= n_treated:
        row_ind, col_ind = linear_sum_assignment(dist_matrix)
    else:
        # Pad matrix if needed
        padded = np.full((n_treated, n_treated), 1e10)
        padded[:, :n_control] = dist_matrix
        row_ind, col_ind = linear_sum_assignment(padded)
        # Filter out padded matches
        valid = col_ind < n_control
        row_ind = row_ind[valid]
        col_ind = col_ind[valid]

    # Build pairs, excluding caliper violations
    matched_pairs = []
    for r, c in zip(row_ind, col_ind):
        if dist_matrix[r, c] < 1e9:  # Valid match
            matched_pairs.append((int(treated_idx[r]), int(control_idx[c])))

    return matched_pairs


def assess_balance(
    data: pd.DataFrame,
    treatment: str,
    covariates: List[str],
    weights: Optional[np.ndarray] = None
) -> Dict[str, Any]:
    """
    Assess covariate balance between treatment groups.

    Calculates standardized mean differences (SMD) for each covariate.
    SMD < 0.1 is generally considered balanced.

    Args:
        data: DataFrame with data
        treatment: Treatment variable name
        covariates: List of covariate names
        weights: Optional IPW weights

    Returns:
        Dictionary with balance statistics
    """
    treated = data[data[treatment] == 1]
    control = data[data[treatment] == 0]

    if weights is not None:
        w_treated = weights[data[treatment] == 1]
        w_control = weights[data[treatment] == 0]
    else:
        w_treated = None
        w_control = None

    balance = {}

    for cov in covariates:
        try:
            t_vals = treated[cov].dropna().values
            c_vals = control[cov].dropna().values

            if len(t_vals) == 0 or len(c_vals) == 0:
                balance[cov] = {'error': 'No valid values'}
                continue

            # Weighted or unweighted means
            if w_treated is not None and w_control is not None:
                t_mean = np.average(t_vals, weights=w_treated[:len(t_vals)])
                c_mean = np.average(c_vals, weights=w_control[:len(c_vals)])
            else:
                t_mean = np.mean(t_vals)
                c_mean = np.mean(c_vals)

            # Pooled standard deviation
            pooled_std = np.sqrt((np.var(t_vals) + np.var(c_vals)) / 2)

            if pooled_std > 0:
                smd = (t_mean - c_mean) / pooled_std
            else:
                smd = 0 if t_mean == c_mean else np.inf

            balance[cov] = {
                'treated_mean': float(t_mean),
                'control_mean': float(c_mean),
                'standardized_mean_diff': float(smd),
                'abs_smd': float(abs(smd)),
                'balanced': abs(smd) < 0.1
            }

        except Exception as e:
            balance[cov] = {'error': str(e)}

    # Summary statistics
    smds = [abs(v.get('standardized_mean_diff', 0))
            for v in balance.values() if isinstance(v, dict) and 'standardized_mean_diff' in v]

    balance['_summary'] = {
        'n_covariates': len(covariates),
        'n_balanced': sum(1 for s in smds if s < 0.1),
        'n_imbalanced': sum(1 for s in smds if s >= 0.1),
        'max_smd': float(max(smds)) if smds else None,
        'mean_smd': float(np.mean(smds)) if smds else None,
        'imbalanced_covariates': [
            cov for cov, v in balance.items()
            if isinstance(v, dict) and v.get('abs_smd', 0) >= 0.1
        ]
    }

    return balance


def _assess_match_quality(
    scores: np.ndarray,
    matched_pairs: List[Tuple[int, int]],
    caliper: Optional[float]
) -> Dict[str, Any]:
    """Assess quality of matches."""
    if not matched_pairs:
        return {'n_pairs': 0, 'warning': 'No matches'}

    distances = []
    for t_idx, c_idx in matched_pairs:
        dist = abs(scores[t_idx] - scores[c_idx])
        distances.append(dist)

    distances = np.array(distances)

    return {
        'n_pairs': len(matched_pairs),
        'mean_distance': float(np.mean(distances)),
        'median_distance': float(np.median(distances)),
        'max_distance': float(np.max(distances)),
        'std_distance': float(np.std(distances)),
        'caliper_used': caliper,
        'pct_within_01sd': float(np.mean(distances < 0.1 * np.std(scores)))
    }


def estimate_effect_matched(
    matched_data: pd.DataFrame,
    treatment: str,
    outcome: str,
    method: str = 'simple'
) -> Dict[str, Any]:
    """
    Estimate treatment effect from matched data.

    Args:
        matched_data: DataFrame with matched observations
        treatment: Treatment variable name
        outcome: Outcome variable name
        method: 'simple' (difference in means) or 'paired' (within-pair)

    Returns:
        Dictionary with effect estimate and inference
    """
    treated = matched_data[matched_data[treatment] == 1][outcome].values
    control = matched_data[matched_data[treatment] == 0][outcome].values

    if method == 'simple':
        # Simple difference in means
        effect = np.mean(treated) - np.mean(control)
        se = np.sqrt(np.var(treated) / len(treated) + np.var(control) / len(control))

    elif method == 'paired':
        # Paired analysis using match IDs
        if '_match_id' not in matched_data.columns:
            raise ValueError("No match IDs found - use simple method")

        pair_diffs = []
        for match_id in matched_data['_match_id'].dropna().unique():
            pair = matched_data[matched_data['_match_id'] == match_id]
            if len(pair) == 2:
                t_val = pair[pair[treatment] == 1][outcome].values[0]
                c_val = pair[pair[treatment] == 0][outcome].values[0]
                pair_diffs.append(t_val - c_val)

        if len(pair_diffs) == 0:
            return {'error': 'No complete pairs found'}

        effect = np.mean(pair_diffs)
        se = np.std(pair_diffs) / np.sqrt(len(pair_diffs))

    else:
        raise ValueError(f"Unknown method: {method}")

    # Inference
    t_stat = effect / se if se > 0 else np.inf
    from scipy import stats as sp_stats
    p_value = 2 * (1 - sp_stats.t.cdf(abs(t_stat), df=len(treated) + len(control) - 2))

    return {
        'effect': float(effect),
        'se': float(se),
        't_statistic': float(t_stat),
        'p_value': float(p_value),
        'ci_lower': float(effect - 1.96 * se),
        'ci_upper': float(effect + 1.96 * se),
        'n_treated': len(treated),
        'n_control': len(control),
        'method': method
    }


def coarsened_exact_matching(
    data: pd.DataFrame,
    treatment: str,
    covariates: List[str],
    coarsening: Optional[Dict[str, int]] = None
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Coarsened Exact Matching (CEM).

    Creates bins for continuous covariates and matches exactly
    within bins. Guarantees balance on binned covariates.

    Args:
        data: DataFrame with observations
        treatment: Treatment variable name
        covariates: Covariates to match on
        coarsening: Number of bins for each continuous covariate

    Returns:
        Tuple of (matched_data, info)
    """
    if coarsening is None:
        coarsening = {cov: 5 for cov in covariates}

    # Create coarsened variables
    df = data.copy()

    for cov in covariates:
        if cov in coarsening:
            n_bins = coarsening[cov]
            df[f'_cem_{cov}'] = pd.qcut(
                df[cov], q=n_bins, labels=False, duplicates='drop'
            )
        else:
            # Categorical - use as is
            df[f'_cem_{cov}'] = df[cov]

    # Create strata
    cem_cols = [f'_cem_{cov}' for cov in covariates]
    df['_cem_strata'] = df[cem_cols].apply(lambda x: tuple(x), axis=1)

    # Find strata with both treated and control
    strata_counts = df.groupby(['_cem_strata', treatment]).size().unstack(fill_value=0)

    valid_strata = strata_counts[(strata_counts[0] > 0) & (strata_counts[1] > 0)].index

    # Filter to valid strata
    matched_data = df[df['_cem_strata'].isin(valid_strata)].copy()

    # Clean up
    matched_data = matched_data.drop(columns=cem_cols + ['_cem_strata'])

    n_original = len(data)
    n_matched = len(matched_data)

    info = {
        'n_original': n_original,
        'n_matched': n_matched,
        'n_dropped': n_original - n_matched,
        'match_rate': n_matched / n_original,
        'n_strata': len(valid_strata),
        'coarsening': coarsening
    }

    return matched_data, info
