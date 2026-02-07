"""
D-Separation Module
====================

Implements d-separation (directed separation) for causal DAGs.

D-separation is a graphical criterion for determining conditional
independence: if X and Y are d-separated given Z, then X and Y are
conditionally independent given Z in any distribution faithful to the DAG.

Key Concepts:
- A path is BLOCKED if:
  1. It contains a chain (A -> B -> C) or fork (A <- B -> C)
     where B is in the conditioning set
  2. It contains a collider (A -> B <- C) where neither B nor
     any descendant of B is in the conditioning set

References:
    Pearl, J. (2009). Causality: Models, Reasoning, and Inference.
    Koller, D., & Friedman, N. (2009). Probabilistic Graphical Models.

Created: December 26, 2025
"""

from dataclasses import dataclass
from typing import Set, List, Dict, Any, Optional, Tuple
from .dag import CausalDAG


@dataclass
class DSeparationResult:
    """Result of d-separation test."""
    source: str
    target: str
    conditioning_set: Set[str]
    d_separated: bool
    blocked_paths: List[List[str]]
    open_paths: List[List[str]]
    explanation: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            'source': self.source,
            'target': self.target,
            'conditioning_set': list(self.conditioning_set),
            'd_separated': self.d_separated,
            'blocked_paths': self.blocked_paths,
            'open_paths': self.open_paths,
            'explanation': self.explanation
        }


def is_path_blocked(
    dag: CausalDAG,
    path: List[str],
    conditioning_set: Set[str]
) -> Tuple[bool, str]:
    """
    Check if a path is blocked by a conditioning set.

    A path is blocked if ANY node on the path blocks it:
    1. Chain (A -> B -> C) or Fork (A <- B -> C): blocked if B is conditioned on
    2. Collider (A -> B <- C): blocked if B and all descendants of B are NOT conditioned on

    Args:
        dag: The causal DAG
        path: A path as list of node names
        conditioning_set: Set of nodes being conditioned on

    Returns:
        Tuple of (is_blocked, reason)
    """
    if len(path) < 3:
        # Path with less than 3 nodes cannot be blocked
        return False, "Path too short to be blocked"

    # Check each triple in the path
    for i in range(1, len(path) - 1):
        prev_node = path[i - 1]
        curr_node = path[i]
        next_node = path[i + 1]

        # Determine the type of triple
        prev_to_curr = dag.has_edge(prev_node, curr_node)
        curr_to_prev = dag.has_edge(curr_node, prev_node)
        curr_to_next = dag.has_edge(curr_node, next_node)
        next_to_curr = dag.has_edge(next_node, curr_node)

        # Check for collider: -> curr <-
        is_collider = prev_to_curr and next_to_curr

        if is_collider:
            # Collider: blocked UNLESS curr or descendant is conditioned on
            curr_descendants = dag.descendants(curr_node)
            conditioned_descendants = curr_descendants & conditioning_set

            if curr_node not in conditioning_set and not conditioned_descendants:
                # Collider is not activated - path is blocked
                return True, f"Collider {curr_node} blocks path (not conditioned on)"
        else:
            # Chain or Fork: blocked IF curr is conditioned on
            if curr_node in conditioning_set:
                return True, f"Non-collider {curr_node} blocks path (conditioned on)"

    return False, "Path is open"


