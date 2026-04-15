import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function SectionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm ${className}`}>{children}</div>;
}

export function PrimaryButton({
  children,
  onClick,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700 ${className}`}
    >
      {children}
    </button>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${props.className ?? ""}`}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-slate-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-600 bg-slate-900"
      />
      {label}
    </label>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "info" | "warning" | "critical" | "success";
}) {
  const toneClass =
    tone === "info"
      ? "bg-sky-500/10 text-sky-200 border-sky-400/40"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-200 border-amber-400/40"
        : tone === "critical"
          ? "bg-rose-500/10 text-rose-200 border-rose-400/40"
          : tone === "success"
            ? "bg-emerald-500/10 text-emerald-200 border-emerald-400/40"
            : "bg-slate-800 text-slate-200 border-slate-700";

  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${toneClass}`}>{children}</span>;
}
