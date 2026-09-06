/**
 * Existing CodeLock /v1 routes still work after the mesh door.
 */
import assert from "node:assert/strict";
import { handleRuntime } from "../src/runtime.js";

const HOST = "https://codelock-download-tracker.vibelock.workers.dev";

async function worker(path, method, body, env = {}) {
  const url = new URL(path, HOST);
  const init = {
    method,
    headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await handleRuntime(new Request(url, init), url, env);
  const data = await res.json();
  return { status: res.status, data };
}

const health = await worker("/v1/health", "GET");
assert.equal(health.status, 200);
assert.equal(health.data.ok, true);
assert.equal(health.data.product, "codelock");
assert.equal(health.data.encryption, false);
assert.equal(health.data.mesh.enabled_default, false);
assert.equal(health.data.mesh.fraggate_slug, "mesh");

const gate = await worker("/v1/gate-status", "POST", {});
assert.equal(gate.status, 200);
assert.equal(gate.data.gate, "closed");
assert.equal(gate.data.source_mutated, false);

const render = await worker("/v1/render", "POST", { source: "print(1)", mode: "normalize" });
assert.equal(render.status, 200);
assert.equal(render.data.ok, true);
assert.equal(render.data.mode, "normalize");
assert.equal(render.data.source_mutated, false);
assert.ok(String(render.data.html).includes("Canonical"));

const spec = await worker("/openapi.json", "GET");
assert.equal(spec.status, 200);
assert.ok(spec.data.paths["/v1/mesh"]);
assert.ok(spec.data.paths["/v1/mesh/status"]);
assert.ok(spec.data.paths["/v1/render"]);
assert.ok(String(spec.data.info.description).includes("QNM-BUILD-1.0"));

console.log("verify-existing-runtime: health/gate-status/render/openapi still ok");
