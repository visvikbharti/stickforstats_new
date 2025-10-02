"""
Decision Tree System for Workflow Navigation
============================================

This module implements an intelligent decision tree system that guides users
through statistical analysis decisions based on their data and goals.

Author: Vishal Bharti
Date: 2025-08-26
Version: 1.0.0
"""

import json
import logging
from typing import Dict, Any, List, Optional, Callable, Tuple
from enum import Enum
from dataclasses import dataclass, field
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


class DecisionType(Enum):
    """Types of decisions in the workflow"""
    DATA_TYPE = "data_type"
    TEST_SELECTION = "test_selection"
    ASSUMPTION_CHECK = "assumption_check"
    PARAMETER_SETTING = "parameter_setting"
    OUTPUT_FORMAT = "output_format"
    VISUALIZATION = "visualization"
    POST_ANALYSIS = "post_analysis"


class RecommendationLevel(Enum):
    """Recommendation strength levels"""
    REQUIRED = "required"  # Must be done
    STRONGLY_RECOMMENDED = "strongly_recommended"  # Should be done
    RECOMMENDED = "recommended"  # Good to do
    OPTIONAL = "optional"  # Can be done
    NOT_RECOMMENDED = "not_recommended"  # Should avoid


@dataclass
class DecisionOption:
    """Represents an option in a decision"""
    id: str
    label: str
    description: str
    recommendation_level: RecommendationLevel = RecommendationLevel.OPTIONAL
    rationale: str = ""
    prerequisites: List[str] = field(default_factory=list)
    consequences: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DecisionNode:
    """
    Represents a decision point in the workflow.
    
    A decision node presents a question to the user and provides
    options with recommendations based on the current context.
    """
    id: str
    question: str
    decision_type: DecisionType
    options: List[DecisionOption]
    evaluation_function: Optional[Callable] = None
    help_text: str = ""
    required: bool = True
    allow_multiple: bool = False
    default_option: Optional[str] = None
    
    def evaluate(self, context: Dict[str, Any]) -> List[DecisionOption]:
        """
        Evaluate options based on context and return recommendations.
        
        Args:
            context: Current workflow context
            
        Returns:
            List of options with updated recommendations
        """
        if self.evaluation_function:
            return self.evaluation_function(self, context)
        return self.options
    
    def get_recommendation(self, context: Dict[str, Any]) -> Optional[DecisionOption]:
        """
        Get the top recommended option based on context.
        
        Args:
            context: Current workflow context
            
        Returns:
            Most recommended option or None
        """
        evaluated_options = self.evaluate(context)
        
        # Sort by recommendation level
        priority = {
            RecommendationLevel.REQUIRED: 0,
            RecommendationLevel.STRONGLY_RECOMMENDED: 1,
            RecommendationLevel.RECOMMENDED: 2,
            RecommendationLevel.OPTIONAL: 3,
            RecommendationLevel.NOT_RECOMMENDED: 4
        }
        
        sorted_options = sorted(evaluated_options, 
                               key=lambda x: priority[x.recommendation_level])
        
        if sorted_options and sorted_options[0].recommendation_level != RecommendationLevel.NOT_RECOMMENDED:
            return sorted_options[0]
        return None


