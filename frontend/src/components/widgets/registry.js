import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, TrendingUp, TrendingDown, Bell, AlertTriangle, Wallet, Gauge, Lightbulb, CheckCircle2, ArrowUpRight } from "lucide-react";
import { HKD, shortDate } from "../../lib/format";
import { LineChart, Line, ResponsiveContainer } from "recharts";

// Tier content density per widget. s=minimal, m=default, l=rich.

// ----- Safe to Spend -----
export function SafeToSpend({ size, data }) {
  const ins = data?.insights;
  if (!ins) return null;
  const body = (
    <>
      <div className="flex items-center gap-2 text-xs text-moss uppercase tracking-[0.2em]"><Sparkles size={13} /> Safe to spend · daily</div>
      <div className="mt-3 flex items-baseline gap-3">
        <div className={`font-heading tracking-tight font-num ${size === "s" ? "text-3xl" : "text-4xl sm:text-5xl"}`} data-testid="safe-to-spend">
          {HKD(ins.safe_to_spend_daily, { decimals: 0 })}
        </div>
        <div className="text-xs text-[color:var(--text-secondary)]">/ day · {ins.days_remaining}d left</div>
      </div>
      {size !== "s" && (
        <div className={`mt-6 grid gap-4 ${size === "l" ? "grid-cols-3" : "grid-cols-3"}`}>
          <Metric label="Remaining" value={HKD(ins.remaining_budget)} tint="moss" />
          <Metric label="Spent this month" value={HKD(ins.expense_this_month)} tint="terra" />
          <Metric label="vs last month"
            value={`${ins.mom_pct > 0 ? "+" : ""}${ins.mom_pct.toFixed(0)}%`}
            tint={ins.mom_pct > 10 ? "terra" : "moss"}
            icon={ins.mom_pct > 0 ? TrendingUp : TrendingDown} />
        </div>
      )}
      {size === "l" && ins.daily_series?.length > 0 && (
        <div className="mt-6 pt-6 border-t border-sand-200">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-secondary)] mb-2">Last 30 days</div>
          <div style={{ height: 80, minHeight: 80, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={80}>
              <LineChart data={ins.daily_series}>
                <Line type="monotone" dataKey="amount" stroke="#2D5A27" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
  return (
    <div className="bg-white border border-sand-200 rounded-xl overflow-hidden relative h-full" data-testid="safe-to-spend-card">
      <div className="absolute inset-0 bg-gradient-to-br from-moss-soft via-white to-white pointer-events-none" />
      <div className={`relative ${size === "s" ? "p-5" : "p-6 sm:p-8"} h-full`}>{body}</div>
    </div>
  );
}

// ----- Headline -----
export function Headline({ size, data }) {
  const h = data?.headline?.headline;
  const drill = data?.headline?.drill_down || [];
  const action = data?.headline?.action;
  if (!h) {
    return (
      <div className="bg-moss-soft border border-moss/25 rounded-xl p-5 h-full flex items-center gap-3">
        <CheckCircle2 size={18} className="text-moss" />
        <div className="text-sm text-moss">Nothing unusual to flag. Keep going.</div>
      </div>
    );
  }
  const toneMap = {
    warning: { bg: "bg-terracotta-soft", border: "border-terracotta/25", text: "text-terracotta", icon: AlertTriangle, bar: "bg-terracotta" },
    info: { bg: "bg-[#E6EEF3]", border: "border-[#4A6E82]/25", text: "text-[#4A6E82]", icon: Lightbulb, bar: "bg-[#4A6E82]" },
    success: { bg: "bg-moss-soft", border: "border-moss/25", text: "text-moss", icon: CheckCircle2, bar: "bg-moss" },
  };
  const t = toneMap[h.tone] || toneMap.info;
  const Icon = t.icon;
  return (
    <div className={`rounded-xl border ${t.border} ${t.bg} p-5 h-full`} data-testid="headline-insight">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg bg-white ${t.text} flex items-center justify-center flex-shrink-0`}><Icon size={17} /></div>
        <div className="flex-1 min-w-0">
          <div className={`text-[11px] uppercase tracking-[0.2em] ${t.text} font-medium`}>The one thing</div>
          <div className={`font-heading tracking-tight mt-1 ${size === "s" ? "text-base" : "text-lg sm:text-xl"}`} data-testid="headline-title">{h.title}</div>
          {size !== "s" && <div className="text-sm text-[color:var(--text-secondary)] mt-1 leading-relaxed">{h.detail}</div>}
          {size !== "s" && action && (
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <div className="text-sm font-medium" data-testid="headline-action-label">→ {action.label}</div>
              <Link to={action.link} data-testid="headline-action-cta">
                <button className="text-xs px-3 py-1 rounded-md border border-current/30 hover:bg-white/50">{action.cta} →</button>
              </Link>
            </div>
          )}
        </div>
      </div>
      {size === "l" && drill.length > 0 && (
        <div className="mt-4 pt-4 border-t border-current/10">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-secondary)] mb-2">What drove it</div>
          <div className="space-y-2">
            {drill.map((d, i) => {
              const max = Math.max(...drill.map(x => x.amount));
              const pct = (d.amount / max) * 100;
              return (
                <div key={i} className="flex items-center gap-3" data-testid={`drill-${i}`}>
                  <div className="w-32 sm:w-44 text-xs truncate">{d.merchant}</div>
                  <div className="flex-1 h-1.5 rounded-full bg-white/60 overflow-hidden">
                    <div className={`h-full ${t.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs font-num tabular-nums w-20 text-right">{HKD(d.amount)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ----- Alerts -----
export function Alerts({ size, data }) {
  const list = (data?.alerts || []).filter(a => !a.acknowledged);
  const max = size === "s" ? 1 : size === "m" ? 3 : 5;
  return (
    <div className="bg-white border border-sand-200 rounded-xl p-5 h-full" data-testid="alerts-card">
      <div className="flex items-center justify-between">
        <div className="font-heading font-medium">Alerts</div>
        <Link to="/alerts" className="text-xs text-moss hover:underline flex items-center gap-1">All <ArrowUpRight size={12} /></Link>
      </div>
      {list.length === 0 ? (
        <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-moss-soft text-moss" data-testid="alerts-all-clear">
          <Bell size={16} />
          <div className="text-sm">All clear — no active alerts.</div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {list.slice(0, max).map(a => (
            <div key={a.id} data-testid={`alert-row-${a.id}`}
              className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                a.severity === "critical" ? "bg-terracotta-soft border-terracotta/25" : "bg-[#FFF5E6] border-[#EFCF9A]/40"
              }`}>
              <AlertTriangle size={14} className={a.severity === "critical" ? "text-terracotta mt-0.5" : "text-[#B37E1E] mt-0.5"} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{a.message}</div>
                {size !== "s" && <div className="text-[10px] text-[color:var(--text-secondary)] mt-0.5 capitalize">{a.category} · {a.account}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ----- Pacing -----
export function Pacing({ size, data }) {
  const pacing = data?.pacing;
  if (!pacing || pacing.budgets.length === 0) {
    return (
      <div className="bg-white border border-sand-200 rounded-xl p-5 h-full">
        <div className="flex items-center gap-2 mb-2"><Gauge size={16} className="text-moss" /><div className="font-heading font-medium">Budget pacing</div></div>
        <div className="text-sm text-[color:var(--text-secondary)]">Set a budget to see pacing here.</div>
      </div>
    );
  }
  const max = size === "s" ? 2 : size === "m" ? 4 : 6;
  const statusMap = {
    over: { tone: "terra", label: "Over budget" }, fast: { tone: "terra", label: "Ahead of pace" },
    slightly_fast: { tone: "warn", label: "Slightly fast" },
    on_track: { tone: "moss", label: "On track" }, under: { tone: "moss", label: "Under pace" },
  };
  return (
    <div className="bg-white border border-sand-200 rounded-xl p-5 h-full" data-testid="pacing-strip">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-moss-soft text-moss flex items-center justify-center"><Gauge size={15} /></div>
        <div className="min-w-0">
          <div className="font-heading font-medium text-sm">Budget pacing</div>
          <div className="text-[11px] text-[color:var(--text-secondary)]">{Math.round(pacing.month_pct)}% of month done</div>
        </div>
        <Link to="/budgets" className="ml-auto text-xs text-moss hover:underline">Manage</Link>
      </div>
      <div className={`grid gap-2 ${size === "l" ? "grid-cols-2" : "grid-cols-1"}`}>
        {pacing.budgets.slice(0, max).map(b => {
          const s = statusMap[b.status] || statusMap.on_track;
          const tc = s.tone === "terra" ? "text-terracotta bg-terracotta-soft" : s.tone === "warn" ? "text-[#B37E1E] bg-[#FFF5E6]" : "text-moss bg-moss-soft";
          return (
            <div key={b.budget_id} className="p-2.5 rounded-lg border border-sand-200" data-testid={`pacing-${b.budget_id}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium truncate">{b.name}</div>
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${tc}`}>{s.label}</span>
              </div>
              <div className="mt-1.5 relative h-1 bg-sand-100 rounded-full overflow-hidden">
                <div className={`h-full absolute top-0 left-0 ${s.tone === "terra" ? "bg-terracotta" : s.tone === "warn" ? "bg-[#B37E1E]" : "bg-moss"}`} style={{ width: `${Math.min(100, b.used_pct)}%` }} />
                <div className="absolute top-0 bottom-0 w-[1.5px] bg-[color:var(--text-primary)]/40" style={{ left: `${pacing.month_pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----- Categories -----
export function Categories({ size, data }) {
  const ins = data?.insights;
  const cats = ins?.by_category || [];
  const max = size === "s" ? 3 : size === "m" ? 5 : 8;
  return (
    <div className="bg-white border border-sand-200 rounded-xl p-5 h-full" data-testid="category-card">
      <div className="flex items-center justify-between">
        <div className="font-heading font-medium">Top categories</div>
        <Link to="/insights" className="text-xs text-moss hover:underline flex items-center gap-1">Insights <ArrowUpRight size={12} /></Link>
      </div>
      {cats.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-[color:var(--text-secondary)] mt-4"><Wallet size={15} /> No spend yet.</div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {cats.slice(0, max).map((c, i) => {
            const total = cats.reduce((s, x) => s + x.amount, 0) || 1;
            const pct = (c.amount / total) * 100;
            return (
              <div key={c.category} data-testid={`cat-row-${i}`}>
                <div className="flex items-center justify-between text-xs">
                  <span>{c.category}</span>
                  <span className="font-num tabular-nums">{HKD(c.amount)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-sand-100 overflow-hidden">
                  <div className="h-full bg-moss transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ----- Recent Transactions -----
export function Recent({ size, data }) {
  const txns = data?.transactions || [];
  const max = size === "s" ? 3 : size === "m" ? 5 : 8;
  return (
    <div className="bg-white border border-sand-200 rounded-xl p-5 h-full" data-testid="recent-transactions">
      <div className="flex items-center justify-between">
        <div className="font-heading font-medium">Recent</div>
        <Link to="/transactions" className="text-xs text-moss hover:underline flex items-center gap-1">All <ArrowUpRight size={12} /></Link>
      </div>
      {txns.length === 0 ? (
        <div className="text-sm text-[color:var(--text-secondary)] mt-4 py-4 text-center">No transactions yet.</div>
      ) : (
        <div className="mt-3 space-y-2">
          {txns.slice(0, max).map(t => (
            <div key={t.id} className="flex items-center gap-2.5" data-testid={`recent-${t.id}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium ${t.type === "income" ? "bg-moss-soft text-moss" : "bg-sand-100"}`}>
                {String(t.merchant || "?")
                  .trim()
                  .slice(0, 1)
                  .toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs truncate font-medium">{t.merchant || "—"}</div>
                {size !== "s" && <div className="text-[10px] text-[color:var(--text-secondary)]">{shortDate(t.date)} · {t.category}</div>}
              </div>
              <div className={`text-xs font-num tabular-nums ${t.type === "income" ? "text-moss" : ""}`}>
                {t.type === "income" ? "+" : "-"}{HKD(t.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ----- Goals (compact widget) -----
export function GoalsWidget({ size, data }) {
  const goals = data?.goals || [];
  const max = size === "s" ? 1 : size === "m" ? 2 : 4;
  return (
    <div className="bg-white border border-sand-200 rounded-xl p-5 h-full" data-testid="goals-widget">
      <div className="flex items-center justify-between">
        <div className="font-heading font-medium">Goals</div>
        <Link to="/goals" className="text-xs text-moss hover:underline flex items-center gap-1">All <ArrowUpRight size={12} /></Link>
      </div>
      {goals.length === 0 ? (
        <Link to="/goals" className="block mt-4 p-3 rounded-lg border border-dashed border-sand-200 text-center text-xs text-[color:var(--text-secondary)] hover:border-moss hover:text-moss">
          + Start your first goal
        </Link>
      ) : (
        <div className="mt-4 space-y-3">
          {goals.slice(0, max).map(g => {
            const pct = Math.min(100, (g.current_amount / g.target_amount) * 100);
            return (
              <div key={g.id} data-testid={`goal-w-${g.id}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium truncate">{g.name}</span>
                  <span className="font-num tabular-nums text-moss">{Math.round(pct)}%</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-sand-100 overflow-hidden">
                  <div className="h-full bg-moss" style={{ width: `${pct}%` }} />
                </div>
                {size === "l" && (
                  <div className="text-[10px] text-[color:var(--text-secondary)] mt-1 font-num">{HKD(g.current_amount)} of {HKD(g.target_amount)}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, tint, icon: Icon }) {
  const tc = tint === "moss" ? "text-moss" : tint === "terra" ? "text-terracotta" : "text-[color:var(--text-primary)]";
  return (
    <div>
      <div className="text-[11px] text-[color:var(--text-secondary)] uppercase tracking-[0.15em]">{label}</div>
      <div className={`font-heading mt-1 flex items-center gap-1.5 ${tc}`}>
        {Icon && <Icon size={14} />}
        <span className="font-num text-lg">{value}</span>
      </div>
    </div>
  );
}

// Widget registry
export const WIDGETS = {
  "headline": { id: "headline", title: "Headline insight", render: Headline, defaultSize: "l", minCols: 1, maxCols: 3 },
  "safe-to-spend": { id: "safe-to-spend", title: "Safe to spend", render: SafeToSpend, defaultSize: "m", minCols: 1, maxCols: 3 },
  "alerts": { id: "alerts", title: "Alerts", render: Alerts, defaultSize: "s", minCols: 1, maxCols: 3 },
  "pacing": { id: "pacing", title: "Budget pacing", render: Pacing, defaultSize: "l", minCols: 1, maxCols: 3 },
  "categories": { id: "categories", title: "Top categories", render: Categories, defaultSize: "m", minCols: 1, maxCols: 3 },
  "recent": { id: "recent", title: "Recent transactions", render: Recent, defaultSize: "s", minCols: 1, maxCols: 3 },
  "goals": { id: "goals", title: "Goals", render: GoalsWidget, defaultSize: "s", minCols: 1, maxCols: 3 },
};

export const DEFAULT_LAYOUT = [
  { id: "headline", size: "l" },
  { id: "safe-to-spend", size: "m" },
  { id: "alerts", size: "s" },
  { id: "pacing", size: "l" },
  { id: "categories", size: "m" },
  { id: "recent", size: "s" },
  { id: "goals", size: "s" },
];

export const SIZE_TO_COLS = { s: 1, m: 2, l: 3 };

/** Min height for the dashed placeholder while dragging (keeps grid calm). */
export const SIZE_TO_PLACEHOLDER_MIN_PX = { s: 132, m: 176, l: 248 };
