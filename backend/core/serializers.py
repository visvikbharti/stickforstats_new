"""
Serializers for StickForStats Core API
Handles data validation and serialization for frontend-backend communication
"""

from rest_framework import serializers


class DataUploadSerializer(serializers.Serializer):
    """Serializer for data file uploads"""

    file = serializers.FileField(required=True)
    file_type = serializers.ChoiceField(choices=["csv", "excel", "spss", "json"], default="csv")
    delimiter = serializers.CharField(default=",", required=False)
    has_header = serializers.BooleanField(default=True)

    def validate_file(self, value):
        """Validate uploaded file"""
        # Check file size (max 50MB)
        if value.size > 50 * 1024 * 1024:
            raise serializers.ValidationError("File size cannot exceed 50MB")

        # Check file extension
        allowed_extensions = [".csv", ".xlsx", ".xls", ".sav", ".json"]
        file_name = value.name.lower()
        if not any(file_name.endswith(ext) for ext in allowed_extensions):
            raise serializers.ValidationError(f"File type not supported. Allowed: {', '.join(allowed_extensions)}")

        return value


class VariableInfoSerializer(serializers.Serializer):
    """Serializer for variable information"""

    name = serializers.CharField(max_length=100)
    type = serializers.ChoiceField(choices=["continuous", "ordinal", "nominal", "binary"])
    dtype = serializers.CharField()  # numpy dtype
    missing_count = serializers.IntegerField()
    unique_count = serializers.IntegerField()
    sample_values = serializers.ListField(child=serializers.CharField(), max_length=5)


class DataSummarySerializer(serializers.Serializer):
    """Serializer for data summary response"""

    data_id = serializers.CharField()
    n_rows = serializers.IntegerField()
    n_cols = serializers.IntegerField()
    variables = VariableInfoSerializer(many=True)
    missing_summary = serializers.DictField()
    data_types = serializers.DictField()
    preview = serializers.ListField()  # First 5 rows


class AssumptionCheckRequestSerializer(serializers.Serializer):
    """Serializer for assumption check requests"""

    data_id = serializers.CharField(required=True)
    test_type = serializers.ChoiceField(
        choices=["normality", "homogeneity", "independence", "linearity", "multicollinearity", "outliers"],
        required=False,
    )
    variables = serializers.ListField(child=serializers.CharField(), required=False)
    alpha = serializers.FloatField(default=0.05, min_value=0.001, max_value=0.999)


class AssumptionResultSerializer(serializers.Serializer):
    """Serializer for assumption test results"""

    test_name = serializers.CharField()
    statistic = serializers.FloatField()
    p_value = serializers.FloatField()
    passed = serializers.BooleanField()
    interpretation = serializers.CharField()
    recommendations = serializers.ListField(child=serializers.CharField())


class TestRecommendationRequestSerializer(serializers.Serializer):
    """Serializer for test recommendation requests"""

    data_id = serializers.CharField(required=True)
    dependent_var = serializers.CharField(required=True)
    independent_vars = serializers.ListField(child=serializers.CharField(), min_length=1)
    hypothesis_type = serializers.ChoiceField(
        choices=["difference", "relationship", "prediction", "reduction"], default="difference"
    )
    is_paired = serializers.BooleanField(default=False)
    alpha = serializers.FloatField(default=0.05)


class RecommendedTestSerializer(serializers.Serializer):
    """Serializer for recommended test information"""

    test_name = serializers.CharField()
    test_type = serializers.CharField()
    suitability_score = serializers.FloatField()
    reasons = serializers.ListField(child=serializers.CharField())
    assumptions_met = serializers.ListField(child=serializers.CharField())
    assumptions_violated = serializers.ListField(child=serializers.CharField())
    power_estimate = serializers.FloatField(required=False)
    sample_size_adequate = serializers.BooleanField()
    alternatives = serializers.ListField(child=serializers.DictField(), required=False)


class TestExecutionRequestSerializer(serializers.Serializer):
    """Serializer for test execution requests"""

    data_id = serializers.CharField(required=True)
    test_type = serializers.CharField(required=True)
    dependent_var = serializers.CharField(required=True)
    independent_vars = serializers.ListField(child=serializers.CharField(), required=False)
    parameters = serializers.DictField(default=dict)
    options = serializers.DictField(default=dict)


