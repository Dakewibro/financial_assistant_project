import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, AlertTriangle, Check } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { Card, EmptyState, ErrorBanner, Page, PageHeader, Skel, Chip } from "../components/Shared";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const FILTERS = ["active", "all", "acknowledged"];

export default function Alerts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("active");

  const load = async () => {
    setLoading(true); setErr("");
    try { const { data } = await api.get("/alerts"); setItems(data); }
    catch (e) { setErr(formatApiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const ack = async (id) => {
    try { await api.post(`/alerts/${id}/ack`); toast.success("Acknowledged"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const visible = items.filter(a => {
    if (filter === "active") return !a.acknowledged;
    if (filter === "acknowledged") return a.acknowledged;
    return true;
  });

  return (
    <Page>
      <PageHeader title="Alerts" subtitle="Low-noise, actionable signals from your rules." />

      <div className="flex items-center gap-1.5 mb-5">
        {FILTERS.map(f => <Chip key={f} active={filter === f} onClick={() => setFilter(f)} testid={`alerts-filter-${f}`}>{f}</Chip>)}
        <div className="ml-auto text-xs text-[color:var(--text-secondary)]" data-testid="alerts-count">{visible.length} {filter}</div>
      </div>

      {err && <div className="mb-4"><ErrorBanner message={err} onRetry={load} /></div>}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-20" />)}</div>
      ) : visible.length === 0 ? (
        <Card className="p-2">
          <EmptyState
            icon={filter === "active" ? Bell : Check}
            title={filter === "active" ? "You're all clear" : filter === "acknowledged" ? "No past alerts" : "No alerts"}
            body={filter === "active" ? "No budgets tripped, nothing unusual. Keep going." : "Resolved alerts will show up here."}
            action={filter === "active" && <Link to="/budgets"><Button variant="ghost" data-testid="alerts-manage-budgets">Manage budgets</Button></Link>}
            testid="alerts-empty"
          />
        </Card>
      ) : (
        <div className="space-y-3" data-testid="alerts-list">
          {visible.map(a => (
            <Card key={a.id} className={`p-4 flex items-start gap-4 ${a.severity === "critical" ? "border-l-4 border-l-terracotta" : "border-l-4 border-l-[#B37E1E]"}`} data-testid={`alert-${a.id}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${a.severity === "critical" ? "bg-terracotta-soft text-terracotta" : "bg-[#FFF5E6] text-[#B37E1E]"}`}>
                <AlertTriangle size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] uppercase tracking-[0.2em] font-medium ${a.severity === "critical" ? "text-terracotta" : "text-[#B37E1E]"}`}>{a.severity}</span>
                  <span className="text-[10px] text-[color:var(--text-muted)]">·</span>
                  <span className="text-[10px] text-[color:var(--text-secondary)] capitalize">{a.category} · {a.account}</span>
                </div>
                <div className="text-sm font-medium mt-1">{a.message}</div>
                <div className="text-xs text-[color:var(--text-secondary)] mt-1">
                  Try: <Link to="/budgets" className="text-moss hover:underline">raise the limit</Link>, <Link to="/transactions" className="text-moss hover:underline">re-categorise</Link>, or pause spending.
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {!a.acknowledged ? (
                  <Button size="sm" variant="outline" onClick={() => ack(a.id)} data-testid={`ack-${a.id}`}>
                    <Check size={14} className="mr-1" /> Ack
                  </Button>
                ) : (
                  <span className="text-[11px] text-moss bg-moss-soft px-2 py-1 rounded">Acknowledged</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}
