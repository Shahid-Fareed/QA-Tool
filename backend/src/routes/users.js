const express = require("express");
const router = express.Router();
const dbConnect = require("../db");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { hasPermission } = require("../rbac");
const User = require("../models/User");

// GET /api/users — list users based on requester's role
router.get(
  "/",
  requireAuth,
  requirePermission("read:users"),
  async (req, res) => {
    try {
      await dbConnect();
      const { role } = req.session;

      let query = {};
      if (role === "company_admin") {
        query = {};
      } else if (role === "manager") {
        query = { role: { $ne: "company_admin" } };
      } else if (role === "team_lead") {
        query = { role: { $nin: ["company_admin", "manager"] } };
      } else {
        query = { _id: req.session.id };
      }

      const users = await User.find(query)
        .select("name email role customPermissions employeeId id")
        .lean();
      return res.json(users);
    } catch (err) {
      console.error("[users] GET error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// PATCH /api/users/:userId — update user (permissions, role, etc.)
router.patch("/:userId", requireAuth, async (req, res) => {
  try {
    const { role, customPermissions } = req.session;
    if (
      !hasPermission(role, ["edit:users", "write:users"], customPermissions)
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await dbConnect();
    const { userId } = req.params;
    const updateData = req.body;

    const updated = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("name email role customPermissions employeeId id");

    if (!updated) return res.status(404).json({ error: "User not found" });
    return res.json(updated);
  } catch (err) {
    console.error("[users] PATCH error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/users/:userId
router.delete(
  "/:userId",
  requireAuth,
  requirePermission("delete:users"),
  async (req, res) => {
    try {
      await dbConnect();
      const { userId } = req.params;
      // Prevent self-deletion
      if (userId === req.session.id) {
        return res
          .status(400)
          .json({ error: "You cannot delete your own account." });
      }
      await User.findByIdAndDelete(userId);
      return res.json({ success: true });
    } catch (err) {
      console.error("[users] DELETE error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// POST /api/users — create new user (admin action)
router.post(
  "/",
  requireAuth,
  requirePermission("write:users"),
  async (req, res) => {
    try {
      await dbConnect();
      const { name, email, password, role, employeeId } = req.body;
      if (!name || !email || !password) {
        return res
          .status(400)
          .json({ error: "Name, email, and password are required." });
      }
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing)
        return res.status(409).json({ error: "Email already in use." });

      // Auto-increment employeeId logic
      let finalEmployeeId = employeeId;
      if (!finalEmployeeId) {
        const allUsers = await User.find({}).select("employeeId id").lean();
        let maxId = 0;
        allUsers.forEach((u) => {
          const idVal = parseInt(u.employeeId || u.id);
          if (!isNaN(idVal) && idVal > maxId) {
            maxId = idVal;
          }
        });
        finalEmployeeId = (maxId + 1).toString();
      }

      const newUser = await User.create({
        name,
        email,
        password,
        role: role || "employee",
        employeeId: finalEmployeeId,
      });
      return res.status(201).json(newUser);
    } catch (err) {
      console.error("[users] POST error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

module.exports = router;
