"""
Navigation Controller for Workflow Management
==============================================

This module implements the intelligent navigation system for guiding users
through statistical analysis workflows in StickForStats.

Author: Vishal Bharti
Date: 2025-08-26
Version: 1.0.0
"""

import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from enum import Enum
import uuid

from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)


class StepType(Enum):
    """Enumeration of workflow step types"""
    DATA_UPLOAD = "data_upload"
    DATA_PROFILING = "data_profiling"
    DATA_CLEANING = "data_cleaning"
    ASSUMPTION_CHECK = "assumption_check"
    TEST_SELECTION = "test_selection"
    TEST_EXECUTION = "test_execution"
    RESULT_INTERPRETATION = "result_interpretation"
    REPORT_GENERATION = "report_generation"
    VISUALIZATION = "visualization"
    DECISION_POINT = "decision_point"
    CUSTOM = "custom"


class NavigationMode(Enum):
    """Navigation modes for different user expertise levels"""
    GUIDED = "guided"  # Full guidance for beginners
    ASSISTED = "assisted"  # Some guidance for intermediate users
    EXPERT = "expert"  # Minimal guidance for experts
    CUSTOM = "custom"  # User-defined navigation


class NavigationController:
    """
    Intelligent navigation controller that guides users through analysis workflows.
    
    This controller manages:
    - Step sequencing and transitions
    - Decision points and branching
    - Progress tracking
    - Recommendations based on context
    - Recovery from errors
    """
    
    def __init__(self, workflow_id: str = None, user_id: str = None):
        """
        Initialize the navigation controller.
        
        Args:
            workflow_id: Unique identifier for the workflow
            user_id: User identifier for personalization
        """
        self.workflow_id = workflow_id or str(uuid.uuid4())
        self.user_id = user_id
        self.current_step = None
        self.navigation_history = []
        self.decision_tree = self._initialize_decision_tree()
        self.mode = NavigationMode.GUIDED
        self.context = {}
        self.checkpoints = []
        
        # Load user preferences if available
        self._load_user_preferences()
        
        logger.info(f"NavigationController initialized for workflow {self.workflow_id}")
    
    def _initialize_decision_tree(self) -> Dict[str, Any]:
        """
        Initialize the decision tree for workflow navigation.
        
        Returns:
            Dictionary representing the decision tree structure
        """
        return {
            "root": {
                "type": StepType.DATA_UPLOAD,
                "next": ["data_profiling"],
                "required": True,
                "help": "Start by uploading your dataset"
            },
            "data_profiling": {
                "type": StepType.DATA_PROFILING,
                "next": ["assumption_check", "data_cleaning"],
                "required": True,
                "decision_criteria": self._profiling_decision,
                "help": "Analyzing your data structure and characteristics"
            },
            "data_cleaning": {
                "type": StepType.DATA_CLEANING,
                "next": ["assumption_check"],
                "required": False,
                "help": "Clean and prepare your data"
            },
            "assumption_check": {
                "type": StepType.ASSUMPTION_CHECK,
                "next": ["test_selection"],
                "required": True,
                "help": "Checking statistical assumptions"
            },
            "test_selection": {
                "type": StepType.TEST_SELECTION,
                "next": ["test_execution"],
                "required": True,
                "decision_criteria": self._test_selection_decision,
                "help": "Selecting appropriate statistical test"
            },
            "test_execution": {
                "type": StepType.TEST_EXECUTION,
                "next": ["result_interpretation"],
                "required": True,
                "help": "Running statistical analysis"
            },
            "result_interpretation": {
                "type": StepType.RESULT_INTERPRETATION,
                "next": ["visualization", "report_generation"],
                "required": True,
                "help": "Interpreting analysis results"
            },
            "visualization": {
                "type": StepType.VISUALIZATION,
                "next": ["report_generation"],
                "required": False,
                "help": "Creating visualizations"
            },
            "report_generation": {
                "type": StepType.REPORT_GENERATION,
                "next": [],
                "required": False,
                "help": "Generating final report"
            }
        }
    
    def get_next_step(self, current_context: Dict[str, Any]) -> Optional[str]:
        """
        Determine the next step based on current context and data.
        
        Args:
            current_context: Current workflow context including data and results
            
        Returns:
            Next step identifier or None if workflow is complete
        """
        # Update context
        self.context.update(current_context)
        
        # If no current step, start from root
        if not self.current_step:
            return "root"
        
        # Get current step configuration
        step_config = self.decision_tree.get(self.current_step, {})
        
        # Check if there's a decision function
        if "decision_criteria" in step_config:
            decision_func = step_config["decision_criteria"]
            next_steps = decision_func(self.context)
            if next_steps:
                return next_steps[0] if isinstance(next_steps, list) else next_steps
        
        # Return first available next step
        next_steps = step_config.get("next", [])
        return next_steps[0] if next_steps else None
    
    def validate_transition(self, from_step: str, to_step: str) -> Tuple[bool, str]:
        """
        Validate if a transition between steps is allowed.
        
        Args:
            from_step: Current step identifier
            to_step: Target step identifier
            
        Returns:
            Tuple of (is_valid, reason_if_invalid)
        """
        # Check if from_step exists
        if from_step not in self.decision_tree:
            return False, f"Invalid source step: {from_step}"
        
        # Check if to_step exists
        if to_step not in self.decision_tree:
            return False, f"Invalid target step: {to_step}"
        
        # Get allowed transitions
        step_config = self.decision_tree[from_step]
        allowed_next = step_config.get("next", [])
        
        # Check if transition is allowed
        if to_step not in allowed_next:
            return False, f"Transition from {from_step} to {to_step} not allowed"
        
        # Check prerequisites
        if not self._check_prerequisites(to_step):
            return False, f"Prerequisites for {to_step} not met"
        
        return True, "Valid transition"
    
    def get_available_actions(self, step: str) -> List[Dict[str, Any]]:
        """
        Get available actions for the current step.
        
        Args:
            step: Step identifier
            
        Returns:
            List of available actions with metadata
        """
        actions = []
        
        if step not in self.decision_tree:
            return actions
        
        step_config = self.decision_tree[step]
        step_type = step_config.get("type", StepType.CUSTOM)
        
        # Common actions
        actions.append({
            "id": "save_progress",
            "label": "Save Progress",
            "icon": "save",
            "type": "utility"
        })
        
        # Step-specific actions
        if step_type == StepType.DATA_UPLOAD:
            actions.extend([
                {"id": "upload_csv", "label": "Upload CSV", "icon": "upload", "type": "primary"},
                {"id": "upload_excel", "label": "Upload Excel", "icon": "upload", "type": "primary"},
                {"id": "use_sample", "label": "Use Sample Data", "icon": "dataset", "type": "secondary"}
            ])
        elif step_type == StepType.DATA_PROFILING:
            actions.extend([
                {"id": "view_summary", "label": "View Summary", "icon": "analytics", "type": "primary"},
                {"id": "check_quality", "label": "Check Data Quality", "icon": "check", "type": "secondary"}
            ])
        elif step_type == StepType.TEST_SELECTION:
            actions.extend([
                {"id": "auto_select", "label": "Auto-Select Test", "icon": "auto", "type": "primary"},
                {"id": "manual_select", "label": "Manual Selection", "icon": "manual", "type": "secondary"},
                {"id": "compare_tests", "label": "Compare Tests", "icon": "compare", "type": "info"}
            ])
        elif step_type == StepType.TEST_EXECUTION:
            actions.extend([
                {"id": "run_test", "label": "Run Analysis", "icon": "play", "type": "primary"},
                {"id": "configure_params", "label": "Configure Parameters", "icon": "settings", "type": "secondary"}
            ])
        elif step_type == StepType.RESULT_INTERPRETATION:
            actions.extend([
                {"id": "view_apa", "label": "APA Format", "icon": "format", "type": "primary"},
                {"id": "view_detailed", "label": "Detailed Results", "icon": "details", "type": "secondary"}
            ])
        
        # Add navigation actions
        next_steps = step_config.get("next", [])
        for next_step in next_steps:
            actions.append({
                "id": f"navigate_{next_step}",
                "label": f"Go to {next_step.replace('_', ' ').title()}",
                "icon": "arrow_forward",
                "type": "navigation"
            })
        
        return actions
    
    def navigate_to_step(self, step_id: str) -> bool:
        """
        Navigate to a specific step.
        
        Args:
            step_id: Target step identifier
            
        Returns:
            True if navigation successful, False otherwise
        """
        # Validate transition
        is_valid, reason = self.validate_transition(self.current_step or "root", step_id)
        
        if not is_valid:
            logger.warning(f"Navigation failed: {reason}")
            return False
        
        # Record in history
        self.navigation_history.append({
            "from": self.current_step,
            "to": step_id,
            "timestamp": datetime.now().isoformat(),
            "context_snapshot": self.context.copy()
        })
        
        # Update current step
        self.current_step = step_id
        
        # Save checkpoint
        self._save_checkpoint()
        
        logger.info(f"Navigated to step: {step_id}")
        return True
    
    def get_recommendations(self) -> List[Dict[str, Any]]:
        """
        Get recommendations based on current context.
        
        Returns:
            List of recommendations with priority and rationale
        """
        recommendations = []
        
        if not self.current_step:
            recommendations.append({
                "priority": "high",
                "action": "upload_data",
                "message": "Start by uploading your dataset",
                "rationale": "Data is required to begin analysis"
            })
            return recommendations
        
        step_config = self.decision_tree.get(self.current_step, {})
        step_type = step_config.get("type", StepType.CUSTOM)
        
        # Context-based recommendations
        if step_type == StepType.DATA_PROFILING:
            if self.context.get("missing_values_detected", False):
                recommendations.append({
                    "priority": "high",
                    "action": "handle_missing",
                    "message": "Missing values detected. Consider data cleaning.",
                    "rationale": "Missing values can affect analysis accuracy"
                })
        
        elif step_type == StepType.ASSUMPTION_CHECK:
            if not self.context.get("normality_satisfied", True):
                recommendations.append({
                    "priority": "medium",
                    "action": "use_nonparametric",
                    "message": "Consider non-parametric tests",
                    "rationale": "Data does not meet normality assumption"
                })
        
        elif step_type == StepType.TEST_SELECTION:
            data_type = self.context.get("data_type", "unknown")
            if data_type == "continuous":
                recommendations.append({
                    "priority": "high",
                    "action": "select_ttest",
                    "message": "T-test recommended for continuous data",
                    "rationale": "Appropriate for comparing means"
                })
        
        # Add next step recommendation
        next_step = self.get_next_step(self.context)
        if next_step:
            next_config = self.decision_tree.get(next_step, {})
            recommendations.append({
                "priority": "info",
                "action": f"navigate_{next_step}",
                "message": f"Next: {next_config.get('help', 'Continue to next step')}",
                "rationale": "Natural workflow progression"
            })
        
        return recommendations
    
    def save_state(self) -> str:
        """
        Save the current navigation state.
        
        Returns:
            State identifier for retrieval
        """
        state_id = f"{self.workflow_id}_state_{datetime.now().timestamp()}"
        state_data = {
            "workflow_id": self.workflow_id,
            "user_id": self.user_id,
            "current_step": self.current_step,
            "navigation_history": self.navigation_history,
            "context": self.context,
            "mode": self.mode.value,
            "timestamp": datetime.now().isoformat()
        }
        
        # Save to cache (could also persist to database)
        cache.set(state_id, json.dumps(state_data), timeout=86400)  # 24 hours
        
        logger.info(f"State saved: {state_id}")
        return state_id
    
    def load_state(self, state_id: str) -> bool:
        """
        Load a previously saved navigation state.
        
        Args:
            state_id: State identifier
            
        Returns:
            True if state loaded successfully, False otherwise
        """
        state_json = cache.get(state_id)
        if not state_json:
            logger.warning(f"State not found: {state_id}")
            return False
        
        try:
            state_data = json.loads(state_json)
            self.workflow_id = state_data.get("workflow_id", self.workflow_id)
            self.user_id = state_data.get("user_id", self.user_id)
            self.current_step = state_data.get("current_step")
            self.navigation_history = state_data.get("navigation_history", [])
            self.context = state_data.get("context", {})
            self.mode = NavigationMode(state_data.get("mode", "guided"))
            
            logger.info(f"State loaded: {state_id}")
            return True
        except Exception as e:
            logger.error(f"Error loading state: {e}")
            return False
    
    def get_progress(self) -> Dict[str, Any]:
        """
        Get workflow progress information.
        
        Returns:
            Progress data including completion percentage and status
        """
        total_steps = len(self.decision_tree)
        required_steps = sum(1 for step in self.decision_tree.values() 
                           if step.get("required", False))
        
        completed_steps = set()
        for entry in self.navigation_history:
            if entry["to"] in self.decision_tree:
                completed_steps.add(entry["to"])
        
        progress_pct = (len(completed_steps) / total_steps * 100) if total_steps > 0 else 0
        
        return {
            "percentage": round(progress_pct, 1),
            "completed_steps": len(completed_steps),
            "total_steps": total_steps,
            "required_steps": required_steps,
            "current_step": self.current_step,
            "is_complete": len(completed_steps) >= required_steps
        }
    
    # Private helper methods
    
    def _profiling_decision(self, context: Dict[str, Any]) -> List[str]:
        """Decision function for data profiling step."""
        if context.get("data_quality_score", 100) < 80:
            return ["data_cleaning"]
        return ["assumption_check"]
    
    def _test_selection_decision(self, context: Dict[str, Any]) -> List[str]:
        """Decision function for test selection step."""
        # This would contain logic to recommend specific tests
        return ["test_execution"]
    
    def _check_prerequisites(self, step: str) -> bool:
        """Check if prerequisites for a step are met."""
        # Implement prerequisite checking logic
        return True
    
    def _save_checkpoint(self) -> None:
        """Save a checkpoint of current state."""
        checkpoint = {
            "timestamp": datetime.now().isoformat(),
            "step": self.current_step,
            "context_hash": hash(str(self.context))
        }
        self.checkpoints.append(checkpoint)
        
        # Keep only last 10 checkpoints
        if len(self.checkpoints) > 10:
            self.checkpoints = self.checkpoints[-10:]
    
    def _load_user_preferences(self) -> None:
        """Load user preferences for navigation."""
        if self.user_id:
            # Could load from database or cache
            # For now, use defaults
            pass