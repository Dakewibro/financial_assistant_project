import { Badge, SectionCard } from "../ui";
import type { Insight } from "../../types/finance";

function toneForInsight(insight: Insight) {
  if (insight.severity === "critical") return "critical";
  if (insight.severity === "warning") return "warning";
  return "info";
}

export function InsightList({ insights }: { insights: Insight[] }) {
  return (
    <SectionCard className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">What to do next</h2>
        <Badge tone="default">{insights.length} insights</Badge>
      </div>
      {insights.length === 0 ? <p className="text-sm text-slate-400">Add transactions and budgets to unlock guidance.</p> : null}
      <ul className="space-y-3">
        {insights.map((insight) => (
          <li key={insight.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-slate-100">{insight.title}</p>
              <Badge tone={toneForInsight(insight)}>{insight.severity}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-400">{insight.message}</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
