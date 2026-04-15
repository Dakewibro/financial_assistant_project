import { BudgetRuleForm } from "../components/budgets/BudgetRuleForm";
import { BudgetRuleList } from "../components/budgets/BudgetRuleList";
import type { Bootstrap, RuleFormState } from "../types/finance";

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
      <BudgetRuleForm data={data} ruleForm={ruleForm} setRuleForm={setRuleForm} addRule={addRule} />
      <BudgetRuleList data={data} />
    </section>
  );
}
