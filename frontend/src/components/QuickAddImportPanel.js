import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, CheckCircle2, AlertTriangle, XCircle, CopyMinus, PenLine, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";
import { HKD } from "../lib/format";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { cn } from "../lib/utils";

const COLUMN_STORAGE_KEY = "fa_import_column_overrides_v1";

function sniffFormat(fileName, text) {
  const n = (fileName || "").toLowerCase();
  if (n.endsWith(".csv")) return { format: "csv", ambiguous: false };
  if (n.endsWith(".json")) return { format: "json", ambiguous: false };
  const t = (text || "").trimStart().slice(0, 1);
  if (t === "{" || t === "[") return { format: "json", ambiguous: false };
  if (n.endsWith(".txt")) return { format: "csv", ambiguous: true };
  return { format: "csv", ambiguous: false };
}

function headerFingerprint(headers) {
  return (headers || []).join("\u001f");
}

function loadColumnOverrides(fp) {
  try {
    const raw = JSON.parse(localStorage.getItem(COLUMN_STORAGE_KEY) || "{}");
    return raw[fp] && typeof raw[fp] === "object" ? raw[fp] : {};
  } catch {
    return {};
  }
}

function saveColumnOverrides(fp, overrides) {
  try {
    const raw = JSON.parse(localStorage.getItem(COLUMN_STORAGE_KEY) || "{}");
    raw[fp] = overrides;
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(raw));
  } catch {
    /* ignore */
  }
}

function StatusIcon({ status }) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-moss shrink-0" aria-label="OK" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" aria-label="Warning" />;
  if (status === "skipped_duplicate") return <CopyMinus className="h-4 w-4 text-[color:var(--text-muted)] shrink-0" aria-label="Skipped duplicate" />;
  return <XCircle className="h-4 w-4 text-terracotta shrink-0" aria-label="Error" />;
}

