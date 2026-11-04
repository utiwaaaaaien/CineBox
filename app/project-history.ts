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
class HistoryFileLimitError extends Error {}
export const maxHistoryOverrides = 500;
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

const chineseNumbers: Record<string, number> = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

function quantityNumber(value: string) {
  if (/^\d+$/.test(value)) return Number(value);
  if (value.includes("十")) {
    const [tens, ones] = value.split("十");
    return (tens ? chineseNumbers[tens] ?? 0 : 1) * 10 + (chineseNumbers[ones] ?? 0);
  }
  return chineseNumbers[value] ?? 0;
}

function detectQuantity(line: string, tableQuantity?: string) {
  const value = "([0-9]+|[一二两三四五六七八九十]{1,3})";
  const matches = [
    tableQuantity?.trim().match(new RegExp(`^${value}\\s*(?:台|支|套|件|组|个|只|块|卷|条|根|米|pcs?)?$`, "i")),
    line.match(new RegExp(`(?:数量|qty|quantity)\\s*[:：=]?\\s*${value}(?![0-9])`, "i")),
    line.match(new RegExp(`(?<![a-z0-9])(?:[x×*])\\s*${value}(?![0-9])`, "i")),
    line.match(new RegExp(`${value}\\s*(?:台|支|套|件|组|个|只|块|卷|条|根|米)(?![\\u3400-\\u9fff])`, "i")),
    line.match(/(?:^|[,，;；\t])\s*(\d{1,3})\s*$/),
  ];
  const raw = matches.find(Boolean)?.[1];
  // Explicit zero means no equipment, rather than silently inventing one unit.
  return raw === undefined ? 1 : Math.min(999, Math.max(0, quantityNumber(raw)));
}

