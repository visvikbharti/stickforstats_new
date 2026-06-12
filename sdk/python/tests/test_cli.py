"""Tests for the CLI: config robustness, data-file parsing, and command wiring.

Skipped entirely if the optional CLI dependencies (click, rich) are not installed.
"""

from __future__ import annotations

import json

import pytest

pytest.importorskip("click")
pytest.importorskip("rich")

from click.testing import CliRunner  # noqa: E402

from stickforstats import cli  # noqa: E402


@pytest.fixture(autouse=True)
def _isolate_config(tmp_path, monkeypatch):
    """Point the CLI's config at a temp dir so tests never touch the real ~/.stickforstats."""
    cfg_dir = tmp_path / ".stickforstats"
    monkeypatch.setattr(cli, "CONFIG_DIR", cfg_dir)
    monkeypatch.setattr(cli, "CONFIG_FILE", cfg_dir / "config.json")
    return cfg_dir


def test_load_config_missing_returns_empty():
    assert cli._load_config() == {}


def test_load_config_tolerates_corrupt_file(_isolate_config):
    _isolate_config.mkdir(parents=True)
    (_isolate_config / "config.json").write_text("{ this is not valid json ]")
    assert cli._load_config() == {}  # must not raise


def test_save_then_load_roundtrip():
    cli._save_config({"base_url": "http://h/api/v1", "api_key": "k"})
    assert cli._load_config()["base_url"] == "http://h/api/v1"


def test_read_data_file_csv(tmp_path):
    f = tmp_path / "d.csv"
    f.write_text("a,b\n1,2\n3,4\n")
    cols = cli._read_data_file(str(f))
    assert cols == {"a": [1.0, 3.0], "b": [2.0, 4.0]}


def test_read_data_file_csv_non_numeric_becomes_nan(tmp_path):
    f = tmp_path / "d.csv"
    f.write_text("a\n1\nx\n")
    import math
    vals = cli._read_data_file(str(f))["a"]
    assert vals[0] == 1.0 and math.isnan(vals[1])


def test_read_data_file_json(tmp_path):
    f = tmp_path / "d.json"
    f.write_text(json.dumps({"g1": [1, 2], "g2": [3, 4]}))
    assert cli._read_data_file(str(f)) == {"g1": [1, 2], "g2": [3, 4]}


def test_read_data_file_unsupported(tmp_path):
    f = tmp_path / "d.txt"
    f.write_text("hi")
    with pytest.raises(cli.click.ClickException):
        cli._read_data_file(str(f))


def test_cli_version():
    result = CliRunner().invoke(cli.main, ["--version"])
    assert result.exit_code == 0
    assert "0." in result.output  # prints the package version


def test_config_show_empty():
    result = CliRunner().invoke(cli.main, ["config", "--show"])
    assert result.exit_code == 0
    assert "No configuration" in result.output


def test_config_set_and_show_masks_key():
    runner = CliRunner()
    assert runner.invoke(cli.main, ["config", "--api-key", "tok_abcdefgh1234"]).exit_code == 0
    out = runner.invoke(cli.main, ["config", "--show"]).output
    assert "tok_" in out and "abcdefgh" not in out  # masked


def test_analyze_smoke_with_mocked_client(tmp_path, monkeypatch):
    f = tmp_path / "d.csv"
    f.write_text("control,treatment\n1,4\n2,5\n3,6\n")

    class _FakeStats:
        def ttest(self, **kwargs):
            return {"t_statistic": 1.23, "p_value": 0.42, "guardian": {"passed": True}}

    class _FakeClient:
        stats = _FakeStats()

        def close(self):
            pass

    monkeypatch.setattr(cli, "_make_client", lambda **kw: _FakeClient())
    result = CliRunner().invoke(cli.main, ["analyze", "-f", str(f), "-t", "ttest"])
    assert result.exit_code == 0
    assert "t_statistic" in result.output


def test_analyze_reports_error_with_exit_1(tmp_path, monkeypatch):
    f = tmp_path / "d.csv"
    f.write_text("a,b\n1,2\n")

    from stickforstats.exceptions import ConnectionError as SFSConnectionError

    class _FailStats:
        def ttest(self, **kwargs):
            raise SFSConnectionError("Could not connect to the StickForStats API")

    class _FailClient:
        stats = _FailStats()

        def close(self):
            pass

    monkeypatch.setattr(cli, "_make_client", lambda **kw: _FailClient())
    result = CliRunner().invoke(cli.main, ["analyze", "-f", str(f), "-t", "ttest"])
    assert result.exit_code == 1
    assert "Could not connect" in result.output
