import assert from "node:assert/strict";
import test from "node:test";
import { buildEquipmentWorkbook, formatShootRange, safeExcelFileName } from "../app/excel-export.ts";

const project = {
  name: "《测试/项目》",
  type: "剧情片",
  shootDate: "2026-07-23",
  dop: "摄影指导",
  contact: "13800138000",
  days: 3,
  cameraCount: 2,
  notes: "跟机员一位",
};

const groups = [
  {
    name: "摄影机",
    rows: [
      { name: "ARRI ALEXA MINI LF Digital Camera KIT", qty: 2, unit: "台", note: "套件配齐" },
      { name: "DJI Ronin 4D 8K", qty: 1, unit: "台", note: "" },
    ],
  },
  {
    name: "镜头",
    rows: [{ name: "Atlas Mercury 36mm T2.2", qty: 1, unit: "颗", note: "提前擦拭镜片" }],
  },
];

test("formats a multi-day shoot range like the historical equipment lists", () => {
  assert.equal(formatShootRange("2026-07-23", 3), "2026.07.23-07.25");
  assert.equal(formatShootRange("2026-12-31", 2), "2026.12.31-2027.01.01");
  assert.equal(formatShootRange("", 2), "待定");
});

test("creates a filesystem-safe workbook name", () => {
  assert.equal(safeExcelFileName(project.name), "《测试-项目》-摄影器材单.xlsx");
  assert.equal(safeExcelFileName("测试项目...   "), "测试项目-摄影器材单.xlsx");
  assert.ok(safeExcelFileName("很长".repeat(100)).length < 100);
});

test("matches the historical Camera Equipment List structure", () => {
  const workbook = buildEquipmentWorkbook(project, groups);
  assert.equal(workbook.fileName, "《测试-项目》-摄影器材单.xlsx");
  assert.equal(workbook.sheetOptions.sheet, "器材单");
  assert.equal(workbook.sheetOptions.orientation, "landscape");
  assert.equal(workbook.sheetOptions.showGridLines, false);
  assert.equal(workbook.sheetOptions.stickyRowsCount, 4);
  assert.equal(workbook.sheets.length, 1);
  assert.equal(workbook.sheets[0].sheet, "器材单");

  assert.equal(workbook.rows[0][0].value, "Camera Equipment List");
  assert.match(workbook.rows[1][0].value, /摄影指导：摄影指导/);
  assert.match(workbook.rows[1][4].value, /拍摄时间：2026\.07\.23-07\.25/);
  assert.match(workbook.rows[2][0].value, /项目：《测试\/项目》    类型：剧情片/);
  assert.equal(workbook.rows[2][4].value, "3 天 / 2 机位");
  assert.equal(workbook.rows[0][0].columnSpan, 5);
  assert.equal(workbook.rows[4][0].value, "摄影机_CAMERA");
  assert.equal(workbook.rows[5][0].rowSpan, 2);
  assert.equal(workbook.rows[5][1].value, "ARRI ALEXA MINI LF Digital Camera KIT");
  assert.equal(workbook.rows[5][2].type, Number);
  assert.equal(workbook.rows[5][2].value, 2);
  assert.equal(workbook.rows[5][4].value, "套件配齐");
  assert.equal(workbook.rows[6][1].value, "DJI Ronin 4D 8K");
  assert.equal(workbook.rows[6][2].value, 1);
  assert.equal(workbook.rows[6][4].value, "");
  assert.equal(workbook.rows[8][4].value, "提前擦拭镜片");
  assert.equal(workbook.rows.at(-1)[0].value, "备注_REMARK");
  assert.equal(workbook.rows.at(-1)[1].columnSpan, 4);
  assert.equal(workbook.rows.at(-1)[1].value, "跟机员一位");

  for (const row of workbook.rows) assert.equal(row.length, 5);
});

test("uses current write-excel-file style keys instead of deprecated export keys", () => {
  const workbook = buildEquipmentWorkbook(project, groups);
  for (const row of workbook.rows) {
    for (const cell of row) {
      if (!cell || typeof cell !== "object") continue;
      assert.equal("span" in cell, false);
      assert.equal("color" in cell, false);
    }
  }
});

