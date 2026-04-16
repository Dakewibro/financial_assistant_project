import { Input, PrimaryButton, SectionCard, Select } from "../ui";
import type { Bootstrap, Rule, RuleFormState } from "../../types/finance";

export function BudgetRuleForm({
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
    <SectionCard className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Rule templates</h2>
        <p className="text-sm text-slate-400">Keep the UI simple while covering common overspending and recurring-risk cases.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        <Select value={ruleForm.ruleType} onChange={(e) => setRuleForm({ ...ruleForm, ruleType: e.target.value as Rule["ruleType"] })}>
          <option value="category_cap">Category cap</option>
          <option value="period_cap">Overall period cap</option>
          <option value="category_percentage">Category share</option>
          <option value="consecutive_overspend">Overspend streak</option>
          <option value="uncategorized_warning">Uncategorized warning</option>
          <option value="recurring_threshold">Recurring threshold</option>
        </Select>
        <Select value={ruleForm.category} onChange={(e) => setRuleForm({ ...ruleForm, category: e.target.value })}>
          {data.categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </Select>
        <Select value={ruleForm.period} onChange={(e) => setRuleForm({ ...ruleForm, period: e.target.value as Rule["period"] })}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </Select>
        <Input
          value={ruleForm.threshold}
          placeholder="Threshold"
          onChange={(e) => setRuleForm({ ...ruleForm, threshold: e.target.value })}
        />
        <PrimaryButton onClick={() => void addRule()}>Add rule</PrimaryButton>
      </div>
    </SectionCard>
  );
}
