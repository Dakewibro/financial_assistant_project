import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionCard } from "../ui";
import type { Summary } from "../../types/finance";

export function TrendChart({ summary }: { summary: Summary }) {
  return (
    <SectionCard className="h-80">
      <h2 className="mb-4 text-lg font-semibold">7-day trend</h2>
      <ResponsiveContainer>
        <AreaChart data={summary.trend7Days}>
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.65} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <Tooltip />
          <Area type="monotone" dataKey="amount" stroke="#34d399" fill="url(#trend-fill)" />
        </AreaChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}
