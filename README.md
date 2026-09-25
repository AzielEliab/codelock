# CodeLock

See the same source as a plain view and as a CodeLock view.

**Author:** Aziel Eliab
**Date:** July 2026
**License:** [Apache-2.0](LICENSE)

## Start

1. Install:

```bash
python -m venv .venv && source .venv/bin/activate && pip install -e .
```

2. Open the local app:

```bash
codelock ui
```

3. Open http://127.0.0.1:8762/ and press **Render**.

`codelock doctor` checks the install. `codelock --help` lists commands. Add `--json` when a script needs JSON.

One-click install (counted download):

```bash
curl -fsSL https://codelock-download-tracker.vibelock.workers.dev/install.sh | bash
```

Then `codelock ui` and open http://127.0.0.1:8762/.

## Commands

```bash
codelock
codelock ui
codelock render --in snippet.py --mode normalize --out snippet.html
codelock render --in snippet.py --mode codelock --out snippet.codelock.html \
  --seed 7 --ack "This tool alters perception, not meaning."
codelock export --in snippet.py --kind normal --out snippet.txt
codelock export --in snippet.py --kind codelock --out snippet.codelock.html \
  --seed 7 --ack "This tool alters perception, not meaning."
codelock gate-status
codelock doctor
codelock version
```

Advanced:

```bash
codelock open-gate --ack "This tool alters perception, not meaning."
codelock watch snippet.py
codelock watch -    # pipe from vim/vscode, for example :w !codelock watch -
```

`--ack` or env `CODELOCK_ACK` opens the gate for that run. The default is closed. Normalize and export-normal never need `--ack`. `--json` prints JSON for the same commands.

## Notes

Plain text stays the source. Normalize is a fixed monospace view and is always available. CodeLock mode changes size, hue, and small rotation of those same words after you acknowledge:

```
This tool alters perception, not meaning.
```

Exports:

- **Export Normal** — verbatim UTF-8 `.txt`. Canonical.
- **Export CodeLock** — self-contained `.html` with the original source in `<script type="text/plain" id="codelock-source">`. Opens as a file. No CDN.

Spec: [docs/whitepaper.md](docs/whitepaper.md). Contributing: [CONTRIBUTING.md](CONTRIBUTING.md). Forks are welcome and always allowed.

## Library

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

No GUI required:

```bash
python examples/demo_snippet.py
```

That script opens the gate and writes Normalize HTML and CodeLock HTML under `examples/_out/`.

## Phone

Flutter sources: [`mobile/`](mobile/). Application id `com.azieeliab.codelock`. Offline.

```bash
cd mobile
flutter create --org com.azieeliab --project-name codelock .
flutter pub get
flutter run
```

The `android/` and `ios/` folders are skeleton READMEs until `flutter create .` (this tree does not vendor a Flutter SDK).

## Tests

```bash
pip install -e ".[dev]"
python -m pytest -q
```

## Layout

```
codelock/           library (gate, tokenize, render, session, cli, ui)
tests/              pytest, no network, no GUI
docs/whitepaper.md  July 2026 spec
examples/           open the gate and write HTML
RUN.txt             three steps to the local app
mobile/             Flutter iPhone and Android
workers/download-tracker/   Cloudflare Worker + wrangler.toml
```

## Download

Counted tarball (HTTP 200 from this project's Worker):

[codelock-0.1.0.tar.gz](https://codelock-download-tracker.vibelock.workers.dev/download?asset=codelock-0.1.0.tar.gz)

- Page: https://codelock-download-tracker.vibelock.workers.dev/
- Count: https://codelock-download-tracker.vibelock.workers.dev/count
- Stats: https://codelock-download-tracker.vibelock.workers.dev/stats
- Install script: https://codelock-download-tracker.vibelock.workers.dev/install.sh
- GitHub: https://github.com/AzielEliab/codelock
- DOI: [10.5281/zenodo.21431561](https://doi.org/10.5281/zenodo.21431561)
- Zenodo: https://zenodo.org/records/21431561

From a release artifact: `python -m pip install codelock-0.1.0.tar.gz`

Isolated counter: Worker `codelock-download-tracker`, KV `CODELOCK_DOWNLOADS`. `/v1`, `/mcp`, and `/v1/mesh/*` do not increment downloads.

## For assistants

Works with any MCP- or OpenAPI-capable assistant, including ChatGPT (GPT Actions / OpenAI), Grok (xAI), Venice, Claude (Anthropic), Cursor (MCP), Glama (MCP), Perplexity, Microsoft Copilot / Bing, Google Gemini / Vertex, Mistral, Meta AI, Apple Intelligence surfaces, Amazon Q tooling, DuckAssist, You.com, Cohere, and other MCP/OpenAPI-capable assistants.

Live HTTPS runtime on the download-tracker Worker (does not increment the download counter):

- OpenAPI 3.1: https://codelock-download-tracker.vibelock.workers.dev/openapi.json
- Health: https://codelock-download-tracker.vibelock.workers.dev/v1/health
- How to wire tools: https://codelock-download-tracker.vibelock.workers.dev/ai
- Skill: https://codelock-download-tracker.vibelock.workers.dev/v1/skill
- MCP catalog: https://aziel-runtime.vibelock.workers.dev/mcp
- Suite mesh proxy: https://codelock-download-tracker.vibelock.workers.dev/v1/mesh — default OFF; QNM live / locked / isolated; QNS-CD-1.0 cross-map (no public qnsd proxy)

Agents use this Worker `/v1` (gate-status / render) or OpenAPI/MCP via aziel-runtime. This Worker `/v1/mesh/*` proxies via `AZIEL_RUNTIME`. GET does not enable the mesh. Suite mesh default OFF. QNM-BUILD-1.0 live|locked|isolated. QNS-CD-1.0 is a hub cite / Worker mesh cross-map only (photon QNS1 packet transfer; local qnsd in [qnm-node](https://github.com/AzielEliab/qnm-node); runtime cites in [aziel-runtime](https://github.com/AzielEliab/aziel-runtime)). AZInterface holds pair custody. Catalog MCP `mesh_*` + FragGate `slug=mesh`. Anon-broadcast is not a publish path.

POST `/v1/gate-status` and POST `/v1/render` with `{source, mode: normalize|codelock, ack}`. Gate phrase (exact): `This tool alters perception, not meaning.` Without ack, CodeLock mode refuses. Source is unchanged.

**ChatGPT Actions:** GPT Editor → Actions → Import from URL → `https://codelock-download-tracker.vibelock.workers.dev/openapi.json` (no auth).

**Grok / xAI tools:** add an HTTP/OpenAPI tool pointing at that OpenAPI URL.

**Venice HTTP tools:** add an HTTP tool with method, URL, and JSON body from that spec. Start with GET `https://codelock-download-tracker.vibelock.workers.dev/v1/health`.

**MCP (Cursor, Glama, and others):** `POST https://aziel-runtime.vibelock.workers.dev/mcp`.

**OpenAPI import (Claude, Copilot, Gemini, Perplexity, and others):** import `https://codelock-download-tracker.vibelock.workers.dev/openapi.json` (no auth).

```bash
curl -sS https://codelock-download-tracker.vibelock.workers.dev/v1/health
curl -sS -X POST https://codelock-download-tracker.vibelock.workers.dev/v1/render \
  -H 'content-type: application/json' \
  -d '{"source":"print(1)","mode":"normalize"}'
```

People use `codelock ui` on http://127.0.0.1:8762/. Scripts use `--json` or the Worker JSON routes above.

## License

Apache-2.0. See [LICENSE](LICENSE).

Forks are welcome and always allowed.
