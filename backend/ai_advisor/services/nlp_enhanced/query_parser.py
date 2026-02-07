"""
NLP Enhanced Query Parser

Parses complex statistical queries and extracts structured information
for analysis planning and execution.

Features:
- Multi-step query decomposition
- Intent classification (comparison, relationship, prediction, etc.)
- Variable extraction
- Conditional logic parsing ("if X then Y")
- Research question identification

Author: StickForStats Team
Created: December 27, 2025
"""

import re
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class QueryIntent(Enum):
    """Primary intent categories for statistical queries."""
    COMPARISON = "comparison"           # Compare groups/conditions
    RELATIONSHIP = "relationship"       # Correlation, association
    PREDICTION = "prediction"           # Regression, forecasting
    DIFFERENCE = "difference"           # Test for differences
    DISTRIBUTION = "distribution"       # Describe/test distribution
    EFFECT_SIZE = "effect_size"         # Calculate effect magnitude
    POWER = "power"                     # Power analysis
    ASSUMPTION = "assumption"           # Check assumptions
    INTERPRETATION = "interpretation"   # Interpret results
    RECOMMENDATION = "recommendation"   # Test recommendation
    REPORT = "report"                   # Generate report
    MULTI_STEP = "multi_step"           # Complex multi-analysis
    CLARIFICATION = "clarification"     # Need more info
    UNKNOWN = "unknown"


class AnalysisType(Enum):
    """Types of statistical analyses."""
    T_TEST = "t_test"
    ANOVA = "anova"
    CORRELATION = "correlation"
    REGRESSION = "regression"
    CHI_SQUARE = "chi_square"
    NON_PARAMETRIC = "non_parametric"
    MIXED_MODEL = "mixed_model"
    CAUSAL = "causal"
    MEDIATION = "mediation"
    DID = "difference_in_differences"
    DESCRIPTIVE = "descriptive"
    POWER_ANALYSIS = "power_analysis"


@dataclass
class ExtractedVariable:
    """Represents an extracted variable from query."""
    name: str
    role: str = "unknown"  # dependent, independent, grouping, covariate, mediator
    data_type: Optional[str] = None  # continuous, categorical, ordinal, binary
    mentioned_values: List[str] = field(default_factory=list)


@dataclass
class QueryCondition:
    """Represents a conditional clause in the query."""
    condition_type: str  # "if", "when", "given", "assuming"
    condition: str
    consequence: str


@dataclass
class QueryStep:
    """Represents a single step in a multi-step query."""
    step_number: int
    description: str
    intent: QueryIntent
    analysis_type: Optional[AnalysisType] = None
    variables: List[ExtractedVariable] = field(default_factory=list)
    depends_on: List[int] = field(default_factory=list)


@dataclass
class ParsedQuery:
    """Complete parsed query with all extracted information."""
    original_query: str
    primary_intent: QueryIntent
    secondary_intents: List[QueryIntent]
    analysis_types: List[AnalysisType]
    variables: List[ExtractedVariable]
    conditions: List[QueryCondition]
    steps: List[QueryStep]
    research_question: Optional[str]
    comparison_groups: List[str]
    sample_size_mentioned: Optional[int]
    effect_size_mentioned: Optional[float]
    alpha_level: float = 0.05
    is_multi_step: bool = False
    requires_clarification: bool = False
    clarification_questions: List[str] = field(default_factory=list)
    confidence_score: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "original_query": self.original_query,
            "primary_intent": self.primary_intent.value,
            "secondary_intents": [i.value for i in self.secondary_intents],
            "analysis_types": [a.value for a in self.analysis_types],
            "variables": [
                {
                    "name": v.name,
                    "role": v.role,
                    "data_type": v.data_type,
                    "mentioned_values": v.mentioned_values
                }
                for v in self.variables
            ],
            "conditions": [
                {
                    "type": c.condition_type,
                    "condition": c.condition,
                    "consequence": c.consequence
                }
                for c in self.conditions
            ],
            "steps": [
                {
                    "step_number": s.step_number,
                    "description": s.description,
                    "intent": s.intent.value,
                    "analysis_type": s.analysis_type.value if s.analysis_type else None,
                    "variables": [v.name for v in s.variables],
                    "depends_on": s.depends_on
                }
                for s in self.steps
            ],
            "research_question": self.research_question,
            "comparison_groups": self.comparison_groups,
            "sample_size": self.sample_size_mentioned,
            "effect_size": self.effect_size_mentioned,
            "alpha_level": self.alpha_level,
            "is_multi_step": self.is_multi_step,
            "requires_clarification": self.requires_clarification,
            "clarification_questions": self.clarification_questions,
            "confidence_score": self.confidence_score
        }


