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
