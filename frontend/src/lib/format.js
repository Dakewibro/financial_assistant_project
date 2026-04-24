/** Parse `YYYY-MM-DD` in local time so charts are not shifted by UTC midnight. */
function parseCalendarDate(iso) {
  if (iso == null) return new Date(NaN);
  const s = String(iso).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(s);
}

export const HKD = (n, opts = {}) => {
  const { sign = false, decimals = 0 } = opts;
  if (n === null || n === undefined || isNaN(n)) return "HK$ 0";
  const abs = Math.abs(Number(n));
  const s = abs.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  if (sign) return (n < 0 ? "-" : "+") + "HK$ " + s;
  return (n < 0 ? "-" : "") + "HK$ " + s;
};

export const shortDate = (iso) => {
  try {
    const d = parseCalendarDate(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-HK", { month: "short", day: "numeric" });
  } catch { return ""; }
};

export const fullDate = (iso) => {
  try {
    const d = parseCalendarDate(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-HK", { year: "numeric", month: "short", day: "numeric" });
  } catch { return ""; }
};

export const dayShort = (iso) => {
  try {
    const d = parseCalendarDate(iso);
    if (Number.isNaN(d.getTime())) return String(iso ?? "");
    return d.toLocaleDateString("en-HK", { day: "numeric", month: "short" });
  } catch { return String(iso ?? ""); }
};
