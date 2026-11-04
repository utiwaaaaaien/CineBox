import { isValidDateOnly } from "./project-state.ts";
import type { CellObject, SheetData, SheetOptions } from "write-excel-file/browser";

export type ExcelExportProject = {
  name: string;
  type: string;
  shootDate: string;
  dop: string;
  contact: string;
  days: number;
  cameraCount: number;
  notes: string;
  narrativeViewpoint?: string;
  aspectRatio?: string;
  visualTone?: string;
  contrastStyle?: string;
  movementIntent?: string;
  sceneConditions?: string[];
  baseFps?: number;
  highSpeedFps?: number;
  resolution?: string;
  recordingFormat?: string;
  shootingRatio?: number;
  hoursPerDay?: number;
  powerAccess?: string;
};

export type ExcelExportRow = {
  name: string;
  qty: number;
  unit: string;
  note: string;
};

export type ExcelExportGroup = {
  name: string;
  rows: ExcelExportRow[];
};

export type ExcelSystemReview = {
  statusSummary: string;
  checks: Array<{ title: string; level: string; detail: string; missing: string }>;
  equipment: Array<{ name: string; status: string; reason: string }>;
};

const categoryLabels: Record<string, string> = {
  摄影机: "摄影机_CAMERA",
  镜头: "镜头_LENS",
  滤镜: "滤镜_FILTER",
  摄影机附件: "摄影机附件_CAMERA ACCESSORIES",
  监看: "监看_VIDEO",
  移动器材: "移动_GRIP",
  灯光器材: "灯光_LIGHTING",
  录音器材: "录音_SOUND",
  其他: "其他_MISC",
};

const black = "#000000";
const darkGray = "#9B9B9B";
const sectionGray = "#D1D1D1";
const categoryGray = "#DDDDDD";
const white = "#FFFFFF";

function cell(value: CellObject["value"], overrides: CellObject = {}): CellObject {
  return {
    type: typeof value === "string" ? String : undefined,
    value,
    borderColor: black,
    borderStyle: "thin",
    alignVertical: "center",
    ...overrides,
  };
}

function mergedRow(value: string, overrides: CellObject = {}): SheetData[number] {
  return [cell(value, { columnSpan: 5, ...overrides }), null, null, null, null];
}

function formatDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join(".");
}

