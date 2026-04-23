import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Target, Trash2, Plane, ShieldCheck, TrendingDown as TrendDown, Flame, Plus, Pencil, Users, Share2, LogOut as LeaveIcon } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { HKD, fullDate } from "../lib/format";
import { Card, EmptyState, ErrorBanner, Page, PageHeader, Skel } from "../components/Shared";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import ShareDialog from "../components/ShareDialog";
import { toast } from "sonner";

const TEMPLATES = [
  { kind: "emergency", label: "Emergency fund", icon: ShieldCheck, target: 60000, months: 12, hint: "3–6 months of essentials." },
  { kind: "travel", label: "Travel", icon: Plane, target: 15000, months: 10, hint: "A trip within the year." },
  { kind: "debt", label: "Debt payoff", icon: TrendDown, target: 20000, months: 12, hint: "Clear a credit card or loan." },
  { kind: "retirement", label: "Retirement boost", icon: Flame, target: 120000, months: 24, hint: "Long-horizon savings." },
];

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", kind: "custom", target_amount: "", monthly_contribution: "", current_amount: "0" });
  const [editing, setEditing] = useState(null);
  const [contribOpen, setContribOpen] = useState(null);
  const [shareOpen, setShareOpen] = useState(null);
  const [contribAmt, setContribAmt] = useState("");
  const [formErr, setFormErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [safeDaily, setSafeDaily] = useState(0);

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const [g, i] = await Promise.all([api.get("/goals"), api.get("/insights")]);
      setGoals(g.data);
      setSafeDaily(i.data.safe_to_spend_daily || 0);
    } catch (e) { setErr(formatApiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const applyTemplate = (tpl) => {
    setEditing(null);
    setFormErr("");
    setForm({
      name: tpl.label,
      kind: tpl.kind,
      target_amount: String(tpl.target),
      monthly_contribution: String(Math.round(tpl.target / tpl.months)),
      current_amount: "0",
    });
    setOpen(true);
  };

  const openCustom = () => {
    setEditing(null); setFormErr("");
    setForm({ name: "", kind: "custom", target_amount: "", monthly_contribution: "", current_amount: "0" });
    setOpen(true);
  };

  const openEdit = (g) => {
    setEditing(g); setFormErr("");
    setForm({
      name: g.name, kind: g.kind,
      target_amount: String(g.target_amount),
      monthly_contribution: String(g.monthly_contribution || 0),
      current_amount: String(g.current_amount || 0),
    });
    setOpen(true);
  };

  const save = async () => {
    setFormErr("");
    if (!form.name.trim()) { setFormErr("Give your goal a name"); return; }
    const target = parseFloat(form.target_amount);
    if (!target || target <= 0) { setFormErr("Target must be greater than 0"); return; }
    const payload = {
      name: form.name.trim(),
      kind: form.kind,
      target_amount: target,
      current_amount: parseFloat(form.current_amount) || 0,
      monthly_contribution: parseFloat(form.monthly_contribution) || 0,
    };
    setSaving(true);
    try {
      if (editing) await api.patch(`/goals/${editing.id}`, payload);
      else await api.post("/goals", payload);
      toast.success(editing ? "Goal updated" : "Goal created");
      setOpen(false);
      load();
    } catch (e) { setFormErr(formatApiError(e)); }
    finally { setSaving(false); }
  };

  const contribute = async () => {
    const amt = parseFloat(contribAmt);
    if (!amt || amt <= 0) { toast.error("Enter a positive amount"); return; }
    try {
      await api.post(`/goals/${contribOpen.id}/contribute`, { amount: amt });
      toast.success(`+${HKD(amt)} added to ${contribOpen.name}`);
      setContribOpen(null); setContribAmt(""); load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const del = async (g) => {
    const isOwner = g.is_owner !== false;
    const label = isOwner ? `Delete goal "${g.name}"? This removes it for all members.` : `Leave "${g.name}"?`;
    if (!window.confirm(label)) return;
    try {
      if (isOwner) await api.delete(`/goals/${g.id}`);
      else await api.post(`/goals/${g.id}/leave`);
      toast.success(isOwner ? "Deleted" : "Left");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const safeMonthly = safeDaily * 30;

  return (
    <Page>
      <PageHeader
        title="Goals"
        subtitle="Connect today's choices to what you're saving for."
        right={<Button onClick={openCustom} data-testid="new-goal-btn" className="bg-moss hover:bg-moss-hover text-white"><Plus size={15} className="mr-1.5" /> Custom goal</Button>}
      />

      {err && <div className="mb-4"><ErrorBanner message={err} onRetry={load} /></div>}

      {!loading && goals.length === 0 && (
        <Card className="p-6 mb-6" data-testid="goal-templates">
          <div className="font-heading font-medium">Start with a template</div>
          <div className="text-xs text-[color:var(--text-secondary)] mt-1">Pick what you're saving for. Estimates assume steady monthly contributions.</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            {TEMPLATES.map(t => (
              <button key={t.kind} onClick={() => applyTemplate(t)} data-testid={`tpl-${t.kind}`}
                className="text-left p-4 rounded-lg border border-sand-200 hover:border-moss hover:bg-moss-soft transition-colors">
                <div className="w-9 h-9 rounded-md bg-moss-soft text-moss flex items-center justify-center"><t.icon size={17} /></div>
                <div className="font-medium text-sm mt-3">{t.label}</div>
                <div className="text-[11px] text-[color:var(--text-secondary)] mt-1 leading-relaxed">{t.hint}</div>
                <div className="text-[11px] text-moss mt-2 font-num">~ {HKD(Math.round(t.target / t.months))}/mo · {t.months}mo</div>
              </button>
            ))}
          </div>
          {safeMonthly > 0 && (
            <div className="mt-5 p-3 rounded-lg bg-moss-soft text-xs text-moss leading-relaxed" data-testid="goal-safe-hint">
              <span className="font-medium">From your current Safe-to-Spend:</span> you could comfortably set aside about <span className="font-num font-semibold">{HKD(Math.round(safeMonthly * 0.2))}/mo</span> without pressure.
            </div>
          )}
        </Card>
      )}

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-40" />)}</div>
      ) : goals.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4" data-testid="goals-list">
          {goals.map(g => <GoalCard key={g.id} goal={g} onContribute={() => { setContribOpen(g); setContribAmt(""); }} onEdit={() => openEdit(g)} onDelete={() => del(g)} onShare={() => setShareOpen(g)} />)}
          <button onClick={openCustom} data-testid="add-another-goal" className="border-2 border-dashed border-sand-200 rounded-xl p-8 flex flex-col items-center justify-center text-[color:var(--text-secondary)] hover:border-moss hover:text-moss transition-colors">
            <Plus size={20} />
            <div className="text-sm mt-2 font-medium">Add another goal</div>
          </button>
        </div>
      )}

      {/* Create / Edit Goal Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[460px] bg-white" data-testid="goal-dialog">
          <DialogHeader><DialogTitle className="font-heading">{editing ? "Edit goal" : "New goal"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs mb-1.5 block">Goal name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="goal-name" placeholder="Japan 2026" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block">Type</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                  <SelectTrigger data-testid="goal-kind"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">
                    {["emergency", "travel", "debt", "retirement", "custom"].map(k => <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Target (HK$)</Label>
                <Input type="number" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} data-testid="goal-target" className="font-num" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block">Current saved (HK$)</Label>
                <Input type="number" value={form.current_amount} onChange={(e) => setForm({ ...form, current_amount: e.target.value })} data-testid="goal-current" className="font-num" />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Monthly plan (HK$)</Label>
                <Input type="number" value={form.monthly_contribution} onChange={(e) => setForm({ ...form, monthly_contribution: e.target.value })} data-testid="goal-monthly" className="font-num" />
              </div>
            </div>
            {safeMonthly > 0 && (
              <div className="text-[11px] text-[color:var(--text-secondary)] bg-sand-100 rounded p-2 leading-relaxed">
                Safe-to-Spend suggests <span className="font-num font-medium text-moss">{HKD(Math.round(safeMonthly * 0.2))}/mo</span> won't strain your month.
              </div>
            )}
            {formErr && <div className="text-xs text-terracotta bg-terracotta-soft border border-terracotta/20 rounded-md px-3 py-2" data-testid="goal-form-error">{formErr}</div>}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setOpen(false)} data-testid="goal-cancel">Cancel</Button>
            <Button onClick={save} disabled={saving} data-testid="goal-save" className="bg-moss hover:bg-moss-hover text-white">{saving ? "Saving..." : editing ? "Save changes" : "Create goal"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contribute Dialog */}
      <Dialog open={!!contribOpen} onOpenChange={(v) => !v && setContribOpen(null)}>
        <DialogContent className="sm:max-w-[400px] bg-white" data-testid="contrib-dialog">
          <DialogHeader><DialogTitle className="font-heading">Add to {contribOpen?.name}</DialogTitle></DialogHeader>
          <div className="pt-2">
            <Label className="text-xs mb-1.5 block">Amount (HK$)</Label>
            <Input type="number" autoFocus value={contribAmt} onChange={(e) => setContribAmt(e.target.value)} data-testid="contrib-amount" className="font-num text-lg" placeholder="500" />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setContribOpen(null)}>Cancel</Button>
            <Button onClick={contribute} data-testid="contrib-save" className="bg-moss hover:bg-moss-hover text-white">Add contribution</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Share Dialog */}
      <ShareDialog open={!!shareOpen} onClose={() => setShareOpen(null)} resource={shareOpen} kind="goal" onChanged={load} />
    </Page>
  );
}

