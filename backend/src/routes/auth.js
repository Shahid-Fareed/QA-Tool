const express = require("express");
const router = express.Router();
const dbConnect = require("../db");
const User = require("../models/User");
const { SESSION_COOKIE } = require("../rbac");
const { requireAuth } = require("../middleware/auth");

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    await dbConnect();
    const matched = await User.findOne({ email: email.trim().toLowerCase() });

    if (!matched || matched.password !== password) {
      return res
        .status(401)
        .json({ error: "Access Denied — invalid credentials." });
    }

    const sessionUser = {
      id: matched._id.toString(),
      email: matched.email,
      name: matched.name,
      role: matched.role,
      customPermissions: matched.customPermissions || [],
    };

    res.cookie(SESSION_COOKIE, JSON.stringify(sessionUser), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8 * 1000, // 8 hours in ms
    });

    return res.status(200).json({ success: true, user: sessionUser });
  } catch (err) {
    console.error("[auth/login] Error:", err);
    return res.status(500).json({ error: "Identity service unavailable." });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  return res.status(200).json({ success: true });
});

// GET /api/auth/me — returns the current session user (re-fetches from DB)
router.get("/me", requireAuth, (req, res) => {
  return res.json(req.session);
});

module.exports = router;
