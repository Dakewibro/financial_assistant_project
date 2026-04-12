import type { Bootstrap, RuleFormState, TransactionFormState } from "../types/finance";

const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:4000";

function apiUrl(path: string): string {
  return `${apiBase}${path}`;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export function fetchBootstrap(): Promise<Bootstrap> {
  return request<Bootstrap>(apiUrl("/api/bootstrap"));
}

export async function createTransaction(form: TransactionFormState): Promise<void> {
  await request(apiUrl("/api/transactions"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: form.date,
      amount: Number(form.amount),
      category: form.category,
      description: form.description,
      notes: form.notes || undefined,
    }),
  });
}

export async function createRule(form: RuleFormState): Promise<void> {
  await request(apiUrl("/api/rules"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: form.category,
      period: form.period,
      threshold: Number(form.threshold),
      ruleType: form.ruleType,
      enabled: true,
    }),
  });
}

export async function importScenario(name: string): Promise<void> {
  const scenario = await request(`/scenarios/${name}.json`);
  await request(apiUrl("/api/import"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scenario),
  });
}
