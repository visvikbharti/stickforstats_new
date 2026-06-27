"""
jats_parser.py — extract text from PMC JATS / NLM articleset XML (closes the known JATS gap).
=============================================================================================

``ManuscriptParser`` reads PDF/LaTeX/DOCX; the Phase-B corpus is PMC Open-Access **JATS XML**,
which it could not read. This adds that leg: parse a PMC ``.nxml`` / efetch ``pmc-articleset``
document into structured text (title, abstract, body, results, table text) for the verification /
consistency census.

Scoping matters: ``<article-title>`` also appears inside every ``<ref>`` in ``<back>``, so the
paper title is taken from ``<front>`` and body text strictly from ``<body>`` (references excluded).
Table cell text IS included (statistics are often reported in tables) — concatenated, so a value
split across cells may not re-form the inline "t(df)=…, p=…" pattern; full table parsing is a
follow-on, but including the text recovers many table-reported numbers.

Pure stdlib + lxml. No network (external DTDs are not fetched).

Created: 2026-06-25 IST.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Union

from lxml import etree

_PARSER = etree.XMLParser(resolve_entities=False, no_network=True, load_dtd=False,
                          recover=True, huge_tree=True)


@dataclass
class JatsDoc:
    pmcid: str
    title: str
    abstract: str
    body_text: str
    results_text: str          # the Results section(s) if detected, else the full body
    tables_text: str
    full_text: str             # title + abstract + body + tables (what the extractor consumes)
    article_type: str
    n_paragraphs: int
    n_tables: int
    # cross-reference graph (Phase 1, docs/manuscript_verifier/): the machine-readable JATS links
    # the gold path relies on. artifacts: id -> {kind,label,caption,href}; xrefs: each in-text
    # <xref> with its ref_type, target rid, and visible text (e.g. "Table 3").
    artifacts: Dict[str, Dict[str, str]] = field(default_factory=dict)
    xrefs: List[Dict[str, str]] = field(default_factory=list)

    @property
    def has_body(self) -> bool:
        return bool(self.body_text.strip())

    @property
    def census_text(self) -> str:
        """Text the consistency census extracts from: body + table text, but NOT the abstract
        (a result restated in both abstract and Results would otherwise be counted twice)."""
        return "\n".join(x for x in (self.body_text, self.tables_text) if x)


_FLOAT = {"table-wrap", "table-wrap-foot", "table", "caption", "fig"}

# xlink:href carries the external supplementary/data filename on <media>/<supplementary-material>.
_XLINK_HREF = "{http://www.w3.org/1999/xlink}href"

# JATS element tag -> normalized artifact kind (matches reference_types.ArtifactKind values).
_ARTIFACT_KINDS = {
    "table-wrap": "table",
    "fig": "figure",
    "supplementary-material": "supplementary",
    "media": "dataset",
    "inline-supplementary-material": "supplementary",
    "disp-formula": "equation",
}


def _text(el) -> str:
    return " ".join(t.strip() for t in el.itertext() if t and t.strip())


def _in_float(el) -> bool:
    """True if the element sits inside a table/figure float (whose text is captured separately)."""
    return any(etree.QName(a).localname in _FLOAT for a in el.iterancestors())


def _first(el, *paths):
    for p in paths:
        found = el.find(p)
        if found is not None:
            return found
    return None


def parse_jats(source: Union[str, Path, bytes]) -> Optional[JatsDoc]:
    """Parse a JATS / pmc-articleset document. Returns a JatsDoc, or None if no <article> is found."""
    try:
        if isinstance(source, (bytes, bytearray)):
            root = etree.fromstring(source, parser=_PARSER)
        else:
            root = etree.parse(str(source), parser=_PARSER).getroot()
    except Exception:
        return None
    if root is None:
        return None

    # one <article> per file by construction (efetch_by_id fetches a single PMCID); a multi-article
    # articleset would parse only the first — acceptable given the fetch path, noted for reuse.
    art = root if etree.QName(root).localname == "article" else root.find(".//article")
    if art is None:
        return None
    article_type = art.get("article-type", "")

    front = art.find(".//front")
    pmcid = title = abstract = ""
    if front is not None:
        idel = front.find('.//article-id[@pub-id-type="pmcid"]')
        pmcid = (idel.text or "").strip() if idel is not None else ""
        tel = _first(front, ".//title-group/article-title", ".//article-title")
        title = _text(tel) if tel is not None else ""
        ael = front.find(".//abstract")
        abstract = _text(ael) if ael is not None else ""

    body = art.find(".//body")
    body_parts, results_parts, tables = [], [], []
    n_p = n_tables = 0
    if body is not None:
        # running-text paragraphs only — EXCLUDE <p> inside table/figure floats, whose text is
        # captured once in tables_text (otherwise table prose is counted twice in full_text).
        for p in body.iter("p"):
            if _in_float(p):
                continue
            txt = _text(p)
            if txt:
                body_parts.append(txt)
                n_p += 1
        for sec in body.iter("sec"):
            st = sec.find("title")
            if st is not None and "result" in (_text(st) or "").lower():
                results_parts.extend(_text(p) for p in sec.iter("p") if _text(p) and not _in_float(p))
        for tw in body.iter("table-wrap"):
            t = _text(tw)
            if t:
                tables.append(t)
                n_tables += 1

    # --- cross-reference graph (Phase 1) ---------------------------------------------------
    # Harvest from `art` (not just `body`): supplementary material and floats can live in
    # <back>/<floats-group>. Read the structural attributes itertext() throws away.
    artifacts: Dict[str, Dict[str, str]] = {}
    for tag, kind in _ARTIFACT_KINDS.items():
        for el in art.iter(tag):
            aid = el.get("id")
            if not aid:
                continue
            lab = el.find("label")
            cap = el.find("caption")
            href = el.get(_XLINK_HREF, "")
            if not href:  # <media>/<graphic> child may carry the href
                child = el.find(".//media") if tag != "media" else None
                if child is None:
                    child = el.find(".//graphic")
                if child is not None:
                    href = child.get(_XLINK_HREF, "")
            artifacts[aid] = {
                "kind": kind,
                "label": _text(lab) if lab is not None else "",
                "caption": _text(cap) if cap is not None else "",
                "href": href or "",
            }

    xrefs: List[Dict[str, str]] = []
    if body is not None:
        for x in body.iter("xref"):
            ref_type = x.get("ref-type", "")
            if ref_type == "bibr":  # citations are not artifact references
                continue
            vis = _text(x)
            for rid in (x.get("rid") or "").split():  # rid may target multiple ids
                xrefs.append({"ref_type": ref_type, "rid": rid, "text": vis})

    body_text = "\n".join(body_parts)
    tables_text = "\n".join(tables)
    results_text = "\n".join(results_parts) or body_text
    full_text = "\n".join(x for x in (title, abstract, body_text, tables_text) if x)
    return JatsDoc(pmcid=pmcid, title=title, abstract=abstract, body_text=body_text,
                   results_text=results_text, tables_text=tables_text, full_text=full_text,
                   article_type=article_type, n_paragraphs=n_p, n_tables=n_tables,
                   artifacts=artifacts, xrefs=xrefs)
