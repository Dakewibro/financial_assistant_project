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
- Build command: `npm ci && npm run build`
- Start command: `npm run start`
- Health check path: `/health`
- Environment variables:
  - `MONGODB_URI` = your Atlas connection string (set as secret)
  - `MONGODB_DB` = `financial_assistant` (or your preferred DB name)
  - `ALLOWED_ORIGINS` = comma-separated frontend origins:
    - `http://localhost:5173,https://<your-frontend>.vercel.app,https://*.vercel.app`

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

## Pre-deploy checks

Run these locally before pushing:

```bash
cd backend && npm run build
cd ../frontend && npm run build
```

## Notes

- Backend now uses MongoDB when `MONGODB_URI` is set.
- If `MONGODB_URI` is missing, backend falls back to local file storage for development/testing.
