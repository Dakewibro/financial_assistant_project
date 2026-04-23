import { RecurringSpendCard } from "../components/dashboard/RecurringSpendCard";
import { SectionCard } from "../components/ui";
import { formatHKD } from "../lib/currency";
import type { Bootstrap } from "../types/finance";

export function RecurringPage({ data }: { data: Bootstrap }) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Recurring</p>
        <h1 className="text-2xl font-medium">Recurring spend signals</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Track subscriptions and habitual charges to prevent silent monthly drift.
        </p>
      </div>
      <RecurringSpendCard recurring={data.recurring} />
      <SectionCard>
        <h2 className="text-lg font-semibold">Recurring merchants</h2>
        {data.recurring.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">No recurring patterns detected yet. Keep adding transactions to improve detection.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {data.recurring.map((item) => (
              <li key={item.id} className="flex items-center justify-between border-b border-[var(--border)] py-2 text-sm">
                <span>{item.displayName}</span>
                <span className="tabular-nums">{formatHKD(item.totalLast30Days)}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </section>
  );
}
