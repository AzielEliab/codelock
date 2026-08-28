# CodeLock download tracker (Cloudflare Worker)

Counts GitHub-release downloads for CodeLock across the canonical
repository, other branches, and forks. Forks are identified by GitHub
`owner/repo`.

**This worker must be deployed** before
`https://codelock-download-tracker.vibelock.workers.dev` resolves.
Until then, send people to
[GitHub Releases](https://github.com/AzielEliab/codelock/releases).

No secrets belong in this directory. The KV namespace id in
`wrangler.toml` is the placeholder `REPLACE_ME` until you create a
namespace.

CodeLock alters perception, not meaning. It is not encryption.

## Bindings

| Binding     | Type | Purpose |
|-------------|------|---------|
| `DOWNLOADS` | KV   | Counters keyed `project|owner|repo|branch|fork` |

## Deploy

```bash
cd workers/download-tracker

# 1. Log in once (opens a browser; token stays in wrangler, not in git)
npx wrangler login

# 2. Create the KV namespace. Paste the id into wrangler.toml
#    replacing REPLACE_ME. Binding name MUST stay DOWNLOADS.
npx wrangler kv namespace create DOWNLOADS

# 3. Deploy
npx wrangler deploy
```

The `workers.dev` subdomain wrangler prints
(`codelock-download-tracker.<account>.workers.dev`) is enough until
custom DNS is ready. This tree documents the intended public URL
`https://codelock-download-tracker.vibelock.workers.dev`.

Do not deploy from this tree until KV is a real id.

## Routes

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/` | Index page with the GitHub Releases link |
| GET | `/download?repo=&tag=&asset=` | Increment KV, 302 to the GitHub asset (default: releases page) |
| GET | `/stats` | JSON totals plus per-repo and per-branch breakdown |
| POST | `/event` | A fork reports a download |

Query params on `/download`: `owner`, `repo` (`AzielEliab/codelock` is
accepted), `branch`, `fork` (`1` or `owner/repo`), `tag`, `asset`.

Default redirect with no asset:

```
https://github.com/AzielEliab/codelock/releases
```

Tracked asset URL (after deploy):

```
https://codelock-download-tracker.vibelock.workers.dev/download?repo=AzielEliab/codelock&tag=latest&asset=codelock-0.1.0.tar.gz
```

A fork reports its own download:

```bash
curl -X POST https://codelock-download-tracker.vibelock.workers.dev/event \
  -H "content-type: application/json" \
  -d '{
    "owner": "YourFork",
    "repo": "codelock",
    "branch": "main",
    "fork": "1",
    "asset": "codelock-0.1.0.tar.gz"
  }'
```

`fork=1` or `fork=YourFork/codelock`. If `owner/repo` is not
`AzielEliab/codelock`, the worker records `fork=1` automatically.

## Stats

`GET /stats` returns `total`, `by_repo`, `by_branch`, `by_fork`, and a
`breakdown` array so forks can read aggregates.

## CORS

All responses include `Access-Control-Allow-Origin: *`.

## Use with Grok, ChatGPT, Venice

This Worker also hosts the product runtime API (CORS `*`). `/v1` routes do **not** increment `DOWNLOADS`.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/v1/health` | Liveness |
| GET | `/openapi.json` | OpenAPI 3.1 |
| GET | `/ai` | ChatGPT Actions, Grok/xAI tools, Venice HTTP tools; MCP catalog |

See the product README section **Use with Grok, ChatGPT, Venice**.
OpenAPI: https://codelock-download-tracker.vibelock.workers.dev/openapi.json
