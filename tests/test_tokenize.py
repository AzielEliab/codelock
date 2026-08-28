"""Token roundtrip: join(tokens) == original."""

from __future__ import annotations

import pytest

from codelock.tokenize import tokenize, tokenize_kinds
from tests.conftest import EMPTY, MIXED_WS, PYTHON_SNIPPET, UNICODE


@pytest.mark.parametrize(
    "source",
    [
        EMPTY,
        " ",
        "\n",
        MIXED_WS,
        UNICODE,
        PYTHON_SNIPPET,
        "x = 1 + 2",
        "# only a comment",
        'print("hi")',
        "/* c comment */ then ident",
        "// slash comment\ncode",
        "a" * 4000,
        "def",
        "123 456.7",
        "\0binary?\x01",
    ],
)
def test_token_roundtrip(source: str) -> None:
    tokens = tokenize(source)
    assert "".join(tokens) == source


def test_empty_is_no_tokens() -> None:
    assert tokenize("") == []
    assert tokenize_kinds("") == []


def test_keywords_and_comments_labeled() -> None:
    kinds = tokenize_kinds(PYTHON_SNIPPET)
    labels = {t.kind for t in kinds}
    assert "keyword" in labels
    assert "comment" in labels
    assert "string" in labels
    assert "whitespace" in labels
    assert "identifier" in labels


def test_whitespace_preserved_exactly() -> None:
    src = "a  \t\nb"
    tokens = tokenize(src)
    assert any("\t" in t for t in tokens)
    assert "".join(tokens) == src
