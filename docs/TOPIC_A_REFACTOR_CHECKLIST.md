# Topic A Refactor Checklist

This checklist is ordered by marking risk, not by implementation convenience.

## Priority 0: satisfy Topic A deliverable expectations

- Add a minimal text-based entry point that reads transaction and rule files, offers a simple menu, and prints summaries and alerts.
- Keep the existing web app if you want it, but do not rely on the GUI alone as evidence of Topic A compliance.
- Make the file-first workflow obvious in the README: sample inputs, command to run, expected outputs, and where the case-study files live.
- Keep 3-4 case studies with exact input files and clearly captured outputs. The existing `scenarios/` folder is a strong base for this.
- Add a short research artifact to the repo, or a linked document, covering:
  - 4-6 existing budgeting tools
  - a comparison table across 5-6 criteria
  - at least 5 design trade-offs

## Priority 1: correctness and scope clarity

- Decide whether the app is:
  - a single-user / single-workspace project for coursework, or
  - a true multi-user finance app
- If it stays single-user for Topic A, document that assumption clearly in the README and report.
- If it stays multi-user, add user/workspace ownership to transactions, rules, categories, and persisted workspace state.
- Keep alert logic deterministic and rule-based. Avoid adding opaque forecasting features unless you can justify and explain them clearly.

## Priority 2: code structure cleanup

- Break `backend/src/app.ts` into route modules:
  - `authRoutes`
  - `transactionRoutes`
  - `budgetRoutes`
  - `goalRoutes`
  - `insightRoutes`
  - `demoRoutes`
- Keep business logic in services and data access in repositories.
- Move pacing-specific calculations into a dedicated service layer.
- Split large frontend files, especially Quick Add and Dashboard, into hooks plus presentational components.

## Priority 3: documentation and presentation

- Commit `README.md` and `FEATURE_LOGIC.md`.
- Move long-form design notes into `docs/`.
- Add a lightweight architecture note explaining:
  - data model
  - alert rules
  - summary calculations
  - scenario/case-study workflow
- Add CI for:
  - backend build
  - frontend build
  - scenario golden tests

## Already improved in this cleanup patch

- Removed tracked duplicate artifacts and prototype files.
- Fixed alert IDs so acknowledgements can survive refreshes.
- Scoped alert acknowledgements by actor instead of one global set.
- Refreshed derived budgets immediately after rule creation.
- Corrected pacing to compare against the active period instead of always the month.
- Added focused unit coverage for alert ID stability and pacing logic.
