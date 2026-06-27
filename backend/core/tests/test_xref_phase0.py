"""
Cross-reference resolution — Phase 0 (foundations) tests.
=========================================================

Phase 0 adds the data model + provenance plumbing (no resolution logic yet):
  - reference_types vocabulary (ReferenceKey/Artifact/ArtifactRef/ResolvedLink)
  - provenance fields on claim/spec/verdict (default-empty, round-trip in to_dict)
  - LinkResult.confidence threaded into the verdict's resolution_confidence
  - per-file extraction: each claim/verdict carries its true source_file

See docs/manuscript_verifier/XREF_RESOLUTION_WORKPLAN.md (Phase 0 / checkpoint C0).
"""

import numpy as np
import pandas as pd
from scipy import stats

from django.test import SimpleTestCase

from core.manuscript.reference_types import (
    Artifact, ArtifactKind, ArtifactRef, ReferenceKey, ResolutionMethod, ResolvedLink,
)
from core.manuscript.verdicts import ClaimVerdict, Verdict
from core.manuscript.verify_pipeline import verify_manuscript, verify_segments


class ReferenceTypesTest(SimpleTestCase):
    def test_supplementary_is_distinguished(self):
        supp = ReferenceKey(ArtifactKind.TABLE, 3, supplementary=True)
        main = ReferenceKey(ArtifactKind.TABLE, 3, supplementary=False)
        self.assertTrue(supp.matches(ReferenceKey(ArtifactKind.TABLE, 3, supplementary=True)))
        self.assertFalse(supp.matches(main))  # "Table S3" != "Table 3"

    def test_subpanel_is_optional_but_not_contradictory(self):
        bare = ReferenceKey(ArtifactKind.FIGURE, 2)
        panel_b = ReferenceKey(ArtifactKind.FIGURE, 2, sub="B")
        panel_c = ReferenceKey(ArtifactKind.FIGURE, 2, sub="C")
        self.assertTrue(bare.matches(panel_b))      # "Fig 2" matches "Fig 2B"
        self.assertFalse(panel_b.matches(panel_c))  # "Fig 2B" != "Fig 2C"

    def test_dataclass_serialization(self):
        art = Artifact(artifact_id="T3", kind=ArtifactKind.TABLE, label="Table 3", home_file="supp.docx")
        self.assertEqual(art.to_dict()["kind"], "table")
        ref = ArtifactRef(raw="Supplementary Table S3", source_file="main.pdf")
        self.assertEqual(ref.to_dict()["raw"], "Supplementary Table S3")
        link = ResolvedLink(claim_id="C001", artifact_id="T3", home_file="supp.docx",
                            method=ResolutionMethod.JATS_XREF, confidence=1.0)
        self.assertTrue(link.resolved)
        self.assertEqual(link.to_dict()["method"], "jats_xref")
        self.assertFalse(ResolvedLink().resolved)


class VerdictProvenanceTest(SimpleTestCase):
    def test_new_provenance_fields_default_and_roundtrip(self):
        cv = ClaimVerdict(claim_id="C001", verdict=Verdict.INSUFFICIENT_DATA)
        prov = cv.to_dict()["provenance"]
        for k in ("source_file", "cited_references", "resolved_reference", "resolution_confidence"):
            self.assertIn(k, prov)
        self.assertEqual(prov["cited_references"], [])
        self.assertIsNone(prov["resolved_reference"])


class PerFileExtractionTest(SimpleTestCase):
    def test_verify_segments_tags_each_claim_with_its_home_file(self):
        segs = [
            ("main.docx", "We found a significant effect, t(28) = 2.50, p = 0.002."),
            ("supplement.txt", "A further analysis gave F(2,45) = 6.10, p = 0.004."),
        ]
        prof = verify_segments(segs)
        by_file = {}
        for v in prof.claim_verdicts:
            by_file.setdefault(v.source_file, []).append(v.claim_text)
        self.assertIn("main.docx", by_file)
        self.assertIn("supplement.txt", by_file)
        self.assertTrue(any("2.50" in t for t in by_file["main.docx"]))
        self.assertTrue(any("6.10" in t for t in by_file["supplement.txt"]))

    def test_claim_ids_are_unique_across_files(self):
        # each segment's extractor numbers from C001 independently — the bundle must renumber
        # so ids don't collide across files.
        segs = [
            ("fileA", "t(28) = 2.50, p = 0.002 and r = 0.40, p = 0.01."),
            ("fileB", "F(2,45) = 6.10, p = 0.004 and z = 2.1, p = 0.03."),
        ]
        prof = verify_segments(segs)
        ids = [v.claim_id for v in prof.claim_verdicts]
        self.assertEqual(len(ids), len(set(ids)), f"duplicate claim_ids: {ids}")

    def test_verify_manuscript_default_source_file_is_blank(self):
        prof = verify_manuscript("A test, t(28) = 2.50, p = 0.002.")
        self.assertEqual(prof.n_claims, 1)
        self.assertEqual(prof.claim_verdicts[0].source_file, "")


class DataLinkAndSourceFileTest(SimpleTestCase):
    def test_data_link_verifies_and_tags_source_file(self):
        rng = np.random.default_rng(7)
        treat = rng.normal(58.0, 8.0, 40)
        ctrl = rng.normal(50.0, 8.0, 40)
        df = pd.DataFrame({"group": ["treatment"] * 40 + ["control"] * 40,
                           "biomarker": list(treat) + list(ctrl)})
        t, p = stats.ttest_ind(treat, ctrl, equal_var=True)
        text = ("Serum biomarker was higher in the treatment group than the control group "
                f"(t(78) = {abs(t):.2f}, p = {p:.3f}).")
        prof = verify_segments([("main.csv-paper", text)], dataframe=df)
        verified = [v for v in prof.claim_verdicts if v.verdict == Verdict.VERIFIED]
        self.assertTrue(verified, prof.verdict_distribution)
        self.assertEqual(verified[0].source_file, "main.csv-paper")
        # resolution_confidence now reflects the REFERENCE resolution; this sentence cites no
        # artifact ("Table N"), so it stays None (the data-link confidence lives on the spec).
        self.assertIsNone(verified[0].resolution_confidence)
