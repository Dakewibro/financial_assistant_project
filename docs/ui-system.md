# UI System Notes (Tailwind)

## Intent
Use Tailwind to improve implementation speed while keeping visual consistency and accessibility.

## Baseline Tokens
- Surface: `bg-slate-900`
- Page background: `bg-slate-950`
- Primary action: `bg-violet-500`
- Positive action: `bg-emerald-600`
- Warning state: `bg-amber-500/10` + `border-amber-400/40`

## Component Rules
- Inputs/selects/buttons use rounded corners and consistent spacing.
- High-contrast text for key values and alerts.
- Error and warning states are explicit and visible.

## Tailwind Trade-off
- Utility classes accelerate delivery.
- To avoid class sprawl, future iterations should extract shared primitives in `frontend/src/components/ui`.
