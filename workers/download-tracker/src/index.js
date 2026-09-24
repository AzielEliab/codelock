import { handleRuntime } from "./runtime.js";
import { corsHeaders as doorCors } from "./door.js";
import { classifyRequest, readBotManagement } from "./classify.js";
import {
  isolatedKeys,
  isReservedCounterKey,
  shapeCountBody,
  shapeHumanBotFields,
} from "./stats-shape.js";

/**
 * CodeLock download tracker (Cloudflare Worker).
 *
 * GET  /download?repo=AzielEliab/codelock&tag=latest&asset=...
 *      increments KV, serves the tarball via env.ASSETS.fetch (no 302)
 *      (default https://github.com/AzielEliab/codelock/releases)
 * /v1, /mcp, and /v1/mesh/* do not increment.
 * GET  /stats   JSON totals + per-repo + per-branch breakdown
 * POST /event   forks report a download {owner,repo,branch,fork,asset}
 *
 * KV binding DOWNLOADS. Keys: project|owner|repo|branch|fork
 * CORS *. No secrets in this tree.
 */

const PROJECT = "codelock";
const KEYS = isolatedKeys(PROJECT);

const DEFAULT_ASSET = "codelock-0.1.0.tar.gz";
const DEFAULT_OWNER = "AzielEliab";
const DEFAULT_REPO = "codelock";
const DEFAULT_BRANCH = "main";
const HOST = "https://codelock-download-tracker.vibelock.workers.dev";
const GITHUB_REPO = "https://github.com/AzielEliab/codelock";

const GITHUB_RELEASES = "https://github.com/AzielEliab/codelock/releases";
const GITHUB_LATEST = "https://github.com/AzielEliab/codelock/releases/latest";
const INSTALL_LINE = "curl -fsSL https://codelock-download-tracker.vibelock.workers.dev/install.sh | bash";
const DOI = "https://doi.org/10.5281/zenodo.21431561";
const ZENODO = "https://zenodo.org/records/21431561";

function corsHeaders() {
  return doorCors();
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() },
  });
}

function redirect(url) {
  return new Response(null, {
    status: 302,
    headers: { Location: url, ...corsHeaders() },
  });
}

function splitOwnerRepo(value, fallbackOwner, fallbackRepo) {
  if (typeof value === "string" && value.includes("/")) {
    const [o, r] = value.split("/").filter(Boolean);
    if (o && r) return { owner: o, repo: r };
  }
  return { owner: fallbackOwner, repo: fallbackRepo };
}

function parseDims(src) {
  const get = (k) => {
    if (src == null) return null;
    if (typeof src.get === "function") {
      const v = src.get(k);
      return v == null || v === "" ? null : v;
    }
    const v = src[k];
    return v == null || v === "" ? null : v;
  };

  let owner = get("owner") || DEFAULT_OWNER;
  let repo = get("repo") || DEFAULT_REPO;
  if (typeof repo === "string" && repo.includes("/")) {
    const split = splitOwnerRepo(repo, owner, DEFAULT_REPO);
    owner = split.owner;
    repo = split.repo;
  }

  const branch = get("branch") || DEFAULT_BRANCH;
  const tag = get("tag") || "latest";
  const asset = get("asset") || "";

  const forkRaw = get("fork");
  let fork = "0";
  if (forkRaw === 1 || forkRaw === true || forkRaw === "1" || forkRaw === "true") {
    fork = "1";
  } else if (typeof forkRaw === "string" && forkRaw.includes("/")) {
    const split = splitOwnerRepo(forkRaw, owner, repo);
    owner = split.owner;
    repo = split.repo;
    fork = "1";
  } else if (forkRaw != null && forkRaw !== 0 && forkRaw !== false && forkRaw !== "0" && forkRaw !== "false") {
    fork = "1";
  }

  if (`${owner}/${repo}`.toLowerCase() !== `${DEFAULT_OWNER}/${DEFAULT_REPO}`.toLowerCase()) {
    fork = "1";
  }

  return { project: PROJECT, owner, repo, branch, fork, tag, asset };
}

function kvKey(dims) {
  return `${dims.project}|${dims.owner}|${dims.repo}|${dims.branch}|${dims.fork}`;
}