export function formatShootRange(shootDate: string, days: number) {
  if (!shootDate) return "待定";
  if (!isValidDateOnly(shootDate)) return "日期无效，请核对";
  const start = new Date(`${shootDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return shootDate;
  const safeDays = Math.max(1, Number.isFinite(days) ? Math.floor(days) : 1);
  if (safeDays === 1) return formatDate(start);

  const end = new Date(start);
  end.setDate(end.getDate() + safeDays - 1);
  const endLabel =
    start.getFullYear() === end.getFullYear()
      ? `${String(end.getMonth() + 1).padStart(2, "0")}.${String(end.getDate()).padStart(2, "0")}`
      : formatDate(end);
  return `${formatDate(start)}-${endLabel}`;
}

export function safeExcelFileName(projectName: string) {
  const safeName =
    projectName
      .trim()
      .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, "-")
      .replace(/\s+/g, " ")
      .replace(/[.\s]+$/g, "")
      .slice(0, 80) || "摄影器材单";
  return `${safeName}-摄影器材单.xlsx`;
}

export function buildEquipmentWorkbook(project: ExcelExportProject, groups: ExcelExportGroup[], _review?: ExcelSystemReview) {
  void _review; // Kept for callers using the former optional review argument.
  const hasShootingSpecs = Boolean(
    project.resolution ||
      project.aspectRatio ||
      project.baseFps !== undefined ||
      project.highSpeedFps !== undefined,
  );
  const shootingSpecs = [
    project.resolution,
    project.aspectRatio,
    project.baseFps === undefined ? "" : `${project.baseFps}fps`,
    project.highSpeedFps !== undefined && project.highSpeedFps > (project.baseFps ?? 25)
      ? `升格 ${project.highSpeedFps}fps`
      : "",
  ].filter(Boolean).join(" · ");
  const rows: SheetData = [
    mergedRow("Camera Equipment List", {
      fontWeight: "bold",
      fontSize: 18,
      textColor: white,
      backgroundColor: black,
      height: 30,
      align: "left",
    }),
    [
      cell(`摄影指导：${project.dop || "待定"}    TEL：${project.contact || "—"}`, {
        columnSpan: 4,
        fontWeight: "bold",
        height: 22,
        format: "@",
      }),
      null,
      null,
      null,
      cell(`拍摄时间：${formatShootRange(project.shootDate, project.days)}`, {
        height: 22,
        format: "@",
      }),
    ],
    [
      cell(`项目：${project.name || "未命名项目"}    类型：${project.type || "—"}`, {
        columnSpan: 4,
        backgroundColor: "#F3F3F3",
        height: 21,
      }),
      null,
      null,
      null,
      cell(`${Math.max(1, project.days)} 天 / ${Math.max(1, project.cameraCount)} 机位`, {
        backgroundColor: "#F3F3F3",
        height: 21,
      }),
    ],
    [
      cell("", { backgroundColor: darkGray, height: 22 }),
      cell("设备名称", { backgroundColor: darkGray, fontWeight: "bold" }),
      cell("数量", { backgroundColor: darkGray, fontWeight: "bold", align: "center" }),
      cell("单位", { backgroundColor: darkGray, fontWeight: "bold", align: "center" }),
      cell("备注", { backgroundColor: darkGray, fontWeight: "bold" }),
    ],
  ];

  if (hasShootingSpecs) {
    rows.splice(3, 0, [
      cell("拍摄规格", { backgroundColor: "#F3F3F3", fontWeight: "bold", height: 21 }),
      cell(shootingSpecs, { columnSpan: 4, backgroundColor: "#F3F3F3", height: 21 }),
      null,
      null,
      null,
    ]);
  }

  const populatedGroups = groups
    .map((group) => ({ ...group, rows: group.rows.filter((item) => item.name.trim()) }))
    .filter((group) => group.rows.length);
  populatedGroups.forEach((group) => {
    rows.push(
      mergedRow(categoryLabels[group.name] ?? `${group.name}_MISC`, {
        backgroundColor: sectionGray,
        fontWeight: "bold",
        height: 21,
      }),
    );

    group.rows.forEach((item, index) => {
      rows.push([
        index === 0
          ? cell("", {
              rowSpan: group.rows.length,
              backgroundColor: categoryGray,
            })
          : null,
        cell(item.name, { fontWeight: "bold", wrap: true, height: 20 }),
        cell(item.qty, { type: Number, align: "center" }),
        cell(item.unit, { align: "center" }),
        cell(item.note || "", { wrap: true }),
      ]);
    });
  });

  rows.push([
    cell("备注_REMARK", {
      backgroundColor: sectionGray,
      fontWeight: "bold",
      height: 22,
    }),
    cell(
      project.notes ||
        "请在发单前完成机身、镜头、供电、存储、监看及线材接口兼容性检查。",
      {
        columnSpan: 4,
        wrap: true,
      },
    ),
    null,
    null,
    null,
  ]);

  const sheetOptions: SheetOptions<Blob> = {
    sheet: "器材单",
    orientation: "landscape",
    showGridLines: false,
    stickyRowsCount: hasShootingSpecs ? 5 : 4,
    zoomScale: 1.1,
    columns: [{ width: 18 }, { width: 52 }, { width: 9 }, { width: 10 }, { width: 38 }],
  };

  return {
    rows,
    sheetOptions,
    sheets: [{ data: rows, ...sheetOptions }],
    fileName: safeExcelFileName(project.name),
  };
}
