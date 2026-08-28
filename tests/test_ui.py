"""Local UI: loopback only, GET / contains CodeLock."""

from __future__ import annotations

import threading
import urllib.request

import pytest

from codelock.cli import _build_parser
from codelock.gate import ACK_PHRASE
from codelock.ui import DEFAULT_HOST, DEFAULT_PORT, LOOPBACK, make_server


def test_cli_ui_defaults() -> None:
    args = _build_parser().parse_args(["ui"])
    assert args.host == "127.0.0.1"
    assert args.host == DEFAULT_HOST
    assert args.port == 8762
    assert args.port == DEFAULT_PORT


def test_ui_rejects_non_loopback() -> None:
    with pytest.raises(ValueError, match="loopback"):
        make_server("0.0.0.0", 9)
    assert "127.0.0.1" in LOOPBACK


def test_ui_get_root_200_contains_codelock() -> None:
    httpd = make_server("127.0.0.1", 0)
    port = httpd.server_address[1]
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/", timeout=5) as resp:
            assert resp.status == 200
            html = resp.read()
        assert b"CodeLock" in html
        assert ACK_PHRASE.encode("utf-8") in html
        assert b"127.0.0.1" in html
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=5) as resp:
            import json

            payload = json.loads(resp.read().decode("utf-8"))
        assert payload["ok"] is True
        assert payload["bind_host"] == "127.0.0.1"
    finally:
        httpd.shutdown()
        httpd.server_close()
        thread.join(timeout=2)
