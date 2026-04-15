import { Input, PrimaryButton, SecondaryButton, SectionCard, Select } from "../ui";
import type { Bootstrap, TransactionFormState } from "../../types/finance";

export function TransactionForm({
  data,
  form,
  setForm,
  addTransaction,
  addCategory,
  suggestedCategory,
  applyLastTransaction,
  newCategory,
  setNewCategory,
}: {
  data: Bootstrap;
  form: TransactionFormState;
  setForm: (form: TransactionFormState) => void;
  addTransaction: () => Promise<void>;
  addCategory: () => Promise<void>;
  suggestedCategory: { category: string; source: "history" | "keyword" | "default"; confidence: "high" | "medium" | "low" } | null;
  applyLastTransaction: () => void;
  newCategory: string;
  setNewCategory: (value: string) => void;
}) {
  return (
    <SectionCard className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Quick add</h2>
          <p className="text-sm text-slate-400">Capture spending quickly, then let the app highlight risk.</p>
        </div>
        <SecondaryButton onClick={applyLastTransaction} className="text-xs">
          Repeat last transaction
        </SecondaryButton>
      </div>

      <div className="grid gap-3 md:grid-cols-6">
        <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <Input
          type="number"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {data.categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </Select>
        <Select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as TransactionFormState["scope"] })}>
          <option value="personal">Personal</option>
          <option value="business">Business</option>
        </Select>
        <Input
          placeholder="Merchant or description"
          value={form.description}
          list="recent-descriptions"
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <PrimaryButton onClick={() => void addTransaction()}>Add transaction</PrimaryButton>
      </div>

      <Input
        placeholder="Optional notes"
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
      />

      {suggestedCategory && form.description.trim().length > 0 ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          Suggested category: <strong>{suggestedCategory.category}</strong> via {suggestedCategory.source}
          {suggestedCategory.category !== form.category ? (
            <button
              className="ml-3 rounded-lg border border-emerald-400/40 px-2 py-1 text-xs"
              onClick={() => setForm({ ...form, category: suggestedCategory.category })}
            >
              Apply suggestion
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <Input
          placeholder="Add custom category"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
        />
        <SecondaryButton onClick={() => void addCategory()}>Add category</SecondaryButton>
      </div>

      <datalist id="recent-descriptions">
        {data.recent.recentDescriptions.map((description) => (
          <option key={description} value={description} />
        ))}
      </datalist>
    </SectionCard>
  );
}
