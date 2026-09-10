/**
 * FragGate / runtime / suite mesh door — classify Worker /v1 paths.
 *
 * `/v1/fraggate/*`, `/v1/runtime/*`, and `/v1/mesh/*` PROXY to aziel-runtime via AZIEL_RUNTIME.
 * Local engine ops are single-segment `/v1/{op}` only.
 * Mesh paths are never rewritten onto `/v1/fraggate`.
 * Multi-segment leftovers are never swallowed as op names.
 *
 * Author: Aziel Eliab only.
 */

import { QNS_CD_SPEC, withQnsCd } from "./mesh.js";

export const DEFAULT_RUNTIME_ORIGIN = "https://aziel-runtime.vibelock.workers.dev";
export const SERVICE_BINDING_ORIGIN = "https://aziel-runtime";
export const HOST = "https://codelock-download-tracker.vibelock.workers.dev";
export const AUTHOR = "Aziel Eliab";

export const DOOR_PREFIXES = Object.freeze(["fraggate", "runtime", "mesh"]);

/** UI / leftover aliases → correct origin FragGate paths. */
export const DOOR_ALIASES = Object.freeze({
  "/v1/runtime/list": "/v1/fraggate/list",
  "/v1/runtime/call": "/v1/fraggate/call",
  "/v1/runtime/describe": "/v1/fraggate/describe",
  "/v1/runtime/verify": "/v1/fraggate/verify",
});

/** Allowlisted suite mesh PROXY paths. Not a Node Gate. Not local ops. */
export const MESH_ROUTE_METHODS = Object.freeze({
  "/v1/mesh": ["GET", "HEAD"],
  "/v1/mesh/status": ["GET", "HEAD"],
  "/v1/mesh/nodes": ["GET", "HEAD"],
  "/v1/mesh/enable": ["POST"],
  "/v1/mesh/disable": ["POST"],
  "/v1/mesh/join": ["POST"],
  "/v1/mesh/heartbeat": ["POST"],
  "/v1/mesh/leave": ["POST"],
  "/v1/mesh/broadcast": ["POST"],
});

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Accept, Authorization, X-Aziel-Runtime-Token, MCP-Protocol-Version, mcp-session-id, User-Agent",
  };
}

export function normalizeV1Path(pathname) {
  const raw = String(pathname || "");
  const path = raw.replace(/\/+$/, "") || "/";
  return path.startsWith("/") ? path : "/" + path;
}

export function runtimeOrigin(env) {
  const fromEnv = env && (env.AZIEL_RUNTIME_ORIGIN || env.RUNTIME_ORIGIN || env.FRAGGATE_DOOR);
  if (typeof fromEnv === "string" && /^https:\/\//i.test(fromEnv)) {
    return fromEnv.replace(/\/+$/, "");
  }
  return DEFAULT_RUNTIME_ORIGIN;
}

export function mapDoorPath(pathname) {
  const path = normalizeV1Path(pathname);
  if (DOOR_ALIASES[path]) return DOOR_ALIASES[path];
  if (path === "/v1/fraggate" || path.startsWith("/v1/fraggate/")) return path;
  if (path === "/v1/runtime" || path.startsWith("/v1/runtime/")) return path;
  if (path === "/v1/mesh" || path.startsWith("/v1/mesh/")) return path;
  return null;
}

export function isDoorPath(pathname) {
  return mapDoorPath(pathname) != null;
}

export function localOpFromPath(pathname) {
  const path = normalizeV1Path(pathname);
  if (!path.startsWith("/v1/")) return null;
  const rest = path.slice("/v1/".length);
  if (!rest || rest.includes("/")) return null;
  if (DOOR_PREFIXES.includes(rest)) return null;
  return rest;
}

/**
 * Classify a Worker pathname.
 * @returns {{ kind: "door"|"local"|"multi"|"none", path: string, originPath?: string, op?: string }}
 */
