import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Sparkles, Briefcase, User, Zap, History, CheckCircle2, Upload, ChevronDown, Loader2 } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { HKD } from "../lib/format";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import QuickAddImportPanel from "./QuickAddImportPanel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const ACCOUNT = [
  { value: "personal", label: "Personal", icon: User },
  { value: "business", label: "Business", icon: Briefcase },
];

const LAST_ACCOUNT_KEY = "fa_last_account";

/** Mirrors `backend/src/types.ts` DEFAULT_CATEGORIES — baseline chips in Quick add. */
const DEFAULT_CATEGORY_OPTIONS = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Subscription",
  "Business Expense",
  "Uncategorized",
];

const DEFAULT_CATEGORY_SET = new Set(DEFAULT_CATEGORY_OPTIONS);

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function autoSourceDescription(source) {
  if (source === "history") return "Based on how you categorized this merchant before.";
  if (source === "keyword") return "Matched from everyday merchant keywords (e.g. MTR → Transport).";
  return "No strong match — Uncategorized.";
}

/** Body for POST /api/transactions (matches backend transactionSchema). */
function buildCreateTransactionBody({ merchant, amount, category, account, note, flow }) {
  const amt = typeof amount === "number" ? amount : parseFloat(String(amount));
  const flowVal = flow === "income" ? "income" : "expense";
  return {
    date: todayIsoDate(),
    amount: Math.abs(amt),
    flow: flowVal,
    category: (category && String(category).trim()) || "Uncategorized",
    description: String(merchant || "").trim(),
    notes: note && String(note).trim() ? String(note).trim() : undefined,
    scope: account === "business" ? "business" : "personal",
  };
}

