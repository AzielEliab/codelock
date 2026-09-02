# CodeLock

Gate-tethered cognitive rendering of source text.

**Author:** Aziel Eliab
**Date:** July 2026
**License:** [Apache-2.0](LICENSE)

> This tool alters perception, not meaning.

See the spec: [docs/whitepaper.md](docs/whitepaper.md).
How to contribute: [CONTRIBUTING.md](CONTRIBUTING.md).

**Forks are welcome and always allowed.**


## One-click install

```bash
curl -fsSL https://codelock-download-tracker.vibelock.workers.dev/install.sh | bash
```

The script curls the **counted** tarball from this project's Worker
(`/download`, User-Agent `Mozilla/5.0`), extracts, makes a venv, and
`pip install -e .`. Then run `codelock ui`.

Or tap **Download** / **One-click install** on the Worker homepage
(a 6th-grader can tap it):
https://codelock-download-tracker.vibelock.workers.dev/

## Counted download (Cloudflare Worker)

**This is the counted download.** GitHub releases exist as a mirror.
The Worker serves the gzip itself (HTTP 200, no 302 to GitHub).

# → [https://codelock-download-tracker.vibelock.workers.dev/](https://codelock-download-tracker.vibelock.workers.dev/) ←

Direct tarball (also counted):
[codelock-0.1.0.tar.gz](https://codelock-download-tracker.vibelock.workers.dev/download?asset=codelock-0.1.0.tar.gz)

- Live count JSON: [https://codelock-download-tracker.vibelock.workers.dev/stats](https://codelock-download-tracker.vibelock.workers.dev/stats)
- OpenAPI: [https://codelock-download-tracker.vibelock.workers.dev/openapi.json](https://codelock-download-tracker.vibelock.workers.dev/openapi.json)
- Skill: [https://codelock-download-tracker.vibelock.workers.dev/v1/skill](https://codelock-download-tracker.vibelock.workers.dev/v1/skill)
- One-click install: [https://codelock-download-tracker.vibelock.workers.dev/install.sh](https://codelock-download-tracker.vibelock.workers.dev/install.sh)
- GitHub: [https://github.com/AzielEliab/codelock](https://github.com/AzielEliab/codelock)

- DOI: [10.5281/zenodo.21431561](https://doi.org/10.5281/zenodo.21431561)
- Zenodo: [https://zenodo.org/records/21431561](https://zenodo.org/records/21431561)

Isolated counter: Worker `codelock-download-tracker`, KV `CODELOCK_DOWNLOADS`. Not mixed with any other product. `/v1` does not increment downloads.


## Quick start

```bash
python -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]"
codelock ui
```

Open http://127.0.0.1:8762 (loopback only). No CDN, no telemetry.

Counted download: [https://codelock-download-tracker.vibelock.workers.dev/](https://codelock-download-tracker.vibelock.workers.dev/)

Editor-tether (not a keylogger): `codelock watch PATH` or pipe from vim/vscode (`:w !codelock watch -`).



CodeLock is **not encryption**. It does not hide, obfuscate, protect
secrets, prevent copying, or replace a cipher. Plain text is always
canonical. Rendered views never mutate source.

---

## Download

**Counted download page (this project only, ticks automatically):**

# → [https://codelock-download-tracker.vibelock.workers.dev/](https://codelock-download-tracker.vibelock.workers.dev/) ←

The big button on that page is the download. The number next to it is
**codelock only** — its own Worker and KV, not mixed with VibeLock or
anything else. Clicking it increments the counter. Nobody reports
anything. Forks that use the same link are counted too.

Direct tarball (also counted): [codelock-0.1.0.tar.gz](https://codelock-download-tracker.vibelock.workers.dev/download?asset=codelock-0.1.0.tar.gz)

- Live count JSON: [https://codelock-download-tracker.vibelock.workers.dev/count](https://codelock-download-tracker.vibelock.workers.dev/count)
- Stats: [https://codelock-download-tracker.vibelock.workers.dev/stats](https://codelock-download-tracker.vibelock.workers.dev/stats)
- GitHub releases: [https://github.com/AzielEliab/codelock/releases](https://github.com/AzielEliab/codelock/releases)

---


## Local UI

`codelock ui` serves a loopback dashboard at http://127.0.0.1:8762

Binds to `127.0.0.1` only. Self-contained HTML (no CDN). Paste or load a snippet, run Normalize vs CodeLock Mode. Gate phrase is on the page.


## iPhone & Android

Flutter sources: [`mobile/`](mobile/). Application id `com.azieeliab.codelock`. Offline. No analytics. Dark matte / gold.

Paste source, toggle Normalize vs CodeLock, gate phrase on screen. Not encryption.

```bash
cd mobile
flutter create --org com.azieeliab --project-name codelock .
flutter pub get
flutter run
```

The `android/` and `ios/` folders in this tree are skeleton READMEs until you run `flutter create .` (this machine has no Flutter SDK on PATH). Then open `android/` in Android Studio or `ios/Runner.xcworkspace` in Xcode. Not a store listing.

## What it does

CodeLock applies reversible, non-destructive rendering transformations
at the **view layer** so you can see how visual presentation changes
human comprehension of identical source text.

1. **Normalize** — fixed-size monospace, zero transforms. Canonical
   viewing state. Always available, even when the gate is Closed.
2. **CodeLock / Rosetta Render** — token-level font-size variance,
   optional hue spectrum, micro-rotation, and spacing, driven by a
   **deterministic seed**. Disabled when the gate is Closed.

Opening the gate requires acknowledging the exact sentence:

```
This tool alters perception, not meaning.
```

Exports:

- **Export Normal** — verbatim UTF-8 `.txt`. Canonical.
- **Export CodeLock** — self-contained `.html` visual artifact, marked
  non-canonical (`data-canonical="false"`, banner, HTML comment), with
  the original source inspectable in
  `<script type="text/plain" id="codelock-source">`. Opens as a file.
  No CDN. Does not encrypt.

## Install

Python 3.10+. Stdlib only in the core (no numpy, no crypto).

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

From a release artifact:

```bash
python -m pip install codelock-0.1.0.tar.gz
```

## CLI

```bash
codelock gate-status

codelock open-gate --ack "This tool alters perception, not meaning."

# Canonical HTML view (no ack required)
codelock render --in snippet.py --mode normalize --out snippet.normalize.html

# CodeLock / Rosetta HTML (gate must be open for this invocation)
codelock render --in snippet.py --mode codelock --out snippet.codelock.html \
  --seed 7 --ack "This tool alters perception, not meaning."

codelock render --in snippet.py --mode codelock --out nohue.html \
  --seed 7 --no-hue --ack "This tool alters perception, not meaning."

# Canonical .txt (byte-identical to source; no ack required)
codelock export --in snippet.py --kind normal --out snippet.txt

# Non-canonical HTML artifact
codelock export --in snippet.py --kind codelock --out snippet.codelock.html \
  --seed 7 --ack "This tool alters perception, not meaning."

codelock version
codelock ui            # localhost UI on 127.0.0.1:8762
```

`--ack` (or env `CODELOCK_ACK` set to the same phrase) opens the gate
for that invocation. Default is Closed. Normalize and export-normal
never need `--ack`.

Library entry point:

```python
from codelock.session import CodeLockSession

src = open("snippet.py", encoding="utf-8").read()
session = CodeLockSession(src, seed=7, hue=True)
html_n = session.normalize_html()          # always works
session.open_gate("This tool alters perception, not meaning.")
html_c = session.codelock_html()           # gate-checked
session.export_normal("snippet.txt")
session.export_codelock("snippet.codelock.html")
assert session.source == src               # source never mutates
```

## Example

No GUI required:

```bash
python examples/demo_snippet.py
```

That script opens the gate, writes Normalize HTML and CodeLock HTML
under `examples/_out/`.

## Tests

```bash
pip install -e ".[dev]"
python -m pytest -q
```

Fixtures cover source immutability, token roundtrip, gate behavior,
export identity, HTML non-canonical labels, seed determinism, hue off,
Normalize (no size/rotation variance), and CLI.

## Layout

```
codelock/           library (gate, tokenize, render, session, cli)
tests/              pytest, no network, no GUI
docs/whitepaper.md  July 2026 spec
examples/           open the gate and write HTML
workers/download-tracker/   Cloudflare Worker + wrangler.toml
CONTRIBUTING.md     forks are first-class
mobile/              Flutter iPhone + Android (`flutter create .`)
```

## Use with Grok, ChatGPT, Venice

Live HTTPS runtime on the download-tracker Worker (does **not** increment the download counter):

- OpenAPI 3.1: https://codelock-download-tracker.vibelock.workers.dev/openapi.json
- Health: https://codelock-download-tracker.vibelock.workers.dev/v1/health
- How to wire tools: https://codelock-download-tracker.vibelock.workers.dev/ai
- MCP catalog: https://aziel-runtime.vibelock.workers.dev/mcp

POST /v1/gate-status and POST /v1/render {source, mode: normalize|codelock, ack}. Gate phrase (exact): `This tool alters perception, not meaning.` Without ack, CodeLock mode refuses. Source is never mutated. Not encryption.

**ChatGPT Actions:** GPT Editor → Actions → Import from URL → `https://codelock-download-tracker.vibelock.workers.dev/openapi.json` (no auth).

**Grok / xAI tools:** add an HTTP/OpenAPI tool pointing at `https://codelock-download-tracker.vibelock.workers.dev/openapi.json`.

**Venice HTTP tools:** add an HTTP tool with method, URL, and JSON body from that spec. Start with GET `https://codelock-download-tracker.vibelock.workers.dev/v1/health`.

```bash
curl -sS https://codelock-download-tracker.vibelock.workers.dev/v1/health
curl -sS -X POST https://codelock-download-tracker.vibelock.workers.dev/v1/render \
  -H 'content-type: application/json' \
  -d '{"source":"print(1)","mode":"normalize"}'
```

GET `/download` still serves the gzip tarball and is counted.


## License

Apache-2.0. See [LICENSE](LICENSE).

Forks are welcome and always allowed.
