import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api, { formatApiError } from "../lib/api";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";

export default function Login() {
  const { loginLocal } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@finassist.app");
  const [password, setPassword] = useState("demo1234");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      loginLocal(data.token, data.user);
      const pending = sessionStorage.getItem("fa_pending_share");
      if (pending) { sessionStorage.removeItem("fa_pending_share"); navigate(`/join/${pending}`); return; }
      navigate(data.user.onboarded ? "/dashboard" : "/onboarding");
    } catch (e2) {
      setErr(formatApiError(e2));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-sand-50">
      <div className="hidden md:flex flex-col justify-between p-10 bg-moss text-white relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center font-heading font-semibold">K</div>
            <div className="font-heading font-semibold text-lg">Kori</div>
          </div>
        </div>
        <div className="relative z-10">
          <h1 className="font-heading text-4xl lg:text-5xl leading-[1.1] tracking-tight">Money, calmly.</h1>
          <p className="text-white/80 mt-4 max-w-sm leading-relaxed">
            Log spending in seconds, separate personal from business, and always know what you can safely spend.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 max-w-sm">
            {[
              ["Safe", "to spend"],
              ["Smart", "suggestions"],
              ["Quiet", "alerts"],
            ].map(([a, b], i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                <div className="font-heading font-medium text-sm">{a}</div>
                <div className="text-[11px] text-white/70 mt-0.5">{b}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-[11px] text-white/50">HK$ · Beta · v0.1</div>
        <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -right-40 top-20 w-72 h-72 rounded-full bg-[#C05A45]/20 pointer-events-none blur-2xl" />
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <form onSubmit={submit} className="w-full max-w-sm" data-testid="login-form">
          <h2 className="font-heading text-2xl sm:text-3xl tracking-tight">Welcome back</h2>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">Log in to see your finances.</p>

          <div className="mt-8 space-y-4">
            <div>
              <Label className="text-xs text-[color:var(--text-secondary)] mb-1.5 block">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="login-email" />
            </div>
            <div>
              <Label className="text-xs text-[color:var(--text-secondary)] mb-1.5 block">Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="login-password" />
            </div>
            {err && <div className="text-xs text-terracotta bg-terracotta-soft border border-terracotta/20 rounded-md px-3 py-2" data-testid="login-error">{err}</div>}
            <Button type="submit" disabled={loading} className="w-full bg-moss hover:bg-moss-hover text-white" data-testid="login-submit">
              {loading ? "Signing in..." : "Log in"}
            </Button>
          </div>

          <div className="mt-6 text-xs text-[color:var(--text-secondary)]">
            No account? <Link to="/register" className="text-moss font-medium hover:underline" data-testid="link-register">Create one</Link>
          </div>
          <div className="mt-4 p-3 rounded-md bg-sand-100 border border-sand-200 text-xs text-[color:var(--text-secondary)]" data-testid="demo-hint">
            <div className="font-medium text-[color:var(--text-primary)]">Try the demo</div>
            <div className="mt-0.5">demo@finassist.app · demo1234</div>
          </div>
        </form>
      </div>
    </div>
  );
}
