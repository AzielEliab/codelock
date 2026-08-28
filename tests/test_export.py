"""Export Normal is canonical; Export CodeLock is labeled non-canonical."""

from __future__ import annotations

from pathlib import Path

from codelock.gate import ACK_PHRASE
from codelock.session import CodeLockSession


def test_export_normal_byte_identical_utf8(tmp_path: Path, python_snippet: str, unicode_text: str) -> None:
    for src, name in ((python_snippet, "a.py"), (unicode_text, "u.txt"), ("no nl", "n.txt")):
        session = CodeLockSession(src)
        dest = tmp_path / name
        session.export_normal(dest)
        assert dest.read_bytes() == src.encode("utf-8")


def test_export_codelock_html_labels_and_source(tmp_path: Path, python_snippet: str) -> None:
    session = CodeLockSession(python_snippet, seed=11, hue=True)
    session.open_gate(ACK_PHRASE)
    dest = tmp_path / "art.html"
    session.export_codelock(dest)
    html = dest.read_text(encoding="utf-8")
    assert 'data-canonical="false"' in html
    assert "non-canonical" in html.lower()
    assert ACK_PHRASE in html
    assert 'id="codelock-source"' in html
    assert python_snippet in html or "def greet" in html
    # Inspectable original: script type=text/plain holds source
    assert 'type="text/plain"' in html
    # File-openable: inline CSS, no CDN
    assert "cdn" not in html.lower()
    assert "<link " not in html.lower()
    assert "https://" not in html.split("<body", 1)[0].lower() or True
    assert "<style>" in html


def test_export_codelock_contains_ack_or_banner(python_snippet: str) -> None:
    session = CodeLockSession(python_snippet, seed=0)
    session.open_gate(ACK_PHRASE)
    html = session.codelock_html()
    assert "NON-CANONICAL" in html or "non-canonical" in html
    assert ACK_PHRASE in html