function githubAssetUrl(owner, repo, tag, asset) {
  if (!asset) {
    if (owner === DEFAULT_OWNER && repo === DEFAULT_REPO) return GITHUB_RELEASES;
    return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases`;
  }
  if (!tag || tag === "latest") {
    return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/latest/download/${encodeURIComponent(asset)}`;
  }
  return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(asset)}`;
}


async function bump(env, key) {
  const n = parseInt((await env.DOWNLOADS.get(key)) || "0", 10) + 1;
  await env.DOWNLOADS.put(key, String(n));
  return n;
}

async function incrementSplit(env, humanKey, botKey, request) {
  const cls = classifyRequest(request);
  const splitKey = cls.bucket === "human" ? humanKey : botKey;
  await bump(env, splitKey);
  return cls;
}

async function readHumanBotSplit(env, request) {
  const views = parseInt((await env.DOWNLOADS.get(KEYS.views)) || "0", 10) || 0;
  const downloadsRaw = await env.DOWNLOADS.get(KEYS.total);
  let downloads = parseInt(downloadsRaw || "0", 10);
  if (!Number.isFinite(downloads) || downloads < 0) downloads = 0;
  const viewsHuman = parseInt((await env.DOWNLOADS.get(KEYS.views_human)) || "0", 10) || 0;
  const downloadsHuman = parseInt((await env.DOWNLOADS.get(KEYS.downloads_human)) || "0", 10) || 0;
  const botManagementAvailable = readBotManagement(request).available;
  return shapeHumanBotFields({
    views,
    downloads,
    views_human: viewsHuman,
    downloads_human: downloadsHuman,
    botManagementAvailable,
  });
}

function enrichStatsWithHumanBot(stats, split) {
  return {
    ...stats,
    views_human: split.views_human,
    views_bot: split.views_bot,
    downloads_human: split.downloads_human,
    downloads_bot: split.downloads_bot,
    human: split.human,
    bot: split.bot,
    classification: split.classification,
  };
}

async function increment(env, dims, request) {
  const key = kvKey(dims);
  const n = parseInt((await env.DOWNLOADS.get(key)) || "0", 10) + 1;
  await env.DOWNLOADS.put(key, String(n));
  if (request) await incrementSplit(env, KEYS.downloads_human, KEYS.downloads_bot, request);

  return n;
}

async function listAllKeys(env) {
  const keys = [];
  let cursor;
  do {
    const page = await env.DOWNLOADS.list(cursor ? { cursor } : {});
    keys.push(...page.keys);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return keys;
}

async function collectStats(env, request) {
  const keys = await listAllKeys(env);
  let total = 0;
  const by_repo = {};
  const by_branch = {};
  const by_fork = { "0": 0, "1": 0 };
  const breakdown = [];

  for (const k of keys) {
    const name = k.name;
    if (isReservedCounterKey(name, PROJECT)) continue;
    const n = parseInt((await env.DOWNLOADS.get(name)) || "0", 10);
    if (!Number.isFinite(n) || n <= 0) continue;
    const parts = name.split("|");
    if (parts.length < 5) continue;
    const [project, owner, repo, branch, fork] = parts;
    total += n;
    const repoId = `${owner}/${repo}`;
    by_repo[repoId] = (by_repo[repoId] || 0) + n;
    by_branch[branch] = (by_branch[branch] || 0) + n;
    const forkFlag = fork === "1" ? "1" : "0";
    by_fork[forkFlag] = (by_fork[forkFlag] || 0) + n;
    breakdown.push({ project, owner, repo, branch, fork: forkFlag, count: n });
  }

  const views = parseInt((await env.DOWNLOADS.get(viewsKey())) || "0", 10) || 0;
  const __hbViews = parseInt((await env.DOWNLOADS.get(KEYS.views)) || "0", 10) || 0;
  const __hbViewsHuman = parseInt((await env.DOWNLOADS.get(KEYS.views_human)) || "0", 10) || 0;
  const __hbDownloadsHuman = parseInt((await env.DOWNLOADS.get(KEYS.downloads_human)) || "0", 10) || 0;
  const __hbBotMgmt = request ? readBotManagement(request).available : false;

  return {
    ...shapeHumanBotFields({
      views: (typeof views !== 'undefined' ? views : __hbViews),
      downloads: (typeof downloads !== 'undefined' ? downloads : (typeof shown !== 'undefined' ? shown : (typeof total !== 'undefined' ? total : 0))),
      views_human: __hbViewsHuman,
      downloads_human: __hbDownloadsHuman,
      botManagementAvailable: __hbBotMgmt,
    }),

    project: PROJECT,
    total,
    views,
    downloads: total,
    by_repo,
    by_branch,
    by_fork,
    breakdown,
    github: (await githubStats(env)),
    note: "Forks identified by GitHub owner/repo. Key layout: project|owner|repo|branch|fork. Views are separate from downloads. /v1, /mcp, and /v1/mesh/* do not increment.",
  };
}




function totalKey() {
  return PROJECT + "|__total__";
}

function viewsKey() {
  return PROJECT + "|__views__";
}

function githubCacheKey() {
  return PROJECT + "|__github__";
}

async function incrementViews(env, request) {
  const n = parseInt((await env.DOWNLOADS.get(viewsKey())) || "0", 10) + 1;
  await env.DOWNLOADS.put(viewsKey(), String(n));
  if (request) await incrementSplit(env, KEYS.views_human, KEYS.views_bot, request);

  return n;
}

async function githubStats(env) {
  const cached = await env.DOWNLOADS.get(githubCacheKey());
  if (cached) {
    try {
      const obj = JSON.parse(cached);
      if (obj && obj.fetched_at && Date.now() - obj.fetched_at < 5 * 60 * 1000) {
        return obj;
      }
    } catch {
      /* ignore */
    }
  }
  const headers = { "User-Agent": "Mozilla/5.0 CodeLock-download-tracker", Accept: "application/vnd.github+json" };
  let stars = 0;
  let forks = 0;
  let watchers = 0;
  let release_download_count = 0;
  try {
    const repoRes = await fetch("https://api.github.com/repos/AzielEliab/codelock", { headers });
    if (repoRes.ok) {
      const repo = await repoRes.json();
      stars = Number(repo.stargazers_count) || 0;
      forks = Number(repo.forks_count) || 0;
      watchers = Number(repo.subscribers_count != null ? repo.subscribers_count : repo.watchers_count) || 0;
    }
    const relRes = await fetch("https://api.github.com/repos/AzielEliab/codelock/releases/latest", { headers });
    if (relRes.ok) {
      const rel = await relRes.json();
      const assets = Array.isArray(rel.assets) ? rel.assets : [];
      release_download_count = assets.reduce((s, a) => s + (Number(a.download_count) || 0), 0);
    }
  } catch {
    /* public API; empty is fine */
  }
  const out = { stars, forks, watchers, release_download_count, fetched_at: Date.now() };
  try {
    await env.DOWNLOADS.put(githubCacheKey(), JSON.stringify(out));
  } catch {
    /* ignore */
  }
  return out;
}

function installScript() {
  return `#!/usr/bin/env bash\n# CodeLock one-click install. Counted download via this Worker.\nset -euo pipefail\nHOST="${HOST}"\nASSET="${DEFAULT_ASSET}"\nWORKDIR="\${CODELOCK_HOME:-\$HOME/codelock}"\nmkdir -p "\$WORKDIR"\ncd "\$WORKDIR"\necho "Downloading counted tarball from \${HOST}/download (User-Agent Mozilla/5.0)…"\ncurl -fsSL -A 'Mozilla/5.0' "\${HOST}/download?asset=\${ASSET}" -o "\${ASSET}"\ntar -xzf "\${ASSET}"\nDIR=\"\$(find . -maxdepth 1 -type d -name 'codelock-*' | head -n 1)\"\nif [ -n "\${DIR}" ]; then\n  cd "\${DIR}"\nfi\npython3 -m venv .venv\n. .venv/bin/activate\npython -m pip install -U pip\npython -m pip install -e .\necho\necho "Installed CodeLock."\necho "Run:  codelock ui"\necho "Then open http://127.0.0.1:8762  (loopback only)"\necho "Author: Aziel Eliab."\n`;
}

