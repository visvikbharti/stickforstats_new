"""
Pipeline Tracking System for Analysis Reproducibility
=====================================================
Created: 2025-01-10
Author: StickForStats Development Team

Track every step of the analysis pipeline, including all parameters,
decisions, and transformations. This ensures complete transparency
and reproducibility of the analytical workflow.
"""

import time
import uuid
import functools
import inspect
from datetime import datetime
from typing import Dict, List, Any, Optional, Callable, Union
from contextlib import contextmanager
from dataclasses import dataclass, field
import logging
import traceback

logger = logging.getLogger(__name__)


@dataclass
class PipelineStep:
    """A single step in the analysis pipeline"""
    step_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str = ""
    module: str = ""
    function: str = ""
    timestamp: datetime = field(default_factory=datetime.now)
    duration: float = 0.0
    input_params: Dict[str, Any] = field(default_factory=dict)
    output_summary: Dict[str, Any] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    parent_step_id: Optional[str] = None
    children_step_ids: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DecisionPoint:
    """A decision point in the analysis"""
    decision_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    timestamp: datetime = field(default_factory=datetime.now)
    decision_type: str = ""
    options_available: List[str] = field(default_factory=list)
    option_chosen: str = ""
    rationale: str = ""
    automated: bool = False
    confidence: Optional[float] = None
    based_on: Dict[str, Any] = field(default_factory=dict)  # What data/tests informed this decision
    impact: str = ""  # Description of impact on analysis


