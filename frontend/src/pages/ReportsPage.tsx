import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionCard } from "../components/ui";
import type { Bootstrap } from "../types/finance";

export function ReportsPage({ data }: { data: Bootstrap }) {
  const chartData = Object.entries(data.summary.perCategoryTotals).map(([category, amount]) => ({ category, amount }));

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard>
          <h2 className="mb-3 text-lg font-semibold">Top categories</h2>
          <ul className="space-y-2 text-sm text-slate-300">
            {data.summary.top3Categories.map((entry) => (
              <li key={entry.category} className="flex items-center justify-between">
                <span>{entry.category}</span>
                <span>HK${entry.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard>
          <h2 className="mb-3 text-lg font-semibold">Scope split</h2>
          <p className="text-sm text-slate-300">Personal: HK${data.summary.byScope.personal.toFixed(2)}</p>
          <p className="mt-2 text-sm text-slate-300">Business: HK${data.summary.byScope.business.toFixed(2)}</p>
          <p className="mt-4 text-xs text-slate-500">Use the split to keep personal and small-business spending separate without adding accounting complexity.</p>
        </SectionCard>
      </div>

      <SectionCard className="h-96">
        <h2 className="mb-4 text-lg font-semibold">Category breakdown</h2>
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="category" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="amount" fill="#34d399" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>
    </section>
  );
}
