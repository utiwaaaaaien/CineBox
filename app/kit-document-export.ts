import { formatShootRange, type ExcelExportGroup, type ExcelExportProject } from "./excel-export.ts";

export type KitDocumentFormat = "pdf" | "docx" | "png";

export const KIT_DOCUMENT_MIME = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  zip: "application/zip",
} as const;

type DocumentExport = {
  blob: Blob;
  extension: KitDocumentFormat | "zip";
};

const title = "摄影器材单";
const columnLabels = ["设备名称", "数量", "单位", "备注"];

function projectDetails(project: ExcelExportProject) {
  const specs = [
    project.resolution,
    project.aspectRatio,
    project.baseFps === undefined ? "" : `${project.baseFps}fps`,
    project.highSpeedFps !== undefined && project.highSpeedFps > (project.baseFps ?? 25)
      ? `升格 ${project.highSpeedFps}fps`
      : "",
  ].filter(Boolean).join(" · ");
  return [
    `项目　${project.name || "未命名项目"}${project.type ? `　·　${project.type}` : ""}`,
    `拍摄时间　${formatShootRange(project.shootDate, project.days)}　·　${Math.max(1, project.days)} 天　·　${Math.max(1, project.cameraCount)} 机位`,
    `摄影指导　${project.dop || "待定"}${project.contact ? `　·　电话 ${project.contact}` : ""}`,
    ...(specs ? [`拍摄规格　${specs}`] : []),
  ];
}

async function zipFiles(files: ReadonlyArray<readonly [string, Uint8Array]>, compress: boolean, type: string) {
  const { CFB } = await import("xlsx");
  const archive = CFB.utils.cfb_new();
  for (const [name, bytes] of files) CFB.utils.cfb_add(archive, name, bytes);
  const bytes: Uint8Array<ArrayBuffer> = CFB.write(archive, {
    type: "array",
    fileType: "zip",
    compression: compress,
  });
  return new Blob([bytes], { type });
}

function escapeXml(text: string) {
  return Array.from(text, (character) => {
    const code = character.codePointAt(0)!;
    if ((code < 0x20 && code !== 9) || (code >= 0xd800 && code <= 0xdfff) || code === 0xfffe || code === 0xffff) return "";
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" } as Record<string, string>)[character] ?? character;
  }).join("");
}

const xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const packageNamespace = "http://schemas.openxmlformats.org/package/2006";
const relationshipsNamespace = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const wordNamespace = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

type WordTextStyle = { size?: number; bold?: boolean; keepNext?: boolean; compact?: boolean; centered?: boolean };

function wordParagraph(text: string, style: WordTextStyle = {}) {
  const { size = 22, bold, keepNext, compact, centered } = style;
  const content = text.split(/\r\n?|\n/).map((line) => {
    return line.split("\t").map((part) => `<w:t xml:space="preserve">${escapeXml(part)}</w:t>`).join("<w:tab/>");
  }).join("<w:br/>");
  return `<w:p><w:pPr>${keepNext ? "<w:keepNext/>" : ""}<w:spacing w:after="${compact ? 0 : 120}"/>${centered ? '<w:jc w:val="center"/>' : ""}</w:pPr>
    <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="SimSun" w:hint="eastAsia"/>${bold ? "<w:b/>" : ""}<w:sz w:val="${size}"/><w:lang w:val="zh-CN" w:eastAsia="zh-CN"/></w:rPr>${content}</w:r></w:p>`;
}

