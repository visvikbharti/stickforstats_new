"""
Pydantic response models for StickForStats API responses.

All models use ``model_config = ConfigDict(extra="allow")`` so that unexpected
fields returned by newer API versions do not break deserialization.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

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
    suggestion: Optional[str] = None


class GuardianReport(BaseModel):
    """Summary produced by the Guardian Statistical Protection System."""

    model_config = ConfigDict(extra="allow")

    confidence: float = 1.0
    violations: List[GuardianViolation] = Field(default_factory=list)
    passed: bool = True
    recommendation: Optional[str] = None


# ---------------------------------------------------------------------------
# Statistical test results
# ---------------------------------------------------------------------------

class TTestResult(BaseModel):
    """Response from ``/api/v1/stats/ttest/``."""

    model_config = ConfigDict(extra="allow")

    test_type: str = ""
    t_statistic: Optional[float] = None
    p_value: Optional[float] = None
    degrees_of_freedom: Optional[float] = None
    effect_size: Optional[float] = None
    confidence_interval: Optional[Dict[str, float]] = None
    means: Optional[Dict[str, float]] = None
    guardian: Optional[GuardianReport] = None


class ANOVAResult(BaseModel):
    """Response from ``/api/v1/stats/anova/``."""

    model_config = ConfigDict(extra="allow")

    f_statistic: Optional[float] = None
    p_value: Optional[float] = None
    degrees_of_freedom_between: Optional[float] = None
    degrees_of_freedom_within: Optional[float] = None
    effect_size: Optional[float] = None
    eta_squared: Optional[float] = None
    post_hoc: Optional[Dict[str, Any]] = None
    guardian: Optional[GuardianReport] = None


class CorrelationResult(BaseModel):
    """Response from ``/api/v1/stats/correlation/``."""

    model_config = ConfigDict(extra="allow")

    method: str = ""
    correlation: Optional[float] = None
    p_value: Optional[float] = None
    confidence_interval: Optional[Dict[str, float]] = None
    r_squared: Optional[float] = None
    sample_size: Optional[int] = None
    guardian: Optional[GuardianReport] = None


class RegressionCoefficient(BaseModel):
    """A single predictor coefficient in a regression model."""

    model_config = ConfigDict(extra="allow")

    variable: str = ""
    coefficient: Optional[float] = None
    std_error: Optional[float] = None
    t_statistic: Optional[float] = None
    p_value: Optional[float] = None


class RegressionResult(BaseModel):
    """Response from ``/api/v1/stats/regression/``."""

    model_config = ConfigDict(extra="allow")

    regression_type: str = ""
    r_squared: Optional[float] = None
    adjusted_r_squared: Optional[float] = None
    f_statistic: Optional[float] = None
    p_value: Optional[float] = None
    coefficients: List[RegressionCoefficient] = Field(default_factory=list)
    residual_std_error: Optional[float] = None
    guardian: Optional[GuardianReport] = None


class DescriptiveResult(BaseModel):
    """Response from ``/api/v1/stats/descriptive/``."""

    model_config = ConfigDict(extra="allow")

    count: Optional[int] = None
    mean: Optional[float] = None
    median: Optional[float] = None
    std_dev: Optional[float] = None
    variance: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    skewness: Optional[float] = None
    kurtosis: Optional[float] = None
    quartiles: Optional[Dict[str, float]] = None


# ---------------------------------------------------------------------------
# Power analysis results
# ---------------------------------------------------------------------------

class PowerResult(BaseModel):
    """Response from power analysis endpoints."""

    model_config = ConfigDict(extra="allow")

    power: Optional[float] = None
    sample_size: Optional[int] = None
    effect_size: Optional[float] = None
    alpha: Optional[float] = None
    test_type: str = ""


class PowerReport(BaseModel):
    """Response from ``/api/v1/power/report/``."""

    model_config = ConfigDict(extra="allow")

    summary: Optional[str] = None
    recommendations: List[str] = Field(default_factory=list)
    analyses: List[Dict[str, Any]] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Nonparametric test results
# ---------------------------------------------------------------------------

class NonparametricResult(BaseModel):
    """Generic response model for nonparametric test endpoints."""

    model_config = ConfigDict(extra="allow")

    test_name: str = ""
    statistic: Optional[float] = None
    p_value: Optional[float] = None
    effect_size: Optional[float] = None
    sample_sizes: Optional[Dict[str, int]] = None
    guardian: Optional[GuardianReport] = None


# ---------------------------------------------------------------------------
# Categorical test results
# ---------------------------------------------------------------------------

class CategoricalResult(BaseModel):
    """Generic response model for categorical test endpoints."""

    model_config = ConfigDict(extra="allow")

    test_name: str = ""
    statistic: Optional[float] = None
    p_value: Optional[float] = None
    degrees_of_freedom: Optional[int] = None
    effect_size: Optional[float] = None
    contingency_table: Optional[Dict[str, Any]] = None
    guardian: Optional[GuardianReport] = None


# ---------------------------------------------------------------------------
# Autonomous Intelligence results
# ---------------------------------------------------------------------------

class ProfileResult(BaseModel):
    """Response from ``/api/v1/autonomous/profile/``."""

    model_config = ConfigDict(extra="allow")

    summary: Optional[Dict[str, Any]] = None
    variable_types: Optional[Dict[str, str]] = None
    distributions: Optional[Dict[str, Any]] = None
    recommendations: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class QueryResult(BaseModel):
    """Response from ``/api/v1/autonomous/query/``."""

    model_config = ConfigDict(extra="allow")

    interpretation: Optional[str] = None
    test_used: Optional[str] = None
    results: Optional[Dict[str, Any]] = None
    narrative: Optional[str] = None


class CascadeResult(BaseModel):
    """Response from ``/api/v1/autonomous/cascade/``."""

    model_config = ConfigDict(extra="allow")

    guardian_report: Optional[GuardianReport] = None
    original_test: Optional[str] = None
    executed_test: Optional[str] = None
    fallback_used: bool = False
    results: Optional[Dict[str, Any]] = None


class TranslateResult(BaseModel):
    """Response from ``/api/v1/autonomous/translate/``."""

    model_config = ConfigDict(extra="allow")

    plain_language: Optional[str] = None
    technical_summary: Optional[str] = None
    apa_formatted: Optional[str] = None


# ---------------------------------------------------------------------------
# Manuscript review results
# ---------------------------------------------------------------------------

class ManuscriptClaim(BaseModel):
    """A statistical claim extracted from a manuscript."""

    model_config = ConfigDict(extra="allow")

    text: str = ""
    test_type: Optional[str] = None
    reported_statistic: Optional[str] = None
    reported_p_value: Optional[float] = None
    verified: Optional[bool] = None
    issue: Optional[str] = None


class ManuscriptReport(BaseModel):
    """Response from ``/api/v1/manuscript/analyze/``."""

    model_config = ConfigDict(extra="allow")

    overall_score: Optional[float] = None
    claims: List[ManuscriptClaim] = Field(default_factory=list)
    issues: List[Dict[str, Any]] = Field(default_factory=list)
    summary: Optional[str] = None
    field: str = ""


class ParseResult(BaseModel):
    """Response from ``/api/v1/manuscript/parse/``."""

    model_config = ConfigDict(extra="allow")

    sections: List[Dict[str, Any]] = Field(default_factory=list)
    tables: List[Dict[str, Any]] = Field(default_factory=list)
    figures: List[Dict[str, Any]] = Field(default_factory=list)
    references: List[str] = Field(default_factory=list)


class ConsistencyReport(BaseModel):
    """Response from ``/api/v1/manuscript/consistency/``."""

    model_config = ConfigDict(extra="allow")

    consistent: bool = True
    inconsistencies: List[Dict[str, Any]] = Field(default_factory=list)
    summary: Optional[str] = None


# ---------------------------------------------------------------------------
# Platform / usage models
# ---------------------------------------------------------------------------

class UsageSummary(BaseModel):
    """Response from ``/api/v1/platform/usage/``."""

    model_config = ConfigDict(extra="allow")

    total_requests: int = 0
    requests_today: int = 0
    remaining_quota: Optional[int] = None
    tier: str = ""
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class TierInfo(BaseModel):
    """A single tier entry from ``/api/v1/platform/tiers/``."""

    model_config = ConfigDict(extra="allow")

    name: str = ""
    monthly_requests: Optional[int] = None
    rate_limit_per_minute: Optional[int] = None
    features: List[str] = Field(default_factory=list)
    price: Optional[str] = None
