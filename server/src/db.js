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
  await query(`
    CREATE TABLE IF NOT EXISTS friendships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
      addressee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(requester_id, addressee_id)
    );
    CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
    CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);

    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      payload JSONB DEFAULT '{}',
      read BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
  `);
  console.log("Database schema ready.");
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

export async function getUserByDisplayName(displayName) {
  const res = await query(
    "SELECT id, email, display_name, avatar_url FROM users WHERE LOWER(display_name) = LOWER($1)",
    [displayName]
  );
  return res.rows[0] || null;
}

export async function sendFriendRequest(requesterId, addresseeId) {
  const res = await query(
    `INSERT INTO friendships (requester_id, addressee_id)
     VALUES ($1, $2)
     ON CONFLICT (requester_id, addressee_id) DO NOTHING
     RETURNING *`,
    [requesterId, addresseeId]
  );
  return res.rows[0] || null;
}

export async function respondFriendRequest(id, status, addresseeId) {
  const res = await query(
    `UPDATE friendships SET status = $1
     WHERE id = $2 AND addressee_id = $3
     RETURNING *`,
    [status, id, addresseeId]
  );
  return res.rows[0] || null;
}

export async function getFriends(userId) {
  const res = await query(
    `SELECT
       f.id,
       CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END AS friend_id,
       CASE WHEN f.requester_id = $1 THEN u2.display_name ELSE u1.display_name END AS display_name,
       CASE WHEN f.requester_id = $1 THEN u2.avatar_url ELSE u1.avatar_url END AS avatar_url
     FROM friendships f
     JOIN users u1 ON u1.id = f.requester_id
     JOIN users u2 ON u2.id = f.addressee_id
     WHERE (f.requester_id = $1 OR f.addressee_id = $1) AND f.status = 'accepted'`,
    [userId]
  );
  return res.rows;
}

export async function getPendingRequests(userId) {
  const res = await query(
    `SELECT f.id, f.created_at, u.id AS from_id, u.display_name, u.avatar_url
     FROM friendships f
     JOIN users u ON u.id = f.requester_id
     WHERE f.addressee_id = $1 AND f.status = 'pending'
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return res.rows;
}

export async function createNotification(userId, type, fromUserId, payload = {}) {
  const res = await query(
    `INSERT INTO notifications (user_id, type, from_user_id, payload)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, type, fromUserId, JSON.stringify(payload)]
  );
  return res.rows[0];
}

export async function getNotifications(userId) {
  const res = await query(
    `SELECT n.*, u.display_name AS from_display_name
     FROM notifications n
     JOIN users u ON u.id = n.from_user_id
     WHERE n.user_id = $1 AND n.read = false
     ORDER BY n.created_at DESC
     LIMIT 50`,
    [userId]
  );
  return res.rows;
}

export async function markNotificationsRead(userId) {
  await query("UPDATE notifications SET read = true WHERE user_id = $1", [userId]);
}

export { pool };
