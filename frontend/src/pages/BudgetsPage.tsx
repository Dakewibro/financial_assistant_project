import { Input, PrimaryButton, SectionCard, Select } from "../components/ui";
import type { Bootstrap, Rule, RuleFormState } from "../types/finance";

export function BudgetsPage({
  data,
  ruleForm,
  setRuleForm,
  addRule,
}: {
  data: Bootstrap;
  ruleForm: RuleFormState;
  setRuleForm: (form: RuleFormState) => void;
  addRule: () => Promise<void>;
}) {
  return (
    <section className="space-y-4">
      <SectionCard className="grid gap-2 md:grid-cols-5">
        <Select value={ruleForm.ruleType} onChange={(e) => setRuleForm({ ...ruleForm, ruleType: e.target.value as Rule["ruleType"] })}>
          <option value="category_cap">Category cap</option>
          <option value="period_cap">Period cap</option>
          <option value="category_percentage">Category %</option>
          <option value="consecutive_overspend">Consecutive overspend</option>
          <option value="uncategorized_warning">Uncategorized warning</option>
        </Select>
        <Select value={ruleForm.category} onChange={(e) => setRuleForm({ ...ruleForm, category: e.target.value })}>
          {data.categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </Select>
        <Select value={ruleForm.period} onChange={(e) => setRuleForm({ ...ruleForm, period: e.target.value as Rule["period"] })}>
          <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
        </Select>
        <Input value={ruleForm.threshold} onChange={(e) => setRuleForm({ ...ruleForm, threshold: e.target.value })} />
        <PrimaryButton onClick={() => void addRule()}>Add Rule</PrimaryButton>
      </SectionCard>
      <ul className="space-y-2">
        {data.rules.map((rule) => (
          <li key={rule.id} className="rounded bg-slate-900 p-3 text-sm">
            {rule.ruleType} ({rule.period}) threshold {rule.threshold}
          </li>
        ))}
      </ul>
    </section>
  );
}
