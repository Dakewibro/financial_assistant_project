import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api, { formatApiError } from "../lib/api";
import { HKD } from "../lib/format";
import { Card, Page, PageHeader } from "../components/Shared";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { RefreshCw, Trash2, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [income, setIncome] = useState("");
  const [loading, setLoading] = useState(false);

  const reseed = async () => {
    if (!window.confirm("This will wipe your data and load fresh demo data. Continue?")) return;
    setLoading(true);
    try { await api.post("/demo/seed"); toast.success("Demo data loaded"); }
    catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  const clear = async () => {
    if (!window.confirm("Permanently delete ALL your transactions, budgets, and alerts?")) return;
    setLoading(true);
    try { await api.post("/demo/clear"); toast.success("All data cleared"); }
    catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  const updateIncome = async () => {
    const v = parseFloat(income);
    if (isNaN(v) || v < 0) { toast.error("Invalid amount"); return; }
    try {
      await api.post("/onboarding/complete", { monthly_income: v, primary_use: "mixed", seed_demo: false });
      await refreshUser();
      toast.success("Income updated");
      setIncome("");
    } catch (e) { toast.error(formatApiError(e)); }
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
              <Input type="number" placeholder="HK$ 45,000" value={income} onChange={(e) => setIncome(e.target.value)} data-testid="income-input" className="font-num" />
              <Button onClick={updateIncome} className="bg-moss hover:bg-moss-hover text-white" data-testid="update-income-btn">Save</Button>
            </div>
          </div>
        </Card>

        <Card className="p-6" data-testid="settings-data">
          <div className="font-heading font-medium mb-1">Data</div>
          <div className="text-xs text-[color:var(--text-secondary)] mb-4">Reset or reseed your workspace anytime.</div>
          <div className="space-y-2">
            <Button onClick={reseed} disabled={loading} variant="outline" className="w-full justify-start" data-testid="reseed-btn">
              <RefreshCw size={15} className="mr-2" /> Reset & load demo data
            </Button>
            <Button onClick={clear} disabled={loading} variant="outline" className="w-full justify-start text-terracotta border-terracotta/30 hover:bg-terracotta-soft hover:text-terracotta" data-testid="clear-btn">
              <Trash2 size={15} className="mr-2" /> Clear all data
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