function splitTableRow(line: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (!quoted && /[,，\t]/.test(char)) {
      cells.push(cell.trim()); cell = "";
    } else cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

// Keep source offsets so two models on the same row retain their own quantities.
function searchView(line: string) {
  let value = "";
  const offsets: number[] = [];
  for (let index = 0; index < line.length; index += 1) {
    const normalized = normalizedSearchText(line[index]);
    value += normalized;
    for (let n = 0; n < normalized.length; n += 1) offsets.push(index);
  }
  return { value, offsets };
}

function generationOf(name: string) {
  const normalized = name.normalize("NFKC");
  const roman = normalized.match(/\b(?:(?:mark|mk)\s*)?(VIII|VII|VI|IV|III|II|V)\b/i)?.[1]?.toUpperCase();
  if (roman) return ({ II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 } as Record<string, number>)[roman];
  const chinese = normalized.match(/(?:第)?([一二三四五六七八九]|[1-9])代/)?.[1]
    ?? normalized.match(/\b(?:mark|mk)\s*([1-9])\b/i)?.[1]
    ?? normalized.match(/\b[a-z]+[0-9]+m([1-9])\b/i)?.[1];
  return chinese ? quantityNumber(chinese) : undefined;
}

function candidateVariants(name: string) {
  const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
  const generation = generationOf(name);
  const variants = [name];
  if (generation) {
    const pattern = /\b(?:(?:mark|mk)\s*)?(?:VIII|VII|VI|IV|III|II|V)\b|(?:第)?(?:[一二三四五六七八九]|[1-9])代/gi;
    for (const spelling of [roman[generation], `Mark ${roman[generation]}`, `${generation}代`, `${"一二三四五六七八九"[generation - 1]}代`]) {
      variants.push(name.normalize("NFKC").replace(pattern, spelling));
    }
  }
  return variants;
}

function equipmentMatches(text: string, catalog: readonly HistoryEquipmentRecord[]) {
  type Match = { id: string; start: number; end: number; primary: boolean };
  const candidates = catalog.flatMap((item) => {
    const primaryGeneration = generationOf(item.name);
    const variant = item.name.match(/\b(pro|plus|lf)\b/i)?.[1];
    return [item.name, ...(item.aliases ?? [])].flatMap((name, index) => {
      // An unqualified old alias must not silently choose a specific generation.
      if (primaryGeneration && generationOf(name) !== primaryGeneration) return [];
      if (variant && !new RegExp(`\\b${variant}\\b`, "i").test(name)) return [];
      return candidateVariants(name).map((variant) => ({
        id: item.id, value: normalizedSearchText(variant), primary: index === 0,
      })).filter((candidate) => isUsableEquipmentCandidate(candidate.value));
    });
  });
  const whole = normalizedSearchText(text);
  const relevantCandidates = candidates.filter((candidate) => whole.includes(candidate.value));
  const quantities: Record<string, number> = {};
  let quantityColumn: number | undefined;
  for (const line of text.normalize("NFKC").split(/\r?\n/).map((row) => row.trim()).filter(Boolean)) {
    if (line.startsWith("工作表：") || line.startsWith("工作表:")) quantityColumn = undefined;
    const cells = splitTableRow(line);
    const headerColumn = cells.findIndex((cell) => /^(?:数量|qty|quantity)(?:[（(].*[）)])?$/i.test(cell));
    if (headerColumn >= 0) { quantityColumn = headerColumn; continue; }
    const view = searchView(line);
    const matches: Match[] = [];
    for (const candidate of relevantCandidates) {
      let start = view.value.indexOf(candidate.value);
      while (start >= 0) {
        const end = start + candidate.value.length;
        const rawStart = view.offsets[start];
        const rawEnd = view.offsets[end - 1] + 1;
        const before = line[rawStart - 1] ?? "";
        const after = line[rawEnd] ?? "";
        // Do not recognize FX3 inside FX30, or a base model in an unknown generation.
        const joinedToken = (/[a-z0-9]/i.test(candidate.value[0]) && /[a-z0-9]/i.test(before))
          || (/[a-z0-9]/i.test(candidate.value.at(-1) ?? "") && /[a-z0-9]/i.test(after));
        const tail = line.slice(rawEnd);
        const unknownSuffix = /^\s*(?:(?:mark|mk)\s*[ivx0-9]+\b|[ivx]{1,4}\b|(?:第)?[一二三四五六七八九1-9]代|pro\b|plus\b|lf\b)/i.test(tail);
        if (!joinedToken && !unknownSuffix) matches.push({ id: candidate.id, start: rawStart, end: rawEnd, primary: candidate.primary });
        start = view.value.indexOf(candidate.value, start + Math.max(1, candidate.value.length));
      }
    }
    matches.sort((left, right) => Number(right.primary) - Number(left.primary) || (right.end - right.start) - (left.end - left.start));
    const accepted: Match[] = [];
    const ambiguousSpans: Match[] = [];
    for (const match of matches) {
      const overlaps = (other: Match) => match.start < other.end && match.end > other.start;
      if (accepted.some(overlaps) || ambiguousSpans.some(overlaps)) continue;
      const ambiguous = matches.some((other) => other.id !== match.id && other.primary === match.primary && other.start === match.start && other.end === match.end);
      if (ambiguous) {
        // A shorter alias inside an ambiguous full name cannot resolve its identity.
        ambiguousSpans.push(match);
        continue;
      }
      accepted.push(match);
    }
    accepted.sort((left, right) => left.start - right.start);
    // Multiple aliases/names for one item on a row describe one inventory entry.
    const rowQuantities = new Map<string, number>();
    accepted.forEach((match, index) => {
      const segment = accepted.length === 1
        ? line.slice(0, match.start) + line.slice(match.end)
        : line.slice(match.end, accepted[index + 1]?.start);
      const quantity = detectQuantity(segment, accepted.length === 1 && quantityColumn !== undefined ? cells[quantityColumn] : undefined);
      rowQuantities.set(match.id, Math.max(rowQuantities.get(match.id) ?? 0, quantity));
    });
    for (const [id, quantity] of rowQuantities) quantities[id] = Math.min(999, (quantities[id] ?? 0) + quantity);
  }
  const items = catalog.filter((item) => quantities[item.id] > 0).map((item) => item.id);
  return { items, quantities: Object.fromEntries(items.filter((id) => quantities[id] > 1).map((id) => [id, quantities[id]])) };
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
          quantities[id] = Math.min(999, Math.max(1, Math.round(quantity)));
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
      cameraCount: typeof raw.cameraCount === "number" && Number.isFinite(raw.cameraCount) ? Math.min(8, Math.max(1, Math.round(raw.cameraCount))) : 1,
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
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), enableXfa: false });
      try {
        const document = await loadingTask.promise;
        if (document.numPages > 120) throw new HistoryFileLimitError("PDF 超过 120 页，请拆分后导入，避免遗漏器材");
        const pages: string[] = [];
        let extractedLength = 0;
        for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 120); pageNumber += 1) {
          const page = await document.getPage(pageNumber);
          const content = await page.getTextContent();
          const pageText = formatHistoryPdfTextItems(content.items);
          pages.push(pageText);
          extractedLength += pageText.length + (pages.length > 1 ? 1 : 0);
          if (extractedLength > maxExtractedTextLength) throw new HistoryFileLimitError("文件文字量超过 30 万字，请拆分后导入");
        }
        return { text: pages.join("\n"), format: "PDF" };
      } finally {
        await loadingTask.destroy();
      }
    } catch (error) {
      if (error instanceof HistoryFileLimitError) throw error;
      throw new Error("无法读取 PDF：文件可能已损坏、加密或只包含扫描图片");
    }
  }

  if (["xls", "xlsx", "xlsm", "xlsb", "ods"].includes(extension)) {
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true, sheetRows: 10_000 });
      if (workbook.SheetNames.length > 30) throw new HistoryFileLimitError("工作簿超过 30 张工作表，请拆分后导入");
      const sheets: string[] = [];
      let remaining = maxExtractedTextLength;
      for (const name of workbook.SheetNames.slice(0, 30)) {
        const sheet = workbook.Sheets[name];
        if (!sheet?.["!ref"]) continue;
        const range = XLSX.utils.decode_range(sheet["!fullref"] ?? sheet["!ref"]);
        if (range.e.r - range.s.r >= 10_000 || range.e.c - range.s.c >= 100) throw new HistoryFileLimitError("工作表超过 10000 行或 100 列，请移除多余区域或拆分后导入");
        range.e.r = Math.min(range.e.r, range.s.r + 9_999);
        range.e.c = Math.min(range.e.c, range.s.c + 99);
        sheet["!ref"] = XLSX.utils.encode_range(range);
        const text = `工作表：${name}\n${XLSX.utils.sheet_to_csv(sheet, { blankrows: false })}`;
        sheets.push(text);
        remaining -= text.length + (sheets.length > 1 ? 2 : 0);
        if (remaining < 0) throw new HistoryFileLimitError("工作簿文字量超过 30 万字，请拆分后导入");
      }
      return { text: sheets.join("\n\n"), format: extension.toUpperCase() };
    } catch (error) {
      if (error instanceof HistoryFileLimitError) throw error;
      throw new Error("无法读取 Excel：请确认工作簿未加密且文件格式完整");
    }
  }

  const raw = await file.text();
  if (raw.length > maxExtractedTextLength) throw new HistoryFileLimitError("文件文字量超过 30 万字，请拆分后导入");
  if (extension === "json") {
    try {
      const parsed: unknown = JSON.parse(raw);
      const text = JSON.stringify(parsed, null, 2);
      if (text.length > maxExtractedTextLength) throw new HistoryFileLimitError("文件文字量超过 30 万字，请拆分后导入");
      return { text, format: "JSON" };
    } catch (error) {
      if (error instanceof HistoryFileLimitError) throw error;
      throw new Error("无法读取 JSON：请确认文件内容是有效的 JSON 数据");
    }
  }
  return { text: raw, format: extension.toUpperCase() };
}
