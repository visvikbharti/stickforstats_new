"""
DB-backed certification service contracts.

The previous in-memory implementation:
  * had 10 hardcoded questions across three levels
  * always returned ``met: True`` from ``check_prerequisites``
  * returned the same questions on every exam (no randomization)
  * issued / verified certificates by string-prefix only --
    ``verify_certificate("SFS-anything")`` returned ``valid: True``

These tests pin the new contracts (CertificationQuestion bank,
CertificationExamAttempt, CertificationRecord with HMAC-SHA256
signature). See docs/CRITICAL_REVIEW_2026-05-06.md §P1-12 and
WORK_PLAN P3.4-P3.9.
"""

from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from core.models import (
    CertificationExamAttempt,
    CertificationQuestion,
    CertificationRecord,
)
from core.services.certification_service import (
    CertificationService,
    _compute_signature,
)

User = get_user_model()


def _make_user(username="cert_user"):
    return User.objects.create_user(username, f"{username}@test", "pw")


class TestQuestionBankSeeded(TestCase):
    """Migration 0010 seeded the initial question bank."""

    def test_foundations_has_seeded_questions(self):
        qs = CertificationQuestion.objects.filter(level="foundations", is_active=True)
        self.assertGreaterEqual(qs.count(), 5)

    def test_practitioner_has_seeded_questions(self):
        qs = CertificationQuestion.objects.filter(level="practitioner", is_active=True)
        self.assertGreaterEqual(qs.count(), 3)

    def test_expert_has_seeded_questions(self):
        qs = CertificationQuestion.objects.filter(level="expert", is_active=True)
        self.assertGreaterEqual(qs.count(), 2)

    def test_question_options_are_lists_and_correct_index_in_range(self):
        for q in CertificationQuestion.objects.all():
            self.assertIsInstance(q.options, list)
            self.assertGreater(len(q.options), 0)
            self.assertGreaterEqual(q.correct_index, 0)
            self.assertLess(q.correct_index, len(q.options))


class TestCheckPrerequisites(TestCase):

    def setUp(self):
        self.user = _make_user("prereq_user")

    def test_foundations_has_no_prereqs(self):
        result = CertificationService.check_prerequisites(self.user, "foundations")
        self.assertTrue(result["met"])
        self.assertEqual(result["prerequisites"], [])

    def test_practitioner_requires_foundations(self):
        result = CertificationService.check_prerequisites(self.user, "practitioner")
        self.assertFalse(result["met"])
        self.assertIn("foundations", result.get("missing", []))

    def test_expert_requires_practitioner(self):
        result = CertificationService.check_prerequisites(self.user, "expert")
        self.assertFalse(result["met"])
        self.assertIn("practitioner", result.get("missing", []))

    def test_practitioner_met_when_active_foundations_record_exists(self):
        issued = timezone.now() - timedelta(days=30)
        CertificationRecord.objects.create(
            user=self.user,
            level="foundations",
            certificate_id="SFS-FOU-AAAAAAAAAAAA",
            signature="x" * 64,
            score=80.0,
            issued_at=issued,
            expires_at=issued + timedelta(days=365 * 2),
        )
        result = CertificationService.check_prerequisites(self.user, "practitioner")
        self.assertTrue(result["met"])

    def test_expired_prereq_record_does_not_count(self):
        issued = timezone.now() - timedelta(days=365 * 5)
        CertificationRecord.objects.create(
            user=self.user,
            level="foundations",
            certificate_id="SFS-FOU-EXPIREDAAAAAA",
            signature="y" * 64,
            score=80.0,
            issued_at=issued,
            expires_at=issued + timedelta(days=365 * 2),  # expired 1 year ago
        )
        result = CertificationService.check_prerequisites(self.user, "practitioner")
        self.assertFalse(result["met"])

    def test_revoked_prereq_record_does_not_count(self):
        issued = timezone.now() - timedelta(days=30)
        CertificationRecord.objects.create(
            user=self.user,
            level="foundations",
            certificate_id="SFS-FOU-REVOKEDAAAAAA",
            signature="z" * 64,
            score=80.0,
            issued_at=issued,
            expires_at=issued + timedelta(days=365 * 2),
            is_revoked=True,
            revoked_at=timezone.now(),
        )
        result = CertificationService.check_prerequisites(self.user, "practitioner")
        self.assertFalse(result["met"])

    def test_unknown_level_returns_error(self):
        result = CertificationService.check_prerequisites(self.user, "phantom")
        self.assertFalse(result["met"])


