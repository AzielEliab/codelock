/**
 * CodeLock hosted runtime (Cloudflare Worker).
 * Ports gate + tokenize + Rosetta render from the Python core.
 * Source is never mutated. Not encryption.
 */
function runtimeCors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function runtimeJson(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...runtimeCors() },
  });
}

async function sha256Hex(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new TextEncoder().encode(String(bytes));
  const dig = await crypto.subtle.digest("SHA-256", data);
  const arr = new Uint8Array(dig);
  let out = "";
  for (let i = 0; i < arr.length; i++) out += arr[i].toString(16).padStart(2, "0");
  return out;
}

async function readJsonBody(request) {
  const ct = (request.headers.get("content-type") || "").toLowerCase();
  if (request.method === "GET" || request.method === "HEAD") return {};
  const text = await request.text();
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    const err = new Error("JSON body required");
    err.status = 400;
    throw err;
  }
}

function utcNow() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function aiHowTo(base) {
  const openapi = base + "/openapi.json";
  const health = base + "/v1/health";
  return {
    chatgpt_actions: [
      "Open GPT Editor → Actions → Import from URL",
      "Paste " + openapi,
      "Authentication: None",
      "Allow GET /v1/health and the listed POST /v1 routes",
      "Test GET /v1/health, then a sample POST from the spec",
    ],
    grok_xai_tools: [
      "Add an HTTP / OpenAPI tool pointing at " + openapi,
      "Or register GET /v1/health, GET /openapi.json, and the product POSTs",
      "No API key. CORS is *",
    ],
    venice_http_tools: [
      "Add an HTTP tool with method, URL, and JSON body from " + openapi,
      "Start with GET " + health,
      "Then call the product POST listed in the spec",
    ],
    mcp_catalog: "https://aziel-runtime.vibelock.workers.dev/mcp",
    notes: [
      "GET /download still serves the gzip tarball and increments the counter.",
      "/v1, /openapi.json, and /ai do not increment DOWNLOADS.",
    ],
  };
}

const PRODUCT = "codelock";
const EXAMPLE_PAYLOAD = {
  "source": "print('hello')",
  "mode": "normalize"
};

const SKILL_MARKDOWN = "---\nname: CodeLock\ndescription: Use when calling CodeLock hosted /v1 or installing the local package. Author Aziel Eliab.\n---\n\n# CodeLock\n\nGate-tethered cognitive rendering of source text. Alters perception, not meaning. Does not claim the underlying meaning changed. Author: Aziel Eliab.\n\n**THIS IS:** gate-tethered cognitive rendering of source text. It alters perception, not meaning.\n\n**THIS IS NOT:** a claim that meaning changed, a compiler, or a source-code rewriter of semantics.\n\nAuthor: **Aziel Eliab**. Forks are welcome and always allowed. Apache-2.0.\n\nAlways send `User-Agent: Mozilla/5.0`. Cloudflare Workers may 403 an empty agent.\n\n## Call these URLs\n\n- Worker OpenAPI: https://codelock-download-tracker.vibelock.workers.dev/openapi.json\n- Catalog OpenAPI: https://aziel-runtime.vibelock.workers.dev/openapi.json\n- MCP: `POST https://aziel-runtime.vibelock.workers.dev/mcp`\n- Live skill (this markdown): `GET https://codelock-download-tracker.vibelock.workers.dev/v1/skill`\n\nOps (do **not** increment downloads or views):\n\n| Method | Path | What |\n|--------|------|------|\n| GET | `/v1/health` | Liveness. Does not increment downloads. |\n| GET | `/v1/skill` | This markdown. Does not increment downloads. |\n| POST | `/v1/gate-status` | Gate status preview. Does not rewrite meaning. |\n| POST | `/v1/render` | Perception rendering. Does not claim meaning changed. |\n\nGrok: import OpenAPI as a custom tool. ChatGPT: GPT Actions. Venice: HTTP tools.\n\n## Example\n\n```bash\ncurl -s -A 'Mozilla/5.0' https://codelock-download-tracker.vibelock.workers.dev/v1/health\ncurl -s -A 'Mozilla/5.0' https://codelock-download-tracker.vibelock.workers.dev/v1/skill\ncurl -s -A 'Mozilla/5.0' -X POST https://codelock-download-tracker.vibelock.workers.dev/v1/gate-status \\\n  -H 'content-type: application/json' \\\n  -d '{\"text\":\"sample\"}'\n```\n\n## Local (after one-click install)\n\n```bash\ncurl -fsSL https://codelock-download-tracker.vibelock.workers.dev/install.sh | bash\ncodelock ui\n```\n\nThen open http://127.0.0.1:8762 (loopback only).\n\nDOI: https://doi.org/10.5281/zenodo.21431561  \nRecord: https://zenodo.org/records/21431561  \n\nCounted download (gzip HTTP 200, no 302): https://codelock-download-tracker.vibelock.workers.dev/download?asset=codelock-0.1.0.tar.gz\nGitHub: https://github.com/AzielEliab/codelock\n\n## Catalog + local UI\n\nAuthor: **Aziel Eliab**. Honest scope: Canonical or Rosetta HTML view of source. Alters perception, not meaning.\n\n- Catalog product: https://aziel-runtime.vibelock.workers.dev/p/codelock/\n- Catalog OpenAPI: https://aziel-runtime.vibelock.workers.dev/openapi.json\n- Catalog MCP: `POST https://aziel-runtime.vibelock.workers.dev/mcp`\n- This Worker skill: `GET https://codelock-download-tracker.vibelock.workers.dev/v1/skill`\n- This Worker OpenAPI: https://codelock-download-tracker.vibelock.workers.dev/openapi.json\n- Sample payload: `GET https://codelock-download-tracker.vibelock.workers.dev/v1/example`\n\nLocal UI: **Import JSON file** (`type=file`) and **Export JSON**. Then `codelock doctor`.\n\nGrok: import catalog or Worker OpenAPI as a custom tool. ChatGPT: GPT Actions. Venice: HTTP tools.\n";

