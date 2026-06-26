"""
Enterprise-Grade Database Models for StickForStats Core System
================================================================
Created: 2025-08-06 15:00:00 UTC
Author: StickForStats Development Team
Version: 1.0.0

This module defines the complete database architecture for the StickForStats platform,
designed to support both academic researchers and enterprise clients with:

- Scientific precision and reproducibility
- Enterprise-scale performance
- Complete audit trails
- Multi-tenant architecture
- GDPR/HIPAA compliance readiness

Integrity Level: ABSOLUTE
Scientific Rigor: MAXIMUM
Enterprise Grade: PRODUCTION-READY
"""

import hashlib
import hmac
import uuid

from django.conf import settings
from django.db import models
from django.db.models import JSONField  # Using Django's built-in JSONField
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


# Simplified model just to get the server running
class Analysis(models.Model):
    """
    Base model for all analyses performed in the system.
    Stores metadata and references to data, parameters, and results.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    analysis_type = models.CharField(max_length=100)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    parameters = JSONField(default=dict)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.analysis_type})"


# Note: Extended models (Dataset, Visualization, Workflow, etc.) are planned
# for future releases. See project roadmap for implementation timeline.

# Create Report as an alias to Analysis for compatibility
Report = Analysis


class AnalysisSession(models.Model):
    """Groups related analyses into a user session."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        "auth.User", on_delete=models.CASCADE, related_name="analysis_sessions", null=True, blank=True
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    analysis_type = models.CharField(max_length=100)
    status = models.CharField(
        max_length=20,
        default="active",
        choices=[("active", "Active"), ("completed", "Completed"), ("archived", "Archived")],
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.analysis_type})"


class AnalysisResult(models.Model):
    """Stores results from an analysis within a session."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    analysis_session = models.ForeignKey(AnalysisSession, on_delete=models.CASCADE, related_name="results")
    analysis_type = models.CharField(max_length=100)
    status = models.CharField(
        max_length=20,
        default="pending",
        choices=[("pending", "Pending"), ("running", "Running"), ("completed", "Completed"), ("failed", "Failed")],
    )
    result_data = JSONField(default=dict)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Result ({self.analysis_type}) - {self.status}"


class StatisticalAudit(models.Model):
    """
    Production-grade model for storing statistical audit data with full scientific integrity.
    Tracks all statistical analyses performed, their validation status, and methodology metrics.
    """

    # Primary identification
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session_id = models.CharField(max_length=100, blank=True, null=True)

    # Temporal tracking with timezone awareness
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    analysis_date = models.DateField(auto_now_add=True, db_index=True)

    # Test categorization
    test_type = models.CharField(max_length=100, db_index=True)
    test_category = models.CharField(max_length=100, blank=True, null=True)
    field = models.CharField(max_length=100, db_index=True)
    subfield = models.CharField(max_length=100, blank=True, null=True)

    # Data characteristics
    sample_size = models.IntegerField(validators=[MinValueValidator(1)], null=True)
    data_dimensions = JSONField(default=dict, blank=True)  # {rows: n, cols: m, groups: k}
    data_type = models.CharField(max_length=50, blank=True)  # continuous, categorical, mixed

    # Statistical validation metrics
    assumptions_checked = models.IntegerField(default=0)
    assumptions_passed = models.IntegerField(default=0)
    assumptions_failed = models.IntegerField(default=0)
    assumptions_details = JSONField(default=dict, blank=True)

    # Methodology scoring (0-100 scale with 2 decimal precision)
    methodology_score = models.DecimalField(
        max_digits=5, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(100)], null=True, blank=True
    )
    reproducibility_score = models.DecimalField(
        max_digits=5, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(100)], null=True, blank=True
    )

    # Violations and recommendations
    violations_detected = models.IntegerField(default=0)
    violation_details = JSONField(default=list, blank=True)
    alternatives_recommended = models.IntegerField(default=0)
    recommendations = JSONField(default=list, blank=True)

    # Test results with 50-decimal precision storage
    test_statistic = models.CharField(max_length=100, blank=True)  # Store as string for precision
    p_value = models.CharField(max_length=100, blank=True)  # Store as string for precision
    effect_size = models.CharField(max_length=100, blank=True)  # Store as string for precision
    confidence_level = models.DecimalField(max_digits=5, decimal_places=4, default=0.95)
    confidence_interval = JSONField(default=dict, blank=True)  # {lower: str, upper: str}

    # Power analysis
    statistical_power = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    minimum_detectable_effect = models.CharField(max_length=100, blank=True)

    # Guardian system integration
    guardian_score = models.DecimalField(
        max_digits=5, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(100)], null=True, blank=True
    )
    guardian_flags = JSONField(default=list, blank=True)

    # Publication metadata
    journal_name = models.CharField(max_length=255, blank=True, null=True)
    doi = models.CharField(max_length=100, blank=True, null=True)
    publication_year = models.IntegerField(null=True, blank=True)

    # User and source tracking
    user_id = models.CharField(max_length=100, blank=True, null=True)
    source_ip = models.GenericIPAddressField(blank=True, null=True)
    client_type = models.CharField(max_length=50, blank=True)  # web, api, cli

    # Computation metrics
    computation_time_ms = models.IntegerField(null=True, blank=True)
    memory_usage_mb = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Complete analysis snapshot
    full_analysis_data = JSONField(default=dict, blank=True)

    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=[("pending", "Pending"), ("completed", "Completed"), ("failed", "Failed"), ("validated", "Validated")],
        default="pending",
    )

    # Error handling
    error_message = models.TextField(blank=True, null=True)
    warnings = JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["-timestamp", "field"]),
            models.Index(fields=["test_type", "field"]),
            models.Index(fields=["analysis_date", "status"]),
        ]
        verbose_name = "Statistical Audit"
        verbose_name_plural = "Statistical Audits"

    def __str__(self):
        return f"{self.test_type} - {self.field} ({self.timestamp.strftime('%Y-%m-%d %H:%M')})"

    def calculate_integrity_score(self):
        """Calculate overall integrity score based on multiple factors"""
        scores = []
        if self.methodology_score is not None:
            scores.append(float(self.methodology_score))
        if self.reproducibility_score is not None:
            scores.append(float(self.reproducibility_score))
        if self.guardian_score is not None:
            scores.append(float(self.guardian_score))

        if self.assumptions_checked > 0:
            assumption_score = (self.assumptions_passed / self.assumptions_checked) * 100
            scores.append(assumption_score)

        return sum(scores) / len(scores) if scores else 0

    def save(self, *args, **kwargs):
        # Calculate derived scores before saving
        if self.assumptions_checked > 0 and self.assumptions_passed is not None:
            self.assumptions_failed = self.assumptions_checked - self.assumptions_passed

        super().save(*args, **kwargs)


class AuditSummary(models.Model):
    """
    Aggregated audit summary for dashboard display.
    Updated periodically from StatisticalAudit records.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Time period
    period_start = models.DateTimeField(db_index=True)
    period_end = models.DateTimeField(db_index=True)
    period_type = models.CharField(
        max_length=20,
        choices=[
            ("hour", "Hourly"),
            ("day", "Daily"),
            ("week", "Weekly"),
            ("month", "Monthly"),
            ("quarter", "Quarterly"),
            ("year", "Yearly"),
        ],
    )

    # Aggregated metrics
    total_analyses = models.IntegerField(default=0)
    total_assumptions_checked = models.IntegerField(default=0)
    total_violations_detected = models.IntegerField(default=0)
    total_alternatives_recommended = models.IntegerField(default=0)

    # Average scores
    avg_methodology_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    avg_reproducibility_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    avg_guardian_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    # Breakdown by field
    field_breakdown = JSONField(default=dict, blank=True)

    # Breakdown by test type
    test_type_breakdown = JSONField(default=dict, blank=True)

    # Trend data
    trend_data = JSONField(default=dict, blank=True)

    # Cache timestamp
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-period_end"]
        unique_together = [["period_start", "period_end", "period_type"]]
        indexes = [
            models.Index(fields=["-period_end", "period_type"]),
        ]

    def __str__(self):
        return f"Audit Summary {self.period_type} ({self.period_start.date()} to {self.period_end.date()})"


