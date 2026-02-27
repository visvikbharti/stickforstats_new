"""
NLP Enhanced Services

Advanced natural language processing for statistical analysis queries.

Features:
- Query parsing and intent classification
- Analysis plan generation
- APA report writing
- Multi-step query handling

Author: StickForStats Team
Created: December 27, 2025
"""

from .query_parser import (
    QueryParser,
    ParsedQuery,
    QueryIntent,
    AnalysisType,
    ExtractedVariable,
    QueryCondition,
    QueryStep,
    get_query_parser,
)

from .plan_generator import (
    AnalysisPlanGenerator,
    AnalysisPlan,
    AnalysisStep,
    AssumptionCheckStep,
    AssumptionCheck,
    StepStatus,
    get_plan_generator,
)

from .report_generator import (
    APAReportGenerator,
    ReportContent,
    ReportSection,
    StatisticalResult,
    StatisticalTest,
    get_report_generator,
)

__all__ = [
    # Query Parser
    "QueryParser",
    "ParsedQuery",
    "QueryIntent",
    "AnalysisType",
    "ExtractedVariable",
    "QueryCondition",
    "QueryStep",
    "get_query_parser",
    # Plan Generator
    "AnalysisPlanGenerator",
    "AnalysisPlan",
    "AnalysisStep",
    "AssumptionCheckStep",
    "AssumptionCheck",
    "StepStatus",
    "get_plan_generator",
    # Report Generator
    "APAReportGenerator",
    "ReportContent",
    "ReportSection",
    "StatisticalResult",
    "StatisticalTest",
    "get_report_generator",
]

__version__ = "1.0.0"
