"""Shared fixtures. No network, no GUI."""

from __future__ import annotations

import pytest

from codelock.gate import ACK_PHRASE

PYTHON_SNIPPET = '''\
def greet(name: str) -> str:
    """Say hello."""
    # comment with "quotes" and café
    x = 1.5e-3
    if name in {"Aziel", "Eliab"}:
        return f"hello {name}"
    return "hello"
'''

UNICODE = "café 日本語 ✨ — naïve\tπ\n"

MIXED_WS = "a \t\t b\r\n\n  c \n"

EMPTY = ""


@pytest.fixture
def ack() -> str:
    return ACK_PHRASE


@pytest.fixture
def python_snippet() -> str:
    return PYTHON_SNIPPET


@pytest.fixture
def unicode_text() -> str:
    return UNICODE


@pytest.fixture
def mixed_ws() -> str:
    return MIXED_WS
