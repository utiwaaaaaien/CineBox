"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import Image from "next/image";
import { publicAsset } from "./site-config";
import { canonicalEquipment, publishedEquipment, canonicalBrandLabels, canonicalEquipmentRedirects } from "./equipment-catalog.canonical";
import { equipmentCardData } from "./equipment-card-data.generated";
import { historyCameraModel } from "./history-camera";
import { resolveCatalogId, migrateCatalogProjects, migrateCatalogHistory } from "./catalog-identity";
import { buildEquipmentSeries, type EquipmentSeries } from "./equipment-series";
import { buildCameraSystemChecks, type CameraSystemCheck, type RuleAddition } from "./camera-system-rules";
import { useProjectAutosave, readProjectAutosave } from "./use-project-autosave";
import { readStoredHistory } from "./project-autosave";
import { appVersion, releaseNotes } from "./release";
import { SpecField } from "./spec-field";
import { resolutionOptions, aspectRatioOptions, projectFpsOptions, highSpeedFpsOptions } from "./project-specs";
import { CatalogChoice, type CatalogOption } from "./catalog-choice";
import { ActionMenu } from "./action-menu";
import { brandMenuLabels } from "./catalog-brands";
import { categoryBrands, filterCatalog, copyHistoricalKit, basicSystemProject } from "./direct-selection";
import { createCustomKitRow, updateCustomKitRow, isBlankCustomKitItem, applyEquipmentSuggestion } from "./custom-equipment";
import { EquipmentNameInput } from "./equipment-name-input";
import { createEquipmentMatcher } from "./equipment-search";
import { formatShootRange, safeExcelFileName, type ExcelExportGroup } from "./excel-export";
import type { KitDocumentFormat } from "./kit-document-export";
import {
  analyzeHistoryProjectText,
  maxHistoryOverrides,
  extractHistoryProjectFile,
  formatHistoryProjectName,
  sanitizeHistoryOverrides,
  isImportedHistoryId,
  projectTypeForReuse,
  type HistoryProjectProfile,
} from "./project-history";
import {
  sanitizeProjectRecords,
  projectCapacityError,
  historyCapacityError,
  kitCapacityError,
  maxKitNoteInputLength,
  type ProjectCustomEquipment,
  type ProjectKitItem,
  type ProjectStateRecord,
} from "./project-state";

type View = "projects" | "history" | "library" | "catalog" | "kit";
import { completeKitAdditions, addKitSelection, recordKitChange, travelKitHistory, describeKitChange, frameSelection, type KitHistory } from "./kit-workflow";

type ThemePreference = "system" | "light" | "dark";
type EquipmentCategory =
  | "摄影机"
  | "镜头"
  | "滤镜"
  | "摄影机附件"
  | "监看"
  | "移动器材"
  | "灯光器材"
  | "录音器材"
  | "其他";

type Equipment = (typeof canonicalEquipment)[number];

type CustomEquipment = ProjectCustomEquipment<EquipmentCategory>;
type KitItem = ProjectKitItem<EquipmentCategory>;

type ProjectForm = {
  recommendationMode: "history" | "manual";
  historyProfileId: string;
  name: string;
  type: string;
  category: string;
  shootDate: string;
  dop: string;
  contact: string;
  days: number;
  cameraCount: number;
  scale: string;
  captureStyle: string[];
  monitoring: string;
  cameraBrand: string;
  lensStyle: string;
  screenFormat: string;
  lightNeed: string;
  audioNeed: boolean;
  budget: string;
  narrativeViewpoint: string;
  aspectRatio: string;
  visualTone: string;
  contrastStyle: string;
  movementIntent: string;
  sceneConditions: string[];
  baseFps: number;
  highSpeedFps: number;
  resolution: string;
  recordingFormat: string;
  shootingRatio: number;
  hoursPerDay: number;
  powerAccess: string;
  notes: string;
};

type ProjectRecord = ProjectStateRecord<ProjectForm, EquipmentCategory>;

type SaveFileHandle = {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<SaveFileHandle>;
};

type KitExportFormat = "xlsx" | KitDocumentFormat;

