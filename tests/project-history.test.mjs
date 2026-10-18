import assert from "node:assert/strict";
import { File } from "node:buffer";
import test from "node:test";
import * as XLSX from "xlsx";
import {
  analyzeHistoryProjectText,
  extractHistoryProjectFile,
  formatHistoryProjectName,
  formatHistoryPdfTextItems,
  isImportedHistoryId,
  sanitizeHistoryOverrides,
  projectTypeForReuse,
} from "../app/project-history.ts";

const catalog = [
  { id: "cam-fx3", name: "SONY FX3", category: "摄影机", aliases: ["索尼 FX3 摄影机"] },
  { id: "lens-2470", name: "SONY FE 24-70mm F2.8 GM II", category: "镜头", aliases: ["索尼 24-70 GM II"] },
  { id: "grip-rs4", name: "DJI RS 4 Pro", category: "移动器材", aliases: ["大疆 RS4 Pro 稳定器"] },
];

test("unclassified uploads retain a selectable project type when reused or replacing saved projects", () => {
  assert.equal(projectTypeForReuse('剧情片'), '剧情片');
  assert.equal(projectTypeForReuse('自定义项目', 'MV'), 'MV');
  assert.equal(projectTypeForReuse('自定义项目'), '企业宣传片');
});

test("uses a type-based history label unless the user supplies a custom name", () => {
  assert.equal(formatHistoryProjectName("剧情片"), "剧情片器材单");
  assert.equal(formatHistoryProjectName("TVC"), "TVC 器材单");
  assert.equal(formatHistoryProjectName("", ""), "自定义项目器材单");
  assert.equal(formatHistoryProjectName("TVC", "夏季产品广告器材单"), "夏季产品广告器材单");
});

test("analyzes imported project text before replacement", () => {
  const analysis = analyzeHistoryProjectText(
    [
      "夏季产品广告 TVC",
      "2机位 横屏 标准制作",
      "SONY FX3 ×2",
      "SONY FE 24-70mm F2.8 GM II 数量：1",
      "DJI RS 4 Pro 1套",
    ].join("\n"),
    "夏季产品广告.xlsx",
    "XLSX",
    catalog,
    "2026-07-27T00:00:00.000Z",
  );

  assert.equal(analysis.label, "TVC 器材单");
  assert.equal(analysis.type, "TVC");
  assert.equal(analysis.cameraCount, 2);
  assert.equal(analysis.scale, "标准");
  assert.deepEqual(analysis.items, ["cam-fx3", "lens-2470", "grip-rs4"]);
  assert.equal(analysis.quantities["cam-fx3"], 2);
  assert.ok(analysis.styles.includes("稳定器"));
  assert.equal(analysis.source.confidence, "中");
});

test("prefers the longest exact model instead of importing overlapping base models", () => {
  const nestedCatalog = [
    { id: "cam-mini", name: "ARRI ALEXA Mini", category: "摄影机", aliases: [] },
    { id: "cam-mini-lf", name: "ARRI ALEXA Mini LF", category: "摄影机", aliases: [] },
    { id: "cam-alexa-35", name: "ARRI ALEXA 35", category: "摄影机", aliases: ["ARRI Signature Prime 35mm T1.8"] },
    { id: "lens-signature-35", name: "ARRI Signature Prime 35mm/T1.8", category: "镜头", aliases: [] },
  ];

  const miniLf = analyzeHistoryProjectText("ARRI ALEXA Mini LF", "test.txt", "TXT", nestedCatalog);
  assert.deepEqual(miniLf.items, ["cam-mini-lf"]);
  assert.equal(miniLf.cameraCount, 1);

  const lens = analyzeHistoryProjectText("ARRI Signature Prime 35mm/T1.8", "test.txt", "TXT", nestedCatalog);
  assert.deepEqual(lens.items, ["lens-signature-35"]);

  const both = analyzeHistoryProjectText("ARRI ALEXA Mini LF\nARRI ALEXA Mini", "test.txt", "TXT", nestedCatalog);
  assert.deepEqual(both.items, ["cam-mini", "cam-mini-lf"]);
});

test("explicit camera-count labels override equipment quantities in imported lists", () => {
  for (const label of ['机位数量：2', '机位数 = 2', '2机位']) {
    const result = analyzeHistoryProjectText(`${label}\nSONY FX3 数量：3`, 'test.txt', 'TXT', catalog);
    assert.equal(result.cameraCount, 2);
    assert.equal(result.quantities['cam-fx3'], 3);
  }
});

