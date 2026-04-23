import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, CheckCircle2, ArrowUpRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from "recharts";
import api, { formatApiError } from "../lib/api";
import { HKD, dayShort } from "../lib/format";
import { Card, EmptyState, ErrorBanner, Page, PageHeader, Skel } from "../components/Shared";
import { Button } from "../components/ui/button";

const PALETTE = ["#2D5A27", "#C05A45", "#4A6E82", "#B37E1E", "#7A6C98", "#8AA07E", "#D39177"];

export default function Insights() {
  const [ins, setIns] = useState(null);
  const [headline, setHeadline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const [i, h] = await Promise.all([api.get("/insights"), api.get("/insights/headline")]);
      setIns(i.data); setHeadline(h.data);
    } catch (e) { setErr(formatApiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <Page>
      <PageHeader title="Insights" subtitle="The one change that matters — and the detail behind it." />

      {err && <div className="mb-4"><ErrorBanner message={err} onRetry={load} /></div>}

      {loading ? (
        <div className="space-y-4"><Skel className="h-40" /><div className="grid md:grid-cols-3 gap-4"><Skel className="h-28" /><Skel className="h-28" /><Skel className="h-28" /></div><Skel className="h-72" /></div>
      ) : !ins || ins.txn_count_this_month === 0 ? (
        <Card className="p-2"><EmptyState icon={BarChart3} title="Not enough data yet"
          body="Add a few transactions to unlock trends, category splits, and forward-looking safe-to-spend." testid="insights-empty" /></Card>
      ) : (
        <div className="space-y-6">
          {/* Headline first — what matters most */}
          {headline?.headline && <HeadlineSection headline={headline.headline} drill={headline.drill_down} action={headline.action} />}

          {/* KPI summary */}
          <div className="grid md:grid-cols-3 gap-4">
            <KPI label="Income (this month)" value={HKD(ins.income_this_month)} />
            <KPI label="Expenses (this month)" value={HKD(ins.expense_this_month)} tone="terra" />
            <KPI label="vs last month" value={`${ins.mom_pct > 0 ? "+" : ""}${ins.mom_pct.toFixed(0)}%`}
              tone={ins.mom_pct > 10 ? "terra" : "moss"}
              icon={ins.mom_pct > 0 ? TrendingUp : TrendingDown} />
          </div>

          <Card className="p-5">
            <div className="font-heading font-medium">30-day spending</div>
            <div className="mt-4" style={{ minHeight: 240, height: 240, width: "100%" }} data-testid="daily-chart">
              <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={240}>
                <LineChart data={ins.daily_series} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                  <XAxis dataKey="date" tickFormatter={dayShort} interval={4} stroke="#9CA3AF" fontSize={11} />
                  <YAxis stroke="#9CA3AF" fontSize={11} />
                  <Tooltip formatter={(v) => HKD(v)} labelFormatter={dayShort} contentStyle={{ border: "1px solid #E5E3DB", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="amount" stroke="#2D5A27" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="font-heading font-medium">By category</div>
              <div className="mt-4" style={{ minHeight: 288, height: 288, width: "100%" }} data-testid="category-chart">
                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={288}>
                  <BarChart data={ins.by_category.slice(0, 8)} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <XAxis type="number" stroke="#9CA3AF" fontSize={11} />
                    <YAxis dataKey="category" type="category" stroke="#6B6B6B" fontSize={11} width={110} />
                    <Tooltip formatter={(v) => HKD(v)} contentStyle={{ border: "1px solid #E5E3DB", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                      {ins.by_category.slice(0, 8).map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <div className="font-heading font-medium">Personal vs Business</div>
              {ins.by_account.length === 0 ? (
                <div className="py-12 text-center text-sm text-[color:var(--text-secondary)]">No data yet.</div>
              ) : (
                <div className="mt-4 flex items-center" style={{ minHeight: 288, height: 288 }} data-testid="account-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={ins.by_account} dataKey="amount" nameKey="account" cx="50%" cy="50%"
                        innerRadius={60} outerRadius={100} paddingAngle={2}>
                        {ins.by_account.map((entry, i) => (
                          <Cell key={i} fill={entry.account === "personal" ? "#2D5A27" : "#C05A45"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => HKD(v)} contentStyle={{ border: "1px solid #E5E3DB", borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pr-6 space-y-3">
                    {ins.by_account.map(b => (
                      <div key={b.account} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded ${b.account === "personal" ? "bg-moss" : "bg-terracotta"}`} />
                        <div className="text-xs capitalize text-[color:var(--text-secondary)]">{b.account}</div>
                        <div className="text-sm font-num tabular-nums ml-auto">{HKD(b.amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </Page>
  );
}

function HeadlineSection({ headline, drill, action }) {
  const toneMap = {
    warning: { bg: "bg-terracotta-soft", border: "border-terracotta/25", text: "text-terracotta", icon: AlertTriangle, bar: "bg-terracotta" },
    info: { bg: "bg-[#E6EEF3]", border: "border-[#4A6E82]/25", text: "text-[#4A6E82]", icon: Lightbulb, bar: "bg-[#4A6E82]" },
    success: { bg: "bg-moss-soft", border: "border-moss/25", text: "text-moss", icon: CheckCircle2, bar: "bg-moss" },
  };
  const t = toneMap[headline.tone] || toneMap.info;
  const Icon = t.icon;
  return (
    <div className={`rounded-xl border ${t.border} ${t.bg} overflow-hidden`} data-testid="insights-headline">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-lg bg-white ${t.text} flex items-center justify-center flex-shrink-0`}><Icon size={20} /></div>
          <div className="flex-1 min-w-0">
            <div className={`text-[11px] uppercase tracking-[0.2em] ${t.text} font-medium`}>Most important right now</div>
            <div className="font-heading text-xl sm:text-2xl mt-1 tracking-tight">{headline.title}</div>
            <div className="text-sm text-[color:var(--text-secondary)] mt-1.5 leading-relaxed">{headline.detail}</div>
            {action && (
              <div className="mt-4 p-3 rounded-lg bg-white border border-current/15">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">What to do</div>
                    <div className="text-sm font-medium mt-1">{action.label}</div>
                  </div>
                  <Link to={action.link}><Button size="sm" className="bg-moss hover:bg-moss-hover text-white">{action.cta} <ArrowUpRight size={12} className="ml-1" /></Button></Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {drill && drill.length > 0 && (
        <div className="px-6 pb-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-secondary)] mb-3">What drove it</div>
          <div className="bg-white rounded-lg border border-sand-200 p-4 space-y-2.5">
            {drill.map((d, i) => {
              const max = Math.max(...drill.map(x => x.amount));
              const pct = (d.amount / max) * 100;
              return (
                <div key={i} className="flex items-center gap-3" data-testid={`insights-drill-${i}`}>
                  <div className="w-32 sm:w-44 text-xs truncate font-medium">{d.merchant}</div>
                  <div className="flex-1 h-2 rounded-full bg-sand-100 overflow-hidden">
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

function KPI({ label, value, tone, icon: Icon }) {
  const tc = tone === "terra" ? "text-terracotta" : tone === "moss" ? "text-moss" : "text-[color:var(--text-primary)]";
  return (
    <Card className="p-5">
      <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">{label}</div>
      <div className={`font-heading text-2xl mt-2 flex items-center gap-2 font-num ${tc}`}>
        {Icon && <Icon size={18} />}{value}
      </div>
    </Card>
  );
}
