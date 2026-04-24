/**
 * API uses `description` + `scope` + `notes`; several UI surfaces still expect
 * `merchant` + `account` + `note` (+ optional `type`). Normalize once after fetch.
 */
export function normalizeTransactionRow(t) {
  if (!t) return t;
  const merchant = t.merchant ?? t.description ?? "";
  const account = t.account ?? t.scope ?? "personal";
  const type = t.type ?? (typeof t.amount === "number" && t.amount < 0 ? "income" : "expense");
  return {
    ...t,
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
