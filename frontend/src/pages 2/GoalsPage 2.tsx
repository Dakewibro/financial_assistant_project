import { useQuery } from "@tanstack/react-query";
import { createGoal, createGoalShare, contributeGoal, leaveGoal, listGoals, revokeGoalShare } from "../api/client";
import { PrimaryButton, SecondaryButton, SectionCard } from "../components/ui";
import { formatHKD } from "../lib/currency";
import { queryClient } from "../lib/queryClient";

export function GoalsPage() {
  const goalsQuery = useQuery({
    queryKey: ["goals"],
    queryFn: listGoals,
  });
  const goals = goalsQuery.data ?? [];

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Goals</p>
        <h1 className="text-2xl font-medium">Savings goals and collaboration</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Create goal targets, contribute progress, and share selected goals with collaborators.
        </p>
      </div>
      <SectionCard className="space-y-3">
        <h2 className="text-lg font-semibold">Create goal</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Start from a template and adjust target amounts later.</p>
        <PrimaryButton
          onClick={async () => {
            await createGoal({ name: "Emergency fund", targetAmount: 10000 });
            await queryClient.invalidateQueries({ queryKey: ["goals"] });
          }}
        >
          Add goal template
        </PrimaryButton>
      </SectionCard>

      <div className="grid gap-4">
        {goals.map((goal) => (
          <SectionCard key={goal.id} className="space-y-3" data-testid={`goal-card-${goal.id}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">{goal.name}</h3>
              {goal.isShared ? <span className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-2 py-1 text-xs">SHARED</span> : null}
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              {formatHKD(goal.currentAmount)} / {formatHKD(goal.targetAmount)}
            </p>
            <div className="h-2 rounded-full bg-[var(--muted)]">
              <div className="h-2 rounded-full bg-[var(--primary)]" style={{ width: `${Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)}%` }} />
            </div>
            <div className="flex flex-wrap gap-2">
              <PrimaryButton onClick={async () => { await contributeGoal(goal.id, 500); await queryClient.invalidateQueries({ queryKey: ["goals"] }); }}>
                +HK$500
              </PrimaryButton>
              {goal.isOwner ? (
                <>
                  <SecondaryButton data-testid={`goal-share-${goal.id}`} onClick={async () => { await createGoalShare(goal.id); await queryClient.invalidateQueries({ queryKey: ["goals"] }); }}>
                    Share
                  </SecondaryButton>
                  {goal.shareToken ? (
                    <SecondaryButton onClick={async () => { await revokeGoalShare(goal.id); await queryClient.invalidateQueries({ queryKey: ["goals"] }); }}>
                      Revoke share
                    </SecondaryButton>
                  ) : null}
                </>
              ) : (
                <SecondaryButton onClick={async () => { await leaveGoal(goal.id); await queryClient.invalidateQueries({ queryKey: ["goals"] }); }}>
                  Leave
                </SecondaryButton>
              )}
            </div>
            {goal.shareToken ? <p className="text-xs text-[var(--muted-foreground)]">Join token: {goal.shareToken}</p> : null}
            {goal.contributions.length > 0 ? (
              <p className="text-xs text-[var(--muted-foreground)]">
                Last contribution: {goal.contributions.at(-1)?.name} {formatHKD(goal.contributions.at(-1)?.amount ?? 0)}
              </p>
            ) : null}
          </SectionCard>
        ))}
      </div>
    </section>
  );
}
