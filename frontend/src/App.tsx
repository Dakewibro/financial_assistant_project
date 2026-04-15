import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { createCategory, createRule, createTransaction, fetchBootstrap, importScenario } from "./api/client";
import { PrimaryButton } from "./components/ui";
import { BudgetsPage } from "./pages/BudgetsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ReportsPage } from "./pages/ReportsPage";
import { ScenariosPage } from "./pages/ScenariosPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import type { Bootstrap, RuleFormState, TransactionFormState } from "./types/finance";

const tabs = ["Dashboard", "Transactions", "Budgets", "Reports", "Scenarios"] as const;

function createTransactionState(category = "Food"): TransactionFormState {
  return {
    date: dayjs().format("YYYY-MM-DD"),
    amount: "",
    category,
    description: "",
    notes: "",
    scope: "personal",
  };
}

function createRuleState(category = "Food"): RuleFormState {
  return {
    category,
    period: "weekly",
    threshold: "400",
    ruleType: "category_cap",
  };
}

function App() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Dashboard");
  const [data, setData] = useState<Bootstrap | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<TransactionFormState>(createTransactionState());
  const [ruleForm, setRuleForm] = useState<RuleFormState>(createRuleState());

  const load = async () => {
    try {
      const json = await fetchBootstrap();
      setData(json);
      setError("");
      setForm((current) => ({
        ...current,
        date: current.date || dayjs().format("YYYY-MM-DD"),
        category: json.categories.includes(current.category) ? current.category : json.categories[0] ?? "Food",
      }));
      setRuleForm((current) => ({
        ...current,
        category: json.categories.includes(current.category) ? current.category : json.categories[0] ?? "Food",
      }));
    } catch {
      setError("Could not connect to backend. Start backend with `npm run dev` in the backend folder.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const addTransaction = async () => {
    if (!form.date || !form.amount || !form.category || !form.description) return;
    await createTransaction(form);
    setForm((current) => ({
      ...createTransactionState(current.category),
      scope: current.scope,
    }));
    await load();
  };

  const addRule = async () => {
    await createRule(ruleForm);
    await load();
  };

  const addCategoryName = async (name: string) => {
    await createCategory(name);
    await load();
  };

  const runScenario = async (name: string) => {
    await importScenario(name);
    await load();
    setTab("Dashboard");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Lean MVP</p>
            <h1 className="mt-2 text-3xl font-semibold">Financial Assistant</h1>
            <p className="mt-2 max-w-3xl text-slate-300">
              Assisted spending capture, budget pacing, recurring trap detection, and actionable insights for personal and small-business finance.
            </p>
          </div>
          <PrimaryButton className="w-fit" onClick={() => void load()}>
            Refresh data
          </PrimaryButton>
        </header>

        <nav className="mb-6 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`rounded-xl px-4 py-2 text-sm ${
                tab === item ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-200"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        {error ? <div className="mb-4 rounded-xl border border-rose-400 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div> : null}

        {tab === "Dashboard" && data && <DashboardPage data={data} />}
        {tab === "Transactions" && data && (
          <TransactionsPage data={data} form={form} setForm={setForm} addTransaction={addTransaction} addCategory={addCategoryName} />
        )}
        {tab === "Budgets" && data && <BudgetsPage data={data} ruleForm={ruleForm} setRuleForm={setRuleForm} addRule={addRule} />}
        {tab === "Reports" && data && <ReportsPage data={data} />}
        {tab === "Scenarios" && <ScenariosPage runScenario={runScenario} />}
      </div>
    </main>
  );
}

export default App;