# =============================================================================
# JOURNAL INTEGRATION MODELS (Pillar 2 — Automated Manuscript Review)
# =============================================================================


class Journal(models.Model):
    """
    Represents a journal that integrates with StickForStats for automated
    statistical quality review of manuscript submissions.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    publisher = models.CharField(max_length=255, blank=True)
    issn = models.CharField(max_length=20, blank=True)
    eissn = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)

    # Research field for discipline-aware scoring
    field = models.CharField(
        max_length=100,
        default="general",
        choices=[
            ("general", "General"),
            ("psychology", "Psychology"),
            ("medicine", "Medicine"),
            ("economics", "Economics"),
            ("education", "Education"),
            ("biology", "Biology"),
            ("social_science", "Social Science"),
            ("clinical_trials", "Clinical Trials"),
        ],
    )

    # Review configuration
    review_config = JSONField(
        default=dict,
        blank=True,
        help_text=(
            "Journal-specific review settings: "
            '{"min_sqs_score": 60, "require_effect_sizes": true, '
            '"require_power_analysis": false, "severity_threshold": "major"}'
        ),
    )

    # Webhook for async report delivery
    webhook_url = models.URLField(blank=True, help_text="URL for report delivery callbacks")
    webhook_secret = models.CharField(max_length=255, blank=True)

    # Contact
    contact_email = models.EmailField(blank=True)
    contact_name = models.CharField(max_length=255, blank=True)

    # Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Journal"
        verbose_name_plural = "Journals"

    def __str__(self):
        return f"{self.name} ({self.field})"


class JournalAPIKey(models.Model):
    """API key for machine-to-machine journal authentication."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    journal = models.ForeignKey(Journal, on_delete=models.CASCADE, related_name="api_keys")
    key_prefix = models.CharField(max_length=8, help_text="First 8 chars for identification")
    key_hash = models.CharField(max_length=128, help_text="SHA-256 hash of full key")
    name = models.CharField(max_length=100, help_text="Descriptive name for this key")

    # Permissions
    can_submit = models.BooleanField(default=True)
    can_batch_submit = models.BooleanField(default=False)
    can_view_analytics = models.BooleanField(default=False)

    # Rate limiting
    rate_limit_per_hour = models.IntegerField(default=60)
    rate_limit_per_day = models.IntegerField(default=500)

    # Status
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Journal API Key"
        verbose_name_plural = "Journal API Keys"

    def __str__(self):
        return f"{self.journal.name} — {self.name} ({self.key_prefix}...)"

    @classmethod
    def generate_key(cls):
        """Generate a new API key. Returns (raw_key, key_prefix, key_hash)."""
        raw_key = f"sfs_{uuid.uuid4().hex}{uuid.uuid4().hex[:16]}"
        key_prefix = raw_key[:8]
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        return raw_key, key_prefix, key_hash

    def verify_key(self, raw_key: str) -> bool:
        """Verify a raw API key against stored hash (timing-safe)."""
        computed = hashlib.sha256(raw_key.encode()).hexdigest()
        return hmac.compare_digest(computed, self.key_hash)


