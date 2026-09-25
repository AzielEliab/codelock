"""Localhost UI for CodeLock. Binds 127.0.0.1. No CDN, no outbound calls."""

from __future__ import annotations

import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse

from codelock import __version__
from codelock.gate import ACK_PHRASE, AcknowledgmentError, GateClosedError
from codelock.session import CodeLockSession

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8762
LOOPBACK = frozenset({"127.0.0.1", "localhost", "::1"})
MAX_BODY = 1 * 1024 * 1024

PAGE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>CodeLock</title>
<style>
  :root {
    color-scheme: light;
    --bg: #f4f0e6;
    --panel: #fffcf6;
    --ink: #1a1814;
    --muted: #5c564c;
    --line: #e0d6c4;
    --gold: #c9a227;
    --bad: #8f2d2d;
    --field: #fffcf6;
    --iframe: #ffffff;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      color-scheme: dark;
      --bg: #12110e;
      --panel: #1c1b17;
      --ink: #f4efe6;
      --muted: #c8bfb0;
      --line: #3d382e;
      --gold: #c9a227;
      --bad: #f0a8a2;
      --field: #14130f;
      --iframe: #14130f;
    }
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; max-width: 100%; }
  body {
    background: var(--bg);
    color: var(--ink);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.5;
    max-width: 40rem;
    margin: 0 auto;
    padding: 1.75rem 1.25rem 3.5rem;
  }
  .top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }
  h1 {
    font-size: 1.75rem;
    font-weight: 650;
    letter-spacing: -0.02em;
    margin: 0;
  }
  .ver { color: var(--muted); font-size: 0.85rem; font-weight: 500; margin-left: 0.4rem; }
  .who { margin: 0; color: var(--muted); font-size: 0.92rem; }
  .lede { margin: 0 0 1.25rem; max-width: 38rem; }
  label { display: block; font-weight: 600; margin: 0.85rem 0 0.35rem; }
  .hint { color: var(--muted); font-weight: 450; font-size: 0.92rem; margin: 0.35rem 0 0; }
  textarea, input[type="text"] {
    width: 100%;
    max-width: 100%;
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--field);
    color: var(--ink);
    font: inherit;
  }
  textarea {
    font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
    font-size: 0.92rem;
    min-height: 10rem;
    resize: vertical;
  }
  input[type="file"] { max-width: 100%; }
  .check {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    margin: 0.85rem 0 0.3rem;
    font-weight: 500;
  }
  .check input { width: 1rem; height: 1rem; }
  button, summary {
    font: inherit;
  }
  button {
    min-height: 44px;
    padding: 0.55rem 1.1rem;
    border-radius: 8px;
    border: 1px solid transparent;
    cursor: pointer;
  }
  button.primary {
    background: var(--gold);
    color: #1a1814;
    font-weight: 650;
    border-color: #a68516;
  }
  button.ghost {
    background: transparent;
    color: var(--ink);
    border-color: var(--line);
  }
  button:disabled { opacity: 0.45; cursor: not-allowed; }
  .actions { margin: 1rem 0 0.75rem; }
  .status { margin: 0 0 1.25rem; color: var(--muted); }
  .err { color: var(--bad); margin: 0 0 1rem; }
  .views { display: grid; grid-template-columns: 1fr; gap: 0.85rem; }
  .pane {
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--panel);
    padding: 0.85rem 1rem 1rem;
  }
  .pane h2 { font-size: 1rem; margin: 0 0 0.15rem; }
  .pane-note { color: var(--muted); font-size: 0.9rem; margin: 0 0 0.65rem; }
  .pane iframe {
    width: 100%;
    min-height: 12rem;
    border: 0;
    border-radius: 8px;
    background: var(--iframe);
  }
  details {
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--panel);
    padding: 0.35rem 1rem 0.85rem;
    margin: 0.85rem 0 0;
  }
  summary {
    cursor: pointer;
    font-weight: 650;
    min-height: 44px;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  summary::-webkit-details-marker { display: none; }
  summary::before { content: "▸"; color: var(--gold); }
  details[open] summary::before { content: "▾"; }
  footer { margin-top: 2rem; color: var(--muted); font-size: 0.9rem; }
  :focus { outline: none; }
  :focus-visible {
    outline: 2px solid var(--gold);
    outline-offset: 2px;
  }
  @media (max-width: 480px) {
    body { padding: 1.1rem 0.9rem 2.5rem; }
    .top { flex-direction: column; align-items: flex-start; gap: 0.15rem; }
    h1 { font-size: 1.5rem; }
    button.primary { width: 100%; }
  }
</style>
</head>
<body>
  <header class="top">
    <h1>CodeLock<span class="ver">__VERSION__</span></h1>
    <p class="who">Aziel Eliab</p>
  </header>
  <p class="lede">
    Paste a snippet and press Render to see the plain view.
    Open Advanced and enter the sentence
    “This tool alters perception, not meaning.”
    to see the CodeLock view of the same words.
  </p>

  <form id="render-form" autocomplete="off">
    <label for="source">Source</label>
    <textarea id="source" name="source" rows="8" placeholder="def greet(name):&#10;    return f'hello {name}'" spellcheck="false"></textarea>
    <div class="actions">
      <button type="submit" class="primary" id="run">Render</button>
    </div>
    <p class="status" id="status" role="status">Paste source, then Render.</p>
    <p class="err" id="err" role="alert" hidden></p>

    <section class="views" aria-live="polite">
      <article class="pane">
        <h2>Normalize</h2>
        <p class="pane-note">Plain view of the source.</p>
        <iframe id="before" title="Normalize view" sandbox></iframe>
      </article>
      <article class="pane">
        <h2>CodeLock</h2>
        <p class="pane-note" id="after-note">Same words, after the gate is open.</p>
        <iframe id="after" title="CodeLock view" sandbox></iframe>
      </article>
    </section>

    <details class="advanced">
      <summary>Advanced</summary>
      <label for="load">Load a file <span class="hint">Read in the browser. The server does not store it.</span></label>
      <input id="load" type="file" accept=".py,.txt,.md,.js,.ts,.rs,.go,.c,.h,.html,.css,.json">
      <label for="seed">Seed</label>
      <input id="seed" name="seed" type="text" value="0" spellcheck="false">
      <p class="hint">Same seed, same CodeLock view.</p>
      <label class="check" for="hue"><input id="hue" type="checkbox" checked> Color the tokens</label>
      <label for="ack">Acknowledgment</label>
      <input id="ack" name="ack" type="text" placeholder="This tool alters perception, not meaning." spellcheck="false" autocomplete="off">
      <p class="hint">The phrase must match exactly. It opens CodeLock mode for this render only. This page stays on 127.0.0.1.</p>
      <div class="actions">
        <button type="button" class="ghost" id="export" disabled>Export style JSON</button>
      </div>
    </details>
  </form>

  <details>
    <summary>About</summary>
    <p>CodeLock shows one source as a plain view and as a CodeLock view. The source text stays the same. Size, color, and rotation are presentation.</p>
    <p>Acknowledgment: This tool alters perception, not meaning.</p>
    <p>Author: Aziel Eliab · July 2026 · Bound to 127.0.0.1 · <code>codelock ui</code></p>
    <p class="hint"><code>codelock doctor</code> checks the install. <code>codelock --help</code> lists commands.</p>
  </details>

  <footer>
    <p>Aziel Eliab · July 2026 · 127.0.0.1</p>
  </footer>
<script>
(function () {
  const $ = (id) => document.getElementById(id);
  let last = null;
  function placeholder(text) {
    return "<!DOCTYPE html><meta charset='utf-8'><style>body{margin:0;font:15px/1.45 system-ui,sans-serif;padding:1rem 1.1rem}</style><p>" + text + "</p>";
  }
  $("before").srcdoc = placeholder("Render to see the plain view.");
  $("after").srcdoc = placeholder("Render to see the CodeLock view.");
  $("load").addEventListener("change", () => {
    const f = $("load").files && $("load").files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { $("source").value = String(r.result || ""); };
    r.readAsText(f);
  });
  function fail(msg) { $("err").hidden = false; $("err").textContent = msg; }
  function status(msg) { $("status").textContent = msg; }
  $("render-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    $("err").hidden = true;
    $("run").disabled = true;
    status("Rendering…");
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: {"Content-Type": "application/json", "Accept": "application/json"},
        body: JSON.stringify({
          source: $("source").value,
          seed: $("seed").value || "0",
          hue: $("hue").checked,
          ack: $("ack").value,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ("Request failed (HTTP " + res.status + ")."));
      last = data;
      $("before").srcdoc = data.normalize_html || "";
      if (data.codelock_html) {
        $("after").srcdoc = data.codelock_html;
        $("after-note").textContent = "Same words, with size, color, and rotation.";
        status("Both views are ready.");
      } else {
        $("after").srcdoc = placeholder("CodeLock mode is closed. Open Advanced, enter the acknowledgment, and Render again.");
        $("after-note").textContent = "Closed until you acknowledge the phrase.";
        status("Plain view is ready. CodeLock mode is closed — open Advanced, enter the acknowledgment, and Render again.");
      }
      $("export").disabled = !(data.styles && data.styles.length);
      if (data.warning) {
        fail(data.warning + " Next: enter the acknowledgment exactly, then Render again.");
      }
    } catch (e) {
      fail(String(e.message || e) + " Next: check the snippet and try Render again.");
    } finally {
      $("run").disabled = false;
    }
  });
  $("export").addEventListener("click", () => {
    if (!last || !last.styles) return;
    const blob = new Blob(
      [JSON.stringify({source: last.source, seed: last.seed, styles: last.styles}, null, 2)],
      {type: "application/json"}
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "codelock-styles.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });
})();
</script>
</body>
</html>
""".replace("__VERSION__", __version__)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args: object) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _send(self, code: int, body: bytes, content_type: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, code: int, obj: Any) -> None:
        self._send(code, json.dumps(obj).encode("utf-8"), "application/json; charset=utf-8")

    def _wants_json(self) -> bool:
        accept = (self.headers.get("Accept") or "").lower()
        if "text/html" in accept:
            return False
        parts = [part.split(";", 1)[0].strip() for part in accept.split(",")]
        return "application/json" in parts

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY:
            raise ValueError("payload too large")
        raw = self.rfile.read(length) if length else b"{}"
        data = json.loads(raw.decode("utf-8") or "{}")
        if not isinstance(data, dict):
            raise ValueError("expected a JSON object")
        return data

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path in ("/", "/index.html"):
            if self._wants_json():
                self._json(
                    200,
                    {
                        "ok": True,
                        "name": "CodeLock",
                        "version": __version__,
                        "bind_host": DEFAULT_HOST,
                        "author": "Aziel Eliab",
                    },
                )
                return
            self._send(200, PAGE.encode("utf-8"), "text/html; charset=utf-8")
            return
        if path == "/health":
            self._json(200, {"ok": True, "bind_host": DEFAULT_HOST, "name": "CodeLock"})
            return
        self._json(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path != "/api/render":
            self._json(404, {"error": "not found"})
            return
        try:
            body = self._read_json()
            source = str(body.get("source") or "")
            seed = body.get("seed", "0")
            hue = bool(body.get("hue", True))
            ack = body.get("ack")
            session = CodeLockSession(source, seed=seed, hue=hue)
            warning = None
            if isinstance(ack, str) and ack.strip():
                try:
                    session.open_gate(ack)
                except AcknowledgmentError as exc:
                    warning = str(exc)
            payload: dict[str, Any] = {
                "source": session.source,
                "seed": str(seed),
                "hue": hue,
                "gate_open": session.gate_open,
                "normalize_html": session.normalize_html(),
                "codelock_html": None,
                "styles": None,
                "ack_phrase": ACK_PHRASE,
                "warning": warning,
            }
            if session.gate_open:
                try:
                    payload["codelock_html"] = session.codelock_html()
                    payload["styles"] = session.styles()
                except GateClosedError as exc:
                    payload["warning"] = str(exc)
            self._json(200, payload)
        except Exception as exc:  # noqa: BLE001
            self._json(400, {"error": str(exc)})


def make_server(host: str = DEFAULT_HOST, port: int = DEFAULT_PORT) -> ThreadingHTTPServer:
    if host not in LOOPBACK:
        raise ValueError("CodeLock UI binds loopback only (127.0.0.1)")
    return ThreadingHTTPServer((host, port), Handler)


def serve(host: str = DEFAULT_HOST, port: int = DEFAULT_PORT) -> None:
    httpd = make_server(host, port)
    sys.stdout.write(f"Open http://{host}:{port}/\n")
    sys.stdout.flush()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        sys.stdout.write("\nstopped\n")
    finally:
        httpd.server_close()
