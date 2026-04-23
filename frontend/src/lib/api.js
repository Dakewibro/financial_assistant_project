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
