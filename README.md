# Financial Assistant

Financial Assistant is a full-stack budgeting app for the COMP1110 Topic A project. It combines a React frontend with a TypeScript/Express API for tracking transactions, enforcing budget rules, surfacing alerts, detecting recurring spend, and loading reproducible scenario packs from this repository.

Public frontend: [financial-assistant-project-dakewibros-projects.vercel.app](https://financial-assistant-project-dakewibros-projects.vercel.app?_vercel_share=sCLBZrf5QitzXknt8CoFizzmoN23DDgP)

## Current Feature Set

- Email/password authentication with onboarding and JWT-backed sessions
- Transaction tracking with filters, quick-add flows, and CSV/JSON import/export
- Budget rules, pacing calculations, and alert generation
- Recurring merchant and subscription-style spend detection
- Insights, dashboard widgets, and saved dashboard layout preferences
- Goals, budget sharing, and share-link join flows
- Demo scenario loading from curated fixtures in `scenarios/`
- Optional MongoDB persistence, with in-memory mode for fast local development

## Tech Stack

- Frontend: React 19, Vite, React Router, Tailwind CSS, Radix UI
- Backend: TypeScript, Express 5, Zod, Day.js
- Testing: Vitest and Supertest
- Persistence: in-memory store by default locally, optional MongoDB via Mongoose
- Data fixtures: JSON and CSV scenario packs under `scenarios/`

## Repository Layout


| Path          | Purpose                                                                |
| ------------- | ---------------------------------------------------------------------- |
| `backend/`    | Express API, finance logic, persistence layer, and automated tests     |
| `frontend/`   | React app, pages, components, auth context, and API client             |
| `scenarios/`  | Reproducible case-study inputs, expected outputs, and evaluation notes |
| `scripts/`    | Repo-level helper scripts                                              |
| `render.yaml` | Render deployment blueprint                                            |


## Main App Areas

### Frontend routes

The current frontend includes these main screens:

- `/login` and `/register`
- `/onboarding`
- `/dashboard`
- `/transactions`
- `/budgets`
- `/alerts`
- `/recurring`
- `/goals`
- `/insights`
- `/settings`
- `/join/:token`

### Backend API coverage

The backend currently exposes routes for:

- auth and current-user lookup
- onboarding completion
- transactions, transaction counts, and smart-entry helpers
- categories and budget rules
- budgets, goals, and share tokens
- dashboard preferences
- summaries, alerts, recurring spend, insights, and pacing
- import/export
- demo scenario listing, loading, clearing, and test-data generation

## Local Development

Use Node.js 20 or newer. Run the backend and frontend in separate terminals.

### 1. Start the backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Default API URL: `http://localhost:4000`

Important local behavior:

- If `MONGODB_URI` is unset, the backend falls back to in-memory storage even if `STORAGE_MODE=mongo`
- `AUTH_ENFORCED` defaults to `false` locally unless you explicitly turn it on
- Demo data mutation routes are enabled by default unless `DEMO_MUTATIONS_ENABLED=false`

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Default frontend URL: `http://localhost:5173`

The frontend talks to:

- `VITE_BACKEND_URL` when set
- otherwise `http://localhost:4000` in dev
- otherwise same-origin `/api` in production-style setups

## Environment Variables

### Backend

See `[backend/.env.example](/Users/Deaptheror/Desktop/COMP1110%20Materials/financial_assistant_project/backend/.env.example)`.

Common settings:

- `PORT`
- `MONGODB_URI`
- `MONGODB_DB`
- `STORAGE_MODE`
- `JWT_SECRET`
- `ADMIN_API_TOKEN`
- `ALLOWED_ORIGINS`
- `AUTH_ENFORCED`
- `DEMO_MUTATIONS_ENABLED`

### Frontend

See `[frontend/.env.example](/Users/Deaptheror/Desktop/COMP1110%20Materials/financial_assistant_project/frontend/.env.example)`.

Common settings:

- `VITE_BACKEND_URL`
- `VITE_DEV_API_PROXY_TARGET`

## Demo Account

The current login screen is prefilled with a built-in demo account:

- Email: `demo@finassist.app`
- Password: `demo1234`

## Build And Test

### Backend

```bash
cd backend
npm run build
npm start
```

```bash
cd backend
npm test
```

```bash
cd backend
npm run test:scenarios
```

### Frontend

```bash
cd frontend
npm run build
```

### Repo helper

```bash
bash scenarios/scripts/run-golden.sh
```

## Scenario Packs

The backend ships with these bundled demo scenarios:

- `food-cap`
- `transport-budget`
- `subscription-creep`
- `merchant-memory`
- `freelancer-month`
- `household-side-hustle`

Related files live under `scenarios/` and include:

- `import.json` for canonical import payloads
- `transactions.csv` and `rules.json` where applicable
- `expected-summary.json`
- `expected-alerts.json`
- `evaluation.md`

Extra import edge cases are stored in `scenarios/manual-bulk-upload/`.

## Deployment Files

- `[render.yaml](/Users/Deaptheror/Desktop/COMP1110%20Materials/financial_assistant_project/render.yaml)`
- `[backend/RENDER_DEPLOYMENT.md](/Users/Deaptheror/Desktop/COMP1110%20Materials/financial_assistant_project/backend/RENDER_DEPLOYMENT.md)`
- `[backend/vercel.json](/Users/Deaptheror/Desktop/COMP1110%20Materials/financial_assistant_project/backend/vercel.json)`
- `[frontend/vercel.json](/Users/Deaptheror/Desktop/COMP1110%20Materials/financial_assistant_project/frontend/vercel.json)`

