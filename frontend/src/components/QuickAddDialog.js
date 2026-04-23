import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Sparkles, Briefcase, User, Zap, History, CheckCircle2 } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { HKD } from "../lib/format";
import { toast } from "sonner";

const ACCOUNT = [
  { value: "personal", label: "Personal", icon: User },
  { value: "business", label: "Business", icon: Briefcase },
];

const LAST_ACCOUNT_KEY = "fa_last_account";

// Smart time-of-day bias
function timeBiasedDefault() {
  const h = new Date().getHours();
  if (h < 10) return ["Transport", "Food & Dining"];
  if (h < 14) return ["Food & Dining", "Groceries"];
  if (h < 18) return ["Food & Dining", "Shopping"];
  return ["Food & Dining", "Entertainment"];
}

export default function QuickAddDialog({ open, onClose, onSaved }) {
  const [mode, setMode] = useState("smart"); // smart | form
  const [smartText, setSmartText] = useState("");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState(() => localStorage.getItem(LAST_ACCOUNT_KEY) || "personal");
  const [category, setCategory] = useState("Other");
  const [suggestions, setSuggestions] = useState(timeBiasedDefault());
  const [note, setNote] = useState("");
  const [type, setType] = useState("expense");
  const [recents, setRecents] = useState([]);
  const [usualHint, setUsualHint] = useState(null); // {typical, count, category}
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const firstFieldRef = useRef(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setMode("smart"); setSmartText("");
      setMerchant(""); setAmount("");
      setAccount(localStorage.getItem(LAST_ACCOUNT_KEY) || "personal");
      setCategory("Other"); setSuggestions(timeBiasedDefault()); setNote("");
      setType("expense"); setError(""); setUsualHint(null);
    } else {
      // Load recents on open
      api.get("/transactions/recents").then(r => setRecents(r.data)).catch(() => {});
      setTimeout(() => firstFieldRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced category suggestion + usual-amount lookup in form mode
  useEffect(() => {
    if (mode !== "form" || !merchant.trim()) { setUsualHint(null); return; }
    const t = setTimeout(async () => {
      try {
        const [sug, usual] = await Promise.all([
          api.post("/suggest-category", { merchant, note }),
          api.get(`/transactions/usual?merchant=${encodeURIComponent(merchant.trim())}`),
        ]);
        setSuggestions(sug.data.suggestions || []);
        if (sug.data.suggestions?.[0] && category === "Other") setCategory(sug.data.suggestions[0]);
        if (usual.data.typical) {
          setUsualHint(usual.data);
          if (usual.data.category && category === "Other") setCategory(usual.data.category);
        } else {
          setUsualHint(null);
        }
      } catch {}
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [merchant, note, mode]);

  const applyRecent = (r) => {
    setMerchant(r.merchant);
    setAmount(String(r.typical_amount));
    setCategory(r.category);
    setAccount(r.account);
    setMode("form");
    setTimeout(() => {
      document.querySelector('[data-testid="input-amount"]')?.focus();
      document.querySelector('[data-testid="input-amount"]')?.select();
    }, 50);
  };

  const smartParse = async () => {
    if (!smartText.trim()) return;
    try {
      const { data } = await api.post("/parse-transaction", { text: smartText });
      setMerchant(data.merchant || "");
      setAmount(data.amount ? String(data.amount) : "");
      setCategory(data.category || "Other");
      setSuggestions(data.suggestions || timeBiasedDefault());
      setNote(data.note || "");
      setMode("form");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const smartSubmit = async () => {
    if (!smartText.trim()) return;
    setError("");
    try {
      const { data } = await api.post("/parse-transaction", { text: smartText });
      if (!data.merchant || !data.amount) {
        setMerchant(data.merchant || ""); setAmount(data.amount ? String(data.amount) : "");
        setCategory(data.category || "Other"); setNote(data.note || "");
        setMode("form");
        setError("Need both a merchant and amount. We've filled what we could.");
        return;
      }
      setSaving(true);
      await api.post("/transactions", {
        merchant: data.merchant, amount: parseFloat(data.amount), type, category: data.category,
        account, note: data.note,
      });
      localStorage.setItem(LAST_ACCOUNT_KEY, account);
      toast.success(`Added ${data.merchant}`, { description: HKD(data.amount) });
      onSaved && onSaved();
      onClose();
    } catch (e) { setError(formatApiError(e)); }
    finally { setSaving(false); }
  };

  const saveForm = async () => {
    setError("");
    if (!merchant.trim()) { setError("Merchant is required"); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount greater than 0"); return; }
    setSaving(true);
    try {
      await api.post("/transactions", { merchant: merchant.trim(), amount: amt, type, category, account, note });
      localStorage.setItem(LAST_ACCOUNT_KEY, account);
      toast.success("Transaction added", { description: `${merchant} · ${HKD(amt)}` });
      onSaved && onSaved();
      onClose();
    } catch (e) { setError(formatApiError(e)); }
    finally { setSaving(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (mode === "smart") smartSubmit();
      else saveForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white" data-testid="quick-add-dialog" aria-describedby={undefined}>
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-sand-200">
          <DialogTitle className="font-heading text-lg flex items-center gap-2">
            <Sparkles size={16} className="text-moss" /> Quick add
            <span className="ml-auto text-[10px] font-normal text-[color:var(--text-muted)] bg-sand-100 px-2 py-0.5 rounded" data-testid="quick-add-kbd-hint">
              ⌘ N · Enter to save
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Smart mode = NLP */}
        {mode === "smart" && (
          <div className="px-6 py-5 space-y-4" onKeyDown={handleKeyDown}>
            <div className="flex p-1 bg-sand-100 rounded-lg text-sm" data-testid="mode-toggle">
              <button type="button" onClick={() => setMode("smart")} data-testid="mode-smart"
                className="flex-1 py-1.5 rounded-md bg-white text-[color:var(--text-primary)] shadow-sm font-medium">
                <Zap size={13} className="inline mr-1.5" /> Smart
              </button>
              <button type="button" onClick={() => setMode("form")} data-testid="mode-form"
                className="flex-1 py-1.5 rounded-md text-[color:var(--text-secondary)]">
                Form
              </button>
            </div>

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
                Try: <button className="text-moss" onClick={() => setSmartText("Uber 120")} data-testid="smart-ex-1">Uber 120</button> · <button className="text-moss" onClick={() => setSmartText("ParkNShop 340 weekly groceries")} data-testid="smart-ex-2">ParkNShop 340 weekly groceries</button>
              </div>
            </div>

            {/* Recent tiles */}
            {recents.length > 0 && (
              <div>
                <Label className="text-xs text-[color:var(--text-secondary)] mb-2 block flex items-center gap-1.5">
                  <History size={11} /> Tap a recent — we'll prefill
                </Label>
                <div className="grid grid-cols-3 gap-2" data-testid="recent-tiles">
                  {recents.map(r => (
                    <button key={r.merchant} onClick={() => applyRecent(r)} data-testid={`recent-tile-${r.merchant.replace(/\s+/g,'-').toLowerCase()}`}
                      className="text-left p-2.5 rounded-lg border border-sand-200 hover:border-moss hover:bg-moss-soft transition-colors">
                      <div className="text-xs font-medium truncate">{r.merchant}</div>
                      <div className="text-[10px] text-[color:var(--text-secondary)] font-num mt-0.5">{HKD(r.typical_amount)} · {r.category}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <div className="text-xs text-terracotta bg-terracotta-soft border border-terracotta/20 rounded-md px-3 py-2" data-testid="smart-error">{error}</div>}
          </div>
        )}

        {/* Form mode */}
        {mode === "form" && (
          <div className="px-6 py-5 space-y-4" onKeyDown={handleKeyDown}>
            <div className="flex p-1 bg-sand-100 rounded-lg text-sm">
              <button type="button" onClick={() => setMode("smart")} data-testid="mode-smart"
                className="flex-1 py-1.5 rounded-md text-[color:var(--text-secondary)]">
                <Zap size={13} className="inline mr-1.5" /> Smart
              </button>
              <button type="button" onClick={() => setMode("form")} data-testid="mode-form"
                className="flex-1 py-1.5 rounded-md bg-white text-[color:var(--text-primary)] shadow-sm font-medium">
                Form
              </button>
            </div>

            <div className="flex p-1 bg-sand-100 rounded-lg text-sm" data-testid="type-toggle">
              {["expense", "income"].map(t => (
                <button key={t} type="button" onClick={() => setType(t)} data-testid={`type-${t}`}
                  className={`flex-1 py-1.5 rounded-md transition-colors ${type === t ? "bg-white text-[color:var(--text-primary)] shadow-sm" : "text-[color:var(--text-secondary)]"}`}>
                  {t === "expense" ? "Expense" : "Income"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-3">
                <Label className="text-xs text-[color:var(--text-secondary)] mb-1.5 block">Merchant</Label>
                <Input ref={firstFieldRef} value={merchant} onChange={(e) => setMerchant(e.target.value)} data-testid="input-merchant" placeholder="e.g. Starbucks" className="font-sans" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-[color:var(--text-secondary)] mb-1.5 block">Amount (HK$)</Label>
                <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="input-amount" placeholder="0" className="font-num text-lg" />
              </div>
            </div>

            {usualHint && (
              <button type="button" onClick={() => setAmount(String(usualHint.typical))} data-testid="usual-hint"
                className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-moss-soft text-moss text-xs hover:bg-moss hover:text-white transition-colors">
                <CheckCircle2 size={14} />
                <span>You usually pay <span className="font-num font-semibold">{HKD(usualHint.typical)}</span> at {merchant} ({usualHint.count}×)</span>
                <span className="ml-auto font-medium">Use this →</span>
              </button>
            )}

            <div>
              <Label className="text-xs text-[color:var(--text-secondary)] mb-1.5 block">Account</Label>
              <div className="flex gap-2">
                {ACCOUNT.map(({ value, label, icon: Icon }) => (
                  <button key={value} type="button" onClick={() => setAccount(value)} data-testid={`account-${value}`}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm transition-colors ${
                      account === value ? "border-moss bg-moss-soft text-moss font-medium" : "border-sand-200 text-[color:var(--text-secondary)] hover:bg-sand-100"
                    }`}>
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs text-[color:var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
                <Sparkles size={12} className="text-moss" /> Category
              </Label>
              <div className="flex flex-wrap gap-2">
                {suggestions.map(s => (
                  <button key={s} type="button" onClick={() => setCategory(s)} data-testid={`suggest-${s.replace(/\s+/g,'-').toLowerCase()}`}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      category === s ? "bg-moss text-white border-moss" : "bg-white text-[color:var(--text-secondary)] border-sand-200 hover:border-moss"
                    }`}>
                    {s}
                  </button>
                ))}
                {!suggestions.includes(category) && (
                  <span className="px-3 py-1.5 rounded-full text-xs bg-moss text-white">{category}</span>
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs text-[color:var(--text-secondary)] mb-1.5 block">Note (optional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} data-testid="input-note" placeholder="Lunch with team" />
            </div>

            {error && <div className="text-xs text-terracotta bg-terracotta-soft border border-terracotta/20 rounded-md px-3 py-2" data-testid="quick-add-error">{error}</div>}
          </div>
        )}

        <div className="px-6 py-4 bg-sand-50 border-t border-sand-200 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} data-testid="quick-add-cancel">Cancel</Button>
          {mode === "smart" ? (
            <Button onClick={smartSubmit} disabled={saving || !smartText.trim()} data-testid="smart-save" className="bg-moss hover:bg-moss-hover text-white">
              {saving ? "Saving..." : "Save"} <span className="text-[10px] opacity-75 ml-1.5">↵</span>
            </Button>
          ) : (
            <Button onClick={saveForm} disabled={saving} data-testid="quick-add-save" className="bg-moss hover:bg-moss-hover text-white">
              {saving ? "Saving..." : "Save transaction"} <span className="text-[10px] opacity-75 ml-1.5">↵</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