function CategoryPicker({
  category,
  setCategory,
  categoryMeta,
  setCategoryMeta,
  autoCatBusy,
  autoCategorizeDisabled,
  onAutoCategorize,
  allCategoriesSorted,
  frequentCustom,
}) {
  const [helpOpen, setHelpOpen] = useState(false);

  const pick = (c) => {
    setCategory(c);
    setCategoryMeta(null);
  };

  return (
    <div className="space-y-3 rounded-xl border border-sand-200/90 bg-sand-50/50 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 border-moss/30 bg-white text-moss hover:bg-moss-soft hover:text-moss shrink-0 gap-1.5"
          data-testid="auto-categorize"
          disabled={autoCatBusy || autoCategorizeDisabled}
          onClick={onAutoCategorize}
        >
          {autoCatBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Auto categorize
        </Button>
        {categoryMeta && (
          <p className="text-[10px] text-[color:var(--text-muted)] leading-snug flex-1">{autoSourceDescription(categoryMeta.source)}</p>
        )}
      </div>

      <div>
        <Label className="text-[10px] uppercase tracking-wide text-[color:var(--text-muted)] mb-1.5 block">Basics</Label>
        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_CATEGORY_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => pick(c)}
              data-testid={`cat-${c.replace(/\s+/g, "-").toLowerCase()}`}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs border transition-colors",
                category === c ? "bg-moss text-white border-moss" : "bg-white text-[color:var(--text-secondary)] border-sand-200 hover:border-moss",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {frequentCustom.length > 0 && (
        <div>
          <Label className="text-[10px] uppercase tracking-wide text-[color:var(--text-muted)] mb-1.5 block">You use often</Label>
          <div className="flex flex-wrap gap-1.5">
            {frequentCustom.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => pick(c)}
                data-testid={`cat-freq-${c.replace(/\s+/g, "-").toLowerCase()}`}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs border transition-colors",
                  category === c ? "bg-moss text-white border-moss" : "bg-white text-[color:var(--text-secondary)] border-sand-200 hover:border-moss",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="fa-cat-select" className="text-[10px] uppercase tracking-wide text-[color:var(--text-muted)]">
          All categories
        </Label>
        <Select value={category} onValueChange={(v) => pick(v)}>
          <SelectTrigger id="fa-cat-select" className="h-9 text-xs bg-white" data-testid="category-select">
            <SelectValue placeholder="Choose category" />
          </SelectTrigger>
          <SelectContent className="max-h-[220px]">
            {allCategoriesSorted.map((c) => (
              <SelectItem key={c} value={c} className="text-xs">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Collapsible open={helpOpen} onOpenChange={setHelpOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-left text-[11px] text-moss hover:text-moss-hover py-0.5"
          >
            <span className="font-medium">How categorization works</span>
            <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", helpOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 text-[10px] leading-relaxed text-[color:var(--text-secondary)] space-y-2">
          <p>
            <strong className="text-[color:var(--text-primary)]">Form:</strong> Kori does not change the category while you type. Choose a label below, or tap{" "}
            <strong className="text-[color:var(--text-primary)]">Auto categorize</strong> to run the same logic the server uses for imports and insights.
          </p>
          <p>
            <strong className="text-[color:var(--text-primary)]">Smart:</strong> Your sentence is parsed for merchant and amount. Category still follows{" "}
            <strong className="text-[color:var(--text-primary)]">your choice</strong> or <strong className="text-[color:var(--text-primary)]">Auto categorize</strong>, which reads the parsed merchant text.
          </p>
          <p className="text-[color:var(--text-muted)]">
            Order of automation: (1) categories you already used for the same merchant, (2) light keyword rules (e.g. Netflix → Subscription), (3) Uncategorized.
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default function QuickAddDialog({ open, onClose, onSaved }) {
  const [mode, setMode] = useState("form"); // smart | form | import
  const [smartText, setSmartText] = useState("");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState(() => localStorage.getItem(LAST_ACCOUNT_KEY) || "personal");
  const [category, setCategory] = useState("Uncategorized");
  const [note, setNote] = useState("");
  const [type, setType] = useState("expense");
  const [recents, setRecents] = useState([]);
  const [usualHint, setUsualHint] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  const [frequentCategories, setFrequentCategories] = useState([]);
  const [categoryMeta, setCategoryMeta] = useState(null);
  const [autoCatBusy, setAutoCatBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const firstFieldRef = useRef(null);

  const frequentCustom = useMemo(
    () => frequentCategories.filter((c) => c && !DEFAULT_CATEGORY_SET.has(c)),
    [frequentCategories],
  );

  const allCategoriesSorted = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const c of [...DEFAULT_CATEGORY_OPTIONS, ...frequentCategories, ...allCategories]) {
      if (!c || seen.has(c)) continue;
      seen.add(c);
      out.push(c);
    }
    out.sort((a, b) => a.localeCompare(b));
    return out;
  }, [allCategories, frequentCategories]);

  const loadCategoryContext = useCallback(() => {
    Promise.all([api.get("/categories"), api.get("/transactions?limit=400")])
      .then(([catRes, txRes]) => {
        setAllCategories(Array.isArray(catRes.data) ? catRes.data : []);
        const txs = Array.isArray(txRes.data) ? txRes.data : [];
        const counts = new Map();
        for (const tx of txs) {
          const c = tx.category;
          if (!c) continue;
          counts.set(c, (counts.get(c) ?? 0) + 1);
        }
        const frequent = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 10);
        setFrequentCategories(frequent);
      })
      .catch(() => {});
  }, []);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setMode("form");
      setSmartText("");
      setMerchant("");
      setAmount("");
      setAccount(localStorage.getItem(LAST_ACCOUNT_KEY) || "personal");
      setCategory("Uncategorized");
      setNote("");
      setType("expense");
      setError("");
      setUsualHint(null);
      setCategoryMeta(null);
      setAllCategories([]);
      setFrequentCategories([]);
    } else {
      api.get("/transactions/recents").then((r) => setRecents(r.data)).catch(() => {});
      loadCategoryContext();
      setTimeout(() => firstFieldRef.current?.focus(), 50);
    }
  }, [open, loadCategoryContext]);

  // Usual amount / category hint (does not change category automatically)
  useEffect(() => {
    if (mode !== "form" || !merchant.trim()) {
      setUsualHint(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const usual = await api.get(`/transactions/usual?merchant=${encodeURIComponent(merchant.trim())}`);
        if (usual.data.typical) setUsualHint(usual.data);
        else setUsualHint(null);
      } catch {
        setUsualHint(null);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [merchant, mode]);

  const handleAutoCategorize = async () => {
    setAutoCatBusy(true);
    try {
      if (mode === "smart") {
        if (!smartText.trim()) {
          toast.error("Write something first");
          return;
        }
        const { data } = await api.post("/parse-transaction", { text: smartText.trim() });
        const next = data.category || "Uncategorized";
        setCategory(next);
        setCategoryMeta({ source: data.source || "default" });
        toast.success(`Category set to ${next}`);
      } else {
        if (!merchant.trim()) {
          toast.error("Add a merchant first");
          return;
        }
        const { data } = await api.post("/suggest-category", { merchant, note });
        const next = data.category || data.suggestions?.[0] || "Uncategorized";
        setCategory(next);
        setCategoryMeta({ source: data.source || "default" });
        toast.success(`Category set to ${next}`);
      }
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setAutoCatBusy(false);
    }
  };

  const applyRecent = (r) => {
    setMerchant(r.merchant);
    setAmount(String(r.typical_amount));
    setCategory(r.category);
    setCategoryMeta(null);
    setAccount(r.account);
    setMode("form");
    setTimeout(() => {
      document.querySelector('[data-testid="input-amount"]')?.focus();
      document.querySelector('[data-testid="input-amount"]')?.select();
    }, 50);
  };

  const smartSubmit = async () => {
    if (!smartText.trim()) return;
    setError("");
    try {
      const { data } = await api.post("/parse-transaction", { text: smartText });
      if (!data.merchant || !data.amount) {
        setMerchant(data.merchant || "");
        setAmount(data.amount ? String(data.amount) : "");
        setNote(data.note || "");
        setMode("form");
        setError("Need both a merchant and amount. We've filled what we could.");
        return;
      }
      setSaving(true);
      await api.post(
        "/transactions",
        buildCreateTransactionBody({
          merchant: data.merchant,
          amount: parseFloat(data.amount),
          category,
          account,
          note: data.note,
          flow: type,
        }),
      );
      localStorage.setItem(LAST_ACCOUNT_KEY, account);
      toast.success(`Added ${data.merchant}`, { description: HKD(data.amount) });
      onSaved && onSaved();
      onClose();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const saveForm = async () => {
    setError("");
    if (!merchant.trim()) {
      setError("Merchant is required");
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError("Enter a valid amount greater than 0");
      return;
    }
    setSaving(true);
    try {
      await api.post(
        "/transactions",
        buildCreateTransactionBody({ merchant: merchant.trim(), amount: amt, category, account, note, flow: type }),
      );
      localStorage.setItem(LAST_ACCOUNT_KEY, account);
      toast.success("Transaction added", { description: `${merchant} · ${HKD(amt)}` });
      onSaved && onSaved();
      onClose();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (mode === "import") return;
      if (mode === "smart") smartSubmit();
      else saveForm();
    }
  };

  const modeToggle = (
    <div className="flex p-1 bg-sand-100 rounded-lg text-sm" data-testid="mode-toggle">
      <button
        type="button"
        onClick={() => setMode("form")}
        data-testid="mode-form"
        className={cn(
          "flex-1 py-1.5 rounded-md transition-colors",
          mode === "form" ? "bg-white text-[color:var(--text-primary)] shadow-sm font-medium" : "text-[color:var(--text-secondary)]",
        )}
      >
        Form
      </button>
      <button
        type="button"
        onClick={() => setMode("smart")}
        data-testid="mode-smart"
        className={cn(
          "flex-1 py-1.5 rounded-md inline-flex items-center justify-center gap-1 transition-colors",
          mode === "smart" ? "bg-white text-[color:var(--text-primary)] shadow-sm font-medium" : "text-[color:var(--text-secondary)]",
        )}
      >
        <Zap size={13} /> Smart
      </button>
      <button
        type="button"
        onClick={() => setMode("import")}
        data-testid="mode-import"
        className={cn(
          "flex-1 py-1.5 rounded-md inline-flex items-center justify-center gap-1 transition-colors",
          mode === "import" ? "bg-white text-[color:var(--text-primary)] shadow-sm font-medium" : "text-[color:var(--text-secondary)]",
        )}
      >
        <Upload size={13} /> Import
      </button>
    </div>
  );

  const categoryPickerProps = {
    category,
    setCategory,
    categoryMeta,
    setCategoryMeta,
    autoCatBusy,
    autoCategorizeDisabled: mode === "smart" ? !smartText.trim() : !merchant.trim(),
    onAutoCategorize: handleAutoCategorize,
    allCategoriesSorted,
    frequentCustom,
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white" data-testid="quick-add-dialog" aria-describedby={undefined}>
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-sand-200">
          <DialogTitle className="font-heading text-lg flex items-center gap-2">
            <Sparkles size={16} className="text-moss" /> Quick add
            <span className="ml-auto text-[10px] font-normal text-[color:var(--text-muted)] bg-sand-100 px-2 py-0.5 rounded" data-testid="quick-add-kbd-hint">
              {mode === "import" ? "⌘ N · Review rows, then Import" : "⌘ N · Enter to save"}
            </span>
          </DialogTitle>
        </DialogHeader>

        {mode === "smart" && (
          <div className="px-6 py-5 space-y-4 max-h-[min(72vh,640px)] overflow-y-auto" onKeyDown={handleKeyDown}>
            {modeToggle}

            <div>
              <Label className="text-xs text-[color:var(--text-secondary)] mb-1.5 block flex items-center gap-1.5">
                <Sparkles size={11} className="text-moss" /> Type it naturally
              </Label>
              <Input
                ref={firstFieldRef}
                value={smartText}
                onChange={(e) => setSmartText(e.target.value)}
                data-testid="input-smart"
                placeholder="Starbucks 45 coffee"
                className="text-lg font-num"
              />
              <div className="text-[10px] text-[color:var(--text-muted)] mt-1.5">
                Try:{" "}
                <button type="button" className="text-moss" onClick={() => setSmartText("Uber 120")} data-testid="smart-ex-1">
                  Uber 120
                </button>{" "}
                ·{" "}
                <button type="button" className="text-moss" onClick={() => setSmartText("ParkNShop 340 weekly groceries")} data-testid="smart-ex-2">
                  ParkNShop 340 weekly groceries
                </button>
              </div>
            </div>

            <CategoryPicker {...categoryPickerProps} />

            {recents.length > 0 && (
              <div>
                <Label className="text-xs text-[color:var(--text-secondary)] mb-2 block flex items-center gap-1.5">
                  <History size={11} /> Tap a recent — we&apos;ll prefill
                </Label>
                <div className="grid grid-cols-3 gap-2" data-testid="recent-tiles">
                  {recents.map((r) => (
                    <button
                      key={r.merchant}
                      type="button"
                      onClick={() => applyRecent(r)}
                      data-testid={`recent-tile-${r.merchant.replace(/\s+/g, "-").toLowerCase()}`}
                      className="text-left p-2.5 rounded-lg border border-sand-200 hover:border-moss hover:bg-moss-soft transition-colors"
                    >
                      <div className="text-xs font-medium truncate">{r.merchant}</div>
                      <div className="text-[10px] text-[color:var(--text-secondary)] font-num mt-0.5">
                        {HKD(r.typical_amount)} · {r.category}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs text-terracotta bg-terracotta-soft border border-terracotta/20 rounded-md px-3 py-2" data-testid="smart-error">
                {error}
              </div>
            )}
          </div>
        )}

        {mode === "form" && (
          <div className="px-6 py-5 space-y-4 max-h-[min(72vh,640px)] overflow-y-auto" onKeyDown={handleKeyDown}>
            {modeToggle}

            <div className="flex p-1 bg-sand-100 rounded-lg text-sm" data-testid="type-toggle">
              {["expense", "income"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  data-testid={`type-${t}`}
                  className={cn(
                    "flex-1 py-1.5 rounded-md transition-colors",
                    type === t
                      ? t === "income"
                        ? "bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-200/90 font-medium"
                        : "bg-rose-50 text-rose-950 shadow-sm ring-1 ring-rose-200/90 font-medium"
                      : t === "income"
                        ? "text-emerald-800/75 hover:bg-emerald-50/70"
                        : "text-rose-900/70 hover:bg-rose-50/60",
                  )}
                >
                  {t === "expense" ? "Expense" : "Income"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-3">
                <Label className="text-xs text-[color:var(--text-secondary)] mb-1.5 block">Merchant</Label>
                <Input
                  ref={firstFieldRef}
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  data-testid="input-merchant"
                  placeholder="e.g. Starbucks"
                  className="font-sans"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-[color:var(--text-secondary)] mb-1.5 block">Amount (HK$)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  data-testid="input-amount"
                  placeholder="0"
                  className="font-num text-lg"
                />
              </div>
            </div>

            {usualHint && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setAmount(String(usualHint.typical))}
                  data-testid="usual-hint"
                  className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-moss-soft text-moss text-xs hover:bg-moss hover:text-white transition-colors"
                >
                  <CheckCircle2 size={14} />
                  <span>
                    You usually pay <span className="font-num font-semibold">{HKD(usualHint.typical)}</span> at {merchant} ({usualHint.count}×)
                  </span>
                  <span className="ml-auto font-medium">Use this →</span>
                </button>
                {usualHint.category && (
                  <button
                    type="button"
                    data-testid="usual-category-hint"
                    onClick={() => {
                      setCategory(usualHint.category);
                      setCategoryMeta(null);
                    }}
                    className="w-full text-left p-2 rounded-lg border border-sand-200 text-xs text-[color:var(--text-secondary)] hover:border-moss hover:bg-moss-soft transition-colors"
                  >
                    Usual category: <span className="font-medium text-[color:var(--text-primary)]">{usualHint.category}</span>
                    <span className="text-moss ml-1">Tap to use</span>
                  </button>
                )}
              </div>
            )}

            <div>
              <Label className="text-xs text-[color:var(--text-secondary)] mb-1.5 block">Account</Label>
              <div className="flex gap-2">
                {ACCOUNT.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAccount(value)}
                    data-testid={`account-${value}`}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm transition-colors ${
                      account === value
                        ? "border-moss bg-moss-soft text-moss font-medium"
                        : "border-sand-200 text-[color:var(--text-secondary)] hover:bg-sand-100"
                    }`}
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
            </div>

            <CategoryPicker {...categoryPickerProps} />

            {recents.length > 0 && (
              <div>
                <Label className="text-xs text-[color:var(--text-secondary)] mb-2 block flex items-center gap-1.5">
                  <History size={11} /> Type a recent — we&apos;ll prefill
                </Label>
                <div className="grid grid-cols-3 gap-2" data-testid="form-recent-tiles">
                  {recents.map((r) => (
                    <button
                      key={`${r.merchant}-${r.category}`}
                      type="button"
                      onClick={() => applyRecent(r)}
                      data-testid={`form-recent-${String(r.merchant).replace(/\s+/g, "-").toLowerCase()}`}
                      className="text-left p-2.5 rounded-lg border border-sand-200 hover:border-moss hover:bg-moss-soft transition-colors"
                    >
                      <div className="text-xs font-medium truncate">{r.merchant}</div>
                      <div className="text-[10px] text-[color:var(--text-secondary)] font-num mt-0.5">
                        {HKD(r.typical_amount)} · {r.category}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs text-[color:var(--text-secondary)] mb-1.5 block">Note (optional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} data-testid="input-note" placeholder="Lunch with team" />
            </div>

            {error && (
              <div className="text-xs text-terracotta bg-terracotta-soft border border-terracotta/20 rounded-md px-3 py-2" data-testid="quick-add-error">
                {error}
              </div>
            )}
          </div>
        )}

        {mode === "import" && (
          <div className="pb-2">
            <div className="px-6 pt-4">{modeToggle}</div>
            <QuickAddImportPanel onImported={() => onSaved && onSaved()} onCloseDialog={onClose} />
          </div>
        )}

        <div className="px-6 py-4 bg-sand-50 border-t border-sand-200 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} data-testid="quick-add-cancel">
            Cancel
          </Button>
          {mode === "smart" ? (
            <Button
              onClick={smartSubmit}
              disabled={saving || !smartText.trim()}
              data-testid="smart-save"
              className="bg-moss hover:bg-moss-hover text-white"
            >
              {saving ? "Saving..." : "Save"} <span className="text-[10px] opacity-75 ml-1.5">↵</span>
            </Button>
          ) : mode === "form" ? (
            <Button onClick={saveForm} disabled={saving} data-testid="quick-add-save" className="bg-moss hover:bg-moss-hover text-white">
              {saving ? "Saving..." : "Save transaction"} <span className="text-[10px] opacity-75 ml-1.5">↵</span>
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
