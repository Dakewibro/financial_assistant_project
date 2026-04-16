import type { Bootstrap, RuleFormState, TransactionFiltersState, TransactionFormState } from "../types/finance";

const apiBase = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:4000" : "");

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || `Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export function fetchBootstrap(): Promise<Bootstrap> {
  return request<Bootstrap>(`${apiBase}/api/bootstrap`);
}

export function fetchTransactions(filters: Partial<TransactionFiltersState>) {
  const params = new URLSearchParams();
  if (filters.category && filters.category !== "all") params.set("category", filters.category);
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);
  if (filters.scope && filters.scope !== "all") params.set("scope", filters.scope);
  if (filters.recurringOnly) params.set("recurringOnly", "true");
  if (filters.search) params.set("search", filters.search);
  return request(`${apiBase}/api/transactions?${params.toString()}`);
}

export async function createTransaction(form: TransactionFormState): Promise<void> {
  await request(`${apiBase}/api/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: form.date,
      amount: Number(form.amount),
      category: form.category,
      description: form.description,
      notes: form.notes || undefined,
      scope: form.scope,
    }),
  });
}

export async function createRule(form: RuleFormState): Promise<void> {
  await request(`${apiBase}/api/rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: form.category || undefined,
      period: form.period,
      threshold: Number(form.threshold),
      ruleType: form.ruleType,
      enabled: true,
    }),
  });
}

export async function createCategory(name: string): Promise<void> {
  await request(`${apiBase}/api/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export async function importScenario(name: string): Promise<void> {
  const scenario = await request(`/scenarios/${name}.json`);
  await request(`${apiBase}/api/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scenario),
  });
}
