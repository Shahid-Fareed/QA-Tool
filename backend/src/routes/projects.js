const express = require("express");
const router = express.Router();
const dbConnect = require("../db");
const Project = require("../models/Project");
const UseCase = require("../models/UseCase");
const TestCase = require("../models/TestCase");
const BugReport = require("../models/BugReport");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { fetchPaginatedResource } = require("../lib/resourceUtils");

// GET /api/projects
router.get(
  "/",
  requireAuth,
  requirePermission("read:projects"),
  async (req, res) => {
    try {
      await dbConnect();
      const rawProjects = await Project.find().sort({ createdAt: -1 }).lean();

      const projects = rawProjects.map((p) => ({
        id: p._id.toString(),
        projectName: p.projectName,
        description: p.description ?? "",
        createdBy: p.createdBy ?? "unknown",
        createdAt: p.createdAt?.toISOString() ?? new Date().toISOString(),
      }));

      return res.json({ projects });
    } catch (err) {
      console.error("[projects] GET error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// GET /api/projects/:projectId
router.get(
  "/:projectId",
  requireAuth,
  requirePermission("read:projects"),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      console.log(
        `[Backend] Fetching project: ${projectId} for user: ${req.session?.email}`,
      );

      await dbConnect();
      const project = await Project.findById(projectId).lean();

      if (!project) {
        console.warn(`[Backend] Project not found: ${projectId}`);
        return res.status(404).json({ error: "Project not found" });
      }

      return res.json({
        id: project._id.toString(),
        projectName: project.projectName,
        description: project.description ?? "No description available.",
        useCases: project.useCases ?? "",
        testCases: project.testCases ?? "",
        createdAt: project.createdAt?.toISOString() ?? new Date().toISOString(),
        createdBy: project.createdBy ?? "unknown",
      });
    } catch (err) {
      console.error("[projects] GET single error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// DELETE /api/projects/:projectId
router.delete(
  "/:projectId",
  requireAuth,
  requirePermission("delete:projects"),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      await dbConnect();
      // Cleanup related data
      await UseCase.deleteMany({ projectId });
      await TestCase.deleteMany({ projectId });
      await BugReport.deleteMany({ projectId });
      // Delete project
      await Project.findByIdAndDelete(projectId);
      return res.json({ success: true });
    } catch (err) {
      console.error("[projects] DELETE error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// PATCH /api/projects/:projectId
router.patch(
  "/:projectId",
  requireAuth,
  requirePermission("edit:projects"),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      await dbConnect();
      const updated = await Project.findByIdAndUpdate(projectId, req.body, {
        new: true,
      });
      if (!updated) return res.status(404).json({ error: "Project not found" });
      return res.json(updated);
    } catch (err) {
      console.error("[projects] PATCH error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// GET /api/projects/:projectId/data/:type — paginated resource list used by Next.js server pages
router.get("/:projectId/data/:type", requireAuth, async (req, res) => {
  try {
    const { projectId, type } = req.params;
    const {
      page = "1",
      limit = "25",
      module: activeModule,
      priority: activePriority,
      status: activeStatus,
    } = req.query;

    const modelMap = {
      bugs: BugReport,
      "use-cases": UseCase,
      "test-cases": TestCase,
    };
    const model = modelMap[type];
    if (!model) return res.status(400).json({ error: "Invalid resource type" });

    const result = await fetchPaginatedResource({
      model,
      projectId,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      activeModule,
      activePriority,
      activeStatus,
    });

    return res.json(result);
  } catch (err) {
    console.error("[projects/data] GET error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/projects/:projectId/use-cases — for cross-linking
router.get("/:projectId/use-cases", requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    await dbConnect();
    const useCases = await UseCase.find({ projectId }).lean();
    return res.json(useCases);
  } catch (err) {
    console.error("[projects/use-cases] GET error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
