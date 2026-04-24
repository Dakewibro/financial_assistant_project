# Render + MongoDB Atlas Deployment

This backend is now configured to run as a Render web service with MongoDB Atlas.

## Render service settings

- Root directory: `backend`
- Build command: `npm ci --include=dev && npm run build`
- Start command: `npm run start`
- Health check path: `/health`
- Runtime: `Node`
- Node version: `20`

If you use Render Blueprints, the root-level `render.yaml` already defines the service.

If this Render service existed before the current blueprint settings were added, update the dashboard values manually. Existing services do not always pick up corrected defaults automatically.

## Required environment variables

- `STORAGE_MODE=mongo`
- `JWT_SECRET=<long random string; required in production — the app refuses to start with the dev default when `VERCEL=1` or `NODE_ENV=production`>`
- `ADMIN_API_TOKEN=<secret required for protected mutation endpoints>`
- `MONGODB_URI=<your Atlas connection string>`
- `MONGODB_DB=financial_assistant`
- `ALLOWED_ORIGINS=<your frontend URL>`
- `AUTH_ENFORCED` — on production hosts (`NODE_ENV=production` or `VERCEL=1`) the API defaults to requiring a Bearer token on enforced routes. Set `AUTH_ENFORCED=false` only for trusted private demos.
- `DEMO_MUTATIONS_ENABLED` — defaults **on**: logged-in users can run demo load/clear/seed without `x-admin-token`. Set `DEMO_MUTATIONS_ENABLED=false` on the API if you want only operators (with `x-admin-token`) to run those routes on a shared Mongo host.

Example:

```text
STORAGE_MODE=mongo
JWT_SECRET=<openssl rand -base64 48>
ADMIN_API_TOKEN=<set-a-strong-secret>
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<dbname>?retryWrites=true&w=majority
MONGODB_DB=financial_assistant
ALLOWED_ORIGINS=https://your-frontend.vercel.app,http://localhost:5173
```

## MongoDB Atlas checklist

1. Make sure the Atlas cluster user has read/write access to the target database.
2. Add the Render outbound IP range to Atlas Network Access, or temporarily allow `0.0.0.0/0` for testing.
3. Use the Atlas SRV connection string in `MONGODB_URI`.

## What changes for production

- Render sets `PORT` automatically.
- The backend will start with `node dist/server.js`.
- The backend now binds the Render port immediately, while `/health` stays `503` until Mongo finishes connecting.
- If Atlas connection fails, the service now exits instead of silently appearing healthy.
- If `STORAGE_MODE=mongo` is set without `MONGODB_URI`, startup now exits immediately with a configuration error.
- Protected mutation endpoints such as `/api/import` and `/api/generate-test-data` require `ADMIN_API_TOKEN` when running against Mongo/deployed storage.

## Expected successful startup log

```text
> backend@1.0.0 start
> node dist/server.js
Backend listening on 10000 using mongo storage
```

## Troubleshooting

- `npm error Missing script: "start"` means Render is almost certainly running from the wrong directory or using stale service settings. Verify `Root directory=backend` first.
- `No open ports detected` should no longer persist after the server binds. If it still appears after this change, the running deploy is likely using an older commit or a different service configuration.
- If the service settings are correct but the old behavior persists, redeploy manually with build cache cleared.