class TestExamGeneration(TestCase):

    def setUp(self):
        self.user = _make_user("exam_user")

    def test_exam_for_foundations_returns_questions(self):
        exam = CertificationService.generate_exam("foundations", user=self.user)
        self.assertIsNotNone(exam)
        self.assertEqual(exam["level"], "foundations")
        self.assertGreater(exam["question_count"], 0)
        self.assertEqual(len(exam["questions"]), exam["question_count"])

    def test_exam_creates_attempt_row(self):
        exam = CertificationService.generate_exam("foundations", user=self.user)
        attempt_id = exam["attempt_id"]
        self.assertIsNotNone(attempt_id)
        attempt = CertificationExamAttempt.objects.get(id=attempt_id)
        self.assertEqual(attempt.user_id, self.user.id)
        self.assertEqual(attempt.level, "foundations")
        self.assertEqual(attempt.status, "in_progress")
        self.assertEqual(len(attempt.question_ids), exam["question_count"])

    def test_exam_questions_omit_correct_index(self):
        exam = CertificationService.generate_exam("foundations", user=self.user)
        for q in exam["questions"]:
            self.assertNotIn("correct", q)
            self.assertNotIn("correct_index", q)

    def test_seeded_rng_produces_stable_question_set(self):
        # Add extra questions so sampling is non-trivial.
        for i in range(5):
            CertificationQuestion.objects.create(
                level="foundations",
                question_text=f"extra Q{i}",
                options=["a", "b", "c", "d"],
                correct_index=0,
                topic="extras",
                is_active=True,
            )
        a = CertificationService.generate_exam("foundations", user=self.user, seed=12345)
        b = CertificationService.generate_exam("foundations", user=self.user, seed=12345)
        # Same seed → same question_id set (order may differ).
        self.assertEqual(
            sorted(q["id"] for q in a["questions"]),
            sorted(q["id"] for q in b["questions"]),
        )

    def test_unknown_level_returns_none(self):
        self.assertIsNone(CertificationService.generate_exam("phantom", user=self.user))


class TestExamGrading(TestCase):

    def setUp(self):
        self.user = _make_user("grade_user")
        # Generate an exam to get a real attempt_id.
        self.exam = CertificationService.generate_exam("foundations", user=self.user)
        self.attempt_id = self.exam["attempt_id"]
        self.questions = self.exam["questions"]

    def _all_correct_answers(self):
        # Look up correct_index for each sampled question.
        ids = [q["id"] for q in self.questions]
        bank = {str(q.id): q.correct_index for q in CertificationQuestion.objects.filter(id__in=ids)}
        return {qid: bank[qid] for qid in ids}

    def _all_wrong_answers(self):
        ids = [q["id"] for q in self.questions]
        bank = {str(q.id): (q.correct_index + 1) % len(q.options) for q in CertificationQuestion.objects.filter(id__in=ids)}
        return {qid: bank[qid] for qid in ids}

    def test_perfect_score_passes(self):
        result = CertificationService.grade_exam(
            "foundations",
            self._all_correct_answers(),
            attempt_id=self.attempt_id,
            user=self.user,
        )
        self.assertTrue(result["passed"])
        self.assertEqual(result["score"], 100.0)
        self.assertIsNotNone(result["certificate_id"])
        self.assertTrue(result["certificate_id"].startswith("SFS-FOU-"))

    def test_zero_score_fails(self):
        result = CertificationService.grade_exam(
            "foundations",
            self._all_wrong_answers(),
            attempt_id=self.attempt_id,
            user=self.user,
        )
        self.assertFalse(result["passed"])
        self.assertEqual(result["score"], 0.0)
        self.assertIsNone(result["certificate_id"])

    def test_passing_creates_certification_record(self):
        result = CertificationService.grade_exam(
            "foundations",
            self._all_correct_answers(),
            attempt_id=self.attempt_id,
            user=self.user,
        )
        self.assertTrue(result["passed"])
        self.assertEqual(
            CertificationRecord.objects.filter(
                user=self.user, certificate_id=result["certificate_id"]
            ).count(),
            1,
        )

    def test_attempt_marked_submitted(self):
        CertificationService.grade_exam(
            "foundations",
            self._all_correct_answers(),
            attempt_id=self.attempt_id,
            user=self.user,
        )
        attempt = CertificationExamAttempt.objects.get(id=self.attempt_id)
        self.assertEqual(attempt.status, "submitted")
        self.assertIsNotNone(attempt.submitted_at)
        self.assertEqual(attempt.score, 100.0)

    def test_replay_submission_rejected(self):
        # First submission OK.
        CertificationService.grade_exam(
            "foundations",
            self._all_correct_answers(),
            attempt_id=self.attempt_id,
            user=self.user,
        )
        # Second submission must fail.
        result2 = CertificationService.grade_exam(
            "foundations",
            self._all_correct_answers(),
            attempt_id=self.attempt_id,
            user=self.user,
        )
        self.assertIn("error", result2)
        self.assertIn("already", result2["error"].lower())

    def test_attempt_belongs_to_other_user_rejected(self):
        other = _make_user("other_user")
        result = CertificationService.grade_exam(
            "foundations",
            self._all_correct_answers(),
            attempt_id=self.attempt_id,
            user=other,
        )
        self.assertIn("error", result)

    def test_invalid_attempt_id_rejected(self):
        result = CertificationService.grade_exam(
            "foundations",
            self._all_correct_answers(),
            attempt_id="00000000-0000-0000-0000-000000000000",
            user=self.user,
        )
        self.assertIn("error", result)


