"""
Pre-Registration Assistant Module
=================================

A comprehensive tool for creating study pre-registrations that align with
open science practices and major repository formats.

Features:
- Template library (OSF, AsPredicted, JARS formats)
- Guided hypothesis formulation with operationalization
- Sample size justification with power analysis integration
- Analysis plan specification with test selection
- Export to multiple formats (OSF JSON, PDF, Word)

References:
    Nosek, B. A., et al. (2018). The preregistration revolution.
    PNAS, 115(11), 2600-2606.

    Wagenmakers, E. J., et al. (2012). An agenda for purely confirmatory research.
    Perspectives on Psychological Science, 7(6), 632-638.

    American Psychological Association. (2020).
    Journal Article Reporting Standards (JARS).

Created: December 26, 2025
Author: StickForStats Team
"""

from .templates import (
    PREREGISTRATION_TEMPLATES,
    get_template,
    get_template_names,
    OSFTemplate,
    AsPredictedTemplate,
    JARSTemplate,
)

from .hypothesis import Hypothesis, HypothesisFormulator, HYPOTHESIS_TYPES, VARIABLE_TYPES

from .sample_size import SampleSizeJustification, create_sample_size_justification, JUSTIFICATION_STRATEGIES

from .analysis_plan import AnalysisPlan, AnalysisStep, create_analysis_plan, create_standard_analysis_steps

from .preregistration import (
    PreRegistration,
    PreRegistrationBuilder,
    export_to_osf_json,
    export_to_markdown,
    export_to_pdf_data,
)

__all__ = [
    # Templates
    "PREREGISTRATION_TEMPLATES",
    "get_template",
    "get_template_names",
    "OSFTemplate",
    "AsPredictedTemplate",
    "JARSTemplate",
    # Hypothesis
    "Hypothesis",
    "HypothesisFormulator",
    "HYPOTHESIS_TYPES",
    "VARIABLE_TYPES",
    # Sample Size
    "SampleSizeJustification",
    "create_sample_size_justification",
    "JUSTIFICATION_STRATEGIES",
    # Analysis Plan
    "AnalysisPlan",
    "AnalysisStep",
    "create_analysis_plan",
    "create_standard_analysis_steps",
    # Pre-Registration
    "PreRegistration",
    "PreRegistrationBuilder",
    "export_to_osf_json",
    "export_to_markdown",
    "export_to_pdf_data",
]

__version__ = "1.0.0"
