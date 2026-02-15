# Auth setup (PostgreSQL + Email + Google OAuth)

## 1. PostgreSQL

Create a database and set `DATABASE_URL` in `.env`:

```bash
cp .env.example .env
# Edit .env and set:
# DATABASE_URL=postgresql://user:password@localhost:5432/declare
```

On first run, the server creates the `users` table automatically.

## 2. JWT

Set a long random string in `.env`:

```bash
JWT_SECRET=your-super-secret-key-at-least-32-chars
```

## 3. Google OAuth (optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create an OAuth 2.0 Client ID (Web application).
3. Add authorized redirect URI: `http://localhost:4000/api/auth/google/callback` (or your `SERVER_URL` + `/api/auth/google/callback`).
4. Set in `.env`:
   - `GOOGLE_CLIENT_ID=...`
   - `GOOGLE_CLIENT_SECRET=...`
   - `SERVER_URL=http://localhost:4000` (base URL of this server)
   - `CLIENT_ORIGIN=http://localhost:5173` (your React app URL)

Without these, email/password auth still works; only "Sign in with Google" is disabled.

## 4. API endpoints

- `POST /api/auth/register` — body: `{ email, password, displayName }` → `{ user, token }`
- `POST /api/auth/login` — body: `{ email, password }` → `{ user, token }`
- `GET /api/auth/me` — header `Authorization: Bearer <token>` → current user
- `GET /api/auth/google` — redirects to Google
- `GET /api/auth/google/callback` — redirects to `CLIENT_ORIGIN/auth/callback?token=...` or `?error=...`

## 5. Socket.IO

When connecting, send the JWT in the handshake so the server can attach `userId` and `displayName`:

```js
const socket = io(SERVER_URL, { auth: { token: "YOUR_JWT" } });
```

Then you can join with just `{ roomId }`; the server uses the authenticated user's name. Without a token, send `{ roomId, playerName }` (guest/legacy).
