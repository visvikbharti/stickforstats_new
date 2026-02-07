"""
Adjustment Sets Module
======================

Calculates adjustment sets for causal effect identification.

An adjustment set is a set of variables that, when conditioned on,
blocks all backdoor paths while leaving the causal effect identified.

Key Concepts:
- Backdoor Criterion: Adjustment set must block all backdoor paths
  and not include descendants of treatment
- Front-door Criterion: Alternative when backdoor adjustment is not possible
- Minimal Adjustment Set: Smallest set satisfying the backdoor criterion

References:
    Pearl, J. (2009). Causality: Models, Reasoning, and Inference.
    Shpitser, I., & Pearl, J. (2008). Complete Identification Methods
    for the Causal Hierarchy. JMLR.

Created: December 26, 2025
"""

from dataclasses import dataclass, field
from typing import Set, List, Dict, Any, Optional, Tuple
from itertools import combinations
from .dag import CausalDAG, NodeType
from .d_separation import is_d_separated


@dataclass
class AdjustmentSetResult:
    """Result of adjustment set calculation."""
    exposure: str
    outcome: str
    valid_adjustment_sets: List[Set[str]]
    minimal_adjustment_set: Optional[Set[str]]
    confounders: Set[str]
    forbidden_nodes: Set[str]  # Descendants of treatment, mediators
    backdoor_paths: List[List[str]]
    identifiable: bool
    explanation: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            'exposure': self.exposure,
            'outcome': self.outcome,
            'valid_adjustment_sets': [list(s) for s in self.valid_adjustment_sets],
            'minimal_adjustment_set': list(self.minimal_adjustment_set) if self.minimal_adjustment_set else None,
            'confounders': list(self.confounders),
            'forbidden_nodes': list(self.forbidden_nodes),
            'backdoor_paths': self.backdoor_paths,
            'identifiable': self.identifiable,
            'explanation': self.explanation
        }


def find_backdoor_paths(
    dag: CausalDAG,
    exposure: str,
    outcome: str
) -> List[List[str]]:
    """
    Find all backdoor paths from exposure to outcome.

    A backdoor path is a non-causal path that starts with an arrow
    INTO the exposure variable.

    Args:
        dag: The causal DAG
        exposure: Treatment/exposure variable
        outcome: Outcome variable

    Returns:
        List of backdoor paths
    """
    all_paths = dag.all_paths(exposure, outcome)
    backdoor_paths = []

    for path in all_paths:
        if len(path) < 2:
            continue

        # Get second node in path
        second_node = path[1]

        # Check if path starts with arrow INTO exposure
        # This means second_node -> exposure
        if dag.has_edge(second_node, exposure):
            backdoor_paths.append(path)

    return backdoor_paths


def is_valid_adjustment_set(
    dag: CausalDAG,
    exposure: str,
    outcome: str,
    adjustment_set: Set[str]
) -> Tuple[bool, str]:
    """
    Check if a set is a valid adjustment set for causal effect estimation.

    A valid adjustment set must:
    1. Block all backdoor paths from exposure to outcome
    2. Not include descendants of exposure (would block causal effect)
    3. Not open any blocked paths by conditioning on collider descendants

    Args:
        dag: The causal DAG
        exposure: Treatment variable
        outcome: Outcome variable
        adjustment_set: Proposed adjustment set

    Returns:
        Tuple of (is_valid, reason)
    """
    # Check 1: No descendants of exposure
    exposure_descendants = dag.descendants(exposure)
    invalid_descendants = adjustment_set & exposure_descendants

    if invalid_descendants:
        return False, f"Contains descendant(s) of treatment: {invalid_descendants}"

    # Check 2: No exposure or outcome
    if exposure in adjustment_set:
        return False, "Cannot condition on exposure variable"
    if outcome in adjustment_set:
        return False, "Cannot condition on outcome variable"

    # Check 3: Blocks all backdoor paths
    backdoor_paths = find_backdoor_paths(dag, exposure, outcome)

    for path in backdoor_paths:
        is_blocked = _is_path_blocked_by_set(dag, path, adjustment_set)
        if not is_blocked:
            return False, f"Does not block backdoor path: {' -> '.join(path)}"

    # Check 4: Doesn't open any collider paths
    # Get all paths and check if we're opening any blocked paths
    all_paths = dag.all_paths(exposure, outcome)

    for path in all_paths:
        if path in backdoor_paths:
            continue

        # Check if this path was blocked (by collider) but now opened
        was_blocked_empty = _is_path_blocked_by_set(dag, path, set())
        is_blocked_now = _is_path_blocked_by_set(dag, path, adjustment_set)

        if was_blocked_empty and not is_blocked_now:
            return False, f"Opens previously blocked path by conditioning on collider descendant: {' -> '.join(path)}"

    return True, "Valid adjustment set"


