const express = require("express");
const router = express.Router();
const dbConnect = require("../db");
const StatusConfig = require("../models/StatusConfig");
const { requireAuth } = require("../middleware/auth");
const { hasPermission } = require("../rbac");

// GET /api/status-configs
router.get("/", requireAuth, async (req, res) => {
  try {
    await dbConnect();
    const { resourceType } = req.query;
    const filter = resourceType ? { resourceType } : {};
    const configs = await StatusConfig.find(filter).sort({ createdAt: 1 });
    return res.json(configs);
  } catch (err) {
    console.error("[status-configs] GET error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/status-configs
router.post("/", requireAuth, async (req, res) => {
  try {
    const { role, customPermissions } = req.session;
    if (!hasPermission(role, "edit:projects", customPermissions)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await dbConnect();
    const { name, color, resourceType } = req.body;
    if (!name || !color) {
      return res.status(400).json({ error: "Name and color are required" });
    }

    const newConfig = await StatusConfig.create({ name, color, resourceType });
    return res.status(201).json(newConfig);
  } catch (err) {
    console.error("[status-configs] POST error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/status-configs/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { role, customPermissions } = req.session;
    if (!hasPermission(role, "edit:projects", customPermissions)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await dbConnect();
    const { id } = req.params;
    await StatusConfig.findByIdAndDelete(id);
    return res.json({ success: true });
  } catch (err) {
    console.error("[status-configs] DELETE error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /api/status-configs/:id
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { role, customPermissions } = req.session;
    if (!hasPermission(role, "edit:projects", customPermissions)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await dbConnect();
    const { id } = req.params;
    const { name, color, resourceType } = req.body;

    const updated = await StatusConfig.findByIdAndUpdate(
      id,
      { name, color, resourceType },
      { new: true },
    );

    if (!updated) {
      return res.status(404).json({ error: "Status config not found" });
    }

    return res.json(updated);
  } catch (err) {
    console.error("[status-configs] PUT error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