def is_d_separated(
    dag: CausalDAG,
    source: str,
    target: str,
    conditioning_set: Optional[Set[str]] = None
) -> DSeparationResult:
    """
    Test if source and target are d-separated given conditioning set.

    Two nodes are d-separated if ALL paths between them are blocked.

    Args:
        dag: The causal DAG
        source: Source node
        target: Target node
        conditioning_set: Set of nodes to condition on (empty set if None)

    Returns:
        DSeparationResult with full analysis

    Example:
        # Classic confounding structure: Z -> X, Z -> Y, X -> Y
        dag = create_dag_from_edges([('Z', 'X'), ('Z', 'Y'), ('X', 'Y')])

        # X and Y are NOT d-separated (empty conditioning)
        result = is_d_separated(dag, 'X', 'Y')
        # result.d_separated = False (path X <- Z -> Y is open)

        # X and Y ARE d-separated given Z
        result = is_d_separated(dag, 'X', 'Y', {'Z'})
        # result.d_separated = True (Z blocks the backdoor path)
    """
    if conditioning_set is None:
        conditioning_set = set()

    # Validate nodes exist
    if source not in dag.nodes:
        raise ValueError(f"Source node '{source}' not in DAG")
    if target not in dag.nodes:
        raise ValueError(f"Target node '{target}' not in DAG")
    for node in conditioning_set:
        if node not in dag.nodes:
            raise ValueError(f"Conditioning node '{node}' not in DAG")

    # Get all paths between source and target
    all_paths = dag.all_paths(source, target)

    blocked_paths = []
    open_paths = []

    for path in all_paths:
        is_blocked, reason = is_path_blocked(dag, path, conditioning_set)
        if is_blocked:
            blocked_paths.append(path)
        else:
            open_paths.append(path)

    # D-separated if ALL paths are blocked
    d_separated = len(open_paths) == 0 and len(all_paths) > 0

    # Special case: no paths means nodes are d-separated trivially
    if len(all_paths) == 0:
        d_separated = True
        explanation = f"No paths exist between {source} and {target}"
    elif d_separated:
        explanation = f"All {len(blocked_paths)} path(s) between {source} and {target} are blocked"
        if conditioning_set:
            explanation += f" by conditioning on {{{', '.join(conditioning_set)}}}"
    else:
        explanation = f"{len(open_paths)} open path(s) between {source} and {target}"
        if conditioning_set:
            explanation += f" despite conditioning on {{{', '.join(conditioning_set)}}}"

    return DSeparationResult(
        source=source,
        target=target,
        conditioning_set=conditioning_set,
        d_separated=d_separated,
        blocked_paths=blocked_paths,
        open_paths=open_paths,
        explanation=explanation
    )


def find_d_separating_sets(
    dag: CausalDAG,
    source: str,
    target: str,
    max_size: Optional[int] = None,
    required_nodes: Optional[Set[str]] = None,
    forbidden_nodes: Optional[Set[str]] = None
) -> List[Set[str]]:
    """
    Find all minimal d-separating sets between source and target.

    A minimal d-separating set has the property that removing any
    node from it would make source and target d-connected.

    Args:
        dag: The causal DAG
        source: Source node
        target: Target node
        max_size: Maximum size of conditioning sets to consider
        required_nodes: Nodes that must be in any valid set
        forbidden_nodes: Nodes that cannot be in any valid set

    Returns:
        List of d-separating sets (may be empty if none exist)
    """
    if required_nodes is None:
        required_nodes = set()
    if forbidden_nodes is None:
        forbidden_nodes = set()

    # Cannot condition on source or target
    forbidden_nodes = forbidden_nodes | {source, target}

    # Available nodes for conditioning
    available_nodes = set(dag.observed_nodes) - forbidden_nodes

    if max_size is None:
        max_size = len(available_nodes)

    d_sep_sets = []

    # Start with required nodes
    if required_nodes:
        result = is_d_separated(dag, source, target, required_nodes)
        if result.d_separated:
            d_sep_sets.append(required_nodes.copy())

    # Try all combinations of increasing size
    from itertools import combinations

    remaining_nodes = available_nodes - required_nodes

    for size in range(max_size + 1):
        for combo in combinations(remaining_nodes, size):
            conditioning_set = required_nodes | set(combo)

            result = is_d_separated(dag, source, target, conditioning_set)

            if result.d_separated:
                # Check if minimal (no proper subset also d-separates)
                is_minimal = True
                for existing in d_sep_sets:
                    if existing < conditioning_set:
                        is_minimal = False
                        break

                if is_minimal:
                    # Remove any supersets
                    d_sep_sets = [s for s in d_sep_sets
                                  if not conditioning_set < s]
                    d_sep_sets.append(conditioning_set)

    return d_sep_sets


def identify_conditional_independencies(
    dag: CausalDAG,
    max_conditioning_size: int = 3
) -> List[Dict[str, Any]]:
    """
    Identify all conditional independencies implied by the DAG.

    This is useful for:
    1. Testing DAG assumptions against data
    2. Understanding the independence structure
    3. Model checking and validation

    Args:
        dag: The causal DAG
        max_conditioning_size: Maximum size of conditioning sets to check

    Returns:
        List of implied conditional independencies

    Example:
        For DAG: X -> Y -> Z
        Returns: [
            {'X': 'X', 'Y': 'Z', 'given': {'Y'}, 'type': 'conditional'}
        ]
    """
    from itertools import combinations

    independencies = []
    nodes = dag.observed_nodes

    # Check all pairs of nodes
    for i, node1 in enumerate(nodes):
        for node2 in nodes[i + 1:]:
            other_nodes = [n for n in nodes if n not in [node1, node2]]

            # Check marginal independence
            result = is_d_separated(dag, node1, node2, set())
            if result.d_separated:
                independencies.append({
                    'X': node1,
                    'Y': node2,
                    'given': set(),
                    'type': 'marginal',
                    'explanation': result.explanation
                })
            else:
                # Check conditional independencies
                for size in range(1, min(max_conditioning_size + 1, len(other_nodes) + 1)):
                    for combo in combinations(other_nodes, size):
                        conditioning_set = set(combo)
                        result = is_d_separated(dag, node1, node2, conditioning_set)

                        if result.d_separated:
                            independencies.append({
                                'X': node1,
                                'Y': node2,
                                'given': conditioning_set,
                                'type': 'conditional',
                                'explanation': result.explanation
                            })

    return independencies


