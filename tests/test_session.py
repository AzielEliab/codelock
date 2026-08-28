"""Source immutability, Normalize with gate closed, CodeLock gated."""

from __future__ import annotations

from pathlib import Path

import pytest

from codelock.gate import ACK_PHRASE, GateClosedError
from codelock.session import CodeLockSession


def test_source_immutability_after_render_and_export(tmp_path: Path, python_snippet: str) -> None:
    session = CodeLockSession(python_snippet, seed=3, hue=True)
    original = session.source
    _ = session.normalize_html()
    session.export_normal(tmp_path / "a.txt")
    with pytest.raises(GateClosedError):
        session.codelock_html()
    session.open_gate(ACK_PHRASE)
    _ = session.codelock_html()
    session.export_codelock(tmp_path / "a.html")
    assert session.source == original
    assert session.source == python_snippet
    assert original == python_snippet


def test_normalize_always_works_with_gate_closed(python_snippet: str) -> None:
    session = CodeLockSession(python_snippet)
    assert session.gate_open is False
    html = session.normalize_html()
    assert "monospace" in html.lower()
    assert python_snippet.split("\n", 1)[0] in html or "def greet" in html
    assert session.gate_open is False


def test_codelock_render_raises_when_closed() -> None:
    session = CodeLockSession("print(1)")
    with pytest.raises(GateClosedError):
        session.codelock_html()
    with pytest.raises(GateClosedError):
        session.styles()


def test_export_codelock_raises_when_closed(tmp_path: Path) -> None:
    session = CodeLockSession("print(1)")
    with pytest.raises(GateClosedError):
        session.export_codelock(tmp_path / "x.html")
    assert not (tmp_path / "x.html").exists()


def test_codelock_render_works_when_open() -> None:
    session = CodeLockSession("print(1)", seed=1)
    session.open_gate(ACK_PHRASE)
    html = session.codelock_html()
    assert "print" in html
    assert "non-canonical" in html.lower()