class ManuscriptSubmission(models.Model):
    """
    A manuscript submitted for statistical quality review.
    Tracks the full lifecycle from submission through analysis to report delivery.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    journal = models.ForeignKey(
        Journal,
        on_delete=models.CASCADE,
        related_name="submissions",
        null=True,
        blank=True,
        help_text="Journal that submitted this (null for direct uploads)",
    )

    # Manuscript identification
    manuscript_id = models.CharField(max_length=100, blank=True, help_text="Journal's internal manuscript ID")
    title = models.CharField(max_length=500, blank=True)
    authors = JSONField(default=list, blank=True)
    abstract = models.TextField(blank=True)

    # File tracking
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(
        max_length=10,
        choices=[
            ("pdf", "PDF"),
            ("tex", "LaTeX"),
            ("docx", "DOCX"),
            ("txt", "Plain Text"),
        ],
    )
    file_size_bytes = models.IntegerField(default=0)
    file_hash = models.CharField(max_length=128, blank=True, help_text="SHA-256 of uploaded file")
    word_count = models.IntegerField(null=True, blank=True)

    # Processing status
    status = models.CharField(
        max_length=20,
        default="pending",
        choices=[
            ("pending", "Pending"),
            ("parsing", "Parsing"),
            ("analyzing", "Analyzing"),
            ("completed", "Completed"),
            ("failed", "Failed"),
        ],
        db_index=True,
    )

    # Analysis results (stored for quick access)
    sqs_score = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    sqs_grade = models.CharField(max_length=5, blank=True)
    claims_found = models.IntegerField(default=0)
    claims_consistent = models.IntegerField(default=0)
    claims_inconsistent = models.IntegerField(default=0)
    consistency_rate = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    decision_errors = models.IntegerField(default=0)
    gross_errors = models.IntegerField(default=0)

    # Full analysis data
    parse_result = JSONField(default=dict, blank=True)
    claim_data = JSONField(default=dict, blank=True)
    consistency_data = JSONField(default=dict, blank=True)
    sqs_data = JSONField(default=dict, blank=True)

    # Processing metadata
    processing_time_ms = models.IntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    warnings = JSONField(default=list, blank=True)

    # Report access control: an unguessable per-submission share token.
    # We store only the SHA-256 hash; the raw token is returned once at
    # submission time and is required to retrieve the report afterwards.
    # This closes the IDOR where any caller who knew/guessed a submission
    # UUID could read the full review (audit 2026-05-31, SEC-3 / IDOR).
    report_token_hash = models.CharField(
        max_length=128,
        blank=True,
        default="",
        db_index=True,
        help_text="SHA-256 of the report share token (raw token never stored)",
    )

    # Timestamps
    submitted_at = models.DateTimeField(default=timezone.now, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-submitted_at"]
        indexes = [
            models.Index(fields=["-submitted_at", "status"]),
            models.Index(fields=["journal", "-submitted_at"]),
            models.Index(fields=["manuscript_id"]),
        ]
        verbose_name = "Manuscript Submission"
        verbose_name_plural = "Manuscript Submissions"

    def __str__(self):
        title = self.title[:50] if self.title else self.file_name
        return f"{title} ({self.status})"

    @staticmethod
    def hash_report_token(raw_token: str) -> str:
        """SHA-256 of a raw report token (same scheme as JournalAPIKey)."""
        return hashlib.sha256((raw_token or "").encode()).hexdigest()

    def set_report_token(self) -> str:
        """Generate a fresh report share token, store its hash, return the RAW token.

        The raw token is returned to the submitter once and never persisted.
        """
        import secrets

        raw_token = secrets.token_urlsafe(32)
        self.report_token_hash = self.hash_report_token(raw_token)
        return raw_token

    def verify_report_token(self, raw_token: str) -> bool:
        """Timing-safe check of a supplied raw report token against the stored hash."""
        if not self.report_token_hash:
            return False
        computed = self.hash_report_token(raw_token or "")
        return hmac.compare_digest(computed, self.report_token_hash)


class ReproducibilityReceipt(models.Model):
    """A signed, independently-verifiable provenance receipt.

    v1 attests a MANUSCRIPT verification result: it binds the uploaded
    paper's SHA-256 (``subject_hash``, copied from the submission's
    ``file_hash``) to the verdict StickForStats produced (SQS, claims,
    consistency), stamps it with a server-issued UTC timestamp + the code
    versions that produced it, and RS256-signs a canonical hash of the
    whole body. Anyone can re-verify the signature offline against the
    public key at the receipt JWKS endpoint — no trust in StickForStats
    required (see core/crypto/receipt_signing.py).

    The machinery is deliberately type-agnostic (``receipt_type``) so an
    ANALYSIS-run receipt (data fingerprint + Guardian assumptions tested)
    can be issued through the same model + endpoints as a fast follow.

    ``receipt_json`` stores the exact body that was signed; verification
    recomputes its canonical hash and checks the detached ``signature``.
    """

    SCHEMA_VERSION = "sfs-receipt/1.0"

    RECEIPT_TYPES = [
        ("manuscript", "Manuscript verification"),
        ("analysis", "Analysis run"),
    ]

    receipt_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    schema_version = models.CharField(max_length=32, default=SCHEMA_VERSION)
    receipt_type = models.CharField(
        max_length=20, choices=RECEIPT_TYPES, default="manuscript", db_index=True
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reproducibility_receipts",
    )
    submission = models.ForeignKey(
        "ManuscriptSubmission",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="receipts",
    )
    title = models.CharField(max_length=500, blank=True)

    subject_hash = models.CharField(
        max_length=128,
        db_index=True,
        help_text="SHA-256 of the artifact attested (paper file_hash / dataset fingerprint)",
    )
    canonical_payload_hash = models.CharField(
        max_length=128, help_text="SHA-256 of the canonical JSON body that was signed"
    )
    sig_alg = models.CharField(max_length=16, default="RS256")
    key_id = models.CharField(max_length=128, blank=True)
    signature = models.TextField(help_text="base64 detached RS256 signature over the canonical body bytes")

    receipt_json = JSONField(default=dict, help_text="The exact canonical receipt body that was signed")

    issued_at = models.DateTimeField(default=timezone.now, db_index=True)
    is_revoked = models.BooleanField(default=False)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_reason = models.CharField(max_length=255, blank=True)

    # Download/share token: store only the SHA-256 hash; the raw token is
    # returned once at issue time and is required to download the signed
    # artifact. (Public verification needs no token.)
    report_token_hash = models.CharField(
        max_length=128,
        blank=True,
        default="",
        db_index=True,
        help_text="SHA-256 of the receipt download token (raw token never stored)",
    )

    class Meta:
        ordering = ["-issued_at"]
        indexes = [
            models.Index(fields=["-issued_at", "receipt_type"]),
            models.Index(fields=["subject_hash"]),
        ]
        verbose_name = "Reproducibility Receipt"
        verbose_name_plural = "Reproducibility Receipts"

    def __str__(self):
        return f"Receipt {self.receipt_id} ({self.receipt_type}, {self.issued_at:%Y-%m-%d})"

    @staticmethod
    def hash_token(raw_token: str) -> str:
        """SHA-256 of a raw download token (same scheme as ManuscriptSubmission)."""
        return hashlib.sha256((raw_token or "").encode()).hexdigest()

    def set_token(self) -> str:
        """Generate a fresh download token, store its hash, return the RAW token."""
        import secrets

        raw_token = secrets.token_urlsafe(32)
        self.report_token_hash = self.hash_token(raw_token)
        return raw_token

    def verify_token(self, raw_token: str) -> bool:
        """Timing-safe check of a supplied raw download token against the stored hash."""
        if not self.report_token_hash:
            return False
        return hmac.compare_digest(self.hash_token(raw_token or ""), self.report_token_hash)


class ReviewReport(models.Model):
    """
    Generated review report for a manuscript submission.
    Three tiers: editor (decision-support), reviewer (detailed), author (constructive).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission = models.ForeignKey(ManuscriptSubmission, on_delete=models.CASCADE, related_name="reports")

    # Report tier
    report_type = models.CharField(
        max_length=20,
        choices=[
            ("editor", "Editor Report"),
            ("reviewer", "Reviewer Report"),
            ("author", "Author Report"),
        ],
    )

    # Report content (structured)
    summary = models.TextField(help_text="Executive summary of findings")
    overall_assessment = models.CharField(
        max_length=20,
        choices=[
            ("pass", "Pass — No significant issues"),
            ("minor_issues", "Minor Issues — Requires minor revisions"),
            ("major_issues", "Major Issues — Requires major revisions"),
            ("critical", "Critical — Fundamental statistical concerns"),
        ],
    )

    # Structured findings
    findings = JSONField(
        default=list,
        help_text=(
            'List of findings: [{"severity": "major", "category": "consistency", '
            '"title": "...", "description": "...", "evidence": "...", "recommendation": "..."}]'
        ),
    )
    positive_findings = JSONField(default=list, help_text="Good practices identified")

    # Scores
    sqs_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    consistency_score = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)

    # Structured sections for different report tiers
    methodology_assessment = models.TextField(blank=True)
    statistical_claims_review = models.TextField(blank=True)
    reporting_quality = models.TextField(blank=True)
    recommendations = JSONField(default=list)

    # Delivery tracking
    delivered = models.BooleanField(default=False)
    delivered_at = models.DateTimeField(null=True, blank=True)
    delivery_method = models.CharField(
        max_length=20,
        blank=True,
        choices=[
            ("api", "API Response"),
            ("webhook", "Webhook"),
            ("email", "Email"),
        ],
    )

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]
        unique_together = [["submission", "report_type"]]
        verbose_name = "Review Report"
        verbose_name_plural = "Review Reports"

    def __str__(self):
        return f"{self.report_type} report — {self.submission}"


