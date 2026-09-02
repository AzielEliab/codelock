---
name: CodeLock
description: Use when calling CodeLock hosted /v1 or installing the local package. Author Aziel Eliab.
---

# CodeLock

Gate-tethered cognitive rendering of source text. Alters perception, not meaning. Does not claim the underlying meaning changed. Author: Aziel Eliab.

**THIS IS:** gate-tethered cognitive rendering of source text. It alters perception, not meaning.

**THIS IS NOT:** a claim that meaning changed, a compiler, or a source-code rewriter of semantics.

Author: **Aziel Eliab**. Forks are welcome and always allowed. Apache-2.0.

Always send `User-Agent: Mozilla/5.0`. Cloudflare Workers may 403 an empty agent.

## Call these URLs

- Worker OpenAPI: https://codelock-download-tracker.vibelock.workers.dev/openapi.json
- Catalog OpenAPI: https://aziel-runtime.vibelock.workers.dev/openapi.json
- MCP: `POST https://aziel-runtime.vibelock.workers.dev/mcp`
- Live skill (this markdown): `GET https://codelock-download-tracker.vibelock.workers.dev/v1/skill`

Ops (do **not** increment downloads or views):

| Method | Path | What |
|--------|------|------|
| GET | `/v1/health` | Liveness. Does not increment downloads. |
| GET | `/v1/skill` | This markdown. Does not increment downloads. |
| POST | `/v1/gate-status` | Gate status preview. Does not rewrite meaning. |
| POST | `/v1/render` | Perception rendering. Does not claim meaning changed. |

Grok: import OpenAPI as a custom tool. ChatGPT: GPT Actions. Venice: HTTP tools.

## Example

```bash
curl -s -A 'Mozilla/5.0' https://codelock-download-tracker.vibelock.workers.dev/v1/health
curl -s -A 'Mozilla/5.0' https://codelock-download-tracker.vibelock.workers.dev/v1/skill
curl -s -A 'Mozilla/5.0' -X POST https://codelock-download-tracker.vibelock.workers.dev/v1/gate-status \
  -H 'content-type: application/json' \
  -d '{"text":"sample"}'
```

## Local (after one-click install)

```bash
curl -fsSL https://codelock-download-tracker.vibelock.workers.dev/install.sh | bash
codelock ui
```

Then open http://127.0.0.1:8762 (loopback only).

DOI: https://doi.org/10.5281/zenodo.21431561  
Record: https://zenodo.org/records/21431561  

Counted download (gzip HTTP 200, no 302): https://codelock-download-tracker.vibelock.workers.dev/download?asset=codelock-0.1.0.tar.gz
GitHub: https://github.com/AzielEliab/codelock