class QueryParser:
    """
    Parse and analyze statistical queries for structured extraction.

    Features:
    - Intent classification
    - Variable extraction
    - Multi-step query decomposition
    - Conditional parsing
    - Research question identification
    """

    # Intent patterns with regex
    INTENT_PATTERNS = {
        QueryIntent.COMPARISON: [
            r'\b(?:compare|comparing|comparison|differ(?:ence|ent)?|between\s+groups?)\b',
            r'\b(?:vs\.?|versus|against)\b',
            r'\b(?:which\s+(?:group|condition)\s+(?:is|has))\b',
        ],
        QueryIntent.RELATIONSHIP: [
            r'\b(?:correlat(?:e|ion|ed)|associat(?:e|ion|ed)|relationship)\b',
            r'\b(?:related?\s+to|linked?\s+to|connected?\s+to)\b',
            r'\b(?:how\s+(?:does|do)\s+\w+\s+relate)\b',
        ],
        QueryIntent.PREDICTION: [
            r'\b(?:predict(?:s|ing|ion)?|forecast(?:ing)?|model(?:ing)?)\b',
            r'\b(?:regression|dependent\s+variable|outcome)\b',
            r'\b(?:what\s+(?:predicts|determines|influences))\b',
        ],
        QueryIntent.DIFFERENCE: [
            r'\b(?:significant(?:ly)?\s+different|statistically\s+different)\b',
            r'\b(?:test\s+(?:for\s+)?difference|difference\s+test)\b',
            r'\b(?:is\s+there\s+a\s+difference)\b',
        ],
        QueryIntent.DISTRIBUTION: [
            r'\b(?:distribut(?:ion|ed)|normal(?:ity)?|skew(?:ness)?|kurtosis)\b',
            r'\b(?:histogram|density|shape\s+of)\b',
        ],
        QueryIntent.EFFECT_SIZE: [
            r'\b(?:effect\s+size|cohen[\'s]?\s*d|eta[- ]?squared|omega[- ]?squared)\b',
            r'\b(?:practical\s+significance|magnitude\s+of)\b',
            r'\b(?:how\s+(?:large|big|strong)\s+(?:is|are))\b',
        ],
        QueryIntent.POWER: [
            r'\b(?:power\s+analysis|sample\s+size|statistical\s+power)\b',
            r'\b(?:how\s+many\s+(?:subjects?|participants?|samples?))\b',
            r'\b(?:minimum\s+(?:sample|n)|detect(?:able)?\s+effect)\b',
        ],
        QueryIntent.ASSUMPTION: [
            r'\b(?:assumption(?:s)?|normality|homogeneity|independence)\b',
            r'\b(?:check(?:ing)?\s+assumptions?|violat(?:e|ion|ed))\b',
            r'\b(?:levene|shapiro|bartlett)\b',
        ],
        QueryIntent.INTERPRETATION: [
            r'\b(?:interpret(?:ation)?|what\s+does\s+(?:this|it)\s+mean)\b',
            r'\b(?:explain\s+(?:the\s+)?results?|understand(?:ing)?)\b',
            r'\b(?:p[- ]?value\s+(?:of|means?|interpretation))\b',
        ],
        QueryIntent.RECOMMENDATION: [
            r'\b(?:recommend(?:ation)?|suggest(?:ion)?|which\s+test)\b',
            r'\b(?:what\s+(?:test|analysis)\s+should)\b',
            r'\b(?:appropriate\s+(?:test|analysis|method))\b',
        ],
        QueryIntent.REPORT: [
            r'\b(?:report|write[- ]?up|methods?\s+section|results?\s+section)\b',
            r'\b(?:apa\s+(?:format|style)|publication)\b',
            r'\b(?:generate\s+(?:a\s+)?report)\b',
        ],
    }

    # Analysis type patterns
    ANALYSIS_PATTERNS = {
        AnalysisType.T_TEST: [
            r'\bt[- ]?test\b',
            r'\b(?:compare\s+)?two\s+(?:groups?|means?|samples?)\b',
            r'\b(?:independent|paired|one[- ]?sample)\s+(?:samples?)?\s*t\b',
        ],
        AnalysisType.ANOVA: [
            r'\banova\b',
            r'\b(?:compare\s+)?(?:three|multiple|several)\s+(?:groups?|means?)\b',
            r'\b(?:one[- ]?way|two[- ]?way|factorial|repeated\s+measures)\b',
        ],
        AnalysisType.CORRELATION: [
            r'\b(?:pearson|spearman|kendall)\s*(?:correlation|r|rho)?\b',
            r'\bcorrelation\s+(?:coefficient|analysis|between)\b',
            r'\bbivariate\s+relationship\b',
        ],
        AnalysisType.REGRESSION: [
            r'\b(?:linear|logistic|multiple|simple)\s+regression\b',
            r'\bregression\s+(?:analysis|model|equation)\b',
            r'\bpredict(?:or|ing)?\s+(?:variable|outcome)\b',
        ],
        AnalysisType.CHI_SQUARE: [
            r'\bchi[- ]?square\b',
            r'\b(?:categorical|contingency)\s+(?:data|table|analysis)\b',
            r'\bfisher[\'s]?\s+exact\b',
        ],
        AnalysisType.NON_PARAMETRIC: [
            r'\b(?:mann[- ]?whitney|wilcoxon|kruskal[- ]?wallis|friedman)\b',
            r'\bnon[- ]?parametric\b',
            r'\b(?:rank|ordinal)\s+(?:test|data)\b',
        ],
        AnalysisType.MIXED_MODEL: [
            r'\b(?:mixed|multilevel|hierarchical)\s+(?:model|effects?)\b',
            r'\b(?:random\s+(?:effects?|intercepts?|slopes?))\b',
            r'\bicc\b',
        ],
        AnalysisType.CAUSAL: [
            r'\b(?:causal|causation|causality)\b',
            r'\b(?:propensity|matching|treatment\s+effect)\b',
            r'\b(?:dag|confound(?:er|ing)?)\b',
        ],
        AnalysisType.MEDIATION: [
            r'\b(?:mediat(?:ion|or|ing)|indirect\s+effect)\b',
            r'\b(?:baron[- ]?kenny|sobel)\b',
            r'\b(?:path\s+(?:a|b|c)|direct\s+effect)\b',
        ],
        AnalysisType.DID: [
            r'\b(?:difference[- ]?in[- ]?differences?|did|diff[- ]?in[- ]?diff)\b',
            r'\b(?:event\s+study|parallel\s+trends?)\b',
            r'\b(?:treatment\s+(?:group|effect)\s+(?:before|after))\b',
        ],
        AnalysisType.POWER_ANALYSIS: [
            r'\bpower\s+(?:analysis|calculation|curve)\b',
            r'\bsample\s+size\s+(?:calculation|determination)\b',
            r'\b(?:g[*\s]?power|minimum\s+n)\b',
        ],
    }

    # Variable role indicators
    VARIABLE_ROLE_PATTERNS = {
        "dependent": [
            r'\b(?:dependent|outcome|response|target|dv|y)\s+variable\b',
            r'\b(?:measure|measuring)\s+(\w+)\b',
            r'\beffect\s+on\s+(\w+)\b',
        ],
        "independent": [
            r'\b(?:independent|predictor|explanatory|iv|x)\s+variable\b',
            r'\b(?:effect\s+of|impact\s+of)\s+(\w+)\b',
            r'\bfactor[s]?\s+(?:is|are)\s+(\w+)\b',
        ],
        "grouping": [
            r'\b(?:group(?:ing)?|condition|treatment)\s+(?:variable|factor)\b',
            r'\b(?:by|across|between)\s+(\w+)\b',
        ],
        "covariate": [
            r'\b(?:covariate|control(?:ling)?\s+for|adjust(?:ing)?\s+for)\b',
        ],
        "mediator": [
            r'\b(?:mediator|mediat(?:es|ing)|through)\s+(\w+)\b',
        ],
    }

    # Step indicators for multi-step queries
    STEP_INDICATORS = [
        r'\b(?:first|1st|step\s*1)',
        r'\b(?:then|next|second|2nd|step\s*2)',
        r'\b(?:after\s+that|third|3rd|step\s*3)',
        r'\b(?:finally|fourth|4th|last(?:ly)?|step\s*4)',
        r'\band\s+then\b',
        r'\bfollowed\s+by\b',
    ]

    # Conditional patterns
    CONDITIONAL_PATTERNS = [
        (r'if\s+(.+?),?\s+(?:then\s+)?(.+)', "if"),
        (r'when\s+(.+?),?\s+(.+)', "when"),
        (r'given\s+(?:that\s+)?(.+?),?\s+(.+)', "given"),
        (r'assuming\s+(.+?),?\s+(.+)', "assuming"),
        (r'in\s+case\s+(?:of\s+)?(.+?),?\s+(.+)', "in_case"),
    ]

    def __init__(self):
        """Initialize the query parser."""
        self._compile_patterns()

    def _compile_patterns(self):
        """Compile regex patterns for efficiency."""
        self._intent_compiled = {
            intent: [re.compile(p, re.IGNORECASE) for p in patterns]
            for intent, patterns in self.INTENT_PATTERNS.items()
        }

        self._analysis_compiled = {
            analysis: [re.compile(p, re.IGNORECASE) for p in patterns]
            for analysis, patterns in self.ANALYSIS_PATTERNS.items()
        }

        self._step_compiled = [re.compile(p, re.IGNORECASE) for p in self.STEP_INDICATORS]

        self._conditional_compiled = [
            (re.compile(p, re.IGNORECASE), ctype)
            for p, ctype in self.CONDITIONAL_PATTERNS
        ]

    def parse(self, query: str, data_context: Optional[Dict[str, Any]] = None) -> ParsedQuery:
        """
        Parse a statistical query and extract structured information.

        Args:
            query: The user's query string
            data_context: Optional context about the user's data

        Returns:
            ParsedQuery with all extracted information
        """
        # Normalize query
        query_clean = self._normalize_query(query)

        # Identify intents
        primary_intent, secondary_intents = self._identify_intents(query_clean)

        # Identify analysis types
        analysis_types = self._identify_analysis_types(query_clean)

        # Extract variables
        variables = self._extract_variables(query_clean, data_context)

        # Parse conditions
        conditions = self._parse_conditions(query_clean)

        # Check for multi-step
        is_multi_step = self._is_multi_step(query_clean)

        # Decompose into steps
        steps = self._decompose_steps(query_clean, primary_intent, analysis_types) if is_multi_step else []

        # Extract research question
        research_question = self._extract_research_question(query_clean)

        # Extract comparison groups
        comparison_groups = self._extract_groups(query_clean)

        # Extract numerical values
        sample_size = self._extract_sample_size(query_clean)
        effect_size = self._extract_effect_size(query_clean)
        alpha = self._extract_alpha(query_clean)

        # Check if clarification needed
        requires_clarification, clarification_questions = self._check_clarification_needs(
            query_clean, primary_intent, variables, data_context
        )

        # Calculate confidence score
        confidence_score = self._calculate_confidence(
            primary_intent, analysis_types, variables, is_multi_step
        )

        return ParsedQuery(
            original_query=query,
            primary_intent=primary_intent,
            secondary_intents=secondary_intents,
            analysis_types=analysis_types,
            variables=variables,
            conditions=conditions,
            steps=steps,
            research_question=research_question,
            comparison_groups=comparison_groups,
            sample_size_mentioned=sample_size,
            effect_size_mentioned=effect_size,
            alpha_level=alpha,
            is_multi_step=is_multi_step,
            requires_clarification=requires_clarification,
            clarification_questions=clarification_questions,
            confidence_score=confidence_score
        )

    def _normalize_query(self, query: str) -> str:
        """Normalize query text for processing."""
        # Basic normalization
        query = query.strip()
        query = re.sub(r'\s+', ' ', query)  # Normalize whitespace
        return query

    def _identify_intents(self, query: str) -> Tuple[QueryIntent, List[QueryIntent]]:
        """Identify primary and secondary intents."""
        intent_scores = {}

        for intent, patterns in self._intent_compiled.items():
            score = sum(1 for p in patterns if p.search(query))
            if score > 0:
                intent_scores[intent] = score

        if not intent_scores:
            return QueryIntent.UNKNOWN, []

        # Sort by score
        sorted_intents = sorted(intent_scores.items(), key=lambda x: x[1], reverse=True)
        primary = sorted_intents[0][0]
        secondary = [intent for intent, _ in sorted_intents[1:4]]  # Top 3 secondary

        return primary, secondary

    def _identify_analysis_types(self, query: str) -> List[AnalysisType]:
        """Identify mentioned analysis types."""
        found = []

        for analysis, patterns in self._analysis_compiled.items():
            for pattern in patterns:
                if pattern.search(query):
                    if analysis not in found:
                        found.append(analysis)
                    break

        return found

    def _extract_variables(
        self,
        query: str,
        data_context: Optional[Dict[str, Any]] = None
    ) -> List[ExtractedVariable]:
        """Extract mentioned variables from query."""
        variables = []

        # Try to match against data context if available
        if data_context and "variables" in data_context:
            context_vars = {v.get("name", "").lower() for v in data_context["variables"]}

            # Find mentions of known variables
            for var_info in data_context["variables"]:
                var_name = var_info.get("name", "")
                if var_name and re.search(rf'\b{re.escape(var_name)}\b', query, re.IGNORECASE):
                    variables.append(ExtractedVariable(
                        name=var_name,
                        role="unknown",
                        data_type=var_info.get("type")
                    ))

        # Extract role assignments
        for role, patterns in self.VARIABLE_ROLE_PATTERNS.items():
            for pattern in patterns:
                matches = re.findall(pattern, query, re.IGNORECASE)
                for match in matches:
                    if isinstance(match, tuple):
                        match = match[0]
                    match = match.strip()

                    # Check if already extracted
                    existing = next((v for v in variables if v.name.lower() == match.lower()), None)
                    if existing:
                        existing.role = role
                    elif match and len(match) > 1:
                        variables.append(ExtractedVariable(name=match, role=role))

        return variables

    def _parse_conditions(self, query: str) -> List[QueryCondition]:
        """Parse conditional clauses from query."""
        conditions = []

        for pattern, ctype in self._conditional_compiled:
            matches = pattern.findall(query)
            for match in matches:
                if len(match) >= 2:
                    conditions.append(QueryCondition(
                        condition_type=ctype,
                        condition=match[0].strip(),
                        consequence=match[1].strip()
                    ))

        return conditions

    def _is_multi_step(self, query: str) -> bool:
        """Check if query contains multiple analysis steps."""
        # Check for step indicators
        step_count = sum(1 for p in self._step_compiled if p.search(query))

        # Check for multiple analysis types
        analysis_mentions = sum(
            1 for patterns in self._analysis_compiled.values()
            for p in patterns if p.search(query)
        )

        # Check for conjunctions suggesting sequence
        sequence_patterns = [
            r'\band\s+then\b',
            r'\bafter\s+(?:that|which)\b',
            r'\bfollowed\s+by\b',
            r'\b(?:first|second|third|finally)\b',
        ]
        sequence_count = sum(
            1 for p in sequence_patterns
            if re.search(p, query, re.IGNORECASE)
        )

        return step_count >= 2 or (analysis_mentions >= 2 and sequence_count >= 1)

    def _decompose_steps(
        self,
        query: str,
        primary_intent: QueryIntent,
        analysis_types: List[AnalysisType]
    ) -> List[QueryStep]:
        """Decompose a multi-step query into individual steps."""
        steps = []

        # Try to split by step indicators
        step_splits = re.split(
            r'(?:first|then|next|after\s+that|finally|and\s+then)',
            query,
            flags=re.IGNORECASE
        )

        step_splits = [s.strip() for s in step_splits if s.strip()]

        if len(step_splits) <= 1:
            # Try splitting by sentence
            step_splits = re.split(r'[.;]', query)
            step_splits = [s.strip() for s in step_splits if s.strip() and len(s) > 10]

        for i, split in enumerate(step_splits):
            # Determine intent and analysis type for this step
            step_intent, _ = self._identify_intents(split)
            step_analysis = self._identify_analysis_types(split)

            if step_intent == QueryIntent.UNKNOWN:
                step_intent = primary_intent

            steps.append(QueryStep(
                step_number=i + 1,
                description=split,
                intent=step_intent,
                analysis_type=step_analysis[0] if step_analysis else None,
                depends_on=[i] if i > 0 else []
            ))

        return steps

    def _extract_research_question(self, query: str) -> Optional[str]:
        """Extract the core research question."""
        # Look for question patterns
        question_patterns = [
            r'(?:research\s+question[:\s]+)(.+?)(?:\?|$)',
            r'(?:trying\s+to\s+(?:find\s+out|determine|test)[:\s]+)(.+?)(?:\?|$)',
            r'(?:want\s+to\s+know[:\s]+)(.+?)(?:\?|$)',
            r'^(.+\?)$',  # Query ending with question mark
        ]

        for pattern in question_patterns:
            match = re.search(pattern, query, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return None

    def _extract_groups(self, query: str) -> List[str]:
        """Extract comparison groups from query."""
        groups = []

        # Patterns for group mentions
        group_patterns = [
            r'(?:compare|between)\s+(\w+)\s+(?:and|vs\.?|versus)\s+(\w+)',
            r'(\w+)\s+group\s+(?:and|vs\.?|versus)\s+(\w+)\s+group',
            r'(?:treatment|experimental)\s+(?:and|vs\.?)\s+(?:control|placebo)',
        ]

        for pattern in group_patterns:
            matches = re.findall(pattern, query, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    groups.extend(match)
                else:
                    groups.append(match)

        return list(set(groups))

    def _extract_sample_size(self, query: str) -> Optional[int]:
        """Extract mentioned sample size."""
        patterns = [
            r'n\s*=\s*(\d+)',
            r'sample\s+(?:size\s+)?(?:of\s+)?(\d+)',
            r'(\d+)\s+(?:participants?|subjects?|observations?|samples?)',
        ]

        for pattern in patterns:
            match = re.search(pattern, query, re.IGNORECASE)
            if match:
                try:
                    return int(match.group(1))
                except ValueError:
                    continue

        return None

    def _extract_effect_size(self, query: str) -> Optional[float]:
        """Extract mentioned effect size."""
        patterns = [
            r"(?:cohen['\s]*s?\s*)?d\s*=\s*([\d.]+)",
            r'effect\s+size\s+(?:of\s+)?([\d.]+)',
            r'r\s*=\s*([\d.]+)',
            r'eta[- ]?squared?\s*=?\s*([\d.]+)',
        ]

        for pattern in patterns:
            match = re.search(pattern, query, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    continue

        return None

    def _extract_alpha(self, query: str) -> float:
        """Extract alpha level (significance level)."""
        patterns = [
            r'alpha\s*=\s*([\d.]+)',
            r'significance\s+level\s+(?:of\s+)?([\d.]+)',
            r'p\s*[<>]\s*([\d.]+)',
        ]

        for pattern in patterns:
            match = re.search(pattern, query, re.IGNORECASE)
            if match:
                try:
                    value = float(match.group(1))
                    if 0 < value < 1:
                        return value
                except ValueError:
                    continue

        return 0.05  # Default

    def _check_clarification_needs(
        self,
        query: str,
        intent: QueryIntent,
        variables: List[ExtractedVariable],
        data_context: Optional[Dict[str, Any]]
    ) -> Tuple[bool, List[str]]:
        """Check if clarification is needed and generate questions."""
        questions = []

        # Check for ambiguous intent
        if intent == QueryIntent.UNKNOWN:
            questions.append("What is the main goal of your analysis? (compare groups, find relationships, make predictions, etc.)")

        # Check for missing variable roles
        if intent in [QueryIntent.COMPARISON, QueryIntent.PREDICTION]:
            has_dv = any(v.role == "dependent" for v in variables)
            has_iv = any(v.role in ["independent", "grouping"] for v in variables)

            if not has_dv:
                questions.append("What is your outcome/dependent variable?")
            if not has_iv:
                questions.append("What is your predictor/independent variable or grouping factor?")

        # Check for missing data context
        if not data_context:
            questions.append("Can you share information about your variables (types, sample sizes)?")

        # Check for missing sample size for power analysis
        if intent == QueryIntent.POWER:
            sample_size = self._extract_sample_size(query)
            effect_size = self._extract_effect_size(query)

            if not sample_size and not effect_size:
                questions.append("What sample size are you planning, or what effect size do you expect to detect?")

        return len(questions) > 0, questions

    def _calculate_confidence(
        self,
        intent: QueryIntent,
        analysis_types: List[AnalysisType],
        variables: List[ExtractedVariable],
        is_multi_step: bool
    ) -> float:
        """Calculate confidence score for the parse."""
        score = 0.5  # Base score

        # Intent clarity
        if intent != QueryIntent.UNKNOWN:
            score += 0.2

        # Analysis type identification
        if analysis_types:
            score += 0.1 * min(len(analysis_types), 2)

        # Variable extraction
        if variables:
            score += 0.1
            if any(v.role != "unknown" for v in variables):
                score += 0.1

        # Multi-step penalty (more complex = less confident)
        if is_multi_step:
            score -= 0.1

        return min(1.0, max(0.0, score))


# Singleton instance
_parser_instance = None


def get_query_parser() -> QueryParser:
    """Get the singleton QueryParser instance."""
    global _parser_instance
    if _parser_instance is None:
        _parser_instance = QueryParser()
    return _parser_instance
