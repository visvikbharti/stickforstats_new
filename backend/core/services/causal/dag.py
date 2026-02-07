"""
DAG (Directed Acyclic Graph) Module
====================================

Provides representation and analysis of causal DAGs.

A causal DAG encodes assumptions about causal relationships:
- Nodes represent variables
- Directed edges represent direct causal effects
- Absence of edge implies no direct causal effect

Key operations:
- Path finding (directed and undirected)
- Ancestor/descendant identification
- Topological sorting
- Cycle detection

References:
    Pearl, J. (2009). Causality: Models, Reasoning, and Inference.
    Spirtes, P., Glymour, C., & Scheines, R. (2000). Causation,
    Prediction, and Search.

Created: December 26, 2025
"""

from dataclasses import dataclass, field
from typing import Dict, List, Set, Optional, Any, Tuple, Union
from enum import Enum
import networkx as nx


class NodeType(Enum):
    """Types of nodes in a causal DAG."""
    EXPOSURE = 'exposure'       # Treatment/intervention variable
    OUTCOME = 'outcome'         # Outcome variable of interest
    CONFOUNDER = 'confounder'   # Common cause of exposure and outcome
    MEDIATOR = 'mediator'       # On causal path from exposure to outcome
    COLLIDER = 'collider'       # Common effect of exposure and outcome
    INSTRUMENT = 'instrument'   # Affects outcome only through exposure
    COVARIATE = 'covariate'     # Other measured variable
    LATENT = 'latent'           # Unmeasured/unobserved variable


@dataclass
class DAGNode:
    """Represents a node (variable) in a causal DAG."""
    name: str
    node_type: NodeType = NodeType.COVARIATE
    observed: bool = True
    description: str = ''
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'node_type': self.node_type.value,
            'observed': self.observed,
            'description': self.description,
            'metadata': self.metadata
        }


@dataclass
class DAGEdge:
    """Represents a directed edge (causal relationship) in a DAG."""
    source: str
    target: str
    edge_type: str = 'causal'  # 'causal', 'selection', 'correlation'
    observed: bool = True
    coefficient: Optional[float] = None
    description: str = ''

    def to_dict(self) -> Dict[str, Any]:
        return {
            'source': self.source,
            'target': self.target,
            'edge_type': self.edge_type,
            'observed': self.observed,
            'coefficient': self.coefficient,
            'description': self.description
        }