export default function QuickAddImportPanel({ onImported, onCloseDialog }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const hydratedHeaderFpRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [rawText, setRawText] = useState("");
  const [format, setFormat] = useState("csv");
  const [formatAmbiguous, setFormatAmbiguous] = useState(false);
  const [columnOverrides, setColumnOverrides] = useState({});
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [txCount, setTxCount] = useState(null);
  const [mergeMode, setMergeMode] = useState("append");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importValidOnly, setImportValidOnly] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replacePhrase, setReplacePhrase] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const fetchCount = useCallback(() => {
    api
      .get("/transactions/count")
      .then((r) => setTxCount(typeof r.data?.count === "number" ? r.data.count : 0))
      .catch(() => setTxCount(null));
  }, []);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  const runPreview = useCallback(async () => {
    if (!rawText.trim()) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    setPreviewError("");
    try {
      const { data } = await api.post("/bulk-import/preview", {
        format,
        text: rawText,
        columnMap: Object.keys(columnOverrides).length ? columnOverrides : undefined,
      });
      setPreview(data);
    } catch (e) {
      setPreview(null);
      setPreviewError(formatApiError(e));
    } finally {
      setPreviewLoading(false);
    }
  }, [rawText, format, columnOverrides]);

  useEffect(() => {
    if (!rawText.trim() || !preview?.csvHeaders?.length) return;
    const fp = headerFingerprint(preview.csvHeaders);
    if (hydratedHeaderFpRef.current === fp) return;
    hydratedHeaderFpRef.current = fp;
    const saved = loadColumnOverrides(fp);
    if (Object.keys(saved).length) setColumnOverrides(saved);
  }, [preview, rawText]);

  useEffect(() => {
    const t = setTimeout(() => {
      void runPreview();
    }, 320);
    return () => clearTimeout(t);
  }, [runPreview]);

  const stats = preview?.stats;
  const rows = preview?.rows || [];
  const readyRows = useMemo(
    () => rows.filter((r) => (r.status === "ok" || r.status === "warning") && r.transaction),
    [rows],
  );
  const readyCount = readyRows.length;
  const errCount = stats?.error ?? 0;
  const skippedCount = stats?.skipped_duplicate ?? 0;
  const canImport =
    readyCount > 0 &&
    !previewLoading &&
    !applyLoading &&
    (errCount === 0 || importValidOnly);

  const csvHeaders = preview?.csvHeaders;

  const setOverride = (key, value) => {
    setColumnOverrides((prev) => {
      const next = { ...prev };
      if (value == null || value === "__none__") delete next[key];
      else next[key] = value;
      if (csvHeaders?.length) saveColumnOverrides(headerFingerprint(csvHeaders), next);
      return next;
    });
  };

  const onPickFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setPreview(null);
    setPreviewError("");
    setColumnOverrides({});
    hydratedHeaderFpRef.current = null;
    setImportValidOnly(false);
    const text = await file.text();
    setRawText(text);
    const sn = sniffFormat(file.name, text);
    setFormat(sn.format);
    setFormatAmbiguous(sn.ambiguous);
  };

  const resetLanding = () => {
    setFileName("");
    setRawText("");
    setPreview(null);
    setPreviewError("");
    setColumnOverrides({});
    hydratedHeaderFpRef.current = null;
    setFormatAmbiguous(false);
    setImportValidOnly(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const doApply = async () => {
    if (!canImport) return;
    const txs = readyRows.map((r) => r.transaction);
    setApplyLoading(true);
    try {
      const { data } = await api.post("/bulk-import/apply", {
        mode: mergeMode,
        transactions: txs,
        skipDuplicates,
      });
      const imported = data.imported ?? 0;
      const dup = data.skipped_duplicates ?? 0;
      toast.success(`Imported ${imported} transaction${imported === 1 ? "" : "s"}`, {
        description: dup ? `${dup} duplicate${dup === 1 ? "" : "s"} skipped` : undefined,
        action: {
          label: "View in Transactions",
          onClick: () => navigate("/transactions"),
        },
      });
      onImported && onImported({ imported, skipped_duplicates: dup });
      onCloseDialog && onCloseDialog();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setApplyLoading(false);
      setReplaceOpen(false);
      setReplacePhrase("");
    }
  };

  const onClickImport = () => {
    if (!canImport) return;
    if (mergeMode === "replace") {
      setReplacePhrase("");
      setReplaceOpen(true);
      return;
    }
    void doApply();
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void onPickFile(f);
  };

  const NONE = "__none__";
  const colSelect = (label, fieldKey) => {
    if (!csvHeaders?.length) return null;
    const v = columnOverrides[fieldKey] ?? preview?.suggestedColumnMap?.[fieldKey] ?? NONE;
    return (
      <div key={fieldKey} className="space-y-1">
        <Label className="text-[10px] text-[color:var(--text-secondary)]">{label}</Label>
        <Select value={v || NONE} onValueChange={(val) => setOverride(fieldKey, val)}>
          <SelectTrigger className="h-8 text-xs" data-testid={`import-map-${fieldKey}`}>
            <SelectValue placeholder="Column" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>(none)</SelectItem>
            {csvHeaders.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const afterCount =
    mergeMode === "replace"
      ? readyCount
      : (txCount ?? 0) + readyCount;

  const landing = !fileName && !rawText;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4 px-6 pb-5 pt-1" data-testid="quick-add-import-panel">
        {landing && (
          <div className="rounded-xl border border-sand-200 bg-sand-50/80 p-4 space-y-3">
            <p className="text-sm text-[color:var(--text-secondary)] leading-relaxed">
              Import from a bank export (<strong className="text-[color:var(--text-primary)]">CSV</strong> or{" "}
              <strong className="text-[color:var(--text-primary)]">JSON</strong>). You will review rows before anything
              is saved.
            </p>
            <div
              role="button"
              tabIndex={0}
              aria-label="Drop zone for bank export file"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              className={cn(
                "rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors cursor-pointer",
                dragActive ? "border-moss bg-moss-soft" : "border-sand-300 bg-white",
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-moss mb-2 opacity-80" aria-hidden />
              <div className="text-sm font-medium text-[color:var(--text-primary)]">Drag and drop a file</div>
              <div className="text-xs text-[color:var(--text-muted)] mt-1">or click to choose · .csv, .json</div>
            </div>
            <div>
              <Label htmlFor="fa-import-file" className="sr-only">
                Choose bank export file
              </Label>
              <input
                ref={fileInputRef}
                id="fa-import-file"
                type="file"
                accept=".csv,.json,.txt,application/json,text/csv,text/plain"
                className="hidden"
                data-testid="import-file-input"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onPickFile(f);
                }}
              />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <a
                href="/import-template.csv"
                download
                className="text-moss underline-offset-2 hover:underline"
                data-testid="import-template-csv"
              >
                Download CSV template
              </a>
              <a
                href="/import-template.json"
                download
                className="text-moss underline-offset-2 hover:underline"
                data-testid="import-template-json"
              >
                Download JSON template
              </a>
            </div>
          </div>
        )}

        {!landing && (
          <>
            {formatAmbiguous && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sand-200 bg-white px-3 py-2 text-xs">
                <span className="text-[color:var(--text-secondary)]">This file may be CSV or JSON. Parser:</span>
                <div className="flex p-0.5 bg-sand-100 rounded-md">
                  <button
                    type="button"
                    className={cn(
                      "px-2 py-1 rounded",
                      format === "csv" ? "bg-white shadow-sm font-medium" : "text-[color:var(--text-secondary)]",
                    )}
                    onClick={() => setFormat("csv")}
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "px-2 py-1 rounded",
                      format === "json" ? "bg-white shadow-sm font-medium" : "text-[color:var(--text-secondary)]",
                    )}
                    onClick={() => setFormat("json")}
                  >
                    JSON
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-[color:var(--text-secondary)]" title={fileName}>
                <span className="font-medium text-[color:var(--text-primary)]">{fileName}</span>
                <span className="mx-1.5">·</span>
                {format.toUpperCase()}
              </span>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs shrink-0" onClick={resetLanding}>
                Remove file
              </Button>
            </div>

            {preview?.truncated && (
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200/80 rounded-md px-3 py-2">
                Preview is capped at {rows.length.toLocaleString()} rows. Trim the file or split into chunks to import
                the rest.
              </div>
            )}
            {stats && rows.length >= (preview?.rowWarningThreshold ?? 2000) && !preview?.truncated && (
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200/80 rounded-md px-3 py-2">
                Large file ({rows.length.toLocaleString()} rows). Import may take a moment.
              </div>
            )}

            {format === "csv" && csvHeaders?.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5 w-full border-sand-200">
                    <PenLine className="h-3.5 w-3.5" />
                    Column mapping (CSV)
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  <p className="text-[10px] text-[color:var(--text-muted)]">
                    If headers do not match automatically, map columns here. Your choices are saved for this header
                    layout on this device.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {colSelect("Date", "date")}
                    {colSelect("Amount", "amount")}
                    {colSelect("Description / payee", "description")}
                    {colSelect("Category (optional)", "category")}
                    {colSelect("Account / scope (optional)", "scope")}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {previewLoading && (
              <div className="flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Parsing preview…
              </div>
            )}
            {previewError && (
              <div className="text-xs text-terracotta bg-terracotta-soft border border-terracotta/20 rounded-md px-3 py-2">
                {previewError}
              </div>
            )}

            {preview && !previewLoading && (
              <>
                <ScrollArea className="h-[240px] rounded-md border border-sand-200" type="always">
                  <table className="w-full text-left text-[11px]">
                    <thead className="sticky top-0 z-[1] bg-sand-100 border-b border-sand-200">
                      <tr>
                        <th className="w-8 p-2" scope="col" />
                        <th className="p-2 font-medium" scope="col">
                          Date
                        </th>
                        <th className="p-2 font-medium" scope="col">
                          Amount
                        </th>
                        <th className="p-2 font-medium min-w-[100px]" scope="col">
                          Payee
                        </th>
                        <th className="p-2 font-medium" scope="col">
                          Category
                        </th>
                        <th className="p-2 font-medium" scope="col">
                          Acct
                        </th>
                        <th className="w-8 p-2" scope="col" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr
                          key={r.sourceIndex}
                          className={cn(
                            "border-b border-sand-100",
                            r.status === "error" && "bg-terracotta-soft/40",
                            r.status === "skipped_duplicate" && "opacity-60",
                          )}
                        >
                          <td className="p-1.5 align-middle">
                            <StatusIcon status={r.status} />
                          </td>
                          <td className="p-1.5 font-num align-middle whitespace-nowrap">
                            {r.transaction?.date ?? "—"}
                          </td>
                          <td className="p-1.5 font-num align-middle whitespace-nowrap">
                            {r.transaction?.amount != null ? HKD(r.transaction.amount) : "—"}
                          </td>
                          <td className="p-1.5 align-middle max-w-[140px] truncate" title={r.transaction?.description}>
                            {r.transaction?.description ?? "—"}
                          </td>
                          <td className="p-1.5 align-middle truncate max-w-[90px]" title={r.transaction?.category}>
                            {r.transaction?.category ?? "—"}
                          </td>
                          <td className="p-1.5 align-middle uppercase text-[10px]">
                            {r.transaction?.scope?.slice(0, 3) ?? "—"}
                          </td>
                          <td className="p-1 align-middle text-center">
                            {r.issues?.length > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="text-moss underline text-[10px]"
                                    aria-label={`Row ${r.sourceIndex + 1} issues`}
                                  >
                                    ?
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[240px] text-[10px] leading-snug">
                                  {r.issues.join(" · ")}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>

                <div className="text-[11px] text-[color:var(--text-secondary)]">
                  <strong className="text-[color:var(--text-primary)]">{readyCount}</strong> rows ready ·{" "}
                  <strong>{skippedCount}</strong> skipped · <strong className={errCount ? "text-terracotta" : ""}>{errCount}</strong>{" "}
                  need fix
                </div>

                {errCount > 0 && (
                  <label className="flex items-start gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={importValidOnly}
                      onCheckedChange={(c) => setImportValidOnly(Boolean(c))}
                      data-testid="import-valid-only"
                      className="mt-0.5"
                    />
                    <span>Import valid rows only (skip rows that need a fix)</span>
                  </label>
                )}

                <div className="rounded-lg border border-sand-200 bg-white p-3 space-y-3">
                  <div className="text-xs font-medium text-[color:var(--text-primary)]">How should this import apply?</div>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="fa-import-merge"
                      checked={mergeMode === "append"}
                      onChange={() => setMergeMode("append")}
                      data-testid="import-mode-append"
                    />
                    <span>Add to my transactions (recommended)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="fa-import-merge"
                      checked={mergeMode === "replace"}
                      onChange={() => setMergeMode("replace")}
                      data-testid="import-mode-replace"
                    />
                    <span className="text-terracotta font-medium">Replace all transactions</span>
                  </label>
                  <p className="text-[10px] text-[color:var(--text-muted)] leading-relaxed">
                    You have{" "}
                    <strong>{txCount == null ? "…" : txCount.toLocaleString()}</strong> transactions today. After this
                    import: <strong>{afterCount.toLocaleString()}</strong> total
                    {mergeMode === "replace" ? " (existing rows are removed first)." : "."}
                  </p>
                  <label className="flex items-start gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={skipDuplicates}
                      onCheckedChange={(c) => setSkipDuplicates(Boolean(c))}
                      data-testid="import-skip-dupes"
                      className="mt-0.5"
                    />
                    <span>Skip rows that match an existing transaction (same date, amount, and payee key)</span>
                  </label>
                </div>
              </>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 pt-1">
          {!landing && preview && !previewLoading && (
            <Button
              type="button"
              className="bg-moss hover:bg-moss-hover text-white"
              disabled={!canImport}
              data-testid="import-apply"
              onClick={onClickImport}
            >
              {applyLoading ? (
                "Importing…"
              ) : (
                <>
                  Import {readyCount} row{readyCount === 1 ? "" : "s"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <AlertDialog
        open={replaceOpen}
        onOpenChange={(open) => {
          setReplaceOpen(open);
          if (!open) setReplacePhrase("");
        }}
      >
        <AlertDialogContent className="bg-white" data-testid="import-replace-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Replace all transactions?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[color:var(--text-secondary)]">
              This permanently deletes your existing transactions and replaces them with the {readyCount} row
              {readyCount === 1 ? "" : "s"} in this import. This cannot be undone from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="fa-replace-phrase" className="text-xs">
              Type <strong>REPLACE</strong> to confirm
            </Label>
            <Input
              id="fa-replace-phrase"
              value={replacePhrase}
              onChange={(e) => setReplacePhrase(e.target.value)}
              placeholder="REPLACE"
              autoComplete="off"
              data-testid="import-replace-phrase"
            />
          </div>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel type="button">Back</AlertDialogCancel>
            <Button
              type="button"
              className="bg-terracotta hover:bg-terracotta/90 text-white"
              disabled={replacePhrase !== "REPLACE" || applyLoading}
              data-testid="import-replace-submit"
              onClick={() => void doApply()}
            >
              {applyLoading ? "Replacing…" : "Confirm replace"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