class TestResultSerializer(serializers.Serializer):
    """Serializer for test execution results"""

    test_name = serializers.CharField()
    statistic = serializers.FloatField()
    p_value = serializers.FloatField()
    degrees_of_freedom = serializers.FloatField(required=False)
    effect_size = serializers.DictField()  # type, value, CI
    confidence_interval = serializers.ListField(child=serializers.FloatField(), required=False)
    summary_statistics = serializers.DictField()
    interpretation = serializers.CharField()
    apa_format = serializers.CharField()
    assumptions = AssumptionResultSerializer(many=True)
    post_hoc = serializers.DictField(required=False)
    visualizations = serializers.ListField(child=serializers.DictField(), required=False)


# Multiplicity Correction Serializers


class MultiplicityCorrectionRequestSerializer(serializers.Serializer):
    """Serializer for multiplicity correction requests"""

    p_values = serializers.ListField(child=serializers.FloatField(min_value=0, max_value=1), min_length=2)
    # These are exactly the values of CorrectionMethod. The list used to advertise
    # "fdr_tsbh", "fdr_tsbky" and "simes-hochberg", none of which exist in the enum, so
    # requesting one raised ValueError inside correct() and came back as a 500. Keep this in
    # step with the enum -- an endpoint that offers a method it cannot run is worse than one
    # that does not offer it.
    method = serializers.ChoiceField(
        choices=[
            "bonferroni",
            "holm",
            "hochberg",
            "hommel",
            "sidak",
            "holm-sidak",
            "fdr_bh",
            "fdr_by",
            "fdr_tst",
            "qvalue",
            "none",
        ],
        default="holm",
    )
    alpha = serializers.FloatField(default=0.05, min_value=0.001, max_value=0.999)
    hypothesis_names = serializers.ListField(child=serializers.CharField(), required=False)

    def validate(self, data):
        """Validate that p_values and hypothesis_names have same length if both provided"""
        if "hypothesis_names" in data:
            if len(data["hypothesis_names"]) != len(data["p_values"]):
                raise serializers.ValidationError("Number of hypothesis names must match number of p-values")
        return data


class MultiplicityCorrectionResultSerializer(serializers.Serializer):
    """Serializer for multiplicity correction results"""

    method = serializers.CharField()
    alpha_original = serializers.FloatField()
    alpha_adjusted = serializers.FloatField()
    p_values_original = serializers.ListField(child=serializers.FloatField())
    p_values_adjusted = serializers.ListField(child=serializers.FloatField())
    rejected = serializers.ListField(child=serializers.BooleanField())
    n_significant = serializers.IntegerField()
    n_tests = serializers.IntegerField()
    family_wise_error_rate = serializers.FloatField()
    false_discovery_rate = serializers.FloatField(required=False)
    summary = serializers.CharField()


# Power Analysis Serializers


class PowerCalculationRequestSerializer(serializers.Serializer):
    """Serializer for power calculation requests"""

    test_type = serializers.ChoiceField(
        choices=["t-test", "anova", "correlation", "regression", "chi-square", "proportion", "means"]
    )
    effect_size = serializers.FloatField()
    sample_size = serializers.IntegerField(min_value=2, required=False)
    n_groups = serializers.IntegerField(min_value=2, default=2)
    alpha = serializers.FloatField(default=0.05, min_value=0.001, max_value=0.999)
    power = serializers.FloatField(min_value=0.01, max_value=0.999, required=False)
    alternative = serializers.ChoiceField(choices=["two-sided", "greater", "less"], default="two-sided")

    def validate(self, data):
        """Ensure either sample_size or power is provided"""
        if "sample_size" not in data and "power" not in data:
            raise serializers.ValidationError("Either sample_size or power must be provided")
        if "sample_size" in data and "power" in data:
            raise serializers.ValidationError("Provide either sample_size or power, not both")
        return data


class PowerAnalysisResultSerializer(serializers.Serializer):
    """Serializer for power analysis results"""

    power = serializers.FloatField(required=False)
    sample_size = serializers.IntegerField(required=False)
    effect_size = serializers.FloatField()
    alpha = serializers.FloatField()
    test_type = serializers.CharField()
    n_groups = serializers.IntegerField()
    critical_value = serializers.FloatField()
    noncentrality = serializers.FloatField()
    interpretation = serializers.CharField()
    power_curve = serializers.ListField(child=serializers.DictField(), required=False)
    recommendations = serializers.ListField(child=serializers.CharField())


# Effect Size Serializers


