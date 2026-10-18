export type ProjectKitStatus = "confirmed" | "recommended" | "pending" | "manual";

export type ProjectCustomEquipment<Category extends string = string> = {
  name: string;
  brand: string;
  category: Category;
  subcategory: string;
  unit: string;
};

export type ProjectKitItem<Category extends string = string> = {
  id: string;
  qty: number;
  note: string;
  reason: string;
  status?: ProjectKitStatus;
  custom?: ProjectCustomEquipment<Category>;
  userAdjusted?: boolean;
};

export type ProjectStateRecord<Form extends object, Category extends string = string> = {
  id: string;
  form: Form;
  kit: ProjectKitItem<Category>[];
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  requirementsChanged?: boolean;
  basicInfoConfirmed?: boolean;
};

export type SanitizeProjectOptions<Form extends object, Category extends string> = {
  defaultForm: Form;
  isKnownEquipmentId: (id: string) => boolean;
  isCategory: (value: string) => value is Category;
  createId: (prefix: string) => string;
  now?: () => string;
  numericPrecision?: Partial<Record<keyof Form, number>>;
  numericBounds?: Partial<Record<keyof Form, readonly [number, number]>>;
  allowedNumberValues?: Partial<Record<keyof Form, readonly number[]>>;
  allowedStringValues?: Partial<Record<keyof Form, readonly string[]>>;
  allowedArrayValues?: Partial<Record<keyof Form, readonly string[]>>;
  reservedIds?: Iterable<string>;
};

type UnknownRecord = Record<string, unknown>;

const kitStatuses = new Set<ProjectKitStatus>(["confirmed", "recommended", "pending", "manual"]);
const maxFormStringLength = 10_000;
const maxFormArrayLength = 100;
const maxFormArrayItemLength = 200;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nonEmptyString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function validTimestamp(value: unknown, fallback: string) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : fallback;
}

function sanitizeForm<Form extends object>(
  value: unknown,
  defaults: Form,
  numericBounds: SanitizeProjectOptions<Form, string>["numericBounds"],
  allowedNumberValues: SanitizeProjectOptions<Form, string>["allowedNumberValues"],
  allowedStringValues: SanitizeProjectOptions<Form, string>["allowedStringValues"],
  allowedArrayValues: SanitizeProjectOptions<Form, string>["allowedArrayValues"],
  numericPrecision: SanitizeProjectOptions<Form, string>["numericPrecision"],
) {
  const input = isRecord(value) ? value : {};
  const result = { ...defaults } as Form;

  for (const key of Object.keys(defaults) as Array<keyof Form>) {
    const fallback = defaults[key];
    const candidate = input[String(key)];

    if (Array.isArray(fallback)) {
      if (Array.isArray(candidate)) {
        const allowedValues = allowedArrayValues?.[key];
        result[key] = [...new Set(
          candidate
            .slice(0, maxFormArrayLength)
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.slice(0, maxFormArrayItemLength))
            .filter((item) => !allowedValues || allowedValues.includes(item)),
        )] as Form[keyof Form];
      }
      continue;
    }

    if (typeof fallback === "number") {
      if (typeof candidate !== "number" || !Number.isFinite(candidate)) continue;
      const allowedValues = allowedNumberValues?.[key];
      if (allowedValues && !allowedValues.includes(candidate)) continue;
      const bounds = numericBounds?.[key];
      const normalized = bounds
        ? Math.min(bounds[1], Math.max(bounds[0], candidate))
        : candidate;
      const precision = 10 ** Math.min(6, Math.max(0, numericPrecision?.[key] ?? 0));
      result[key] = (Math.round(normalized * precision) / precision) as Form[keyof Form];
      continue;
    }

    if (typeof fallback === "string" && typeof candidate === "string") {
      const allowedValues = allowedStringValues?.[key];
      if (!allowedValues || allowedValues.includes(candidate)) {
        result[key] = candidate.slice(0, maxFormStringLength) as Form[keyof Form];
      }
      continue;
    }

    if (typeof candidate === typeof fallback) {
      result[key] = candidate as Form[keyof Form];
    }
  }

  return result;
}

function sanitizeCustomEquipment<Category extends string>(
  value: unknown,
  isCategory: (value: string) => value is Category,
): ProjectCustomEquipment<Category> | undefined {
  if (!isRecord(value)) return undefined;
  const name = nonEmptyString(value.name, "");
  const category = optionalString(value.category);
  if (!name || !isCategory(category)) return undefined;

  return {
    name: name.slice(0, 240),
    brand: nonEmptyString(value.brand, "通用").slice(0, 120),
    category,
    subcategory: nonEmptyString(value.subcategory, "自定义").slice(0, 120),
    unit: nonEmptyString(value.unit, "件").slice(0, 20),
  };
}

