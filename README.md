# Financial Assistant

A full-stack personal finance web app (React + Express + MongoDB) for tracking transactions, budgets, goals, recurring items, alerts, and insights. Amounts and UX are oriented around **HKD**.

---

## Run locally

You need **Node.js 20+** and two terminals: one for the API, one for the UI.

### 1. Backend API

```bash
cd backend
cp .env.example .env
# Edit .env:
# - Quick local run **without** MongoDB: remove `MONGODB_URI`. If you copied `.env.example`, also remove
#   the `STORAGE_MODE=mongo` line (that combo with an empty URI makes the server exit on startup).
#   With no URI, the API uses **in-memory** storage.
# - Persistent data: set a real `MONGODB_URI`, `STORAGE_MODE=mongo`, and a non-default `JWT_SECRET`.
npm install
npm run dev
```

The API listens on `**http://localhost:4000**` by default (`PORT` in `.env`). `npm run dev` runs `copy-demo-scenarios` first, which copies each scenario’s `scenarios/<id>/import.json` into `backend/src/demo-scenarios/` so bundled demo loads stay in sync.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server runs at `**http://localhost:5173**`. The client calls `**http://localhost:4000/api**` in development (see `frontend/src/lib/api.js`), so keep the backend on port 4000 or set `VITE_BACKEND_URL` / `VITE_API_BASE_URL` to match.

**CORS:** the API allows `http://localhost:5173` by default (`ALLOWED_ORIGINS` in `backend/src/config/env.ts`).

### 3. First use

Open the app, **register** or **log in**, complete **onboarding** if prompted, then use **Dashboard**, **Transactions**, **Budgets**, etc.

---

## Access online (deployed)

Deployment is split: **frontend** (e.g. Vercel) and **backend** (e.g. Render per `render.yaml` and `backend/RENDER_DEPLOYMENT.md`).

- **Frontend:** after you deploy the `frontend/` app, users open your Vercel (or other) URL. `frontend/vercel.json` may rewrite `/api/*` to your hosted API; update that file when your API base URL changes.
- **Backend:** configure `MONGODB_URI`, `JWT_SECRET`, `ALLOWED_ORIGINS` (your real frontend origin), `STORAGE_MODE=mongo`, and optionally `ADMIN_API_TOKEN` / `DEMO_MUTATIONS_ENABLED` as described in `backend/.env.example` and `backend/RENDER_DEPLOYMENT.md`.

If **Settings → Load test data** fails in production, check that `**DEMO_MUTATIONS_ENABLED`** is not `false` (or supply the `**x-admin-token**` header matching `ADMIN_API_TOKEN` if demo routes are locked down).

---

## Test data and Settings

### What the packs are

Six **case study scenarios** ship with the app. Each is defined under `scenarios/<scenario-id>/`, mainly via `**import.json`** (full import: transactions, rules, categories). The same files are copied into `backend/src/demo-scenarios/*.json` at `npm run dev` / `npm run build` for serverless-safe loading.


| Scenario ID             | What it exercises (short)              |
| ----------------------- | -------------------------------------- |
| `food-cap`              | Food spending vs a daily cap           |
| `transport-budget`      | Transport-heavy month and budget caps  |
| `subscription-creep`    | Subscription share of spending         |
| `merchant-memory`       | Repeat merchants and suggestions       |
| `freelancer-month`      | Budgets, alerts, recurring, goals      |
| `household-side-hustle` | Household vs business scopes and goals |


Folders also hold `**transactions.csv**`, `**rules.json**`, `**expected-*.json**`, and `**evaluation.md**` for coursework / golden tests—not all are loaded by the app UI; the UI loads the `**import.json**` payload (via the bundled copy).

### Load test data in the app

1. Sign in and open **Settings** (sidebar → **Settings**, route `/settings`).
2. Scroll to **Case study scenarios**.
3. Choose a scenario in the dropdown, then click **Load test data**.
4. Confirm the dialog. This **replaces** your workspace transactions and budget rules with that pack (and seeds demo goals for the two goal-heavy scenarios).

### Where to see the data

After a successful toast, open:

- **Transactions** — imported rows  
- **Dashboard** — widgets and summaries  
- **Budgets** — rules from the pack  
- **Alerts** — triggered alerts if applicable  
- **Goals** / **Recurring** / **Insights** — when the scenario includes or implies that data

To clear everything without loading a pack, use **Reset data** on the same Settings page (also clears related local preferences on the device).

### Automated checks (same scenario files)

From repo root:

```bash
cd backend && npm run test:scenarios
```

See `scenarios/README.md` for folder layout and golden-test notes.

---

## Repository layout (what each part is for)

This is a **map of major paths**, not every file (the UI includes many small Radix/shadcn-style components under `frontend/src/components/ui/`).

### Root


