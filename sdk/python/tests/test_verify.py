"""Tests for the verify module (raw-data manuscript verification, /api/v1/verify/*).

All requests go through an in-memory httpx.MockTransport (the ``client_factory``
fixture), so nothing touches the network or needs a running backend.
"""

from __future__ import annotations

import httpx
import pytest

from stickforstats.models import VerificationReport

# A representative /verify/bundle/ response (shape mirrors the backend verbatim).
_SAMPLE = {
    "n_claims": 2,
    "verdict_distribution": {"VERIFIED": 1, "DISCREPANT": 1},
    "verifiability_rate": 1.0,
    "coverage": 0.9,
    "n_checkable": 2,
    "n_citation_conflicts": 1,
    "certify_note": "This report checks ... It does NOT certify the scientific validity ...",
    "run_id": "run-1",
    "report_token": "tok-1",
    "claims": [
        {
            "claim_id": "C001", "verdict": "VERIFIED",
            "claimed": {"p_value": 0.04},
            "recomputed": {"test": "independent_t", "p_value": 0.041},
            "provenance": {"source_file": "m.txt", "link_method": "content"}, "notes": [],
        },
        {
            "claim_id": "C002", "verdict": "DISCREPANT",
            "claimed": {"p_value": 0.01}, "recomputed": {"test": "pearson", "p_value": 0.7},
            "provenance": {"source_file": "m.txt", "link_method": "conflict",
                           "resolved_reference": "Supplementary Table S3"},
            "notes": ["citation-content conflict: the cited data does not reproduce the result"],
        },
    ],
    "ingestion": {
        "n_files": 2, "n_manuscript_files": 1, "n_data_files": 1, "n_image_files": 0,
        "files": [
            {"name": "m.txt", "kind": "manuscript", "ok": True, "role": "manuscript_text"},
            {"name": "d.csv", "kind": "data", "ok": True, "n_rows": 10, "n_cols": 3},
        ],
        "warnings": [],
    },
}


def test_bundle_posts_repeated_files_field(client_factory, tmp_path):
    manuscript = tmp_path / "m.txt"
    manuscript.write_text("Results. An independent t-test, t(38) = 2.10, p = 0.04.")
    data = tmp_path / "d.csv"
    data.write_text("a,b\n1,2\n3,4\n")

    seen: dict[str, object] = {}

    def handler(req: httpx.Request) -> httpx.Response:
        seen["path"] = req.url.path
        seen["content_type"] = req.headers.get("content-type", "")
        seen["body"] = req.content
        return httpx.Response(200, json=_SAMPLE)

    client = client_factory(handler)
    report = client.verify.bundle([str(manuscript), str(data)], title="My paper")

    assert seen["path"] == "/api/v1/verify/bundle/"
    assert "multipart/form-data" in seen["content_type"]
    # both files are sent under the SAME repeated "files" field name
    assert seen["body"].count(b'name="files"') == 2
    assert b"My paper" in seen["body"]  # title threaded through
    assert isinstance(report, VerificationReport)
    assert report.n_claims == 2
    assert report.run_id == "run-1"
    assert report.report_token == "tok-1"


def test_bundle_parses_verdicts_conflicts_and_ingestion(client_factory, tmp_path):
    f = tmp_path / "m.txt"
    f.write_text("x")
    client = client_factory(lambda req: httpx.Response(200, json=_SAMPLE))

    report = client.verify.bundle([str(f)])

    assert report.verdict_distribution == {"VERIFIED": 1, "DISCREPANT": 1}
    # the .conflicts convenience surfaces the citation-content conflict claim
    assert [c.claim_id for c in report.conflicts] == ["C002"]
    assert report.claims[1].recomputed["test"] == "pearson"
    assert report.ingestion is not None
    assert report.ingestion.n_data_files == 1
    assert report.ingestion.files[1].n_rows == 10


def test_bundle_requires_at_least_one_file(client_factory):
    client = client_factory(lambda req: httpx.Response(200, json={}))
    with pytest.raises(ValueError):
        client.verify.bundle([])


def test_analyze_text_only_sends_form_field(client_factory):
    seen: dict[str, object] = {}

    def handler(req: httpx.Request) -> httpx.Response:
        seen["path"] = req.url.path
        seen["body"] = req.content
        return httpx.Response(200, json=_SAMPLE)

    client = client_factory(handler)
    report = client.verify.analyze(text="Results. r = 0.46, p = 0.011.")

    assert seen["path"] == "/api/v1/verify/analyze/"
    assert b"text" in seen["body"]
    assert report.n_claims == 2


def test_analyze_with_file_and_data_posts_multipart(client_factory, tmp_path):
    paper = tmp_path / "paper.txt"
    paper.write_text("Results. t(58) = 3.4, p = 0.001.")
    data = tmp_path / "data.csv"
    data.write_text("group,score\nA,1\nB,2\n")

    seen: dict[str, object] = {}

    def handler(req: httpx.Request) -> httpx.Response:
        seen["content_type"] = req.headers.get("content-type", "")
        seen["body"] = req.content
        return httpx.Response(200, json=_SAMPLE)

    client = client_factory(handler)
    client.verify.analyze(file_path=str(paper), data_path=str(data))

    assert "multipart/form-data" in seen["content_type"]
    assert b'name="file"' in seen["body"]
    assert b'name="data"' in seen["body"]


def test_analyze_rejects_both_or_neither(client_factory):
    client = client_factory(lambda req: httpx.Response(200, json={}))
    with pytest.raises(ValueError):
        client.verify.analyze()
    with pytest.raises(ValueError):
        client.verify.analyze(file_path="x", text="y")


def test_report_is_token_gated_get(client_factory):
    seen: dict[str, object] = {}

    def handler(req: httpx.Request) -> httpx.Response:
        seen["path"] = req.url.path
        seen["query"] = dict(req.url.params)
        return httpx.Response(200, json=_SAMPLE)

    client = client_factory(handler)
    report = client.verify.report("run-1", "tok-1")

    assert seen["path"] == "/api/v1/verify/report/run-1/"
    assert seen["query"]["token"] == "tok-1"
    assert report.run_id == "run-1"


def test_client_exposes_verify_module(client_factory):
    client = client_factory(lambda req: httpx.Response(200, json={}))
    from stickforstats.verify import VerifyModule

    assert isinstance(client.verify, VerifyModule)
