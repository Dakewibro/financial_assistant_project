# Micro scenario: all uncategorized rows

## Goal

Topic A “edge case” emphasis: a month where **every** transaction row is `Uncategorized`, stressing cleanup workflows and the **`uncategorized_warning`** rule.

## Inputs

**`import.json`** only (no CSV mirror — intentionally tiny).

### Frozen evaluation instant

**2026-03-29T12:00:00Z** — see `backend/tests/scenarioGolden.test.ts`.

## Outputs checked

**`expected-alerts.json`** (warning fires because count `5 > threshold 2`).

## Limitations

- Does not model partial categorization progress (see `uncategorized-risk` for a smaller count).

## Brainstorm

- Add a follow-up import where rows are recategorized to show **before/after** alert disappearance.
