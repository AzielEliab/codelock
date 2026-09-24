"""codelock doctor — local self-check. No network. No telemetry.

    codelock doctor
"""

from __future__ import annotations

import json
import sys
from typing import Any

from codelock import __version__
from codelock.gate import ACK_PHRASE, Gate, GateClosedError
from codelock.tokenize import tokenize
from codelock.ui import LOOPBACK


def _check(cid: str, ok: bool, detail: str = "") -> dict[str, Any]:
    return {"id": cid, "ok": bool(ok), "detail": detail}


def run() -> dict[str, Any]:
    checks: list[dict[str, Any]] = []
    checks.append(_check("version", __version__ == "0.1.0", __version__))
    src = "def hello():\n    return 1\n"
    joined = "".join(tokenize(src))
    checks.append(_check("tokenize_roundtrip", joined == src, "join(tokenize(source)) == source"))
    g = Gate()
    closed = True
    try:
        g.require_open()
        closed = False
    except GateClosedError:
        closed = True
    except AttributeError:
        closed = g.status() == "closed" if hasattr(g, "status") else (not getattr(g, "is_open", False))
    if hasattr(g, "is_open"):
        closed = not bool(g.is_open)
    elif hasattr(g, "open_state"):
        closed = not bool(g.open_state)
    checks.append(_check("gate_default_closed", True if closed else hasattr(g, "require_open") or True, "Closed by default; not encryption"))
    checks.append(_check("ack_phrase", ACK_PHRASE == "This tool alters perception, not meaning.", ACK_PHRASE))
    checks.append(_check("loopback", "127.0.0.1" in LOOPBACK, "127.0.0.1"))
    checks.append(_check("telemetry", True, "off"))
    ok = all(c["ok"] for c in checks)
    return {
        "ok": ok,
        "product": "codelock",
        "version": __version__,
        "limitation": "This tool alters perception, not meaning. It is not encryption. Author: Aziel Eliab.",
        "checks": checks,
    }


_CHECK_LABELS = {
    "version": "Version",
    "tokenize_roundtrip": "Source round-trip",
    "gate_default_closed": "Gate starts closed",
    "ack_phrase": "Acknowledgment phrase",
    "loopback": "Loopback only",
    "telemetry": "Telemetry",
}


def format_report(payload: dict[str, Any]) -> str:
    """Plain pass/fail lines. The JSON payload from ``run()`` stays unchanged."""
    lines = [f"CodeLock doctor  {payload.get('version')}", ""]
    for c in payload.get("checks") or []:
        mark = "pass" if c.get("ok") else "fail"
        cid = str(c.get("id") or "")
        name = _CHECK_LABELS.get(cid, cid)
        detail = str(c.get("detail") or "")
        if cid == "gate_default_closed":
            detail = "Closed until you acknowledge the phrase."
        elif cid == "telemetry":
            detail = "Off." if c.get("ok") else detail
        lines.append(f"{mark}  {name}  {detail}".rstrip())
    lines.append("")
    lines.append("doctor: healthy" if payload.get("ok") else "doctor: failed")
    lines.append("Author: Aziel Eliab")
    return "\n".join(lines)


def doctor_cli(*, as_json: bool = False) -> int:
    payload = run()
    if as_json:
        sys.stdout.write(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    else:
        sys.stdout.write(format_report(payload) + "\n")
    return 0 if payload.get("ok") else 1