const VERSION = "0.1.0";
const BASE = "https://codelock-download-tracker.vibelock.workers.dev";
const ACK_PHRASE = "This tool alters perception, not meaning.";
const MOTTO = ACK_PHRASE;
const MAX_SOURCE = 65536;
const FONT_SIZE_MIN_PX = 11;
const FONT_SIZE_MAX_PX = 22;
const ROTATE_DEG = 4.0;
const SPACING_EM = 0.08;
const NORMALIZE_FONT_PX = 14;
const MONOSPACE = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

const KEYWORDS = new Set([
  "False","None","True","and","as","assert","async","await","break","class",
  "continue","def","del","elif","else","except","finally","for","from","global",
  "if","import","in","is","lambda","nonlocal","not","or","pass","raise","return",
  "try","while","with","yield",
]);

const TOKEN_RE = new RegExp(
  "(?<comment>#[^\\n]*|//[^\\n]*|/\\*.*?\\*/)" +
  "|(?<string>(?:[rRuUbBfF]{1,3})?(?:'''(?:\\\\.|[^\\\\])*?'''|\"\"\"(?:\\\\.|[^\\\\])*?\"\"\"|'(?:\\\\.|[^'\\\\])*'|\"(?:\\\\.|[^\"\\\\])*\"))" +
  "|(?<whitespace>\\s+)" +
  "|(?<identifier>[\\p{L}_][\\p{L}\\p{N}_]*)" +
  "|(?<number>\\d+(?:\\.\\d+)?(?:[eE][+\\-]?\\d+)?)" +
  "|(?<punctuation>.)",
  "gsu"
);

function htmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function tokenizeKinds(source) {
  if (source === "") return [];
  const out = [];
  let pos = 0;
  TOKEN_RE.lastIndex = 0;
  let m;
  while ((m = TOKEN_RE.exec(source)) !== null) {
    if (m.index > pos) out.push({ kind: "punctuation", text: source.slice(pos, m.index) });
    let kind = "punctuation";
    if (m.groups) {
      if (m.groups.comment != null) kind = "comment";
      else if (m.groups.string != null) kind = "string";
      else if (m.groups.whitespace != null) kind = "whitespace";
      else if (m.groups.identifier != null) kind = "identifier";
      else if (m.groups.number != null) kind = "number";
      else kind = "punctuation";
    }
    const text = m[0];
    if (kind === "identifier" && KEYWORDS.has(text)) kind = "keyword";
    out.push({ kind, text });
    pos = m.index + text.length;
  }
  if (pos < source.length) out.push({ kind: "punctuation", text: source.slice(pos) });
  return out;
}

function tokenize(source) {
  return tokenizeKinds(source).map((t) => t.text);
}

function mapSigned(byte, amplitude) {
  const v = (byte / 255.0) * 2.0 * amplitude - amplitude;
  return Math.round(v * 1e6) / 1e6;
}