class TestCertificateVerification(TestCase):

    def setUp(self):
        self.user = _make_user("verify_user")
        self.exam = CertificationService.generate_exam("foundations", user=self.user)
        # Pass it.
        ids = [q["id"] for q in self.exam["questions"]]
        bank = {
            str(q.id): q.correct_index
            for q in CertificationQuestion.objects.filter(id__in=ids)
        }
        result = CertificationService.grade_exam(
            "foundations",
            bank,
            attempt_id=self.exam["attempt_id"],
            user=self.user,
        )
        self.cert_id = result["certificate_id"]

    def test_real_certificate_verifies(self):
        result = CertificationService.verify_certificate(self.cert_id)
        self.assertTrue(result["valid"])
        self.assertEqual(result["certificate_id"], self.cert_id)
        self.assertEqual(result["level"], "foundations")
        self.assertIn("issued_at", result)
        self.assertIn("expires_at", result)

    def test_unknown_sfs_prefixed_id_no_longer_validates(self):
        """Old bug: ANY string starting with SFS- returned valid=True."""
        result = CertificationService.verify_certificate("SFS-PHANTOM-AAAAAAAAAAAA")
        self.assertFalse(result["valid"])

    def test_random_string_rejected(self):
        result = CertificationService.verify_certificate("not-a-cert-id")
        self.assertFalse(result["valid"])

    def test_empty_or_none_rejected(self):
        self.assertFalse(CertificationService.verify_certificate("")["valid"])
        self.assertFalse(CertificationService.verify_certificate(None)["valid"])

    def test_tampered_signature_rejected(self):
        record = CertificationRecord.objects.get(certificate_id=self.cert_id)
        # Replace the signature with garbage.
        record.signature = "0" * 64
        record.save(update_fields=["signature"])
        result = CertificationService.verify_certificate(self.cert_id)
        self.assertFalse(result["valid"])
        self.assertIn("signature", result["error"].lower())

    def test_revoked_certificate_rejected(self):
        revoke = CertificationService.revoke_certificate(self.cert_id, reason="audit")
        self.assertTrue(revoke["ok"])
        result = CertificationService.verify_certificate(self.cert_id)
        self.assertFalse(result["valid"])
        self.assertIn("revoked", result["error"].lower())

    def test_expired_certificate_rejected(self):
        record = CertificationRecord.objects.get(certificate_id=self.cert_id)
        record.expires_at = timezone.now() - timedelta(days=1)
        record.save(update_fields=["expires_at"])
        result = CertificationService.verify_certificate(self.cert_id)
        self.assertFalse(result["valid"])
        self.assertIn("expired", result["error"].lower())

    def test_signature_uses_distinct_payload_per_record(self):
        """Two certs for the same user but different levels must have
        different signatures (even with same signing key)."""
        # Stub another record for the same user but different level.
        issued = timezone.now()
        cert_b = "SFS-PRA-FFFFFFFFFFFF"
        sig_b = _compute_signature(cert_b, self.user.id, "practitioner", issued.isoformat())
        record_a = CertificationRecord.objects.get(certificate_id=self.cert_id)
        self.assertNotEqual(sig_b, record_a.signature)


