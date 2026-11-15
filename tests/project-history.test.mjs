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
  assert.equal(saved["slot-a"].quantities["cam-fx3"], 120);
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

test("rejects unsafe ids and invalid formats, preserves legacy source defaults and all valid history records", () => {
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

  assert.equal(Object.keys(saved).length, 503);
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

test("preserves generations and rejects unknown model suffixes and ambiguous aliases", () => {
  const models = [
    { id: "base", name: "SONY Camera", category: "摄影机" },
    { id: "second", name: "SONY Camera II", category: "摄影机", aliases: ["SONY Camera"] },
    { id: "third", name: "SONY Camera III", category: "摄影机", aliases: ["SONY Camera"] },
    { id: "fx3", name: "SONY FX3", category: "摄影机" },
    { id: "a", name: "甲厂监视器", category: "监看", aliases: ["小监视器"] },
    { id: "b", name: "乙厂监视器", category: "监看", aliases: ["小监视器"] },
  ];
  const analyze = (text) => analyzeHistoryProjectText(text, "test.txt", "TXT", models);
  assert.deepEqual(analyze("SONY Camera 二代 2台\nSONY Camera Mark III ×3").items, ["second", "third"]);
  assert.deepEqual(analyze("SONY Camera 二代 2台\nSONY Camera Mark III ×3").quantities, { second: 2, third: 3 });
  assert.deepEqual(analyze("SONY Camera").items, ["base"]);
  assert.deepEqual(analyze("SONY Camera IV\nSONY FX30\n小监视器").items, []);
  assert.equal(analyze("SONY FX3").quantities, undefined);
});

test("adds repeated rows, keeps same-row quantities separate and handles Chinese and zero quantities", () => {
  const result = analyzeHistoryProjectText([
    "SONY FX3×2；DJI RS 4 Pro×3",
    "SONY FX3 两台",
    "DJI RS 4 Pro 数量：十",
    "SONY FE 24-70mm F2.8 GM II 数量：0",
  ].join("\n"), "test.txt", "TXT", catalog);
  assert.deepEqual(result.items, ["cam-fx3", "grip-rs4"]);
  assert.deepEqual(result.quantities, { "cam-fx3": 4, "grip-rs4": 13 });
  const separateLines = analyzeHistoryProjectText("SONY\nFX3", "test.txt", "TXT", catalog);
  assert.deepEqual(separateLines.items, []);
});

test("reads quantity columns before prices or notes, including quoted CSV cells", () => {
  const result = analyzeHistoryProjectText([
    "器材,数量,单价,备注",
    '"SONY FX3",2,800,"含附件,两天"',
    '"DJI RS 4 Pro",3,500,"含配件"',
  ].join("\n"), "test.csv", "CSV", catalog);
  assert.deepEqual(result.quantities, { "cam-fx3": 2, "grip-rs4": 3 });
});

test('import and restoration preserve quantities above 99 and bound at the project limit', () => {
  const result = analyzeHistoryProjectText('型号,数量\nSONY FX3,120\nDJI RS 4 Pro,999', 'many.csv', 'CSV', catalog);
  assert.deepEqual(result.quantities, { 'cam-fx3': 120, 'grip-rs4': 999 });
  assert.equal(analyzeHistoryProjectText('SONY FX3 数量:1000', 'many.txt', 'TXT', catalog).quantities['cam-fx3'], 999);
  const saved = sanitizeHistoryOverrides({'slot-a': {...result, cameraCount: NaN}}, new Set(['slot-a']), new Set(catalog.map(item => item.id)));
  assert.equal(saved['slot-a'].quantities['cam-fx3'], 120);
  assert.equal(saved['slot-a'].cameraCount, 1);
});

test('oversized text and spreadsheets fail explicitly instead of silently dropping equipment', async () => {
  await assert.rejects(extractHistoryProjectFile(new File(['x'.repeat(300001)],'large.txt')),/超过 30 万字/);
  const workbook = XLSX.utils.book_new();
  for(let i=0;i<31;i++) XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet([['SONY FX3',1]]),`sheet${i}`);
  await assert.rejects(extractHistoryProjectFile(new File([XLSX.write(workbook,{type:'array',bookType:'xlsx'})],'many.xlsx')),/超过 30 张工作表/);
  const wide = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wide,XLSX.utils.aoa_to_sheet([Array.from({length:101},()=>1)]),'wide');
  await assert.rejects(extractHistoryProjectFile(new File([XLSX.write(wide,{type:'array',bookType:'xlsx'})],'wide.xlsx')),/超过 10000 行或 100 列/);
});

