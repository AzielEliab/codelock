/**
 * HTTP fallback (no AZIEL_RUNTIME binding) must return MESH-OK style
 * enabled:false from the live aziel-runtime door.
 */
import assert from "node:assert/strict";
import { handleRuntime } from "../src/runtime.js";

const HOST = "https://codelock-download-tracker.vibelock.workers.dev";
const url = new URL("/v1/mesh/status", HOST);
const request = new Request(url, { method: "GET", headers: { "user-agent": "Mozilla/5.0" } });
const res = await handleRuntime(request, url, {});
const data = await res.json();
assert.equal(res.status, 200, JSON.stringify(data));
assert.equal(data.ok, true);
assert.equal(data.enabled, false);
assert.equal(data.code, "MESH-OK");
assert.ok(data.rollup);
assert.equal(data.rollup.live, 0);
assert.equal(data.author, "Aziel Eliab");
console.log("verify-live-mesh-status: GET /v1/mesh/status MESH-OK enabled:false");
console.log(JSON.stringify({ ok: data.ok, code: data.code, enabled: data.enabled, radios: data.radios, rollup: data.rollup }, null, 2));
