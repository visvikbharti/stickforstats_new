"""
OpenAPI 3.0.3 Schema Generator for the StickForStats API
=========================================================

Lightweight inline schema generation — no drf-spectacular dependency.

Provides:
- ``OpenAPISchemaView``  — JSON / YAML schema endpoint
- ``SwaggerUIView``      — Swagger UI rendered from CDN
- ``ReDocView``          — ReDoc rendered from CDN

Mount these in ``urls.py`` like::

    path('schema/',        OpenAPISchemaView.as_view(), name='openapi-schema'),
    path('schema/swagger/', SwaggerUIView.as_view(),   name='swagger-ui'),
    path('schema/redoc/',   ReDocView.as_view(),       name='redoc'),
"""


from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.http import HttpResponse


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _ref(name: str) -> dict:
    """Shortcut for a JSON-Schema $ref."""
    return {"$ref": f"#/components/schemas/{name}"}


def _json_body(schema: dict, desc: str = "") -> dict:
    return {
        "required": True,
        "description": desc,
        "content": {
            "application/json": {"schema": schema},
        },
    }


def _json_response(schema: dict, desc: str = "Successful response") -> dict:
    return {
        "description": desc,
        "content": {
            "application/json": {"schema": schema},
        },
    }


def _error_responses() -> dict:
    return {
        "400": _json_response(_ref("ErrorResponse"), "Validation error"),
        "401": _json_response(_ref("ErrorResponse"), "Authentication required"),
        "500": _json_response(_ref("ErrorResponse"), "Internal server error"),
    }


# ---------------------------------------------------------------------------
# Components / Schemas
# ---------------------------------------------------------------------------