test("recognizes short Chinese equipment names without requiring four characters", () => {
  const shortNameCatalog = [
    { id: "grip-cart", name: "板车", category: "其他", aliases: [] },
    { id: "light-smoke", name: "烟机", category: "灯光器材", aliases: [] },
  ];
  const analysis = analyzeHistoryProjectText("板车,2\n烟机,1", "test.csv", "CSV", shortNameCatalog);

  assert.deepEqual(analysis.items, ["grip-cart", "light-smoke"]);
  assert.equal(analysis.quantities["grip-cart"], 2);
});

test("keeps only valid custom history replacements", () => {
  const saved = sanitizeHistoryOverrides(
    {
      "slot-a": {
        id: "wrong-id",
        label: "TVC｜旧名称 TVC",
        projectName: "已保存项目名",
        type: "TVC",
        subtitle: "导入项目",
        scale: "完整",
        cameraCount: 99,
        styles: ["稳定器", 2],
        lensStyle: "轻量变焦",
        screenFormat: "横屏",
        items: ["cam-fx3", "unknown", "cam-fx3"],
        quantities: { "cam-fx3": 120, unknown: 2 },
        source: {
          fileName: "project.xlsx",
          format: "XLSX",
          importedAt: "2026-07-27T00:00:00.000Z",
          previewText: "SONY FX3",
          confidence: "高",
        },
      },
      "unknown-slot": {
        items: ["cam-fx3"],
        source: {},
      },
    },
    new Set(["slot-a"]),
    new Set(catalog.map((item) => item.id)),
  );

  assert.deepEqual(Object.keys(saved), ["slot-a"]);
  assert.equal(saved["slot-a"].id, "slot-a");
  assert.equal(saved["slot-a"].label, "TVC 器材单");
  assert.equal(saved["slot-a"].projectName, "已保存项目名");
  assert.equal(saved["slot-a"].cameraCount, 8);
  assert.deepEqual(saved["slot-a"].items, ["cam-fx3"]);
  assert.equal(saved["slot-a"].quantities["cam-fx3"], 99);
  assert.equal(saved["slot-a"].source.importedAt, "2026-07-27T00:00:00.000Z");
});

test("accepts generated imported history ids and continues to accept built-in ids", () => {
  const importedId = "imported-history-1785110400000-a1b2c3";
  const source = {
    fileName: "project.xlsx",
    format: "XLSX",
    importedAt: "2026-07-27T00:00:00.000Z",
    previewText: "SONY FX3",
    confidence: "高",
  };
  const saved = sanitizeHistoryOverrides(
    {
      [importedId]: { items: ["cam-fx3"], source },
      "slot-a": { items: ["cam-fx3"], source },
      "imported-history-today-xyz": { items: ["cam-fx3"], source },
    },
    new Set(["slot-a"]),
    new Set(catalog.map((item) => item.id)),
  );

  assert.equal(isImportedHistoryId(importedId), true);
  assert.equal(isImportedHistoryId("imported-history-x-a1b2c3"), false);
  assert.equal(isImportedHistoryId("imported-history-1785110400000-"), false);
  assert.deepEqual(Object.keys(saved), [importedId, "slot-a"]);
  assert.equal(saved[importedId].id, importedId);
});

