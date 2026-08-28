#!/usr/bin/env python3
"""Open the gate and write Normalize + CodeLock HTML. No GUI."""

from __future__ import annotations

from pathlib import Path

from codelock.gate import ACK_PHRASE
from codelock.session import CodeLockSession

OUT = Path(__file__).resolve().parent / "_out"

SNIPPET = '''\
def greet(name: str) -> str:
    """Say hello. This is the canonical source."""
    # comment: presentation is not meaning
    return f"hello {name}"


if __name__ == "__main__":
    print(greet("Aziel"))
'''


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    session = CodeLockSession(SNIPPET, seed=7, hue=True)
    (OUT / "source.py").write_text(SNIPPET, encoding="utf-8")
    session.export_normal(OUT / "source.txt")
    (OUT / "normalize.html").write_text(session.normalize_html(), encoding="utf-8")
    session.open_gate(ACK_PHRASE)
    session.export_codelock(OUT / "codelock.html")
    assert session.source == SNIPPET
    print(f"wrote {OUT}")
    print("gate open; normalize + codelock HTML ready")


if __name__ == "__main__":
    main()
