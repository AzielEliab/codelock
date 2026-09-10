---
name: CodeLock
description: Use when calling CodeLock hosted /v1 or installing the local package. Dual surface: Worker /v1 + GET /mcp, or aziel-runtime FragGate slug codelock. This Worker /v1/mesh/* PROXY to aziel-runtime via AZIEL_RUNTIME. Suite mesh default OFF. QNM-BUILD-1.0 live|locked|isolated. QNS-CD-1.0 photon QNS1 packet transfer (hub cite / Worker mesh cross-map only; local qnsd in qnm-node; no public qnsd proxy). No Node Gate. No auto-heal. Not anonymity. Author Aziel Eliab.
---

# CodeLock

This tool alters perception, not meaning. Author: **Aziel Eliab**.

**THIS IS:** gate-tethered cognitive rendering of identical source text.

**THIS IS NOT:** encryption, a compiler, or a claim that the transform is the source. Hosted `/v1` does not increment downloads or views.

Always send `User-Agent: Mozilla/5.0`. Cloudflare Workers may 403 an empty agent.

## Call these URLs

- Worker OpenAPI: https://codelock-download-tracker.vibelock.workers.dev/openapi.json
- Catalog OpenAPI: https://aziel-runtime.vibelock.workers.dev/openapi.json
- MCP: `POST https://aziel-runtime.vibelock.workers.dev/mcp`
- Live skill (this markdown): `GET https://codelock-download-tracker.vibelock.workers.dev/v1/skill`

Ops (do **not** increment downloads or views):

- `GET /v1/health` — liveness
- `GET /v1/skill` — this file
- `GET /v1/mesh` — PROXY suite mesh status. Default OFF. QNM live|locked|isolated. QNS-CD-1.0 cross-map on the payload. Never enables.
- `GET /v1/mesh/nodes` — PROXY Live Nodes roster (5-minute presence) plus QNS-CD-1.0 cross-map.
- `POST /v1/mesh/{enable,disable,join,heartbeat,leave,broadcast}` — PROXY. Bearer required to enable. No auto-heal. Anon-broadcast is not a publish path.
- Product POSTs listed in OpenAPI

Works with ChatGPT (GPT Actions / OpenAI), Grok (xAI), Venice, Claude (Anthropic), Cursor (MCP), Glama (MCP), Perplexity, Microsoft Copilot / Bing, Google Gemini / Vertex, Mistral, Meta AI, Apple Intelligence surfaces, Amazon Q tooling, DuckAssist, You.com, Cohere, and other MCP/OpenAPI-capable assistants. This Worker `/v1/mesh/*` PROXY to aziel-runtime via AZIEL_RUNTIME. Catalog MCP `mesh_*` + FragGate `slug=mesh`. Suite mesh default OFF. QNM-BUILD-1.0 live|locked|isolated. QNS-CD-1.0 is a hub cite / Worker mesh cross-map only (photon QNS1 packet transfer; local qnsd in https://github.com/AzielEliab/qnm-node; runtime cites in https://github.com/AzielEliab/aziel-runtime). Not a Softwares-tab product. No public qnsd proxy. No Node Gate. No auto-heal. Not anonymity.

Import OpenAPI as a custom tool, use GPT Actions, add an HTTP tool, or connect the MCP catalog.

## Example

```bash
curl -s -A 'Mozilla/5.0' https://codelock-download-tracker.vibelock.workers.dev/v1/health
curl -s -A 'Mozilla/5.0' https://codelock-download-tracker.vibelock.workers.dev/v1/skill
curl -s -A 'Mozilla/5.0' https://codelock-download-tracker.vibelock.workers.dev/v1/mesh
```

## Local (after one-click install)

```bash
curl -fsSL https://codelock-download-tracker.vibelock.workers.dev/install.sh | bash
codelock ui
codelock doctor
```

Then open http://127.0.0.1:8762 (loopback only). Worker homepage Live Nodes strip polls `GET /v1/mesh` (default OFF). CLI `codelock doctor` remains a local self-check — not a FragGate live op. Suite mesh: `GET /v1/mesh` PROXY (default OFF). Catalog MCP `mesh_*` + FragGate `slug=mesh`. QNS-CD-1.0 cross-map is on mesh status / Live Nodes (`qns_cd`); this Worker does not run qnsd.

Counted download (gzip HTTP 200, no 302): https://codelock-download-tracker.vibelock.workers.dev/download?asset=codelock-0.1.0.tar.gz
GitHub: https://github.com/AzielEliab/codelock

Paper: DOI https://doi.org/10.5281/zenodo.21431561 · https://zenodo.org/records/21431561 · Apache-2.0. Forks welcome.