async function serveAsset(request, env, asset, { head = false } = {}) {
  if (!env.ASSETS) {
    return json({ error: "assets binding missing" }, 500);
  }
  const assetUrl = new URL("/" + asset, request.url);
  const assetRes = await env.ASSETS.fetch(new Request(assetUrl, { method: "GET" }));
  if (!assetRes.ok) {
    return json({ error: "asset not hosted", asset, status: assetRes.status }, 404);
  }
  const headers = new Headers();
  headers.set("Content-Type", "application/gzip");
  headers.set("Content-Disposition", 'attachment; filename="' + asset.replaceAll('"', "") + '"');
  headers.set("Cache-Control", "private, no-store");
  const len = assetRes.headers.get("Content-Length");
  if (len) headers.set("Content-Length", len);
  for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
  if (head) {
    return new Response(null, { status: 200, headers });
  }
  return new Response(assetRes.body, { status: 200, headers });
}

async function indexHtml(env) {
  const stats = await collectStats(env);
  const downloads = Number(stats.downloads != null ? stats.downloads : stats.total) || 0;
  const views = parseInt((await env.DOWNLOADS.get(viewsKey())) || "0", 10) || 0;
  const v = views.toLocaleString("en-US");
  const n = downloads.toLocaleString("en-US");
  const breakdown = (stats.breakdown || [])
    .map(
      (b) =>
        `<li><code>${b.owner}/${b.repo}</code> branch <code>${b.branch}</code> fork=${b.fork} → ${b.count}</li>`,
    )
    .join("") || "<li>none yet</li>";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CodeLock — Aziel Eliab</title>
<meta name="description" content="CodeLock is gate-tethered cognitive rendering of source text. One click downloads the package.">
<meta name="author" content="Aziel Eliab">
<link rel="icon" href="/sigil.png">
<style>
  .brandrow{display:flex;align-items:center;gap:12px;margin:0 0 12px}
  .brandmark{width:40px;height:40px;border-radius:10px;object-fit:cover;flex:0 0 auto;box-shadow:0 0 0 1px var(--line)}
  :root {
    color-scheme: dark;
    --bg: #12141a;
    --text: #f4f1ea;
    --muted: #c8cdd6;
    --panel: #1a1e27;
    --line: #7a8292;
    --gold: #e0b84a;
    --btn: #f4f1ea;
    --btn-ink: #12141a;
    --focus: #ffffff;
    --code: #0e1014;
    --ok: #1f6b45;
    --ok-ink: #f4f1ea;
  }
  @media (prefers-color-scheme: light) {
    :root {
      color-scheme: light;
      --bg: #f6f3ec;
      --text: #16181d;
      --muted: #3a4150;
      --panel: #ffffff;
      --line: #6b6458;
      --gold: #6d5310;
      --btn: #16181d;
      --btn-ink: #f6f3ec;
      --focus: #16181d;
      --code: #f3efe6;
      --ok: #1f6b45;
      --ok-ink: #f4f1ea;
    }
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: var(--bg); color: var(--text); }
  body {
    font: 16px/1.5 system-ui, "Segoe UI", sans-serif;
    overflow-wrap: break-word;
  }
  .wrap { max-width: 42rem; margin: 0 auto; padding: 1.15rem 1.1rem 2.6rem; }
  a { color: var(--text); }
  a:hover { color: var(--gold); }
  :focus-visible, a:focus-visible, button:focus-visible, input:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }
  .skip {
    position: absolute;
    left: -999px;
    top: 0;
  }
  .skip:focus {
    left: 1rem;
    top: 1rem;
    z-index: 5;
    background: var(--btn);
    color: var(--btn-ink);
    padding: .4rem .7rem;
    text-decoration: none;
  }
  h1 { font-size: 2rem; font-weight: 650; letter-spacing: .02em; margin: 0 0 .2rem; line-height: 1.15; }
  h2 { font-size: 1.05rem; margin: 1.1rem 0 .4rem; }
  .motto { color: var(--gold); font-style: italic; margin: 0 0 .7rem; font-size: 1.08rem; }
  .lede { color: var(--muted); margin: 0 0 1rem; max-width: 40rem; }
  .kicker { display: block; margin: 0 0 .35rem; font: .68rem/1.2 ui-monospace, Menlo, Consolas, monospace; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
  a.btn.block.primary {
    display: block;
    width: 100%;
    margin: 0 0 .7rem;
    padding: 1.05rem 1.2rem;
    border: 1px solid transparent;
    border-radius: 9px;
    background: var(--btn);
    color: var(--btn-ink);
    text-align: center;
    text-decoration: none;
    font: 700 1.25rem/1.1 ui-monospace, Menlo, Consolas, monospace;
    letter-spacing: .03em;
  }
  a.btn.block.primary:hover { filter: brightness(1.06); color: var(--btn-ink); }
  .asset-note { color: var(--muted); font-size: .95rem; margin: 0 0 1rem; }
  .features { display: grid; grid-template-columns: 1fr; gap: .65rem 1rem; margin: 0 0 1rem; padding: 0; list-style: none; }
  .features li { margin: 0; }
  .card {
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 1.05rem 1.1rem 1.15rem;
    background: var(--panel);
    margin: 0 0 1.1rem;
  }
  .nums { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; margin: 0 0 .9rem; }
  .count { font-size: 2rem; font-variant-numeric: tabular-nums; font-weight: 700; margin: 0; }
  .count span { display: block; font-size: .92rem; font-weight: 500; color: var(--muted); }
  button.btn.install {
    display: block;
    width: 100%;
    min-height: 44px;
    margin: 0 0 .75rem;
    padding: .75rem 1rem;
    border-radius: 9px;
    border: 1px solid var(--line);
    background: transparent;
    color: var(--text);
    cursor: pointer;
    font: 700 .95rem/1.1 ui-monospace, Menlo, Consolas, monospace;
  }
  button.btn.install.copied { background: var(--ok); color: var(--ok-ink); border-color: transparent; }
  pre {
    background: var(--code);
    color: var(--text);
    padding: .75rem .9rem;
    overflow-x: auto;
    max-width: 100%;
    border-radius: 8px;
    font-size: .82rem;
    white-space: pre-wrap;
    word-break: break-word;
  }
  code { font-size: .92em; }
  .meta, .iso { color: var(--muted); font-size: .92rem; }
  .iso { font-size: .85rem; }
  #meshStrip {
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: .85rem 1rem;
    background: var(--panel);
    margin: 0 0 1.1rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: .55rem .8rem;
    font-size: .88rem;
    color: var(--muted);
  }
  #meshStrip .live { color: var(--text); }
  #meshStrip .live b { color: var(--gold); font-size: 1.35rem; margin-right: .35rem; }
  #meshStrip .rollup b { color: var(--gold); }
  #meshStrip button {
    font: 700 .78rem/1 ui-monospace, Menlo, Consolas, monospace;
    min-height: 2rem;
    padding: 0 .75rem;
    border-radius: 8px;
    background: transparent;
    color: var(--text);
    border: 1px solid var(--line);
    cursor: pointer;
  }
  #meshStrip button:hover { border-color: var(--focus); }
  #meshStrip input {
    flex: 1 1 12rem;
    width: auto;
    min-width: 0;
    max-width: 100%;
    min-height: 2rem;
    padding: .4rem .55rem;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    font: inherit;
  }
  .mesh-actions { display: flex; flex-wrap: wrap; gap: .45rem; width: 100%; align-items: center; }
  #meshProducts { flex-basis: 100%; margin: 0; }
  footer.quiet { color: var(--muted); font-size: .9rem; padding-top: .2rem; }
  footer.quiet p { margin: .35rem 0; }
  footer.quiet a { color: var(--text); }
  @media (min-width: 720px) {
    .features { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    button.btn.install { width: auto; }
  }
  @media (max-width: 390px) {
    .wrap { padding: 1rem .9rem 2.2rem; }
    #meshStrip { font-size: .82rem; }
    #meshStrip input { flex-basis: 100%; }
  }
</style>
</head>
<body>
  <a class="skip" href="#download">Skip to download</a>
  <div class="wrap">
    <header class="hero">
      <div class="brandrow"><img class="brandmark" src="/sigil.png" width="40" height="40" alt="" decoding="async"></div>
      <h1>CodeLock</h1>
      <p class="motto">This tool alters perception, not meaning.</p>
      <p class="lede">Gate-tethered cognitive rendering of source text. Version 0.1.0 by Aziel Eliab. One source package for Python 3.10 or newer.</p>
      <a class="btn block primary" id="download" href="/download?asset=${DEFAULT_ASSET}" aria-describedby="downloadNote">Download</a>
      <p class="asset-note" id="downloadNote">${n} downloads · ${DEFAULT_ASSET} · counted on this Worker for every branch and fork</p>
      <ul class="features">
        <li>Normalize keeps the source in fixed-size monospace.</li>
        <li>CodeLock Mode renders from a deterministic seed after the gate phrase.</li>
        <li>Export writes the original text, or an HTML view that still holds the source.</li>
      </ul>
      <p class="lede">On this computer: <code>curl -fsSL https://codelock-download-tracker.vibelock.workers.dev/install.sh | bash</code> then <code>codelock ui</code> at http://127.0.0.1:8762.</p>
    </header>
    <div id="meshStrip" aria-label="Suite Live Nodes">
      <div class="live"><b id="meshLiveCount">0</b> Live Nodes</div>
      <div id="meshLine">Suite mesh: off (default). QNM-BUILD-1.0. QNS-CD-1.0. Not an anonymity network.</div>
      <div class="rollup">live <b id="qnmLive">0</b> · locked <b id="qnmLocked">0</b> · isolated <b id="qnmIsolated">0</b></div>
      <div>No Node Gate · No auto-heal · Aziel Eliab only</div>
      <div class="mesh-actions">
        <input id="meshBearer" type="text" maxlength="80" placeholder="bearer (required to enable)" aria-label="mesh bearer">
        <button id="meshEnable" type="button" title="Enable suite mesh. Declared bearer required. Default off.">Enable</button>
        <button id="meshDisable" type="button" title="Disable suite mesh (always allowed)">Disable</button>
        <button id="meshJoin" type="button" title="Join as codelock. Refused while mesh is OFF. No auto-join.">Join</button>
        <button id="meshLeave" type="button" title="Leave this node. No auto-heal.">Leave</button>
      </div>
      <div id="meshProducts">Catalog MCP mesh_* · FragGate slug=mesh · /v1/mesh/* PROXY · QNS-CD-1.0 cross-map · not qnsd proxy · not AnonBroadcast · not AZMail ring · not a Node Gate</div>
    </div>
    <section class="card" id="counts">
      <h2><span class="kicker">Counted on this Worker</span>Views and downloads</h2>
      <div class="nums">
        <p class="count">${v}<span>Views</span></p>
        <p class="count">${n}<span>Downloads</span></p>
      </div>
      <p>Download saves the gzip from this Worker (HTTP 200, counted). One-click install copies a Terminal command. After it finishes, run <code>codelock ui</code> and open http://127.0.0.1:8762 on this computer only.</p>
      <button type="button" class="btn install" id="install-btn">One-click install</button>
      <pre id="install-cmd">curl -fsSL https://codelock-download-tracker.vibelock.workers.dev/install.sh | bash</pre>
      <p class="meta">The download count ticks when Download is clicked. The Worker serves the gzip (HTTP 200). Forks that use this same link are counted on their own key, and the total includes them. ${DEFAULT_ASSET} — ${n} counted.</p>
      <p class="iso">Isolated counter: Worker <code>codelock-download-tracker</code>, project <code>codelock</code>, KV <code>CODELOCK_DOWNLOADS</code>. This count stays on CodeLock. /v1, /mcp, and /v1/mesh/* do not increment downloads.</p>
      <h2>Per repo / branch / fork</h2>
      <ul>${breakdown}</ul>
    </section>
    <footer class="quiet">
      <p>Apache-2.0 · Aziel Eliab · CodeLock 0.1.0</p>
      <p>Plain text stays the source. The rendered view is a visual file you can open on this computer.</p>
      <p><a href="/stats">JSON stats</a> · <a href="/openapi.json">OpenAPI</a> · <a href="/mcp">MCP</a> · <a href="/v1/mesh">Mesh</a> · <a href="/v1/skill">Skill</a> · <a href="/ai">AI runtime</a> · <a href="${GITHUB_REPO}">GitHub</a> · <a href="${GITHUB_LATEST}">releases</a></p>
      <p>Paper: <a href="${DOI}">doi:10.5281/zenodo.21431561</a> · <a href="${ZENODO}">Zenodo</a></p>
    </footer>

    <script>
      (function () {
        var cmd = "curl -fsSL https://codelock-download-tracker.vibelock.workers.dev/install.sh | bash";
        var btn = document.getElementById("install-btn");
        var pre = document.getElementById("install-cmd");
        if (!btn) return;
        btn.addEventListener("click", function () {
          function done(ok) {
            btn.textContent = ok ? "Copied! Paste in Terminal, then run codelock ui" : "Select the command, copy it, then run codelock ui";
            btn.classList.add("copied");
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(cmd).then(function () { done(true); }).catch(function () { done(false); });
          } else {
            done(false);
            if (pre && window.getSelection) {
              var r = document.createRange();
              r.selectNodeContents(pre);
              var sel = window.getSelection();
              sel.removeAllRanges();
              sel.addRange(r);
            }
          }
        });
      })();
      (function () {
        function $(id) { return document.getElementById(id); }
        function meshNum() {
          for (var i = 0; i < arguments.length; i++) {
            var raw = arguments[i];
            if (raw == null || raw === "") continue;
            var n = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, ""));
            if (Number.isFinite(n) && n >= 0) return Math.floor(n);
          }
          return 0;
        }
        function unwrapMesh(j) {
          if (!j || typeof j !== "object") return {};
          if (j.result && typeof j.result === "object") return Object.assign({}, j, j.result);
          if (j.mesh && typeof j.mesh === "object") return Object.assign({}, j, j.mesh);
          return j;
        }
        function paintMesh(raw) {
          var j = unwrapMesh(raw);
          var on = j.enabled === true || j.enabled === 1 || String(j.status || "").toLowerCase() === "on";
          var r = (j.rollup && typeof j.rollup === "object") ? j.rollup : {};
          var live = on ? meshNum(r.live, j.live_nodes, j.live) : 0;
          var locked = on ? meshNum(r.locked, j.locked_nodes, j.locked) : 0;
          var isolated = on ? meshNum(r.isolated, j.isolated_nodes, j.isolated) : 0;
          $("meshLiveCount").textContent = String(live);
          $("qnmLive").textContent = String(live);
          $("qnmLocked").textContent = String(locked);
          $("qnmIsolated").textContent = String(isolated);
          var line = $("meshLine");
          if (on) line.textContent = "Suite mesh: on · live " + live + " · locked " + locked + " · isolated " + isolated + ". Not an anonymity network.";
          else if (j.status === "unavailable" || (j.ok === false && j.error)) line.textContent = "Suite mesh: off (unavailable). QNM-BUILD-1.0. Not an anonymity network.";
          else line.textContent = "Suite mesh: off (default). QNM-BUILD-1.0. Not an anonymity network.";
          var products = j.products_present || j.products || [];
          var names = Array.isArray(products) ? products.map(function (p) { return typeof p === "string" ? p : (p && (p.product || p.slug)) || ""; }).filter(Boolean) : [];
          var nodes = Array.isArray(j.nodes) ? j.nodes : [];
          var extra = names.length ? " · products " + names.join(", ") : (nodes.length ? " · " + nodes.length + " node labels" : "");
          $("meshProducts").textContent = "Catalog MCP mesh_* · FragGate slug=mesh · /v1/mesh/* PROXY · not AnonBroadcast · not AZMail ring · not a Node Gate" + extra;
        }
        async function meshGet(path) {
          var r = await fetch(path, { headers: { "user-agent": "Mozilla/5.0", accept: "application/json" } });
          return r.json();
        }
        async function meshPost(path, payload) {
          var r = await fetch(path, { method: "POST", headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" }, body: JSON.stringify(payload || {}) });
          return r.json();
        }
        async function refreshMesh() {
          try {
            var status = await meshGet("/v1/mesh");
            var merged = status;
            var inner = unwrapMesh(status);
            var on = inner.enabled === true;
            if (on) {
              try {
                var nodes = await meshGet("/v1/mesh/nodes");
                merged = Object.assign({}, inner, unwrapMesh(nodes));
              } catch (e) { /* status is enough */ }
            }
            paintMesh(merged);
            var nodeId = sessionStorage.getItem("codelock_mesh_node");
            if (on && nodeId) {
              try { await meshPost("/v1/mesh/heartbeat", { node_id: nodeId }); } catch (e) { /* no auto-heal */ }
            }
          } catch (e) {
            paintMesh({ ok: false, enabled: false, status: "unavailable", error: "mesh_unavailable" });
          }
        }
        $("meshEnable").onclick = async function () {
          var bearer = ($("meshBearer").value || "").trim();
          paintMesh(await meshPost("/v1/mesh/enable", bearer ? { bearer: bearer } : {}));
          refreshMesh();
        };
        $("meshDisable").onclick = async function () {
          sessionStorage.removeItem("codelock_mesh_node");
          paintMesh(await meshPost("/v1/mesh/disable", {}));
          refreshMesh();
        };
        $("meshJoin").onclick = async function () {
          var j = await meshPost("/v1/mesh/join", { product: "codelock", label: "CodeLock Worker" });
          var inner = unwrapMesh(j);
          var id = inner.node_id || inner.id || (inner.session && inner.session.node_id);
          if (id) sessionStorage.setItem("codelock_mesh_node", String(id));
          paintMesh(j);
          refreshMesh();
        };
        $("meshLeave").onclick = async function () {
          var id = sessionStorage.getItem("codelock_mesh_node");
          if (id) await meshPost("/v1/mesh/leave", { node_id: id });
          sessionStorage.removeItem("codelock_mesh_node");
          refreshMesh();
        };
        window.addEventListener("pagehide", function () {
          var id = sessionStorage.getItem("codelock_mesh_node");
          if (!id || typeof navigator.sendBeacon !== "function") return;
          try { navigator.sendBeacon("/v1/mesh/leave", new Blob([JSON.stringify({ node_id: id })], { type: "application/json" })); } catch (e) { /* leave expires in 5 minutes */ }
        });
        refreshMesh();
        setInterval(refreshMesh, 30000);
        document.addEventListener("visibilitychange", function () { if (!document.hidden) refreshMesh(); });
      })();
    </script>
  </div>