| Path                              | Purpose                                                          |
| --------------------------------- | ---------------------------------------------------------------- |
| `README.md`                       | This overview                                                    |
| `AGENTS.md`                       | Maintainer notes for AI agents (e.g. graphify refresh)           |
| `render.yaml`                     | Render.com blueprint for the backend service                     |
| `scripts/update-project-graph.sh` | Optional script to refresh the code knowledge graph              |
| `graphify-out/`                   | Generated graph / report artifacts (not required to run the app) |


### `backend/`


| Path                                                                | Purpose                                                                                                         |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `package.json`                                                      | Scripts: `dev`, `build`, `start`, `test`, `test:scenarios`, `copy-demo-scenarios`                               |
| `.env.example`                                                      | Environment variable template                                                                                   |
| `RENDER_DEPLOYMENT.md`                                              | Production / Render + Mongo checklist                                                                           |
| `vercel.json`, `railway.json`                                       | Alternate host configs if used                                                                                  |
| `src/server.ts`                                                     | Starts HTTP server and connects the database                                                                    |
| `src/app.ts`                                                        | Express app: REST routes (`/api/...`), auth, import, demo load/clear, etc.                                      |
| `src/config/env.ts`                                                 | Reads `PORT`, `MONGODB_URI`, `JWT_SECRET`, CORS, demo flags                                                     |
| `src/config/db.ts`                                                  | Mongo connection                                                                                                |
| `src/demoScenarioPayloads.ts`                                       | Imports bundled JSON and exposes `getDemoScenarioPayload`                                                       |
| `src/demo-scenarios/*.json`                                         | **Generated copies** of `scenarios/*/import.json` (do not edit by hand; change scenarios and rerun copy script) |
| `scripts/copy-demo-scenarios.mjs`                                   | Copies scenario `import.json` files into `src/demo-scenarios/`                                                  |
| `src/services/*.ts`                                                 | Domain logic (bulk import, recurring, insights, category suggestions, …)                                        |
| `src/workspacePersistence.ts`, `src/workspaceRuntime.ts`            | Workspace lifecycle / in-memory vs Mongo                                                                        |
| `src/alertService.ts`, `src/repository.ts`, `src/userRepository.ts` | Alerts, data access, users                                                                                      |
| `src/models/`                                                       | Mongoose models                                                                                                 |
| `tests/*.ts`                                                        | Vitest unit and integration tests                                                                               |


### `frontend/`


| Path                                                         | Purpose                                                                                                                                 |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                                               | `dev` (Vite), `build`, `preview`                                                                                                        |
| `vite.config.mjs`                                            | Dev server (port **5173**), optional `/api` proxy to backend                                                                            |
| `vercel.json`                                                | SPA rewrites and API proxy rules for deployment                                                                                         |
| `index.html`                                                 | Vite entry HTML                                                                                                                         |
| `src/main.jsx`, `src/App.js`                                 | React bootstrap and routes                                                                                                              |
| `src/pages/*.js`                                             | **Dashboard**, **Transactions**, **Budgets**, **Goals**, **Alerts**, **Recurring**, **Insights**, **Settings**, auth and **Onboarding** |
| `src/components/AppShell.js`                                 | Main nav / layout                                                                                                                       |
| `src/components/QuickAddDialog.js`, `QuickAddImportPanel.js` | Quick add and CSV/JSON import UX                                                                                                        |
| `src/contexts/AuthContext.js`                                | Login session / JWT in `localStorage`                                                                                                   |
| `src/lib/api.js`                                             | Axios client: `API_BASE`, Bearer token                                                                                                  |
| `src/lib/format.js`, `utils.js`                              | HKD formatting, `cn()` helper                                                                                                           |
| `public/import-template.csv`, `import-template.json`         | Downloadable import templates                                                                                                           |


### `scenarios/`


| Path                                                          | Purpose                                                                                  |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `README.md`                                                   | Scenario taxonomy and how golden tests use the data                                      |
| `<scenario-id>/import.json`                                   | Canonical payload consumed by copy script + API tests                                    |
| `<scenario-id>/transactions.csv`, `rules.json`                | Human-readable mirrors where present                                                     |
| `<scenario-id>/expected-summary.json`, `expected-alerts.json` | Golden expectations for `npm run test:scenarios`                                         |
| `<scenario-id>/evaluation.md`                                 | Written case study notes                                                                 |
| `manual-bulk-upload/`                                         | Extra CSV/JSON fixtures for the **Import** UI (separate from the six Settings scenarios) |
| `scripts/run-golden.sh`                                       | Shell helper to run golden tests                                                         |


---

## Other commands


| Command                      | Where       | Purpose                                     |
| ---------------------------- | ----------- | ------------------------------------------- |
| `npm test`                   | `backend/`  | Full Vitest suite                           |
| `npm run test:scenarios`     | `backend/`  | Scenario golden tests only                  |
| `npm run build && npm start` | `backend/`  | Production-style API                        |
| `npm run build`              | `frontend/` | Static production build in `frontend/dist/` |


---

## Licence / course

Built as a **COMP1110**–style project; adjust attribution and licence to match your course submission requirements.