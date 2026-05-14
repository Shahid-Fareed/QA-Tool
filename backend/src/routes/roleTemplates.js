const express = require("express");
const router = express.Router();
const dbConnect = require("../db");
const { requireAuth, requirePermission } = require("../middleware/auth");
const RoleTemplate = require("../models/RoleTemplate");

// GET /api/role-templates — list all templates
router.get("/", requireAuth, requirePermission("read:users"), async (req, res) => {
  try {
    await dbConnect();
    const templates = await RoleTemplate.find().sort({ createdAt: -1 }).lean();
    return res.json(templates);
  } catch (err) {
    console.error("[role-templates] GET error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/role-templates — create a new template
router.post("/", requireAuth, requirePermission("write:users"), async (req, res) => {
  try {
    await dbConnect();
    const { name, description, permissions } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Template name is required." });
    }

    const existing = await RoleTemplate.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ error: "A template with this name already exists." });
    }

    const template = await RoleTemplate.create({
      name: name.trim(),
      description: description?.trim() || "",
      permissions: permissions || [],
      createdBy: req.session.id,
    });

    return res.status(201).json(template);
  } catch (err) {
    console.error("[role-templates] POST error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/role-templates/:id — update a template
router.patch("/:id", requireAuth, requirePermission("edit:users"), async (req, res) => {
  try {
    await dbConnect();
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (permissions !== undefined) updateData.permissions = permissions;

    // Check for name conflict if renaming
    if (updateData.name) {
      const conflict = await RoleTemplate.findOne({
        name: updateData.name,
        _id: { $ne: id },
      });
      if (conflict) {
        return res.status(409).json({ error: "A template with this name already exists." });
      }
    }

    const updated = await RoleTemplate.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updated) return res.status(404).json({ error: "Template not found" });
    return res.json(updated);
  } catch (err) {
    console.error("[role-templates] PATCH error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/role-templates/:id — delete a template
router.delete("/:id", requireAuth, requirePermission("delete:users"), async (req, res) => {
  try {
    await dbConnect();
    const { id } = req.params;
    const deleted = await RoleTemplate.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "Template not found" });
    return res.json({ success: true });
  } catch (err) {
    console.error("[role-templates] DELETE error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
