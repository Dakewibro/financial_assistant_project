import { Badge, SectionCard } from "../ui";
import type { Transaction } from "../../types/finance";

export function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  return (
    <SectionCard className="overflow-x-auto">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Transactions</h2>
        <p className="text-sm text-slate-400">{transactions.length} rows</p>
      </div>
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead>
          <tr className="text-slate-400">
            <th className="pb-2">Date</th>
            <th className="pb-2">Scope</th>
            <th className="pb-2">Category</th>
            <th className="pb-2">Amount</th>
            <th className="pb-2">Merchant</th>
            <th className="pb-2">Normalized</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-t border-slate-800">
              <td className="py-3">{tx.date}</td>
              <td>
                <Badge tone={tx.scope === "business" ? "info" : "default"}>{tx.scope}</Badge>
              </td>
              <td>{tx.category}</td>
              <td>HK${tx.amount.toFixed(2)}</td>
              <td>{tx.description}</td>
              <td className="text-slate-500">{tx.normalizedMerchant}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {transactions.length === 0 ? <p className="pt-4 text-sm text-slate-400">No transactions match the current filters.</p> : null}
    </SectionCard>
  );
}
