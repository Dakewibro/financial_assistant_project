import React, { useEffect, useState } from "react";
import { Repeat2, Trash2, CalendarClock } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { normalizeTransactionList } from "../lib/transactionShape";
import { HKD, shortDate } from "../lib/format";
import { Card, EmptyState, ErrorBanner, Page, PageHeader, Skel } from "../components/Shared";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

function estimatedMonthly(g) {
  if (g.frequency === "weekly") return Number((g.averageAmount * 4.33).toFixed(2));
  if (g.frequency === "biweekly") return Number((g.averageAmount * 2.17).toFixed(2));
  if (g.frequency === "monthly") return Number(g.averageAmount.toFixed(2));
  return Number(g.totalLast30Days.toFixed(2));
}

/** API returns RecurringGroup (displayName, lastDate, …); map to UI row shape. */
function mapRecurringRow(g) {
  const merchant = String(g.displayName ?? g.normalizedMerchant ?? "Unknown").trim() || "Unknown";
  const monthly = estimatedMonthly(g);
  return {
    merchant,
    category: "—",
    account: g.scope === "business" ? "business" : "personal",
    occurrences: typeof g.count === "number" ? g.count : 0,
    next_expected: g.nextExpectedDate,
    last_date: g.lastDate,
    monthly_cost: monthly,
    annual_cost: Number((monthly * 12).toFixed(2)),
  };
}

export default function Recurring() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [txns, setTxns] = useState([]);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const [r, t] = await Promise.all([api.get("/recurring"), api.get("/transactions?limit=500")]);
      const raw = Array.isArray(r.data) ? r.data : [];
      setItems(raw.map(mapRecurringRow));
      setTxns(normalizeTransactionList(t.data));
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const cancelMerchant = async (merchant) => {
    const m = String(merchant || "").trim();
    if (!m) return;
    if (!window.confirm(`Mark all "${m}" charges as cancelled? This deletes them from history.`)) return;
    const match = txns.filter((t) => String(t.merchant || "").trim().toLowerCase() === m.toLowerCase());
    try {
      for (const t of match) await api.delete(`/transactions/${t.id}`);
      toast.success(`Removed ${match.length} ${m} charges`);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const total = items.reduce((s, r) => s + (Number(r.monthly_cost) || 0), 0);
  const annual = items.reduce((s, r) => s + (Number(r.annual_cost) || 0), 0);

  return (
    <Page>
      <PageHeader title="Recurring charges" subtitle="Detected subscriptions and repeat spend. Cancel the leakage." />

      {err && (
        <div className="mb-4">
          <ErrorBanner message={err} onRetry={load} />
        </div>
      )}

      {loading ? (
        <>
          <div className="grid md:grid-cols-3 gap-4 mb-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skel key={i} className="h-20" />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skel key={i} className="h-14" />
            ))}
          </div>
        </>
      ) : items.length === 0 ? (
        <Card className="p-2">
          <EmptyState
            icon={Repeat2}
            title="Nothing recurring yet"
            body="Once you have a few months of data, we'll spot subscriptions and repeat charges automatically."
            testid="recurring-empty"
          />
        </Card>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-4 mb-5">
            <Card className="p-5" data-testid="recurring-summary-count">
              <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">Detected</div>
              <div className="font-heading text-2xl mt-1 font-num">{items.length}</div>
              <div className="text-xs text-[color:var(--text-secondary)] mt-1">active patterns</div>
            </Card>
            <Card className="p-5" data-testid="recurring-summary-monthly">
              <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">Monthly total</div>
              <div className="font-heading text-2xl mt-1 font-num">{HKD(total)}</div>
            </Card>
            <Card className="p-5 bg-terracotta-soft border-terracotta/20" data-testid="recurring-summary-annual">
              <div className="text-[11px] uppercase tracking-[0.2em] text-terracotta">Annual outlook</div>
              <div className="font-heading text-2xl mt-1 font-num text-terracotta">{HKD(annual)}</div>
              <div className="text-xs text-[color:var(--text-secondary)] mt-1">if nothing changes</div>
            </Card>
          </div>

          <Card className="overflow-hidden" data-testid="recurring-list">
            <div className="divide-y divide-sand-200">
              {items.map((r, i) => {
                const initial = String(r.merchant || "?").trim().slice(0, 1).toUpperCase();
                return (
                  <div key={`${r.merchant}-${i}`} className="px-4 py-4 flex items-center gap-4" data-testid={`recurring-${i}`}>
                    <div className="w-10 h-10 rounded-full bg-sand-100 flex items-center justify-center text-sm font-medium">{initial}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.merchant}</div>
                      <div className="text-[11px] text-[color:var(--text-secondary)] mt-0.5 capitalize">
                        {r.category} · {r.account} · {r.occurrences} charges
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-[color:var(--text-secondary)] flex items-center gap-1 justify-end">
                        <CalendarClock size={11} /> {r.next_expected ? `next ~ ${shortDate(r.next_expected)}` : "recurring"}
                      </div>
                      <div className="text-xs text-[color:var(--text-muted)] mt-0.5">last {shortDate(r.last_date)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-num tabular-nums font-medium">
                        {HKD(r.monthly_cost)}
                        <span className="text-[10px] text-[color:var(--text-secondary)]">/mo</span>
                      </div>
                      <div className="text-[11px] text-[color:var(--text-secondary)] font-num">
                        {HKD(r.annual_cost)}
                        <span className="text-[10px]">/yr</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cancelMerchant(r.merchant)}
                      data-testid={`recurring-cancel-${i}`}
                      className="flex-shrink-0"
                    >
                      <Trash2 size={13} className="mr-1" /> Cancel
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </Page>
  );
}
