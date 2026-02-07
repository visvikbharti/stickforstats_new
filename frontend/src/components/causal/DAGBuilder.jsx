/**
 * DAG Builder Component
 * =====================
 * Interactive visual editor for creating and editing Directed Acyclic Graphs (DAGs)
 * for causal inference analysis.
 *
 * Features:
 * - Drag-and-drop node creation
 * - Click-and-drag edge creation
 * - Node/edge selection and deletion
 * - Treatment/Outcome node designation
 * - Confounder/Mediator/Collider visualization
 * - Export DAG as JSON or image
 * - Backend integration for causal analysis
 *
 * Author: StickForStats Team
 * Created: December 27, 2025
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  Tooltip,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Save as SaveIcon,
  FolderOpen as LoadIcon,
  PhotoCamera as ExportIcon,
  PlayArrow as AnalyzeIcon,
  Clear as ClearIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Styled components
const DAGContainer = styled(Paper)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: 500,
  backgroundColor: theme.palette.mode === 'dark' ? '#1a1a2e' : '#fafafa',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  border: `1px solid ${theme.palette.divider}`
}));

const Toolbar = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
  flexWrap: 'wrap',
  alignItems: 'center'
}));

const Legend = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing(1),
  right: theme.spacing(1),
  padding: theme.spacing(1),
  backgroundColor: theme.palette.mode === 'dark'
    ? 'rgba(0,0,0,0.7)'
    : 'rgba(255,255,255,0.9)',
  borderRadius: theme.shape.borderRadius,
  fontSize: '0.75rem'
}));

// Node type colors
const NODE_COLORS = {
  treatment: '#4caf50',  // Green
  outcome: '#f44336',    // Red
  confounder: '#ff9800', // Orange
  mediator: '#2196f3',   // Blue
  collider: '#9c27b0',   // Purple
  default: '#757575'     // Gray
};

const DAGBuilder = ({
  initialNodes = [],
  initialEdges = [],
  onDAGChange,
  onAnalyze,
  readOnly = false,
  height = 500
}) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // State
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [treatment, setTreatment] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [isAddingEdge, setIsAddingEdge] = useState(false);
  const [edgeStart, setEdgeStart] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [newNodeDialog, setNewNodeDialog] = useState(false);
  const [newNodeName, setNewNodeName] = useState('');
  const [analysisResults, setAnalysisResults] = useState(null);
  const [error, setError] = useState(null);

  // D3 simulation reference
  const simulationRef = useRef(null);

  // Initialize D3 visualization
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container?.clientWidth || 800;
    const svgHeight = height - 50; // Account for toolbar

    // Clear previous content
    svg.selectAll('*').remove();

    // Set SVG dimensions
    svg
      .attr('width', width)
      .attr('height', svgHeight)
      .attr('viewBox', [0, 0, width, svgHeight]);

    // Add arrow marker definition
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#666');

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Main group for transformations
    const g = svg.append('g').attr('class', 'main-group');

    // Edge group (rendered first, so nodes appear on top)
    g.append('g').attr('class', 'edges');

    // Node group
    g.append('g').attr('class', 'nodes');

    // Temporary edge line for edge creation
    g.append('line')
      .attr('class', 'temp-edge')
      .style('stroke', '#999')
      .style('stroke-width', 2)
      .style('stroke-dasharray', '5,5')
      .style('display', 'none');

    // Initialize force simulation
    simulationRef.current = d3.forceSimulation()
      .force('link', d3.forceLink().id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, svgHeight / 2))
      .force('collision', d3.forceCollide().radius(50));

    updateVisualization();
  }, [height]);

  // Update visualization when nodes/edges change
  useEffect(() => {
    updateVisualization();
  }, [nodes, edges, treatment, outcome, selectedNode, selectedEdge]);

  // Notify parent of changes
  useEffect(() => {
    if (onDAGChange) {
      onDAGChange({ nodes, edges, treatment, outcome });
    }
  }, [nodes, edges, treatment, outcome, onDAGChange]);

  const updateVisualization = useCallback(() => {
    if (!svgRef.current || !simulationRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = svg.select('.main-group');

    // Prepare edge data with source/target objects
    const edgeData = edges.map(e => ({
      ...e,
      source: nodes.find(n => n.id === e.source) || e.source,
      target: nodes.find(n => n.id === e.target) || e.target
    })).filter(e => e.source && e.target);

    // Update edges
    const edgeSelection = g.select('.edges')
      .selectAll('line.edge')
      .data(edgeData, d => `${d.source.id || d.source}-${d.target.id || d.target}`);

    edgeSelection.exit().remove();

    const edgeEnter = edgeSelection.enter()
      .append('line')
      .attr('class', 'edge')
      .style('stroke', '#666')
      .style('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)')
      .on('click', (event, d) => {
        if (!readOnly) {
          event.stopPropagation();
          setSelectedEdge(d);
          setSelectedNode(null);
        }
      });

    const edgeMerge = edgeEnter.merge(edgeSelection);

    edgeMerge
      .style('stroke', d => {
        if (selectedEdge && d.source.id === selectedEdge.source.id && d.target.id === selectedEdge.target.id) {
          return '#1976d2';
        }
        return '#666';
      })
      .style('stroke-width', d => {
        if (selectedEdge && d.source.id === selectedEdge.source.id && d.target.id === selectedEdge.target.id) {
          return 3;
        }
        return 2;
      });

    // Update nodes
    const nodeSelection = g.select('.nodes')
      .selectAll('g.node')
      .data(nodes, d => d.id);

    nodeSelection.exit().remove();

    const nodeEnter = nodeSelection.enter()
      .append('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded)
      )
      .on('click', (event, d) => {
        event.stopPropagation();
        if (isAddingEdge && edgeStart) {
          // Complete edge creation
          if (edgeStart.id !== d.id) {
            addEdge(edgeStart.id, d.id);
          }
          setIsAddingEdge(false);
          setEdgeStart(null);
        } else if (isAddingEdge) {
          // Start edge from this node
          setEdgeStart(d);
        } else {
          setSelectedNode(d);
          setSelectedEdge(null);
        }
      });

    // Add circle to new nodes
    nodeEnter.append('circle')
      .attr('r', 25)
      .style('cursor', 'pointer');

    // Add label to new nodes
    nodeEnter.append('text')
      .attr('dy', 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .style('fill', '#fff');

    const nodeMerge = nodeEnter.merge(nodeSelection);

    // Update node colors based on type
    nodeMerge.select('circle')
      .style('fill', d => {
        if (d.id === treatment) return NODE_COLORS.treatment;
        if (d.id === outcome) return NODE_COLORS.outcome;
        if (d.type) return NODE_COLORS[d.type] || NODE_COLORS.default;
        return NODE_COLORS.default;
      })
      .style('stroke', d => selectedNode?.id === d.id ? '#1976d2' : '#333')
      .style('stroke-width', d => selectedNode?.id === d.id ? 3 : 2);

    // Update labels
    nodeMerge.select('text')
      .text(d => d.label || d.id);

    // Update simulation
    simulationRef.current.nodes(nodes);
    simulationRef.current.force('link').links(edgeData);
    simulationRef.current.alpha(0.3).restart();

    simulationRef.current.on('tick', () => {
      edgeMerge
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      nodeMerge.attr('transform', d => `translate(${d.x},${d.y})`);
    });
  }, [nodes, edges, treatment, outcome, selectedNode, selectedEdge, isAddingEdge, edgeStart, readOnly]);

  // Drag handlers
  const dragStarted = (event, d) => {
    if (readOnly) return;
    if (!event.active) simulationRef.current.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  };

  const dragged = (event, d) => {
    if (readOnly) return;
    d.fx = event.x;
    d.fy = event.y;
  };

  const dragEnded = (event, d) => {
    if (readOnly) return;
    if (!event.active) simulationRef.current.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  };

  // Node operations
  const addNode = (name) => {
    if (!name.trim()) return;

    const id = name.trim().toLowerCase().replace(/\s+/g, '_');
    if (nodes.find(n => n.id === id)) {
      setError('A node with this name already exists');
      return;
    }

    const container = containerRef.current;
    const width = container?.clientWidth || 800;
    const svgHeight = height - 50;

    const newNode = {
      id,
      label: name.trim(),
      x: width / 2 + (Math.random() - 0.5) * 100,
      y: svgHeight / 2 + (Math.random() - 0.5) * 100
    };

    saveHistory();
    setNodes([...nodes, newNode]);
    setNewNodeDialog(false);
    setNewNodeName('');
    setError(null);
  };

  const deleteNode = (nodeId) => {
    saveHistory();
    setNodes(nodes.filter(n => n.id !== nodeId));
    setEdges(edges.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (treatment === nodeId) setTreatment(null);
    if (outcome === nodeId) setOutcome(null);
    setSelectedNode(null);
  };

  // Edge operations
  const addEdge = (sourceId, targetId) => {
    // Check if edge already exists
    if (edges.find(e => e.source === sourceId && e.target === targetId)) {
      setError('This edge already exists');
      return;
    }

    // Check for reverse edge (would create cycle)
    if (edges.find(e => e.source === targetId && e.target === sourceId)) {
      setError('Adding this edge would create a cycle');
      return;
    }

    // Simple cycle detection (would need full DAG validation for complex cases)
    const wouldCreateCycle = checkForCycle(sourceId, targetId);
    if (wouldCreateCycle) {
      setError('Adding this edge would create a cycle');
      return;
    }

    saveHistory();
    setEdges([...edges, { source: sourceId, target: targetId }]);
    setError(null);
  };

  const deleteEdge = (edge) => {
    saveHistory();
    setEdges(edges.filter(e =>
      !(e.source === edge.source.id && e.target === edge.target.id)
    ));
    setSelectedEdge(null);
  };

  // Simple cycle detection using DFS
  const checkForCycle = (newSource, newTarget) => {
    const tempEdges = [...edges, { source: newSource, target: newTarget }];
    const visited = new Set();
    const recStack = new Set();

    const dfs = (nodeId) => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const outEdges = tempEdges.filter(e => e.source === nodeId);
      for (const edge of outEdges) {
        if (!visited.has(edge.target)) {
          if (dfs(edge.target)) return true;
        } else if (recStack.has(edge.target)) {
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true;
      }
    }

    return false;
  };

  // History operations
  const saveHistory = () => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: [...nodes], edges: [...edges], treatment, outcome });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setTreatment(prevState.treatment);
      setOutcome(prevState.outcome);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setTreatment(nextState.treatment);
      setOutcome(nextState.outcome);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const clearAll = () => {
    saveHistory();
    setNodes([]);
    setEdges([]);
    setTreatment(null);
    setOutcome(null);
    setSelectedNode(null);
    setSelectedEdge(null);
  };

  // Export DAG as JSON
  const exportDAG = () => {
    const dagData = {
      nodes: nodes.map(n => ({ id: n.id, label: n.label, type: n.type })),
      edges: edges.map(e => ({
        source: typeof e.source === 'object' ? e.source.id : e.source,
        target: typeof e.target === 'object' ? e.target.id : e.target
      })),
      treatment,
      outcome
    };

    const blob = new Blob([JSON.stringify(dagData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'causal_dag.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import DAG from JSON
  const importDAG = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const dagData = JSON.parse(e.target.result);
        saveHistory();

        const container = containerRef.current;
        const width = container?.clientWidth || 800;
        const svgHeight = height - 50;

        // Add positions to nodes if not present
        const nodesWithPositions = dagData.nodes.map((n, i) => ({
          ...n,
          x: n.x || width / 2 + (Math.random() - 0.5) * 200,
          y: n.y || svgHeight / 2 + (Math.random() - 0.5) * 200
        }));

        setNodes(nodesWithPositions);
        setEdges(dagData.edges);
        setTreatment(dagData.treatment);
        setOutcome(dagData.outcome);
        setError(null);
      } catch (err) {
        setError('Invalid DAG file format');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Analyze DAG
  const handleAnalyze = async () => {
    if (!treatment || !outcome) {
      setError('Please designate both treatment and outcome nodes');
      return;
    }

    if (onAnalyze) {
      const edgeList = edges.map(e => ({
        source: typeof e.source === 'object' ? e.source.id : e.source,
        target: typeof e.target === 'object' ? e.target.id : e.target
      }));

      try {
        const results = await onAnalyze(edgeList, treatment, outcome);
        setAnalysisResults(results);
        setError(null);
      } catch (err) {
        setError(err.message || 'Analysis failed');
      }
    }
  };

  return (
    <Box ref={containerRef}>
      {/* Toolbar */}
      <Toolbar>
        <Tooltip title="Add Variable">
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setNewNodeDialog(true)}
            disabled={readOnly}
          >
            Add Variable
          </Button>
        </Tooltip>

        <Tooltip title="Add Edge (click two nodes)">
          <Button
            size="small"
            variant={isAddingEdge ? "contained" : "outlined"}
            onClick={() => {
              setIsAddingEdge(!isAddingEdge);
              setEdgeStart(null);
            }}
            disabled={readOnly}
          >
            {isAddingEdge ? 'Cancel Edge' : 'Add Edge'}
          </Button>
        </Tooltip>

        <Divider orientation="vertical" flexItem />

        <Tooltip title="Undo">
          <IconButton size="small" onClick={undo} disabled={historyIndex <= 0 || readOnly}>
            <UndoIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Redo">
          <IconButton size="small" onClick={redo} disabled={historyIndex >= history.length - 1 || readOnly}>
            <RedoIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Clear All">
          <IconButton size="small" onClick={clearAll} disabled={readOnly}>
            <ClearIcon />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem />

        <Tooltip title="Export DAG">
          <IconButton size="small" onClick={exportDAG}>
            <SaveIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Import DAG">
          <IconButton size="small" component="label" disabled={readOnly}>
            <LoadIcon />
            <input type="file" hidden accept=".json" onChange={importDAG} />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem />

        <Tooltip title="Analyze Causal Structure">
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<AnalyzeIcon />}
            onClick={handleAnalyze}
            disabled={!treatment || !outcome}
          >
            Analyze
          </Button>
        </Tooltip>

        <Box sx={{ flexGrow: 1 }} />

        {isAddingEdge && (
          <Chip
            label={edgeStart ? `Click target node (from ${edgeStart.label})` : 'Click source node'}
            color="info"
            size="small"
          />
        )}
      </Toolbar>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ m: 1 }}>
          {error}
        </Alert>
      )}

      {/* SVG Container */}
      <DAGContainer sx={{ height: height - 50 }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />

        {/* Legend */}
        <Legend>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: NODE_COLORS.treatment }} />
              <Typography variant="caption">Treatment</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: NODE_COLORS.outcome }} />
              <Typography variant="caption">Outcome</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: NODE_COLORS.confounder }} />
              <Typography variant="caption">Confounder</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: NODE_COLORS.mediator }} />
              <Typography variant="caption">Mediator</Typography>
            </Box>
          </Stack>
        </Legend>
      </DAGContainer>

      {/* Node Properties Panel */}
      {selectedNode && !readOnly && (
        <Paper sx={{ p: 2, mt: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="subtitle2">
              Selected: <strong>{selectedNode.label}</strong>
            </Typography>

            <Button
              size="small"
              variant={treatment === selectedNode.id ? "contained" : "outlined"}
              color="success"
              onClick={() => setTreatment(treatment === selectedNode.id ? null : selectedNode.id)}
            >
              {treatment === selectedNode.id ? 'Treatment' : 'Set as Treatment'}
            </Button>

            <Button
              size="small"
              variant={outcome === selectedNode.id ? "contained" : "outlined"}
              color="error"
              onClick={() => setOutcome(outcome === selectedNode.id ? null : selectedNode.id)}
            >
              {outcome === selectedNode.id ? 'Outcome' : 'Set as Outcome'}
            </Button>

            <Box sx={{ flexGrow: 1 }} />

            <Button
              size="small"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => deleteNode(selectedNode.id)}
            >
              Delete
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Edge Properties Panel */}
      {selectedEdge && !readOnly && (
        <Paper sx={{ p: 2, mt: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="subtitle2">
              Selected Edge: <strong>{selectedEdge.source.label} → {selectedEdge.target.label}</strong>
            </Typography>

            <Box sx={{ flexGrow: 1 }} />

            <Button
              size="small"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => deleteEdge(selectedEdge)}
            >
              Delete Edge
            </Button>
          </Stack>
        </Paper>
      )}

      {/* New Node Dialog */}
      <Dialog open={newNodeDialog} onClose={() => setNewNodeDialog(false)}>
        <DialogTitle>Add New Variable</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Variable Name"
            fullWidth
            value={newNodeName}
            onChange={(e) => setNewNodeName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addNode(newNodeName);
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewNodeDialog(false)}>Cancel</Button>
          <Button onClick={() => addNode(newNodeName)} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Analysis Results */}
      {analysisResults && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Causal Analysis Results
          </Typography>

          {analysisResults.confounders && analysisResults.confounders.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="warning.main">
                Confounders Identified:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                {analysisResults.confounders.map(c => (
                  <Chip key={c} label={c} size="small" color="warning" />
                ))}
              </Stack>
            </Box>
          )}

          {analysisResults.adjustment_sets && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="primary">
                Minimal Adjustment Sets:
              </Typography>
              {analysisResults.adjustment_sets.map((set, i) => (
                <Stack key={i} direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  {set.map(v => (
                    <Chip key={v} label={v} size="small" variant="outlined" />
                  ))}
                </Stack>
              ))}
            </Box>
          )}

          {analysisResults.causal_effect_identifiable !== undefined && (
            <Alert
              severity={analysisResults.causal_effect_identifiable ? "success" : "warning"}
              sx={{ mt: 1 }}
            >
              {analysisResults.causal_effect_identifiable
                ? 'Causal effect is identifiable with the specified adjustment set(s)'
                : 'Causal effect may not be identifiable - check for unblocked backdoor paths'
              }
            </Alert>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default DAGBuilder;
