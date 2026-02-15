# Plan: Taking Declare Online (Users & Deployment)

This document outlines everything required to turn the current Declare card game (room + player name only) into an online product with user accounts and production-ready deployment.

---

## Current State

- **No auth:** Players join with `roomId` + `playerName`. Identity is `socket.id`.
- **No persistence:** Rooms and game state live in server memory only.
- **Flow:** Lobby → enter room ID + name → GameBoard. No accounts, no history.

---

## 1. Authentication & Users

### 1.1 What you need

| Feature | Purpose |
|--------|---------|
| **User accounts** | Persistent identity, display name, optional stats |
| **Register / Login** | Email+password and/or OAuth (Google, etc.) |
| **Sessions** | Keep user logged in (JWT in httpOnly cookie or localStorage) |
| **Logout** | Clear session; optional “leave all rooms” |

### 1.2 Recommended approach

- **Option A (simplest):** Email + password only. Use a library (e.g. **Passport.js** with local strategy, or **better-auth**).
- **Option B:** Add **OAuth** (Google, GitHub) so users can “Sign in with Google.” Use Passport OAuth strategies or a provider (Auth0, Clerk, Supabase Auth).
- **Option C:** Use **Supabase** or **Firebase** for auth + DB; they give you users, sessions, and a database in one place.

### 1.3 User model (PostgreSQL)

- `id` (UUID, primary key)
- `email` (unique, nullable for Google-only users)
- `password_hash` (nullable for OAuth-only users; bcrypt)
- `display_name` (what others see in game)
- `google_id` (unique, nullable; set when user signs in with Google)
- `avatar_url` (optional; from Google profile)
- `created_at`, `updated_at` (timestamptz)

### 1.4 Auth endpoints (REST API)

- `POST /api/auth/register` — body: `{ email, password, displayName }`
- `POST /api/auth/login` — body: `{ email, password }` → returns session/JWT
- `POST /api/auth/logout` — invalidate session
- `GET /api/auth/me` — return current user (for “Am I logged in?” on load)
- Optional: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`

---

## 2. Database

### 2.1 Why you need it

- Store users.
- Optionally: persist rooms, game history, scores, so games survive server restarts and you can show “last games” or leaderboards.

### 2.2 Choice

- **PostgreSQL** (e.g. Neon, Supabase, Railway) — good if you want relations (users, games, rounds).
- **MongoDB** (e.g. Atlas) — fine if you prefer documents (e.g. one doc per room/game).
- **SQLite** — only for tiny/low-traffic; not ideal for “put online” with multiple users.

### 2.3 Tables/collections (minimal)

- **users** — as in §1.3.
- **sessions** (if you manage sessions in DB): `userId`, `tokenOrSessionId`, `expiresAt`.
- Optional for later: **games** (roomId, status, players[], winner, startedAt, endedAt), **game_players** (gameId, userId, score, rank).

Start with **users** (and sessions if not using JWT-only). Add game persistence when you need it.

---

## 3. Backend Changes (Node + Express + Socket.IO)

### 3.1 New structure

- **REST API** for auth (and later profile, stats): e.g. `server/src/routes/auth.js`, `server/src/routes/users.js`.
- **Middleware:** `authMiddleware` that checks JWT/session and sets `req.user`.
- **Socket.IO auth:** When a client connects, they send a token (in handshake auth or first event). Server verifies it and attaches `socket.userId` (and optionally `socket.user`). All game events use `socket.userId` instead of (or in addition to) `socket.id` for identity.

### 3.2 Auth middleware (REST)

- Read JWT from header (`Authorization: Bearer <token>`) or cookie.
- Verify signature and expiry; load user; set `req.user`.
- Use on routes that require login: `GET /api/auth/me`, and any future protected routes.

### 3.3 Socket.IO authentication

- **Handshake:** Client sends token in `auth: { token: "..." }` (or in a cookie that Socket.IO can read).
- **Server:** In `io.use((socket, next) => { ... })`, verify token, set `socket.userId = user.id`, then `next()`. If invalid, `next(new Error("Unauthorized"))`.
- **Game logic:** When creating/joining rooms, store and use `userId` (and keep `socket.id` for the live connection). On reconnect, same user can rejoin by `userId`; you can keep `player.id = socket.id` for backward compatibility but map it to a user in your DB if you persist games.

### 3.4 Environment & secrets

- `.env` (never committed): `JWT_SECRET`, `DATABASE_URL`, `PORT`, `CLIENT_ORIGIN` (for CORS).
- Use `dotenv` and validate that required vars exist on startup.

---

## 4. Frontend Changes (React)

### 4.1 Auth state

- **Auth context:** Holds `{ user, loading, login, register, logout }`. On app load, call `GET /api/auth/me` to restore session.
- **Token storage:** If using JWT in localStorage, store it after login and send in `Authorization` header on every API request. Prefer httpOnly cookie if your API and client are on the same site (or configured CORS/credentials).

### 4.2 Routes / flow

- **Public:** Landing (or marketing) page, Login, Register.
- **Protected:** Lobby, Game. Only reachable if `user` exists; else redirect to Login.
- **Optional:** “Play as guest” that creates a temporary display name and no account (no persistence across devices).

Suggested flow:

1. **Not logged in:** Show Landing → Login / Register. After login → Lobby.
2. **Logged in:** Lobby (create room / join with code). Display name comes from `user.displayName`.
3. From Lobby → Game (same as now, but server knows `userId`).

### 4.3 Pages/components

- **Login page** — email, password, submit → call login API → save token/session → redirect to Lobby.
- **Register page** — email, password, display name → register API → then login or redirect to Login.
- **Lobby** — use `user.displayName` instead of a free-text name; optional “Edit profile” later. Room ID flow can stay (create room / join by code).

### 4.4 Socket connection

- After login, when opening Socket.IO connection, send token in `auth: { token }` so the server can attach `userId` to the socket.
- If token expires mid-game, you may need to refresh (e.g. refresh token) or prompt re-login and reconnect.

---

## 5. Game Integration (Users ↔ Game)

### 5.1 Join room with user

- **Current:** `join-room` sends `{ roomId, playerName }`; server uses `socket.id` as player id.
- **New:** Client sends `{ roomId }` (display name from `user.displayName`). Server uses `socket.userId` as stable identity; you can still keep a `socketId` for the current connection so reconnects update the same player slot by `userId`.

### 5.2 Reconnection

- If a user refreshes or reconnects, they send the same JWT. Server finds the room they were in (e.g. by storing `userId → roomId` or by looking up in room state) and puts them back in the same seat (by `userId`), updating `socket.id` for that slot. Game state is already in memory (or later in DB).

### 5.3 Optional: Persist games

- When a game ends, write a row to **games** (and **game_players**). Then you can show “Your games” or “Last game” in the UI and, if you want, “Resume” (if you also persist in-progress state).

---

## 6. Security Checklist

- **Passwords:** Hash with bcrypt (or argon2); never log or store plaintext.
- **JWT:** Sign with a strong secret; set short expiry (e.g. 15 min) and use refresh tokens for long-lived sessions, or longer expiry (e.g. 7 days) if simpler.
- **HTTPS:** Use TLS in production (handled by host or reverse proxy).
- **CORS:** Restrict to your frontend origin(s); allow credentials if using cookies.
- **Rate limiting:** On login/register and on socket connection to avoid abuse.
- **Input validation:** Validate/sanitize email, displayName, roomId on server.
- **Socket events:** On every game event, verify the socket’s `userId` is the one allowed to perform the action (e.g. draw card only for current player).

---

## 7. Deployment & Infrastructure

### 7.1 What to deploy

- **Client:** Static build (Vite) → e.g. Vercel, Netlify, or same server as API.
- **Server:** Node (Express + Socket.IO) → e.g. Railway, Render, Fly.io, or a VPS.
- **Database:** Managed PostgreSQL or MongoDB (Neon, Supabase, Railway, Atlas).

### 7.2 Environment

- **Production:** Set `NODE_ENV=production`, `CLIENT_ORIGIN=https://yourdomain.com`, `DATABASE_URL`, `JWT_SECRET`.
- **Client:** Build-time env (e.g. Vite `import.meta.env`) for `VITE_API_URL` / `VITE_WS_URL` so the client hits the right API and WebSocket URL.