test("ambiguous full names block shorter aliases instead of guessing a category", async () => {
  const { publishedEquipment } = await import("../app/equipment-catalog.canonical.ts");
  const ambiguousNames = ["通用 铝管", "通用 移动脚手架"];
  for (const name of ambiguousNames) {
    const identities = publishedEquipment.filter(item => item.name === name);
    assert.equal(identities.length, 2);
    assert.equal(new Set(identities.map(item => item.category)).size, 2);
    const analysis = analyzeHistoryProjectText(`${name},2`, "test.csv", "CSV", publishedEquipment);
    assert.deepEqual(analysis.items, []);
  }
  const isolated = [
    { id: "a", name: "通用 肩架", category: "摄影机附件" },
    { id: "b", name: "通用 肩架", category: "移动器材", aliases: ["肩架"] },
    { id: "camera", name: "SONY FX3", category: "摄影机" },
  ];
  const analysis = analyzeHistoryProjectText("通用 肩架,2\nSONY FX3,3", "test.csv", "CSV", isolated);
  assert.deepEqual(analysis.items, ["camera"]);
  assert.equal(analysis.quantities.camera, 3);
});

async function analyzeJsonFile(value, equipment = catalog) {
  const file = new File([JSON.stringify(value)], '历史器材.json', { type: 'application/json' });
  const extracted = await extractHistoryProjectFile(file);
  assert.equal(extracted.format, 'JSON');
  return analyzeHistoryProjectText(extracted.text, file.name, extracted.format, equipment);
}

test('JSON file rows retain name and qty association rather than defaulting every model to one', async () => {
  const result = await analyzeJsonFile([{ name: 'SONY FX3', qty: 3, price: 800, note: '数量：99，DJI RS 4 Pro 备用' }]);
  assert.deepEqual(result.items, ['cam-fx3']);
  assert.equal(result.quantities['cam-fx3'], 3);
  assert.equal(result.cameraCount, 3);
});

test('nested JSON arrays sum repeated equipment and preserve explicit zero and quantity field aliases', async () => {
  const result = await analyzeJsonFile({
    name: 'SONY FX3 器材清单',
    notes: 'SONY FX3 数量：88',
    price: 'SONY FX3 数量：99',
    data: { groups: [
      { name: '摄影机', rows: [{ name: 'SONY FX3', qty: 3 }, { name: 'SONY FX3', quantity: '2台' }] },
      { name: '镜头', items: [{ 名称: 'SONY FE 24-70mm F2.8 GM II', 数量: 0 }] },
      { equipment: [{ equipment_name: 'DJI RS 4 Pro', QUANTITY: 4, price: 900, notes: '数量：88' }] },
    ] },
  });
  assert.deepEqual(result.items, ['cam-fx3', 'grip-rs4']);
  assert.deepEqual(result.quantities, { 'cam-fx3': 5, 'grip-rs4': 4 });
  const noQty = await analyzeJsonFile([{ name: 'SONY FX3', price: 500, note: '数量：20' }]);
  assert.deepEqual(noQty.items, ['cam-fx3']);
  assert.equal(noQty.quantities, undefined);
});

test('JSON file extraction keeps generations separate and handles names with commas and line breaks', async () => {
  const equipment = [
    { id: 'second', name: 'SONY Camera II', category: '摄影机' },
    { id: 'third', name: 'SONY Camera III', category: '摄影机' },
    { id: 'comma', name: 'Acme Filter, Kit', category: '滤镜' },
  ];
  const result = await analyzeJsonFile({ equipment: [
    { name: 'SONY\nCamera II', qty: 2 },
    { name: 'SONY Camera III', quantity: 3 },
    { name: 'Acme Filter,\nKit', 数量: 4 },
  ] }, equipment);
  assert.deepEqual(result.items, ['second', 'third', 'comma']);
  assert.deepEqual(result.quantities, { second: 2, third: 3, comma: 4 });
});

test('JSON text wrappers and string arrays remain compatible with plain-text model matching', async () => {
  for (const value of [
    'SONY FX3 ×3\nDJI RS 4 Pro ×2',
    { text: 'SONY FX3 ×3\nDJI RS 4 Pro ×2' },
    ['SONY FX3 ×3', 'DJI RS 4 Pro ×2'],
  ]) {
    const result = await analyzeJsonFile(value);
    assert.deepEqual(result.quantities, { 'cam-fx3': 3, 'grip-rs4': 2 });
  }
  for (const qty of [-1, 1.5, '3 x 800', null]) {
    await assert.rejects(analyzeJsonFile([{ name: 'SONY FX3', qty }]), /JSON 器材数量无效/);
  }
});
