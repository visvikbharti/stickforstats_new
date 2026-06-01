"""
Upload size-cap tests for the public file-upload endpoints (beta checklist §3).

These public endpoints (manuscript analyze, SQS analyze, batch) accept anonymous
file uploads and run PDF/text extraction + analysis on them. Without a size cap
they are a DoS-amplification surface for a global audience. A shared
MAX_FILE_UPLOAD_BYTES (settings) is now enforced explicitly with a friendly 400.
"""

from __future__ import annotations

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings


# Use a tiny cap so the tests don't have to allocate large buffers.
@override_settings(MAX_FILE_UPLOAD_BYTES=1024, SECURE_SSL_REDIRECT=False)
class TestUploadSizeCaps(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient

        self.client = APIClient()

    def test_manuscript_analyze_rejects_oversized_file(self):
        big = SimpleUploadedFile("big.pdf", b"x" * 5000, content_type="application/pdf")
        resp = self.client.post("/api/v1/manuscript/analyze/", {"file": big}, format="multipart")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("too large", resp.json()["error"].lower())

    def test_sqs_analyze_rejects_oversized_file(self):
        big = SimpleUploadedFile("big.pdf", b"x" * 5000, content_type="application/pdf")
        resp = self.client.post("/api/v1/sqs/analyze/", {"file": big}, format="multipart")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("too large", resp.json()["error"].lower())

    def test_batch_reports_oversized_file_as_error(self):
        big = SimpleUploadedFile("big.pdf", b"x" * 5000, content_type="application/pdf")
        resp = self.client.post("/api/v1/manuscript/batch-submit/", {"file_0": big}, format="multipart")
        # Batch always returns 201 with per-file errors; the oversized file must
        # be reported as an error and not completed.
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["completed"], 0)
        self.assertTrue(any("too large" in e["error"].lower() for e in data["errors"]))


class TestUploadCapConfigured(TestCase):
    def test_max_file_upload_bytes_is_set(self):
        self.assertTrue(hasattr(settings, "MAX_FILE_UPLOAD_BYTES"))
        self.assertGreater(settings.MAX_FILE_UPLOAD_BYTES, 0)
        # Django global ceiling should match the configured cap.
        self.assertEqual(settings.DATA_UPLOAD_MAX_MEMORY_SIZE, settings.MAX_FILE_UPLOAD_BYTES)