const kitExportFormats = {
  pdf: { label: "PDF", mime: "application/pdf" },
  docx: { label: "Word（DOCX）", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  png: { label: "PNG", mime: "image/png" },
  xlsx: { label: "Excel（XLSX）", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
} as const;

type HistoryProfile = HistoryProjectProfile;
type HistoryPreviewState = {
  targetId: string;
  profile: HistoryProfile;
  mode: "view" | "analysis";
  record?: ProjectRecord;
};

const themeOptions: Array<{ value: ThemePreference; label: string }> = [
  { value: "system", label: "跟随系统" },
  { value: "light", label: "浅色模式" },
  { value: "dark", label: "深色模式" },
];

function ThemeIcon({ mode }: { mode: ThemePreference }) {
  const iconProps = { className: "theme-icon", viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.6, width: 18, height: 18, "aria-hidden": true } as const;
  if (mode === "light") {
    return (
      <svg {...iconProps}>
        <circle cx="10" cy="10" r="3.25" />
        <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.35 4.35l1.4 1.4M14.25 14.25l1.4 1.4M15.65 4.35l-1.4 1.4M5.75 14.25l-1.4 1.4" />
      </svg>
    );
  }
  if (mode === "dark") {
    return (
      <svg {...iconProps}>
        <path d="M15.9 12.8A6.4 6.4 0 0 1 7.2 4.1 6.4 6.4 0 1 0 15.9 12.8Z" />
      </svg>
    );
  }
  return (
    <svg {...iconProps}>
      <rect x="2.5" y="3.5" width="15" height="10.5" rx="2" />
      <path d="M7 17h6M10 14v3" />
    </svg>
  );
}

function NavigationIcon({ view }: { view: View }) {
  const paths: Record<View, string> = {
    projects: "M3 7h7l2-3h8a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z M3 9h18",
    history: "M9 4H5a1 1 0 0 0-1 1v15h16V5a1 1 0 0 0-1-1h-4 M9 3h6v4H9V3Z M8 12h8 M8 16h6",
    kit: "M9 4H5a1 1 0 0 0-1 1v15h16V5a1 1 0 0 0-1-1h-4 M9 3h6v4H9V3Z M8 14l3 3 5-6",
    library: "M4 5h16v14H4V5Z M4 10h16 M9 10v9 M15 10v9 M9 5v5",
    catalog: "M4 4h6v6H4V4Z M14 4h6v6h-6V4Z M4 14h6v6H4v-6Z M14 14h6v6h-6v-6Z",
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[view]} /></svg>;
}

function ControlIcon({ kind }: { kind: "search" | "undo" | "redo" | "close" | "plus" }) {
  const paths = {
    search: "M9 3a6 6 0 1 0 0 12A6 6 0 0 0 9 3Z M13.5 13.5 18 18",
    undo: "M7 3 3 7l4 4 M3 7h9a5 5 0 0 1 0 10h-2",
    redo: "m13 3 4 4-4 4 M17 7H8a5 5 0 0 0 0 10h2",
    close: "m5 5 10 10 M15 5 5 15",
    plus: "M10 3v14 M3 10h14",
  };
  return <svg className="control-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>;
}

function handleRadioKeys(event: ReactKeyboardEvent<HTMLDivElement>) {
  const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
  if (!keys.includes(event.key)) return;
  const choices = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button[role="radio"]:not(:disabled)'));
  const index = choices.indexOf(event.target as HTMLButtonElement);
  if (index < 0) return;
  event.preventDefault();
  const next = event.key === "Home" ? 0 : event.key === "End" ? choices.length - 1
    : (index + (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1) + choices.length) % choices.length;
  choices[next]?.focus();
  choices[next]?.click();
}

const categories: EquipmentCategory[] = [
  "摄影机",
  "镜头",
  "滤镜",
  "摄影机附件",
  "监看",
  "移动器材",
  "灯光器材",
  "录音器材",
  "其他",
];

const equipment: Equipment[] = publishedEquipment.map(item => ({
  ...item,
  aliases: [...(item.aliases ?? []), equipmentCardData[item.id]?.name || item.name],
}));
const equipmentMap = new Map(canonicalEquipment.map((item) => [item.id, item]));
for (const [oldId, newId] of Object.entries(canonicalEquipmentRedirects)) {
  const item = equipmentMap.get(newId);
  if (item) equipmentMap.set(oldId, item);
}
const equipmentIds = new Set(canonicalEquipment.map((item) => item.id));
const equipmentSeries = buildEquipmentSeries(equipment);
const emptyKit: KitItem[] = [];
const maxBackupFileBytes = 10 * 1024 * 1024;

const builtInHistoryProfiles: HistoryProfile[] = [
  {
    id: "chen-derong",
    label: "艺人视频器材单",
    projectName: "艺人视频",
    type: "艺人视频",
    subtitle: "单机位、竖屏、快速转场，人物肤色与机动性优先",
    scale: "轻量",
    cameraCount: 1,
    styles: ["稳定器", "竖屏"],
    lensStyle: "轻量变焦",
    screenFormat: "竖屏",
    items: [
      "cam-sony-fx3",
      "lens-sony-2470",
      "lens-sony-85",
      "filter-cpl",
      "filter-glimmer",
      "video-dji-monitor",
      "video-dji-transmission",
      "grip-teris",
      "grip-rs4",
      "light-amaran300c",
      "light-nanlite60c",
      "other-cart",
      "other-gaffer",
    ],
  },
  {
    id: "jinnuo-property",
    label: "企业宣传片器材单",
    projectName: "宣传片",
    type: "企业宣传片",
    subtitle: "主副机协作、焦段覆盖完整，兼顾空间与人物",
    scale: "标准",
    cameraCount: 2,
    styles: ["稳定器", "滑轨"],
    lensStyle: "轻量变焦",
    screenFormat: "横屏",
    items: [
      "cam-sony-burano",
      "cam-sony-fx3",
      "lens-sony-1635",
      "lens-sony-2470",
      "lens-sony-70200",
      "lens-sony-50",
      "filter-cpl",
      "filter-glimmer",
      "accessory-cinesaddle",
      "accessory-labouee",
      "video-dji-monitor",
      "video-dji-transmission",
      "grip-teris",
      "grip-slider",
      "grip-rs4",
      "other-cart",
      "other-gaffer",
    ],
  },
  {
    id: "meishu-tvc",
    label: "TVC 器材单",
    projectName: "PV",
    type: "TVC",
    subtitle: "微距产品、精细移动与完整客户监看",
    scale: "完整",
    cameraCount: 1,
    styles: ["滑轨", "轨道车", "伸缩摇臂", "微距产品"],
    lensStyle: "微距特殊",
    screenFormat: "横屏",
    items: [
      "cam-ronin4d",
      "accessory-prossd",
      "accessory-tb50",
      "lens-nisi-athena",
      "lens-dzo-gnosis",
      "lens-dzo-xtract",
      "filter-bpm",
      "accessory-focus-pro",
      "accessory-cinesaddle",
      "video-dji-monitor",
      "video-dji-transmission",
      "video-dm240",
      "video-smallhd702",
      "grip-teris",
      "grip-slider",
      "grip-dolly",
      "grip-track",
      "grip-howmoco",
      "other-applebox",
    ],
  },
  {
    id: "duanpian",
    label: "剧情片器材单（多机位）",
    projectName: "毕业联合作业",
    type: "剧情片",
    subtitle: "三机位、复古定焦、多岗位监看与重型调度",
    scale: "完整",
    cameraCount: 3,
    styles: ["轨道车", "稳定器", "滑轨", "伸缩摇臂", "弱光夜景"],
    lensStyle: "复古柔和",
    screenFormat: "横屏",
    items: [
      "cam-alexa-mini",
      "cam-ronin4d",
      "lens-zeiss-super-speed",
      "lens-angenieux-24290",
      "lens-nisi-athena",
      "filter-bpm",
      "filter-nd",
      "filter-cpl",
      "eq-通用-4-5-65-filter-clear-滤镜",
      "accessory-lmb25",
      "accessory-wcu4",
      "eq-arri-arri-ff-4-ff-5-follow-focus-kit-摄影机附件",
      "accessory-cinesaddle",
      "accessory-labouee",
      "video-vaxis2000",
      "video-vaxis072",
      "video-dm240",
      "video-smallhd702",
      "grip-oconnor2575",
      "grip-ronford-legs",
      "grip-ronin2",
      "eq-dji-dji-master-wheels-摄影机附件",
      "grip-slider",
      "grip-dolly",
      "grip-track",
      "grip-howmoco",
      "other-applebox",
    ],
    quantities: {
      "cam-alexa-mini": 2,
      "video-vaxis2000": 4,
      "video-vaxis072": 7,
      "video-dm240": 2,
      "video-smallhd702": 4,
      "grip-oconnor2575": 2,
      "grip-ronford-legs": 2,
    },
  },
  {
    id: "intern-cupid",
    label: "TVC 器材单",
    projectName: "TVC",
    type: "TVC",
    subtitle: "Mini LF、变形宽银幕、特殊镜头与完整重型调度",
    scale: "完整",
    cameraCount: 1,
    styles: ["稳定器", "滑轨", "轨道车", "伸缩摇臂", "微距产品"],
    lensStyle: "变形宽银幕",
    screenFormat: "横屏",
    items: [
      "cam-alexa-mini-lf",
      "lens-atlas-mercury",
      "lens-angenieux-ez1",
      "eq-laowa-老蛙12mm-镜头",
      "lens-dzo-gnosis",
      "lens-dzo-xtract",
      "filter-nd",
      "filter-cpl",
      "eq-通用-4-5-65-filter-clear-滤镜",
      "accessory-lmb25",
      "accessory-wcu4",
      "eq-arri-arri-ff-4-ff-5-follow-focus-kit-摄影机附件",
      "accessory-cinesaddle",
      "accessory-labouee",
      "video-vaxis2000",
      "video-vaxis072",
      "video-dm240",
      "video-smallhd702",
      "grip-oconnor2575",
      "grip-ronford-legs",
      "grip-jib",
      "grip-ronin2",
      "eq-dji-dji-master-wheels-摄影机附件",
      "grip-slider",
      "grip-dolly",
      "grip-track",
      "other-applebox",
    ],
    quantities: {
      "video-vaxis2000": 2,
      "video-vaxis072": 6,
      "video-dm240": 2,
      "video-smallhd702": 2,
      "grip-jib": 2,
    },
  },

];
const builtInHistoryProfileIds = new Set(builtInHistoryProfiles.map((profile) => profile.id));

function historyProjectName(profile: HistoryProfile) {
  return profile.projectName?.trim() || profile.customName?.trim() || "自定义导入项目";
}

const captureOptions = [
  ["稳定器", "手持稳定运动"],
  ["滑轨", "短距离精细移动"],
  ["轨道车", "长距离调度"],
  ["伸缩摇臂", "升降、穿越与遥控机头"],
  ["微距产品", "微距、探针或特写镜头"],
  ["弱光夜景", "高速镜头与夜景补充"],
  ["高帧率", "升格或高速摄影"],
  ["竖屏", "竖屏安装与轻量配置"],
];

const sceneConditionOptions = [
  ["日外", "自然光与 ND 控制"],
  ["日内", "窗光、混合色温与控光"],
  ["夜外", "低照度、供电与大功率灯具"],
  ["夜内", "实景光源与暗部层次"],
  ["狭小空间", "机身尺寸与调度半径受限"],
  ["反光材质", "玻璃、水面、车漆或产品表面"],
  ["风沙/飞沫", "镜头前组与机身防护"],
];

const defaultProject: ProjectForm = {
  recommendationMode: "manual",
  historyProfileId: "",
  name: "未命名项目",
  type: "企业宣传片",
  category: "商业项目",
  shootDate: "",
  dop: "",
  contact: "",
  days: 1,
  cameraCount: 1,
  scale: "标准",
  captureStyle: [],
  monitoring: "标准监看",
  cameraBrand: "自动匹配",
  lensStyle: "自动匹配",
  screenFormat: "横屏",
  lightNeed: "不含灯光",
  audioNeed: false,
  budget: "不限制",
  narrativeViewpoint: "混合视点",
  aspectRatio: "16:9",
  visualTone: "自然中性",
  contrastStyle: "自然反差",
  movementIntent: "人物跟随",
  sceneConditions: [],
  baseFps: 25,
  highSpeedFps: 0,
  resolution: "UHD 4K 3840 × 2160",
  recordingFormat: "高质量母版",
  shootingRatio: 10,
  hoursPerDay: 10,
  powerAccess: "部分市电",
  notes: "",
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeProjects(value: unknown, reservedIds?: Iterable<string>) {
  return sanitizeProjectRecords<ProjectForm, EquipmentCategory>(migrateCatalogProjects(value), {
    defaultForm: defaultProject,
    isKnownEquipmentId: (id) => equipmentMap.has(id),
    isCategory: (value): value is EquipmentCategory => categories.includes(value as EquipmentCategory),
    createId,
    reservedIds,
    numericBounds: {
      days: [1, 60],
      cameraCount: [1, 8],
      baseFps: [1, 1_000],
      highSpeedFps: [0, 10_000],
      shootingRatio: [1, 100],
      hoursPerDay: [1, 24],
    },
    numericPrecision: { baseFps: 3, highSpeedFps: 3 },
    allowedStringValues: {
      recommendationMode: ["history", "manual"],
      type: ["企业宣传片", "艺人视频", "TVC", "剧情片", "MV", "纪录片"],
      category: ["商业项目", "剧情项目", "艺人内容", "纪录内容", "个人创作", "其他"],
      scale: ["轻量", "标准", "完整"],
      monitoring: ["精简监看", "标准监看", "完整监看"],
      cameraBrand: ["自动匹配", "ARRI", "SONY", "RED", "DJI"],
      lensStyle: ["自动匹配", "现代干净", "复古柔和", "变形宽银幕", "轻量变焦", "微距特殊"],
      screenFormat: ["横屏", "竖屏", "横竖双版本"],
      lightNeed: ["不含灯光", "轻量灯光", "完整灯光"],
      budget: ["不限制", "3千以内", "3千–8千", "8千–1.5万", "1.5万以上"],
      narrativeViewpoint: ["客观观察", "人物主观", "混合视点"],
      visualTone: ["自然中性", "低饱和柔和", "冷暖对照", "高饱和风格化"],
      contrastStyle: ["低反差", "自然反差", "高反差"],
      movementIntent: ["克制固定", "人物跟随", "流动调度", "机械精确", "混合"],
      recordingFormat: ["轻量代理", "高质量母版", "RAW / 高码率"],
      powerAccess: ["稳定市电", "部分市电", "无市电"],
    },
    allowedArrayValues: {
      captureStyle: captureOptions.map(([value]) => value),
      sceneConditions: sceneConditionOptions.map(([value]) => value),
    },
  });
}

function createProject(name: string): ProjectRecord {
  const now = new Date().toISOString();
  return {
    id: createId("project"),
    form: { ...defaultProject, name },
    kit: [],
    basicInfoConfirmed: false,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

function readProjectCollection(value: unknown, reservedIds?: Iterable<string>) {
  if (!Array.isArray(value)) return null;
  const records = sanitizeProjects(value, reservedIds);
  if (value.length && !records.length) return null;

  // Older versions seeded this exact empty record before the first user action.
  return records.filter((record) => !(
    record.id === "project-initial" &&
    record.createdAt === "1970-01-01T00:00:00.000Z" &&
    record.updatedAt === record.createdAt &&
    record.status === "active" && !record.basicInfoConfirmed && !record.kit.length &&
    !record.requirementsRevision && !record.requirementsChanged &&
    Object.entries(defaultProject).every(([key, value]) =>
      JSON.stringify(record.form[key as keyof ProjectForm]) === JSON.stringify(value))
  ));
}

function currentProjectId(records: readonly ProjectRecord[], preferred: unknown) {
  return records.find((record) => record.id === preferred)?.id ?? records[0]?.id ?? "";
}

function clampInteger(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? Math.round(value) : min));
}

function formatCount(value: number) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function equipmentById(id: string) {
  return equipmentMap.get(resolveCatalogId(id));
}

function resolveKitEquipment(row: KitItem): Pick<Equipment, "id" | "name" | "brand" | "category" | "subcategory" | "unit" | "costTier"> | undefined {
  const item = equipmentById(row.id);
  if (item) return item;
  if (!row.custom) return undefined;
  return { id: row.id, ...row.custom, costTier: 1 };
}

function ruleAdditionToKit(addition: RuleAddition, reason: string): KitItem {
  return {
    id: addition.id,
    qty: addition.qty,
    note: addition.note,
    reason,
    status: "pending",
    custom: addition.custom as CustomEquipment | undefined,
  };
}

function addSystemRuleRows(kit: KitItem[], additions: RuleAddition[], reason: string) {
  const rows = additions.filter(addition => addition.custom || equipmentById(addition.id)?.published)
    .map(addition => ruleAdditionToKit(addition, reason));
  return completeKitAdditions(kit, rows);
}

function completeEssentialCameraSystem(project: ProjectForm, kit: KitItem[]) {
  const checks = buildCameraSystemChecks(basicSystemProject(project), kit.filter((row) => !isBlankCustomKitItem(row)), canonicalEquipment);
  return checks
    .filter((check) => check.autoAdd && check.missing.length)
    .reduce((current, check) => addSystemRuleRows(current, check.missing, `站内系统检查：${check.title}`), kit);
}

function kitConfirmationLabel(row: KitItem) {
  return row.status === "confirmed" ? "已确认" : "待确认";
}

export default function Home() {
  const [view, setView] = useState<View>("projects");
  const [themePreference, setThemePreference] = useState<ThemePreference | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"全部" | EquipmentCategory>("全部");
  const [brand, setBrand] = useState("全部");
  const [namingFilter, setNamingFilter] = useState("全部");
  const [visibleCount, setVisibleCount] = useState(72);
  const [seriesId, setSeriesId] = useState("");
  const [editingBasics, setEditingBasics] = useState(false);
  const [kitHistories, setKitHistories] = useState<Record<string, KitHistory<EquipmentCategory>>>({});
  const [swapPreview, setSwapPreview] = useState<{ rows: KitItem[]; name: string } | null>(null);
  const [projectFilter, setProjectFilter] = useState<"all" | "active" | "archived">("active");
  const [projectQuery, setProjectQuery] = useState("");
  const [customDraft, setCustomDraft] = useState<CustomEquipment>({
    name: "",
    brand: "通用",
    category: "其他",
    subcategory: "自定义",
    unit: "件",
  });
  const [uploadLabel, setUploadLabel] = useState("");
  const [importingBackup, setImportingBackup] = useState(false);
  const [customQuantity, setCustomQuantity] = useState(1);
  const [customNote, setCustomNote] = useState("");
  const [customSuggestionId, setCustomSuggestionId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [swapTargetId, setSwapTargetId] = useState<string | null>(null);
  const [swapQuery, setSwapQuery] = useState("");
  const swapComposing = useRef(false);
  const [swapCustom, setSwapCustom] = useState<CustomEquipment | null>(null);
  const [swapScope, setSwapScope] = useState<"recommended" | "brand" | "all">("recommended");
  const [projectExportFormat, setProjectExportFormat] = useState<KitExportFormat | "json">("xlsx");
  const [exportingKit, setExportingKit] = useState(false);
  const [kitPreviewOpen, setKitPreviewOpen] = useState(false);
  const [historyOverrides, setHistoryOverrides] = useState<Record<string, HistoryProfile>>({});
  const [historyOverridesHydrated, setHistoryOverridesHydrated] = useState(false);
  const [historyPreview, setHistoryPreview] = useState<HistoryPreviewState | null>(null);
  const [historyImportTargetId, setHistoryImportTargetId] = useState<string | null>(null);
  const [analyzingHistory, setAnalyzingHistory] = useState(false);
  const importBackupRef = useRef<HTMLInputElement>(null);
  const importHistoryRef = useRef<HTMLInputElement>(null);
  const recoverySnapshotRef = useRef<ReturnType<typeof readProjectAutosave>>(null);
  const latestRecords = useRef({ projects, historyOverrides });
  useEffect(() => { latestRecords.current = { projects, historyOverrides }; }, [projects, historyOverrides]);
  const dialogTriggerRef = useRef<HTMLElement | null>(null);
  const uploadBusy = analyzingHistory || importingBackup;
  const modalOpen = Boolean(swapTargetId || historyPreview || kitPreviewOpen);

  const activeProject = projects.find((item) => item.id === activeProjectId) ?? projects[0];
  const project = activeProject?.form ?? defaultProject;
  const kit = activeProject?.kit ?? emptyKit;
  const completedKit = useMemo(() => kit.filter((row) => !isBlankCustomKitItem(row)), [kit]);

  const autosavePayload = useMemo(() => ({ projects, activeProjectId, historyOverrides }), [projects, activeProjectId, historyOverrides]);
  const autosave = useProjectAutosave(hydrated && historyOverridesHydrated, autosavePayload);

  useEffect(() => {
    const saved = document.documentElement.dataset.themePreference;
    const preference = saved === "light" || saved === "dark" ? saved : "system";
    const timer = window.setTimeout(() => setThemePreference(preference), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!themePreference) return;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const resolvedTheme = themePreference === "system"
        ? (systemTheme.matches ? "dark" : "light")
        : themePreference;
      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.dataset.themePreference = themePreference;
    };
    applyTheme();
    try {
      window.localStorage.setItem("cinbox-theme-preference", themePreference);
    } catch {
      // Theme still applies for this session when browser storage is unavailable.
    }
    if (themePreference !== "system") return;
    systemTheme.addEventListener("change", applyTheme);
    return () => systemTheme.removeEventListener("change", applyTheme);
  }, [themePreference]);

  useEffect(() => {
    let saved: string | null;
    let legacy: string | null;
    try {
      saved = window.localStorage.getItem("cinbox-projects-v2");
      legacy = window.localStorage.getItem("cinbox-project");
    } catch {
      // Browser storage hydration must finish even when storage is blocked.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToast("浏览器禁止本地保存，请允许存储或及时导出项目备份");
      setHydrated(true);
      return;
    }
    if (saved) {
      try {
        const state = JSON.parse(saved) as { projects?: unknown; activeProjectId?: unknown };
        const validProjects = readProjectCollection(state.projects);
        if (validProjects) {
          setProjects(validProjects);
          setActiveProjectId(currentProjectId(validProjects, state.activeProjectId));
          setHydrated(true);
          return;
        }
      } catch {
        // Keep unreadable data available for manual recovery.
      }
    }

    const snapshot = readProjectAutosave();
    const recovered = snapshot && readProjectCollection(snapshot.payload.projects);
    if (snapshot && recovered) {
      recoverySnapshotRef.current = snapshot;
      setProjects(recovered);
      setActiveProjectId(currentProjectId(recovered, snapshot.payload.activeProjectId));
      setToast("本地项目记录不可用，已从自动存档恢复");
      setHydrated(true);
      return;
    }

    if (legacy) {
      try {
        const state = JSON.parse(legacy) as { project?: Partial<ProjectForm>; kit?: KitItem[] };
        const migrated = createProject(state.project?.name || "迁移项目");
        const [sanitized] = sanitizeProjects([{ ...migrated, form: { ...defaultProject, ...state.project }, kit: state.kit }]);
        if (sanitized) {
          setProjects([sanitized]);
          setActiveProjectId(sanitized.id);
          setHydrated(true);
          return;
        }
      } catch {
        // Keep legacy data available for manual recovery.
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    try {
      const result = readStoredHistory(window.localStorage,
        (value) => sanitizeHistoryOverrides(migrateCatalogHistory(value), builtInHistoryProfileIds, equipmentIds),
        recoverySnapshotRef.current);
      setHistoryOverrides(result.value);
      if (result.recovered && !recoverySnapshotRef.current) setToast("历史项目记录不可用，已从自动存档恢复");
      if (result.failed) setToast("历史项目读取失败，请检查浏览器存储权限或导入备份");
    } catch {
      setToast("历史项目读取失败，请检查浏览器存储权限或导入备份");
    }
    setHistoryOverridesHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let failureNotice: number | undefined;
    try {
      window.localStorage.setItem("cinbox-projects-v2", JSON.stringify({ projects, activeProjectId }));
    } catch {
      failureNotice = window.setTimeout(() => setToast("本地保存失败，请检查浏览器存储权限并导出项目备份"), 0);
    }
    return () => {
      if (failureNotice !== undefined) window.clearTimeout(failureNotice);
    };
  }, [activeProjectId, hydrated, projects]);

  useEffect(() => {
    if (!historyOverridesHydrated) return;
    try {
      window.localStorage.setItem("cinbox-history-overrides-v1", JSON.stringify(historyOverrides));
    } catch {
      const timer = window.setTimeout(() => setToast("历史项目保存失败：当前设备存储空间不足"), 0);
      return () => window.clearTimeout(timer);
    }
  }, [historyOverrides, historyOverridesHydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = dialogTriggerRef.current ?? document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>(".swap-dialog, .history-preview-dialog");
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]',
    ) ?? []).filter((element) => element.getClientRects().length > 0);
    if (dialog && !dialog.contains(document.activeElement)) focusable()[0]?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSwapTargetId(null);
        setHistoryPreview(null);
        setKitPreviewOpen(false);
      } else if (event.key === "Tab") {
        const controls = focusable();
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
          event.preventDefault(); first?.focus();
        }
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      if (previousFocus?.isConnected) previousFocus.focus();
      dialogTriggerRef.current = null;
    };
  }, [modalOpen]);

  const selectingForProject = view === "library" && Boolean(activeProject?.basicInfoConfirmed) && !editingBasics;
  const browsingEquipment = view === "catalog" || selectingForProject;
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [activeProjectId, selectingForProject, view]);

  const menuLabels = useMemo(() => brandMenuLabels(equipment), []);
  const brandOptions = useMemo(() => categoryBrands(equipment, category, menuLabels).map((name) => ({
    value: name, label: name === "全部" ? "全部品牌" : menuLabels[name] ?? name,
  })), [category, menuLabels]);
  const filteredEquipment = useMemo(
    () => filterCatalog(equipment, { category, brand, query, namingFilter }),
    [brand, category, query, namingFilter],
  );

  const filteredSeries = useMemo(() => {
    const resultIds = new Set(filteredEquipment.map((item) => item.id));
    return equipmentSeries.map(series => namingFilter === "全部" ? series : {
      ...series, items: series.items.filter(item => namingFilter === "official-model" ? item.brand !== "通用" : item.brand === "通用"),
    }).filter((series) =>
      (category === "全部" || series.category === category) &&
      (brand === "全部" || series.brand === brand) &&
      series.items.length > 0 &&
      (series.id === seriesId || series.items.some((item) => resultIds.has(item.id))),
    );
  }, [brand, category, filteredEquipment, namingFilter, seriesId]);
  const seriesOptions = useMemo<CatalogOption[]>(() => {
    const nameCounts = new Map<string, number>();
    for (const { name } of filteredSeries) nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    return [{ value: "", label: "全部系列" }, ...filteredSeries.map((series) => ({
      value: series.id,
      label: (nameCounts.get(series.name) ?? 0) > 1 ? `${series.brand} · ${series.name}` : series.name,
    }))];
  }, [filteredSeries]);
  const activeSeries = browsingEquipment ? filteredSeries.find((series) => series.id === seriesId) : undefined;
  const equipmentResults = useMemo(() => {
    if (!activeSeries) return filteredEquipment;
    const ids = new Set(activeSeries.items.map((item) => item.id));
    return filteredEquipment.filter((item) => ids.has(item.id));
  }, [activeSeries, filteredEquipment]);
  const seriesItemsToAdd = activeSeries?.items.filter((item) => !kit.some((row) => row.id === item.id)).length ?? 0;

  const groupedKit = useMemo(
    () =>
      categories
        .map((name) => ({
          name,
          rows: kit.filter((row) => resolveKitEquipment(row)?.category === name),
        }))
        .filter((group) => group.rows.length),
    [kit],
  );

  const kitDocumentGroups = useMemo<ExcelExportGroup[]>(() =>
    groupedKit.flatMap((group) => {
      const rows = group.rows.filter((row) => !isBlankCustomKitItem(row)).map((row) => {
        const item = resolveKitEquipment(row)!;
        return { name: item.name, qty: row.qty, unit: item.unit, note: row.note };
      });
      return rows.length ? [{ name: group.name, rows }] : [];
    }), [groupedKit]);

  const historyProfiles = useMemo(
    () => [...builtInHistoryProfiles.map((profile) => historyOverrides[profile.id] ?? profile),
      ...Object.values(historyOverrides).filter((profile) => isImportedHistoryId(profile.id))],
    [historyOverrides],
  );
  const selectedUnits = completedKit.reduce((sum, item) => sum + item.qty, 0);
  const pendingCount = completedKit.filter((row) => row.status !== "confirmed").length;
  const systemChecks = useMemo(() => buildCameraSystemChecks(basicSystemProject(project), completedKit, canonicalEquipment), [completedKit, project]);
  const missingSystemChecks = systemChecks.filter((check) => check.missing.length);
  const swapTarget = kit.find((row) => row.id === swapTargetId);
  const swapTargetItem = swapTarget ? resolveKitEquipment(swapTarget) : undefined;
  const swapCategory = swapTargetItem?.category;
  const swapSubcategory = swapTargetItem?.subcategory;
  const swapBrand = swapTargetItem?.brand;
  const swapCostTier = swapTargetItem?.costTier ?? 3;
  const swapCandidates = (() => {
    if (!swapCategory) return [];
    const normalized = swapQuery.trim();
    const existing = new Set(kit.map((row) => row.id));
    return equipment
      .filter((item) => item.category === swapCategory && !existing.has(item.id))
      .filter(createEquipmentMatcher(normalized))
      .filter((item) => normalized || swapScope === "all" || (swapScope === "brand" ? item.brand === swapBrand : item.subcategory === swapSubcategory || item.brand === swapBrand))
      .sort((left, right) => {
        const leftScore = (left.subcategory === swapSubcategory ? 10 : 0) + (left.brand === swapBrand ? 4 : 0) - Math.abs(left.costTier - swapCostTier);
        const rightScore = (right.subcategory === swapSubcategory ? 10 : 0) + (right.brand === swapBrand ? 4 : 0) - Math.abs(right.costTier - swapCostTier);
        return rightScore - leftScore || left.name.localeCompare(right.name, "zh-CN");
      })
      .slice(0, swapScope === "all" || normalized ? 24 : 12);
  })();
  const filteredProjects = useMemo(() => {
    const normalized = projectQuery.trim().toLowerCase();
    return projects
      .filter((item) => projectFilter === "all" || item.status === projectFilter)
      .filter((item) => !normalized || [item.form.name, item.form.type, item.form.category, item.form.dop].join(" ").toLowerCase().includes(normalized))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [projectFilter, projectQuery, projects]);

  function updateActive(mutator: (current: ProjectRecord) => ProjectRecord) {
    if (!activeProject) return;
    setProjects((current) =>
      current.map((item) =>
        item.id === activeProject.id ? { ...mutator(item), updatedAt: new Date().toISOString() } : item,
      ),
    );
  }

  function updateProject(patch: Partial<ProjectForm>) {
    const affectsKit = Object.keys(patch).some((key) => ["cameraCount", "aspectRatio", "screenFormat", "baseFps", "highSpeedFps", "resolution"].includes(key) && JSON.stringify(project[key as keyof ProjectForm]) !== JSON.stringify(patch[key as keyof ProjectForm]));
    updateActive((current) => ({ ...current, form: { ...current.form, ...patch }, requirementsChanged: current.requirementsChanged || (affectsKit && current.kit.some((row) => !isBlankCustomKitItem(row))), requirementsRevision: (current.requirementsRevision ?? 0) + (affectsKit ? 1 : 0) }));
  }

  function openHistoryProjectPreview(profile: HistoryProfile, trigger: HTMLElement) {
    dialogTriggerRef.current = trigger;
    setHistoryPreview({ targetId: profile.id, profile, mode: "view" });
  }

  function openSavedProjectPreview(record: ProjectRecord, trigger: HTMLElement) {
    dialogTriggerRef.current = trigger;
    setHistoryPreview({ targetId: record.id, record, mode: "view", profile: {
      id: record.id, label: record.form.type, projectName: record.form.name,
      type: record.form.type, subtitle: `${record.form.days} 天 · ${record.form.cameraCount} 机位`,
      scale: record.form.scale, cameraCount: record.form.cameraCount, styles: [],
      lensStyle: "", screenFormat: record.form.screenFormat,
      items: record.kit.filter((row) => !isBlankCustomKitItem(row)).map((row) => row.id),
      quantities: Object.fromEntries(record.kit.filter((row) => !isBlankCustomKitItem(row)).map((row) => [row.id, row.qty])),
    } });
  }

  function chooseHistoryProjectFile(targetId: string, trigger?: HTMLElement) {
    if (!modalOpen && trigger) dialogTriggerRef.current = trigger;
    if (analyzingHistory) return;
    setHistoryImportTargetId(targetId);
    importHistoryRef.current?.click();
  }

  async function importHistoryProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    const targetId = historyImportTargetId;
    if (!file || !targetId || uploadBusy) return;
    setAnalyzingHistory(true);
    setUploadLabel(`正在读取 ${file.name}…`);
    try {
      const extracted = await extractHistoryProjectFile(file);
      if (!extracted.text.trim()) throw new Error("文件中没有可分析的文字内容");
      setUploadLabel(`正在识别 ${file.name} 的型号、代际与数量…`);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 40));
      const analyzed = analyzeHistoryProjectText(extracted.text, file.name, extracted.format, equipment);
      setHistoryPreview({
        targetId,
        mode: "analysis",
        profile: { ...analyzed, id: targetId, projectName: projects.find((record) => record.id === targetId)?.form.name ?? analyzed.projectName ?? analyzed.customName },
      });
      setToast(analyzed.items.length ? `分析完成：识别 ${analyzed.items.length} 项标准器材` : "分析完成，但未识别出标准器材");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "文件分析失败，请检查格式后重试");
    } finally {
      setAnalyzingHistory(false);
      setUploadLabel("");
      setHistoryImportTargetId(null);
    }
  }

  function canMergeHistory(incoming: Record<string, HistoryProfile>) {
    const error = historyCapacityError(latestRecords.current.historyOverrides, incoming, maxHistoryOverrides);
    if (error) { setToast(error); return false; }
    return true;
  }

  function confirmHistoryProjectReplacement() {
    if (!historyPreview || historyPreview.mode !== "analysis" || !historyPreview.profile.items.length) return;
    const customName = historyPreview.profile.projectName?.trim() ?? historyPreview.profile.customName?.trim() ?? "";
    const replacement: HistoryProfile = {
      ...historyPreview.profile,
      label: formatHistoryProjectName(historyPreview.profile.type),
      projectName: customName || "自定义导入项目",
      customName: customName || undefined,
    };
    const saved = projects.find((record) => record.id === historyPreview.targetId);
    if (saved) {
      const type = projectTypeForReuse(replacement.type, saved.form.type);
      const needsReview = saved.requirementsChanged || saved.form.cameraCount !== replacement.cameraCount || saved.form.type !== type;
      setKitHistories((current) => ({ ...current, [saved.id]: recordKitChange(current[saved.id] ?? { past: [], future: [] }, saved.kit, "上传替换器材单", undefined, needsReview, (saved.requirementsRevision ?? 0) + 1) }));
      setProjects((current) => current.map((record) => record.id !== saved.id ? record : {
        ...record, updatedAt: new Date().toISOString(),
        form: { ...record.form, name: replacement.projectName || record.form.name, type, cameraCount: replacement.cameraCount },
        kit: copyHistoricalKit(replacement, equipmentMap), requirementsChanged: true, requirementsRevision: (record.requirementsRevision ?? 0) + 1,
      }));
    } else {
      if (!canMergeHistory({ [historyPreview.targetId]: replacement })) return;
      setHistoryOverrides((current) => ({ ...current, [historyPreview.targetId]: replacement }));
    }
    setHistoryPreview(null);
    setToast(`${isImportedHistoryId(replacement.id) && !historyOverrides[replacement.id] ? "已新增历史项目" : "已替换"}：${historyProjectName(replacement)}`);
  }

  function restoreBuiltInHistoryProject(targetId: string) {
    const builtIn = builtInHistoryProfiles.find((profile) => profile.id === targetId);
    setHistoryOverrides((current) => {
      const next = { ...current };
      delete next[targetId];
      return next;
    });
    setHistoryPreview(builtIn ? { targetId, profile: builtIn, mode: "view" } : null);
    setToast("已恢复内置历史项目");
  }

  const currentHistory = Object.hasOwn(kitHistories, activeProjectId) ? kitHistories[activeProjectId] : { past: [], future: [] };
  function setKit(next: KitItem[] | ((current: KitItem[]) => KitItem[]), label = "调整器材单", group?: string) {
    const rows = typeof next === "function" ? next(kit) : next;
    if (rows === kit || JSON.stringify(rows) === JSON.stringify(kit)) return true;
    const capacityError = kitCapacityError(kit.length, rows.length - kit.length);
    if (capacityError) { setToast(capacityError); return false; }
    setKitHistories((current) => ({ ...current, [activeProjectId]: recordKitChange(current[activeProjectId] ?? { past: [], future: [] }, kit, label, group, activeProject?.requirementsChanged, activeProject?.requirementsRevision) }));
    updateActive((current) => ({ ...current, kit: rows }));
    return true;
  }

  function travelKit(direction: "undo" | "redo") {
    const change = travelKitHistory(currentHistory, kit, direction, activeProject?.requirementsChanged, activeProject?.requirementsRevision);
    if (!change) return;
    setKitHistories((current) => ({ ...current, [activeProjectId]: change.history }));
    updateActive((current) => ({ ...current, kit: change.rows, requirementsChanged: change.requirementsChanged }));
    setToast(`${direction === "undo" ? "已撤销" : "已重做"}：${change.label}`);
  }

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (modalOpen || target.closest('input, textarea, select, [contenteditable="true"]') || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
      event.preventDefault();
      travelKit(event.shiftKey ? "redo" : "undo");
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  });

  function openProjectSetup(message: string) {
    if (!activeProject) {
      setView("projects");
      setToast("请先新增项目，再加入器材");
      return;
    }
    setEditingBasics(true);
    setView("library");
    setToast(message);
  }

  function addToKit(id: string, reason = "手动选材") {
    if (kit.some((row) => row.id === id)) {
      setKit((current) => current.filter((row) => row.id !== id), `取消选择 ${equipmentById(id)?.name ?? "器材"}`);
      setToast("已取消选择，可通过撤销恢复数量与备注");
      return;
    }
    if (!activeProject?.basicInfoConfirmed) {
      setQuery(equipmentById(id)?.name || "");
      setCategory("全部"); setBrand("全部"); setSeriesId("");
      openProjectSetup("请先保存当前项目的基本信息，再加入此器材");
      return;
    }
    if (!equipmentById(id)?.published) return;
    if (!setKit((current) => addKitSelection(current, [{ id, qty: 1, note: "", reason, status: "manual" }]), `加入 ${equipmentById(id)?.name ?? "器材"}`)) return;
    setToast(`已加入「${project.name}」，可在器材单调整数量`);
  }

  function addSeriesToKit(series: EquipmentSeries) {
    if (!activeProject?.basicInfoConfirmed) { openProjectSetup("请先保存项目基本信息"); return; }
    if (!setKit((current) => addKitSelection(current, series.items.map((item) => ({ id: item.id, qty: 1, note: "", reason: `系列：${series.name}`, status: "manual" }))), `加入 ${series.name} 缺少的器材`)) return;
    setToast(`已补入 ${series.name} 中未选的器材；原有数量和备注已保留`);
  }

  function projectSelect(label: string, key: keyof ProjectForm, options: string[]) {
    return <label><span>{label}</span><select value={String(project[key])} onChange={(event) => updateProject({ [key]: event.target.value })}>{options.map((value) => <option key={value}>{value}</option>)}</select></label>;
  }
  function addCustomItem(targetCategory: EquipmentCategory) {
    if (!activeProject?.basicInfoConfirmed) { openProjectSetup("请先保存项目基本信息，再新增器材"); return; }
    if (!customDraft.name.trim() || !customDraft.unit.trim()) {
      setToast("请填写器材名称与单位");
      return;
    }
    const id = createId("custom");
    const row: KitItem = { id, qty: customQuantity, note: customNote, reason: "摄影指导自定义补充", status: "manual", custom: { ...customDraft, category: targetCategory, name: customDraft.name.trim(), unit: customDraft.unit.trim(), brand: customDraft.brand.trim() || "通用" } };
    const suggestion = equipment.find((item) => item.id === customSuggestionId && item.category === targetCategory && item.published);
    if (!setKit((current) => {
      const rows = [...current, row];
      return suggestion?.published && suggestion.category === targetCategory ? applyEquipmentSuggestion(rows, id, suggestion) : rows;
    }, "新增器材")) return;
    setCustomDraft({ ...customDraft, name: "" });
    setCustomQuantity(1); setCustomNote(""); setCustomSuggestionId(null);
    setToast(suggestion ? "已加入所选器材；重复器材的数量与备注已合并" : "已添加自定义器材");
  }

  function updateKit(id: string, patch: Partial<KitItem>) {
    setKit((current) => current.map((row) => (row.id === id ? { ...row, ...patch, userAdjusted: true } : row)), `修改 ${resolveKitEquipment(kit.find((row) => row.id === id)!)?.name ?? "器材"}`, `${id}:${Object.keys(patch).join(",")}`);
  }

  function confirmKitItems() {
    if (!pendingCount) return;
    const next = kit.map((row) => isBlankCustomKitItem(row) || row.status === "confirmed"
      ? row : { ...row, status: "confirmed" as const, userAdjusted: true });
    if (setKit(next, "一键确认器材")) setToast(`已确认 ${pendingCount} 项器材，可撤销`);
  }

  function renderKitConfirmation(row: KitItem, name: string) {
    const confirmed = row.status === "confirmed";
    return <button
      type="button"
      className={`kit-status status-${confirmed ? "confirmed" : "pending"}`}
      aria-label={`${name}确认状态`}
      aria-pressed={confirmed}
      onClick={() => updateKit(row.id, { status: confirmed ? "pending" : "confirmed" })}
    >{kitConfirmationLabel(row)}</button>;
  }

  function openSwap(id: string, trigger: HTMLElement) {
    dialogTriggerRef.current = trigger;
    setSwapCustom(null);
    setSwapPreview(null);
    swapComposing.current = false;
    setSwapTargetId(id);
    setSwapQuery("");
    setSwapScope("recommended");
  }

  function replaceWithCustom() {
    if (!swapTarget || !swapCustom?.name.trim()) return;
    const custom = { ...swapCustom, name: swapCustom.name.trim(), brand: swapCustom.brand.trim() || "通用", unit: swapCustom.unit.trim() || "件" };
    setKit((current) => current.map((row) => row.id === swapTarget.id ? {
      ...row, id: createId("custom"), custom, status: "pending", userAdjusted: true,
      reason: `自定义替换：${swapTargetItem?.name} → ${custom.name}`,
    } : row));
    setSwapTargetId(null);
    setSwapCustom(null);
    setToast(`已替换为 ${custom.name}，数量和备注已保留`);
  }

  function replaceKitItem(nextId: string, strategy: "single" | "system" = "single") {
    if (!swapTarget || !swapTargetItem) return;
    const replacement = equipmentById(nextId);
    if (!replacement?.published) return;
    if (strategy === "system" && swapTargetItem.category === "摄影机") {
        const replaced = kit.map((row) => row.id === swapTarget.id ? {
          ...row,
          id: replacement.id,
          custom: undefined,
          status: "pending" as const,
          userAdjusted: true,
          reason: `联动替换：${swapTargetItem.name} → ${replacement.name}`,
        } : row);
        setSwapPreview({ rows: completeEssentialCameraSystem(project, replaced), name: replacement.name });
        return;
    } else {
      setKit((current) => current.map((row) => row.id === swapTarget.id ? {
        ...row,
        id: replacement.id,
        custom: undefined,
        status: "pending",
        userAdjusted: true,
        reason: `只替换此项：${swapTargetItem.name} → ${replacement.name}`,
      } : row));
    }
    setSwapTargetId(null);
    setSwapQuery("");
    setToast(strategy === "system" && swapTargetItem.category === "摄影机" ? `已围绕 ${replacement.name} 联动重算系统` : `已替换为 ${replacement.name}；请检查兼容提示`);
  }

  function addMissingSystemRule(check: CameraSystemCheck) {
    if (!setKit((current) => addSystemRuleRows(current, check.missing, `站内系统检查：${check.title}`))) return;
    setToast(`已补齐：${check.title}`);
  }

  function completeAllSystemRules() {
    const next = missingSystemChecks.reduce((rows, check) => addSystemRuleRows(rows, check.missing, `站内系统检查：${check.title}`), kit);
    if (!setKit(next, "一键补齐配套项目")) return;
    setToast("已将缺少的配套项加入器材单，请确认兼容性与数量");
  }

  function saveProjectBasics() {
    if (!project.name.trim()) return;
    updateActive((current) => ({ ...current, form: { ...current.form, name: current.form.name.trim() }, basicInfoConfirmed: true }));
    setEditingBasics(false);
    setView("library");
    setToast("项目基本信息已保存，请选择器材");
  }

  function canAddProjects(count = 1) {
    if (!hydrated) return false;
    const error = projectCapacityError(latestRecords.current.projects.length, count);
    if (error) { setToast(error); return false; }
    return true;
  }

  function reuseHistoryProject(profile: HistoryProfile) {
    if (!canAddProjects()) return;
    const next = createProject(`${historyProjectName(profile)} · 新项目`);
    next.form = { ...next.form, type: projectTypeForReuse(profile.type), cameraCount: profile.cameraCount,
      screenFormat: profile.screenFormat, recommendationMode: "history", historyProfileId: profile.id };
    next.kit = copyHistoricalKit(profile, equipmentMap);
    setProjects((current) => [next, ...current]);
    setActiveProjectId(next.id);
    next.basicInfoConfirmed = true;
    setEditingBasics(false);
    setHistoryPreview(null);
    setView("kit");
    setToast(`已复用 ${historyProjectName(profile)}，可在项目中编辑本次拍摄信息`);
  }

  function reuseSavedProject(record: ProjectRecord) {
    if (!canAddProjects()) return;
    const next = createProject(`${record.form.name} · 新项目`);
    next.form = { ...record.form, name: next.form.name, shootDate: "", dop: "", contact: "", recommendationMode: "manual" };
    next.kit = record.kit.map((row) => ({ ...row, custom: row.custom ? { ...row.custom } : undefined }));
    setProjects((current) => [next, ...current]);
    setActiveProjectId(next.id);
    next.basicInfoConfirmed = true;
    setEditingBasics(false);
    setView("kit");
    setToast(`已复用 ${record.form.name}，可在项目中编辑本次拍摄信息`);
  }

  function editProjectBasics(id = activeProjectId) {
    setActiveProjectId(id);
    setEditingBasics(true);
    setView("library");
  }

  function createNewProject() {
    if (!canAddProjects()) return;
    const next = createProject(`新项目 ${new Date().toLocaleDateString("zh-CN")}`);
    setProjects((current) => [next, ...current]);
    setActiveProjectId(next.id);
    setEditingBasics(true);
    setView("library");
    setToast("已创建新项目");
  }

  function selectProject(id: string, nextView: View = "library") {
    setActiveProjectId(id);
    setEditingBasics(nextView === "library");
    setView(nextView);
  }

  function duplicateProject(record: ProjectRecord) {
    if (!canAddProjects()) return;
    const now = new Date().toISOString();
    const copy: ProjectRecord = {
      ...record,
      id: createId("project"),
      form: { ...record.form, name: `${record.form.name} 副本` },
      kit: record.kit.map((row) => ({ ...row, custom: row.custom ? { ...row.custom } : undefined })),
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    setProjects((current) => [copy, ...current]);
    setActiveProjectId(copy.id);
    setToast("已复制项目");
  }

  function toggleArchive(record: ProjectRecord) {
    setProjects((current) =>
      current.map((item) =>
        item.id === record.id
          ? { ...item, status: item.status === "active" ? "archived" : "active", updatedAt: new Date().toISOString() }
          : item,
      ),
    );
    setToast(record.status === "active" ? "项目已归档" : "项目已恢复");
  }

  function deleteProject(record: ProjectRecord) {
    if (!window.confirm(`确定删除“${record.form.name}”？此操作无法撤销。`)) return;
    const remaining = projects.filter((item) => item.id !== record.id);
    setProjects(remaining);
    setActiveProjectId(currentProjectId(remaining, activeProjectId));
    setKitHistories((current) => {
      const next = { ...current };
      delete next[record.id];
      return next;
    });
    if (!remaining.length) setEditingBasics(false);
    setToast("项目已删除");
  }

  function exportCurrentProject() {
    if (!activeProject) return;
    if (projectExportFormat === "json") {
      exportProjectBackup(activeProject);
    } else {
      void exportKit(projectExportFormat);
    }
  }

  async function exportKit(format: KitExportFormat) {
    if (!kitDocumentGroups.length) {
      setToast("器材单为空，暂时无法导出");
      return;
    }
    if (exportingKit) return;

    const { label, mime } = kitExportFormats[format];
    const fileStem = safeExcelFileName(project.name).slice(0, -".xlsx".length);
    setExportingKit(true);
    try {
      const savePickerWindow = window as SaveFilePickerWindow;
      let fileHandle: SaveFileHandle | undefined;
      if (format !== "png" && savePickerWindow.showSaveFilePicker) {
        try {
          fileHandle = await savePickerWindow.showSaveFilePicker({
            suggestedName: `${fileStem}.${format}`,
            types: [{ description: label, accept: { [mime]: [`.${format}`] } }],
          });
        } catch (error) {
          if (!(error instanceof DOMException) || error.name !== "SecurityError") throw error;
        }
      }

      let blob: Blob;
      let extension: KitExportFormat | "zip" = format;
      if (format === "xlsx") {
        const [{ default: writeXlsxFile }, { buildEquipmentWorkbook }] = await Promise.all([
          import("write-excel-file/browser"),
          import("./excel-export"),
        ]);
        const { sheets } = buildEquipmentWorkbook(project, kitDocumentGroups);
        blob = await writeXlsxFile(sheets, { fontFamily: "Arial", fontSize: 10 }).toBlob();
      } else {
        const { buildKitDocument } = await import("./kit-document-export");
        ({ blob, extension } = await buildKitDocument(format, project, kitDocumentGroups));
      }

      if (fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        setToast(`${label} 已保存`);
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${fileStem}.${extension}`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
        setToast(extension === "zip" ? "PNG 分页已打包下载" : `${label} 已下载`);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setToast("已取消保存");
      } else {
        console.error("Equipment list export failed", error);
        setToast(`${label} 导出失败，请重试`);
      }
    } finally {
      setExportingKit(false);
    }
  }

  function exportProjectBackup(record?: ProjectRecord) {
    const payload = JSON.stringify({
      version: 2,
      exportedAt: new Date().toISOString(),
      projects: record ? [record] : projects,
      historyOverrides: record ? {} : historyOverrides,
    }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = record ? safeExcelFileName(record.form.name).replace(/-摄影器材单\.xlsx$/, "-项目备份.json")
      : `CineBox-项目备份-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setToast("项目备份已导出");
  }

  async function importProjectBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploadBusy) return;
    if (file.size > maxBackupFileBytes) {
      setToast("无法导入：项目备份不能超过 10 MB");
      return;
    }
    setImportingBackup(true);
    setUploadLabel(`正在导入 ${file.name}…`);
    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 40));
      const rawPayload: unknown = JSON.parse(await file.text());
      if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) throw new Error("invalid backup");
      const payload = rawPayload as { version?: unknown; projects?: unknown; historyOverrides?: unknown };
      if (payload.version !== undefined && payload.version !== 2) throw new Error("unsupported backup");
      const imported = readProjectCollection(payload.projects, latestRecords.current.projects.map((item) => item.id));
      if (!imported) throw new Error("invalid project collection");
      if (!canAddProjects(imported.length)) return;
      for (const record of imported) {
        const error = kitCapacityError(0, record.kit.length);
        if (error) { setToast(`无法导入「${record.form.name}」：${error}`); return; }
      }
      const importedHistory = sanitizeHistoryOverrides(migrateCatalogHistory(payload.historyOverrides), builtInHistoryProfileIds, equipmentIds);
      if (!canMergeHistory(importedHistory)) return;
      setProjects((current) => [...imported, ...current]);
      setHistoryOverrides((current) => ({ ...current, ...importedHistory }));
      if (imported.length) setActiveProjectId(imported[0].id);
      setView("projects");
      const historyLabel = Object.keys(importedHistory).length ? `，含 ${Object.keys(importedHistory).length} 个自定义历史项目` : "";
      setToast(`已导入并合并 ${imported.length} 个项目${historyLabel}`);
    } catch {
      setToast("无法导入：请选择 CineBox 导出的项目备份");
    } finally { setImportingBackup(false); setUploadLabel(""); }
  }

  function addBlankCustomRow(targetCategory: EquipmentCategory) {
    const row = createCustomKitRow(createId("custom"), targetCategory);
    if (!setKit((current) => [...current, row], `新增${targetCategory}自定义行`)) return;
    window.setTimeout(() => {
      const input = document.getElementById(`custom-name-${row.id}`);
      input?.focus({ preventScroll: true });
      input?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 0);
  }

  function updateCustomRow(row: KitItem, patch: Partial<CustomEquipment>) {
    setKit((current) => current.map((item) => item.id === row.id ? { ...updateCustomKitRow(item, patch), userAdjusted: true, status: "manual" as const } : item), "编辑自定义器材", `${row.id}:custom:${Object.keys(patch).join(",")}`);
  }

  function restoreAutosave() {
    const snapshot = readProjectAutosave();
    if (!snapshot) { setToast("当前设备暂无可恢复的自动存档"); return; }
    const payload = snapshot.payload;
    const restored = readProjectCollection(payload.projects);
    if (!restored) { setToast("自动存档无有效项目，请导入项目备份"); return; }
    if (!window.confirm(`恢复 ${new Date(snapshot.savedAt).toLocaleString("zh-CN")} 的自动存档？当前项目与历史项目将替换为存档内容。`)) return;
    setProjects(restored);
    setActiveProjectId(currentProjectId(restored, payload.activeProjectId));
    setHistoryOverrides(sanitizeHistoryOverrides(migrateCatalogHistory(payload.historyOverrides), builtInHistoryProfileIds, equipmentIds));
    setKitHistories({}); setView("projects"); setToast("已恢复自动存档");
  }

  function renderCustomEquipment(targetCategory: EquipmentCategory) {
    return <section className="custom-item-panel custom-item-flat" aria-label="新增自定义器材">
      <header><h3>新增自定义器材</h3><span>归入{targetCategory}</span></header>
      <form className="custom-item-fields" onSubmit={(event) => { event.preventDefault(); addCustomItem(targetCategory); }}>
        <label><span>器材名</span><EquipmentNameInput key={targetCategory} label="库外器材名称" value={customDraft.name} category={targetCategory} catalog={equipment} required
          onChange={(name) => { setCustomDraft({ ...customDraft, name, brand: "通用" }); setCustomSuggestionId(null); }}
          onSelect={(item) => { setCustomDraft({ ...customDraft, name: item.name, brand: item.brand, unit: item.unit }); setCustomSuggestionId(item.id); }} /></label>
        <label><span>数量</span><input aria-label="库外器材数量" required type="number" min={1} max={999} value={customQuantity} onChange={(event) => setCustomQuantity(clampInteger(Number(event.target.value), 1, 999))} /></label>
        <label><span>单位</span><input required maxLength={20} aria-label="库外器材单位" value={customDraft.unit} onChange={(event) => { setCustomDraft({ ...customDraft, unit: event.target.value }); setCustomSuggestionId(null); }} placeholder="件" /></label>
        <label><span>备注</span><input aria-label="库外器材备注" maxLength={maxKitNoteInputLength} value={customNote} onChange={(event) => setCustomNote(event.target.value)} placeholder="添加备注" /></label>
        <button type="submit" className="button primary">加入当前项目</button>
      </form>
    </section>;
  }

  function renderProjectBasics() {
    const ready = Boolean(activeProject?.basicInfoConfirmed);
    return <details className="project-basics" open={!ready || editingBasics} onToggle={(event) => { if (ready) setEditingBasics(event.currentTarget.open); }}>
      <summary><div><strong>{ready && !editingBasics ? project.name : "项目基本信息"}</strong><span>{project.days} 天 · {project.cameraCount} 机位 · {project.resolution} / {project.aspectRatio} / {project.baseFps}fps</span></div><b>{ready ? editingBasics ? "收起" : "编辑" : "填写后开始"}</b></summary>
      <form className="questionnaire-form basics-form" onSubmit={(event) => { event.preventDefault(); saveProjectBasics(); }}>
        <fieldset><legend>项目与排期</legend><div className="form-grid four basics-schedule">
          <label className="wide-field"><span>项目名称</span><input required maxLength={200} value={project.name} onChange={(event) => updateProject({ name: event.target.value })} placeholder="例如：品牌春季 TVC" /></label>
          {projectSelect("项目类型", "type", ["企业宣传片", "艺人视频", "TVC", "剧情片", "MV", "纪录片"])}
          {projectSelect("项目分类", "category", ["商业项目", "剧情项目", "艺人内容", "纪录内容", "个人创作", "其他"])}
          <label className="wide-field"><span>拍摄开始日期</span><input type="date" value={project.shootDate} onInput={(event) => updateProject({ shootDate: event.currentTarget.value })} onChange={(event) => updateProject({ shootDate: event.target.value })} /><small>{project.shootDate ? `拍摄周期：${formatShootRange(project.shootDate, project.days)}` : "日期待定时可留空"}</small></label>
          <label><span>拍摄天数</span><input type="number" min={1} max={60} value={project.days} onChange={(event) => updateProject({ days: clampInteger(Number(event.target.value), 1, 60) })} /></label>
          <label><span>机位数量</span><select value={project.cameraCount} onChange={(event) => updateProject({ cameraCount: Number(event.target.value) })}>{[1,2,3,4,5,6,7,8].map((value) => <option key={value} value={value}>{value === 1 ? "单机" : value === 2 ? "双机" : `${value} 机位`}</option>)}</select></label>
        </div></fieldset>
        <fieldset><legend>拍摄规格</legend><div className="form-grid four">
          <SpecField key={`${activeProjectId}-resolution`} label="分辨率" value={project.resolution} options={resolutionOptions} onChange={(value) => updateProject({ resolution: String(value) })} placeholder="例如 2880 × 1920 或 5.7K" />
          <SpecField key={`${activeProjectId}-ratio`} label="画幅比" value={project.aspectRatio} options={aspectRatioOptions} onChange={(value) => updateProject(frameSelection(String(value)))} placeholder="例如 2.20:1" pattern="[0-9]+(\.[0-9]+)?\s*[:：]\s*[0-9]+(\.[0-9]+)?" />
          <SpecField key={`${activeProjectId}-fps`} label="项目帧率" value={project.baseFps} options={projectFpsOptions} numeric min={1} max={1000} onChange={(value) => updateProject({ baseFps: Number(value) })} />
          <SpecField key={`${activeProjectId}-speed`} label="升格采集帧率" value={project.highSpeedFps} options={highSpeedFpsOptions} numeric min={1} max={10000} onChange={(value) => updateProject({ highSpeedFps: Number(value) })} />

        </div><p className="spec-note">项目帧率用于时间线与交付；升格为采集帧率。实际录制规格与升格上限，请按机型、传感器模式及编码格式确认。</p></fieldset>
        <fieldset className="basics-contact"><legend>联络与备注</legend><div className="form-grid four">
          <label className="wide-field"><span>摄影指导</span><input value={project.dop} onChange={(event) => updateProject({ dop: event.target.value })} /></label>
          <label className="wide-field"><span>联系方式</span><input value={project.contact} onChange={(event) => updateProject({ contact: event.target.value })} /></label>
          <label className="full-field"><span>补充说明</span><textarea value={project.notes} onChange={(event) => updateProject({ notes: event.target.value })} rows={3} /></label>
        </div></fieldset>
        <div className="basics-submit"><button className="button primary" type="submit" disabled={!project.name.trim()}>{ready ? "保存并继续选器材" : "开始选择器材"}</button></div>
      </form>
    </details>;
  }

  function renderSelectionSummary() {
    return <section className="selection-summary" aria-label="当前项目选材进度">
      <div className="selection-project">
        <h2 title={project.name}>{project.name}</h2>
        <p>{project.days} 天 · {project.cameraCount} 机位 · {project.resolution} · {project.aspectRatio} · {project.baseFps} fps</p>
      </div>
      <div className="selection-actions">
        <span role="status">已选 {completedKit.length} 项 · 合计 {selectedUnits} 件</span>
        <button className="button ghost" onClick={() => editProjectBasics()}>编辑项目</button>
        <button className="button ghost" aria-haspopup="dialog" onClick={(event) => { dialogTriggerRef.current = event.currentTarget; setKitPreviewOpen(true); }}>预览器材单</button>
        <button className="button primary" onClick={() => setView("kit")}>查看器材单</button>
      </div>
    </section>;
  }

  function renderCatalogFilters() {
    return <div className="catalog-filters">
      <div className="filter-bar">
        <label className="search-field">
          <ControlIcon kind="search" />
          <input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(72); }} placeholder="搜索器材，例如：索尼 24-70、阿莱 LF" aria-label="搜索器材" />
        </label>
        <label className="select-field">
          <span>器材类型</span>
          <select aria-label="器材类型" value={namingFilter} onChange={(event) => { setNamingFilter(event.target.value); setVisibleCount(72); setSeriesId(""); }}>
            <option value="全部">全部</option><option value="official-model">品牌型号</option><option value="generic">通用器材</option>
          </select>
        </label>
        <button className="button ghost" onClick={() => { setQuery(""); setCategory("全部"); setBrand("全部"); setNamingFilter("全部"); setVisibleCount(72); setSeriesId(""); }}>清除</button>
      </div>

      <div className="category-picker">
        <label className="select-field"><span>品类</span>
          <select aria-label="选择器材品类" value={category} onChange={(event) => { setCategory(event.target.value as typeof category); setBrand("全部"); setVisibleCount(72); setSeriesId(""); }}>
            {["全部", ...categories].map((name) => <option key={name} value={name}>{name} · {name === "全部" ? equipment.length : equipment.filter((item) => item.category === name).length}</option>)}
          </select>
        </label>
      </div>
      <div className="category-strip" aria-label="器材分类">
        <button className={category === "全部" ? "category-tab active" : "category-tab"} aria-pressed={category === "全部"} onClick={() => { setCategory("全部"); setBrand("全部"); setVisibleCount(72); setSeriesId(""); }}>
          <span>全部</span><b>{equipment.length}</b>
        </button>
        {categories.map((name) => (
          <button key={name} className={category === name ? "category-tab active" : "category-tab"} aria-pressed={category === name} onClick={() => { setCategory(name); setBrand("全部"); setVisibleCount(72); setSeriesId(""); }}>
            <span>{name}</span><b>{equipment.filter((item) => item.category === name).length}</b>
          </button>
        ))}
      </div>

      {activeProject?.basicInfoConfirmed && <div className="category-progress">
        <label htmlFor="category-progress-bar">已选 {kitDocumentGroups.length} / {categories.length} 个类别</label>
        <progress id="category-progress-bar" value={kitDocumentGroups.length} max={categories.length} />
      </div>}
    </div>;
  }

  const pageTitle: Record<View, string> = {
    projects: "项目管理",
    history: "历史项目",
    library: editingBasics || !activeProject?.basicInfoConfirmed ? "项目信息" : "选择器材",
    catalog: "总器材库",
    kit: "当前项目",
  };

  return (
    <main className="app-shell">
      <a className="skip-link" href="#workspace-content" inert={modalOpen}>跳到工作区</a>
      <aside className="sidebar" inert={modalOpen}>
        <button className="brand-lockup" onClick={() => setView("projects")} aria-label="返回项目管理">
          <span className="brand-mark" aria-hidden="true"><Image src={publicAsset("/brand/cinebox-logo-v2-128.png")} width={44} height={44} alt="" unoptimized /></span>
          <span><strong>CineBox</strong><small>摄影器材 · 项目工作台</small></span>
        </button>

        <details className="release-disclosure">
          <summary>{appVersion}<span>更新内容</span></summary>
          <div>{releaseNotes.map((release) => <section key={release.version}><strong>{release.version}<time>{release.date}</time></strong><ul>{release.items.map((item) => <li key={item}>{item}</li>)}</ul></section>)}</div>
        </details>
        <nav className="main-nav" aria-label="主要功能">
          {([
            ["projects", "项目管理"],
            ["history", "历史项目"],
            ["catalog", "总器材库"],
          ] as [View, string][]).map(([target, label]) => (
            <button key={target} className={view === target || target === "projects" && view === "library" ? "nav-item active" : "nav-item"} aria-current={view === target || target === "projects" && view === "library" ? "page" : undefined} onClick={() => {
              setView(target);
            }}>
              <span className="nav-index"><NavigationIcon view={target} /></span>
              <span>{label}</span>
              {target === "catalog" && <em>{equipment.length}</em>}
              {target === "projects" && <em>{projects.filter((item) => item.status === "active").length}</em>}
            </button>
          ))}
          {hydrated && !activeProject && <button className="nav-item compact-new-project" onClick={createNewProject}>
            <span className="nav-index"><ControlIcon kind="plus" /></span><span>新增项目</span>
          </button>}
        </nav>

        {activeProject ? <div className="sidebar-project">
          <span>当前项目</span>
          <button className={view === "kit" ? "current-project-link active" : "current-project-link"} aria-current={view === "kit" ? "page" : undefined} onClick={() => setView("kit")}>
            <strong>{project.name}</strong>
            <small>{project.days} 天 · {project.cameraCount} 机位 · {completedKit.length} 项器材</small>
            <span>打开项目</span>
          </button>
        </div> : hydrated && <div className="sidebar-project sidebar-new-project">
          <button className="button ghost" onClick={createNewProject}><ControlIcon kind="plus" />新增项目</button>
        </div>}

        <div className="sidebar-foot">
          <span className="status-dot" />
          <span role="status">{autosave.error || (autosave.savedAt ? `自动存档 ${new Date(autosave.savedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}` : "即时保存 · 每分钟自动存档")}</span>
        </div>
      </aside>

      <section className="workspace" id="workspace-content" tabIndex={-1} aria-label={pageTitle[view]} inert={modalOpen}>
        <div className="workspace-top">
        <header className="workspace-header">
          <div>
            <h1>{pageTitle[view]}</h1>
          </div>
          <div className="header-actions">
            {activeProject && !browsingEquipment && <button className="header-project" onClick={() => setView("kit")} aria-label={`打开当前器材单：${project.name}，${completedKit.length} 项器材`} title={project.name}><span>当前器材单 · {completedKit.length} 项</span><strong>{project.name}</strong></button>}
            <ActionMenu className="theme-menu" label="颜色模式" trigger={<ThemeIcon mode={themePreference ?? "system"} />} chevron={false}>
            <div className="theme-switcher" role="radiogroup" aria-label="颜色模式" onKeyDown={handleRadioKeys}>
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={(themePreference ?? "system") === option.value}
                  tabIndex={(themePreference ?? "system") === option.value ? 0 : -1}
                  className={(themePreference ?? "system") === option.value ? "active" : ""}
                  title={option.label}
                  aria-label={option.label}
                  onClick={() => setThemePreference(option.value)}
                >
                  <ThemeIcon mode={option.value} />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
            </ActionMenu>
            {activeProject && <div className="undo-controls" role="group" aria-label="器材单修改历史">
              <button disabled={!currentHistory.past.length} onClick={() => travelKit("undo")} aria-label="撤销清单修改" title={`撤销：${currentHistory.past.at(-1)?.label ?? "暂无修改"} · ⌘Z`}><ControlIcon kind="undo" /></button>
              <button disabled={!currentHistory.future.length} onClick={() => travelKit("redo")} aria-label="重做清单修改" title="重做 · ⇧⌘Z"><ControlIcon kind="redo" /></button>
            </div>}
          </div>
        </header>
        {browsingEquipment && <section className="selection-toolbar" aria-label="器材选择与筛选">
          <div className="project-flow-bar"><button onClick={() => setView("projects")}>返回项目管理</button></div>
          {activeProject?.basicInfoConfirmed ? renderSelectionSummary() : (
            <section className="selection-summary" aria-label="当前项目选材进度">
              <div className="selection-project">
                <h2>{activeProject ? project.name : "尚未选择项目"}</h2>
                <p>{activeProject ? "保存项目信息后，可将器材加入当前项目。" : "新建项目后即可保存选材。"}</p>
              </div>
              <button className="button primary" disabled={!hydrated}
                onClick={() => activeProject ? editProjectBasics() : createNewProject()}>
                {activeProject ? "填写项目信息" : "新增项目"}
              </button>
            </section>
          )}
          {renderCatalogFilters()}
        </section>}
        </div>

        {view === "projects" && (
          <section className="projects-view" aria-busy={!hydrated}>
            <div className="page-lead">
              <div>
                <h2>你的项目</h2>
                <div className="project-shortcuts" aria-label="选择器材方式">
                  <button onClick={() => setView("history")}>复用项目</button>
                </div>
              </div>
              <div className="lead-actions">
                <ActionMenu label="项目备份" trigger="备份">
                  <button className="button ghost" onClick={() => exportProjectBackup()}>导出项目备份</button>
                  <button className="button ghost" disabled={uploadBusy} onClick={() => importBackupRef.current?.click()}>{importingBackup ? "正在导入…" : "导入并合并"}</button>
                  <button className="button ghost" disabled={uploadBusy} onClick={restoreAutosave}>恢复自动存档</button>
                </ActionMenu>
                <input ref={importBackupRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={importProjectBackup} />
                <button className="button primary" disabled={!hydrated} onClick={createNewProject}><ControlIcon kind="plus" />新建项目</button>
              </div>
            </div>

            {projects.length > 0 && <div className="project-toolbar">
              <div className="segmented">
                {([["active", "进行中"], ["archived", "已归档"], ["all", "全部"]] as const).map(([value, label]) => (
                  <button key={value} className={projectFilter === value ? "active" : ""} onClick={() => setProjectFilter(value)}>
                    {label}
                    <span>{value === "all" ? projects.length : projects.filter((item) => item.status === value).length}</span>
                  </button>
                ))}
              </div>
              <label className="search-field compact">
                <ControlIcon kind="search" />
                <input value={projectQuery} onChange={(event) => setProjectQuery(event.target.value)} placeholder="搜索项目、类型、摄影指导" aria-label="搜索项目" />
              </label>
            </div>}

            {filteredProjects.length > 0 && <div className="project-grid">
              {filteredProjects.map((record) => (
                <article className={record.id === activeProjectId ? "project-card current" : "project-card"} key={record.id}>
                  <div className="project-card-top">
                    <span className="project-type">{record.form.category}</span>
                    <div className="project-card-badges">
                      {record.id === activeProjectId && <span className="project-current">当前项目</span>}
                      <span className={record.status === "archived" ? "project-status archived" : "project-status"}>{record.status === "archived" ? "已归档" : "进行中"}</span>
                    </div>
                  </div>
                  <button className="project-open" onClick={() => selectProject(record.id)}>
                    <h3>{record.form.name}</h3>
                    <p>{record.form.type} · {record.form.days} 天 · {record.form.cameraCount} 机位</p>
                    <span className="project-open-hint">填写信息 / 选器材 <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 8h10m-4-4 4 4-4 4" /></svg></span>
                  </button>
                  <dl>
                    <div><dt>器材项目</dt><dd>{record.kit.filter((row) => !isBlankCustomKitItem(row)).length}</dd></div>
                    <div><dt>拍摄日期</dt><dd>{record.form.shootDate || "待定"}</dd></div>
                    <div><dt>摄影指导</dt><dd>{record.form.dop || "待定"}</dd></div>
                  </dl>
                  <div className="project-card-actions">
                    <button onClick={() => editProjectBasics(record.id)}>编辑</button>
                    <button onClick={() => duplicateProject(record)}>复制</button>
                    <button onClick={() => toggleArchive(record)}>{record.status === "active" ? "归档" : "恢复"}</button>
                    <button className="danger" onClick={() => deleteProject(record)}>删除</button>
                  </div>
                </article>
              ))}
            </div>}
            {projects.length > 0 && !filteredProjects.length && <div className="empty-state"><strong>没有匹配的项目</strong><span>调整筛选，或创建一个新项目。</span></div>}
            {!hydrated && <div className="empty-state">正在读取项目…</div>}
            {hydrated && !projects.length && <div className="empty-state project-empty" role="status">
              <div className="project-empty-mark" aria-hidden="true">
                <svg viewBox="0 0 64 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path className="frame-left" d="M8 15V8h8M8 33v7h8" />
                  <path className="frame-right" d="M56 15V8h-8m8 25v7h-8" />
                  <path className="frame-cross" d="M32 20v8m-4-4h8" />
                </svg>
              </div>
              <strong>当前无项目</strong>
              <span>新建项目即可填写拍摄信息和准备器材单。</span>
            </div>}
          </section>
        )}

        {view === "history" && (
          <section className="history-view">
            <div className="page-lead"><p>预览器材配置，复用为新项目。</p><button className="button primary" disabled={uploadBusy} onClick={(event) => chooseHistoryProjectFile(createId("imported-history"), event.currentTarget)}><ControlIcon kind="plus" />{analyzingHistory ? "正在读取与识别…" : "上传历史项目"}</button></div>
            <input ref={importHistoryRef} className="visually-hidden" type="file"
              accept=".pdf,.xls,.xlsx,.xlsm,.xlsb,.ods,.csv,.json,.txt,.md,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain,application/json"
              onChange={importHistoryProject} />
            <div className="history-card-grid">
              {projects.filter((record) => record.kit.filter((row) => !isBlankCustomKitItem(row)).length).map((record) => <article className="history-card" key={record.id}>
                <h3>{record.form.name}</h3>
                <dl className="history-card-stats">
                  <div><dt>器材</dt><dd>{record.kit.filter((row) => !isBlankCustomKitItem(row)).length}<span>项</span></dd></div>
                  <div><dt>机位</dt><dd>{record.form.cameraCount}<span>个</span></dd></div>
                  <div><dt>型号</dt><dd className="history-camera-model">{historyCameraModel(record.kit.filter((row) => !isBlankCustomKitItem(row)), equipmentMap) || "—"}</dd></div>
                </dl>
                <div className="history-card-actions">
                  <button aria-label={`预览${record.form.name}`} onClick={(event) => openSavedProjectPreview(record, event.currentTarget)}>预览</button>
                  <button disabled={uploadBusy} onClick={(event) => chooseHistoryProjectFile(record.id, event.currentTarget)}>{analyzingHistory && historyImportTargetId === record.id ? "正在分析…" : "上传替换"}</button>
                  <button className="history-reuse" onClick={() => reuseSavedProject(record)}>复用该项目</button>
                </div>
              </article>)}
              {historyProfiles.map((profile) => <article className="history-card" key={profile.id}>
                <h3>{historyProjectName(profile)}</h3>
                <dl className="history-card-stats">
                  <div><dt>器材</dt><dd>{profile.items.length}<span>项</span></dd></div>
                  <div><dt>机位</dt><dd>{profile.cameraCount}<span>个</span></dd></div>
                  <div><dt>型号</dt><dd className="history-camera-model">{historyCameraModel(profile.items.map(id => ({ id })), equipmentMap) || "—"}</dd></div>
                </dl>
                <div className="history-card-actions">
                  <button aria-label={`预览${historyProjectName(profile)}`} onClick={(event) => openHistoryProjectPreview(profile, event.currentTarget)}>预览</button>
                  <button disabled={uploadBusy} onClick={(event) => chooseHistoryProjectFile(profile.id, event.currentTarget)}>{analyzingHistory && historyImportTargetId === profile.id ? "正在分析…" : "上传替换"}</button>
                  <button className="history-reuse" disabled={!profile.items.length} onClick={() => reuseHistoryProject(profile)}>复用该项目</button>
                </div>
              </article>)}
            </div>
            <p className="history-local-note">支持 Excel 与文字 PDF。文件在当前浏览器解析，核对后生成或替换历史项目；扫描 PDF 请先转为可识别文字。</p>
          </section>
        )}

        {(view === "library" || view === "catalog") && (
          <section className="library-view">
            {view === "library" && !selectingForProject && <>
              <div className="project-flow-bar"><button onClick={() => setView("projects")}>返回项目管理</button></div>
              {activeProject && renderProjectBasics()}
            </>}
            {browsingEquipment && <>
            <div className="catalog-choices paired">
              <CatalogChoice key={category} kind="品牌" options={brandOptions} selected={brand}
                onSelect={(name) => { setBrand(name); setSeriesId(""); setVisibleCount(72); }} />
              <CatalogChoice key={`${category}-${brand}`} kind="系列" options={seriesOptions} selected={seriesId}
                onSelect={(id) => { setSeriesId(id); setVisibleCount(72); }} />
            </div>

            <div className="result-meta">
              <span role="status">找到 <b>{formatCount(equipmentResults.length)}</b> 个标准条目</span>
              {activeSeries ? <button type="button" className="button ghost" disabled={!seriesItemsToAdd}
                onClick={() => addSeriesToKit(activeSeries)}>
                {seriesItemsToAdd ? `补入该系列 ${seriesItemsToAdd} 项` : "该系列已全部加入"}
              </button> : <span>点击“已加入”可取消，数量在器材单中调整</span>}
            </div>

            {renderCustomEquipment(category === "全部" ? "其他" : category)}

            <div className="equipment-list">
              <div className="equipment-list-head"><span>器材名称 / 技术指标</span><span>操作</span></div>
              {equipmentResults.slice(0, visibleCount).map((item) => {
                const inKit = kit.some((row) => row.id === item.id);
                const card = equipmentCardData[item.id];
                const name = card?.name || item.name;
                const specs = card?.technicalSpecs || [];
                return (
                  <article className="equipment-row" key={item.id}>
                    <div className="equipment-name">
                      <h3>{name}</h3>
                      <dl className="equipment-specs" aria-label="技术指标">
                        {specs.map(spec => <div key={spec.label} title={spec.scope === "series" ? `${card.seriesLabel} · 系列参考，具体库存配置需核对` : spec.provenance === "inventory" ? "依据现有库存记录" : "依据厂商技术资料"}><dt>{spec.label}</dt><dd>{spec.value}</dd></div>)}
                      </dl>
                    </div>
                    <div className="equipment-actions">
                      <button className={inKit ? "row-add added" : "row-add"} aria-pressed={inKit} title={inKit ? "再次点击取消选择；可撤销恢复" : "加入当前项目"} aria-label={`${inKit ? "取消选择" : "加入"}${name}`} onClick={() => addToKit(item.id)}>{inKit ? "已加入 · 取消" : "加入"}</button>
                    </div>
                  </article>
                );
              })}
            </div>

            {visibleCount < equipmentResults.length && (
              <button className="load-more" onClick={() => setVisibleCount((count) => count + 72)}>
                显示更多 · 还剩 {formatCount(equipmentResults.length - visibleCount)} 条
              </button>
            )}
            {!equipmentResults.length && <div className="empty-state"><strong>没有找到匹配器材</strong><span>试试旧称、英文型号，或调整筛选条件。</span></div>}
            </>}
          </section>
        )}

        {view === "kit" && activeProject && (
          <section className="kit-view">
            <header className="kit-overview">
              <div>
                <h2>{project.name}</h2>
                <p>{project.type} · {project.days} 天 · {project.cameraCount} 机位 · {project.resolution} · {project.aspectRatio} · {project.baseFps} fps</p>
              </div>
              <div className="kit-overview-actions">
                <p className="kit-totals"><strong>{completedKit.length}</strong> 项器材 · 合计 <strong>{selectedUnits}</strong> 件</p>
                <button className="button ghost" onClick={() => editProjectBasics()}>编辑项目</button>
              </div>
            </header>

            {activeProject?.requirementsChanged && <div className="requirements-notice" role="status"><div><strong>拍摄规格已修改</strong><p>请核对现有器材与最新的机位、分辨率及帧率要求。</p></div><button className="button ghost" onClick={() => updateActive((current) => ({ ...current, requirementsChanged: false, requirementsRevision: (current.requirementsRevision ?? 0) + 1 }))}>已核对清单</button></div>}
            {!!completedKit.length && missingSystemChecks.length > 0 && (
              <section className="system-audit-panel has-missing">
                <header>
                  <h3>{missingSystemChecks.length} 组配套待补齐</h3>
                  <button className="button primary" onClick={completeAllSystemRules}>一键补齐配套</button>
                </header>
                <details className="system-audit-details">
                  <summary>查看缺少的配套</summary>
                  <ul className="system-missing-list">
                    {missingSystemChecks.map((check) => (
                      <li key={check.id}>
                        <span>{check.missing.map((item) => item.label).join("、")}</span>
                        <button className="button ghost" onClick={() => addMissingSystemRule(check)}>补齐配套</button>
                      </li>
                    ))}
                  </ul>
                </details>
              </section>
            )}

            {!kit.length && renderCustomEquipment("其他")}

            {!kit.length ? (
              <div className="empty-state large">
                <strong>当前器材单为空</strong>
                <span>填写项目基本信息后，从器材库选择，或复用历史项目。</span>
                <button className="button primary" onClick={() => setView("library")}>直接选择器材</button>
              </div>
            ) : (
              <div className="kit-groups">
                {groupedKit.map((group) => (
                  <section className="kit-group" key={group.name} data-category={group.name}>
                    <header><h3>{group.name}</h3><div className="kit-group-actions"><small>{group.rows.filter((row) => !isBlankCustomKitItem(row)).length} 项</small><button className="button ghost" aria-label={`在${group.name}下新增自定义器材`} onClick={() => addBlankCustomRow(group.name)}>新增器材</button></div></header>
                    <div className="kit-table-head"><span>设备名称</span><span>数量</span><span>单位</span><span>备注</span><span>操作</span></div>
                    {group.rows.map((row, rowIndex) => {
                      const item = resolveKitEquipment(row)!;
                      const custom = row.custom;
                      const name = custom ? `${group.name}自定义器材${rowIndex + 1}` : item.name;
                      return (
                        <div className={custom ? "kit-row custom-kit-row" : "kit-row"} key={row.id}>
                          <div className="kit-item-name">
                            {custom ? (
                              <div className="custom-kit-identity">
                                <EquipmentNameInput id={`custom-name-${row.id}`} label={`${name}名称`} value={custom.name} category={group.name} catalog={equipment}
                                  onChange={(value) => updateCustomRow(row, { name: value })}
                                  onSelect={(candidate) => { setKit((current) => applyEquipmentSuggestion(current, row.id, candidate), `选择 ${candidate.name}`); setToast("已选择器材，数量与备注保留；重复项自动合并"); }} />
                                {!isBlankCustomKitItem(row) && renderKitConfirmation(row, item.name)}
                              </div>
                            ) : <>
                              <div className="kit-name-line">
                                <strong>{item.name}</strong>
                                {renderKitConfirmation(row, item.name)}
                              </div>
                              <small>{item.brand} · {item.subcategory}</small>
                            </>}
                          </div>
                          <label className="kit-field kit-quantity">
                            <span className="kit-field-label">数量</span>
                            <input aria-label={`${name}数量`} type="number" min={1} max={999} value={row.qty} onChange={(event) => updateKit(row.id, { qty: clampInteger(Number(event.target.value), 1, 999) })} />
                          </label>
                          {custom ? (
                            <label className="kit-field kit-unit">
                              <span className="kit-field-label">单位</span>
                              <input aria-label={`${name}单位`} maxLength={20} value={custom.unit} placeholder="件" onBlur={() => { if (!custom.unit.trim()) updateCustomRow(row, { unit: "件" }); }} onChange={(event) => updateCustomRow(row, { unit: event.target.value })} />
                            </label>
                          ) : (
                            <div className="kit-field kit-unit"><span className="kit-field-label">单位</span><span className="kit-unit-value">{item.unit}</span></div>
                          )}
                          <label className="kit-field kit-note">
                            <span className="kit-field-label">备注</span>
                            <input aria-label={`${name}备注`} maxLength={Math.max(maxKitNoteInputLength, row.note.length)} value={row.note} onChange={(event) => updateKit(row.id, { note: event.target.value })} placeholder="添加备注" />
                          </label>
                          <div className="kit-row-actions">
                            {!custom && <button className="swap-button" onClick={(event) => openSwap(row.id, event.currentTarget)}>更换</button>}
                            <button className="remove-button" aria-label={`删除${name}`} onClick={() => {
                              setKit((current) => current.filter((itemRow) => itemRow.id !== row.id), custom ? "删除自定义器材行" : `移除 ${item.name}`);
                              if (!custom) setToast(`已移除 ${item.name}，可撤销`);
                            }}><ControlIcon kind="close" /></button>
                          </div>
                        </div>
                      );
                    })}
                    {group.rows.some(isBlankCustomKitItem) && <p className="custom-row-help">空白行不计入数量，也不会导出。</p>}
                  </section>
                ))}
              </div>
            )}
            <footer className="kit-footer" aria-label="器材单操作">
              {completedKit.length > 0 && <p role="status">{pendingCount ? `${pendingCount} 项器材待确认` : "器材已全部确认"}</p>}
              <div className="kit-footer-actions">
                <button className="button ghost" onClick={confirmKitItems} disabled={!pendingCount}>一键确认</button>
                <button className="button ghost" onClick={() => { setEditingBasics(false); setView("library"); }}>新增器材</button>
                <div className="kit-export-controls">
                  <select aria-label="导出格式" value={projectExportFormat} disabled={exportingKit}
                    onChange={(event) => setProjectExportFormat(event.target.value as KitExportFormat | "json")}>
                    {Object.entries(kitExportFormats).map(([format, { label }]) => <option key={format} value={format}>{label}</option>)}
                    <option value="json">项目备份（JSON）</option>
                  </select>
                  <button className="button primary" onClick={exportCurrentProject}
                    disabled={exportingKit || projectExportFormat !== "json" && !kitDocumentGroups.length} aria-busy={exportingKit}>
                    {exportingKit ? "正在生成…" : "导出项目"}
                  </button>
                </div>
              </div>
            </footer>
          </section>
        )}
      </section>

      {swapTarget && swapTargetItem && (
        <div className="swap-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSwapTargetId(null); }}>
          <section className="swap-dialog" role="dialog" aria-modal="true" aria-labelledby="swap-title">
            <header>
              <div><h2 id="swap-title">替换 {swapTargetItem.name}</h2><p>{swapTargetItem.category === "摄影机" ? "联动替换先预览清单变化；仅换机身会标为待确认。数量和备注保留。" : "系统保留数量与备注，并优先显示同子类别、同品牌及相近配置强度的器材。"}</p></div>
              <button aria-label="关闭替换面板" onClick={() => setSwapTargetId(null)}><ControlIcon kind="close" /></button>
            </header>
            {!swapCustom && !swapPreview && <><label className="swap-search"><ControlIcon kind="search" /><input autoFocus defaultValue="" onCompositionStart={() => { swapComposing.current = true; }} onCompositionEnd={(event) => { swapComposing.current = false; setSwapQuery(event.currentTarget.value); }} onChange={(event) => { if (!swapComposing.current) setSwapQuery(event.target.value); }} placeholder={`搜索${swapTargetItem.category}中的可替换器材`} aria-label="搜索替换器材" /></label>
            <div className="swap-scope" role="group" aria-label="替换范围">
              {([[
                "recommended", "相近器材"
              ], ["brand", `同品牌 · ${swapTargetItem.brand}`], ["all", `全部${swapTargetItem.category}`]] as const).map(([scope, label]) => (
                <button key={scope} type="button" aria-pressed={swapScope === scope} className={swapScope === scope ? "active" : ""} onClick={() => setSwapScope(scope)}>{label}</button>
              ))}
              <span>{swapCandidates.length} 个结果</span>
            </div>
            </>}
            {!swapCustom && !swapPreview && <div className="swap-results">
              {swapCandidates.map((candidate) => {
                const matchLabel = candidate.subcategory === swapTargetItem.subcategory ? "同子类别" : candidate.brand === swapTargetItem.brand ? "同品牌" : "同大类";
                return (
                  <article className="swap-candidate" key={candidate.id}>
                    <span className="candidate-brand">{canonicalBrandLabels[candidate.brand] ?? candidate.brand}</span>
                    <span><strong>{candidate.name}</strong><small>{matchLabel} · {candidate.subcategory} · 配置强度 {candidate.costTier}/5</small></span>
                    <div>
                      {swapTargetItem.category === "摄影机" && <button className="swap-system" onClick={() => replaceKitItem(candidate.id, "system")}>预览联动替换</button>}
                      <button onClick={() => replaceKitItem(candidate.id, "single")}>{swapTargetItem.category === "摄影机" ? "仅换机身" : "替换"}</button>
                    </div>
                  </article>
                );
              })}
              {!swapCandidates.length && <div className="swap-empty">没有找到未在清单中的同类器材。可以使用下方的“自定义器材”。</div>}
            </div>}
            {swapPreview && <div className="swap-change-preview">
              <h3>检查换机后的清单变化</h3>
              <p>替换为 {swapPreview.name}。已保留人工调整、数量和备注；请核对移除项和新增配套。</p>
              {([['added', '新增'], ['removed', '移除'], ['changed', '调整']] as const).map(([key, label]) => {
                const rows = describeKitChange(kit, swapPreview.rows)[key];
                return <section key={key}><h4>{label} {rows.length} 项</h4><ul>{rows.map((row) => {
                  const before = kit.find((item) => item.id === row.id);
                  return <li key={row.id}><strong>{resolveKitEquipment(row)?.name}</strong> × {row.qty} · {kitConfirmationLabel(row)}
                    {key === "changed" && before && <small>原数量 {before.qty} · 原状态 {kitConfirmationLabel(before)}{before.note !== row.note ? ` · 备注：${before.note || "空"} → ${row.note || "空"}` : ""}</small>}
                  </li>;
                })}</ul></section>;
              })}
              <button className="button ghost" onClick={() => setSwapPreview(null)}>返回选型</button>
              <button autoFocus className="button primary" onClick={() => { if (!setKit(swapPreview.rows, `联动替换 ${swapPreview.name}`)) return; setSwapTargetId(null); setSwapPreview(null); setToast("换机完成；可撤销，兼容项仍需复核"); }}>应用这些变化</button>
            </div>}
            {swapCustom && <form id="swap-custom-form" className="swap-custom-form" onSubmit={(event) => { event.preventDefault(); replaceWithCustom(); }}>
              <p>将当前项目中的此项替换为自定义器材，保留数量和备注。器材兼容性需自行确认。</p>
              <label>器材名称<input autoFocus required maxLength={200} value={swapCustom.name} onChange={(event) => setSwapCustom({ ...swapCustom, name: event.target.value })} /></label>
              <label>品牌<input maxLength={120} value={swapCustom.brand} onChange={(event) => setSwapCustom({ ...swapCustom, brand: event.target.value })} /></label>
              <label>类别<select value={swapCustom.category} onChange={(event) => setSwapCustom({ ...swapCustom, category: event.target.value as EquipmentCategory })}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>单位<input required maxLength={20} value={swapCustom.unit} onChange={(event) => setSwapCustom({ ...swapCustom, unit: event.target.value })} /></label>
            </form>}
            {!swapPreview && <footer className="swap-footer">
              {swapCustom ? <><button type="button" className="button ghost" onClick={() => { setSwapCustom(null); setSwapQuery(""); }}>直接选择器材</button><button className="button primary" type="submit" form="swap-custom-form" disabled={!swapCustom.name.trim() || !swapCustom.unit.trim()}>确认自定义替换</button></> : <button type="button" className="button ghost" onClick={() => setSwapCustom({ name: swapQuery, brand: "", category: swapTargetItem.category, subcategory: "自定义", unit: swapTargetItem.unit })}><ControlIcon kind="plus" />自定义器材</button>}
            </footer>}
          </section>
        </div>
      )}

      {historyPreview && (
        <div className="history-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setHistoryPreview(null); }}>
          <section className="history-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="history-preview-title">
            <header>
              <div>
                <h2 id="history-preview-title">{historyPreview.mode === "analysis" ? isImportedHistoryId(historyPreview.targetId) && !historyOverrides[historyPreview.targetId] ? "确认新增历史项目" : "确认上传替换" : historyProjectName(historyPreview.profile)}</h2>
                <p>{historyPreview.mode === "analysis" ? "核对识别的器材、数量与项目名称，再保存为历史项目。未匹配的型号不会自动加入，请对照原文件补充。" : `历史项目 · ${historyProjectName(historyPreview.profile)}｜${historyPreview.profile.subtitle}`}</p>
              </div>
              <button aria-label="关闭历史项目预览" onClick={() => setHistoryPreview(null)}><ControlIcon kind="close" /></button>
            </header>

            <div className="history-preview-body">
              <section className="history-analysis-summary">
                <div className="history-analysis-status">
                  <span>{historyPreview.record ? "已保存项目" : historyPreview.profile.source ? "已导入项目" : "历史底稿"}</span>
                  {historyPreview.profile.source && <b>识别置信度 {historyPreview.profile.source.confidence}</b>}
                </div>
                {historyPreview.mode === "analysis" && (
                  <label className="history-custom-name">
                    <span>历史项目名称（可选）</span>
                    <input
                      value={historyPreview.profile.projectName ?? historyPreview.profile.customName ?? ""}
                      onChange={(event) => {
                        const projectName = event.target.value;
                        setHistoryPreview((current) => current ? {
                          ...current,
                          profile: {
                            ...current.profile,
                            projectName,
                            customName: projectName,
                            label: formatHistoryProjectName(current.profile.type),
                          },
                        } : current);
                      }}
                      placeholder="例如：春季品牌广告"
                      maxLength={80}
                    />
                    <small>名称将显示在历史项目卡片顶部；留空时显示“自定义导入项目”。</small>
                  </label>
                )}
                <dl>
                  <div><dt>项目类型</dt><dd>{historyPreview.profile.type}</dd></div>
                  <div><dt>机位数量</dt><dd>{historyPreview.profile.cameraCount}</dd></div>
                  <div><dt>画面方向</dt><dd>{historyPreview.profile.screenFormat}</dd></div>
                  {historyPreview.record && <div><dt>拍摄天数</dt><dd>{historyPreview.record.form.days} 天</dd></div>}
                </dl>
                {historyPreview.profile.source && (
                  <div className="history-source-line">
                    <span>导入信息</span>
                    <strong>{historyPreview.profile.source.format} 文件</strong>
                    <small>{new Date(historyPreview.profile.source.importedAt).toLocaleString("zh-CN")}</small>
                  </div>
                )}
              </section>

              <section className="history-equipment-preview">
                <header><div><h3>器材清单</h3></div><strong>{historyPreview.profile.items.length}<small> 项</small></strong></header>
                <div>
                  {historyPreview.profile.items.map((id, index) => {
                    const row = historyPreview.record?.kit.find((row) => row.id === id);
                    const item = row ? resolveKitEquipment(row) : equipmentById(id);
                    if (!item) return null;
                    return (
                      <article key={id}>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <div><strong>{item.name}</strong><small>{item.category}{row?.note ? ` · ${row.note}` : ""}</small></div>
                        <b>×{historyPreview.profile.quantities?.[id] ?? 1}</b>
                      </article>
                    );
                  })}
                  {!historyPreview.profile.items.length && (
                    <div className="history-analysis-empty">
                      <strong>尚未识别出站内标准器材</strong>
                      <span>请检查文件是否包含清晰的器材名称或型号；此结果不能用于替换。</span>
                    </div>
                  )}
                </div>
              </section>

            </div>

            <footer>
              <div>
                {historyPreview.profile.source && historyPreview.mode === "view" && builtInHistoryProfiles.some((profile) => profile.id === historyPreview.targetId) && (
                  <button type="button" className="danger-link" onClick={() => restoreBuiltInHistoryProject(historyPreview.targetId)}>恢复内置项目</button>
                )}
              </div>
              <div>
                <button type="button" className="button ghost" onClick={() => setHistoryPreview(null)}>{historyPreview.mode === "analysis" ? "取消" : "关闭"}</button>
                {historyPreview.mode === "analysis" ? (
                  <button type="button" className="button primary" disabled={!historyPreview.profile.items.length} onClick={confirmHistoryProjectReplacement}>{isImportedHistoryId(historyPreview.targetId) && !historyOverrides[historyPreview.targetId] ? "保存历史项目" : "确认分析并替换"}</button>
                ) : (
                  <button type="button" className="button primary" disabled={uploadBusy} onClick={() => chooseHistoryProjectFile(historyPreview.targetId)}>上传并替换</button>
                )}
              </div>
            </footer>
          </section>
        </div>
      )}

      {kitPreviewOpen && (
        <div className="history-preview-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setKitPreviewOpen(false); }}>
          <section className="history-preview-dialog kit-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="kit-preview-title">
            <header>
              <div><h2 id="kit-preview-title">器材单预览</h2><p>{project.name} · {completedKit.length} 项 · 合计 {selectedUnits}</p></div>
              <button type="button" aria-label="关闭器材单预览" onClick={() => setKitPreviewOpen(false)}><ControlIcon kind="close" /></button>
            </header>
            <div className="kit-preview-body" tabIndex={0} role="region" aria-label="器材明细">
              {kitDocumentGroups.length ? kitDocumentGroups.map((group) => (
                <section className="kit-preview-group" key={group.name}>
                  <h3>{group.name} <small>{group.rows.length} 项</small></h3>
                  <ul>{group.rows.map((row, index) => (
                    <li key={index}>
                      <strong>{row.name}</strong><span>{row.qty} {row.unit}</span>
                      {row.note && <p>{row.note}</p>}
                    </li>
                  ))}</ul>
                </section>
              )) : <p className="kit-preview-empty">当前器材单为空</p>}
            </div>
          </section>
        </div>
      )}

      {uploadBusy && <div className="upload-progress" role="status" aria-live="polite" aria-busy="true"><span className="loading-spinner" aria-hidden="true" /><div><strong>{uploadLabel}</strong><span>请稍候，完成后会显示核对结果</span></div></div>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