export function classifyV1Path(pathname) {
  const path = normalizeV1Path(pathname);
  const originPath = mapDoorPath(path);
  if (originPath) return { kind: "door", path, originPath };
  const op = localOpFromPath(path);
  if (op) return { kind: "local", path, op };
  if (path === "/v1" || path === "/v1/") return { kind: "none", path: "/v1" };
  if (path.startsWith("/v1/")) return { kind: "multi", path };
  return { kind: "none", path };
}

export function doorTargetUrl(pathname, requestUrl, env) {
  const mapped = mapDoorPath(pathname);
  if (!mapped) return null;
  const origin = runtimeOrigin(env);
  let search = "";
  try {
    search = new URL(requestUrl).search || "";
  } catch {
    search = "";
  }
  return origin + mapped + search;
}

export function normalizeDoorOrigin(raw) {
  let s = String(raw == null ? "" : raw).trim();
  if (!s) return DEFAULT_RUNTIME_ORIGIN;
  s = s.replace(/^['"]+|['"]+$/g, "");
  s = s.replace(/\/+$/, "");
  s = s.replace(/\/v1\/fraggate$/i, "");
  s = s.replace(/\/+$/, "");
  return s || DEFAULT_RUNTIME_ORIGIN;
}

export function doorBase(env) {
  return runtimeOrigin(env);
}

/** Join origin + path without rewriting onto `/v1/fraggate`. Used by /v1/mesh/*. */
export function joinOriginUrl(base, pathAndQuery) {
  const origin = normalizeDoorOrigin(base);
  const raw = String(pathAndQuery == null ? "" : pathAndQuery);
  const qIndex = raw.indexOf("?");
  const pathOnly = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
  const query = qIndex >= 0 ? raw.slice(qIndex) : "";
  let path = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
  path = path.replace(/\/{2,}/g, "/");
  if (!path || path === "/") path = "/";
  return origin + path + query;
}

export function normalizeMeshPath(pathname) {
  const raw = String(pathname == null ? "" : pathname);
  const noQuery = raw.split("?")[0];
  const path = noQuery.replace(/\/+$/, "") || "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function isMeshPath(pathname) {
  const path = normalizeMeshPath(pathname);
  return path === "/v1/mesh" || path.startsWith("/v1/mesh/");
}

export function doorService(env) {
  const bind = env && env.AZIEL_RUNTIME;
  if (bind && typeof bind === "object" && typeof bind.fetch === "function") return bind;
  return null;
}

function isSelfDoorUrl(url, request) {
  try {
    const there = new URL(url).origin;
    if (there === HOST) return true;
    if (request && request.url) {
      const here = new URL(request.url).origin;
      if (here && here === there) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Fetch an origin path as-is (no /v1/fraggate rewrite).
 * Prefer env.AZIEL_RUNTIME service binding. HTTP fallback when unbound.
 */
export async function originFetch(env, pathAndQuery, init, request) {
  const headers = new Headers((init && init.headers) || {});
  if (!headers.has("User-Agent") && !headers.has("user-agent")) headers.set("User-Agent", "Mozilla/5.0");
  if (!headers.has("Accept") && !headers.has("accept")) headers.set("Accept", "application/json");
  headers.set("X-Aziel-Runtime-Via", "codelock-download-tracker");
  const next = { ...(init || {}), headers };
  if (!next.signal && typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    next.signal = AbortSignal.timeout(20000);
  }

  const raw = String(pathAndQuery == null ? "" : pathAndQuery);
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  const door_url = joinOriginUrl(doorBase(env), path);
  const bind = doorService(env);
  if (bind) {
    const res = await bind.fetch(new Request(SERVICE_BINDING_ORIGIN + path, next));
    return { res, via: "service-binding", door_url };
  }

  if (isSelfDoorUrl(door_url, request)) {
    throw new Error("Door URL points at this Worker — refusing self-fetch loop.");
  }
  const res = await fetch(door_url, next);
  return { res, via: "http", door_url };
}

function meshErrFields({ message, door_url, http_status, content_type, via, extra }) {
  return withQnsCd({
    ok: false,
    code: "MESH-ERR",
    door: "mesh",
    kernel: "mesh",
    spec: "QNM-BUILD-1.0",
    qns_cd_spec: QNS_CD_SPEC,
    author: AUTHOR,
    identity: AUTHOR,
    node_gate: false,
    auto_heal: false,
    anonymity_network: false,
    message,
    door_url: door_url || "",
    http_status: http_status == null ? null : http_status,
    content_type: content_type || "",
    via: via || "",
    ...(extra || {}),
  });
}

/**
 * PROXY one allowlisted /v1/mesh/* path to aziel-runtime.
 * Not a local op. GET never enables. Default radios OFF.
 */
export async function runMeshProxy(env, request, pathAndQuery) {
  const pathOnly = normalizeMeshPath(pathAndQuery);
  const allowed = MESH_ROUTE_METHODS[pathOnly];
  if (!allowed) {
    return {
      status: 404,
      data: meshErrFields({
        message: "Unknown mesh path. Use GET /v1/mesh /status /nodes or POST /enable /disable /join /heartbeat /leave /broadcast.",
        extra: { code: "MESH-UNKNOWN", path: pathOnly },
      }),
    };
  }
  const method = String((request && request.method) || "GET").toUpperCase();
  if (!allowed.includes(method)) {
    return {
      status: 405,
      data: meshErrFields({
        message: "Method not allowed on " + pathOnly + ".",
        extra: { code: "MESH-METHOD", path: pathOnly, method },
      }),
    };
  }

  let search = "";
  try {
    if (pathAndQuery && String(pathAndQuery).includes("?")) {
      search = "?" + String(pathAndQuery).split("?").slice(1).join("?");
    } else if (request && request.url) {
      search = new URL(request.url).search || "";
    }
  } catch {
    search = "";
  }
  const path = pathOnly + search;

  let body;
  if (method === "POST") {
    try {
      body = await request.json();
    } catch {
      body = {};
    }
  }

  const headers = {
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (request && request.headers) {
    const token = request.headers.get("Authorization") || request.headers.get("X-Aziel-Runtime-Token");
    if (token) {
      headers.Authorization = token.startsWith("Bearer ") || token.startsWith("bearer ") ? token : `Bearer ${token}`;
      headers["X-Aziel-Runtime-Token"] = token.replace(/^Bearer\s+/i, "");
    }
  }

  const door_url = joinOriginUrl(doorBase(env), path);
  let fetched;
  try {
    fetched = await originFetch(
      env,
      path,
      {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      request,
    );
  } catch (err) {
    return {
      status: 502,
      data: meshErrFields({
        message: "Mesh door fetch failed.",
        door_url,
        http_status: null,
        content_type: "",
        via: doorService(env) ? "service-binding" : "http",
        extra: { detail: String(err && err.message ? err.message : err) },
      }),
    };
  }

  const res = fetched.res;
  const via = fetched.via;
  const len = Number(res.headers.get("Content-Length") || "0");
  if (Number.isFinite(len) && len > 2 * 1024 * 1024) {
    return {
      status: 502,
      data: meshErrFields({
        message: "Mesh response too large for this Worker proxy.",
        door_url: fetched.door_url || door_url,
        http_status: res.status,
        content_type: res.headers.get("Content-Type") || "",
        via,
      }),
    };
  }

  if (method === "HEAD") {
    return { status: res.status, data: { ok: res.ok, door: "mesh", via } };
  }

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!data || typeof data !== "object") {
    const preview = String(text || "").replace(/\s+/g, " ").slice(0, 160);
    return {
      status: res.status || 502,
      data: meshErrFields({
        message: "Mesh door returned non-JSON.",
        door_url: fetched.door_url || door_url,
        http_status: res.status,
        content_type: res.headers.get("Content-Type") || "",
        via,
        extra: { preview },
      }),
    };
  }
  if (method === "GET" || method === "HEAD") {
    return { status: res.status, data: withQnsCd(data) };
  }
  return { status: res.status, data };
}