def _is_path_blocked_by_set(
    dag: CausalDAG,
    path: List[str],
    conditioning_set: Set[str]
) -> bool:
    """Check if a path is blocked by a conditioning set."""
    if len(path) < 3:
        return False

    for i in range(1, len(path) - 1):
        prev_node = path[i - 1]
        curr_node = path[i]
        next_node = path[i + 1]

        # Check if collider
        prev_to_curr = dag.has_edge(prev_node, curr_node)
        next_to_curr = dag.has_edge(next_node, curr_node)
        is_collider = prev_to_curr and next_to_curr

        if is_collider:
            # Collider blocks unless conditioned on (or descendant conditioned on)
            curr_descendants = dag.descendants(curr_node)
            if curr_node not in conditioning_set and not (curr_descendants & conditioning_set):
                return True
        else:
            # Non-collider blocks if conditioned on
            if curr_node in conditioning_set:
                return True

    return False


def identify_confounders(
    dag: CausalDAG,
    exposure: str,
    outcome: str
) -> Set[str]:
    """
    Identify all confounders between exposure and outcome.

    A confounder is a variable that:
    1. Is a common cause of both exposure and outcome
    2. Is not on the causal path from exposure to outcome
    3. Is not a descendant of exposure

    Args:
        dag: The causal DAG
        exposure: Treatment variable
        outcome: Outcome variable

    Returns:
        Set of confounder names
    """
    confounders = set()

    # Get nodes on causal path (cannot be confounders)
    causal_paths = dag.directed_paths(exposure, outcome)
    nodes_on_causal_path = set()
    for path in causal_paths:
        nodes_on_causal_path.update(path[1:-1])  # Exclude exposure and outcome

    # Get descendants of exposure (cannot be confounders)
    exposure_descendants = dag.descendants(exposure)

    # Check each node
    for node in dag.nodes:
        if node in [exposure, outcome]:
            continue
        if node in exposure_descendants:
            continue
        if node in nodes_on_causal_path:
            continue

        # Check if common cause of exposure and outcome
        # Node must be ancestor of both
        if dag.is_ancestor(node, exposure) and dag.is_ancestor(node, outcome):
            confounders.add(node)

    return confounders


