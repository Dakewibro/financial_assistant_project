# Deploying: Frontend on Vercel, Backend on Render + MongoDB Atlas

This repository is deployed as:

1. `backend` on Render (Express API)
2. `frontend` on Vercel (Vite React app)

## 1) Create a MongoDB Atlas database

1. Create an Atlas account and project.
2. Create a cluster (free tier is fine for development).
3. In Atlas, create a database user with read/write access.
4. In Atlas network access:
   - For easiest Render setup, allow `0.0.0.0/0`.
   - For tighter security, allow Render egress IPs from your region.
5. Copy your connection string from Atlas (`mongodb+srv://...`).
6. Replace `<username>`, `<password>`, and optionally set the database name at the end (or use `MONGODB_DB` on Render).

## 2) Deploy backend to Render

Option A (recommended): use [`render.yaml`](./render.yaml) Blueprint deployment.

Option B (manual web service setup):

- Service type: `Web Service`
- Root directory: `backend`
- Runtime: `Node`
- Build command: `npm ci --include=dev && npm run build`
- Start command: `npm run start`
- Health check path: `/health`
- Environment variables:
  - `NODE_VERSION` = `20`
  - `STORAGE_MODE` = `mongo`
  - `ADMIN_API_TOKEN` = a secret required for protected mutation endpoints like `/api/import` and `/api/generate-test-data`
  - `MONGODB_URI` = your Atlas connection string (set as secret)
  - `MONGODB_DB` = `financial_assistant` (or your preferred DB name)
  - `ALLOWED_ORIGINS` = comma-separated frontend origins:
    - `http://localhost:5173,https://<your-frontend>.vercel.app,https://*.vercel.app`

If the Render service was created before the current [`render.yaml`](./render.yaml) was added or corrected, update these values manually in the Render dashboard instead of assuming they will be backfilled automatically.

After deploy, note your backend URL, for example:
`https://financial-assistant-backend.onrender.com`

## 3) Deploy frontend to Vercel

- Create a Vercel project with root directory: `frontend`
- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Optional environment variable:
  - `VITE_DEV_API_PROXY_TARGET` for local dev only (defaults to `http://localhost:4000`)
- Deploy

Frontend uses same-origin `/api/*` calls. In Vercel, [`frontend/vercel.json`](./frontend/vercel.json) rewrites:
1. `/api/*` to your Render backend
2. everything else to `index.html` for SPA routing

## 4) Verify deployment

1. Check backend health:
   - `GET https://<your-render-service>.onrender.com/health`
2. Add a transaction from frontend and confirm persistence after backend restart/redeploy.
3. Confirm browser requests from your Vercel domain succeed (CORS), while unknown origins are blocked if origin allowlists are set.
4. Confirm the Render startup log shows:
   - `> backend@1.0.0 start`
   - `> node dist/server.js`
   - `Backend listening on 10000` or the Render-assigned port

## Pre-deploy checks

Run these locally before pushing:

```bash
cd backend && npm run build
cd ../frontend && npm run build
```

## Notes

- On Render, set `STORAGE_MODE=mongo` and provide `MONGODB_URI`; startup now fails fast if MongoDB is explicitly required but not configured.
- The backend now binds to Render's port immediately and reports `/health` as `503` until Mongo is ready, which helps Render detect the web service during startup.
- Set `ADMIN_API_TOKEN` in deployed environments before using protected mutation endpoints. Without it, `/api/import` and `/api/generate-test-data` return a configuration error instead of modifying data.
- For local development and tests, the backend still falls back to non-Mongo storage when `MONGODB_URI` is omitted and `STORAGE_MODE` is not forced to `mongo`.

## Troubleshooting

- `npm error Missing script: "start"` on Render usually means the service is not running inside the `backend` directory. Re-check `Root directory` before changing package scripts.
- If the service keeps using old settings after you fix them, trigger a manual redeploy with build cache cleared.
