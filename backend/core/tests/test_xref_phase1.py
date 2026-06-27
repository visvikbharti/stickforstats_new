"""
Cross-reference resolution — Phase 1 (JATS gold path) tests.
============================================================

Phase 1: recover the JATS machine-readable cross-reference graph and resolve a
claim's in-text reference ("Table 3") to the EXACT artifact + home file, with
confidence ~1.0, recorded on the verdict.

Levels: reference grammar -> JATS artifact/xref extraction -> resolver ->
end-to-end through verify_segments and the bundle.

See docs/manuscript_verifier/XREF_RESOLUTION_WORKPLAN.md (Phase 1 / checkpoint C1).
"""

from django.test import SimpleTestCase

from core.manuscript.artifact_index import context_from_jats, from_jats, jats_xref_text_map
from core.manuscript.bundle_ingest import ingest_bundle
from core.manuscript.jats_parser import parse_jats
from core.manuscript.reference_grammar import detect_references, parse_reference
from core.manuscript.reference_resolver import best_link, resolve_in_text
from core.manuscript.reference_types import (
    Artifact, ArtifactKind, ReferenceKey, ResolutionMethod,
)
from core.manuscript.verify_pipeline import verify_segments

# A JATS article whose Results sentence cites Table 3 (machine-readable <xref rid="T3">) and a
# supplementary dataset (with an external media href), alongside a recomputable t-statistic.
_JATS = b"""<?xml version="1.0"?>
<article xmlns:xlink="http://www.w3.org/1999/xlink">
<front><article-meta><title-group><article-title>Study</article-title></title-group></article-meta></front>
<body>
<sec><title>Results</title>
<p>As shown in <xref ref-type="table" rid="T3">Table 3</xref>, the group difference was small
   (t(28) = 0.45, p = 0.66); raw values are in
   <xref ref-type="supplementary-material" rid="SD1">Supplementary Data 1</xref>.</p>
<table-wrap id="T3"><label>Table 3</label><caption><p>Coefficients</p></caption>
  <table><tr><td>beta</td><td>0.4</td></tr></table></table-wrap>
</sec>
<supplementary-material id="SD1"><label>Supplementary Data 1</label>
  <caption><p>Raw data</p></caption><media xlink:href="mmc1.xlsx"/></supplementary-material>
</body></article>"""


class GrammarTest(SimpleTestCase):
    def test_parse_forms(self):
        self.assertEqual(parse_reference("Table S3"),
                         ReferenceKey(ArtifactKind.TABLE, 3, supplementary=True))
        self.assertEqual(parse_reference("Fig. 2B"),
                         ReferenceKey(ArtifactKind.FIGURE, 2, sub="B"))
        self.assertIsNone(parse_reference("the results were significant"))

    def test_detect_in_sentence(self):
        refs = detect_references("See Table 3 and Supplementary Figure S1 (p < .05).")
        raws = [r.raw for r in refs]
        self.assertTrue(any("Table 3" in r for r in raws))
        self.assertTrue(any("Figure S1" in r for r in raws))

    def test_bare_data_and_file_are_not_references(self):
        # precision guard (C1 recheck): "data N" / "file N" without a supp/source prefix or an
        # S-number must NOT be treated as references.
        self.assertEqual(detect_references("the data 5 years later showed recovery"), [])
        self.assertEqual(detect_references("file 3 of 10 was corrupted"), [])
        # but real supplementary forms still parse
        self.assertTrue(detect_references("see Supplementary Data 1"))
        self.assertTrue(detect_references("see Data S1"))
        self.assertTrue(detect_references("see Additional File 2"))


class JatsGraphTest(SimpleTestCase):
    def test_artifacts_and_xrefs_and_href(self):
        doc = parse_jats(_JATS)
        self.assertEqual(doc.artifacts["T3"]["kind"], "table")
        self.assertEqual(doc.artifacts["SD1"]["href"], "mmc1.xlsx")
        rids = {x["rid"] for x in doc.xrefs}
        self.assertEqual(rids, {"T3", "SD1"})

    def test_index_and_xref_map(self):
        doc = parse_jats(_JATS)
        arts = from_jats(doc, home_file="paper.xml")
        self.assertTrue(any(a.artifact_id == "T3" and a.home_file == "paper.xml" for a in arts))
        self.assertEqual(jats_xref_text_map(doc).get("table 3"), "T3")


class ResolverTest(SimpleTestCase):
    def test_jats_exact_resolution(self):
        doc = parse_jats(_JATS)
        arts = from_jats(doc, "paper.xml")
        links = resolve_in_text("See Table 3 (t=0.4).", arts, jats_xref_text_map(doc))
        bl = best_link(links)
        self.assertIsNotNone(bl)
        self.assertEqual(bl.artifact_id, "T3")
        self.assertEqual(bl.method, ResolutionMethod.JATS_XREF)
        self.assertEqual(bl.confidence, 1.0)
        self.assertEqual(bl.home_file, "paper.xml")

    def test_ambiguous_when_two_files_share_a_label(self):
        arts = [
            Artifact("a1", ArtifactKind.TABLE, "Table 3", key=ReferenceKey(ArtifactKind.TABLE, 3),
                     home_file="fileA"),
            Artifact("a2", ArtifactKind.TABLE, "Table 3", key=ReferenceKey(ArtifactKind.TABLE, 3),
                     home_file="fileB"),
        ]
        links = resolve_in_text("see Table 3", arts, xref_text_map=None)
        self.assertEqual(len(links), 1)
        self.assertFalse(links[0].resolved)               # not auto-resolved
        self.assertEqual(set(links[0].alternatives), {"a1", "a2"})


class JatsResolutionEndToEndTest(SimpleTestCase):
    def test_claim_resolves_through_verify_segments(self):
        doc = parse_jats(_JATS)
        ctx = context_from_jats(doc, home_file="paper.xml")
        prof = verify_segments([("paper.xml", doc.full_text, ctx)])
        self.assertTrue(prof.claim_verdicts)
        v = prof.claim_verdicts[0]
        self.assertIn("Table 3", v.cited_references)
        self.assertEqual(v.resolved_reference, "Table 3")
        self.assertEqual(v.resolution_confidence, 1.0)
        self.assertEqual(v.source_file, "paper.xml")
        self.assertTrue(any("jats_xref" in n for n in v.notes), v.notes)
        # the resolved provenance survives serialization
        prov = v.to_dict()["provenance"]
        self.assertEqual(prov["resolved_reference"], "Table 3")
        self.assertEqual(prov["resolution_confidence"], 1.0)
        # the sentence also cites Supplementary Data 1 -> both recorded, multi-citation surfaced
        self.assertIn("Supplementary Data 1", v.cited_references)
        self.assertTrue(any("multiple artifacts" in n for n in v.notes), v.notes)


class BundleJatsResolutionTest(SimpleTestCase):
    def test_bundle_builds_reference_context_and_resolves(self):
        items = [{"name": "paper.xml", "kind": "manuscript", "detail": "jats", "content": _JATS}]
        b = ingest_bundle(items)
        # a JATS file yields a 3-tuple segment carrying its reference context
        self.assertTrue(any(len(s) > 2 and s[2] is not None for s in b.segments))
        prof = verify_segments(b.segments)
        v = prof.claim_verdicts[0]
        self.assertEqual(v.resolved_reference, "Table 3")
        self.assertEqual(v.resolution_confidence, 1.0)
        self.assertEqual(v.source_file, "paper.xml")
