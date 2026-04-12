import { useEffect, useState } from "react";
import { createRule, createTransaction, fetchBootstrap, importScenario } from "./api/client";
import { PrimaryButton } from "./components/ui";
import { BudgetsPage } from "./pages/BudgetsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ReportsPage } from "./pages/ReportsPage";
import { ScenariosPage } from "./pages/ScenariosPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import type { Bootstrap, RuleFormState, TransactionFormState } from "./types/finance";

const tabs = ["Dashboard", "Transactions", "Budgets", "Reports", "Scenarios"] as const;

function App() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Dashboard");
  const [data, setData] = useState<Bootstrap | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<TransactionFormState>({ date: "", amount: "", category: "Meals", description: "", notes: "" });
  const [ruleForm, setRuleForm] = useState<RuleFormState>({
    category: "Meals",
    period: "daily",
    threshold: "50",
    ruleType: "category_cap",
  });

  const load = async () => {
    try {
      const json = await fetchBootstrap();
      setData(json);
      setError("");
    } catch {
      setError("Could not connect to backend. Start backend with `npm run dev` in backend folder.");
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const addTransaction = async () => {
    if (!form.date || !form.amount || !form.category || !form.description) return;
    await createTransaction(form);
    setForm({ date: "", amount: "", category: form.category, description: "", notes: "" });
    await load();
  };

  const addRule = async () => {
    await createRule(ruleForm);
    await load();
  };

  const runScenario = async (name: string) => {
    await importScenario(name);
    await load();
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">Financial Assistant</h1>
          <p className="text-slate-300">Rule-driven budgeting app for analytics, alerts, and scenario evaluations.</p>
        </header>
        <nav className="mb-6 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`rounded-lg px-4 py-2 text-sm ${tab === item ? "bg-violet-500 text-white" : "bg-slate-800 text-slate-200"}`}
            >
              {item}
            </button>
          ))}
          <PrimaryButton className="bg-emerald-600 text-sm" onClick={() => void load()}>Refresh</PrimaryButton>
        </nav>

        {error ? <div className="rounded-lg border border-rose-400 bg-rose-500/20 p-3 text-rose-200">{error}</div> : null}

        {tab === "Dashboard" && data && <DashboardPage data={data} />}
        {tab === "Transactions" && data && <TransactionsPage data={data} form={form} setForm={setForm} addTransaction={addTransaction} />}
        {tab === "Budgets" && data && <BudgetsPage data={data} ruleForm={ruleForm} setRuleForm={setRuleForm} addRule={addRule} />}
        {tab === "Reports" && data && <ReportsPage data={data} />}
        {tab === "Scenarios" && <ScenariosPage runScenario={runScenario} />}
      </div>
    </main>
  );
}

export default App;