COMPONENT_SCHEMAS = {
    # -- common ---------------------------------------------------------
    "ErrorResponse": {
        "type": "object",
        "properties": {
            "error": {"type": "string", "example": "Invalid input"},
            "details": {
                "type": "object",
                "additionalProperties": True,
                "description": "Field-level error details",
            },
        },
        "required": ["error"],
    },
    "GuardianReport": {
        "type": "object",
        "properties": {
            "confidence": {
                "type": "number",
                "format": "float",
                "example": 0.87,
                "description": "Guardian confidence score (0-1)",
            },
            "violations": {
                "type": "array",
                "items": _ref("GuardianViolation"),
            },
            "passed": {"type": "boolean"},
        },
    },
    "GuardianViolation": {
        "type": "object",
        "properties": {
            "code": {"type": "string", "example": "NORM_VIOLATION"},
            "severity": {
                "type": "string",
                "enum": ["critical", "warning", "minor"],
            },
            "message": {"type": "string"},
            "suggestion": {"type": "string"},
        },
    },
    "HighPrecisionNumber": {
        "type": "string",
        "description": "Numeric value represented as a string to preserve 50-digit precision.",
        "example": "0.04532681243907021452381560827103945619842571",
    },
    "PaginatedList": {
        "type": "object",
        "properties": {
            "count": {"type": "integer"},
            "next": {"type": "string", "format": "uri", "nullable": True},
            "previous": {"type": "string", "format": "uri", "nullable": True},
            "results": {"type": "array", "items": {"type": "object"}},
        },
    },
    # -- statistical tests ----------------------------------------------
    "TTestRequest": {
        "type": "object",
        "required": ["test_type", "data1"],
        "properties": {
            "test_type": {
                "type": "string",
                "enum": ["one_sample", "two_sample", "paired"],
            },
            "data1": {
                "type": "array",
                "items": {"type": "number"},
                "example": [5.1, 4.9, 6.2, 5.8, 5.5],
            },
            "data2": {
                "type": "array",
                "items": {"type": "number"},
                "description": "Required for two_sample and paired tests.",
            },
            "parameters": {
                "type": "object",
                "properties": {
                    "mu": {"type": "number", "default": 0},
                    "equal_var": {"type": "boolean", "default": True},
                    "confidence": {"type": "number", "default": 0.95},
                },
            },
            "options": {
                "type": "object",
                "properties": {
                    "check_assumptions": {"type": "boolean", "default": True},
                    "validate_results": {"type": "boolean", "default": True},
                    "compare_standard": {"type": "boolean", "default": True},
                },
            },
        },
    },
    "TTestResponse": {
        "type": "object",
        "properties": {
            "test_type": {"type": "string"},
            "t_statistic": _ref("HighPrecisionNumber"),
            "p_value": _ref("HighPrecisionNumber"),
            "degrees_of_freedom": {"type": "number"},
            "confidence_interval": {
                "type": "object",
                "properties": {
                    "lower": _ref("HighPrecisionNumber"),
                    "upper": _ref("HighPrecisionNumber"),
                    "level": {"type": "number"},
                },
            },
            "effect_size": {
                "type": "object",
                "properties": {
                    "cohens_d": {"type": "number"},
                    "hedges_g": {"type": "number"},
                },
            },
            "assumptions": _ref("GuardianReport"),
        },
    },
    "ANOVARequest": {
        "type": "object",
        "required": ["groups"],
        "properties": {
            "groups": {
                "type": "array",
                "items": {
                    "type": "array",
                    "items": {"type": "number"},
                },
                "description": "List of numeric arrays, one per group.",
                "example": [[5.1, 4.9], [6.2, 5.8], [7.1, 6.9]],
            },
            "anova_type": {
                "type": "string",
                "enum": ["one_way", "two_way", "manova", "repeated_measures"],
                "default": "one_way",
            },
            "options": {
                "type": "object",
                "properties": {
                    "check_assumptions": {"type": "boolean", "default": True},
                    "post_hoc": {
                        "type": "string",
                        "enum": ["tukey", "bonferroni", "scheffe", "none"],
                        "default": "tukey",
                    },
                },
            },
        },
    },
    "ANOVAResponse": {
        "type": "object",
        "properties": {
            "f_statistic": _ref("HighPrecisionNumber"),
            "p_value": _ref("HighPrecisionNumber"),
            "df_between": {"type": "integer"},
            "df_within": {"type": "integer"},
            "effect_size": {
                "type": "object",
                "properties": {
                    "eta_squared": {"type": "number"},
                    "omega_squared": {"type": "number"},
                },
            },
            "post_hoc": {"type": "object", "additionalProperties": True},
            "assumptions": _ref("GuardianReport"),
        },
    },
    "CorrelationRequest": {
        "type": "object",
        "required": ["x", "y"],
        "properties": {
            "x": {"type": "array", "items": {"type": "number"}},
            "y": {"type": "array", "items": {"type": "number"}},
            "method": {
                "type": "string",
                "enum": ["pearson", "spearman", "kendall", "point_biserial"],
                "default": "pearson",
            },
        },
    },
    "DescriptiveRequest": {
        "type": "object",
        "required": ["data"],
        "properties": {
            "data": {"type": "array", "items": {"type": "number"}},
            "options": {
                "type": "object",
                "properties": {
                    "percentiles": {
                        "type": "array",
                        "items": {"type": "number"},
                        "default": [25, 50, 75],
                    },
                    "include_normality": {"type": "boolean", "default": True},
                },
            },
        },
    },
    # -- power analysis -------------------------------------------------
    "PowerTTestRequest": {
        "type": "object",
        "properties": {
            "effect_size": {"type": "number", "example": 0.5, "description": "Cohen's d"},
            "alpha": {"type": "number", "default": 0.05},
            "n1": {"type": "integer", "example": 30},
            "n2": {"type": "integer", "example": 30},
            "test_type": {"type": "string", "enum": ["one_sample", "two_sample", "paired"]},
            "alternative": {"type": "string", "enum": ["two-sided", "greater", "less"], "default": "two-sided"},
        },
    },
    "PowerResponse": {
        "type": "object",
        "properties": {
            "power": _ref("HighPrecisionNumber"),
            "effect_size": {"type": "number"},
            "alpha": {"type": "number"},
            "n1": {"type": "integer"},
            "n2": {"type": "integer"},
            "interpretation": {"type": "string"},
        },
    },
    # -- categorical ----------------------------------------------------
    "ChiSquareRequest": {
        "type": "object",
        "required": ["observed"],
        "properties": {
            "observed": {
                "type": "array",
                "items": {"type": "array", "items": {"type": "number"}},
                "description": "Contingency table as a 2-D array.",
                "example": [[10, 20], [30, 40]],
            },
            "correction": {"type": "boolean", "default": True, "description": "Apply Yates correction for 2x2 tables."},
        },
    },
    "ChiSquareResponse": {
        "type": "object",
        "properties": {
            "chi_square": _ref("HighPrecisionNumber"),
            "p_value": _ref("HighPrecisionNumber"),
            "degrees_of_freedom": {"type": "integer"},
            "effect_size": {
                "type": "object",
                "properties": {
                    "cramers_v": {"type": "number"},
                    "phi": {"type": "number"},
                },
            },
        },
    },
    # -- nonparametric --------------------------------------------------
    "MannWhitneyRequest": {
        "type": "object",
        "required": ["group1", "group2"],
        "properties": {
            "group1": {"type": "array", "items": {"type": "number"}},
            "group2": {"type": "array", "items": {"type": "number"}},
            "alternative": {"type": "string", "enum": ["two-sided", "greater", "less"], "default": "two-sided"},
        },
    },
    # -- missing data ---------------------------------------------------
    "MissingDataDetectRequest": {
        "type": "object",
        "required": ["data"],
        "properties": {
            "data": {
                "type": "object",
                "description": "Dict of column-name -> list-of-values (nulls allowed).",
                "additionalProperties": {"type": "array", "items": {}},
            },
        },
    },
    # -- survival -------------------------------------------------------
    "KaplanMeierRequest": {
        "type": "object",
        "required": ["times", "events"],
        "properties": {
            "times": {"type": "array", "items": {"type": "number"}, "description": "Observed survival times."},
            "events": {
                "type": "array",
                "items": {"type": "integer", "enum": [0, 1]},
                "description": "Event indicator (1 = event, 0 = censored).",
            },
            "groups": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Optional group labels for comparison.",
            },
        },
    },
    # -- factor analysis ------------------------------------------------
    "FactorAdequacyRequest": {
        "type": "object",
        "required": ["data"],
        "properties": {
            "data": {
                "type": "object",
                "description": "Dict of variable -> values or a 2-D array.",
                "additionalProperties": {"type": "array", "items": {"type": "number"}},
            },
        },
    },
    # -- meta-analysis --------------------------------------------------
    "MetaAnalysisRequest": {
        "type": "object",
        "required": ["studies"],
        "properties": {
            "studies": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "effect_size": {"type": "number"},
                        "se": {"type": "number"},
                        "n": {"type": "integer"},
                    },
                    "required": ["effect_size", "se"],
                },
            },
            "model": {"type": "string", "enum": ["fixed", "random"], "default": "random"},
            "method": {"type": "string", "enum": ["DL", "REML", "ML", "PM", "HS"], "default": "DL"},
        },
    },
    "MetaAnalysisResponse": {
        "type": "object",
        "properties": {
            "pooled_effect": {"type": "number"},
            "ci_lower": {"type": "number"},
            "ci_upper": {"type": "number"},
            "p_value": {"type": "number"},
            "heterogeneity": {
                "type": "object",
                "properties": {
                    "Q": {"type": "number"},
                    "I2": {"type": "number"},
                    "tau2": {"type": "number"},
                },
            },
            "weights": {"type": "array", "items": {"type": "number"}},
        },
    },
    # -- causal inference -----------------------------------------------
    "DAGCreateRequest": {
        "type": "object",
        "required": ["nodes", "edges"],
        "properties": {
            "nodes": {"type": "array", "items": {"type": "string"}, "example": ["X", "Y", "Z"]},
            "edges": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "from": {"type": "string"},
                        "to": {"type": "string"},
                    },
                },
                "example": [{"from": "X", "to": "Y"}, {"from": "Z", "to": "Y"}],
            },
        },
    },
    # -- mixed models ---------------------------------------------------
    "ICCRequest": {
        "type": "object",
        "required": ["data", "group_col", "value_col"],
        "properties": {
            "data": {"type": "object", "additionalProperties": {"type": "array", "items": {}}},
            "group_col": {"type": "string"},
            "value_col": {"type": "string"},
            "icc_type": {
                "type": "string",
                "enum": ["ICC1", "ICC2", "ICC3", "ICC1k", "ICC2k", "ICC3k"],
                "default": "ICC1",
            },
        },
    },
    # -- AI advisor -----------------------------------------------------
    "AIAdvisorChatRequest": {
        "type": "object",
        "required": ["message"],
        "properties": {
            "message": {"type": "string", "example": "Which test should I use for comparing two independent groups?"},
            "conversation_id": {"type": "string", "description": "Resume an existing conversation."},
            "context": {
                "type": "object",
                "description": "Optional data context to inform the advisor.",
                "additionalProperties": True,
            },
        },
    },
    "AIAdvisorChatResponse": {
        "type": "object",
        "properties": {
            "response": {"type": "string"},
            "conversation_id": {"type": "string"},
            "suggestions": {"type": "array", "items": {"type": "string"}},
            "recommended_tests": {"type": "array", "items": {"type": "string"}},
        },
    },
    # -- SQS ------------------------------------------------------------
    "SQSAnalyzeRequest": {
        "type": "object",
        "description": "Upload a PDF manuscript for SQS analysis. Use multipart/form-data with a 'file' field.",
        "properties": {
            "file": {"type": "string", "format": "binary"},
            "field": {
                "type": "string",
                "description": "Research field (e.g. psychology, medicine).",
                "example": "psychology",
            },
        },
    },
    "SQSAnalyzeResponse": {
        "type": "object",
        "properties": {
            "score": {"type": "number", "example": 72.5, "description": "Overall SQS score (0-100)."},
            "grade": {"type": "string", "enum": ["A", "B", "C", "D", "F"]},
            "categories": {
                "type": "object",
                "additionalProperties": {
                    "type": "object",
                    "properties": {
                        "score": {"type": "number"},
                        "max_score": {"type": "number"},
                        "findings": {"type": "array", "items": {"type": "string"}},
                    },
                },
            },
            "recommendations": {"type": "array", "items": {"type": "string"}},
        },
    },
    # -- autonomous intelligence ----------------------------------------
    "AutonomousProfileRequest": {
        "type": "object",
        "description": "Upload data (CSV/Excel file or JSON body) for smart profiling.",
        "properties": {
            "data": {
                "type": "object",
                "description": "Dict of column -> values.",
                "additionalProperties": {"type": "array", "items": {}},
            },
        },
    },
    "AutonomousQueryRequest": {
        "type": "object",
        "required": ["query"],
        "properties": {
            "query": {"type": "string", "example": "Is there a significant difference between the treatment groups?"},
            "data": {
                "type": "object",
                "description": "Dict of column -> values.",
                "additionalProperties": {"type": "array", "items": {}},
            },
        },
    },
    # -- manuscript review ----------------------------------------------
    "ManuscriptAnalyzeRequest": {
        "type": "object",
        "description": "Upload a manuscript (PDF, LaTeX, or DOCX) for automated statistical review.",
        "properties": {
            "file": {"type": "string", "format": "binary"},
        },
    },
    "ManuscriptAnalyzeResponse": {
        "type": "object",
        "properties": {
            "claims_found": {"type": "integer"},
            "inconsistencies": {"type": "integer"},
            "overall_quality": {"type": "string"},
            "claims": {"type": "array", "items": {"type": "object", "additionalProperties": True}},
            "recommendations": {"type": "array", "items": {"type": "string"}},
        },
    },
    # -- reports --------------------------------------------------------
    "ReportGenerateRequest": {
        "type": "object",
        "required": ["analysis_type", "results"],
        "properties": {
            "analysis_type": {"type": "string", "example": "ttest"},
            "results": {"type": "object", "additionalProperties": True},
            "format": {"type": "string", "enum": ["pdf", "html", "docx"], "default": "pdf"},
        },
    },
    "ReportSummary": {
        "type": "object",
        "properties": {
            "id": {"type": "string", "format": "uuid"},
            "analysis_type": {"type": "string"},
            "created_at": {"type": "string", "format": "date-time"},
            "format": {"type": "string"},
        },
    },
    # -- audit ----------------------------------------------------------
    "AuditSummary": {
        "type": "object",
        "properties": {
            "total_analyses": {"type": "integer"},
            "last_24h": {"type": "integer"},
            "top_tests": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "test": {"type": "string"},
                        "count": {"type": "integer"},
                    },
                },
            },
        },
    },
}


