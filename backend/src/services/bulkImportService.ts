import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import Papa from "papaparse";
import { DEFAULT_CATEGORIES, type Scope } from "../types.js";
import { normalizeMerchant } from "../utils/normalizeMerchant.js";
import { normalizeRawTransactionForImport, transactionSchema } from "../validation.js";

dayjs.extend(customParseFormat);

export type BulkImportFormat = "csv" | "json";

export type BulkColumnMap = {
  date?: string;
  amount?: string;
  description?: string;
  category?: string;
  scope?: string;
};

export type BulkPreviewRow = {
  sourceIndex: number;
  status: "ok" | "warning" | "error" | "skipped_duplicate";
  issues: string[];
  fingerprint: string;
  transaction: null | {
    date: string;
    amount: number;
    flow: "expense" | "income";
    category: string;
    description: string;
    scope: Scope;
    notes?: string;
  };
  raw?: Record<string, string>;
};

export type BulkPreviewStats = {
  ok: number;
  warning: number;
  error: number;
  skipped_duplicate: number;
};

const MAX_PREVIEW_ROWS = 10_000;
const WARN_ROW_THRESHOLD = 2000;

export function fingerprintTransaction(
  date: string,
  amount: number,
  description: string,
  flow: "expense" | "income" = "expense",
): string {
  return `${date}|${Number(amount).toFixed(2)}|${normalizeMerchant(description)}|${flow}`;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Guess CSV column keys from header row. */
export function guessColumnMap(headers: string[]): BulkColumnMap {
  const map: BulkColumnMap = {};
  for (const h of headers) {
    const n = normalizeHeader(h);
    if (!map.date && /^(date|posting|transaction date|value date|booked)$/.test(n)) map.date = h;
    if (!map.amount && /^(amount|debit|credit|withdrawal|payment|hk\$|hkd)$/.test(n)) map.amount = h;
    if (!map.description && /^(description|details|payee|merchant|narrative|memo|particulars)$/.test(n)) map.description = h;
    if (!map.category && /^(category|type|class)$/.test(n)) map.category = h;
    if (!map.scope && /^(account|scope|personal|business)$/.test(n)) map.scope = h;
  }
  if (!map.date && headers[0]) map.date = headers[0];
  if (!map.amount && headers[1]) map.amount = headers[1];
  if (!map.description && headers[2]) map.description = headers[2];
  return map;
}

export function coerceAmount(raw: string | undefined): {
  value: number | null;
  flow?: "expense" | "income";
  issue?: string;
} {
  if (raw == null || String(raw).trim() === "") return { value: null };
  let s = String(raw).trim();
  let parenNegative = false;
  if (/^\(.*\)$/.test(s)) {
    parenNegative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/HK\$|\$|HKD/gi, "").replace(/\s/g, "");
  const eu = /^-?\d{1,3}(\.\d{3})*,\d{2}$/.test(s);
  if (eu) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  if (!Number.isFinite(n) || n === 0) return { value: null, issue: "Could not parse amount" };
  if (parenNegative) {
    return { value: Math.abs(n), flow: "expense" };
  }
  if (n < 0) {
    return { value: Math.abs(n), flow: "income" };
  }
  return { value: n, flow: "expense" };
}

export function coerceDate(raw: string | undefined): { value: string | null; issue?: string } {
  if (raw == null || String(raw).trim() === "") return { value: null };
  const s = String(raw).trim();
  const iso = dayjs(s, "YYYY-MM-DD", true);
  if (iso.isValid()) return { value: iso.format("YYYY-MM-DD") };
  const dmy = dayjs(s, ["DD/MM/YYYY", "D/M/YYYY", "DD-MM-YYYY"], true);
  if (dmy.isValid()) return { value: dmy.format("YYYY-MM-DD") };
  const slash = dayjs(s, ["MM/DD/YYYY", "M/D/YYYY"], true);
  if (slash.isValid()) return { value: slash.format("YYYY-MM-DD") };
  return { value: null, issue: "Could not parse date" };
}

function isKnownCategory(name: string): boolean {
  return (DEFAULT_CATEGORIES as readonly string[]).includes(name);
}

function rowFromCsvRecord(
  record: Record<string, string>,
  map: BulkColumnMap,
  sourceIndex: number,
): { draft: Record<string, unknown>; issues: string[] } {
  const issues: string[] = [];
  const dateRaw = map.date ? record[map.date] : undefined;
  const amountRaw = map.amount ? record[map.amount] : undefined;
  const descRaw = map.description ? record[map.description] : undefined;
  const catRaw = map.category ? record[map.category] : undefined;
  const scopeRaw = map.scope ? record[map.scope] : undefined;

  const d = coerceDate(dateRaw);
  if (d.issue) issues.push(d.issue);
  const a = coerceAmount(amountRaw);
  if (a.issue) issues.push(a.issue);

  let description = (descRaw ?? "").trim();
  if (!description && (amountRaw || dateRaw)) {
    description = "Imported transaction";
    issues.push("Description was empty; using placeholder");
  }

  let category = (catRaw ?? "").trim();
  if (!category) {
    category = "Uncategorized";
    issues.push("Category was empty; using Uncategorized");
  } else if (!isKnownCategory(category)) {
    issues.push(`Category "${category}" is not a default label — it will be created`);
  }

  let scope: Scope = "personal";
  if (scopeRaw) {
    const v = scopeRaw.trim().toLowerCase();
    if (v === "business" || v === "biz" || v === "work") scope = "business";
    else if (v === "personal" || v === "private" || v === "") scope = "personal";
    else issues.push(`Unknown account "${scopeRaw}"; using personal`);
  }

  const draft = {
    date: d.value,
    amount: a.value,
    flow: a.flow ?? "expense",
    category,
    description,
    scope,
  };
  return { draft, issues };
}

function rowFromJsonObject(obj: unknown, sourceIndex: number): { draft: Record<string, unknown>; issues: string[] } {
  const issues: string[] = [];
  if (!obj || typeof obj !== "object") {
    return { draft: {}, issues: ["Not an object"] };
  }
  const o = obj as Record<string, unknown>;
  const dateRaw = o.date ?? o.Date;
  const amountRaw = o.amount ?? o.Amount;
  const description = String(o.description ?? o.merchant ?? o.payee ?? "").trim();
  const category = String(o.category ?? o.Category ?? "").trim();
  const scopeRaw = o.scope ?? o.account ?? o.Account;

  const d = coerceDate(typeof dateRaw === "string" ? dateRaw : dateRaw != null ? String(dateRaw) : undefined);
  if (d.issue) issues.push(d.issue);
  const a = coerceAmount(typeof amountRaw === "number" ? String(amountRaw) : amountRaw != null ? String(amountRaw) : undefined);
  if (a.issue) issues.push(a.issue);

  let cat = category;
  if (!cat) {
    cat = "Uncategorized";
    issues.push("Category was empty; using Uncategorized");
  } else if (!isKnownCategory(cat)) {
    issues.push(`Category "${cat}" is not a default label — it will be created`);
  }

  let scope: Scope = "personal";
  if (typeof scopeRaw === "string") {
    const v = scopeRaw.trim().toLowerCase();
    if (v === "business") scope = "business";
  }

  let desc = description;
  if (!desc) {
    desc = "Imported transaction";
    issues.push("Description was empty; using placeholder");
  }

  let flow: "expense" | "income" = a.flow ?? "expense";
  const flowCandidate = o.flow ?? o.kind ?? o.type;
  if (typeof flowCandidate === "string") {
    const v = flowCandidate.trim().toLowerCase();
    if (v === "income" || v === "expense") flow = v;
  }

  return {
    draft: { date: d.value, amount: a.value, flow, category: cat, description: desc, scope },
    issues,
  };
}

export function previewBulkImport(params: {
  format: BulkImportFormat;
  text: string;
  columnMap?: BulkColumnMap | null;
}): {
  rows: BulkPreviewRow[];
  stats: BulkPreviewStats;
  truncated: boolean;
  rowWarningThreshold: number;
  suggestedColumnMap?: BulkColumnMap;
  csvHeaders?: string[];
} {
  const text = params.text ?? "";
  const stats: BulkPreviewStats = { ok: 0, warning: 0, error: 0, skipped_duplicate: 0 };
  const fingerprintsInBatch = new Set<string>();

  let rawRows: Array<{ record?: Record<string, string>; json?: unknown; sourceIndex: number }> = [];
  let suggestedColumnMap: BulkColumnMap | undefined;
  let csvHeaders: string[] | undefined;

  if (params.format === "csv") {
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
    });
    if (parsed.errors.length) {
      return {
        rows: [
          {
            sourceIndex: 0,
            status: "error",
            issues: parsed.errors.map((e) => e.message).slice(0, 5),
            fingerprint: "",
            transaction: null,
          },
        ],
        stats: { ok: 0, warning: 0, error: 1, skipped_duplicate: 0 },
        truncated: false,
        rowWarningThreshold: WARN_ROW_THRESHOLD,
        csvHeaders: [],
      };
    }
    const data = parsed.data.filter((r) => Object.keys(r).some((k) => String(r[k] ?? "").trim() !== ""));
    const headers = parsed.meta.fields ?? [];
    csvHeaders = headers;
    suggestedColumnMap = guessColumnMap(headers);
    const map = { ...suggestedColumnMap, ...params.columnMap };
    data.forEach((record, i) => rawRows.push({ record, sourceIndex: i }));
  } else {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      return {
        rows: [
          {
            sourceIndex: 0,
            status: "error",
            issues: ["Invalid JSON"],
            fingerprint: "",
            transaction: null,
          },
        ],
        stats: { ok: 0, warning: 0, error: 1, skipped_duplicate: 0 },
        truncated: false,
        rowWarningThreshold: WARN_ROW_THRESHOLD,
      };
    }
    const arr = Array.isArray(parsed) ? parsed : (parsed as { transactions?: unknown }).transactions;
    if (!Array.isArray(arr)) {
      return {
        rows: [
          {
            sourceIndex: 0,
            status: "error",
            issues: ['JSON must be an array of transactions or { "transactions": [...] }'],
            fingerprint: "",
            transaction: null,
          },
        ],
        stats: { ok: 0, warning: 0, error: 1, skipped_duplicate: 0 },
        truncated: false,
        rowWarningThreshold: WARN_ROW_THRESHOLD,
        csvHeaders: undefined,
      };
    }
    arr.forEach((json, i) => rawRows.push({ json, sourceIndex: i }));
  }

  const truncated = rawRows.length > MAX_PREVIEW_ROWS;
  if (truncated) rawRows = rawRows.slice(0, MAX_PREVIEW_ROWS);

  const rows: BulkPreviewRow[] = [];

  const csvColumnMap: BulkColumnMap = { ...(suggestedColumnMap ?? {}), ...(params.columnMap ?? {}) };

  for (const { record, json, sourceIndex } of rawRows) {
    const { draft, issues } =
      params.format === "csv" && record ? rowFromCsvRecord(record, csvColumnMap, sourceIndex) : rowFromJsonObject(json, sourceIndex);

    const parsed = transactionSchema.safeParse(
      normalizeRawTransactionForImport({
        date: draft.date,
        amount: draft.amount,
        flow: draft.flow,
        category: draft.category,
        description: draft.description,
        scope: draft.scope,
      }),
    );

    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const msgs = [...issues, ...Object.values(flat.fieldErrors).flat().filter(Boolean)];
      rows.push({
        sourceIndex,
        status: "error",
        issues: msgs.length ? msgs : ["Validation failed"],
        fingerprint: "",
        transaction: null,
        raw: record,
      });
      stats.error += 1;
      continue;
    }

    const tx = parsed.data;
    const fp = fingerprintTransaction(tx.date, tx.amount, tx.description, tx.flow);
    if (fingerprintsInBatch.has(fp)) {
      rows.push({
        sourceIndex,
        status: "skipped_duplicate",
        issues: ["Duplicate of another row in this file (same date, amount, merchant key)"],
        fingerprint: fp,
        transaction: null,
        raw: record,
      });
      stats.skipped_duplicate += 1;
      continue;
    }
    fingerprintsInBatch.add(fp);

    const hasWarning = issues.length > 0;
    if (hasWarning) stats.warning += 1;
    else stats.ok += 1;

    rows.push({
      sourceIndex,
      status: hasWarning ? "warning" : "ok",
      issues,
      fingerprint: fp,
      transaction: {
        date: tx.date,
        amount: tx.amount,
        flow: tx.flow,
        category: tx.category,
        description: tx.description,
        scope: tx.scope,
        notes: tx.notes,
      },
      raw: record,
    });
  }

  return { rows, stats, truncated, rowWarningThreshold: WARN_ROW_THRESHOLD, suggestedColumnMap, csvHeaders };
}

