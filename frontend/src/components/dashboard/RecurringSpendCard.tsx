import { Badge, SectionCard } from "../ui";
import type { RecurringGroup } from "../../types/finance";

export function RecurringSpendCard({ recurring }: { recurring: RecurringGroup[] }) {
  return (
    <SectionCard className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recurring traps</h2>
        <Badge tone="info">{recurring.length} detected</Badge>
      </div>
      {recurring.length === 0 ? <p className="text-sm text-slate-400">No recurring spending patterns detected yet.</p> : null}
      <ul className="space-y-3">
        {recurring.slice(0, 5).map((item) => (
          <li key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-100">{item.displayName}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {item.kind} · {item.frequency} · {item.count} charges
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-slate-100">HK${item.totalLast30Days.toFixed(2)}</p>
                <p className="text-xs text-slate-500">last 30 days</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
