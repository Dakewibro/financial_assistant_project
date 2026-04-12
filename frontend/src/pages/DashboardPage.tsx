import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionCard } from "../components/ui";
import type { Bootstrap } from "../types/finance";

export function DashboardPage({ data }: { data: Bootstrap }) {
  const chartData = Object.entries(data.summary.perCategoryTotals).map(([category, amount]) => ({ category, amount }));
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <SectionCard>Total: HK${data.summary.totalSpending.toFixed(2)}</SectionCard>
      <SectionCard>Today: HK${data.summary.dailyTotal.toFixed(2)}</SectionCard>
      <SectionCard>Month: HK${data.summary.monthlyTotal.toFixed(2)}</SectionCard>
      <SectionCard className="col-span-full h-80">
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="amount" fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>
      <SectionCard className="col-span-full">
        <h2 className="mb-2 text-lg font-medium">Active Alerts</h2>
        <ul className="space-y-2">
          {data.alerts.map((alert) => (
            <li key={alert.id} className="rounded border border-amber-400/40 bg-amber-500/10 p-3">
              <div className="font-medium">{alert.message}</div>
              <div className="text-sm text-slate-300">{alert.evidence}</div>
            </li>
          ))}
          {data.alerts.length === 0 ? <li className="text-slate-400">No active alerts.</li> : null}
        </ul>
      </SectionCard>
    </section>
  );
}
