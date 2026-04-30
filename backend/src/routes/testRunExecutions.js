const express = require("express");
const router = express.Router();
const dbConnect = require("../db");
const { requireAuth, requirePermission } = require("../middleware/auth");
const TestRun = require("../models/TestRun");
// Register TestCase so populate works
require("../models/TestCase");

// GET /api/test-runs/:runId
router.get(
  "/:runId",
  requireAuth,
  requirePermission("read:test_runs"),
  async (req, res) => {
    try {
      const { runId } = req.params;
      await dbConnect();
      const run = await TestRun.findById(runId)
        .populate("executions.testCaseId")
        .lean();
      if (!run) return res.status(404).json({ error: "Test run not found" });
      return res.json(run);
    } catch (err) {
      console.error("[test-runs] GET/:runId error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// PATCH /api/test-runs/:runId
router.patch(
  "/:runId",
  requireAuth,
  requirePermission("edit:test_runs"),
  async (req, res) => {
    try {
      const { runId } = req.params;
      await dbConnect();
      const body = req.body;

      const run = await TestRun.findById(runId);
      if (!run) return res.status(404).json({ error: "Test run not found" });

      // Full reset
      if (body.resetAll === true) {
        run.executions.forEach((exec) => {
          exec.status = "Untested";
          exec.actualResult = "";
        });
        run.status = "Pending";
        await run.save();
        const updated = await TestRun.findById(runId)
          .populate("executions.testCaseId")
          .lean();
        return res.json(updated);
      }

      // Title rename
      if (body.title !== undefined && !body.bulk && !body.testCaseId) {
        run.title = body.title.trim();
        await run.save();
        return res.json({ _id: run._id, title: run.title });
      }

      // Bulk update
      if (Array.isArray(body.bulk)) {
        for (const item of body.bulk) {
          const exec = run.executions.find(
            (e) => e.testCaseId.toString() === item.testCaseId.toString(),
          );
          if (exec) {
            exec.status = item.status;
            if (item.actualResult !== undefined)
              exec.actualResult = item.actualResult;
          }
        }
      } else {
        // Single update
        const { testCaseId, status, actualResult } = body;
        if (!testCaseId || !status)
          return res
            .status(400)
            .json({ error: "testCaseId and status are required" });
        const exec = run.executions.find(
          (e) => e.testCaseId.toString() === testCaseId.toString(),
        );
        if (!exec)
          return res.status(404).json({ error: "Execution not found" });
        exec.status = status;
        exec.actualResult = actualResult ?? exec.actualResult;
      }

      const allDone = run.executions.every((e) => e.status !== "Untested");
      const anyInProgress = run.executions.some((e) => e.status !== "Untested");
      if (allDone) run.status = "Completed";
      else if (anyInProgress) run.status = "In Progress";

      await run.save();
      const updated = await TestRun.findById(runId)
        .populate("executions.testCaseId")
        .lean();
      return res.json(updated);
    } catch (err) {
      console.error("[test-runs] PATCH error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// DELETE /api/test-runs/:runId
router.delete(
  "/:runId",
  requireAuth,
  requirePermission("delete:test_runs"),
  async (req, res) => {
    try {
      const { runId } = req.params;
      await dbConnect();
      await TestRun.findByIdAndDelete(runId);
      return res.json({ success: true });
    } catch (err) {
      console.error("[test-runs] DELETE error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

module.exports = router;
