import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api, { formatApiError } from "../lib/api";
import { Card, Page, PageHeader } from "../components/Shared";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Eraser, LogOut, FlaskConical } from "lucide-react";
import { invalidateAlertCount } from "../lib/appEvents";
import { toast } from "sonner";

const SCENARIO_STORAGE_KEY = "fa_scenario_id";
const LAST_ACCOUNT_KEY = "fa_last_account";
const IMPORT_COLUMN_OVERRIDES_KEY = "fa_import_column_overrides_v1";

function clearBrowserPreferenceCache() {
  try {
    localStorage.removeItem(SCENARIO_STORAGE_KEY);
    localStorage.removeItem(LAST_ACCOUNT_KEY);
    localStorage.removeItem(IMPORT_COLUMN_OVERRIDES_KEY);
  } catch {
    /* ignore */
  }
}

export default function Settings() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [income, setIncome] = useState("");
  const [loading, setLoading] = useState(false);
  const [scenarios, setScenarios] = useState([]);
  const [scenarioId, setScenarioId] = useState(() => {
    try {
      return localStorage.getItem(SCENARIO_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/demo/scenarios");
        if (!cancelled && Array.isArray(data.scenarios)) {
          setScenarios(data.scenarios);
          setScenarioId((prev) => {
            const stored = (() => {
              try {
                return localStorage.getItem(SCENARIO_STORAGE_KEY) || "";
              } catch {
                return "";
              }
            })();
            const preferred = prev || stored;
            if (preferred && data.scenarios.some((s) => s.id === preferred)) return preferred;
            return data.scenarios[0]?.id || "";
          });
        }
      } catch {
        if (!cancelled) setScenarios([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadScenario = async () => {
    if (!scenarioId) {
      toast.error("Pick a scenario first");
      return;
    }
    const label = scenarios.find((s) => s.id === scenarioId)?.label || scenarioId;
    if (!window.confirm(`Load scenario “${label}”? This replaces transactions and budget rules with the test pack.`)) return;
    setLoading(true);
    try {
      await api.post("/demo/load-scenario", { scenario: scenarioId });
      invalidateAlertCount();
      toast.success(`Loaded scenario: ${label}`, { description: "Open Transactions or Dashboard to explore." });
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const resetData = async () => {
    if (
      !window.confirm(
        "Reset this workspace? This removes all transactions, budget rules, goals, alerts, dashboard layout, and clears saved picks on this device (scenario choice, Quick Add defaults, import column hints). It does not load sample data.",
      )
    )
      return;
    setLoading(true);
    try {
      await api.post("/demo/clear");
      clearBrowserPreferenceCache();
      const first = scenarios[0]?.id || "";
      setScenarioId(first);
      try {
        if (first) localStorage.setItem(SCENARIO_STORAGE_KEY, first);
      } catch {
        /* ignore */
      }
      invalidateAlertCount();
      toast.success("Workspace reset");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const updateIncome = async () => {
    const v = parseFloat(income);
    if (isNaN(v) || v < 0) {
      toast.error("Invalid amount");
      return;
    }
    try {
      await api.post("/onboarding/complete", { monthly_income: v, primary_use: "mixed", seed_demo: false });
      await refreshUser();
      toast.success("Income updated");
      setIncome("");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <Page>
      <PageHeader title="Settings" subtitle="Preferences and data controls." />

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6" data-testid="settings-profile">
          <div className="font-heading font-medium mb-4">Profile</div>
          <Field label="Name" value={user?.name} />
          <Field label="Email" value={user?.email} />
          <div className="mt-4 pt-4 border-t border-sand-200">
            <Label className="text-xs mb-1.5 block">Update monthly income</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="HK$ 45,000"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                data-testid="income-input"
                className="font-num"
              />
              <Button onClick={updateIncome} className="bg-moss hover:bg-moss-hover text-white" data-testid="update-income-btn">
                Save
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6" data-testid="settings-data">
          <div className="font-heading font-medium mb-1">Data</div>
          <div className="text-xs text-[color:var(--text-secondary)] mb-4">
            Reset wipes server-side finance data and local UI preferences. Use <span className="font-medium">Load test data</span> below if you want a curated scenario pack.
          </div>
          <div className="space-y-2">
            <Button
              onClick={resetData}
              disabled={loading}
              variant="outline"
              className="w-full justify-start text-terracotta border-terracotta/30 hover:bg-terracotta-soft hover:text-terracotta"
              data-testid="reset-data-btn"
            >
              <Eraser size={15} className="mr-2" /> Reset data
            </Button>
          </div>
        </Card>

        <Card className="p-6 md:col-span-2" data-testid="settings-scenarios">
          <div className="font-heading font-medium mb-1 flex items-center gap-2">
            <FlaskConical size={16} className="text-moss" />
            Case study scenarios
          </div>
          <p className="text-xs text-[color:var(--text-secondary)] mb-4">
            Load a curated transaction + rules pack from the repo <code className="text-[11px] bg-sand-100 px-1 rounded">scenarios/</code> folder
            (same JSON used in <code className="text-[11px] bg-sand-100 px-1 rounded">npm run test:scenarios</code>). Replaces your current transactions and
            rules like a full import. Requires the backend to run from the project root so files resolve (typical <code className="text-[11px]">npm run dev</code>{" "}
            in <code className="text-[11px]">backend/</code>).
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-[color:var(--text-secondary)] mb-1.5 block">Scenario</Label>
              <Select
                value={scenarioId}
                onValueChange={(v) => {
                  setScenarioId(v);
                  try {
                    localStorage.setItem(SCENARIO_STORAGE_KEY, v);
                  } catch {
                    /* ignore */
                  }
                }}
                disabled={!scenarios.length}
              >
                <SelectTrigger data-testid="scenario-select" className="bg-white">
                  <SelectValue placeholder={scenarios.length ? "Choose scenario" : "Could not list scenarios"}>
                    {scenarios.find((s) => s.id === scenarioId)?.label || scenarioId || "Choose scenario"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {scenarios.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label || s.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={loadScenario}
              disabled={loading || !scenarioId}
              className="bg-moss hover:bg-moss-hover text-white shrink-0"
              data-testid="load-scenario-btn"
            >
              Load test data
            </Button>
          </div>
        </Card>

        <Card className="p-6 md:col-span-2" data-testid="settings-session">
          <div className="font-heading font-medium">Session</div>
          <div className="text-xs text-[color:var(--text-secondary)] mt-1">Currency: HKD · Theme: Light</div>
          <Button onClick={() => { logout(); navigate("/login"); }} variant="outline" className="mt-4" data-testid="settings-logout">
            <LogOut size={15} className="mr-2" /> Log out
          </Button>
        </Card>
      </div>
    </Page>
  );
}

function Field({ label, value }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">{label}</div>
      <div className="text-sm mt-1 font-medium">{value}</div>
    </div>
  );
}
