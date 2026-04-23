import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=loading, false=no user, obj=user
  const [token, setToken] = useState(() => localStorage.getItem("fa_token"));

  useEffect(() => {
    let cancelled = false;
    async function fetchMe() {
      if (!token) { setUser(false); return; }
      try {
        const { data } = await api.get("/auth/me");
        if (!cancelled) setUser(data);
      } catch {
        if (!cancelled) { localStorage.removeItem("fa_token"); setToken(null); setUser(false); }
      }
    }
    fetchMe();
    return () => { cancelled = true; };
  }, [token]);

  const loginLocal = (t, u) => {
    localStorage.setItem("fa_token", t);
    setToken(t);
    setUser(u);
  };
  const logout = () => {
    localStorage.removeItem("fa_token");
    setToken(null);
    setUser(false);
  };
  const refreshUser = async () => {
    try { const { data } = await api.get("/auth/me"); setUser(data); } catch {}
  };

  return (
    <AuthCtx.Provider value={{ user, token, loginLocal, logout, refreshUser, setUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
