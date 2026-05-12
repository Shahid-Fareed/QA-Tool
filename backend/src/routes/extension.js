const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const dbConnect = require("../db");
const User = require("../models/User");
const Project = require("../models/Project");
const BugReport = require("../models/BugReport");
const { requireAuth } = require("../middleware/auth");
const { hasPermission } = require("../rbac");

const JWT_SECRET =
  process.env.JWT_SECRET || "qa-tool-extension-secret-change-in-prod";
const JWT_EXPIRES = "8h";

// ── POST /api/extension/auth ─────────────────────────────────────────
// Extension login — returns a JWT token (not a cookie)
router.post("/auth", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    await dbConnect();
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user || user.password !== password) {
      return res
        .status(401)
        .json({ error: "Access Denied — invalid credentials." });
    }

    const payload = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    return res.json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("[extension/auth] Error:", err);
    return res.status(500).json({ error: "Auth service error." });
  }
});

// ── GET /api/extension/projects ──────────────────────────────────────
// Returns projects the user can see (reuses requireAuth which now accepts Bearer)
router.get("/projects", requireAuth, async (req, res) => {
  try {
    const { role, customPermissions } = req.session;
    if (!hasPermission(role, "read:projects", customPermissions)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await dbConnect();
    const rawProjects = await Project.find().sort({ createdAt: -1 }).lean();
    const projects = rawProjects.map((p) => ({
      id: p._id.toString(),
      projectName: p.projectName,
    }));

    return res.json({ projects });
  } catch (err) {
    console.error("[extension/projects] Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/extension/modules/:projectId ────────────────────────────
// Returns unique moduleIds sorted by when they were FIRST created in the project.
// New modules always appear at the bottom; existing modules stay in their original order.
router.get("/modules/:projectId", requireAuth, async (req, res) => {
  try {
    const { role, customPermissions } = req.session;
    if (!hasPermission(role, "read:projects", customPermissions)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { projectId } = req.params;
    await dbConnect();

    const mongoose = require("mongoose");
    const UseCase = require("../models/UseCase");
    const TestCase = require("../models/TestCase");

    // Match projectId as BOTH ObjectId and string — documents may be stored either way
    const oid = mongoose.Types.ObjectId.isValid(projectId)
      ? new mongoose.Types.ObjectId(projectId)
      : null;

    const projectMatch = oid
      ? { $or: [{ projectId: oid }, { projectId: projectId }] }
      : { projectId: projectId };

    // Aggregate each collection: unique moduleId + earliest createdAt
    const aggregatePipeline = (match) => [
      { $match: match },
      { $group: { _id: "$moduleId", firstCreated: { $min: "$createdAt" } } },
      { $match: { _id: { $ne: null } } },
    ];

    const [bugAgg, ucAgg, tcAgg] = await Promise.all([
      BugReport.aggregate(aggregatePipeline(projectMatch)),
      UseCase.aggregate(aggregatePipeline(projectMatch)),
      TestCase.aggregate(aggregatePipeline(projectMatch)),
    ]);

    // Merge into a Map: moduleId → earliest firstCreated across all collections
    const moduleMap = new Map();
    [...bugAgg, ...ucAgg, ...tcAgg].forEach(({ _id, firstCreated }) => {
      if (!_id) return;
      const existing = moduleMap.get(_id);
      if (!existing || firstCreated < existing) {
        moduleMap.set(_id, firstCreated);
      }
    });

    // Sort ascending by firstCreated → oldest first, newest last
    const allModules = [...moduleMap.entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([moduleId]) => moduleId);

    return res.json({ modules: allModules });
  } catch (err) {
    console.error("[extension/modules] Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/extension/capture ──────────────────────────────────────
// Core endpoint: receives captured bug data from the extension
router.post("/capture", requireAuth, async (req, res) => {
  try {
    const { role, customPermissions } = req.session;
    if (!hasPermission(role, "write:bugs", customPermissions)) {
      return res
        .status(403)
        .json({ error: "Forbidden — no write:bugs permission" });
    }

    const {
      projectId,
      moduleId,
      title,
      description = "",
      priority = "Medium",
      severity = "Medium",
      screenshot = null,
      pageUrl = null,
      consoleLogs = [],
      networkErrors = [],
    } = req.body;

    if (!projectId || !moduleId || !title) {
      return res.status(400).json({
        error: "Missing required fields: projectId, moduleId, title",
      });
    }

    await dbConnect();
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    // Generate customId (BUG-<module>.<count+1>)
    const moduleMatch = moduleId.match(/Module\s*(\d+)/i);
    const moduleIndex = moduleMatch ? parseInt(moduleMatch[1], 10) : null;
    let customId;
    if (moduleIndex !== null) {
      const countInModule = await BugReport.countDocuments({
        projectId,
        moduleId,
      });
      customId = `BUG-${moduleIndex}.${countInModule + 1}`;
    } else {
      const totalCount = await BugReport.countDocuments({ projectId });
      customId = `BUG-${totalCount + 1}`;
    }

    const newBug = await BugReport.create({
      projectId,
      projectName: project.projectName,
      moduleId,
      customId,
      title,
      description,
      priority,
      severity,
      status: null,
      assigneeId: null,
      assigneeName: "Unassigned",
      isManual: true,
      capturedVia: "extension",
      screenshot,
      pageUrl,
      consoleLogs: consoleLogs.slice(0, 50),
      networkErrors: networkErrors.slice(0, 20),
      // Who submitted this bug via the extension
      reportedById: req.session.id,
      reportedByName: req.session.name || "Unknown",
      reportedByEmail: req.session.email || "",
    });

    return res.status(201).json({
      success: true,
      bug: {
        id: newBug._id.toString(),
        customId: newBug.customId,
        title: newBug.title,
        projectName: newBug.projectName,
      },
    });
  } catch (err) {
    console.error("[extension/capture] Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/extension/ping ──────────────────────────────────────────
// Health check so the extension can verify connectivity
router.get("/ping", (req, res) => {
  res.json({
    ok: true,
    service: "QA Tool Extension API",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
