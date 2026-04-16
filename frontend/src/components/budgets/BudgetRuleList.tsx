import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { Badge, SectionCard } from "../ui";
import type { Alert, Bootstrap, Rule } from "../../types/finance";

dayjs.extend(isoWeek);

function getTransactionsForRule(data: Bootstrap, rule: Rule) {
  return data.transactions.filter((tx) => {
    const date = dayjs(tx.date);
    if (rule.period === "daily" && tx.date !== dayjs().format("YYYY-MM-DD")) return false;
    if (rule.period === "weekly" && (date.isoWeek() !== dayjs().isoWeek() || date.year() !== dayjs().year())) return false;
    if (rule.period === "monthly" && (date.month() !== dayjs().month() || date.year() !== dayjs().year())) return false;
    return !rule.category || rule.ruleType === "category_percentage" ? true : tx.category === rule.category;
  });
}

function describeRule(rule: Rule) {
  if (rule.ruleType === "period_cap") return `${rule.period} spending must stay under HK$${rule.threshold.toFixed(2)}`;
  if (rule.ruleType === "category_cap") return `${rule.category} ${rule.period} spend must stay under HK$${rule.threshold.toFixed(2)}`;
  if (rule.ruleType === "category_percentage") return `${rule.category} share must stay under ${rule.threshold}%`;
  if (rule.ruleType === "consecutive_overspend") return `Streak warning above HK$${rule.threshold.toFixed(2)} per day`;
  if (rule.ruleType === "recurring_threshold") return `Recurring spend must stay under HK$${rule.threshold.toFixed(2)}`;
  return `Warn after more than ${rule.threshold} uncategorized entries`;
}

function currentValue(data: Bootstrap, rule: Rule) {
  const scoped = getTransactionsForRule(data, rule);
  if (rule.ruleType === "category_percentage") {
    const total = scoped.reduce((sum, tx) => sum + tx.amount, 0);
    const category = scoped.filter((tx) => tx.category === rule.category).reduce((sum, tx) => sum + tx.amount, 0);
    return `${total > 0 ? ((category / total) * 100).toFixed(1) : "0.0"}%`;
  }
  if (rule.ruleType === "uncategorized_warning") {
    return `${scoped.filter((tx) => tx.category === "Uncategorized").length} entries`;
  }
  if (rule.ruleType === "recurring_threshold") {
    return `HK$${data.recurring.reduce((sum, item) => sum + item.totalLast30Days, 0).toFixed(2)}`;
  }
  return `HK$${scoped.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)}`;
}

function toneForAlert(alert: Alert | undefined) {
  if (!alert) return "success";
  if (alert.severity === "critical") return "critical";
  if (alert.severity === "warning") return "warning";
  return "info";
}

export function BudgetRuleList({ data }: { data: Bootstrap }) {
  return (
    <SectionCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Active rules</h2>
        <Badge tone={data.rules.length > 0 ? "default" : "info"}>{data.rules.length} rules</Badge>
      </div>
      {data.rules.length === 0 ? <p className="text-sm text-slate-400">No rules created yet. Start with a weekly cap or recurring threshold.</p> : null}
      <ul className="space-y-3">
        {data.rules.map((rule) => {
          const alert = data.alerts.find((entry) => entry.ruleId === rule.id);
          return (
            <li key={rule.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-100">{describeRule(rule)}</p>
                  <p className="mt-1 text-sm text-slate-400">Current value: {currentValue(data, rule)}</p>
                </div>
                <Badge tone={toneForAlert(alert)}>{alert ? alert.status.replace("_", " ") : "ok"}</Badge>
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
