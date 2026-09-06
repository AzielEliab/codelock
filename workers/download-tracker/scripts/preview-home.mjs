/**
 * Local homepage + mesh door preview (mock KV + mock aziel-runtime).
 */
import { createServer } from "node:http";
import worker from "../src/index.js";

const kv = new Map();
const mesh = {
  enabled: false,
  bearers: [],
  nodes: [],
};

function jsonRes(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const env = {
  DOWNLOADS: {
    async get(key) {
      return kv.get(key) ?? null;
    },
    async put(key, value) {
      kv.set(key, String(value));
    },
    async list() {
      return { keys: [...kv.keys()].map((name) => ({ name })), list_complete: true };
    },
  },
  AZIEL_RUNTIME: {
    async fetch(request) {
      const url = new URL(request.url);
      if ((url.pathname === "/v1/mesh" || url.pathname === "/v1/mesh/status") && request.method === "GET") {
        return jsonRes({
          ok: true,
          code: "MESH-OK",
          enabled: mesh.enabled,
          radios: mesh.enabled ? "on" : "off",
          mesh_default: "off",
          spec: "QNM-BUILD-1.0",
          rollup: { live: mesh.enabled ? mesh.nodes.length : 0, locked: 0, isolated: 0 },
          live_nodes: mesh.enabled ? mesh.nodes.length : 0,
          products_present: mesh.enabled ? ["codelock"] : [],
          nodes: mesh.enabled ? mesh.nodes : [],
          author: "Aziel Eliab",
        });
      }
      if (url.pathname === "/v1/mesh/nodes" && request.method === "GET") {
        return jsonRes({ ok: true, code: "MESH-OK", enabled: mesh.enabled, nodes: mesh.enabled ? mesh.nodes : [] });
      }
      if (url.pathname === "/v1/mesh/enable" && request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        if (!body.bearer) return jsonRes({ ok: false, code: "MESH-NEED-BEARER", enabled: false }, 400);
        mesh.enabled = true;
        mesh.bearers = [body.bearer];
        return jsonRes({ ok: true, code: "MESH-OK", enabled: true, radios: "on", bearers: mesh.bearers });
      }
      if (url.pathname === "/v1/mesh/disable" && request.method === "POST") {
        mesh.enabled = false;
        mesh.bearers = [];
        mesh.nodes = [];
        return jsonRes({ ok: true, code: "MESH-OK", enabled: false, radios: "off" });
      }
      if (url.pathname === "/v1/mesh/join" && request.method === "POST") {
        if (!mesh.enabled) return jsonRes({ ok: false, code: "MESH-OFF", enabled: false }, 409);
        const body = await request.json().catch(() => ({}));
        const node_id = body.node_id || "codelock-preview-1";
        mesh.nodes = [{ id: node_id, product: "codelock" }];
        return jsonRes({ ok: true, code: "MESH-OK", enabled: true, node_id, product: "codelock" });
      }
      if (url.pathname === "/v1/mesh/leave" && request.method === "POST") {
        mesh.nodes = [];
        return jsonRes({ ok: true, code: "MESH-OK", enabled: mesh.enabled });
      }
      if (url.pathname === "/v1/mesh/heartbeat" && request.method === "POST") {
        return jsonRes({ ok: true, code: "MESH-OK", enabled: mesh.enabled });
      }
      return jsonRes({ error: "not found" }, 404);
    },
  },
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:8765");
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: body.length ? body : undefined,
  });
  const response = await worker.fetch(request, env);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
});

server.listen(8765, "127.0.0.1", () => {
  console.log("preview-home: http://127.0.0.1:8765/");
});
