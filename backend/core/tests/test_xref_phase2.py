"""
Cross-reference resolution — Phase 2 (grammar hardening + PDF/DOCX label index).
=================================================================================

Phase 2: resolve references in non-structured manuscripts (no JATS xrefs). Build
the artifact index from Table/Figure captions, harden the grammar against a
labeled gold set, and map supplement filenames to references.

See docs/manuscript_verifier/XREF_RESOLUTION_WORKPLAN.md (Phase 2 / checkpoint C2).
"""

from django.test import SimpleTestCase

from core.manuscript.artifact_index import build_index_from_text, context_from_text
from core.manuscript.reference_grammar import parse_reference, parse_supplement_filename
from core.manuscript.reference_types import ArtifactKind
from core.manuscript.verify_pipeline import verify_segments

# (string -> expected (kind, number, supplementary) or None). The grammar gold set; the C2 bar
# is >=95% of these correct.
_GOLD = {
    "Table 1": (ArtifactKind.TABLE, 1, False),
    "Table 12": (ArtifactKind.TABLE, 12, False),
    "Table S3": (ArtifactKind.TABLE, 3, True),
    "Supplementary Table 3": (ArtifactKind.TABLE, 3, True),
    "Supplementary Table S3": (ArtifactKind.TABLE, 3, True),
    "Suppl. Table 2": (ArtifactKind.TABLE, 2, True),
    "Supp Table 4": (ArtifactKind.TABLE, 4, True),
    "Tab. 5": (ArtifactKind.TABLE, 5, False),
    "Figure 2": (ArtifactKind.FIGURE, 2, False),
    "Figure 2B": (ArtifactKind.FIGURE, 2, False),
    "Fig. 3": (ArtifactKind.FIGURE, 3, False),
    "Fig 4a": (ArtifactKind.FIGURE, 4, False),
    "Supplementary Figure 1": (ArtifactKind.FIGURE, 1, True),
    "Supplementary Fig. S2": (ArtifactKind.FIGURE, 2, True),
    "Extended Data Figure 2": (ArtifactKind.FIGURE, 2, False),
    "Additional File 1": (ArtifactKind.SUPPLEMENTARY, 1, True),
    "Additional file 12": (ArtifactKind.SUPPLEMENTARY, 12, True),
    "Supplementary Data 1": (ArtifactKind.DATASET, 1, True),
    "Data S1": (ArtifactKind.DATASET, 1, True),
    "Dataset S2": (ArtifactKind.DATASET, 2, True),
    "Equation 5": (ArtifactKind.EQUATION, 5, False),
    "Eq. 2": (ArtifactKind.EQUATION, 2, False),
    # negatives (must NOT parse as references)
    "the data 5 years later": None,
    "file 3 of 10": None,
    "we used 3 groups": None,
    "p < 0.05": None,
    "at 5 Hz": None,
}


class GrammarGoldSetTest(SimpleTestCase):
    def test_gold_set_accuracy(self):
        wrong = []
        for s, expected in _GOLD.items():
            key = parse_reference(s)
            got = None if key is None else (key.kind, key.number, key.supplementary)
            if got != expected:
                wrong.append((s, expected, got))
        acc = 1 - len(wrong) / len(_GOLD)
        self.assertGreaterEqual(acc, 0.95, f"grammar accuracy {acc:.2%}; misses: {wrong}")


class SupplementFilenameTest(SimpleTestCase):
    def test_publisher_conventions(self):
        cases = {
            "mmc1.xlsx": (ArtifactKind.SUPPLEMENTARY, 1),                 # Elsevier
            "41586_2020_1234_MOESM3_ESM.xlsx": (ArtifactKind.SUPPLEMENTARY, 3),  # Springer-Nature
            "pnas.2020.sd01.xlsx": (ArtifactKind.DATASET, 1),            # PNAS source data
            "Additional_file_2.csv": (ArtifactKind.SUPPLEMENTARY, 2),    # BMC
            "Supplementary_Table_S3.xlsx": (ArtifactKind.TABLE, 3),
            "S1_File.csv": (ArtifactKind.SUPPLEMENTARY, 1),              # PLOS
            "S2_Table.xlsx": (ArtifactKind.TABLE, 2),                    # PLOS
            "Data_S4.csv": (ArtifactKind.DATASET, 4),
        }
        for name, (kind, num) in cases.items():
            key = parse_supplement_filename(name)
            self.assertIsNotNone(key, name)
            self.assertEqual((key.kind, key.number), (kind, num), name)
        self.assertIsNone(parse_supplement_filename("results.csv"))
        self.assertIsNone(parse_supplement_filename("trial_data.xlsx"))


class CaptionIndexTest(SimpleTestCase):
    TEXT = (
        "As shown in Table 3, the effect held (t(28) = 2.50, p = 0.002); see also Figure 2.\n\n"
        "Table 3. Baseline characteristics of the two groups.\n"
        "Figure 2. Box plot of the biomarker by group.\n"
        "Supplementary Table S1: Full regression coefficients.\n"
    )

    def test_captions_detected_without_phantoms(self):
        arts = build_index_from_text(self.TEXT, home_file="paper.pdf")
        self.assertEqual(len(arts), 3)  # the in-text "Table 3"/"Figure 2" mentions add nothing
        labels = {a.label for a in arts}
        self.assertIn("Table 3", labels)
        self.assertTrue(any(a.key.supplementary and a.kind == ArtifactKind.TABLE for a in arts))


class NonJatsResolutionTest(SimpleTestCase):
    def test_claim_resolves_to_captioned_table(self):
        text = ("As shown in Table 3, the effect held (t(28) = 2.50, p = 0.002).\n\n"
                "Table 3. Baseline characteristics.")
        ctx = context_from_text(text, home_file="paper.pdf")
        prof = verify_segments([("paper.pdf", text, ctx)])
        v = prof.claim_verdicts[0]
        self.assertIn("Table 3", v.cited_references)
        self.assertEqual(v.resolved_reference, "Table 3")
        self.assertEqual(v.resolution_confidence, 0.85)        # LABEL tier
        self.assertEqual(v.source_file, "paper.pdf")

    def test_cross_file_same_label_is_ambiguous_not_guessed(self):
        ta = ("We report t(28) = 2.50, p = 0.002 in Table 3.\n\nTable 3. Group A results.")
        tb = ("Other findings.\n\nTable 3. Group B results.")
        segs = [
            ("fileA.pdf", ta, context_from_text(ta, "fileA.pdf")),
            ("fileB.pdf", tb, context_from_text(tb, "fileB.pdf")),
        ]
        prof = verify_segments(segs)
        va = [v for v in prof.claim_verdicts if v.source_file == "fileA.pdf"][0]
        self.assertIn("Table 3", va.cited_references)
        self.assertFalse(va.resolved_reference)                # two files have Table 3 -> not guessed
        self.assertTrue(any("ambiguous reference" in n for n in va.notes), va.notes)
