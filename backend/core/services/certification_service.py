"""
Certification Program Service
==============================
Manages the "StickForStats Certified Analyst" certification program.
Tracks exam attempts, issues HMAC-signed certificates, and validates
credentials.

History (2026-05-06)
--------------------
The previous implementation kept the entire question bank in an
in-memory ``QUESTION_BANK`` dict (10 questions total across three
levels), reported "Prerequisites met" as a constant True, returned
the same five questions on every exam (no randomization), and
issued / verified certificates by string-prefix only --
``verify_certificate`` returned ``valid: True`` for any string
beginning with ``SFS-``, regardless of whether such a certificate had
ever actually been issued. See docs/CRITICAL_REVIEW_2026-05-06.md
§P1-12.

This rewrite moves all four flows to the DB-backed models in
``core.models``:

  * ``CertificationQuestion``  -- the active question bank (initial 10
                                  seeded by migration 0010, expandable)
  * ``CertificationExamAttempt`` -- one row per started exam, holding
                                    the question-id snapshot and the
                                    submitted answers
  * ``CertificationRecord``    -- one row per passed exam, with an
                                  HMAC-SHA256-signed certificate id

Certificates are signed with HMAC-SHA256 against either
``settings.CERT_SIGNING_KEY`` (preferred) or ``settings.SECRET_KEY``
(fallback). Verification recomputes the signature and checks the
record exists, has not been revoked, and has not expired.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import random
import secrets
import uuid
from datetime import timedelta
from typing import Dict, List, Optional

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


# Certification levels (configuration, not user data — kept in source).
CERTIFICATION_LEVELS = [
    {
        "id": "foundations",
        "name": "StickForStats Foundations",
        "description": "Core statistical concepts, data profiling, basic tests (t-test, ANOVA, chi-square)",
        "passing_score": 70,
        "time_limit_minutes": 60,
        "question_count": 40,
        "validity_years": 2,
        "prerequisites": [],
        "topics": [
            "Descriptive Statistics",
            "Normal Distribution",
            "Hypothesis Testing Fundamentals",
            "t-tests (Independent, Paired, One-Sample)",
            "Chi-Square Test",
            "Correlation (Pearson, Spearman)",
            "Data Types and Measurement Scales",
            "Using StickForStats Interface",
        ],
        "badge_color": "#4CAF50",
    },
    {
        "id": "practitioner",
        "name": "StickForStats Certified Practitioner",
        "description": "ANOVA, regression, non-parametric tests, Guardian system, assumption checking",
        "passing_score": 75,
        "time_limit_minutes": 90,
        "question_count": 50,
        "validity_years": 2,
        "prerequisites": ["foundations"],
        "topics": [
            "One-Way and Two-Way ANOVA",
            "Multiple Regression",
            "Logistic Regression",
            "Non-Parametric Tests (Mann-Whitney, Kruskal-Wallis, Wilcoxon)",
            "Guardian Statistical Protection System",
            "Statistical Assumptions and Validation",
            "Effect Size Interpretation",
            "Power Analysis",
            "Missing Data Handling",
        ],
        "badge_color": "#2196F3",
    },
    {
        "id": "expert",
        "name": "StickForStats Certified Expert",
        "description": "Advanced methods, SQS scoring, manuscript review, autonomous analysis",
        "passing_score": 80,
        "time_limit_minutes": 120,
        "question_count": 60,
        "validity_years": 3,
        "prerequisites": ["practitioner"],
        "topics": [
            "Factor Analysis and PCA",
            "Survival Analysis",
            "Mixed-Effects Models",
            "Meta-Analysis",
            "Bayesian Statistics",
            "Design of Experiments",
            "SQS Manuscript Quality Scoring",
            "Autonomous Analysis Pipeline",
            "Statistical Consulting Best Practices",
            "APA Reporting Standards",
        ],
        "badge_color": "#9C27B0",
    },
]


def _signing_key() -> bytes:
    """Return the HMAC signing key for certificates as bytes.

    Uses ``settings.CERT_SIGNING_KEY`` if defined (recommended in
    production so certificate signatures survive a Django SECRET_KEY
    rotation), otherwise falls back to ``settings.SECRET_KEY``.
    """
    key = getattr(settings, "CERT_SIGNING_KEY", None) or settings.SECRET_KEY
    return key.encode("utf-8") if isinstance(key, str) else bytes(key)


def _signature_payload(certificate_id: str, user_id, level: str, issued_iso: str) -> bytes:
    """Canonical bytes-to-sign for a certificate.

    Includes the certificate_id, user_id, level, and ISO-formatted
    issued_at timestamp. Order is fixed and pipe-delimited so that
    rearranging fields cannot produce a forgeable signature.
    """
    return f"{certificate_id}|{user_id}|{level}|{issued_iso}".encode("utf-8")


def _compute_signature(certificate_id: str, user_id, level: str, issued_iso: str) -> str:
    return hmac.new(
        _signing_key(),
        _signature_payload(certificate_id, user_id, level, issued_iso),
        hashlib.sha256,
    ).hexdigest()


def _generate_certificate_id(level_id: str) -> str:
    """Generate a fresh certificate ID with a level-prefixed namespace.

    Format: ``SFS-{LVL}-{12-char-hex}``. The hex is 48 random bits
    drawn from secrets.token_hex (cryptographically secure), so the
    namespace cannot be guessed by sequential enumeration.
    """
    rand = secrets.token_hex(6).upper()  # 12 hex chars
    prefix = level_id[:3].upper()
    return f"SFS-{prefix}-{rand}"


class CertificationService:
    """Manages certification exams, scoring, and credential issuance."""

    @classmethod
    def get_certification_levels(cls):
        """Return all available certification levels."""
        return CERTIFICATION_LEVELS

    @classmethod
    def get_level_details(cls, level_id):
        """Get details for a specific certification level."""
        for level in CERTIFICATION_LEVELS:
            if level["id"] == level_id:
                return level
        return None

    @classmethod
    def check_prerequisites(cls, user, level_id):
        """Check if user holds active prerequisite certifications.

        Was: returned ``met=True`` regardless of records. Now: queries
        ``CertificationRecord`` for unrevoked, unexpired records at
        each prerequisite level and only returns met=True if all are
        present.
        """
        level = cls.get_level_details(level_id)
        if not level:
            return {"met": False, "error": "Level not found"}

        prerequisites = level["prerequisites"]
        if not prerequisites:
            return {
                "met": True,
                "prerequisites": [],
                "message": "No prerequisites required for this level.",
            }

        if user is None or not getattr(user, "is_authenticated", False):
            return {
                "met": False,
                "prerequisites": prerequisites,
                "message": "Authenticated user required to check prerequisites.",
            }

        from core.models import CertificationRecord

        held = set(
            CertificationRecord.objects.filter(
                user=user,
                level__in=prerequisites,
                is_revoked=False,
                expires_at__gt=timezone.now(),
            ).values_list("level", flat=True)
        )
        missing = [p for p in prerequisites if p not in held]
        if missing:
            return {
                "met": False,
                "prerequisites": prerequisites,
                "missing": missing,
                "message": f"Missing or expired prerequisite certifications: {', '.join(missing)}.",
            }
        return {
            "met": True,
            "prerequisites": prerequisites,
            "message": "All prerequisites met.",
        }

    @classmethod
    def generate_exam(cls, level_id, user=None, seed: Optional[int] = None):
        """Generate a randomized exam for ``level_id``.

        Samples up to ``level["question_count"]`` active questions from
        the DB. Persists the question-id snapshot in a new
        ``CertificationExamAttempt`` row so the user sees the same
        questions on refresh and so we can grade against the snapshot
        even if the bank is edited between start and submit.
        """
        level = cls.get_level_details(level_id)
        if not level:
            return None

        from core.models import CertificationExamAttempt, CertificationQuestion

        active_qs = list(
            CertificationQuestion.objects.filter(level=level_id, is_active=True)
        )
        if not active_qs:
            logger.error("No active questions in DB for level %s", level_id)
            return None

        # Random sample without replacement up to question_count.
        rng = random.Random(seed) if seed is not None else random.Random()
        sample_size = min(level["question_count"], len(active_qs))
        sampled = rng.sample(active_qs, sample_size)
        question_ids = [str(q.id) for q in sampled]

        attempt = None
        if user is not None and getattr(user, "is_authenticated", False):
            attempt = CertificationExamAttempt.objects.create(
                user=user,
                level=level_id,
                question_ids=question_ids,
                status="in_progress",
            )

        return {
            "exam_id": str(attempt.id) if attempt else str(uuid.uuid4()),
            "attempt_id": str(attempt.id) if attempt else None,
            "level": level_id,
            "level_name": level["name"],
            "question_count": len(sampled),
            "time_limit_minutes": level["time_limit_minutes"],
            "passing_score": level["passing_score"],
            "questions": [
                {
                    "id": str(q.id),
                    "question": q.question_text,
                    "options": q.options,
                    "topic": q.topic,
                    # correct_index intentionally omitted from client payload.
                }
                for q in sampled
            ],
        }

    @classmethod
    def grade_exam(cls, level_id, answers, attempt_id=None, user=None):
        """Grade a submitted exam.

        Parameters
        ----------
        level_id
            One of ``foundations``/``practitioner``/``expert``.
        answers
            Dict ``{question_id: option_index}``.
        attempt_id
            Optional UUID of a ``CertificationExamAttempt``. If
            provided, grading uses the question-id snapshot stored on
            the attempt and refuses to grade an already-submitted
            attempt (replay protection). If not provided, grades
            against any active questions matching the supplied answer
            keys (legacy path; only used by tests).
        user
            Authenticated user. Required to issue a
            ``CertificationRecord`` on pass.
        """
        level = cls.get_level_details(level_id)
        if not level:
            return {"error": "Invalid level"}

        from core.models import (
            CertificationExamAttempt,
            CertificationQuestion,
            CertificationRecord,
        )

        attempt = None
        if attempt_id:
            try:
                attempt = CertificationExamAttempt.objects.get(id=attempt_id)
            except (CertificationExamAttempt.DoesNotExist, ValueError):
                return {"error": "Exam attempt not found"}
            if attempt.status != "in_progress":
                return {"error": f"Exam attempt already {attempt.status}; cannot regrade."}
            if user is not None and attempt.user_id != user.id:
                return {"error": "Exam attempt does not belong to this user"}
            question_ids = attempt.question_ids
        else:
            question_ids = list(answers.keys())

        if not question_ids:
            return {"error": "No questions to grade"}

        questions = list(
            CertificationQuestion.objects.filter(id__in=question_ids)
        )
        # Preserve the order from question_ids snapshot
        by_id = {str(q.id): q for q in questions}
        ordered = [by_id[qid] for qid in question_ids if qid in by_id]
        if not ordered:
            return {"error": "Questions in attempt no longer exist in the bank"}

        correct = 0
        total = len(ordered)
        results = []
        for q in ordered:
            user_answer = answers.get(str(q.id))
            try:
                user_answer_idx = int(user_answer) if user_answer is not None else None
            except (TypeError, ValueError):
                user_answer_idx = None
            is_correct = user_answer_idx == q.correct_index
            if is_correct:
                correct += 1
            results.append({
                "question_id": str(q.id),
                "correct": is_correct,
                "your_answer": user_answer_idx,
                "correct_answer": q.correct_index,
                "explanation": q.explanation,
                "topic": q.topic,
            })

        score = round((correct / total) * 100, 1)
        passed = score >= level["passing_score"]

        # Persist attempt
        if attempt is not None:
            attempt.answers = {str(qid): answers.get(str(qid)) for qid in question_ids}
            attempt.status = "submitted"
            attempt.submitted_at = timezone.now()
            attempt.score = score
            attempt.passed = passed
            attempt.save(update_fields=[
                "answers", "status", "submitted_at", "score", "passed"
            ])

        # Issue certificate on pass.
        certificate_id = None
        signature = None
        expires_at = None
        if passed and user is not None and getattr(user, "is_authenticated", False):
            issued = timezone.now()
            expires_at = issued + timedelta(days=365 * level["validity_years"])
            certificate_id = _generate_certificate_id(level_id)
            issued_iso = issued.isoformat()
            signature = _compute_signature(certificate_id, user.id, level_id, issued_iso)
            CertificationRecord.objects.create(
                user=user,
                level=level_id,
                certificate_id=certificate_id,
                signature=signature,
                score=score,
                issued_at=issued,
                expires_at=expires_at,
                attempt=attempt,
            )

        return {
            "score": score,
            "passing_score": level["passing_score"],
            "passed": passed,
            "correct": correct,
            "total": total,
            "certificate_id": certificate_id,
            "level": level_id,
            "level_name": level["name"],
            "validity_years": level["validity_years"] if passed else None,
            "expires_at": expires_at.isoformat() if expires_at else None,
            "results": results,
            "topic_breakdown": cls._topic_breakdown(results),
        }

    @classmethod
    def _topic_breakdown(cls, results):
        """Calculate score breakdown by topic."""
        topics: Dict[str, Dict[str, int]] = {}
        for r in results:
            topic = r["topic"]
            if topic not in topics:
                topics[topic] = {"correct": 0, "total": 0}
            topics[topic]["total"] += 1
            if r["correct"]:
                topics[topic]["correct"] += 1

        return [
            {
                "topic": topic,
                "correct": data["correct"],
                "total": data["total"],
                "percentage": round((data["correct"] / data["total"]) * 100, 1),
            }
            for topic, data in sorted(topics.items())
        ]

    @classmethod
    def verify_certificate(cls, certificate_id):
        """Verify a certificate by HMAC signature + DB lookup.

        The previous implementation returned ``valid: True`` for any
        string starting with ``SFS-``. Now performs:
          1. DB lookup of ``CertificationRecord`` by certificate_id.
          2. Recompute HMAC-SHA256 signature against the stored
             record's user_id + level + issued_at and compare with
             constant-time comparison.
          3. Reject revoked records.
          4. Reject expired records.

        Returns a structured dict including the user's holder name and
        level/issue/expiry info on success.
        """
        if not certificate_id or not isinstance(certificate_id, str):
            return {"valid": False, "error": "Invalid certificate format"}

        from core.models import CertificationRecord

        try:
            record = CertificationRecord.objects.select_related("user").get(
                certificate_id=certificate_id
            )
        except CertificationRecord.DoesNotExist:
            return {
                "valid": False,
                "certificate_id": certificate_id,
                "error": "Certificate not found",
            }

        expected_sig = _compute_signature(
            record.certificate_id,
            record.user_id,
            record.level,
            record.issued_at.isoformat(),
        )
        if not hmac.compare_digest(expected_sig, record.signature):
            logger.warning(
                "Certificate %s failed signature check (possible tampering)",
                certificate_id,
            )
            return {
                "valid": False,
                "certificate_id": certificate_id,
                "error": "Signature verification failed",
            }

        if record.is_revoked:
            return {
                "valid": False,
                "certificate_id": certificate_id,
                "error": "Certificate revoked",
                "revoked_at": record.revoked_at.isoformat() if record.revoked_at else None,
                "revocation_reason": record.revocation_reason,
            }

        if record.expires_at <= timezone.now():
            return {
                "valid": False,
                "certificate_id": certificate_id,
                "error": "Certificate expired",
                "expired_at": record.expires_at.isoformat(),
            }

        # Pull the level metadata for a friendly response.
        level_info = cls.get_level_details(record.level) or {}
        holder = record.user
        holder_name = (
            holder.get_full_name() or holder.get_username()
            if holder is not None
            else "Unknown holder"
        )

        return {
            "valid": True,
            "certificate_id": certificate_id,
            "level": record.level,
            "level_name": level_info.get("name", record.level),
            "holder": holder_name,
            "score": record.score,
            "issued_at": record.issued_at.isoformat(),
            "expires_at": record.expires_at.isoformat(),
        }

    @classmethod
    def revoke_certificate(cls, certificate_id, reason: str = ""):
        """Mark a certificate as revoked.

        Future verify_certificate calls on this certificate_id will
        return ``valid: False`` with the revocation reason.
        """
        from core.models import CertificationRecord

        try:
            record = CertificationRecord.objects.get(certificate_id=certificate_id)
        except CertificationRecord.DoesNotExist:
            return {"ok": False, "error": "Certificate not found"}
        if record.is_revoked:
            return {"ok": False, "error": "Already revoked"}
        record.is_revoked = True
        record.revoked_at = timezone.now()
        record.revocation_reason = reason or "(no reason given)"
        record.save(update_fields=["is_revoked", "revoked_at", "revocation_reason"])
        return {"ok": True, "certificate_id": certificate_id}

    @classmethod
    def get_user_certifications(cls, user) -> List[Dict]:
        """Return current user's active + expired + revoked records."""
        if user is None or not getattr(user, "is_authenticated", False):
            return []
        from core.models import CertificationRecord

        records = CertificationRecord.objects.filter(user=user).order_by("-issued_at")
        out = []
        for r in records:
            level_info = cls.get_level_details(r.level) or {}
            out.append({
                "certificate_id": r.certificate_id,
                "level": r.level,
                "level_name": level_info.get("name", r.level),
                "score": r.score,
                "issued_at": r.issued_at.isoformat(),
                "expires_at": r.expires_at.isoformat(),
                "is_revoked": r.is_revoked,
                "is_expired": r.expires_at <= timezone.now(),
                "is_currently_valid": r.is_currently_valid(),
            })
        return out

    @classmethod
    def get_user_exam_history(cls, user) -> List[Dict]:
        """Return current user's exam attempt history (most recent first)."""
        if user is None or not getattr(user, "is_authenticated", False):
            return []
        from core.models import CertificationExamAttempt

        attempts = CertificationExamAttempt.objects.filter(user=user).order_by("-started_at")
        out = []
        for a in attempts:
            out.append({
                "attempt_id": str(a.id),
                "level": a.level,
                "started_at": a.started_at.isoformat(),
                "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
                "status": a.status,
                "score": a.score,
                "passed": a.passed,
            })
        return out
