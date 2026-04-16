import { SectionCard } from "../ui";
import type { Bootstrap } from "../../types/finance";

export function SummaryCards({ data }: { data: Bootstrap }) {
  return (
    <>
      <SectionCard>
        <p className="text-sm text-slate-400">Spent this week</p>
        <p className="mt-2 text-2xl font-semibold">HK${data.summary.weeklyTotal.toFixed(2)}</p>
      </SectionCard>
      <SectionCard>
        <p className="text-sm text-slate-400">Spent this month</p>
        <p className="mt-2 text-2xl font-semibold">HK${data.summary.monthlyTotal.toFixed(2)}</p>
      </SectionCard>
      <SectionCard>
        <p className="text-sm text-slate-400">Total recorded</p>
        <p className="mt-2 text-2xl font-semibold">HK${data.summary.totalSpending.toFixed(2)}</p>
      </SectionCard>
      <SectionCard>
        <p className="text-sm text-slate-400">Personal spend</p>
        <p className="mt-2 text-xl font-semibold">HK${data.summary.byScope.personal.toFixed(2)}</p>
      </SectionCard>
      <SectionCard>
        <p className="text-sm text-slate-400">Business spend</p>
        <p className="mt-2 text-xl font-semibold">HK${data.summary.byScope.business.toFixed(2)}</p>
      </SectionCard>
      <SectionCard>
        <p className="text-sm text-slate-400">Today's spend</p>
        <p className="mt-2 text-xl font-semibold">HK${data.summary.dailyTotal.toFixed(2)}</p>
      </SectionCard>
    </>
  );
}
