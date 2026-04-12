import { Input, PrimaryButton, SectionCard, Select } from "../components/ui";
import type { Bootstrap, TransactionFormState } from "../types/finance";

export function TransactionsPage({
  data,
  form,
  setForm,
  addTransaction,
}: {
  data: Bootstrap;
  form: TransactionFormState;
  setForm: (form: TransactionFormState) => void;
  addTransaction: () => Promise<void>;
}) {
  return (
    <section className="space-y-4">
      <SectionCard className="grid gap-2 md:grid-cols-5">
        <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <Input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {data.categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </Select>
        <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <PrimaryButton onClick={() => void addTransaction()}>Add</PrimaryButton>
      </SectionCard>
      <SectionCard className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-slate-300">
              <th>Date</th><th>Category</th><th>Amount</th><th>Description</th>
            </tr>
          </thead>
          <tbody>
            {data.transactions.map((tx) => (
              <tr key={tx.id} className="border-t border-slate-800">
                <td className="py-2">{tx.date}</td><td>{tx.category}</td><td>HK${tx.amount.toFixed(2)}</td><td>{tx.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </section>
  );
}