class TestUserCertificationsListing(TestCase):

    def setUp(self):
        self.user = _make_user("listing_user")

    def test_empty_lists_when_no_records(self):
        certs = CertificationService.get_user_certifications(self.user)
        attempts = CertificationService.get_user_exam_history(self.user)
        self.assertEqual(certs, [])
        self.assertEqual(attempts, [])

    def test_listing_after_passing_exam(self):
        exam = CertificationService.generate_exam("foundations", user=self.user)
        ids = [q["id"] for q in exam["questions"]]
        bank = {
            str(q.id): q.correct_index
            for q in CertificationQuestion.objects.filter(id__in=ids)
        }
        CertificationService.grade_exam(
            "foundations", bank, attempt_id=exam["attempt_id"], user=self.user
        )
        certs = CertificationService.get_user_certifications(self.user)
        self.assertEqual(len(certs), 1)
        self.assertEqual(certs[0]["level"], "foundations")
        self.assertTrue(certs[0]["is_currently_valid"])
        attempts = CertificationService.get_user_exam_history(self.user)
        self.assertEqual(len(attempts), 1)
        self.assertEqual(attempts[0]["status"], "submitted")
        self.assertTrue(attempts[0]["passed"])


@override_settings(SECURE_SSL_REDIRECT=False)
class TestCertificationViewsEndToEnd(TestCase):
    """Smoke-test the REST surface end-to-end."""

    def setUp(self):
        self.user = _make_user("view_user")
        from rest_framework.test import APIClient
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_levels_endpoint(self):
        resp = self.client.get("/api/v1/certification/levels/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data["levels"]), 3)

    def test_exam_start_then_submit_then_verify(self):
        # 1. Start exam
        start = self.client.post(
            "/api/v1/certification/exam/start/",
            {"level_id": "foundations"},
            format="json",
        )
        self.assertEqual(start.status_code, 200, start.content)
        exam = start.json()
        attempt_id = exam["attempt_id"]
        ids = [q["id"] for q in exam["questions"]]

        # 2. Look up correct answers and submit
        bank = {
            str(q.id): q.correct_index
            for q in CertificationQuestion.objects.filter(id__in=ids)
        }
        submit = self.client.post(
            "/api/v1/certification/exam/submit/",
            {"level_id": "foundations", "attempt_id": attempt_id, "answers": bank},
            format="json",
        )
        self.assertEqual(submit.status_code, 200, submit.content)
        result = submit.json()
        self.assertTrue(result["passed"])
        cert_id = result["certificate_id"]
        self.assertTrue(cert_id.startswith("SFS-FOU-"))

        # 3. Verify certificate
        verify = self.client.get(f"/api/v1/certification/verify/{cert_id}/")
        self.assertEqual(verify.status_code, 200)
        self.assertTrue(verify.json()["valid"])

        # 4. List my certifications
        listing = self.client.get("/api/v1/certification/my-certifications/")
        self.assertEqual(listing.status_code, 200)
        body = listing.json()
        self.assertEqual(len(body["certifications"]), 1)
        self.assertGreaterEqual(len(body["exam_history"]), 1)

    def test_exam_submit_rejects_bad_attempt(self):
        resp = self.client.post(
            "/api/v1/certification/exam/submit/",
            {
                "level_id": "foundations",
                "attempt_id": "00000000-0000-0000-0000-000000000000",
                "answers": {"x": 0},
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_practitioner_blocked_without_foundations(self):
        resp = self.client.post(
            "/api/v1/certification/exam/start/",
            {"level_id": "practitioner"},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_unknown_certificate_returns_404(self):
        resp = self.client.get("/api/v1/certification/verify/SFS-PHANTOM-XXXXXXXXXXXX/")
        self.assertEqual(resp.status_code, 404)
        self.assertFalse(resp.json()["valid"])