class EffectSizeCalculationRequestSerializer(serializers.Serializer):
    """Serializer for effect size calculation requests"""

    data_id = serializers.CharField(required=False)
    values = serializers.DictField(required=False)  # For direct data input
    test_type = serializers.ChoiceField(
        choices=[
            "cohens_d",
            "hedges_g",
            "glass_delta",
            "eta_squared",
            "partial_eta_squared",
            "omega_squared",
            "cohens_f",
            "cohens_f2",
            "cramers_v",
            "phi",
            "odds_ratio",
            "risk_ratio",
            "correlation_r",
        ]
    )
    groups = serializers.ListField(child=serializers.CharField(), required=False)
    confidence_level = serializers.FloatField(default=0.95)

    def validate(self, data):
        """Ensure either data_id or values is provided"""
        if "data_id" not in data and "values" not in data:
            raise serializers.ValidationError("Either data_id or values must be provided")
        return data


class EffectSizeResultSerializer(serializers.Serializer):
    """Serializer for effect size results"""

    effect_size_type = serializers.CharField()
    value = serializers.FloatField()
    confidence_interval = serializers.ListField(child=serializers.FloatField(), min_length=2, max_length=2)
    standard_error = serializers.FloatField()
    interpretation = serializers.CharField()
    magnitude = serializers.ChoiceField(choices=["trivial", "small", "medium", "large", "very_large"])
    sample_size = serializers.IntegerField()
    benchmarks = serializers.DictField()  # Domain-specific benchmarks


# Reproducibility Serializers


class BundleCreationRequestSerializer(serializers.Serializer):
    """Serializer for reproducibility bundle creation"""

    analysis_id = serializers.CharField(required=True)
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False)
    include_data = serializers.BooleanField(default=True)
    include_code = serializers.BooleanField(default=True)
    include_environment = serializers.BooleanField(default=True)
    include_results = serializers.BooleanField(default=True)
    compression = serializers.ChoiceField(choices=["none", "gzip", "zip"], default="gzip")


class BundleInfoSerializer(serializers.Serializer):
    """Serializer for bundle information"""

    bundle_id = serializers.CharField()
    fingerprint = serializers.CharField()
    created_at = serializers.DateTimeField()
    size_bytes = serializers.IntegerField()
    contents = serializers.DictField()
    download_url = serializers.URLField()
    validation_status = serializers.CharField()
    reproducibility_score = serializers.FloatField()


# Error Response Serializer


class ErrorResponseSerializer(serializers.Serializer):
    """Standard error response format"""

    error = serializers.CharField()
    detail = serializers.CharField(required=False)
    code = serializers.CharField(required=False)
    timestamp = serializers.DateTimeField()
    request_id = serializers.CharField(required=False)


# Bayesian Statistics Serializers


class BayesianTTestRequestSerializer(serializers.Serializer):
    """Serializer for Bayesian t-test requests"""

    test_type = serializers.ChoiceField(choices=["one_sample", "two_sample", "paired"], required=True)
    data = serializers.ListField(
        child=serializers.FloatField(), required=True, help_text="Data for one-sample test or first group/pre-test"
    )
    data2 = serializers.ListField(
        child=serializers.FloatField(),
        required=False,
        help_text="Second group for two-sample test or post-test for paired",
    )
    mu = serializers.FloatField(default=0, help_text="Null hypothesis value for one-sample test")
    prior_scale = serializers.CharField(
        default="medium", help_text="Prior scale: 'ultrawide', 'wide', 'medium', 'narrow', 'ultranarrow', or numeric"
    )
    rope_low = serializers.FloatField(default=-0.1, help_text="ROPE lower bound")
    rope_high = serializers.FloatField(default=0.1, help_text="ROPE upper bound")
    credible_mass = serializers.FloatField(default=0.95, min_value=0.5, max_value=0.99)
    robustness_check = serializers.BooleanField(default=True)


class BayesianAnovaRequestSerializer(serializers.Serializer):
    """Serializer for Bayesian ANOVA requests"""

    groups = serializers.ListField(
        child=serializers.ListField(child=serializers.FloatField()),
        min_length=2,
        help_text="List of groups, each containing numeric values",
    )
    group_names = serializers.ListField(
        child=serializers.CharField(), required=False, help_text="Optional names for groups"
    )
    prior_scale = serializers.CharField(default="medium")
    compute_pairwise = serializers.BooleanField(default=True)
    robustness_check = serializers.BooleanField(default=True)


class BayesianCorrelationRequestSerializer(serializers.Serializer):
    """Serializer for Bayesian correlation requests"""

    x = serializers.ListField(child=serializers.FloatField(), required=True)
    y = serializers.ListField(child=serializers.FloatField(), required=True)
    kappa = serializers.FloatField(
        default=1.0, min_value=0.1, max_value=10.0, help_text="Prior parameter (1=uniform, <1 concentrates near 0)"
    )
    credible_mass = serializers.FloatField(default=0.95, min_value=0.5, max_value=0.99)
    robustness_check = serializers.BooleanField(default=True)


