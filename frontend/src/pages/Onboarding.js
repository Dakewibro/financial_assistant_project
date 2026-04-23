import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api, { formatApiError } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { User, Briefcase, Layers, Check, ArrowRight } from "lucide-react";

const USES = [
  { v: "personal", label: "Just personal spending", desc: "Track my own money clearly.", icon: User },
  { v: "freelancer", label: "Freelance / business only", desc: "Keep work expenses tidy.", icon: Briefcase },
  { v: "mixed", label: "Both — personal & business", desc: "I mix them and need to separate.", icon: Layers },
];

export default function Onboarding() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [use, setUse] = useState("mixed");
  const [income, setIncome] = useState("45000");
  const [seed, setSeed] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const steps = ["How do you use money?", "What's your monthly income?", "Want a jump-start?"];

  const finish = async () => {
    setSaving(true); setErr("");
    try {
      await api.post("/onboarding/complete", {
        name: user?.name, monthly_income: parseFloat(income) || 0, primary_use: use, seed_demo: seed,
      });
      await refreshUser();
      navigate("/dashboard");
    } catch (e) { setErr(formatApiError(e)); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-50 p-6" data-testid="onboarding-page">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-moss text-white flex items-center justify-center font-heading font-semibold">K</div>
            <div className="font-heading font-semibold">Kori setup</div>
          </div>
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i <= step ? "bg-moss w-8" : "bg-sand-200 w-4"}`} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-sand-200 p-8">
          <div className="text-xs text-[color:var(--text-secondary)] uppercase tracking-[0.2em]">Step {step + 1} of 3</div>
          <h1 className="font-heading text-2xl sm:text-3xl tracking-tight mt-2">{steps[step]}</h1>

          {step === 0 && (
            <div className="mt-6 space-y-3" data-testid="onboarding-step-1">
              {USES.map(({ v, label, desc, icon: Icon }) => (
                <button key={v} onClick={() => setUse(v)} data-testid={`use-${v}`}
                  className={`w-full text-left flex items-start gap-3 p-4 rounded-lg border transition-colors ${
                    use === v ? "border-moss bg-moss-soft" : "border-sand-200 hover:bg-sand-100"
                  }`}>
                  <div className={`w-9 h-9 rounded-md flex items-center justify-center ${use === v ? "bg-moss text-white" : "bg-sand-100 text-[color:var(--text-secondary)]"}`}>
                    <Icon size={17} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{label}</div>
                    <div className="text-xs text-[color:var(--text-secondary)] mt-0.5">{desc}</div>
                  </div>
                  {use === v && <Check size={18} className="text-moss" />}
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="mt-6" data-testid="onboarding-step-2">
              <Label className="text-xs text-[color:var(--text-secondary)] mb-1.5 block">Monthly income (HK$)</Label>
              <Input type="number" value={income} onChange={(e) => setIncome(e.target.value)} data-testid="input-income" className="font-num text-lg" />
              <p className="text-xs text-[color:var(--text-secondary)] mt-3 leading-relaxed">
                We use this only to calculate your <span className="text-moss font-medium">Safe-to-Spend</span>. Enter 0 if you'd rather not say — you'll still get insights.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="mt-6 space-y-3" data-testid="onboarding-step-3">
              <button onClick={() => setSeed(true)} data-testid="seed-yes"
                className={`w-full text-left p-4 rounded-lg border transition-colors ${seed ? "border-moss bg-moss-soft" : "border-sand-200 hover:bg-sand-100"}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-md flex items-center justify-center ${seed ? "bg-moss text-white" : "bg-sand-100"}`}><Layers size={17} /></div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Load demo data</div>
                    <div className="text-xs text-[color:var(--text-secondary)] mt-0.5">See the app populated. You can clear anytime in Settings.</div>
                  </div>
                  {seed && <Check size={18} className="text-moss" />}
                </div>
              </button>
              <button onClick={() => setSeed(false)} data-testid="seed-no"
                className={`w-full text-left p-4 rounded-lg border transition-colors ${!seed ? "border-moss bg-moss-soft" : "border-sand-200 hover:bg-sand-100"}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-md flex items-center justify-center ${!seed ? "bg-moss text-white" : "bg-sand-100"}`}><User size={17} /></div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Start from zero</div>
                    <div className="text-xs text-[color:var(--text-secondary)] mt-0.5">Empty state with a friendly guide to add your first transaction.</div>
                  </div>
                  {!seed && <Check size={18} className="text-moss" />}
                </div>
              </button>
            </div>
          )}

          {err && <div className="text-xs text-terracotta bg-terracotta-soft border border-terracotta/20 rounded-md px-3 py-2 mt-4" data-testid="onboarding-error">{err}</div>}

          <div className="mt-8 flex items-center justify-between">
            <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} data-testid="onboarding-back"
              className="text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] disabled:opacity-40">
              Back
            </button>
            {step < 2 ? (
              <Button onClick={() => setStep(step + 1)} data-testid="onboarding-next" className="bg-moss hover:bg-moss-hover text-white">
                Continue <ArrowRight size={14} className="ml-1.5" />
              </Button>
            ) : (
              <Button onClick={finish} disabled={saving} data-testid="onboarding-finish" className="bg-moss hover:bg-moss-hover text-white">
                {saving ? "Setting up..." : "Finish setup"} <ArrowRight size={14} className="ml-1.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
