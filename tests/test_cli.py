"""CLI: version, export normal, closed-gate failure, open-gate render."""

from __future__ import annotations

from pathlib import Path

from codelock import __version__
from codelock.cli import main
from codelock.gate import ACK_PHRASE


def test_cli_version(capsys) -> None:
    assert main(["version"]) == 0
    assert capsys.readouterr().out.strip() == f"codelock {__version__}"


def test_cli_export_normal(tmp_path: Path, python_snippet: str, capsys) -> None:
    inp = tmp_path / "in.py"
    outp = tmp_path / "out.txt"
    inp.write_text(python_snippet, encoding="utf-8")
    rc = main(["export", "--in", str(inp), "--kind", "normal", "--out", str(outp)])
    assert rc == 0
    assert outp.read_bytes() == python_snippet.encode("utf-8")
    capsys.readouterr()


def test_cli_closed_gate_failure(tmp_path: Path, python_snippet: str, capsys) -> None:
    inp = tmp_path / "in.py"
    out_html = tmp_path / "out.html"
    inp.write_text(python_snippet, encoding="utf-8")
    rc = main(
        [
            "render",
            "--in",
            str(inp),
            "--mode",
            "codelock",
            "--out",
            str(out_html),
        ]
    )
    assert rc != 0
    assert not out_html.exists()
    err = capsys.readouterr().err
    assert "Closed" in err or "gate" in err.lower() or "perception" in err.lower()

    rc2 = main(
        [
            "export",
            "--in",
            str(inp),
            "--kind",
            "codelock",
            "--out",
            str(out_html),
        ]
    )
    assert rc2 != 0
    assert not out_html.exists()


def test_cli_open_gate_render(tmp_path: Path, python_snippet: str, capsys) -> None:
    inp = tmp_path / "in.py"
    out_html = tmp_path / "out.html"
    inp.write_text(python_snippet, encoding="utf-8")
    rc = main(
        [
            "render",
            "--in",
            str(inp),
            "--mode",
            "codelock",
            "--out",
            str(out_html),
            "--seed",
            "5",
            "--ack",
            ACK_PHRASE,
        ]
    )
    assert rc == 0
    html = out_html.read_text(encoding="utf-8")
    assert "non-canonical" in html.lower()
    capsys.readouterr()


def test_cli_normalize_without_ack(tmp_path: Path, python_snippet: str) -> None:
    inp = tmp_path / "in.py"
    out_html = tmp_path / "n.html"
    inp.write_text(python_snippet, encoding="utf-8")
    rc = main(
        [
            "render",
            "--in",
            str(inp),
            "--mode",
            "normalize",
            "--out",
            str(out_html),
        ]
    )
    assert rc == 0
    html = out_html.read_text(encoding="utf-8")
    assert "monospace" in html.lower()
    assert "rotate(" not in html.lower()


def test_cli_gate_status_and_open_gate(capsys) -> None:
    assert main(["gate-status"]) == 0
    assert "closed" in capsys.readouterr().out.lower()
    assert main(["open-gate", "--ack", ACK_PHRASE]) == 0
    assert "open" in capsys.readouterr().out.lower()
    rc = main(["open-gate", "--ack", "nope"])
    assert rc != 0
    captured = capsys.readouterr()
    assert "closed" in captured.out.lower() or "error" in captured.err.lower()


def test_cli_ack_env(tmp_path: Path, python_snippet: str, monkeypatch) -> None:
    inp = tmp_path / "in.py"
    out_html = tmp_path / "out.html"
    inp.write_text(python_snippet, encoding="utf-8")
    monkeypatch.setenv("CODELOCK_ACK", ACK_PHRASE)
    rc = main(
        [
            "render",
            "--in",
            str(inp),
            "--mode",
            "codelock",
            "--out",
            str(out_html),
            "--seed",
            "1",
        ]
    )
    assert rc == 0
    assert out_html.exists()
