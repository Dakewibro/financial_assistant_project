import { useState } from "react";
import { TransactionFilters } from "../components/transactions/TransactionFilters";
import { TransactionForm } from "../components/transactions/TransactionForm";
import { TransactionTable } from "../components/transactions/TransactionTable";
import { suggestCategory } from "../lib/merchant";
import type { Bootstrap, TransactionFiltersState, TransactionFormState } from "../types/finance";

const defaultFilters: TransactionFiltersState = {
  category: "all",
  fromDate: "",
  toDate: "",
  scope: "all",
  recurringOnly: false,
  search: "",
};

export function TransactionsPage({
  data,
  form,
  setForm,
  addTransaction,
  addCategory,
}: {
  data: Bootstrap;
  form: TransactionFormState;
  setForm: (form: TransactionFormState) => void;
  addTransaction: () => Promise<void>;
  addCategory: (name: string) => Promise<void>;
}) {
  const [filters, setFilters] = useState<TransactionFiltersState>(defaultFilters);
  const [newCategory, setNewCategory] = useState("");
  const suggestion = suggestCategory(form.description, data.recent.merchantCategoryHints);
  const recurringKeys = new Set(data.recurring.map((item) => `${item.scope}:${item.normalizedMerchant}`));

  const filteredTransactions = data.transactions.filter((tx) => {
    if (filters.category !== "all" && tx.category !== filters.category) return false;
    if (filters.scope !== "all" && tx.scope !== filters.scope) return false;
    if (filters.fromDate && tx.date < filters.fromDate) return false;
    if (filters.toDate && tx.date > filters.toDate) return false;
    if (filters.recurringOnly && !recurringKeys.has(`${tx.scope}:${tx.normalizedMerchant}`)) return false;
    if (filters.search) {
      const haystack = `${tx.description} ${tx.normalizedMerchant} ${tx.category}`.toLowerCase();
      if (!haystack.includes(filters.search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <section className="space-y-4">
      <TransactionForm
        data={data}
        form={form}
        setForm={setForm}
        addTransaction={addTransaction}
        addCategory={async () => {
          if (!newCategory.trim()) return;
          await addCategory(newCategory);
          setNewCategory("");
        }}
        suggestedCategory={suggestion}
        applyLastTransaction={() => {
          if (!data.recent.lastTransaction) return;
          setForm({
            date: data.recent.lastTransaction.date,
            amount: String(data.recent.lastTransaction.amount),
            category: data.recent.lastTransaction.category,
            description: data.recent.lastTransaction.description,
            notes: data.recent.lastTransaction.notes ?? "",
            scope: data.recent.lastTransaction.scope,
          });
        }}
        newCategory={newCategory}
        setNewCategory={setNewCategory}
      />
      <TransactionFilters filters={filters} setFilters={setFilters} categories={data.categories} />
      <TransactionTable transactions={filteredTransactions} />
    </section>
  );
}
