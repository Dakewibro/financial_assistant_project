import axios from "axios";

const BACKEND =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:4000" : "");

export const API_BASE = `${BACKEND}/api`;

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("fa_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function formatApiError(err) {
  if (err?.code === "ERR_NETWORK" || err?.message === "Network Error") {
    const base = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:4000" : "");
    return base
      ? `Cannot reach API (${base}). Check the backend is running and VITE_BACKEND_URL if you use a custom port.`
      : "Cannot reach API (same-origin /api). Set VITE_BACKEND_URL for local dev or use the Vite proxy.";
  }
  const detail = err?.response?.data?.detail;
  if (detail == null) {
    const errMsg = err?.response?.data?.error;
    if (errMsg) return typeof errMsg === "string" ? errMsg : errMsg?.message || "Something went wrong";
    return err?.message || "Something went wrong";
  }
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(e => e?.msg || JSON.stringify(e)).join(" · ");
  if (detail?.msg) return detail.msg;
  return String(detail);
}

export default api;