def find_adjustment_sets(
    dag: CausalDAG,
    exposure: str,
    outcome: str,
    max_size: Optional[int] = None,
    required_nodes: Optional[Set[str]] = None,
    forbidden_nodes: Optional[Set[str]] = None
) -> AdjustmentSetResult:
    """
    Find all valid adjustment sets for estimating causal effect.

    Args:
        dag: The causal DAG
        exposure: Treatment/exposure variable
        outcome: Outcome variable
        max_size: Maximum size of adjustment sets to consider
        required_nodes: Nodes that must be included
        forbidden_nodes: Nodes that cannot be included

    Returns:
        AdjustmentSetResult with all valid sets and analysis
    """
    if required_nodes is None:
        required_nodes = set()
    if forbidden_nodes is None:
        forbidden_nodes = set()

    # Get descendants of exposure - these cannot be in adjustment set
    exposure_descendants = dag.descendants(exposure)
    auto_forbidden = exposure_descendants | {exposure, outcome}
    all_forbidden = forbidden_nodes | auto_forbidden

    # Available nodes
    available_nodes = set(dag.observed_nodes) - all_forbidden

    if max_size is None:
        max_size = len(available_nodes)

    # Find backdoor paths
    backdoor_paths = find_backdoor_paths(dag, exposure, outcome)

    # Find confounders
    confounders = identify_confounders(dag, exposure, outcome)

    # Find valid adjustment sets
    valid_sets = []

    # Check required nodes first
    if required_nodes:
        is_valid, reason = is_valid_adjustment_set(dag, exposure, outcome, required_nodes)
        if is_valid:
            valid_sets.append(required_nodes.copy())

    # Try combinations of increasing size
    remaining_nodes = available_nodes - required_nodes

    for size in range(len(required_nodes), max_size + 1):
        extra_size = size - len(required_nodes)
        if extra_size < 0:
            continue

        for combo in combinations(remaining_nodes, extra_size):
            adj_set = required_nodes | set(combo)
            is_valid, reason = is_valid_adjustment_set(dag, exposure, outcome, adj_set)

            if is_valid:
                # Check if this is a new minimal set
                is_new = True
                for existing in valid_sets:
                    if existing <= adj_set:
                        is_new = False
                        break

                if is_new:
                    # Remove any supersets
                    valid_sets = [s for s in valid_sets if not adj_set < s]
                    valid_sets.append(adj_set)

    # Determine minimal set
    minimal_set = None
    if valid_sets:
        minimal_set = min(valid_sets, key=len)

    # Check if effect is identifiable
    identifiable = len(valid_sets) > 0 or len(backdoor_paths) == 0

    # Generate explanation
    if not identifiable:
        explanation = "Causal effect is NOT identifiable - unblockable backdoor paths exist"
    elif len(backdoor_paths) == 0:
        explanation = "No backdoor paths - no adjustment needed for causal effect"
    elif minimal_set is not None:
        explanation = f"Causal effect identifiable by adjusting for {{{', '.join(minimal_set)}}}"
    else:
        explanation = "Causal effect identifiable with empty adjustment set"

    return AdjustmentSetResult(
        exposure=exposure,
        outcome=outcome,
        valid_adjustment_sets=valid_sets,
        minimal_adjustment_set=minimal_set,
        confounders=confounders,
        forbidden_nodes=auto_forbidden,
        backdoor_paths=backdoor_paths,
        identifiable=identifiable,
        explanation=explanation
    )


def minimal_adjustment_set(
    dag: CausalDAG,
    exposure: str,
    outcome: str,
    prefer_observed: bool = True
) -> Optional[Set[str]]:
    """
    Find the smallest valid adjustment set.

    Args:
        dag: The causal DAG
        exposure: Treatment variable
        outcome: Outcome variable
        prefer_observed: If True, prefer observed variables

    Returns:
        Minimal adjustment set or None if not identifiable
    """
    result = find_adjustment_sets(dag, exposure, outcome)
    return result.minimal_adjustment_set


def suggest_variables_to_measure(
    dag: CausalDAG,
    exposure: str,
    outcome: str,
    measured_variables: Set[str]
) -> Dict[str, Any]:
    """
    Suggest additional variables to measure for identification.

    Useful when current measured variables are insufficient for
    causal effect identification.

    Args:
        dag: The causal DAG
        exposure: Treatment variable
        outcome: Outcome variable
        measured_variables: Currently measured variables

    Returns:
        Dictionary with suggestions
    """
    # Find adjustment sets using only measured variables
    result_measured = find_adjustment_sets(
        dag, exposure, outcome,
        forbidden_nodes=set(dag.nodes) - measured_variables - {exposure, outcome}
    )

    # Find adjustment sets using all variables
    result_all = find_adjustment_sets(dag, exposure, outcome)

    suggestions = []

    if result_measured.identifiable:
        return {
            'status': 'identifiable',
            'message': 'Causal effect is already identifiable with measured variables',
            'suggested_variables': [],
            'current_adjustment_set': result_measured.minimal_adjustment_set
        }

    if not result_all.identifiable:
        return {
            'status': 'not_identifiable',
            'message': 'Causal effect is not identifiable even with all variables',
            'suggested_variables': [],
            'reason': 'Unblocked confounding exists that cannot be adjusted for'
        }

    # Find which unmeasured variables would help
    unmeasured = set(dag.nodes) - measured_variables - {exposure, outcome}

    for var in unmeasured:
        # Check if measuring this variable enables identification
        new_measured = measured_variables | {var}
        result_new = find_adjustment_sets(
            dag, exposure, outcome,
            forbidden_nodes=set(dag.nodes) - new_measured - {exposure, outcome}
        )

        if result_new.identifiable:
            suggestions.append({
                'variable': var,
                'role': _get_variable_role(dag, var, exposure, outcome),
                'enables_identification': True
            })

    return {
        'status': 'need_additional_measurements',
        'message': 'Additional measurements needed for identification',
        'suggested_variables': suggestions,
        'confounders': list(result_all.confounders)
    }