test("exports only the equipment sheet and ignores optional system review data", () => {
  const workbook = buildEquipmentWorkbook({
    ...project,
    narrativeViewpoint: "人物主观",
    aspectRatio: "2.39:1",
    visualTone: "低饱和柔和",
    contrastStyle: "低反差",
    movementIntent: "克制静观",
    sceneConditions: ["夜外"],
    resolution: "4K",
    baseFps: 25,
    highSpeedFps: 100,
    recordingFormat: "RAW / 高码率",
    shootingRatio: 20,
    hoursPerDay: 12,
    powerAccess: "无市电",
  }, groups, {
    statusSummary: "1 已确认 · 1 待确认",
    checks: [{ title: "机身与镜头卡口兼容", level: "待确认", detail: "需要转接", missing: "PL → E 转接" }],
    equipment: [{ name: "Sony FX3", status: "已确认", reason: "轻量跟随" }],
  });

  assert.equal(workbook.sheets.length, 1);
  assert.equal(workbook.sheets[0].sheet, "器材单");
  assert.equal(workbook.sheetOptions.stickyRowsCount, 5);
  assert.equal(workbook.rows[3][0].value, "拍摄规格");
  assert.equal(workbook.rows[3][1].value, "4K · 2.39:1 · 25fps · 升格 100fps");
  assert.equal("reviewRows" in workbook, false);
  assert.equal("reviewSheetOptions" in workbook, false);
  assert.ok(!JSON.stringify(workbook).includes("系统审阅"));
  assert.ok(!JSON.stringify(workbook).includes("机身与镜头卡口兼容"));
  assert.ok(!JSON.stringify(workbook).includes("Sony FX3"));
  assert.ok(!JSON.stringify(workbook).includes("低饱和柔和"));
  assert.ok(!JSON.stringify(workbook).includes("人物主观"));
  assert.equal(workbook.rows[2][0].value, "项目：《测试/项目》    类型：剧情片");
  assert.equal(workbook.rows[2][4].value, "3 天 / 2 机位");
});

test('user text is explicitly exported as text and control characters cannot enter filenames', () => {
  const workbook = buildEquipmentWorkbook({...project,notes:'=HYPERLINK("https://example.test")'},[{name:'其他',rows:[{name:'=1+1',qty:1,unit:'@test',note:'+cmd'}]}]);
  for (const row of workbook.rows) for (const cell of row) {
    if (cell && typeof cell.value==='string') assert.equal(cell.type,String);
  }
  assert.doesNotMatch(safeExcelFileName('测试\u0000\n文件'),/[\u0000-\u001f\u007f]/);
});

test('invalid calendar dates are never silently shifted to a different shooting day', () => {
  assert.equal(formatShootRange('2026-02-31',2),'日期无效，请核对');
  assert.equal(formatShootRange('2024-02-29',2),'2024.02.29-03.01');
});

test('generated Excel bytes preserve formula-like text and large quantities through a real roundtrip', async () => {
  const [{default:writeXlsxFile},XLSX] = await Promise.all([import('write-excel-file/browser'),import('xlsx')]);
  const workbook = buildEquipmentWorkbook(project,[{name:'其他',rows:[{name:'=1+1',qty:120,unit:'件',note:'+客户备注'}]}]);
  const blob = await writeXlsxFile(workbook.sheets).toBlob();
  const reopened = XLSX.read(await blob.arrayBuffer());
  const sheet = reopened.Sheets[reopened.SheetNames[0]];
  assert.equal(sheet.B6.t,'s');
  assert.equal(sheet.B6.v,'=1+1');
  assert.equal(sheet.B6.f,undefined);
  assert.equal(sheet.C6.v,120);
  assert.equal(sheet.E6.v,'+客户备注');
});

test('blank custom rows and empty categories never enter real Excel bytes or change valid equipment data', async () => {
  const [{ default: writeXlsxFile }, XLSX] = await Promise.all([import('write-excel-file/browser'), import('xlsx')]);
  const mixedGroups = [
    { name: '摄影机', rows: [{ name: '', qty: 999, unit: '台', note: '空白摄影机不得导出' }] },
    { name: '移动器材', rows: [
      { name: '  ', qty: 999, unit: '件', note: '首个空白不得导出' },
      { name: '自备滑轨', qty: 120, unit: '套', note: '保留客户备注' },
      { name: '', qty: 999, unit: '件', note: '中间空白不得导出' },
      { name: '伸缩摇臂', qty: 2, unit: '套', note: '保留长度' },
      { name: '\t\n', qty: 999, unit: '件', note: '末尾空白不得导出' },
    ] },
    { name: '灯光器材', rows: [] },
  ];
  const original = JSON.stringify(mixedGroups);
  const workbook = buildEquipmentWorkbook(project, mixedGroups);
  assert.equal(JSON.stringify(mixedGroups), original);
  assert.equal(workbook.rows[4][0].value, '移动_GRIP');
  assert.equal(workbook.rows[5][0].rowSpan, 2);
  assert.equal(workbook.rows.length, 8);
  const blob = await writeXlsxFile(workbook.sheets).toBlob();
  const reopened = XLSX.read(await blob.arrayBuffer());
  const sheet = reopened.Sheets[reopened.SheetNames[0]];
  const cells = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  assert.deepEqual(cells[5].slice(1), ['自备滑轨', 120, '套', '保留客户备注']);
  assert.deepEqual(cells[6].slice(1), ['伸缩摇臂', 2, '套', '保留长度']);
  const serialized = JSON.stringify(cells);
  assert.doesNotMatch(serialized, /摄影机_CAMERA|灯光_LIGHTING|不得导出|999/);
  assert.equal(cells.filter(row => typeof row[2] === 'number').length, 2);
  const allBlank = buildEquipmentWorkbook(project, [mixedGroups[0]]);
  assert.equal(allBlank.rows.length, 5);
  assert.equal(allBlank.rows.at(-1)[0].value, '备注_REMARK');
});
