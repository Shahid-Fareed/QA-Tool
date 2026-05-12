const mongoose = require("mongoose");

const BugReportSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    projectName: { type: String, default: "" },
    moduleId: { type: String, required: true },
    customId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    potentialImpact: { type: String, default: "" },
    priority: { type: String, default: "Medium" },
    severity: { type: String, default: "Medium" },
    status: { type: String, default: null },
    assigneeId: { type: String, default: null },
    assigneeName: { type: String, default: "Unassigned" },
    assigneeRole: { type: String, default: "" },
    linkedUseCase: { type: String, default: "" },
    isManual: { type: Boolean, default: false },
    isVision: { type: Boolean, default: false },

    // Extension capture fields
    screenshot: { type: String, default: null },       // base64 data URL
    pageUrl: { type: String, default: null },           // URL where bug was captured
    consoleLogs: { type: [String], default: [] },       // last N console entries
    networkErrors: { type: [Object], default: [] },     // failed network requests
    capturedVia: {
      type: String,
      enum: ["manual", "extension", "vision", "chat"],
      default: "manual",
    },
    reportedById:   { type: String, default: null },   // user id who submitted via extension
    reportedByName: { type: String, default: null },   // display name
    reportedByEmail:{ type: String, default: null },   // email

    iterations: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const BugReport =
  mongoose.models.BugReport || mongoose.model("BugReport", BugReportSchema);
module.exports = BugReport;
