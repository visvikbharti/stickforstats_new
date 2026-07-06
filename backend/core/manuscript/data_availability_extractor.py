"""
T09-ACCESSION — data-availability statement -> structured accessions.
======================================================================

Created: 2026-06-24 IST
Plan:    docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md  (A2 ingestion entry point)
TODO:    docs/MANUSCRIPT_MODULE_TODO_2026-06-24.md  (T09-ACCESSION)

Upgrades the existing PRESENCE-ONLY data-availability regexes (advanced_validators
.DATA_AVAILABILITY_PATTERN, discipline_profiles seeds) into CAPTURE-GROUP accession
extraction, and classifies a paper's data-availability posture. This is the entry
point for A2 (fetch + import) and the instrument for the ~50-paper data-availability
pilot that sizes the verifiable fraction (the whole product's bottleneck, plan §1/§8).

Pure module (stdlib only): no scipy / Django / network.

Availability classes (most→least verifiable):
  open_accession   structured repository accession found (a verifiable candidate)
  in_paper_supp    data stated to be in the article / supplementary materials
  on_request       "available (up)on (reasonable) request" — NOT independently verifiable
  statement_only   a data-availability statement exists but yields no actionable pointer
  none             no data-availability statement detected
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class Accession:
    repository: str
    accession: str
    url: str
    source_location: str = "unknown"   # section name, when known
    position: int = 0                  # char offset in the text


@dataclass
class DataAvailability:
    has_statement: bool
    availability_class: str            # see module docstring
    accessions: List[Accession] = field(default_factory=list)
    statement_text: str = ""           # the DAS sentence/section, when located
    on_request_only: bool = False
    notes: List[str] = field(default_factory=list)

    @property
    def is_verifiable_candidate(self) -> bool:
        """True iff a structured accession (or a concrete supp pointer) exists —
        i.e. a claim *could* be re-run if we fetch it. 'on_request'/'none' are not."""
        return self.availability_class in ("open_accession", "in_paper_supp")

    def to_dict(self) -> Dict:
        return {
            "has_statement": self.has_statement,
            "availability_class": self.availability_class,
            "on_request_only": self.on_request_only,
            "n_accessions": len(self.accessions),
            "repositories": sorted({a.repository for a in self.accessions}),
            "accessions": [
                {"repository": a.repository, "accession": a.accession, "url": a.url,
                 "section": a.source_location} for a in self.accessions
            ],
            "statement_text": self.statement_text[:500],
            "notes": self.notes,
        }


# --- accession patterns (repository, compiled regex w/ one capture group, url template) ---
# Ordered most-specific first; DOIs before bare repo URLs.
_ACCESSION_SPECS = [
    ("GEO",          re.compile(r"\b(GSE\d{2,7}|GSM\d{3,8}|GPL\d{1,6}|GDS\d{1,6})\b"),
                     "https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc={a}"),
    ("SRA",          re.compile(r"\b((?:SR|ER|DR)[RXPS]\d{4,9})\b"),
                     "https://www.ncbi.nlm.nih.gov/sra/?term={a}"),
    ("BioProject",   re.compile(r"\b(PRJ(?:NA|EB|DB)\d{3,9})\b"),
                     "https://www.ncbi.nlm.nih.gov/bioproject/?term={a}"),
    ("BioSample",    re.compile(r"\b(SAM(?:N|EA|EG|D)[A-Z]?\d{4,9})\b"),
                     "https://www.ncbi.nlm.nih.gov/biosample/?term={a}"),
    ("ArrayExpress", re.compile(r"\b(E-[A-Z]{4}-\d{1,6})\b"),
                     "https://www.ebi.ac.uk/biostudies/arrayexpress/studies/{a}"),
    ("dbGaP",        re.compile(r"\b(phs\d{6}(?:\.v\d+)?(?:\.p\d+)?)\b"),
                     "https://www.ncbi.nlm.nih.gov/projects/gap/cgi-bin/study.cgi?study_id={a}"),
    ("PRIDE",        re.compile(r"\b(PXD\d{4,9})\b"),
                     "https://www.ebi.ac.uk/pride/archive/projects/{a}"),
    ("MetaboLights", re.compile(r"\b(MTBLS\d{1,7})\b"),
                     "https://www.ebi.ac.uk/metabolights/{a}"),
    ("MassIVE",      re.compile(r"\b(MSV\d{6,9})\b"),
                     "https://massive.ucsd.edu/ProteoSAFe/dataset.jsp?accession={a}"),
    ("Dryad",        re.compile(r"\b(10\.5061/dryad\.[A-Za-z0-9.]+)\b", re.IGNORECASE),
                     "https://doi.org/{a}"),
    ("Zenodo",       re.compile(r"\b(10\.5281/zenodo\.\d+)\b", re.IGNORECASE),
                     "https://doi.org/{a}"),
    ("Zenodo",       re.compile(r"zenodo\.org/record[s]?/(\d+)", re.IGNORECASE),
                     "https://zenodo.org/records/{a}"),
    ("figshare",     re.compile(r"\b(10\.6084/m9\.figshare\.\d+(?:\.v\d+)?)\b", re.IGNORECASE),
                     "https://doi.org/{a}"),
    ("Dataverse",    re.compile(r"\b(10\.7910/DVN/[A-Z0-9]+)\b", re.IGNORECASE),
                     "https://doi.org/{a}"),
    ("OSF",          re.compile(r"osf\.io/([a-z0-9]{5})\b", re.IGNORECASE),
                     "https://osf.io/{a}"),
    ("GitHub",       re.compile(r"github\.com/([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+?)(?:[.)\s,;]|$)"),
                     "https://github.com/{a}"),
]

# Data-availability statement locator (section heading or canonical phrasing).
_DAS_HEADING_RE = re.compile(
    r"(data|code)\s+(availability|accessibility|sharing)\s+statement"
    r"|availability\s+of\s+(data|materials?)",
    re.IGNORECASE,
)
_DAS_PHRASE_RE = re.compile(
    r"(data|datasets?|code|materials?)\s+(?:that\s+support|generated|analy[sz]ed|used)?.{0,80}?"
    r"(?:are|is|were|can\s+be|will\s+be)\s+(?:freely\s+|publicly\s+|openly\s+)?"
    r"(?:available|accessible|deposited|found|obtained|accessed|downloaded)",
    re.IGNORECASE | re.DOTALL,
)
_ON_REQUEST_RE = re.compile(
    r"available\s+(?:from\s+the\s+(?:corresponding\s+)?authors?\s+)?(?:up)?on\s+(?:reasonable\s+)?request"
    r"|upon\s+reasonable\s+request",
    re.IGNORECASE,
)
_SUPP_RE = re.compile(
    r"(?:within|in)\s+(?:the\s+)?(?:article|paper|manuscript|sup(?:plementary|porting)\s+"
    r"(?:information|materials?|data|files?))",
    re.IGNORECASE,
)


def _find_accessions(text: str, section: str = "unknown") -> List[Accession]:
    found: List[Accession] = []
    seen = set()
    for repo, rx, url_t in _ACCESSION_SPECS:
        for m in rx.finditer(text):
            acc = m.group(1)
            key = (repo, acc.lower())
            if key in seen:
                continue
            seen.add(key)
            found.append(Accession(repo, acc, url_t.format(a=acc), section, m.start()))
    return found


def _locate_statement(text: str) -> str:
    """Grab the data-availability statement text (heading section or the matching phrase)."""
    m = _DAS_HEADING_RE.search(text)
    if m:
        return text[m.start(): m.start() + 600].strip()
    m = _DAS_PHRASE_RE.search(text)
    if m:
        start = max(0, m.start() - 40)
        return text[start: m.end() + 200].strip()
    return ""


def extract_data_availability(text: str, section: str = "unknown") -> DataAvailability:
    """Extract structured accessions + classify the paper's data-availability posture."""
    if not text:
        return DataAvailability(has_statement=False, availability_class="none")

    accessions = _find_accessions(text, section)
    statement = _locate_statement(text)
    on_request = bool(_ON_REQUEST_RE.search(text))
    has_supp_pointer = bool(_SUPP_RE.search(statement or text))
    has_statement = bool(statement) or bool(accessions) or on_request

    if accessions:
        av_class = "open_accession"
    elif has_supp_pointer and not on_request:
        av_class = "in_paper_supp"
    elif on_request:
        av_class = "on_request"
    elif statement:
        av_class = "statement_only"
    else:
        av_class = "none"

    notes: List[str] = []
    if on_request and accessions:
        notes.append("mentions both an accession and 'on request'; treated as open_accession")
    return DataAvailability(
        has_statement=has_statement,
        availability_class=av_class,
        accessions=accessions,
        statement_text=statement,
        on_request_only=(av_class == "on_request"),
        notes=notes,
    )


def extract_from_sections(sections) -> DataAvailability:
    """Run over ParsedManuscript-style sections (.name/.text); merge into one result.

    Prefers an explicit data-availability section if present; otherwise scans all text.
    """
    full = []
    das_section_text = ""
    for sec in sections:
        name = getattr(sec, "name", "") or ""
        text = getattr(sec, "text", "") or ""
        full.append(text)
        if re.search(r"data|availab|accessib", name, re.IGNORECASE):
            das_section_text += "\n" + text
    joined = "\n".join(full)
    result = extract_data_availability(joined)
    if das_section_text.strip():
        # tighten the statement to the dedicated section when we have one
        ds = extract_data_availability(das_section_text, section="data_availability")
        if ds.statement_text:
            result.statement_text = ds.statement_text
    return result
