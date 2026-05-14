require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Route imports
const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const resourceRoutes = require("./routes/resources");
const testRunRoutes = require("./routes/testRuns");
const testRunExecutions = require("./routes/testRunExecutions");
const userRoutes = require("./routes/users");
const generateRoutes = require("./routes/generate");
const chatRoutes = require("./routes/chat");
const visionRoutes = require("./routes/vision");
const itemRoutes = require("./routes/items");
const codeEvaluationRoutes = require("./routes/codeEvaluation");
const statusConfigRoutes = require("./routes/statusConfigs");

const roleTemplateRoutes = require("./routes/roleTemplates");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true, // Required for cookies to flow cross-origin
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Routes ──────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/users", userRoutes);
app.use("/api/generate", generateRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/code-evaluation", codeEvaluationRoutes);
app.use("/api/status-configs", statusConfigRoutes);

app.use("/api/role-templates", roleTemplateRoutes);

// Project-namespaced routes (order matters — specific before generic)
app.use("/api/projects", chatRoutes); // POST /api/projects/:id/chat
app.use("/api/projects", visionRoutes); // POST /api/projects/:id/bugs/analyze-vision
app.use("/api/projects", testRunRoutes); // GET/POST /api/projects/:id/test-runs
app.use("/api/projects", projectRoutes); // GET /api/projects, /api/projects/:id/data/:type, etc.

// Standalone test-run routes
app.use("/api/test-runs", testRunExecutions); // GET/PATCH/DELETE /api/test-runs/:runId

// ── Health & Root Routes ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "QA Tool Backend API is running", health: "/health" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── 404 Handler ─────────────────────────────────────────────────────
app.use((req, res) => {
  res
    .status(404)
    .json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ── Error Handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[Express Error]", err);

  const isProduction = process.env.NODE_ENV === "production";
  const status = err.status || 500;

  const response = {
    error:
      isProduction && status === 500
        ? "An unexpected error occurred"
        : err.message || "Internal Server Error",
  };

  res.status(status).json(response);
});

// ── Start ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ QA Tool Backend running on http://localhost:${PORT}`);
});