# =============================================================================
# PLATFORM MODELS (Pillar 3 — Universal Platform)
# =============================================================================


class SubscriptionTier(models.Model):
    """
    Defines a subscription tier with usage limits and feature flags.
    Seeded with Free, Pro, Enterprise tiers.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)  # Free, Pro, Enterprise
    slug = models.SlugField(max_length=50, unique=True)
    display_name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    # Pricing
    price_monthly_cents = models.IntegerField(default=0, help_text="Monthly price in cents (0=free)")
    price_yearly_cents = models.IntegerField(default=0, help_text="Yearly price in cents (discount)")
    stripe_price_id_monthly = models.CharField(max_length=100, blank=True)
    stripe_price_id_yearly = models.CharField(max_length=100, blank=True)

    # Usage limits
    max_analyses_per_month = models.IntegerField(default=100)
    max_upload_size_mb = models.IntegerField(default=10)
    max_projects = models.IntegerField(default=5)
    max_team_members = models.IntegerField(default=1)
    max_api_keys = models.IntegerField(default=1)
    max_stored_datasets = models.IntegerField(default=10)

    # Feature flags
    features = JSONField(
        default=dict,
        blank=True,
        help_text=(
            '{"guardian": true, "autonomous": true, "manuscript_review": false, '
            '"ai_advisor": false, "export_pdf": true, "priority_support": false, '
            '"sso": false, "rbac": false, "audit_log": false, "api_access": false, '
            '"custom_branding": false, "dedicated_support": false}'
        ),
    )

    # Ordering
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False, help_text="Default tier for new orgs")

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order"]
        verbose_name = "Subscription Tier"
        verbose_name_plural = "Subscription Tiers"

    def __str__(self):
        price = f"${self.price_monthly_cents / 100:.0f}/mo" if self.price_monthly_cents else "Free"
        return f"{self.display_name} ({price})"

    def has_feature(self, feature_name: str) -> bool:
        return self.features.get(feature_name, False)


class Organization(models.Model):
    """
    Multi-tenant organization. All usage, billing, and team management
    is scoped to an organization.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    # Subscription
    tier = models.ForeignKey(
        SubscriptionTier, on_delete=models.PROTECT, related_name="organizations", null=True, blank=True
    )
    stripe_customer_id = models.CharField(max_length=100, blank=True)
    stripe_subscription_id = models.CharField(max_length=100, blank=True)
    subscription_status = models.CharField(
        max_length=20,
        default="active",
        choices=[
            ("active", "Active"),
            ("trialing", "Trialing"),
            ("past_due", "Past Due"),
            ("canceled", "Canceled"),
            ("unpaid", "Unpaid"),
        ],
    )
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)

    # Settings
    settings = JSONField(
        default=dict,
        blank=True,
        help_text=(
            '{"default_alpha": 0.05, "default_field": "general", '
            '"require_guardian": true, "allow_expert_mode": false}'
        ),
    )

    # Branding (Enterprise)
    logo_url = models.URLField(blank=True)
    primary_color = models.CharField(max_length=7, blank=True, help_text="Hex color e.g. #1976d2")

    # Contact
    contact_email = models.EmailField(blank=True)
    website = models.URLField(blank=True)

    # Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Organization"
        verbose_name_plural = "Organizations"

    def __str__(self):
        tier_name = self.tier.display_name if self.tier else "No tier"
        return f"{self.name} ({tier_name})"

    def get_usage_this_month(self):
        """Get total API usage for the current billing month."""
        now = timezone.now()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return self.usage_records.filter(timestamp__gte=start_of_month).count()

    def is_within_limits(self):
        """Check if organization is within its tier usage limits."""
        if not self.tier:
            return True  # No tier = no limits (shouldn't happen in production)
        return self.get_usage_this_month() < self.tier.max_analyses_per_month


