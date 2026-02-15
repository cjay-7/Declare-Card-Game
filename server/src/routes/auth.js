// server/src/routes/auth.js - Register, Login, Me, Google OAuth
import express from "express";
import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import * as db from "../db.js";
import { signToken, verifyToken, requireAuth } from "../authMiddleware.js";

const router = express.Router();
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

// ---- Email/password ----
router.post("/register", async (req, res) => {
  try {
    const { email, password, displayName } = req.body || {};
    if (!email?.trim() || !password || !displayName?.trim()) {
      return res.status(400).json({ error: "Email, password, and display name are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    const existing = await db.getUserByEmail(email.trim().toLowerCase());
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.createUser({
      email: email.trim().toLowerCase(),
      passwordHash,
      displayName: displayName.trim().slice(0, 100),
    });
    const token = signToken({ userId: user.id, displayName: user.display_name });
    res.status(201).json({
      user: { id: user.id, email: user.email, displayName: user.display_name, avatarUrl: user.avatar_url },
      token,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const user = await db.getUserByEmail(email.trim().toLowerCase());
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });
    const token = signToken({ userId: user.id, displayName: user.display_name });
    res.json({
      user: { id: user.id, email: user.email, displayName: user.display_name, avatarUrl: user.avatar_url },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/logout", (_req, res) => {
  // JWT is stateless; client discards token. Return 200.
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await db.getUserById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
    });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Failed to load user" });
  }
});

// ---- Google OAuth ----
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.SERVER_URL || "http://localhost:3001"}/api/auth/google/callback`,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value?.toLowerCase() || null;
          const displayName = profile.displayName?.slice(0, 100) || profile.id;
          const avatarUrl = profile.photos?.[0]?.value || null;

          let user = await db.getUserByGoogleId(googleId);
          if (user) {
            await db.updateUser(user.id, { display_name: displayName, avatar_url: avatarUrl });
            user = await db.getUserById(user.id);
          } else {
            const existingByEmail = email ? await db.getUserByEmail(email) : null;
            if (existingByEmail) {
              await db.updateUser(existingByEmail.id, { google_id: googleId, avatar_url: avatarUrl });
              user = await db.getUserById(existingByEmail.id);
            } else {
              user = await db.createUser({
                email,
                displayName,
                googleId,
                avatarUrl,
              });
            }
          }
          done(null, { id: user.id, displayName: user.display_name });
        } catch (err) {
          done(err, null);
        }
      }
    )
  );

  router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"], session: false }),
    () => {}
  );

  router.get("/google/callback", (req, res, next) => {
    passport.authenticate("google", { session: false }, (err, user) => {
      if (err) {
        console.error("Google OAuth error:", err);
        return res.redirect(`${CLIENT_ORIGIN}/auth/callback?error=oauth_failed`);
      }
      if (!user) return res.redirect(`${CLIENT_ORIGIN}/auth/callback?error=access_denied`);
      const token = signToken({ userId: user.id, displayName: user.displayName });
      res.redirect(`${CLIENT_ORIGIN}/auth/callback?token=${encodeURIComponent(token)}`);
    })(req, res, next);
  });
} else {
  router.get("/google", (_req, res) =>
    res.status(503).json({ error: "Google OAuth not configured (set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)" })
  );
  router.get("/google/callback", (_req, res) =>
    res.redirect(`${CLIENT_ORIGIN}/auth/callback?error=oauth_not_configured`)
  );
}

export default router;
