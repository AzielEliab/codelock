"""Landing page: one primary Download, focus, footer, and color scheme.

The counted /download route and the mesh strip stay in place.
"""

from __future__ import annotations

from pathlib import Path

HOME = (Path(__file__).resolve().parents[1] / "workers/download-tracker/src/index.js").read_text(
    encoding="utf-8"
)


def test_primary_download_is_the_hero_link() -> None:
    assert 'id="download"' in HOME
    assert 'href="/download?asset=${DEFAULT_ASSET}"' in HOME
    assert "Download" in HOME
    assert "Two big buttons" not in HOME
    hero = HOME.split('<header class="hero">', 1)[1].split("</header>", 1)[0]
    assert 'id="download"' in hero
    assert 'id="meshStrip"' not in hero


def test_keyboard_focus_footer_and_color_scheme() -> None:
    assert ":focus-visible" in HOME
    assert "outline: 2px solid var(--focus)" in HOME
    assert '<footer class="quiet">' in HOME
    assert "Apache-2.0 · Aziel Eliab · CodeLock 0.1.0" in HOME
    assert "@media (prefers-color-scheme: light)" in HOME
    assert "color-scheme: light" in HOME
    assert "color-scheme: dark" in HOME


def test_existing_counters_and_mesh_controls_remain() -> None:
    assert 'id="install-btn"' in HOME
    assert 'id="install-cmd"' in HOME
    assert "<span>Views</span>" in HOME
    assert "<span>Downloads</span>" in HOME
    assert 'id="meshBearer"' in HOME
    assert 'id="meshEnable"' in HOME
    assert 'id="meshDisable"' in HOME
    assert 'id="meshJoin"' in HOME
    assert 'id="meshLeave"' in HOME
    assert 'href="/openapi.json"' in HOME
    assert 'href="/mcp"' in HOME
    assert 'href="/v1/skill"' in HOME