function GoalCard({ goal, onContribute, onEdit, onDelete, onShare }) {
  const pct = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
  const remaining = Math.max(0, goal.target_amount - goal.current_amount);
  const monthsLeft = goal.monthly_contribution > 0 ? Math.ceil(remaining / goal.monthly_contribution) : null;
  const kindIcon = { emergency: ShieldCheck, travel: Plane, debt: TrendDown, retirement: Flame, custom: Target }[goal.kind] || Target;
  const Icon = kindIcon;
  const members = goal.members || [];
  const isShared = goal.is_shared || members.length > 1;
  const isOwner = goal.is_owner !== false;
  const recentContrib = goal.contributions && goal.contributions.length > 0 ? goal.contributions[goal.contributions.length - 1] : null;

  return (
    <Card className="p-5 flex flex-col" data-testid={`goal-${goal.id}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-moss-soft text-moss flex items-center justify-center flex-shrink-0"><Icon size={18} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-heading font-medium truncate">{goal.name}</div>
            {isShared && <span className="text-[9px] uppercase tracking-[0.15em] text-moss bg-moss-soft px-1.5 py-0.5 rounded flex items-center gap-1" data-testid={`shared-badge-${goal.id}`}><Users size={9} /> Shared</span>}
            {!isOwner && <span className="text-[9px] uppercase tracking-[0.15em] text-[color:var(--text-secondary)] bg-sand-100 px-1.5 py-0.5 rounded">Member</span>}
          </div>
          <div className="text-[11px] text-[color:var(--text-secondary)] mt-0.5 capitalize">{goal.kind}{goal.target_date ? ` · by ${fullDate(goal.target_date)}` : ""}</div>
        </div>
        {isOwner && <button onClick={onShare} data-testid={`goal-share-${goal.id}`} className="p-1.5 rounded hover:bg-sand-100 text-[color:var(--text-muted)]" title="Share"><Share2 size={13} /></button>}
        {isOwner && <button onClick={onEdit} data-testid={`goal-edit-${goal.id}`} className="p-1.5 rounded hover:bg-sand-100 text-[color:var(--text-muted)]"><Pencil size={13} /></button>}
        <button onClick={onDelete} data-testid={`goal-delete-${goal.id}`} className="p-1.5 rounded hover:bg-sand-100 text-[color:var(--text-muted)]" title={isOwner ? "Delete" : "Leave"}>
          {isOwner ? <Trash2 size={13} /> : <LeaveIcon size={13} />}
        </button>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <div className="font-num tabular-nums text-lg"><span className="font-heading">{HKD(goal.current_amount)}</span> <span className="text-xs text-[color:var(--text-secondary)]">of {HKD(goal.target_amount)}</span></div>
        <div className="text-xs text-moss font-num font-medium">{Math.round(pct)}%</div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-sand-100 overflow-hidden">
        <div className="h-full bg-moss transition-all" style={{ width: `${pct}%` }} />
      </div>

      {members.length > 1 && (
        <div className="mt-3 flex items-center gap-1.5" data-testid={`goal-members-${goal.id}`}>
          <div className="flex -space-x-1.5">
            {members.slice(0, 4).map(m => (
              <div key={m.id} className="w-6 h-6 rounded-full bg-moss-soft text-moss flex items-center justify-center text-[10px] font-medium border-2 border-white" title={m.name}>
                {(m.name || "?").slice(0, 1).toUpperCase()}
              </div>
            ))}
            {members.length > 4 && <div className="w-6 h-6 rounded-full bg-sand-100 text-[color:var(--text-secondary)] flex items-center justify-center text-[10px] font-medium border-2 border-white">+{members.length - 4}</div>}
          </div>
          <span className="text-[11px] text-[color:var(--text-secondary)]">{members.length} contributing</span>
          {recentContrib && <span className="text-[11px] text-[color:var(--text-secondary)] ml-auto">{recentContrib.name} +{HKD(recentContrib.amount)}</span>}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-sand-200">
        <div className="text-[11px] text-[color:var(--text-secondary)] leading-tight">
          {monthsLeft !== null
            ? <>at <span className="font-num">{HKD(goal.monthly_contribution)}</span>/mo → <span className="font-medium text-[color:var(--text-primary)]">{monthsLeft} months</span></>
            : <>Set a monthly plan to see your timeline.</>}
        </div>
        <Button size="sm" onClick={onContribute} data-testid={`goal-contribute-${goal.id}`} className="bg-moss hover:bg-moss-hover text-white">
          <Plus size={13} className="mr-1" /> Add
        </Button>
      </div>
    </Card>
  );
}
