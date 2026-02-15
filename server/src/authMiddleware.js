// server/src/authMiddleware.js - JWT verification for REST and Socket.IO
import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET || "dev-secret-change-in-production";

export function signToken(payload, expiresIn = "7d") {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

/**
 * Express middleware: require Authorization Bearer token and set req.user.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const decoded = verifyToken(token);
  if (!decoded?.userId) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  req.userId = decoded.userId;
  req.user = { id: decoded.userId, displayName: decoded.displayName };
  next();
}

/**
 * Optional auth: set req.user if valid token present, but don't require it.
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return next();
  const decoded = verifyToken(token);
  if (decoded?.userId) {
    req.userId = decoded.userId;
    req.user = { id: decoded.userId, displayName: decoded.displayName };
  }
  next();
}
