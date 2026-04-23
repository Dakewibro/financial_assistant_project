import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Plus, Filter, Trash2, X } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { HKD, shortDate, fullDate } from "../lib/format";
import { Card, EmptyState, ErrorBanner, Page, PageHeader, Skel, Chip } from "../components/Shared";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import QuickAddDialog from "../components/QuickAddDialog";
import { toast } from "sonner";

const ACCOUNTS = ["all", "personal", "business"];
const TYPES = ["all", "expense", "income"];

export default function Transactions() {
  const [searchParams] = useSearchParams();
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [account, setAccount] = useState("all");
  const [type, setType] = useState("all");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [categories, setCategories] = useState([]);
  const [catFilter, setCatFilter] = useState(searchParams.get("category") || "all");

  const load = async () => {
    setLoading(true); setErr("");
    const params = new URLSearchParams();
    if (q.trim()) params.append("q", q.trim());
    if (account !== "all") params.append("account", account);
    if (type !== "all") params.append("type", type);
    if (catFilter !== "all") params.append("category", catFilter);
    try {
      const { data } = await api.get(`/transactions?${params.toString()}`);
      setTxns(data);
    } catch (e) { setErr(formatApiError(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [account, type, catFilter]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [q]);
  useEffect(() => { api.get("/categories").then(r => setCategories(r.data.categories || [])).catch(() => {}); }, []);

  const del = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await api.delete(`/transactions/${id}`);
      toast.success("Deleted");
      setSelected(null);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const filtersActive = q || account !== "all" || type !== "all" || catFilter !== "all";

  return (
    <Page>
      <PageHeader
        title="Transactions"
        subtitle="Capture, search, and tidy up your spending."
        right={
          <Button onClick={() => setOpen(true)} data-testid="add-transaction-btn" className="bg-moss hover:bg-moss-hover text-white">
            <Plus size={15} className="mr-1.5" /> Quick add
          </Button>
        }
      />

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} data-testid="search-input" placeholder="Search merchant or note..." className="pl-9" />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Filter size={14} className="text-[color:var(--text-muted)] mr-1" />
            <span className="text-xs text-[color:var(--text-secondary)] mr-1">Account</span>
            {ACCOUNTS.map(a => <Chip key={a} active={account === a} onClick={() => setAccount(a)} testid={`filter-account-${a}`}>{a}</Chip>)}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-[color:var(--text-secondary)] mr-1">Type</span>
            {TYPES.map(t => <Chip key={t} active={type === t} onClick={() => setType(t)} testid={`filter-type-${t}`}>{t}</Chip>)}
          </div>
        </div>
        {categories.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mt-3 pt-3 border-t border-sand-200">
            <span className="text-xs text-[color:var(--text-secondary)] mr-1">Category</span>
            <Chip active={catFilter === "all"} onClick={() => setCatFilter("all")} testid="filter-cat-all">all</Chip>
            {categories.map(c => (
              <Chip key={c} active={catFilter === c} onClick={() => setCatFilter(c)} testid={`filter-cat-${c.replace(/\s+/g,'-').toLowerCase()}`}>{c}</Chip>
            ))}
          </div>
        )}
      </Card>

      {err && <div className="mb-4"><ErrorBanner message={err} onRetry={load} /></div>}

      {loading ? (
        <Card className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skel key={i} className="h-12" />)}
        </Card>
      ) : txns.length === 0 ? (
        <Card className="p-2">
          <EmptyState
            icon={Search}
            title={filtersActive ? "No matches" : "No transactions yet"}
            body={filtersActive ? "Try clearing filters or searching differently." : "Add your first transaction to start tracking."}
            action={filtersActive
              ? <Button variant="ghost" onClick={() => { setQ(""); setAccount("all"); setType("all"); setCatFilter("all"); }} data-testid="clear-filters-btn">Clear filters</Button>
              : <Button onClick={() => setOpen(true)} className="bg-moss hover:bg-moss-hover text-white" data-testid="empty-add-btn">Add transaction</Button>}
            testid="txn-empty"
          />
        </Card>
      ) : (
        <Card className="overflow-hidden" data-testid="txn-list">
          <div className="divide-y divide-sand-200">
            {txns.map(t => (
              <button key={t.id} onClick={() => setSelected(t)} data-testid={`txn-row-${t.id}`}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sand-100 transition-colors text-left">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium ${t.type === "income" ? "bg-moss-soft text-moss" : "bg-sand-100"}`}>
                  {t.merchant.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.merchant}</div>
                  <div className="text-[11px] text-[color:var(--text-secondary)] mt-0.5">
                    {shortDate(t.date)} · {t.category} · <span className="capitalize">{t.account}</span>
                  </div>
                </div>
                <div className={`text-sm font-num tabular-nums ${t.type === "income" ? "text-moss" : ""}`}>
                  {t.type === "income" ? "+" : "-"}{HKD(t.amount)}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      <QuickAddDialog open={open} onClose={() => setOpen(false)} onSaved={load} />

      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="bg-white w-full sm:max-w-md" data-testid="txn-detail-sheet">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-heading">Transaction details</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <div>
                  <div className="text-xs text-[color:var(--text-secondary)]">Merchant</div>
                  <div className="font-heading text-xl mt-1">{selected.merchant}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Amount" value={<span className={selected.type === "income" ? "text-moss" : ""}>{selected.type === "income" ? "+" : "-"}{HKD(selected.amount)}</span>} />
                  <DetailItem label="Type" value={<span className="capitalize">{selected.type}</span>} />
                  <DetailItem label="Category" value={selected.category} />
                  <DetailItem label="Account" value={<span className="capitalize">{selected.account}</span>} />
                  <DetailItem label="Date" value={fullDate(selected.date)} />
                  <DetailItem label="Recurring" value={selected.is_recurring ? "Yes" : "No"} />
                </div>
                {selected.note && <DetailItem label="Note" value={selected.note} />}
                <div className="flex gap-2 pt-4 border-t border-sand-200">
                  <Button variant="ghost" onClick={() => setSelected(null)} data-testid="detail-close-btn"><X size={14} className="mr-1.5" /> Close</Button>
                  <Button onClick={() => del(selected.id)} data-testid="detail-delete-btn" className="bg-terracotta hover:bg-terracotta/90 text-white ml-auto">
                    <Trash2 size={14} className="mr-1.5" /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Page>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <div className="text-[11px] text-[color:var(--text-secondary)] uppercase tracking-[0.15em]">{label}</div>
      <div className="text-sm mt-1 font-medium font-num tabular-nums">{value}</div>
    </div>
  );
}
