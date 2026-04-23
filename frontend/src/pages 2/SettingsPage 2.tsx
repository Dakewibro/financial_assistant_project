import { SectionCard, SecondaryButton } from "../components/ui";
import type { Bootstrap } from "../types/finance";

export function SettingsPage({ data, resetDemo }: { data: Bootstrap; resetDemo: () => Promise<void> }) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Settings</p>
        <h1 className="text-2xl font-medium">Profile and workspace controls</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Configure baseline preferences and manage your demo workspace lifecycle.
        </p>
      </div>
      <SectionCard>
        <h2 className="text-lg font-semibold">Profile and locale</h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Currency is fixed to {data.currency}. Typography and color tokens follow the Emergent Organic template.
        </p>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-sm">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Theme</p>
            <p className="mt-1 font-medium">Organic & Earthy</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-sm">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Typography</p>
            <p className="mt-1 font-medium">Work Sans / IBM Plex Sans</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-sm">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Currency</p>
            <p className="mt-1 font-medium">{data.currency}</p>
          </div>
        </div>
      </SectionCard>
      <SectionCard>
        <h2 className="text-lg font-semibold">Data controls</h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Use scenario loader for demo datasets and refresh dashboard metrics after imports.
        </p>
        <div className="mt-4">
          <SecondaryButton data-testid="settings-refresh-data" onClick={() => void resetDemo()}>
            Refresh workspace
          </SecondaryButton>
        </div>
      </SectionCard>
    </section>
  );
}
