const express = require("express");
const router = express.Router();
const multer = require("multer");
const { requireAuth, requirePermission } = require("../middleware/auth");
const generateController = require("../controllers/generateController");
const assistantController = require("../controllers/assistantController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ── Generation Routes ──
router.post(
  "/",
  requireAuth,
  requirePermission("write:generate"),
  upload.single("file"),
  generateController.generateProject,
);

// NEW: Stream a Markdown QA analysis report from an uploaded file
router.post(
  "/report",
  requireAuth,
  upload.single("file"),
  generateController.generateReport,
);

// NEW: Convert Markdown to DOCX and stream back for download
router.post("/download-docx", requireAuth, generateController.downloadDocx);

router.post(
  "/:testCaseId/generate-script",
  requireAuth,
  generateController.generateScript,
);

router.patch(
  "/:testCaseId/save-script",
  requireAuth,
  generateController.saveScript,
);

// ── Assistant Chat Routes ──
router.post("/chat", requireAuth, assistantController.chat);
router.post("/chat/append", requireAuth, assistantController.appendMessages);
router.get("/chat/:sessionId", requireAuth, assistantController.getSession);
router.patch(
  "/chat/:sessionId",
  requireAuth,
  assistantController.renameSession,
);
router.delete(
  "/chat/:sessionId",
  requireAuth,
  assistantController.deleteSession,
);
router.post("/chat/export", requireAuth, assistantController.exportArtifacts);
router.get("/history", requireAuth, assistantController.getHistory);

module.exports = router;
