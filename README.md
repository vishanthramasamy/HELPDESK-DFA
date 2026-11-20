# HELPDESK-DFA — Orbitdesk support workspace

 https://helpdesk-dfa.vercel.app/
 
A full-stack helpdesk ticket lifecycle application with a polished Orbit Help Desk inspired workspace, role-based access, persistent ticket history, and a backend-enforced deterministic finite automaton (DFA).

## Project status and URLs

- **Live frontend:** Not deployed yet — URL pending.
- **Backend API:** Not deployed yet — URL pending.
- **Database:** MongoDB Atlas, configured only on the backend through `MONGODB_URI`. No database credentials belong in this repository or frontend.
- **Local frontend:** `http://localhost:5173`
- **Local backend:** `http://localhost:5000` (`/api/health` checks API and database status).

Cloud deployment is not claimed until the deployed frontend, backend, and database have been checked. See [the deployment guide](documentation/deployment-guide.md).

## Features

- React, Vite, React Router, and responsive Orbitdesk-style UI.
- Express REST API with JWT authentication and USER, AGENT, and ADMIN roles.
- MongoDB/Mongoose models for users, tickets, lifecycle history, comments, and audit logs.
- DFA-controlled lifecycle transitions; invalid transitions are rejected server-side.
- Ticket creation, assignment/reassignment, comments, activity history, team management, dashboard counts, and DFA simulation.
- Vercel SPA rewrites and Render-compatible backend startup.

## Run locally

Requirements: Node.js 20 or newer and a MongoDB connection string (Atlas works; a local MongoDB replica set is needed for multi-document transaction support).

1. In a terminal, enter `backend`, run `npm install`, and copy `.env.example` to `.env`.
2. Set `MONGODB_URI` to your database connection string and replace `JWT_SECRET` with a long random secret. Keep `CLIENT_URL=http://localhost:5173`, `NODE_ENV=development`, and `PORT=5000` for local use.
3. In the backend directory run `npm run seed` once to add the optional demo accounts, then `npm run dev`.
4. In a second terminal, enter `frontend`, run `npm install`, and copy `.env.example` to `.env`.
5. Set `VITE_API_URL=http://localhost:5000/api`, then run `npm run dev` and open the Vite URL.

Optional demo accounts (created only by the explicit seed command): `admin@helpdesk.local`, `agent@helpdesk.local`, and `user@helpdesk.local`. Their shared development password is `Helpdesk123!`. Do not seed these accounts in a public production database; create a production administrator through a controlled process.

## DFA lifecycle

States: `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `CANCELLED`. Initial state: `OPEN`. Accepting terminal states: `CLOSED` and `CANCELLED`.

| Current state | Input | Next state |
|---|---|---|
| OPEN | ASSIGN | ASSIGNED |
| OPEN | CANCEL | CANCELLED |
| ASSIGNED | START | IN_PROGRESS |
| ASSIGNED | UNASSIGN | OPEN |
| ASSIGNED | REASSIGN | ASSIGNED |
| IN_PROGRESS | REASSIGN | ASSIGNED |
| IN_PROGRESS | RESOLVE | RESOLVED |
| RESOLVED | REOPEN | IN_PROGRESS |
| RESOLVED | CLOSE | CLOSED |

Any undefined state/input pair is rejected and recorded in the audit log. Role and ticket ownership checks are also enforced by the API.

## Cloud deployment

Deploy the backend as a Render Web Service with root directory `backend`, build command `npm install`, start command `npm start`, and health path `/api/health`. Deploy the Vite frontend on Vercel with root directory `frontend`, build command `npm run build`, output `dist`, and SPA rewrites from `vercel.json`. Set the actual Render origin in Render `CLIENT_URL` and the actual Render API URL ending in `/api` in Vercel `VITE_API_URL`. Full MongoDB Atlas, Render, Vercel, environment, CORS, and verification steps are in [documentation/deployment-guide.md](documentation/deployment-guide.md).

## Security

Never commit `.env` files, API tokens, JWT secrets, or Atlas URIs. The `.gitignore` excludes local environment files. If a database password has been shared in chat, a screenshot, or any public location, rotate it in Atlas before production use.
