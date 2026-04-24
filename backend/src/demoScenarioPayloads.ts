import foodCap from "./demo-scenarios/food-cap.json" with { type: "json" };
import freelancerMonth from "./demo-scenarios/freelancer-month.json" with { type: "json" };
import householdSideHustle from "./demo-scenarios/household-side-hustle.json" with { type: "json" };
import merchantMemory from "./demo-scenarios/merchant-memory.json" with { type: "json" };
import subscriptionCreep from "./demo-scenarios/subscription-creep.json" with { type: "json" };
import transportBudget from "./demo-scenarios/transport-budget.json" with { type: "json" };

export const DEMO_SCENARIO_IDS = [
  "food-cap",
  "transport-budget",
  "subscription-creep",
  "merchant-memory",
  "freelancer-month",
  "household-side-hustle",
] as const;

export type DemoScenarioId = (typeof DEMO_SCENARIO_IDS)[number];

/** Bundled scenario bodies (safe for serverless: no runtime read from `process.cwd()`). */
export function getDemoScenarioPayload(id: DemoScenarioId): unknown {
  const base =
    id === "food-cap"
      ? foodCap
      : id === "transport-budget"
        ? transportBudget
        : id === "subscription-creep"
          ? subscriptionCreep
          : id === "merchant-memory"
            ? merchantMemory
            : id === "freelancer-month"
              ? freelancerMonth
              : householdSideHustle;
  return structuredClone(base) as unknown;
}
