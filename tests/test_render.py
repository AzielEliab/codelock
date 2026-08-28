"""Rosetta determinism, hue flag, Normalize has no size/rotation variance."""

from __future__ import annotations

from codelock.gate import ACK_PHRASE
from codelock.render import styles_for
from codelock.session import CodeLockSession
from codelock.tokenize import tokenize


def test_same_seed_same_styles_different_seed_differs(python_snippet: str) -> None:
    tokens = tokenize(python_snippet)
    a = styles_for(tokens, seed=7, hue=True)
    b = styles_for(tokens, seed=7, hue=True)
    c = styles_for(tokens, seed=8, hue=True)
    assert a == b
    assert a != c


def test_same_seed_same_html(python_snippet: str) -> None:
    s1 = CodeLockSession(python_snippet, seed="abc", hue=True)
    s2 = CodeLockSession(python_snippet, seed="abc", hue=True)
    s1.open_gate(ACK_PHRASE)
    s2.open_gate(ACK_PHRASE)
    assert s1.codelock_html() == s2.codelock_html()
    s3 = CodeLockSession(python_snippet, seed="xyz", hue=True)
    s3.open_gate(ACK_PHRASE)
    assert s1.codelock_html() != s3.codelock_html()


def test_hue_off_no_color_in_styles(python_snippet: str) -> None:
    tokens = tokenize(python_snippet)
    styles = styles_for(tokens, seed=1, hue=False)
    assert styles
    assert all(st["hue_deg"] is None for st in styles)
    session = CodeLockSession(python_snippet, seed=1, hue=False)
    session.open_gate(ACK_PHRASE)
    html = session.codelock_html()
    assert "hsl(" not in html.lower()
    # no per-token color:
    assert "color:hsl" not in html


def test_hue_on_has_hue(python_snippet: str) -> None:
    tokens = tokenize(python_snippet)
    styles = styles_for(tokens, seed=1, hue=True)
    assert any(st["hue_deg"] is not None for st in styles)
    session = CodeLockSession(python_snippet, seed=1, hue=True)
    session.open_gate(ACK_PHRASE)
    html = session.codelock_html()
    assert "hsl(" in html


def test_normalize_html_monospace_no_variance(python_snippet: str) -> None:
    session = CodeLockSession(python_snippet, seed=99, hue=True)
    html = session.normalize_html()
    low = html.lower()
    assert "monospace" in low
    assert "rotate(" not in low
    assert "hsl(" not in low
    # A single font-size on the pre is fine; no per-token size variance.
    assert "class=\"tok\"" not in html
    assert html.count("font-size:") <= 2
    assert 'data-canonical="true"' in html


def test_style_ranges() -> None:
    tokens = tokenize("alpha beta gamma delta epsilon zeta eta theta")
    styles = styles_for(tokens, seed=0, hue=True)
    for st in styles:
        assert 11 <= st["font_size_px"] <= 22
        assert -4.0 <= st["rotate_deg"] <= 4.0
        assert -0.08 <= st["letter_spacing_em"] <= 0.08
        assert -0.08 <= st["word_spacing_em"] <= 0.08
        assert st["hue_deg"] is None or 0 <= st["hue_deg"] < 360
