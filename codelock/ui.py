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
<title>CodeLock</title>
<style>
  :root {
    --bg: #0f1419; --panel: #171e27; --ink: #e8edf2; --muted: #8b97a6;
    --line: #2a3544; --gold: #d4bc6a; --focus: #7aa2d4; --bad: #d4534b;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; background: var(--bg); color: var(--ink);
    font-family: system-ui, "Segoe UI", sans-serif; line-height: 1.45;
  }
  body { max-width: 46rem; margin: 0 auto; padding: 2.1rem 1.2rem 4rem; }
  .tag {
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase;
    color: var(--muted);
  }
  h1 { font-size: 2rem; font-weight: 650; letter-spacing: 0.04em; margin: 0.35rem 0 0.25rem; }
  .motto { color: var(--gold); font-style: italic; margin: 0 0 0.85rem; font-size: 1.05rem; }
  .lede { color: var(--muted); margin: 0 0 1.5rem; max-width: 40rem; }
  fieldset {
    border: 1px solid var(--line); border-radius: 10px; background: var(--panel);
    padding: 1.1rem 1.15rem 1.2rem; margin: 0 0 1rem;
  }
  legend {
    font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 0.72rem;
    letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);
    padding: 0 0.4rem;
  }
  label { display: block; font-size: 0.92rem; margin: 0.85rem 0 0.3rem; }
  label .kicker {
    display: block; font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--muted); margin-bottom: 0.12rem;
  }
  textarea, input[type="text"], input[type="file"] {
    width: 100%; padding: 0.55rem 0.65rem; border: 1px solid var(--line);
    border-radius: 6px; background: #10161d; color: var(--ink); font: inherit;
  }
  textarea:focus, input[type="text"]:focus { outline: 2px solid var(--focus); outline-offset: 1px; }
  textarea { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 0.88rem; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }
  @media (max-width: 640px) { .row { grid-template-columns: 1fr; } }
  .check { display: flex; align-items: center; gap: 0.45rem; margin: 0.85rem 0 0.3rem; font-size: 0.92rem; color: var(--muted); }
  .check input { width: auto; }
  .actions { display: flex; gap: 0.65rem; flex-wrap: wrap; margin: 0 0 1.6rem; }
  button {
    font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 0.85rem;
    letter-spacing: 0.04em; padding: 0.65rem 1rem; border-radius: 8px;
    border: 1px solid var(--ink); background: var(--ink); color: var(--bg);
    cursor: pointer; font-weight: 650;
  }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
  button.ghost { background: transparent; color: var(--ink); }
  h2 {
    font-size: 1.05rem; letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--muted); font-weight: 600; margin: 0 0 0.7rem;
  }
  .views { display: grid; grid-template-columns: 1fr; gap: 0.85rem; }
  .pane {
    border: 1px solid var(--line); border-radius: 10px; background: var(--panel);
    padding: 0.85rem 1rem; min-height: 8rem;
  }
  .pane iframe {
    width: 100%; min-height: 14rem; border: 0; background: #10161d; border-radius: 6px;
  }
  .err { color: var(--bad); margin: 0.5rem 0; }
  footer { margin-top: 2rem; color: var(--muted); font-size: 0.88rem; }
  .foot-note { font-style: italic; }
</style>
</head>
<body>
  <header>
    <div class="tag">CodeLock · __VERSION__ · loopback · not encryption</div>
    <h1>CodeLock</h1>
    <p class="motto">This tool alters perception, not meaning.</p>
    <p class="lede">
      Paste or load a short source snippet. Normalize is the canonical view.
      CodeLock Mode is a view-layer renderer. It does not encrypt, hide, or replace source.
      Bound to 127.0.0.1 only.
    </p>
  </header>

  <form id="render-form" autocomplete="off">
    <fieldset>
      <legend>Source</legend>
      <label for="source">
        <span class="kicker">Snippet</span>
        Canonical plain text. Rendered views never mutate this.
      </label>
      <textarea id="source" name="source" rows="8" placeholder="def greet(name):&#10;    return f'hello {name}'"></textarea>
      <label for="load">
        <span class="kicker">Load a file</span>
        Read locally in the browser. Nothing is written to disk on the server.
      </label>
      <input id="load" type="file" accept=".py,.txt,.md,.js,.ts,.rs,.go,.c,.h,.html,.css,.json">
      <div class="row">
        <div>
          <label for="seed"><span class="kicker">Seed</span> Deterministic Rosetta seed.</label>
          <input id="seed" name="seed" type="text" value="0" spellcheck="false">
        </div>
        <div>
          <label for="ack"><span class="kicker">Gate acknowledgment</span> Exact phrase required for CodeLock Mode.</label>
          <input id="ack" name="ack" type="text" placeholder="This tool alters perception, not meaning." spellcheck="false">
        </div>
      </div>
      <label class="check"><input id="hue" type="checkbox" checked> Hue spectrum on tokens</label>
    </fieldset>
    <div class="actions">
      <button type="submit" id="run">Render views</button>
      <button type="button" class="ghost" id="export" disabled>Export JSON styles</button>
    </div>
  </form>

  <section class="views" aria-live="polite">
    <div class="pane">
      <h2>Before — Normalize (canonical)</h2>
      <iframe id="before" title="Canonical normalize view" sandbox></iframe>
    </div>
    <div class="pane">
      <h2>After — CodeLock Mode (non-canonical)</h2>
      <iframe id="after" title="CodeLock view-layer renderer" sandbox></iframe>
    </div>
  </section>
  <p class="err" id="err" hidden></p>

  <footer>
    <p>Apache-2.0 · Aziel Eliab · July 2026 · Bound to 127.0.0.1 · <code>codelock ui</code></p>
    <p class="foot-note">This tool alters perception, not meaning. Forks welcome and always allowed.</p>
  </footer>
<script>
(function () {
  const $ = (id) => document.getElementById(id);
  let last = null;
  $("load").addEventListener("change", () => {
    const f = $("load").files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { $("source").value = String(r.result || ""); };
    r.readAsText(f);
  });
  function fail(msg) { $("err").hidden = false; $("err").textContent = msg; }
  $("render-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    $("err").hidden = true;
    $("run").disabled = true;
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          source: $("source").value,
          seed: $("seed").value || "0",
          hue: $("hue").checked,
          ack: $("ack").value,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
      last = data;
      $("before").srcdoc = data.normalize_html || "";
      $("after").srcdoc = data.codelock_html || "<p style='font-family:system-ui;color:#8b97a6;padding:1rem'>Gate closed. Acknowledge the phrase to render CodeLock Mode.</p>";
      $("export").disabled = !(data.styles && data.styles.length);
      if (data.warning) fail(data.warning);
    } catch (e) { fail(String(e.message || e)); }
    finally { $("run").disabled = false; }
  });
  $("export").addEventListener("click", () => {
    if (!last) return;
    const blob = new Blob([JSON.stringify({source: last.source, seed: last.seed, styles: last.styles}, null, 2)], {type: "application/json"});
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
    sys.stdout.write(f"CodeLock UI  http://{host}:{port}/\n")
    sys.stdout.write("Local only. This tool alters perception, not meaning.\n")
    sys.stdout.flush()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        sys.stdout.write("\nstopped\n")
    finally:
        httpd.server_close()
