// Verifies the crawl files served by this Worker. Run: node scripts/verify-crawl-files.mjs
import { readFileSync } from "node:fs";
import { CRAWL_META, crawlFileResponse } from "../src/crawl-files.js";

let failed = 0;
const ok = (cond, msg) => {
  if (!cond) {
    failed++;
    console.error("FAIL " + msg);
  } else console.log("ok " + msg);
};
const NOT_SERVED = new Response("not served by crawl files", { status: 404 });
async function get(path, method = "GET") {
  const req = new Request(CRAWL_META.host + path, { method, headers: { "User-Agent": "Mozilla/5.0" } });
  return crawlFileResponse(new URL(req.url), req) || NOT_SERVED.clone();
}

// index.js must hand crawl paths to crawl-files.js first thing in fetch().
const indexSrc = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
ok(/^import \{ crawlFileResponse \} from "\.\/crawl-files\.js";/m.test(indexSrc), "index.js imports crawl-files.js");
ok(/async fetch\(request, env\) \{\n    const url = new URL\(request\.url\);\n    \/\/ Crawl files[^\n]*\n    const crawlFile = crawlFileResponse\(url, request\);\n    if \(crawlFile\) return crawlFile;/.test(indexSrc), "index.js serves crawl files before any other route");
ok((await get("/download")).status === 404 && (await get("/")).status === 404, "crawl files do not shadow /download or /");
ok((await get("/llms.txt", "POST")).status === 404, "POST /llms.txt is not served by crawl files");

const llms = await get("/llms.txt");
const text = await llms.text();
ok(llms.status === 200, "/llms.txt 200");
ok(/^text\/plain/.test(llms.headers.get("content-type") || ""), "/llms.txt text/plain");
ok(text.startsWith("# " + CRAWL_META.name + "\n"), "llms.txt title is the product name");
ok(text.includes("Author: Aziel Eliab"), "llms.txt author");
ok(text.includes(CRAWL_META.github), "llms.txt GitHub link");
ok(text.includes(CRAWL_META.description), "llms.txt description is the Worker's existing description");
ok(!/https:\/\/doi\.org\//.test(text) && !/zenodo\.org\/records/.test(text), "llms.txt has no dead DOI/Zenodo link");
if (CRAWL_META.doi) ok(text.includes("HTTP 410"), "llms.txt labels the DOI historical (410)");
ok((await get("/llms.txt/")).status === 200, "/llms.txt/ trailing slash 200");
const head = await get("/llms.txt", "HEAD");
ok(head.status === 200 && (await head.text()) === "", "HEAD /llms.txt 200 with empty body");

const cite = await get("/cite.json");
ok(cite.status === 200, "/cite.json 200");
const cj = await cite.json();
ok(cj.author === "Aziel Eliab" && cj.title === CRAWL_META.name && cj.github === CRAWL_META.github, "cite.json identity/title/github");
ok(cj.doi === CRAWL_META.doi, "cite.json doi matches the Worker's own DOI constant (or null)");
if (cj.doi) ok(/410/.test(cj.doi_status), "cite.json labels DOI historical");
const sm = await get("/sitemap.xml");
const smText = await sm.text();
ok(sm.status === 200 && /^application\/xml/.test(sm.headers.get("content-type") || ""), "/sitemap.xml 200 xml");
const locs = [...smText.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
ok(locs.length >= 3, "sitemap has locs");
ok(locs.every((u) => u.startsWith(CRAWL_META.host + "/")), "every sitemap loc is on this host");
ok(locs.includes(CRAWL_META.host + "/llms.txt") && locs.includes(CRAWL_META.host + "/cite.json"), "sitemap lists llms.txt and cite.json");

if (failed) {
  console.error(failed + " check(s) failed");
  process.exit(1);
}
console.log("verify-crawl-files: all checks passed");