class BayesFactorInterpretationSerializer(serializers.Serializer):
    """Serializer for Bayes Factor interpretation"""

    level = serializers.CharField()
    label = serializers.CharField()
    favors = serializers.ChoiceField(choices=["H1", "H0", "neither"])
    strength = serializers.CharField()
    color = serializers.CharField()


class ROPEAnalysisSerializer(serializers.Serializer):
    """Serializer for ROPE analysis results"""

    rope_low = serializers.FloatField()
    rope_high = serializers.FloatField()
    percentage_in_rope = serializers.FloatField()
    percentage_below_rope = serializers.FloatField()
    percentage_above_rope = serializers.FloatField()
    decision = serializers.CharField()
    decision_confidence = serializers.CharField()


class BayesianTTestResultSerializer(serializers.Serializer):
    """Serializer for Bayesian t-test results"""

    test_type = serializers.CharField()
    bf10 = serializers.FloatField()
    bf01 = serializers.FloatField()
    log_bf10 = serializers.FloatField()
    interpretation = BayesFactorInterpretationSerializer()
    posterior_probability_h1 = serializers.FloatField()
    posterior_probability_h0 = serializers.FloatField()
    effect_size = serializers.FloatField()
    effect_size_hdi = serializers.ListField(child=serializers.FloatField())
    prior_scale = serializers.FloatField()
    prior_description = serializers.CharField()
    posterior_median = serializers.FloatField()
    posterior_mean = serializers.FloatField()
    posterior_mode = serializers.FloatField()
    posterior_sd = serializers.FloatField()
    rope_analysis = ROPEAnalysisSerializer()
    frequentist_t = serializers.FloatField()
    frequentist_df = serializers.FloatField()
    frequentist_p = serializers.FloatField()
    n = serializers.IntegerField()
    n1 = serializers.IntegerField(allow_null=True)
    n2 = serializers.IntegerField(allow_null=True)
    posterior_x = serializers.ListField(child=serializers.FloatField())
    posterior_y = serializers.ListField(child=serializers.FloatField())
    prior_x = serializers.ListField(child=serializers.FloatField())
    prior_y = serializers.ListField(child=serializers.FloatField())
    robustness_check = serializers.DictField(allow_null=True)


class BayesianAnovaResultSerializer(serializers.Serializer):
    """Serializer for Bayesian ANOVA results"""

    bf10 = serializers.FloatField()
    bf01 = serializers.FloatField()
    log_bf10 = serializers.FloatField()
    interpretation = BayesFactorInterpretationSerializer()
    posterior_probability_h1 = serializers.FloatField()
    posterior_probability_h0 = serializers.FloatField()
    eta_squared = serializers.FloatField()
    omega_squared = serializers.FloatField()
    prior_scale = serializers.FloatField()
    group_means = serializers.ListField(child=serializers.FloatField())
    group_sds = serializers.ListField(child=serializers.FloatField())
    group_ns = serializers.ListField(child=serializers.IntegerField())
    grand_mean = serializers.FloatField()
    frequentist_f = serializers.FloatField()
    frequentist_df_between = serializers.IntegerField()
    frequentist_df_within = serializers.IntegerField()
    frequentist_p = serializers.FloatField()
    n_groups = serializers.IntegerField()
    n_total = serializers.IntegerField()
    pairwise_bf = serializers.DictField(allow_null=True)
    robustness_check = serializers.DictField(allow_null=True)


class BayesianCorrelationResultSerializer(serializers.Serializer):
    """Serializer for Bayesian correlation results"""

    r = serializers.FloatField()
    r_squared = serializers.FloatField()
    bf10 = serializers.FloatField()
    bf01 = serializers.FloatField()
    log_bf10 = serializers.FloatField()
    interpretation = BayesFactorInterpretationSerializer()
    posterior_probability_h1 = serializers.FloatField()
    posterior_probability_h0 = serializers.FloatField()
    posterior_median = serializers.FloatField()
    posterior_mean = serializers.FloatField()
    posterior_hdi = serializers.ListField(child=serializers.FloatField())
    credible_mass = serializers.FloatField()
    prior_kappa = serializers.FloatField()
    frequentist_t = serializers.FloatField()
    frequentist_df = serializers.IntegerField()
    frequentist_p = serializers.FloatField()
    n = serializers.IntegerField()
    posterior_x = serializers.ListField(child=serializers.FloatField())
    posterior_y = serializers.ListField(child=serializers.FloatField())
    prior_x = serializers.ListField(child=serializers.FloatField())
    prior_y = serializers.ListField(child=serializers.FloatField())
    robustness_check = serializers.DictField(allow_null=True)


