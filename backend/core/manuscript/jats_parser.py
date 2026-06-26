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

from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Union

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

    @property
    def has_body(self) -> bool:
        return bool(self.body_text.strip())

    @property
    def census_text(self) -> str:
        """Text the consistency census extracts from: body + table text, but NOT the abstract
        (a result restated in both abstract and Results would otherwise be counted twice)."""
        return "\n".join(x for x in (self.body_text, self.tables_text) if x)


_FLOAT = {"table-wrap", "table-wrap-foot", "table", "caption", "fig"}


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

    body_text = "\n".join(body_parts)
    tables_text = "\n".join(tables)
    results_text = "\n".join(results_parts) or body_text
    full_text = "\n".join(x for x in (title, abstract, body_text, tables_text) if x)
    return JatsDoc(pmcid=pmcid, title=title, abstract=abstract, body_text=body_text,
                   results_text=results_text, tables_text=tables_text, full_text=full_text,
                   article_type=article_type, n_paragraphs=n_p, n_tables=n_tables)