async function digestBytes(seed, index, token) {
  const enc = new TextEncoder();
  const a = enc.encode(String(seed));
  const b = enc.encode(String(index));
  const c = enc.encode(token);
  const buf = new Uint8Array(a.length + 1 + b.length + 1 + c.length);
  buf.set(a, 0);
  buf[a.length] = 0;
  buf.set(b, a.length + 1);
  buf[a.length + 1 + b.length] = 0;
  buf.set(c, a.length + 1 + b.length + 1);
  const dig = await crypto.subtle.digest("SHA-256", buf);
  return new Uint8Array(dig);
}

async function styleFor(seed, index, token, hue) {
  const digest = await digestBytes(seed, index, token);
  const span = FONT_SIZE_MAX_PX - FONT_SIZE_MIN_PX + 1;
  const font_size_px = FONT_SIZE_MIN_PX + (digest[0] % span);
  let hue_deg = null;
  if (hue) hue_deg = ((digest[4] << 8) | digest[5]) % 360;
  return {
    font_size_px,
    hue_deg,
    rotate_deg: mapSigned(digest[1], ROTATE_DEG),
    letter_spacing_em: mapSigned(digest[2], SPACING_EM),
    word_spacing_em: mapSigned(digest[3], SPACING_EM),
  };
}

async function stylesFor(tokens, seed, hue) {
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    out.push(await styleFor(seed, i, tokens[i], hue));
  }
  return out;
}

function isSpace(token) {
  return /^\s+$/u.test(token);
}

function tokenSpan(token, style) {
  const escaped = htmlEscape(token);
  if (isSpace(token)) return escaped;
  const rules = [
    "font-size:" + (style.font_size_px | 0) + "px",
    "transform:rotate(" + style.rotate_deg + "deg)",
    "letter-spacing:" + style.letter_spacing_em + "em",
    "word-spacing:" + style.word_spacing_em + "em",
    "display:inline-block",
    "font-family:" + MONOSPACE,
    "transform-origin:50% 50%",
  ];
  if (style.hue_deg != null) rules.push("color:hsl(" + (style.hue_deg | 0) + ",70%,55%)");
  return '<span class="tok" style="' + rules.join(";") + '">' + escaped + "</span>";
}

function normalizeHtml(source) {
  const escaped = htmlEscape(source);
  return "<!DOCTYPE html>\n<html lang=\"en\" data-canonical=\"true\">\n<head>\n<meta charset=\"utf-8\">\n<title>CodeLock Normalize (canonical)</title>\n<style>\n  html, body { margin: 0; background: #111; color: #ddd; }\n  .banner { font-family: " + MONOSPACE + "; font-size: 13px; padding: 0.75rem 1rem; background: #1e3a2f; color: #cfe; border-bottom: 1px solid #3a6; }\n  pre.canonical { font-family: " + MONOSPACE + "; font-size: " + NORMALIZE_FONT_PX + "px; line-height: 1.45; letter-spacing: 0; word-spacing: normal; transform: none; white-space: pre; margin: 1rem; tab-size: 4; }\n</style>\n</head>\n<body>\n<div class=\"banner\">Canonical view (Normalize). Fixed-size monospace. Zero transforms. Source is the single source of truth.</div>\n<pre class=\"canonical\" data-canonical=\"true\">" + escaped + "</pre>\n</body>\n</html>\n";
}

