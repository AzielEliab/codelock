# Contributing to CodeLock

**Forks are first-class.** This project is Apache-2.0; you do not need
permission to fork, patch, or redistribute. Pull requests are welcome
if you want a change upstream. Keep a fork forever if you do not.

**Forks are welcome and always allowed.**

## How to run tests

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
python -m pytest -q
```

Python 3.10+. Core is stdlib only. pytest is the dev extra. No network.
No GUI.

## Ground rules

1. Treat `origin` as one peer among many. Downstream forks are part of
   the download-tracking model (see `workers/download-tracker`): they
   report as `{owner}/{repo}`, not as anonymous noise.
2. **Do not add obfuscation, encryption, or evasion.** CodeLock is a
   view-layer renderer. It does not hide source, hash-hide text, minify
   to evade reading, or replace a cipher. Forks that add those are
   outside this spec.
3. **Keep the dependency list tiny.** Stdlib only in the core
   (`hashlib`, `html`, `re`, `argparse`). Optional dev extra is pytest.
   Do not add numpy or crypto packages.
4. **Do not invent evaluation numbers.** The whitepaper describes a
   cognitive-rendering instrument, not a measured comprehension study.
   If you measure something, publish the method next to the number.
5. **Gate tethering is not optional.** Cognitive-altering modes require
   the exact acknowledgment phrase. Do not add a backdoor that opens
   the gate silently. Normalize must remain available when Closed.
6. **Source is canonical.** Rendered views never mutate source. Token
   join must round-trip. Export Normal must be byte-identical to source
   (UTF-8).
7. **Audit safety.** All outputs must stay inspectable with standard
   tools. HTML artifacts must work opened as a file (inline CSS, no
   CDN).

## Where to change things

- Gate / ACK_PHRASE / GateClosedError: `codelock/gate.py`
- Tokenizer: `codelock/tokenize.py`
- Rosetta styles and HTML: `codelock/render.py`
- Session / export: `codelock/session.py`
- CLI: `codelock/cli.py`
- New behavior needs a test that fails without the change.

## Reporting downloads from a fork

Point users at GitHub Releases. If you cut your own releases, POST
`/event` on the download-tracker worker so counts stay attributed to
your `owner/repo` (see `workers/download-tracker/README.md`).

## License of contributions

By submitting a change you agree it is licensed under Apache-2.0, the
same license as the rest of the tree. Keep the copyright lines honest.
