import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api, { formatApiError } from "../lib/api";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";

export default function Register() {
  const { loginLocal } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      if (form.password.length < 6) throw { response: { data: { detail: "Password must be at least 6 characters" } } };
      const { data } = await api.post("/auth/register", form);
      loginLocal(data.token, data.user);
      const pending = sessionStorage.getItem("fa_pending_share");
      if (pending) { sessionStorage.removeItem("fa_pending_share"); navigate(`/join/${pending}`); return; }
      navigate("/onboarding");
    } catch (e2) {
      setErr(formatApiError(e2));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-sand-50">
      <div className="hidden md:flex flex-col justify-between p-10 bg-moss text-white relative overflow-hidden">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center font-heading font-semibold">K</div>
          <div className="font-heading font-semibold text-lg">Kori</div>
        </div>
        <div>
          <h1 className="font-heading text-4xl lg:text-5xl leading-[1.1] tracking-tight">Start clean.</h1>
          <p className="text-white/80 mt-4 max-w-sm">Two minutes to get your first view. No setup fatigue.</p>
        </div>
        <div className="text-[11px] text-white/50">HK$ · Beta</div>
        <div className="absolute -right-40 top-40 w-72 h-72 rounded-full bg-[#C05A45]/20 pointer-events-none blur-2xl" />
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <form onSubmit={submit} className="w-full max-w-sm" data-testid="register-form">
          <h2 className="font-heading text-2xl sm:text-3xl tracking-tight">Create account</h2>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">No card needed.</p>
          <div className="mt-8 space-y-4">
            <div>
              <Label className="text-xs text-[color:var(--text-secondary)] mb-1.5 block">Name</Label>
              <Input value={form.name} onChange={set("name")} required data-testid="register-name" />
            </div>
            <div>
              <Label className="text-xs text-[color:var(--text-secondary)] mb-1.5 block">Email</Label>
              <Input type="email" value={form.email} onChange={set("email")} required data-testid="register-email" />
            </div>
            <div>
              <Label className="text-xs text-[color:var(--text-secondary)] mb-1.5 block">Password</Label>
              <Input type="password" value={form.password} onChange={set("password")} required data-testid="register-password" />
              <div className="text-[11px] text-[color:var(--text-muted)] mt-1">Min. 6 characters</div>
            </div>
            {err && <div className="text-xs text-terracotta bg-terracotta-soft border border-terracotta/20 rounded-md px-3 py-2" data-testid="register-error">{err}</div>}
            <Button type="submit" disabled={loading} className="w-full bg-moss hover:bg-moss-hover text-white" data-testid="register-submit">
              {loading ? "Creating..." : "Create account"}
            </Button>
          </div>
          <div className="mt-6 text-xs text-[color:var(--text-secondary)]">
            Have an account? <Link to="/login" className="text-moss font-medium hover:underline" data-testid="link-login">Log in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
