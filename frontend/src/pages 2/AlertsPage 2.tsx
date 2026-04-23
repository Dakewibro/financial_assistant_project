import { AlertFeed } from "../components/dashboard/AlertFeed";
import { TopAlertsCard } from "../components/dashboard/TopAlertsCard";
import type { Bootstrap } from "../types/finance";

export function AlertsPage({ data }: { data: Bootstrap }) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Alerts</p>
        <h1 className="text-2xl font-medium">Prioritized attention queue</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Ranked by severity, impact, and urgency so the most meaningful actions appear first.
        </p>
      </div>
      <TopAlertsCard alerts={data.alerts} />
      <AlertFeed alerts={data.alerts} />
    </section>
  );
}
