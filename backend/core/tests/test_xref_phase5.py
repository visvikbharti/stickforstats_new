"""
Cross-reference resolution — Phase 5 (figure-stat extraction).
==============================================================

Phase 5: extract statistics printed in figures, tagging each claim's
extraction_method (ocr/vision). The vision tier is OPT-IN and never runs by
default (privacy: no external egress for confidential manuscript figures).

See docs/manuscript_verifier/XREF_RESOLUTION_WORKPLAN.md (Phase 5 / checkpoint C5).
"""

import io
import unittest

from django.test import SimpleTestCase

from core.manuscript import image_ocr
from core.manuscript.bundle_ingest import ingest_bundle
from core.manuscript.figure_extractor import DEFAULT_FIGURE_EXTRACTOR, FigureStatExtractor
from core.manuscript.verify_pipeline import verify_segments

_HAVE_TESS = image_ocr.tesseract_available()


def _stat_png(text="t(28) = 2.50, p = 0.002"):
    from PIL import Image, ImageDraw, ImageFont
    img = Image.new("RGB", (560, 80), "white")
    d = ImageDraw.Draw(img)
    try:
        f = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 30)
    except Exception:
        f = ImageFont.load_default()
    d.text((12, 28), text, fill="black", font=f)
    b = io.BytesIO()
    img.save(b, "PNG")
    return b.getvalue()


def _blank_png():
    from PIL import Image
    b = io.BytesIO()
    Image.new("RGB", (200, 80), "white").save(b, "PNG")
    return b.getvalue()


def _explode(_):
    raise AssertionError("vision_fn was called — external egress is not allowed by default")


class FigureExtractorTest(SimpleTestCase):
    @unittest.skipUnless(_HAVE_TESS, "tesseract not installed")
    def test_ocr_baseline_extracts_stat(self):
        r = DEFAULT_FIGURE_EXTRACTOR.extract(io.BytesIO(_stat_png()))
        self.assertEqual(r.method, "ocr")
        self.assertIn("2.50", r.text)

    def test_no_egress_by_default(self):
        # a vision_fn is supplied but enable_vision is False -> it must never run.
        fx = FigureStatExtractor(vision_fn=_explode)   # enable_vision defaults False
        r = fx.extract(io.BytesIO(_blank_png()))       # OCR finds no stat
        self.assertNotEqual(r.method, "vision")        # never reached the vision tier

    def test_vision_optin_recovers_what_ocr_misses(self):
        fx = FigureStatExtractor(vision_fn=lambda b: "Panel: r = 0.61, p = 0.01", enable_vision=True)
        r = fx.extract(io.BytesIO(_blank_png()))
        self.assertEqual(r.method, "vision")
        self.assertIn("0.61", r.text)


@unittest.skipUnless(_HAVE_TESS, "tesseract not installed")
class BundleFigureProvenanceTest(SimpleTestCase):
    def test_figure_claim_is_tagged_ocr(self):
        items = [{"name": "fig1.png", "kind": "image", "detail": ".png", "content": _stat_png()}]
        b = ingest_bundle(items)                       # default extractor: OCR-only
        # the image segment is a 4-tuple carrying the extraction method
        seg = b.segments[0]
        self.assertEqual(seg[3], "ocr")
        prof = verify_segments(b.segments)
        v = prof.claim_verdicts[0]
        self.assertEqual(v.extraction_method, "ocr")
        self.assertEqual(v.source_file, "fig1.png")
        self.assertEqual(v.to_dict()["provenance"]["extraction_method"], "ocr")

    def test_text_claim_is_tagged_text(self):
        items = [{"name": "p.txt", "kind": "manuscript", "detail": "latex",
                  "content": b"Results: t(28) = 2.50, p = 0.002."}]
        b = ingest_bundle(items)
        prof = verify_segments(b.segments)
        self.assertEqual(prof.claim_verdicts[0].extraction_method, "text")


class BundleVisionTierTest(SimpleTestCase):
    def test_vision_tier_through_bundle_when_enabled(self):
        vx = FigureStatExtractor(vision_fn=lambda b: "r = 0.61, p = 0.01", enable_vision=True)
        items = [{"name": "panel.png", "kind": "image", "detail": ".png", "content": _blank_png()}]
        b = ingest_bundle(items, figure_extractor=vx)
        self.assertTrue(b.segments, "vision should have produced a segment")
        self.assertEqual(b.segments[0][3], "vision")
        prof = verify_segments(b.segments)
        self.assertEqual(prof.claim_verdicts[0].extraction_method, "vision")

    def test_no_egress_through_bundle_by_default(self):
        # default bundle ingestion must never invoke a vision model, even if one is configured but
        # not enabled — here we pass an extractor whose vision_fn explodes, with vision disabled.
        fx = FigureStatExtractor(vision_fn=_explode)   # disabled
        items = [{"name": "blank.png", "kind": "image", "detail": ".png", "content": _blank_png()}]
        b = ingest_bundle(items, figure_extractor=fx)  # must not raise
        # the blank figure yields nothing; it is skipped, not vision-extracted.
        self.assertEqual(b.segments, [])
