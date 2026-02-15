// server/src/db.js - PostgreSQL connection and schema
import pg from "pg";
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn("DATABASE_URL not set; auth and persistence will fail.");
}

const pool = connectionString
  ? new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  : null;

export async function query(text, params) {
  if (!pool) throw new Error("Database not configured (DATABASE_URL missing)");
  return pool.query(text, params);
}

export async function initDb() {
  if (!pool) return;
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE,
      password_hash VARCHAR(255),
      display_name VARCHAR(255) NOT NULL,
      google_id VARCHAR(255) UNIQUE,
      avatar_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
  `);
  console.log("Database schema ready (users table).");
}

export async function getUserById(id) {
  const res = await query(
    "SELECT id, email, display_name, avatar_url, google_id, created_at FROM users WHERE id = $1",
    [id]
  );
  return res.rows[0] || null;
}

export async function getUserByEmail(email) {
  const res = await query("SELECT * FROM users WHERE email = $1", [email]);
  return res.rows[0] || null;
}

export async function getUserByGoogleId(googleId) {
  const res = await query("SELECT * FROM users WHERE google_id = $1", [googleId]);
  return res.rows[0] || null;
}

export async function createUser({ email, passwordHash, displayName, googleId, avatarUrl }) {
  const res = await query(
    `INSERT INTO users (email, password_hash, display_name, google_id, avatar_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, display_name, avatar_url, google_id, created_at`,
    [email || null, passwordHash || null, displayName, googleId || null, avatarUrl || null]
  );
  return res.rows[0];
}

export async function updateUser(id, fields) {
  const allowed = ["display_name", "avatar_url", "email", "password_hash", "google_id"];
  const updates = [];
  const values = [];
  let i = 1;
  for (const [key, value] of Object.entries(fields)) {
    const col = key.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
    if (allowed.includes(col) && value !== undefined) {
      updates.push(`${col} = $${i}`);
      values.push(value);
      i++;
    }
  }
  if (updates.length === 0) return getUserById(id);
  updates.push("updated_at = NOW()");
  values.push(id);
  await query(`UPDATE users SET ${updates.join(", ")} WHERE id = $${i}`, values);
  return getUserById(id);
}

export { pool };
