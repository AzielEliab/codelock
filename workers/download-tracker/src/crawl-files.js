/**
 * Crawl files for the CodeLock download tracker: /llms.txt, /cite.json and /sitemap.xml.
 * Generated from facts already in this Worker (index.js constants, the
 * homepage meta description, and the routes this Worker serves). No new
 * claims. The Zenodo DOI is historical: the record was removed by Zenodo on
 * 2026-09-02 and doi.org returns HTTP 410, so it is printed as text only.
 */

export const CRAWL_META = Object.freeze({
  "name": "CodeLock",
  "description": "CodeLock: reversible view-layer renderer demonstrating perceptual effects in code comprehension.",
  "host": "https://codelock-download-tracker.vibelock.workers.dev",
  "github": "https://github.com/AzielEliab/codelock",
  "catalog_slug": "codelock",
  "doi": "10.5281/zenodo.21431561",
  "doi_removed": "2026-09-02",
  "routes": [
    {
      "path": "/download",
      "label": "Counted download (increments the download counter)"
    },
    {
      "path": "/install.sh",
      "label": "One-line installer"
    },
    {
      "path": "/v1/health",
      "label": "Liveness (does not count downloads)"
    },
    {
      "path": "/v1/skill",
      "label": "Agent skill markdown"
    },
    {
      "path": "/openapi.json",
      "label": "OpenAPI"
    },
    {
      "path": "/mcp",
      "label": "MCP pointer"
    },
    {
      "path": "/v1/mesh",
      "label": "Suite mesh status (proxy to aziel-runtime; default OFF)"
    },
    {
      "path": "/ai",
      "label": "How to wire AI assistants"
    }
  ]
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export function llmsTxt(meta = CRAWL_META) {
  const lines = [
    "# " + meta.name,
    "",
    "Author: Aziel Eliab",
    "Identity: Aziel Eliab only.",
    "License: Apache-2.0. Forks welcome.",
    "",
    meta.description,
    "",
    "Homepage: " + meta.host + "/",
  ];
  for (const r of meta.routes) lines.push(r.label + ": " + meta.host + r.path);
  lines.push("Cite: " + meta.host + "/cite.json");
  lines.push("GitHub: " + meta.github);
  lines.push("Catalog: https://aziel-runtime.vibelock.workers.dev/p/" + meta.catalog_slug);
  lines.push("Catalog MCP: POST https://aziel-runtime.vibelock.workers.dev/mcp");
  if (meta.doi) {
    lines.push("");
    lines.push("Historical DOI: " + meta.doi + " (Zenodo record removed " + meta.doi_removed + "; doi.org returns HTTP 410. Not a live record.)");
  }
  lines.push("");
  return lines.join("\n");
}

export function citeDoc(meta = CRAWL_META) {
  return {
    author: "Aziel Eliab",
    identity: "Aziel Eliab only",
    title: meta.name,
    description: meta.description,
    github: meta.github,
    homepage: meta.host + "/",
    download: meta.host + "/download",
    doi: meta.doi,
    doi_status: meta.doi ? "historical: Zenodo record removed " + meta.doi_removed + "; doi.org returns HTTP 410" : null,
    license: "Apache-2.0",
    catalog: "https://aziel-runtime.vibelock.workers.dev/",
    llms: meta.host + "/llms.txt",
  };
}

export function sitemapXml(meta = CRAWL_META) {
  const locs = [meta.host + "/"]
    .concat(meta.routes.filter((r) => r.path !== "/v1/health").map((r) => meta.host + r.path))
    .concat([meta.host + "/cite.json", meta.host + "/llms.txt"]);
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    locs.map((u) => "  <url><loc>" + u + "</loc></url>").join("\n") +
    "\n</urlset>\n"
  );
}

export function crawlFileResponse(url, request, meta = CRAWL_META) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const p = url.pathname.replace(/\/$/, "") || "/";
  let body = null;
  let type = null;
  if (p === "/llms.txt") {
    body = llmsTxt(meta);
    type = "text/plain; charset=utf-8";
  } else if (p === "/cite.json") {
    body = JSON.stringify(citeDoc(meta), null, 2);
    type = "application/json; charset=utf-8";
  } else if (p === "/sitemap.xml") {
    body = sitemapXml(meta);
    type = "application/xml; charset=utf-8";
  }
  if (body === null) return null;
  return new Response(request.method === "HEAD" ? null : body, {
    status: 200,
    headers: { "Content-Type": type, "Cache-Control": "public, max-age=300", ...corsHeaders() },
  });
}