def test_d_separation_all_pairs(
    dag: CausalDAG,
    conditioning_set: Optional[Set[str]] = None
) -> Dict[Tuple[str, str], bool]:
    """
    Test d-separation for all pairs of nodes.

    Useful for understanding the overall independence structure
    implied by conditioning on a set of variables.

    Args:
        dag: The causal DAG
        conditioning_set: Set of nodes to condition on

    Returns:
        Dictionary mapping (node1, node2) -> is_d_separated
    """
    if conditioning_set is None:
        conditioning_set = set()

    results = {}
    nodes = dag.nodes

    for i, node1 in enumerate(nodes):
        for node2 in nodes[i + 1:]:
            if node1 in conditioning_set or node2 in conditioning_set:
                continue

            result = is_d_separated(dag, node1, node2, conditioning_set)
            results[(node1, node2)] = result.d_separated

    return results


def explain_d_connection(
    dag: CausalDAG,
    source: str,
    target: str,
    conditioning_set: Optional[Set[str]] = None
) -> Dict[str, Any]:
    """
    Provide detailed explanation of why two nodes are d-connected.

    Useful for understanding spurious associations and planning
    adjustments.

    Args:
        dag: The causal DAG
        source: Source node
        target: Target node
        conditioning_set: Current conditioning set

    Returns:
        Detailed explanation including open paths and suggestions
    """
    if conditioning_set is None:
        conditioning_set = set()

    result = is_d_separated(dag, source, target, conditioning_set)

    if result.d_separated:
        return {
            'status': 'd-separated',
            'message': f'{source} and {target} are d-separated given {{{", ".join(conditioning_set) if conditioning_set else "nothing"}}}',
            'open_paths': [],
            'suggestions': []
        }

    # Analyze open paths
    path_analyses = []
    suggestions = set()

    for path in result.open_paths:
        analysis = {
            'path': ' - '.join(path),
            'type': _classify_path(dag, path, source),
            'non_colliders': [],
            'activated_colliders': []
        }

        # Find non-colliders that could block the path
        for i in range(1, len(path) - 1):
            prev_node = path[i - 1]
            curr_node = path[i]
            next_node = path[i + 1]

            prev_to_curr = dag.has_edge(prev_node, curr_node)
            next_to_curr = dag.has_edge(next_node, curr_node)
            is_collider = prev_to_curr and next_to_curr

            if is_collider:
                if curr_node in conditioning_set or \
                   dag.descendants(curr_node) & conditioning_set:
                    analysis['activated_colliders'].append(curr_node)
            else:
                if curr_node not in conditioning_set:
                    analysis['non_colliders'].append(curr_node)
                    suggestions.add(f"Condition on {curr_node} to block path")

        path_analyses.append(analysis)

    return {
        'status': 'd-connected',
        'message': f'{source} and {target} are d-connected (NOT independent)',
        'n_open_paths': len(result.open_paths),
        'path_analyses': path_analyses,
        'suggestions': list(suggestions)
    }


def _classify_path(dag: CausalDAG, path: List[str], exposure: str) -> str:
    """Classify a path as causal, backdoor, or front-door."""
    if len(path) < 2:
        return 'trivial'

    # Check first edge direction
    first_edge_from_exposure = dag.has_edge(path[0], path[1])

    # If all edges point forward from exposure, it's a causal path
    all_forward = True
    for i in range(len(path) - 1):
        if not dag.has_edge(path[i], path[i + 1]):
            all_forward = False
            break

    if path[0] == exposure and all_forward:
        return 'causal (front-door)'
    elif path[0] == exposure and not first_edge_from_exposure:
        return 'backdoor'
    else:
        return 'non-causal'
