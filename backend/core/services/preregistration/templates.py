"""
Pre-Registration Templates
==========================

Templates for major pre-registration platforms and standards.

Includes:
- OSF Pre-registration Template
- AsPredicted Template
- JARS-Quant Template

Created: December 26, 2025
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum


class TemplateSection(Enum):
    """Standard sections across templates."""
    TITLE = "title"
    AUTHORS = "authors"
    RESEARCH_QUESTIONS = "research_questions"
    HYPOTHESES = "hypotheses"
    DESIGN = "design"
    VARIABLES = "variables"
    SAMPLE = "sample"
    ANALYSIS = "analysis"
    DATA_EXCLUSION = "data_exclusion"
    OTHER = "other"


@dataclass
class TemplateField:
    """A field within a pre-registration template."""
    id: str
    label: str
    description: str
    required: bool = True
    field_type: str = "text"  # text, textarea, select, multi_select, number
    options: List[str] = field(default_factory=list)
    validation: Optional[Dict[str, Any]] = None
    placeholder: str = ""
    help_text: str = ""
    section: TemplateSection = TemplateSection.OTHER
    max_length: Optional[int] = None


@dataclass
class PreRegistrationTemplate:
    """Base class for pre-registration templates."""
    name: str
    version: str
    description: str
    url: str
    fields: List[TemplateField]
    sections: List[TemplateSection]

    def get_required_fields(self) -> List[TemplateField]:
        """Get all required fields."""
        return [f for f in self.fields if f.required]

    def get_fields_by_section(self, section: TemplateSection) -> List[TemplateField]:
        """Get fields for a specific section."""
        return [f for f in self.fields if f.section == section]

    def validate(self, data: Dict[str, Any]) -> Dict[str, List[str]]:
        """Validate data against template requirements."""
        errors = {}

        for field_def in self.fields:
            if field_def.required and field_def.id not in data:
                if field_def.id not in errors:
                    errors[field_def.id] = []
                errors[field_def.id].append(f"{field_def.label} is required")

            if field_def.id in data and field_def.max_length:
                if len(str(data[field_def.id])) > field_def.max_length:
                    if field_def.id not in errors:
                        errors[field_def.id] = []
                    errors[field_def.id].append(
                        f"{field_def.label} exceeds maximum length of {field_def.max_length}"
                    )

        return errors


# =====================
# OSF Pre-Registration Template
# =====================

OSF_FIELDS = [
    TemplateField(
        id="study_title",
        label="Study Title",
        description="Provide the working title of your study.",
        required=True,
        field_type="text",
        section=TemplateSection.TITLE,
        placeholder="A descriptive title for your study",
        max_length=500
    ),
    TemplateField(
        id="authors",
        label="Authors",
        description="List all authors and their affiliations.",
        required=True,
        field_type="textarea",
        section=TemplateSection.AUTHORS,
        placeholder="Author 1 (Affiliation)\nAuthor 2 (Affiliation)"
    ),
    TemplateField(
        id="research_questions",
        label="Research Questions",
        description="What are the primary research questions you are investigating?",
        required=True,
        field_type="textarea",
        section=TemplateSection.RESEARCH_QUESTIONS,
        help_text="List each research question clearly and specifically."
    ),
    TemplateField(
        id="hypotheses",
        label="Hypotheses",
        description="State your hypotheses as specifically as possible, including direction of effects.",
        required=True,
        field_type="textarea",
        section=TemplateSection.HYPOTHESES,
        help_text="Be as precise as possible. Specify directionality where applicable."
    ),
    TemplateField(
        id="study_design",
        label="Study Design",
        description="Describe your study design (e.g., between-subjects, within-subjects, mixed, etc.)",
        required=True,
        field_type="select",
        options=[
            "Between-subjects (independent groups)",
            "Within-subjects (repeated measures)",
            "Mixed design",
            "Correlational",
            "Observational",
            "Longitudinal",
            "Cross-sectional",
            "Other"
        ],
        section=TemplateSection.DESIGN
    ),
    TemplateField(
        id="design_description",
        label="Design Description",
        description="Provide a detailed description of your study design.",
        required=True,
        field_type="textarea",
        section=TemplateSection.DESIGN,
        help_text="Include number of conditions, factors, and levels."
    ),
    TemplateField(
        id="independent_variables",
        label="Independent/Predictor Variables",
        description="List and describe all independent or predictor variables.",
        required=True,
        field_type="textarea",
        section=TemplateSection.VARIABLES,
        help_text="Include how each variable will be measured or manipulated."
    ),
    TemplateField(
        id="dependent_variables",
        label="Dependent/Outcome Variables",
        description="List and describe all dependent or outcome variables.",
        required=True,
        field_type="textarea",
        section=TemplateSection.VARIABLES,
        help_text="Include how each variable will be measured."
    ),
    TemplateField(
        id="covariates",
        label="Covariates",
        description="List any covariates or control variables.",
        required=False,
        field_type="textarea",
        section=TemplateSection.VARIABLES
    ),
    TemplateField(
        id="sample_size",
        label="Sample Size",
        description="What is your target sample size?",
        required=True,
        field_type="number",
        section=TemplateSection.SAMPLE,
        validation={"min": 1}
    ),
    TemplateField(
        id="sample_size_rationale",
        label="Sample Size Rationale",
        description="How did you determine your sample size?",
        required=True,
        field_type="select",
        options=[
            "A priori power analysis",
            "Resource constraints",
            "Rule of thumb",
            "Sequential analysis",
            "Other"
        ],
        section=TemplateSection.SAMPLE
    ),
    TemplateField(
        id="power_analysis",
        label="Power Analysis Details",
        description="If using power analysis, provide the details.",
        required=False,
        field_type="textarea",
        section=TemplateSection.SAMPLE,
        help_text="Include effect size, alpha, power, and software used."
    ),
    TemplateField(
        id="stopping_rule",
        label="Stopping Rule",
        description="What is your rule for stopping data collection?",
        required=True,
        field_type="textarea",
        section=TemplateSection.SAMPLE
    ),
    TemplateField(
        id="inclusion_criteria",
        label="Inclusion Criteria",
        description="Describe criteria for including participants.",
        required=True,
        field_type="textarea",
        section=TemplateSection.SAMPLE
    ),
    TemplateField(
        id="exclusion_criteria",
        label="Exclusion Criteria",
        description="Describe criteria for excluding participants.",
        required=True,
        field_type="textarea",
        section=TemplateSection.DATA_EXCLUSION
    ),
    TemplateField(
        id="data_exclusion_procedures",
        label="Data Exclusion Procedures",
        description="How will you determine which data points to exclude?",
        required=True,
        field_type="textarea",
        section=TemplateSection.DATA_EXCLUSION,
        help_text="Include any outlier detection methods."
    ),
    TemplateField(
        id="statistical_analyses",
        label="Statistical Analyses",
        description="Describe your planned statistical analyses.",
        required=True,
        field_type="textarea",
        section=TemplateSection.ANALYSIS,
        help_text="Be specific about which tests you will use for which hypotheses."
    ),
    TemplateField(
        id="inference_criteria",
        label="Inference Criteria",
        description="What criteria will you use for statistical inference?",
        required=True,
        field_type="textarea",
        section=TemplateSection.ANALYSIS,
        help_text="e.g., alpha = .05, Bayes Factor > 3, etc."
    ),
    TemplateField(
        id="exploratory_analyses",
        label="Exploratory Analyses",
        description="Describe any exploratory analyses you plan to conduct.",
        required=False,
        field_type="textarea",
        section=TemplateSection.ANALYSIS
    ),
    TemplateField(
        id="other",
        label="Other",
        description="Any other information you would like to include.",
        required=False,
        field_type="textarea",
        section=TemplateSection.OTHER
    )
]

OSFTemplate = PreRegistrationTemplate(
    name="OSF Pre-registration",
    version="2.0",
    description="Standard pre-registration template for the Open Science Framework.",
    url="https://osf.io/prereg/",
    fields=OSF_FIELDS,
    sections=[
        TemplateSection.TITLE,
        TemplateSection.AUTHORS,
        TemplateSection.RESEARCH_QUESTIONS,
        TemplateSection.HYPOTHESES,
        TemplateSection.DESIGN,
        TemplateSection.VARIABLES,
        TemplateSection.SAMPLE,
        TemplateSection.DATA_EXCLUSION,
        TemplateSection.ANALYSIS,
        TemplateSection.OTHER
    ]
)


# =====================
# AsPredicted Template
# =====================

ASPREDICTED_FIELDS = [
    TemplateField(
        id="study_title",
        label="Study Title",
        description="Working title for your study.",
        required=True,
        field_type="text",
        section=TemplateSection.TITLE
    ),
    TemplateField(
        id="authors",
        label="Authors",
        description="Who are the authors of this study?",
        required=True,
        field_type="textarea",
        section=TemplateSection.AUTHORS
    ),
    TemplateField(
        id="data_collection_status",
        label="Data Collection Status",
        description="Have any data been collected for this study already?",
        required=True,
        field_type="select",
        options=[
            "No, no data have been collected for this study yet",
            "Yes, data collection is already underway or complete"
        ],
        section=TemplateSection.OTHER
    ),
    TemplateField(
        id="hypothesis",
        label="Hypothesis",
        description="What's the main question being asked or hypothesis being tested?",
        required=True,
        field_type="textarea",
        section=TemplateSection.HYPOTHESES,
        help_text="Describe the key DVs, IVs, and predicted relationship."
    ),
    TemplateField(
        id="dependent_variable",
        label="Dependent Variable(s)",
        description="Describe the key dependent variable(s).",
        required=True,
        field_type="textarea",
        section=TemplateSection.VARIABLES
    ),
    TemplateField(
        id="conditions",
        label="Conditions",
        description="How many and which conditions will participants be assigned to?",
        required=True,
        field_type="textarea",
        section=TemplateSection.DESIGN
    ),
    TemplateField(
        id="analyses",
        label="Analyses",
        description="Specify exactly which analyses you will conduct to examine each hypothesis.",
        required=True,
        field_type="textarea",
        section=TemplateSection.ANALYSIS
    ),
    TemplateField(
        id="outliers",
        label="Outliers and Exclusions",
        description="Describe your rules for excluding data.",
        required=True,
        field_type="textarea",
        section=TemplateSection.DATA_EXCLUSION
    ),
    TemplateField(
        id="sample_size",
        label="Sample Size",
        description="How many observations will be collected?",
        required=True,
        field_type="textarea",
        section=TemplateSection.SAMPLE
    ),
    TemplateField(
        id="other",
        label="Other",
        description="Anything else you would like to pre-register?",
        required=False,
        field_type="textarea",
        section=TemplateSection.OTHER
    ),
    TemplateField(
        id="study_type",
        label="Study Type",
        description="What type of study is this?",
        required=True,
        field_type="select",
        options=[
            "Experiment",
            "Survey",
            "Observational",
            "Other"
        ],
        section=TemplateSection.DESIGN
    )
]

AsPredictedTemplate = PreRegistrationTemplate(
    name="AsPredicted",
    version="1.0",
    description="Simple pre-registration format from AsPredicted.org.",
    url="https://aspredicted.org/",
    fields=ASPREDICTED_FIELDS,
    sections=[
        TemplateSection.TITLE,
        TemplateSection.AUTHORS,
        TemplateSection.HYPOTHESES,
        TemplateSection.VARIABLES,
        TemplateSection.DESIGN,
        TemplateSection.ANALYSIS,
        TemplateSection.DATA_EXCLUSION,
        TemplateSection.SAMPLE,
        TemplateSection.OTHER
    ]
)


# =====================
# JARS-Quant Template
# =====================

JARS_FIELDS = [
    TemplateField(
        id="title",
        label="Title",
        description="Study title.",
        required=True,
        field_type="text",
        section=TemplateSection.TITLE
    ),
    TemplateField(
        id="abstract",
        label="Abstract",
        description="Study abstract.",
        required=True,
        field_type="textarea",
        section=TemplateSection.TITLE
    ),
    TemplateField(
        id="problem_statement",
        label="Problem Statement",
        description="Statement of the problem or question being investigated.",
        required=True,
        field_type="textarea",
        section=TemplateSection.RESEARCH_QUESTIONS
    ),
    TemplateField(
        id="theoretical_framework",
        label="Theoretical Framework",
        description="Theoretical basis for the study and hypotheses.",
        required=True,
        field_type="textarea",
        section=TemplateSection.RESEARCH_QUESTIONS
    ),
    TemplateField(
        id="hypotheses_aims",
        label="Hypotheses and Aims",
        description="Specific hypotheses tested and/or objectives.",
        required=True,
        field_type="textarea",
        section=TemplateSection.HYPOTHESES
    ),
    TemplateField(
        id="study_design",
        label="Study Design",
        description="Type of design (e.g., experimental, observational).",
        required=True,
        field_type="select",
        options=[
            "Experimental - Randomized",
            "Experimental - Non-randomized",
            "Quasi-experimental",
            "Observational - Cross-sectional",
            "Observational - Longitudinal",
            "Meta-analysis"
        ],
        section=TemplateSection.DESIGN
    ),
    TemplateField(
        id="sampling_procedures",
        label="Sampling Procedures",
        description="Procedures for selecting participants.",
        required=True,
        field_type="textarea",
        section=TemplateSection.SAMPLE
    ),
    TemplateField(
        id="sample_size_determination",
        label="Sample Size Determination",
        description="How the sample size was determined.",
        required=True,
        field_type="textarea",
        section=TemplateSection.SAMPLE
    ),
    TemplateField(
        id="power_analysis_details",
        label="Power Analysis",
        description="Details of any power analysis conducted.",
        required=False,
        field_type="textarea",
        section=TemplateSection.SAMPLE
    ),
    TemplateField(
        id="measures",
        label="Measures and Covariates",
        description="Description of all measures and covariates.",
        required=True,
        field_type="textarea",
        section=TemplateSection.VARIABLES
    ),
    TemplateField(
        id="data_collection",
        label="Data Collection",
        description="Data collection procedures and quality control.",
        required=True,
        field_type="textarea",
        section=TemplateSection.DESIGN
    ),
    TemplateField(
        id="statistical_analysis_plan",
        label="Statistical Analysis Plan",
        description="Planned statistical analyses for each hypothesis.",
        required=True,
        field_type="textarea",
        section=TemplateSection.ANALYSIS
    ),
    TemplateField(
        id="missing_data",
        label="Missing Data",
        description="How missing data will be handled.",
        required=True,
        field_type="textarea",
        section=TemplateSection.DATA_EXCLUSION
    ),
    TemplateField(
        id="assumptions",
        label="Statistical Assumptions",
        description="How statistical assumptions will be checked.",
        required=True,
        field_type="textarea",
        section=TemplateSection.ANALYSIS
    ),
    TemplateField(
        id="corrections",
        label="Corrections for Multiple Testing",
        description="Procedures for correcting multiple comparisons.",
        required=False,
        field_type="textarea",
        section=TemplateSection.ANALYSIS
    ),
    TemplateField(
        id="effect_sizes",
        label="Effect Sizes",
        description="Which effect sizes will be reported.",
        required=True,
        field_type="textarea",
        section=TemplateSection.ANALYSIS
    ),
    TemplateField(
        id="confidence_intervals",
        label="Confidence Intervals",
        description="Confidence intervals that will be reported.",
        required=True,
        field_type="textarea",
        section=TemplateSection.ANALYSIS
    )
]

JARSTemplate = PreRegistrationTemplate(
    name="JARS-Quant",
    version="1.0",
    description="Based on APA Journal Article Reporting Standards for Quantitative Research.",
    url="https://apastyle.apa.org/jars",
    fields=JARS_FIELDS,
    sections=[
        TemplateSection.TITLE,
        TemplateSection.RESEARCH_QUESTIONS,
        TemplateSection.HYPOTHESES,
        TemplateSection.DESIGN,
        TemplateSection.SAMPLE,
        TemplateSection.VARIABLES,
        TemplateSection.DATA_EXCLUSION,
        TemplateSection.ANALYSIS,
        TemplateSection.OTHER
    ]
)


# =====================
# Template Registry
# =====================

PREREGISTRATION_TEMPLATES = {
    'osf': OSFTemplate,
    'aspredicted': AsPredictedTemplate,
    'jars': JARSTemplate
}


def get_template(name: str) -> PreRegistrationTemplate:
    """
    Get a pre-registration template by name.

    Args:
        name: Template name ('osf', 'aspredicted', 'jars')

    Returns:
        PreRegistrationTemplate object
    """
    name = name.lower()
    if name not in PREREGISTRATION_TEMPLATES:
        available = list(PREREGISTRATION_TEMPLATES.keys())
        raise ValueError(f"Unknown template: {name}. Available: {available}")
    return PREREGISTRATION_TEMPLATES[name]


def get_template_names() -> List[str]:
    """Get list of available template names."""
    return list(PREREGISTRATION_TEMPLATES.keys())


def get_template_info() -> List[Dict[str, Any]]:
    """Get information about all available templates."""
    info = []
    for name, template in PREREGISTRATION_TEMPLATES.items():
        info.append({
            'id': name,
            'name': template.name,
            'version': template.version,
            'description': template.description,
            'url': template.url,
            'field_count': len(template.fields),
            'required_field_count': len(template.get_required_fields())
        })
    return info
