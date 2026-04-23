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
    const d = new Date(iso);
    return d.toLocaleDateString("en-HK", { month: "short", day: "numeric" });
  } catch { return ""; }
};

export const fullDate = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-HK", { year: "numeric", month: "short", day: "numeric" });
  } catch { return ""; }
};

export const dayShort = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-HK", { day: "numeric", month: "short" });
  } catch { return iso; }
};
