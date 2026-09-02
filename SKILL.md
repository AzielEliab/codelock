---
name: CodeLock
description: Use when calling CodeLock hosted /v1 or installing the local package. Author Aziel Eliab.
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
- Product POSTs listed in OpenAPI

Grok: import OpenAPI as a custom tool. ChatGPT: GPT Actions. Venice: HTTP tools.

## Example

```bash
curl -s -A 'Mozilla/5.0' https://codelock-download-tracker.vibelock.workers.dev/v1/health
curl -s -A 'Mozilla/5.0' https://codelock-download-tracker.vibelock.workers.dev/v1/skill
```

## Local (after one-click install)

```bash
curl -fsSL https://codelock-download-tracker.vibelock.workers.dev/install.sh | bash
codelock ui
codelock doctor
```

Then open http://127.0.0.1:8762 (loopback only).

Counted download (gzip HTTP 200, no 302): https://codelock-download-tracker.vibelock.workers.dev/download?asset=codelock-0.1.0.tar.gz
GitHub: https://github.com/AzielEliab/codelock

Paper: DOI https://doi.org/10.5281/zenodo.21431561 · https://zenodo.org/records/21431561 · Apache-2.0. Forks welcome.

## Catalog + local UI

Author: **Aziel Eliab**. Honest scope: Canonical or Rosetta HTML view of source. Alters perception, not meaning.

- Catalog product: https://aziel-runtime.vibelock.workers.dev/p/codelock/
- Catalog OpenAPI: https://aziel-runtime.vibelock.workers.dev/openapi.json
- Catalog MCP: `POST https://aziel-runtime.vibelock.workers.dev/mcp`
- This Worker skill: `GET https://codelock-download-tracker.vibelock.workers.dev/v1/skill`
- This Worker OpenAPI: https://codelock-download-tracker.vibelock.workers.dev/openapi.json
- Sample payload: `GET https://codelock-download-tracker.vibelock.workers.dev/v1/example`

Local UI: **Import JSON file** (`type=file`) and **Export JSON**. Then `codelock doctor`.

Grok: import catalog or Worker OpenAPI as a custom tool. ChatGPT: GPT Actions. Venice: HTTP tools.
