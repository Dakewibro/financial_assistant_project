import { AlertFeed } from "../components/dashboard/AlertFeed";
import { InsightList } from "../components/dashboard/InsightList";
import { RecurringSpendCard } from "../components/dashboard/RecurringSpendCard";
import { SummaryCards } from "../components/dashboard/SummaryCards";
import { TrendChart } from "../components/dashboard/TrendChart";
import { SectionCard } from "../components/ui";
import type { Bootstrap } from "../types/finance";

export function DashboardPage({ data }: { data: Bootstrap }) {
  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCards data={data} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <TrendChart summary={data.summary} />
        <InsightList insights={data.insights} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <AlertFeed alerts={data.alerts} />
        <RecurringSpendCard recurring={data.recurring} />
      </div>

      <SectionCard>
        <h2 className="mb-3 text-lg font-semibold">Top categories</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {data.summary.top3Categories.map((entry) => (
            <div key={entry.category} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-sm text-slate-400">{entry.category}</p>
              <p className="mt-2 text-xl font-semibold">HK${entry.amount.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </section>
  );
}
