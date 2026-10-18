import assert from "node:assert/strict";
import test from "node:test";
import { canonicalEquipmentStats } from "../app/equipment-catalog.canonical.ts";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the CineBox application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.ok(html.includes("<title>CineBox</title>"));
  assert.match(html, /class="release-disclosure"/);
  assert.match(html, /更新内容/);
  assert.match(html, /CineBox/);
  assert.match(html, /历史项目/);
  assert.match(html, /选择器材/);
  assert.match(html, /项目管理/);
  assert.doesNotMatch(html, /分类配置|CATEGORY WALKTHROUGH/);
  assert.match(html, /总器材库/);
  assert.match(html, /当前项目/);
  assert.match(html, /当前器材单/);
  assert.doesNotMatch(html, /selection-routes/);
  assert.match(html, /颜色模式/);
  assert.match(html, /跟随系统/);
  assert.match(html, /浅色模式/);
  assert.match(html, /深色模式/);
  assert.match(html, /选择器材方式/);
  assert.doesNotMatch(html, /确定拍摄需求|按需求生成|创作意图与预算参考|拍摄规格与供电/);
  assert.match(html, /撤销清单修改/);
  assert.match(html, /选择器材/);
  assert.doesNotMatch(html, /画面方向|成片画幅|DOP DECISION BRIEF/);
  assert.match(html, /新建项目/);
  assert.ok(html.includes(String(canonicalEquipmentStats.publishedRows)));
  assert.doesNotMatch(html, />APM</);
  assert.doesNotMatch(html, />光园</);
  assert.doesNotMatch(html, />KO</);
  assert.doesNotMatch(html, /SELECT YOUR ROUTE/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});
