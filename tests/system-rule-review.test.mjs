import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { systemRuleReview } from "../app/system-rule-review-data.ts";

test("the review includes each camera system rule and its linked-replacement mode", () => {
  const source = readFileSync(new URL("../app/camera-system-rules.ts", import.meta.url), "utf8");
  const definitions = [...source.matchAll(/addRule\(\s*"([^"]+)"[\s\S]*?,\s*"(?:warning|info)",\s*(true|false),/g)];
  assert.ok(definitions.length > 0);
  assert.deepEqual(systemRuleReview.map(({ id, linked }) => [id, linked]),
    definitions.map(([, id, linked]) => [id, linked === "true"]));
  for (const rule of systemRuleReview) {
    assert.ok(rule.title.trim() && rule.when.trim() && rule.additions.trim(), rule.id);
  }
});
