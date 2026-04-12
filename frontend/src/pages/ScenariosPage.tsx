import { SectionCard } from "../components/ui";

const scenarios = ["food-cap", "transport-budget", "subscription-creep", "uncategorized-risk"];

export function ScenariosPage({ runScenario }: { runScenario: (name: string) => Promise<void> }) {
  return (
    <section className="grid gap-3 md:grid-cols-2">
      {scenarios.map((scenario) => (
        <button
          key={scenario}
          className="text-left"
          onClick={() => {
            void runScenario(scenario);
          }}
        >
          <SectionCard className="hover:bg-slate-800">
            <div className="font-medium">{scenario}</div>
            <div className="text-sm text-slate-300">Load sample data and rules</div>
          </SectionCard>
        </button>
      ))}
    </section>
  );
}