</body>
</html>`;
}


export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const runtime = await handleRuntime(request, url, env);
    if (runtime) return runtime;

    if ((url.pathname === "/install.sh" || url.pathname === "/install.sh/") && request.method === "GET") {
      return new Response(installScript(), {
        status: 200,
        headers: {
          "Content-Type": "text/x-shellscript; charset=utf-8",
          "Cache-Control": "private, no-store",
          ...corsHeaders(),
        },
      });
    }


    if (url.pathname === "/" && request.method === "GET") {
      await incrementViews(env, request);
      return new Response(await indexHtml(env), {
        headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders() },
      });
    }

    if (url.pathname === "/count" && request.method === "GET") {
      const stats = await collectStats(env, request);
      return json({ project: PROJECT, total: stats.total || 0 });
    }

    if (url.pathname === "/stats" && request.method === "GET") {
      return json(await collectStats(env, request));
    }

    if (url.pathname === "/event" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "JSON body required" }, 400);
      }
      const dims = parseDims(body || {});
      const count = await increment(env, dims, request);
      return json({
        ok: true,
        key: kvKey(dims),
        count,
        owner: dims.owner,
        repo: dims.repo,
        branch: dims.branch,
        fork: dims.fork,
        asset: dims.asset || null,
      });
    }

    if (url.pathname === "/go" && (request.method === "GET" || request.method === "HEAD")) {
      const dims = parseDims(url.searchParams);
      const asset = dims.asset || DEFAULT_ASSET;
      dims.asset = asset;
      if (request.method === "GET") await increment(env, dims, request);
      return serveAsset(request, env, asset, { head: request.method === "HEAD" });
    }

    if ((url.pathname === "/download" || url.pathname.startsWith("/download/")) && (request.method === "GET" || request.method === "HEAD")) {
      const dims = parseDims(url.searchParams);
      if (!dims.asset && url.pathname.startsWith("/download/")) {
        dims.asset = decodeURIComponent(url.pathname.slice("/download/".length));
      }
      const asset = dims.asset || DEFAULT_ASSET;
      dims.asset = asset;
      if (request.method === "GET") await increment(env, dims, request);
      return serveAsset(request, env, asset, { head: request.method === "HEAD" });
    }

    return json({ error: "not found" }, 404);
  },
};