# ---------------------------------------------------------------------------
# Paths — organised by tag
# ---------------------------------------------------------------------------


def _build_paths() -> dict:  # noqa: C901  (intentionally large for completeness)
    """Return the ``paths`` object of the OpenAPI spec."""
    paths = {}

    # ====================================================================
    # Statistical Tests
    # ====================================================================
    _tag = "Statistical Tests"

    paths["/stats/ttest/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "runTTest",
            "summary": "High-precision t-test (one-sample, two-sample, or paired)",
            "description": (
                "Performs a t-test with 50-decimal-digit precision. "
                "Includes automatic Guardian assumption checking, effect sizes, "
                "and optional cross-validation against standard-precision results."
            ),
            "requestBody": _json_body(_ref("TTestRequest")),
            "responses": {
                "200": _json_response(_ref("TTestResponse")),
                **_error_responses(),
            },
        },
    }

    paths["/stats/anova/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "runANOVA",
            "summary": "High-precision one-way / two-way ANOVA",
            "requestBody": _json_body(_ref("ANOVARequest")),
            "responses": {
                "200": _json_response(_ref("ANOVAResponse")),
                **_error_responses(),
            },
        },
    }

    paths["/stats/ancova/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "runANCOVA",
            "summary": "High-precision ANCOVA with covariate adjustment",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/stats/correlation/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "runCorrelation",
            "summary": "Pearson / Spearman / Kendall correlation with CI",
            "requestBody": _json_body(_ref("CorrelationRequest")),
            "responses": {
                "200": _json_response(
                    {
                        "type": "object",
                        "properties": {
                            "r": _ref("HighPrecisionNumber"),
                            "p_value": _ref("HighPrecisionNumber"),
                            "method": {"type": "string"},
                            "confidence_interval": {
                                "type": "object",
                                "properties": {
                                    "lower": {"type": "number"},
                                    "upper": {"type": "number"},
                                },
                            },
                        },
                    }
                ),
                **_error_responses(),
            },
        },
    }

    paths["/stats/regression/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "runRegression",
            "summary": "Regression analysis (linear, multiple, polynomial, logistic, ridge, lasso)",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/stats/descriptive/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "runDescriptive",
            "summary": "Descriptive statistics with normality tests",
            "requestBody": _json_body(_ref("DescriptiveRequest")),
            "responses": {
                "200": _json_response(
                    {
                        "type": "object",
                        "properties": {
                            "mean": _ref("HighPrecisionNumber"),
                            "median": _ref("HighPrecisionNumber"),
                            "std_dev": _ref("HighPrecisionNumber"),
                            "variance": _ref("HighPrecisionNumber"),
                            "skewness": {"type": "number"},
                            "kurtosis": {"type": "number"},
                            "normality": {
                                "type": "object",
                                "properties": {
                                    "shapiro_wilk": {
                                        "type": "object",
                                        "properties": {"statistic": {"type": "number"}, "p_value": {"type": "number"}},
                                    },
                                },
                            },
                        },
                    }
                ),
                **_error_responses(),
            },
        },
    }

    paths["/stats/comparison/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "runComparison",
            "summary": "Compare standard vs high-precision results",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    # ====================================================================
    # Power Analysis
    # ====================================================================
    _tag = "Power Analysis"

    paths["/power/t-test/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "powerTTest",
            "summary": "Statistical power for t-tests",
            "requestBody": _json_body(_ref("PowerTTestRequest")),
            "responses": {"200": _json_response(_ref("PowerResponse")), **_error_responses()},
        },
    }

    paths["/power/anova/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "powerANOVA",
            "summary": "Statistical power for ANOVA designs",
            "requestBody": _json_body(
                {
                    "type": "object",
                    "properties": {
                        "effect_size": {"type": "number", "description": "Cohen's f"},
                        "alpha": {"type": "number", "default": 0.05},
                        "n_per_group": {"type": "integer"},
                        "n_groups": {"type": "integer"},
                    },
                }
            ),
            "responses": {"200": _json_response(_ref("PowerResponse")), **_error_responses()},
        },
    }

    paths["/power/correlation/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "powerCorrelation",
            "summary": "Statistical power for correlation tests",
            "requestBody": _json_body(
                {
                    "type": "object",
                    "properties": {
                        "r": {"type": "number", "description": "Expected correlation coefficient."},
                        "alpha": {"type": "number", "default": 0.05},
                        "n": {"type": "integer"},
                    },
                }
            ),
            "responses": {"200": _json_response(_ref("PowerResponse")), **_error_responses()},
        },
    }

    paths["/power/chi-square/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "powerChiSquare",
            "summary": "Statistical power for chi-square tests",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {"200": _json_response(_ref("PowerResponse")), **_error_responses()},
        },
    }

    paths["/power/curves/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "powerCurves",
            "summary": "Generate power curves over a range of parameters",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/power/report/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "powerReport",
            "summary": "Comprehensive power analysis report",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    # ====================================================================
    # Categorical Analysis
    # ====================================================================
    _tag = "Categorical Analysis"

    paths["/categorical/chi-square/independence/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "chiSquareIndependence",
            "summary": "Chi-square test of independence",
            "requestBody": _json_body(_ref("ChiSquareRequest")),
            "responses": {"200": _json_response(_ref("ChiSquareResponse")), **_error_responses()},
        },
    }

    paths["/categorical/chi-square/goodness/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "chiSquareGoodness",
            "summary": "Chi-square goodness-of-fit test",
            "requestBody": _json_body(
                {
                    "type": "object",
                    "required": ["observed"],
                    "properties": {
                        "observed": {"type": "array", "items": {"type": "number"}},
                        "expected": {"type": "array", "items": {"type": "number"}},
                    },
                }
            ),
            "responses": {"200": _json_response(_ref("ChiSquareResponse")), **_error_responses()},
        },
    }

    paths["/categorical/fishers/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "fisherExactTest",
            "summary": "Fisher's exact test for 2x2 tables",
            "requestBody": _json_body(
                {
                    "type": "object",
                    "required": ["table"],
                    "properties": {
                        "table": {
                            "type": "array",
                            "items": {"type": "array", "items": {"type": "integer"}},
                            "example": [[10, 20], [30, 40]],
                        },
                    },
                }
            ),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/categorical/mcnemar/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "mcnemarTest",
            "summary": "McNemar's test for paired nominal data",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/categorical/cochran-q/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "cochranQTest",
            "summary": "Cochran's Q test for related binary outcomes",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/categorical/g-test/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "gTest",
            "summary": "G-test (log-likelihood ratio test)",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/categorical/binomial/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "binomialTest",
            "summary": "Exact binomial test",
            "requestBody": _json_body(
                {
                    "type": "object",
                    "required": ["successes", "n"],
                    "properties": {
                        "successes": {"type": "integer"},
                        "n": {"type": "integer"},
                        "p": {"type": "number", "default": 0.5},
                    },
                }
            ),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/categorical/multinomial/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "multinomialTest",
            "summary": "Multinomial test",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    # ====================================================================
    # Nonparametric Tests
    # ====================================================================
    _tag = "Nonparametric Tests"

    paths["/nonparametric/mann-whitney/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "mannWhitneyU",
            "summary": "Mann-Whitney U test for two independent groups",
            "requestBody": _json_body(_ref("MannWhitneyRequest")),
            "responses": {
                "200": _json_response(
                    {
                        "type": "object",
                        "properties": {
                            "U_statistic": _ref("HighPrecisionNumber"),
                            "p_value": _ref("HighPrecisionNumber"),
                            "effect_size": {"type": "object", "properties": {"rank_biserial": {"type": "number"}}},
                        },
                    }
                ),
                **_error_responses(),
            },
        },
    }

    paths["/nonparametric/wilcoxon/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "wilcoxonSignedRank",
            "summary": "Wilcoxon signed-rank test for paired data",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/nonparametric/kruskal-wallis/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "kruskalWallis",
            "summary": "Kruskal-Wallis H test for k independent groups",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/nonparametric/friedman/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "friedmanTest",
            "summary": "Friedman test for repeated measures (nonparametric)",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/nonparametric/sign/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "signTest",
            "summary": "Sign test for paired data",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/nonparametric/mood/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "moodMedianTest",
            "summary": "Mood's median test",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/nonparametric/jonckheere/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "jonckheere",
            "summary": "Jonckheere-Terpstra trend test",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/nonparametric/page/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "pageTrendTest",
            "summary": "Page's trend test for ordered alternatives",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    # ====================================================================
    # Missing Data
    # ====================================================================
    _tag = "Missing Data"

    paths["/missing-data/detect/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "detectMissing",
            "summary": "Detect missing data patterns",
            "requestBody": _json_body(_ref("MissingDataDetectRequest")),
            "responses": {
                "200": _json_response(
                    {
                        "type": "object",
                        "properties": {
                            "total_missing": {"type": "integer"},
                            "percent_missing": {"type": "number"},
                            "pattern": {"type": "string", "enum": ["MCAR", "MAR", "MNAR", "unknown"]},
                            "by_column": {"type": "object", "additionalProperties": {"type": "object"}},
                        },
                    }
                ),
                **_error_responses(),
            },
        },
    }

    paths["/missing-data/impute/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "imputeMissing",
            "summary": "Impute missing data (mean, median, mode, regression, etc.)",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/missing-data/little-test/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "littleMCARTest",
            "summary": "Little's MCAR test",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/missing-data/compare/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "compareImputation",
            "summary": "Compare multiple imputation methods",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/missing-data/visualize/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "visualizeMissing",
            "summary": "Generate missing data visualisation data",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/missing-data/multiple-imputation/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "multipleImputation",
            "summary": "Multiple imputation with pooled estimates",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/missing-data/knn/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "knnImputation",
            "summary": "K-nearest neighbours imputation",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/missing-data/em/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "emImputation",
            "summary": "Expectation-Maximisation imputation",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    # ====================================================================
    # Survival Analysis
    # ====================================================================
    _tag = "Survival Analysis"

    paths["/survival/kaplan-meier/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "kaplanMeier",
            "summary": "Kaplan-Meier survival analysis with optional log-rank test",
            "requestBody": _json_body(_ref("KaplanMeierRequest")),
            "responses": {
                "200": _json_response(
                    {
                        "type": "object",
                        "properties": {
                            "survival_table": {"type": "array", "items": {"type": "object"}},
                            "median_survival": {"type": "number", "nullable": True},
                            "log_rank": {
                                "type": "object",
                                "properties": {"chi_square": {"type": "number"}, "p_value": {"type": "number"}},
                            },
                        },
                    }
                ),
                **_error_responses(),
            },
        },
    }

    paths["/survival/cox-regression/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "coxRegression",
            "summary": "Cox proportional hazards regression",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/survival/predict/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "predictSurvival",
            "summary": "Predict survival probabilities for new observations",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    # ====================================================================
    # Factor Analysis
    # ====================================================================
    _tag = "Factor Analysis"

    paths["/factor/adequacy/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "factorAdequacy",
            "summary": "KMO and Bartlett's test of sampling adequacy",
            "requestBody": _json_body(_ref("FactorAdequacyRequest")),
            "responses": {
                "200": _json_response(
                    {
                        "type": "object",
                        "properties": {
                            "kmo": {"type": "number"},
                            "bartlett_chi_square": {"type": "number"},
                            "bartlett_p_value": {"type": "number"},
                            "adequate": {"type": "boolean"},
                        },
                    }
                ),
                **_error_responses(),
            },
        },
    }

    paths["/factor/determine/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "determineFactor",
            "summary": "Determine optimal number of factors (parallel analysis, scree)",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/factor/efa/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "exploratoryFA",
            "summary": "Exploratory factor analysis with rotation",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/factor/transform/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "transformFactors",
            "summary": "Apply factor transformations (rotation, scoring)",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    # ====================================================================
    # Meta-Analysis
    # ====================================================================
    _tag = "Meta-Analysis"

    paths["/meta-analysis/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "runMetaAnalysis",
            "summary": "Fixed or random-effects meta-analysis",
            "requestBody": _json_body(_ref("MetaAnalysisRequest")),
            "responses": {"200": _json_response(_ref("MetaAnalysisResponse")), **_error_responses()},
        },
    }

    paths["/meta-analysis/convert-effect/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "convertEffectSize",
            "summary": "Convert between effect size metrics (d, r, OR, etc.)",
            "requestBody": _json_body(
                {
                    "type": "object",
                    "required": ["value", "from_type", "to_type"],
                    "properties": {
                        "value": {"type": "number"},
                        "from_type": {"type": "string", "enum": ["d", "r", "OR", "RR", "eta_squared"]},
                        "to_type": {"type": "string", "enum": ["d", "r", "OR", "RR", "eta_squared"]},
                    },
                }
            ),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/meta-analysis/publication-bias/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "publicationBias",
            "summary": "Funnel plot asymmetry and trim-and-fill analysis",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    # ====================================================================
    # Causal Inference
    # ====================================================================
    _tag = "Causal Inference"

    paths["/core/causal/dag/create/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "createDAG",
            "summary": "Create a directed acyclic graph (DAG)",
            "requestBody": _json_body(_ref("DAGCreateRequest")),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/core/causal/dag/analyze/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "analyzeDAG",
            "summary": "Analyze DAG for d-separation and paths",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/core/causal/propensity/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "propensityScores",
            "summary": "Estimate propensity scores",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/core/causal/match/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "propensityMatching",
            "summary": "Propensity score matching",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/core/causal/effect/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "treatmentEffects",
            "summary": "Estimate ATE / ATT / ATC treatment effects",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/core/causal/mediation/baron-kenny/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "mediationBaronKenny",
            "summary": "Baron-Kenny mediation analysis",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/core/causal/did/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "differenceInDifferences",
            "summary": "Difference-in-differences analysis",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    # ====================================================================
    # Mixed Models
    # ====================================================================
    _tag = "Mixed Models"

    paths["/core/mixed/icc/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "calculateICC",
            "summary": "Intraclass correlation coefficient (ICC)",
            "requestBody": _json_body(_ref("ICCRequest")),
            "responses": {
                "200": _json_response(
                    {
                        "type": "object",
                        "properties": {
                            "icc": {"type": "number"},
                            "icc_type": {"type": "string"},
                            "confidence_interval": {
                                "type": "object",
                                "properties": {"lower": {"type": "number"}, "upper": {"type": "number"}},
                            },
                            "f_test": {
                                "type": "object",
                                "properties": {"F": {"type": "number"}, "p_value": {"type": "number"}},
                            },
                        },
                    }
                ),
                **_error_responses(),
            },
        },
    }

    paths["/core/mixed/lmm/fit/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "fitLMM",
            "summary": "Fit a linear mixed model",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/core/mixed/lmm/random-effects/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "randomEffects",
            "summary": "Extract random effects from a fitted LMM",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/core/mixed/lmm/compare/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "compareModels",
            "summary": "Compare nested mixed models (LRT, AIC, BIC)",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/core/mixed/lmm/diagnostics/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "lmmDiagnostics",
            "summary": "Residual and influence diagnostics for LMM",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    # ====================================================================
    # AI Advisor
    # ====================================================================
    _tag = "AI Advisor"

    paths["/ai-advisor/chat/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "aiAdvisorChat",
            "summary": "Conversational statistical guidance",
            "requestBody": _json_body(_ref("AIAdvisorChatRequest")),
            "responses": {"200": _json_response(_ref("AIAdvisorChatResponse")), **_error_responses()},
        },
    }

    paths["/ai-advisor/quick-recommend/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "quickRecommend",
            "summary": "Quick test recommendation from data description",
            "requestBody": _json_body(
                {
                    "type": "object",
                    "required": ["description"],
                    "properties": {
                        "description": {"type": "string", "example": "I have two groups and want to compare means."},
                    },
                }
            ),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/ai-advisor/interpret/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "interpretResults",
            "summary": "Plain-language interpretation of statistical output",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/ai-advisor/methods-section/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "methodsSection",
            "summary": "Generate a methods section paragraph",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/ai-advisor/parse-query/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "parseQuery",
            "summary": "NLP-enhanced query parsing",
            "requestBody": _json_body(
                {
                    "type": "object",
                    "required": ["query"],
                    "properties": {"query": {"type": "string"}},
                }
            ),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/ai-advisor/analysis-plan/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "analysisPlan",
            "summary": "Generate a full analysis plan from a research question",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/ai-advisor/apa-report/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "apaReport",
            "summary": "Generate an APA-style results report",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    # ====================================================================
    # SQS (Statistical Quality Score)
    # ====================================================================
    _tag = "SQS"

    paths["/sqs/analyze/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "sqsAnalyze",
            "summary": "Analyze a PDF manuscript for statistical quality",
            "description": "Upload a PDF via multipart/form-data. Returns an SQS score and detailed findings.",
            "requestBody": {
                "required": True,
                "content": {
                    "multipart/form-data": {"schema": _ref("SQSAnalyzeRequest")},
                },
            },
            "responses": {"200": _json_response(_ref("SQSAnalyzeResponse")), **_error_responses()},
        },
    }

    paths["/sqs/analyze-text/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "sqsAnalyzeText",
            "summary": "Analyze raw text for statistical quality",
            "requestBody": _json_body(
                {
                    "type": "object",
                    "required": ["text"],
                    "properties": {
                        "text": {"type": "string"},
                        "field": {"type": "string"},
                    },
                }
            ),
            "responses": {"200": _json_response(_ref("SQSAnalyzeResponse")), **_error_responses()},
        },
    }

    paths["/sqs/rules/"] = {
        "get": {
            "tags": [_tag],
            "operationId": "sqsRules",
            "summary": "List all 45 SQS detection rules",
            "responses": {"200": _json_response({"type": "object", "additionalProperties": True})},
        },
    }

    paths["/sqs/fields/"] = {
        "get": {
            "tags": [_tag],
            "operationId": "sqsFields",
            "summary": "List available research fields and their weights",
            "responses": {"200": _json_response({"type": "object", "additionalProperties": True})},
        },
    }

    paths["/sqs/categories/"] = {
        "get": {
            "tags": [_tag],
            "operationId": "sqsCategories",
            "summary": "List the 6 SQS scoring categories",
            "responses": {"200": _json_response({"type": "object", "additionalProperties": True})},
        },
    }

    paths["/sqs/quick-check/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "sqsQuickCheck",
            "summary": "Quick SQS check for a single statistical claim",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    # ====================================================================
    # Autonomous Intelligence
    # ====================================================================
    _tag = "Autonomous Intelligence"

    paths["/autonomous/profile/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "smartProfile",
            "summary": "Smart data profiling — automatic variable typing and recommendations",
            "description": "Accepts CSV/Excel file upload or JSON data body.",
            "requestBody": _json_body(_ref("AutonomousProfileRequest")),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/autonomous/query/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "autonomousQuery",
            "summary": "Natural-language autonomous analysis pipeline",
            "requestBody": _json_body(_ref("AutonomousQueryRequest")),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/autonomous/cascade/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "cascadeExecute",
            "summary": "Guardian-protected cascade execution",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/autonomous/translate/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "translateResults",
            "summary": "Translate statistical results into plain language",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/autonomous/next-step/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "nextStep",
            "summary": "Suggest next analysis step based on current results",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    # ====================================================================
    # Manuscript Review
    # ====================================================================
    _tag = "Manuscript Review"

    paths["/manuscript/analyze/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "manuscriptAnalyze",
            "summary": "Full manuscript statistical quality review",
            "description": "Upload a PDF, LaTeX, or DOCX manuscript for automated review.",
            "requestBody": {
                "required": True,
                "content": {
                    "multipart/form-data": {"schema": _ref("ManuscriptAnalyzeRequest")},
                },
            },
            "responses": {"200": _json_response(_ref("ManuscriptAnalyzeResponse")), **_error_responses()},
        },
    }

    paths["/manuscript/parse/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "manuscriptParse",
            "summary": "Parse manuscript structure (sections, tables, figures)",
            "requestBody": {
                "required": True,
                "content": {
                    "multipart/form-data": {"schema": _ref("ManuscriptAnalyzeRequest")},
                },
            },
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/manuscript/claims/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "manuscriptClaims",
            "summary": "Extract statistical claims from a manuscript",
            "requestBody": {
                "required": True,
                "content": {
                    "multipart/form-data": {"schema": _ref("ManuscriptAnalyzeRequest")},
                },
            },
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/manuscript/consistency/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "manuscriptConsistency",
            "summary": "Check internal consistency of statistical claims",
            "requestBody": {
                "required": True,
                "content": {
                    "multipart/form-data": {"schema": _ref("ManuscriptAnalyzeRequest")},
                },
            },
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/manuscript/report/{submission_id}/"] = {
        "get": {
            "tags": [_tag],
            "operationId": "manuscriptReport",
            "summary": "Retrieve a stored manuscript review report",
            "parameters": [
                {
                    "name": "submission_id",
                    "in": "path",
                    "required": True,
                    "schema": {"type": "string", "format": "uuid"},
                }
            ],
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/manuscript/journal/submit/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "journalSubmit",
            "summary": "Submit manuscript to a journal (requires review pass)",
            "requestBody": _json_body({"type": "object", "additionalProperties": True}),
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    # ====================================================================
    # Platform (organizations, billing, API keys)
    # ====================================================================
    _tag = "Platform"

    for ep, op, summary in [
        ("platform/organizations/", "listOrganizations", "List organisations for the authenticated user"),
        ("platform/members/", "listMembers", "List organisation members"),
        ("platform/usage/", "getUsage", "Get API usage statistics"),
        ("platform/billing/", "getBilling", "Get billing and subscription info"),
        ("platform/api-keys/", "listAPIKeys", "List and manage API keys"),
        ("platform/tiers/", "getTiers", "Get available subscription tiers"),
    ]:
        paths[f"/{ep}"] = {
            "get": {
                "tags": [_tag],
                "operationId": op,
                "summary": summary,
                "security": [{"TokenAuth": []}, {"APIKeyAuth": []}],
                "responses": {
                    "200": _json_response({"type": "object", "additionalProperties": True}),
                    **_error_responses(),
                },
            },
        }

    # ====================================================================
    # Reports
    # ====================================================================
    _tag = "Reports"

    paths["/reports/"] = {
        "get": {
            "tags": [_tag],
            "operationId": "listReports",
            "summary": "List generated reports",
            "responses": {
                "200": _json_response(
                    {
                        "type": "array",
                        "items": _ref("ReportSummary"),
                    }
                ),
                **_error_responses(),
            },
        },
    }

    paths["/reports/generate/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "generateReport",
            "summary": "Generate a new report from analysis results",
            "requestBody": _json_body(_ref("ReportGenerateRequest")),
            "responses": {"201": _json_response(_ref("ReportSummary"), "Report created"), **_error_responses()},
        },
    }

    paths["/reports/{report_id}/"] = {
        "get": {
            "tags": [_tag],
            "operationId": "getReport",
            "summary": "Retrieve a specific report",
            "parameters": [
                {
                    "name": "report_id",
                    "in": "path",
                    "required": True,
                    "schema": {"type": "string", "format": "uuid"},
                }
            ],
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/reports/{report_id}/export/"] = {
        "get": {
            "tags": [_tag],
            "operationId": "exportReport",
            "summary": "Export report as PDF / HTML / DOCX",
            "parameters": [
                {
                    "name": "report_id",
                    "in": "path",
                    "required": True,
                    "schema": {"type": "string", "format": "uuid"},
                },
                {
                    "name": "format",
                    "in": "query",
                    "schema": {"type": "string", "enum": ["pdf", "html", "docx"], "default": "pdf"},
                },
            ],
            "responses": {
                "200": {
                    "description": "Report file download",
                    "content": {"application/octet-stream": {"schema": {"type": "string", "format": "binary"}}},
                },
                **_error_responses(),
            },
        },
    }

    # ====================================================================
    # Audit
    # ====================================================================
    _tag = "Audit"

    paths["/audit/summary/"] = {
        "get": {
            "tags": [_tag],
            "operationId": "auditSummary",
            "summary": "Audit trail summary",
            "responses": {"200": _json_response(_ref("AuditSummary")), **_error_responses()},
        },
    }

    paths["/audit/record/"] = {
        "post": {
            "tags": [_tag],
            "operationId": "auditRecord",
            "summary": "Record an audit event",
            "requestBody": _json_body(
                {
                    "type": "object",
                    "required": ["action", "details"],
                    "properties": {
                        "action": {"type": "string"},
                        "details": {"type": "object", "additionalProperties": True},
                    },
                }
            ),
            "responses": {
                "201": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    paths["/audit/metrics/{metric_type}/"] = {
        "get": {
            "tags": [_tag],
            "operationId": "auditMetrics",
            "summary": "Retrieve audit metrics by type",
            "parameters": [
                {
                    "name": "metric_type",
                    "in": "path",
                    "required": True,
                    "schema": {"type": "string", "enum": ["usage", "performance", "errors", "guardian"]},
                }
            ],
            "responses": {
                "200": _json_response({"type": "object", "additionalProperties": True}),
                **_error_responses(),
            },
        },
    }

    # ====================================================================
    # Health check (utility)
    # ====================================================================

    paths["/health/"] = {
        "get": {
            "tags": ["Platform"],
            "operationId": "healthCheck",
            "summary": "Health check for container orchestration",
            "responses": {
                "200": _json_response(
                    {
                        "type": "object",
                        "properties": {
                            "status": {"type": "string", "example": "ok"},
                            "version": {"type": "string"},
                        },
                    }
                ),
            },
        },
    }

    return paths


# ---------------------------------------------------------------------------
# Top-level OpenAPI document
# ---------------------------------------------------------------------------


def build_openapi_spec() -> dict:
    """Build and return the complete OpenAPI 3.0.3 specification dict."""
    return {
        "openapi": "3.0.3",
        "info": {
            "title": "StickForStats API",
            "version": "2.0.0",
            "description": (
                "High-precision statistical analysis REST API with Guardian "
                "assumption protection.  All numeric results are computed to "
                "50-decimal-digit precision using mpmath.  The API supports "
                "classical tests, power analysis, categorical / nonparametric "
                "methods, survival analysis, factor analysis, meta-analysis, "
                "causal inference, mixed models, AI-assisted guidance, "
                "autonomous natural-language queries, SQS manuscript scoring, "
                "and automated manuscript review.\n\n"
                "**Guardian Statistical Protection System** automatically "
                "validates assumptions (normality, homogeneity, sample size, "
                "outliers, independence, multicollinearity, sphericity, "
                "proportional hazards) before every test and returns a "
                "confidence score with actionable violation details."
            ),
            "contact": {
                "name": "StickForStats Team",
                "url": "https://github.com/stickforstats",
            },
            "license": {
                "name": "GPL-3.0",
                "url": "https://www.gnu.org/licenses/gpl-3.0.html",
            },
        },
        "servers": [
            {
                "url": "/api/v1",
                "description": "API v1 (high-precision)",
            },
        ],
        "tags": [
            {
                "name": "Statistical Tests",
                "description": "Core parametric tests (t-test, ANOVA, ANCOVA, correlation, regression, descriptive)",
            },
            {
                "name": "Power Analysis",
                "description": "Power, sample size, and effect size calculations (50-digit precision)",
            },
            {
                "name": "Categorical Analysis",
                "description": "Chi-square, Fisher, McNemar, Cochran Q, G-test, binomial, multinomial",
            },
            {
                "name": "Nonparametric Tests",
                "description": "Mann-Whitney, Wilcoxon, Kruskal-Wallis, Friedman, Sign, Mood, Jonckheere, Page",
            },
            {
                "name": "Missing Data",
                "description": "Detection, imputation (mean/KNN/EM/multiple), and Little's MCAR test",
            },
            {"name": "Survival Analysis", "description": "Kaplan-Meier, Cox regression, and survival prediction"},
            {"name": "Factor Analysis", "description": "KMO/Bartlett adequacy, parallel analysis, EFA with rotation"},
            {
                "name": "Meta-Analysis",
                "description": "Fixed/random-effects meta-analysis, effect size conversion, publication bias",
            },
            {
                "name": "Causal Inference",
                "description": "DAGs, propensity scores, matching, treatment effects, mediation, DiD",
            },
            {
                "name": "Mixed Models",
                "description": "ICC, linear mixed models, random effects, model comparison, diagnostics",
            },
            {
                "name": "AI Advisor",
                "description": "Claude-powered statistical guidance, NLP query parsing, APA report generation",
            },
            {
                "name": "SQS",
                "description": "Statistical Quality Score — 45 rules across 6 categories for manuscript evaluation",
            },
            {
                "name": "Autonomous Intelligence",
                "description": "Natural-language analysis pipeline: profile, query, cascade, translate, next-step",
            },
            {
                "name": "Manuscript Review",
                "description": "Automated manuscript review: parsing, claim extraction, consistency checking",
            },
            {"name": "Platform", "description": "Organisations, members, usage, billing, API keys, subscription tiers"},
            {"name": "Reports", "description": "Generate, list, retrieve, and export analysis reports"},
            {"name": "Audit", "description": "Audit trail: summary, event recording, and metrics"},
        ],
        "paths": _build_paths(),
        "components": {
            "schemas": COMPONENT_SCHEMAS,
            "securitySchemes": {
                "TokenAuth": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "Token",
                    "description": "DRF Token authentication.  Send `Authorization: Token <your-token>`.",
                },
                "APIKeyAuth": {
                    "type": "apiKey",
                    "in": "header",
                    "name": "X-API-Key",
                    "description": "API key authentication for programmatic access.",
                },
            },
        },
        "security": [
            {"TokenAuth": []},
            {"APIKeyAuth": []},
        ],
    }


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------


class OpenAPISchemaView(APIView):
    """
    Serve the OpenAPI 3.0.3 specification as JSON (default) or YAML.

    Query parameter ``?format=yaml`` or ``Accept: application/x-yaml`` header
    switches to YAML output.
    """

    permission_classes = [AllowAny]
    authentication_classes = []  # No auth required to read schema

    @method_decorator(cache_page(3600))  # Cache for 1 hour
    def get(self, request):
        spec = build_openapi_spec()

        want_yaml = request.query_params.get("format", "").lower() == "yaml" or "yaml" in request.META.get(
            "HTTP_ACCEPT", ""
        )

        if want_yaml:
            try:
                import yaml

                content = yaml.dump(spec, default_flow_style=False, allow_unicode=True, sort_keys=False)
                return HttpResponse(content, content_type="application/x-yaml; charset=utf-8")
            except ImportError:
                # PyYAML not installed — fall back to JSON with a header hint
                return Response(
                    spec,
                    headers={"X-Schema-Note": "YAML requested but PyYAML is not installed; returning JSON."},
                )

        return Response(spec)


class SwaggerUIView(APIView):
    """
    Render Swagger UI from CDN (swagger-ui-dist 5.x).

    The page fetches the schema from the sibling ``../`` endpoint
    (i.e. ``OpenAPISchemaView``).
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        # Resolve the schema URL relative to the current mount point.
        schema_url = request.build_absolute_uri("../")
        if not schema_url.endswith("/"):
            schema_url += "/"

        html = f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StickForStats API — Swagger UI</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>
    html {{ box-sizing: border-box; overflow-y: scroll; }}
    *, *::before, *::after {{ box-sizing: inherit; }}
    body {{ margin: 0; background: #fafafa; }}
    .topbar {{ display: none !important; }}
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function () {{
      SwaggerUIBundle({{
        url: "{schema_url}",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        defaultModelsExpandDepth: 1,
        docExpansion: "list",
        filter: true,
        tagsSorter: "alpha",
        operationsSorter: "alpha",
      }});
    }};
  </script>
</body>
</html>"""
        return HttpResponse(html, content_type="text/html; charset=utf-8")


class ReDocView(APIView):
    """
    Render ReDoc from CDN.

    The page fetches the schema from the sibling ``../`` endpoint.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        schema_url = request.build_absolute_uri("../")
        if not schema_url.endswith("/"):
            schema_url += "/"

        html = f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StickForStats API — ReDoc</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Source+Code+Pro&display=swap" rel="stylesheet">
  <style>
    body {{ margin: 0; padding: 0; }}
  </style>
</head>
<body>
  <redoc spec-url="{schema_url}"
         hide-download-button="false"
         theme='{{"typography":{{"fontFamily":"Inter, sans-serif","code":{{"fontFamily":"Source Code Pro, monospace"}}}}}}'
  ></redoc>
  <script src="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"></script>
</body>
</html>"""
        return HttpResponse(html, content_type="text/html; charset=utf-8")