class DecisionTree:
    """
    Manages the complete decision tree for workflow navigation.
    
    This class builds and manages a comprehensive decision tree
    that guides users through statistical analysis decisions.
    """
    
    def __init__(self):
        """Initialize the decision tree with predefined nodes."""
        self.nodes = {}
        self.root_node = None
        self._build_tree()
        logger.info("Decision tree initialized")
    
    def _build_tree(self) -> None:
        """Build the complete decision tree structure."""
        
        # Data type decision
        self.add_node(DecisionNode(
            id="data_type_selection",
            question="What type of data are you analyzing?",
            decision_type=DecisionType.DATA_TYPE,
            options=[
                DecisionOption(
                    id="continuous",
                    label="Continuous",
                    description="Numerical data that can take any value within a range",
                    rationale="Examples: height, weight, temperature, time"
                ),
                DecisionOption(
                    id="categorical",
                    label="Categorical",
                    description="Data that represents categories or groups",
                    rationale="Examples: gender, color, yes/no responses"
                ),
                DecisionOption(
                    id="ordinal",
                    label="Ordinal",
                    description="Categorical data with a meaningful order",
                    rationale="Examples: ratings (1-5), education levels, size (S/M/L)"
                ),
                DecisionOption(
                    id="count",
                    label="Count/Discrete",
                    description="Whole numbers representing counts",
                    rationale="Examples: number of events, frequency counts"
                ),
                DecisionOption(
                    id="time_series",
                    label="Time Series",
                    description="Data collected over time intervals",
                    rationale="Examples: stock prices, temperature readings over time"
                )
            ],
            evaluation_function=self._evaluate_data_type,
            help_text="Select the primary type of your data to determine appropriate analyses"
        ))
        
        # Test selection for continuous data
        self.add_node(DecisionNode(
            id="continuous_test_selection",
            question="What comparison do you want to make?",
            decision_type=DecisionType.TEST_SELECTION,
            options=[
                DecisionOption(
                    id="one_sample_t",
                    label="Compare to a known value",
                    description="One-sample t-test",
                    prerequisites=["normality"],
                    rationale="Tests if sample mean differs from a known value"
                ),
                DecisionOption(
                    id="two_sample_t",
                    label="Compare two groups",
                    description="Independent samples t-test",
                    prerequisites=["normality", "equal_variance"],
                    rationale="Tests if means of two independent groups differ"
                ),
                DecisionOption(
                    id="paired_t",
                    label="Compare paired measurements",
                    description="Paired samples t-test",
                    prerequisites=["normality_diff"],
                    rationale="Tests if means differ for paired observations"
                ),
                DecisionOption(
                    id="anova",
                    label="Compare multiple groups",
                    description="One-way ANOVA",
                    prerequisites=["normality", "equal_variance"],
                    rationale="Tests if means differ across 3+ groups"
                ),
                DecisionOption(
                    id="correlation",
                    label="Examine relationship",
                    description="Correlation analysis",
                    prerequisites=["linearity"],
                    rationale="Measures strength and direction of relationship"
                ),
                DecisionOption(
                    id="regression",
                    label="Predict values",
                    description="Linear regression",
                    prerequisites=["linearity", "independence", "homoscedasticity"],
                    rationale="Models relationship for prediction"
                )
            ],
            evaluation_function=self._evaluate_continuous_test,
            help_text="Choose the appropriate test based on your research question"
        ))
        
        # Assumption checking
        self.add_node(DecisionNode(
            id="normality_check",
            question="How should we check for normality?",
            decision_type=DecisionType.ASSUMPTION_CHECK,
            options=[
                DecisionOption(
                    id="shapiro_wilk",
                    label="Shapiro-Wilk Test",
                    description="Statistical test for normality (n < 50)",
                    rationale="Most powerful test for small samples"
                ),
                DecisionOption(
                    id="kolmogorov_smirnov",
                    label="Kolmogorov-Smirnov Test",
                    description="Statistical test for normality (n ≥ 50)",
                    rationale="Suitable for larger samples"
                ),
                DecisionOption(
                    id="visual_inspection",
                    label="Visual Inspection",
                    description="Q-Q plot and histogram",
                    rationale="Provides visual confirmation"
                ),
                DecisionOption(
                    id="combined",
                    label="Combined Approach",
                    description="Both statistical test and visual methods",
                    recommendation_level=RecommendationLevel.STRONGLY_RECOMMENDED,
                    rationale="Most comprehensive assessment"
                )
            ],
            evaluation_function=self._evaluate_normality_method,
            help_text="Normality is an important assumption for many parametric tests"
        ))
        
        # Categorical test selection
        self.add_node(DecisionNode(
            id="categorical_test_selection",
            question="What analysis do you need for categorical data?",
            decision_type=DecisionType.TEST_SELECTION,
            options=[
                DecisionOption(
                    id="chi_square_gof",
                    label="Test distribution",
                    description="Chi-square goodness of fit",
                    rationale="Tests if observed frequencies match expected"
                ),
                DecisionOption(
                    id="chi_square_independence",
                    label="Test independence",
                    description="Chi-square test of independence",
                    rationale="Tests if two categorical variables are related"
                ),
                DecisionOption(
                    id="fishers_exact",
                    label="Small sample test",
                    description="Fisher's exact test",
                    prerequisites=["small_expected_frequencies"],
                    rationale="Exact test for 2x2 tables with small samples"
                ),
                DecisionOption(
                    id="mcnemar",
                    label="Paired proportions",
                    description="McNemar's test",
                    rationale="Tests changes in paired categorical data"
                )
            ],
            help_text="Choose based on your data structure and research question"
        ))
        
        # Visualization selection
        self.add_node(DecisionNode(
            id="visualization_selection",
            question="What visualizations would help interpret your results?",
            decision_type=DecisionType.VISUALIZATION,
            options=[
                DecisionOption(
                    id="boxplot",
                    label="Box Plot",
                    description="Shows distribution and outliers",
                    rationale="Good for comparing groups and identifying outliers"
                ),
                DecisionOption(
                    id="histogram",
                    label="Histogram",
                    description="Shows frequency distribution",
                    rationale="Visualizes data distribution shape"
                ),
                DecisionOption(
                    id="scatter",
                    label="Scatter Plot",
                    description="Shows relationship between variables",
                    rationale="Reveals patterns and correlations"
                ),
                DecisionOption(
                    id="barplot",
                    label="Bar Plot",
                    description="Compares categories",
                    rationale="Good for categorical comparisons"
                ),
                DecisionOption(
                    id="heatmap",
                    label="Heat Map",
                    description="Shows correlation matrix",
                    rationale="Visualizes relationships among multiple variables"
                )
            ],
            allow_multiple=True,
            help_text="Select one or more visualization types"
        ))
        
        # Post-analysis actions
        self.add_node(DecisionNode(
            id="post_analysis_actions",
            question="What would you like to do next?",
            decision_type=DecisionType.POST_ANALYSIS,
            options=[
                DecisionOption(
                    id="effect_size",
                    label="Calculate Effect Size",
                    description="Quantify the magnitude of the difference",
                    recommendation_level=RecommendationLevel.STRONGLY_RECOMMENDED,
                    rationale="Provides practical significance beyond p-values"
                ),
                DecisionOption(
                    id="power_analysis",
                    label="Conduct Power Analysis",
                    description="Determine if sample size was adequate",
                    rationale="Evaluates study's ability to detect effects"
                ),
                DecisionOption(
                    id="confidence_intervals",
                    label="Compute Confidence Intervals",
                    description="Estimate parameter uncertainty",
                    recommendation_level=RecommendationLevel.RECOMMENDED,
                    rationale="Provides range of plausible values"
                ),
                DecisionOption(
                    id="generate_report",
                    label="Generate Report",
                    description="Create comprehensive analysis report",
                    rationale="Documents analysis for sharing"
                ),
                DecisionOption(
                    id="export_results",
                    label="Export Results",
                    description="Save results in various formats",
                    rationale="Enables further analysis or presentation"
                )
            ],
            allow_multiple=True,
            required=False,
            help_text="Additional analyses to strengthen your conclusions"
        ))
        
        # Set root node
        self.root_node = "data_type_selection"
    
    def add_node(self, node: DecisionNode) -> None:
        """
        Add a decision node to the tree.
        
        Args:
            node: DecisionNode to add
        """
        self.nodes[node.id] = node
        logger.debug(f"Added decision node: {node.id}")
    
    def get_node(self, node_id: str) -> Optional[DecisionNode]:
        """
        Retrieve a decision node by ID.
        
        Args:
            node_id: Node identifier
            
        Returns:
            DecisionNode or None if not found
        """
        return self.nodes.get(node_id)
    
    def get_next_decision(self, current_node_id: str, selected_option: str, 
                         context: Dict[str, Any]) -> Optional[str]:
        """
        Determine the next decision node based on current selection.
        
        Args:
            current_node_id: Current node ID
            selected_option: Selected option ID
            context: Current workflow context
            
        Returns:
            Next node ID or None if end of branch
        """
        # Decision flow mapping
        flow_map = {
            ("data_type_selection", "continuous"): "continuous_test_selection",
            ("data_type_selection", "categorical"): "categorical_test_selection",
            ("continuous_test_selection", "one_sample_t"): "normality_check",
            ("continuous_test_selection", "two_sample_t"): "normality_check",
            ("continuous_test_selection", "paired_t"): "normality_check",
            ("continuous_test_selection", "anova"): "normality_check",
            ("normality_check", "combined"): "visualization_selection",
            ("visualization_selection", "*"): "post_analysis_actions"
        }
        
        # Check specific mapping
        next_node = flow_map.get((current_node_id, selected_option))
        if next_node:
            return next_node
        
        # Check wildcard mapping
        next_node = flow_map.get((current_node_id, "*"))
        if next_node:
            return next_node
        
        # Context-based routing
        if current_node_id == "normality_check":
            if context.get("normality_satisfied", True):
                return "visualization_selection"
            else:
                # If normality not satisfied, might suggest non-parametric
                return "non_parametric_alternatives"
        
        return None
    
    def get_decision_path(self, target: str) -> List[str]:
        """
        Get the path of decisions to reach a target node.
        
        Args:
            target: Target node ID
            
        Returns:
            List of node IDs forming the path
        """
        # Implement path finding algorithm if needed
        # For now, return a simple path
        if target == "visualization_selection":
            return ["data_type_selection", "continuous_test_selection", 
                   "normality_check", "visualization_selection"]
        return []
    
    # Evaluation functions for dynamic recommendations
    
    def _evaluate_data_type(self, node: DecisionNode, 
                           context: Dict[str, Any]) -> List[DecisionOption]:
        """Evaluate data type options based on actual data."""
        options = node.options.copy()
        
        data = context.get("data")
        if data is not None and isinstance(data, pd.DataFrame):
            # Check data characteristics
            numeric_cols = data.select_dtypes(include=[np.number]).columns
            categorical_cols = data.select_dtypes(include=['object', 'category']).columns
            
            if len(numeric_cols) > len(categorical_cols):
                # More numeric columns
                for opt in options:
                    if opt.id == "continuous":
                        opt.recommendation_level = RecommendationLevel.STRONGLY_RECOMMENDED
                    elif opt.id == "categorical":
                        opt.recommendation_level = RecommendationLevel.OPTIONAL
            elif len(categorical_cols) > len(numeric_cols):
                # More categorical columns
                for opt in options:
                    if opt.id == "categorical":
                        opt.recommendation_level = RecommendationLevel.STRONGLY_RECOMMENDED
                    elif opt.id == "continuous":
                        opt.recommendation_level = RecommendationLevel.OPTIONAL
        
        return options
    
    def _evaluate_continuous_test(self, node: DecisionNode, 
                                 context: Dict[str, Any]) -> List[DecisionOption]:
        """Evaluate test options for continuous data."""
        options = node.options.copy()
        
        # Check number of groups
        num_groups = context.get("num_groups", 0)
        is_paired = context.get("is_paired", False)
        
        for opt in options:
            if opt.id == "one_sample_t" and num_groups == 1:
                opt.recommendation_level = RecommendationLevel.STRONGLY_RECOMMENDED
            elif opt.id == "two_sample_t" and num_groups == 2 and not is_paired:
                opt.recommendation_level = RecommendationLevel.STRONGLY_RECOMMENDED
            elif opt.id == "paired_t" and num_groups == 2 and is_paired:
                opt.recommendation_level = RecommendationLevel.STRONGLY_RECOMMENDED
            elif opt.id == "anova" and num_groups > 2:
                opt.recommendation_level = RecommendationLevel.STRONGLY_RECOMMENDED
        
        return options
    
    def _evaluate_normality_method(self, node: DecisionNode, 
                                  context: Dict[str, Any]) -> List[DecisionOption]:
        """Evaluate normality checking methods."""
        options = node.options.copy()
        
        sample_size = context.get("sample_size", 0)
        
        for opt in options:
            if opt.id == "shapiro_wilk" and sample_size < 50:
                opt.recommendation_level = RecommendationLevel.RECOMMENDED
            elif opt.id == "kolmogorov_smirnov" and sample_size >= 50:
                opt.recommendation_level = RecommendationLevel.RECOMMENDED
            elif opt.id == "combined":
                opt.recommendation_level = RecommendationLevel.STRONGLY_RECOMMENDED
        
        return options