function wordTable(group: ExcelExportGroup) {
  const widths = [3980, 800, 1000, 4686];
  const row = (values: string[], heading = false) => `<w:tr>${heading ? "<w:trPr><w:tblHeader/></w:trPr>" : ""}${values.map((value, index) => (
    `<w:tc><w:tcPr><w:tcW w:w="${widths[index]}" w:type="dxa"/>${heading ? '<w:shd w:fill="E8EBEF"/>' : ""}</w:tcPr>${wordParagraph(value, { bold: heading || index === 0, compact: true, centered: index === 1 || index === 2 })}</w:tc>`
  )).join("")}</w:tr>`;
  const borders = ["top", "left", "bottom", "right", "insideH", "insideV"].map((side) =>
    `<w:${side} w:val="single" w:sz="4" w:color="CCD2DA"/>`).join("");
  return `<w:tbl>
    <w:tblPr><w:tblW w:w="10466" w:type="dxa"/><w:tblBorders>${borders}</w:tblBorders><w:tblLayout w:type="fixed"/>
    <w:tblCellMar><w:top w:w="65" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="65" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>
    <w:tblGrid>${widths.map((width) => `<w:gridCol w:w="${width}"/>`).join("")}</w:tblGrid>
    ${row(columnLabels, true)}
    ${group.rows.map((item) => row([item.name, String(item.qty), item.unit, item.note])).join("")}
  </w:tbl>`;
}

function makeWordDocument(details: string[], groups: ExcelExportGroup[], notes: string) {
  const types = `${xmlHeader}<Types xmlns="${packageNamespace}/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  </Types>`;
  const relationships = `${xmlHeader}<Relationships xmlns="${packageNamespace}/relationships">
    <Relationship Id="rId1" Type="${relationshipsNamespace}/officeDocument" Target="word/document.xml"/>
  </Relationships>`;
  const document = `${xmlHeader}<w:document xmlns:w="${wordNamespace}"><w:body>
    ${wordParagraph(title, { size: 40, bold: true, keepNext: true })}
    ${details.map((line) => wordParagraph(line)).join("")}
    ${groups.map((group) => wordParagraph(group.name, { size: 26, bold: true, keepNext: true }) + wordTable(group)).join("")}
    ${notes ? wordParagraph("项目备注", { size: 26, bold: true, keepNext: true }) + wordParagraph(notes) : ""}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>
  </w:body></w:document>`;
  const encoder = new TextEncoder();
  return zipFiles([
    ["[Content_Types].xml", encoder.encode(types)],
    ["_rels/.rels", encoder.encode(relationships)],
    ["word/document.xml", encoder.encode(document)],
  ], true, KIT_DOCUMENT_MIME.docx);
}

const pageWidth = 840;
const pdfPageHeight = 1188;
const maxPngHeight = 2048; // At 2× this stays within the 4096 px canvas limit on iOS.
const margin = 40;
const footerHeight = 52;
const lineHeight = 24;
const padding = 10;
const scale = 2;
const columnWidths = [315, 65, 80, 300];
const wordSegmenter = typeof Intl.Segmenter === "function"
  ? new Intl.Segmenter("zh-CN", { granularity: "word" })
  : null;

type RowKind = "detail" | "section" | "header" | "item";
type VisualCell = { lines: string[]; width: number; centered?: boolean };
type VisualRow = { kind: RowKind; cells: VisualCell[]; lineCount: number };
type VisualPage = { rows: VisualRow[]; height: number };

function rowFont(kind: RowKind, column: number) {
  const weight = kind === "section" || kind === "header" || (kind === "item" && column === 0) ? 600 : 400;
  return `${weight} 16px system-ui, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`;
}

function wrapText(context: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r\n?|\n/)) {
    const words = wordSegmenter ? Array.from(wordSegmenter.segment(paragraph), ({ segment }) => segment) : [...paragraph];
    let current = "";
    for (const word of words) {
      if (context.measureText(current + word).width <= width) {
        current += word;
        continue;
      }
      if (current.trimEnd()) lines.push(current.trimEnd());
      current = word.trimStart();
      if (context.measureText(current).width <= width) continue;
      const characters = [...current];
      current = "";
      for (const character of characters) {
        if (current && context.measureText(current + character).width > width) {
          lines.push(current);
          current = "";
        }
        current += character;
      }
    }
    lines.push(current.trimEnd());
  }
  return lines;
}

function visualRow(context: CanvasRenderingContext2D, kind: RowKind, values: string[]): VisualRow {
  const cells = values.map((value, index) => {
    const width = values.length === 1 ? pageWidth - 2 * margin : columnWidths[index];
    context.font = rowFont(kind, index);
    return {
      lines: wrapText(context, value, width - 2 * padding),
      width,
      centered: values.length > 1 && (index === 1 || index === 2),
    };
  });
  return { kind, cells, lineCount: Math.max(...cells.map((cell) => cell.lines.length)) };
}

