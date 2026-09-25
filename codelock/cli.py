"""Command-line interface for CodeLock.

Human sentences are the default. Pass ``--json`` for machine-readable output.

    codelock
    codelock ui [--host 127.0.0.1] [--port 8762]
    codelock render --in FILE --mode normalize|codelock --out FILE.html [--seed N] [--hue/--no-hue] [--ack "..."]
    codelock export --in FILE --kind normal|codelock --out FILE [--seed N] [--ack "..."]
    codelock gate-status
    codelock doctor [--json]
    codelock version

    advanced:
    codelock open-gate --ack "This tool alters perception, not meaning."
    codelock watch PATH   # file or - (stdin); pipe from vim/vscode

The gate is per-invocation. Pass ``--ack`` or set env ``CODELOCK_ACK`` to
the exact acknowledgment phrase. Default is Closed. Normalize and
export-normal never need an ack.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Sequence

from codelock import __version__
from codelock.gate import ACK_PHRASE, AcknowledgmentError, Gate, GateClosedError
from codelock.session import CodeLockSession

_JSON_HELP = "Print JSON for scripts."


class UserError(Exception):
    """A misuse a person can fix. ``next_step`` is one plain command or action."""

    def __init__(self, message: str, next_step: str) -> None:
        super().__init__(message)
        self.next_step = next_step


class CodeLockHelpFormatter(argparse.RawDescriptionHelpFormatter):
    """Command list like git: names and one-line summaries, no metavar row."""

    def _format_action(self, action: argparse.Action) -> str:
        if isinstance(action, argparse._SubParsersAction):
            chunks: list[str] = []
            for sub in action._get_subactions():
                chunks.append(super()._format_action(sub))
            return "".join(chunks)
        return super()._format_action(action)


class CodeLockArgumentParser(argparse.ArgumentParser):
    def error(self, message: str) -> None:
        self.exit(2, _friendly_arg_error(self.prog, message) + "\n")


def _json_parent() -> argparse.ArgumentParser:
    parent = argparse.ArgumentParser(add_help=False)
    parent.add_argument("--json", action="store_true", dest="as_json", help=_JSON_HELP)
    return parent


def _build_parser() -> argparse.ArgumentParser:
    common = _json_parent()
    parser = CodeLockArgumentParser(
        prog="codelock",
        usage="codelock [--json] [<command>] [<args>]",
        description=(
            "See the same source as a plain view and as a CodeLock view.\n"
            "Author: Aziel Eliab."
        ),
        epilog=(
            "examples:\n"
            "  codelock\n"
            "  codelock ui\n"
            "  codelock render --in snippet.py --mode normalize --out snippet.html\n"
            "  codelock doctor\n"
            "\n"
            "Open http://127.0.0.1:8762/ after codelock ui.\n"
            "Add --json to any command for JSON."
        ),
        formatter_class=CodeLockHelpFormatter,
        parents=[common],
    )
    sub = parser.add_subparsers(dest="cmd", title="commands", metavar="<command>")

    p_ui = sub.add_parser(
        "ui",
        parents=[_json_parent()],
        help="Open the local app at http://127.0.0.1:8762/.",
    )
    p_ui.add_argument("--host", default="127.0.0.1", help="Bind host (default 127.0.0.1).")
    p_ui.add_argument("--port", type=int, default=8762, help="Bind port (default 8762).")

    p_render = sub.add_parser(
        "render",
        parents=[_json_parent()],
        help="Write a plain HTML view, or a CodeLock HTML view.",
    )
    p_render.add_argument("--in", dest="inp", required=True, help="Input source file.")
    p_render.add_argument(
        "--mode",
        required=True,
        choices=("normalize", "codelock"),
        help="normalize is always available; codelock requires an open gate.",
    )
    p_render.add_argument("--out", dest="out", required=True, help="Output HTML path.")
    p_render.add_argument("--seed", default="0", help="Deterministic seed (default 0).")
    p_render.add_argument(
        "--hue",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Hue spectrum on tokens (default: on). --no-hue disables color.",
    )
    p_render.add_argument(
        "--ack",
        default=None,
        help=f"Exact phrase to open the gate: {ACK_PHRASE!r}",
    )

    p_export = sub.add_parser(
        "export",
        parents=[_json_parent()],
        help="Write canonical text, or a CodeLock HTML file.",
    )
    p_export.add_argument("--in", dest="inp", required=True, help="Input source file.")
    p_export.add_argument(
        "--kind",
        required=True,
        choices=("normal", "codelock"),
        help="normal is always available; codelock requires an open gate.",
    )
    p_export.add_argument("--out", dest="out", required=True, help="Output path.")
    p_export.add_argument("--seed", default="0", help="Deterministic seed (default 0).")
    p_export.add_argument(
        "--hue",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Hue spectrum (CodeLock kind only).",
    )
    p_export.add_argument(
        "--ack",
        default=None,
        help=f"Exact phrase to open the gate: {ACK_PHRASE!r}",
    )

    sub.add_parser(
        "gate-status",
        parents=[_json_parent()],
        help="Show whether the gate is open for this run.",
    )
    sub.add_parser(
        "doctor",
        parents=[_json_parent()],
        help="Check this install.",
    )
    sub.add_parser(
        "version",
        parents=[_json_parent()],
        help="Print the version.",
    )

    p_open = sub.add_parser(
        "open-gate",
        parents=[_json_parent()],
        help="advanced: check the acknowledgment phrase for this run.",
    )
    p_open.add_argument(
        "--ack",
        required=True,
        help=f"Exact phrase required: {ACK_PHRASE!r}",
    )

    p_watch = sub.add_parser(
        "watch",
        parents=[_json_parent()],
        help="advanced: show both views for a file, or for stdin.",
    )
    p_watch.add_argument(
        "path",
        help="File to render, or - to read stdin (pipe from vim/vscode).",
    )
    p_watch.add_argument("--seed", default="0", help="Deterministic seed (default 0).")
    p_watch.add_argument(
        "--hue",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Hue spectrum on tokens (default: on).",
    )
    p_watch.add_argument(
        "--ack",
        default=None,
        help=f"Exact phrase to open the gate for the CodeLock view: {ACK_PHRASE!r}",
    )
    return parser


def _friendly_arg_error(prog: str, message: str) -> str:
    choice = re.search(r"invalid choice: '([^']*)'", message)
    if choice and "--mode" not in message and "--kind" not in message:
        return f'Unknown command "{choice.group(1)}". Try: codelock ui   or   codelock --help'
    if choice and "--mode" in message:
        return (
            "Mode must be normalize or codelock.\n"
            "Try: codelock render --in snippet.py --mode normalize --out snippet.html"
        )
    if choice and "--kind" in message:
        return (
            "Kind must be normal or codelock.\n"
            "Try: codelock export --in snippet.py --kind normal --out snippet.txt"
        )
    if "required" in message:
        if prog.endswith(" render"):
            return (
                "Render needs an input file, a mode, and an output path.\n"
                "Try: codelock render --in snippet.py --mode normalize --out snippet.html"
            )
        if prog.endswith(" export"):
            return (
                "Export needs an input file, a kind, and an output path.\n"
                "Try: codelock export --in snippet.py --kind normal --out snippet.txt"
            )
        if prog.endswith(" open-gate"):
            return (
                "Open-gate needs the exact acknowledgment.\n"
                f'Try: codelock open-gate --ack "{ACK_PHRASE}"'
            )
        if prog.endswith(" watch"):
            return (
                "Watch needs a file path, or - to read stdin.\n"
                "Try: codelock watch snippet.py   or   codelock watch -"
            )
        return f"{message}\nTry: codelock --help"
    if message.startswith("unrecognized arguments"):
        extra = message.split(":", 1)[-1].strip()
        return f"Unknown option {extra}. Try: codelock --help"
    return f"{message}\nTry: codelock --help"


def _emit_json(payload: object) -> None:
    sys.stdout.write(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")


def _write_error(exc: BaseException, next_step: str) -> int:
    sys.stderr.write(f"error: {exc}\n")
    sys.stderr.write(f"Next: {next_step}\n")
    return 2


def _welcome_text() -> str:
    return (
        f"CodeLock {__version__}\n"
        "\n"
        "See the same source as a plain view and as a CodeLock view.\n"
        "\n"
        "Next, open the local app:\n"
        "  codelock ui\n"
        "\n"
        "Or render a file:\n"
        "  codelock render --in snippet.py --mode normalize --out snippet.html\n"
        "\n"
        "  codelock doctor     check this install\n"
        "  codelock --help     all commands\n"
        "\n"
        "Author: Aziel Eliab\n"
    )


def _welcome_json() -> dict[str, object]:
    return {
        "product": "codelock",
        "version": __version__,
        "author": "Aziel Eliab",
        "summary": "See the same source as a plain view and as a CodeLock view.",
        "next": [
            "codelock ui",
            "codelock render --in snippet.py --mode normalize --out snippet.html",
            "codelock --help",
        ],
    }


def _ack_from_env() -> str | None:
    val = os.environ.get("CODELOCK_ACK")
    if val is None or val == "":
        return None
    return val


def _open_from_invocation(ack: str | None) -> Gate:
    """Open the gate if --ack or CODELOCK_ACK matches the exact phrase.

    A provided-but-wrong acknowledgment is an error (the user tried to
    open the gate and failed), not a silent Closed state.
    """
    gate = Gate()
    candidate = ack if ack is not None else _ack_from_env()
    if candidate is None:
        return gate
    gate.open(candidate)
    return gate


def _read_source(path: str) -> str:
    try:
        return Path(path).read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise UserError(
            f"No file at {path}.",
            "Check the path, then run the command again.",
        ) from exc
    except OSError as exc:
        raise UserError(
            f"Could not read {path}: {exc}",
            "Check the path and permissions, then run the command again.",
        ) from exc


def _session(source: str, args: argparse.Namespace) -> CodeLockSession:
    seed = getattr(args, "seed", "0")
    hue = bool(getattr(args, "hue", True))
    ack = getattr(args, "ack", None)
    gate = _open_from_invocation(ack)
    return CodeLockSession(source, seed=seed, hue=hue, gate=gate)


def _ack_next() -> str:
    return f'codelock open-gate --ack "{ACK_PHRASE}"'


def _cmd_watch(args: argparse.Namespace) -> int:
    """One-shot editor tether. Reads a file or stdin."""
    if args.path == "-":
        source = sys.stdin.read()
        label = "<stdin>"
    else:
        source = _read_source(args.path)
        label = args.path
    try:
        session = _session(source, args)
    except AcknowledgmentError as exc:
        if args.as_json:
            _emit_json({"label": label, "gate": "closed", "error": str(exc), "view": None})
        return _write_error(exc, f'codelock watch {args.path} --ack "{ACK_PHRASE}"')
    if args.as_json:
        payload: dict[str, object] = {
            "label": label,
            "gate": "open" if session.gate_open else "closed",
            "source": session.source,
            "view": None,
        }
        if session.gate_open:
            tokens = session.tokens()
            styles = session.styles()
            payload["view"] = [
                {
                    "token": tok,
                    "font_size_px": style["font_size_px"],
                    "rotate_deg": style["rotate_deg"],
                    "hue_deg": style.get("hue_deg"),
                }
                for tok, style in zip(tokens, styles)
            ]
        _emit_json(payload)
        return 0
    sys.stdout.write("pipe from vim/vscode\n")
    sys.stdout.write(
        "Show both views for a file, or pipe from vim/vscode "
        "(example: :w !codelock watch -).\n"
    )
    sys.stdout.write(f"=== normalize (canonical)  {label} ===\n")
    sys.stdout.write(session.source)
    if not session.source.endswith("\n"):
        sys.stdout.write("\n")
    sys.stdout.write("=== CodeLock (same words, different presentation) ===\n")
    if not session.gate_open:
        sys.stdout.write(
            "gate: closed — pass --ack "
            f"{ACK_PHRASE!r} to see the CodeLock view. Normalize is above.\n"
        )
        shown = "-" if args.path == "-" else args.path
        sys.stdout.write(f'Next: codelock watch {shown} --ack "{ACK_PHRASE}"\n')
        return 0
    try:
        tokens = session.tokens()
        styles = session.styles()
    except GateClosedError as exc:
        return _write_error(exc, f'codelock watch {args.path} --ack "{ACK_PHRASE}"')
    for tok, style in zip(tokens, styles):
        hue = style.get("hue_deg")
        hue_s = f" hue={hue}" if hue is not None else ""
        sys.stdout.write(
            f"  {tok!r}  size={style['font_size_px']}px  "
            f"rot={style['rotate_deg']}{hue_s}\n"
        )
    return 0


def main(argv: Sequence[str] | None = None) -> int:
    parser = _build_parser()
    raw = list(sys.argv[1:] if argv is None else argv)
    # Accept --json before or after the command. Subparsers reset a parent
    # flag they also define, so pull it off before argparse sees it.
    as_json = "--json" in raw
    cleaned = [item for item in raw if item != "--json"]
    try:
        args = parser.parse_args(cleaned)
    except SystemExit as exc:
        code = exc.code
        if code is None or code == 0:
            return 0
        if isinstance(code, int):
            return code
        return 2
    if as_json:
        args.as_json = True

    if args.cmd is None:
        if args.as_json:
            _emit_json(_welcome_json())
        else:
            sys.stdout.write(_welcome_text())
        return 0

    if args.cmd == "doctor":
        from codelock.doctor import doctor_cli

        return doctor_cli(as_json=args.as_json)

    if args.cmd == "version":
        if args.as_json:
            _emit_json({"name": "codelock", "version": __version__})
        else:
            sys.stdout.write(f"codelock {__version__}\n")
        return 0

    if args.cmd == "ui":
        from codelock.ui import serve

        try:
            serve(host=args.host, port=args.port)
        except ValueError as exc:
            return _write_error(exc, "codelock ui --host 127.0.0.1 --port 8762")
        return 0

    if args.cmd == "watch":
        try:
            return _cmd_watch(args)
        except UserError as exc:
            return _write_error(exc, exc.next_step)

    if args.cmd == "gate-status":
        try:
            gate = _open_from_invocation(_ack_from_env())
        except AcknowledgmentError as exc:
            code = _write_error(exc, _ack_next())
            if args.as_json:
                _emit_json({"gate": "closed", "error": str(exc)})
            else:
                sys.stdout.write("gate: closed\n")
            return code
        state = "open" if gate.gate_open else "closed"
        if args.as_json:
            _emit_json({"gate": state})
        elif state == "open":
            sys.stdout.write("gate: open\n")
            sys.stdout.write("CodeLock mode is available for this run.\n")
        else:
            sys.stdout.write("gate: closed\n")
            sys.stdout.write("CodeLock mode stays off until you acknowledge the phrase.\n")
            sys.stdout.write(f"Next: {_ack_next()}\n")
        return 0

    if args.cmd == "open-gate":
        try:
            gate = Gate()
            gate.open(args.ack)
        except AcknowledgmentError as exc:
            code = _write_error(exc, _ack_next())
            if args.as_json:
                _emit_json({"gate": "closed", "error": str(exc)})
            else:
                sys.stdout.write("gate: closed\n")
            return code
        if args.as_json:
            _emit_json({"gate": "open"})
        else:
            sys.stdout.write("gate: open\n")
            sys.stdout.write("CodeLock mode is available for this run.\n")
        return 0

    try:
        if args.cmd == "render":
            source = _read_source(args.inp)
            session = _session(source, args)
            if args.mode == "normalize":
                html = session.normalize_html()
                label = "plain view"
            else:
                html = session.codelock_html()
                label = "CodeLock view"
            dest = Path(args.out)
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(html, encoding="utf-8", newline="\n")
            if args.as_json:
                _emit_json({"mode": args.mode, "out": str(dest)})
            else:
                sys.stdout.write(f"Wrote the {label} to {dest}\n")
            return 0

        if args.cmd == "export":
            source = _read_source(args.inp)
            session = _session(source, args)
            dest = Path(args.out)
            if args.kind == "normal":
                session.export_normal(dest)
                label = "canonical text"
            else:
                session.export_codelock(dest)
                label = "CodeLock HTML"
            if args.as_json:
                _emit_json({"kind": args.kind, "out": str(dest)})
            else:
                sys.stdout.write(f"Wrote {label} to {dest}\n")
            return 0
    except UserError as exc:
        if args.as_json:
            _emit_json({"error": str(exc)})
        return _write_error(exc, exc.next_step)
    except AcknowledgmentError as exc:
        if args.as_json:
            _emit_json({"error": str(exc), "gate": "closed"})
        return _write_error(exc, _ack_next())
    except GateClosedError as exc:
        if args.as_json:
            _emit_json({"error": str(exc), "gate": "closed"})
        return _write_error(
            exc,
            f'codelock {args.cmd} --in {args.inp} --'
            + ("mode codelock" if args.cmd == "render" else "kind codelock")
            + f' --out {args.out} --ack "{ACK_PHRASE}"',
        )
    except OSError as exc:
        err = UserError(
            f"Could not write the output: {exc}",
            "Check the output path and permissions, then run the command again.",
        )
        if args.as_json:
            _emit_json({"error": str(err)})
        return _write_error(err, err.next_step)

    parser.error(f"unknown command {args.cmd!r}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
