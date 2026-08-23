"""
`extract_from_sections` read attributes that do not exist, and returned zero claims forever.

It read ``getattr(sec, "name", "unknown")`` and ``getattr(sec, "text", "")``.
``parser.ManuscriptSection`` exposes ``section_type`` and ``content``. The forgiving default
turned every section into the empty string, ``if not text: continue`` skipped all of them, and
the method returned an empty list for every manuscript ever passed to it. Nothing raised.

The consequences differed by caller, and the quiet one was the worse one:

  * ``ManuscriptGuardian`` has a fallback, so it silently degraded to Results-only extraction --
    losing Methods and Discussion claims and their section labels, while still reporting a
    coverage figure as though it had read the whole paper.
  * The two v1 endpoints have NO fallback. Executed against a manuscript containing four
    claims, before the fix:

        POST /api/v1/manuscript/claims/       -> HTTP 200, total_claims: 0
        POST /api/v1/manuscript/consistency/  -> HTTP 200, total_checked: 0,
                                                 inconsistent: 0, gross_errors: 0

    That second one is a clean consistency summary produced by checking nothing — the same
    false-clean-bill shape as the p-reader defects, arrived at from the opposite direction.

Every test names the mutation that must break it.
"""

from django.test import SimpleTestCase, TestCase, override_settings

from core.manuscript.claim_extractor import StatisticalClaimExtractor
from core.manuscript.parser import ManuscriptSection

PAPER_SECTIONS = [
    ManuscriptSection(
        section_type="methods", title="Methods",
        content="Sixty participants (N = 60) were compared with an independent-samples t-test.",
        start_pos=0, end_pos=80),
    ManuscriptSection(
        section_type="results", title="Results",
        content=("The treatment group improved, t(58) = 3.42, p = .001. There was also an "
                 "effect of condition, F(2, 57) = 4.10, p = .02."),
        start_pos=80, end_pos=200),
]

MANUSCRIPT_TEXT = (
    "Introduction\nWe studied the effect.\n\n"
    "Methods\nSixty participants (N = 60) were compared with an independent-samples t-test.\n\n"
    "Results\nThe treatment group improved, t(58) = 3.42, p = .001. There was also an effect "
    "of condition, F(2, 57) = 4.10, p = .02. Age correlated with score, r(58) = .41, p = .001.\n\n"
    "Discussion\nThese findings replicate prior work.\n"
)


class SectionsAreActuallyReadTests(SimpleTestCase):

    def setUp(self):
        self.extractor = StatisticalClaimExtractor()

    def test_claims_are_extracted_from_real_section_objects(self):
        """THE HEADLINE. This returned [] for every manuscript.

        MUTATION: read `getattr(sec, "text", "")` again -> 0 claims and this fails.
        """
        claims = self.extractor.extract_from_sections(PAPER_SECTIONS)
        self.assertEqual(len(claims), 3)

    def test_each_claim_carries_its_real_section(self):
        """The section label is why this method exists at all -- extracting from concatenated
        text would be simpler otherwise. It was defaulting to "unknown" for everything.

        MUTATION: read `getattr(sec, "name", "unknown")` again -> every claim is labelled
        "unknown" and this fails.
        """
        locations = {c.location for c in self.extractor.extract_from_sections(PAPER_SECTIONS)}
        self.assertEqual(locations, {"methods", "results"})

    def test_a_methods_claim_survives(self):
        """The specific loss the Guardian fallback caused: it extracts from `results_text`
        only, so a claim reported in Methods disappeared entirely.

        MUTATION: pass only the results section -> the methods claim is gone and this fails.
        """
        claims = self.extractor.extract_from_sections(PAPER_SECTIONS)
        self.assertTrue(any(c.location == "methods" for c in claims))

    def test_a_section_object_with_neither_attribute_raises_loudly(self):
        """The whole defect was silence. An object we cannot read text from must NOT yield an
        empty list, because that is indistinguishable from a manuscript reporting no statistics.

        MUTATION: restore a `getattr(..., "")` default -> returns [] quietly and this fails.
        """
        class Opaque:
            heading = "Results"
            body = "t(58) = 3.42, p = .001"

        with self.assertRaises(TypeError) as ctx:
            self.extractor.extract_from_sections([Opaque()])
        message = str(ctx.exception)
        self.assertIn("Opaque", message)
        self.assertIn("body", message)          # tells you what it DOES have

    def test_objects_exposing_name_and_text_still_work(self):
        """The documented contract before the fix. Some caller may rely on it, and the point
        of this change is to read MORE shapes, not to swap one narrow read for another.

        MUTATION: drop the `.text` branch -> raises on this shape and fails.
        """
        class Legacy:
            def __init__(self, name, text):
                self.name, self.text = name, text

        claims = self.extractor.extract_from_sections(
            [Legacy("results", "The groups differed, t(58) = 3.42, p = .001.")])
        self.assertEqual(len(claims), 1)
        self.assertEqual(claims[0].location, "results")

    def test_an_empty_section_is_skipped_not_an_error(self):
        """Empty sections are ordinary -- a parsed heading with no body. Only a section we
        cannot READ is an error.

        MUTATION: raise on empty content -> fails.
        """
        empty = ManuscriptSection(section_type="discussion", title="Discussion",
                                  content="", start_pos=0, end_pos=0)
        claims = self.extractor.extract_from_sections(PAPER_SECTIONS + [empty])
        self.assertEqual(len(claims), 3)

    def test_claim_ids_are_unique_across_sections(self):
        """Each section's extraction numbers from C001 independently; without renumbering the
        same id would appear in two sections.

        MUTATION: drop the renumbering -> duplicate ids and this fails.
        """
        claims = self.extractor.extract_from_sections(PAPER_SECTIONS)
        ids = [c.claim_id for c in claims]
        self.assertEqual(len(ids), len(set(ids)))


@override_settings(SECURE_SSL_REDIRECT=False)
class TheLiveEndpointsReturnClaimsAgainTests(TestCase):
    """These two have NO fallback, so they returned nothing at all."""

    def _post(self, path):
        from django.core.files.uploadedfile import SimpleUploadedFile
        upload = SimpleUploadedFile("paper.txt", MANUSCRIPT_TEXT.encode(),
                                    content_type="text/plain")
        response = self.client.post(path, data={"file": upload})
        self.assertEqual(response.status_code, 200)
        return response.json()

    def test_the_claims_endpoint_no_longer_returns_an_empty_manuscript(self):
        """MUTATION: restore either forgiving getattr -> total_claims returns to 0 and fails."""
        payload = self._post("/api/v1/manuscript/claims/")
        self.assertEqual(payload["summary"]["total_claims"], 4)
        self.assertTrue(any(c["location"] == "methods" for c in payload["claims"]))

    def test_the_consistency_endpoint_no_longer_certifies_by_checking_nothing(self):
        """It reported total_checked: 0, inconsistent: 0, gross_errors: 0 — which reads as a
        clean paper and was produced by extracting nothing.

        MUTATION: restore either forgiving getattr -> total_checked returns to 0, and the
        summary again looks clean, so this fails.
        """
        summary = self._post("/api/v1/manuscript/consistency/")["summary"]
        self.assertEqual(summary["total_checked"], 3)
        self.assertEqual(summary["consistent"], 3)
