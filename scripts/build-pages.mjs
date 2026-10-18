import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/CineBox";
if (basePath && (!basePath.startsWith("/") || basePath.endsWith("/") || basePath.includes(".."))) {
  throw new Error("NEXT_PUBLIC_BASE_PATH must be empty or an absolute path without a trailing slash");
}

Object.assign(process.env, {
  CINEBOX_GITHUB_PAGES: "true",
  NEXT_PUBLIC_BASE_PATH: basePath,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "https://utiwaaaaaien.github.io/CineBox/",
  WRANGLER_WRITE_LOGS: "false",
});

const result = spawnSync(process.execPath, ["node_modules/vinext/dist/cli.js", "build"], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

const output = resolve("dist/client");
// vinext 0.0.50's exporter requests `/` even when basePath is configured.
// Render the actual project URL at build time; only static files are deployed.
const { default: worker } = await import(new URL("../dist/server/index.js", import.meta.url));
const requestUrl = new URL(`${basePath}/`, process.env.NEXT_PUBLIC_SITE_URL);
const environment = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const context = { waitUntil() {}, passThroughOnException() {} };
const response = await worker.fetch(new Request(requestUrl, { headers: { accept: "text/html" } }), environment, context);
if (response.status !== 200) throw new Error(`Static HTML rendering returned ${response.status}`);
const html = await response.text();
if (!html.includes("CineBox") || !html.includes("项目管理")) {
  throw new Error("Static export did not contain the CineBox application shell");
}
await writeFile(resolve(output, "index.html"), html);
const { extractRscPayloadFromPrerenderedHtml } = await import(
  new URL("./build/prerender.js", import.meta.resolve("vinext"))
);
const rscPayload = extractRscPayloadFromPrerenderedHtml(html);
if (!rscPayload) throw new Error("Static HTML is missing its complete RSC hydration payload");
await writeFile(resolve(output, "index.rsc"), rscPayload);
await writeFile(resolve(output, ".nojekyll"), "");
const { checkPages } = await import("./check-pages.mjs");
await checkPages({ basePath });
console.log(`GitHub Pages static files are ready in ${output}`);
