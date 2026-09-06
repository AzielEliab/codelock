/**
 * Offline suite-mesh proxy contract.
 * GET /v1/mesh/status is MESH-OK style with enabled:false.
 * Enable without bearer stays off (MESH-NEED-BEARER).
 * Author: Aziel Eliab. Apache-2.0.
 */
import assert from "node:assert/strict";
import { joinOriginUrl, runMeshProxy, SERVICE_BINDING_ORIGIN, HOST } from "../src/door.js";
import { handleRuntime } from "../src/runtime.js";
import { meshPointer } from "../src/mesh.js";

const ORIGIN = "https://aziel-runtime.vibelock.workers.dev";

assert.equal(joinOriginUrl(ORIGIN, "/v1/mesh"), `${ORIGIN}/v1/mesh`);
assert.equal(joinOriginUrl(ORIGIN, "/v1/mesh/status"), `${ORIGIN}/v1/mesh/status`);
assert.equal(joinOriginUrl(ORIGIN, "/v1/mesh/nodes"), `${ORIGIN}/v1/mesh/nodes`);
assert.equal(meshPointer().enabled_default, false);
assert.equal(meshPointer().node_gate, false);
assert.equal(meshPointer().rollup, "live|locked|isolated");
assert.equal(meshPointer().fraggate_slug, "mesh");

function jsonRes(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const seen = [];
const env = {
  AZIEL_RUNTIME: {
    async fetch(request) {
      const url = new URL(request.url);
      seen.push({ method: request.method, href: url.href, path: url.pathname });
      if ((url.pathname === "/v1/mesh" || url.pathname === "/v1/mesh/status") && request.method === "GET") {
        return jsonRes({
          ok: true,
          code: "MESH-OK",
          enabled: false,
          radios: "off",
          mesh_default: "off",
          spec: "QNM-BUILD-1.0",
          rollup: { live: 0, locked: 0, isolated: 0 },
          live_nodes: 0,
          author: "Aziel Eliab",
        });
      }
      if (url.pathname === "/v1/mesh/enable" && request.method === "POST") {
        const body = await request.json();
        if (!body.bearer) return jsonRes({ ok: false, code: "MESH-NEED-BEARER", enabled: false }, 400);
        return jsonRes({ ok: true, code: "MESH-OK", enabled: true, radios: "on", bearers: [body.bearer] });
      }
      if (url.pathname === "/v1/mesh/join" && request.method === "POST") {
        return jsonRes({ ok: false, code: "MESH-OFF", enabled: false, message: "Join refused while mesh is OFF." }, 409);
      }
      return jsonRes({ error: "not found", hint: "GET /v1/mesh POST /v1/mesh/enable" }, 404);
    },
  },
};

async function worker(path, method, body) {
  const url = new URL(path, HOST);
  const init = {
    method,
    headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  const request = new Request(url, init);
  const res = await handleRuntime(request, url, env);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

const meshOp = await runMeshProxy(env, new Request(`${HOST}/v1/mesh/status`), "/v1/mesh/status");
assert.equal(meshOp.status, 200);
assert.equal(meshOp.data.ok, true);
assert.equal(meshOp.data.enabled, false);
assert.equal(meshOp.data.code, "MESH-OK");
assert.deepEqual(meshOp.data.rollup, { live: 0, locked: 0, isolated: 0 });

const meshHttp = await worker("/v1/mesh/status", "GET");
assert.equal(meshHttp.status, 200);
assert.equal(meshHttp.data.ok, true);
assert.equal(meshHttp.data.enabled, false);
assert.equal(meshHttp.data.code, "MESH-OK");

const meshRoot = await worker("/v1/mesh", "GET");
assert.equal(meshRoot.status, 200);
assert.equal(meshRoot.data.enabled, false);

const enableEmpty = await worker("/v1/mesh/enable", "POST", {});
assert.equal(enableEmpty.status, 400);
assert.equal(enableEmpty.data.code, "MESH-NEED-BEARER");
assert.notEqual(enableEmpty.data.enabled, true);

const enableOk = await worker("/v1/mesh/enable", "POST", { bearer: "suite-presence" });
assert.equal(enableOk.status, 200);
assert.equal(enableOk.data.enabled, true);

const joinOff = await worker("/v1/mesh/join", "POST", { product: "codelock" });
assert.equal(joinOff.data.code, "MESH-OFF");
assert.notEqual(joinOff.data.enabled, true);

assert.ok(seen.some((s) => s.method === "GET" && s.href === `${SERVICE_BINDING_ORIGIN}/v1/mesh/status`));
assert.ok(seen.some((s) => s.method === "POST" && s.path === "/v1/mesh/enable"));

const unknownMesh = await worker("/v1/mesh/gate", "GET");
assert.equal(unknownMesh.status, 404);
assert.equal(unknownMesh.data.code, "MESH-UNKNOWN");

const mcp = await worker("/mcp", "GET");
assert.equal(mcp.status, 200);
assert.equal(mcp.data.mesh.fraggate_slug, "mesh");
assert.equal(mcp.data.mesh.enabled_default, false);

console.log("verify-mesh-proxy: GET /v1/mesh/status MESH-OK enabled:false");