function scriptPlainSource(source) {
  return source.replace(/<\//g, "<\\/");
}

function cssEscapeComment(text) {
  return text.replace(/\*\//g, "* /");
}

function codelockHtml(source, seed, tokens, styles) {
  const spans = tokens.map((tok, i) => tokenSpan(tok, styles[i])).join("");
  const embedded = scriptPlainSource(source);
  const escaped = htmlEscape(source);
  const seed_s = htmlEscape(String(seed));
  const ack = htmlEscape(ACK_PHRASE);
  return "<!DOCTYPE html>\n<html lang=\"en\" data-canonical=\"false\">\n<head>\n<meta charset=\"utf-8\">\n<title>CodeLock visual artifact (non-canonical)</title>\n<!--\n  NON-CANONICAL visual artifact. This is not the source of truth.\n  Canonical source is plain text in #codelock-source.\n  " + cssEscapeComment(ACK_PHRASE) + "\n  CodeLock does not encrypt, hide, or obfuscate. Seed=" + seed_s + "\n-->\n<style>\n  html, body { margin: 0; background: #0b0b0f; color: #eee; }\n  .banner { font-family: " + MONOSPACE + "; font-size: 13px; padding: 0.85rem 1rem; background: #4a1c1c; color: #f8d0d0; border-bottom: 2px solid #c44; }\n  pre.rosetta { font-family: " + MONOSPACE + "; font-size: " + NORMALIZE_FONT_PX + "px; line-height: 1.7; white-space: pre-wrap; margin: 1rem; tab-size: 4; }\n  span.tok { display: inline-block; vertical-align: baseline; }\n  .inspect { font-family: " + MONOSPACE + "; margin: 1rem; padding: 0.75rem; border: 1px dashed #666; background: #161616; }\n  textarea#codelock-source-text { width: 100%; min-height: 8rem; font-family: " + MONOSPACE + "; font-size: 13px; background: #000; color: #cfc; border: 1px solid #333; white-space: pre; }\n</style>\n</head>\n<body>\n<div class=\"banner\" data-canonical=\"false\">\n  <strong>NON-CANONICAL</strong> visual artifact &mdash; not a substitute for source.\n  " + ack + "\n</div>\n<pre class=\"rosetta\" data-canonical=\"false\" data-seed=\"" + seed_s + "\">" + spans + "</pre>\n<section class=\"inspect\">\n  <h2>Canonical source (inspectable, not encrypted)</h2>\n  <p>This tool alters perception, not meaning. Plain text below is the single source of truth.</p>\n  <textarea id=\"codelock-source-text\" readonly>" + escaped + "</textarea>\n</section>\n<script type=\"text/plain\" id=\"codelock-source\">" + embedded + "</script>\n</body>\n</html>\n";
}

function ackOk(ack) {
  if (ack == null) return false;
  return String(ack).trim() === ACK_PHRASE;
}

function gateStatus(ack) {
  const open = ackOk(ack);
  return {
    product: PRODUCT,
    gate: open ? "open" : "closed",
    phrase: ACK_PHRASE,
    ack_accepted: open,
    note: open
      ? "Gate Open for this request only (not persisted). Normalize remains available either way."
      : "Gate Closed. CodeLock mode refuses without the exact acknowledgment. Normalize remains available.",
    source_mutated: false,
    encryption: false,
  };
}

function openapiDoc() {
  return {
    openapi: "3.1.0",
    info: {
      title: "CodeLock Runtime API",
      version: VERSION,
      summary: "Gate-tethered cognitive rendering of source text. Alters perception, not meaning. Not encryption.",
      description: MOTTO + " Source is never mutated. CodeLock mode requires the exact gate phrase.",
    },
    servers: [{ url: BASE }],
    paths: {
            "/v1/example": { get: { operationId: "codelockExample", summary: "Sample JSON payload. Does not increment downloads.", responses: { "200": { description: "OK" } } } },
      "/v1/health": { get: { operationId: "codelockHealth", summary: "Liveness", responses: { "200": { description: "OK" } } } },
      "/v1/gate-status": {
        post: {
          operationId: "codelockGateStatus",
          summary: "Report gate open/closed for this request",
          requestBody: { required: false, content: { "application/json": { schema: { type: "object", properties: { ack: { type: "string" } } } } } },
          responses: { "200": { description: "Gate status" } },
        },
      },
      "/v1/render": {
        post: {
          operationId: "codelockRender",
          summary: "Render Normalize or CodeLock HTML. Source is not mutated.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["source", "mode"],
                  properties: {
                    source: { type: "string" },
                    mode: { type: "string", enum: ["normalize", "codelock"] },
                    ack: { type: "string" },
                    seed: { oneOf: [{ type: "string" }, { type: "integer" }] },
                    hue: { type: "boolean", default: true },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "HTML view plus metadata (source unchanged)" },
            "400": { description: "Bad acknowledgment or arguments" },
            "403": { description: "CodeLock mode refused; gate closed" },
          },
        },
      },
    },
  };
}

async function handleRender(body) {
  const source = body && body.source != null ? String(body.source) : "";
  if (!source) return runtimeJson({ ok: false, error: "source is required", source_mutated: false }, 400);
  if (source.length > MAX_SOURCE) {
    return runtimeJson({ ok: false, error: "source too large", max: MAX_SOURCE, source_mutated: false }, 413);
  }
  const mode = String(body.mode || "").trim().toLowerCase();
  if (mode !== "normalize" && mode !== "codelock") {
    return runtimeJson({ ok: false, error: "mode must be normalize or codelock", source_mutated: false }, 400);
  }
  const ack = body.ack;
  const seed = body.seed == null ? 0 : body.seed;
  const hue = body.hue !== false;
  const source_sha256 = await sha256Hex(source);
  const joinedCheck = tokenize(source).join("") === source;

  if (mode === "normalize") {
    const html = normalizeHtml(source);
    return runtimeJson({
      ok: true,
      product: PRODUCT,
      mode: "normalize",
      gate: ackOk(ack) ? "open" : "closed",
      canonical: true,
      source_mutated: false,
      source_sha256,
      token_roundtrip: joinedCheck,
      html,
      note: "Canonical view. Fixed-size monospace. Zero transforms. Source is the single source of truth. Not encryption.",
    });
  }

  if (ack != null && String(ack).trim() !== ACK_PHRASE) {
    return runtimeJson({
      ok: false,
      error: "acknowledgment",
      gate: "closed",
      mode: "codelock",
      source_mutated: false,
      source_sha256,
      message: "Opening the gate requires acknowledging the exact phrase: " + JSON.stringify(ACK_PHRASE) + " (got " + JSON.stringify(ack) + ")",
    }, 400);
  }
  if (!ackOk(ack)) {
    return runtimeJson({
      ok: false,
      error: "gate_closed",
      gate: "closed",
      mode: "codelock",
      source_mutated: false,
      source_sha256,
      message: "CodeLock Mode is disabled while the gate is Closed. Normalize remains available. Open the gate by acknowledging: " + JSON.stringify(ACK_PHRASE),
    }, 403);
  }

  const tokens = tokenize(source);
  const styles = await stylesFor(tokens, seed, hue);
  const html = codelockHtml(source, seed, tokens, styles);
  return runtimeJson({
    ok: true,
    product: PRODUCT,
    mode: "codelock",
    gate: "open",
    canonical: false,
    source_mutated: false,
    source_sha256,
    token_roundtrip: tokens.join("") === source,
    seed: String(seed),
    hue,
    token_count: tokens.length,
    styles,
    html,
    note: "NON-CANONICAL visual artifact. Alters perception, not meaning. Source is inspectable and unchanged. Not encryption.",
  });
}

export async function handleRuntime(request, url, env) {
  const path = url.pathname;
  if (path === "/v1/health" && request.method === "GET") {
    return runtimeJson({
      ok: true, author: "Aziel Eliab",
      product: PRODUCT,
      version: VERSION,
      motto: MOTTO,
      encryption: false,
      source_mutated: false,
    });
  }
  if ((path === "/v1/example" || path === "/v1/example/") && (request.method === "GET" || request.method === "HEAD")) {
    return runtimeJson({
      ok: true,
      product: PRODUCT,
      author: "Aziel Eliab",
      example: EXAMPLE_PAYLOAD,
      note: "Sample payload only. Does not increment downloads.",
    });
  }


  if (path === "/v1/skill" && request.method === "GET") {
    return new Response(SKILL_MARKDOWN, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-KV-Increment": "false",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  if (path === "/openapi.json" && request.method === "GET") {
    return runtimeJson(openapiDoc());
  }
  if (path === "/ai" && request.method === "GET") {
    return runtimeJson({
      product: PRODUCT,
      title: "Use with Grok, ChatGPT, Venice",
      motto: MOTTO,
      openapi: BASE + "/openapi.json",
      health: BASE + "/v1/health",
      ...aiHowTo(BASE),
    });
  }
  if (path === "/v1" && request.method === "GET") {
    return runtimeJson({
      product: PRODUCT,
      motto: MOTTO,
      endpoints: ["GET /v1/health", "POST /v1/gate-status", "POST /v1/render", "GET /openapi.json", "GET /ai"],
    });
  }
  if (path === "/v1/gate-status" && request.method === "POST") {
    let body = {};
    try { body = await readJsonBody(request); } catch (e) {
      return runtimeJson({ ok: false, error: e.message, source_mutated: false }, e.status || 400);
    }
    return runtimeJson({ ok: true, ...gateStatus(body.ack) });
  }
  if (path === "/v1/render" && request.method === "POST") {
    let body = {};
    try { body = await readJsonBody(request); } catch (e) {
      return runtimeJson({ ok: false, error: e.message, source_mutated: false }, e.status || 400);
    }
    return handleRender(body);
  }
  if (path === "/v1/gate-status" || path === "/v1/render") {
    return runtimeJson({ error: "method not allowed" }, 405);
  }
  if (path.startsWith("/v1/")) {
    return runtimeJson({ error: "not found", product: PRODUCT }, 404);
  }
  return null;
}