test("rejects unsafe ids and invalid formats, preserves legacy source defaults, and caps at 500", () => {
  const source = {
    fileName: "project.xlsx",
    format: "XLSX",
    importedAt: "2026-07-27T00:00:00.000Z",
    previewText: "SONY FX3",
    confidence: "高",
  };
  const payload = JSON.parse("{\"__proto__\":{\"items\":[\"cam-fx3\"],\"source\":{\"fileName\":\"project.xlsx\",\"format\":\"XLSX\"}},\"constructor\":{\"items\":[\"cam-fx3\"],\"source\":{\"fileName\":\"project.xlsx\",\"format\":\"XLSX\"}}}");
  payload["imported-history-1785110400000-badsource"] = {
    items: ["cam-fx3"],
    source: { ...source, format: "EXE" },
  };
  payload["imported-history-1785110400000-nofilename"] = {
    items: ["cam-fx3"],
    source: { format: "PDF" },
  };
  payload["imported-history-1785110400000-unsafeequipment"] = {
    items: ["constructor", "cam-fx3"],
    quantities: { constructor: 10, "cam-fx3": 2 },
    source,
  };
  for (let index = 0; index < 501; index += 1) {
    payload[`imported-history-1785110400000-${index.toString(36)}`] = { items: ["cam-fx3"], source };
  }

  const saved = sanitizeHistoryOverrides(
    payload,
    new Set(["constructor"]),
    new Set([...catalog.map((item) => item.id), "constructor"]),
  );

  assert.equal(Object.keys(saved).length, 500);
  assert.equal(Object.hasOwn(saved, "__proto__"), false);
  assert.equal(Object.hasOwn(saved, "constructor"), false);
  assert.equal(Object.hasOwn(saved, "imported-history-1785110400000-badsource"), false);
  assert.equal(saved["imported-history-1785110400000-nofilename"].source.fileName, "导入文件");
  assert.equal(saved["imported-history-1785110400000-nofilename"].source.format, "PDF");
  const equipmentSanitized = saved["imported-history-1785110400000-unsafeequipment"];
  assert.deepEqual(equipmentSanitized.items, ["cam-fx3"]);
  assert.deepEqual(equipmentSanitized.quantities, { "cam-fx3": 2 });
});

test("extracts Excel workbook text locally before analysis", async () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["项目", "春季广告 TVC"],
      ["器材", "数量"],
      ["SONY FX3", 2],
    ]),
    "器材单",
  );
  const bytes = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const file = new File([bytes], "春季广告.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const extracted = await extractHistoryProjectFile(file);

  assert.equal(extracted.format, "XLSX");
  assert.match(extracted.text, /工作表：器材单/);
  assert.match(extracted.text, /SONY FX3,2/);
  const analysis = analyzeHistoryProjectText(extracted.text, file.name, extracted.format, catalog);
  assert.equal(analysis.quantities["cam-fx3"], 2);
});

test("preserves PDF text line boundaries so quantities remain attached to equipment rows", () => {
  const text = formatHistoryPdfTextItems([
    { str: "SONY FX3", transform: [12, 0, 0, 12, 50, 750], hasEOL: false },
    { str: "Qty: 2", transform: [12, 0, 0, 12, 170, 750], hasEOL: true },
    { str: "DJI RS 4 Pro", transform: [12, 0, 0, 12, 50, 750], hasEOL: false },
  ]);
  assert.equal(text, "SONY FX3 Qty: 2\nDJI RS 4 Pro");
  const analysis = analyzeHistoryProjectText(text, "history.pdf", "PDF", catalog);
  assert.equal(analysis.quantities["cam-fx3"], 2);
  const coordinateText = formatHistoryPdfTextItems([
    { str: "SONY FX3 Qty: 2", transform: [12, 0, 0, 12, 50, 750] },
    { str: "DJI RS 4 Pro", transform: [12, 0, 0, 12, 50, 732] },
  ]);
  assert.equal(coordinateText, "SONY FX3 Qty: 2\nDJI RS 4 Pro");
});

test("replaces invalid imported timestamps with a safe value", () => {
  const saved = sanitizeHistoryOverrides(
    {
      "slot-a": {
        label: "TVC｜测试",
        type: "TVC",
        items: ["cam-fx3"],
        source: { fileName: "test.xlsx", format: "XLSX", importedAt: "not-a-date", previewText: "SONY FX3" },
      },
    },
    new Set(["slot-a"]),
    new Set(catalog.map((item) => item.id)),
  );

  assert.equal(saved["slot-a"].source.importedAt, "1970-01-01T00:00:00.000Z");
});

test("preserves an explicitly supplied custom history name", () => {
  const saved = sanitizeHistoryOverrides(
    {
      "slot-a": {
        label: "不应使用的旧标签",
        customName: "自定义广告器材单",
        type: "TVC",
        items: ["cam-fx3"],
        source: { fileName: "客户真实项目.xlsx", format: "XLSX", importedAt: "2026-07-27T00:00:00.000Z", previewText: "SONY FX3" },
      },
    },
    new Set(["slot-a"]),
    new Set(catalog.map((item) => item.id)),
  );

  assert.equal(saved["slot-a"].label, "TVC 器材单");
  assert.equal(saved["slot-a"].projectName, "自定义广告器材单");
  assert.equal(saved["slot-a"].customName, "自定义广告器材单");
});
