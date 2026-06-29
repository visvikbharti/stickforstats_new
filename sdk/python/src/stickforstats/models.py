"""
Pydantic response models for StickForStats API responses.

All models use ``model_config = ConfigDict(extra="allow")`` so that unexpected
fields returned by newer API versions do not break deserialization.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

# ---------------------------------------------------------------------------
# Guardian models
# ---------------------------------------------------------------------------

class GuardianViolation(BaseModel):
    """A single Guardian assumption-check violation."""

    model_config = ConfigDict(extra="allow")

    code: str = ""
    severity: str = ""
    message: str = ""
    suggestion: str | None = None


class GuardianReport(BaseModel):
    """Summary produced by the Guardian Statistical Protection System."""

    model_config = ConfigDict(extra="allow")

    confidence: float = 1.0
    violations: list[GuardianViolation] = Field(default_factory=list)
    passed: bool = True
    recommendation: str | None = None


# ---------------------------------------------------------------------------
# Statistical test results
# ---------------------------------------------------------------------------

class TTestResult(BaseModel):
    """Response from ``/api/v1/stats/ttest/``."""

    model_config = ConfigDict(extra="allow")

    test_type: str = ""
    t_statistic: float | None = None
    p_value: float | None = None
    degrees_of_freedom: float | None = None
    effect_size: float | None = None
    confidence_interval: dict[str, float] | None = None
    means: dict[str, float] | None = None
    guardian: GuardianReport | None = None


class ANOVAResult(BaseModel):
    """Response from ``/api/v1/stats/anova/``."""

    model_config = ConfigDict(extra="allow")

    f_statistic: float | None = None
    p_value: float | None = None
    degrees_of_freedom_between: float | None = None
    degrees_of_freedom_within: float | None = None
    effect_size: float | None = None
    eta_squared: float | None = None
    post_hoc: dict[str, Any] | None = None
    guardian: GuardianReport | None = None


class CorrelationResult(BaseModel):
    """Response from ``/api/v1/stats/correlation/``."""

    model_config = ConfigDict(extra="allow")

    method: str = ""
    correlation: float | None = None
    p_value: float | None = None
    confidence_interval: dict[str, float] | None = None
    r_squared: float | None = None
    sample_size: int | None = None
    guardian: GuardianReport | None = None


class RegressionCoefficient(BaseModel):
    """A single predictor coefficient in a regression model."""

    model_config = ConfigDict(extra="allow")

    variable: str = ""
    coefficient: float | None = None
    std_error: float | None = None
    t_statistic: float | None = None
    p_value: float | None = None


class RegressionResult(BaseModel):
    """Response from ``/api/v1/stats/regression/``."""

    model_config = ConfigDict(extra="allow")

    regression_type: str = ""
    r_squared: float | None = None
    adjusted_r_squared: float | None = None
    f_statistic: float | None = None
    p_value: float | None = None
    coefficients: list[RegressionCoefficient] = Field(default_factory=list)
    residual_std_error: float | None = None
    guardian: GuardianReport | None = None


class DescriptiveResult(BaseModel):
    """Response from ``/api/v1/stats/descriptive/``."""

    model_config = ConfigDict(extra="allow")

    count: int | None = None
    mean: float | None = None
    median: float | None = None
    std_dev: float | None = None
    variance: float | None = None
    min: float | None = None
    max: float | None = None
    skewness: float | None = None
    kurtosis: float | None = None
    quartiles: dict[str, float] | None = None


# ---------------------------------------------------------------------------
# Power analysis results
# ---------------------------------------------------------------------------

class PowerResult(BaseModel):
    """Response from power analysis endpoints."""

    model_config = ConfigDict(extra="allow")

    power: float | None = None
    sample_size: int | None = None
    effect_size: float | None = None
    alpha: float | None = None
    test_type: str = ""


class PowerReport(BaseModel):
    """Response from ``/api/v1/power/report/``."""

    model_config = ConfigDict(extra="allow")

    summary: str | None = None
    recommendations: list[str] = Field(default_factory=list)
    analyses: list[dict[str, Any]] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Nonparametric test results
# ---------------------------------------------------------------------------

class NonparametricResult(BaseModel):
    """Generic response model for nonparametric test endpoints."""

    model_config = ConfigDict(extra="allow")

    test_name: str = ""
    statistic: float | None = None
    p_value: float | None = None
    effect_size: float | None = None
    sample_sizes: dict[str, int] | None = None
    guardian: GuardianReport | None = None


# ---------------------------------------------------------------------------
# Categorical test results
# ---------------------------------------------------------------------------

class CategoricalResult(BaseModel):
    """Generic response model for categorical test endpoints."""

    model_config = ConfigDict(extra="allow")

    test_name: str = ""
    statistic: float | None = None
    p_value: float | None = None
    degrees_of_freedom: int | None = None
    effect_size: float | None = None
    contingency_table: dict[str, Any] | None = None
    guardian: GuardianReport | None = None


# ---------------------------------------------------------------------------
# Autonomous Intelligence results
# ---------------------------------------------------------------------------

class ProfileResult(BaseModel):
    """Response from ``/api/v1/autonomous/profile/``."""

    model_config = ConfigDict(extra="allow")

    summary: dict[str, Any] | None = None
    variable_types: dict[str, str] | None = None
    distributions: dict[str, Any] | None = None
    recommendations: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class QueryResult(BaseModel):
    """Response from ``/api/v1/autonomous/query/``."""

    model_config = ConfigDict(extra="allow")

    interpretation: str | None = None
    test_used: str | None = None
    results: dict[str, Any] | None = None
    narrative: str | None = None


class CascadeResult(BaseModel):
    """Response from ``/api/v1/autonomous/cascade/``."""

    model_config = ConfigDict(extra="allow")

    guardian_report: GuardianReport | None = None
    original_test: str | None = None
    executed_test: str | None = None
    fallback_used: bool = False
    results: dict[str, Any] | None = None


class TranslateResult(BaseModel):
    """Response from ``/api/v1/autonomous/translate/``."""

    model_config = ConfigDict(extra="allow")

    plain_language: str | None = None
    technical_summary: str | None = None
    apa_formatted: str | None = None


# ---------------------------------------------------------------------------
# Manuscript review results
# ---------------------------------------------------------------------------

class ManuscriptClaim(BaseModel):
    """A statistical claim extracted from a manuscript."""

    model_config = ConfigDict(extra="allow")

    text: str = ""
    test_type: str | None = None
    reported_statistic: str | None = None
    reported_p_value: float | None = None
    verified: bool | None = None
    issue: str | None = None


class ManuscriptReport(BaseModel):
    """Response from ``/api/v1/manuscript/analyze/``."""

    model_config = ConfigDict(extra="allow")

    overall_score: float | None = None
    claims: list[ManuscriptClaim] = Field(default_factory=list)
    issues: list[dict[str, Any]] = Field(default_factory=list)
    summary: str | None = None
    field: str = ""


class ParseResult(BaseModel):
    """Response from ``/api/v1/manuscript/parse/``."""

    model_config = ConfigDict(extra="allow")

    sections: list[dict[str, Any]] = Field(default_factory=list)
    tables: list[dict[str, Any]] = Field(default_factory=list)
    figures: list[dict[str, Any]] = Field(default_factory=list)
    references: list[str] = Field(default_factory=list)


class ConsistencyReport(BaseModel):
    """Response from ``/api/v1/manuscript/consistency/``."""

    model_config = ConfigDict(extra="allow")

    consistent: bool = True
    inconsistencies: list[dict[str, Any]] = Field(default_factory=list)
    summary: str | None = None


# ---------------------------------------------------------------------------
# Platform / usage models
# ---------------------------------------------------------------------------

class UsageSummary(BaseModel):
    """Response from ``/api/v1/platform/usage/``."""

    model_config = ConfigDict(extra="allow")

    total_requests: int = 0
    requests_today: int = 0
    remaining_quota: int | None = None
    tier: str = ""
    period_start: str | None = None
    period_end: str | None = None


class TierInfo(BaseModel):
    """A single tier entry from ``/api/v1/platform/tiers/``."""

    model_config = ConfigDict(extra="allow")

    name: str = ""
    monthly_requests: int | None = None
    rate_limit_per_minute: int | None = None
    features: list[str] = Field(default_factory=list)
    price: str | None = None


# ---------------------------------------------------------------------------
# Manuscript verification (raw-data re-analysis) results
# ---------------------------------------------------------------------------

class ClaimVerdict(BaseModel):
    """A single per-claim verdict from the verification engine.

    ``verdict`` is one of VERIFIED / DISCREPANT / ASSUMPTION_VIOLATED /
    ASSUMPTION_UNREPORTED / INSUFFICIENT_DATA / UNVERIFIABLE_EXTRACTION /
    INCONSISTENT_REPORTING. The nested dicts mirror the API verbatim
    (``claimed``/``recomputed`` p-values & statistics, ``provenance`` with the
    source file + cited references + link/extraction method, ``notes``).
    """

    model_config = ConfigDict(extra="allow")

    claim_id: str = ""
    verdict: str = ""
    claim_text: str = ""
    claimed: dict[str, Any] = Field(default_factory=dict)
    recomputed: dict[str, Any] = Field(default_factory=dict)
    match: dict[str, Any] = Field(default_factory=dict)
    assumptions: dict[str, Any] = Field(default_factory=dict)
    data_available: bool = False
    linked_dataset_id: str | None = None
    test_failed: bool = False
    test_failure_reason: str = ""
    provenance: dict[str, Any] = Field(default_factory=dict)
    notes: list[str] = Field(default_factory=list)


class IngestedFileReport(BaseModel):
    """How one uploaded file was handled in a bundle verification."""

    model_config = ConfigDict(extra="allow")

    name: str = ""
    kind: str = ""  # manuscript | data | image | unknown
    ok: bool = False
    role: str = ""
    chars: int = 0
    n_rows: int = 0
    n_cols: int = 0
    ocr_used: bool = False
    warnings: list[str] = Field(default_factory=list)
    error: str = ""


class IngestionReport(BaseModel):
    """Per-file ingestion summary attached to a bundle verification."""

    model_config = ConfigDict(extra="allow")

    n_files: int = 0
    n_manuscript_files: int = 0
    n_data_files: int = 0
    n_image_files: int = 0
    n_unknown: int = 0
    manuscript_chars: int = 0
    ocr_used: bool = False
    files: list[IngestedFileReport] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class VerificationReport(BaseModel):
    """Response from ``/api/v1/verify/bundle/`` and ``/api/v1/verify/analyze/``.

    Distinct from :class:`ManuscriptReport` (internal-consistency review): this is
    the raw-data re-analysis surface — it re-runs the authors' tests on their data.
    """

    model_config = ConfigDict(extra="allow")

    n_claims: int = 0
    verdict_distribution: dict[str, int] = Field(default_factory=dict)
    verifiability_rate: float | None = None
    coverage: float | None = None
    low_coverage: bool = False
    n_checkable: int = 0
    n_inconsistent_reporting: int = 0
    n_decision_changing: int = 0
    n_references_resolved: int = 0
    n_citation_conflicts: int = 0
    certify_note: str = ""
    claims: list[ClaimVerdict] = Field(default_factory=list)
    ingestion: IngestionReport | None = None
    run_id: str | None = None
    report_token: str | None = None
    report_url: str | None = None

    @property
    def conflicts(self) -> list[ClaimVerdict]:
        """Claims flagged as citation–content conflicts (the highest-value output):
        the author cited a data file that does not reproduce the claimed result."""
        flagged: list[ClaimVerdict] = []
        for claim in self.claims:
            if (claim.provenance or {}).get("link_method") == "conflict":
                flagged.append(claim)
            elif any("conflict" in str(note).lower() for note in claim.notes):
                flagged.append(claim)
        return flagged
