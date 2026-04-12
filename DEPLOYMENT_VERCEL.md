# Deploying: Frontend on Vercel, Backend on Render

This repository is deployed as:

1. `backend` on Render (Express API)
2. `frontend` on Vercel (Vite React app)

## 1) Deploy backend to Render

Option A (recommended): use [`render.yaml`](./render.yaml) Blueprint deployment.

Option B (manual web service setup):

- Service type: `Web Service`
- Root directory: `backend`
- Runtime: `Node`
- Build command: `npm ci && npm run build`
- Start command: `npm run start`
- Health check path: `/health`
- Environment variable:
  - `DATA_DIR=/tmp/financial-assistant-data`

After deploy, note your backend URL, for example:
`https://financial-assistant-backend.onrender.com`

## 2) Deploy frontend to Vercel

- Create a Vercel project with root directory: `frontend`
- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable:
  - `VITE_API_BASE_URL` = your Render backend URL (example: `https://financial-assistant-backend.onrender.com`)
- Deploy

The SPA fallback rewrite is configured in [`frontend/vercel.json`](./frontend/vercel.json).

## Pre-deploy checks

Run these locally before pushing:

```bash
cd backend && npm run build
cd ../frontend && npm run build
```

## Notes

- Backend data is file-based and defaults to `/tmp/financial-assistant-data` in hosted environments.
- `/tmp` on Render is ephemeral, so data is **not durable** across restarts/redeployments.
- For persistent production data, replace file storage with a database (e.g. Postgres, MongoDB, Supabase).