class CausalDAG:
    """
    Represents a Causal Directed Acyclic Graph.

    The DAG encodes causal assumptions and enables:
    - Identification of confounders, mediators, colliders
    - D-separation testing
    - Adjustment set calculation
    - Causal effect identification

    Example:
        dag = CausalDAG()
        dag.add_node('X', NodeType.EXPOSURE)
        dag.add_node('Y', NodeType.OUTCOME)
        dag.add_node('Z', NodeType.CONFOUNDER)
        dag.add_edge('Z', 'X')
        dag.add_edge('Z', 'Y')
        dag.add_edge('X', 'Y')

        # Now Z is a confounder that must be adjusted for
    """

    def __init__(self, name: str = 'causal_dag'):
        """Initialize an empty causal DAG."""
        self.name = name
        self._graph = nx.DiGraph()
        self._nodes: Dict[str, DAGNode] = {}
        self._edges: List[DAGEdge] = []
        self._exposure: Optional[str] = None
        self._outcome: Optional[str] = None

    # ==================== Node Operations ====================

    def add_node(
        self,
        name: str,
        node_type: NodeType = NodeType.COVARIATE,
        observed: bool = True,
        description: str = '',
        **metadata
    ) -> None:
        """
        Add a node to the DAG.

        Args:
            name: Variable name
            node_type: Type of node (exposure, outcome, confounder, etc.)
            observed: Whether variable is measured
            description: Optional description
            **metadata: Additional metadata
        """
        node = DAGNode(
            name=name,
            node_type=node_type,
            observed=observed,
            description=description,
            metadata=metadata
        )
        self._nodes[name] = node
        self._graph.add_node(name, **node.to_dict())

        # Track exposure and outcome
        if node_type == NodeType.EXPOSURE:
            self._exposure = name
        elif node_type == NodeType.OUTCOME:
            self._outcome = name

    def remove_node(self, name: str) -> None:
        """Remove a node and all connected edges."""
        if name in self._nodes:
            del self._nodes[name]
            self._graph.remove_node(name)
            self._edges = [e for e in self._edges
                         if e.source != name and e.target != name]
            if self._exposure == name:
                self._exposure = None
            if self._outcome == name:
                self._outcome = None

    def get_node(self, name: str) -> Optional[DAGNode]:
        """Get node by name."""
        return self._nodes.get(name)

    @property
    def nodes(self) -> List[str]:
        """Get all node names."""
        return list(self._nodes.keys())

    @property
    def observed_nodes(self) -> List[str]:
        """Get names of observed (measured) nodes."""
        return [name for name, node in self._nodes.items() if node.observed]

    @property
    def latent_nodes(self) -> List[str]:
        """Get names of latent (unobserved) nodes."""
        return [name for name, node in self._nodes.items() if not node.observed]

    # ==================== Edge Operations ====================

    def add_edge(
        self,
        source: str,
        target: str,
        edge_type: str = 'causal',
        observed: bool = True,
        coefficient: Optional[float] = None,
        description: str = ''
    ) -> None:
        """
        Add a directed edge from source to target.

        Args:
            source: Source node (cause)
            target: Target node (effect)
            edge_type: Type of edge ('causal', 'selection', 'correlation')
            observed: Whether relationship is observed
            coefficient: Optional path coefficient
            description: Optional description
        """
        # Auto-add nodes if not present
        if source not in self._nodes:
            self.add_node(source)
        if target not in self._nodes:
            self.add_node(target)

        edge = DAGEdge(
            source=source,
            target=target,
            edge_type=edge_type,
            observed=observed,
            coefficient=coefficient,
            description=description
        )
        self._edges.append(edge)
        self._graph.add_edge(source, target, **edge.to_dict())

    def remove_edge(self, source: str, target: str) -> None:
        """Remove an edge from the DAG."""
        self._edges = [e for e in self._edges
                      if not (e.source == source and e.target == target)]
        if self._graph.has_edge(source, target):
            self._graph.remove_edge(source, target)

    def has_edge(self, source: str, target: str) -> bool:
        """Check if an edge exists."""
        return self._graph.has_edge(source, target)

    @property
    def edges(self) -> List[Tuple[str, str]]:
        """Get all edges as (source, target) tuples."""
        return list(self._graph.edges())

    # ==================== Graph Properties ====================

    def is_acyclic(self) -> bool:
        """Check if the graph is acyclic (valid DAG)."""
        return nx.is_directed_acyclic_graph(self._graph)

    def find_cycles(self) -> List[List[str]]:
        """Find any cycles in the graph (should be empty for valid DAG)."""
        try:
            cycles = list(nx.simple_cycles(self._graph))
            return cycles
        except nx.NetworkXError:
            return []

    def topological_sort(self) -> List[str]:
        """Return nodes in topological order (causes before effects)."""
        if not self.is_acyclic():
            raise ValueError("Graph contains cycles - not a valid DAG")
        return list(nx.topological_sort(self._graph))

    # ==================== Ancestral Relationships ====================

    def parents(self, node: str) -> Set[str]:
        """Get direct parents (direct causes) of a node."""
        return set(self._graph.predecessors(node))

    def children(self, node: str) -> Set[str]:
        """Get direct children (direct effects) of a node."""
        return set(self._graph.successors(node))

    def ancestors(self, node: str) -> Set[str]:
        """Get all ancestors (all causes, direct and indirect) of a node."""
        return set(nx.ancestors(self._graph, node))

    def descendants(self, node: str) -> Set[str]:
        """Get all descendants (all effects, direct and indirect) of a node."""
        return set(nx.descendants(self._graph, node))

    def is_ancestor(self, potential_ancestor: str, node: str) -> bool:
        """Check if potential_ancestor is an ancestor of node."""
        return potential_ancestor in self.ancestors(node)

    def is_descendant(self, potential_descendant: str, node: str) -> bool:
        """Check if potential_descendant is a descendant of node."""
        return potential_descendant in self.descendants(node)

    # ==================== Path Operations ====================

    def all_paths(self, source: str, target: str) -> List[List[str]]:
        """
        Find all undirected paths between source and target.

        Used for d-separation analysis.
        """
        # Convert to undirected for path finding
        undirected = self._graph.to_undirected()
        try:
            return list(nx.all_simple_paths(undirected, source, target))
        except nx.NetworkXError:
            return []

    def directed_paths(self, source: str, target: str) -> List[List[str]]:
        """Find all directed paths from source to target."""
        try:
            return list(nx.all_simple_paths(self._graph, source, target))
        except nx.NetworkXError:
            return []

    def backdoor_paths(self, exposure: str, outcome: str) -> List[List[str]]:
        """
        Find all backdoor paths from exposure to outcome.

        A backdoor path is a path that begins with an arrow INTO the exposure.
        These are non-causal paths that can create spurious associations.
        """
        backdoor = []
        all_undirected_paths = self.all_paths(exposure, outcome)

        for path in all_undirected_paths:
            if len(path) < 2:
                continue

            # Check if path starts with arrow into exposure (backdoor)
            second_node = path[1]

            # It's a backdoor if second_node -> exposure
            if self.has_edge(second_node, exposure):
                backdoor.append(path)

        return backdoor

    def front_door_paths(self, exposure: str, outcome: str) -> List[List[str]]:
        """
        Find all front-door (causal) paths from exposure to outcome.

        These are directed paths that represent the causal effect.
        """
        return self.directed_paths(exposure, outcome)

    # ==================== Special Node Identification ====================

    def identify_confounders(
        self,
        exposure: Optional[str] = None,
        outcome: Optional[str] = None
    ) -> Set[str]:
        """
        Identify confounders: common causes of exposure and outcome.

        A confounder Z satisfies:
        1. Z is a cause of exposure (Z -> ... -> X)
        2. Z is a cause of outcome (Z -> ... -> Y)
        3. Z is not on the causal path from X to Y
        """
        exposure = exposure or self._exposure
        outcome = outcome or self._outcome

        if not exposure or not outcome:
            raise ValueError("Must specify exposure and outcome")

        confounders = set()

        # Get ancestors of both exposure and outcome
        exposure_ancestors = self.ancestors(exposure)
        outcome_ancestors = self.ancestors(outcome)

        # Common ancestors are potential confounders
        common_ancestors = exposure_ancestors & outcome_ancestors

        # Filter out nodes on the causal path
        causal_paths = self.directed_paths(exposure, outcome)
        nodes_on_causal_path = set()
        for path in causal_paths:
            nodes_on_causal_path.update(path)

        for node in common_ancestors:
            if node not in nodes_on_causal_path:
                confounders.add(node)

        return confounders

    def identify_mediators(
        self,
        exposure: Optional[str] = None,
        outcome: Optional[str] = None
    ) -> Set[str]:
        """
        Identify mediators: nodes on the causal path from exposure to outcome.
        """
        exposure = exposure or self._exposure
        outcome = outcome or self._outcome

        if not exposure or not outcome:
            raise ValueError("Must specify exposure and outcome")

        mediators = set()
        causal_paths = self.directed_paths(exposure, outcome)

        for path in causal_paths:
            # Exclude exposure and outcome themselves
            mediators.update(path[1:-1])

        return mediators

    def identify_colliders(self, path: List[str]) -> Set[str]:
        """
        Identify colliders on a given path.

        A node is a collider on a path if arrows point INTO it from both sides.
        Pattern: ... -> Z <- ...
        """
        colliders = set()

        for i in range(1, len(path) - 1):
            prev_node = path[i - 1]
            curr_node = path[i]
            next_node = path[i + 1]

            # Check if arrows point into curr_node from both directions
            # prev -> curr and next -> curr
            if self.has_edge(prev_node, curr_node) and self.has_edge(next_node, curr_node):
                colliders.add(curr_node)

        return colliders

    def identify_instruments(
        self,
        exposure: Optional[str] = None,
        outcome: Optional[str] = None
    ) -> Set[str]:
        """
        Identify potential instrumental variables.

        An instrument Z for the effect of X on Y satisfies:
        1. Z affects X (relevance)
        2. Z affects Y only through X (exclusion restriction)
        3. Z is not confounded with Y (independence)
        """
        exposure = exposure or self._exposure
        outcome = outcome or self._outcome

        if not exposure or not outcome:
            raise ValueError("Must specify exposure and outcome")

        instruments = set()

        for node in self.nodes:
            if node in [exposure, outcome]:
                continue

            # Check if Z affects X
            if not (self.has_edge(node, exposure) or
                    exposure in self.descendants(node)):
                continue

            # Check exclusion: Z should only affect Y through X
            # Remove X and check if Z still affects Y
            z_to_y_paths = self.directed_paths(node, outcome)
            affects_y_directly = False

            for path in z_to_y_paths:
                if exposure not in path:
                    affects_y_directly = True
                    break

            if affects_y_directly:
                continue

            # Check independence: Z should not share confounders with Y
            confounders = self.identify_confounders(node, outcome)
            if not confounders:
                instruments.add(node)

        return instruments

    # ==================== Export/Import ====================

    def to_dict(self) -> Dict[str, Any]:
        """Convert DAG to dictionary representation."""
        return {
            'name': self.name,
            'nodes': [node.to_dict() for node in self._nodes.values()],
            'edges': [edge.to_dict() for edge in self._edges],
            'exposure': self._exposure,
            'outcome': self._outcome
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CausalDAG':
        """Create DAG from dictionary representation."""
        dag = cls(name=data.get('name', 'causal_dag'))

        for node_data in data.get('nodes', []):
            dag.add_node(
                name=node_data['name'],
                node_type=NodeType(node_data.get('node_type', 'covariate')),
                observed=node_data.get('observed', True),
                description=node_data.get('description', ''),
                **node_data.get('metadata', {})
            )

        for edge_data in data.get('edges', []):
            dag.add_edge(
                source=edge_data['source'],
                target=edge_data['target'],
                edge_type=edge_data.get('edge_type', 'causal'),
                observed=edge_data.get('observed', True),
                coefficient=edge_data.get('coefficient'),
                description=edge_data.get('description', '')
            )

        return dag

    def to_networkx(self) -> nx.DiGraph:
        """Get underlying NetworkX DiGraph."""
        return self._graph.copy()

    def to_adjacency_list(self) -> Dict[str, List[str]]:
        """Convert to adjacency list format."""
        adj = {}
        for node in self.nodes:
            adj[node] = list(self.children(node))
        return adj

    def __repr__(self) -> str:
        return f"CausalDAG(nodes={len(self.nodes)}, edges={len(self.edges)})"


def create_dag_from_edges(
    edges: List[Tuple[str, str]],
    exposure: Optional[str] = None,
    outcome: Optional[str] = None,
    name: str = 'causal_dag'
) -> CausalDAG:
    """
    Create a CausalDAG from a list of edges.

    Args:
        edges: List of (source, target) tuples
        exposure: Name of exposure/treatment variable
        outcome: Name of outcome variable
        name: Name for the DAG

    Returns:
        CausalDAG object

    Example:
        dag = create_dag_from_edges([
            ('Z', 'X'),
            ('Z', 'Y'),
            ('X', 'Y')
        ], exposure='X', outcome='Y')
    """
    dag = CausalDAG(name=name)

    # Collect all nodes
    nodes = set()
    for source, target in edges:
        nodes.add(source)
        nodes.add(target)

    # Add nodes with appropriate types
    for node in nodes:
        if node == exposure:
            dag.add_node(node, NodeType.EXPOSURE)
        elif node == outcome:
            dag.add_node(node, NodeType.OUTCOME)
        else:
            dag.add_node(node, NodeType.COVARIATE)

    # Add edges
    for source, target in edges:
        dag.add_edge(source, target)

    return dag
