import React, { useEffect, useState } from "react";
import { Plus, Target, Trash2, Gauge, Share2, Users, LogOut as LeaveIcon } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { HKD } from "../lib/format";
import { Card, EmptyState, ErrorBanner, Page, PageHeader, Skel } from "../components/Shared";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import ShareDialog from "../components/ShareDialog";
import { toast } from "sonner";

const PACE_LABEL = { on_track: "On track", slightly_fast: "Slightly fast", fast: "Ahead of pace", over: "Over budget", under: "Under pace" };
const PACE_TONE = { on_track: "moss", slightly_fast: "warn", fast: "terra", over: "terra", under: "moss" };

export default function Budgets() {
  const [items, setItems] = useState([]);
  const [pacing, setPacing] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Food & Dining", account: "personal", limit: "" });
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [shareOpen, setShareOpen] = useState(null);

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const [b, c, p] = await Promise.all([api.get("/budgets"), api.get("/categories"), api.get("/insights/pacing")]);
      setItems(b.data);
      setCategories(c.data.categories || []);
      const m = {};
      (p.data.budgets || []).forEach(x => { m[x.budget_id] = x; });
      setPacing({ month_pct: p.data.month_pct, rows: m });
    } catch (e) { setErr(formatApiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setFormErr("");
    if (!form.name.trim()) { setFormErr("Name is required"); return; }
    const lim = parseFloat(form.limit);
    if (!lim || lim <= 0) { setFormErr("Limit must be greater than 0"); return; }
    setSaving(true);
    try {
      await api.post("/budgets", { ...form, limit: lim });
      toast.success("Budget created");
      setOpen(false);
      setForm({ name: "", category: "Food & Dining", account: "personal", limit: "" });
      load();
    } catch (e) { setFormErr(formatApiError(e)); }
    finally { setSaving(false); }
  };

  const del = async (b) => {
    const isOwner = b.is_owner !== false;
    const label = isOwner ? `Delete budget "${b.name}"?` : `Leave "${b.name}"?`;
    if (!window.confirm(label)) return;
    try {
      if (isOwner) { await api.delete(`/budgets/${b.id}`); toast.success("Deleted"); }
      else { await api.delete(`/budgets/${b.id}`); toast.success("Left"); }
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <Page>
      <PageHeader title="Budgets & rules" subtitle="Quiet guardrails that alert only when they matter."
        right={<Button onClick={() => setOpen(true)} data-testid="new-budget-btn" className="bg-moss hover:bg-moss-hover text-white"><Plus size={15} className="mr-1.5" /> New budget</Button>} />

      {err && <div className="mb-4"><ErrorBanner message={err} onRetry={load} /></div>}

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skel key={i} className="h-32" />)}</div>
      ) : items.length === 0 ? (
        <Card className="p-2">
          <EmptyState icon={Target} title="No budgets yet"
            body="Budgets keep you on track without being naggy. Set one for a category you want to watch."
            action={<Button onClick={() => setOpen(true)} className="bg-moss hover:bg-moss-hover text-white" data-testid="empty-budget-btn"><Plus size={14} className="mr-1.5" /> Create budget</Button>}
            testid="budgets-empty" />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4" data-testid="budgets-list">
          {items.map(b => {
            const pct = Math.min(200, b.pct);
            const tone = pct >= 100 ? "terra" : pct >= 80 ? "warn" : "moss";
            const pace = pacing?.rows?.[b.id];
            const paceStatus = pace?.status || "on_track";
            const paceTone = PACE_TONE[paceStatus];
            const paceBg = paceTone === "terra" ? "bg-terracotta-soft text-terracotta" : paceTone === "warn" ? "bg-[#FFF5E6] text-[#B37E1E]" : "bg-moss-soft text-moss";
            const overAmt = pace?.over_amount || 0;
            const members = b.members || [];
            const isShared = b.is_shared || members.length > 1;
            const isOwner = b.is_owner !== false;
            return (
              <Card key={b.id} className="p-5" data-testid={`budget-${b.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-heading font-medium truncate">{b.name}</div>
                      {isShared && <span className="text-[9px] uppercase tracking-[0.15em] text-moss bg-moss-soft px-1.5 py-0.5 rounded flex items-center gap-1"><Users size={9} /> Shared</span>}
                      {!isOwner && <span className="text-[9px] uppercase tracking-[0.15em] text-[color:var(--text-secondary)] bg-sand-100 px-1.5 py-0.5 rounded">Member</span>}
                    </div>
                    <div className="text-[11px] text-[color:var(--text-secondary)] mt-0.5 capitalize">{b.category} · {b.account}</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${paceBg}`} data-testid={`pace-${b.id}`}>{PACE_LABEL[paceStatus]}</span>
                    {isOwner && <button onClick={() => setShareOpen(b)} data-testid={`budget-share-${b.id}`} className="p-1.5 rounded hover:bg-sand-100 text-[color:var(--text-muted)]" title="Share"><Share2 size={13} /></button>}
                    <button onClick={() => del(b)} data-testid={`budget-delete-${b.id}`} className="p-1.5 rounded hover:bg-sand-100 text-[color:var(--text-muted)]" title={isOwner ? "Delete" : "Leave"}>
                      {isOwner ? <Trash2 size={14} /> : <LeaveIcon size={13} />}
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <div className="font-num tabular-nums text-lg"><span className="font-heading">{HKD(b.spent)}</span> <span className="text-xs text-[color:var(--text-secondary)]">of {HKD(b.limit)}</span></div>
                  <div className={`text-xs font-medium font-num ${tone === "terra" ? "text-terracotta" : tone === "warn" ? "text-[#B37E1E]" : "text-moss"}`}>{Math.round(b.pct)}%</div>
                </div>
                <div className="mt-3 relative h-2 rounded-full bg-sand-100 overflow-hidden">
                  <div className={`h-full absolute top-0 left-0 transition-all ${tone === "terra" ? "bg-terracotta" : tone === "warn" ? "bg-[#B37E1E]" : "bg-moss"}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  {pacing?.month_pct != null && (
                    <div className="absolute top-0 bottom-0 w-[2px] bg-[color:var(--text-primary)]/50" style={{ left: `${pacing.month_pct}%` }} title={`Month progress ${Math.round(pacing.month_pct)}%`} />
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[color:var(--text-secondary)]">
                  <Gauge size={11} /> {Math.round(pacing?.month_pct || 0)}% of month done
                </div>
                {overAmt > 0 && paceStatus !== "over" && (
                  <div className="mt-3 text-xs text-[#B37E1E] bg-[#FFF5E6] rounded-md px-2.5 py-1.5" data-testid={`pace-hint-${b.id}`}>
                    Slow by <span className="font-num font-medium">{HKD(overAmt)}</span> this week to return to pace.
                  </div>
                )}
                {pct >= 100 && <div className="mt-3 text-xs text-terracotta bg-terracotta-soft rounded-md px-2.5 py-1.5" data-testid="budget-over">Over budget — check Alerts for resolution steps.</div>}
                {members.length > 1 && (
                  <div className="mt-3 flex items-center gap-1.5" data-testid={`budget-members-${b.id}`}>
                    <div className="flex -space-x-1.5">
                      {members.slice(0, 4).map(m => (
                        <div key={m.id} className="w-6 h-6 rounded-full bg-moss-soft text-moss flex items-center justify-center text-[10px] font-medium border-2 border-white" title={m.name}>
                          {(m.name || "?").slice(0, 1).toUpperCase()}
                        </div>
                      ))}
                    </div>
                    <span className="text-[11px] text-[color:var(--text-secondary)]">{members.length} tracking together</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <ShareDialog open={!!shareOpen} onClose={() => setShareOpen(null)} resource={shareOpen} kind="budget" onChanged={load} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[440px] bg-white" data-testid="new-budget-dialog">
          <DialogHeader><DialogTitle className="font-heading">New budget</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs mb-1.5 block">Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="budget-name" placeholder="Dining cap" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger data-testid="budget-category"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Account</Label>
                <Select value={form.account} onValueChange={(v) => setForm({ ...form, account: v })}>
                  <SelectTrigger data-testid="budget-account"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Monthly limit (HK$)</Label>
              <Input type="number" value={form.limit} onChange={(e) => setForm({ ...form, limit: e.target.value })} data-testid="budget-limit" placeholder="1500" className="font-num" />
            </div>
            {formErr && <div className="text-xs text-terracotta bg-terracotta-soft border border-terracotta/20 rounded-md px-3 py-2" data-testid="budget-form-error">{formErr}</div>}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setOpen(false)} data-testid="budget-cancel">Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-moss hover:bg-moss-hover text-white" data-testid="budget-save">{saving ? "Saving..." : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