class OrganizationMembership(models.Model):
    """Links users to organizations with role-based access."""

    ROLE_CHOICES = [
        ("owner", "Owner"),
        ("admin", "Admin"),
        ("member", "Member"),
        ("viewer", "Viewer"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey("auth.User", on_delete=models.CASCADE, related_name="org_memberships")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="member")

    # Invitation tracking
    invited_by = models.ForeignKey(
        "auth.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="sent_invitations"
    )
    invitation_email = models.EmailField(blank=True)
    invitation_accepted = models.BooleanField(default=True)
    invitation_token = models.CharField(max_length=64, blank=True)

    # Status
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = [["organization", "user"]]
        ordering = ["role", "joined_at"]
        verbose_name = "Organization Membership"
        verbose_name_plural = "Organization Memberships"

    def __str__(self):
        return f"{self.user.username} @ {self.organization.name} ({self.role})"

    def can_manage_members(self):
        return self.role in ("owner", "admin")

    def can_manage_billing(self):
        return self.role == "owner"

    def can_create_api_keys(self):
        return self.role in ("owner", "admin")


class PlatformAPIKey(models.Model):
    """
    API key for programmatic access to the platform, scoped to an organization.
    Separate from JournalAPIKey which is for journal M2M auth.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="api_keys")
    created_by = models.ForeignKey("auth.User", on_delete=models.SET_NULL, null=True, blank=True)

    name = models.CharField(max_length=100, help_text="Descriptive name for this key")
    key_prefix = models.CharField(max_length=8, help_text="First 8 chars for identification")
    key_hash = models.CharField(max_length=128, help_text="SHA-256 hash of full key")

    # Permissions
    scopes = JSONField(
        default=list,
        blank=True,
        help_text=(
            '["stats:read", "stats:write", "autonomous:read", "autonomous:write", '
            '"manuscript:read", "manuscript:write", "platform:read"]'
        ),
    )

    # Rate limiting
    rate_limit_per_minute = models.IntegerField(default=60)
    rate_limit_per_day = models.IntegerField(default=10000)

    # Status
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    last_used_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Platform API Key"
        verbose_name_plural = "Platform API Keys"

    def __str__(self):
        return f"{self.organization.name} — {self.name} ({self.key_prefix}...)"

    @classmethod
    def generate_key(cls):
        """Generate a new platform API key. Returns (raw_key, key_prefix, key_hash)."""
        raw_key = f"sk_sfs_{uuid.uuid4().hex}{uuid.uuid4().hex[:16]}"
        key_prefix = raw_key[:8]
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        return raw_key, key_prefix, key_hash

    def verify_key(self, raw_key: str) -> bool:
        """Verify a raw API key against stored hash (timing-safe)."""
        computed = hashlib.sha256(raw_key.encode()).hexdigest()
        return hmac.compare_digest(computed, self.key_hash)

    def is_expired(self):
        if self.expires_at is None:
            return False
        return timezone.now() > self.expires_at

    def has_scope(self, scope: str) -> bool:
        """Check if this key has a specific scope permission."""
        if not self.scopes:
            return True  # Empty scopes = all access
        return scope in self.scopes


class UsageRecord(models.Model):
    """
    Tracks every API call for metering, billing, and analytics.
    High-volume table — uses integer PK for performance.
    """

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="usage_records", null=True, blank=True
    )
    user = models.ForeignKey(
        "auth.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="usage_records"
    )
    api_key = models.ForeignKey(
        PlatformAPIKey, on_delete=models.SET_NULL, null=True, blank=True, related_name="usage_records"
    )

    # Request details
    endpoint = models.CharField(max_length=255, db_index=True)
    method = models.CharField(max_length=10)  # GET, POST, PUT, DELETE
    endpoint_category = models.CharField(
        max_length=50, blank=True, db_index=True, help_text="stats, power, autonomous, manuscript, platform, etc."
    )

    # Response details
    status_code = models.IntegerField()
    response_time_ms = models.IntegerField(null=True, blank=True)
    response_size_bytes = models.IntegerField(null=True, blank=True)

    # Client info
    client_type = models.CharField(
        max_length=20,
        blank=True,
        choices=[
            ("web", "Web App"),
            ("sdk_python", "Python SDK"),
            ("sdk_r", "R SDK"),
            ("cli", "CLI"),
            ("api", "Direct API"),
            ("journal", "Journal Integration"),
        ],
    )
    client_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)

    # Billing
    is_billable = models.BooleanField(default=True)
    credits_consumed = models.IntegerField(default=1)

    # Timestamp
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["organization", "-timestamp"]),
            models.Index(fields=["organization", "endpoint_category", "-timestamp"]),
            models.Index(fields=["-timestamp", "status_code"]),
        ]
        verbose_name = "Usage Record"
        verbose_name_plural = "Usage Records"

    def __str__(self):
        org_name = self.organization.name if self.organization else "anonymous"
        return f"{self.method} {self.endpoint} ({org_name}) — {self.status_code}"


# =============================================================================
# GDPR COMPLIANCE MODELS (v2.0 — Privacy & Data Subject Rights)
# =============================================================================


class ConsentRecord(models.Model):
    """GDPR consent tracking for data processing activities."""

    CONSENT_TYPES = [
        ("analytics", "Usage Analytics"),
        ("data_processing", "Statistical Data Processing"),
        ("email_notifications", "Email Notifications"),
        ("third_party_sharing", "Third-Party Data Sharing"),
        ("cookies", "Cookie Consent"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="consent_records")
    consent_type = models.CharField(max_length=50, choices=CONSENT_TYPES)
    granted = models.BooleanField(default=False)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.CharField(max_length=500, blank=True)
    granted_at = models.DateTimeField(default=timezone.now)
    revoked_at = models.DateTimeField(blank=True, null=True)
    version = models.CharField(max_length=20, default="1.0", help_text="Privacy policy version when consent was given")

    class Meta:
        verbose_name = "Consent Record"
        verbose_name_plural = "Consent Records"
        ordering = ["-granted_at"]
        unique_together = [("user", "consent_type")]

    def __str__(self):
        status = "granted" if self.granted else "revoked"
        return f"{self.user.username} - {self.consent_type} ({status})"


class Project(models.Model):
    """A workspace for organizing analyses within an organization."""

    VISIBILITY_CHOICES = [
        ("private", "Private"),
        ("team", "Team"),
        ("public", "Public"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("Organization", on_delete=models.CASCADE, related_name="projects")
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100)
    description = models.TextField(blank=True)
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default="team")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_projects"
    )
    settings = models.JSONField(default=dict, blank=True)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Project"
        verbose_name_plural = "Projects"
        ordering = ["-updated_at"]
        unique_together = [("organization", "slug")]

    def __str__(self):
        return f"{self.organization.name}/{self.name}"


class Plugin(models.Model):
    """Marketplace plugin — custom tests, SQS rule packs, visualization templates."""

    PLUGIN_TYPES = [
        ("statistical_test", "Statistical Test"),
        ("sqs_rule_pack", "SQS Rule Pack"),
        ("visualization", "Visualization Template"),
        ("data_connector", "Data Connector"),
        ("report_template", "Report Template"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=100, unique=True)
    plugin_type = models.CharField(max_length=30, choices=PLUGIN_TYPES)
    description = models.TextField()
    version = models.CharField(max_length=20, default="1.0.0")
    author_name = models.CharField(max_length=200)
    author_email = models.EmailField(blank=True)
    homepage_url = models.URLField(blank=True)
    repository_url = models.URLField(blank=True)
    icon_url = models.URLField(blank=True)
    config_schema = models.JSONField(default=dict, blank=True, help_text="JSON Schema for plugin configuration")
    entry_point = models.JSONField(default=dict, help_text="Plugin entry point definition")
    dependencies = models.JSONField(default=list, blank=True)
    is_official = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True)
    downloads = models.PositiveIntegerField(default=0)
    rating_sum = models.PositiveIntegerField(default=0)
    rating_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-downloads"]
        verbose_name = "Plugin"

    def __str__(self):
        return f"{self.name} v{self.version}"

    @property
    def average_rating(self):
        if self.rating_count == 0:
            return 0
        return round(self.rating_sum / self.rating_count, 1)


class PluginInstallation(models.Model):
    """Tracks which plugins are installed per organization."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plugin = models.ForeignKey(Plugin, on_delete=models.CASCADE, related_name="installations")
    organization = models.ForeignKey("Organization", on_delete=models.CASCADE, related_name="installed_plugins")
    installed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    config = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    installed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ("plugin", "organization")
        ordering = ["-installed_at"]

    def __str__(self):
        return f"{self.organization.name} → {self.plugin.name}"


class PluginReview(models.Model):
    """User reviews for plugins."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plugin = models.ForeignKey(Plugin, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField()  # 1-5
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ("plugin", "user")
        ordering = ["-created_at"]


class SiteLicense(models.Model):
    """Institutional / university site license.

    Replaces the in-memory stub in
    ``backend/core/services/site_license_service.py`` --- which
    accepted any ``SFS-INST-`` prefixed string as valid, returned
    zeros for usage stats, and never persisted licenses to the DB.
    See docs/CRITICAL_REVIEW_2026-05-06.md §P1-12.
    """

    TIER_CHOICES = [
        ("department", "Department"),
        ("school", "School/College"),
        ("university", "University-Wide"),
    ]
    STATUS_CHOICES = [
        ("active", "Active"),
        ("suspended", "Suspended"),
        ("expired", "Expired"),
        ("cancelled", "Cancelled"),
    ]
    VERIFICATION_METHOD_CHOICES = [
        ("email_domain", "Email Domain"),
        ("ip_range", "IP Range"),
        ("saml_sso", "SAML SSO"),
        ("manual", "Manual"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    license_key = models.CharField(max_length=64, unique=True, db_index=True)
    institution_name = models.CharField(max_length=256)
    tier = models.CharField(max_length=32, choices=TIER_CHOICES, db_index=True)
    admin_email = models.EmailField()
    domain = models.CharField(max_length=255)
    verification_method = models.CharField(
        max_length=32,
        choices=VERIFICATION_METHOD_CHOICES,
        default="email_domain",
    )
    # Tier-derived limits (cached at create time so historical limits
    # survive a tier-config change).
    max_users = models.IntegerField()  # -1 means unlimited
    max_analyses_per_month = models.IntegerField()  # -1 means unlimited
    features = models.JSONField(default=list)  # list of feature flags
    price_yearly = models.IntegerField(default=0)
    duration_years = models.PositiveSmallIntegerField(default=1)
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField()
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="active", db_index=True)
    created_at = models.DateTimeField(default=timezone.now)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Site License"
        verbose_name_plural = "Site Licenses"
        indexes = [models.Index(fields=["domain"])]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.license_key} ({self.institution_name}, {self.tier})"

    def is_currently_active(self) -> bool:
        if self.status != "active":
            return False
        return self.end_date > timezone.now()


class SiteLicenseUsageRecord(models.Model):
    """A single platform-usage event attributed to a site license.

    Aggregated by ``SiteLicenseService.get_license_usage`` and
    ``generate_usage_report``. Each row corresponds to one analysis
    run, manuscript review, or other tracked feature use under the
    license.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    license = models.ForeignKey(
        SiteLicense,
        on_delete=models.CASCADE,
        related_name="usage_records",
    )
    user_email = models.EmailField(db_index=True)
    feature = models.CharField(max_length=64, db_index=True)
    analysis_type = models.CharField(max_length=64, blank=True)
    occurred_at = models.DateTimeField(default=timezone.now, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-occurred_at"]
        verbose_name = "Site License Usage Record"
        verbose_name_plural = "Site License Usage Records"
        indexes = [
            models.Index(fields=["license", "occurred_at"]),
            models.Index(fields=["license", "feature"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.license_id} {self.feature} {self.occurred_at}"


class CertificationQuestion(models.Model):
    """A question in the certification exam bank.

    Replaces the previous in-memory ``QUESTION_BANK`` dict in
    ``certification_service.py`` --- which had 10 hardcoded questions
    total and could not be expanded without editing source. The DB-
    backed bank lets operators add / retire questions without code
    changes and supports randomized exam generation.

    See docs/CRITICAL_REVIEW_2026-05-06.md §P1-12 (certification stub).
    """

    LEVEL_CHOICES = [
        ("foundations", "Foundations"),
        ("practitioner", "Practitioner"),
        ("expert", "Expert"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    level = models.CharField(max_length=32, choices=LEVEL_CHOICES, db_index=True)
    question_text = models.TextField()
    options = models.JSONField(default=list)  # list of strings
    correct_index = models.PositiveSmallIntegerField()
    explanation = models.TextField(blank=True)
    topic = models.CharField(max_length=128, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["level", "topic", "id"]
        verbose_name = "Certification Question"
        verbose_name_plural = "Certification Questions"

    def __str__(self) -> str:  # pragma: no cover
        return f"[{self.level}] {self.topic}: {self.question_text[:60]}..."


class CertificationExamAttempt(models.Model):
    """A user's attempt at a certification exam.

    Each call to ``ExamStartView`` creates an attempt with a fixed
    snapshot of question UUIDs (so the user sees the same questions
    on refresh) and an empty ``answers`` dict. Submitting via
    ``ExamSubmitView`` populates ``answers``, computes score, and
    stamps ``submitted_at`` so the same attempt cannot be re-submitted.
    """

    STATUS_CHOICES = [
        ("in_progress", "In Progress"),
        ("submitted", "Submitted"),
        ("expired", "Expired"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cert_attempts"
    )
    level = models.CharField(max_length=32, choices=CertificationQuestion.LEVEL_CHOICES, db_index=True)
    question_ids = models.JSONField(default=list)  # list of question UUIDs (str form)
    answers = models.JSONField(default=dict, blank=True)  # {question_id: option_index}
    started_at = models.DateTimeField(default=timezone.now)
    submitted_at = models.DateTimeField(null=True, blank=True)
    score = models.FloatField(null=True, blank=True)
    passed = models.BooleanField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="in_progress", db_index=True)

    class Meta:
        ordering = ["-started_at"]
        indexes = [models.Index(fields=["user", "level"])]
        verbose_name = "Certification Exam Attempt"
        verbose_name_plural = "Certification Exam Attempts"

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.user_id} {self.level} {self.status} score={self.score}"


class CertificationRecord(models.Model):
    """A persistent record of a passed certification exam.

    Each row corresponds to a successfully-completed exam and carries
    an HMAC-SHA256-signed ``certificate_id`` (signature stored
    separately so the verify endpoint can check it without trusting
    the prefix). See ``CertificationService.verify_certificate`` --
    previously that method returned ``valid: True`` for any string
    starting with ``SFS-``, regardless of whether the certificate had
    actually been issued. This model + the signing helpers fix that.

    See docs/CRITICAL_REVIEW_2026-05-06.md §P1-12.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cert_records"
    )
    level = models.CharField(max_length=32, choices=CertificationQuestion.LEVEL_CHOICES, db_index=True)
    certificate_id = models.CharField(max_length=64, unique=True, db_index=True)
    signature = models.CharField(max_length=128)  # hex of HMAC-SHA256
    score = models.FloatField()
    issued_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    attempt = models.ForeignKey(
        "CertificationExamAttempt",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="records",
    )
    is_revoked = models.BooleanField(default=False, db_index=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revocation_reason = models.CharField(max_length=256, blank=True)

    class Meta:
        ordering = ["-issued_at"]
        indexes = [
            models.Index(fields=["user", "level"]),
            models.Index(fields=["expires_at"]),
        ]
        verbose_name = "Certification Record"
        verbose_name_plural = "Certification Records"

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.certificate_id} ({self.level}, {self.user_id})"

    def is_currently_valid(self) -> bool:
        """True iff the record is not revoked and not expired."""
        if self.is_revoked:
            return False
        return self.expires_at > timezone.now()


class LTINonceUsed(models.Model):
    """Replay-attack protection for LTI 1.3 launches.

    Each LTI launch JWT carries a ``nonce`` claim that the platform
    expects us to record so we can reject the same JWT being
    re-submitted (within its ``exp`` window) by an attacker. We index
    by ``(issuer, nonce)`` because nonces are only required to be
    unique per issuer.

    Rows expire at ``expires_at`` (mirroring the JWT ``exp`` claim);
    the periodic ``cleanup_expired_lti_nonces`` Celery task deletes
    them, since the JWT could no longer be replayed by then anyway.

    See docs/CRITICAL_REVIEW_2026-05-06.md §P0-2.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    issuer = models.CharField(max_length=512, db_index=True)
    nonce = models.CharField(max_length=512)
    used_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        unique_together = ("issuer", "nonce")
        indexes = [
            models.Index(fields=["expires_at"]),
        ]
        verbose_name = "LTI Nonce (used)"
        verbose_name_plural = "LTI Nonces (used)"

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.issuer[:40]} -> {self.nonce[:16]}..."


# =====================================================================
# Manuscript Verification (Pillar 2 — raw-data re-analysis surface)
# =====================================================================
#
# These persist the output of the verification-core pipeline
# (core/manuscript/verify_pipeline.verify_manuscript): per-claim verdicts
# produced by RE-RUNNING the authors' tests on their raw data through the
# Guardian/cascade engine. This is distinct from ManuscriptSubmission, which
# stores the no-raw-data, statcheck-style internal-consistency review (the
# always-available fallback). "Shared engine, separate surface" — see
# docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md and TODO item T10-SCHEMA.


class VerificationRun(models.Model):
    """A single raw-data verification run over one manuscript.

    Stores the paper-level VerificationProfile plus per-claim verdicts
    (``ClaimVerdictRecord``) and any linked datasets (``LinkedDataset``).
    Access to the stored result is gated by an unguessable share token whose
    SHA-256 hash alone is persisted, mirroring ``ManuscriptSubmission``'s IDOR
    protection (audit 2026-05-31, SEC-3).
    """

    VERDICT_CHOICES = [
        ("VERIFIED", "Verified"),
        ("DISCREPANT", "Discrepant"),
        ("ASSUMPTION_VIOLATED", "Assumption violated"),
        ("ASSUMPTION_UNREPORTED", "Assumption unreported"),
        ("INSUFFICIENT_DATA", "Insufficient data"),
        ("UNVERIFIABLE_EXTRACTION", "Unverifiable extraction"),
        ("INCONSISTENT_REPORTING", "Inconsistent reporting"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Source manuscript identification
    title = models.CharField(max_length=500, blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    file_hash = models.CharField(max_length=128, blank=True, help_text="SHA-256 of the uploaded manuscript")

    status = models.CharField(
        max_length=20,
        default="completed",
        choices=[
            ("pending", "Pending"),
            ("completed", "Completed"),
            ("failed", "Failed"),
        ],
        db_index=True,
    )

    # Paper-level VerificationProfile (verify_pipeline.VerificationProfile)
    n_claims = models.IntegerField(default=0)
    verifiability_rate = models.FloatField(
        null=True,
        blank=True,
        help_text="fraction of claims actually attempted (VERIFIED + DISCREPANT + ASSUMPTION_VIOLATED)",
    )
    coverage = models.FloatField(
        null=True, blank=True, help_text="extraction coverage (claims_with_p / candidate p-mentions)"
    )
    low_coverage = models.BooleanField(default=False)
    n_inconsistent_reporting = models.IntegerField(default=0, help_text="secondary statcheck signal count")
    verdict_distribution = JSONField(default=dict, blank=True)
    certify_note = models.TextField(blank=True)

    # Full archival payload (VerificationProfile.to_dict())
    profile_data = JSONField(default=dict, blank=True)

    # What, if anything, we verified against
    data_source = models.CharField(
        max_length=255,
        blank=True,
        default="none",
        help_text="e.g. 'none', 'uploaded_table', 'geo:GSE271517'",
    )

    # Report access control (IDOR; only the SHA-256 hash is stored)
    report_token_hash = models.CharField(
        max_length=128,
        blank=True,
        default="",
        db_index=True,
        help_text="SHA-256 of the report share token (raw token never stored)",
    )

    processing_time_ms = models.IntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    warnings = JSONField(default=list, blank=True)

    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at", "status"]),
        ]
        verbose_name = "Verification Run"
        verbose_name_plural = "Verification Runs"

    def __str__(self):
        label = self.title[:50] if self.title else (self.file_name or str(self.id))
        return f"{label} ({self.n_claims} claims, {self.status})"

    @staticmethod
    def hash_report_token(raw_token: str) -> str:
        """SHA-256 of a raw report token (same scheme as ManuscriptSubmission)."""
        return hashlib.sha256((raw_token or "").encode()).hexdigest()

    def set_report_token(self) -> str:
        """Generate a fresh report share token, store its hash, return the RAW token.

        The raw token is returned to the caller once and never persisted.
        """
        import secrets

        raw_token = secrets.token_urlsafe(32)
        self.report_token_hash = self.hash_report_token(raw_token)
        return raw_token

    def verify_report_token(self, raw_token: str) -> bool:
        """Timing-safe check of a supplied raw report token against the stored hash."""
        if not self.report_token_hash:
            return False
        return hmac.compare_digest(self.hash_report_token(raw_token or ""), self.report_token_hash)


class ClaimVerdictRecord(models.Model):
    """One per-claim verdict within a ``VerificationRun`` (verdicts.ClaimVerdict).

    A few hot fields are denormalized into indexed columns (verdict, test_name,
    claimed/recomputed statistic + p) so the Phase-B corpus census can query at
    scale; the complete ``ClaimVerdict.to_dict()`` is kept in ``detail`` for
    full transparency.
    """

    run = models.ForeignKey(VerificationRun, on_delete=models.CASCADE, related_name="claim_verdicts")
    claim_id = models.CharField(max_length=32)
    verdict = models.CharField(max_length=32, choices=VerificationRun.VERDICT_CHOICES, db_index=True)

    claim_text = models.TextField(blank=True)
    test_name = models.CharField(max_length=64, blank=True)

    claimed_statistic = models.FloatField(null=True, blank=True)
    claimed_p_value = models.FloatField(null=True, blank=True)
    recomputed_statistic = models.FloatField(null=True, blank=True)
    recomputed_p_value = models.FloatField(null=True, blank=True)

    data_available = models.BooleanField(default=False)
    assumptions_satisfied = models.BooleanField(null=True, blank=True)

    # Character offset of the claim in the source text. (Page-number provenance is deferred to
    # TODO item T07-PROVENANCE, which threads a char-offset->page map through the parser; until
    # then we persist only `position`, which the engine actually populates.)
    position = models.IntegerField(null=True, blank=True)

    # Full ClaimVerdict.to_dict() for transparency / re-rendering
    detail = JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["run", "claim_id"]
        indexes = [
            models.Index(fields=["run", "verdict"]),
        ]
        verbose_name = "Claim Verdict Record"
        verbose_name_plural = "Claim Verdict Records"

    def __str__(self):
        return f"{self.claim_id}: {self.verdict}"


class LinkedDataset(models.Model):
    """A dataset linked to (or fetched for) a ``VerificationRun`` (plan T10/T21).

    Records the provenance of the data used to verify claims — an uploaded
    table, or a public-repository accession that was fetched — and whether
    linking succeeded. Never stores the raw data itself, only what was used.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.ForeignKey(VerificationRun, on_delete=models.CASCADE, related_name="datasets")

    source_type = models.CharField(
        max_length=32,
        default="uploaded",
        choices=[
            ("uploaded", "Uploaded table"),
            ("geo", "GEO"),
            ("dryad", "Dryad"),
            ("zenodo", "Zenodo"),
            ("figshare", "figshare"),
            ("osf", "OSF"),
            ("other", "Other"),
        ],
    )
    accession = models.CharField(max_length=128, blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    n_rows = models.IntegerField(null=True, blank=True)
    n_cols = models.IntegerField(null=True, blank=True)
    link_status = models.CharField(
        max_length=20,
        default="linked",
        choices=[
            ("linked", "Linked"),
            ("ambiguous", "Ambiguous"),
            ("unlinkable", "Unlinkable"),
            ("fetched", "Fetched"),
            ("fetch_failed", "Fetch failed"),
        ],
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["run", "created_at"]
        verbose_name = "Linked Dataset"
        verbose_name_plural = "Linked Datasets"

    def __str__(self):
        return f"{self.source_type}:{self.accession or self.file_name} ({self.link_status})"


__all__ = [
    "Analysis",
    "Report",
    "AnalysisSession",
    "AnalysisResult",
    "StatisticalAudit",
    "AuditSummary",
    "Journal",
    "JournalAPIKey",
    "ManuscriptSubmission",
    "ReviewReport",
    "SubscriptionTier",
    "Organization",
    "OrganizationMembership",
    "PlatformAPIKey",
    "UsageRecord",
    "ConsentRecord",
    "Project",
    "Plugin",
    "PluginInstallation",
    "PluginReview",
    "CertificationQuestion",
    "CertificationExamAttempt",
    "CertificationRecord",
    "SiteLicense",
    "SiteLicenseUsageRecord",
    "LTINonceUsed",
    "VerificationRun",
    "ClaimVerdictRecord",
    "LinkedDataset",
]
