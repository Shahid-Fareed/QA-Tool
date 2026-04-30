const express = require("express");
const router = express.Router();
const dbConnect = require("../db");
const { requireAuth, requirePermission } = require("../middleware/auth");
const TestRun = require("../models/TestRun");
const TestCase = require("../models/TestCase");
// Register TestCase so populate works
require("../models/TestCase");

// GET /api/projects/:projectId/test-runs
router.get(
  "/:projectId/test-runs",
  requireAuth,
  requirePermission("read:test_runs"),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      await dbConnect();
      const runs = await TestRun.find({ projectId })
        .sort({ createdAt: -1 })
        .lean();
      return res.json(runs);
    } catch (err) {
      console.error("[test-runs] GET error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// POST /api/projects/:projectId/test-runs
router.post(
  "/:projectId/test-runs",
  requireAuth,
  requirePermission("write:test_runs"),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      await dbConnect();

      let title = req.body?.title?.trim();
      const moduleId = req.body?.moduleId?.trim();

      if (!title && !moduleId)
        return res
          .status(400)
          .json({ error: "Title or Module ID is required" });

      // If only moduleId is provided, use it as the base title
      if (!title && moduleId) {
        title = moduleId;
      }

      const tcQuery = { projectId };
      if (moduleId) tcQuery.moduleId = moduleId;

      const testCases = await TestCase.find(tcQuery)
        .collation({ locale: "en", numericOrdering: true })
        .sort({ customId: 1 })
        .lean();

      const executions = testCases.map((tc) => ({
        testCaseId: tc._id,
        status: "Untested",
        actualResult: "",
        evidence: "",
      }));

      const run = await TestRun.create({
        projectId,
        title,
        moduleId: moduleId || "",
        status: "Pending",
        executions,
      });
      return res.status(201).json(run);
    } catch (err) {
      console.error("[test-runs] POST error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

module.exports = router;
