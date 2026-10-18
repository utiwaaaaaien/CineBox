export type HistoryEquipmentRecord = {
  id: string;
  name: string;
  category: string;
  aliases?: string[];
};

export type HistoryProjectSource = {
  fileName: string;
  format: string;
  importedAt: string;
  previewText: string;
  confidence: "高" | "中" | "低";
};

export type HistoryProjectProfile = {
  id: string;
  label: string;
  projectName?: string;
  customName?: string;
  type: string;
  subtitle: string;
  scale: string;
  cameraCount: number;
  styles: string[];
  lensStyle: string;
  screenFormat: string;
  items: string[];
  quantities?: Record<string, number>;
  source?: HistoryProjectSource;
};

const supportedExtensions = new Set(["pdf", "xls", "xlsx", "xlsm", "xlsb", "ods", "csv", "json", "txt", "md"]);
const supportedFormats = new Set([...supportedExtensions].map((extension) => extension.toUpperCase()));
const maxExtractedTextLength = 300_000;
const maxHistoryOverrides = 500;
const projectTypes = [
  ["企业宣传片", /企业宣传|公司宣传|品牌宣传|corporate/i],
  ["艺人视频", /艺人|人物短片|明星|artist|celebrity/i],
  ["TVC", /\btvc\b|广告片|commercial/i],
  ["剧情片", /剧情片|短片|电影|narrative|short\s*film/i],
  ["MV", /\bmv\b|音乐录影|music\s*video/i],
  ["纪录片", /纪录片|纪实|documentary/i],
] as const;

export function projectTypeForReuse(type: string, fallback = "企业宣传片") {
  return projectTypes.some(([name]) => name === type) ? type : fallback;
}

