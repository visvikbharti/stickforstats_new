"""
Discipline-Specific Review Configurations for Manuscript Review
===============================================================

Provides guideline-aware checklist evaluation for academic manuscripts
across seven major research disciplines. Each :class:`DisciplineProfile`
encodes the reporting requirements of a recognised guideline (CONSORT 2010,
STROBE, APA JARS-Quant, etc.) and can adjust SQS category weights and
finding severities accordingly.

The profiles are consumed by :class:`~core.manuscript.manuscript_guardian.ManuscriptGuardian`
to produce discipline-tailored review reports.

References
----------
- CONSORT 2010: Schulz KF et al. *BMJ* 2010;340:c332
- STROBE: von Elm E et al. *Ann Intern Med* 2007;147(8):573-577
- APA JARS-Quant: Appelbaum M et al. *Am Psychol* 2018;73(1):3-25
- SPIRIT 2013 / ICH E9(R1): for clinical trial protocols
- AEA Data and Code Availability Policy (2020)
- AERA reporting standards (2006)

Created: February 2026
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


# =====================================================================
# Data classes
# =====================================================================


@dataclass
class ChecklistItem:
    """A single guideline-derived reporting requirement.

    Parameters
    ----------
    id : str
        Machine-readable identifier, e.g. ``"consort_randomization"``.
    name : str
        Human-readable label, e.g. ``"Randomization method described"``.
    description : str
        Brief explanation of *why* this item matters.
    required : bool
        ``True`` means the item is **blocking** if absent (severity is
        elevated to at least ``'major'``); ``False`` means it is
        **recommended** (severity remains ``'moderate'`` or ``'minor'``).
    detection_pattern : str
        Regular-expression pattern used to detect mention of the item
        in the manuscript full text.  Patterns are compiled with
        ``re.IGNORECASE``.
    section_hint : str
        Preferred section in which to look: ``'methods'``, ``'results'``,
        ``'abstract'``, ``'discussion'``, or ``'any'``.
    category : str
        Conceptual bucket: ``'design'``, ``'analysis'``, ``'reporting'``,
        or ``'transparency'``.
    """

    id: str
    name: str
    description: str
    required: bool
    detection_pattern: str
    section_hint: str  # 'methods', 'results', 'abstract', 'discussion', 'any'
    category: str  # 'design', 'analysis', 'reporting', 'transparency'


@dataclass
class DisciplineProfile:
    """Complete discipline-specific review configuration.

    Parameters
    ----------
    name : str
        Display name, e.g. ``"Medicine (CONSORT)"``.
    field : str
        Matches ``Journal.field`` choices used elsewhere in the app.
    guideline : str
        Guideline codename: ``CONSORT``, ``STROBE``, ``JARS-Quant``, etc.
    description : str
        One-line explanation of when this profile applies.
    checklist : list[ChecklistItem]
        Ordered list of guideline-derived items to evaluate.
    category_weights : dict[str, float]
        Multipliers for SQS category scores.  Keys must match the six
        SQS categories: ``effect_sizes``, ``assumptions``, ``sample_power``,
        ``precision``, ``reproducibility``, ``guidelines``.
        A value of ``1.0`` means no change; ``1.5`` means 50 % heavier.
    severity_overrides : dict[str, str]
        Map ``{finding_type: severity}`` to override default severity
        levels for particular finding types within this discipline.
    required_sections : list[str]
        Section types (matching ``ManuscriptSection.section_type``) that
        *must* be present in a well-formed manuscript.
    """

    name: str
    field: str
    guideline: str
    description: str
    checklist: List[ChecklistItem] = field(default_factory=list)
    category_weights: Dict[str, float] = field(default_factory=dict)
    severity_overrides: Dict[str, str] = field(default_factory=dict)
    required_sections: List[str] = field(default_factory=list)


@dataclass
class ChecklistResult:
    """Result of evaluating one :class:`ChecklistItem` against a manuscript.

    Attributes
    ----------
    item : ChecklistItem
        The checklist item that was evaluated.
    found : bool
        ``True`` if the detection pattern matched manuscript text.
    matched_text : str
        The first match snippet (up to 200 chars), or ``''`` if not found.
    section_searched : str
        Which section was actually searched.
    severity : str
        Computed severity: ``'blocking'`` / ``'major'`` for required items
        that are missing; ``'moderate'`` for recommended items that are
        missing; ``'positive'`` when found.
    """

    item: ChecklistItem
    found: bool
    matched_text: str = ""
    section_searched: str = ""
    severity: str = "positive"


# =====================================================================
# Default SQS category weights (1.0 = no adjustment)
# =====================================================================

_DEFAULT_WEIGHTS: Dict[str, float] = {
    "effect_sizes": 1.0,
    "assumptions": 1.0,
    "sample_power": 1.0,
    "precision": 1.0,
    "reproducibility": 1.0,
    "guidelines": 1.0,
}


# =====================================================================
# 1. Medicine — CONSORT 2010 (Randomized Controlled Trials)
# =====================================================================

_CONSORT_CHECKLIST: List[ChecklistItem] = [
    ChecklistItem(
        id="consort_randomization",
        name="Randomization method described",
        description=(
            "CONSORT 2010 Item 8a: Method used to generate the random "
            "allocation sequence must be described (e.g. computer-generated "
            "random numbers, permuted blocks)."
        ),
        required=True,
        detection_pattern=(
            r"randomi[sz](?:ation|ed|ing)"
            r"|random\s+(?:allocation|assignment|sequence)"
            r"|permuted\s+block"
            r"|stratified\s+randomi[sz]"
            r"|computer[\s-]generated\s+random"
        ),
        section_hint="methods",
        category="design",
    ),
    ChecklistItem(
        id="consort_allocation_concealment",
        name="Allocation concealment mechanism",
        description=(
            "CONSORT 2010 Item 9: Mechanism used to implement the random "
            "allocation sequence (e.g. sequentially numbered opaque sealed "
            "envelopes) and steps taken to conceal the sequence until "
            "interventions were assigned."
        ),
        required=True,
        detection_pattern=(
            r"allocation\s+conceal"
            r"|sealed\s+envelopes?"
            r"|central(?:ised|ized)?\s+(?:allocation|randomi[sz]ation)"
            r"|interactive\s+(?:web|voice)\s+response"
            r"|sequentially\s+numbered"
        ),
        section_hint="methods",
        category="design",
    ),
    ChecklistItem(
        id="consort_blinding",
        name="Blinding (masking) described",
        description=(
            "CONSORT 2010 Item 11a: Who was blinded after assignment to "
            "interventions (participants, care providers, outcome assessors) "
            "and how."
        ),
        required=True,
        detection_pattern=(
            r"(?:single|double|triple)[\s-]blind"
            r"|(?:single|double|triple)[\s-]mask"
            r"|blinding\s+(?:of|was)"
            r"|masking\s+(?:of|was)"
            r"|open[\s-]label"
            r"|unblinded"
            r"|placebo[\s-]controlled"
        ),
        section_hint="methods",
        category="design",
    ),
    ChecklistItem(
        id="consort_itt",
        name="Intention-to-treat analysis",
        description=(
            "CONSORT 2010 Item 16: Whether analysis was by original "
            "assigned groups (intention-to-treat). Modified ITT should "
            "also be described."
        ),
        required=True,
        detection_pattern=(
            r"intention[\s-]to[\s-]treat"
            r"|ITT\s+(?:analysis|population|principle)"
            r"|modified\s+ITT"
            r"|mITT"
            r"|analys[ei][sd]\s+(?:as|according\s+to)\s+(?:their\s+)?(?:original|assigned)"
        ),
        section_hint="methods",
        category="analysis",
    ),
    ChecklistItem(
        id="consort_flow_diagram",
        name="CONSORT flow diagram",
        description=(
            "CONSORT 2010 Item 13a: Flow diagram showing the number of "
            "participants at each stage (enrolment, allocation, follow-up, "
            "analysis)."
        ),
        required=True,
        detection_pattern=(
            r"(?:CONSORT|flow)\s+diagram"
            r"|(?:CONSORT|participant|patient)\s+flow"
            r"|Figure\s*\d*\s*[\.:]\s*(?:CONSORT|flow|participant)"
        ),
        section_hint="results",
        category="reporting",
    ),
    ChecklistItem(
        id="consort_primary_outcome",
        name="Primary and secondary outcomes defined",
        description=(
            "CONSORT 2010 Item 6a: Completely defined pre-specified "
            "primary and secondary outcome measures, including how and "
            "when they were assessed."
        ),
        required=True,
        detection_pattern=(
            r"primary\s+(?:outcome|endpoint|end[\s-]point|measure)"
            r"|secondary\s+(?:outcome|endpoint|end[\s-]point|measure)"
            r"|co[\s-]?primary\s+(?:outcome|endpoint)"
        ),
        section_hint="methods",
        category="design",
    ),
    ChecklistItem(
        id="consort_adverse_events",
        name="Adverse events or harms reported",
        description=("CONSORT 2010 Item 19: All important harms or unintended " "effects in each group."),
        required=True,
        detection_pattern=(
            r"adverse\s+(?:event|effect|reaction|experience)"
            r"|(?:serious\s+)?(?:AE|SAE)s?\b"
            r"|harm[s]?\s+(?:report|were|are|included)"
            r"|safety\s+(?:outcome|endpoint|data|profile)"
            r"|side[\s-]?effect"
            r"|tolerability"
        ),
        section_hint="results",
        category="reporting",
    ),
    ChecklistItem(
        id="consort_effect_sizes",
        name="Effect sizes with confidence intervals",
        description=(
            "CONSORT 2010 Item 17a: For each primary and secondary outcome, "
            "results including estimated effect size and its precision "
            "(e.g. 95 % confidence interval)."
        ),
        required=True,
        detection_pattern=(
            r"(?:effect\s+size|Cohen[\'s]*\s*d|odds\s+ratio|risk\s+ratio"
            r"|hazard\s+ratio|relative\s+risk|NNT|number\s+needed\s+to\s+treat"
            r"|mean\s+difference|standardized\s+mean)"
            r"|(?:confidence\s+interval|CI\s*[=:]?\s*[\[\(]?\s*-?\d)"
            r"|\d+\s*%\s*CI"
        ),
        section_hint="results",
        category="analysis",
    ),
    ChecklistItem(
        id="consort_sample_size",
        name="Sample size determination",
        description=(
            "CONSORT 2010 Item 7a: How sample size was determined, "
            "including explanation of any interim analyses and stopping "
            "guidelines."
        ),
        required=True,
        detection_pattern=(
            r"sample\s+size\s+(?:calculat|determin|estimat|was\s+based)"
            r"|power\s+(?:analysis|calculation|of\s+\d)"
            r"|(?:a\s+priori|priori)\s+power"
            r"|(?:minimum|required)\s+sample\s+(?:size|of)"
            r"|(?:\d+\s*%?\s+)?power\s+to\s+detect"
        ),
        section_hint="methods",
        category="analysis",
    ),
    ChecklistItem(
        id="consort_trial_registration",
        name="Trial registration number",
        description=("CONSORT 2010 Item 23: Registration number and name of " "trial registry."),
        required=True,
        detection_pattern=(
            r"(?:NCT|ISRCTN|ACTRN|ChiCTR|CTRI|DRKS|EUCTR|IRCT|JPRN"
            r"|KCT|NTR|PACTR|SLCTR|TCTR|UMIN)\s*\d+"
            r"|(?:trial|study)\s+(?:was\s+)?regist(?:er|ration)"
            r"|clinicaltrials\.gov"
            r"|trial\s+regist(?:ry|ration)\s*(?:number|:)"
        ),
        section_hint="any",
        category="transparency",
    ),
]


CONSORT_PROFILE = DisciplineProfile(
    name="Medicine (CONSORT)",
    field="medicine",
    guideline="CONSORT",
    description=(
        "CONSORT 2010 checklist for randomised controlled trials. "
        "Enforces transparent reporting of randomization, blinding, "
        "participant flow, and all primary/secondary outcomes."
    ),
    checklist=_CONSORT_CHECKLIST,
    category_weights={
        **_DEFAULT_WEIGHTS,
        "sample_power": 1.5,
        "reproducibility": 1.3,
        "guidelines": 1.3,
    },
    severity_overrides={
        "missing_effect_size": "major",
        "missing_ci": "major",
        "missing_power_analysis": "blocking",
        "p_value_only": "major",
    },
    required_sections=["abstract", "methods", "results", "discussion"],
)


# =====================================================================
# 2. Medicine — STROBE (Observational Studies)
# =====================================================================

_STROBE_CHECKLIST: List[ChecklistItem] = [
    ChecklistItem(
        id="strobe_study_design",
        name="Study design stated in title or abstract",
        description=(
            "STROBE Item 1: Indicate the study's design with a commonly "
            "used term in the title or abstract (cohort, case-control, "
            "cross-sectional)."
        ),
        required=True,
        detection_pattern=(
            r"(?:cohort|case[\s-]control|cross[\s-]sectional|longitudinal"
            r"|prospective|retrospective|nested\s+case)"
            r"\s+(?:study|design|analysis|investigation)"
        ),
        section_hint="abstract",
        category="design",
    ),
    ChecklistItem(
        id="strobe_eligibility",
        name="Eligibility criteria described",
        description=(
            "STROBE Item 6a: Give the eligibility criteria, and the "
            "sources and methods of selection of participants."
        ),
        required=True,
        detection_pattern=(
            r"(?:eligib|inclusion|exclusion)\s+criteria"
            r"|(?:included|excluded)\s+(?:if|participants?|patients?|subjects?)"
            r"|(?:selection|recruitment)\s+(?:criteria|of\s+participants)"
        ),
        section_hint="methods",
        category="design",
    ),
    ChecklistItem(
        id="strobe_data_sources",
        name="Data sources and measurement",
        description=(
            "STROBE Item 8: For each variable of interest, give sources "
            "of data and details of methods of assessment (measurement). "
            "Describe comparability of assessment methods if multiple groups."
        ),
        required=True,
        detection_pattern=(
            r"data\s+(?:source|were\s+(?:collect|obtain|extract|retriev))"
            r"|(?:medical|electronic|health)\s+record"
            r"|(?:survey|questionnaire|interview|chart\s+review)"
            r"|(?:measurement|assessment)\s+(?:method|tool|instrument)"
            r"|(?:ICD|CPT)[\s-]?\d"
        ),
        section_hint="methods",
        category="design",
    ),
    ChecklistItem(
        id="strobe_bias",
        name="Bias assessment",
        description=("STROBE Item 9: Describe any efforts to address potential " "sources of bias."),
        required=True,
        detection_pattern=(
            r"(?:potential|source|risk)\s+(?:of\s+)?bias"
            r"|selection\s+bias"
            r"|information\s+bias"
            r"|(?:recall|detection|reporting|measurement)\s+bias"
            r"|(?:bias|confound)\s+(?:was|were)\s+(?:address|assess|mitigat|reduc)"
        ),
        section_hint="methods",
        category="design",
    ),
    ChecklistItem(
        id="strobe_confounders",
        name="Confounders addressed",
        description=(
            "STROBE Item 12a: Describe all statistical methods, "
            "including those used to control for confounding. "
            "Item 12b: Describe methods for examining subgroups "
            "and interactions."
        ),
        required=True,
        detection_pattern=(
            r"confound(?:er|ing|ed)"
            r"|adjust(?:ed|ing|ment)\s+(?:for|model|analysis|variable)"
            r"|covariate"
            r"|propensity\s+(?:score|matching|weight)"
            r"|multivariable"
            r"|stratif(?:ied|ication)"
        ),
        section_hint="methods",
        category="analysis",
    ),
    ChecklistItem(
        id="strobe_effect_ci",
        name="Effect estimates with confidence intervals",
        description=(
            "STROBE Item 16c: Give unadjusted estimates and, if "
            "applicable, confounder-adjusted estimates and their "
            "precision (e.g. 95 % confidence intervals). Make clear "
            "which confounders were adjusted for."
        ),
        required=True,
        detection_pattern=(
            r"(?:odds\s+ratio|OR|risk\s+ratio|RR|hazard\s+ratio|HR"
            r"|rate\s+ratio|prevalence\s+ratio|incidence\s+rate\s+ratio)"
            r"|(?:confidence\s+interval|CI)\s*[=:]?\s*[\[\(]?\s*-?\d"
            r"|\d+\s*%\s*CI"
            r"|(?:adjusted|unadjusted)\s+(?:OR|RR|HR|estimate)"
        ),
        section_hint="results",
        category="analysis",
    ),
    ChecklistItem(
        id="strobe_missing_data",
        name="Missing data handling reported",
        description=("STROBE Item 12c: Explain how missing data were addressed."),
        required=True,
        detection_pattern=(
            r"missing\s+(?:data|values?|observations?|information)"
            r"|(?:complete[\s-]case|listwise|pairwise)\s+(?:analysis|deletion)"
            r"|(?:multiple\s+)?imputation"
            r"|(?:MCAR|MAR|MNAR)"
            r"|(?:last\s+observation\s+carried\s+forward|LOCF)"
        ),
        section_hint="methods",
        category="analysis",
    ),
    ChecklistItem(
        id="strobe_participant_numbers",
        name="Participant numbers at each stage",
        description=(
            "STROBE Item 13a: Report numbers of individuals at each "
            "stage of study — numbers potentially eligible, examined "
            "for eligibility, confirmed eligible, included in the "
            "study, completing follow-up, and analysed."
        ),
        required=True,
        detection_pattern=(
            r"(?:participant|patient|subject|individual)\s+flow"
            r"|flow\s+(?:chart|diagram)"
            r"|(?:were|was)\s+(?:included|excluded|enrolled|screened)"
            r"|(?:final|analytic)\s+(?:sample|cohort)\s+(?:consist|compris|includ)"
            r"|(?:N|n)\s*=\s*\d{2,}"
        ),
        section_hint="results",
        category="reporting",
    ),
    ChecklistItem(
        id="strobe_sensitivity",
        name="Sensitivity analyses",
        description=("STROBE Item 12e: Describe any sensitivity analyses."),
        required=False,
        detection_pattern=(
            r"sensitivity\s+analy"
            r"|(?:supplementa(?:ry|l)|additional|alternative)\s+analy"
            r"|robust(?:ness)?\s+(?:check|analy|test)"
        ),
        section_hint="results",
        category="analysis",
    ),
]


STROBE_PROFILE = DisciplineProfile(
    name="Medicine (STROBE)",
    field="medicine_observational",
    guideline="STROBE",
    description=(
        "STROBE checklist for observational studies (cohort, case-control, "
        "cross-sectional). Ensures transparent reporting of study design, "
        "participant selection, bias handling, and effect estimation."
    ),
    checklist=_STROBE_CHECKLIST,
    category_weights={
        **_DEFAULT_WEIGHTS,
        "assumptions": 1.5,
        "guidelines": 1.3,
    },
    severity_overrides={
        "missing_ci": "major",
        "missing_effect_size": "major",
        "missing_confounder_adjustment": "major",
    },
    required_sections=["abstract", "methods", "results", "discussion"],
)


# =====================================================================
# 3. Psychology — APA JARS-Quant
# =====================================================================

_JARS_QUANT_CHECKLIST: List[ChecklistItem] = [
    ChecklistItem(
        id="jars_effect_sizes",
        name="Effect sizes for all tests",
        description=(
            "JARS-Quant Table 5: Report effect-size estimates and "
            "confidence intervals for all inferential tests. APA 7th "
            "edition mandates this for every hypothesis test reported."
        ),
        required=True,
        detection_pattern=(
            r"(?:effect\s+size|Cohen[\'s]*\s*[dfgh]|eta[\s-]?squared|\u03b7[²2p]"
            r"|Hedges'?\s*g|Glass'?\s*[Δd]|omega[\s-]?squared|ω[²2]"
            r"|\br\b\s*=\s*-?[01]?\.\d|\bR[²2]\s*=\s*[\d.]"
            r"|odds\s+ratio|risk\s+ratio|Cramer[\'s]*\s*V|phi\s*=)"
        ),
        section_hint="results",
        category="analysis",
    ),
    ChecklistItem(
        id="jars_exact_p_values",
        name="Exact p-values reported",
        description=(
            "JARS-Quant Table 5: Report exact p-values to two or three "
            "decimal places (e.g. p = .034) rather than inequality "
            "thresholds alone (p < .05), unless p < .001."
        ),
        required=True,
        detection_pattern=(r"p\s*=\s*\.?\d{2,3}" r"|p\s*=\s*0?\.\d{2,3}" r"|p\s*<\s*\.?001"),
        section_hint="results",
        category="reporting",
    ),
    ChecklistItem(
        id="jars_confidence_intervals",
        name="Confidence intervals reported",
        description=(
            "JARS-Quant Table 5: Report confidence intervals for " "effect-size estimates. 95 % CIs are standard."
        ),
        required=True,
        detection_pattern=(
            r"(?:confidence\s+interval|CI)\s*[=:]?\s*[\[\(]?\s*-?\d"
            r"|\d+\s*%\s*CI"
            r"|(?:lower|upper)\s+(?:bound|limit|CI)"
        ),
        section_hint="results",
        category="analysis",
    ),
    ChecklistItem(
        id="jars_sample_size_justification",
        name="Sample size justification",
        description=(
            "JARS-Quant Table 1: Describe the intended sample size and "
            "how it was determined — power analysis, resource constraints, "
            "or precision-based justification."
        ),
        required=True,
        detection_pattern=(
            r"sample\s+size\s+(?:was|justif|determin|calculat|estimat|based)"
            r"|power\s+(?:analysis|calculation|of\s+\d)"
            r"|(?:G\*Power|GPower|gpower)"
            r"|(?:sensitivity|a\s+priori)\s+power"
            r"|(?:minimum|target|required)\s+(?:sample|n)\s*(?:size|of|=)"
        ),
        section_hint="methods",
        category="analysis",
    ),
    ChecklistItem(
        id="jars_exclusion_criteria",
        name="Participant exclusion criteria and flow",
        description=(
            "JARS-Quant Table 2: Report the flow of participants through "
            "the study, including the number excluded and reasons for "
            "exclusions at each stage."
        ),
        required=True,
        detection_pattern=(
            r"exclusion\s+criteria"
            r"|(?:were|was)\s+excluded"
            r"|(?:participant|subject)\s+flow"
            r"|(?:after|following)\s+exclusion"
            r"|(?:excluded|removed)\s+(?:from|due\s+to|because|for)"
            r"|(?:final|analytic)\s+sample\s+(?:consist|compris)"
        ),
        section_hint="methods",
        category="reporting",
    ),
    ChecklistItem(
        id="jars_data_availability",
        name="Data availability statement",
        description=(
            "JARS-Quant Table 1: State whether data, code, and materials "
            "are available and, if so, where. APA encourages open data."
        ),
        required=True,
        detection_pattern=(
            r"data\s+(?:availability|sharing|access|are\s+available|can\s+be\s+(?:obtained|accessed))"
            r"|(?:open|publicly)\s+(?:available|accessible)\s+(?:data|materials?)"
            r"|(?:OSF|Open\s+Science\s+Framework|Zenodo|Dryad|figshare|GitHub|Dataverse)"
            r"|(?:data|materials?|code)\s+(?:(?:are|is)\s+)?(?:deposited|archived|shared|posted)"
        ),
        section_hint="any",
        category="transparency",
    ),
    ChecklistItem(
        id="jars_preregistration",
        name="Pre-registration disclosed",
        description=(
            "JARS-Quant Table 1: State whether and where the study "
            "(hypotheses, method, analysis plan) was pre-registered. "
            "Strongly recommended by APA but not always mandatory."
        ),
        required=False,
        detection_pattern=(
            r"pre[\s-]?regist(?:er|ration|ered)"
            r"|(?:registered|protocol)\s+(?:at|on|with)\s+(?:OSF|AsPredicted|ClinicalTrials|PROSPERO)"
            r"|(?:study|analysis)\s+(?:was\s+)?(?:pre[\s-]?registered)"
        ),
        section_hint="methods",
        category="transparency",
    ),
    ChecklistItem(
        id="jars_assumptions",
        name="Statistical assumptions checked",
        description=(
            "JARS-Quant: Report whether data met assumptions of the "
            "statistical tests used (normality, homogeneity of variance, "
            "sphericity, linearity, etc.) and any corrective measures."
        ),
        required=True,
        detection_pattern=(
            r"(?:assumption|normality|homogeneity|sphericity|linearity|homoscedasticity)"
            r"\s+(?:was|were|check|test|assess|examin|met|violat)"
            r"|(?:Shapiro[\s-]Wilk|Levene|Mauchly|Kolmogorov[\s-]Smirnov|Box[\'s]*\s*M)"
            r"|(?:Greenhouse[\s-]Geisser|Huynh[\s-]Feldt)\s+correct"
            r"|(?:Q[\s-]?Q\s+plot|skewness|kurtosis)\s+(?:was|were|suggest|indicat)"
        ),
        section_hint="results",
        category="analysis",
    ),
    ChecklistItem(
        id="jars_missing_data",
        name="Missing data handling",
        description=(
            "JARS-Quant Table 5: Describe the frequency and methods " "of handling missing data, if applicable."
        ),
        required=False,
        detection_pattern=(
            r"missing\s+(?:data|values?|observations?)"
            r"|(?:listwise|pairwise|casewise)\s+deletion"
            r"|(?:multiple\s+)?imputation"
            r"|(?:complete[\s-]case|available[\s-]case)\s+analysis"
            r"|(?:FIML|full\s+information\s+maximum\s+likelihood)"
        ),
        section_hint="methods",
        category="analysis",
    ),
]


JARS_QUANT_PROFILE = DisciplineProfile(
    name="Psychology (JARS-Quant)",
    field="psychology",
    guideline="JARS-Quant",
    description=(
        "APA Journal Article Reporting Standards (Quantitative) for "
        "experimental, quasi-experimental, and observational studies "
        "in psychology. Emphasises effect sizes, exact p-values, CIs, "
        "and data transparency."
    ),
    checklist=_JARS_QUANT_CHECKLIST,
    category_weights={
        **_DEFAULT_WEIGHTS,
        "effect_sizes": 1.5,
        "reproducibility": 1.5,
    },
    severity_overrides={
        "missing_effect_size": "blocking",
        "p_value_only": "major",
        "missing_ci": "major",
        "missing_data_availability": "moderate",
    },
    required_sections=["abstract", "introduction", "methods", "results", "discussion"],
)


# =====================================================================
# 4. Economics — Robustness and Identification
# =====================================================================

_ECONOMICS_CHECKLIST: List[ChecklistItem] = [
    ChecklistItem(
        id="econ_identification_strategy",
        name="Identification strategy stated",
        description=(
            "The causal identification strategy must be clearly stated: "
            "difference-in-differences, regression discontinuity, "
            "instrumental variables, natural experiment, matching, etc."
        ),
        required=True,
        detection_pattern=(
            r"identification\s+(?:strategy|assumption|approach)"
            r"|(?:difference[\s-]in[\s-]difference|diff[\s-]in[\s-]diff|DiD)"
            r"|regression\s+discontinuity"
            r"|instrumental\s+variable"
            r"|natural\s+experiment"
            r"|(?:propensity\s+score|nearest[\s-]neighbor)\s+matching"
            r"|(?:synthetic\s+control|event\s+study)"
            r"|(?:selection[\s-]on[\s-]observables|unconfoundedness)"
        ),
        section_hint="methods",
        category="design",
    ),
    ChecklistItem(
        id="econ_robustness_checks",
        name="Robustness checks reported",
        description=(
            "Standard in economics: the main result should be tested "
            "against alternative model specifications, functional forms, "
            "sample restrictions, or control variables to demonstrate "
            "robustness."
        ),
        required=True,
        detection_pattern=(
            r"robust(?:ness)?\s+(?:check|test|analy|specification|result)"
            r"|(?:sensitivity|alternative|supplementa(?:ry|l))\s+(?:analy|specification|model)"
            r"|(?:placebo|falsification)\s+(?:test|check|regression)"
            r"|(?:results?\s+(?:are|remain)\s+robust)"
        ),
        section_hint="results",
        category="analysis",
    ),
    ChecklistItem(
        id="econ_alternative_specifications",
        name="Alternative specifications",
        description=(
            "At least one alternative model specification (different "
            "controls, functional forms, samples) should be reported "
            "alongside the preferred specification."
        ),
        required=True,
        detection_pattern=(
            r"alternative\s+(?:specification|model|measure)"
            r"|(?:column|model|specification)\s+\(?[2-9IViv]+\)?"
            r"|(?:adding|dropping|including|excluding)\s+(?:controls?|covariate|variable|fixed\s+effect)"
            r"|(?:linear|log[\s-]?linear|probit|logit|tobit|Poisson)\s+(?:model|specification|regression)"
        ),
        section_hint="results",
        category="analysis",
    ),
    ChecklistItem(
        id="econ_standard_errors",
        name="Standard errors and clustering discussed",
        description=(
            "Standard errors must be reported. Clustering of standard "
            "errors at appropriate levels (e.g. state, firm, individual) "
            "should be discussed and justified."
        ),
        required=True,
        detection_pattern=(
            r"(?:standard\s+error|SE|s\.e\.)\s+(?:cluster|robust|heteroskedastic|bootstrap)"
            r"|cluster(?:ed|ing)\s+(?:at|by|standard\s+error)"
            r"|(?:robust|White|Huber[\s-]White|Eicker[\s-]Huber[\s-]White)\s+standard\s+error"
            r"|(?:Newey[\s-]West|HAC)\s+(?:standard\s+error|correction)"
            r"|bootstrap(?:ped)?\s+(?:standard\s+error|confidence|SE)"
        ),
        section_hint="methods",
        category="analysis",
    ),
    ChecklistItem(
        id="econ_instrument_validity",
        name="Instrument validity tested (if IV used)",
        description=(
            "When instrumental variables are used: report first-stage "
            "F-statistic, discuss exclusion restriction, and provide "
            "over-identification tests if applicable (Sargan/Hansen)."
        ),
        required=False,
        detection_pattern=(
            r"(?:first[\s-]stage|reduced[\s-]form)\s+(?:F[\s-]?statistic|regression|result)"
            r"|(?:exclusion|exogeneity)\s+restriction"
            r"|(?:Sargan|Hansen|over[\s-]?identification)\s+test"
            r"|(?:weak|strong)\s+instrument"
            r"|(?:Stock[\s-]Yogo|Kleibergen[\s-]Paap|Cragg[\s-]Donald)"
        ),
        section_hint="results",
        category="analysis",
    ),
    ChecklistItem(
        id="econ_fixed_effects",
        name="Fixed effects specification",
        description=(
            "Panel data and related designs should report which fixed "
            "effects are included (individual, time, industry, region) "
            "and why."
        ),
        required=False,
        detection_pattern=(
            r"fixed\s+effect"
            r"|(?:individual|firm|year|time|state|country|industry|region)\s+(?:fixed\s+)?effect"
            r"|(?:entity|unit)\s+(?:fixed\s+)?(?:effect|dummies?)"
            r"|(?:two[\s-]way|three[\s-]way)\s+fixed\s+effect"
            r"|(?:FE|RE)\s+(?:model|estimat|regression)"
        ),
        section_hint="methods",
        category="analysis",
    ),
    ChecklistItem(
        id="econ_data_code_availability",
        name="Data and code availability",
        description=(
            "AEA Data and Code Availability Policy (2020) and similar "
            "journal policies require authors to make data and code "
            "available, or explain why they cannot."
        ),
        required=True,
        detection_pattern=(
            r"(?:data|code)\s+(?:availability|are\s+available|is\s+available|replication)"
            r"|replication\s+(?:package|files?|code|data|materials?)"
            r"|(?:available\s+(?:at|from|on|upon))"
            r"|(?:Zenodo|Harvard\s+Dataverse|ICPSR|OpenICPSR|GitHub|replication\s+repository)"
        ),
        section_hint="any",
        category="transparency",
    ),
]


ECONOMICS_PROFILE = DisciplineProfile(
    name="Economics",
    field="economics",
    guideline="AEA",
    description=(
        "Review profile for empirical economics, emphasising causal "
        "identification, robustness of results, appropriate standard "
        "error estimation, and AEA-style data/code availability."
    ),
    checklist=_ECONOMICS_CHECKLIST,
    category_weights={
        **_DEFAULT_WEIGHTS,
        "assumptions": 2.0,
        "reproducibility": 1.3,
    },
    severity_overrides={
        "missing_robustness_checks": "major",
        "missing_identification_strategy": "blocking",
        "missing_standard_errors": "major",
    },
    required_sections=["introduction", "methods", "results"],
)


# =====================================================================
# 5. Education — Multilevel/Nested Data Awareness
# =====================================================================

_EDUCATION_CHECKLIST: List[ChecklistItem] = [
    ChecklistItem(
        id="edu_icc_reported",
        name="ICC reported for nested data",
        description=(
            "AERA reporting standards and best practices in education "
            "research require the intraclass correlation coefficient "
            "(ICC) to be reported when data are nested (students within "
            "classrooms, classrooms within schools)."
        ),
        required=True,
        detection_pattern=(
            r"(?:intraclass|intra[\s-]class)\s+correlation"
            r"|(?:ICC|ρ|rho)\s*[=:]\s*[\d.]"
            r"|design\s+effect"
            r"|(?:cluster|nesting|nest(?:ed|ing))\s+(?:effect|structure|variable|level)"
        ),
        section_hint="results",
        category="analysis",
    ),
    ChecklistItem(
        id="edu_multilevel_model",
        name="Multilevel modeling when appropriate",
        description=(
            "When students are nested within classrooms or schools, "
            "single-level analyses violate the independence assumption "
            "and underestimate standard errors. Multilevel (hierarchical "
            "linear) modeling should be used or justified if omitted."
        ),
        required=True,
        detection_pattern=(
            r"(?:multilevel|multi[\s-]level|hierarchical\s+linear|HLM|mixed[\s-]?(?:effects?|model))"
            r"|(?:random\s+(?:effects?|intercept|slope))"
            r"|(?:level[\s-]?[12]|between[\s-]?(?:group|school|class|cluster))"
            r"|(?:lmer|nlme|MLwiN|Mplus|HLM\d)"
        ),
        section_hint="methods",
        category="analysis",
    ),
    ChecklistItem(
        id="edu_effect_sizes",
        name="Effect sizes reported",
        description=(
            "What Works Clearinghouse (WWC) and AERA standards require "
            "effect sizes (preferably Hedges' g for group comparisons) "
            "to facilitate cross-study comparison."
        ),
        required=True,
        detection_pattern=(
            r"(?:effect\s+size|Cohen[\'s]*\s*d|Hedges[\'s]*\s*g|standardized\s+mean\s+difference)"
            r"|(?:eta[\s-]?squared|\u03b7[²2]|omega[\s-]?squared|ω[²2]|R[²2])"
            r"|(?:practical\s+significance|substantive\s+significance|magnitude\s+of\s+(?:the\s+)?effect)"
        ),
        section_hint="results",
        category="analysis",
    ),
    ChecklistItem(
        id="edu_demographics",
        name="Demographic description of participants",
        description=(
            "AERA reporting standards: Report participant demographics "
            "including race/ethnicity, gender, socioeconomic status, "
            "grade level, and any other characteristics relevant to "
            "generalizability."
        ),
        required=True,
        detection_pattern=(
            r"(?:demographic|participant|student)\s+(?:characteristics|description|information|data)"
            r"|(?:gender|sex|race|ethnic|socioeconomic|SES|free[\s-]?(?:and[\s-]?)?reduced[\s-]?(?:price[\s-]?)?lunch|FRL)"
            r"|(?:grade\s+level|age\s+range|mean\s+age)"
            r"|(?:English\s+(?:language\s+)?learner|ELL|special\s+education|IEP)"
        ),
        section_hint="methods",
        category="reporting",
    ),
    ChecklistItem(
        id="edu_sample_size_power",
        name="Sample size and power analysis",
        description=(
            "Report sample sizes at each level of nesting and, for "
            "experimental/quasi-experimental studies, a power analysis "
            "that accounts for clustering (MDES or minimum detectable "
            "effect size)."
        ),
        required=True,
        detection_pattern=(
            r"(?:sample\s+size|power\s+analysis|power\s+calculation)"
            r"|(?:number\s+of\s+(?:student|class|school|teacher|cluster))"
            r"|(?:MDES|minimum\s+detectable\s+effect)"
            r"|(?:Optimal\s+Design|PowerUp|COSA)"
        ),
        section_hint="methods",
        category="analysis",
    ),
    ChecklistItem(
        id="edu_attrition",
        name="Attrition and missing data",
        description=(
            "WWC standards: Report overall and differential attrition. "
            "Describe procedures for handling missing data, especially "
            "in longitudinal or intervention studies."
        ),
        required=True,
        detection_pattern=(
            r"attrition"
            r"|(?:differential|overall)\s+(?:attrition|dropout|loss\s+to\s+follow)"
            r"|missing\s+(?:data|values?|observations?)"
            r"|(?:multiple\s+)?imputation"
            r"|(?:intent[\s-]to[\s-]treat|ITT)\s+(?:in\s+education|analys)"
        ),
        section_hint="methods",
        category="reporting",
    ),
    ChecklistItem(
        id="edu_comparison_group",
        name="Comparison/control group described",
        description=(
            "For intervention studies: describe the comparison condition "
            "(business-as-usual, alternative treatment, waitlist) and "
            "demonstrate baseline equivalence."
        ),
        required=False,
        detection_pattern=(
            r"(?:comparison|control|counterfactual)\s+(?:group|condition|class|school)"
            r"|business[\s-]as[\s-]usual"
            r"|(?:waitlist|wait[\s-]list)\s+control"
            r"|baseline\s+equivalen"
            r"|(?:treatment|intervention)\s+(?:and|vs\.?|versus)\s+(?:control|comparison)"
        ),
        section_hint="methods",
        category="design",
    ),
    ChecklistItem(
        id="edu_fidelity",
        name="Implementation fidelity reported",
        description=(
            "For intervention studies: describe measures of implementation "
            "fidelity (dosage, adherence, quality of delivery)."
        ),
        required=False,
        detection_pattern=(
            r"(?:implementation|treatment|intervention)\s+fidelity"
            r"|(?:dosage|adherence|compliance)\s+(?:was|were|to\s+the)"
            r"|(?:fidelity\s+(?:of|to)\s+(?:implementation|treatment|intervention))"
        ),
        section_hint="methods",
        category="design",
    ),
]


EDUCATION_PROFILE = DisciplineProfile(
    name="Education",
    field="education",
    guideline="AERA/WWC",
    description=(
        "Review profile for education research following AERA reporting "
        "standards and What Works Clearinghouse evidence guidelines. "
        "Emphasises multilevel modeling for nested data, effect sizes, "
        "and demographic reporting for generalizability."
    ),
    checklist=_EDUCATION_CHECKLIST,
    category_weights={
        **_DEFAULT_WEIGHTS,
        "assumptions": 1.3,
        "sample_power": 1.3,
    },
    severity_overrides={
        "missing_icc": "major",
        "missing_multilevel": "major",
        "missing_effect_size": "major",
        "missing_demographics": "moderate",
    },
    required_sections=["abstract", "introduction", "methods", "results", "discussion"],
)


# =====================================================================
# 6. Clinical Trials — Regulatory-Grade Requirements
# =====================================================================

_CLINICAL_TRIAL_CHECKLIST: List[ChecklistItem] = [
    ChecklistItem(
        id="ct_primary_endpoint",
        name="Primary endpoint pre-specified",
        description=(
            "ICH E9 and CONSORT: The primary efficacy endpoint must be "
            "pre-specified in the protocol. Any change must be documented "
            "and justified before unblinding."
        ),
        required=True,
        detection_pattern=(
            r"(?:primary|co[\s-]?primary)\s+(?:efficacy\s+)?(?:endpoint|end[\s-]point|outcome)"
            r"|(?:pre[\s-]?specified|pre[\s-]?defined|a\s+priori)\s+(?:primary\s+)?(?:endpoint|outcome)"
        ),
        section_hint="methods",
        category="design",
    ),
    ChecklistItem(
        id="ct_itt_analysis",
        name="Intention-to-treat analysis",
        description=(
            "ICH E9: The primary analysis should be based on the "
            "intention-to-treat principle — all randomised patients "
            "should be included in the analysis."
        ),
        required=True,
        detection_pattern=(
            r"intention[\s-]to[\s-]treat"
            r"|ITT\s+(?:analysis|population|principle|set)"
            r"|(?:full\s+analysis\s+set|FAS)"
            r"|modified\s+ITT"
            r"|mITT"
        ),
        section_hint="methods",
        category="analysis",
    ),
    ChecklistItem(
        id="ct_per_protocol",
        name="Per-protocol analysis",
        description=(
            "ICH E9: A per-protocol analysis should be presented "
            "alongside the ITT analysis for supportive evidence. "
            "The per-protocol population should be clearly defined."
        ),
        required=True,
        detection_pattern=(
            r"per[\s-]?protocol"
            r"|(?:PP|PPS)\s+(?:analysis|population|set)"
            r"|(?:completer|compliant|evaluable)\s+(?:analysis|population|set)"
        ),
        section_hint="results",
        category="analysis",
    ),
    ChecklistItem(
        id="ct_adverse_events",
        name="Adverse events and serious adverse events",
        description=(
            "ICH E3 and CONSORT: Report adverse events (AEs), serious "
            "adverse events (SAEs), adverse events leading to "
            "discontinuation, and deaths by treatment group."
        ),
        required=True,
        detection_pattern=(
            r"(?:adverse\s+event|AE|adverse\s+reaction|adverse\s+effect)"
            r"|(?:serious\s+adverse\s+event|SAE|serious\s+adverse\s+reaction)"
            r"|(?:treatment[\s-]emergent|TEAE)"
            r"|(?:adverse\s+event|AE)s?\s+(?:leading\s+to|resulting\s+in)\s+(?:discontinuation|withdrawal)"
        ),
        section_hint="results",
        category="reporting",
    ),
    ChecklistItem(
        id="ct_data_monitoring",
        name="Data Safety Monitoring Board/Committee",
        description=(
            "CONSORT Item 7b and ICH E9: Describe the role of any data "
            "monitoring committee and interim analyses, including "
            "stopping rules."
        ),
        required=True,
        detection_pattern=(
            r"(?:data\s+(?:safety\s+)?monitoring\s+(?:board|committee)|DSMB|DMC|DSMC)"
            r"|interim\s+analy"
            r"|(?:stopping|futility)\s+(?:rule|boundar|guideline|criteria)"
            r"|(?:O\'Brien[\s-]Fleming|Lan[\s-]DeMets|alpha[\s-]?spending)"
        ),
        section_hint="methods",
        category="design",
    ),
    ChecklistItem(
        id="ct_registration_number",
        name="Trial registration number",
        description=(
            "ICMJE policy: All clinical trials must be registered in a "
            "public registry before the first participant is enrolled. "
            "The registration number must be reported."
        ),
        required=True,
        detection_pattern=(
            r"(?:NCT|ISRCTN|ACTRN|ChiCTR|CTRI|DRKS|EUCTR|IRCT|JPRN"
            r"|KCT|NTR|PACTR|SLCTR|TCTR|UMIN)\s*\d+"
            r"|clinicaltrials\.gov"
            r"|(?:trial|study)\s+(?:was\s+)?regist(?:er|ration)"
            r"|(?:EudraCT|WHO[\s-]?ICTRP)"
        ),
        section_hint="any",
        category="transparency",
    ),
    ChecklistItem(
        id="ct_randomization",
        name="Randomization method",
        description=(
            "CONSORT 2010 Item 8a/8b: Describe the method used to "
            "generate the random allocation sequence, type of "
            "randomisation, and details of any restriction."
        ),
        required=True,
        detection_pattern=(
            r"randomi[sz](?:ation|ed)\s+(?:method|sequence|procedure|scheme|was)"
            r"|(?:block|stratified|adaptive|minimization)\s+randomi[sz]"
            r"|(?:central(?:ised|ized)?|interactive\s+(?:web|voice)\s+response)\s+randomi[sz]"
            r"|(?:allocation\s+ratio|1\s*:\s*1\s+randomi[sz])"
        ),
        section_hint="methods",
        category="design",
    ),
    ChecklistItem(
        id="ct_blinding",
        name="Blinding described",
        description=(
            "CONSORT 2010 Item 11a/11b: Describe blinding of "
            "participants, care providers, and outcome assessors. "
            "If blinding was tested, describe how."
        ),
        required=True,
        detection_pattern=(
            r"(?:single|double|triple)[\s-]?blind"
            r"|(?:single|double|triple)[\s-]?mask"
            r"|open[\s-]label"
            r"|(?:blinding|masking)\s+(?:was|of|procedure)"
            r"|(?:participants?|investigators?|assessors?)\s+(?:were|was)\s+(?:blind|mask)"
        ),
        section_hint="methods",
        category="design",
    ),
    ChecklistItem(
        id="ct_sample_size",
        name="Sample size calculation",
        description=(
            "ICH E9 Section 3.5: The planned sample size should be "
            "determined based on the primary endpoint, clinically "
            "meaningful difference, significance level, and power."
        ),
        required=True,
        detection_pattern=(
            r"sample\s+size\s+(?:calculat|determin|estimat|was\s+based)"
            r"|power\s+(?:of\s+)?(?:80|90|0\.[89]\d*)\s*%?"
            r"|(?:type\s+I\s+error|alpha|significance\s+level)\s*(?:of|=|at)\s*(?:0\.0[15]|5\s*%|1\s*%)"
            r"|(?:clinically\s+)?(?:meaningful|important|relevant)\s+difference"
        ),
        section_hint="methods",
        category="analysis",
    ),
    ChecklistItem(
        id="ct_multiplicity",
        name="Multiplicity adjustment",
        description=(
            "ICH E9 Section 4.5: When multiple primary endpoints or "
            "multiple comparisons are involved, describe methods used "
            "to control the family-wise Type I error rate."
        ),
        required=True,
        detection_pattern=(
            r"(?:multiplicity|multiple\s+(?:comparison|testing|endpoint))\s+(?:adjust|correct|account|control)"
            r"|(?:Bonferroni|Holm|Hochberg|Sidak|Dunnett|Tukey)"
            r"|(?:family[\s-]?wise|FWER|false\s+discovery\s+rate|FDR)"
            r"|(?:alpha[\s-]?spending|gatekeeping|hierarchical\s+testing|graphical\s+approach)"
            r"|(?:closed\s+testing\s+procedure|Simes)"
        ),
        section_hint="methods",
        category="analysis",
    ),
    ChecklistItem(
        id="ct_sensitivity_analysis",
        name="Sensitivity analyses pre-specified",
        description=(
            "ICH E9(R1) estimands framework: Pre-specified sensitivity "
            "analyses should address different intercurrent event "
            "handling strategies and missing data assumptions."
        ),
        required=True,
        detection_pattern=(
            r"sensitivity\s+analy"
            r"|(?:tipping\s+point|worst[\s-]?case|delta[\s-]?adjust)"
            r"|(?:pattern[\s-]?mixture|selection\s+model)"
            r"|(?:estimand|intercurrent\s+event)"
            r"|(?:missing\s+(?:at\s+random|not\s+at\s+random)|MNAR|MAR)\s+(?:assumption|sensitivity)"
        ),
        section_hint="results",
        category="analysis",
    ),
]


CLINICAL_TRIAL_PROFILE = DisciplineProfile(
    name="Clinical Trials",
    field="clinical_trials",
    guideline="ICH-E9/CONSORT",
    description=(
        "Regulatory-grade review for clinical trial manuscripts following "
        "ICH E9(R1), CONSORT 2010, and ICMJE requirements. The most "
        "stringent profile — missing essentials produce blocking findings."
    ),
    checklist=_CLINICAL_TRIAL_CHECKLIST,
    category_weights={
        "effect_sizes": 1.5,
        "assumptions": 1.5,
        "sample_power": 1.5,
        "precision": 1.5,
        "reproducibility": 1.5,
        "guidelines": 1.5,
    },
    severity_overrides={
        "missing_effect_size": "blocking",
        "missing_ci": "blocking",
        "missing_power_analysis": "blocking",
        "missing_registration": "blocking",
        "missing_adverse_events": "blocking",
        "p_value_only": "major",
        "missing_itt_analysis": "blocking",
    },
    required_sections=["abstract", "methods", "results", "discussion"],
)


# =====================================================================
# 7. Social Science — Open Science Focus
# =====================================================================

_SOCIAL_SCIENCE_CHECKLIST: List[ChecklistItem] = [
    ChecklistItem(
        id="soc_preregistration",
        name="Pre-registration recommended",
        description=(
            "Pre-registration of hypotheses and analysis plans is "
            "increasingly required or encouraged by major social-science "
            "journals (e.g. APSR, Sociological Methods & Research). "
            "Registered Reports provide the strongest guarantee against "
            "HARKing and p-hacking."
        ),
        required=False,
        detection_pattern=(
            r"pre[\s-]?regist(?:er|ration|ered)"
            r"|(?:registered\s+report)"
            r"|(?:OSF|AsPredicted|EGAP)\s+(?:pre[\s-]?registration|registry)"
            r"|(?:analysis\s+plan|pre[\s-]?analysis\s+plan|PAP)"
        ),
        section_hint="methods",
        category="transparency",
    ),
    ChecklistItem(
        id="soc_data_availability",
        name="Data availability statement",
        description=(
            "TOP Guidelines and FAIR data principles: data used in the "
            "study should be shared openly or access procedures should "
            "be documented. Many social-science journals now mandate a "
            "data availability statement."
        ),
        required=True,
        detection_pattern=(
            r"data\s+(?:availability|sharing|access|are\s+available|is\s+available)"
            r"|(?:open|publicly)\s+(?:available|accessible)\s+data"
            r"|(?:OSF|Zenodo|Dryad|figshare|Dataverse|ICPSR|GitHub|Harvard\s+Dataverse)"
            r"|(?:data|dataset)\s+(?:(?:are|is)\s+)?(?:deposited|archived|shared|posted|available)"
            r"|(?:upon\s+(?:reasonable\s+)?request)"
        ),
        section_hint="any",
        category="transparency",
    ),
    ChecklistItem(
        id="soc_code_availability",
        name="Code/analysis scripts available",
        description=(
            "TOP Guidelines Level 2+: Analysis code should be shared "
            "to enable computational reproducibility. Provide scripts "
            "in a public repository with a DOI where possible."
        ),
        required=True,
        detection_pattern=(
            r"(?:code|script|syntax)\s+(?:availability|are\s+available|is\s+available)"
            r"|(?:analysis|replication)\s+(?:code|script|syntax)"
            r"|(?:GitHub|GitLab|Bitbucket|Code\s+Ocean|Zenodo)\s+(?:repositor|link)"
            r"|(?:code|scripts?)\s+(?:(?:are|is)\s+)?(?:deposited|archived|shared|posted|available)"
            r"|(?:reproducib(?:le|ility)\s+(?:code|workflow|pipeline))"
        ),
        section_hint="any",
        category="transparency",
    ),
    ChecklistItem(
        id="soc_effect_sizes",
        name="Effect sizes reported",
        description=(
            "Effect sizes should be reported for all key tests to "
            "enable meta-analytic integration and meaningful "
            "interpretation beyond statistical significance."
        ),
        required=True,
        detection_pattern=(
            r"(?:effect\s+size|Cohen[\'s]*\s*[dfh]|Hedges[\'s]*\s*g|standardized\s+(?:mean\s+difference|coefficient|beta))"
            r"|(?:eta[\s-]?squared|\u03b7[²2]|omega[\s-]?squared|ω[²2]|partial\s+\u03b7[²2])"
            r"|(?:odds\s+ratio|risk\s+ratio|Cramer[\'s]*\s*V)"
            r"|(?:R[²2]\s*=\s*[\d.]|\br\b\s*=\s*-?[01]?\.\d)"
        ),
        section_hint="results",
        category="analysis",
    ),
    ChecklistItem(
        id="soc_replication",
        name="Replication considerations discussed",
        description=(
            "Discuss how the findings relate to prior replications, "
            "or what would be needed to replicate the study. The "
            "replication crisis makes this a key concern in social "
            "science."
        ),
        required=False,
        detection_pattern=(
            r"replic(?:at(?:ion|e|ed|ing|ability)|able)"
            r"|(?:external|conceptual|direct|exact)\s+replication"
            r"|(?:generali[sz]ability|external\s+validity)"
            r"|(?:future\s+(?:research|studies|work)\s+(?:should|could|may)\s+(?:attempt\s+to\s+)?replic)"
        ),
        section_hint="discussion",
        category="transparency",
    ),
    ChecklistItem(
        id="soc_exact_p_values",
        name="Exact p-values reported",
        description=(
            "Report exact p-values rather than relying solely on "
            "significance thresholds (p < .05). This enables readers "
            "to evaluate the strength of evidence and facilitates "
            "meta-analysis."
        ),
        required=True,
        detection_pattern=(r"p\s*=\s*\.?\d{2,3}" r"|p\s*=\s*0?\.\d{2,3}" r"|p\s*<\s*\.?001"),
        section_hint="results",
        category="reporting",
    ),
    ChecklistItem(
        id="soc_confidence_intervals",
        name="Confidence intervals reported",
        description=(
            "Report confidence intervals to convey estimation "
            "uncertainty. CIs provide more information than p-values "
            "alone and are required by many journal guidelines."
        ),
        required=True,
        detection_pattern=(
            r"(?:confidence\s+interval|CI)\s*[=:]?\s*[\[\(]?\s*-?\d"
            r"|\d+\s*%\s*CI"
            r"|(?:lower|upper)\s+(?:bound|limit|CI)"
        ),
        section_hint="results",
        category="analysis",
    ),
    ChecklistItem(
        id="soc_measurement_validity",
        name="Measurement reliability and validity",
        description=(
            "Report reliability (Cronbach's alpha, test-retest, ICC) "
            "and validity evidence for key measures, especially self-"
            "report scales."
        ),
        required=False,
        detection_pattern=(
            r"(?:Cronbach[\'s]*\s*(?:alpha|α)|internal\s+consistency)"
            r"|(?:test[\s-]retest|inter[\s-]?rater|intra[\s-]?class)\s+(?:reliabilit|correlat)"
            r"|(?:construct|content|criterion|convergent|discriminant)\s+validity"
            r"|(?:factor\s+(?:loading|structure|analysis))"
            r"|(?:confirmatory\s+factor\s+analysis|CFA)"
        ),
        section_hint="methods",
        category="reporting",
    ),
    ChecklistItem(
        id="soc_power_analysis",
        name="Statistical power or sample justification",
        description=(
            "Justify sample size through power analysis, precision "
            "planning, or resource-based reasoning. Report the minimum "
            "effect size the study is adequately powered to detect."
        ),
        required=False,
        detection_pattern=(
            r"(?:power\s+analysis|power\s+calculation|a\s+priori\s+power)"
            r"|(?:sample\s+size\s+(?:was|justif|determin))"
            r"|(?:sensitivity\s+power\s+analysis)"
            r"|(?:minimum\s+detectable\s+effect|smallest\s+effect\s+(?:size\s+)?of\s+interest|SESOI)"
        ),
        section_hint="methods",
        category="analysis",
    ),
]


SOCIAL_SCIENCE_PROFILE = DisciplineProfile(
    name="Social Science",
    field="social_science",
    guideline="TOP/COS",
    description=(
        "Open-science-oriented review for the social sciences following "
        "the Transparency and Openness Promotion (TOP) Guidelines and "
        "Center for Open Science (COS) recommendations. Strong emphasis "
        "on data/code sharing, pre-registration, and replicability."
    ),
    checklist=_SOCIAL_SCIENCE_CHECKLIST,
    category_weights={
        **_DEFAULT_WEIGHTS,
        "reproducibility": 1.5,
        "guidelines": 2.0,
    },
    severity_overrides={
        "missing_data_availability": "major",
        "missing_code_availability": "major",
        "missing_effect_size": "major",
        "p_value_only": "moderate",
    },
    required_sections=["abstract", "introduction", "methods", "results", "discussion"],
)


# =====================================================================
# Profile registry
# =====================================================================

_PROFILE_REGISTRY: Dict[str, DisciplineProfile] = {
    "medicine": CONSORT_PROFILE,
    "medicine_rct": CONSORT_PROFILE,
    "medicine_observational": STROBE_PROFILE,
    "psychology": JARS_QUANT_PROFILE,
    "economics": ECONOMICS_PROFILE,
    "education": EDUCATION_PROFILE,
    "clinical_trials": CLINICAL_TRIAL_PROFILE,
    "social_science": SOCIAL_SCIENCE_PROFILE,
}

# Aliases for convenience
_PROFILE_REGISTRY["rct"] = CONSORT_PROFILE
_PROFILE_REGISTRY["consort"] = CONSORT_PROFILE
_PROFILE_REGISTRY["strobe"] = STROBE_PROFILE
_PROFILE_REGISTRY["jars"] = JARS_QUANT_PROFILE
_PROFILE_REGISTRY["jars_quant"] = JARS_QUANT_PROFILE
_PROFILE_REGISTRY["apa"] = JARS_QUANT_PROFILE
_PROFILE_REGISTRY["econ"] = ECONOMICS_PROFILE
_PROFILE_REGISTRY["edu"] = EDUCATION_PROFILE
_PROFILE_REGISTRY["clinical"] = CLINICAL_TRIAL_PROFILE
_PROFILE_REGISTRY["trial"] = CLINICAL_TRIAL_PROFILE
_PROFILE_REGISTRY["trials"] = CLINICAL_TRIAL_PROFILE
_PROFILE_REGISTRY["sociology"] = SOCIAL_SCIENCE_PROFILE
_PROFILE_REGISTRY["political_science"] = SOCIAL_SCIENCE_PROFILE


def get_all_profiles() -> Dict[str, DisciplineProfile]:
    """Return a copy of the full profile registry (including aliases)."""
    return dict(_PROFILE_REGISTRY)


def list_profiles() -> List[Dict[str, str]]:
    """Return a summary list of unique profiles (no aliases).

    Useful for populating front-end dropdowns.
    """
    seen = set()
    profiles = []
    for prof in _PROFILE_REGISTRY.values():
        if prof.field not in seen:
            seen.add(prof.field)
            profiles.append(
                {
                    "field": prof.field,
                    "name": prof.name,
                    "guideline": prof.guideline,
                    "description": prof.description,
                    "checklist_count": len(prof.checklist),
                }
            )
    return profiles


# =====================================================================
# Public API
# =====================================================================


def get_profile(field_name: str) -> DisciplineProfile:
    """Look up a :class:`DisciplineProfile` by field name.

    Parameters
    ----------
    field_name : str
        Field name (e.g. ``'psychology'``, ``'medicine'``) or alias
        (e.g. ``'consort'``, ``'rct'``). Case-insensitive.

    Returns
    -------
    DisciplineProfile
        The matching profile.

    Raises
    ------
    ValueError
        If no profile matches *field_name*.
    """
    key = field_name.strip().lower().replace("-", "_").replace(" ", "_")
    profile = _PROFILE_REGISTRY.get(key)
    if profile is None:
        available = sorted({p.field for p in _PROFILE_REGISTRY.values()})
        raise ValueError(f"Unknown discipline field '{field_name}'. " f"Available fields: {', '.join(available)}")
    return profile


def evaluate_checklist(
    profile: DisciplineProfile,
    parsed_manuscript,
) -> List[ChecklistResult]:
    """Evaluate all checklist items in *profile* against *parsed_manuscript*.

    Parameters
    ----------
    profile : DisciplineProfile
        The discipline profile whose checklist to evaluate.
    parsed_manuscript : ParsedManuscript
        A parsed manuscript (from :class:`~core.manuscript.parser.ManuscriptParser`).

    Returns
    -------
    list[ChecklistResult]
        One result per checklist item, indicating whether it was found,
        the matched text, and the computed severity.
    """
    results: List[ChecklistResult] = []

    # Build a section-text lookup from the parsed manuscript
    section_text: Dict[str, str] = {}
    for sec in parsed_manuscript.sections:
        key = sec.section_type.lower()
        # Accumulate in case there are duplicate section types
        if key in section_text:
            section_text[key] += "\n" + sec.content
        else:
            section_text[key] = sec.content
    section_text["any"] = parsed_manuscript.full_text

    for item in profile.checklist:
        # Determine which text to search
        hint = item.section_hint.lower()
        text_to_search = section_text.get(hint, "")

        # Fall back to full text if the target section is empty or absent
        if not text_to_search.strip():
            text_to_search = parsed_manuscript.full_text
            searched_section = "full_text (fallback)"
        else:
            searched_section = hint

        # Compile and search
        try:
            pattern = re.compile(item.detection_pattern, re.IGNORECASE)
            match = pattern.search(text_to_search)
        except re.error as exc:
            logger.warning("Regex error in checklist item %s: %s", item.id, exc)
            results.append(
                ChecklistResult(
                    item=item,
                    found=False,
                    section_searched=searched_section,
                    severity="minor",  # can't evaluate — degrade gracefully
                )
            )
            continue

        # If not found in the hint section, try full text as a second pass
        # (the item might appear in an unexpected section)
        if not match and searched_section != "full_text (fallback)" and hint != "any":
            full_match = pattern.search(parsed_manuscript.full_text)
            if full_match:
                match = full_match
                text_to_search = parsed_manuscript.full_text
                searched_section = f"{hint} -> full_text (fallback)"

        if match:
            # Capture up to 200 characters of context around the match
            start = max(0, match.start() - 40)
            end = min(len(text_to_search), match.end() + 160)
            snippet = text_to_search[start:end].replace("\n", " ").strip()
            results.append(
                ChecklistResult(
                    item=item,
                    found=True,
                    matched_text=snippet,
                    section_searched=searched_section,
                    severity="positive",
                )
            )
        else:
            # Item not found — determine severity
            if item.required:
                severity = "major"
            else:
                severity = "moderate"
            results.append(
                ChecklistResult(
                    item=item,
                    found=False,
                    section_searched=searched_section,
                    severity=severity,
                )
            )

    return results


def apply_discipline_weights(
    profile: DisciplineProfile,
    base_findings: List,
) -> List:
    """Adjust finding severities based on discipline-specific configuration.

    This function performs two transformations:

    1. **Severity overrides** — If a finding's ``title`` (normalised to
       snake_case) matches a key in ``profile.severity_overrides``, its
       severity is replaced with the override value *only if* the override
       is more severe.

    2. **Category weight amplification** — If a finding's ``category``
       maps to a weight > 1.0 in ``profile.category_weights``, findings
       with severity ``'minor'`` may be promoted to ``'moderate'``, and
       ``'moderate'`` may be promoted to ``'major'``.

    Parameters
    ----------
    profile : DisciplineProfile
        The discipline profile with weights and overrides.
    base_findings : list[ReviewFinding]
        Findings from the standard manuscript review pipeline.

    Returns
    -------
    list[ReviewFinding]
        A **new** list of findings with potentially adjusted severities.
        The original objects are not mutated.
    """
    from dataclasses import replace as dc_replace

    # Severity ordering for comparisons
    _SEVERITY_ORDER = {
        "positive": 0,
        "minor": 1,
        "moderate": 2,
        "major": 3,
        "blocking": 4,
    }
    _PROMOTION_MAP = {
        "minor": "moderate",
        "moderate": "major",
    }

    adjusted: List = []

    for finding in base_findings:
        new_severity = finding.severity

        # --- 1. Explicit severity overrides ---
        # Normalise the finding title to a key like "missing_effect_size"
        normalised_title = finding.title.lower().strip().replace(" ", "_").replace("-", "_")
        # Check both the exact normalised title and common prefixes
        for override_key, override_sev in profile.severity_overrides.items():
            if override_key in normalised_title or normalised_title.startswith(override_key):
                # Only escalate, never downgrade
                if _SEVERITY_ORDER.get(override_sev, 0) > _SEVERITY_ORDER.get(new_severity, 0):
                    new_severity = override_sev
                break

        # --- 2. Category weight amplification ---
        cat_weight = profile.category_weights.get(finding.category, 1.0)
        if cat_weight >= 1.5 and new_severity in _PROMOTION_MAP:
            new_severity = _PROMOTION_MAP[new_severity]

        # Create a new finding if severity changed
        if new_severity != finding.severity:
            try:
                finding = dc_replace(finding, severity=new_severity)
            except TypeError:
                # Fallback if dataclasses.replace is not available for this type
                finding.severity = new_severity

        adjusted.append(finding)

    return adjusted


def checklist_summary(results: List[ChecklistResult]) -> Dict[str, Any]:
    """Produce a summary dict from checklist evaluation results.

    Returns
    -------
    dict
        Keys: ``total``, ``found``, ``missing_required``,
        ``missing_recommended``, ``completion_pct``, ``items``.
    """
    total = len(results)
    found = sum(1 for r in results if r.found)
    missing_required = [r for r in results if not r.found and r.item.required]
    missing_recommended = [r for r in results if not r.found and not r.item.required]

    items_detail = []
    for r in results:
        items_detail.append(
            {
                "id": r.item.id,
                "name": r.item.name,
                "required": r.item.required,
                "category": r.item.category,
                "found": r.found,
                "severity": r.severity,
                "matched_text": r.matched_text[:120] if r.matched_text else "",
                "section_searched": r.section_searched,
            }
        )

    return {
        "total": total,
        "found": found,
        "missing_required": len(missing_required),
        "missing_recommended": len(missing_recommended),
        "completion_pct": round(found / total * 100, 1) if total else 0.0,
        "items": items_detail,
    }
