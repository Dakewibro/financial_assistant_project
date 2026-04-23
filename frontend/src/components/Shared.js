import React from "react";

export function PageHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6" data-testid="page-header">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-[color:var(--text-secondary)] mt-1">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function Card({ className = "", children, ...props }) {
  return (
    <div className={`bg-white border border-sand-200 rounded-xl ${className}`} {...props}>
      {children}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action, testid = "empty-state" }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6" data-testid={testid}>
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-moss-soft text-moss flex items-center justify-center mb-4">
          <Icon size={22} strokeWidth={1.5} />
        </div>
      )}
      <div className="font-heading text-lg font-medium">{title}</div>
      {body && <div className="text-sm text-[color:var(--text-secondary)] mt-1.5 max-w-sm leading-relaxed">{body}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  return (
    <div className="bg-terracotta-soft border border-terracotta/25 rounded-lg px-4 py-3 flex items-center gap-3 text-sm text-[color:var(--text-primary)]" data-testid="error-banner">
      <div className="w-6 h-6 rounded-full bg-terracotta text-white flex items-center justify-center text-xs font-bold">!</div>
      <div className="flex-1">{message}</div>
      {onRetry && <button onClick={onRetry} data-testid="error-retry" className="text-xs font-medium text-terracotta hover:underline">Retry</button>}
    </div>
  );
}

export function Skel({ className = "" }) {
  return <div className={`skeleton ${className}`} />;
}

export function Page({ children }) {
  return <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-10">{children}</div>;
}

export function Chip({ active, onClick, children, testid }) {
  return (
    <button onClick={onClick} data-testid={testid}
      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
        active ? "bg-moss text-white border-moss" : "bg-white border-sand-200 text-[color:var(--text-secondary)] hover:border-moss"
      }`}>
      {children}
    </button>
  );
}
