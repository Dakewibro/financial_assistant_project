import { Input, SectionCard, Select, Toggle } from "../ui";
import type { TransactionFiltersState } from "../../types/finance";

export function TransactionFilters({
  filters,
  setFilters,
  categories,
}: {
  filters: TransactionFiltersState;
  setFilters: (filters: TransactionFiltersState) => void;
  categories: string[];
}) {
  return (
    <SectionCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filters</h2>
        <Toggle
          checked={filters.recurringOnly}
          onChange={(checked) => setFilters({ ...filters, recurringOnly: checked })}
          label="Recurring only"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        <Input
          placeholder="Search merchant"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <Select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </Select>
        <Select value={filters.scope} onChange={(e) => setFilters({ ...filters, scope: e.target.value as TransactionFiltersState["scope"] })}>
          <option value="all">All scopes</option>
          <option value="personal">Personal</option>
          <option value="business">Business</option>
        </Select>
        <Input type="date" value={filters.fromDate} onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })} />
        <Input type="date" value={filters.toDate} onChange={(e) => setFilters({ ...filters, toDate: e.target.value })} />
      </div>
    </SectionCard>
  );
}
