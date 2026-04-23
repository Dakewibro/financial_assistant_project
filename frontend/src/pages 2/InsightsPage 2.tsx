import { CashOutlookCard } from "../components/dashboard/CashOutlookCard";
import { InsightList } from "../components/dashboard/InsightList";
import { TrendChart } from "../components/dashboard/TrendChart";
import type { Bootstrap } from "../types/finance";

export function InsightsPage({ data }: { data: Bootstrap }) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Insights</p>
        <h1 className="text-2xl font-medium">What to do next</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Start from a single headline, inspect contributors, then jump into filtered transactions.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <TrendChart summary={data.summary} />
        <InsightList insights={data.insights} />
      </div>
      <CashOutlookCard data={data} />
    </section>
  );
}
