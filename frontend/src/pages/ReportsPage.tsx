import { SectionCard } from "../components/ui";
import type { Bootstrap } from "../types/finance";

export function ReportsPage({ data }: { data: Bootstrap }) {
  return (
    <SectionCard className="space-y-3">
      <h2 className="text-lg font-medium">Top Categories</h2>
      <ul>
        {data.summary.top3Categories.map((entry) => (
          <li key={entry.category}>
            {entry.category}: HK${entry.amount.toFixed(2)}
          </li>
        ))}
      </ul>
      <p className="text-sm text-slate-300">Weekly total: HK${data.summary.weeklyTotal.toFixed(2)}</p>
    </SectionCard>
  );
}
