import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Receipt, Target, Bell, Repeat2, BarChart3, Settings as SettingsIcon, Plus, LogOut, Menu, X, Flag } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import { FA_INVALIDATE_ALERT_COUNT } from "../lib/appEvents";
import QuickAddDialog from "./QuickAddDialog";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/transactions", label: "Transactions", icon: Receipt, testid: "nav-transactions" },
  { to: "/budgets", label: "Budgets", icon: Target, testid: "nav-budgets" },
  { to: "/alerts", label: "Alerts", icon: Bell, testid: "nav-alerts" },
  { to: "/recurring", label: "Recurring", icon: Repeat2, testid: "nav-recurring" },
  { to: "/goals", label: "Goals", icon: Flag, testid: "nav-goals" },
  { to: "/insights", label: "Insights", icon: BarChart3, testid: "nav-insights" },
  { to: "/settings", label: "Settings", icon: SettingsIcon, testid: "nav-settings" },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const fetchAlerts = async () => {
      try {
        const { data } = await api.get("/alerts");
        if (mounted) setAlertCount(data.filter(a => !a.acknowledged).length);
      } catch {}
    };
    fetchAlerts();
    const i = setInterval(fetchAlerts, 30000);
    const onInvalidate = () => {
      void fetchAlerts();
    };
    window.addEventListener(FA_INVALIDATE_ALERT_COUNT, onInvalidate);
    return () => {
      mounted = false;
      clearInterval(i);
      window.removeEventListener(FA_INVALIDATE_ALERT_COUNT, onInvalidate);
    };
  }, []);

  // Global keyboard shortcut: press N (not while typing) → open Quick Add
  useEffect(() => {
    const handler = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      const editable = tag === "input" || tag === "textarea" || tag === "select" || e.target?.isContentEditable;
      if (editable) return;
      if (e.key === "n" || e.key === "N") {
        if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
        e.preventDefault();
        setQuickOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="min-h-screen flex bg-sand-50">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-sand-200 bg-sand-50 sticky top-0 h-screen">
        <div className="px-6 py-6 border-b border-sand-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-moss flex items-center justify-center text-white font-heading font-semibold" data-testid="brand-mark">K</div>
            <div>
              <div className="font-heading font-semibold text-[15px] leading-none">Kori</div>
              <div className="text-[11px] text-[color:var(--text-secondary)] mt-0.5">Financial assistant</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, testid }) => (
            <NavLink key={to} to={to} data-testid={testid} className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                isActive ? "bg-moss-soft text-moss font-medium" : "text-[color:var(--text-secondary)] hover:bg-sand-100 hover:text-[color:var(--text-primary)]"
              }`}>
              <Icon size={18} strokeWidth={1.75} />
              <span className="flex-1">{label}</span>
              {to === "/alerts" && alertCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-terracotta text-white font-medium font-num" data-testid="nav-alert-count">{alertCount}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sand-200">
          <button onClick={() => setQuickOpen(true)} data-testid="quick-add-button"
            className="w-full flex items-center justify-center gap-2 bg-moss hover:bg-moss-hover text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
            <Plus size={16} /> Quick add
          </button>
          <div className="mt-3 flex items-center gap-2 px-2 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-moss-soft text-moss flex items-center justify-center font-medium text-sm" data-testid="user-avatar">
              {(user?.name || user?.email || "?").slice(0,1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate font-medium" data-testid="user-name">{user?.name || "You"}</div>
              <div className="text-[11px] text-[color:var(--text-secondary)] truncate">{user?.email}</div>
            </div>
            <button onClick={handleLogout} data-testid="logout-btn" className="p-1.5 rounded-md hover:bg-sand-100 text-[color:var(--text-secondary)]" title="Log out">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-white border-b border-sand-200 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setMobileOpen(v => !v)} data-testid="mobile-menu-toggle" className="p-1.5 rounded-md hover:bg-sand-100">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="w-7 h-7 rounded-md bg-moss flex items-center justify-center text-white font-heading font-semibold text-sm">K</div>
          <div className="font-heading font-semibold text-[14px]">Kori</div>
        </div>
        <button onClick={() => setQuickOpen(true)} data-testid="mobile-quick-add-btn" className="flex items-center gap-1.5 bg-moss text-white rounded-lg px-3 py-1.5 text-sm font-medium">
          <Plus size={14} /> Add
        </button>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-20 pt-14">
          <div className="absolute inset-0 bg-black/20" onClick={() => setMobileOpen(false)} />
          <div className="relative bg-white border-b border-sand-200 pb-3 px-3 fade-up">
            {NAV.map(({ to, label, icon: Icon, testid }) => (
              <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} data-testid={`m-${testid}`}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                  isActive ? "bg-moss-soft text-moss font-medium" : "text-[color:var(--text-secondary)]"}`}>
                <Icon size={18} /> {label}
                {to === "/alerts" && alertCount > 0 && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-terracotta text-white">{alertCount}</span>
                )}
              </NavLink>
            ))}
            <button onClick={handleLogout} data-testid="m-logout-btn" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[color:var(--text-secondary)] w-full">
              <LogOut size={18} /> Log out
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 md:ml-0 pt-14 md:pt-0 min-w-0">
        <div className="fade-up">{children}</div>
      </main>

      <QuickAddDialog open={quickOpen} onClose={() => setQuickOpen(false)} />
    </div>
  );
}
