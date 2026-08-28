"""Gate tethering: exact phrase, Closed vs Open."""

from __future__ import annotations

import pytest

from codelock.gate import ACK_PHRASE, AcknowledgmentError, Gate, GateClosedError
from codelock.session import CodeLockSession


def test_gate_starts_closed() -> None:
    g = Gate()
    assert g.gate_open is False
    assert g.is_open is False
    with pytest.raises(GateClosedError):
        g.require_open()


def test_open_gate_wrong_phrase_fails() -> None:
    session = CodeLockSession("x = 1")
    with pytest.raises((AcknowledgmentError, ValueError)):
        session.open_gate("I agree")
    assert session.gate_open is False
    with pytest.raises((AcknowledgmentError, ValueError)):
        session.open_gate(ACK_PHRASE + " please")
    assert session.gate_open is False


def test_open_gate_exact_phrase_opens() -> None:
    session = CodeLockSession("x = 1")
    session.open_gate(ACK_PHRASE)
    assert session.gate_open is True
    assert session.gate.gate_open is True


def test_open_gate_strips_surrounding_whitespace() -> None:
    g = Gate()
    g.open(f"  {ACK_PHRASE}  ")
    assert g.gate_open is True


def test_cannot_assign_gate_open_to_skip_ack() -> None:
    g = Gate()
    with pytest.raises(AttributeError):
        g.gate_open = True  # type: ignore[misc]
    assert g.gate_open is False