# Pre-Registration Serializers


class HypothesisRequestSerializer(serializers.Serializer):
    """Serializer for hypothesis creation requests"""

    description = serializers.CharField(required=True)
    iv_name = serializers.CharField(required=True)
    iv_operationalization = serializers.CharField(required=True)
    iv_measurement = serializers.ChoiceField(choices=["nominal", "ordinal", "interval", "ratio"], required=True)
    iv_levels = serializers.ListField(child=serializers.CharField(), required=False)
    dv_name = serializers.CharField(required=True)
    dv_operationalization = serializers.CharField(required=True)
    dv_measurement = serializers.ChoiceField(choices=["nominal", "ordinal", "interval", "ratio"], required=True)
    direction = serializers.ChoiceField(choices=["greater", "less", "different", "equivalent"], default="different")
    hypothesis_type = serializers.ChoiceField(
        choices=["directional", "non_directional", "equivalence", "non_inferiority", "superiority"],
        default="non_directional",
    )
    effect_size = serializers.FloatField(required=False, allow_null=True)
    effect_size_type = serializers.CharField(required=False, allow_null=True)
    alpha = serializers.FloatField(default=0.05)
    rationale = serializers.CharField(required=False, allow_blank=True)


class SampleSizeJustificationRequestSerializer(serializers.Serializer):
    """Serializer for sample size justification requests"""

    target_n = serializers.IntegerField(required=True, min_value=1)
    strategy = serializers.ChoiceField(
        choices=[
            "power_analysis",
            "precision",
            "resource_constraints",
            "sequential",
            "rule_of_thumb",
            "replication",
            "bayesian_updating",
        ],
        required=True,
    )
    rationale = serializers.CharField(required=True)
    effect_size = serializers.FloatField(required=False, allow_null=True)
    effect_size_type = serializers.CharField(required=False, allow_null=True)
    alpha = serializers.FloatField(default=0.05)
    power = serializers.FloatField(default=0.80)
    test_type = serializers.CharField(default="t-test")
    effect_size_rationale = serializers.CharField(required=False, allow_blank=True)


class PreRegistrationRequestSerializer(serializers.Serializer):
    """Serializer for pre-registration creation requests"""

    template = serializers.ChoiceField(choices=["osf", "aspredicted", "jars"], default="osf")
    title = serializers.CharField(required=True, max_length=500)
    authors = serializers.ListField(child=serializers.CharField(), required=False)
    affiliations = serializers.ListField(child=serializers.CharField(), required=False)
    template_data = serializers.DictField(required=False)


class PreRegistrationExportRequestSerializer(serializers.Serializer):
    """Serializer for pre-registration export requests"""

    prereg_id = serializers.CharField(required=True)
    format = serializers.ChoiceField(choices=["markdown", "osf_json", "pdf_data"], default="markdown")


# P-Curve Analysis Serializers


class PCurveInputSerializer(serializers.Serializer):
    """Serializer for p-curve input"""

    studies = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="List of test statistic strings, e.g., ['t(24) = 2.45', 'F(2, 45) = 4.56']",
    )
    p_values = serializers.ListField(
        child=serializers.FloatField(min_value=0, max_value=1), required=False, help_text="Direct list of p-values"
    )
    detailed_inputs = serializers.ListField(
        child=serializers.DictField(), required=False, help_text="Detailed test specifications"
    )

    def validate(self, data):
        if not data.get("studies") and not data.get("p_values") and not data.get("detailed_inputs"):
            raise serializers.ValidationError("Must provide either 'studies', 'p_values', or 'detailed_inputs'")
        return data


class PCurveResultSerializer(serializers.Serializer):
    """Serializer for p-curve analysis results"""

    n_studies = serializers.IntegerField()
    n_significant = serializers.IntegerField()
    p_values = serializers.ListField(child=serializers.FloatField())
    right_skew_test = serializers.DictField()
    flat_test = serializers.DictField()
    half_test = serializers.DictField()
    has_evidential_value = serializers.BooleanField()
    inadequate_evidence = serializers.BooleanField()
    interpretation = serializers.CharField()
    estimated_power = serializers.FloatField(allow_null=True)
    power_ci = serializers.ListField(child=serializers.FloatField(), allow_null=True)
    histogram_bins = serializers.ListField(child=serializers.FloatField())
    histogram_counts = serializers.ListField(child=serializers.IntegerField())


class TestStatisticParseRequestSerializer(serializers.Serializer):
    """Serializer for parsing test statistics"""

    input_string = serializers.CharField(required=True)
    study_id = serializers.CharField(required=False, default="")
