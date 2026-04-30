const express = require("express");
const router = express.Router();
const dbConnect = require("../db");
const { requireAuth } = require("../middleware/auth");
const { hasPermission } = require("../rbac");
const UseCase = require("../models/UseCase");
const TestCase = require("../models/TestCase");
const BugReport = require("../models/BugReport");
const Project = require("../models/Project");

const MODEL_MAP = {
  bugs: BugReport,
  "use-cases": UseCase,
  "test-cases": TestCase,
};

// POST /api/resources/:type — create a new item manually
router.post("/:type", requireAuth, async (req, res) => {
  try {
    const { type } = req.params;
    const { role, customPermissions } = req.session;

    const permMap = {
      bugs: "write:bugs",
      "use-cases": "write:use_cases",
      "test-cases": "write:test_cases",
    };

    const permission = permMap[type];
    if (!permission || !hasPermission(role, permission, customPermissions)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await dbConnect();
    const { projectId, moduleId, title, description, ...extras } = req.body;

    if (!projectId || !moduleId || !title) {
      return res.status(400).json({
        error: "Missing required fields (projectId, moduleId, title)",
      });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    let Model;
    let idPrefix;
    if (type === "use-cases") {
      Model = UseCase;
      idPrefix = "UC-";
    } else if (type === "test-cases") {
      Model = TestCase;
      idPrefix = "TC-";
    } else {
      Model = BugReport;
      idPrefix = "BUG-";
    }

    const moduleMatch = moduleId.match(/Module\s*(\d+)/i);
    const moduleIndex = moduleMatch ? parseInt(moduleMatch[1], 10) : null;

    let customId;
    if (moduleIndex !== null) {
      const countInModule = await Model.countDocuments({ projectId, moduleId });
      customId = `${idPrefix}${moduleIndex}.${countInModule + 1}`;
    } else {
      const totalCount = await Model.countDocuments({ projectId });
      customId = `${idPrefix}${totalCount + 1}`;
    }

    const newItem = await Model.create({
      projectId,
      projectName: project.projectName,
      moduleId,
      title,
      description,
      customId,
      ...extras,
      assigneeId: extras.assigneeId || null,
      assigneeName: extras.assigneeName || "Unassigned",
      status:
        extras.status ||
        (type === "bugs" ? null : extras.assigneeId ? "Pending" : "Open"),
      isManual: true,
    });

    return res.status(201).json(newItem);
  } catch (err) {
    console.error("[resources] POST error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/resources/:type/:id
router.delete("/:type/:id", requireAuth, async (req, res) => {
  try {
    const { type, id } = req.params;
    const { role, customPermissions } = req.session;

    const permMap = {
      bugs: "delete:bugs",
      "use-cases": "delete:use_cases",
      "test-cases": "delete:test_cases",
    };

    const permission = permMap[type];
    if (!permission || !hasPermission(role, permission, customPermissions)) {
      return res
        .status(403)
        .json({ error: "Forbidden — insufficient privileges" });
    }

    await dbConnect();
    const Model = MODEL_MAP[type];
    if (!Model) return res.status(400).json({ error: "Invalid resource type" });

    await Model.findByIdAndDelete(id);
    return res.json({ success: true });
  } catch (err) {
    console.error("[resources] DELETE error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /api/resources/:type/:id
router.put("/:type/:id", requireAuth, async (req, res) => {
  try {
    const { type, id } = req.params;
    const { role, customPermissions } = req.session;

    const permMap = {
      bugs: "edit:bugs",
      "use-cases": "edit:use_cases",
      "test-cases": "edit:test_cases",
    };

    const permission = permMap[type];
    if (!permission || !hasPermission(role, permission, customPermissions)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await dbConnect();
    const Model = MODEL_MAP[type];
    if (!Model) return res.status(400).json({ error: "Invalid resource type" });

    // Handle automatic bug status and iteration logic
    if (type === "bugs") {
      // Automatic status logic removed to allow for custom/Backlog defaults

      if (req.body.status) {
        const current = await Model.findById(id);
        if (current) {
          const newStatus = req.body.status;
          const oldStatus = current.status;
          let shouldIncrement = false;
          if (newStatus !== oldStatus) {
            const wasDone = oldStatus === "Closed" || oldStatus === "Resolved";
            const isReopened =
              wasDone && newStatus !== "Closed" && newStatus !== "Resolved";

            if (isReopened) {
              shouldIncrement = true;
            }
          }

          if (shouldIncrement) {
            req.body.iterations = (current.iterations || 0) + 1;
          }
        }
      }
    }

    const updated = await Model.findByIdAndUpdate(id, req.body, { new: true });
    return res.json(updated);
  } catch (err) {
    console.error("[resources] PUT error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
