/**
 * API uses `description` + `scope` + `notes`; several UI surfaces still expect
 * `merchant` + `account` + `note` (+ optional `type`). Normalize once after fetch.
 */
export function normalizeTransactionRow(t) {
  if (!t) return t;
  const merchant = t.merchant ?? t.description ?? "";
  const account = t.account ?? t.scope ?? "personal";
  let flow = t.flow === "income" || t.flow === "expense" ? t.flow : null;
  let amount = typeof t.amount === "number" ? t.amount : t.amount;
  if (flow == null && typeof amount === "number" && amount < 0) {
    flow = "income";
    amount = Math.abs(amount);
  }
  flow = flow ?? "expense";
  const type = t.type ?? (flow === "income" ? "income" : "expense");
  return {
    ...t,
    amount,
    flow,
    merchant,
    account,
    type,
    note: t.note ?? t.notes ?? "",
    is_recurring: Boolean(t.is_recurring),
  };
}

export function normalizeTransactionList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeTransactionRow);
}