class DecisionEngine:
    """
    High-level engine for managing decision tree navigation.
    """
    
    def __init__(self):
        """Initialize the decision engine."""
        self.tree = DecisionTree()
        self.current_node = None
        self.decision_history = []
        logger.info("Decision engine initialized")
    
    def start(self) -> DecisionNode:
        """
        Start the decision process from the root.
        
        Returns:
            Root decision node
        """
        self.current_node = self.tree.get_node(self.tree.root_node)
        self.decision_history = []
        return self.current_node
    
    def make_decision(self, option_id: str, context: Dict[str, Any]) -> Optional[DecisionNode]:
        """
        Make a decision and move to the next node.
        
        Args:
            option_id: Selected option ID
            context: Current context
            
        Returns:
            Next decision node or None if complete
        """
        if not self.current_node:
            return None
        
        # Record decision
        self.decision_history.append({
            "node_id": self.current_node.id,
            "selected_option": option_id,
            "timestamp": pd.Timestamp.now().isoformat()
        })
        
        # Get next node
        next_node_id = self.tree.get_next_decision(
            self.current_node.id, option_id, context
        )
        
        if next_node_id:
            self.current_node = self.tree.get_node(next_node_id)
            return self.current_node
        
        return None
    
    def get_recommendation(self, context: Dict[str, Any]) -> Optional[DecisionOption]:
        """
        Get recommendation for current decision.
        
        Args:
            context: Current context
            
        Returns:
            Recommended option or None
        """
        if self.current_node:
            return self.current_node.get_recommendation(context)
        return None
    
    def can_go_back(self) -> bool:
        """Check if we can go back to previous decision."""
        return len(self.decision_history) > 0
    
    def go_back(self) -> Optional[DecisionNode]:
        """
        Go back to previous decision.
        
        Returns:
            Previous decision node or None
        """
        if not self.can_go_back():
            return None
        
        # Remove last decision
        self.decision_history.pop()
        
        # Get previous node
        if self.decision_history:
            prev_node_id = self.decision_history[-1]["node_id"]
            self.current_node = self.tree.get_node(prev_node_id)
        else:
            # Back to root
            self.current_node = self.tree.get_node(self.tree.root_node)
        
        return self.current_node
    
    def get_decision_summary(self) -> Dict[str, Any]:
        """
        Get summary of decisions made.
        
        Returns:
            Summary dictionary
        """
        return {
            "current_node": self.current_node.id if self.current_node else None,
            "decisions_made": len(self.decision_history),
            "history": self.decision_history,
            "is_complete": self.current_node is None
        }