function rowHeight(lines: number) {
  return lines * lineHeight + padding * 2;
}

function paginate(
  context: CanvasRenderingContext2D,
  details: string[],
  groups: ExcelExportGroup[],
  notes: string,
  maxHeight: number,
) {
  const titleEnd = margin + 52;
  const header = visualRow(context, "header", columnLabels);
  const pages: VisualPage[] = [];
  let rows: VisualRow[] = [];
  let height = titleEnd;

  function add(row: VisualRow) {
    rows.push(row);
    height += rowHeight(row.lineCount);
  }

  function nextPage() {
    pages.push({ rows, height: height + footerHeight });
    rows = [];
    height = titleEnd;
  }

  function room() {
    return maxHeight - footerHeight - height;
  }

  function addWrapped(row: VisualRow, pageHeader: VisualRow[] = []) {
    let firstLine = 0;
    while (firstLine < row.lineCount) {
      if (room() < rowHeight(1)) {
        nextPage();
        pageHeader.forEach(add);
      }
      const lineCount = Math.min(row.lineCount - firstLine, Math.floor((room() - 2 * padding) / lineHeight));
      if (firstLine === 0 && lineCount === row.lineCount) {
        add(row);
      } else {
        add({
          kind: row.kind,
          lineCount,
          cells: row.cells.map((cell) => ({ ...cell, lines: cell.lines.slice(firstLine, firstLine + lineCount) })),
        });
      }
      firstLine += lineCount;
    }
  }

  for (const line of details) addWrapped(visualRow(context, "detail", [line]));
  for (const group of groups) {
    const section = visualRow(context, "section", [group.name]);
    const headingHeight = rowHeight(section.lineCount) + rowHeight(header.lineCount);
    const maxItemHeight = maxHeight - titleEnd - footerHeight - headingHeight;
    const items = group.rows.map((item) => visualRow(context, "item", [item.name, String(item.qty), item.unit, item.note]));
    const firstItemHeight = rowHeight(items[0].lineCount);
    if (room() < headingHeight + (firstItemHeight <= maxItemHeight ? firstItemHeight : rowHeight(1))) nextPage();
    add(section);
    add(header);
    for (const row of items) {
      const itemHeight = rowHeight(row.lineCount);
      if (itemHeight > room() && itemHeight <= maxItemHeight) {
        nextPage();
        add(section);
        add(header);
      }
      addWrapped(row, [section, header]);
    }
  }
  if (notes) {
    const section = visualRow(context, "section", ["项目备注"]);
    if (room() < rowHeight(section.lineCount) + rowHeight(1)) nextPage();
    add(section);
    addWrapped(visualRow(context, "detail", [notes]), [section]);
  }
  nextPage();
  return pages;
}

function drawPage(canvas: HTMLCanvasElement, page: VisualPage, height: number, number: number, total: number) {
  canvas.width = pageWidth * scale;
  canvas.height = height * scale;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas export is unavailable");
  context.scale(scale, scale);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, pageWidth, height);
  context.textBaseline = "top";
  context.fillStyle = "#141b24";
  context.font = '700 32px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif';
  context.fillText(number === 1 ? title : `${title} · 续`, margin, margin);

  let y = margin + 52;
  for (const row of page.rows) {
    const height = rowHeight(row.lineCount);
    let x = margin;
    for (const [index, cell] of row.cells.entries()) {
      context.fillStyle = { section: "#e9edf2", header: "#f4f6f8", detail: "#ffffff", item: "#ffffff" }[row.kind];
      context.fillRect(x, y, cell.width, height);
      if (row.kind === "header" || row.kind === "item") {
        context.strokeStyle = "#d0d5dc";
        context.strokeRect(x + 0.5, y + 0.5, cell.width, height);
      }
      context.textAlign = cell.centered ? "center" : "left";
      context.font = rowFont(row.kind, index);
      context.fillStyle = "#141b24";
      const textX = x + (cell.centered ? cell.width / 2 : padding);
      cell.lines.forEach((line, index) => context.fillText(line, textX, y + padding + lineHeight * index));
      x += cell.width;
    }
    y += height;
  }

  if (total > 1) {
    context.textAlign = "right";
    context.fillStyle = "#455266";
    context.font = "400 13px system-ui, sans-serif";
    context.fillText(`${number} / ${total}`, pageWidth - margin, height - 30);
  }
}

function canvasBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.type !== type) reject(new Error(`Unable to encode ${type}`));
      else resolve(blob);
    }, type, 0.93);
  });
}

// Canvas uses the browser's installed CJK fonts. Embed each rendered page
// as a JPEG image so the PDF is portable without a separate font download.
function pdfFromImages(images: Blob[]) {
  const parts: BlobPart[] = [];
  const offsets = [0];
  let byteCount = 0;

  function append(part: string | Blob) {
    parts.push(part);
    byteCount += typeof part === "string" ? part.length : part.size; // PDF syntax here is ASCII.
  }

  function object(id: number, ...contents: (string | Blob)[]) {
    offsets[id] = byteCount;
    append(`${id} 0 obj\n`);
    contents.forEach(append);
    append("\nendobj\n");
  }

  append("%PDF-1.4\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  const pageIds = images.map((_, index) => 3 + index * 3);
  object(2, `<< /Type /Pages /Count ${images.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`);

  for (const [index, image] of images.entries()) {
    const pageId = pageIds[index];
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    const draw = "q\n595.28 0 0 841.89 0 0 cm\n/PageImage Do\nQ\n";
    object(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /PageImage ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    object(imageId,
      `<< /Type /XObject /Subtype /Image /Width ${pageWidth * scale} /Height ${pdfPageHeight * scale} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.size} >>\nstream\n`,
      image,
      "\nendstream",
    );
    object(contentId, `<< /Length ${draw.length} >>\nstream\n${draw}endstream`);
  }

  const crossReference = byteCount;
  append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  offsets.slice(1).forEach((offset) => append(`${String(offset).padStart(10, "0")} 00000 n \n`));
  append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${crossReference}\n%%EOF\n`);
  return new Blob(parts, { type: KIT_DOCUMENT_MIME.pdf });
}

export async function buildKitDocument(
  format: KitDocumentFormat,
  project: ExcelExportProject,
  groups: ExcelExportGroup[],
): Promise<DocumentExport> {
  const details = projectDetails(project);
  const populatedGroups = groups.map((group) => ({
    name: group.name,
    rows: group.rows.filter((row) => row.name.trim()),
  })).filter((group) => group.rows.length);
  const notes = project.notes.trim() ? project.notes : "";

  if (format === "docx") {
    return { blob: await makeWordDocument(details, populatedGroups, notes), extension: format };
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas export is unavailable");
  const isPdf = format === "pdf";
  const pages = paginate(context, details, populatedGroups, notes, isPdf ? pdfPageHeight : maxPngHeight);
  const images: Blob[] = [];
  try {
    for (const [index, page] of pages.entries()) {
      drawPage(canvas, page, isPdf ? pdfPageHeight : page.height, index + 1, pages.length);
      images.push(await canvasBlob(canvas, isPdf ? "image/jpeg" : KIT_DOCUMENT_MIME.png));
    }
  } finally {
    // Release the backing canvas promptly, including on Safari.
    canvas.width = canvas.height = 0;
  }

  if (isPdf) return { blob: pdfFromImages(images), extension: format };
  if (images.length === 1) return { blob: images[0], extension: format };

  const pngFiles = await Promise.all(images.map(async (image, index) => [
    `CineBox-${String(index + 1).padStart(String(images.length).length, "0")}.png`,
    new Uint8Array(await image.arrayBuffer()),
  ] as const));
  return { blob: await zipFiles(pngFiles, false, KIT_DOCUMENT_MIME.zip), extension: "zip" };
}