### 7.3 Socket.IO in production

- Sticky sessions: If you scale to multiple server instances, Socket.IO needs sticky sessions (or Redis adapter) so the same client always hits the same process. For a single instance, no change.

---

## 8. Phased Rollout

### Phase 1 — MVP “play online with accounts”

1. Add **users** table and **auth API** (register, login, logout, me).
2. Add **auth middleware** and **Socket auth**; link socket to `userId`.
3. Frontend: **Login / Register** pages, **auth context**, **protected Lobby/Game**.
4. Lobby/join-room: send only `roomId`; server uses `user.displayName` and `userId`.
5. Deploy client + server + DB with env and HTTPS.

Result: Only logged-in users can play; identity is stable and tied to an account.

### Phase 2 — Polish & persistence

- Optional “Play as guest” (no account, temporary name).
- Persist finished games (and optionally in-progress) in DB.
- Profile page: change display name, maybe avatar.
- “Your last game” or “History” in UI.

### Phase 3 — Growth features

- Matchmaking (find a random room or create one and wait).
- Leaderboards, stats (wins, games played).
- Email verification, password reset.
- OAuth (Google, etc.).

---

## 9. File / Folder Checklist (high level)

**Server (new or modified):**

- `server/src/routes/auth.js` — register, login, logout, me
- `server/src/middleware/auth.js` — verify JWT, set req.user
- `server/src/db/` or `server/src/models/` — user model, DB connection
- `server/index.js` — mount auth routes, `io.use(socketAuth)`, use `userId` in game logic
- `server/.env.example` — JWT_SECRET, DATABASE_URL, CLIENT_ORIGIN, PORT

**Client (new or modified):**

- `client/src/contexts/AuthContext.tsx` — user, login, register, logout, loading
- `client/src/pages/Login.tsx`, `Register.tsx`
- `client/src/App.tsx` or router — public vs protected routes; redirect if not logged in
- `client/src/components/Lobby.tsx` — use `user.displayName`; no name input when logged in
- `client/src/socket.ts` — send token in `auth` on connect
- Env: `VITE_API_URL`, optionally `VITE_WS_URL`

**Docs / config:**

- `.env.example` at root or in server
- Update README with “how to run with DB and auth”
- This plan (`ONLINE_DEPLOYMENT_PLAN.md`) as the single reference for “what’s required to put it online with users”

---

## 10. Summary

| Area | Required for “online with users” |
|------|----------------------------------|
| **Auth** | Register, login, logout, sessions (JWT or cookies) |
| **Database** | Users (and optionally sessions); later games |
| **Backend** | Auth API, auth middleware, Socket.IO auth by user |
| **Frontend** | Auth context, Login/Register, protected routes, Lobby uses user name |
| **Game** | Join room with userId; reconnection by userId |
| **Security** | Hash passwords, HTTPS, CORS, rate limit, validate inputs |
| **Deploy** | Client host, server host, DB host, env vars |

Starting with **Phase 1** gives you a shippable “play online with accounts” product; Phases 2–3 add persistence, polish, and growth features on top of the same plan.
