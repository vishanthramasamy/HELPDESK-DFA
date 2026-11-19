# Deployment guide

This guide describes how to deploy the starter foundation. It does not mean cloud resources have already been created or tested. Use placeholders until you have actual service URLs.

## 1. Create an Atlas cluster

1. Create a MongoDB Atlas account and a project, then create a cluster in a region close to the Render service.
2. In Database Access, create a dedicated application database user with a strong unique password and only the required database privileges. This is distinct from your Atlas website login.
3. In Network Access, add the outbound IP ranges required by your Render plan if available. If Render uses dynamic outbound IPs, Atlas may require `0.0.0.0/0`; use this only with a strong database password and least-privilege user, and understand it allows network-level connection attempts from anywhere. Never put credentials in frontend files or source control.
4. In Atlas, choose Connect → Drivers and copy the SRV connection string. Replace its username/password placeholders and set the database name, e.g. `helpdesk`. URL-encode special characters in credentials.

## 2. Connect Atlas to Render

1. Create a Render Web Service for the backend folder (`backend`).
2. Add `MONGODB_URI` as a Render secret environment variable. Do not add it to a committed file.
3. Confirm the Atlas network access list allows the Render service’s outbound traffic.
4. The server connects through Mongoose during startup and exits with an error if the database connection fails. `/api/health` reports whether the database is connected.

## 3. Deploy backend on Render

- Runtime: Node
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`
- Environment variables: `NODE_ENV=production`, `MONGODB_URI=<Atlas URI>`, `JWT_SECRET=<long random secret>`, `CLIENT_URL=<Vercel origin>`. Render supplies `PORT`; the app uses `process.env.PORT` and falls back to 5000 locally.

After deployment, copy the actual Render HTTPS origin, e.g. `https://<your-service>.onrender.com`. Do not invent or publish a URL before Render assigns it.

## 4. Configure CORS

Set `CLIENT_URL` in Render to the exact Vercel production origin, without a trailing slash (for example, `https://<your-project>.vercel.app`). For a separate preview environment, include its exact origin as a comma-separated value. Redeploy after changing variables. CORS is not authentication; secure API endpoints with JWT and backend role checks.

## 5. Deploy frontend on Vercel

- Import the repository/project and set Root Directory to `frontend`.
- Framework preset: Vite.
- Build command: `npm run build`.
- Output directory: `dist`.
- Set `VITE_API_URL` to the actual Render API base URL ending in `/api`, e.g. `https://<your-service>.onrender.com/api`.
- `vercel.json` rewrites SPA paths to `index.html`, so React Router routes can load on refresh.

Vite embeds `VITE_*` values in browser assets. Put only public API origins there—never secrets.

## 6. Environment variables

Backend Render settings: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `NODE_ENV=production`; Render injects `PORT`. Locally copy `backend/.env.example` to `backend/.env`.

Frontend Vercel settings: `VITE_API_URL`. Locally copy `frontend/.env.example` to `frontend/.env`.

Never commit real values, screenshots of secrets, or Atlas connection strings. Rotate credentials immediately if exposed.

## 7. Verify deployed services

1. Open `https://<actual-render-host>/api/health`; expect HTTP 200 JSON with `status: ok` and `database: connected`.
2. Open the deployed frontend `/health` page. Confirm it reports backend reachable and the expected HTTP status/response time.
3. Use the browser network panel or an API client to verify requests go to the Render HTTPS origin and not localhost.
4. Once authentication and ticket APIs are implemented, test registration, login, ticket creation, assignment, valid and invalid DFA transitions, history, and dashboard statistics against the deployed service and verify corresponding Atlas documents. This starter does not yet implement those endpoints, so these checks cannot pass today.

## 8. Troubleshooting

- **Render startup failure:** check Render logs, start command, package install, required env values, and whether Atlas is reachable.
- **Health says database disconnected / Mongoose timeout:** check URI encoding, DB user/password, Atlas network access list, cluster status, and database user privileges.
- **CORS error:** compare the browser Origin exactly to `CLIENT_URL`; redeploy the backend after changes.
- **Frontend calls localhost in production:** set Vercel `VITE_API_URL` to the Render API URL and trigger a new frontend deployment.
- **Refresh gives 404:** ensure Vercel uses the included `vercel.json` rewrite and redeploy.
- **Vercel build failure:** verify Root Directory is `frontend`, build command is `npm run build`, and output is `dist`.
- **401/403 from API:** once auth is implemented, verify the bearer token and role permissions; CORS does not grant access.
- **Slow first Render response:** a free/idle service may need to wake; the health endpoint is the initial diagnostic.