function normalizedSearchText(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[《》【】()[\]{}"'“”‘’·•,，.。:：;；/\\|_\-\s]+/g, "");
}

function isUsableEquipmentCandidate(value: string) {
  return /[\u3400-\u9fff]/.test(value) ? value.length >= 2 : value.length >= 4;
}

function readableFileName(fileName: string) {
  return fileName
    .replace(/\.(pdf|xlsx?|xlsm|xlsb|ods|csv|json|txt|md)$/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatHistoryProjectName(type: string, customName = "") {
  const cleanType = type.trim() || "自定义项目";
  const cleanName = readableFileName(customName)
    .replace(/[《》【】]/g, "")
    .trim()
    .slice(0, 80);
  const separator = /^[\x00-\x7F]+$/.test(cleanType) ? " " : "";
  return cleanName || `${cleanType}${separator}器材单`;
}

function detectProjectType(text: string, fileName: string) {
  const sample = `${fileName}\n${text.slice(0, 5000)}`;
  return projectTypes.find(([, pattern]) => pattern.test(sample))?.[0] ?? "自定义项目";
}

function detectQuantity(line: string) {
  const matches = [
    line.match(/(?:数量|qty|quantity)\s*[:：]?\s*(\d{1,2})/i),
    line.match(/(?:^|[\s,，:：])(?:x|×)\s*(\d{1,2})(?:\D|$)/i),
    line.match(/(?:^|[\s,，:：])(\d{1,2})\s*(?:台|支|套|件|组|个|只|块|卷)(?:\D|$)/i),
    line.match(/(?:^|[,，;；\t])\s*(\d{1,2})\s*$/),
  ];
  const raw = matches.find(Boolean)?.[1];
  return raw ? Math.min(99, Math.max(1, Number(raw))) : 1;
}

function equipmentMatches(text: string, catalog: readonly HistoryEquipmentRecord[]) {
  const whole = normalizedSearchText(text);
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const matches: Array<{ id: string; candidate: string; start: number; end: number; primary: boolean }> = [];
  const quantities: Record<string, number> = {};

  for (const item of catalog) {
    const candidateMap = new Map<string, { value: string; primary: boolean }>();
    [item.name, ...(item.aliases ?? [])].forEach((rawCandidate, index) => {
      const value = normalizedSearchText(rawCandidate);
      if (!isUsableEquipmentCandidate(value)) return;
      const primary = index === 0;
      if (!candidateMap.has(value) || primary) candidateMap.set(value, { value, primary });
    });
    const candidates = [...candidateMap.values()];
    for (const candidate of candidates) {
      let start = whole.indexOf(candidate.value);
      let occurrenceCount = 0;
      while (start >= 0 && occurrenceCount < 20) {
        matches.push({
          id: item.id,
          candidate: candidate.value,
          start,
          end: start + candidate.value.length,
          primary: candidate.primary,
        });
        occurrenceCount += 1;
        start = whole.indexOf(candidate.value, start + Math.max(1, candidate.value.length));
      }
    }
  }

  // Exact catalogue names outrank aliases, then the longest overlapping model
  // wins. This prevents ALEXA Mini LF, VENICE 2, R5 C, etc. from also being
  // imported as their shorter base models while still allowing a separately
  // listed base model elsewhere in the file.
  matches.sort((left, right) =>
    Number(right.primary) - Number(left.primary) ||
    (right.end - right.start) - (left.end - left.start) ||
    left.start - right.start,
  );
  const accepted: typeof matches = [];
  for (const match of matches) {
    const overlapsAnotherItem = accepted.some((existing) =>
      existing.id !== match.id && match.start < existing.end && match.end > existing.start,
    );
    if (!overlapsAnotherItem) accepted.push(match);
  }

  const acceptedIds = new Set(accepted.map((match) => match.id));
  const items = catalog.filter((item) => acceptedIds.has(item.id)).map((item) => item.id);
  for (const item of catalog) {
    if (!acceptedIds.has(item.id)) continue;
    const candidates = accepted.filter((match) => match.id === item.id).map((match) => match.candidate);
    const matchedLine = lines.find((line) => {
      const normalizedLine = normalizedSearchText(line);
      return candidates.some((candidate) => normalizedLine.includes(candidate));
    });
    const quantity = matchedLine ? detectQuantity(matchedLine) : 1;
    if (quantity > 1) quantities[item.id] = quantity;
  }

  return { items, quantities };
}

function detectStyles(text: string) {
  const rules = [
    ["稳定器", /稳定器|ronin|\brs\s?[234]\b|gimbal/i],
    ["滑轨", /滑轨|slider/i],
    ["轨道车", /轨道车|道莱|dolly|track/i],
    ["伸缩摇臂", /摇臂|伸缩炮|jib|crane|howmoco/i],
    ["微距产品", /微距|探针|macro|probe|产品特写/i],
    ["弱光夜景", /夜景|夜外|弱光|low\s*light/i],
    ["高帧率", /高帧率|升格|高速摄影|high\s*speed|\b(?:50|60|100|120|200|240)\s*fps\b/i],
    ["竖屏", /竖屏|9\s*[:：]\s*16|vertical/i],
  ] as const;
  return rules.filter(([, pattern]) => pattern.test(text)).map(([style]) => style);
}

function detectLensStyle(text: string) {
  if (/变形宽银幕|anamorphic|atlas|mercury/i.test(text)) return "变形宽银幕";
  if (/微距|探针|macro|probe|gnosis|x-?tract/i.test(text)) return "微距特殊";
  if (/复古|vintage|super\s*speed|speed\s*panchro|canon\s*fd/i.test(text)) return "复古柔和";
  if (/16\s*[-–]\s*35|24\s*[-–]\s*70|70\s*[-–]\s*200|轻量变焦|photo\s*zoom/i.test(text)) return "轻量变焦";
  if (/supreme|signature\s*prime|master\s*prime|现代|干净|clean/i.test(text)) return "现代干净";
  return "自动匹配";
}

function detectScreenFormat(text: string) {
  if (/横竖双|双版本|dual\s*format/i.test(text)) return "横竖双版本";
  if (/竖屏|9\s*[:：]\s*16|vertical/i.test(text)) return "竖屏";
  return "横屏";
}

function detectScale(text: string, itemCount: number, cameraCount: number) {
  if (/完整(?:制作|配置)|大型制作|full\s*(?:scale|package)/i.test(text)) return "完整";
  if (/轻量(?:制作|配置)|小型制作|lightweight\s*(?:package|crew)/i.test(text)) return "轻量";
  if (/标准(?:制作|配置)|standard\s*(?:package|crew)/i.test(text)) return "标准";
  if (cameraCount >= 3 || itemCount >= 22) return "完整";
  if (cameraCount >= 2 || itemCount >= 12) return "标准";
  return "轻量";
}

function previewOf(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 2400);
}

export function analyzeHistoryProjectText(
  text: string,
  fileName: string,
  format: string,
  catalog: readonly HistoryEquipmentRecord[],
  now = new Date().toISOString(),
): Omit<HistoryProjectProfile, "id"> {
  const cleanText = text.trim();
  const type = detectProjectType(cleanText, fileName);
  const { items, quantities } = equipmentMatches(cleanText, catalog);
  const cameraIds = new Set(catalog.filter((item) => item.category === "摄影机").map((item) => item.id));
  const detectedCameraCount = items
    .filter((id) => cameraIds.has(id))
    .reduce((sum, id) => sum + (quantities[id] ?? 1), 0);
  const explicitCameraCount = cleanText.match(/机位(?:数量|数)?\s*[:：=]?\s*(\d{1,2})/i)?.[1]
    ?? cleanText.match(/(\d{1,2})\s*(?:个)?机位/i)?.[1];
  const cameraCount = Math.min(8, Math.max(1, explicitCameraCount ? Number(explicitCameraCount) : detectedCameraCount || 1));
  const styles = detectStyles(cleanText);
  const scale = detectScale(cleanText, items.length, cameraCount);
  const label = formatHistoryProjectName(type);
  const confidence = items.length >= 8 ? "高" : items.length >= 3 ? "中" : "低";
  const subtitle = items.length
    ? `识别 ${items.length} 项标准器材，${cameraCount} 机位，${scale}制作`
    : "尚未识别出站内标准器材";

  return {
    label,
    type,
    subtitle,
    scale,
    cameraCount,
    styles,
    lensStyle: detectLensStyle(cleanText),
    screenFormat: detectScreenFormat(cleanText),
    items,
    ...(Object.keys(quantities).length ? { quantities } : {}),
    source: {
      fileName,
      format,
      importedAt: now,
      previewText: previewOf(cleanText),
      confidence,
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isUnsafeId(value: string) {
  return Object.prototype.hasOwnProperty.call(Object.prototype, value);
}

export function formatHistoryPdfTextItems(items: readonly unknown[]) {
  let text = "";
  let previousY: number | undefined;
  let previousHasEOL = false;
  for (const item of items) {
    if (!isObject(item) || typeof item.str !== "string") continue;
    const transform = item.transform;
    const y = Array.isArray(transform) && typeof transform[5] === "number" ? transform[5] : undefined;
    if (text && (previousHasEOL || (y !== undefined && previousY !== undefined && Math.abs(y - previousY) > 2))) {
      text += "\n";
    } else if (text) {
      text += " ";
    }
    text += item.str;
    if (y !== undefined) previousY = y;
    previousHasEOL = item.hasEOL === true;
  }
  return text;
}

export function isImportedHistoryId(value: string): boolean {
  return /^imported-history-\d{13}-[a-z0-9]+$/i.test(value);
}

export function sanitizeHistoryOverrides(
  value: unknown,
  builtInIds: ReadonlySet<string>,
  knownEquipmentIds: ReadonlySet<string>,
): Record<string, HistoryProjectProfile> {
  if (!isObject(value)) return {};
  const result: Record<string, HistoryProjectProfile> = {};
  for (const [slotId, raw] of Object.entries(value)) {
    if (
      isUnsafeId(slotId) ||
      (!builtInIds.has(slotId) && !isImportedHistoryId(slotId)) ||
      !isObject(raw) ||
      !isObject(raw.source)
    ) continue;
    const source = raw.source;
    const sourceFileName = typeof source.fileName === "string" && source.fileName.trim()
      ? source.fileName.slice(0, 240)
      : "导入文件";
    const sourceFormat = typeof source.format === "string" && source.format.trim()
      ? source.format.slice(0, 24)
      : "未知";
    if (sourceFormat !== "未知" && !supportedFormats.has(sourceFormat.toUpperCase())) continue;
    const items = Array.isArray(raw.items)
      ? [...new Set(raw.items.filter((item): item is string => typeof item === "string" && !isUnsafeId(item) && knownEquipmentIds.has(item)))]
      : [];
    if (!items.length || Object.keys(result).length >= maxHistoryOverrides) continue;
    const type = typeof raw.type === "string" && raw.type.trim() ? raw.type.trim().slice(0, 80) : "自定义项目";
    const customName = typeof raw.customName === "string" ? readableFileName(raw.customName).slice(0, 80) : "";
    const projectName = typeof raw.projectName === "string"
      ? readableFileName(raw.projectName).slice(0, 80)
      : customName;
    const quantities: Record<string, number> = {};
    if (isObject(raw.quantities)) {
      for (const [id, quantity] of Object.entries(raw.quantities)) {
        if (!isUnsafeId(id) && items.includes(id) && typeof quantity === "number" && Number.isFinite(quantity)) {
          quantities[id] = Math.min(99, Math.max(1, Math.round(quantity)));
        }
      }
    }
    result[slotId] = {
      id: slotId,
      label: formatHistoryProjectName(type),
      ...(projectName ? { projectName } : {}),
      ...(customName ? { customName } : {}),
      type,
      subtitle: typeof raw.subtitle === "string" ? raw.subtitle.slice(0, 240) : "用户导入的历史项目",
      scale: ["轻量", "标准", "完整"].includes(String(raw.scale)) ? String(raw.scale) : "标准",
      cameraCount: typeof raw.cameraCount === "number" ? Math.min(8, Math.max(1, Math.round(raw.cameraCount))) : 1,
      styles: Array.isArray(raw.styles) ? raw.styles.filter((item): item is string => typeof item === "string").slice(0, 12).map((item) => item.slice(0, 80)) : [],
      lensStyle: typeof raw.lensStyle === "string" ? raw.lensStyle.slice(0, 80) : "自动匹配",
      screenFormat: typeof raw.screenFormat === "string" ? raw.screenFormat.slice(0, 80) : "横屏",
      items,
      ...(Object.keys(quantities).length ? { quantities } : {}),
      source: {
        fileName: sourceFileName,
        format: sourceFormat,
        importedAt: typeof source.importedAt === "string" && Number.isFinite(Date.parse(source.importedAt))
          ? new Date(source.importedAt).toISOString()
          : new Date(0).toISOString(),
        previewText: typeof source.previewText === "string" ? source.previewText.slice(0, 2400) : "",
        confidence: source.confidence === "高" || source.confidence === "中" ? source.confidence : "低",
      },
    };
  }
  return result;
}

function fileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export async function extractHistoryProjectFile(file: File) {
  if (file.size > 10 * 1024 * 1024) throw new Error("文件超过 10 MB，请先压缩或拆分");
  const extension = fileExtension(file.name);
  if (!supportedExtensions.has(extension)) throw new Error("暂不支持该文件格式");

  if (extension === "pdf") {
    try {
      const [pdfjs, workerModule] = await Promise.all([
        import("pdfjs-dist"),
        import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
      ]);
      pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
      const document = await loadingTask.promise;
      try {
        const pages: string[] = [];
        let extractedLength = 0;
        for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 120); pageNumber += 1) {
          const page = await document.getPage(pageNumber);
          const content = await page.getTextContent();
          const pageText = formatHistoryPdfTextItems(content.items);
          pages.push(pageText);
          extractedLength += pageText.length;
          if (extractedLength >= maxExtractedTextLength) break;
        }
        return { text: pages.join("\n").slice(0, maxExtractedTextLength), format: "PDF" };
      } finally {
        await loadingTask.destroy();
      }
    } catch {
      throw new Error("无法读取 PDF：文件可能已损坏、加密或只包含扫描图片");
    }
  }

  if (["xls", "xlsx", "xlsm", "xlsb", "ods"].includes(extension)) {
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const sheets = workbook.SheetNames.slice(0, 30).map((name) => {
        const sheet = workbook.Sheets[name];
        return `工作表：${name}\n${XLSX.utils.sheet_to_csv(sheet, { blankrows: false }).slice(0, maxExtractedTextLength)}`;
      });
      return { text: sheets.join("\n\n").slice(0, maxExtractedTextLength), format: extension.toUpperCase() };
    } catch {
      throw new Error("无法读取 Excel：请确认工作簿未加密且文件格式完整");
    }
  }

  const raw = await file.text();
  if (extension === "json") {
    try {
      const parsed: unknown = JSON.parse(raw);
      return { text: JSON.stringify(parsed, null, 2).slice(0, maxExtractedTextLength), format: "JSON" };
    } catch {
      throw new Error("无法读取 JSON：请确认文件内容是有效的 JSON 数据");
    }
  }
  return { text: raw.slice(0, maxExtractedTextLength), format: extension.toUpperCase() };
}
