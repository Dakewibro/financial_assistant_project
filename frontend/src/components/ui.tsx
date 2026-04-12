import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function SectionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-slate-900 p-4 ${className}`}>{children}</div>;
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
    <button type={type} onClick={onClick} className={`rounded bg-violet-500 px-3 py-2 text-white ${className}`}>
      {children}
    </button>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`rounded bg-slate-800 p-2 ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`rounded bg-slate-800 p-2 ${props.className ?? ""}`} />;
}
