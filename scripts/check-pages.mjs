import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

export async function checkPages({ basePath = "/CineBox" } = {}) {
  const root = resolve("dist/client");
  const html = await readFile(resolve(root, "index.html"), "utf8");
  assert.match(html, /<title>CineBox<\/title>/);
  assert.match(html, /项目管理/);
  assert.match(html, /V6\.1/);
  assert.match(html, /__VINEXT_RSC_DONE__/);

  const resources = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
    .map((match) => match[1]).filter((url) => url.startsWith("/") && !url.startsWith("//"));
  assert.ok(resources.some((url) => url.endsWith(".css")), "Missing stylesheet");
  assert.ok(resources.some((url) => url.endsWith(".js")), "Missing client bundle");
  for (const url of new Set(resources)) {
    assert.ok(url.startsWith(`${basePath}/`), `Asset missing the Pages prefix: ${url}`);
    await access(resolve(root, decodeURIComponent(url.slice(basePath.length + 1).split("?")[0])));
  }

  const manifest = JSON.parse(await readFile(resolve(root, "site-v2.webmanifest"), "utf8"));
  for (const icon of manifest.icons) {
    assert.ok(!icon.src.startsWith("/"), "Manifest icons must be relative to the project site");
    await access(resolve(root, icon.src));
  }
  assert.ok((await readdir(resolve(root, "assets"))).some((name) => name.startsWith("pdf.worker") && name.endsWith(".mjs")), "Missing PDF worker");
  const analytics = JSON.parse(await readFile(resolve("config/analytics.json"), "utf8"));
  if (analytics.websiteId) {
    assert.equal((html.match(/data-website-id=/g) ?? []).length, 1, "Umami must load exactly once");
    assert.ok(html.includes(`data-website-id="${analytics.websiteId}"`));
    assert.ok(html.includes(`src="${analytics.scriptUrl}"`));
    assert.ok(html.includes('data-exclude-search="true"') && html.includes('data-exclude-hash="true"'));
  }
  console.log(`Static Pages checks passed (${new Set(resources).size} local resources, manifest icons, PDF worker, and analytics configuration).`);
}