export function sanitizeKitItems<Category extends string>(
  value: unknown,
  options: Pick<SanitizeProjectOptions<object, Category>, "isKnownEquipmentId" | "isCategory">,
): ProjectKitItem<Category>[] {
  if (!Array.isArray(value)) return [];

  const result: ProjectKitItem<Category>[] = [];
  const seenIds = new Set<string>();

  for (const candidate of value.slice(0, 5_000)) {
    if (!isRecord(candidate)) continue;
    const id = nonEmptyString(candidate.id, "").slice(0, 240);
    if (!id || seenIds.has(id)) continue;

    const knownEquipment = options.isKnownEquipmentId(id);
    const custom = knownEquipment
      ? undefined
      : sanitizeCustomEquipment<Category>(candidate.custom, options.isCategory);
    if (!knownEquipment && !custom) continue;

    const rawQuantity = typeof candidate.qty === "number" && Number.isFinite(candidate.qty)
      ? candidate.qty
      : 1;
    const status = typeof candidate.status === "string" && kitStatuses.has(candidate.status as ProjectKitStatus)
      ? candidate.status as ProjectKitStatus
      : undefined;

    result.push({
      id,
      qty: Math.min(999, Math.max(1, Math.round(rawQuantity))),
      note: optionalString(candidate.note).slice(0, 2_000),
      reason: optionalString(candidate.reason, custom ? "恢复的自定义器材" : "恢复的器材").slice(0, 1_000),
      status,
      custom,
      userAdjusted: candidate.userAdjusted === true || undefined,
    });
    seenIds.add(id);
  }

  return result;
}

export function sanitizeProjectRecords<Form extends object, Category extends string>(
  value: unknown,
  options: SanitizeProjectOptions<Form, Category>,
): ProjectStateRecord<Form, Category>[] {
  if (!Array.isArray(value)) return [];

  const timestamp = options.now?.() ?? new Date().toISOString();
  const projects: ProjectStateRecord<Form, Category>[] = [];
  const usedIds = new Set<string>(options.reservedIds);

  for (const candidate of value.slice(0, 500)) {
    if (!isRecord(candidate) || !isRecord(candidate.form)) continue;

    let id = nonEmptyString(candidate.id, "").slice(0, 240);
    if (!id || usedIds.has(id)) {
      do {
        id = options.createId("project");
      } while (usedIds.has(id));
    }
    usedIds.add(id);

    projects.push({
      id,
      form: sanitizeForm(
        candidate.form,
        options.defaultForm,
        options.numericBounds,
        options.allowedNumberValues,
        options.allowedStringValues,
        options.allowedArrayValues,
        options.numericPrecision,
      ),
      kit: sanitizeKitItems<Category>(candidate.kit, options),
      status: candidate.status === "archived" ? "archived" : "active",
      createdAt: validTimestamp(candidate.createdAt, timestamp),
      updatedAt: validTimestamp(candidate.updatedAt, timestamp),
      requirementsChanged: candidate.requirementsChanged === true,
      basicInfoConfirmed: typeof candidate.basicInfoConfirmed === "boolean" ? candidate.basicInfoConfirmed : Array.isArray(candidate.kit) && candidate.kit.length > 0,
    });
  }

  return projects;
}

function isUserOwnedRow<Category extends string>(row: ProjectKitItem<Category>) {
  return (
    row.userAdjusted === true ||
    row.status === "manual" ||
    row.status === "confirmed" ||
    row.status === "pending" ||
    row.note.trim().length > 0
  );
}

export function mergeGeneratedKit<Category extends string>(
  current: ProjectKitItem<Category>[],
  generated: ProjectKitItem<Category>[],
) {
  const currentById = new Map(current.map((row) => [row.id, row]));
  const preservedIds = new Set<string>();
  const merged = generated.map((row) => {
    const previous = currentById.get(row.id);
    if (!previous || !isUserOwnedRow(previous)) return row;

    preservedIds.add(previous.id);
    return {
      ...row,
      qty: previous.qty,
      note: previous.note || row.note,
      reason: previous.status === "manual" ? previous.reason : row.reason,
      status: previous.status ?? row.status,
      userAdjusted: previous.userAdjusted,
      ...(previous.status === "manual" && previous.custom ? { custom: previous.custom } : {}),
    };
  });

  const mergedIds = new Set(merged.map((row) => row.id));
  for (const row of current) {
    if (mergedIds.has(row.id) || !isUserOwnedRow(row)) continue;
    merged.push(row);
    mergedIds.add(row.id);
    preservedIds.add(row.id);
  }

  return {
    rows: merged,
    preservedCount: preservedIds.size,
  };
}

export function addOrIncrementKitItem<Category extends string>(
  current: ProjectKitItem<Category>[],
  id: string,
  reason: string,
) {
  const existing = current.find((row) => row.id === id);
  if (existing) {
    return current.map((row) => row.id === id
      ? { ...row, qty: Math.min(999, row.qty + 1), userAdjusted: true }
      : row);
  }
  return [...current, { id, qty: 1, note: "", reason, status: "manual" as const }];
}