class PipelineTracker:
    """
    Track and record every step of the analysis pipeline
    
    This class provides decorators and context managers to automatically
    track function calls, parameters, and results throughout the analysis.
    """
    
    def __init__(self):
        """Initialize pipeline tracker"""
        self.steps: List[PipelineStep] = []
        self.decision_points: List[DecisionPoint] = []
        self.current_step_id: Optional[str] = None
        self.step_stack: List[str] = []  # For nested tracking
        self.is_tracking = True
        self.auto_capture_params = True
        self.capture_output = True
        logger.info("PipelineTracker initialized")
    
    def track_step(self, 
                  name: Optional[str] = None,
                  module: Optional[str] = None,
                  capture_params: bool = True,
                  capture_output: bool = True):
        """
        Decorator to track a function as a pipeline step
        
        Usage:
            @tracker.track_step(name="Load Data")
            def load_data(filepath):
                return pd.read_csv(filepath)
        """
        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                if not self.is_tracking:
                    return func(*args, **kwargs)
                
                # Create step
                step = PipelineStep(
                    name=name or func.__name__,
                    module=module or func.__module__,
                    function=func.__name__,
                    parent_step_id=self.current_step_id
                )
                
                # Capture input parameters
                if capture_params:
                    step.input_params = self._capture_parameters(func, args, kwargs)
                
                # Track timing
                start_time = time.time()
                
                # Execute function
                try:
                    # Update current step
                    parent_id = self.current_step_id
                    self.current_step_id = step.step_id
                    self.step_stack.append(step.step_id)
                    
                    # Run function
                    result = func(*args, **kwargs)
                    
                    # Capture output summary
                    if capture_output:
                        step.output_summary = self._summarize_output(result)
                    
                    return result
                    
                except Warning as w:
                    step.warnings.append(str(w))
                    logger.warning(f"Warning in step '{step.name}': {w}")
                    raise
                    
                except Exception as e:
                    step.errors.append(str(e))
                    step.errors.append(traceback.format_exc())
                    logger.error(f"Error in step '{step.name}': {e}")
                    raise
                    
                finally:
                    # Record duration
                    step.duration = time.time() - start_time
                    
                    # Restore parent step
                    self.step_stack.pop()
                    self.current_step_id = parent_id
                    
                    # Add to parent's children if applicable
                    if parent_id:
                        parent_step = self._get_step(parent_id)
                        if parent_step:
                            parent_step.children_step_ids.append(step.step_id)
                    
                    # Record step
                    self.steps.append(step)
                    logger.debug(f"Tracked step: {step.name} ({step.duration:.3f}s)")
            
            return wrapper
        return decorator
    
    @contextmanager
    def track_context(self,
                     name: str,
                     module: Optional[str] = None,
                     metadata: Optional[Dict[str, Any]] = None):
        """
        Context manager to track a block of code as a pipeline step
        
        Usage:
            with tracker.track_context("Data Preprocessing"):
                # preprocessing code
                pass
        """
        if not self.is_tracking:
            yield
            return
        
        # Create step
        step = PipelineStep(
            name=name,
            module=module or "context",
            function="block",
            parent_step_id=self.current_step_id,
            metadata=metadata or {}
        )
        
        # Track timing
        start_time = time.time()
        
        # Update current step
        parent_id = self.current_step_id
        self.current_step_id = step.step_id
        self.step_stack.append(step.step_id)
        
        try:
            yield step
        except Warning as w:
            step.warnings.append(str(w))
            logger.warning(f"Warning in context '{name}': {w}")
            raise
        except Exception as e:
            step.errors.append(str(e))
            logger.error(f"Error in context '{name}': {e}")
            raise
        finally:
            # Record duration
            step.duration = time.time() - start_time
            
            # Restore parent step
            self.step_stack.pop()
            self.current_step_id = parent_id
            
            # Add to parent's children
            if parent_id:
                parent_step = self._get_step(parent_id)
                if parent_step:
                    parent_step.children_step_ids.append(step.step_id)
            
            # Record step
            self.steps.append(step)
            logger.debug(f"Tracked context: {name} ({step.duration:.3f}s)")
    
    def record_decision(self,
                       decision_type: str,
                       options: List[str],
                       chosen: str,
                       rationale: str = "",
                       automated: bool = False,
                       confidence: Optional[float] = None,
                       based_on: Optional[Dict[str, Any]] = None,
                       impact: str = "") -> DecisionPoint:
        """
        Record an analytical decision point
        
        Args:
            decision_type: Type of decision (e.g., 'test_selection', 'correction_method')
            options: Available options
            chosen: Option that was chosen
            rationale: Explanation for the choice
            automated: Whether decision was made automatically
            confidence: Confidence level (0-1) if automated
            based_on: Data/tests that informed the decision
            impact: Description of impact on analysis
            
        Returns:
            DecisionPoint object
        """
        decision = DecisionPoint(
            decision_type=decision_type,
            options_available=options,
            option_chosen=chosen,
            rationale=rationale,
            automated=automated,
            confidence=confidence,
            based_on=based_on or {},
            impact=impact
        )
        
        self.decision_points.append(decision)
        
        log_msg = f"Recorded decision: {decision_type} -> {chosen}"
        if automated:
            log_msg += f" (automated, confidence={confidence:.2f})"
        logger.info(log_msg)
        
        return decision
    
    def _capture_parameters(self, 
                          func: Callable,
                          args: tuple,
                          kwargs: dict) -> Dict[str, Any]:
        """Capture function parameters"""
        params = {}
        
        try:
            # Get function signature
            sig = inspect.signature(func)
            bound_args = sig.bind(*args, **kwargs)
            bound_args.apply_defaults()
            
            # Convert to serializable format
            for name, value in bound_args.arguments.items():
                params[name] = self._make_serializable(value)
                
        except Exception as e:
            logger.warning(f"Could not capture parameters: {e}")
            params = {
                'args': str(args)[:100],
                'kwargs': str(kwargs)[:100]
            }
        
        return params
    
    def _summarize_output(self, output: Any) -> Dict[str, Any]:
        """Create summary of function output"""
        summary = {
            'type': type(output).__name__
        }
        
        try:
            # Summarize based on type
            if output is None:
                summary['value'] = None
                
            elif isinstance(output, (int, float, str, bool)):
                summary['value'] = output
                
            elif isinstance(output, dict):
                summary['n_keys'] = len(output)
                summary['keys'] = list(output.keys())[:10]
                
            elif isinstance(output, (list, tuple)):
                summary['length'] = len(output)
                if len(output) > 0:
                    summary['first_element_type'] = type(output[0]).__name__
                    
            elif hasattr(output, 'shape'):  # numpy/pandas
                summary['shape'] = output.shape
                if hasattr(output, 'dtype'):
                    summary['dtype'] = str(output.dtype)
                    
            elif hasattr(output, '__dict__'):  # Custom objects
                summary['attributes'] = list(output.__dict__.keys())[:10]
                
        except Exception as e:
            logger.warning(f"Could not summarize output: {e}")
            summary['error'] = str(e)
        
        return summary
    
    def _make_serializable(self, value: Any, max_depth: int = 3, depth: int = 0) -> Any:
        """Convert value to JSON-serializable format"""
        if depth > max_depth:
            return f"<{type(value).__name__}>"
        
        if value is None or isinstance(value, (bool, int, float, str)):
            return value
        
        elif isinstance(value, (list, tuple)):
            if len(value) > 10:
                return [self._make_serializable(v, max_depth, depth+1) for v in value[:5]] + \
                       [f"... {len(value)-5} more items"]
            return [self._make_serializable(v, max_depth, depth+1) for v in value]
        
        elif isinstance(value, dict):
            if len(value) > 10:
                keys = list(value.keys())[:5]
                result = {k: self._make_serializable(value[k], max_depth, depth+1) for k in keys}
                result['...'] = f"{len(value)-5} more keys"
                return result
            return {k: self._make_serializable(v, max_depth, depth+1) for k, v in value.items()}
        
        elif hasattr(value, 'shape'):  # numpy/pandas
            return f"<{type(value).__name__} shape={value.shape}>"
        
        elif hasattr(value, '__len__'):
            return f"<{type(value).__name__} len={len(value)}>"
        
        else:
            return f"<{type(value).__name__}>"
    
    def _get_step(self, step_id: str) -> Optional[PipelineStep]:
        """Get step by ID"""
        for step in self.steps:
            if step.step_id == step_id:
                return step
        return None
    
    def get_pipeline_graph(self) -> Dict[str, Any]:
        """
        Get pipeline as a graph structure
        
        Returns:
            Dictionary with nodes (steps) and edges (parent-child relationships)
        """
        nodes = []
        edges = []
        
        for step in self.steps:
            # Create node
            node = {
                'id': step.step_id,
                'label': step.name,
                'module': step.module,
                'duration': step.duration,
                'has_errors': len(step.errors) > 0,
                'has_warnings': len(step.warnings) > 0
            }
            nodes.append(node)
            
            # Create edges
            for child_id in step.children_step_ids:
                edges.append({
                    'from': step.step_id,
                    'to': child_id
                })
        
        return {
            'nodes': nodes,
            'edges': edges,
            'total_steps': len(self.steps),
            'total_duration': sum(s.duration for s in self.steps)
        }
    
    def get_decision_summary(self) -> List[Dict[str, Any]]:
        """Get summary of all decisions made"""
        summary = []
        
        for decision in self.decision_points:
            summary.append({
                'timestamp': decision.timestamp.isoformat(),
                'type': decision.decision_type,
                'chosen': decision.option_chosen,
                'automated': decision.automated,
                'confidence': decision.confidence,
                'n_options': len(decision.options_available)
            })
        
        return summary
    
    def get_timeline(self) -> List[Dict[str, Any]]:
        """Get chronological timeline of all steps and decisions"""
        timeline = []
        
        # Add steps
        for step in self.steps:
            timeline.append({
                'timestamp': step.timestamp.isoformat(),
                'type': 'step',
                'name': step.name,
                'duration': step.duration,
                'id': step.step_id
            })
        
        # Add decisions
        for decision in self.decision_points:
            timeline.append({
                'timestamp': decision.timestamp.isoformat(),
                'type': 'decision',
                'name': decision.decision_type,
                'choice': decision.option_chosen,
                'id': decision.decision_id
            })
        
        # Sort by timestamp
        timeline.sort(key=lambda x: x['timestamp'])
        
        return timeline
    
    def export_state(self) -> Dict[str, Any]:
        """Export tracker state for persistence"""
        return {
            'steps': [
                {
                    'step_id': s.step_id,
                    'name': s.name,
                    'module': s.module,
                    'function': s.function,
                    'timestamp': s.timestamp.isoformat(),
                    'duration': s.duration,
                    'input_params': s.input_params,
                    'output_summary': s.output_summary,
                    'warnings': s.warnings,
                    'errors': s.errors,
                    'parent_step_id': s.parent_step_id,
                    'children_step_ids': s.children_step_ids,
                    'metadata': s.metadata
                }
                for s in self.steps
            ],
            'decision_points': [
                {
                    'decision_id': d.decision_id,
                    'timestamp': d.timestamp.isoformat(),
                    'decision_type': d.decision_type,
                    'options_available': d.options_available,
                    'option_chosen': d.option_chosen,
                    'rationale': d.rationale,
                    'automated': d.automated,
                    'confidence': d.confidence,
                    'based_on': d.based_on,
                    'impact': d.impact
                }
                for d in self.decision_points
            ],
            'summary': {
                'total_steps': len(self.steps),
                'total_decisions': len(self.decision_points),
                'total_duration': sum(s.duration for s in self.steps),
                'steps_with_errors': sum(1 for s in self.steps if s.errors),
                'steps_with_warnings': sum(1 for s in self.steps if s.warnings),
                'automated_decisions': sum(1 for d in self.decision_points if d.automated)
            }
        }
    
    def clear(self):
        """Clear all tracked steps and decisions"""
        self.steps.clear()
        self.decision_points.clear()
        self.current_step_id = None
        self.step_stack.clear()
        logger.info("Pipeline tracker cleared")


# Global tracker instance
_global_tracker = PipelineTracker()


def get_tracker() -> PipelineTracker:
    """Get the global pipeline tracker instance"""
    return _global_tracker


def track_step(name: Optional[str] = None, **kwargs):
    """Decorator using global tracker"""
    return _global_tracker.track_step(name, **kwargs)


def track_context(name: str, **kwargs):
    """Context manager using global tracker"""
    return _global_tracker.track_context(name, **kwargs)


def record_decision(**kwargs):
    """Record decision using global tracker"""
    return _global_tracker.record_decision(**kwargs)