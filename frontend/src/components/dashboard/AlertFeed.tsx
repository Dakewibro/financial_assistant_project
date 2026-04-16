import { Badge, SectionCard } from "../ui";
import type { Alert } from "../../types/finance";

function toneForAlert(alert: Alert) {
  if (alert.severity === "critical") return "critical";
  if (alert.severity === "warning") return "warning";
  return "info";
}

export function AlertFeed({ alerts }: { alerts: Alert[] }) {
  return (
    <SectionCard className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Alerts</h2>
        <Badge tone={alerts.length > 0 ? "warning" : "success"}>{alerts.length > 0 ? `${alerts.length} active` : "All clear"}</Badge>
      </div>
      {alerts.length === 0 ? <p className="text-sm text-slate-400">No active alerts right now.</p> : null}
      <ul className="space-y-3">
        {alerts.map((alert) => (
          <li key={alert.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-100">{alert.message}</p>
                <p className="mt-1 text-sm text-slate-400">{alert.evidence}</p>
              </div>
              <Badge tone={toneForAlert(alert)}>{alert.status.replace("_", " ")}</Badge>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
