import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Card, ErrorBanner, Page } from "../components/Shared";
import { HKD } from "../lib/format";
import { Flag, Users, CheckCircle2, ShieldCheck, Plane, TrendingDown, Flame, Target } from "lucide-react";
import { toast } from "sonner";

const KIND_ICON = { emergency: ShieldCheck, travel: Plane, debt: TrendingDown, retirement: Flame, custom: Target };

export default function JoinShare() {
  const { token } = useParams();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (user === null) return;
    if (!user) {
      // Stash token and redirect to login
      sessionStorage.setItem("fa_pending_share", token);
      navigate("/login");
      return;
    }
    const pending = sessionStorage.getItem("fa_pending_share");
    if (pending && pending === token) sessionStorage.removeItem("fa_pending_share");
    api.get(`/shares/${token}`).then(r => setPreview(r.data)).catch(e => setErr(formatApiError(e)));
  }, [token, user, navigate]);

  const join = async () => {
    setJoining(true);
    try {
      const { data } = await api.post(`/shares/${token}/join`);
      toast.success(preview?.already_member ? "Opening" : `You joined ${preview.name}`);
      // Refresh auth user so updated onboarded flag propagates
      try { await refreshUser(); } catch {}
      navigate(data.kind === "goal" ? "/goals" : "/budgets");
    } catch (e) {
      if (e?.response?.status === 404) setErr("This link was revoked by the owner or doesn't exist.");
      else setErr(formatApiError(e));
    }
    finally { setJoining(false); }
  };

  if (user === null) return null;
  if (err) return <Page><ErrorBanner message={err} /></Page>;
  if (!preview) return <Page><div className="skeleton h-40" /></Page>;

  const isGoal = preview.kind === "goal";
  const Icon = isGoal ? (KIND_ICON[preview.kind_tag] || Target) : Flag;
  const pct = isGoal && preview.target_amount > 0 ? Math.min(100, (preview.current_amount / preview.target_amount) * 100) : null;

  return (
    <Page>
      <div className="max-w-lg mx-auto" data-testid="join-share-page">
        <Card className="p-8">
          <div className="text-[11px] uppercase tracking-[0.2em] text-moss font-medium flex items-center gap-2">
            <Users size={12} /> Shared {preview.kind}
          </div>
          <div className="mt-3 flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-moss-soft text-moss flex items-center justify-center flex-shrink-0">
              <Icon size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-heading text-2xl sm:text-3xl tracking-tight" data-testid="join-share-name">{preview.name}</div>
              <div className="text-sm text-[color:var(--text-secondary)] mt-1">Shared by <span className="text-[color:var(--text-primary)] font-medium">{preview.owner_name}</span> · {preview.member_count} {preview.member_count === 1 ? "member" : "members"}</div>
            </div>
          </div>

          {isGoal && (
            <div className="mt-6 p-5 rounded-lg bg-sand-50 border border-sand-200">
              <div className="flex items-baseline justify-between">
                <div className="font-num tabular-nums text-xl"><span className="font-heading">{HKD(preview.current_amount)}</span> <span className="text-xs text-[color:var(--text-secondary)]">of {HKD(preview.target_amount)}</span></div>
                {pct != null && <div className="text-sm text-moss font-num">{Math.round(pct)}%</div>}
              </div>
              {pct != null && (
                <div className="mt-3 h-2 rounded-full bg-sand-100 overflow-hidden">
                  <div className="h-full bg-moss" style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          )}

          {!isGoal && (
            <div className="mt-6 p-5 rounded-lg bg-sand-50 border border-sand-200 space-y-2">
              <div className="flex items-center justify-between text-sm"><span className="text-[color:var(--text-secondary)]">Category</span><span className="font-medium capitalize">{preview.category}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-[color:var(--text-secondary)]">Monthly limit</span><span className="font-num tabular-nums">{HKD(preview.limit)}</span></div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-2">
            <Button onClick={join} disabled={joining} data-testid="join-share-btn" className="flex-1 bg-moss hover:bg-moss-hover text-white">
              {preview.already_member ? <><CheckCircle2 size={15} className="mr-2" /> Open in Kori</> : <>Join {preview.kind}</>}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/dashboard")} data-testid="join-share-skip">Not now</Button>
          </div>

          <div className="mt-5 text-[11px] text-[color:var(--text-muted)] leading-relaxed">
            {isGoal
              ? "Joining lets you contribute to this goal and see shared progress. Your personal transactions stay private."
              : "Joining lets both of you count spending toward this budget. Only the category total is shared; individual transactions stay private."}
          </div>
        </Card>
      </div>
    </Page>
  );
}
