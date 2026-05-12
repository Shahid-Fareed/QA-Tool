const { SESSION_COOKIE, hasPermission } = require("../rbac");
const dbConnect = require("../db");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "qa-tool-extension-secret-change-in-prod";

// Simple in-memory cache to reduce DB load
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Middleware that reads the session cookie, re-fetches user from DB (or cache),
 * and attaches the fresh session to req.session.
 */
async function requireAuth(req, res, next) {
  // ── 1. Check for Bearer token (extension auth) ──────────────────
  const authHeader = req.headers["authorization"] || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const userId = payload.id;

      const cached = userCache.get(userId);
      let freshUser;
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        freshUser = cached.user;
      } else {
        await dbConnect();
        freshUser = await User.findById(userId).lean();
        if (freshUser) userCache.set(userId, { user: freshUser, timestamp: Date.now() });
      }

      if (!freshUser) return res.status(401).json({ error: "Token user not found" });

      req.session = {
        id: userId,
        email: freshUser.email,
        name: freshUser.name,
        role: freshUser.role,
        customPermissions: freshUser.customPermissions || [],
      };
      return next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  }

  // ── 2. Fall back to cookie session ──────────────────────────────
  const sessionRaw = req.cookies[SESSION_COOKIE];

  if (!sessionRaw) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const cookieData = JSON.parse(sessionRaw);
    const userId = cookieData.id;

    // 1. Check cache first
    const cached = userCache.get(userId);
    let freshUser;

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      freshUser = cached.user;
    } else {
      // 2. Cache miss — re-fetch from DB
      await dbConnect();
      freshUser = await User.findById(userId).lean();

      if (freshUser) {
        userCache.set(userId, { user: freshUser, timestamp: Date.now() });
      }
    }

    if (!freshUser) {
      return res
        .status(401)
        .json({ error: "Session expired — user not found" });
    }

    req.session = {
      id: userId,
      email: freshUser.email,
      name: freshUser.name,
      role: freshUser.role,
      customPermissions: freshUser.customPermissions || [],
    };

    next();
  } catch (err) {
    console.error("[auth middleware] Error:", err);
    return res.status(401).json({ error: "Invalid session" });
  }
}

/**
 * Returns a middleware that checks for a required permission.
 * Call requireAuth BEFORE this.
 */
function requirePermission(permission) {
  return (req, res, next) => {
    const { role, customPermissions } = req.session;
    if (!hasPermission(role, permission, customPermissions)) {
      return res
        .status(403)
        .json({ error: "Forbidden — insufficient privileges" });
    }
    next();
  };
}

module.exports = { requireAuth, requirePermission };