def _get_variable_role(dag: CausalDAG, var: str, exposure: str, outcome: str) -> str:
    """Determine the role of a variable in the causal structure."""
    is_ancestor_exposure = dag.is_ancestor(var, exposure)
    is_ancestor_outcome = dag.is_ancestor(var, outcome)
    is_descendant_exposure = dag.is_descendant(var, exposure)

    if is_ancestor_exposure and is_ancestor_outcome:
        return 'confounder'
    elif is_ancestor_exposure:
        return 'cause of exposure only'
    elif is_ancestor_outcome and not is_descendant_exposure:
        return 'cause of outcome only'
    elif is_descendant_exposure:
        causal_paths = dag.directed_paths(exposure, outcome)
        for path in causal_paths:
            if var in path:
                return 'mediator'
        return 'descendant of exposure'
    else:
        return 'other'


def analyze_adjustment_strategy(
    dag: CausalDAG,
    exposure: str,
    outcome: str,
    proposed_adjustment: Set[str]
) -> Dict[str, Any]:
    """
    Analyze a proposed adjustment strategy.

    Provides detailed feedback on whether the proposed adjustment
    set is valid and what issues might exist.

    Args:
        dag: The causal DAG
        exposure: Treatment variable
        outcome: Outcome variable
        proposed_adjustment: Proposed set of variables to adjust for

    Returns:
        Detailed analysis of the adjustment strategy
    """
    is_valid, reason = is_valid_adjustment_set(dag, exposure, outcome, proposed_adjustment)

    analysis = {
        'is_valid': is_valid,
        'reason': reason,
        'proposed_set': list(proposed_adjustment),
        'issues': [],
        'recommendations': []
    }

    # Check for specific issues
    exposure_descendants = dag.descendants(exposure)
    included_descendants = proposed_adjustment & exposure_descendants

    if included_descendants:
        analysis['issues'].append({
            'type': 'descendant_of_treatment',
            'variables': list(included_descendants),
            'message': 'Including descendants of treatment biases the estimate'
        })
        analysis['recommendations'].append(
            f"Remove {included_descendants} from adjustment set"
        )

    # Check if mediators are included
    mediators = dag.identify_mediators(exposure, outcome)
    included_mediators = proposed_adjustment & mediators

    if included_mediators:
        analysis['issues'].append({
            'type': 'mediator_adjustment',
            'variables': list(included_mediators),
            'message': 'Adjusting for mediators blocks part of the causal effect'
        })
        analysis['recommendations'].append(
            f"Remove mediator(s) {included_mediators} to estimate total effect"
        )

    # Check for missing confounders
    confounders = identify_confounders(dag, exposure, outcome)
    missing_confounders = confounders - proposed_adjustment

    if missing_confounders:
        # Check if still valid despite missing
        if is_valid:
            analysis['notes'] = [
                f"Confounders {missing_confounders} not included but set is still valid"
            ]
        else:
            analysis['issues'].append({
                'type': 'missing_confounder',
                'variables': list(missing_confounders),
                'message': 'Not all confounders are adjusted for'
            })

    # Compare to optimal
    result = find_adjustment_sets(dag, exposure, outcome)
    if result.minimal_adjustment_set:
        if proposed_adjustment != result.minimal_adjustment_set:
            analysis['recommendations'].append(
                f"Consider minimal adjustment set: {result.minimal_adjustment_set}"
            )

    return analysis
